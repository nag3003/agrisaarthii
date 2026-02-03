import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getWeather } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LocationService } from '../services/location';
import { ProfileService } from '../services/profile';

export const WeatherScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { user } = useAuth();
    const [weather, setWeather] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadWeather();
    }, []);

    const loadWeather = async () => {
        try {
            let lat = 20.0, lon = 73.8; // Default Nashik

            // Try GPS first
            const gps = await LocationService.getCurrentLocation();
            if (gps) {
                lat = gps.lat;
                lon = gps.lon;
            } else if (user) {
                // Fallback to Profile
                const profile = await ProfileService.getProfile(user.uid);
                if (profile?.state && profile?.district) {
                    const coords = ProfileService.getCoordinatesForLocation(profile.state, profile.district);
                    lat = coords.lat;
                    lon = coords.lon;
                } else if (profile?.location) {
                    // @ts-ignore
                    lat = profile.location.lat || 20.0;
                    // @ts-ignore
                    lon = profile.location.lon || 73.8;
                }
            }

            const data = await getWeather(lat, lon);
            setWeather(data);
        } catch (e) {
            console.error("Weather fetch failed", e);
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (condition: string) => {
        if (!condition) return 'partly-sunny';
        const c = condition.toLowerCase();
        if (c.includes('sun') || c.includes('clear')) return 'sunny';
        if (c.includes('rain')) return 'rainy';
        if (c.includes('cloud')) return 'cloud';
        return 'partly-sunny';
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#27AE60" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Weather Forecast</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Main Card */}
                <View style={styles.currentCard}>
                    <View style={styles.locationRow}>
                        <Ionicons name="location-sharp" size={20} color="white" />
                        <Text style={styles.locationText}>{weather?.location || "Unknown Location"}</Text>
                    </View>
                    <View style={styles.tempRow}>
                        <Ionicons name={getIcon(weather?.condition)} size={80} color="white" />
                        <View style={{ marginLeft: 20 }}>
                            <Text style={styles.tempText}>{weather?.temp}°C</Text>
                            <Text style={styles.conditionText}>{weather?.condition}</Text>
                        </View>
                    </View>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Ionicons name="water" size={20} color="white" />
                            <Text style={styles.statText}>{weather?.humidity}% Hum</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="speedometer" size={20} color="white" />
                            <Text style={styles.statText}>{weather?.wind_speed} km/h</Text>
                        </View>
                    </View>
                </View>

                {/* Risk Assessment */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Farm Risk Analysis</Text>
                    {weather?.rain_prob > 50 ? (
                        <View style={[styles.riskCard, { backgroundColor: '#FFF5F5', borderColor: '#FF6B6B' }]}>
                            <Ionicons name="warning" size={24} color="#FF6B6B" />
                            <Text style={[styles.riskText, { color: '#FF6B6B' }]}>High chance of rain ({weather.rain_prob}%). Delay spraying pesticides.</Text>
                        </View>
                    ) : (
                        <View style={[styles.riskCard, { backgroundColor: '#F0F9F4', borderColor: '#27AE60' }]}>
                            <Ionicons name="checkmark-circle" size={24} color="#27AE60" />
                            <Text style={[styles.riskText, { color: '#27AE60' }]}>Low rain risk. Good day for field work.</Text>
                        </View>
                    )}
                </View>

                {/* Forecast */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3-Day Forecast</Text>
                    {weather?.forecast?.map((day: any, index: number) => (
                        <View key={index} style={styles.forecastRow}>
                            <Text style={styles.dayText}>{day.day}</Text>
                            <View style={styles.forecastInfo}>
                                <Ionicons name={getIcon(day.condition)} size={24} color="#555" />
                                <Text style={styles.forecastTemp}>{day.temp}°C</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5FDF9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'white',
        // Header shadow style from HomeScreen
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 4,
        zIndex: 10,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginLeft: 16 },
    scrollContent: { padding: 16 },

    currentCard: {
        backgroundColor: '#3498DB',
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
    },
    locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    locationText: { color: 'white', fontSize: 18, fontWeight: '600', marginLeft: 8 },
    tempRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    tempText: { color: 'white', fontSize: 48, fontWeight: 'bold' },
    conditionText: { color: 'white', fontSize: 20, opacity: 0.9 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.2)', padding: 12, borderRadius: 12 },
    statItem: { flexDirection: 'row', alignItems: 'center' },
    statText: { color: 'white', marginLeft: 6, fontWeight: '600' },

    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#1A1A1A' },

    riskCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    riskText: { marginLeft: 12, flex: 1, fontSize: 15, fontWeight: '500' },

    forecastRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    dayText: { fontSize: 16, fontWeight: '600', color: '#333' },
    forecastInfo: { flexDirection: 'row', alignItems: 'center' },
    forecastTemp: { marginLeft: 12, fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
});
