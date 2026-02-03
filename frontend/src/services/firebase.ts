import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore/lite';
import { getAnalytics, isSupported } from 'firebase/analytics';

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
  .filter(([key, value]) => !value || value.includes('YOUR_'))
  .map(([key]) => key);

if (missingKeys.length > 0) {
  const errorMsg = `❌ Firebase Configuration Error:
The following keys are missing or use placeholders in your .env file:
${missingKeys.join('\n')}

Please update your .env file with actual values from the Firebase Console and restart the server.`;

  console.error(errorMsg);
  if (typeof window !== 'undefined') {
    console.log("%c" + errorMsg, "color: white; background: red; font-size: 16px; font-weight: bold; padding: 10px;");
  }
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use Firestore Lite to prevent ERR_ABORTED streaming issues in sandbox environments
export const db = getFirestore(app);

import { getStorage } from 'firebase/storage';
export const storage = getStorage(app);

// Analytics can sometimes trigger background network requests that might fail
let analyticsInstance = null;
if (typeof window !== 'undefined') {
  isSupported().then(yes => {
    if (yes) {
      analyticsInstance = getAnalytics(app);
    }
  });
}
export const analytics = analyticsInstance;

export default app;
