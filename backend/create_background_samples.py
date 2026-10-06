import os
import random
import numpy as np
import pandas as pd
import rasterio
from pyproj import Transformer


# ============================================================
# STEP 5B - BACKGROUND SAMPLE GENERATION
# ============================================================

print("=" * 60)
print("STEP 5B - BACKGROUND SAMPLE GENERATION")
print("=" * 60)

# ------------------------------------------------------------
# Paths
# ------------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

FEATURE_DIR = os.path.join(
    BASE_DIR,
    "data",
    "processed",
    "sentinel2",
    "expanded",
    "features"
)

GSI_FILE = os.path.join(
    BASE_DIR,
    "data",
    "processed",
    "gsi_sentinel",
    "GSI_Spatial_Anchors_Step4.csv"
)

OUTPUT_DIR = os.path.join(
    BASE_DIR,
    "data",
    "processed",
    "gsi_sentinel"
)

OUTPUT_FILE = os.path.join(
    OUTPUT_DIR,
    "Background_Samples.csv"
)

os.makedirs(OUTPUT_DIR, exist_ok=True)


# ------------------------------------------------------------
# Feature files
# ------------------------------------------------------------

FEATURE_FILES = {
    "NDVI": "Expanded_NDVI.tif",
    "NDMI": "Expanded_NDMI.tif",
    "B04_B02": "Expanded_B04_B02.tif",
    "B04_B11": "Expanded_B04_B11.tif",
    "B11_B12": "Expanded_B11_B12.tif",
    "valid_pixel": "Expanded_valid_mask.tif"
}


# ------------------------------------------------------------
# Parameters
# ------------------------------------------------------------

NUM_SAMPLES = 300

MIN_GSI_DISTANCE_M = 2000.0
MIN_BACKGROUND_DISTANCE_M = 1000.0

RANDOM_SEED = 42

random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)


# ------------------------------------------------------------
# Check input files
# ------------------------------------------------------------

print("\nChecking input files...")

for name, filename in FEATURE_FILES.items():

    path = os.path.join(FEATURE_DIR, filename)

    if not os.path.exists(path):
        raise FileNotFoundError(
            f"[ERROR] Missing feature file: {path}"
        )

    print(f"[OK] {name}: {filename}")


if not os.path.exists(GSI_FILE):
    raise FileNotFoundError(
        f"[ERROR] Missing GSI anchor file: {GSI_FILE}"
    )


# ------------------------------------------------------------
# Load GSI anchors
# ------------------------------------------------------------

print("\nLoading GSI anchor data...")

gsi_df = pd.read_csv(GSI_FILE)

print(f"Total GSI records: {len(gsi_df)}")

gsi_df = gsi_df.dropna(
    subset=["latitude", "longitude"]
).copy()

print(f"Valid GSI anchors: {len(gsi_df)}")


# ------------------------------------------------------------
# Open rasters
# ------------------------------------------------------------

print("\nOpening Sentinel-2 feature rasters...")

rasters = {}

for name, filename in FEATURE_FILES.items():

    path = os.path.join(FEATURE_DIR, filename)

    src = rasterio.open(path)

    rasters[name] = src

    print(
        f"[OK] {name} | CRS: {src.crs}"
    )


reference = rasters["NDVI"]

reference_crs = reference.crs

print("\nReference CRS:")
print(reference_crs)

if str(reference_crs) != "EPSG:32643":
    raise ValueError(
        f"Expected EPSG:32643 but found {reference_crs}"
    )


# ------------------------------------------------------------
# Raster bounds
# ------------------------------------------------------------

bounds = reference.bounds

print("\nRaster bounds:")
print(f"Left  : {bounds.left}")
print(f"Right : {bounds.right}")
print(f"Bottom: {bounds.bottom}")
print(f"Top   : {bounds.top}")


# ------------------------------------------------------------
# Convert GSI coordinates to UTM
# ------------------------------------------------------------

transformer = Transformer.from_crs(
    "EPSG:4326",
    "EPSG:32643",
    always_xy=True
)

gsi_utm = []

for _, row in gsi_df.iterrows():

    x, y = transformer.transform(
        row["longitude"],
        row["latitude"]
    )

    gsi_utm.append(
        (float(x), float(y))
    )


# ------------------------------------------------------------
# Read raster arrays
# ------------------------------------------------------------

print("\nReading Sentinel-2 feature arrays...")

arrays = {}

for name, src in rasters.items():

    arrays[name] = src.read(1)

    print(
        f"[OK] {name} | shape={arrays[name].shape}"
    )


height = reference.height
width = reference.width
transform = reference.transform


# ------------------------------------------------------------
# Candidate generation
# ------------------------------------------------------------

print("\nGenerating background samples...")

background_points = []

attempts = 0

MAX_ATTEMPTS = 500000


def distance_m(x1, y1, x2, y2):
    """
    Euclidean distance in UTM metres.
    """
    return float(
        np.sqrt(
            (x1 - x2) ** 2 +
            (y1 - y2) ** 2
        )
    )


while len(background_points) < NUM_SAMPLES:

    attempts += 1

    if attempts > MAX_ATTEMPTS:
        raise RuntimeError(
            "Could not generate enough valid background samples. "
            "Try reducing NUM_SAMPLES or distance constraints."
        )

    # --------------------------------------------------------
    # Random raster pixel
    # --------------------------------------------------------

    row = random.randint(0, height - 1)
    col = random.randint(0, width - 1)

    # Pixel center -> UTM
    x, y = rasterio.transform.xy(
        transform,
        row,
        col,
        offset="center"
    )

    x = float(x)
    y = float(y)

    # --------------------------------------------------------
    # Check valid Sentinel pixel
    # --------------------------------------------------------

    valid_value = arrays["valid_pixel"][row, col]

    if not np.isfinite(valid_value):
        continue

    if valid_value != 1:
        continue

    # --------------------------------------------------------
    # Check feature values
    # --------------------------------------------------------

    feature_values = {}

    invalid = False

    for name in [
        "NDVI",
        "NDMI",
        "B04_B02",
        "B04_B11",
        "B11_B12"
    ]:

        value = arrays[name][row, col]

        if not np.isfinite(value):
            invalid = True
            break

        feature_values[name] = float(value)

    if invalid:
        continue

    # --------------------------------------------------------
    # Check distance from GSI anchors
    # --------------------------------------------------------

    too_close_to_gsi = False

    for gx, gy in gsi_utm:

        d = distance_m(
            x,
            y,
            gx,
            gy
        )

        if d < MIN_GSI_DISTANCE_M:

            too_close_to_gsi = True
            break

    if too_close_to_gsi:
        continue

    # --------------------------------------------------------
    # Check distance from existing background points
    # --------------------------------------------------------

    too_close_to_background = False

    for existing in background_points:

        d = distance_m(
            x,
            y,
            existing["x_utm"],
            existing["y_utm"]
        )

        if d < MIN_BACKGROUND_DISTANCE_M:

            too_close_to_background = True
            break

    if too_close_to_background:
        continue

    # --------------------------------------------------------
    # UTM -> latitude / longitude
    # --------------------------------------------------------

    lon, lat = Transformer.from_crs(
        "EPSG:32643",
        "EPSG:4326",
        always_xy=True
    ).transform(
        x,
        y
    )

    # --------------------------------------------------------
    # Save candidate
    # --------------------------------------------------------

    background_points.append({

        "sample_id":
            f"BG_{len(background_points) + 1:04d}",

        "latitude":
            float(lat),

        "longitude":
            float(lon),

        "x_utm":
            x,

        "y_utm":
            y,

        "NDVI":
            feature_values["NDVI"],

        "NDMI":
            feature_values["NDMI"],

        "B04_B02":
            feature_values["B04_B02"],

        "B04_B11":
            feature_values["B04_B11"],

        "B11_B12":
            feature_values["B11_B12"],

        "valid_pixel":
            1,

        "label":
            0
    })

    if len(background_points) % 25 == 0:

        print(
            f"Generated {len(background_points)} "
            f"/ {NUM_SAMPLES} samples..."
        )


# ------------------------------------------------------------
# Convert to DataFrame
# ------------------------------------------------------------

background_df = pd.DataFrame(
    background_points
)


# ============================================================
# FINAL QUALITY CONTROL BEFORE SAVING
# ============================================================

print("\n")
print("=" * 60)
print("FINAL DISTANCE QUALITY CONTROL")
print("=" * 60)


# ------------------------------------------------------------
# Check nearest GSI distance
# ------------------------------------------------------------

nearest_gsi_distances = []

for _, bg in background_df.iterrows():

    distances = [

        distance_m(
            bg["x_utm"],
            bg["y_utm"],
            gx,
            gy
        )

        for gx, gy in gsi_utm
    ]

    nearest_gsi_distances.append(
        min(distances)
    )


background_df["nearest_gsi_distance_m"] = (
    nearest_gsi_distances
)


minimum_gsi_distance = (
    background_df["nearest_gsi_distance_m"].min()
)


print(
    f"Minimum distance from GSI: "
    f"{minimum_gsi_distance:.2f} m"
)


# ------------------------------------------------------------
# Check background-to-background distance
# ------------------------------------------------------------

minimum_background_distance = float("inf")

for i in range(len(background_df)):

    x1 = background_df.iloc[i]["x_utm"]
    y1 = background_df.iloc[i]["y_utm"]

    for j in range(i + 1, len(background_df)):

        x2 = background_df.iloc[j]["x_utm"]
        y2 = background_df.iloc[j]["y_utm"]

        d = distance_m(
            x1,
            y1,
            x2,
            y2
        )

        if d < minimum_background_distance:

            minimum_background_distance = d


print(
    f"Minimum background-to-background distance: "
    f"{minimum_background_distance:.2f} m"
)


# ------------------------------------------------------------
# Check constraints
# ------------------------------------------------------------

gsi_violations = (
    background_df[
        background_df["nearest_gsi_distance_m"]
        < MIN_GSI_DISTANCE_M
    ]
)


if len(gsi_violations) > 0:

    raise RuntimeError(
        f"QUALITY CONTROL FAILED: "
        f"{len(gsi_violations)} background points "
        f"are closer than 2 km to GSI anchors."
    )


if minimum_background_distance < MIN_BACKGROUND_DISTANCE_M:

    raise RuntimeError(
        "QUALITY CONTROL FAILED: "
        "background points are closer than 1 km "
        "to each other."
    )


print("[OK] All GSI distance constraints satisfied.")
print("[OK] All background distance constraints satisfied.")


# ------------------------------------------------------------
# Remove QC helper column
# ------------------------------------------------------------

background_df = background_df.drop(
    columns=["nearest_gsi_distance_m"]
)


# ------------------------------------------------------------
# Save
# ------------------------------------------------------------

background_df.to_csv(
    OUTPUT_FILE,
    index=False
)


# ------------------------------------------------------------
# Close rasters
# ------------------------------------------------------------

for src in rasters.values():
    src.close()


# ============================================================
# FINAL REPORT
# ============================================================

print("\n")
print("=" * 60)
print("BACKGROUND SAMPLING COMPLETE")
print("=" * 60)

print(
    f"Requested samples : {NUM_SAMPLES}"
)

print(
    f"Generated samples : {len(background_df)}"
)

print(
    f"Total attempts    : {attempts}"
)

print(
    "Minimum distance from GSI : 2.0 km"
)

print(
    "Minimum distance between background points : 1.0 km"
)

print("\nOutput file:")
print(OUTPUT_FILE)

print("\nColumns:")

for column in background_df.columns:

    print(f" - {column}")


print("\nFirst 5 background samples:")

print(
    background_df.head().to_string(
        index=False
    )
)


print("\nLabel distribution:")

print(
    background_df["label"].value_counts()
)


print("\nMissing values:")

print(
    background_df.isnull().sum()
)


print("\n")
print("=" * 60)
print("STEP 5B FINISHED")
print("=" * 60)