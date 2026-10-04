'use strict';

// Contrato de performance tracing. Por defecto es un passthrough (no-op):
// simplemente ejecuta la función. Queda como punto de enganche por si algún
// día se quiere medir tiempos, sin que los dominios cambien.
//
//   const perf = require('../core/contracts/perf');
//   const info = await perf.span('musica.getinfo', { videoId }, () => engine.getInfo(id));

const perf = {
  span(name, attributes, fn) {
    return fn();
  },
};

module.exports = perf;
