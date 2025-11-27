import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  Alert,
  Dimensions
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { getUserInfo, getDairyInfo, updateUserInfo, updateDairyInfo } from '../services/api';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RATE_TYPES = [
  { label: 'FAT + SNF', value: 'fat_snf' },
  { label: 'FAT + CLR', value: 'fat_clr' },
];

const ProfileScreen = ({ navigation }) => {
  const [userInfo, setUserInfo] = useState(null);
  const [dairyInfo, setDairyInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedUserInfo, setEditedUserInfo] = useState({
    name: '',
    email: '',
    phone_number: '', // Added phone number field
  });
  const [isSaving, setIsSaving] = useState(false);
  const [copyStatus, setCopyStatus] = useState('Copy');
  const [showDairyEditModal, setShowDairyEditModal] = useState(false);
  const [editedDairyInfo, setEditedDairyInfo] = useState({
    id: null,
    dairy_name: '',
    dairy_address: '',
    rate_type: 'fat_snf'
  });
  const [savingDairy, setSavingDairy] = useState(false);
  const { t, i18n } = useTranslation();
  const [editMode, setEditMode] = useState(false);
  const [dairyEditMode, setDairyEditMode] = useState(false);

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
      
      loadSavedLanguage();
      return () => {};
    }, [i18n])
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [userResponse, dairyResponse] = await Promise.all([
        getUserInfo(),
        getDairyInfo()
      ]);
      setUserInfo(userResponse);
      setDairyInfo(dairyResponse);
      setError(null);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(t('failed to load information'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPress = () => {
    setEditedUserInfo({
      name: userInfo?.name || '',
      email: userInfo?.email || '',
      phone_number: userInfo?.phone_number?.replace(/^\+91/, '') || '', // Remove +91 prefix if present
    });
    setShowEditModal(true);
  };

  const handleSaveUserInfo = async () => {
    if (!editedUserInfo.name.trim()) {
      Alert.alert(t('error'), t('name is required'));
      return;
    }

    if (editedUserInfo.email && !validateEmail(editedUserInfo.email)) {
      Alert.alert(t('error'), t('please enter a valid email address'));
      return;
    }

    if (!editedUserInfo.phone_number) {
      Alert.alert(t('error'), t('phone number is required'));
      return;
    }

    const { isValid, error } = validatePhoneNumber(editedUserInfo.phone_number);
    if (!isValid) {
      Alert.alert(t('error'), error);
      return;
    }

    try {
      setIsSaving(true);
      await updateUserInfo({
        name: editedUserInfo.name.trim(),
        phone_number: editedUserInfo.phone_number.trim(),
        ...(editedUserInfo.email && { email: editedUserInfo.email.trim() }),
      });
      
      await fetchData();
      setShowEditModal(false);
      Alert.alert(t('success'), t('profile updated successfully'));
    } catch (error) {
      Alert.alert(t('error'), error.error || t('failed to update profile'));
    } finally {
      setIsSaving(false);
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhoneNumber = (phone) => {
    return {
      isValid: /^\d{10}$/.test(phone),
      error: /^\d{10}$/.test(phone) ? '' : t('please enter a valid 10-digit phone number')
    };
  };

  const copyToClipboard = async (code) => {
    await Clipboard.setString(code);
    setCopyStatus('Copied!');
    setTimeout(() => {
      setCopyStatus('Copy');
    }, 2000);
  };

  const handleEditDairyPress = () => {
    setEditedDairyInfo({
      id: dairyInfo?.id,
      dairy_name: dairyInfo?.dairy_name || '',
      dairy_address: dairyInfo?.dairy_address || '',
      rate_type: dairyInfo?.rate_type || 'fat_snf'
    });
    setShowDairyEditModal(true);
  };

  const handleSaveDairyInfo = async () => {
    if (!editedDairyInfo.dairy_name.trim()) {
      Alert.alert(t('error'), t('dairy name is required'));
      return;
    }

    if (!editedDairyInfo.dairy_address.trim()) {
      Alert.alert(t('error'), t('dairy address is required'));
      return;
    }

    if (editedDairyInfo.dairy_name.length < 3) {
      Alert.alert(t('error'), t('dairy name must be at least 3 characters long'));
      return;
    }

    if (editedDairyInfo.dairy_address.length < 5) {
      Alert.alert(t('error'), t('dairy address must be at least 5 characters long'));
      return;
    }

    try {
      setSavingDairy(true);
      await updateDairyInfo(editedDairyInfo);
      await fetchData();
      setShowDairyEditModal(false);
      Alert.alert(t('success'), t('dairy information updated successfully'));
    } catch (error) {
      Alert.alert(t('error'), error.error || t('failed to update dairy information'));
    } finally {
      setSavingDairy(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('profile')}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0D47A1" />
        </View>
      </View>
    );
  }

  const renderEditModal = () => (
    <Modal
      visible={showEditModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowEditModal(false)}
    >
      <TouchableWithoutFeedback onPress={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('edit profile')}</Text>
                <TouchableOpacity 
                  onPress={() => setShowEditModal(false)}
                  style={styles.closeButton}
                >
                  <Icon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{t('name')} *</Text>
                  <TextInput
                    style={styles.input}
                    value={editedUserInfo.name}
                    onChangeText={(text) => setEditedUserInfo(prev => ({...prev, name: text.replace(/[^a-zA-Z ]/g, '')}))}
                    placeholder={t('enter your name')}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{t('phone number')} *</Text>
                  <TextInput
                    style={styles.input}
                    value={editedUserInfo.phone_number}
                    onChangeText={(text) => {
                      // Only allow digits
                      const formattedText = text.replace(/[^0-9]/g, '');
                      setEditedUserInfo(prev => ({...prev, phone_number: formattedText}));
                    }}
                    placeholder={t('enter 10-digit mobile number')}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                  <Text style={styles.inputHint}>{t('enter 10-digit number without +91')}</Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{t('email (optional)')}</Text>
                  <TextInput
                    style={styles.input}
                    value={editedUserInfo.email}
                    onChangeText={(text) => setEditedUserInfo(prev => ({...prev, email: text}))}
                    placeholder={t('enter your email')}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSaveUserInfo}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>{t('save')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  const renderDairyEditModal = () => (
    <Modal
      visible={showDairyEditModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowDairyEditModal(false)}
    >
      <TouchableWithoutFeedback onPress={() => setShowDairyEditModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('edit dairy information')}</Text>
                <TouchableOpacity 
                  onPress={() => setShowDairyEditModal(false)}
                  style={styles.closeButton}
                >
                  <Icon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.modalBody}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{ flexGrow: 0 }}
              >
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{t('dairy name')} *</Text>
                  <TextInput
                    style={styles.input}
                    value={editedDairyInfo.dairy_name}
                    onChangeText={(text) => setEditedDairyInfo(prev => ({...prev, dairy_name: text}))}
                    placeholder={t('enter dairy name')}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{t('dairy address')} *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={editedDairyInfo.dairy_address}
                    onChangeText={(text) => setEditedDairyInfo(prev => ({...prev, dairy_address: text}))}
                    placeholder={t('enter dairy address')}
                    multiline={true}
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{t('rate type')} *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={editedDairyInfo.rate_type}
                      onValueChange={(value) => setEditedDairyInfo(prev => ({...prev, rate_type: value}))}
                      style={styles.picker}
                    >
                      {RATE_TYPES.map((type) => (
                        <Picker.Item 
                          key={type.value} 
                          label={type.label} 
                          value={type.value}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowDairyEditModal(false)}
                >
                  <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.modalButton, styles.saveButton, savingDairy && styles.disabledButton]}
                  onPress={handleSaveDairyInfo}
                  disabled={savingDairy}
                >
                  {savingDairy ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>{t('save changes')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile')}</Text>
      </View>

      <View style={styles.content}>
        {/* User Info Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('personal information')}</Text>
            <TouchableOpacity onPress={handleEditPress}>
              <Icon name="pencil" size={20} color="#0D47A1" />
            </TouchableOpacity>
          </View>
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>{t('name')}:</Text>
              <Text style={styles.value}>{userInfo?.name || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>{t('phone')}:</Text>
              <Text style={styles.value}>{userInfo?.phone_number || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>{t('email')}:</Text>
              <Text style={styles.value}>{userInfo?.email || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Dairy Info Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('dairy information')}</Text>
            <TouchableOpacity onPress={handleEditDairyPress}>
              <Icon name="pencil" size={20} color="#0D47A1" />
            </TouchableOpacity>
          </View>
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>{t('name')}:</Text>
              <Text style={styles.value}>{dairyInfo?.dairy_name || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>{t('address')}:</Text>
              <Text style={styles.value}>{dairyInfo?.dairy_address || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>{t('rate type')}:</Text>
              <Text style={styles.value}>
                {dairyInfo?.rate_type === 'fat_snf' ? 'FAT + SNF' : 'FAT + CLR'}
              </Text>
            </View>
          </View>
        </View>

        {/* Referral Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('referral code')}</Text>
          </View>
          <View style={styles.infoContainer}>
            <View style={styles.referralRow}>
              <Text style={styles.referralCode}>{userInfo?.referral_code || 'N/A'}</Text>
              <TouchableOpacity 
                style={styles.copyButton}
                onPress={() => copyToClipboard(userInfo?.referral_code)}
              >
                <Text style={styles.copyButtonText}>{copyStatus}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {renderEditModal()}
      {renderDairyEditModal()}
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
    padding: 16,
    paddingTop: 10,
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
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
  },
  section: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0D47A1',
  },
  infoContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  label: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  referralRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  referralCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0D47A1',
  },
  copyButton: {
    backgroundColor: '#0D47A1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0D47A1',
  },
  closeButton: {
    padding: 5,
  },
  modalBody: {
    padding: 15,
    maxHeight: '80%',
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
  },
  saveButton: {
    backgroundColor: '#0D47A1',
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
    paddingVertical: 0,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default ProfileScreen; 
