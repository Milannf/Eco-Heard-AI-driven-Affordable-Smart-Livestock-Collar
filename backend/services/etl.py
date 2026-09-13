from dataclasses import dataclass
from typing import Any


# ============================================================
# CANONICAL SENSOR RECORD
# ============================================================

@dataclass
class SensorRecord:

    device_id: str

    seq: int

    t_ms: int

    x: float
    y: float
    z: float

    source: str


# ============================================================
# ETL TRANSFORM
# ============================================================

def transform_packet(
    packet: dict[str, Any]
) -> SensorRecord:

    """
    Convert the ESP32 packet into the canonical format
    expected by the Eco-Herd backend.

    Incoming units:
        x_mg
        y_mg
        z_mg

    Output names:
        x
        y
        z

    Units remain mg so they match the original
    Precision Beef accelerometer dataset.
    """

    required_fields = [

        "device_id",
        "seq",
        "t_ms",

        "x_mg",
        "y_mg",
        "z_mg",

        "source",

    ]

    # --------------------------------------------------------
    # Validate required fields
    # --------------------------------------------------------

    missing = [

        field
        for field in required_fields
        if field not in packet

    ]

    if missing:

        raise ValueError(
            f"Missing fields: {missing}"
        )


    # --------------------------------------------------------
    # Convert types
    # --------------------------------------------------------

    device_id = str(
        packet["device_id"]
    )

    seq = int(
        packet["seq"]
    )

    t_ms = int(
        packet["t_ms"]
    )

    x = float(
        packet["x_mg"]
    )

    y = float(
        packet["y_mg"]
    )

    z = float(
        packet["z_mg"]
    )

    source = str(
        packet["source"]
    )


    # --------------------------------------------------------
    # Basic sanity checking
    #
    # These are transport sanity bounds,
    # NOT animal-behaviour thresholds.
    # --------------------------------------------------------

    max_abs_acceleration_mg = 16000

    for axis_name, value in [

        ("x", x),
        ("y", y),
        ("z", z),

    ]:

        if abs(value) > max_abs_acceleration_mg:

            raise ValueError(
                f"Suspicious {axis_name} value: {value} mg"
            )


    # --------------------------------------------------------
    # Return canonical representation
    # --------------------------------------------------------

    return SensorRecord(

        device_id=device_id,

        seq=seq,

        t_ms=t_ms,

        x=x,
        y=y,
        z=z,

        source=source,

    )