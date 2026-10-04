'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

// connect-tiktok-channel.js hace `new WebcastPushConnection(...)`: si la
// version instalada de tiktok-live-connector no lo exporta, TikTok no conecta.
test('connect-tiktok-channel carga un WebcastPushConnection construible', () => {
  const Module = require('module');
  const original = Module.prototype.require;
  let ctor = null;
  Module.prototype.require = function (id) {
    const mod = original.apply(this, arguments);
    if (id === 'tiktok-live-connector' || id === 'tiktok-live-connector/legacy') {
      if (mod && typeof mod.WebcastPushConnection === 'function') ctor = mod.WebcastPushConnection;
    }
    return mod;
  };
  try {
    delete require.cache[require.resolve('../features/canales/tiktok/connect-tiktok-channel')];
    require('../features/canales/tiktok/connect-tiktok-channel');
  } finally {
    Module.prototype.require = original;
  }
  assert.equal(typeof ctor, 'function');
  const conn = new ctor('usuario_prueba', { processInitialData: false });
  assert.equal(typeof conn.connect, 'function');
  assert.equal(typeof conn.on, 'function');
});
