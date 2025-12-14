// src/utils.js
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import { getSkillsForPlayer, getShortSkillsForPlayer, DEFAULT_VOTE_VALUE, getFlatSkillListForPlayer } from './constants.js';

// =========================================================================
// FUNZIONI DI CALCOLO E RATING
// =========================================================================

export const utils = {

    /**
     * Arrotonda un numero a N cifre decimali.
     * @param {number} num - Il numero da arrotondare.
     * @param {number} decimals - Il numero di decimali desiderato.
     * @returns {number} Il numero arrotondato.
     */
    round: (num, decimals = 2) => {
        if (typeof num !== 'number' || isNaN(num)) return 0;
        const factor = Math.pow(10, decimals);
        return Math.round(num * factor) / factor;
    },

    /**
     * Conta il numero di voti unici ricevuti dal giocatore.
     * @param {string} playerId - ID del giocatore.
     * @param {Array<object>} votes - Tutti gli oggetti voto.
     * @returns {number} Il conteggio dei voti unici.
     */
    countVotes: (playerId, votes) => {
        // Filtra i voti ricevuti dal giocatore
        const playerVotes = votes.filter(vote => vote.playerId === playerId);
        // Usa un Set per contare gli elettori unici
        const uniqueVoters = new Set(playerVotes.map(vote => vote.voterId));
        return uniqueVoters.size;
    },

    /**
     * Converte un voto da una scala N a una scala base 10 (es. 1-5 a 1-10).
     * @param {number} vote - Il valore del voto (es. 1, 2, 3, 4, 5).
     * @param {number} maxScale - Il valore massimo della scala originale (es. 5).
     * @returns {number} Il voto convertito in base 10.
     */
    toBase10: (vote, maxScale = 5) => {
        // Formula: (voto - min_originale) * (max_nuovo - min_nuovo) / (max_originale - min_originale) + min_nuovo
        // Assumendo scala 1-5 -> 1-10: (vote - 1) * (10 - 1) / (5 - 1) + 1
        const minOriginal = 1;
        const minNew = 1;
        const maxNew = 10;

        if (vote === 0) return 0; // Se il voto è 0, mantiene 0

        return utils.round(((vote - minOriginal) * (maxNew - minNew) / (maxScale - minOriginal)) + minNew);
    },

    /**
     * Calcola le medie di voto per ogni categoria e skill di un giocatore.
     * @param {string} playerId - ID del giocatore.
     * @param {Array<object>} votes - Tutti gli oggetti voto.
     * @param {object} player - L'oggetto giocatore (usato per determinare le skill da Portiere/Campo).
     * @returns {object} Oggetto con le medie (`overall`, `categoryAverages`, `skillAverages`).
     */
    calculateAverages: (playerId, votes, player) => {
        const skillList = getFlatSkillListForPlayer(player);
        const playerVotes = votes.filter(vote => vote.playerId === playerId);
        const uniqueVotersCount = utils.countVotes(playerId, votes);

        if (uniqueVotersCount === 0) {
            // Nessun voto: restituisce tutti 0 o il valore di default
            const defaultAverages = {};
            skillList.forEach(skill => {
                defaultAverages[skill] = DEFAULT_VOTE_VALUE;
            });
            return {
                overall: utils.round(DEFAULT_VOTE_VALUE),
                votersCount: 0,
                categoryAverages: {},
                skillAverages: defaultAverages,
                // Aggiungi un campo per il voto medio di match (se presente)
                matchVoteAverage: DEFAULT_VOTE_VALUE
            };
        }

        // 1. Calcolo Skill Averages (Media per singola skill)
        const skillSums = {};
        const skillCounts = {};

        playerVotes.forEach(vote => {
            Object.entries(vote.ratings || {}).forEach(([skill, rating]) => {
                if (rating && skillList.includes(skill)) {
                    // Rating è già in base 10 (1-10) nel salvataggio, ma se usassimo la scala 1-5, qui andrebbe convertito
                    const finalRating = rating;
                    skillSums[skill] = (skillSums[skill] || 0) + finalRating;
                    skillCounts[skill] = (skillCounts[skill] || 0) + 1;
                }
            });
        });

        const skillAverages = {};
        skillList.forEach(skill => {
            const sum = skillSums[skill] || 0;
            const count = skillCounts[skill] || 0;
            // Se non ha voti per la skill, usa la media del voto generale (matchVote) come fallback logico
            const avg = count > 0 ? sum / count : DEFAULT_VOTE_VALUE;
            skillAverages[skill] = utils.round(avg);
        });

        // 2. Calcolo Categoria Averages
        const fullSkills = getSkillsForPlayer(player);
        const categoryAverages = {};
        let overallSum = 0;
        let overallCount = 0;

        Object.keys(fullSkills).forEach(category => {
            const categorySkills = fullSkills[category];
            let catSum = 0;
            let catCount = 0;

            categorySkills.forEach(skill => {
                const avg = skillAverages[skill];
                if (avg) {
                    catSum += avg;
                    catCount += 1;
                }
            });

            // La media della categoria è la media delle medie delle skill al suo interno
            const catAvg = catCount > 0 ? catSum / catCount : DEFAULT_VOTE_VALUE;
            categoryAverages[category] = utils.round(catAvg);

            // Per l'overall generale, usiamo le medie delle 4 macro-categorie
            overallSum += catAvg;
            overallCount += 1;
        });

        // 3. Calcolo Voto Medio Partita (Media dei voti match ricevuti)
        const matchVotes = playerVotes.map(v => v.matchVote).filter(v => v !== undefined && v !== null);
        const matchVoteSum = matchVotes.reduce((acc, val) => acc + val, 0);
        const matchVoteAverage = matchVotes.length > 0 ? matchVoteSum / matchVotes.length : DEFAULT_VOTE_VALUE;

        // 4. Calcolo Overall Generale
        // L'Overall finale è la media delle 4 categorie (già inclusa nel calcolo sopra)
        const overall = overallCount > 0 ? overallSum / overallCount : DEFAULT_VOTE_VALUE;


        return {
            overall: utils.round(overall),
            votersCount: uniqueVotersCount,
            categoryAverages,
            skillAverages,
            matchVoteAverage: utils.round(matchVoteAverage)
        };
    },

    /**
     * Restituisce la media complessiva arrotondata.
     * @param {object} averages - L'oggetto restituito da calculateAverages.
     * @returns {number} L'Overall arrotondato.
     */
    calculateOverall: (averages) => {
        return utils.round(averages?.overall || DEFAULT_VOTE_VALUE);
    },

    /**
     * Calcola la media per una specifica categoria.
     * @param {string} category - Il nome della categoria (es. 'tecniche').
     * @param {object} averages - L'oggetto restituito da calculateAverages.
     * @returns {number} La media della categoria.
     */
    calculateCategoryOverall: (averages, category, player) => {
        return utils.round(averages?.categoryAverages?.[category] || DEFAULT_VOTE_VALUE);
    },

    // =========================================================================
    // FUNZIONI DI FORMATTAZIONE E UTILITY GENERICHE
    // =========================================================================

    /**
     * Restituisce il nome del giocatore dato il suo ID.
     * @param {string} playerId - ID del giocatore.
     * @param {Array<object>} users - L'array di tutti gli utenti.
     * @returns {string} Il nome visualizzato del giocatore o 'Sconosciuto'.
     */
    getPlayerNameById: (playerId, users) => {
        const player = users.find(u => u.id === playerId);
        return player ? player.displayName : 'Sconosciuto';
    },

    /**
     * Ottiene le iniziali del nome visualizzato.
     * @param {string} name - Il nome visualizzato.
     * @returns {string} Le iniziali.
     */
    getInitials: (name) => {
        if (!name) return '??';
        const parts = name.split(' ');
        if (parts.length > 1) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return parts[0][0].toUpperCase();
    },

    /**
     * Rende icona(e) per indicare il ruolo di Portiere.
     * @param {number} count - Quanti voti da portiere (match giocati in porta)
     * @returns {JSX.Element[]} Un array di span con l'emoji 🧤.
     */
    renderGoalkeeperIcons: (count) => {
        const items = [];
        for (let i = 0; i < Math.min(count, 3); i++) { // Limita a 3 icone per non affollare
            items.push(<span key={i} title="Match giocato in porta" style={{ marginLeft: '4px' }}>🧤</span>);
        }
        if (count > 3) {
            items.push(<span key="plus" title={`${count} match giocati in porta`} style={{ marginLeft: '4px' }}>+{count - 3}</span>);
        }
        return items;
    },

    // --- Formattazione Data/Ora ---

    /**
     * Formatta la data di una partita (es. 'Lun, 12 Dic 2025').
     * @param {string} dateString - Data ISO della partita.
     * @returns {string} Data formattata.
     */
    formatMatchDateFull: (dateString) => {
        if (!dateString) return 'Data Sconosciuta';
        try {
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('it-IT', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }).format(date);
        } catch (e) {
            console.error("Errore formattazione data", e);
            return dateString;
        }
    },

    /**
     * Formatta la data di una partita (es. '12/12/2025').
     * @param {string} dateString - Data ISO della partita.
     * @returns {string} Data formattata breve.
     */
    formatMatchDate: (dateString) => {
        if (!dateString) return 'Sconosciuta';
        try {
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
        } catch (e) {
            return dateString;
        }
    },

    /**
     * Formatta l'orario (es. '20:30').
     * @param {string} dateString - Data ISO della partita.
     * @returns {string} Orario formattato.
     */
    formatTime: (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' }).format(date);
        } catch (e) {
            return '';
        }
    },

    /**
     * Formatta la deadline con testo descrittivo.
     * @param {string} deadlineString - Data ISO della deadline.
     * @returns {string} Testo descrittivo (es. 'Domani alle 18:00').
     */
    formatDeadlineDisplay: (deadlineString) => {
        if (!deadlineString) return 'Nessuna scadenza';
        const deadline = new Date(deadlineString);
        const now = new Date();
        const diffDays = Math.floor((deadline - now) / (1000 * 60 * 60 * 24));
        const time = utils.formatTime(deadlineString);

        if (diffDays === 0) {
            return `Oggi alle ${time}`;
        } else if (diffDays === 1) {
            return `Domani alle ${time}`;
        } else if (diffDays > 1 && diffDays < 7) {
            return new Intl.DateTimeFormat('it-IT', { weekday: 'long' }).format(deadline) + ` alle ${time}`;
        } else {
            return `Scade il ${utils.formatMatchDate(deadlineString)} alle ${time}`;
        }
    },

    /**
     * Formatta la data della deadline per l'input (YYYY-MM-DDTHH:MM).
     * @param {string} dateString - Data ISO della deadline.
     * @returns {string} Data formattata per l'input datetime-local.
     */
    formatDeadline: (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        // Per assicurare che l'input datetime-local funzioni correttamente (locale ISO format)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
};

// Esporta l'oggetto completo
export default utils;