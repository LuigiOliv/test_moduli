// src/main.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

// Importa il componente App e i moduli React globali
import App from './components/App.jsx';

// Dobbiamo definire le variabili globali React qui se stiamo usando Babel Standalone
// e non un bundler come Webpack/Vite.
const { useState, useEffect, useRef } = window.React;

/**
 * Funzione per il rendering dell'applicazione React.
 */
function initializeApp() {
    const rootElement = document.getElementById('root');

    if (!rootElement) {
        console.error("Elemento radice '#root' non trovato.");
        return;
    }

    // Qui App viene importato e usato come componente principale.
    try {
        ReactDOM.render(React.createElement(App), rootElement);
    } catch (error) {
        console.error("Errore durante il rendering di React:", error);
        // Visualizza un messaggio di errore leggibile se il caricamento fallisce
        rootElement.innerHTML = `
            <div style="color:white;text-align:center;padding:50px;">
                <h2>⚠️ Errore caricamento Moduli</h2>
                <p>Verifica che tutti i file (constants.js, storage.js, utils.js, e i componenti) siano presenti nella cartella 'src/' e che l'ordine degli script in index.html sia corretto.</p>
                <p>Dettaglio Errore: ${error.message}</p>
            </div>
        `;
    }
}

// Avvia l'applicazione solo quando il DOM è pronto.
document.addEventListener('DOMContentLoaded', initializeApp);