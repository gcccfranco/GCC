#!/usr/bin/env python3
"""Mesure les cadres « 1=X » pour lecture à l'œil.

Le lot transcrit à la main sur planches quadrillées a été retiré (LOOP.md,
itération 11) : 12+ cadres faux au rendu fidèle. La mesure est donc
automatique, et l'œil approuve — mais encore faut-il que la bonne réponse
soit sur le bulletin.

**Ce qu'elle était, et pourquoi elle ne marchait pas** (itération 35). La
version précédente découpait le haut de page en *bandes* horizontales, n'en
gardait que celles de 18 à 95 px, puis élisait la meilleure au score. Trois
défauts s'additionnaient :

- le filtre de hauteur **supprimait la bonne bande** sur les gravures
  serrées, où le libellé se colle au bloc de sous-titre : sur 一切歌颂赞美,
  脚步 et 你们要赞美耶和华, tout le bloc faisait 125 à 165 px et partait
  ensemble ;
- il n'y avait **aucun plancher** : l'argmax rendait toujours une boîte,
  même quand aucune candidate ne pouvait être le libellé ;
- le vote portait sur la **lettre attendue**, or une rangée d'accords est
  faite exactement de ces lettres-là — c'est elle qui gagnait.

Sur les 24 cadres proposés à l'itération 33, **22 étaient faux** (rangées
d'accords, rangées de chiffres, lignes de paroles, lignes de tempo) et le
seul bon sortait avec une corrélation négative. Un score qu'on ne confronte
jamais à un plancher n'est pas une mesure, c'est un classement — et
classer ne sert à rien quand la bonne réponse a été retirée du scrutin.

**Ce qu'elle est.** On n'ancre plus sur une bande mais sur le **glyphe
« = »**, seul invariant du libellé : deux barres horizontales de même
chasse, empilées, isolées au-dessus et au-dessous. Il se trouve sans
découpage préalable, donc aucun filtre ne peut le faire disparaître. Le
cadre est ensuite l'étendue « voisin de gauche … voisin de droite » sur la
même ligne — ce qui donne « 1=F » sans la fraction 4/4, dont le masque
effacerait le chiffrage de la mesure (c'est ce qui était publié sur
齐来赞美 depuis l'itération 11 : cadre de 134×51 px, fraction comprise).

La ligne de tempo « ♩=NN » porte le même « = » et sort donc aussi. On ne la
filtre pas : **toutes** les candidates vont sur la planche, et l'œil tranche
en un regard — un « ♩ » ne ressemble pas à un « 1 », et « =140 » pas à
« =F ». Le vote lettre/chiffre est imprimé pour guider la lecture, jamais
pour décider : c'est ce qu'il décidait qui a produit les 22 cadres faux.

Rien n'est écrit dans `gold/` sans `--pick`.

Usage (depuis GCCLouange/) :
    python3 scripts/jianpu/measure-keylabel.py            # tous les publiés sans cadre
    python3 scripts/jianpu/measure-keylabel.py <slug>…
    python3 scripts/jianpu/measure-keylabel.py --pick <slug>=<n> …   # écrit le cadre n
"""

from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

from match import (  # noqa: E402
    FACES, best_match, build_templates, signature, song_face,
)
from segment import INK_THRESHOLD  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(HERE, "..", "..", "public", "jianpu")
GOLD = os.path.join(HERE, "gold")
OUT = os.path.join(HERE, "debug")

TOP_FRAC = 0.30    # le libellé vit dans le haut de page
LEFT_FRAC = 0.45   # et à gauche
EQ_MAX_X = 380     # ... et le « = » n'est jamais loin de la marge

LETTERS = ["C", "D", "E", "F", "G", "A", "B"]
DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]


def _hbars(win, max_x=EQ_MAX_X, lo=7, hi=48, maxthick=6):
    """Barres horizontales : un run de largeur [lo,hi] empilé sur ≤ maxthick lignes."""
    H = win.shape[0]
    runs = {}
    for y in range(H):
        row = win[y, :max_x]
        if not row.any():
            continue
        idx = np.flatnonzero(np.diff(np.concatenate(([0], row.view(np.int8), [0]))))
        segs = [(idx[i], idx[i + 1] - 1) for i in range(0, len(idx), 2)]
        keep = [(a, b) for a, b in segs if lo <= b - a + 1 <= hi]
        if keep:
            runs[y] = keep
    bars, used = [], set()
    for y in sorted(runs):
        for a, b in runs[y]:
            if (y, a, b) in used:
                continue
            ys, x0, x1 = [y], a, b
            yy = y + 1
            while yy in runs and len(ys) < maxthick:
                over = [(c, d) for c, d in runs[yy]
                        if min(b, d) - max(a, c) + 1 >= 0.7 * (b - a + 1)]
                if not over:
                    break
                c, d = over[0]
                used.add((yy, c, d))
                ys.append(yy)
                x0, x1 = min(x0, c), max(x1, d)
                yy += 1
            bars.append((ys[0], ys[-1], x0, x1))
    return bars


def equals(win):
    """Les « = » de la fenêtre : deux barres jumelles, isolées."""
    bars = _hbars(win)
    out = []
    for t1, b1, x10, x11 in bars:
        for t2, b2, x20, x21 in bars:
            gap = t2 - b1 - 1
            if not (2 <= gap <= 10):
                continue
            w1, w2 = x11 - x10 + 1, x21 - x20 + 1
            if abs(w1 - w2) > 0.35 * max(w1, w2):
                continue
            if abs(x10 - x20) > 0.35 * max(w1, w2):
                continue
            y0, y1 = t1, b2
            x0, x1 = min(x10, x20), max(x11, x21)
            h = y1 - y0 + 1
            if not (0.7 <= (x1 - x0 + 1) / h <= 3.2):
                continue
            # Un « = » n'a rien juste au-dessus ni juste au-dessous. Sans ce
            # test, deux ligatures empilées sous un chiffre en sont un.
            if win[max(0, y0 - 3):y0, x0:x1 + 1].any():
                continue
            if win[y1 + 1:y1 + 4, x0:x1 + 1].any():
                continue
            out.append((int(x0), int(y0), int(x1 - x0 + 1), int(h)))
    return sorted(set(out), key=lambda e: (e[1], e[0]))


def _neighbour(win, eq, side, gapmax=None):
    """Amas voisin du « = » sur la même ligne, ou None s'il n'y a rien.

    `gapmax` se mesure sur la **hauteur de ligne**, pas sur celle du « = ».
    Un « = » fait 10 px quand sa ligne en fait 26, et les gravures écrivent
    volontiers « 1=  G » avec 30 px de blanc avant la lettre : calé sur le
    « = », l'écart toléré valait 22 px et la lettre tombait hors de portée.
    Le libellé était alors rejeté faute de voisin — sur 大声敬拜, 我安然居住
    et 认识你真好, dont le « = » avait pourtant été trouvé.
    """
    x, y, w, h = eq
    y0 = max(0, int(y - 2.2 * h))
    y1 = min(win.shape[0] - 1, int(y + 2.2 * h))
    band = win[y0:y1 + 1]
    cols = band.any(axis=0)
    gapmax = int(gapmax if gapmax is not None else 2.2 * h)
    if side == "L":
        i = x - 1
        while i >= 0 and not cols[i]:
            if x - i > gapmax:
                return None
            i -= 1
        if i < 0:
            return None
        end = i
        while i >= 0 and (cols[i] or (i - 3 >= 0 and cols[max(0, i - 3):i].any())):
            i -= 1
        start = i + 1
    else:
        i = x + w
        while i < len(cols) and not cols[i]:
            if i - (x + w) > gapmax:
                return None
            i += 1
        if i >= len(cols):
            return None
        start = i
        while i < len(cols) and (cols[i] or cols[i:min(len(cols), i + 4)].any()):
            i += 1
        end = i - 1
    sub = band[:, start:end + 1]
    ys = np.flatnonzero(sub.any(axis=1))
    if not len(ys):
        return None
    return (start, y0 + int(ys[0]), end, y0 + int(ys[-1]))


def candidates(slug: str):
    """Toutes les candidates de la page, sans en élire aucune."""
    path = os.path.join(IMAGES, f"{slug}-p1.webp")
    ink = np.asarray(Image.open(path).convert("L")) < INK_THRESHOLD
    H, W = ink.shape
    win = ink[: int(H * TOP_FRAC), : int(W * LEFT_FRAC)]

    # Les gabarits suivent la **fonte de la page** — la leçon de
    # l'itération 19, que l'ancienne version avait fini par appliquer et
    # qui reste vraie ici : sous la fonte par défaut, tout sort en négatif.
    font_path, index, _family = FACES[song_face(slug)]
    t_let = build_templates(LETTERS, 0, font_path, index)
    t_dig = build_templates(DIGITS, 0, font_path, index)

    out = []
    for eq in equals(win):
        left = _neighbour(win, eq, "L")
        if left is None:
            continue
        # La hauteur du « 1 » donne la hauteur de ligne, donc l'écart que le
        # blanc avant la lettre peut atteindre.
        line_h = max(left[3] - left[1] + 1, eq[3])
        right = _neighbour(win, eq, "R", gapmax=1.6 * line_h)
        if right is None:
            continue
        sub = win[right[1]:right[3] + 1, right[0]:right[2] + 1]
        if sub.size == 0:
            continue
        sig = signature(sub)
        s_let, letter = best_match(sig, t_let)
        s_dig, _ = best_match(sig, t_dig)
        top = min(left[1], right[1], eq[1])
        bottom = max(left[3], right[3], eq[1] + eq[3] - 1)
        out.append({
            "box": {"x": int(left[0]), "y": int(top),
                    "w": int(right[2] - left[0] + 1), "h": int(bottom - top + 1)},
            "lettre": letter,
            "vote": round(float(s_let - s_dig), 2),
        })
    return out


def _planches(rows):
    """Une vignette par candidate, numérotée pour que l'œil désigne."""
    cells = []
    for slug, n, r in rows:
        b = r["box"]
        img = Image.open(os.path.join(IMAGES, f"{slug}-p1.webp")).convert("RGB")
        x0, y0 = max(0, b["x"] - 25), max(0, b["y"] - 22)
        x1 = min(img.width, b["x"] + b["w"] + 240)
        y1 = min(img.height, b["y"] + b["h"] + 22)
        crop = img.crop((x0, y0, x1, y1))
        Z = max(1.0, 120.0 / max(1, crop.height))
        crop = crop.resize((int(crop.width * Z), int(crop.height * Z)), Image.LANCZOS)
        d = ImageDraw.Draw(crop)
        d.rectangle([(b["x"] - x0) * Z, (b["y"] - y0) * Z,
                     (b["x"] + b["w"] - x0) * Z, (b["y"] + b["h"] - y0) * Z],
                    outline=(220, 38, 38), width=2)
        head = Image.new("RGB", (max(crop.width, 520), 20), (37, 99, 235))
        ImageDraw.Draw(head).text(
            (6, 4), f"{slug}#{n}  {b}  droite≈{r['lettre']} (lettre-chiffre {r['vote']:+.2f})",
            fill=(255, 255, 255))
        cells.append((head, crop))
    os.makedirs(OUT, exist_ok=True)
    PER, n = 12, 0
    for p in range(0, len(cells), PER):
        batch = cells[p:p + PER]
        W = max(max(h.width, c.width) for h, c in batch)
        H = sum(h.height + c.height + 5 for h, c in batch)
        page = Image.new("RGB", (W, H), "white")
        y = 0
        for h, c in batch:
            page.paste(h, (0, y)); y += h.height
            page.paste(c, (0, y)); y += c.height + 5
        n = p // PER + 1
        page.save(os.path.join(OUT, f"_kl-{n}.png"))
    return n


def _pick(specs: list[str]) -> int:
    """Écrit dans `gold/` le cadre désigné : <slug>=<n>."""
    for spec in specs:
        slug, _, num = spec.partition("=")
        cands = candidates(slug)
        n = int(num)
        if not (1 <= n <= len(cands)):
            print(f"  ! {slug} : candidate {n} inexistante ({len(cands)} proposée(s))",
                  file=sys.stderr)
            continue
        path = os.path.join(GOLD, f"{slug}.json")
        gold = json.load(open(path, encoding="utf8")) if os.path.exists(path) else {"slug": slug}
        gold["key_label"] = cands[n - 1]["box"]
        gold["key_label_verified"] = (
            "mesure measure-keylabel (ancrage sur le « = », cadre = voisin gauche…voisin "
            "droit), zoom relu à l’œil sur planche de lot, lettre gravée confrontée à "
            "printedKey, 2026-08-26 (itération 35)")
        json.dump(gold, open(path, "w", encoding="utf8"), ensure_ascii=False, indent=2)
        open(path, "a").write("\n")
        print(f"  ✓ {slug} ← {cands[n-1]['box']}")
    return 0


def main() -> int:
    args = sys.argv[1:]
    if args and args[0] == "--pick":
        return _pick(args[1:])

    chords = json.load(open(os.path.join(IMAGES, "chords.json"), encoding="utf8"))
    only = set(args)
    rows = []
    for slug, entry in sorted(chords.items()):
        if only and slug not in only:
            continue
        gp = os.path.join(GOLD, f"{slug}.json")
        gold = json.load(open(gp, encoding="utf8")) if os.path.exists(gp) else {}
        if not only and gold.get("key_label"):
            continue
        cands = candidates(slug)
        if not cands:
            print(f"  {slug:16} AUCUNE candidate")
            continue
        for i, r in enumerate(cands, 1):
            rows.append((slug, i, r))
            print(f"  {slug:16} #{i}  {r['box']}  droite≈{r['lettre']} "
                  f"(lettre-chiffre {r['vote']:+.2f})   attendu 1={entry['printedKey']}")
    n = _planches(rows)
    print(f"✓ {len(rows)} candidate(s) sur {len({s for s, _, _ in rows})} chant(s) "
          f"→ debug/_kl-1..{n}.png")
    return 0


if __name__ == "__main__":
    sys.exit(main())
