'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function cargar() {
  const src = fs.readFileSync(path.join(__dirname, '../interfaz/src/nucleo/respaldo/respaldo.js'), 'utf8')
    .replace(/^export /gm, '');
  const ctx = {};
  vm.runInNewContext(`${src}\nthis.m = { configParaRespaldo, moderacionParaRespaldo, accionesModeracion, validarRespaldo, RESPALDO_APP };`, ctx);
  return ctx.m;
}

test('la config exportada no lleva las llaves de seguridad ni la playlist cruda', () => {
  const { configParaRespaldo } = cargar();
  const out = configParaRespaldo({ ttsVoiceLang: 'es-MX', mcpEnabled: true, mcpDestructiveToolsEnabled: true, streamerPlaylist: ['a'], musicSkipVotes: 3 });
  assert.deepEqual(Object.keys(out).sort(), ['musicSkipVotes', 'ttsVoiceLang']);
});

test('moderacion: solo castigos vigentes y whitelist; se restauran con la duracion que queda', () => {
  const { moderacionParaRespaldo, accionesModeracion } = cargar();
  const ahora = 1_000_000;
  const viewers = [
    { key: 'tiktok:1', nick: 'troll', banUntil: -1, muteUntil: 0, isWhitelisted: false },
    { key: 'tiktok:2', nick: 'spam', banUntil: 0, muteUntil: ahora + 60_000, isWhitelisted: false },
    { key: 'tiktok:3', nick: 'viejo', banUntil: ahora - 1, muteUntil: 0, isWhitelisted: false },
    { key: 'twitch:4', nick: 'amigo', banUntil: 0, muteUntil: 0, isWhitelisted: true },
    { key: 'tiktok:5', nick: 'normal', banUntil: 0, muteUntil: 0, isWhitelisted: false },
  ];
  const resp = moderacionParaRespaldo(viewers, ahora);
  assert.deepEqual(resp.map((v) => v.key), ['tiktok:1', 'tiktok:2', 'twitch:4']);
  assert.deepEqual(JSON.parse(JSON.stringify(accionesModeracion(resp[0], ahora))), [['/api/moderation/ban', { key: 'tiktok:1', nick: 'troll', durationMs: null }]]);
  assert.deepEqual(accionesModeracion(resp[1], ahora + 20_000)[0][1].durationMs, 40_000);
  assert.equal(accionesModeracion(resp[1], ahora + 120_000).length, 0);
  assert.equal(accionesModeracion(resp[2], ahora)[0][0], '/api/moderation/follower');
});

test('validarRespaldo rechaza archivos ajenos y de versiones futuras', () => {
  const { validarRespaldo, RESPALDO_APP } = cargar();
  assert.throws(() => validarRespaldo({ foo: 1 }), /invalid/);
  assert.throws(() => validarRespaldo({ app: RESPALDO_APP, version: 99 }), /newer/);
  assert.equal(validarRespaldo({ app: RESPALDO_APP, version: 1 }).version, 1);
});
