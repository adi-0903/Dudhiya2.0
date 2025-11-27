import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' },
];

const LanguageSelectionScreen = ({ navigation, route }) => {
  const { fromScreen, onSelectLanguage, fromFirstLaunch } = route.params || {};
  const { i18n } = useTranslation();

  const handleLanguageSelect = async (languageCode) => {
    try {
      // Change language using i18next
      await i18n.changeLanguage(languageCode);
      
      // Save the selected language to AsyncStorage
      await AsyncStorage.setItem('@selected_language', languageCode);
      
      if (fromScreen === 'Home' || fromScreen === 'MoreOptions') {
        // If coming from home or more options screen, use the callback
        onSelectLanguage?.(languageCode);
      } else {
        // Go to login when not coming from Home or MoreOptions
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Your Language</Text>
      <Text style={styles.subtitle}>भाषा चुनें / ਭਾਸ਼ਾ ਚੁਣੋ / ಕನ್ನಡ</Text>
      
      <View style={styles.languageContainer}>
        {LANGUAGES.map((language) => (
          <TouchableOpacity
            key={language.code}
            style={[
              styles.languageButton,
              i18n.language === language.code && styles.activeLanguageButton
            ]}
            onPress={() => handleLanguageSelect(language.code)}
          >
            <Text style={styles.languageFlag}>{language.flag}</Text>
            <Text style={[
              styles.languageName,
              i18n.language === language.code && styles.activeLanguageText
            ]}>{language.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D47A1',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 20,
    color: '#fff',
    marginBottom: 40,
  },
  languageContainer: {
    width: '100%',
    maxWidth: 300,
  },
  languageButton: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  activeLanguageButton: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#1976D2',
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 15,
  },
  languageName: {
    fontSize: 18,
    color: '#0D47A1',
    fontWeight: 'bold',
  },
  activeLanguageText: {
    color: '#1976D2',
  },
});

export default LanguageSelectionScreen; 