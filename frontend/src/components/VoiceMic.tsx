import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SpeechService } from '../services/speech';
import { AVService } from '../services/av';
import { sendVoice } from '../services/api';
import { processLocalCommand } from '../utils/voiceCommandHelper';

type Props = {
  onResult: (text: string) => void;
  onError?: (message: string) => void;
  language?: string;
  size?: number;
  navigation?: any;
  isVoiceOutputEnabled?: boolean;
  onLogout?: () => void;
  role?: string | null;
};

let ACTIVE_OWNER: string | null = null;

export const VoiceMic: React.FC<Props> = ({ 
  onResult, 
  onError, 
  language = 'en-US', 
  size = 110,
  navigation,
  isVoiceOutputEnabled = true,
  onLogout,
  role
}) => {
  const ownerId = useRef<string>(Math.random().toString(36).slice(2)).current;
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [label, setLabel] = useState('Tap to Speak');
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const recognitionRef = useRef<any>(null);
  const recordingRef = useRef<any>(null);
  const stopTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (ACTIVE_OWNER === ownerId) ACTIVE_OWNER = null;
      stopWeb();
      stopNative();
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    };
  }, []);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.15, duration: 500, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.0, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  };

  const stopPulse = () => {
    scaleAnim.stopAnimation();
    scaleAnim.setValue(1);
  };

  const startWeb = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      startNative();
      return;
    }
    try {
      const rec = new SR();
      recognitionRef.current = rec;
      rec.lang = language;
      rec.interimResults = true;
      rec.continuous = false;
      rec.onstart = () => {
        setListening(true);
        setThinking(false);
        setLabel('Listening...');
        SpeechService.beep(1000, 120, 0.08);
        startPulse();
      };
      rec.onerror = (e: any) => {
        stopWeb();
        setListening(false);
        stopPulse();
        setLabel('Tap to Speak');
        if (onError) onError(e.error || 'recognition_error');
      };
      rec.onend = () => {
        stopPulse();
        setListening(false);
      };
      rec.onresult = async (event: any) => {
        let finalText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const r = event.results[i];
          if (r.isFinal) finalText += r[0].transcript;
        }
        if (finalText) {
          setThinking(true);
          setLabel('Thinking...');
          SpeechService.beep(700, 100, 0.06);
          stopWeb();
          const handled = navigation 
            ? processLocalCommand(finalText, { 
                navigation, 
                language: language || 'hi', 
                isVoiceOutputEnabled, 
                onLogout,
                role 
              }) 
            : false;
          if (!handled) {
            onResult(finalText);
            SpeechService.speak(finalText, { language });
          }
          setThinking(false);
          setLabel('Tap to Speak');
        }
      };
      rec.start();
    } catch (e: any) {
      if (onError) onError('failed_to_start_web');
    }
  };

  const stopWeb = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
  };

  const startNative = async () => {
    try {
      const { status } = await AVService.requestPermissionsAsync();
      if (status !== 'granted') {
        if (onError) onError('permission_denied');
        return;
      }
      await AVService.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await AVService.Recording.createAsync(AVService.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setListening(true);
      setThinking(false);
      setLabel('Listening...');
      SpeechService.beep(1000, 120, 0.08);
      startPulse();
      stopTimerRef.current = setTimeout(stopNativeAndProcess, 6000);
    } catch {
      if (onError) onError('failed_to_start_native');
    }
  };

  const stopNative = async () => {
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {}
      recordingRef.current = null;
    }
  };

  const stopNativeAndProcess = async () => {
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      stopPulse();
      setListening(false);
      if (uri) {
        setThinking(true);
        setLabel('Thinking...');
        SpeechService.beep(700, 100, 0.06);
        const res = await sendVoice(uri);
        const text = res?.text || '';
        setThinking(false);
        setLabel('Tap to Speak');
        if (text) {
          const handled = navigation 
            ? processLocalCommand(text, { 
                navigation, 
                language: language || 'hi', 
                isVoiceOutputEnabled, 
                onLogout,
                role 
              }) 
            : false;
          if (!handled) {
            onResult(text);
            SpeechService.speak(text, { language });
          }
        } 
        else if (onError) onError('empty_transcript');
      } else {
        setLabel('Tap to Speak');
        if (onError) onError('no_uri');
      }
    } catch {
      setLabel('Tap to Speak');
      if (onError) onError('stop_error');
    }
  };

  const handlePress = async () => {
    if (!ACTIVE_OWNER || ACTIVE_OWNER === ownerId) {
      ACTIVE_OWNER = ownerId;
    } else {
      return;
    }
    if (listening) {
      if (Platform.OS === 'web') {
        stopWeb();
        stopPulse();
        setListening(false);
        setLabel('Tap to Speak');
      } else {
        if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
        await stopNativeAndProcess();
      }
      ACTIVE_OWNER = null;
      return;
    }
    if (Platform.OS === 'web') startWeb();
    else startNative();
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <TouchableOpacity activeOpacity={0.9} onPress={handlePress}>
        <Animated.View style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: listening ? '#22C55E' : '#15803D',
          transform: [{ scale: scaleAnim }]
        }}>
          <Ionicons name={listening ? 'mic' : 'mic-outline'} size={size * 0.44} color="#FFF" />
        </Animated.View>
      </TouchableOpacity>
      <Text style={{ marginTop: 8, color: '#1F2937', fontWeight: '600' }}>{label}</Text>
    </View>
  );
}
