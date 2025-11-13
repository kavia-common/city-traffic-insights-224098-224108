# Traffic Insights Frontend (React)

Modern dashboard with navigation between Live Map and Analytics.

## Quickstart

1) Backend
- Ensure the backend is running on http://localhost:3001 (default). See backend README for its setup.
- OpenAPI docs: http://localhost:3001/docs and /openapi.json.

2) Frontend environment
- Copy .env.development.example to .env.development
- Set the API base (defaults to backend localhost port):
  REACT_APP_API_BASE=http://localhost:3001

The API base URL is discovered in this order:
1. REACT_APP_API_BASE
2. REACT_APP_BACKEND_URL
3. Same-origin (window.location.origin) as a final fallback

Note: Do not commit real environment files. Only document variable names.

3) Install and run
- npm install
- npm start
The app will start at http://localhost:3000 and call the backend at REACT_APP_API_BASE.

## Features

- Live Map using Leaflet with polling from `/api/traffic/live`
- Analytics with Recharts pulling `/api/traffic/history` and `/api/traffic/predict`
- Ocean Professional theme (blue primary, amber accent), subtle shadows and rounded surfaces
- Centralized API base URL via environment variables (no hardcoded URLs)
- Accessible, responsive layout with sidebar navigation

## Environment Variables

- REACT_APP_API_BASE: Base URL of the backend for API calls (recommended)
- REACT_APP_BACKEND_URL: Optional fallback if REACT_APP_API_BASE is not provided

Example `.env.development`:
```
REACT_APP_API_BASE=http://localhost:3001
```

## City support

- Supported cities: Bangalore, Mumbai, Delhi.
- The UI city selector is in the header; selected city is propagated to all API requests.
- All requests automatically append `?city=<SelectedCity>` via the API client.

## Normalized API responses (client-side)

The API client (src/services/api.js) normalizes all responses so components stay stable across backend sources (simulated, TomTom, or DB):

- Live traffic:
  - fetchLiveTraffic(city) ->
    {
      segments: [{ id, coords: [[lat, lng], ...], intensity }],
      incidents: [{ id, lat, lng, severity, label }]
    }
- History:
  - fetchTrafficHistory(from, to, city) -> { points: [{ t, congestion }] } where congestion is 0..1
- Prediction:
  - fetchTrafficPrediction(horizonMinutes, city) -> { points: [{ t, congestion }] } where congestion is 0..1

Components render percentages by multiplying by 100; they do not perform their own normalization.

## Empty/real-data fallback

- Map renders an informational card when there are no segments/incidents.
- Analytics shows a friendly message when history/prediction are empty.
- Errors are surfaced via accessible alerts.

## Scripts

- npm start - start dev server
- npm test - run tests
- npm run build - production build

## Dependencies

- Leaflet + react-leaflet for base map
- Recharts for charts
