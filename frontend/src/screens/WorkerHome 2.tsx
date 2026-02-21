import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Logo } from '../components/Logo';
import { AuthService } from '../services/auth';
import { Storage } from '../services/storage';
import { useNavigation } from '@react-navigation/native';
import { VoiceRecordButton } from '../components/VoiceRecordButton';
import { processLocalCommand } from '../utils/voiceCommandHelper';
import { SpeechService } from '../services/speech';

import { useAuth } from '../context/AuthContext';

export const WorkerHome: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { logout, role } = useAuth();
  const [processingVoice, setProcessingVoice] = React.useState(false);
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = React.useState(true);

  const handleVoiceCommand = (text: string) => {
    return processLocalCommand(text, {
      navigation,
      language: 'hi', // Default to Hindi for now as worker profile might not be fully fetched here
      isVoiceOutputEnabled,
      onLogout: handleLogout,
      role
    });
  };

  const handleVoiceText = (text: string) => {
    if (handleVoiceCommand(text)) return;
    
    // Worker specific commands could be added here
    if (isVoiceOutputEnabled) {
       SpeechService.speak(`I heard ${text}, but I don't have specific worker commands yet.`, { 
         language: 'hi-IN' 
       });
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout', 
      'Are you sure you want to logout? This will clear your local data including calculator memory and tasks.', 
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Logout Error:', error);
              Alert.alert('Error', 'An unexpected error occurred during logout');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ position: 'absolute', top: 50, right: 20, zIndex: 10 }}>
        <VoiceRecordButton 
          onRecordingComplete={() => {}}
          onSpeechEnd={handleVoiceText}
          onSpeechPartial={() => {}}
          onSpeechStart={() => {}}
          isProcessing={processingVoice}
          size={36}
          language={'hi-IN'}
        />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Logo 
          containerStyle={{ position: 'absolute', top: 10, left: 0, right: 0, zIndex: -1 }}
          iconSize={22}
          textStyle={{ fontSize: 18 }}
        />
        <Text style={styles.title}>Worker Dashboard</Text>
        <Text style={styles.subtitle}>Welcome to Agri Worker Portal</Text>
        
        <View style={styles.card}>
          <Text style={styles.cardText}>Work opportunities and tasks will appear here.</Text>
        </View>

        {/* --- Tools Section --- */}
        <View style={styles.toolsSection}>
          <Text style={styles.sectionTitle}>Essential Tools</Text>
          <View style={styles.toolsGrid}>
            <TouchableOpacity 
              style={styles.toolItem}
              onPress={() => navigation.navigate('Calculator')}
            >
              <View style={[styles.toolIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="calculator" size={24} color="#1976D2" />
              </View>
              <Text style={styles.toolLabel}>Calculator</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.toolItem}
              onPress={() => navigation.navigate('CalendarTodo')}
            >
              <View style={[styles.toolIcon, { backgroundColor: '#F3E5F5' }]}>
                <Ionicons name="calendar" size={24} color="#7B1FA2" />
              </View>
              <Text style={styles.toolLabel}>Tasks</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.toolItem}
              onPress={() => navigation.navigate('GovSchemes')}
            >
              <View style={[styles.toolIcon, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="document-text" size={24} color="#F57C00" />
              </View>
              <Text style={styles.toolLabel}>Schemes</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.toolItem}
              onPress={() => navigation.navigate('Machinery')}
            >
              <View style={[styles.toolIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="construct" size={24} color="#388E3C" />
              </View>
              <Text style={styles.toolLabel}>Machinery</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5FDF9' },
  logo: {
    color: '#27AE60',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  content: { padding: 24, alignItems: 'center' },
  title: { color: '#27AE60', fontSize: 32, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: '#666', fontSize: 16, marginBottom: 32, textAlign: 'center' },
  card: { 
    backgroundColor: '#FFFFFF', 
    padding: 24, 
    borderRadius: 24, 
    width: '100%', 
    borderWidth: 1, 
    borderColor: 'rgba(39, 174, 96, 0.1)',
    marginBottom: 32,
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardText: { color: '#1A1A1A', fontSize: 16, textAlign: 'center', lineHeight: 24 },
  toolsSection: {
    width: '100%',
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  toolsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  toolItem: {
    alignItems: 'center',
    width: '22%',
  },
  toolIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  toolLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center', 
  },
  logoutBtn: { 
    padding: 16, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#FF4757',
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  logoutText: { color: '#FF4757', fontWeight: 'bold', fontSize: 16 },
});
