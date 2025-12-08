// src/components/Match/MatchDetails.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import utils from '../../utils.js';
import storage from '../../storage.js';
import { getSkillsForPlayer, shortSKILLS } from '../../constants.js'; // Importa SKILLS per il voto

const { useState, useMemo, useCallback } = window.React;

// =========================================================================
// 1. MATCH TEAM ASSIGNMENT (Assegnazione Squadre - Admin)
// =========================================================================

/**
 * Componente per l'assegnazione manuale delle squadre (Solo Admin).
 * Stato: OPEN o CLOSED.
 */
export function MatchTeamAssignment({ match, users, onMatchUpdate }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [status, setStatus] = useState(match.status);
    
    // Filtra solo i partecipanti alla partita
    const participants = useMemo(() => {
        return match.participants
            .map(id => users.find(u => u.id === id))
            .filter(u => u !== undefined);
    }, [match.participants, users]);

    // Stato per la composizione delle squadre (ID Utente)
    const [teamGialli, setTeamGialli] = useState(match.teams?.gialli || []);
    const [teamVerdi, setTeamVerdi] = useState(match.teams?.verdi || []);

    // Giocatori non assegnati
    const unassignedPlayers = useMemo(() => {
        const assignedIds = new Set([...teamGialli, ...teamVerdi]);
        return participants.filter(p => !assignedIds.has(p.id));
    }, [participants, teamGialli, teamVerdi]);

    // Funzione per spostare un giocatore
    const movePlayer = (playerId, targetTeam) => {
        // Rimuovi da entrambi i team attuali
        const newGialli = teamGialli.filter(id => id !== playerId);
        const newVerdi = teamVerdi.filter(id => id !== playerId);

        // Aggiungi al team target
        if (targetTeam === 'gialli') {
            newGialli.push(playerId);
        } else if (targetTeam === 'verdi') {
            newVerdi.push(playerId);
        }
        
        setTeamGialli(newGialli);
        setTeamVerdi(newVerdi);
        setError(null);
    };

    // Funzione per salvare le squadre e cambiare lo stato a VOTING
    const handleSaveAndStartVoting = async () => {
        if (unassignedPlayers.length > 0) {
            setError(`Ci sono ancora ${unassignedPlayers.length} giocatori non assegnati!`);
            return;
        }

        if (teamGialli.length === 0 || teamVerdi.length === 0) {
            setError("Entrambe le squadre devono avere almeno un giocatore.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await storage.updateMatchStatus(match.id, {
                status: 'VOTING',
                teams: {
                    gialli: teamGialli,
                    verdi: teamVerdi
                },
                matchStartedAt: new Date().toISOString()
            });
            onMatchUpdate(); // Aggiorna lo stato globale
        } catch (err) {
            setError("Errore nel salvataggio e avvio voto: " + err.message);
        } finally {
            setLoading(false);
        }
    };
    
    // Funzione per eliminare la partita
    const handleDeleteMatch = async () => {
        if (!window.confirm("Sei sicuro di voler eliminare questa partita? L'azione è irreversibile.")) return;
        
        setLoading(true);
        setError(null);
        try {
            await storage.deleteMatch(match.id);
            alert("Partita eliminata con successo!");
            onMatchUpdate(); // Ritorna alla lista
        } catch (err) {
            setError("Errore nell'eliminazione della partita: " + err.message);
        } finally {
            setLoading(false);
        }
    };
    
    // Funzione per forzare lo stato (es. da VOTING a COMPLETED)
    const handleForceStatusChange = async (newStatus) => {
        if (!window.confirm(`Sei sicuro di voler forzare lo stato a ${newStatus}?`)) return;
        
        setLoading(true);
        try {
            await storage.updateMatchStatus(match.id, { status: newStatus });
            onMatchUpdate();
        } catch (err) {
            setError(`Errore nel cambio stato a ${newStatus}: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };


    const renderPlayerList = (playersIds, teamName) => {
        return playersIds.map(playerId => {
            const player = users.find(u => u.id === playerId);
            if (!player) return null;
            
            return (
                <div 
                    key={playerId} 
                    className="player-item draggable" 
                    onClick={() => movePlayer(playerId, teamName === 'Gialli' ? 'verdi' : 'gialli')}
                    title={`Sposta in Squadra ${teamName === 'Gialli' ? 'Verdi' : 'Gialli'}`}
                >
                    {player.nickname || player.displayName}
                </div>
            );
        });
    };

    return (
        <div className="match-admin-assignment">
            <h3>{utils.formatMatchDateFull(match.date)} @ {match.location}</h3>
            {error && <div className="error-message">{error}</div>}
            
            <div className="team-assignment-grid">
                
                {/* 1. Giocatori non Assegnati */}
                <div className="team-column unassigned-column">
                    <h4>Non Assegnati ({unassignedPlayers.length})</h4>
                    <div className="player-list">
                        {unassignedPlayers.map(player => (
                            <div 
                                key={player.id} 
                                className="player-item unassigned"
                                onClick={() => movePlayer(player.id, teamGialli.length <= teamVerdi.length ? 'gialli' : 'verdi')}
                                title={`Assegna a Squadra ${teamGialli.length <= teamVerdi.length ? 'Gialli' : 'Verdi'}`}
                            >
                                {player.nickname || player.displayName}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Squadra Gialla */}
                <div className="team-column team-gialli">
                    <h4>Squadra Gialla ({teamGialli.length})</h4>
                    <div className="player-list">
                        {renderPlayerList(teamGialli, 'Gialli')}
                    </div>
                </div>

                {/* 3. Squadra Verde */}
                <div className="team-column team-verdi">
                    <h4>Squadra Verde ({teamVerdi.length})</h4>
                    <div className="player-list">
                        {renderPlayerList(teamVerdi, 'Verdi')}
                    </div>
                </div>
            </div>

            <div className="admin-actions-footer">
                <button 
                    className="button red" 
                    onClick={handleDeleteMatch}
                    disabled={loading}
                >
                    🗑️ Elimina Partita
                </button>
                <button 
                    className="button secondary" 
                    onClick={() => handleForceStatusChange('COMPLETED')}
                    disabled={loading || match.status === 'COMPLETED'}
                >
                    → Chiudi e Salta Voto
                </button>
                <button 
                    className="button primary large-button" 
                    onClick={handleSaveAndStartVoting}
                    disabled={loading || unassignedPlayers.length > 0 || match.status === 'VOTING'}
                >
                    {loading ? 'Avvio Voto...' : '▶️ Salva Squadre e Avvia Voto'}
                </button>
            </div>
            
            <p className="admin-tip">Clicca su un giocatore per spostarlo tra le squadre.</p>
        </div>
    );
}

// =========================================================================
// 2. MATCH VOTING INTERFACE (Interfaccia di Voto)
// =========================================================================

/**
 * Interfaccia per votare tutti i partecipanti di una partita.
 * Stato: VOTING.
 */
export function MatchVotingInterface({ match, users, votes, currentUser, onVoteSubmit, onMatchUpdate }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Voti già espressi dall'utente loggato per questa partita
    const existingVotes = useMemo(() => {
        return votes.filter(v => v.matchId === match.id && v.voterId === currentUser.id);
    }, [votes, match.id, currentUser.id]);

    // Lista dei giocatori votabili (tutti i partecipanti tranne l'elettore stesso)
    const playersToVote = useMemo(() => {
        if (!match.teams) return [];
        const allVotedIds = [...match.teams.gialli, ...match.teams.verdi];
        return allVotedIds
            .filter(id => id !== currentUser.id) // Non puoi votare te stesso
            .map(id => users.find(u => u.id === id))
            .filter(u => u !== undefined);
    }, [match.teams, users, currentUser.id]);
    
    // Inizializza lo stato dei voti (matchVote e skillVotes per ogni giocatore)
    const initialVoteState = useMemo(() => {
        const state = {};
        
        playersToVote.forEach(player => {
            const playerVotes = existingVotes.find(v => v.votedPlayerId === player.id);
            const skills = getSkillsForPlayer(player); // Determina le skill in base al ruolo
            
            // Inizializza le skill vote a 5 (scala 1-10) o al valore salvato
            const initialSkillVotes = {};
            Object.values(skills).flat().forEach(skill => {
                // Se non c'è un voto salvato, usa 6.0 come predefinito per la scala 1-10
                initialSkillVotes[skill] = playerVotes?.skillVotes?.[skill] || 6.0; 
            });

            state[player.id] = {
                matchVote: playerVotes?.matchVote || 6.0, // Voto generale 1-10
                skillVotes: initialSkillVotes
            };
        });
        return state;
    }, [playersToVote, existingVotes]);

    const [voteState, setVoteState] = useState(initialVoteState);
    
    // Aggiorna lo stato quando cambia un voto
    const handleVoteChange = useCallback((playerId, type, value, skillName = null) => {
        setVoteState(prev => {
            const newState = { ...prev };
            newState[playerId] = { ...newState[playerId] };
            
            if (type === 'match') {
                newState[playerId].matchVote = parseFloat(value);
            } else if (type === 'skill' && skillName) {
                newState[playerId].skillVotes = { ...newState[playerId].skillVotes };
                newState[playerId].skillVotes[skillName] = parseFloat(value);
            }
            return newState;
        });
    }, []);

    // Verifica se tutti i voti sono stati espressi (almeno un voto generale e un voto skill per ogni giocatore)
    const isFormValid = useMemo(() => {
        if (playersToVote.length === 0) return true; // Nessuno da votare
        
        return playersToVote.every(player => {
            const votes = voteState[player.id];
            if (!votes) return false;
            
            // Controlla il voto match
            if (votes.matchVote < 1 || votes.matchVote > 10) return false;
            
            // Controlla che le skill non siano tutte 0 (anche se il default è 6.0)
            const playerSkills = getSkillsForPlayer(player);
            const flatSkills = Object.values(playerSkills).flat();
            
            // Controlla che ogni skill abbia un valore valido (tra 1 e 10)
            return flatSkills.every(skill => {
                const skillValue = votes.skillVotes?.[skill];
                return skillValue >= 1 && skillValue <= 10;
            });
        });
    }, [voteState, playersToVote]);


    const handleSubmitVotes = async () => {
        if (!isFormValid) {
            setError("Assicurati di assegnare un voto (tra 1 e 10) per tutti i giocatori e tutte le skill.");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccessMessage(null);
        
        try {
            const submissionPromises = playersToVote.map(player => {
                const voteData = voteState[player.id];
                return storage.saveVote({
                    matchVote: voteData.matchVote,
                    skillVotes: voteData.skillVotes,
                    isMVP: false, // L'MVP è calcolato dopo la chiusura del voto
                }, match.id, currentUser.id, player.id);
            });

            await Promise.all(submissionPromises);

            setSuccessMessage('Voti inviati con successo! Grazie per aver votato.');
            onVoteSubmit(); // Ricarica i dati in App.jsx

        } catch (err) {
            setError("Errore durante il salvataggio dei voti: " + err.message);
        } finally {
            setLoading(false);
        }
    };
    
    // Logica Admin: chiusura manuale del voto
    const handleCompleteVoting = async () => {
        if (!window.confirm("Sei sicuro di voler chiudere il voto e finalizzare i risultati?")) return;
        
        setLoading(true);
        try {
            await storage.updateMatchStatus(match.id, { 
                status: 'COMPLETED',
                votingClosedAt: new Date().toISOString()
            });
            onMatchUpdate(); // Ricarica lo stato globale
        } catch (err) {
            setError("Errore nel completamento del voto: " + err.message);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="match-voting-interface">
            <h3>Vota le Performance - {utils.formatMatchDateFull(match.date)}</h3>
            <p className="info-card warning">
                **Vota ogni giocatore in base alla sua performance (Scala 1-10).** Il tuo voto è anonimo e influenza il Rating complessivo del giocatore.
            </p>
            
            {successMessage && <div className="success-message">{successMessage}</div>}
            {error && <div className="error-message">{error}</div>}

            <div className="voting-list-container">
                {playersToVote.map(player => (
                    <PlayerVoteCard 
                        key={player.id}
                        player={player}
                        team={match.teams.gialli.includes(player.id) ? 'gialli' : 'verdi'}
                        votes={voteState[player.id]}
                        onVoteChange={handleVoteChange}
                    />
                ))}
            </div>
            
            <div className="voting-actions-footer">
                <button 
                    className="button primary large-button" 
                    onClick={handleSubmitVotes}
                    disabled={loading || !isFormValid}
                >
                    {loading ? 'Invio Voti...' : '✅ Invia i Voti'}
                </button>
            </div>
            
            {/* Opzione Admin per chiudere il voto */}
            {currentUser.isAdmin && (
                 <div className="admin-actions-footer" style={{marginTop: '20px'}}>
                    <button 
                        className="button red" 
                        onClick={handleCompleteVoting}
                        disabled={loading}
                    >
                        🔒 Chiudi Voto e Finalizza Risultati
                    </button>
                 </div>
            )}
        </div>
    );
}

// =========================================================================
// Sottocomponente: PlayerVoteCard (all'interno della MatchVotingInterface)
// =========================================================================

/**
 * Scheda per votare un singolo giocatore.
 */
function PlayerVoteCard({ player, team, votes, onVoteChange }) {
    
    // Le skill sono determinate dal ruolo (Portiere o Campo)
    const skillSet = getSkillsForPlayer(player);
    const shortNames = shortSKILLS; 
    
    const handleSliderChange = (e, skillName = null) => {
        const value = e.target.value;
        if (skillName) {
            onVoteChange(player.id, 'skill', value, skillName);
        } else {
            onVoteChange(player.id, 'match', value);
        }
    };
    
    // Calcola la media delle skill votate finora
    const skillAverages = useMemo(() => {
        if (!votes || !votes.skillVotes) return null;
        
        let totalSum = 0;
        let totalCount = 0;
        
        Object.values(skillSet).flat().forEach(skill => {
            const value = votes.skillVotes[skill];
            if (value >= 1) { // Conta solo se votato
                totalSum += value;
                totalCount++;
            }
        });
        
        const avg = totalCount > 0 ? totalSum / totalCount : 6.0;
        return utils.round(avg);
    }, [votes, skillSet]);


    return (
        <div className={`player-vote-card team-${team}`}>
            <div className="player-info">
                <h4>{player.nickname || player.displayName}</h4>
                <span className="player-role">{player.role}</span>
            </div>
            
            {/* Voto Generale (Match Vote) */}
            <div className="vote-section match-vote-slider">
                <label>Voto Partita Generale (1-10)</label>
                <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={votes.matchVote}
                    onChange={handleSliderChange}
                />
                <span className="vote-value">{votes.matchVote.toFixed(1)}</span>
            </div>
            
            {/* Voti Skill */}
            <div className="skill-votes">
                <div className="skill-section-header">
                    <label>Performance Skill (1-10)</label>
                    <span className="skill-avg-display">Media Skill: **{skillAverages.toFixed(1)}**</span>
                </div>
                {Object.keys(skillSet).map(category => (
                    <div key={category} className="skill-category">
                        <h5>{category.toUpperCase()}</h5>
                        {skillSet[category].map(skill => (
                            <div key={skill} className="skill-input">
                                <label title={skill}>
                                    {shortNames[skill] || skill}:
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    step="0.5"
                                    value={votes.skillVotes[skill]}
                                    onChange={(e) => handleSliderChange(e, skill)}
                                />
                                <span className="skill-value">{votes.skillVotes[skill].toFixed(1)}</span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

// =========================================================================
// 3. MATCH RESULT VIEW (Visualizzazione Risultati)
// =========================================================================

/**
 * Componente per la visualizzazione dei risultati di una partita.
 * Stato: VOTING (risultati parziali) o COMPLETED (risultati finali).
 */
export function MatchResultView({ match, users, votes, isVotingPhase, onMatchUpdate }) {
    const [loading, setLoading] = useState(false);
    const [scoreGialli, setScoreGialli] = useState(match.score?.gialli || '');
    const [scoreVerdi, setScoreVerdi] = useState(match.score?.verdi || '');
    const [error, setError] = useState(null);

    // --- Calcoli Risultati (Memoizzati) ---

    const results = useMemo(() => {
        if (!match.teams) return { playersStats: [], teamAverages: { gialli: 0, verdi: 0 } };

        const allParticipants = [...match.teams.gialli, ...match.teams.verdi];
        
        // 1. Calcolo Statistiche per Giocatore
        const playersStats = allParticipants.map(playerId => {
            const player = users.find(u => u.id === playerId);
            const playerVotes = votes.filter(v => v.matchId === match.id && v.votedPlayerId === playerId);
            
            if (!player) return null;

            // Media dei voti MATCH ricevuti (più importante per il Rank di Partita)
            const matchVotesReceived = playerVotes.map(v => v.matchVote).filter(v => v !== undefined && v !== null);
            const avgMatchVote = matchVotesReceived.length > 0 ? utils.round(matchVotesReceived.reduce((a, b) => a + b, 0) / matchVotesReceived.length, 2) : utils.round(6.0, 2);
            
            // Conteggio dei votanti
            const voterCount = new Set(playerVotes.map(v => v.voterId)).size;

            return {
                id: playerId,
                nickname: player.nickname || player.displayName,
                team: match.teams.gialli.includes(playerId) ? 'gialli' : 'verdi',
                avgMatchVote,
                voterCount
            };
        }).filter(p => p !== null);

        // 2. Ordinamento (Rank di Partita)
        playersStats.sort((a, b) => {
            if (b.avgMatchVote !== a.avgMatchVote) {
                return b.avgMatchVote - a.avgMatchVote; // Voto più alto prima
            }
            return b.voterCount - a.voterCount; // Più voti ricevuti come tie-breaker
        });

        // 3. Media di Squadra
        const getTeamAvg = (teamIds) => {
            const teamPlayers = playersStats.filter(p => teamIds.includes(p.id));
            if (teamPlayers.length === 0) return 0;
            const sumAvg = teamPlayers.reduce((sum, p) => sum + p.avgMatchVote, 0);
            return utils.round(sumAvg / teamPlayers.length, 2);
        };
        
        const teamAverages = {
            gialli: getTeamAvg(match.teams.gialli),
            verdi: getTeamAvg(match.teams.verdi)
        };
        
        return { playersStats, teamAverages };
    }, [match.teams, users, votes, match.id]);
    
    // --- Gestione Risultato (Solo Admin) ---
    const handleSaveScore = async () => {
        if (!currentUser.isAdmin) return;
        
        const scoreG = parseInt(scoreGialli);
        const scoreV = parseInt(scoreVerdi);

        if (isNaN(scoreG) || isNaN(scoreV) || scoreG < 0 || scoreV < 0) {
            setError("I punteggi devono essere numeri interi non negativi.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await storage.updateMatchStatus(match.id, {
                score: {
                    gialli: scoreG,
                    verdi: scoreV
                }
            });
            onMatchUpdate(); 
        } catch (err) {
            setError("Errore nel salvataggio del punteggio: " + err.message);
        } finally {
            setLoading(false);
        }
    };
    
    // Chi ha vinto?
    const winningTeam = match.score ? 
        (match.score.gialli > match.score.verdi ? 'gialli' : 
        (match.score.verdi > match.score.gialli ? 'verdi' : 'draw')) : 'n/a';
        
    // MVP: il primo classificato nel rank
    const mvp = results.playersStats.length > 0 ? results.playersStats[0] : null;

    return (
        <div className="match-results-view">
            <h3>{isVotingPhase ? 'Risultati Parziali' : 'Risultati Finali'} - {utils.formatMatchDateFull(match.date)}</h3>
            
            {/* Box Punteggio */}
            <div className="results-score-box">
                <div className={`results-team team-gialli ${winningTeam === 'gialli' ? 'winner' : ''}`}>
                    <span className="team-name">GIALLI</span>
                    {currentUser.isAdmin && !match.score ? (
                        <input 
                            type="number" 
                            className="score-input" 
                            value={scoreGialli} 
                            onChange={(e) => setScoreGialli(e.target.value)} 
                            min="0"
                        />
                    ) : (
                        <span className="team-score">{match.score?.gialli ?? '?'}</span>
                    )}
                    <span className="team-avg">Avg Rating: {results.teamAverages.gialli.toFixed(2)}</span>
                </div>
                
                <span className="score-divider">-</span>

                <div className={`results-team team-verdi ${winningTeam === 'verdi' ? 'winner' : ''}`}>
                    <span className="team-name">VERDI</span>
                    {currentUser.isAdmin && !match.score ? (
                         <input 
                            type="number" 
                            className="score-input" 
                            value={scoreVerdi} 
                            onChange={(e) => setScoreVerdi(e.target.value)} 
                            min="0"
                        />
                    ) : (
                        <span className="team-score">{match.score?.verdi ?? '?'}</span>
                    )}
                    <span className="team-avg">Avg Rating: {results.teamAverages.verdi.toFixed(2)}</span>
                </div>
            </div>
            
            {currentUser.isAdmin && !match.score && (
                <div className="admin-score-actions">
                    {error && <div className="error-message">{error}</div>}
                    <button 
                        className="button primary small-button" 
                        onClick={handleSaveScore}
                        disabled={loading}
                    >
                        {loading ? 'Salvataggio...' : 'Salva Punteggio'}
                    </button>
                </div>
            )}
            
            {/* MVP (Solo se non è in fase di voto) */}
            {!isVotingPhase && mvp && (
                <div className="results-top-scorer">
                    👑 **MVP della Partita:** {mvp.nickname} (Voto medio: {mvp.avgMatchVote.toFixed(2)})
                </div>
            )}

            {/* Classifica Giocatori (Match Rank) */}
            <div className="mvp-ranking-section">
                <h4>Rank di Partita ({isVotingPhase ? 'Parziale' : 'Finale'})</h4>
                <div className="mvp-ranking">
                    {results.playersStats.map((stat, index) => (
                        <div key={stat.id} className={`mvp-item team-${stat.team} ${index === 0 && !isVotingPhase ? 'is-mvp' : ''}`}>
                            <span className="mvp-rank">#{index + 1}</span>
                            <div className="mvp-player-details">
                                <span className="mvp-player-name">{stat.nickname}</span>
                                <span className="mvp-player-team">Squadra {stat.team}</span>
                            </div>
                            <span className="mvp-vote">
                                Voto Medio: **{stat.avgMatchVote.toFixed(2)}**
                                <span className="voters-count">({stat.voterCount} Voti)</span>
                            </span>
                        </div>
                    ))}
                    {results.playersStats.length === 0 && <p className="empty-state">Nessun dato di voto disponibile.</p>}
                </div>
            </div>
            
        </div>
    );
}

// Esporta tutti i componenti in un unico file
export default { MatchTeamAssignment, MatchVotingInterface, MatchResultView };