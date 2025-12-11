// src/storage.js
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

// =========================================================================
// FIREBASE INITIALIZATION (Modular SDK)
// =========================================================================

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

// Firebase config is initialized in main.jsx
const db = getFirestore();
const auth = getAuth();
const googleProvider = new GoogleAuthProvider();

/**
 * Funzione di utilità per gestire gli errori Firestore.
 */
const handleError = (action, error) => {
    console.error(`Errore durante ${action}:`, error);
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
            const usersRef = collection(db, 'users');
            const snapshot = await getDocs(usersRef);
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
            const userRef = doc(db, 'users', user.id);
            await setDoc(userRef, user, { merge: true });
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
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                // Utente esistente: aggiorna l'ultimo login
                const userData = userDoc.data();
                await updateDoc(userRef, {
                    lastLogin: serverTimestamp()
                });
                return { id: userDoc.id, ...userData };
            } else {
                // Nuovo utente: crea il profilo base
                const newUser = {
                    id: firebaseUser.uid,
                    displayName: firebaseUser.displayName || 'Nuovo Giocatore',
                    email: firebaseUser.email,
                    isAdmin: false,
                    isGoalkeeper: false,
                    role: 'Universale',
                    avatarUrl: firebaseUser.photoURL || '',
                    registrationDate: serverTimestamp(),
                    lastLogin: serverTimestamp()
                };
                await setDoc(userRef, newUser);
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
            const matchesRef = collection(db, 'matches');
            const q = query(matchesRef, orderBy('date', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(),
                date: doc.data().date instanceof Timestamp ? doc.data().date.toDate().toISOString() : doc.data().date
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
            const dateToSave = match.date instanceof Date ? Timestamp.fromDate(match.date) : match.date;
            const matchesRef = collection(db, 'matches');
            const docRef = await getDocs(matchesRef);
            const newId = doc(matchesRef).id;
            await setDoc(doc(matchesRef, newId), { ...match, date: dateToSave });
            return newId;
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
            const matchRef = doc(db, 'matches', matchId);
            await updateDoc(matchRef, data);
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
            const matchRef = doc(db, 'matches', matchId);
            await deleteDoc(matchRef);
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
                    const matchRef = doc(db, 'matches', match.id);
                    await updateDoc(matchRef, { status: 'closed' });
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
            const matchRef = doc(db, 'matches', matchId);
            const updateData = {
                participants: isJoining ? arrayUnion(userId) : arrayRemove(userId)
            };
            await updateDoc(matchRef, updateData);
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
            const votesRef = collection(db, 'votes');
            const snapshot = await getDocs(votesRef);
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
            const voteId = `${matchId}_${voterId}_${votedPlayerId}`;
            const voteRef = doc(db, 'votes', voteId);
            const fullVoteData = {
                ...voteData,
                matchId,
                voterId,
                votedPlayerId,
                timestamp: serverTimestamp()
            };
            await setDoc(voteRef, fullVoteData);
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
        try {
            const result = await signInWithPopup(auth, googleProvider);
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
            await signOut(auth);
            localStorage.removeItem('calcetto_current_user');
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
    },

    /**
     * Alias per handleLogout (chiamato da App.jsx).
     */
    signOut: async () => {
        return storage.handleLogout();
    }
};

export default storage;