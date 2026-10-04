'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fasttts-bots-'));
process.env.TIKTOK_USER_DATA_PATH = dataDir;

const { hasLink } = require('../features/moderacion/filters/has-link');
const { moderationStage } = require('../features/moderacion/filters/moderation-stage');
const { loadBlockedWordsFromFile, blockedWordsFile } = require('../features/moderacion/filters/blocked-words-file');
const { setActiveAccount } = require('../core/account-data-path');
const idiomaFiltrar = require('../core/contracts/idioma-filtrar');

// En la app lo provee features/idioma/ al registrarse; aca el idioma no se prueba.
idiomaFiltrar.filtrar = () => ({ ok: true });

const logger = { log() {} };
const opts = (linkFilterEnabled) => ({ voiceId: 'es', langFilterEnabled: false, dictFilterEnabled: false, allowedExtraLangs: [], linkFilterEnabled });
const newState = () => ({ blockedWords: new Set() });

test('hasLink detecta http, www y dominio.tld', () => {
  for (const t of ['mira https://x.co/a', 'www.algo.net', 'compra en streamboost.shop ya', 'BOTS.COM', 'viewers.gg/promo']) {
    assert.equal(hasLink(t), true, t);
  }
});

test('hasLink no bloquea texto normal', () => {
  for (const t of ['hola a todos', 'bien.me voy', 'listo.es broma', 'version 1.5', 'jajaja...', 'qué tal.ok']) {
    assert.equal(hasLink(t), false, t);
  }
});

test('moderationStage bloquea enlaces solo con el toggle prendido', () => {
  assert.deepEqual(moderationStage('sigueme en bots.com', newState(), opts(true)), { stage: 'link' });
  assert.equal(moderationStage('sigueme en bots.com', newState(), opts(false)), null);
});

test('"ai" bloquea la palabra suelta pero no "hay"', () => {
  const state = { blockedWords: new Set(['ai']) };
  assert.deepEqual(moderationStage('best AI tool', state, opts(false)), { stage: 'blockedWord' });
  assert.equal(moderationStage('hay gente aqui', state, opts(false)), null);
});

test('las palabras nuevas se siembran una sola vez en listas existentes', () => {
  setActiveAccount('cuenta-vieja');
  fs.writeFileSync(blockedWordsFile(), '# lista\n\n- tonto\n');
  const state = newState();
  loadBlockedWordsFromFile(state, logger);
  for (const w of ['tonto', 'viewers', 'followers', 'promo', 'cheap', 'ai']) assert.ok(state.blockedWords.has(w), w);
  assert.match(fs.readFileSync(blockedWordsFile(), 'utf-8'), /^- ai$/m);

  // El usuario borra "ai" a mano: no vuelve a aparecer al recargar.
  fs.writeFileSync(blockedWordsFile(), '- tonto\n');
  const again = newState();
  loadBlockedWordsFromFile(again, logger);
  assert.deepEqual([...again.blockedWords], ['tonto']);
  fs.rmSync(dataDir, { recursive: true, force: true });
});
