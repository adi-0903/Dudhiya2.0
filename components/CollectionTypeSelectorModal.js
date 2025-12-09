import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getDairyInfo } from '../services/api';

const CollectionTypeSelectorModal = ({
  visible,
  onClose,
  onSelectStandard,
  onSelectProRata
}) => {
  const { t } = useTranslation();

  const [isFlatRateType, setIsFlatRateType] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const fetchRateType = async () => {
      try {
        const dairyInfo = await getDairyInfo();
        const rateType = dairyInfo?.rate_type;
        if (rateType === 'kg_only' || rateType === 'liters_only') {
          setIsFlatRateType(true);
        } else {
          setIsFlatRateType(false);
        }
      } catch (e) {
        // If we cannot fetch, keep Pro Rata enabled by default
      }
    };

    fetchRateType();
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={styles.cardContainer}
        >
          <View style={styles.cardHeader}>
            <View style={styles.headerIconContainer}>
              <Icon name="beaker-plus" size={26} color="#0D47A1" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>{t('add collection')}</Text>
              <Text style={styles.subtitle}>{t('collection')}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeIconButton}
            >
              <Icon name="close" size={22} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={onSelectStandard}
            >
              <View style={styles.optionIconContainer}>
                <Icon name="beaker-outline" size={24} color="#0D47A1" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>{t('standard collection label')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, isFlatRateType && styles.disabledOption]}
              disabled={isFlatRateType}
              onPress={() => {
                if (!isFlatRateType) {
                  onSelectProRata();
                }
              }}
            >
              <View style={[styles.optionIconContainer, styles.proRataIconBackground]}>
                <Icon name="beaker-plus-outline" size={24} color="#fff" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>{t('pro-rata label')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0D47A1',
  },
  subtitle: {
    fontSize: 12,
    color: '#607D8B',
    marginTop: 2,
  },
  closeIconButton: {
    padding: 4,
    marginLeft: 4,
  },
  optionsContainer: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  optionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#F5F7FB',
    marginHorizontal: 4,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  proRataIconBackground: {
    backgroundColor: '#0D47A1',
  },
  disabledOption: {
    opacity: 0.4,
  },
  optionTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  optionSubtitle: {
    fontSize: 12,
    color: '#607D8B',
    marginTop: 2,
  },
});

export default CollectionTypeSelectorModal;

