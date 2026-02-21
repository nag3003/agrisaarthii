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
import { ImagePickerService } from '../services/imagePicker';
import { SpeechService } from '../services/speech';
// import * as ImagePicker from 'expo-image-picker';
// import * as Speech from 'expo-speech';

import { VoiceRecordButton } from '../components/VoiceRecordButton';
import { OfflineIndicator } from '../components/OfflineIndicator';
import { TopicCard } from '../components/TopicCard';
import { Logo } from '../components/Logo';

import {
  sendVoice,
  getAdvice,
  checkHealth,
  getSensors,
  controlMotor,
  getPredictiveAlerts,
  diagnoseCrop,
  getMarketPrices,
  getLocationData,
  askJarvis,
} from '../services/api';

import { Storage } from '../services/storage';
import { db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore/lite';
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
import { LocationService } from '../services/location';
import { processLocalCommand } from '../utils/voiceCommandHelper';
import { VoiceAssistant } from '../components/VoiceAssistant';
import { AppView } from '../types';

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, logout, role } = useAuth();
  const [farmer, setFarmer] = useState<UserProfile | null>(null);
  const [weather, setWeather] = useState({ temp: 30, condition: 'Sunny', humidity: 65, wind_speed: 12 });
  const [locationName, setLocationName] = useState('Loading...');
  const [iotStatus, setIotStatus] = useState<any>(null);
  const [predictiveAlerts, setPredictiveAlerts] = useState<any[]>([]);
  const [isBackendDown, setIsBackendDown] = useState(false);
  const [processingVoice, setProcessingVoice] = useState(false);
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState(true);
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);

  const [lastAdvice, setLastAdvice] = useState<any>(null);
  const [displayedAdviceText, setDisplayedAdviceText] = useState<string>(''); // For streaming text effect
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const [listeningText, setListeningText] = useState<string>('');

  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<any>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [marketPrices, setMarketPrices] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);

  /* ----------------------------------------
     LOAD DATA
  ---------------------------------------- */
  useEffect(() => {
    const loadData = async () => {
      // 1. Load Profile & Real-time Location/Weather
      try {
        if (user) {
          const profile = await ProfileService.getProfile(user.uid);
          if (profile) {
            setFarmer(profile);
          }
        }

        const gps = await LocationService.getCurrentLocation();
        if (gps) {
          try {
            const unifiedData = await getLocationData(gps.lat, gps.lon);
            
            // Update Location Name (District, State)
            if (unifiedData && unifiedData.location) {
              const dist = unifiedData.location.district || 'Your';
              const st = unifiedData.location.state || 'Location';
              setLocationName(`${dist}, ${st}`);
            } else {
              // Fallback to reverse geocode if unified fails
              const geo = await LocationService.getReverseGeocode(gps.lat, gps.lon);
              setLocationName(geo.district ? `${geo.district}, ${geo.state}` : 'Near You');
            }

            // Update Weather Data
            if (unifiedData && unifiedData.weather) {
              setWeather({
                temp: unifiedData.weather.temperature || 30,
                condition: unifiedData.weather.description || 'Clear',
                humidity: unifiedData.weather.humidity || 60,
                wind_speed: unifiedData.weather.wind_speed || 10
              });
            }

            // 2. Fetch Market Prices (Unified + Top Crops)
            const crops = ['Wheat', 'Rice', 'Soyabean'];
            const marketResults = [];
            
            if (unifiedData && unifiedData.market && !unifiedData.market.message) {
               marketResults.push({
                 crop: unifiedData.market.commodity || 'Crop',
                 avg_price: unifiedData.market.modal_price && unifiedData.market.modal_price !== '0' ? unifiedData.market.modal_price : '2450',
                 trend: Math.random() > 0.5 ? 'up' : 'down'
               });
            }

            const currentDistrict = unifiedData?.location?.district || 'India';
            const missingCrops = crops.filter(c => !marketResults.find(m => m.crop === c));
            
            if (missingCrops.length > 0) {
              try {
                const extraResults = await Promise.all(
                  missingCrops.map(crop => getMarketPrices(crop, currentDistrict).catch(() => ({ crop, avg_price: "2400", trend: "stable" })))
                );
                
                marketResults.push(...extraResults.map((r, i) => ({
                  crop: r.crop || missingCrops[i],
                  avg_price: r.avg_price && r.avg_price !== '0' ? r.avg_price : (missingCrops[i] === 'Wheat' ? '2350' : missingCrops[i] === 'Rice' ? '4800' : '4450'),
                  trend: r.trend === 'stable' ? (Math.random() > 0.5 ? 'up' : 'down') : r.trend
                })));
              } catch (err) {
                console.warn('Extra market fetch failed', err);
              }
            }
            
            setMarketPrices(marketResults.slice(0, 3));

            // 3. Fetch Todos for Summary
            if (user) {
              if (user.uid.startsWith('demo_')) {
                const stored = await Storage.getItem('user_todos');
                if (stored) setTodos(JSON.parse(stored).filter((t: any) => !t.completed).slice(0, 2));
              } else {
                const q = query(collection(db, 'users', user.uid, 'todos'), where('completed', '==', false));
                const snapshot = await getDocs(q);
                const activeTodos = snapshot.docs.map(doc => doc.data()).slice(0, 2);
                setTodos(activeTodos);
              }
            }
          } catch (apiErr) {
            console.error('Unified API fetch failed:', apiErr);
            // Partial fallback
            const geo = await LocationService.getReverseGeocode(gps.lat, gps.lon);
            setLocationName(geo.district ? `${geo.district}, ${geo.state}` : 'Near You');
          }
        } else {
          setLocationName('GPS Disabled');
        }
      } catch (err) {
        console.error('Data load failed:', err);
        setLocationName('Near You');
      }
    };

    loadData();
    
    // Add an event listener for profile updates if possible, or just re-run on focus
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });

    return unsubscribe;
  }, [user, navigation]);

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

  const handleSpeech = async (text: string) => {
    try {
      const speaking = await SpeechService.isSpeakingAsync();
      if (speaking) {
        await SpeechService.stop();
      } else {
        // Map user language code to speech locale
        const langMap: Record<string, string> = {
          'hi': 'hi-IN',
          'te': 'te-IN',
          'ta': 'ta-IN',
          'en': 'en-IN'
        };
        const locale = langMap[farmer?.language || 'hi'] || 'hi-IN';
        
        // Use streaming text for Siri-like effect
        setDisplayedAdviceText(''); 
        
        SpeechService.speak(text, {
          language: locale,
          pitch: 1.05,
          rate: 1.0,
          onBoundary: (event: any) => {
            if (event.name === 'word') {
                const charIndex = event.charIndex + (event.charLength || 0);
                setDisplayedAdviceText(text.substring(0, charIndex + 1));
            }
          },
          onDone: () => setDisplayedAdviceText(text)
        });
      }
    } catch (e) {
      console.error("Speech error", e);
    }
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
  const handleVoiceCommand = (text: string) => {
    return processLocalCommand(text, {
      navigation,
      language: farmer?.language || 'hi',
      isVoiceOutputEnabled,
      onLogout: handleLogout,
      role
    });
  };

  const processQuery = async (text: string) => {
    if (!text) return;
    setLastQuestion(text);

    const adviceRes = await getAdvice(text, {
      crop: farmer?.primaryCrop,
      landSize: farmer?.landSize,
      irrigation: farmer?.irrigationType,
      risk: farmer?.riskLevel,
      language: farmer?.language || 'hi', // Pass user language to backend
    });

    if (adviceRes && adviceRes.advice) {
      console.log('[HomeScreen] Received advice:', adviceRes.advice);
      setLastAdvice(adviceRes.advice);
      await Storage.cacheAdvice(text, adviceRes.advice.advice);

      if (isVoiceOutputEnabled && adviceRes.advice.advice) {
        console.log('[HomeScreen] Triggering voice output...');
        await SpeechService.stop();
        
        const adviceText = adviceRes.advice.advice;
        
        if (!adviceText) {
          console.warn('[HomeScreen] Advice text is empty, skipping voice output');
          return;
        }
        
        // Use streaming text logic
        setDisplayedAdviceText('');
        SpeechService.speak(adviceText, {
          language: farmer?.language || 'hi',
          pitch: 1.05,
          rate: 1.0,
          onBoundary: (event: any) => {
             if (event.name === 'word') {
                 const charIndex = event.charIndex + (event.charLength || 0);
                 setDisplayedAdviceText(adviceText.substring(0, charIndex + 1));
             }
          },
          onDone: () => setDisplayedAdviceText(adviceText)
        });
      } else {
        // If voice disabled, show full text immediately
        setDisplayedAdviceText(adviceRes.advice.advice);
      }
    } else {
      throw new Error('No advice received');
    }
  };

  const handleVoiceQuery = async (uri: string) => {
    // Prime speech service immediately on user gesture to avoid browser blocking
    if (isVoiceOutputEnabled) {
      SpeechService.speak("", { volume: 0 }); 
    }
    
    setProcessingVoice(true);
    try {
      const result = await sendVoice(uri);
        
        // If result is null or text is empty, handle gracefully
        const recognizedText = result?.text;
        
        if (!recognizedText) {
            console.warn('Voice Query: No text recognized');
            Alert.alert('Did not catch that', 'Please try speaking again clearly.');
            setProcessingVoice(false);
            return;
        }
        
        setListeningText(recognizedText);
      
      // Check for local navigation commands first
      if (handleVoiceCommand(recognizedText)) {
        setListeningText('');
        setProcessingVoice(false);
        return;
      }

      // Use Jarvis for voice queries
      const res = await askJarvis(recognizedText);
      setListeningText(''); // Clear query so answer shows

      if (res && res.response) {
        const jarvisAdvice = {
          advice: res.response,
          confidence: 100,
          reasoning: "Jarvis AI Assistant",
          id: `jarvis-${Date.now()}`
        };
        setLastAdvice(jarvisAdvice);
        
        if (isVoiceOutputEnabled) {
           // Reset for streaming
           setDisplayedAdviceText('');
           SpeechService.speak(res.response, {
             language: farmer?.language || 'hi',
             pitch: 1.05,
             rate: 1.0,
             onBoundary: (event: any) => {
                if (event.name === 'word') {
                    const charIndex = event.charIndex + (event.charLength || 0);
                    setDisplayedAdviceText(res.response.substring(0, charIndex + 1));
                }
             },
             onDone: () => setDisplayedAdviceText(res.response)
           });
        } else {
           setDisplayedAdviceText(res.response);
        }
      }
    } catch (err: any) {
      console.error('Voice Query Error:', err);
      Alert.alert('AI Error', 'Unable to process voice right now. Please check your connection or try again.');
    } finally {
      setProcessingVoice(false);
    }
  };

  const handleVoiceText = async (text: string) => {
    // Prime speech service immediately
    if (isVoiceOutputEnabled) {
      SpeechService.speak("", { volume: 0 }); 
    }

    setProcessingVoice(true);
    setListeningText(text); // Show final text
    try {
      // Check for local navigation commands first
      if (handleVoiceCommand(text)) {
        setListeningText('');
        setProcessingVoice(false);
        return;
      }

      // Use Jarvis for voice queries (Siri-like experience)
      const res = await askJarvis(text);
      setListeningText(''); // Clear query so answer shows
      
      if (res && res.response) {
        // Map Jarvis string response to advice object format for UI compatibility
        const jarvisAdvice = {
          advice: res.response,
          confidence: 100,
          reasoning: "Jarvis AI Assistant",
          id: `jarvis-${Date.now()}`
        };
        setLastAdvice(jarvisAdvice);
        
        if (isVoiceOutputEnabled) {
           SpeechService.speak(res.response, {
             language: farmer?.language || 'hi',
             pitch: 1.0,
             rate: 0.9,
           });
        }
      }
    } catch (err: any) {
      console.error('Voice Text Error:', err);
      Alert.alert('AI Error', 'Unable to process voice command.');
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
      const { status } = await ImagePickerService.requestCameraPermissionsAsync();
      if (status !== 'granted') return;
      result = await ImagePickerService.launchCameraAsync({
        quality: 0.5,
        allowsEditing: false, // exif: false is not in standard types sometimes, keeping it simple
      });
    } else {
      result = await ImagePickerService.launchImageLibraryAsync({
        quality: 0.5,
        allowsEditing: false,
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
    } else if (topic.id === 'jobs') { // AgriJobs
      navigation.navigate('AgriJobs');
    } else if (topic.id === 'videos') { // Videos
      navigation.navigate('Videos');
    } else {
      Alert.alert(topic.title, `Opening ${topic.title}...`);
    }
  };

  /* ----------------------------------------
     UI
  ---------------------------------------- */
  return (
    <SafeAreaView style={styles.container}>


      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
        style={{ flex: 1 }}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Logo 
            containerStyle={{ position: 'absolute', left: 0, right: 0, zIndex: -1 }}
            iconSize={22}
            textStyle={{ fontSize: 18 }}
          />
          <View style={{ flex: 1 }} />
          <View style={styles.headerIcons}>
            <TouchableOpacity 
              style={[styles.voiceToggle, isVoiceOutputEnabled && styles.voiceToggleActive]} 
              onPress={() => {
                const newState = !isVoiceOutputEnabled;
                setIsVoiceOutputEnabled(newState);
                if (newState) {
                  SpeechService.speak("Voice output enabled", { language: 'en-US' });
                } else {
                  SpeechService.stop();
                }
              }}
            >
              <Ionicons 
                name={isVoiceOutputEnabled ? "volume-high" : "volume-mute"} 
                size={22} 
                color={isVoiceOutputEnabled ? "#27AE60" : "#666"} 
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text 
                style={styles.headerUserName} 
                numberOfLines={1} 
                ellipsizeMode="tail"
              >
                {(farmer?.name || user?.displayName || 'User').split(' ')[0]}
              </Text>
              {farmer?.photoURL ? (
                <Image source={{ uri: farmer.photoURL }} style={styles.profileAvatar} />
              ) : (
                <Ionicons name="person-circle-outline" size={32} color="#27AE60" />
              )}
            </View>
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
              {farmer?.name || user?.displayName ? `Hello ${farmer?.name || user?.displayName}` : 'Hello Farmer'}
            </Text>
            <Text style={styles.heroSub}>
              {farmer?.primaryCrop
                ? `Your ${farmer.primaryCrop} assistant is ready`
                : 'Your AI Agri Assistant is ready'}
            </Text>
          </TouchableOpacity>

          <VoiceRecordButton
            onRecordingComplete={handleVoiceQuery}
            onSpeechEnd={handleVoiceText}
            onSpeechPartial={(text) => setListeningText(text)}
            onSpeechStart={() => {
               setListeningText('');
               setLastAdvice(null);
            }}
            isProcessing={processingVoice}
            size={110}
            language={farmer?.language === 'hi' ? 'hi-IN' : 'en-US'}
          />
          {listeningText ? (
            <View style={{ marginTop: 20, paddingHorizontal: 20, width: '100%', alignItems: 'center' }}>
              <Text style={{ fontSize: 18, color: '#333', textAlign: 'center', fontWeight: '500' }}>
                {listeningText}
              </Text>
            </View>
          ) : lastAdvice && (
            <View style={{ marginTop: 20, paddingHorizontal: 20, width: '100%', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontStyle: 'italic', color: '#555', textAlign: 'center' }}>
                "{displayedAdviceText || lastAdvice.advice}"
              </Text>
            </View>
          )}
        </View>

        {/* WEATHER & IOT WIDGET */}
        <View style={styles.weatherWidget}>
          <View style={styles.weatherInfo}>
            <Ionicons
              name={weather.condition.toLowerCase().includes('sunny') || weather.condition.toLowerCase().includes('clear') ? 'sunny' : 'cloudy'}
              size={48}
              color="#F1C40F"
            />
            <View style={{ marginLeft: 15 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.weatherTemp}>{weather.temp}°C</Text>
                <Text style={[styles.weatherCond, { marginLeft: 10, fontSize: 14, color: '#666' }]}>{locationName}</Text>
              </View>
              <Text style={[styles.weatherCond, { textTransform: 'capitalize' }]}>{weather.condition}</Text>
            </View>
          </View>
          <View style={styles.iotInfo}>
            <View style={styles.iotItem}>
              <Ionicons name="water" size={16} color="#3498DB" />
              <Text style={styles.iotText}>Humidity: {weather.humidity || 65}%</Text>
            </View>
            <View style={styles.iotItem}>
              <Ionicons name="leaf" size={16} color="#27AE60" />
              <Text style={styles.iotText}>Wind: {weather.wind_speed || 0} km/h</Text>
            </View>
          </View>
        </View>

        {/* CROP HEALTH INSIGHTS (ENHANCED) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Crop Health Insights</Text>
          <View style={styles.healthCard}>
            <View style={styles.healthMain}>
              <View style={[styles.healthBadge, { backgroundColor: (iotStatus?.status === 'optimal' || !iotStatus) ? '#E8F5E9' : '#FFF3E0' }]}>
                <Ionicons 
                  name={(iotStatus?.status === 'optimal' || !iotStatus) ? "checkmark-circle" : "warning"} 
                  size={24} 
                  color={(iotStatus?.status === 'optimal' || !iotStatus) ? "#2E7D32" : "#E65100"} 
                />
                <Text style={[styles.healthStatus, { color: (iotStatus?.status === 'optimal' || !iotStatus) ? "#2E7D32" : "#E65100" }]}>
                  {(iotStatus?.status === 'optimal' || !iotStatus) ? "Healthy" : "Needs Attention"}
                </Text>
              </View>
              <Text style={styles.healthCropText}>
                {farmer?.primaryCrop ? `Current status of your ${farmer.primaryCrop} crop` : "Update your profile to see crop insights"}
              </Text>
            </View>
            <View style={styles.healthStats}>
              <View style={styles.healthStatItem}>
                <Text style={styles.healthStatLabel}>Moisture</Text>
                <Text style={styles.healthStatValue}>{iotStatus?.current_value || 45}%</Text>
              </View>
              <View style={styles.healthStatItem}>
                <Text style={styles.healthStatLabel}>Soil Temp</Text>
                <Text style={styles.healthStatValue}>{weather.temp - 2}°C</Text>
              </View>
              <View style={styles.healthStatItem}>
                <Text style={styles.healthStatLabel}>Next Check</Text>
                <Text style={styles.healthStatValue}>6 PM</Text>
              </View>
            </View>
          </View>
        </View>

        {/* --- Tools Section --- */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Essential Tools</Text>
            {todos.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('CalendarTodo')}>
                 <Text style={[styles.seeAll, { color: '#7B1FA2' }]}>{todos.length} Pending</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {todos.length > 0 && (
            <View style={styles.todoSummary}>
               {todos.map((todo, idx) => (
                 <TouchableOpacity 
                   key={idx} 
                   style={styles.todoMiniItem}
                   onPress={() => navigation.navigate('CalendarTodo')}
                 >
                   <View style={[styles.priorityDot, { backgroundColor: todo.priority === 'high' ? '#FF5252' : todo.priority === 'medium' ? '#F57C00' : '#27AE60' }]} />
                   <Text style={styles.todoMiniText} numberOfLines={1}>{todo.text}</Text>
                   <Text style={styles.todoMiniDate}>{todo.date.split('-').slice(1).join('/')}</Text>
                 </TouchableOpacity>
               ))}
            </View>
          )}

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
              onPress={() => navigation.navigate('CalendarTodo')}
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

        {/* LAST ADVICE / QUESTION (ENHANCED CHATBOT UI) */}
        {(lastQuestion || lastAdvice) && (
          <View style={styles.chatSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>AI Assistant</Text>
              <TouchableOpacity onPress={() => { setLastQuestion(null); setLastAdvice(null); }}>
                <Text style={styles.seeAll}>Clear</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.chatContainer}>
              {lastQuestion && (
                <View style={styles.userBubble}>
                  <Text style={styles.userText}>{lastQuestion}</Text>
                  <Ionicons name="person" size={12} color="#666" style={{ marginLeft: 8, alignSelf: 'flex-end' }} />
                </View>
              )}
              {lastAdvice && (
                <View style={styles.aiBubble}>
                  <View style={styles.aiHeader}>
                    <Logo iconSize={14} textStyle={{ fontSize: 12 }} />
                    <TouchableOpacity onPress={() => handleSpeech(lastAdvice.advice || lastAdvice)}>
                      <Ionicons name="volume-high" size={16} color="#27AE60" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.aiText}>{displayedAdviceText || lastAdvice.advice || lastAdvice}</Text>
                  <View style={styles.aiActions}>
                    <TouchableOpacity style={styles.aiActionBtn} onPress={() => Alert.alert('Action', 'Applying recommendation...')}>
                      <Text style={styles.aiActionText}>Apply Now</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.aiActionBtnSecondary} onPress={() => navigation.navigate('CalendarTodo')}>
                      <Text style={styles.aiActionTextSecondary}>Remind Me</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
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
            {marketPrices.length > 0 ? marketPrices.map((item, index) => (
              <View key={index} style={styles.marketMiniCard}>
                <Text style={styles.marketMiniLabel}>{item.crop}</Text>
                <Text style={styles.marketMiniPrice}>₹{item.avg_price}</Text>
                <View style={[styles.miniTrend, { backgroundColor: item.trend === 'up' ? '#E8F5E9' : '#FFEBEE' }]}>
                  <Ionicons 
                    name={item.trend === 'up' ? "trending-up" : "trending-down"} 
                    size={12} 
                    color={item.trend === 'up' ? "#27AE60" : "#FF5252"} 
                  />
                  <Text style={[styles.miniTrendText, { color: item.trend === 'up' ? "#27AE60" : "#FF5252" }]}>
                    {item.trend === 'up' ? '+2.4%' : '-1.2%'}
                  </Text>
                </View>
              </View>
            )) : (
              <>
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
              </>
            )}
          </View>
        </View>

        {/* SEASONAL TIP (NEW) */}
        <View style={styles.section}>
          <View style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <Ionicons name="bulb" size={20} color="#F1C40F" />
              <Text style={styles.tipTitle}>Seasonal Tip</Text>
            </View>
            <Text style={styles.tipText}>
              {weather.temp > 35 
                ? "Extreme heat detected. Ensure light irrigation in the evening to protect roots from heat stress."
                : weather.humidity > 80
                ? "High humidity increases fungal risk. Check leaf undersides for white spots."
                : "Perfect weather for top-dressing! Apply Urea or NPK for better vegetative growth."}
            </Text>
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

      {/* SIRI FAB - REMOVED AS PER USER REQUEST */}
      {/* <View style={styles.fabMic}>
        <VoiceRecordButton
          onRecordingComplete={handleVoiceQuery}
          onSpeechEnd={handleVoiceText}
          onSpeechPartial={(text) => setListeningText(text)}
          onSpeechStart={() => {
             setListeningText('');
             setLastAdvice(null);
          }}
          isProcessing={processingVoice}
          size={56}
          showLabel={false}
          language={farmer?.language === 'hi' ? 'hi-IN' : 'en-US'}
        />
      </View> */}

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

      <VoiceAssistant
        visible={showVoiceAssistant}
        onBack={() => setShowVoiceAssistant(false)}
        onNavigate={(view) => navigation.navigate(view)}
        profile={farmer}
      />
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
  { id: 'jobs', title: 'AgriJobs', description: 'Find work/labor', icon: '💼', iconName: 'briefcase' },
  { id: 'videos', title: 'Videos', description: 'Farming Tips', icon: '🎥', iconName: 'videocam' },
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
  headerUserName: {
    marginRight: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    maxWidth: 80,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  healthCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(39, 174, 96, 0.1)',
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  healthMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 12,
  },
  healthStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  healthCropText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  healthStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(39, 174, 96, 0.05)',
  },
  healthStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  healthStatLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  healthStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
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

  chatSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  chatContainer: {
    marginTop: 8,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderBottomRightRadius: 4,
    maxWidth: '85%',
    flexDirection: 'row',
    marginBottom: 12,
  },
  userText: {
    color: '#1A1A1A',
    fontSize: 15,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 20,
    borderTopLeftRadius: 4,
    maxWidth: '90%',
    borderWidth: 1,
    borderColor: 'rgba(39, 174, 96, 0.1)',
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiText: {
    color: '#333',
    fontSize: 15,
    lineHeight: 22,
  },
  aiActions: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(39, 174, 96, 0.05)',
  },
  aiActionBtn: {
    backgroundColor: '#27AE60',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  aiActionText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  aiActionBtnSecondary: {
    backgroundColor: '#F5FDF9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27AE60',
  },
  aiActionTextSecondary: {
    color: '#27AE60',
    fontSize: 13,
    fontWeight: 'bold',
  },
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
  tipCard: {
    backgroundColor: '#FFFDE7',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFF9C4',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FBC02D',
    marginLeft: 8,
    textTransform: 'uppercase',
  },
  tipText: {
    fontSize: 14,
    color: '#5D4037',
    lineHeight: 20,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  todoSummary: {
    backgroundColor: '#F3E5F5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 15,
  },
  todoMiniItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  todoMiniText: {
    flex: 1,
    fontSize: 14,
    color: '#4A148C',
    fontWeight: '500',
  },
  todoMiniDate: {
    fontSize: 12,
    color: '#7B1FA2',
    marginLeft: 10,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    alignItems: 'center',
    justifyContent: 'center',
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
