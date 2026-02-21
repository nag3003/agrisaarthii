import * as Location from 'expo-location';
import { Platform, Alert } from 'react-native';

export class LocationService {
    static async getCurrentLocation(): Promise<{ lat: number, lon: number } | null> {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                if (Platform.OS !== 'web') {
                    Alert.alert('Permission Denied', 'We need your location to show local weather and market prices.');
                }
                return null;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            return {
                lat: location.coords.latitude,
                lon: location.coords.longitude,
            };
        } catch (error) {
            console.error("Error getting location:", error);
            return null;
        }
    }

    static async getReverseGeocode(lat: number, lon: number): Promise<{ city: string | null, district: string | null, state: string | null }> {
        try {
            const [address] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
            if (address) {
                return {
                    city: address.city || address.subregion || null,
                    district: address.subregion || address.district || address.city || null, // Best effort mapping
                    state: address.region || null
                }
            }
            return { city: null, district: null, state: null };
        } catch (error) {
            console.error("Reverse geocode error:", error);
            return { city: null, district: null, state: null };
        }
    }
}
