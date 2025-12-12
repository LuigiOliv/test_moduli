import { useState, useEffect } from 'react';
import { LoginPage } from './AuthPage.jsx';
import storage from '../storage.js';
import Header from './Navigation/Header.jsx';
import MatchesPage from './MatchesPage.jsx';
import ClassifichePage from './ClassifichePage.jsx';
import PlayerProfile from './PlayerProfile.jsx';
import { SettingsPage, AdminPage } from './AdminAndSettings.jsx';
import MatchDetailRouter from './MatchDetailRouter.jsx';

export default function App() {
    // ==================== STATE ====================
    const [currentUser, setCurrentUser] = useState(storage.getCurrentUser());
    const [currentPage, setCurrentPage] = useState('matches'); // 'matches', 'classifiche', 'profile', 'settings', 'admin'
    const [selectedMatchId, setSelectedMatchId] = useState(null);
    const [selectedPlayerId, setSelectedPlayerId] = useState(null);
    
    // Data State
    const [matches, setMatches] = useState([]);
    const [users, setUsers] = useState([]);
    const [votes, setVotes] = useState([]);
    const [loading, setLoading] = useState(true);

    // ==================== EFFECTS ====================
    
    // Load all data on mount
    useEffect(() => {
        if (currentUser) {
            loadAllData();
        }
    }, [currentUser]);

    // ==================== DATA LOADING ====================
    
    const loadAllData = async () => {
        setLoading(true);
        try {
            // Load data independently to avoid one failure blocking others
            const matchesData = await storage.getMatches().catch(err => {
                console.error("Error loading matches:", err);
                return [];
            });
            
            const usersData = await storage.getUsers().catch(err => {
                console.error("Error loading users:", err);
                return [];
            });
            
            const votesData = await storage.getVotes().catch(err => {
                console.error("Error loading votes:", err);
                return [];
            });

            console.log("Data loaded:", {
                matches: matchesData.length,
                users: usersData.length,
                votes: votesData.length
            });

            setMatches(matchesData || []);
            setUsers(usersData || []);
            setVotes(votesData || []);

            // Update current user with fresh data from users collection
            if (currentUser && usersData.length > 0) {
                const updatedCurrentUser = usersData.find(u => u.id === currentUser.id);
                if (updatedCurrentUser) {
                    console.log("Updating current user with fresh data:", updatedCurrentUser);
                    setCurrentUser(updatedCurrentUser);
                    storage.setCurrentUser(updatedCurrentUser);
                }
            }
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setLoading(false);
        }
    };

    // ==================== HANDLERS ====================
    
    const handleLogin = (user) => {
        setCurrentUser(user);
    };

    const handleLogout = async () => {
        await storage.handleLogout();
        setCurrentUser(null);
        setCurrentPage('matches');
        setSelectedMatchId(null);
        setSelectedPlayerId(null);
    };

    const handleUpdateUser = async (updatedUser) => {
        await storage.updateUser(updatedUser);
        setCurrentUser(updatedUser);
        await loadAllData(); // Refresh to get updated user in users array
    };

    const handleSelectMatch = (matchId) => {
        setSelectedMatchId(matchId);
        setCurrentPage('match-detail');
    };

    const handleViewProfile = (playerId) => {
        setSelectedPlayerId(playerId);
        setCurrentPage('player-profile');
    };

    const handleBackToMatches = () => {
        setSelectedMatchId(null);
        setCurrentPage('matches');
    };

    const handleBackToClassifiche = () => {
        setSelectedPlayerId(null);
        setCurrentPage('classifiche');
    };

    // ==================== RENDER ====================
    
    if (!currentUser) {
        return <LoginPage onLogin={handleLogin} />;
    }

    if (loading) {
        return (
            <div className="app-container">
                <div className="loading-screen">
                    <h2>⚽ Caricamento...</h2>
                </div>
            </div>
        );
    }

    // Selected match for detail view
    const selectedMatch = selectedMatchId 
        ? matches.find(m => m.id === selectedMatchId) 
        : null;

    // Selected player for profile view
    const selectedPlayer = selectedPlayerId 
        ? users.find(u => u.id === selectedPlayerId) 
        : null;

    return (
        <div className="app-container">
            <Header 
                user={currentUser} 
                onLogout={handleLogout}
                onOpenSettings={() => setCurrentPage('settings')}
            />
            
            {/* Navigation Tabs */}
            {currentPage !== 'match-detail' && currentPage !== 'player-profile' && (
                <nav className="main-nav">
                    <button 
                        className={currentPage === 'matches' ? 'active' : ''}
                        onClick={() => setCurrentPage('matches')}
                    >
                        🏟️ Partite
                    </button>
                    <button 
                        className={currentPage === 'classifiche' ? 'active' : ''}
                        onClick={() => setCurrentPage('classifiche')}
                    >
                        🏆 Classifiche
                    </button>
                    <button 
                        className={currentPage === 'profile' ? 'active' : ''}
                        onClick={() => {
                            setSelectedPlayerId(currentUser.id);
                            setCurrentPage('profile');
                        }}
                    >
                        👤 Il Mio Profilo
                    </button>
                    <button 
                        className={currentPage === 'settings' ? 'active' : ''}
                        onClick={() => setCurrentPage('settings')}
                    >
                        ⚙️ Impostazioni
                    </button>
                    {currentUser.isAdmin && (
                        <button 
                            className={currentPage === 'admin' ? 'active' : ''}
                            onClick={() => setCurrentPage('admin')}
                        >
                            🔧 Admin
                        </button>
                    )}
                </nav>
            )}

            <main className="app-main-content">
                {/* MATCHES PAGE */}
                {currentPage === 'matches' && (
                    <MatchesPage
                        matches={matches}
                        currentUser={currentUser}
                        users={users}
                        onSelectMatch={handleSelectMatch}
                        onRefreshData={loadAllData}
                    />
                )}

                {/* CLASSIFICHE PAGE */}
                {currentPage === 'classifiche' && (
                    <ClassifichePage
                        users={users}
                        votes={votes}
                        currentUser={currentUser}
                        onViewProfile={handleViewProfile}
                    />
                )}

                {/* PROFILE PAGE (Own Profile) */}
                {currentPage === 'profile' && (
                    <PlayerProfile
                        player={currentUser}
                        users={users}
                        votes={votes}
                        matches={matches}
                        isOwnProfile={true}
                    />
                )}

                {/* PLAYER PROFILE PAGE (Other Player) */}
                {currentPage === 'player-profile' && selectedPlayer && (
                    <PlayerProfile
                        player={selectedPlayer}
                        users={users}
                        votes={votes}
                        matches={matches}
                        isOwnProfile={selectedPlayer.id === currentUser.id}
                        onBack={handleBackToClassifiche}
                    />
                )}

                {/* SETTINGS PAGE */}
                {currentPage === 'settings' && (
                    <SettingsPage
                        user={currentUser}
                        onUpdateUser={handleUpdateUser}
                    />
                )}

                {/* ADMIN PAGE */}
                {currentPage === 'admin' && currentUser.isAdmin && (
                    <AdminPage
                        users={users}
                        onRefreshData={loadAllData}
                    />
                )}

                {/* MATCH DETAIL PAGE */}
                {currentPage === 'match-detail' && selectedMatch && (
                    <MatchDetailRouter
                        match={selectedMatch}
                        currentUser={currentUser}
                        users={users}
                        votes={votes}
                        onBack={handleBackToMatches}
                        onVoteSubmit={loadAllData}
                        onRegistrationChange={loadAllData}
                        onMatchUpdate={loadAllData}
                    />
                )}
            </main>

            <footer className="app-footer">
                <p>© 2025 Luigi Oliviero | Tutti i diritti riservati</p>
            </footer>
        </div>
    );
}
