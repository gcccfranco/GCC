#!/usr/bin/env python3
"""Pose les accords transposés par-dessus une partition 简谱.

Les chiffres ne bougent jamais : le 简谱 est invariant par transposition,
seuls le libellé `1=X` et les accords changent. On efface donc uniquement
les étiquettes d'accords détectées et on les redessine dans la tonalité
cible, à la même position.

Usage (depuis scripts/jianpu/) :
    python3 overlay.py 何等恩典 A       # rendu en La
    python3 overlay.py 何等恩典 A --diag  # + cadres de contrôle

Sortie : scripts/jianpu/debug/<slug>-<tonalite>.png
"""

from __future__ import annotations

import json
import os
import re
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(HERE, "..", "..", "public", "jianpu")
OUT = os.path.join(HERE, "debug")

SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
# tonalités qui s'écrivent avec des bémols
FLAT_KEYS = {"F", "Bb", "Eb", "Ab", "Db", "Gb", "Dm", "Gm", "Cm", "Fm", "Bbm"}

FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
    "/System/Library/Fonts/Supplemental/Georgia.ttf",
    "/Library/Fonts/Times New Roman.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
]


def load_font(size: int):
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def note_index(note: str) -> int:
    for table in (SHARP, FLAT):
        if note in table:
            return table.index(note)
    raise ValueError(f"note inconnue : {note}")


def transpose_note(note: str, semitones: int, target_key: str) -> str:
    table = FLAT if target_key in FLAT_KEYS else SHARP
    return table[(note_index(note) + semitones) % 12]


CHORD_RE = re.compile(r"^([A-G][#b]?)(.*)$")


def transpose_chord(chord: str, semitones: int, target_key: str) -> str:
    # Accord entre parenthèses (optionnel sur la gravure) : transposer le
    # contenu, garder les parenthèses — même comportement que le client
    # (`transposeChord`, src/lib/transpose.ts).
    if chord.startswith("(") and chord.endswith(")"):
        return "(" + transpose_chord(chord[1:-1], semitones, target_key) + ")"
    if "/" in chord:
        left, right = chord.split("/", 1)
        return f"{transpose_chord(left, semitones, target_key)}/{transpose_note(right, semitones, target_key)}"
    m = CHORD_RE.match(chord)
    if not m:
        return chord
    root, suffix = m.groups()
    return transpose_note(root, semitones, target_key) + suffix


def render(slug: str, target_key: str, diag: bool = False) -> str:
    """Rend le calque **tel que le client le rendra**.

    La source est `public/jianpu/chords.json`, pas la vérité terrain : c'est
    exactement ce que le navigateur reçoit, donc le seul contrôle qui dise
    quelque chose sur ce que verra l'utilisateur.
    """
    data = json.load(open(os.path.join(IMAGES, "chords.json"), encoding="utf8"))
    entry = data.get(slug)
    if not entry:
        raise SystemExit(f"pas de calque pour {slug} — lancer build-chords.py")
    semitones = (note_index(target_key) - note_index(entry["printedKey"])) % 12

    path = os.path.join(IMAGES, f"{slug}-p1.webp")
    im = Image.open(path).convert("RGB")
    dr = ImageDraw.Draw(im)

    # La taille PIL est un cadratin : la hauteur de capitale n'en fait
    # qu'environ 70 %. Pour retrouver l'oeil de l'original il faut donc
    # demander nettement plus que la hauteur de rangée.
    font = load_font(int(entry["labelH"] * 1.35))
    for label in entry["labels"]:
        x0, y0 = label["x"], label["y"]
        x1, y1 = x0 + label["w"] - 1, y0 + label["h"] - 1
        # Efface l'étiquette d'origine. On monte plus haut qu'on ne
        # descend : les dièses et les exposants (maj7, add2) dépassent
        # par le haut, alors que sous la rangée commencent les chiffres.
        dr.rectangle([x0 - 3, y0 - 9, x1 + 4, y1 + 2], fill=(255, 255, 255))
        # Calage sur la ligne de base, pas sur le haut du cadre.
        dr.text(
            (x0, y1),
            transpose_chord(label["c"], semitones, target_key),
            font=font,
            fill=(0, 0, 0),
            anchor="ls",
        )
        if diag:
            dr.rectangle([x0 - 3, y0 - 3, x1 + 3, y1 + 3], outline=(37, 99, 235), width=1)

    # Le libellé « 1=X » suit la transposition, comme chez le client
    # (JianpuSheet). Sans lui, le rendu de contrôle validait les accords
    # mais laissait le cadre du libellé invisible — on ne pouvait pas voir
    # un cadre mal mesuré avant le navigateur.
    kl = entry.get("keyLabel")
    if kl:
        x0, y0 = kl["x"], kl["y"]
        x1, y1 = x0 + kl["w"] - 1, y0 + kl["h"] - 1
        dr.rectangle([x0 - 3, y0 - 4, x1 + 4, y1 + 2], fill=(255, 255, 255))
        dr.text((x0, y1), f"1={target_key}",
                font=load_font(int(kl["h"] * 1.1)), fill=(0, 0, 0), anchor="ls")
        if diag:
            dr.rectangle([x0 - 3, y0 - 4, x1 + 4, y1 + 2], outline=(220, 38, 38), width=1)

    os.makedirs(OUT, exist_ok=True)
    dest = os.path.join(OUT, f"{slug}-{target_key}.png")
    im.save(dest)
    print(f"  {slug} : {entry['printedKey']} → {target_key} ({semitones:+d} demi-tons) · "
          f"{len(entry['labels'])} accords posés → debug/{os.path.basename(dest)}")
    return dest


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) < 2:
        raise SystemExit("Usage: overlay.py <slug> <tonalité cible> [--diag]")
    render(args[0], args[1], diag="--diag" in sys.argv)
