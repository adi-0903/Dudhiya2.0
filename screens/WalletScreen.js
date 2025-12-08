import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  RefreshControl,
  Dimensions,
  Animated,
  Easing,
  Modal
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getWalletBalance, addMoneyToWallet } from '../services/api';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WalletScreen = ({ navigation }) => {
  const [amount, setAmount] = useState('1000');
  const [balance, setBalance] = useState('0');
  const [bonusAmount, setBonusAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [supportPhoneNumber] = useState('+91 7454860294');
  const { t, i18n } = useTranslation();
  const [showVideoModal, setShowVideoModal] = useState(false);
  const videoRef = useRef(null);

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

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('WalletScreen focused - refreshing data');
      fetchWalletBalance();
      return () => {};
    }, [])
  );

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchWalletBalance().finally(() => setRefreshing(false));
  }, []);

  const fetchWalletBalance = async () => {
    try {
      setIsLoading(true);
      const response = await getWalletBalance();
      if (response && response.balance) {
        setBalance(response.balance.toString());
      }
    } catch (error) {
      Alert.alert('Error', error.error || 'Failed to fetch wallet balance');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateBonus = (rechargeAmount) => {
    const amt = parseFloat(rechargeAmount) || 0;
    let bonus = 0;
    
    if (amt >= 1000) {
      bonus = amt * 0.10; // 10% bonus
    } else if (amt >= 500) {
      bonus = amt * 0.05; // 5% bonus
    }
    
    return bonus.toFixed(2); // Changed from Math.round() to toFixed(1)
  };

  useEffect(() => {
    setBonusAmount(calculateBonus(amount));
  }, []);

  const handleAmountPress = (value) => {
    setAmount(value.toString());
    setBonusAmount(calculateBonus(value));
  };

  const handleAmountChange = (text) => {
    // Remove any non-numeric characters
    const numericValue = text.replace(/[^0-9]/g, '');
    setAmount(numericValue);
    setBonusAmount(calculateBonus(numericValue));
  };

  const handleContinue = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const amountValue = parseFloat(amount);
    if (amountValue < 10) {
      Alert.alert('Error', 'Minimum recharge amount is ₹10');
      return;
    }

    try {
      setIsProcessing(true);
      
      // Get payment link from API
      const response = await addMoneyToWallet(amountValue);
      const { payment_link } = response;
      
      // Open payment link in browser
      const supported = await Linking.canOpenURL(payment_link);
      if (!supported) {
        throw { error: 'Cannot open payment link. Please try again.' };
      }

      await Linking.openURL(payment_link);
      setIsProcessing(false);

    } catch (error) {
      console.error('Payment error:', error);
      setIsProcessing(false);
      Alert.alert('Error', error.error || 'Failed to process payment');
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await fetchWalletBalance();
    } catch (error) {
      console.error('Refresh error:', error);
      Alert.alert('Error', 'Failed to refresh wallet balance');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWhatsAppPress = async () => {
    const whatsappNumber = supportPhoneNumber.replace(/[^0-9]/g, '');
    const url = `whatsapp://send?phone=${whatsappNumber}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'WhatsApp is not installed on your device');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open WhatsApp');
    }
  };

  const handlePhonePress = () => {
    Linking.openURL(`tel:${supportPhoneNumber}`);
  };

  const closeVideoModal = async () => {
    try {
      await videoRef.current?.pauseAsync();
    } catch (e) {}
    setShowVideoModal(false);
  };

  // Add this animation for the refresh icon
  const [spinAnim] = useState(new Animated.Value(0));

  const startSpinAnimation = () => {
    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 1000,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Modify the refresh button to include animation
  const onRefreshPress = () => {
    startSpinAnimation();
    handleRefresh();
  };

  return (
    <>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('wallet')}</Text>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={onRefreshPress}
              disabled={isLoading}
            >
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Icon 
                  name="refresh" 
                  size={22} 
                  color="#fff" 
                  style={styles.refreshIcon}
                />
              </Animated.View>
            </TouchableOpacity>
          </View>

          <View style={styles.mainContent}>
            <View style={styles.balanceCard}>
              <View style={styles.balanceContainer}>
                <Text style={styles.balanceTitle}>{t('total available balance')}</Text>
                <View style={styles.balanceRow}>
                  {isLoading ? (
                    <ActivityIndicator size="large" color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.balanceAmount}>₹{parseFloat(balance).toFixed(2)}</Text>
                      <View style={styles.walletIconContainer}>
                        <Icon name="wallet-outline" size={40} color="#fff" />
                      </View>
                    </>
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.historyButton}
                  onPress={() => navigation.navigate('PaymentHistory')}
                >
                  <Icon name="history" size={18} color="#fff" />
                  <Text style={styles.historyButtonText}>{t('payment history')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.walletInfoButtonContainer}>
              <TouchableOpacity
                style={styles.walletInfoButton}
                onPress={() => setShowVideoModal(true)}
              >
                <Icon name="play-circle" size={18} color="#0D47A1" />
                <Text style={styles.walletInfoButtonText}>{t('how wallet works')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Icon name="information-outline" size={20} color="#4CAF50" />  
                <Text style={styles.infoText}>
                  {t('money will be added to your wallet within 5 mins after successful payment. Please')}{' '}
                  <Text 
                    style={styles.refreshLink}
                    onPress={onRefreshPress}
                  >
                    {t('refresh the page')}
                  </Text>
                </Text>
              </View>
            </View>

            <View style={styles.addMoneyCard}>
              <View style={styles.addMoneyHeader}>
                <Text style={styles.addMoneyTitle}>{t('add money')}</Text>
                <TouchableOpacity 
                  style={styles.offerButton}
                  onPress={() => setShowOfferModal(true)}
                >
                  <Icon name="tag-outline" size={16} color="#FF6B35" />
                  <Text style={styles.offerButtonText}>{t('offers')}</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.rupeeSymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={handleAmountChange}
                  keyboardType="numeric"
                  placeholder="Enter amount"
                  editable={!isProcessing}
                  placeholderTextColor="#999"
                />
              </View>

              {bonusAmount > 0 && (
                <View style={styles.bonusContainer}>
                  <Icon name="gift" size={20} color="#4CAF50" />
                  <Text style={styles.bonusText}>
                    {t("you will get")} ₹{bonusAmount} {t("extra on this recharge!")}
                  </Text>
                </View>
              )}

              <Text style={styles.quickAmountTitle}>{t('quick recharge')}</Text>
              <View style={styles.quickAmounts}>
                {[10,50, 500, 1000].map((value) => (
                  <TouchableOpacity 
                    key={value}
                    style={[
                      styles.amountButton,
                      amount === value.toString() && styles.selectedAmount
                    ]}
                    onPress={() => handleAmountPress(value)}
                    disabled={isProcessing}
                  >
                    <Text style={[
                      styles.amountButtonText,
                      amount === value.toString() && styles.selectedAmountText
                    ]}>₹{value}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity 
                style={[
                  styles.continueButton,
                  (isProcessing || !amount) && styles.continueButtonDisabled
                ]}
                onPress={handleContinue}
                disabled={isProcessing || !amount}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.continueButtonText}>{t('continue to payment')}</Text>
                    <Icon name="arrow-right" size={20} color="#fff" />
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.referralButton}
                onPress={() => navigation.navigate('Referral')}
              >
                <Icon name="ticket-percent-outline" size={20} color="#0D47A1" />
                <Text style={styles.referralButtonText}>{t('referral/coupon code')}</Text>
              </TouchableOpacity>

              <View style={styles.supportInfoContainer}>
                <View style={styles.supportHeadingRow}>
                  <Icon name="help-circle-outline" size={20} color="#666" />
                  <Text style={styles.supportInfoHeading}>{t('having trouble adding money?')}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.supportContactButton}
                  onPress={() => setShowHelpModal(true)}
                >
                  <Icon name="headset" size={18} color="#fff" />
                  <Text style={styles.supportContactButtonText}>{t('contact us')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showVideoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeVideoModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeVideoModal}
        >
          <TouchableOpacity 
            style={styles.videoModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <TouchableOpacity
              style={styles.closeIconButton}
              onPress={closeVideoModal}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>

            <Text style={styles.videoTitle}>{t('how wallet works')}</Text>
            <Video
              ref={videoRef}
              style={styles.videoPlayer}
              source={require('../assets/Dudhiya-welcome.mp4')}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              isLooping={false}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showHelpModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowHelpModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowHelpModal(false)}
        >
          <View style={styles.helpModalContent}>
            <TouchableOpacity 
              style={styles.closeIconButton}
              onPress={() => setShowHelpModal(false)}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
            <View style={styles.helpHeader}>
              <Icon name="headset" size={40} color="#0D47A1" />
              <Text style={styles.helpTitle}>{t('contact support')}</Text>
            </View>
            <Text style={styles.helpSubtitle}>
              {t('how can we assist you today?')}
            </Text>
            <View style={styles.helpOptions}>
              <TouchableOpacity 
                style={styles.helpOption}
                onPress={handleWhatsAppPress}
              >
                <View style={styles.helpIconContainer}>
                  <Icon name="whatsapp" size={30} color="#25D366" />
                </View>
                <View style={styles.helpOptionContent}>
                  <Text style={styles.helpOptionTitle}>{t('whatsapp support')}</Text>
                  <Text style={styles.helpOptionSubtext}>{t('get instant help from our support team')}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.helpOption}
                onPress={handlePhonePress}
              >
                <View style={styles.helpIconContainer}>
                  <Icon name="phone" size={30} color="#0D47A1" />
                </View>
                <View style={styles.helpOptionContent}>
                  <Text style={styles.helpOptionTitle}>{t('call support')}</Text>
                  <Text style={styles.helpOptionSubtext}>{supportPhoneNumber}</Text>
                </View>
              </TouchableOpacity>
            </View>
            <Text style={styles.helpFooter}>
              {t('for more options, please visit our website')}
              {'\n'}
              <Text
                style={styles.helpFooterLink}
                onPress={() => Linking.openURL('https://dudhiya.netpy.in/')}
              >
                www.dudhiya.netpy.in
              </Text>
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showOfferModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowOfferModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowOfferModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.offerModalContent}>
                <TouchableOpacity 
                  style={styles.closeIconButton}
                  onPress={() => setShowOfferModal(false)}
                >
                  <Icon name="close" size={24} color="#666" />
                </TouchableOpacity>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.offerScrollContent}
                >
                  <View style={styles.offerHeader}>
                    <View style={styles.offerIconContainer}>
                      <Icon name="gift" size={40} color="#FF6B35" />
                    </View>
                    <Text style={styles.offerTitle}>{t('recharge offers')}</Text>
                    <Text style={styles.offerSubtitle}>{t('get extra bonus on recharge')}</Text>
                  </View>

                  <View style={styles.offersList}>
                    <View style={styles.offerCard}>
                      <View style={styles.offerCardHeader}>
                        <View style={styles.offerBadge}>
                          <Icon name="star" size={20} color="#FFD700" />
                          <Text style={styles.offerBadgeText}>5%</Text>
                        </View>
                        <Text style={styles.offerCardTitle}>{t('starter bonus')}</Text>
                      </View>
                      <View style={styles.offerCardBody}>
                        <View style={styles.offerAmountRow}>
                          <Icon name="cash" size={24} color="#4CAF50" />
                          <Text style={styles.offerAmount}>₹500 - ₹999</Text>
                        </View>
                        <View style={styles.offerDivider} />
                        <View style={styles.offerBenefitRow}>
                          <Icon name="plus-circle" size={20} color="#4CAF50" />
                          <Text style={styles.offerBenefitText}>{t('get 5% extra bonus')}</Text>
                        </View>
                        <Text style={styles.offerExample}>{t('example')}: ₹500 {t('recharge')} = ₹525 {t('in wallet')}</Text>
                      </View>
                    </View>

                    <View style={[styles.offerCard, styles.premiumOfferCard]}>
                      <View style={styles.premiumBadgeContainer}>
                        <Text style={styles.premiumBadgeText}>{t('best value')}</Text>
                      </View>
                      <View style={styles.offerCardHeader}>
                        <View style={[styles.offerBadge, styles.premiumBadge]}>
                          <Icon name="star" size={20} color="#FFD700" />
                          <Text style={styles.offerBadgeText}>10%</Text>
                        </View>
                        <Text style={styles.offerCardTitle}>{t('premium bonus')}</Text>
                      </View>
                      <View style={styles.offerCardBody}>
                        <View style={styles.offerAmountRow}>
                          <Icon name="cash-multiple" size={24} color="#FF6B35" />
                          <Text style={[styles.offerAmount, styles.premiumAmount]}>₹1000+</Text>
                        </View>
                        <View style={styles.offerDivider} />
                        <View style={styles.offerBenefitRow}>
                          <Icon name="plus-circle" size={20} color="#FF6B35" />
                          <Text style={[styles.offerBenefitText, styles.premiumBenefitText]}>{t('get 10% extra bonus')}</Text>
                        </View>
                        <Text style={styles.offerExample}>{t('example')}: ₹1000 {t('recharge')} = ₹1100 {t('in wallet')}</Text>
                      </View>
                    </View>
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#0D47A1',
  },
  container: {
    minHeight: '100%',
    backgroundColor: '#0D47A1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 10,
    height: height * 0.12,
    justifyContent: 'space-between', // Added to position elements
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1, // Added to keep title centered
    textAlign: 'left',
    left: 5
  },
  refreshButton: {
    padding: 8,
    width: 40, // Match backButton width for symmetry
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshIcon: {
    opacity: 0.9,
  },
  mainContent: {
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 25, // reduced from 30
    borderTopRightRadius: 25, // reduced from 30
    paddingTop: 30, // reduced from 35
    paddingBottom: 25, // reduced from 30
    height: '100%',
  },
  balanceCard: {
    backgroundColor: '#4285F4',
    marginHorizontal: 14, // reduced from 16
    marginBottom: 10, // reduced from 12
    borderRadius: 16, // reduced from 18
    marginTop: -20, // reduced from -25
    elevation: 6, // reduced from 8
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 }, // reduced from 4
    shadowOpacity: 0.25, // reduced from 0.3
    shadowRadius: 6, // reduced from 8
    padding: 7
  },
  balanceContainer: {
    padding: 10, // reduced from 12
  },
  balanceTitle: {
    color: '#fff',
    fontSize: 12, // reduced from 13
    opacity: 0.9,
    marginBottom: 5, // reduced from 6
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 22, // reduced from 24
    fontWeight: 'bold',
  },
  walletIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 5, // reduced from 6
    borderRadius: 10, // reduced from 12
  },
  addMoneyCard: {
    backgroundColor: '#fff',
    borderRadius: 16, // reduced from 18
    marginHorizontal: 14, // reduced from 16
    padding: 15, // reduced from 15
    elevation: 3, // reduced from 4
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3, // reduced from 4
  },
  addMoneyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  addMoneyTitle: {
    fontSize: 15, // reduced from 16
    fontWeight: 'bold',
    color: '#333',
  },
  offerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  offerButtonText: {
    color: '#FF6B35',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#eee',
    height: 40, // reduced from 42
  },
  rupeeSymbol: {
    fontSize: 16, // reduced from 18
    color: '#333',
    marginRight: 2,
  },
  amountInput: {
    flex: 1,
    fontSize: 16, // reduced from 18
    padding: 5, // reduced from 6
    color: '#333',
    height: 36, // reduced from 38
  },
  quickAmountTitle: {
    fontSize: 12, // reduced from 13
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
    marginBottom: 6,
  },
  quickAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12, // reduced from 15
  },
  amountButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 8, // reduced from 10
    paddingHorizontal: 16, // reduced from 20
    marginRight: 8,
  },
  selectedAmount: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  amountButtonText: {
    color: '#666',
    fontSize: 15, // reduced from 16
    fontWeight: '600',
  },
  selectedAmountText: {
    color: '#4CAF50',
  },
  bonusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 8, // reduced from 10
    borderRadius: 6, // reduced from 8
    marginTop: 6, // reduced from 8
    marginBottom: 10, // reduced from 12
  },
  bonusText: {
    color: '#4CAF50',
    fontSize: 12, // reduced from 13
    marginLeft: 6,
    flex: 1,
  },
  continueButton: {
    backgroundColor: '#4285F4',
    borderRadius: 8, // reduced from 10
    paddingVertical: 12, // reduced from 14
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5, 
    marginBottom: 5
  },
  continueButtonDisabled: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 15, // reduced from 16
    fontWeight: 'bold',
    marginRight: 6, // reduced from 8
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 10, // reduced from 12
    padding: 10, // reduced from 12
    marginHorizontal: 14, // reduced from 16
    marginBottom: 14, // reduced from 16
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    color: '#666',
    fontSize: 13,
    lineHeight: 18,
  },
  referralButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12, // reduced from 15
    padding: 10, // reduced from 16
    marginTop: 5, // reduced from 7
    marginBottom: 8, // reduced from 10
    borderWidth: 1,
    borderColor: '#0D47A1',
    width: '70%',
    alignSelf: 'center',
  },
  referralButtonText: {
    color: '#0D47A1',
    fontSize: 13, // reduced from 14
    fontWeight: '600',
    marginLeft: 6, // reduced from 8
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 6, // reduced from 8
    paddingHorizontal: 10, // reduced from 12
    borderRadius: 6, // reduced from 8
    marginTop: 8, // reduced from 10
    alignSelf: 'flex-start',
  },
  historyButtonText: {
    color: '#fff',
    fontSize: 12, // reduced from 13
    marginLeft: 4, // reduced from 6
    fontWeight: '500',
  },
  supportInfoContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginTop: 14,
    marginHorizontal: 14,
  },
  supportHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  supportInfoHeading: {
    color: '#333',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 12,
    textAlign: 'center',
  },
  supportContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D47A1',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  supportContactButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  refreshLink: {
    color: '#0D47A1',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  helpHeader: {
    alignItems: 'center',
    marginBottom: 25,
    marginTop: 10,
  },
  helpTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 8,
  },
  helpSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  helpOptions: {
    marginTop: 10,
  },
  helpOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
  },
  helpIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  helpOptionContent: {
    flex: 1,
  },
  helpOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  helpOptionSubtext: {
    fontSize: 13,
    color: '#666',
  },
  helpFooter: {
    textAlign: 'center',
    color: '#666',
    fontSize: 13,
    marginTop: 20,
  },
  helpFooterLink: {
    color: '#0D47A1',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  closeIconButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 8,
    zIndex: 1,
  },
  offerModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '92%',
    maxHeight: '85%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  offerHeader: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  offerIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  offerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  offerSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  offersList: {
    marginBottom: 20,
  },
  offerScrollContent: {
    paddingBottom: 24,
  },
  offerCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  premiumOfferCard: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF6B35',
    position: 'relative',
  },
  premiumBadgeContainer: {
    position: 'absolute',
    top: -10,
    right: 15,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  premiumBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  offerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  offerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10,
  },
  premiumBadge: {
    backgroundColor: '#FFE0B2',
  },
  offerBadgeText: {
    color: '#333',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  offerCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  offerCardBody: {
    paddingTop: 8,
  },
  offerAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  offerAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginLeft: 10,
  },
  premiumAmount: {
    color: '#FF6B35',
  },
  offerDivider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 10,
  },
  offerBenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  offerBenefitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 8,
  },
  premiumBenefitText: {
    color: '#FF6B35',
  },
  offerExample: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
    paddingLeft: 28,
  },
  walletInfoButtonContainer: {
    marginHorizontal: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  walletInfoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  walletInfoButtonText: {
    marginLeft: 8,
    color: '#0D47A1',
    fontSize: 14,
    fontWeight: '600',
  },
  videoModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    width: '90%',
    maxWidth: 380,
    elevation: 5,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    marginTop: 10,
    textAlign: 'center',
  },
  videoPlayer: {
    width: '100%',
    height: 320,
    borderRadius: 12,
    backgroundColor: '#000',
  },
});

export default WalletScreen; 
