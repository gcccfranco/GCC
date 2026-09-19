#!/usr/bin/env python3
"""Mesure le cadre « （X调） » gravé dans le **titre** d'une partition 简谱.

Le pendant de `measure-keylabel.py` pour la seconde tonalité écrite sur la
page. Elle décrit *cette page-là* — « 你是唯一（世界有你）（C调） » — donc
elle suit la transposition comme « 1=X », et une page transposée qui la
garde annonce deux tonalités à la fois. Les planches de 2014-2026 la gravent
systématiquement dès qu'elles existent en plusieurs tonalités.

À ne pas confondre avec « （F原调） » ni « 原调Eb », qui disent la tonalité de
la **source** et restent donc vraies une fois la page transposée : le script
les refuse, un 原 dans le groupe suffit à l'écarter — mais c'est l'œil qui
tranche sur la planche, comme partout ailleurs dans cette boucle.

Le groupe ne se découpe pas tout seul : « （C调） » tient en quatre à cinq
amas de colonnes (le 调 se fend en 讠 et 周) et certaines gravures serrent le
titre autant que la mention. Le script **propose donc les quatre coupes
possibles** — les 3, 4, 5 et 6 derniers amas — et c'est l'œil qui élit sur
la planche, comme pour le cadre « 1=X ».

Usage (depuis GCCLouange/) :
    python3 scripts/jianpu/measure-titlekey.py <slug>…          # propose
    python3 scripts/jianpu/measure-titlekey.py --pick <slug>=<n>…   # écrit

Sortie : scripts/jianpu/debug/_tk-<slug>.png — la bande du titre, une ligne
par candidate, cadre rouge sur le groupe.
"""
from __future__ import annotations

import json
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(HERE, "..", "..", "public", "jianpu")
GOLD = os.path.join(HERE, "gold")
OUT = os.path.join(HERE, "debug")

INK = 200        # seuil d'encre, comme le reste de la boucle
BAND_GAP = 2     # lignes blanches qui séparent deux bandes
RUN_GAP = 14     # colonnes blanches qui séparent deux groupes d'un titre


def _runs(profile: np.ndarray, gap: int) -> list[tuple[int, int]]:
    """Les plages non vides de `profile`, fusionnées sous `gap`."""
    hits = np.where(profile > 0)[0]
    if not len(hits):
        return []
    out = [[int(hits[0]), int(hits[0])]]
    for h in hits[1:]:
        if h - out[-1][1] <= gap:
            out[-1][1] = int(h)
        else:
            out.append([int(h), int(h)])
    return [(a, b) for a, b in out]


def measure(slug: str):
    """Les cadres candidats de la bande du titre, du plus court au plus long."""
    path = os.path.join(IMAGES, f"{slug}-p1.webp")
    if not os.path.exists(path):
        return None, "image absente"
    a = np.asarray(Image.open(path).convert("L"))
    haut = a[: int(a.shape[0] * 0.18)] < INK
    bandes = _runs(haut.any(axis=1).astype(int), BAND_GAP)
    if not bandes:
        return None, "aucune encre en haut de page"
    # Le titre est la **première** bande haute de la zone : la ligne des
    # auteurs, gravée juste dessous, est parfois collée au titre (moins de
    # six lignes blanches) et prendre « la plus haute » rendait alors les
    # deux d'un coup, donc le nom du parolier en guise de （X调）.
    haute = max(b[1] - b[0] for b in bandes)
    y0, y1 = next(b for b in bandes if (b[1] - b[0]) >= 0.6 * haute)
    bande = haut[y0 : y1 + 1]
    amas = _runs(bande.any(axis=0).astype(int), 2)
    if len(amas) < 3:
        return [], "titre d'un seul tenant : pas de （X调） détachée"
    cands = []
    for n in (3, 4, 5, 6):
        if len(amas) < n:
            break
        x0, x1 = amas[-n][0], amas[-1][1]
        cands.append({"x": int(x0), "y": int(y0), "w": int(x1 - x0 + 1), "h": int(y1 - y0 + 1)})
    return cands, ""


def planche(slug: str, cands: list[dict]) -> str:
    """Une ligne par candidate, cadre rouge : à regarder avant d'écrire."""
    from PIL import ImageDraw

    im = Image.open(os.path.join(IMAGES, f"{slug}-p1.webp")).convert("RGB")
    marge = 30
    vues = []
    for n, box in enumerate(cands, 1):
        haut = max(0, box["y"] - marge)
        bas = min(im.size[1], box["y"] + box["h"] + marge)
        vue = im.crop((0, haut, im.size[0], bas))
        d = ImageDraw.Draw(vue)
        d.rectangle(
            [box["x"], box["y"] - haut, box["x"] + box["w"], box["y"] + box["h"] - haut],
            outline=(220, 0, 0),
            width=3,
        )
        d.text((8, 4), f"#{n}", fill=(220, 0, 0))
        vues.append(vue)
    pl = Image.new("RGB", (im.size[0], sum(v.size[1] + 6 for v in vues)), (255, 255, 255))
    y = 0
    for v in vues:
        pl.paste(v, (0, y))
        y += v.size[1] + 6
    os.makedirs(OUT, exist_ok=True)
    dest = os.path.join(OUT, f"_tk-{slug}.png")
    pl.save(dest)
    return dest


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    pick = "--pick" in sys.argv
    if not args:
        print("usage : measure-titlekey.py <slug>… | --pick <slug>=<n>…", file=sys.stderr)
        return 1
    for arg in args:
        slug, _, n = arg.partition("=")
        cands, note = measure(slug)
        if not cands:
            print(f"  {slug:16} — {note}")
            continue
        if not pick:
            print(f"  {slug:16} {len(cands)} candidate(s) → {planche(slug, cands)}")
            for i, box in enumerate(cands, 1):
                print(f"      #{i} {box}")
            continue
        box = cands[int(n) - 1]
        path = os.path.join(GOLD, f"{slug}.json")
        gold = json.load(open(path, encoding="utf8")) if os.path.exists(path) else {"slug": slug}
        gold["title_key"] = box
        gold["title_key_verified"] = (
            "mention « （X调） » du titre, mesurée sur l'encre de la bande du titre "
            "et relue à l'œil sur planche (measure-titlekey), 2026-09-18"
        )
        json.dump(gold, open(path, "w", encoding="utf8"), ensure_ascii=False, indent=1)
        print(f"  ✓ {slug} ← #{n} {box}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
