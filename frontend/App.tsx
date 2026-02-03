import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Linking, Alert, Text, TouchableOpacity } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { logger } from './src/utils/logger';

// Initialize global error handling
logger.initGlobalErrorHandling();

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ToastProvider } from './src/components/Toast';
import { LoginScreen } from './src/screens/LoginScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { WorkerHome } from './src/screens/WorkerHome';
import { LandownerHome } from './src/screens/LandownerHome';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { CalculatorScreen } from './src/screens/CalculatorScreen';
import { CalendarTodoScreen } from './src/screens/CalendarTodoScreen';
import { GovSchemesScreen } from './src/screens/GovSchemesScreen';
import { MachineryScreen } from './src/screens/MachineryScreen';
import { MarketPriceScreen } from './src/screens/MarketPriceScreen';
import { WeatherScreen } from './src/screens/WeatherScreen';
import { SoilHealthScreen } from './src/screens/SoilHealthScreen';
import { CropDoctorScreen } from './src/screens/CropDoctorScreen';

const Stack = createNativeStackNavigator();
export const navigationRef = createNavigationContainerRef();

// --- Auth Stack ---
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
  </Stack.Navigator>
);

// --- App Stack ---
const AppStack = ({ role }: { role: string }) => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    {role === 'worker' ? (
      <Stack.Screen name="WorkerHome" component={WorkerHome} />
    ) : role === 'landowner' ? (
      <Stack.Screen name="LandownerHome" component={LandownerHome} />
    ) : (
      <Stack.Screen name="Home" component={HomeScreen} />
    )}
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="Calculator" component={CalculatorScreen} />
    <Stack.Screen name="Calendar" component={CalendarTodoScreen} />
    <Stack.Screen name="GovSchemes" component={GovSchemesScreen} />
    <Stack.Screen name="Machinery" component={MachineryScreen} />
    <Stack.Screen name="MarketPrice" component={MarketPriceScreen} />
    <Stack.Screen name="Weather" component={WeatherScreen} />
    <Stack.Screen name="SoilHealth" component={SoilHealthScreen} />
    <Stack.Screen name="CropDoctor" component={CropDoctorScreen} />
  </Stack.Navigator>
);

function Main() {
  const { user, role, loading } = useAuth();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribeNet = NetInfo.addEventListener(state => {
      const online = !!state.isConnected && !!state.isInternetReachable;
      setIsOnline(online);
    });
    return () => unsubscribeNet();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#F5FDF9' }}>
        <ActivityIndicator size="large" color="#27AE60" />
      </View>
    );
  }

  if (!isOnline) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5FDF9', padding: 20 }}>
        <View style={{
          backgroundColor: 'white',
          padding: 30,
          borderRadius: 24,
          alignItems: 'center',
          width: '100%',
          maxWidth: 400,
          shadowColor: '#27AE60',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.1,
          shadowRadius: 20,
          elevation: 5,
          borderWidth: 1,
          borderColor: 'rgba(39, 174, 96, 0.1)'
        }}>
          <Text style={{ fontSize: 60, marginBottom: 20 }}>📡</Text>
          <Text style={{ color: '#1A1A1A', fontSize: 24, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' }}>
            Connection Lost
          </Text>
          <Text style={{ color: '#666', fontSize: 16, textAlign: 'center', marginBottom: 32, lineHeight: 24 }}>
            AgriSaarthi needs the internet to help you. Please check your connection and try again.
          </Text>
          <TouchableOpacity
            onPress={() => NetInfo.refresh()}
            style={{
              backgroundColor: '#27AE60',
              paddingVertical: 16,
              paddingHorizontal: 40,
              borderRadius: 14,
              width: '100%',
              alignItems: 'center'
            }}
          >
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <StatusBar style="light" />
        {user ? (
          <AppStack role={role || 'farmer'} />
        ) : (
          <AuthStack />
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Main />
      </ToastProvider>
    </AuthProvider>
  );
}
