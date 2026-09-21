"""Buat ZIP source aplikasi + firmware + model, tanpa cache/credential/data lokal."""
import argparse
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED = {"node_modules", ".venv", ".expo", ".git", ".pio", "__pycache__", "dist", ".vscode", ".idea", ".claude"}


def add_tree(archive, folder, prefix, firmware=False):
    for path in folder.rglob("*"):
        relative = path.relative_to(folder)
        if not path.is_file() or any(part in EXCLUDED for part in relative.parts):
            continue
        if firmware and relative.parts[0] in ('records', 'screenshots'):
            continue
        if path.name == ".env" or path.name.startswith(".env.") and path.name != ".env.example":
            continue
        if path.suffix in (".pyc", ".joblib") or (folder.name == "backend" and relative.parts[0] == "data"):
            continue
        if firmware and relative.as_posix() == "include/gateway_config.h":
            archive.write(folder / "include/gateway_config.example.h", prefix + relative.as_posix())
        else:
            archive.write(path, prefix + relative.as_posix())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--models", type=Path, required=True)
    parser.add_argument("--firmware", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    for required in ('agritrack/package.json', 'agritrack/package-lock.json', 'agritrack/constants/theme.js', 'compose.yaml'):
        if not (ROOT / required).is_file():
            parser.error(f'Source belum lengkap: {required}. Selesaikan pemulihan source sebelum ekspor.')
    names = ["behaviour_lgbm.joblib", "feature_cols.joblib", "label_encoder.joblib"]
    for name in names:
        if not (args.models / name).is_file():
            parser.error(f"Model tidak ditemukan: {args.models / name}")
    if not (args.firmware / "include/gateway_config.example.h").is_file():
        parser.error("Folder firmware/template konfigurasi tidak ditemukan.")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.output, "x", compression=zipfile.ZIP_DEFLATED) as archive:
        for folder in ("agritrack", "backend", "docker", "models", "tools"):
            add_tree(archive, ROOT / folder, f"Eco-Herd/{folder}/")
        # Data operasional dan file .env tidak ikut ZIP.
        for path in ROOT.iterdir():
            if path.is_file() and (path.suffix in (".md", ".yaml") or path.name in (".dockerignore", ".env.example", ".gitignore")):
                archive.write(path, "Eco-Herd/" + path.name)
        add_tree(archive, args.firmware, "Eco-Herd/firmware/", firmware=True)
        for name in names:
            archive.write(args.models / name, "Eco-Herd/models/" + name)
    print(f"ZIP siap: {args.output}")


if __name__ == "__main__":
    main()
