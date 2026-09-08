#!/usr/bin/env python3
"""Cherche les cadres « 1=X » **gravés dans la portée**, pas dans l'en-tête.

`measure-keylabel.py` ne regarde que le haut de page à gauche (30 % × 45 %),
et `chords.json` ne tient **qu'un** `keyLabel` par page : ce qu'une gravure
écrit au milieu d'un système, à la mesure où le morceau change de ton, n'est
donc lu par personne. Ni le matcher (« 1= G » n'est pas un accord), ni la
couverture (l'amas n'est dans aucune rangée d'accords), ni le banc de
transposition (il ne juge que les étiquettes publiées) ne le voient.

C'est pourtant le pire cas nommé depuis l'itération 15 : la page transposée
annonce `1=Ab` en tête et `1=G` au milieu — **deux tonalités sur la même
page**, et celle du milieu est fausse. Trouvé à l'œil sur 我们的神 et
旷野中唯一的力量 (itération 40), les deux le portant à la reprise du dernier
refrain.

La méthode est celle de l'itération 35 : on s'ancre sur le glyphe « = »,
seul invariant du libellé, et on prend le voisin de gauche et celui de
droite sur la même ligne. Ici la fenêtre est la **page entière** au lieu du
coin haut-gauche, et l'on écarte :

- ce qui tombe dans le `keyLabel` déjà publié (c'est le cadre de l'en-tête) ;
- ce qu'une étiquette du calque couvre déjà ;
- les candidates dont le voisin de gauche n'est pas un « 1 » — la ligne de
  tempo « ♩=NN » et les fractions y tombent.

Rien n'est écrit : l'œil lit la planche, puis recopie le cadre retenu dans
`gold/<slug>.json` sous `extra_labels`, avec le texte gravé (« 1= G ») et
un `fh` mesuré sur la hauteur de capitale. `transposeLabel` réécrit alors le
seul jeton qui est un accord.

Usage (depuis GCCLouange/) :
    python3 scripts/jianpu/inline-key.py            # tout le corpus à calque
    python3 scripts/jianpu/inline-key.py <slug>…

Sortie : scripts/jianpu/debug/_inline-key-<n>.png
"""

from __future__ import annotations

import importlib.util
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

from match import (  # noqa: E402
    FACES, best_match, build_templates, signature, song_face,
)
# `measure-keylabel.py` porte un tiret : on le charge par chemin, comme
# `apply-sweep.py` le fait pour `sweep-key.py`.
_spec = importlib.util.spec_from_file_location(
    "measure_keylabel", os.path.join(os.path.dirname(os.path.abspath(__file__)), "measure-keylabel.py"))
_mk = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mk)
DIGITS, LETTERS, _neighbour, equals = _mk.DIGITS, _mk.LETTERS, _mk._neighbour, _mk.equals

# `_hbars` ne balaie que les 380 premières colonnes : le libellé de
# l'en-tête n'est jamais loin de la marge (`EQ_MAX_X`). Un « 1= G » gravé au
# milieu d'un système est à mille pixels de là, et cette borne — invisible
# depuis `equals`, qui prend le défaut — le faisait disparaître avant tout
# test. On rend donc la largeur entière à la fonction que `equals` appelle.
_mk._hbars_orig = _mk._hbars
_mk._hbars = lambda win, **kw: _mk._hbars_orig(win, max_x=win.shape[1], **kw)
from segment import INK_THRESHOLD  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(HERE, "..", "..", "public", "jianpu")
OUT = os.path.join(HERE, "debug")
CHORDS = os.path.join(IMAGES, "chords.json")

PER_SHEET = 12


def _covered(box, boxes, pad=6):
    x, y, w, h = box["x"], box["y"], box["w"], box["h"]
    for b in boxes:
        if (x < b["x"] + b["w"] + pad and x + w + pad > b["x"]
                and y < b["y"] + b["h"] + pad and y + h + pad > b["y"]):
            return True
    return False


def scan(slug: str, entry: dict):
    path = os.path.join(IMAGES, f"{slug}-p1.webp")
    if not os.path.exists(path):
        return []
    ink = np.asarray(Image.open(path).convert("L")) < INK_THRESHOLD

    font_path, index, _family = FACES[song_face(slug)]
    t_let = build_templates(LETTERS, 0, font_path, index)
    t_dig = build_templates(DIGITS, 0, font_path, index)

    known = list(entry.get("labels", []))
    if entry.get("keyLabel"):
        known.append(entry["keyLabel"])

    out = []
    for eq in equals(ink):
        left = _neighbour(ink, eq, "L")
        if left is None:
            continue
        line_h = max(left[3] - left[1] + 1, eq[3])
        right = _neighbour(ink, eq, "R", gapmax=1.6 * line_h)
        if right is None:
            continue

        # Le voisin de gauche doit être un « 1 » : c'est ce qui sépare le
        # libellé de tonalité de la ligne de tempo « ♩=NN » et des chiffrages.
        sub_l = ink[left[1]:left[3] + 1, left[0]:left[2] + 1]
        if sub_l.size == 0:
            continue
        s_dig_l, digit = best_match(signature(sub_l), t_dig)
        s_let_l, _ = best_match(signature(sub_l), t_let)
        if digit != "1" or s_dig_l < s_let_l:
            continue

        sub_r = ink[right[1]:right[3] + 1, right[0]:right[2] + 1]
        if sub_r.size == 0:
            continue
        # Le vote lettre/chiffre du voisin de droite est **imprimé, jamais
        # décisif** : c'est la leçon de l'itération 35. Un « G » se lit « 0 »
        # à +0,05 contre −0,01 — le filtre qui semblait sûr écartait
        # justement le libellé de 旷野中唯一的力量.
        s_let, letter = best_match(signature(sub_r), t_let)
        s_dig, _ = best_match(signature(sub_r), t_dig)

        top = min(left[1], right[1], eq[1])
        bottom = max(left[3], right[3], eq[1] + eq[3] - 1)
        box = {"x": int(left[0]), "y": int(top),
               "w": int(right[2] - left[0] + 1), "h": int(bottom - top + 1)}
        if _covered(box, known):
            continue
        out.append({"box": box, "lettre": letter,
                    "vote": round(float(s_let - s_dig), 2),
                    "cap": int(bottom - top + 1)})
    return out


def _planches(rows):
    sheets, cells = [], []
    for slug, r in rows:
        b = r["box"]
        img = Image.open(os.path.join(IMAGES, f"{slug}-p1.webp")).convert("RGB")
        x0, y0 = max(0, b["x"] - 30), max(0, b["y"] - 20)
        x1, y1 = min(img.width, b["x"] + b["w"] + 120), min(img.height, b["y"] + b["h"] + 20)
        crop = img.crop((x0, y0, x1, y1))
        z = max(1, 200 // max(1, crop.height))
        crop = crop.resize((crop.width * z, crop.height * z), Image.LANCZOS)
        d = ImageDraw.Draw(crop)
        d.rectangle([(b["x"] - x0) * z, (b["y"] - y0) * z,
                     (b["x"] + b["w"] - x0) * z, (b["y"] + b["h"] - y0) * z],
                    outline=(220, 0, 0), width=2)
        cells.append((slug, r, crop))
    for i in range(0, len(cells), PER_SHEET):
        sheets.append(cells[i:i + PER_SHEET])

    for n, sheet in enumerate(sheets, 1):
        W = max(c.width for _s, _r, c in sheet) + 420
        H = sum(c.height + 12 for _s, _r, c in sheet) + 12
        page = Image.new("RGB", (W, H), "white")
        d = ImageDraw.Draw(page)
        y = 6
        for slug, r, c in sheet:
            page.paste(c, (6, y))
            b = r["box"]
            d.text((c.width + 16, y + 6),
                   f"{slug}  1={r['lettre']}  vote {r['vote']:+.2f}", fill="black")
            d.text((c.width + 16, y + 22),
                   f'x={b["x"]} y={b["y"]} w={b["w"]} h={b["h"]}  (fh≈{r["cap"]})', fill=(90, 90, 90))
            y += c.height + 12
        out = os.path.join(OUT, f"_inline-key-{n}.png")
        page.save(out)
        print(f"→ {out}")


def main() -> int:
    chords = json.load(open(CHORDS, encoding="utf8"))
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    slugs = args or sorted(chords)
    rows = []
    for slug in slugs:
        if slug not in chords:
            continue
        for r in scan(slug, chords[slug]):
            rows.append((slug, r))
    if not rows:
        print("aucune candidate")
        return 0
    print(f"{len(rows)} candidate(s) sur {len({s for s, _ in rows})} page(s)")
    for slug, r in rows:
        b = r["box"]
        print(f"  {slug:20} 1={r['lettre']}  x={b['x']} y={b['y']} "
              f"w={b['w']} h={b['h']}  vote {r['vote']:+.2f}")
    _planches(rows)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
