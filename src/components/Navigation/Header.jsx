// src/components/Navigation/Header.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import utils from '../../utils.js';

const { useState } = window.React;

/**
 * Componente Header (Testata superiore con info utente e menu a tendina)
 * @param {object} user - L'utente corrente.
 * @param {function} onLogout - Callback per il logout.
 * @param {function} onOpenSettings - Callback per navigare direttamente alle impostazioni.
 */
function Header({ user, onLogout, onOpenSettings }) {
    const [showMenu, setShowMenu] = useState(false);
    
    // Funzione per chiudere il menu e chiamare il logout
    const handleLogoutClick = () => {
        setShowMenu(false);
        onLogout();
    };

    // Funzione per navigare alle impostazioni
    const handleSettingsClick = () => {
        setShowMenu(false);
        onOpenSettings();
    };

    return (
        <div className="header">
            <div className="header-left">
                <h1>⚽ Calcetto del <span style={{color: 'var(--volt)'}}>giovedì</span></h1>
                <p>Dedicata a quelli che il week-end inizia con la partitella</p>
            </div>
            
            <div className="header-right">
                <div 
                    className="user-info" 
                    // Classe CSS per gestire la posizione relativa e il cursor
                    onClick={() => setShowMenu(!showMenu)} 
                    aria-expanded={showMenu}
                >
                    <div className="avatar" title={user.displayName}>
                        {utils.getInitials(user.displayName)}
                    </div>
                    <div className="user-details">
                        <span className="user-nickname">{user.nickname || user.displayName}</span>
                        <span className="user-role">{user.role || 'Giocatore'}</span>
                    </div>
                </div>

                {/* Dropdown Menu (Menu a tendina) */}
                {showMenu && (
                    <div className="header-dropdown-menu">
                        <div className="menu-item disabled">
                            {user.email} {user.isAdmin && <span className="admin-tag">ADMIN</span>}
                        </div>
                        <div className="menu-separator"></div>
                        <div className="menu-item" onClick={handleSettingsClick}>
                            <span className="icon">⚙️</span> Impostazioni
                        </div>
                        <div className="menu-item logout" onClick={handleLogoutClick}>
                            <span className="icon">🚪</span> Logout
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Header;