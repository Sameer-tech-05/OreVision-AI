import { useEffect, useMemo, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  ImageOverlay,
  CircleMarker,
  useMap,
} from 'react-leaflet'

import 'leaflet/dist/leaflet.css'
import './Dashboard.css'


// ==========================================================
// CONSTANTS
// ==========================================================

const STUDY_BOUNDS = [
  [15.0457, 76.3484],
  [15.3044, 76.9423],
]

const DEFAULT_CENTER = [15.18, 76.64]

const MODEL_METRICS = {
  roc_auc_mean: 0.6741,
  accuracy: 0.8683,
  precision: 0.1686,
  recall: 0.1867,
  f1_score: 0.1722,
}

const FEATURES = [
  'NDVI',
  'NDMI',
  'B04_B02',
  'B04_B11',
  'B11_B12',
]

const FEATURE_DESCRIPTIONS = {
  NDVI: 'Vegetation index',
  NDMI: 'Moisture index',
  B04_B02: 'Red / Blue ratio',
  B04_B11: 'Red / SWIR ratio',
  B11_B12: 'SWIR ratio',
}


// ==========================================================
// MAP FIT
// ==========================================================

function DashboardMapFit() {
  const map = useMap()

  useEffect(() => {
    map.fitBounds(STUDY_BOUNDS, {
      padding: [12, 12],
      animate: false,
    })
  }, [map])

  return null
}


// ==========================================================
// MINI PROSPECTIVITY MAP
// ==========================================================

function MiniProspectivityMap({ gsiLocations = [] }) {
  return (
    <div className="dashboard-mini-map">

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={10}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        touchZoom={false}
        zoomControl={false}
        attributionControl={false}
      >

        {/* Satellite base map */}

        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />

        {/* Actual AI prospectivity overlay */}

        <ImageOverlay
          url="/api/prospectivity/web-overlay"
          bounds={STUDY_BOUNDS}
          opacity={0.64}
          zIndex={20}
        />

        {/* GSI reference locations */}

        {gsiLocations.map((location, index) => {

          const latitude = Number(location?.latitude)
          const longitude = Number(location?.longitude)

          if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
          ) {
            return null
          }

          return (
            <CircleMarker
              key={`${latitude}-${longitude}-${index}`}
              center={[latitude, longitude]}
              radius={3}
              pathOptions={{
                color: '#ffffff',
                weight: 1,
                fillColor: '#00d084',
                fillOpacity: 0.95,
              }}
            />
          )
        })}

        <DashboardMapFit />

      </MapContainer>


      {/* ==================================================
          MAP HEADER
      ================================================== */}

      <div className="dashboard-map-title">

        <span>
          LIVE GIS VIEW
        </span>

        <strong>
          Iron Ore Prospectivity
        </strong>

      </div>


      {/* ==================================================
          MAP LEGEND
      ================================================== */}

      <div className="dashboard-map-legend">

        <div>
          <span className="legend-dot low"></span>
          LOW
        </div>

        <div>
          <span className="legend-dot medium"></span>
          MEDIUM
        </div>

        <div>
          <span className="legend-dot high"></span>
          HIGH
        </div>

      </div>


      {/* ==================================================
          RESOLUTION
      ================================================== */}

      <div className="dashboard-map-resolution">
        Sentinel-2 · 10 m
      </div>

    </div>
  )
}


// ==========================================================
// FORMAT SCORE
// ==========================================================

function formatScore(prediction) {

  const score = Number(
    prediction?.prospectivity_score
  )

  if (Number.isFinite(score)) {
    return `${score.toFixed(2)}%`
  }

  const probability = Number(
    prediction?.probability
  )

  if (Number.isFinite(probability)) {
    return `${(probability * 100).toFixed(2)}%`
  }

  return '—'
}


// ==========================================================
// CLASSIFICATION
// ==========================================================

function getClassification(prediction) {

  return (
    prediction?.classification ||
    'NO PREDICTION'
  )
}


// ==========================================================
// CLASSIFICATION CSS
// ==========================================================

function getClassificationClass(prediction) {

  return String(
    prediction?.classification || ''
  ).toLowerCase()
}


// ==========================================================
// DASHBOARD
// ==========================================================

export default function Dashboard({
  health,
  healthError,
  predictionHistory = [],
  onNavigate,
}) {

  const [mapInfo, setMapInfo] = useState(null)
  const [modelInfo, setModelInfo] = useState(null)
  const [gsiLocations, setGsiLocations] = useState([])


  // ========================================================
  // LOAD PROJECT INFORMATION
  // ========================================================

  useEffect(() => {

    fetch('/api/prospectivity/info')
      .then((response) => {

        if (!response.ok) {
          throw new Error(
            'Unable to load project information'
          )
        }

        return response.json()
      })
      .then((data) => {
        setMapInfo(data)
      })
      .catch(() => {
        setMapInfo(null)
      })


    fetch('/api/model-performance')
      .then((response) => {

        if (!response.ok) {
          throw new Error(
            'Unable to load model performance'
          )
        }

        return response.json()
      })
      .then((data) => {
        setModelInfo(data)
      })
      .catch(() => {
        setModelInfo(null)
      })


    fetch('/api/prospectivity/gsi-locations')
      .then((response) => {

        if (!response.ok) {
          throw new Error(
            'Unable to load GSI locations'
          )
        }

        return response.json()
      })
      .then((data) => {

        if (Array.isArray(data)) {
          setGsiLocations(data)
        } else {
          setGsiLocations(
            data?.locations || []
          )
        }
      })
      .catch(() => {
        setGsiLocations([])
      })

  }, [])


  // ========================================================
  // PREDICTION DATA
  // ========================================================

  const latestPrediction =
    predictionHistory[0] || null


  const totalPredictions =
    predictionHistory.length


  const highPredictions = useMemo(
    () =>
      predictionHistory.filter(
        (item) =>
          String(item?.classification)
            .toUpperCase() === 'HIGH'
      ).length,
    [predictionHistory]
  )


  const mediumPredictions = useMemo(
    () =>
      predictionHistory.filter(
        (item) =>
          String(item?.classification)
            .toUpperCase() === 'MEDIUM'
      ).length,
    [predictionHistory]
  )


  const lowPredictions = useMemo(
    () =>
      predictionHistory.filter(
        (item) =>
          String(item?.classification)
            .toUpperCase() === 'LOW'
      ).length,
    [predictionHistory]
  )


  // ========================================================
  // BACKEND STATUS
  // ========================================================

  const backendOnline =
    health?.status === 'ok' ||
    health?.status === 'ready' ||
    !healthError


  // ========================================================
  // RETURN
  // ========================================================

  return (
    <div className="dashboard-page">


      {/* ==================================================
          HERO
      ================================================== */}

      <section className="dashboard-hero">

        <div className="hero-content">

          <div className="hero-kicker">
            OREVISION AI · GIS INTELLIGENCE PLATFORM
          </div>

          <h1>
            AI-driven iron ore
            <br />
            prospectivity mapping
          </h1>

          <p>
            Explore iron ore prospectivity using
            Sentinel-2-derived spectral features
            and a validated XGBoost machine-learning
            model across the
            Ballari–Vijayanagara–Sandur Iron Ore Belt.
          </p>


          <div className="hero-actions">

            <button
              type="button"
              className="dashboard-primary-button"
              onClick={() =>
                onNavigate('predict')
              }
            >
              Run a prediction
              <span>→</span>
            </button>


            <button
              type="button"
              className="dashboard-secondary-button"
              onClick={() =>
                onNavigate('map')
              }
            >
              Explore full map
              <span>↗</span>
            </button>

          </div>

        </div>


        {/* REAL MAP */}

        <MiniProspectivityMap
          gsiLocations={gsiLocations}
        />

      </section>


      {/* ==================================================
          SYSTEM STATUS
      ================================================== */}

      <section className="dashboard-status-grid">


        <div className="status-card">

          <div className="status-icon">
            ◈
          </div>

          <div>

            <span>
              DATA SOURCE
            </span>

            <strong>
              Sentinel-2
            </strong>

            <small>
              Spectral features available
            </small>

          </div>

        </div>


        <div className="status-card">

          <div className="status-icon">
            ◉
          </div>

          <div>

            <span>
              MODEL
            </span>

            <strong>
              Validated XGBoost
            </strong>

            <small>
              Model ready for prediction
            </small>

          </div>

        </div>


        <div className="status-card">

          <div
            className={`status-icon ${
              backendOnline
                ? 'online'
                : 'offline'
            }`}
          >
            ●
          </div>

          <div>

            <span>
              API STATUS
            </span>

            <strong>
              {backendOnline
                ? 'Online'
                : 'Offline'}
            </strong>

            <small>
              {backendOnline
                ? 'FastAPI backend connected'
                : 'Backend connection unavailable'}
            </small>

          </div>

        </div>

      </section>


      {/* ==================================================
          CURRENT SYSTEM CONFIGURATION
      ================================================== */}

      <section className="dashboard-section">

        <div className="section-heading">

          <div>

            <span>
              SYSTEM
            </span>

            <h2>
              Current system configuration
            </h2>

          </div>

          <span className="live-badge">
            ● LIVE
          </span>

        </div>


        <div className="configuration-grid">


          <div className="configuration-card">

            <span className="config-icon">
              ◈
            </span>

            <div>

              <span>
                STUDY AREA
              </span>

              <strong>
                Ballari–Vijayanagara–Sandur
              </strong>

            </div>

          </div>


          <div className="configuration-card">

            <span className="config-icon">
              ▣
            </span>

            <div>

              <span>
                SPATIAL RESOLUTION
              </span>

              <strong>
                {mapInfo?.resolution || '10 m'}
              </strong>

            </div>

          </div>


          <div className="configuration-card">

            <span className="config-icon">
              ◎
            </span>

            <div>

              <span>
                GSI REFERENCES
              </span>

              <strong>
                {mapInfo?.gsi_reference_locations || 27}
                {' '}
                locations
              </strong>

            </div>

          </div>


          <div className="configuration-card">

            <span className="config-icon">
              ◒
            </span>

            <div>

              <span>
                CLASSIFICATION
              </span>

              <strong>
                LOW · MEDIUM · HIGH
              </strong>

            </div>

          </div>

        </div>

      </section>


      {/* ==================================================
          AI WORKFLOW
      ================================================== */}

      <section className="dashboard-section">

        <div className="section-heading">

          <div>

            <span>
              AI WORKFLOW
            </span>

            <h2>
              From coordinates to prospectivity
            </h2>

          </div>

        </div>


        <div className="workflow-grid">


          <WorkflowStep
            number="01"
            title="Enter coordinates"
            description="Provide latitude and longitude for the location to be analysed."
          />

          <div className="workflow-line"></div>


          <WorkflowStep
            number="02"
            title="Sample Sentinel-2"
            description="Extract five spectral features at the selected coordinate."
          />

          <div className="workflow-line"></div>


          <WorkflowStep
            number="03"
            title="Run XGBoost"
            description="The validated model estimates the prospectivity probability."
          />

          <div className="workflow-line"></div>


          <WorkflowStep
            number="04"
            title="Generate result"
            description="Return the score and LOW, MEDIUM or HIGH classification."
          />

        </div>

      </section>


      {/* ==================================================
          PREDICTION ACTIVITY
      ================================================== */}

      <section className="dashboard-section">

        <div className="section-heading">

          <div>

            <span>
              SESSION
            </span>

            <h2>
              Prediction activity
            </h2>

          </div>


          <button
            type="button"
            className="section-action"
            onClick={() =>
              onNavigate('predict')
            }
          >
            New prediction →
          </button>

        </div>


        {latestPrediction ? (

          <div className="prediction-dashboard-grid">


            {/* LATEST PREDICTION */}

            <div className="latest-prediction-card">

              <div className="latest-header">

                <div>

                  <span>
                    LATEST AI PREDICTION
                  </span>

                  <strong>
                    {getClassification(
                      latestPrediction
                    )}
                  </strong>

                </div>


                <div
                  className={`latest-score ${
                    getClassificationClass(
                      latestPrediction
                    )
                  }`}
                >
                  {formatScore(
                    latestPrediction
                  )}
                </div>

              </div>


              <div className="latest-prediction-meta">

                <div>
                  <span>
                    MODEL
                  </span>

                  <strong>
                    Validated XGBoost
                  </strong>
                </div>

                <div>
                  <span>
                    DATA
                  </span>

                  <strong>
                    Sentinel-2
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

              </div>


              <div className="latest-location">


                <div>

                  <span>
                    LATITUDE
                  </span>

                  <strong>
                    {Number(
                      latestPrediction
                        ?.location?.latitude
                    ).toFixed(6)}
                  </strong>

                </div>


                <div>

                  <span>
                    LONGITUDE
                  </span>

                  <strong>
                    {Number(
                      latestPrediction
                        ?.location?.longitude
                    ).toFixed(6)}
                  </strong>

                </div>

              </div>


              <button
                type="button"
                className="view-map-button"
                onClick={() =>
                  onNavigate('map')
                }
              >
                View prediction on map →
              </button>

            </div>


            {/* SESSION SUMMARY */}

            <div className="session-summary-card">

              <span>
                SESSION SUMMARY
              </span>


              <div className="session-total">

                <strong>
                  {totalPredictions}
                </strong>

                <small>
                  predictions
                </small>

              </div>


              <div className="session-breakdown">


                <div>

                  <span className="dot high"></span>

                  <span>
                    High
                  </span>

                  <strong>
                    {highPredictions}
                  </strong>

                </div>


                <div>

                  <span className="dot medium"></span>

                  <span>
                    Medium
                  </span>

                  <strong>
                    {mediumPredictions}
                  </strong>

                </div>


                <div>

                  <span className="dot low"></span>

                  <span>
                    Low
                  </span>

                  <strong>
                    {lowPredictions}
                  </strong>

                </div>

              </div>

            </div>

          </div>

        ) : (

          <div className="empty-prediction-card">

            <div className="empty-icon">
              ◌
            </div>

            <div>

              <strong>
                No predictions yet
              </strong>

              <p>
                Run your first AI prediction to
                see the result and location here.
              </p>

            </div>


            <button
              type="button"
              onClick={() =>
                onNavigate('predict')
              }
            >
              Start prediction →
            </button>

          </div>

        )}

      </section>


      {/* ==================================================
          MODEL PERFORMANCE
      ================================================== */}

      <section className="dashboard-section">

        <div className="section-heading">

          <div>

            <span>
              VALIDATION
            </span>

            <h2>
              Model performance
            </h2>

          </div>


          <button
            type="button"
            className="section-action"
            onClick={() =>
              onNavigate('analytics')
            }
          >
            Open analytics →
          </button>

        </div>


        <div className="metrics-grid">


          <MetricCard
            label="ROC-AUC"
            value={
              modelInfo?.metrics?.roc_auc_mean ??
              MODEL_METRICS.roc_auc_mean
            }
            type="decimal"
          />


          <MetricCard
            label="ACCURACY"
            value={
              modelInfo?.metrics?.accuracy ??
              MODEL_METRICS.accuracy
            }
            type="percentage"
          />


          <MetricCard
            label="PRECISION"
            value={
              modelInfo?.metrics?.precision ??
              MODEL_METRICS.precision
            }
            type="percentage"
          />


          <MetricCard
            label="RECALL"
            value={
              modelInfo?.metrics?.recall ??
              MODEL_METRICS.recall
            }
            type="percentage"
          />


          <MetricCard
            label="F1 SCORE"
            value={
              modelInfo?.metrics?.f1_score ??
              MODEL_METRICS.f1_score
            }
            type="percentage"
          />

        </div>


        <div className="model-note">

          <span>
            MODEL
          </span>

          <strong>
            Validated XGBoost
          </strong>

          <p>
            Stratified 5-fold cross-validation using
            Sentinel-2-derived spectral features.
          </p>

        </div>

      </section>


      {/* ==================================================
          FEATURES
      ================================================== */}

      <section className="dashboard-section">

        <div className="section-heading">

          <div>

            <span>
              MACHINE LEARNING INPUT
            </span>

            <h2>
              Sentinel-2 spectral features
            </h2>

          </div>

        </div>


        <div className="feature-dashboard-grid">

          {FEATURES.map((feature) => (

            <div
              className="dashboard-feature-card"
              key={feature}
            >

              <span>
                ◆
              </span>

              <strong>
                {feature}
              </strong>

              <small>
                {FEATURE_DESCRIPTIONS[feature]}
              </small>

            </div>

          ))}

        </div>

      </section>


      {/* ==================================================
          QUICK ACTIONS
      ================================================== */}

      <section className="dashboard-section">

        <div className="section-heading">

          <div>

            <span>
              QUICK ACCESS
            </span>

            <h2>
              What you can do here
            </h2>

          </div>

        </div>


        <div className="quick-actions-grid">


          <QuickAction
            icon="⌖"
            title="Predict a location"
            description="Enter latitude and longitude to generate a prospectivity score."
            action="Open prediction"
            onClick={() =>
              onNavigate('predict')
            }
          />


          <QuickAction
            icon="▧"
            title="Explore prospectivity map"
            description="View the AI classification overlay and GSI reference locations."
            action="Open map"
            onClick={() =>
              onNavigate('map')
            }
          />


          <QuickAction
            icon="◫"
            title="Analyze predictions"
            description="Review prediction history, model metrics and exported data."
            action="Open analytics"
            onClick={() =>
              onNavigate('analytics')
            }
          />

        </div>

      </section>


      {/* ==================================================
          PROJECT FOOTER
      ================================================== */}

      <section className="dashboard-project-footer">

        <div>

          <span>
            OREVISION AI
          </span>

          <strong>
            AI-driven Iron Ore Prospectivity Mapping
          </strong>

        </div>


        <div className="project-footer-meta">

          <span>
            Sentinel-2
          </span>

          <span>
            XGBoost
          </span>

          <span>
            FastAPI
          </span>

          <span>
            React
          </span>

          <span>
            Leaflet
          </span>

        </div>

      </section>

    </div>
  )
}


// ==========================================================
// WORKFLOW STEP
// ==========================================================

function WorkflowStep({
  number,
  title,
  description,
}) {

  return (
    <div className="workflow-step">

      <div className="workflow-number">
        {number}
      </div>

      <div>

        <h3>
          {title}
        </h3>

        <p>
          {description}
        </p>

      </div>

    </div>
  )
}


// ==========================================================
// METRIC CARD
// ==========================================================

function MetricCard({
  label,
  value,
  type,
}) {

  let displayValue = '—'

  if (Number.isFinite(Number(value))) {

    if (type === 'decimal') {

      displayValue =
        Number(value).toFixed(4)

    } else {

      displayValue =
        `${(
          Number(value) * 100
        ).toFixed(2)}%`

    }

  }

  return (
    <div className="metric-dashboard-card">

      <span>
        {label}
      </span>

      <strong>
        {displayValue}
      </strong>

    </div>
  )
}


// ==========================================================
// QUICK ACTION
// ==========================================================

function QuickAction({
  icon,
  title,
  description,
  action,
  onClick,
}) {

  return (
    <button
      type="button"
      className="quick-action-card"
      onClick={onClick}
    >

      <div className="quick-action-icon">
        {icon}
      </div>

      <div className="quick-action-content">

        <h3>
          {title}
        </h3>

        <p>
          {description}
        </p>

        <span>
          {action} →
        </span>

      </div>

    </button>
  )
}