import { SpeechService } from '../services/speech';

export interface VoiceCommandOptions {
  navigation: any;
  language: string;
  isVoiceOutputEnabled: boolean;
  onLogout?: () => void;
  role?: string | null;
}

export const processLocalCommand = (text: string, options: VoiceCommandOptions): boolean => {
  const { navigation, language, isVoiceOutputEnabled, onLogout, role } = options;
  const lower = text.toLowerCase();
  const lang = language === 'hi' ? 'hi-IN' : 'en-US';

  // Navigation Commands
  if (lower.includes('crop doctor') || lower.includes('disease') || lower.includes('diagnose')) {
    navigation.navigate('CropDoctor');
    if (isVoiceOutputEnabled) SpeechService.speak("Opening Crop Doctor", { language: lang });
    return true;
  }

  if (lower.includes('soil') || lower.includes('nutrient')) {
    navigation.navigate('SoilHealth');
    if (isVoiceOutputEnabled) SpeechService.speak("Opening Soil Health", { language: lang });
    return true;
  }

  if (lower.includes('market') || lower.includes('price') || lower.includes('mandi')) {
    navigation.navigate('MarketPrice');
    if (isVoiceOutputEnabled) SpeechService.speak("Opening Market Prices", { language: lang });
    return true;
  }

  if (lower.includes('weather') || lower.includes('forecast') || lower.includes('rain')) {
    navigation.navigate('Weather');
    if (isVoiceOutputEnabled) SpeechService.speak("Opening Weather Forecast", { language: lang });
    return true;
  }

  if (lower.includes('task') || lower.includes('todo') || lower.includes('calendar') || lower.includes('schedule')) {
    navigation.navigate('CalendarTodo');
    if (isVoiceOutputEnabled) SpeechService.speak("Opening Tasks", { language: lang });
    return true;
  }

  if (lower.includes('calculator') || lower.includes('calculate')) {
    navigation.navigate('Calculator');
    if (isVoiceOutputEnabled) SpeechService.speak("Opening Calculator", { language: lang });
    return true;
  }

  if (lower.includes('scheme') || lower.includes('government') || lower.includes('yojana')) {
    navigation.navigate('GovSchemes');
    if (isVoiceOutputEnabled) SpeechService.speak("Opening Government Schemes", { language: lang });
    return true;
  }

  if (lower.includes('machinery') || lower.includes('tractor') || lower.includes('tool')) {
    navigation.navigate('Machinery');
    if (isVoiceOutputEnabled) SpeechService.speak("Opening Machinery", { language: lang });
    return true;
  }

  if (lower.includes('job') || lower.includes('work') || lower.includes('hire') || lower.includes('labour') || lower.includes('employment')) {
    navigation.navigate('AgriJobs');
    if (isVoiceOutputEnabled) SpeechService.speak("Opening Agri Jobs Marketplace", { language: lang });
    return true;
  }

  if (lower.includes('video') || lower.includes('tutorial') || lower.includes('learn') || lower.includes('watch')) {
    navigation.navigate('Videos');
    if (isVoiceOutputEnabled) SpeechService.speak("Opening Farming Videos", { language: lang });
    return true;
  }

  if (lower.includes('profile') || lower.includes('account') || lower.includes('setting')) {
    navigation.navigate('Profile');
    if (isVoiceOutputEnabled) SpeechService.speak("Opening Profile", { language: lang });
    return true;
  }

  if (lower.includes('home') || lower.includes('dashboard') || lower.includes('main')) {
    if (role === 'worker') {
      navigation.navigate('WorkerHome');
    } else if (role === 'landowner') {
      navigation.navigate('LandownerHome');
    } else {
      navigation.navigate('Home');
    }
    if (isVoiceOutputEnabled) SpeechService.speak("Going to Home", { language: lang });
    return true;
  }

  if (lower.includes('back') || lower.includes('go back') || lower.includes('previous')) {
    if (navigation.canGoBack()) {
      navigation.goBack();
      if (isVoiceOutputEnabled) SpeechService.speak("Going back", { language: lang });
    }
    return true;
  }

  // "help" / "commands" is handled by processQuery with the full feature list
  // so we do NOT intercept it here — let it fall through

  // Action Commands
  if ((lower.includes('logout') || lower.includes('sign out')) && onLogout) {
    onLogout();
    return true;
  }

  return false;
};
