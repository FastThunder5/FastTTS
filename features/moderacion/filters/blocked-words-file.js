'use strict';

const fs = require('fs');
const path = require('path');
const { RESOURCE_BASE } = require('../../../core/paths');
const { accountDataPath } = require('../../../core/account-data-path');
const { atomicWriteFileSync } = require('../../../core/atomic-write');
const { invalidateBlockedMatchers } = require('./blocked-matchers');

const DEFAULT_BLOCKED_WORDS_FILE = path.join(RESOURCE_BASE, 'blocked-words.md');
function blockedWordsFile() { return accountDataPath('blocked-words.md'); }

// Palabras que se suman una sola vez a listas ya existentes (la copia del
// default solo ocurre cuando la cuenta no tiene archivo). La marca evita
// re-agregarlas si el usuario despues las borra a mano.
const SEED_VERSION = 1;
const SEED_WORDS = ['viewers', 'followers', 'promo', 'cheap', 'ai'];
function seedMarkerFile() { return accountDataPath('blocked-words-seed.json'); }

function applySeedWords(state, logger) {
  const marker = seedMarkerFile();
  let version = 0;
  try { version = JSON.parse(fs.readFileSync(marker, 'utf-8')).version || 0; } catch { /* sin marca: nunca se sembro */ }
  if (version >= SEED_VERSION) return;
  const before = state.blockedWords.size;
  for (const word of SEED_WORDS) state.blockedWords.add(word);
  if (state.blockedWords.size !== before) {
    invalidateBlockedMatchers(state);
    saveBlockedWordsToFile(state, logger);
  }
  atomicWriteFileSync(marker, JSON.stringify({ version: SEED_VERSION }));
}

function loadBlockedWordsFromFile(state, logger) {
  try {
    const file = blockedWordsFile();
    if (!fs.existsSync(file) && fs.existsSync(DEFAULT_BLOCKED_WORDS_FILE)) {
      fs.copyFileSync(DEFAULT_BLOCKED_WORDS_FILE, file);
    }
    if (!fs.existsSync(file)) return;
    const content = fs.readFileSync(file, 'utf-8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const word = trimmed.slice(2).toLowerCase().trim();
        if (word) state.blockedWords.add(word);
      }
    }
    invalidateBlockedMatchers(state);
    applySeedWords(state, logger);
    logger.log(
      'info', 'moderacion', 'moderacion/filters/blocked-words-file.js#loadBlockedWordsFromFile', 'moderacion.palabras.cargado',
      `blocked-words.md cargado con ${state.blockedWords.size} palabra(s)`, { count: state.blockedWords.size }
    );
  } catch (error) {
    logger.log(
      'error', 'moderacion', 'moderacion/filters/blocked-words-file.js#loadBlockedWordsFromFile', 'moderacion.palabras.carga_fallida',
      `No se pudo cargar blocked-words.md: ${error.message}`, { path: blockedWordsFile(), error: error.message, stack: error.stack }
    );
  }
}

function saveBlockedWordsToFile(state, logger) {
  try {
    const sorted = [...state.blockedWords].sort((a, b) => a.localeCompare(b));
    const lines = [
      '# Palabras Prohibidas — FastTTS',
      '',
      'Edita este archivo directamente o usa la web en `/advanced.html`.',
      'Las palabras se comparan en minusculas, sin importar acentos.',
      '',
    ];
    for (const word of sorted) lines.push(`- ${word}`);
    lines.push('');
    atomicWriteFileSync(blockedWordsFile(), lines.join('\n'));
    logger.log(
      'info', 'moderacion', 'moderacion/filters/blocked-words-file.js#saveBlockedWordsToFile', 'moderacion.palabras.guardado',
      `blocked-words.md guardado con ${sorted.length} palabra(s)`, { count: sorted.length }
    );
  } catch (error) {
    logger.log(
      'error', 'moderacion', 'moderacion/filters/blocked-words-file.js#saveBlockedWordsToFile', 'moderacion.palabras.guardado_fallido',
      `No se pudo guardar blocked-words.md: ${error.message}`, { path: blockedWordsFile(), error: error.message, stack: error.stack }
    );
  }
}

module.exports = { loadBlockedWordsFromFile, saveBlockedWordsToFile, blockedWordsFile };
