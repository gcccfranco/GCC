#!/usr/bin/env python3
"""Classe les chants par **certifiabilité**, pas par couverture.

Le classement par couverture ment. 尽情地微笑 affichait 49/52 — 94 %, le
meilleur du corpus — et chacune de ses étiquettes détectées était lue
juste. L'audit de page a pourtant montré **trois rangées entières
invisibles** : une typée `numbers`, deux typées `?`. La couverture ne
compte que dans les rangées trouvées ; une rangée jamais détectée n'entre
dans aucun dénominateur. C'est le mode D de l'itération 15, et il rend le
classement par couverture non seulement inutile mais trompeur — il met en
tête les pages dont on ignore le plus de choses.

Ce script cherche donc ce que la couverture ne peut pas voir : dans les
rangées que le classifieur a typées **autrement que `chords`**, il apparie
les amas au vocabulaire de la page. Une rangée de chiffres ou de hanzi
n'apparie rien — quatre itérations de mise au point du matcher l'ont
établi. Une rangée qui apparie massivement est une rangée d'accords que le
classifieur a manquée.

Trois colonnes en sortent, et seule la dernière décide :

- **couverture** — ce que le calque publie sur ce qu'il a détecté ;
- **cachées** — rangées d'accords hors des rangées détectées ;
- **verdict** — `prêt` seulement si rien n'est caché et qu'il reste peu à
  relire. Tout le reste est du travail, pas une certification.

Usage (depuis GCCLouange/) :
    python3 scripts/jianpu/worklist.py
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
    MIN_SCORE, best_match, face_bank, keep, read, signature, song_face,
    song_semitones, vocabulary, width_factor,
)
from segment import INK_THRESHOLD  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(HERE, "..", "..", "public", "jianpu")
GOLD = os.path.join(HERE, "gold")

# Une rangée non typée « accords » dont cette part des amas s'apparie au
# vocabulaire est une rangée d'accords manquée. Les rangées de chiffres et
# de hanzi tombent très bas — c'est ce qui rend le test utilisable.
HIDDEN_SHARE = 0.70
HIDDEN_MIN = 3


def hidden_rows(slug: str) -> list[tuple[int, str, int, int]]:
    path = os.path.join(IMAGES, f"{slug}-p1.webp")
    ink = np.asarray(Image.open(path).convert("L")) < INK_THRESHOLD
    _i, _w, feats, kinds = classify(path)
    bank = face_bank(vocabulary(slug), song_semitones(slug), song_face(slug))

    def sig_of(f, x0, x1):
        sub = ink[f["top"]:f["bottom"] + 1, x0:x1 + 1]
        ys, xs = np.where(sub.any(1))[0], np.where(sub.any(0))[0]
        if not len(ys) or not len(xs):
            return None
        return signature(sub[ys[0]:ys[-1] + 1, xs[0]:xs[-1] + 1])

    # La chasse s'estime sur les rangées déjà reconnues, pas sur la page
    # entière : y mêler des chiffres fausserait la médiane.
    refs = [s for f, k in zip(feats, kinds) if k == "chords"
            for x0, x1 in f["clusters"] if (s := sig_of(f, x0, x1)) is not None]
    kf = width_factor(refs, bank) if refs else 1.0

    out = []
    for f, k in zip(feats, kinds):
        # `chords?` est une rangée que le classifieur a proposée et que le
        # matcher tranche (itération 22) : elle est déjà dans le circuit,
        # donc elle n'est pas cachée.
        if k in ("chords", "chords?"):
            continue
        hits = tot = 0
        for x0, x1 in f["clusters"]:
            s = sig_of(f, x0, x1)
            if s is None:
                continue
            tot += 1
            hits += best_match(s, bank, kf)[0] >= MIN_SCORE
        if tot >= HIDDEN_MIN and hits / tot >= HIDDEN_SHARE:
            out.append((f["top"], k, hits, tot))
    return out


def main() -> int:
    chords = json.load(open(os.path.join(IMAGES, "chords.json"), encoding="utf8"))
    rows = []
    for slug in sorted(chords):
        gold_path = os.path.join(GOLD, f"{slug}.json")
        gold = json.load(open(gold_path, encoding="utf8")) if os.path.exists(gold_path) else {}
        if gold.get("verified"):
            continue
        r = read(slug)
        total = sum(len(x) for _f, x in r)
        kept = sum(1 for _f, x in r for (_p, _c, s, u) in x if keep(s, u))
        hidden = hidden_rows(slug)
        missing = total - kept
        has_kl = gold.get("key_label") is not None
        if hidden:
            verdict = f"{len(hidden)} rangée(s) cachée(s)"
        elif missing > 8:
            verdict = f"{missing} à relire"
        else:
            verdict = "PRÊT" + ("" if has_kl else " (cadre 1=X à mesurer)")
        rows.append((bool(hidden), missing, slug, kept, total, hidden, verdict))
        print(f"  {slug:20} {kept:3}/{total:<3} {kept/max(total,1):4.0%}  "
              f"{verdict}", flush=True)

    ready = [r for r in rows if r[6].startswith("PRÊT")]
    print(f"\n{len(ready)} prêt(s) à certifier · {sum(1 for r in rows if r[0])} "
          f"avec rangée cachée · {len(rows)} non certifiés au total")
    return 0


if __name__ == "__main__":
    sys.exit(main())
