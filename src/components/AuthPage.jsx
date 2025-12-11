import { useState } from 'react';
import storage from '../storage.js';

export function LoginPage({ onLogin }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const user = await storage.handleLogin();
            onLogin(user);
        } catch (e) {
            setError("Accesso fallito. Assicurati di usare un account autorizzato.");
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1>⚽ Calcetto Rating v3</h1>
                <p>Accedi con il tuo account Google per visualizzare le classifiche, iscriverti alle partite e votare le performance.</p>
                
                {error && <div className="error-message">{error}</div>}

                <button 
                    className="button primary" 
                    onClick={handleGoogleLogin} 
                    disabled={loading}
                    style={{ padding: '12px 24px', fontSize: '16px', cursor: 'pointer' }}
                >
                    {loading ? 'Caricamento...' : 'Accedi con Google'}
                </button>
            </div>
            <div className="copyright-notice">
                © 2025 Luigi Oliviero | Tutti i diritti riservati
            </div>
        </div>
    );
}
