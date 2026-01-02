import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { useIsFocused, useNavigationState } from '@react-navigation/native';

const StatusBarManager = () => {
  const isFocused = useIsFocused();
  const navigationState = useNavigationState(state => state);

  const forceStatusBarUpdate = () => {
    StatusBar.setBarStyle('light-content', true);
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
