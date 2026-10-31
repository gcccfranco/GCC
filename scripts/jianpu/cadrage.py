#!/usr/bin/env python3
"""Recadrage des scans 简谱 : la fenêtre qui coupe l'en-tête gravé (piste A, P3).

Chantier 简谱, lot 3, tranche L3-T1 (docs/spec-jianpu-integration.md, D7, O9).
La page d'un scan s'affiche dans une fenêtre qui la remonte de `top` pixels
(pixels du WebP) : le titre, l'album, les versets, « （C调） » et « [共3张…] »
tombent dans la partie coupée ; la ligne « 1=X 4/4 » reste, le pied gravé aussi.
Aucune coordonnée du calque ne bouge : la page et son calque remontent ensemble.

**La règle** (première page de chaque scan) : `top` = la **dernière rangée
entièrement blanche** (tous les pixels ≥ 245, en niveaux de gris) au-dessus de
`min(keyLabel.y, 1re étiquette.y)` ; sans rangée blanche, repli
`min(keyLabel.y, 1re étiquette.y) − 0,6 × labelH`. Pages 2 et suivantes : 0.
Un `top` de quelques pixels dit qu'aucune coupe propre n'existe (crédits ou
« 1=X » sur la même bande que le titre) : l'en-tête reste.

**La proposition n'est pas la donnée.** Une valeur n'entre dans
`public/jianpu/cadrage.json` que certifiée à l'œil sur la planche
(`npm run jianpu:audit <slug> -- --cadrage`, scripts/jianpu/LOOP.md) : une
ligne de crédits ou le haut d'un « 4/4 » tranché = page refusée, valeur
corrigée à la main. Un chant absent de `cadrage.json` n'est pas recadré.
`chords.json` et `index.json` ne changent jamais.

Usage (depuis la racine du dépôt) :
    python3 scripts/jianpu/cadrage.py propose [slug…]     # tableau + debug/cadrage-propose.json
    python3 scripts/jianpu/cadrage.py certifier slug [top…] # écrit cadrage.json (proposition si pas de top)
    python3 scripts/jianpu/cadrage.py etat                 # certifiés / restants
"""

from __future__ import annotations

import json
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(HERE, "..", "..", "public", "jianpu")
DEBUG = os.path.join(HERE, "debug")
CADRAGE = os.path.join(IMAGES, "cadrage.json")
PROPOSE = os.path.join(DEBUG, "cadrage-propose.json")

BLANC = 245
REPLI = 0.6


def charger(nom: str) -> dict:
    with open(os.path.join(IMAGES, nom), encoding="utf-8") as f:
        return json.load(f)


def top_premiere_page(fichier: str, calque: dict) -> tuple[int, bool]:
    """`top` proposé pour la première page, et s'il vient du repli."""
    gris = np.asarray(Image.open(os.path.join(IMAGES, fichier)).convert("L"))
    y0 = min(calque["keyLabel"]["y"], *(l["y"] for l in calque["labels"]))
    blanches = (gris >= BLANC).all(axis=1)
    for y in range(int(y0) - 1, -1, -1):
        if blanches[y]:
            return y, False
    return max(0, int(y0 - REPLI * calque["labelH"])), True


def proposer(slugs: list[str]) -> dict[str, list[int]]:
    index, calques = charger("index.json"), charger("chords.json")
    slugs = slugs or sorted(index)
    out: dict[str, list[int]] = {}
    for slug in slugs:
        pages = index[slug]["pages"]
        top, repli = top_premiere_page(pages[0]["file"], calques[slug])
        out[slug] = [top] + [0] * (len(pages) - 1)
        print(f"{slug}\t{top}{' (repli)' if repli else ''}\t/ {pages[0]['h']}")
    os.makedirs(DEBUG, exist_ok=True)
    deja = {}
    if os.path.exists(PROPOSE):
        with open(PROPOSE, encoding="utf-8") as f:
            deja = json.load(f)
    deja.update(out)
    with open(PROPOSE, "w", encoding="utf-8") as f:
        json.dump(deja, f, ensure_ascii=False, indent=0, sort_keys=True)
    return out


def certifier(slug: str, tops: list[int]) -> None:
    index = charger("index.json")
    pages = index[slug]["pages"]
    if not tops:
        tops = proposer([slug])[slug]
    if len(tops) != len(pages):
        sys.exit(f"{slug} : {len(pages)} page(s), {len(tops)} valeur(s)")
    for top, page in zip(tops, pages):
        if not 0 <= top < page["h"]:
            sys.exit(f"{slug} : top {top} hors de la page ({page['h']} px)")
    cadrage = charger("cadrage.json") if os.path.exists(CADRAGE) else {}
    cadrage[slug] = tops
    with open(CADRAGE, "w", encoding="utf-8") as f:
        f.write("{\n" + ",\n".join(f'"{k}": {json.dumps(v)}' for k, v in sorted(cadrage.items())) + "\n}\n")
    print(f"{slug} certifié : {tops}")


def etat() -> None:
    index = charger("index.json")
    cadrage = charger("cadrage.json") if os.path.exists(CADRAGE) else {}
    restants = [s for s in sorted(index) if s not in cadrage]
    print(f"{len(cadrage)} chant(s) certifié(s), {len(restants)} restant(s)")
    for s in restants:
        print(s)


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in {"propose", "certifier", "etat"}:
        sys.exit(__doc__)
    commande, args = sys.argv[1], sys.argv[2:]
    if commande == "propose":
        proposer(args)
    elif commande == "certifier":
        certifier(args[0], [int(a) for a in args[1:]])
    else:
        etat()
