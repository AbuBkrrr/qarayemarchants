import { getStoredLanguage, setStoredLanguage, languages, t } from '../i18n';
import type { LanguageCode } from '../i18n';

function applyLanguage(lang: LanguageCode) {
  // Update every element with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    const translated = t(lang, key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      (el as HTMLInputElement).placeholder = translated;
    } else {
      el.textContent = translated;
    }
  });

  // Update placeholder-only elements
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (!key) return;
    (el as HTMLInputElement).placeholder = t(lang, key);
  });

  // Update the language button label
  const label = document.getElementById('lang-label');
  if (label) {
    const meta = languages.find((l) => l.code === lang);
    label.textContent = meta ? meta.nativeName : 'English';
  }

  // Highlight the active option in the dropdown
  document.querySelectorAll('[data-lang-option]').forEach((el) => {
    const code = el.getAttribute('data-lang-option');
    el.classList.toggle('active', code === lang);
  });

  document.documentElement.lang = lang;
}

function init() {
  const current = getStoredLanguage();
  applyLanguage(current);

  // Language button toggles the dropdown
  const btn = document.getElementById('lang-btn');
  const dropdown = document.getElementById('lang-dropdown');
  if (btn && dropdown) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });
    document.addEventListener('click', () => dropdown.classList.remove('open'));
  }

  // Options change the language
  document.querySelectorAll('[data-lang-option]').forEach((el) => {
    el.addEventListener('click', () => {
      const code = el.getAttribute('data-lang-option') as LanguageCode | null;
      if (!code) return;
      setStoredLanguage(code);
      applyLanguage(code);
      dropdown?.classList.remove('open');
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}