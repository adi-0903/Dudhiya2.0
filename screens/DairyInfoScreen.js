import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { getDairyInfo, updateDairyInfo } from '../services/api';

const RATE_TYPES = [
  { label: 'FAT + SNF', value: 'fat_snf' },
  { label: 'FAT + CLR', value: 'fat_clr' },
];

const DairyInfoScreen = ({ navigation }) => {
  const [dairyInfo, setDairyInfo] = useState({
    id: null,
    dairy_name: '',
    dairy_address: '',
    rate_type: RATE_TYPES[0].value
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDairyInfo();
  }, []);

  const fetchDairyInfo = async () => {
    try {
      setLoading(true);
      const data = await getDairyInfo();
      if (data) {
        setDairyInfo({
          id: data.id,
          dairy_name: data.dairy_name || '',
          dairy_address: data.dairy_address || '',
          rate_type: data.rate_type || RATE_TYPES[0].value
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch dairy information');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!dairyInfo.dairy_name || !dairyInfo.dairy_address) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (dairyInfo.dairy_name.length < 3) {
      Alert.alert('Error', 'Dairy name must be at least 3 characters long');
      return;
    }

    if (dairyInfo.dairy_address.length < 5) {
      Alert.alert('Error', 'Dairy address must be at least 5 characters long');
      return;
    }

    try {
      setSaving(true);
      await updateDairyInfo(dairyInfo);
      Alert.alert('Success', 'Dairy information updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', error.error || 'Failed to update dairy information');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0D47A1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dairy Information</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Icon name="store" size={20} color="#0D47A1" /> Dairy Name
              </Text>
              <TextInput
                style={styles.input}
                value={dairyInfo.dairy_name}
                onChangeText={(text) => setDairyInfo({ ...dairyInfo, dairy_name: text })}
                placeholder="Enter dairy name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Icon name="map-marker" size={20} color="#0D47A1" /> Dairy Address
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={dairyInfo.dairy_address}
                onChangeText={(text) => setDairyInfo({ ...dairyInfo, dairy_address: text })}
                placeholder="Enter dairy address"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Icon name="cash" size={20} color="#0D47A1" /> Rate Type
              </Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={dairyInfo.rate_type}
                  onValueChange={(value) => setDairyInfo({ ...dairyInfo, rate_type: value })}
                  style={styles.picker}
                  dropdownIconColor="#0D47A1"
                >
                  {RATE_TYPES.map((type) => (
                    <Picker.Item 
                      key={type.value} 
                      label={type.label} 
                      value={type.value}
                      style={styles.pickerItem}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.updateButton, saving && styles.disabledButton]}
              onPress={handleUpdate}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="content-save" size={20} color="#fff" />
                  <Text style={styles.updateButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D47A1',
    paddingTop: 10,
    paddingBottom: 16,
    paddingHorizontal: 16,
    elevation: 4,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: '#333',
  },
  pickerItem: {
    fontSize: 16,
  },
  updateButton: {
    backgroundColor: '#0D47A1',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    elevation: 2,
  },
  disabledButton: {
    opacity: 0.7,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default DairyInfoScreen;
