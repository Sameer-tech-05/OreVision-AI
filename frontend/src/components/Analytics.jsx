import React from 'react'
import './Analytics.css'

const MODEL_METRICS = {
  roc_auc_mean: 0.6741,
  roc_auc_std: 0.0963,
  accuracy: 0.8683,
  precision: 0.1686,
  recall: 0.1867,
  f1_score: 0.1722,
}

const MODEL_FEATURES = [
  'NDVI',
  'NDMI',
  'B04_B02',
  'B04_B11',
  'B11_B12',
]

const STUDY_AREA =
  'Ballari-Vijayanagara-Sandur Iron Ore Belt, Karnataka'

const DATA_SOURCE =
  'Sentinel-2-derived spectral features'

const MODEL_NAME = 'Validated XGBoost'

const RASTER_RESOLUTION = '10 m'


function getScoreValue(prediction) {
  if (!prediction) {
    return null
  }

  if (
    Number.isFinite(
      Number(prediction.prospectivity_score)
    )
  ) {
    return Number(
      prediction.prospectivity_score
    )
  }

  if (
    Number.isFinite(
      Number(prediction.score)
    )
  ) {
    return Number(prediction.score)
  }

  if (
    Number.isFinite(
      Number(prediction.probability)
    )
  ) {
    return Number(
      prediction.probability
    ) * 100
  }

  return null
}


function getProbabilityValue(prediction) {
  if (!prediction) {
    return null
  }

  if (
    Number.isFinite(
      Number(prediction.probability)
    )
  ) {
    return Number(
      prediction.probability
    )
  }

  const score = getScoreValue(prediction)

  if (Number.isFinite(score)) {
    return score / 100
  }

  return null
}


function getFeatureValue(
  prediction,
  feature
) {
  const value =
    prediction?.features?.[feature]

  return Number.isFinite(Number(value))
    ? Number(value)
    : null
}


function escapeCsvValue(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return ''
  }

  const text = String(value)

  if (
    text.includes(',') ||
    text.includes('"') ||
    text.includes('\n')
  ) {
    return `"${text.replace(
      /"/g,
      '""'
    )}"`
  }

  return text
}


function exportPredictionsToCSV(
  predictionHistory
) {
  if (!predictionHistory.length) {
    return
  }

  const headers = [
    'Prediction No',
    'Latitude',
    'Longitude',
    'Prospectivity Score (%)',
    'Probability',
    'Classification',
    'Model',
    'Data Source',
    'Resolution',
    'NDVI',
    'NDMI',
    'B04_B02',
    'B04_B11',
    'B11_B12',
  ]

  const rows =
    predictionHistory.map(
      (prediction, index) => {
        const score =
          getScoreValue(prediction)

        const probability =
          getProbabilityValue(
            prediction
          )

        return [
          index + 1,

          prediction?.location
            ?.latitude ?? '',

          prediction?.location
            ?.longitude ?? '',

          Number.isFinite(score)
            ? score.toFixed(2)
            : '',

          Number.isFinite(
            probability
          )
            ? probability
            : '',

          prediction?.classification ??
            '',

          prediction?.model ||
            MODEL_NAME,

          prediction?.data_source ||
            DATA_SOURCE,

          prediction?.resolution ||
            RASTER_RESOLUTION,

          getFeatureValue(
            prediction,
            'NDVI'
          ),

          getFeatureValue(
            prediction,
            'NDMI'
          ),

          getFeatureValue(
            prediction,
            'B04_B02'
          ),

          getFeatureValue(
            prediction,
            'B04_B11'
          ),

          getFeatureValue(
            prediction,
            'B11_B12'
          ),
        ]
      }
    )

  const csvContent = [
    headers,
    ...rows,
  ]
    .map((row) =>
      row
        .map(escapeCsvValue)
        .join(',')
    )
    .join('\n')

  const blob = new Blob(
    [csvContent],
    {
      type:
        'text/csv;charset=utf-8;',
    }
  )

  const url =
    URL.createObjectURL(blob)

  const link =
    document.createElement('a')

  link.href = url

  link.download =
    'OreVision_AI_Predictions.csv'

  document.body.appendChild(link)

  link.click()

  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}


function downloadGeoTIFF(
  endpoint,
  filename
) {
  const link =
    document.createElement('a')

  link.href = `/api${endpoint}`

  link.download = filename

  document.body.appendChild(link)

  link.click()

  document.body.removeChild(link)
}


function formatScore(score) {
  if (!Number.isFinite(score)) {
    return '—'
  }

  return `${score.toFixed(2)}%`
}


function formatProbability(
  probability
) {
  if (
    !Number.isFinite(
      probability
    )
  ) {
    return '—'
  }

  return `${(
    probability * 100
  ).toFixed(2)}%`
}


function getClassificationClass(
  classification
) {
  if (!classification) {
    return ''
  }

  return classification
    .toLowerCase()
    .replace(/\s+/g, '-')
}


function getAverageScore(
  predictionHistory
) {
  if (!predictionHistory.length) {
    return null
  }

  const scores =
    predictionHistory
      .map(getScoreValue)
      .filter(Number.isFinite)

  if (!scores.length) {
    return null
  }

  return (
    scores.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / scores.length
  )
}


function getHighestScore(
  predictionHistory
) {
  if (!predictionHistory.length) {
    return null
  }

  const scores =
    predictionHistory
      .map(getScoreValue)
      .filter(Number.isFinite)

  if (!scores.length) {
    return null
  }

  return Math.max(...scores)
}


function getHighCount(
  predictionHistory
) {
  return predictionHistory.filter(
    (prediction) =>
      String(
        prediction?.classification ||
          ''
      ).toUpperCase() === 'HIGH'
  ).length
}


export default function Analytics({
  predictionHistory = [],
}) {
  const averageScore =
    getAverageScore(
      predictionHistory
    )

  const highestScore =
    getHighestScore(
      predictionHistory
    )

  const highCount =
    getHighCount(
      predictionHistory
    )

  return (
    <section className="analytics-view">

      {/* ==================================================
          HEADER
          ================================================== */}

      <div className="analytics-header">

        <div>

          <span className="analytics-eyebrow">
            OREVISION AI
          </span>

          <h1>
            Analytics & Results
          </h1>

          <p>
            Review model performance,
            prediction results, and
            download prospectivity
            datasets.
          </p>

        </div>


        <div className="analytics-header-actions">

          <button
            type="button"
            className="export-csv-button"
            onClick={() =>
              exportPredictionsToCSV(
                predictionHistory
              )
            }
            disabled={
              !predictionHistory.length
            }
          >
            Export CSV
          </button>


          <button
            type="button"
            className="geotiff-download-button probability-download"
            onClick={() =>
              downloadGeoTIFF(
                '/download/prospectivity-geotiff',
                'OreVision_AI_Prospectivity_Probability.tif'
              )
            }
          >
            Download Probability GeoTIFF
          </button>


          <button
            type="button"
            className="geotiff-download-button classification-download"
            onClick={() =>
              downloadGeoTIFF(
                '/download/prospectivity-class',
                'OreVision_AI_Prospectivity_Class_Color.tif'
              )
            }
          >
            Download Classification GeoTIFF
          </button>

        </div>

      </div>


      {/* ==================================================
          MODEL STATUS
          ================================================== */}

      <div className="analytics-model-banner">

        <div className="model-status-dot" />

        <div>

          <strong>
            {MODEL_NAME}
          </strong>

          <span>
            Sentinel-2-derived
            spectral features
          </span>

        </div>


        <div className="model-banner-meta">

          <span>
            5 Features
          </span>

          <span>
            10 m Resolution
          </span>

          <span>
            Stratified 5-Fold CV
          </span>

        </div>

      </div>


      {/* ==================================================
          PREDICTION SUMMARY
          ================================================== */}

      <div className="analytics-section">

        <div className="section-heading">

          <div>

            <h2>
              Prediction Summary
            </h2>

            <p>
              Summary of predictions
              made during this session.
            </p>

          </div>

        </div>


        <div className="analytics-summary-grid">

          <div className="summary-card">

            <span className="summary-label">
              Total Predictions
            </span>

            <strong className="summary-value">
              {predictionHistory.length}
            </strong>

            <span className="summary-description">
              Locations evaluated
            </span>

          </div>


          <div className="summary-card">

            <span className="summary-label">
              Average Score
            </span>

            <strong className="summary-value">
              {formatScore(
                averageScore
              )}
            </strong>

            <span className="summary-description">
              Across current predictions
            </span>

          </div>


          <div className="summary-card">

            <span className="summary-label">
              Highest Score
            </span>

            <strong className="summary-value">
              {formatScore(
                highestScore
              )}
            </strong>

            <span className="summary-description">
              Highest prospectivity result
            </span>

          </div>


          <div className="summary-card">

            <span className="summary-label">
              High Potential
            </span>

            <strong className="summary-value">
              {highCount}
            </strong>

            <span className="summary-description">
              HIGH classifications
            </span>

          </div>

        </div>

      </div>


      {/* ==================================================
          MODEL PERFORMANCE
          ================================================== */}

      <div className="analytics-section">

        <div className="section-heading">

          <div>

            <h2>
              Model Performance
            </h2>

            <p>
              Validation metrics for the
              selected XGBoost model.
            </p>

          </div>

          <span className="validation-badge">
            5-Fold Validation
          </span>

        </div>


        <div className="metrics-grid">

          <div className="metric-card featured-metric">

            <span className="metric-label">
              ROC-AUC
            </span>

            <strong className="metric-value">
              {MODEL_METRICS.roc_auc_mean.toFixed(
                4
              )}
            </strong>

            <span className="metric-subtext">
              ± {MODEL_METRICS.roc_auc_std.toFixed(
                4
              )}
            </span>

            <div className="metric-bar">

              <div
                className="metric-bar-fill"
                style={{
                  width: `${MODEL_METRICS.roc_auc_mean * 100}%`,
                }}
              />

            </div>

          </div>


          <div className="metric-card">

            <span className="metric-label">
              Accuracy
            </span>

            <strong className="metric-value">
              {(
                MODEL_METRICS.accuracy *
                100
              ).toFixed(2)}
              %
            </strong>

            <div className="metric-bar">

              <div
                className="metric-bar-fill"
                style={{
                  width: `${MODEL_METRICS.accuracy * 100}%`,
                }}
              />

            </div>

          </div>


          <div className="metric-card">

            <span className="metric-label">
              Precision
            </span>

            <strong className="metric-value">
              {(
                MODEL_METRICS.precision *
                100
              ).toFixed(2)}
              %
            </strong>

            <div className="metric-bar">

              <div
                className="metric-bar-fill"
                style={{
                  width: `${MODEL_METRICS.precision * 100}%`,
                }}
              />

            </div>

          </div>


          <div className="metric-card">

            <span className="metric-label">
              Recall
            </span>

            <strong className="metric-value">
              {(
                MODEL_METRICS.recall *
                100
              ).toFixed(2)}
              %
            </strong>

            <div className="metric-bar">

              <div
                className="metric-bar-fill"
                style={{
                  width: `${MODEL_METRICS.recall * 100}%`,
                }}
              />

            </div>

          </div>


          <div className="metric-card">

            <span className="metric-label">
              F1 Score
            </span>

            <strong className="metric-value">
              {(
                MODEL_METRICS.f1_score *
                100
              ).toFixed(2)}
              %
            </strong>

            <div className="metric-bar">

              <div
                className="metric-bar-fill"
                style={{
                  width: `${MODEL_METRICS.f1_score * 100}%`,
                }}
              />

            </div>

          </div>

        </div>


        <div className="metric-note">

          <strong>
            Validation interpretation:
          </strong>

          <span>
            The validated XGBoost model
            demonstrates moderate
            prototype-level
            discrimination between
            GSI reference localities
            and background locations
            using Sentinel-2-derived
            spectral features.
          </span>

        </div>

      </div>


      {/* ==================================================
          MODEL FEATURES
          ================================================== */}

      <div className="analytics-section">

        <div className="section-heading">

          <div>

            <h2>
              Model Features
            </h2>

            <p>
              Sentinel-2-derived
              features used by the
              XGBoost model.
            </p>

          </div>

        </div>


        <div className="features-grid">

          {MODEL_FEATURES.map(
            (feature) => (

              <div
                className="feature-card"
                key={feature}
              >

                <div className="feature-icon">
                  S2
                </div>

                <div>

                  <strong>
                    {feature}
                  </strong>

                  <span>
                    Sentinel-2 derived
                    feature
                  </span>

                </div>

              </div>

            )
          )}

        </div>

      </div>


      {/* ==================================================
          PROSPECTIVITY DATA
          ================================================== */}

      <div className="analytics-section">

        <div className="section-heading">

          <div>

            <h2>
              Prospectivity Data
            </h2>

            <p>
              Download the generated
              prospectivity raster
              products for use in GIS
              software.
            </p>

          </div>

        </div>


        <div className="download-grid">

          <div className="download-card">

            <div className="download-card-icon probability-icon">
              P
            </div>

            <div className="download-card-content">

              <h3>
                Probability GeoTIFF
              </h3>

              <p>
                Continuous XGBoost
                prospectivity probability
                raster from 0–100%.
              </p>

              <div className="download-card-meta">

                <span>
                  GeoTIFF
                </span>

                <span>
                  EPSG:32643
                </span>

                <span>
                  10 m
                </span>

              </div>

            </div>


            <button
              type="button"
              className="download-card-button probability-button"
              onClick={() =>
                downloadGeoTIFF(
                  '/download/prospectivity-geotiff',
                  'OreVision_AI_Prospectivity_Probability.tif'
                )
              }
            >
              Download
            </button>

          </div>


          <div className="download-card">

            <div className="download-card-icon classification-icon">
              C
            </div>

            <div className="download-card-content">

              <h3>
                Classification GeoTIFF
              </h3>

              <p>
                Colorized LOW, MEDIUM,
                and HIGH prospectivity
                classification raster.
              </p>

              <div className="download-card-meta">

                <span>
                  GeoTIFF
                </span>

                <span>
                  EPSG:32643
                </span>

                <span>
                  10 m
                </span>

              </div>

            </div>


            <button
              type="button"
              className="download-card-button classification-button"
              onClick={() =>
                downloadGeoTIFF(
                  '/download/prospectivity-class',
                  'OreVision_AI_Prospectivity_Class_Color.tif'
                )
              }
            >
              Download
            </button>

          </div>

        </div>

      </div>


      {/* ==================================================
          PREDICTION HISTORY
          ================================================== */}

      <div className="analytics-section">

        <div className="section-heading history-heading">

          <div>

            <h2>
              Prediction History
            </h2>

            <p>
              Locations evaluated during
              the current session.
            </p>

          </div>


          <button
            type="button"
            className="secondary-export"
            onClick={() =>
              exportPredictionsToCSV(
                predictionHistory
              )
            }
            disabled={
              !predictionHistory.length
            }
          >
            Export Results
          </button>

        </div>


        {!predictionHistory.length ? (

          <div className="analytics-empty-state">

            <div className="empty-state-icon">
              —
            </div>

            <h3>
              No predictions yet
            </h3>

            <p>
              Make a prediction from
              the Predict page to see
              results here.
            </p>

          </div>

        ) : (

          <div className="history-table-wrapper">

            <table className="history-table">

              <thead>

                <tr>

                  <th>
                    #
                  </th>

                  <th>
                    Latitude
                  </th>

                  <th>
                    Longitude
                  </th>

                  <th>
                    Score
                  </th>

                  <th>
                    Probability
                  </th>

                  <th>
                    Classification
                  </th>

                  <th>
                    Model
                  </th>

                </tr>

              </thead>


              <tbody>

                {predictionHistory.map(
                  (
                    prediction,
                    index
                  ) => {

                    const score =
                      getScoreValue(
                        prediction
                      )

                    const probability =
                      getProbabilityValue(
                        prediction
                      )

                    const classification =
                      String(
                        prediction?.classification ||
                          '—'
                      ).toUpperCase()

                    return (

                      <tr
                        key={
                          `${prediction?.location?.latitude}-${prediction?.location?.longitude}-${index}`
                        }
                      >

                        <td>
                          {index + 1}
                        </td>


                        <td>
                          {Number.isFinite(
                            Number(
                              prediction
                                ?.location
                                ?.latitude
                            )
                          )
                            ? Number(
                                prediction
                                  .location
                                  .latitude
                              ).toFixed(
                                6
                              )
                            : '—'}
                        </td>


                        <td>
                          {Number.isFinite(
                            Number(
                              prediction
                                ?.location
                                ?.longitude
                            )
                          )
                            ? Number(
                                prediction
                                  .location
                                  .longitude
                              ).toFixed(
                                6
                              )
                            : '—'}
                        </td>


                        <td className="history-score">
                          {formatScore(
                            score
                          )}
                        </td>


                        <td>
                          {formatProbability(
                            probability
                          )}
                        </td>


                        <td>

                          <span
                            className={`classification-badge ${getClassificationClass(
                              classification
                            )}`}
                          >
                            {classification}
                          </span>

                        </td>


                        <td>
                          {prediction?.model ||
                            MODEL_NAME}
                        </td>

                      </tr>

                    )
                  }
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>


      {/* ==================================================
          PROJECT INFORMATION
          ================================================== */}

      <div className="analytics-section">

        <div className="section-heading">

          <div>

            <h2>
              Project Information
            </h2>

            <p>
              Current OreVision AI
              mapping configuration.
            </p>

          </div>

        </div>


        <div className="info-grid">

          <div className="info-card">

            <span>
              Study Area
            </span>

            <strong>
              {STUDY_AREA}
            </strong>

          </div>


          <div className="info-card">

            <span>
              Machine Learning Model
            </span>

            <strong>
              {MODEL_NAME}
            </strong>

          </div>


          <div className="info-card">

            <span>
              Data Source
            </span>

            <strong>
              {DATA_SOURCE}
            </strong>

          </div>


          <div className="info-card">

            <span>
              Coordinate Reference
            </span>

            <strong>
              EPSG:32643
            </strong>

          </div>


          <div className="info-card">

            <span>
              Web Coordinate System
            </span>

            <strong>
              EPSG:4326
            </strong>

          </div>


          <div className="info-card">

            <span>
              Raster Resolution
            </span>

            <strong>
              {RASTER_RESOLUTION}
            </strong>

          </div>

        </div>

      </div>

    </section>
  )
}