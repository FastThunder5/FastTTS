'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { handleMusicRequest } = require('../features/sonido/musica/handle-request');
const { createMusicState } = require('../features/sonido/musica/state');

const MIX = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ&start_radio=1';

function fakeDeps({ expandPlaylist, config }) {
  const broadcasts = [];
  const musicState = createMusicState();
  const bus = {
    emit(event, ...args) {
      if (event === 'config:get') {
        args[0]({ musicEnabled: true, musicUserCooldownMs: 0, musicMaxQueue: 10, playlistEnabled: false, ...config });
        return;
      }
      if (event === 'ws:broadcast') broadcasts.push(args[0]);
    },
  };
  const engine = {
    ensureReady: async () => {},
    expandPlaylist,
    getInfo: async (videoId) => ({ videoId, title: 'solo', channelName: '', thumbnail: '', duration: '' }),
    search: async () => null,
  };
  return { broadcasts, musicState, deps: { musicState, bus, engine, logger: { log() {} } } };
}

function item(n) {
  return { raw: `https://www.youtube.com/watch?v=vid${n}`, videoId: `vid${n}`, title: `Tema ${n}`, channelName: '', thumbnail: '', duration: '' };
}

test('pedido con Mix de YouTube encola todos los temas, no solo el primero', async () => {
  const { musicState, deps } = fakeDeps({ expandPlaylist: async () => [item(1), item(2), item(3)] });
  await handleMusicRequest(deps)({ query: MIX, user: 'ana', userId: 'u1', platform: 'tiktok' });
  // El primero pasa a sonar y el resto queda en cola.
  assert.equal(musicState.currentTrack.videoId, 'vid1');
  assert.deepEqual(musicState.queue.map((t) => t.videoId), ['vid2', 'vid3']);
  assert.equal(musicState.queue[0].requestedBy, 'ana');
});

test('pedido con Mix respeta el maximo de la cola', async () => {
  const items = Array.from({ length: 30 }, (_, i) => item(i));
  const { musicState, deps } = fakeDeps({ expandPlaylist: async () => items, config: { musicMaxQueue: 5 } });
  await handleMusicRequest(deps)({ query: MIX, user: 'ana', userId: 'u1', platform: 'tiktok' });
  assert.equal(musicState.queue.length + (musicState.currentTrack ? 1 : 0), 5);
});

test('si la expansion falla, cae al video suelto del Mix', async () => {
  const { musicState, deps } = fakeDeps({ expandPlaylist: async () => { throw new Error('yt-dlp'); } });
  await handleMusicRequest(deps)({ query: MIX, user: 'ana', userId: 'u1', platform: 'tiktok' });
  assert.equal(musicState.currentTrack.videoId, 'dQw4w9WgXcQ');
});
