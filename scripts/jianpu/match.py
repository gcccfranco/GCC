#!/usr/bin/env python3
"""Lecture des étiquettes d'accords — à vocabulaire fermé.

Le point de départ est que **lire un accord sur la partition n'est pas de
l'OCR**. Le vocabulaire du chant est déjà connu : il est dans son `.cho`, et
il tient en 3 à 13 étiquettes distinctes. Il ne s'agit donc pas de
reconnaître du texte quelconque mais de choisir parmi une dizaine de
candidats — un problème incomparablement plus facile, et qui n'exige aucune
bibliothèque de gabarits constituée à la main : les candidats se *rendent*
avec une police système.

Deux mesures suffisent à les séparer :

- **la corrélation** de l'imagette réduite à une grille 32×32 (aplatie, sans
  respect de la chasse) — elle distingue les lettres seules, G contre C ;
- **le rapport largeur/hauteur** — il distingue les étiquettes de longueurs
  différentes (« A » 17 px contre « Dsus4 » 76 px) et ne dépend pas de la
  fonte.

Le score qui en sort sert aussi d'**oracle** : sur le jeu de contrôle, les
vraies étiquettes ne descendent pas sous +0,16 et les amas parasites
(crochets de reprise, D.S., segno, arcs de liaison, 【Chorus】) ne montent pas
au-dessus de −0,04. Un amas sous le seuil n'est pas une étiquette — c'est ce
qui permet de garder une rangée dont le découpage a ramassé des marques qui
ne sont pas des accords.

Usage (depuis scripts/jianpu/) :
    python3 match.py                  # le jeu de contrôle
    python3 match.py 爱赢了 献上尊荣    # des chants précis
"""

from __future__ import annotations

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

# Fonte de rendu des gabarits. Mesurée contre la vérité terrain : Helvetica
# Neue 45/46 sur 何等恩典 (gravure aérée) et 6/9 sur 爱赢了 (gravure serrée),
# devant Helvetica 44/46 · 5/9, Arial 41/46 · 5/9, Times 34/46 · 4/9.
# Choisir la fonte *par partition* ferait mieux (Verdana lit 7/9 sur 爱赢了)
# mais aucun critère automatique testé ne sait la désigner — voir LOOP.md,
# itération 5.
FONT = "/System/Library/Fonts/HelveticaNeue.ttc"
FONT_SIZE = 64

GRID = 32
# Poids du rapport de chasse devant la corrélation. Plat de 1 à 4 contre la
# vérité terrain, il s'effondre à 8.
RATIO_WEIGHT = 2.0

# Seuil de rejet, placé dans l'intervalle vide entre les vraies étiquettes
# (min +0,16) et les amas parasites (max −0,04).
MIN_SCORE = 0.10

SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]

CHORD_RE = re.compile(r"^\(?([A-G][#b]?)([^/\s\]]*)(?:/([A-G][#b]?))?\)?$")


def vocabulary(slug: str) -> list[str]:
    """Étiquettes distinctes du `.cho`, dans leur écriture d'origine.

    Le filtre par `CHORD_RE` écarte les libellés de section
    (`[副歌/Refrain]`) et les espaceurs (`[ ]`), qui partagent la syntaxe des
    accords.
    """
    text = open(os.path.join(SONGS, f"{slug}.cho"), encoding="utf8").read()
    out: list[str] = []
    for token in re.findall(r"\[([^\]]+)\]", text):
        token = token.strip()
        if CHORD_RE.match(token) and token.strip("()") not in out:
            out.append(token.strip("()"))
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


def spellings(label: str) -> list[str]:
    """Variantes typographiques d'une même étiquette.

    Les recueils chinois écrivent le bémol **devant** la lettre (« ♭B » pour
    Bb) et gravent les altérations avec les signes musicaux plutôt qu'avec
    « # » et « b ».
    """
    out = [label]
    if "#" in label:
        out.append(label.replace("#", "♯"))
    if "b" in label:
        out.append(re.sub(r"([A-G])b", r"♭\1", label))
        out.append(re.sub(r"([A-G])b", r"\1♭", label))
    return out


def signature(bitmap: np.ndarray) -> tuple[np.ndarray, float]:
    """Vecteur de corrélation normalisé + rapport largeur/hauteur."""
    im = Image.fromarray((bitmap * 255).astype(np.uint8)).resize((GRID, GRID), Image.LANCZOS)
    v = np.asarray(im, np.float32).ravel()
    v -= v.mean()
    n = float(np.linalg.norm(v))
    return (v / n if n else v), bitmap.shape[1] / max(bitmap.shape[0], 1)


def _render(text: str, font: ImageFont.FreeTypeFont) -> np.ndarray | None:
    im = Image.new("L", (FONT_SIZE * 10, FONT_SIZE * 3), 0)
    ImageDraw.Draw(im).text((FONT_SIZE, FONT_SIZE // 2), text, fill=255, font=font)
    a = np.asarray(im) > 100
    if not a.any():
        return None
    ys, xs = np.where(a.any(1))[0], np.where(a.any(0))[0]
    return a[ys[0] : ys[-1] + 1, xs[0] : xs[-1] + 1]


def build_templates(vocab: list[str], semitones: int = 0, font_path: str = FONT) -> dict[str, list]:
    font = ImageFont.truetype(font_path, FONT_SIZE)
    out: dict[str, list] = {}
    for chord in vocab:
        sigs = []
        for variant in transpose(chord, semitones):
            for text in spellings(variant):
                bitmap = _render(text, font)
                if bitmap is None:
                    continue
                vec, ratio = signature(bitmap)
                if vec.any() and ratio > 0:
                    sigs.append((vec, ratio))
        if sigs:
            out[chord] = sigs
    return out


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


def best_match(sig, templates) -> tuple[float, str | None]:
    vec, ratio = sig
    best: tuple[float, str | None] = (-9.0, None)
    for chord, variants in templates.items():
        for tvec, tratio in variants:
            score = float(tvec @ vec) - RATIO_WEIGHT * abs(np.log(tratio / ratio))
            if score > best[0]:
                best = (score, chord)
    return best


def read(slug: str, semitones: int = 0):
    """Lit toutes les étiquettes d'un chant.

    `semitones` est l'écart entre la tonalité du `.cho` et celle **imprimée**
    sur la partition (32 des 124 partitions ne sont pas dans la tonalité de
    leur `.cho`). Le déduire automatiquement en essayant les 12 décalages ne
    marche pas — voir LOOP.md, itération 5.

    Retourne la liste des rangées `(features, [((x0, x1), accord, score)])`.
    """
    templates = build_templates(vocabulary(slug), semitones)
    out = []
    for f, cells in crop_labels(slug):
        row = []
        for pos, bitmap in cells:
            score, chord = best_match(signature(bitmap), templates)
            row.append((pos, chord, score))
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
]


def report(slug: str) -> None:
    rows = read(slug)
    if not rows:
        print(f"  {slug:16} aucune rangée d'accords")
        return
    total = sum(len(r) for _f, r in rows)
    kept = sum(1 for _f, r in rows for _p, _c, s in r if s >= MIN_SCORE)
    print(f"  {slug:16} {kept:3}/{total:3} amas retenus")
    for f, row in rows:
        marks = " ".join(c if s >= MIN_SCORE else "·" for _p, c, s in row)
        print(f"      y={f['top']:5}  {marks}")


if __name__ == "__main__":
    for name in sys.argv[1:] or GOLD_SET:
        report(name)
