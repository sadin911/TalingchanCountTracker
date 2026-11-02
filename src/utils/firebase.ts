import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  browserLocalPersistence,
  setPersistence,
  browserPopupRedirectResolver,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported as isAnalyticsSupported, type Analytics } from 'firebase/analytics';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyATVs9QUdbLh0OgFfOpWMsyMDjOdsB4R6k',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'botcounttracker.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'botcounttracker',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'botcounttracker.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '721461955099',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:721461955099:web:d1b84ddb130e61e93d46be',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-XR3PTEV5C1',
};

// Initialize Firebase (Singleton pattern to prevent duplicate init during hot reload)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Analytics safely in browser environments that support it
export let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  isAnalyticsSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {
      // Ignore analytics errors in headless/test environments
    });
}

// Always show account selector when signing in with Google
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Configure local persistence
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Firebase setPersistence warning:', err);
  });
}

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
    return result.user;
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err?.code !== 'auth/popup-closed-by-user') {
      console.error('Google Sign-In Error:', error);
    }
    throw error;
  }
}

export async function logOut() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign-Out Error:', error);
    throw error;
  }
}

