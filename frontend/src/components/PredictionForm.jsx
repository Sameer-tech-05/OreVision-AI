import { useState } from 'react'
import { Loader2, Send, AlertTriangle } from 'lucide-react'
import { predictProspectivity, ApiError } from '../services/api.js'
import './PredictionForm.css'

const FIELDS = [
  {
    name: 'latitude',
    label: 'Latitude',
    unit: 'degrees',
    placeholder: 'e.g. 22.35',
    min: -90,
    max: 90,
    help: 'Decimal degrees, -90 to 90',
  },
  {
    name: 'longitude',
    label: 'Longitude',
    unit: 'degrees',
    placeholder: 'e.g. 85.32',
    min: -180,
    max: 180,
    help: 'Decimal degrees, -180 to 180',
  },
  {
    name: 'magnetic_anomaly',
    label: 'Magnetic anomaly',
    unit: 'nT',
    placeholder: 'e.g. 145.6',
    help: 'From aeromagnetic survey data',
  },
  {
    name: 'gravity_anomaly',
    label: 'Gravity anomaly',
    unit: 'mGal',
    placeholder: 'e.g. 12.4',
    help: 'Bouguer gravity anomaly',
  },
  {
    name: 'geological_indicator',
    label: 'Geological indicator',
    unit: '0-1',
    placeholder: 'e.g. 0.72',
    min: 0,
    max: 1,
    help: 'Normalized lithology / mineralogy favorability',
  },
  {
    name: 'distance_to_fault_km',
    label: 'Distance to fault',
    unit: 'km',
    placeholder: 'e.g. 3.1',
    min: 0,
    help: 'Distance to nearest mapped fault',
  },
  {
    name: 'remote_sensing_index',
    label: 'Remote sensing index',
    unit: '-1 to 1',
    placeholder: 'e.g. 0.45',
    min: -1,
    max: 1,
    help: 'e.g. iron-oxide spectral index',
  },
]

const EMPTY_FORM = FIELDS.reduce((acc, f) => ({ ...acc, [f.name]: '' }), {})

export default function PredictionForm({ onResult }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState(null)

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const validate = () => {
    const nextErrors = {}
    for (const field of FIELDS) {
      const raw = form[field.name]
      if (raw === '' || raw === null || raw === undefined) {
        nextErrors[field.name] = 'Required'
        continue
      }
      const num = Number(raw)
      if (Number.isNaN(num)) {
        nextErrors[field.name] = 'Must be a number'
        continue
      }
      if (field.min !== undefined && num < field.min) {
        nextErrors[field.name] = `Must be ≥ ${field.min}`
      }
      if (field.max !== undefined && num > field.max) {
        nextErrors[field.name] = `Must be ≤ ${field.max}`
      }
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError(null)
    if (!validate()) return

    setSubmitting(true)
    try {
      const payload = Object.fromEntries(
        FIELDS.map((f) => [f.name, Number(form[f.name])]),
      )
      const result = await predictProspectivity(payload)
      onResult(result)
    } catch (err) {
      if (err instanceof ApiError) {
        setApiError(err.message)
      } else {
        setApiError('Unexpected error while predicting. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const fillSample = () => {
    setForm({
      latitude: '22.35',
      longitude: '85.32',
      magnetic_anomaly: '145.6',
      gravity_anomaly: '12.4',
      geological_indicator: '0.72',
      distance_to_fault_km: '3.1',
      remote_sensing_index: '0.45',
    })
    setErrors({})
  }

  return (
    <form className="card predict-form" onSubmit={handleSubmit} noValidate>
      <div className="predict-form-head">
        <div>
          <span className="eyebrow">AI PREDICTION</span>
          <h2>Score a location</h2>
        </div>
        <button type="button" className="btn btn-ghost sample-btn" onClick={fillSample}>
          Use sample values
        </button>
      </div>

      <div className="field-grid">
        {FIELDS.map((field) => (
          <div className="field" key={field.name}>
            <label htmlFor={field.name}>
              {field.label} <span className="field-unit">({field.unit})</span>
            </label>
            <input
              id={field.name}
              name={field.name}
              type="number"
              step="any"
              inputMode="decimal"
              placeholder={field.placeholder}
              value={form[field.name]}
              onChange={(e) => handleChange(field.name, e.target.value)}
              aria-invalid={!!errors[field.name]}
              aria-describedby={`${field.name}-help`}
              className={errors[field.name] ? 'input-error' : ''}
            />
            <span id={`${field.name}-help`} className="field-help">
              {errors[field.name] ? (
                <span className="field-error">
                  <AlertTriangle size={12} /> {errors[field.name]}
                </span>
              ) : (
                field.help
              )}
            </span>
          </div>
        ))}
      </div>

      {apiError && (
        <div className="error-banner" role="alert">
          {apiError}
        </div>
      )}

      <button type="submit" className="btn btn-primary submit-btn" disabled={submitting}>
        {submitting ? <Loader2 size={16} className="spin-icon" /> : <Send size={16} />}
        {submitting ? 'Scoring location…' : 'Predict prospectivity'}
      </button>
    </form>
  )
}
