import csv
import json
import sys
import time
from pathlib import Path

import serial
from serial.tools import list_ports


# ============================================================
# IMPORT PROJECT ETL
# ============================================================

CURRENT_FILE = Path(__file__).resolve()

BACKEND_DIR = CURRENT_FILE.parents[1]

if str(BACKEND_DIR) not in sys.path:

    sys.path.insert(
        0,
        str(BACKEND_DIR)
    )


from services.etl import transform_packet


# ============================================================
# CONFIGURATION
# ============================================================

BAUD_RATE = 115200

EXPECTED_RATE_HZ = 10

OUTPUT_DIR = (
    BACKEND_DIR
    / "data"
    / "live"
)

RAW_FILE = (
    OUTPUT_DIR
    / "esp32_raw.csv"
)

CLEAN_FILE = (
    OUTPUT_DIR
    / "esp32_clean.csv"
)


# ============================================================
# FIND SERIAL PORT
# ============================================================

def show_ports():

    ports = list(
        list_ports.comports()
    )

    print()
    print("Available serial ports:")
    print("-" * 50)

    if not ports:

        print("No serial ports detected.")

        return

    for port in ports:

        print(
            f"{port.device} | "
            f"{port.description}"
        )


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 60)
    print("ECO-HERD ESP32 INGESTION")
    print("=" * 60)

    show_ports()

    print()

    port = input(
        "Enter ESP32 COM port (example COM5): "
    ).strip()

    if not port:

        print("No COM port entered.")

        return


    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True
    )


    # --------------------------------------------------------
    # Open output files
    # --------------------------------------------------------

    raw_handle = RAW_FILE.open(
        "w",
        newline="",
        encoding="utf-8"
    )

    clean_handle = CLEAN_FILE.open(
        "w",
        newline="",
        encoding="utf-8"
    )


    raw_writer = csv.writer(
        raw_handle
    )

    clean_writer = csv.writer(
        clean_handle
    )


    raw_writer.writerow([

        "received_at",

        "device_id",
        "seq",
        "t_ms",

        "x_mg",
        "y_mg",
        "z_mg",

        "source",

    ])


    clean_writer.writerow([

        "received_at",

        "device_id",
        "seq",
        "t_ms",

        "x",
        "y",
        "z",

        "source",

    ])


    # --------------------------------------------------------
    # Statistics
    # --------------------------------------------------------

    total_lines = 0

    valid_samples = 0

    malformed_packets = 0

    missing_samples = 0

    duplicate_samples = 0

    previous_seq = None

    start_time = time.perf_counter()


    print()
    print(
        f"Opening {port} @ "
        f"{BAUD_RATE} baud..."
    )


    # --------------------------------------------------------
    # Serial connection
    # --------------------------------------------------------

    try:

        with serial.Serial(

            port=port,

            baudrate=BAUD_RATE,

            timeout=1,

        ) as ser:


            # ESP32 may reset when serial opens.
            time.sleep(2)


            print()
            print("CONNECTED.")
            print()
            print(
                "Press CTRL+C to stop."
            )
            print()


            while True:

                raw_bytes = ser.readline()

                if not raw_bytes:

                    continue


                total_lines += 1

                received_at = time.time()


                # ------------------------------------------------
                # Decode
                # ------------------------------------------------

                try:

                    line = raw_bytes.decode(
                        "utf-8"
                    ).strip()

                except UnicodeDecodeError:

                    malformed_packets += 1

                    print(
                        "[BAD UTF-8 PACKET]"
                    )

                    continue


                if not line:

                    continue


                # ------------------------------------------------
                # Parse JSON
                # ------------------------------------------------

                try:

                    packet = json.loads(
                        line
                    )

                except json.JSONDecodeError:

                    malformed_packets += 1

                    print(
                        "[BAD JSON]",
                        line
                    )

                    continue


                # ------------------------------------------------
                # SAVE RAW DATA
                # ------------------------------------------------

                try:

                    raw_writer.writerow([

                        received_at,

                        packet.get(
                            "device_id"
                        ),

                        packet.get(
                            "seq"
                        ),

                        packet.get(
                            "t_ms"
                        ),

                        packet.get(
                            "x_mg"
                        ),

                        packet.get(
                            "y_mg"
                        ),

                        packet.get(
                            "z_mg"
                        ),

                        packet.get(
                            "source"
                        ),

                    ])

                    raw_handle.flush()


                    # --------------------------------------------
                    # ETL TRANSFORM
                    # --------------------------------------------

                    record = transform_packet(
                        packet
                    )


                    # --------------------------------------------
                    # Sequence checking
                    # --------------------------------------------

                    if previous_seq is not None:

                        difference = (
                            record.seq
                            - previous_seq
                        )


                        if difference == 0:

                            duplicate_samples += 1

                            print(
                                f"[DUPLICATE] "
                                f"seq={record.seq}"
                            )


                        elif difference > 1:

                            lost = (
                                difference - 1
                            )

                            missing_samples += lost

                            print(
                                f"[MISSING] "
                                f"{lost} samples "
                                f"before seq="
                                f"{record.seq}"
                            )


                        elif difference < 0:

                            print(
                                "[ESP32 RESTART OR "
                                "DATA REPLAY DETECTED]"
                            )


                    previous_seq = record.seq


                    # --------------------------------------------
                    # SAVE CLEAN DATA
                    # --------------------------------------------

                    clean_writer.writerow([

                        received_at,

                        record.device_id,

                        record.seq,

                        record.t_ms,

                        record.x,

                        record.y,

                        record.z,

                        record.source,

                    ])

                    clean_handle.flush()


                    valid_samples += 1


                    # --------------------------------------------
                    # Live display
                    # --------------------------------------------

                    if valid_samples % 10 == 0:

                        elapsed = (
                            time.perf_counter()
                            - start_time
                        )

                        rate = (
                            valid_samples
                            / elapsed
                        )

                        print(

                            f"Samples: "
                            f"{valid_samples:6d} | "

                            f"Rate: "
                            f"{rate:6.2f} Hz | "

                            f"x={record.x:8.2f} | "

                            f"y={record.y:8.2f} | "

                            f"z={record.z:8.2f}"

                        )


                except Exception as error:

                    malformed_packets += 1

                    print(
                        "[ETL ERROR]",
                        error
                    )


    except KeyboardInterrupt:

        print()
        print()
        print("Stopping Eco-Herd ingestion...")


    except serial.SerialException as error:

        print()
        print(
            "SERIAL ERROR:",
            error
        )


    finally:

        raw_handle.close()

        clean_handle.close()


        elapsed = (
            time.perf_counter()
            - start_time
        )


        observed_rate = (

            valid_samples / elapsed

            if elapsed > 0

            else 0

        )


        print()
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)

        print(
            f"Total lines:       "
            f"{total_lines}"
        )

        print(
            f"Valid samples:     "
            f"{valid_samples}"
        )

        print(
            f"Malformed packets: "
            f"{malformed_packets}"
        )

        print(
            f"Missing samples:   "
            f"{missing_samples}"
        )

        print(
            f"Duplicate samples: "
            f"{duplicate_samples}"
        )

        print(
            f"Observed rate:     "
            f"{observed_rate:.2f} Hz"
        )

        print()
        print(
            f"Raw file:"
            f"\n{RAW_FILE}"
        )

        print()
        print(
            f"Clean file:"
            f"\n{CLEAN_FILE}"
        )

        print()


if __name__ == "__main__":

    main()