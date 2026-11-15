'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const test = require('node:test');

const root = path.join(__dirname, '..');
const { WATCHDOG_TIMEOUT_MS, nextConfirmBackoffMs, CONFIRM_BACKOFF_CAP_MS } = require(path.join(root, 'features/canales/youtube/chat-watchdog.js'));

function stub(id, exportsObj) {
  const resolved = require.resolve(id, { paths: [root] });
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports: exportsObj };
}

test('backoff de confirmacion se duplica hasta el tope', () => {
  assert.equal(nextConfirmBackoffMs(WATCHDOG_TIMEOUT_MS), WATCHDOG_TIMEOUT_MS * 2);
  assert.equal(nextConfirmBackoffMs(CONFIRM_BACKOFF_CAP_MS), CONFIRM_BACKOFF_CAP_MS);
});

test('YouTube: un silencio con el directo en pie no reconecta; si el directo cae, si', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let liveOk = true;
  let starts = 0;
  class LiveChat extends EventEmitter {
    constructor(opts) { super(); this.opts = opts; }
    async start() { starts += 1; return true; }
    stop() {}
  }
  stub('youtube-chat', { LiveChat });
  stub('youtube-chat/dist/requests', {
    fetchLivePage: async () => { if (!liveOk) throw new Error('Live Stream was not found'); return {}; },
  });
  const { connectYoutube } = require(path.join(root, 'features/canales/youtube/connect-youtube.js'));

  const events = [];
  const state = {
    youtubeChannels: new Map(), youtubeReconnectTimers: new Map(), youtubeWatchdogTimers: new Map(), youtubeSeenIds: new Map(),
  };
  const deps = { state, bus: { emit: (n, p) => events.push({ n, p }) }, logger: { log: () => {} } };
  const flush = () => new Promise((r) => globalThis.setImmediate(r));

  const key = await connectYoutube(deps, 'UCxxxxxxxxxxxxxxxxxxxxxx');
  assert.equal(starts, 1);

  t.mock.timers.tick(WATCHDOG_TIMEOUT_MS);
  await flush();
  assert.equal(state.youtubeChannels.size, 1, 'con el directo sano no se desconecta');
  assert.ok(!events.some((e) => e.p && e.p.state === 'reconectando'));

  liveOk = false;
  t.mock.timers.tick(WATCHDOG_TIMEOUT_MS * 2); // siguiente chequeo, con backoff
  await flush();
  assert.ok(events.some((e) => e.p && e.p.state === 'reconectando' && e.p.attempt === 1));
  assert.equal(state.youtubeChannels.has(key), false);
  for (const timer of state.youtubeReconnectTimers.values()) clearTimeout(timer);
});
