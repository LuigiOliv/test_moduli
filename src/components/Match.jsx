// src/components/Match.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import utils from '../utils.js';
import storage from '../storage.js';

const { useState, useMemo } = window.React;

// =========================================================================
// 1. MATCH CARD (Scheda Partita Singola)
// =========================================================================

/**
 * Componente per la singola scheda di una partita (usato in MatchesPage).
 * [Logica copiata dal precedente MatchCard.jsx]
 */
export function MatchCard({ 
    match, 
    currentUser, 
    users, 
    onSelect, 
    onToggleParticipation, 
    onViewParticipants,
    loadingAction 
}) {
    
    // --- Variabili Derivate ---
    const isRegistered = match.participants && match.participants.includes(currentUser.id);
    const participantCount = match.participants ? match.participants.length : 0;
    const maxPlayers = match.maxPlayers || 10;
    const isFull = participantCount >= maxPlayers;
    const matchTime = utils.formatTime(match.date);
    const statusClass = match.status.toLowerCase();

    // ... (Logica voteStatus rimane invariata) ...
    const voteStatus = useMemo(() => {
        if (match.status !== 'VOTING') return null;
        const isParticipant = match.participants && match.participants.includes(currentUser.id);
        return { 
            canVote: isParticipant, 
            voted: false 
        };
    }, [match, currentUser.id]);

    // --- Logica Pulsanti di Azione ---
    const renderActionButton = () => {
        if (loadingAction) {
            return (
                <button className={`button action-button loading`} disabled>
                    Caricamento...
                </button>
            );
        }

        switch (match.status) {
            case 'OPEN':
                if (isRegistered) {
                    return (
                        <button 
                            className="button secondary action-button" 
                            onClick={(e) => { e.stopPropagation(); onToggleParticipation(match, false); }}
                        >
                            Disiscriviti
                        </button>
                    );
                } else if (isFull) {
                    return (
                        <button 
                            className="button disabled action-button full" 
                            disabled
                        >
                            Piena (Posti: {participantCount}/{maxPlayers})
                        </button>
                    );
                } else {
                    return (
                        <button 
                            className="button primary action-button" 
                            onClick={(e) => { e.stopPropagation(); onToggleParticipation(match, true); }}
                        >
                            Iscriviti ({participantCount}/{maxPlayers})
                        </button>
                    );
                }

            case 'CLOSED':
                // ... (Logica CLOSED)
                return (
                    <button 
                        className="button secondary action-button" 
                        onClick={(e) => { e.stopPropagation(); onViewParticipants(); }}
                    >
                        Iscrizioni Chiuse ({participantCount} iscritti)
                    </button>
                );

            case 'VOTING':
                // ... (Logica VOTING)
                if (voteStatus.canVote) {
                    return (
                        <button 
                            className={`button ${voteStatus.voted ? 'success' : 'primary'} action-button`} 
                            onClick={onSelect}
                        >
                            {voteStatus.voted ? 'Voto Inviato' : 'Vota ora!'}
                        </button>
                    );
                }
                return (
                    <button 
                        className="button secondary action-button" 
                        onClick={onSelect}
                    >
                        Visualizza Partita
                    </button>
                );

            case 'COMPLETED':
                // ... (Logica COMPLETED)
                return (
                    <button 
                        className="button secondary action-button" 
                        onClick={onSelect}
                    >
                        Vedi Risultati
                    </button>
                );

            default:
                // ... (Logica default)
                return (
                    <button 
                        className="button disabled action-button" 
                        disabled
                    >
                        Stato Sconosciuto
                    </button>
                );
        }
    };

    return (
        <div 
            className={`match-card status-${statusClass} ${isRegistered ? 'registered' : ''}`}
            onClick={onSelect}
        >
            <div className="match-card-header">
                <span className="match-date">{utils.formatMatchDateFull(match.date)}</span>
                <span className={`match-status-tag status-tag-${statusClass}`}>
                    {match.status}
                </span>
            </div>

            <div className="match-card-details">
                {/* ... (Dettagli partita) ... */}
                <div className="match-time-location">
                    🕒 {matchTime} @ {match.location || 'Campo non specificato'}
                </div>
                
                {match.status === 'COMPLETED' && match.score && (
                    <div className="match-score-summary">
                        <span className="team-gialli">Gialli {match.score.gialli}</span>
                        <span className="score-divider">-</span>
                        <span className="team-verdi">Verdi {match.score.verdi}</span>
                    </div>
                )}
                
                <div className="match-participants" onClick={(e) => { e.stopPropagation(); onViewParticipants(); }}>
                    👥 Iscritti: {participantCount}
                    {participantCount > 0 && 
                        <span className="participant-names">
                            ({match.participants.slice(0, 3).map(id => users.find(u => u.id === id)?.nickname || utils.getInitials(users.find(u => u.id === id)?.displayName || id)).join(', ')})
                        </span>
                    }
                </div>
            </div>

            <div className="match-card-actions">
                {['OPEN', 'CLOSED'].includes(match.status) && (
                    <div className="match-deadline">
                        {match.status === 'OPEN' ? `Iscrizioni: ${utils.formatDeadlineDisplay(match.deadline)}` : 'Iscrizioni chiuse.'}
                    </div>
                )}
                {renderActionButton()}
            </div>
        </div>
    );
}

// =========================================================================
// 2. MATCH REGISTRATION VIEW (Modale/Vista Iscritti)
// =========================================================================

/**
 * Modale per visualizzare l'elenco degli iscritti e gestire l'iscrizione/disiscrizione.
 * @param {object} match - La partita.
 * @param {object} currentUser - L'utente corrente.
 * @param {Array<object>} users - Lista di tutti gli utenti.
 * @param {function} onClose - Callback per chiudere la modale.
 * @param {function} onToggleParticipation - Callback per iscriversi/disiscriversi.
 * @param {boolean} loadingAction - Stato di caricamento.
 */
export function MatchRegistrationView({ 
    match, 
    currentUser, 
    users, 
    onClose, 
    onToggleParticipation,
    loadingAction
}) {
    const isRegistered = match.participants && match.participants.includes(currentUser.id);
    const participantCount = match.participants ? match.participants.length : 0;
    const maxPlayers = match.maxPlayers || 10;
    const isFull = participantCount >= maxPlayers;
    
    // Funzione per ottenere la lista degli iscritti con i dati utente
    const getParticipants = () => {
        if (!match.participants) return [];
        // Filtra e mappa, assicurandosi che gli utenti esistano
        return match.participants
            .map(id => users.find(u => u.id === id))
            .filter(u => u !== undefined);
    };
    
    const participants = getParticipants();
    
    // Controlla se l'iscrizione è ancora aperta (prima della deadline)
    const isRegistrationOpen = match.status === 'OPEN';

    const handleToggle = () => {
        onToggleParticipation(match, !isRegistered);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-registration" onClick={(e) => e.stopPropagation()}>
                <h2>👥 Iscritti per {utils.formatMatchDateFull(match.date)}</h2>
                
                <p className="registration-status">
                    Posti: **{participantCount} / {maxPlayers}** - 
                    {isRegistrationOpen ? (
                        <span> Iscrizioni aperte fino a {utils.formatDeadlineDisplay(match.deadline)}</span>
                    ) : (
                        <span className="closed"> Iscrizioni chiuse.</span>
                    )}
                </p>

                <div className="participants-list-container">
                    {participants.map((player, index) => (
                        <div key={player.id} className="participant-item">
                            <span className="participant-rank">#{index + 1}</span>
                            <span className="participant-name">{player.nickname || player.displayName}</span>
                            {player.id === currentUser.id && <span className="tag me">Tu</span>}
                        </div>
                    ))}
                    
                    {participants.length === 0 && (
                        <div className="empty-list-message">Nessun iscritto ancora. Sii il primo!</div>
                    )}
                </div>

                <div className="modal-actions">
                    <button className="button secondary" onClick={onClose}>
                        Chiudi
                    </button>
                    
                    {isRegistrationOpen && (
                        <button 
                            className={`button ${isRegistered ? 'red' : 'primary'}`}
                            onClick={handleToggle}
                            disabled={loadingAction || (!isRegistered && isFull)}
                        >
                            {loadingAction ? '...' : 
                             isRegistered ? 'Disiscriviti' : 
                             isFull ? 'Piena' : 'Iscriviti'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// =========================================================================
// 3. MATCH ADMIN TOOLS (Creazione e Gestione Rapida)
// =========================================================================

/**
 * Componente per gli strumenti amministrativi (Creazione Nuova Partita).
 * @param {function} onMatchCreated - Callback per ricaricare i dati dopo la creazione.
 * @param {function} onRefreshData - Callback per ricaricare tutti i dati.
 */
export function MatchAdminTools({ onMatchCreated, onRefreshData }) {
    const [isCreating, setIsCreating] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Calcola la data/ora predefinita (Giovedì prossimo, 20:30)
    const getDefaultDateTime = () => {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0=Dom, 4=Gio
        const daysUntilThursday = (4 - dayOfWeek + 7) % 7;
        
        const nextThursday = new Date(now);
        nextThursday.setDate(now.getDate() + daysUntilThursday);
        nextThursday.setHours(20, 30, 0, 0); // 20:30

        return utils.formatDeadline(nextThursday.toISOString());
    };
    
    // Calcola la deadline di iscrizione (mercoledì 18:00)
    const getDefaultDeadline = (matchDateString) => {
        const matchDate = new Date(matchDateString);
        // Scadenza: 1 giorno prima, alle 18:00
        const deadline = new Date(matchDate.getTime() - 1 * 24 * 60 * 60 * 1000); 
        deadline.setHours(18, 0, 0, 0); 
        return utils.formatDeadline(deadline.toISOString());
    };

    const defaultMatchDateTime = getDefaultDateTime();
    const defaultDeadline = getDefaultDeadline(defaultMatchDateTime);

    const [date, setDate] = useState(defaultMatchDateTime);
    const [deadline, setDeadline] = useState(defaultDeadline);
    const [maxPlayers, setMaxPlayers] = useState(10);
    const [location, setLocation] = useState('Calcetto');

    const handleCreateMatch = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const newMatch = {
            date: date,
            deadline: deadline,
            maxPlayers: parseInt(maxPlayers),
            location: location.trim(),
            status: 'OPEN',
            participants: [],
            teams: null,
            score: null,
            createdAt: new Date().toISOString()
        };

        try {
            await storage.createMatch(newMatch);
            // Resetta lo stato del form e chiude
            setIsCreating(false);
            setDate(getDefaultDateTime());
            setDeadline(getDefaultDeadline(getDefaultDateTime()));
            alert("Partita creata con successo!");
            onMatchCreated(); // Ricarica i dati in App.jsx
        } catch (err) {
            setError("Errore nella creazione della partita: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-tools-container">
            <h3 className="section-title">Strumenti Admin</h3>
            <div className="admin-actions">
                <button 
                    className="button primary small-button" 
                    onClick={() => setIsCreating(!isCreating)}
                >
                    {isCreating ? '❌ Annulla Creazione' : '➕ Crea Nuova Partita'}
                </button>
                 <button 
                    className="button secondary small-button" 
                    onClick={onRefreshData}
                >
                    🔄 Ricarica Dati
                </button>
            </div>
            
            {isCreating && (
                <form className="create-match-form" onSubmit={handleCreateMatch}>
                    <h4>Nuovo Match</h4>
                    {error && <div className="error-message">{error}</div>}
                    
                    <div className="form-row">
                        <label>
                            Data & Ora Partita:
                            <input 
                                type="datetime-local" 
                                value={date} 
                                onChange={(e) => {
                                    setDate(e.target.value);
                                    // Aggiorna la deadline automaticamente
                                    setDeadline(getDefaultDeadline(e.target.value)); 
                                }} 
                                required 
                            />
                        </label>
                        <label>
                            Max Giocatori:
                            <input 
                                type="number" 
                                value={maxPlayers} 
                                onChange={(e) => setMaxPlayers(e.target.value)} 
                                min="6" 
                                max="20" 
                                required 
                            />
                        </label>
                    </div>
                    
                    <label>
                        Deadline Iscrizioni:
                        <input 
                            type="datetime-local" 
                            value={deadline} 
                            onChange={(e) => setDeadline(e.target.value)} 
                            required 
                        />
                    </label>
                    
                    <label>
                        Luogo:
                        <input 
                            type="text" 
                            value={location} 
                            onChange={(e) => setLocation(e.target.value)} 
                            placeholder="Nome del campo"
                        />
                    </label>

                    <button type="submit" className="button primary" disabled={loading}>
                        {loading ? 'Creazione...' : 'Conferma Partita'}
                    </button>
                </form>
            )}
        </div>
    );
}