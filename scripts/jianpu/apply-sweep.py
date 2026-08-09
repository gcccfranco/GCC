#!/usr/bin/env python3
"""Écrit dans la vérité terrain les couples (fonte, tonalité) proposés.

`sweep-key.py` ne décide de rien : il classe les couples et donne la marge.
Ce script recopie ceux qui passent les deux seuils dans
`gold/<slug>.json`, sous `face` et `printed_key`.

Ce que ces deux champs sont, et pourquoi ils peuvent s'écrire sans avoir
été lus à l'œil un par un — contrairement à `extra_labels` : ce ne sont pas
des affirmations sur un accord, ce sont des **paramètres de rendu des
gabarits**. Un mauvais choix ne peut pas injecter un accord faux dans un
calque certifié : les onze certifiés sont gelés, et pour les autres la
publication reste gouvernée par `keep()`, la couverture, et l'audit de page
entière avant toute certification. Le pire qu'une mauvaise fonte puisse
faire est de mal lire — ce que la planche de lecture montre.

Les chants déjà certifiés sont ignorés : leurs étiquettes sont gelées, la
fonte ne les concerne plus.

Usage (depuis GCCLouange/) :
    python3 scripts/jianpu/sweep-key.py --all
    python3 scripts/jianpu/apply-sweep.py [--dry-run]
"""

from __future__ import annotations

import importlib.util
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from match import DEFAULT_FACE  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
GOLD = os.path.join(HERE, "gold")

# Le trait d'union du nom de fichier interdit l'import direct.
_spec = importlib.util.spec_from_file_location("sweep_key", os.path.join(HERE, "sweep-key.py"))
_sweep = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_sweep)
MIN_SHARE, MIN_MARGIN = _sweep.MIN_SHARE, _sweep.MIN_MARGIN
MIN_FACE_SHARE = _sweep.MIN_FACE_SHARE


def main() -> int:
    dry = "--dry-run" in sys.argv
    rows = json.load(open(os.path.join(HERE, "debug", "_sweep.json"), encoding="utf8"))

    written = skipped = 0
    for r in rows:
        sure_key = r["share"] >= MIN_SHARE and r["margin"] >= MIN_MARGIN
        if r["share"] < MIN_FACE_SHARE and not sure_key:
            continue
        path = os.path.join(GOLD, f"{r['slug']}.json")
        gold = json.load(open(path, encoding="utf8")) if os.path.exists(path) else {"slug": r["slug"]}
        if gold.get("verified"):
            skipped += 1
            continue

        changes = []
        current = gold.get("face", DEFAULT_FACE)
        if r["share"] >= MIN_FACE_SHARE and current != r["face"]:
            changes.append(f"face {current} → {r['face']}")
            gold["face"] = r["face"]
        if sure_key and r["semitones"] and gold.get("printed_key") != r["printed_key"]:
            changes.append(f"1={gold.get('printed_key') or r['cho_key']} → 1={r['printed_key']}")
            gold["printed_key"] = r["printed_key"]
        if not changes:
            continue

        written += 1
        print(f"  {r['slug']:20} {' · '.join(changes)}   ({r['share']:.0%}, marge {r['margin']:+.0%})")
        if not dry:
            with open(path, "w", encoding="utf8") as fh:
                json.dump(gold, fh, ensure_ascii=False, indent=1)

    print(f"\n{written} chant(s) {'à écrire' if dry else 'écrits'} · {skipped} certifié(s) ignoré(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
