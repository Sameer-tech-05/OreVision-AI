"""
OreVision AI - FastAPI backend.

Endpoints:
    GET  /               - basic API info
    GET  /api/health      - health check, reports whether a real trained model is loaded
    POST /api/predict     - run a single prospectivity prediction
    GET  /api/grid        - return a small grid of sample points for map display
"""

import logging
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import (
    PredictionRequest,
    PredictionResponse,
    HealthResponse,
    GridResponse,
    GridPoint,
)
from app.model import get_model

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("orevision.main")

API_VERSION = "1.0.0"
MODEL_NAME = "OreVision-XGBoost-IronOre-Prospectivity"

app = FastAPI(
    title="OreVision AI API",
    description=(
        "AI-driven iron ore prospectivity mapping API using multisource "
        "geospatial data and XGBoost. Academic mini-project - see README "
        "for limitations and disclaimers."
    ),
    version=API_VERSION,
)

# CORS: allow the Vite dev server and configurable origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

DISCLAIMER = (
    "This output is generated for an academic mini-project. It is NOT a "
    "validated geological survey result and must not be used for real "
    "exploration, investment, or land-use decisions."
)


@app.get("/")
def root():
    return {
        "project": "OreVision AI",
        "description": "AI-driven iron ore prospectivity mapping using multisource geospatial data and XGBoost",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health", response_model=HealthResponse)
def health():
    model = get_model()
    return HealthResponse(
        status="ok",
        model_loaded=model.is_loaded(),
        model_mode=model.mode,
        api_version=API_VERSION,
        timestamp=datetime.now(timezone.utc),
    )


@app.post("/api/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest):
    model = get_model()

    features = {
        "magnetic_anomaly": request.magnetic_anomaly,
        "gravity_anomaly": request.gravity_anomaly,
        "geological_indicator": request.geological_indicator,
        "distance_to_fault_km": request.distance_to_fault_km,
        "remote_sensing_index": request.remote_sensing_index,
    }

    try:
        score = model.predict(features)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("Prediction failed")
        raise HTTPException(status_code=500, detail="Internal error during prediction") from exc

    classification = None
    # Only classify when we actually trust the score, i.e. a real trained model.
    if model.mode == "trained":
        if score >= 0.7:
            classification = "High prospectivity"
        elif score >= 0.4:
            classification = "Moderate prospectivity"
        else:
            classification = "Low prospectivity"

    if model.mode == "trained":
        explanation = (
            "Score produced by the trained XGBoost model from the input "
            "geospatial and geological features."
        )
    else:
        explanation = (
            "No trained model file was found on the server, so this score "
            "was produced by a simple documented demo heuristic, NOT by "
            "XGBoost. Train and place a model file to get real predictions "
            "(see README 'Model setup')."
        )

    return PredictionResponse(
        prospectivity_score=round(score, 4),
        classification=classification,
        latitude=request.latitude,
        longitude=request.longitude,
        model_name=MODEL_NAME,
        model_mode=model.mode,
        timestamp=datetime.now(timezone.utc),
        explanation=explanation,
        disclaimer=DISCLAIMER,
    )


@app.get("/api/grid", response_model=GridResponse)
def grid(
    min_lat: float = 20.0,
    max_lat: float = 24.0,
    min_lon: float = 83.0,
    max_lon: float = 87.0,
    step: float = 1.0,
):
    """
    Return a coarse grid of prediction points for map visualization.

    If no real trained model or dataset is present, the response is
    explicitly marked is_demo_data=True so the frontend can render an
    honest "demo data" label instead of implying these are real surveyed
    prospectivity zones.
    """
    if step <= 0:
        raise HTTPException(status_code=422, detail="step must be positive")
    if min_lat >= max_lat or min_lon >= max_lon:
        raise HTTPException(status_code=422, detail="min bounds must be less than max bounds")

    model = get_model()
    points = []

    lat = min_lat
    while lat <= max_lat:
        lon = min_lon
        while lon <= max_lon:
            # Deterministic, feature-free synthetic inputs purely to populate
            # the demo grid when no real dataset is configured. These are
            # NOT real magnetic/gravity survey readings.
            synthetic_features = {
                "magnetic_anomaly": (lat * 3.1 + lon * 1.7) % 50,
                "gravity_anomaly": (lat * 1.3 - lon * 0.9) % 20,
                "geological_indicator": abs((lat * lon) % 1.0),
                "distance_to_fault_km": abs((lat - lon) % 10.0),
                "remote_sensing_index": ((lat + lon) % 2.0) - 1.0,
            }
            score = model.predict(synthetic_features)
            points.append(GridPoint(latitude=lat, longitude=lon, prospectivity_score=round(score, 4)))
            lon += step
        lat += step

    is_demo = model.mode != "trained"
    message = (
        "Demo grid: no trained model / real dataset is configured, values are illustrative only."
        if is_demo
        else "Grid generated using the trained model over synthetic sample coordinates for visualization."
    )

    return GridResponse(points=points, is_demo_data=is_demo, message=message)
