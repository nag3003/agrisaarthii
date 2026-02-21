import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

interface WeatherCardProps {
  temp: number;
  condition: string;
  location: string;
  loading?: boolean;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({ temp, condition, location, loading }) => {
  if (loading) {
    return <View style={[styles.card, styles.loading]}><Text>Loading Weather...</Text></View>;
  }

  const getIcon = (cond: string) => {
    // Simple mapping, normally would use image assets
    if (cond.toLowerCase().includes('rain')) return '🌧️';
    if (cond.toLowerCase().includes('cloud')) return '☁️';
    return '☀️';
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.location}>📍 {location}</Text>
        <Text style={styles.date}>Today</Text>
      </View>
      
      <View style={styles.body}>
        <Text style={styles.icon}>{getIcon(condition)}</Text>
        <View>
          <Text style={styles.temp}>{temp}°C</Text>
          <Text style={styles.condition}>{condition}</Text>
        </View>
      </View>

      <View style={styles.audioHint}>
        <Text style={styles.speaker}>🔊 Tap to hear</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(39, 174, 96, 0.1)',
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  loading: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  location: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  date: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 54,
    marginRight: 20,
  },
  temp: {
    fontSize: 36,
    fontWeight: '800',
    color: '#27AE60',
  },
  condition: {
    fontSize: 18,
    color: '#666',
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  audioHint: {
    marginTop: 12,
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(39, 174, 96, 0.05)',
    paddingTop: 8,
  },
  speaker: {
    fontSize: 12,
    color: '#27AE60',
    fontWeight: '600',
  },
});
