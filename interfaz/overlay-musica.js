import { cargarLocaleOverlay, aplicarI18nOverlay } from './compartido/i18n-overlay.js';
import { leerParametros, aplicarParametrosVisuales, boolParam } from './compartido/parametros.js';
import { conectarWSOverlay } from './compartido/ws-cliente.js';
import { registrarErroresOverlay } from './compartido/registrar-errores.js';

/**
 * Overlay de audio para música — pensado como fuente de OBS separada del
 * panel principal / VOD. Cuando musicOverlayAudio esta activo en Ajustes,
 * este documento (y NO el panel) es quien crea el <audio> real; asi el
 * streamer puede meter esta URL como Browser Source propia, silenciarla en
 * la escena del VOD/grabacion, o mandarla a una pista de audio distinta en
 * OBS, sin tocar el resto del sonido de la app.
 *
 * Si musicOverlayAudio esta apagado (default), este overlay no reproduce
 * nada — el panel principal sigue siendo el dueño del audio, como hasta
 * ahora, para no romper a nadie que ya tenga la app configurada.
 */

registrarErroresOverlay();

const params = leerParametros();
aplicarParametrosVisuales(params);
const oculto = boolParam(params, 'hidden', false);
if (oculto) document.body.classList.add('om-hidden');

let audio = null;
let overlayAudioEnabled = false;
let volume = 0.5;
let currentTrack = null;

function disposeAudio() {
  if (!audio) return;
  audio.onerror = null;
  audio.onended = null;
  audio.pause();
  audio.removeAttribute('src');
  audio = null;
}

function playTrack(track) {
  disposeAudio();
  if (!track || !track.videoId) return;
  const a = new Audio(`/api/music/stream?videoId=${track.videoId}`);
  audio = a;
  a.volume = volume;
  a.play().catch(() => {});
  a.onerror = () => {
    if (a !== audio) return;
    fetch('/api/music/next', { method: 'POST' }).catch(() => {});
  };
  a.onended = () => {
    if (a !== audio) return;
    fetch('/api/music/next', { method: 'POST' }).catch(() => {});
  };
}

function renderWidget(track) {
  const box = document.getElementById('om-widget');
  const thumb = document.getElementById('om-thumb');
  const title = document.getElementById('om-title');
  const channel = document.getElementById('om-channel');
  if (!box) return;
  if (!track) { box.style.display = 'none'; return; }
  box.style.display = '';
  if (thumb) thumb.src = track.thumbnail || '';
  if (title) title.textContent = track.title || '';
  if (channel) channel.textContent = track.channelName || '';
}

function applyOverlayEnabled(enabled) {
  const wasEnabled = overlayAudioEnabled;
  overlayAudioEnabled = !!enabled;
  if (overlayAudioEnabled && !wasEnabled && currentTrack) {
    playTrack(currentTrack);
  } else if (!overlayAudioEnabled && wasEnabled) {
    disposeAudio();
  }
}

function alManejarMensaje(d) {
  if (d.type === 'music-now-playing') {
    currentTrack = d.track || null;
    renderWidget(currentTrack);
    if (overlayAudioEnabled) playTrack(currentTrack);
  }
  if (d.type === 'music-idle' || d.type === 'music-skip') {
    if (d.type === 'music-idle') currentTrack = null;
    disposeAudio();
    if (d.type === 'music-idle') renderWidget(null);
  }
  if (d.type === 'music-state') {
    if (typeof d.volume === 'number') {
      volume = d.volume;
      if (audio) audio.volume = volume;
    }
    if (typeof d.overlayAudio === 'boolean') applyOverlayEnabled(d.overlayAudio);
    if (d.current) { currentTrack = d.current; renderWidget(currentTrack); }
  }
  if (d.type === 'music-pause' && audio) {
    if (d.paused) audio.pause();
    else audio.play().catch(() => {});
  }
  if (d.type === 'music-volume' && typeof d.volume === 'number') {
    volume = d.volume;
    if (audio) audio.volume = volume;
  }
}

function cargarEstadoInicial() {
  Promise.all([
    fetch('/api/music/config').then((r) => r.json()).catch(() => ({})),
    fetch('/api/music/queue').then((r) => r.json()).catch(() => ({})),
  ]).then(([cfg, q]) => {
    volume = typeof cfg.musicVolume === 'number' ? cfg.musicVolume : 0.5;
    overlayAudioEnabled = !!cfg.musicOverlayAudio;
    currentTrack = q.current || null;
    renderWidget(currentTrack);
    if (overlayAudioEnabled && currentTrack) {
      playTrack(currentTrack);
      // Overlay recargado (OBS) con la musica en pausa: no arrancar sonando.
      if (q.paused && audio) audio.pause();
    }
  }).catch(() => {});
}

cargarLocaleOverlay().then(() => {
  aplicarI18nOverlay();
  cargarEstadoInicial();
  conectarWSOverlay(alManejarMensaje);
});
