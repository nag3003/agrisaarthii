import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthService } from '../services/auth';
import { Storage } from '../services/storage';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';

export const WorkerHome = () => {
  const navigation = useNavigation<any>();
  const { logout } = useAuth();
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
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Worker Dashboard</Text>
        <Text style={styles.subtitle}>Welcome to AgriSaarthi Worker Portal</Text>
        
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
              onPress={() => navigation.navigate('Calendar')}
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
