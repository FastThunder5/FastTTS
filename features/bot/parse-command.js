'use strict';

// Diseñado para crecer: agregar un comando nuevo es agregar una entrada aca,
// nunca tocar /sonido. Los alias en ingles son los que ya usan otros bots.
const COMANDOS_SIN_ARGS = {
  cancion: 'cancion', 'canción': 'cancion', song: 'cancion', sc: 'cancion',
  cola: 'cola', queue: 'cola',
  skip: 'skip', saltar: 'skip',
  quitar: 'quitar', remove: 'quitar', wrongsong: 'quitar',
};

function parseCommand(text) {
  const trimmed = String(text || '').trim();
  const play = /^!p\s+(\S.*)$/i.exec(trimmed);
  if (play) return { comando: 'play', args: play[1].trim() };
  const otro = /^!(\S+)\s*$/u.exec(trimmed);
  const comando = otro && COMANDOS_SIN_ARGS[otro[1].toLowerCase()];
  return comando ? { comando, args: '' } : null;
}

module.exports = { parseCommand };
