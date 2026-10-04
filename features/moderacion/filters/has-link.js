'use strict';

// TLDs que usan los bots de promocion. Se dejan fuera los que en el chat son
// palabras comunes pegadas tras un punto sin espacio ("bien.me voy",
// "listo.es broma", "ok.de nada") para no bloquear mensajes normales.
const TLDS = [
  'com', 'net', 'org', 'io', 'gg', 'tv', 'xyz', 'ly', 'shop', 'store', 'site',
  'online', 'top', 'ru', 'link', 'live', 'app', 'club', 'info', 'biz', 'pro',
  'vip', 'fun', 'click', 'cc', 'us',
];

const SCHEME_RE = /\b(?:https?:\/\/|www\.)\S/i;
const DOMAIN_RE = new RegExp(`(?:^|[^\\p{L}\\p{N}_-])[\\p{L}\\p{N}-]+\\.(?:${TLDS.join('|')})(?=$|[^\\p{L}\\p{N}_])`, 'iu');

/** true si el texto contiene un enlace (http://, www. o dominio.tld). */
function hasLink(text) {
  return SCHEME_RE.test(text) || DOMAIN_RE.test(text);
}

module.exports = { hasLink };
