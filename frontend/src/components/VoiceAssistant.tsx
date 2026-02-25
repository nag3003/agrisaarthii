import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Modal, 
  Dimensions, 
  Platform, 
  Vibration,
  TextInput 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SpeechService } from '../services/speech';
import { LiveVoiceSession } from '../services/geminiService';
import { AppView, FarmerProfile } from '../types';

interface VoiceAssistantProps {
  visible: boolean;
  onBack: () => void;
  onNavigate: (view: AppView) => void;
  profile: FarmerProfile | null;
  isBackendDown?: boolean;
  onRetryConnection?: () => void;
}

const { width } = Dimensions.get('window');

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ 
  visible, 
  onBack, 
  onNavigate, 
  profile,
  isBackendDown = false,
  onRetryConnection
}) => {
  const [isActive, setIsActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [queryText, setQueryText] = useState<string>(''); // For text-based queries
  const [error, setError] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const sessionRef = useRef<LiveVoiceSession | null>(null);
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pingAnim = useRef(new Animated.Value(0)).current;
  const listenBlinkAnim = useRef(new Animated.Value(0)).current;
  const waveAnims = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    if (visible) {
      if (!isBackendDown) {
        startSession();
        startAnimations();
      } else {
          // If backend is down, we don't start the session automatically to avoid immediate error
          // But we show the UI so user can see status
          setError("Cannot connect to server. Check internet or tunnel.");
      }
    } else {
      stopSession();
      stopAnimations();
    }
    
    return () => {
      stopSession();
    };
  }, [visible, isBackendDown]);

  useEffect(() => {
    // Blink indicator when actively listening (not speaking)
    if (isActive && !isSpeaking && !error) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(listenBlinkAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(listenBlinkAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      listenBlinkAnim.stopAnimation();
      listenBlinkAnim.setValue(0);
    }
  }, [isActive, isSpeaking, error]);

  useEffect(() => {
    if (isSpeaking) {
      startWaveAnimation();
      if (Platform.OS === 'web') SpeechService.beep(700, 100, 0.06);
    } else {
      stopWaveAnimation();
    }
  }, [isSpeaking]);

  const startSession = () => {
    setError(null);
    setTranscript(null);
    const session = new LiveVoiceSession({
      onConnect: () => {
        setIsActive(true);
        setError(null);
        Vibration.vibrate(10);
        if (Platform.OS === 'web') SpeechService.beep(1000, 120, 0.08);
      },
      onDisconnect: () => setIsActive(false),
      onSpeaking: (speaking) => setIsSpeaking(speaking),
      onNavigate: (screenName) => {
        // Map string to AppView enum
        const view = AppView[screenName as keyof typeof AppView];
        if (view) {
          onNavigate(view);
          onBack(); // Close modal on navigation
        }
      },
      onTranscript: (text) => setTranscript(text),
      onError: (err) => {
        setError(err.message);
        setIsActive(false);
      }
    }, profile);
    
    sessionRef.current = session;
    session.start();
  };

  const stopSession = () => {
    sessionRef.current?.stop();
    setIsActive(false);
    setIsSpeaking(false);
  };

  const handleRestart = async () => {
    console.log('[VoiceAssistant] Manual Mic Restart triggered');
    SpeechService.restart();
    if (sessionRef.current) {
      await sessionRef.current.restart();
    }
  };

  const handleTextQuery = async () => {
    if (queryText.trim() && sessionRef.current) {
        const text = queryText;
        setQueryText('');
        setTranscript(text);
        await sessionRef.current.processText(text);
    }
  };

  const toggleSession = () => {
    if (isBackendDown) {
        if (onRetryConnection) {
            setError(null);
            onRetryConnection();
        }
        return;
    }

    if (isActive) {
      if (Platform.OS !== 'web') {
          // Native: Tap to process current speech (Manual Endpointing)
          // The user can close the modal via the X button to exit completely
          sessionRef.current?.stopListeningAndProcess();
      } else {
          stopSession();
      }
    } else {
      startSession();
    }
  };

  // Animations
  const startAnimations = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
        Animated.sequence([
            Animated.timing(pingAnim, {
                toValue: 1,
                duration: 1500,
                useNativeDriver: true,
            }),
            Animated.timing(pingAnim, {
                toValue: 0,
                duration: 0,
                useNativeDriver: true,
            })
        ])
    ).start();
  };

  const stopAnimations = () => {
    pulseAnim.setValue(1);
    pingAnim.setValue(0);
  };

  const startWaveAnimation = () => {
    const animations = waveAnims.map((anim, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 500 + (index * 100),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.3,
            duration: 500 + (index * 100),
            useNativeDriver: true,
          }),
        ])
      );
    });
    Animated.parallel(animations).start();
  };

  const stopWaveAnimation = () => {
    waveAnims.forEach(anim => {
        anim.stopAnimation();
        anim.setValue(0.3);
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onBack}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <TouchableOpacity onLongPress={() => setDebugMode(!debugMode)}>
                <Text style={styles.headerTitle}>AgriSaarthi</Text>
            </TouchableOpacity>
            <View style={[styles.liveBadge, isBackendDown && { backgroundColor: '#EF4444' }]}>
              <Text style={styles.liveText}>{isBackendDown ? 'OFFLINE' : 'LIVE'}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleRestart} style={styles.closeButton}>
            <Ionicons name="refresh" size={22} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onBack} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Status Text */}
          <View style={styles.statusContainer}>
            {error ? (
              <View style={{ alignItems: 'center' }}>
                  <Text style={styles.errorText}>{error}</Text>
                  {isBackendDown && (
                      <TouchableOpacity 
                          style={{ marginTop: 10, padding: 8, backgroundColor: '#FFFFFF30', borderRadius: 8 }}
                          onPress={onRetryConnection}
                      >
                          <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Retry Connection</Text>
                      </TouchableOpacity>
                  )}
              </View>
            ) : (
              <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.statusText, isSpeaking && { color: '#3498DB' }]}>
                    {isActive 
                        ? (isSpeaking ? "AI is replying..." : "Listening...") 
                        : "Tap to Speak"}
                  </Text>
                  {isActive && (isSpeaking || !error) && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                      <Animated.View 
                        style={{
                          width: 10, 
                          height: 10, 
                          borderRadius: 5, 
                          marginRight: 8,
                          backgroundColor: isSpeaking ? '#3498DB' : '#22C55E',
                          opacity: listenBlinkAnim
                        }} 
                      />
                      <Text style={{ color: isSpeaking ? '#3498DB' : '#86EFAC' }}>
                        {isSpeaking ? "Voice active" : "AI is listening"}
                      </Text>
                    </View>
                  )}
                  {transcript && (
                      <Text style={{ fontSize: 18, fontStyle: 'italic', marginTop: 8, color: isSpeaking ? '#3498DB' : '#DCFCE7', textAlign: 'center' }}>
                          "{transcript}"
                      </Text>
                  )}
              </View>
            )}
          </View>

          {/* Visualizer / Button */}
          <View style={styles.visualizerContainer}>
            {/* Waves */}
            {isActive && isSpeaking && !error && (
              <View style={styles.waveContainer}>
                {waveAnims.map((anim, index) => (
                    <Animated.View 
                        key={index}
                        style={[
                            styles.waveBar,
                            {
                                transform: [{ scaleY: anim }]
                            }
                        ]}
                    />
                ))}
              </View>
            )}

            {/* Ping Animation */}
            {isActive && !isSpeaking && !error && (
                <Animated.View 
                    style={[
                        styles.pingCircle,
                        {
                            transform: [{ scale: pingAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [1, 2]
                            }) }],
                            opacity: pingAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.5, 0]
                            })
                        }
                    ]} 
                />
            )}

            {/* Main Button */}
            <TouchableOpacity
              onPress={toggleSession}
              activeOpacity={0.8}
            >
              <Animated.View style={[
                styles.micButton,
                isActive ? styles.micButtonActive : styles.micButtonInactive,
                {
                    transform: [{ scale: isActive && isSpeaking ? pulseAnim : 1 }]
                }
              ]}>
                {isActive ? (
                   isSpeaking ? (
                       <Ionicons name="volume-high" size={60} color="#DCFCE7" />
                   ) : (
                       <Ionicons name="mic" size={60} color="#FFF" />
                   )
                ) : (
                   <Ionicons name="mic-off" size={60} color="#FFF" />
                )}
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Text Input Fallback */}
          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder={profile?.language === 'hi' ? "सवाल टाइप करें..." : "Type your question..."}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={queryText}
              onChangeText={setQueryText}
              onSubmitEditing={handleTextQuery}
              returnKeyType="send"
            />
            <TouchableOpacity 
              onPress={handleTextQuery}
              disabled={!queryText.trim()}
              style={[styles.sendButton, !queryText.trim() && { opacity: 0.5 }]}
            >
              <Ionicons name="send" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Debug Panel */}
        {debugMode && (
             <View style={{ position: 'absolute', bottom: 120, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.8)', padding: 10, borderRadius: 10, zIndex: 999 }}>
                  <Text style={{ color: '#FFF', fontSize: 12, marginBottom: 5, textAlign: 'center' }}>Test Voice Commands (Tap to Simulate):</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
                      <TouchableOpacity onPress={() => { sessionRef.current?.processText('Open Calculator'); setTranscript('Open Calculator'); }} style={{ padding: 8, backgroundColor: '#333', borderRadius: 5 }}><Text style={{ color: '#FFF' }}>Calculator</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => { sessionRef.current?.processText('Open Crop Doctor'); setTranscript('Open Crop Doctor'); }} style={{ padding: 8, backgroundColor: '#333', borderRadius: 5 }}><Text style={{ color: '#FFF' }}>Crop Doctor</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => { sessionRef.current?.processText('Weather'); setTranscript('Weather'); }} style={{ padding: 8, backgroundColor: '#333', borderRadius: 5 }}><Text style={{ color: '#FFF' }}>Weather</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => { sessionRef.current?.processText('How do I grow tomatoes?'); setTranscript('How do I grow tomatoes?'); }} style={{ padding: 8, backgroundColor: '#333', borderRadius: 5 }}><Text style={{ color: '#FFF' }}>Tomatoes</Text></TouchableOpacity>
                  </View>
             </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(20, 83, 45, 0.95)', // green-900/95
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginTop: Platform.OS === 'ios' ? 40 : 20,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#DCFCE7', // green-100
  },
  liveBadge: {
    backgroundColor: '#15803D', // green-700
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#166534', // green-800
    borderRadius: 20,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 50,
    height: 100,
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
  },
  speakingText: {
    color: '#86EFAC', // green-300
  },
  inactiveText: {
    fontSize: 20,
    color: '#9CA3AF', // gray-400
  },
  subText: {
    marginTop: 8,
    color: 'rgba(134, 239, 172, 0.8)', // green-300/80
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    gap: 10,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(127, 29, 29, 0.5)', // red-900/50
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  errorText: {
    color: '#FCA5A5', // red-300
    fontWeight: 'bold',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  retryText: {
    color: '#86EFAC', // green-300
    textDecorationLine: 'underline',
  },
  visualizerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  micButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 4,
  },
  micButtonActive: {
    backgroundColor: '#15803D', // green-700
    borderColor: '#86EFAC', // green-300
  },
  micButtonInactive: {
    backgroundColor: '#166534', // green-800
    borderColor: '#22C55E', // green-500
  },
  waveContainer: {
    position: 'absolute',
    top: -80,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
    height: 60,
  },
  waveBar: {
    width: 6,
    height: 60,
    backgroundColor: '#86EFAC', // green-300
    borderRadius: 3,
  },
  pingCircle: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#22C55E', // green-500
    zIndex: -1,
  },
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 5,
    marginHorizontal: 30,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  textInput: {
    flex: 1,
    height: 45,
    color: '#FFF',
    fontSize: 16,
  },
  sendButton: {
    padding: 8,
  }
});
