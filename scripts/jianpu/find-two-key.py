#!/usr/bin/env python3
"""Trouve les pages qui impriment **deux jeux d'accords** dans deux tonalités.

Le format : une même ligne de mélodie porte deux rangées d'accords
empilées, l'une dans la tonalité de l'en-tête, l'autre transposée d'un
intervalle constant. 尽情地微笑 imprime `G D/F# F# Bm Em A` et, juste
au-dessus, `Bb F/A A Dm Gm C` — le même enchaînement trois demi-tons plus
haut. Son en-tête l'annonce : « [共8张：原版/简版 x C/D调…] ».

Ces rangées sont invisibles au reste de la chaîne, et pour une raison de
fond : le matcher n'essaie que le vocabulaire du `.cho` **à la tonalité de
la page**. Une rangée gravée trois demi-tons plus haut n'apparie donc rien,
le classifieur la type `?` ou `numbers`, et elle n'entre dans aucun
dénominateur. La page part alors en production en mélangeant deux
tonalités — le mode D de l'itération 15, mais causé par le format et non
par un raté de détection.

Le test est direct : pour chaque rangée, on cherche l'intervalle qui la lit
le mieux. Une rangée à l'intervalle 0 est la rangée de la page ; une
rangée qui ne se lit bien qu'à un autre intervalle est une **seconde
tonalité**, et l'intervalle est celui qui les sépare.

Usage (depuis GCCLouange/) :
    python3 scripts/jianpu/find-two-key.py [<slug>…]
"""

from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

from classify import classify  # noqa: E402
from match import (  # noqa: E402
    MIN_SCORE, SHARP, best_match, face_bank, note_index, signature, song_face,
    song_semitones, vocabulary, width_factor,
)
from segment import INK_THRESHOLD  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(HERE, "..", "..", "public", "jianpu")

# Une rangée n'est retenue que si elle est franchement lue à son intervalle
# et franchement mal lue à celui de la page : sans ce second test, toute
# rangée un peu bruitée ressort avec un intervalle au hasard.
MIN_ROW = 4
MIN_HIT = 0.70
MAX_AT_PAGE = 0.30


def rows_of(slug: str):
    path = os.path.join(IMAGES, f"{slug}-p1.webp")
    ink = np.asarray(Image.open(path).convert("L")) < INK_THRESHOLD
    _i, _w, feats, kinds = classify(path)
    out = []
    for f, kind in zip(feats, kinds):
        sigs = []
        for x0, x1 in f["clusters"]:
            sub = ink[f["top"]:f["bottom"] + 1, x0:x1 + 1]
            ys, xs = np.where(sub.any(1))[0], np.where(sub.any(0))[0]
            if len(ys) and len(xs):
                sigs.append(signature(sub[ys[0]:ys[-1] + 1, xs[0]:xs[-1] + 1]))
        if len(sigs) >= MIN_ROW:
            out.append((f["top"], kind, sigs))
    return out


def examine(slug: str) -> list[dict]:
    vocab = vocabulary(slug)
    if not vocab:
        return []
    base = song_semitones(slug)
    face = song_face(slug)
    rows = rows_of(slug)
    if not rows:
        return []
    # La chasse est globale à la page : on l'estime une fois, à sa tonalité.
    ref = face_bank(vocab, base, face)
    kf = width_factor([s for _t, _k, sigs in rows for s in sigs], ref)

    banks = {d: face_bank(vocab, (base + d) % 12, face) for d in range(12)}
    out = []
    for top, kind, sigs in rows:
        hits = {}
        for d, bank in banks.items():
            hits[d] = sum(1 for s in sigs if best_match(s, bank, kf)[0] >= MIN_SCORE) / len(sigs)
        d_best = max(hits, key=lambda d: hits[d])
        if d_best and hits[d_best] >= MIN_HIT and hits[0] <= MAX_AT_PAGE:
            out.append({"slug": slug, "y": top, "kind": kind, "n": len(sigs),
                        "semitones": d_best, "hit": round(hits[d_best], 2),
                        "at_page": round(hits[0], 2)})
    return out


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    chords = json.load(open(os.path.join(IMAGES, "chords.json"), encoding="utf8"))
    pages = args or sorted(chords)

    found = []
    for slug in pages:
        try:
            hits = examine(slug)
        except FileNotFoundError:
            continue
        for h in hits:
            found.append(h)
            key = chords.get(slug, {}).get("printedKey")
            other = SHARP[(note_index(key) + h["semitones"]) % 12] if key else "?"
            print(f"  {slug:20} y={h['y']:5} ({h['kind']:8}) {h['n']:2} amas  "
                  f"lue à +{h['semitones']:2} → 1={other:2}  "
                  f"{h['hit']:.0%} contre {h['at_page']:.0%} à la tonalité de la page", flush=True)

    print(f"\n{len(found)} rangée(s) en seconde tonalité sur "
          f"{len({f['slug'] for f in found})} chant(s), {len(pages)} examinés")
    json.dump(found, open(os.path.join(HERE, "debug", "_two-key.json"), "w", encoding="utf8"),
              ensure_ascii=False, indent=1)
    return 0


if __name__ == "__main__":
    sys.exit(main())
