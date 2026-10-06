import { useState } from 'react'
import { predictProspectivity } from '../services/api.js'
import './Prediction.css'

const EXAMPLE_LOCATION = {
  latitude: '15.194444',
  longitude: '76.677778',
}

const FEATURES = [
  {
    name: 'NDVI',
    description: 'Vegetation index',
  },
  {
    name: 'NDMI',
    description: 'Moisture index',
  },
  {
    name: 'B04_B02',
    description: 'Red / Blue ratio',
  },
  {
    name: 'B04_B11',
    description: 'Red / SWIR ratio',
  },
  {
    name: 'B11_B12',
    description: 'SWIR ratio',
  },
]

export default function PredictionForm({ onResult }) {
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const validateCoordinates = () => {
    const lat = Number(latitude)
    const lon = Number(longitude)

    if (!latitude || !longitude) {
      return 'Please enter both latitude and longitude.'
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return 'Latitude and longitude must be valid numbers.'
    }

    if (lat < -90 || lat > 90) {
      return 'Latitude must be between -90 and 90.'
    }

    if (lon < -180 || lon > 180) {
      return 'Longitude must be between -180 and 180.'
    }

    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    setError('')

    const validationError = validateCoordinates()

    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    try {
      const result = await predictProspectivity({
        latitude: Number(latitude),
        longitude: Number(longitude),
      })

      if (onResult) {
        onResult(result)
      }
    } catch (err) {
      setError(
        err?.message ||
          'Prediction failed. Please check the backend connection.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleUseExample = () => {
    setLatitude(EXAMPLE_LOCATION.latitude)
    setLongitude(EXAMPLE_LOCATION.longitude)
    setError('')
  }

  const handleReset = () => {
    setLatitude('')
    setLongitude('')
    setError('')
  }

  return (
    <section className="prediction-form-card">

      {/* HEADER */}
      <div className="prediction-form-header">

        <div className="prediction-form-title-group">

          <div className="prediction-form-icon">
            ◎
          </div>

          <div>
            <span className="prediction-eyebrow">
              OREVISION AI · PREDICTION ENGINE
            </span>

            <h2>
              Analyze a location
            </h2>

            <p>
              Enter geographic coordinates to estimate iron ore
              prospectivity using Sentinel-2 spectral features
              and the validated XGBoost model.
            </p>
          </div>

        </div>

        <div className="prediction-input-status">
          <span className="status-dot"></span>
          AI ENGINE READY
        </div>

      </div>

      {/* FORM */}
      <form
        className="coordinate-form"
        onSubmit={handleSubmit}
      >

        <div className="coordinate-fields">

          {/* LATITUDE */}
          <div className="coordinate-field">

            <label>
              <span>LATITUDE</span>
              <span>−90 to 90</span>
            </label>

            <div className="coordinate-input-wrapper">

              <div className="coordinate-symbol">
                ↕
              </div>

              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(event) =>
                  setLatitude(event.target.value)
                }
                placeholder="15.194444"
                disabled={loading}
              />

              <span className="coordinate-unit">
                °N
              </span>

            </div>

          </div>

          {/* LONGITUDE */}
          <div className="coordinate-field">

            <label>
              <span>LONGITUDE</span>
              <span>−180 to 180</span>
            </label>

            <div className="coordinate-input-wrapper">

              <div className="coordinate-symbol">
                ↔
              </div>

              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(event) =>
                  setLongitude(event.target.value)
                }
                placeholder="76.677778"
                disabled={loading}
              />

              <span className="coordinate-unit">
                °E
              </span>

            </div>

          </div>

        </div>

        {/* EXAMPLE */}
        <div className="example-location">

          <div className="example-location-icon">
            ⌖
          </div>

          <div className="example-location-content">

            <span>
              EXAMPLE STUDY-AREA LOCATION
            </span>

            <strong>
              15.194444° N, 76.677778° E
            </strong>

            <small>
              Toranagallu / Sandur study area
            </small>

          </div>

          <button
            type="button"
            className="use-example-button"
            onClick={handleUseExample}
            disabled={loading}
          >
            Use example
          </button>

        </div>

        {/* ERROR */}
        {error && (
          <div className="prediction-form-error">

            <span>
              !
            </span>

            <div>
              <strong>
                Prediction unavailable
              </strong>

              <p>
                {error}
              </p>
            </div>

          </div>
        )}

        {/* ACTIONS */}
        <div className="prediction-form-actions">

          <button
            type="submit"
            className="run-prediction-button"
            disabled={loading}
          >

            {loading ? (
              <>
                <span className="prediction-spinner"></span>
                Analyzing...
              </>
            ) : (
              <>
                ◎
                Run AI prediction
              </>
            )}

          </button>

          <button
            type="button"
            className="reset-prediction-button"
            onClick={handleReset}
            disabled={loading}
          >
            Reset
          </button>

        </div>

      </form>

      {/* FEATURES */}
      <div className="prediction-input-footer">

        <div className="input-footer-heading">

          <span>
            SENTINEL-2 SPECTRAL FEATURES
          </span>

          <small>
            5 model inputs
          </small>

        </div>

        <div className="prediction-feature-list">

          {FEATURES.map((feature) => (
            <div
              className="prediction-feature-item"
              key={feature.name}
            >

              <div className="feature-item-icon">
                ◆
              </div>

              <div>
                <strong>
                  {feature.name}
                </strong>

                <small>
                  {feature.description}
                </small>
              </div>

            </div>
          ))}

        </div>

      </div>

    </section>
  )
}