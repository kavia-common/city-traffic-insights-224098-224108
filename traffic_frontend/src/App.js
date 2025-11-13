import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import './theme.css';
import MapView from './components/MapView';
import Analytics from './components/Analytics';
import { getApiBaseUrl } from './services/api';

// PUBLIC_INTERFACE
function App() {
  const [theme, setTheme] = useState('light');
  const [view, setView] = useState('map'); // 'map' | 'analytics'
  const [city, setCity] = useState('Bangalore'); // default city

  // refreshKey triggers immediate reload of live data in MapView
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Apply theme to document element for optional dark/light variations
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const apiBase = getApiBaseUrl();

  // Smooth enter animation on tab change
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    setEntered(false);
    const t = setTimeout(() => setEntered(true), 0);
    return () => clearTimeout(t);
  }, [view]);

  // PUBLIC_INTERFACE
  const triggerRefresh = () => {
    // start animation and bump refreshKey; auto-stop spinner after 1.2s
    setRefreshing(true);
    setRefreshKey(k => k + 1);
    setTimeout(() => setRefreshing(false), 1200);
  };

  const HeaderIcon = useMemo(() => (
    <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 10, height: 10, borderRadius: 999, background: '#2563EB', boxShadow: '0 0 0 2px rgba(37,99,235,0.25)' }} />
      <span role="img" aria-label="steering wheel">🛣️</span>
    </span>
  ), []);

  return (
    <div className="app-shell">
      <header className="header">
        <div className="brand" aria-label="Traffic Insights">
          {HeaderIcon}
          Traffic Insights
        </div>
        <div className="header-actions">
          <button
            className={`btn btn-refresh ${refreshing ? '' : 'idle'}`}
            onClick={triggerRefresh}
            aria-live="polite"
            aria-label="Refresh live data now"
            title="Refresh live data"
          >
            <span className="spinner" aria-hidden="true" />
            <span>Refresh</span>
          </button>
          <div aria-label="City Selector" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span role="img" aria-label="city" title="City">🏙️</span>
            <label htmlFor="city-select" style={{ fontSize: 12, color: '#374151' }}>City</label>
            <select
              id="city-select"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.12)',
                background: '#fff',
                color: '#111827'
              }}
              aria-label="Select City"
            >
              <option value="Bangalore">Bangalore</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Delhi">Delhi</option>
            </select>
          </div>
          <span style={{ fontSize: 12, color: '#374151' }}>
            <span role="img" aria-label="api" title="API">🔌</span> API: {apiBase || 'same-origin'}
          </span>
          <button
            className="btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title="Toggle theme"
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
            aria-current={view === 'map' ? 'page' : undefined}
            title="Live Map"
          >
            🗺️ Live Map
            <span className="nav-underline" />
          </button>
          <button
            className={view === 'analytics' ? 'active' : ''}
            onClick={() => setView('analytics')}
            aria-current={view === 'analytics' ? 'page' : undefined}
            title="Analytics"
          >
            📈 Analytics
            <span className="nav-underline" />
          </button>
        </nav>
      </aside>

      <main className="main">
        <div className={`view-transition ${entered ? 'entered' : ''}`}>
          {view === 'map'
            ? <MapView city={city} refreshKey={refreshKey} />
            : <Analytics city={city} />}
        </div>
      </main>
    </div>
  );
}

export default App;
