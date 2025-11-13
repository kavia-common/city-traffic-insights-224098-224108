import React, { useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, Legend, Area, AreaChart, Bar, BarChart,
} from 'recharts';
import { fetchTrafficHistory, fetchTrafficPrediction } from '../services/api';

// PUBLIC_INTERFACE
/**
 * Analytics view for historical and predicted congestion.
 * - History line/area chart (avg congestion over time)
 * - Prediction bar/line for short-term horizon
 * @param {{ city: "Bangalore" | "Mumbai" | "Delhi" }} props
 */
export default function Analytics({ city = 'Bangalore' }) {
  const [from, to] = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 1000 * 60 * 60); // last 60 minutes
    return [start.toISOString(), end.toISOString()];
  }, []);
  const [history, setHistory] = useState([]);
  const [pred, setPred] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        const [h, p] = await Promise.all([
          fetchTrafficHistory(from, to, city, { signal: controller.signal }),
          fetchTrafficPrediction(30, city, { signal: controller.signal }),
        ]);

        if (!mounted) return;

        const historyPoints = Array.isArray(h?.points) ? h.points : [];
        const predictionPoints = Array.isArray(p?.points) ? p.points : [];

        // Convert 0..1 to percentage for display
        setHistory(
          historyPoints.map((pt) => ({
            t: pt.t,
            congestion: Math.round((pt.congestion ?? 0) * 100),
          }))
        );

        setPred(
          predictionPoints.map((pt) => ({
            t: pt.t,
            predicted: Math.round((pt.congestion ?? 0) * 100),
          }))
        );

        setError('');
        setLoading(false);
      } catch (e) {
        if (e.code === 'ABORTED') return;
        setHistory([]);
        setPred([]);
        setError(e?.message || 'Failed to load analytics data');
        setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [from, to, city]);

  const noData = history.length === 0 && pred.length === 0;

  return (
    <div className="analytics view-transition entered">
      {error ? (
        <div role="alert" style={{ color: '#EF4444', marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      <div className="card" style={{ padding: 16 }} aria-busy={loading ? 'true' : undefined}>
        <h3 style={{ margin: '0 0 8px 0', color: '#2563EB' }}>Historical Congestion (Last 60 min) — {city}</h3>
        <div style={{ height: 280, position: 'relative' }}>
          {loading ? (
            <div
              role="status"
              aria-live="polite"
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                zIndex: 1,
                background: 'rgba(255,255,255,0.6)',
                borderRadius: 10
              }}
            >
              <span className="spinner" aria-hidden="true" style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: 'var(--color-primary)', borderRadius: 999, animation: 'spin 0.8s linear infinite' }} />
              <span style={{ marginLeft: 8 }}>Loading…</span>
            </div>
          ) : null}
          {history.length === 0 && !loading ? (
            <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#6B7280' }}>
              No historical data.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="colorCong" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                <XAxis dataKey="t" tick={{ fontSize: 12 }} />
                <YAxis unit="%" tick={{ fontSize: 12 }} domain={[0, 100]} />
                <RTooltip />
                <Area type="monotone" dataKey="congestion" stroke="#2563EB" fillOpacity={1} fill="url(#colorCong)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginTop: 16 }}>
        <h3 style={{ margin: '0 0 8px 0', color: '#F59E0B' }}>Predicted Congestion (Next 30 min) — {city}</h3>
        <div style={{ height: 260 }}>
          {pred.length === 0 && !loading ? (
            <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#6B7280' }}>
              No prediction data.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pred}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                <XAxis dataKey="t" tick={{ fontSize: 12 }} />
                <YAxis unit="%" tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Legend />
                <RTooltip />
                <Bar dataKey="predicted" fill="#F59E0B" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginTop: 16 }}>
        <h3 style={{ margin: '0 0 8px 0' }}>Overlay: History vs Prediction — {city}</h3>
        <div style={{ height: 260 }}>
          {mergeByTime(history, pred).length === 0 && !loading ? (
            <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#6B7280' }}>
              Not enough data to overlay.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mergeByTime(history, pred)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                <XAxis dataKey="t" tick={{ fontSize: 12 }} />
                <YAxis unit="%" tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Legend />
                <RTooltip />
                <Line type="monotone" dataKey="congestion" stroke="#2563EB" dot={false} />
                <Line type="monotone" dataKey="predicted" stroke="#F59E0B" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {noData ? (
        <div className="card" style={{ padding: 12, marginTop: 8, color: '#374151' }}>
          No analytics data available for {city}. Try adjusting the time window or ensure backend data ingestion.
        </div>
      ) : null}
    </div>
  );
}

function mergeByTime(historyArr, predArr) {
  const map = new Map();
  historyArr.forEach((h) => {
    map.set(h.t, { t: h.t, congestion: h.congestion });
  });
  predArr.forEach((p) => {
    const existing = map.get(p.t) || { t: p.t };
    existing.predicted = p.predicted;
    map.set(p.t, existing);
  });
  return Array.from(map.values());
}
