import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();

  const changeLanguage = (language) => {
    i18n.changeLanguage(language);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('common:language')}</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            i18n.language === 'en' && styles.activeButton
          ]}
          onPress={() => changeLanguage('en')}
        >
          <Text style={[
            styles.buttonText,
            i18n.language === 'en' && styles.activeButtonText
          ]}>English</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            i18n.language === 'hi' && styles.activeButton
          ]}
          onPress={() => changeLanguage('hi')}
        >
          <Text style={[
            styles.buttonText,
            i18n.language === 'hi' && styles.activeButtonText
          ]}>हिंदी</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  activeButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  buttonText: {
    fontSize: 16,
    color: '#333',
  },
  activeButtonText: {
    color: '#fff',
  },
});

export default LanguageSwitcher; 