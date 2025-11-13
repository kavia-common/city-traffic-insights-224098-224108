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
 */
export default function Analytics() {
  const [from, to] = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 1000 * 60 * 60); // last 60 minutes
    return [start.toISOString(), end.toISOString()];
  }, []);
  const [history, setHistory] = useState([]);
  const [pred, setPred] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const h = await fetchTrafficHistory(from, to);
        const p = await fetchTrafficPrediction(30);
        if (!mounted) return;

        // Normalize expected structures
        const historyPoints = Array.isArray(h?.points) ? h.points : [];
        const predictionPoints = Array.isArray(p?.points) ? p.points : [];

        setHistory(
          historyPoints.map((pt) => ({
            t: pt.t || pt.time || pt.timestamp,
            congestion: typeof pt.congestion === 'number' ? Math.round(pt.congestion * 100) : pt.value ?? 0,
          }))
        );
        setPred(
          predictionPoints.map((pt) => ({
            t: pt.t || pt.time || pt.timestamp,
            predicted: typeof pt.congestion === 'number' ? Math.round(pt.congestion * 100) : pt.value ?? 0,
          }))
        );
        setError('');
      } catch (e) {
        setError('Failed to load analytics data');
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [from, to]);

  return (
    <div className="analytics">
      {error ? (
        <div role="alert" style={{ color: '#EF4444', marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ margin: '0 0 8px 0', color: '#2563EB' }}>Historical Congestion (Last 60 min)</h3>
        <div style={{ height: 280 }}>
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
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginTop: 16 }}>
        <h3 style={{ margin: '0 0 8px 0', color: '#F59E0B' }}>Predicted Congestion (Next 30 min)</h3>
        <div style={{ height: 260 }}>
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
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginTop: 16 }}>
        <h3 style={{ margin: '0 0 8px 0' }}>Overlay: History vs Prediction</h3>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={mergeByTime(history, pred)}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
              <XAxis dataKey="t" tick={{ fontSize: 12 }} />
              <YAxis unit="%" tick={{ fontSize: 12 }} domain={[0, 100]} />
              <Legend />
              <RTooltip />
              <Line type="monotone" dataKey="congestion" stroke="#2563EB" dot={false} />
              <Line type="monotone" dataKey="predicted" stroke="#F59E0B" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
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
