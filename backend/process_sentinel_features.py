import os
import numpy as np
import pandas as pd
import rasterio
from rasterio.warp import reproject, Resampling


# =========================================================
# SENTINEL-2 FEATURE PROCESSING
# OreVision AI
# =========================================================

# ---------------------------------------------------------
# 1. PATHS
# ---------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

INPUT_DIR = os.path.join(
    BASE_DIR,
    "data",
    "processed",
    "sentinel2",
    "clipped"
)

OUTPUT_DIR = os.path.join(
    BASE_DIR,
    "data",
    "processed",
    "sentinel2",
    "features"
)

os.makedirs(OUTPUT_DIR, exist_ok=True)


# ---------------------------------------------------------
# 2. INPUT FILES
# ---------------------------------------------------------

B02_FILE = os.path.join(INPUT_DIR, "Sandur_B02.tif")
B03_FILE = os.path.join(INPUT_DIR, "Sandur_B03.tif")
B04_FILE = os.path.join(INPUT_DIR, "Sandur_B04.tif")
B08_FILE = os.path.join(INPUT_DIR, "Sandur_B08.tif")
B11_FILE = os.path.join(INPUT_DIR, "Sandur_B11.tif")
B12_FILE = os.path.join(INPUT_DIR, "Sandur_B12.tif")
SCL_FILE = os.path.join(INPUT_DIR, "Sandur_SCL.tif")


# ---------------------------------------------------------
# 3. CHECK INPUT FILES
# ---------------------------------------------------------

print()
print("=" * 65)
print("OREVISION AI - SENTINEL-2 FEATURE PROCESSING")
print("=" * 65)
print()

required_files = [
    B02_FILE,
    B03_FILE,
    B04_FILE,
    B08_FILE,
    B11_FILE,
    B12_FILE,
    SCL_FILE
]

for file_path in required_files:

    if not os.path.exists(file_path):
        raise FileNotFoundError(
            f"Required file not found:\n{file_path}"
        )

print("All Sentinel-2 input files found.")
print()


# ---------------------------------------------------------
# 4. READ B02 AS 10 m REFERENCE GRID
# ---------------------------------------------------------

print("Reading B02 reference band...")

with rasterio.open(B02_FILE) as src:

    profile = src.profile.copy()

    transform = src.transform
    crs = src.crs

    height = src.height
    width = src.width

    B02 = src.read(1).astype(np.float32)


print(f"CRS: {crs}")
print(f"Grid size: {width} x {height}")
print(f"Pixel size: {src.res}")
print()


# ---------------------------------------------------------
# 5. FUNCTION TO READ 10 m BANDS
# ---------------------------------------------------------

def read_10m(path):

    with rasterio.open(path) as src:

        data = src.read(1).astype(np.float32)

    return data


# ---------------------------------------------------------
# 6. FUNCTION TO RESAMPLE 20 m → 10 m
# ---------------------------------------------------------

def resample_to_10m(
    path,
    resampling_method=Resampling.bilinear
):

    destination = np.zeros(
        (height, width),
        dtype=np.float32
    )

    with rasterio.open(path) as src:

        reproject(
            source=rasterio.band(src, 1),
            destination=destination,

            src_transform=src.transform,
            src_crs=src.crs,

            dst_transform=transform,
            dst_crs=crs,

            resampling=resampling_method
        )

    return destination


# ---------------------------------------------------------
# 7. READ 10 m BANDS
# ---------------------------------------------------------

print("Reading 10 m bands...")

B03 = read_10m(B03_FILE)
B04 = read_10m(B04_FILE)
B08 = read_10m(B08_FILE)

print("B02 loaded.")
print("B03 loaded.")
print("B04 loaded.")
print("B08 loaded.")
print()


# ---------------------------------------------------------
# 8. RESAMPLE 20 m BANDS
# ---------------------------------------------------------

print("Resampling B11 from 20 m to 10 m...")

B11 = resample_to_10m(
    B11_FILE,
    Resampling.bilinear
)

print("Resampling B12 from 20 m to 10 m...")

B12 = resample_to_10m(
    B12_FILE,
    Resampling.bilinear
)

print("Resampling SCL from 20 m to 10 m...")

# SCL is categorical data.
# Therefore nearest-neighbour resampling is used.
SCL = resample_to_10m(
    SCL_FILE,
    Resampling.nearest
)

print("Resampling completed.")
print()


# ---------------------------------------------------------
# 9. REFLECTANCE SCALING
# ---------------------------------------------------------

print("Applying Sentinel-2 reflectance scaling...")

# Sentinel-2 L2A digital values are commonly
# represented using a quantification value of 10000.
SCALE = 10000.0

B02 = B02 / SCALE
B03 = B03 / SCALE
B04 = B04 / SCALE
B08 = B08 / SCALE
B11 = B11 / SCALE
B12 = B12 / SCALE

print("Reflectance scaling completed.")
print()


# ---------------------------------------------------------
# 10. SCL QUALITY MASK
# ---------------------------------------------------------

print("Creating SCL quality mask...")

# SCL classes retained:
#
# 4 = Vegetation
# 5 = Not Vegetated
# 6 = Water
# 7 = Unclassified
#
# Cloud / shadow / cirrus classes are excluded.

VALID_SCL = np.isin(
    SCL,
    [4, 5, 6, 7]
)

valid_pixel_count = int(
    np.count_nonzero(VALID_SCL)
)

print(
    f"Initial valid pixels: {valid_pixel_count:,}"
)

print()


# ---------------------------------------------------------
# 11. SAFE RATIO FUNCTION
# ---------------------------------------------------------

def safe_ratio(a, b):

    result = np.full(
        a.shape,
        np.nan,
        dtype=np.float32
    )

    valid = (
        np.isfinite(a)
        &
        np.isfinite(b)
        &
        (np.abs(b) > 1e-6)
    )

    result[valid] = (
        a[valid] / b[valid]
    )

    return result


# ---------------------------------------------------------
# 12. CALCULATE SPECTRAL FEATURES
# ---------------------------------------------------------

print("Calculating spectral features...")
print()


# NDVI
# Vegetation-related index
NDVI = safe_ratio(
    B08 - B04,
    B08 + B04
)


# NDMI
# Moisture-related index
NDMI = safe_ratio(
    B08 - B11,
    B08 + B11
)


# Red / Blue ratio
B04_B02 = safe_ratio(
    B04,
    B02
)


# Red / SWIR ratio
B04_B11 = safe_ratio(
    B04,
    B11
)


# SWIR ratio
B11_B12 = safe_ratio(
    B11,
    B12
)


# ---------------------------------------------------------
# 13. STORE FEATURES
# ---------------------------------------------------------

features = {

    "NDVI": NDVI,

    "NDMI": NDMI,

    "B04_B02": B04_B02,

    "B04_B11": B04_B11,

    "B11_B12": B11_B12
}


# ---------------------------------------------------------
# 14. APPLY QUALITY MASK
# ---------------------------------------------------------

print("Applying quality mask...")

for name, array in features.items():

    # Remove invalid SCL pixels
    array[~VALID_SCL] = np.nan

    # Remove infinite values
    array[
        ~np.isfinite(array)
    ] = np.nan


print("Quality mask applied.")
print()


# ---------------------------------------------------------
# 15. GEO-TIFF OUTPUT PROFILE
# ---------------------------------------------------------

# IMPORTANT:
# Original files were derived from Sentinel-2 JP2 data.
# We explicitly set driver=GTiff because the calculated
# features are FLOAT32 and must be saved as GeoTIFF.

feature_profile = profile.copy()

feature_profile.update(
    driver="GTiff",
    dtype="float32",
    count=1,
    compress="deflate",
    nodata=np.nan
)


# ---------------------------------------------------------
# 16. SAVE FEATURE RASTERS
# ---------------------------------------------------------

print("Saving feature GeoTIFF files...")
print()

for name, array in features.items():

    output_file = os.path.join(
        OUTPUT_DIR,
        f"Sandur_{name}.tif"
    )

    with rasterio.open(
        output_file,
        "w",
        **feature_profile
    ) as dst:

        dst.write(
            array.astype(np.float32),
            1
        )

    print(
        f"Created: Sandur_{name}.tif"
    )


print()


# ---------------------------------------------------------
# 17. SAVE VALID PIXEL MASK
# ---------------------------------------------------------

print("Saving valid-pixel mask...")

mask_file = os.path.join(
    OUTPUT_DIR,
    "Sandur_valid_mask.tif"
)

mask_profile = profile.copy()

mask_profile.update(
    driver="GTiff",
    dtype="uint8",
    count=1,
    compress="deflate",
    nodata=0
)

with rasterio.open(
    mask_file,
    "w",
    **mask_profile
) as dst:

    dst.write(
        VALID_SCL.astype(np.uint8),
        1
    )


print("Created: Sandur_valid_mask.tif")
print()


# ---------------------------------------------------------
# 18. CREATE ML FEATURE TABLE
# ---------------------------------------------------------

print("Creating ML feature CSV...")
print()

valid = VALID_SCL.copy()

for array in features.values():

    valid &= np.isfinite(array)


# ---------------------------------------------------------
# 19. GET VALID PIXEL LOCATIONS
# ---------------------------------------------------------

valid_rows, valid_cols = np.where(valid)


print(
    f"Valid feature pixels: {len(valid_rows):,}"
)


# ---------------------------------------------------------
# 20. CONVERT PIXEL LOCATIONS TO UTM
# ---------------------------------------------------------

xs, ys = rasterio.transform.xy(
    transform,
    valid_rows,
    valid_cols
)

xs = np.asarray(xs)
ys = np.asarray(ys)


# ---------------------------------------------------------
# 21. BUILD DATAFRAME
# ---------------------------------------------------------

data = pd.DataFrame({

    "x_utm": xs,

    "y_utm": ys,

    "NDVI":
        NDVI[valid],

    "NDMI":
        NDMI[valid],

    "B04_B02":
        B04_B02[valid],

    "B04_B11":
        B04_B11[valid],

    "B11_B12":
        B11_B12[valid]

})


# ---------------------------------------------------------
# 22. SAVE CSV
# ---------------------------------------------------------

csv_file = os.path.join(
    OUTPUT_DIR,
    "Sandur_Sentinel2_features.csv"
)

data.to_csv(
    csv_file,
    index=False
)


print(
    f"Created: Sandur_Sentinel2_features.csv"
)

print()


# ---------------------------------------------------------
# 23. FEATURE SUMMARY
# ---------------------------------------------------------

print("=" * 65)
print("FEATURE SUMMARY")
print("=" * 65)

print()

print(
    f"Number of valid pixels: {len(data):,}"
)

print()

print("Features generated:")

print("1. NDVI")
print("2. NDMI")
print("3. B04/B02")
print("4. B04/B11")
print("5. B11/B12")

print()


# ---------------------------------------------------------
# 24. BASIC STATISTICS
# ---------------------------------------------------------

print("=" * 65)
print("BASIC FEATURE STATISTICS")
print("=" * 65)

print()

print(
    data[
        [
            "NDVI",
            "NDMI",
            "B04_B02",
            "B04_B11",
            "B11_B12"
        ]
    ].describe()
)

print()


# ---------------------------------------------------------
# 25. FINAL OUTPUT
# ---------------------------------------------------------

print("=" * 65)
print("SENTINEL-2 FEATURE PROCESSING COMPLETE")
print("=" * 65)

print()

print("Output directory:")
print(OUTPUT_DIR)

print()

print("Generated files:")

for name in features.keys():

    print(
        f"  - Sandur_{name}.tif"
    )

print("  - Sandur_valid_mask.tif")
print("  - Sandur_Sentinel2_features.csv")

print()

print("=" * 65)