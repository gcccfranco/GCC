#!/usr/bin/env python3
"""Segmentation d'une partition 简谱 en rangées (accords / chiffres / paroles).

État : le découpage en rangées fonctionne sur les deux familles de gravure
rencontrées ; la CLASSIFICATION des rangées n'est pas encore portable
(voir plus bas). Ce module fournit la brique basse, pas la décision.

Découpage
---------
Un simple seuil absolu sur le profil d'encre suffit pour les partitions
bien aérées (何等恩典 : rangées 28/62/32 px, blancs francs), mais fusionne
accords et chiffres sur les gravures serrées (爱赢了 : bandes de 113 et
143 px). Le creux existe pourtant — à y=828 la couverture tombe à 0,004 —
il est juste sous le seuil absolu. D'où `split_band` : on recoupe toute
bande haute sur ses minima internes, avec un plancher *relatif* à la
densité médiane de la bande.

Classification — non résolue
----------------------------
La signature des amas de colonnes ne se transpose pas d'une gravure à
l'autre, parce qu'elle dépend de la longueur des noms d'accords :

    何等恩典 (C, G, G/B)          rangée d'accords : n=5..10, largeur méd. 29..50
    爱赢了   (Dmaj9, Esus4, C#m7)  rangée d'accords : n=4..7,  largeur méd. 88..90

Aucun seuil global ne sépare les deux. Il faut des paramètres ajustés par
famille de gravure, calés sur un jeu de contrôle vérifié à l'œil.
"""

import numpy as np
from PIL import Image

INK_THRESHOLD = 160


def load(path):
    a = np.asarray(Image.open(path).convert("L"))
    return a, (a < INK_THRESHOLD)


def thicken(ink, k=3):
    """Ne garde que l'encre présente sur k lignes consécutives.

    Un **arc de liaison** est un trait fin (1-2 px) ; une **ligature** de
    croches est épaisse. Les arcs traversent la bande d'accords et
    imitaient donc une ligature, ce qui faisait rejeter la rangée — et,
    en soudant les étiquettes entre elles, faisait exploser leur nombre
    d'amas (une seule au lieu de cinq sur 爱赢了). Filtrer sur l'épaisseur
    règle les deux symptômes d'un coup.
    """
    out = ink.copy()
    for d in range(1, k):
        out &= np.roll(ink, d, axis=0) | np.roll(ink, -d, axis=0)
    return out


def raw_bands(ink, width, height, min_ink):
    """Bandes horizontales contenant de l'encre, seuil absolu."""
    profile = ink.sum(axis=1)
    out, cur = [], None
    for y in range(height):
        if profile[y] > min_ink:
            cur = [y, y] if cur is None else [cur[0], y]
        else:
            if cur and cur[1] - cur[0] >= 3:
                out.append(tuple(cur))
            cur = None
    if cur and cur[1] - cur[0] >= 3:
        out.append(tuple(cur))
    return out


def split_band(ink, width, top, bottom, min_h=12):
    """Recoupe une bande sur ses creux internes (plancher relatif à sa densité)."""
    cov = ink[top : bottom + 1].sum(axis=1) / width
    positive = cov[cov > 0]
    floor = max(0.006, 0.22 * float(np.median(positive))) if positive.size else 0.006
    pieces, cur = [], None
    for i, c in enumerate(cov):
        if c > floor:
            cur = [i, i] if cur is None else [cur[0], i]
        else:
            if cur and cur[1] - cur[0] + 1 >= min_h:
                pieces.append((top + cur[0], top + cur[1]))
            cur = None
    if cur and cur[1] - cur[0] + 1 >= min_h:
        pieces.append((top + cur[0], top + cur[1]))
    return pieces or [(top, bottom)]


def rows(path, tall=80):
    """Rangées de la partition, bandes hautes recoupées."""
    a, ink = load(path)
    height, width = a.shape
    out = []
    for top, bottom in raw_bands(ink, width, height, width * 0.004):
        out.extend(split_band(ink, width, top, bottom) if bottom - top + 1 > tall else [(top, bottom)])
    return a, ink, width, out


def column_clusters(ink, top, bottom, gap=14):
    """Amas de colonnes encrées séparés par un blanc >= gap.

    Sur une rangée d'accords, un amas = une étiquette (« G/B », « A/C# ») :
    les lettres se touchent par crénage, il n'y a pas de sous-découpage
    fiable en caractères — le template matching doit porter sur l'étiquette
    entière.
    """
    cols = ink[top : bottom + 1].any(axis=0)
    out, start, last = [], None, None
    for x, on in enumerate(cols):
        if on:
            if start is None:
                start = x
            last = x
        elif start is not None and x - last >= gap:
            out.append((start, last))
            start = None
    if start is not None:
        out.append((start, last))
    return out
