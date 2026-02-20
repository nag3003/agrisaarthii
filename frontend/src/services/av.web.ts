/**
 * Web-compatible AVService using browser MediaRecorder API
 */

export const AVService = {
    requestPermissionsAsync: async () => {
        try {
            console.log('[AVService] Requesting mic permission...');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('[AVService] Permission granted. Tracks:', stream.getAudioTracks().length);
            stream.getTracks().forEach(track => track.stop()); // Just checking permission
            return { status: 'granted' };
        } catch (e) {
            console.error("Mic permission denied or error", e);
            return { status: 'denied' };
        }
    },
    setAudioModeAsync: async (mode: any) => {
        // No-op on web
    },
    Recording: {
        createAsync: async (options: any) => {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Try to find a supported mime type
            const mimeType = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav']
                .find(type => MediaRecorder.isTypeSupported(type));
            
            console.log(`[AVService] Using mimeType: ${mimeType || 'default'}`);
            // Use mimeType if supported, otherwise default
            const mediaOptions = mimeType ? { mimeType } : undefined;
            const recorder = new MediaRecorder(stream, mediaOptions);
            const actualMimeType = recorder.mimeType || mimeType || 'audio/webm';
            console.log(`[AVService] Recorder initialized. Mime: ${actualMimeType}, State: ${recorder.state}`);
            
            const chunks: Blob[] = [];

            recorder.ondataavailable = (event) => {
                console.log(`[AVService] Data available: ${event.data.size} bytes`);
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            // Request data every 1 second to ensure we have chunks even if stop is buggy
            recorder.start(1000); 
            console.log('[AVService] Recorder started');

            const recordingInstance = {
                stopAndUnloadAsync: async () => {
                    return new Promise<void>((resolve) => {
                        if (recorder.state === 'inactive') {
                            console.log('[AVService] Recorder already inactive');
                            return resolve();
                        }
                        
                        recorder.onstop = () => {
                            console.log('[AVService] Recorder stopped');
                            stream.getTracks().forEach(track => track.stop());
                            resolve();
                        };
                        recorder.stop();
                    });
                },
                getURI: () => {
                    console.log(`[AVService] getURI called. Chunks: ${chunks.length}`);
                    if (chunks.length === 0) return null;
                    const audioBlob = new Blob(chunks, { type: actualMimeType });
                    console.log(`[AVService] Blob created: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
                    return URL.createObjectURL(audioBlob);
                }
            };

            return { recording: recordingInstance };
        }
    },
    RecordingOptionsPresets: {
        HIGH_QUALITY: {},
        LOW_QUALITY: {},
    },
    Sound: {
        createAsync: async (source: any) => {
            const sound = {
                playAsync: async () => {
                    const audio = new Audio(source.uri);
                    return audio.play();
                },
                stopAsync: async () => {
                    // Basic stop
                },
                unloadAsync: async () => {
                    // Basic unload
                }
            };
            return { sound };
        }
    },
    isSpeakingAsync: async () => false,
    stop: async () => {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
    },
    speak: (text: string, options: any) => {
        if (!window.speechSynthesis) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = options.language || 'hi-IN';
        utterance.rate = options.rate || 1.0;
        utterance.pitch = options.pitch || 1.0;
        window.speechSynthesis.speak(utterance);
    }
};
