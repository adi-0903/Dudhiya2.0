import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getAllCustomers, getCustomers, createCustomer, updateCustomer, deleteCustomer, getDairyInfo } from '../services/api';
import BottomNav from '../components/BottomNav';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';


const CustomerScreen = () => {
  const navigation = useNavigation();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    father_name: '',
    phone: '',
    village: '',
    address: '',
  });
  const [customers, setCustomers] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdateLoading, setIsUpdateLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { t, i18n } = useTranslation();
  const [dairyInfo, setDairyInfo] = useState(null);

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

  useEffect(() => {
    fetchCustomers();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      const fetchDairy = async () => {
        try {
          const info = await getDairyInfo();
          if (info && isActive) {
            setDairyInfo(info);
          }
        } catch (error) {
          // silently ignore dairy info errors here
        }
      };

      fetchDairy();

      return () => {
        isActive = false;
      };
    }, [])
  );

  const isFlatRateType =
    dairyInfo?.rate_type === 'kg_only' || dairyInfo?.rate_type === 'liters_only';

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const response = await getAllCustomers();
      if (response && response.results) {
        setCustomers(response.results);
      }
    } catch (error) {
      // Remove console.error('Error fetching customers:', error);
      Alert.alert(t('error'), t('failed to fetch customers'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCustomer = (customer) => {
    // Remove +91 prefix if it exists and format the phone number
    const formattedPhone = customer.phone ? customer.phone.replace(/^\+91/, '') : '';
    
    setNewCustomer({
      ...customer,
      father_name: customer.father_name || '',
      phone: formattedPhone, // Use the formatted phone number without +91
    });
    setIsEditing(true);
    setShowAddModal(true);
  };

  const handleSaveCustomer = async () => {
    if (!newCustomer.name) {
      Alert.alert(t('error'), t('name is required'));
      return;
    }

    // Remove any non-digit characters from phone number if provided
    const formattedPhone = newCustomer.phone ? newCustomer.phone.replace(/[^0-9]/g, '') : '';

    // Validate phone number length if provided
    if (formattedPhone && formattedPhone.length !== 10) {
      Alert.alert(t('error'), t('please enter a valid 10-digit phone number'));
      return;
    }

    try {
      setIsLoading(true);
      const customerData = {
        ...newCustomer,
        phone: formattedPhone // Send only the 10-digit number to API
      };

      if (isEditing) {
        await updateCustomer(customerData.id, customerData);
        Alert.alert(
          t('success'),
          t('customer updated successfully!'),
          [
            {
              text: t('ok'),
              onPress: () => {
                setShowAddModal(false);
                setIsEditing(false);
                setNewCustomer({
                  name: '',
                  father_name: '',
                  phone: '',
                  village: '',
                  address: '',
                });
                fetchCustomers();
              }
            }
          ]
        );
      } else {
        await createCustomer(customerData);
        Alert.alert(
          t('success'),
          t('customer added successfully!'),
          [
            {
              text: t('ok'),
              onPress: () => {
                setShowAddModal(false);
                setNewCustomer({
                  name: '',
                  father_name: '',
                  phone: '',
                  village: '',
                  address: '',
                });
                fetchCustomers();
              }
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert(t('error'), error.error || t('failed to save customer'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewCustomer = (customer) => {
    // Format phone number when viewing customer details
    const formattedCustomer = {
      ...customer,
      phone: customer.phone ? customer.phone.replace(/^\+91/, '') : ''
    };
    setSelectedCustomer(formattedCustomer);
    setShowDetailsModal(true);
  };

  const handleUpdate = () => {
    // Show loading state
    setIsUpdateLoading(true);
    
    // Remove +91 prefix from phone number when updating
    const formattedPhone = selectedCustomer.phone ? selectedCustomer.phone.replace(/^\+91/, '') : '';
    
    // Use a slight delay to show the loading animation
    setTimeout(() => {
      setShowDetailsModal(false);
      setNewCustomer({
        ...selectedCustomer,
        phone: formattedPhone // Set the phone number without +91
      });
      setIsEditing(true);
      setShowAddModal(true);
      setIsUpdateLoading(false);
    }, 500); // Small delay to show loading animation
  };

  const handleViewReport = () => {
    navigation.navigate('Report', { customerId: selectedCustomer.id });
  };

  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (customer.customer_id && customer.customer_id.toString().includes(searchQuery)) || // Search by customer_id
      (customer.id && customer.id.toString().includes(searchQuery)) || // Search by ID
      customer.name.toLowerCase().includes(searchLower) // Search by name
    );
  }).sort((a, b) => b.customer_id - a.customer_id); // Sort in descending order by customer_id

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchCustomers().finally(() => setRefreshing(false));
  }, []);

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
        
        <Text style={styles.headerTitle}>{t('supplier')}</Text>
      </View>

      {/* Subheader with Search and Add Customer */}
      <View style={styles.subheader}>
        <View style={styles.searchContainer}>
          <Icon name="magnify" size={24} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder={t("search suppliers")}
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <TouchableOpacity 
          style={styles.addCustomerButton}
          onPress={() => {
            setIsEditing(false);
            setNewCustomer({
              name: '',
              father_name: '',
              phone: '',
              village: '',
              address: '',
            });
            setShowAddModal(true);
          }}
        >
          <Icon name="plus" size={20} color="#0D47A1" />
          <View style={styles.addCustomerTextContainer}>
            <Text style={styles.addCustomerText}>{t('add new')}</Text>
            <Text style={styles.addCustomerText}>{t('supplier')}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4285F4']}
            tintColor="#fff"
            progressBackgroundColor="#fff"
          />
        }
      >
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, { flex: 0.15 }]}>{t('id')}</Text>
          <Text style={[styles.headerCell, { flex: 0.25 }]}>{t('name')}</Text>
          <Text style={[styles.headerCell, { flex: 0.25 }]}>{t('phone')}</Text>
          <Text style={[styles.headerCell, { flex: 0.25 }]}>{t('village')}</Text>
          <Text style={[styles.headerCell, { flex: 0.1 }]}></Text>
        </View>

        {/* Customer List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0D47A1" />
          </View>
        ) : filteredCustomers.length === 0 ? (
          <View style={[styles.customerRow, styles.emptyRow]}>
            <Text style={[styles.cellText, { flex: 0.9, textAlign: 'center', color: '#666' }]}>
              {searchQuery ? 'No customers found' : 'No customers added yet'}
            </Text>
            <View style={{ flex: 0.1 }} />
          </View>
        ) : (
          filteredCustomers.map((customer, index) => (
            <TouchableOpacity
              key={customer.id}
              style={[
                styles.customerRow,
                index % 2 === 0 && styles.evenRow
              ]}
              onPress={() => handleViewCustomer(customer)}
            >
              <Text style={[styles.cellText, { flex: 0.15 }]}>{customer.customer_id}</Text>
              <Text style={[styles.cellText, { flex: 0.25 }]} numberOfLines={1}>{customer.name}</Text>
              <Text style={[styles.cellText, { flex: 0.25 }]} numberOfLines={1}>{customer.phone}</Text>
              <Text style={[styles.cellText, { flex: 0.25 }]} numberOfLines={1}>{customer.village}</Text>
              <TouchableOpacity 
                style={[styles.viewButton, { flex: 0.1 }]}
                onPress={() => handleViewCustomer(customer)}
              >
                <Icon name="eye" size={20} color="#0D47A1" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <BottomNav />

      {/* Add Customer Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowAddModal(false);
          setIsEditing(false);
          setNewCustomer({
            name: '',
            father_name: '',
            phone: '',
            village: '',
            address: '',
          });
        }}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowAddModal(false);
            setIsEditing(false);
            setNewCustomer({
              name: '',
              father_name: '',
              phone: '',
              village: '',
              address: '',
            });
          }}
        >
          <TouchableOpacity 
            style={styles.modalContent} 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>
              {isEditing ? t('edit customer') : t('add new customers')}
            </Text>

            <ScrollView style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('name')} *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newCustomer.name}
                  onChangeText={(text) => setNewCustomer({...newCustomer, name: text})}
                  placeholder={t('enter customer name')}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('phone number')}</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newCustomer.phone}
                  onChangeText={(text) => setNewCustomer({...newCustomer, phone: text})}
                  placeholder={t('enter phone number')}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('father\'s name')}</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newCustomer.father_name}
                  onChangeText={(text) => setNewCustomer({...newCustomer, father_name: text})}
                  placeholder={t('enter father\'s name')}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('village')}</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newCustomer.village}
                  onChangeText={(text) => setNewCustomer({...newCustomer, village: text})}
                  placeholder={t('enter village name')}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('address')}</Text>
                <TextInput
                  style={[styles.modalInput, styles.textArea]}
                  value={newCustomer.address}
                  onChangeText={(text) => setNewCustomer({...newCustomer, address: text})}
                  placeholder={t('enter full address')}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddModal(false);
                  setIsEditing(false);
                  setNewCustomer({
                    name: '',
                    father_name: '',
                    phone: '',
                    village: '',
                    address: '',
                  });
                }}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton, isLoading && styles.disabledButton]}
                onPress={handleSaveCustomer}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {isEditing ? t('update') : t('save')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Customer Details Modal */}
      <Modal
        visible={showDetailsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDetailsModal(false)}
        >
          <TouchableOpacity 
            style={styles.detailsModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>{t('customer details')}</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowDetailsModal(false)}
              >
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {selectedCustomer && (
              <>
                <ScrollView style={styles.detailsContent}>
                  <View style={styles.detailsSection}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t('id')}</Text>
                      <Text style={styles.detailValue}>{selectedCustomer.customer_id}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t('name')}</Text>
                      <Text style={styles.detailValue}>{selectedCustomer.name}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t('father\'s name')}</Text>
                      <Text style={styles.detailValue}>{selectedCustomer.father_name || '-'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t('phone')}</Text>
                      <Text style={styles.detailValue}>{selectedCustomer.phone}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t('village')}</Text>
                      <Text style={styles.detailValue}>{selectedCustomer.village || '-'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t('address')}</Text>
                      <Text style={styles.detailValue}>{selectedCustomer.address || '-'}</Text>
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.detailsActions}>
                  <View style={styles.detailsActionsRow}>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.updateButton, styles.leftButton, isUpdateLoading && styles.disabledButton]}
                      onPress={handleUpdate}
                      disabled={isUpdateLoading}
                    >
                      {isUpdateLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Icon name="pencil" size={20} color="#fff" />
                          <Text style={styles.actionButtonText}>{t('update')}</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.actionButton, styles.reportButton, styles.rightButton]}
                      onPress={() => {
                        setShowDetailsModal(false);
                        navigation.navigate('CustomerReport', { 
                          customerName: selectedCustomer.name,
                          customerId: selectedCustomer.id,
                          customer_id: selectedCustomer.customer_id
                        });
                      }}
                      disabled={isUpdateLoading}
                    >
                      <Icon name="file-document-outline" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>{t('view report')}</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity 
                    style={[
                      styles.actionButton,
                      styles.reportButton,
                      styles.fullWidthButton,
                      isFlatRateType && { opacity: 0.4 }
                    ]}
                    onPress={() => {
                      if (isFlatRateType) {
                        return;
                      }
                      setShowDetailsModal(false);
                      navigation.navigate('CustomerProRataReportScreen', { 
                        customerName: selectedCustomer.name,
                        customerId: selectedCustomer.id,
                        customer_id: selectedCustomer.customer_id
                      });
                    }}
                    disabled={isUpdateLoading || isFlatRateType}
                  >
                    <Icon name="file-chart-outline" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>{t('View Pro-Rata Report')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
    marginLeft: 15,  // Add left margin for spacing from back button
  },
  subheader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginRight: 12,
    height: 46,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#333',
  },
  addCustomerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 12,
    height: 46,
  },
  addCustomerTextContainer: {
    marginLeft: 8,
  },
  addCustomerText: {
    color: '#0D47A1',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    paddingBottom: 100, // Add padding to ensure content isn't covered by bottom nav
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F7FA',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  headerCell: {
    color: '#0D47A1',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 19,
  },
  customerRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  evenRow: {
    backgroundColor: '#FAFBFC',
  },
  cellText: {
    fontSize: 14,
    color: '#333',
    paddingHorizontal: 4,
  },
  viewButton: {
    padding: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyRow: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    marginHorizontal: 16,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0D47A1',
    marginBottom: 20,
    textAlign: 'center',
  },
  formContainer: {
    maxHeight: '70%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#F5F7FA',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#0D47A1',
    marginLeft: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Enhanced Customer Details Modal styles
  detailsModalContent: {
    backgroundColor: '#fff',
    width: '90%',
    alignSelf: 'center',
    borderRadius: 20,
    padding: 0, // Remove default padding
    overflow: 'hidden', // Ensure nothing spills outside rounded corners
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  detailsHeader: {
    backgroundColor: '#0D47A1',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  detailsTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 8,
  },
  detailsContent: {
    padding: 20,
  },
  detailsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    flex: 0.4,
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    flex: 0.6,
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
  },
  detailsActions: {
    flexDirection: 'column',
    padding: 20,
    backgroundColor: '#F5F7FA',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  detailsActionsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
  },
  leftButton: {
    marginRight: 6,
  },
  rightButton: {
    marginLeft: 6,
  },
  fullWidthButton: {
    flex: 0,
    alignSelf: 'stretch',
    marginTop: 12,
  },
  updateButton: {
    backgroundColor: '#0D47A1',
  },
  reportButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
  },
});

export default CustomerScreen; 
