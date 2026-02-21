import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Modal, 
  Dimensions, 
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LiveVoiceSession } from '../services/geminiService';
import { AppView, FarmerProfile } from '../types';

interface VoiceAssistantProps {
  visible: boolean;
  onBack: () => void;
  onNavigate: (view: AppView) => void;
  profile: FarmerProfile | null;
}

const { width } = Dimensions.get('window');

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ 
  visible, 
  onBack, 
  onNavigate, 
  profile 
}) => {
  const [isActive, setIsActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<LiveVoiceSession | null>(null);
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pingAnim = useRef(new Animated.Value(0)).current;
  const waveAnims = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    if (visible) {
      startSession();
      startAnimations();
    } else {
      stopSession();
      stopAnimations();
    }
    
    return () => {
      stopSession();
    };
  }, [visible]);

  useEffect(() => {
    if (isSpeaking) {
      startWaveAnimation();
    } else {
      stopWaveAnimation();
    }
  }, [isSpeaking]);

  const startSession = () => {
    setError(null);
    const session = new LiveVoiceSession({
      onConnect: () => {
        setIsActive(true);
        setError(null);
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

  const toggleSession = () => {
    if (isActive) {
      stopSession();
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
            <Text style={styles.headerTitle}>AgriSaarthi</Text>
            <View style={styles.liveBadge}>
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onBack} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Status Text */}
          <View style={styles.statusContainer}>
            {error ? (
              <View style={styles.errorContainer}>
                <View style={styles.errorBox}>
                  <Ionicons name="warning" size={20} color="#FCA5A5" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
                <TouchableOpacity onPress={startSession} style={styles.retryButton}>
                  <Ionicons name="refresh" size={14} color="#86EFAC" />
                  <Text style={styles.retryText}>Tap to retry</Text>
                </TouchableOpacity>
              </View>
            ) : isActive ? (
              isSpeaking ? (
                <Text style={[styles.statusText, styles.speakingText]}>AgriSaarthi is speaking...</Text>
              ) : (
                <Text style={styles.statusText}>Listening... Speak now</Text>
              )
            ) : (
              <Text style={styles.inactiveText}>Tap microphone to connect</Text>
            )}

            {!error && (
              <Text style={styles.subText}>
                {profile ? `Talking to ${profile.name}` : 'Set up your profile for better advice'}
              </Text>
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
        </View>
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
  }
});
