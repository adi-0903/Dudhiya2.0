import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getCurrentMarketPrice, setMarketPrice, getWalletBalance, getRateChart, updateRateChart } from '../services/api';
import BottomNav from '../components/BottomNav';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RateChartScreen = () => {
  const navigation = useNavigation();
  const [currentRate, setCurrentRate] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchCurrentRate();
      fetchRateChart();
    }, [])
  );

  const fetchCurrentRate = async () => {
    try {
      setIsLoading(true);
      const response = await getCurrentMarketPrice();
      if (response && response.price) {
        setCurrentRate(response.price.toString());
      }
    } catch (error) {
      console.error('Error fetching current rate:', error);
      setCurrentRate('0');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRateChart = async () => {
    setIsLoading(true);
    try {
      const response = await getRateChart();
      if (response?.currentRate) {
        setCurrentRate(response.currentRate.toString());
      }
    } catch (error) {
      console.error('Error fetching rate chart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRateChange = (text) => {
    // Remove any non-numeric characters except decimal point
    const sanitizedText = text.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const decimalCount = (sanitizedText.match(/\./g) || []).length;
    if (decimalCount > 1) {
      return;
    }
    
    // Limit to 2 decimal places
    if (sanitizedText.includes('.')) {
      const [whole, decimal] = sanitizedText.split('.');
      if (decimal && decimal.length > 2) {
        return;
      }
    }
    
    // Update state with sanitized value
    setCurrentRate(sanitizedText);
  };

  const handleSave = async () => {
    if (!currentRate) {
      Alert.alert(t('error'), t('please enter a milk rate'));
      return;
    }

    const rate = parseFloat(currentRate);
    if (isNaN(rate) || rate <= 0) {
      Alert.alert(t('error'), t('please enter a valid milk rate greater than 0'));
      return;
    }

    try {
      setIsSaving(true);
      await updateRateChart({
        currentRate: rate
      });
      Alert.alert(t('success'), t('milk rate updated successfully'));
      setCurrentRate(rate.toString());
    } catch (error) {
      Alert.alert(t('error'), error.error || t('failed to update milk rate'));
    } finally {
      setIsSaving(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchCurrentRate().finally(() => setRefreshing(false));
  }, []);

  const handleOpenWebApp = async () => {
    try {
      await Linking.openURL('https://dudhiya.netpy.in/dashboard');
    } catch (error) {
      Alert.alert('Error', 'Could not open web app');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('set milk rate')}</Text>
      </View>

      {/* Main Content */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4285F4']}
            tintColor="#4285F4"
          />
        }
      >
        <View style={styles.rateContainer}>
          {/* Current Rate Card - Now Editable */}
          <View style={styles.currentRateCard}>
            <View style={styles.currentRateHeader}>
              <Icon name="chart-line" size={24} color="#0D47A1" />
              <Text style={styles.currentRateLabel}>{t('current milk rate')}</Text>
            </View>
            {isLoading ? (
              <ActivityIndicator size="large" color="#0D47A1" style={styles.loader} />
            ) : (
              <View style={styles.currentRateValue}>
                <Text style={styles.rupeeSymbol}>₹</Text>
                <TextInput
                  style={styles.rateInput}
                  value={currentRate}
                  onChangeText={handleRateChange}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#0D47A1"
                  maxLength={7}
                />
              </View>
            )}
          </View>

          {/* Save Button */}
          <TouchableOpacity 
            style={[styles.saveButton, (isSaving || !currentRate) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving || !currentRate}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>{t('save changes')}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.bulkEditCard}>
            <View style={styles.bulkEditTopRow}>
              <View style={styles.bulkEditIconWrap}>
                <Icon name="laptop" size={28} color="#0D47A1" />
              </View>
              <View style={styles.bulkEditContent}>
                <Text style={styles.bulkEditTitle}>{t('edit milk rate in bulk')}</Text>
                <Text style={styles.bulkEditDescription}>{t('edit multiple collection milk rates from the web dashboard')}</Text>
                <View style={styles.bulkEditTag}>
                  <Icon name="web" size={16} color="#0D47A1" />
                  <Text style={styles.bulkEditTagUrl}>dudhiya.netpy.in</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.bulkEditButton} onPress={handleOpenWebApp}>
              <Text style={styles.bulkEditButtonText}>{t('open website')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

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
    marginRight: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  rateContainer: {
    padding: 20,
  },
  currentRateCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
  },
  currentRateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  currentRateLabel: {
    fontSize: 16,
    color: '#666',
    marginLeft: 10,
    fontWeight: '500',
  },
  currentRateValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  rupeeSymbol: {
    fontSize: 40,
    color: '#0D47A1',
    fontWeight: 'bold',
    marginRight: 4,
  },
  rateInput: {
    fontSize: 40,
    color: '#0D47A1',
    fontWeight: 'bold',
    textAlign: 'center',
    minWidth: 120,
    padding: 0,
    margin: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  bulkEditCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BBDEFB',
    padding: 20,
    marginTop: 20,
    marginBottom: 25,
  },
  bulkEditTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  bulkEditIconWrap: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginRight: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bulkEditContent: {
    flex: 1,
  },
  bulkEditTitle: {
    fontSize: 18,
    color: '#0D47A1',
    fontWeight: '700',
  },
  bulkEditDescription: {
    fontSize: 14,
    color: '#4A4A4A',
    marginTop: 6,
    marginBottom: 12,
  },
  bulkEditTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  bulkEditTagUrl: {
    fontSize: 13,
    color: '#0D47A1',
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  bulkEditButton: {
    backgroundColor: '#0D47A1',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'center',
    minWidth: 300,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bulkEditButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  label: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#4285F4',
    borderRadius: 15,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loader: {
    marginVertical: 20,
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
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
  },
  selectedOption: {
    backgroundColor: '#0D47A1',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOptionText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalCloseButton: {
    marginTop: 10,
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#666',
    fontSize: 16,
  },
});

export default RateChartScreen; 
