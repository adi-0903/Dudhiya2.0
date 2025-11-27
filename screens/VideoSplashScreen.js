import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Video } from 'expo-av';

const VideoSplashScreen = ({ onEnd }) => {
  return (
    <View style={styles.container}>
      <Video
        source={require('../assets/Dudhiya-welcome.mp4')}
        style={styles.video}
        resizeMode="cover"
        shouldPlay
        isMuted
        volume={0}
        isLooping={false}
        onPlaybackStatusUpdate={(status) => {
          if (status.didJustFinish) {
            onEnd();
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  video: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
});

export default VideoSplashScreen;
