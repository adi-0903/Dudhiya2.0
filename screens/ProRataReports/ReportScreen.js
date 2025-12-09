import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Platform, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import BottomNav from '../../components/BottomNav';
import { useTranslation } from 'react-i18next';
import { Video, ResizeMode } from 'expo-av';

const ProRataReportScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const { t, i18n } = useTranslation();
  const [showHowToModal, setShowHowToModal] = useState(false);
  const howToVideoRef = useRef(null);

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

  // Handle StatusBar only when screen is focused
  useEffect(() => {
    if (isFocused) {
      StatusBar.setBarStyle('light-content');
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('#0D47A1');
      }
    }
    return () => {
      // Reset StatusBar when screen is unfocused
      StatusBar.setBarStyle('default');
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('transparent');
      }
    };
  }, [isFocused]);

  const handleNavigateToCustomerScreen = () => {
    navigation.navigate('Customer');
  };

  const handleNavigateToGenerateFullReportScreen = () => {
    navigation.navigate('GenerateProRataFullReportScreen');
  };

  const handleNavigateToFullCustomerReportScreen = () => {
    navigation.navigate('GenerateProRataFullCustomerReportScreen');
  };

  const handleNavigateToPurchaseReportScreen = () => {
    navigation.navigate('GenerateProRataPurchaseReportScreen');
  };

  const handleNavigateToPurchaseSummaryReportScreen = () => {
    navigation.navigate('GenerateProRataPurchaseSummaryReportScreen');
  };

  const closeHowToModal = async () => {
    try {
      await howToVideoRef.current?.pauseAsync();
    } catch (e) {}
    setShowHowToModal(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>{t('pro-rata reports')}</Text>
          <Text style={styles.headerSubtitle}>{t('generate and view collection reports')}</Text>
        </View>
      </View>

      {/* Main content area with proper flex to allow scrolling */}
      <View style={styles.contentContainer}>
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.buttonContainer}>
            {/* Full Report Button */}
            <TouchableOpacity 
              style={styles.reportButton} 
              onPress={handleNavigateToGenerateFullReportScreen}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
                <Icon name="file-document" size={28} color="#1565C0" />
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.buttonText}>{t('full report')}</Text>
                <Text style={styles.buttonSubText}>{t('view complete collection report')}</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#1565C0" />
            </TouchableOpacity>

            {/* Full Customer Report Button */}
            <TouchableOpacity 
              style={styles.reportButton} 
              onPress={handleNavigateToFullCustomerReportScreen}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#E1F5FE' }]}>
                <Icon name="account-details" size={28} color="#0288D1" />
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.buttonText}>{t('all supplier bill')}</Text>
                <Text style={styles.buttonSubText}>{t('view comprehensive supplier bill')}</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#0288D1" />
            </TouchableOpacity>

            {/* Purchase Report Button */}
            <TouchableOpacity 
              style={styles.reportButton} 
              onPress={handleNavigateToPurchaseReportScreen}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
                <Icon name="calendar" size={28} color="#2E7D32" />
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.buttonText}>{t('purchase report - day wise')}</Text>
                <Text style={styles.buttonSubText}>{t('view collections by date')}</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#2E7D32" />
            </TouchableOpacity>

            {/* Purchase Summary Button */}
            <TouchableOpacity 
              style={styles.reportButton} 
              onPress={handleNavigateToPurchaseSummaryReportScreen}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#FFF3E0' }]}>
                <Icon name="account-group" size={28} color="#EF6C00" />
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.buttonText}>{t('purchase summary - person wise')}</Text>
                <Text style={styles.buttonSubText}>{t('view collections by customer')}</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#EF6C00" />
            </TouchableOpacity>

            {/* Customer Report Button */}
            <TouchableOpacity 
              style={styles.reportButton} 
              onPress={handleNavigateToCustomerScreen}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#E8EAF6' }]}>
                <Icon name="account" size={28} color="#3949AB" />
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.buttonText}>{t('supplier bill')}</Text>
                <Text style={styles.buttonSubText}>{t('view individual supplier bills')}</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#3949AB" />
            </TouchableOpacity>
          </View>

          {/* <View style={styles.howToContainer}>
            <TouchableOpacity 
              style={styles.howToButton}
              onPress={() => setShowHowToModal(true)}
            >
              <Icon name="play-circle" size={20} color="#0D47A1" />
              <Text style={styles.howToButtonText}>{t('how to generate reports?')}</Text>
            </TouchableOpacity>
          </View> */}
          
          {/* Add padding at the bottom to ensure content isn't hidden behind the nav */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>

      <Modal
        visible={showHowToModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeHowToModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeHowToModal}
        >
          <TouchableOpacity 
            style={styles.howToModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <TouchableOpacity 
              style={styles.closeIconButton}
              onPress={closeHowToModal}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>

            <Text style={styles.howToTitle}>{t('how to generate reports?')}</Text>
            <Video
              ref={howToVideoRef}
              style={styles.howToVideo}
              source={require('../../assets/Dudhiya-welcome.mp4')}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              isLooping={false}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <BottomNav />
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
  headerTextContainer: {
    marginLeft: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#E3F2FD',
    fontSize: 13,
    marginTop: 2,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingBottom: 20, // Added padding to ensure content is above bottom nav
  },
  buttonContainer: {
    padding: 20,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonText: {
    fontSize: 16,
    color: '#1A237E',
    fontWeight: '600',
  },
  buttonSubText: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  bottomPadding: {
    height: 60, // Adjust based on the height of your BottomNav
  },
  howToContainer: {
    alignItems: 'center',
    marginTop: -4,
    marginBottom: 8,
  },
  howToButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 1.5,
  },
  howToButtonText: {
    color: '#0D47A1',
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  howToModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  closeIconButton: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  howToTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0D47A1',
    textAlign: 'center',
    marginBottom: 12,
  },
  howToVideo: {
    width: '100%',
    height: 370,
    borderRadius: 12,
    overflow: 'hidden',
  },
});

export default ProRataReportScreen; 

