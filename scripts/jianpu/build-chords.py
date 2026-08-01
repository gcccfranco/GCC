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

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

from classify import classify, load_params  # noqa: E402
from match import (  # noqa: E402
    JURY, MIN_SCORE, best_match, build_templates, keep, read, signature, vocabulary,
)
from segment import INK_THRESHOLD  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(HERE, "..", "..", "public", "jianpu")
SONGS = os.path.join(HERE, "..", "..", "content", "songs")
GOLD = os.path.join(HERE, "gold")
INVENTAIRE = os.path.join(HERE, "inventaire.json")


def cho_key(slug: str) -> str | None:
    text = open(os.path.join(SONGS, f"{slug}.cho"), encoding="utf8").read()
    m = re.search(r"\{key:\s*([^}]+)\}", text)
    return m.group(1).strip() if m else None


def stray_chords(slug: str, path: str, labels: list[dict]) -> list[str]:
    """Accords imprimés que le calque ne couvre pas, cherchés sur **toute**
    la page.

    Le contrôle précédent comptait les rangées que le classifieur avait
    laissées en « ? » — donc il reposait sur la classification qu'il était
    censé vérifier. Trois fois de suite, une rangée d'accords a échappé aux
    deux : typée `numbers` parce que ses étiquettes étaient courtes, puis
    non promue parce que la rangée de chiffres qui la suivait était elle
    aussi mal typée. À chaque fois, la partition partait en production en
    mélangeant deux tonalités.

    Le contrôle est donc refait sans le classifieur : on apparie **tous**
    les amas de la page au vocabulaire du `.cho`. Un amas qui ressemble à un
    accord du chant, hors des rangées publiées, est un accord qui resterait
    dans l'ancienne tonalité. Les chiffres et les hanzi n'apparient rien —
    c'est ce que quatre itérations de mise au point du matcher ont établi.
    """
    covered = {(l["y"], l["x"]) for l in labels}
    ink = np.asarray(Image.open(path).convert("L")) < INK_THRESHOLD
    _ink, _w, feats, kinds = classify(path)
    page_h = max(f["bottom"] for f in feats) if feats else 0
    floor = load_params()["min_top_frac"] * page_h
    templates = build_templates(vocabulary(slug))
    jury = [build_templates(vocabulary(slug), 0, p) for p in JURY if os.path.exists(p)]

    out = []
    for f in feats:
        if f["top"] < floor:
            continue
        for x0, x1 in f["clusters"]:
            if (f["top"], x0) in covered:
                continue
            sub = ink[f["top"] : f["bottom"] + 1, x0 : x1 + 1]
            ys, xs = np.where(sub.any(1))[0], np.where(sub.any(0))[0]
            if not len(ys) or not len(xs):
                continue
            sig = signature(sub[ys[0] : ys[-1] + 1, xs[0] : xs[-1] + 1])
            score, chord = best_match(sig, templates)
            if score >= MIN_SCORE and all(best_match(sig, t)[1] == chord for t in jury):
                out.append(f"{chord}@y{f['top']}")
    return out


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
        # sur les autres. Une rangée absente veut dire que la vérité terrain
        # ne la couvre pas — et une rangée non couverte resterait dans
        # l'ancienne tonalité une fois le chant transposé.
        if not chords or len(chords) != len(row):
            return [], f"vérité terrain incomplète (rangée y={f['top']})"
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

    # Trois choses suivent la transposition sur une page 简谱 : les accords,
    # le libellé « 1=X » et le pinyin. Sans le cadre du libellé, une page
    # transposée affiche ses accords dans la nouvelle tonalité sous un
    # « 1=F » resté dans l'ancienne — exactement le défaut de page à deux
    # tonalités que le contrôle par transposition a débusqué sur les
    # accords. Le localiser automatiquement a été tenté et abandonné (voir
    # LOOP.md, itération 8) : il se mesure à l'œil, une fois par partition.
    if not gold.get("key_label"):
        return None, "cadre du libellé 1=X non mesuré"

    if gold.get("chord_rows"):
        labels, note = _from_gold(slug, gold)
    else:
        labels, note = _from_reading(slug)
    if not labels:
        return None, note

    # Le verrou de complétude vaut pour les deux voies — la vérité terrain
    # n'en dispense pas : celle de 爱赢了 ne couvrait que les rangées que le
    # classifieur avait trouvées. Il s'applique au calque construit, donc à
    # ce qui partirait vraiment en production.
    strays = stray_chords(slug, path, labels)
    if strays:
        return None, f"{len(strays)} accord(s) hors calque : {' '.join(strays[:4])}"

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
