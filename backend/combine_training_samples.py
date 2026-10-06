import os
import pandas as pd
import numpy as np


# ============================================================
# STEP 5E - COMBINE TRAINING SAMPLES
# ============================================================

print("=" * 60)
print("STEP 5E - COMBINING POSITIVE + BACKGROUND SAMPLES")
print("=" * 60)


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


POSITIVE_FILE = os.path.join(
    DATA_DIR,
    "Positive_Samples.csv"
)


BACKGROUND_FILE = os.path.join(
    DATA_DIR,
    "Background_Samples.csv"
)


OUTPUT_FILE = os.path.join(
    DATA_DIR,
    "Combined_Training_Data.csv"
)


# ------------------------------------------------------------
# Required ML features
# ------------------------------------------------------------

FEATURES = [
    "NDVI",
    "NDMI",
    "B04_B02",
    "B04_B11",
    "B11_B12"
]


# ------------------------------------------------------------
# Check files
# ------------------------------------------------------------

print("\nChecking input files...")


if not os.path.exists(POSITIVE_FILE):
    raise FileNotFoundError(
        f"Missing positive sample file:\n{POSITIVE_FILE}"
    )

print("[OK] Positive samples")


if not os.path.exists(BACKGROUND_FILE):
    raise FileNotFoundError(
        f"Missing background sample file:\n{BACKGROUND_FILE}"
    )

print("[OK] Background samples")


# ------------------------------------------------------------
# Load data
# ------------------------------------------------------------

print("\nLoading positive samples...")

positive_df = pd.read_csv(
    POSITIVE_FILE
)

print(
    f"Positive samples loaded: "
    f"{len(positive_df)}"
)


print("\nLoading background samples...")

background_df = pd.read_csv(
    BACKGROUND_FILE
)

print(
    f"Background samples loaded: "
    f"{len(background_df)}"
)


# ============================================================
# CHECK REQUIRED COLUMNS
# ============================================================

required_columns = [
    "latitude",
    "longitude",
    "x_utm",
    "y_utm"
] + FEATURES + ["label"]


print("\nChecking required columns...")


for column in required_columns:

    if column not in positive_df.columns:

        raise ValueError(
            f"Positive dataset missing column: {column}"
        )

    if column not in background_df.columns:

        raise ValueError(
            f"Background dataset missing column: {column}"
        )


print("[OK] Required columns found")


# ============================================================
# CHECK LABELS
# ============================================================

print("\nChecking labels...")


positive_labels = (
    positive_df["label"]
    .unique()
    .tolist()
)


background_labels = (
    background_df["label"]
    .unique()
    .tolist()
)


print(
    f"Positive labels: {positive_labels}"
)

print(
    f"Background labels: {background_labels}"
)


if positive_labels != [1]:

    raise ValueError(
        "Positive dataset must contain only label 1."
    )


if background_labels != [0]:

    raise ValueError(
        "Background dataset must contain only label 0."
    )


print("[OK] Labels are correct")


# ============================================================
# SELECT COMMON TRAINING COLUMNS
# ============================================================

training_columns = [
    "latitude",
    "longitude",
    "x_utm",
    "y_utm"
] + FEATURES + ["label"]


positive_training = positive_df[
    training_columns
].copy()


background_training = background_df[
    training_columns
].copy()


# ============================================================
# ADD SAMPLE TYPE
# ============================================================

positive_training["sample_type"] = (
    "positive_gsi"
)


background_training["sample_type"] = (
    "background"
)


# ============================================================
# COMBINE
# ============================================================

print("\nCombining datasets...")


combined_df = pd.concat(
    [
        positive_training,
        background_training
    ],
    ignore_index=True
)


print(
    f"Total combined samples: "
    f"{len(combined_df)}"
)


# ============================================================
# SHUFFLE
# ============================================================

print("\nShuffling samples...")


combined_df = combined_df.sample(
    frac=1,
    random_state=42
).reset_index(
    drop=True
)


# Create sample ID after shuffling

combined_df.insert(
    0,
    "sample_id",
    [
        f"TRAIN_{i:04d}"
        for i in range(
            1,
            len(combined_df) + 1
        )
    ]
)


# ============================================================
# QUALITY CONTROL
# ============================================================

print("\n")
print("=" * 60)
print("TRAINING DATA QUALITY CONTROL")
print("=" * 60)


# ------------------------------------------------------------
# Missing values
# ------------------------------------------------------------

print("\nChecking missing values...")


missing = combined_df.isnull().sum()

print(missing)


if missing.sum() > 0:

    raise RuntimeError(
        "QUALITY CONTROL FAILED: "
        "Missing values detected."
    )


print(
    "[OK] No missing values."
)


# ------------------------------------------------------------
# Numeric feature check
# ------------------------------------------------------------

print("\nChecking ML feature values...")


for feature in FEATURES:

    values = pd.to_numeric(
        combined_df[feature],
        errors="coerce"
    )

    if not np.isfinite(
        values
    ).all():

        raise RuntimeError(
            f"QUALITY CONTROL FAILED: "
            f"Invalid values in {feature}"
        )


    print(
        f"[OK] {feature}"
    )


# ------------------------------------------------------------
# Label check
# ------------------------------------------------------------

print("\nChecking label distribution...")


print(
    combined_df["label"].value_counts()
)


expected_labels = {0, 1}

actual_labels = set(
    combined_df["label"].unique()
)


if actual_labels != expected_labels:

    raise RuntimeError(
        "QUALITY CONTROL FAILED: "
        "Expected labels 0 and 1."
    )


print(
    "[OK] Both classes are present."
)


# ------------------------------------------------------------
# Sample type check
# ------------------------------------------------------------

print("\nChecking sample types...")


print(
    combined_df[
        "sample_type"
    ].value_counts()
)


# ------------------------------------------------------------
# Coordinate check
# ------------------------------------------------------------

print("\nChecking coordinates...")


coordinate_columns = [
    "latitude",
    "longitude",
    "x_utm",
    "y_utm"
]


for column in coordinate_columns:

    if not np.isfinite(
        combined_df[column]
    ).all():

        raise RuntimeError(
            f"QUALITY CONTROL FAILED: "
            f"Invalid coordinates in {column}"
        )


print(
    "[OK] All coordinates are valid."
)


# ============================================================
# FINAL COUNTS
# ============================================================

positive_count = int(
    (
        combined_df["label"] == 1
    ).sum()
)


background_count = int(
    (
        combined_df["label"] == 0
    ).sum()
)


print("\n")
print("=" * 60)
print("FINAL DATASET SUMMARY")
print("=" * 60)


print(
    f"Positive samples  : {positive_count}"
)


print(
    f"Background samples: {background_count}"
)


print(
    f"Total samples     : {len(combined_df)}"
)


print(
    f"Number of features: {len(FEATURES)}"
)


print("\nML features:")

for feature in FEATURES:

    print(
        f" - {feature}"
    )


# ============================================================
# SAVE
# ============================================================

combined_df.to_csv(
    OUTPUT_FILE,
    index=False
)


print("\nOutput file:")

print(
    OUTPUT_FILE
)


# ============================================================
# PREVIEW
# ============================================================

print("\nFirst 10 training samples:")

print(
    combined_df.head(10).to_string(
        index=False
    )
)


print("\n")
print("=" * 60)
print("STEP 5E COMPLETE")
print("=" * 60)


print(
    "\n[PASS] Combined training dataset created successfully."
)