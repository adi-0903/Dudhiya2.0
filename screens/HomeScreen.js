import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Modal, Linking, Alert, Clipboard, ScrollView, ActivityIndicator, RefreshControl, Image, Animated, Easing, Dimensions } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { getDairyInfo, getWalletBalance, getUserInfo, getCurrentMarketPrice, getWalletTransactions } from '../services/api';
import BottomNav from '../components/BottomNav';
import UpdateService from '../utils/updateService';
import HowToUseApp from '../components/HowToUseApp';
import CollectionTypeSelectorModal from '../components/CollectionTypeSelectorModal';

const LANGUAGES = {
  'en': 'English',
  'hi': 'हिंदी',
  'pa': 'ਪੰਜਾਬੀ'
};

const HomeScreen = () => {
  const ANIMAL_TYPE_STORAGE_KEY = '@selected_animal_type';
  const navigation = useNavigation();
  const route = useRoute();
  const { t, i18n } = useTranslation();
  const [dairyName, setDairyName] = useState('');
  const [currentLanguage, setCurrentLanguage] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);
  const [showLowWalletPopup, setShowLowWalletPopup] = useState(false);
  const [currentRate, setCurrentRate] = useState(null);
  const [marketPriceData, setMarketPriceData] = useState(null);
  const [isLoadingRate, setIsLoadingRate] = useState(true);
  const [isLoadingDairyInfo, setIsLoadingDairyInfo] = useState(true);
  const [supportPhoneNumber] = useState('+91 7454860294');
  const [dairyInfo, setDairyInfo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showDairyInfoPopup, setShowDairyInfoPopup] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [referralCode, setReferralCode] = useState('');
  const [copyStatus, setCopyStatus] = useState(t('copy'));
  const [creditTransactions, setCreditTransactions] = useState([]);
  const [showNotification, setShowNotification] = useState(true);
  const [currentNotificationIndex, setCurrentNotificationIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const textWidth = useRef(0);
  const screenWidth = Dimensions.get('window').width;
  const [showCollectionTypeModal, setShowCollectionTypeModal] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState('cow+buffalo');

  const isFlatRateType =
    dairyInfo?.rate_type === 'kg_only' || dairyInfo?.rate_type === 'liters_only';

  const menuItems = [
    {
      name: t('supplier'),
      icon: 'account-group',
      screen: 'Customer',
      subtitle: t('manage suppliers')
    },
    {
      name: t('milk rate'),
      icon: 'chart-line',
      screen: 'RateChart',
      subtitle: t('set milk rate')
    },
    {
      name: t('collection'),
      icon: 'beaker-plus',
      screen: 'Collection',
      subtitle: t('add milk collection')
    },
    // {
    //   name: t('bulk rate editing'),
    //   icon: 'square-edit-outline',
    //   screen: 'BulkRateEditing',
    //   subtitle: t('edit milk rate in bulk')
    // },
    {
      name: t('reports'),
      icon: 'file-document',
      screen: 'Report',
      subtitle: t('view report')
    },
    {
      name: t('pro-rata') + '\n' + t('collection'),
      icon: 'beaker-plus',
      screen: 'ProRataCollectionScreen',
     // subtitle: t('add milk collection')
    },
    {
      name: t('pro-rata') + '\n ' + t('reports'),
      icon: 'file-document',
      screen: 'ProRataReportScreen',
      //subtitle: t('view pro-rata report')
    }
  ];

  useFocusEffect(
    React.useCallback(() => {
      // Reset Base SNF, Fat/SNF ratio, and step rate selections when Home is focused
      const resetBaseSnf = async () => {
        try {
          // await AsyncStorage.removeItem('@base_snf');
          // await AsyncStorage.removeItem('@fat_snf_ratio');
          // await AsyncStorage.removeItem('@fat_step_up_rate');
          // await AsyncStorage.removeItem('@snf_step_down_rate');
        } catch (e) {
          // Ignore errors silently
        }
      };

      const loadSelectedAnimal = async () => {
        try {
          const savedType = await AsyncStorage.getItem(ANIMAL_TYPE_STORAGE_KEY);
          if (savedType) {
            setSelectedAnimal(savedType);
          }
        } catch (error) {
          console.error('Error loading selected animal type on Home focus:', error);
        }
      };

      const fetchLanguage = async () => {
        try {
          const savedLanguage = await AsyncStorage.getItem('@selected_language');
          if (savedLanguage) {
            setCurrentLanguage(LANGUAGES[savedLanguage]);
            i18n.changeLanguage(savedLanguage);
          }
        } catch (error) {
          setCurrentLanguage('English');
          i18n.changeLanguage('en');
        }
      };

      // Check for updates every time home screen is focused
      const checkForUpdates = async () => {
        try {
          await UpdateService.performHomeScreenUpdateCheck();
        } catch (error) {
          console.log('Error in home screen update check:', error);
        }
      };

      resetBaseSnf();
      fetchLanguage();
      loadSelectedAnimal();
      fetchData();
      fetchUserInfo();
      fetchCreditTransactions();
      checkForUpdates();
    }, [i18n])
  );

  useEffect(() => {
    const loadSelectedAnimal = async () => {
      try {
        const savedType = await AsyncStorage.getItem(ANIMAL_TYPE_STORAGE_KEY);
        if (savedType) {
          setSelectedAnimal(savedType);
        }
      } catch (error) {
        console.error('Error loading selected animal type:', error);
      }
    };

    loadSelectedAnimal();
  }, []);

  const fetchData = async () => {
    setIsLoadingRate(true);
    setIsLoadingDairyInfo(true);
    try {
      // Split these into separate try-catch blocks so one failing doesn't affect the other
      try {
        const rateResponse = await getCurrentMarketPrice();
        if (rateResponse) {
          setMarketPriceData(rateResponse);
        } else {
          setMarketPriceData(null);
          setCurrentRate(0);
        }
      } catch (error) {
        console.log('Error fetching milk rate:', error);
        setMarketPriceData(null);
        setCurrentRate(0);
      }

      try {
        const walletResponse = await getWalletBalance();
        if (walletResponse?.balance) {
          const numBalance = parseFloat(walletResponse.balance);
          if (!isNaN(numBalance)) {
            setWalletBalance(numBalance);
            // Check if balance is less than 50
            if (numBalance < 50) {
              setShowLowWalletPopup(true);
            } else {
              setShowLowWalletPopup(false);
            }
          }
        }
      } catch (error) {
        console.log('Error fetching wallet balance:', error);
        setWalletBalance(0);
      }

      try {
        const dairyResponse = await getDairyInfo();
        console.log('Dairy response:', dairyResponse);
        if (dairyResponse) {
          setDairyName(dairyResponse.dairy_name);
          setDairyInfo(dairyResponse);
        }
      } catch (error) {
        console.log('Error fetching dairy info:', error);
      }
    } finally {
      setIsLoadingRate(false);
      setIsLoadingDairyInfo(false);
    }
  };

  const fetchUserInfo = async () => {
    try {
      const userInfoResponse = await getUserInfo();
      console.log('User Info Response:', userInfoResponse);
      setUserInfo(userInfoResponse);
      setReferralCode(userInfoResponse.referral_code);
      console.log('Referral Code:', userInfoResponse.referral_code);
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const fetchCreditTransactions = async () => {
    try {
      const response = await getWalletTransactions({
        transaction_type: 'CREDIT',
        status: 'SUCCESS',
        page_size: 2
      });
      
      if (response && response.results && response.results.length > 0) {
        // Extra filter to ensure only CREDIT transactions with SUCCESS status are included
        const successCreditOnly = response.results.filter(
          transaction => transaction.transaction_type === 'CREDIT' && transaction.status === 'SUCCESS'
        );
        
        if (successCreditOnly.length > 0) {
          setCreditTransactions(successCreditOnly);
          setShowNotification(true);
          setCurrentNotificationIndex(0);
        }
      }
    } catch (error) {
      console.error('Error fetching credit transactions:', error);
    }
  };

  useEffect(() => {
    if (!marketPriceData) {
      setCurrentRate(0);
      return;
    }

    const basePrice = parseFloat(marketPriceData.price || '0') || 0;
    const cowPrice = marketPriceData.cow_price ? parseFloat(marketPriceData.cow_price) : null;
    const buffaloPrice = marketPriceData.buffalo_price ? parseFloat(marketPriceData.buffalo_price) : null;

    const flatRate = isFlatRateType;

    if (!flatRate) {
      setCurrentRate(basePrice);
      return;
    }

    const normalizedAnimal = (selectedAnimal || '').toLowerCase().replace(/\s+/g, '');

    if (normalizedAnimal === 'cow+buffalo' || normalizedAnimal === 'cow_buffalo' || !normalizedAnimal) {
      setCurrentRate(basePrice);
      return;
    }

    if (normalizedAnimal === 'cow') {
      if (!cowPrice || isNaN(cowPrice) || cowPrice <= 0) {
        setCurrentRate(0);
        return;
      }
      setCurrentRate(cowPrice);
      return;
    }

    if (normalizedAnimal === 'buffalo') {
      if (!buffaloPrice || isNaN(buffaloPrice) || buffaloPrice <= 0) {
        setCurrentRate(0);
        return;
      }
      setCurrentRate(buffaloPrice);
      return;
    }

    setCurrentRate(basePrice);
  }, [marketPriceData, selectedAnimal, dairyInfo]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    Promise.all([
      fetchData(),
      fetchUserInfo(),
      fetchCreditTransactions()
    ]).finally(() => {
      setRefreshing(false);
      if (!dairyName) {
        setShowDairyInfoPopup(true);
      }
    });
  }, [dairyName]);

  const handleWhatsAppPress = async () => {
    const whatsappNumber = '+917454860294';
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
    const phoneNumber = '+917454860294';
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleLanguageChange = () => {
    navigation.navigate('LanguageSelection', { 
      fromScreen: 'Home',
      onSelectLanguage: async (selectedLang) => {
        setCurrentLanguage(LANGUAGES[selectedLang]);
        await i18n.changeLanguage(selectedLang);
        await AsyncStorage.setItem('@selected_language', selectedLang);
        navigation.navigate('Home');
      }
    });
  };

  const handleDairyInfoPress = () => {
    navigation.navigate('DairyInfoScreen');
  };

  const copyToClipboard = () => {
    Clipboard.setString(referralCode);
    setCopyStatus('copied');
    setTimeout(() => {
      setCopyStatus('copy');
    }, 2000);
  };

  const app_url = "https://play.google.com/store/apps/details?id=com.elusifataehyung.MilkManagementApp";

  const shareReferralCode = async () => {
    try {
      const message = t('share message', { referralCode, appUrl: app_url });
      await Share.share({ message });
    } catch (error) {
      console.error('Error sharing referral code:', error);
    }
  };

  const toggleReferralModal = () => {
    if (!showReferralModal) {
      fetchUserInfo();
    }
    setShowReferralModal(!showReferralModal);
  };

  const handleCalculatorPress = () => {
    navigation.navigate('MilkCalculator');
  };

  // Set up the scrolling animation
  useEffect(() => {
    if (creditTransactions.length > 0 && showNotification) {
      // For a continuous animation, we need to consider the actual width of the content
      // Start animation from screen width (offscreen right) and move to negative of text width
      const startScrolling = () => {
        scrollX.setValue(screenWidth);
        Animated.timing(scrollX, {
          toValue: -textWidth.current,
          duration: (screenWidth + textWidth.current) * 15, // Speed calibration (15ms per pixel)
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished && showNotification) {
            startScrolling(); // Restart the animation when it completes
          }
        });
      };
      
      // Start the animation
      startScrolling();
    }
    
    // Cleanup function to stop animation when component unmounts
    return () => {
      scrollX.stopAnimation();
    };
  }, [creditTransactions, showNotification]);

  // Helper function to measure text width
  const onTextLayout = (event) => {
    if (textWidth.current === 0) {
      textWidth.current = event.nativeEvent.layout.width;
    }
  };

  const handleCloseNotification = () => {
    if (currentNotificationIndex < creditTransactions.length - 1) {
      // If there are more notifications, show the next one
      setCurrentNotificationIndex(currentNotificationIndex + 1);
    } else {
      // If this is the last notification, hide the notification component
      setShowNotification(false);
    }
  };

  // Add a debug log to verify what's happening with notifications
  useEffect(() => {
    if (creditTransactions.length > 0) {
      console.log(`Showing notification ${currentNotificationIndex + 1} of ${creditTransactions.length}`);
    }
  }, [creditTransactions, currentNotificationIndex]);

  // Temporary test flag: force show a notification banner for visual testing
  const TEST_NOTIFICATION = false; // TODO: set to false/remove after testing
  const hasRealNotification = creditTransactions.length > 0 && showNotification;
  const [showTestNotification, setShowTestNotification] = useState(TEST_NOTIFICATION);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0D47A1']}
            tintColor="#0D47A1"
            progressBackgroundColor="#fff"
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../assets/Dudhiya-logo.png')} 
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>
            
            <Text 
              style={styles.dairyNameHeader}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {dairyName}
            </Text>

            <TouchableOpacity 
              style={styles.languageButton}
              onPress={handleLanguageChange}
            >
              <Text style={styles.languageText}>{t('language')}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.walletBar}>
            <TouchableOpacity 
              style={styles.walletBarContent}
              onPress={handleCalculatorPress}
            >
              <View style={styles.walletInfo}>
                <Icon name="calculator" size={24} color="#fff" />
                <Text style={styles.walletLabel}> {t('calculator')} </Text>
              </View>
              
              <View style={styles.rightContainer}>
                <TouchableOpacity 
                  style={styles.walletButton}
                  onPress={() => navigation.navigate('Wallet')}
                >
                  <Icon name="wallet" size={18} color="#0D47A1" />
                  <Text style={styles.walletButtonText}>{t('wallet')} {t('recharge')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>

          {/* Low Balance Alert Notification */}
          {walletBalance < 50 && (
            <View style={[styles.notificationContainer, { backgroundColor: '#FFECB3', marginTop: 10, marginBottom: 0 }]}>
              <View style={styles.notificationContent}>
                <Icon name="alert-circle-outline" size={18} color="#FF9800" style={{ marginRight: 5 }} />
                <Text style={[styles.notificationText, { color: '#FF6F00' }]}>
                  {t('your wallet balance is below ₹50.')}
                </Text>
              </View>
              <TouchableOpacity 
                style={{ paddingHorizontal: 10 }}
                onPress={() => navigation.navigate('Wallet')}
              >
                <Text style={{ color: '#0D47A1', fontWeight: 'bold', fontSize: 11.5 }}>{t('recharge')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Wrap the warning bar in a full-width container */}
          <View style={styles.warningContainer}>
            {!isLoadingRate && currentRate !== null && currentRate === 0 && (
              <View style={styles.warningBar}>
                <Icon name="alert" size={20} color="#FF4444" />
                <Text style={styles.warningText}>
                  {t('you have not set milk rate. please set the milk rate.')}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.content}>
          {/* Notification with indicator showing which notification is currently displayed */}
          {(hasRealNotification || showTestNotification) ? (
            <View style={styles.notificationContainer}>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationText} numberOfLines={1}>
                  {hasRealNotification
                    ? `${t('amount credited')}: ₹${parseFloat(creditTransactions[currentNotificationIndex].amount).toFixed(2)}${creditTransactions[currentNotificationIndex].description ? ` (${creditTransactions[currentNotificationIndex].description})` : ''}`
                    : 'Test notification: ₹999.00 credited (demo)'}
                </Text>
                {hasRealNotification && creditTransactions.length > 1 && (
                  <Text style={styles.notificationCounter}>
                    {currentNotificationIndex + 1}/{creditTransactions.length}
                  </Text>
                )}
              </View>
              <TouchableOpacity 
                style={styles.notificationCloseButton}
                onPress={hasRealNotification ? handleCloseNotification : () => setShowTestNotification(false)}
              >
                <Icon name="close" size={16} color="#0D47A1" />
              </TouchableOpacity>
            </View>
          ) : (
            <Text></Text>
          )}

          <View style={styles.menuGrid}>
            {/* First row */}
            <View style={styles.menuRow}>
              <TouchableOpacity 
                style={[styles.menuBox, !menuItems[0].subtitle && styles.menuBoxCompact]}
                onPress={() => navigation.navigate(menuItems[0].screen)}
              >
                <View style={[styles.iconBox, !menuItems[0].subtitle && styles.iconBoxCompact]}>
                  <Icon name={menuItems[0].icon} size={24} color="#0D47A1" />
                </View>
                <Text style={[styles.menuBoxText, !menuItems[0].subtitle && styles.menuBoxTextCompact]}>{menuItems[0].name}</Text>
                {menuItems[0].subtitle ? (
                  <Text style={styles.menuBoxSubtext}>{menuItems[0].subtitle}</Text>
                ) : null}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.menuBox, !menuItems[1].subtitle && styles.menuBoxCompact]}
                onPress={() => navigation.navigate(menuItems[1].screen)}
              >
                <View style={[styles.iconBox, !menuItems[1].subtitle && styles.iconBoxCompact]}>
                  <Icon name={menuItems[1].icon} size={24} color="#0D47A1" />
                </View>
                <Text style={[styles.menuBoxText, !menuItems[1].subtitle && styles.menuBoxTextCompact]}>{menuItems[1].name}</Text>
                {menuItems[1].subtitle ? (
                  <Text style={styles.menuBoxSubtext}>{menuItems[1].subtitle}</Text>
                ) : null}
                {!isLoadingRate && currentRate !== null && (
                  <View style={styles.priceTag}>
                    <Text style={styles.priceTagText}>₹{currentRate || '0'}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Second row */}
            <View style={styles.menuRow}>
              <TouchableOpacity 
                style={[styles.menuBox, !menuItems[2].subtitle && styles.menuBoxCompact]}
                onPress={() => navigation.navigate(menuItems[2].screen)}
              >
                <View style={[styles.iconBox, !menuItems[2].subtitle && styles.iconBoxCompact]}>
                  <Icon name={menuItems[2].icon} size={24} color="#0D47A1" />
                </View>
                <Text style={[styles.menuBoxText, !menuItems[2].subtitle && styles.menuBoxTextCompact]}>{menuItems[2].name}</Text>
                {menuItems[2].subtitle ? (
                  <Text style={styles.menuBoxSubtext}>{menuItems[2].subtitle}</Text>
                ) : null}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.menuBox, !menuItems[3].subtitle && styles.menuBoxCompact]}
                onPress={() => navigation.navigate(menuItems[3].screen)}
              >
                <View style={[styles.iconBox, !menuItems[3].subtitle && styles.iconBoxCompact]}>
                  <Icon name={menuItems[3].icon} size={24} color="#0D47A1" />
                </View>
                <Text style={[styles.menuBoxText, !menuItems[3].subtitle && styles.menuBoxTextCompact]}>{menuItems[3].name}</Text>
                {menuItems[3].subtitle ? (
                  <Text style={styles.menuBoxSubtext}>{menuItems[3].subtitle}</Text>
                ) : null}
              </TouchableOpacity>
            </View>
            {menuItems[4] && (
              <View style={styles.menuRow}>
                <TouchableOpacity 
                  style={[
                    styles.menuBox,
                    !menuItems[4].subtitle && styles.menuBoxCompact,
                    isFlatRateType && { opacity: 0.4 }
                  ]}
                  disabled={isFlatRateType}
                  onPress={() => {
                    if (!isFlatRateType) {
                      navigation.navigate(menuItems[4].screen);
                    }
                  }}
                >
                  <View style={[styles.iconBox, !menuItems[4].subtitle && styles.iconBoxCompact]}>
                    <Icon name={menuItems[4].icon} size={24} color="#0D47A1" />
                  </View>
                  <Text style={[styles.menuBoxText, !menuItems[4].subtitle && styles.menuBoxTextCompact]}>{menuItems[4].name}</Text>
                  {menuItems[4].subtitle ? (
                    <Text style={styles.menuBoxSubtext}>{menuItems[4].subtitle}</Text>
                  ) : null}
                </TouchableOpacity>
                {menuItems[5] ? (
                  <TouchableOpacity 
                    style={[
                      styles.menuBox,
                      !menuItems[5].subtitle && styles.menuBoxCompact,
                      isFlatRateType && { opacity: 0.4 }
                    ]}
                    disabled={isFlatRateType}
                    onPress={() => {
                      if (!isFlatRateType) {
                        navigation.navigate(menuItems[5].screen);
                      }
                    }}
                  >
                    <View style={[styles.iconBox, !menuItems[5].subtitle && styles.iconBoxCompact]}>
                      <Icon name={menuItems[5].icon} size={24} color="#0D47A1" />
                    </View>
                    <Text style={[styles.menuBoxText, !menuItems[5].subtitle && styles.menuBoxTextCompact]}>{menuItems[5].name}</Text>
                    {menuItems[5].subtitle ? (
                      <Text style={styles.menuBoxSubtext}>{menuItems[5].subtitle}</Text>
                    ) : null}
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.menuBox, { opacity: 0 }]} />
                )}
              </View>
            )}
          </View>
          
          <View style={styles.bottomSection}>
            <View style={styles.linksContainer}>
              <TouchableOpacity 
                style={styles.linkButton}
                onPress={() => setShowHelpModal(true)}
              >
                <Icon name="headset" size={20} color="#fff" />
                <Text style={styles.linkText}>{t('contact us')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.linkButton}
                onPress={toggleReferralModal}
              >
                <Icon name="share-variant" size={20} color="#fff" />
                <Text style={styles.linkText}>{t('refer/share')}</Text>
              </TouchableOpacity>
            </View>

            {/* <HowToUseApp autoOpen={route?.params?.autoOpenHowTo} /> */}
          </View>
        </View>
      </ScrollView>
      <BottomNav />

      <CollectionTypeSelectorModal
        visible={showCollectionTypeModal}
        onClose={() => setShowCollectionTypeModal(false)}
        onSelectStandard={() => {
          setShowCollectionTypeModal(false);
          navigation.navigate('Collection');
        }}
        onSelectProRata={() => {
          setShowCollectionTypeModal(false);
          navigation.navigate('ProRataCollectionScreen');
        }}
      />

      {/* Low Wallet Balance Popup */}
      <Modal
        visible={showLowWalletPopup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLowWalletPopup(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLowWalletPopup(false)}
        >
          <View style={styles.modalContent}>
            <Icon name="wallet-outline" size={40} color="#FF9800" />
            <Text style={styles.modalTitle}>{t('low balance alert')}</Text>
            <Text style={styles.modalMessage}>
              {t('your wallet balance is below ₹50.')}
            </Text>
            
            <TouchableOpacity 
              style={styles.rechargeModalButton}
              onPress={() => {
                setShowLowWalletPopup(false);
                navigation.navigate('Wallet');
              }}
            >
              <Text style={styles.rechargeModalButtonText}>{t('recharge now')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowLowWalletPopup(false)}
            >
              <Text style={styles.closeButtonText}>{t('later')}</Text>
            </TouchableOpacity>
          </View>
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
              <TouchableOpacity onPress={() => Linking.openURL('https://dudhiya.netpy.in/')}>
                <Text style={styles.helpFooterLink}>www.dudhiya.netpy.in</Text>
              </TouchableOpacity>
            </Text>
            <TouchableOpacity 
              style={styles.closeIconButton}
              onPress={() => setShowHelpModal(false)}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={showReferralModal}
        onRequestClose={toggleReferralModal}
      >
        <TouchableOpacity 
          style={styles.modalContainer} 
          activeOpacity={1} 
          onPress={toggleReferralModal}
        >
          <TouchableOpacity 
            style={styles.referralModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <TouchableOpacity 
              style={styles.closeIconButton} 
              onPress={toggleReferralModal}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>

            <View style={styles.referralHeader}>
              <Icon name="gift" size={48} color="#0D47A1" style={styles.giftIcon} />
              <Text style={styles.referralModalTitle}>{t('invite friends & earn')}</Text>
              <Text style={styles.referralModalSubtitle}>
                {t('share your referral code with friends and both of you will get rewards!')}
              </Text>
            </View>

            <View style={styles.rewardsInfoCard}>
              <View style={styles.rewardItem}>
                <View style={styles.rewardIconContainer}>
                  <Icon name="gift-outline" size={22} color="#fff" />
                </View>
                <View style={styles.rewardTextContainer}>
                  <Text style={styles.rewardAmount}>₹100</Text>
                  <Text style={styles.rewardDescription}>{t('for you')}</Text>
                </View>
              </View>
              
              <View style={styles.rewardDivider} />
              
              <View style={styles.rewardItem}>
                <View style={styles.rewardIconContainer}>
                  <Icon name="account-plus" size={22} color="#fff" />
                </View>
                <View style={styles.rewardTextContainer}>
                  <Text style={styles.rewardAmount}>₹50</Text>
                  <Text style={styles.rewardDescription}>{t('for friend')}</Text>
                </View>
              </View>
            </View>

            <View style={styles.referralCodeSection}>
              <Text style={styles.referralLabel}>{t('your referral code')}</Text>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{referralCode}</Text>
                <TouchableOpacity 
                  style={[
                    styles.copyButton,
                    copyStatus === 'Copied!' && styles.copiedButton
                  ]}
                  onPress={copyToClipboard}
                >
                  <Icon 
                    name={copyStatus === 'Copied!' ? "check" : "content-copy"} 
                    size={16} 
                    color={copyStatus === 'Copied!' ? "#4CAF50" : "#0D47A1"} 
                  />
                  <Text style={[
                    styles.copyButtonText,
                    copyStatus === 'Copied!' && styles.copiedButtonText
                  ]}>
                    {copyStatus}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.shareReferralButton}
              onPress={shareReferralCode}
            >
              <Icon name="share-variant" size={20} color="#fff" />
              <Text style={styles.shareReferralButtonText}>{t('share with friends')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100, // Ensure space above BottomNav so last items are reachable
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 10, // tighter bottom padding to bring cards further up
    backgroundColor: '#0D47A1',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 60,
    height: 60,
    borderRadius: 25,
  },
  dairyNameHeader: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginHorizontal: 10,
    numberOfLines: 1,
    ellipsizeMode: 'tail',
    textAlign: 'center',
  },
  languageButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 11,
  },
  languageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  mainLogoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  brandContainer: {
    alignItems: 'center',
  },
  dairyName: {
    fontSize: 42,
    color: '#0D47A1',
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 15,
    paddingTop: 2, // tighter top padding to move cards further up
    paddingBottom: 0,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 5,
    letterSpacing: 1,
  },
  walletBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  walletBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 5,
  },
  walletLabel: {
    color: '#fff',
    fontSize: 15,
    marginLeft: 0,
    fontWeight: '800',
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
   },
  milkRateText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    right: '150%',
    textAlign: 'left'
  },
  walletButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 80,
    justifyContent: 'center',
  },
  walletButtonText: {
    color: '#0D47A1',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginLeft: 5,
  },
  bottomMenu: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  menuItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  menuText: {
    color: '#0D47A1',
    fontSize: 12,
    marginTop: 5,
  },
  addButton: {
    backgroundColor: '#0D47A1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginTop: 50,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  menuGrid: {
    flex: 0, // Changed from flex: 1 to remove extra space
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 2, // even tighter spacing below grid
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10, // reduce space between rows further
  },
  menuBox: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    aspectRatio: 1.20, // slightly lower ratio to increase height a bit
  },
  iconBox: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(13, 71, 161, 0.08)',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  menuBoxText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  menuBoxSubtext: {
    fontSize: 11,
    color: '#666',
  },
  // Compact variants used when there is no subtitle to avoid empty space
  menuBoxCompact: {
    padding: 17,
    aspectRatio: 1.30, // slightly lower ratio to increase height a bit
  },
  iconBoxCompact: {
    marginBottom: 6,
  },
  menuBoxTextCompact: {
    marginBottom: 0,
  },
  bottomSection: {
    marginTop: 15, // pull section slightly more up toward the grid
    marginBottom: 10,
    gap: 15,
  },
  calculatorButton: {
    width: '80%',
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    padding: 15,
    marginTop: -10
  },
  calcContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calcIconBox: {
    width: 45,
    height: 45,
    backgroundColor: 'rgba(13, 71, 161, 0.08)',
    borderRadius: 22.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  calcTextContainer: {
    alignItems: 'center',
  },
  calculatorButtonText: {
    color: '#0D47A1',
    fontSize: 20,
    fontWeight: 'bold',
  },
  calculatorSubtext: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  linksContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 21,
    marginTop: -8, // reduce gap from cards above further
    marginBottom: 16,
  },
  howToContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: -20,
    marginBottom: 15,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: '#0D47A1',
    elevation: 2,
    shadowColor: '#eeeeee',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  howToButton: {
    backgroundColor: 'transparent',
    elevation: 0,
    shadowColor: 'transparent',
  },
  linkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  howToButtonText: {
    color: '#0D47A1',
    fontSize: 16,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  howToModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    width: '92%',
    maxWidth: 420,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    alignItems: 'center',
  },
  howToTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    marginTop: 10,
    textAlign: 'center',
  },
  howToVideo: {
    width: '100%',
    height: 370,
    borderRadius: 12,
    backgroundColor: '#000',
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
    alignSelf: 'flex-end',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0D47A1',
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    width: '100%',
    marginBottom: 10,
  },
  modalOptionContent: {
    marginLeft: 15,
    flex: 1,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
  },
  modalOptionSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  closeButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#0D47A1',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  referralCodeContainer: {
    backgroundColor: '#ADD8E6',
    padding: 13,
    borderRadius: 15,
    marginVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '70%',
  },
  referralCodeText: {
    fontSize: 20,
    marginRight: 10,
  },
  referralCodeLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 8,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  referralCode: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0D47A1',
    letterSpacing: 1,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#0D47A1',
  },
  copiedButton: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8E9',
  },
  copyButtonText: {
    color: '#0D47A1',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  copiedButtonText: {
    color: '#4CAF50',
  },
  shareReferralButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D47A1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    width: '100%',
    marginTop: 20,
    marginBottom: 15,
  },
  shareReferralButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginLeft: 5,
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 15,
    lineHeight: 22,
  },
  rechargeModalButton: {
    backgroundColor: '#FF9800',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 30,
    width: '100%',
    marginBottom: 10,
  },
  rechargeModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  warningBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    padding: 10,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 8,
    gap: 8,
    width: '100%',
  },
  warningText: {
    color: '#FF4444',
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
    textAlign: 'left',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  referralModalContent: {
    backgroundColor: '#fff',
    width: '90%', // reduced from 90%
    maxWidth: 400, // reduced from 360
    borderRadius: 20, // reduced from 25
    padding: 20, // reduced from 24
    alignItems: 'center',
    position: 'relative',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  closeIconButton: {
    position: 'absolute',
    right: 12, // reduced from 16
    top: 12, // reduced from 16
    padding: 4,
    zIndex: 1,
  },
  referralHeader: {
    alignItems: 'center',
    marginBottom: 16, // reduced from 24
  },
  giftIcon: {
    marginBottom: 12, // reduced from 16
  },
  referralModalTitle: {
    fontSize: 20, // reduced from 24
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 6, // reduced from 8
    textAlign: 'center',
  },
  referralModalSubtitle: {
    fontSize: 13, // reduced from 14
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 16, // reduced from 20
    lineHeight: 18, // reduced from 20
  },
  rewardsInfoCard: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 16, // reduced from 20
    padding: 16, // reduced from 20
    marginBottom: 20, // reduced from 24
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardItem: {
    flex: 1,
    alignItems: 'center',
  },
  rewardDivider: {
    width: 1,
    height: '80%', // reduced from 100%
    backgroundColor: '#E0E0E0',
    marginHorizontal: 12, // reduced from 15
  },
  rewardIconContainer: {
    width: 40, // reduced from 50
    height: 40, // reduced from 50
    borderRadius: 20, // reduced from 25
    backgroundColor: '#0D47A1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6, // reduced from 8
  },
  rewardTextContainer: {
    alignItems: 'center',
  },
  rewardAmount: {
    fontSize: 20, // reduced from 24
    fontWeight: 'bold',
    color: '#0D47A1',
    marginBottom: 2, // reduced from 4
  },
  rewardDescription: {
    fontSize: 12, // reduced from 14
    color: '#666',
  },
  referralCodeSection: {
    width: '100%',
    marginBottom: 20, // reduced from 24
  },
  referralLabel: {
    fontSize: 12, // reduced from 14
    color: '#666',
    marginBottom: 6, // reduced from 8
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    borderRadius: 10, // reduced from 12
    padding: 12, // reduced from 16
  },
  codeText: {
    fontSize: 20, // reduced from 24
    fontWeight: 'bold',
    color: '#1A237E',
    letterSpacing: 1,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12, // reduced from 16
    paddingVertical: 6, // reduced from 8
    borderRadius: 15, // reduced from 20
    borderWidth: 1,
    borderColor: '#0D47A1',
  },
  copiedButton: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8E9',
  },
  copyButtonText: {
    color: '#0D47A1',
    fontSize: 12, // reduced from 14
    fontWeight: '600',
    marginLeft: 4, // reduced from 6
  },
  copiedButtonText: {
    color: '#4CAF50',
  },
  shareReferralButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D47A1',
    width: '100%',
    paddingVertical: 12, // reduced from 16
    borderRadius: 20, // reduced from 25
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  shareReferralButtonText: {
    color: '#fff',
    fontSize: 14, // reduced from 16
    fontWeight: '600',
    marginLeft: 6, // reduced from 8
  },
  calculatorModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  calculatorHeader: {
    alignItems: 'center',
    marginBottom: 25,
    marginTop: 10,
  },
  calculatorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 8,
  },
  calculatorSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  calculatorOptions: {
    marginTop: 10,
  },
  calculatorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
  },
  calculatorIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  calculatorOptionContent: {
    flex: 1,
  },
  calculatorOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  calculatorOptionSubtext: {
    fontSize: 13,
    color: '#666',
  },
  warningContainer: {
    width: '100%',
    paddingHorizontal: 10,
    marginBottom: 0,
    alignItems: 'center',
  },
  priceTag: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#0D47A1',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    elevation: 2,
  },
  priceTagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  notificationContainer: {
    height: 40,
    backgroundColor: '#E8F5E9',
    borderRadius: 5,
    marginTop: 8,
    marginBottom: 10,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationContent: {
    flex: 1,
    paddingLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  notificationCounter: {
    color: '#2E7D32',
    fontSize: 12,
    marginLeft: 8,
    opacity: 0.7,
  },
  notificationCloseButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    padding: 2,
    marginRight: 8,
  },
});

export default HomeScreen; 
