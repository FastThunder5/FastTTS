/**
 * Espera por usuario del TTS: despues de leer un mensaje de alguien, sus
 * mensajes siguientes se muestran en el chat pero no se leen hasta que pasen
 * `esperaSeg` segundos. Asi un solo espectador no acapara la voz.
 * Puro (sin DOM): el estado vive en el objeto que devuelve crearEsperaPorUsuario().
 */

const MAX_USUARIOS = 2000;

export function crearEsperaPorUsuario() {
  const ultimo = new Map(); // nick en minusculas -> ms de la ultima lectura

  return {
    /** true = se puede leer (y queda marcado). false = sigue en espera. */
    puedeHablar(nick, esperaSeg, ahora = Date.now()) {
      if (!(esperaSeg > 0) || !nick) return true;
      const clave = String(nick).toLowerCase();
      const previo = ultimo.get(clave);
      if (previo !== undefined && ahora - previo < esperaSeg * 1000) return false;
      ultimo.delete(clave);
      ultimo.set(clave, ahora);
      // Poda por orden de insercion: el Map recuerda primero al mas viejo.
      if (ultimo.size > MAX_USUARIOS) ultimo.delete(ultimo.keys().next().value);
      return true;
    },
    limpiar() { ultimo.clear(); },
  };
}
