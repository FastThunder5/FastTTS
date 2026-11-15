'use strict';

const { creditsToJSON } = require('../state/credits');
const { totalViewerCount } = require('../state/total-viewer-count');

function overlayStats(state) {
  return (_req, res) => {
    const topLikers = [...state.topLikers.values()].sort((a, b) => b.totalLikes - a.totalLikes).slice(0, 10);
    res.json({
      followCount: state.followCount,
      baseFollowerCount: state.baseFollowerCount,
      viewerCount: totalViewerCount(state.viewerCountByChannel),
      topLikers,
      sharers: creditsToJSON(state.credits).sharers.slice(-20),
      credits: creditsToJSON(state.credits),
    });
  };
}

module.exports = { overlayStats };
