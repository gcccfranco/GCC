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
    MIN_SCORE, best_match, crop_labels, face_bank, signature, song_face,
    song_semitones, vocabulary, width_factor,
)
from segment import INK_THRESHOLD  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(HERE, "..", "..", "public", "jianpu")
GOLD = os.path.join(HERE, "gold")

# Une rangée non typée « accords » dont cette part des amas s'apparie au
# vocabulaire est une rangée d'accords manquée. Les rangées de chiffres et
# de hanzi tombent très bas — c'est ce qui rend le test utilisable.
#
# La part était à 0,70, et elle laissait passer les rangées d'accords les
# plus difficiles : 让爱走动 affichait « 22/22, PRÊT » avec **trois rangées
# entières** jamais détectées, à 2/4, 3/5 et 4/9 (itération 33). Une rangée
# d'accords ne s'apparie pas mieux que ça quand elle porte un `Bdim/F`, un
# `D7` à exposant et un `Cm/D` — c'est-à-dire précisément quand on a besoin
# du test.
#
# Descendre à 0,40 seul rendrait le test bavard : des rangées de chiffres y
# passeraient. Le second garde est le **nombre d'amas**, comme à
# l'itération 23 : une rangée de chiffres de cette page en compte une
# trentaine, une rangée d'accords cinq. On ne regarde donc que les rangées
# nettement plus courtes que les rangées de chiffres de la même page.
HIDDEN_SHARE = 0.40
HIDDEN_MIN = 3
# Part maximale du nombre d'amas d'une rangée de chiffres (médiane de la page).
HIDDEN_MAX_CLUSTERS = 0.55


def hidden_rows(slug: str, entry: dict | None = None) -> list[tuple[int, str, int, int]]:
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

    # Étalon du nombre d'amas d'une rangée de chiffres, sur cette page.
    counts = [len(f["clusters"]) for f, k in zip(feats, kinds) if k == "numbers"]
    ceiling = HIDDEN_MAX_CLUSTERS * float(np.median(counts)) if counts else None

    # Une rangée que le calque couvre déjà n'est plus cachée : c'est ce que
    # font les `extra_labels` posées à la main sur une rangée que le
    # classifieur range ailleurs. Le test porte sur le matcher, et le
    # matcher ne les voit pas — sans ce filtre, une page réparée reste
    # marquée « rangée cachée » pour toujours.
    known = (entry["labels"] + ([entry["keyLabel"]] if entry.get("keyLabel") else [])) if entry else []

    out = []
    for f, k in zip(feats, kinds):
        # `chords?` est une rangée que le classifieur a proposée et que le
        # matcher tranche (itération 22) : elle est déjà dans le circuit,
        # donc elle n'est pas cachée.
        if k in ("chords", "chords?"):
            continue
        if ceiling is not None and len(f["clusters"]) > ceiling:
            continue
        if known:
            covered = sum(1 for x0, x1 in f["clusters"]
                          if _overlaps((x0, f["top"], x1, f["bottom"]), known))
            if covered >= 0.5 * len(f["clusters"]):
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


def _overlaps(box, labels) -> bool:
    x0, y0, x1, y1 = box
    for l in labels:
        if x0 <= l["x"] + l["w"] - 1 and l["x"] <= x1 and y0 <= l["y"] + l["h"] - 1 and l["y"] <= y1:
            return True
    return False


def remaining(slug: str, entry: dict, gold: dict) -> tuple[int, int]:
    """Ce que le **calque publié** couvre, et ce qu'il reste à lire.

    Le compte se faisait sur la seule sortie du matcher (`read` + `keep`),
    et il ne bougeait donc jamais : une page dont les derniers amas ont été
    relus à l'œil et versés en `extra_labels` continuait d'afficher « 10 à
    relire », indéfiniment. Le lot de l'itération 33 — six pages, vingt-cinq
    amas relus — n'a pas déplacé une seule ligne du classement. La file
    « PRÊT » restait vide non pas faute de travail fait, mais parce que la
    métrique ne savait pas le voir. *Encore une fois : une métrique ne
    mesure que ce qu'on a pensé à regarder.*

    On compare donc les amas de la page à ce que `chords.json` publie
    réellement — lecture, `corrections`, `extra_labels` et masques compris.
    """
    known = entry["labels"] + ([entry["keyLabel"]] if entry.get("keyLabel") else [])
    published = [l for l in entry["labels"] if l.get("c")]
    skip = {int(y) for y in gold.get("not_rows", [])} | {int(y) for y in gold.get("mask_rows", [])}
    blanks = set(gold.get("not_labels", []))

    # Les rangées sont celles que la lecture parcourt — `chords`, et les
    # `chords?` que le matcher tranche. Prendre toutes les `chords?` du
    # classifieur ferait rentrer des rangées de musique entières dans le
    # dénominateur : le classifieur peut être permissif *parce que* le
    # matcher dispose (itération 7), et c'est ici la même règle.
    miss = 0
    for f, cells in crop_labels(slug):
        if f["top"] in skip:
            continue
        for (x0, x1), _bitmap in cells:
            if f"{f['top']},{x0}" in blanks:
                continue
            if _overlaps((x0, f["top"], x1, f["bottom"]), known):
                continue
            miss += 1
    return len(published), miss


def main() -> int:
    chords = json.load(open(os.path.join(IMAGES, "chords.json"), encoding="utf8"))
    rows = []
    for slug in sorted(chords):
        gold_path = os.path.join(GOLD, f"{slug}.json")
        gold = json.load(open(gold_path, encoding="utf8")) if os.path.exists(gold_path) else {}
        if gold.get("verified"):
            continue
        kept, missing = remaining(slug, chords[slug], gold)
        total = kept + missing
        hidden = hidden_rows(slug, chords[slug])
        has_kl = gold.get("key_label") is not None
        # Un cadre mesuré puis **écarté** (le do gravé diffère de printedKey,
        # cf. 十架的爱) porte sa note sans porter de cadre. Sans ce cas, le
        # classement le redemanderait à chaque tour : c'est le défaut de
        # l'itération 33, où la file ne voyait pas le travail déjà fait.
        kl_note = gold.get("key_label_verified")
        if hidden:
            verdict = f"{len(hidden)} rangée(s) cachée(s)"
        elif missing > 8:
            verdict = f"{missing} à relire"
        elif has_kl:
            verdict = "PRÊT"
        elif kl_note:
            verdict = "PRÊT (cadre 1=X écarté, voir gold)"
        else:
            verdict = "PRÊT (cadre 1=X à mesurer)"
        rows.append((bool(hidden), missing, slug, kept, total, hidden, verdict))
        print(f"  {slug:20} {kept:3}/{total:<3} {kept/max(total,1):4.0%}  "
              f"{verdict}", flush=True)

    ready = [r for r in rows if r[6].startswith("PRÊT")]
    print(f"\n{len(ready)} prêt(s) à certifier · {sum(1 for r in rows if r[0])} "
          f"avec rangée cachée · {len(rows)} non certifiés au total")
    return 0


if __name__ == "__main__":
    sys.exit(main())
