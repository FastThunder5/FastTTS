'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { pause } = require('../features/sonido/musica/routes/pause');
const { advanceMusicQueue } = require('../features/sonido/musica/advance-queue');
const { createMusicState } = require('../features/sonido/musica/state');

function fakeDeps() {
  const broadcasts = [];
  const musicState = createMusicState();
  const bus = {
    emit(event, ...args) {
      if (event === 'config:get') { args[0]({ playlistEnabled: false }); return; }
      if (event === 'ws:broadcast') broadcasts.push(args[0]);
    },
  };
  return { broadcasts, musicState, deps: { musicState, bus, logger: { log() {} } } };
}

function call(handler, body) {
  let out;
  handler({ body }, { json(d) { out = d; } });
  return out;
}

test('POST /api/music/pause alterna y avisa a overlay y panel por WS', () => {
  const { deps, broadcasts, musicState } = fakeDeps();
  const h = pause(deps);
  assert.deepEqual(call(h, {}), { ok: true, paused: true });
  assert.equal(musicState.paused, true);
  assert.deepEqual(broadcasts.at(-1), { type: 'music-pause', paused: true });
  assert.deepEqual(call(h, { paused: false }), { ok: true, paused: false });
  assert.deepEqual(broadcasts.at(-1), { type: 'music-pause', paused: false });
});

test('un tema nuevo arranca sin pausa', () => {
  const { deps, broadcasts, musicState } = fakeDeps();
  musicState.paused = true;
  musicState.queue.push({ videoId: 'abc', title: 'x' });
  advanceMusicQueue(deps);
  assert.equal(musicState.paused, false);
  assert.ok(broadcasts.some((b) => b.type === 'music-pause' && b.paused === false));
});
