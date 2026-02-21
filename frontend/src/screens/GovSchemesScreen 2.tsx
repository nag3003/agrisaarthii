import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { ProfileService } from '../services/profile';
import { VoiceRecordButton } from '../components/VoiceRecordButton';
import { processLocalCommand } from '../utils/voiceCommandHelper';
import { SpeechService } from '../services/speech';

interface Scheme {
  id: string;
  title: string;
  description: string;
  benefits: string;
  link: string;
}

const SCHEMES: Scheme[] = [
  {
    id: '1',
    title: 'PM-KISAN',
    description: 'Pradhan Mantri Kisan Samman Nidhi',
    benefits: 'Direct income support of ₹6,000 per year to all landholding farmers.',
    link: 'https://pmkisan.gov.in/',
  },
  {
    id: '2',
    title: 'PM Fasal Bima Yojana',
    description: 'Crop Insurance Scheme',
    benefits: 'Financial support to farmers suffering crop loss/damage arising out of unforeseen events.',
    link: 'https://pmfby.gov.in/',
  },
  {
    id: '3',
    title: 'Soil Health Card Scheme',
    description: 'Soil Health Assessment',
    benefits: 'Helps farmers to understand the nutrient status of their soil and apply appropriate fertilizers.',
    link: 'https://soilhealth.dac.gov.in/',
  },
  {
    id: '4',
    title: 'Kisan Credit Card (KCC)',
    description: 'Credit Support for Farmers',
    benefits: 'Provides adequate and timely credit support from the banking system.',
    link: 'https://www.myscheme.gov.in/schemes/kcc',
  },
];

export const GovSchemesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [processingVoice, setProcessingVoice] = React.useState(false);
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = React.useState(true);
  const [language, setLanguage] = React.useState('hi');

  React.useEffect(() => {
    if (user) {
      ProfileService.getProfile(user.uid).then(p => {
        if (p?.language) setLanguage(p.language);
      });
    }
  }, [user]);

  const handleVoiceCommand = (text: string) => {
    return processLocalCommand(text, {
      navigation,
      language,
      isVoiceOutputEnabled,
      onLogout: () => {
         Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', onPress: logout, style: 'destructive' }
            ]
        );
      }
    });
  };

  const handleVoiceText = (text: string) => {
    if (handleVoiceCommand(text)) return;
    
    // Check for specific scheme queries
    const lower = text.toLowerCase();
    const scheme = SCHEMES.find(s => 
      s.title.toLowerCase().includes(lower) || 
      s.description.toLowerCase().includes(lower) ||
      lower.includes(s.title.toLowerCase())
    );

    if (scheme) {
      if (isVoiceOutputEnabled) {
        SpeechService.speak(`Found scheme: ${scheme.title}. ${scheme.description}`, { 
          language: language === 'hi' ? 'hi-IN' : 'en-US' 
        });
      }
      // Ideally scroll to scheme, but for now just acknowledge
    } else {
       if (isVoiceOutputEnabled) {
        SpeechService.speak(`Sorry, I couldn't find a scheme matching ${text}`, { 
          language: language === 'hi' ? 'hi-IN' : 'en-US' 
        });
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Home');
            }
          }} 
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Government Schemes</Text>
        <View style={{ flex: 1 }} />
        <VoiceRecordButton 
          onRecordingComplete={() => {}}
          onSpeechEnd={handleVoiceText}
          onSpeechPartial={() => {}}
          onSpeechStart={() => {}}
          isProcessing={processingVoice}
          size={36}
          language={language === 'hi' ? 'hi-IN' : 'en-US'}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>Current agricultural schemes and benefits for you.</Text>
        
        {SCHEMES.map(scheme => (
          <View key={scheme.id} style={styles.schemeCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text" size={24} color="#27AE60" />
              <Text style={styles.schemeTitle}>{scheme.title}</Text>
            </View>
            <Text style={styles.schemeDesc}>{scheme.description}</Text>
            <View style={styles.benefitsContainer}>
              <Text style={styles.benefitsLabel}>Benefits:</Text>
              <Text style={styles.benefitsText}>{scheme.benefits}</Text>
            </View>
            <TouchableOpacity 
              style={styles.linkBtn}
              onPress={() => Linking.openURL(scheme.link)}
            >
              <Text style={styles.linkBtnText}>Apply / Learn More</Text>
              <Ionicons name="open-outline" size={16} color="white" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FDF9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0F2E9',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginLeft: 16,
  },
  scrollContent: {
    padding: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 24,
  },
  schemeCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  schemeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginLeft: 12,
  },
  schemeDesc: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  benefitsContainer: {
    backgroundColor: '#F0F9F4',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  benefitsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#27AE60',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  benefitsText: {
    fontSize: 14,
    color: '#1A1A1A',
    lineHeight: 20,
  },
  linkBtn: {
    backgroundColor: '#27AE60',
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkBtnText: {
    color: 'white',
    fontWeight: '600',
    marginRight: 8,
  },
});
