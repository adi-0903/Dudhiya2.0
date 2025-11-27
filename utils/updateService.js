import VersionCheck from 'react-native-version-check';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import i18n from './i18n';

const UPDATE_CHECK_KEY = '@last_update_check';
const SKIP_VERSION_KEY = '@skip_version';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.elusifataehyung.MilkManagementApp';

// Testing configuration
const TESTING_MODE = false; // Set to true for testing, false for production
const SIMULATED_STORE_VERSION = '1.2.0'; // Simulate a newer version for testing

class UpdateService {
  // Check if we should perform an update check (daily limit)
  async shouldCheckForUpdates() {
    try {
      const lastCheck = await AsyncStorage.getItem(UPDATE_CHECK_KEY);
      if (!lastCheck) return true;
      
      const lastCheckDate = new Date(lastCheck);
      const today = new Date();
      const diffTime = Math.abs(today - lastCheckDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays >= 1; // Check daily
    } catch (error) {
      console.log('Error checking update frequency:', error);
      return true; // Default to checking if error
    }
  }

  // Check for updates on home screen (always check)
  async performHomeScreenUpdateCheck() {
    try {
      const updateInfo = await this.checkForUpdates(false);
      
      if (updateInfo && updateInfo.updateAvailable) {
        // Show update notification immediately on home screen
        this.showUpdateDialog(updateInfo);
      }
    } catch (error) {
      console.log('Error in home screen update check:', error);
    }
  }

  // Save the last update check timestamp
  async saveLastUpdateCheck() {
    try {
      await AsyncStorage.setItem(UPDATE_CHECK_KEY, new Date().toISOString());
    } catch (error) {
      console.log('Error saving update check timestamp:', error);
    }
  }

  // Check if user has skipped this version
  async hasSkippedVersion(version) {
    try {
      const skippedVersion = await AsyncStorage.getItem(SKIP_VERSION_KEY);
      return skippedVersion === version;
    } catch (error) {
      console.log('Error checking skipped version:', error);
      return false;
    }
  }

  // Save skipped version
  async skipVersion(version) {
    try {
      await AsyncStorage.setItem(SKIP_VERSION_KEY, version);
    } catch (error) {
      console.log('Error saving skipped version:', error);
    }
  }

  // Clear skipped version (when user updates)
  async clearSkippedVersion() {
    try {
      await AsyncStorage.removeItem(SKIP_VERSION_KEY);
    } catch (error) {
      console.log('Error clearing skipped version:', error);
    }
  }

  // Compare version strings (semantic versioning)
  compareVersions(version1, version2) {
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;
      
      if (v1part > v2part) return 1;
      if (v1part < v2part) return -1;
    }
    return 0;
  }

  // Get current app version with fallback methods
  getCurrentAppVersion() {
    const expoVersion = Constants.expoConfig?.version || Constants.manifest?.version;

    if (Constants.appOwnership !== 'standalone' && expoVersion) {
      return expoVersion;
    }

    try {
      const nativeVersion = Application.nativeApplicationVersion || Application.applicationVersion;
      if (nativeVersion) {
        return nativeVersion;
      }
    } catch (error) {
      console.log('Error reading native application version:', error);
    }

    try {
      const versionCheckVersion = VersionCheck.getCurrentVersion();
      if (versionCheckVersion) {
        return versionCheckVersion;
      }
    } catch (error) {
      console.log('Error getting current version via VersionCheck:', error);
    }

    return '1.0.5';
  }

  // Main update check function
  async checkForUpdates(showNoUpdateAlert = false) {
    try {
      // Get current app version with fallback
      const currentVersion = this.getCurrentAppVersion();
      
      if (!currentVersion) {
        throw new Error('Unable to determine current app version');
      }
      
      // Check Play Store version (or use simulated version for testing)
      let latestVersion;
      
      if (TESTING_MODE) {
        // Use simulated version for testing
        latestVersion = SIMULATED_STORE_VERSION;
        console.log('🧪 TESTING MODE: Using simulated store version:', latestVersion);
      } else {
        // Real Play Store check
        latestVersion = await VersionCheck.getLatestVersion({
          provider: 'playStore',
          packageName: 'com.elusifataehyung.MilkManagementApp',
          ignoreErrors: true
        });
      }

      console.log('Current version:', currentVersion);
      console.log('Latest version:', latestVersion);

      if (!latestVersion) {
        if (showNoUpdateAlert) {
          Alert.alert(
            i18n.t('update check failed'),
            i18n.t('unable to check for updates. please check your internet connection.'),
            [{ text: 'OK' }]
          );
        }
        return null;
      }

      // Compare versions
      const versionComparison = this.compareVersions(latestVersion, currentVersion);
      
      if (versionComparison > 0) {
        // New version available
        const hasSkipped = await this.hasSkippedVersion(latestVersion);
        
        return {
          updateAvailable: true,
          currentVersion,
          latestVersion,
          hasSkipped,
          playStoreUrl: PLAY_STORE_URL
        };
      } else {
        // App is up to date
        if (showNoUpdateAlert) {
          Alert.alert(
            i18n.t('update check failed'),
            i18n.t('your app is up to date!'),
            [{ text: 'OK' }]
          );
        }
        return {
          updateAvailable: false,
          currentVersion,
          latestVersion: currentVersion
        };
      }
    } catch (error) {
      console.log('Error checking for updates:', error);
      
      if (showNoUpdateAlert) {
        Alert.alert(
          i18n.t('update check failed'),
          i18n.t('unable to check for updates. please try again later.'),
          [{ text: 'OK' }]
        );
      }
      
      return null;
    }
  }

  // Show update dialog
  showUpdateDialog(updateInfo, onClose = null) {
    const { latestVersion, playStoreUrl } = updateInfo;
    
    Alert.alert(
      i18n.t('update available'),
      i18n.t('a new version (v{{version}}) of dudhiya is available on the play store. would you like to update now?', { version: latestVersion }),
      [
        {
          text: i18n.t('later'),
          onPress: () => {
            if (onClose) onClose();
          },
          style: 'cancel'
        },
        {
          text: i18n.t('update now'),
          onPress: () => {
            Linking.openURL(playStoreUrl);
            if (onClose) onClose();
          }
        }
      ]
    );
  }

  // Automatic update check (called on app launch)
  async performAutomaticUpdateCheck() {
    try {
      const shouldCheck = await this.shouldCheckForUpdates();
      if (!shouldCheck) return;

      const updateInfo = await this.checkForUpdates(false);
      await this.saveLastUpdateCheck();
      
      if (updateInfo && updateInfo.updateAvailable) {
        // Show non-intrusive update notification
        setTimeout(() => {
          this.showUpdateDialog(updateInfo);
        }, 2000); // Show after 2 seconds to not interrupt app launch
      }
    } catch (error) {
      console.log('Error in automatic update check:', error);
    }
  }

  // Manual update check (called from UI)
  async performManualUpdateCheck() {
    const updateInfo = await this.checkForUpdates(true);
    
    if (updateInfo && updateInfo.updateAvailable) {
      this.showUpdateDialog(updateInfo);
    }
    
    return updateInfo;
  }

  // Force update check (ignores daily limit)
  async forceUpdateCheck() {
    return await this.checkForUpdates(true);
  }

  // Testing utilities
  async resetTestingState() {
    // Clear all stored preferences for fresh testing
    await AsyncStorage.removeItem(UPDATE_CHECK_KEY);
    await AsyncStorage.removeItem(SKIP_VERSION_KEY);
    console.log('🧪 Testing state reset - cleared all update preferences');
  }

  // Test with different scenarios
  async testUpdateScenario(scenario = 'update_available') {
    if (!TESTING_MODE) {
      console.log('Testing mode is disabled. Enable TESTING_MODE to use this function.');
      return;
    }

    await this.resetTestingState();

    switch (scenario) {
      case 'update_available':
        console.log('🧪 Testing: Update Available scenario');
        return await this.checkForUpdates(true);
      
      case 'no_update':
        // Temporarily simulate same version
        const originalVersion = SIMULATED_STORE_VERSION;
        // This would need to be modified in the constants above
        console.log('🧪 Testing: No Update scenario (modify SIMULATED_STORE_VERSION to match current version)');
        return await this.checkForUpdates(true);
        
      case 'network_error':
        console.log('🧪 Testing: Network Error scenario');
        throw new Error('Simulated network error for testing');
        
      default:
        console.log('🧪 Available test scenarios: update_available, no_update, network_error');
    }
  }
}

export default new UpdateService();
