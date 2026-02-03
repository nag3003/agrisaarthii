import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
// Add hook import
import { AuthService, useGoogleAuth, useAppleAuth } from '../services/auth';
import { ProfileService, UserProfile } from '../services/profile';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

import { Storage } from '../services/storage';

import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

export const LoginScreen: React.FC = () => {
  const { refreshSession } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const { signInWithGoogle } = useGoogleAuth();
  const { signInWithApple } = useAppleAuth(); // New Hook

  // ... (existing code) ...

  const handleAppleSignIn = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'Apple Sign-In on Web requires extra configuration. Please use Email or Google.');
      return;
    }

    try {
      setLoading(true);
      showToast('Connecting to Apple...', 'info');
      const { user, fullName } = await signInWithApple();

      if (user) {
        showToast('Syncing your profile...', 'info');
        try {
          await ProfileService.updateLoginMetadata(user.uid);
          let profile = await ProfileService.getProfile(user.uid);

          if (!profile) {
            // Constuct name from Apple provided name if available
            let displayName = 'Apple User';
            if (fullName) {
              displayName = [fullName.givenName, fullName.familyName].filter(Boolean).join(' ') || 'Apple User';
            }

            profile = {
              uid: user.uid,
              name: displayName,
              email: user.email || '',
              role: 'farmer',
              language: 'en',
              location: 'Unknown',
              photoURL: null,
              createdAt: new Date().toISOString(),
            };
            await ProfileService.saveProfile(profile);
          }

          const userRole = profile?.role || 'farmer';
          await Storage.saveUser({
            uid: user.uid,
            email: user.email || '',
            role: userRole
          });

          showToast(`Welcome, ${profile.name}!`, 'success');
          await refreshSession();
        } catch (syncErr: any) {
          await Storage.saveUser({
            uid: user.uid,
            email: user.email || '',
            role: 'farmer'
          });
          showToast('Signed in successfully', 'success');
          await refreshSession();
        }
      }
    } catch (error: any) {
      console.error("Apple Sign-In Error:", error);
      if (error.message !== "Apple login cancelled") {
        Alert.alert('Apple Sign-In Error', error.message || 'An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState('');
  const [role, setRole] = useState<'farmer' | 'worker' | 'landowner'>('farmer');
  const [primaryCrop, setPrimaryCrop] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [apiError, setApiError] = useState<boolean>(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // Voice Recognition for Email (Web only)
  const startVoiceEmail = () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Voice Input', 'Voice login is currently only available on web browsers.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      Alert.alert('Not Supported', 'Your browser does not support speech recognition.');
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = "en-US";
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);

      rec.onresult = (e: any) => {
        let spoken = e.results[0][0].transcript
          .toLowerCase()
          .trim()
          .replace(/\s+at\s+/g, "@")
          .replace(/\s+dot\s+/g, ".")
          .replace(/\s+/g, ""); // Remove all remaining spaces for email

        // Common corrections
        spoken = spoken.replace(/gmail\.co$/, "gmail.com");
        spoken = spoken.replace(/yahoo\.co$/, "yahoo.com");

        setEmail(spoken);
        setIsListening(false);
      };

      rec.onerror = (err: any) => {
        console.error("Speech recognition error:", err);
        setIsListening(false);
      };

      rec.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsListening(false);
    }
  };

  // Animation values for live wallpaper effect
  const animValue1 = React.useRef(new Animated.Value(0)).current;
  const animValue2 = React.useRef(new Animated.Value(0)).current;
  const cardAnim = React.useRef(new Animated.Value(0)).current;
  const particles = React.useRef([...Array(6)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Card entrance
    Animated.spring(cardAnim, {
      toValue: 1,
      tension: 20,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Particle animations
    particles.forEach((p, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 500),
          Animated.timing(p, {
            toValue: 1,
            duration: 3000 + i * 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(p, {
            toValue: 0,
            duration: 3000 + i * 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
    const createAnimation = (value: Animated.Value, duration: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration: duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ])
      );
    };

    createAnimation(animValue1, 8000).start();
    createAnimation(animValue2, 12000).start();
  }, []);

  const handleSignIn = async () => {
    const validateEmail = (email: string) => {
      return String(email)
        .toLowerCase()
        .match(
          /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
    };

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (activeTab === 'login') {
      if (!trimmedEmail || !trimmedPassword) {
        showToast('Please enter both email and password', 'error');
        return;
      }
      if (!validateEmail(trimmedEmail)) {
        showToast('Please enter a valid email address', 'error');
        return;
      }
      try {
        setLoading(true);
        const result = await AuthService.login(trimmedEmail, trimmedPassword);
        if (result.success && result.user) {
          showToast('Logging in...', 'info');

          try {
            await ProfileService.updateLoginMetadata(result.user.uid);
            const profile = await ProfileService.getProfile(result.user.uid);

            const userRole = profile?.role || 'farmer';
            await Storage.saveUser({
              uid: result.user.uid,
              email: result.user.email || trimmedEmail,
              role: userRole
            });
            showToast('Welcome back to AgriSaarthi!', 'success');
            await refreshSession();
          } catch (profileErr: any) {
            await Storage.saveUser({
              uid: result.user.uid,
              email: result.user.email || trimmedEmail,
              role: 'farmer'
            });
            showToast('Logged in successfully', 'success');
            await refreshSession();
          }
        } else {
          showToast(result.error || 'Invalid credentials', 'error');
        }
      } catch (error: any) {
        showToast(error.message || 'Login failed', 'error');
      } finally {
        setLoading(false);
      }
    } else {
      // Signup logic
      if (!trimmedEmail || !trimmedPassword || !username.trim()) {
        showToast('Please fill in all required fields', 'error');
        return;
      }
      if (trimmedPassword.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
      }
      if (!validateEmail(trimmedEmail)) {
        showToast('Please enter a valid email address', 'error');
        return;
      }
      try {
        setLoading(true);
        showToast('Creating your account...', 'info');
        const result = await AuthService.register(trimmedEmail, trimmedPassword);

        if (result.success && result.user) {
          const profileData: UserProfile = {
            uid: result.user.uid,
            name: username.trim(),
            email: trimmedEmail,
            role: role,
            language: 'en',
            location: location.trim() || 'Not set',
            primaryCrop: role === 'farmer' ? (primaryCrop.trim() || 'Not specified') : null,
            createdAt: new Date().toISOString(),
          };

          await ProfileService.saveProfile(profileData);

          await Storage.saveUser({
            uid: result.user.uid,
            email: trimmedEmail,
            role: role
          });

          showToast('Account created! Welcome aboard.', 'success');
          await refreshSession();
        } else {
          showToast(result.error || 'Could not create account', 'error');
        }
      } catch (error: any) {
        showToast(error.message || 'Registration failed', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      showToast('Connecting to Google...', 'info');
      const user = await signInWithGoogle();

      if (user) {
        showToast('Syncing your profile...', 'info');
        try {
          await ProfileService.updateLoginMetadata(user.uid);
          let profile = await ProfileService.getProfile(user.uid);

          if (!profile) {
            profile = {
              uid: user.uid,
              name: user.displayName || 'Google User',
              email: user.email || '',
              role: 'farmer',
              language: 'en',
              location: 'Unknown',
              photoURL: user.photoURL || null,
              createdAt: new Date().toISOString(),
            };
            await ProfileService.saveProfile(profile);
          }

          const userRole = profile?.role || 'farmer';
          await Storage.saveUser({
            uid: user.uid,
            email: user.email || '',
            role: userRole
          });

          showToast(`Welcome, ${profile.name}!`, 'success');
          await refreshSession();
        } catch (syncErr: any) {
          await Storage.saveUser({
            uid: user.uid,
            email: user.email || '',
            role: 'farmer'
          });
          showToast('Signed in successfully', 'success');
          await refreshSession();
        }
      }
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      if (error.message !== "Google login cancelled" && error.message !== "Google login was cancelled") {
        Alert.alert('Google Sign-In Error', error.message || 'An unexpected error occurred during Google Sign-In');
      }
    } finally {
      setLoading(false);
    }
  };



  return (
    <View style={styles.container}>
      {/* Animated Green Background Glows */}
      <Animated.View
        style={[
          styles.glow,
          styles.glow1,
          {
            transform: [
              { scale: animValue1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] }) },
              { translateX: animValue1.interpolate({ inputRange: [0, 1], outputRange: [0, 50] }) },
              { translateY: animValue1.interpolate({ inputRange: [0, 1], outputRange: [0, -30] }) },
            ],
            opacity: animValue1.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.5] }),
          }
        ]}
      />
      <Animated.View
        style={[
          styles.glow,
          styles.glow2,
          {
            transform: [
              { scale: animValue2.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) },
              { translateX: animValue2.interpolate({ inputRange: [0, 1], outputRange: [0, -40] }) },
              { translateY: animValue2.interpolate({ inputRange: [0, 1], outputRange: [0, 40] }) },
            ],
            opacity: animValue2.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.4] }),
          }
        ]}
      />

      {/* Floating Particles */}
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              top: `${20 + i * 15}%`,
              left: `${10 + (i % 3) * 30}%`,
              opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.4] }),
              transform: [
                { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, -50] }) },
                { scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.2] }) },
              ],
            },
          ]}
        />
      ))}

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
            <Animated.View
              style={[
                styles.card,
                {
                  opacity: cardAnim,
                  transform: [
                    { translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }
                  ]
                }
              ]}
            >
              {/* Logo Area */}
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <Ionicons name="leaf" size={32} color="#27AE60" />
                </View>
                <Text style={styles.brandName}>AgriSaarthi</Text>
              </View>

              {/* Tabs */}
              <View style={styles.tabWrapper}>
                <View style={styles.tabContainer}>
                  <TouchableOpacity
                    style={[styles.tab, activeTab === 'signup' && styles.activeTab]}
                    onPress={() => setActiveTab('signup')}
                  >
                    <Text style={[styles.tabText, activeTab === 'signup' && styles.activeTabText]}>Sign up</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tab, activeTab === 'login' && styles.activeTab]}
                    onPress={() => setActiveTab('login')}
                  >
                    <Text style={[styles.tabText, activeTab === 'login' && styles.activeTabText]}>Sign in</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.title}>
                {activeTab === 'login' ? 'Welcome back' : 'Create an account'}
              </Text>

              {apiError && (
                <View style={styles.apiErrorContainer}>
                  <Ionicons name="information-circle" size={24} color="#27AE60" />
                  <Text style={styles.apiErrorText}>
                    Welcome! We're setting up your cloud sync. If you're the developer, please ensure the Firestore database is created in the console.
                  </Text>
                  <TouchableOpacity
                    onPress={() => Platform.OS === 'web' && window.open(`https://console.cloud.google.com/datastore/setup?project=${process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'agrisarathi-ad792'}`, '_blank')}
                    style={styles.apiErrorBtn}
                  >
                    <Text style={styles.apiErrorBtnText}>Setup Database</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.form}>
                {activeTab === 'signup' && (
                  <>
                    <View style={styles.row}>
                      <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                        <TextInput
                          placeholder="First name"
                          placeholderTextColor="#555"
                          style={styles.input}
                          value={firstName}
                          onChangeText={setFirstName}
                        />
                      </View>
                      <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                        <TextInput
                          placeholder="Last name"
                          placeholderTextColor="#555"
                          style={styles.input}
                          value={lastName}
                          onChangeText={setLastName}
                        />
                      </View>
                    </View>

                    <View style={styles.inputContainer}>
                      <Ionicons name="person-outline" size={18} color="#27AE60" style={styles.inputIcon} />
                      <TextInput
                        placeholder="Username"
                        placeholderTextColor="#555"
                        style={styles.input}
                        value={username}
                        onChangeText={setUsername}
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Ionicons name="mail-outline" size={18} color="#27AE60" style={styles.inputIcon} />
                      <TextInput
                        placeholder="Enter your email"
                        placeholderTextColor="#555"
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        onPress={startVoiceEmail}
                        style={styles.voiceBtn}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={isListening ? "mic" : "mic-outline"}
                          size={20}
                          color={isListening ? "#E74C3C" : "#27AE60"}
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.inputContainer}>
                      <Ionicons name="lock-closed-outline" size={18} color="#27AE60" style={styles.inputIcon} />
                      <TextInput
                        placeholder="Password"
                        placeholderTextColor="#555"
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Ionicons name="location-outline" size={18} color="#27AE60" style={styles.inputIcon} />
                      <TextInput
                        placeholder="Location (State/District)"
                        placeholderTextColor="#555"
                        style={styles.input}
                        value={location}
                        onChangeText={setLocation}
                      />
                    </View>

                    <View style={styles.roleSelector}>
                      <Text style={styles.roleLabel}>I am a:</Text>
                      <View style={styles.roleOptions}>
                        {(['farmer', 'worker', 'landowner'] as const).map((r) => (
                          <TouchableOpacity
                            key={r}
                            style={[styles.roleOption, role === r && styles.activeRoleOption]}
                            onPress={() => setRole(r)}
                          >
                            <Text style={[styles.roleOptionText, role === r && styles.activeRoleOptionText]}>
                              {r.charAt(0).toUpperCase() + r.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {role === 'farmer' && (
                      <View style={styles.inputContainer}>
                        <Ionicons name="leaf-outline" size={18} color="#27AE60" style={styles.inputIcon} />
                        <TextInput
                          placeholder="Primary Crop (e.g. Rice, Tomato)"
                          placeholderTextColor="#555"
                          style={styles.input}
                          value={primaryCrop}
                          onChangeText={setPrimaryCrop}
                        />
                      </View>
                    )}
                  </>
                )}

                {activeTab === 'login' && (
                  <>
                    <View style={styles.inputContainer}>
                      <Ionicons name="mail-outline" size={18} color="#27AE60" style={styles.inputIcon} />
                      <TextInput
                        placeholder="Email Address"
                        placeholderTextColor="#555"
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        onPress={startVoiceEmail}
                        style={styles.voiceBtn}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={isListening ? "mic" : "mic-outline"}
                          size={20}
                          color={isListening ? "#E74C3C" : "#27AE60"}
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.inputContainer}>
                      <Ionicons name="lock-closed-outline" size={18} color="#27AE60" style={styles.inputIcon} />
                      <TextInput
                        placeholder="Password"
                        placeholderTextColor="#555"
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                      />
                    </View>
                  </>
                )}

                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 16,
                    marginTop: 8
                  }}
                  onPress={() => setAgreeToTerms(!agreeToTerms)}
                >
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    borderWidth: 2,
                    borderColor: agreeToTerms ? '#27AE60' : '#CCCCCC',
                    backgroundColor: agreeToTerms ? '#27AE60' : 'transparent',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 10
                  }}>
                    {agreeToTerms && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  </View>
                  <Text style={{ color: '#666', fontSize: 13, flex: 1 }}>
                    I agree to the <Text style={{ color: '#27AE60', fontWeight: 'bold' }}>Privacy Policy</Text> & <Text style={{ color: '#27AE60', fontWeight: 'bold' }}>Terms</Text>
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryBtn, !agreeToTerms && { backgroundColor: '#A5D6A7' }]}
                  onPress={() => {
                    if (!agreeToTerms) {
                      Alert.alert('Privacy Policy', 'Please agree to the Privacy Policy & Terms to continue.');
                      return;
                    }
                    handleSignIn();
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {activeTab === 'login' ? 'Sign in' : 'Create an account'}
                    </Text>
                  )}
                </TouchableOpacity>

                <View style={styles.dividerContainer}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>OR {activeTab === 'login' ? 'SIGN IN' : 'SIGN UP'} WITH</Text>
                  <View style={styles.divider} />
                </View>

                <View style={styles.socialContainer}>
                  <TouchableOpacity
                    style={[styles.socialBtn, !agreeToTerms && { opacity: 0.5 }]}
                    onPress={() => {
                      if (!agreeToTerms) {
                        Alert.alert('Privacy Policy', 'Please agree to the Privacy Policy & Terms to continue.');
                        return;
                      }
                      handleGoogleSignIn();
                    }}
                    disabled={loading}
                  >
                    <Ionicons name="logo-google" size={22} color="#DB4437" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.socialBtn, !agreeToTerms && { opacity: 0.5 }]}
                    onPress={() => {
                      if (!agreeToTerms) {
                        Alert.alert('Privacy Policy', 'Please agree to the Privacy Policy & Terms to continue.');
                        return;
                      }
                      handleAppleSignIn();
                    }}
                    disabled={loading}
                  >
                    <Ionicons name="logo-apple" size={22} color="#000000" />
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FDF9',
  },
  glow: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: (width * 1.5) / 2,
    opacity: 0.2,
  },
  glow1: {
    top: -width * 0.5,
    right: -width * 0.5,
    backgroundColor: '#E8F5E9',
  },
  glow2: {
    bottom: -width * 0.2,
    left: -width * 0.5,
    backgroundColor: '#C8E6C9',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 35,
    padding: 28,
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(39, 174, 96, 0.05)',
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5FDF9',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  tabWrapper: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5FDF9',
    borderRadius: 25,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(39, 174, 96, 0.1)',
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: '#27AE60',
  },
  tabText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 24,
    textAlign: 'left',
  },
  form: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5FDF9',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
    borderWidth: 1,
    borderColor: 'rgba(39, 174, 96, 0.1)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#1A1A1A',
    fontSize: 15,
    height: '100%',
  },
  voiceBtn: {
    padding: 8,
    marginLeft: 4,
  },
  roleSelector: {
    marginBottom: 20,
  },
  roleLabel: {
    color: '#666',
    fontSize: 14,
    marginBottom: 10,
    marginLeft: 4,
  },
  roleOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  roleOption: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(39, 174, 96, 0.1)',
  },
  activeRoleOption: {
    backgroundColor: '#27AE60',
    borderColor: '#27AE60',
  },
  roleOptionText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
  },
  activeRoleOptionText: {
    color: '#FFFFFF',
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#27AE60',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F5FDF9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(39, 174, 96, 0.1)',
  },
  brandName: {
    color: '#27AE60',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  primaryBtn: {
    backgroundColor: '#27AE60',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(39, 174, 96, 0.1)',
  },
  dividerText: {
    color: '#999',
    paddingHorizontal: 12,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  socialContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  socialBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  socialBtnText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  footerText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(39, 174, 96, 0.2)',
    backgroundColor: 'rgba(39, 174, 96, 0.05)',
  },
  demoBtnText: {
    color: '#27AE60',
    fontSize: 14,
    fontWeight: '600',
  },
  apiErrorContainer: {
    backgroundColor: '#F0F9F4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#D1EAD9',
    alignItems: 'center',
    flexDirection: 'column',
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  apiErrorText: {
    color: '#2C3E50',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 10,
    fontWeight: '500',
    lineHeight: 20,
  },
  apiErrorBtn: {
    backgroundColor: '#27AE60',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  apiErrorBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
