// src/components/PlayersListPage.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import utils from '../utils.js';

function PlayersListPage({ users = [], currentUser, votes = [], onSelectPlayer }) {
    const hasVoted = (playerId) => {
        return votes.some(v => v.voterId === currentUser.id && v.playerId === playerId);
    };

    const playersToVote = users.filter(u => {
        if (u.id === currentUser.id || u.id.startsWith('seed')) return false;
        if (hasVoted(u.id)) return false;
        if (currentUser.hasVotedOffline && u.isInitialPlayer) return false;
        return true;
    });

    return (
        <div className="section-container">
            <div className="section-header">
                <h2>Seleziona un giocatore da valutare</h2>
            </div>

            {playersToVote.length === 0 ? (
                <div className="no-votes">
                    <h3>🎉 Ottimo lavoro, hai valutato tutti!</h3>
                    {currentUser.hasVotedOffline && (
                        <p>Hai già votato tutti. Potrai votare i nuovi iscritti.</p>
                    )}
                </div>
            ) : (
                <div className="players-grid">
                    {playersToVote.map(player => (
                        <div key={player.id} className="player-card" onClick={() => onSelectPlayer(player.id)}>
                            <div className="avatar">
                                {player.avatar ? <img src={player.avatar} alt={player.name} /> : utils.getInitials(player.name)}
                            </div>
                            <h3>{player.name} {player.isGoalkeeper && '🧤'}</h3>
                            <div className="status">
                                {player.isGoalkeeper && <span className="goalkeeper-badge">🧤 PORTIERE</span>}
                                {!player.isInitialPlayer && <span className="new-badge">⭐ NUOVO</span>}
                                <div>Clicca per valutare</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default PlayersListPage;