// src/storage.js
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

// =========================================================================
// INIZIALIZZAZIONE
// =========================================================================

// La variabile 'db' è esposta globalmente in index.html dopo l'inizializzazione di Firebase.
// Assicurati che 'window.db' sia disponibile.
const db = window.db; 
const auth = firebase.auth(); 

/**
 * Funzione di utilità per gestire gli errori Firestore.
 */
const handleError = (action, error) => {
    console.error(`Errore durante ${action}:`, error);
    // Qui puoi aggiungere logica per mostrare un messaggio di errore all'utente se necessario
    throw new Error(`Impossibile completare l'azione di ${action}.`);
};

// =========================================================================
// OGGETTO PRINCIPALE STORAGE
// =========================================================================

export const storage = {

    // --- UTENTI (Firestore) ---

    /**
     * Recupera tutti gli utenti dal database.
     * @returns {Promise<Array>} Lista di oggetti utente.
     */
    getUsers: async () => {
        try {
            const snapshot = await db.collection('users').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            handleError('il recupero degli utenti', error);
        }
    },

    /**
     * Aggiorna un utente esistente (o ne crea uno se non esiste).
     * @param {object} user - L'oggetto utente da aggiornare.
     */
    updateUser: async (user) => {
        try {
            await db.collection('users').doc(user.id).set(user, { merge: true });
        } catch (error) {
            handleError('l\'aggiornamento dell\'utente', error);
        }
    },

    /**
     * Controlla se un utente esiste e lo aggiunge se non trovato.
     * @param {object} firebaseUser - L'oggetto utente restituito da Firebase Auth.
     * @returns {Promise<object>} L'oggetto utente pulito e aggiornato.
     */
    checkAndAddUser: async (firebaseUser) => {
        try {
            const docRef = db.collection('users').doc(firebaseUser.uid);
            const doc = await docRef.get();

            if (doc.exists) {
                // Utente esistente: aggiorna l'ultimo login
                const userData = doc.data();
                await docRef.update({
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
                return { id: doc.id, ...userData };
            } else {
                // Nuovo utente: crea il profilo base
                const newUser = {
                    id: firebaseUser.uid,
                    displayName: firebaseUser.displayName || 'Nuovo Giocatore',
                    email: firebaseUser.email,
                    isAdmin: false, // Default: non admin
                    isGoalkeeper: false,
                    role: 'Universale',
                    avatarUrl: firebaseUser.photoURL || '',
                    registrationDate: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                };
                await docRef.set(newUser);
                return newUser;
            }
        } catch (error) {
            handleError('la verifica e l\'aggiunta dell\'utente', error);
        }
    },

    // --- PARTITE (Matches - Firestore) ---

    /**
     * Recupera tutte le partite dal database, ordinate per data.
     * @returns {Promise<Array>} Lista di oggetti partita.
     */
    getMatches: async () => {
        try {
            const snapshot = await db.collection('matches')
                .orderBy('date', 'desc')
                .get();
            return snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(),
                date: doc.data().date instanceof firebase.firestore.Timestamp ? doc.data().date.toDate().toISOString() : doc.data().date
            }));
        } catch (error) {
            handleError('il recupero delle partite', error);
        }
    },

    /**
     * Crea una nuova partita nel database.
     * @param {object} match - L'oggetto partita da salvare.
     */
    createMatch: async (match) => {
        try {
            // Conversione della data in Timestamp se necessario, o assicurati che sia stringa ISO
            const dateToSave = match.date instanceof Date ? firebase.firestore.Timestamp.fromDate(match.date) : match.date;

            const docRef = await db.collection('matches').add({
                ...match,
                date: dateToSave
            });
            return docRef.id;
        } catch (error) {
            handleError('la creazione della partita', error);
        }
    },

    /**
     * Aggiorna lo stato di una partita nel database.
     * @param {string} matchId - ID della partita.
     * @param {object} data - Dati da aggiornare.
     */
    updateMatchStatus: async (matchId, data) => {
        try {
            await db.collection('matches').doc(matchId).update(data);
        } catch (error) {
            handleError('l\'aggiornamento dello stato della partita', error);
        }
    },

    /**
     * Elimina una partita dal database.
     * @param {string} matchId - ID della partita da eliminare.
     */
    deleteMatch: async (matchId) => {
        try {
            await db.collection('matches').doc(matchId).delete();
        } catch (error) {
            handleError('l\'eliminazione della partita', error);
        }
    },

    /**
     * Controlla la scadenza e aggiorna lo stato della partita se la deadline è passata.
     * @param {object} match - L'oggetto partita da controllare.
     */
    checkAndUpdateMatchStatus: async (match) => {
        if (match.status === 'open' && match.deadline) {
            const deadlineDate = new Date(match.deadline);
            const now = new Date();

            if (now > deadlineDate) {
                try {
                    console.log(`Aggiornamento stato partita ${match.id}: chiusura iscrizioni.`);
                    await db.collection('matches').doc(match.id).update({
                        status: 'closed'
                    });
                    // Ritorna true per indicare che c'è stato un cambiamento e l'interfaccia deve aggiornarsi
                    return true;
                } catch (error) {
                    handleError('l\'aggiornamento automatico dello stato', error);
                }
            }
        }
        return false;
    },

    /**
     * Iscrive/Disiscrive un utente ad una partita.
     * @param {string} matchId - ID della partita.
     * @param {string} userId - ID dell'utente.
     * @param {boolean} isJoining - True per iscrivere, False per disiscrivere.
     */
    toggleMatchParticipation: async (matchId, userId, isJoining) => {
        try {
            const matchRef = db.collection('matches').doc(matchId);
            const field = 'participants';
            
            const updateData = {};
            if (isJoining) {
                updateData[field] = firebase.firestore.FieldValue.arrayUnion(userId);
            } else {
                updateData[field] = firebase.firestore.FieldValue.arrayRemove(userId);
            }

            await matchRef.update(updateData);
        } catch (error) {
            handleError('l\'iscrizione/disiscrizione alla partita', error);
        }
    },


    // --- VOTI (Votes - Firestore) ---

    /**
     * Recupera tutti i voti dal database.
     * @returns {Promise<Array>} Lista di oggetti voto.
     */
    getVotes: async () => {
        try {
            const snapshot = await db.collection('votes').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            handleError('il recupero dei voti', error);
        }
    },

    /**
     * Salva un nuovo voto o aggiorna uno esistente.
     * @param {object} voteData - I dati del voto.
     * @param {string} matchId - ID della partita.
     * @param {string} voterId - ID dell'elettore.
     * @param {string} votedPlayerId - ID del giocatore votato.
     */
    saveVote: async (voteData, matchId, voterId, votedPlayerId) => {
        try {
            // ID unico per il voto: matchId_voterId_votedPlayerId
            const voteId = `${matchId}_${voterId}_${votedPlayerId}`;
            
            const fullVoteData = {
                ...voteData,
                matchId,
                voterId,
                votedPlayerId,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('votes').doc(voteId).set(fullVoteData);
        } catch (error) {
            handleError('il salvataggio del voto', error);
        }
    },

    // --- AUTH E LOCAL STORAGE ---
    
    /**
     * Gestisce il login dell'utente (usando Google Sign-In) e aggiorna il profilo.
     * @returns {Promise<object>} L'oggetto utente autenticato.
     */
    handleLogin: async () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            const result = await auth.signInWithPopup(provider);
            const firebaseUser = result.user;
            const user = await storage.checkAndAddUser(firebaseUser);
            storage.setCurrentUser(user);
            return user;
        } catch (error) {
            handleError('il login con Google', error);
        }
    },

    /**
     * Gestisce il logout dell'utente.
     */
    handleLogout: async () => {
        try {
            await auth.signOut();
            localStorage.removeItem('calcetto_current_user');
            // Necessario un ricaricamento della pagina o un aggiornamento dello stato in App.jsx
        } catch (error) {
            handleError('il logout', error);
        }
    },
    
    /**
     * Recupera l'utente corrente da localStorage.
     * @returns {object|null} L'oggetto utente o null.
     */
    getCurrentUser: () => {
        const user = localStorage.getItem('calcetto_current_user');
        return user ? JSON.parse(user) : null;
    },

    /**
     * Salva l'utente corrente in localStorage.
     * @param {object} user - L'oggetto utente da salvare.
     */
    setCurrentUser: (user) => {
        localStorage.setItem('calcetto_current_user', JSON.stringify(user));
    },
    
    /**
     * Rimuove l'utente corrente da localStorage.
     */
    removeCurrentUser: () => {
        localStorage.removeItem('calcetto_current_user');
    }
};

export default storage;