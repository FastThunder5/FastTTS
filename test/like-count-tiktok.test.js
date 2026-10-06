'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('el overlay suma likeCount numerico aunque el cliente lo entregue como string', () => {
  const { normalizeLike } = require('../features/canales/tiktok/normalize-event');
  // 0 + "5" seria "05": la coercion en el productor lo evita
  assert.equal(normalizeLike({ count: '5' }).likeCount, 5);
  assert.equal(normalizeLike({ likeCount: '7' }).likeCount, 7);
  assert.equal(normalizeLike({}).likeCount, 1);
});

test('los 10 locales tienen announce.like, likeOne y likeFew', () => {
  const dir = path.join(__dirname, '../interfaz/publico/locales');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const a = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).announce;
    for (const k of ['like', 'likeOne', 'likeFew']) assert.ok(a[k], `${f}: falta announce.${k}`);
  }
});
