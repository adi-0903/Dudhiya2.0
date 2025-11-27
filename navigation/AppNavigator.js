import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import StatusBarManager from '../components/StatusBarManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getToken } from '../services/tokenStorage';
import WelcomeScreen from '../screens/WelcomeScreen';
import LanguageSelectionScreen from '../screens/LanguageSelectionScreen';
import LoginScreen from '../screens/LoginScreen';
import UserInfoScreen from '../screens/UserInfoScreen';
import HomeScreen from '../screens/HomeScreen';
import MoreOptionScreen from '../screens/MoreOptionsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ReferralScreen from '../screens/ReferralScreen';
import WalletScreen from '../screens/WalletScreen';
import CustomerScreen from '../screens/CustomerScreen';
import RateChartScreen from '../screens/RateChartScreen';
import CollectionScreen from '../screens/CollectionScreen';
import ReportScreen from '../screens/ReportScreen';
import CustomerReportScreen from '../screens/CustomerReportScreen';
import PaymentHistoryScreen from '../screens/PaymentHistoryScreen';
import GenerateFullReportScreen from '../screens/GenerateFullReportScreen';
import DairyInfoScreen from '../screens/DairyInfoScreen';
import GeneratePurchaseReportScreen from '../screens/GeneratePurchaseReportScreen';
import GeneratePurchaseSummaryReportScreen from '../screens/GeneratePurchaseSummaryReportScreen';
import WalletInfo from '../screens/WalletInfo';
import DairyInformationScreen from '../screens/AddDairyInformationScreen'; 
import MilkCalculator from '../screens/MilkCalculator';
import EditCollectionScreen from '../screens/EditCollectionScreen';
import GenerateFullCustomerReportScreen from '../screens/GenerateFullCustomerReportScreen';
import ProRataCollectionScreen from '../screens/ProRataCollectionScreen';
import EditProRataCollectionScreen from '../screens/EditProRataCollectionScreen';
import ProRataReportScreen from '../screens/ProRataReports/ReportScreen';
import GenerateProRataPurchaseReportScreen from '../screens/ProRataReports/GeneratePurchaseReportScreen';
import GenerateProRataPurchaseSummaryReportScreen from '../screens/ProRataReports/GeneratePurchaseSummaryReportScreen';
import GenerateProRataFullReportScreen from '../screens/ProRataReports/GenerateFullReportScreen';
import GenerateProRataFullCustomerReportScreen from '../screens/ProRataReports/GenerateFullCustomerReportScreen';
import CustomerProRataReportScreen from '../screens/ProRataReports/CustomerReportScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  // Remove the initialRoute state and logic
  // Always start with Welcome screen
  
  return (
    <NavigationContainer>
      <StatusBarManager />
      <Stack.Navigator 
        initialRouteName="Welcome"  // Always start with Welcome
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="UserInfo" component={UserInfoScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="MoreOptions" component={MoreOptionScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Referral" component={ReferralScreen} />
        <Stack.Screen name="Wallet" component={WalletScreen} />
        <Stack.Screen name="Customer" component={CustomerScreen} />
        <Stack.Screen name="RateChart" component={RateChartScreen} />
        <Stack.Screen name="Collection" component={CollectionScreen} />
        <Stack.Screen name="Report" component={ReportScreen} />
        <Stack.Screen name="CustomerReport" component={CustomerReportScreen} />
        <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
        <Stack.Screen name="GenerateFullReport" component={GenerateFullReportScreen} />
        <Stack.Screen name="GenerateFullCustomerReport" component={GenerateFullCustomerReportScreen} />
        <Stack.Screen name="DairyInfoScreen" component={DairyInfoScreen} />
        <Stack.Screen name="GeneratePurchaseReportScreen" component={GeneratePurchaseReportScreen} />
        <Stack.Screen name="GeneratePurchaseSummaryReportScreen" component={GeneratePurchaseSummaryReportScreen} />
        <Stack.Screen name="WalletInfo" component={WalletInfo} />
        <Stack.Screen name="AddDairyInformation" component={DairyInformationScreen} />
        <Stack.Screen name="MilkCalculator" component={MilkCalculator} /> 
        <Stack.Screen name="EditCollection" component={EditCollectionScreen} />
        <Stack.Screen name='ProRataCollectionScreen' component={ProRataCollectionScreen} />
        <Stack.Screen name='EditProRataCollectionScreen' component={EditProRataCollectionScreen} />
        <Stack.Screen name='ProRataReportScreen' component={ProRataReportScreen} />
        <Stack.Screen name='GenerateProRataPurchaseReportScreen' component={GenerateProRataPurchaseReportScreen} />
        <Stack.Screen name='GenerateProRataPurchaseSummaryReportScreen' component={GenerateProRataPurchaseSummaryReportScreen} />
        <Stack.Screen name='GenerateProRataFullReportScreen' component={GenerateProRataFullReportScreen} />
        <Stack.Screen name='GenerateProRataFullCustomerReportScreen' component={GenerateProRataFullCustomerReportScreen} />
        <Stack.Screen name='CustomerProRataReportScreen' component={CustomerProRataReportScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
