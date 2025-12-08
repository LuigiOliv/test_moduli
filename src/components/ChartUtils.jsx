// src/components/ChartUtils.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

const { useEffect, useRef } = window.React;

/**
 * Componente Wrapper per Chart.js.
 * @param {object} chartData - I dati da passare al grafico (labels, datasets).
 * @param {string} chartType - Il tipo di grafico ('line', 'bar', 'radar', etc.).
 * @param {object} options - Opzioni di configurazione per Chart.js.
 */
function ChartComponent({ chartData, chartType, options = {} }) {
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);

    // Effetto per distruggere e ricreare il grafico quando i dati cambiano
    useEffect(() => {
        // Contesto del Canvas
        const ctx = chartRef.current.getContext('2d');

        // Se esiste già un'istanza, distruggila prima di crearne una nuova
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        // Crea una nuova istanza di Chart
        chartInstanceRef.current = new window.Chart(ctx, {
            type: chartType,
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false, // Permette al CSS di gestirne le dimensioni
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: false,
                    }
                },
                // Unisce le opzioni predefinite con quelle passate come prop
                ...options
            }
        });

        // Cleanup: distrugge il grafico quando il componente viene smontato
        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
                chartInstanceRef.current = null;
            }
        };
    }, [chartData, chartType, options]); 
    // Nota: L'oggetto 'options' dovrebbe essere stabile (es. passato tramite useMemo)
    // per evitare ricreazioni inutili.

    // Il wrapper div gestisce la dimensione, il canvas è dove Chart.js disegna.
    return (
        <div className="chart-canvas-wrapper" style={{ height: '100%', width: '100%' }}>
            <canvas ref={chartRef}></canvas>
        </div>
    );
}

export default ChartComponent;