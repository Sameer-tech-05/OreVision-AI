import './PredictionPDFReport.css'

const FEATURES = [
  ['NDVI', 'Vegetation index'],
  ['NDMI', 'Moisture index'],
  ['B04_B02', 'Red / Blue ratio'],
  ['B04_B11', 'Red / SWIR ratio'],
  ['B11_B12', 'SWIR ratio'],
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

function formatValue(value) {
  const n = Number(value)

  return Number.isFinite(n)
    ? n.toFixed(4)
    : '—'
}

export default function PredictionPDFReport({
  prediction,
}) {
  if (!prediction) {
    return null
  }

  const score = getScore(prediction)

  const classification =
    prediction.classification ||
    'UNKNOWN'

  const location =
    prediction.location || {}

  const features =
    prediction.features || {}

  const printReport = () => {
    window.print()
  }

  return (
    <section className="pdf-report-section">

      {/* HEADER */}

      <div className="pdf-report-header">

        <div>

          <span className="pdf-report-eyebrow">
            OREVISION AI
          </span>

          <h2>
            AI Prospectivity Prediction Report
          </h2>

          <p>
            Sentinel-2 spectral analysis
            with validated XGBoost
            prospectivity modelling.
          </p>

        </div>


        <button
          type="button"
          className="pdf-report-print-btn"
          onClick={printReport}
        >
          Print / Save as PDF
        </button>

      </div>


      {/* RESULT */}

      <div className="pdf-report-result">

        <div>

          <span>
            PROSPECTIVITY CLASS
          </span>

          <strong>
            {classification}
          </strong>

        </div>


        <div>

          <span>
            PROSPECTIVITY SCORE
          </span>

          <strong>
            {score !== null
              ? `${score.toFixed(2)}%`
              : '—'}
          </strong>

        </div>

      </div>


      {/* LOCATION + MODEL */}

      <div className="pdf-report-grid">

        <div className="pdf-report-card">

          <h3>
            Prediction Location
          </h3>

          <div className="pdf-report-row">

            <span>
              Latitude
            </span>

            <b>
              {location.latitude ?? '—'}
            </b>

          </div>


          <div className="pdf-report-row">

            <span>
              Longitude
            </span>

            <b>
              {location.longitude ?? '—'}
            </b>

          </div>


          <div className="pdf-report-row">

            <span>
              UTM X
            </span>

            <b>
              {prediction.utm_coordinates?.x ??
                '—'}
            </b>

          </div>


          <div className="pdf-report-row">

            <span>
              UTM Y
            </span>

            <b>
              {prediction.utm_coordinates?.y ??
                '—'}
            </b>

          </div>

        </div>


        <div className="pdf-report-card">

          <h3>
            Model Information
          </h3>

          <div className="pdf-report-row">

            <span>
              Model
            </span>

            <b>
              {prediction.model ||
                'Validated XGBoost'}
            </b>

          </div>


          <div className="pdf-report-row">

            <span>
              Data Source
            </span>

            <b>
              Sentinel-2-derived spectral
              features
            </b>

          </div>


          <div className="pdf-report-row">

            <span>
              Resolution
            </span>

            <b>
              10 m
            </b>

          </div>


          <div className="pdf-report-row">

            <span>
              CRS
            </span>

            <b>
              EPSG:32643
            </b>

          </div>

        </div>

      </div>


      {/* SENTINEL-2 FEATURES */}

      <div className="pdf-report-card">

        <h3>
          Sentinel-2 Spectral Features
        </h3>

        <div className="pdf-feature-grid">

          {FEATURES.map(
            ([key, label]) => (

              <div
                className="pdf-feature-item"
                key={key}
              >

                <span>
                  {key}
                </span>

                <small>
                  {label}
                </small>

                <strong>
                  {formatValue(
                    features[key]
                  )}
                </strong>

              </div>

            )
          )}

        </div>

      </div>


      {/* INTERPRETATION */}

      <div className="pdf-report-card">

        <h3>
          Interpretation
        </h3>

        <p className="pdf-report-text">

          {prediction.interpretation ||
            'The score is an XGBoost model-estimated prospectivity probability based on Sentinel-2-derived spectral features. It is not an iron concentration or a confirmation of underground ore.'}

        </p>

      </div>


      {/* FOOTER */}

      <div className="pdf-report-footer">

        OreVision AI • AI-Driven Iron Ore
        Prospectivity Mapping

      </div>

    </section>
  )
}