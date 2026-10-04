'use strict';

const { getConfigSnapshot } = require('../../config-bridge');

function configGet(bus) {
  return (_req, res) => {
    const config = getConfigSnapshot(bus);
    res.json({
      musicEnabled: config.musicEnabled,
      musicUserCooldownMs: config.musicUserCooldownMs,
      musicMaxQueue: config.musicMaxQueue,
      musicSkipVotes: config.musicSkipVotes,
      musicBannedUsers: config.musicBannedUsers,
      musicVolume: config.musicVolume,
      musicOverlayAudio: config.musicOverlayAudio,
      playlistEnabled: config.playlistEnabled,
      playlistShuffle: config.playlistShuffle,
    });
  };
}

module.exports = { configGet };
