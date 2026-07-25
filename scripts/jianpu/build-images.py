#!/usr/bin/env python3
"""Génère les images de partitions 简谱 à partir des PDF sources.

Les PDF chinois sont des scans sans couche texte : les chiffres, durées,
octaves et liaisons restent des pixels (donc jamais faux). Seuls les
accords et le pinyin sont redessinés par-dessus (voir build-overlays.py),
à partir des données déjà présentes dans les .cho.

Usage (depuis GCCLouange/) :
    python3 scripts/jianpu/build-images.py ../Partitions

Sortie : public/jianpu/<slug>-p<n>.webp + public/jianpu/index.json
"""
import json
import os
import sys

import fitz
import numpy as np
from PIL import Image

DPI = 200
WIDTH = 1600
QUALITY = 82
PAD = 14  # marge blanche laissée autour du contenu, en pixels source

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_DIR = os.path.join(ROOT, "public", "jianpu")
INVENTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "inventaire.json")


def trim(im: Image.Image) -> Image.Image:
    """Rogne les marges blanches du scan autour du contenu imprimé."""
    a = np.asarray(im)
    dark = a < 245
    rows = np.where(dark.any(axis=1))[0]
    cols = np.where(dark.any(axis=0))[0]
    if not len(rows) or not len(cols):
        return im
    top, bottom = max(0, rows[0] - PAD), min(a.shape[0], rows[-1] + PAD)
    left, right = max(0, cols[0] - PAD), min(a.shape[1], cols[-1] + PAD)
    return im.crop((left, top, right, bottom))


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: build-images.py <dossier des PDF>", file=sys.stderr)
        return 1
    pdf_dir = sys.argv[1]
    entries = json.load(open(INVENTORY, encoding="utf8"))
    os.makedirs(OUT_DIR, exist_ok=True)

    manifest = {}
    total = 0
    for entry in entries:
        slug, pdf = entry["slug"], entry["pdf"]
        path = os.path.join(pdf_dir, pdf)
        if not os.path.exists(path):
            print(f"  ABSENT {pdf}", file=sys.stderr)
            continue
        doc = fitz.open(path)
        pages = []
        for pno in range(len(doc)):
            pix = doc[pno].get_pixmap(dpi=DPI, colorspace=fitz.csGRAY)
            im = trim(Image.frombytes("L", [pix.width, pix.height], pix.samples))
            im.thumbnail((WIDTH, WIDTH * 6), Image.LANCZOS)
            name = f"{slug}-p{pno + 1}.webp"
            dest = os.path.join(OUT_DIR, name)
            im.save(dest, "WEBP", quality=QUALITY, method=6)
            pages.append({"file": name, "w": im.size[0], "h": im.size[1]})
            total += os.path.getsize(dest)
        doc.close()
        manifest[slug] = {"pages": pages, "source": pdf}

    with open(os.path.join(OUT_DIR, "index.json"), "w", encoding="utf8") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=0, sort_keys=True)

    print(f"✓ {len(manifest)} partition(s) 简谱 → public/jianpu/ ({total / 1e6:.1f} Mo)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
