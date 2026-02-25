import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Vibration, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AVService } from '../services/av';

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
  const [isRecording, setIsRecording] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [glowAnim] = useState(new Animated.Value(0));
  const recordingRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const keepListeningRef = useRef<boolean>(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [interimText, setInterimText] = useState('');

  useEffect(() => {
    (async () => {
      const { status } = await AVService.requestPermissionsAsync();
      if (status !== 'granted') console.warn('Mic permission not granted');
    })();
    
    return () => {
      keepListeningRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  function startAnimations() {
    scaleAnim.setValue(1);
    glowAnim.setValue(0);
    Animated.parallel([
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1.0, duration: 600, useNativeDriver: true })
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: false })
        ])
      )
    ]).start();
  }

  function stopAnimations() {
    scaleAnim.stopAnimation();
    scaleAnim.setValue(1);
    glowAnim.setValue(0);
    setFeedbackText('');
    setInterimText('');
  }

  function stopWebListening() {
    keepListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        // Check if we have any pending results
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setIsRecording(false);
    stopAnimations();
    
    // Final check for interim text if onSpeechEnd wasn't called
    if (interimText && onSpeechEnd) {
        console.log('[VoiceRecordButton] Manual stop: sending remaining interim text');
        onSpeechEnd(interimText);
        setInterimText('');
    }
  }

  async function startAudioRecordingFallback() {
    try {
      setIsRecording(true);
      startAnimations();
      setFeedbackText('Listening...');
      await AVService.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: newRecording } = await AVService.Recording.createAsync(AVService.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = newRecording;
    } catch (err) {
      console.error('Recording fallback error:', err);
      setIsRecording(false);
      stopAnimations();
    }
  }

  function startWebListening() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[VoiceRecordButton] Web Speech API not supported. Using audio fallback.');
      startAudioRecordingFallback();
      return;
    }

    try {
      if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch(e) {}
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      keepListeningRef.current = true;
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language || 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        startAnimations();
        setFeedbackText('Listening...');
        onSpeechStart && onSpeechStart();
      };

      recognition.onerror = (event: any) => {
        console.error('[WebSpeech] Error:', event.error);
        if (event.error === 'no-speech') {
           if (keepListeningRef.current) {
             // Silently restart if no speech detected to keep mic active
             try { recognition.stop(); } catch {}
             setTimeout(() => { if (keepListeningRef.current) startWebListening(); }, 200);
           }
        } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
           setFeedbackText('Mic permission denied');
           stopWebListening();
           Alert.alert('Microphone Error', 'Microphone access was denied. Please check your browser settings.');
        } else if (event.error === 'network') {
           setFeedbackText('Network error');
           stopWebListening();
           startAudioRecordingFallback(); // Try audio recording as network fallback
        } else {
           stopWebListening();
           startAudioRecordingFallback();
        }
      };

      recognition.onend = () => {
        if (keepListeningRef.current) {
          // Auto-restart for continuous experience
          setTimeout(() => { if (keepListeningRef.current) startWebListening(); }, 200);
        } else {
          setIsRecording(false);
          stopAnimations();
        }
      };
      
      recognition.onresult = (event: any) => {
          let finalTranscript = '';
          let currentInterim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
            else currentInterim += event.results[i][0].transcript;
          }
          
          if (currentInterim) {
             setInterimText(currentInterim);
             onSpeechPartial && onSpeechPartial(currentInterim);
          }
          
          if (finalTranscript) {
             setInterimText(finalTranscript);
             onSpeechEnd && onSpeechEnd(finalTranscript);
          }
      };
      recognition.start();
    } catch (e) {
      console.error('[VoiceRecordButton] Failed to start recognition:', e);
      startAudioRecordingFallback();
    }
  }

  async function stopRecording() {
    setIsRecording(false);
    stopAnimations();
    if (Platform.OS === 'web') {
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
          const uri = recordingRef.current.getURI();
          if (uri) onRecordingComplete(uri);
        } catch (e) {}
        recordingRef.current = null;
      } else {
        stopWebListening();
      }
    } else {
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
          const uri = recordingRef.current.getURI();
          if (uri) onRecordingComplete(uri);
        } catch (e) {}
        recordingRef.current = null;
      }
    }
  }

  return (
    <View style={styles.container}>
      {(feedbackText || interimText) && isRecording ? (
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackText}>{interimText || feedbackText}</Text>
        </View>
      ) : null}
      <MicButton 
        isRecording={isRecording}
        isProcessing={isProcessing}
        onPress={() => {
          if (isProcessing) return; // Prevent double-tap during processing
          isRecording ? stopRecording() : (Platform.OS === 'web' && onSpeechEnd ? startWebListening() : startAudioRecordingFallback())
        }}
        size={size}
        scaleAnim={scaleAnim}
        showLabel={showLabel}
      />
    </View>
  );
};

const MicButton: React.FC<{ isRecording: boolean; isProcessing: boolean; onPress: () => void; size: number; scaleAnim: Animated.Value; showLabel?: boolean; }> = ({ isRecording, isProcessing, onPress, size, scaleAnim, showLabel = true }) => {
  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={onPress} 
      style={[styles.touchable, isProcessing && { opacity: 0.6 }]}
      disabled={isProcessing}
    >
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {isRecording && (
          <Animated.View style={[styles.pulseLayer, { width: size, height: size, borderRadius: size / 2, transform: [{ scale: scaleAnim.interpolate({ inputRange: [1, 1.2], outputRange: [1, 1.8] }) }], opacity: 0.3 }]} />
        )}
        <Animated.View style={[
          styles.button, 
          { width: size, height: size, borderRadius: size / 2, transform: [{ scale: scaleAnim }] }, 
          isRecording && { backgroundColor: '#e74c3c' },
          isProcessing && { backgroundColor: '#3498DB' }
        ]}>
          {isProcessing ? (
            <Ionicons name="sync" size={size * 0.45} color="white" />
          ) : (
            <Ionicons name={isRecording ? "stop" : "mic"} size={size * 0.45} color="white" />
          )}
        </Animated.View>
      </View>
      {showLabel && (
        <Text style={[styles.label, isProcessing && { color: '#3498DB' }]}>
          {isProcessing ? 'Thinking...' : (isRecording ? 'Listening...' : 'Tap to Speak')}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const ProcessingIndicator: React.FC<{ size: number }> = ({ size }) => (
  <View style={styles.processingContainer}>
    <Animated.View style={[styles.siriOrb, { width: size * 0.7, height: size * 0.7, borderRadius: (size * 0.7) / 2 }]} />
    <Text style={styles.processingText}>Thinking...</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  touchable: { alignItems: 'center', justifyContent: 'center' },
  pulseLayer: { position: 'absolute', backgroundColor: '#27AE60' },
  button: { backgroundColor: '#27AE60', alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#27AE60', shadowOpacity: 0.3, shadowRadius: 10 },
  processingContainer: { alignItems: 'center', justifyContent: 'center' },
  siriOrb: { backgroundColor: '#27AE60', marginBottom: 15 },
  processingText: { color: '#27AE60', fontSize: 16, fontWeight: '600' },
  label: { marginTop: 12, fontSize: 16, color: '#34495e', fontWeight: '600', textAlign: 'center' },
  feedbackContainer: { position: 'absolute', top: -80, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#3498DB', borderRadius: 25, zIndex: 9999, minWidth: 150, maxWidth: 300, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 },
  feedbackText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', textAlign: 'center' }
});
