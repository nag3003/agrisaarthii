import { db, storage } from './firebase';
import axios from 'axios';
import { doc, setDoc, getDoc } from 'firebase/firestore/lite';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { logger } from '../utils/logger';

export type UserRole = 'farmer' | 'worker' | 'landowner';

export interface UserProfile {
  uid: string;
  name: string;
  email?: string;
  role: UserRole;
  language: 'te' | 'ta' | 'hi' | 'en';
  location: string;
  state?: string;
  district?: string;
  landSize?: number;
  primaryCrop?: string;
  irrigationType?: 'Borewell' | 'Canal' | 'Rainfed';
  riskLevel?: 'Low' | 'Medium' | 'High';
  lastLogin?: string;
  createdAt?: string;
  photoURL?: string;
}

export const ProfileService = {
  saveProfile: async (profile: UserProfile) => {
    try {
      // Deep clean data: remove all undefined values
      const cleanData = JSON.parse(JSON.stringify(profile, (key, value) => {
        return value === undefined ? null : value;
      }));

      const profileData = {
        ...cleanData,
        updatedAt: new Date().toISOString(),
        createdAt: profile.createdAt || new Date().toISOString(),
      };

      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;

      // Attempt to save via Backend API
      if (backendUrl) {
        try {
          logger.debug('Profile', 'Attempting backend save...', { url: `${backendUrl}/api/profile/update` });
          await axios.put(`${backendUrl}/api/profile/update`, profileData, {
            timeout: 15000, // Increased for tunnel latency
            headers: {
              'bypass-tunnel-reminder': 'true'
            }
          });
          logger.info('Profile', 'Profile saved via Backend API', { uid: profile.uid });
          return { success: true };
        } catch (apiError: any) {
          logger.warn('Profile', 'Backend API save failed, falling back', { 
            error: apiError.message,
            code: apiError.code,
            isAxiosError: !!apiError.isAxiosError 
          });
          // Fallthrough to Firestore direct write
        }
      }

      logger.debug('Profile', 'Attempting direct Firestore save...', { uid: profile.uid });
      
      // Safety check for mock Firestore
      if ((db as any).isMock || !db) {
        logger.warn('Profile', 'Safe Mode: Direct Firestore save skipped (API disabled).');
        return { success: true, apiDisabled: true };
      }

      await setDoc(doc(db, 'users', profile.uid), profileData, { merge: true });
      logger.info('Profile', 'Profile saved successfully (Direct)', { uid: profile.uid });
      return { success: true };
    } catch (error: any) {
      const errorMsg = error.message?.toLowerCase() || '';
      if (
        errorMsg.includes('firestore.googleapis.com') ||
        errorMsg.includes('database (default) does not exist') ||
        error.code === 'permission-denied'
      ) {
        logger.warn('Profile', 'Firestore API disabled or DB missing, profile data local only.');
        return { success: true, apiDisabled: true };
      }
      logger.error('Profile', 'Error saving profile', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  updateLoginMetadata: async (uid: string) => {
    try {
      // Safety check for mock Firestore
      if ((db as any).isMock || !db) {
        return;
      }
      
      await setDoc(doc(db, 'users', uid), {
        lastLogin: new Date().toISOString(),
      }, { merge: true });
      logger.debug('Profile', 'Login metadata updated', { uid });
    } catch (error: any) {
      // ... (existing error handling)
    }
  },

  getProfile: async (uid: string): Promise<UserProfile | null> => {
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
      if (backendUrl) {
        try {
          logger.debug('Profile', 'Attempting backend fetch...', { uid });
          const response = await axios.get(`${backendUrl}/api/profile/${uid}`, {
            timeout: 15000, // Increased for tunnel latency
            headers: {
              'bypass-tunnel-reminder': 'true'
            }
          });
          if (response.data) {
            logger.info('Profile', 'Profile fetched via Backend API', { uid });
            // Map backend FarmerProfile back to frontend UserProfile if needed
            const b = response.data;
            let state = b.state;
            let district = b.district;

            // Handle nested location object from backend if present
            if (b.location && typeof b.location === 'object') {
              state = state || b.location.state;
              district = district || b.location.district;
            }

            return {
              uid: b.id || uid,
              name: b.name,
              email: b.email,
              role: b.role || 'farmer',
              location: typeof b.location === 'string' ? b.location : (b.location?.raw || 'Unknown'),
              state: state,
              district: district,
              language: b.language,
              primaryCrop: b.primary_crops?.[0],
              landSize: b.land_size ? Number(b.land_size) : undefined,
              irrigationType: b.water_access,
              riskLevel: b.risk_tolerance,
              photoURL: b.photo_url,
            };
          }
        } catch (apiError: any) {
          logger.warn('Profile', 'Backend API fetch failed, falling back', { 
            error: apiError.message,
            code: apiError.code
          });
        }
      }

      logger.debug('Profile', 'Attempting direct Firestore fetch...', { uid });
      
      // Safety check for mock Firestore
      if ((db as any).isMock || !db) {
        logger.warn('Profile', 'Safe Mode: Direct Firestore fetch skipped (API disabled).');
        return null;
      }

      const snap = await getDoc(doc(db, 'users', uid));
      const profile = snap.exists() ? (snap.data() as UserProfile) : null;
      logger.info('Profile', 'Profile fetched (Direct)', { uid, exists: !!profile });
      return profile;
    } catch (error: any) {
      const errorMsg = error.message?.toLowerCase() || '';
      if (
        errorMsg.includes('firestore.googleapis.com') ||
        errorMsg.includes('database (default) does not exist') ||
        error.code === 'permission-denied'
      ) {
        logger.warn('Profile', 'Firestore API disabled, returning null profile.');
        return null;
      }
      logger.error('Profile', 'Error fetching profile', { error: error.message });
      return null;
    }
  },

  uploadProfilePicture: async (uid: string, uri: string): Promise<{ success: boolean; url?: string; error?: string }> => {
    try {
      logger.info('Profile', 'Uploading profile picture', { uid });
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `profiles/${uid}/avatar.jpg`);

      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      // Update Firestore with new photoURL if not in mock mode
      if (!(db as any).isMock && db) {
        await setDoc(doc(db, 'users', uid), { photoURL: url }, { merge: true });
        logger.info('Profile', 'Profile picture updated (Direct)', { uid, url });
      } else {
        logger.warn('Profile', 'Safe Mode: Firestore profile picture update skipped.');
      }

      // Update Backend with new photoURL if available
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
      if (backendUrl) {
        try {
          await axios.put(`${backendUrl}/api/profile/update`, {
            uid,
            photoURL: url
          }, {
            headers: { 'bypass-tunnel-reminder': 'true' },
            timeout: 10000
          });
          logger.info('Profile', 'Profile picture updated via Backend API', { uid });
        } catch (apiErr: any) {
          logger.warn('Profile', 'Backend photoURL update failed', { error: apiErr.message });
        }
      }

      return { success: true, url };
    } catch (error: any) {
      logger.error('Profile', 'Error uploading profile picture', { error: error.message });
      return { success: false, error: error.message };
    }
  },

  getCoordinatesForLocation: (state: string, district: string): { lat: number, lon: number } => {
    // Simple lookup map for major districts
    // In a real app, use a Geocoding API
    const locationMap: Record<string, { lat: number, lon: number }> = {
      'nashik': { lat: 20.00, lon: 73.78 },
      'pune': { lat: 18.52, lon: 73.85 },
      'mumbai': { lat: 19.07, lon: 72.87 },
      'nagpur': { lat: 21.14, lon: 79.08 },
      'indore': { lat: 22.71, lon: 75.85 },
      'bhopal': { lat: 23.25, lon: 77.41 },
      'karnal': { lat: 29.68, lon: 76.99 },
      'rajkot': { lat: 22.30, lon: 70.80 },
      'amravati': { lat: 20.93, lon: 77.75 },
    };

    const key = district.toLowerCase();
    return locationMap[key] || { lat: 20.59, lon: 78.96 }; // Fallback to India center
  }
};
