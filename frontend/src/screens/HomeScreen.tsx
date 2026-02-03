import React, { useState, useEffect, memo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  AppState,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';

import { VoiceRecordButton } from '../components/VoiceRecordButton';
import { OfflineIndicator } from '../components/OfflineIndicator';
import { TopicCard } from '../components/TopicCard';

import {
  sendVoice,
  getAdvice,
  checkHealth,
  getSensors,
  controlMotor,
  getPredictiveAlerts,
  diagnoseCrop,
} from '../services/api';

import { Storage } from '../services/storage';
import { AuthService } from '../services/auth';
import { ProfileService, UserProfile } from '../services/profile';
import { useAuth } from '../context/AuthContext';

/* ----------------------------------------
   MEMO COMPONENTS
---------------------------------------- */
const MemoTopicCard = memo(TopicCard);

/* ----------------------------------------
   MAIN SCREEN
---------------------------------------- */
export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [farmer, setFarmer] = useState<UserProfile | null>(null);
  const [weather, setWeather] = useState({ temp: 30, condition: 'Sunny' });
  const [iotStatus, setIotStatus] = useState<any>(null);
  const [predictiveAlerts, setPredictiveAlerts] = useState<any[]>([]);
  const [isBackendDown, setIsBackendDown] = useState(false);
  const [processingVoice, setProcessingVoice] = useState(false);
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState(true);

  const [lastAdvice, setLastAdvice] = useState<any>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);

  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<any>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  /* ----------------------------------------
     LOAD DATA
  ---------------------------------------- */
  useEffect(() => {
    const loadData = async () => {
      // Load Profile
      if (user) {
        const profile = await ProfileService.getProfile(user.uid);
        if (profile) setFarmer(profile);
      }
    };

    loadData();
  }, [user]);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout? Your tasks and preferences are safely synced to your account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await logout();
            } catch (error) {
              console.error('Logout Error:', error);
              Alert.alert('Error', 'An unexpected error occurred during logout');
            } finally {
              setLoggingOut(false);
            }
          }
        }
      ]
    );
  };

  /* ----------------------------------------
     HEALTH + SYNC (OPTIMIZED)
  ---------------------------------------- */
  useEffect(() => {
    let interval: any;

    const checkStatus = async () => {
      const health = await checkHealth();
      const offline = health.status !== 'ok';
      setIsBackendDown(offline);

      if (!offline) {
        try {
          const sensors = await getSensors();
          setIotStatus(sensors);

          if (sensors.current_temp) {
            setWeather(prev => ({ ...prev, temp: sensors.current_temp }));
          }

          const alerts = await getPredictiveAlerts();
          setPredictiveAlerts(alerts);
        } catch { }
      }
    };

    checkStatus();
    interval = setInterval(checkStatus, 30000);

    const appSub = AppState.addEventListener('change', state => {
      if (state !== 'active') clearInterval(interval);
    });

    return () => {
      clearInterval(interval);
      appSub.remove();
    };
  }, []);

  /* ----------------------------------------
     VOICE QUERY HANDLER
  ---------------------------------------- */
  const handleVoiceQuery = async (uri: string) => {
    setProcessingVoice(true);
    try {
      const result = await sendVoice(uri);
      if (!result.text) return;

      setLastQuestion(result.text);

      const adviceRes = await getAdvice(result.text, {
        crop: farmer?.primaryCrop,
        landSize: farmer?.landSize,
        irrigation: farmer?.irrigationType,
        risk: farmer?.riskLevel,
      });

      setLastAdvice(adviceRes.advice);
      await Storage.cacheAdvice(result.text, adviceRes.advice.advice);

      if (isVoiceOutputEnabled && adviceRes.advice.advice) {
        Speech.stop();
        Speech.speak(adviceRes.advice.advice, {
          language: 'en',
          pitch: 1.0,
          rate: 0.9,
        });
      }

    } catch {
      Alert.alert('AI Error', 'Unable to process voice right now.');
    } finally {
      setProcessingVoice(false);
    }
  };

  /* ----------------------------------------
     CROP DOCTOR
  ---------------------------------------- */
  const pickImage = async (from: 'camera' | 'gallery') => {
    let result: any;

    if (from === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return;
      result = await ImagePicker.launchCameraAsync({
        quality: 0.5,
        exif: false,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.5,
        exif: false,
      });
    }

    if (!result.canceled) {
      setDiagnosing(true);
      try {
        const res = await diagnoseCrop(result.assets[0].uri);
        setDiagnosisResult({ ...res, image: result.assets[0].uri });
      } finally {
        setDiagnosing(false);
      }
    }
  };

  /* ----------------------------------------
     PRIORITY ALERT
  ---------------------------------------- */
  const priorityAlert =
    predictiveAlerts.find(a => a.crop === farmer?.primaryCrop) ||
    predictiveAlerts[0];

  const handleTopicPress = (topic: any) => {
    if (topic.id === '1') { // Crop Doctor
      navigation.navigate('CropDoctor');
    } else if (topic.id === '2') { // Soil
      navigation.navigate('SoilHealth');
    } else if (topic.id === '3') { // Weather
      navigation.navigate('Weather');
    } else if (topic.id === '4') { // Market
      navigation.navigate('MarketPrice');
    } else {
      Alert.alert(topic.title, `Opening ${topic.title}...`);
    }
  };

  /* ----------------------------------------
     UI
  ---------------------------------------- */
  return (
    <SafeAreaView style={styles.container}>


      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.logo}>🌿 AGRISAARTHI</Text>
          <View style={styles.headerIcons}>

            <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
              {farmer?.photoURL ? (
                <Image source={{ uri: farmer.photoURL }} style={styles.profileAvatar} />
              ) : (
                <Ionicons name="person-circle-outline" size={40} color="#27AE60" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* PRIORITY CARD */}
        {priorityAlert && (
          <View style={styles.priorityCard}>
            <View style={styles.priorityHeader}>
              <Ionicons name="alert-circle" size={20} color="#27AE60" />
              <Text style={styles.priorityLabel}>TODAY’S PRIORITY</Text>
            </View>
            <Text style={styles.priorityTitle}>{priorityAlert.title}</Text>
            <Text style={styles.priorityDesc}>{priorityAlert.message}</Text>
            <TouchableOpacity style={styles.priorityAction}>
              <Text style={styles.priorityActionText}>Take Action</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* HERO */}
        <View style={styles.hero}>
          <TouchableOpacity
            style={styles.heroProfileLink}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.heroTitle}>
              {farmer ? `Hello ${farmer.name}` : 'Hello'}
            </Text>
            <Text style={styles.heroSub}>
              {farmer
                ? `Your ${farmer.primaryCrop} assistant is ready`
                : 'Your AI Agri Assistant is ready'}
            </Text>
          </TouchableOpacity>

          <VoiceRecordButton
            onRecordingComplete={handleVoiceQuery}
            isProcessing={processingVoice}
          />
        </View>

        {/* WEATHER & IOT WIDGET */}
        <View style={styles.weatherWidget}>
          <View style={styles.weatherInfo}>
            <Ionicons
              name={weather.condition.toLowerCase().includes('sunny') ? 'sunny' : 'cloudy'}
              size={48}
              color="#F1C40F"
            />
            <View style={{ marginLeft: 15 }}>
              <Text style={styles.weatherTemp}>{weather.temp}°C</Text>
              <Text style={styles.weatherCond}>{weather.condition}</Text>
            </View>
          </View>
          <View style={styles.iotInfo}>
            <View style={styles.iotItem}>
              <Ionicons name="water" size={16} color="#3498DB" />
              <Text style={styles.iotText}>Humidity: {iotStatus?.humidity || 65}%</Text>
            </View>
            <View style={styles.iotItem}>
              <Ionicons name="thermometer" size={16} color="#E67E22" />
              <Text style={styles.iotText}>Soil: {iotStatus?.soil_moisture || 40}%</Text>
            </View>
          </View>
        </View>

        {/* --- Tools Section --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Essential Tools</Text>
          <View style={styles.toolsGrid}>
            <TouchableOpacity
              style={styles.toolItem}
              onPress={() => navigation.navigate('Calculator')}
            >
              <View style={[styles.toolIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="calculator" size={24} color="#1976D2" />
              </View>
              <Text style={styles.toolLabel}>Calculator</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolItem}
              onPress={() => navigation.navigate('Calendar')}
            >
              <View style={[styles.toolIcon, { backgroundColor: '#F3E5F5' }]}>
                <Ionicons name="calendar" size={24} color="#7B1FA2" />
              </View>
              <Text style={styles.toolLabel}>Tasks</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolItem}
              onPress={() => navigation.navigate('GovSchemes')}
            >
              <View style={[styles.toolIcon, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="document-text" size={24} color="#F57C00" />
              </View>
              <Text style={styles.toolLabel}>Schemes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolItem}
              onPress={() => navigation.navigate('Machinery')}
            >
              <View style={[styles.toolIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="construct" size={24} color="#388E3C" />
              </View>
              <Text style={styles.toolLabel}>Machinery</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* IOT STATUS (NEW) */}
        {iotStatus && (
          <View style={styles.iotCard}>
            <View style={styles.iotRow}>
              <View>
                <Text style={styles.iotValue}>{iotStatus.current_value}%</Text>
                <Text style={styles.iotLabel}>Soil Moisture</Text>
              </View>
              <View style={styles.divider} />
              <View>
                <Text style={styles.iotValue}>{weather.temp}°C</Text>
                <Text style={styles.iotLabel}>Temp</Text>
              </View>
              <View style={styles.divider} />
              <TouchableOpacity
                style={[styles.motorBtn, iotStatus.motor_status === 'TURN_ON' && styles.motorOn]}
                onPress={() => controlMotor(iotStatus.motor_status === 'TURN_ON' ? 'OFF' : 'ON')}
              >
                <Ionicons name="water" size={24} color={iotStatus.motor_status === 'TURN_ON' ? '#FFF' : '#27AE60'} />
                <Text style={[styles.motorText, iotStatus.motor_status === 'TURN_ON' && styles.motorOnText]}>
                  {iotStatus.motor_status === 'TURN_ON' ? 'STOP' : 'START'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* LAST ADVICE / QUESTION */}
        {(lastQuestion || lastAdvice) && (
          <View style={styles.memoryCard}>
            <View style={styles.memoryHeader}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color="#AAA" />
              <Text style={styles.memoryLabel}>Recent Interaction</Text>
            </View>
            {lastQuestion && <Text style={styles.memoryText}>"{lastQuestion}"</Text>}
            {lastAdvice && (
              <View style={styles.adviceBox}>
                <Text style={styles.adviceText}>{lastAdvice.advice}</Text>
              </View>
            )}
          </View>
        )}



        {/* MARKET SNAPSHOT */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Market Snapshot</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MarketPrice')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.marketSnapshot}>
            <View style={styles.marketMiniCard}>
              <Text style={styles.marketMiniLabel}>Wheat</Text>
              <Text style={styles.marketMiniPrice}>₹2,350</Text>
              <View style={[styles.miniTrend, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="trending-up" size={12} color="#27AE60" />
                <Text style={[styles.miniTrendText, { color: '#27AE60' }]}>+2.4%</Text>
              </View>
            </View>
            <View style={styles.marketMiniCard}>
              <Text style={styles.marketMiniLabel}>Rice</Text>
              <Text style={styles.marketMiniPrice}>₹4,800</Text>
              <View style={[styles.miniTrend, { backgroundColor: '#FFEBEE' }]}>
                <Ionicons name="trending-down" size={12} color="#FF5252" />
                <Text style={[styles.miniTrendText, { color: '#FF5252' }]}>-1.2%</Text>
              </View>
            </View>
            <View style={styles.marketMiniCard}>
              <Text style={styles.marketMiniLabel}>Soyabean</Text>
              <Text style={styles.marketMiniPrice}>₹4,450</Text>
              <View style={[styles.miniTrend, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="trending-up" size={12} color="#27AE60" />
                <Text style={[styles.miniTrendText, { color: '#27AE60' }]}>+0.8%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* TOPICS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse Topics</Text>
          <View style={styles.grid}>
            {TOPICS.map(t => (
              <MemoTopicCard key={t.id} {...t} onPress={() => handleTopicPress(t)} />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* SIRI FAB */}
      <TouchableOpacity
        style={styles.fabMic}
        onPress={() => Alert.alert('AgriSaarthi', 'I am listening... Tap the large mic above to speak.')}
      >
        <Ionicons name="mic" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* DIAGNOSIS MODAL */}
      <Modal visible={diagnosing || !!diagnosisResult} transparent>
        <View style={styles.modal}>
          <View style={styles.modalBox}>
            {diagnosing ? (
              <Text style={{ color: '#27AE60' }}>Analyzing image…</Text>
            ) : (
              <>
                <Image source={{ uri: diagnosisResult?.image }} style={{ height: 200 }} />
                <Text style={styles.modalTitle}>{diagnosisResult?.diagnosis}</Text>
                <Text style={styles.modalText}>{diagnosisResult?.remedy}</Text>
                <TouchableOpacity onPress={() => setDiagnosisResult(null)}>
                  <Text style={styles.done}>Done</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* LOGOUT OVERLAY */}
      {loggingOut && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Logging out...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

/* ----------------------------------------
   CONSTANTS
---------------------------------------- */
const TOPICS = [
  { id: '1', title: 'Crop Doctor', description: 'AI disease detection', icon: '📸', iconName: 'camera' },
  { id: '2', title: 'Soil Health', description: 'Soil nutrients', icon: '🌱', iconName: 'leaf' },
  { id: '3', title: 'Weather', description: 'Forecast & risks', icon: '☁️', iconName: 'partly-sunny' },
  { id: '4', title: 'Market', description: 'Live prices', icon: '📈', iconName: 'trending-up' },
];

/* ----------------------------------------
   STYLES
---------------------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5FDF9' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(39, 174, 96, 0.05)',
  },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  voiceToggle: {
    marginRight: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  voiceToggleActive: {
    backgroundColor: '#F5FDF9',
    borderColor: 'rgba(39, 174, 96, 0.2)',
  },
  logoutBtn: {
    marginRight: 15,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FFF5F5',
  },
  profileBtn: {
    marginLeft: 5,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(39, 174, 96, 0.2)',
  },
  weatherWidget: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 24,
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(39, 174, 96, 0.05)',
  },
  weatherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherTemp: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  weatherCond: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  iotInfo: {
    alignItems: 'flex-end',
  },
  iotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  iotText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  logo: { color: '#27AE60', fontSize: 20, fontWeight: 'bold' },

  priorityCard: {
    margin: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'white',
    borderColor: 'rgba(39, 174, 96, 0.1)',
    borderWidth: 1,
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  priorityHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  priorityLabel: { color: '#27AE60', fontSize: 12, marginLeft: 6, fontWeight: 'bold' },
  priorityTitle: { color: '#1A1A1A', fontSize: 18, fontWeight: 'bold' },
  priorityDesc: { color: '#666', marginVertical: 6 },
  priorityAction: {
    backgroundColor: '#27AE60',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  priorityActionText: { color: 'white', fontWeight: 'bold' },

  hero: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#E8F5E9',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
  },
  heroProfileLink: { alignItems: 'center', marginBottom: 20 },
  heroTitle: { color: '#1A1A1A', fontSize: 26, fontWeight: 'bold' },
  heroSub: { color: '#666', fontSize: 16 },

  iotCard: {
    margin: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'rgba(39, 174, 96, 0.1)',
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  iotRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iotValue: { color: '#1A1A1A', fontSize: 22, fontWeight: 'bold' },
  iotLabel: { color: '#666', fontSize: 13 },
  divider: { width: 1, height: 40, backgroundColor: 'rgba(39, 174, 96, 0.1)' },
  motorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5FDF9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#27AE60',
  },
  motorOn: { backgroundColor: '#27AE60' },
  motorText: { color: '#27AE60', fontWeight: 'bold', marginLeft: 6 },
  motorOnText: { color: '#FFF' },

  memoryCard: {
    margin: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'rgba(39, 174, 96, 0.1)',
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  memoryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  memoryLabel: { color: '#666', fontSize: 13, marginLeft: 6 },
  memoryText: { color: '#1A1A1A', fontStyle: 'italic', fontSize: 15 },
  adviceBox: {
    marginTop: 14,
    padding: 16,
    backgroundColor: '#F5FDF9',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#27AE60',
  },
  adviceText: { color: '#333', fontSize: 15, lineHeight: 22 },

  section: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  seeAll: {
    color: '#27AE60',
    fontSize: 14,
    fontWeight: '600',
  },
  marketSnapshot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  marketMiniCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 16,
    width: '30%',
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(39, 174, 96, 0.05)',
  },
  marketMiniLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  marketMiniPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  miniTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  miniTrendText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 2,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  toolsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  toolItem: {
    alignItems: 'center',
    width: '22%',
  },
  toolIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  toolLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },

  fabMic: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#27AE60',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },

  modal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '90%',
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: { color: '#1A1A1A', fontSize: 20, fontWeight: 'bold' },
  modalText: { color: '#666', marginVertical: 12, fontSize: 16, lineHeight: 24 },
  done: { color: '#27AE60', textAlign: 'center', marginTop: 16, fontWeight: 'bold', fontSize: 18 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingText: {
    color: '#27AE60',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
