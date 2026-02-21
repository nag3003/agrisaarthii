import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { LocationService } from '../services/location';
import { ProfileService } from '../services/profile';
import { getMarketPrices } from '../services/api';
import { VoiceRecordButton } from '../components/VoiceRecordButton';
import { processLocalCommand } from '../utils/voiceCommandHelper';
import { SpeechService } from '../services/speech';

interface MarketItem {
  id: string;
  commodity: string;
  market: string;
  state: string;
  district: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  unit: string;
  arrivalDate: string;
  trend: 'up' | 'down' | 'stable';
}

const MOCK_DATA: MarketItem[] = [
  {
    id: '1',
    commodity: 'Wheat',
    market: 'Indore',
    state: 'Madhya Pradesh',
    district: 'Indore',
    minPrice: 2200,
    maxPrice: 2500,
    modalPrice: 2350,
    unit: 'Quintal',
    arrivalDate: '2026-01-30',
    trend: 'up',
  },
  {
    id: '2',
    commodity: 'Rice (Basmati)',
    market: 'Karnal',
    state: 'Haryana',
    district: 'Karnal',
    minPrice: 4500,
    maxPrice: 5200,
    modalPrice: 4800,
    unit: 'Quintal',
    arrivalDate: '2026-01-30',
    trend: 'down',
  },
  {
    id: '3',
    commodity: 'Cotton',
    market: 'Rajkot',
    state: 'Gujarat',
    district: 'Rajkot',
    minPrice: 7000,
    maxPrice: 7800,
    modalPrice: 7400,
    unit: 'Quintal',
    arrivalDate: '2026-01-30',
    trend: 'stable',
  },
  {
    id: '4',
    commodity: 'Soyabean',
    market: 'Nagpur',
    state: 'Maharashtra',
    district: 'Nagpur',
    minPrice: 4200,
    maxPrice: 4600,
    modalPrice: 4450,
    unit: 'Quintal',
    arrivalDate: '2026-01-30',
    trend: 'up',
  },
  {
    id: '5',
    commodity: 'Onion',
    market: 'Lasalgaon',
    state: 'Maharashtra',
    district: 'Nashik',
    minPrice: 1500,
    maxPrice: 2200,
    modalPrice: 1800,
    unit: 'Quintal',
    arrivalDate: '2026-01-30',
    trend: 'down',
  },
];

const generateMockData = (district: string, state: string): MarketItem[] => {
  return [
    {
      id: `mock-1-${district}`,
      commodity: 'Wheat',
      market: `${district} Mandi`,
      state: state,
      district: district,
      minPrice: 2150,
      maxPrice: 2450,
      modalPrice: 2300,
      unit: 'Quintal',
      arrivalDate: new Date().toISOString().split('T')[0],
      trend: 'up',
    },
    {
      id: `mock-2-${district}`,
      commodity: 'Rice (Paddy)',
      market: `${district} APMC`,
      state: state,
      district: district,
      minPrice: 2800,
      maxPrice: 3200,
      modalPrice: 3000,
      unit: 'Quintal',
      arrivalDate: new Date().toISOString().split('T')[0],
      trend: 'stable',
    },
    {
      id: `mock-3-${district}`,
      commodity: 'Cotton',
      market: `${district} Market Yard`,
      state: state,
      district: district,
      minPrice: 6900,
      maxPrice: 7600,
      modalPrice: 7250,
      unit: 'Quintal',
      arrivalDate: new Date().toISOString().split('T')[0],
      trend: 'down',
    },
    {
      id: `mock-4-${district}`,
      commodity: 'Soyabean',
      market: `${district} Mandi`,
      state: state,
      district: district,
      minPrice: 4200,
      maxPrice: 4700,
      modalPrice: 4450,
      unit: 'Quintal',
      arrivalDate: new Date().toISOString().split('T')[0],
      trend: 'up',
    },
    {
      id: `mock-5-${district}`,
      commodity: 'Vegetables (Mix)',
      market: `${district} Local Market`,
      state: state,
      district: district,
      minPrice: 1500,
      maxPrice: 2500,
      modalPrice: 2000,
      unit: 'Quintal',
      arrivalDate: new Date().toISOString().split('T')[0],
      trend: 'stable',
    },
  ];
};

export const MarketPriceScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [prices, setPrices] = useState<MarketItem[]>(MOCK_DATA);
  const [filterMode, setFilterMode] = useState<'all' | 'local'>('local');
  const [userLocation, setUserLocation] = useState<{ state?: string, district?: string } | null>(null);
  const [processingVoice, setProcessingVoice] = useState(false);
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState(true);
  const [language, setLanguage] = useState('hi');

  useEffect(() => {
    if (user) {
      ProfileService.getProfile(user.uid).then(p => {
        if (p?.language) setLanguage(p.language);
      });
    }
    loadData();
  }, [user, filterMode]);

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
    setSearch(text);
    if (isVoiceOutputEnabled) {
      SpeechService.speak(`Searching for ${text}`, { language: language === 'hi' ? 'hi-IN' : 'en-US' });
    }
  };


  const normalize = (str: string) => str?.trim().toLowerCase();

  const resolveLocation = async () => {
    try {
      // 1. Web Geolocation
      if (Platform.OS === 'web' && navigator.geolocation) {
        try {
          const position = await new Promise<any>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
          });
          const { latitude: lat, longitude: lon } = position.coords;
          const address = await LocationService.getReverseGeocode(lat, lon);
          if (address?.district) {
            return { district: address.district, state: address.state || 'Unknown' };
          }
        } catch (e) {
          console.log("Web geolocation failed, trying mobile/profile fallback");
        }
      }

      // 2. Mobile GPS Fallback
      const gps = await LocationService.getCurrentLocation();
      if (gps) {
        const address = await LocationService.getReverseGeocode(gps.lat, gps.lon);
        if (address?.district) {
          return { district: address.district, state: address.state || 'Unknown' };
        }
      }

      // 3. Profile Fallback
      if (user) {
        const profile = await ProfileService.getProfile(user.uid);
        if (profile?.district || profile?.location) {
          return {
            district: profile.district || profile.location || 'Nashik',
            state: profile.state || 'Local'
          };
        }
      }
    } catch (err) {
      console.log("Location resolution error:", err);
    }

    // 4. Final Hard Fallback
    return { district: 'Nashik', state: 'Maharashtra' };
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Get location based on filter mode
      let locationObj = { district: '', state: '' };
      
      if (filterMode === 'local') {
        locationObj = await resolveLocation();
        setUserLocation(locationObj);
      }

      console.log("Calling API with:", locationObj.district || "National");

      // 2. Fetch real data
      const crops = ['Wheat', 'Rice', 'Soyabean', 'Cotton', 'Onion'];
      try {
        const results = await Promise.all(crops.map(crop => getMarketPrices(crop, locationObj.district)));
        
        // Flatten nearby_mandis into the prices list
        const apiPrices: MarketItem[] = [];
        results.forEach((res, cropIndex) => {
          if (res.nearby_mandis && res.nearby_mandis.length > 0) {
            res.nearby_mandis.forEach((mandi: any, mandiIndex: number) => {
              apiPrices.push({
                id: `api-${cropIndex}-${mandiIndex}-${Date.now()}`,
                commodity: res.crop || crops[cropIndex],
                market: mandi.name || `${locationObj.district || 'Local'} Mandi`,
                state: mandi.state || locationObj.state || 'Local',
                district: mandi.district || locationObj.district || 'Local',
                minPrice: parseInt(mandi.price) - 100,
                maxPrice: parseInt(mandi.price) + 100,
                modalPrice: parseInt(mandi.price),
                unit: res.unit || 'Quintal',
                arrivalDate: new Date().toISOString().split('T')[0],
                trend: (res.trend as any) || 'stable',
              });
            });
          }
        });

        if (apiPrices.length > 0) {
          setPrices(apiPrices);
        } else {
          if (filterMode === 'local' && locationObj.district) {
            setPrices(generateMockData(locationObj.district, locationObj.state || 'State'));
          } else {
            setPrices(MOCK_DATA);
          }
        }
      } catch (err) {
        console.error('Market Price fetch failed, using mock data', err);
        if (filterMode === 'local' && locationObj.district) {
            setPrices(generateMockData(locationObj.district, locationObj.state || 'State'));
        } else {
            setPrices(MOCK_DATA);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredPrices = prices.filter(item => {
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      item.commodity.toLowerCase().includes(searchLower) ||
      item.market.toLowerCase().includes(searchLower) ||
      (item.state && item.state.toLowerCase().includes(searchLower)) ||
      (item.district && item.district.toLowerCase().includes(searchLower));

    if (filterMode === 'local' && userLocation?.district) {
      const itemDistrict = item.district?.toLowerCase() || '';
      const userDistrict = userLocation.district.toLowerCase();
      const itemState = item.state?.toLowerCase() || '';
      
      const matchesLoc = itemDistrict.includes(userDistrict) || 
                         userDistrict.includes(itemDistrict) ||
                         itemState === 'local';
      return matchesSearch && matchesLoc;
    }
    return matchesSearch;
  });

  const renderItem = ({ item }: { item: MarketItem }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.commodityName}>{item.commodity}</Text>
          <Text style={styles.marketName}>{item.market}, {item.state}</Text>
        </View>
        <View style={[styles.trendBadge, item.trend === 'up' ? styles.trendUp : item.trend === 'down' ? styles.trendDown : styles.trendStable]}>
          <Ionicons
            name={item.trend === 'up' ? 'trending-up' : item.trend === 'down' ? 'trending-down' : 'remove'}
            size={16}
            color="white"
          />
        </View>
      </View>

      <View style={styles.priceRow}>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Min Price</Text>
          <Text style={styles.priceValue}>₹{item.minPrice}</Text>
        </View>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Modal Price</Text>
          <Text style={[styles.priceValue, styles.modalPrice]}>₹{item.modalPrice}</Text>
        </View>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Max Price</Text>
          <Text style={styles.priceValue}>₹{item.maxPrice}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.footerText}>Unit: {item.unit}</Text>
        <Text style={styles.footerText}>Updated: {item.arrivalDate}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Home');
            }
          }} 
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Market Prices</Text>
        <View style={{ flex: 1 }} />
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

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#AAA" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search crop or market..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Global Filter Toggle */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterBtn, filterMode === 'local' && styles.active]}
          onPress={() => setFilterMode('local')}
        >
          <Text style={[styles.filterText, filterMode === 'local' && styles.activeText]}>
            Nearby ({userLocation?.district || 'Local'})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filterMode === 'all' && styles.active]}
          onPress={() => setFilterMode('all')}
        >
          <Text style={[styles.filterText, filterMode === 'all' && styles.activeText]}>
            All Markets
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#27AE60" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredPrices}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#27AE60']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={64} color="#DDD" />
              <Text style={styles.emptyText}>No prices found for "{search}"</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FDF9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0F2E9',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginLeft: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0F2E9',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#1A1A1A',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(39, 174, 96, 0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  commodityName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  marketName: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  trendBadge: {
    padding: 6,
    borderRadius: 8,
  },
  trendUp: {
    backgroundColor: '#27AE60',
  },
  trendDown: {
    backgroundColor: '#FF6B6B',
  },
  trendStable: {
    backgroundColor: '#F1C40F',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9FCFA',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  priceItem: {
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 4,
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modalPrice: {
    color: '#27AE60',
    fontSize: 17,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  filterBtn: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
    backgroundColor: '#F0F0F0', marginRight: 10,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  active: {
    backgroundColor: '#27AE60',
  },
  activeText: {
    color: 'white',
  },
  filterBtnActive: {
    backgroundColor: '#27AE60',
  },
  filterText: { color: '#666', fontWeight: '600' },
  filterTextActive: { color: 'white' },
});
