import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import { Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import VideoSplashScreen from './VideoSplashScreen';

const WelcomeScreen = ({ navigation }) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [showVideo, setShowVideo] = useState(true);

  useEffect(() => {
    if (!showVideo) {
      // Immediately check auth and navigate
      checkAuthAndNavigate();
    }
  }, [showVideo]);

  const checkAuthAndNavigate = async () => {
    try {
      const authToken = await AsyncStorage.getItem('@auth_token');
      
      if (authToken) {
        navigation.replace('Home');
      } else {
        // Always go to language selection before login
        navigation.replace('LanguageSelection', { fromFirstLaunch: true });
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      navigation.replace('LanguageSelection', { fromFirstLaunch: true });
    }
  };

  if (showVideo) {
    return <VideoSplashScreen onEnd={() => setShowVideo(false)} />;
  }

  // This view will be shown briefly during the transition
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.logoContainer}>
        <Icon name="beaker-outline" size={100} color="#0D47A1" />
        <Text style={styles.appName}>Dudhiya</Text>
      </View>
      
      <View style={styles.poweredByContainer}>
        <Text style={styles.poweredByText}>Powered by</Text>
        <Text style={styles.netpyText}>Netpy Technologies</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 50,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dhudiyaLogo: {
    width: Dimensions.get('window').width * 0.6,
    height: Dimensions.get('window').width * 0.6,
    marginBottom: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  poweredByContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  poweredByText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  netpyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
});

export default WelcomeScreen; 
