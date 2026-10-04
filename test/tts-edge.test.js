'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const EventEmitter = require('node:events');
const https = require('node:https');
const { WebSocketServer } = require('ws');

const edgeTts = require('../features/sonido/tts/edge-tts');
const { EDGE_VOICES, baseLangOfVoice } = require('../features/sonido/tts/edge-voices');
const { GOOGLE_TTS_LANGS } = require('../features/sonido/tts/langs');
const { fetchTtsAudio, _resetBackoff, claveCache, CACHE_DIR } = require('../features/sonido/tts/fetch-audio');

test('Sec-MS-GEC: 64 hex en mayusculas, estable dentro de la ventana de 5 min', () => {
  const t0 = Date.UTC(2026, 9, 4, 12, 0, 10);
  const a = edgeTts.generateSecMsGec(t0);
  assert.match(a, /^[0-9A-F]{64}$/);
  assert.equal(edgeTts.generateSecMsGec(t0 + 60000), a);
  assert.notEqual(edgeTts.generateSecMsGec(t0 + 300000), a);
});

test('SSML escapa el texto del chat y usa el nombre largo de la voz', () => {
  const ssml = edgeTts.buildSsml(`<b>hola</b> & "chau" 'x'`, 'es-MX-DaliaNeural', '+0%');
  assert.ok(ssml.includes("Microsoft Server Speech Text to Speech Voice (es-MX, DaliaNeural)"));
  assert.ok(ssml.includes('&lt;b&gt;hola&lt;/b&gt; &amp; &quot;chau&quot; &apos;x&apos;'));
  assert.equal(edgeTts.fullVoiceName('en-US-AvaMultilingualNeural'), 'Microsoft Server Speech Text to Speech Voice (en-US, AvaMultilingualNeural)');
});

test('cada voz de Edge tiene un idioma Google valido y coincide con el espejo del cliente', () => {
  const src = fs.readFileSync(path.join(__dirname, '../interfaz/src/nucleo/tts/idioma-de-voz.js'), 'utf8')
    .replace('export function', 'function');
  const ctx = {};
  vm.runInNewContext(`${src}\nthis.idiomaDeVoz = idiomaDeVoz;`, ctx);
  for (const v of EDGE_VOICES) {
    assert.ok(GOOGLE_TTS_LANGS.has(v.lang), `${v.id} -> ${v.lang}`);
    assert.equal(ctx.idiomaDeVoz(v.id), v.lang, v.id);
    assert.equal(baseLangOfVoice(v.id), v.lang);
    assert.ok(fs.existsSync(path.join(__dirname, '../interfaz/publico/flags', `${v.flag}.svg`)), `falta bandera ${v.flag}`);
  }
  assert.equal(ctx.idiomaDeVoz('en-GB'), 'en-GB');
});

function frameAudio(audio) {
  const header = Buffer.from('X-RequestId:abc\r\nContent-Type:audio/mpeg\r\nPath:audio\r\n');
  const len = Buffer.alloc(2);
  len.writeUInt16BE(header.length);
  return Buffer.concat([len, header, audio]);
}

test('protocolo: manda config + SSML y junta los frames de audio hasta turn.end', async () => {
  const wss = new WebSocketServer({ port: 0 });
  await new Promise((r) => wss.on('listening', r));
  const recibidos = [];
  wss.on('connection', (sock) => {
    sock.on('message', (data) => {
      const msg = data.toString();
      recibidos.push(msg);
      if (msg.includes('Path:ssml')) {
        sock.send(frameAudio(Buffer.alloc(800, 1)));
        sock.send(frameAudio(Buffer.alloc(700, 2)));
        sock.send('X-RequestId:abc\r\nPath:turn.end\r\n\r\n{}');
      }
    });
  });
  try {
    const buf = await edgeTts._synthesizeOnce({
      text: 'hola', voiceName: 'es-MX-JorgeNeural', rate: '+0%', url: `ws://127.0.0.1:${wss.address().port}`,
    });
    assert.equal(buf.length, 1500);
    assert.equal(buf[0], 1);
    assert.equal(buf[1499], 2);
    assert.ok(recibidos[0].includes('Path:speech.config'));
    assert.ok(recibidos[1].includes('es-MX, JorgeNeural'));
  } finally {
    wss.close();
  }
});

test('si Edge falla se usa la voz de Google del mismo idioma', async () => {
  _resetBackoff();
  const origEdge = edgeTts.synthesizeEdge;
  const origGet = https.get;
  let urlGoogle = null;
  edgeTts.synthesizeEdge = async () => { throw { code: 'NET', message: 'sin red' }; };
  https.get = (url, _opts, cb) => {
    urlGoogle = url;
    const req = new EventEmitter();
    req.setTimeout = () => {};
    req.destroy = () => {};
    const res = new EventEmitter();
    res.statusCode = 200;
    res.headers = { 'content-type': 'audio/mpeg' };
    setTimeout(() => { cb(res); res.emit('data', Buffer.alloc(2048)); res.emit('end'); }, 0);
    return req;
  };
  const texto = `prueba edge fallback ${Date.now()}`;
  try {
    const { buffer } = await fetchTtsAudio({ text: texto, voice: 'edge:pt-BR-FranciscaNeural' });
    assert.equal(buffer.length, 2048);
    assert.match(urlGoogle, /tl=pt/);
  } finally {
    edgeTts.synthesizeEdge = origEdge;
    https.get = origGet;
    _resetBackoff();
    fs.rmSync(path.join(CACHE_DIR, `${claveCache(texto, 'pt', false)}.mp3`), { force: true });
  }
});
