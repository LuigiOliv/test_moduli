// src/storage.js
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import { db } from './firebase.js';

const storage = {
    getUsers: async () => {
        const snapshot = await db.collection('users').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    setUsers: async (users) => {
        const batch = db.batch();
        users.forEach(user => {
            const ref = db.collection('users').doc(user.id);
            batch.set(ref, user);
        });
        await batch.commit();
    },
    updateUser: async (user) => {
        await db.collection('users').doc(user.id).set(user);
    },
    getVotes: async () => {
        const snapshot = await db.collection('votes').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    addVote: async (vote) => {
        await db.collection('votes').add(vote);
    },
    setVotes: async (votes) => {
        const batch = db.batch();
        votes.forEach((vote, index) => {
            const ref = db.collection('votes').doc(`vote_${Date.now()}_${index}`);
            batch.set(ref, vote);
        });
        await batch.commit();
    },
    getCurrentUser: () => {
        const user = localStorage.getItem('calcetto_current_user');
        return user ? JSON.parse(user) : null;
    },
    setCurrentUser: (user) => {
        if (user) {
            localStorage.setItem('calcetto_current_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('calcetto_current_user');
        }
    },
    clearAll: () => {
        localStorage.removeItem('calcetto_current_user');
    },
    getMatches: async () => {
        const snapshot = await db.collection('matches')
            .orderBy('date', 'desc')
            .limit(20)
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    getMatch: async (matchId) => {
        const doc = await db.collection('matches').doc(matchId).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    },
    createMatch: async (matchData) => {
        const ref = await db.collection('matches').add({
            ...matchData,
            status: 'OPEN',
            teams: { gialli: [], verdi: [] },
            score: null,
            topScorer: null,
            topScorerGoals: null,
            createdAt: Date.now()
        });
        return ref.id;
    },
    updateMatch: async (matchId, updates) => {
        await db.collection('matches').doc(matchId).update(updates);
    },

    deleteMatch: async (matchId) => {
        const batch = db.batch();

        // Cancella registrations (sotto-collezione)
        const regs = await db.collection('matches')
            .doc(matchId)
            .collection('registrations')
            .get();
        regs.forEach(doc => batch.delete(doc.ref));

        // Cancella match_votes (sotto-collezione)
        const votes = await db.collection('matches')
            .doc(matchId)
            .collection('match_votes')
            .get();
        votes.forEach(doc => batch.delete(doc.ref));

        // Cancella match
        batch.delete(db.collection('matches').doc(matchId));

        await batch.commit();
    },

    // ============================================================================
    // FUNZIONI REGISTRATIONS
    // ============================================================================

    getRegistrations: async (matchId) => {
        const snapshot = await db.collection('matches')
            .doc(matchId)
            .collection('registrations')
            .get();
        const registrations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Ordina lato client per evitare indice composito
        return registrations.sort((a, b) => a.registeredAt - b.registeredAt);
    },

    registerPlayer: async (matchId, player) => {
        await db.collection('matches')
            .doc(matchId)
            .collection('registrations')
            .doc(player.id)
            .set({
                playerId: player.id,
                playerName: player.name,
                isGoalkeeper: player.isGoalkeeper || false,
                registeredAt: Date.now(),
                registeredBy: player.id
            });
    },

    registerPlayerByAdmin: async (matchId, player, adminId) => {
        await db.collection('matches')
            .doc(matchId)
            .collection('registrations')
            .doc(player.id)
            .set({
                playerId: player.id,
                playerName: player.name,
                isGoalkeeper: player.isGoalkeeper || false,
                registeredAt: Date.now(),
                registeredBy: adminId
            });
    },

    unregisterPlayer: async (matchId, playerId) => {
        await db.collection('matches')
            .doc(matchId)
            .collection('registrations')
            .doc(playerId)
            .delete();
    },

    // ============================================================================
    // FUNZIONI MATCH_VOTES
    // ============================================================================

    getMatchVotes: async (matchId) => {
        const snapshot = await db.collection('matches')
            .doc(matchId)
            .collection('match_votes')
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    getMyMatchVote: async (matchId, voterId) => {
        const doc = await db.collection('matches')
            .doc(matchId)
            .collection('match_votes')
            .doc(voterId)
            .get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    },

    saveMatchVote: async (matchId, voterId, voterTeam, votes) => {
        await db.collection('matches')
            .doc(matchId)
            .collection('match_votes')
            .doc(voterId)
            .set({
                voterId,
                voterTeam,
                votes,
                submittedAt: Date.now(),
                lastModifiedAt: Date.now()
            });
    },

    updateMatchVote: async (matchId, voterId, votes) => {
        await db.collection('matches')
            .doc(matchId)
            .collection('match_votes')
            .doc(voterId)
            .update({
                votes,
                lastModifiedAt: Date.now()
            });
    },

    checkAndUpdateMatchStatus: async (match) => {
        if (!match) return match;

        // Rispetta override manuale admin
        if (match.manualOverride && match.manualOverrideUntil) {
            if (Date.now() < match.manualOverrideUntil) {
                console.log(`🛡️ Manual override attivo fino a ${new Date(match.manualOverrideUntil).toLocaleString()}`);
                console.log(`🛡️ Salto auto-update per match ${match.id}`);
                return match;
            } else {
                console.log(`⏰ Manual override scaduto, rimuovo flag`);
                await db.collection('matches').doc(match.id).update({
                    manualOverride: false,
                    manualOverrideUntil: null
                });
            }
        }

        const now = new Date();
        const matchDate = new Date(match.date);
        const votingDeadline = new Date(match.votingDeadline);

        let newStatus = match.status;
        let needsUpdate = false;

        // OPEN → CLOSED: 50 minuti prima della partita
        if (match.status === 'OPEN') {
            const closingTime = new Date(matchDate.getTime() - 50 * 60 * 1000);
            if (now >= closingTime) {
                newStatus = 'CLOSED';
                needsUpdate = true;
            }
        }

        // CLOSED → VOTING: 2 ore dopo la partita (solo se ci sono squadre E risultato)
        if (match.status === 'CLOSED') {
            const votingOpenTime = new Date(matchDate.getTime() + 2 * 60 * 60 * 1000);
            const hasTeams = match.teams &&
                match.teams.gialli &&
                match.teams.gialli.length > 0 &&
                match.teams.verdi &&
                match.teams.verdi.length > 0;
            const hasScore = match.score &&
                match.score.gialli !== null &&
                match.score.verdi !== null;

            if (now >= votingOpenTime && hasTeams && hasScore) {
                newStatus = 'VOTING';
                needsUpdate = true;
            }
        }

        // VOTING → COMPLETED: quando passa la deadline (6 giorni dopo partita)
        if (match.status === 'VOTING') {
            if (now >= votingDeadline) {
                newStatus = 'COMPLETED';
                needsUpdate = true;
            }
        }

        // Aggiorna se necessario
        if (needsUpdate) {
            await db.collection('matches').doc(match.id).update({ status: newStatus });
            return { ...match, status: newStatus };
        }

        return match;
    }
};

export default storage;