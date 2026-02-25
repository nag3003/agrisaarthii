import { Platform, Alert } from 'react-native';
import { SpeechService } from './speech';
import { getAdvice, sendVoice } from './api';
import { AVService } from './av';
import { AppView } from '../types';
import { UserProfile } from './profile';

export type FarmerProfile = UserProfile;

export class LiveVoiceSession {
  private onConnect: () => void;
  private onDisconnect: () => void;
  private onSpeaking: (speaking: boolean) => void;
  private onNavigate: (screen: string) => void;
  private onError: (error: Error) => void;
  private onTranscript: (text: string) => void;
  private profile: FarmerProfile | null;
  private active: boolean = false;
  private recognition: any = null;
  private recording: any = null;
  private recordingTimeout: any = null;
  private processing: boolean = false;

  constructor(
    callbacks: {
      onConnect: () => void;
      onDisconnect: () => void;
      onSpeaking: (speaking: boolean) => void;
      onNavigate: (screen: string) => void;
      onError: (error: Error) => void;
      onTranscript?: (text: string) => void;
    },
    profile: FarmerProfile | null
  ) {
    this.onConnect = callbacks.onConnect;
    this.onDisconnect = callbacks.onDisconnect;
    this.onSpeaking = callbacks.onSpeaking;
    this.onNavigate = callbacks.onNavigate;
    this.onError = callbacks.onError;
    this.onTranscript = callbacks.onTranscript || (() => {});
    this.profile = profile;
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.onConnect();
    this.startListening();
  }

  stop() {
    this.active = false;
    this.onDisconnect();
    SpeechService.stop();
    
    // Stop Web Recognition
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
      this.recognition = null;
    }

    // Stop Native Recording
    if (this.recording) {
        try {
            this.recording.stopAndUnloadAsync();
        } catch (e) {}
        this.recording = null;
    }
    if (this.recordingTimeout) {
        clearTimeout(this.recordingTimeout);
        this.recordingTimeout = null;
    }
  }

  restart() {
    this.stop();
    setTimeout(() => {
      this.start();
    }, 300);
  }

  // Public method to manually stop listening and process (for Native "Tap to Stop")
  async stopListeningAndProcess() {
      if (Platform.OS === 'web') {
          // On web, we might just stop recognition
          if (this.recognition) this.recognition.stop();
          return;
      }

      if (this.recording) {
          console.log('[LiveVoiceSession] Manual stop requested');
          if (this.recordingTimeout) clearTimeout(this.recordingTimeout);
          await this.stopNativeRecordingAndProcess();
      }
  }

  private async startListening() {
    if (!this.active) return;

    // WEB: Use SpeechRecognition
    if (Platform.OS === 'web') {
       try {
         const media = await (navigator.mediaDevices && navigator.mediaDevices.getUserMedia
           ? navigator.mediaDevices.getUserMedia({ audio: true })
           : Promise.reject(new Error('getUserMedia not available')));
         if (media && media.getTracks) {
           media.getTracks().forEach(t => t.stop());
         }
       } catch (permErr) {
         this.onError(new Error('Microphone permission denied. Please allow access.'));
         this.active = false;
         return;
       }
       // 1. Check for SpeechRecognition (Standard or Webkit)
       const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

       if (SpeechRecognition) {
          console.log('[LiveVoiceSession] Using Web Speech API');
          this.recognition = new SpeechRecognition();
          
          const lang = this.profile?.language === 'hi' ? 'hi-IN' : 'en-US';
          this.recognition.lang = lang;
          this.recognition.interimResults = true;
          this.recognition.maxAlternatives = 1;
          this.recognition.continuous = false; // Stop after one sentence

          this.recognition.onstart = () => {
              console.log('[LiveVoiceSession] Listening...');
          };

          this.recognition.onresult = async (event: any) => {
              let finalText = '';
              let interimText = '';
              for (let i = event.resultIndex; i < event.results.length; i++) {
                const res = event.results[i];
                if (res.isFinal) {
                  finalText += res[0].transcript;
                } else {
                  interimText += res[0].transcript;
                }
              }
              if (interimText) {
                this.onTranscript(interimText);
              }
              if (finalText) {
                this.onTranscript(finalText);
                this.processing = true; 
                try {
                    await this.processText(finalText);
                } finally {
                    this.processing = false;
                }
              }
          };

          this.recognition.onerror = (e: any) => {
              console.error("[LiveVoiceSession] Speech recognition error", e);
              if (e.error === 'no-speech') {
                  // Just restart listening if no speech detected
                  if (this.active && !this.processing) {
                    try {
                      this.recognition.stop();
                    } catch (err) {}
                    setTimeout(() => this.startListening(), 500);
                  }
              } else if (e.error === 'not-allowed' || e.error === 'permission-denied') {
                  this.onError(new Error('Microphone permission denied. Please allow access in browser settings.'));
                  this.active = false;
              } else if (e.error === 'network') {
                  console.warn('[LiveVoiceSession] Network error, falling back to audio recording');
                  this.startNativeRecording();
              } else {
                  // For other errors, try to restart unless fatal
                  if (this.active && !this.processing) {
                     setTimeout(() => this.startListening(), 1000);
                  }
              }
          };
          
          this.recognition.onend = () => {
              // Restart if active and not processing (e.g. silence timeout)
              if (this.active && !this.processing) {
                  console.log('[LiveVoiceSession] Restarting listening (onend)');
                  setTimeout(() => this.startListening(), 500); 
              }
          };

          try {
            this.recognition.start();
          } catch (e) {
            console.error("Failed to start recognition", e);
            // If already started, ignore
          }
       } else {
         // Fallback: Show alert for incompatible browser
         console.warn('Web Speech API not supported in this environment');
         // Try native fallback logic even on web if API missing?
         this.startNativeRecording();
       }
    } else {
       // Native Fallback
       this.startNativeRecording();
    }
  }

  private async startNativeRecording() {
      console.log('[LiveVoiceSession] Starting Native Recording...');
      try {
          const { status } = await AVService.requestPermissionsAsync();
          if (status !== 'granted') {
              this.onError(new Error('Microphone permission denied'));
              this.active = false;
              return;
          }

          await AVService.setAudioModeAsync({
              allowsRecordingIOS: true,
              playsInSilentModeIOS: true,
          });

          const { recording } = await AVService.Recording.createAsync(
              AVService.RecordingOptionsPresets.HIGH_QUALITY
          );
          
          this.recording = recording;
          
          // Auto-stop after 7 seconds if no manual stop
          this.recordingTimeout = setTimeout(() => {
              console.log('[LiveVoiceSession] Auto-stopping recording after timeout');
              this.stopNativeRecordingAndProcess();
          }, 7000);

      } catch (err) {
          console.error('[LiveVoiceSession] Failed to start recording:', err);
          this.onError(new Error('Failed to start microphone'));
          this.active = false;
      }
  }

  private async stopNativeRecordingAndProcess() {
      if (!this.recording) return;

      try {
          console.log('[LiveVoiceSession] Stopping recording...');
          await this.recording.stopAndUnloadAsync();
          const uri = this.recording.getURI();
          this.recording = null;

          if (uri) {
              this.onSpeaking(true); // Show "Thinking"
              try {
                  const response = await sendVoice(uri);
                  if (response && response.text) {
                      console.log('[LiveVoiceSession] Recognized (Server):', response.text);
                      this.onTranscript(response.text); // Update UI with text
                      await this.processText(response.text);
                  } else {
                      console.log('[LiveVoiceSession] No text from server');
                      // Retry listening?
                      if (this.active) {
                          await this.speak("I didn't hear anything.");
                          this.startListening();
                      }
                  }
              } catch (sendError: any) {
                  console.error('[LiveVoiceSession] SendVoice Error:', sendError);
                  // Check for connection/network errors
                  if (sendError.message.includes('Network') || 
                      sendError.message.includes('connect') || 
                      sendError.message.includes('timeout') ||
                      sendError.message.includes('Server error')) {
                      this.onError(new Error(`Connection failed: ${sendError.message}`));
                      this.active = false; // Stop trying
                  } else {
                      // Non-critical error, maybe just didn't catch audio
                      if (this.active) {
                          this.startListening();
                      }
                  }
              }
          }
      } catch (error) {
          console.error('[LiveVoiceSession] Error processing native voice:', error);
          if (this.active) {
             this.startListening();
          }
      }
  }

  public async processText(text: string) {
      this.onSpeaking(true); // Show "Thinking" or "Speaking" state
      
      const lower = text.toLowerCase();
      let handled = false;

      // 1. Check local navigation commands
      if (lower.includes('market') || lower.includes('price') || lower.includes('mandi')) {
          this.onNavigate('MarketPrice');
          await this.speak("Opening Market Prices");
          handled = true;
      } else if (lower.includes('weather') || lower.includes('forecast') || lower.includes('rain')) {
          this.onNavigate('Weather');
          await this.speak("Checking the Weather");
          handled = true;
      } else if (lower.includes('crop doctor') || lower.includes('disease') || lower.includes('diagnosis')) {
          this.onNavigate('CropDoctor');
          await this.speak("Opening Crop Doctor");
          handled = true;
      } else if (lower.includes('soil') || lower.includes('health')) {
          this.onNavigate('SoilHealth');
          await this.speak("Opening Soil Health");
          handled = true;
      } else if (lower.includes('calculator') || lower.includes('calculate')) {
          this.onNavigate('Calculator');
          await this.speak("Opening Calculator");
          handled = true;
      } else if (lower.includes('scheme') || lower.includes('government') || lower.includes('subsidy')) {
          this.onNavigate('GovSchemes');
          await this.speak("Opening Government Schemes");
          handled = true;
      } else if (lower.includes('machinery') || lower.includes('tractor') || lower.includes('tool')) {
          this.onNavigate('Machinery');
          await this.speak("Opening Machinery");
          handled = true;
      } else if (lower.includes('task') || lower.includes('todo') || lower.includes('calendar') || lower.includes('schedule')) {
          this.onNavigate('CalendarTodo');
          await this.speak("Opening Calendar and Tasks");
          handled = true;
      } else if (lower.includes('job') || lower.includes('work') || lower.includes('employment')) {
          this.onNavigate('AgriJobs');
          await this.speak("Opening Agri Jobs");
          handled = true;
      } else if (lower.includes('video') || lower.includes('learn') || lower.includes('watch') || lower.includes('tutorial')) {
          this.onNavigate('Videos'); 
          await this.speak("Opening Learning Videos");
          handled = true;
      } else if (lower.includes('profile') || lower.includes('setting') || lower.includes('account')) {
          this.onNavigate('Profile');
          await this.speak("Opening Profile");
          handled = true;
      } else if (lower.includes('home') || lower.includes('dashboard') || lower.includes('main')) {
          this.onNavigate('Home');
          await this.speak("Going to Home Dashboard");
          handled = true;
      } else if (lower.includes('worker') || lower.includes('labour')) {
          this.onNavigate('WorkerHome');
          await this.speak("Switching to Worker View");
          handled = true;
      } else if (lower.includes('landowner') || lower.includes('owner')) {
          this.onNavigate('LandownerHome');
          await this.speak("Switching to Landowner View");
          handled = true;
      } else if (lower.includes('login') || lower.includes('sign in') || lower.includes('logout')) {
          this.onNavigate('Login');
          await this.speak("Going to Login Screen");
          handled = true;
      } else if (lower.includes('onboard') || lower.includes('start')) {
          this.onNavigate('Onboarding');
          await this.speak("Restarting Onboarding");
          handled = true;
      } else if (lower.includes('navigate') || lower.includes('go to') || lower.includes('open')) {
          // Fallback for explicit navigation commands that might have been missed by specific keywords
          // This is a "catch-all" attempt for "go to calculator" if "calculator" wasn't enough (though it should have been)
          // But maybe they said "open cal" or something?
          // Let's check for specific partial matches again if needed, or rely on the list above.
          // The list above uses 'includes', so "go to calculator" should have matched line 274.
          
          // But just in case, let's look for known screens in the text again
          if (lower.includes('cal')) {
               this.onNavigate('Calculator');
               await this.speak("Opening Calculator");
               handled = true;
          } else if (lower.includes('doc')) {
               this.onNavigate('CropDoctor');
               await this.speak("Opening Crop Doctor");
               handled = true;
          }
      }

      if (handled) {
          this.onSpeaking(false);
          if (this.active) this.startListening();
          return;
      }

      // 2. Ask Advisory Engine (Backend)
      try {
          const res = await getAdvice(text, {
              crop: this.profile?.primaryCrop,
              landSize: this.profile?.landSize,
              irrigation: this.profile?.irrigationType,
              risk: this.profile?.riskLevel,
              language: this.profile?.language || 'hi',
          });
          if (res && res.advice && res.advice.advice) {
              await this.speak(res.advice.advice);
          } else {
              await this.speak("I couldn't find specific advice for that. Could you please rephrase?");
          }
      } catch (e: any) {
          console.error("Advisory Error:", e);
          await this.speak("I'm having trouble connecting to the advisory server. Please check your internet.");
      } finally {
          this.onSpeaking(false);
          // Restart listening for continuous conversation
          if (this.active) {
              setTimeout(() => this.startListening(), 500);
          }
      }
  }

  private async speak(text: string) {
      if (!text) return;
      this.onSpeaking(true); // Ensure visualizer is active during voice output
      // Play a subtle thinking beep before speaking
      if (Platform.OS === 'web') SpeechService.beep(700, 100, 0.05);
      return new Promise<void>((resolve) => {
          SpeechService.speak(text, {
              language: this.profile?.language === 'hi' ? 'hi-IN' : 'en-US',
              onDone: () => {
                this.onSpeaking(false);
                resolve();
              },
              onStopped: () => {
                this.onSpeaking(false);
                resolve();
              },
              onError: () => {
                this.onSpeaking(false);
                resolve();
              }
          });
      });
  }
}
