// src/components/AdminAndSettings.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import { useState, useEffect } from 'react';
import storage from '../storage.js';
import utils from '../utils.js';
import { ROLES, SKILLS, getSkillsForPlayer } from '../constants.js';
import { db } from '../firebase.js';

// =========================================================================
// 1. SETTINGS PAGE (Impostazioni Utente)
// =========================================================================

export function SettingsPage({ user, onUpdateUser }) {
    const [nickname, setNickname] = useState(user.nickname || '');
    const [role, setRole] = useState(user.role || ROLES.Universale);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

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
            await onUpdateUser(updatedUser);
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

export function AdminPage({ users, setUsers, votes, setVotes }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);

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
            const updatedUsers = await storage.getUsers();
            setUsers(updatedUsers);
            setMessage({ type: 'success', text: `Ruolo di ${targetUser.nickname || targetUser.displayName} aggiornato.` });
        } catch (err) {
            setError("Errore nell'aggiornamento del ruolo: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRecalculateRatings = async () => {
        if (!window.confirm("Sei sicuro? Questo ricalcolerà tutti i Rating in base ai voti esistenti.")) return;

        setLoading(true);
        setError(null);
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
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
                        {users.sort((a, b) => (b.isAdmin || false) - (a.isAdmin || false)).map(u => (
                            <tr key={u.id}>
                                <td>{u.nickname || u.displayName || u.name}</td>
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

// =========================================================================
// 3. DEBUG PAGE (Analisi Voti)
// =========================================================================

export function DebugPage({ users, votes }) {
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [editingVote, setEditingVote] = useState(null);
    const [editVoteValues, setEditVoteValues] = useState({});

    const getVoteStats = (playerId) => {
        const playerVotes = votes.filter(v => v.playerId === playerId);
        const seedVotes = playerVotes.filter(v => v.voterId && v.voterId.startsWith('seed'));
        const realVotes = playerVotes.filter(v => v.voterId && !v.voterId.startsWith('seed'));
        return { total: playerVotes.length, seed: seedVotes.length, real: realVotes.length, allVotes: playerVotes };
    };

    const handleEditVote = (vote) => {
        setEditingVote(vote);
        setEditVoteValues(vote.ratings);
    };

    const handleSaveEditedVote = async () => {
        if (!editingVote.id) {
            alert('Impossibile modificare voti senza ID');
            return;
        }
        try {
            await db.collection('votes').doc(editingVote.id).update({ ratings: editVoteValues });
            alert('Voto aggiornato! Ricarica la pagina per vedere le modifiche.');
            setEditingVote(null);
        } catch (err) {
            alert('Errore durante il salvataggio: ' + err.message);
        }
    };

    const handleDeleteVote = async (voteId) => {
        if (!voteId) {
            alert('Impossibile eliminare voti senza ID');
            return;
        }
        if (!confirm('Eliminare questo voto?')) return;
        try {
            await db.collection('votes').doc(voteId).delete();
            alert('Voto eliminato! Ricarica la pagina.');
        } catch (err) {
            alert('Errore durante l\'eliminazione: ' + err.message);
        }
    };

    const players = users.filter(u => !u.id.startsWith('seed'));

    if (selectedPlayer) {
        const player = players.find(p => p.id === selectedPlayer);
        if (!player) {
            return (
                <div className="section-container">
                    <div className="section-header">
                        <h2>🐛 Debug - Giocatore non trovato</h2>
                        <button onClick={() => setSelectedPlayer(null)} className="btn-back">← Indietro</button>
                    </div>
                    <p>Giocatore con ID {selectedPlayer} non trovato</p>
                </div>
            );
        }
        const stats = getVoteStats(player.id);
        const averages = utils.calculateAverages(player.id, votes, player);
        const overall = utils.calculateOverall(averages);

        return (
            <div className="section-container">
                <div className="section-header">
                    <h2>📊 Dettaglio: {player.name}</h2>
                    <button onClick={() => setSelectedPlayer(null)} className="btn-back">← Indietro</button>
                </div>

                <div className="debug-stats">
                    <div className="debug-stat-box"><div className="stat-value seed">{stats.seed}</div><div className="stat-label">Voti Seed</div></div>
                    <div className="debug-stat-box"><div className="stat-value real">{stats.real}</div><div className="stat-label">Voti Reali</div></div>
                    <div className="debug-stat-box"><div className="stat-value total">{stats.total}</div><div className="stat-label">Totale</div></div>
                    <div className="debug-stat-box"><div className="stat-value overall">{overall ? utils.toBase10(overall).toFixed(2) : '-'}</div><div className="stat-label">Overall</div></div>
                </div>

                <h3>🗳️ Tutti i Voti</h3>
                <div className="debug-table-wrapper">
                    <table className="debug-table">
                        <thead>
                            <tr>
                                <th>Votante</th>
                                <th>Tipo</th>
                                {(() => {
                                    const playerSkills = getSkillsForPlayer(player);
                                    return [...playerSkills.tecniche, ...playerSkills.tattiche, ...playerSkills.fisiche].map(skill => (<th key={skill}>{skill.substring(0, 6)}</th>));
                                })()}
                                <th>Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.allVotes.map((vote, index) => {
                                const isSeed = vote.voterId.startsWith('seed');
                                const voterName = isSeed ? '🤖 Seed' : (users.find(u => u.id === vote.voterId)?.name || 'Sconosciuto');
                                return (
                                    <tr key={index} className={index % 2 === 0 ? 'even' : 'odd'}>
                                        <td>{voterName}</td>
                                        <td><span className={`vote-type ${isSeed ? 'seed' : 'real'}`}>{isSeed ? 'Seed' : 'Reale'}</span></td>
                                        {(() => {
                                            const playerSkills = getSkillsForPlayer(player);
                                            return [...playerSkills.tecniche, ...playerSkills.tattiche, ...playerSkills.fisiche].map(skill => (<td key={skill}>{vote.ratings[skill] || '-'}</td>));
                                        })()}
                                        <td>
                                            <button onClick={() => handleEditVote(vote)} className="admin-btn" style={{ marginRight: '5px' }}>✏️</button>
                                            <button onClick={() => handleDeleteVote(vote.id)} className="admin-btn btn-delete">🗑️</button>
                                        </td>
                                    </tr>
                                );
                            })}
                            <tr className="average-row">
                                <td>📊 MEDIA</td>
                                <td></td>
                                {(() => {
                                    const playerSkills = getSkillsForPlayer(player);
                                    return [...playerSkills.tecniche, ...playerSkills.tattiche, ...playerSkills.fisiche].map(skill => {
                                        const skillVotes = stats.allVotes.map(v => v.ratings[skill]).filter(v => v !== undefined);
                                        const avg = skillVotes.length > 0 ? skillVotes.reduce((a, b) => a + b, 0) / skillVotes.length : 0;
                                        return (<td key={skill}>{avg > 0 ? `${avg.toFixed(2)}` : '-'}</td>);
                                    });
                                })()}
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {editingVote && (
                    <div className="modal-overlay">
                        <div className="modal-content modal-large">
                            <h2>✏️ Modifica Voto</h2>
                            <p>Votante: {editingVote.voterId.startsWith('seed') ? '🤖 Seed' : (users.find(u => u.id === editingVote.voterId)?.name || 'Sconosciuto')}</p>
                            {['tecniche', 'tattiche', 'fisiche'].map(category => (
                                <div key={category} className="vote-edit-category">
                                    <h4 className={`category-${category}`}>{category}</h4>
                                    <div className="vote-edit-grid">
                                        {SKILLS[category].map(skill => (
                                            <div key={skill} className="vote-edit-item">
                                                <label>{skill}</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="4"
                                                    step="0.01"
                                                    value={editVoteValues[skill] || ''}
                                                    onChange={(e) => setEditVoteValues({ ...editVoteValues, [skill]: parseFloat(e.target.value) || 0 })}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <div className="modal-actions">
                                <button className="btn btn-secondary" onClick={() => setEditingVote(null)}>Annulla</button>
                                <button className="btn btn-primary" onClick={handleSaveEditedVote}>Salva</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="section-container">
            <div className="section-header">
                <h2>🐛 Debug - Riepilogo Voti</h2>
            </div>

            <div className="debug-global-stats">
                <div className="debug-stat-box"><div className="stat-value seed">{votes.filter(v => v.voterId && v.voterId.startsWith('seed')).length}</div><div className="stat-label">Voti Seed Totali</div></div>
                <div className="debug-stat-box"><div className="stat-value real">{votes.filter(v => v.voterId && !v.voterId.startsWith('seed')).length}</div><div className="stat-label">Voti Reali Totali</div></div>
                <div className="debug-stat-box"><div className="stat-value total">{votes.length}</div><div className="stat-label">Voti Totali</div></div>
            </div>

            <div className="settings-group">
                <h3>👥 Dettaglio per Giocatore</h3>
                <div className="debug-player-list">
                    {players.map(player => {
                        const stats = getVoteStats(player.id);
                        const averages = utils.calculateAverages(player.id, votes, player);
                        const overall = utils.calculateOverall(averages);
                        return (
                            <div key={player.id} className="debug-player-item" onClick={() => setSelectedPlayer(player.id)}>
                                <span style={{ fontWeight: '600', minWidth: '150px' }}>{player.name}</span>
                                <span className="debug-badge seed">Seed: {stats.seed}</span>
                                <span className="debug-badge real">Reali: {stats.real}</span>
                                <span className="debug-badge total">Tot: {stats.total}</span>
                                <span style={{ color: '#667eea', fontSize: '14px' }}>OVR: {overall ? utils.toBase10(overall).toFixed(2) : '-'}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}