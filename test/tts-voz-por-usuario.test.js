'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { EDGE_VOICES } = require('../features/sonido/tts/edge-voices');
const { CONFIG_VALIDATORS } = require('../features/configuracion/validators');

// Modulos ESM del cliente sin bundler: se quitan import/export y se evaluan juntos.
function cargarCliente() {
  const leer = (f) => fs.readFileSync(path.join(__dirname, '../interfaz/src/nucleo/tts', f), 'utf8')
    .replace(/^import .*$/gm, '')
    .replace(/^export /gm, '');
  const ctx = {};
  vm.runInNewContext(`${leer('idioma-de-voz.js')}\n${leer('voz-por-usuario.js')}\nthis.vozParaUsuario = vozParaUsuario; this.buscarVoz = buscarVoz;`, ctx);
  return ctx;
}

const voces = [
  { id: 'es-MX', name: 'Español (México)', flag: 'MX', lang: 'es-MX', engine: 'google' },
  ...EDGE_VOICES,
];

test('buscarVoz encuentra por nombre corto sin importar tildes ni mayusculas, o por id', () => {
  const { buscarVoz } = cargarCliente();
  assert.equal(buscarVoz('alvaro', voces).id, 'edge:es-ES-AlvaroNeural');
  assert.equal(buscarVoz('JORGE', voces).id, 'edge:es-MX-JorgeNeural');
  assert.equal(buscarVoz('edge:en-US-GuyNeural', voces).id, 'edge:en-US-GuyNeural');
  assert.equal(buscarVoz('es-MX', voces).id, 'es-MX');
  assert.equal(buscarVoz('Morgan Freeman', voces), null);
});

test('voz fija gana; sin fija ni azar se usa la voz principal (null)', () => {
  const { vozParaUsuario } = cargarCliente();
  const opts = { fijas: { pedro: 'Elena' }, voces, vozPrincipal: 'edge:es-MX-DaliaNeural' };
  assert.equal(vozParaUsuario('Pedro', opts), 'edge:es-AR-ElenaNeural');
  assert.equal(vozParaUsuario('Maria', opts), null);
});

test('al azar: estable por nick y siempre del idioma de la voz principal', () => {
  const { vozParaUsuario } = cargarCliente();
  const opts = { aleatoria: true, voces, vozPrincipal: 'es-MX' };
  const nicks = ['ana', 'luis', 'xX_Gamer_Xx', 'sofia', 'pepe', 'karla', 'tito', 'mar'];
  const asignadas = nicks.map((n) => vozParaUsuario(n, opts));
  for (const id of asignadas) assert.match(id, /^edge:es-/);
  assert.deepEqual(nicks.map((n) => vozParaUsuario(n, opts)), asignadas);
  assert.equal(vozParaUsuario('ANA', opts), asignadas[0]);
  assert.ok(new Set(asignadas).size > 1, 'deberia repartir voces distintas');
  assert.match(vozParaUsuario('ana', { ...opts, vozPrincipal: 'edge:en-GB-RyanNeural' }), /^edge:en-GB-/);
});

test('el servidor acepta las dos claves nuevas de config', () => {
  assert.equal(CONFIG_VALIDATORS.ttsUserVoices({ pedro: 'Jorge' }), true);
  assert.equal(CONFIG_VALIDATORS.ttsUserVoices({ Pedro: 'Jorge' }), false);
  assert.equal(CONFIG_VALIDATORS.ttsRandomVoicePerUser(true), true);
});
