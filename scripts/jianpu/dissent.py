#!/usr/bin/env python3
"""Les étiquettes publiées sur lesquelles les fontes ne s'accordent pas.

Le mode C — une étiquette retenue mais mal lue — est le seul défaut qui
**abîme** la partition, et le seul qu'aucun compteur ne voit : il compte
comme une réussite. Deux itérations l'ont attrapé, chaque fois par l'œil et
chaque fois par hasard (脚步, 唯独依靠你).

Le jury de `match.py` ne suffit pas à le débusquer, et pour une raison
structurelle : il ne convoque que la **famille** de la fonte élue. Trois
grasses jugeant une page grasse se trompent ensemble, et l'unanimité
certifie alors la faute — c'est exactement ce qui a publié `F#m7` là où
唯独依靠你 imprime `C#m7`, jury unanime.

Ce script convoque **toutes** les fontes du banc, hors famille comprise, et
ne décide rien : il classe les étiquettes publiées par le **désaccord**
qu'elles suscitent. Une étiquette que six fontes sur sept lisent autrement
que la fonte élue n'est pas forcément fausse — mais c'est là qu'il faut
regarder, et le zoom est produit à côté.

Essayé et rejeté avant d'en arriver là (itération 24) : deviner la famille
d'après l'image. Ni la part d'encre dans la boîte (6 certifiés sur 12 en
désaccord) ni l'épaisseur des fûts (10 sur 12) ne séparent les familles —
sur ces scans, à 20-30 px de hauteur d'étiquette, la graisse ne survit pas
à la numérisation. L'apparence ne dira pas la fonte ; seule la lecture le
peut.

Un second soupçon, d'une autre nature (itération 25). Le désaccord entre
fontes ne voit pas les **parasites** — un amas qui n'est pas une étiquette
du tout. Devant un arc de liaison, les sept fontes tombent d'accord sur la
même absurdité, donc le désaccord est nul. Ce qui les trahit est ailleurs :
un parasite est **seul** dans sa rangée. Une vraie rangée d'accords en
publie plusieurs ; une écharde en publie un, tiré d'une liaison ou d'un
crochet de reprise. `--isolated` classe donc les étiquettes publiées seules
(ou par deux) dans une rangée qui compte au moins trois amas. Sur 36 zooms
relus : deux arcs de liaison publiés comme accords sur 再次将我更新, et le
mot « Fill » du titre anglais de 求主充满我 publié `Em`.

**Le zoom montre le glyphe imprimé, pas le nom publié.** Les deux diffèrent
dès que la page n'est pas gravée dans la tonalité de son `.cho` : sur
永恒唯一的盼望 (`.cho` en fa, page en mi) le calque publie `C` là où la page
imprime `B`, et c'est **juste**. La légende porte donc les deux, sans quoi
l'œil condamne des étiquettes correctes — je m'y suis laissé prendre.

Usage (depuis GCCLouange/) :
    python3 scripts/jianpu/dissent.py            # tout le corpus publié
    python3 scripts/jianpu/dissent.py <slug>…    # des chants précis
    python3 scripts/jianpu/dissent.py --isolated # les parasites

Sortie : scripts/jianpu/debug/_dissent.png (les zooms, les pires d'abord)
"""

from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

from match import (  # noqa: E402
    FACES, best_match, crop_labels, face_bank, keep, read, signature,
    song_face, song_semitones, transpose, vocabulary, width_factor,
)

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(HERE, "..", "..", "public", "jianpu")
GOLD = os.path.join(HERE, "gold")
OUT = os.path.join(HERE, "debug")

# Au-delà de ce nombre de fontes dissidentes, l'étiquette mérite le zoom.
SUSPECT_MIN = 4

# Une rangée qui ne publie pas plus que ça, alors qu'elle compte au moins
# ISOLATED_CLUSTERS amas, publie probablement un parasite.
ISOLATED_MAX = 2
ISOLATED_CLUSTERS = 3


def dissent(slug: str):
    """Pour chaque étiquette publiée, ce que lisent les sept fontes."""
    vocab = vocabulary(slug)
    if not vocab:
        return []
    semi = song_semitones(slug)
    elected = song_face(slug)

    rows = crop_labels(slug)
    sigs = {}
    for f, cells in rows:
        for (x0, _x1), bitmap in cells:
            sigs[(f["top"], x0)] = signature(bitmap)
    if not sigs:
        return []

    every = list(sigs.values())
    votes: dict[tuple[int, int], dict[str, str]] = {k: {} for k in sigs}
    for face in FACES:
        bank = face_bank(vocab, semi, face)
        factor = width_factor(every, bank)
        for k, s in sigs.items():
            votes[k][face] = best_match(s, bank, factor)[1]

    out = []
    for f, row in read(slug):
        for (x0, x1), chord, score, unanimous in row:
            if not keep(score, unanimous):
                continue
            v = votes.get((f["top"], x0))
            if not v:
                continue
            against = sorted({o for fa, o in v.items()
                              if fa != elected and o != chord})
            n = sum(1 for fa, o in v.items() if fa != elected and o != chord)
            if n >= SUSPECT_MIN:
                out.append({
                    "slug": slug, "y": f["top"], "x": x0,
                    "box": (x0, f["top"], x1, f["bottom"]),
                    "lu": chord, "score": score, "rang": n,
                    "motif": f"{n}/6 lisent {', '.join(against[:3])}",
                })
    return out


def isolated(slug: str):
    """Étiquettes publiées seules dans leur rangée — les parasites probables."""
    out = []
    for f, row in read(slug):
        kept = [(p, c, sc) for p, c, sc, u in row if keep(sc, u)]
        if len(row) < ISOLATED_CLUSTERS or not (1 <= len(kept) <= ISOLATED_MAX):
            continue
        for (x0, x1), chord, score in kept:
            out.append({
                "slug": slug, "y": f["top"], "x": x0,
                "box": (x0, f["top"], x1, f["bottom"]),
                "lu": chord, "score": score,
                "rang": len(row) - len(kept),
                "motif": f"seule {len(kept)} sur {len(row)} amas de la rangee",
            })
    return out


def sheet(items, path):
    """Une bande par étiquette : le zoom, ce qu'on publie, ce que les autres lisent."""
    if not items:
        return None
    pages = {}
    strips = []
    for it in items:
        if it["slug"] not in pages:
            pages[it["slug"]] = Image.open(
                os.path.join(IMAGES, f"{it['slug']}-p1.webp")).convert("RGB")
        x0, y0, x1, y1 = it["box"]
        crop = pages[it["slug"]].crop((max(0, x0 - 8), max(0, y0 - 6), x1 + 34, y1 + 8))
        k = 3
        crop = crop.resize((crop.width * k, crop.height * k), Image.LANCZOS)
        strips.append((it, crop))

    pad, left = 8, 470
    W = left + max(c.width for _i, c in strips) + pad
    H = sum(c.height + pad for _i, c in strips) + pad
    im = Image.new("RGB", (W, H), (255, 255, 255))
    dr = ImageDraw.Draw(im)
    y = pad
    for it, crop in strips:
        im.paste(crop, (left, y))
        dr.text((pad, y + 2),
                f"{it['slug']}  y={it['y']} x={it['x']}", fill=(0, 0, 0))
        printed = it.get("imprime")
        shown = f"PUBLIE {it['lu']}" + (f"  = « {printed} » imprime" if printed else "")
        dr.text((pad, y + 16),
                f"{shown}  ({it['score']:+.2f})", fill=(185, 28, 28))
        dr.text((pad, y + 30), it["motif"], fill=(37, 99, 235))
        y += crop.height + pad
    os.makedirs(OUT, exist_ok=True)
    im.save(path)
    return path


def main() -> int:
    args = [a for a in sys.argv[1:] if a != "--isolated"]
    hunt = isolated if "--isolated" in sys.argv[1:] else dissent
    chords = json.load(open(os.path.join(IMAGES, "chords.json"), encoding="utf8"))
    slugs = args or sorted(chords)
    found = []
    for slug in slugs:
        if slug not in chords:
            continue
        gp = os.path.join(GOLD, f"{slug}.json")
        gold = json.load(open(gp, encoding="utf8")) if os.path.exists(gp) else {}
        # Un calque gelé ne dépend plus du matcher : le signaler n'aiderait pas.
        if gold.get("verified"):
            continue
        items = hunt(slug)
        # Un amas que l'œil a déjà écarté ne se re-signale pas.
        blanks = set(gold.get("not_labels", []))
        items = [i for i in items if f"{i['y']},{i['x']}" not in blanks]
        # Ce que la page **imprime** n'est pas ce que le calque publie dès
        # qu'elle est gravée dans une autre tonalité que son `.cho`.
        semi = song_semitones(slug)
        for it in items:
            spellings = transpose(it["lu"], semi)
            it["imprime"] = spellings[0] if semi and spellings else None
        if items:
            print(f"  {slug:<18} {len(items):3} étiquette(s) suspecte(s)", flush=True)
        found += items

    found.sort(key=lambda i: (-i["rang"], i["score"]))
    print(f"\n{len(found)} étiquette(s) publiée(s) suspecte(s)")
    for it in found[:25]:
        printed = f" = « {it['imprime']} » imprimé" if it.get("imprime") else ""
        print(f"  {it['slug']:<18} y={it['y']:<5} x={it['x']:<5} "
              f"publie {it['lu']:<7}{printed} ({it['score']:+.2f})  {it['motif']}")
    p = sheet(found[:40], os.path.join(OUT, "_dissent.png"))
    if p:
        print(f"\n  zooms → {os.path.relpath(p, os.path.join(HERE, '..', '..'))}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
