import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const HowToUseApp = ({ autoOpen = false }) => {
  const { t } = useTranslation();
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    if (autoOpen) {
      setShowOptionsModal(true);
    }
  }, [autoOpen]);

  const handleOpenOptions = () => {
    setShowOptionsModal(true);
  };

  const handleOptionPress = (topicKey) => {
    setSelectedTopic(topicKey);
    setShowVideoModal(true);
  };

  const closeVideoModal = async () => {
    try {
      await videoRef.current?.pauseAsync();
    } catch (e) {}
    setShowVideoModal(false);
    setSelectedTopic(null);
  };

  const getVideoTitle = () => {
    if (selectedTopic === 'collection') {
      return t('how to add collections');
    }
    if (selectedTopic === 'wallet') {
      return t('how to use wallet');
    }
    if (selectedTopic === 'reports') {
      return t('how to generate reports?');
    }
    return t('how to use this app?');
  };

  return (
    <>
      <View style={styles.howToContainer}>
        <TouchableOpacity
          style={[styles.linkButton, styles.howToButton]}
          onPress={handleOpenOptions}
        >
          <Icon name="play-circle" size={28} color="#0D47A1" />
          <Text style={[styles.linkText, styles.howToButtonText]}>
            {t('how to use this app?')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Options Modal */}
      <Modal
        visible={showOptionsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <TouchableOpacity
              style={styles.closeIconButton}
              onPress={() => setShowOptionsModal(false)}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>{t('how to use this app?')}</Text>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleOptionPress('collection')}
            >
              <Icon name="beaker-plus" size={24} color="#0D47A1" />
              <View style={styles.modalOptionContent}>
                <Text style={styles.modalOptionText}>{t('how to add collections')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleOptionPress('wallet')}
            >
              <Icon name="wallet" size={24} color="#0D47A1" />
              <View style={styles.modalOptionContent}>
                <Text style={styles.modalOptionText}>{t('how to use wallet')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleOptionPress('reports')}
            >
              <Icon name="file-document" size={24} color="#0D47A1" />
              <View style={styles.modalOptionContent}>
                <Text style={styles.modalOptionText}>{t('how to generate reports?')}</Text>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Video Modal */}
      <Modal
        visible={showVideoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeVideoModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeVideoModal}
        >
          <TouchableOpacity
            style={styles.howToModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <TouchableOpacity
              style={styles.closeIconButton}
              onPress={closeVideoModal}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>

            <Text style={styles.howToTitle}>{getVideoTitle()}</Text>
            <Video
              ref={videoRef}
              style={styles.howToVideo}
              source={require('../assets/Dudhiya-welcome.mp4')}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              isLooping={false}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  howToContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: -20,
    marginBottom: 15,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: '#0D47A1',
    elevation: 2,
    shadowColor: '#eeeeee',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  howToButton: {
    backgroundColor: 'transparent',
    elevation: 0,
    shadowColor: 'transparent',
  },
  linkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  howToButtonText: {
    color: '#0D47A1',
    fontSize: 16,
    fontWeight: '800',
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
  howToModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    width: '92%',
    maxWidth: 420,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    alignItems: 'center',
  },
  closeIconButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 8,
    zIndex: 1,
    alignSelf: 'flex-end',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0D47A1',
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    width: '100%',
    marginBottom: 10,
  },
  modalOptionContent: {
    marginLeft: 15,
    flex: 1,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
  },
  howToTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    marginTop: 10,
    textAlign: 'center',
  },
  howToVideo: {
    width: '100%',
    height: 370,
    borderRadius: 12,
    backgroundColor: '#000',
  },
});

export default HowToUseApp;
