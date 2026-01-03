// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyC_81ukybf3QOFFvJcgDWMgbor4Z7k1bgI",
  authDomain: "calcetto-af1e0.firebaseapp.com",
  projectId: "calcetto-af1e0",
  storageBucket: "calcetto-af1e0.firebasestorage.app",
  messagingSenderId: "1035881443344",
  appId: "1:1035881443344:web:2690813dc00bce70d19a95"
};

// Initialize Firebase immediately
initializeApp(firebaseConfig);

// Export initialized instances
export const db = getFirestore();
export const auth = getAuth();

// 🔧 FIX: Setta persistenza LOCAL globalmente per mobile
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('✅ Firebase Auth persistence settata su LOCAL');
  })
  .catch((error) => {
    console.error('❌ Errore settaggio persistence:', error);
  });

import { GoogleAuthProvider } from 'firebase/auth';

export const googleProvider = new GoogleAuthProvider();
// 🔧 Forza il redirect sul tuo dominio custom
googleProvider.setCustomParameters({
  redirect_uri: 'https://app.nslab.it/calcetto'
});