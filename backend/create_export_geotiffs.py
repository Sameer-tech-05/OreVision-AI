from pathlib import Path
import numpy as np
import rasterio
from rasterio.enums import Resampling


BASE_DIR = Path(__file__).resolve().parent
PROSPECTIVITY_DIR = BASE_DIR / "data" / "processed" / "prospectivity"

SOURCE_PROBABILITY = (
    PROSPECTIVITY_DIR / "Iron_Ore_Prospectivity_Probability.tif"
)

SOURCE_CLASS = (
    PROSPECTIVITY_DIR / "Iron_Ore_Prospectivity_Class.tif"
)

OUTPUT_PROBABILITY = (
    PROSPECTIVITY_DIR / "OreVision_AI_Prospectivity_Probability.tif"
)

OUTPUT_CLASS = (
    PROSPECTIVITY_DIR / "OreVision_AI_Prospectivity_Class_Color.tif"
)


def create_probability_geotiff():
    print("\n[1/2] Creating probability GeoTIFF...")

    if not SOURCE_PROBABILITY.exists():
        raise FileNotFoundError(
            f"Source probability raster not found:\n{SOURCE_PROBABILITY}"
        )

    with rasterio.open(SOURCE_PROBABILITY) as src:
        data = src.read(1)

        profile = src.profile.copy()

        profile.update(
            driver="GTiff",
            dtype="float32",
            count=1,
            nodata=-9999.0,
            compress="deflate",
            predictor=3,
            tiled=True,
            BIGTIFF="IF_SAFER",
        )

        output_data = data.astype(np.float32)

        if src.nodata is not None:
            output_data[data == src.nodata] = -9999.0

        with rasterio.open(
            OUTPUT_PROBABILITY,
            "w",
            **profile
        ) as dst:

            dst.write(output_data, 1)

            dst.update_tags(
                PROJECT="OreVision AI",
                PRODUCT="Iron Ore Prospectivity Probability",
                MODEL="Validated XGBoost",
                DATA_SOURCE="Sentinel-2-derived spectral features",
                VALUE_RANGE="0-100 percent",
                CRS_INFO="EPSG:32643",
                RESOLUTION="10 m",
            )

    print("[PASS] Probability GeoTIFF created.")
    print(f"      {OUTPUT_PROBABILITY}")


def create_classification_geotiff():
    print("\n[2/2] Creating color classification GeoTIFF...")

    if not SOURCE_CLASS.exists():
        raise FileNotFoundError(
            f"Source classification raster not found:\n{SOURCE_CLASS}"
        )

    with rasterio.open(SOURCE_CLASS) as src:
        classes = src.read(1)

        height = src.height
        width = src.width

        # RGBA output
        rgba = np.zeros(
            (4, height, width),
            dtype=np.uint8
        )

        # LOW = class 1 = green
        low = classes == 1
        rgba[0, low] = 0
        rgba[1, low] = 180
        rgba[2, low] = 0
        rgba[3, low] = 180

        # MEDIUM = class 2 = yellow
        medium = classes == 2
        rgba[0, medium] = 255
        rgba[1, medium] = 220
        rgba[2, medium] = 0
        rgba[3, medium] = 190

        # HIGH = class 3 = red
        high = classes == 3
        rgba[0, high] = 220
        rgba[1, high] = 0
        rgba[2, high] = 0
        rgba[3, high] = 210

        profile = src.profile.copy()

        profile.update(
            driver="GTiff",
            dtype="uint8",
            count=4,
            nodata=None,
            compress="deflate",
            tiled=True,
            BIGTIFF="IF_SAFER",
        )

        with rasterio.open(
            OUTPUT_CLASS,
            "w",
            **profile
        ) as dst:

            dst.write(rgba)

            dst.colorinterp = (
                rasterio.enums.ColorInterp.red,
                rasterio.enums.ColorInterp.green,
                rasterio.enums.ColorInterp.blue,
                rasterio.enums.ColorInterp.alpha,
            )

            dst.update_tags(
                PROJECT="OreVision AI",
                PRODUCT="Iron Ore Prospectivity Classification",
                MODEL="Validated XGBoost",
                DATA_SOURCE="Sentinel-2-derived spectral features",
                CLASS_1="LOW",
                CLASS_2="MEDIUM",
                CLASS_3="HIGH",
                CRS_INFO="EPSG:32643",
                RESOLUTION="10 m",
            )

    print("[PASS] Classification GeoTIFF created.")
    print(f"      {OUTPUT_CLASS}")


def verify_outputs():
    print("\n========== VERIFICATION ==========")

    files = [
        OUTPUT_PROBABILITY,
        OUTPUT_CLASS,
    ]

    for file in files:

        print(f"\nFile: {file.name}")
        print(f"Exists: {file.exists()}")

        if not file.exists():
            continue

        with rasterio.open(file) as src:

            print(f"Bands: {src.count}")
            print(f"Width: {src.width}")
            print(f"Height: {src.height}")
            print(f"CRS: {src.crs}")
            print(f"Resolution: {src.res}")
            print(f"Bounds: {src.bounds}")

    print("\n===================================")
    print("[PASS] GeoTIFF export process completed.")


def main():
    print("==========================================")
    print(" OreVision AI - GeoTIFF Export")
    print("==========================================")

    create_probability_geotiff()
    create_classification_geotiff()
    verify_outputs()

    print("\n[PASS] ALL EXPORTS COMPLETED SUCCESSFULLY.")


if __name__ == "__main__":
    main()