/**
 * Voz distinta por espectador. Puro: sin DOM ni estado. Las opciones viven en
 * config.json (ttsUserVoices = { nick: 'Jorge' }, ttsRandomVoicePerUser).
 */
import { idiomaDeVoz } from './idioma-de-voz.js';

const normalizar = (s) => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase();

/** Nombre corto de una voz: "Jorge — México" -> "jorge". */
const nombreCorto = (voz) => normalizar(String(voz.name).split('—')[0]);

/** "Jorge" / "jorge" / "edge:es-MX-JorgeNeural" -> la voz de la lista, o null. */
export function buscarVoz(nombre, voces) {
  const n = normalizar(nombre);
  if (!n) return null;
  return voces.find((v) => normalizar(v.id) === n)
    || voces.find((v) => v.engine === 'edge' && nombreCorto(v) === n)
    || null;
}

// FNV-1a: el mismo nick cae siempre en la misma voz, entre sesiones.
function hashNick(nick) {
  let h = 0x811c9dc5;
  for (const ch of normalizar(nick)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * Voz con la que se lee a un espectador, o null para usar la voz principal.
 * Prioridad: voz fija del nick > voz al azar (estable) del idioma principal.
 */
export function vozParaUsuario(nick, { fijas = {}, aleatoria = false, voces = [], vozPrincipal = '' } = {}) {
  const clave = String(nick ?? '').trim().toLowerCase();
  if (!clave) return null;
  if (Object.hasOwn(fijas, clave)) {
    const fija = buscarVoz(fijas[clave], voces);
    if (fija) return fija.id;
  }
  if (!aleatoria) return null;
  const idioma = idiomaDeVoz(vozPrincipal);
  const pool = voces.filter((v) => v.engine === 'edge' && idiomaDeVoz(v.id) === idioma);
  if (!pool.length) return null;
  return pool[hashNick(clave) % pool.length].id;
}
