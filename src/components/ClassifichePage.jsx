// src/components/ClassifichePage.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import { useState, useMemo, useEffect, useRef } from 'react';
import utils from '../utils.js';
import { ROLES, SKILLS, shortSKILLS, SKILLS_GOALKEEPER, CLASSIFICATION_FORMULA, MATCH, VOTING, DISPLAY, UI } from '../constants.js';

/**
 * Pagina per visualizzare le classifiche (Rating, Skill, Portieri, etc.).
 * @param {Array<object>} users - Lista di tutti gli utenti.
 * @param {Array<object>} votes - Lista di tutti i voti.
 * @param {object} currentUser - L'utente corrente.
 * @param {function} onViewProfile - Callback per aprire il profilo di un giocatore.
 */

const getVoteTimestamp = (vote) => {
    const rawDate = vote.createdAt ?? vote.updatedAt ?? vote.date ?? vote.timestamp;
    if (rawDate === undefined || rawDate === null) return null;
    if (typeof rawDate === 'number') return rawDate;
    const parsed = Date.parse(rawDate);
    return Number.isNaN(parsed) ? null : parsed;
};

function ClassifichePage({ users = [], votes = [], matches = [], matchVotes = [], currentUser, onViewProfile }) {
    const [view, setView] = useState('main'); // 'main' | 'macro-detail' | 'skill-detail'
    const [selectedMacro, setSelectedMacro] = useState(null);
    const [selectedSkill, setSelectedSkill] = useState(null);
    const [showMoreOverall, setShowMoreOverall] = useState(false);
    const [showMoreMacros, setShowMoreMacros] = useState({ tecniche: false, tattiche: false, fisiche: false });
    // NEW:
    const [activeTab, setActiveTab] = useState('overall');
    const [showMoreMatches, setShowMoreMatches] = useState(false);
    const touchStartX = useRef(null);
    const touchEndX = useRef(null);
    const [showMorePerformance, setShowMorePerformance] = useState(false);
    const currentUserId = currentUser?.id;
    const voteablePlayersCount = useMemo(() => {
        if (!currentUserId) return 0;

        return users.filter(u => {
            // Exclude self and seed users
            if (u.id === currentUserId) return false;
            if (u.id.startsWith('seed')) return false;

            // Check minimum matches requirement
            const matchCount = utils.countPlayerMatches(u.id, matches);
            if (matchCount < MATCH.MIN_MATCHES_FOR_VOTING) return false;

            // Filter out initial players if user has voted offline
            if (currentUser?.hasVotedOffline && u.isInitialPlayer) return false;

            // Check if already voted
            const alreadyVoted = votes.some(v =>
                v.voterId === currentUserId && v.playerId === u.id
            );
            return !alreadyVoted;
        }).length;
    }, [users, currentUserId, currentUser, votes, matches]);
    const hasVoteTargets = voteablePlayersCount > 0;

    // Scroll to top quando cambia la vista
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [view, selectedMacro, selectedSkill]);

    // Add to useEffect dependency
    useEffect(() => {
        setShowMoreOverall(false);
        setShowMoreMacros({ tecniche: false, tattiche: false, fisiche: false });
        setShowMoreMatches(false); // NEW
        setShowMorePerformance(false); // NEW
    }, [activeTab]);

    // Conta i voti fatti dall'utente corrente
    const userVotesCount = useMemo(() => {
        if (!currentUserId) return 0;
        const now = Date.now();
        return votes.filter(v => {
            if (v.voterId !== currentUserId) return false;
            const ts = getVoteTimestamp(v);
            if (ts == null) return false;
            return now - ts <= VOTING.RECENT_VOTES_WINDOW_MS;
        }).length;
    }, [votes, currentUserId]);

    const canViewLeaderboard = !hasVoteTargets || userVotesCount >= VOTING.MIN_VOTES_RECENT_FOR_LEADERBOARD;

    // Calcola statistiche overall con formula
    const playersWithOverall = useMemo(() => {
        return users
            .filter(u => !u.id.startsWith('seed'))
            .map(player => {
                const averages = utils.calculateAverages(player.id, votes, player);
                const voteCount = utils.countVotes(player.id, votes);

                // Usa la formula se abbiamo i dati delle partite
                const overall = matches.length > 0
                    ? utils.calculateFormulaBasedOverall(averages, player.id, matches, matchVotes, CLASSIFICATION_FORMULA)
                    : utils.calculateOverall(averages);

                return { ...player, overall, voteCount, averages };
            })
            .filter(p => p.overall !== null && p.voteCount >= VOTING.MIN_VOTES_FOR_DISPLAY)
            .sort((a, b) => b.overall - a.overall);
    }, [users, votes, matches, matchVotes]);

    // Calculate players by matches played (only COMPLETED matches)
    const playersWithMatches = useMemo(() => {
        return users
            .filter(u => !u.id.startsWith('seed'))
            .map(player => {
                const matchCount = utils.countPlayerMatches(player.id, matches);
                const voteCount = utils.countVotes(player.id, votes);
                const averages = utils.calculateAverages(player.id, votes, player);
                const overall = matches.length > 0
                    ? utils.calculateFormulaBasedOverall(averages, player.id, matches, matchVotes, CLASSIFICATION_FORMULA)
                    : utils.calculateOverall(averages);

                return { ...player, matchCount, voteCount, overall };
            })
            .filter(p => p.matchCount > 0)
            .sort((a, b) => b.matchCount - a.matchCount);
    }, [users, matches, votes, matchVotes]);

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
            .filter(p => p.score !== null && p.voteCount >= VOTING.MIN_VOTES_FOR_DISPLAY)
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
            .filter(p => p.score !== undefined && p.voteCount >= VOTING.MIN_VOTES_FOR_DISPLAY)
            .sort((a, b) => b.score - a.score);
    };

    // Calcola rendimento degli ultimi 5 match per ogni giocatore
    const playersWithPerformance = useMemo(() => {
        return users
            .filter(u => !u.id.startsWith('seed'))
            .map(player => {
                const matchHistory = utils.getPlayerMatchHistory(player.id, matches);
                const performance = utils.calculatePerformance(
                    player.id,
                    matchHistory,
                    matchVotes,
                    CLASSIFICATION_FORMULA.RECENT_MATCHES_FOR_PERFORMANCE,
                    CLASSIFICATION_FORMULA.MIN_MATCHES_FOR_PERFORMANCE
                );

                const averages = utils.calculateAverages(player.id, votes, player);
                const overall = matches.length > 0
                    ? utils.calculateFormulaBasedOverall(averages, player.id, matches, matchVotes, CLASSIFICATION_FORMULA)
                    : utils.calculateOverall(averages);

                return {
                    ...player,
                    performance,
                    matchCount: matchHistory.length,
                    overall
                };
            })
            .filter(p => p.performance !== null)
            .sort((a, b) => b.performance - a.performance);
    }, [users, matches, matchVotes, votes]);

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

    const tabs = [
        { id: 'overall', label: 'Generale', emoji: '🏆' },
        { id: 'macro', label: 'Macrocategorie', emoji: '📈' },
        { id: 'skill', label: 'Skill', emoji: '⚡' },
        { id: 'matches', label: 'Presenze', emoji: '⚽' },
        { id: 'performance', label: 'Rendimento', emoji: '📊' }
    ];
    const tabOrder = tabs.map(tab => tab.id);
    const swipeThreshold = UI.SWIPE_THRESHOLD_PX;
    const goToTabIndex = (index) => {
        if (index >= 0 && index < tabOrder.length) {
            setActiveTab(tabOrder[index]);
        }
    };
    const handleSwipeDelta = (deltaX) => {
        if (deltaX > swipeThreshold) {
            goToTabIndex(tabOrder.indexOf(activeTab) - 1);
        } else if (deltaX < -swipeThreshold) {
            goToTabIndex(tabOrder.indexOf(activeTab) + 1);
        }
    };
    const handleTouchStart = (event) => {
        touchStartX.current = event.touches[0].clientX;
        touchEndX.current = null;
    };
    const handleTouchMove = (event) => {
        if (touchStartX.current !== null) {
            touchEndX.current = event.touches[0].clientX;
        }
    };
    const handleTouchEnd = () => {
        if (touchStartX.current !== null && touchEndX.current !== null) {
            handleSwipeDelta(touchEndX.current - touchStartX.current);
        }
        touchStartX.current = null;
        touchEndX.current = null;
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
                    <p>Per visualizzare le classifiche devi completare almeno {VOTING.MIN_VOTES_RECENT_FOR_LEADERBOARD} valutazioni negli ultimi {DEADLINES.RECENT_VOTES_WINDOW} giorni</p>
                    <p style={{ marginTop: '15px', fontSize: '1.2rem', color: 'var(--volt)' }}>
                        Hai completato: <strong>{userVotesCount}/{VOTING.MIN_VOTES_RECENT_FOR_LEADERBOARD}</strong> valutazioni negli ultimi {DEADLINES.RECENT_VOTES_WINDOW} giorni
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
                    <p>I giocatori devono ricevere almeno {VOTING.MIN_VOTES_FOR_DISPLAY} valutazioni per apparire</p>                </div>
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
                                {index === DISPLAY.GOLD_POSITION ? '🥇' : index === DISPLAY.SILVER_POSITION ? '🥈' : index === DISPLAY.BRONZE_POSITION ? '🥉' : `${index + 1}.`}
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
                                {index === DISPLAY.GOLD_POSITION ? '🥇' : index === DISPLAY.SILVER_POSITION ? '🥈' : index === DISPLAY.BRONZE_POSITION ? '🥉' : `${index + 1}.`}
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
            <div className="leaderboard-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`leaderboard-tab ${activeTab === tab.id ? 'leaderboard-tab--active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span>{tab.emoji}</span>
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>
            <p className="leaderboard-swipe-hint">↔️ Swipe per cambiare tab</p>
            <div
                className="leaderboard-tabpanels"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <section className={`leaderboard-tabpanel ${activeTab === 'overall' ? '' : 'leaderboard-tabpanel--hidden'}`}>
                    <div className="rankings-overall-section">
                        <h3 className="rankings-section-title">🏆 Classifica Generale</h3>
                        <div className="leaderboard-container">
                            {playersWithOverall.slice(0, showMoreOverall ? undefined : 20).map((player, index) => (
                                <div
                                    key={player.id}
                                    className={`leaderboard-item ${index < 3 ? `rank-${index + 1}` : ''}`}
                                    onClick={() => onViewProfile(player.id)}
                                >
                                    <div className="rank-number">
                                        {index === DISPLAY.GOLD_POSITION ? '🥇' : index === DISPLAY.SILVER_POSITION ? '🥈' : index === DISPLAY.BRONZE_POSITION ? '🥉' : `${index + 1}.`}
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

                        {playersWithOverall.length > 20 && (
                            <button className="btn-expand" onClick={() => setShowMoreOverall(!showMoreOverall)}>
                                {showMoreOverall ? '⬆️ Mostra meno' : `⬇️ Mostra altri ${playersWithOverall.length - 20}`}
                            </button>
                        )}
                    </div>
                </section>

                <section className={`leaderboard-tabpanel ${activeTab === 'macro' ? '' : 'leaderboard-tabpanel--hidden'}`}>
                    <h3 className="rankings-section-title" style={{ marginTop: 0 }}>📈 Classifiche per Macrocategoria</h3>
                    <div className="rankings-macro-grid">
                        <div className="rankings-macro-card rankings-macro-tecnica" onClick={() => openMacroDetail('tecniche')}>
                            <div className="rankings-macro-header">
                                <span className="rankings-macro-emoji">🎯</span>
                                <span className="rankings-macro-title">Tecnica</span>
                            </div>

                            <div className="rankings-compact-list">
                                {getPlayersForMacro('tecniche').slice(0, showMoreMacros.tecniche ? undefined : 10).map((player, index) => (
                                    <div key={player.id} className="rankings-compact-item" onClick={(e) => { e.stopPropagation(); onViewProfile(player.id); }}>
                                        <div className="rank-number">{index === DISPLAY.GOLD_POSITION ? '🥇' : index === DISPLAY.SILVER_POSITION ? '🥈' : index === DISPLAY.BRONZE_POSITION ? '🥉' : `${index + 1}.`}</div>
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

                            {getPlayersForMacro('tecniche').length > 10 && (
                                <button
                                    className="btn-expand-small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowMoreMacros(prev => ({ ...prev, tecniche: !prev.tecniche }));
                                    }}
                                >
                                    {showMoreMacros.tecniche ? '⬆️ Mostra meno' : `⬇️ Mostra tutti (${getPlayersForMacro('tecniche').length})`}
                                </button>
                            )}
                        </div>
                        <div className="rankings-macro-card rankings-macro-tattica" onClick={() => openMacroDetail('tattiche')}>
                            <div className="rankings-macro-header">
                                <span className="rankings-macro-emoji">🧠</span>
                                <span className="rankings-macro-title">Tattica</span>
                            </div>

                            <div className="rankings-compact-list">
                                {getPlayersForMacro('tattiche').slice(0, showMoreMacros.tattiche ? undefined : 10).map((player, index) => (
                                    <div key={player.id} className="rankings-compact-item" onClick={(e) => { e.stopPropagation(); onViewProfile(player.id); }}>
                                        <div className="rank-number">{index === DISPLAY.GOLD_POSITION ? '🥇' : index === DISPLAY.SILVER_POSITION ? '🥈' : index === DISPLAY.BRONZE_POSITION ? '🥉' : `${index + 1}.`}</div>
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

                            {getPlayersForMacro('tattiche').length > 10 && (
                                <button
                                    className="btn-expand-small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowMoreMacros(prev => ({ ...prev, tattiche: !prev.tattiche }));
                                    }}
                                >
                                    {showMoreMacros.tattiche ? '⬆️ Mostra meno' : `⬇️ Mostra tutti (${getPlayersForMacro('tattiche').length})`}
                                </button>
                            )}
                        </div>
                        <div className="rankings-macro-card rankings-macro-fisica" onClick={() => openMacroDetail('fisiche')}>
                            <div className="rankings-macro-header">
                                <span className="rankings-macro-emoji">💪</span>
                                <span className="rankings-macro-title">Fisica</span>
                            </div>

                            <div className="rankings-compact-list">
                                {getPlayersForMacro('fisiche').slice(0, showMoreMacros.fisiche ? undefined : 10).map((player, index) => (
                                    <div key={player.id} className="rankings-compact-item" onClick={(e) => { e.stopPropagation(); onViewProfile(player.id); }}>
                                        <div className="rank-number">{index === DISPLAY.GOLD_POSITION ? '🥇' : index === DISPLAY.SILVER_POSITION ? '🥈' : index === DISPLAY.BRONZE_POSITION ? '🥉' : `${index + 1}.`}</div>
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

                            {getPlayersForMacro('fisiche').length > 10 && (
                                <button
                                    className="btn-expand-small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowMoreMacros(prev => ({ ...prev, fisiche: !prev.fisiche }));
                                    }}
                                >
                                    {showMoreMacros.fisiche ? '⬆️ Mostra meno' : `⬇️ Mostra tutti (${getPlayersForMacro('fisiche').length})`}
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                <section className={`leaderboard-tabpanel ${activeTab === 'skill' ? '' : 'leaderboard-tabpanel--hidden'}`}>
                    <h3 className="rankings-section-title" style={{ marginTop: 0 }}>⚡ Top 5 per ogni Skill</h3>
                    <div className="rankings-skills-grid">
                        {Object.keys(SKILLS).flatMap(category =>
                            SKILLS[category].map(skill => {
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
                                            {playersForSkill.slice(0, 5).map((player, index) => (
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
                </section>

                <section className={`leaderboard-tabpanel ${activeTab === 'matches' ? '' : 'leaderboard-tabpanel--hidden'}`}>
                    <div className="rankings-overall-section">
                        <h3 className="rankings-section-title">⚽ Classifica Presenze</h3>
                        <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '20px', textAlign: 'center' }}>
                            Classifica basata sul numero di partite giocate
                        </p>

                        {playersWithMatches.length === 0 ? (
                            <div className="no-votes">
                                <p>Nessuna partita completata ancora.</p>
                            </div>
                        ) : (
                            <div className="leaderboard-container">
                                {playersWithMatches.slice(0, showMoreMatches ? undefined : 20).map((player, index) => (
                                    <div
                                        key={player.id}
                                        className={`leaderboard-item ${index < 3 ? `rank-${index + 1}` : ''}`}
                                        onClick={() => onViewProfile(player.id)}
                                    >
                                        <div className="rank-number">
                                            {index === DISPLAY.GOLD_POSITION ? '🥇' : index === DISPLAY.SILVER_POSITION ? '🥈' : index === DISPLAY.BRONZE_POSITION ? '🥉' : `${index + 1}.`}
                                        </div>
                                        <div className="avatar">
                                            {player.avatar ? <img src={player.avatar} alt={player.name} /> : utils.getInitials(player.name)}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: '600', fontSize: '18px' }}>
                                                {player.name} {player.isGoalkeeper && '🧤'}
                                            </div>
                                            <div style={{ fontSize: '13px', opacity: 0.8 }}>
                                                {player.matchCount} partite
                                                {player.overall && ` • OVR: ${utils.toBase10(player.overall).toFixed(1)}`}
                                            </div>
                                        </div>
                                        <div style={{ fontWeight: '800', fontSize: '28px' }}>{player.matchCount}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {playersWithMatches.length > 20 && (
                            <button className="btn-expand" onClick={() => setShowMoreMatches(!showMoreMatches)}>
                                {showMoreMatches ? '⬆️ Mostra meno' : `⬇️ Mostra altri ${playersWithMatches.length - 20}`}
                            </button>
                        )}
                    </div>
                </section>
                <section className={`leaderboard-tabpanel ${activeTab === 'rendimento' ? '' : 'leaderboard-tabpanel--hidden'}`}>
                    <div className="rankings-overall-section">
                        <h3 className="rankings-section-title">📊 Classifica Rendimento</h3>
                        <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '20px', textAlign: 'center' }}>
                            Media voti delle ultime {CLASSIFICATION_FORMULA.RECENT_MATCHES_FOR_PERFORMANCE} partite
                        </p>

                        {playersWithPerformance.length === 0 ? (
                            <div className="no-votes">
                                <p>Nessun giocatore ha completato almeno {CLASSIFICATION_FORMULA.MIN_MATCHES_FOR_PERFORMANCE} partite con voti disponibili.</p>
                            </div>
                        ) : (
                            <div className="leaderboard-container">
                                {playersWithPerformance.slice(0, showMorePerformance ? undefined : 20).map((player, index) => (
                                    <div
                                        key={player.id}
                                        className={`leaderboard-item ${index < 3 ? `rank-${index + 1}` : ''}`}
                                        onClick={() => onViewProfile(player.id)}
                                    >
                                        <div className="rank-number">
                                            {index === DISPLAY.GOLD_POSITION ? '🥇' : index === DISPLAY.SILVER_POSITION ? '🥈' : index === DISPLAY.BRONZE_POSITION ? '🥉' : `${index + 1}.`}
                                        </div>
                                        <div className="avatar">
                                            {player.avatar ? <img src={player.avatar} alt={player.name} /> : utils.getInitials(player.name)}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: '600', fontSize: '18px' }}>
                                                {player.name} {player.isGoalkeeper && '🧤'}
                                            </div>
                                            <div style={{ fontSize: '13px', opacity: 0.8 }}>
                                                {player.matchCount} partite
                                                {player.overall && ` • OVR: ${utils.toBase10(player.overall).toFixed(1)}`}
                                            </div>
                                        </div>
                                        <div style={{ fontWeight: '800', fontSize: '28px', color: 'var(--volt)' }}>
                                            {player.performance.toFixed(2)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {playersWithPerformance.length > 20 && (
                            <button className="btn-expand" onClick={() => setShowMorePerformance(!showMorePerformance)}>
                                {showMorePerformance ? '⬆️ Mostra meno' : `⬇️ Mostra altri ${playersWithPerformance.length - 20}`}
                            </button>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}

export default ClassifichePage;