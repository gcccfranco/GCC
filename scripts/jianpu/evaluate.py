#!/usr/bin/env python3
"""Compte les trois modes d'erreur de la boucle contre la vérité terrain.

Les compteurs de `match.py` disent combien d'amas passent le seuil ; ils ne
disent pas si ce qu'on y lit est juste. Ici chaque amas est confronté à
`gold/<slug>.json`, où `null` marque un amas qui n'est **pas** une étiquette
(crochet de reprise, D.S., segno, arc de liaison, 【Chorus】).

    juste      retenu, et l'accord lu est celui qui est imprimé
    FAUX       retenu, mais mal lu → on écrirait un faux accord (mode C)
    parasite   retenu alors que ce n'est pas une étiquette
    manqué     rejeté alors que c'en est une

Seul « FAUX » abîme la partition : un amas manqué laisse l'accord d'origine
en place.

Usage (depuis scripts/jianpu/) :
    python3 evaluate.py
"""

from __future__ import annotations

import glob
import json
import os
import sys

import numpy as np
from PIL import Image

from match import (
    GOLD_SET, best_match, build_templates, keep, read, signature, vocabulary,
)
from segment import INK_THRESHOLD

HERE = os.path.dirname(os.path.abspath(__file__))
GOLD = os.path.join(HERE, "gold")
IMAGES = os.path.join(HERE, "..", "..", "public", "jianpu")


def evaluate(slug: str):
    path = os.path.join(GOLD, f"{slug}.json")
    if not os.path.exists(path):
        return None
    by_top = {r["top"]: r["chords"] for r in json.load(open(path, encoding="utf8"))["chord_rows"]}

    good = wrong = parasite = missed = 0
    faults = []
    for f, row in read(slug):
        truth = by_top.get(f["top"])
        if truth is None or len(truth) != len(row):
            continue
        for (_pos, chord, score, unanimous), expected in zip(row, truth):
            kept = keep(score, unanimous)
            if expected is None:
                parasite += kept
            elif not kept:
                missed += 1
            elif chord == expected:
                good += 1
            else:
                wrong += 1
                faults.append(f"{expected}→{chord}")
    return good, wrong, parasite, missed, faults


def hand_read():
    """Second jeu : les `extra_labels`, lus au zoom un par un.

    Les `chord_rows` ci-dessus sont un échantillon *représentatif* — ils
    contiennent surtout ce que le matcher sait déjà lire. Les `extra_labels`
    sont l'inverse : ce sont précisément les étiquettes qu'il a ratées, et
    qu'un humain a dû aller chercher au zoom. Comme boîte **et** accord y
    sont connus, ils font un jeu de test gratuit et **biaisé vers les cas
    durs** — le seul endroit où un progrès de lecture se voit.

    On mesure les deux décisions séparément, parce qu'elles n'ont pas le
    même coût : *identifier* (le bon accord sort-il en tête ?) et *oser*
    (passe-t-il le seuil ?). Une étiquette bien identifiée mais sous le
    seuil est un manque, pas une faute ; une étiquette mal identifiée
    au-dessus du seuil écrirait un faux accord sur la partition.
    """
    ranked = kept = wrong_kept = 0
    total = 0
    faults = []
    for path in sorted(glob.glob(os.path.join(GOLD, "*.json"))):
        slug = os.path.basename(path)[:-5]
        gold = json.load(open(path, encoding="utf8"))
        labels = gold.get("extra_labels")
        image = os.path.join(IMAGES, f"{slug}-p1.webp")
        if not labels or not os.path.exists(image):
            continue
        ink = np.asarray(Image.open(image).convert("L")) < INK_THRESHOLD
        templates = build_templates(vocabulary(slug))
        for l in labels:
            sub = ink[l["y"] : l["y"] + l["h"], l["x"] : l["x"] + l["w"]]
            ys, xs = np.where(sub.any(1))[0], np.where(sub.any(0))[0]
            if not len(ys) or not len(xs):
                continue
            total += 1
            score, chord = best_match(signature(sub[ys[0] : ys[-1] + 1, xs[0] : xs[-1] + 1]),
                                      templates)
            right = chord == l["c"]
            ranked += right
            if keep(score, True):
                kept += right
                if not right:
                    wrong_kept += 1
                    faults.append(f"{l['c']}→{chord}")
    return total, ranked, kept, wrong_kept, faults


def main() -> int:
    totals = [0, 0, 0, 0]
    all_faults: list[str] = []
    for slug in GOLD_SET:
        res = evaluate(slug)
        if res is None:
            print(f"  {slug:16} pas de vérité terrain")
            continue
        good, wrong, parasite, missed, faults = res
        for i, v in enumerate((good, wrong, parasite, missed)):
            totals[i] += v
        all_faults += faults
        print(f"  {slug:16} juste={good:3}  FAUX={wrong:2}  parasite={parasite:2}  manqué={missed:3}"
              + ("   " + " ".join(sorted(set(faults))) if faults else ""))
    good, wrong, parasite, missed = totals
    print(f"\n  total  juste={good}  FAUX={wrong}  parasite={parasite}  manqué={missed}"
          f"   ({good}/{good + wrong + missed} étiquettes lues juste)")

    total, ranked, kept, wrong_kept, faults = hand_read()
    print(f"\n  étiquettes lues à la main ({total}, les cas durs) :"
          f"  identifiées={ranked}  retenues={kept}  FAUX retenus={wrong_kept}"
          + ("   " + " ".join(sorted(set(faults))) if faults else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
