import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Modal, TouchableWithoutFeedback, Alert, Platform, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import baseStyles from '../styles/LoginStyles';
import { loginUser, verifyOTP, checkDairyInfoExists, getUserInfo, DEV_MODE } from '../services/api';
import { storeToken } from '../services/tokenStorage';
import { requestSMSPermission } from '../utils/permissions';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'react-native';
import useKeyboardDismiss from '../hooks/useKeyboardDismiss';


const LoginScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [verificationId, setVerificationId] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isPhoneValid, setIsPhoneValid] = useState(false);
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

  const validatePhoneNumber = (phone) => {
    const phoneRegex = /^\d{10}$/;  // Any 10 digits
    
    const validations = {
      length: phone.length === 10,
      onlyNumbers: /^\d+$/.test(phone),
      validFormat: phoneRegex.test(phone)
    };

    return {
      isValid: Object.values(validations).every(v => v),
      errors: {
        length: !validations.length ? t('phone number must be 10 digits') : '',
        onlyNumbers: !validations.onlyNumbers ? t('only numbers are allowed') : '',
      }
    };
  };

  useEffect(() => {
    if (phoneNumber) {
      const { isValid, errors } = validatePhoneNumber(phoneNumber);
      setIsPhoneValid(isValid);
      
      const firstError = Object.values(errors).find(error => error !== '');
      setPhoneError(firstError || '');
    } else {
      setPhoneError('');
      setIsPhoneValid(false);
    }
  }, [phoneNumber]);

  useEffect(() => {
    if (Platform.OS === 'android' && isOtpSent) {
      requestSMSPermission();
    }
  }, [isOtpSent]);

  const handlePhoneNumberChange = (text) => {
    const numbersOnly = text.replace(/[^0-9]/g, '');
    setPhoneNumber(numbersOnly.slice(0, 10));
  };

  const handleLogin = async () => {
    const { isValid, errors } = validatePhoneNumber(phoneNumber);
    
    if (!isValid) {
      const errorMessage = Object.values(errors).find(error => error !== '') || t('invalid phone number');
      setErrorMessage(errorMessage);
      setShowErrorModal(true);
      return;
    }

    setIsLoading(true);
    try {
      const formattedPhone = phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`;
      const response = await loginUser(formattedPhone);
      console.log('Login Response:', response);
      
      if (DEV_MODE) {
        // In dev mode, we expect token directly
        if (response.token) {
          await storeToken(response.token);
          try {
            const userInfoResponse = await getUserInfo();
            console.log('User Info Response:', userInfoResponse);
            
            // Check if name exists and is not empty
            if (!userInfoResponse.name || !userInfoResponse.name.trim()) {
              // No name or empty name, redirect to UserInfo screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'UserInfo' }],
              });
            } else {
              // User has a valid name, proceed to Home
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
            }
          } catch (error) {
            console.error('Error checking user info:', error);
            // If there's an error checking user info, redirect to UserInfo to be safe
            navigation.reset({
              index: 0,
              routes: [{ name: 'UserInfo' }],
            });
          }
        } else {
          throw new Error('Token not received in dev mode');
        }
      } else {
        // Production mode - OTP flow
        if (response.verificationId) {
          setIsOtpSent(true);
          setVerificationId(response.verificationId);
        } else {
          throw new Error('Verification ID not received');
        }
      }
    } catch (error) {
      console.error('Login Error:', error);
      setErrorMessage(error.error || t('failed to process login. please try again.'));
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (text) => {
    const numbersOnly = text.replace(/[^0-9]/g, '');
    setOtp(numbersOnly.slice(0, 6));
  };

  const handleVerifyOtp = async () => {
    setIsLoading(true);
    try {
      const response = await verifyOTP(phoneNumber, otp, verificationId);
      await storeToken(response.token);
      
      try {
        const userInfoResponse = await getUserInfo();
        console.log('User Info Response after OTP:', userInfoResponse);
        
        if (!userInfoResponse.name || !userInfoResponse.name.trim()) {
          // No name or empty name, redirect to UserInfo
          navigation.reset({
            index: 0,
            routes: [{ name: 'UserInfo' }],
          });
        } else {
          // User has a valid name, proceed to Home
          navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          });
        }
      } catch (error) {
        console.error('Error checking user info:', error);
        // If there's an error checking user info, redirect to UserInfo to be safe
        navigation.reset({
          index: 0,
          routes: [{ name: 'UserInfo' }],
        });
      }
    } catch (error) {
      setErrorMessage(t('invalid otp. please try again.'));
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Update Modal handling to fix the synthetic event issue
  const closeErrorModal = () => {
    setShowErrorModal(false);
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View style={baseStyles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image 
          source={require('../assets/Dudhiya-logo.png')} 
          style={styles.logoImage}
          resizeMode="cover"
        />
      </View>

        <Text style={baseStyles.title}>{t('hello! sign in')}</Text>

      <View style={baseStyles.whiteContainer}>
        <View style={baseStyles.waveTop} />

        <View style={styles.inputWrapper}>
          <View style={[
            baseStyles.inputContainer,
            phoneError && styles.inputError,
            { backgroundColor: '#F5F7FA' }
          ]}>
            <TextInput
              placeholder={t('phone number')}
              placeholderTextColor="#666666"
              value={phoneNumber}
              onChangeText={handlePhoneNumberChange}
              style={{
                flex: 1,
                marginLeft: 12,
                fontSize: 16,
                color: '#000000',
                zIndex: 999,
                fontWeight: 'normal',
                opacity: 1,
                ...(isPhoneValid && styles.phoneInputText),
              }}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>
            {phoneError ? (
              <Text style={styles.errorText}>{phoneError}</Text>
            ) : (
              <Text style={styles.helperText}>{t('enter your 10-digit mobile number')}</Text>
            )}
          </View>

          {isOtpSent && (
            <View style={baseStyles.inputContainer}>
              <TextInput
                placeholder={t('enter otp')}
                placeholderTextColor="#666666"
                value={otp}
                onChangeText={handleOtpChange}
                style={baseStyles.input}
                keyboardType="number-pad"
                maxLength={6}
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                autoFocus={true}
              />
            </View>
          )}

          <TouchableOpacity 
            style={[
              baseStyles.button, 
              (!isPhoneValid || isLoading) && styles.buttonDisabled
            ]} 
            onPress={handleButtonPress(isOtpSent ? handleVerifyOtp : handleLogin)}
            disabled={!isPhoneValid || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={baseStyles.buttonText}>
                {isOtpSent ? t('verify otp') : t('send otp')}
              </Text>
            )}
          </TouchableOpacity>

          {isOtpSent && (
            <TouchableOpacity 
              style={baseStyles.backButton}
              onPress={handleButtonPress(() => {
                setIsOtpSent(false);
                setOtp('');
                setPhoneNumber('');
              })}
            >
              <Text style={baseStyles.backButtonText}>
                {t('back to login')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Error Modal */}
          <Modal
            transparent={true}
            animationType="fade"
            visible={showErrorModal}
            onRequestClose={closeErrorModal}
          >
            <TouchableWithoutFeedback onPress={closeErrorModal}>
              <View style={styles.modalBackground}>
                <TouchableWithoutFeedback>
                  <View style={styles.errorCard}>
                    <View style={styles.errorIcon}>
                      <Icon name="error-outline" size={32} color="#DC2626" />
                    </View>
                    <Text style={styles.errorMessage}>{errorMessage}</Text>
                    <TouchableOpacity 
                      style={styles.closeButton} 
                      onPress={closeErrorModal}
                    >
                      <Text style={styles.closeButtonText}>{t('close')}</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
// Logo
logoContainer: {
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 30,
},
logoImage: {
  width: 120,
  height: 120,
  borderRadius: 25,
},

  buttonDisabled: {
    opacity: 0.7,
    backgroundColor: '#ccc',
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  errorCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 20,
    width: '85%',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  errorIcon: {
    marginBottom: 16,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 50,
  },
  errorMessage: {
    color: '#1F2937',
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
  closeButton: {
    backgroundColor: '#0D47A1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    height: 50, // Increased height by 5px
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputError: {
    borderColor: '#DC2626',
    borderWidth: 1,
  },
  validInput: {
    borderColor: '#4CAF50',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  helperText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  validationIcon: {
    position: 'absolute',
    right: 10,
  },
  blackText: {
    color: '#000000',
    fontWeight: 'normal',
    zIndex: 10,
  },
  phoneInputText: {
    color: '#000000 !important',
    zIndex: 999,
    opacity: 1,
    textShadow: 'none',
  },
});

export default LoginScreen;
