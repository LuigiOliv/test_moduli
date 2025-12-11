import React from 'react';
import ReactDOM from 'react-dom/client';
import { initializeApp } from 'firebase/app';

// Initialize Firebase FIRST, before importing anything that uses it
const firebaseConfig = {
  apiKey: "AIzaSyC_81ukybf3QOFFvJcgDWMgbor4Z7k1bgI",
  authDomain: "calcetto-af1e0.firebaseapp.com",
  projectId: "calcetto-af1e0",
  storageBucket: "calcetto-af1e0.firebasestorage.app",
  messagingSenderId: "1035881443344",
  appId: "1:1035881443344:web:2690813dc00bce70d19a95"
};

initializeApp(firebaseConfig);

// NOW import components that use Firebase
import App from './components/App.jsx';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
