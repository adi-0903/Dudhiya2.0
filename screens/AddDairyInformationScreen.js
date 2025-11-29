import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { saveDairyInfo } from '../services/api';

const RATE_TYPES = [
  { label: 'FAT + SNF', value: 'fat_snf' },
  { label: 'FAT + CLR', value: 'fat_clr' },
  { label: 'KG', value: 'kg_only' },
  { label: 'Liters', value: 'liters_only' },
];

const DairyInformationScreen = ({ navigation }) => {
  const [dairyName, setDairyName] = useState('');
  const [address, setAddress] = useState('');
  const [rateType, setRateType] = useState(RATE_TYPES[0].value);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!dairyName.trim()) {
      Alert.alert('Error', 'Please enter dairy name.');
      return;
    }

    if (!address.trim()) {
      Alert.alert('Error', 'Please enter dairy address.');
      return;
    }

    try {
      setIsLoading(true);
      
      const dairyData = {
        dairy_name: dairyName.trim(),
        dairy_address: address.trim(),
        rate_type: rateType,
      };

      await saveDairyInfo(dairyData);
      
      // Show success message before navigating
      Alert.alert(
        'Success',
        'Dairy information saved successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to Home screen and prevent going back
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        error.error || 'Failed to save dairy information. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Dairy Information</Text>

        <View style={styles.whiteContainer}>
          <View style={styles.waveTop} />

          <View style={styles.inputContainer}>
            <Icon name="business" size={20} color="#0D47A1" />
            <TextInput
              placeholder="Dairy Name *"
              value={dairyName}
              onChangeText={setDairyName}
              style={styles.input}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon name="location-on" size={20} color="#0D47A1" />
            <TextInput
              placeholder="Address *"
              value={address}
              onChangeText={setAddress}
              style={styles.input}
              multiline
              numberOfLines={3}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon name="attach-money" size={20} color="#0D47A1" />
            <Picker
              selectedValue={rateType}
              onValueChange={(itemValue) => setRateType(itemValue)}
              style={styles.input}
              enabled={!isLoading}
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

          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]} 
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Save & Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D47A1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
    zIndex: 2,
  },
  whiteContainer: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 40,
    padding: 20,
    paddingTop: 40,
    elevation: 10,
    zIndex: 2,
    overflow: 'hidden',
  },
  waveTop: {
    position: 'absolute',
    top: -35,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#0D47A1',
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F1F1',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginVertical: 10,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  input: {
    flex: 1,
    padding: 10,
    height: 60,
  },
  pickerItem: {
    color: '#0D47A1',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#0D47A1',
    borderRadius: 25,
    paddingVertical: 15,
    width: '100%',
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});

export default DairyInformationScreen; 