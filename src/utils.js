// src/utils.js
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import { SKILLS, SKILLS_GOALKEEPER, getSkillsForPlayer } from './constants.js';

const utils = {
    calculateAverages: (playerId, votes, player) => {
        const playerVotes = votes.filter(v => v.playerId === playerId);
        if (playerVotes.length === 0) return null;
        const averages = {};
        const skills = player ? getSkillsForPlayer(player) : SKILLS;
        const allSkills = [...skills.tecniche, ...skills.tattiche, ...skills.fisiche];
        allSkills.forEach(skill => {
            const values = playerVotes.map(v => v.ratings[skill]).filter(v => v !== undefined);
            if (values.length > 0) {
                averages[skill] = values.reduce((a, b) => a + b, 0) / values.length;
            }
        });
        return averages;
    },

    calculateOverall: (averages) => {
        if (!averages) return null;
        const values = Object.values(averages);
        if (values.length === 0) return null;
        return values.reduce((a, b) => a + b, 0) / values.length;
    },

    calculateCategoryOverall: (averages, category, player) => {
        if (!averages) return null;
        const skills = player ? getSkillsForPlayer(player) : SKILLS;
        const categorySkills = skills[category];
        const values = categorySkills.map(s => averages[s]).filter(v => v !== undefined);
        if (values.length === 0) return null;
        return values.reduce((a, b) => a + b, 0) / values.length;
    },

    countVotes: (playerId, votes) => {
        return votes.filter(v => v.playerId === playerId).length;
    },

    toBase10: (value) => {
        return (value / 4) * 10;
    },

    getInitials: (name) => {
        if (!name) return '??';
        return name.substring(0, 2).toUpperCase();
    },
    // ============================================================================
    // FORMULA-BASED CLASSIFICATION SYSTEM
    // ============================================================================

    /**
     * Recupera lo storico delle partite completate per un giocatore
     */
    getPlayerMatchHistory: (playerId, matches) => {
        if (!matches || matches.length === 0) return [];

        return matches
            .filter(match => {
                if (match.status !== 'COMPLETED') return false;
                const gialliPlayers = match.teams?.gialli || [];
                const verdiPlayers = match.teams?.verdi || [];
                // OLD: return gialliPlayers.includes(playerId) || verdiPlayers.includes(playerId);
                // NEW: Check if player object exists in team arrays
                return gialliPlayers.some(p => p.playerId === playerId) ||
                    verdiPlayers.some(p => p.playerId === playerId);
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },

    /**
     * Calcola il rendimento recente (media delle ultime N partite)
     * Ritorna null se il giocatore ha meno di minMatches partite
     */
    calculatePerformance: (playerId, matchHistory, matchVotes, recentCount = 5, minMatches = 5) => {
        if (!matchHistory || matchHistory.length < minMatches) {
            return null; // Performance = 0 contribution
        }

        const recentMatches = matchHistory.slice(0, recentCount);
        const ratings = [];

        recentMatches.forEach(match => {
            const matchVoteData = matchVotes.find(mv => mv.matchId === match.id);
            if (!matchVoteData || !matchVoteData.votes) return;

            Object.values(matchVoteData.votes).forEach(voterVotes => {
                if (voterVotes[playerId]?.rating) {
                    ratings.push(voterVotes[playerId].rating);
                }
            });
        });

        if (ratings.length === 0) return null;
        return ratings.reduce((a, b) => a + b, 0) / ratings.length;
    },

    /**
     * Calcola la costanza (quante partite giocate delle ultime N)
     */
    calculateConsistency: (matchHistory, windowSize = 10) => {
        if (!matchHistory || matchHistory.length === 0) return 0;
        const matchesPlayed = Math.min(matchHistory.length, windowSize);
        return matchesPlayed / windowSize;
    },

    /**
     * Calcola l'overall usando la formula ponderata
     * Formula: new_vote = (current_vote * x) + (performance * y) + (consistency * z)
     */
    calculateFormulaBasedOverall: (averages, playerId, matches, matchVotes, formula) => {
        const currentVote = utils.calculateOverall(averages);
        if (!currentVote) return null;

        const matchHistory = utils.getPlayerMatchHistory(playerId, matches);
        const performance = utils.calculatePerformance(
            playerId,
            matchHistory,
            matchVotes,
            formula.RECENT_MATCHES_FOR_PERFORMANCE,
            formula.MIN_MATCHES_FOR_PERFORMANCE
        );
        const consistency = utils.calculateConsistency(matchHistory, formula.CONSISTENCY_WINDOW);

        // Converti currentVote in scala 1-10
        const currentVote10 = utils.toBase10(currentVote);

        // Performance contribution (già in scala 1-10, o 0 se null)
        const performanceContribution = performance !== null
            ? performance * formula.PERFORMANCE_WEIGHT
            : 0;

        // Consistency in scala 1-10
        const consistencyContribution = (consistency * 10) * formula.CONSISTENCY_WEIGHT;

        // Calcola voto finale in scala 1-10
        const finalVote = (currentVote10 * formula.CURRENT_WEIGHT) +
            performanceContribution +
            consistencyContribution;

        // Riconverti in scala 1-4 per compatibilità
        return (finalVote / 10) * 4;
    },

    // ============================================================================
    // GENERAZIONE ID GIOCATORI
    // ============================================================================

    generatePlayerId: (users) => {
        const today = new Date();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        const datePrefix = `player${month}${year}`; // Es: player122025

        // Trova tutti gli ID che iniziano con questo prefisso
        const todayPlayers = users.filter(u => u.id.startsWith(datePrefix));

        // Estrai i numeri progressivi esistenti
        const existingNumbers = todayPlayers
            .map(u => {
                const match = u.id.match(/_(\d+)$/); // Estrai numero dopo _
                return match ? parseInt(match[1]) : 0;
            })
            .filter(n => !isNaN(n));

        // Calcola il prossimo numero
        const nextNumber = existingNumbers.length > 0
            ? Math.max(...existingNumbers) + 1
            : 1;

        return `${datePrefix}_${nextNumber}`;
    },

    // ============================================================================
    // HELPER FUNCTIONS PER PARTITE
    // ============================================================================

    formatMatchDate: (dateString) => {
        const date = new Date(dateString);
        const giorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
        const mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
            'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
        return `${giorni[date.getDay()]} ${date.getDate()} ${mesi[date.getMonth()]}`;
    },

    formatMatchDateFull: (dateString) => {
        const date = new Date(dateString);
        const giorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
        const mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
            'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
        return `${giorni[date.getDay()]} ${date.getDate()} ${mesi[date.getMonth()]} ${date.getFullYear()}`;
    },

    formatTime: (dateString) => {
        const date = new Date(dateString);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    },

    formatDeadlineDisplay: (dateString) => {
        const date = new Date(dateString);
        const giorni = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
        const mesi = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
            'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
        return `${giorni[date.getDay()]} ${date.getDate()} ${mesi[date.getMonth()]}`;
    },

    formatDeadline: (dateString) => {
        const date = new Date(dateString);
        const giorni = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
        const day = date.getDate();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${giorni[date.getDay()]} ${day}, ${hours}:${minutes}`;
    },

    renderGoalkeeperIcons: (count) => {
        if (count === 0) return '';
        if (count === 1) return '🧤';
        return '🧤🧤';
    },

    getPlayerNameById: (playerId, users) => {
        if (users && users.length > 0) {
            const player = users.find(u => u.id === playerId);
            if (player) return player.name;
        }
        return playerId;
    },

    countPlayerMatches: (playerId, matches) => {
        if (!matches || matches.length === 0) return 0;

        return matches.filter(match => {
            if (match.status !== 'COMPLETED') return false;
            const gialliPlayers = match.teams?.gialli || [];
            const verdiPlayers = match.teams?.verdi || [];
            return gialliPlayers.some(p => p.playerId === playerId) ||
                verdiPlayers.some(p => p.playerId === playerId);
        }).length;
    }
};

export default utils;