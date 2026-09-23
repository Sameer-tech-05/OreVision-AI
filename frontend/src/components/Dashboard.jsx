import { Sparkles, Map, BarChart3, Cpu, Database, Radio, ArrowRight } from 'lucide-react'
import './Dashboard.css'

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI prediction',
    body: 'Feed in magnetic, gravity, geological and remote-sensing readings for a location and get a prospectivity score back.',
    view: 'predict',
  },
  {
    icon: Map,
    title: 'Interactive map',
    body: 'Explore predicted zones on a pan-and-zoom Leaflet map, with markers for every location you have scored.',
    view: 'map',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    body: 'Track score distribution and trends across your prediction history as you build it up during a session.',
    view: 'analytics',
  },
]

export default function Dashboard({ health, healthError, predictionHistory, onNavigate }) {
  const modelMode = health?.model_mode ?? null
  const apiOk = !!health && !healthError

  return (
    <div className="dashboard">
      <section className="hero card">
        <span className="eyebrow">OREVISION AI · MINI-PROJECT</span>
        <h1>Iron ore prospectivity mapping, grounded in real signals.</h1>
        <p className="hero-body">
          OreVision AI combines multisource geospatial data — magnetic and gravity anomalies,
          geological indicators, fault proximity, and remote sensing — with an XGBoost model
          to estimate iron ore prospectivity at a location.
        </p>
        <div className="hero-actions">
          <button className="btn btn-primary" onClick={() => onNavigate('predict')}>
            Run a prediction <ArrowRight size={16} />
          </button>
          <button className="btn btn-ghost" onClick={() => onNavigate('map')}>
            Explore the map
          </button>
        </div>
      </section>

      <section className="status-row">
        <StatusCard
          icon={Radio}
          label="API status"
          value={apiOk ? 'Online' : 'Offline'}
          tone={apiOk ? 'ok' : 'error'}
          detail={apiOk ? `v${health.api_version}` : healthError || 'Start the FastAPI backend to connect'}
        />
        <StatusCard
          icon={Cpu}
          label="Model status"
          value={modelMode === 'trained' ? 'Trained model loaded' : modelMode === 'demo' ? 'Demo mode' : 'Unknown'}
          tone={modelMode === 'trained' ? 'ok' : modelMode === 'demo' ? 'warn' : 'error'}
          detail={
            modelMode === 'trained'
              ? 'Predictions come from a fitted XGBoost model.'
              : modelMode === 'demo'
                ? 'No trained model file found — see README "Model setup".'
                : 'Waiting for API connection.'
          }
        />
        <StatusCard
          icon={Database}
          label="Data availability"
          value={predictionHistory.length > 0 ? `${predictionHistory.length} scored` : 'No data yet'}
          tone={predictionHistory.length > 0 ? 'ok' : 'warn'}
          detail={
            predictionHistory.length > 0
              ? 'From predictions made this session.'
              : 'Run a prediction to start building session data.'
          }
        />
      </section>

      <section>
        <h2 className="section-title">What you can do here</h2>
        <div className="feature-grid">
          {FEATURES.map(({ icon: Icon, title, body, view }) => (
            <button key={title} className="feature-card" onClick={() => onNavigate(view)}>
              <span className="feature-icon">
                <Icon size={20} strokeWidth={2} />
              </span>
              <h3>{title}</h3>
              <p>{body}</p>
              <span className="feature-link">
                Open <ArrowRight size={14} />
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function StatusCard({ icon: Icon, label, value, tone, detail }) {
  return (
    <div className="card status-card">
      <div className="status-card-head">
        <span className={`status-icon status-icon-${tone}`}>
          <Icon size={16} strokeWidth={2} />
        </span>
        <span className="eyebrow">{label}</span>
      </div>
      <strong className="status-card-value">{value}</strong>
      <p className="status-card-detail">{detail}</p>
    </div>
  )
}
