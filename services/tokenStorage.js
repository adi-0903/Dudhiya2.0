import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@auth_token';

export const storeToken = async (token) => {
  try {
    if (!token) {
      throw new Error('Invalid token');
    }
    await AsyncStorage.setItem(TOKEN_KEY, token);
    const verifyToken = await AsyncStorage.getItem(TOKEN_KEY);
    if (verifyToken !== token) {
      throw new Error('Token verification failed');
    }
  } catch (error) {
    throw error;
  }
};

export const getToken = async () => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    return null;
  }
};

export const removeToken = async () => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    // Remove console.error('Error removing token:', error);
  }
}; 
