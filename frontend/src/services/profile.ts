import { db, storage } from './firebase';
import axios from 'axios';
import { doc, setDoc, getDoc } from 'firebase/firestore/lite';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { logger } from '../utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBase } from './api';

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

const PROFILE_CACHE_KEY = 'agrisarathi_user_profile';

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

      // 1. Always save to local storage (AsyncStorage) for offline support
      try {
        await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profileData));
        logger.info('Profile', 'Profile saved to local storage', { uid: profile.uid });
      } catch (localError) {
        logger.warn('Profile', 'Failed to save to local storage', { error: localError });
      }

      const apiBase = getApiBase();

      // 2. Attempt to save via Backend API
      let backendSuccess = false;
      if (apiBase) {
        try {
          logger.debug('Profile', 'Attempting backend save...', { url: `${apiBase}/profile/update` });
          await axios.put(`${apiBase}/profile/update`, profileData, {
            timeout: 15000, // Increased for tunnel latency
            headers: {
              'bypass-tunnel-reminder': 'true'
            }
          });
          logger.info('Profile', 'Profile saved via Backend API', { uid: profile.uid });
          backendSuccess = true;
        } catch (apiError: any) {
          logger.warn('Profile', 'Backend API save failed, falling back', { 
            error: apiError.message,
            code: apiError.code,
            isAxiosError: !!apiError.isAxiosError 
          });
          // Fallthrough to Firestore direct write
        }
      }

      // 3. Attempt direct Firestore save
      let firestoreSuccess = false;
      try {
        // Safety check for mock Firestore
        if ((db as any).isMock || !db) {
          logger.warn('Profile', 'Safe Mode: Direct Firestore save skipped (API disabled).');
        } else {
          await setDoc(doc(db, 'users', profile.uid), profileData, { merge: true });
          logger.info('Profile', 'Profile saved successfully (Direct)', { uid: profile.uid });
          firestoreSuccess = true;
        }
      } catch (firestoreError: any) {
         const errorMsg = firestoreError.message?.toLowerCase() || '';
         if (
           errorMsg.includes('firestore.googleapis.com') ||
           errorMsg.includes('database (default) does not exist') ||
           firestoreError.code === 'permission-denied'
         ) {
           logger.warn('Profile', 'Firestore API disabled or DB missing.');
         } else {
           logger.error('Profile', 'Error saving to Firestore', { error: firestoreError.message });
         }
      }

      // Return success if at least local save worked, but ideally backend/firestore should work
      // If we are offline, local save is enough for the user experience
      return { success: true, backendSuccess, firestoreSuccess };

    } catch (error: any) {
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
    let fetchedProfile: UserProfile | null = null;

    // 1. Try Backend API
    const apiBase = getApiBase();
    if (apiBase) {
      try {
        logger.debug('Profile', 'Attempting backend fetch...', { uid });
        const response = await axios.get(`${apiBase}/profile/${uid}`, {
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

          fetchedProfile = {
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

    // 2. Try Firestore if backend failed
    if (!fetchedProfile) {
      try {
        logger.debug('Profile', 'Attempting direct Firestore fetch...', { uid });
        // Safety check for mock Firestore
        if (!((db as any).isMock || !db)) {
          const snap = await getDoc(doc(db, 'users', uid));
          if (snap.exists()) {
             fetchedProfile = snap.data() as UserProfile;
             logger.info('Profile', 'Profile fetched (Direct)', { uid, exists: true });
          }
        } else {
           logger.warn('Profile', 'Safe Mode: Direct Firestore fetch skipped (API disabled).');
        }
      } catch (firestoreError: any) {
        logger.warn('Profile', 'Firestore fetch failed', { error: firestoreError.message });
      }
    }

    // 3. Try Local Storage (AsyncStorage) if both failed or returned null
    if (!fetchedProfile) {
      try {
        const localData = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
        if (localData) {
          fetchedProfile = JSON.parse(localData);
          logger.info('Profile', 'Profile fetched from local storage (Fallback)', { uid });
        }
      } catch (localError) {
        logger.error('Profile', 'Local storage fetch failed', { error: localError });
      }
    }
    
    // 4. Update local storage with fresh data if we fetched it from remote
    if (fetchedProfile) {
       AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(fetchedProfile)).catch(err => 
          logger.warn('Profile', 'Failed to update local cache', err)
       );
    }

    return fetchedProfile;
  },

  uploadProfilePicture: async (uid: string, uri: string): Promise<{ success: boolean; url?: string; error?: string }> => {
    try {
      logger.info('Profile', 'Uploading profile picture', { uid });
      
      // 1. Save locally first (optimistic update)
      try {
         const currentProfileStr = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
         if (currentProfileStr) {
            const currentProfile = JSON.parse(currentProfileStr);
            currentProfile.photoURL = uri; // Use local URI temporarily
            await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(currentProfile));
         }
      } catch (e) {
         console.warn("Failed to update local profile picture cache", e);
      }

      // 2. Upload to Firebase Storage
      let url = uri;
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        const storageRef = ref(storage, `profiles/${uid}/avatar.jpg`);

        await uploadBytes(storageRef, blob);
        url = await getDownloadURL(storageRef);
      } catch (uploadError: any) {
        logger.warn('Profile', 'Network upload failed, keeping local URI', { error: uploadError.message });
        // We continue with the local URI so the user sees their change immediately even if offline
      }

      // 3. Update Firestore with new photoURL
      if (!(db as any).isMock && db && url.startsWith('http')) {
        try {
            await setDoc(doc(db, 'users', uid), { photoURL: url }, { merge: true });
            logger.info('Profile', 'Profile picture updated (Direct)', { uid, url });
        } catch (e) {
            logger.warn('Profile', 'Firestore update failed', e);
        }
      }

      // 4. Update Backend with new photoURL
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
      if (backendUrl && url.startsWith('http')) {
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

      // 5. Update local storage with the REAL remote URL (or local if upload failed)
      try {
         const currentProfileStr = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
         if (currentProfileStr) {
            const currentProfile = JSON.parse(currentProfileStr);
            currentProfile.photoURL = url; 
            await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(currentProfile));
         }
      } catch (e) {
         console.warn("Failed to update local profile picture cache with remote URL", e);
      }

      return { success: true, url };
    } catch (error: any) {
      logger.error('Profile', 'Error uploading profile picture', { error: error.message });
      
      // Even if everything exploded, if we have the local URI, return it
      return { success: true, url: uri };
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
