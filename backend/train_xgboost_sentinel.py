import os
import json
import joblib
import numpy as np
import pandas as pd

from xgboost import XGBClassifier

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report
)


# ============================================================
# STEP 6 - XGBOOST TRAINING
# ============================================================

print("=" * 70)
print("STEP 6 - XGBOOST IRON ORE PROSPECTIVITY MODEL")
print("=" * 70)


# ------------------------------------------------------------
# Paths
# ------------------------------------------------------------

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

DATA_DIR = os.path.join(
    BASE_DIR,
    "data",
    "processed",
    "gsi_sentinel"
)

MODEL_DIR = os.path.join(
    BASE_DIR,
    "models"
)

os.makedirs(
    MODEL_DIR,
    exist_ok=True
)


DATA_FILE = os.path.join(
    DATA_DIR,
    "Combined_Training_Data.csv"
)

MODEL_FILE = os.path.join(
    MODEL_DIR,
    "iron_ore_xgb_sentinel_model.joblib"
)

METRICS_FILE = os.path.join(
    MODEL_DIR,
    "xgb_sentinel_metrics.json"
)


# ------------------------------------------------------------
# ML features
# ------------------------------------------------------------

FEATURES = [
    "NDVI",
    "NDMI",
    "B04_B02",
    "B04_B11",
    "B11_B12"
]

TARGET = "label"


# ============================================================
# LOAD DATA
# ============================================================

print("\nLoading training dataset...")

if not os.path.exists(DATA_FILE):
    raise FileNotFoundError(
        f"Training dataset not found:\n{DATA_FILE}"
    )


df = pd.read_csv(DATA_FILE)

print(
    f"Dataset shape: {df.shape}"
)


# ============================================================
# CHECK DATA
# ============================================================

print("\nChecking required columns...")

for column in FEATURES + [TARGET]:

    if column not in df.columns:

        raise ValueError(
            f"Missing required column: {column}"
        )

print("[OK] Required columns found.")


print("\nChecking missing values...")

missing = df[FEATURES + [TARGET]].isnull().sum()

if missing.sum() > 0:

    print(missing)

    raise ValueError(
        "Missing values detected."
    )

print("[OK] No missing values.")


# ============================================================
# PREPARE X AND Y
# ============================================================

X = df[FEATURES].copy()

y = df[TARGET].copy()


print("\nClass distribution:")

print(
    y.value_counts()
)


# ============================================================
# TRAIN / TEST SPLIT
# ============================================================

print("\nCreating stratified train/test split...")

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)


print(
    f"Training samples: {len(X_train)}"
)

print(
    f"Testing samples : {len(X_test)}"
)


print("\nTraining class distribution:")

print(
    y_train.value_counts()
)


print("\nTesting class distribution:")

print(
    y_test.value_counts()
)


# ============================================================
# CLASS IMBALANCE
# ============================================================

negative_count = int(
    (y_train == 0).sum()
)

positive_count = int(
    (y_train == 1).sum()
)

scale_pos_weight = (
    negative_count / positive_count
)


print("\nClass imbalance handling:")

print(
    f"Negative training samples: {negative_count}"
)

print(
    f"Positive training samples: {positive_count}"
)

print(
    f"scale_pos_weight: {scale_pos_weight:.3f}"
)


# ============================================================
# CREATE XGBOOST MODEL
# ============================================================

print("\nCreating XGBoost classifier...")


model = XGBClassifier(
    n_estimators=250,
    max_depth=4,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    objective="binary:logistic",
    eval_metric="logloss",
    scale_pos_weight=scale_pos_weight,
    random_state=42,
    n_jobs=-1
)


# ============================================================
# TRAIN
# ============================================================

print("\nTraining XGBoost model...")

model.fit(
    X_train,
    y_train
)

print("[OK] Model training completed.")


# ============================================================
# PREDICTION
# ============================================================

print("\nGenerating predictions...")


y_pred = model.predict(
    X_test
)

y_probability = model.predict_proba(
    X_test
)[:, 1]


# ============================================================
# EVALUATION
# ============================================================

accuracy = accuracy_score(
    y_test,
    y_pred
)

precision = precision_score(
    y_test,
    y_pred,
    zero_division=0
)

recall = recall_score(
    y_test,
    y_pred,
    zero_division=0
)

f1 = f1_score(
    y_test,
    y_pred,
    zero_division=0
)

roc_auc = roc_auc_score(
    y_test,
    y_probability
)


print("\n")
print("=" * 70)
print("MODEL EVALUATION")
print("=" * 70)

print(
    f"\nAccuracy : {accuracy:.4f}"
)

print(
    f"Precision: {precision:.4f}"
)

print(
    f"Recall   : {recall:.4f}"
)

print(
    f"F1 Score : {f1:.4f}"
)

print(
    f"ROC-AUC  : {roc_auc:.4f}"
)


# ============================================================
# CONFUSION MATRIX
# ============================================================

cm = confusion_matrix(
    y_test,
    y_pred
)


print("\nConfusion Matrix:")

print(cm)


print("\nClassification Report:")

print(
    classification_report(
        y_test,
        y_pred,
        target_names=[
            "Background",
            "GSI Reference"
        ],
        zero_division=0
    )
)


# ============================================================
# FEATURE IMPORTANCE
# ============================================================

print("\n")
print("=" * 70)
print("FEATURE IMPORTANCE")
print("=" * 70)


importance = model.feature_importances_


feature_importance = pd.DataFrame({
    "feature": FEATURES,
    "importance": importance
})


feature_importance = (
    feature_importance
    .sort_values(
        "importance",
        ascending=False
    )
    .reset_index(drop=True)
)


print(
    feature_importance.to_string(
        index=False
    )
)


# ============================================================
# SAVE MODEL
# ============================================================

print("\nSaving trained model...")


joblib.dump(
    model,
    MODEL_FILE
)


print(
    f"[OK] Model saved:\n{MODEL_FILE}"
)


# ============================================================
# SAVE METRICS
# ============================================================

metrics = {
    "model": "XGBoost Classifier",
    "features": FEATURES,
    "total_samples": int(len(df)),
    "training_samples": int(len(X_train)),
    "testing_samples": int(len(X_test)),
    "positive_samples": int(y.sum()),
    "background_samples": int((y == 0).sum()),
    "scale_pos_weight": float(scale_pos_weight),
    "accuracy": float(accuracy),
    "precision": float(precision),
    "recall": float(recall),
    "f1_score": float(f1),
    "roc_auc": float(roc_auc),
    "confusion_matrix": cm.tolist(),
    "feature_importance": {
        row["feature"]: float(row["importance"])
        for _, row in feature_importance.iterrows()
    }
}


with open(
    METRICS_FILE,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        metrics,
        f,
        indent=4
    )


print(
    f"[OK] Metrics saved:\n{METRICS_FILE}"
)


# ============================================================
# FINAL
# ============================================================

print("\n")
print("=" * 70)
print("STEP 6 COMPLETE")
print("=" * 70)

print("\n[PASS] XGBoost model trained successfully.")

print(
    "\nModel file:"
)

print(
    MODEL_FILE
)

print(
    "\nMetrics file:"
)

print(
    METRICS_FILE
)