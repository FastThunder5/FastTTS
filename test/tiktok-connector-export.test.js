'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setupTikTokConnection } = require('../features/canales/tiktok/connect-tiktok-channel');

function crearDeps() {
  const emitidos = [];
  const deps = {
    state: { tiktokChannels: new Map() },
    bus: { emit: (tipo, payload) => emitidos.push({ tipo, payload }) },
    logger: { log() {} },
  };
  return { deps, emitidos };
}

// Los eventos entran por processDecodedData de tiktok-live-connector con la
// forma del proto v3, tal como llegan del WebSocket de TikTok.
async function inyectar(conn, type, data) {
  await conn.processDecodedData({ type, data });
}

const user = { id: '7001', displayId: 'bettlebum', nickname: 'Bettlebum' };
const common = { msgId: '7555', createTime: '1759700000000' };

test('chat de TikTok (proto v3, campo content) llega con comment y usuario', async () => {
  const { deps, emitidos } = crearDeps();
  const conn = setupTikTokConnection(deps, 'fastthunder');
  await inyectar(conn, 'WebcastChatMessage', { common, user, content: 'Holaaa' });
  const ev = emitidos.find((e) => e.tipo === 'canal:mensaje-crudo');
  assert.ok(ev, 'no se emitio el mensaje de chat');
  assert.equal(ev.payload.raw.comment, 'Holaaa');
  assert.equal(ev.payload.raw.uniqueId, 'bettlebum');
  assert.equal(ev.payload.raw.nickname, 'Bettlebum');
  assert.equal(ev.payload.raw.msgId, '7555');
});

test('like de TikTok cuenta los likes del paquete (count), no 1', async () => {
  const { deps, emitidos } = crearDeps();
  const conn = setupTikTokConnection(deps, 'fastthunder');
  await inyectar(conn, 'WebcastLikeMessage', { common, user, count: 15, total: '434' });
  const ev = emitidos.find((e) => e.tipo === 'canal:like');
  assert.equal(ev.payload.likeCount, 15);
  assert.equal(ev.payload.userId, 'bettlebum');
});

test('regalo de TikTok trae nombre, diamantes y cantidad del combo', async () => {
  const { deps, emitidos } = crearDeps();
  const conn = setupTikTokConnection(deps, 'fastthunder');
  const gift = { id: '5655', name: 'Rose', diamondCount: 1, type: 1, image: { urlList: ['https://x/rose.png'] } };
  // combo en curso: se ignora
  await inyectar(conn, 'WebcastGiftMessage', { common, user, giftId: '5655', gift, repeatCount: 3, repeatEnd: 0 });
  assert.equal(emitidos.filter((e) => e.tipo === 'canal:gift').length, 0);
  await inyectar(conn, 'WebcastGiftMessage', { common, user, giftId: '5655', gift, repeatCount: 5, repeatEnd: 1 });
  const ev = emitidos.find((e) => e.tipo === 'canal:gift');
  assert.equal(ev.payload.raw.giftName, 'Rose');
  assert.equal(ev.payload.raw.diamondCount, 1);
  assert.equal(ev.payload.raw.groupCount, 5);
  assert.equal(ev.payload.raw.giftPictureUrl, 'https://x/rose.png');
  assert.equal(ev.payload.raw.uniqueId, 'bettlebum');
});

test('follow y share de TikTok se detectan', async () => {
  const { deps, emitidos } = crearDeps();
  const conn = setupTikTokConnection(deps, 'fastthunder');
  await inyectar(conn, 'WebcastSocialMessage', { common: { ...common, displayText: { key: 'pm_main_follow_message_viewer_2' } }, user });
  await inyectar(conn, 'WebcastSocialMessage', { common: { ...common, displayText: { key: 'pm_mt_guidance_share' } }, user });
  assert.equal(emitidos.find((e) => e.tipo === 'canal:follow').payload.userId, 'bettlebum');
  const share = emitidos.find((e) => e.tipo === 'canal:evento-especial' && e.payload.kind === 'share');
  assert.equal(share.payload.nick, 'Bettlebum');
});
