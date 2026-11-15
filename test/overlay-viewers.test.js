'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { normalizeRoomUser } = require('../features/canales/tiktok/normalize-event');
const { setViewerCount } = require('../features/overlay/state/set-viewer-count');
const { removeViewerCount } = require('../features/overlay/state/remove-viewer-count');

test('normalizeRoomUser lee total (proto v3) y viewerCount (formato viejo)', () => {
  assert.equal(normalizeRoomUser({ total: '1234', totalUser: '9999' }), 1234);
  assert.equal(normalizeRoomUser({ viewerCount: 56 }), 56);
  assert.equal(normalizeRoomUser({}), null);
  assert.equal(normalizeRoomUser(null), null);
});

test('espectadores: suma por canal y resta al desconectar', () => {
  const state = { viewerCountByChannel: new Map() };
  assert.equal(setViewerCount(state, { platform: 'tiktok', channel: 'a', viewerCount: 100 }), 100);
  assert.equal(setViewerCount(state, { platform: 'tiktok', channel: 'b', viewerCount: '20' }), 120);
  assert.equal(setViewerCount(state, { platform: 'tiktok', channel: 'a', viewerCount: 'x' }), null);
  assert.equal(removeViewerCount(state, { platform: 'tiktok', channel: 'a' }), 20);
  assert.equal(removeViewerCount(state, { platform: 'tiktok' }), 0);
});
