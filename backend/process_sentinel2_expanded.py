from pathlib import Path
import glob
import rasterio
from rasterio.windows import from_bounds
from rasterio.enums import Resampling

# ============================================================
# EXPANDED STUDY AREA
# ============================================================
WEST = 76.35
SOUTH = 15.05
EAST = 76.94
NORTH = 15.30

# ============================================================
# PATHS
# ============================================================
BASE = Path(__file__).resolve().parent

RAW = BASE / "data" / "raw" / "sentinel2"
OUT = BASE / "data" / "processed" / "sentinel2" / "expanded" / "clipped"

OUT.mkdir(parents=True, exist_ok=True)

# ============================================================
# SENTINEL-2 BANDS
# ============================================================
bands = {
    "B02": "*_B02_10m.jp2",
    "B03": "*_B03_10m.jp2",
    "B04": "*_B04_10m.jp2",
    "B08": "*_B08_10m.jp2",
    "B11": "*_B11_20m.jp2",
    "B12": "*_B12_20m.jp2",
    "SCL": "*_SCL_20m.jp2",
}

# ============================================================
# FIND AND CLIP
# ============================================================
for band, pattern in bands.items():

    matches = glob.glob(str(RAW / "**" / pattern), recursive=True)

    if not matches:
        print(f"[ERROR] Could not find {band}")
        continue

    src_path = matches[0]

    print(f"\nProcessing {band}")
    print(f"Source: {src_path}")

    with rasterio.open(src_path) as src:

        # Convert geographic AOI to source CRS
        from rasterio.warp import transform_bounds

        left, bottom, right, top = transform_bounds(
            "EPSG:4326",
            src.crs,
            WEST,
            SOUTH,
            EAST,
            NORTH
        )

        window = from_bounds(
            left,
            bottom,
            right,
            top,
            transform=src.transform
        )

        window = window.round_offsets().round_lengths()

        data = src.read(1, window=window)

        transform = src.window_transform(window)

        profile = src.profile.copy()

        profile.update({
            "driver": "GTiff",
            "height": data.shape[0],
            "width": data.shape[1],
            "transform": transform,
            "compress": "deflate"
        })

        output = OUT / f"Expanded_{band}.tif"

        with rasterio.open(output, "w", **profile) as dst:
            dst.write(data, 1)

        print(f"Saved: {output}")
        print(f"Size: {data.shape[1]} x {data.shape[0]}")
        print(f"CRS: {src.crs}")

print("\n========================================")
print("EXPANDED SENTINEL-2 PROCESSING COMPLETE")
print("========================================")
print(f"Output folder: {OUT}")