import { t, tErr } from '../../nucleo/i18n/i18n.js';
import { applyPronunciacionConfig } from '../../nucleo/estado/config-runtime.js';
import { parsearLineas } from '../../nucleo/tts/pronunciacion.js';
import { buscarVoz } from '../../nucleo/tts/voz-por-usuario.js';
import { getAvailableVoices } from './voces.js';
import { showToast } from '../../componentes/toast.js';

async function guardar(patch, okKey = 'toast.pronunciationSaved') {
  try {
    const res = await fetch('/api/config', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || (data.rejected && data.rejected.length)) throw new Error(tErr(data, 'adv.configRejected'));
    applyPronunciacionConfig(patch);
    showToast(t(okKey));
  } catch (e) {
    showToast(e.message || t('adv.errorLoadConfig'));
  }
}

/** Los dos textareas guardan solos al salir del campo, como el resto de Configuracion TTS. */
export function iniciarAjustesPronunciacion() {
  document.getElementById('ttsPronunciationsInput')?.addEventListener('change', (e) => {
    guardar({ ttsPronunciations: parsearLineas(e.target.value) });
  });
  document.getElementById('ttsNickAliasesInput')?.addEventListener('change', (e) => {
    const alias = parsearLineas(e.target.value);
    for (const k of Object.keys(alias)) if (!alias[k]) delete alias[k];
    guardar({ ttsNickAliases: alias });
  });
  document.getElementById('ttsUserVoicesInput')?.addEventListener('change', (e) => {
    const voces = parsearLineas(e.target.value);
    for (const k of Object.keys(voces)) if (!voces[k]) delete voces[k];
    const desconocidas = Object.values(voces).filter((v) => !buscarVoz(v, getAvailableVoices()));
    if (desconocidas.length) {
      showToast(t('toast.unknownVoices', { voices: [...new Set(desconocidas)].join(', ') }));
      return;
    }
    guardar({ ttsUserVoices: voces }, 'toast.userVoicesSaved');
  });
  document.getElementById('ttsUserCooldownInput')?.addEventListener('change', (e) => {
    const seg = Math.min(600, Math.max(0, Math.round(Number(e.target.value) || 0)));
    e.target.value = String(seg);
    guardar({ ttsUserCooldownSec: seg }, 'toast.userCooldownSaved');
  });
}

export function toggleRandomVoicePerUser(checkbox) {
  checkbox.closest('.toggle-chip')?.classList.toggle('active', checkbox.checked);
  guardar({ ttsRandomVoicePerUser: checkbox.checked }, 'toast.userVoicesSaved');
}

export function toggleCleanNicks(checkbox) {
  checkbox.closest('.toggle-chip')?.classList.toggle('active', checkbox.checked);
  guardar({ ttsCleanNicks: checkbox.checked });
}
