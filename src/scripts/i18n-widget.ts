import { translations, languages, type LanguageCode } from '../i18n/translations';

const STORAGE_KEY = 'qm-language';
const VALID_LANGS: LanguageCode[] = ['en', 'ha', 'yo', 'ig'];

function getCurrentLang(): LanguageCode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
    if (saved && VALID_LANGS.includes(saved)) return saved;
  } catch {}
  return 'en';
}

function applyTranslations(lang: LanguageCode) {
  const dict = translations[lang] || translations.en;

  // Update all [data-i18n] elements
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    const value = dict[key];
    if (value) el.textContent = value;
  });

  // Update the button label
  const label = document.getElementById('lang-label');
  if (label) {
    const langObj = languages.find((l) => l.code === lang);
    label.textContent = langObj ? langObj.name : 'English';
  }

  // Update active state in dropdown
  document.querySelectorAll('[data-lang-option]').forEach((el) => {
    const code = el.getAttribute('data-lang-option');
    el.classList.toggle('active', code === lang);
  });

  // Update html lang attribute
  document.documentElement.lang = lang;
}

function init() {
  const currentLang = getCurrentLang();
  applyTranslations(currentLang);

  const btn = document.getElementById('lang-btn');
  const dropdown = document.getElementById('lang-dropdown');

  // Toggle dropdown on button click
  if (btn && dropdown) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target as Node) && e.target !== btn) {
        dropdown.classList.remove('open');
      }
    });
  }

  // Handle language option clicks
  document.querySelectorAll('[data-lang-option]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const code = el.getAttribute('data-lang-option') as LanguageCode;
      if (!code || !VALID_LANGS.includes(code)) return;

      try {
        localStorage.setItem(STORAGE_KEY, code);
      } catch {}

      applyTranslations(code);
      dropdown?.classList.remove('open');
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}