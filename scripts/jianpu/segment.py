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


def unbarred(ink, min_width=5):
    """Encre débarrassée des traits verticaux fins — les barres de mesure.

    Pendant vertical de `thicken`. Une barre de mesure court du haut du
    système jusque sous les chiffres : elle traverse donc le creux qui
    sépare la rangée d'accords de la rangée de chiffres et l'empêche de
    descendre au silence. Sur 伯利恒的喜讯 le profil n'y tombe jamais sous
    15 px — cinq barres de 3 à 4 px —, `split_band` ne recoupe rien, et les
    quatre rangées d'accords de la page restent soudées à leurs chiffres,
    invisibles au classifieur comme au matcher (0/37 lus).

    Une barre ne dit rien de la frontière entre deux rangées : elle les
    enjambe par construction. On la retire du **profil de découpage**
    seulement — l'encre vraie, celle que lisent les amas, n'est pas touchée.

    C'est une *ouverture* horizontale, pas l'érosion de `thicken` : celle-ci
    garde les deux bords d'un trait de 4 px (un pixel de bord a toujours de
    l'encre à distance d, du côté du trait) et laissait donc 2 px par barre,
    assez pour combler le silence. Ici un run plus étroit que `min_width`
    disparaît entier, et un run plus large survit entier.
    """
    starts = ink.copy()
    for d in range(1, min_width):
        starts &= np.roll(ink, -d, axis=1)
    out = starts.copy()
    for d in range(1, min_width):
        out |= np.roll(starts, d, axis=1)
    return out & ink


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


# Un silence dans le profil vaut frontière à partir de cette longueur ;
# plus court, c'est un blanc entre deux lettres. Mesurés sur 伯利恒的喜讯 :
# les creux internes à une rangée d'accords y font 1 à 5 lignes, le vide
# qui la sépare de ses chiffres en fait 13.
GAP_MIN = 10

# Une coupe doit être creuse **aussi dans l'encre vraie**, et ce qui l'y
# distingue n'est pas la quantité d'encre mais son étalement : ce qui
# traverse un silence, ce sont des barres de mesure — une poignée de
# colonnes étroites —, jamais des étiquettes. Mesuré sur 伯利恒的喜讯 :
# 2,2 à 3,7 % des colonnes dans les quatre silences, 10 à 16 % dans les
# quatre rangées d'accords, 39 à 50 % dans les rangées de chiffres.
#
# Sans ce garde-fou, une rangée que l'ouverture efface — des étiquettes
# toutes fines — passerait pour un silence et serait découpée puis rognée,
# c'est-à-dire perdue. Avec lui, l'ouverture ne peut qu'échouer à trouver
# une coupe : la bande reste soudée, comme avant, et rien ne disparaît.
CUT_COL_FRAC = 0.07


def _floor(ink, width, top, bottom):
    """Plancher relatif à la densité de la bande."""
    cov = ink[top : bottom + 1].sum(axis=1) / width
    positive = cov[cov > 0]
    return max(0.006, 0.22 * float(np.median(positive))) if positive.size else 0.006


def _by_floor(ink, width, top, bottom, min_h, floor=None):
    """Découpage d'origine, au plancher relatif.

    `floor` se calcule sur la **bande entière** et se passe aux tronçons :
    le recalculer par tronçon déplacerait leurs bornes, alors qu'une coupe
    nouvelle ne doit que tronquer. Sur 充满在这里 la bande 1392-1493 rendait
    (1395, 1414) ; recoupée avec son propre plancher elle rendait
    (1393, 1429), et les neuf étiquettes gelées à y=1395 ne retombaient
    plus sur leur rangée.
    """
    cov = ink[top : bottom + 1].sum(axis=1) / width
    if floor is None:
        floor = _floor(ink, width, top, bottom)
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
    return pieces


def _silences(ink, profile, width, top, bottom):
    """Frontières internes : les silences longs du profil sans barres.

    Le plancher relatif de `_by_floor` cherche un creux *profond*. Il bute
    sur deux choses à la fois : les barres de mesure, qui remplissent le
    creux (voir `unbarred`), et la rangée d'accords elle-même, dont le
    profil oscille jusqu'à zéro — quatre étiquettes sur 1389 px de large,
    l'encre tombe entre les lettres aussi bas qu'entre les rangées. Aucun
    seuil de profondeur ne sépare ces deux blancs-là ; leur **longueur**,
    si.
    """
    quiet = profile[top : bottom + 1].sum(axis=1) <= max(2, 0.006 * width)
    runs, cur = [], None
    for i, q in enumerate(quiet):
        if q:
            cur = [i, i] if cur is None else [cur[0], i]
        else:
            if cur and cur[1] - cur[0] + 1 >= GAP_MIN:
                runs.append(tuple(cur))
            cur = None
    if cur and cur[1] - cur[0] + 1 >= GAP_MIN:
        runs.append(tuple(cur))
    return [(top + a, top + b) for a, b in runs
            if ink[top + a : top + b + 1].any(axis=0).sum() <= CUT_COL_FRAC * width]


def split_band(ink, width, top, bottom, min_h=12, profile=None):
    """Recoupe une bande haute en rangées.

    Deux passes, et la seconde ne fait que **fendre** ce que la première a
    trouvé : le découpage d'origine (`_by_floor`) rend les morceaux, puis
    chaque silence long (`_silences`) qui tombe à l'*intérieur* d'un
    morceau le coupe en deux. Un silence qui déborde d'un morceau, ou qui
    laisserait un côté plus court que `min_h`, est ignoré.

    Cette forme-là est sûre par construction : aucun pixel que l'ancien
    découpage gardait n'est perdu, et aucun haut de morceau ne bouge — ce
    qui compte, les clés `"y,x"` des vérités terrain étant indexées sur le
    haut de rangée. La première version, qui découpait la bande *avant*
    d'appliquer le plancher, effaçait au contraire l'encre des silences
    eux-mêmes : 24 lignes perdues en tête de la rangée d'accords de
    圣灵的江河, 8 étiquettes gelées sur 36 qui ne retombaient plus dessus.
    """
    floor = _floor(ink, width, top, bottom)
    pieces = _by_floor(ink, width, top, bottom, min_h, floor)
    if profile is None:
        return pieces or [(top, bottom)]

    trous = _silences(ink, profile, width, top, bottom)
    out = []
    for a, b in pieces:
        courant = [(a, b)]
        for t0, t1 in trous:
            suite = []
            for p0, p1 in courant:
                gauche, droite = t0 - p0, p1 - t1
                if p0 < t0 and t1 < p1 and gauche >= min_h and droite >= min_h:
                    suite += [(p0, t0 - 1), (t1 + 1, p1)]
                else:
                    suite.append((p0, p1))
            courant = suite
        out += courant
    return out or [(top, bottom)]


def rows(path, tall=80):
    """Rangées de la partition, bandes hautes recoupées."""
    a, ink = load(path)
    height, width = a.shape
    # Les bandes se **trouvent** sur l'encre vraie et se **recoupent** sur
    # l'encre sans barres de mesure : une barre enjambe le creux qu'on
    # cherche, elle n'a pas voix au découpage.
    profile = unbarred(ink)
    out = []
    for top, bottom in raw_bands(ink, width, height, width * 0.004):
        out.extend(split_band(ink, width, top, bottom, profile=profile)
                   if bottom - top + 1 > tall else [(top, bottom)])
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
