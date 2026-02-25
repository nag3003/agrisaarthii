import React, { useState, useEffect, useRef } from 'react';
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
  Alert,
  Dimensions,
  Animated,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { ProfileService } from '../services/profile';
import { VoiceRecordButton } from '../components/VoiceRecordButton';
import { processLocalCommand } from '../utils/voiceCommandHelper';
import { SpeechService } from '../services/speech';
import { WebView } from 'react-native-webview';
import { sendVoice } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH > 700 ? (SCREEN_WIDTH - 64) / 2 : SCREEN_WIDTH - 32;

// Category icons
const CATEGORY_ICONS: Record<string, string> = {
  'All': 'grid-outline',
  'Cotton': 'leaf-outline',
  'Wheat': 'nutrition-outline',
  'Rice': 'water-outline',
  'Drip Irrigation': 'rainy-outline',
  'Sugarcane': 'flower-outline',
  'Organic Farming': 'earth-outline',
};

// Enhanced video data with more metadata
const VIDEOS = [
  {
    id: '1', title: 'Modern Cotton Farming Techniques',
    description: 'Learn advanced cotton cultivation methods for higher yield and better quality fiber.',
    thumbnail: 'https://img.youtube.com/vi/YrtOd0TV31s/hqdefault.jpg',
    videoId: 'YrtOd0TV31s', duration: '10:05', sector: 'Cotton',
    views: '24.5K', likes: '1.2K', creator: 'AgriTech India',
    creatorAvatar: '🌾', level: 'Beginner',
  },
  {
    id: '2', title: 'Wheat Harvest & Processing',
    description: 'Complete guide to wheat harvesting, threshing, and post-harvest management.',
    thumbnail: 'https://img.youtube.com/vi/RYn_yUUpwSQ/hqdefault.jpg',
    videoId: 'RYn_yUUpwSQ', duration: '15:20', sector: 'Wheat',
    views: '18.3K', likes: '980', creator: 'Kisan Academy',
    creatorAvatar: '🌿', level: 'Intermediate',
  },
  {
    id: '3', title: 'Smart Rice Farming (SRI Method)',
    description: 'System of Rice Intensification — grow more rice with less water and fewer inputs.',
    thumbnail: 'https://img.youtube.com/vi/YrtOd0TV31s/hqdefault.jpg',
    videoId: 'YrtOd0TV31s', duration: '12:30', sector: 'Rice',
    views: '31.2K', likes: '2.1K', creator: 'FarmTech Solutions',
    creatorAvatar: '🌱', level: 'Advanced',
  },
  {
    id: '4', title: 'Drip Irrigation System Setup',
    description: 'Step-by-step guide to install and maintain an efficient drip irrigation system.',
    thumbnail: 'https://img.youtube.com/vi/RYn_yUUpwSQ/hqdefault.jpg',
    videoId: 'RYn_yUUpwSQ', duration: '8:45', sector: 'Drip Irrigation',
    views: '42.1K', likes: '3.4K', creator: 'Water Smart Farm',
    creatorAvatar: '💧', level: 'Beginner',
  },
  {
    id: '5', title: 'Sugarcane Harvesting Guide',
    description: 'Modern sugarcane harvesting techniques and machinery for efficient processing.',
    thumbnail: 'https://img.youtube.com/vi/h1jJMP8uF-0/hqdefault.jpg',
    videoId: 'h1jJMP8uF-0', duration: '14:10', sector: 'Sugarcane',
    views: '15.7K', likes: '890', creator: 'Cane Expert',
    creatorAvatar: '🍬', level: 'Intermediate',
  },
  {
    id: '6', title: 'Organic Fertilizer Production',
    description: 'Make your own organic fertilizer at home — vermicompost, jeevamrit, and more.',
    thumbnail: 'https://img.youtube.com/vi/YQLQdU6aHtI/hqdefault.jpg',
    videoId: 'YQLQdU6aHtI', duration: '9:15', sector: 'Organic Farming',
    views: '56.8K', likes: '4.2K', creator: 'Green Roots',
    creatorAvatar: '🌿', level: 'Beginner',
  },
];

// Level badge colors
const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  'Beginner': { bg: '#E3F2FD', text: '#1565C0' },
  'Intermediate': { bg: '#FFF3E0', text: '#E65100' },
  'Advanced': { bg: '#FCE4EC', text: '#C62828' },
};

export const VideosScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [categories, setCategories] = useState<string[]>(['All']);
  const [videos, setVideos] = useState(VIDEOS);
  const [currentVideo, setCurrentVideo] = useState<any>(null);
  const [processingVoice, setProcessingVoice] = useState(false);
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadProfile();
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [user]);

  const handleVoiceCommand = (text: string) => {
    return processLocalCommand(text, {
      navigation,
      language: 'en-US',
      isVoiceOutputEnabled,
      onLogout: () => { }
    });
  };

  const handleVoiceText = (text: string) => {
    if (handleVoiceCommand(text)) return;
    const lower = text.toLowerCase();
    const foundCategory = categories.find(c => lower.includes(c.toLowerCase()));
    if (foundCategory) {
      setActiveCategory(foundCategory);
      if (isVoiceOutputEnabled) SpeechService.speak(`Showing videos for ${foundCategory}`, { language: 'en-US' });
      return;
    }
    if (lower.includes('show all') || lower.includes('reset')) {
      setActiveCategory('All');
      if (isVoiceOutputEnabled) SpeechService.speak("Showing all videos", { language: 'en-US' });
      return;
    }
    if (isVoiceOutputEnabled) SpeechService.speak(`No category found for ${text}`, { language: 'en-US' });
  };

  const handleVoiceComplete = async (uri: string) => {
    if (isVoiceOutputEnabled) SpeechService.speak("", { volume: 0 });
    setProcessingVoice(true);
    try {
      const response = await sendVoice(uri);
      if (response && response.text) handleVoiceText(response.text);
    } catch (error) {
      console.error('Failed to process voice', error);
      Alert.alert("Voice Error", "Failed to process voice command.");
    } finally {
      setProcessingVoice(false);
    }
  };

  const loadProfile = async () => {
    const uniqueCategories = Array.from(new Set(VIDEOS.map(v => v.sector)));
    setCategories(['All', ...uniqueCategories]);
    if (user) {
      try {
        const profile = await ProfileService.getProfile(user.uid);
        if (profile?.primaryCrop) {
          const userCrop = uniqueCategories.find(c => c.toLowerCase() === profile.primaryCrop.toLowerCase());
          if (userCrop) setActiveCategory(userCrop);
        }
      } catch (error) {
        console.error("Error loading profile for videos:", error);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeCategory === 'All') {
      setVideos(VIDEOS);
    } else {
      setVideos(VIDEOS.filter(v => v.sector === activeCategory));
    }
  }, [activeCategory]);

  const renderCategoryItem = ({ item }: { item: string }) => {
    const isActive = activeCategory === item;
    const iconName = CATEGORY_ICONS[item] || 'pricetag-outline';
    return (
      <TouchableOpacity
        style={[styles.categoryChip, isActive && styles.categoryChipActive]}
        onPress={() => setActiveCategory(item)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={iconName as any}
          size={16}
          color={isActive ? '#fff' : '#4CAF50'}
          style={{ marginRight: 6 }}
        />
        <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
          {item}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderVideoCard = ({ item, index }: { item: any; index: number }) => {
    const levelStyle = LEVEL_COLORS[item.level] || LEVEL_COLORS['Beginner'];
    return (
      <Animated.View style={{
        opacity: fadeAnim,
        transform: [{ translateY: Animated.multiply(slideAnim, new Animated.Value(1 + index * 0.15)) }],
      }}>
        <TouchableOpacity
          style={[styles.card, SCREEN_WIDTH > 700 && { width: CARD_WIDTH }]}
          onPress={() => setCurrentVideo(item)}
          activeOpacity={0.85}
        >
          {/* Thumbnail with gradient overlay */}
          <View style={styles.thumbnailContainer}>
            <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} resizeMode="cover" />

            {/* Gradient overlay */}
            <View style={styles.gradientOverlay} />

            {/* Play button */}
            <View style={styles.playButtonOuter}>
              <View style={styles.playButton}>
                <Ionicons name="play" size={22} color="#fff" style={{ marginLeft: 2 }} />
              </View>
            </View>

            {/* Duration badge */}
            <View style={styles.durationBadge}>
              <Ionicons name="time-outline" size={11} color="#fff" style={{ marginRight: 3 }} />
              <Text style={styles.durationText}>{item.duration}</Text>
            </View>

            {/* Level badge */}
            <View style={[styles.levelBadge, { backgroundColor: levelStyle.bg }]}>
              <Text style={[styles.levelText, { color: levelStyle.text }]}>{item.level}</Text>
            </View>
          </View>

          {/* Card content */}
          <View style={styles.cardContent}>
            {/* Creator row */}
            <View style={styles.creatorRow}>
              <View style={styles.creatorAvatarContainer}>
                <Text style={styles.creatorAvatarEmoji}>{item.creatorAvatar}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.creatorName}>{item.creator}</Text>
              </View>
            </View>

            {/* Description */}
            <Text style={styles.description} numberOfLines={2}>{item.description}</Text>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="eye-outline" size={14} color="#888" />
                <Text style={styles.statText}>{item.views} views</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="heart-outline" size={14} color="#E91E63" />
                <Text style={styles.statText}>{item.likes}</Text>
              </View>
              <View style={styles.sectorBadge}>
                <Ionicons name="pricetag-outline" size={11} color="#2E7D32" style={{ marginRight: 3 }} />
                <Text style={styles.sectorText}>{item.sector}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderFeaturedVideo = () => {
    const featured = VIDEOS.find(v => v.id === '4'); // Drip Irrigation has most views
    if (!featured || activeCategory !== 'All') return null;
    return (
      <TouchableOpacity
        style={styles.featuredCard}
        onPress={() => setCurrentVideo(featured)}
        activeOpacity={0.85}
      >
        <Image source={{ uri: featured.thumbnail }} style={styles.featuredThumbnail} resizeMode="cover" />
        <View style={styles.featuredOverlay} />
        <View style={styles.featuredContent}>
          <View style={styles.featuredBadge}>
            <Ionicons name="trending-up" size={14} color="#fff" />
            <Text style={styles.featuredBadgeText}>TRENDING</Text>
          </View>
          <Text style={styles.featuredTitle}>{featured.title}</Text>
          <Text style={styles.featuredDescription}>{featured.description}</Text>
          <View style={styles.featuredStats}>
            <View style={styles.featuredStat}>
              <Ionicons name="eye-outline" size={14} color="#fff" />
              <Text style={styles.featuredStatText}>{featured.views} views</Text>
            </View>
            <View style={styles.featuredPlayBtn}>
              <Ionicons name="play" size={16} color="#fff" />
              <Text style={styles.featuredPlayText}>Watch Now</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerAnim }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <View style={styles.backButtonInner}>
            <Ionicons name="arrow-back" size={20} color="#1A1A1A" />
          </View>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="play-circle" size={24} color="#2E7D32" style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>Learn & Grow</Text>
        </View>
        <VoiceRecordButton
          onRecordingComplete={handleVoiceComplete}
          onSpeechEnd={handleVoiceText}
          onSpeechPartial={() => { }}
          onSpeechStart={() => { }}
          isProcessing={processingVoice}
          size={36}
          language={'en-US'}
        />
      </Animated.View>

      {/* Subtitle */}
      <View style={styles.subtitleRow}>
        <Text style={styles.subtitleText}>🎬 {videos.length} farming videos available</Text>
      </View>

      {/* Category Filter */}
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Loading videos...</Text>
        </View>
      ) : (
        <FlatList
          data={videos}
          renderItem={renderVideoCard}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.listContent,
            SCREEN_WIDTH > 700 && styles.listContentGrid,
          ]}
          ListHeaderComponent={renderFeaturedVideo}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="videocam-off-outline" size={48} color="#CCC" />
              <Text style={styles.emptyText}>No videos found in this category</Text>
              <TouchableOpacity onPress={() => setActiveCategory('All')} style={styles.emptyBtn}>
                <Text style={styles.emptyBtnText}>Show All Videos</Text>
              </TouchableOpacity>
            </View>
          }
          numColumns={SCREEN_WIDTH > 700 ? 2 : 1}
          key={SCREEN_WIDTH > 700 ? 'grid' : 'list'}
          columnWrapperStyle={SCREEN_WIDTH > 700 ? { gap: 16 } : undefined}
        />
      )}

      {/* Video Player Modal */}
      <Modal
        visible={!!currentVideo}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setCurrentVideo(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {currentVideo?.title || 'Playing Video'}
                </Text>
                <Text style={styles.modalCreator}>{currentVideo?.creator}</Text>
              </View>
              <TouchableOpacity onPress={() => setCurrentVideo(null)} style={styles.closeButton}>
                <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
            </View>

            {/* Video Player */}
            <View style={styles.videoWrapper}>
              {currentVideo && (
                Platform.OS === 'web' ? (
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${currentVideo.videoId}?autoplay=1&rel=0`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ border: 'none', borderRadius: 12 }}
                  />
                ) : (
                  <WebView
                    style={styles.webview}
                    source={{ uri: `https://www.youtube.com/embed/${currentVideo.videoId}?playsinline=1` }}
                    allowsFullscreenVideo
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                  />
                )
              )}
            </View>

            {/* Video Info below player */}
            {currentVideo && (
              <View style={styles.modalInfo}>
                <View style={styles.modalStats}>
                  <View style={styles.modalStatItem}>
                    <Ionicons name="eye-outline" size={16} color="#aaa" />
                    <Text style={styles.modalStatText}>{currentVideo.views} views</Text>
                  </View>
                  <View style={styles.modalStatItem}>
                    <Ionicons name="heart-outline" size={16} color="#E91E63" />
                    <Text style={styles.modalStatText}>{currentVideo.likes} likes</Text>
                  </View>
                  <View style={styles.modalStatItem}>
                    <Ionicons name="time-outline" size={16} color="#aaa" />
                    <Text style={styles.modalStatText}>{currentVideo.duration}</Text>
                  </View>
                </View>
                <Text style={styles.modalDescription}>{currentVideo.description}</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F7F2',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 0,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 4,
    }),
    paddingTop: Platform.OS === 'android' ? 40 : 14,
  },
  backButton: { padding: 4 },
  backButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F0F7F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A2E1A',
    letterSpacing: 0.3,
  },

  // Subtitle
  subtitleRow: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  subtitleText: {
    fontSize: 13,
    color: '#777',
    fontWeight: '500',
  },

  // Categories
  filterContainer: {
    paddingVertical: 12,
  },
  categoryList: {
    paddingHorizontal: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 24,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#E0EDE2',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    }),
  },
  categoryChipActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(46,125,50,0.3)',
    } : {
      shadowColor: '#2E7D32',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  categoryText: {
    color: '#555',
    fontWeight: '600',
    fontSize: 13,
  },
  categoryTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // Featured card
  featuredCard: {
    marginHorizontal: 0,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    height: 200,
    position: 'relative',
  },
  featuredThumbnail: {
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    ...(Platform.OS === 'web' ? {
      background: 'linear-gradient(135deg, rgba(27,94,32,0.8) 0%, rgba(0,0,0,0.6) 100%)',
    } : {}),
  },
  featuredContent: {
    ...StyleSheet.absoluteFillObject,
    padding: 20,
    justifyContent: 'flex-end',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  featuredBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 5,
    letterSpacing: 1,
  },
  featuredTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  featuredDescription: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginBottom: 12,
  },
  featuredStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featuredStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredStatText: {
    color: '#fff',
    fontSize: 13,
    marginLeft: 5,
  },
  featuredPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  featuredPlayText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 6,
  },

  // Video Cards
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  listContentGrid: {
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 18,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.07,
      shadowRadius: 20,
      elevation: 5,
    }),
  },
  thumbnailContainer: {
    height: 190,
    backgroundColor: '#E8F5E9',
    position: 'relative',
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    ...(Platform.OS === 'web' ? {
      background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.45) 100%)',
    } : {
      backgroundColor: 'transparent',
    }),
  },
  playButtonOuter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -26,
    marginLeft: -26,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(46,125,50,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 16px rgba(46,125,50,0.4)',
    } : {
      shadowColor: '#2E7D32',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 8,
    }),
  },
  durationBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  levelBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Card content
  cardContent: {
    padding: 14,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  creatorAvatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  creatorAvatarEmoji: {
    fontSize: 18,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2E1A',
    lineHeight: 20,
    marginBottom: 2,
  },
  creatorName: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 4,
    fontWeight: '500',
  },
  sectorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sectorText: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '600',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 16,
    color: '#999',
    fontSize: 15,
    fontWeight: '500',
  },
  emptyBtn: {
    marginTop: 16,
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#888',
    fontSize: 14,
  },

  // Video Player Modal
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    paddingHorizontal: Platform.OS === 'web' ? '10%' : 0,
  },
  modalContent: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    backgroundColor: '#111',
    borderRadius: Platform.OS === 'web' ? 16 : 0,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#111',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  modalCreator: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  videoWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalInfo: {
    padding: 16,
    backgroundColor: '#111',
  },
  modalStats: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  modalStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  modalStatText: {
    color: '#aaa',
    fontSize: 13,
    marginLeft: 5,
  },
  modalDescription: {
    color: '#999',
    fontSize: 14,
    lineHeight: 20,
  },
});
