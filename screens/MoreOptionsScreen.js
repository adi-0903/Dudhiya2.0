import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  Platform, 
  Modal,
  Image,
  Linking,
  Animated
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import UpdateService from '../utils/updateService';
import * as Clipboard from 'expo-clipboard';
import { getYouTubeLink } from '../services/api';
import HowToUseApp from '../components/HowToUseApp';

const MoreOptionScreen = () => {
  const navigation = useNavigation();
  const appVersion = Constants.manifest?.version || '1.0.8';
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const supportPhoneNumber = '+917454860294';
  const { t, i18n } = useTranslation();
  const [youtubeLink, setYoutubeLink] = useState(null);
  const [showWebModal, setShowWebModal] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const partnerScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(partnerScale, { toValue: 1.05, duration: 1200, useNativeDriver: true }),
        Animated.timing(partnerScale, { toValue: 1, duration: 1200, useNativeDriver: true })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [partnerScale]);

  useFocusEffect(
    React.useCallback(() => {
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
      
      const checkForUpdatesOnLoad = async () => {
        try {
          setIsCheckingUpdate(true);
          // Check for updates using the correct UpdateService method
          const updateInfo = await UpdateService.checkForUpdates(false);
          setUpdateAvailable(updateInfo && updateInfo.updateAvailable);
        } catch (error) {
          console.log('Error checking for updates on load:', error);
          setUpdateAvailable(false);
        } finally {
          setIsCheckingUpdate(false);
        }
      };
      
      loadSavedLanguage();
      checkForUpdatesOnLoad();
      return () => {};
    }, [i18n])
  );

  const handleLogout = async () => {
    Alert.alert(
      t('logout'),
      t('are you sure you want to logout?'),
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ],
    );
  };

  const handleVersionPress = () => {
    setShowVersionModal(true);
  };

  const checkForUpdates = async () => {
    try {
      await UpdateService.performManualUpdateCheck();
    } catch (error) {
      console.log('Error checking for updates:', error);
      Alert.alert(
        'Update Check Failed',
        'Unable to check for updates. Please try again later.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleWhatsAppPress = async (message) => {
    const whatsappNumber = '+917454860294';
    const cleanedNumber = whatsappNumber.replace(/[^\d]/g, '');
    const encodedMessage = message ? encodeURIComponent(message) : '';
    const appUrl = `whatsapp://send?phone=${cleanedNumber}${encodedMessage ? `&text=${encodedMessage}` : ''}`;
    const webUrl = `https://wa.me/${cleanedNumber}${encodedMessage ? `?text=${encodedMessage}` : ''}`;

    try {
      const canOpenApp = await Linking.canOpenURL(appUrl);
      if (canOpenApp) {
        await Linking.openURL(appUrl);
        return;
      }

      await Linking.openURL(webUrl);
    } catch (error) {
      Alert.alert('Error', 'Could not open WhatsApp');
    }
  };

  const handlePhonePress = () => {
    Linking.openURL(`tel:${supportPhoneNumber}`);
  };

  const callPartner = () => {
    Linking.openURL('tel:+917454860294');
  };

  const openYouTubeChannel = async () => {
    try {
      let url = youtubeLink;
      if (!url) {
        const data = await getYouTubeLink(); // expects { link: string }
        url = data?.link;
        if (url) setYoutubeLink(url);
      }
      if (!url) {
        throw new Error('Missing link');
      }
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(url);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open YouTube');
    }
  };

  const copyWebsiteLink = async () => {
    try {
      await Clipboard.setStringAsync('https://dudhiya.netpy.in/');
    } catch (e) {
      // no-op
    }
  };

  const openWebApp = async () => {
    try {
      await Linking.openURL('https://dudhiya.netpy.in/');
    } catch (e) {
      Alert.alert('Error', 'Could not open web app');
    }
  };

  const handleLanguageChange = () => {
    navigation.navigate('LanguageSelection', { 
      fromScreen: 'MoreOptions',
      onSelectLanguage: async (selectedLang) => {
        await i18n.changeLanguage(selectedLang);
        await AsyncStorage.setItem('@selected_language', selectedLang);
        navigation.navigate('MoreOptions');
      }
    });
  };

  const settingsOptions = [
    { 
      name: t('profile'), 
      icon: 'account-circle', 
      onPress: () => navigation.navigate('Profile') 
    },
    { 
      name: t('wallet'), 
      icon: 'wallet', 
      onPress: () => navigation.navigate('Wallet') 
    },
    { 
      name: t('payment history'), 
      icon: 'history', 
      onPress: () => navigation.navigate('PaymentHistory') 
    },
    {
      name: t('apply referral/coupon code'),
      icon: 'gift',
      onPress: () => navigation.navigate('Referral')
    },
    { 
      name: t('how wallet works?'), 
      icon: 'crown-outline', 
      onPress: () => navigation.navigate('WalletInfo') 
    },
    {
      name: t('become a partner'),
      icon: 'briefcase-account',
      onPress: () => setShowPartnerModal(true),
      highlight: true
    },
    {
      name: t('youtube channel'),
      icon: 'youtube',
      onPress: openYouTubeChannel
    },
    {
      name: t('contact us'),
      icon: 'headset',
      onPress: () => setShowHelpModal(true)
    },
    { 
      name: t('logout'), 
      icon: 'logout', 
      onPress: handleLogout,
      danger: true 
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('more options')}</Text>
        
        <TouchableOpacity 
          style={styles.languageButton}
          onPress={handleLanguageChange}
        >
          <Text style={styles.languageText}>{t('language')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        
        {/* Web App Callout */}
        <View style={styles.webAppCard}>
          <View style={styles.webAppLeft}>
            <Icon name="web" size={26} color="#0D47A1" />
            <View style={styles.webAppTextWrap}>
              <Text style={styles.webAppTitle}>{t('use in laptop')}</Text>
              <Text style={styles.webAppSubtitle}>dudhiya.netpy.in</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.webAppButton} onPress={() => setShowWebModal(true)}>
            <Text style={styles.webAppButtonText}>{t('visit website')}</Text>
          </TouchableOpacity>
        </View>

        {settingsOptions.map((option, index) => {
          const isHighlight = option.highlight;
          const ContainerComponent = isHighlight ? Animated.View : View;
          return (
            <ContainerComponent
              key={index}
              style={isHighlight ? [styles.highlightWrapper, { transform: [{ scale: partnerScale }] }] : null}
            >
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  option.disabled && styles.disabledOption,
                  isHighlight && styles.highlightOptionButton
                ]}
                onPress={option.onPress}
                disabled={option.disabled}
              >
                <View style={styles.optionContent}>
                  <View style={styles.optionLeft}>
                    <Icon 
                      name={option.icon} 
                      size={24} 
                      color={option.danger ? '#FF4444' : '#0D47A1'} 
                    />
                    <Text style={[styles.optionText, option.danger && styles.dangerText, isHighlight && styles.highlightOptionText]}>
                      {option.name}
                    </Text>
                  </View>
                  {option.value ? (
                    <Text style={[styles.versionText, styles.activeVersionText]}>{option.value}</Text>
                  ) : (
                    <Icon 
                      name="chevron-right" 
                      size={24} 
                      color={option.danger ? '#FF4444' : '#0D47A1'} 
                    />
                  )}
                </View>
              </TouchableOpacity>
            </ContainerComponent>
          );
        })}

        {/* <View style={{ marginTop: 20 }}>
          <HowToUseApp />
        </View> */}

        <View style={styles.appInfoContainer}>
          <TouchableOpacity onPress={handleVersionPress}>
            <Text style={styles.appNameText}>Dudhiya</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleVersionPress}>
            <Text style={styles.appVersionText}>Version - v{appVersion}</Text>
          </TouchableOpacity>
          
          {updateAvailable && (
            <TouchableOpacity 
              style={styles.updateNotificationButton}
              onPress={async () => {
                try {
                  const updateInfo = await UpdateService.checkForUpdates(true);
                  if (updateInfo && updateInfo.updateAvailable) {
                    UpdateService.showUpdateDialog(updateInfo);
                  }
                } catch (error) {
                  console.log('Error triggering update:', error);
                }
              }}
            >
              <Icon name="download" size={18} color="#fff" />
              <Text style={styles.updateNotificationText}>
                {t('new update available')}
              </Text>
            </TouchableOpacity>
          )}
          
          {isCheckingUpdate && (
            <View style={styles.checkingUpdateContainer}>
              <Text style={styles.checkingUpdateText}>
                {t('checking for updates...')}
              </Text>
            </View>
          )}
          
          <TouchableOpacity onPress={() => Linking.openURL('https://www.netpy.in/')} activeOpacity={0.85}>
            <Image 
              source={require('../assets/Powered-By-Netpy-Technologies.png')}
              style={styles.netpyLogo}
              resizeMode="contain"
            />
          </TouchableOpacity>

        <View style={styles.madeInIndiaContainer}>
            <Text style={styles.madeInIndiaText}>Proudly Made in India</Text>
            <Text style={styles.flagEmoji}>🇮🇳</Text>
          </View>
        </View>
        
      </ScrollView>

      {/* Partner Program Modal */}
      <Modal
        visible={showPartnerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPartnerModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPartnerModal(false)}
        >
          <TouchableOpacity 
            style={styles.partnerModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <TouchableOpacity 
              style={styles.closeIconButton}
              onPress={() => setShowPartnerModal(false)}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>

            <View style={styles.partnerHeader}>
              <View style={styles.partnerHeaderIconWrap}>
                <Icon name="briefcase-account" size={26} color="#0D47A1" />
              </View>
              <Text style={styles.partnerTitle}>{t('become a partner')}</Text>
              <Text style={styles.partnerSubtitle}>{t('partner intro')}</Text>

              <View style={styles.partnerHighlightCard}>
                <Text style={styles.partnerHighlightTitle}>{t('become a partner')}</Text>
                <Text style={styles.partnerHighlightSubtitle}>{t('contact to become a dealer')}</Text>
              </View>
            </View>

            <View style={styles.partnerList}>
              <View style={styles.partnerItem}>
                <Icon name="check-circle" size={20} color="#2E7D32" style={styles.benefitIcon} />
                <Text style={styles.partnerItemText}>{t('partner benefit manage dairies')}</Text>
              </View>
              <View style={styles.partnerItem}>
                <Icon name="check-circle" size={20} color="#2E7D32" style={styles.benefitIcon} />
                <Text style={styles.partnerItemText}>{t('partner benefit collections')}</Text>
              </View>
              <View style={styles.partnerItem}>
                <Icon name="check-circle" size={20} color="#2E7D32" style={styles.benefitIcon} />
                <Text style={styles.partnerItemText}>{t('partner benefit reports')}</Text>
              </View>
              <View style={styles.partnerItem}>
                <Icon name="check-circle" size={20} color="#2E7D32" style={styles.benefitIcon} />
                <Text style={styles.partnerItemText}>{t('partner benefit earnings')}</Text>
              </View>
            </View>

            <View style={styles.phoneRow}>
              <Icon name="phone" size={20} color="#0D47A1" />
              <Text style={styles.phoneText}>+91 7454 860 294</Text>
            </View>

            <View style={styles.partnerActionRow}>
              <TouchableOpacity
                style={[styles.partnerContactButton, styles.partnerWhatsAppButton]}
                onPress={() => handleWhatsAppPress('Hello, I would like to become a Dudhiya partner.')}
                activeOpacity={0.85}
              >
                <View style={styles.partnerButtonContent}>
                  <Icon name="whatsapp" size={20} color="#fff" />
                  <Text style={styles.partnerWhatsAppButtonText}>{t('whatsapp')}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.partnerContactButton, styles.partnerPrimaryButton]}
                onPress={callPartner}
                activeOpacity={0.85}
              >
                <View style={styles.partnerButtonContent}>
                  <Icon name="phone" size={20} color="#fff" />
                  <Text style={styles.partnerPrimaryButtonText}>{t('call now') || 'Call Now'}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Web Features Modal */}
      <Modal
        visible={showWebModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWebModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowWebModal(false)}
        >
          <TouchableOpacity 
            style={styles.webModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <TouchableOpacity 
              style={styles.closeIconButton}
              onPress={() => setShowWebModal(false)}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>

            <Text style={styles.webModalTitle}>{t('use in laptop')}</Text>
            <Text style={styles.webModalSubtitle}>{t('web version intro')}</Text>

            <View style={styles.webFeaturesList}>
              <View style={styles.webFeatureItem}>
                <Icon name="playlist-plus" size={22} color="#0D47A1" />
                <Text style={styles.webFeatureText}>{t('web feature bulk entries')}</Text>
              </View>
              <View style={styles.webFeatureItem}>
                <Icon name="playlist-edit" size={22} color="#0D47A1" />
                <Text style={styles.webFeatureText}>{t('web feature bulk editing')}</Text>
              </View>
            </View>

            <View style={styles.domainBox}>
              <Text style={styles.domainText}>https://dudhiya.netpy.in/</Text>
            </View>

            <View style={styles.webButtonsRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={copyWebsiteLink}>
                <Text style={styles.secondaryButtonText}>{t('copy link')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={openWebApp}>
                <Text style={styles.primaryButtonText}>{t('open website')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showVersionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowVersionModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowVersionModal(false)}
        >
          <View style={styles.versionModalContent}>
            <View style={styles.versionIconContainer}>
              <Image 
                source={require('../assets/icon.png')} 
                style={styles.iconImage}
                resizeMode="cover"
              />
            </View>
            
            <Text style={styles.appNameText}>Dudhiya</Text>
            
            <View style={styles.versionContainer}>
              <Text style={styles.versionLabel}>{t('app version')}</Text>
              <Text style={styles.versionNumber}>{appVersion}</Text>
            </View>

            <TouchableOpacity 
              style={styles.updateButton}
              onPress={checkForUpdates}
            >
              <Icon name="update" size={20} color="#fff" />
              <Text style={styles.updateButtonText}>{t('check for update')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.poweredByContainer}
              onPress={() => Linking.openURL('https://www.netpy.in/')}
              activeOpacity={0.85}
            >
              <Text style={styles.poweredByText}>Powered by</Text>
              <Text style={styles.companyText}>Netpy Technologies</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowVersionModal(false)}
            >
              <Icon name="close" size={24} color="#666" />
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
          <TouchableOpacity 
            style={styles.helpModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
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
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D47A1',
  },
  header: {
    backgroundColor: '#0D47A1',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'left',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
  },
  optionButton: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 15,
    padding: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  highlightWrapper: {
    borderRadius: 18,
    padding: 2,
    backgroundColor: '#BBDEFB',
    marginBottom: 15,
  },
  highlightOptionButton: {
    backgroundColor: '#E3F2FD',
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#64B5F6',
    shadowColor: '#64B5F6',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  highlightOptionText: {
    fontWeight: '700',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    color: '#0D47A1',
    marginLeft: 15,
    fontWeight: '500',
  },
  dangerText: {
    color: '#FF4444',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  menuItemText: {
    fontSize: 16,
    color: '#0D47A1',
    marginLeft: 15,
    fontWeight: '500',
  },
  disabledOption: {
    opacity: 0.8,
  },
  webAppCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E3F2FD',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  webAppLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  webAppTextWrap: {
    marginLeft: 10,
    flexShrink: 1,
  },
  webAppTitle: {
    color: '#0D47A1',
    fontSize: 15,
    fontWeight: '700',
  },
  webAppSubtitle: {
    color: '#1565C0',
    fontSize: 12,
    marginTop: 2,
  },
  webAppButton: {
    backgroundColor: '#0D47A1',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginLeft: 10,
  },
  webAppButtonText: {
    color: '#fff',
    fontSize: 12.5,
    fontWeight: '600',
  },
  versionText: {
    fontSize: 14,
    color: '#0D47A1',
    fontWeight: '700',
  },
  activeVersionText: {
    color: '#0D47A1',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  versionModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    width: '85%',
    maxWidth: 320,
    alignItems: 'center',
    position: 'relative',
  },
  versionIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  iconImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  appInfoContainer: {
    marginTop: 30,
    marginBottom: 20,
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  appNameText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0D47A1',
    marginBottom: 5,
  },
  appVersionText: {
    fontSize: 14,
    color: '#181818',
    fontWeight: '700',
    marginBottom: 10,
  },
  madeInIndiaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
  },
  madeInIndiaText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  flagEmoji: {
    fontSize: 20,
    marginLeft: 8,
  },
  versionContainer: {
    alignItems: 'center',
    marginVertical: 15,
  },
  versionLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  versionNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D47A1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginTop: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  poweredByContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  poweredByText: {
    fontSize: 14,
    color: '#666',
  },
  companyText: {
    fontSize: 16,
    color: '#0D47A1',
    fontWeight: '500',
    marginTop: 2,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
  },
  helpModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    width: '100%',
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
  webModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 22,
    width: '100%',
    maxWidth: 420,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    alignItems: 'center',
  },
  webModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0D47A1',
    marginTop: 6,
    marginBottom: 8,
    textAlign: 'center',
  },
  webModalSubtitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginBottom: 14,
  },
  domainBox: {
    width: '100%',
    backgroundColor: '#F1F8FF',
    borderWidth: 1,
    borderColor: '#BBDEFB',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  domainText: {
    color: '#0D47A1',
    fontSize: 14,
    fontWeight: '700',
  },
  webFeaturesList: {
    width: '100%',
    marginTop: 6,
    marginBottom: 14,
  },
  webFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F9FF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  webFeatureText: {
    marginLeft: 10,
    color: '#0D47A1',
    fontSize: 14.5,
    fontWeight: '600',
    flexShrink: 1,
  },
  webButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#0D47A1',
    paddingVertical: 12,
    borderRadius: 12,
    marginLeft: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#E3F2FD',
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#BBDEFB',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#0D47A1',
    fontSize: 15,
    fontWeight: '700',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#BBDEFB',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  phoneText: {
    marginLeft: 8,
    color: '#0D47A1',
    fontSize: 16,
    fontWeight: '700',
  },
  partnerModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 22,
    width: '100%',
    maxWidth: 440,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  partnerHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  partnerHeaderIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  partnerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0D47A1',
    textAlign: 'center',
  },
  partnerSubtitle: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginTop: 6,
  },
  partnerHighlightCard: {
    marginTop: 12,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  partnerHighlightTitle: {
    color: '#1B5E20',
    fontSize: 16,
    fontWeight: '800',
  },
  partnerHighlightSubtitle: {
    color: '#2E7D32',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  partnerList: {
    marginTop: 12,
    marginBottom: 12,
  },
  partnerItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F5F9FF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  partnerBullet: {
    color: '#0D47A1',
    fontSize: 18,
    lineHeight: 20,
    marginRight: 8,
  },
  partnerItemText: {
    color: '#0D47A1',
    fontSize: 14.5,
    fontWeight: '600',
    flex: 1,
    flexWrap: 'wrap',
  },
  benefitIcon: {
    marginRight: 8,
  },
  partnerActionRow: {
    marginTop: 8,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  partnerContactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3.5,
  },
  partnerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerWhatsAppButton: {
    backgroundColor: '#25D366',
    marginRight: 10,
  },
  partnerPrimaryButton: {
    backgroundColor: '#0D47A1',
    borderWidth: 1,
    borderColor: '#1565C0',
  },
  partnerWhatsAppButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  partnerPrimaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  howToModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    width: '100%',
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
    marginTop: 20,
    width: '100%',
  },
  helpOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginBottom: 15,
  },
  helpIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  helpOptionContent: {
    flex: 1,
  },
  helpOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  helpOptionSubtext: {
    fontSize: 14,
    color: '#666',
  },
  helpFooter: {
    fontSize: 14,
    color: '#666',
    marginTop: 20,
    textAlign: 'center',
  },
  helpFooterLink: {
    color: '#0D47A1',
    fontWeight: 'bold',
  },
  closeIconButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 5,
  },
  netpyLogo: {
    width: 300,
    height: 50,
    marginBottom: 5,
  },
  languageButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  languageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  updateNotificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 12,
    marginBottom: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  updateNotificationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  checkingUpdateContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
    marginTop: 10,
    marginBottom: 5,
  },
  checkingUpdateText: {
    color: '#666',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default MoreOptionScreen; 
