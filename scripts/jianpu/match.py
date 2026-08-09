#!/usr/bin/env python3
"""Lecture des étiquettes d'accords — à vocabulaire fermé.

Le point de départ est que **lire un accord sur la partition n'est pas de
l'OCR**. Le vocabulaire du chant est déjà connu : il est dans son `.cho`, et
il tient en 3 à 13 étiquettes distinctes. Il ne s'agit donc pas de
reconnaître du texte quelconque mais de choisir parmi une dizaine de
candidats — un problème incomparablement plus facile, et qui n'exige aucune
bibliothèque de gabarits constituée à la main : les candidats se *rendent*
avec une police système.

Trois mesures les séparent :

- **la corrélation** de l'imagette réduite à une grille 32×32 (aplatie, sans
  respect de la chasse) — elle distingue les lettres seules, G contre C ;
- **le rapport largeur/hauteur** — il distingue les étiquettes de longueurs
  différentes (« A » 17 px contre « Dsus4 » 76 px) et ne dépend pas de la
  fonte ;
- **la corrélation de la moitié gauche seule** — ce qui sépare `D/F#` de
  `E/G#`, ou `C#m7` de `F#m7`, c'est la lettre de tête, et elle ne pèse
  qu'un cinquième d'une imagette écrasée.

**Identifier et faire confiance sont deux décisions distinctes.** La moitié
gauche dit *quel* accord ; elle ne peut pas dire si c'en est un, parce qu'un
amas parasite a lui aussi une moitié gauche qui ressemble à quelque chose.
La confiance se lit donc sur la corrélation pleine seule, où les vraies
étiquettes et les amas parasites (crochets de reprise, D.S., segno, arcs de
liaison, 【Chorus】) restent séparés. Un amas sous le seuil n'est pas une
étiquette — c'est ce qui permet de garder une rangée dont le découpage a
ramassé des marques qui ne sont pas des accords.

Usage (depuis scripts/jianpu/) :
    python3 match.py                  # le jeu de contrôle
    python3 match.py 爱赢了 献上尊荣    # des chants précis
"""

from __future__ import annotations

import json
import os
import re
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from classify import classify
from segment import INK_THRESHOLD

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(HERE, "..", "..", "public", "jianpu")
SONGS = os.path.join(HERE, "..", "..", "content", "songs")

# Fonte de référence : Helvetica Neue lit 45/46 la vérité terrain de
# 何等恩典, devant Helvetica 44/46, Arial 41/46, Times 34/46.
FONT = "/System/Library/Fonts/HelveticaNeue.ttc"
FONT_SIZE = 64

# …mais cette élection s'est faite sur **une** gravure, et le corpus en
# contient plusieurs. 永恒唯一的盼望 est gravée dans une bold linéale large :
# Helvetica Neue y identifie 20 étiquettes sur 29 et en **retient 7
# fausses**, quand Verdana Bold en identifie 29 sur 29 et n'en retient
# aucune. Les fautes n'étaient pas quelconques — B lu E, G#m lu C#m, C#m lu
# F#m — toutes des confusions de *lettre initiale* entre pleins gras que le
# gabarit maigre ne sépare pas.
#
# La fonte est donc une propriété de **page**, au même titre que la
# tonalité imprimée, et se note comme elle dans `gold/<slug>.json`, sous
# `face`. `sweep-key.py` propose le couple, l'œil tranche sur la planche de
# lecture.
# Une troisième famille est apparue en regardant les planches : 最美的礼物
# est gravée dans une **serif**, et ses lectures justes étaient rejetées
# faute d'unanimité — le jury n'ayant que des linéales. Times avait
# pourtant été écartée à l'itération 5, sur le seul motif qu'elle perdait
# sur 何等恩典. C'est la même erreur que la fonte de référence, au même
# endroit : une famille jugée sur une page qui n'est pas la sienne.
SUP = "/System/Library/Fonts/Supplemental/"
FACES: dict[str, tuple[str, int, str]] = {
    "helvetica-neue": ("/System/Library/Fonts/HelveticaNeue.ttc", 0, "lineale"),
    "helvetica-bold": ("/System/Library/Fonts/Helvetica.ttc", 1, "grasse"),
    "verdana-bold": (SUP + "Verdana Bold.ttf", 0, "grasse"),
    "din-bold": (SUP + "DIN Alternate Bold.ttf", 0, "grasse"),
    "times": (SUP + "Times New Roman.ttf", 0, "serif"),
    "times-bold": (SUP + "Times New Roman Bold.ttf", 0, "serif"),
    "georgia": (SUP + "Georgia.ttf", 0, "serif"),
}
DEFAULT_FACE = "helvetica-neue"

# Les autres fontes ne servent pas à lire mais à **contrôler la lecture**.
# Aucun score n'est comparable d'une fonte à l'autre (Times a la meilleure
# médiane et la pire exactitude), mais l'*accord* retenu l'est : une
# étiquette sur laquelle plusieurs fontes tombent d'accord est juste, une
# étiquette sur laquelle elles divergent est celle qui se trompe. C'est le
# seul indicateur de justesse disponible sans vérité terrain — et il est
# nécessaire, parce que le *score* n'en est pas un : sur 全然向你, trois « Bm »
# lus « Em » notaient +0,68 à +0,74, aussi haut que les lectures justes.
#
# Times est écarté du jury **des linéales** : elle y lit 34/46 la vérité
# terrain là où les autres sont à 41-45, et l'exiger fait tomber la
# couverture de 85 à 61 sans retirer une seule erreur. Cela ne dit rien de
# ce qu'elle vaut sur une page gravée en serif — voir `FACES`.
JURY = [
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/System/Library/Fonts/Supplemental/Verdana.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
]

# Le jury suit la **famille** de la fonte de référence. Juger une page
# grasse avec trois maigres, c'est demander l'unanimité à des gabarits qui
# se trompent tous de la même façon : l'unanimité dirait alors « sûr » sur
# une faute partagée, ce qui est pire que pas de jury du tout. Et sur
# 最美的礼物, gravée en serif, le jury linéal rejetait des lectures justes —
# le jury coûtait de la couverture sans rien attraper.
JURIES: dict[str, list[tuple[str, int]]] = {
    "lineale": [(p, 0) for p in JURY],
    "grasse": [
        (SUP + "Arial Bold.ttf", 0),
        (SUP + "Tahoma Bold.ttf", 0),
        ("/System/Library/Fonts/Helvetica.ttc", 1),
    ],
    "serif": [
        (SUP + "Georgia.ttf", 0),
        (SUP + "Times New Roman.ttf", 0),
        (SUP + "Times New Roman Bold.ttf", 0),
    ],
}

GRID = 32
# Poids du rapport de chasse devant la corrélation. Plat de 1 à 4 contre la
# vérité terrain, il s'effondre à 8.
RATIO_WEIGHT = 2.0

# Moitié gauche de l'étiquette, et son poids. Balayés contre la vérité
# terrain : l'optimum est plat autour de 0,50 / 1,5.
HEAD_FRAC = 0.50
HEAD_WEIGHT = 1.5

# Seuil de rejet, sur la corrélation pleine seule. Le plus haut amas
# parasite du jeu de contrôle est à +0,27 — un seul, dans la bande d'arcs de
# 爱赢了 y=1099. La marge est donc mince : ce seuil est calé contre un unique
# contre-exemple, et un corpus plus large le fera sans doute bouger.
MIN_SCORE = 0.28

SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]

CHORD_RE = re.compile(r"^\(?([A-G][#b]?)([^/\s\]]*)(?:/([A-G][#b]?))?\)?$")


def vocabulary(slug: str) -> list[str]:
    """Étiquettes distinctes du `.cho`, dans leur écriture d'origine.

    Le filtre par `CHORD_RE` écarte les libellés de section
    (`[副歌/Refrain]`) et les espaceurs (`[ ]`), qui partagent la syntaxe des
    accords.

    Le `.cho` n'est pas toujours un sur-ensemble de ce qui est gravé : la
    partition porte des accords de passage (`F#dim`, `Em/D`, `Am/G`) que la
    transcription ChordPro simplifie. `gold/<slug>.json` peut donc ajouter
    ces étiquettes-là dans `extra_chords`, **une par une et lues à l'œil**.

    Élargir le vocabulaire par une règle générale — toutes les basses de la
    gamme, tous les accords diminués — a été mesuré et rejeté : de 13 à 84
    candidats, la lecture tombe de 95 à 76 étiquettes justes et deux
    mauvaises lectures apparaissent. C'est la **petitesse** du vocabulaire
    qui fait la force du matcher (LOOP.md, itération 9).
    """
    text = open(os.path.join(SONGS, f"{slug}.cho"), encoding="utf8").read()
    out: list[str] = []
    for token in re.findall(r"\[([^\]]+)\]", text):
        token = token.strip()
        if CHORD_RE.match(token) and token.strip("()") not in out:
            out.append(token.strip("()"))
    gold = os.path.join(HERE, "gold", f"{slug}.json")
    if os.path.exists(gold):
        for chord in json.load(open(gold, encoding="utf8")).get("extra_chords", []):
            if chord not in out:
                out.append(chord)
    return out


def note_index(note: str) -> int:
    for table in (SHARP, FLAT):
        if note in table:
            return table.index(note)
    raise ValueError(note)


def transpose(chord: str, semitones: int = 0) -> list[str]:
    """Toutes les écritures plausibles de l'accord transposé.

    On ne cherche pas à deviner si la partition écrit dièse ou bémol : les
    deux graphies sont proposées au gabarit, c'est l'image qui tranche.
    """
    m = CHORD_RE.match(chord)
    if not m:
        return [chord]
    root, suffix, bass = m.groups()
    i = (note_index(root) + semitones) % 12
    roots = {SHARP[i], FLAT[i]}
    if bass is None:
        return sorted(r + suffix for r in roots)
    j = (note_index(bass) + semitones) % 12
    return sorted(f"{r}{suffix}/{b}" for r in roots for b in {SHARP[j], FLAT[j]})


PAREN_RE = re.compile(r"^([A-G][#b♯♭]?)(add\d+|sus\d+)$")


def spellings(label: str) -> list[str]:
    """Variantes typographiques d'une même étiquette.

    Les recueils chinois écrivent le bémol **devant** la lettre (« ♭B » pour
    Bb) et gravent les altérations avec les signes musicaux plutôt qu'avec
    « # » et « b ». Les enrichissements se mettent aussi entre parenthèses
    (« A(add2) » pour Aadd2).
    """
    out = [label]
    if "#" in label:
        out.append(label.replace("#", "♯"))
    if "b" in label:
        out.append(re.sub(r"([A-G])b", r"♭\1", label))
        out.append(re.sub(r"([A-G])b", r"\1♭", label))
    return [v for base in out for v in dict.fromkeys((base, PAREN_RE.sub(r"\1(\2)", base)))]


def signature(bitmap: np.ndarray) -> tuple[np.ndarray, np.ndarray, float]:
    """Corrélation pleine, corrélation de la moitié gauche, chasse."""
    head = bitmap[:, : max(1, int(round(bitmap.shape[1] * HEAD_FRAC)))]
    return _grid(bitmap), _grid(head), bitmap.shape[1] / max(bitmap.shape[0], 1)


def _grid(bitmap: np.ndarray) -> np.ndarray:
    im = Image.fromarray((bitmap * 255).astype(np.uint8)).resize((GRID, GRID), Image.LANCZOS)
    v = np.asarray(im, np.float32).ravel()
    v -= v.mean()
    n = float(np.linalg.norm(v))
    return v / n if n else v


def _trim(a: np.ndarray) -> np.ndarray | None:
    if not a.any():
        return None
    ys, xs = np.where(a.any(1))[0], np.where(a.any(0))[0]
    return a[ys[0] : ys[-1] + 1, xs[0] : xs[-1] + 1]


SUP_RE = re.compile(r"^(.*?)(\(.*\)|\d+)$")


def _render(text: str, font, small, superscript: bool) -> np.ndarray | None:
    """Grave l'étiquette, à plat ou avec l'enrichissement en exposant.

    Les deux gravures existent dans le corpus — 何等恩典 écrit « D7 » sur la
    ligne, 主的喜乐是我力量 écrit « B » avec un 7 surélevé. On propose les
    deux au gabarit, c'est l'image qui tranche.
    """
    im = Image.new("L", (FONT_SIZE * 10, FONT_SIZE * 3), 0)
    dr = ImageDraw.Draw(im)
    if not superscript:
        dr.text((FONT_SIZE, FONT_SIZE), text, fill=255, font=font, anchor="ls")
    else:
        m = SUP_RE.match(text)
        if not m or not m.group(1):
            return None
        base, sup = m.groups()
        dr.text((FONT_SIZE, FONT_SIZE), base, fill=255, font=font, anchor="ls")
        x = FONT_SIZE + dr.textlength(base, font=font)
        dr.text((x, FONT_SIZE - int(FONT_SIZE * 0.38)), sup, fill=255, font=small, anchor="ls")
    return _trim(np.asarray(im) > 100)


def build_templates(
    vocab: list[str], semitones: int = 0, font_path: str = FONT, index: int = 0
) -> dict[str, list]:
    font = ImageFont.truetype(font_path, FONT_SIZE, index=index)
    small = ImageFont.truetype(font_path, int(FONT_SIZE * 0.62), index=index)
    out: dict[str, list] = {}
    for chord in vocab:
        sigs = []
        for variant in transpose(chord, semitones):
            for text in spellings(variant):
                for superscript in (False, True):
                    bitmap = _render(text, font, small, superscript)
                    if bitmap is None:
                        continue
                    full, head, ratio = signature(bitmap)
                    if full.any() and ratio > 0:
                        sigs.append((full, head, ratio))
        if sigs:
            out[chord] = sigs
    return out


def face_bank(vocab: list[str], semitones: int, face: str) -> dict[str, list]:
    path, index, _family = FACES[face]
    return build_templates(vocab, semitones, path, index)


def song_face(slug: str) -> str:
    """Fonte de gravure de la page, lue dans la vérité terrain.

    Absente, on garde Helvetica Neue : c'est la gravure de tout ce qui a
    été mesuré jusqu'à l'itération 18, et les onze calques certifiés sont
    gelés — rien de ce qui est publié ne dépend plus de ce choix.
    """
    path = os.path.join(HERE, "gold", f"{slug}.json")
    if not os.path.exists(path):
        return DEFAULT_FACE
    face = json.load(open(path, encoding="utf8")).get("face")
    return face if face in FACES else DEFAULT_FACE


def song_semitones(slug: str) -> int:
    """Écart entre la tonalité du `.cho` et celle **gravée** sur la page.

    `printed_key` existait déjà, mais ne servait qu'au client : la lecture,
    elle, se faisait toujours à zéro. Une page gravée dans une autre
    tonalité que son `.cho` ne pouvait donc pas être lue du tout, quoi
    qu'on écrive dans la vérité terrain — les gabarits portaient des noms
    que la page n'affiche nulle part. C'est la moitié de ce qui bloquait
    les 75 chants sans calque.
    """
    path = os.path.join(HERE, "gold", f"{slug}.json")
    if not os.path.exists(path):
        return 0
    printed = json.load(open(path, encoding="utf8")).get("printed_key")
    if not printed:
        return 0
    text = open(os.path.join(SONGS, f"{slug}.cho"), encoding="utf8").read()
    m = re.search(r"\{key:\s*([^}]+)\}", text)
    if not m:
        return 0
    return (note_index(printed) - note_index(m.group(1).strip())) % 12


def jury_faces(face: str) -> list[tuple[str, int]]:
    return JURIES[FACES[face][2]]


def crop_labels(slug: str):
    """Imagettes des étiquettes, telles que le classifieur les a découpées."""
    path = os.path.join(IMAGES, f"{slug}-p1.webp")
    ink = np.asarray(Image.open(path).convert("L")) < INK_THRESHOLD
    _ink, _w, feats, kinds = classify(path)
    rows = []
    for f, kind in zip(feats, kinds):
        if kind != "chords":
            continue
        cells = []
        for x0, x1 in f["clusters"]:
            sub = ink[f["top"] : f["bottom"] + 1, x0 : x1 + 1]
            ys, xs = np.where(sub.any(1))[0], np.where(sub.any(0))[0]
            if len(ys) and len(xs):
                cells.append(((x0, x1), sub[ys[0] : ys[-1] + 1, xs[0] : xs[-1] + 1]))
        rows.append((f, cells))
    return rows


def best_match(sig, templates, width_factor: float = 1.0) -> tuple[float, str | None]:
    """Accord retenu, et la confiance qu'on lui accorde.

    L'accord est choisi sur le score complet (moitié gauche comprise) ; la
    confiance rendue est celle du gabarit retenu **sans** la moitié gauche.
    Mélanger les deux ferait remonter les amas parasites au-dessus du seuil.
    """
    full, head, ratio = sig
    ratio *= width_factor
    best_pick = (-9.0, None, -9.0)
    for chord, variants in templates.items():
        for tfull, thead, tratio in variants:
            plain = float(tfull @ full) - RATIO_WEIGHT * abs(np.log(tratio / ratio))
            score = plain + HEAD_WEIGHT * float(thead @ head)
            if score > best_pick[0]:
                best_pick = (score, chord, plain)
    return best_pick[2], best_pick[1]


def width_factor(sigs, templates) -> float:
    """Chasse de la partition, rapportée à celle des gabarits.

    Les gravures ne sont pas toutes aussi étroites : sur 我心坚定与你 le
    gabarit est 1,14 fois plus large que le scan, et la pénalité de chasse
    ampute alors toute la partition de 0,20 point — assez pour faire tomber
    des lectures pourtant justes sous le seuil.

    Le facteur est **global à la page**, donc estimable sur ses propres
    étiquettes : on apparie une première fois sans correction et on prend la
    **médiane** des écarts, qui encaisse sans broncher les amas mal
    appariés.
    """
    factors = []
    for full, head, ratio in sigs:
        best = (-9.0, None)
        for variants in templates.values():
            for tfull, thead, tratio in variants:
                score = (float(tfull @ full) - RATIO_WEIGHT * abs(np.log(tratio / ratio))
                         + HEAD_WEIGHT * float(thead @ head))
                if score > best[0]:
                    best = (score, tratio / ratio)
        if best[1]:
            factors.append(best[1])
    return float(np.median(factors)) if factors else 1.0


def read(slug: str, semitones: int | None = None):
    """Lit toutes les étiquettes d'un chant.

    `semitones` est l'écart entre la tonalité du `.cho` et celle **imprimée**
    sur la partition (32 des 124 partitions ne sont pas dans la tonalité de
    leur `.cho`). Laissé à `None`, il est pris dans `printed_key` de la
    vérité terrain. Le déduire tout seul en essayant les 12 décalages ne
    marchait pas à l'itération 5 — mais c'était sous une fonte qui ne
    collait pas à la page, et un balayage fait avec le mauvais gabarit ne
    mesure rien : `sweep-key.py` balaye désormais les deux ensemble et
    propose le couple, que l'œil confirme.

    Retourne la liste des rangées
    `(features, [((x0, x1), accord, score, unanime)])`, où `unanime` dit si
    les fontes du jury lisent toutes le même accord.
    """
    vocab = vocabulary(slug)
    if semitones is None:
        semitones = song_semitones(slug)
    face = song_face(slug)
    banks = [face_bank(vocab, semitones, face)]
    banks += [
        build_templates(vocab, semitones, path, index)
        for path, index in jury_faces(face)
        if os.path.exists(path)
    ]

    rows = [(f, [(pos, signature(bitmap)) for pos, bitmap in cells]) for f, cells in crop_labels(slug)]
    sigs = [sig for _f, cells in rows for _pos, sig in cells]
    factors = [width_factor(sigs, bank) for bank in banks]

    out = []
    for f, cells in rows:
        row = []
        for pos, sig in cells:
            score, chord = best_match(sig, banks[0], factors[0])
            unanimous = all(
                best_match(sig, bank, k)[1] == chord
                for bank, k in zip(banks[1:], factors[1:])
            )
            row.append((pos, chord, score, unanimous))
        out.append((f, row))
    return out


GOLD_SET = [
    "何等恩典",
    "齐来赞美",
    "主的喜乐是我力量",
    "我心坚定与你",
    "爱赢了",
    "献上尊荣",
    "你们要赞美耶和华",
    # Famille « bold linéale », entrée à l'itération 19. Les sept premiers
    # sont tous gravés dans des maigres, et c'est ce qui rendait la fonte
    # invisible comme variable : le jeu de contrôle ne contenait qu'une
    # seule graisse, donc aucune mesure ne pouvait la mettre en cause.
    "永恒唯一的盼望",
]


def keep(score: float, unanimous: bool) -> bool:
    """Une étiquette n'est publiable que sûre **et** unanime."""
    return score >= MIN_SCORE and unanimous


# Une rangée est déclarée étrangère quand un **autre** intervalle la lit
# franchement mieux que celui de la page.
#
# Le test naïf — « mal lue à la tonalité de la page » — ne marche pas, et
# c'est tout le piège de cette chaîne : le vocabulaire est *fermé*, donc le
# matcher trouve toujours quelque chose. La rangée en mi de 有你同行 se lit
# 75 % avec le vocabulaire en ré ; c'est précisément pour cela qu'elle
# publiait de faux accords. Ce n'est pas l'échec qui la trahit, c'est
# l'écart : 100 % à +2 contre 75 % à 0.
FOREIGN_HIT = 0.70
FOREIGN_MARGIN = 0.20
FOREIGN_MIN_ROW = 4


def foreign_rows(slug: str) -> dict[int, int]:
    """Rangées gravées dans une **autre tonalité** que celle de la page.

    Deux formats les produisent, et le corpus contient les deux :

    - la **modulation** — 有你同行 commence en ré (`D Bm G A`) et finit en mi
      (`C#m A E B`, `G#m C#m A B E`) sans réimprimer de « 1=X » ;
    - les **rangées empilées** — 尽情地微笑 imprime deux jeux d'accords sur la
      même ligne de mélodie, l'un trois demi-tons au-dessus de l'autre.

    Les ignorer ne coûtait pas seulement de la couverture : le matcher, à
    qui l'on impose le vocabulaire de la page, **retient de faux accords**.
    有你同行 publiait `F#m A D` là où la page imprime `C#m A E`, unanimes et
    au-dessus du seuil. C'est le pire cas possible — un accord faux écrit
    sur la partition, qu'aucun compteur ne signale puisqu'il compte comme
    une réussite.

    On les repère et on ne les publie pas. Rendre ces pages *justes* est
    une autre affaire : il y faut une tonalité par section, et un calque
    qui sait en porter plusieurs.
    """
    vocab = vocabulary(slug)
    if not vocab:
        return {}
    base = song_semitones(slug)
    face = song_face(slug)
    rows = [(f, [signature(b) for _p, b in cells]) for f, cells in crop_labels(slug)]
    rows = [(f, sigs) for f, sigs in rows if len(sigs) >= FOREIGN_MIN_ROW]
    if not rows:
        return {}
    every = [s for _f, sigs in rows for s in sigs]
    factor = width_factor(every, face_bank(vocab, base, face))

    banks = {d: face_bank(vocab, (base + d) % 12, face) for d in range(12)}
    out = {}
    for f, sigs in rows:
        hits = {
            d: sum(1 for s in sigs if best_match(s, bank, factor)[0] >= MIN_SCORE) / len(sigs)
            for d, bank in banks.items()
        }
        d_best = max((d for d in hits if d), key=lambda d: hits[d])
        # L'epsilon n'est pas cosmétique : 1,0 - 0,8 vaut 0,199… en binaire,
        # et la rangée en mi de 有你同行 (5 amas) tombait juste sous la barre.
        if hits[d_best] >= FOREIGN_HIT and hits[d_best] - hits[0] >= FOREIGN_MARGIN - 1e-9:
            out[f["top"]] = d_best
    return out


def report(slug: str) -> None:
    rows = read(slug)
    if not rows:
        print(f"  {slug:16} aucune rangée d'accords")
        return
    total = sum(len(r) for _f, r in rows)
    kept = sum(1 for _f, r in rows for _p, _c, s, u in r if keep(s, u))
    print(f"  {slug:16} {kept:3}/{total:3} amas retenus")
    for f, row in rows:
        marks = " ".join(c if keep(s, u) else "·" for _p, c, s, u in row)
        print(f"      y={f['top']:5}  {marks}")


if __name__ == "__main__":
    for name in sys.argv[1:] or GOLD_SET:
        report(name)
