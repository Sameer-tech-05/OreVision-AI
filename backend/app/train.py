"""
Training script for the OreVision AI iron ore prospectivity model.

USAGE:
    python -m app.train --data /path/to/labelled_dataset.csv

DATASET REQUIREMENTS:
    A CSV file with the following columns (header row required):

        magnetic_anomaly, gravity_anomaly, geological_indicator,
        distance_to_fault_km, remote_sensing_index, label

    - The first five columns are the model features and MUST match
      FEATURE_ORDER in app/model.py exactly (order matters).
    - `label` is the target: either a continuous prospectivity score in
      [0, 1] (for regression, the default) or a binary 0/1 class label
      (for classification, pass --classification).
    - This project ships WITHOUT a real labelled geological dataset,
      because iron ore prospectivity ground-truth data is proprietary /
      survey-specific. You must supply your own dataset (e.g. from a
      geological survey department, published research dataset, or
      synthetic data you generate for coursework) before running this
      script for a real, non-demo model.

OUTPUT:
    Saves a trained XGBoost model to backend/models/iron_ore_xgb_model.joblib
    using joblib, which app/model.py will automatically pick up on the
    next API restart.
"""

import argparse
import logging
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from app.model import FEATURE_ORDER, MODEL_PATH, MODEL_DIR  # noqa: E402

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("orevision.train")


def load_dataset(csv_path: str) -> tuple[np.ndarray, np.ndarray]:
    df = pd.read_csv(csv_path)

    missing = [c for c in FEATURE_ORDER + ["label"] if c not in df.columns]
    if missing:
        raise ValueError(
            f"Dataset is missing required columns: {missing}. "
            f"Expected columns: {FEATURE_ORDER + ['label']}"
        )

    X = df[FEATURE_ORDER].to_numpy(dtype=np.float64)
    y = df["label"].to_numpy(dtype=np.float64)
    return X, y


def train(csv_path: str, classification: bool, test_size: float = 0.2, random_state: int = 42):
    try:
        import xgboost as xgb
    except ImportError as exc:
        raise SystemExit(
            "xgboost is not installed. Install backend/requirements.txt first: "
            "pip install -r requirements.txt"
        ) from exc

    from sklearn.model_selection import train_test_split
    import joblib

    X, y = load_dataset(csv_path)
    if len(X) < 20:
        logger.warning(
            "Only %d rows in dataset - this is too small for a reliable model. "
            "Results will not be scientifically meaningful.",
            len(X),
        )

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state
    )

    if classification:
        model = xgb.XGBClassifier(
            n_estimators=200,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            eval_metric="logloss",
            random_state=random_state,
        )
    else:
        model = xgb.XGBRegressor(
            n_estimators=300,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            objective="reg:squarederror",
            random_state=random_state,
        )

    model.fit(X_train, y_train)

    # Honest evaluation - printed, never fabricated.
    if classification:
        from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

        preds = model.predict(X_test)
        logger.info("Test accuracy:  %.4f", accuracy_score(y_test, preds))
        logger.info("Test precision: %.4f", precision_score(y_test, preds, zero_division=0))
        logger.info("Test recall:    %.4f", recall_score(y_test, preds, zero_division=0))
        logger.info("Test F1:        %.4f", f1_score(y_test, preds, zero_division=0))
    else:
        from sklearn.metrics import mean_absolute_error, r2_score

        preds = model.predict(X_test)
        logger.info("Test MAE: %.4f", mean_absolute_error(y_test, preds))
        logger.info("Test R2:  %.4f", r2_score(y_test, preds))

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    logger.info("Saved trained model to %s", MODEL_PATH)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train the OreVision AI XGBoost model")
    parser.add_argument("--data", required=True, help="Path to labelled CSV dataset")
    parser.add_argument(
        "--classification",
        action="store_true",
        help="Train a binary classifier instead of the default regressor",
    )
    args = parser.parse_args()
    train(args.data, classification=args.classification)
