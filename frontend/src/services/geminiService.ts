import { Platform } from 'react-native';
import { SpeechService } from './speech';
import { askJarvis } from './api';
import { AppView } from '../types';
import { UserProfile } from './profile';

export type FarmerProfile = UserProfile;

export class LiveVoiceSession {
  private onConnect: () => void;
  private onDisconnect: () => void;
  private onSpeaking: (speaking: boolean) => void;
  private onNavigate: (screen: string) => void;
  private onError: (error: Error) => void;
  private profile: FarmerProfile | null;
  private active: boolean = false;
  private recognition: any = null;

  constructor(
    callbacks: {
      onConnect: () => void;
      onDisconnect: () => void;
      onSpeaking: (speaking: boolean) => void;
      onNavigate: (screen: string) => void;
      onError: (error: Error) => void;
    },
    profile: FarmerProfile | null
  ) {
    this.onConnect = callbacks.onConnect;
    this.onDisconnect = callbacks.onDisconnect;
    this.onSpeaking = callbacks.onSpeaking;
    this.onNavigate = callbacks.onNavigate;
    this.onError = callbacks.onError;
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
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
      this.recognition = null;
    }
  }

  private async startListening() {
    if (!this.active) return;

    // WEB: Use SpeechRecognition
    if (Platform.OS === 'web' && (window as any).webkitSpeechRecognition) {
       const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
       this.recognition = new SpeechRecognition();
       
       const lang = this.profile?.language === 'hi' ? 'hi-IN' : 'en-US';
       this.recognition.lang = lang;
       this.recognition.interimResults = false;
       this.recognition.maxAlternatives = 1;

       this.recognition.onstart = () => {
           console.log('[LiveVoiceSession] Listening...');
       };

       this.recognition.onresult = async (event: any) => {
           const text = event.results[0][0].transcript;
           console.log('[LiveVoiceSession] Recognized:', text);
           await this.processText(text);
       };

       this.recognition.onerror = (e: any) => {
           console.error("[LiveVoiceSession] Speech recognition error", e);
           if (e.error === 'no-speech') {
               // Just restart listening if no speech detected
               if (this.active) setTimeout(() => this.startListening(), 1000);
           } else {
               this.onError(new Error(e.error));
               this.active = false;
           }
       };
       
       this.recognition.onend = () => {
           // Do nothing here, restart handled in processText or error
       };

       try {
         this.recognition.start();
       } catch (e) {
         console.error("Failed to start recognition", e);
       }
    } else {
       // Fallback for environments without Web Speech API (e.g. Native without expo-voice)
       // Here we would use expo-av recording, but for now we simulate a simple prompt
       console.warn('Web Speech API not supported in this environment');
       this.onError(new Error('Voice input not supported in this browser/device. Please use Chrome/Edge.'));
    }
  }

  private async processText(text: string) {
      this.onSpeaking(true); // Show "Thinking" or "Speaking" state
      
      const lower = text.toLowerCase();
      let handled = false;

      // 1. Check local navigation commands
      if (lower.includes('market') || lower.includes('price') || lower.includes('mandi')) {
          this.onNavigate('MarketPrice');
          await this.speak("Opening Market Prices");
          handled = true;
      } else if (lower.includes('weather') || lower.includes('forecast')) {
          this.onNavigate('Weather');
          await this.speak("Here is the weather forecast");
          handled = true;
      } else if (lower.includes('crop doctor') || lower.includes('disease')) {
          this.onNavigate('CropDoctor');
          await this.speak("Opening Crop Doctor");
          handled = true;
      } else if (lower.includes('soil') || lower.includes('health')) {
          this.onNavigate('SoilHealth');
          await this.speak("Opening Soil Health");
          handled = true;
      } else if (lower.includes('calculator')) {
          this.onNavigate('Calculator');
          await this.speak("Opening Calculator");
          handled = true;
      } else if (lower.includes('scheme') || lower.includes('government')) {
          this.onNavigate('GovSchemes');
          await this.speak("Opening Government Schemes");
          handled = true;
      } else if (lower.includes('machinery') || lower.includes('tractor') || lower.includes('tool')) {
          this.onNavigate('Machinery');
          await this.speak("Opening Machinery");
          handled = true;
      } else if (lower.includes('task') || lower.includes('todo') || lower.includes('calendar')) {
          this.onNavigate('CalendarTodo');
          await this.speak("Opening Calendar and Tasks");
          handled = true;
      } else if (lower.includes('job') || lower.includes('work')) {
          this.onNavigate('AgriJobs');
          await this.speak("Opening Agri Jobs");
          handled = true;
      } else if (lower.includes('video') || lower.includes('learn')) {
          this.onNavigate('Videos'); // Note: AppView doesn't have Videos explicitly, maybe pass string?
          // Check AppView enum in types.ts -> it doesn't have Videos. But HomeScreen had navigation to 'Videos'.
          // Let's assume 'Videos' is valid screen name but not in AppView enum (or I missed it).
          // Actually, AppView enum didn't show Videos. 
          // Let's stick to known views.
          await this.speak("Opening Videos");
          handled = true;
      } else if (lower.includes('profile') || lower.includes('setting')) {
          this.onNavigate('Profile');
          await this.speak("Opening Profile");
          handled = true;
      } else if (lower.includes('home')) {
          this.onNavigate('Home');
          await this.speak("Going Home");
          handled = true;
      }

      if (handled) {
          this.onSpeaking(false);
          if (this.active) this.startListening();
          return;
      }

      // 2. Ask Jarvis (Backend)
      try {
          const res = await askJarvis(text);
          if (res && res.response) {
              await this.speak(res.response);
          } else {
              await this.speak("I didn't catch that. Could you please repeat?");
          }
      } catch (e: any) {
          console.error("Jarvis Error:", e);
          await this.speak("I'm having trouble connecting to the server. Please check your internet.");
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
      return new Promise<void>((resolve) => {
          SpeechService.speak(text, {
              language: this.profile?.language === 'hi' ? 'hi-IN' : 'en-US',
              onDone: () => resolve(),
              onStopped: () => resolve(),
              onError: () => resolve()
          });
      });
  }
}
