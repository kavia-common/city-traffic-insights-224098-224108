/**
 * Simple API client for traffic endpoints.
 * Uses REACT_APP_BACKEND_URL or falls back to relative /api.
 */

// PUBLIC_INTERFACE
export function getApiBase() {
  /** Returns the API base URL from environment or relative path. */
  const env = process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_BASE || '';
  if (env) return env.replace(/\/$/, '');
  return '';
}

// PUBLIC_INTERFACE
export async function fetchLive(city = 'Bangalore') {
  /** Fetch live traffic snapshot with normalized fields (lat, lon, congestion). */
  const base = getApiBase();
  const url = `${base}/api/traffic/live?city=${encodeURIComponent(city)}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`Live request failed: ${res.status}`);
  return res.json();
}

// PUBLIC_INTERFACE
export async function fetchHistory({ city = 'Bangalore', format = 'points', from, to } = {}) {
  /** Fetch last 60 minutes by default in Recharts-friendly points format. */
  const base = getApiBase();
  const params = new URLSearchParams({ city, format });
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const res = await fetch(`${base}/api/traffic/history?${params.toString()}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`History request failed: ${res.status}`);
  return res.json();
}

// PUBLIC_INTERFACE
export async function fetchPredict({ city = 'Bangalore', horizonMinutes = 30 } = {}) {
  /** Fetch predictions with default 30-minute horizon; includes timeSeries points. */
  const base = getApiBase();
  const params = new URLSearchParams({ city, horizonMinutes: String(horizonMinutes) });
  const res = await fetch(`${base}/api/traffic/predict?${params.toString()}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Predict request failed: ${res.status}`);
  return res.json();
}
