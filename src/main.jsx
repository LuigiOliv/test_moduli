import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App.jsx';
import './styles.css';

// Firebase initialization
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyC_81ukybf3QOFFvJcgDWMgbor4Z7k1bgI",
  authDomain: "calcetto-af1e0.firebaseapp.com",
  projectId: "calcetto-af1e0",
  storageBucket: "calcetto-af1e0.firebasestorage.app",
  messagingSenderId: "1035881443344",
  appId: "1:1035881443344:web:2690813dc00bce70d19a95"
};

initializeApp(firebaseConfig);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
