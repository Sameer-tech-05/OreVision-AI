"""
Pydantic schemas for OreVision AI backend.

These schemas define the exact contract between the frontend and backend.
Field order here (see FEATURE_ORDER in model.py) must remain consistent
with the order used at model training time.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class PredictionRequest(BaseModel):
    """Input features for a single prospectivity prediction."""

    latitude: float = Field(..., ge=-90, le=90, description="Latitude in decimal degrees")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude in decimal degrees")
    magnetic_anomaly: float = Field(
        ..., description="Magnetic anomaly value (nT), from aeromagnetic survey data"
    )
    gravity_anomaly: float = Field(
        ..., description="Bouguer gravity anomaly value (mGal)"
    )
    geological_indicator: float = Field(
        ..., ge=0, le=1,
        description="Normalized geological favorability indicator (0-1), e.g. from lithology/mineralogy mapping"
    )
    distance_to_fault_km: float = Field(
        ..., ge=0, description="Distance to nearest mapped geological fault, in kilometres"
    )
    remote_sensing_index: float = Field(
        ..., ge=-1, le=1,
        description="Remote sensing indicator, e.g. iron-oxide spectral index derived from satellite imagery"
    )

    @field_validator("magnetic_anomaly", "gravity_anomaly")
    @classmethod
    def check_finite(cls, v: float) -> float:
        if v != v:  # NaN check without importing math
            raise ValueError("Value must be a finite number, not NaN")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "latitude": 22.35,
                "longitude": 85.32,
                "magnetic_anomaly": 145.6,
                "gravity_anomaly": 12.4,
                "geological_indicator": 0.72,
                "distance_to_fault_km": 3.1,
                "remote_sensing_index": 0.45,
            }
        }


class PredictionResponse(BaseModel):
    """Result of a single prospectivity prediction."""

    prospectivity_score: float = Field(
        ..., description="Model output score in [0, 1]. Higher indicates greater modeled prospectivity."
    )
    classification: Optional[str] = Field(
        None, description="Categorical label derived from the score, only set when thresholds are defined"
    )
    latitude: float
    longitude: float
    model_name: str
    model_mode: str = Field(
        ..., description="'trained' if a real fitted model was used, 'demo' if untrained placeholder logic was used"
    )
    timestamp: datetime
    explanation: str
    disclaimer: str


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_mode: str
    api_version: str
    timestamp: datetime


class GridPoint(BaseModel):
    latitude: float
    longitude: float
    prospectivity_score: float


class GridResponse(BaseModel):
    points: List[GridPoint]
    is_demo_data: bool
    message: str
