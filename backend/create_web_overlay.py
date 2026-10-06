import os

import numpy as np
import rasterio
from PIL import Image


INPUT = r"data\processed\prospectivity\Iron_Ore_Prospectivity_Class.tif"

OUTPUT = r"data\processed\prospectivity\Iron_Ore_Prospectivity_WebOverlay.png"

print("=" * 70)
print("STEP 8B - CREATE GEOSPATIAL WEB OVERLAY")
print("=" * 70)

if not os.path.exists(INPUT):
    raise FileNotFoundError(
        f"Classification map not found:\n{INPUT}"
    )

print("\nLoading classification GeoTIFF...")

with rasterio.open(INPUT) as src:

    data = src.read(1)

    bounds = src.bounds
    crs = src.crs
    width = src.width
    height = src.height
    transform = src.transform

print("[OK] Classification map loaded")

print("\nRaster information:")
print(f"Width       : {width}")
print(f"Height      : {height}")
print(f"CRS         : {crs}")
print(f"Resolution  : {transform.a} m")
print(f"West        : {bounds.left}")
print(f"South       : {bounds.bottom}")
print(f"East        : {bounds.right}")
print(f"North       : {bounds.top}")


# ---------------------------------------------------------------
# Create transparent RGBA image
#
# Class:
# 0 = NoData
# 1 = LOW
# 2 = MEDIUM
# 3 = HIGH
# ---------------------------------------------------------------

print("\nCreating transparent classification overlay...")

rgba = np.zeros(
    (height, width, 4),
    dtype=np.uint8
)

# LOW = green
low = data == 1
rgba[low] = [0, 180, 0, 150]

# MEDIUM = yellow
medium = data == 2
rgba[medium] = [255, 220, 0, 170]

# HIGH = red
high = data == 3
rgba[high] = [220, 0, 0, 190]

# NoData remains transparent
nodata = data == 0
rgba[nodata] = [0, 0, 0, 0]


# ---------------------------------------------------------------
# Save PNG
# ---------------------------------------------------------------

os.makedirs(
    os.path.dirname(OUTPUT),
    exist_ok=True
)

image = Image.fromarray(
    rgba,
    mode="RGBA"
)

image.save(
    OUTPUT,
    optimize=True
)

print("\n[OK] Web overlay created")

print("\nOutput:")
print(os.path.abspath(OUTPUT))


# ---------------------------------------------------------------
# Calculate geographic bounds
# ---------------------------------------------------------------

print("\nGeoTIFF bounds:")
print(f"West : {bounds.left}")
print(f"South: {bounds.bottom}")
print(f"East : {bounds.right}")
print(f"North: {bounds.top}")

print("\nCoordinate system:")
print(crs)

print("\n" + "=" * 70)
print("STEP 8B COMPLETE")
print("=" * 70)

print("\n[PASS] Web overlay generated successfully.")