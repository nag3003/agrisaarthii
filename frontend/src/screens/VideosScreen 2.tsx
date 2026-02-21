import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Modal,
  Platform,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { ProfileService } from '../services/profile';
import { WebView } from 'react-native-webview';

// Mock Data for Videos
const VIDEOS = [
  // Valid agricultural video IDs
  { id: '1', title: 'Modern Cotton Farming Techniques', thumbnail: 'https://img.youtube.com/vi/YrtOd0TV31s/0.jpg', videoId: 'YrtOd0TV31s', duration: '10:05', sector: 'Cotton' },
  { id: '2', title: 'Wheat Harvest & Processing', thumbnail: 'https://img.youtube.com/vi/RYn_yUUpwSQ/0.jpg', videoId: 'RYn_yUUpwSQ', duration: '15:20', sector: 'Wheat' },
  { id: '3', title: 'Smart Rice Farming (SRI Method)', thumbnail: 'https://img.youtube.com/vi/YrtOd0TV31s/0.jpg', videoId: 'YrtOd0TV31s', duration: '12:30', sector: 'Rice' }, // Using Smart Farming video for Rice
  { id: '4', title: 'Drip Irrigation System Setup', thumbnail: 'https://img.youtube.com/vi/RYn_yUUpwSQ/0.jpg', videoId: 'RYn_yUUpwSQ', duration: '8:45', sector: 'Drip Irrigation' }, // Using Wheat video for Drip
  { id: '5', title: 'Sugarcane Harvesting Guide', thumbnail: 'https://img.youtube.com/vi/h1jJMP8uF-0/0.jpg', videoId: 'h1jJMP8uF-0', duration: '14:10', sector: 'Sugarcane' },
  { id: '6', title: 'Organic Fertilizer Production', thumbnail: 'https://img.youtube.com/vi/YQLQdU6aHtI/0.jpg', videoId: 'YQLQdU6aHtI', duration: '9:15', sector: 'Organic Farming' }, // Using Wheat video for Organic
];

export const VideosScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [categories, setCategories] = useState<string[]>(['All']);
  const [videos, setVideos] = useState(VIDEOS);
  const [currentVideo, setCurrentVideo] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    // Extract unique categories from VIDEOS
    const uniqueCategories = Array.from(new Set(VIDEOS.map(v => v.sector)));
    setCategories(['All', ...uniqueCategories]);

    if (user) {
      try {
        const profile = await ProfileService.getProfile(user.uid);
        if (profile?.primaryCrop) {
            // Check if user's crop exists in our categories
            const userCrop = uniqueCategories.find(c => c.toLowerCase() === profile.primaryCrop.toLowerCase());
            if (userCrop) {
                setActiveCategory(userCrop);
            }
        }
      } catch (error) {
        console.error("Error loading profile for videos:", error);
      }
    }
    setLoading(false);
  };

  // Filter videos when category changes
  useEffect(() => {
    if (activeCategory === 'All') {
        setVideos(VIDEOS);
    } else {
        const filtered = VIDEOS.filter(v => v.sector === activeCategory);
        setVideos(filtered);
    }
  }, [activeCategory]);

  const renderCategoryItem = ({ item }: { item: string }) => (
    <TouchableOpacity 
        style={[
            styles.categoryChip, 
            activeCategory === item && styles.categoryChipActive
        ]} 
        onPress={() => setActiveCategory(item)}
    >
        <Text style={[
            styles.categoryText, 
            activeCategory === item && styles.categoryTextActive
        ]}>
            {item}
        </Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => setCurrentVideo(item.videoId)}>
      <View style={styles.thumbnailContainer}>
        <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} resizeMode="cover" />
        <View style={styles.playButton}>
           <Ionicons name="play" size={24} color="white" />
        </View>
        <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{item.duration}</Text>
        </View>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.sectorBadge}>{item.sector}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Farming Videos</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={item => item}
          contentContainerStyle={styles.categoryList}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#27AE60" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={videos}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No videos found.</Text>
          }
        />
      )}

      {/* Video Player Modal */}
      <Modal
        visible={!!currentVideo}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCurrentVideo(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
             <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Playing Video</Text>
                <TouchableOpacity onPress={() => setCurrentVideo(null)} style={styles.closeButton}>
                  <Ionicons name="close" size={28} color="#FFF" />
                </TouchableOpacity>
             </View>
             
             <View style={styles.videoWrapper}>
                {currentVideo && (
                    Platform.OS === 'web' ? (
                        <iframe
                            width="100%"
                            height="100%"
                            src={`https://www.youtube.com/embed/${currentVideo}?autoplay=1`}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            style={{ border: 'none' }}
                        />
                    ) : (
                        <WebView
                            style={styles.webview}
                            source={{ uri: `https://www.youtube.com/embed/${currentVideo}?playsinline=1` }}
                            allowsFullscreenVideo
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                        />
                    )
                )}
             </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5FDF9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingTop: Platform.OS === 'android' ? 40 : 16,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  backButton: { padding: 4 },
  filterContainer: { 
    paddingVertical: 12,
    backgroundColor: '#F5FDF9',
  },
  categoryList: {
    paddingHorizontal: 16,
    gap: 10
  },
  categoryChip: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  categoryText: {
    color: '#666',
    fontWeight: '500',
    fontSize: 14,
  },
  categoryTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  listContent: { padding: 16 },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnailContainer: { height: 180, backgroundColor: '#DDD', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  thumbnail: { width: '100%', height: '100%' },
  playButton: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  cardContent: { padding: 12 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 6 },
  sectorBadge: { 
    fontSize: 12, 
    color: '#2E7D32', 
    backgroundColor: '#E8F5E9', 
    alignSelf: 'flex-start', 
    paddingHorizontal: 8, 
    paddingVertical: 2, 
    borderRadius: 4 
  },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#666' },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
  },
  modalContent: {
    width: '100%',
    height: '50%', // Half screen height for video
    backgroundColor: 'black',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    position: 'absolute',
    top: -60,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  modalTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  closeButton: { padding: 8 },
  videoWrapper: {
    width: '100%',
    flex: 1,
    backgroundColor: 'black',
  },
  webview: {
    flex: 1,
    backgroundColor: 'black',
  }
});
