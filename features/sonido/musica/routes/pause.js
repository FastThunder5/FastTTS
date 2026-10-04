'use strict';

// POST /api/music/pause { paused?: boolean } — pausa/reanuda el audio que
// reproduce overlay-musica.html (modo musicOverlayAudio). Sin `paused` alterna.
// El estado vive en el server para que panel y overlay vean lo mismo.
function pause(deps) {
  return (req, res) => {
    const { musicState, bus } = deps;
    const pedido = (req.body || {}).paused;
    musicState.paused = typeof pedido === 'boolean' ? pedido : !musicState.paused;
    bus.emit('ws:broadcast', { type: 'music-pause', paused: musicState.paused });
    res.json({ ok: true, paused: musicState.paused });
  };
}

module.exports = { pause };
