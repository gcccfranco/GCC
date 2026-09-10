#!/usr/bin/env python3
"""Toutes les bandes d'encre d'une page, celles que le calque couvre et les autres.

**Une cinquième façon pour une rangée de disparaître**, et c'est la plus nue :
le découpage ne lui donne aucune bande, aucun amas, aucun verdict. Les trois
chasses de `worklist` partent toutes d'une bande (cachée, soudée, orpheline) ;
la rangée muette de l'itération 54 part du verdict du classifieur. Une rangée
que rien n'a jamais isolée échappe aux cinq — et ne pèse sur aucun
dénominateur, donc la page paraît complète sans elle.

Sur 我的生命献给你 (itération 57) il y en avait **deux**, vingt-quatre accords :
la page affichait 46 % en les ignorant. Elles ont été trouvées en lisant le
profil d'encre de la page ligne par ligne — le geste de l'itération 55 sur
我要爱慕你, fait à la main les deux fois. Ce script en fait un instrument.

Le principe ne présuppose rien : on somme l'encre par ligne, on découpe en
bandes horizontales, et l'on demande de chacune si le calque y publie une
étiquette.

**Rendre toutes les bandes nues ne sert à rien** : il y en a 2 085 sur les
112 pages certifiées, une par ligne de chiffres et par ligne de paroles, et
la rangée manquée s'y noie. On leur applique donc le test des trois chasses
de `worklist` — appariement des amas au vocabulaire du `.cho`, avec ses
seuils : une ligne de hanzi ou de chiffres n'apparie rien, une rangée
d'accords apparie massivement. Ce qui reste, l'œil le tranche sur la planche.

Passé sur les 112 pages certifiées (itération 57) : **2 bandes**, le titre
de 何等恩典 et une ligne de chiffres de 尽情的敬拜 — aucune rangée d'accords
manquée. Le test a d'abord été **fait échouer** sur 我的生命献给你 privée de
ses deux rangées : il les rend toutes les deux, et rien une fois la page
réparée. Un oracle qu'on n'a pas vu échouer ne mesure rien (itérations 54, 55).

Usage (depuis GCCLouange/) :
    python3 scripts/jianpu/bandes.py <slug>…      # planche + tableau
    python3 scripts/jianpu/bandes.py --certifiées # tout le corpus, tableau seul
    python3 scripts/jianpu/bandes.py <slug> --toutes  # sans le test du matcher

Sortie : scripts/jianpu/debug/_bandes-<slug>.png
"""

from __future__ import annotations

import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from worklist import (  # noqa: E402
    HIDDEN_COURT, HIDDEN_MIN, HIDDEN_SHARE, _Bench, _overlaps,
)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "debug")
GOLD = os.path.join(HERE, "gold")
IMAGES = os.path.join(HERE, "..", "..", "public", "jianpu")

# Une bande de moins de quatre lignes est un filet, pas une rangée.
MIN_H = 4
# Marge de recouvrement entre le `y` d'une étiquette et sa bande : le
# découpage recale parfois l'étiquette sur son bloc d'encre, quelques pixels
# au-dessus du haut de la bande.
MARGE = 8


def bandes(page: np.ndarray) -> list[tuple[int, int]]:
    """Les bandes horizontales d'encre de la page, de haut en bas."""
    prof = page.sum(1)
    out, run = [], None
    for i, v in enumerate(prof):
        if v > 0 and run is None:
            run = i
        elif v == 0 and run is not None:
            if i - run >= MIN_H:
                out.append((run, i - 1))
            run = None
    if run is not None:
        out.append((run, len(prof) - 1))
    return out


def _amas(page: np.ndarray, y0: int, y1: int) -> list[tuple[int, int]]:
    """Les colonnes d'encre de la bande, groupées en amas.

    Deux colonnes séparées de moins d'un tiers de la hauteur de bande sont le
    même signe : c'est l'écart entre le « E » et le « /G# » d'une basse, très
    au-dessous de l'espace qui sépare deux étiquettes.
    """
    cols = page[y0:y1 + 1].any(0)
    gap = max(3, (y1 - y0 + 1) // 3)
    out, run, vide = [], None, 0
    for i, v in enumerate(cols):
        if v:
            if run is None:
                run = i
            vide = 0
        elif run is not None:
            vide += 1
            if vide > gap:
                out.append((run, i - vide))
                run = None
    if run is not None:
        out.append((run, len(cols) - 1))
    return out


def nues(slug: str, entry: dict, toutes: bool = False) -> list[tuple[int, int]]:
    """Les bandes où le calque ne publie **rien**.

    Sans `toutes`, on ne garde que celles dont les amas s'apparient au
    vocabulaire du `.cho` — le test des trois chasses de `worklist`, avec ses
    seuils. C'est lui qui sépare une rangée d'accords d'une ligne de chiffres.
    """
    path = os.path.join(IMAGES, f"{slug}-p1.webp")
    page = np.asarray(Image.open(path).convert("L")) < 128
    known = entry["labels"] + ([entry["keyLabel"]] if entry.get("keyLabel") else [])
    ys = [l["y"] for l in known]
    if entry.get("titleKey"):
        ys.append(entry["titleKey"]["y"])
    vides = [b for b in bandes(page)
             if not any(b[0] - MARGE <= y <= b[1] + MARGE for y in ys)]
    if toutes:
        return vides

    b = _Bench(slug)
    out = []
    for y0, y1 in vides:
        # **La bande entière ne s'apparie pas**, et c'est la leçon de
        # `welded_rows` (itération 39) reprise ici : une bande d'accords
        # descend jusqu'au haut des chiffres de son système, si bien que
        # chaque amas porte les deux et qu'aucun gabarit ne colle. Sur
        # 我的生命献给你 la bande entière donnait 2/6 et 3/9 — sous le
        # seuil, donc invisible — et sa fenêtre haute 3/5 et 6/7.
        fin = min(y1, y0 + b.row_h - 1)
        amas = _amas(page, y0, fin)
        if len(amas) < HIDDEN_MIN:
            continue
        hits, tot = b.share(y0, fin, amas, known)
        if tot < HIDDEN_MIN:
            continue
        seuil = 1.0 if tot < HIDDEN_COURT else HIDDEN_SHARE
        if hits / tot >= seuil:
            out.append((y0, y1))
    return out


def planche(slug: str, rows: list[tuple[int, int]]) -> str:
    """Les bandes nues, l'une sous l'autre, à l'échelle de la page.

    Réduites en largeur pour tenir sur un écran, gardées à leur proportion en
    hauteur : une rangée d'accords et une ligne de paroles ne se distinguent
    pas par leur hauteur mais par ce qu'on y lit.
    """
    img = Image.open(os.path.join(IMAGES, f"{slug}-p1.webp")).convert("RGB")
    W = 1000
    cells = [((y0, y1), img.crop((0, y0, img.width, y1 + 1))
              .resize((W, max(12, int((y1 - y0 + 1) * W / img.width)))))
             for y0, y1 in rows]
    page = Image.new("RGB", (W, sum(c.height + 16 for _, c in cells) or 20), "white")
    d = ImageDraw.Draw(page)
    y = 0
    for (y0, y1), c in cells:
        d.text((4, y + 2), f"y={y0}-{y1}", fill=(200, 0, 0))
        y += 14
        page.paste(c, (0, y))
        y += c.height + 2
    os.makedirs(OUT, exist_ok=True)
    dest = os.path.join(OUT, f"_bandes-{slug}.png")
    page.save(dest)
    return dest


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    corpus = "--certifiées" in sys.argv or "--certifiees" in sys.argv
    brut = "--toutes" in sys.argv
    chords = json.load(open(os.path.join(IMAGES, "chords.json"), encoding="utf8"))
    slugs = args or (sorted(chords) if corpus else [])
    if not slugs:
        raise SystemExit("Usage: bandes.py <slug>… | --certifiées")

    total = 0
    for slug in slugs:
        entry = chords.get(slug)
        if not entry:
            print(f"  {slug:20} pas de calque", flush=True)
            continue
        rows = nues(slug, entry, brut)
        total += len(rows)
        if rows or not corpus:
            print(f"  {slug:20} {len(rows)} bande(s) nue(s) qui s'apparient : "
                  + " ".join(f"y={y0}" for y0, _ in rows), flush=True)
        if not corpus:
            print(f"    → {planche(slug, rows)}")
    if corpus:
        print(f"\n{total} bande(s) à regarder sur {len(slugs)} page(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
