#!/usr/bin/env python3
"""Rend la classification des rangées en images annotées, pour contrôle à l'œil.

Sans ça, la boucle ne produit que des nombres — impossible de la
contredire. Ici chaque rangée détectée est encadrée dans sa couleur, et
chaque étiquette d'accord est entourée individuellement : on voit d'un
coup ce qui est trouvé, ce qui est raté et ce qui est inventé.

    bleu    accords   (avec un cadre fin par étiquette)
    rouge   chiffres
    vert    paroles
    gris    non classé

Usage (depuis scripts/jianpu/) :
    python3 debug-render.py                 # le jeu de contrôle
    python3 debug-render.py 何等恩典 爱赢了   # des chants précis

Sortie : scripts/jianpu/debug/<slug>.png
"""

from __future__ import annotations

import os
import sys

from PIL import Image, ImageDraw

from classify import classify

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(HERE, "..", "..", "public", "jianpu")
OUT = os.path.join(HERE, "debug")

GOLD = [
    "何等恩典",
    "齐来赞美",
    "主的喜乐是我力量",
    "我心坚定与你",
    "爱赢了",
    "献上尊荣",
    "你们要赞美耶和华",
]

COLORS = {
    "chords": (37, 99, 235),
    "numbers": (185, 28, 28),
    "lyrics": (22, 128, 60),
    "?": (150, 150, 150),
    "noise": (220, 220, 220),
}


def render(slug: str) -> str | None:
    path = os.path.join(IMAGES, f"{slug}-p1.webp")
    if not os.path.exists(path):
        print(f"  ABSENT {slug}")
        return None

    _ink, width, feats, kinds = classify(path)
    im = Image.open(path).convert("RGB")
    dr = ImageDraw.Draw(im)

    counts: dict[str, int] = {}
    for f, kind in zip(feats, kinds):
        counts[kind] = counts.get(kind, 0) + 1
        color = COLORS.get(kind, (0, 0, 0))
        dr.rectangle([2, f["top"], width - 3, f["bottom"]], outline=color, width=2)
        dr.text((6, max(0, f["top"] - 12)), kind, fill=color)
        if kind == "chords":
            for x0, x1 in f["clusters"]:
                dr.rectangle([x0 - 2, f["top"] - 2, x1 + 2, f["bottom"] + 2], outline=color, width=1)

    os.makedirs(OUT, exist_ok=True)
    dest = os.path.join(OUT, f"{slug}.png")
    im.save(dest)
    labels = sum(f["n_clusters"] for f, k in zip(feats, kinds) if k == "chords")
    print(f"  {slug:16} accords={counts.get('chords', 0):2} étiquettes={labels:3} → debug/{slug}.png")
    return dest


STRIP_W = 1500
PAD = 6


def _strip(im, top, bottom, width):
    crop = im.crop((0, max(0, top - PAD), width, bottom + PAD))
    scale = STRIP_W / crop.width
    return crop.resize((STRIP_W, max(1, int(crop.height * scale))), Image.LANCZOS)


def sheet(slugs):
    """Planche de contrôle : les deux modes d'erreur, en une image.

    A — toute rangée déclarée « accords ». Une seule qui n'en est pas =
        faux positif, donc des accords redessinés au mauvais endroit.
    B — toute rangée « ? » située juste au-dessus d'une rangée de chiffres.
        Ce sont les rangées d'accords candidates que le classifieur a
        laissé filer.

    Sans cette planche, la boucle mesure ce qu'elle a déjà décidé de
    regarder : c'est ainsi qu'un score de 18/18 a coexisté avec un
    en-tête mal classé et une ligne d'intro entièrement ratée.
    """
    claimed, missed = [], []
    for slug in slugs:
        path = os.path.join(IMAGES, f"{slug}-p1.webp")
        if not os.path.exists(path):
            continue
        _ink, width, feats, kinds = classify(path)
        im = Image.open(path).convert("RGB")
        for i, (f, kind) in enumerate(zip(feats, kinds)):
            if kind == "chords":
                claimed.append((slug, f, _strip(im, f["top"], f["bottom"], width)))
            elif kind == "?":
                j = i + 1
                while j < len(kinds) and kinds[j] == "noise":
                    j += 1
                if j < len(kinds) and kinds[j] == "numbers":
                    missed.append((slug, f, _strip(im, f["top"], f["bottom"], width)))

    rows_out = []
    for title, group, color in (
        (f"A — DECLAREES ACCORDS ({len(claimed)})  toute rangee qui n'en est pas = faux positif", claimed, (37, 99, 235)),
        (f"B — CANDIDATES RATEES ({len(missed)})  rangee ? juste au-dessus des chiffres", missed, (200, 120, 0)),
    ):
        rows_out.append(("title", title, color, None))
        for slug, f, strip in group:
            rows_out.append(("strip", f"{slug}  y={f['top']}  n={f['n_clusters']}  ratio={f['ratio']:.2f}", color, strip))

    height = sum(28 if k == "title" else s.height + 22 for k, _l, _c, s in rows_out) + 20
    out = Image.new("RGB", (STRIP_W + 20, height), "white")
    dr = ImageDraw.Draw(out)
    y = 10
    for kind, label, color, strip in rows_out:
        if kind == "title":
            dr.rectangle([6, y, STRIP_W + 14, y + 22], fill=color)
            dr.text((12, y + 6), label, fill=(255, 255, 255))
            y += 28
        else:
            dr.text((12, y), label, fill=color)
            out.paste(strip, (10, y + 16))
            dr.rectangle([10, y + 16, 10 + STRIP_W - 1, y + 15 + strip.height], outline=color)
            y += strip.height + 22

    os.makedirs(OUT, exist_ok=True)
    dest = os.path.join(OUT, "_planche.png")
    out.save(dest)
    print(f"\n  planche → debug/_planche.png   A={len(claimed)} declarees · B={len(missed)} ratees")
    return dest


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--sheet"]
    names = args or GOLD
    for name in names:
        render(name)
    sheet(names)
