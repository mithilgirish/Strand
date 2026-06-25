import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

// Import Screens
import QrScanScreen from './screens/QrScanScreen';
import ChecklistScreen from './screens/ChecklistScreen';
import NcrLogScreen from './screens/NcrLogScreen';
import SyncStatusScreen from './screens/SyncStatusScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName="QrScan"
        screenOptions={{
          headerShown: false, // Custom header design inside screens
          contentStyle: { backgroundColor: '#10101E' },
        }}
      >
        <Stack.Screen name="QrScan" component={QrScanScreen} />
        <Stack.Screen name="Checklist" component={ChecklistScreen} />
        <Stack.Screen name="NcrLog" component={NcrLogScreen} />
        <Stack.Screen name="SyncStatus" component={SyncStatusScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
