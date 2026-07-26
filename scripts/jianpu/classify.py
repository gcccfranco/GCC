#!/usr/bin/env python3
"""Classification des rangées d'une partition 简谱.

Trois natures : `lyrics` (hanzi), `numbers` (chiffres + ligatures),
`chords` (étiquettes latines). La difficulté est que les signatures
brutes (densité, hauteur, nombre d'amas) ne se transposent pas d'une
gravure à l'autre : elles dépendent de la longueur des noms d'accords.

D'où un classement par géométrie invariante plutôt que par seuils
absolus :

- **paroles** : les hanzi sont des carrés pleins, donc la largeur médiane
  des amas vaut à peu près la hauteur de la rangée, et ils sont nombreux ;
- **chiffres** : portent les ligatures, d'où un très long segment continu
  d'encre rapporté à la largeur de la page ;
- **accords** : la rangée qui précède immédiatement une rangée de chiffres
  sans être des paroles. C'est une définition positionnelle, pas
  métrique — c'est justement ce qui la rend portable.
"""

import json
import os

import numpy as np

from segment import column_clusters, rows, thicken

HERE = os.path.dirname(os.path.abspath(__file__))
PARAMS_PATH = os.path.join(HERE, "classifier.json")

# Seuils mesurés sur la vérité terrain (voir LOOP.md, itération 1).
# Sur 何等恩典 : chiffres ratio 0,24-0,32 · paroles 0,97-1,00 · accords 1,04-1,92,
# et run_frac accords 0,009 contre 0,036-0,068 pour les chiffres.
DEFAULTS = {
    # chiffres : amas étroits devant une rangée haute (les chiffres sont
    # espacés et la rangée porte les ligatures)
    "numbers_ratio_max": 0.50,
    # paroles : les hanzi sont des carrés pleins, ratio ~1 et nombreux
    "lyric_ratio_min": 0.85,
    "lyric_ratio_max": 1.15,
    "lyric_min_clusters": 12,
    # accords : aucun long segment continu (pas de ligature)
    "chord_max_run_frac": 0.015,
    # une rangée d'accords reste fine devant la rangée de chiffres
    "chord_max_height_frac": 0.85,
    # un trait isolé (barre, ligature orpheline) n'est pas une rangée
    "min_row_height": 10,
}


def load_params():
    if os.path.exists(PARAMS_PATH):
        with open(PARAMS_PATH, encoding="utf8") as fh:
            return {**DEFAULTS, **json.load(fh)}
    return dict(DEFAULTS)


def _longest_run(ink, top, bottom):
    best = 0
    for y in range(top, bottom + 1):
        run = 0
        for v in ink[y]:
            run = run + 1 if v else 0
            if run > best:
                best = run
    return best


def row_features(ink, width, top, bottom):
    """Toutes les mesures se font sur l'encre épaisse (voir `thicken`) :
    les arcs de liaison sont fins et fausseraient aussi bien le comptage
    des étiquettes que la détection de ligature."""
    clusters = column_clusters(ink, top, bottom)
    widths = np.array([c[1] - c[0] + 1 for c in clusters]) if clusters else np.array([0])
    height = bottom - top + 1
    return {
        "top": top,
        "bottom": bottom,
        "height": height,
        "n_clusters": len(clusters),
        "w_median": float(np.median(widths)),
        "ratio": float(np.median(widths)) / max(height, 1),
        "run_frac": _longest_run(ink, top, bottom) / width,
        "clusters": clusters,
    }


def classify(path, params=None):
    p = params or load_params()
    _a, ink, width, rr = rows(path)
    solid = thicken(ink, p.get("thicken_k", 3))
    feats = [row_features(solid, width, t, b) for (t, b) in rr]

    kinds = []
    for f in feats:
        if f["height"] < p["min_row_height"]:
            kinds.append("noise")
        elif f["ratio"] <= p["numbers_ratio_max"]:
            kinds.append("numbers")
        elif (
            p["lyric_ratio_min"] <= f["ratio"] <= p["lyric_ratio_max"]
            and f["n_clusters"] >= p["lyric_min_clusters"]
        ):
            kinds.append("lyrics")
        else:
            kinds.append("?")

    # Accords : la rangée utile qui précède une rangée de chiffres, sans
    # ligature et nettement plus fine qu'elle.
    for i, kind in enumerate(kinds):
        if kind != "numbers":
            continue
        j = i - 1
        while j >= 0 and kinds[j] == "noise":
            j -= 1
        if j >= 0 and kinds[j] == "?":
            if (
                feats[j]["run_frac"] <= p["chord_max_run_frac"]
                and feats[j]["height"] <= p["chord_max_height_frac"] * feats[i]["height"]
            ):
                kinds[j] = "chords"

    return ink, width, feats, kinds
