import axios from 'axios';
import { getToken } from './tokenStorage';
import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use your machine's IP address for both development and production on physical devices
// Normal
//const BASE_URL = "http://dudhiya-backend-fik82q-a7eaae-31-97-60-222.traefik.me/api"; 

// MOD
//const BASE_URL = "http://dudhiya-backend-v104-mod-zpskdt-829829-31-97-60-222.traefik.me/api";

// TEST
const BASE_URL = "http://dudhiya-backend-yabopd-2b0695-31-97-60-222.traefik.me/api";

// API Endpoints
const ENDPOINTS = {
  LOGIN: '/login/',
  FORGOT_PASSWORD: '/forgot-password/',
  RESET_PASSWORD: '/reset-password/',
  USER_INFO: '/user-info/',
  REFERRAL: '/apply-referral-code/',
  VERIFY_OTP: '/verify-otp/',  // Changed from '/auth/verify/'
  // Collector specific endpoints
  DAIRY_INFO: '/collector/dairy-information/',
  MARKET_PRICES: '/collector/market-milk-prices/',
  CUSTOMERS: '/collector/customers/',
  COLLECTIONS: '/collector/collections/',
  PURCHASES_REPORT_COLLECTIONS: '/collector/collections/purchase-report/',
  PURCHASE_SUMMARY_COLLECTIONS: '/collector/collections/purchase-summary-report/',

  // Report endpoints
  GENERATE_FULL_REPORT: '/collector/collections/generate_full_report/',
  GENERATE_FULL_CUSTOMER_REPORT: "/collector/collections/generate_full_customer_report/",
  GENERATE_PURCHASE_SUMMARY_REPORT: '/collector/collections/generate_purchase_summary_report/',
  GENERATE_PURCHASE_REPORT: '/collector/collections/generate_purchase_report/',
  PRO_RATA_FULL_REPORT: '/collector/pro-rata-reports/full-report/',
  PRO_RATA_CUSTOMER_BILLS: '/collector/pro-rata-reports/customer-bills/',
  PRO_RATA_CUSTOMER_REPORT: '/collector/pro-rata-reports/customer-report/',
  PRO_RATA_GENERATE_PURCHASE_REPORT: '/collector/pro-rata-reports/purchase-report-pdf/',
  PRO_RATA_PURCHASE_REPORT_COLLECTIONS: '/collector/pro-rata-reports/purchase-report/',
  PRO_RATA_PURCHASE_SUMMARY_REPORT: '/collector/pro-rata-reports/purchase-summary-report/',
  PRO_RATA_PURCHASE_SUMMARY_DATA: '/collector/pro-rata-reports/purchase-summary-data/',
  PRO_RATA_RATE_CHART: '/collector/pro-rata-rate-chart/',

  // Wallet endpoints
  WALLET: '/wallet/',
  WALLET_TRANSACTIONS: '/wallet/transactions/',

  // Misc endpoints
  YOUTUBE_LINK: '/collector/youtube-link/youtube-link/',
};

const ALLOWED_DAIRY_RATE_TYPES = ['fat_snf', 'fat_clr', 'kg_only', 'liters_only', 'fat_only'];

// Fetch YouTube channel link from backend
export const getYouTubeLink = async () => {
  try {
    const response = await api.get(ENDPOINTS.YOUTUBE_LINK);
    // Expecting { link: string }
    return response.data;
  } catch (error) {
    throw error;
  }
};

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 3000000, // 5 minutes
});

// Add request logging
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for handling common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (!error.response) {
      return Promise.reject({
        error: 'Network connection error. Please check your internet connection.'
      });
    }

    switch (error.response.status) {
      case 401:
        return Promise.reject({
          error: 'Your session has expired. Please login again.'
        });
      case 404:
        return Promise.reject({
          error: 'The requested resource was not found.'
        });
      case 500:
        return Promise.reject({
          error: 'Server error. Please try again later.'
        });
      default:
        return Promise.reject(error.response?.data || {
          error: `Network error occurred (${error.response?.status || 'unknown'})`
        });
    }
  }
);

export const DEV_MODE = true;

export const loginUser = async (phoneNumber) => {
  if (DEV_MODE) {
    const response = await api.post(ENDPOINTS.LOGIN, {
      phone_number: phoneNumber.replace('+91', '') // Remove +91 prefix as per docs
    });
    return response.data;
  }
  else {
    try {
      const response = await api.post(ENDPOINTS.LOGIN, {
        phone_number: phoneNumber.replace('+91', '') // Remove +91 prefix as per docs
      });

      console.log('Login API Response:', response.data);

      if (!response.data.verificationId) {
        throw new Error('Verification ID not received from server');
      }

      return {
        verificationId: response.data.verificationId,
        message: response.data.message
      };
    } catch (error) {
      console.error('Login API Error:', error.response?.data || error);
      throw error.response?.data || error;
    }
  }
};

// Pro-Rata full customer report (customer bills)
export const generateProRataCustomerBills = async (startDate, endDate) => {
  try {
    const reportApi = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 60000,
    });

    const token = await getToken();
    if (token) {
      reportApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    const response = await reportApi.get(`${ENDPOINTS.PRO_RATA_CUSTOMER_BILLS}?start_date=${startDate}&end_date=${endDate}`, { responseType: 'arraybuffer' });
    if (response.status === 200) {
      const pdfData = response.data;
      const fileName = `PRO_RATA_FULL_CUSTOMER_REPORT_${formatDateForReportName(startDate)}_to_${formatDateForReportName(endDate)}.pdf`;

      const appFileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(appFileUri, arrayBufferToBase64(pdfData), { encoding: 'base64' });

      let publicFileUri = appFileUri;

      if (Platform.OS === 'android') {
        try {
          let directoryUri = await AsyncStorage.getItem('downloads_directory_uri');

          if (!directoryUri) {
            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted && permissions.directoryUri) {
              directoryUri = permissions.directoryUri;
              await AsyncStorage.setItem('downloads_directory_uri', directoryUri);
            }
          }

          if (directoryUri) {
            const publicFile = await FileSystem.StorageAccessFramework.createFileAsync(directoryUri, fileName, 'application/pdf');
            const fileContent = await FileSystem.readAsStringAsync(appFileUri, { encoding: 'base64' });
            await FileSystem.writeAsStringAsync(publicFile, fileContent, { encoding: 'base64' });
            console.log('PDF also saved to Downloads via SAF:', fileName);
            publicFileUri = publicFile;
          }
        } catch (error) {
          console.log('Could not save to Downloads via SAF, keeping in app directory:', error);
          await AsyncStorage.removeItem('downloads_directory_uri');
        }
      }

      return {
        viewUri: publicFileUri,
        shareUri: appFileUri
      };
    } else {
      throw new Error('Failed to generate pro-rata full customer report.');
    }
  } catch (error) {
    console.error('Error generating pro-rata full customer report:', error);
    if (error.message) {
      throw { error: error.message };
    }
    throw error;
  }
};

export const applyReferralCode = async (referralCode) => {
  console.log('Making API call with code:', referralCode); // Debug log
  const response = await api.post(ENDPOINTS.REFERRAL, {
    referral_code: referralCode
  });
  console.log('API Response:', response.data); // Debug log
  return response.data;
};

export const verifyOTP = async (phoneNumber, otp, verificationId) => {
  try {
    const response = await api.post(ENDPOINTS.VERIFY_OTP, {
      phone_number: phoneNumber.replace('+91', ''),
      otp: otp.toString().slice(0, 6), // Ensure OTP is 6 digits
      verificationId: verificationId
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Dairy specific endpoints
export const saveDairyInfo = async (dairyData) => {
  try {
    // Validate required fields as per collector API docs
    if (!dairyData.dairy_name) {
      throw { error: 'Dairy name is required' };
    }

    if (!dairyData.dairy_address) {
      throw { error: 'Dairy address is required' };
    }

    if (dairyData.rate_type && !ALLOWED_DAIRY_RATE_TYPES.includes(dairyData.rate_type)) {
      throw { error: `Invalid rate type. Must be one of: ${ALLOWED_DAIRY_RATE_TYPES.join(', ')}` };
    }

    const response = await api.post(ENDPOINTS.DAIRY_INFO, dairyData);
    return response.data;
  } catch (error) {
    if (error.response?.data?.error) {
      throw { error: error.response.data.error };
    }
    throw error;
  }
};

export const updateDairyInfo = async (dairyData) => {
  try {
    // Validate required fields
    if (!dairyData.dairy_name) {
      throw { error: 'Dairy name is required' };
    }

    if (!dairyData.dairy_address) {
      throw { error: 'Dairy address is required' };
    }

    if (!dairyData.rate_type || !ALLOWED_DAIRY_RATE_TYPES.includes(dairyData.rate_type)) {
      throw { error: `Invalid rate type. Must be one of: ${ALLOWED_DAIRY_RATE_TYPES.join(', ')}` };
    }

    const response = await api.put(`${ENDPOINTS.DAIRY_INFO}${dairyData.id}/`, dairyData);
    return response.data;
  } catch (error) {
    // Handle specific dairy information errors
    if (error.response?.data?.error) {
      throw { error: error.response.data.error };
    }
    throw error;
  }
};

// Add market milk price endpoints
export const getCurrentMarketPrice = async () => {
  try {
    const response = await api.get(ENDPOINTS.MARKET_PRICES);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const setMarketPrice = async (price) => {
  try {
    if (!price || price <= 0) {
      throw { error: 'Price must be greater than 0' };
    }
    const response = await api.post(ENDPOINTS.MARKET_PRICES, { price });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getRateChart = async () => {
  try {
    const response = await api.get(ENDPOINTS.MARKET_PRICES);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateRateChart = async (data) => {
  try {
    if (!data.currentRate || data.currentRate <= 0) {
      throw { error: 'Price must be greater than 0' };
    }
    const response = await api.post(ENDPOINTS.MARKET_PRICES, {
      price: data.currentRate
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Pro Rata Rate Chart endpoints
export const getProRataRateChart = async () => {
  try {
    const response = await api.get(ENDPOINTS.PRO_RATA_RATE_CHART);
    return response.data;
  } catch (error) {
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

export const upsertProRataRateChart = async (chartId, payload) => {
  try {
    if (chartId) {
      const response = await api.put(`${ENDPOINTS.PRO_RATA_RATE_CHART}${chartId}/`, payload);
      return response.data;
    }
    const response = await api.post(ENDPOINTS.PRO_RATA_RATE_CHART, payload);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Add customer management endpoints
export const getCustomers = async (params = {}) => {
  try {
    const response = await api.get(ENDPOINTS.CUSTOMERS, { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Fetch all customers across paginated results
export const getAllCustomers = async () => {
  try {
    let page = 1;
    const page_size = 200; // fetch in large chunks to reduce requests
    let allResults = [];
    while (true) {
      const response = await api.get(ENDPOINTS.CUSTOMERS, {
        params: { page, page_size },
      });
      const data = response.data || {};
      if (Array.isArray(data.results)) {
        allResults = allResults.concat(data.results);
      }
      if (!data.next) break;
      page += 1;
    }
    return { results: allResults };
  } catch (error) {
    throw error;
  }
};

export const createCustomer = async (customerData) => {
  try {
    // Validate phone number if provided
    if (customerData.phone && !/^\d{10}$/.test(customerData.phone)) {
      throw { error: 'Phone number must be exactly 10 digits' };
    }

    const response = await api.post(ENDPOINTS.CUSTOMERS, customerData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateCustomer = async (customerId, customerData) => {
  try {
    const response = await api.put(`${ENDPOINTS.CUSTOMERS}${customerId}/`, customerData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteCustomer = async (customerId) => {
  try {
    const response = await api.delete(`${ENDPOINTS.CUSTOMERS}${customerId}/`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Add dairy information endpoints
export const getDairyInfo = async () => {
  try {
    const response = await api.get(ENDPOINTS.DAIRY_INFO);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw { error: 'No dairy information found. Please set up your dairy first.' };
    }
    throw error;
  }
};

// Add wallet related functions
export const getWalletBalance = async () => {
  try {
    const response = await api.get(ENDPOINTS.WALLET);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw { error: 'Wallet not found. Please contact support.' };
    }
    throw error;
  }
};

export const addMoneyToWallet = async (amount) => {
  try {
    const response = await api.post(`${ENDPOINTS.WALLET}add_money/`, {
      amount: amount.toFixed(2) // Ensure 2 decimal places
    });

    // Extract data from response
    const { payment_link } = response.data;
    return {
      payment_link,
      amount
    };
  } catch (error) {
    if (error.response?.data?.detail) {
      throw { error: Object.values(error.response.data.detail).flat().join(', ') };
    }
    throw error;
  }
};

export const verifyPayment = async (paymentLinkId) => {
  try {
    const response = await api.post(`${ENDPOINTS.WALLET}verify_payment/`, {
      payment_link_id: paymentLinkId
    });

    // Extract status and message from response
    const { status, message, amount } = response.data;

    // If payment is already processed, consider it successful
    if (message?.includes('already processed')) {
      return {
        status: 'SUCCESS',
        amount: amount || 0
      };
    }

    return {
      status: status || 'PENDING',
      amount: amount ? parseFloat(amount) : 0
    };
  } catch (error) {
    if (error.response?.data?.detail) {
      throw { error: Object.values(error.response.data.detail).flat().join(', ') };
    }
    throw error;
  }
};

export const createCollection = async (collectionData) => {
  try {
    const response = await api.post(ENDPOINTS.COLLECTIONS, collectionData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateCollection = async (collectionId, collectionData) => {
  try {
    if (!collectionId) {
      throw new Error('Collection ID is required');
    }
    const response = await api.put(`${ENDPOINTS.COLLECTIONS}${collectionId}/`, collectionData);
    return response.data;
  } catch (error) {
    console.error('API Error:', error.response?.data || error);
    throw error;
  }
};

export const deleteCollection = async (collectionId) => {
  try {
    if (!collectionId) {
      throw new Error('Collection ID is required');
    }
    const response = await api.delete(`${ENDPOINTS.COLLECTIONS}${collectionId}/`);
    return response.data;
  } catch (error) {
    console.error('API Error:', error.response?.data || error);
    throw error;
  }
};

// Add collection report endpoints
export const getCollections = async (params = {}) => {
  try {
    const response = await api.get(ENDPOINTS.COLLECTIONS, {
      params: {
        page: params.page || 1,
        page_size: params.page_size || 50,
        ...params
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Purchase report collections
export const getPurchaseReportCollections = async (params = {}) => {
  try {
    const response = await api.get(`${ENDPOINTS.PURCHASES_REPORT_COLLECTIONS}`, {
      params: {
        page: params.page || 1,
        page_size: params.page_size || 50,
        ...params
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Purchase summary report collections
export const getPurchaseSummaryReportCollections = async (params) => {
  try {
    const { start_date, end_date } = params;
    const response = await api.get(ENDPOINTS.PURCHASE_SUMMARY_COLLECTIONS, {
      params: {
        start_date,
        end_date
      }
    });
    return response.data;
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
};

// Pro rata purchase report collections
export const getProRataPurchaseReportCollections = async (params = {}) => {
  try {
    const response = await api.get(`${ENDPOINTS.PRO_RATA_PURCHASE_REPORT_COLLECTIONS}`, {
      params: {
        page: params.page || 1,
        page_size: params.page_size || 50,
        ...params
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Pro rata purchase summary report collections
export const getProRataPurchaseSummaryReportCollections = async (params) => {
  try {
    const { start_date, end_date } = params;
    console.log('Calling pro rata purchase summary API with params:', { start_date, end_date });
    const response = await api.get(ENDPOINTS.PRO_RATA_PURCHASE_SUMMARY_DATA, {
      params: {
        start_date,
        end_date
      }
    });
    console.log('Pro rata purchase summary API response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Pro rata purchase summary API Error:', error.response?.data || error.message);
    throw error;
  }
};

// Helper function to format dates for report filenames
const formatDateForReportName = (dateString) => {
  // Parse date (handling different input formats)
  const dateParts = dateString.split(/[-/]/);
  let day, month, year;

  // Handle common formats (YYYY-MM-DD, MM-DD-YYYY, or DD-MM-YYYY)
  if (dateParts.length === 3) {
    // Assume format is YYYY-MM-DD or DD-MM-YYYY based on first part
    if (dateParts[0].length === 4) {
      // YYYY-MM-DD
      year = dateParts[0];
      month = parseInt(dateParts[1], 10);
      day = parseInt(dateParts[2], 10);
    } else {
      // DD-MM-YYYY or MM-DD-YYYY (assuming DD-MM-YYYY for international format)
      day = parseInt(dateParts[0], 10);
      month = parseInt(dateParts[1], 10);
      year = dateParts[2];
    }
  } else {
    // Fall back to original string if unexpected format
    return dateString;
  }

  // Add ordinal suffix to day
  const getOrdinalSuffix = (day) => {
    if (day > 3 && day < 21) return `${day}th`;
    switch (day % 10) {
      case 1: return `${day}st`;
      case 2: return `${day}nd`;
      case 3: return `${day}rd`;
      default: return `${day}th`;
    }
  };

  // Get month name
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Return formatted date: "1st March 25"
  return `${getOrdinalSuffix(day)}_${months[month - 1]}_${year.slice(-2)}`;
};

// Add report generation endpoint
export const generateFullReport = async (startDate, endDate) => {
  try {
    // Create a custom axios instance with a longer timeout specifically for report generation
    const reportApi = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 60000, // Increase timeout to 60 seconds for report generation
    });

    // Apply the same authorization header
    const token = await getToken();
    if (token) {
      reportApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    const response = await reportApi.get(`${ENDPOINTS.GENERATE_FULL_REPORT}?start_date=${startDate}&end_date=${endDate}`, { responseType: 'arraybuffer' });
    if (response.status === 200) {
      const pdfData = response.data;
      const fileName = `FULL_REPORT_${formatDateForReportName(startDate)}_to_${formatDateForReportName(endDate)}.pdf`;

      // Save PDF to app directory (fallback)
      const appFileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(appFileUri, arrayBufferToBase64(pdfData), { encoding: 'base64' });

      let publicFileUri = appFileUri; // Default fallback

      // Try to copy to Downloads folder for Android using cached permissions
      if (Platform.OS === 'android') {
        try {
          // Check if we have cached directory URI
          let directoryUri = await AsyncStorage.getItem('downloads_directory_uri');

          if (!directoryUri) {
            // Request permission first time only
            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted && permissions.directoryUri) {
              directoryUri = permissions.directoryUri;
              // Cache the directory URI for future use
              await AsyncStorage.setItem('downloads_directory_uri', directoryUri);
            }
          }

          if (directoryUri) {
            const publicFile = await FileSystem.StorageAccessFramework.createFileAsync(directoryUri, fileName, 'application/pdf');
            const fileContent = await FileSystem.readAsStringAsync(appFileUri, { encoding: 'base64' });
            await FileSystem.writeAsStringAsync(publicFile, fileContent, { encoding: 'base64' });
            console.log('PDF also saved to Downloads via SAF:', fileName);
            // Return the public file URI for direct opening
            publicFileUri = publicFile;
          }
        } catch (error) {
          console.log('Could not save to Downloads via SAF, keeping in app directory:', error);
          // Clear cached URI if it's no longer valid
          await AsyncStorage.removeItem('downloads_directory_uri');
        }
      }

      // Return both URIs - public for viewing, app for sharing
      return {
        viewUri: publicFileUri,
        shareUri: appFileUri
      };
    } else {
      throw new Error('Failed to generate report.');
    }
  } catch (error) {
    console.error('Error generating full report:', error);
    // Standardize error format for consistent handling
    if (error.message) {
      throw { error: error.message };
    }
    throw error;
  }
};

// Pro-Rata full report generation
export const generateProRataFullReport = async (startDate, endDate) => {
  try {
    const reportApi = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 60000,
    });

    const token = await getToken();
    if (token) {
      reportApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    const response = await reportApi.get(`${ENDPOINTS.PRO_RATA_FULL_REPORT}?start_date=${startDate}&end_date=${endDate}`, { responseType: 'arraybuffer' });
    if (response.status === 200) {
      const pdfData = response.data;
      const fileName = `PRO_RATA_FULL_REPORT_${formatDateForReportName(startDate)}_to_${formatDateForReportName(endDate)}.pdf`;

      // Save PDF to app directory (fallback)
      const appFileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(appFileUri, arrayBufferToBase64(pdfData), { encoding: 'base64' });

      let publicFileUri = appFileUri; // Default fallback

      // Try to copy to Downloads folder for Android using cached permissions
      if (Platform.OS === 'android') {
        try {
          // Check if we have cached directory URI
          let directoryUri = await AsyncStorage.getItem('downloads_directory_uri');

          if (!directoryUri) {
            // Request permission first time only
            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted && permissions.directoryUri) {
              directoryUri = permissions.directoryUri;
              // Cache the directory URI for future use
              await AsyncStorage.setItem('downloads_directory_uri', directoryUri);
            }
          }

          if (directoryUri) {
            const publicFile = await FileSystem.StorageAccessFramework.createFileAsync(directoryUri, fileName, 'application/pdf');
            const fileContent = await FileSystem.readAsStringAsync(appFileUri, { encoding: 'base64' });
            await FileSystem.writeAsStringAsync(publicFile, fileContent, { encoding: 'base64' });
            console.log('PDF also saved to Downloads via SAF:', fileName);
            // Return the public file URI for direct opening
            publicFileUri = publicFile;
          }
        } catch (error) {
          console.log('Could not save to Downloads via SAF, keeping in app directory:', error);
          // Clear cached URI if it's no longer valid
          await AsyncStorage.removeItem('downloads_directory_uri');
        }
      }

      // Return both URIs - public for viewing, app for sharing
      return {
        viewUri: publicFileUri,
        shareUri: appFileUri
      };
    } else {
      throw new Error('Failed to generate pro-rata full report.');
    }
  } catch (error) {
    console.error('Error generating pro-rata full report:', error);
    if (error.message) {
      throw { error: error.message };
    }
    throw error;
  }
};

// Pro-Rata purchase report generation
export const generateProRataPurchaseReport = async (startDate, endDate) => {
  try {
    const reportApi = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 60000,
    });

    const token = await getToken();
    if (token) {
      reportApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    const response = await reportApi.get(`${ENDPOINTS.PRO_RATA_GENERATE_PURCHASE_REPORT}?start_date=${startDate}&end_date=${endDate}`, { responseType: 'arraybuffer' });

    if (response.status === 200) {
      const pdfData = response.data;

      // Check if we actually received PDF data by looking at the magic bytes
      const pdfHeader = new Uint8Array(pdfData.slice(0, 4));
      const pdfMagic = String.fromCharCode(...pdfHeader);
      console.log('PDF Magic bytes:', pdfMagic, 'Should be: %PDF');

      if (!pdfMagic.startsWith('%PDF')) {
        console.error('Response is not a valid PDF file. First 100 bytes:', new Uint8Array(pdfData.slice(0, 100)));
        throw new Error('Server returned invalid PDF data. Please check the server response.');
      }

      const fileName = `PRO_RATA_PURCHASE_REPORT_${formatDateForReportName(startDate)}_to_${formatDateForReportName(endDate)}.pdf`;

      // Save PDF to app directory (fallback)
      const appFileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(appFileUri, arrayBufferToBase64(pdfData), { encoding: 'base64' });

      let publicFileUri = appFileUri; // Default fallback

      // Try to copy to Downloads folder for Android using cached permissions
      if (Platform.OS === 'android') {
        try {
          let directoryUri = await AsyncStorage.getItem('downloads_directory_uri');

          if (!directoryUri) {
            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted && permissions.directoryUri) {
              directoryUri = permissions.directoryUri;
              await AsyncStorage.setItem('downloads_directory_uri', directoryUri);
            }
          }

          if (directoryUri) {
            const publicFile = await FileSystem.StorageAccessFramework.createFileAsync(directoryUri, fileName, 'application/pdf');
            const fileContent = await FileSystem.readAsStringAsync(appFileUri, { encoding: 'base64' });
            await FileSystem.writeAsStringAsync(publicFile, fileContent, { encoding: 'base64' });
            console.log('PDF also saved to Downloads via SAF:', fileName);
            publicFileUri = publicFile;
          }
        } catch (error) {
          console.log('Could not save to Downloads via SAF, keeping in app directory:', error);
          await AsyncStorage.removeItem('downloads_directory_uri');
        }
      }

      return {
        viewUri: publicFileUri,
        shareUri: appFileUri
      };
    } else {
      throw new Error('Failed to generate pro-rata purchase report.');
    }
  } catch (error) {
    console.error('Error generating pro-rata purchase report:', error);
    if (error.message) {
      throw { error: error.message };
    }
    throw error;
  }
};

// Pro-Rata purchase summary report generation
export const generateProRataPurchaseSummaryReport = async (startDate, endDate) => {
  try {
    const reportApi = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 60000,
    });

    const token = await getToken();
    if (token) {
      reportApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    const response = await reportApi.get(`${ENDPOINTS.PRO_RATA_PURCHASE_SUMMARY_REPORT}?start_date=${startDate}&end_date=${endDate}`, { responseType: 'arraybuffer' });
    if (response.status === 200) {
      const pdfData = response.data;
      const fileName = `PRO_RATA_PURCHASE_SUMMARY_REPORT_${formatDateForReportName(startDate)}_to_${formatDateForReportName(endDate)}.pdf`;

      const appFileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(appFileUri, arrayBufferToBase64(pdfData), { encoding: 'base64' });

      let publicFileUri = appFileUri;

      if (Platform.OS === 'android') {
        try {
          let directoryUri = await AsyncStorage.getItem('downloads_directory_uri');

          if (!directoryUri) {
            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted && permissions.directoryUri) {
              directoryUri = permissions.directoryUri;
              await AsyncStorage.setItem('downloads_directory_uri', directoryUri);
            }
          }

          if (directoryUri) {
            const publicFile = await FileSystem.StorageAccessFramework.createFileAsync(directoryUri, fileName, 'application/pdf');
            const fileContent = await FileSystem.readAsStringAsync(appFileUri, { encoding: 'base64' });
            await FileSystem.writeAsStringAsync(publicFile, fileContent, { encoding: 'base64' });
            console.log('PDF also saved to Downloads via SAF:', fileName);
            publicFileUri = publicFile;
          }
        } catch (error) {
          console.log('Could not save to Downloads via SAF, keeping in app directory:', error);
          await AsyncStorage.removeItem('downloads_directory_uri');
        }
      }

      return {
        viewUri: publicFileUri,
        shareUri: appFileUri
      };
    } else {
      throw new Error('Failed to generate pro-rata purchase summary report.');
    }
  } catch (error) {
    console.error('Error generating pro-rata purchase summary report:', error);
    if (error.message) {
      throw { error: error.message };
    }
    throw error;
  }
};

// Pro-Rata customer report generation (single customer)
export const generateProRataCustomerReport = async (customerId, startDate, endDate) => {
  try {
    const reportApi = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 60000,
    });

    const token = await getToken();
    if (token) {
      reportApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    const response = await reportApi.get(`${ENDPOINTS.PRO_RATA_CUSTOMER_REPORT}?start_date=${startDate}&end_date=${endDate}&customer_ids=${encodeURIComponent(customerId)}`, { responseType: 'arraybuffer' });
    if (response.status === 200) {
      const pdfData = response.data;
      const fileName = `PRO_RATA_CUSTOMER_REPORT_${formatDateForReportName(startDate)}_to_${formatDateForReportName(endDate)}.pdf`;

      const appFileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(appFileUri, arrayBufferToBase64(pdfData), { encoding: 'base64' });

      let publicFileUri = appFileUri;

      if (Platform.OS === 'android') {
        try {
          let directoryUri = await AsyncStorage.getItem('downloads_directory_uri');

          if (!directoryUri) {
            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted && permissions.directoryUri) {
              directoryUri = permissions.directoryUri;
              await AsyncStorage.setItem('downloads_directory_uri', directoryUri);
            }
          }

          if (directoryUri) {
            const publicFile = await FileSystem.StorageAccessFramework.createFileAsync(directoryUri, fileName, 'application/pdf');
            const fileContent = await FileSystem.readAsStringAsync(appFileUri, { encoding: 'base64' });
            await FileSystem.writeAsStringAsync(publicFile, fileContent, { encoding: 'base64' });
            console.log('PDF also saved to Downloads via SAF:', fileName);
            publicFileUri = publicFile;
          }
        } catch (error) {
          console.log('Could not save to Downloads via SAF, keeping in app directory:', error);
          await AsyncStorage.removeItem('downloads_directory_uri');
        }
      }

      return {
        viewUri: publicFileUri,
        shareUri: appFileUri
      };
    } else {
      throw new Error('Failed to generate pro-rata customer report.');
    }
  } catch (error) {
    console.error('Error generating pro-rata customer report:', error);
    if (error.message) {
      throw { error: error.message };
    }
    throw error;
  }
};

// Full customer report
export const generateFullCustomerReport = async (startDate, endDate) => {
  try {
    // Create a custom axios instance with a longer timeout specifically for report generation
    const reportApi = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 60000, // Increase timeout to 60 seconds for report generation
    });

    // Apply the same authorization header
    const token = await getToken();
    if (token) {
      reportApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    const response = await reportApi.get(`${ENDPOINTS.GENERATE_FULL_CUSTOMER_REPORT}?start_date=${startDate}&end_date=${endDate}`, { responseType: 'arraybuffer' });
    if (response.status === 200) {
      const pdfData = response.data;
      const fileName = `FULL_CUSTOMER_REPORT_${formatDateForReportName(startDate)}_to_${formatDateForReportName(endDate)}.pdf`;

      const appFileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(appFileUri, arrayBufferToBase64(pdfData), { encoding: 'base64' });

      let publicFileUri = appFileUri;

      if (Platform.OS === 'android') {
        try {
          let directoryUri = await AsyncStorage.getItem('downloads_directory_uri');

          if (!directoryUri) {
            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted && permissions.directoryUri) {
              directoryUri = permissions.directoryUri;
              await AsyncStorage.setItem('downloads_directory_uri', directoryUri);
            }
          }

          if (directoryUri) {
            const publicFile = await FileSystem.StorageAccessFramework.createFileAsync(directoryUri, fileName, 'application/pdf');
            const fileContent = await FileSystem.readAsStringAsync(appFileUri, { encoding: 'base64' });
            await FileSystem.writeAsStringAsync(publicFile, fileContent, { encoding: 'base64' });
            console.log('PDF also saved to Downloads via SAF:', fileName);
            publicFileUri = publicFile;
          }
        } catch (error) {
          console.log('Could not save to Downloads via SAF, keeping in app directory:', error);
          await AsyncStorage.removeItem('downloads_directory_uri');
        }
      }

      return {
        viewUri: publicFileUri,
        shareUri: appFileUri
      };
    } else {
      throw new Error('Failed to generate report.');
    }
  } catch (error) {
    console.error('Error generating full customer report:', error);
    // Standardize error format for consistent handling
    if (error.message) {
      throw { error: error.message };
    }
    throw error;
  }
};

export const getCustomerCollections = async (customerId, params = {}) => {
  try {
    const response = await api.get(ENDPOINTS.COLLECTIONS, { params: { ...params, customer: customerId } });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const generateCustomerReport = async (customerId, dateFrom, dateTo) => {
  try {
    // Create a custom axios instance with a longer timeout specifically for report generation
    const reportApi = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 60000, // Increase timeout to 60 seconds for report generation
    });

    // Apply the same authorization header
    const token = await getToken();
    if (token) {
      reportApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    const response = await reportApi.get(`${ENDPOINTS.COLLECTIONS}generate_customer_report/`, {
      params: {
        start_date: dateFrom,
        end_date: dateTo,
        customer_ids: customerId.toString()
      },
      responseType: 'arraybuffer'  // Changed from 'blob' for consistency
    });

    if (response.status === 200) {
      const pdfData = response.data;
      const fileName = `CUSTOMER_REPORT_${formatDateForReportName(dateFrom)}_to_${formatDateForReportName(dateTo)}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      // Write the binary data using the efficient chunked approach
      await FileSystem.writeAsStringAsync(fileUri, arrayBufferToBase64(pdfData), { encoding: 'base64' });

      let publicFileUri = fileUri;

      if (Platform.OS === 'android') {
        try {
          let directoryUri = await AsyncStorage.getItem('downloads_directory_uri');

          if (!directoryUri) {
            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted && permissions.directoryUri) {
              directoryUri = permissions.directoryUri;
              await AsyncStorage.setItem('downloads_directory_uri', directoryUri);
            }
          }

          if (directoryUri) {
            const publicFile = await FileSystem.StorageAccessFramework.createFileAsync(directoryUri, fileName, 'application/pdf');
            const fileContent = await FileSystem.readAsStringAsync(fileUri, { encoding: 'base64' });
            await FileSystem.writeAsStringAsync(publicFile, fileContent, { encoding: 'base64' });
            console.log('PDF also saved to Downloads via SAF:', fileName);
            publicFileUri = publicFile;
          }
        } catch (error) {
          console.log('Could not save to Downloads via SAF, keeping in app directory:', error);
          await AsyncStorage.removeItem('downloads_directory_uri');
        }
      }

      return {
        viewUri: publicFileUri,
        shareUri: fileUri
      };
    } else {
      throw new Error('Failed to generate customer report.');
    }
  } catch (error) {
    console.error('Error generating customer report:', error);
    // Standardize error format for consistent handling
    if (error.message) {
      throw { error: error.message };
    }
    throw error;
  }
};

export const getWalletTransactions = async (params = {}) => {
  try {
    const response = await api.get(`${ENDPOINTS.WALLET_TRANSACTIONS}`, {
      params: {
        page: params.page || 1,
        page_size: params.page_size || 20,
        ...params
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Add purchase report generation endpoint
export const generatePurchaseReport = async (startDate, endDate) => {
  try {
    // Create a custom axios instance with a longer timeout specifically for report generation
    const reportApi = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 60000, // Increase timeout to 60 seconds for report generation
    });

    // Apply the same authorization header
    const token = await getToken();
    if (token) {
      reportApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    const response = await reportApi.get(`${ENDPOINTS.GENERATE_PURCHASE_REPORT}?start_date=${startDate}&end_date=${endDate}`, { responseType: 'arraybuffer' });
    if (response.status === 200) {
      const pdfData = response.data;
      const fileName = `PURCHASE_REPORT_${formatDateForReportName(startDate)}_to_${formatDateForReportName(endDate)}.pdf`;

      const appFileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(appFileUri, arrayBufferToBase64(pdfData), { encoding: 'base64' });

      let publicFileUri = appFileUri;

      if (Platform.OS === 'android') {
        try {
          let directoryUri = await AsyncStorage.getItem('downloads_directory_uri');

          if (!directoryUri) {
            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted && permissions.directoryUri) {
              directoryUri = permissions.directoryUri;
              await AsyncStorage.setItem('downloads_directory_uri', directoryUri);
            }
          }

          if (directoryUri) {
            const publicFile = await FileSystem.StorageAccessFramework.createFileAsync(directoryUri, fileName, 'application/pdf');
            const fileContent = await FileSystem.readAsStringAsync(appFileUri, { encoding: 'base64' });
            await FileSystem.writeAsStringAsync(publicFile, fileContent, { encoding: 'base64' });
            console.log('PDF also saved to Downloads via SAF:', fileName);
            publicFileUri = publicFile;
          }
        } catch (error) {
          console.log('Could not save to Downloads via SAF, keeping in app directory:', error);
          await AsyncStorage.removeItem('downloads_directory_uri');
        }
      }

      return {
        viewUri: publicFileUri,
        shareUri: appFileUri
      };
    } else {
      throw new Error('Failed to generate report.');
    }
  } catch (error) {
    console.error('Error generating purchase report:', error);
    // Standardize error format for consistent handling
    if (error.message) {
      throw { error: error.message };
    }
    throw error;
  }
};

// Add purchase summary report generation endpoint
export const generatePurchaseSummaryReport = async (startDate, endDate) => {
  try {
    // Create a custom axios instance with a longer timeout specifically for report generation
    const reportApi = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 60000, // Increase timeout to 60 seconds for report generation
    });

    // Apply the same authorization header
    const token = await getToken();
    if (token) {
      reportApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    const response = await reportApi.get(`${ENDPOINTS.GENERATE_PURCHASE_SUMMARY_REPORT}?start_date=${startDate}&end_date=${endDate}`, { responseType: 'arraybuffer' });
    if (response.status === 200) {
      const pdfData = response.data;
      const fileName = `PURCHASE_SUMMARY_REPORT_${formatDateForReportName(startDate)}_to_${formatDateForReportName(endDate)}.pdf`;

      const appFileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(appFileUri, arrayBufferToBase64(pdfData), { encoding: 'base64' });

      let publicFileUri = appFileUri;

      if (Platform.OS === 'android') {
        try {
          let directoryUri = await AsyncStorage.getItem('downloads_directory_uri');

          if (!directoryUri) {
            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted && permissions.directoryUri) {
              directoryUri = permissions.directoryUri;
              await AsyncStorage.setItem('downloads_directory_uri', directoryUri);
            }
          }

          if (directoryUri) {
            const publicFile = await FileSystem.StorageAccessFramework.createFileAsync(directoryUri, fileName, 'application/pdf');
            const fileContent = await FileSystem.readAsStringAsync(appFileUri, { encoding: 'base64' });
            await FileSystem.writeAsStringAsync(publicFile, fileContent, { encoding: 'base64' });
            console.log('PDF also saved to Downloads via SAF:', fileName);
            publicFileUri = publicFile;
          }
        } catch (error) {
          console.log('Could not save to Downloads via SAF, keeping in app directory:', error);
          await AsyncStorage.removeItem('downloads_directory_uri');
        }
      }

      return {
        viewUri: publicFileUri,
        shareUri: appFileUri
      };
    } else {
      throw new Error('Failed to generate report.');
    }
  } catch (error) {
    console.error('Error generating purchase summary report:', error);
    // Standardize error format for consistent handling
    if (error.message) {
      throw { error: error.message };
    }
    throw error;
  }
};

// Efficient function to convert ArrayBuffer to Base64 without stack overflow
const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let base64 = '';
  let i;

  for (i = 0; i < bytes.length; i += 3) {
    const byte1 = bytes[i];
    const byte2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const byte3 = i + 2 < bytes.length ? bytes[i + 2] : 0;

    const enc1 = byte1 >> 2;
    const enc2 = ((byte1 & 3) << 4) | (byte2 >> 4);
    const enc3 = ((byte2 & 15) << 2) | (byte3 >> 6);
    const enc4 = byte3 & 63;

    if (i + 1 >= bytes.length) {
      // One byte remaining
      base64 += base64Chars.charAt(enc1) + base64Chars.charAt(enc2) + '==';
    } else if (i + 2 >= bytes.length) {
      // Two bytes remaining
      base64 += base64Chars.charAt(enc1) + base64Chars.charAt(enc2) + base64Chars.charAt(enc3) + '=';
    } else {
      base64 += base64Chars.charAt(enc1) + base64Chars.charAt(enc2) + base64Chars.charAt(enc3) + base64Chars.charAt(enc4);
    }
  }

  return base64;
};

// Keep the existing blobToBase64 function for other uses
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result.split(',')[1]; // Get the Base64 part
      resolve(base64data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const checkDairyInfoExists = async () => {
  try {
    const response = await api.get(ENDPOINTS.DAIRY_INFO);
    return {
      exists: true,
      data: response.data
    };
  } catch (error) {
    if (error.response?.status === 404) {
      return {
        exists: false,
        data: null
      };
    }
    throw error;
  }
};

export const checkUserInfoExists = async () => {
  try {
    const response = await api.get(ENDPOINTS.USER_INFO);
    return {
      exists: Boolean(response.data && response.data.name && response.data.name.trim()), // Check if name exists and is not empty
      data: response.data
    };
  } catch (error) {
    if (error.response?.status === 404) {
      return {
        exists: false,
        data: null
      };
    }
    throw error;
  }
};

export const getUserInfo = async () => {
  try {
    const response = await api.get(ENDPOINTS.USER_INFO);
    return response.data;
  } catch (error) {
    console.error('Get User Info Error:', error.response?.data || error);
    throw error.response?.data || error;
  }
};

export const updateUserInfo = async (userData) => {
  try {
    const response = await api.put(ENDPOINTS.USER_INFO, userData);
    return response.data;
  } catch (error) {
    console.error('Update User Info Error:', error.response?.data || error);
    throw error.response?.data || error;
  }
};

export const getCollection = async (collectionId) => {
  try {
    if (!collectionId) {
      throw new Error('Collection ID is required');
    }
    console.log('Fetching collection with ID:', collectionId);
    const response = await api.get(`${ENDPOINTS.COLLECTIONS}${collectionId}`);
    return response.data;
  } catch (error) {
    console.error('API Error:', error.response?.data || error);
    throw error;
  }
};
