import React from 'react'
import ReactDOM from 'react-dom/client'

// Import MODULAR CSS instead of monolithic styles.css
import './styles/index.css'

// Initialize Firebase FIRST (import and use to prevent tree-shaking)
import { db, auth } from './firebase.js';
console.log('Firebase initialized:', !!db, !!auth);

// Now import components
import App from './components/App.jsx';


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

console.log('🧪 TEST MODE: Using modular CSS from styles/index.css')