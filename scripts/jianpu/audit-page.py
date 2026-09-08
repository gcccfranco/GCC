#!/usr/bin/env python3
"""Relit la page **entière**, original au-dessus, calque transposé dessous.

`compare-render.py` ne montre que les bandes où le calque publie ou bien
où le classifieur a hésité — il *ment donc par omission*, et c'est
exactement ce qui a laissé passer un système entier resté en D sur
不停赞美 (itération 13) : sa rangée d'accords était typée `numbers`, donc
absente des bandes. Seule la capture navigateur l'avait vu, parce qu'elle
montrait la page en entier.

Ce script rend la même chose sans navigateur. Il découpe la page en
tranches qui se recouvrent, et pose sous chacune la même tranche du rendu
fidèle transposé, **cadres de contrôle activés**. Deux erreurs se lisent
alors d'un coup d'œil, sur toute la page et pas seulement là où l'on
croyait qu'il y avait des accords :

- **un accord sans cadre** est un accord que le calque n'a pas vu. Sur la
  page transposée il reste écrit dans l'ancienne tonalité — c'est le mode
  D, le plus grave, et celui qu'aucun compteur n'attrape puisqu'une rangée
  jamais détectée n'entre dans aucun dénominateur.
- **un accord dont le bas ne correspond pas au transposé du haut** est une
  mauvaise lecture (mode C). L'alignement vertical des deux tranches rend
  la comparaison mécanique : aucune connaissance musicale nécessaire.

La tonalité cible est par défaut le demi-ton au-dessus, celle où *aucun*
accord ne garde son nom.

**Les suspects sont encadrés en rouge sur l'original** (itération 37). Un
« accord sans cadre » est mécanique : c'est un amas d'encre d'une rangée
d'accords que `chords.json` ne couvre pas, et `worklist.suspects` sait le
calculer. L'œil n'a donc plus à chercher le mode D — il a à le *trancher*,
sur des boîtes déjà posées. Les boîtes ne disent rien du mode C, et c'est
pourquoi la page entière reste rendue par défaut : une lecture fausse mais
couverte n'a pas de suspect, seule la comparaison haut/bas la montre.

`--suspects` ne rend que les tranches qui en portent une, et **nomme les
autres comme non auditées**. Ce mode voit le mode D et ne voit pas le mode
C : il sert à revenir sur une page déjà auditée, jamais à la certifier.

Usage (depuis scripts/jianpu/) :
    python3 audit-page.py 把冷漠变成爱             # D → D#, page entière
    python3 audit-page.py 把冷漠变成爱 F           # tonalité imposée
    python3 audit-page.py 把冷漠变成爱 --suspects  # seulement les tranches à suspect

Sortie : scripts/jianpu/debug/_audit-<slug>-<n>.png
"""

from __future__ import annotations

import glob
import json
import os
import sys

from PIL import Image, ImageDraw

from overlay import note_index, render
from worklist import suspects

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(HERE, "..", "..", "public", "jianpu")
GOLD = os.path.join(HERE, "gold")
OUT = os.path.join(HERE, "debug")

SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

# Hauteur de page couverte par tranche. Empilée avec sa jumelle, une
# tranche de 300 px donne une planche d'environ 700 px de haut pour
# 1400 de large : les étiquettes y restent à leur taille d'origine, donc
# lisibles. Plus haut, la planche est réduite à l'affichage et les
# étiquettes deviennent illisibles — c'est-à-dire que le contrôle ne
# contrôle plus rien.
SLICE_H = 300
# Recouvrement : une étiquette coupée en deux par une frontière de
# tranche ne doit pas pouvoir échapper à la relecture.
OVERLAP = 40
BAR_H = 22


def audit(slug: str, target: str | None = None, only_suspects: bool = False) -> list[str]:
    data = json.load(open(os.path.join(IMAGES, "chords.json"), encoding="utf8"))
    entry = data.get(slug)
    if not entry:
        raise SystemExit(f"pas de calque pour {slug} — lancer build-chords.py")
    target = target or SHARP[(note_index(entry["printedKey"]) + 1) % 12]

    gold_path = os.path.join(GOLD, f"{slug}.json")
    gold = json.load(open(gold_path, encoding="utf8")) if os.path.exists(gold_path) else {}
    boxes = suspects(slug, entry, gold)

    render(slug, target, diag=True)
    raw = Image.open(os.path.join(IMAGES, f"{slug}-p1.webp")).convert("RGB")
    moved = Image.open(os.path.join(OUT, f"{slug}-{target}.png")).convert("RGB")

    for old in glob.glob(os.path.join(OUT, f"_audit-{slug}-*.png")):
        os.remove(old)

    dests = []
    skipped = []
    n = 0
    top = 0
    while top < raw.height:
        bottom = min(raw.height, top + SLICE_H)
        n += 1
        here = [b for b in boxes if b[1] < bottom and b[3] >= top]
        if only_suspects and not here:
            skipped.append(n)
            top = bottom - OVERLAP if bottom < raw.height else bottom
            continue
        a = raw.crop((0, top, raw.width, bottom))
        b = moved.crop((0, top, moved.width, bottom))
        da = ImageDraw.Draw(a)
        for x0, y0, x1, y1 in here:
            da.rectangle([x0 - 3, y0 - top - 3, x1 + 3, y1 - top + 3],
                         outline=(220, 0, 0), width=2)
        page = Image.new("RGB", (raw.width, a.height + b.height + 2 * BAR_H), "white")
        dr = ImageDraw.Draw(page)
        dr.rectangle([0, 0, raw.width, BAR_H - 1], fill=(30, 30, 30))
        dr.text((8, 6), f"{slug}  y={top}-{bottom}   ORIGINAL  1={entry['printedKey']}"
                + (f"   {len(here)} SUSPECT(S) en rouge" if here else ""),
                fill=(255, 255, 255))
        page.paste(a, (0, BAR_H))
        y = BAR_H + a.height
        dr.rectangle([0, y, raw.width, y + BAR_H - 1], fill=(37, 99, 235))
        dr.text((8, y + 6), f"CALQUE  1={target}   un accord SANS CADRE n'est pas converti",
                fill=(255, 255, 255))
        page.paste(b, (0, y + BAR_H))

        dest = os.path.join(OUT, f"_audit-{slug}-{n}.png")
        page.save(dest)
        dests.append(dest)
        top = bottom - OVERLAP if bottom < raw.height else bottom

    scope = (f"{len(dests)} tranche(s) sur {n} — non auditées : "
             + ", ".join(map(str, skipped))) if only_suspects else f"page entière ({raw.height} px)"
    print(f"  audit → debug/_audit-{slug}-*.png   {entry['printedKey']} → {target}, "
          f"{scope}   {len(boxes)} suspect(s)")
    return dests


if __name__ == "__main__":
    args = sys.argv[1:]
    only = "--suspects" in args
    args = [a for a in args if a != "--suspects"]
    if not args:
        raise SystemExit("Usage: audit-page.py <slug> [tonalité cible] [--suspects]")
    audit(args[0], args[1] if len(args) > 1 else None, only)
