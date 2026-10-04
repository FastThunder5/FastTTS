'use strict';

const DEFAULT_CONFIG = {
  LIKE_DEBOUNCE_MS: 1500,
  TTS_MAX_CHARS: 500,
  rateLimitEnabled: false,
  TTS_RATE_LIMIT_MAX: 10,
  TTS_RATE_WINDOW_MS: 5000,
  MAX_QUEUE_MSG: 15,
  musicEnabled: true,
  musicUserCooldownMs: 60000,
  musicMaxQueue: 10,
  musicBannedUsers: [],
  musicVolume: 0.5,
  // true = el audio de musica se reproduce SOLO en /overlay-musica.html
  // (fuente aparte para OBS), no en el panel principal. Default false para
  // no romper a nadie que ya use la app tal cual (el panel sigue sonando).
  musicOverlayAudio: false,
  streamerPlaylist: [],
  playlistShuffle: false,
  playlistEnabled: false,
  langFilterEnabled: false,
  dictFilterEnabled: false,
  allowedExtraLangs: [],
  ttsVoiceLang: 'es-MX',
  a11yReduceMotion: false,
  a11yUiFontScale: 1,
  a11yHighContrast: false,
  ttsSlowSpeech: false,
  // Plantillas propias de avisos ({usuario}, {regalo}, ...) por evento; vacio = texto estandar.
  announceTemplates: {},
  // true = el TTS lee a todo el mundo (comportamiento historico).
  // false = solo lee a seguidores y a la whitelist manual.
  ttsReadNonFollowers: true,
  // Servidor MCP (agentes). Endpoint solo-localhost; las tools destructivas
  // van detras de su propio toggle + prompt del host del agente.
  mcpEnabled: true,
  mcpDestructiveToolsEnabled: false,
  // Tools MCP de desarrollo (dev_*): inyectar chat/eventos, ver logs crudos,
  // status completo, bus emit. Solo para debug — default off.
  mcpDevToolsEnabled: false,
  // Cuentas con inmunidad a bans/mutes y que se saltan los filtros del chat.
  // Vacio por defecto: agrega aqui tus propias cuentas si lo necesitas.
  // (Sistema de suscripciones de pago del upstream eliminado en este fork:
  // la app es gratis y sin bloqueos, sin excepcion.)
  adminIdentities: {
    tiktok: [],
    twitch: [],
    youtube: [],
    kick: [],
  },
};

module.exports = { DEFAULT_CONFIG };
