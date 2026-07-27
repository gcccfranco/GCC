#!/usr/bin/env python3
"""Émet les coordonnées des étiquettes d'accords pour le calque client.

Le calque ne peut pas être un PNG pré-rendu : 124 chants × 12 tonalités,
c'est intenable. On garde donc **une seule image** et on publie les
*coordonnées* de chaque étiquette avec l'accord qu'elle porte. Le
navigateur masque et réécrit à la volée, en réutilisant `transposeChord`
déjà présent dans l'application.

Deux voies mènent à la publication, et une seule des deux passe par une
machine :

- **la vérité terrain** — `gold/<slug>.json`, lue à l'œil. Elle publie
  telle quelle, c'est la seule voie certifiée ;
- **la lecture automatique** par `match.py` (vocabulaire fermé, gabarits
  rendus), qui ne publie que si elle est *complète* — voir plus bas.

**Publier un calque incomplet est pire que ne rien publier.** Un accord non
lu garde le nom imprimé ; une fois le chant transposé, la page affiche donc
des accords dans deux tonalités à la fois. On ne publie qu'une lecture
*complète* : toutes les étiquettes de toutes les rangées d'accords, et
aucune rangée candidate laissée de côté.

Cela règle du même coup la tonalité imprimée, qui est l'autre point
sensible : 32 des 124 partitions ne sont pas gravées dans la tonalité de
leur `.cho`, et une tonalité fausse transpose tout le calque de travers. On
ne devine pas — on lit avec le vocabulaire du `.cho`, et si la partition
était dans une autre tonalité les gabarits ne colleraient nulle part. Une
lecture complète est donc aussi la preuve que la tonalité est la bonne.

Usage (depuis GCCLouange/) :
    python3 scripts/jianpu/build-chords.py

Sortie : public/jianpu/chords.json
"""

from __future__ import annotations

import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from PIL import Image  # noqa: E402

from classify import classify, load_params  # noqa: E402
from match import keep, read  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(HERE, "..", "..", "public", "jianpu")
SONGS = os.path.join(HERE, "..", "..", "content", "songs")
GOLD = os.path.join(HERE, "gold")
INVENTAIRE = os.path.join(HERE, "inventaire.json")


def cho_key(slug: str) -> str | None:
    text = open(os.path.join(SONGS, f"{slug}.cho"), encoding="utf8").read()
    m = re.search(r"\{key:\s*([^}]+)\}", text)
    return m.group(1).strip() if m else None


def orphan_rows(path: str) -> int:
    """Rangées qui pourraient porter des accords et que le classifieur a
    laissées en « ? ».

    Une seule suffit à disqualifier la partition : c'est peut-être un
    système entier dont les accords ne seraient pas transposés. Les rangées
    du bandeau de titre sont exclues, par le même invariant de mise en page
    que le classifieur (`min_top_frac`).
    """
    _ink, _w, feats, kinds = classify(path)
    page_h = max(f["bottom"] for f in feats) if feats else 0
    floor = load_params()["min_top_frac"] * page_h
    count = 0
    for i, (f, kind) in enumerate(zip(feats, kinds)):
        if kind != "?" or f["top"] < floor:
            continue
        j = i + 1
        while j < len(kinds) and kinds[j] == "noise":
            j += 1
        if j < len(kinds) and kinds[j] == "numbers":
            count += 1
    return count


def _box(f, x0: int, x1: int, chord: str) -> dict:
    return {"x": x0, "y": f["top"], "w": x1 - x0 + 1, "h": f["bottom"] - f["top"] + 1, "c": chord}


def _from_gold(slug: str, gold: dict):
    """Publie la vérité terrain. `null` marque un amas qui n'est pas une
    étiquette (crochet de reprise, D.S., segno) : on le laisse intact."""
    by_top = {r["top"]: r["chords"] for r in gold["chord_rows"]}
    labels = []
    for f, row in read(slug):
        chords = by_top.get(f["top"])
        # Un écart de compte veut dire que le découpage a bougé depuis que
        # la vérité terrain a été écrite : on poserait les accords les uns
        # sur les autres.
        if not chords or len(chords) != len(row):
            continue
        for ((x0, x1), _c, _s, _u), chord in zip(row, chords):
            if chord:
                labels.append(_box(f, x0, x1, chord))
    return labels, (f"{len(labels)} étiquettes (vérité terrain)" if labels else "aucune rangée alignée")


def _from_reading(slug: str):
    """Publie la lecture automatique, mais seulement si elle est complète."""
    rows = read(slug)
    total = sum(len(r) for _f, r in rows)
    if not total:
        return [], "aucune rangée d'accords"
    labels = [
        _box(f, x0, x1, chord)
        for f, row in rows
        for (x0, x1), chord, score, unanimous in row
        if keep(score, unanimous)
    ]
    if len(labels) < total:
        return [], f"lecture incomplète : {len(labels)}/{total} étiquettes"
    return labels, f"{len(labels)} étiquettes (lecture)"


def build(slug: str):
    path = os.path.join(IMAGES, f"{slug}-p1.webp")
    if not os.path.exists(path):
        return None, "image absente"

    gold_path = os.path.join(GOLD, f"{slug}.json")
    gold = json.load(open(gold_path, encoding="utf8")) if os.path.exists(gold_path) else {}
    printed_key = gold.get("printed_key") or cho_key(slug)
    if not printed_key:
        return None, "tonalité inconnue"

    # Le verrou de complétude vaut pour les deux voies. La vérité terrain
    # n'en dispense pas : celle de 爱赢了 ne couvre que les rangées que le
    # classifieur avait trouvées, et le contrôle par transposition montre
    # que la page afficherait alors 3 rangées en A# et 4 restées en A.
    orphans = orphan_rows(path)
    if orphans:
        return None, f"{orphans} rangée(s) candidate(s) non lue(s)"

    if gold.get("chord_rows"):
        labels, note = _from_gold(slug, gold)
    else:
        labels, note = _from_reading(slug)
    if not labels:
        return None, note

    with Image.open(path) as im:
        w, h = im.size

    # Une seule taille de texte pour tout le chant. La hauteur de bande
    # varie selon les glyphes présents (une rangée sans jambage est
    # détectée plus fine), donc la prendre par rangée donnait des accords
    # de tailles différentes sur la même page.
    heights = sorted(l["h"] for l in labels)
    entry = {
        "printedKey": printed_key,
        "w": w,
        "h": h,
        "labelH": heights[len(heights) // 2],
        "labels": labels,
    }
    if gold.get("key_label"):
        entry["keyLabel"] = gold["key_label"]
    return entry, f"{note} · 1={printed_key}"


def main() -> int:
    inventaire = json.load(open(INVENTAIRE, encoding="utf8"))
    out = {}
    for item in inventaire:
        slug = item["slug"]
        entry, note = build(slug)
        if entry:
            out[slug] = entry
            print(f"  {slug:16} {note}")

    dest = os.path.join(IMAGES, "chords.json")
    with open(dest, "w", encoding="utf8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=0, sort_keys=True)
    print(f"✓ {len(out)}/{len(inventaire)} chant(s) avec calque → public/jianpu/chords.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
