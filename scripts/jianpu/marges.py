#!/usr/bin/env python3
"""Marges blanches des scans 简谱 : de quoi centrer l'encre dans la colonne (V6).

Validation du 07/11/2026 : 46 scans sur 191 ont une marge blanche droite bien plus
large que la gauche (恩典之路 : 10 px d'encre à gauche, 179 px à droite sur 1 600).
Pour chaque page de `public/jianpu/index.json`, ce script mesure la marge blanche
gauche et droite (pixels du WebP) et écrit `public/jianpu/marges.json` :
`{ "slug": [[gauche, droite], …] }`, une paire par page, triée par slug.

Encre = pixel < 128 en niveaux de gris ; on ne regarde que les lignes sous le
recadrage de `public/jianpu/cadrage.json` (`top` de la page, 0 si absent) ; une
colonne compte si elle porte au moins 3 pixels d'encre. `JianpuSheet` décale la
page de (droite − gauche) / 2 pixels image (hors mode `fit`) : seule la boîte de
la page bouge, aucune coordonnée du calque ne change.

Usage : python3 scripts/jianpu/marges.py
"""
import json
import os

from PIL import Image

RACINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "jianpu")
SEUIL_ENCRE = 128
ENCRE_MIN = 3


def marges(chemin, top):
    img = Image.open(chemin).convert("L")
    w, h = img.size
    bande = img.crop((0, min(top, h), w, h))
    # Encre = 255, papier = 0 ; la somme de chaque colonne donne le nombre de pixels d'encre.
    masque = bande.point(lambda v: 255 if v < SEUIL_ENCRE else 0)
    colonnes = masque.resize((w, 1), Image.BOX)  # moyenne par colonne
    hauteur = bande.size[1] or 1
    n = [round(colonnes.getpixel((x, 0)) / 255 * hauteur) for x in range(w)]
    avec = [x for x in range(w) if n[x] >= ENCRE_MIN]
    if not avec:
        return [0, 0]
    return [avec[0], w - 1 - avec[-1]]


def main():
    with open(os.path.join(RACINE, "index.json"), encoding="utf-8") as f:
        index = json.load(f)
    try:
        with open(os.path.join(RACINE, "cadrage.json"), encoding="utf-8") as f:
            cadrage = json.load(f)
    except FileNotFoundError:
        cadrage = {}
    sortie = {}
    for slug in sorted(index):
        tops = cadrage.get(slug, [])
        sortie[slug] = [
            marges(os.path.join(RACINE, p["file"]), tops[i] if i < len(tops) else 0)
            for i, p in enumerate(index[slug]["pages"])
        ]
    lignes = [json.dumps(k, ensure_ascii=False) + ": " + json.dumps(v) for k, v in sortie.items()]
    with open(os.path.join(RACINE, "marges.json"), "w", encoding="utf-8") as f:
        f.write("{\n" + ",\n".join(lignes) + "\n}")
    ecarts = sum(1 for v in sortie.values() for g, d in v if abs(d - g) > 30)
    print(f"{len(sortie)} chants, {ecarts} pages avec |droite − gauche| > 30")


main()
