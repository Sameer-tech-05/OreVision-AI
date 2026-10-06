import os
import numpy as np
import pandas as pd
import rasterio


# ============================================================
# STEP 5D - POSITIVE SAMPLE GENERATION
# ============================================================

print("=" * 60)
print("STEP 5D - POSITIVE GSI SAMPLE GENERATION")
print("=" * 60)


# ------------------------------------------------------------
# Paths
# ------------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


GSI_FILE = os.path.join(
    BASE_DIR,
    "data",
    "processed",
    "gsi_sentinel",
    "GSI_Spatial_Anchors_Step4.csv"
)


LINKED_FILE = os.path.join(
    BASE_DIR,
    "data",
    "processed",
    "gsi_sentinel",
    "GSI_Sentinel_Linked_Anchors.csv"
)


OUTPUT_DIR = os.path.join(
    BASE_DIR,
    "data",
    "processed",
    "gsi_sentinel"
)


OUTPUT_FILE = os.path.join(
    OUTPUT_DIR,
    "Positive_Samples.csv"
)


os.makedirs(
    OUTPUT_DIR,
    exist_ok=True
)


# ------------------------------------------------------------
# Required Sentinel features
# ------------------------------------------------------------

FEATURES = [
    "NDVI",
    "NDMI",
    "B04_B02",
    "B04_B11",
    "B11_B12"
]


# ------------------------------------------------------------
# Check input files
# ------------------------------------------------------------

print("\nChecking input files...")


if not os.path.exists(GSI_FILE):

    raise FileNotFoundError(
        f"Missing GSI anchor file:\n{GSI_FILE}"
    )

print("[OK] GSI spatial anchor file")


if not os.path.exists(LINKED_FILE):

    raise FileNotFoundError(
        f"Missing linked Sentinel file:\n{LINKED_FILE}"
    )

print("[OK] GSI-Sentinel linked file")


# ------------------------------------------------------------
# Load files
# ------------------------------------------------------------

print("\nLoading GSI spatial anchors...")

gsi_df = pd.read_csv(
    GSI_FILE
)


print(
    f"Total GSI anchor records: {len(gsi_df)}"
)


print("\nLoading GSI-Sentinel linked data...")

linked_df = pd.read_csv(
    LINKED_FILE
)


print(
    f"Total linked records: {len(linked_df)}"
)


# ------------------------------------------------------------
# Check required columns
# ------------------------------------------------------------

required_gsi_columns = [
    "source_report",
    "locality",
    "latitude",
    "longitude",
    "toposheet",
    "x_utm",
    "y_utm"
]


required_linked_columns = [
    "source_report",
    "locality",
    "latitude",
    "longitude",
    "x_utm",
    "y_utm",
    "NDVI",
    "NDMI",
    "B04_B02",
    "B04_B11",
    "B11_B12",
    "valid_pixel"
]


for column in required_gsi_columns:

    if column not in gsi_df.columns:

        raise ValueError(
            f"Missing GSI column: {column}"
        )


for column in required_linked_columns:

    if column not in linked_df.columns:

        raise ValueError(
            f"Missing linked-data column: {column}"
        )


print("[OK] Required columns found")


# ============================================================
# SELECT VALID POSITIVE LOCATIONS
# ============================================================

print("\nSelecting valid GSI positive locations...")


positive_df = linked_df.copy()


# Keep only Sentinel-valid pixels

positive_df = positive_df[
    positive_df["valid_pixel"] == 1
].copy()


print(
    "Valid Sentinel-linked GSI locations: "
    f"{len(positive_df)}"
)


# Remove rows with missing features

positive_df = positive_df.dropna(
    subset=FEATURES
).copy()


print(
    "Valid locations after feature check: "
    f"{len(positive_df)}"
)


# ------------------------------------------------------------
# Remove duplicate locality/source combinations
# ------------------------------------------------------------

positive_df = positive_df.drop_duplicates(
    subset=[
        "source_report",
        "locality"
    ]
).copy()


print(
    "Unique positive locations: "
    f"{len(positive_df)}"
)


# ============================================================
# CREATE TRAINING LABEL
# ============================================================

positive_df["label"] = 1


# This identifies the source of the positive sample.

positive_df["sample_type"] = (
    "GSI_reference_locality"
)


# ------------------------------------------------------------
# Select final columns
# ------------------------------------------------------------

final_columns = [

    "source_report",

    "locality",

    "latitude",

    "longitude",

    "x_utm",

    "y_utm",

    "toposheet",

    "NDVI",

    "NDMI",

    "B04_B02",

    "B04_B11",

    "B11_B12",

    "valid_pixel",

    "sample_type",

    "label"
]


# Some linked files may not contain toposheet.
# Recover it from the original GSI file.

if "toposheet" not in positive_df.columns:

    positive_df = positive_df.merge(

        gsi_df[
            [
                "source_report",
                "locality",
                "toposheet"
            ]
        ],

        on=[
            "source_report",
            "locality"
        ],

        how="left"
    )


positive_df = positive_df[
    final_columns
].copy()


# ============================================================
# QUALITY CONTROL
# ============================================================

print("\n")
print("=" * 60)
print("POSITIVE SAMPLE QUALITY CONTROL")
print("=" * 60)


# Missing values

print("\nChecking missing values...")

missing = positive_df.isnull().sum()

print(missing)


if missing.sum() > 0:

    raise RuntimeError(
        "QUALITY CONTROL FAILED: "
        "Positive samples contain missing values."
    )


print(
    "\n[OK] No missing values."
)


# Check labels

print("\nChecking labels...")

print(
    positive_df["label"].value_counts()
)


if not all(
    positive_df["label"] == 1
):

    raise RuntimeError(
        "QUALITY CONTROL FAILED: "
        "Positive sample label is not 1."
    )


print(
    "[OK] All positive samples have label = 1."
)


# Check Sentinel validity

invalid_pixels = (
    positive_df["valid_pixel"] != 1
).sum()


print(
    f"\nInvalid Sentinel pixels: "
    f"{invalid_pixels}"
)


if invalid_pixels > 0:

    raise RuntimeError(
        "QUALITY CONTROL FAILED: "
        "Invalid Sentinel pixels detected."
    )


print(
    "[OK] All samples have valid Sentinel pixels."
)


# Check feature values

for feature in FEATURES:

    if not np.isfinite(
        positive_df[feature].astype(float)
    ).all():

        raise RuntimeError(
            f"QUALITY CONTROL FAILED: "
            f"Invalid values in {feature}"
        )


print(
    "[OK] All Sentinel features are numeric and finite."
)


# ============================================================
# SAVE
# ============================================================

positive_df.to_csv(
    OUTPUT_FILE,
    index=False
)


# ============================================================
# REPORT
# ============================================================

print("\n")
print("=" * 60)
print("POSITIVE SAMPLE GENERATION COMPLETE")
print("=" * 60)


print(
    f"Positive samples: "
    f"{len(positive_df)}"
)


print(
    f"Label: "
    f"{positive_df['label'].unique().tolist()}"
)


print("\nSource report distribution:")

print(
    positive_df[
        "source_report"
    ].value_counts()
)


print("\nFirst 10 positive samples:")

print(
    positive_df.head(10).to_string(
        index=False
    )
)


print("\nOutput file:")

print(
    OUTPUT_FILE
)


print("\nColumns:")

for column in positive_df.columns:

    print(
        f" - {column}"
    )


print("\n")
print("=" * 60)
print("STEP 5D FINISHED")
print("=" * 60)


print(
    "\nNOTE:"
)

print(
    "These are GSI reference/locality positive samples."
)

print(
    "They are not direct measurements of Fe percentage "
    "at every Sentinel pixel."
)