'use strict';

// tiktok-live-connector 2.x entrega los eventos con los objetos del proto v3
// (user anidado, `content` en vez de `comment`, `count` en vez de `likeCount`,
// datos del regalo dentro de `gift`). El resto de la app espera el formato
// plano de la 1.x: { uniqueId, nickname, comment, msgId, likeCount, giftName... }.
// Este archivo hace esa traduccion en un solo lugar. Si un campo ya viene
// plano (formato viejo), se respeta.

function userFields(data) {
  const u = (data && data.user) || {};
  return {
    uniqueId: u.displayId || u.uniqueId || data.uniqueId || undefined,
    nickname: u.nickname || data.nickname || undefined,
    userId: (u.id != null && String(u.id)) || u.idStr || data.userId || undefined,
  };
}

function commonFields(data) {
  const c = (data && data.common) || {};
  return {
    msgId: (c.msgId != null && String(c.msgId)) || data.msgId || undefined,
    createTime: (c.createTime != null && String(c.createTime)) || data.createTime || undefined,
  };
}

function normalizeChat(data) {
  return {
    ...userFields(data),
    ...commonFields(data),
    comment: String(data.content ?? data.comment ?? ''),
  };
}

function normalizeLike(data) {
  return {
    ...userFields(data),
    likeCount: Number(data.count ?? data.likeCount) || 1,
    totalLikeCount: Number(data.total ?? data.totalLikeCount) || null,
  };
}

function normalizeGift(data) {
  const g = data.gift || {};
  const image = g.image && Array.isArray(g.image.urlList) ? g.image.urlList[0] : null;
  return {
    ...userFields(data),
    ...commonFields(data),
    giftId: Number(g.id ?? data.giftId) || data.giftId,
    giftName: g.name || data.giftName || '',
    diamondCount: Number(g.diamondCount ?? data.diamondCount) || 0,
    giftType: Number(g.type ?? data.giftType) || 0,
    giftPictureUrl: image || data.giftPictureUrl || null,
    repeatEnd: !!data.repeatEnd,
    // Cantidad del combo: en el proto v3 es repeatCount (groupCount casi siempre 1).
    groupCount: Number(data.repeatCount) || Number(data.groupCount) || 1,
  };
}

/** Datos de usuario para member/follow/share. */
function normalizeUserEvent(data) {
  return userFields(data || {});
}

module.exports = { normalizeChat, normalizeLike, normalizeGift, normalizeUserEvent };
