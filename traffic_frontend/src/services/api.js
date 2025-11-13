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

// PUBLIC_INTERFACE
/**
 * Fetch latest live traffic data snapshot for map overlays.
 * Poll periodically to simulate live updates.
 */
export async function fetchLiveTraffic() {
  return safeFetchJson('/api/traffic/live');
}

// PUBLIC_INTERFACE
/**
 * Fetch historical aggregated traffic between two timestamps.
 * @param {string} from ISO datetime string
 * @param {string} to ISO datetime string
 */
export async function fetchTrafficHistory(from, to) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return safeFetchJson(`/api/traffic/history?${params.toString()}`);
}

// PUBLIC_INTERFACE
/**
 * Fetch short-term traffic predictions.
 * @param {number} horizonMinutes
 */
export async function fetchTrafficPrediction(horizonMinutes = 15) {
  const params = new URLSearchParams();
  if (horizonMinutes) params.set('horizonMinutes', String(horizonMinutes));
  return safeFetchJson(`/api/traffic/predict?${params.toString()}`);
}
