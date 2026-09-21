"""Worker JSON-lines: stdout untuk protokol, stderr untuk log/library."""
import argparse
from contextlib import redirect_stdout
import json
from pathlib import Path
import sys

import joblib
import numpy as np
from sklearn.preprocessing import LabelEncoder

from features import PROFILE, SAMPLE_RATE_HZ, WINDOW_SAMPLES, WindowError, extract_features


class BehaviourModel:
    def __init__(self, folder):
        folder = Path(folder)
        self.model = joblib.load(folder / "behaviour_lgbm.joblib")
        self.columns = joblib.load(folder / "feature_cols.joblib")
        if not isinstance(self.columns, list) or not all(isinstance(c, str) for c in self.columns):
            raise ValueError("feature_cols.joblib harus list nama fitur.")
        if len(set(self.columns)) != len(self.columns) or len(self.columns) != self.model.n_features_in_:
            raise ValueError("Jumlah/urutan fitur tidak kompatibel dengan model.")
        self.classes = self.model.classes_.tolist()
        self.labels = None
        self.label_issue = None
        try:
            encoder = joblib.load(folder / "label_encoder.joblib")
            if not isinstance(encoder, LabelEncoder):
                raise ValueError(f"label_encoder.joblib berisi {type(encoder).__name__}, bukan LabelEncoder.")
            ids = np.asarray(self.classes)
            if not np.issubdtype(ids.dtype, np.integer) or sorted(ids.tolist()) != list(range(len(encoder.classes_))):
                raise ValueError("Kelas model tidak cocok dengan LabelEncoder.")
            labels = encoder.inverse_transform(ids).tolist()
            if not all(isinstance(label, str) for label in labels):
                raise ValueError("LabelEncoder belum berisi nama perilaku.")
            self.labels = labels
        except (FileNotFoundError, ValueError, TypeError) as error:
            self.label_issue = str(error)
        # Gunakan Booster langsung supaya tidak bergantung tag sklearn wrapper.
        if self.model.booster_.num_model_per_iteration() != len(self.classes):
            raise ValueError("Model bukan classifier multiclass yang didukung.")
        self.metadata = {
            "model": "behaviour_lgbm.joblib", "feature_count": len(self.columns),
            "feature_names": self.columns, "class_ids": self.classes,
            "labels": self.labels, "label_issue": self.label_issue,
            "profile": PROFILE, "preprocessing_verified": False,
            "window_samples": WINDOW_SAMPLES, "sample_rate_hz": SAMPLE_RATE_HZ,
            "acceleration_unit": "mg",
            "notice": "Eksperimental: rumus fitur/window belum dibandingkan dengan preprocessing pelatihan.",
        }

    def predict(self, rows):
        try:
            features, window = extract_features(rows)
        except WindowError as error:
            return {"status": error.status, "message": str(error), "metadata": self.metadata}
        if set(features) != set(self.columns):
            raise ValueError("Nama fitur model berbeda dari extractor 37 fitur prototipe.")
        x = np.array([[features[name] for name in self.columns]], dtype=np.float64)
        probabilities = np.asarray(self.model.booster_.predict(x, num_threads=1))[0]
        if probabilities.shape != (len(self.classes),) or not np.isfinite(probabilities).all():
            raise ValueError("Output probabilitas model tidak valid.")
        winner = int(np.argmax(probabilities))
        return {
            "status": "experimental", "metadata": self.metadata, "window": window,
            "prediction": {
                "class_id": self.classes[winner],
                "label": self.labels[winner] if self.labels else None,
                "model_probability": float(probabilities[winner]),
                "probabilities": [
                    {"class_id": value, "label": self.labels[i] if self.labels else None,
                     "probability": float(probabilities[i])}
                    for i, value in enumerate(self.classes)
                ],
            },
        }


def emit(value):
    print(json.dumps(value, allow_nan=False), flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-dir", required=True)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    try:
        with redirect_stdout(sys.stderr):
            model = BehaviourModel(args.model_dir)
    except Exception as error:
        emit({"event": "error", "message": f"Model gagal dimuat: {error}"})
        return 1
    emit({"event": "ready", "metadata": model.metadata})
    if args.check:
        return 0
    for line in sys.stdin:
        message = {}
        try:
            message = json.loads(line)
            with redirect_stdout(sys.stderr):
                result = model.predict(message["readings"])
        except Exception as error:
            result = {"status": "model_error", "message": str(error)}
        emit({"id": message.get("id"), "result": result})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
