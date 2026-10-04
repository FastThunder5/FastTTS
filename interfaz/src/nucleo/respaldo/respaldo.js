/**
 * Formato del archivo de respaldo (exportar / importar configuracion). Puro:
 * sin DOM ni fetch, para poder testearlo. La vista que lo usa es
 * interfaz/src/vistas/principal/respaldo.js.
 */
export const RESPALDO_APP = 'FastTTS';
export const RESPALDO_VERSION = 1;

// Llaves de seguridad (el MCP no puede habilitarse a si mismo) y la playlist,
// que se restaura aparte por PUT /api/music/playlist para que se resuelva.
const CONFIG_EXCLUIDA = new Set(['mcpEnabled', 'mcpDestructiveToolsEnabled', 'mcpDevToolsEnabled', 'subscriptionsEnabled', 'streamerPlaylist']);

// Claves de localStorage de la app (ajustes, canales, clips, idioma...).
export const PREFIJO_LOCAL = 'tikliveTTS_';

export function configParaRespaldo(config) {
  const out = {};
  for (const [k, v] of Object.entries(config || {})) if (!CONFIG_EXCLUIDA.has(k)) out[k] = v;
  return out;
}

/** Solo espectadores con algo que conservar: castigo vigente o whitelist. */
export function moderacionParaRespaldo(viewers, ahora = Date.now()) {
  const vigente = (until) => until === -1 || (Number(until) > ahora);
  return (viewers || [])
    .filter((v) => v && v.key && (vigente(v.muteUntil) || vigente(v.banUntil) || v.isWhitelisted))
    .map((v) => ({
      key: v.key,
      nick: v.nick || null,
      muteUntil: vigente(v.muteUntil) ? v.muteUntil : 0,
      banUntil: vigente(v.banUntil) ? v.banUntil : 0,
      isWhitelisted: !!v.isWhitelisted,
    }));
}

/** Llamadas a la API de moderacion para restaurar un espectador. Expirados se saltan. */
export function accionesModeracion(entrada, ahora = Date.now()) {
  const acciones = [];
  const duracion = (until) => (until === -1 ? null : until - ahora);
  const base = { key: entrada.key, nick: entrada.nick || undefined };
  if (entrada.banUntil === -1 || entrada.banUntil > ahora) acciones.push(['/api/moderation/ban', { ...base, durationMs: duracion(entrada.banUntil) }]);
  if (entrada.muteUntil === -1 || entrada.muteUntil > ahora) acciones.push(['/api/moderation/mute', { ...base, durationMs: duracion(entrada.muteUntil) }]);
  if (entrada.isWhitelisted) acciones.push(['/api/moderation/follower', { ...base, value: true }]);
  return acciones;
}

/** Devuelve el respaldo si el JSON es de esta app, o lanza Error('invalid'). */
export function validarRespaldo(datos) {
  if (!datos || typeof datos !== 'object' || datos.app !== RESPALDO_APP || typeof datos.version !== 'number') {
    throw new Error('invalid');
  }
  if (datos.version > RESPALDO_VERSION) throw new Error('newer');
  return datos;
}
