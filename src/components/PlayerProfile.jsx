// src/components/PlayerProfile.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import utils from '../utils.js';
import STATS_ENGINE from '../StatsEngine.js'; // 🚨 Importa il motore di calcolo
import ChartComponent from './ChartUtils.jsx'; // 🆕 Da creare per i grafici
import { shortSKILLS } from '../constants.js';

const { useMemo, useCallback } = window.React;

/**
 * Componente per la visualizzazione del profilo di un giocatore (proprio o altrui).
 * @param {object} player - L'oggetto utente da visualizzare.
 * @param {Array<object>} users - Lista di tutti gli utenti (usata da STATS_ENGINE).
 * @param {Array<object>} votes - Lista di tutti i voti.
 * @param {Array<object>} matches - Lista di tutte le partite.
 * @param {boolean} isOwnProfile - True se è il profilo dell'utente loggato.
 * @param {function} onBack - Callback per tornare indietro (se non è il proprio profilo).
 */
function PlayerProfile({ 
    player, 
    users, 
    votes, 
    matches,
    isOwnProfile = false, 
    onBack = () => {} 
}) {
    
    // 1. Calcolo Statistiche (Memoizzato)
    // Passiamo tutti gli utenti e i voti a getStats per calcolare le statistiche
    const statsUser = useMemo(() => {
        // STATS_ENGINE.getStats ritorna l'intera lista, filtriamo il giocatore specifico
        const allStats = STATS_ENGINE.getStats(users, votes, matches);
        return allStats.find(u => u.id === player.id);
    }, [users, votes, matches, player.id]);
    
    if (!statsUser) {
        return (
            <div className="player-profile-page">
                <button className="button secondary back-button" onClick={onBack}>← Indietro</button>
                <div className="info-card error">Impossibile caricare le statistiche per questo giocatore.</div>
            </div>
        );
    }
    
    const stats = statsUser.stats;
    
    // Funzione per preparare i dati per il grafico (in attesa di ChartUtils.jsx)
    const getSkillChartData = useCallback(() => {
        const skillsData = stats.avgSkills;
        const labels = Object.keys(skillsData).map(skill => shortSKILLS[skill] || skill);
        const data = Object.values(skillsData);
        
        return {
            labels: labels,
            datasets: [{
                label: 'Media Skill Votate',
                data: data,
                backgroundColor: 'rgba(92, 230, 28, 0.4)', // Volt con trasparenza
                borderColor: 'var(--volt)',
                borderWidth: 1,
                pointBackgroundColor: 'var(--volt)',
                pointRadius: 4,
                // Tipo di grafico radar è ideale per le skill
                type: 'radar' 
            }]
        };
    }, [stats.avgSkills]);
    
    // Funzione per preparare i dati delle presenze/WL
    const getMatchHistoryChartData = useCallback(() => {
        // Dati di esempio per simulare una serie storica (dovrebbe venire da matches)
        return {
            labels: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'],
            datasets: [
                {
                    label: 'Rating per Partita (Esempio)',
                    data: [75, 78, 76, 80, 79, 82],
                    borderColor: 'var(--volt)',
                    backgroundColor: 'rgba(92, 230, 28, 0.2)',
                    fill: true,
                    tension: 0.2
                },
            ]
        };
    }, []);

    return (
        <div className="player-profile-page">
            
            {!isOwnProfile && <button className="button secondary back-button" onClick={onBack}>← Indietro</button>}

            <div className="profile-header">
                <div className="profile-avatar-large">
                    {utils.getInitials(statsUser.displayName)}
                </div>
                <div className="profile-info">
                    <h2>{statsUser.nickname || statsUser.displayName}</h2>
                    <p className="role-and-email">
                        <span className="player-role-tag">{statsUser.role}</span> | {statsUser.email}
                    </p>
                </div>
            </div>

            {/* 1. Rating e Statistiche di Base */}
            <div className="stats-highlight-grid">
                <div className="stats-box rating-box">
                    <span className="label">Rating Attuale</span>
                    <span className="value rating-value">{stats.rating.toFixed(2)}</span>
                </div>
                <div className="stats-box">
                    <span className="label">Partite Giocate</span>
                    <span className="value">{stats.matchesPlayed}</span>
                </div>
                <div className="stats-box">
                    <span className="label">Vittorie (Win Rate)</span>
                    <span className="value">{stats.wins} <span className="small-detail">({stats.winRate.toFixed(1)}%)</span></span>
                </div>
                <div className="stats-box">
                    <span className="label">Voti Ricevuti</span>
                    <span className="value">{stats.totalVotesReceived}</span>
                </div>
            </div>

            {/* 2. Grafico Skill (Radar) */}
            <h3 className="section-title">📊 Analisi Skill Medie</h3>
            <div className="chart-container skill-chart-container">
                {/* Il componente ChartUtils.jsx sarà responsabile del rendering del grafico */}
                <ChartComponent 
                    chartData={getSkillChartData()} 
                    chartType="radar" 
                    options={{ responsive: true, scales: { r: { min: 4, max: 10 }}}}
                />
            </div>
            <p className="chart-summary">
                La forma del grafico Radar indica i punti di forza e debolezza. Le skill sono votate in scala 1-10.
            </p>

            {/* 3. Dettaglio Skill */}
            <h3 className="section-title">⭐ Skill per {statsUser.role}</h3>
            <div className="skill-detail-grid">
                {Object.keys(stats.avgSkills).map(skill => (
                    <div key={skill} className="skill-item">
                        <span className="skill-name">{skill}</span>
                        <span className="skill-avg-value">
                            {stats.avgSkills[skill].toFixed(2)}
                        </span>
                        {/* Visualizzazione semplificata della barra di progresso (CSS) */}
                        <div className="skill-bar-wrapper">
                            <div 
                                className="skill-bar" 
                                style={{ width: `${(stats.avgSkills[skill] * 10)}%` }} // 100% = 10.0
                            ></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* 4. Storico Partite (Placeholder) */}
            <h3 className="section-title">📈 Storico Performance</h3>
             <div className="chart-container match-history-chart">
                {/* Grafico Placeholder (Line Chart) */}
                <ChartComponent 
                    chartData={getMatchHistoryChartData()} 
                    chartType="line" 
                    options={{ responsive: true, scales: { y: { min: 70, max: 90 }}}}
                />
            </div>
            
            <p className="chart-summary">
                La linea traccia l'andamento del Rating partita per partita.
            </p>
        </div>
    );
}

export default PlayerProfile;