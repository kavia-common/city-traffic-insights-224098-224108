import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchLiveTraffic } from '../services/api';

// PUBLIC_INTERFACE
/**
 * Live traffic map view.
 * Renders a Leaflet map centered on a default city location and overlays:
 * - congested segments as polylines with color by intensity
 * - incident points as circle markers
 *
 * Polls the backend every 5 seconds to simulate live updates.
 */
export default function MapView() {
  const [live, setLive] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const center = useMemo(() => ({ lat: 12.9716, lng: 77.5946 }), []); // Bangalore default

  useEffect(() => {
    let mounted = true;
    let timer;
    const load = async () => {
      try {
        const data = await fetchLiveTraffic();
        if (mounted) {
          setLive(data);
          setError('');
          setLoading(false);
        }
      } catch (e) {
        if (mounted) {
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
  }, []);

  const segments = live?.segments || []; // [{id, coords:[[lat,lng],...], intensity:0-1}]
  const incidents = live?.incidents || []; // [{id, lat, lng, severity:1-5, label}]

  const colorForIntensity = (x) => {
    // 0 -> green, 1 -> red
    const r = Math.round(255 * x);
    const g = Math.round(180 * (1 - x));
    return `rgb(${r},${g},80)`;
  };

  return (
    <div>
      <div className="card map-container" aria-busy={loading}>
        <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
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

      {error ? (
        <div role="alert" style={{ color: '#EF4444', marginTop: 8 }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}
