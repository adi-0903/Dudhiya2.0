import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  Platform,
  Linking,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import DropDownPicker from 'react-native-dropdown-picker';
import { getCollection, getCustomers, updateCollection, deleteCollection, generateCustomerReport } from '../services/api';
import { useTranslation } from 'react-i18next';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';

// TimeModal component with improved UI
const TimeModal = ({ visible, onClose, selectedTime, onSelectTime }) => {
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

  const timeOptions = [
    { 
      value: 'morning', 
      label: 'Morning',
      icon: 'weather-sunny'
    },
    { 
      value: 'evening', 
      label: 'Evening',
      icon: 'weather-sunset'
    }
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('select time')}</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={onClose}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.timeOptions}>
            {timeOptions.map((time) => (
              <TouchableOpacity
                key={time.value}
                style={[
                  styles.timeOption,
                  selectedTime.toLowerCase() === time.value && styles.timeOptionSelected
                ]}
                onPress={() => {
                  onSelectTime(time.label);
                  onClose();
                }}
              >
                <Icon 
                  name={time.icon} 
                  size={24} 
                  color={selectedTime.toLowerCase() === time.value ? '#fff' : '#666'} 
                />
                <Text style={[
                  styles.timeOptionText,
                  selectedTime.toLowerCase() === time.value && styles.timeOptionTextSelected
                ]}>
                  {time.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const EditCollectionScreen = ({ route, navigation }) => {
  // Get collection data from route params
  const collection = route.params?.collection;
  const collectionId = collection?.id;

  // Add isLoading state
  const [isLoading, setIsLoading] = useState(true);
  

  // Initialize with collection data if available
  const initialFormData = {
    customer_id: collection?.customer_id?.toString() || null,
    customer_name: collection?.customer_name || '',
    collection_date: collection?.collection_date ? new Date(collection.collection_date) : new Date(),
    collection_time: collection?.collection_time || 'morning',
    milk_type: collection?.milk_type || '',
    weight: collection?.kg?.toString() || '',
    fat_percentage: collection?.fat_percentage?.toString() || '',
    snf_percentage: collection?.snf_percentage?.toString() || '',
    milk_rate: collection?.milk_rate?.toString() || '',
    base_snf_percentage: collection?.base_snf_percentage?.toString() || '9.0'
  };

  // Other state declarations
  const [formData, setFormData] = useState(initialFormData);
  const [isDirty, setIsDirty] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [errors, setErrors] = useState({});
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState(
    collection?.customer_id ? `${collection.customer_id}-${collection.customer_name}` : ''
  );
  const [showCustomersList, setShowCustomersList] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(
    collection?.customer_id ? {
      id: collection.customer_id.toString(),
      name: collection.customer_name
    } : null
  );
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [showAnimalModal, setShowAnimalModal] = useState(false);
  const animalOptions = ['Cow', 'Buffalo', 'Cow + Buffalo'];
  const [showBaseSnfModal, setShowBaseSnfModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [reportPath, setReportPath] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Constants
  const timeOptions = ['Morning', 'Evening'];
  const allowedBaseSnfValues = ['9.0', '9.1', '9.2', '9.3', '9.5'];

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

  // Fetch collection details on mount
  useEffect(() => {
    if (!collectionId) {
      Alert.alert(t('error'), t('no collection id provided'));
      navigation.goBack();
      return;
    }
    fetchCollectionDetails();
    fetchCustomers();
  }, [collectionId]);

  const fetchCustomers = async () => {
    try {
      setIsLoadingCustomers(true);
      const response = await getCustomers();
      setCustomers(response.results || []);
    } catch (error) {
      Alert.alert(t('error'), t('failed to fetch customers'));
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    setShowCustomersList(text.length > 0);
    
    if (text.length > 0) {
      const filtered = customers.filter(customer => {
        const searchLower = text.toLowerCase();
        return (
          customer.customer_id.toString().includes(searchLower) ||
          customer.name.toLowerCase().includes(searchLower) ||
          (customer.phone && customer.phone.includes(searchLower))
        );
      });
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers([]);
    }
  };

  const handleSelectCustomer = (customer) => {
    const customerId = customer.id?.toString();
    setSelectedCustomer({
      id: customerId,
      name: customer.name,
      customer_id: customer.customer_id
    });
    setSearchQuery(`${customer.customer_id}-${customer.name}`);
    setShowCustomersList(false);
    setFormData(prev => ({
      ...prev,
      customer_id: customerId,
      customer_name: customer.name
    }));
    setIsDirty(true);
  };

  const fetchCollectionDetails = async () => {
    try {
      setIsLoading(true);
      const response = await getCollection(collectionId);
      console.log('API Response structure:', JSON.stringify(response, null, 2));
      console.log('Customer field from API:', response.customer);
      console.log('Customer ID field from API:', response.customer_id);

      // Extract customer information
      // For a new collection, customer ID and name come from the route params
      // For an existing collection being fetched from API, we need the actual customer database ID
      const customerId = response.customer || collection?.customer_id?.toString();
      const customerDisplayId = collection?.customer_id?.toString() || response.customer_id?.toString();
      const customerName = collection?.customer_name || response.customer_name;

      if (!customerDisplayId || !customerName) {
        console.error('Missing customer details:', { customerDisplayId, customerName });
        throw new Error('Invalid customer details');
      }

      // Set the search query to display customer ID and name in the correct format
      const formattedSearchQuery = `${customerDisplayId}-${customerName}`;
      setSearchQuery(formattedSearchQuery);
      
      // Set the selected customer with proper IDs
      setSelectedCustomer({
        id: customerId, // The database ID needed for the API
        name: customerName,
        customer_id: customerDisplayId // The display ID shown to users
      });

      setFormData({
        customer_id: customerId, // Store the database ID needed for the API
        customer_name: customerName,
        collection_date: new Date(response.collection_date),
        collection_time: response.collection_time,
        milk_type: response.milk_type,
        weight: parseFloat(response.kg?.toString() || '').toFixed(2),
        fat_percentage: parseFloat(response.fat_percentage?.toString() || '').toFixed(1),
        snf_percentage: parseFloat(response.snf_percentage?.toString() || '').toFixed(1),
        milk_rate: parseFloat(response.milk_rate?.toString() || '').toFixed(2),
        base_snf_percentage: parseFloat(response.base_snf_percentage?.toString() || '9.0').toFixed(1),
        fat_kg: parseFloat(response.fat_kg?.toString() || '').toFixed(2),
        clr: parseFloat(response.clr?.toString() || '').toFixed(2),
        snf_kg: parseFloat(response.snf_kg?.toString() || '').toFixed(2),
        fat_rate: parseFloat(response.fat_rate?.toString() || '').toFixed(2),
        snf_rate: parseFloat(response.snf_rate?.toString() || '').toFixed(2),
        amount: parseFloat(response.amount?.toString() || '').toFixed(2),
        solid_weight: parseFloat(response.solid_weight?.toString() || '').toFixed(2)
      });

      // Reset the dirty state after loading the initial values
      setIsDirty(false);

      // Log for debugging
      console.log('Setting customer details:', {
        customerId,
        customerName,
        formattedSearchQuery,
        collectionData: collection,
        responseData: response
      });

    } catch (error) {
      console.error('Error fetching collection details:', error);
      Alert.alert('Error', 'Failed to fetch collection details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isLoading || !formData) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0D47A1" />
      </View>
    );
  }

  const validateInputs = () => {
    const newErrors = {};
    
    if (!formData.customer_id) newErrors.customer_id = 'Customer is required';
    if (!formData.weight) newErrors.weight = 'Weight is required';
    if (!formData.fat_percentage) newErrors.fat_percentage = 'Fat % is required';
    if (!formData.snf_percentage) newErrors.snf_percentage = 'SNF % is required';
    if (!formData.milk_rate) newErrors.milk_rate = 'Milk rate is required';
    if (!formData.base_snf_percentage) newErrors.base_snf_percentage = 'Base SNF % is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateSnfFromClr = (clrValue, fatValue) => {
    if (!clrValue || !fatValue) return '';
    const clr = parseFloat(clrValue);
    const fat = parseFloat(fatValue);
    if (isNaN(clr) || isNaN(fat)) return '';
    const snf = (clr/4) + (0.20 * fat) + 0.14;
    return snf.toFixed(1);
  };

  const handleNext = async () => {
    if (validateInputs()) {
      try {
        const weightKg = parseFloat(formData.weight);
        const fatPercentage = parseFloat(formData.fat_percentage);
        const snfPercentage = parseFloat(formData.snf_percentage);
        const milkRate = parseFloat(formData.milk_rate);
        const baseSnfPercentage = parseFloat(formData.base_snf_percentage);

        const liters = (weightKg / 1.02249).toFixed(2);
        const fatKg = String(weightKg * (fatPercentage / 100)).slice(0, (String(weightKg * (fatPercentage / 100)).indexOf('.')) + 3);
        const snfKg = String(weightKg * (snfPercentage / 100)).slice(0, (String(weightKg * (snfPercentage / 100)).indexOf('.')) + 3);
        const clrValue = (4 * (snfPercentage - 0.2 * fatPercentage - 0.14)).toFixed(3);
        
        const fatRate = (milkRate * 60 / 6.5).toFixed(3);
        const snfRate = (milkRate * 40 / baseSnfPercentage).toFixed(3);
        
        const amount = (
          parseFloat(fatKg) * parseFloat(fatRate) +
          parseFloat(snfKg) * parseFloat(snfRate)
        ).toFixed(2);

        // Calculate solid weight
        const solidWeight = (amount / milkRate).toFixed(3);

        // Log the customer ID being used
        console.log('Using customer ID for API:', formData.customer_id);

        const collectionData = {
          customer: formData.customer_id, // This should be the database ID, not the display ID
          collection_date: formData.collection_date.toISOString().split('T')[0],
          collection_time: formData.collection_time.toLowerCase(),
          milk_type: formData.milk_type.toLowerCase(), // Changed from animal_type to milk_type
          measured: 'kg',
          liters: liters.toString(),
          kg: weightKg.toString(),
          fat_percentage: fatPercentage.toString(),
          fat_kg: fatKg.toString(),
          clr: clrValue.toString(),
          snf_percentage: snfPercentage.toString(),
          snf_kg: snfKg.toString(),
          fat_rate: fatRate.toString(),
          snf_rate: snfRate.toString(),
          milk_rate: milkRate.toString(),
          solid_weight: solidWeight,
          amount: amount.toString(),
          base_snf_percentage: baseSnfPercentage.toString()
        };

        setPreviewData(collectionData);
        setShowPreviewModal(true);

      } catch (error) {
        console.error('Calculation error:', error);
        Alert.alert(t('error'), t('failed to prepare collection data'));
      }
    }
  };

  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      console.log('Sending update with data:', JSON.stringify(previewData, null, 2));
      const response = await updateCollection(collection.id, previewData);
      if (response) {
        setIsDirty(false); // Reset dirty state after successful update
        Alert.alert(t('success'), t('collection updated successfully'));
        navigation.goBack();
      }
    } catch (error) {
      console.error('Update Error Response:', error.response?.data);
      
      // Get the error message from the API response
      let errorMessage = t('failed to update collection. this collection has already been edited 1 time.');
      
      if (error.response && error.response.data) {
        // Try to parse the error string if it's in JSON format
        if (typeof error.response.data === 'string' && error.response.data.includes('{')) {
          try {
            const parsedError = JSON.parse(error.response.data);
            if (parsedError.error) {
              errorMessage = parsedError.error;
            }
          } catch (parseError) {
            console.error('Error parsing error response:', parseError);
          }
        } 
        // If it's already an object with an error property
        else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
      setShowPreviewModal(false);
    }
  };

  const handleDelete = async () => {
    // Show confirmation dialog
    Alert.alert(
      t('delete collection'),
      t('are you sure you want to delete this collection? This action cannot be undone.'),
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const response = await deleteCollection(collection.id);
              if (response) {
                setIsDirty(false); // Reset dirty state after successful deletion
                Alert.alert('Success', 'Collection deleted successfully');
                navigation.goBack();
              }
            } catch (error) {
              const errorMessage = error.response?.data?.error || error.message || 'Failed to delete collection';
              Alert.alert('Error', errorMessage);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleGenerateBill = async () => {
    setIsGeneratingPdf(true);
    try {
      if (!formData.customer_id) {
        Alert.alert(t('error'), t('customer id is required to generate bill'));
        return;
      }

      // Format date in DD-MM-YYYY format (matching CustomerReportScreen format)
      const startDate = `${String(formData.collection_date.getDate()).padStart(2, '0')}-${String(formData.collection_date.getMonth() + 1).padStart(2, '0')}-${formData.collection_date.getFullYear()}`;
      const endDate = startDate; // Use same date for single day report
      
      console.log('Generating bill with parameters:', { 
        customer_id: formData.customer_id,
        start_date: startDate, 
        end_date: endDate 
      });

      const fileUri = await generateCustomerReport(formData.customer_id, startDate, endDate);
      console.log('Bill generated successfully:', fileUri);
      setReportPath(fileUri);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error generating bill:', error);
      Alert.alert(t('error'), t('no data found for selected date'));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleViewReport = async () => {
    try {
      if (reportPath) {
        if (Platform.OS === 'android') {
          const { exists } = await FileSystem.getInfoAsync(reportPath);
          
          if (exists) {
            const contentUri = await FileSystem.getContentUriAsync(reportPath);
            await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
              data: contentUri,
              flags: 1,
              type: 'application/pdf'
            });
          } else {
            Alert.alert(t('error'), t('file not found. please generate the bill again.'));
          }
        } else {
          // For iOS
          await Linking.openURL(`file://${reportPath}`);
        }
      } else {
        Alert.alert(t('error'), t('no report to view'));
      }
    } catch (error) {
      console.error('Error opening file:', error);
      // Fallback to sharing if viewing fails
      try {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable && reportPath) {
          await Sharing.shareAsync(reportPath, {
            dialogTitle: 'Open Bill',
            mimeType: 'application/pdf'
          });
        } else {
          Alert.alert(t('error'), t('sharing is not available on this device'));
        }
      } catch (shareError) {
        console.error('Error sharing file as fallback:', shareError);
        Alert.alert(t('error'), t('failed to open the bill. please make sure you have a pdf viewer installed.'));
      }
    }
  };

  const handleShare = async () => {
    try {
      if (reportPath) {
        // First check if sharing is available on this device
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
          Alert.alert(t('error'), t('sharing is not available on this device'));
          return;
        }

        // If available, share the file
        await Sharing.shareAsync(reportPath, {
          dialogTitle: 'Share Bill',
          UTI: 'com.adobe.pdf',
          mimeType: 'application/pdf'
        });
      } else {
        Alert.alert(t('error'), t('no report to share'));
      }
    } catch (error) {
      console.error('Error sharing file:', error);
      Alert.alert(t('error'), t('failed to share the bill'));
    }
  };

  const DatePickerModal = ({ visible, onClose, selectedDate, onSelect }) => {
    const [tempDate, setTempDate] = useState(selectedDate);
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const years = Array.from({length: 5}, (_, i) => new Date().getFullYear() - i);
    
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('select date')}</Text>
            </View>

            <View style={styles.selectedDateDisplay}>
              <Icon name="calendar" size={24} color="#0D47A1" />
              <Text style={styles.selectedDateText}>
                {tempDate.toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </Text>
            </View>
            
            <View style={styles.datePickerContent}>
              <View style={styles.datePickerColumns}>
                {/* Year Column */}
                <View style={styles.dateColumn}>
                  <Text style={styles.datePickerLabel}>{t('year')}</Text>
                  <View style={styles.datePickerScrollContainer}>
                    <ScrollView 
                      style={styles.datePickerScroll}
                      showsVerticalScrollIndicator={false}
                    >
                      {years.map(year => (
                        <TouchableOpacity
                          key={year}
                          style={[
                            styles.datePickerItem,
                            tempDate.getFullYear() === year && styles.datePickerItemSelected
                          ]}
                          onPress={() => {
                            const newDate = new Date(tempDate);
                            newDate.setFullYear(year);
                            setTempDate(newDate);
                          }}
                        >
                          <Text style={[
                            styles.datePickerItemText,
                            tempDate.getFullYear() === year && styles.datePickerItemTextSelected
                          ]}>{year}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>

                {/* Month Column */}
                <View style={styles.dateColumn}>
                  <Text style={styles.datePickerLabel}>{t('month')}</Text>
                  <View style={styles.datePickerScrollContainer}>
                    <ScrollView 
                      style={styles.datePickerScroll}
                      showsVerticalScrollIndicator={false}
                    >
                      {months.map((month, index) => (
                        <TouchableOpacity
                          key={month}
                          style={[
                            styles.datePickerItem,
                            tempDate.getMonth() === index && styles.datePickerItemSelected
                          ]}
                          onPress={() => {
                            const newDate = new Date(tempDate);
                            newDate.setMonth(index);
                            const lastDayOfMonth = new Date(newDate.getFullYear(), index + 1, 0).getDate();
                            if (newDate.getDate() > lastDayOfMonth) {
                              newDate.setDate(lastDayOfMonth);
                            }
                            setTempDate(newDate);
                          }}
                        >
                          <Text style={[
                            styles.datePickerItemText,
                            tempDate.getMonth() === index && styles.datePickerItemTextSelected
                          ]}>{month}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>

                {/* Day Column */}
                <View style={styles.dateColumn}>
                  <Text style={styles.datePickerLabel}>{t('day')}</Text>
                  <View style={styles.datePickerScrollContainer}>
                    <ScrollView 
                      style={styles.datePickerScroll}
                      showsVerticalScrollIndicator={false}
                    >
                      {Array.from(
                        {length: new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, 0).getDate()},
                        (_, i) => i + 1
                      ).map(day => (
                        <TouchableOpacity
                          key={day}
                          style={[
                            styles.datePickerItem,
                            tempDate.getDate() === day && styles.datePickerItemSelected
                          ]}
                          onPress={() => {
                            const newDate = new Date(tempDate);
                            newDate.setDate(day);
                            setTempDate(newDate);
                          }}
                        >
                          <Text style={[
                            styles.datePickerItemText,
                            tempDate.getDate() === day && styles.datePickerItemTextSelected
                          ]}>{String(day).padStart(2, '0')}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => {
                  onSelect(tempDate);
                  onClose();
                }}
              >
                <Text style={styles.confirmButtonText}>{t('confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const DateSelector = () => (
    <TouchableOpacity 
      style={styles.dateSelector}
      onPress={() => setShowDatePicker(true)}
    >
      <Text style={styles.dateSelectorText}>
        {formatDate(formData.collection_date)}
      </Text>
      <Icon name="calendar" size={20} color="#0D47A1" />
    </TouchableOpacity>
  );

  const TimeSelector = ({ value, onPress }) => (
    <TouchableOpacity 
      style={styles.timeSelector}
      onPress={onPress}
    >
      <View style={styles.timeSelectorContent}>
        <Icon 
          name={value.toLowerCase() === 'morning' ? 'weather-sunny' : 'weather-sunset'} 
          size={20} 
          color="#0D47A1" 
        />
        <Text style={styles.timeSelectorText}>
          {value}
        </Text>
      </View>
      <Icon name="chevron-down" size={20} color="#0D47A1" />
    </TouchableOpacity>
  );

  const AnimalTypeSelector = () => {
    const getDisplayText = () => {
      if (!formData.milk_type) return 'Select Animal Type';
      
      switch (formData.milk_type) {
        case 'cow_buffalo':
          return 'Cow + Buffalo';
        case 'cow':
          return 'Cow';
        case 'buffalo':
          return 'Buffalo';
        default:
          return 'Select Animal Type';
      }
    };

    return (
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Animal Type</Text>
        <TouchableOpacity 
          style={styles.animalSelector}
          onPress={() => setShowAnimalModal(true)}
        >
          <Text style={styles.animalSelectorText}>
            {getDisplayText()}
          </Text>
          <Icon name="chevron-down" size={20} color="#0D47A1" />
        </TouchableOpacity>
      </View>
    );
  };

  const AnimalSelectionModal = () => (
    <Modal
      visible={showAnimalModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowAnimalModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('select animal type')}</Text>
          <View style={styles.animalOptions}>
            {animalOptions.map((animal) => (
              <TouchableOpacity
                key={animal}
                style={styles.animalOption}
                onPress={() => {
                  const formattedType = animal === 'Cow + Buffalo' 
                    ? 'cow_buffalo' 
                    : animal.toLowerCase();
                  setFormData(prev => ({
                    ...prev,
                    milk_type: formattedType
                  }));
                  setIsDirty(true);
                  setShowAnimalModal(false);
                }}
              >
                <Text style={styles.animalOptionText}>{animal}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowAnimalModal(false)}
          >
            <Text style={styles.closeButtonText}>{t('cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const BaseSnfSelector = () => (
    <TouchableOpacity
      style={styles.baseSnfSelector}
      onPress={() => setShowBaseSnfModal(true)}
    >
      <View style={styles.baseSnfContent}>
        <Text style={styles.label}>Base SNF %: </Text>
        <Text style={styles.baseSnfValue}>{formData.base_snf_percentage}</Text>
        <Icon name="chevron-down" size={20} color="#0D47A1" />
      </View>
    </TouchableOpacity>
  );

  const BaseSnfModal = () => {
    const allowedBaseSnfValues = ['9.0', '9.1', '9.2', '9.3', '9.4', '9.5'];

    return (
      <Modal
        visible={showBaseSnfModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBaseSnfModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowBaseSnfModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.baseSnfModalContent}>
                <View style={styles.baseSnfModalHeader}>
                  <View style={styles.baseSnfIconContainer}>
                    <Icon name="percent" size={24} color="#0D47A1" />
                  </View>
                  <Text style={styles.baseSnfModalTitle}>{t('select base snf')}</Text>
                  <Text style={styles.baseSnfModalSubtitle}>{t('choose a value between 9.0 and 9.5')}</Text>
                </View>

                <View style={styles.baseSnfOptionsContainer}>
                  {allowedBaseSnfValues.map(value => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.baseSnfOption,
                        formData.base_snf_percentage === value && styles.baseSnfOptionSelected
                      ]}
                      onPress={() => {
                        setFormData(prev => ({ ...prev, base_snf_percentage: value }));
                        setIsDirty(true);
                        setShowBaseSnfModal(false);
                      }}
                    >
                      <Text style={[
                        styles.baseSnfOptionText,
                        formData.base_snf_percentage === value && styles.baseSnfOptionTextSelected
                      ]}>
                        {value}
                      </Text>
                      {formData.base_snf_percentage === value && (
                        <View style={styles.selectedIndicator}>
                          <Icon name="check" size={16} color="#0D47A1" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  // For Weight, Fat% and SNF% input fields - add a common handleInputChange function
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (isDirty) {
              // Confirm discard changes
              Alert.alert(
                t('unsaved changes'),
                t('are you sure you want to discard changes?'),
                [
                  { text: t('cancel'), style: 'cancel' },
                  {
                    text: t('discard'),
                    onPress: () => navigation.goBack(),
                    style: 'destructive',
                  },
                ]
              );
            } else {
              navigation.goBack();
            }
          }}
        >
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>{t('edit collection')}</Text>
          <Text style={styles.headerSubtitle}>
            {formData.collection_date.toLocaleDateString('en-GB')} - {formData.collection_time}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={[styles.headerButton, isGeneratingPdf && styles.disabledButton]}
            onPress={handleGenerateBill}
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Icon name="file-document-outline" size={24} color="#fff" />
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={handleDelete}
          >
            <Icon name="delete" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Customer Search Section */}
        <Text style={styles.searchTitle}>{t('search customers')}</Text>
        <View style={styles.customerSearchContainer}>
          <View style={styles.searchInputContainer}>
            <Icon name="magnify" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by ID, Name or Phone"
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                onPress={() => {
                  setSearchQuery('');
                  setSelectedCustomer(null);
                  setShowCustomersList(false);
                  setFormData(prev => ({
                    ...prev,
                    customer_id: null,
                    customer_name: ''
                  }));
                }}
                style={styles.clearButton}
              >
                <Icon name="close" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity 
            style={styles.addCustomerButton}
            onPress={() => navigation.navigate('Customer')}
          >
            <Icon name="plus" size={20} color="#0D47A1" />
            <Text style={styles.addCustomerText}>{t('add')}</Text>
          </TouchableOpacity>
        </View>

        {/* Customer Search Results */}
        {showCustomersList && (
          <View style={styles.searchResultsContainer}>
            {isLoadingCustomers ? (
              <ActivityIndicator style={styles.searchLoader} color="#0D47A1" />
            ) : filteredCustomers.length > 0 ? (
              <FlatList
                data={filteredCustomers}
                keyExtractor={(item) => item.id.toString()}
                style={[styles.searchResults, { maxHeight: 200 }]}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.searchResultItem}
                    onPress={() => handleSelectCustomer(item)}
                  >
                    <View>
                      <Text style={styles.customerName}>{item.customer_id}-{item.name}</Text>
                      <Text style={styles.customerDetails}>
                        {item.phone || 'No phone'}
                      </Text>
                    </View>
                    {item.id === selectedCustomer?.id && (
                      <Icon name="check" size={20} color="#4CAF50" />
                    )}
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>No customers found</Text>
              </View>
            )}
          </View>
        )}

        {/* Date and Time Row */}
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity 
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>
                {formData.collection_date.toLocaleDateString('en-GB')}
              </Text>
              <Icon name="calendar" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Time</Text>
            <TouchableOpacity 
              style={styles.timePickerButton}
              onPress={() => setShowTimeModal(true)}
            >
              <Text style={styles.timeText}>{formData.collection_time}</Text>
              <Icon name="clock-outline" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Animal Type Row */}
        <View style={styles.row}>
          <AnimalTypeSelector />
          <AnimalSelectionModal />
        </View>

        {/* Weight and Fat % Row */}
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Weight (kg)</Text>
            <TextInput
              value={formData.weight}
              onChangeText={(text) => {
                // Remove any non-numeric characters except decimal point
                const sanitizedText = text.replace(/[^0-9.]/g, '');
                
                // Ensure only one decimal point
                const parts = sanitizedText.split('.');
                if (parts.length > 2) return;
                
                // Limit to two decimal places
                if (parts[1] && parts[1].length > 2) return;
                
                handleInputChange('weight', sanitizedText);
              }}
              keyboardType="decimal-pad"
              style={styles.textInput}
              error={errors.weight}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Fat %</Text>
            <TextInput
              value={formData.fat_percentage}
              onChangeText={(text) => {
                // Remove any non-numeric characters except decimal point
                const sanitizedText = text.replace(/[^0-9.]/g, '');
                
                // Ensure only one decimal point
                const parts = sanitizedText.split('.');
                if (parts.length > 2) return;
                
                // Limit to one decimal place
                if (parts[1] && parts[1].length > 1) return;
                
                // Check if value is between 3.0 and 12.9
                const numValue = parseFloat(sanitizedText);
                if (numValue < 4.0 || numValue > 12.9) return;
                
                handleInputChange('fat_percentage', sanitizedText);
              }}
              keyboardType="decimal-pad"
              style={styles.textInput}
              error={errors.fat_percentage}
              placeholder="4.0 - 12.9"
            />
          </View>
        </View>

        {/* SNF Input Field */}
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>SNF %</Text>
            <TextInput
              value={formData.snf_percentage}
              onChangeText={(text) => {
                // Remove any non-numeric characters except decimal point
                const sanitizedText = text.replace(/[^0-9.]/g, '');
                
                // Ensure only one decimal point
                const parts = sanitizedText.split('.');
                if (parts.length > 2) return;
                
                // Limit to one decimal place
                if (parts[1] && parts[1].length > 1) return;
                
                // Check if value is between 4.0 and 10.9
                const numValue = parseFloat(sanitizedText);
                if (numValue < 4.0 || numValue > 9.9) return;
                
                handleInputChange('snf_percentage', sanitizedText);
              }}
              keyboardType="decimal-pad"
              style={[styles.textInput, errors.snf_percentage && styles.inputError]}
              placeholder="4.0 - 9.9"
            />
            {errors.snf_percentage && (
              <Text style={styles.errorText}>{errors.snf_percentage}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Milk Rate</Text>
            <TextInput
              value={formData.milk_rate}
              onChangeText={(text) => {
                // Remove any non-numeric characters except decimal point
                const sanitizedText = text.replace(/[^0-9.]/g, '');
                
                // Ensure only one decimal point
                const parts = sanitizedText.split('.');
                if (parts.length > 2) return;
                
                // Limit to two decimal places
                if (parts[1] && parts[1].length > 2) return;
                
                handleInputChange('milk_rate', sanitizedText);
              }}
              keyboardType="decimal-pad"
              style={styles.textInput}
              placeholder="₹50.00"
            />
          </View>
        </View>

        {/* Base SNF Section - Moved to bottom */}
        <View style={styles.baseSnfSection}>
          <BaseSnfSelector />
          <BaseSnfModal />
        </View>

        <TouchableOpacity 
          style={[
            styles.nextButton,
            (!formData.weight || !formData.fat_percentage || !formData.snf_percentage) && styles.nextButtonDisabled
          ]}
          onPress={handleNext}
          disabled={!formData.weight || !formData.fat_percentage || !formData.snf_percentage}
        >
          <Text style={styles.nextButtonText}>{t('next')}</Text>
          <Icon name="arrow-right" size={20} color="#fff" />
        </TouchableOpacity>
      </ScrollView>

      {/* Preview Modal */}
      <Modal
        visible={showPreviewModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPreviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.previewModalContent}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewHeaderTitle}>{t('collection preview')}</Text>
            </View>

            <ScrollView style={styles.previewScrollView}>
              {previewData && (
                <View style={styles.previewContainer}>
                  {/* Customer Info */}
                  <View style={styles.previewSection}>
                    <View style={styles.previewSectionHeader}>
                      <Icon name="account" size={20} color="#0D47A1" />
                      <Text style={styles.previewSectionTitle}>{t('customer details')}</Text>
                    </View>
                    <View style={styles.previewCard}>
                      <Text style={styles.customerName}>{selectedCustomer?.customer_id || selectedCustomer?.id}-{selectedCustomer?.name}</Text>
                      <View style={styles.dateTimeContainer}>
                        <Text style={styles.dateTimeText}>
                          {formData.collection_date.toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })} - {formData.collection_time}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Collection Details */}
                  <View style={styles.previewSection}>
                    <View style={styles.previewSectionHeader}>
                      <Icon name="water" size={20} color="#0D47A1" />
                      <Text style={styles.previewSectionTitle}>{t('collection details')}</Text>
                    </View>
                    <View style={styles.previewCard}>
                      <View style={[styles.previewRow, { marginBottom: 16 }]}>  {/* Added marginBottom */}
                        <View style={styles.previewItem}>
                          <Text style={styles.previewLabel}>Weight</Text>
                          <Text style={styles.previewValue}>{parseFloat(formData.weight)} KG</Text>
                        </View>
                        <View style={styles.previewItem}>
                          <Text style={styles.previewLabel}>Fat %</Text>
                          <Text style={styles.previewValue}>{parseFloat(formData.fat_percentage)}</Text>
                        </View>
                        <View style={styles.previewItem}>
                          <Text style={styles.previewLabel}>SNF %</Text>
                          <Text style={styles.previewValue}>{parseFloat(formData.snf_percentage)}</Text>
                        </View>
                      </View>
                      <View style={styles.previewRow}>
                        <View style={styles.previewItem}>
                          <Text style={styles.previewLabel}>Fat KG</Text>
                          <Text style={styles.previewValue}>
                            {String(parseFloat(formData.weight) * (parseFloat(formData.fat_percentage) / 100))
                              .slice(0, (String(parseFloat(formData.weight) * (parseFloat(formData.fat_percentage) / 100)).indexOf('.')) + 3)}
                          </Text>
                        </View>
                        <View style={styles.previewItem}>
                          <Text style={styles.previewLabel}>SNF KG</Text>
                          <Text style={styles.previewValue}>
                            {String(parseFloat(formData.weight) * (parseFloat(formData.snf_percentage) / 100))
                              .slice(0, (String(parseFloat(formData.weight) * (parseFloat(formData.snf_percentage) / 100)).indexOf('.')) + 3)}
                          </Text>
                        </View>
                        <View style={styles.previewItem}>
                          <Text style={styles.previewLabel}>Base SNF %</Text>
                          <Text style={styles.previewValue}>{parseFloat(formData.base_snf_percentage)}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Amount Details */}
                  <View style={styles.previewSection}>
                    <View style={styles.previewSectionHeader}>
                      <Icon name="cash" size={20} color="#0D47A1" />
                      <Text style={styles.previewSectionTitle}>{t('payment details')}</Text>
                    </View>
                    <View style={styles.previewCard}>
                      <View style={[styles.previewRow, { justifyContent: 'center' }]}>
                        <View style={[styles.previewItem, { alignItems: 'center' }]}>
                          <Text style={styles.previewLabel}>{t('total amount')}</Text>
                          <Text style={styles.previewValueAmount}>₹{previewData.amount}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.previewActions}>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => setShowPreviewModal(false)}
              >
                <Icon name="pencil" size={20} color="#0D47A1" />
                <Text style={styles.editButtonText}>{t('edit')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.previewConfirmButton}
                onPress={handleUpdate}
              >
                <Icon name="check" size={20} color="#fff" />
                <Text style={styles.previewConfirmButtonText}>{t('update')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modals */}
      <TimeModal
        visible={showTimeModal}
        onClose={() => setShowTimeModal(false)}
        selectedTime={formData.collection_time}
        onSelectTime={(time) => {
          setFormData(prev => ({ ...prev, collection_time: time }));
          setIsDirty(true);
        }}
      />
      
      <DatePickerModal
        visible={showDatePicker}
        selectedDate={formData.collection_date}
        onClose={() => setShowDatePicker(false)}
        onSelect={(date) => {
          setFormData(prev => ({ ...prev, collection_date: date }));
          setIsDirty(true);
          setShowDatePicker(false);
        }}
      />

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <Icon name="check-circle" size={80} color="#4CAF50" />
            </View>
            
            <Text style={styles.successTitle}>{t('report generated!')}</Text>
            <Text style={styles.successMessage}>
              {t('your purchase report has been generated successfully. you can now view or share it.')}
            </Text> 

            <View style={styles.successActions}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.viewButton]} 
                onPress={handleViewReport}
              >
                <Icon name="file-document-outline" size={24} color="#0D47A1" />
                <Text style={styles.viewButtonText}>{t('view bill')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, styles.shareButton]} 
                onPress={handleShare}
              >
                <Icon name="share-variant" size={24} color="#fff" />
                <Text style={styles.shareButtonText}>{t('share')}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.closeButtonText}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D47A1',  // Changed to match app theme
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
    backgroundColor: '#0D47A1',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTextContainer: {
    flex: 1,
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
  content: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
    marginHorizontal: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  textInput: {
    height: 40,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  dropdownContainer: {
    height: 40,
  },
  dropdown: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
  },
  dropdownItem: {
    justifyContent: 'flex-start',
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderColor: '#E0E0E0',
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  radioButton: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginHorizontal: 8,
  },
  radioButtonSelected: {
    backgroundColor: '#0D47A1',
  },
  radioText: {
    color: '#666',
    fontSize: 16,
  },
  radioTextSelected: {
    color: '#fff',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  timeText: {
    fontSize: 16,
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#0D47A1',
  },
  previewScroll: {
    maxHeight: 300,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  previewLabel: {
    fontSize: 16,
    color: '#666',
  },
  previewValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalButton: {
    padding: 12,
    borderRadius: 4,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  confirmButton: {
    backgroundColor: '#0D47A1',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 350,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  selectedDateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    marginTop: -25
  },
  selectedDateText: {
    fontSize: 18,
    color: '#0D47A1',
    fontWeight: '600',
    marginLeft: 10,
  },
  datePickerContent: {
    marginBottom: 15,
  },
  datePickerColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateColumn: {
    flex: 1,
    marginHorizontal: 4,
  },
  datePickerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  datePickerScrollContainer: {
    height: 200,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    overflow: 'hidden',
  },
  datePickerScroll: {
    paddingVertical: 5,
  },
  datePickerItem: {
    padding: 12,
    alignItems: 'center',
    marginVertical: 2,
    marginHorizontal: 5,
    borderRadius: 8,
  },
  datePickerItemSelected: {
    backgroundColor: '#0D47A1',
  },
  datePickerItemText: {
    fontSize: 16,
    color: '#333',
  },
  datePickerItemTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  confirmButton: {
    backgroundColor: '#0D47A1',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  dateSelector: {
    height: 45,
    backgroundColor: '#fff',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#0D47A1',
  },
  dateSelectorText: {
    color: '#0D47A1',
    fontSize: 13,
    fontWeight: '500',
  },
  timeSelector: {
    height: 48,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0D47A1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  timeSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeSelectorText: {
    color: '#0D47A1',
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    paddingVertical: 24,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  timeOptions: {
    gap: 16,
  },
  timeOption: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  timeOptionSelected: {
    backgroundColor: '#0D47A1',
    borderColor: '#0D47A1',
  },
  timeOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  timeOptionTextSelected: {
    color: '#fff',
  },
  searchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  customerSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    marginLeft: 8,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  addCustomerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0D47A1',
  },
  addCustomerText: {
    color: '#0D47A1',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  searchResultsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 16,
    maxHeight: 200,
  },
  searchResults: {
    padding: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  customerName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  customerDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  noResultsContainer: {
    padding: 16,
    alignItems: 'center',
  },
  noResultsText: {
    color: '#666',
    fontSize: 14,
  },
  searchLoader: {
    padding: 16,
  },
  animalSelector: {
    height: 45,
    backgroundColor: '#fff',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#0D47A1',
  },
  animalSelectorText: {
    color: '#0D47A1',
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    maxWidth: 400,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  animalOptions: {
    width: '100%',
    gap: 10,
  },
  animalOption: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  animalOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  closeButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#ccc',
    borderRadius: 8,
    alignItems: 'center',
    color: '#fff',
  },
  closeButtonText: {
    color: '#0D47A1',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
  baseSnfSection: {
    marginBottom: 16,  // Space between base SNF selector and next button
  },
  baseSnfSelector: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0D47A1',
    height: 45,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  baseSnfContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  baseSnfValue: {
    color: '#0D47A1',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginRight: 8,
  },
  baseSnfModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxWidth: 360,
    paddingTop: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  baseSnfModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  baseSnfIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  baseSnfModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0D47A1',
    marginBottom: 8,
  },
  baseSnfModalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  baseSnfOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  baseSnfOption: {
    width: '28%',
    aspectRatio: 1.5,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    position: 'relative',
  },
  baseSnfOptionSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#0D47A1',
  },
  baseSnfOptionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  baseSnfOptionTextSelected: {
    color: '#0D47A1',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 2,
  },
  previewModalContent: {
    backgroundColor: 'white',
    width: '90%',
    maxHeight: '85%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  previewHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0D47A1',
    flex: 1,
  },
  previewScrollView: {
    maxHeight: '80%',
  },
  previewContainer: {
    padding: 15,
  },
  previewSection: {
    marginBottom: 20,
  },
  previewSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  previewSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0D47A1',
  },
  previewCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 15,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  customerInfo: {
    fontSize: 14,
    color: '#666',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewItem: {
    flex: 1,
  },
  previewLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  previewValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  previewValueAmount: {
    fontSize: 24,
    color: '#0D47A1',
    fontWeight: '700',
  },
  previewActions: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    gap: 8,
  },
  editButtonText: {
    color: '#0D47A1',
    fontSize: 16,
    fontWeight: '600',
  },
  previewConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#0D47A1',
    gap: 8,
  },
  previewConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#0D47A1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 6,
    marginBottom: 20,  // Space at bottom
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButtonDisabled: {
    backgroundColor: '#ccc',
  },
  deleteHeaderButton: {
    padding: 8,
    marginLeft: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerButton: {
    padding: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  successModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
    elevation: 5,
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0D47A1',
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  successActions: {
    flexDirection: 'column',
    width: '100%',
    marginBottom: 20,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    width: '100%',
  },
  viewButton: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#0D47A1',
  },
  viewButtonText: {
    color: '#0D47A1',
    fontSize: 16,
    fontWeight: '600',
  },
  shareButton: {
    backgroundColor: '#0D47A1',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    color: '#666',
    fontSize: 14,
  },
});

export default EditCollectionScreen;