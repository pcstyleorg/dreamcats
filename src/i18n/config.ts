import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { isLocalStorageAvailable } from '@/lib/storage';

// Import translations directly for instant availability
import enTranslation from '@/locales/en/translation.json';
import enCommon from '@/locales/en/common.json';
import plTranslation from '@/locales/pl/translation.json';
import plCommon from '@/locales/pl/common.json';

const resources = {
  en: {
    translation: enTranslation,
    common: enCommon,
  },
  pl: {
    translation: plTranslation,
    common: plCommon,
  },
};

const canUseLocalStorage = isLocalStorageAvailable();

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'pl'],
    debug: false,
    defaultNS: 'translation',
    ns: ['translation', 'common'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: canUseLocalStorage ? ['localStorage', 'navigator'] : ['navigator'],
      caches: canUseLocalStorage ? ['localStorage'] : [],
      ...(canUseLocalStorage ? { lookupLocalStorage: 'i18nextLng' } : {}),
    },
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged',
      bindI18nStore: '',
    },
  });

export default i18n;
