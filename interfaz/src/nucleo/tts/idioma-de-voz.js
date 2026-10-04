// Idioma Google equivalente de un id de voz. Las voces de Microsoft Edge
// ('edge:es-AR-ElenaNeural') se guardan en config.ttsVoiceLang como su
// idioma base ('es-MX'), que es lo que entienden los filtros de idioma, los
// avisos del sistema y la voz de respaldo. Espejo del campo `lang` de
// features/sonido/tts/edge-voices.js (lo verifica test/tts-edge.test.js).
export function idiomaDeVoz(id) {
  if (typeof id !== 'string' || !id.startsWith('edge:')) return id;
  const [lang, region] = id.slice('edge:'.length).split('-');
  if (lang === 'es') return 'es-MX';
  if (lang === 'en') return region === 'GB' ? 'en-GB' : 'en';
  if (lang === 'pt') return region === 'PT' ? 'pt-PT' : 'pt';
  if (lang === 'zh') return 'zh-CN';
  return lang;
}
