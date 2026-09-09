#!/usr/bin/env python3
"""Gèle les étiquettes d'un calque certifié dans sa vérité terrain.

Une phrase `verified` dit ce qu'un humain a regardé sur la page transposée.
Tant que les étiquettes sont recalculées à chaque build, cette phrase
décrit une **cible mouvante** : sept des neuf premiers calques certifiés
étaient construits par `match.py`, donc n'importe quelle retouche du
matcher les changeait silencieusement. La certification perdait alors son
sens sans que rien ne le signale.

Geler résout les deux côtés du problème d'un coup :

- ce qui est certifié le reste, quoi qu'il arrive au matcher ;
- le matcher redevient libre d'évoluer, puisqu'il n'a plus la garde de
  pages déjà validées.

À lancer **juste après** avoir écrit `verified`, sur le `chords.json`
qu'on vient de relire — pas avant, sinon on gèle du non-vérifié.

Usage (depuis GCCLouange/) :
    python3 scripts/jianpu/freeze.py <slug>
    python3 scripts/jianpu/freeze.py --all   # tous les certifiés non gelés
"""

from __future__ import annotations

import functools
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(HERE, "..", "..", "public", "jianpu")
GOLD = os.path.join(HERE, "gold")

@functools.lru_cache(maxsize=1)
def _label_keys() -> tuple[str, ...]:
    """Les clés d'une étiquette, **lues chez `build-chords`**.

    Elles y étaient recopiées, et l'oubli ne cassait rien de visible : la
    page gelait, et ses accords en autre tonalité redevenaient en silence
    des accords de la tonalité de la page — un calque à deux tonalités,
    exactement ce que la boucle tient pour pire que rien (itération 54).
    `build-chords.py` porte un tiret : il ne s'importe pas par son nom.
    """
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "build_chords", os.path.join(HERE, "build-chords.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.LABEL_KEYS


def freeze(slug: str, entry: dict) -> str:
    path = os.path.join(GOLD, f"{slug}.json")
    if not os.path.exists(path):
        return "pas de vérité terrain"
    gold = json.load(open(path, encoding="utf8"))
    if not gold.get("verified"):
        return "pas certifié — rien à geler"
    if gold.get("frozen_labels"):
        return "déjà gelé"

    gold["frozen_labels"] = [{k: l[k] for k in _label_keys() if k in l} for l in entry["labels"]]
    with open(path, "w", encoding="utf8") as fh:
        json.dump(gold, fh, ensure_ascii=False, indent=1)
    return f"{len(gold['frozen_labels'])} étiquettes gelées"


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    every = "--all" in sys.argv
    if not args and not every:
        raise SystemExit("Usage: freeze.py <slug> | freeze.py --all")

    chords = json.load(open(os.path.join(IMAGES, "chords.json"), encoding="utf8"))
    for slug, entry in sorted(chords.items()):
        if not every and slug not in args:
            continue
        note = freeze(slug, entry)
        if every and note in ("pas certifié — rien à geler", "pas de vérité terrain"):
            continue
        print(f"  {slug:16} {note}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
