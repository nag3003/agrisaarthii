import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LogoProps {
  containerStyle?: ViewStyle;
  textStyle?: TextStyle;
  iconSize?: number;
}

export const Logo: React.FC<LogoProps> = ({ 
  containerStyle, 
  textStyle, 
  iconSize = 24,
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <Ionicons name="leaf" size={iconSize} color="#27AE60" style={styles.icon} />
      <View style={styles.textContainer}>
        <Text style={[styles.agriText, textStyle]}>AGRISARATHI</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 4,
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agriText: {
    color: '#27AE60',
    fontSize: 22,
    fontWeight: '900', // Very bold
    letterSpacing: -1,
  },
});
