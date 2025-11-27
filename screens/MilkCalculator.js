import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Platform,
  Dimensions,
  StatusBar,
  Keyboard
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import useKeyboardDismiss from '../hooks/useKeyboardDismiss';

const HISTORY_STORAGE_KEY = '@milk_calculator_history';
import { useTranslation } from 'react-i18next';

const MilkCalculator = () => {
  const navigation = useNavigation();
  const { handleButtonPress } = useKeyboardDismiss();
  const [inputs, setInputs] = useState({
    quantity: '',
    rate: '',
    fat: '',
    snf: '',
    clr: '',
    calculatedSNF: ''
  });

  const [selectedOption, setSelectedOption] = useState('snf'); // 'snf' or 'clr'
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState({ buy: null, sell: null });
  const [showHistory, setShowHistory] = useState(false);
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

  // Load history when component mounts
  useEffect(() => {
    loadHistory();
  }, []);

  // Save history to AsyncStorage
  const saveHistory = async (newHistory) => {
    try {
      await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Error saving history:', error);
    }
  };

  // Load history from AsyncStorage
  const loadHistory = async () => {
    try {
      const savedHistory = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const calculateSNFFromCLR = (clr) => {
    if (!clr) return '';
    // Formula: SNF = CLR/4 + 0.20 * Fat + 0.14
    const clrValue = parseFloat(clr);
    const fatValue = parseFloat(inputs.fat) || 0;
    const snf = ((clrValue / 4) + (0.20 * fatValue) + 0.14)
    const SNF = Math.floor((snf * 100)) / 100;
    return SNF;
  };

  const handleInputChange = (name, value) => {
    // Format fat and snf to 1 decimal point
    if ((name === 'fat' || name === 'snf') && value !== '') {
      // Allow typing a decimal point
      if (value.endsWith('.')) {
        // Do nothing, allow user to type the decimal point
      } else {
        // Check if value contains a decimal point
        const decimalIndex = value.indexOf('.');
        if (decimalIndex !== -1 && value.length > decimalIndex + 2) {
          // Trim to 1 decimal place
          value = value.substring(0, decimalIndex + 2);
        }
      }
    }
    
    // Format CLR to 2 decimal points
    if (name === 'clr' && value !== '') {
      // Allow typing a decimal point
      if (value.endsWith('.')) {
        // Do nothing, allow user to type the decimal point
      } else {
        // Check if value contains a decimal point
        const decimalIndex = value.indexOf('.');
        if (decimalIndex !== -1 && value.length > decimalIndex + 3) {
          // Trim to 2 decimal places
          value = value.substring(0, decimalIndex + 3);
        }
      }
    }
    
    setInputs(prev => {
      const newInputs = {
        ...prev,
        [name]: value
      };
      
      // If CLR is selected and CLR or Fat value changes, update calculated SNF
      if (selectedOption === 'clr' && (name === 'clr' || name === 'fat')) {
        const calculatedSNF = calculateSNFFromCLR(name === 'clr' ? value : inputs.clr);
        return {
          ...newInputs,
          calculatedSNF: calculatedSNF
        };
      }
      
      return newInputs;
    });
  };

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
    // Clear the unselected field and calculated SNF
    setInputs(prev => ({
      ...prev,
      [option === 'snf' ? 'clr' : 'snf']: '',
      calculatedSNF: option === 'clr' ? calculateSNFFromCLR(prev.clr) : ''
    }));
  };

  const validateInputs = () => {
    const requiredFields = ['quantity', 'rate', 'fat'];
    // Add the selected option (snf or clr) to required fields
    requiredFields.push(selectedOption);
    
    const emptyFields = requiredFields.filter(field => !inputs[field]);
    
    if (emptyFields.length > 0) {
      Alert.alert(t('error'), t('please fill all required fields'));
      return false;
    }
    
    return true;
  };


  const calculate = () => {
    if (!validateInputs()) return;

    try {
      // Convert all numeric inputs to floats
      const weightKg = parseFloat(inputs.quantity);
      const fatPercentage = parseFloat(inputs.fat);
      const milkRate = parseFloat(inputs.rate);
      
      // Constants for calculations
      const buyBaseSnf = 9.0;
      const sellBaseSnf = 8.5;
      const baseFatPercentage = 6.5;

      // Get SNF percentage based on selected option
      let snfPercentageValue;
      if (selectedOption === 'snf') {
        snfPercentageValue = parseFloat(inputs.snf);
      } else {
        snfPercentageValue = parseFloat(calculateSNFFromCLR(inputs.clr));
      }

      // Calculate fat and SNF kg
      const fatKg = String(weightKg * (fatPercentage / 100));
      const snfKg = String(weightKg * (snfPercentageValue / 100));
      
      const sellfatKg = String(weightKg * (fatPercentage / 100));
      const sellsnfKg = String(weightKg * (snfPercentageValue / 100));

      // Calculate buy rates
      const buyFatRate = (milkRate * 60 / baseFatPercentage).toFixed(3);
      const buySnfRate = (milkRate * 40 / buyBaseSnf).toFixed(3);

      // Calculate sell rates
      const sellFatRate = (milkRate * 60 / baseFatPercentage).toFixed(3);
      const sellSnfRate = (milkRate * 40 / sellBaseSnf).toFixed(3);

      // Calculate final amounts
      const buyAmount = (
        parseFloat(fatKg) * parseFloat(buyFatRate) + 
        parseFloat(snfKg) * parseFloat(buySnfRate)
      ).toFixed(2);

      const sellAmount = (
        parseFloat(sellfatKg) * parseFloat(sellFatRate) + 
        parseFloat(sellsnfKg) * parseFloat(sellSnfRate)
      ).toFixed(3);

      // Calculate average rates
      const buyAvgRate = (parseFloat(buyAmount) / weightKg).toFixed(2);
      const sellAvgRate = (parseFloat(sellAmount) / weightKg).toFixed(2);

      // Save to history
      const calculationResult = {
        ...inputs,
        buyTotal: parseFloat(buyAmount),
        sellTotal: parseFloat(sellAmount),
        fatKg: parseFloat(fatKg),
        snfKg: parseFloat(snfKg),
        buyFatRate,
        buySnfRate,
        sellFatRate,
        sellSnfRate,
        timestamp: new Date().toLocaleString(),
        buyAvgRate,
        sellAvgRate
      };

      const newHistory = [calculationResult, ...history];
      setHistory(newHistory);
      saveHistory(newHistory);
      
      setResult({
        fatKg: parseFloat(fatKg),
        snfKg: parseFloat(snfKg),
        buyTotal: parseFloat(buyAmount),
        sellTotal: parseFloat(sellAmount),
        buyAvgRate: parseFloat(buyAvgRate),
        sellAvgRate: parseFloat(sellAvgRate)
      });

    } catch (error) {
      Alert.alert(t('error'), t('failed to calculate. please check your inputs.'));
    }
  };

  const reset = () => {
    setInputs({
      quantity: '',
      rate: '',
      fat: '',
      snf: '',
      clr: '',
      calculatedSNF: ''
    });
    setResult({ buy: null, sell: null });
  };

  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
      setHistory([]);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  const RadioButton = ({ selected, onPress, label }) => (
    <TouchableOpacity 
      style={styles.radioButtonContainer}
      onPress={onPress}
    >
      <View style={styles.radioButtonContent}>
        <View style={[styles.radioButton, selected && styles.radioButtonSelected]}>
          {selected && <View style={styles.radioButtonInner} />}
        </View>
        <Text style={styles.label}>{label}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1565C0" barStyle="light-content" />
      
      {/* Header with gradient-like appearance */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('milk calculator')}</Text>
      </View>

      <View style={styles.content}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Input Box Container */}
          <View style={styles.boxContainer}>
            <View style={styles.formHeaderContainer}>
              <Icon name="calculator-variant" size={20} color="#1565C0" />
              <Text style={styles.formHeaderText}>{t('enter milk details')}</Text>
            </View>
            
            <View style={styles.formContainer}>
              {/* First Row: Quantity and Rate */}
              <View style={styles.row}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Qty (kg)</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={inputs.quantity}
                      onChangeText={(value) => handleInputChange('quantity', value)}
                      placeholder="0.0"
                      placeholderTextColor="#aaa"
                    />
                    <Text style={styles.inputUnit}>kg</Text>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Rate (₹)</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputPrefix}>₹</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={inputs.rate}
                      onChangeText={(value) => handleInputChange('rate', value)}
                      placeholder="0.0"
                      placeholderTextColor="#aaa"
                    />
                  </View>
                </View>
              </View>

              {/* Second Row: SNF and Fat */}
              <View style={styles.row}>
                <View style={styles.inputGroup}>
                  <RadioButton 
                    selected={selectedOption === 'snf'} 
                    onPress={() => handleOptionSelect('snf')}
                    label="SNF (%)"
                  />
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={[
                        styles.input,
                        selectedOption !== 'snf' && styles.inputDisabled
                      ]}
                      keyboardType="numeric"
                      value={inputs.snf}
                      onChangeText={(value) => handleInputChange('snf', value)}
                      placeholder="0.0"
                      placeholderTextColor="#aaa"
                      editable={selectedOption === 'snf'}
                    />
                    <Text style={styles.inputUnit}>%</Text>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Fat (%)</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={inputs.fat}
                      onChangeText={(value) => handleInputChange('fat', value)}
                      placeholder="0.0"
                      placeholderTextColor="#aaa"
                    />
                    <Text style={styles.inputUnit}>%</Text>
                  </View>
                </View>
              </View>

              {/* Third Row: CLR with calculated SNF */}
              <View style={styles.row}>
                <View style={styles.inputGroup}>
                  <RadioButton 
                    selected={selectedOption === 'clr'} 
                    onPress={() => handleOptionSelect('clr')}
                    label="CLR"
                  />
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={[
                        styles.input,
                        selectedOption !== 'clr' && styles.inputDisabled
                      ]}
                      keyboardType="numeric"
                      value={inputs.clr}
                      onChangeText={(value) => handleInputChange('clr', value)}
                      placeholder="0.0"
                      placeholderTextColor="#aaa"
                      editable={selectedOption === 'clr'}
                    />
                  </View>
                </View>
                
                {selectedOption === 'clr' && (
                  <View style={styles.calculatedSnfContainer}>
                    <Icon name="arrow-right" size={20} color="#1565C0" />
                    <View style={styles.calculatedSnfValue}>
                      <Text style={styles.calculatedSnfLabel}>Calculated SNF</Text>
                      <Text style={styles.calculatedSnfText}>
                        {inputs.calculatedSNF ? `${inputs.calculatedSNF}%` : '-'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Action buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={[styles.button, styles.calculateButton]} 
                  onPress={handleButtonPress(calculate)}
                >
                  <Icon name="calculator-variant" size={18} color="#fff" />
                  <Text style={styles.buttonText}>{t('calculate')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.button, styles.resetButton]} 
                  onPress={handleButtonPress(reset)}
                >
                  <Icon name="refresh" size={18} color="#fff" />
                  <Text style={styles.buttonText}>{t('reset')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Results Card */}
          {result.buyTotal !== undefined && (
            <View style={styles.resultsMainCard}>
              <View style={styles.resultsHeader}>
                <Icon name="chart-line" size={20} color="#1565C0" />
                <Text style={styles.resultsTitle}>{t('calculation results')}</Text>
              </View>
              
              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Fat KG</Text>
                    <Text style={styles.detailValue}>{result.fatKg.toFixed(2)}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>SNF KG</Text>
                    <Text style={styles.detailValue}>{result.snfKg.toFixed(2)}</Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>{t('avg buy rate')}</Text>
                    <Text style={styles.detailValue}>₹{result.buyAvgRate}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>{t('avg sell rate')}</Text>
                    <Text style={styles.detailValue}>₹{result.sellAvgRate}</Text>
                  </View>
                </View>

                <View style={styles.amountCard}>
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>{t('buy amount')}</Text>
                    <Text style={styles.buyAmount}>₹{result.buyTotal.toFixed(2)}</Text>
                  </View>
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>{t('sell amount')}</Text>
                    <Text style={styles.sellAmount}>₹{result.sellTotal.toFixed(2)}</Text>
                  </View>
                  <View style={[styles.amountRow, styles.profitRow]}>
                    <Text style={styles.profitLabel}>{t('profit')}</Text>
                    <Text style={styles.profitAmount}>₹{(result.sellTotal - result.buyTotal).toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* History Toggle Button */}
          <TouchableOpacity 
            style={styles.historyToggleButton} 
            onPress={handleButtonPress(() => setShowHistory(!showHistory))}
          >
            <Icon name={showHistory ? "chevron-up" : "history"} size={20} color="#fff" />
            <Text style={styles.historyToggleText}>
              {showHistory ? t('hide history') : t('view history')}
            </Text>
          </TouchableOpacity>

          {/* History section */}
          {showHistory && (
            <View style={styles.historyContainer}>
              {history.length > 0 ? (
                <>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyTitle}>{t('calculation history')}</Text>
                    <TouchableOpacity 
                      style={styles.clearHistoryButton} 
                      onPress={handleButtonPress(clearHistory)}
                    >
                      <Icon name="delete-outline" size={18} color="#fff" />
                      <Text style={styles.clearHistoryText}>{t('clear')}</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {history.map((item, index) => (
                    <View key={index} style={styles.historyItem}>
                      <View style={styles.historyItemHeader}>
                        <Text style={styles.historyTimestamp}>{item.timestamp}</Text>
                      </View>
                      <View style={styles.historyDetails}>
                        <View style={styles.historyDetailRow}>
                          <View style={styles.historyDetailItem}>
                            <Text style={styles.historyDetailLabel}>Qty</Text>
                            <Text style={styles.historyDetailValue}>{item.quantity} kg</Text>
                          </View>
                          <View style={styles.historyDetailItem}>
                            <Text style={styles.historyDetailLabel}>Rate</Text>
                            <Text style={styles.historyDetailValue}>₹{item.rate}</Text>
                          </View>
                        </View>
                        
                        <View style={styles.historyDetailRow}>
                          <View style={styles.historyDetailItem}>
                            <Text style={styles.historyDetailLabel}>Fat</Text>
                            <Text style={styles.historyDetailValue}>{item.fat}%</Text>
                          </View>
                          <View style={styles.historyDetailItem}>
                            <Text style={styles.historyDetailLabel}>SNF</Text>
                            <Text style={styles.historyDetailValue}>
                              {item.snf || item.calculatedSNF || '-'}%
                            </Text>
                          </View>
                          {item.clr && (
                            <View style={styles.historyDetailItem}>
                              <Text style={styles.historyDetailLabel}>CLR</Text>
                              <Text style={styles.historyDetailValue}>{item.clr}</Text>
                            </View>
                          )}
                        </View>
                        
                        <View style={styles.historyResultsContainer}>
                          <View style={styles.historyResultItem}>
                            <Icon name="arrow-down" size={16} color="#4CAF50" />
                            <Text style={styles.historyBuyTotal}>
                              {t('buy')}: ₹{item.buyTotal.toFixed(2)}
                            </Text>
                          </View>
                          <View style={styles.historyResultItem}>
                            <Icon name="arrow-up" size={16} color="#FF9800" />
                            <Text style={styles.historySellTotal}>
                              {t('sell')}: ₹{item.sellTotal.toFixed(2)}
                            </Text>
                          </View>
                          <View style={styles.historyResultItem}>
                            <Icon name="cash" size={16} color="#2196F3" />
                            <Text style={styles.historyProfitTotal}>
                              {t('profit')}: ₹{(item.sellTotal - item.buyTotal).toFixed(2)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </>
              ) : (
                <View style={styles.emptyHistoryContainer}>
                  <Icon name="history" size={50} color="#e0e0e0" />
                  <Text style={styles.emptyHistoryText}>{t('no calculation history')}</Text>
                </View>
              )}
            </View>
          )}
          
          {/* Footer space */}
          <View style={styles.footerSpace} />
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerContent}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/logo.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1565C0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 15,
    paddingBottom: 20,
    backgroundColor: '#1565C0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
    textTransform: 'capitalize',
  },
  content: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 100,
  },
  formHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf3',
  },
  formHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1565C0',
    marginLeft: 8,
    textTransform: 'capitalize',
  },
  boxContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  formContainer: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-end',
  },
  inputGroup: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f9fafc',
    paddingHorizontal: 12,
  },
  inputPrefix: {
    fontSize: 16,
    color: '#333',
    marginRight: 4,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  inputUnit: {
    fontSize: 14,
    color: '#777',
    marginLeft: 4,
  },
  inputDisabled: {
    backgroundColor: '#f1f1f1',
    color: '#aaa',
  },
  radioButtonContainer: {
    padding: 4,
    marginBottom: 8,
  },
  radioButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#1565C0',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#1565C0',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1565C0',
  },
  calculatedSnfContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  calculatedSnfValue: {
    flex: 1,
    marginLeft: 10,
  },
  calculatedSnfLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  calculatedSnfText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1565C0',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 20,
    flex: 1,
  },
  calculateButton: {
    backgroundColor: '#1565C0',
    marginRight: 10,
  },
  resetButton: {
    backgroundColor: '#757575',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  resultsMainCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf3',
    paddingBottom: 12,
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1565C0',
    marginLeft: 8,
    textTransform: 'capitalize',
  },
  detailsContainer: {
    gap: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  amountCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  amountLabel: {
    fontSize: 15,
    color: '#555',
    fontWeight: '500',
  },
  buyAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  sellAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc5208',
  },
  profitRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 8,
    paddingTop: 12,
  },
  profitLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  profitAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0c56bb',
  },
  historyToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  historyToggleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  historyContainer: {
    marginBottom: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  clearHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5252',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  clearHistoryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  historyItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  historyItemHeader: {
    backgroundColor: '#f5f7fa',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf3',
  },
  historyTimestamp: {
    fontSize: 12,
    color: '#666',
  },
  historyDetails: {
    padding: 12,
  },
  historyDetailRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  historyDetailItem: {
    marginRight: 16,
  },
  historyDetailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  historyDetailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  historyResultsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e8edf3',
    paddingTop: 12,
  },
  historyResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyBuyTotal: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  historySellTotal: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  historyProfitTotal: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  emptyHistoryContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyHistoryText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  footerSpace: {
    height: 60,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 80,
    height: 35,
  },
  footerText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 8,
  },
});

export default MilkCalculator; 
