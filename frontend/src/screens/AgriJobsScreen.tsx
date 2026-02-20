import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Linking,
  Modal,
  Platform,
  Alert,
  KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppView } from '../types';
import { processLocalCommand } from '../utils/voiceCommandHelper';
import { SpeechService } from '../services/speech';
import { useAuth } from '../context/AuthContext';
import { ProfileService } from '../services/profile';
import { VoiceRecordButton } from '../components/VoiceRecordButton';

interface Job {
  id: string;
  title: string;
  author: string;
  price: string;
  description: string;
  duration: string;
  startDate: string;
  distance: string;
  icon: string;
  iconColor: string;
  bg: string;
  applied?: boolean;
}

const INITIAL_JOBS: Job[] = [
  {
    id: '1',
    title: 'Harvesting • Cotton',
    author: 'Ramesh Patil',
    price: '₹450/Day',
    description: '"Need 3 people for cotton picking. Refreshments provided."',
    duration: '5 Days',
    startDate: '2025-10-15',
    distance: '2.5 km',
    icon: 'leaf',
    iconColor: '#FF9800',
    bg: '#FFF3E0'
  },
  {
    id: '2',
    title: 'Weeding • Soybean',
    author: 'Suresh Kumar',
    price: '₹400/Day',
    description: '"Looking for seasonal help for field weeding."',
    duration: '3 Days',
    startDate: '2025-10-12',
    distance: '2.5 km',
    icon: 'sunny',
    iconColor: '#FF5722',
    bg: '#FBE9E7'
  },
  {
    id: '3',
    title: 'Plowing • Tractor Driver',
    author: 'Vijay Singh',
    price: '₹800/Day',
    description: '"Need experienced tractor driver for 2 days."',
    duration: '2 Days',
    startDate: '2025-10-18',
    distance: '4.0 km',
    icon: 'construct',
    iconColor: '#795548',
    bg: '#EFEBE9'
  }
];

export const AgriJobsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'find' | 'hire'>('find');
  const [searchQuery, setSearchQuery] = useState('');
  const [jobs, setJobs] = useState<Job[]>(INITIAL_JOBS);
  const [modalVisible, setModalVisible] = useState(false);
  const [processingVoice, setProcessingVoice] = useState(false);
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState(true);
  const [language, setLanguage] = useState('hi');

  React.useEffect(() => {
    if (user) {
      ProfileService.getProfile(user.uid).then(p => {
        if (p?.language) setLanguage(p.language);
      });
    }
  }, [user]);

  // New Job Form State
  const [newJob, setNewJob] = useState({
    title: '',
    price: '',
    description: '',
    duration: '',
    startDate: ''
  });

  const handleApply = (jobId: string) => {
    setJobs(currentJobs => 
      currentJobs.map(job => 
        job.id === jobId ? { ...job, applied: true } : job
      )
    );
    Alert.alert('Application Sent', 'The farmer will contact you shortly.');
  };

  const handleUnapply = (jobId: string) => {
    Alert.alert(
      "Withdraw Application",
      "Are you sure you want to withdraw your application?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Withdraw",
          style: "destructive",
          onPress: () => {
            setJobs(currentJobs =>
              currentJobs.map(job =>
                job.id === jobId ? { ...job, applied: false } : job
              )
            );
          }
        }
      ]
    );
  };

  const handleDeleteJob = (jobId: string) => {
    Alert.alert(
      "Delete Job Post",
      "Are you sure you want to delete this job post?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setJobs(currentJobs => currentJobs.filter(job => job.id !== jobId));
          }
        }
      ]
    );
  };

  const handlePostJob = () => {
    if (!newJob.title || !newJob.price || !newJob.description) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    const job: Job = {
      id: Date.now().toString(),
      title: newJob.title,
      author: 'You',
      price: `₹${newJob.price}/Day`,
      description: `"${newJob.description}"`,
      duration: newJob.duration || 'Flexible',
      startDate: newJob.startDate || 'Tomorrow',
      distance: '0 km',
      icon: 'briefcase',
      iconColor: '#2E7D32',
      bg: '#E8F5E9'
    };

    setJobs(prev => [job, ...prev]);
    setModalVisible(false);
    setNewJob({ title: '', price: '', description: '', duration: '', startDate: '' });
    setActiveTab('find'); // Switch to view the new job
    Alert.alert('Success', 'Your job post is now live!');
  };

  const handleCall = () => {
    Linking.openURL('tel:1234567890');
  };

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
    
    // AgriJobs specific commands
    const lower = text.toLowerCase();
    
    // Switch tabs
    if (lower.includes('hire') || lower.includes('post')) {
       setActiveTab('hire');
       if (isVoiceOutputEnabled) SpeechService.speak("Switching to Hire mode", { language: language === 'hi' ? 'hi-IN' : 'en-US' });
       return;
    }
    
    if (lower.includes('find') || lower.includes('search')) {
       setActiveTab('find');
       if (isVoiceOutputEnabled) SpeechService.speak("Switching to Find Work mode", { language: language === 'hi' ? 'hi-IN' : 'en-US' });
       return;
    }

    // Search
    setSearchQuery(text);
    if (isVoiceOutputEnabled) {
      SpeechService.speak(`Searching for ${text}`, { language: language === 'hi' ? 'hi-IN' : 'en-US' });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AgriJobs Marketplace</Text>
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

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'find' && styles.activeTab]}
          onPress={() => setActiveTab('find')}
        >
          <Ionicons 
            name="search" 
            size={18} 
            color={activeTab === 'find' ? '#2E7D32' : '#666'} 
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.tabText, activeTab === 'find' && styles.activeTabText]}>
            Find Work
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'hire' && styles.activeTab]}
          onPress={() => setActiveTab('hire')}
        >
          <Ionicons 
            name="people" 
            size={18} 
            color={activeTab === 'hire' ? '#2E7D32' : '#666'} 
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.tabText, activeTab === 'hire' && styles.activeTabText]}>
            Hire Workers
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      {activeTab === 'find' && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search farm tasks..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
          </View>
        </View>
      )}

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={20} color="#2196F3" />
        <Text style={styles.infoText}>
          Browse local farm tasks. "Apply" will share your profile with the hiring farmer so they can contact you.
        </Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        {activeTab === 'find' ? (
          <View style={styles.list}>
            {jobs.map(job => (
              <View key={job.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.iconBox, { backgroundColor: job.bg }]}>
                    <Ionicons name={job.icon as any} size={24} color={job.iconColor} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.cardTitle}>{job.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <Ionicons name="person-circle-outline" size={14} color="#666" />
                      <Text style={styles.cardAuthor}>Posted by {job.author}</Text>
                    </View>
                  </View>
                  <View style={styles.priceTag}>
                    <Text style={styles.priceText}>{job.price}</Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.quoteLine} />
                  <Text style={styles.cardDesc}>{job.description}</Text>
                </View>

                <View style={styles.tagsRow}>
                  <View style={styles.tag}>
                    <Ionicons name="time-outline" size={12} color="#555" />
                    <Text style={styles.tagText}>{job.duration}</Text>
                  </View>
                  <View style={styles.tag}>
                    <Ionicons name="calendar-outline" size={12} color="#555" />
                    <Text style={styles.tagText}>Starts {job.startDate}</Text>
                  </View>
                  <View style={styles.tag}>
                    <Ionicons name="location-outline" size={12} color="#2196F3" />
                    <Text style={[styles.tagText, { color: '#2196F3' }]}>{job.distance}</Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  {job.applied ? (
                    <TouchableOpacity 
                      style={styles.appliedBadge}
                      onPress={() => handleUnapply(job.id)}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                      <Text style={styles.appliedText}>Applied</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      style={styles.applyButton}
                      onPress={() => handleApply(job.id)}
                    >
                      <Text style={styles.applyButtonText}>Apply for Work</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    style={styles.callButton}
                    onPress={handleCall}
                  >
                    <Ionicons name="call-outline" size={20} color="#2E7D32" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.hireContainer}>
            {jobs.filter(j => j.author === 'You').length > 0 ? (
              <View style={{ width: '100%' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}>My Job Posts</Text>
                  <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#2E7D32', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 }}
                    onPress={() => setModalVisible(true)}
                  >
                    <Ionicons name="add" size={16} color="#FFF" />
                    <Text style={{ color: '#FFF', fontWeight: 'bold', marginLeft: 4, fontSize: 12 }}>New Post</Text>
                  </TouchableOpacity>
                </View>
                
                {jobs.filter(j => j.author === 'You').map(job => (
                  <View key={job.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.iconBox, { backgroundColor: job.bg }]}>
                        <Ionicons name={job.icon as any} size={24} color={job.iconColor} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.cardTitle}>{job.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                          <Ionicons name="person-circle-outline" size={14} color="#666" />
                          <Text style={styles.cardAuthor}>Posted by You</Text>
                        </View>
                      </View>
                      <View style={styles.priceTag}>
                        <Text style={styles.priceText}>{job.price}</Text>
                      </View>
                    </View>

                    <View style={styles.cardBody}>
                      <View style={styles.quoteLine} />
                      <Text style={styles.cardDesc}>{job.description}</Text>
                    </View>

                    <View style={styles.tagsRow}>
                      <View style={styles.tag}>
                        <Ionicons name="time-outline" size={12} color="#555" />
                        <Text style={styles.tagText}>{job.duration}</Text>
                      </View>
                      <View style={styles.tag}>
                        <Ionicons name="calendar-outline" size={12} color="#555" />
                        <Text style={styles.tagText}>Starts {job.startDate}</Text>
                      </View>
                    </View>

                    <TouchableOpacity 
                      style={[styles.applyButton, { backgroundColor: '#FF5252' }]} // Red for delete
                      onPress={() => handleDeleteJob(job.id)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="trash-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={styles.applyButtonText}>Delete Post</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="briefcase-outline" size={64} color="#CCC" />
                <Text style={styles.emptyTitle}>No Active Job Posts</Text>
                <Text style={styles.emptyDesc}>Post a job to find local workers for your farm.</Text>
                <TouchableOpacity 
                  style={styles.postButton}
                  onPress={() => setModalVisible(true)}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#FFF" />
                  <Text style={styles.postButtonText}>Post a New Job</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Post Job Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Post a New Job</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.label}>Job Title (e.g., Cotton Picking)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter job title"
                value={newJob.title}
                onChangeText={(text) => setNewJob({...newJob, title: text})}
              />

              <Text style={styles.label}>Daily Pay (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 450"
                keyboardType="numeric"
                value={newJob.price}
                onChangeText={(text) => setNewJob({...newJob, price: text})}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the work..."
                multiline
                numberOfLines={3}
                value={newJob.description}
                onChangeText={(text) => setNewJob({...newJob, description: text})}
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Duration</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 3 Days"
                    value={newJob.duration}
                    onChangeText={(text) => setNewJob({...newJob, duration: text})}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.label}>Start Date</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Oct 15"
                    value={newJob.startDate}
                    onChangeText={(text) => setNewJob({...newJob, startDate: text})}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handlePostJob}>
                <Text style={styles.submitButtonText}>Post Job</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* FAB */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="mic" size={28} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: '#2E7D32', // Changed to Green
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 4,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#E8F5E9', // Changed to Green 50
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#2E7D32', // Changed to Green
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD', // Blue 50
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBDEFB',
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#1565C0', // Blue 800
    lineHeight: 18,
  },
  content: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cardAuthor: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  priceTag: {
    backgroundColor: '#E8F5E9', // Green 50
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  priceText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2E7D32', // Green 800
  },
  cardBody: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 12,
  },
  quoteLine: {
    width: 2,
    backgroundColor: '#2E7D32',
    marginRight: 8,
    borderRadius: 1,
  },
  cardDesc: {
    flex: 1,
    fontSize: 14,
    fontStyle: 'italic',
    color: '#555',
    lineHeight: 20,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#555',
    marginLeft: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#2E7D32', // Changed to Green
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  appliedBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50', // Lighter Green for state
    paddingVertical: 12,
    borderRadius: 8,
  },
  appliedText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  callButton: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
  },
  hireContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32', // Changed to Green
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  postButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2E7D32', // Green 800
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    height: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#2E7D32', // Changed to Green
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 40,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
