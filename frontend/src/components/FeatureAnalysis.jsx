import './FeatureAnalysis.css'

const FEATURE_IMPORTANCE = {
  NDMI: 23.47,
  B11_B12: 22.41,
  B04_B11: 21.47,
  B04_B02: 17.24,
  NDVI: 15.41,
}

const FEATURE_LABELS = {
  NDVI: 'NDVI',
  NDMI: 'NDMI',
  B04_B02: 'B04 / B02',
  B04_B11: 'B04 / B11',
  B11_B12: 'B11 / B12',
}

function formatValue(value) {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return '—'
  }

  return number.toFixed(4)
}

export default function FeatureAnalysis({
  features = {},
}) {
  const rows = [
    'NDVI',
    'NDMI',
    'B04_B02',
    'B04_B11',
    'B11_B12',
  ]

  return (
    <div className="feature-analysis-card">

      <div className="feature-analysis-header">

        <div>
          <div className="eyebrow">
            AI SPECTRAL ANALYSIS
          </div>

          <h3>
            Sentinel-2 Features
          </h3>
        </div>

        <div className="feature-count">
          5 FEATURES
        </div>

      </div>


      <p className="feature-analysis-description">
        These Sentinel-2-derived spectral features
        are provided to the validated XGBoost model
        for prospectivity estimation.
      </p>


      {/* FEATURE VALUES */}

      <div className="feature-analysis-list">

        {rows.map((feature) => {

          const value =
            Number(features?.[feature])

          const importance =
            FEATURE_IMPORTANCE[feature]

          return (
            <div
              className="feature-analysis-row"
              key={feature}
            >

              <div className="feature-name">

                <strong>
                  {FEATURE_LABELS[feature]}
                </strong>

                <span>
                  {feature}
                </span>

              </div>


              <div className="feature-value">

                {formatValue(value)}

              </div>


              <div className="feature-importance">

                <div className="importance-bar">

                  <div
                    className="importance-fill"
                    style={{
                      width: `${importance}%`,
                    }}
                  />

                </div>

                <span>
                  {importance.toFixed(2)}%
                </span>

              </div>

            </div>
          )
        })}

      </div>


      <div className="feature-analysis-footer">

        <span className="footer-dot" />

        Feature importance represents global
        XGBoost model importance, not individual
        prediction causality.

      </div>

    </div>
  )
}