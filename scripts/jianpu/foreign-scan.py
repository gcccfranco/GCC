#!/usr/bin/env python3
"""Cherche, sur **toutes** les rangées, celles gravées dans une autre tonalité.

`foreign_rows` (match.py, itération 21) fait déjà ce test — il balaie les
douze transpositions du vocabulaire du `.cho` et retient la rangée qui
s'apparie nettement mieux ailleurs que dans la tonalité de la page. Mais il
ne travaille que sur `crop_labels`, c'est-à-dire sur les rangées que `read()`
produit : `chords`, plus les `chords?` confirmées. Or une rangée en tonalité
étrangère est justement celle que le classifieur n'ose pas promouvoir — elle
reste en `chords?` non confirmée, en `?`, en `lyrics` ou en `numbers`, et
elle échappe au détecteur exactement là où elle est la plus régulière.

C'est ce trou qui a coûté l'itération 30 : sept rangées d'une seconde
tonalité (尽情地微笑 en fa sous un « 1=D », 我们的神 en la sous un « 1=G »)
n'ont été trouvées qu'en rendant les rangées jumelles côte à côte et en les
lisant. Le même test, appliqué à **toutes** les rangées du classifieur, les
sort mécaniquement — et donne l'intervalle en prime (+3 et +2 demi-tons).

Ce script ne modifie rien : il propose, l'œil dispose. Les rangées retenues
se recopient dans `gold/<slug>.json` sous `mask_rows` (le cadre masque, rien
ne s'écrit — voir itération 28), après contrôle sur planche.

Usage (depuis GCCLouange/) :
    python3 scripts/jianpu/foreign-scan.py            # tout le corpus
    python3 scripts/jianpu/foreign-scan.py <slug>     # un chant
    python3 scripts/jianpu/foreign-scan.py --planche  # + debug/_foreign-N.png
    python3 scripts/jianpu/foreign-scan.py --large    # seuils relâchés (revue)
"""

from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

from classify import classify  # noqa: E402
from match import (  # noqa: E402
    FOREIGN_HIT, FOREIGN_MARGIN, FOREIGN_MIN_ROW, MIN_SCORE, best_match,
    face_bank, signature, song_face, song_semitones, vocabulary, width_factor,
)
from segment import INK_THRESHOLD  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(HERE, "..", "..", "public", "jianpu")
GOLD = os.path.join(HERE, "gold")
OUT = os.path.join(HERE, "debug")


def scan(slug: str, large: bool = False) -> list[dict]:
    """`large` relâche les deux seuils de `foreign_rows`.

    Ils sont réglés pour la **publication** — une rangée écartée à tort coûte
    de la couverture. Pour une revue à l'œil c'est l'inverse : 我们高举耶稣的名
    cache trois rangées en mi et le seuil de publication n'en voyait qu'une,
    l'une ayant 3 amas (minimum 4), l'autre s'appariant à 0,67 pour une barre
    à 0,70. Deux ratés de justesse, sur une page qui écrit pourtant en toutes
    lettres « 升调用上层和弦 » — utilisez la rangée du haut pour monter d'un ton.
    """
    vocab = vocabulary(slug)
    if not vocab:
        return []
    path = os.path.join(IMAGES, f"{slug}-p1.webp")
    ink = np.asarray(Image.open(path).convert("L")) < INK_THRESHOLD
    _i, _w, feats, kinds = classify(path)

    rows = []
    for f, kind in zip(feats, kinds):
        sigs = []
        for x0, x1 in f["clusters"]:
            sub = ink[f["top"]:f["bottom"] + 1, x0:x1 + 1]
            ys, xs = np.where(sub.any(1))[0], np.where(sub.any(0))[0]
            if len(ys) and len(xs):
                sigs.append(signature(sub[ys[0]:ys[-1] + 1, xs[0]:xs[-1] + 1]))
        if len(sigs) >= (3 if large else FOREIGN_MIN_ROW):
            rows.append((f, kind, sigs))
    if not rows:
        return []

    base, face = song_semitones(slug), song_face(slug)
    every = [s for _f, _k, sigs in rows for s in sigs]
    factor = width_factor(every, face_bank(vocab, base, face))
    banks = {d: face_bank(vocab, (base + d) % 12, face) for d in range(12)}

    out = []
    for f, kind, sigs in rows:
        hits = {d: sum(1 for s in sigs if best_match(s, bank, factor)[0] >= MIN_SCORE) / len(sigs)
                for d, bank in banks.items()}
        d = max((k for k in hits if k), key=lambda k: hits[k])
        hit, margin = (0.55, 0.15) if large else (FOREIGN_HIT, FOREIGN_MARGIN)
        if hits[d] >= hit and hits[d] - hits[0] >= margin - 1e-9:
            out.append(dict(top=f["top"], height=f["height"], kind=kind,
                            clusters=f["clusters"], semitones=d,
                            page=hits[0], best=hits[d]))
    return out


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    planche = "--planche" in sys.argv
    large = "--large" in sys.argv
    chords = json.load(open(os.path.join(IMAGES, "chords.json"), encoding="utf8"))
    slugs = args or sorted(chords)

    cells, total, pages = [], 0, 0
    for slug in slugs:
        gold_path = os.path.join(GOLD, f"{slug}.json")
        gold = json.load(open(gold_path, encoding="utf8")) if os.path.exists(gold_path) else {}
        known = set(gold.get("mask_rows", []))
        # Une rangée où le calque publie déjà a été relue et retenue : ce
        # n'est pas une rangée à masquer, c'est une proposition qu'on a
        # tranchée. 握住幸福 y=722 est de celles-là — « (D  D/F#) … (G/D
        # C#m7b5) », une harmonisation alternative parenthésée dans la
        # tonalité de la page, qui s'apparie mieux à +1 par accident de
        # vocabulaire (itération 31). Sans ce filtre elle serait reproposée
        # à chaque tour.
        published = [(l["y"], l["y"] + l["h"]) for l in chords.get(slug, {}).get("labels", [])]
        found = [r for r in scan(slug, large)
                 if r["top"] not in known
                 and not any(a <= r["top"] + r["height"] and b >= r["top"] for a, b in published)]
        if not found:
            continue
        pages += 1
        gelé = " (gelé)" if gold.get("frozen_labels") else ""
        print(f"  {slug}{gelé}")
        for r in found:
            total += 1
            print(f"      y={r['top']:5d} {r['kind']:8s} {len(r['clusters']):2d} amas · "
                  f"page {r['page']:.2f} → {r['best']:.2f} à {r['semitones']:+d} demi-tons")
            if planche:
                img = Image.open(os.path.join(IMAGES, f"{slug}-p1.webp")).convert("RGB")
                c = img.crop((0, r["top"] - 3, img.width, r["top"] + r["height"] + 3))
                d = ImageDraw.Draw(c)
                for x0, x1 in r["clusters"]:
                    d.rectangle([x0, 1, x1, c.height - 2], outline=(220, 38, 38), width=2)
                if c.width > 1400:
                    c = c.resize((1400, int(c.height * 1400 / c.width)), Image.LANCZOS)
                h = Image.new("RGB", (c.width, 15), (37, 99, 235))
                ImageDraw.Draw(h).text((3, 2), f"{slug} y={r['top']} {r['semitones']:+d} demi-tons",
                                       fill=(255, 255, 255))
                cells += [h, c]

    if planche and cells:
        PER = 20
        for p in range(0, len(cells), PER * 2):
            part = cells[p:p + PER * 2]
            W = max(x.width for x in part)
            page = Image.new("RGB", (W, sum(x.height for x in part) + len(part)), "white")
            y = 0
            for x in part:
                page.paste(x, (0, y)); y += x.height + 1
            page.save(os.path.join(OUT, f"_foreign-{p // (PER * 2) + 1}.png"))
        print(f"  → debug/_foreign-1..{len(cells) // (PER * 2) + 1}.png")
    print(f"\n{total} rangée(s) en tonalité étrangère sur {pages} page(s), "
          f"hors mask_rows déjà connus")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
