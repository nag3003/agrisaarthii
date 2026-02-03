import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { INDIAN_STATES, POPULAR_DISTRICTS } from '../constants/locations';
import { logger } from '../utils/logger';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AuthService } from '../services/auth';
import { ProfileService, UserProfile } from '../services/profile';
import { Storage } from '../services/storage';
import { useAuth } from '../context/AuthContext';

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, refreshSession, logout } = useAuth(); // Added logout here

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  // Editable fields
  const [editedName, setEditedName] = useState('');
  const [editedState, setEditedState] = useState('');
  const [editedDistrict, setEditedDistrict] = useState('');

  // Modal states
  const [showStateModal, setShowStateModal] = useState(false);
  const [showDistrictModal, setShowDistrictModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [editedPrimaryCrop, setEditedPrimaryCrop] = useState('');
  const [editedLandSize, setEditedLandSize] = useState('');
  const [editedIrrigation, setEditedIrrigation] = useState('');

  // New Enhancements
  const [profileCompletion, setProfileCompletion] = useState(0);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    try {
      if (!user) return;
      setLoading(true);
      const p = await ProfileService.getProfile(user.uid);
      if (p) {
        setProfile(p);
        setEditedName(p.name || '');
        setEditedState(p.state || '');
        setEditedDistrict(p.district || '');
        // Fallback if legacy location string exists but strict fields don't
        if (!p.state && p.location && p.location.includes(',')) {
          const parts = p.location.split(',');
          if (parts.length > 1) {
            setEditedDistrict(parts[0].trim());
            setEditedState(parts[1].trim());
          }
        }
        setEditedPrimaryCrop(p.primaryCrop || '');
        setEditedLandSize(p.landSize ? String(p.landSize) : '');
        setEditedIrrigation(p.irrigationType || '');

        // Calculate completion
        let score = 0;
        if (p.name) score += 20;
        if (p.state && p.district) score += 20;
        if (p.photoURL) score += 20;
        if (p.primaryCrop) score += 20;
        if (p.landSize) score += 10;
        if (p.irrigationType) score += 10;
        setProfileCompletion(score);
      }
    } catch (e) {
      console.error("Profile load error:", e);
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  const performLogout = async () => {
    setShowLogoutModal(false);
    setLoading(true);
    try {
      console.log('Initiating logout...');
      await logout();
    } catch (error: any) {
      console.error('Logout Error:', error);
      Alert.alert('Logout Failed', error.message || 'Please try again.');
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const mounted = React.useRef(true);
  useEffect(() => {
    return () => { mounted.current = false; };
  }, []);

  const handleExportLogs = () => {
    const logs = logger.exportLogs();
    if (Platform.OS === 'web') {
      const blob = new Blob([logs], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agrisarathi_logs_${new Date().getTime()}.txt`;
      a.click();
    } else {
      Alert.alert('Logs', logs.substring(0, 500) + '...');
    }
  };

  const handlePickImage = async () => {
    if (!profile) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need permission to access your gallery.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0].uri) {
      setSaving(true);
      const res = await ProfileService.uploadProfilePicture(profile.uid, result.assets[0].uri);
      if (res.success) {
        const updatedProfile = { ...profile, photoURL: res.url };
        setProfile(updatedProfile);
        await refreshSession();
        Alert.alert('Success', 'Profile picture updated!');
      } else {
        Alert.alert('Error', 'Failed to upload image.');
      }
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);

    // Validate irrigation type
    const validIrrigationTypes = ['Borewell', 'Canal', 'Rainfed'];
    const irrigationType = validIrrigationTypes.includes(editedIrrigation)
      ? (editedIrrigation as 'Borewell' | 'Canal' | 'Rainfed')
      : profile.irrigationType;

    const updatedProfile: UserProfile = {
      ...profile,
      name: editedName,
      location: `${editedDistrict}, ${editedState}`, // Legacy compatibility
      state: editedState,
      district: editedDistrict,
      primaryCrop: editedPrimaryCrop,
      landSize: editedLandSize ? parseFloat(editedLandSize) : 0,
      irrigationType: irrigationType,
    };

    const res = await ProfileService.saveProfile(updatedProfile);
    if (res.success) {
      setProfile(updatedProfile);
      await refreshSession();
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated!');
    } else {
      Alert.alert('Error', 'Failed to update profile.');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27AE60" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={handlePickImage} style={styles.avatarContainer}>
            {profile?.photoURL ? (
              <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={50} color="#AAA" />
              </View>
            )}
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={16} color="white" />
            </View>
          </TouchableOpacity>
          <Text style={styles.userName}>{profile?.name || 'Agri User'}</Text>
          <Text style={styles.userRole}>{(profile?.role || 'User').toUpperCase()}</Text>
          <View style={styles.emailBadge}>
            <Text style={styles.emailText}>{profile?.email}</Text>
          </View>

          {/* Completion Bar */}
          <View style={styles.completionContainer}>
            <View style={styles.completionBar}>
              <View style={[styles.completionFill, { width: `${profileCompletion}%` }]} />
            </View>
            <Text style={styles.completionText}>{profileCompletion}% Complete</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            {!isEditing ? (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Text style={styles.editLink}>Edit Profile</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setIsEditing(false)}>
                <Text style={styles.cancelLink}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Full Name</Text>
              {isEditing ? (
                <TextInput
                  style={styles.infoInput}
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder="Enter name"
                />
              ) : (
                <Text style={styles.infoValue}>{profile?.name || 'Not set'}</Text>
              )}
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>State</Text>
              {isEditing ? (
                <TouchableOpacity onPress={() => setShowStateModal(true)}>
                  <Text style={[styles.infoInput, !editedState && { color: '#999' }]}>
                    {editedState || "Select State"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.infoValue}>{profile?.state || 'Not set'}</Text>
              )}
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>District</Text>
              {isEditing ? (
                <TouchableOpacity onPress={() => {
                  if (!editedState) {
                    Alert.alert("Select State First");
                    return;
                  }
                  setShowDistrictModal(true);
                }}>
                  <Text style={[styles.infoInput, !editedDistrict && { color: '#999' }]}>
                    {editedDistrict || "Select District"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.infoValue}>{profile?.district || 'Not set'}</Text>
              )}
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Account ID</Text>
              <Text style={[styles.infoValue, { fontSize: 10, color: '#AAA' }]}>{profile?.uid}</Text>
            </View>

            {profile?.createdAt && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Joined On</Text>
                <Text style={styles.infoValue}>
                  {new Date(profile.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Farming Preferences</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Primary Crop</Text>
              {isEditing ? (
                <TextInput
                  style={styles.infoInput}
                  value={editedPrimaryCrop}
                  onChangeText={setEditedPrimaryCrop}
                  placeholder="e.g. Wheat, Rice"
                />
              ) : (
                <Text style={styles.infoValue}>{profile?.primaryCrop || 'Not set'}</Text>
              )}
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Land Size (Acres)</Text>
              {isEditing ? (
                <TextInput
                  style={styles.infoInput}
                  value={editedLandSize}
                  onChangeText={setEditedLandSize}
                  placeholder="e.g. 5"
                  keyboardType="numeric"
                />
              ) : (
                <Text style={styles.infoValue}>{profile?.landSize || '0'} Acres</Text>
              )}
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Irrigation Type</Text>
              {isEditing ? (
                <TextInput
                  style={styles.infoInput}
                  value={editedIrrigation}
                  onChangeText={setEditedIrrigation}
                  placeholder="e.g. Drip, Canal"
                />
              ) : (
                <Text style={styles.infoValue}>{profile?.irrigationType || 'Not set'}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Preferences</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Language</Text>
              <TouchableOpacity onPress={() => Alert.alert('Coming Soon', 'Multi-language support is coming in the next update!')}>
                <Text style={styles.infoValue}>English (Default)</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Units</Text>
              <Text style={styles.infoValue}>Metric (Acres, °C)</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Activity</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="chatbubbles-outline" size={20} color="#27AE60" />
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Queries</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="medical-outline" size={20} color="#27AE60" />
              <Text style={styles.statValue}>5</Text>
              <Text style={styles.statLabel}>Diagnosis</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#27AE60" />
              <Text style={styles.statValue}>85%</Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
          </View>
        </View>

        {isEditing && (
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.disabledBtn]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.dangerZoneBtn} onPress={handleLogout}>
          <Text style={styles.dangerZoneText}>Logout from Account</Text>
        </TouchableOpacity>

        {/* Developer Logs (Hidden/Optional) */}
        <TouchableOpacity
          style={[styles.dangerZoneBtn, { marginTop: 10, backgroundColor: '#F0F0F0', borderColor: '#666' }]}
          onPress={() => setShowLogs(!showLogs)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="bug-outline" size={20} color="#666" style={{ marginRight: 8 }} />
            <Text style={[styles.dangerZoneText, { color: '#666' }]}>
              {showLogs ? 'Hide Logs' : 'View System Logs'}
            </Text>
          </View>
        </TouchableOpacity>

        {showLogs && (
          <View style={styles.logsContainer}>
            <View style={styles.logsHeader}>
              <Text style={styles.logsTitle}>System Logs</Text>
              <TouchableOpacity onPress={handleExportLogs}>
                <Text style={styles.exportText}>Export</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.logsList}>
              {logger.getRecentLogs().map((log, i) => (
                <Text key={i} style={[styles.logItem, { color: log.level === 'ERROR' ? '#FF6B6B' : '#666' }]}>
                  {`[${log.level}] [${log.module}] ${log.message}`}
                </Text>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal visible={showLogoutModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 320, padding: 24 }]}>
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <View style={{
                width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF5F5',
                justifyContent: 'center', alignItems: 'center', marginBottom: 16
              }}>
                <Ionicons name="log-out" size={32} color="#FF6B6B" />
              </View>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 8 }}>Log Out?</Text>
              <Text style={{ textAlign: 'center', color: '#666', lineHeight: 22, fontSize: 15 }}>
                Are you sure you want to logout? Your tasks and preferences are safely synced.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: '#F5F5F5', borderRadius: 12, paddingVertical: 14
                }}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={{ fontWeight: '600', color: '#666', fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: '#FF6B6B', borderRadius: 12, paddingVertical: 14
                }}
                onPress={performLogout}
              >
                <Text style={{ fontWeight: '600', color: 'white', fontSize: 16 }}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* State Selector Modal */}
      <Modal visible={showStateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select State</Text>
            <FlatList
              data={INDIAN_STATES}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => {
                  setEditedState(item);
                  setEditedDistrict(''); // Reset district
                  setShowStateModal(false);
                }}>
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowStateModal(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* District Selector Modal */}
      <Modal visible={showDistrictModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select District for {editedState}</Text>
            <FlatList
              data={POPULAR_DISTRICTS[editedState] || POPULAR_DISTRICTS['default']}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => {
                  setEditedDistrict(item);
                  setShowDistrictModal(false);
                }}>
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowDistrictModal(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5FDF9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(39, 174, 96, 0.1)',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  backBtn: { padding: 4 },
  logoutBtn: { padding: 4 },
  profileHeader: { alignItems: 'center', paddingVertical: 30, backgroundColor: 'white' },
  avatarContainer: { position: 'relative' },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#27AE60' },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#27AE60',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#1A1A1A', marginTop: 12 },
  userRole: { fontSize: 12, fontWeight: 'bold', color: '#27AE60', marginTop: 4, letterSpacing: 1 },
  emailBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8
  },
  completionContainer: {
    width: '60%',
    marginTop: 15,
    alignItems: 'center',
  },
  completionBar: {
    height: 6,
    width: '100%',
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginBottom: 4,
  },
  completionFill: {
    height: '100%',
    backgroundColor: '#27AE60',
    borderRadius: 3,
  },
  completionText: {
    fontSize: 10,
    color: '#666',
    fontWeight: 'bold',
  },
  emailText: { fontSize: 12, color: '#666' },
  section: { padding: 16 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },
  editLink: { color: '#27AE60', fontWeight: 'bold' },
  cancelLink: { color: '#FF6B6B', fontWeight: 'bold' },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: { fontSize: 14, color: '#666' },
  infoValue: { fontSize: 14, color: '#1A1A1A', fontWeight: '500' },
  infoInput: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
    borderBottomWidth: 1,
    borderBottomColor: '#27AE60',
    padding: 0,
    minWidth: 150,
    textAlign: 'right',
  },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#27AE60', marginVertical: 4 },
  statLabel: { fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 },
  saveBtn: {
    margin: 16,
    backgroundColor: '#27AE60',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  disabledBtn: { opacity: 0.6 },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  dangerZoneBtn: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
  },
  dangerZoneText: { color: '#FF6B6B', fontWeight: 'bold' },
  logsContainer: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 8,
  },
  logsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  exportText: {
    color: '#27AE60',
    fontWeight: 'bold',
    fontSize: 12,
  },
  logsList: {
    flex: 1,
  },
  logItem: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20
  },
  modalContent: {
    backgroundColor: 'white', borderRadius: 16, maxHeight: '80%', padding: 20
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalItemText: { fontSize: 16 },
  closeBtn: { marginTop: 16, alignItems: 'center', padding: 12, backgroundColor: '#F0F0F0', borderRadius: 8 },
  closeBtnText: { color: '#666', fontWeight: 'bold' },
});
