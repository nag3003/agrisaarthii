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
import { getSensors, controlMotor } from '../services/api';

export const SoilHealthScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await getSensors();
            setData(res);
        } catch (e) {
            console.error("Sensor fetch failed", e);
        } finally {
            setLoading(false);
        }
    };

    const handleMotor = async () => {
        if (!data) return;
        setToggling(true);
        try {
            const action = data.motor_status === 'TURN_ON' ? 'OFF' : 'ON';
            const res = await controlMotor(action);
            // Optimistic update
            setData({
                ...data,
                motor_status: action === 'ON' ? 'TURN_ON' : 'TURN_OFF'
            });
        } catch (e) {
            console.error(e);
        } finally {
            setToggling(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#27AE60" />
            </View>
        );
    }

    // Mock NPK values for visualization since basic sensor mainly does moisture
    const NPK = { n: 45, p: 22, k: 30 };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Soil Health & IoT</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Moisture Card */}
                <View style={styles.mainCard}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Live Soil Structure</Text>
                        <View style={styles.liveBadge}><Text style={styles.liveText}>LIVE</Text></View>
                    </View>

                    <View style={styles.moistureContainer}>
                        <View style={styles.circle}>
                            <Text style={styles.moistureValue}>{data?.current_value}%</Text>
                            <Text style={styles.moistureLabel}>Moisture</Text>
                        </View>
                        <View style={styles.statusInfo}>
                            <Text style={styles.statusTitle}>Current Status</Text>
                            <Text style={styles.statusDesc}>{data?.voice_alert}</Text>
                        </View>
                    </View>

                    {/* Motor Control */}
                    <View style={styles.motorSection}>
                        <View>
                            <Text style={styles.motorLabel}>Irrigation Motor</Text>
                            <Text style={styles.motorSub}>{data?.motor_status === 'TURN_ON' ? 'Running' : 'Stopped'}</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.motorBtn, data?.motor_status === 'TURN_ON' ? styles.motorStop : styles.motorStart]}
                            onPress={handleMotor}
                            disabled={toggling}
                        >
                            {toggling ? <ActivityIndicator color="white" /> : (
                                <Text style={styles.motorBtnText}>
                                    {data?.motor_status === 'TURN_ON' ? 'STOP MOTOR' : 'START MOTOR'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Nutrients */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Nutrient Analysis (Last Lab Test)</Text>
                    <View style={styles.npkRow}>
                        <View style={[styles.npkCard, { backgroundColor: '#E3F2FD' }]}>
                            <Text style={[styles.chemHtml, { color: '#1976D2' }]}>N</Text>
                            <Text style={styles.chemVal}>{NPK.n}</Text>
                            <Text style={styles.chemLabel}>Nitrogen</Text>
                        </View>
                        <View style={[styles.npkCard, { backgroundColor: '#E8F5E9' }]}>
                            <Text style={[styles.chemHtml, { color: '#388E3C' }]}>P</Text>
                            <Text style={styles.chemVal}>{NPK.p}</Text>
                            <Text style={styles.chemLabel}>Phosphorus</Text>
                        </View>
                        <View style={[styles.npkCard, { backgroundColor: '#FFF3E0' }]}>
                            <Text style={[styles.chemHtml, { color: '#F57C00' }]}>K</Text>
                            <Text style={styles.chemVal}>{NPK.k}</Text>
                            <Text style={styles.chemLabel}>Potassium</Text>
                        </View>
                    </View>
                </View>

                {/* Recommendations */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>AI Recommendations</Text>
                    <View style={styles.recCard}>
                        <Ionicons name="leaf" size={24} color="#27AE60" />
                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={styles.recText}>Nitrogen slightly low. Consider top dressing Urea @ 25kg/acre.</Text>
                        </View>
                    </View>
                    <View style={styles.recCard}>
                        <Ionicons name="water" size={24} color="#3498DB" />
                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={styles.recText}>{data?.savings_estimate !== "N/A" ? data.savings_estimate : "Soil moisture is good."}</Text>
                        </View>
                    </View>
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

    mainCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        elevation: 4,
        shadowColor: '#27AE60',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
    liveBadge: { backgroundColor: '#FF6B6B', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    liveText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

    moistureContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    circle: {
        width: 100, height: 100, borderRadius: 50,
        borderWidth: 8, borderColor: '#3498DB',
        justifyContent: 'center', alignItems: 'center',
    },
    moistureValue: { fontSize: 24, fontWeight: 'bold', color: '#3498DB' },
    moistureLabel: { fontSize: 12, color: '#666' },
    statusInfo: { flex: 1, marginLeft: 20 },
    statusTitle: { fontSize: 14, color: '#999', fontWeight: '600', marginBottom: 4 },
    statusDesc: { fontSize: 15, color: '#333', lineHeight: 22 },

    motorSection: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 16
    },
    motorLabel: { fontSize: 14, color: '#666' },
    motorSub: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },
    motorBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, minWidth: 120, alignItems: 'center' },
    motorStart: { backgroundColor: '#27AE60' },
    motorStop: { backgroundColor: '#FF6B6B' },
    motorBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },

    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#1A1A1A' },

    npkRow: { flexDirection: 'row', justifyContent: 'space-between' },
    npkCard: { width: '30%', padding: 12, borderRadius: 12, alignItems: 'center' },
    chemHtml: { fontSize: 24, fontWeight: '900', marginBottom: 4 },
    chemVal: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    chemLabel: { fontSize: 11, color: '#666' },

    recCard: {
        flexDirection: 'row', backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 10,
        borderWidth: 1, borderColor: '#E0F2E9'
    },
    recText: { color: '#444', fontSize: 14, lineHeight: 20 },
});
