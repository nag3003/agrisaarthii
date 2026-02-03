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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { ProfileService } from '../services/profile';

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

export const MarketPriceScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [prices, setPrices] = useState<MarketItem[]>(MOCK_DATA);
  const [filterMode, setFilterMode] = useState<'all' | 'local'>('local');
  const [userLocation, setUserLocation] = useState<{ state?: string, district?: string } | null>(null);

  useEffect(() => {
    loadUserLocation();
  }, [user]);

  const loadUserLocation = async () => {
    if (user) {
      const profile = await ProfileService.getProfile(user.uid);
      if (profile) {
        setUserLocation({ state: profile.state, district: profile.district });
      }
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate API fetch
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  };

  const filteredPrices = prices.filter(item => {
    const matchesSearch = item.commodity.toLowerCase().includes(search.toLowerCase()) ||
      item.market.toLowerCase().includes(search.toLowerCase());

    if (filterMode === 'local' && userLocation?.state) {
      // Strict filter for district, loose for state
      const matchesLoc = (userLocation.district && item.district === userLocation.district) ||
        (item.state === userLocation.state);
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

      {/* Filter Toggle */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 10 }}>
        <TouchableOpacity
          style={[styles.filterBtn, filterMode === 'local' && styles.filterBtnActive]}
          onPress={() => setFilterMode('local')}
        >
          <Text style={[styles.filterText, filterMode === 'local' && styles.filterTextActive]}>
            Nearby ({userLocation?.district || "Local"})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filterMode === 'all' && styles.filterBtnActive]}
          onPress={() => setFilterMode('all')}
        >
          <Text style={[styles.filterText, filterMode === 'all' && styles.filterTextActive]}>
            All Markets
          </Text>
        </TouchableOpacity>
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Market Prices</Text>
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
  filterBtnActive: {
    backgroundColor: '#27AE60',
  },
  filterText: { color: '#666', fontWeight: '600' },
  filterTextActive: { color: 'white' },
});
