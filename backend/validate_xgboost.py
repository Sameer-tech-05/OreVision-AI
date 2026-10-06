import os
import json
import joblib
import numpy as np
import pandas as pd

from xgboost import XGBClassifier

from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.metrics import make_scorer, precision_score, recall_score, f1_score


# ============================================================
# STEP 6B - XGBOOST CROSS-VALIDATION AND MODEL IMPROVEMENT
# ============================================================

print("=" * 70)
print("STEP 6B - XGBOOST MODEL VALIDATION")
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

BEST_MODEL_FILE = os.path.join(
    MODEL_DIR,
    "iron_ore_xgb_validated_model.joblib"
)

RESULT_FILE = os.path.join(
    MODEL_DIR,
    "xgb_cross_validation_results.json"
)


# ------------------------------------------------------------
# Features
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

print("\nLoading dataset...")

df = pd.read_csv(DATA_FILE)

X = df[FEATURES].copy()
y = df[TARGET].copy()

print(
    f"Total samples: {len(df)}"
)

print(
    f"Positive samples: {(y == 1).sum()}"
)

print(
    f"Background samples: {(y == 0).sum()}"
)


# ============================================================
# STRATIFIED 5-FOLD
# ============================================================

print("\nCreating Stratified 5-Fold Cross-Validation...")

cv = StratifiedKFold(
    n_splits=5,
    shuffle=True,
    random_state=42
)


# ============================================================
# SCORING
# ============================================================

scoring = {
    "roc_auc": "roc_auc",
    "accuracy": "accuracy",
    "precision": make_scorer(
        precision_score,
        zero_division=0
    ),
    "recall": make_scorer(
        recall_score,
        zero_division=0
    ),
    "f1": make_scorer(
        f1_score,
        zero_division=0
    )
}


# ============================================================
# CLASS WEIGHT
# ============================================================

negative_count = int(
    (y == 0).sum()
)

positive_count = int(
    (y == 1).sum()
)

scale_pos_weight = (
    negative_count / positive_count
)

print(
    f"\nScale positive weight: "
    f"{scale_pos_weight:.3f}"
)


# ============================================================
# MODEL CONFIGURATIONS
# ============================================================

models = {

    "Model_A": {
        "n_estimators": 150,
        "max_depth": 2,
        "learning_rate": 0.05
    },

    "Model_B": {
        "n_estimators": 250,
        "max_depth": 3,
        "learning_rate": 0.05
    },

    "Model_C": {
        "n_estimators": 350,
        "max_depth": 3,
        "learning_rate": 0.03
    },

    "Model_D": {
        "n_estimators": 250,
        "max_depth": 4,
        "learning_rate": 0.03
    },

    "Model_E": {
        "n_estimators": 400,
        "max_depth": 2,
        "learning_rate": 0.03
    }
}


# ============================================================
# CROSS VALIDATION
# ============================================================

results = {}

best_model_name = None
best_auc = -1


for name, params in models.items():

    print("\n")
    print("-" * 70)
    print(f"Testing {name}")
    print("-" * 70)

    model = XGBClassifier(
        n_estimators=params["n_estimators"],
        max_depth=params["max_depth"],
        learning_rate=params["learning_rate"],
        subsample=0.8,
        colsample_bytree=0.8,
        objective="binary:logistic",
        eval_metric="logloss",
        scale_pos_weight=scale_pos_weight,
        random_state=42,
        n_jobs=-1
    )


    scores = cross_validate(
        model,
        X,
        y,
        cv=cv,
        scoring=scoring,
        n_jobs=1
    )


    mean_auc = float(
        np.mean(
            scores["test_roc_auc"]
        )
    )

    std_auc = float(
        np.std(
            scores["test_roc_auc"]
        )
    )

    mean_accuracy = float(
        np.mean(
            scores["test_accuracy"]
        )
    )

    mean_precision = float(
        np.mean(
            scores["test_precision"]
        )
    )

    mean_recall = float(
        np.mean(
            scores["test_recall"]
        )
    )

    mean_f1 = float(
        np.mean(
            scores["test_f1"]
        )
    )


    print(
        f"ROC-AUC : "
        f"{mean_auc:.4f} "
        f"+/- {std_auc:.4f}"
    )

    print(
        f"Accuracy: "
        f"{mean_accuracy:.4f}"
    )

    print(
        f"Precision: "
        f"{mean_precision:.4f}"
    )

    print(
        f"Recall: "
        f"{mean_recall:.4f}"
    )

    print(
        f"F1: "
        f"{mean_f1:.4f}"
    )


    results[name] = {
        "parameters": params,
        "roc_auc_mean": mean_auc,
        "roc_auc_std": std_auc,
        "accuracy_mean": mean_accuracy,
        "precision_mean": mean_precision,
        "recall_mean": mean_recall,
        "f1_mean": mean_f1
    }


    if mean_auc > best_auc:

        best_auc = mean_auc
        best_model_name = name


# ============================================================
# BEST MODEL
# ============================================================

print("\n")
print("=" * 70)
print("CROSS-VALIDATION SUMMARY")
print("=" * 70)


for name, result in results.items():

    print(
        f"\n{name}"
    )

    print(
        f"  ROC-AUC: "
        f"{result['roc_auc_mean']:.4f}"
    )

    print(
        f"  F1: "
        f"{result['f1_mean']:.4f}"
    )


print("\n")
print(
    f"BEST MODEL: {best_model_name}"
)

print(
    f"BEST MEAN ROC-AUC: {best_auc:.4f}"
)


# ============================================================
# TRAIN FINAL MODEL
# ============================================================

best_params = models[
    best_model_name
]


print("\nTraining final validated model...")


final_model = XGBClassifier(
    n_estimators=best_params["n_estimators"],
    max_depth=best_params["max_depth"],
    learning_rate=best_params["learning_rate"],
    subsample=0.8,
    colsample_bytree=0.8,
    objective="binary:logistic",
    eval_metric="logloss",
    scale_pos_weight=scale_pos_weight,
    random_state=42,
    n_jobs=-1
)


final_model.fit(
    X,
    y
)


# ============================================================
# SAVE MODEL
# ============================================================

joblib.dump(
    final_model,
    BEST_MODEL_FILE
)


print(
    f"\n[OK] Validated model saved:"
)

print(
    BEST_MODEL_FILE
)


# ============================================================
# SAVE RESULTS
# ============================================================

output = {
    "dataset": "Combined_Training_Data.csv",
    "total_samples": int(len(df)),
    "positive_samples": positive_count,
    "background_samples": negative_count,
    "features": FEATURES,
    "cross_validation": "Stratified 5-Fold",
    "random_state": 42,
    "scale_pos_weight": float(scale_pos_weight),
    "best_model": best_model_name,
    "best_mean_roc_auc": float(best_auc),
    "models": results
}


with open(
    RESULT_FILE,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        output,
        f,
        indent=4
    )


print(
    f"[OK] Validation results saved:"
)

print(
    RESULT_FILE
)


# ============================================================
# FINAL MESSAGE
# ============================================================

print("\n")
print("=" * 70)
print("STEP 6B COMPLETE")
print("=" * 70)

print(
    "\n[PASS] Cross-validation completed."
)

print(
    f"Best model: {best_model_name}"
)

print(
    f"Mean ROC-AUC: {best_auc:.4f}"
)