/**
 * Diccionario de pronunciacion y nombres de usuario para el TTS. Puro: sin
 * DOM ni estado. Las listas viven en config.json (ttsPronunciations,
 * ttsNickAliases, ttsCleanNicks); los limites se espejan en
 * features/configuracion/validators.js.
 */
export const LISTA_MAX_ENTRADAS = 300;
export const CLAVE_MAX_LEN = 40;
export const VALOR_MAX_LEN = 80;

const escaparRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

let cacheDict = null;
let cacheRe = null;

function regexDe(dict) {
  if (dict === cacheDict) return cacheRe;
  const claves = Object.keys(dict || {}).filter(Boolean).sort((a, b) => b.length - a.length);
  cacheDict = dict;
  cacheRe = claves.length
    ? new RegExp(`(?<![\\p{L}\\p{N}])(?:${claves.map(escaparRegex).join('|')})(?![\\p{L}\\p{N}])`, 'giu')
    : null;
  return cacheRe;
}

/** Reemplaza palabras completas (sin importar mayusculas). Valor vacio = se omite. */
export function aplicarDiccionario(texto, dict) {
  const re = regexDe(dict);
  if (!re || !texto) return texto;
  return texto
    .replace(re, (m) => dict[m.toLowerCase()] ?? m)
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

const DECORACION = /^x+$/i;

/** "xX_Pedro_1234_Xx" -> "Pedro", "SuperGamerMX" -> "Super Gamer MX". */
export function limpiarNick(nick) {
  const original = String(nick ?? '').trim();
  let s = original
    .replace(/[^\p{L}\p{N}\s_.-]/gu, ' ')
    .replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2')
    .replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, '$1 $2')
    .replace(/[_.-]+/g, ' ');
  if ((s.match(/\p{L}/gu) || []).length >= 2) s = s.replace(/\p{N}+/gu, ' ');
  const tokens = s.split(/\s+/).filter(Boolean);
  while (tokens.length > 1 && DECORACION.test(tokens[0])) tokens.shift();
  while (tokens.length > 1 && DECORACION.test(tokens[tokens.length - 1])) tokens.pop();
  // Google deletrea las palabras largas en mayusculas ("PEDRO" -> P-E-D-R-O).
  const limpio = tokens.map((tk) => (tk.length > 3 && tk === tk.toUpperCase() ? tk.toLowerCase() : tk)).join(' ');
  return limpio || original;
}

/** Nombre que lee el TTS: apodo fijo > nick limpio > nick tal cual. */
export function nombreParaTts(nick, { alias = {}, limpiar = true } = {}) {
  const clave = String(nick ?? '').trim().toLowerCase();
  const apodo = Object.hasOwn(alias, clave) ? alias[clave] : '';
  if (apodo && typeof apodo === 'string') return apodo;
  return limpiar ? limpiarNick(nick) : String(nick ?? '');
}

const sanear = (s, max) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

/** "xd = equis de" por linea -> { xd: 'equis de' }. Sin "=" la palabra se omite al leer. */
export function parsearLineas(texto) {
  const mapa = {};
  for (const linea of String(texto ?? '').split(/\r?\n/)) {
    const i = linea.indexOf('=');
    const clave = sanear(i === -1 ? linea : linea.slice(0, i), CLAVE_MAX_LEN).toLowerCase();
    if (!clave || clave === '__proto__' || Object.keys(mapa).length >= LISTA_MAX_ENTRADAS) continue;
    mapa[clave] = i === -1 ? '' : sanear(linea.slice(i + 1), VALOR_MAX_LEN);
  }
  return mapa;
}

export function aLineas(mapa) {
  return Object.entries(mapa || {}).map(([k, v]) => (v ? `${k} = ${v}` : k)).join('\n');
}
