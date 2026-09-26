#!/usr/bin/env python3
"""Ligne pinyin d'une ligne de hanzi, ou d'un .cho entier.

Pourquoi : le site affiche le pinyin ligne à ligne, un groupe par caractère ;
le générer à la main est la première source d'erreurs de compte. pypinyin
(mode phrase, tons en diacritiques) fait le gros du travail, la table
« Exceptions pinyin » de docs/chants/01-format-cho.md corrige les lectures
contextuelles que pypinyin manque. Pronoms 祢/祂 et 繁体 sont normalisés
avant lecture, pour que le pinyin soit celui de 你/他.

Usage (depuis GCCLouange/) :
    python3 scripts/cho/pinyin.py "主，我愿意！让自己像种子"
    python3 scripts/cho/pinyin.py --file content/songs/安静.cho   # le .cho réécrit sur stdout
    python3 scripts/cho/pinyin.py "…" --json

`--file` ne modifie rien : chaque ligne chantée sort au format
`hanzi   pinyin` (3 espaces), le reste du fichier tel quel.
"""
from __future__ import annotations

import argparse
import json
import os
import sys

def _load_cho():
    """Charge _cho.py par chemin après avoir retiré scripts/cho/ de sys.path :
    `inspect.py` y masquerait le module standard `inspect` (pymupdf, PIL)."""
    import importlib.util
    here = os.path.dirname(os.path.abspath(__file__))
    sys.path[:] = [p for p in sys.path if os.path.abspath(p or os.getcwd()) != here]
    spec = importlib.util.spec_from_file_location("_cho", os.path.join(here, "_cho.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_cho = _load_cho()


def rewrite(path: str):
    cho = _cho.read_cho(path)
    exc = _cho.pinyin_exceptions()
    out, rows = [], []
    skip = set()
    for it in cho["items"]:
        if it["kind"] == "sung" and _cho.has_hanzi(it["text"]):
            py = _cho.pinyin_line(it["text"], exc)
            lyric = it["lyric"].rstrip()
            out.append(f"{lyric}   {py}")
            rows.append(dict(line=it["lineno"], lyric=lyric, pinyin=py, before=it["pinyin"]))
            if it.get("pinyin_next"):
                skip.add(it["pinyin_lineno"])
        else:
            if it["lineno"] in skip:
                continue
            out.append(it["raw"])
    return out, rows


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("line", nargs="?", help="ligne de hanzi (les accords [X] et la ponctuation sont ignorés)")
    ap.add_argument("--file", help="un .cho : réécrit chaque ligne chantée zh sur stdout")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args(argv)
    if args.file:
        out, rows = rewrite(_cho.song_path(args.file))
        if args.json:
            print(json.dumps(rows, ensure_ascii=False, indent=1))
        else:
            print("\n".join(out))
        return 0
    if not args.line:
        ap.error("donner une ligne ou --file")
    text, _ = _cho.parse_lyric(args.line)
    groups = _cho.pinyin_groups(text)
    if args.json:
        print(json.dumps(dict(hanzi=_cho.hanzi_only(_cho.to_simplified(text)), groups=groups,
                              line=" ".join(groups)), ensure_ascii=False))
    else:
        print(" ".join(groups))
    return 0


if __name__ == "__main__":
    sys.exit(main())
