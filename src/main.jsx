import React from 'react';
import ReactDOM from 'react-dom/client';

// Initialize Firebase FIRST
import './firebase.js';

// Now import components
import App from './components/App.jsx';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
