'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { WebSocketServer } = require('ws');

const kickDir = path.join(__dirname, '..', 'features', 'canales', 'kick');

function stubModule(file, exportsObj) {
  const id = require.resolve(path.join(kickDir, file));
  require.cache[id] = { id, filename: id, loaded: true, exports: exportsObj };
}

test('Kick: conecta por Centrifugo, responde pings y emite mensajes sin duplicar', async () => {
  const wss = new WebSocketServer({ port: 0 });
  const port = wss.address().port;
  const received = [];

  wss.on('connection', (sock) => {
    sock.on('message', (buf) => {
      const msg = JSON.parse(buf.toString());
      received.push(msg);
      if (msg.connect) {
        assert.equal(msg.connect.token, 'tok-1');
        sock.send(JSON.stringify({ id: 1, connect: { client: 'c', ttl: 2700, expires: true } }));
      } else if (msg.subscribe) {
        assert.equal(msg.subscribe.channel, 'chatrooms.42.v2');
        const chat = { push: { channel: 'chatrooms.42.v2', pub: { data: {
          event: 'App\\Events\\ChatMessageEvent',
          data: JSON.stringify({ id: 'm1', content: 'hola', sender: { id: 7, username: 'pepe' } }),
        } } } };
        // Respuesta + ping + el mismo mensaje dos veces en un solo frame WS.
        sock.send([JSON.stringify({ id: 2, subscribe: {} }), '{}', JSON.stringify(chat), JSON.stringify(chat)].join('\n'));
      }
    });
  });

  stubModule('fetch-chatroom.js', { fetchKickChatroom: async () => ({ chatroomId: 42, channelId: 99, isLive: true }) });
  stubModule('fetch-realtime-session.js', {
    fetchKickRealtimeSession: async (channelId) => {
      assert.equal(channelId, 99);
      return { url: `ws://127.0.0.1:${port}`, clientId: 'cid', token: 'tok-1' };
    },
    fetchKickGuestToken: async () => 'tok-2',
  });
  const { connectKick, disconnectKick } = require(path.join(kickDir, 'connect-kick.js'));

  const events = [];
  const state = {
    kickChannels: new Map(), kickReconnectTimers: new Map(), kickWatchdogTimers: new Map(), kickSeenIds: new Map(),
  };
  const deps = {
    state,
    bus: { emit: (name, payload) => events.push({ name, payload }) },
    logger: { log: () => {} },
  };

  const slug = await connectKick(deps, 'https://kick.com/Canal');
  await new Promise((r) => setTimeout(r, 100));

  try {
    assert.equal(slug, 'canal');
    assert.ok(state.kickChannels.has('canal'));
    assert.ok(events.some((e) => e.name === 'canal:estado' && e.payload.state === 'conectado'));
    const chats = events.filter((e) => e.name === 'canal:mensaje-crudo');
    assert.equal(chats.length, 1);
    assert.equal(chats[0].payload.raw.content, 'hola');
    assert.equal(chats[0].payload.raw.username, 'pepe');
    assert.ok(received.some((m) => Object.keys(m).length === 0), 'debe contestar el ping con {}');
  } finally {
    disconnectKick(deps, 'canal');
    await new Promise((r) => wss.close(r));
  }
});
