import os
import rasterio
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap

INPUT = r"data\processed\prospectivity\Iron_Ore_Prospectivity_Class.tif"
OUTPUT = r"data\processed\prospectivity\Iron_Ore_Prospectivity_Preview.png"

print("=" * 70)
print("STEP 7B - PROSPECTIVITY MAP VISUALIZATION")
print("=" * 70)

if not os.path.exists(INPUT):
    raise FileNotFoundError(f"Input file not found: {INPUT}")

print("\nLoading classification map...")

with rasterio.open(INPUT) as src:
    data = src.read(1)
    transform = src.transform
    crs = src.crs

print("[OK] Classification map loaded")
print(f"CRS: {crs}")
print(f"Size: {data.shape[1]} x {data.shape[0]}")

# Convert nodata to NaN
display_data = data.astype(float)
display_data[display_data == 0] = np.nan

# Custom classes:
# 1 = LOW
# 2 = MEDIUM
# 3 = HIGH

cmap = ListedColormap([
    "green",
    "yellow",
    "red"
])

print("\nCreating preview...")

fig, ax = plt.subplots(figsize=(12, 8))

im = ax.imshow(
    display_data,
    cmap=cmap,
    vmin=1,
    vmax=3
)

ax.set_title(
    "AI-Based Iron Ore Prospectivity Map\n"
    "Sentinel-2 + XGBoost"
)

ax.set_xlabel("Pixel X")
ax.set_ylabel("Pixel Y")

# Colorbar
cbar = plt.colorbar(im, ax=ax, ticks=[1.33, 2, 2.67])
cbar.ax.set_yticklabels([
    "LOW",
    "MEDIUM",
    "HIGH"
])

plt.tight_layout()

os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

plt.savefig(
    OUTPUT,
    dpi=200,
    bbox_inches="tight"
)

plt.close()

print("\n" + "=" * 70)
print("STEP 7B COMPLETE")
print("=" * 70)

print(f"\nPreview saved to:")
print(os.path.abspath(OUTPUT))

print("\n[PASS] Prospectivity preview generated successfully.")