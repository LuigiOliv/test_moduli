// src/components/PlayerProfile.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import { useState } from 'react';
import utils from '../utils.js';
import { getSkillsForPlayer, getShortSkillsForPlayer, CLASSIFICATION_FORMULA } from '../constants.js';
import RadarChart from './RadarChart.jsx';

/**
 * Componente per la visualizzazione del profilo di un giocatore (proprio o altrui).
 * @param {object} player - L'oggetto utente da visualizzare.
 * @param {Array<object>} votes - Lista di tutti i voti.
 * @param {boolean} isOwnProfile - True se è il profilo dell'utente loggato.
 * @param {function} onBack - Callback per tornare indietro (se non è il proprio profilo).
 */
function PlayerProfile({ player, votes = [], matches = [], matchVotes = [], isOwnProfile, onBack }) {
    const playerVotes = votes.filter(v => v.playerId === player.id);
    const voteCount = utils.countVotes(player.id, votes);
    const hasEnoughVotes = voteCount >= 5;
    const averages = utils.calculateAverages(player.id, votes, player);
    const overall = matches.length > 0
        ? utils.calculateFormulaBasedOverall(averages, player.id, matches, matchVotes, CLASSIFICATION_FORMULA)
        : utils.calculateOverall(averages);
    const [flippedCard, setFlippedCard] = useState(null);
    const handleCardClick = (category) => {
        if (window.innerWidth <= 768) {
            setFlippedCard(flippedCard === category ? null : category);
        }
    };

    return (
        <div className="section-container">
            <div className="section-header">
                <h2>Profilo Giocatore</h2>
                {onBack && (
                    <button className="btn-back" onClick={onBack}>← Indietro</button>
                )}
            </div>

            <div className="profile-header">
                <div className="avatar profile-avatar">
                    {player.avatar ? <img src={player.avatar} alt={player.name} /> : utils.getInitials(player.name)}
                </div>

                <div className="profile-header-info">
                    <h2>{player.name} {player.isGoalkeeper && '🧤'}</h2>
                    <div className="votes-count">Sulla base di {voteCount} valutazioni ricevute</div>
                </div>

                {(player.preferredRole || (player.otherRoles && player.otherRoles.length > 0)) && (
                    <div className="role-info">
                        {player.preferredRole && (
                            <div className="role-item">
                                <div className="role-label">Ruolo preferito</div>
                                <div className="role-value">{player.preferredRole}</div>
                            </div>
                        )}
                        {player.otherRoles && player.otherRoles.length > 0 && (
                            <div className="role-item">
                                <div className="role-label">Mi adatto anche a</div>
                                <div className="role-badges">
                                    {player.otherRoles.map(role => (<span key={role} className="role-badge">{role}</span>))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {hasEnoughVotes && overall && (
                <div className="overall-container">
                    <div className="overall-main">{utils.toBase10(overall).toFixed(2)}</div>
                    <div className="overall-label">Overall Rating</div>
                </div>
            )}

            {hasEnoughVotes && averages ? (
                <div className="charts-container">
                    {Object.entries(getSkillsForPlayer(player)).map(([category, skills]) => {
                        const shortSkills = getShortSkillsForPlayer(player)[category];
                        const catOverall = utils.calculateCategoryOverall(averages, category, player);

                        return (
                            <div
                                key={category}
                                className={`chart-box ${flippedCard === category ? 'flipped' : ''}`}
                                onClick={() => handleCardClick(category)}
                            >
                                <div className="chart-box-inner">

                                    {/* FRONT (Radar) */}
                                    <div className="chart-box-front">
                                        <h3 className={`category-${category}`}>
                                            {category.charAt(0).toUpperCase() + category.slice(1)}
                                        </h3>

                                        {catOverall && (
                                            <div className="category-overall">
                                                {utils.toBase10(catOverall).toFixed(2)}
                                            </div>
                                        )}

                                        <RadarChart
                                            data={averages}
                                            labels={skills}         // skill estese → per i valori
                                            shortLabels={shortSkills} // abbreviazioni → per visualizzare
                                            category={category}
                                        />
                                    </div>

                                    {/* BACK (Lista dettagliata con label estese) */}
                                    <div className="chart-box-back">
                                        <h4 className={`category-${category}`}>
                                            {category.charAt(0).toUpperCase() + category.slice(1)}
                                        </h4>
                                        <div className="chart-detail-list">
                                            {skills.map(skill => (
                                                <div key={skill} className="chart-detail-item">
                                                    <span>{skill}</span>
                                                    <span className={`category-${category}`}>
                                                        {averages[skill]
                                                            ? utils.toBase10(averages[skill]).toFixed(2)
                                                            : '-'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="no-votes">
                    <h3>📊 Grafici non disponibili</h3>
                    <p>{isOwnProfile ? "Chiedi ai tuoi compagni di valutarti!" : "Questo giocatore ha bisogno di più valutazioni"}</p>
                    <p>Servono almeno 5 valutazioni (attualmente: {voteCount})</p>
                </div>
            )}
        </div>
    );
}

export default PlayerProfile;