'use strict';

// Cliente del TTS de Microsoft Edge ("Leer en voz alta"): el mismo servicio
// que usa el navegador Edge, gratis y sin API key. Protocolo WebSocket portado
// de edge-tts (github.com/rany2/edge-tts):
//
//  1. Abre wss://speech.platform.bing.com/... con el token publico del
//     navegador + Sec-MS-GEC (sha256 de la hora redondeada a 5 min + token).
//  2. Manda `speech.config` (formato MP3) y despues el SSML con el texto.
//  3. Recibe frames binarios `Path:audio` (2 bytes de largo de cabecera +
//     cabecera + MP3) hasta el frame de texto `Path:turn.end`.
//
// Si el reloj de la PC esta corrido, Microsoft responde 403: se corrige con la
// hora del header `Date` de la respuesta y se reintenta una vez.

const crypto = require('crypto');
const WebSocket = require('ws');

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const WSS_URL = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}`;
const CHROMIUM_FULL_VERSION = '143.0.3650.75';
const CHROMIUM_MAJOR_VERSION = CHROMIUM_FULL_VERSION.split('.')[0];
const SEC_MS_GEC_VERSION = `1-${CHROMIUM_FULL_VERSION}`;
const WIN_EPOCH_S = 11644473600;
const TIMEOUT_MS = 15000;

// Diferencia (s) entre el reloj de Microsoft y el local, aprendida de un 403.
let clockSkewS = 0;

function generateSecMsGec(nowMs = Date.now()) {
  let ticks = Math.floor(nowMs / 1000) + clockSkewS + WIN_EPOCH_S;
  ticks -= ticks % 300;
  const ticks100ns = BigInt(ticks) * 10000000n;
  return crypto.createHash('sha256').update(`${ticks100ns}${TRUSTED_CLIENT_TOKEN}`, 'ascii').digest('hex').toUpperCase();
}

function randomId() {
  return crypto.randomUUID().replace(/-/g, '');
}

function dateToString(date = new Date()) {
  // Formato JS Date de Edge: "Sat Oct 04 2026 21:40:00 GMT+0000 (Coordinated Universal Time)"
  const dias = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const meses = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const p = (n) => String(n).padStart(2, '0');
  return `${dias[date.getUTCDay()]} ${meses[date.getUTCMonth()]} ${p(date.getUTCDate())} ${date.getUTCFullYear()} `
    + `${p(date.getUTCHours())}:${p(date.getUTCMinutes())}:${p(date.getUTCSeconds())} GMT+0000 (Coordinated Universal Time)`;
}

function escapeXml(text) {
  return String(text)
    // caracteres de control que el servicio rechaza
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** 'es-MX-DaliaNeural' -> 'Microsoft Server Speech Text to Speech Voice (es-MX, DaliaNeural)' */
function fullVoiceName(shortName) {
  const m = /^([a-z]{2,})-([A-Z]{2,})-(.+Neural)$/.exec(shortName);
  return m ? `Microsoft Server Speech Text to Speech Voice (${m[1]}-${m[2]}, ${m[3]})` : shortName;
}

function buildSsml(text, voiceName, rate) {
  return "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
    + `<voice name='${fullVoiceName(voiceName)}'><prosody pitch='+0Hz' rate='${rate}' volume='+0%'>`
    + `${escapeXml(text)}</prosody></voice></speak>`;
}

function buildUrl() {
  return `${WSS_URL}&ConnectionId=${randomId()}&Sec-MS-GEC=${generateSecMsGec()}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`;
}

function buildHeaders() {
  return {
    'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR_VERSION}.0.0.0 Safari/537.36 Edg/${CHROMIUM_MAJOR_VERSION}.0.0.0`,
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'en-US,en;q=0.9',
    Pragma: 'no-cache',
    'Cache-Control': 'no-cache',
    Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
    Cookie: `muid=${crypto.randomBytes(16).toString('hex').toUpperCase()};`,
  };
}

// Un intento. Resuelve con Buffer MP3 o rechaza con { code } (mismos codes que
// fetch-audio.js usa para Google, para que el resto del flujo no cambie).
function synthesizeOnce({ text, voiceName, rate, signal, url = buildUrl() }) {
  return new Promise((resolve, reject) => {
    if (signal && signal.aborted) { reject({ code: 'ABORTED' }); return; }

    let terminado = false;
    const chunks = [];
    const ws = new WebSocket(url, { headers: buildHeaders(), perMessageDeflate: true });

    const fin = (err, buf) => {
      if (terminado) return;
      terminado = true;
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
      try { ws.terminate(); } catch { /* noop */ }
      if (err) reject(err); else resolve(buf);
    };
    const onAbort = () => fin({ code: 'ABORTED' });
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => fin({ code: 'TIMEOUT' }), TIMEOUT_MS);

    ws.on('unexpected-response', (_req, res) => {
      const status = res.statusCode || 0;
      fin({ code: status === 403 ? 'HTTP4XX' : 'HTTP', status, serverDate: res.headers && res.headers.date });
    });
    ws.on('error', (err) => fin({ code: 'NET', message: err.message }));
    ws.on('close', () => fin({ code: 'NET', message: 'conexion cerrada antes de terminar' }));

    ws.on('open', () => {
      const ts = dateToString();
      ws.send(
        `X-Timestamp:${ts}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n`
        + '{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},'
        + '"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n'
      );
      ws.send(
        `X-RequestId:${randomId()}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${ts}Z\r\nPath:ssml\r\n\r\n`
        + buildSsml(text, voiceName, rate)
      );
    });

    ws.on('message', (data, isBinary) => {
      if (isBinary) {
        const buf = Buffer.isBuffer(data) ? data : Buffer.concat(data);
        if (buf.length < 2) return;
        const headerLen = buf.readUInt16BE(0);
        const header = buf.subarray(2, 2 + headerLen).toString('utf8');
        if (header.includes('Path:audio')) chunks.push(buf.subarray(2 + headerLen));
        return;
      }
      if (data.toString().includes('Path:turn.end')) fin(null, Buffer.concat(chunks));
    });
  });
}

/**
 * @param {{ text: string, voiceName: string, slow?: boolean, signal?: AbortSignal }} opts
 * @returns {Promise<Buffer>} MP3
 */
async function synthesizeEdge({ text, voiceName, slow = false, signal = null }) {
  const rate = slow ? '-25%' : '+0%';
  try {
    return await synthesizeOnce({ text, voiceName, rate, signal });
  } catch (err) {
    // 403 por reloj corrido: ajustar con la hora del servidor y reintentar una vez.
    const serverMs = err && err.status === 403 && err.serverDate ? Date.parse(err.serverDate) : NaN;
    if (!Number.isFinite(serverMs)) throw err;
    clockSkewS = Math.round((serverMs - Date.now()) / 1000);
    return synthesizeOnce({ text, voiceName, rate, signal });
  }
}

module.exports = { synthesizeEdge, generateSecMsGec, buildSsml, escapeXml, fullVoiceName, _synthesizeOnce: synthesizeOnce };
