import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  SafeAreaView,
  Clipboard,
  Share,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { applyReferralCode, getUserInfo } from '../services/api';
import BottomNav from '../components/BottomNav';
import { useTranslation } from 'react-i18next';

const ReferralScreen = () => {
  const navigation = useNavigation();
  const [referralCode, setReferralCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [bonusAmount, setBonusAmount] = useState(0);
  const [userReferralCode, setUserReferralCode] = useState('');
  const [isLoadingUserInfo, setIsLoadingUserInfo] = useState(true);
  const { t, i18n } = useTranslation();

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

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      setIsLoadingUserInfo(true);
      const userInfoResponse = await getUserInfo();
      setUserReferralCode(userInfoResponse.referral_code);
      console.log('Referral Code:', userInfoResponse.referral_code);
    } catch (error) {
      console.error('Error fetching user info:', error);
    } finally {
      setIsLoadingUserInfo(false);
    }
  };

  const handleApplyReferral = async () => {
    if (!referralCode.trim()) {
      Alert.alert('Error', 'Please enter a referral code');
      return;
    } 

    try {
      setIsLoading(true);
      const response = await applyReferralCode(referralCode.trim());
      setBonusAmount(response.bonus_earned);
      setShowSuccess(true);
    } catch (error) {
      console.log('Error response:', error);
      let errorMsg = 'An error occurred';
      
      // Handle different error response formats
      if (error.error) {
        // Check for the specific maximum usage error message
        if (error.error.includes('You can use at most 1 referral code')) {
          errorMsg = 'You can use referral code only once';
        } else {
          errorMsg = error.error;
        }
      } else if (error.referral_code && Array.isArray(error.referral_code)) {
        errorMsg = error.referral_code[0];
      } else if (typeof error === 'string') {
        errorMsg = error;
      }
      
      setErrorMessage(errorMsg);
      setShowError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    Clipboard.setString(userReferralCode);
    Alert.alert('Copied!', 'Referral code copied to clipboard');
  };

  const app_url = "https://play.google.com/store/apps/details?id=com.elusifataehyung.MilkManagementApp"

  const shareReferralCode = async () => {
    try {
      const message = t('share message', { referralCode: userReferralCode, appUrl: app_url });
      await Share.share({
        message,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const ErrorModal = () => (
    <Modal
      transparent={true}
      visible={showError}
      animationType="fade"
      onRequestClose={() => setShowError(false)}
    >
      <TouchableWithoutFeedback onPress={() => setShowError(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.errorCard}>
              <View style={styles.errorIconContainer}>
                <Icon name="alert-circle" size={40} color="#DC2626" />
              </View>
              <Text style={styles.errorTitle}>Error</Text>
              <Text style={styles.errorMessage}>{errorMessage}</Text>
              <TouchableOpacity 
                style={styles.dismissButton}
                onPress={() => setShowError(false)}
              >
                <Text style={styles.dismissButtonText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  const SuccessModal = () => (
    <Modal
      transparent={true}
      visible={showSuccess}
      animationType="fade"
      onRequestClose={() => setShowSuccess(false)}
    >
      <TouchableWithoutFeedback onPress={() => setShowSuccess(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.successCard}>
              <View style={styles.successIconContainer}>
                <Icon name="check-circle" size={40} color="#4CAF50" />
              </View>
              <Text style={styles.successTitle}>Congratulations!</Text>
              <Text style={styles.successMessage}>
                Referral code applied successfully!
              </Text>
              <View style={styles.bonusContainer}>
                <Icon name="wallet-giftcard" size={24} color="#4CAF50" />
                <Text style={styles.bonusText}>
                  You earned <Text style={styles.bonusAmount}>₹{bonusAmount}</Text> bonus!
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.doneButton}
                onPress={() => {
                  setShowSuccess(false);
                  navigation.goBack();
                }}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('apply referral codes')}</Text>
        </View>

        <View style={styles.contentContainer}>
          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.infoCard}>
              <Icon name="gift-outline" size={36} color="#0D47A1" />
              <Text style={styles.infoTitle}>{t('get exciting rewards')}</Text>
              <Text style={styles.infoText}>
                {t('enter your friend\'s referral code or any coupon code to earn bonus rewards')}
              </Text>
            </View>

            <View style={styles.rewardsContainer}>
              <View style={styles.rewardItem}>
                <Icon name="wallet-giftcard" size={32} color="#4CAF50" />
                <Text style={styles.rewardAmount}>₹50.00</Text>
                <Text style={styles.rewardLabel}>{t('bonus amount for referral code')}</Text>
              </View>
              <View style={styles.rewardDivider} />
              <View style={styles.rewardItem}>
                <Icon name="ticket-percent" size={32} color="#FF9800" />
                <Text style={styles.rewardAmount}>{t('coupons')}</Text>
                <Text style={styles.rewardLabel}>{t('get rewarded using coupon codes')}</Text>
              </View>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>{t('enter referral/coupon code')}</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={referralCode}
                  onChangeText={(text) => setReferralCode(text.toUpperCase())}
                  placeholder={t('enter code')}
                  placeholderTextColor="#999"
                  autoCapitalize="characters"
                  maxLength={5}
                  editable={!isLoading}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => handleApplyReferral()}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="gift" size={24} color="#fff" />
                  <Text style={styles.applyButtonText}>{t('apply code')}</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.yourCodeSection}>
              <Text style={styles.yourCodeTitle}>{t('your referral code')}</Text>
              {isLoadingUserInfo ? (
                <ActivityIndicator color="#0D47A1" size="small" style={{marginVertical: 10}} />
              ) : (
                <>
                  <View style={styles.codeContainer}>
                    <Text style={styles.yourCode}>{userReferralCode}</Text>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity style={styles.actionButton} onPress={copyToClipboard}>
                        <Icon name="content-copy" size={22} color="#0D47A1" />
                        <Text style={styles.actionButtonText}>Copy</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButton} onPress={shareReferralCode}>
                        <Icon name="share-variant" size={22} color="#0D47A1" />
                        <Text style={styles.actionButtonText}>Share</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.codeDescription}>
                    {t('share this code with friends and earn ₹100 when they use it! your friend will also get ₹50!')}
                  </Text>
                </>
              )}
            </View>

            {/* Additional padding to ensure content is scrollable past the bottom nav */}
            <View style={styles.bottomPadding} />
          </ScrollView>
        </View>

        <BottomNav />
        <ErrorModal />
        <SuccessModal />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0D47A1',
  },
  container: {
    flex: 1,
    backgroundColor: '#0D47A1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 10,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom: 30, // Ensure there's space at the bottom for scrolling
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  bottomPadding: {
    height: 60, // Add extra padding at the bottom to account for the BottomNav
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0D47A1',
    marginTop: 8,
    marginBottom: 6,
  },
  infoText: {
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
    fontSize: 13,
  },
  rewardsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12, // reduced from 15
    padding: 16, // reduced from 20
    marginBottom: 16, // reduced from 20
    elevation: 2,
  },
  rewardItem: {
    flex: 1,
    alignItems: 'center',
  },
  rewardDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 15,
  },
  rewardAmount: {
    fontSize: 18, // reduced from 20
    fontWeight: 'bold',
    color: '#333',
    marginTop: 6, // reduced from 8
  },
  rewardLabel: {
    fontSize: 13, // reduced from 14
    color: '#666',
    marginTop: 2, // reduced from 4
    textAlign: 'center',
  },
  inputSection: {
    backgroundColor: '#fff',
    borderRadius: 12, // reduced from 15
    padding: 16, // reduced from 20
    marginBottom: 16, // reduced from 20
    elevation: 2,
  },
  inputLabel: {
    fontSize: 15, // reduced from 16
    color: '#333',
    marginBottom: 8, // reduced from 10
    fontWeight: '600',
  },
  inputContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8, // reduced from 10
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  input: {
    padding: 10, // reduced from 15
    fontSize: 22, // reduced from 24
    color: '#0D47A1',
    textAlign: 'center',
    letterSpacing: 6, // reduced from 8
    fontWeight: 'bold',
  },
  applyButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10, // reduced from 12
    padding: 14, // reduced from 16
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  disabledButton: {
    opacity: 0.7,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16, // reduced from 18
    fontWeight: 'bold',
    marginLeft: 8, // reduced from 10
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorCard: {
    backgroundColor: 'white',
    borderRadius: 10, // reduced from 12
    padding: 16, // reduced from 20
    width: '80%', // reduced from 85%
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  errorIconContainer: {
    width: 50, // reduced from 60
    height: 50, // reduced from 60
    borderRadius: 25, // reduced from 30
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10, // reduced from 12
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 16,
  },
  dismissButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  dismissButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  successCard: {
    backgroundColor: 'white',
    borderRadius: 16, // reduced from 20
    padding: 20, // reduced from 24
    width: '80%', // reduced from 85%
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  successIconContainer: {
    width: 70, // reduced from 80
    height: 70, // reduced from 80
    borderRadius: 35, // reduced from 40
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12, // reduced from 16
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 16,
  },
  bonusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  bonusText: {
    fontSize: 16,
    color: '#4B5563',
    marginLeft: 12,
  },
  bonusAmount: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  doneButton: {
    backgroundColor: '#0D47A1',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
  },
  doneButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  yourCodeSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginTop: 20,
    elevation: 2,
  },
  yourCodeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F8FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    padding: 12,
    marginBottom: 10,
  },
  yourCode: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0D47A1',
    letterSpacing: 2,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#0D47A1',
    marginLeft: 4,
  },
  codeDescription: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default ReferralScreen; 
