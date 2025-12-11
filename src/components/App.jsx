import { useState, useEffect } from 'react';

export default function App() {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="app-container">
            <header className="app-header">
                <div className="header-title">⚽ Calcetto Rating v3</div>
            </header>
            <main className="app-main-content">
                <h2>✅ App Loaded (Vite + React)</h2>
                <p>Current time: {now.toLocaleTimeString()}</p>
                <p style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
                    Full app features coming soon. This is the Vite build setup.
                </p>
            </main>
        </div>
    );
}
