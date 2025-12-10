// src/components/App.jsx
// Minimal App entry to avoid JSX/module import errors while we stabilize the project.

const { useState, useEffect } = window.React || {};

function App() {
    const [now, setNow] = (useState && useState(new Date())) || [new Date(), () => {}];

    useEffect && useEffect(() => {
        const t = setInterval(() => {
            setNow(new Date());
        }, 1000);
        return () => clearInterval(t);
    }, []);

    return window.React.createElement(
        'div',
        { className: 'app-container' },
        window.React.createElement('header', { className: 'app-header' },
            window.React.createElement('div', { className: 'header-title' }, 'Calcetto Rating (minimal)')
        ),
        window.React.createElement('main', { className: 'app-main-content' },
            window.React.createElement('h2', null, 'App loaded'),
            window.React.createElement('p', null, 'Ora: ' + now.toLocaleTimeString())
        )
    );
}

export default App;
