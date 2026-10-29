#!/usr/bin/env python3
"""Allège les captures du guide (public/guide/*.png, 2560x1600) : recompression PNG, puis, si une
capture dépasse encore 400 Ko, palette de 256 couleurs adaptative. Usage : python3 scripts/guide/optimiser.py"""
import glob, os, re
from PIL import Image

LIMITE = 400 * 1024
# Seules les captures de src/lib/guide/figures.ts : annonces.png et notifier.png ne sont référencées nulle part.
ids = set(re.findall(r'id: "(\w+)"', open("src/lib/guide/figures.ts", encoding="utf-8").read()))
for chemin in sorted(f"public/guide/{i}.png" for i in ids):
    avant = os.path.getsize(chemin)
    im = Image.open(chemin).convert("RGB")
    im.save(chemin, optimize=True)
    if os.path.getsize(chemin) > LIMITE:
        im.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(chemin, optimize=True)
    print(f"{os.path.basename(chemin)}: {avant // 1024} Ko -> {os.path.getsize(chemin) // 1024} Ko")
