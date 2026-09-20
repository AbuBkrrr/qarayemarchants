import { translations, languages, type LanguageCode } from './translations';

export { translations, languages };
export type { LanguageCode };

const STORAGE_KEY = 'qm_lang';
const DEFAULT_LANG: LanguageCode = 'en';

export function getStoredLanguage(): LanguageCode {
  if (typeof localStorage === 'undefined') return DEFAULT_LANG;
  const stored = localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
  if (stored && translations[stored]) return stored;
  return DEFAULT_LANG;
}

export function setStoredLanguage(lang: LanguageCode): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang;
}

export function t(lang: LanguageCode, key: string): string {
  return translations[lang]?.[key] ?? translations.en[key] ?? key;
}