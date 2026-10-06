// OreVision AI - API service layer
// API functions used by the React frontend.

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || '/api'

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
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
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
    // Response had no JSON body.
  }

  if (!response.ok) {
    const detail =
      data?.detail ||
      `Request failed with status ${response.status}`

    throw new ApiError(
      detail,
      response.status,
      data,
    )
  }

  return data
}

export async function getHealth() {
  return request('/health')
}

/*
 * Coordinate-based prospectivity prediction.
 *
 * The backend automatically:
 *
 * latitude + longitude
 *        ↓
 * Sentinel-2 raster sampling
 *        ↓
 * NDVI
 * NDMI
 * B04_B02
 * B04_B11
 * B11_B12
 *        ↓
 * Validated XGBoost
 *        ↓
 * Prospectivity result
 *
 * Expected input:
 *
 * {
 *   latitude: 15.194444,
 *   longitude: 76.677778
 * }
 */
export async function predictProspectivity(location) {
  return request('/predict-location', {
    method: 'POST',
    body: JSON.stringify({
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
    }),
  })
}

/*
 * Legacy grid endpoint.
 *
 * Kept because other parts of the existing
 * application may still use the grid API.
 */
export async function getGrid(bounds) {
  const params = new URLSearchParams()

  if (bounds) {
    if (bounds.minLat !== undefined) {
      params.set('min_lat', bounds.minLat)
    }

    if (bounds.maxLat !== undefined) {
      params.set('max_lat', bounds.maxLat)
    }

    if (bounds.minLon !== undefined) {
      params.set('min_lon', bounds.minLon)
    }

    if (bounds.maxLon !== undefined) {
      params.set('max_lon', bounds.maxLon)
    }

    if (bounds.step !== undefined) {
      params.set('step', bounds.step)
    }
  }

  const qs = params.toString()

  return request(
    `/grid${qs ? `?${qs}` : ''}`,
  )
}

export { ApiError }