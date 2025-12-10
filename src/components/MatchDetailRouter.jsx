// src/components/MatchDetailRouter.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati


import { MatchVotingInterface, MatchResultView, MatchTeamAssignment } from './Match/MatchDetails.jsx';

import storage from '../storage.js';

const { useEffect, useState } = window.React;

/**
 * Router che visualizza la vista corretta per una partita in base al suo stato.
 * @param {object} match - L'oggetto partita selezionata.
 * @param {object} currentUser - L'utente corrente.
 * @param {Array<object>} users - Lista di tutti gli utenti.
 * @param {Array<object>} votes - Lista di tutti i voti.
 * @param {function} onBack - Callback per tornare alla lista partite.
 * @param {function} onVoteSubmit - Ricarica i dati dopo un voto.
 * @param {function} onRegistrationChange - Ricarica i dati dopo un'iscrizione.
 * @param {function} onMatchUpdate - Ricarica i dati dopo un'azione Admin.
 */
function MatchDetailRouter({ 
    match, 
    currentUser, 
    users, 
    votes, 
    onBack, 
    onVoteSubmit,
    onRegistrationChange,
    onMatchUpdate
}) {
    const [loading, setLoading] = useState(false);
    
    // Controlla e aggiorna lo stato della partita quando il componente è montato
    useEffect(() => {
        const checkStatus = async () => {
            if (!match) return;
            setLoading(true);
            try {
                // storage.checkAndUpdateMatchStatus gestisce l'aggiornamento automatico da 'OPEN' a 'CLOSED'
                const statusChanged = await storage.checkAndUpdateMatchStatus(match);
                if (statusChanged) {
                    onMatchUpdate(); // Se lo stato è cambiato, ricarica tutti i dati
                }
            } catch(e) {
                console.error("Errore check status:", e);
            } finally {
                setLoading(false);
            }
        };
        checkStatus();
    }, [match.id, onMatchUpdate]); // Dipendenza solo da match.id per non ricreare

    if (!match || loading) {
        return (
            <div className="match-detail-loading">
                <button className="button secondary back-button" onClick={onBack}>← Torna alle Partite</button>
                <div className="loading-screen" style={{height: '200px'}}>
                    <div className="spinner"></div>
                    <p>Caricamento dettagli partita...</p>
                </div>
            </div>
        );
    }

    // Funzione helper per l'iscrizione/disiscrizione dalla vista di dettaglio
    const handleToggleParticipation = async (isJoining) => {
        setLoading(true);
        try {
            await storage.toggleMatchParticipation(match.id, currentUser.id, isJoining);
            onRegistrationChange(); 
        } catch (error) {
            alert(`Impossibile ${isJoining ? 'iscriversi' : 'disiscriversi'}. Riprova.`);
            console.error("Errore partecipazione:", error);
        } finally {
            setLoading(false);
        }
    };
    
    // Controlla se l'utente loggato ha partecipato (per il voto/risultati)
    const isParticipant = match.participants && match.participants.includes(currentUser.id);
    const isAdmin = currentUser.isAdmin;

    let content = null;
    let title = '';

    switch (match.status) {
        case 'OPEN':
        case 'CLOSED':
            // Se la partita è aperta o chiusa, l'Admin può assegnare le squadre
            if (isAdmin) {
                title = '🛠️ Assegnazione Squadre (Admin)';
                content = (
                    <MatchTeamAssignment 
                        match={match} 
                        users={users}
                        onMatchUpdate={onMatchUpdate} 
                    />
                );
            } else {
                title = 'Dettagli Partita';
                // Mostra semplicemente i dettagli e l'opzione di iscrizione
                content = (
                    <MatchRegistrationView 
                        match={match} 
                        currentUser={currentUser} 
                        users={users} 
                        onClose={onBack} // Chiudi equivale a tornare indietro
                        onToggleParticipation={handleToggleParticipation}
                        loadingAction={loading}
                    />
                );
            }
            break;

        case 'VOTING':
            title = '🗳️ Vota la Partita';
            if (isAdmin || isParticipant) {
                // Chi può votare vede l'interfaccia di voto
                content = (
                    <MatchVotingInterface 
                        match={match} 
                        users={users} 
                        votes={votes}
                        currentUser={currentUser}
                        onVoteSubmit={onVoteSubmit}
                        onMatchUpdate={onMatchUpdate}
                    />
                );
            } else {
                // Chi non ha partecipato vede i risultati parziali (se presenti) o un messaggio
                title = 'Visualizza Partita';
                content = (
                    <MatchResultView 
                        match={match} 
                        users={users} 
                        votes={votes}
                        isVotingPhase={true} 
                        onMatchUpdate={onMatchUpdate}
                    />
                );
            }
            break;

        case 'COMPLETED':
            title = '✅ Risultati Finali';
            content = (
                <MatchResultView 
                    match={match} 
                    users={users} 
                    votes={votes} 
                    isVotingPhase={false}
                    onMatchUpdate={onMatchUpdate} 
                />
            );
            break;

        default:
            title = 'Stato Partita Sconosciuto';
            content = <div className="info-card">Stato partita non gestito: {match.status}</div>;
    }


    return (
        <div className="match-detail-page">
            <button className="button secondary back-button" onClick={onBack}>← Torna alle Partite</button>
            <h2 className="page-title">{title}</h2>
            
            {/* Se non è in fase OPEN/CLOSED per i non-admin, non mostriamo il wrapper di MatchRegistrationView */}
            {match.status === 'OPEN' || match.status === 'CLOSED' ? 
                (isAdmin ? content : (
                    // Se siamo nella MatchRegistrationView per i non-admin, la mostriamo senza il modal-overlay
                    <div className="page-content-wrapper">{content}</div>
                ))
            : (
                <div className="page-content-wrapper">
                    {content}
                </div>
            )}
        </div>
    );
}

export default MatchDetailRouter;