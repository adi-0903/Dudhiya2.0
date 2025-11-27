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
  PanResponder
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { getPurchaseSummaryReportCollections, generatePurchaseSummaryReport } from '../services/api';
import BottomNav from '../components/BottomNav';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { Linking } from 'react-native';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

const GeneratePurchaseSummaryReportScreen = ({ navigation }) => {
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
  const [showInitialDateModal, setShowInitialDateModal] = useState(true);

  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const [columnWidths, setColumnWidths] = useState({
    date: '20%',
    weight: '13%',
    fatPercentage: '13%',
    snfPercentage: '13%',
    fatKg: '13%',
    snfKg: '13%',
    amount: '15%'
  });

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
      console.log('GenerateFullReportScreen focused');
      setShowInitialDateModal(true);
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
      
      const apiParams = {
        start_date: formatDateForAPI(fromDate),
        end_date: formatDateForAPI(toDate)
      };
      
      console.log('API params:', apiParams);
      
      const response = await getPurchaseSummaryReportCollections(apiParams);
      
      if (response && response.results) {
        const formattedCollections = response.results
          .filter(collection => !collection.is_pro_rata) // Filter out pro rata collections for normal report
          .map(collection => ({
            party_name: collection.party_name,
            weight: collection.weight,
            fat_kg: collection.fat_kg,
            snf_kg: collection.snf_kg,
            total_amount: collection.total_amount,
            phone: collection.phone,
            purchase_value: collection.purchase_value
          }));

        setCollections(formattedCollections);
        setHasMoreData(false);
        setShowInitialDateModal(false); // Close the modal after successful fetch
      } else {
        // Handle empty response
        setCollections([]);
        Alert.alert(t('no data'), t('no collections found for the selected date range.'));
        setShowInitialDateModal(false); // Close the modal even if no data
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
      // Show error alert only once
      Alert.alert(
        t('error'),
        t('no data available for the selected date range. please try a different date.'),
        [{ text: t('ok'), onPress: () => setShowInitialDateModal(false) }]
      );
      setCollections([]); // Clear any existing collections
      setHasMoreData(false);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const loadMoreCollections = async () => {
    if (!hasMoreData || isLoadingMore) return;
    setIsLoadingMore(true);
    await fetchCollections(page + 1, true);
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
      const startDate = `${String(fromDate.getDate()).padStart(2, '0')}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-${fromDate.getFullYear()}`;
      const endDate = `${String(toDate.getDate()).padStart(2, '0')}-${String(toDate.getMonth() + 1).padStart(2, '0')}-${toDate.getFullYear()}`;
      console.log('Generating report with parameters:', { start_date: startDate, end_date: endDate });

      const fileUri = await generatePurchaseSummaryReport(startDate, endDate);
      setReportPaths(fileUri);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error generating report:', error.message);
      Alert.alert('Error', error.message);
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
            dialogTitle: 'Open Report'
          });
        } else {
          Alert.alert('Error', 'Failed to open the report. Please make sure you have a PDF viewer installed.');
        }
      } catch (shareError) {
        Alert.alert('Error', 'Failed to open the report. Please make sure you have a PDF viewer installed.');
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
      Alert.alert('Error', 'Failed to share the report');
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
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

  const renderCollection = ({ item }) => (
    <TouchableOpacity style={styles.collectionRow}>
      <Text style={[styles.cell, { textAlign: 'center', width: '20%' }]}>{item.party_name}</Text>
      <Text style={[styles.separator]}>|</Text>
      <Text style={[styles.cell, { textAlign: 'center', width: '15%' }]}>{parseFloat(item.weight).toFixed(1)}</Text>
      <Text style={[styles.separator]}>|</Text>
      <Text style={[styles.cell, { textAlign: 'center', width: '15%' }]}>{parseFloat(item.fat_kg).toFixed(2)}</Text>
      <Text style={[styles.separator]}>|</Text>
      <Text style={[styles.cell, { textAlign: 'center', width: '15%' }]}>{parseFloat(item.snf_kg).toFixed(2)}</Text>
      <Text style={[styles.separator]}>|</Text>
      <Text style={[styles.cell, { textAlign: 'center', width: '15%' }]}>₹{parseFloat(item.total_amount).toFixed(2)}</Text>
    </TouchableOpacity>
  );

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
      <Text style={styles.emptyTitle}>{t('no collections found for the selected date range.')}</Text>
      <Text style={styles.emptyText}>
        {t('generate a report to view your collection details')}
      </Text>
    </View>
  );

  const HeaderRow = () => (
    <View style={styles.headerRow}>
      <Text style={[styles.headerCell, { textAlign: 'center', width: '20%' }]}>Party Name</Text>
      <Text style={[styles.separator, styles.headerSeparator]}>|</Text>
      <Text style={[styles.headerCell, { textAlign: 'center', width: '15%' }]}>Weight</Text>
      <Text style={[styles.separator, styles.headerSeparator]}>|</Text>
      <Text style={[styles.headerCell, { textAlign: 'center', width: '15%' }]}>Fat KG</Text>
      <Text style={[styles.separator, styles.headerSeparator]}>|</Text>
      <Text style={[styles.headerCell, { textAlign: 'center', width: '15%' }]}>SNF KG</Text>
      <Text style={[styles.separator, styles.headerSeparator]}>|</Text>
      <Text style={[styles.headerCell, { textAlign: 'center', width: '15%' }]}>Amount</Text>
    </View>
  );

  // Format date to DD-MM-YYYY string
  const formatDateForAPI = (date) => {
    return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
  };

  const handleInitialDateSelection = async (selectedFromDate, selectedToDate) => {
    if (!selectedFromDate || !selectedToDate) {
      Alert.alert('Error', 'Please select both dates');
      return;
    }
    
    if (selectedToDate < selectedFromDate) {
      Alert.alert('Error', 'To date cannot be earlier than from date');
      return;
    }

    setFromDate(selectedFromDate);
    setToDate(selectedToDate);
    setShowInitialDateModal(false);
    await fetchCollections();
  };

  const InitialDateSelectionModal = () => (
    <Modal
      visible={showInitialDateModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.datePickerModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.datePickerTitle}>{t('select date range')}</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowInitialDateModal(false)}
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

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={() => handleInitialDateSelection(fromDate, toDate)}
            >
              <Text style={styles.confirmButtonText}>{t('generate report')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <InitialDateSelectionModal />
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('purchase summary report')}</Text>
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

      <View style={styles.dateDisplayContainer}>
        <View style={styles.dateRangeDisplay}>
          <Text style={styles.dateRangeText}>
            {formatDate(fromDate)} - {formatDate(toDate)}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.selectDateButton}
          onPress={() => setShowInitialDateModal(true)}
        >
          <Icon name="calendar" size={20} color="#0D47A1" />
          <Text style={styles.selectDateButtonText}>{t('select date')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.whiteContainer}>
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

      {/* Generate Report Modal */}
      <GenerateReportModal 
        showGenerateModal={showGenerateModal}
        setShowGenerateModal={setShowGenerateModal}
        fromDate={fromDate}
        setFromDate={setFromDate}
        toDate={toDate}
        setToDate={setToDate}
        showFromDatePicker={showFromDatePicker}
        setShowFromDatePicker={setShowFromDatePicker}
        showToDatePicker={showToDatePicker}
        setShowToDatePicker={setShowToDatePicker}
        handleGenerateReport={handleGenerateReport}
        isGeneratingPdf={isGeneratingPdf}
        formatDate={formatDate}
        t={t}
      />

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

const GenerateReportModal = ({ 
  showGenerateModal, 
  setShowGenerateModal, 
  fromDate, 
  setFromDate,
  toDate, 
  setToDate,
  showFromDatePicker,
  setShowFromDatePicker,
  showToDatePicker,
  setShowToDatePicker,
  handleGenerateReport,
  isGeneratingPdf,
  formatDate,
  t
}) => (
  
  <Modal
    visible={showGenerateModal}
    transparent={true}
    animationType="fade"
    onRequestClose={() => setShowGenerateModal(false)}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.generateModal}>
        <View style={styles.generateModalHeader}>
          <Text style={styles.generateModalTitle}>{t('generate report')}</Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowGenerateModal(false)}
          >
            <Icon name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.dateRangeContainer}>
          <Text style={styles.dateRangeLabel}>{t('select date range')}</Text>
          
          <View style={styles.dateInputsContainer}>
            <View style={styles.dateInputGroup}>
              <Text style={styles.dateInputLabel}>{t('from date')}</Text>
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

            <View style={styles.dateInputGroup}>
              <Text style={styles.dateInputLabel}>{t('to date')}</Text>
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
);

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
    justifyContent: 'space-between',
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
    fontSize: 11,
    color: '#333',
    textAlign: 'center',
  },
  separator: {
    width: '2%',
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
    justifyContent: 'space-between',
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
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  generateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  generateModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    position: 'absolute',
    right: 10,
    top: 10,
  },
  dateRangeContainer: {
    marginBottom: 20,
  },
  dateRangeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 15,
  },
  dateInputsContainer: {
    gap: 15,
  },
  dateInputGroup: {
    gap: 8,
  },
  dateInputLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  dateRangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  dateRangeButtonText: {
    fontSize: 14,
    color: '#333',
  },
  generateButton: {
    backgroundColor: '#0D47A1',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  dateRangeContainer: {
    marginBottom: 20,
  },
  dateRangeItem: {
    marginBottom: 15,
  },
  dateRangeLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  dateRangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateRangeButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
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
  dateDisplayContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    margin: 15,
  },
  dateRangeDisplay: {
    flex: 1,
    marginRight: 10,
  },
  dateRangeText: {
    fontSize: 16,
    color: '#333',
  },
  selectDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 120,
    justifyContent: 'center',
    backgroundColor: '#0D47A1',
    padding: 10,
    borderRadius: 8,
  },
  selectDateButtonText: {
    color: '#fff',
    fontSize: 16,
    right: 8,
    textAlign: 'center',
  },
});

export default GeneratePurchaseSummaryReportScreen;
