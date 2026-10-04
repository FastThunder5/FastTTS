'use strict';

const { advanceMusicQueue } = require('./advance-queue');
const { musicBroadcastState } = require('./broadcast-state');
const { getConfigSnapshot } = require('../config-bridge');

// Comandos de chat del bot musical que no piden canciones: !cancion, !cola,
// !quitar y !skip. Las respuestas no se pueden escribir en el chat de la
// plataforma (las conexiones son de solo lectura): viajan como `bot-reply`
// por WS y el panel las muestra y las lee por TTS en el idioma de la UI.

// !cancion y !cola los puede mandar medio chat a la vez: una respuesta cada
// tanto, no una por espectador.
const RESPUESTA_INFO_COOLDOWN_MS = 15000;
const COLA_MAX_TITULOS = 3;

const mismoUsuario = (track, user, userId) => !!track && (
  (userId && track.requesterId && String(track.requesterId) === String(userId))
  || (!!track.requestedBy && String(track.requestedBy).toLowerCase() === String(user || '').toLowerCase())
);

function handleChatCommand(deps) {
  const ultimaInfo = {};
  const votos = { track: null, quienes: new Set() };

  const responder = (key, vars = {}) => {
    deps.bus.emit('ws:broadcast', { type: 'bot-reply', key, vars, timestamp: Date.now() });
  };
  const infoPermitida = (cmd) => {
    const ahora = Date.now();
    if (ahora - (ultimaInfo[cmd] || 0) < RESPUESTA_INFO_COOLDOWN_MS) return false;
    ultimaInfo[cmd] = ahora;
    return true;
  };
  const saltarActual = () => {
    deps.musicState.currentTrack = null;
    deps.bus.emit('ws:broadcast', { type: 'music-skip' });
    advanceMusicQueue(deps);
  };

  return ({ cmd, user, userId }) => {
    const { musicState, bus, logger } = deps;
    const config = getConfigSnapshot(bus);
    if (!config.musicEnabled) return;
    const banned = (config.musicBannedUsers || []).map((u) => String(u).toLowerCase());
    if (banned.includes(String(userId || '').toLowerCase()) || banned.includes(String(user || '').toLowerCase())) return;
    const actual = musicState.currentTrack;

    if (cmd === 'cancion') {
      if (!infoPermitida(cmd)) return;
      if (!actual) responder('nothingPlaying');
      else if (actual.requestedBy) responder('nowPlaying', { title: actual.title, user: actual.requestedBy });
      else responder('nowPlayingPlaylist', { title: actual.title });
      return;
    }

    if (cmd === 'cola') {
      if (!infoPermitida(cmd)) return;
      if (!musicState.queue.length) { responder('queueEmpty'); return; }
      const titulos = musicState.queue.slice(0, COLA_MAX_TITULOS).map((tr, i) => `${i + 1}. ${tr.title}`).join(', ');
      responder('queue', { count: musicState.queue.length, list: titulos });
      return;
    }

    if (cmd === 'quitar') {
      // La ultima que pidio este espectador y todavia no sono.
      for (let i = musicState.queue.length - 1; i >= 0; i--) {
        if (!mismoUsuario(musicState.queue[i], user, userId)) continue;
        const [quitada] = musicState.queue.splice(i, 1);
        bus.emit('ws:broadcast', { type: 'music-queue-updated', queue: [...musicState.queue] });
        musicBroadcastState(deps);
        responder('removed', { title: quitada.title, user });
        logger.log('info', 'sonido', 'sonido/musica/handle-chat-command.js', 'sonido.musica.quitada_por_usuario',
          `${user} quito su pedido de la cola`, { user, title: quitada.title });
        return;
      }
      return;
    }

    if (cmd === 'skip') {
      if (!actual) return;
      // Quien pidio la cancion la puede saltar sin votacion.
      if (mismoUsuario(actual, user, userId)) {
        responder('skipped', { title: actual.title });
        saltarActual();
        return;
      }
      const necesarios = Number(config.musicSkipVotes) || 0;
      if (necesarios <= 0) return; // votacion desactivada
      if (votos.track !== actual) { votos.track = actual; votos.quienes = new Set(); }
      const clave = userId ? `id:${userId}` : `name:${String(user || '').toLowerCase()}`;
      if (votos.quienes.has(clave)) return;
      votos.quienes.add(clave);
      if (votos.quienes.size >= necesarios) {
        responder('skipped', { title: actual.title });
        logger.log('info', 'sonido', 'sonido/musica/handle-chat-command.js', 'sonido.musica.saltada_por_votos',
          `Cancion saltada por votacion del chat (${votos.quienes.size} votos)`, { votos: votos.quienes.size, title: actual.title });
        saltarActual();
      } else {
        responder('skipVote', { count: votos.quienes.size, needed: necesarios });
      }
    }
  };
}

module.exports = { handleChatCommand, RESPUESTA_INFO_COOLDOWN_MS };
