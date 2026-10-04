import { t, tErr } from '../../nucleo/i18n/i18n.js';
import { applyPronunciacionConfig } from '../../nucleo/estado/config-runtime.js';
import { parsearLineas } from '../../nucleo/tts/pronunciacion.js';
import { showToast } from '../../componentes/toast.js';

async function guardar(patch) {
  try {
    const res = await fetch('/api/config', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || (data.rejected && data.rejected.length)) throw new Error(tErr(data, 'adv.configRejected'));
    applyPronunciacionConfig(patch);
    showToast(t('toast.pronunciationSaved'));
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
}

export function toggleCleanNicks(checkbox) {
  checkbox.closest('.toggle-chip')?.classList.toggle('active', checkbox.checked);
  guardar({ ttsCleanNicks: checkbox.checked });
}
