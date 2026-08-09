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

import match  # noqa: E402
from match import (  # noqa: E402
    FACES, MIN_SCORE, SHARP, best_match, crop_labels, face_bank, note_index,
    signature, vocabulary, width_factor,
)

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(HERE, "..", "..", "public", "jianpu")
SONGS = os.path.join(HERE, "..", "..", "content", "songs")
INVENTAIRE = os.path.join(HERE, "inventaire.json")

# Un couple n'est proposé que s'il lit une vraie part de la page **et**
# distance nettement le suivant. Les deux comptent : une couverture haute
# sans marge veut dire que plusieurs gabarits collent également, donc
# qu'aucun ne colle vraiment.
MIN_SHARE = 0.55
MIN_MARGIN = 0.12


def cho_key(slug: str) -> str | None:
    text = open(os.path.join(SONGS, f"{slug}.cho"), encoding="utf8").read()
    m = re.search(r"\{key:\s*([^}]+)\}", text)
    return m.group(1).strip() if m else None


def sweep(slug: str) -> dict | None:
    vocab = vocabulary(slug)
    if not vocab:
        return None
    rows = [(f, [(p, signature(b)) for p, b in cells]) for f, cells in crop_labels(slug)]
    sigs = [s for _f, cells in rows for _p, s in cells]
    total = len(sigs)
    if not total:
        return None

    scores = []
    for name in FACES:
        for semitones in range(12):
            bank = face_bank(vocab, semitones, name)
            k = width_factor(sigs, bank)
            kept = sum(1 for s in sigs if best_match(s, bank, k)[0] >= MIN_SCORE)
            scores.append((kept / total, name, semitones, kept))
    scores.sort(reverse=True)

    best = scores[0]
    # Le suivant qui change vraiment d'hypothèse : un autre couple, pas le
    # même à un demi-ton près sous une fonte voisine.
    rival = next((s for s in scores[1:] if s[2] != best[2]), scores[1])
    base = cho_key(slug)
    key = SHARP[(note_index(base) + best[2]) % 12] if base else None
    return {
        "slug": slug, "cho_key": base, "face": best[1], "semitones": best[2],
        "printed_key": key, "share": best[0], "kept": best[3], "total": total,
        "margin": best[0] - rival[0], "rival": [rival[1], rival[2], rival[0]],
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
