import { useEffect, useState } from 'react'

import {
  MapContainer,
  TileLayer,
  ImageOverlay,
  CircleMarker,
  Marker,
  Popup,
  LayersControl,
  LayerGroup,
  useMap,
  useMapEvents,
} from 'react-leaflet'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { predictProspectivity } from '../services/api.js'
import FeatureAnalysis from './FeatureAnalysis.jsx'
import PredictionReport from './PredictionReport.jsx'
import PredictionPDFReport from './PredictionPDFReport.jsx'

import './ProspectivityMap.css'

const { BaseLayer, Overlay } = LayersControl

// ==========================================================
// STUDY AREA
// ==========================================================

const STUDY_BOUNDS = [
  [15.0457, 76.3484],
  [15.3044, 76.9423],
]

const DEFAULT_CENTER = [15.18, 76.64]

// ==========================================================
// FEATURE INFORMATION
// ==========================================================

const FEATURE_LABELS = {
  NDVI: 'Vegetation Index',
  NDMI: 'Moisture Index',
  B04_B02: 'Red / Blue Ratio',
  B04_B11: 'Red / SWIR Ratio',
  B11_B12: 'SWIR Ratio',
}

// ==========================================================
// STUDY AREA CHECK
// ==========================================================

function isInsideStudyArea(latitude, longitude) {
  const south = STUDY_BOUNDS[0][0]
  const west = STUDY_BOUNDS[0][1]

  const north = STUDY_BOUNDS[1][0]
  const east = STUDY_BOUNDS[1][1]

  return (
    latitude >= south &&
    latitude <= north &&
    longitude >= west &&
    longitude <= east
  )
}

// ==========================================================
// MAP TOOLBAR
// ==========================================================

function MapToolbar({
  onClearTarget,
  hasPrediction,
}) {
  const map = useMap()

  const fitStudyArea = () => {
    map.fitBounds(STUDY_BOUNDS, {
      padding: [30, 30],
    })
  }

  return (
    <div className="gis-toolbar">

      <button
        type="button"
        title="Zoom in"
        onClick={() => map.zoomIn()}
      >
        +
      </button>

      <button
        type="button"
        title="Zoom out"
        onClick={() => map.zoomOut()}
      >
        −
      </button>

      <div className="toolbar-divider" />

      <button
        type="button"
        className="toolbar-action"
        title="Fit study area"
        onClick={fitStudyArea}
      >
        ⛶
        <span>Study Area</span>
      </button>

      {hasPrediction && (
        <button
          type="button"
          className="toolbar-action danger"
          title="Clear active prediction"
          onClick={onClearTarget}
        >
          ×
          <span>Clear Target</span>
        </button>
      )}

    </div>
  )
}

// ==========================================================
// INITIAL MAP FIT
// ==========================================================

function FitStudyArea() {
  const map = useMap()

  useEffect(() => {
    map.fitBounds(STUDY_BOUNDS, {
      padding: [30, 30],
    })
  }, [map])

  return null
}

// ==========================================================
// MAP CLICK HANDLER
// ==========================================================

function MapClickHandler({
  onClick,
  onOutsideClick,
}) {
  useMapEvents({
    click(event) {
      const latitude = event.latlng.lat
      const longitude = event.latlng.lng

      if (
        !isInsideStudyArea(
          latitude,
          longitude
        )
      ) {
        if (onOutsideClick) {
          onOutsideClick()
        }

        return
      }

      onClick({
        latitude,
        longitude,
      })
    },
  })

  return null
}

// ==========================================================
// FOCUS ACTIVE PREDICTION
// ==========================================================

function FocusPrediction({
  prediction,
}) {
  const map = useMap()

  useEffect(() => {
    if (!prediction?.location) {
      return
    }

    const latitude = Number(
      prediction.location.latitude
    )

    const longitude = Number(
      prediction.location.longitude
    )

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return
    }

    map.flyTo(
      [latitude, longitude],
      13,
      {
        duration: 1.2,
      }
    )
  }, [prediction, map])

  return null
}

// ==========================================================
// AI TARGET MARKER
// ==========================================================

function createPredictionIcon(
  classification
) {
  const level = String(
    classification || 'UNKNOWN'
  ).toUpperCase()

  let markerClass =
    'prediction-marker-medium'

  if (level === 'HIGH') {
    markerClass =
      'prediction-marker-high'
  }

  if (level === 'LOW') {
    markerClass =
      'prediction-marker-low'
  }

  return L.divIcon({
    className:
      'prediction-marker-wrapper',

    html: `
      <div class="prediction-marker ${markerClass}">
        <div class="prediction-marker-core"></div>
        <div class="prediction-marker-ring"></div>
      </div>
    `,

    iconSize: [46, 46],
    iconAnchor: [23, 23],
    popupAnchor: [0, -23],
  })
}

// ==========================================================
// SCORE HELPER
// ==========================================================

function getPredictionScore(
  prediction
) {
  if (
    Number.isFinite(
      Number(
        prediction?.prospectivity_score
      )
    )
  ) {
    return Number(
      prediction.prospectivity_score
    )
  }

  if (
    Number.isFinite(
      Number(
        prediction?.probability
      )
    )
  ) {
    return (
      Number(
        prediction.probability
      ) * 100
    )
  }

  return null
}

// ==========================================================
// SCORE CLASSIFICATION
// ==========================================================

function getScoreClass(score) {
  if (!Number.isFinite(score)) {
    return 'unknown'
  }

  if (score > 70) {
    return 'high'
  }

  if (score > 40) {
    return 'medium'
  }

  return 'low'
}

// ==========================================================
// TARGET INFORMATION PANEL
// ==========================================================

function TargetPanel({
  prediction,
  onClear,
}) {
  if (!prediction) {
    return null
  }

  const score =
    getPredictionScore(prediction)

  const classification =
    String(
      prediction.classification ||
        'UNKNOWN'
    ).toUpperCase()

  const scoreClass =
    getScoreClass(score)

  const latitude = Number(
    prediction.location?.latitude
  )

  const longitude = Number(
    prediction.location?.longitude
  )

  const utmX = Number(
    prediction.utm_coordinates?.x
  )

  const utmY = Number(
    prediction.utm_coordinates?.y
  )

  return (
    <div className="target-panel">

      {/* HEADER */}

      <div className="target-panel-top">

        <div>

          <span className="technical-kicker">
            ACTIVE TARGET
          </span>

          <h2>
            AI Prospectivity Target
          </h2>

        </div>

        <span
          className={`target-status ${scoreClass}`}
        >
          {classification}
        </span>

      </div>

      {/* SCORE */}

      <div className="target-score-area">

        <div
          className={`score-gauge ${scoreClass}`}
          style={{
            '--score':
              Number.isFinite(score)
                ? score
                : 0,
          }}
        >

          <div className="score-gauge-inner">

            <strong>
              {Number.isFinite(score)
                ? score.toFixed(2)
                : '—'}
            </strong>

            <span>
              %
            </span>

          </div>

        </div>

        <div className="score-description">

          <span>
            PROSPECTIVITY INDEX
          </span>

          <strong>
            {classification}
          </strong>

          <p>
            Model-derived spatial
            prospectivity indicator based
            on Sentinel-2 spectral
            characteristics.
          </p>

        </div>

      </div>

      {/* COORDINATES */}

      <div className="target-coordinate-grid">

        <div>

          <span>
            LATITUDE
          </span>

          <strong>
            {Number.isFinite(latitude)
              ? latitude.toFixed(6)
              : '—'}
          </strong>

        </div>

        <div>

          <span>
            LONGITUDE
          </span>

          <strong>
            {Number.isFinite(longitude)
              ? longitude.toFixed(6)
              : '—'}
          </strong>

        </div>

        <div>

          <span>
            UTM EASTING
          </span>

          <strong>
            {Number.isFinite(utmX)
              ? utmX.toFixed(2)
              : '—'}
          </strong>

        </div>

        <div>

          <span>
            UTM NORTHING
          </span>

          <strong>
            {Number.isFinite(utmY)
              ? utmY.toFixed(2)
              : '—'}
          </strong>

        </div>

      </div>

      {/* TECHNICAL METADATA */}

      <div className="target-metadata">

        <div>

          <span>
            INFERENCE MODEL
          </span>

          <strong>
            Validated XGBoost
          </strong>

        </div>

        <div>

          <span>
            INPUT DATA
          </span>

          <strong>
            Sentinel-2 L2A
          </strong>

        </div>

        <div>

          <span>
            SPATIAL RESOLUTION
          </span>

          <strong>
            10 m
          </strong>

        </div>

        <div>

          <span>
            COORDINATE REFERENCE
          </span>

          <strong>
            EPSG:32643
          </strong>

        </div>

      </div>

      <button
        type="button"
        className="clear-target-button"
        onClick={onClear}
      >
        Clear Active Target
      </button>

    </div>
  )
}

// ==========================================================
// CLICK ANALYSIS PANEL
// ==========================================================

function ClickAnalysisPanel({
  location,
  loading,
  error,
  result,
  onPredict,
  onClose,
}) {
  if (!location) {
    return null
  }

  const score =
    getPredictionScore(result)

  return (
    <div className="click-analysis-panel">

      {/* HEADER */}

      <div className="click-panel-header">

        <div>

          <span className="technical-kicker">
            SPATIAL QUERY
          </span>

          <h3>
            Location Analysis
          </h3>

        </div>

        <button
          type="button"
          className="close-panel"
          onClick={onClose}
        >
          ×
        </button>

      </div>

      {/* SELECTED COORDINATE */}

      <div className="selected-coordinate">

        <div>

          <span>
            LAT
          </span>

          <strong>
            {Number(
              location.latitude
            ).toFixed(6)}
          </strong>

        </div>

        <div>

          <span>
            LON
          </span>

          <strong>
            {Number(
              location.longitude
            ).toFixed(6)}
          </strong>

        </div>

      </div>

      {/* INITIAL STATE */}

      {!result &&
        !loading &&
        !error && (
          <>
            <p className="analysis-description">
              Extract Sentinel-2 spectral
              features at the selected
              coordinate and perform
              XGBoost prospectivity
              inference.
            </p>

            <button
              type="button"
              className="run-analysis-button"
              onClick={onPredict}
            >
              Run Spectral Inference
            </button>
          </>
        )}

      {/* LOADING */}

      {loading && (
        <div className="analysis-loading">

          <span className="loading-dot"></span>

          <div>

            <strong>
              Processing spatial query
            </strong>

            <small>
              Extracting spectral features
              and running XGBoost
              inference...
            </small>

          </div>

        </div>
      )}

      {/* ERROR */}

      {error && (
        <div className="analysis-error">

          <strong>
            Analysis Error
          </strong>

          <span>
            {error}
          </span>

          <button
            type="button"
            className="run-analysis-button"
            onClick={onPredict}
          >
            Retry Analysis
          </button>

        </div>
      )}

      {/* RESULT */}

      {result && (
        <div className="quick-result">

          <span className="technical-kicker">
            INFERENCE COMPLETE
          </span>

          <div className="quick-result-score">

            <strong>
              {score !== null
                ? `${score.toFixed(2)}%`
                : '—'}
            </strong>

            <span>
              {result.classification ||
                'UNKNOWN'}
            </span>

          </div>

          <div className="quick-result-meta">

            <span>
              5 spectral features
            </span>

            <span>
              XGBoost
            </span>

            <span>
              10 m raster
            </span>

          </div>

          <button
            type="button"
            className="run-analysis-button secondary"
            onClick={onPredict}
          >
            Recalculate
          </button>

        </div>
      )}

    </div>
  )
}

// ==========================================================
// MAIN COMPONENT
// ==========================================================

export default function ProspectivityMap({
  prediction,
  predictionHistory = [],
  onPrediction,
}) {
  const [gsiLocations, setGsiLocations] =
    useState([])

  const [selectedLocation, setSelectedLocation] =
    useState(null)

  const [clickPrediction, setClickPrediction] =
    useState(null)

  const [predictionLoading, setPredictionLoading] =
    useState(false)

  const [predictionError, setPredictionError] =
    useState('')

  // ========================================================
  // ACTIVE PREDICTION
  // ========================================================

  const activePrediction =
    clickPrediction || prediction

  // ========================================================
  // LOAD GSI REFERENCE LOCATIONS
  // ========================================================

  useEffect(() => {
    fetch(
      '/api/prospectivity/gsi-locations'
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            'Failed to load GSI locations'
          )
        }

        return response.json()
      })
      .then((data) => {
        setGsiLocations(
          Array.isArray(data)
            ? data
            : data.locations || []
        )
      })
      .catch(() => {
        setGsiLocations([])
      })
  }, [])

  // ========================================================
  // RUN PREDICTION
  // ========================================================

  const predictSelectedLocation =
    async () => {
      if (!selectedLocation) {
        return
      }

      setPredictionLoading(true)
      setPredictionError('')

      try {
        const result =
          await predictProspectivity(
            selectedLocation
          )

        setClickPrediction(result)

        if (onPrediction) {
          onPrediction(result)
        }
      } catch (error) {
        setPredictionError(
          error?.message ||
            'Unable to analyze this location.'
        )
      } finally {
        setPredictionLoading(false)
      }
    }

  // ========================================================
  // SELECT LOCATION
  // ========================================================

  const handleLocationSelect =
    (location) => {
      setSelectedLocation(location)
      setClickPrediction(null)
      setPredictionError('')
    }

  // ========================================================
  // OUTSIDE STUDY AREA
  // ========================================================

  const handleOutsideArea = () => {
    setSelectedLocation(null)
    setClickPrediction(null)

    setPredictionError(
      'Selected coordinate is outside the configured study area.'
    )
  }

  // ========================================================
  // CLEAR ANALYSIS
  // ========================================================

  const clearAnalysis = () => {
    setSelectedLocation(null)
    setClickPrediction(null)
    setPredictionError('')
  }

  // ========================================================
  // MAP OVERLAY
  // ========================================================

  const overlayUrl =
    '/api/prospectivity/web-overlay'

  // ========================================================
  // ACTIVE VALUES
  // ========================================================

  const classification =
    activePrediction?.classification ||
    'UNKNOWN'

  const score =
    getPredictionScore(
      activePrediction
    )

  // ========================================================
  // RENDER
  // ========================================================

  return (
    <section className="professional-map-page">

      {/* ==================================================
          APPLICATION HEADER
      ================================================== */}

      <header className="gis-page-header">

        <div className="gis-brand-area">

          <div className="gis-system-label">

            <span className="system-indicator"></span>

            OREVISION AI

            <span className="system-separator">
              /
            </span>

            GEOSPATIAL INFERENCE

          </div>

          <h1>
            Iron Ore Prospectivity Analysis
          </h1>

          <p>
            AI-assisted mineral prospectivity
            assessment using Sentinel-2
            spectral characteristics and
            XGBoost inference.
          </p>

        </div>

        <div className="gis-header-metrics">

          <div>

            <span>
              MODEL
            </span>

            <strong>
              XGBoost
            </strong>

          </div>

          <div>

            <span>
              RESOLUTION
            </span>

            <strong>
              10 m
            </strong>

          </div>

          <div>

            <span>
              GSI REFERENCES
            </span>

            <strong>
              {gsiLocations.length || 27}
            </strong>

          </div>

          <div>

            <span>
              CRS
            </span>

            <strong>
              EPSG:32643
            </strong>

          </div>

        </div>

      </header>

      {/* ==================================================
          MAP WORKSPACE
      ================================================== */}

      <div className="gis-map-shell">

        <MapContainer
          center={DEFAULT_CENTER}
          zoom={10}
          minZoom={9}
          maxZoom={18}
          scrollWheelZoom
          className="professional-leaflet-map"
        >

          {/* =================================================
              BASE MAPS + GIS LAYERS
          ================================================= */}

          <LayersControl
            position="topright"
          >

            {/* SATELLITE */}

            <BaseLayer
              checked
              name="Satellite Imagery"
            >

              <TileLayer
                attribution="Esri"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />

            </BaseLayer>

            {/* STREET */}

            <BaseLayer
              name="Street Basemap"
            >

              <TileLayer
                attribution="OpenStreetMap"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />

            </BaseLayer>

            {/* =================================================
                PROSPECTIVITY SURFACE
            ================================================= */}

            <Overlay
              checked
              name="Prospectivity Surface"
            >

              <ImageOverlay
                url={overlayUrl}
                bounds={STUDY_BOUNDS}
                opacity={0.58}
                zIndex={20}
              />

            </Overlay>

            {/* =================================================
                GSI REFERENCE LOCALITIES
            ================================================= */}

            <Overlay
              checked
              name="GSI Reference Localities"
            >

              <LayerGroup>

                {gsiLocations.map(
                  (
                    location,
                    index
                  ) => (
                    <CircleMarker
                      key={`${location.latitude}-${location.longitude}-${index}`}
                      center={[
                        Number(
                          location.latitude
                        ),
                        Number(
                          location.longitude
                        ),
                      ]}
                      radius={5}
                      pathOptions={{
                        color: '#ffffff',
                        weight: 2,
                        fillColor: '#00d084',
                        fillOpacity: 0.95,
                      }}
                    >

                      <Popup>

                        <div className="gis-popup">

                          <span>
                            GSI REFERENCE
                          </span>

                          <strong>
                            {location.locality ||
                              'Reference Locality'}
                          </strong>

                          <small>
                            {Number(
                              location.latitude
                            ).toFixed(6)}

                            {' / '}

                            {Number(
                              location.longitude
                            ).toFixed(6)}
                          </small>

                          {location.source_report && (
                            <small>
                              {
                                location.source_report
                              }
                            </small>
                          )}

                        </div>

                      </Popup>

                    </CircleMarker>
                  )
                )}

              </LayerGroup>

            </Overlay>

            {/* =================================================
                AI TARGET
            ================================================= */}

            {activePrediction?.location && (
              <Overlay
                checked
                name="AI Target"
              >

                <Marker
                  position={[
                    Number(
                      activePrediction.location
                        .latitude
                    ),
                    Number(
                      activePrediction.location
                        .longitude
                    ),
                  ]}
                  icon={createPredictionIcon(
                    activePrediction.classification
                  )}
                >

                  <Popup>

                    <div className="ai-target-popup">

                      <span className="popup-kicker">
                        AI PROSPECTIVITY TARGET
                      </span>

                      <strong className="popup-class">
                        {activePrediction.classification ||
                          'UNKNOWN'}
                      </strong>

                      <div className="popup-score">

                        {score !== null
                          ? score.toFixed(2)
                          : '—'}

                        <small>
                          %
                        </small>

                      </div>

                      <div className="popup-grid">

                        <div>

                          <span>
                            Latitude
                          </span>

                          <strong>
                            {Number(
                              activePrediction
                                .location
                                .latitude
                            ).toFixed(6)}
                          </strong>

                        </div>

                        <div>

                          <span>
                            Longitude
                          </span>

                          <strong>
                            {Number(
                              activePrediction
                                .location
                                .longitude
                            ).toFixed(6)}
                          </strong>

                        </div>

                      </div>

                      <div className="popup-model-row">

                        <span>
                          Model
                        </span>

                        <strong>
                          Validated XGBoost
                        </strong>

                      </div>

                      <div className="popup-model-row">

                        <span>
                          Data
                        </span>

                        <strong>
                          Sentinel-2 L2A
                        </strong>

                      </div>

                      <div className="popup-model-row">

                        <span>
                          Resolution
                        </span>

                        <strong>
                          10 m
                        </strong>

                      </div>

                    </div>

                  </Popup>

                </Marker>

              </Overlay>
            )}

          </LayersControl>

          {/* =================================================
              SELECTED SPATIAL QUERY POINT

              IMPORTANT:
              This is outside LayersControl because it is
              not a BaseLayer/Overlay control item.
          ================================================= */}

          {selectedLocation && (
            <CircleMarker
              center={[
                Number(
                  selectedLocation.latitude
                ),
                Number(
                  selectedLocation.longitude
                ),
              ]}
              radius={8}
              pathOptions={{
                color: '#ffffff',
                weight: 3,
                fillColor: '#38bdf8',
                fillOpacity: 1,
              }}
            >

              <Popup>
                Spatial query location
              </Popup>

            </CircleMarker>
          )}

          {/* =================================================
              MAP BEHAVIOUR
          ================================================= */}

          <FitStudyArea />

          <MapToolbar
            onClearTarget={
              clearAnalysis
            }
            hasPrediction={
              Boolean(activePrediction)
            }
          />

          <MapClickHandler
            onClick={
              handleLocationSelect
            }
            onOutsideClick={
              handleOutsideArea
            }
          />

          <FocusPrediction
            prediction={
              activePrediction
            }
          />

        </MapContainer>

        {/* ==================================================
            MAP TOP STATUS
        ================================================== */}

        <div className="map-top-status">

          <div className="live-status">

            <span></span>

            LIVE GIS VIEW

          </div>

          <span>
            BALLARI–VIJAYANAGARA–SANDUR BELT
          </span>

        </div>

        {/* ==================================================
            PROSPECTIVITY LEGEND
        ================================================== */}

        <div className="prospectivity-legend">

          <div className="legend-heading">

            <span>
              PROSPECTIVITY INDEX
            </span>

            <strong>
              MODEL OUTPUT
            </strong>

          </div>

          <div className="legend-row">

            <span className="legend-swatch low"></span>

            <div>

              <strong>
                LOW
              </strong>

              <small>
                0–40%
              </small>

            </div>

          </div>

          <div className="legend-row">

            <span className="legend-swatch medium"></span>

            <div>

              <strong>
                MEDIUM
              </strong>

              <small>
                41–70%
              </small>

            </div>

          </div>

          <div className="legend-row">

            <span className="legend-swatch high"></span>

            <div>

              <strong>
                HIGH
              </strong>

              <small>
                71–100%
              </small>

            </div>

          </div>

          <div className="legend-note">

            Higher values indicate stronger
            model similarity to the reference
            pattern.

          </div>

        </div>

        {/* ==================================================
            ACTIVE TARGET PANEL
        ================================================== */}

        {activePrediction && (
          <TargetPanel
            prediction={
              activePrediction
            }
            onClear={
              clearAnalysis
            }
          />
        )}

        {/* ==================================================
            CLICK ANALYSIS PANEL
        ================================================== */}

        <ClickAnalysisPanel
          location={
            selectedLocation
          }
          loading={
            predictionLoading
          }
          error={
            predictionError
          }
          result={
            clickPrediction
          }
          onPredict={
            predictSelectedLocation
          }
          onClose={() => {
            setSelectedLocation(null)
            setClickPrediction(null)
            setPredictionError('')
          }}
        />

        {/* ==================================================
            MAP FOOTER STATUS
        ================================================== */}

        <div className="map-footer-status">

          <span>

            <strong>
              CRS
            </strong>

            EPSG:32643

          </span>

          <span>

            <strong>
              PIXEL
            </strong>

            10 × 10 m

          </span>

          <span>

            <strong>
              ENGINE
            </strong>

            Validated XGBoost

          </span>

          <span>

            <strong>
              INPUT
            </strong>

            Sentinel-2 L2A

          </span>

        </div>

      </div>

      {/* ====================================================
          TECHNICAL INFORMATION
      ==================================================== */}

      <section className="technical-information-grid">

        {/* STUDY REGION */}

        <div className="technical-card">

          <span className="technical-card-label">
            STUDY REGION
          </span>

          <h3>
            Ballari–Vijayanagara–Sandur
          </h3>

          <p>
            Karnataka, India
          </p>

          <div className="technical-tags">

            <span>
              Sentinel-2
            </span>

            <span>
              GSI
            </span>

            <span>
              XGBoost
            </span>

            <span>
              10 m
            </span>

          </div>

        </div>

        {/* SPECTRAL FEATURES */}

        <div className="technical-card">

          <span className="technical-card-label">
            SPECTRAL FEATURE VECTOR
          </span>

          <h3>
            5 Input Variables
          </h3>

          <div className="spectral-feature-grid">

            {Object.entries(
              FEATURE_LABELS
            ).map(
              ([key, label]) => (
                <div key={key}>

                  <strong>
                    {key}
                  </strong>

                  <small>
                    {label}
                  </small>

                </div>
              )
            )}

          </div>

        </div>

        {/* REFERENCE FRAMEWORK */}

        <div className="technical-card">

          <span className="technical-card-label">
            REFERENCE FRAMEWORK
          </span>

          <h3>
            GSI Spatial References
          </h3>

          <p>
            {gsiLocations.length || 27}
            {' '}
            reference localities incorporated
            into the spatial modelling workflow.
          </p>

          <div className="reference-stat">

            <strong>
              {predictionHistory.length}
            </strong>

            <span>
              user-generated inference
              {predictionHistory.length === 1
                ? ''
                : 's'}
            </span>

          </div>

        </div>

      </section>

      {/* ====================================================
          FEATURE ANALYSIS
      ==================================================== */}

      {activePrediction?.features && (
        <FeatureAnalysis
          features={
            activePrediction.features
          }
        />
      )}

      {/* ====================================================
          TEXT REPORT
      ==================================================== */}

      {activePrediction && (
        <PredictionReport
          prediction={
            activePrediction
          }
        />
      )}

      {/* ====================================================
          PDF REPORT
      ==================================================== */}

      {activePrediction && (
        <PredictionPDFReport
          prediction={
            activePrediction
          }
        />
      )}

      {/* ====================================================
          TECHNICAL NOTICE
      ==================================================== */}
<section className="technical-notice">

  <div className="notice-icon">
    !
  </div>

  <div>

    <span>
      GEOSPATIAL INFERENCE & MODEL LIMITATIONS
    </span>

    <p>
      This prospectivity assessment represents a
      machine-learning-derived spatial inference
      generated from Sentinel-2 spectral
      characteristics and a validated XGBoost
      model. The prospectivity score represents
      the model-estimated similarity to the
      reference dataset and must not be interpreted
      as iron concentration, ore grade, deposit
      thickness, resource quantity, or confirmation
      of subsurface mineralization. Model outputs
      are subject to input-data uncertainty,
      spatial sampling limitations, spectral
      ambiguity, and algorithmic uncertainty.
      Independent geological, geophysical, and
      field-based validation is required before
      exploration, resource estimation, mining,
      or land-use decisions.
    </p>

  </div>

</section>
     

    </section>
  )
}