'use strict';

// Contrato consumido por varios dominios para decidir si una funcion esta
// desbloqueada. En el upstream original esto gateaba funciones "Pro" detras
// de un sistema de suscripciones de pago (features/auth/, eliminado en este
// fork). Aca queda como un siempre-desbloqueado: todas las funciones estan
// disponibles para todos, sin excepcion.

function provide(_fn) {
  // No-op a proposito: este fork no registra ningun proveedor de gating.
}

function check(_featureId) {
  return true;
}

function guard(_featureId) {
  return (_req, _res, next) => next();
}

module.exports = { provide, check, guard };
