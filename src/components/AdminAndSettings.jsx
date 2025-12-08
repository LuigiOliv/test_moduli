// src/components/AdminAndSettings.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import storage from '../storage.js';
import utils from '../utils.js';
import { ROLES } from '../constants.js';

const { useState, useEffect } = window.React;

// =========================================================================
// 1. SETTINGS PAGE (Impostazioni Utente)
// =========================================================================

/**
 * Componente per la modifica delle impostazioni personali.
 * @param {object} user - L'utente corrente.
 * @param {function} onUpdateUser - Callback per aggiornare l'utente (in App.jsx).
 */
export function SettingsPage({ user, onUpdateUser }) {
    const [nickname, setNickname] = useState(user.nickname || '');
    const [role, setRole] = useState(user.role || ROLES.Universale);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    // Resetta i campi se l'oggetto utente cambia (es. dopo il login)
    useEffect(() => {
        setNickname(user.nickname || '');
        setRole(user.role || ROLES.Universale);
        setMessage(null);
    }, [user]);

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        
        const updatedUser = {
            ...user,
            nickname: nickname.trim(),
            role: role
        };

        try {
            await onUpdateUser(updatedUser); // Chiama il callback per aggiornare Firestore e lo stato
            setMessage({ type: 'success', text: 'Impostazioni salvate con successo!' });
        } catch (error) {
            console.error("Errore salvataggio impostazioni:", error);
            setMessage({ type: 'error', text: 'Errore nel salvataggio. Riprova.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="settings-page">
            <h2>⚙️ Impostazioni Utente</h2>
            <div className="info-card">
                <p>Modifica qui il tuo nickname e il ruolo predefinito in campo.</p>
                <p>Email: <strong>{user.email}</strong></p>
            </div>

            <form className="settings-form" onSubmit={handleSave}>
                <label>
                    Nickname:
                    <input 
                        type="text" 
                        value={nickname} 
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder={user.displayName}
                        maxLength="20"
                    />
                    <small>Il tuo nickname sarà usato nelle classifiche e nelle liste partecipanti.</small>
                </label>
                
                <label>
                    Ruolo Predefinito:
                    <select value={role} onChange={(e) => setRole(e.target.value)}>
                        {Object.keys(ROLES).map(key => (
                            <option key={key} value={ROLES[key]}>{ROLES[key]}</option>
                        ))}
                    </select>
                    <small>Influenza il set di skill mostrato nell'interfaccia di voto.</small>
                </label>

                {message && (
                    <div className={`form-message ${message.type}`}>
                        {message.text}
                    </div>
                )}

                <button type="submit" className="button primary" disabled={loading}>
                    {loading ? 'Salvataggio...' : 'Salva Modifiche'}
                </button>
            </form>
        </div>
    );
}

// =========================================================================
// 2. ADMIN PAGE (Strumenti Amministrativi)
// =========================================================================

/**
 * Componente per gli strumenti di amministrazione.
 * @param {Array<object>} users - Lista di tutti gli utenti.
 * @param {function} onRefreshData - Callback per ricaricare tutti i dati.
 */
export function AdminPage({ users, onRefreshData }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);

    // --- Gestione Ruolo Admin ---
    const handleToggleAdmin = async (targetUser) => {
        if (targetUser.id === storage.getCurrentUser().id) {
            alert("Non puoi modificare il tuo stato di Admin.");
            return;
        }
        
        const newIsAdmin = !targetUser.isAdmin;
        if (!window.confirm(`Sei sicuro di voler ${newIsAdmin ? 'promuovere' : 'degradare'} ${targetUser.nickname || targetUser.displayName} a Admin?`)) {
            return;
        }

        setLoading(true);
        setError(null);
        setMessage(null);
        try {
            await storage.updateUser({ ...targetUser, isAdmin: newIsAdmin });
            await onRefreshData(); // Ricarica la lista utenti
            setMessage({ type: 'success', text: `Ruolo di ${targetUser.nickname || targetUser.displayName} aggiornato.` });
        } catch (err) {
            setError("Errore nell'aggiornamento del ruolo: " + err.message);
        } finally {
            setLoading(false);
        }
    };
    
    // --- Strumenti di Manutenzione (Esempio) ---
    const handleRecalculateRatings = async () => {
        if (!window.confirm("Sei sicuro? Questo ricalcolerà tutti i Rating in base ai voti esistenti.")) return;

        setLoading(true);
        setError(null);
        try {
            // Qui andrebbe la logica per salvare il nuovo rating nel profilo utente
            // Simuliamo il ricalcolo e l'aggiornamento
            // NOTA: Nel nostro STATS_ENGINE attuale, il rating non viene salvato nel DB ma calcolato on-the-fly.
            // Se fosse necessario salvare, la logica andrebbe qui.
            
            // Simula un'operazione di aggiornamento del database di massa
            await utils.delay(500); 
            
            setMessage({ type: 'success', text: 'Ricalcolo dei Rating avviato (Logica di salvataggio DB non implementata in questo esempio).' });
        } catch (err) {
            setError("Errore nel ricalcolo: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-page">
            <h2>🛡️ Pannello di Amministrazione</h2>
            
            {message && <div className={`form-message ${message.type}`}>{message.text}</div>}
            {error && <div className="error-message">{error}</div>}

            {/* 1. Gestione Utenti */}
            <h3 className="section-title">Gestione Utenti e Ruoli</h3>
            <div className="user-management-table">
                <table>
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Email</th>
                            <th>Ruolo</th>
                            <th>Admin</th>
                            <th>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.sort((a,b) => (b.isAdmin || false) - (a.isAdmin || false)).map(u => (
                            <tr key={u.id}>
                                <td>{u.nickname || u.displayName}</td>
                                <td>{u.email}</td>
                                <td>{u.role || 'N/D'}</td>
                                <td>
                                    <span className={`admin-status ${u.isAdmin ? 'is-admin' : 'is-user'}`}>
                                        {u.isAdmin ? 'SI' : 'NO'}
                                    </span>
                                </td>
                                <td>
                                    <button 
                                        className={`button tiny-button ${u.isAdmin ? 'secondary' : 'primary'}`}
                                        onClick={() => handleToggleAdmin(u)}
                                        disabled={loading || u.id === storage.getCurrentUser().id}
                                    >
                                        {u.isAdmin ? 'Degrada' : 'Promuovi Admin'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 2. Strumenti di Manutenzione */}
            <h3 className="section-title">Manutenzione Dati</h3>
            <div className="maintenance-tools">
                 <button 
                    className="button red" 
                    onClick={handleRecalculateRatings}
                    disabled={loading}
                >
                    🔄 Ricalcola Tutti i Rating
                </button>
                <p className="admin-tip">Usare con cautela. Forza il ricalcolo globale di tutte le statistiche.</p>
            </div>
            
        </div>
    );
}