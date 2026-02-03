import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface OfflineIndicatorProps {
  forceOffline?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ forceOffline }) => {
  // In a real app, use @react-native-community/netinfo
  // For this step, we use the forceOffline prop from HomeScreen's health check
  
  if (!forceOffline) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>⚠️ System is offline. Voice features may not work.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF5F5',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 71, 87, 0.1)',
  },
  text: {
    color: '#FF4757',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
