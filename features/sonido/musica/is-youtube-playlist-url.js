'use strict';

// True si el string es una URL de playlist de YouTube que hay que expandir
// (playlist?list=... o cualquier URL con ?list= SIN un ?v= puntual). Un
// enlace watch?v=XXX&list=YYY se trata como video suelto, no como playlist.
//
// Excepcion: los "Mix" de YouTube (list=RD...) SIEMPRE llevan v= (el video
// semilla) y son la playlist en si: watch?v=XXX&list=RDXXX&start_radio=1.
// Esos se expanden aunque traigan v=, si no solo sonaria la primera cancion.
function isYoutubeMixUrl(str) {
  return /[?&]list=RD[A-Za-z0-9_-]+/.test(str);
}

function isYoutubePlaylistUrl(str) {
  if (typeof str !== 'string') return false;
  if (!/youtube\.com|youtu\.be/i.test(str)) return false;
  if (isYoutubeMixUrl(str)) return true;
  if (/[?&]v=[A-Za-z0-9_-]{11}/.test(str)) return false;
  return /[?&]list=[A-Za-z0-9_-]+/.test(str) || /\/playlist\b/i.test(str);
}

module.exports = { isYoutubePlaylistUrl, isYoutubeMixUrl };
