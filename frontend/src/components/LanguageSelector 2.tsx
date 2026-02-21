import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

interface Language {
  code: string;
  name: string; // English Name
  nativeName: string; // Native Script
  audioUrl?: string; // URL to autoplay "Select Hindi"
}

interface LanguageSelectorProps {
  onSelect: (langCode: string) => void;
}

const LANGUAGES: Language[] = [
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'en', name: 'English', nativeName: 'English' },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ onSelect }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Language / भाषा चुनें</Text>
      
      <View style={styles.grid}>
        {LANGUAGES.map((lang) => (
          <TouchableOpacity 
            key={lang.code} 
            style={styles.card}
            onPress={() => onSelect(lang.code)}
          >
            <Text style={styles.nativeText}>{lang.nativeName}</Text>
            <Text style={styles.engText}>{lang.name}</Text>
            <Text style={styles.speaker}>🔊</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F5FDF9',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 40,
    color: '#27AE60',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(39, 174, 96, 0.1)',
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  nativeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  engText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  speaker: {
    marginTop: 12,
    fontSize: 18,
    color: '#27AE60',
  },
});
