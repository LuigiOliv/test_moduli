// src/components/App.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import { useState, useEffect, useCallback, useRef } from 'react';
import { auth } from '../firebase.js';
import { onAuthStateChanged, signOut, getRedirectResult } from 'firebase/auth';
import storage from '../storage.js';
import utils from '../utils.js';  // ← AGGIUNGI QUESTA RIGA
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
    const hasCheckedRedirect = useRef(false);


    // ✅ NUOVO: Gestisci il ritorno dal redirect di Google
    //useEffect(() => {
    //  const checkRedirectResult = async () => {
    //      try {
    //        hasCheckedRedirect.current = true; // 🔧 AGGIUNGI QUESTA RIGA
    //      const result = await getRedirectResult(auth);
    //    if (result?.user) {
    //      console.log('✅ Login completato dopo redirect, user:', result.user.email);
    // Il resto viene gestito da onAuthStateChanged
    //               }
    //         } catch (error) {
    //           console.error('❌ Errore redirect login:', error);
    //         alert('Errore durante il login. Riprova.');
    //   }
    //};
    //checkRedirectResult();
    //}, []);

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

    // 🔧 FIX: Controlla redirect PRIMA, poi attiva listener
    useEffect(() => {
        console.log('🔵 Inizio gestione auth');
        let unsubscribe;

        (async () => {
            try {
                // STEP 1: Controlla redirect result PRIMA di tutto
                console.log('🔵 Controllo redirect result...');
                const redirectResult = await getRedirectResult(auth);
                console.log('🔵 Redirect result:', redirectResult?.user?.email || 'NULL');

                // STEP 2: Ora attiva il listener
                unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
                    console.log('🔵 onAuthStateChanged trigger, user:', firebaseUser?.email || 'NULL');
                    setLoading(true);

                    if (firebaseUser && firebaseUser.email) {
                        try {
                            console.log('🟢 Firebase user valido:', firebaseUser.email);

                            let loadedUsers = await storage.getUsers();
                            console.log('🟢 Users caricati:', loadedUsers?.length || 0);

                            if (!loadedUsers || !Array.isArray(loadedUsers)) {
                                console.error('❌ storage.getUsers() returned:', loadedUsers);
                                loadedUsers = [];
                            }
                            setUsers(loadedUsers);

                            const email = firebaseUser.email;
                            console.log('🟢 Cerco utente con email:', email);

                            const recoveredUser = await storage.recoverAccount(email, {
                                avatar: firebaseUser.photoURL
                            });

                            if (recoveredUser) {
                                console.log('🟢 Account recuperato:', recoveredUser.name);
                                const userWithAdmin = { ...recoveredUser, isAdmin: email === ADMIN_EMAIL };
                                setCurrentUser(userWithAdmin);
                                storage.setCurrentUser(userWithAdmin);
                                const loadedVotes = await storage.getVotes();
                                setVotes(loadedVotes || []);
                                setUsers(await storage.getUsers());
                                setShowRoleModal(true);
                            } else {
                                const existingUser = loadedUsers.find(u => u.email === email);
                                console.log('🟢 Utente esistente trovato?', existingUser ? existingUser.name : 'NO');

                                if (existingUser) {
                                    console.log('✅ LOGIN SUCCESS per:', existingUser.name);
                                    const userWithAdmin = { ...existingUser, isAdmin: email === ADMIN_EMAIL };
                                    setCurrentUser(userWithAdmin);
                                    storage.setCurrentUser(userWithAdmin);

                                    const loadedVotes = await storage.getVotes();
                                    setVotes(loadedVotes || []);

                                    if (!existingUser.preferredRole) setShowRoleModal(true);
                                } else {
                                    console.log('⚠️ Utente NON trovato, mostro modal claim');
                                    setPendingEmail(email);
                                    setShowClaimModal(true);
                                }
                            }
                        } catch (error) {
                            console.error('❌ Errore caricamento dati DOPO login:', error);
                            alert('Errore caricamento dati. Ricarica la pagina.');
                        } finally {
                            console.log('🔵 setLoading(false) - fine processo auth');
                            setLoading(false);
                        }
                    } else {
                        console.log('🔴 Nessun utente - mostro login page');
                        setCurrentUser(null);
                        setLoading(false);
                    }
                });
            } catch (error) {
                console.error('❌ Errore gestione auth:', error);
                setLoading(false);
            }
        })();

        return () => {
            console.log('🔵 Cleanup - unsubscribe');
            unsubscribe?.();
        };
    }, []);

    const handleLogin = (email) => {
        console.log('🔍 handleLogin ricevuto:', email);
        console.log('🔍 typeof email:', typeof email);
        if (typeof email === 'object') {
            console.error('❌ ERRORE: email è un oggetto!', email);
        }
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
            id: utils.generatePlayerId(users),  // ← USA utils.generatePlayerId
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

    const handleDeleteAccount = async () => {
        console.log('🔍 handleDeleteAccount chiamato');
        console.log('🔍 currentUser:', currentUser);

        const confirm1 = window.confirm(
            '⚠️ ATTENZIONE!\n\n' +
            'Stai per disiscriverti e cancellare i tuoi dati.\n\n' +
            'Cosa succederà:\n' +
            '✓ I tuoi voti dati rimarranno\n' +
            '✓ I voti ricevuti rimarranno\n' +
            '✓ Il tuo playerId rimarrà\n' +
            '✗ I tuoi dati personali verranno cancellati\n' +
            '✗ Verrai disiscritto da tutte le partite\n\n' +
            '💡 IMPORTANTE: Se ti registri di nuovo con la stessa email,\n' +
            'ritroverai automaticamente il tuo profilo!\n\n' +
            'Vuoi continuare?'
        );

        console.log('🔍 confirm1:', confirm1);
        if (!confirm1) return;

        const confirm2 = window.prompt(
            `Per confermare, scrivi il tuo nome esatto: "${currentUser.name}"`
        );

        console.log('🔍 confirm2:', confirm2);
        if (confirm2 !== currentUser.name) {
            alert('❌ Nome non corretto. Eliminazione annullata.');
            return;
        }

        console.log('🔍 Inizio eliminazione...');
        try {
            await storage.deleteAccount(currentUser.id);

            alert(
                '✓ Account disattivato con successo.\n\n' +
                'I tuoi voti e statistiche rimangono nel sistema.\n' +
                'Potrai riattivare il profilo registrandoti di nuovo con ' + currentUser.email
            );

            const { auth } = await import('../firebase.js');
            const { signOut } = await import('firebase/auth');
            await signOut(auth);

            storage.setCurrentUser(null);
            window.location.reload();
        } catch (error) {
            console.error('❌ Errore eliminazione account:', error);
            alert('❌ Errore durante l\'eliminazione. Riprova o contatta l\'amministratore.');
        }
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
                        onDeleteAccount={handleDeleteAccount}
                    />
                )}
            </div>
        </div>
    );
}

export default App;