import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

export const SpeechService = {
    speak: async (text: string, options: Speech.SpeechOptions = {}) => {
        console.log('[SpeechService] Speak called:', text.substring(0, 50) + '...', options);
        
        try {
            // Ensure we stop any ongoing speech before starting new one
            await Speech.stop();

            // Check if voice is available (Web specific check)
            if (Platform.OS === 'web' && 'speechSynthesis' in window) {
                const voices = window.speechSynthesis.getVoices();
                if (voices.length > 0) {
                    let lang = options.language || 'en-US';
                    let voice = voices.find(v => v.lang === lang || v.lang.startsWith(lang.split('-')[0]));
                    
                    if (!voice) {
                        console.warn(`[SpeechService] Voice for ${lang} not found. Falling back to English.`);
                        voice = voices.find(v => v.lang.startsWith('en')) || voices[0];
                        // Update options to use the fallback voice's language to avoid silence
                        if (voice) {
                            options = { ...options, language: voice.lang };
                            console.log(`[SpeechService] Fallback voice: ${voice.name} (${voice.lang})`);
                        }
                    } else {
                        console.log(`[SpeechService] Using voice: ${voice.name} (${voice.lang})`);
                    }
                } else {
                    console.warn('[SpeechService] No voices available yet (async load).');
                }
            }

            Speech.speak(text, {
                ...options,
                onStart: () => console.log('[SpeechService] Started speaking'),
                onDone: () => console.log('[SpeechService] Finished speaking'),
                onStopped: () => console.log('[SpeechService] Stopped speaking'),
                onError: (e) => console.error('[SpeechService] Error speaking:', e),
            });
        } catch (error) {
            console.error('[SpeechService] Exception in speak:', error);
        }
    },
    stop: async () => {
        console.log('[SpeechService] Stop called');
        return Speech.stop();
    },
    isSpeakingAsync: async () => {
        return Speech.isSpeakingAsync();
    }
};
