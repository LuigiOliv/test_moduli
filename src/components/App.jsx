// src/components/App.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import { useState, useEffect } from 'react';
import { auth } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import storage from '../storage.js';
import { ADMIN_EMAIL } from '../constants.js';
import Header from './Navigation/Header.jsx';
import { LoginPage } from './AuthPage.jsx';
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
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser && firebaseUser.email) {
                setLoading(true);
                try {
                    // A. Leggi TUTTI gli utenti
                    let loadedUsers = await storage.getUsers();

                    // 🛡️ SAFETY CHECK
                    if (!loadedUsers || !Array.isArray(loadedUsers)) {
                        console.error('❌ storage.getUsers() returned:', loadedUsers);
                        loadedUsers = [];
                    }

                    // ✅ IMPORTANTE: Salva users SUBITO (serve per ClaimProfileModal)
                    setUsers(loadedUsers);

                    // B. Trova l'utente loggato
                    const email = firebaseUser.email;
                    const existingUser = loadedUsers.find(u => u.email === email);

                    // C. Logica di login/profilo
                    if (existingUser) {
                        // Utente Trovato: Completa il Login
                        const userWithAdmin = { ...existingUser, isAdmin: email === ADMIN_EMAIL };
                        setCurrentUser(userWithAdmin);
                        storage.setCurrentUser(userWithAdmin);

                        // D. Carica voti
                        const loadedVotes = await storage.getVotes();
                        setVotes(loadedVotes || []);

                        // Gestione modali
                        if (!existingUser.preferredRole) setShowRoleModal(true);

                    } else {
                        // Utente NON Trovato: Richiedi registrazione/claim
                        // ✅ Ora users è già popolato grazie a setUsers() sopra
                        setPendingEmail(email);
                        setShowClaimModal(true);
                    }

                } catch (error) {
                    console.error('❌ Errore caricamento dati DOPO login:', error);
                    alert('Errore caricamento dati. Ricarica la pagina.');
                } finally {
                    setLoading(false);
                }

            } else {
                // L'utente NON è loggato
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

    const handleLogout = async () => {
        await signOut(auth);
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
                    <h1>⚽ Sportivity</h1>
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
                    users.find(u => u.id === viewingProfile) ? (
                        <PlayerProfile
                            player={users.find(u => u.id === viewingProfile)}
                            votes={votes}
                            isOwnProfile={viewingProfile === currentUser.id}
                        />
                    ) : null
                ) : selectedPlayer ? (
                    users.find(u => u.id === selectedPlayer) ? (
                        <RatingForm
                            player={users.find(u => u.id === selectedPlayer)}
                            onSubmit={handleVoteSubmit}
                            onCancel={() => setSelectedPlayer(null)}
                        />
                    ) : null
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
    );
}

export default App;