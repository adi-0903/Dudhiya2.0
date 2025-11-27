import 'intl-pluralrules';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNLocalize from 'expo-localization';

import en from '../translations/en.json';
import hi from '../translations/hi.json';
import pa from '../translations/pa.json';
import kn from '../translations/kn.json';

const LANGUAGES = {
  en,
  hi,
  pa,
  kn,
};

const LANG_CODES = Object.keys(LANGUAGES);

const LANGUAGE_DETECTOR = {
  type: 'languageDetector',
  async: true,
  detect: async (callback) => {
    try {
      // First try to get user's saved language preference
      const savedLanguage = await AsyncStorage.getItem('@selected_language');
      if (savedLanguage && LANG_CODES.includes(savedLanguage)) {
        callback(savedLanguage);
        return;
      }

      // If no saved language, try to detect from device
      const deviceLang = RNLocalize.locale.split('-')[0];
      
      // Check if device language is supported, otherwise default to English
      const languageToUse = LANG_CODES.includes(deviceLang) ? deviceLang : 'en';
      callback(languageToUse);
      
    } catch (error) {
      console.log('Error reading language', error);
      callback('en'); // Default to English in case of error
    }
  },
  init: () => {},
  cacheUserLanguage: async (language) => {
    try {
      await AsyncStorage.setItem('@selected_language', language);
    } catch (error) {
      console.log('Error saving language', error);
    }
  }
};

i18n
  .use(LANGUAGE_DETECTOR)
  .use(initReactI18next)
  .init({
    resources: LANGUAGES,
    react: {
      useSuspense: false
    },
    interpolation: {
      escapeValue: false
    },
    defaultNS: 'common',
    fallbackLng: 'en',
    compatibilityJSON: 'v3',
    pluralization: {
      simplify: (count) => {
        if (count === 1) {
          return 'one';
        }
        return 'other';
      }
    }
  });

export default i18n; 