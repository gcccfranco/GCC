#!/usr/bin/env python3
"""Cherche un **second « 1=X »** dans la page : la marque d'une modulation.

Une page qui change de tonalité en cours de route réimprime son libellé au
point de modulation. `keyLabel` n'en connaît qu'un — celui de l'en-tête —
donc une telle page ne peut pas être rendue juste : ses deux moitiés
suivraient le même cadre.

Un détecteur a été écrit à l'itération 18 puis **jeté**, et la raison
mérite d'être retenue : il filtrait à +0,55 alors qu'il notait les vrais
libellés d'en-tête à +0,28. Son « zéro trouvé » ne prouvait donc rien —
*un détecteur qui ne trouve pas ses propres positifs connus ne mesure
rien.*

Celui-ci commence donc par se calibrer : il note les cadres `key_label`
déjà mesurés à l'œil dans `gold/`, et n'utilise comme seuil qu'une valeur
tirée de cette distribution. Ce qui passe est ensuite rendu en zooms, pour
lecture — l'automate propose, l'œil dispose.

Usage (depuis GCCLouange/) :
    python3 scripts/jianpu/find-modulation.py --calibrate
    python3 scripts/jianpu/find-modulation.py

Sortie : scripts/jianpu/debug/_modulation-N.png
"""

from __future__ import annotations

import glob
import importlib.util
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

from match import best_match, build_templates, signature  # noqa: E402
from segment import INK_THRESHOLD  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(HERE, "..", "..", "public", "jianpu")
GOLD = os.path.join(HERE, "gold")
OUT = os.path.join(HERE, "debug")

_spec = importlib.util.spec_from_file_location("mk", os.path.join(HERE, "measure-keylabel.py"))
_mk = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mk)

# Le libellé d'en-tête vit dans le haut de page ; une modulation, non. On
# ratisse donc **toute** la hauteur, sauf la bande d'en-tête déjà couverte.
HEADER_FRAC = 0.30


def one_eq_score(ink, y0, y1, x0, x1, tmpl) -> float:
    t = _mk._tight(ink, y0, y1, x0, x1)
    if t is None or t[2] - t[0] < 8:
        return -9.0
    sub = ink[t[1]:t[3] + 1, t[0]:t[2] + 1]
    return best_match(signature(sub), tmpl)[0]


def calibrate() -> list[float]:
    """Note les « 1= » des cadres déjà mesurés à l'œil."""
    tmpl = build_templates(["1="])
    out = []
    for path in sorted(glob.glob(os.path.join(GOLD, "*.json"))):
        gold = json.load(open(path, encoding="utf8"))
        kl = gold.get("key_label")
        if not kl:
            continue
        img = os.path.join(IMAGES, f"{gold['slug']}-p1.webp")
        if not os.path.exists(img):
            continue
        ink = np.asarray(Image.open(img).convert("L")) < INK_THRESHOLD
        # le « 1= » est le premier amas du cadre
        band = ink[kl["y"]:kl["y"] + kl["h"], kl["x"]:kl["x"] + kl["w"]]
        cl = _mk._clusters(band, 0, band.shape[0] - 1)
        if not cl:
            continue
        s = one_eq_score(ink, kl["y"], kl["y"] + kl["h"] - 1,
                         kl["x"] + cl[0][0], kl["x"] + cl[0][1], tmpl)
        out.append(s)
        print(f"  {gold['slug']:20} « 1= » noté {s:+.2f}")
    return out


def scan(slug: str, floor: float, tmpl) -> list[dict]:
    path = os.path.join(IMAGES, f"{slug}-p1.webp")
    ink = np.asarray(Image.open(path).convert("L")) < INK_THRESHOLD
    H, _W = ink.shape
    hits = []
    for y0, y1 in _mk._bands(ink):
        if y1 < H * HEADER_FRAC:
            continue
        cl = _mk._clusters(ink, y0, y1)
        for x0, x1 in cl[:3]:
            s = one_eq_score(ink, y0, y1, x0, x1, tmpl)
            if s >= floor:
                hits.append({"slug": slug, "y": y0, "x": x0, "score": round(float(s), 2),
                             "box": [int(x0), int(y0), int(x1), int(y1)]})
                break
    return hits


def main() -> int:
    tmpl = build_templates(["1="])
    if "--calibrate" in sys.argv:
        scores = calibrate()
        if scores:
            print(f"\n{len(scores)} libellés connus · min {min(scores):+.2f} · "
                  f"médiane {float(np.median(scores)):+.2f} · max {max(scores):+.2f}")
        return 0

    known = calibrate()
    # Le calibrage donne : médiane +0,27, maximum +0,50 — l'itération 18
    # filtrait à +0,55, c'est-à-dire **au-dessus de tous ses positifs
    # connus**. Son « zéro trouvé » ne pouvait rien dire.
    #
    # On prend le décile inférieur plutôt que le minimum : un libellé
    # (能不能) note -1,29 parce que son « 1= » se recolle à la lettre au
    # découpage, et descendre jusque-là noierait la sortie. Ce détecteur
    # cherche donc les modulations *bien gravées* ; il ne prouvera pas leur
    # absence, seulement leur présence.
    floor = float(np.percentile(known, 10)) if known else 0.2
    print(f"\nseuil = décile inférieur des « 1= » connus ({floor:+.2f})\n")

    if "--all" in sys.argv:
        pages = sorted(os.path.basename(f).rsplit("-p", 1)[0]
                       for f in glob.glob(os.path.join(IMAGES, "*-p1.webp")))
    else:
        pages = sorted(json.load(open(os.path.join(IMAGES, "chords.json"), encoding="utf8")))
    hits = []
    for slug in pages:
        try:
            hits += scan(slug, floor, tmpl)
        except FileNotFoundError:
            continue
    for h in hits:
        print(f"  {h['slug']:20} y={h['y']:5} x={h['x']:4}  {h['score']:+.2f}")
    print(f"\n{len(hits)} candidat(s) hors en-tête sur {len(pages)} pages")

    os.makedirs(OUT, exist_ok=True)
    json.dump(hits, open(os.path.join(OUT, "_modulation.json"), "w", encoding="utf8"),
              ensure_ascii=False, indent=1)

    for i, h in enumerate(hits[:40], 1):
        im = Image.open(os.path.join(IMAGES, f"{h['slug']}-p1.webp")).convert("RGB")
        x0, y0, x1, y1 = h["box"]
        crop = im.crop((max(0, x0 - 20), max(0, y0 - 25),
                        min(im.width, x0 + 420), min(im.height, y1 + 25)))
        crop = crop.resize((crop.width * 2, crop.height * 2), Image.LANCZOS)
        d = ImageDraw.Draw(crop)
        d.text((4, 2), f"{h['slug']} y={h['y']} {h['score']:+.2f}", fill=(200, 0, 0))
        crop.save(os.path.join(OUT, f"_modulation-{i}.png"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
