from pathlib import Path
import numpy as np
import rasterio
from rasterio.warp import reproject
from rasterio.enums import Resampling

BASE = Path(__file__).resolve().parent

INPUT = BASE / "data" / "processed" / "sentinel2" / "expanded" / "clipped"
OUTPUT = BASE / "data" / "processed" / "sentinel2" / "expanded" / "features"

OUTPUT.mkdir(parents=True, exist_ok=True)


def read_band(name):
    path = INPUT / f"Expanded_{name}.tif"

    with rasterio.open(path) as src:
        data = src.read(1).astype(np.float32)
        profile = src.profile.copy()
        transform = src.transform
        crs = src.crs

    return data, profile, transform, crs


# ------------------------------------------------------------
# Read 10 m bands
# ------------------------------------------------------------

B02, profile, transform, crs = read_band("B02")
B04, _, _, _ = read_band("B04")
B08, _, _, _ = read_band("B08")


# ------------------------------------------------------------
# Read 20 m bands
# Resample to B02 10 m grid
# ------------------------------------------------------------

def read_and_resample(name, reference_profile):
    path = INPUT / f"Expanded_{name}.tif"

    with rasterio.open(path) as src:

        destination = np.empty(
            (
                reference_profile["height"],
                reference_profile["width"]
            ),
            dtype=np.float32
        )

        reproject(
            source=rasterio.band(src, 1),
            destination=destination,
            src_transform=src.transform,
            src_crs=src.crs,
            dst_transform=reference_profile["transform"],
            dst_crs=reference_profile["crs"],
            resampling=Resampling.bilinear
        )

    return destination


B11 = read_and_resample("B11", profile)
B12 = read_and_resample("B12", profile)


# ------------------------------------------------------------
# SCL
# Nearest-neighbour resampling because it contains classes
# ------------------------------------------------------------

SCL_path = INPUT / "Expanded_SCL.tif"

with rasterio.open(SCL_path) as src:

    SCL = np.empty(
        (
            profile["height"],
            profile["width"]
        ),
        dtype=np.float32
    )

    reproject(
        source=rasterio.band(src, 1),
        destination=SCL,
        src_transform=src.transform,
        src_crs=src.crs,
        dst_transform=profile["transform"],
        dst_crs=profile["crs"],
        resampling=Resampling.nearest
    )


# ------------------------------------------------------------
# Sentinel-2 reflectance scaling
# ------------------------------------------------------------

B02 = B02 / 10000.0
B04 = B04 / 10000.0
B08 = B08 / 10000.0
B11 = B11 / 10000.0
B12 = B12 / 10000.0


# ------------------------------------------------------------
# Valid Sentinel-2 pixels
# ------------------------------------------------------------

valid_scl = np.isin(
    SCL.astype(np.int16),
    [4, 5, 6, 7]
)

valid = (
    valid_scl
    & np.isfinite(B02)
    & np.isfinite(B04)
    & np.isfinite(B08)
    & np.isfinite(B11)
    & np.isfinite(B12)
)


# ------------------------------------------------------------
# Safe division
# ------------------------------------------------------------

def safe_divide(a, b):
    result = np.full_like(a, np.nan, dtype=np.float32)

    mask = np.abs(b) > 1e-6

    result[mask] = a[mask] / b[mask]

    return result


# ------------------------------------------------------------
# Calculate spectral features
# ------------------------------------------------------------

NDVI = safe_divide(
    B08 - B04,
    B08 + B04
)

NDMI = safe_divide(
    B08 - B11,
    B08 + B11
)

B04_B02 = safe_divide(
    B04,
    B02
)

B04_B11 = safe_divide(
    B04,
    B11
)

B11_B12 = safe_divide(
    B11,
    B12
)


# ------------------------------------------------------------
# Apply valid mask
# ------------------------------------------------------------

features = {
    "NDVI": NDVI,
    "NDMI": NDMI,
    "B04_B02": B04_B02,
    "B04_B11": B04_B11,
    "B11_B12": B11_B12
}


# ------------------------------------------------------------
# Output GeoTIFFs
# ------------------------------------------------------------

out_profile = profile.copy()

out_profile.update({
    "driver": "GTiff",
    "dtype": "float32",
    "count": 1,
    "compress": "deflate",
    "nodata": np.nan
})


for name, data in features.items():

    data = data.astype(np.float32)

    data[~valid] = np.nan

    output = OUTPUT / f"Expanded_{name}.tif"

    with rasterio.open(
        output,
        "w",
        **out_profile
    ) as dst:

        dst.write(data, 1)

    print(f"Saved: {output}")


# ------------------------------------------------------------
# Valid mask
# ------------------------------------------------------------

mask_profile = out_profile.copy()

mask_profile.update({
    "dtype": "uint8",
    "nodata": 0
})

mask_output = OUTPUT / "Expanded_valid_mask.tif"

with rasterio.open(
    mask_output,
    "w",
    **mask_profile
) as dst:

    dst.write(valid.astype(np.uint8), 1)


print(f"Saved: {mask_output}")

print("\n========================================")
print("EXPANDED FEATURE PROCESSING COMPLETE")
print("========================================")
print(f"Output folder: {OUTPUT}")