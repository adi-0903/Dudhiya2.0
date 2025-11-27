import { useEffect } from 'react';
import { Platform, NativeModules } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

export const useNavigationBarColor = () => {
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused || Platform.OS !== 'android') return;

    const { MainActivity } = NativeModules;
    if (MainActivity?.setNavigationBarColor) {
      MainActivity.setNavigationBarColor('#0D47A1')
        .catch(error => console.warn('Error setting navigation bar color:', error));
    }
  }, [isFocused]);
};
