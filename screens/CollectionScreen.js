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
  FlatList
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getCurrentMarketPrice, getAllCustomers, getCustomers, createCollection, getCollections, getDairyInfo, updateDairyInfo } from '../services/api';
import { sanitizeDairyInfo as normalizeDairyInfo, buildDairyUpdatePayload, DEFAULT_DAIRY_SETTINGS } from '../utils/dairySettings';
import BottomNav from '../components/BottomNav';
import { useTranslation } from 'react-i18next';
import useKeyboardDismiss from '../hooks/useKeyboardDismiss';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';

const CollectionScreen = ({ navigation }) => {
  const ANIMAL_TYPE_STORAGE_KEY = '@selected_animal_type';

  const [walletBalance, setWalletBalance] = useState("₹8"); // Replace with actual wallet balance
  const [fat, setFat] = useState('6.5');
  const [snf, setSnf] = useState(DEFAULT_DAIRY_SETTINGS.baseSnf);
  const [currentRate, setCurrentRate] = useState(null);
  const [isLoadingRate, setIsLoadingRate] = useState(true);
  const [marketPriceData, setMarketPriceData] = useState(null);
  const [showSnfModal, setShowSnfModal] = useState(false);
  const [snfError, setSnfError] = useState('');
  const [selectedTime, setSelectedTime] = useState('morning'); // 'morning' or 'evening'
  const [selectedAnimal, setSelectedAnimal] = useState('cow+buffalo');
  const [showAnimalModal, setShowAnimalModal] = useState(false);
  const [weight, setWeight] = useState('');
  const [fatPercent, setFatPercent] = useState('');
  const [snfPercent, setSnfPercent] = useState('');
  const [clr, setClr] = useState('');
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
  const [showInputLimitPopup, setShowInputLimitPopup] = useState(false);
  const [inputLimitMessage, setInputLimitMessage] = useState('');
  const [showAnimalPricePopup, setShowAnimalPricePopup] = useState(false);
  const [missingAnimalType, setMissingAnimalType] = useState(null);
  const { handleButtonPress } = useKeyboardDismiss();
  // Confirmation modal state for Base SNF toggle
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

  // Focus states to left-align cursor only when focused (placeholders remain centered)
  const [isFatFocused, setIsFatFocused] = useState(false);
  const [isWeightFocused, setIsWeightFocused] = useState(false);
  const [isSnfFocused, setIsSnfFocused] = useState(false);
  const [isClrFocused, setIsClrFocused] = useState(false);

  // Timers for delayed formatting of percentage inputs
  const fatFormatTimeoutRef = useRef(null);
  const snfFormatTimeoutRef = useRef(null);
  const clrFormatTimeoutRef = useRef(null);

  // Helper to clear all formatting timers on unmount
  useEffect(() => {
    return () => {
      if (fatFormatTimeoutRef.current) clearTimeout(fatFormatTimeoutRef.current);
      if (snfFormatTimeoutRef.current) clearTimeout(snfFormatTimeoutRef.current);
      if (clrFormatTimeoutRef.current) clearTimeout(clrFormatTimeoutRef.current);
    };
  }, []);

  // CLR to SNF conversion factor state (0.14 or 0.50)
  const [clrConversionFactor, setClrConversionFactor] = useState(DEFAULT_DAIRY_SETTINGS.clrConversionFactor);

  // Fat/SNF ratio state (60/40 or 52/48)
  const [fatSnfRatio, setFatSnfRatio] = useState(DEFAULT_DAIRY_SETTINGS.fatSnfRatio);

  // Change Rates modal state
  const [showChangeRatesModal, setShowChangeRatesModal] = useState(false);
  const [tempBaseSnf, setTempBaseSnf] = useState(DEFAULT_DAIRY_SETTINGS.baseSnf);
  const [tempClrConversionFactor, setTempClrConversionFactor] = useState(DEFAULT_DAIRY_SETTINGS.clrConversionFactor);
  const [tempFatSnfRatio, setTempFatSnfRatio] = useState(DEFAULT_DAIRY_SETTINGS.fatSnfRatio);

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
    const loadSavedAnimalType = async () => {
      try {
        const savedType = await AsyncStorage.getItem(ANIMAL_TYPE_STORAGE_KEY);
        if (savedType) {
          setSelectedAnimal(savedType);
        }
      } catch (error) {
        console.error('Error loading saved animal type:', error);
      }
    };

    loadSavedAnimalType();
  }, []);

  useEffect(() => {
    if (!marketPriceData) {
      setCurrentRate(0);
      setShowAnimalPricePopup(false);
      setMissingAnimalType(null);
      return;
    }

    // Always clear any previous animal-specific popup state before recalculating
    setShowAnimalPricePopup(false);
    setMissingAnimalType(null);

    const basePrice = parseFloat(marketPriceData.price || '0') || 0;
    const cowPrice = marketPriceData.cow_price ? parseFloat(marketPriceData.cow_price) : null;
    const buffaloPrice = marketPriceData.buffalo_price ? parseFloat(marketPriceData.buffalo_price) : null;

    // Resolve the effective rate type from latest dairy settings, falling back to tempRateType
    const resolvedRateType = (dairyDetails?.rate_type || tempRateType || DEFAULT_DAIRY_SETTINGS.rateType);
    const flatRate = isFlatRateType(resolvedRateType);

    if (!flatRate) {
      setCurrentRate(basePrice);
      return;
    }

    const normalizedAnimal = (selectedAnimal || '').toLowerCase().replace(/\s+/g, '');

    if (normalizedAnimal === 'cow+buffalo' || normalizedAnimal === 'cow_buffalo' || !normalizedAnimal) {
      setCurrentRate(basePrice);
      return;
    }

    if (normalizedAnimal === 'cow') {
      if (!cowPrice || isNaN(cowPrice) || cowPrice <= 0) {
        setCurrentRate(0);
        setMissingAnimalType('cow');
        setShowAnimalPricePopup(true);
        return;
      }
      setCurrentRate(cowPrice);
      return;
    }

    if (normalizedAnimal === 'buffalo') {
      if (!buffaloPrice || isNaN(buffaloPrice) || buffaloPrice <= 0) {
        setCurrentRate(0);
        setMissingAnimalType('buffalo');
        setShowAnimalPricePopup(true);
        return;
      }
      setCurrentRate(buffaloPrice);
      return;
    }

    setCurrentRate(basePrice);
  }, [marketPriceData, selectedAnimal, tempRateType, dairyDetails]);

  // Add useFocusEffect to fetch rate when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchCurrentRate();
      fetchCustomers();
      fetchLatestCollection();
      fetchDairyInfo(); // Add this line to fetch dairy info
    }, [])
  );

  // Define rate type options
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

  const isFlatRateType = (rateType) => rateType === 'kg_only' || rateType === 'liters_only';

  const getRadiosForRateType = (rateType) => {
    if (rateType === 'fat_snf') {
      return { snf: true, clr: false };
    }
    if (rateType === 'fat_clr') {
      return { snf: false, clr: true };
    }
    return { snf: false, clr: false };
  };

  const calculateAverageRate = (data) => {
    if (!data) return '0.00';
    const amount = parseFloat(data.amount);
    if (!amount || Number.isNaN(amount)) return '0.00';

    // Determine divisor for average rate:
    // - For KG-measured collections, always divide by KG.
    // - For fat-based collections (non-zero fat percentage) that are marked as
    //   measured in liters, use KG so that the average rate is per KG.
    // - For pure liters-only collections (fat_percentage is 0), keep using liters
    //   so that the average rate matches the per-liter milk rate.
    const fatPercentage =
      data.fat_percentage !== undefined && data.fat_percentage !== null
        ? parseFloat(data.fat_percentage)
        : 0;

    let divisor;

    if (data.measured === 'kg') {
      divisor = parseFloat(data.kg);
    } else if (data.measured === 'liters') {
      if (!Number.isNaN(fatPercentage) && fatPercentage > 0) {
        // Fat-based (fat_snf / fat_clr) collections -> per KG average rate
        divisor = parseFloat(data.kg);
      } else {
        // Liters-only collections -> per liter average rate
        divisor = parseFloat(data.liters);
      }
    } else {
      // Fallback: prefer KG, otherwise use liters
      divisor = parseFloat(data.kg);
      if (!divisor || Number.isNaN(divisor)) {
        divisor = parseFloat(data.liters);
      }
    }

    if (!divisor || Number.isNaN(divisor)) return '0.00';

    return (amount / divisor).toFixed(2);
  };

  // State for rate type in the rate settings modal
  const [tempRateType, setTempRateType] = useState(DEFAULT_DAIRY_SETTINGS.rateType);
  const [rateTypePickerValue, setRateTypePickerValue] = useState(DEFAULT_DAIRY_SETTINGS.rateType);

  const applyDairySettings = (settings) => {
    if (!settings) return;

    setDairyDetails(settings);

    const baseSnfValue = settings.base_snf || DEFAULT_DAIRY_SETTINGS.baseSnf;
    setSnf(baseSnfValue);
    setTempBaseSnf(baseSnfValue);

    const ratioValue = settings.fat_snf_ratio || DEFAULT_DAIRY_SETTINGS.fatSnfRatio;
    setFatSnfRatio(ratioValue);
    setTempFatSnfRatio(ratioValue);

    const clrValue = settings.clr_conversion_factor || DEFAULT_DAIRY_SETTINGS.clrConversionFactor;
    setClrConversionFactor(clrValue);
    setTempClrConversionFactor(clrValue);

    const resolvedRateType = settings.rate_type || DEFAULT_DAIRY_SETTINGS.rateType;
    setTempRateType(resolvedRateType);
    setRateTypePickerValue(resolvedRateType);

    setSelectedRadios(getRadiosForRateType(resolvedRateType));
  };

  // Add function to fetch dairy info and set radio buttons
  const fetchDairyInfo = async () => {
    try {
      const dairyInfo = await getDairyInfo();
      if (dairyInfo) {
        const sanitizedInfo = normalizeDairyInfo(dairyInfo);
        applyDairySettings(sanitizedInfo);
        return sanitizedInfo;
      }
    } catch (error) {
      console.error('Error fetching dairy info:', error);
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

      console.log('Persisting dairy settings payload:', payload);
      const updated = await updateDairyInfo(payload);
      const sanitized = normalizeDairyInfo(updated);
      applyDairySettings(sanitized);
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
      if (response) {
        setMarketPriceData(response);
      } else {
        setMarketPriceData(null);
        setCurrentRate(0);
      }
    } catch (error) {
      setMarketPriceData(null);
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
  };

  const handleSnfChange = (text) => {
    if (text === '' || allowedSnfValues.includes(text)) {
      setSnf(text);
      setSnfError('');
    } else {
      setSnfError('Please select a valid SNF value');
    }
  };

  const triggerInputLimitPopup = (translationKey) => {
    setInputLimitMessage(t(translationKey));
    setShowInputLimitPopup(true);
  };

  // Helper to format a numeric string as X.Y or X.YY using the last digit as decimal
  const formatWithTrailingDecimal = (rawValue, maxValue, decimals, onOverflow) => {
    if (!rawValue) return '';

    const sanitized = (rawValue || '').replace(/[^0-9.]/g, '');

    // Helper to format to the requested decimal places using decimal rounding.
    // Using toFixed directly avoids floating-point floor issues that caused
    // values like 9.2 to appear as 9.19 due to binary representation.
    const toFixedTruncate = (num) => {
      if (num == null || isNaN(num)) return '';
      return Number(num).toFixed(decimals);
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

    // Single digit -> D.00, with special handling for fat/SNF when the digit is 1
    if (length === 1) {
      const num = parseFloat(digits);
      if (isNaN(num)) return '';
      if (num > maxValue) {
        if (onOverflow) onOverflow();
        return '';
      }

      // Special-case: for fat/SNF inputs (max 15, 2 decimals), treat a lone "1"
      // as the minimum allowed value 10.00.
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
      // Desired mappings for leading "1" in fat/SNF (max 15, 2 decimals):
      // 1   -> 10.00  (handled above in length === 1 branch)
      // 12  -> 12.00
      // 134 -> 13.40
      // 1345 -> 13.45

      let num;

      if (length === 2) {
        // Two digits (10–15) -> treat as whole number with .00
        num = parseInt(digits, 10);
      } else {
        // Three or more digits: use first two digits as integer part,
        // subsequent digits as decimal part (max 2 decimals).
        const intPartStr = digits.slice(0, 2);
        const decimalDigits = digits.slice(2, 4); // up to 2 decimal digits
        num = parseFloat(`${intPartStr}.${decimalDigits}`);
      }

      if (isNaN(num)) return '';
      if (num > maxValue) {
        if (onOverflow) onOverflow();
        return '';
      }

      return toFixedTruncate(num);
    }

    // For CLR (max 36, 2 decimals):
    //  - 24   -> 24.00
    //  - 239  -> 23.90
    //  - 3025 -> 30.25
    if (maxValue === 36 && decimals === 2) {
      let num;

      if (length === 2) {
        // Two digits are treated as whole number with .00
        num = parseInt(digits, 10);
      } else if (length === 3) {
        // Three digits: first two as integer, last digit as decimal (e.g. 239 -> 23.9)
        const intPartStr = digits.slice(0, 2);
        const decimalDigits = digits.slice(2); // single digit
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

    // Original behavior for non-leading-1, non-CLR values:
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

    // Three or more digits: last TWO digits as decimal (e.g. 654 -> 6.54, 3025 -> 30.25)
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

  // Custom input handler for Fat % (auto-format on blur or 2s idle)
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

  // Custom input handler for SNF % (mirrors Fat % behavior)
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

  // Custom input handler for CLR (same trailing-decimal behavior, max 36.00)
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

  // Handler to toggle Base SNF and persist it (component scope)
  const handleBaseSnfToggle = async (value) => {
    try {
      setSnf(value);
      setTempBaseSnf(value);
      await persistDairySettings({ base_snf: value }, { skipIfUnchanged: true });
    } catch (error) {
      console.error('Error updating base SNF:', error);
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
    const flatRate = isFlatRateType(tempRateType);

    if (!selectedCustomer) newErrors.customer = 'Please select a customer';
    if (!selectedTime) newErrors.time = 'Please select morning or evening';
    if (!weight) newErrors.weight = 'Required';
    if (!flatRate) {
      if (!fatPercent) newErrors.fatPercent = 'Required';
      if (selectedRadios.snf && !snfPercent) newErrors.snfPercent = 'Required';
      if (selectedRadios.clr && !clr) newErrors.clr = 'Required';
      if (!selectedRadios.snf && !selectedRadios.clr) newErrors.radio = 'At least one option must be selected';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    const flatRate = isFlatRateType(tempRateType);

    if (!selectedCustomer) {
      Alert.alert(
        t('customer required'),
        t('please select a customer before proceeding.'),
        [{ text: t('ok'), onPress: () => { } }]
      );
      return;
    }

    if (!flatRate && !selectedRadios.snf && !selectedRadios.clr) {
      setErrors({ ...errors, radio: 'Please select SNF% or CLR' });
      return;
    }

    if (validateInputs()) {
      try {
        const milkRate = parseFloat(currentRate);
        const baseSnfPercentage = parseFloat(snf);

        // Format milk type
        const milkType = selectedAnimal.toLowerCase().replace(/\s+/g, '');
        const formattedMilkType = milkType === 'cow+buffalo' ? 'cow_buffalo' : milkType;

        // Flat rate types: kg_only and liters_only
        if (tempRateType === 'kg_only') {
          const weightKg = parseFloat(weight);
          const liters = (weightKg / 1.02).toFixed(2);
          const amount = (weightKg * milkRate).toFixed(3);
          const solidWeight = (amount / milkRate).toFixed(3);

          const collectionData = {
            collection_time: selectedTime.toLowerCase(),
            milk_type: formattedMilkType,
            customer: selectedCustomer.id,
            collection_date: new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0],
            measured: 'kg',
            liters: liters.toString(),
            kg: weightKg.toString(),
            fat_percentage: '0',
            fat_kg: '0',
            clr: '',
            snf_percentage: '0',
            snf_kg: '0',
            fat_rate: '0',
            snf_rate: '0',
            milk_rate: milkRate.toString(),
            amount: amount.toString(),
            solid_weight: solidWeight.toString(),
            base_snf_percentage: baseSnfPercentage.toString()
          };

          setPreviewData(collectionData);
          setShowPreviewModal(true);
          return;
        }

        if (tempRateType === 'liters_only') {
          const liters = parseFloat(weight);
          const rawKg = liters * 1.02;
          const weightKg = parseFloat(rawKg.toFixed(2));
          const amount = (liters * milkRate).toFixed(3);
          const solidWeight = weightKg.toFixed(3);

          const collectionData = {
            collection_time: selectedTime.toLowerCase(),
            milk_type: formattedMilkType,
            customer: selectedCustomer.id,
            collection_date: new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0],
            measured: 'liters',
            liters: liters.toString(),
            kg: weightKg.toFixed(2).toString(),
            fat_percentage: '0',
            fat_kg: '0',
            clr: '',
            snf_percentage: '0',
            snf_kg: '0',
            fat_rate: '0',
            snf_rate: '0',
            milk_rate: milkRate.toString(),
            amount: amount.toString(),
            solid_weight: solidWeight.toString(),
            base_snf_percentage: baseSnfPercentage.toString()
          };

          setPreviewData(collectionData);
          setShowPreviewModal(true);
          return;
        }

        // Convert all numeric inputs to floats (fat/SNF-based types)
        const weightKg = parseFloat(weight);

        // Ensure fat%, snf%, and clr are formatted and within limits before calculations
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

        // Calculate liters from kg (using 1.02 density factor)
        const liters = (weightKg / 1.02).toFixed(2);

        // Calculate fat kg - Remove slice limitation
        const fatKg = Math.floor((weightKg * (fatPercentage / 100)) * 100) / 100;

        // Handle CLR and SNF calculations
        let snfPercentageValue, clrValue;
        if (selectedRadios.snf) {
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
          clrValue = (4 * (snfPercentageValue - 0.2 * fatPercentage - 0.14)).toFixed(3);
        } else {
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
          clrValue = parseFloat(formattedClr);
          setClr(formattedClr);
          snfPercentageValue = calculateSnfFromClr(formattedClr, formattedFat);
        }

        // Calculate SNF kg - Remove slice limitation
        const snfKg = Math.floor((weightKg * (snfPercentageValue / 100)) * 100) / 100;

        // Calculate rates based on selected Fat/SNF ratio
        const fatRatioPercent = fatSnfRatio === '60_40' ? 60 : 52;
        const snfRatioPercent = fatSnfRatio === '60_40' ? 40 : 48;

        const fatRate = Math.floor((milkRate * fatRatioPercent / 6.5) * 100) / 100;
        const snfRate = Math.floor((milkRate * snfRatioPercent / baseSnfPercentage) * 100) / 100;

        // Calculate final amount - No limitation
        const amt = Math.floor(parseFloat(fatKg) * parseFloat(fatRate) * 100) / 100 +
          Math.floor(parseFloat(snfKg) * parseFloat(snfRate) * 100) / 100;
        const amount = amt.toFixed(3);

        // Calculate solid weight - No limitation
        const solidWeight = (amount / milkRate).toFixed(3);

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
          clr: selectedRadios.clr ? clrValue.toString() : '' | "",
          snf_percentage: snfPercentageValue.toString(),
          snf_kg: snfKg.toString(),
          fat_rate: fatRate.toString(),
          snf_rate: snfRate.toString(),
          milk_rate: milkRate.toString(),
          amount: amount.toString(),
          solid_weight: solidWeight.toString(),
          base_snf_percentage: baseSnfPercentage.toString()
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
      // Iterate across pages until we find the latest normal (non pro-rata) collection
      let page = 1;
      const pageSize = 100; // large page size to minimize requests
      let found = null;

      while (!found) {
        const response = await getCollections({ page, page_size: pageSize });

        if (response.results && response.results.length > 0) {
          // Filter for normal collections only (not pro rata)
          const normalCollections = response.results.filter(collection => !collection.is_pro_rata);
          if (normalCollections.length > 0) {
            found = normalCollections[0];
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

    return snf.toFixed(2);
  };

  // Add this effect to update SNF when CLR or Fat changes
  useEffect(() => {
    if (selectedRadios.clr && clr && fatPercent) {
      const calculatedSnf = calculateSnfFromClr(clr, fatPercent);
      setSnfPercent(calculatedSnf);
    }
  }, [clr, fatPercent, selectedRadios.clr, clrConversionFactor]);

  const isFlatRateMode = isFlatRateType(tempRateType);
  const isKgOnlyMode = tempRateType === 'kg_only';
  const isLitersOnlyMode = tempRateType === 'liters_only';
  const isClrMode = !isFlatRateMode && selectedRadios.clr;
  const isSnfMode = !isFlatRateMode && selectedRadios.snf;

  // Normalize CLR without triggering overflow popups, to validate single-digit restriction
  const normalizedClr = isClrMode
    ? formatWithTrailingDecimal(clr, 36.0, 2)
    : '';

  const isClrInvalid =
    isClrMode && (
      !normalizedClr ||
      isNaN(parseFloat(normalizedClr)) ||
      parseFloat(normalizedClr) < 10
    );

  const isNextDisabled = isFlatRateMode
    ? !weight
    : (!weight ||
      !fatPercent ||
      (isSnfMode && !snfPercent) ||
      (isClrMode && isClrInvalid));

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
    const clrValue =
      latestCollection.clr !== null && latestCollection.clr !== undefined
        ? parseFloat(latestCollection.clr)
        : NaN;

    const displayOrDash = (value) =>
      !isNaN(value) && value > 0 ? value.toFixed(2) : '-';

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
              <Text style={styles.headerText}>{isLitersOnlyMode ? 'Liters' : 'KG'}</Text>
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
            onPress={() => navigation.navigate('EditCollection', {
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
              <Text style={styles.cellText}>
                {isLitersOnlyMode
                  ? (latestCollection.liters != null
                    ? parseFloat(latestCollection.liters).toFixed(2)
                    : '-')
                  : (latestCollection.kg != null
                    ? parseFloat(latestCollection.kg).toFixed(2)
                    : '-')}
              </Text>
            </View>
            <View style={[styles.cell, { flex: 1 }]}>
              <Text style={styles.cellText}>{displayOrDash(fatPct)}</Text>
            </View>
            <View style={[styles.cell, { flex: 1 }]}>
              <Text style={styles.cellText}>{displayOrDash(snfPct)}</Text>
            </View>
            <View style={[styles.cell, { flex: 1 }]}>
              <Text style={styles.cellText}>{displayOrDash(baseSnfPct)}</Text>
            </View>
            <View style={[styles.cell, { flex: 1.2 }]}>
              <Text style={styles.cellText}>{!isNaN(clrValue) && clrValue > 0 ? clrValue.toFixed(2) : '-'}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.showCollectionsButton}
          onPress={() => navigation.navigate('GenerateFullReport')}
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

    const fatKg = previewData.fat_kg;
    const snfKg = previewData.snf_kg;
    const milkRate = parseFloat(currentRate);

    // Calculate new rates with new base SNF using selected Fat/SNF ratio
    const fatRatioPercent = fatSnfRatio === '60_40' ? 60 : 52;
    const snfRatioPercent = fatSnfRatio === '60_40' ? 40 : 48;

    const fatRate = (milkRate * fatRatioPercent / 6.5).toFixed(3);
    const snfRate = (milkRate * snfRatioPercent / parseFloat(newBaseSnf)).toFixed(3);

    // Calculate new amount
    const newAmount = (
      parseFloat(fatKg) * parseFloat(fatRate) +
      parseFloat(snfKg) * parseFloat(snfRate)
    ).toFixed(2);

    // Update preview data with new calculations
    setPreviewData({
      ...previewData,
      base_snf_percentage: newBaseSnf,
      fat_rate: fatRate,
      snf_rate: snfRate,
      amount: newAmount
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
            {previewData?.base_snf_percentage ? parseFloat(previewData.base_snf_percentage).toFixed(2) : '-'}
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
                      ]}>8.50</Text>
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
                          {parseFloat(value).toFixed(2)}
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

  // New: Simple toggle for Base SNF (9.0 / 8.5) shown on main screen top-left
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

        <Text style={styles.headerTitle}>{t('collection')}</Text>
      </View>

      {/* Popup Card for Adding Milk Rate (no rate set at all) */}
      {currentRate === 0 && !showAnimalPricePopup && (
        <View style={styles.popupCardOverlay}>
          <View style={styles.popupCard}>
            <View style={styles.popupIconContainer}>
              <Icon name="alert-circle-outline" style={styles.iconStyle} />
            </View>
            <Text style={styles.popupTitle}>{t('milk rate required')}</Text>
            <Text style={styles.popupText}>{t('please set the milk rate before adding collection.')}</Text>
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

      {/* Popup Card for missing animal-specific milk rate */}
      {showAnimalPricePopup && (
        <View style={styles.popupCardOverlay}>
          <View style={styles.popupCard}>
            <View style={styles.popupIconContainer}>
              <Icon name="alert-circle-outline" style={styles.iconStyle} />
            </View>
            <Text style={styles.popupTitle}>
              {missingAnimalType === 'cow'
                ? t('cow milk rate required')
                : missingAnimalType === 'buffalo'
                  ? t('buffalo milk rate required')
                  : t('milk rate required')}
            </Text>
            <Text style={styles.popupText}>
              {missingAnimalType === 'cow'
                ? t('please set the cow milk rate before adding collection.')
                : missingAnimalType === 'buffalo'
                  ? t('please set the buffalo milk rate before adding collection.')
                  : t('please set the milk rate before adding collection.')}
            </Text>
            <TouchableOpacity
              style={styles.addRateButton}
              onPress={() => {
                setShowAnimalPricePopup(false);
                navigation.navigate('RateChart');
              }}
            >
              <Text style={styles.addRateButtonText}>{t('set milk rate')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Popup Card for Input Limit Errors */}
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

          {/* Add error message if exists */}
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
                  <Text style={styles.inputLabel}>{isLitersOnlyMode ? 'Liters' : 'Weight'}</Text>
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
                  <View style={{ width: 20 }} /> {/* This creates the same spacing as radio button */}
                  <Text style={[styles.inputLabel, isFlatRateMode && styles.disabledLabel]}>Fat %</Text>
                </View>
                <TextInput
                  style={[
                    styles.measureInput,
                    errors.fatPercent && styles.inputError,
                    { textAlign: (isFatFocused || !!fatPercent) ? 'left' : 'center' },
                    isFlatRateMode && styles.disabledInput
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
                        () => triggerInputLimitPopup('Fat%', '15.0')
                      )
                    );
                  }}
                  value={fatPercent}
                  onChangeText={handleFatPercentInput}
                  keyboardType="decimal-pad"
                  editable={!isFlatRateMode}
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
                  <View style={{ width: 20 }} />
                  <Text
                    style={[
                      styles.inputLabel,
                      !selectedRadios.snf && styles.disabledLabel,
                    ]}
                  >
                    SNF%
                  </Text>
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
                        () => triggerInputLimitPopup('SNF%', '15.0')
                      )
                    );
                  }}
                  value={snfPercent}
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
                  <View style={{ width: 20 }} />
                  <Text
                    style={[
                      styles.inputLabel,
                      !selectedRadios.clr && styles.disabledLabel,
                    ]}
                  >
                    CLR
                  </Text>
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
                        () => triggerInputLimitPopup('CLR', '36.00')
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

            {/* Pro-Rata Navigation (moved inside form for alignment) */}
            {/* <View style={{ marginTop: 10 }}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#E0E0E0', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, gap: 8 }}
              onPress={() => navigation.navigate('ProRataCollectionScreen')}
            >
              <Icon name="percent" size={16} color="#0D47A1" />
              <Text style={{ color: '#0D47A1', fontSize: 14, fontWeight: '600' }}>{t("pro-rata")}</Text>
            </TouchableOpacity>
          </View> */}
          </View>



          {/* Next Button */}
          <View style={styles.nextButtonContainer}>
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
                      const value = animal.toLowerCase();
                      setSelectedAnimal(value);
                      AsyncStorage.setItem(ANIMAL_TYPE_STORAGE_KEY, value).catch((error) => {
                        console.error('Error saving animal type:', error);
                      });
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
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
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
                      { length: new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate() },
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
                        <Icon name="calendar" size={14} color="#666" style={{ marginRight: 4 }} />
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

                  {/* Payment Details Card */}
                  <View style={styles.previewCard}>
                    <View style={styles.previewSectionHeader}>
                      <Icon name="currency-inr" size={20} color="#0D47A1" />
                      <Text style={styles.previewSectionTitle}>{t('payment details')}</Text>
                    </View>
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Avg. Rate</Text>
                      <Text style={styles.previewValue}>₹{calculateAverageRate(previewData)}</Text>
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
                  const overrides = {
                    base_snf: tempBaseSnf,
                    clr_conversion_factor: tempClrConversionFactor,
                    fat_snf_ratio: tempFatSnfRatio,
                    rate_type: tempRateType
                  };

                  await persistDairySettings(overrides, { skipIfUnchanged: true });
                  setSelectedRadios(getRadiosForRateType(tempRateType));
                  setShowChangeRatesModal(false);
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
    gap: 0,
    marginBottom: 20,  // Consistent spacing
    paddingHorizontal: 0,
  },
  inputGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: -15,
  },
  inputLabel: {
    fontSize: 15,  // Changed from 13 to 15
    color: '#666',
    marginBottom: 4,
    fontWeight: '700',
  },
  measureInput: {
    flex: 0,  // Set flex to 0 to allow width to be defined
    width: 75,  // Set width to 75 for all input boxes
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    height: 36,
    color: '#000000',  // Adding explicit black color
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
    marginTop: -30,
    alignItems: 'center', // Align to right side
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
  // Enhanced Base SNF confirmation modal styles
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

export default CollectionScreen;
