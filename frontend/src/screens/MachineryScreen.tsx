import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Machine {
  id: string;
  name: string;
  type: string;
  price: string;
  image: string;
  description: string;
}

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?q=80&w=400&auto=format&fit=crop';

const MACHINES: Machine[] = [
  {
    id: '1',
    name: 'Autonomous Tractor',
    type: 'Tractor',
    price: '₹2,500/day',
    image: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&q=80&w=800',
    description: 'GPS guided self-driving tractor for precision plowing.',
  },
  {
    id: '2',
    name: 'Smart Harvester',
    type: 'Harvester',
    price: '₹5,000/day',
    image: 'https://images.unsplash.com/photo-1594136905280-972140c02656?auto=format&fit=crop&q=80&w=800',
    description: 'Equipped with yield mapping and grain loss sensors.',
  },
  {
    id: '3',
    name: 'Spraying Drone',
    type: 'Drone',
    price: '₹1,200/acre',
    image: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&q=80&w=800',
    description: 'Automated fertilizer and pesticide spraying drone.',
  },
  {
    id: '4',
    name: 'Soil Sensor Kit',
    type: 'IoT',
    price: '₹300/day',
    image: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=800',
    description: 'Real-time moisture, pH, and NPK monitoring sensors.',
  },
];

export const MachineryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [imageErrors, setImageErrors] = React.useState<Record<string, boolean>>({});

  const handleBook = (name: string) => {
    Alert.alert('Booking Request', `Your request for ${name} has been sent. Our team will contact you soon.`);
  };

  const handleImageError = (id: string) => {
    setImageErrors(prev => ({ ...prev, [id]: true }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Advanced Machinery</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>Rent high-tech machinery to improve your yield.</Text>
        
        {MACHINES.map(machine => (
          <View key={machine.id} style={styles.machineCard}>
            <Image 
              source={{ uri: imageErrors[machine.id] ? DEFAULT_IMAGE : machine.image }} 
              style={styles.machineImage}
              onError={() => handleImageError(machine.id)}
            />
            <View style={styles.cardInfo}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>{machine.type}</Text>
              </View>
              <Text style={styles.machineName}>{machine.name}</Text>
              <Text style={styles.machineDesc}>{machine.description}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.priceText}>{machine.price}</Text>
                <TouchableOpacity 
                  style={styles.bookBtn}
                  onPress={() => handleBook(machine.name)}
                >
                  <Text style={styles.bookBtnText}>Book Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
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
  scrollContent: {
    padding: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  machineCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  machineImage: {
    width: '100%',
    height: 180,
  },
  cardInfo: {
    padding: 16,
  },
  typeBadge: {
    backgroundColor: '#E8F5E9',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  typeText: {
    color: '#27AE60',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  machineName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  machineDesc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 16,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#27AE60',
  },
  bookBtn: {
    backgroundColor: '#27AE60',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  bookBtnText: {
    color: 'white',
    fontWeight: '700',
  },
});
