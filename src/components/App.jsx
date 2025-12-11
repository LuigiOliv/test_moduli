import { useState, useEffect } from 'react';
import { LoginPage } from './AuthPage.jsx';
import storage from '../storage.js';

export default function App() {
    const [currentUser, setCurrentUser] = useState(storage.getCurrentUser());
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleLogin = (user) => {
        setCurrentUser(user);
    };

    const handleLogout = async () => {
        await storage.handleLogout();
        setCurrentUser(null);
    };

    if (!currentUser) {
        return <LoginPage onLogin={handleLogin} />;
    }

    return (
        <div className="app-container">
            <header className="app-header">
                <div className="header-title">⚽ Calcetto Rating v3</div>
                <div className="header-actions">
                    <span className="user-nickname">{currentUser.displayName || currentUser.email}</span>
                    <button 
                        className="button secondary" 
                        onClick={handleLogout}
                        style={{ padding: '8px 16px', fontSize: '14px', cursor: 'pointer' }}
                    >
                        Logout
                    </button>
                </div>
            </header>
            <main className="app-main-content">
                <h2>✅ Logged In (Vite + React + Auth)</h2>
                <p>Utente: <strong>{currentUser.email}</strong></p>
                <p>Current time: {now.toLocaleTimeString()}</p>
                <p style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
                    Auth system is working! Full features coming soon.
                </p>
            </main>
        </div>
    );
}
