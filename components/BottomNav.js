import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Keyboard, Platform } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

const BottomNav = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
  
  return (
    <View style={[
      styles.bottomMenu,
      keyboardVisible && { display: 'none' }  // Hide when keyboard is visible
    ]}>
      <TouchableOpacity 
        style={styles.menuItem}
        onPress={() => navigation.navigate('Home')}
      >
        <Icon name="home" size={28} color="#0D47A1" />
        <Text style={styles.menuText}>{t('home')}</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.menuItem, styles.addButton]}
        onPress={() => navigation.navigate('Collection')}
      >
        <View style={styles.addButtonInner}>
          <Icon name="plus" size={32} color="#fff" />
        </View>
        <Text style={styles.menuText}>{t('add collection')}</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.menuItem}
        onPress={() => navigation.navigate('MoreOptions')}
      >
        <Icon name="dots-horizontal-circle" size={31} color="#0D47A1" />
        <Text style={styles.menuText}>{t('more')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomMenu: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  menuItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  menuText: {
    color: '#0D47A1',
    fontSize: 12,
    marginTop: 5,
  },
  addButton: {
    marginTop: -25,
  },
  addButtonInner: {
    backgroundColor: '#0D47A1',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export default BottomNav; 