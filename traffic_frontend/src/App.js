import React, { useEffect, useState } from 'react';
import './App.css';
import './theme.css';
import MapView from './components/MapView';
import Analytics from './components/Analytics';
import { getApiBaseUrl } from './services/api';

// PUBLIC_INTERFACE
function App() {
  const [theme, setTheme] = useState('light');
  const [view, setView] = useState('map'); // 'map' | 'analytics'

  // Apply theme to document element for optional dark/light variations
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const apiBase = getApiBaseUrl();

  return (
    <div className="app-shell">
      <header className="header">
        <div className="brand" aria-label="Traffic Insights">
          <span style={{
            width: 12, height: 12, borderRadius: 12, background: '#2563EB', display: 'inline-block'
          }}></span>
          Traffic Insights
        </div>
        <div className="header-actions">
          <span style={{ fontSize: 12, color: '#374151' }}>API: {apiBase || 'same-origin'}</span>
          <button 
            className="btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
      </header>

      <aside className="sidebar">
        <nav className="nav" aria-label="Primary">
          <button
            className={view === 'map' ? 'active' : ''}
            onClick={() => setView('map')}
          >
            🗺️ Live Map
          </button>
          <button
            className={view === 'analytics' ? 'active' : ''}
            onClick={() => setView('analytics')}
          >
            📈 Analytics
          </button>
        </nav>
      </aside>

      <main className="main">
        {view === 'map' ? <MapView /> : <Analytics />}
      </main>
    </div>
  );
}

export default App;
