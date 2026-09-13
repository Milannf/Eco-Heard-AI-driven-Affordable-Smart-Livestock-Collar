from pathlib import Path
import pandas as pd


# ============================================================
# CONFIGURATION
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[2]

INPUT_CSV = PROJECT_ROOT / "backend" / "data" / "accel-04.csv"

OUTPUT_HEADER = (
    PROJECT_ROOT
    / "firmware"
    / "ecoherd_esp32"
    / "mock_data.h"
)

SAMPLE_RATE_HZ = 10

# Start with 60 seconds
DURATION_SECONDS = 60

N_SAMPLES = SAMPLE_RATE_HZ * DURATION_SECONDS


# ============================================================
# LOAD DATA
# ============================================================

print("=" * 60)
print("ECO-HERD MOCK DATA GENERATOR")
print("=" * 60)

print(f"Reading: {INPUT_CSV}")

if not INPUT_CSV.exists():
    raise FileNotFoundError(
        f"Could not find dataset:\n{INPUT_CSV}"
    )

df = pd.read_csv(INPUT_CSV)


# ============================================================
# VALIDATE DATASET
# ============================================================

required_columns = ["x", "y", "z"]

missing_columns = [
    column
    for column in required_columns
    if column not in df.columns
]

if missing_columns:
    raise ValueError(
        f"Dataset is missing columns: {missing_columns}\n"
        f"Available columns: {list(df.columns)}"
    )


df = df[required_columns].copy()

df = df.dropna()

if len(df) < N_SAMPLES:
    print(
        f"WARNING: Requested {N_SAMPLES} samples "
        f"but dataset only contains {len(df)}."
    )

df = df.iloc[:N_SAMPLES]


# ============================================================
# GENERATE ARDUINO HEADER
# ============================================================

OUTPUT_HEADER.parent.mkdir(
    parents=True,
    exist_ok=True
)

with OUTPUT_HEADER.open(
    "w",
    encoding="utf-8"
) as file:

    file.write("#pragma once\n\n")

    file.write("// ==============================================\n")
    file.write("// AUTO-GENERATED MOCK SENSOR DATA\n")
    file.write("// Source: accel-04.csv\n")
    file.write("// Sampling rate: 10 Hz\n")
    file.write("// Units: mg\n")
    file.write("// ==============================================\n\n")

    file.write("struct MockSample {\n")
    file.write("    float x_mg;\n")
    file.write("    float y_mg;\n")
    file.write("    float z_mg;\n")
    file.write("};\n\n")

    file.write(
        f"const unsigned int MOCK_SAMPLE_COUNT = {len(df)};\n\n"
    )

    file.write("const MockSample MOCK_DATA[] = {\n")

    for row in df.itertuples(index=False):

        x = float(row.x)
        y = float(row.y)
        z = float(row.z)

        file.write(
            f"    {{{x:.6f}f, "
            f"{y:.6f}f, "
            f"{z:.6f}f}},\n"
        )

    file.write("};\n")


# ============================================================
# SUMMARY
# ============================================================

duration = len(df) / SAMPLE_RATE_HZ

print()
print(f"Generated: {OUTPUT_HEADER}")
print(f"Samples:   {len(df)}")
print(f"Rate:      {SAMPLE_RATE_HZ} Hz")
print(f"Duration:  {duration:.1f} seconds")
print()
print("DONE.")