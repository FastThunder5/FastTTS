import { t } from '../../nucleo/i18n/i18n.js';
import { showToast } from '../../componentes/toast.js';
import {
  RESPALDO_APP, RESPALDO_VERSION, PREFIJO_LOCAL,
  configParaRespaldo, moderacionParaRespaldo, accionesModeracion, validarRespaldo,
} from '../../nucleo/respaldo/respaldo.js';

// Exporta / importa en un solo .json todo lo que el streamer configuro:
// ajustes (config.json + localStorage), playlist, palabras bloqueadas,
// castigos de moderacion vigentes y el pad de sonidos con sus audios.
// Usa las APIs que ya existen de cada dominio, sin endpoint nuevo.

const json = (r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)));
const enviar = (url, method, body) => fetch(url, {
  method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

function blobABase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function base64ABlob(b64, type) {
  const bin = window.atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: type || 'application/octet-stream' });
}

async function leerSonidos() {
  const lista = await fetch('/api/soundpad/list').then(json).catch(() => []);
  const sonidos = [];
  for (const s of Array.isArray(lista) ? lista : []) {
    try {
      const blob = await fetch(`/sounds/${encodeURIComponent(s.filename)}`).then((r) => (r.ok ? r.blob() : Promise.reject()));
      sonidos.push({ name: s.name, icon: s.icon, color: s.color, shortcut: s.shortcut || null, filename: s.filename, type: blob.type, audio: await blobABase64(blob) });
    } catch { /* archivo faltante: se omite ese sonido */ }
  }
  return sonidos;
}

// Todo el registro, paginado (tope del store: 5.000 espectadores).
async function leerEspectadores() {
  const todos = [];
  for (let offset = 0; offset < 10000; offset += 500) {
    const d = await fetch(`/api/moderation/viewers?state=all&limit=500&offset=${offset}`).then(json).catch(() => null);
    const items = (d && d.items) || [];
    todos.push(...items);
    if (items.length < 500) break;
  }
  return todos;
}

function leerLocal() {
  const out = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIJO_LOCAL)) out[k] = localStorage.getItem(k);
    }
  } catch { /* storage no disponible */ }
  return out;
}

export async function exportarRespaldo() {
  const btn = document.getElementById('btnExportBackup');
  if (btn) btn.disabled = true;
  try {
    const [config, playlist, palabras, viewers, sonidos] = await Promise.all([
      fetch('/api/config').then(json),
      fetch('/api/music/playlist').then(json).catch(() => ({})),
      fetch('/api/blocked-words/export').then((r) => (r.ok ? r.text() : '')).catch(() => ''),
      leerEspectadores(),
      leerSonidos(),
    ]);
    const respaldo = {
      app: RESPALDO_APP,
      version: RESPALDO_VERSION,
      exportedAt: new Date().toISOString(),
      config: configParaRespaldo(config),
      playlist: Array.isArray(playlist.raw) ? playlist.raw : [],
      blockedWords: palabras,
      moderation: moderacionParaRespaldo(viewers),
      soundpad: sonidos,
      localStorage: leerLocal(),
    };
    const blob = new Blob([JSON.stringify(respaldo, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fasttts-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(t('toast.backupExported'));
  } catch {
    showToast(t('toast.backupFailed'));
  } finally {
    if (btn) btn.disabled = false;
  }
}

export function elegirArchivoRespaldo() {
  document.getElementById('backupFileInput')?.click();
}

export async function importarRespaldo(input) {
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  let datos;
  try {
    datos = validarRespaldo(JSON.parse(await file.text()));
  } catch (e) {
    showToast(t(e.message === 'newer' ? 'toast.backupNewer' : 'toast.backupInvalid'));
    return;
  }
  if (!window.confirm(t('settings.backupConfirm'))) return;

  try {
    if (datos.config) await enviar('/api/config', 'PATCH', datos.config);
    if (Array.isArray(datos.playlist) && datos.playlist.length) await enviar('/api/music/playlist', 'PUT', { lines: datos.playlist });
    if (typeof datos.blockedWords === 'string' && datos.blockedWords.trim()) {
      await enviar('/api/blocked-words/import', 'POST', { content: datos.blockedWords });
    }
    for (const entrada of datos.moderation || []) {
      for (const [url, body] of accionesModeracion(entrada)) await enviar(url, 'POST', body).catch(() => {});
    }
    // Sonidos: se agregan los que no existan ya con el mismo nombre (importar dos veces no duplica).
    const existentes = new Set((await fetch('/api/soundpad/list').then(json).catch(() => [])).map((s) => s.name));
    for (const s of datos.soundpad || []) {
      if (!s.audio || existentes.has(s.name)) continue;
      const ext = (String(s.filename).match(/\.[a-z0-9]+$/i) || ['.mp3'])[0];
      const form = new FormData();
      form.append('audio', base64ABlob(s.audio, s.type), `${s.name}${ext}`);
      const creado = await fetch('/api/soundpad/upload', { method: 'POST', body: form }).then(json).catch(() => null);
      if (creado && creado.id) await enviar(`/api/soundpad/${creado.id}`, 'PATCH', { icon: s.icon, color: s.color, shortcut: s.shortcut }).catch(() => {});
    }
    try {
      for (const [k, v] of Object.entries(datos.localStorage || {})) {
        if (k.startsWith(PREFIJO_LOCAL) && typeof v === 'string') localStorage.setItem(k, v);
      }
    } catch { /* storage no disponible */ }
    showToast(t('toast.backupImported'));
    // Recarga para que la UI tome los ajustes locales, la voz y los atajos.
    setTimeout(() => window.location.reload(), 1200);
  } catch {
    showToast(t('toast.backupFailed'));
  }
}
