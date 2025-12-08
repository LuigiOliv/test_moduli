// src/components/ClassifichePage.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import utils from '../utils.js';
import STATS_ENGINE from '../StatsEngine.js'; // 🚨 Importa il motore di calcolo
import { ROLES, SKILLS, shortSKILLS } from '../constants.js';

const { useState, useMemo } = window.React;

/**
 * Pagina per visualizzare le classifiche (Rating, Skill, Portieri, etc.).
 * @param {Array<object>} users - Lista di tutti gli utenti.
 * @param {Array<object>} votes - Lista di tutti i voti.
 * @param {object} currentUser - L'utente corrente.
 * @param {function} onViewProfile - Callback per aprire il profilo di un giocatore.
 */
function ClassifichePage({ users, votes, currentUser, onViewProfile }) {
    const [activeRank, setActiveRank] = useState('rating');
    const [selectedSkill, setSelectedSkill] = useState(null);
    const [roleFilter, setRoleFilter] = useState('All');

    // 1. Calcolo Statistiche (Memoizzato per performance)
    const statsUsers = useMemo(() => {
        return STATS_ENGINE.getStats(users, votes);
    }, [users, votes]);
    
    // 2. Classifiche filtrate e ordinate
    const rankedUsers = useMemo(() => {
        let filteredUsers = statsUsers;
        
        // Filtro per Ruolo
        if (roleFilter !== 'All') {
            // Se è Portiere, include solo i portieri
            if (roleFilter === 'Portiere') {
                filteredUsers = filteredUsers.filter(u => u.role === 'Portiere');
            } 
            // Se è Universale, include tutti gli altri (difensori, centrocampisti, attaccanti, universali)
            else if (roleFilter === 'Campo') {
                 filteredUsers = filteredUsers.filter(u => u.role !== 'Portiere');
            }
        }
        
        // Ordinamento
        switch (activeRank) {
            case 'rating':
                // Ordina per Rating e poi per partite giocate
                return filteredUsers.sort((a, b) => {
                    if (b.stats.rating !== a.stats.rating) return b.stats.rating - a.stats.rating;
                    return b.stats.matchesPlayed - a.stats.matchesPlayed;
                });
            
            case 'skill':
                if (selectedSkill) {
                    // Ordina per la skill selezionata
                    return filteredUsers.sort((a, b) => {
                        const aSkill = a.stats.avgSkills[selectedSkill] || 6.0;
                        const bSkill = b.stats.avgSkills[selectedSkill] || 6.0;
                        return bSkill - aSkill;
                    });
                }
                // Se skill non selezionata, ritorna per Rating
                return filteredUsers.sort((a, b) => b.stats.rating - a.stats.rating);

            case 'matchPlayed':
                return filteredUsers.sort((a, b) => b.stats.matchesPlayed - a.stats.matchesPlayed);

            case 'winRate':
                // Ordina per % di vittorie, poi per numero di vittorie
                return filteredUsers.sort((a, b) => {
                    if (b.stats.winRate !== a.stats.winRate) return b.stats.winRate - a.stats.winRate;
                    return b.stats.wins - a.stats.wins;
                });
                
            default:
                return filteredUsers;
        }
    }, [statsUsers, activeRank, selectedSkill, roleFilter]);

    // Opzioni di filtro Ruolo
    const roleOptions = [
        { id: 'All', label: 'Tutti i Giocatori' },
        { id: 'Campo', label: 'Giocatori di Campo' },
        { id: 'Portiere', label: 'Portieri' }
    ];

    // Lista delle Skill rilevanti per il filtro
    const skillList = useMemo(() => {
        const allSkills = new Set();
        // Aggiunge tutte le skill dai ruoli (escludendo la struttura interna)
        Object.values(SKILLS).forEach(roleSkills => {
            Object.values(roleSkills).flat().forEach(skill => allSkills.add(skill));
        });
        return Array.from(allSkills);
    }, []);
    
    // Funzione per visualizzare la skill
    const renderSkillSelector = () => {
        const skillsToShow = skillList.filter(skill => {
            if (roleFilter === 'Portiere') {
                return Object.values(SKILLS.Portiere).flat().includes(skill);
            }
            if (roleFilter === 'Campo') {
                // Esclude le skill specifiche del portiere
                const gkSkills = Object.values(SKILLS.Portiere).flat();
                return !gkSkills.includes(skill);
            }
            return true;
        });

        return (
            <select 
                value={selectedSkill || 'default'}
                onChange={(e) => setSelectedSkill(e.target.value === 'default' ? null : e.target.value)}
                className="select-filter"
            >
                <option value="default" disabled={selectedSkill !== null}>Scegli Skill</option>
                {skillsToShow.map(skill => (
                    <option key={skill} value={skill}>
                        {shortSKILLS[skill] || skill}
                    </option>
                ))}
            </select>
        );
    };

    return (
        <div className="classifiche-page">
            <h2>🏆 Classifiche Globali</h2>
            <p className="subtitle">Visualizza i giocatori con il Rating e le performance migliori.</p>

            {/* Controlli Filtri */}
            <div className="rank-controls">
                {/* 1. Selezione Categoria Rank */}
                <div className="rank-group">
                    <label>Rank per:</label>
                    <button 
                        className={`button small-button ${activeRank === 'rating' ? 'primary' : 'secondary'}`} 
                        onClick={() => { setActiveRank('rating'); setSelectedSkill(null); }}
                    >
                        Rating
                    </button>
                    <button 
                        className={`button small-button ${activeRank === 'skill' ? 'primary' : 'secondary'}`} 
                        onClick={() => setActiveRank('skill')}
                    >
                        Skill
                    </button>
                    <button 
                        className={`button small-button ${activeRank === 'winRate' ? 'primary' : 'secondary'}`} 
                        onClick={() => { setActiveRank('winRate'); setSelectedSkill(null); }}
                    >
                        % Vittorie
                    </button>
                    <button 
                        className={`button small-button ${activeRank === 'matchPlayed' ? 'primary' : 'secondary'}`} 
                        onClick={() => { setActiveRank('matchPlayed'); setSelectedSkill(null); }}
                    >
                        Presenze
                    </button>
                </div>

                {/* 2. Selezione Skill (solo se activeRank è 'skill') */}
                {activeRank === 'skill' && renderSkillSelector()}
                
                {/* 3. Filtro per Ruolo */}
                <div className="rank-group">
                    <label>Filtra Ruolo:</label>
                    {roleOptions.map(opt => (
                        <button 
                            key={opt.id}
                            className={`button small-button ${roleFilter === opt.id ? 'primary' : 'secondary'}`} 
                            onClick={() => setRoleFilter(opt.id)}
                        >
                            {opt.label.split(' ')[0]}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="ranking-table-container">
                <table className="ranking-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Giocatore</th>
                            <th>Ruolo</th>
                            <th>
                                {activeRank === 'rating' ? 'Rating' : 
                                 activeRank === 'winRate' ? 'Vittorie' : 
                                 activeRank === 'matchPlayed' ? 'Partite Giocate' :
                                 activeRank === 'skill' ? shortSKILLS[selectedSkill] || 'Media Skill' : 'Valore'}
                            </th>
                            <th>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rankedUsers.map((user, index) => (
                            <tr key={user.id} className={user.id === currentUser.id ? 'current-user-row' : ''}>
                                <td className="rank-cell">
                                    <span className="rank-number">#{index + 1}</span>
                                </td>
                                <td className="player-cell">
                                    {user.nickname || user.displayName}
                                </td>
                                <td className="role-cell">{user.role || 'N/D'}</td>
                                <td className="value-cell">
                                    {activeRank === 'rating' ? user.stats.rating.toFixed(2) : 
                                     activeRank === 'winRate' ? `${user.stats.winRate.toFixed(1)}% (${user.stats.wins}V/${user.stats.losses}S)` : 
                                     activeRank === 'matchPlayed' ? user.stats.matchesPlayed :
                                     activeRank === 'skill' ? (user.stats.avgSkills[selectedSkill] || 6.0).toFixed(2) : user.stats.rating.toFixed(2)}
                                </td>
                                <td className="action-cell">
                                    <button 
                                        className="button tiny-button secondary"
                                        onClick={() => onViewProfile(user.id)}
                                    >
                                        Vedi Profilo
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {rankedUsers.length === 0 && (
                <div className="info-card empty-state">
                    Nessun giocatore trovato con questi criteri.
                </div>
            )}
        </div>
    );
}

export default ClassifichePage;