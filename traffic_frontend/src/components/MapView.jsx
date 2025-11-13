import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchLiveTraffic } from '../services/api';

// Helper to map city to center coordinates
const CITY_CENTERS = {
  Bangalore: { lat: 12.9716, lng: 77.5946 },
  Mumbai: { lat: 19.0760, lng: 72.8777 },
  Delhi: { lat: 28.6139, lng: 77.2090 },
};

// PUBLIC_INTERFACE
/**
 * Live traffic map view.
 * Renders a Leaflet map centered on selected city and overlays:
 * - congested segments as polylines with color by intensity
 * - incident points as circle markers
 *
 * Polls the backend every 5 seconds to simulate live updates and refreshes when city changes.
 * @param {{ city: "Bangalore" | "Mumbai" | "Delhi" }} props
 */
export default function MapView({ city = 'Bangalore' }) {
  const [live, setLive] = useState({ segments: [], incidents: [] });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const center = useMemo(() => CITY_CENTERS[city] || CITY_CENTERS.Bangalore, [city]);

  useEffect(() => {
    let mounted = true;
    let timer;
    const load = async () => {
      try {
        const data = await fetchLiveTraffic(city); // already normalized
        if (mounted) {
          setLive(data || { segments: [], incidents: [] });
          setError('');
          setLoading(false);
        }
      } catch (e) {
        if (mounted) {
          setLive({ segments: [], incidents: [] });
          setError('Failed to load live traffic');
          setLoading(false);
        }
      }
    };
    load();
    timer = setInterval(load, 5000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [city]);

  const segments = live?.segments || []; // normalized
  const incidents = live?.incidents || []; // normalized

  const colorForIntensity = (x) => {
    // 0 -> green, 1 -> red
    const r = Math.round(255 * x);
    const g = Math.round(180 * (1 - x));
    return `rgb(${r},${g},80)`;
  };

  // Component to recenter map when city changes
  function RecenterOnCity({ center }) {
    const map = useMap();
    useEffect(() => {
      map.setView(center, 12, { animate: true });
    }, [center, map]);
    return null;
  }

  const isEmpty = segments.length === 0 && incidents.length === 0;

  return (
    <div>
      <div className="card map-container" aria-busy={loading}>
        <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
          <RecenterOnCity center={center} />
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {segments.map((s) => (
            <Polyline
              key={s.id}
              positions={s.coords}
              pathOptions={{ color: colorForIntensity(s.intensity), weight: 6, opacity: 0.8 }}
            >
              <Tooltip>
                <div>
                  <strong>Segment {s.id}</strong>
                  <div>Congestion: {(s.intensity * 100).toFixed(0)}%</div>
                </div>
              </Tooltip>
            </Polyline>
          ))}
          {incidents.map((i) => (
            <CircleMarker
              key={i.id}
              center={[i.lat, i.lng]}
              radius={8}
              pathOptions={{ color: '#EF4444', fillColor: '#EF4444', fillOpacity: 0.8 }}
            >
              <Tooltip>
                <div>
                  <strong>Incident</strong>
                  <div>Severity: {i.severity}</div>
                  {i.label ? <div>{i.label}</div> : null}
                </div>
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {isEmpty && !loading && !error ? (
        <div className="card" style={{ padding: 12, marginTop: 8, color: '#374151' }}>
          No live overlays for {city} yet. Waiting for data...
        </div>
      ) : null}

      <div className="legend">
        <div className="item">
          <span className="dot" style={{ background: 'rgb(0,180,80)' }}></span>
          Low congestion
        </div>
        <div className="item">
          <span className="dot" style={{ background: 'rgb(255,90,80)' }}></span>
          High congestion
        </div>
        <div className="item">
          <span className="dot" style={{ background: '#EF4444' }}></span>
          Incidents
        </div>
      </div>

      <div className="stats-row">
        <div className="card stat">
          <h4>Current City</h4>
          <div className="value">{city}</div>
        </div>
      </div>

      {error ? (
        <div role="alert" style={{ color: '#EF4444', marginTop: 8 }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}
