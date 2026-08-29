#!/usr/bin/env python3
"""Pose les accords transposés par-dessus une partition 简谱.

Les chiffres ne bougent jamais : le 简谱 est invariant par transposition,
seuls le libellé `1=X` et les accords changent. On efface donc uniquement
les étiquettes d'accords détectées et on les redessine dans la tonalité
cible, à la même position.

Usage (depuis scripts/jianpu/) :
    python3 overlay.py 何等恩典 A       # rendu en La
    python3 overlay.py 何等恩典 A --diag  # + cadres de contrôle

Sortie : scripts/jianpu/debug/<slug>-<tonalite>.png
"""

from __future__ import annotations

import json
import os
import re
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(HERE, "..", "..", "public", "jianpu")
OUT = os.path.join(HERE, "debug")

SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
# tonalités qui s'écrivent avec des bémols
FLAT_KEYS = {"F", "Bb", "Eb", "Ab", "Db", "Gb", "Dm", "Gm", "Cm", "Fm", "Bbm"}

FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
    "/System/Library/Fonts/Supplemental/Georgia.ttf",
    "/Library/Fonts/Times New Roman.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
]


# Le libellé du titre porte des hanzi (« （D调） ») et des parenthèses pleine
# chasse. Times New Roman ne les couvre pas : sans fonte chinoise le rendu
# de contrôle affiche des tofus, et un contrôle illisible ne contrôle rien.
CJK_CANDIDATES = [
    "/System/Library/Fonts/Hiragino Sans GB.ttc",
    "/System/Library/Fonts/STHeiti Medium.ttc",
    "/System/Library/Fonts/Supplemental/Songti.ttc",
]


def load_font(size: int, cjk: bool = False):
    for path in (CJK_CANDIDATES if cjk else []) + FONT_CANDIDATES:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def note_index(note: str) -> int:
    for table in (SHARP, FLAT):
        if note in table:
            return table.index(note)
    raise ValueError(f"note inconnue : {note}")


def transpose_note(note: str, semitones: int, target_key: str) -> str:
    table = FLAT if target_key in FLAT_KEYS else SHARP
    return table[(note_index(note) + semitones) % 12]


CHORD_RE = re.compile(r"^([A-G][#b]?)(.*)$")


def transpose_chord(chord: str, semitones: int, target_key: str) -> str:
    # Parenthèses (accord optionnel sur la gravure) : transposer le contenu,
    # garder les parenthèses. Elles arrivent **dépareillées** quand une
    # rangée entière est parenthésée — « (Em7 … A7) » se découpe en amas, et
    # le premier porte la parenthèse ouvrante seule. Le client le gère déjà
    # (`transposeChord`, src/lib/transpose.ts) ; sans ça, le rendu de
    # contrôle laissait cet accord dans l'ancienne tonalité alors que la
    # page en production était juste — un faux positif du contrôle, aussi
    # coûteux qu'un vrai défaut manqué.
    if chord.startswith("("):
        return "(" + transpose_chord(chord[1:], semitones, target_key)
    if chord.endswith(")"):
        return transpose_chord(chord[:-1], semitones, target_key) + ")"
    if "/" in chord:
        left, right = chord.split("/", 1)
        return f"{transpose_chord(left, semitones, target_key)}/{transpose_note(right, semitones, target_key)}"
    m = CHORD_RE.match(chord)
    if not m:
        return chord
    root, suffix = m.groups()
    return transpose_note(root, semitones, target_key) + suffix


# Séparateurs d'une étiquette : tout ce qui n'est pas ASCII (les hanzi
# « 或 », « 代替 », « 先 »/« 后 », les crochets pleine chasse 【 】), les blancs
# et la barre de mesure.
LABEL_SPLIT = re.compile(r"([^\x00-\x7f]+|[\s|]+)")

# Ce qui a *la forme* d'un accord, testé sur le jeton entier. Volontairement
# plus strict que `transpose_chord`, qui accepte n'importe quoi derrière la
# fondamentale : ici on découpe une ligne de texte, et il faut pouvoir dire
# « ce jeton n'est pas un accord » — sans quoi le « D » de « D.S. al Fine »
# partirait en « D# ».
CHORD_TOKEN = re.compile(
    r"^\(?[A-G][#b]?(?:maj|min|sus|add|dim|aug|alt|M|m|Δ|ø|°|\+|-)*\d*"
    r"(?:[b#]\d+)?(?:\([b#]?\d+\))?(?:sus\d?|add\d?)?(?:/[A-G][#b]?)?\)?$"
)

# Parenthèses et crochets qui décorent un jeton sans en faire partie.
EDGE_BRACKETS = re.compile(r"^([()\[\]]*)(.*?)([()\[\]]*)$")


def _transpose_run(run: str, semitones: int, target_key: str) -> str:
    if not run:
        return run
    if CHORD_TOKEN.match(run):
        return transpose_chord(run, semitones, target_key)
    # Parenthèse orpheline collée au jeton : le « Dm( » de « Dm(或Bb) ». On
    # ne la pèle qu'en second recours, sinon « Adim(9) » — dont la
    # parenthèse *fait* partie de l'accord — se ferait amputer.
    m = EDGE_BRACKETS.match(run)
    if m:
        lead, core, tail = m.groups()
        if core and CHORD_TOKEN.match(core):
            return lead + transpose_chord(core, semitones, target_key) + tail
    return run


def transpose_label(text: str, semitones: int, target_key: str) -> str:
    """Transpose une **étiquette entière** : une ligne de texte qui contient
    des accords, et pas seulement un accord isolé.

    Le modèle « une étiquette = un accord » ne savait pas rendre ce que les
    gravures écrivent vraiment : `F或F/Eb`, `Gm代替Bb`, `先F后F#dim`, un
    groupe `(F C/E D)` noyé dans une ligne de paroles, une ligne d'intro
    entière `【前奏 | G D/F# | … | D】`. Ces étiquettes-là restaient dans
    l'ancienne tonalité à côté d'accords transposés — une page à deux
    tonalités, ce qui est pire que pas de calque du tout.

    Découper l'image de l'amas ne marche pas (l'arc de liaison soude les
    glyphes, le hanzi colle aux lettres) : on réécrit **le texte entier**,
    jeton par jeton, en laissant verbatim ce qui n'est pas un accord.

    Une étiquette sans séparateur repasse telle quelle par
    `transpose_chord` : les milliers d'étiquettes déjà publiées gardent
    exactement le rendu qu'elles avaient, y compris les formes que la
    grammaire stricte refuserait (`Am(maj7`).

    Miroir exact de `transposeLabel` dans `src/lib/transpose.ts`. Les deux
    doivent bouger ensemble, comme `access.ts` et `firestore.rules`.
    """
    parts = LABEL_SPLIT.split(text)
    if len(parts) == 1:
        return transpose_chord(text, semitones, target_key)
    return "".join(
        part if i % 2 else _transpose_run(part, semitones, target_key)
        for i, part in enumerate(parts)
    )


def render(slug: str, target_key: str, diag: bool = False) -> str:
    """Rend le calque **tel que le client le rendra**.

    La source est `public/jianpu/chords.json`, pas la vérité terrain : c'est
    exactement ce que le navigateur reçoit, donc le seul contrôle qui dise
    quelque chose sur ce que verra l'utilisateur.
    """
    data = json.load(open(os.path.join(IMAGES, "chords.json"), encoding="utf8"))
    entry = data.get(slug)
    if not entry:
        raise SystemExit(f"pas de calque pour {slug} — lancer build-chords.py")
    semitones = (note_index(target_key) - note_index(entry["printedKey"])) % 12

    path = os.path.join(IMAGES, f"{slug}-p1.webp")
    im = Image.open(path).convert("RGB")
    dr = ImageDraw.Draw(im)

    # La taille PIL est un cadratin : la hauteur de capitale n'en fait
    # qu'environ 70 %. Pour retrouver l'oeil de l'original il faut donc
    # demander nettement plus que la hauteur de rangée.
    font = load_font(int(entry["labelH"] * 1.35))
    # Une étiquette qui porte un hanzi (« F或F/Eb », « Gm代替Bb ») ne se
    # trace pas dans Times New Roman : le contrôle afficherait des tofus, et
    # un contrôle illisible ne contrôle rien. Même raison que pour le
    # libellé de titre, même fonte de repli.
    font_cjk = load_font(int(entry["labelH"] * 1.35), cjk=True)
    for label in entry["labels"]:
        x0, y0 = label["x"], label["y"]
        x1, y1 = x0 + label["w"] - 1, y0 + label["h"] - 1
        # Efface l'étiquette d'origine. On monte plus haut qu'on ne
        # descend : les dièses et les exposants (maj7, add2) dépassent
        # par le haut, alors que sous la rangée commencent les chiffres.
        dr.rectangle([x0 - 3, y0 - 9, x1 + 4, y1 + 2], fill=(255, 255, 255))
        # Calage sur la ligne de base, pas sur le haut du cadre.
        text = transpose_label(label["c"], semitones, target_key)
        dr.text(
            (x0, y1),
            text,
            font=font_cjk if any(ord(ch) > 127 for ch in text) else font,
            fill=(0, 0, 0),
            anchor="ls",
        )
        if diag:
            dr.rectangle([x0 - 3, y0 - 3, x1 + 3, y1 + 3], outline=(37, 99, 235), width=1)

    # Le libellé « 1=X » suit la transposition, comme chez le client
    # (JianpuSheet). Sans lui, le rendu de contrôle validait les accords
    # mais laissait le cadre du libellé invisible — on ne pouvait pas voir
    # un cadre mal mesuré avant le navigateur.
    kl = entry.get("keyLabel")
    if kl:
        x0, y0 = kl["x"], kl["y"]
        x1, y1 = x0 + kl["w"] - 1, y0 + kl["h"] - 1
        dr.rectangle([x0 - 3, y0 - 4, x1 + 4, y1 + 2], fill=(255, 255, 255))
        dr.text((x0, y1), f"1={target_key}",
                font=load_font(int(kl["h"] * 1.1)), fill=(0, 0, 0), anchor="ls")
        if diag:
            dr.rectangle([x0 - 3, y0 - 4, x1 + 4, y1 + 2], outline=(220, 38, 38), width=1)

    # La tonalité répétée dans le titre — « （D调） » — décrit cette page-ci
    # et suit donc la transposition, au même titre que « 1=X ».
    tk = entry.get("titleKey")
    if tk:
        x0, y0 = tk["x"], tk["y"]
        x1, y1 = x0 + tk["w"] - 1, y0 + tk["h"] - 1
        dr.rectangle([x0 - 3, y0 - 4, x1 + 4, y1 + 3], fill=(255, 255, 255))
        dr.text((x0, y1), f"（{target_key}调）",
                font=load_font(int(tk["h"] * 0.78), cjk=True), fill=(0, 0, 0), anchor="ls")
        if diag:
            dr.rectangle([x0 - 3, y0 - 4, x1 + 4, y1 + 3], outline=(220, 38, 38), width=1)

    os.makedirs(OUT, exist_ok=True)
    dest = os.path.join(OUT, f"{slug}-{target_key}.png")
    im.save(dest)
    print(f"  {slug} : {entry['printedKey']} → {target_key} ({semitones:+d} demi-tons) · "
          f"{len(entry['labels'])} accords posés → debug/{os.path.basename(dest)}")
    return dest


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) < 2:
        raise SystemExit("Usage: overlay.py <slug> <tonalité cible> [--diag]")
    render(args[0], args[1], diag="--diag" in sys.argv)
