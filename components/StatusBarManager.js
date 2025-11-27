import React, { useEffect } from 'react';
import { StatusBar, Platform, NativeModules } from 'react-native';
import { useIsFocused, useNavigationState } from '@react-navigation/native';

const StatusBarManager = () => {
  const isFocused = useIsFocused();
  const navigationState = useNavigationState(state => state);

  const forceStatusBarUpdate = () => {
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#0D47A1', true);
      StatusBar.setBarStyle('light-content', true);
      
      const { MainActivity } = NativeModules;
      if (MainActivity?.setNavigationBarColor) {
        MainActivity.setNavigationBarColor('#0D47A1');
      }
    } else {
      StatusBar.setBarStyle('light-content', true);
    }
  };

  useEffect(() => {
    const timer = setTimeout(forceStatusBarUpdate, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (navigationState) {
      forceStatusBarUpdate();
    }
  }, [navigationState]);

  useEffect(() => {
    if (isFocused) {
      forceStatusBarUpdate();
    }
  }, [isFocused]);

  return null;
};

export default StatusBarManager;
