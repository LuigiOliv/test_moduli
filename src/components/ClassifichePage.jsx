// src/components/ClassifichePage.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import { useState, useMemo } from 'react';
import utils from '../utils.js';
import { ROLES, SKILLS, shortSKILLS } from '../constants.js';

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

    function ClassifichePage({ users, votes, currentUser, onViewProfile }) {
        const [view, setView] = useState('main'); // 'main' | 'macro-detail' | 'skill-detail'
        const [selectedMacro, setSelectedMacro] = useState(null);
        const [selectedSkill, setSelectedSkill] = useState(null);
        const [showAllOverall, setShowAllOverall] = useState(false);
        const [showAllMacro, setShowAllMacro] = useState({ tecniche: false, tattiche: false, fisiche: false });

        // Scroll to top quando cambia la vista
        useEffect(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, [view, selectedMacro, selectedSkill]);

        // Conta i voti fatti dall'utente corrente
        const userVotesCount = votes.filter(v => v.voterId === currentUser.id).length;
        const canViewLeaderboard = userVotesCount >= 5;

        // Calcola statistiche overall
        const playersWithOverall = users
            .filter(u => !u.id.startsWith('seed'))
            .map(player => {
                const averages = utils.calculateAverages(player.id, votes, player);
                const overall = utils.calculateOverall(averages);
                const voteCount = utils.countVotes(player.id, votes);
                return { ...player, overall, voteCount, averages };
            })
            .filter(p => p.overall !== null && p.voteCount >= 3)
            .sort((a, b) => b.overall - a.overall);

        // Funzione per calcolare classifica per macrocategoria
        const getPlayersForMacro = (macroCategory) => {
            return users
                .filter(u => !u.id.startsWith('seed'))
                .map(player => {
                    const averages = utils.calculateAverages(player.id, votes, player);
                    const voteCount = utils.countVotes(player.id, votes);

                    // Controllo null-safety
                    if (!averages) {
                        return { ...player, score: null, voteCount };
                    }

                    const skillsForCategory = player.isGoalkeeper
                        ? SKILLS_GOALKEEPER[macroCategory]
                        : SKILLS[macroCategory];

                    // Controllo che skillsForCategory esista
                    if (!skillsForCategory) {
                        return { ...player, score: null, voteCount };
                    }

                    const categoryVotes = skillsForCategory.map(skill => averages[skill]).filter(v => v !== undefined);
                    const categoryAvg = categoryVotes.length > 0
                        ? categoryVotes.reduce((a, b) => a + b, 0) / categoryVotes.length
                        : null;

                    return { ...player, score: categoryAvg, voteCount };
                })
                .filter(p => p.score !== null && p.voteCount >= 3)
                .sort((a, b) => b.score - a.score);
        };

        // Funzione per calcolare classifica per skill specifica
        const getPlayersForSkill = (skillName) => {
            return users
                .filter(u => !u.id.startsWith('seed'))
                .map(player => {
                    const averages = utils.calculateAverages(player.id, votes, player);
                    const voteCount = utils.countVotes(player.id, votes);
                    const score = averages ? averages[skillName] : undefined;

                    return { ...player, score, voteCount };
                })
                .filter(p => p.score !== undefined && p.voteCount >= 3)
                .sort((a, b) => b.score - a.score);
        };

        // Handler per apertura dettaglio macro
        const openMacroDetail = (macro) => {
            setSelectedMacro(macro);
            setView('macro-detail');
        };

        // Handler per apertura dettaglio skill
        const openSkillDetail = (skill, category) => {
            setSelectedSkill({ name: skill, category });
            setView('skill-detail');
        };

        // Handler per tornare indietro
        const goBack = () => {
            setView('main');
            setSelectedMacro(null);
            setSelectedSkill(null);
        };

        // Se non ha votato abbastanza
        if (!canViewLeaderboard) {
            return (
                <div className="section-container">
                    <div className="section-header">
                        <h2>📊 Classifiche</h2>
                    </div>

                    <div className="no-votes">
                        <h3>🔒 Classifica Bloccata</h3>
                        <p>Per visualizzare le classifiche devi completare almeno 5 valutazioni</p>
                        <p style={{ marginTop: '15px', fontSize: '1.2rem', color: 'var(--volt)' }}>
                            Hai completato: <strong>{userVotesCount}/5</strong> valutazioni
                        </p>
                        <p style={{ marginTop: '10px', opacity: '0.8' }}>
                            Vai alla sezione "Valuta" per votare altri giocatori!
                        </p>
                    </div>
                </div>
            );
        }

        // Se non ci sono dati
        if (playersWithOverall.length === 0) {
            return (
                <div className="section-container">
                    <div className="section-header">
                        <h2>📊 Classifiche</h2>
                    </div>
                    <div className="no-votes">
                        <h3>Nessuna classifica disponibile</h3>
                        <p>I giocatori devono ricevere almeno 5 valutazioni per apparire</p>
                    </div>
                </div>
            );
        }

        // ==================== VISTA DETTAGLIO MACROCATEGORIA ====================
        if (view === 'macro-detail' && selectedMacro) {
            const playersForMacro = getPlayersForMacro(selectedMacro);
            const macroInfo = {
                tecniche: { emoji: '🎯', title: 'Abilità Tecniche', color: '#FF2E63' },
                tattiche: { emoji: '🧠', title: 'Abilità Tattiche', color: '#00F0FF' },
                fisiche: { emoji: '💪', title: 'Abilità Fisiche', color: '#D2F800' }
            };
            const info = macroInfo[selectedMacro];

            return (
                <div className="section-container">
                    <div className="section-header">
                        <h2>{info.emoji} {info.title}</h2>
                        <button className="btn-back" onClick={goBack}>← Indietro</button>
                    </div>

                    <div className="leaderboard-container">
                        {playersForMacro.map((player, index) => (
                            <div
                                key={player.id}
                                className={`leaderboard-item ${index < 3 ? `rank-${index + 1}` : ''}`}
                                onClick={() => onViewProfile(player.id)}
                            >
                                <div className="rank-number">
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                                </div>
                                <div className="avatar">
                                    {player.avatar ? <img src={player.avatar} alt={player.name} /> : utils.getInitials(player.name)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '600', fontSize: '18px' }}>{player.name} {player.isGoalkeeper && '🧤'}</div>
                                    <div style={{ fontSize: '13px', opacity: 0.8 }}>{player.voteCount} valutazioni</div>
                                </div>
                                <div style={{ fontWeight: '800', fontSize: '28px' }}>{utils.toBase10(player.score).toFixed(2)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        // ==================== VISTA DETTAGLIO SKILL ====================
        if (view === 'skill-detail' && selectedSkill) {
            const playersForSkill = getPlayersForSkill(selectedSkill.name);
            const skillEmojis = {
                'Tiro': '⚡', 'Passaggio corto': '📨', 'Passaggio lungo': '📡', 'Contrasto': '🛡️', 'Controllo': '⚽',
                'Visione di gioco': '👁️', 'Senso della posizione': '📍', 'Spirito di sacrificio': '💪',
                'Letture difensive': '🛡️', 'Costruzione': '🏗️',
                'Resistenza': '🏃', 'Scatto': '⚡', 'Progressione': '🚀', 'Presenza fisica': '🦁', 'Cazzimma': '🔥'
            };
            const emoji = skillEmojis[selectedSkill.name] || '⭐';

            return (
                <div className="section-container">
                    <div className="section-header">
                        <h2>{emoji} {selectedSkill.name}</h2>
                        <button className="btn-back" onClick={goBack}>← Indietro</button>
                    </div>

                    <div className="leaderboard-container">
                        {playersForSkill.map((player, index) => (
                            <div
                                key={player.id}
                                className={`leaderboard-item ${index < 3 ? `rank-${index + 1}` : ''}`}
                                onClick={() => onViewProfile(player.id)}
                            >
                                <div className="rank-number">
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                                </div>
                                <div className="avatar">
                                    {player.avatar ? <img src={player.avatar} alt={player.name} /> : utils.getInitials(player.name)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '600', fontSize: '18px' }}>{player.name} {player.isGoalkeeper && '🧤'}</div>
                                    <div style={{ fontSize: '13px', opacity: 0.8 }}>{player.voteCount} valutazioni</div>
                                </div>
                                <div style={{ fontWeight: '800', fontSize: '28px' }}>{utils.toBase10(player.score).toFixed(2)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        // ==================== VISTA PRINCIPALE ====================
        return (
            <div className="section-container">
                <div className="section-header">
                    <h2>📊 Classifiche Complete</h2>
                </div>

                {/* 1️⃣ CLASSIFICA OVERALL */}
                <div className="rankings-overall-section">
                    <h3 className="rankings-section-title">🏆 Classifica Generale</h3>

                    <div className="leaderboard-container">
                        {playersWithOverall.slice(0, showAllOverall ? undefined : 5).map((player, index) => (
                            <div
                                key={player.id}
                                className={`leaderboard-item ${index < 3 ? `rank-${index + 1}` : ''}`}
                                onClick={() => onViewProfile(player.id)}
                            >
                                <div className="rank-number">
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                                </div>
                                <div className="avatar">
                                    {player.avatar ? <img src={player.avatar} alt={player.name} /> : utils.getInitials(player.name)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '600', fontSize: '18px' }}>{player.name} {player.isGoalkeeper && '🧤'}</div>
                                    <div style={{ fontSize: '13px', opacity: 0.8 }}>{player.voteCount} valutazioni</div>
                                </div>
                                <div style={{ fontWeight: '800', fontSize: '28px' }}>{utils.toBase10(player.overall).toFixed(2)}</div>
                            </div>
                        ))}
                    </div>

                    {playersWithOverall.length > 5 && (
                        <button
                            className="btn-expand"
                            onClick={() => setShowAllOverall(!showAllOverall)}
                        >
                            {showAllOverall ? '⬆️ Mostra meno' : `⬇️ Mostra altri ${playersWithOverall.length - 5}`}
                        </button>
                    )}
                </div>

                {/* 2️⃣ MACROCATEGORIE */}
                <h3 className="rankings-section-title" style={{ marginTop: '40px' }}>📈 Classifiche per Macrocategoria</h3>

                <div className="rankings-macro-grid">
                    {/* TECNICA */}
                    <div className="rankings-macro-card rankings-macro-tecnica" onClick={() => openMacroDetail('tecniche')}>
                        <div className="rankings-macro-header">
                            <span className="rankings-macro-emoji">🎯</span>
                            <span className="rankings-macro-title">Tecnica</span>
                        </div>

                        <div className="rankings-compact-list">
                            {getPlayersForMacro('tecniche').slice(0, showAllMacro.tecniche ? undefined : 3).map((player, index) => (
                                <div key={player.id} className="rankings-compact-item" onClick={(e) => { e.stopPropagation(); onViewProfile(player.id); }}>
                                    <div className="rank-number">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}</div>
                                    <div className="avatar-small">
                                        {player.avatar ? <img src={player.avatar} alt={player.name} /> : utils.getInitials(player.name)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: '600', fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {player.name} {player.isGoalkeeper && '🧤'}
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: '800', fontSize: '20px' }}>{utils.toBase10(player.score).toFixed(2)}</div>
                                </div>
                            ))}
                        </div>

                        {getPlayersForMacro('tecniche').length > 3 && (
                            <button
                                className="btn-expand-small"
                                onClick={(e) => { e.stopPropagation(); setShowAllMacro({ ...showAllMacro, tecniche: !showAllMacro.tecniche }); }}
                            >
                                {showAllMacro.tecniche ? '⬆️ Mostra meno' : `⬇️ Mostra tutti (${getPlayersForMacro('tecniche').length})`}
                            </button>
                        )}
                    </div>

                    {/* TATTICA */}
                    <div className="rankings-macro-card rankings-macro-tattica" onClick={() => openMacroDetail('tattiche')}>
                        <div className="rankings-macro-header">
                            <span className="rankings-macro-emoji">🧠</span>
                            <span className="rankings-macro-title">Tattica</span>
                        </div>

                        <div className="rankings-compact-list">
                            {getPlayersForMacro('tattiche').slice(0, showAllMacro.tattiche ? undefined : 3).map((player, index) => (
                                <div key={player.id} className="rankings-compact-item" onClick={(e) => { e.stopPropagation(); onViewProfile(player.id); }}>
                                    <div className="rank-number">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}</div>
                                    <div className="avatar-small">
                                        {player.avatar ? <img src={player.avatar} alt={player.name} /> : utils.getInitials(player.name)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: '600', fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {player.name} {player.isGoalkeeper && '🧤'}
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: '800', fontSize: '20px' }}>{utils.toBase10(player.score).toFixed(2)}</div>
                                </div>
                            ))}
                        </div>

                        {getPlayersForMacro('tattiche').length > 3 && (
                            <button
                                className="btn-expand-small"
                                onClick={(e) => { e.stopPropagation(); setShowAllMacro({ ...showAllMacro, tattiche: !showAllMacro.tattiche }); }}
                            >
                                {showAllMacro.tattiche ? '⬆️ Mostra meno' : `⬇️ Mostra tutti (${getPlayersForMacro('tattiche').length})`}
                            </button>
                        )}
                    </div>

                    {/* FISICA */}
                    <div className="rankings-macro-card rankings-macro-fisica" onClick={() => openMacroDetail('fisiche')}>
                        <div className="rankings-macro-header">
                            <span className="rankings-macro-emoji">💪</span>
                            <span className="rankings-macro-title">Fisica</span>
                        </div>

                        <div className="rankings-compact-list">
                            {getPlayersForMacro('fisiche').slice(0, showAllMacro.fisiche ? undefined : 3).map((player, index) => (
                                <div key={player.id} className="rankings-compact-item" onClick={(e) => { e.stopPropagation(); onViewProfile(player.id); }}>
                                    <div className="rank-number">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}</div>
                                    <div className="avatar-small">
                                        {player.avatar ? <img src={player.avatar} alt={player.name} /> : utils.getInitials(player.name)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: '600', fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {player.name} {player.isGoalkeeper && '🧤'}
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: '800', fontSize: '20px' }}>{utils.toBase10(player.score).toFixed(2)}</div>
                                </div>
                            ))}
                        </div>

                        {getPlayersForMacro('fisiche').length > 3 && (
                            <button
                                className="btn-expand-small"
                                onClick={(e) => { e.stopPropagation(); setShowAllMacro({ ...showAllMacro, fisiche: !showAllMacro.fisiche }); }}
                            >
                                {showAllMacro.fisiche ? '⬆️ Mostra meno' : `⬇️ Mostra tutti (${getPlayersForMacro('fisiche').length})`}
                            </button>
                        )}
                    </div>
                </div>

                {/* 3️⃣ SKILL INDIVIDUALI */}
                <h3 className="rankings-section-title" style={{ marginTop: '40px' }}>⚡ Top 3 per ogni Skill</h3>

                <div className="rankings-skills-grid">
                    {Object.keys(SKILLS).flatMap(category =>
                        SKILLS[category].map((skill, idx) => {
                            const playersForSkill = getPlayersForSkill(skill);
                            const skillEmojis = {
                                'Tiro': '⚡', 'Passaggio corto': '📨', 'Passaggio lungo': '📡', 'Contrasto': '🛡️', 'Controllo': '⚽',
                                'Visione di gioco': '👁️', 'Senso della posizione': '📍', 'Spirito di sacrificio': '💪',
                                'Letture difensive': '🛡️', 'Costruzione': '🗝️',
                                'Resistenza': '🏃', 'Scatto': '⚡', 'Progressione': '🚀', 'Presenza fisica': '🦁', 'Cazzimma': '🔥'
                            };
                            const emoji = skillEmojis[skill] || '⭐';

                            return (
                                <div key={skill} className="rankings-skill-card" onClick={() => openSkillDetail(skill, category)}>
                                    <div className="rankings-skill-title">{emoji} {skill}</div>

                                    <div className="rankings-mini-list">
                                        {playersForSkill.slice(0, 3).map((player, index) => (
                                            <div key={player.id} className="rankings-mini-item" onClick={(e) => { e.stopPropagation(); onViewProfile(player.id); }}>
                                                <div className="rank-mini">{index + 1}</div>
                                                <div className="avatar-mini">
                                                    {player.avatar ? <img src={player.avatar} alt={player.name} /> : utils.getInitials(player.name)}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0, fontSize: '14px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {player.name}
                                                </div>
                                                <div style={{ fontWeight: '800', fontSize: '16px' }}>{utils.toBase10(player.score).toFixed(2)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    }

    export default ClassifichePage;