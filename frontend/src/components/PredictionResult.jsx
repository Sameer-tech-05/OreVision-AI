import { Gauge, MapPin, Clock, Info, ShieldAlert, Cpu } from 'lucide-react'
import './PredictionResult.css'

export default function PredictionResult({ prediction }) {
  if (!prediction) {
    return (
      <div className="card">
        <span className="eyebrow">RESULT</span>
        <div className="empty-state result-empty">
          <Gauge size={28} strokeWidth={1.5} />
          <p>Submit the form to see a prospectivity score here.</p>
        </div>
      </div>
    )
  }

  const scorePercent = Math.round(prediction.prospectivity_score * 100)
  const isDemo = prediction.model_mode !== 'trained'

  return (
    <div className="card result-card">
      <div className="result-head">
        <span className="eyebrow">RESULT</span>
        {isDemo && (
          <span className="status-pill status-warn">
            <span className="dot" /> Demo output
          </span>
        )}
      </div>

      <div className="score-block">
        <div className="score-ring" style={{ '--pct': scorePercent }}>
          <span className="score-value">{scorePercent}</span>
          <span className="score-unit">/ 100</span>
        </div>
        <div className="score-meta">
          {prediction.classification ? (
            <strong className="score-classification">{prediction.classification}</strong>
          ) : (
            <strong className="score-classification score-classification-muted">Unclassified score</strong>
          )}
          <span className="result-row">
            <MapPin size={13} /> {prediction.latitude.toFixed(4)}, {prediction.longitude.toFixed(4)}
          </span>
          <span className="result-row">
            <Cpu size={13} /> {prediction.model_name}
          </span>
          <span className="result-row">
            <Clock size={13} /> {new Date(prediction.timestamp).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="result-note">
        <Info size={14} />
        <p>{prediction.explanation}</p>
      </div>

      <div className="result-note result-note-warn">
        <ShieldAlert size={14} />
        <p>{prediction.disclaimer}</p>
      </div>
    </div>
  )
}
