import React, { useState, useRef, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Animated, View, Keyboard } from 'react-native';

// Import Screens
import QrScanScreen from './screens/QrScanScreen';
import ChecklistScreen from './screens/ChecklistScreen';
import NcrLogScreen from './screens/NcrLogScreen';
import SyncStatusScreen from './screens/SyncStatusScreen';
import ChatbotScreen from './screens/ChatbotScreen';
import SettingsScreen from './screens/SettingsScreen';
import DashboardsScreen from './screens/DashboardsScreen';
import BottomNavbar from './components/BottomNavbar';

const Stack = createNativeStackNavigator();

function MainTabs({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<'QrScan' | 'Chatbot' | 'SyncStatus' | 'Settings'>('QrScan');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(10);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      })
    ]).start();
  }, [activeTab]);

  return (
    <View style={{ flex: 1, backgroundColor: '#111111' }}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {activeTab === 'QrScan' && <QrScanScreen navigation={navigation} />}
        {activeTab === 'Chatbot' && <ChatbotScreen navigation={navigation} />}
        {activeTab === 'SyncStatus' && <SyncStatusScreen navigation={navigation} />}
        {activeTab === 'Settings' && <SettingsScreen navigation={navigation} />}
      </Animated.View>
      {!isKeyboardVisible && (
        <BottomNavbar activeTab={activeTab} onTabChange={setActiveTab} />
      )}
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName="MainTabs"
        screenOptions={{
          headerShown: false, // Custom header design inside screens
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Checklist" component={ChecklistScreen} />
        <Stack.Screen name="NcrLog" component={NcrLogScreen} />
        <Stack.Screen name="SyncStatus" component={SyncStatusScreen} />
        <Stack.Screen name="Chatbot" component={ChatbotScreen} options={{ title: 'Brain Agent' }} />
        <Stack.Screen name="Dashboards" component={DashboardsScreen} options={{ title: 'Dashboards' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
