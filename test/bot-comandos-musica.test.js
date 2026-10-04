'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { parseCommand } = require('../features/bot/parse-command');
const { createMusicState } = require('../features/sonido/musica/state');
const { handleChatCommand } = require('../features/sonido/musica/handle-chat-command');

test('parseCommand reconoce !p y los comandos nuevos con sus alias', () => {
  assert.deepEqual(parseCommand('!p bad bunny'), { comando: 'play', args: 'bad bunny' });
  assert.equal(parseCommand('!Cancion').comando, 'cancion');
  assert.equal(parseCommand('!canción').comando, 'cancion');
  assert.equal(parseCommand('!song ').comando, 'cancion');
  assert.equal(parseCommand('!cola').comando, 'cola');
  assert.equal(parseCommand('!SKIP').comando, 'skip');
  assert.equal(parseCommand('!quitar').comando, 'quitar');
  assert.equal(parseCommand('!wrongsong').comando, 'quitar');
  assert.equal(parseCommand('!skip esta cancion es mala'), null);
  assert.equal(parseCommand('hola !cola'), null);
  assert.equal(parseCommand('!p'), null);
  assert.equal(parseCommand('!otro'), null);
});

function setup({ skipVotes = 3, queue = [], current = null } = {}) {
  const broadcasts = [];
  const bus = {
    emit(event, ...args) {
      if (event === 'config:get') {
        args[0]({ musicEnabled: true, musicSkipVotes: skipVotes, musicBannedUsers: ['troll'], playlistEnabled: false, musicVolume: 0.5 });
      } else if (event === 'ws:broadcast') {
        broadcasts.push(args[0]);
      }
    },
  };
  const logger = { log() {} };
  const musicState = createMusicState();
  musicState.queue = queue;
  musicState.currentTrack = current;
  const run = handleChatCommand({ musicState, bus, logger });
  const replies = () => broadcasts.filter((b) => b.type === 'bot-reply').map((b) => [b.key, b.vars]);
  return { run, musicState, broadcasts, replies };
}

const tema = (title, requestedBy, requesterId = null) => ({ videoId: title.padEnd(11, 'x'), title, requestedBy, requesterId });

test('!cancion responde lo que suena y no repite la respuesta en rafaga', () => {
  const { run, replies } = setup({ current: tema('Despacito', 'ana') });
  run({ cmd: 'cancion', user: 'luis' });
  run({ cmd: 'cancion', user: 'pepe' });
  assert.deepEqual(replies(), [['nowPlaying', { title: 'Despacito', user: 'ana' }]]);
});

test('!cola lista las proximas tres', () => {
  const { run, replies } = setup({ queue: [tema('A', 'x'), tema('B', 'y'), tema('C', 'z'), tema('D', 'w')] });
  run({ cmd: 'cola', user: 'luis' });
  assert.deepEqual(replies(), [['queue', { count: 4, list: '1. A, 2. B, 3. C' }]]);
});

test('!quitar borra solo el ultimo pedido de quien lo escribe', () => {
  const { run, musicState, replies } = setup({ queue: [tema('A', 'Ana', 'u1'), tema('B', 'luis'), tema('C', 'ana', 'u1')] });
  run({ cmd: 'quitar', user: 'Ana', userId: 'u1' });
  assert.deepEqual(musicState.queue.map((t) => t.title), ['A', 'B']);
  run({ cmd: 'quitar', user: 'pepe', userId: 'u9' });
  assert.deepEqual(musicState.queue.map((t) => t.title), ['A', 'B']);
  assert.deepEqual(replies(), [['removed', { title: 'C', user: 'Ana' }]]);
});

test('!skip: quien pidio la cancion la salta al instante', () => {
  const { run, musicState, broadcasts } = setup({ current: tema('Mala', 'ana', 'u1'), queue: [tema('Buena', 'luis')] });
  run({ cmd: 'skip', user: 'ana', userId: 'u1' });
  assert.equal(musicState.currentTrack.title, 'Buena');
  assert.ok(broadcasts.some((b) => b.type === 'music-skip'));
});

test('!skip: votacion con votos unicos; banneados no votan', () => {
  const { run, musicState, replies } = setup({ skipVotes: 3, current: tema('Mala', 'ana', 'u1'), queue: [tema('Buena', 'luis')] });
  run({ cmd: 'skip', user: 'b', userId: 'u2' });
  run({ cmd: 'skip', user: 'b', userId: 'u2' });
  run({ cmd: 'skip', user: 'troll' });
  run({ cmd: 'skip', user: 'c', userId: 'u3' });
  assert.equal(musicState.currentTrack.title, 'Mala');
  run({ cmd: 'skip', user: 'd', userId: 'u4' });
  assert.equal(musicState.currentTrack.title, 'Buena');
  assert.deepEqual(replies(), [
    ['skipVote', { count: 1, needed: 3 }],
    ['skipVote', { count: 2, needed: 3 }],
    ['skipped', { title: 'Mala' }],
  ]);
});

test('!skip con 0 votos configurados: solo quien la pidio', () => {
  const { run, musicState, replies } = setup({ skipVotes: 0, current: tema('Mala', 'ana', 'u1') });
  run({ cmd: 'skip', user: 'b', userId: 'u2' });
  assert.equal(musicState.currentTrack.title, 'Mala');
  assert.deepEqual(replies(), []);
});
