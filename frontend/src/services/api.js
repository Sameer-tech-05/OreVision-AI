// OreVision AI - API service layer
// Every function here mirrors an endpoint defined in backend/app/main.py.
// Field names sent to /api/predict MUST match backend/app/schemas.py::PredictionRequest exactly.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

class ApiError extends Error {
  constructor(message, status, detail) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch (networkErr) {
    throw new ApiError(
      'Could not reach the OreVision AI backend. Is the FastAPI server running?',
      0,
      String(networkErr),
    )
  }

  let data = null
  try {
    data = await response.json()
  } catch {
    // response had no JSON body
  }

  if (!response.ok) {
    const detail = data?.detail || `Request failed with status ${response.status}`
    throw new ApiError(detail, response.status, data)
  }

  return data
}

export async function getHealth() {
  return request('/health')
}

// features: {
//   latitude, longitude, magnetic_anomaly, gravity_anomaly,
//   geological_indicator, distance_to_fault_km, remote_sensing_index
// }
export async function predictProspectivity(features) {
  return request('/predict', {
    method: 'POST',
    body: JSON.stringify(features),
  })
}

export async function getGrid(bounds) {
  const params = new URLSearchParams()
  if (bounds) {
    if (bounds.minLat !== undefined) params.set('min_lat', bounds.minLat)
    if (bounds.maxLat !== undefined) params.set('max_lat', bounds.maxLat)
    if (bounds.minLon !== undefined) params.set('min_lon', bounds.minLon)
    if (bounds.maxLon !== undefined) params.set('max_lon', bounds.maxLon)
    if (bounds.step !== undefined) params.set('step', bounds.step)
  }
  const qs = params.toString()
  return request(`/grid${qs ? `?${qs}` : ''}`)
}

export { ApiError }
