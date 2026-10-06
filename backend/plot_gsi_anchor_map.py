import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path

PROJECT = Path(
    r"C:\Users\Admin\Downloads\OreVision-AI-Complete-Project\OreVision-AI"
)

INPUT = (
    PROJECT
    / "backend"
    / "data"
    / "processed"
    / "gsi_sentinel"
    / "GSI_Sentinel_Linked_Anchors.csv"
)

OUTPUT_DIR = (
    PROJECT
    / "backend"
    / "data"
    / "processed"
    / "gsi_sentinel"
)

OUTPUT = OUTPUT_DIR / "GSI_Anchor_Map.png"


# Load data
df = pd.read_csv(INPUT)

# Separate valid and invalid points
valid = df[df["valid_pixel"] == 1].copy()
invalid = df[df["valid_pixel"] == 0].copy()

# Create plot
plt.figure(figsize=(10, 8))

# 2005 points
data_2005 = valid[
    valid["source_report"].str.contains("13952-2005", na=False)
]

plt.scatter(
    data_2005["longitude"],
    data_2005["latitude"],
    marker="o",
    s=70,
    label="GSI 2005"
)

# 2009 points
data_2009 = valid[
    valid["source_report"].str.contains("14116-2009", na=False)
]

plt.scatter(
    data_2009["longitude"],
    data_2009["latitude"],
    marker="^",
    s=70,
    label="GSI 2009"
)

# Invalid points
if len(invalid) > 0:
    plt.scatter(
        invalid["longitude"],
        invalid["latitude"],
        marker="x",
        s=100,
        label="Invalid Sentinel pixel"
    )

    # Label invalid locations
    for _, row in invalid.iterrows():
        plt.annotate(
            row["locality"],
            (row["longitude"], row["latitude"]),
            xytext=(5, 5),
            textcoords="offset points"
        )

plt.xlabel("Longitude")
plt.ylabel("Latitude")
plt.title("GSI Exploration Locality Anchor Map")

plt.grid(True, alpha=0.3)
plt.legend()

plt.tight_layout()

plt.savefig(OUTPUT, dpi=300)
plt.show()

print("Map created:")
print(OUTPUT)
print()
print("Total anchors:", len(df))
print("Valid anchors:", len(valid))
print("Invalid anchors:", len(invalid))