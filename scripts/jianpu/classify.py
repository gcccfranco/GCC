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
# Sur 何等恩典 : chiffres ratio 0,24-0,32 · paroles 0,97-1,00 · accords 1,04-1,92.
DEFAULTS = {
    # chiffres : amas étroits devant une rangée haute (les chiffres sont
    # espacés et la rangée porte les ligatures)
    "numbers_ratio_max": 0.50,
    # paroles : les hanzi sont des carrés pleins, ratio ~1 et nombreux
    "lyric_ratio_min": 0.85,
    "lyric_ratio_max": 1.15,
    "lyric_min_clusters": 12,
    # un trait isolé (barre, ligature orpheline) n'est pas une rangée
    "min_row_height": 10,
    # deux rangées de chiffres qui se suivent : si la première est plus
    # basse que cette part de la seconde, c'est une rangée d'accords courts
    "short_row_frac": 0.60,
    # Aucun système ne commence dans le bandeau de titre : tout candidat
    # accords situé dans le haut de page est une ligne de métadonnées
    # (titre, album, tempo, crédits). Invariant de gravure, pas un seuil
    # calé sur un fichier.
    "min_top_frac": 0.08,
}


def load_params():
    if os.path.exists(PARAMS_PATH):
        with open(PARAMS_PATH, encoding="utf8") as fh:
            return {**DEFAULTS, **json.load(fh)}
    return dict(DEFAULTS)


def row_features(ink, width, top, bottom):
    """Toutes les mesures se font sur l'encre épaisse (voir `thicken`) :
    les arcs de liaison sont fins et fausseraient le comptage des
    étiquettes."""
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
        "clusters": clusters,
    }


def classify(path, params=None):
    p = params or load_params()
    a, ink, width, rr = rows(path)
    page_h = a.shape[0]
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

    # Accords : la rangée utile qui précède une rangée de chiffres, hors du
    # bandeau de titre. Rien de plus.
    #
    # Deux tests supplémentaires filtraient ici — « pas de long segment
    # continu » et « nettement plus fine que la rangée de chiffres ». Ils
    # rejetaient **172 vraies rangées d'accords** sur le corpus (90 par la
    # hauteur, 60 par le segment, 22 par les deux) : un crochet de reprise
    # est un long segment, et une rangée de chiffres sans point d'octave est
    # basse. Ils ont été retirés à l'itération 7, parce que la précision ne
    # vient plus d'ici : depuis que `match.py` lit les étiquettes, une
    # rangée qui n'en est pas produit des amas que rien n'apparie. Le
    # classifieur propose, le matcher dispose.
    #
    # Une rangée d'accords **courts** (« C », « F ») est prise pour des
    # chiffres : ses amas sont étroits devant la hauteur de rangée, donc son
    # ratio passe sous `numbers_ratio_max`. Elle devenait alors invisible à
    # la fois à la promotion et au contrôle de complétude — c'est ainsi que
    # 齐来赞美 a été publié en mélangeant deux tonalités (itération 8). Une
    # vraie rangée de chiffres est haute : elle porte les points d'octave et
    # les ligatures. Deux rangées de chiffres qui se suivent, dont la
    # première est nettement plus basse, sont donc des accords puis des
    # chiffres.
    for i, kind in enumerate(kinds):
        if kind != "numbers":
            continue
        j = i - 1
        while j >= 0 and kinds[j] == "noise":
            j -= 1
        if j < 0 or feats[j]["top"] < p["min_top_frac"] * page_h:
            continue
        if kinds[j] == "?":
            kinds[j] = "chords"
        elif kinds[j] == "numbers" and feats[j]["height"] < p["short_row_frac"] * feats[i]["height"]:
            kinds[j] = "chords"

    return ink, width, feats, kinds
