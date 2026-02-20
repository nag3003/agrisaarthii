let voices: SpeechSynthesisVoice[] = [];

// Initialize voices
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    voices = window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();
        console.log(`[SpeechService] Voices updated: ${voices.length} voices available`);
    };
}

export const SpeechService = {
    speak: (text: string, options?: any) => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            // Ensure we are not paused and cancel any current speech
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            
            // If text is empty, this is a priming call
            if (!text) {
                console.log('[SpeechService] Priming audio context...');
            }
            
            // Language mapping
            const langMap: Record<string, string> = { 
                'hi': 'hi-IN', 
                'en': 'en-US', 
                'te': 'te-IN', 
                'ta': 'ta-IN',
                'mr': 'mr-IN',
                'kn': 'kn-IN',
                'ml': 'ml-IN',
                'gu': 'gu-IN'
            };

            // Set language
            let targetLang = options?.language || 'hi-IN';
            if (langMap[targetLang]) {
                targetLang = langMap[targetLang];
            }
            utterance.lang = targetLang;

            console.log(`[SpeechService] Attempting to speak: "${text.substring(0, 30)}..." in ${utterance.lang}`);

            // Set other properties if provided
            utterance.pitch = options?.pitch ?? 1.0;
            utterance.rate = options?.rate ?? 0.9;
            utterance.volume = options?.volume ?? 1.0;

            // Enhance voice selection for Siri-like quality
            if (voices.length > 0) {
                // Try to find exact match first
                let voice = voices.find(v => v.lang === utterance.lang && (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')));
                
                if (!voice) {
                    voice = voices.find(v => v.lang === utterance.lang);
                }

                if (!voice) {
                    voice = voices.find(v => v.lang.startsWith(utterance.lang.split('-')[0]));
                }
                
                // FINAL FALLBACK
                if (!voice) {
                    voice = voices.find(v => v.lang.startsWith('en')) || voices[0];
                }

                if (voice) {
                    utterance.voice = voice;
                    if (voice.lang !== utterance.lang) {
                        utterance.lang = voice.lang;
                    }
                }
            }

            // Boundary event for word-by-word syncing
            if (options?.onBoundary) {
                utterance.onboundary = (event) => {
                    options.onBoundary(event);
                };
            }

            // Error handling
            utterance.onerror = (event) => {
                console.error('[SpeechService] Error during speech:', event);
                // If it's a "not-allowed" error, it might be a user gesture issue
                if ((event as any).error === 'not-allowed') {
                    console.warn('[SpeechService] Speech not allowed. Ensure this is triggered by a user gesture.');
                }
            };

            utterance.onstart = () => {
                console.log('[SpeechService] Speech started successfully');
            };

            utterance.onend = () => {
                console.log('[SpeechService] Speech finished');
            };

            // Ensure we are not paused
            if (window.speechSynthesis.paused) {
                console.log('[SpeechService] Synthesis was paused, resuming...');
                window.speechSynthesis.resume();
            }

            window.speechSynthesis.speak(utterance);
        } else {
            console.warn("[SpeechService] Speech synthesis not supported in this environment.");
        }
    },
    stop: async () => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    },
    isSpeakingAsync: async () => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            return window.speechSynthesis.speaking;
        }
        return false;
    }
};
