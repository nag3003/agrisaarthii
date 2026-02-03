import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthService } from '../services/auth';
import { ProfileService, UserRole, UserProfile } from '../services/profile';
import { Storage } from '../services/storage';

import { useAuth } from '../context/AuthContext';

export const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { refreshSession } = useAuth();
  const user = AuthService.getCurrentUser();

  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('farmer');
  const [crop, setCrop] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const saveProfile = async () => {
    if (!user) {
      Alert.alert('Error', 'No authenticated user found');
      return;
    }

    if (!name.trim() || !location.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (role === 'farmer' && !crop.trim()) {
      Alert.alert('Error', 'Please specify your primary crop');
      return;
    }

    try {
      setLoading(true);
      const profile: UserProfile = {
        uid: user.uid,
        name: name.trim(),
        email: user.email || '',
        role,
        location: location.trim(),
        language: 'en',
        primaryCrop: role === 'farmer' ? crop.trim() : undefined,
      };

      const result = await ProfileService.saveProfile(profile);

      if (!result.success) {
        throw new Error(result.error);
      }
      
      const userSession = {
        uid: user.uid,
        email: user.email || '',
        role: role
      };

      await Storage.saveUser(userSession);
      await refreshSession();
      
      Alert.alert('Success', 'Profile created successfully!');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Setup Profile</Text>
        <Text style={styles.subtitle}>Tell us more about yourself to personalize your experience</Text>

        <TextInput 
          style={styles.input} 
          placeholder="Your Name" 
          placeholderTextColor="#666"
          onChangeText={setName} 
          value={name}
        />
        
        <TextInput 
          style={styles.input} 
          placeholder="Village / Location" 
          placeholderTextColor="#666"
          onChangeText={setLocation} 
          value={location}
        />

        <Text style={styles.label}>Select Your Role</Text>
        <View style={styles.roleRow}>
          {(['farmer', 'worker', 'landowner'] as UserRole[]).map(r => (
            <TouchableOpacity 
              key={r} 
              style={[styles.roleBtn, role === r && styles.roleActive]} 
              onPress={() => setRole(r)}
            > 
              <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
                {r.toUpperCase()}
              </Text> 
            </TouchableOpacity> 
          ))} 
        </View> 

        {role === 'farmer' && ( 
          <TextInput 
            style={styles.input} 
            placeholder="Primary Crop (e.g., Rice, Cotton)" 
            placeholderTextColor="#666"
            onChangeText={setCrop} 
            value={crop}
          /> 
        )} 

        <TouchableOpacity 
          style={[styles.btn, loading && styles.btnDisabled]} 
          onPress={saveProfile}
          disabled={loading}
        > 
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnText}>Continue</Text> 
          )}
        </TouchableOpacity> 
      </ScrollView>
    </SafeAreaView>
  ); 
}; 

const styles = StyleSheet.create({ 
  safe: { flex: 1, backgroundColor: '#F5FDF9' },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' }, 
  title: { color: '#27AE60', fontSize: 32, fontWeight: '800', textAlign: 'center', marginBottom: 8 }, 
  subtitle: { color: '#666', fontSize: 16, textAlign: 'center', marginBottom: 32 },
  label: { color: '#1A1A1A', fontSize: 16, marginBottom: 12, fontWeight: '700' },
  input: { 
    backgroundColor: '#FFFFFF', 
    borderColor: 'rgba(39, 174, 96, 0.2)', 
    borderWidth: 1.5, 
    borderRadius: 16, 
    padding: 16, 
    color: '#1A1A1A', 
    marginBottom: 20, 
    fontSize: 16,
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  }, 
  roleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }, 
  roleBtn: { 
    flex: 1, 
    margin: 4, 
    padding: 14, 
    borderRadius: 12, 
    borderWidth: 1.5, 
    borderColor: 'rgba(39, 174, 96, 0.2)', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF',
  }, 
  roleActive: { backgroundColor: '#27AE60', borderColor: '#27AE60' }, 
  roleText: { color: '#27AE60', fontWeight: 'bold', fontSize: 12 }, 
  roleTextActive: { color: '#FFFFFF' },
  btn: { 
    backgroundColor: '#27AE60', 
    padding: 18, 
    borderRadius: 16, 
    alignItems: 'center', 
    marginTop: 10,
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  }, 
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 18 }, 
}); 
