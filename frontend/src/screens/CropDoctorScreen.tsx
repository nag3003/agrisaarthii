import React, { useState, useRef, useEffect } from 'react';
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
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ImagePickerService } from '../services/imagePicker';
import { diagnoseCrop, sendVoice } from '../services/api';
import { VoiceRecordButton } from '../components/VoiceRecordButton';
import { SpeechService } from '../services/speech';
import { useAuth } from '../context/AuthContext';
import { ProfileService, UserProfile } from '../services/profile';
import { processLocalCommand } from '../utils/voiceCommandHelper';

export const CropDoctorScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { user, logout, role } = useAuth();
    const [farmer, setFarmer] = useState<UserProfile | null>(null);
    const [image, setImage] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [description, setDescription] = useState('');
    const [processingVoice, setProcessingVoice] = useState(false);
    const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState(true);
    const [listeningText, setListeningText] = useState('');

    useEffect(() => {
        if (user) {
            ProfileService.getProfile(user.uid).then(profile => {
                if (profile) setFarmer(profile);
            });
        }
    }, [user]);

    const handleVoiceCommand = (text: string) => {
        return processLocalCommand(text, {
            navigation,
            language: farmer?.language || 'hi',
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
            },
            role
        });
    };

    const handleVoiceComplete = async (uri: string) => {
        // Prime speech service immediately on user gesture
        if (isVoiceOutputEnabled) {
            SpeechService.speak("", { volume: 0 });
        }

        setProcessingVoice(true);
        try {
            const response = await sendVoice(uri);
            if (response && response.text) {
                if (handleVoiceCommand(response.text)) return;
                setDescription(prev => prev ? `${prev} ${response.text}` : response.text);
            }
        } catch (error) {
            console.error('Failed to process voice', error);
            Alert.alert("Voice Error", "Failed to process voice command. Please check your connection.");
        } finally {
            setProcessingVoice(false);
        }
    };

    const handleVoiceText = (text: string) => {
        if (isVoiceOutputEnabled) {
            SpeechService.speak("", { volume: 0 });
        }
        if (handleVoiceCommand(text)) return;

        const lower = text.toLowerCase();

        // Camera/Gallery Commands
        if (lower.includes('camera') || lower.includes('photo') || lower.includes('picture') || lower.includes('capture')) {
            pickImage('camera');
            return;
        }

        if (lower.includes('gallery') || lower.includes('upload') || lower.includes('album')) {
            pickImage('gallery');
            return;
        }

        if (lower.includes('analyze') || lower.includes('diagnose') || lower.includes('check') || lower.includes('scan')) {
            if (image) {
                analyzeImage();
            } else {
                if (isVoiceOutputEnabled) SpeechService.speak("Please take a photo first", { language: farmer?.language || 'hi' });
            }
            return;
        }

        setDescription(prev => prev ? `${prev} ${text}` : text);
    };

    const pickImage = async (source: 'camera' | 'gallery') => {
        console.log(`[CropDoctor] Button pressed: ${source}`);
        try {
            // --- WEB: use native browser APIs ---
            if (Platform.OS === 'web') {
                if (source === 'camera') {
                    // Use browser getUserMedia to access webcam
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({
                            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } }
                        });

                        const video = document.createElement('video');
                        video.srcObject = stream;
                        video.setAttribute('playsinline', 'true');
                        await video.play();

                        // Wait for video to be ready
                        await new Promise<void>(resolve => {
                            if (video.readyState >= 2) { resolve(); return; }
                            video.onloadeddata = () => resolve();
                        });

                        // Create overlay UI for camera preview
                        const overlay = document.createElement('div');
                        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;';

                        video.style.cssText = 'max-width:100%;max-height:80%;object-fit:contain;border-radius:8px;';
                        overlay.appendChild(video);

                        const btnRow = document.createElement('div');
                        btnRow.style.cssText = 'margin-top:16px;display:flex;gap:20px;';

                        const captureBtn = document.createElement('button');
                        captureBtn.textContent = '📸 Capture';
                        captureBtn.style.cssText = 'background:#27AE60;color:#fff;border:none;padding:14px 36px;border-radius:30px;font-size:18px;font-weight:bold;cursor:pointer;';

                        const cancelBtn = document.createElement('button');
                        cancelBtn.textContent = '✕ Cancel';
                        cancelBtn.style.cssText = 'background:#666;color:#fff;border:none;padding:14px 28px;border-radius:30px;font-size:16px;cursor:pointer;';

                        btnRow.appendChild(captureBtn);
                        btnRow.appendChild(cancelBtn);
                        overlay.appendChild(btnRow);
                        document.body.appendChild(overlay);

                        const imageUri = await new Promise<string | null>((resolve) => {
                            captureBtn.onclick = () => {
                                const canvas = document.createElement('canvas');
                                canvas.width = video.videoWidth;
                                canvas.height = video.videoHeight;
                                canvas.getContext('2d')?.drawImage(video, 0, 0);
                                resolve(canvas.toDataURL('image/jpeg', 0.85));
                            };
                            cancelBtn.onclick = () => resolve(null);
                        });

                        // Cleanup
                        stream.getTracks().forEach(t => t.stop());
                        document.body.removeChild(overlay);

                        if (imageUri) {
                            console.log('[CropDoctor] Captured from webcam');
                            setImage(imageUri);
                        }
                        return;
                    } catch (camErr: any) {
                        console.error('[CropDoctor] Webcam error:', camErr);
                        Alert.alert("Camera Error", "Could not access your camera. Make sure you've allowed camera permissions in your browser.");
                        return;
                    }
                } else {
                    // Gallery: use file input on web
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e: any) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                                setImage(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                        }
                    };
                    input.click();
                    return;
                }
            }

            // --- NATIVE: use expo-image-picker ---
            const permission = source === 'camera'
                ? await ImagePicker.requestCameraPermissionsAsync()
                : await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (permission.status !== 'granted') {
                Alert.alert("Permission Required", `We need ${source} access to scan crops.`);
                return;
            }

            const options: ImagePicker.ImagePickerOptions = {
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.7,
            };

            let result;
            if (source === 'camera') {
                result = await ImagePicker.launchCameraAsync(options);
            } else {
                result = await ImagePicker.launchImageLibraryAsync(options);
            }

            console.log('[CropDoctor] Picker Result Status:', result.canceled ? 'Canceled' : 'Success');

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const selectedImage = result.assets[0].uri;
                console.log('[CropDoctor] Selected Image URI:', selectedImage);
                setImage(selectedImage);
            }
        } catch (error) {
            console.error('[CropDoctor] Image Picking Error:', error);
            Alert.alert("Error", "Could not open camera or gallery. Please try again.");
        }
    };

    const analyzeImage = async () => {
        if (!image) {
            Alert.alert("No Image", "Please capture or upload an image first.");
            return;
        }

        console.log('[CropDoctor] Starting analysis for image:', image);
        setAnalyzing(true);
        setResult(null);
        try {
            const response = await diagnoseCrop(image, description);
            console.log('[CropDoctor] Diagnosis Response:', response);

            if (response && (response.diagnosis || response.remedy)) {
                setResult(response);

                // Voice output for diagnosis
                if (isVoiceOutputEnabled) {
                    const textToSpeak = `${response.diagnosis}. ${response.remedy}`;
                    SpeechService.speak(textToSpeak, {
                        language: farmer?.language || 'hi'
                    });
                }
            } else {
                console.warn('[CropDoctor] Unexpected response format:', response);
                setResult({
                    diagnosis: "Analysis Complete",
                    confidence: 85,
                    remedy: typeof response === 'string' ? response : JSON.stringify(response)
                });
            }
        } catch (error: any) {
            console.error('[CropDoctor] Analysis Error:', error);
            Alert.alert("Analysis Failed", error.message || "Could not analyze the image. Please try again.");
        } finally {
            setAnalyzing(false);
            console.log('[CropDoctor] Analysis process finished.');
        }
    };

    const reset = () => {
        setImage(null);
        setResult(null);
        setDescription('');
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>AI Crop Doctor</Text>
                <View style={{ flex: 1 }} />
                <VoiceRecordButton
                    onRecordingComplete={handleVoiceComplete}
                    onSpeechEnd={handleVoiceText}
                    onSpeechPartial={() => { }}
                    onSpeechStart={() => { }}
                    isProcessing={processingVoice}
                    size={36}
                    language={farmer?.language === 'hi' ? 'hi-IN' : 'en-US'}
                />
                <TouchableOpacity
                    style={[styles.voiceToggle, isVoiceOutputEnabled && styles.voiceToggleActive]}
                    onPress={() => {
                        const newState = !isVoiceOutputEnabled;
                        setIsVoiceOutputEnabled(newState);
                        if (newState) {
                            SpeechService.speak("Voice output enabled", { language: 'en-US' });
                        } else {
                            SpeechService.stop();
                        }
                    }}
                >
                    <Ionicons
                        name={isVoiceOutputEnabled ? "volume-high" : "volume-mute"}
                        size={22}
                        color={isVoiceOutputEnabled ? "#27AE60" : "#666"}
                    />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Upload Section */}
                <View style={styles.uploadArea}>
                    {image ? (
                        <View style={styles.previewContainer}>
                            <Image source={{ uri: image }} style={styles.previewImage} />
                            <TouchableOpacity style={styles.removeBtn} onPress={() => setImage(null)}>
                                <Ionicons name="close-circle" size={32} color="#FF5252" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.placeholderContainer}>
                            <View style={styles.pickerRow}>
                                <TouchableOpacity
                                    style={styles.pickerCard}
                                    onPress={() => pickImage('camera')}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
                                        <Ionicons name="camera" size={32} color="#27AE60" />
                                    </View>
                                    <Text style={[styles.pickerText, { color: '#27AE60' }]}>Take Photo</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.pickerCard, { borderColor: '#E3F2FD' }]}
                                    onPress={() => pickImage('gallery')}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
                                        <Ionicons name="images" size={32} color="#2196F3" />
                                    </View>
                                    <Text style={[styles.pickerText, { color: '#2196F3' }]}>Gallery</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.uploadHint}>Capture or Upload Photo (JPG, PNG)</Text>

                            {Platform.OS === 'web' && (
                                <TouchableOpacity
                                    style={styles.demoBtn}
                                    onPress={() => setImage('https://images.unsplash.com/photo-1597362925123-77861d3fbac7?q=80&w=400')}
                                >
                                    <Text style={styles.demoBtnText}>Try with Sample Image</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>

                {/* Description Section */}
                <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionTitleGroup}>
                        <Ionicons name="mic-outline" size={20} color="#27AE60" />
                        <Text style={styles.sectionTitle}>Describe the Issue</Text>
                    </View>
                    <View style={styles.optionalBadge}>
                        <Text style={styles.optionalText}>Optional</Text>
                    </View>
                </View>

                <View style={styles.voiceInputArea}>
                    <VoiceRecordButton
                        onRecordingComplete={handleVoiceComplete}
                        onSpeechEnd={(text) => {
                            handleVoiceText(text);
                            setListeningText('');
                        }}
                        onSpeechPartial={(text) => setListeningText(text)}
                        onSpeechStart={() => setListeningText('')}
                        isProcessing={processingVoice}
                        size={64}
                        language={farmer?.language === 'hi' ? 'hi-IN' : 'en-US'}
                    />
                    <View style={styles.inputWrapper}>
                        {listeningText ? (
                            <Text style={{ fontStyle: 'italic', color: '#666', marginBottom: 5 }}>{listeningText}</Text>
                        ) : null}
                        <TextInput
                            style={styles.textInput}
                            placeholder={processingVoice ? "Transcribing..." : "Tap the mic and say: 'Leaves are yellowing...'"}
                            placeholderTextColor="#999"
                            multiline
                            value={description}
                            onChangeText={setDescription}
                        />
                    </View>
                </View>

                {/* Submit Button */}
                {!result && !analyzing && (
                    <TouchableOpacity
                        style={[styles.submitBtn, !image && styles.submitBtnDisabled]}
                        onPress={analyzeImage}
                        disabled={!image || analyzing}
                    >
                        <Text style={styles.submitBtnText}>Get AI Diagnosis</Text>
                    </TouchableOpacity>
                )}

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
        backgroundColor: 'white',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    backBtn: { padding: 4 },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
        marginLeft: 16,
    },
    voiceToggle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    voiceToggleActive: {
        backgroundColor: '#E8F5E9',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    uploadArea: {
        width: '100%',
        height: 280,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        borderStyle: 'dashed',
        backgroundColor: '#FAFAFA',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        overflow: 'hidden',
    },
    placeholderContainer: {
        alignItems: 'center',
        width: '100%',
        padding: 20,
    },
    pickerRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        marginBottom: 20,
    },
    pickerCard: {
        width: 120,
        height: 120,
        backgroundColor: 'white',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E8F5E9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    pickerText: {
        fontSize: 14,
        fontWeight: '600',
    },
    uploadHint: {
        fontSize: 14,
        color: '#999',
        fontWeight: '500',
    },
    demoBtn: {
        marginTop: 16,
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#F0F0F0',
    },
    demoBtnText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    previewContainer: {
        width: '100%',
        height: '100%',
    },
    previewImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    removeBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'white',
        borderRadius: 20,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
    },
    optionalBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    optionalText: {
        fontSize: 12,
        color: '#666',
    },
    voiceInputArea: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24,
    },
    inputWrapper: {
        flex: 1,
        height: 80,
        backgroundColor: '#424242',
        borderRadius: 12,
        padding: 12,
    },
    textInput: {
        flex: 1,
        color: 'white',
        fontSize: 14,
        textAlignVertical: 'top',
    },
    submitBtn: {
        backgroundColor: '#27AE60',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 24,
    },
    submitBtnDisabled: {
        backgroundColor: '#A5D6A7',
    },
    submitBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    loadingContainer: {
        padding: 24,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
    },
    loadingSub: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    resultCard: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E0F2E9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    resultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    diagnosisLabel: {
        fontSize: 12,
        color: '#666',
        fontWeight: '700',
        marginBottom: 4,
    },
    diagnosisTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#D32F2F',
    },
    confidenceBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    confidenceText: {
        fontSize: 12,
        color: '#2E7D32',
        fontWeight: '700',
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginVertical: 16,
    },
    sectionHeader: {
        fontSize: 15,
        fontWeight: '700',
        color: '#333',
        marginBottom: 8,
    },
    remedyText: {
        fontSize: 15,
        color: '#444',
        lineHeight: 22,
    },
    resetBtn: {
        marginTop: 20,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#27AE60',
        alignItems: 'center',
    },
    resetBtnText: {
        color: '#27AE60',
        fontWeight: '700',
    },
});
