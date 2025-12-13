// src/components/App.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import { useState, useEffect } from 'react';
import firebase from '../firebase.js';
import storage from '../storage.js';
import { ADMIN_EMAIL } from '../constants.js';
import Header from './Navigation/Header.jsx';
import LoginPage from './AuthPage.jsx';
import { ClaimProfileModal, RoleSelectionModal, RoleEditModal, ProfileSelectorModal } from './Modals.jsx';
import MatchesPage from './MatchesPage.jsx';
import MatchDetailRouter from './MatchDetailRouter.jsx';
import PlayersListPage from './PlayersListPage.jsx';
import PlayerProfile from './PlayerProfile.jsx';
import ClassifichePage from './ClassifichePage.jsx';
import { AdminPage, DebugPage, SettingsPage } from './AdminAndSettings.jsx';
import RatingForm from './RatingForm.jsx';

function App() {
    const getPendingEmail = () => sessionStorage.getItem('pendingEmail');
    const setPendingEmailStorage = (email) => {
        if (email) {
            sessionStorage.setItem('pendingEmail', email);
        } else {
            sessionStorage.removeItem('pendingEmail');
        }
    };

    const [currentUser, setCurrentUser] = useState(storage.getCurrentUser());
    const [activeTab, setActiveTab] = useState('partite');
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [viewingProfile, setViewingProfile] = useState(null);
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [users, setUsers] = useState([]);
    const [votes, setVotes] = useState([]);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showClaimModal, setShowClaimModal] = useState(false);
    const [pendingEmail, setPendingEmail] = useState(getPendingEmail());
    const [loading, setLoading] = useState(true);
    const [showAntonioSelector, setShowAntonioSelector] = useState(false);
    const [antonioProfiles, setAntonioProfiles] = useState([]);

    useEffect(() => {
        const unsubscribe = firebase.auth().onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser && firebaseUser.email) {
                setLoading(true);
                try {
                    let loadedUsers = await storage.getUsers();
                    if (loadedUsers.length === 0) { loadedUsers = []; }

                    const email = firebaseUser.email;
                    const existingUser = loadedUsers.find(u => u.email === email);

                    if (existingUser) {
                        const userWithAdmin = { ...existingUser, isAdmin: email === ADMIN_EMAIL };
                        setCurrentUser(userWithAdmin);
                        storage.setCurrentUser(userWithAdmin);

                        const loadedVotes = await storage.getVotes();
                        setUsers(loadedUsers);
                        setVotes(loadedVotes);

                        if (!existingUser.preferredRole) setShowRoleModal(true);
                    } else {
                        setPendingEmail(email);
                        setShowClaimModal(true);
                    }
                } catch (error) {
                    console.error('Errore caricamento dati DOPO login:', error);
                    firebase.auth().signOut();
                } finally {
                    setLoading(false);
                }
            } else {
                setCurrentUser(null);
                storage.setCurrentUser(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const handleLogin = (email) => {
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            const antonioProfiles = users.filter(u => u.email === email);
            if (antonioProfiles.length > 1) {
                setAntonioProfiles(antonioProfiles);
                setShowAntonioSelector(true);
                return;
            }

            const userWithAdmin = { ...existingUser, isAdmin: email === ADMIN_EMAIL };
            setCurrentUser(userWithAdmin);
            storage.setCurrentUser(userWithAdmin);
            if (!existingUser.preferredRole) setShowRoleModal(true);
        } else {
            setPendingEmail(email);
            setPendingEmailStorage(email);
            setShowClaimModal(true);
        }
    };

    const handleClaimProfile = async (playerId) => {
        const isAdmin = pendingEmail === ADMIN_EMAIL;
        const user = users.find(u => u.id === playerId);
        const isAntonio = user.name === 'Antonio T';

        if (isAntonio) {
            const movementProfile = {
                ...user,
                email: pendingEmail,
                claimed: true,
                isAdmin,
                isGoalkeeper: false,
                name: 'Antonio T - Movimento'
            };

            const goalkeeperProfile = {
                id: `${user.id}_gk`,
                name: 'Antonio T - Portiere',
                email: pendingEmail,
                avatar: user.avatar || null,
                preferredRole: 'Portiere',
                otherRoles: [],
                claimed: true,
                isAdmin,
                isGoalkeeper: true,
                isInitialPlayer: false,
                hasVotedOffline: true
            };

            await storage.updateUser(movementProfile);
            await storage.updateUser(goalkeeperProfile);

            const updatedUsers = users.map(u => u.id === playerId ? movementProfile : u).concat([goalkeeperProfile]);
            setUsers(updatedUsers);

            setAntonioProfiles([movementProfile, goalkeeperProfile]);
            setShowAntonioSelector(true);
            setShowClaimModal(false);
            setPendingEmail(null);
            setPendingEmailStorage(null);
        } else {
            const isGoalkeeper = user.preferredRole === 'Portiere';
            const claimedUser = { ...user, email: pendingEmail, claimed: true, isAdmin, isGoalkeeper };
            await storage.updateUser(claimedUser);
            const updatedUsers = users.map(u => u.id === playerId ? claimedUser : u);
            setUsers(updatedUsers);
            setCurrentUser(claimedUser);
            storage.setCurrentUser(claimedUser);
            setShowClaimModal(false);
            setPendingEmail(null);
            setPendingEmailStorage(null);
            if (!claimedUser.preferredRole) setShowRoleModal(true);
        }
    };

    const handleNewPlayer = async (playerName) => {
        const isAdmin = pendingEmail === ADMIN_EMAIL;
        const newUser = {
            id: `player${users.length + 1}`,
            name: playerName || pendingEmail.split('@')[0],
            email: pendingEmail,
            avatar: null,
            preferredRole: null,
            otherRoles: [],
            claimed: true,
            isAdmin: isAdmin,
            isInitialPlayer: false,
            hasVotedOffline: false,
            isGoalkeeper: false
        };
        await storage.updateUser(newUser);
        setUsers([...users, newUser]);
        setCurrentUser(newUser);
        storage.setCurrentUser(newUser);
        setShowClaimModal(false);
        setPendingEmail(null);
        setPendingEmailStorage(null);
        setShowRoleModal(true);
    };

    const handleLogout = () => {
        firebase.auth().signOut();
        setCurrentUser(null);
        storage.setCurrentUser(null);
    };

    const handleVoteSubmit = async (playerId, ratings) => {
        const newVote = {
            voterId: currentUser.id,
            voterName: currentUser.name,
            voterEmail: currentUser.email,
            playerId,
            ratings,
            timestamp: Date.now(),
            date: new Date().toISOString()
        };
        await storage.addVote(newVote);
        setVotes([...votes, newVote]);
        setSelectedPlayer(null);
    };

    const handleRolesSave = async (preferredRole, otherRoles) => {
        const isGoalkeeper = preferredRole === 'Portiere';
        const updatedCurrentUser = { ...currentUser, preferredRole, otherRoles, isGoalkeeper };
        await storage.updateUser(updatedCurrentUser);
        const updatedUsers = users.map(u => u.id === currentUser.id ? updatedCurrentUser : u);
        setUsers(updatedUsers);
        setCurrentUser(updatedCurrentUser);
        storage.setCurrentUser(updatedCurrentUser);
        setShowRoleModal(false);
    };

    const handleAntonioProfileSelect = (profile) => {
        setCurrentUser(profile);
        storage.setCurrentUser(profile);
        setShowAntonioSelector(false);
        setAntonioProfiles([]);
    };

    if (loading) {
        return (
            <div className="login-container">
                <div className="login-card">
                    <h1>⚽ Calcetto Rating</h1>
                    <p>Caricamento in corso...</p>
                </div>
            </div>
        );
    }

    if (!currentUser) {
        return (
            <>
                {showClaimModal && (
                    <ClaimProfileModal
                        users={users}
                        onClaim={handleClaimProfile}
                        onNewPlayer={handleNewPlayer}
                    />
                )}
                <LoginPage onLogin={handleLogin} />
            </>
        );
    }

    if (currentUser && currentUser.preferredRole) {
        const isGoalkeeper = currentUser.preferredRole === 'Portiere';
        const hasIncompleteProfile = !isGoalkeeper &&
            (!currentUser.otherRoles || currentUser.otherRoles.length < 2);

        if (hasIncompleteProfile) {
            return (
                <div className="app-container">
                    <Header
                        user={currentUser}
                        onLogout={handleLogout}
                        onOpenSettings={() => { }}
                        setActiveTab={setActiveTab}
                    />
                    <div className="modal-overlay" style={{ position: 'fixed' }}>
                        <div className="modal-content">
                            <h2>⚠️ Profilo Incompleto</h2>
                            <p style={{ marginBottom: '20px' }}>
                                Il tuo profilo necessita di un aggiornamento per continuare.
                            </p>
                            <div style={{
                                background: 'rgba(210, 248, 0, 0.1)',
                                border: '1px solid rgba(210, 248, 0, 0.3)',
                                borderRadius: '8px',
                                padding: '15px',
                                marginBottom: '20px'
                            }}>
                                <p style={{ color: 'var(--volt)', fontWeight: 'bold', marginBottom: '10px' }}>
                                    📋 Cosa manca:
                                </p>
                                <ul style={{
                                    listStyle: 'none',
                                    padding: 0,
                                    color: 'var(--text-muted)'
                                }}>
                                    <li style={{ marginBottom: '8px' }}>
                                        ✅ Ruolo preferito: <strong style={{ color: 'white' }}>{currentUser.preferredRole}</strong>
                                    </li>
                                    <li style={{ marginBottom: '8px' }}>
                                        {currentUser.otherRoles && currentUser.otherRoles.length > 0 ? '⚠️' : '❌'} Altri ruoli:
                                        <strong style={{ color: currentUser.otherRoles && currentUser.otherRoles.length > 0 ? '#f59e0b' : 'var(--hot-red)' }}>
                                            {' '}{currentUser.otherRoles ? currentUser.otherRoles.length : 0}/2
                                        </strong>
                                    </li>
                                </ul>
                            </div>
                            <p style={{ fontSize: '14px', opacity: '0.8', marginBottom: '20px' }}>
                                Per continuare, devi selezionare almeno <strong>2 ruoli alternativi</strong> oltre al tuo ruolo preferito.
                            </p>
                            <button
                                className="btn btn-primary full-width"
                                onClick={() => setShowRoleModal(true)}
                            >
                                📝 Completa il Profilo
                            </button>
                        </div>
                    </div>
                    {showRoleModal && (
                        <RoleEditModal
                            user={currentUser}
                            onClose={() => { }}
                            onSuccess={async () => {
                                const updatedUser = await storage.getUsers().then(users => users.find(u => u.id === currentUser.id));
                                setCurrentUser(updatedUser);
                                storage.setCurrentUser(updatedUser);
                                setShowRoleModal(false);
                                window.location.reload();
                            }}
                        />
                    )}
                </div>
            );
        }
    }

    return (
        <div className="app-container">
            {showRoleModal && <RoleSelectionModal onSave={handleRolesSave} />}
            {showAntonioSelector && (
                <ProfileSelectorModal
                    profiles={antonioProfiles}
                    onSelect={handleAntonioProfileSelect}
                />
            )}

            <Header
                user={currentUser}
                onLogout={handleLogout}
                onOpenSettings={() => setActiveTab('impostazioni')}
                setActiveTab={setActiveTab}
            />

            <div className="nav-tabs">
                <button
                    className={`nav-tab ${activeTab === 'partite' ? 'active' : ''}`}
                    onClick={() => {
                        setActiveTab('partite');
                        setSelectedPlayer(null);
                        setViewingProfile(null);
                        setSelectedMatch(null);
                    }}
                >
                    🏆 Partite
                </button>
                <button
                    className={`nav-tab ${activeTab === 'valuta' ? 'active' : ''}`}
                    onClick={() => {
                        setActiveTab('valuta');
                        setSelectedPlayer(null);
                        setViewingProfile(null);
                    }}
                >
                    ⚽ Valuta
                </button>
                <button
                    className={`nav-tab ${activeTab === 'profilo' ? 'active' : ''}`}
                    onClick={() => {
                        setActiveTab('profilo');
                        setSelectedPlayer(null);
                        setViewingProfile(null);
                    }}
                >
                    👤 Profilo
                </button>
                <button
                    className={`nav-tab ${activeTab === 'classifiche' ? 'active' : ''}`}
                    onClick={() => {
                        setActiveTab('classifiche');
                        setSelectedPlayer(null);
                        setViewingProfile(null);
                    }}
                >
                    📊 Classifiche
                </button>
            </div>

            <div className="content">
                {viewingProfile ? (
                    <PlayerProfile
                        player={users.find(u => u.id === viewingProfile)}
                        votes={votes}
                        isOwnProfile={viewingProfile === currentUser.id}
                    />
                ) : selectedPlayer ? (
                    <RatingForm
                        player={users.find(u => u.id === selectedPlayer)}
                        onSubmit={handleVoteSubmit}
                        onCancel={() => setSelectedPlayer(null)}
                    />
                ) : activeTab === 'partite' ? (
                    selectedMatch ? (
                        <MatchDetailRouter
                            matchId={selectedMatch}
                            currentUser={currentUser}
                            onBack={() => setSelectedMatch(null)}
                        />
                    ) : (
                        <MatchesPage
                            currentUser={currentUser}
                            users={users}
                            onSelectMatch={setSelectedMatch}
                        />
                    )
                ) : activeTab === 'valuta' ? (
                    <PlayersListPage
                        users={users}
                        currentUser={currentUser}
                        votes={votes}
                        onSelectPlayer={setSelectedPlayer}
                    />
                ) : activeTab === 'profilo' ? (
                    <PlayerProfile
                        player={currentUser}
                        votes={votes}
                        isOwnProfile={true}
                    />
                ) : activeTab === 'classifiche' ? (
                    <ClassifichePage
                        users={users}
                        votes={votes}
                        currentUser={currentUser}
                        onViewProfile={setViewingProfile}
                    />
                ) : activeTab === 'admin' && currentUser.isAdmin ? (
                    <AdminPage
                        users={users}
                        setUsers={setUsers}
                        votes={votes}
                        setVotes={setVotes}
                    />
                ) : activeTab === 'debug' && currentUser.isAdmin ? (
                    <DebugPage users={users} votes={votes} />
                ) : (
                    <SettingsPage
                        user={currentUser}
                        onUpdateUser={async (updatedUser) => {
                            await storage.updateUser(updatedUser);
                            const updatedUsers = users.map(u => u.id === updatedUser.id ? updatedUser : u);
                            setUsers(updatedUsers);
                            setCurrentUser(updatedUser);
                            storage.setCurrentUser(updatedUser);
                        }}
                    />
                )}
            </div>
        </div>
    )function ClaimProfileModal({ users, onClaim, onNewPlayer }) {
        const [selectedPlayer, setSelectedPlayer] = useState('');
        const [newPlayerName, setNewPlayerName] = useState('');
        const availablePlayers = users.filter(u => !u.claimed && !u.id.startsWith('seed'));

        return (
            <div className="modal-overlay">
                <div className="modal-content">
                    <h2>👋 Benvenuto!</h2>
                    <p>Chi sei tra questi giocatori?</p>
                    <div className="form-group">
                        <label>Seleziona il tuo nome:</label>
                        <select value={selectedPlayer} onChange={(e) => setSelectedPlayer(e.target.value)}>
                            <option value="">-- Seleziona il tuo profilo --</option>
                            {availablePlayers.map(player => (
                                <option key={player.id} value={player.id}>{player.name}</option>
                            ))}
                        </select>
                    </div>
                    <button className="btn btn-primary full-width" onClick={() => selectedPlayer && onClaim(selectedPlayer)} disabled={!selectedPlayer}>
                        ✓ Sono io!
                    </button>
                    <div className="modal-divider">
                        <p className="modal-hint">Non trovi il tuo nome?</p>
                        <input type="text" placeholder="Scrivi il tuo nome e cognome" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} />
                        <button className="btn btn-secondary full-width" onClick={() => onNewPlayer(newPlayerName)} disabled={!newPlayerName.trim()}>
                            + Sono un nuovo giocatore
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    function RoleSelectionModal({ onSave }) {
        const [preferredRole, setPreferredRole] = useState('');
        const [otherRoles, setOtherRoles] = useState([]);

        const handleOtherRoleToggle = (role) => {
            if (otherRoles.includes(role)) {
                setOtherRoles(otherRoles.filter(r => r !== role));
            } else {
                setOtherRoles([...otherRoles, role]);
            }
        };

        // 🆕 FUNZIONE PER GESTIRE CAMBIO RUOLO PREFERITO
        const handlePreferredRoleChange = (newRole) => {
            // Se il nuovo ruolo preferito era negli altri ruoli, rimuovilo
            if (otherRoles.includes(newRole)) {
                setOtherRoles(otherRoles.filter(r => r !== newRole));
            }
            setPreferredRole(newRole);
        };

        const handleSubmit = () => {
            if (!preferredRole) {
                alert('Seleziona il tuo ruolo preferito');
                return;
            }
            // I portieri non devono obbligatoriamente scegliere altri ruoli
            const isGoalkeeper = preferredRole === 'Portiere';
            if (!isGoalkeeper && otherRoles.length < 2) {
                alert('Seleziona almeno 2 altri ruoli');
                return;
            }
            onSave(preferredRole, otherRoles);
        };

        const availableOtherRoles = ROLES.filter(r => r !== preferredRole);

        return (
            <div className="modal-overlay">
                <div className="modal-content">
                    <h2>⚽ Benvenuto!</h2>
                    <p>Prima di iniziare, raccontaci qualcosa di te</p>
                    <div className="form-group">
                        <label>Qual è il tuo ruolo preferito? *</label>
                        <select
                            value={preferredRole}
                            onChange={(e) => handlePreferredRoleChange(e.target.value)}
                        >
                            <option value="">-- Seleziona --</option>
                            {ROLES.map(role => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>
                            In quali altri ruoli ti adatti?
                            {preferredRole === 'Portiere' ? ' (opzionale)' : ' (min. 2) *'}
                        </label>
                        <div className="checkbox-group">
                            {availableOtherRoles.map(role => (
                                <div key={role} className="checkbox-item">
                                    <input
                                        type="checkbox"
                                        id={`role-${role}`}
                                        checked={otherRoles.includes(role)}
                                        onChange={() => handleOtherRoleToggle(role)}
                                    />
                                    <label htmlFor={`role-${role}`}>{role}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                    <button
                        className={`btn btn-primary full-width ${(!preferredRole || (preferredRole !== 'Portiere' && otherRoles.length < 2)) ? 'btn-disabled' : ''}`}
                        onClick={handleSubmit}
                        disabled={!preferredRole || (preferredRole !== 'Portiere' && otherRoles.length < 2)}
                    >
                        Conferma {preferredRole !== 'Portiere' && otherRoles.length < 2 && preferredRole ? `(${otherRoles.length}/2 ruoli)` : ''}
                    </button>
                </div>
            </div>
        );
    }


    function RoleEditModal({ user, onClose, onSuccess }) {
        const [preferredRole, setPreferredRole] = useState(user.preferredRole || '');
        const [otherRoles, setOtherRoles] = useState(user.otherRoles || []);

        const handleOtherRoleToggle = (role) => {
            if (otherRoles.includes(role)) {
                setOtherRoles(otherRoles.filter(r => r !== role));
            } else {
                setOtherRoles([...otherRoles, role]);
            }
        };

        // 🆕 FUNZIONE PER GESTIRE CAMBIO RUOLO PREFERITO
        const handlePreferredRoleChange = (newRole) => {
            // Se il nuovo ruolo preferito era negli altri ruoli, rimuovilo
            if (otherRoles.includes(newRole)) {
                setOtherRoles(otherRoles.filter(r => r !== newRole));
            }
            setPreferredRole(newRole);
        };

        const handleSubmit = async () => {
            if (!preferredRole) {
                alert('Seleziona il tuo ruolo preferito');
                return;
            }

            // 🆕 CONTROLLO AGGIUNTIVO: Assicurati che preferredRole non sia in otherRoles
            const cleanedOtherRoles = otherRoles.filter(r => r !== preferredRole);

            // I portieri non devono obbligatoriamente scegliere altri ruoli
            const isGoalkeeper = preferredRole === 'Portiere';
            if (!isGoalkeeper && cleanedOtherRoles.length < 2) {
                alert('Seleziona almeno 2 altri ruoli');
                return;
            }

            const updatedUser = {
                ...user,
                preferredRole,
                otherRoles: cleanedOtherRoles  // 🆕 Usa la versione pulita
            };

            await storage.updateUser(updatedUser);
            storage.setCurrentUser(updatedUser);
            onSuccess();
        };

        const availableOtherRoles = ROLES.filter(r => r !== preferredRole);

        return (
            <div className="modal-overlay">
                <div className="modal-content">
                    <h2>✏️ Modifica Ruoli</h2>
                    <p>Aggiorna le tue preferenze di ruolo</p>

                    <div className="form-group">
                        <label>Qual è il tuo ruolo preferito? *</label>
                        <select
                            value={preferredRole}
                            onChange={(e) => handlePreferredRoleChange(e.target.value)}
                        >
                            <option value="">-- Seleziona --</option>
                            {ROLES.map(role => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>
                            In quali altri ruoli ti adatti?
                            {preferredRole === 'Portiere' ? ' (opzionale)' : ' (min. 2) *'}
                        </label>
                        <div className="checkbox-group">
                            {availableOtherRoles.map(role => (
                                <div key={role} className="checkbox-item">
                                    <input
                                        type="checkbox"
                                        id={`edit-role-${role}`}
                                        checked={otherRoles.includes(role)}
                                        onChange={() => handleOtherRoleToggle(role)}
                                    />
                                    <label htmlFor={`edit-role-${role}`}>{role}</label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button className="btn btn-secondary" onClick={onClose}>
                            Annulla
                        </button>
                        <button
                            className={`btn btn-primary ${(!preferredRole || (preferredRole !== 'Portiere' && otherRoles.filter(r => r !== preferredRole).length < 2)) ? 'btn-disabled' : ''}`}
                            onClick={handleSubmit}
                            disabled={!preferredRole || (preferredRole !== 'Portiere' && otherRoles.filter(r => r !== preferredRole).length < 2)}
                        >
                            Salva Modifiche {preferredRole !== 'Portiere' && otherRoles.filter(r => r !== preferredRole).length < 2 && preferredRole ? `(${otherRoles.filter(r => r !== preferredRole).length}/2 ruoli)` : ''}
                        </button>
                    </div>
                </div>
            </div>
        );
    }



    function ProfileSelectorModal({ profiles, onSelect }) {
        return (
            <div className="modal-overlay">
                <div className="modal-content">
                    <h2>👋 Ciao Antonio!</h2>
                    <p>Con quale profilo vuoi entrare?</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '25px' }}>
                        {profiles.map(profile => (
                            <button
                                key={profile.id}
                                className="btn btn-primary full-width"
                                onClick={() => onSelect(profile)}
                                style={{ fontSize: '1.1rem', padding: '18px' }}
                            >
                                {profile.isGoalkeeper ? '🧤' : '👤'} {profile.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    };
}

export default App;