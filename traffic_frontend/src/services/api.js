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

/**
 * Normalize raw backend "live" response into:
 * {
 *   segments: [{ id, coords: [[lat, lng], ...], intensity: 0..1 }],
 *   incidents: [{ id, lat, lng, severity, label }]
 * }
 * Accepts multiple backend shapes (segments[], features[], GeoJSON).
 */
function normalizeLiveResponse(raw, city) {
  const out = { segments: [], incidents: [] };

  if (!raw || typeof raw !== 'object') return out;

  // Helper: clamp 0..1
  const clamp01 = (x) => isFinite(x) ? Math.max(0, Math.min(1, x)) : 0;

  // Normalize incidents
  const rawIncidents = Array.isArray(raw.incidents) ? raw.incidents : [];
  out.incidents = rawIncidents.map((i, idx) => {
    // Try various shapes for coordinates
    let lat = i.lat;
    let lng = i.lng;
    if ((Array.isArray(i.coord) || Array.isArray(i.coords)) && (i.coord?.length >= 2 || i.coords?.length >= 2)) {
      const arr = i.coord || i.coords;
      // Best guess: if appears [lng,lat], flip to [lat,lng]
      const a = arr;
      // If values look like Bangalore bounds, flip accordingly
      // Simple heuristic: lat should be in [-90,90], lng in [-180,180]
      if (typeof a[0] === 'number' && typeof a[1] === 'number') {
        const looksLngLat = Math.abs(a[0]) > Math.abs(a[1]); // often lng magnitude > lat around India
        if (looksLngLat) {
          lat = a[1];
          lng = a[0];
        } else {
          lat = a[0];
          lng = a[1];
        }
      }
    }
    return {
      id: i.id ?? `inc-${idx}`,
      lat: typeof lat === 'number' ? lat : undefined,
      lng: typeof lng === 'number' ? lng : undefined,
      severity: i.severity ?? i.level ?? 1,
      label: i.label ?? i.title ?? '',
    };
  }).filter(i => typeof i.lat === 'number' && typeof i.lng === 'number');

  const pushSegment = (seg) => {
    if (!seg) return;
    const id = seg.id ?? `seg-${out.segments.length}`;
    let intensity = seg.intensity;
    if (typeof intensity !== 'number') {
      // Map from congestion (0..1) or density/speed heuristics
      if (typeof seg.congestion === 'number') intensity = seg.congestion;
      else if (typeof seg.densityVpkm === 'number') {
        // simple mapping: higher density -> higher intensity; assume 0..200 vpkm
        intensity = clamp01(seg.densityVpkm / 200);
      } else if (typeof seg.speedKph === 'number') {
        // lower speed -> higher intensity; assume 0..80 kph
        intensity = clamp01(1 - (seg.speedKph / 80));
      } else intensity = 0.5;
    }
    intensity = clamp01(intensity);

    // Normalize coords to [[lat,lng], ...]
    let coords = [];
    if (Array.isArray(seg.coords)) {
      coords = seg.coords;
    } else if (Array.isArray(seg.coordinates)) {
      coords = seg.coordinates;
    } else if (Array.isArray(seg.path)) {
      coords = seg.path;
    }

    // Some backends deliver GeoJSON: geometry: { type: "LineString", coordinates: [[lng,lat], ...] }
    if ((!coords || coords.length === 0) && seg.geometry && Array.isArray(seg.geometry.coordinates)) {
      coords = seg.geometry.coordinates;
    }

    // Convert to [lat,lng]
    const normCoords = Array.isArray(coords) ? coords.map((p) => {
      if (!Array.isArray(p) || p.length < 2) return null;
      const a = p;
      if (typeof a[0] === 'number' && typeof a[1] === 'number') {
        // Most sources provide [lng, lat] (GeoJSON). Flip to [lat, lng].
        const lat = a[1];
        const lng = a[0];
        return [lat, lng];
      }
      return null;
    }).filter(Boolean) : [];

    if (normCoords.length >= 2) {
      out.segments.push({ id, coords: normCoords, intensity });
    }
  };

  // Case 1: Already segments
  if (Array.isArray(raw.segments) && raw.segments.length) {
    raw.segments.forEach(pushSegment);
  }
  // Case 2: GeoJSON-like features
  else if (Array.isArray(raw.features) && raw.features.length) {
    raw.features.forEach((f, idx) => {
      const props = f.properties || {};
      pushSegment({
        id: props.id ?? f.id ?? `feat-${idx}`,
        intensity: props.intensity ?? props.congestion ?? props.densityVpkm,
        densityVpkm: props.densityVpkm,
        speedKph: props.speedKph,
        geometry: f.geometry,
      });
    });
  }

  // Minimal fallback: if nothing came back, synthesize 1-2 short segments so the UI is not empty.
  if (out.segments.length === 0) {
    const centers = {
      Bangalore: { lat: 12.9716, lng: 77.5946 },
      Mumbai: { lat: 19.076, lng: 72.8777 },
      Delhi: { lat: 28.6139, lng: 77.209 },
    };
    const c = centers[city] || centers.Bangalore;
    const dLat = 0.01;
    const dLng = 0.01;
    out.segments.push({
      id: 'synthetic-1',
      coords: [
        [c.lat - dLat, c.lng - dLng],
        [c.lat, c.lng],
        [c.lat + dLat, c.lng + dLng],
      ],
      intensity: 0.6,
    });
  }

  return out;
}

// PUBLIC_INTERFACE
export async function fetchLive(city = 'Bangalore') {
  /**
   * Fetch live traffic snapshot and normalize to { segments, incidents }:
   * - Converts [lng,lat] -> [lat,lng] for Leaflet.
   * - Maps intensity from congestion/density/speed if needed.
   * - Provides a minimal fallback segment if backend is empty.
   */
  const base = getApiBase();
  const url = `${base}/api/traffic/live?city=${encodeURIComponent(city)}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`Live request failed: ${res.status}`);
  const raw = await res.json();
  return normalizeLiveResponse(raw, city);
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
