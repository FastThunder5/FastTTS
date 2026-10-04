'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isYoutubePlaylistUrl } = require('../features/sonido/musica/is-youtube-playlist-url');

test('Mix de YouTube (watch?v=...&list=RD...) se expande como playlist', () => {
  assert.equal(isYoutubePlaylistUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ&start_radio=1'), true);
  assert.equal(isYoutubePlaylistUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDMM'), true);
  assert.equal(isYoutubePlaylistUrl('https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=RDAMVMdQw4w9WgXcQ'), true);
});

test('comportamiento previo intacto: playlist normal sin v= se expande', () => {
  assert.equal(isYoutubePlaylistUrl('https://www.youtube.com/playlist?list=PLabc123'), true);
});

test('comportamiento previo intacto: video con list= normal (PL) sigue siendo video suelto', () => {
  assert.equal(isYoutubePlaylistUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLabc123'), false);
});

test('video suelto y texto no son playlist', () => {
  assert.equal(isYoutubePlaylistUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), false);
  assert.equal(isYoutubePlaylistUrl('mi cancion favorita'), false);
});
