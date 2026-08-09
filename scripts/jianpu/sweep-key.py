#!/usr/bin/env python3
"""Balaye conjointement la **fonte de gravure** et la **tonalité imprimée**.

Deux propriétés de page étaient traitées comme des constantes du corpus, et
les deux sont fausses :

- la **tonalité** — `build-chords` le dit depuis le début, 32 des 124
  partitions ne sont pas gravées dans la tonalité de leur `.cho` ;
- la **fonte** — Helvetica Neue a été élue à l'itération 5 sur la vérité
  terrain de 何等恩典, donc sur *une* gravure. Le corpus en contient au
  moins deux. Sur 永恒唯一的盼望, gravée dans une bold linéale large,
  Helvetica Neue identifie 20 étiquettes sur 29 et en retient 7 fausses ;
  Verdana Bold en identifie **29 sur 29 et n'en retient aucune fausse**.

Les deux se tiennent, et c'est ce qui rendait la seconde invisible : sous
une fonte qui ne colle pas, le balayage de tonalité ne décide rien
(+11 gagne d'un point sur +9, dans le bruit) et l'on conclut que la
tonalité est bonne. Sous la bonne fonte, +11 gagne 28 contre 22. **Une
mesure faite avec le mauvais gabarit ne mesure rien** — c'est la leçon de
l'itération 1, sous un autre visage.

Ce script n'est donc pas un oracle et ne publie rien : il propose un couple
(fonte, tonalité) et la marge qui le sépare du suivant. La vérification
reste la planche de lecture, à l'œil. Ce qui est retenu s'écrit à la main
dans `gold/<slug>.json` sous `face` et `printed_key`.

Usage (depuis GCCLouange/) :
    python3 scripts/jianpu/sweep-key.py <slug>…
    python3 scripts/jianpu/sweep-key.py --missing   # les chants sans calque
    python3 scripts/jianpu/sweep-key.py --all       # tout le corpus

Sortie : scripts/jianpu/debug/_sweep.json
"""

from __future__ import annotations

import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

import match  # noqa: E402
from match import (  # noqa: E402
    FACES, MIN_SCORE, SHARP, best_match, crop_labels, face_bank, note_index,
    signature, vocabulary, width_factor,
)
from segment import INK_THRESHOLD  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(HERE, "..", "..", "public", "jianpu")
SONGS = os.path.join(HERE, "..", "..", "content", "songs")
INVENTAIRE = os.path.join(HERE, "inventaire.json")

# Les deux champs proposés n'ont pas le même risque, donc pas la même
# porte.
#
# **La tonalité** doit être sûre : fausse, elle transpose toute la page de
# travers. On exige donc une couverture franche *et* une marge nette sur
# l'hypothèse suivante.
MIN_SHARE = 0.55
MIN_MARGIN = 0.12

# **La fonte**, non. Il n'existe pas de choix « prudent » : ne rien écrire
# ne veut pas dire s'abstenir, cela veut dire garder Helvetica Neue —
# c'est-à-dire la gravure d'un seul chant de 2026, devenue minoritaire
# (11 pages sur 47 au premier balayage). Exiger une marge punissait alors
# les pages *faciles* : 握手 se lit 26/26 sous verdana-bold, et restait sur
# le défaut parce qu'un rival la lisait 24/26 — sous ce défaut, ses trois
# « Bm » sortaient « Em » à +0,69. On prend donc toujours la fonte qui lit
# le mieux, dès qu'elle lit quelque chose.
MIN_FACE_SHARE = 0.40


def cho_key(slug: str) -> str | None:
    text = open(os.path.join(SONGS, f"{slug}.cho"), encoding="utf8").read()
    m = re.search(r"\{key:\s*([^}]+)\}", text)
    return m.group(1).strip() if m else None


def truth(slug: str) -> list[tuple[dict, str]]:
    """Étiquettes de la page dont l'accord a été lu à l'œil.

    Quand elles existent, elles priment sur la couverture : compter ce
    qu'un gabarit *retient* est un score qu'il se donne à lui-même, et sur
    我心坚定与你 ce score a élu une grasse pour une page gravée en maigre —
    la couverture y montait (21 → 30 justes) mais un `D/A` sortait `D/E` à
    +0,48, unanime. Premier accord faux retenu depuis l'itération 6.

    La cause est propre à cette page : elle porte **deux tonalités**, et sa
    seconde rangée n'est lisible sous aucun gabarit du vocabulaire. La
    couverture y est donc du bruit. La vérité terrain, elle, ne ment pas.
    """
    path = os.path.join(HERE, "gold", f"{slug}.json")
    if not os.path.exists(path):
        return {}, []
    gold = json.load(open(path, encoding="utf8"))
    boxes = [(l, l["c"]) for l in gold.get("extra_labels", []) if l.get("c")]
    rows = {r["top"]: r["chords"] for r in gold.get("chord_rows", [])}
    return rows, boxes


def sweep(slug: str) -> dict | None:
    vocab = vocabulary(slug)
    if not vocab:
        return None
    rows = [(f, [(p, signature(b)) for p, b in cells]) for f, cells in crop_labels(slug)]
    sigs = [s for _f, cells in rows for _p, s in cells]
    total = len(sigs)
    if not total:
        return None

    known_rows, known_boxes = truth(slug)
    ink = np.asarray(Image.open(os.path.join(IMAGES, f"{slug}-p1.webp")).convert("L")) < INK_THRESHOLD
    known_sigs = []
    for box, chord in known_boxes:
        sub = ink[box["y"]:box["y"] + box["h"], box["x"]:box["x"] + box["w"]]
        ys, xs = np.where(sub.any(1))[0], np.where(sub.any(0))[0]
        if len(ys) and len(xs):
            known_sigs.append((signature(sub[ys[0]:ys[-1] + 1, xs[0]:xs[-1] + 1]), chord))
    # Les rangées transcrites à la main : mêmes signatures que ci-dessus,
    # mais repérées par leur rang dans la rangée. Un écart de compte veut
    # dire que le découpage a bougé — on laisse alors la rangée de côté
    # plutôt que d'apparier de travers.
    for f, cells in rows:
        chords = known_rows.get(f["top"])
        if not chords or len(chords) != len(cells):
            continue
        for (_pos, sig), chord in zip(cells, chords):
            if chord:
                known_sigs.append((sig, chord))

    scores = []
    for name in FACES:
        for semitones in range(12):
            bank = face_bank(vocab, semitones, name)
            k = width_factor(sigs, bank)
            kept = sum(1 for s in sigs if best_match(s, bank, k)[0] >= MIN_SCORE)
            if known_sigs:
                # La vérité terrain **oppose son veto**, elle ne classe
                # pas. Une fonte qui retient un accord faux là où l'œil a
                # déjà lu est écartée quoi qu'elle fasse d'autre : le
                # corpus n'en publie aucun depuis l'itération 6, et cet
                # invariant ne se troque pas contre de la couverture.
                #
                # Mais s'en servir aussi pour *classer* ne marche pas :
                # beaucoup de pages n'ont qu'une à quatre étiquettes lues à
                # la main, et une fonte qui lit juste cette seule étiquette
                # sortait en tête même en ratant tout le reste de la page.
                # Cinq calques y ont perdu leur publication d'un coup. Ce
                # sont donc les survivants du veto que la couverture
                # départage.
                wrong = 0
                for s, c in known_sigs:
                    sc, ch = best_match(s, bank, k)
                    wrong += sc >= MIN_SCORE and ch != c
                scores.append(((wrong == 0, kept / total), name, semitones, kept))
            else:
                scores.append(((True, kept / total), name, semitones, kept))
    scores.sort(reverse=True)

    best = scores[0]
    def share_of(entry):
        return entry[0][1]
    # Le suivant qui change vraiment d'hypothèse : un autre couple, pas le
    # même à un demi-ton près sous une fonte voisine.
    rival = next((s for s in scores[1:] if s[2] != best[2]), scores[1])
    base = cho_key(slug)
    key = SHARP[(note_index(base) + best[2]) % 12] if base else None
    return {
        "slug": slug, "cho_key": base, "face": best[1], "semitones": best[2],
        "printed_key": key, "share": share_of(best), "kept": best[3], "total": total,
        "margin": share_of(best) - share_of(rival),
        "clean": bool(best[0][0]),
        "rival": [rival[1], rival[2], share_of(rival)],
    }


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    inv = [i["slug"] for i in json.load(open(INVENTAIRE, encoding="utf8"))]
    if "--all" in sys.argv:
        args = inv
    elif "--missing" in sys.argv:
        chords = json.load(open(os.path.join(IMAGES, "chords.json"), encoding="utf8"))
        args = [s for s in inv if s not in chords]
    if not args:
        raise SystemExit("Usage: sweep-key.py <slug>… | --missing | --all")

    out = []
    for slug in args:
        try:
            r = sweep(slug)
        except FileNotFoundError:
            continue
        if not r:
            continue
        out.append(r)
        flag = "  <<<" if r["share"] >= MIN_SHARE and r["margin"] >= MIN_MARGIN else ""
        print(f"  {slug:20} {r['cho_key'] or '?':>3} → {r['printed_key'] or '?':>3} "
              f"(+{r['semitones']:2}) {r['face']:14} {r['kept']:3}/{r['total']:<3} "
              f"{r['share']:.0%}  marge {r['margin']:+.0%}{flag}", flush=True)

    dest = os.path.join(HERE, "debug", "_sweep.json")
    with open(dest, "w", encoding="utf8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)
    print(f"\n→ {dest}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
