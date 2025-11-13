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

// PUBLIC_INTERFACE
/**
 * Fetch latest live traffic data snapshot for map overlays.
 * Poll periodically to simulate live updates.
 * @param {string} [city] Optional city ("Bangalore" | "Mumbai" | "Delhi")
 */
export async function fetchLiveTraffic(city) {
  return safeFetchJson(appendCity('/api/traffic/live', city));
}

// PUBLIC_INTERFACE
/**
 * Fetch historical aggregated traffic between two timestamps.
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
  return safeFetchJson(path);
}

// PUBLIC_INTERFACE
/**
 * Fetch short-term traffic predictions.
 * @param {number} horizonMinutes
 * @param {string} [city] Optional city ("Bangalore" | "Mumbai" | "Delhi")
 */
export async function fetchTrafficPrediction(horizonMinutes = 15, city) {
  const params = new URLSearchParams();
  if (horizonMinutes) params.set('horizonMinutes', String(horizonMinutes));
  let path = `/api/traffic/predict?${params.toString()}`;
  path = appendCity(path, city);
  return safeFetchJson(path);
}
