import './Prediction.css'

const FEATURES = [
  {
    key: 'NDVI',
    label: 'NDVI',
    description: 'Vegetation index',
  },
  {
    key: 'NDMI',
    label: 'NDMI',
    description: 'Moisture index',
  },
  {
    key: 'B04_B02',
    label: 'B04 / B02',
    description: 'Red / Blue ratio',
  },
  {
    key: 'B04_B11',
    label: 'B04 / B11',
    description: 'Red / SWIR ratio',
  },
  {
    key: 'B11_B12',
    label: 'B11 / B12',
    description: 'SWIR ratio',
  },
]

function getScore(prediction) {
  if (
    Number.isFinite(
      Number(prediction?.prospectivity_score)
    )
  ) {
    return Number(
      prediction.prospectivity_score
    )
  }

  if (
    Number.isFinite(
      Number(prediction?.probability)
    )
  ) {
    return Number(
      prediction.probability
    ) * 100
  }

  return null
}

function getClassification(prediction) {
  return String(
    prediction?.classification || 'UNKNOWN'
  ).toUpperCase()
}

function getClassificationClass(classification) {
  if (classification === 'HIGH') {
    return 'high'
  }

  if (classification === 'MEDIUM') {
    return 'medium'
  }

  if (classification === 'LOW') {
    return 'low'
  }

  return 'unknown'
}

function formatFeatureValue(value) {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return '—'
  }

  return number.toFixed(4)
}

export default function PredictionResult({
  prediction,
  onViewMap,
}) {
  /* =========================================
     EMPTY STATE
     ========================================= */

  if (!prediction) {
    return (
      <section className="prediction-result-card prediction-result-empty">

        <div className="result-empty-icon">
          ◎
        </div>

        <div className="result-empty-content">

          <span className="prediction-eyebrow">
            AWAITING ANALYSIS
          </span>

          <h2>
            Your prediction will appear here
          </h2>

          <p>
            Enter coordinates above and run an AI
            prediction. The result will include the
            prospectivity score, classification and
            Sentinel-2 feature values.
          </p>

        </div>

      </section>
    )
  }

  /* =========================================
     CALCULATED VALUES
     ========================================= */

  const score = getScore(prediction)

  const classification =
    getClassification(prediction)

  const classificationClass =
    getClassificationClass(
      classification
    )

  const latitude =
    Number(
      prediction?.location?.latitude
    )

  const longitude =
    Number(
      prediction?.location?.longitude
    )

  const features =
    prediction?.features || {}

  const scoreValue =
    score !== null
      ? Math.max(
          0,
          Math.min(100, score)
        )
      : 0

  /* =========================================
     MAIN RESULT
     ========================================= */

  return (
    <section className="prediction-result-card">

      {/* =====================================
          HEADER
          ===================================== */}

      <div className="prediction-result-header">

        <div>

          <span className="prediction-eyebrow">
            AI PREDICTION RESULT
          </span>

          <h2>
            Prospectivity analysis
          </h2>

          <p>
            XGBoost prediction generated from
            Sentinel-2-derived spectral features.
          </p>

        </div>

        <div
          className={`result-status-badge ${classificationClass}`}
        >
          <span className="result-status-dot"></span>

          {classification}
        </div>

      </div>


      {/* =====================================
          SCORE
          ===================================== */}

      <div className="prediction-score-section">

        <div
          className={`score-ring ${classificationClass}`}
          style={{
            '--score': `${scoreValue}%`,
          }}
        >

          <div className="score-ring-inner">

            <span>
              {score !== null
                ? `${score.toFixed(2)}%`
                : '—'}
            </span>

            <small>
              PROSPECTIVITY SCORE
            </small>

          </div>

        </div>


        <div className="score-explanation">

          <span>
            MODEL CLASSIFICATION
          </span>

          <h3>
            {classification} prospectivity
          </h3>

          <p>
            The validated XGBoost model estimates
            the relative prospectivity of the
            selected location from Sentinel-2
            spectral features.
          </p>

          <small>
            This score is a model-estimated
            prospectivity probability. It is not
            iron concentration or confirmation of
            underground ore.
          </small>

        </div>

      </div>


      {/* =====================================
          LOCATION
          ===================================== */}

      <div className="result-location-section">

        <div className="result-section-heading">

          <div>

            <span>
              LOCATION
            </span>

            <h3>
              Selected coordinates
            </h3>

          </div>

          <small>
            WGS84 / EPSG:4326
          </small>

        </div>


        <div className="result-location-grid">

          <div className="result-location-card">

            <span>
              LATITUDE
            </span>

            <strong>
              {Number.isFinite(latitude)
                ? latitude.toFixed(6)
                : '—'}
            </strong>

            <small>
              degrees
            </small>

          </div>


          <div className="result-location-card">

            <span>
              LONGITUDE
            </span>

            <strong>
              {Number.isFinite(longitude)
                ? longitude.toFixed(6)
                : '—'}
            </strong>

            <small>
              degrees
            </small>

          </div>


          <div className="result-location-card">

            <span>
              RASTER ROW
            </span>

            <strong>
              {prediction?.raster_pixel?.row ??
                '—'}
            </strong>

            <small>
              Sentinel-2 pixel
            </small>

          </div>


          <div className="result-location-card">

            <span>
              RASTER COLUMN
            </span>

            <strong>
              {prediction?.raster_pixel?.column ??
                '—'}
            </strong>

            <small>
              Sentinel-2 pixel
            </small>

          </div>

        </div>

      </div>


      {/* =====================================
          MODEL INFORMATION
          ===================================== */}

      <div className="result-info-grid">

        <div className="result-info-card">

          <span>
            MODEL
          </span>

          <strong>
            {prediction?.model ||
              'Validated XGBoost'}
          </strong>

          <small>
            Machine learning model
          </small>

        </div>


        <div className="result-info-card">

          <span>
            DATA SOURCE
          </span>

          <strong>
            Sentinel-2
          </strong>

          <small>
            Derived spectral features
          </small>

        </div>


        <div className="result-info-card">

          <span>
            FEATURES
          </span>

          <strong>
            5 inputs
          </strong>

          <small>
            NDVI, NDMI and ratios
          </small>

        </div>


        <div className="result-info-card">

          <span>
            RASTER
          </span>

          <strong>
            10 m
          </strong>

          <small>
            EPSG:32643
          </small>

        </div>

      </div>


      {/* =====================================
          SENTINEL-2 FEATURES
          ===================================== */}

      <div className="result-features-section">

        <div className="result-section-heading">

          <div>

            <span>
              MODEL INPUTS
            </span>

            <h3>
              Sentinel-2 spectral features
            </h3>

          </div>

          <small>
            Values sampled at selected location
          </small>

        </div>


        <div className="result-feature-grid">

          {FEATURES.map((feature) => (

            <div
              className="result-feature-card"
              key={feature.key}
            >

              <div className="result-feature-top">

                <span>
                  {feature.description}
                </span>

                <span className="result-feature-icon">
                  ◆
                </span>

              </div>


              <strong className="result-feature-label">
                {feature.label}
              </strong>


              <div className="result-feature-value">

                {formatFeatureValue(
                  features[feature.key]
                )}

              </div>

            </div>

          ))}

        </div>

      </div>


      {/* =====================================
          ACTIONS
          ===================================== */}

      <div className="prediction-result-actions">

        <button
          type="button"
          className="result-map-button"
          onClick={onViewMap}
          disabled={!onViewMap}
        >
          ◎ View on prospectivity map
        </button>


        <button
          type="button"
          className="result-secondary-button"
          onClick={() => window.print()}
        >
          Print / Save result
        </button>

      </div>


      {/* =====================================
          INTERPRETATION
          ===================================== */}

      <div className="prediction-interpretation">

        <div className="interpretation-icon">
          i
        </div>


        <div>

          <span>
            INTERPRETATION
          </span>

          <p>
            {prediction?.interpretation ||
              'The score represents an XGBoost model-estimated prospectivity probability based on Sentinel-2-derived spectral features.'}
          </p>

        </div>

      </div>

    </section>
  )
}