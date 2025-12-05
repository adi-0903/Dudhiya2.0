import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useTranslation } from 'react-i18next';

const InternetConnectionAlert = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [isSlow, setIsSlow] = useState(false);
  const [visible, setVisible] = useState(false);
  const translateY = useRef(new Animated.Value(-120)).current;
  const { t } = useTranslation();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = Boolean(state.isConnected && state.isInternetReachable !== false);

      let slow = false;
      if (state.type === 'cellular') {
        const gen = state.details?.cellularGeneration;
        if (gen === '2g' || gen === '3g') {
          slow = true;
        }
      }

      if (!connected || slow) {
        setIsConnected(connected);
        setIsSlow(slow && connected);
        setVisible(true);
      } else {
        setIsConnected(true);
        setIsSlow(false);
        setVisible(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : -120,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [visible, translateY]);

  if (!visible) {
    return null;
  }

  const title = isConnected
    ? t('slow internet title')
    : t('no internet connection title');
  const message = isConnected
    ? t('slow internet message')
    : t('no internet connection message');

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 0 : 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 10,
  },
  card: {
    marginTop: Platform.OS === 'android' ? 40 : 60,
    backgroundColor: '#D32F2F',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    maxWidth: '95%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 12,
  },
});

export default InternetConnectionAlert;
