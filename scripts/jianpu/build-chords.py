#!/usr/bin/env python3
"""Émet les coordonnées des étiquettes d'accords pour le calque client.

Le calque ne peut pas être un PNG pré-rendu : 124 chants × 12 tonalités,
c'est intenable. On garde donc **une seule image** et on publie les
*coordonnées* de chaque étiquette avec l'accord qu'elle porte. Le
navigateur masque et réécrit à la volée, en réutilisant `transposeChord`
déjà présent dans l'application.

Source des accords : `gold/<slug>.json`, la vérité terrain lue à l'œil.
Tant que la reconnaissance automatique n'est pas prête, seuls les chants
qui ont un fichier gold obtiennent un calque — les autres continuent
d'afficher le scan brut.

Usage (depuis GCCLouange/) :
    python3 scripts/jianpu/build-chords.py

Sortie : public/jianpu/chords.json
"""

from __future__ import annotations

import glob
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from classify import classify  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(HERE, "..", "..", "public", "jianpu")
GOLD = os.path.join(HERE, "gold")


def build(slug: str, gold: dict):
    path = os.path.join(IMAGES, f"{slug}-p1.webp")
    if not os.path.exists(path):
        return None, f"image absente"

    _ink, width, feats, kinds = classify(path)
    by_top = {r["top"]: r["chords"] for r in gold["chord_rows"]}

    labels = []
    for f, kind in zip(feats, kinds):
        if kind != "chords":
            continue
        chords = by_top.get(f["top"])
        # L'oracle : on ne publie une rangée que si le nombre d'étiquettes
        # détectées correspond exactement à la vérité terrain. Un écart
        # signifie qu'on placerait les accords les uns sur les autres.
        if not chords or len(chords) != f["n_clusters"]:
            continue
        for (x0, x1), chord in zip(f["clusters"], chords):
            labels.append({
                "x": x0,
                "y": f["top"],
                "w": x1 - x0 + 1,
                "h": f["bottom"] - f["top"] + 1,
                "c": chord,
            })

    expected = sum(len(c) for c in by_top.values())
    if not labels:
        return None, "aucune rangée alignée"
    from PIL import Image

    with Image.open(path) as im:
        w, h = im.size

    # Une seule taille de texte pour tout le chant. La hauteur de bande
    # varie selon les glyphes présents (une rangée sans jambage est
    # détectée plus fine), donc la prendre par rangée donnait des accords
    # de tailles différentes sur la même page.
    heights = sorted(l["h"] for l in labels)
    label_h = heights[len(heights) // 2]

    entry = {
        "printedKey": gold["printed_key"],
        "w": w,
        "h": h,
        "labelH": label_h,
        "labels": labels,
    }
    if gold.get("key_label"):
        entry["keyLabel"] = gold["key_label"]
    return entry, f"{len(labels)}/{expected} étiquettes, hauteur {label_h}px"


def main() -> int:
    out = {}
    for gold_path in sorted(glob.glob(os.path.join(GOLD, "*.json"))):
        slug = os.path.splitext(os.path.basename(gold_path))[0]
        gold = json.load(open(gold_path, encoding="utf8"))
        entry, note = build(slug, gold)
        print(f"  {slug:16} {note}")
        if entry:
            out[slug] = entry

    dest = os.path.join(IMAGES, "chords.json")
    with open(dest, "w", encoding="utf8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=0, sort_keys=True)
    print(f"✓ {len(out)} chant(s) avec calque → public/jianpu/chords.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
