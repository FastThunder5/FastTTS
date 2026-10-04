'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CONFIG_VALIDATORS } = require('../features/configuracion/validators');
const { DEFAULT_CONFIG } = require('../features/configuracion/default-config');

const load = () => import('../interfaz/src/nucleo/tts/pronunciacion.js');

test('el diccionario reemplaza palabras completas sin importar mayusculas', async () => {
  const { aplicarDiccionario } = await load();
  const dict = { xd: 'equis de', q: 'que', alv: '' };
  assert.equal(aplicarDiccionario('Q onda XD alv!', dict), 'que onda equis de!');
  assert.equal(aplicarDiccionario('aquí qué xddd', dict), 'aquí qué xddd');
  assert.equal(aplicarDiccionario('alv', dict), '');
  assert.equal(aplicarDiccionario('hola', {}), 'hola');
});

test('limpiarNick quita numeros, guiones y adornos', async () => {
  const { limpiarNick } = await load();
  assert.equal(limpiarNick('xX_Pedro_1234_Xx'), 'Pedro');
  assert.equal(limpiarNick('xXPedroXx'), 'Pedro');
  assert.equal(limpiarNick('SuperGamerMX'), 'Super Gamer MX');
  assert.equal(limpiarNick('🔥Luna🔥'), 'Luna');
  assert.equal(limpiarNick('PEDRO'), 'pedro');
  assert.equal(limpiarNick('12345'), '12345');
  assert.equal(limpiarNick('🔥'), '🔥');
});

test('nombreParaTts prioriza el apodo y respeta el toggle', async () => {
  const { nombreParaTts } = await load();
  const alias = { 'xx_pedro_xx': 'Pedrito' };
  assert.equal(nombreParaTts('xX_Pedro_Xx', { alias }), 'Pedrito');
  assert.equal(nombreParaTts('Ana_99', { alias, limpiar: false }), 'Ana_99');
  assert.equal(nombreParaTts('Ana_99', { alias }), 'Ana');
  assert.equal(nombreParaTts('constructor', { alias }), 'constructor');
});

test('parsearLineas y aLineas van y vuelven', async () => {
  const { parsearLineas, aLineas } = await load();
  const mapa = parsearLineas('XD = equis de\nalv\n = nada\n__proto__ = x\n tqm=te quiero mucho');
  assert.deepEqual(mapa, { xd: 'equis de', alv: '', tqm: 'te quiero mucho' });
  assert.deepEqual(parsearLineas(aLineas(mapa)), mapa);
});

test('el validador acepta los defaults y rechaza mapas invalidos', () => {
  const v = CONFIG_VALIDATORS.ttsPronunciations;
  assert.equal(v(DEFAULT_CONFIG.ttsPronunciations), true);
  assert.equal(CONFIG_VALIDATORS.ttsNickAliases({}), true);
  assert.equal(v({ XD: 'x' }), false);
  assert.equal(v({ xd: 1 }), false);
  assert.equal(v(['xd']), false);
  assert.equal(v({ xd: 'a'.repeat(81) }), false);
});
