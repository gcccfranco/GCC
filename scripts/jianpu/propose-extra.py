#!/usr/bin/env python3
"""Propose des étiquettes hors rangées pour lecture à l'œil.

Le repêchage automatique a été essayé et rejeté (LOOP.md, itération 10) :
le contrôle visuel a montré un « C » lu +0,42 dans une rangée qui n'en
contient pas (明亮晨星), un « Bm » unanime à +0,73 posé sur un G/B
(我心坚定与你), des chiffres de mélodie lus « G » à +0,49 (赞美之泉) et le
libellé « 1=D » lu « D » à +0,70. Ni le score, ni l'unanimité du jury, ni
la géométrie de rangée ne séparent proprement les vrais des faux.

Ce script applique donc un pré-filtre (score ≥ SAFE_SCORE, au moins deux
lectures sûres dans la rangée, rangée pas plus haute que 1,5 fois la
hauteur d'étiquette du chant) puis émet, pour **chaque** étiquette
candidate, un zoom de l'amas scanné avec l'accord proposé à côté. Un
humain lit les zooms et recopie les étiquettes approuvées dans
`gold/<slug>.json` sous `extra_labels` — c'est cette liste-là, et rien
d'automatique, que `build-chords.py` publie.

Le pré-filtre est fait pour *limiter le volume* quand on ratisse le
corpus. Sur un chant qu'on est en train de certifier, il devient une gêne :
il tait précisément les amas que le matcher ne sait pas lire, qui sont
justement ceux qu'il reste à lire. `--all` le désactive et rend **tout ce
qui n'est pas encore couvert** dans les rangées où le calque publie déjà,
score ou pas. Ce que `--all` ne montre pas, ce sont les rangées jamais
détectées (mode D) : celles-là se voient sur `audit-page.py`, et se
mesurent ensuite à la main.

Usage (depuis GCCLouange/) :
    python3 scripts/jianpu/propose-extra.py            # tout le corpus
    python3 scripts/jianpu/propose-extra.py <slug>     # un chant
    python3 scripts/jianpu/propose-extra.py <slug> --all   # + le reste à lire

Sortie : scripts/jianpu/debug/_extra-<n>.png (zooms)
         scripts/jianpu/debug/_extra-proposals.json (boîtes exactes)
"""

from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

from classify import classify, load_params  # noqa: E402
from match import (  # noqa: E402
    JURY, MIN_SCORE, best_match, build_templates, signature, vocabulary,
)
from segment import INK_THRESHOLD  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(HERE, "..", "..", "public", "jianpu")
OUT = os.path.join(HERE, "debug")

# Sous ce score, on a observé des faux (hanzi à +0,41, chiffres à +0,34).
# Au-dessus aussi (+0,73 !) — d'où la lecture à l'œil ; le seuil ne sert
# qu'à limiter le volume à relire.
SAFE_SCORE = 0.42
MAX_H_RATIO = 1.5
MIN_ROW_MATCHES = 2


def propose(slug: str, entry: dict, everything: bool = False) -> list[dict]:
    path = os.path.join(IMAGES, f"{slug}-p1.webp")
    covered = {(l["y"], l["x"]) for l in entry["labels"]}
    # En mode `--all`, on ne garde que les rangées où le calque a déjà posé
    # quelque chose. Sans cette borne, toute la page entre : hanzi, chiffres,
    # crédits — de quoi noyer les quelques amas qui comptent.
    published = {l["y"] for l in entry["labels"]}
    ink = np.asarray(Image.open(path).convert("L")) < INK_THRESHOLD
    _ink, _w, feats, kinds = classify(path)
    page_h = max(f["bottom"] for f in feats) if feats else 0
    floor = load_params()["min_top_frac"] * page_h
    templates = build_templates(vocabulary(slug))
    jury = [build_templates(vocabulary(slug), 0, p) for p in JURY if os.path.exists(p)]

    out = []
    for f in feats:
        if f["top"] < floor:
            continue
        # Rangée haute : elle mêle des accords et de la musique (ligatures,
        # arcs, chiffres). On ne la saute plus — c'est exactement le cas de
        # 不停赞美, dont un système entier est resté dans l'ancienne tonalité
        # parce que sa rangée d'accords portait aussi des ligatures et se
        # retrouvait typée `numbers`, invisible partout (itération 13). On
        # cale alors chaque étiquette sur **le bloc d'encre supérieur de ses
        # propres colonnes** : le haut d'une rangée n'est pas le haut de ses
        # lettres, et une boîte héritée des bornes de la rangée mange le
        # haut des chiffres.
        if everything and f["top"] not in published:
            continue
        tall = f["height"] > MAX_H_RATIO * entry["labelH"]
        row = []
        for x0, x1 in f["clusters"]:
            if (f["top"], x0) in covered:
                continue
            top, bottom = f["top"], f["bottom"]
            if tall:
                band = _top_block(ink, top, bottom, x0, x1, entry["labelH"])
                if band is None:
                    continue
                top, bottom = band
            sub = ink[top : bottom + 1, x0 : x1 + 1]
            ys, xs = np.where(sub.any(1))[0], np.where(sub.any(0))[0]
            if not len(ys) or not len(xs):
                continue
            sig = signature(sub[ys[0] : ys[-1] + 1, xs[0] : xs[-1] + 1])
            score, chord = best_match(sig, templates)
            if everything or (score >= SAFE_SCORE
                              and all(best_match(sig, t)[1] == chord for t in jury)):
                row.append({"x": int(x0), "y": int(top), "w": int(x1 - x0 + 1),
                            "h": int(bottom - top + 1), "c": chord,
                            "score": round(float(score), 2)})
        if everything or len(row) >= MIN_ROW_MATCHES:
            out.extend(row)
    return out


def _top_block(ink, top: int, bottom: int, x0: int, x1: int, label_h: int):
    """Premier bloc d'encre continu des colonnes `x0..x1`, s'il a la taille
    d'une étiquette. Rend `None` si le bloc déborde — l'amas est alors de la
    musique, pas un accord."""
    prof = ink[top : bottom + 1, x0 : x1 + 1].any(axis=1)
    ys = np.where(prof)[0]
    if not len(ys):
        return None
    start = ys[0]
    end = start
    for y in ys[1:]:
        if y - end > 2:
            break
        end = y
    h = end - start + 1
    if not (0.6 * label_h <= h <= 1.6 * label_h):
        return None
    return top + start, top + end


def main() -> int:
    chords = json.load(open(os.path.join(IMAGES, "chords.json"), encoding="utf8"))
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    everything = "--all" in sys.argv
    only = args[0] if args else None
    if everything and not only:
        raise SystemExit("--all se lance sur un chant : propose-extra.py <slug> --all")
    proposals = {}
    for slug, entry in sorted(chords.items()):
        if only and slug != only:
            continue
        rows = propose(slug, entry, everything)
        if rows:
            proposals[slug] = rows
            print(f"  {slug:16} {len(rows)} étiquette(s) proposée(s)")

    os.makedirs(OUT, exist_ok=True)
    json.dump(proposals, open(os.path.join(OUT, "_extra-proposals.json"), "w", encoding="utf8"),
              ensure_ascii=False, indent=0)

    # Zooms : l'amas scanné (contexte ± 60 px), l'accord proposé à droite.
    CELL_W, CELL_H, ZOOM = 700, 96, 2.2
    cells = []
    for slug, rows in proposals.items():
        img = Image.open(os.path.join(IMAGES, f"{slug}-p1.webp")).convert("RGB")
        for n, l in enumerate(rows):
            cx0 = max(0, l["x"] - 60)
            cx1 = min(img.width, l["x"] + l["w"] + 60)
            cy0 = max(0, l["y"] - 8)
            cy1 = min(img.height, l["y"] + l["h"] + 8)
            crop = img.crop((cx0, cy0, cx1, cy1))
            crop = crop.resize((int(crop.width * ZOOM), int(crop.height * ZOOM)), Image.LANCZOS)
            cell = Image.new("RGB", (CELL_W, CELL_H), "white")
            cell.paste(crop, (0, max(0, (CELL_H - crop.height) // 2)))
            d = ImageDraw.Draw(cell)
            # cadre rouge autour de l'amas visé, dans le repère du zoom
            bx0 = (l["x"] - cx0) * ZOOM
            bx1 = (l["x"] + l["w"] - cx0) * ZOOM
            by0 = max(1, (l["y"] - cy0) * ZOOM - 2)
            by1 = min(CELL_H - 2, (l["y"] + l["h"] - cy0) * ZOOM + 2)
            d.rectangle([bx0 - 2, by0, bx1 + 2, by1], outline=(220, 38, 38), width=2)
            d.rectangle([CELL_W - 190, 0, CELL_W, CELL_H], fill=(245, 245, 245))
            d.text((CELL_W - 180, 12), f"{slug}", fill=(0, 0, 0))
            d.text((CELL_W - 180, 34), f"#{n} y={l['y']} x={l['x']}", fill=(0, 0, 0))
            d.text((CELL_W - 180, 56), f"lit : {l['c']}  {l['score']:+.2f}", fill=(185, 28, 28))
            cells.append(cell)

    PER_PAGE = 20
    for p in range(0, len(cells), PER_PAGE):
        batch = cells[p : p + PER_PAGE]
        page = Image.new("RGB", (CELL_W, CELL_H * len(batch)), "white")
        for i, c in enumerate(batch):
            page.paste(c, (0, i * CELL_H))
        page.save(os.path.join(OUT, f"_extra-{p // PER_PAGE + 1}.png"))

    total = sum(len(r) for r in proposals.values())
    print(f"✓ {total} étiquettes à relire → debug/_extra-N.png + _extra-proposals.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
