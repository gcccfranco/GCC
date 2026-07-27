#!/usr/bin/env python3
"""Planche de contrôle de la LECTURE des étiquettes.

`debug-render.py` montre où le classifieur croit voir des accords ;
celle-ci montre **ce qu'il y lit**. Chaque amas détecté est agrandi et
porte, dessous, l'accord retenu et son score — en vert s'il passe le seuil,
en rouge s'il est rejeté.

C'est le seul endroit où l'on voit d'un coup les trois choses que les
compteurs mélangent : une étiquette bien lue, une étiquette mal lue mais
gardée (le vrai danger : on écrirait un faux accord sur la partition), et un
amas parasite correctement rejeté.

Usage (depuis scripts/jianpu/) :
    python3 read-render.py                 # le jeu de contrôle
    python3 read-render.py 爱赢了           # des chants précis

Sortie : scripts/jianpu/debug/_lecture.png
"""

from __future__ import annotations

import os
import sys

import numpy as np
from PIL import Image, ImageDraw

from match import GOLD_SET, keep, read

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "debug")

WIDTH = 1600
CELL_H = 44
GUTTER = 110
KEPT = (0, 120, 0)
DROPPED = (200, 0, 0)


def sheet(slugs: list[str]) -> str:
    tiles = []
    for slug in slugs:
        for f, row in read(slug):
            tiles.append((slug, f, row))

    height = sum(CELL_H + 34 for _s, _f, _r in tiles) + 20
    out = Image.new("RGB", (WIDTH, height), "white")
    dr = ImageDraw.Draw(out)
    y = 10
    kept = total = 0
    for slug, f, row in tiles:
        dr.text((6, y + 14), f"{slug} y={f['top']}", fill=(120, 120, 120))
        x = GUTTER
        for (x0, x1), chord, score, unanimous in row:
            total += 1
            if keep(score, unanimous):
                kept += 1
            tile = _tile(slug, f, x0, x1)
            if x + tile.width + 70 > WIDTH:
                break
            out.paste(tile, (x, y))
            color = KEPT if keep(score, unanimous) else DROPPED
            mark = "" if unanimous else " !"
            dr.text((x, y + CELL_H + 2), f"{chord} {score:+.2f}{mark}", fill=color)
            x += tile.width + 22
        y += CELL_H + 34

    os.makedirs(OUT, exist_ok=True)
    dest = os.path.join(OUT, "_lecture.png")
    out.save(dest)
    print(f"\n  lecture → debug/_lecture.png   {kept}/{total} amas retenus")
    return dest


_PAGES: dict[str, np.ndarray] = {}


def _page(slug: str) -> np.ndarray:
    from segment import INK_THRESHOLD

    if slug not in _PAGES:
        path = os.path.join(HERE, "..", "..", "public", "jianpu", f"{slug}-p1.webp")
        _PAGES[slug] = np.asarray(Image.open(path).convert("L")) < INK_THRESHOLD
    return _PAGES[slug]


def _tile(slug: str, f, x0: int, x1: int) -> Image.Image:
    sub = _page(slug)[f["top"] : f["bottom"] + 1, x0 : x1 + 1]
    im = Image.fromarray((~sub * 255).astype(np.uint8)).convert("RGB")
    scale = CELL_H / im.height
    return im.resize((max(8, int(im.width * scale)), CELL_H), Image.LANCZOS)


if __name__ == "__main__":
    sheet(sys.argv[1:] or GOLD_SET)
