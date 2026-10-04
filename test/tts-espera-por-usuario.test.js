'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { CONFIG_VALIDATORS } = require('../features/configuracion/validators');
const { DEFAULT_CONFIG } = require('../features/configuracion/default-config');

// Modulo ESM del cliente sin bundler: se quita export y se evalua aparte.
function cargar() {
  const src = fs.readFileSync(path.join(__dirname, '../interfaz/src/nucleo/tts/espera-por-usuario.js'), 'utf8')
    .replace(/^export /gm, '');
  const ctx = {};
  vm.runInNewContext(`${src}\nthis.crearEsperaPorUsuario = crearEsperaPorUsuario;`, ctx);
  return ctx.crearEsperaPorUsuario();
}

test('con espera 0 siempre se lee', () => {
  const espera = cargar();
  assert.equal(espera.puedeHablar('pedro', 0, 1000), true);
  assert.equal(espera.puedeHablar('pedro', 0, 1001), true);
});

test('el mismo usuario espera; otro usuario no', () => {
  const espera = cargar();
  assert.equal(espera.puedeHablar('Pedro', 10, 0), true);
  assert.equal(espera.puedeHablar('pedro', 10, 5000), false, 'sin importar mayusculas');
  assert.equal(espera.puedeHablar('ana', 10, 5000), true);
  assert.equal(espera.puedeHablar('pedro', 10, 10000), true, 'pasado el tiempo vuelve a leerse');
});

test('un mensaje saltado no reinicia la espera', () => {
  const espera = cargar();
  espera.puedeHablar('pedro', 10, 0);
  espera.puedeHablar('pedro', 10, 9000);
  assert.equal(espera.puedeHablar('pedro', 10, 10000), true);
});

test('limpiar olvida a todos', () => {
  const espera = cargar();
  espera.puedeHablar('pedro', 60, 0);
  espera.limpiar();
  assert.equal(espera.puedeHablar('pedro', 60, 1), true);
});

test('config ttsUserCooldownSec: default 0 y rango 0..600 en enteros', () => {
  assert.equal(DEFAULT_CONFIG.ttsUserCooldownSec, 0);
  const v = CONFIG_VALIDATORS.ttsUserCooldownSec;
  assert.equal(v(0), true);
  assert.equal(v(600), true);
  assert.equal(v(601), false);
  assert.equal(v(-1), false);
  assert.equal(v(2.5), false);
  assert.equal(v('10'), false);
});
