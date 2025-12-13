// src/components/RatingForm.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import { useState } from 'react';
import utils from '../utils.js';
import { getSkillsForPlayer } from '../constants.js';

function RatingForm({ player, onSubmit, onCancel }) {
    const [ratings, setRatings] = useState({});
    const playerSkills = getSkillsForPlayer(player);

    const isComplete = () => {
        const allSkills = [...playerSkills.tecniche, ...playerSkills.tattiche, ...playerSkills.fisiche];
        return allSkills.every(skill => ratings[skill]);
    };

    const handleSubmit = () => {
        if (isComplete()) {
            onSubmit(player.id, ratings);
        } else {
            alert('Completa tutte le valutazioni prima di inviare');
        }
    };

    return (
        <div className="rating-form">
            <div className="form-header">
                <div className="avatar">
                    {player.avatar ? <img src={player.avatar} alt={player.name} /> : utils.getInitials(player.name)}
                </div>
                <h2>Valuta {player.name} {player.isGoalkeeper && '🧤'}</h2>
                <p>Scala: 1=Scarso | 2=Sufficiente | 3=Buono | 4=Ottimo</p>
            </div>
            {Object.entries(playerSkills).map(([category, skills]) => (
                <div key={category} className="category-section">
                    <div className={`category-title category-${category}`}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                    </div>
                    {skills.map(skill => (
                        <div key={skill} className="skill-item">
                            <div className="skill-name">{skill}</div>
                            <div className="rating-buttons">
                                {[1, 2, 3, 4].map(value => (
                                    <button
                                        key={value}
                                        className={`rating-btn ${ratings[skill] === value ? 'selected' : ''}`}
                                        onClick={() => setRatings(prev => ({ ...prev, [skill]: value }))}
                                    >
                                        {value}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ))}
            <div className="form-actions">
                <button className="btn btn-secondary" onClick={onCancel}>Annulla</button>
                <button className="btn btn-primary" onClick={handleSubmit} disabled={!isComplete()}>
                    ✓ Invia Valutazione
                </button>
            </div>
        </div>
    );
}

export default RatingForm;