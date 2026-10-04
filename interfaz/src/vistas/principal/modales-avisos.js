import { appSettings } from '../../nucleo/estado/ajustes-app.js';
import { allowedExtraLangs, setAllowedExtraLang as setAllowedExtraLangRemoto } from '../../nucleo/estado/config-runtime.js';
import { t } from '../../nucleo/i18n/i18n.js';
import { switchView } from './vistas-router.js';
import { driverTourDefaults } from './tours/index.js';
import { spCancelCapture, spResetDeleteBtn } from './soundpad.js';

export function setStatus(type, text) {
  const dot = document.getElementById('statusDot');
  const label = document.getElementById('statusText');
  if (!dot || !label) return;
  dot.className = 'status-dot' + (type ? ` ${type}` : '');
  label.className = 'status-text' + (type ? ` ${type}` : '');
  label.textContent = text;
}

// Palabra conectora hablada entre el nombre de usuario y el comentario
// (ej: "Usuario dice: comentario"). Independiente de VOICE_TO_DICT_LANG_UI:
// aca si cubrimos ja/zh-CN/ru/ko porque es una palabra hablada, no un
// filtro de alfabeto.
const SAY_USERNAME_CONNECTOR_WORD = {
  'es-MX': 'dice:', en: 'says:', 'en-GB': 'says:', pt: 'diz:', 'pt-PT': 'diz:',
  fr: 'dit:', de: 'sagt:', it: 'dice:', ja: 'さん:', 'zh-CN': '说:', ru: 'говорит:', ko: '님:',
};
const DEFAULT_CONNECTOR_WORD = 'says:';

export function getSayUsernameConnector() {
  if (!appSettings.sayUsernameConnector) return null;
  return SAY_USERNAME_CONNECTOR_WORD[appSettings.voice] || DEFAULT_CONNECTOR_WORD;
}

// Modal "Idiomas permitidos" (filtro por diccionario de palabras). Espejo
// del VOICE_TO_DICT_LANG del servidor: voces ru/ja/zh/ko no aplican.
const VOICE_TO_DICT_LANG_UI = {
  'es-MX': 'es', en: 'en', 'en-GB': 'en', pt: 'pt', 'pt-PT': 'pt', fr: 'fr', de: 'de', it: 'it',
};
const DICT_LANG_NAMES = { es: 'Español', en: 'English', pt: 'Português', fr: 'Français', de: 'Deutsch', it: 'Italiano' };

export function openDictLangModal() {
  renderDictLangModal();
  document.getElementById('dictLangModal').classList.add('show');
}
export function closeDictLangModal(e) {
  if (e && e.target.id !== 'dictLangModal') return;
  document.getElementById('dictLangModal').classList.remove('show');
}

function renderDictLangModal() {
  const voiceLang = VOICE_TO_DICT_LANG_UI[appSettings.voice] || null;
  const list = document.getElementById('dictLangList');
  const na = document.getElementById('dictLangNA');
  list.innerHTML = '';
  na.style.display = voiceLang ? 'none' : 'block';
  if (!voiceLang) return;
  for (const lang of Object.keys(DICT_LANG_NAMES)) {
    const isVoice = lang === voiceLang;
    const label = document.createElement('label');
    label.style.cssText = 'display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;background:rgba(255,255,255,0.05);cursor:pointer;margin-bottom:6px;font-size:14px;' + (isVoice ? 'opacity:0.6;cursor:default;' : '');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = isVoice || allowedExtraLangs.includes(lang);
    cb.disabled = isVoice;
    if (!isVoice) cb.onchange = () => setAllowedExtraLang(lang, cb.checked);
    const span = document.createElement('span');
    span.textContent = DICT_LANG_NAMES[lang] + (isVoice ? ' ' + t('dictLang.voiceAlways') : '');
    label.append(cb, span);
    list.appendChild(label);
  }
}

// allowedExtraLangs ya no pasa por appSettings/localStorage (fase-05):
// config-runtime.js es el unico dueño, ver nucleo/estado/config-runtime.js.
function setAllowedExtraLang(lang, enabled) {
  setAllowedExtraLangRemoto(lang, enabled);
}

// ─── Onboarding: tutorial guiado para usuarios que nunca usaron la app ──
export function closeOnboardingWelcome(e) {
  if (e && e.target.id !== 'onboardingWelcomeModal') return;
  document.getElementById('onboardingWelcomeModal').classList.remove('show');
  maybeShowBugReportNotice();
}

function fireConfetti() {
  if (!window.confetti) return;
  const duration = 1800;
  const end = Date.now() + duration;
  (function frame() {
    window.confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors: ['#2F8CFF', '#00c573', '#F2F2F2'] });
    window.confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors: ['#2F8CFF', '#00c573', '#F2F2F2'] });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  window.confetti({ particleCount: 90, spread: 100, origin: { y: 0.4 }, colors: ['#2F8CFF', '#00c573', '#F2F2F2'] });
}

function showOnboardingComplete() {
  document.getElementById('onboardingCompleteModal').classList.add('show');
  fireConfetti();
}

export function closeOnboardingComplete(e) {
  if (e && e.target.id !== 'onboardingCompleteModal') return;
  document.getElementById('onboardingCompleteModal').classList.remove('show');
  maybeShowBugReportNotice();
}

export function startOnboardingTour() {
  document.getElementById('onboardingWelcomeModal').classList.remove('show');
  if (!(window.driver && window.driver.js)) { maybeShowDonationNotice(); return; }

  const openChannelForm = () => {
    switchView('settings');
    const form = document.getElementById('add-channel-form');
    if (form) form.style.display = 'flex';
  };

  window.driver.js.driver({
    ...driverTourDefaults(),
    onDestroyStarted: (element, step, opts) => {
      opts.driver.destroy();
      showOnboardingComplete();
    },
    steps: [
      { element: '#navSettingsBtn', popover: { title: t('onboarding.step1Title'), description: t('onboarding.step1Desc'), side: 'right', align: 'start' }, onHighlightStarted: () => switchView('settings') },
      { element: '#btn-toggle-add-channel', popover: { title: t('onboarding.step2Title'), description: t('onboarding.step2Desc'), side: 'bottom', align: 'end' }, onHighlightStarted: () => switchView('settings') },
      { element: '#platform-seg', popover: { title: t('onboarding.step3Title'), description: t('onboarding.step3Desc'), side: 'bottom', align: 'start' }, onHighlightStarted: openChannelForm },
      { element: '#add-channel-input', popover: { title: t('onboarding.step4Title'), description: t('onboarding.step4Desc'), side: 'bottom', align: 'start' }, onHighlightStarted: openChannelForm },
      { element: '#btn-add-channel', popover: { title: t('onboarding.step5Title'), description: t('onboarding.step5Desc'), side: 'bottom', align: 'start' }, onHighlightStarted: openChannelForm },
      { element: '#btn-connect-all-chat', popover: { title: t('onboarding.step6Title'), description: t('onboarding.step6Desc'), side: 'top', align: 'end' }, onHighlightStarted: () => switchView('chat') },
    ],
  }).drive();
}

// Aviso one-time: bienvenida y tutorial guiado (v1.6.0)
const ONBOARDING_KEY = 'tikliveTTS_onboardingSeen_v1';
function maybeShowOnboarding() {
  if (localStorage.getItem(ONBOARDING_KEY)) { maybeShowDonationNotice(); return; }
  localStorage.setItem(ONBOARDING_KEY, '1');
  setTimeout(() => document.getElementById('onboardingWelcomeModal').classList.add('show'), 900);
}

// Avisos de donacion / reporte de bug eliminados en este fork: no-ops para
// que la cadena de onboarding no cambie.
function maybeShowDonationNotice() {}
function maybeShowBugReportNotice() {}

// Onboarding + cadena de avisos (donacion/bug). Lo dispara index.js recien
// cuando la app deja de estar bloqueada por el muro de login — no en la
// pantalla de login. Idempotente: corre una sola vez.
let _avisosArrancados = false;
export function arrancarAvisosOnboarding() {
  if (_avisosArrancados) return;
  _avisosArrancados = true;
  // Espera a que el idioma este definido para que todo aparezca traducido.
  Promise.resolve(window.__langReady).then(maybeShowOnboarding);
}

export function iniciarModalesYAvisos() {
  // Sin muro de login en este fork: el onboarding arranca directo, como
  // siempre, en vez de esperar a que index.js lo dispare tras un login.
  arrancarAvisosOnboarding();
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.getElementById('dictLangModal').classList.remove('show');
      document.getElementById('onboardingWelcomeModal').classList.remove('show');
      document.getElementById('onboardingCompleteModal').classList.remove('show');
      document.getElementById('modWipeConfirmModal').classList.remove('show');
      spCancelCapture();
      spResetDeleteBtn();
      document.getElementById('spSettingsModal').classList.remove('show');
    }
  });
}
