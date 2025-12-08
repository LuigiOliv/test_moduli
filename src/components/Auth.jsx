// src/components/Auth.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import storage from '../storage.js';
import { ROLES } from '../constants.js';

const { useState } = window.React;

// =========================================================================
// 1. LOGIN PAGE
// =========================================================================

/**
 * Componente per la schermata di Login.
 * Gestisce l'autenticazione tramite Google.
 * @param {function} onLogin - Callback da chiamare al successo del login.
 */
export function LoginPage({ onLogin }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            // storage.handleLogin gestisce l'autenticazione e l'aggiornamento dello stato
            await onLogin(); 
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
                >
                    {loading ? 'Caricamento...' : 'Accedi con Google'}
                </button>
            </div>
            {/* Disclaimer Copyright */}
            <div className="copyright-notice">
                 © 2025 Luigi Oliviero | Tutti i diritti riservati
            </div>
        </div>
    );
}

// =========================================================================
// 2. CLAIM PROFILE MODAL (Configurazione iniziale dopo il primo login)
// =========================================================================

/**
 * Modale per la configurazione iniziale (nome visualizzato e nickname).
 * @param {object} user - L'utente corrente.
 * @param {function} onClaimSuccess - Callback per salvare i dati aggiornati.
 * @param {function} onLogout - Callback per il logout.
 */
export function ClaimProfileModal({ user, onClaimSuccess, onLogout }) {
    const [displayName, setDisplayName] = useState(user.displayName || user.email.split('@')[0]);
    const [nickname, setNickname] = useState(user.nickname || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async () => {
        if (displayName.trim() === '' || nickname.trim() === '') {
            setError("Nome visualizzato e Nickname sono obbligatori.");
            return;
        }
        
        setLoading(true);
        setError(null);
        
        const updatedUser = { 
            ...user, 
            displayName: displayName.trim(), 
            nickname: nickname.trim(),
            claimed: true // Marca come completato il claim
        };
        
        const success = await onClaimSuccess(updatedUser);
        if (!success) {
            setError("Errore nel salvataggio. Riprova.");
        }
        setLoading(false);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content modal-claim">
                <h2>👤 Configurazione Profilo Iniziale</h2>
                <p>Benvenuto/a! Per iniziare, imposta il tuo nome visualizzato e il tuo nickname (il nome con cui sarai chiamato in campo).</p>
                
                {error && <div className="error-message">{error}</div>}
                
                <div className="input-group">
                    <label htmlFor="displayName">Nome Visualizzato (es. 'Mario Rossi')</label>
                    <input
                        id="displayName"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Nome e Cognome o Nome d'Arte"
                    />
                </div>
                
                <div className="input-group">
                    <label htmlFor="nickname">Nickname (es. 'Capitano', 'The Wall')</label>
                    <input
                        id="nickname"
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="Nickname o soprannome in campo"
                    />
                </div>

                <div className="modal-actions">
                    <button 
                        className="button secondary" 
                        onClick={onLogout} 
                        disabled={loading}
                    >
                        Esci
                    </button>
                    <button 
                        className="button primary" 
                        onClick={handleSubmit} 
                        disabled={loading}
                    >
                        {loading ? 'Salvataggio...' : 'Salva e Continua'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// =========================================================================
// 3. ROLE SELECTION MODAL (Scelta del ruolo dopo il claim)
// =========================================================================

/**
 * Modale per la selezione del ruolo preferito.
 * @param {object} user - L'utente corrente.
 * @param {function} onRoleSelect - Callback per salvare i dati aggiornati.
 * @param {Array<string>} roles - Lista dei ruoli disponibili.
 */
export function RoleSelectionModal({ user, onRoleSelect, roles = ROLES }) {
    const [selectedRole, setSelectedRole] = useState(user.role || 'Universale');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        
        const isGoalkeeper = selectedRole === 'Portiere';

        const updatedUser = { 
            ...user, 
            role: selectedRole,
            preferredRole: selectedRole, // Campo che indica che la scelta è stata fatta
            isGoalkeeper: isGoalkeeper // Utile per il calcolo delle statistiche
        };
        
        const success = await onRoleSelect(updatedUser);
        if (!success) {
            setError("Errore nel salvataggio del ruolo. Riprova.");
        }
        setLoading(false);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content modal-role-select">
                <h2>🎯 Scegli il tuo Ruolo Principale</h2>
                <p>Seleziona il ruolo che ricopri più spesso in campo. Questo aiuterà il sistema a calcolare le tue statistiche in modo più accurato.</p>
                
                {error && <div className="error-message">{error}</div>}
                
                <div className="role-selection-grid">
                    {roles.map(role => (
                        <button
                            key={role}
                            className={`button role-button ${selectedRole === role ? 'active' : ''}`}
                            onClick={() => setSelectedRole(role)}
                            disabled={loading}
                        >
                            {role}
                        </button>
                    ))}
                </div>

                <div className="modal-actions">
                    <button 
                        className="button primary" 
                        onClick={handleSubmit} 
                        disabled={loading}
                    >
                        {loading ? 'Salvataggio...' : 'Conferma Ruolo'}
                    </button>
                </div>
            </div>
        </div>
    );
}