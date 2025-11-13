# Traffic Insights Frontend (React)

Modern dashboard with navigation between Live Map and Analytics.

## Features

- Live Map using Leaflet with polling from `/api/traffic/live`
- Analytics with Recharts pulling `/api/traffic/history` and `/api/traffic/predict`
- Ocean Professional theme (blue primary, amber accent), subtle shadows and rounded surfaces
- Centralized API base URL via environment variables (no hardcoded URLs)
- Accessible, responsive layout with sidebar navigation

## Environment Variables

The API base URL is discovered in this order:
1. `REACT_APP_API_BASE`
2. `REACT_APP_BACKEND_URL`
3. Same-origin (window.location.origin) as a final fallback

Example `.env.development`:
```
REACT_APP_API_BASE=http://localhost:3001
```

Note: Do not commit real environment files. Only document variable names.

## Scripts

- `npm start` - start dev server
- `npm test` - run tests
- `npm run build` - production build

## Dependencies

- Leaflet + react-leaflet for base map
- Recharts for charts

## Client-side Normalized API Shapes

The API client (src/services/api.js) normalizes all responses to stable shapes so UI components are decoupled from backend variations (simulated, TomTom, DB aggregation):

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

Components render percentages by multiplying by 100; they no longer perform their own normalization.

## City propagation

All requests automatically append `?city=<SelectedCity>` to ensure multi-city support. The selected city is controlled in App.js and passed down to MapView and Analytics.

## Empty/real-data fallback

- Map renders an informational card when there are no segments/incidents.
- Analytics shows a friendly message when history/prediction are empty.
- Errors are surfaced via accessible alerts.

