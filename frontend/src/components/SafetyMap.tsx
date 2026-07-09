import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from "react-leaflet";
import L from "leaflet";
import { 
  Navigation, 
  MapPin, 
  Eye, 
  Lightbulb, 
  Users, 
  ShieldCheck, 
  Activity,
  Sparkles
} from "lucide-react";
import { api } from "../api";

// Fix Leaflet icon paths in React Vite
// @ts-ignore
import markerIcon from "leaflet/dist/images/marker-icon.png";
// @ts-ignore
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons for specialized markers
const originIcon = L.divIcon({
  html: '<div style="background-color: #00d1b2; width: 14px; height: 14px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 10px rgba(0,209,178,0.7);"></div>',
  className: "custom-div-icon",
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const destIcon = L.divIcon({
  html: '<div style="background-color: #ff3860; width: 14px; height: 14px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 10px rgba(255,56,96,0.7);"></div>',
  className: "custom-div-icon",
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const policeIcon = L.divIcon({
  html: '<div style="background-color: #485fc7; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: white; border: 2px solid white;">P</div>',
  className: "custom-div-icon",
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

// Rotterdam default coords
const ROTTERDAM: [number, number] = [51.9225, 4.47917];

// Rotterdam coordinate paths for routes
const ROUTE_COORDS = {
  route_1: [ // Fastest (Unsafe)
    [51.9225, 4.47917],
    [51.9210, 4.4820],
    [51.9180, 4.4830],
    [51.9160, 4.4860]
  ],
  route_2: [ // Well-lit
    [51.9225, 4.47917],
    [51.9230, 4.4840],
    [51.9200, 4.4870],
    [51.9160, 4.4860]
  ],
  route_3: [ // Safest AI-corridor
    [51.9225, 4.47917],
    [51.9240, 4.4810],
    [51.9230, 4.4880],
    [51.9180, 4.4890],
    [51.9160, 4.4860]
  ]
};

const SAFE_LOCATIONS = [
  { name: "Centrum Police Station", lat: 51.9238, lng: 4.4851, desc: "24/7 Police Presence" },
  { name: "Erasmus Medical Safe Haven", lat: 51.9175, lng: 4.4805, desc: "Emergency Care & Shelter" },
];

export default function SafetyMap() {
  const [origin, setOrigin] = useState("Centrum, Rotterdam");
  const [destination, setDestination] = useState("Erasmus University Area, Rotterdam");
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState("route_3");
  const [heatmapZones, setHeatmapZones] = useState([]);
  
  // Filters
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showWellLit, setShowWellLit] = useState(false);
  const [showFootTraffic, setShowFootTraffic] = useState(false);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRoutesAndHeatmap();
  }, []);

  const fetchRoutesAndHeatmap = async () => {
    setLoading(true);
    try {
      // Fetch routes
      const routeRes = await api.post("/navigation/routes", {
        origin: { lat: 51.9225, lng: 4.47917 },
        destination: { lat: 51.9160, lng: 4.4860 }
      });
      
      // Update routes mapping
      const routesList = routeRes.data.routes.map(r => {
        let details = "";
        let color = "";
        if (r.id === "route_1") {
          details = "Fastest path, but goes through isolated alleys & poor lighting.";
          color = "#ff3860"; // Red
        } else if (r.id === "route_2") {
          details = "Runs along main commercial streets with 90% streetlight coverage.";
          color = "#ffe08a"; // Yellow/Orange
        } else {
          details = "AI Safe Corridor. High camera density & active community responders.";
          color = "#48c78e"; // Green
        }
        return { ...r, details, color };
      });
      setRoutes(routesList);

      // Fetch heatmap
      const heatmapRes = await api.get("/navigation/heatmap", {
        params: {
          minLat: 51.9100,
          minLng: 4.4700,
          maxLat: 51.9300,
          maxLng: 4.4900
        }
      });
      setHeatmapZones(heatmapRes.data.zones || []);
    } catch (err) {
      console.error("Error fetching map data", err);
      // Local fallback data
      setRoutes([
        { id: "route_3", label: "Safest (AI-ranked)", safety_score: 94.6, color: "#48c78e", details: "AI Safe Corridor. High camera density & active community responders." },
        { id: "route_2", label: "Well-lit / high foot traffic", safety_score: 74.2, color: "#ffe08a", details: "Runs along main commercial streets with 90% streetlight coverage." },
        { id: "route_1", label: "Fastest", safety_score: 38.5, color: "#ff3860", details: "Fastest path, but goes through isolated alleys & poor lighting." }
      ]);
      setHeatmapZones([
        { lat: 51.9200, lng: 4.4825, risk_intensity: 0.82 },
        { lat: 51.9215, lng: 4.4865, risk_intensity: 0.65 },
        { lat: 51.9175, lng: 4.4840, risk_intensity: 0.74 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getScoreClass = (score) => {
    if (score >= 80) return "score-high";
    if (score >= 60) return "score-medium";
    return "score-low";
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Safe Navigation</h1>
          <p>Interactive safety scoring mapping, real-time lighting overlays, and crowdsourced hazard reporting.</p>
        </div>
        <div className="badge badge-success">
          <Activity size={14} />
          <span>Real-time safety engine online</span>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Map Panel */}
        <div className="glass map-wrapper">
          <MapContainer 
            center={ROTTERDAM} 
            zoom={14} 
            style={{ width: "100%", height: "100%" }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            
            {/* Heatmap zones */}
            {showHeatmap && heatmapZones.map((zone, idx) => (
              <Circle
                key={idx}
                center={[zone.lat, zone.lng]}
                radius={120}
                pathOptions={{
                  fillColor: "#ff3860",
                  fillOpacity: zone.risk_intensity * 0.45,
                  color: "#ff3860",
                  weight: 1,
                  dashArray: "4 4"
                }}
              >
                <Popup>
                  <div style={{ color: '#000', fontSize: '12px' }}>
                    <strong>Risk Hotspot Cluster</strong><br />
                    Confidence Weight: {(zone.risk_intensity * 100).toFixed(0)}%<br />
                    Harassment & Poor Lighting reported here recently.
                  </div>
                </Popup>
              </Circle>
            ))}

            {/* Police / Safe zones */}
            {SAFE_LOCATIONS.map((loc, idx) => (
              <Marker key={idx} position={[loc.lat, loc.lng]} icon={policeIcon}>
                <Popup>
                  <div style={{ color: '#000' }}>
                    <strong>{loc.name}</strong><br />
                    {loc.desc}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Render route lines */}
            {Object.keys(ROUTE_COORDS).map((rId) => {
              const isSelected = selectedRouteId === rId;
              const routeData = routes.find(r => r.id === rId);
              return (
                <Polyline
                  key={rId}
                  positions={ROUTE_COORDS[rId]}
                  pathOptions={{
                    color: isSelected ? (routeData?.color || "#fff") : "#4b5563",
                    weight: isSelected ? 6 : 3,
                    opacity: isSelected ? 1.0 : 0.4,
                  }}
                >
                  <Popup>
                    <div style={{ color: '#000' }}>
                      <strong>{routeData?.label}</strong><br />
                      Safety Score: {routeData?.safety_score}/100
                    </div>
                  </Popup>
                </Polyline>
              );
            })}

            {/* Start / End Markers */}
            <Marker position={[51.9225, 4.47917]} icon={originIcon}>
              <Popup><span style={{ color: '#000' }}>Start: {origin}</span></Popup>
            </Marker>
            <Marker position={[51.9160, 4.4860]} icon={destIcon}>
              <Popup><span style={{ color: '#000' }}>Destination: {destination}</span></Popup>
            </Marker>
          </MapContainer>

          {/* Floating Map Toggles */}
          <div className="glass map-control-panel">
            <div style={{ fontSize: '13px', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              Map Overlays
            </div>
            
            <div className="toggle-row">
              <span className="form-group" style={{ flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
                <Eye size={16} color="#ff3860" />
                <span style={{ fontSize: '12px' }}>Risk Heatmap</span>
              </span>
              <label className="switch">
                <input type="checkbox" checked={showHeatmap} onChange={(e) => setShowHeatmap(e.target.checked)} />
                <span className="slider"></span>
              </label>
            </div>

            <div className="toggle-row">
              <span className="form-group" style={{ flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
                <Lightbulb size={16} color="#ffe08a" />
                <span style={{ fontSize: '12px' }}>Well-lit Paths</span>
              </span>
              <label className="switch">
                <input type="checkbox" checked={showWellLit} onChange={(e) => setShowWellLit(e.target.checked)} />
                <span className="slider"></span>
              </label>
            </div>

            <div className="toggle-row">
              <span className="form-group" style={{ flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
                <Users size={16} color="#00d1b2" />
                <span style={{ fontSize: '12px' }}>Foot Traffic</span>
              </span>
              <label className="switch">
                <input type="checkbox" checked={showFootTraffic} onChange={(e) => setShowFootTraffic(e.target.checked)} />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Route Planner Panel */}
        <div className="glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          <div>
            <h3 className="card-title">
              <Navigation size={20} color="#00d1b2" />
              <span>Route Planner</span>
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label>Origin</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} color="#00d1b2" style={{ position: 'absolute', left: '12px', top: '14px' }} />
                  <input 
                    type="text" 
                    value={origin} 
                    onChange={(e) => setOrigin(e.target.value)} 
                    className="form-input" 
                    style={{ width: '100%', boxSizing: 'border-box', paddingLeft: '36px' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Destination</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} color="#ff3860" style={{ position: 'absolute', left: '12px', top: '14px' }} />
                  <input 
                    type="text" 
                    value={destination} 
                    onChange={(e) => setDestination(e.target.value)} 
                    className="form-input" 
                    style={{ width: '100%', boxSizing: 'border-box', paddingLeft: '36px' }}
                  />
                </div>
              </div>
              
              <button 
                onClick={fetchRoutesAndHeatmap} 
                disabled={loading} 
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '8px' }}
              >
                {loading ? "Re-calculating..." : "Find Safe Routes"}
              </button>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontSize: '14px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Scored Routes
            </h4>
            
            {routes.map((route) => (
              <div 
                key={route.id}
                onClick={() => setSelectedRouteId(route.id)}
                className={`route-list-item ${selectedRouteId === route.id ? "selected" : ""}`}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '75%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '700', fontSize: '15px' }}>{route.label}</span>
                    {route.id === 'route_3' && (
                      <span className="badge badge-success" style={{ padding: '2px 6px', fontSize: '10px' }}>
                        <Sparkles size={10} />
                        <span>Recommended</span>
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    {route.details}
                  </span>
                </div>
                
                <div className={`safety-score-pill ${getScoreClass(route.safety_score)}`}>
                  {route.safety_score.toFixed(0)}
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: '12px', border: '1px dashed var(--border-color)', borderRadius: '12px', background: 'rgba(0,209,178,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-blue)', fontWeight: '600', fontSize: '13px', marginBottom: '4px' }}>
              <ShieldCheck size={16} />
              <span>Safe Corridor Network</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
              Routes tagged as Safest route you along streets with active volunteer community responders, open night-shops, and maximum CCTV.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
