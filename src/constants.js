// src/constants.js
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

export const ADMIN_EMAIL = 'luigi.oliviero@gmail.com';
export const DEFAULT_VOTE_VALUE = 6.0;

// =========================================================================
// DEFINIZIONI SKILL E RUOLI
// =========================================================================

export const SKILLS = {
    // Abilità Tecniche
    tecniche: ['Tiro', 'Passaggio corto', 'Passaggio lungo', 'Contrasto', 'Controllo'],
    // Abilità Tattiche
    tattiche: ['Visione di gioco', 'Senso della posizione', 'Spirito di sacrificio', 'Letture difensive', 'Costruzione'],
    // Abilità Fisiche
    fisiche: ['Resistenza', 'Scatto', 'Progressione', 'Presenza fisica', 'Cazzimma']
};

export const SKILLS_GOALKEEPER = {
    // Abilità Tecniche (Portiere)
    tecniche: ['Parate', 'Uscite', 'Rinvii (piedi)', 'Rilanci (mani)', 'Controllo palla'],
    // Abilità Tattiche (Portiere)
    tattiche: ['Posizionamento', 'Comunicazione', 'Lettura del gioco', 'Gestione area', 'Prima costruzione'],
    // Abilità Fisiche (Portiere)
    fisiche: ['Reattività/Agilità', 'Riflessi', 'Elevazione', 'Resistenza', 'Plasticità (tuffi)']
};

export const shortSKILLS = {
    // Mappatura breve per le skill di campo
    tecniche: ['TIR', 'PsC', 'PsL', 'CST', 'CTR'],
    tattiche: ['VIS', 'PSZ', 'SAC', 'DIF', 'REG'],
    fisiche: ['RES', 'SCT', 'PRG', 'FIS', 'CZM']
};

export const shortSKILLS_GK = {
    // Mappatura breve per le skill del portiere
    tecniche: ['PRT', 'USC', 'RNV', 'RLC', 'CTR'],
    tattiche: ['PSZ', 'CMZ', 'LET', 'GES', 'REG'],
    fisiche: ['AGL', 'RFL', 'ELV', 'RES', 'TUF']
};

export const ROLES = [
    'Portiere', 'Difensore centrale', 'Difensore laterale sx', 'Difensore laterale dx',
    'Centrocampista difensivo', 'Centrocampista offensivo', 'Mezzala sx', 'Mezzala dx', 'Centravanti'
];

// =========================================================================
// FUNZIONI HELPER
// =========================================================================

/**
 * Restituisce l'oggetto SKILLS appropriato in base al ruolo del giocatore.
 * @param {object} player - L'oggetto giocatore che include il campo isGoalkeeper.
 * @returns {object} SKILLS o SKILLS_GOALKEEPER.
 */
export const getSkillsForPlayer = (player) => {
    return player.isGoalkeeper ? SKILLS_GOALKEEPER : SKILLS;
};

/**
 * Restituisce l'oggetto shortSKILLS appropriato in base al ruolo del giocatore.
 * @param {object} player - L'oggetto giocatore che include il campo isGoalkeeper.
 * @returns {object} shortSKILLS o shortSKILLS_GK.
 */
export const getShortSkillsForPlayer = (player) => {
    return player.isGoalkeeper ? shortSKILLS_GK : shortSKILLS;
};