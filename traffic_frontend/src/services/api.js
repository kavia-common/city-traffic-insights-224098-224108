 // PUBLIC_INTERFACE
 /**
  * API client for Traffic Insights frontend.
  * 
  * Resolves base URL from environment variables:
  * - Preferred: REACT_APP_API_BASE
  * - Fallback: REACT_APP_BACKEND_URL
  * - Final fallback: window.location.origin (proxy/same-origin dev)
  * 
  * All functions return JSON-parsed responses and handle network errors.
  * This module also NORMALIZES responses so components consume consistent shapes:
  * - Live: { segments: [{ id, coords: [[lat,lng],...], intensity }], incidents: [{ id, lat, lng, severity, label }] }
  * - History: { points: [{ t, congestion }] } where congestion is 0..1
  * - Predict: { points: [{ t, congestion }] } where congestion is 0..1
  */
export const getApiBaseUrl = () => {
  const base =
    process.env.REACT_APP_API_BASE ||
    process.env.REACT_APP_BACKEND_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  return base?.replace(/\/+$/, '');
};

async function safeFetchJson(path, options = {}) {
  const base = getApiBaseUrl();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      ...options,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Request failed: ${res.status} ${res.statusText} - ${text}`);
    }
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await res.json();
    }
    // Try parse json anyway, else return text
    try {
      return await res.json();
    } catch {
      return await res.text();
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('API error', { path, err: err?.message });
    throw err;
  }
}

/**
 * Append a city query parameter if provided.
 * Ensures we don't duplicate ? or & and keeps encoding correct.
 */
function appendCity(path, city) {
  if (!city) return path;
  const hasQuery = path.includes('?');
  const sep = hasQuery ? '&' : '?';
  const params = new URLSearchParams();
  params.set('city', city);
  return `${path}${sep}${params.toString()}`;
}

/**
 * Normalize live traffic responses into:
 * { segments: [{id, coords:[[lat,lng],...], intensity}], incidents: [{id, lat, lng, severity, label}] }
 */
function normalizeLive(resp) {
  const norm = { segments: [], incidents: [] };

  if (!resp || typeof resp !== 'object') return norm;

  // Many possible shapes: direct 'segments', TomTom-like 'flow' or 'features'
  const rawSegments = Array.isArray(resp.segments)
    ? resp.segments
    : Array.isArray(resp.flow)
      ? resp.flow
      : Array.isArray(resp.features)
        ? resp.features
        : [];

  norm.segments = rawSegments.map((s, idx) => {
    // Try to derive coordinates list
    let coords = s.coords;
    if (!Array.isArray(coords)) {
      // GeoJSON-like
      if (s.geometry?.coordinates) {
        // TomTom returns [lng,lat], ensure [lat,lng]
        const c = s.geometry.coordinates;
        if (Array.isArray(c[0])) {
          coords = c.map(p => Array.isArray(p) && p.length >= 2 ? [p[1], p[0]] : p).filter(Boolean);
        }
      } else if (Array.isArray(s.points)) {
        coords = s.points.map(p => [p.lat, p.lng]);
      }
    }
    if (!Array.isArray(coords)) coords = [];

    // intensity/confidence/score mapping to 0..1
    let intensity = s.intensity;
    if (typeof intensity !== 'number') {
      if (typeof s.congestion === 'number') intensity = s.congestion;
      else if (typeof s.score === 'number') intensity = s.score;
      else if (typeof s.speedRatio === 'number') {
        // derive from speed ratio (0..1 inverse congestion)
        intensity = 1 - Math.max(0, Math.min(1, s.speedRatio));
      } else {
        intensity = 0.4; // fallback mild congestion
      }
    }
    // clamp 0..1
    intensity = Math.max(0, Math.min(1, intensity));

    const id = s.id ?? s.segmentId ?? s.uid ?? `seg-${idx}`;
    return { id, coords, intensity };
  });

  const rawIncidents = Array.isArray(resp.incidents)
    ? resp.incidents
    : Array.isArray(resp.events)
      ? resp.events
      : [];

  norm.incidents = rawIncidents.map((i, idx) => {
    const lat = typeof i.lat === 'number' ? i.lat : i.location?.lat ?? i.position?.lat;
    const lng = typeof i.lng === 'number' ? i.lng : i.location?.lng ?? i.position?.lng;
    const severity = i.severity ?? i.level ?? 2;
    const label = i.label ?? i.description ?? i.type ?? '';
    const id = i.id ?? i.eventId ?? `inc-${idx}`;
    return { id, lat, lng, severity, label };
  }).filter(i => typeof i.lat === 'number' && typeof i.lng === 'number');

  return norm;
}

/**
 * Normalize time series responses into:
 * { points: [{ t, congestion }] } with congestion in 0..1
 */
function normalizeSeries(resp) {
  const out = { points: [] };
  if (!resp) return out;

  const src = Array.isArray(resp.points)
    ? resp.points
    : Array.isArray(resp.series)
      ? resp.series
      : Array.isArray(resp.data)
        ? resp.data
        : [];

  out.points = src.map((pt, idx) => {
    const t = pt.t ?? pt.time ?? pt.timestamp ?? pt.x ?? idx;
    let congestion = pt.congestion;
    if (typeof congestion !== 'number') {
      const v = pt.value ?? pt.y ?? pt.avg ?? pt.mean;
      // If percentage-like (0-100), convert to 0..1
      if (typeof v === 'number') {
        congestion = v > 1 ? v / 100 : v;
      } else {
        congestion = 0;
      }
    }
    // clamp
    congestion = Math.max(0, Math.min(1, congestion));
    return { t, congestion };
  });

  return out;
}

// PUBLIC_INTERFACE
/**
 * Fetch latest live traffic data snapshot for map overlays.
 * Poll periodically to simulate live updates.
 * Returns normalized: { segments: [...], incidents: [...] }
 * @param {string} [city] Optional city ("Bangalore" | "Mumbai" | "Delhi")
 */
export async function fetchLiveTraffic(city) {
  const raw = await safeFetchJson(appendCity('/api/traffic/live', city));
  return normalizeLive(raw);
}

// PUBLIC_INTERFACE
/**
 * Fetch historical aggregated traffic between two timestamps.
 * Returns normalized: { points: [{ t, congestion }] }
 * @param {string} from ISO datetime string
 * @param {string} to ISO datetime string
 * @param {string} [city] Optional city ("Bangalore" | "Mumbai" | "Delhi")
 */
export async function fetchTrafficHistory(from, to, city) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  let path = `/api/traffic/history?${params.toString()}`;
  path = appendCity(path, city);
  const raw = await safeFetchJson(path);
  return normalizeSeries(raw);
}

// PUBLIC_INTERFACE
/**
 * Fetch short-term traffic predictions.
 * Returns normalized: { points: [{ t, congestion }] }
 * @param {number} horizonMinutes
 * @param {string} [city] Optional city ("Bangalore" | "Mumbai" | "Delhi")
 */
export async function fetchTrafficPrediction(horizonMinutes = 15, city) {
  const params = new URLSearchParams();
  if (horizonMinutes) params.set('horizonMinutes', String(horizonMinutes));
  let path = `/api/traffic/predict?${params.toString()}`;
  path = appendCity(path, city);
  const raw = await safeFetchJson(path);
  return normalizeSeries(raw);
}
