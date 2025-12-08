// src/constants.js
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

export const ADMIN_EMAIL = 'luigi.oliviero@gmail.com';
export const DEFAULT_VOTE_VALUE = 6.0;

// =========================================================================
// DEFINIZIONI SKILL E RUOLI
// =========================================================================

export const SKILLS = {
    // Abilità Tecniche
    tecniche: [
        'Tiro', 'Passaggio corto', 'Passaggio lungo', 'Contrasto', 'Controllo'
    ],
    // Abilità Tattiche
    tattiche: [
        'Posizionamento', 'Visione di gioco', 'Movimento senza palla', 'Decision Making'
    ],
    // Abilità Fisiche e Mentali
    fisiche: [
        'Resistenza (Stamina)', 'Velocità (Scatto)', 'Forza fisica (Tackle/Spalla)', 'Reattività'
    ],
    mentali: [
        'Leadership', 'Concentrazione', 'Mentalità', 'Fair Play'
    ]
};

export const SKILLS_GOALKEEPER = {
    // Abilità Tecniche (Portiere)
    tecniche: [
        'Parate', 'Uscite', 'Rinvii (piedi)', 'Rilanci (mani)', 'Controllo palla'
    ],
    // Abilità Tattiche (Portiere)
    tattiche: [
        'Posizionamento in porta', 'Comunicazione', 'Copertura Spazi', 'Gestione retropassaggio'
    ],
    // Abilità Fisiche e Mentali (Portiere)
    fisiche: [
        'Reattività', 'Elevazione (Jump)', 'Agilità', 'Coordinazione'
    ],
    mentali: [
        'Leadership', 'Concentrazione', 'Mentalità', 'Presenza'
    ]
};

export const shortSKILLS = {
    // Mappatura breve per le skill di campo
    Tiro: 'Tir', 'Passaggio corto': 'PC', 'Passaggio lungo': 'PL', Contrasto: 'Ctr', Controllo: 'Cnr',
    Posizionamento: 'Pos', 'Visione di gioco': 'Vis', 'Movimento senza palla': 'MvP', 'Decision Making': 'Dec',
    'Resistenza (Stamina)': 'Stm', 'Velocità (Scatto)': 'Vel', 'Forza fisica (Tackle/Spalla)': 'For', Reattività: 'Rea',
    Leadership: 'Ldr', Concentrazione: 'Con', Mentalità: 'Mnt', 'Fair Play': 'FPl'
};

export const shortSKILLS_GK = {
    // Mappatura breve per le skill del portiere
    Parate: 'Par', Uscite: 'Usc', 'Rinvii (piedi)': 'RnP', 'Rilanci (mani)': 'RnM', 'Controllo palla': 'CPl',
    'Posizionamento in porta': 'PPt', Comunicazione: 'Com', 'Copertura Spazi': 'CSz', 'Gestione retropassaggio': 'GRp',
    Reattività: 'Rea', 'Elevazione (Jump)': 'Jmp', Agilità: 'Agl', Coordinazione: 'Crd',
    Leadership: 'Ldr', Concentrazione: 'Con', Mentalità: 'Mnt', Presenza: 'Prs'
};

export const ROLES = [
    'Universale', 'Difensore', 'Centrocampista', 'Attaccante', 'Portiere'
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

/**
 * Restituisce un elenco piatto di tutte le skill per il giocatore.
 * @param {object} player - L'oggetto giocatore.
 * @returns {string[]} Array di nomi delle skill.
 */
export const getFlatSkillListForPlayer = (player) => {
    const skillSet = getSkillsForPlayer(player);
    return [
        ...skillSet.tecniche,
        ...skillSet.tattiche,
        ...skillSet.fisiche,
        ...skillSet.mentali
    ];
};