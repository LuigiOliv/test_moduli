// src/components/MatchesPage.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import utils from '../utils.js';
import storage from '../storage.js';

// 🚨 Importazione Aggiornata: Importa tutti i componenti figli dal modulo Match.jsx
import { MatchCard, MatchRegistrationView, MatchAdminTools } from './Match.jsx';

const { useState } = window.React;

/**
 * Pagina principale che mostra l'elenco delle partite e permette la navigazione.
 * @param {Array<object>} matches - Lista di tutte le partite.
 * @param {object} currentUser - L'utente corrente.
 * @param {Array<object>} users - Lista di tutti gli utenti.
 * @param {function} onSelectMatch - Callback per selezionare una partita e vederne il dettaglio.
 * @param {function} onRefreshData - Callback per ricaricare tutti i dati.
 */
function MatchesPage({ matches, currentUser, users, onSelectMatch, onRefreshData }) {
    const [showRegistrationModal, setShowRegistrationModal] = useState(false);
    const [matchToRegister, setMatchToRegister] = useState(null); // Partita selezionata per la registration/view
    const [loadingAction, setLoadingAction] = useState(false);

    // Filtra le partite in base allo stato
    const upcomingMatches = matches.filter(m => m.status === 'OPEN' || m.status === 'CLOSED');
    const pastMatches = matches.filter(m => m.status === 'VOTING' || m.status === 'COMPLETED');

    /**
     * Gestisce l'iscrizione/disiscrizione di un utente.
     * @param {object} match - La partita target.
     * @param {boolean} isJoining - True se si sta iscrivendo.
     */
    const handleToggleParticipation = async (match, isJoining) => {
        setLoadingAction(true);
        try {
            await storage.toggleMatchParticipation(match.id, currentUser.id, isJoining);
            await onRefreshData(); 
        } catch (error) {
            alert(`Impossibile ${isJoining ? 'iscriversi' : 'disiscriversi'}. Riprova.`);
            console.error("Errore partecipazione:", error);
        } finally {
            setLoadingAction(false);
        }
    };
    
    /**
     * Apre il modale di registrazione (mostra la lista iscritti).
     * @param {object} match - La partita.
     */
    const openRegistrationModal = (match) => {
        setMatchToRegister(match);
        setShowRegistrationModal(true);
    };

    /**
     * Chiude il modale di registrazione.
     */
    const closeRegistrationModal = () => {
        setShowRegistrationModal(false);
        setMatchToRegister(null);
    };

    return (
        <div className="matches-page">
            
            {/* Strumenti Admin: Creazione e Opzioni (Solo per Admin) */}
            {currentUser.isAdmin && (
                <MatchAdminTools 
                    onMatchCreated={onRefreshData} 
                    onRefreshData={onRefreshData} 
                />
            )}

            {/* Partite future/aperte */}
            <h2 className="section-title">🗓️ Prossime Partite ({upcomingMatches.length})</h2>
            <div className="match-list">
                {upcomingMatches.length > 0 ? (
                    upcomingMatches.map(match => (
                        <MatchCard
                            key={match.id}
                            match={match}
                            currentUser={currentUser}
                            users={users}
                            onSelect={() => onSelectMatch(match.id)}
                            onToggleParticipation={handleToggleParticipation}
                            onViewParticipants={() => openRegistrationModal(match)}
                            loadingAction={loadingAction}
                        />
                    ))
                ) : (
                    <div className="info-card empty-state">
                        Nessuna partita futura in programma.
                    </div>
                )}
            </div>

            {/* Partite passate/votabili/completate */}
            <h2 className="section-title past-matches-title">📜 Partite Passate ({pastMatches.length})</h2>
            <div className="match-list">
                {pastMatches.length > 0 ? (
                    pastMatches.map(match => (
                        <MatchCard
                            key={match.id}
                            match={match}
                            currentUser={currentUser}
                            users={users}
                            onSelect={() => onSelectMatch(match.id)}
                            onToggleParticipation={() => {}} // Disabilitato per le partite passate
                            onViewParticipants={() => openRegistrationModal(match)}
                            loadingAction={false}
                        />
                    ))
                ) : (
                    <div className="info-card empty-state">
                        Ancora nessuna partita giocata.
                    </div>
                )}
            </div>

            {/* Modale di Registrazione/Visualizzazione Iscritti */}
            {showRegistrationModal && matchToRegister && (
                <MatchRegistrationView
                    match={matchToRegister}
                    currentUser={currentUser}
                    users={users}
                    onClose={closeRegistrationModal}
                    onToggleParticipation={handleToggleParticipation}
                    loadingAction={loadingAction}
                />
            )}
        </div>
    );
}

export default MatchesPage;