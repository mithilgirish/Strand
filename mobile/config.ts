import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEFAULT_API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.107:8000/api/v1';

export let API_BASE_URL = DEFAULT_API_BASE_URL;

export const initApiConfig = async () => {
  try {
    const saved = await AsyncStorage.getItem('API_BASE_URL');
    if (saved) {
      API_BASE_URL = saved;
    }
  } catch (e) {}
};

export const setApiBaseUrl = async (url: string) => {
  API_BASE_URL = url;
  try {
    await AsyncStorage.setItem('API_BASE_URL', url);
  } catch (e) {}
};
