import { auth, db } from './firebase';
import {
  onAuthStateChanged,
  signOut,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  OAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
} from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore/lite';
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { Platform } from 'react-native';
import { logger } from '../utils/logger';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    // On web, we don't strictly need redirectUri here if using popup
  });

  const signInWithGoogle = async () => {
    try {
      const clientId = GOOGLE_CLIENT_ID;

      if (!clientId || clientId.includes('YOUR_')) {
        const errorMsg = "Google Configuration Error:\n\n1. Copy your Web Client ID from Google Cloud Console.\n2. Paste it into .env as EXPO_PUBLIC_GOOGLE_CLIENT_ID.\n3. RESTART your terminal.";
        logger.error('Auth', errorMsg);
        throw new Error(errorMsg);
      }

      logger.info('Auth', 'Initiating Google Sign-In...');

      // --- WEB SPECIFIC FLOW ---
      if (Platform.OS === 'web') {
        logger.info('Auth', 'Using Firebase Popup for Web...');
        const provider = new GoogleAuthProvider();
        // Force account selection
        provider.setCustomParameters({ prompt: 'select_account' });
        const userCredential = await signInWithPopup(auth, provider);
        return userCredential.user;
      }

      // --- NATIVE SPECIFIC FLOW ---
      const result = await promptAsync();
      logger.info('Auth', 'Google Auth Result received', { type: result.type });

      if (result.type === "success") {
        const { id_token } = result.params;
        const credential = GoogleAuthProvider.credential(id_token);
        const userCredential = await signInWithCredential(auth, credential);
        return userCredential.user;
      } else if (result.type === "cancel") {
        throw new Error("Google login was cancelled");
      } else {
        throw new Error(`Google login failed: ${result.type}`);
      }
    } catch (error: any) {
      logger.error('Auth', "Google Sign-In Error", { error: error.message });
      throw error;
    }
  };

  return { signInWithGoogle, request };
}

// --- APPLE AUTH ---
import * as AppleAuthentication from 'expo-apple-authentication';

export function useAppleAuth() {
  const signInWithApple = async () => {
    try {
      logger.info('Auth', 'Initiating Apple Sign-In...');

      if (Platform.OS === 'android') {
        throw new Error('Apple Sign-In is not supported on Android devices.');
      }

      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Apple Sign-In is not available on this device.');
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken, fullName } = credential;
      if (!identityToken) {
        throw new Error('No identity token provided by Apple.');
      }

      logger.info('Auth', 'Apple Identity Token received');

      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');

      const firebaseCredential = provider.credential({
        idToken: identityToken,
        // Apple only returns name on first login, so we might need to handle it elsewhere or store it
      });

      const result = await signInWithCredential(auth, firebaseCredential);

      // Store name if it's the first time and Apple provided it
      if (fullName && result.user) {
        // We can pass this back or update profile immediately
        return { user: result.user, fullName };
      }

      return { user: result.user };
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        throw new Error('Apple login cancelled');
      }
      logger.error('Auth', 'Apple Sign-In Error', error);
      throw error;
    }
  };

  return { signInWithApple };
}

export const AuthService = {
  onAuthStateChanged: (callback: (user: User | null) => void) =>
    onAuthStateChanged(auth, callback),

  getCurrentUser: () => auth.currentUser,

  login: async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      logger.info('Auth', 'Firebase login successful', { uid: result.user.uid });
      return { user: result.user, success: true };
    } catch (error: any) {
      logger.error('Auth', 'Firebase Login Error', { code: error.code, message: error.message });
      let message = 'An error occurred during login';

      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential')
        message = 'Invalid email or password. Please check your credentials.';
      else if (error.code === 'auth/too-many-requests')
        message = 'Too many failed attempts. Your account has been temporarily disabled. Please try again later.';
      else if (error.code === 'auth/network-request-failed')
        message = 'Network error. Please check your internet connection.';
      else if (error.code === 'auth/invalid-api-key')
        message = 'Configuration Error: Invalid Firebase API Key.';
      else
        message = `Login failed: ${error.message}`;

      return { error: message, success: false };
    }
  },

  register: async (email: string, password: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      logger.info('Auth', 'Firebase registration successful', { uid: result.user.uid });
      return { user: result.user, success: true };
    } catch (error: any) {
      logger.error('Auth', 'Firebase Registration Error', { code: error.code, message: error.message });
      let message = 'An error occurred during registration';

      if (error.code === 'auth/email-already-in-use') message = 'This email is already in use. Try logging in instead.';
      else if (error.code === 'auth/invalid-email') message = 'Invalid email address format.';
      else if (error.code === 'auth/weak-password') message = 'Password is too weak. Please use at least 6 characters.';
      else if (error.code === 'auth/network-request-failed') message = 'Network error. Please check your internet connection.';
      else if (error.code === 'auth/invalid-api-key') message = 'Configuration Error: Invalid Firebase API Key.';
      else if (error.code === 'auth/configuration-not-found') message = 'Configuration Error: Firebase project not found.';
      else message = `Registration failed: ${error.message}`;

      return { error: message, success: false };
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
      logger.info('Auth', 'User logged out');
      return { success: true };
    } catch (e: any) {
      logger.error('Auth', 'Logout error', { error: e.message });
      return { success: false, error: e.message };
    }
  },

  listenAuth: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
  },
};

