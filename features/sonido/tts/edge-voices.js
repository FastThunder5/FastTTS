'use strict';

// Voces neuronales de Microsoft Edge ("Leer en voz alta"). Gratis y sin API
// key, mucho mas naturales que Google Translate. El id lleva prefijo `edge:`
// para no chocar con los ids de Google (es-MX, en, ...).
//
// `lang` es el idioma Google equivalente: es lo que se guarda en
// config.ttsVoiceLang (filtros de idioma, avisos del sistema) y la voz de
// respaldo si Edge falla. Lista curada a mano (no se baja de Microsoft) para
// que el selector funcione aunque su endpoint de listado cambie.

const EDGE_PREFIX = 'edge:';

const EDGE_VOICES_RAW = [
  // Español
  ['es-MX-DaliaNeural', 'Dalia — México', 'MX', 'es-MX'],
  ['es-MX-JorgeNeural', 'Jorge — México', 'MX', 'es-MX'],
  ['es-ES-ElviraNeural', 'Elvira — España', 'ES', 'es-MX'],
  ['es-ES-AlvaroNeural', 'Álvaro — España', 'ES', 'es-MX'],
  ['es-AR-ElenaNeural', 'Elena — Argentina', 'AR', 'es-MX'],
  ['es-AR-TomasNeural', 'Tomás — Argentina', 'AR', 'es-MX'],
  ['es-CO-SalomeNeural', 'Salomé — Colombia', 'CO', 'es-MX'],
  ['es-CO-GonzaloNeural', 'Gonzalo — Colombia', 'CO', 'es-MX'],
  ['es-CL-CatalinaNeural', 'Catalina — Chile', 'CL', 'es-MX'],
  ['es-CL-LorenzoNeural', 'Lorenzo — Chile', 'CL', 'es-MX'],
  ['es-PE-CamilaNeural', 'Camila — Perú', 'PE', 'es-MX'],
  ['es-PE-AlexNeural', 'Alex — Perú', 'PE', 'es-MX'],
  ['es-US-PalomaNeural', 'Paloma — EE. UU.', 'US', 'es-MX'],
  ['es-US-AlonsoNeural', 'Alonso — EE. UU.', 'US', 'es-MX'],
  // Otros idiomas
  ['en-US-AvaMultilingualNeural', 'Ava — English (USA)', 'US', 'en'],
  ['en-US-AndrewMultilingualNeural', 'Andrew — English (USA)', 'US', 'en'],
  ['en-US-JennyNeural', 'Jenny — English (USA)', 'US', 'en'],
  ['en-US-GuyNeural', 'Guy — English (USA)', 'US', 'en'],
  ['en-GB-SoniaNeural', 'Sonia — English (UK)', 'GB', 'en-GB'],
  ['en-GB-RyanNeural', 'Ryan — English (UK)', 'GB', 'en-GB'],
  ['pt-BR-FranciscaNeural', 'Francisca — Português (Brasil)', 'BR', 'pt'],
  ['pt-BR-AntonioNeural', 'Antônio — Português (Brasil)', 'BR', 'pt'],
  ['pt-PT-RaquelNeural', 'Raquel — Português (Portugal)', 'PT', 'pt-PT'],
  ['pt-PT-DuarteNeural', 'Duarte — Português (Portugal)', 'PT', 'pt-PT'],
  ['fr-FR-DeniseNeural', 'Denise — Français', 'FR', 'fr'],
  ['fr-FR-HenriNeural', 'Henri — Français', 'FR', 'fr'],
  ['de-DE-KatjaNeural', 'Katja — Deutsch', 'DE', 'de'],
  ['de-DE-ConradNeural', 'Conrad — Deutsch', 'DE', 'de'],
  ['it-IT-ElsaNeural', 'Elsa — Italiano', 'IT', 'it'],
  ['it-IT-DiegoNeural', 'Diego — Italiano', 'IT', 'it'],
  ['ja-JP-NanamiNeural', 'Nanami — 日本語', 'JP', 'ja'],
  ['ja-JP-KeitaNeural', 'Keita — 日本語', 'JP', 'ja'],
  ['zh-CN-XiaoxiaoNeural', 'Xiaoxiao — 中文', 'CN', 'zh-CN'],
  ['zh-CN-YunxiNeural', 'Yunxi — 中文', 'CN', 'zh-CN'],
  ['ru-RU-SvetlanaNeural', 'Svetlana — Русский', 'RU', 'ru'],
  ['ru-RU-DmitryNeural', 'Dmitry — Русский', 'RU', 'ru'],
  ['ko-KR-SunHiNeural', 'SunHi — 한국어', 'KR', 'ko'],
  ['ko-KR-InJoonNeural', 'InJoon — 한국어', 'KR', 'ko'],
];

const EDGE_VOICES = EDGE_VOICES_RAW.map(([name, label, flag, lang]) => ({
  id: EDGE_PREFIX + name,
  name: label,
  flag,
  lang,
  engine: 'edge',
}));

const EDGE_BY_ID = new Map(EDGE_VOICES.map((v) => [v.id, v]));

function isEdgeVoice(id) {
  return typeof id === 'string' && EDGE_BY_ID.has(id);
}

/** 'edge:es-MX-DaliaNeural' -> 'es-MX-DaliaNeural' (o null si no es de Edge). */
function edgeVoiceName(id) {
  return isEdgeVoice(id) ? id.slice(EDGE_PREFIX.length) : null;
}

/** Idioma Google equivalente de cualquier id de voz (Edge o Google). */
function baseLangOfVoice(id) {
  const edge = EDGE_BY_ID.get(id);
  return edge ? edge.lang : id;
}

module.exports = { EDGE_VOICES, EDGE_PREFIX, isEdgeVoice, edgeVoiceName, baseLangOfVoice };
