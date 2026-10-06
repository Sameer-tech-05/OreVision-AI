import os
import numpy as np
import pandas as pd
import rasterio
import matplotlib.pyplot as plt


# ============================================================
# STEP 5C - BACKGROUND SAMPLE QUALITY CHECK
# ============================================================

print("=" * 60)
print("STEP 5C - BACKGROUND SAMPLE QUALITY CHECK")
print("=" * 60)


BASE_DIR = os.path.dirname(os.path.abspath(__file__))


GSI_FILE = os.path.join(
    BASE_DIR,
    "data",
    "processed",
    "gsi_sentinel",
    "GSI_Spatial_Anchors_Step4.csv"
)


BACKGROUND_FILE = os.path.join(
    BASE_DIR,
    "data",
    "processed",
    "gsi_sentinel",
    "Background_Samples.csv"
)


NDVI_FILE = os.path.join(
    BASE_DIR,
    "data",
    "processed",
    "sentinel2",
    "expanded",
    "features",
    "Expanded_NDVI.tif"
)


OUTPUT_DIR = os.path.join(
    BASE_DIR,
    "data",
    "processed",
    "gsi_sentinel"
)


MAP_FILE = os.path.join(
    OUTPUT_DIR,
    "Background_Sample_Quality_Map.png"
)


REPORT_FILE = os.path.join(
    OUTPUT_DIR,
    "Background_Sample_Quality_Report.csv"
)


# ------------------------------------------------------------
# Parameters
# ------------------------------------------------------------

MIN_GSI_DISTANCE_M = 2000.0
MIN_BACKGROUND_DISTANCE_M = 1000.0


# ------------------------------------------------------------
# Check files
# ------------------------------------------------------------

print("\nChecking input files...")

if not os.path.exists(GSI_FILE):
    raise FileNotFoundError(GSI_FILE)

print("[OK] GSI anchor file")


if not os.path.exists(BACKGROUND_FILE):
    raise FileNotFoundError(BACKGROUND_FILE)

print("[OK] Background sample file")


if not os.path.exists(NDVI_FILE):
    raise FileNotFoundError(NDVI_FILE)

print("[OK] Sentinel-2 raster")


# ------------------------------------------------------------
# Load data
# ------------------------------------------------------------

print("\nLoading data...")

gsi_df = pd.read_csv(GSI_FILE)

background_df = pd.read_csv(BACKGROUND_FILE)


print(f"Total GSI records: {len(gsi_df)}")


gsi_df = gsi_df.dropna(
    subset=["latitude", "longitude"]
).copy()


print(f"Valid GSI anchors: {len(gsi_df)}")


print(
    f"Background samples: {len(background_df)}"
)


# ------------------------------------------------------------
# Labels
# ------------------------------------------------------------

print("\nChecking background labels...")

print(
    background_df["label"].value_counts()
)


# ------------------------------------------------------------
# Missing values
# ------------------------------------------------------------

print("\nChecking missing values...")

missing = background_df.isnull().sum()

print(missing)


if missing.sum() == 0:

    print(
        "\n[OK] No missing values in background samples."
    )

else:

    print(
        "\n[WARNING] Missing values detected."
    )


# ------------------------------------------------------------
# Open reference raster
# ------------------------------------------------------------

print("\nOpening reference raster...")

with rasterio.open(NDVI_FILE) as src:

    raster_crs = src.crs
    bounds = src.bounds

    print(
        f"[OK] CRS: {raster_crs}"
    )

    print("\nRaster bounds:")

    print(
        f"Left  : {bounds.left}"
    )

    print(
        f"Right : {bounds.right}"
    )

    print(
        f"Bottom: {bounds.bottom}"
    )

    print(
        f"Top   : {bounds.top}"
    )


if str(raster_crs) != "EPSG:32643":

    raise ValueError(
        f"Expected EPSG:32643 but found {raster_crs}"
    )


# ============================================================
# STEP 1 - CHECK BACKGROUND POINTS USING UTM
# ============================================================

print("\nChecking background points against Sentinel raster...")

inside = (

    (background_df["x_utm"] >= bounds.left) &

    (background_df["x_utm"] <= bounds.right) &

    (background_df["y_utm"] >= bounds.bottom) &

    (background_df["y_utm"] <= bounds.top)

)


inside_count = int(inside.sum())

outside_count = int((~inside).sum())


print(
    f"Inside Sentinel raster : {inside_count}"
)

print(
    f"Outside Sentinel raster: {outside_count}"
)


# ============================================================
# STEP 2 - CONVERT GSI LAT/LON TO UTM
# ============================================================

print("\nConverting GSI coordinates to UTM EPSG:32643...")


from pyproj import Transformer


transformer = Transformer.from_crs(
    "EPSG:4326",
    "EPSG:32643",
    always_xy=True
)


gsi_x = []
gsi_y = []


for _, row in gsi_df.iterrows():

    x, y = transformer.transform(
        row["longitude"],
        row["latitude"]
    )

    gsi_x.append(float(x))
    gsi_y.append(float(y))


gsi_xy = np.column_stack(
    [gsi_x, gsi_y]
)


# ============================================================
# STEP 3 - DISTANCE FROM GSI
# ============================================================

print("\nChecking distance from GSI anchors...")


background_xy = background_df[
    ["x_utm", "y_utm"]
].values.astype(float)


nearest_gsi_distances = []


for point in background_xy:

    distances = np.sqrt(
        np.sum(
            (gsi_xy - point) ** 2,
            axis=1
        )
    )

    nearest_gsi_distances.append(
        np.min(distances)
    )


nearest_gsi_distances = np.array(
    nearest_gsi_distances
)


background_df[
    "nearest_gsi_distance_km"
] = (
    nearest_gsi_distances / 1000.0
)


print("\nDistance statistics:")

print(
    background_df[
        "nearest_gsi_distance_km"
    ].describe()
)


gsi_violations = int(
    (
        nearest_gsi_distances
        < MIN_GSI_DISTANCE_M
    ).sum()
)


print(
    f"\nBackground samples closer than 2 km "
    f"to a GSI anchor: {gsi_violations}"
)


# ============================================================
# STEP 4 - BACKGROUND TO BACKGROUND DISTANCE
# ============================================================

print(
    "\nChecking minimum distance between "
    "background samples..."
)


minimum_background_distance = float("inf")


for i in range(
    len(background_xy)
):

    distances = np.sqrt(
        np.sum(
            (
                background_xy[i + 1:]
                - background_xy[i]
            ) ** 2,
            axis=1
        )
    )

    if len(distances) == 0:
        continue

    current_min = np.min(
        distances
    )

    if current_min < minimum_background_distance:

        minimum_background_distance = (
            current_min
        )


minimum_background_distance_km = (
    minimum_background_distance / 1000.0
)


print(
    "Minimum background-to-background "
    f"distance: "
    f"{minimum_background_distance_km:.3f} km"
)


# ============================================================
# STEP 5 - QUALITY CONTROL RESULT
# ============================================================

print("\n")
print("=" * 60)
print("QUALITY CONTROL RESULT")
print("=" * 60)


if gsi_violations == 0:

    print(
        "[PASS] All background samples are "
        "at least 2 km from GSI anchors."
    )

else:

    print(
        "[FAIL] Some background samples are "
        "less than 2 km from GSI anchors."
    )


if minimum_background_distance >= MIN_BACKGROUND_DISTANCE_M:

    print(
        "[PASS] All background samples are "
        "at least 1 km apart."
    )

else:

    print(
        "[FAIL] Some background samples are "
        "less than 1 km apart."
    )


if outside_count == 0:

    print(
        "[PASS] All background samples are "
        "inside the Sentinel raster."
    )

else:

    print(
        "[FAIL] Some background samples are "
        "outside the Sentinel raster."
    )


overall_pass = (

    gsi_violations == 0

    and

    minimum_background_distance
    >= MIN_BACKGROUND_DISTANCE_M

    and

    outside_count == 0
)


print("\n")


if overall_pass:

    print(
        "OVERALL RESULT: PASS"
    )

else:

    print(
        "OVERALL RESULT: FAIL"
    )


# ============================================================
# SAVE QUALITY REPORT
# ============================================================

report_df = background_df[
    [
        "sample_id",
        "latitude",
        "longitude",
        "x_utm",
        "y_utm",
        "nearest_gsi_distance_km",
        "label"
    ]
].copy()


report_df.to_csv(
    REPORT_FILE,
    index=False
)


# ============================================================
# CREATE MAP
# ============================================================

print("\nCreating quality-control map...")


plt.figure(
    figsize=(12, 9)
)


# GSI points

plt.scatter(
    gsi_x,
    gsi_y,
    marker="^",
    s=70,
    label="GSI anchors"
)


# Background points

plt.scatter(
    background_df["x_utm"],
    background_df["y_utm"],
    s=18,
    alpha=0.7,
    label="Background samples"
)


plt.xlabel(
    "UTM Easting (m) - EPSG:32643"
)

plt.ylabel(
    "UTM Northing (m) - EPSG:32643"
)


plt.title(
    "Background Sample Quality Control"
)


plt.legend()


plt.grid(
    True,
    alpha=0.3
)


plt.tight_layout()


plt.savefig(
    MAP_FILE,
    dpi=200
)


plt.close()


# ============================================================
# FINAL
# ============================================================

print("\n")
print("=" * 60)
print("STEP 5C COMPLETE")
print("=" * 60)


print("\nMap:")

print(
    MAP_FILE
)


print("\nQuality report:")

print(
    REPORT_FILE
)


print("\nSummary:")

print(
    f"GSI anchors: {len(gsi_df)}"
)

print(
    f"Background samples: {len(background_df)}"
)

print(
    f"Inside Sentinel raster: {inside_count}"
)

print(
    f"Outside Sentinel raster: {outside_count}"
)

print(
    f"Closer than 2 km to GSI: {gsi_violations}"
)

print(
    "Minimum background distance: "
    f"{minimum_background_distance_km:.3f} km"
)


if overall_pass:

    print("\n[PASS] STEP 5C QUALITY CONTROL PASSED.")

else:

    print("\n[FAIL] STEP 5C QUALITY CONTROL FAILED.")


print("\n")
print("=" * 60)