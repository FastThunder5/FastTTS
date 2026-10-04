'use strict';

const { sweepOldSessionLogs } = require('./retention-sweep');
const { attachErrorListeners } = require('./error-listeners');

module.exports = {
  name: 'reporte-bug',

  register({ bus, logger }) {
    sweepOldSessionLogs(logger);
    attachErrorListeners(bus, logger);

    return { rutas: 0, listeners: 2 };
  },
};
