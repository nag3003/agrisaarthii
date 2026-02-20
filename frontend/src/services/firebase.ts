import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore/lite';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Validation to prevent silent failures
const missingKeys = Object.entries(firebaseConfig)
  .filter(([key, value]) => !value || value.includes('YOUR_') || value === 'placeholder')
  .map(([key]) => key);

let app;
let auth;
let db;
let storage;
let analytics;

if (missingKeys.length > 0) {
  console.error("Firebase Config Error: Missing keys", missingKeys);
  // Create dummy objects to prevent crash on import
  // This allows the UI to render and potentially show a proper error message
  app = { name: 'mock-app', options: {} } as any;
  auth = { 
    currentUser: null, 
    signOut: async () => { },
    onAuthStateChanged: (cb: any) => {
      return () => {};
    },
    isMock: true
  } as any;
  db = {} as any;
  storage = {} as any;
  analytics = null;
} else {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    // Lazy load storage
    try {
      storage = getStorage(app);
    } catch (e) {
      console.warn("Firebase Storage Init Error (Non-fatal):", e);
      storage = {} as any;
    }


    // Analytics - Disabled on localtunnel to prevent ERR_ABORTED errors
    /*
    if (typeof window !== 'undefined') {
      isSupported().then(yes => {
        if (yes) {
          analytics = getAnalytics(app);
        }
      });
    }
    */
    analytics = null;
  } catch (e) {
    console.error("Firebase Init Error:", e);
    // Fallback mocks
    app = { name: 'mock-error-app', options: {} } as any;
    auth = { 
      currentUser: null, 
      signOut: async () => { },
      onAuthStateChanged: (cb: any) => {
        return () => {};
      },
      isMock: true
    } as any;
    db = {} as any;
    storage = {} as any;
  }
}

export { auth, db, storage, analytics };
export default app;
