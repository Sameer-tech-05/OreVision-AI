import { BarChart3 } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import './Analytics.css'

const BUCKET_LABELS = ['0-20', '20-40', '40-60', '60-80', '80-100']
const PIE_COLORS = ['#5C8A78', '#7BAE99', '#C9A227', '#D66C3C', '#B4592F']

export default function Analytics({ predictionHistory }) {
  if (predictionHistory.length === 0) {
    return (
      <div className="card">
        <span className="eyebrow">ANALYTICS</span>
        <div className="empty-state analytics-empty">
          <BarChart3 size={28} strokeWidth={1.5} />
          <p>Run a few predictions to see charts of your session's results here.</p>
          <p className="analytics-empty-note">
            Charts only render from real predictions you make — nothing here is fabricated.
          </p>
        </div>
      </div>
    )
  }

  const distribution = BUCKET_LABELS.map((label, i) => ({
    bucket: label,
    count: predictionHistory.filter((p) => {
      const pct = p.prospectivity_score * 100
      const lower = i * 20
      const upper = lower + 20
      return i === 4 ? pct >= lower && pct <= upper : pct >= lower && pct < upper
    }).length,
  }))

  const timeline = [...predictionHistory]
    .slice()
    .reverse()
    .map((p, idx) => ({
      index: idx + 1,
      score: Math.round(p.prospectivity_score * 100),
    }))

  const classCounts = {}
  for (const p of predictionHistory) {
    const key = p.classification || 'Unclassified'
    classCounts[key] = (classCounts[key] || 0) + 1
  }
  const classData = Object.entries(classCounts).map(([name, value]) => ({ name, value }))

  const demoCount = predictionHistory.filter((p) => p.model_mode !== 'trained').length

  return (
    <div className="analytics">
      <div className="analytics-head">
        <span className="eyebrow">ANALYTICS</span>
        <h2>Session prediction analytics</h2>
        <p>
          Based on {predictionHistory.length} prediction{predictionHistory.length === 1 ? '' : 's'} made this
          session.
          {demoCount > 0 && ` ${demoCount} of these used the demo heuristic, not a trained model.`}
        </p>
      </div>

      <div className="analytics-grid">
        <div className="card chart-card">
          <h3>Score distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333B36" />
              <XAxis dataKey="bucket" stroke="#A8AFA9" fontSize={12} />
              <YAxis allowDecimals={false} stroke="#A8AFA9" fontSize={12} />
              <Tooltip
                contentStyle={{ background: '#1E2320', border: '1px solid #333B36', borderRadius: 6 }}
                labelStyle={{ color: '#EDEDE7' }}
              />
              <Bar dataKey="count" fill="#B4592F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <h3>Score over time</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333B36" />
              <XAxis dataKey="index" stroke="#A8AFA9" fontSize={12} label={{ value: 'Prediction #', position: 'insideBottom', offset: -4, fill: '#6E756F', fontSize: 11 }} />
              <YAxis domain={[0, 100]} stroke="#A8AFA9" fontSize={12} />
              <Tooltip
                contentStyle={{ background: '#1E2320', border: '1px solid #333B36', borderRadius: 6 }}
                labelStyle={{ color: '#EDEDE7' }}
              />
              <Line type="monotone" dataKey="score" stroke="#7BAE99" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <h3>Classification mix</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={classData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                {classData.map((entry, idx) => (
                  <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 12, color: '#A8AFA9' }} />
              <Tooltip
                contentStyle={{ background: '#1E2320', border: '1px solid #333B36', borderRadius: 6 }}
                labelStyle={{ color: '#EDEDE7' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
