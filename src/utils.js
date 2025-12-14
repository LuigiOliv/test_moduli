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
        return name.substring(0, 2).toUpperCase();
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
    }
};

export default utils;