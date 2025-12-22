// src/components/Navigation/Header.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import React, { useState } from 'react';
import utils from '../../utils.js';

function Header({ user, onLogout, onOpenSettings, setActiveTab }) {
    console.log('🔍 Header received user:', user);
    console.log('🔍 user.email:', user?.email);
    console.log('🔍 typeof user:', typeof user);
    console.log('🔍 user keys:', user ? Object.keys(user) : 'null');
    const [showMenu, setShowMenu] = useState(false);

    // CLAUSOLA DI PROTEZIONE (GUARD CLAUSE)
    // Se 'user' non è definito o è null, non renderizzare nulla o renderizza un placeholder vuoto.
    // L'App.jsx (o index.html) dovrebbe già gestire il reindirizzamento ad AuthPage, 
    // ma questa è una protezione extra.
    if (!user) {
        return null; // Non renderizza l'header se non c'è utente
    }
    return (
        <div className="header">
            <div className="header-left">
                <h1>⚽ Sport<span style={{ color: 'var(--volt)' }}>ivity</span></h1>
                <p>Giocare con gli amici e sentirsi dentro Fifa!</p>
            </div>
            <div className="user-info" style={{ position: 'relative' }}>
                <div
                    className="avatar"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setShowMenu(!showMenu)}
                >
                    {user.avatar ? <img src={user.avatar} alt={user.name} /> : utils.getInitials(user.name)}
                </div>
                <div onClick={() => setShowMenu(!showMenu)} style={{ cursor: 'pointer' }}>
                    <div className="user-name">{user.name}</div>
                    <div className="user-email">{user.email || 'Email non disponibile'}</div>
                </div>
                <button
                    className="user-menu-btn"
                    onClick={() => setShowMenu(!showMenu)}
                >
                    {showMenu ? '✕' : '☰'}
                </button>
                {showMenu && (
                    <div className="user-dropdown-menu">
                        <button className="dropdown-item" onClick={() => { onOpenSettings(); setShowMenu(false); }}>
                            ⚙️ Impostazioni
                        </button>
                        {user.isAdmin && (
                            <>
                                <button className="dropdown-item" onClick={() => { setActiveTab('admin'); setShowMenu(false); }}>
                                    🔧 Pannello Admin
                                </button>
                                <button className="dropdown-item" onClick={() => { setActiveTab('debug'); setShowMenu(false); }}>
                                    🛠 Debug
                                </button>
                            </>
                        )}
                        <button className="dropdown-item logout" onClick={() => { onLogout(); setShowMenu(false); }}>
                            🚪 Esci
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Header;