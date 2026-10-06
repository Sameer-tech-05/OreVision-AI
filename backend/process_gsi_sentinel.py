import pandas as pd
import rasterio
from pyproj import Transformer
from pathlib import Path


# --------------------------------------------------
# PROJECT PATHS
# --------------------------------------------------

PROJECT = Path(
    r"C:\Users\Admin\Downloads\OreVision-AI-Complete-Project\OreVision-AI"
)

ANCHOR_FILE = PROJECT / "backend" / "data" / "processed" / "gsi_sentinel" / "GSI_Spatial_Anchors_Step4.csv"

FEATURE_DIR = (
    PROJECT
    / "backend"
    / "data"
    / "processed"
    / "sentinel2"
    / "expanded"
    / "features"
)

OUTPUT_DIR = (
    PROJECT
    / "backend"
    / "data"
    / "processed"
    / "gsi_sentinel"
)

OUTPUT_FILE = OUTPUT_DIR / "GSI_Sentinel_Linked_Anchors.csv"


# --------------------------------------------------
# SENTINEL-2 FEATURE FILES
# --------------------------------------------------

FEATURES = {
    "NDVI": FEATURE_DIR / "Expanded_NDVI.tif",
    "NDMI": FEATURE_DIR / "Expanded_NDMI.tif",
    "B04_B02": FEATURE_DIR / "Expanded_B04_B02.tif",
    "B04_B11": FEATURE_DIR / "Expanded_B04_B11.tif",
    "B11_B12": FEATURE_DIR / "Expanded_B11_B12.tif",
    "valid_pixel": FEATURE_DIR / "Expanded_valid_mask.tif",
}


# --------------------------------------------------
# CHECK INPUT FILE
# --------------------------------------------------

if not ANCHOR_FILE.exists():
    raise FileNotFoundError(
        f"GSI anchor file not found:\n{ANCHOR_FILE}"
    )

print("GSI anchor file found:")
print(ANCHOR_FILE)


# --------------------------------------------------
# LOAD GSI LOCATIONS
# --------------------------------------------------

df = pd.read_csv(ANCHOR_FILE)

print()
print("Number of GSI locations:", len(df))


# --------------------------------------------------
# CONVERT WGS84 → UTM 43N
# --------------------------------------------------

transformer = Transformer.from_crs(
    "EPSG:4326",
    "EPSG:32643",
    always_xy=True
)

x_utm, y_utm = transformer.transform(
    df["longitude"].values,
    df["latitude"].values
)

df["x_utm"] = x_utm
df["y_utm"] = y_utm


# --------------------------------------------------
# EXTRACT SENTINEL-2 PIXEL VALUES
# --------------------------------------------------

coordinates = list(
    zip(
        df["x_utm"],
        df["y_utm"]
    )
)

for feature_name, raster_path in FEATURES.items():

    print()
    print("Processing:", feature_name)

    if not raster_path.exists():
        raise FileNotFoundError(
            f"Raster not found:\n{raster_path}"
        )

    with rasterio.open(raster_path) as src:

        print("CRS:", src.crs)

        values = []

        for value in src.sample(coordinates):
            values.append(value[0])

        df[feature_name] = values


# --------------------------------------------------
# SAVE RESULT
# --------------------------------------------------

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)

df.to_csv(
    OUTPUT_FILE,
    index=False
)


# --------------------------------------------------
# DISPLAY RESULT
# --------------------------------------------------

print()
print("=" * 60)
print("STEP 4 COMPLETED")
print("=" * 60)

print()
print("Output file:")
print(OUTPUT_FILE)

print()
print("Number of rows:", len(df))

print()
print("Columns:")
print(list(df.columns))

print()
print("Preview:")
print(
    df[
        [
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
    ].to_string(index=False)
)

print()
print("Done.")