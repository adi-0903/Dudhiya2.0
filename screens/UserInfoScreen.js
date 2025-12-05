import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, TouchableWithoutFeedback, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Keyboard } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import styles from '../styles/UserInfoStyles';
import { updateUserInfo, saveDairyInfo, applyReferralCode } from '../services/api';
import { useTranslation } from 'react-i18next';
import useKeyboardDismiss from '../hooks/useKeyboardDismiss';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define rate type options
const RATE_TYPES = [
  { label: 'FAT + SNF', value: 'fat_snf' },
  { label: 'FAT + CLR', value: 'fat_clr' },
  { label: 'KG', value: 'kg_only' },
  { label: 'Liters', value: 'liters_only' },
];

const RATE_TYPE_LABELS = RATE_TYPES.reduce((acc, type) => {
  acc[type.value] = type.label;
  return acc;
}, {});

const UserInfoScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [dairyName, setDairyName] = useState('');
  const [dairyAddress, setDairyAddress] = useState('');
  const [rateType, setRateType] = useState('fat_snf'); // Default to fat_snf
  const [referralCode, setReferralCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registrationDetails, setRegistrationDetails] = useState({});
  const [isReferralValid, setIsReferralValid] = useState(true);
  const [errorType, setErrorType] = useState('default'); // 'default' | 'network' | 'not_found'
  const { t, i18n } = useTranslation();
  const { handleButtonPress } = useKeyboardDismiss();

  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('@selected_language');
        if (savedLanguage && i18n.language !== savedLanguage) {
          i18n.changeLanguage(savedLanguage);
        }
      } catch (error) {
        console.error('Error loading saved language:', error);
      }
    };
    
    loadSavedLanguage();
  }, [i18n]);

  const validateEmail = (email) => {
    if (!email) return true; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleUserInfo = async () => {
    try {
      // Validate required fields
      if (!username || !dairyName || !dairyAddress) {
        setErrorMessage(t('please fill in all required fields'));
        setShowErrorModal(true);
        return;
      }

      if (email && !validateEmail(email)) {
        setErrorMessage(t('please enter a valid email address'));
        setShowErrorModal(true);
        return;
      }

      setIsLoading(true);

      // Step 1: Update user information
      const userData = {
        name: username.trim(),
        ...(email && { email: email.trim() }),
      };
      await updateUserInfo(userData);

      // Step 2: Save dairy information
      const dairyData = {
        dairy_name: dairyName.trim(),
        dairy_address: dairyAddress.trim(),
        rate_type: rateType, // Use the selected rate type
      };
      await saveDairyInfo(dairyData);

      // Step 3: Apply referral code if provided
      let referralSuccess = true;
      if (referralCode.trim()) {
        try {
          const referralResponse = await applyReferralCode(referralCode.trim());
          // Only show success modal if referral code is also successful
          setRegistrationDetails({
            username: userData.name,
            email: userData.email || t('not provided'),
            dairy_name: dairyData.dairy_name,
            dairy_address: dairyData.dairy_address,
            rate_type: RATE_TYPE_LABELS[rateType] || rateType,
            referral_code: referralCode.trim(),
            referral_message: referralResponse.message
          });
          setShowSuccessModal(true);
        } catch (error) {
          referralSuccess = false;
          // Handle the API error response directly
          if (error.referral_code) {
            setErrorMessage({ referral_code: error.referral_code });
          } else {
            setErrorMessage(error);
          }
          setShowErrorModal(true);
        }
      } else {
        // If no referral code, show success modal
        setRegistrationDetails({
          username: userData.name,
          email: userData.email || t('not provided'),
          dairy_name: dairyData.dairy_name,
          dairy_address: dairyData.dairy_address,
          rate_type: RATE_TYPE_LABELS[rateType] || rateType,
          referral_code: t('not provided')
        });
        setShowSuccessModal(true);
      }

    } catch (error) {
      console.error('User Info Error:', error);
      let errorMessage = error.error || 'Failed to save information. Please try again.';
      
      if (error.response?.status === 404) {
        setErrorType('not_found');
        errorMessage = 'The requested resource was not found.';
      } else {
        setErrorType('default');
        if (error.response?.data) {
          const { data } = error.response;
          if (data.detail) {
            errorMessage = data.detail;
          } else if (typeof data === 'object') {
            errorMessage = Object.values(data).flat().join('\n');
          }
        }
      }
      
      setErrorMessage(errorMessage);
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const closeErrorModal = () => {
    setShowErrorModal(false);
    setErrorMessage('');
    setErrorType('default');
  };

  const formatErrorMessage = (error) => {
    if (typeof error === 'string') return error;
    
    // Handle object with array messages
    if (error && typeof error === 'object') {
      return Object.entries(error)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return value.join(', ');
          }
          return `${value}`;
        })
        .join('\n');
    }
    
    return t('an error occurred');
  };

  const renderErrorModal = () => (
    <Modal
      transparent={true}
      visible={showErrorModal}
      animationType="fade"
      onRequestClose={closeErrorModal}
    >
      <TouchableWithoutFeedback onPress={closeErrorModal}>
        <View style={styles.modalBackground}>
          <TouchableWithoutFeedback>
            <View style={styles.errorCard}>
              <View style={styles.errorIconContainer}>
                <Icon 
                  name="error" 
                  size={40} 
                  color="#DC2626" 
                  style={styles.errorIcon}
                />
              </View>
              <Text style={styles.errorMessage}>
                {formatErrorMessage(errorMessage)}
              </Text>
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={handleButtonPress(closeErrorModal)}
              >
                <Icon name="close" size={20} color="#FFFFFF" />
                <Text style={styles.retryButtonText}>{t('close')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -500}
    >
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <Text style={[styles.title, { marginBottom: 20 }]}>{t('your information')}</Text>

          <View style={[styles.whiteContainer, { marginBottom: 20 }]}>
            <View style={styles.waveTop} />

            <View style={styles.inputContainer}>
              <Icon name="person" size={20} color="#0D47A1" />
              <TextInput
                placeholder={t('name')} 
                value={username}
                onChangeText={(text) => setUsername(text)}
                style={[styles.input, { color: '#000' }]}
                selectionColor="#0D47A1"
                autoCapitalize="words"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Icon name="mail" size={20} color="#0D47A1" />
              <TextInput
                placeholder={t('email (optional)')}
                value={email}
                onChangeText={setEmail}
                style={[styles.input, { color: '#000' }]}
                selectionColor="#0D47A1"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Icon name="business" size={20} color="#0D47A1" />
              <TextInput
                placeholder={t('dairy name') + ' *'}
                value={dairyName}
                onChangeText={setDairyName}
                style={[styles.input, { color: '#000' }]}
                selectionColor="#0D47A1"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Icon name="location-on" size={20} color="#0D47A1" />
              <TextInput
                placeholder={t('dairy address') + ' *'}
                value={dairyAddress}
                onChangeText={setDairyAddress}
                style={[styles.input, { color: '#000' }]}
                selectionColor="#0D47A1"
                multiline={true}
                numberOfLines={2}
                editable={!isLoading}
              />
            </View>
            
            {/* Rate Type Dropdown */}
            <View style={styles.inputContainer}>
              <Icon name="tune" size={20} color="#0D47A1" />
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={rateType}
                  onValueChange={(value) => setRateType(value)}
                  style={styles.picker}
                  enabled={!isLoading}
                >
                  {RATE_TYPES.map((type) => (
                    <Picker.Item
                      key={type.value}
                      label={type.label}
                      value={type.value}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Icon name="card-giftcard" size={20} color="#0D47A1" />
              <TextInput
                placeholder={t('referral code') + ' (' + t('optional') + ')'}
                value={referralCode}
                onChangeText={text => setReferralCode(text.toUpperCase())}
                style={styles.input}
                autoCapitalize="characters"
                editable={!isLoading}
              />
            </View>

            {/* Simple card-style bonus info */}
            <View style={styles.bonusCard}>
              <View style={styles.bonusContent}>
                <View style={styles.bonusIconContainer}>
                  <Icon name="wallet-giftcard" size={28} color="#4CAF50" />
                </View>
                <View style={styles.bonusTextContainer}>
                  <Text style={styles.bonusTitle}>{t('welcome bonus')}!</Text>
                  <Text style={styles.bonusDescription}>
                    {t('get 1000 bonus instantly when you sign up!')}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.button, isLoading && { opacity: 0.7 }]} 
              onPress={handleButtonPress(handleUserInfo)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{t('save')}</Text>
              )}
            </TouchableOpacity>

          </View>
        </View>
        {renderErrorModal()}
        <Modal
          transparent={true}
          visible={showSuccessModal}
          animationType='fade'
          onRequestClose={() => {
            // Prevent modal from closing on back button press
            return true;
          }}
        >
          <View style={styles.modalBackground}>
            <View style={styles.modalContainer}>
              <View style={styles.headerContainer}>
                <View style={styles.successIconContainer}>
                  <Icon 
                    name="check-circle" 
                    size={45} 
                    color="#2E7D32" 
                    style={styles.successIcon}
                  />
                </View>
                <Text style={styles.successTitle}>{t('success')}</Text>
                <Text style={styles.successSubtitle}>{t('your details have been updated successfully')}</Text>
              </View>

              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <Icon name="person" size={20} color="#0D47A1" />
                  <Text style={styles.detailLabel}>{t('name')}:</Text>
                  <Text style={styles.detailValue}>{registrationDetails.username}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Icon name="business" size={20} color="#0D47A1" />
                  <Text style={styles.detailLabel}>{t('dairy name')}:</Text>
                  <Text style={styles.detailValue}>{registrationDetails.dairy_name}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Icon name="email" size={20} color="#0D47A1" />
                  <Text style={styles.detailLabel}>{t('email')}:</Text>
                  <Text style={styles.detailValue}>{registrationDetails.email}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Icon name="location-on" size={20} color="#0D47A1" />
                  <Text style={styles.detailLabel}>{t('address')}:</Text>
                  <Text style={styles.detailValue}>{registrationDetails.dairy_address}</Text>
                </View>
                
                {/* Add rate type to success modal */}
                <View style={styles.detailRow}>
                  <Icon name="tune" size={20} color="#0D47A1" />
                  <Text style={styles.detailLabel}>{t('rate type')}:</Text>
                  <Text style={styles.detailValue}>{registrationDetails.rate_type}</Text>
                </View>
              </View>

              <View style={styles.infoNoteContainer}>
                <Icon 
                  name="info" 
                  size={20} 
                  color="#1565C0" 
                  style={styles.infoIcon}
                />
                <Text style={styles.infoText}>
                  {t('you can update these details anytime from your profile page in the more options')}
                </Text>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={styles.backButton} 
                  onPress={handleButtonPress(() => {
                    setShowSuccessModal(false);
                  })}
                >
                  <Icon name="arrow-back" size={20} right='10' color="#FFFFFF" />
                  <Text style={styles.buttonText}>{t('go back')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.goToHomeButton} 
                  onPress={handleButtonPress(() => {
                    setShowSuccessModal(false);
                    navigation.replace('Home', { autoOpenHowTo: true }); // Using replace to prevent going back to this screen
                  })}
                >
                  <Icon name="check" size={20} color="#FFFFFF" />
                  <Text style={styles.goToHomeButtonText}>{t('ok')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default UserInfoScreen;
