import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Vibration, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

interface VoiceRecordButtonProps {
  onRecordingComplete: (uri: string) => void;
  isProcessing: boolean;
}

export const VoiceRecordButton: React.FC<VoiceRecordButtonProps> = ({ onRecordingComplete, isProcessing }) => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [glowAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'AgriSaarthi needs microphone access to hear your queries.');
      }
    })();
  }, []);

  const startRecording = async () => {
    try {
      Vibration.vibrate(50);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setIsRecording(true);
      
      Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1.0, duration: 800, useNativeDriver: true })
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
            Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: false })
          ])
        )
      ]).start();

    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    
    Vibration.vibrate(50);
    setIsRecording(false);
    scaleAnim.stopAnimation();
    scaleAnim.setValue(1);
    glowAnim.setValue(0);

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI(); 
    setRecording(null);
    
    if (uri) {
      onRecordingComplete(uri);
    }
  };

  return (
    <View style={styles.container}>
      {isProcessing ? (
        <View style={styles.processingContainer}>
          <Animated.View style={[styles.siriOrb, { transform: [{ scale: 1.2 }] }]} />
          <Text style={styles.processingText}>Thinking...</Text>
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.9}
          onPressIn={startRecording}
          onPressOut={stopRecording}
          style={styles.touchable}
        >
          {isRecording && (
            <>
              <Animated.View style={[styles.pulseLayer, { transform: [{ scale: scaleAnim.interpolate({ inputRange: [1, 1.15], outputRange: [1, 1.8] }) }], opacity: 0.3 }]} />
              <Animated.View style={[styles.pulseLayer, { transform: [{ scale: scaleAnim.interpolate({ inputRange: [1, 1.15], outputRange: [1, 1.4] }) }], opacity: 0.5 }]} />
            </>
          )}
          <Animated.View style={[
            styles.button, 
            { transform: [{ scale: scaleAnim }] },
            isRecording && { backgroundColor: '#e74c3c' }
          ]}>
            <View style={[styles.innerGlow, { opacity: isRecording ? 1 : 0 }]} />
            <Ionicons 
              name={isRecording ? "stop" : "mic"} 
              size={44} 
              color="white" 
            />
          </Animated.View>
          <Text style={styles.label}>{isRecording ? 'Listening...' : 'Tap to Speak'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  touchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseLayer: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#27AE60',
    shadowColor: '#27AE60',
    shadowRadius: 20,
    shadowOpacity: 0.6,
  },
  button: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#27AE60',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  innerGlow: {
    position: 'absolute',
    width: '150%',
    height: '150%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 100,
  },
  siriOrb: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#27AE60',
    shadowColor: '#27AE60',
    shadowRadius: 25,
    shadowOpacity: 0.8,
    marginBottom: 20,
  },
  icon: {
    fontSize: 32,
    color: '#FFF',
  },
  label: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  processingContainer: {
    alignItems: 'center',
  },
  processingText: {
    fontSize: 18,
    color: '#27AE60',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});
