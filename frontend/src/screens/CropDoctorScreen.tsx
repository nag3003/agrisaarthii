import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    ScrollView,
    Alert,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { diagnoseCrop } from '../services/api';

export const CropDoctorScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const [image, setImage] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);

    const pickImage = async (source: 'camera' | 'gallery') => {
        try {
            let permissionResult;

            if (source === 'camera') {
                permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            } else {
                permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            }

            if (permissionResult.status !== 'granted') {
                Alert.alert("Permission Denied", "We need access to your camera/gallery to diagnose crops.");
                return;
            }

            const pickerResult = source === 'camera'
                ? await ImagePicker.launchCameraAsync({ quality: 0.5, allowsEditing: true })
                : await ImagePicker.launchImageLibraryAsync({ quality: 0.5, allowsEditing: true });

            if (!pickerResult.canceled && pickerResult.assets[0].uri) {
                setImage(pickerResult.assets[0].uri);
                analyzeImage(pickerResult.assets[0].uri);
            }
        } catch (error) {
            Alert.alert("Error", "Failed to capture image.");
        }
    };

    const analyzeImage = async (uri: string) => {
        setAnalyzing(true);
        setResult(null);
        try {
            const response = await diagnoseCrop(uri);
            // Simulate backend response structure matching our mock/real AI
            // If the backend returns just diagnosis string, wrap it.
            // If it returns full JSON, use it.

            if (response && (response.diagnosis || response.remedy)) {
                setResult(response);
            } else {
                // Fallback if backend structure differs
                setResult({
                    diagnosis: "Analysis Complete",
                    confidence: 85,
                    remedy: typeof response === 'string' ? response : JSON.stringify(response)
                });
            }
        } catch (error) {
            Alert.alert("Analysis Failed", "Could not analyze the image. Please try again.");
        } finally {
            setAnalyzing(false);
        }
    };

    const reset = () => {
        setImage(null);
        setResult(null);
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Crop Doctor AI</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Image Preview / Placeholder */}
                <View style={styles.imageContainer}>
                    {image ? (
                        <Image source={{ uri: image }} style={styles.previewImage} />
                    ) : (
                        <View style={styles.placeholder}>
                            <Ionicons name="scan-outline" size={64} color="#27AE60" />
                            <Text style={styles.placeholderText}>
                                Take a photo of the affected crop leaf or area
                            </Text>
                        </View>
                    )}

                    {/* Action Buttons */}
                    {!analyzing && !result && (
                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => pickImage('camera')}>
                                <Ionicons name="camera" size={24} color="white" />
                                <Text style={styles.actionBtnText}>Camera</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionBtn, styles.galleryBtn]} onPress={() => pickImage('gallery')}>
                                <Ionicons name="images" size={24} color="#27AE60" />
                                <Text style={[styles.actionBtnText, { color: '#27AE60' }]}>Gallery</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Loading State */}
                {analyzing && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#27AE60" />
                        <Text style={styles.loadingText}>Analyzing crop health...</Text>
                        <Text style={styles.loadingSub}>AI is checking for diseases and pests</Text>
                    </View>
                )}

                {/* Results */}
                {result && (
                    <View style={styles.resultCard}>
                        <View style={styles.resultHeader}>
                            <View>
                                <Text style={styles.diagnosisLabel}>DIAGNOSIS</Text>
                                <Text style={styles.diagnosisTitle}>{result.diagnosis}</Text>
                            </View>
                            <View style={styles.confidenceBadge}>
                                <Text style={styles.confidenceText}>{result.confidence}% Match</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <Text style={styles.sectionHeader}>Recommended Treatment</Text>
                        <Text style={styles.remedyText}>{result.remedy}</Text>

                        <TouchableOpacity style={styles.resetBtn} onPress={reset}>
                            <Text style={styles.resetBtnText}>Scan Another Crop</Text>
                        </TouchableOpacity>
                    </View>
                )}

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
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E0F2E9',
    },
    backBtn: { padding: 4 },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A1A',
        marginLeft: 16,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    imageContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    previewImage: {
        width: '100%',
        height: 300,
        borderRadius: 20,
        resizeMode: 'cover',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    placeholder: {
        width: '100%',
        height: 300,
        borderRadius: 20,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#C8E6C9',
        borderStyle: 'dashed',
        padding: 20,
    },
    placeholderText: {
        marginTop: 16,
        color: '#666',
        textAlign: 'center',
        fontSize: 16,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 20,
    },
    actionBtn: {
        flex: 1,
        backgroundColor: '#27AE60',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        marginRight: 10,
        shadowColor: '#27AE60',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    galleryBtn: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#27AE60',
        marginRight: 0,
        marginLeft: 10,
    },
    actionBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    loadingContainer: {
        backgroundColor: 'white',
        padding: 30,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
    loadingSub: {
        marginTop: 6,
        color: '#666',
    },
    resultCard: {
        backgroundColor: 'white',
        padding: 24,
        borderRadius: 20,
        shadowColor: '#27AE60',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        borderWidth: 1,
        borderColor: 'rgba(39, 174, 96, 0.1)',
    },
    resultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    diagnosisLabel: {
        color: '#666',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 4,
    },
    diagnosisTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#E74C3C', // Red for disease, typical usage
    },
    confidenceBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    confidenceText: {
        color: '#27AE60',
        fontWeight: '700',
        fontSize: 12,
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginVertical: 16,
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 8,
    },
    remedyText: {
        fontSize: 16,
        color: '#444',
        lineHeight: 24,
    },
    resetBtn: {
        marginTop: 24,
        backgroundColor: '#F5FDF9',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#27AE60',
    },
    resetBtnText: {
        color: '#27AE60',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
