#!/usr/bin/env python3
"""Mesure les cadres « 1=X » pour lecture à l'œil.

Le lot transcrit à la main sur planches quadrillées a été retiré (LOOP.md,
itération 11) : 12+ cadres faux au rendu fidèle. Ici la mesure est
automatique et s'appuie sur deux choses sûres :

- **la lettre est connue** (`printedKey` du calque) : parmi les lignes
  candidates du haut de page (« 1=X », mais aussi « ♩=NN » qui a la même
  silhouette), on garde celle dont l'amas qui suit le « = » ressemble le
  plus à la lettre attendue — le vote du matcher, comme pour les accords ;
- **la fraction 4/4 se repère à sa hauteur** (double de celle des lettres) :
  elle borne le cadre à droite, sans jamais y entrer.

Rien n'est écrit dans `gold/` : le script émet des zooms cadrés
(`debug/_kl-N.png`) et les boîtes (`debug/_keylabel-proposals.json`).
Un humain lit les zooms et recopie les cadres approuvés — même circuit
que `propose-extra.py`.

Usage (depuis GCCLouange/) :
    python3 scripts/jianpu/measure-keylabel.py           # tous les publiés sans cadre
    python3 scripts/jianpu/measure-keylabel.py <slug>
"""

from __future__ import annotations

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

TOP_FRAC = 0.30    # le libellé vit dans le haut de page
LEFT_FRAC = 0.45   # et à gauche
MARGIN_X = 140     # la ligne commence près de la marge


def _bands(ink):
    """Bandes horizontales d'encre dans la fenêtre haut-gauche."""
    rows = ink.any(axis=1)
    bands, cur = [], None
    for y, has in enumerate(rows):
        if has:
            cur = [y, y] if cur is None else [cur[0], y]
        elif cur and y - cur[1] > 4:
            bands.append(tuple(cur))
            cur = None
    if cur:
        bands.append(tuple(cur))
    return [(a, b) for a, b in bands if 18 <= b - a <= 95]


def _clusters(ink, y0, y1, gap=18):
    cols = ink[y0:y1 + 1].any(axis=0)
    out, x = [], 0
    W = len(cols)
    while x < W:
        if cols[x]:
            s = x
            while x < W and (cols[x] or (x + gap < W and cols[x:x + gap].any())):
                x += 1
            out.append((s, x - 1))
        else:
            x += 1
    return out


def _tight(ink, y0, y1, x0, x1):
    sub = ink[y0:y1 + 1, x0:x1 + 1]
    ys, xs = np.where(sub.any(1))[0], np.where(sub.any(0))[0]
    if not len(ys) or not len(xs):
        return None
    return (x0 + xs[0], y0 + ys[0], x0 + xs[-1], y0 + ys[-1])


def measure(slug: str, printed_key: str):
    path = os.path.join(IMAGES, f"{slug}-p1.webp")
    ink_full = np.asarray(Image.open(path).convert("L")) < INK_THRESHOLD
    H, W = ink_full.shape
    win = ink_full[: int(H * TOP_FRAC), : int(W * LEFT_FRAC)]

    letter = printed_key[0]
    tmpl_letter = build_templates([letter])
    tmpl_fused = build_templates([f"1={letter}"])
    tmpl_oneeq = build_templates(["1="])
    tmpl_digits = build_templates(["6", "1", "4", "2", "7", "9"])

    best = None
    for y0, y1 in _bands(win):
        cl = _clusters(win, y0, y1)
        if not cl or cl[0][0] > MARGIN_X:
            continue
        heights = []
        tights = []
        for x0, x1 in cl:
            t = _tight(win, y0, y1, x0, x1)
            tights.append(t)
            heights.append(t[3] - t[1] + 1 if t else 0)
        med_h = float(np.median([h for h in heights if h])) or 1.0
        # Deux gravures : « 1= X » en amas séparés (l'amas d'après le « = »
        # se confronte à la lettre attendue contre des chiffres — la ligne
        # de tempo « ♩=NN » perd ce vote), ou « 1=X » fusionné en un seul
        # amas (on confronte l'amas entier au gabarit de la chaîne).
        cand = None
        for i in range(1, min(4, len(cl))):
            t = tights[i]
            if t and (t[2] - t[0]) >= 8 and heights[i] < 1.6 * med_h:
                cand = (i, t)
                break
        if cand:
            i, t = cand
            sub = win[t[1]: t[3] + 1, t[0]: t[2] + 1]
            sig = signature(sub)
            s_letter, _ = best_match(sig, tmpl_letter)
            s_digit, _ = best_match(sig, tmpl_digits)
            # Une rangée d'accords qui contient la lettre attendue gagnerait
            # le vote de la lettre seule : le premier amas doit aussi
            # ressembler à « 1= » — c'est lui qui signe la ligne du libellé.
            t0 = tights[0]
            sig0 = signature(win[t0[1]: t0[3] + 1, t0[0]: t0[2] + 1])
            s_oneeq, _ = best_match(sig0, tmpl_oneeq)
            score = s_oneeq + (s_letter - s_digit)
        else:
            t = tights[0]
            if t is None or not (50 <= t[2] - t[0] <= 190):
                continue
            sub = win[t[1]: t[3] + 1, t[0]: t[2] + 1]
            sig = signature(sub)
            s_letter, _ = best_match(sig, tmpl_fused)
            score = s_letter
        if best is None or score > best["score"]:
            # cadre : du 1er amas jusqu'au dernier amas « lettre » avant la
            # fraction (hauteur ≥ 1,6 × celle de la lettre) ou un grand
            # trou (≥ 90 px).
            #
            # L'échelle de référence est la **lettre appariée**, pas la
            # médiane de la bande : celle-ci inclut tout ce qui traîne à
            # droite sur la même ligne — sur 尽情地微笑, l'annotation
            # « [共8张：原版/简版…] » monte la médiane de 26 à 34, la fraction
            # 4/4 (51 px) passe alors sous le seuil et **entre dans le
            # cadre**. Masquer un cadre qui contient la fraction efface le
            # chiffrage de la mesure.
            ref_h = heights[cand[0]] if cand else med_h
            xs0, ys0, xe, ye = tights[0][0], tights[0][1], t[2], t[3]
            for j in range(1, len(cl)):
                tj = tights[j]
                if tj is None:
                    continue
                if heights[j] >= 1.6 * ref_h or tj[0] - xe > 90:
                    break
                xe, ye = max(xe, tj[2]), max(ye, tj[3])
                ys0 = min(ys0, tj[1])
            best = {"score": score, "s_letter": round(float(s_letter), 2),
                    "box": {"x": int(xs0), "y": int(ys0),
                            "w": int(xe - xs0 + 1), "h": int(ye - ys0 + 1)}}
    return best


def main() -> int:
    chords = json.load(open(os.path.join(IMAGES, "chords.json"), encoding="utf8"))
    only = sys.argv[1] if len(sys.argv) > 1 else None
    proposals = {}
    for slug, entry in sorted(chords.items()):
        if only and slug != only:
            continue
        gp = os.path.join(GOLD, f"{slug}.json")
        gold = json.load(open(gp, encoding="utf8")) if os.path.exists(gp) else {}
        if not only and gold.get("key_label"):
            continue
        r = measure(slug, entry["printedKey"])
        if r:
            proposals[slug] = r
            print(f"  {slug:16} boîte {r['box']}  lettre {entry['printedKey']} corr {r['s_letter']:+.2f}")
        else:
            print(f"  {slug:16} AUCUNE candidate")

    os.makedirs(OUT, exist_ok=True)
    json.dump(proposals, open(os.path.join(OUT, "_keylabel-proposals.json"), "w", encoding="utf8"),
              ensure_ascii=False, indent=0)

    # zooms cadrés pour lecture
    cells = []
    for slug, r in proposals.items():
        b = r["box"]
        img = Image.open(os.path.join(IMAGES, f"{slug}-p1.webp")).convert("RGB")
        cx0, cy0 = max(0, b["x"] - 30), max(0, b["y"] - 25)
        cx1, cy1 = min(img.width, b["x"] + b["w"] + 260), b["y"] + b["h"] + 25
        crop = img.crop((cx0, cy0, cx1, cy1))
        Z = 1.6
        crop = crop.resize((int(crop.width * Z), int(crop.height * Z)), Image.LANCZOS)
        d = ImageDraw.Draw(crop)
        d.rectangle([(b["x"] - cx0) * Z, (b["y"] - cy0) * Z,
                     (b["x"] + b["w"] - cx0) * Z, (b["y"] + b["h"] - cy0) * Z],
                    outline=(220, 38, 38), width=2)
        head = Image.new("RGB", (crop.width, 18), (37, 99, 235))
        ImageDraw.Draw(head).text((6, 3), f"{slug} {r['box']}", fill=(255, 255, 255))
        cells.append((head, crop))

    PER = 10
    n = 0
    for p in range(0, len(cells), PER):
        batch = cells[p:p + PER]
        Wp = max(h.width for h, _ in batch)
        Hp = sum(h.height + c.height + 4 for h, c in batch)
        page = Image.new("RGB", (Wp, Hp), "white")
        y = 0
        for h, c in batch:
            page.paste(h, (0, y)); y += h.height
            page.paste(c, (0, y)); y += c.height + 4
        n = p // PER + 1
        page.save(os.path.join(OUT, f"_kl-{n}.png"))
    print(f"✓ {len(proposals)} cadre(s) proposé(s) → debug/_kl-1..{n}.png + _keylabel-proposals.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
