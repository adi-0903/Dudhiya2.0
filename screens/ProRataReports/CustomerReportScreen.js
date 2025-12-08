import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Share,
  Platform,
  FlatList
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getCustomerCollections, generateProRataCustomerReport } from '../../services/api';
import BottomNav from '../../components/BottomNav';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { Linking } from 'react-native';
import { useTranslation } from 'react-i18next';

const CustomerProRataReportScreen = ({ route }) => {
  const { customerId, customerName, customer_id } = route.params;
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
  
  // Add validation for customerId
  useEffect(() => {
    if (!customerId) {
      Alert.alert('Error', t('invalid customer id'));
      navigation.goBack();
      return;
    }
  }, [customerId]);

  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [collectionReports, setCollectionReports] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // Report generation states
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [reportPaths, setReportPaths] = useState(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Filter states
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterFromDate, setFilterFromDate] = useState(new Date());
  const [filterToDate, setFilterToDate] = useState(new Date());
  const [isFiltered, setIsFiltered] = useState(false);
  const [showFilterFromDatePicker, setShowFilterFromDatePicker] = useState(false);
  const [showFilterToDatePicker, setShowFilterToDatePicker] = useState(false);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      const loadData = async () => {
        console.log('CustomerReportScreen focused - refreshing data');
        if (isActive) {
          await fetchCollections();
        }
      };

      loadData();

      return () => {
        isActive = false;
      };
    }, [customerId]) // Add customerId as dependency
  );

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchCollections().finally(() => setRefreshing(false));
  }, []);

  const fetchCollections = async (pageNumber = 1, isLoadMore = false) => {
    try {
      if (!isLoadMore) {
        setIsLoading(true);
      }
      
      // Add logging to check the customerId
      console.log('Fetching collections for customer:', { 
        customerId, 
        pageNumber, 
        pageSize: 50 
      });

      const response = await getCustomerCollections(customerId, { 
        page: pageNumber, 
        page_size: 50 
      });

      // Add logging to check the response
      console.log('API Response:', response);
      
      // Log detailed structure of the first few collections
      if (response.results && response.results.length > 0) {
        console.log('Collection data structure:');
        response.results.slice(0, 3).forEach((collection, idx) => {
          console.log(`Collection ${idx}:`, JSON.stringify(collection, null, 2));
        });
      }

      if (!response || !response.results) {
        throw new Error('Invalid response format');
      }

      const formattedReports = response.results
        .filter(collection => collection.is_pro_rata === true) // Filter to show only pro rata collections
        .map(collection => ({
          id: collection.id,
          collection_date: collection.collection_date, // Keep the original date for processing
          date: new Date(collection.collection_date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }),
          collection_time: collection.collection_time, // Include collection_time field
          fat_percentage: collection.fat_percentage,
          snf_percentage: collection.snf_percentage,
          clr: collection.clr,
          milk_rate: collection.milk_rate,
          weight: collection.kg || '0.00'
        }));

      if (isLoadMore) {
        setCollectionReports(prev => [...prev, ...formattedReports]);
      } else {
        setCollectionReports(formattedReports);
      }

      setHasMoreData(!!response.next);
      setPage(pageNumber);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleGenerateReport = async () => {
    setIsGeneratingPdf(true);
    try {
      const startDate = `${String(fromDate.getDate()).padStart(2, '0')}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-${fromDate.getFullYear()}`;
      const endDate = `${String(toDate.getDate()).padStart(2, '0')}-${String(toDate.getMonth() + 1).padStart(2, '0')}-${toDate.getFullYear()}`;
      console.log('Generating report with parameters:', { start_date: startDate, end_date: endDate });

      const fileUri = await generateProRataCustomerReport(customerId, startDate, endDate);
      setReportPaths(fileUri);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error generating report:', error.message);
      Alert.alert(t('no data found for selected date range'));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleViewReport = async () => {
    try {
      if (reportPaths && reportPaths.viewUri) {
        const viewPath = reportPaths.viewUri;
        if (Platform.OS === 'android' && viewPath.startsWith('content://')) {
          // Use IntentLauncher for SAF content URIs on Android
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: viewPath,
            flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
            type: 'application/pdf'
          });
        } else {
          // Check if file exists for regular file URIs
          const { exists } = await FileSystem.getInfoAsync(viewPath);
          
          if (exists) {
            // Use Linking.openURL for regular file URIs
            await Linking.openURL(viewPath);
          } else {
            Alert.alert(t('file not found. please generate the report again.'));
          }
        }
      }
    } catch (error) {
      console.error('Error opening file:', error);
      // Fallback to sharing if direct opening fails
      try {
        const available = await Sharing.isAvailableAsync();
        if (available && reportPaths && reportPaths.shareUri) {
          await Sharing.shareAsync(reportPaths.shareUri, {
            dialogTitle: 'Open Report',
            mimeType: 'application/pdf'
          });
        } else {
          Alert.alert(t('failed to open the report. please make sure you have a pdf viewer installed.'));
        }
      } catch (shareError) {
        Alert.alert(t('failed to open the report. please make sure you have a pdf viewer installed.'));
      }
    }
  };

  const handleShare = async () => {
    try {
      if (reportPaths && reportPaths.shareUri) {
        await Sharing.shareAsync(reportPaths.shareUri, {
          dialogTitle: 'Share Report',
          UTI: 'com.adobe.pdf',
          mimeType: 'application/pdf'
        });
      }
    } catch (error) {
      console.error('Error sharing file:', error);
      Alert.alert(t('failed to share the report'));
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const fetchFilteredCollections = async (fromDate, toDate, pageNumber = 1, isLoadMore = false) => {
    try {
      // Create new Date objects to avoid modifying the original dates
      const startDate = new Date(fromDate);
      const endDate = new Date(toDate);
      
      // Set fromDate to the start of the day (00:00:00)
      startDate.setHours(0, 0, 0, 0);
      // Set toDate to the end of the day (23:59:59)
      endDate.setHours(23, 59, 59, 999);
      
      const fromDateStr = formatDateForAPI(startDate);
      const toDateStr = formatDateForAPI(endDate);
      
      console.log('Fetching filtered collections:', { 
        customerId,
        fromDateStr, 
        toDateStr,
        pageNumber
      });

      const response = await getCustomerCollections(customerId, { 
        date_from: fromDateStr,
        date_to: toDateStr,
        page: pageNumber,
        page_size: 50
      });

      if (!response || !response.results) {
        throw new Error('Invalid response format');
      }
      
      // Log detailed structure of the first few filtered collections
      if (response.results.length > 0) {
        console.log('Filtered collection data structure:');
        response.results.slice(0, 3).forEach((collection, idx) => {
          console.log(`Filtered Collection ${idx}:`, JSON.stringify(collection, null, 2));
        });
      }

      const formattedReports = response.results
        .filter(collection => {
          // First check if it's a pro rata collection
          if (collection.is_pro_rata !== true) {
            return false;
          }
          const collectionDate = new Date(collection.collection_date);
          return collectionDate >= startDate && collectionDate <= endDate;
        })
        .map(collection => ({
          id: collection.id,
          collection_date: collection.collection_date, // Keep original date for processing
          date: new Date(collection.collection_date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }),
          collection_time: collection.collection_time, // Include collection_time field
          fat_percentage: collection.fat_percentage,
          snf_percentage: collection.snf_percentage,
          clr: collection.clr,
          milk_rate: collection.milk_rate,
          weight: collection.kg || '0.00'
        }));

      console.log(`Filtered collections found: ${formattedReports.length}, has more: ${!!response.next}`);
      
      if (formattedReports.length === 0 && !isLoadMore) {
        console.log('No collections found for the selected date range');
        return false;
      }

      if (isLoadMore) {
        setCollectionReports(prev => [...prev, ...formattedReports]);
      } else {
        setCollectionReports(formattedReports);
      }
      
      setHasMoreData(!!response.next);
      setPage(pageNumber);
      return true;
    } catch (error) {
      console.error('Error fetching filtered collections:', error);
      return false;
    }
  };

  const formatDateForAPI = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const applyDateFilter = async () => {
    if (!filterFromDate || !filterToDate) {
      Alert.alert(t('please select both from and to dates'));
      return;
    }

    // Validate date range
    if (filterToDate < filterFromDate) {
      Alert.alert(t('to date cannot be earlier than from date'));
      return;
    }

    setIsLoading(true);
    try {
      console.log('Applying date filter:', {
        fromDate: formatDateForAPI(filterFromDate),
        toDate: formatDateForAPI(filterToDate),
      });
      
      // Reset page state before applying new filter
      setPage(1);
      setHasMoreData(true);
      
      const success = await fetchFilteredCollections(
        new Date(filterFromDate), // Create fresh Date objects to avoid reference issues
        new Date(filterToDate)
      );
      
      if (success) {
        setIsFiltered(true);
        setShowFilterModal(false);
      } else {
        Alert.alert(t('no data found for selected date range'));
      }
    } catch (error) {
      console.error('Error applying filter:', error);
      Alert.alert('Error', 'Failed to fetch filtered data');
    } finally {
      setIsLoading(false);
    }
  };

  const clearFilter = async () => {
    setIsLoading(true);
    try {
      setIsFiltered(false);
      setFilterFromDate(new Date());
      setFilterToDate(new Date());
      setPage(1); // Reset page number
      setHasMoreData(true); // Reset pagination state
      await fetchCollections(); // Reset to original data
    } catch (error) {
      console.error('Error clearing filter:', error);
      Alert.alert('Error', 'Failed to clear filters. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const DatePickerModal = ({ visible, onClose, onSelect, selectedDate }) => {
    const [date, setDate] = useState(selectedDate);
    const years = Array.from({length: 5}, (_, i) => new Date().getFullYear() - i);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const handleSelect = () => {
      onSelect(date);
      onClose();
    };
    return (
      <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <Text style={styles.datePickerTitle}>{t('select date')}</Text>
            <View style={styles.datePickerContent}>
              <View style={styles.datePickerColumns}>
                <View style={styles.dateColumn}>
                  <Text style={styles.datePickerLabel}>{t('year')}</Text>
                  <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                    {years.map(year => (
                      <TouchableOpacity key={year} style={[styles.datePickerItem, date.getFullYear() === year && styles.datePickerItemSelected]} onPress={() => { const newDate = new Date(date); newDate.setFullYear(year); setDate(newDate); }}>
                        <Text style={[styles.datePickerItemText, date.getFullYear() === year && styles.datePickerItemTextSelected]}>{year}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <View style={styles.dateColumn}>
                  <Text style={styles.datePickerLabel}>{t('month')}</Text>
                  <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                    {months.map((month, index) => (
                      <TouchableOpacity key={month} style={[styles.datePickerItem, date.getMonth() === index && styles.datePickerItemSelected]} onPress={() => { const newDate = new Date(date); newDate.setMonth(index); const lastDayOfMonth = new Date(newDate.getFullYear(), index + 1, 0).getDate(); if (newDate.getDate() > lastDayOfMonth) { newDate.setDate(lastDayOfMonth); } setDate(newDate); }}>
                        <Text style={[styles.datePickerItemText, date.getMonth() === index && styles.datePickerItemTextSelected]}>{month}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <View style={styles.dateColumn}>
                  <Text style={styles.datePickerLabel}>{t('day')}</Text>
                  <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                    {Array.from({length: new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()}, (_, i) => i + 1).map(day => (
                      <TouchableOpacity key={day} style={[styles.datePickerItem, date.getDate() === day && styles.datePickerItemSelected]} onPress={() => { const newDate = new Date(date); newDate.setDate(day); setDate(newDate); }}>
                        <Text style={[styles.datePickerItemText, date.getDate() === day && styles.datePickerItemTextSelected]}>{day}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>
            <View style={styles.datePickerButtons}>
              <TouchableOpacity style={[styles.datePickerButton, styles.cancelButton]} onPress={onClose}><Text style={styles.cancelButtonText}>{t('cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.datePickerButton, styles.confirmButton]} onPress={handleSelect}><Text style={styles.confirmButtonText}>{t('confirm')}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Add this new component for the header row
  const HeaderRow = () => (
    <View style={styles.headerRow}>
      <Text style={[styles.headerCell, { textAlign: 'center', width: '16%' }]}>Date</Text>
      <Text style={[styles.separator, styles.headerSeparator]}>|</Text>
      <Text style={[styles.headerCell, { textAlign: 'center', width: '17%' }]}>Quantity</Text>
      <Text style={[styles.separator, styles.headerSeparator]}>|</Text>
      <Text style={[styles.headerCell, { textAlign: 'center', width: '10%' }]}>Fat%</Text>
      <Text style={[styles.separator, styles.headerSeparator]}>|</Text>
      <Text style={[styles.headerCell, { textAlign: 'center', width: '12%' }]}>SNF%</Text>
      <Text style={[styles.separator, styles.headerSeparator]}>|</Text>
      <Text style={[styles.headerCell, { textAlign: 'center', width: '15%' }]}>CLR</Text>
      <Text style={[styles.separator, styles.headerSeparator]}>|</Text>
      <Text style={[styles.headerCell, { textAlign: 'center', width: '15%' }]}>Rate</Text>
    </View>
  );

  const handleEditCollection = (collection) => {
    navigation.navigate('EditProRataCollectionScreen', { 
      collection: {
        ...collection,
        customer_id: customer_id,  // Use the customer_id from route.params
        customer_name: customerName // Make sure customer_name is passed
      } 
    });
  };

  const renderCollectionItem = ({ item }) => {
    // Debug log to see the collection_time value
    console.log(`Collection ${item.id} time:`, item.collection_time);
    
    return (
      <TouchableOpacity 
        style={styles.collectionRow}
        onPress={() => handleEditCollection(item)}
      >
        <Text style={[styles.cell, { textAlign: 'left', width: '16%' }]}>
          {(() => {
            // Format date with AM/PM indicator based on collection_time
            const collectionDate = new Date(item.collection_date);
            // Format the date portion
            const formattedDate = collectionDate.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            });
            
            // Map collection_time to AM/PM
            let period;
            
            // Handle all possible collection_time values
            if (typeof item.collection_time === 'string') {
              const timeValue = item.collection_time.toLowerCase().trim();
              if (timeValue === 'morning') {
                period = 'AM';
              } else if (timeValue === 'evening') {
                period = 'PM';
              } else {
                // Default to PM for unknown values
                period = 'PM';
                console.log(`Unknown collection time value: ${timeValue}`);
              }
            } else {
              // If collection_time is not a string or is missing
              period = 'PM'; // Default
              console.log('Missing or invalid collection_time:', item.collection_time);
            }
            
            // Return the formatted date with AM/PM indicator
            return `${formattedDate}\n${period}`;
          })()}
        </Text>
        <Text style={styles.separator}>|</Text>
        <Text style={[styles.cell, { textAlign: 'center', width: '17%' }]}>
          {parseFloat(item.weight || 0).toFixed(2)}
        </Text>
        <Text style={styles.separator}>|</Text>
        <Text style={[styles.cell, { textAlign: 'center', width: '10%' }]}>
          {parseFloat(item.fat_percentage).toFixed(2)}
        </Text>
        <Text style={styles.separator}>|</Text>
        <Text style={[styles.cell, { textAlign: 'center', width: '12%' }]}>
          {parseFloat(item.snf_percentage).toFixed(2)}
        </Text>
        <Text style={styles.separator}>|</Text>
        <Text style={[styles.cell, { textAlign: 'center', width: '15%' }]}>
          {parseFloat(item.clr || 0).toFixed(2)}
        </Text>
        <Text style={styles.separator}>|</Text>
        <Text style={[styles.cell, { textAlign: 'center', width: '15%' }]}>
          {parseFloat(item.milk_rate || 0).toFixed(2)}
        </Text>
      </TouchableOpacity>
    );
  };

  const loadMoreCollections = async () => {
    if (!hasMoreData || isLoadingMore) return;
    setIsLoadingMore(true);
    
    try {
      if (isFiltered) {
        // If we're filtering by date, load more filtered collections
        await fetchFilteredCollections(
          new Date(filterFromDate),
          new Date(filterToDate),
          page + 1,
          true
        );
      } else {
        // Otherwise, load more regular collections
        await fetchCollections(page + 1, true);
      }
    } catch (error) {
      console.error('Error loading more collections:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#0D47A1" />
        <Text style={styles.loadingFooterText}>Loading more...</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>{customerName}</Text>
          <Text style={styles.headerSubtitle}>{t('Pro-Rata Reports')}</Text>
        </View>
        <TouchableOpacity 
          style={styles.reportButton}
          onPress={() => setShowGenerateModal(true)}
        >
          <View style={styles.reportButtonContent}>
            <Icon name="file-document" size={20} color="#fff" />
            <Text style={styles.reportButtonText}>{t('report')}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <View style={styles.searchButtonContainer}>
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={() => setShowFilterModal(true)}
          >
            <Icon name="calendar-search" size={20} color="#0D47A1" />
            <Text style={styles.searchButtonText}>{t('search by date')}</Text>
          </TouchableOpacity>
          
          {isFiltered && (
            <TouchableOpacity 
              style={styles.clearFilterButton}
              onPress={clearFilter}
            >
              <Icon name="close" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        <HeaderRow />
        <FlatList
          data={collectionReports}
          renderItem={renderCollectionItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMoreCollections}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
        />
      </View>

      {/* Generate Report Modal */}
      <Modal
        visible={showGenerateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGenerateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('generate report')}</Text>
            
            <View style={styles.datePickerContainer}>
              <Text style={styles.dateLabel}>{t('from date')}:</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowFromDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>{formatDate(fromDate)}</Text>
                <Icon name="calendar" size={20} color="#0D47A1" />
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerContainer}>
              <Text style={styles.dateLabel}>{t('to date')}:</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowToDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>{formatDate(toDate)}</Text>
                <Icon name="calendar" size={20} color="#0D47A1" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowGenerateModal(false)}
                disabled={isGeneratingPdf}
              > 
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.modalButton, 
                  styles.generateModalButton,
                  isGeneratingPdf && styles.buttonDisabled
                ]}
                onPress={handleGenerateReport}
                disabled={isGeneratingPdf}
              >
                {isGeneratingPdf ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.generateButtonText}>{t('generate')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
              <Icon name="check-circle" size={60} color="#4CAF50" />
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
                <Text style={styles.viewButtonText}>{t('view report')}</Text>
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

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.filterModalTitle}>{t('search collections')}</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.dateRangeContainer}>
              <View style={styles.dateRangeItem}>
                <Text style={styles.dateRangeLabel}>{t('from date')}</Text>
                <TouchableOpacity 
                  style={styles.dateRangeButton}
                  onPress={() => setShowFilterFromDatePicker(true)}
                >
                  <Icon name="calendar" size={20} color="#0D47A1" />
                  <Text style={styles.dateRangeButtonText}>
                    {formatDate(filterFromDate)}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dateRangeItem}>
                <Text style={styles.dateRangeLabel}>{t('to date')}</Text>
                <TouchableOpacity 
                  style={styles.dateRangeButton}
                  onPress={() => setShowFilterToDatePicker(true)}
                >
                  <Icon name="calendar" size={20} color="#0D47A1" />
                  <Text style={styles.dateRangeButtonText}>
                    {formatDate(filterToDate)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.filterApplyButton}
              onPress={applyDateFilter}
            >
              <Text style={styles.filterApplyButtonText}>{t('search')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modals for Filtering */}
      <DatePickerModal
        visible={showFilterFromDatePicker}
        onClose={() => setShowFilterFromDatePicker(false)}
        onSelect={(date) => {
          setFilterFromDate(date);
          setShowFilterFromDatePicker(false);
        }}
        selectedDate={filterFromDate}
      />
      
      <DatePickerModal
        visible={showFilterToDatePicker}
        onClose={() => setShowFilterToDatePicker(false)}
        onSelect={(date) => {
          setFilterToDate(date);
          setShowFilterToDatePicker(false);
        }}
        selectedDate={filterToDate}
      />

      {/* Date Picker Modals for Report Generation */}
      <DatePickerModal
        visible={showFromDatePicker}
        onClose={() => setShowFromDatePicker(false)}
        onSelect={(date) => {
          setFromDate(date);
          setShowFromDatePicker(false);
        }}
        selectedDate={fromDate}
      />
      
      <DatePickerModal
        visible={showToDatePicker}
        onClose={() => setShowToDatePicker(false)}
        onSelect={(date) => {
          setToDate(date);
          setShowToDatePicker(false);
        }}
        selectedDate={toDate}
      />

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
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 10,
    backgroundColor: '#0D47A1',
  },
  content: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 20,
    paddingHorizontal: 15, // Added horizontal padding
  },
  backButton: {
    padding: 8,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#E3F2FD',
    fontSize: 14,
    marginTop: 2,
  },
  reportButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reportButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 14,
  },
  reportsContainer: {
    padding: 16,
  },
  collectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
  },
  collectionHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collectionDate: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#0D47A1',
  },
  collectionDetails: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  detailContent: {
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 50,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 50,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  generateButtonText: {
    color: '#fff',
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
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0D47A1',
    textAlign: 'center',
    marginBottom: 20,
  },
  datePickerContainer: {
    marginBottom: 20,
  },
  dateLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 0.48,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#0D47A1',
  },
  cancelButtonText: {
    color: '#0D47A1',
    fontSize: 16,
    fontWeight: '500',
  },
  successModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  successIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  successActions: {
    width: '100%',
    gap: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    width: '100%',
    gap: 10,
  },
  viewButton: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#0D47A1',
  },
  shareButton: {
    backgroundColor: '#0D47A1',
  },
  viewButtonText: {
    color: '#0D47A1',
    fontSize: 16,
    fontWeight: '500',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
  },
  closeButtonText: {
    color: '#666',
    fontSize: 14,
  },
  datePickerModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '60%',
  },
  datePickerTitle: {
    fontSize: 20,
    color: '#0D47A1',
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  datePickerContent: {
    marginBottom: 20,
    height: 180,
  },
  datePickerColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: '100%',
  },
  datePickerItem: {
    padding: 8,
    marginVertical: 1,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  datePickerItemSelected: {
    backgroundColor: '#0D47A1',
  },
  datePickerItemText: {
    fontSize: 13,
    color: '#333',
  },
  datePickerItemTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  datePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  datePickerButton: {
    flex: 0.48,
    padding: 12,
    borderRadius: 25,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#0D47A1',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  datePickerScroll: {
    height: 150,
  },
  generateModalButton: {
    backgroundColor: '#0D47A1',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loadingFooter: {
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingFooterText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  listContainer: {
    paddingBottom: 100,
  },
  collectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    borderRadius: 10,
    marginBottom: 10,
    width: '100%',
  },
  cell: {
    fontSize: 11,
    color: '#333',
  },
  separator: {
    color: '#ccc',
    marginHorizontal: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#0D47A1',
    borderRadius: 10,
    marginBottom: 10,
    marginHorizontal: 15,
    alignSelf: 'center',
    width: '100%',
  },
  headerCell: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  headerSeparator: {
    color: '#fff',
  },
  filterModal: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  dateRangeContainer: {
    marginBottom: 20,
  },
  dateRangeItem: {
    marginBottom: 15,
  },
  dateRangeLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  dateRangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateRangeButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  filterApplyButton: {
    backgroundColor: '#0D47A1',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  filterApplyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 15,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#0D47A1',
  },
  searchButtonText: {
    color: '#0D47A1',
    marginLeft: 8,
    fontSize: 16,
  },
  clearFilterButton: {
    padding: 8,
    marginLeft: 10,
  },
});

export default CustomerProRataReportScreen; 
