import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Share,
  Platform,
  Animated,
  Dimensions,
  PanResponder,
  Linking
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { getCollections, generateFullReport } from '../services/api';
import BottomNav from '../components/BottomNav';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const GenerateFullReportScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [collections, setCollections] = useState([]);
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
  
  // Report generation states
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [reportPaths, setReportPaths] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Add these state variables at the top with other states
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFilterFromDatePicker, setShowFilterFromDatePicker] = useState(false);
  const [showFilterToDatePicker, setShowFilterToDatePicker] = useState(false);
  const [filterFromDate, setFilterFromDate] = useState(new Date());
  const [filterToDate, setFilterToDate] = useState(new Date());
  const [isFiltered, setIsFiltered] = useState(false);

  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  

  const [columnWidths, setColumnWidths] = useState({
    date: '20%',
    weight: '13%',
    fatPercentage: '13%',
    snfPercentage: '13%',
    clr: '13%',
    milkRate: '13%'
  });

  const [fullCollections, setFullCollections] = useState([]); // State to store all collections

  const handleSort = (column) => {
    const newDirection = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortColumn(column);
    setSortDirection(newDirection);
    
    const sortedData = [...collections].sort((a, b) => {
      if (newDirection === 'asc') {
        return a[column] > b[column] ? 1 : -1;
      } else {
        return a[column] < b[column] ? 1 : -1;
      }
    });
    
    setCollections(sortedData);
  };

  useFocusEffect(
    React.useCallback(() => {
      console.log('GenerateFullReportScreen focused - refreshing data');
      fetchCollections();
    }, [])
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
      const response = await getCollections({ page: pageNumber, page_size: 50 });
      
      console.log('Fetched collections:', response);
      
      // Log detailed structure of the first few collections
      if (response.results && response.results.length > 0) {
        console.log('Collection data structure:');
        response.results.slice(0, 3).forEach((collection, idx) => {
          console.log(`Collection ${idx}:`, JSON.stringify(collection, null, 2));
        });
      }

      const formattedCollections = response.results
        .filter(collection => !collection.is_pro_rata) // Filter out pro rata collections for normal report
        .map(collection => ({
          id: collection.id,  // Make sure to include the id
          weight: collection.kg,
          customer_id: collection.customer_id,
          collection_date: collection.collection_date,
          collection_time: collection.collection_time, // Ensure this field is included
          customer_name: collection.customer_name,
          fat_percentage: collection.fat_percentage,
          snf_percentage: collection.snf_percentage,
          clr: collection.clr,
          milk_rate: collection.milk_rate,
        }));

      if (isLoadMore) {
        setCollections(prev => [...prev, ...formattedCollections]);
        setFullCollections(prev => [...prev, ...formattedCollections]); // Update full collections
      } else {
        setCollections(formattedCollections);
        setFullCollections(formattedCollections); // Store full collections
      }

      setHasMoreData(!!response.next);
      setPage(pageNumber);
    } catch (error) {
      console.error('Error fetching collections:', error);
      Alert.alert('Error', 'Failed to fetch collections. Please try again.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
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

  const handleGenerateReport = async () => {
    setIsGeneratingPdf(true);
    try {
      const formattedFromDate = `${String(fromDate.getDate()).padStart(2, '0')}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-${fromDate.getFullYear()}`;
      const formattedToDate = `${String(toDate.getDate()).padStart(2, '0')}-${String(toDate.getMonth() + 1).padStart(2, '0')}-${toDate.getFullYear()}`;
      console.log('Generating report with parameters:', { start_date: formattedFromDate, end_date: formattedToDate });

      const filePath = await generateFullReport(formattedFromDate, formattedToDate);
      setReportPaths(filePath);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error generating report:', error);
      
      // Handle both error formats - object with error property or with message property
      let errorMessage = 'Failed to generate report';
      
      if (error && typeof error === 'object') {
        if (error.error) {
          errorMessage = error.error;
        } else if (error.message) {
          errorMessage = error.message;
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShare = async () => {
    try {
      if (reportPaths && reportPaths.shareUri) {
        await Sharing.shareAsync(reportPaths.shareUri, {
          dialogTitle: 'Share Report',
          UTI: 'com.adobe.pdf',
        });
      }
    } catch (error) {
      console.error('Error sharing file:', error);
      Alert.alert('Error', 'Failed to share the report');
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
            Alert.alert('Error', 'File not found. Please generate the report again.');
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
            mimeType: 'application/pdf',
            dialogTitle: 'Open PDF Report'
          });
        } else {
          Alert.alert('Error', 'Failed to open the report. Please make sure you have a PDF viewer installed.');
        }
      } catch (shareError) {
        Alert.alert('Error', 'Failed to open the report. Please make sure you have a PDF viewer installed.');
      }
    }
  };

  const formatDate = (date) => {
    // Format the date in the standard format
    const formattedDate = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    
    // Note: For filter display, we don't include AM/PM since we're showing a date range
    // and the times don't apply to the range (just the date portion)
    return formattedDate;
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
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.datePickerModal}>
                    <Text style={styles.datePickerTitle}>{t('select date')}</Text>
                    
                    <View style={styles.datePickerContent}>
                        <View style={styles.datePickerColumns}>
                            {/* Year Column */}
                            <View style={styles.dateColumn}>
                                <Text style={styles.datePickerLabel}>{t('year')}</Text>
                                <ScrollView 
                                    style={styles.datePickerScroll}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {years.map(year => (
                                        <TouchableOpacity
                                            key={year}
                                            style={[
                                                styles.datePickerItem,
                                                date.getFullYear() === year && styles.datePickerItemSelected
                                            ]}
                                            onPress={() => {
                                                const newDate = new Date(date);
                                                newDate.setFullYear(year);
                                                setDate(newDate);
                                            }}
                                        >
                                            <Text style={[
                                                styles.datePickerItemText,
                                                date.getFullYear() === year && styles.datePickerItemTextSelected
                                            ]}>{year}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Month Column */}
                            <View style={styles.dateColumn}>
                                <Text style={styles.datePickerLabel}>{t('month')}</Text>
                                <ScrollView 
                                    style={styles.datePickerScroll}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {months.map((month, index) => (
                                        <TouchableOpacity
                                            key={month}
                                            style={[
                                                styles.datePickerItem,
                                                date.getMonth() === index && styles.datePickerItemSelected
                                            ]}
                                            onPress={() => {
                                                const newDate = new Date(date);
                                                newDate.setMonth(index);
                                                const lastDayOfMonth = new Date(newDate.getFullYear(), index + 1, 0).getDate();
                                                if (newDate.getDate() > lastDayOfMonth) {
                                                    newDate.setDate(lastDayOfMonth);
                                                }
                                                setDate(newDate);
                                            }}
                                        >
                                            <Text style={[
                                                styles.datePickerItemText,
                                                date.getMonth() === index && styles.datePickerItemTextSelected
                                            ]}>{month}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Day Column */}
                            <View style={styles.dateColumn}>
                                <Text style={styles.datePickerLabel}>{t('day')}</Text>
                                <ScrollView 
                                    style={styles.datePickerScroll}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {Array.from({ length: new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map(day => (
                                        <TouchableOpacity
                                            key={day}
                                            style={[
                                                styles.datePickerItem,
                                                date.getDate() === day && styles.datePickerItemSelected
                                            ]}
                                            onPress={() => {
                                                const newDate = new Date(date);
                                                newDate.setDate(day);
                                                setDate(newDate);
                                            }}
                                        >
                                            <Text style={[
                                                styles.datePickerItemText,
                                                date.getDate() === day && styles.datePickerItemTextSelected
                                            ]}>{day}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>
                    </View>

                    <View style={styles.datePickerActions}>
                        <TouchableOpacity 
                            style={[styles.datePickerButton, styles.datePickerButtonCancel]}
                            onPress={onClose}
                        >
                            <Text style={styles.datePickerButtonText}>{t('cancel')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.datePickerButton, styles.datePickerButtonSelect]}
                            onPress={handleSelect}
                        >
                            <Text style={[styles.datePickerButtonText, styles.datePickerButtonTextSelect]}>
                                {t('select')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
  };

  const handleEditCollection = (collection) => {
    navigation.navigate('EditCollection', { 
      collection: {
        ...collection,
        customer_id: collection.customer_id,  // Make sure this is included
        customer_name: collection.customer_name
      } 
    });
  };

  const renderCollection = ({ item }) => {
    // Debug log to see the collection_time value
    console.log(`Collection ${item.id} time:`, item.collection_time);
    
    return (
      <TouchableOpacity 
        style={styles.collectionRow}
        onPress={() => handleEditCollection(item)}
      >
        <Text style={[styles.cell, { textAlign: 'left', width: '16%' }]}>
          {(() => {
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
        <Text style={[styles.cell, { textAlign: 'center', width: '18%' }]}>
          {item.customer_id}-{item.customer_name}
        </Text>
        <Text style={styles.separator}>|</Text>
        <Text style={[styles.cell, { textAlign: 'center', width: '10%' }]}>
          {parseFloat(item.weight).toFixed(1)}
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
        <Text style={[styles.cell, { textAlign: 'center', width: '13%' }]}>
          {parseFloat(item.clr || 0).toFixed(2)}
        </Text>
        <Text style={styles.separator}>|</Text>
        <Text style={[styles.cell, { textAlign: 'center', width: '15%' }]}>
          {parseFloat(item.milk_rate || 0).toFixed(2)}
        </Text>
      </TouchableOpacity>
    );
  };

  const ResizeHandle = ({ onResize, column }) => (
    <View
      style={styles.resizeHandle}
      {...PanResponder.create({
        onPanResponderMove: (_, gesture) => {
          // Update column width based on gesture
          const newWidth = `${parseFloat(columnWidths[column]) + gesture.dx}%`;
          setColumnWidths(prev => ({ ...prev, [column]: newWidth }));
        }
      }).panHandlers}
    />
  );

  const EmptyListComponent = () => (
    <View style={styles.emptyContainer}>
      <Icon name="file-document-outline" size={64} color="#BDBDBD" />
      <Text style={styles.emptyTitle}>{t('no collections found')}</Text>
      <Text style={styles.emptyText}>
        {t('generate a report to view your collection details')}
      </Text>
    </View>
  );

  const HeaderRow = () => (
    <View style={styles.headerRow}>
      <Text style={[styles.headerCell, { textAlign: 'center', width: '16%' }]}>Date</Text>
      <Text style={[styles.separator, styles.headerSeparator]}>|</Text>
      <Text style={[styles.headerCell, { textAlign: 'center', width: '18%' }]}>Name</Text>
      <Text style={[styles.separator, styles.headerSeparator]}>|</Text>
      <Text style={[styles.headerCell, { textAlign: 'center', width: '10%' }]}>Qty.</Text>
      <Text style={[styles.separator, styles.headerSeparator]}>|</Text>
      <Text style={[styles.headerCell, { textAlign: 'center', width: '10%' }]}>Fat%</Text>
      <Text style={[styles.separator, styles.headerSeparator]}>|</Text>
      <Text style={[styles.headerCell, { textAlign: 'center', width: '12%' }]}>SNF%</Text>
      <Text style={[styles.separator, styles.headerSeparator]}>|</Text>
      <Text style={[styles.headerCell, { textAlign: 'center', width: '13%' }]}>CLR</Text>
      <Text style={[styles.separator, styles.headerSeparator]}>|</Text>
      <Text style={[styles.headerCell, { textAlign: 'center', width: '15%' }]}>Rate</Text>
    </View>
  );

  // Add this function to handle filtering
  const applyDateFilter = async () => {
    if (!filterFromDate || !filterToDate) {
      Alert.alert('Error', 'Please select both from and to dates');
      return;
    }

    // Validate date range
    if (filterToDate < filterFromDate) {
      Alert.alert('Error', 'To date cannot be earlier than from date');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Applying date filter:', {
        fromDate: formatDateForAPI(filterFromDate),
        toDate: formatDateForAPI(filterToDate),
      });
      
      console.log('Filter dates (Date objects):', {
        filterFromDate: filterFromDate.toISOString(),
        filterToDate: filterToDate.toISOString()
      });
      
      // Reset page state before applying new filter
      setPage(1);
      setHasMoreData(true);
      
      const success = await fetchFilteredCollections(
        new Date(filterFromDate), // Create fresh Date objects to avoid reference issues
        new Date(filterToDate)
      );
      console.log('Filter applied successfully:', success);
      
      if (success) {
        setIsFiltered(true);
        setShowFilterModal(false);
      } else {
        Alert.alert('Info', 'No collections found for the selected date range');
      }
    } catch (error) {
      console.error('Error applying filter:', error);
      Alert.alert('Error', `Failed to fetch filtered data: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to clear the filter and reset to original data
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

  // Add this helper function for date formatting
  const formatDateForAPI = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Function to fetch collections with date filter
  const fetchFilteredCollections = async (fromDate, toDate, pageNumber = 1, isLoadMore = false) => {
    try {
      // Set time to start of day for fromDate
      fromDate.setHours(0, 0, 0, 0);
      // Set time to end of day for toDate
      toDate.setHours(23, 59, 59, 999);
      
      const fromDateStr = formatDateForAPI(fromDate);
      const toDateStr = formatDateForAPI(toDate);
      
      console.log('Fetching filtered collections with parameters:', { 
        date_from: fromDateStr,
        date_to: toDateStr,
        page: pageNumber,
        isLoadMore
      });
      
      // Make sure we're using collection_date as an exact filter parameter
      const response = await getCollections({ 
        date_from: fromDateStr,
        date_to: toDateStr,
        page: pageNumber,
        page_size: 50,
        ordering: 'collection_date' // Order by collection date ascending
      });

      console.log('API response status:', response ? 'Success' : 'Failed');
      console.log('API response results count:', response?.results?.length || 0);

      if (response && response.results) {
        // Log detailed structure of the first few collections
        if (response.results.length > 0) {
          console.log('Filtered collection data structure:');
          response.results.slice(0, 3).forEach((collection, idx) => {
            console.log(`Filtered Collection ${idx}:`, JSON.stringify(collection, null, 2));
          });
        }

        // Additional safety check to ensure dates are within range and filter out pro rata collections
        const formattedCollections = response.results
          .filter(collection => {
            // First check if it's not a pro rata collection
            if (collection.is_pro_rata) {
              return false;
            }
            
            // Parse the collection date from the API
            const collectionDate = new Date(collection.collection_date);
            // Convert to UTC midnight to avoid timezone issues
            const collectionDateUTC = new Date(
              Date.UTC(
                collectionDate.getFullYear(),
                collectionDate.getMonth(),
                collectionDate.getDate()
              )
            );
            
            // Convert our filter dates to UTC midnight for comparison
            const fromDateUTC = new Date(
              Date.UTC(
                fromDate.getFullYear(),
                fromDate.getMonth(),
                fromDate.getDate()
              )
            );
            
            const toDateUTC = new Date(
              Date.UTC(
                toDate.getFullYear(),
                toDate.getMonth(),
                toDate.getDate()
              )
            );
            
            // For debugging
            console.log('Date comparison:', {
              collection: collectionDateUTC.toISOString().split('T')[0],
              from: fromDateUTC.toISOString().split('T')[0],
              to: toDateUTC.toISOString().split('T')[0],
              isInRange: collectionDateUTC >= fromDateUTC && collectionDateUTC <= toDateUTC
            });
            
            // Check if the collection date is within our range (inclusive)
            return collectionDateUTC >= fromDateUTC && collectionDateUTC <= toDateUTC;
          })
          .map(collection => ({
            id: collection.id,
            weight: collection.kg,
            customer_id: collection.customer_id,
            collection_date: collection.collection_date,
            collection_time: collection.collection_time, // Include collection_time
            customer_name: collection.customer_name,
            fat_percentage: collection.fat_percentage,
            snf_percentage: collection.snf_percentage,
            clr: collection.clr,
            milk_rate: collection.milk_rate,
          }));

        console.log('After strict filtering, collections count:', formattedCollections.length);
        
        if (isLoadMore) {
          setCollections(prev => [...prev, ...formattedCollections]);
        } else {
          setCollections(formattedCollections);
        }
        
        // Update pagination state
        setHasMoreData(!!response.next);
        setPage(pageNumber);
        
        return formattedCollections.length > 0;
      }
      return false;
    } catch (error) {
      console.error('Error in fetchFilteredCollections:', error);
      throw error;
    }
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
        <Text style={styles.headerTitle}>{t('full report')}</Text>
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

      {isFiltered && (
        <View style={styles.dateDisplayContainer}>
          <View style={styles.dateRangeDisplay}>
            <Text style={styles.dateRangeText}>
              {formatDate(filterFromDate)} - {formatDate(filterToDate)}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.whiteContainer}>
        {/* Add Search Button */}
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

        <View style={styles.fixedHeaderContainer}>
          <HeaderRow />
        </View>

        <View style={styles.scrollContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0D47A1" />
              <Text style={styles.loadingText}>Loading collections...</Text>
            </View>
          ) : (
            <FlatList
              data={collections}
              renderItem={renderCollection}
              contentContainerStyle={styles.listContainer}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#0D47A1']}
                  tintColor="#0D47A1"
                />
              }
              onEndReached={loadMoreCollections}
              onEndReachedThreshold={0.5}
              ListFooterComponent={renderFooter}
              ListEmptyComponent={EmptyListComponent}
            />
          )}
        </View>
      </View>
      <BottomNav />
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

      {/* Generate Report Modal */}
      <Modal
        visible={showGenerateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGenerateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.generateModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.generateModalTitle}>{t('generate full report')}</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowGenerateModal(false)}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.dateRangeContainer}>
              <View style={styles.dateRangeItem}>
                <Text style={styles.dateRangeLabel}>{t('from date')}</Text>
                <TouchableOpacity 
                  style={styles.dateRangeButton}
                  onPress={() => setShowFromDatePicker(true)}
                >
                  <Icon name="calendar" size={20} color="#0D47A1" />
                  <Text style={styles.dateRangeButtonText}>
                    {formatDate(fromDate)}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dateRangeItem}>
                <Text style={styles.dateRangeLabel}>{t('to date')}</Text>
                <TouchableOpacity 
                  style={styles.dateRangeButton}
                  onPress={() => setShowToDatePicker(true)}
                >
                  <Icon name="calendar" size={20} color="#0D47A1" />
                  <Text style={styles.dateRangeButtonText}>
                    {formatDate(toDate)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.generateButton}
              onPress={handleGenerateReport}
              disabled={isGeneratingPdf}
            >
              {isGeneratingPdf ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.generateButtonContent}>
                  <Icon name="file-pdf-box" size={24} color="#fff" />
                  <Text style={styles.generateButtonText}>{t('generate pdf')}</Text>
                </View>
              )}
            </TouchableOpacity>
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
          <Animated.View style={styles.successModal}>
            <TouchableOpacity 
              style={styles.successModalCloseButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>

            <LinearGradient
              colors={['#E8F5E9', '#C8E6C9']}
              style={styles.successModalGradient}
            >
              <Icon name="check-circle-outline" size={80} color="#2E7D32" />
            </LinearGradient>
            
            <View style={styles.successModalContent}>
              <Text style={styles.successModalTitle}>{t('report generated!')}</Text>
              <Text style={styles.successModalText}>
                {t('your purchase report has been generated successfully. you can now view or share it.')}
              </Text>
              
              <View style={styles.successModalActions}>
                <TouchableOpacity 
                  style={[styles.successModalButton, styles.successModalButtonView]} 
                  onPress={handleViewReport}
                >
                  <Icon name="file-document-outline" size={24} color="#0D47A1" />
                  <Text style={[styles.successModalButtonText, styles.viewButtonText]}>{t('view')}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.successModalButton, styles.successModalButtonShare]} 
                  onPress={handleShare}
                >
                  <Icon name="share-variant" size={24} color="#fff" />
                  <Text style={[styles.successModalButtonText, styles.shareButtonText]}>{t('share')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
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
    flex: 1,
    marginLeft: 10,
  },
  reportButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reportButtonText: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 14,
  },
  whiteContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  fixedHeaderContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 20,
    paddingHorizontal: 15,
    // Add shadow for elevation effect
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 1, // Ensure header stays on top
  },
  scrollContainer: {
    flex: 1,
    marginBottom: 60, // Add bottom margin to account for BottomNav height
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#0D47A1',
    borderRadius: 10,
    marginBottom: 10,
  },
  headerCell: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  kgCell: {
    height: 32, // Adjusted height for 12px font
    lineHeight: 16, // Adjusted line height for 12px font
  },
  cell: {
    width: '13%',
    fontSize: 11,
    color: '#333',
    textAlign: 'center',
  },
  separator: {
    width: '1%',
    fontSize: 12,
    color: '#ccc',
    textAlign: 'center',
  },
  headerSeparator: {
    color: '#fff',
  },
  amountCell: {
    width: '15%',
    textAlign: 'center',
  },
  listContainer: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 80,
  },
  collectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0D47A1',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  loadingFooter: {
    padding: 10,
    alignItems: 'center',
    marginBottom: 70,
  },
  loadingFooterText: {
    color: '#666',
    marginTop: 5,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  generateModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    paddingVertical: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  generateModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  dateRangeContainer: {
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 20,
  },
  dateRangeItem: {
    gap: 8,
  },
  dateRangeLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  dateRangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 8,
  },
  dateRangeButtonText: {
    fontSize: 16,
    color: '#333',
  },
  generateButton: {
    backgroundColor: '#0D47A1',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  generateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  successModal: {
    backgroundColor: 'white',
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
  successModalCloseButton: {
    position: 'absolute',
    right: 15,
    top: 15,
    zIndex: 1,
  },
  successModalGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successModalContent: {
    alignItems: 'center',
    width: '100%',
  },
  successModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 10,
  },
  successModalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  successModalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
  },
  successModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    minWidth: 120,
    justifyContent: 'center',
    gap: 8,
  },
  successModalButtonView: {
    backgroundColor: '#E3F2FD',
  },
  successModalButtonShare: {
    backgroundColor: '#0D47A1',
  },
  successModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  viewButtonText: {
    color: '#0D47A1',
  },
  shareButtonText: {
    color: '#fff',
  },
  filterModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    paddingVertical: 20,
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  filterApplyButton: {
    backgroundColor: '#0D47A1',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  filterApplyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 15,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0D47A1',
    justifyContent: 'center',
    gap: 8,
  },
  searchButtonText: {
    color: '#0D47A1',
    fontSize: 16,
    fontWeight: '500',
  },
  searchButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  clearFilterButton: {
    marginLeft: 10,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  datePickerModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    padding: 20,
  },
  datePickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  datePickerContent: {
    marginBottom: 20,
  },
  datePickerColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  dateColumn: {
    flex: 1,
  },
  datePickerLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  datePickerScroll: {
    height: 200,
  },
  datePickerItem: {
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  datePickerItemSelected: {
    backgroundColor: '#E3F2FD',
  },
  datePickerItemText: {
    fontSize: 16,
    color: '#333',
  },
  datePickerItemTextSelected: {
    color: '#0D47A1',
    fontWeight: '600',
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  datePickerButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  datePickerButtonCancel: {
    backgroundColor: '#f5f5f5',
  },
  datePickerButtonSelect: {
    backgroundColor: '#0D47A1',
  },
  datePickerButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  datePickerButtonTextSelect: {
    color: '#fff',
  },
  dateDisplayContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    marginBottom: 10,
    width: '70%',
    alignSelf: 'center',
  },
  dateRangeDisplay: {
    flex: 1,
    marginRight: 10,
  },
  dateRangeText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
});

export default GenerateFullReportScreen;
