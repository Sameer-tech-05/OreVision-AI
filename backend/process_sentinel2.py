import glob
import os
import rasterio
from rasterio.mask import mask
from shapely.geometry import box
from pyproj import Transformer

# -------------------------------------------------
# OreVision AI - Sentinel-2 Sandur AOI Processing
# -------------------------------------------------

BASE = r"C:\Users\Admin\Downloads\OreVision-AI-Complete-Project\OreVision-AI\backend"

SAFE = glob.glob(
    os.path.join(
        BASE,
        "data",
        "raw",
        "sentinel2",
        "*.SAFE"
    )
)[0]

OUT = os.path.join(
    BASE,
    "data",
    "processed",
    "sentinel2",
    "clipped"
)

os.makedirs(OUT, exist_ok=True)

# Sandur study area in WGS84
min_lon = 76.55
min_lat = 14.95
max_lon = 76.90
max_lat = 15.30

# Sentinel-2 tile CRS
transformer = Transformer.from_crs(
    "EPSG:4326",
    "EPSG:32643",
    always_xy=True
)

x1, y1 = transformer.transform(min_lon, min_lat)
x2, y2 = transformer.transform(max_lon, max_lat)

aoi = box(x1, y1, x2, y2)

print("Sentinel-2 product:")
print(os.path.basename(SAFE))

print("\nAOI:")
print(f"West  : {min_lon}")
print(f"South : {min_lat}")
print(f"East  : {max_lon}")
print(f"North : {max_lat}")

print("\nUTM coordinates:")
print(f"West/East  : {x1:.2f} - {x2:.2f}")
print(f"South/North: {y1:.2f} - {y2:.2f}")

# -------------------------------------------------
# Find required Sentinel-2 bands
# -------------------------------------------------

patterns = {
    "B02": os.path.join(
        SAFE, "GRANULE", "*", "IMG_DATA", "R10m", "*_B02_10m.jp2"
    ),
    "B03": os.path.join(
        SAFE, "GRANULE", "*", "IMG_DATA", "R10m", "*_B03_10m.jp2"
    ),
    "B04": os.path.join(
        SAFE, "GRANULE", "*", "IMG_DATA", "R10m", "*_B04_10m.jp2"
    ),
    "B08": os.path.join(
        SAFE, "GRANULE", "*", "IMG_DATA", "R10m", "*_B08_10m.jp2"
    ),
    "B11": os.path.join(
        SAFE, "GRANULE", "*", "IMG_DATA", "R20m", "*_B11_20m.jp2"
    ),
    "B12": os.path.join(
        SAFE, "GRANULE", "*", "IMG_DATA", "R20m", "*_B12_20m.jp2"
    ),
    "SCL": os.path.join(
        SAFE, "GRANULE", "*", "IMG_DATA", "R20m", "*_SCL_20m.jp2"
    ),
}

# -------------------------------------------------
# Clip each band
# -------------------------------------------------

for band, pattern in patterns.items():

    files = glob.glob(pattern)

    if not files:
        print(f"ERROR: {band} not found")
        continue

    src_file = files[0]

    print(f"\nProcessing {band}...")
    print(os.path.basename(src_file))

    with rasterio.open(src_file) as src:

        geometry = [aoi]

        clipped, clipped_transform = mask(
            src,
            geometry,
            crop=True
        )

        profile = src.profile.copy()

        profile.update(
            {
                "height": clipped.shape[1],
                "width": clipped.shape[2],
                "transform": clipped_transform,
                "compress": "deflate"
            }
        )

        output_file = os.path.join(
            OUT,
            f"Sandur_{band}.tif"
        )

        with rasterio.open(
            output_file,
            "w",
            **profile
        ) as dst:

            dst.write(clipped)

        print(f"Saved: {output_file}")

print("\n================================")
print("Sentinel-2 clipping completed.")
print("Output folder:")
print(OUT)
print("================================")