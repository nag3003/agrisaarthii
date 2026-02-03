import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Linking, Alert, Text, TouchableOpacity, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { logger } from './src/utils/logger';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// Initialize global error handling - DISABLED FOR DEBUGGING
// logger.initGlobalErrorHandling();

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ToastProvider } from './src/components/Toast';
import { LoginScreen } from './src/screens/LoginScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';

// --- RESTORED ALL EXPORTS ---
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
  // FORCE ONLINE TRUE for Web Debugging
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // FORCE ONLINE ON WEB to avoid false offline detection
    if (Platform.OS === 'web') {
      setIsOnline(true);
      return;
    }

    const unsubscribeNet = NetInfo.addEventListener(state => {
      const online = !!state.isConnected && !!state.isInternetReachable;
      setIsOnline(online);
    });
    return () => unsubscribeNet();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5FDF9' }}>
        <Text style={{ marginTop: 20 }}>Loading AgriSaarthi...</Text>
        <ActivityIndicator size="large" color="#27AE60" />
      </View>
    );
  }

  // Debug View if forced offline
  if (!isOnline && Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5FDF9', padding: 20 }}>
        <Text style={{ fontSize: 40, marginBottom: 20 }}>📡</Text>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' }}>No Internet Connection</Text>
        <Text style={{ color: '#666', textAlign: 'center', marginTop: 10 }}>
          Please check your network settings.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <NavigationContainer
        ref={navigationRef}
        linking={{
          prefixes: ['https://nag3003.github.io/agrisaarthii', 'agrisarathi://'],
          config: {
            screens: {
              Login: '',
              Onboarding: 'onboarding',
              Home: 'home',
              WorkerHome: 'worker-home',
              LandownerHome: 'landowner-home',
              Profile: 'profile',
              Calculator: 'calculator',
              Calendar: 'calendar',
              GovSchemes: 'schemes',
              Machinery: 'machinery',
              MarketPrice: 'market-price',
              Weather: 'weather',
              SoilHealth: 'soil-health',
              CropDoctor: 'crop-doctor',
            },
          },
        }}
        fallback={<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Loading Route...</Text></View>}
      >
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
    <ErrorBoundary>
      <View style={{ flex: 1 }}>
        <AuthProvider>
          <ToastProvider>
            <Main />
          </ToastProvider>
        </AuthProvider>
      </View>
    </ErrorBoundary>
  );
}
