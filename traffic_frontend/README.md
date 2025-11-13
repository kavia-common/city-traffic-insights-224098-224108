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

## Notes

This app expects the backend to provide:
- `GET /api/traffic/live` -> { segments: [{id, coords:[[lat,lng],...], intensity:0-1}], incidents: [{id, lat, lng, severity, label}] }
- `GET /api/traffic/history?from&to` -> { points: [{ t, congestion (0-1) }] }
- `GET /api/traffic/predict?horizonMinutes` -> { points: [{ t, congestion (0-1) }] }

The exact shape may vary; the UI normalizes common field names.
