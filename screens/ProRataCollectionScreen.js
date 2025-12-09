import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  TextInput, 
  Alert, 
  Modal,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Dimensions,
  Animated
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getCurrentMarketPrice, getAllCustomers, getCustomers, createCollection, getCollections, getDairyInfo, updateDairyInfo, getProRataRateChart, upsertProRataRateChart } from '../services/api';
import BottomNav from '../components/BottomNav';
import { useTranslation } from 'react-i18next';
import useKeyboardDismiss from '../hooks/useKeyboardDismiss';
import { Picker } from '@react-native-picker/picker';
import { sanitizeDairyInfo as normalizeDairyInfo, buildDairyUpdatePayload, DEFAULT_DAIRY_SETTINGS } from '../utils/dairySettings';

const ProRataCollectionScreen = ({ navigation }) => {
  const [walletBalance, setWalletBalance] = useState("₹8"); // Replace with actual wallet balance
  const [fat, setFat] = useState('6.5');
  const [snf, setSnf] = useState(DEFAULT_DAIRY_SETTINGS.baseSnf);
  const [currentRate, setCurrentRate] = useState(null);
  const [isLoadingRate, setIsLoadingRate] = useState(true);
  const [showSnfModal, setShowSnfModal] = useState(false);
  const [snfError, setSnfError] = useState('');
  const [selectedTime, setSelectedTime] = useState('morning'); // 'morning' or 'evening'
  const [selectedAnimal, setSelectedAnimal] = useState('cow+buffalo');
  const [showAnimalModal, setShowAnimalModal] = useState(false);
  const [weight, setWeight] = useState('');
  const [fatPercent, setFatPercent] = useState('');
  const [snfPercent, setSnfPercent] = useState('');
  const [clr, setClr] = useState('');
  const [fatStepUpRate, setFatStepUpRate] = useState('');
  const [snfStepDownRate, setSnfStepDownRate] = useState('');
  // New: threshold-based step rates
  const [fatStepUpThresholds, setFatStepUpThresholds] = useState([]); // [{threshold: '6.5', rate: '0.27'}]
  const [snfStepDownThresholds, setSnfStepDownThresholds] = useState([]); // [{threshold: '8.5', rate: '0.39'}]
  const [fatSnfRatio, setFatSnfRatio] = useState(DEFAULT_DAIRY_SETTINGS.fatSnfRatio);
  const [errors, setErrors] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedRadios, setSelectedRadios] = useState({
    snf: true,  // SNF selected by default
    clr: false
  });
  const [dairyDetails, setDairyDetails] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [showCustomersList, setShowCustomersList] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [latestCollection, setLatestCollection] = useState(null);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [editedBaseSnf, setEditedBaseSnf] = useState('9.0');
  const allowedBaseSnfValues = ['9.0', '9.1', '9.2', '9.3', '9.5'];
  const allowedSnfValues = ['9.0', '9.1', '9.2', '9.3', '9.5'];
  const animalOptions = ['Cow', 'Buffalo', 'Cow + Buffalo'];
  const timeOptions = ['Morning', 'Evening'];
  const [showBaseSnfModal, setShowBaseSnfModal] = useState(false); 
  const { t, i18n } = useTranslation();
  const [showLowWalletPopup, setShowLowWalletPopup] = useState(false);
  const [showDuplicateCollectionPopup, setShowDuplicateCollectionPopup] = useState(false);
  const [duplicateCollectionInfo, setDuplicateCollectionInfo] = useState({
    date: '',
    time: ''
  });
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);
  const { handleButtonPress } = useKeyboardDismiss();
  // Confirmation modal state for Base SNF toggle (Pro-Rata)
  const [showBaseSnfConfirm, setShowBaseSnfConfirm] = useState(false);
  const [pendingBaseSnf, setPendingBaseSnf] = useState(null);
  const [baseSnfConfirmSource, setBaseSnfConfirmSource] = useState(null);

  // Confirmation modal state for Fat/SNF Ratio change
  const [showFatSnfRatioConfirm, setShowFatSnfRatioConfirm] = useState(false);
  const [pendingFatSnfRatio, setPendingFatSnfRatio] = useState(null);

  // Confirmation modal state for CLR Conversion Factor change
  const [showClrConversionConfirm, setShowClrConversionConfirm] = useState(false);
  const [pendingClrConversion, setPendingClrConversion] = useState(null);

  // Confirmation modal state for Rate Type change
  const [showRateTypeConfirm, setShowRateTypeConfirm] = useState(false);
  const [pendingRateType, setPendingRateType] = useState(null);
  
  // State for rate type in the rate settings modal
  const [tempRateType, setTempRateType] = useState(DEFAULT_DAIRY_SETTINGS.rateType);
  const [rateTypePickerValue, setRateTypePickerValue] = useState(DEFAULT_DAIRY_SETTINGS.rateType);

  // Focus states to control text alignment (placeholder centered by default)
  const [isFatFocused, setIsFatFocused] = useState(false);
  const [isWeightFocused, setIsWeightFocused] = useState(false);
  const [isSnfFocused, setIsSnfFocused] = useState(false);
  const [isClrFocused, setIsClrFocused] = useState(false);
  const [isFatStepUpFocused, setIsFatStepUpFocused] = useState(false);
  const [isSnfStepDownFocused, setIsSnfStepDownFocused] = useState(false);

  const [showInputLimitPopup, setShowInputLimitPopup] = useState(false);
  const [inputLimitMessage, setInputLimitMessage] = useState('');

  const fatFormatTimeoutRef = useRef(null);
  const snfFormatTimeoutRef = useRef(null);
  const clrFormatTimeoutRef = useRef(null);
  const rateChartHighlightAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => {
      if (fatFormatTimeoutRef.current) clearTimeout(fatFormatTimeoutRef.current);
      if (snfFormatTimeoutRef.current) clearTimeout(snfFormatTimeoutRef.current);
      if (clrFormatTimeoutRef.current) clearTimeout(clrFormatTimeoutRef.current);
    };
  }, []);

  // Rate Chart modal and thresholds (Pro-Rata gating UI)
  const [showRateChartModal, setShowRateChartModal] = useState(false);
  const [proRataFatThreshold, setProRataFatThreshold] = useState('6.5');
  const [proRataSnfThreshold, setProRataSnfThreshold] = useState('9.0');

  // Temp states for Rate Chart modal (edits are applied only on Save)
  const [tempFatSnfRatio, setTempFatSnfRatio] = useState(fatSnfRatio);
  const [tempFatStepUpRate, setTempFatStepUpRate] = useState(fatStepUpRate);
  const [tempSnfStepDownRate, setTempSnfStepDownRate] = useState(snfStepDownRate);
  // New: temp arrays for modal editing
  const [tempFatStepUpThresholds, setTempFatStepUpThresholds] = useState(fatStepUpThresholds);
  const [tempSnfStepDownThresholds, setTempSnfStepDownThresholds] = useState(snfStepDownThresholds);
  const [tempProRataFatThreshold, setTempProRataFatThreshold] = useState(proRataFatThreshold);
  const [tempProRataSnfThreshold, setTempProRataSnfThreshold] = useState(proRataSnfThreshold);

  // CLR to SNF conversion factor state (0.14 or 0.50)
  const [clrConversionFactor, setClrConversionFactor] = useState(DEFAULT_DAIRY_SETTINGS.clrConversionFactor);
  
  // Change Rates modal state
  const [showChangeRatesModal, setShowChangeRatesModal] = useState(false);
  const [tempBaseSnf, setTempBaseSnf] = useState(DEFAULT_DAIRY_SETTINGS.baseSnf);
  const [tempClrConversionFactor, setTempClrConversionFactor] = useState(DEFAULT_DAIRY_SETTINGS.clrConversionFactor);

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

  // Open Rate Chart modal with temp state initialized from current values
  const openRateChartModal = () => {
    setTempFatStepUpRate(fatStepUpRate);
    setTempSnfStepDownRate(snfStepDownRate);
    // Load temp copies of threshold rates for editing
    setTempFatStepUpThresholds([...fatStepUpThresholds]);
    setTempSnfStepDownThresholds([...snfStepDownThresholds]);
    setTempProRataFatThreshold(proRataFatThreshold);
    setTempProRataSnfThreshold(proRataSnfThreshold);
    setShowRateChartModal(true);
  };

  // Persist and load step rate inputs (Fat Stepup and SNF Stepdown)
  const [rateChartId, setRateChartId] = useState(null);
  const sortFatThresholds = (items = []) =>
    [...items].sort((a, b) => {
      if (a?.id && b?.id) {
        return a.id - b.id;
      }
      const aStep = parseFloat(a?.threshold) || 0;
      const bStep = parseFloat(b?.threshold) || 0;
      return aStep - bStep;
    });

  const sortSnfThresholds = (items = []) =>
    [...items].sort((a, b) => {
      if (a?.id && b?.id) {
        return a.id - b.id;
      }
      const aStep = parseFloat(a?.threshold) || 0;
      const bStep = parseFloat(b?.threshold) || 0;
      return aStep - bStep;
    });

  const loadStepRates = async () => {
    try {
      const response = await getProRataRateChart();
      if (response?.id) {
        setRateChartId(response.id);
      }

      const serverFatSteps = Array.isArray(response?.fat_step_up_rates)
        ? response.fat_step_up_rates.map((item) => ({
            threshold: String(item.step ?? ''),
            rate: item?.rate != null ? Number(Math.abs(item.rate)).toFixed(2) : '',
            id: item.id,
          }))
        : [{ threshold: '6.5', rate: '' }];

      const serverSnfSteps = Array.isArray(response?.snf_step_down_rates)
        ? response.snf_step_down_rates.map((item) => ({
            threshold: String(item.step ?? ''),
            rate: item?.rate != null ? Number(Math.abs(item.rate)).toFixed(2) : '',
            id: item.id,
          }))
        : [{ threshold: '9.0', rate: '' }];

      setFatStepUpThresholds(sortFatThresholds(serverFatSteps));
      setSnfStepDownThresholds(sortSnfThresholds(serverSnfSteps));
    } catch (e) {
      console.error('Error loading pro-rata rate chart:', e);
      setFatStepUpThresholds([{ threshold: '6.5', rate: '' }]);
      setSnfStepDownThresholds([{ threshold: '9.0', rate: '' }]);
    }
  };

  useEffect(() => {
    loadStepRates();
  }, []);

  // Helpers: resolve applied rate from Fat thresholds (value >= threshold)
  const resolveRateFromFatThresholds = (value, thresholds) => {
    if (!Array.isArray(thresholds) || thresholds.length === 0) return 0;
    const val = parseFloat(value);
    if (isNaN(val)) return 0;
    
    // Sort thresholds by threshold value (ascending)
    const sortedThresholds = thresholds
      .filter(t => !isNaN(parseFloat(t.threshold)) && !isNaN(parseFloat(t.rate)))
      .sort((a, b) => parseFloat(a.threshold) - parseFloat(b.threshold));
    
    if (sortedThresholds.length === 0) return 0;
    
    // Find the applicable rate based on threshold logic
    // If value is below the first threshold, no rate applies
    if (val < parseFloat(sortedThresholds[0].threshold)) return 0;
    
    // Find the highest threshold that the value meets or exceeds
    let applicableRate = 0;
    for (let i = 0; i < sortedThresholds.length; i++) {
      const threshold = parseFloat(sortedThresholds[i].threshold);
      const rate = parseFloat(sortedThresholds[i].rate);
      if (val >= threshold) {
        applicableRate = rate;
      } else {
        break;
      }
    }
    
    return applicableRate;
  };

  // Helpers: resolve applied rate from SNF thresholds (value < threshold)
  const resolveRateFromSnfThresholds = (value, thresholds) => {
    if (!Array.isArray(thresholds) || thresholds.length === 0) return 0;
    const val = parseFloat(value);
    if (isNaN(val)) return 0;
    
    // Sort thresholds by threshold value (descending) for SNF step-down
    const sortedThresholds = thresholds
      .filter(t => !isNaN(parseFloat(t.threshold)) && !isNaN(parseFloat(t.rate)))
      .sort((a, b) => parseFloat(b.threshold) - parseFloat(a.threshold));
    
    if (sortedThresholds.length === 0) return 0;
    
    // Find the applicable rate based on SNF threshold logic
    // Rate applies when value is BELOW the threshold
    let applicableRate = 0;
    for (let i = 0; i < sortedThresholds.length; i++) {
      const threshold = parseFloat(sortedThresholds[i].threshold);
      const rate = parseFloat(sortedThresholds[i].rate);
      if (val < threshold) {
        applicableRate = rate;
        break; // Take the first (highest) threshold that value is below
      }
    }
    
    return applicableRate;
  };

  // Helpers for modal list editing
  const sanitizeDecimal = (text) => {
    const sanitized = (text || '').replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    if (parts.length > 2) return parts[0] + '.' + parts.slice(1).join('').slice(0, 2);
    if (parts[1] && parts[1].length > 2) return parts[0] + '.' + parts[1].slice(0, 2);
    return sanitized;
  };

  // Normal-collection-like percent formatter for From/To fields
  const trimDecimalString = (num) => {
    let s = num.toFixed(2);
    s = s.replace(/\.00$/, '');
    s = s.replace(/(\.\d)0$/, '$1');
    return s;
  };
  const normalizePercentEntry = (text) => {
    const raw = (text || '').replace(/[^0-9.]/g, '');
    if (raw === '') return '';
    if (raw.includes('.')) {
      const parts = raw.split('.');
      const left = parts[0];
      const rightAll = parts.slice(1).join('');
      const right = rightAll.slice(0, 2);
      return right.length > 0 ? `${left}.${right}` : `${left}.`;
    }
    const digits = raw; // keep all digits user typed
    if (digits.length === 1) return digits; // "7" -> "7"
    if (digits.length === 2) return `${digits[0]}.${digits[1]}`; // "72" -> "7.2"
    // 3 or more digits -> take first as integer, next two as decimals, then round to nearest 0.05
    const composed = `${digits[0]}.${digits.slice(1, 3)}`; // "743" -> "7.43"
    const val = parseFloat(composed);
    if (isNaN(val)) return '';
    const rounded = Math.round(val / 0.05) * 0.05; // nearest 0.05 -> 7.45
    return trimDecimalString(rounded);
  };

  // Validate that a threshold list has at least one complete numeric row
  const isValidThresholdList = (thresholds) => {
    if (!Array.isArray(thresholds)) return false;
    return thresholds.some(t => {
      const threshold = parseFloat(t?.threshold);
      const rate = parseFloat(t?.rate);
      return !isNaN(threshold) && !isNaN(rate);
    });
  };

  const hasIncompleteThresholdRow = (thresholds) => {
    if (!Array.isArray(thresholds)) return false;
    return thresholds.some((t) => {
      const thresholdFilled = String(t?.threshold ?? '').trim() !== '';
      const rateFilled = String(t?.rate ?? '').trim() !== '';
      return (thresholdFilled || rateFilled) && !(thresholdFilled && rateFilled);
    });
  };

  const isRateChartSet = isValidThresholdList(fatStepUpThresholds) && isValidThresholdList(snfStepDownThresholds);

  useEffect(() => {
    if (!isRateChartSet) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(rateChartHighlightAnim, {
            toValue: 0.5,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(rateChartHighlightAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => {
        animation.stop();
        rateChartHighlightAnim.setValue(1);
      };
    } else {
      rateChartHighlightAnim.setValue(1);
    }
  }, [isRateChartSet, rateChartHighlightAnim]);

  const addFatThreshold = () => {
    const arr = tempFatStepUpThresholds || [];
    setTempFatStepUpThresholds([...arr, { threshold: '', rate: '' }]);
  };
  const updateFatThreshold = (index, field, value) => {
    const next = [...tempFatStepUpThresholds];
    
    if (field === 'threshold') {
      // Use simple decimal formatting (no auto-conversion like 67 -> 6.7)
      const formattedValue = sanitizeDecimal(value);
      const numValue = parseFloat(formattedValue);
      
      // Allow empty value or continue typing
      if (formattedValue === '' || isNaN(numValue)) {
        next[index] = { ...next[index], [field]: formattedValue };
        setTempFatStepUpThresholds(next);
        return;
      }
      
      // Check maximum limit for Fat threshold (12)
      if (numValue > 12) {
        Alert.alert(
          t('invalid input'),
          t('fat step max error').replace('{value}', numValue),
          [{ text: t('ok') }]
        );
        return; // Don't allow values greater than 12
      }
      
      // Allow partial input while typing, but be smart about it
      let isPartialInput = formattedValue.endsWith('.'); // "6." is always partial
      
      // Allow single-digit entries while typing so users can complete multi-digit thresholds
      if (formattedValue.length === 1 && !formattedValue.includes('.')) {
        isPartialInput = true;
      }
      
      if (!isPartialInput) {
        // Simple incremental checker: must be greater than all existing thresholds
        const existingThresholds = [];
        for (let i = 0; i < next.length; i++) {
          if (i !== index && next[i].threshold && next[i].threshold !== '') {
            const val = parseFloat(next[i].threshold);
            if (!isNaN(val)) {
              existingThresholds.push(val);
            }
          }
        }
        
        if (existingThresholds.length > 0) {
          const maxExisting = Math.max(...existingThresholds);
          if (numValue <= maxExisting) {
            Alert.alert(
              t('invalid fat step'),
              t('fat step order error').replace('{value}', numValue).replace('{existing}', maxExisting).replace('{existing}', maxExisting),
              [{ text: t('ok') }]
            );
            return; // Don't allow smaller or equal values
          }
        }
      }
      
      next[index] = { ...next[index], [field]: formattedValue };
    } else {
      // For rate field
      next[index] = { ...next[index], [field]: sanitizeDecimal(value) };
    }
    
    setTempFatStepUpThresholds(next);
  };
  const removeFatThreshold = (index) => {
    const next = [...tempFatStepUpThresholds];
    next.splice(index, 1);
    setTempFatStepUpThresholds(next);
  };

  const addSnfThreshold = () => {
    const arr = tempSnfStepDownThresholds || [];
    setTempSnfStepDownThresholds([...arr, { threshold: '', rate: '' }]);
  };
  const updateSnfThreshold = (index, field, value) => {
    const next = [...tempSnfStepDownThresholds];
    
    if (field === 'threshold') {
      // Use simple decimal formatting (no auto-conversion like 67 -> 6.7)
      const formattedValue = sanitizeDecimal(value);
      const numValue = parseFloat(formattedValue);
      
      // Allow empty value or continue typing
      if (formattedValue === '' || isNaN(numValue)) {
        next[index] = { ...next[index], [field]: formattedValue };
        setTempSnfStepDownThresholds(next);
        return;
      }
      
      // Check maximum limit for SNF threshold (12)
      if (numValue > 12) {
        Alert.alert(
          t('invalid input'),
          t('snf step max error').replace('{value}', numValue),
          [{ text: t('ok') }]
        );
        return; // Don't allow values greater than 12
      }
      
      // Allow partial input while typing, but be smart about it
      let isPartialInput = formattedValue.endsWith('.'); // "8." is always partial
      
      // For single digits, only treat as partial if they could lead to valid values
      if (formattedValue.length === 1 && !formattedValue.includes('.')) {
        const existingThresholds = [];
        for (let i = 0; i < next.length; i++) {
          if (i !== index && next[i].threshold && next[i].threshold !== '') {
            const val = parseFloat(next[i].threshold);
            if (!isNaN(val)) {
              existingThresholds.push(val);
            }
          }
        }
        
        if (existingThresholds.length > 0) {
          const minExisting = Math.min(...existingThresholds);
          // Only treat as partial if the digit could lead to a valid decimal
          // e.g., if min is 8.5, then "8" could become "8.4" (valid), but "9" cannot become anything valid
          const couldBeValidDecimal = numValue < minExisting;
          isPartialInput = couldBeValidDecimal;
        }
      }
      
      if (!isPartialInput) {
        // Simple decremental checker: must be smaller than all existing thresholds
        const existingThresholds = [];
        for (let i = 0; i < next.length; i++) {
          if (i !== index && next[i].threshold && next[i].threshold !== '') {
            const val = parseFloat(next[i].threshold);
            if (!isNaN(val)) {
              existingThresholds.push(val);
            }
          }
        }
        
        if (existingThresholds.length > 0) {
          const minExisting = Math.min(...existingThresholds);
          if (numValue >= minExisting) {
            Alert.alert(
              t('invalid snf step'),
              t('snf step order error').replace('{value}', numValue).replace('{existing}', minExisting).replace('{existing}', minExisting),
              [{ text: t('ok') }]
            );
            return; // Don't allow larger or equal values
          }
        }
      }
      
      next[index] = { ...next[index], [field]: formattedValue };
    } else {
      // For rate field
      next[index] = { ...next[index], [field]: sanitizeDecimal(value) };
    }
    
    setTempSnfStepDownThresholds(next);
  };
  const removeSnfThreshold = (index) => {
    const next = [...tempSnfStepDownThresholds];
    next.splice(index, 1);
    setTempSnfStepDownThresholds(next);
  };

  // Persist and load Pro-Rata thresholds (Fat and SNF)
  useEffect(() => {
    const loadProRataThresholds = async () => {
      try {
        const savedFatTh = await AsyncStorage.getItem('@pro_rata_fat_threshold');
        if (savedFatTh) setProRataFatThreshold(savedFatTh);
      } catch (e) {}

      try {
        const savedSnfTh = await AsyncStorage.getItem('@pro_rata_snf_threshold');
        if (savedSnfTh !== null) setProRataSnfThreshold(savedSnfTh);
      } catch (e) {}
    };
    loadProRataThresholds();
  }, []);

  const getRadiosForRateType = (rateType) => {
    if (rateType === 'fat_snf') {
      return { snf: true, clr: false };
    }
    if (rateType === 'fat_clr') {
      return { snf: false, clr: true };
    }
    return { snf: false, clr: false };
  };

  const RATE_TYPES = [
    { label: 'FAT + SNF', value: 'fat_snf' },
    { label: 'FAT + CLR', value: 'fat_clr' },
    { label: 'KG', value: 'kg_only' },
    { label: 'Liters', value: 'liters_only' }
  ];

  const RATE_TYPE_LABELS = RATE_TYPES.reduce((acc, option) => {
    acc[option.value] = option.label;
    return acc;
  }, {});

  // Add useFocusEffect to fetch rate when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadStepRates();
      fetchCurrentRate();
      fetchCustomers();
      fetchLatestCollection();
      fetchDairyInfo(); // Add this line to fetch dairy info
    }, [])
  );

  // Add function to fetch dairy info and set radio buttons
  const fetchDairyInfo = async () => {
    try {
      const dairyInfo = await getDairyInfo();
      const sanitizedInfo = normalizeDairyInfo(dairyInfo);
      if (sanitizedInfo) {
        setDairyDetails(sanitizedInfo);
        const baseSnfValue = sanitizedInfo.base_snf || DEFAULT_DAIRY_SETTINGS.baseSnf;
        setSnf(baseSnfValue);
        setTempBaseSnf(baseSnfValue);

        const ratioValue = sanitizedInfo.fat_snf_ratio || DEFAULT_DAIRY_SETTINGS.fatSnfRatio;
        setFatSnfRatio(ratioValue);
        setTempFatSnfRatio(ratioValue);

        const clrValue = sanitizedInfo.clr_conversion_factor || DEFAULT_DAIRY_SETTINGS.clrConversionFactor;
        setClrConversionFactor(clrValue);
        setTempClrConversionFactor(clrValue);

        const resolvedRateType = sanitizedInfo.rate_type || DEFAULT_DAIRY_SETTINGS.rateType;
        setTempRateType(resolvedRateType);
        setRateTypePickerValue(resolvedRateType);
        setSelectedRadios(getRadiosForRateType(resolvedRateType));
      }
    } catch (error) {
      console.error('Error fetching dairy info:', error);
      return null;
    }
    return null;
  };

  const ensureDairyDetailsForUpdate = async () => {
    if (dairyDetails?.id) {
      return dairyDetails;
    }
    return await fetchDairyInfo();
  };

  const persistDairySettings = async (overrides = {}, options = {}) => {
    const { skipIfUnchanged = false } = options;
    try {
      const current = await ensureDairyDetailsForUpdate();
      if (!current?.id) {
        return null;
      }

      const merged = { ...current, ...overrides };
      if (
        skipIfUnchanged &&
        Object.keys(overrides).every((key) => String(current[key]) === String(merged[key]))
      ) {
        return current;
      }

      const payload = buildDairyUpdatePayload(current, overrides);
      if (!payload) {
        return current;
      }

      const updated = await updateDairyInfo(payload);
      const sanitized = normalizeDairyInfo(updated);
      setDairyDetails(sanitized);
      setSnf(sanitized.base_snf || DEFAULT_DAIRY_SETTINGS.baseSnf);
      setTempBaseSnf(sanitized.base_snf || DEFAULT_DAIRY_SETTINGS.baseSnf);
      setFatSnfRatio(sanitized.fat_snf_ratio || DEFAULT_DAIRY_SETTINGS.fatSnfRatio);
      setTempFatSnfRatio(sanitized.fat_snf_ratio || DEFAULT_DAIRY_SETTINGS.fatSnfRatio);
      setClrConversionFactor(sanitized.clr_conversion_factor || DEFAULT_DAIRY_SETTINGS.clrConversionFactor);
      setTempClrConversionFactor(sanitized.clr_conversion_factor || DEFAULT_DAIRY_SETTINGS.clrConversionFactor);
      const resolvedRateType = sanitized.rate_type || DEFAULT_DAIRY_SETTINGS.rateType;
      setTempRateType(resolvedRateType);
      setRateTypePickerValue(resolvedRateType);
      setSelectedRadios(getRadiosForRateType(resolvedRateType));
      return sanitized;
    } catch (error) {
      console.error('Error saving dairy settings:', error);
      return null;
    }
  };

  const fetchCurrentRate = async () => {
    try {
      setIsLoadingRate(true);
      const response = await getCurrentMarketPrice();
      if (response && response.price) {
        setCurrentRate(response.price);
      }
    } catch (error) {
      setCurrentRate(0);
    } finally {
      setIsLoadingRate(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      setIsLoadingCustomers(true);
      const response = await getAllCustomers();
      setCustomers(response.results || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setIsLoadingCustomers(false);
    }
  }

  const triggerInputLimitPopup = (translationKey) => {
    setInputLimitMessage(t(translationKey));
    setShowInputLimitPopup(true);
  };

  const formatWithTrailingDecimal = (rawValue, maxValue, decimals, onOverflow) => {
    if (!rawValue) return '';

    const sanitized = (rawValue || '').replace(/[^0-9.]/g, '');

    // Helper to truncate (not round) to the requested decimal places
    const toFixedTruncate = (num) => {
      const factor = Math.pow(10, decimals);
      const truncated = Math.floor(num * factor) / factor;
      return truncated.toFixed(decimals);
    };

    // If user already entered a decimal point, normalize, optionally scale down, and clamp
    if (sanitized.includes('.')) {
      let num = parseFloat(sanitized);
      if (isNaN(num)) return '';

      // Example cases for FAT:
      // 61.  -> 61.0 / 10 = 6.10
      // 61.5 -> 61.5 / 10 = 6.15
      if (num > maxValue) {
        const divided = num / 10;
        if (divided > maxValue) {
          if (onOverflow) onOverflow();
          return '';
        }
        num = divided;
      }

      return toFixedTruncate(num);
    }

    const digits = sanitized.replace(/\D/g, '');
    if (!digits) return '';
    const length = digits.length;

    // Single digit -> D.0 / D.00 (e.g. 6 -> 6.00), with special handling for fat/SNF when the digit is 1
    if (length === 1) {
      const num = parseFloat(digits);
      if (isNaN(num)) return '';
      if (num > maxValue) {
        if (onOverflow) onOverflow();
        return '';
      }

      // For fat/SNF inputs (max 15, 2 decimals), treat a lone "1" as 10.00
      if (num === 1 && maxValue === 15 && decimals === 2) {
        const minVal = 10;
        if (minVal > maxValue) {
          if (onOverflow) onOverflow();
          return '';
        }
        return toFixedTruncate(minVal);
      }

      return toFixedTruncate(num);
    }

    const isLeadingOneFatSnf = digits[0] === '1' && maxValue === 15 && decimals === 2;

    if (isLeadingOneFatSnf) {
      // Fat/SNF leading-1 mappings (max 15, 2 decimals):
      // 1   -> 10.00  (handled above)
      // 12  -> 12.00
      // 134 -> 13.40
      // 1345 -> 13.45

      let num;

      if (length === 2) {
        // Two digits (10–15) -> whole number with .00
        num = parseInt(digits, 10);
      } else {
        // Three or more digits: first two as integer, next up to two as decimal
        const intPartStr = digits.slice(0, 2);
        const decimalDigits = digits.slice(2, 4);
        num = parseFloat(`${intPartStr}.${decimalDigits}`);
      }

      if (isNaN(num)) return '';
      if (num > maxValue) {
        if (onOverflow) onOverflow();
        return '';
      }

      return toFixedTruncate(num);
    }

    // CLR-specific mappings (max 36, 2 decimals):
    // 24  -> 24.00
    // 239 -> 23.90
    // 3025 -> 30.25
    if (maxValue === 36 && decimals === 2) {
      let num;

      if (length === 2) {
        // Two digits -> whole number with .00
        num = parseInt(digits, 10);
      } else if (length === 3) {
        // Three digits: first two as integer, last digit as decimal (e.g. 239 -> 23.9)
        const intPartStr = digits.slice(0, 2);
        const decimalDigits = digits.slice(2);
        num = parseFloat(`${intPartStr}.${decimalDigits}`);
      } else {
        // Four or more digits: last TWO digits as decimal (e.g. 3025 -> 30.25)
        const intPart = digits.slice(0, length - 2);
        const fracPart = digits.slice(-2);
        num = parseFloat(`${intPart}.${fracPart}`);
      }

      if (isNaN(num)) return '';
      if (num > maxValue) {
        if (onOverflow) onOverflow();
        return '';
      }
      return toFixedTruncate(num);
    }

    // Fallback: original behavior for other fields
    // Two digits: last digit as decimal (e.g. 61 -> 6.10)
    if (length === 2) {
      const intPart = digits.slice(0, 1);
      const fracPart = digits.slice(1);
      let num = parseFloat(`${intPart}.${fracPart}`);
      if (isNaN(num)) return '';
      if (num > maxValue) {
        if (onOverflow) onOverflow();
        return '';
      }
      return toFixedTruncate(num);
    }

    // Three or more digits: last TWO digits as decimal (e.g. 1267 -> 12.67, 3025 -> 30.25)
    const intPart = digits.slice(0, length - 2);
    const fracPart = digits.slice(-2);
    let num = parseFloat(`${intPart}.${fracPart}`);
    if (isNaN(num)) return '';
    if (num > maxValue) {
      if (onOverflow) onOverflow();
      return '';
    }
    return toFixedTruncate(num);
  };

  const scheduleFatFormatting = () => {
    if (fatFormatTimeoutRef.current) clearTimeout(fatFormatTimeoutRef.current);
    fatFormatTimeoutRef.current = setTimeout(() => {
      setFatPercent((current) =>
        formatWithTrailingDecimal(current, 15.0, 2, () => triggerInputLimitPopup('fat limit error'))
      );
    }, 2000);
  };

  const scheduleSnfFormatting = () => {
    if (snfFormatTimeoutRef.current) clearTimeout(snfFormatTimeoutRef.current);
    snfFormatTimeoutRef.current = setTimeout(() => {
      setSnfPercent((current) =>
        formatWithTrailingDecimal(current, 15.0, 2, () => triggerInputLimitPopup('snf limit error'))
      );
    }, 2000);
  };

  const scheduleClrFormatting = () => {
    if (clrFormatTimeoutRef.current) clearTimeout(clrFormatTimeoutRef.current);
    clrFormatTimeoutRef.current = setTimeout(() => {
      setClr((current) =>
        formatWithTrailingDecimal(current, 36.0, 2, () => triggerInputLimitPopup('clr limit error'))
      );
    }, 2000);
  };

  const handleFatPercentInput = (text) => {
    const raw = (text || '').replace(/[^0-9.]/g, '');

    if (raw === '') {
      if (fatFormatTimeoutRef.current) clearTimeout(fatFormatTimeoutRef.current);
      setFatPercent('');
      return;
    }

    setFatPercent(raw);
    scheduleFatFormatting();
  };

  const handleSnfPercentInput = (text) => {
    const raw = (text || '').replace(/[^0-9.]/g, '');

    if (raw === '') {
      if (snfFormatTimeoutRef.current) clearTimeout(snfFormatTimeoutRef.current);
      setSnfPercent('');
      return;
    }

    setSnfPercent(raw);
    scheduleSnfFormatting();
  };

  const handleClrInput = (text) => {
    const raw = (text || '').replace(/[^0-9.]/g, '');

    if (raw === '') {
      if (clrFormatTimeoutRef.current) clearTimeout(clrFormatTimeoutRef.current);
      setClr('');
      return;
    }

    setClr(raw);
    scheduleClrFormatting();
  };

  const handleClrRadioPress = () => {
    setSelectedRadios({
      snf: false,
      clr: true
    });
    // Clear SNF input when switching to CLR
    setSnfPercent('');
    setClr('');  // Also clear CLR input when switching to it
  };

  const handleSnfRadioPress = () => {
    setSelectedRadios({
      snf: true,
      clr: false
    });
    // Clear CLR input when switching to SNF
    setClr('');
    setSnfPercent('');  // Also clear SNF input when switching to it
  };

  // Handler to toggle Base SNF and persist it
  const handleBaseSnfToggle = async (value) => {
    try {
      setSnf(value);
      setTempBaseSnf(value);
      await persistDairySettings({ base_snf: value }, { skipIfUnchanged: true });
    } catch (error) {
      console.error('Error saving Base SNF:', error);
    }
  };

  // Handler to change Fat/SNF ratio and persist it
  const handleFatSnfRatioChange = async (value) => {
    try {
      setFatSnfRatio(value);
      await persistDairySettings({ fat_snf_ratio: value }, { skipIfUnchanged: true });
    } catch (e) {
      // ignore persist errors silently
    }
  };

  // Handlers for pro-rata thresholds (do not persist on each keystroke; persist on Save in modal)
  const handleProRataFatThresholdInput = (text) => {
    const sanitized = (text || '').replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    if (parts.length > 2) return; // only one decimal point
    if (parts[1] && parts[1].length > 2) return; // max 2 decimals
    // Limit value to realistic range
    const num = parseFloat(sanitized);
    if (!isNaN(num) && num <= 15.9) {
      setProRataFatThreshold(sanitized);
    } else if (sanitized === '') {
      setProRataFatThreshold('');
    }
  };

  const handleProRataSnfThresholdInput = (text) => {
    const sanitized = (text || '').replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    const num = parseFloat(sanitized);
    if (!isNaN(num) && num <= 15.9) {
      setProRataSnfThreshold(sanitized);
    } else if (sanitized === '') {
      setProRataSnfThreshold(''); // optional
    }
  };

  // Temp handlers for thresholds (for modal only)
  const handleTempProRataFatThresholdInput = (text) => {
    const sanitized = (text || '').replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    const num = parseFloat(sanitized);
    if (!isNaN(num) && num <= 15.9) {
      setTempProRataFatThreshold(sanitized);
    } else if (sanitized === '') {
      setTempProRataFatThreshold('');
    }
  };

  const handleTempProRataSnfThresholdInput = (text) => {
    const sanitized = (text || '').replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    const num = parseFloat(sanitized);
    if (!isNaN(num) && num <= 15.9) {
      setTempProRataSnfThreshold(sanitized);
    } else if (sanitized === '') {
      setTempProRataSnfThreshold(''); // optional
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
          customer.name.toLowerCase().includes(searchLower)
        );
      });
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers([]);
    }
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setSearchQuery(`${customer.customer_id}-${customer.name}`);
    setShowCustomersList(false);
  };

  const validateInputs = () => {
    const newErrors = {};
    if (!selectedCustomer) newErrors.customer = 'Please select a customer';
    if (!selectedTime) newErrors.time = 'Please select morning or evening';
    if (!weight) newErrors.weight = 'Required';
    if (!fatPercent) newErrors.fatPercent = 'Required';
    if (selectedRadios.snf && !snfPercent) newErrors.snfPercent = 'Required';
    if (selectedRadios.clr && !clr) newErrors.clr = 'Required';
    if (!selectedRadios.snf && !selectedRadios.clr) newErrors.radio = 'Please select SNF% or CLR';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!selectedCustomer) {
      Alert.alert(
        t('customer required'),
        t('please select a customer before proceeding.'),
        [{ text: t('ok'), onPress: () => {} }]
      );
      return;
    }

    if (validateInputs()) {
      try {
        // Convert all numeric inputs to floats
        const weightKg = parseFloat(weight);

        const formattedFat = formatWithTrailingDecimal(
          fatPercent,
          15.0,
          2,
          () => triggerInputLimitPopup('fat limit error')
        );
        if (!formattedFat) {
          setFatPercent('');
          return;
        }
        const fatPercentage = parseFloat(formattedFat);
        setFatPercent(formattedFat);

        const milkRate = parseFloat(currentRate);
        const baseSnfPercentage = parseFloat(snf);

        // Calculate liters from kg (assuming 1.03 density factor)
        const liters = (weightKg / 1.02249).toFixed(2);

        // Calculate fat kg - Remove slice limitation
        const fatKg = Math.floor((weightKg * (fatPercentage / 100)) * 100) / 100; //String(weightKg * (fatPercentage / 100)).slice(0, (String(weightKg * (fatPercentage / 100)).indexOf('.')) + 3);        

        let snfPercentageValue;
        let clrValue = '';

        if (selectedRadios.clr) {
          const formattedClr = formatWithTrailingDecimal(
            clr,
            36.0,
            2,
            () => triggerInputLimitPopup('clr limit error')
          );
          if (!formattedClr) {
            setClr('');
            return;
          }
          const snfFromClr = calculateSnfFromClr(formattedClr, formattedFat);
          if (snfFromClr === '') {
            Alert.alert(
              t('invalid input'),
              t('please provide valid clr and fat values.')
            );
            return;
          }
          snfPercentageValue = parseFloat(snfFromClr);
          const parsedClr = parseFloat(formattedClr);
          clrValue = !isNaN(parsedClr) ? parsedClr.toFixed(2) : '';
          setClr(formattedClr);
        } else {
          const formattedSnf = formatWithTrailingDecimal(
            snfPercent,
            15.0,
            2,
            () => triggerInputLimitPopup('snf limit error')
          );
          if (!formattedSnf) {
            setSnfPercent('');
            return;
          }
          snfPercentageValue = parseFloat(formattedSnf);
          setSnfPercent(formattedSnf);
          clrValue = '';
        }

        // Calculate SNF kg - Remove slice limitation
        const snfKg = Math.floor((weightKg * (snfPercentageValue / 100)) * 100) / 100;  //String(weightKg * (snfPercentageValue / 100)).slice(0, (String(weightKg * (snfPercentageValue / 100)).indexOf('.')) + 3);

        // Calculate rates using selected fat/SNF ratio
        const fatRatioPercent = fatSnfRatio === '60_40' ? 60 : 52;
        const snfRatioPercent = fatSnfRatio === '60_40' ? 40 : 48;
        const fatRate = Math.floor((milkRate * fatRatioPercent / 6.5) * 100) / 100;
        const snfRate = Math.floor((milkRate * snfRatioPercent / baseSnfPercentage) * 100) / 100;

        // Pro-rata calculation logic
        let finalRate = milkRate;
        let amountNum = 0;
        // Determine pro-rata applicability using threshold system
        const fatValForGate = parseFloat(fatPercentage);
        const isProRata = Array.isArray(fatStepUpThresholds) && fatStepUpThresholds.some(t => {
          const threshold = parseFloat(t?.threshold);
          return !isNaN(threshold) && !isNaN(fatValForGate) && fatValForGate >= threshold;
        });
        if (isProRata) {
          // Resolve applied rates from thresholds
          const appliedFatRate = resolveRateFromFatThresholds(fatPercentage, fatStepUpThresholds);
          const appliedSnfRate = resolveRateFromSnfThresholds(snfPercentageValue, snfStepDownThresholds);
          const fatStepUpRateValue = (parseFloat(appliedFatRate) * 10) || 0;
          const snfStepDownRateValue = (parseFloat(appliedSnfRate) * 10) || 0;
          const fatAdjustment = (fatPercentage - 6.5) * fatStepUpRateValue;
          const snfAdjustment = (snfPercentageValue - baseSnfPercentage) * snfStepDownRateValue;
          finalRate = milkRate + fatAdjustment + snfAdjustment;
          // Round to nearest rupee and show as .00 later
          amountNum = finalRate * weightKg; //Math.round(finalRate * weightKg);
        } else {
          // Use precise sum then round to 2 decimals
          const sum = (parseFloat(fatKg) * parseFloat(fatRate)) + (parseFloat(snfKg) * parseFloat(snfRate));
          // Round to nearest rupee
          amountNum = sum; //Math.round(sum);
        }
        const amount = amountNum.toFixed(2);

        // Calculate solid weight - No limitation
        const solidWeight = (amountNum / milkRate).toFixed(3);

        // Effective rate for payload
        const effectiveRate = isProRata 
          ? finalRate 
          : (weightKg ? (amountNum / weightKg) : milkRate);

        // Format milk type
        const milkType = selectedAnimal.toLowerCase().replace(/\s+/g, '');
        const formattedMilkType = milkType === 'cow+buffalo' ? 'cow_buffalo' : milkType;

        // Prepare collection data
        const collectionData = {
          collection_time: selectedTime.toLowerCase(),
          milk_type: formattedMilkType,
          customer: selectedCustomer.id,
          collection_date: new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0],
          measured: 'liters',
          liters: liters.toString(),
          kg: weightKg.toString(),
          fat_percentage: fatPercentage.toString(),
          fat_kg: fatKg.toString(),
          clr: clrValue ? clrValue.toString() : '',
          snf_percentage: snfPercentageValue.toString(),
          snf_kg: snfKg.toString(),
          fat_rate: fatRate.toString(),
          snf_rate: snfRate.toString(),
          milk_rate: milkRate.toString(),
          amount: amount.toString(),
          solid_weight: solidWeight.toString(),
          base_snf_percentage: baseSnfPercentage.toString(),
          // Persist the applied rates used for this calculation for traceability
          fat_step_up_rate: (resolveRateFromFatThresholds(fatPercentage, fatStepUpThresholds) || 0).toString(),
          snf_step_down_rate: (resolveRateFromSnfThresholds(snfPercentageValue, snfStepDownThresholds) || 0).toString(),
          is_pro_rata: true
        };

        // Set preview data and show modal
        setPreviewData(collectionData);
        setShowPreviewModal(true);

      } catch (error) {
        console.error('Calculation error:', error);
        Alert.alert(
          'Error',
          'Failed to prepare collection data. Please check all inputs.'
        );
      }
    }
  };

  const handleConfirmSave = async () => {
    try {
      setIsConfirmLoading(true);
      const response = await createCollection(previewData);
      setShowPreviewModal(false);
      setPreviewData(null);
      setShowSuccessModal(true);
      clearInputs();
      // Fetch latest collection after successful save
      fetchLatestCollection();
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 2000);
    } catch (error) {
      setShowPreviewModal(false);
      
      // Check if the error is about insufficient wallet balance
      if (error.error && (
        error.error.includes('insufficient wallet balance') || 
        error.error.includes('Insufficient') || 
        error.error.includes('wallet balance')
      )) {
        setShowLowWalletPopup(true);
      } 
      // Check for duplicate collection error
      else if (error.error && error.error.includes('Duplicate collection found')) {
        // Extract date and time from error message if possible
        try {
          const dateMatch = error.error.match(/on\s+(\d{4}-\d{2}-\d{2})/);
          const timeMatch = error.error.match(/\(([^)]+)\)/);
          
          if (dateMatch && timeMatch) {
            setDuplicateCollectionInfo({
              date: dateMatch[1],
              time: timeMatch[1]
            });
          }
        } catch (parseError) {
          console.log('Error parsing duplicate collection message:', parseError);
        }
        
        setShowDuplicateCollectionPopup(true);
      }
      else {
        Alert.alert(
          'Error',
          error.error || 'Failed to save collection. Please try again.'
        );
      }
    } finally {
      setIsConfirmLoading(false);
    }
  };

  // Add this function to fetch the latest collection
  const fetchLatestCollection = async () => {
    try {
      // Iterate across pages until we find the latest pro-rata collection
      let page = 1;
      const pageSize = 100; // large page size to minimize requests
      let found = null;

      while (!found) {
        const response = await getCollections({ page, page_size: pageSize });

        if (response.results && response.results.length > 0) {
          // Filter for pro rata collections only
          const proRataCollections = response.results.filter(collection => collection.is_pro_rata === true);
          if (proRataCollections.length > 0) {
            found = proRataCollections[0];
            break;
          }
        }

        // Stop if there are no more pages
        if (!response.next) break;
        page += 1;
      }

      setLatestCollection(found || null);
    } catch (error) {
      console.error('Error fetching latest collection:', error);
    }
  };

  const getLast7Days = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date);
    }
    return dates;
  };

  const isNextDisabled = !weight || !fatPercent || !isRateChartSet || (selectedRadios.snf ? !snfPercent : !clr);

  const clearInputs = () => {
    setWeight('');
    setFatPercent('');
    setSnfPercent('');
    setClr('');
    // Don't reset the radio buttons to SNF - maintain current selection
    // based on the dairy rate type
    setErrors({});
    // Do not reset Base SNF here; keep user's selection persistent
    
    // Add these lines to reset customer selection
    setSearchQuery('');
    setSelectedCustomer(null);
    setShowCustomersList(false);
    setFilteredCustomers([]);
  };

  const formatDisplayDate = (date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatAPIDate = (date) => {
    return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
  };

  // Add this calculation function after the state declarations
  const calculateSnfFromClr = (clrValue, fatValue) => {
    if (!clrValue || !fatValue) return '';

    const clr = parseFloat(clrValue);
    const fat = parseFloat(fatValue);
    const conversionFactor = parseFloat(clrConversionFactor);

    if (isNaN(clr) || isNaN(fat) || isNaN(conversionFactor)) return '';
    const snf = Math.floor(((clr / 4) + (fat * 0.20) + conversionFactor) * 100) / 100;

    return snf;
  };

  // Add this effect to update SNF when CLR or Fat changes
  useEffect(() => {
    if (selectedRadios.clr && clr && fatPercent) {
      const calculatedSnf = calculateSnfFromClr(clr, fatPercent);
      setSnfPercent(calculatedSnf);
    }
  }, [clr, fatPercent, selectedRadios.clr, clrConversionFactor]);

  console.log('Current Rate:', currentRate); // Debugging log

  // Add this component for the preview table
  const PreviewTable = ({ navigation }) => {
    if (!latestCollection) return null;

    const formattedDate = new Date(latestCollection.collection_date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const timeDisplay = latestCollection.collection_time === 'morning' ? 'Morning' : 'Evening';

    const fatPct = parseFloat(latestCollection.fat_percentage);
    const snfPct = parseFloat(latestCollection.snf_percentage);
    const baseSnfPct = parseFloat(latestCollection.base_snf_percentage);
    const clrValue = latestCollection.clr != null ? parseFloat(latestCollection.clr) : NaN;

    return (
      <View>
        <View style={styles.tableContainer}>
          {/* Header Row */}
          <View style={styles.tableRow}>
            <View style={[styles.cell, styles.headerCell, { flex: 1.5 }]}>
              <Text style={styles.headerText}>Date & Time</Text>
            </View>
            <View style={[styles.cell, styles.headerCell, { flex: 2 }]}> 
              <Text style={styles.headerText}>Name</Text> 
            </View>
            <View style={[styles.cell, styles.headerCell, { flex: 0.8 }]}>
              <Text style={styles.headerText}>KG</Text>
            </View>
            <View style={[styles.cell, styles.headerCell, { flex: 1 }]}>
              <Text style={styles.headerText}>Fat%</Text>
            </View>
            <View style={[styles.cell, styles.headerCell, { flex: 1 }]}>
              <Text style={styles.headerText}>SNF%</Text>
            </View>
            <View style={[styles.cell, styles.headerCell, { flex: 1 }]}>
              <Text style={styles.headerText}>Base SNF</Text>
            </View>
            <View style={[styles.cell, styles.headerCell, { flex: 1.2 }]}>
              <Text style={styles.headerText}>CLR</Text>
            </View>
          </View>

          {/* Data Row */}
          <TouchableOpacity 
            style={styles.tableRow}
            onPress={() => navigation.navigate('EditProRataCollectionScreen', { 
              collectionId: latestCollection.id,
              collection: latestCollection
            })}
          >
            <View style={[styles.cell, { flex: 1.5 }]}>
              <Text style={styles.cellText}>{formattedDate}</Text>
              <Text style={styles.timeText}>{timeDisplay}</Text>
            </View>
            <View style={[styles.cell, { flex: 2 }]}>
              <Text style={styles.cellText}>
                <Text style={styles.idText}>#{latestCollection.customer_id}</Text>
                {' - '}
                {latestCollection.customer_name}
              </Text>
            </View>
            <View style={[styles.cell, { flex: 0.8 }]}>
              <Text style={styles.cellText}>{parseFloat(latestCollection.kg).toFixed(2)}</Text>
            </View>
            <View style={[styles.cell, { flex: 1 }]}>
              <Text style={styles.cellText}>{!isNaN(fatPct) ? fatPct.toFixed(2) : '-'}</Text>
            </View>
            <View style={[styles.cell, { flex: 1 }]}>
              <Text style={styles.cellText}>{!isNaN(snfPct) ? snfPct.toFixed(2) : '-'}</Text>
            </View>
            <View style={[styles.cell, { flex: 1 }]}>
              <Text style={styles.cellText}>{!isNaN(baseSnfPct) ? baseSnfPct.toFixed(2) : '-'}</Text>
            </View>
            <View style={[styles.cell, { flex: 1.2 }]}> 
              <Text style={styles.cellText}>{!isNaN(clrValue) ? clrValue.toFixed(2) : '-'}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.showCollectionsButton}
          onPress={() => navigation.navigate('GenerateProRataFullReportScreen')}
        >
          <Icon name="format-list-bulleted" size={20} color="#fff" />
          <Text style={styles.showCollectionsButtonText}>{t('show collections')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Add this function to recalculate amounts with new base SNF
  const recalculateWithNewBaseSnf = (newBaseSnf) => {
    if (!previewData) return;

    const fatKg = parseFloat(previewData.fat_kg);
    const snfKg = parseFloat(previewData.snf_kg);
    const baseRate = parseFloat(currentRate) || 0;
    const fatPercent = parseFloat(previewData.fat_percentage) || 0;
    const snfPercentVal = parseFloat(previewData.snf_percentage) || 0;
    const weightKg = parseFloat(previewData.kg) || 0;
    const baseSnfVal = parseFloat(newBaseSnf);

    // Guard against invalid base SNF values
    if (isNaN(baseSnfVal) || baseSnfVal <= 0) {
      return;
    }

    // Recompute component rates based on new base SNF and selected ratio
    const fatRatioPercent = fatSnfRatio === '60_40' ? 60 : 52;
    const snfRatioPercent = fatSnfRatio === '60_40' ? 40 : 48;
    const fatRate = (baseRate * fatRatioPercent / 6.5).toFixed(3);
    const snfRate = (baseRate * snfRatioPercent / baseSnfVal).toFixed(3);

    let effectiveRate = baseRate;
    let newAmountNum = 0;
    const isProRata = Array.isArray(fatStepUpThresholds) && fatStepUpThresholds.some(t => {
      const threshold = parseFloat(t?.threshold);
      return !isNaN(threshold) && !isNaN(fatPercent) && fatPercent >= threshold;
    });

    if (isProRata) {
      const appliedFatRate = resolveRateFromFatThresholds(fatPercent, fatStepUpThresholds);
      const appliedSnfRate = resolveRateFromSnfThresholds(snfPercentVal, snfStepDownThresholds);
      const fatStepUpRateValue = (parseFloat(appliedFatRate) * 10) || 0;
      const snfStepDownRateValue = (parseFloat(appliedSnfRate) * 10) || 0;
      const fatAdjustment = (fatPercent - 6.5) * fatStepUpRateValue;
      const snfAdjustment = (snfPercentVal - baseSnfVal) * snfStepDownRateValue;
      effectiveRate = baseRate + fatAdjustment + snfAdjustment;
      newAmountNum = Math.round(effectiveRate * weightKg);
    } else {
      const sum = (parseFloat(fatKg) * parseFloat(fatRate)) + (parseFloat(snfKg) * parseFloat(snfRate));
      newAmountNum = Math.round(sum);
    }

    setPreviewData({
      ...previewData,
      base_snf_percentage: newBaseSnf,
      fat_rate: fatRate,
      snf_rate: snfRate,
      milk_rate: baseRate.toString(),
      amount: newAmountNum.toFixed(2)
    });
  };

  // Recalculate preview using provided settings (ratio and thresholds)
  const recalculatePreviewWithSettings = (ratio, fatThresholds, snfThresholds) => {
    if (!previewData) return;
    const baseRate = parseFloat(currentRate) || 0;
    const fatPercent = parseFloat(previewData.fat_percentage) || 0;
    const snfPercentVal = parseFloat(previewData.snf_percentage) || 0;
    const weightKg = parseFloat(previewData.kg) || 0;
    const baseSnfVal = parseFloat(previewData.base_snf_percentage) || 0;

    const fatRatioPercent = ratio === '60_40' ? 60 : 52;
    const snfRatioPercent = ratio === '60_40' ? 40 : 48;
    const fatRate = (baseRate * fatRatioPercent / 6.5).toFixed(3);
    const snfRate = (baseRate * snfRatioPercent / baseSnfVal).toFixed(3);

    let effectiveRate = baseRate;
    let newAmountNum = 0;
    const isProRata = Array.isArray(fatThresholds) && fatThresholds.some(t => {
      const threshold = parseFloat(t?.threshold);
      return !isNaN(threshold) && !isNaN(fatPercent) && fatPercent >= threshold;
    });
    if (isProRata) {
      const appliedFatRate = resolveRateFromFatThresholds(fatPercent, fatThresholds);
      const appliedSnfRate = resolveRateFromSnfThresholds(snfPercentVal, snfThresholds);
      const fatStepUpRateValue = (parseFloat(appliedFatRate) * 10) || 0;
      const snfStepDownRateValue = (parseFloat(appliedSnfRate) * 10) || 0;
      const fatAdjustment = (fatPercent - 6.5) * fatStepUpRateValue;
      const snfAdjustment = (snfPercentVal - baseSnfVal) * snfStepDownRateValue;
      effectiveRate = baseRate + fatAdjustment + snfAdjustment;
      newAmountNum = Math.round(effectiveRate * weightKg);
    } else {
      const fatKg = parseFloat(previewData.fat_kg);
      const snfKg = parseFloat(previewData.snf_kg);
      const sum = (parseFloat(fatKg) * parseFloat(fatRate)) + (parseFloat(snfKg) * parseFloat(snfRate));
      newAmountNum = Math.round(sum);
    }

    setPreviewData({
      ...previewData,
      fat_rate: fatRate,
      snf_rate: snfRate,
      milk_rate: baseRate.toString(),
      amount: newAmountNum.toFixed(2)
    });
  };

  // Add this component for the editable base SNF
  const BaseSnfSelector = () => {
    return (
      <TouchableOpacity
        style={styles.baseSnfSelector}
        onPress={() => {
          setShowBaseSnfModal(true); // Show the modal on press
        }}
      >
        <View style={styles.baseSnfContent}>
          <Text style={styles.previewLabel}>Base SNF %</Text>
          <Text style={styles.previewValue}>
            {previewData?.base_snf_percentage
              ? parseFloat(previewData.base_snf_percentage).toFixed(2)
              : '-'}
          </Text>
          <Icon name="chevron-down" size={20} color="#0D47A1" />
        </View>

        {/* Base SNF Selection Modal */}
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
                    {/* Special highlighted 8.5 option */}
                    <TouchableOpacity
                      key={'8.5'}
                      style={[
                        styles.baseSnfOption,
                        { backgroundColor: '#FFF3E0', borderColor: '#FFB74D', borderWidth: 1 },
                        previewData?.base_snf_percentage === '8.5' && styles.baseSnfOptionSelected
                      ]}
                      onPress={() => {
                        recalculateWithNewBaseSnf('8.5');
                        setShowBaseSnfModal(false);
                      }}
                    >
                      <Text style={[
                        styles.baseSnfOptionText,
                        { color: '#E65100', fontWeight: '700' },
                        previewData?.base_snf_percentage === '8.5' && styles.baseSnfOptionTextSelected
                      ]}>8.5</Text>
                      {previewData?.base_snf_percentage === '8.5' && (
                        <View style={styles.selectedIndicator}>
                          <Icon name="check" size={16} color="#0D47A1" />
                        </View>
                      )}
                    </TouchableOpacity>

                    {allowedBaseSnfValues.map(value => (
                      <TouchableOpacity
                        key={value}
                        style={[
                          styles.baseSnfOption,
                          previewData?.base_snf_percentage === value && styles.baseSnfOptionSelected
                        ]}
                        onPress={() => {
                          recalculateWithNewBaseSnf(value);
                          setShowBaseSnfModal(false);
                        }}
                      >
                        <Text style={[
                          styles.baseSnfOptionText,
                          previewData?.base_snf_percentage === value && styles.baseSnfOptionTextSelected
                        ]}>
                          {value}
                        </Text>
                        {previewData?.base_snf_percentage === value && (
                          <View style={styles.selectedIndicator}>
                            <Icon name="check" size={16} color="#0D47A1" />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity 
                    style={styles.modalCancelButton}
                    onPress={() => setShowBaseSnfModal(false)}
                  >
                    <Text style={styles.modalCancelButtonText}>{t('cancel')}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </TouchableOpacity>
    );
  };

  // Base SNF toggle (9.0 / 8.5) for top-left
  const BaseSnfToggle = () => {
    const options = ['9.0', '8.5'];
    return (
      <View style={styles.baseSnfSection}>
        <Text style={styles.baseSnfLabel}>{t('base snf')}</Text>
        <View style={styles.baseSnfToggleContainer}>
          {options.map((value) => (
            <TouchableOpacity
              key={value}
              style={[styles.baseSnfToggleOption, snf === value && styles.baseSnfToggleOptionSelected]}
              onPress={() => {
                if (snf !== value) {
                  setPendingBaseSnf(value);
                  setBaseSnfConfirmSource('main');
                  setShowBaseSnfConfirm(true);
                }
              }}
            >
              <Text style={[styles.baseSnfToggleText, snf === value && styles.baseSnfToggleTextSelected]}>
                {parseFloat(value).toFixed(2)}
              </Text>
              {snf === value && (
                <View style={styles.baseSnfSelectedIndicator} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // Add this utility function to format the date
  const formatDate = (date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
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
        
        <Text style={styles.headerTitle}>{t('pro-rata collection')}</Text>
      </View>

      {/* Popup Card for Adding Milk Rate */}
      {currentRate === 0 && (
        <View style={styles.popupCardOverlay}>
          <View style={styles.popupCard}>
            <View style={styles.popupIconContainer}>
              <Icon name="alert-circle-outline" style={styles.iconStyle} />
            </View>
            <Text style={styles.popupTitle}>Milk Rate Required</Text>
            <Text style={styles.popupText}>Please set the milk rate before adding collection.</Text>
            <TouchableOpacity 
              style={styles.addRateButton}
              onPress={() => {
                navigation.navigate('RateChart');
              }}
            >
              <Text style={styles.addRateButtonText}>{t('set milk rate')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showInputLimitPopup && (
        <View style={styles.popupCardOverlay}>
          <View style={styles.popupCard}>
            <View style={styles.popupIconContainer}>
              <Icon name="alert-circle-outline" style={styles.iconStyle} />
            </View>
            <Text style={styles.popupTitle}>{t('invalid input')}</Text>
            <Text style={styles.popupText}>{inputLimitMessage}</Text>
            <TouchableOpacity
              style={styles.addRateButton}
              onPress={() => setShowInputLimitPopup(false)}
            >
              <Text style={styles.addRateButtonText}>{t('ok')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Main Content */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Row: Base SNF Toggle (left) and Change Rates (right) */}
          <View style={styles.topRow}>
            <BaseSnfToggle />
            <TouchableOpacity 
              style={styles.rateBox}
              onPress={() => {
                setTempBaseSnf(snf);
                setTempClrConversionFactor(clrConversionFactor);
                setTempFatSnfRatio(fatSnfRatio);
                setShowChangeRatesModal(true);
              }}
            >
              <View style={styles.rateContent}>
                <Text style={styles.rateLabel}>{t('rate settings')}</Text>
              </View>
              <Icon name="cog" size={20} color="#0D47A1" style={styles.editIcon} />
            </TouchableOpacity>
          </View>

          {/* Customer Search Row */}
          <Text style={styles.searchTitle}>{t('search customers')}</Text>
          <View style={styles.customerSearchContainer}>
            <View style={styles.searchInputContainer}>
              <Icon name="magnify" size={20} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by ID or Name"
                placeholderTextColor="#B0B0B0"
                value={searchQuery}
                onChangeText={handleSearch}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedCustomer(null);
                    setShowCustomersList(false);
                  }}
                  style={styles.clearButton}
                >
                  <Icon name="close" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.addCustomerButton}
              onPress={handleButtonPress(() => navigation.navigate('Customer'))}
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
                  style={styles.searchResults}
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
        {snfError ? (
          <Text style={styles.errorText}>{snfError}</Text>
        ) : null}

        {/* Add these new components */}
        <View style={styles.selectionContainer}>
          {/* Date Selector */}
          <TouchableOpacity 
            style={styles.dateSelector}
            onPress={handleButtonPress(() => setShowDatePicker(true))}
          >
            <Text style={styles.dateSelectorText}>
              {formatDate(selectedDate)}
            </Text>
            <Icon name="calendar" size={16} color="#0D47A1" />
          </TouchableOpacity>

          {/* Time Dropdown */}
          <TouchableOpacity 
            style={styles.timeSelector}
            onPress={handleButtonPress(() => setShowTimeModal(true))}
          >
            <View style={styles.timeSelectorContent}>
              <Text style={styles.timeSelectorText}>
                {selectedTime ? selectedTime.charAt(0).toUpperCase() + selectedTime.slice(1) : 'Select Time'}
              </Text>
            </View>
            <Icon name="chevron-down" size={16} color="#0D47A1" />
          </TouchableOpacity>

          {/* Animal Type Dropdown */}
          <TouchableOpacity 
            style={styles.animalSelector}
            onPress={handleButtonPress(() => setShowAnimalModal(true))}
          >
            <Text style={styles.animalSelectorText}>
              {selectedAnimal.charAt(0).toUpperCase() + selectedAnimal.slice(1)}
            </Text>
            <Icon name="chevron-down" size={16} color="#0D47A1" />
          </TouchableOpacity>
        </View>

        <View style={styles.formContainer}>
          {/* Weight and Fat% Row */}
          <View style={styles.measureRow}>
            <View style={styles.inputGroup}>
              <View style={styles.labelWithRadio}>
                <View style={{ width: 20 }} />
                <Text style={styles.inputLabel}>Weight</Text>
              </View>
              <TextInput
                style={[
                  styles.measureInput,
                  errors.weight && styles.inputError,
                  { textAlign: (isWeightFocused || !!weight) ? 'left' : 'center' }
                ]}
                onFocus={() => setIsWeightFocused(true)}
                onBlur={() => setIsWeightFocused(false)}
                value={weight}
                onChangeText={(text) => {
                  // Remove any non-numeric characters except decimal point
                  const sanitizedText = text.replace(/[^0-9.]/g, '');
                  
                  // Ensure only one decimal point
                  const parts = sanitizedText.split('.');
                  if (parts.length > 2) return;
                  
                  // Limit to two decimal places only
                  if (parts[1] && parts[1].length > 2) {
                    return;
                  }
                  
                  setWeight(sanitizedText);
                }}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#B0B0B0"
              />
              {errors.weight && <Text style={styles.errorText}>{errors.weight}</Text>}
            </View>

            <View style={[styles.inputGroup, { marginLeft: 12 }]}>
              <View style={styles.labelWithRadio}>
                <View style={{ width: 20 }} />
                <Text style={styles.inputLabel}>Fat %</Text>
              </View>
              <TextInput
                style={[
                  styles.measureInput,
                  errors.fatPercent && styles.inputError,
                  { textAlign: (isFatFocused || !!fatPercent) ? 'left' : 'center' }
                ]}
                onFocus={() => setIsFatFocused(true)}
                onBlur={() => {
                  setIsFatFocused(false);
                  if (fatFormatTimeoutRef.current) clearTimeout(fatFormatTimeoutRef.current);
                  setFatPercent((current) =>
                    formatWithTrailingDecimal(
                      current,
                      15.0,
                      2,
                      () => triggerInputLimitPopup('fat limit error')
                    )
                  );
                }}
                value={fatPercent}
                onChangeText={handleFatPercentInput}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#B0B0B0"
              />
              {errors.fatPercent && <Text style={styles.errorText}>{errors.fatPercent}</Text>}
            </View>
          </View>

          {/* SNF/CLR Selection Row */}
          <View style={styles.measureRow}>
            <View style={styles.inputGroup}>
              <View style={styles.labelWithRadio}>
                <View style={[styles.radioButton, !selectedRadios.snf && styles.radioButtonFaded]}>
                  <View style={[styles.radioCircle, selectedRadios.snf && styles.radioCircleSelected]} />
                </View>
                <Text style={[styles.inputLabel, !selectedRadios.snf && styles.disabledLabel]}>SNF%</Text>
              </View>
              <TextInput
                style={[
                  styles.measureInput,
                  { width: 75 },
                  errors.snfPercent && styles.inputError,
                  { textAlign: (isSnfFocused || !!snfPercent) ? 'left' : 'center' },
                  !selectedRadios.snf && styles.disabledInput
                ]}
                onFocus={() => setIsSnfFocused(true)}
                onBlur={() => {
                  setIsSnfFocused(false);
                  if (snfFormatTimeoutRef.current) clearTimeout(snfFormatTimeoutRef.current);
                  setSnfPercent((current) =>
                    formatWithTrailingDecimal(
                      current,
                      15.0,
                      2,
                      () => triggerInputLimitPopup('snf limit error')
                    )
                  );
                }}
                value={snfPercent?.toString() || ''}
                onChangeText={handleSnfPercentInput}
                placeholder="0.00"
                placeholderTextColor="#B0B0B0"
                keyboardType="decimal-pad"
                editable={selectedRadios.snf}
              />
              {errors.snfPercent && <Text style={styles.errorText}>{errors.snfPercent}</Text>}
            </View>

            <View style={[styles.inputGroup, { marginLeft: 12 }]}>
              <View style={styles.labelWithRadio}>
                <View style={[styles.radioButton, { marginLeft: 6 }, !selectedRadios.clr && styles.radioButtonFaded]}>
                  <View style={[styles.radioCircle, selectedRadios.clr && styles.radioCircleSelected]} />
                </View>
                <Text style={[styles.inputLabel, !selectedRadios.clr && styles.disabledLabel]}>CLR</Text>
              </View>
              <TextInput
                style={[
                  styles.measureInput,
                  { width: 75 },
                  errors.clr && styles.inputError,
                  { textAlign: (isClrFocused || !!clr) ? 'left' : 'center' },
                  !selectedRadios.clr && styles.disabledInput
                ]}
                onFocus={() => setIsClrFocused(true)}
                onBlur={() => {
                  setIsClrFocused(false);
                  if (clrFormatTimeoutRef.current) clearTimeout(clrFormatTimeoutRef.current);
                  setClr((current) =>
                    formatWithTrailingDecimal(
                      current,
                      36.0,
                      2,
                      () => triggerInputLimitPopup('clr limit error')
                    )
                  );
                }}
                value={clr}
                onChangeText={handleClrInput}
                placeholder="00.00"
                placeholderTextColor="#B0B0B0"
                keyboardType="decimal-pad"
                editable={selectedRadios.clr}
              />
              {errors.clr && <Text style={styles.errorText}>{errors.clr}</Text>}
            </View>
          </View>

          {/* Rate Chart Settings Button and Next Button in same row */}
          <View style={[styles.measureRow, { justifyContent: 'space-between' }]}>
            <Animated.View style={!isRateChartSet ? { opacity: rateChartHighlightAnim } : null}>
              <TouchableOpacity 
                style={[
                  styles.rateChartButton, 
                  !isRateChartSet && { backgroundColor: '#0D47A1' }
                ]}
                onPress={handleButtonPress(openRateChartModal)}
              >
                <Icon 
                  name="tune" 
                  size={18} 
                  color={isRateChartSet ? "#0D47A1" : "#FFFFFF"} 
                />
                <Text 
                  style={[
                    styles.rateChartButtonText, 
                    !isRateChartSet && { color: '#FFFFFF' }
                  ]}
                >
                  {isRateChartSet ? t('rate chart') : t('set rate chart')}
                </Text>
              </TouchableOpacity>
            </Animated.View>
            
            <TouchableOpacity 
              style={[
                styles.nextButton,
                isNextDisabled && styles.nextButtonDisabled
              ]}
              onPress={handleButtonPress(handleSave)}
              disabled={isNextDisabled}
            >
              <Text style={styles.nextButtonText}>{t('next')}</Text>
              <Icon name="arrow-right" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Preview Table */}
        {latestCollection && (
          <View style={styles.previewSection}>
            <PreviewTable navigation={navigation} />
          </View>
        )}

        {/* Add error message for radio selection */}
        {errors.radio && (
          <Text style={[styles.errorText, { marginTop: 10 }]}>{errors.radio}</Text>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      <BottomNav />

      {/* Add SNF Selection Modal */}
      <Modal
        visible={showSnfModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSnfModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select SNF Value</Text>
            <View style={styles.snfOptions}>
              {allowedSnfValues.map((value) => (
                <TouchableOpacity
                  key={value}
                  style={styles.snfOption}
                  onPress={() => {
                    setSnf(value);
                    setSnfError('');
                    setShowSnfModal(false);
                  }}
                >
                  <Text style={styles.snfOptionText}>{value}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowSnfModal(false)}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Animal Selection Modal */}
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
              {animalOptions.map((animal) => {
                const normalizedOption = animal.toLowerCase().replace(/\s+/g, '');
                const normalizedSelected = (selectedAnimal || '').toLowerCase().replace(/\s+/g, '');
                const isSelected = normalizedSelected === normalizedOption;

                return (
                  <TouchableOpacity
                    key={animal}
                    style={[
                      styles.animalOption,
                      isSelected && styles.animalOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedAnimal(animal.toLowerCase());
                      setShowAnimalModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.animalOptionText,
                        isSelected && styles.animalOptionTextSelected,
                      ]}
                    >
                      {animal}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAnimalModal(false)}
              >
                <Text style={[styles.modalButtonText, styles.cancelButtonText]}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add success modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.successModalContent]}>
            <Icon name="check-circle" size={50} color="#4CAF50" />
            <Text style={styles.successModalText}>Data Saved Successfully!</Text>
          </View>
        </View>
      </Modal>

      {/* Add Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <Text style={styles.modalTitle}>{t('select date')}</Text>
            
            <View style={styles.datePickerContent}>
              <View style={styles.datePickerColumns}>
                {/* Year Column */}
                <View style={styles.dateColumn}>
                  <Text style={styles.datePickerLabel}>{t('year')}</Text>
                  <ScrollView 
                    style={styles.datePickerScroll}
                    showsVerticalScrollIndicator={false}
                  >
                    {Array.from({length: 5}, (_, i) => new Date().getFullYear() - i).map(year => (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.datePickerItem,
                          selectedDate.getFullYear() === year && styles.datePickerItemSelected
                        ]}
                        onPress={() => {
                          const newDate = new Date(selectedDate);
                          newDate.setFullYear(year);
                          setSelectedDate(newDate);
                        }}
                      >
                        <Text style={[
                          styles.datePickerItemText,
                          selectedDate.getFullYear() === year && styles.datePickerItemTextSelected
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
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => (
                      <TouchableOpacity
                        key={month}
                        style={[
                          styles.datePickerItem,
                          selectedDate.getMonth() === index && styles.datePickerItemSelected
                        ]}
                        onPress={() => {
                          const newDate = new Date(selectedDate);
                          newDate.setMonth(index);
                          // Adjust the day if it exceeds the last day of the new month
                          const lastDayOfMonth = new Date(newDate.getFullYear(), index + 1, 0).getDate();
                          if (newDate.getDate() > lastDayOfMonth) {
                            newDate.setDate(lastDayOfMonth);
                          }
                          setSelectedDate(newDate);
                        }}
                      >
                        <Text style={[
                          styles.datePickerItemText,
                          selectedDate.getMonth() === index && styles.datePickerItemTextSelected
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
                    contentContainerStyle={styles.datePickerScrollContent}
                  >
                    {Array.from(
                      {length: new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate()}, 
                      (_, i) => i + 1
                    ).map(day => (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.datePickerItem,
                          selectedDate.getDate() === day && styles.datePickerItemSelected
                        ]}
                        onPress={() => {
                          const newDate = new Date(selectedDate);
                          newDate.setDate(day);
                          setSelectedDate(newDate);
                        }}
                      >
                        <Text style={[
                          styles.datePickerItemText,
                          selectedDate.getDate() === day && styles.datePickerItemTextSelected
                        ]}>{day}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>

            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={[styles.modalButtonText, styles.cancelButtonText]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={[styles.modalButtonText, styles.confirmButtonText]}>{t('confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Preview Modal */}
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
              <TouchableOpacity 
                onPress={() => setShowPreviewModal(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.previewScrollView}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.previewScrollViewContent}
            >
              {previewData && (
                <View style={styles.previewContainer}>
                  {/* Customer Info */}
                  <View style={styles.previewSection}>
                    <View style={styles.previewSectionHeader}>
                      <Icon name="account" size={20} color="#0D47A1" />
                      <Text style={styles.previewSectionTitle}>{t('customer details')}</Text>
                    </View>
                    <View style={styles.previewCard}>
                      <Text style={styles.customerName}>{selectedCustomer?.customer_id}-{selectedCustomer?.name}</Text>
                      {/* Removed phone number display as requested */}
                      <Text style={styles.customerDate}>
                        <Icon name="calendar" size={14} color="#666" style={{marginRight: 4}} />
                        {formatDate(new Date(previewData.collection_date))} - {previewData.collection_time.charAt(0).toUpperCase() + previewData.collection_time.slice(1)}
                      </Text>
                    </View>
                  </View>

                  {/* Collection Details */}
                  <View style={styles.previewSection}>
                    <View style={styles.previewSectionHeader}>
                      <Icon name="information" size={20} color="#0D47A1" />
                      <Text style={styles.previewSectionTitle}>{t('collection details')}</Text>
                    </View>
                    <View style={styles.previewCard}>
                      <View style={styles.previewRow}>
                        <View style={styles.previewItem}>
                          <Text style={styles.previewLabel}>Milk Rate</Text>
                          <Text style={styles.previewValue}>₹{previewData.milk_rate}</Text>
                        </View>
                        <View style={styles.previewItem}>
                          <Text style={styles.previewLabel}>Weight</Text>
                          <Text style={styles.previewValue}>{previewData.kg} KG</Text>
                        </View>
                      </View>
                      <View style={styles.previewRow}>
                        <View style={styles.previewItem}>
                          <Text style={styles.previewLabel}>Fat %</Text>
                          <Text style={styles.previewValue}>{parseFloat(previewData.fat_percentage).toFixed(2)}</Text>
                        </View>
                        <View style={styles.previewItem}>
                          <Text style={styles.previewLabel}>SNF %</Text>
                          <Text style={styles.previewValue}>{parseFloat(previewData.snf_percentage).toFixed(2)}</Text>
                        </View>
                      </View>
                      <View style={styles.previewRow}>
                        <View style={styles.previewItem}>
                          <Text style={styles.previewLabel}>Fat KG</Text>
                          <Text style={styles.previewValue}>{previewData.fat_kg}</Text>
                        </View>
                        <View style={styles.previewItem}>
                          <Text style={styles.previewLabel}>SNF KG</Text>
                          <Text style={styles.previewValue}>{previewData.snf_kg}</Text>
                        </View>
                      </View>
                      <View style={styles.previewRow}>
                        <View style={styles.previewItem}>
                          <Text style={styles.previewLabel}>CLR</Text>
                          <Text style={styles.previewValue}>{previewData.clr ? parseFloat(previewData.clr).toFixed(2) : '-'}</Text>
                        </View>
                        <View style={styles.previewItem}>
                          <BaseSnfSelector />
                        </View>
                      </View>
                    </View>
                </View>
                  {/* Rate Chart used (editable) inside preview */}
                  <TouchableOpacity 
                    style={[styles.rateChartButton, { alignSelf: 'center', marginTop: 0, marginBottom: 16, backgroundColor: '#0D47A1' }]}
                    onPress={handleButtonPress(openRateChartModal)}
                  >
                    <Icon name="tune" size={18} color="#FFFFFF" />
                    <Text style={[styles.rateChartButtonText, { color: '#FFFFFF' }]}>{t('rate chart used')}</Text>
                  </TouchableOpacity>

                  {/* Payment Details Card */}
                  <View style={styles.previewCard}>
                    <View style={styles.previewSectionHeader}>
                      <Icon name="currency-inr" size={20} color="#0D47A1" />
                      <Text style={styles.previewSectionTitle}>{t('payment details')}</Text>
                    </View>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Avg. Rate</Text>
                      <Text style={styles.previewValue}>₹{(parseFloat(previewData.amount) / parseFloat(previewData.kg)).toFixed(2)}</Text>
                    </View>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Amount</Text>
                      <Text style={styles.previewValue}>₹{previewData.amount}</Text>
                    </View>
                  </View>

                  
                </View>
              )}
            </ScrollView>

            <View style={styles.previewActions}>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => setShowPreviewModal(false)}
                disabled={isConfirmLoading}
              >
                <Icon name="pencil" size={20} color="#0D47A1" />
                <Text style={styles.editButtonText}>{t('edit')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.previewConfirmButton, isConfirmLoading && styles.disabledButton]}
                onPress={handleButtonPress(handleConfirmSave)}
                disabled={isConfirmLoading}
              >
                {isConfirmLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="check" size={20} color="#fff" />
                    <Text style={styles.previewConfirmButtonText}>{t('confirm')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Time Selection Modal */}
      <Modal
        visible={showTimeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('select time')}</Text>
            <View style={styles.timeOptions}>
              {timeOptions.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeOption,
                    selectedTime === time.toLowerCase() && styles.timeOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedTime(time.toLowerCase());
                    setShowTimeModal(false);
                  }}
                >
                  <Text style={[
                    styles.timeOptionText,
                    selectedTime === time.toLowerCase() && styles.timeOptionTextSelected
                  ]}>{time}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowTimeModal(false)}
              >
                <Text style={[styles.modalButtonText, styles.cancelButtonText]}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rate Chart Settings Modal */}
      <Modal
        visible={showRateChartModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRateChartModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        >
          <View style={[styles.modalContent, { maxHeight: Dimensions.get('window').height * 0.8, width: '90%', maxWidth: 550 }]}>
            <Text style={styles.modalTitle}>{t('rate chart')}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 8 }}>

            {/* Step Rates - Threshold entries */}
            <View style={{ marginBottom: 8 }}>
              <Text style={styles.modalSectionTitle}>Fat Step-up Rates</Text>
              <Text style={[styles.rateModalLabel, { marginBottom: 8, fontSize: 12, color: '#666' }]}>{t('fat step description')}</Text>
              {(tempFatStepUpThresholds || []).map((row, idx) => (
                <View key={`fat_${idx}`} style={styles.rateModalRowThreshold}>
                  <View style={styles.rateModalCol}>
                    <Text style={styles.rateModalLabel}>{t('step label')}</Text>
                    <TextInput
                      style={[styles.measureInput, styles.rateModalInput]}
                      value={row.threshold}
                      onChangeText={(txt) => updateFatThreshold(idx, 'threshold', txt)}
                      keyboardType="decimal-pad"
                      placeholder="6.5"
                      placeholderTextColor="#B0B0B0"
                    />
                  </View>
                  <View style={styles.rateModalCol}>
                    <Text style={styles.rateModalLabel}>{t('rate label')}</Text>
                    <View style={[styles.rateInputWithIndicator, styles.positiveRateInput]}>
                      <Text style={[styles.rateInputIndicator, styles.rateInputIndicatorPositive]}>+</Text>
                      <TextInput
                        style={styles.rateModalIndicatorInput}
                        value={row.rate}
                        onChangeText={(txt) => updateFatThreshold(idx, 'rate', txt)}
                        keyboardType="decimal-pad"
                        placeholder="0.80"
                        placeholderTextColor="#B0B0B0"
                      />
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => removeFatThreshold(idx)} style={{ padding: 8 }}>
                    <Icon name="delete" size={20} color="#B00020" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity onPress={addFatThreshold} style={[styles.rateChartButton, { alignSelf: 'flex-start', marginTop: 4 }]}>
                <Icon name="plus" size={18} color="#0D47A1" />
                <Text style={styles.rateChartButtonText}>{t('add step')}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 8 }}>
              <Text style={styles.modalSectionTitle}>SNF Step-down Rates</Text>
              <Text style={[styles.rateModalLabel, { marginBottom: 8, fontSize: 12, color: '#666' }]}>{t('snf step description')}</Text>
              {(tempSnfStepDownThresholds || []).map((row, idx) => (
                <View key={`snf_${idx}`} style={styles.rateModalRowThreshold}>
                  <View style={styles.rateModalCol}>
                    <Text style={styles.rateModalLabel}>{t('step label')}</Text>
                    <TextInput
                      style={[styles.measureInput, styles.rateModalInput]}
                      value={row.threshold}
                      onChangeText={(txt) => updateSnfThreshold(idx, 'threshold', txt)}
                      keyboardType="decimal-pad"
                      placeholder="9.0"
                      placeholderTextColor="#B0B0B0"
                    />
                  </View>
                  <View style={styles.rateModalCol}>
                    <Text style={styles.rateModalLabel}>{t('rate label')}</Text>
                    <View style={styles.rateInputWithIndicator}>
                      <Text style={styles.rateInputIndicator}>-</Text>
                      <TextInput
                        style={styles.rateModalIndicatorInput}
                        value={row.rate}
                        onChangeText={(txt) => updateSnfThreshold(idx, 'rate', txt)}
                        keyboardType="decimal-pad"
                        placeholder="0.27"
                        placeholderTextColor="#B0B0B0"
                      />
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => removeSnfThreshold(idx)} style={{ padding: 8 }}>
                    <Icon name="delete" size={20} color="#B00020" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity onPress={addSnfThreshold} style={[styles.rateChartButton, { alignSelf: 'flex-start', marginTop: 4 }]}>
                <Icon name="plus" size={18} color="#0D47A1" />
                <Text style={styles.rateChartButtonText}>{t('add step')}</Text>
              </TouchableOpacity>
            </View>

            {/* Fat/SNF Ratio section removed as requested */}

            </ScrollView>
            {/* Modal Actions */}
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleButtonPress(() => setShowRateChartModal(false))}
              >
                <Text style={[styles.modalButtonText, styles.cancelButtonText]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.modalButton,
                  styles.confirmButton,
                  (
                    hasIncompleteThresholdRow(tempFatStepUpThresholds) ||
                    hasIncompleteThresholdRow(tempSnfStepDownThresholds) ||
                    !isValidThresholdList(tempFatStepUpThresholds) ||
                    !isValidThresholdList(tempSnfStepDownThresholds)
                  ) && styles.disabledButton,
                ]}
                disabled={
                  hasIncompleteThresholdRow(tempFatStepUpThresholds) ||
                  hasIncompleteThresholdRow(tempSnfStepDownThresholds) ||
                  !isValidThresholdList(tempFatStepUpThresholds) ||
                  !isValidThresholdList(tempSnfStepDownThresholds)
                }
                onPress={handleButtonPress(async () => {
                  try {
                    const payload = {
                      fat_step_up_rates: (tempFatStepUpThresholds || [])
                        .filter((item) => parseFloat(item.threshold) && parseFloat(item.rate))
                        .map((item) => ({
                          id: item.id,
                          step: Number(item.threshold),
                          rate: Number(item.rate),
                        })),
                      snf_step_down_rates: (tempSnfStepDownThresholds || [])
                        .filter((item) => parseFloat(item.threshold) && parseFloat(item.rate))
                        .map((item) => ({
                          id: item.id,
                          step: Number(item.threshold),
                          rate: -Math.abs(Number(item.rate)),
                        })),
                    };

                    const result = await upsertProRataRateChart(rateChartId, payload);
                    setRateChartId(result?.id || rateChartId);

                    const updatedFat = Array.isArray(result?.fat_step_up_rates)
                      ? result.fat_step_up_rates.map((item) => ({
                          threshold: String(item.step ?? ''),
                          rate: item?.rate != null ? Number(Math.abs(item.rate)).toFixed(2) : '',
                          id: item.id,
                        }))
                      : [];

                    const updatedSnf = Array.isArray(result?.snf_step_down_rates)
                      ? result.snf_step_down_rates.map((item) => ({
                          threshold: String(item.step ?? ''),
                          rate: item?.rate != null ? Number(Math.abs(item.rate)).toFixed(2) : '',
                          id: item.id,
                        }))
                      : [];

                    setFatStepUpThresholds(sortFatThresholds(updatedFat));
                    setSnfStepDownThresholds(sortSnfThresholds(updatedSnf));

                    recalculatePreviewWithSettings(
                      fatSnfRatio,
                      updatedFat,
                      updatedSnf
                    );
                  } catch (e) {
                    console.error('Error saving pro-rata rate chart:', e);
                    Alert.alert(t('error'), t('failed to save rate chart. please try again.'));
                  }
                  setShowRateChartModal(false);
                })}
              >
                <Text style={[styles.modalButtonText, styles.confirmButtonText]}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add the Low Wallet Balance Popup Modal */}
      <Modal
        visible={showLowWalletPopup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLowWalletPopup(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLowWalletPopup(false)}
        >
          <View style={styles.walletModalContent}>
            <Icon name="wallet-outline" size={40} color="#FF9800" />
            <Text style={styles.modalTitle}>{t('low balance alert')}</Text>
            <Text style={styles.modalMessage}>
              {t('your collection is not saved because your wallet balance is low.')}
            </Text>
            
            <TouchableOpacity 
              style={styles.rechargeButton}
              onPress={handleButtonPress(() => {
                setShowLowWalletPopup(false);
                navigation.navigate('Wallet');
              })}
            >
              <Text style={styles.rechargeButtonText}>{t('recharge now')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.laterButton}
              onPress={handleButtonPress(() => setShowLowWalletPopup(false))}
            >
              <Text style={styles.laterButtonText}>{t('later')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add the Duplicate Collection Popup Modal */}
      <Modal
        visible={showDuplicateCollectionPopup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDuplicateCollectionPopup(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleButtonPress(() => setShowDuplicateCollectionPopup(false))}
        >
          <View style={styles.duplicateModalContent}>
            <View style={styles.duplicateIconContainer}>
              <Icon name="alert-circle" size={40} color="#FF5722" />
            </View>
            <Text style={styles.modalTitle}>{t('duplicate collection')}</Text>
            <Text style={styles.modalMessage}>
              {t('an identical collection already exists for this customer')}
            </Text>
            
            <View style={styles.duplicateInfoBox}>
              <View style={styles.duplicateInfoRow}>
                <Icon name="calendar" size={20} color="#0D47A1" />
                <Text style={styles.duplicateInfoText}>
                  {duplicateCollectionInfo.date || t('same date')}
                </Text>
              </View>
              <View style={styles.duplicateInfoRow}>
                <Icon name="clock-outline" size={20} color="#0D47A1" />
                <Text style={styles.duplicateInfoText}>
                  {duplicateCollectionInfo.time || t('same time')}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.duplicatePrimaryButton}
              onPress={() => {
                setShowDuplicateCollectionPopup(false);
                clearInputs();
              }}
            >
              <Text style={styles.duplicatePrimaryButtonText}>{t('clear & start new')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.duplicateSecondaryButton}
              onPress={() => setShowDuplicateCollectionPopup(false)}
            >
              <Text style={styles.duplicateSecondaryButtonText}>{t('dismiss')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Base SNF Change Confirmation Modal */}
      <Modal
        visible={showBaseSnfConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBaseSnfConfirm(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowBaseSnfConfirm(false)}
        >
          <View style={styles.baseSnfConfirmModalContent}>
            <View style={styles.baseSnfConfirmIconContainer}>
              <Icon name="percent" size={28} color="#0D47A1" />
            </View>
            <Text style={styles.baseSnfConfirmTitle}>{t('change base snf')}</Text>
            {pendingBaseSnf && (
              <>
                <Text style={styles.baseSnfConfirmMessage}>
                  {t('confirm base snf change', { value: parseFloat(pendingBaseSnf).toFixed(2) })}
                </Text>
                <View style={styles.baseSnfValueChip}>
                  <Text style={styles.baseSnfValueChipText}>{parseFloat(pendingBaseSnf).toFixed(2)}</Text>
                </View>
                <Text style={styles.baseSnfConfirmSubtext}>
                  {t('this base snf will be used for calculations')}
                </Text>
              </>
            )}
            <View style={styles.baseSnfConfirmButtons}>
              <TouchableOpacity
                style={styles.baseSnfConfirmSecondaryButton}
                onPress={handleButtonPress(() => {
                  setShowBaseSnfConfirm(false);
                  setPendingBaseSnf(null);
                  setBaseSnfConfirmSource(null);
                })}
              >
                <Text style={styles.baseSnfConfirmSecondaryText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.baseSnfConfirmPrimaryButton}
                onPress={handleButtonPress(async () => {
                  if (pendingBaseSnf) {
                    if (baseSnfConfirmSource === 'main') {
                      await handleBaseSnfToggle(pendingBaseSnf);
                      setTempBaseSnf(pendingBaseSnf);
                    } else if (baseSnfConfirmSource === 'changeRates') {
                      setTempBaseSnf(pendingBaseSnf);
                    }
                  }
                  setShowBaseSnfConfirm(false);
                  setPendingBaseSnf(null);
                  setBaseSnfConfirmSource(null);
                })}
              >
                <Icon name="check" size={18} color="#fff" />
                <Text style={styles.baseSnfConfirmPrimaryText}>{t('confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Fat/SNF Ratio Change Confirmation Modal */}
      <Modal
        visible={showFatSnfRatioConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFatSnfRatioConfirm(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFatSnfRatioConfirm(false)}
        >
          <View style={styles.baseSnfConfirmModalContent}>
            <View style={styles.baseSnfConfirmIconContainer}>
              <Icon name="chart-line" size={28} color="#0D47A1" />
            </View>
            <Text style={styles.baseSnfConfirmTitle}>{t('change fat snf ratio')}</Text>
            {pendingFatSnfRatio && (
              <>
                <Text style={styles.baseSnfConfirmMessage}>
                  {t('confirm fat snf ratio change').replace('{{value}}', pendingFatSnfRatio === '60_40' ? '60/40' : '52/48')}
                </Text>
                <View style={styles.baseSnfValueChip}>
                  <Text style={styles.baseSnfValueChipText}>{pendingFatSnfRatio === '60_40' ? '60/40' : '52/48'}</Text>
                </View>
                <Text style={styles.baseSnfConfirmSubtext}>
                  {t('this ratio will be used for calculations')}
                </Text>
              </>
            )}
            <View style={styles.baseSnfConfirmButtons}>
              <TouchableOpacity
                style={styles.baseSnfConfirmSecondaryButton}
                onPress={handleButtonPress(() => {
                  setShowFatSnfRatioConfirm(false);
                  setPendingFatSnfRatio(null);
                })}
              >
                <Text style={styles.baseSnfConfirmSecondaryText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.baseSnfConfirmPrimaryButton}
                onPress={handleButtonPress(() => {
                  if (pendingFatSnfRatio) {
                    setTempFatSnfRatio(pendingFatSnfRatio);
                  }
                  setShowFatSnfRatioConfirm(false);
                  setPendingFatSnfRatio(null);
                })}
              >
                <Icon name="check" size={18} color="#fff" />
                <Text style={styles.baseSnfConfirmPrimaryText}>{t('confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* CLR Conversion Factor Change Confirmation Modal */}
      <Modal
        visible={showClrConversionConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowClrConversionConfirm(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowClrConversionConfirm(false)}
        >
          <View style={styles.baseSnfConfirmModalContent}>
            <View style={styles.baseSnfConfirmIconContainer}>
              <Icon name="calculator" size={28} color="#0D47A1" />
            </View>
            <Text style={styles.baseSnfConfirmTitle}>{t('change clr conversion factor')}</Text>
            {pendingClrConversion && (
              <>
                <Text style={styles.baseSnfConfirmMessage}>
                  {t('confirm clr conversion change').replace('{{value}}', pendingClrConversion)}
                </Text>
                <View style={styles.baseSnfValueChip}>
                  <Text style={styles.baseSnfValueChipText}>{pendingClrConversion}</Text>
                </View>
                <Text style={styles.baseSnfConfirmSubtext}>
                  {t('this factor will be used for clr to snf conversion')}
                </Text>
              </>
            )}
            <View style={styles.baseSnfConfirmButtons}>
              <TouchableOpacity
                style={styles.baseSnfConfirmSecondaryButton}
                onPress={handleButtonPress(() => {
                  setShowClrConversionConfirm(false);
                  setPendingClrConversion(null);
                })}
              >
                <Text style={styles.baseSnfConfirmSecondaryText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.baseSnfConfirmPrimaryButton}
                onPress={handleButtonPress(() => {
                  if (pendingClrConversion) {
                    setTempClrConversionFactor(pendingClrConversion);
                  }
                  setShowClrConversionConfirm(false);
                  setPendingClrConversion(null);
                })}
              >
                <Icon name="check" size={18} color="#fff" />
                <Text style={styles.baseSnfConfirmPrimaryText}>{t('confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Rate Type Change Confirmation Modal */}
      <Modal
        visible={showRateTypeConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRateTypeConfirm(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRateTypeConfirm(false)}
        >
          <View style={styles.baseSnfConfirmModalContent}>
            <View style={styles.baseSnfConfirmIconContainer}>
              <Icon name="calculator-variant" size={28} color="#0D47A1" />
            </View>
            <Text style={styles.baseSnfConfirmTitle}>{t('change rate type')}</Text>
            {pendingRateType && (
              <>
                <Text style={styles.baseSnfConfirmMessage}>
                  {t('confirm rate type change', { value: RATE_TYPE_LABELS[pendingRateType] || pendingRateType })}
                </Text>
                <View style={styles.baseSnfValueChip}>
                  <Text style={styles.baseSnfValueChipText}>
                    {RATE_TYPE_LABELS[pendingRateType] || pendingRateType}
                  </Text>
                </View>
                <Text style={styles.baseSnfConfirmSubtext}>
                  {t('this rate type will be used for calculations')}
                </Text>
              </>
            )}
            <View style={styles.baseSnfConfirmButtons}>
              <TouchableOpacity
                style={styles.baseSnfConfirmSecondaryButton}
                onPress={handleButtonPress(() => {
                  setRateTypePickerValue(tempRateType);
                  setShowRateTypeConfirm(false);
                  setPendingRateType(null);
                })}
              >
                <Text style={styles.baseSnfConfirmSecondaryText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.baseSnfConfirmPrimaryButton}
                onPress={handleButtonPress(async () => {
                  if (pendingRateType) {
                    setTempRateType(pendingRateType);
                    setRateTypePickerValue(pendingRateType);

                    // Update radio buttons immediately for better UX
                    setSelectedRadios(getRadiosForRateType(pendingRateType));
                  }
                  setShowRateTypeConfirm(false);
                  setPendingRateType(null);
                })}
              >
                <Icon name="check" size={18} color="#fff" />
                <Text style={styles.baseSnfConfirmPrimaryText}>{t('confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Change Rates Modal */}
      <Modal
        visible={showChangeRatesModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowChangeRatesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowChangeRatesModal(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={styles.changeRatesModalContent}>
            <View style={styles.changeRatesHeader}>
              <Text style={styles.changeRatesTitle}>{t('rate settings')}</Text>
              <TouchableOpacity onPress={() => setShowChangeRatesModal(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.changeRatesScrollView}
              contentContainerStyle={styles.changeRatesScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
                {/* Milk Rate Section */}
                <View style={styles.changeRatesSection}>
                  <Text style={styles.changeRatesSectionTitle}>{t('milk rate')}</Text>
                  <TouchableOpacity
                    style={styles.changeRatesMilkRateButton}
                    onPress={() => {
                      setShowChangeRatesModal(false);
                      navigation.navigate('RateChart');
                    }}
                  >
                    <View style={styles.changeRatesMilkRateContent}>
                      <Text style={styles.changeRatesMilkRateLabel}>
                        {t('current milk rate')}
                      </Text>
                      {isLoadingRate ? (
                        <ActivityIndicator size="small" color="#0D47A1" />
                      ) : (
                        <Text style={styles.changeRatesMilkRateValue}>₹{currentRate || '0'}</Text>
                      )}
                    </View>
                    <Icon name="chevron-right" size={24} color="#0D47A1" />
                  </TouchableOpacity>
                </View>

                {/* Rate Type Section */}
                <View style={styles.changeRatesSection}>
                  <Text style={styles.changeRatesSectionTitle}>{t('rate type')}</Text>
                  <View style={styles.rateTypePickerContainer}>
                    <Picker
                      selectedValue={rateTypePickerValue}
                      onValueChange={(value) => {
                        if (value !== tempRateType) {
                          setPendingRateType(value);
                          setRateTypePickerValue(value);
                          setShowRateTypeConfirm(true);
                        }
                      }}
                      style={styles.rateTypePicker}
                      dropdownIconColor="#0D47A1"
                    >
                      {RATE_TYPES.map((option) => (
                        <Picker.Item label={option.label} value={option.value} key={option.value} />
                      ))}
                    </Picker>
                  </View>
                </View>

                {/* Base SNF Section */}
                <View style={styles.changeRatesSection}>
                  <Text style={styles.changeRatesSectionTitle}>{t('base snf')}</Text>
                  <View style={styles.changeRatesToggleContainer}>
                    {['9.0', '8.5'].map((value) => (
                      <TouchableOpacity
                        key={value}
                        style={[
                          styles.changeRatesToggleOption,
                          tempBaseSnf === value && styles.changeRatesToggleOptionSelected
                        ]}
                        onPress={() => {
                          if (tempBaseSnf !== value) {
                            setPendingBaseSnf(value);
                            setBaseSnfConfirmSource('changeRates');
                            setShowBaseSnfConfirm(true);
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.changeRatesToggleText,
                            tempBaseSnf === value && styles.changeRatesToggleTextSelected
                          ]}
                        >
                          {parseFloat(value).toFixed(2)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Fat/SNF Ratio Section */}
                <View style={styles.changeRatesSection}>
                  <Text style={styles.changeRatesSectionTitle}>{t('fat snf ratio')}</Text>
                  <View style={styles.changeRatesToggleContainer}>
                    {[
                      { value: '60_40', label: '60/40' },
                      { value: '52_48', label: '52/48' }
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.changeRatesToggleOption,
                          tempFatSnfRatio === option.value && styles.changeRatesToggleOptionSelected
                        ]}
                        onPress={() => {
                          if (tempFatSnfRatio !== option.value) {
                            setPendingFatSnfRatio(option.value);
                            setShowFatSnfRatioConfirm(true);
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.changeRatesToggleText,
                            tempFatSnfRatio === option.value && styles.changeRatesToggleTextSelected
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* CLR Conversion Factor Section */}
                <View style={styles.changeRatesSection}>
                  <Text style={styles.changeRatesSectionTitle}>{t('clr conversion factor')}</Text>
                  <Text style={styles.changeRatesSectionDescription}>
                    {t('clr conversion description')}
                  </Text>
                  <View style={styles.changeRatesToggleContainer}>
                    {['0.14', '0.50'].map((value) => (
                      <TouchableOpacity
                        key={value}
                        style={[
                          styles.changeRatesToggleOption,
                          tempClrConversionFactor === value && styles.changeRatesToggleOptionSelected
                        ]}
                        onPress={() => {
                          if (tempClrConversionFactor !== value) {
                            setPendingClrConversion(value);
                            setShowClrConversionConfirm(true);
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.changeRatesToggleText,
                            tempClrConversionFactor === value && styles.changeRatesToggleTextSelected
                          ]}
                        >
                          {value}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.changeRatesButtons}>
              <TouchableOpacity
                style={styles.changeRatesCancelButton}
                onPress={() => setShowChangeRatesModal(false)}
              >
                <Text style={styles.changeRatesCancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.changeRatesSaveButton}
                onPress={async () => {
                  const previousRateType = dairyDetails?.rate_type || DEFAULT_DAIRY_SETTINGS.rateType;
                  const overrides = {
                    base_snf: tempBaseSnf,
                    clr_conversion_factor: tempClrConversionFactor,
                    fat_snf_ratio: tempFatSnfRatio,
                    rate_type: tempRateType
                  };

                  const updated = await persistDairySettings(overrides, { skipIfUnchanged: true });
                  setSelectedRadios(getRadiosForRateType(tempRateType));
                  setShowChangeRatesModal(false);

                  const newRateType = updated?.rate_type || tempRateType;
                  if (
                    previousRateType !== newRateType &&
                    (newRateType === 'kg_only' || newRateType === 'liters_only')
                  ) {
                    navigation.navigate('Home');
                  }
                }}
              >
                <Text style={styles.changeRatesSaveText}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 10,
    backgroundColor: '#0D47A1',
  },
  backButton: {
    padding: 8,
    width: 50, // Fixed width for balance
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'left',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 0,
    paddingBottom: 100, // Extra padding at the bottom for scrolling space and to avoid bottom nav
    flexGrow: 1, // This allows the content to be scrollable even if content is not taller than the screen
  },
  bottomMenu: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  menuItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  menuText: {
    color: '#0D47A1',
    fontSize: 12,
    marginTop: 5,
  },
  addButton: {
    marginTop: -25,
  },
  addButtonInner: {
    backgroundColor: '#0D47A1',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  rateContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    marginTop: 20,  // Consistent spacing
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginTop: 20,
    gap: 10,
  },
  rateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 8,  // Reduced from 10
    borderRadius: 6,  // Reduced from 8
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2
  },
  rateChartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0D47A1',
    minWidth: 135,
  },
  rateChartButtonText: {
    color: '#0D47A1',
    fontSize: 12,
    fontWeight: '800',
  },
  modalSectionTitle: {
    fontSize: 15,
    color: '#000',
    fontWeight: '700',
    marginBottom: 8,
  },
  // Rate Chart modal layout helpers
  rateModalRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  rateModalRowThreshold: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  rateModalCol: {
    flex: 1,
  },
  rateModalLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '700',
    marginBottom: 6,
  },
  rateModalInput: {
    width: '100%',
  },
  baseSnfToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#0D47A1',
    borderRadius: 8,
    overflow: 'hidden',
  },
  baseSnfToggleOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  baseSnfToggleOptionSelected: {
    backgroundColor: '#E3F2FD',
  },
  baseSnfToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  baseSnfToggleTextSelected: {
    color: '#0D47A1',
  },
  baseSnfSelectedIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0D47A1',
    position: 'absolute',
    top: 6,
    right: 6,
  },
  baseSnfSection: {
    alignItems: 'flex-start',
  },
  baseSnfLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '700',
    marginBottom: 6,
  },
  rateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,  // Reduced from 10
  },
  rateLabel: {
    fontSize: 14,  // Reduced from 14
    color: '#000',
    marginRight: 0,  
    fontWeight: '800',
  },
  rateValue: {
    fontSize: 12,  // Reduced from 14
    color: '#0D47A1',
    fontWeight: 'bold',
  },
  editIcon: {
    marginLeft: 6,  // Reduced from 8
    fontSize: 18,  // Added to make icon smaller
  },
  customerSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginTop: 20,  // Consistent spacing
    gap: 5,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 45,
    borderWidth: 1,
    borderColor: '#0D47A1',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: '#333',
  },
  addCustomerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#0D47A1',
    gap: 5,
    height: 45,
  },
  addCustomerText: {
    color: '#0D47A1',
    fontSize: 14,
    fontWeight: '500',
  },
  selectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginTop: 15,
    gap: 8,  // Slightly reduced gap between items
  },
  dateSelector: {
    flex: 1,
    height: 38,  // Decreased height
    backgroundColor: '#fff',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 8,   // Decreased vertical padding
    borderWidth: 1,
    borderColor: '#0D47A1',
  },
  dateSelectorText: {
    color: '#0D47A1',
    fontSize: 12,  // Decreased font size
    fontWeight: '500',
  },
  timeSelector: {
    width: 90,  // Decreased width
    height: 38,  // Decreased height
    backgroundColor: '#fff',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,  // Decreased horizontal padding
    paddingVertical: 8,    // Decreased vertical padding
    borderWidth: 1,
    borderColor: '#0D47A1',
  },
  timeSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,  // Decreased gap
  },
  timeSelectorText: {
    color: '#0D47A1',
    fontSize: 12,  // Decreased font size
    fontWeight: '500',
  },
  animalSelector: {
    flex: 1,
    height: 38,  // Decreased height
    backgroundColor: '#fff',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 13,
    paddingVertical: 8,   // Decreased vertical padding
    borderWidth: 1,
    borderColor: '#0D47A1',
  },
  animalSelectorText: {
    color: '#0D47A1',
    fontSize: 12,  // Decreased font size
    fontWeight: '500',
  },
  animalOptions: {
    width: '100%',
    gap: 8,
  },
  animalOption: {
    backgroundColor: '#f5f5f5',
    padding: 12,
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
  animalOptionSelected: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#0D47A1',
  },
  animalOptionTextSelected: {
    color: '#0D47A1',
    fontWeight: '600',
  },
  formContainer: {
    padding: 15,
    marginTop: 20,  // Consistent spacing
  },
  measureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
    marginBottom: 20,  // Consistent spacing
    paddingHorizontal: 15,
    paddingLeft: 5,  // Added more padding on the left to shift input fields to the right
  },
  inputGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verticalInputGroup: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
  },
  inputLabel: {
    fontSize: 15,  // Changed from 13 to 15
    color: '#666',
    marginBottom: 4,
    fontWeight: '700',
  },
  measureInput: {
    flex: 0,
    width: 75,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    height: 36,
    color: '#000000',
  },
  rateInputWithIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
    height: 36,
  },
  rateInputIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#FFE0E0',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D32F2F',
    minWidth: 30,
    textAlign: 'center',
  },
  positiveRateInput: {
    borderColor: '#4CAF50',
  },
  rateInputIndicatorPositive: {
    backgroundColor: '#E8F5E9',
    color: '#4CAF50',
  },
  rateModalIndicatorInput: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    color: '#000000',
  },
  inputError: {
    borderColor: '#FF4444',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 12,
    position: 'absolute',
    bottom: -16,
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  rowTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 10,
    flex: 1,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    paddingHorizontal: 15,
  },
  ratioContainer: {
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 15,
  },
  ratioOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  ratioOption: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#0D47A1',
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  ratioOptionSelected: {
    backgroundColor: '#0D47A1',
  },
  ratioOptionText: {
    color: '#0D47A1',
    fontWeight: '600',
    fontSize: 14,
  },
  ratioOptionTextSelected: {
    color: '#fff',
  },
  // New styles for ratio single row and centered step-rate inputs
  ratioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
  },
  ratioLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginRight: 8,
  },
  centerRow: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
  },
  verticalCenteredInputGroup: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  centeredLabel: {
    textAlign: 'center',
    alignSelf: 'center',
  },
  stepRateLabel: {
    fontSize: 15,
  },
  labelWithRadio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 80,  // Fix width so label area doesn't grow differently on some devices
  },
  inputWrapper: {
    flex: 1,
    width: '100%',  // This ensures same width as Fat%
  },
  snfInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    textAlign: 'center',
    height: 36,
    flex: 1,
  },
  clrSnfContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    gap: 8,
  },
  arrowText: {
    color: '#0D47A1',
    fontSize: 16,
    fontWeight: 'bold',
  },
  snfDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 36,  // Match the height of other inputs
    borderWidth: 1,
    borderColor: '#ddd',
    flex: 1,    // Take full width of the inputGroup
    justifyContent: 'center',
    gap: 4,
  },
  snfLabel: {
    fontSize: 14,
    color: '#666',
  },
  calculatedSnf: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  successModalContent: {
    padding: 20,
    alignItems: 'center',
  },
  successModalText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  previewSection: {
    marginHorizontal: 10,
    marginBottom: 20,
  },
  confirmButtonContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  tableContainer: {
    margin: 15,
    borderWidth: 0.5,
    borderColor: '#000',
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden', // This ensures content doesn't overflow rounded corners
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    minHeight: 50,
  },
  cell: {
    borderRightWidth: 1,
    borderRightColor: '#000',
    padding: 6, // Reduced padding
    justifyContent: 'center',
  },
  headerCell: {
    backgroundColor: '#f0f0f0',
  },
  headerText: {
    fontSize: 12, // Reduced from 14
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000',
  },
  cellText: {
    fontSize: 11, // Reduced from 14
    textAlign: 'center',
    color: '#000',
  },
  timeText: {
    fontSize: 10, // Reduced from 12
    textAlign: 'center',
    color: '#666',
    marginTop: 2,
  },
  idText: {
    color: '#0D47A1',
    fontWeight: 'bold',
    fontSize: 11, // Added specific size
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  timeIcon: {
    marginRight: 4,
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    color: '#999999',  // Lighter grey for disabled state
  },
  disabledLabel: {
    color: '#BBBBBB',  // Faded text color for disabled labels
  },
  radioButtonFaded: {
    borderColor: '#BBBBBB',  // Faded border color for disabled radio buttons
  },
  datePickerModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '60%',
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
  datePickerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
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
  datePickerScroll: {
    height: 150,
  },
  datePickerScrollContent: {
    padding: 15,
  },
  dateColumn: {
    flex: 1,
    marginHorizontal: 5,
    height: '100%',
  },
  rateLoader: {
    width: 60,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 200,
    zIndex: 1000,
  },
  searchResults: {
    padding: 10,
  },
  searchResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  customerDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  searchLoader: {
    padding: 20,
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    color: '#666',
    fontSize: 14,
  },
  clearButton: {
    padding: 5,
  },
  radioButton: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0D47A1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioCircle: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0D47A1',
    opacity: 0,
  },
  radioCircleSelected: {
    opacity: 1,
  },
  errorInput: {
    borderColor: '#FF4444',
  },
  nextButtonContainer: {
    padding: 15,
    marginTop:-30,
    alignItems: 'flex-end', // Align to right side
  },
  nextButton: {
    backgroundColor: '#0D47A1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    width: 100, // Fixed width for smaller button
  },
  nextButtonDisabled: {
    backgroundColor: '#ccc',
    elevation: 0,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 14, // Smaller font size
    fontWeight: '600',
  },
  popupCardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  popupCard: {
    width: 300,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  popupIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconStyle: {
    fontSize: 48,
    color: '#0D47A1',
    marginBottom: 16,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  popupText: {
    color: '#0D47A1',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  addRateButton: {
    backgroundColor: '#0D47A1',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addRateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  previewModalContent: {
    backgroundColor: 'white',
    width: '90%',
    maxHeight: '85%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  previewScrollView: {
    maxHeight: '80%',
  },
  previewScrollViewContent: {
    padding: 15,
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
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    elevation: 2,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
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
    fontSize: 16,
    color: '#0D47A1',
    fontWeight: '700',
  },
  chargeNotice: {
    marginTop: 10,
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
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
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#0D47A1',
    gap: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
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
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#0D47A1',
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  previewConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
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
    alignSelf: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  modalCancelButton: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',  // Light gray background
    borderBottomLeftRadius: 20,  // Match the modal's border radius
    borderBottomRightRadius: 20,
  },
  modalCancelButtonText: {
    color: '#0D47A1',  // Primary blue color
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  timeOption: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  timeOptionSelected: {
    backgroundColor: '#0D47A1',
    borderColor: '#0D47A1',
  },
  timeOptions: {
    width: '100%',
    gap: 12,
  },
  showCollectionsButton: {
    backgroundColor: '#0D47A1', // Button background color
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  showCollectionsButtonText: {
    color: '#fff', // Text color
    fontSize: 16, // Font size
    fontWeight: '600', // Font weight
    marginLeft: 8, // Space between icon and text
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
    flex: 1,  // This will push the close button to the right
  },
  closeButton: {
    padding: 8,  // Add padding for better touch target
    marginLeft: 'auto',  // This ensures the button stays on the right
  },
  baseSnfSelector: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  baseSnfContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewValue: {
    fontSize: 16,
    color: '#0D47A1',
    fontWeight: 'bold',
  },
  chargeNotice: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
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
  cancelButton: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
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
    alignSelf: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#FFE5E5',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  confirmButton: {
    backgroundColor: '#0D47A1',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButtonText: {
    color: '#D32F2F',
  },
  confirmButtonText: {
    color: '#fff',
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  searchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 15,
    marginTop: 15,
    marginBottom: -10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0D47A1',
    marginTop: 10,
    marginBottom: 15,
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 15,
    lineHeight: 22,
  },
  rechargeButton: {
    backgroundColor: '#FF9800',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 30,
    width: '100%',
    marginBottom: 15,
  },
  rechargeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  laterButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  laterButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  duplicateModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    alignItems: 'center',
  },
  duplicateIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 87, 34, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  duplicateInfoBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 15,
    width: '100%',
    marginVertical: 15,
  },
  duplicateInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  duplicateInfoText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
    fontWeight: '500',
  },
  duplicatePrimaryButton: {
    backgroundColor: '#FF5722',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 30,
    width: '100%',
    marginBottom: 10,
  },
  duplicatePrimaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  duplicateSecondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  duplicateSecondaryButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  customerTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 10,
  },
  customerButton: {
    padding: 8,
    backgroundColor: '#0D47A1',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  disabledButton: {
    backgroundColor: '#ccc',
    elevation: 0,
  },
  // Enhanced Base SNF confirmation modal styles (parity with CollectionScreen)
  baseSnfConfirmModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 22,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  baseSnfConfirmIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  baseSnfConfirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0D47A1',
    textAlign: 'center',
    marginBottom: 8,
  },
  baseSnfConfirmMessage: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginTop: 6,
  },
  baseSnfValueChip: {
    marginTop: 12,
    backgroundColor: '#0D47A1',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  baseSnfValueChipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  baseSnfConfirmSubtext: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  baseSnfConfirmButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    width: '100%',
    marginTop: 18,
  },
  baseSnfConfirmSecondaryButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  baseSnfConfirmSecondaryText: {
    color: '#333',
    fontSize: 15,
    fontWeight: '600',
  },
  baseSnfConfirmPrimaryButton: {
    flexDirection: 'row',
    flex: 1,
    gap: 8,
    backgroundColor: '#0D47A1',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseSnfConfirmPrimaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  // Change Rates Modal Styles
  changeRatesModalContent: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    width: '88%',
    maxHeight: '75%',
    alignSelf: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  changeRatesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  changeRatesScrollContent: {
    paddingBottom: 20,
  },
  changeRatesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  changeRatesScrollView: {
    maxHeight: 360,
  },
  changeRatesSection: {
    marginBottom: 20,
  },
  changeRatesSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  changeRatesSectionDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
    lineHeight: 16,
  },
  changeRatesMilkRateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#f9f9f9',
  },
  changeRatesMilkRateContent: {
    flex: 1,
  },
  changeRatesMilkRateLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  changeRatesMilkRateValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D47A1',
  },
  changeRatesToggleContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  changeRatesToggleOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
  },
  changeRatesToggleOptionSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#0D47A1',
  },
  changeRatesToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  changeRatesToggleTextSelected: {
    color: '#0D47A1',
  },
  changeRatesButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  changeRatesCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  changeRatesCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  changeRatesSaveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#0D47A1',
    alignItems: 'center',
  },
  changeRatesSaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  rateTypePickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 4,
  },
  rateTypePicker: {
    color: '#0D47A1',
  },
});

export default ProRataCollectionScreen;






