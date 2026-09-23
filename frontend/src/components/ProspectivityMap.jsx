import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { Loader2, RefreshCw, Info } from 'lucide-react'
import { getGrid, ApiError } from '../services/api.js'
import './ProspectivityMap.css'

// Default marker icon fix for bundlers - Leaflet's default asset paths don't
// resolve correctly under Vite, so we build a simple colored div icon instead.
const predictionIcon = new L.DivIcon({
  className: 'prediction-pin',
  html: '<span></span>',
  iconSize: [14, 14],
})

const DEFAULT_CENTER = [22.0, 85.0] // Eastern India iron-ore belt region, used only as a default map view
const DEFAULT_ZOOM = 6

function scoreToColor(score) {
  // 0 -> muted red/graphite, 1 -> bright ore/gold. Simple linear interpolation.
  const low = [92, 108, 100] // muted green-grey
  const high = [214, 108, 60] // ore accent
  const t = Math.max(0, Math.min(1, score))
  const rgb = low.map((c, i) => Math.round(c + (high[i] - c) * t))
  return `rgb(${rgb.join(',')})`
}

export default function ProspectivityMap({ predictionHistory }) {
  const [gridData, setGridData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadGrid = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getGrid({ minLat: 20, maxLat: 24, minLon: 83, maxLon: 87, step: 0.5 })
      setGridData(data)
    } catch (err) {
      setGridData(null)
      setError(err instanceof ApiError ? err.message : 'Failed to load map data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGrid()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="map-view">
      <div className="map-header">
        <div>
          <span className="eyebrow">GIS MAP</span>
          <h2>Prospectivity map</h2>
        </div>
        <button className="btn btn-ghost" onClick={loadGrid} disabled={loading}>
          {loading ? <Loader2 size={15} className="spin-icon" /> : <RefreshCw size={15} />}
          Refresh grid
        </button>
      </div>

      {gridData?.is_demo_data && (
        <div className="map-banner">
          <Info size={14} />
          <span>{gridData.message}</span>
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      <div className="card map-card">
        <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} scrollWheelZoom className="leaflet-container">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {gridData?.points.map((p, idx) => (
            <CircleMarker
              key={`grid-${idx}`}
              center={[p.latitude, p.longitude]}
              radius={7}
              pathOptions={{
                color: scoreToColor(p.prospectivity_score),
                fillColor: scoreToColor(p.prospectivity_score),
                fillOpacity: 0.55,
                weight: 1,
              }}
            >
              <Tooltip direction="top" opacity={0.9}>
                Score: {(p.prospectivity_score * 100).toFixed(0)} / 100
              </Tooltip>
            </CircleMarker>
          ))}

          {predictionHistory.map((pred, idx) => (
            <Marker key={`pred-${idx}`} position={[pred.latitude, pred.longitude]} icon={predictionIcon}>
              <Popup>
                <strong>{(pred.prospectivity_score * 100).toFixed(0)} / 100</strong>
                <br />
                {pred.classification || 'Unclassified'}
                <br />
                {pred.model_mode === 'trained' ? 'Trained model' : 'Demo output'}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="map-legend card">
        <span className="eyebrow">LEGEND</span>
        <div className="legend-row">
          <span className="legend-swatch" style={{ background: scoreToColor(0.1) }} /> Low prospectivity (grid)
          <span className="legend-swatch" style={{ background: scoreToColor(0.9) }} /> High prospectivity (grid)
          <span className="legend-pin" /> Your predictions
        </div>
      </div>
    </div>
  )
}
