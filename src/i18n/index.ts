/**
 * i18n module — re-exports translations plus small helpers.
 */

import { translations, languages, type LanguageCode } from './translations';

export { translations, languages };
export type { LanguageCode };

const STORAGE_KEY = 'qm-language';

export function getStoredLanguage(): LanguageCode {
  if (typeof localStorage === 'undefined') return 'en';
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
    if (saved && translations[saved]) return saved;
  } catch {}
  return 'en';
}

export function setStoredLanguage(lang: LanguageCode): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {}
}

export function t(lang: LanguageCode, key: string): string {
  return translations[lang]?.[key] || translations.en[key] || key;
}