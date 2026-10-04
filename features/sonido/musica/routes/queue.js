'use strict';

function queue(musicState) {
  return (_req, res) => {
    res.json({ current: musicState.currentTrack, queue: musicState.queue, playlistActive: musicState.playlistActive, paused: !!musicState.paused });
  };
}

module.exports = { queue };
