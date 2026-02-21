import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Vibration, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AVService } from '../services/av';
// import { Audio } from 'expo-av'; // REMOVED

interface VoiceRecordButtonProps {
  onRecordingComplete: (uri: string) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: (text: string) => void;
  onSpeechPartial?: (text: string) => void;
  isProcessing: boolean;
  size?: number;
  showLabel?: boolean;
  language?: string;
}

export const VoiceRecordButton: React.FC<VoiceRecordButtonProps> = ({ 
  onRecordingComplete,
  onSpeechStart,
  onSpeechEnd,
  onSpeechPartial,
  isProcessing,
  size = 100,
  showLabel = true,
  language = 'en-US'
}) => {
  // Use any because AVService wraps the Audio types or custom stubs
  const [recording, setRecording] = useState<any | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [glowAnim] = useState(new Animated.Value(0));
  const recordingRef = React.useRef<any>(null);
  const isStopPendingRef = React.useRef(false);
  const recognitionRef = React.useRef<any>(null);

  // Derived sizes
  const buttonSize = size;
  const pulseSize = size;
  const iconSize = size * 0.44;
  const innerGlowSize = size * 1.5;

  const [feedbackText, setFeedbackText] = useState('');

  useEffect(() => {
    // Check for secure context on Web
    if (Platform.OS === 'web' && 
        window.location.hostname !== 'localhost' && 
        window.location.hostname !== '127.0.0.1' && 
        window.location.protocol !== 'https:') {
      console.warn('Microphone access requires HTTPS or localhost!');
      Alert.alert('Security Warning', 'Microphone access requires HTTPS or localhost. Please use a secure connection.');
    }

    (async () => {
      const { status } = await AVService.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Agri needs microphone access to hear your queries.');
        return;
      }
    })();
    
    // Cleanup recognition on unmount
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  // Define helper functions first to avoid hoisting issues
  function startAnimations() {
    // Reset values first
    scaleAnim.setValue(1);
    glowAnim.setValue(0);
    setFeedbackText('Listening...');

    Animated.parallel([
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { 
            toValue: 1.3, // Increased scale for more visible "forward"
            duration: 800, 
            useNativeDriver: true 
          }),
          Animated.timing(scaleAnim, { 
            toValue: 1.0, // "Backward"
            duration: 800, 
            useNativeDriver: true 
          })
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: false })
        ])
      )
    ]).start();
  }

  function stopAnimations() {
    scaleAnim.stopAnimation();
    scaleAnim.setValue(1);
    glowAnim.setValue(0);
    setFeedbackText('');
  }

  function stopWebListening() {
    if (recognitionRef.current) {
      // Clear ref first to prevent onend from thinking it's a timeout
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      rec.stop();
    }
    setIsRecording(false);
    stopAnimations();
  }

  async function startAudioRecordingFallback() {
    console.log('[VoiceRecordButton] Starting Audio Recording Fallback...');
    try {
      setIsRecording(true);
      startAnimations();
      setFeedbackText('Listening (Audio)...');

      // Request permissions again just in case
      await AVService.requestPermissionsAsync();

      await AVService.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('[VoiceRecordButton] Creating recording object (High Quality)...');
      const { recording: newRecording } = await AVService.Recording.createAsync(
        AVService.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      recordingRef.current = newRecording;
      setRecording(newRecording);
      
      console.log('[VoiceRecordButton] Audio recording started successfully');
    } catch (err) {
      console.error('[VoiceRecordButton] Failed to start audio recording:', err);
      setIsRecording(false);
      stopAnimations();
      Alert.alert('Microphone Error', 'Failed to access microphone.');
    }
  }

  // Force Fallback for now to test backend connectivity if WebSpeech is flaky
  const FORCE_FALLBACK = false;

  function startWebListening() {
    if (FORCE_FALLBACK) {
      console.log('[VoiceRecordButton] Forced Fallback Mode enabled. Skipping Web Speech API.');
      startAudioRecordingFallback();
      return;
    }

    // Check browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API not supported');
      Alert.alert('Browser not supported', 'Please use Chrome, Edge or Safari for voice input.');
      // Fallback to audio recording
      startAudioRecordingFallback();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language || 'en-US';

      recognition.onstart = () => {
        console.log('[WebSpeech] onstart event fired');
        setIsRecording(true);
        startAnimations();
        onSpeechStart && onSpeechStart();
      };

      recognition.onerror = (event: any) => {
        console.error('[WebSpeech] Error event:', event.error);
        if (event.error === 'not-allowed') {
           Alert.alert('Microphone Access Denied', 'Please allow microphone access in your browser settings.');
           stopWebListening();
        } else if (event.error === 'no-speech') {
           console.log('[WebSpeech] No speech detected, stopping.');
           stopWebListening();
        } else {
           console.log('[WebSpeech] Generic error, switching to fallback...');
           stopWebListening();
           startAudioRecordingFallback();
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        stopAnimations();
        console.log('[WebSpeech] Ended');
      };
      
      recognition.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          if (interimTranscript && onSpeechPartial) {
             onSpeechPartial(interimTranscript);
             setFeedbackText(interimTranscript);
          }

          if (finalTranscript && onSpeechEnd) {
             console.log('[WebSpeech] Final:', finalTranscript);
             setFeedbackText('Processing...');
             onSpeechEnd(finalTranscript);
             stopWebListening();
          }
      };

      recognition.start();
    } catch (e) {
      console.error('[WebSpeech] Exception:', e);
      startAudioRecordingFallback();
    }
  }

  async function startRecording() {
    // Prefer Web Speech API on Web if handler is provided
    // ENABLE Web Speech API for better reliability on browsers
    if (Platform.OS === 'web' && onSpeechEnd) {
      console.log('[VoiceRecordButton] Starting Web Speech API...');
      startWebListening();
      return;
    }
    
    console.log('[VoiceRecordButton] Starting audio recording fallback...');
    await startAudioRecordingFallback();
  }

  async function stopRecording() {
    console.log('[VoiceRecordButton] Stopping recording...');
    setIsRecording(false);
    stopAnimations();

    if (Platform.OS === 'web') {
      if (FORCE_FALLBACK) {
         // Stop fallback recording
         if (recordingRef.current) {
            try {
              console.log('[VoiceRecordButton] Stopping fallback recording...');
              await recordingRef.current.stopAndUnloadAsync();
              const uri = recordingRef.current.getURI();
              console.log('[VoiceRecordButton] Recording stopped, URI:', uri);
              setFeedbackText('Sending to Brain...');
              setTimeout(() => setFeedbackText(''), 5000); // Clear after 5s if not cleared externally
              onRecordingComplete(uri);
            } catch (error) {
              console.error('[VoiceRecordButton] Error stopping fallback:', error);
              setFeedbackText('Error Stopping');
              setTimeout(() => setFeedbackText(''), 3000);
            }
            recordingRef.current = null;
         }
         return;
      }
      stopWebListening();
    } else {
      isStopPendingRef.current = true;
      const currentRecording = recordingRef.current || recording;
      
      if (!currentRecording) {
          console.warn('[VoiceRecordButton] No active recording found to stop');
          return;
      }

      Vibration.vibrate(50);

      try {
          await currentRecording.stopAndUnloadAsync();
          const uri = currentRecording.getURI();
          console.log('[VoiceRecordButton] Recording stopped, URI:', uri);
          
          setRecording(null);
          recordingRef.current = null;

          if (uri) {
              onRecordingComplete(uri);
          } else {
              console.error('[VoiceRecordButton] No URI generated from recording');
              Alert.alert('Recording Error', 'No audio captured. Please try again.');
          }
      } catch (error) {
          console.error('[VoiceRecordButton] Error stopping recording:', error);
          Alert.alert('Recording Error', 'Failed to process audio.');
      }
    }
  }

  async function toggleRecording() {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }

  return (
    <View style={styles.container}>
      {feedbackText ? (
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackText}>{feedbackText}</Text>
        </View>
      ) : null}

      {isProcessing ? (
        <ProcessingIndicator size={size} />
      ) : (
        <MicButton 
          isRecording={isRecording}
          onPress={toggleRecording}
          size={size}
          scaleAnim={scaleAnim}
          showLabel={showLabel}
        />
      )}
    </View>
  );
};

/* ----------------------------------------
   SUB-COMPONENTS
---------------------------------------- */

const MicButton: React.FC<{
  isRecording: boolean;
  onPress: () => void;
  size: number;
  scaleAnim: Animated.Value;
  showLabel?: boolean;
}> = ({ isRecording, onPress, size, scaleAnim, showLabel = true }) => {
  const pulseSize = size;
  const buttonSize = size;
  const iconSize = size * 0.44;
  const innerGlowSize = size * 1.5;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={styles.touchable}
    >
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {isRecording && (
          <>
            <Animated.View style={[
              styles.pulseLayer, 
              { 
                width: pulseSize, 
                height: pulseSize, 
                borderRadius: pulseSize / 2,
                top: 0,
                left: 0,
                transform: [{ scale: scaleAnim.interpolate({ inputRange: [1, 1.3], outputRange: [1, 2.0] }) }], 
                opacity: 0.3 
              }
            ]} />
            <Animated.View style={[
              styles.pulseLayer, 
              { 
                width: pulseSize, 
                height: pulseSize, 
                borderRadius: pulseSize / 2,
                top: 0,
                left: 0,
                transform: [{ scale: scaleAnim.interpolate({ inputRange: [1, 1.3], outputRange: [1, 1.5] }) }], 
                opacity: 0.5 
              }
            ]} />
          </>
        )}
        <Animated.View style={[
          styles.button,
          { 
            width: buttonSize, 
            height: buttonSize, 
            borderRadius: buttonSize / 2,
            transform: [{ scale: scaleAnim }] 
          },
          isRecording && { backgroundColor: '#e74c3c', shadowColor: '#e74c3c' }
        ]}>
          <View style={[
            styles.innerGlow, 
            { 
              width: innerGlowSize, 
              height: innerGlowSize, 
              borderRadius: innerGlowSize / 2,
              opacity: isRecording ? 1 : 0 
            }
          ]} />
          <Ionicons
            name={isRecording ? "stop" : "mic"}
            size={iconSize}
            color="white"
          />
        </Animated.View>
      </View>
      {showLabel && <Text style={styles.label}>{isRecording ? 'Listening... (Tap to Stop)' : 'Tap to Speak'}</Text>}
    </TouchableOpacity>
  );
};

const ProcessingIndicator: React.FC<{ size: number }> = ({ size }) => (
  <View style={styles.processingContainer}>
    <Animated.View style={[
      styles.siriOrb, 
      { 
        width: size * 0.7, 
        height: size * 0.7, 
        borderRadius: (size * 0.7) / 2,
        transform: [{ scale: 1.2 }] 
      }
    ]} />
    <Text style={styles.processingText}>Thinking...</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 200, // Explicit width to contain absolute items if needed
    height: 200, // Explicit height
  },
  touchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseLayer: {
    position: 'absolute',
    backgroundColor: '#27AE60',
    shadowColor: '#27AE60',
    shadowRadius: 20,
    shadowOpacity: 0.6,
  },
  button: {
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  processingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  siriOrb: {
    backgroundColor: '#27AE60',
    shadowColor: '#27AE60',
    shadowRadius: 25,
    shadowOpacity: 0.8,
    marginBottom: 15,
  },
  processingText: {
    color: '#27AE60',
    fontSize: 16,
    fontWeight: '600',
  },
  label: {
    marginTop: 12,
    fontSize: 16,
    color: '#34495e',
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  feedbackContainer: {
    position: 'absolute',
    top: -60, // Float above the button
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3498DB', // Solid blue background
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2980B9',
    maxWidth: '120%', // Allow wider than button
    zIndex: 9999, // Ensure on top
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  feedbackText: {
    color: '#FFFFFF', // White text
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  }
});
