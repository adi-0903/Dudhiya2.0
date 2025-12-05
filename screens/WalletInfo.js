import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Modal,
  Linking,
  Alert
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCollectionFeeConfig } from '../services/api';

const WalletInfo = () => {
  const navigation = useNavigation();
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [supportPhoneNumber] = useState('+91 7454860294');
  const { t, i18n } = useTranslation();
  const [collectionFeeConfig, setCollectionFeeConfig] = useState(null);
  const [isFeeLoading, setIsFeeLoading] = useState(true);

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
    
    const loadCollectionFee = async () => {
      try {
        const config = await getCollectionFeeConfig();
        setCollectionFeeConfig(config);
      } catch (error) {
        console.error('Error loading collection fee config:', error);
      } finally {
        setIsFeeLoading(false);
      }
    };

    loadSavedLanguage();
    loadCollectionFee();
  }, [i18n]);

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

  const handleSupportPress = () => {
    setShowHelpModal(true);
  };

  const walletSteps = [
    {
      title: t('how to add money') + '?',
      description: t('how to add money description'),
      icon: 'cash-plus',
      color: '#2196F3',
    },
    { 
      title: t('Minimum Balance'),
      description: t('Minimum Balance Description'),
      icon: 'wallet-outline',
      color: '#FF9800',
    },
    {
      title: t('when is balance used?'),
      description: t('when is balance used? description'),
      icon: 'cash-multiple',
      color: '#9C27B0',
    },
    {
      title: t('transaction history'),
      description: t('transaction history description'),
      icon: 'history',
      color: '#00BCD4',
    },
    {
      title: t('Low Balance Alert'),
      description: t('Low Balance Alert Description'),
      icon: 'alert-circle',
      color: '#FF5722',
    },
    {
      title: t('Refund Policy'),
      description: t('Refund Policy Description'),
      icon: 'cash-refund',
      color: '#795548',
    },
    {
      title: t('welcome bonus'),
      description: t('welcome bonus description'),
      icon: 'gift',
      color: '#4CAF50',
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
        <Text style={styles.headerTitle}>{t('how wallet works')}?</Text>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introContainer}>
          <View style={styles.iconCircle}>
            <Icon name="wallet" size={40} color="#fff" />
          </View>
          <Text style={styles.introTitle}>{t('wallet system guide')}</Text>
          <Text style={styles.introText}>
            {t('learn wallet system')}
          </Text>
        </View>

        {!isFeeLoading && collectionFeeConfig && (
          <View style={styles.feeInfoContainer}>
            <View style={styles.feeIconContainer}>
              <Icon name="cash-multiple" size={24} color="#fff" />
            </View>
            <View style={styles.feeTextContainer}>
              <Text style={styles.feeTitle}>{t('wallet fee title')}</Text>
              <Text style={styles.feeDescription}>
                {collectionFeeConfig.enabled
                  ? t('wallet fee description', { rate: Number(collectionFeeConfig.per_kg_rate).toFixed(3) })
                  : t('wallet fee description disabled')}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.stepsContainer}>
          {walletSteps.map((step, index) => (
            <View key={index} style={styles.stepCard}>
              <View style={[styles.stepIconContainer, { backgroundColor: step.color }]}>
                <Icon name={step.icon} size={24} color="#fff" />
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.supportContainer}>
          <Text style={styles.supportTitle}>{t('need help?')}</Text>
          <Text style={styles.supportText}>
            {t('need help? description')}
          </Text>
          <TouchableOpacity 
            style={styles.supportButton}
            onPress={handleSupportPress}
          >
            <Icon name="headphones" size={20} color="#fff" />
            <Text style={styles.supportButtonText}>{t('contact support')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
              <TouchableOpacity onPress={() => Linking.openURL('http://www.netpy.in')}>
                <Text style={styles.helpFooterLink}>www.netpy.in</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D47A1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
    backgroundColor: '#0D47A1',
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
  content: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  introContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 40,
    backgroundColor: '#0D47A1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 5,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0D47A1',
    marginBottom: 10,
  },
  introText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  stepsContainer: {
    padding: 20,
  },
  feeInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 5,
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  feeIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0D47A1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  feeTextContainer: {
    flex: 1,
  },
  feeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0D47A1',
    marginBottom: 4,
  },
  feeDescription: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stepIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  supportContainer: {
    margin: 20,
    padding: 25,
    backgroundColor: '#fff',
    borderRadius: 15,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  supportTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0D47A1',
    marginBottom: 10,
  },
  supportText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D47A1',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 3,
  },
  supportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  helpModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    position: 'relative',
  },
  helpHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  helpTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0D47A1',
    marginTop: 10,
  },
  helpSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  helpOptions: {
    marginBottom: 20,
  },
  helpOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
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
    textAlign: 'center',
    marginTop: 10,
  },
  helpFooterLink: {
    color: '#0D47A1',
    textDecorationLine: 'underline',
  },
  closeIconButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
  },
});

export default WalletInfo; 
