#!/usr/bin/env python3
"""Rend la classification des rangées en images annotées, pour contrôle à l'œil.

Sans ça, la boucle ne produit que des nombres — impossible de la
contredire. Ici chaque rangée détectée est encadrée dans sa couleur, et
chaque étiquette d'accord est entourée individuellement : on voit d'un
coup ce qui est trouvé, ce qui est raté et ce qui est inventé.

    bleu    accords   (avec un cadre fin par étiquette)
    rouge   chiffres
    vert    paroles
    gris    non classé

Usage (depuis scripts/jianpu/) :
    python3 debug-render.py                 # le jeu de contrôle
    python3 debug-render.py 何等恩典 爱赢了   # des chants précis

Sortie : scripts/jianpu/debug/<slug>.png
"""

from __future__ import annotations

import os
import sys

from PIL import Image, ImageDraw

from classify import classify

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(HERE, "..", "..", "public", "jianpu")
OUT = os.path.join(HERE, "debug")

GOLD = [
    "何等恩典",
    "齐来赞美",
    "主的喜乐是我力量",
    "我心坚定与你",
    "爱赢了",
    "献上尊荣",
    "你们要赞美耶和华",
]

COLORS = {
    "chords": (37, 99, 235),
    "numbers": (185, 28, 28),
    "lyrics": (22, 128, 60),
    "?": (150, 150, 150),
    "noise": (220, 220, 220),
}


def render(slug: str) -> str | None:
    path = os.path.join(IMAGES, f"{slug}-p1.webp")
    if not os.path.exists(path):
        print(f"  ABSENT {slug}")
        return None

    _ink, width, feats, kinds = classify(path)
    im = Image.open(path).convert("RGB")
    dr = ImageDraw.Draw(im)

    counts: dict[str, int] = {}
    for f, kind in zip(feats, kinds):
        counts[kind] = counts.get(kind, 0) + 1
        color = COLORS.get(kind, (0, 0, 0))
        dr.rectangle([2, f["top"], width - 3, f["bottom"]], outline=color, width=2)
        dr.text((6, max(0, f["top"] - 12)), kind, fill=color)
        if kind == "chords":
            for x0, x1 in f["clusters"]:
                dr.rectangle([x0 - 2, f["top"] - 2, x1 + 2, f["bottom"] + 2], outline=color, width=1)

    os.makedirs(OUT, exist_ok=True)
    dest = os.path.join(OUT, f"{slug}.png")
    im.save(dest)
    labels = sum(f["n_clusters"] for f, k in zip(feats, kinds) if k == "chords")
    print(f"  {slug:16} accords={counts.get('chords', 0):2} étiquettes={labels:3} → debug/{slug}.png")
    return dest


if __name__ == "__main__":
    for name in sys.argv[1:] or GOLD:
        render(name)
