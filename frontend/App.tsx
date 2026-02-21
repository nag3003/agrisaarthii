// SUCCESSFUL RESTORATION TEST
import React, { useEffect, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { View, Text, ActivityIndicator, Platform, ScrollView } from 'react-native';
import * as Linking from 'expo-linking';
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
import { AgriJobsScreen } from './src/screens/AgriJobsScreen';
import { VideosScreen } from './src/screens/VideosScreen';

const Stack = createNativeStackNavigator();
export const navigationRef = createNavigationContainerRef();

const AuthStack = ({ initialRoute = 'Login' as any }) => (
  <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
  </Stack.Navigator>
);

const AppStack = ({ role }) => {
  let initialRouteName = 'Home';

  if (role === 'worker') {
    initialRouteName = 'WorkerHome';
  } else if (role === 'landowner') {
    initialRouteName = 'LandownerHome';
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRouteName}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="WorkerHome" component={WorkerHome} />
      <Stack.Screen name="LandownerHome" component={LandownerHome} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Calculator" component={CalculatorScreen} />
      <Stack.Screen name="CalendarTodo" component={CalendarTodoScreen} />
      <Stack.Screen name="GovSchemes" component={GovSchemesScreen} />
      <Stack.Screen name="Machinery" component={MachineryScreen} />
      <Stack.Screen name="MarketPrice" component={MarketPriceScreen} />
      <Stack.Screen name="Weather" component={WeatherScreen} />
      <Stack.Screen name="SoilHealth" component={SoilHealthScreen} />
      <Stack.Screen name="CropDoctor" component={CropDoctorScreen} />
      <Stack.Screen name="AgriJobs" component={AgriJobsScreen} />
      <Stack.Screen name="Videos" component={VideosScreen} />
    </Stack.Navigator>
  );
};

const linking = {
  prefixes: [
    'https://nag3003.github.io/agrisaarthii',
    Linking.createURL('/'), // Localhost fallback
  ],
  config: {
    screens: {
      Login: '',
      Onboarding: 'onboarding',
      Home: 'home',
      WorkerHome: 'worker-home',
      LandownerHome: 'landowner-home',
      Profile: 'profile',
      Calculator: 'calculator',
      CalendarTodo: 'calendar',
      GovSchemes: 'schemes',
      Machinery: 'machinery',
      MarketPrice: 'market-price',
      Weather: 'weather',
      SoilHealth: 'soil-health',
      CropDoctor: 'crop-doctor',
      AgriJobs: 'jobs',
      Videos: 'videos',
    },
  },
};

function Main() {
  const { user, role, loading } = useAuth();
  // FORCE ONLINE TRUE for Web Debugging
  const [isOnline, setIsOnline] = useState(true);
  
  const [currentRouteName, setCurrentRouteName] = useState('Unknown');

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
        <Text style={{ marginTop: 20 }}>Loading Agri...</Text>
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
          linking={linking} 
          fallback={<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Loading Route...</Text></View>}
        >
        <StatusBar style="light" />
        {user ? (
          <AppStack role={role || 'farmer'} />
        ) : (
          <AuthStack key="login-stack" initialRoute="Login" />
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <ToastProvider>
            <Main />
          </ToastProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
