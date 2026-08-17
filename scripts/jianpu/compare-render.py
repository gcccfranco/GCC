#!/usr/bin/env python3
"""Contrôle du calque par transposition : original au-dessus, transposé dessous.

L'idée est de l'utilisateur et elle vaut mieux que n'importe quel compteur.
On rend la partition **transposée d'un demi-ton**, tonalité dans laquelle
*aucun* accord ne garde son nom. Deux erreurs deviennent alors visibles d'un
coup d'œil, sans rien connaître de la musique :

- **un accord qui n'a pas changé n'a pas été trouvé.** C'est le cas grave :
  sur une page transposée il reste écrit dans l'ancienne tonalité, à côté
  d'accords transposés — la page mélange deux tonalités, ce qui est pire que
  de n'avoir aucun calque.
- **un accord qui a changé pour autre chose que son transposé** est une
  mauvaise lecture. On le voit en lisant la ligne du haut.

Seules les bandes qui portent des accords sont montrées, empilées deux par
deux, pour que l'œil compare sans faire défiler la page.

Usage (depuis scripts/jianpu/) :
    python3 compare-render.py 全然向你

Sortie : scripts/jianpu/debug/_compare-<slug>.png
"""

from __future__ import annotations

import json
import os
import sys

from PIL import Image, ImageDraw

from classify import classify, load_params
from overlay import note_index, render

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(HERE, "..", "..", "public", "jianpu")
OUT = os.path.join(HERE, "debug")

STRIP_W = 1500
# On remonte au-dessus de la bande d'accords et on descend jusque dans les
# chiffres : c'est le seul moyen de voir qu'une étiquette est bien posée
# au-dessus de sa note, et pas décalée.
PAD_TOP = 14
PAD_BOTTOM = 40


def sheet(slug: str) -> str:
    data = json.load(open(os.path.join(IMAGES, "chords.json"), encoding="utf8"))
    entry = data.get(slug)
    if not entry:
        raise SystemExit(f"pas de calque pour {slug} — lancer build-chords.py")

    target = _half_step(entry["printedKey"])
    render(slug, target)
    raw = Image.open(os.path.join(IMAGES, f"{slug}-p1.webp")).convert("RGB")
    moved = Image.open(os.path.join(OUT, f"{slug}-{target}.png")).convert("RGB")

    bands = _bands(slug, entry)
    strips = []
    for top, bottom in bands:
        for image in (raw, moved):
            crop = image.crop((0, max(0, top - PAD_TOP), image.width, bottom + PAD_BOTTOM))
            scale = STRIP_W / crop.width
            strips.append(crop.resize((STRIP_W, max(1, int(crop.height * scale))), Image.LANCZOS))

    height = sum(s.height for s in strips) + 26 * len(bands) + 20
    out = Image.new("RGB", (STRIP_W + 20, height), "white")
    dr = ImageDraw.Draw(out)
    y = 10
    for i, (top, _bottom) in enumerate(bands):
        dr.rectangle([6, y, STRIP_W + 14, y + 20], fill=(37, 99, 235))
        dr.text((12, y + 5), f"y={top}   HAUT = {entry['printedKey']} imprime   BAS = {target} transpose"
                             "   tout accord identique en haut et en bas est un accord MANQUE",
                fill=(255, 255, 255))
        y += 26
        for strip in strips[2 * i : 2 * i + 2]:
            out.paste(strip, (10, y))
            y += strip.height
        dr.line([10, y - 1, STRIP_W + 10, y - 1], fill=(200, 200, 200))

    os.makedirs(OUT, exist_ok=True)
    dest = os.path.join(OUT, f"_compare-{slug}.png")
    out.save(dest)
    print(f"  compare → debug/_compare-{slug}.png   {len(bands)} bande(s), "
          f"{entry['printedKey']} → {target}")
    return dest


SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def _half_step(key: str) -> str:
    return SHARP[(note_index(key) + 1) % 12]


def _bands(slug: str, entry: dict) -> list[tuple[int, int]]:
    """Toutes les rangées susceptibles de porter des accords.

    Pas seulement celles où le calque a posé quelque chose : une rangée que
    le classifieur a laissée en « ? » juste au-dessus des chiffres est
    justement celle qu'il faut montrer, puisque c'est là que se cachent les
    accords entièrement manqués.

    Et pas seulement celles du classifieur : depuis le repêchage hors
    rangées (itération 10), le calque pose des accords là où le classifieur
    n'a rien vu. Toute rangée où `chords.json` publie une étiquette doit
    passer sous l'œil, sinon les repêchées échappent au contrôle.
    """
    _ink, _w, feats, kinds = classify(os.path.join(IMAGES, f"{slug}-p1.webp"))
    page_h = max(f["bottom"] for f in feats) if feats else 0
    floor = load_params()["min_top_frac"] * page_h
    out = []
    for i, (f, kind) in enumerate(zip(feats, kinds)):
        if kind in ("chords", "chords?"):
            out.append((f["top"], f["bottom"]))
        elif kind == "?" and f["top"] >= floor:
            j = i + 1
            while j < len(kinds) and kinds[j] == "noise":
                j += 1
            if j < len(kinds) and kinds[j] == "numbers":
                out.append((f["top"], f["bottom"]))
    for l in entry["labels"]:
        out.append((l["y"], l["y"] + l["h"] - 1))
    out.sort()
    merged: list[tuple[int, int]] = []
    for top, bottom in out:
        if merged and top <= merged[-1][1] + 4:
            merged[-1] = (merged[-1][0], max(merged[-1][1], bottom))
        else:
            merged.append((top, bottom))
    return merged


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("Usage: compare-render.py <slug>")
    sheet(sys.argv[1])
