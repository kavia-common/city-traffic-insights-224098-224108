import React, { useEffect, useMemo, useState } from 'react';
import { fetchHistory, fetchPredict } from '../services/api';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Legend,
} from 'recharts';

// PUBLIC_INTERFACE
export default function Analytics({ city = 'Bangalore' }) {
  /** Analytics component: fetches history and predictions, renders charts with loading and theme support. */
  const [historyPoints, setHistoryPoints] = useState([]);
  const [predictSeries, setPredictSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isDark = usePrefersDark();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const [hist, pred] = await Promise.all([
          fetchHistory({ city, format: 'points' }),
          fetchPredict({ city, horizonMinutes: 30 }),
        ]);
        if (!mounted) return;

        setHistoryPoints(hist?.points || []);
        const series = (pred?.timeSeries || []).map(s => ({
          id: s.id,
          points: s.points || [],
        }));
        setPredictSeries(series);
      } catch (e) {
        if (!mounted) return;
        setError(e.message || 'Failed to load analytics');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [city]);

  const avgPredPoints = useMemo(() => {
    // average congestion across segments for each timestamp
    if (!predictSeries.length) return [];
    const length = predictSeries[0].points.length;
    const out = [];
    for (let i = 0; i < length; i++) {
      let sum = 0;
      let n = 0;
      let ts = '';
      for (const s of predictSeries) {
        const p = s.points[i];
        if (p) {
          sum += (p.congestion || 0);
          n += 1;
          ts = p.timestamp;
        }
      }
      if (n > 0) {
        out.push({ timestamp: ts, congestion: +(sum / n).toFixed(3) });
      }
    }
    return out;
  }, [predictSeries]);

  if (loading) {
    return (
      <div style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 240 }}>
        <Spinner isDark={isDark} />
      </div>
    );
  }

  if (error) {
    return <div style={{ color: '#EF4444', padding: 12 }}>Error: {error}</div>;
  }

  const textColor = isDark ? '#e5e7eb' : '#111827';
  const gridColor = isDark ? '#374151' : '#e5e7eb';
  const surface = isDark ? '#111827' : '#ffffff';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
      <section style={{ background: surface, borderRadius: 12, padding: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
        <h3 style={{ margin: '4px 0 12px', color: textColor }}>Last 60 minutes - Avg Congestion</h3>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={historyPoints}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" hide />
              <YAxis domain={[0, 1]} stroke={textColor} />
              <Tooltip labelStyle={{ color: textColor }} />
              <Legend />
              <Line type="monotone" dataKey="congestion" name="Congestion" stroke="#2563EB" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section style={{ background: surface, borderRadius: 12, padding: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
        <h3 style={{ margin: '4px 0 12px', color: textColor }}>Next 30 minutes - Predicted Congestion</h3>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={avgPredPoints}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" hide />
              <YAxis domain={[0, 1]} stroke={textColor} />
              <Tooltip labelStyle={{ color: textColor }} />
              <Bar dataKey="congestion" name="Congestion" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

function Spinner({ isDark }) {
  const color = isDark ? '#F59E0B' : '#2563EB';
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="4" fill="none" opacity="0.25" />
      <path fill={color} d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2z" />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </svg>
  );
}

function usePrefersDark() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const m = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    if (!m) return;
    const handler = (e) => setIsDark(!!e.matches);
    setIsDark(!!m.matches);
    m.addEventListener ? m.addEventListener('change', handler) : m.addListener(handler);
    return () => {
      m.removeEventListener ? m.removeEventListener('change', handler) : m.removeListener(handler);
    };
  }, []);
  return isDark;
}
