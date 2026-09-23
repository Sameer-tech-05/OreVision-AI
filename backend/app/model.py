"""
Model loading and prediction logic for OreVision AI.

Design goals:
- A single, explicit FEATURE_ORDER used both for training and prediction,
  so the feature vector sent to XGBoost is always constructed the same way.
- If a real trained model file exists on disk, it is loaded and used.
- If no trained model exists, the API still works, but every response is
  clearly labeled model_mode="demo" and uses a transparent, documented
  heuristic instead of a fake "trained" score. This avoids presenting
  untrained/fabricated numbers as validated science.
"""

import os
import logging
from typing import Optional

import numpy as np

logger = logging.getLogger("orevision.model")

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "iron_ore_xgb_model.joblib")

# Canonical feature order. This MUST match training data column order.
FEATURE_ORDER = [
    "magnetic_anomaly",
    "gravity_anomaly",
    "geological_indicator",
    "distance_to_fault_km",
    "remote_sensing_index",
]


class ProspectivityModel:
    """Wraps an XGBoost regressor/classifier for iron ore prospectivity scoring."""

    def __init__(self):
        self.model = None
        self.mode = "demo"
        self._load()

    def _load(self) -> None:
        """Attempt to load a trained XGBoost model from disk (joblib format)."""
        if not os.path.exists(MODEL_PATH):
            logger.warning(
                "No trained model found at %s. Running in DEMO mode. "
                "See README.md 'Model setup' for how to train a real model.",
                MODEL_PATH,
            )
            self.model = None
            self.mode = "demo"
            return

        try:
            import joblib  # imported lazily so the API can still boot without it in demo mode

            self.model = joblib.load(MODEL_PATH)
            self.mode = "trained"
            logger.info("Loaded trained model from %s", MODEL_PATH)
        except Exception as exc:  # noqa: BLE001 - we want to degrade gracefully, not crash the API
            logger.error("Failed to load model file %s: %s. Falling back to demo mode.", MODEL_PATH, exc)
            self.model = None
            self.mode = "demo"

    def is_loaded(self) -> bool:
        return self.model is not None

    def _build_feature_vector(self, features: dict) -> np.ndarray:
        try:
            row = [float(features[name]) for name in FEATURE_ORDER]
        except KeyError as exc:
            raise ValueError(f"Missing required feature: {exc}") from exc
        return np.array(row, dtype=np.float64).reshape(1, -1)

    def predict(self, features: dict) -> float:
        """
        Return a prospectivity score in [0, 1].

        If a real trained model is loaded, uses it directly.
        If not, uses a transparent, non-fabricated demo heuristic so the
        rest of the application (UI, map, analytics) remains usable for
        demonstration purposes without pretending to be a validated model.
        """
        x = self._build_feature_vector(features)

        if self.model is not None:
            try:
                raw = self.model.predict(x)
                score = float(np.asarray(raw).reshape(-1)[0])
                return float(np.clip(score, 0.0, 1.0))
            except Exception as exc:  # noqa: BLE001
                logger.error("Trained model prediction failed, falling back to demo heuristic: %s", exc)
                # fall through to demo heuristic below

        return self._demo_heuristic(features)

    @staticmethod
    def _demo_heuristic(features: dict) -> float:
        """
        A documented, deterministic placeholder ONLY used when no trained
        model is available. This is explicitly NOT a machine-learning
        prediction and must never be reported as one.

        It combines the normalized geological indicator and remote sensing
        index positively, and penalizes distance to the nearest fault,
        producing a bounded [0, 1] value so the UI has something sensible
        to render in demo mode.
        """
        geo = float(features.get("geological_indicator", 0.5))
        rs = (float(features.get("remote_sensing_index", 0.0)) + 1.0) / 2.0  # rescale [-1,1] -> [0,1]
        fault_penalty = 1.0 / (1.0 + float(features.get("distance_to_fault_km", 5.0)) / 5.0)

        score = 0.45 * geo + 0.30 * rs + 0.25 * fault_penalty
        return float(np.clip(score, 0.0, 1.0))


_model_singleton: Optional[ProspectivityModel] = None


def get_model() -> ProspectivityModel:
    global _model_singleton
    if _model_singleton is None:
        _model_singleton = ProspectivityModel()
    return _model_singleton
