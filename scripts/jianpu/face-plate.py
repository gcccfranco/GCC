#!/usr/bin/env python3
"""Planche d'élection de la **fonte de gravure**, pour l'œil.

`sweep-key.py` élit la fonte sur le nombre d'amas qui passent le seuil, sans
le jury. `apply-sweep.py` l'écrit dans `gold/`. Personne ne l'a jamais
regardée — et l'itération 50 a mesuré ce que ce raccourci coûte.

Les 95 pages certifiées portent chacune une vérité terrain complète
(`frozen_labels`). En rejouant leur lecture sous les sept fontes, on peut
comparer trois électeurs :

    fonte de `gold/` (l'œil)   2600 publiables ·  3 accords publiés FAUX
    la mieux au seuil (sweep)  2697 publiables · 13 accords publiés FAUX
    la plus publiable (keep)   2715 publiables · 11 accords publiés FAUX

Les deux automates gagnent une centaine d'amas et **quadruplent le mode C**.
La fonte que l'œil a retenue lit moins, et lit juste. Ce n'est donc pas un
électeur qu'il faut changer : c'est l'œil qu'il faut faire passer.

Or les 40 pages sans calque portent toutes une fonte élue par le critère
« au seuil » — le plus mauvais des trois — et aucune n'a été regardée. Cette
planche est ce qui manquait pour le faire.

**Ce qu'elle montre.** Une colonne par amas de la page, une ligne par fonte :

- en haut, l'amas **gravé**, tel que le découpage le donne au matcher ;
- dessous, pour chaque fonte, le gabarit de l'accord que *cette* fonte lit,
  rendu dans *cette* fonte, avec l'accord et son score.

On ne lit pas les scores, on regarde les **formes** : la fonte à retenir est
celle dont les lettres ont le dessin de la page — empattements ou non,
graisse, chiffrage sur la ligne ou surélevé. C'est le geste de l'itération 19
(la fonte est une propriété de page) rendu visible, une page à la fois.

Les amas montrés sont les plus **larges** de la page : un « C » ne distingue
aucune fonte, un « F#m7 » les sépare toutes.

Usage (depuis GCCLouange/) :
    python3 scripts/jianpu/face-plate.py <slug>…
    python3 scripts/jianpu/face-plate.py --missing   # les chants sans calque

Sortie : scripts/jianpu/debug/_face-<slug>.png
"""

from __future__ import annotations

import contextlib
import io
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw, ImageFont  # noqa: E402

from match import (  # noqa: E402
    ACC_RISE, ACC_SMALL, FACES, FONT_SIZE, HEAD_WEIGHT, RATIO_WEIGHT, RISE, SMALL,
    best_match, build_templates, crop_labels, face_bank, jury_faces, keep, signature,
    song_face, song_semitones, spellings, vocabulary, width_factor, _gravures, _render,
)

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(HERE, "..", "..", "public", "jianpu")
INVENTAIRE = os.path.join(HERE, "inventaire.json")
OUT = os.path.join(HERE, "debug")

#: Nombre d'amas montrés. Au-delà la planche ne tient plus à l'écran, et la
#: fonte se voit sur les premiers : ce sont les mêmes lettres partout.
SAMPLE = 9

#: Score en deçà duquel un amas passe en fin de file — pas exclu, pour qu'une
#: page que rien ne lit ait quand même une planche, mais montré en dernier.
#: Volontairement bien plus bas que `MIN_SCORE` (0,28) : on ne cherche pas ici
#: ce qui est publiable, seulement ce qui a la forme d'une étiquette.
PLATE_MIN_SCORE = 0.0
#: Hauteur à laquelle tout est ramené — gravé comme gabarit. Sans elle on
#: compare une gravure de 24 px à un gabarit de 64, et c'est la taille qu'on
#: regarde au lieu du dessin.
ROW_H = 46
LABEL_W = 150
UI = "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"


def _fit(bitmap: np.ndarray, height: int) -> Image.Image:
    """L'imagette en noir sur blanc, ramenée à `height`."""
    im = Image.fromarray(((~bitmap) * 255).astype(np.uint8))
    scale = height / max(im.height, 1)
    return im.resize((max(1, int(im.width * scale)), height), Image.LANCZOS)


def _bitmap_bank(vocab: list[str], semitones: int, face: str) -> dict[str, list]:
    """Le banc du matcher, mais en **gardant les imagettes**.

    `build_templates` ne rend que des signatures — des vecteurs de
    corrélation, qui ne se regardent pas. Or un accord a jusqu'à douze
    gravures plausibles (dièse ou bémol, altération sur la ligne ou
    surélevée, chiffrage surélevé ou non), et montrer la première au lieu de
    **celle qui a gagné** ferait comparer à l'œil autre chose que ce que le
    matcher a comparé : sur 祷告 la page grave « E/G♯ » et le premier variant
    de l'accord du `.cho` est « E/Ab », qui n'a pas un glyphe en commun avec
    lui.
    """
    from match import render_fonts, transpose

    path, index, _family = FACES[face]
    # Même géométrie **et même recours** que `build_templates`, et désormais
    # la même définition : montrer un gabarit dessiné autrement que celui qui
    # a servi à lire ferait comparer à l'œil autre chose que ce que le
    # matcher a comparé.
    fonts = render_fonts(path, index)
    out: dict[str, list] = {}
    for chord in vocab:
        variants = []
        for spelling in transpose(chord, semitones):
            for text in spellings(spelling):
                for segments in _gravures(text):
                    bitmap = _render(segments, fonts)
                    if bitmap is None:
                        continue
                    full, head, ratio = signature(bitmap)
                    if full.any() and ratio > 0:
                        variants.append((bitmap, full, head, ratio))
        if variants:
            out[chord] = variants
    return out


def _won(sig, bank: dict[str, list], factor: float):
    """L'accord retenu **et l'imagette du gabarit qui l'a emporté**.

    Même arbitrage que `best_match` — le choix sur le score complet, la
    confiance rendue sans la moitié gauche —, redit ici parce que le matcher
    ne rend que le nom et qu'on veut montrer la forme.
    """
    full, head, ratio = sig
    best = (-9.0, None, -9.0, None)
    for chord, variants in bank.items():
        for bitmap, tfull, thead, tratio in variants:
            plain = float(tfull @ full) - RATIO_WEIGHT * abs(np.log(tratio / (ratio * factor)))
            score = plain + HEAD_WEIGHT * float(thead @ head)
            if score > best[0]:
                best = (score, chord, plain, bitmap)
    return best[2], best[1], best[3]


def plate(slug: str) -> str | None:
    vocab = vocabulary(slug)
    if not vocab:
        return None
    semitones, current = song_semitones(slug), song_face(slug)
    with contextlib.redirect_stderr(io.StringIO()):
        rows = crop_labels(slug)
    cells = [(f["top"], pos[0], bitmap) for f, cs in rows for pos, bitmap in cs]
    if not cells:
        return None
    sigs = [signature(b) for _t, _x, b in cells]

    # Toute la page lue sous les sept fontes, **avant** de choisir ce qu'on
    # montre : la sélection a besoin des scores, et le compteur de
    # publiables les demandait déjà.
    banks, reads = {}, {}
    for name in FACES:
        bank = face_bank(vocab, semitones, name)
        factor = width_factor(sigs, bank)
        jurys = [build_templates(vocab, semitones, p, i)
                 for p, i in jury_faces(name) if os.path.exists(p)]
        jury_k = [width_factor(sigs, b) for b in jurys]
        banks[name] = (bank, factor)
        out = []
        for sig in sigs:
            score, chord = best_match(sig, bank, factor)
            unanimous = all(best_match(sig, b, k)[1] == chord for b, k in zip(jurys, jury_k))
            out.append((chord, score, unanimous))
        reads[name] = out

    # **Ce qu'aucune fonte ne sait lire n'est pas une étiquette.** La
    # planche montrait les amas les plus larges, et sur une page que le
    # matcher ne lit pas — celles pour qui elle est faite — les plus larges
    # sont les arcs de liaison, les crochets de reprise et les paroles :
    # 10 colonnes sur 10 en caractères chinois sur 伯利恒的喜讯, 7 sur 10
    # sur 是你的爱, 6 sur 9 en arcs sur 再一次 (itération 52). La planche
    # était donc la plus muette exactement là où elle servait.
    #
    # Le tri géométrique ne les sépare pas : une suite de caractères chinois
    # a le rapport largeur/hauteur d'un accord (le premier test n'en voyait
    # que 10 %, et zéro sur 伯利恒的喜讯). Le score, lui, les sépare — un arc
    # ou une parole ne corrèle avec aucun gabarit d'aucune fonte.
    best_of = [max(reads[n][i][1] for n in FACES) for i in range(len(cells))]
    order = sorted(range(len(cells)),
                   key=lambda i: (best_of[i] < PLATE_MIN_SCORE, -cells[i][2].shape[1]))
    keep_i = order[:SAMPLE]
    picked = [cells[i] for i in keep_i]
    picked_sigs = [sigs[i] for i in keep_i]

    lines = []
    for name in FACES:
        bank, factor = banks[name]
        shown = _bitmap_bank(vocab, semitones, name)
        read = [reads[name][i][:2] + (reads[name][i][2], _won(sigs[i], shown, factor)[2])
                for i in keep_i]
        # Ce que la fonte publierait sur la page entière : le chiffre qui
        # accompagne la ligne, jamais celui qui décide.
        publiables = sum(keep(sc, un) for _c, sc, un in reads[name])
        lines.append((name, read, publiables))

    ui = ImageFont.truetype(UI, 15)
    small = ImageFont.truetype(UI, 12)
    widths = [max(_fit(b, ROW_H).width for b in
                  [picked[i][2]] + [r[i][3] for _n, r, _p in lines if r[i][3] is not None])
              for i in range(len(picked))]
    col_x, x = [], LABEL_W
    for w in widths:
        col_x.append(x)
        x += w + 18
    width, height = x + 10, (len(lines) + 1) * (ROW_H + 22) + 34

    im = Image.new("RGB", (width, height), "white")
    dr = ImageDraw.Draw(im)
    dr.text((8, 8), f"{slug} · 1=+{semitones} · fonte écrite : {current}", fill="black", font=ui)

    y = 30
    dr.text((8, y + ROW_H // 2 - 8), "GRAVÉ", fill="black", font=ui)
    for i, (_t, _x, bitmap) in enumerate(picked):
        im.paste(_fit(bitmap, ROW_H), (col_x[i], y))
    y += ROW_H + 22

    for name, read, publiables in lines:
        mark = "▶ " if name == current else "  "
        dr.text((8, y + ROW_H // 2 - 14), f"{mark}{name}", fill="black", font=ui)
        dr.text((8, y + ROW_H // 2 + 2), f"   {publiables}/{len(sigs)} publiables",
                fill="#666666", font=small)
        for i, (chord, score, unanimous, bitmap) in enumerate(read):
            if bitmap is not None:
                im.paste(_fit(bitmap, ROW_H), (col_x[i], y))
            colour = "black" if unanimous and score >= 0 else "#999999"
            dr.text((col_x[i], y + ROW_H + 2), f"{chord} {score:+.2f}", fill=colour, font=small)
        y += ROW_H + 22

    os.makedirs(OUT, exist_ok=True)
    dest = os.path.join(OUT, f"_face-{slug}.png")
    im.save(dest)
    return dest


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    inv = [i["slug"] for i in json.load(open(INVENTAIRE, encoding="utf8"))]
    if "--missing" in sys.argv:
        chords = json.load(open(os.path.join(IMAGES, "chords.json"), encoding="utf8"))
        args = [s for s in inv if s not in chords]
    if not args:
        raise SystemExit("Usage: face-plate.py <slug>… | --missing")

    for slug in args:
        try:
            dest = plate(slug)
        except FileNotFoundError:
            continue
        if dest:
            print(f"  {slug:16} → {os.path.basename(dest)}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
