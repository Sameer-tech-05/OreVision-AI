import os
import joblib
import numpy as np
import rasterio


# ============================================================
# STEP 7 - GENERATE IRON ORE PROSPECTIVITY MAP
# ============================================================

print("=" * 70)
print("STEP 7 - IRON ORE PROSPECTIVITY MAPPING")
print("=" * 70)


# ------------------------------------------------------------
# Paths
# ------------------------------------------------------------

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

FEATURE_DIR = os.path.join(
    BASE_DIR,
    "data",
    "processed",
    "sentinel2",
    "expanded",
    "features"
)

MODEL_FILE = os.path.join(
    BASE_DIR,
    "models",
    "iron_ore_xgb_validated_model.joblib"
)

OUTPUT_DIR = os.path.join(
    BASE_DIR,
    "data",
    "processed",
    "prospectivity"
)

os.makedirs(
    OUTPUT_DIR,
    exist_ok=True
)


# ------------------------------------------------------------
# Input feature files
# ------------------------------------------------------------

FEATURE_FILES = {
    "NDVI": os.path.join(
        FEATURE_DIR,
        "Expanded_NDVI.tif"
    ),

    "NDMI": os.path.join(
        FEATURE_DIR,
        "Expanded_NDMI.tif"
    ),

    "B04_B02": os.path.join(
        FEATURE_DIR,
        "Expanded_B04_B02.tif"
    ),

    "B04_B11": os.path.join(
        FEATURE_DIR,
        "Expanded_B04_B11.tif"
    ),

    "B11_B12": os.path.join(
        FEATURE_DIR,
        "Expanded_B11_B12.tif"
    )
}


VALID_MASK_FILE = os.path.join(
    FEATURE_DIR,
    "Expanded_valid_mask.tif"
)


# ------------------------------------------------------------
# Output files
# ------------------------------------------------------------

PROBABILITY_FILE = os.path.join(
    OUTPUT_DIR,
    "Iron_Ore_Prospectivity_Probability.tif"
)

CLASS_FILE = os.path.join(
    OUTPUT_DIR,
    "Iron_Ore_Prospectivity_Class.tif"
)


# ------------------------------------------------------------
# Feature order
# ------------------------------------------------------------

FEATURES = [
    "NDVI",
    "NDMI",
    "B04_B02",
    "B04_B11",
    "B11_B12"
]


# ============================================================
# CHECK FILES
# ============================================================

print("\nChecking input files...")


if not os.path.exists(MODEL_FILE):

    raise FileNotFoundError(
        f"Model not found:\n{MODEL_FILE}"
    )

print("[OK] Validated XGBoost model")


for feature in FEATURES:

    if not os.path.exists(
        FEATURE_FILES[feature]
    ):

        raise FileNotFoundError(
            f"Missing feature:\n"
            f"{FEATURE_FILES[feature]}"
        )

    print(
        f"[OK] {feature}"
    )


if not os.path.exists(
    VALID_MASK_FILE
):

    raise FileNotFoundError(
        f"Missing valid mask:\n"
        f"{VALID_MASK_FILE}"
    )


print("[OK] Valid pixel mask")


# ============================================================
# LOAD MODEL
# ============================================================

print("\nLoading validated XGBoost model...")

model = joblib.load(
    MODEL_FILE
)

print("[OK] Model loaded")


# ============================================================
# OPEN REFERENCE RASTER
# ============================================================

reference_file = FEATURE_FILES[
    "NDVI"
]

with rasterio.open(
    reference_file
) as src:

    profile = src.profile.copy()

    width = src.width
    height = src.height

    transform = src.transform
    crs = src.crs

    print("\nRaster information:")

    print(
        f"Width : {width}"
    )

    print(
        f"Height: {height}"
    )

    print(
        f"CRS   : {crs}"
    )

    print(
        f"Resolution: "
        f"{transform.a} m"
    )


# ============================================================
# OUTPUT PROFILE
# ============================================================

probability_profile = profile.copy()

probability_profile.update(
    dtype="float32",
    count=1,
    compress="deflate",
    predictor=2,
    nodata=-9999.0
)


class_profile = profile.copy()

class_profile.update(
    dtype="uint8",
    count=1,
    compress="deflate",
    nodata=0
)


# ============================================================
# OPEN ALL INPUT RASTERS
# ============================================================

print("\nOpening feature rasters...")

sources = {}

for feature in FEATURES:

    sources[feature] = rasterio.open(
        FEATURE_FILES[feature]
    )


mask_source = rasterio.open(
    VALID_MASK_FILE
)


# ============================================================
# CREATE OUTPUT RASTERS
# ============================================================

probability_dst = rasterio.open(
    PROBABILITY_FILE,
    "w",
    **probability_profile
)

class_dst = rasterio.open(
    CLASS_FILE,
    "w",
    **class_profile
)


# ============================================================
# PROCESS IN BLOCKS
# ============================================================

print("\nGenerating prospectivity map...")

total_valid = 0

probability_min = 101.0
probability_max = -1.0

class_counts = {
    1: 0,
    2: 0,
    3: 0
}


with rasterio.open(
    reference_file
) as ref:

    block_number = 0

    for _, window in ref.block_windows(1):

        block_number += 1

        # --------------------------------------------
        # Read valid mask
        # --------------------------------------------

        valid_mask = mask_source.read(
            1,
            window=window
        )


        # --------------------------------------------
        # Read features
        # --------------------------------------------

        arrays = []

        for feature in FEATURES:

            data = sources[
                feature
            ].read(
                1,
                window=window
            ).astype(
                np.float32
            )

            arrays.append(
                data
            )


        # --------------------------------------------
        # Stack features
        # --------------------------------------------

        stack = np.stack(
            arrays,
            axis=-1
        )


        original_shape = stack.shape[:2]

        pixels = stack.reshape(
            -1,
            len(FEATURES)
        )

        mask_flat = (
            valid_mask.reshape(-1) > 0
        )


        # --------------------------------------------
        # Remove invalid values
        # --------------------------------------------

        finite_mask = np.isfinite(
            pixels
        ).all(
            axis=1
        )

        prediction_mask = (
            mask_flat &
            finite_mask
        )


        probability_block = np.full(
            pixels.shape[0],
            -9999.0,
            dtype=np.float32
        )

        class_block = np.zeros(
            pixels.shape[0],
            dtype=np.uint8
        )


        # --------------------------------------------
        # Predict valid pixels
        # --------------------------------------------

        if prediction_mask.any():

            valid_pixels = pixels[
                prediction_mask
            ]


            probabilities = (
                model.predict_proba(
                    valid_pixels
                )[:, 1]
                * 100.0
            )


            probabilities = (
                probabilities.astype(
                    np.float32
                )
            )


            # ----------------------------------------
            # Prospectivity classes
            #
            # 0-40   = LOW
            # 40-70  = MEDIUM
            # 70-100 = HIGH
            # ----------------------------------------

            classes = np.where(
                probabilities <= 40,
                1,
                np.where(
                    probabilities <= 70,
                    2,
                    3
                )
            ).astype(
                np.uint8
            )


            probability_block[
                prediction_mask
            ] = probabilities


            class_block[
                prediction_mask
            ] = classes


            # ----------------------------------------
            # Statistics
            # ----------------------------------------

            total_valid += len(
                probabilities
            )


            probability_min = min(
                probability_min,
                float(
                    probabilities.min()
                )
            )


            probability_max = max(
                probability_max,
                float(
                    probabilities.max()
                )
            )


            class_counts[1] += int(
                (classes == 1).sum()
            )

            class_counts[2] += int(
                (classes == 2).sum()
            )

            class_counts[3] += int(
                (classes == 3).sum()
            )


        # --------------------------------------------
        # Reshape output
        # --------------------------------------------

        probability_block = (
            probability_block.reshape(
                original_shape
            )
        )

        class_block = (
            class_block.reshape(
                original_shape
            )
        )


        # --------------------------------------------
        # Write output
        # --------------------------------------------

        probability_dst.write(
            probability_block,
            1,
            window=window
        )

        class_dst.write(
            class_block,
            1,
            window=window
        )


        if block_number % 50 == 0:

            print(
                f"Processed blocks: "
                f"{block_number}"
            )


# ============================================================
# CLOSE FILES
# ============================================================

for src in sources.values():

    src.close()


mask_source.close()

probability_dst.close()

class_dst.close()


# ============================================================
# FINAL STATISTICS
# ============================================================

print("\n")
print("=" * 70)
print("PROSPECTIVITY MAP RESULTS")
print("=" * 70)


print(
    f"\nValid predicted pixels: "
    f"{total_valid:,}"
)


print(
    f"Minimum probability: "
    f"{probability_min:.2f}%"
)


print(
    f"Maximum probability: "
    f"{probability_max:.2f}%"
)


print("\nProspectivity classes:")


print(
    f"LOW    (0-40%) : "
    f"{class_counts[1]:,} pixels"
)


print(
    f"MEDIUM (41-70%): "
    f"{class_counts[2]:,} pixels"
)


print(
    f"HIGH   (71-100%): "
    f"{class_counts[3]:,} pixels"
)


# ============================================================
# OUTPUT FILES
# ============================================================

print("\n")
print("=" * 70)
print("OUTPUT FILES")
print("=" * 70)


print(
    "\nProbability map:"
)

print(
    PROBABILITY_FILE
)


print(
    "\nClassification map:"
)

print(
    CLASS_FILE
)


print("\n")
print("=" * 70)
print("STEP 7 COMPLETE")
print("=" * 70)

print(
    "\n[PASS] Prospectivity maps generated successfully."
)