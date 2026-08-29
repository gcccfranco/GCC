#!/usr/bin/env python3
"""Propose des **accords absents du `.cho`** (`extra_chords`), pour tout le corpus.

L'itération 32 a montré que le vocabulaire fermé ne se contente pas de ne
rien lire : il **publie faux**. Contraint au vocabulaire de la page, le
matcher rend le candidat le plus proche — « F/A » pour un « F/C » gravé,
« G7 » pour « C7 » — unanime et au-dessus du seuil, donc compté comme une
réussite. Ces deux pages-là ont été trouvées à l'audit, une par une.

Ce script cherche le même défaut mécaniquement. Pour chaque amas non
couvert d'une rangée où le calque publie déjà, il compare deux lectures :

- **fermée** — le vocabulaire du `.cho` (plus les `extra_chords` déjà là) ;
- **ouverte** — le même vocabulaire plus un alphabet de degrés relevé sur
  tout le corpus (`{key:}` + accords du `.cho`, ramenés au degré).

Un amas que l'ouverture lit **franchement mieux** est un accord gravé hors
vocabulaire. C'est une *proposition*, pas une lecture : l'itération 9 a
mesuré qu'un vocabulaire élargi lit moins bien (95 → 76 justes). On ne
publie donc jamais avec l'alphabet ouvert — on s'en sert pour **nommer**
l'accord manquant, que l'œil confirme sur le zoom avant de le verser dans
`extra_chords`. C'est le geste de l'itération 32, appliqué d'un coup.

`--published` retourne le test contre les étiquettes que le calque
**publie déjà**. C'est là que le défaut fait le plus de mal : un accord
gravé hors vocabulaire n'est pas ignoré, il est remplacé par le plus proche
du vocabulaire — « C#m7b5 » pour un « F#m7b5 » imprimé, « Em7 » pour un
« Fm7 » (握住幸福, itération 33). Unanime, au-dessus du seuil, compté comme
une réussite, et invisible à tout compteur : seul l'audit de page l'attrape,
une page à la fois. Ici on le cherche sur tout le corpus d'un coup.

Usage (depuis GCCLouange/) :
    python3 scripts/jianpu/propose-chords.py             # amas non couverts
    python3 scripts/jianpu/propose-chords.py --published # étiquettes publiées
    python3 scripts/jianpu/propose-chords.py <slug>      # un chant

Sortie : scripts/jianpu/debug/_chords-<n>.png (zooms)
         scripts/jianpu/debug/_chords-proposals.json
"""

from __future__ import annotations

import collections
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

from classify import classify, load_params  # noqa: E402
from match import (  # noqa: E402
    CHORD_RE, FLAT, SHARP, best_match, build_templates, face_bank, jury_faces,
    note_index, signature, song_face, song_semitones, vocabulary, width_factor,
)
from segment import INK_THRESHOLD  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(HERE, "..", "..", "public", "jianpu")
SONGS = os.path.join(HERE, "..", "..", "content", "songs")
OUT = os.path.join(HERE, "debug")

# Un degré retenu dans l'alphabet doit se rencontrer dans au moins tant de
# chants : ce qui n'apparaît qu'une fois est une singularité de
# transcription, pas une case du langage.
MIN_SONGS = 2
# L'ouverture doit lire *franchement* mieux que la fermeture. Sous cet
# écart, c'est le bruit des variantes de graphie qui parle.
MARGIN = 0.08
MIN_OPEN = 0.34
# Sur une étiquette publiée, le plancher est plus bas : l'accord gravé hors
# vocabulaire s'apparie mal par construction, puisque son gabarit manquait.
MIN_OPEN_PUBLISHED = 0.20


def alphabet() -> list[tuple[int, str, int | None]]:
    """Degrés (intervalle à la tonique, suffixe, degré de basse) du corpus."""
    seen: dict[tuple[int, str, int | None], set[str]] = collections.defaultdict(set)
    for name in os.listdir(SONGS):
        if not name.endswith(".cho"):
            continue
        text = open(os.path.join(SONGS, name), encoding="utf8").read()
        m = re.search(r"\{key:\s*([^}]+)\}", text)
        if not m:
            continue
        try:
            key = note_index(m.group(1).strip())
        except ValueError:
            continue
        for token in re.findall(r"\[([^\]]+)\]", text):
            token = token.strip().strip("()")
            mm = CHORD_RE.match(token)
            if not mm:
                continue
            root, suffix, bass = mm.groups()
            try:
                deg = (note_index(root) - key) % 12
                bdeg = (note_index(bass) - key) % 12 if bass else None
            except ValueError:
                continue
            seen[(deg, suffix, bdeg)].add(name)
    return [k for k, songs in seen.items() if len(songs) >= MIN_SONGS]


def _spell(index: int, flats: bool) -> str:
    return (FLAT if flats else SHARP)[index % 12]


def open_vocabulary(slug: str, vocab: list[str], alpha) -> list[str]:
    """Le vocabulaire de la page, plus l'alphabet du corpus à sa tonique."""
    text = open(os.path.join(SONGS, f"{slug}.cho"), encoding="utf8").read()
    m = re.search(r"\{key:\s*([^}]+)\}", text)
    if not m:
        return []
    key = note_index(m.group(1).strip())
    flats = sum("b" in c for c in vocab) >= sum("#" in c for c in vocab)
    out = []
    for deg, suffix, bdeg in alpha:
        name = _spell(key + deg, flats) + suffix
        if bdeg is not None:
            name += "/" + _spell(key + bdeg, flats)
        if name not in vocab and name not in out:
            out.append(name)

    # L'alphabet du corpus a un angle mort : une qualité que *cette* page
    # emploie peut n'exister nulle part ailleurs à ce degré-là. 握住幸福
    # grave un « Fm7 » — un `m7` sur la sous-tonique — et aucun `.cho` du
    # corpus n'en porte, si bien que le vocabulaire ouvert ne le proposait
    # pas davantage que le fermé. On ajoute donc les **suffixes de la page
    # elle-même** à tous les degrés : le graveur réemploie ses qualités.
    suffixes = set()
    for chord in vocab:
        m = CHORD_RE.match(chord)
        if m and not m.group(3):
            suffixes.add(m.group(2))
    for suffix in sorted(suffixes):
        for deg in range(12):
            name = _spell(key + deg, flats) + suffix
            if name not in vocab and name not in out:
                out.append(name)
    return out


def _overlaps(box, labels) -> bool:
    x0, y0, x1, y1 = box
    for l in labels:
        if x0 <= l["x"] + l["w"] - 1 and l["x"] <= x1 and y0 <= l["y"] + l["h"] - 1 and l["y"] <= y1:
            return True
    return False


def scan(slug: str, entry: dict, alpha, published_only: bool = False) -> list[dict]:
    path = os.path.join(IMAGES, f"{slug}-p1.webp")
    known = entry["labels"] + ([entry["keyLabel"]] if entry.get("keyLabel") else [])
    published = {l["y"] for l in entry["labels"]}
    if not published:
        return []
    vocab = vocabulary(slug)
    extra = open_vocabulary(slug, vocab, alpha)
    if not extra:
        return []
    face, semitones = song_face(slug), song_semitones(slug)
    closed = face_bank(vocab, semitones, face)
    opened = face_bank(vocab + extra, semitones, face)
    juries = [(build_templates(vocab, semitones, p, i),
               build_templates(vocab + extra, semitones, p, i))
              for p, i in jury_faces(face) if os.path.exists(p)]

    ink = np.asarray(Image.open(path).convert("L")) < INK_THRESHOLD
    _ink, _w, feats, kinds = classify(path)

    # Les rangées où le calque publie déjà, **et** celles que le classifieur
    # type « accords » sans que rien n'en sorte : c'est là que dort le
    # vocabulaire manquant. Une rangée entière peut être muette parce que le
    # seul accord qu'elle porte n'est pas dans le `.cho`.
    cands = []
    if published_only:
        for l in entry["labels"]:
            if not l.get("c"):
                continue
            y0, y1 = l["y"], l["y"] + l["h"] - 1
            x0, x1 = l["x"], l["x"] + l["w"] - 1
            sub = ink[y0 : y1 + 1, x0 : x1 + 1]
            ys, xs = np.where(sub.any(1))[0], np.where(sub.any(0))[0]
            if not len(ys) or not len(xs):
                continue
            cands.append((l["y"], x0, x1, int(y0 + ys[0]), int(y0 + ys[-1]),
                          signature(sub[ys[0] : ys[-1] + 1, xs[0] : xs[-1] + 1]), l["c"]))
        return _judge(cands, vocab, closed, opened, juries, published_only)

    for f, kind in zip(feats, kinds):
        if f["top"] not in published and kind not in ("chords", "chords?"):
            continue
        for x0, x1 in f["clusters"]:
            if _overlaps((x0, f["top"], x1, f["bottom"]), known):
                continue
            sub = ink[f["top"] : f["bottom"] + 1, x0 : x1 + 1]
            ys, xs = np.where(sub.any(1))[0], np.where(sub.any(0))[0]
            if not len(ys) or not len(xs):
                continue
            cands.append((f["top"], int(x0), int(x1),
                          int(f["top"] + ys[0]), int(f["top"] + ys[-1]),
                          signature(sub[ys[0] : ys[-1] + 1, xs[0] : xs[-1] + 1]), None))
    return _judge(cands, vocab, closed, opened, juries, published_only)


def _judge(cands, vocab, closed, opened, juries, published_only):
    if not cands:
        return []
    sigs = [c[5] for c in cands]
    kc = width_factor(sigs, closed)
    ko = width_factor(sigs, opened)
    jk = [(width_factor(sigs, c), width_factor(sigs, o)) for c, o in juries]

    out = []
    for top, x0, x1, y0, y1, sig, held in cands:
        sc, cc = best_match(sig, closed, kc)
        so, co = best_match(sig, opened, ko)
        # Sur une étiquette publiée, la référence n'est pas le meilleur
        # candidat fermé mais **l'accord effectivement publié** : c'est lui
        # qu'on accuse d'être faux.
        if published_only and held is not None and held != cc:
            sc, cc = best_match(sig, {held: closed[held]}, kc) if held in closed else (sc, cc)
        floor = MIN_OPEN_PUBLISHED if published_only else MIN_OPEN
        if co in vocab or so < floor or so - sc < MARGIN:
            continue
        # Le jury des fontes tranche bien un amas *non couvert*, où la
        # question est « est-ce seulement une étiquette ». Sur une étiquette
        # publiée la question est autre — « le nom est-il le bon » — et
        # l'unanimité y étouffe le signal : les deux faux accords de
        # 握住幸福 passaient le seuil et la marge, et c'est le vote des
        # fontes qui les taisait. L'œil relit de toute façon chaque zoom.
        if not published_only and not all(
                best_match(sig, o, k[1])[1] == co for o, k in zip([j[1] for j in juries], jk)):
            continue
        out.append({"x": x0, "y": y0, "w": x1 - x0 + 1, "h": y1 - y0 + 1,
                    "row": int(top), "c": co, "score": round(float(so), 2),
                    "closed": round(float(sc), 2),
                    **({"held": held} if held is not None else {})})
    return out


def main() -> int:
    chords = json.load(open(os.path.join(IMAGES, "chords.json"), encoding="utf8"))
    only = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else None
    published_only = "--published" in sys.argv
    alpha = alphabet()
    print(f"alphabet : {len(alpha)} degrés retenus (≥ {MIN_SONGS} chants)")

    proposals = {}
    for slug, entry in sorted(chords.items()):
        if only and slug != only:
            continue
        gold = os.path.join(HERE, "gold", f"{slug}.json")
        if os.path.exists(gold) and json.load(open(gold, encoding="utf8")).get("frozen_labels"):
            continue  # page gelée : son calque ne bouge plus
        rows = scan(slug, entry, alpha, published_only)
        if rows:
            proposals[slug] = rows
            by = collections.Counter(l["c"] for l in rows)
            print(f"  {slug:16} {len(rows):3} amas · " + " ".join(f"{c}×{n}" for c, n in by.most_common()))

    os.makedirs(OUT, exist_ok=True)
    json.dump(proposals, open(os.path.join(OUT, "_chords-proposals.json"), "w", encoding="utf8"),
              ensure_ascii=False, indent=0)

    CELL_W, CELL_H, ZOOM = 700, 96, 2.2
    cells = []
    for slug, rows in proposals.items():
        img = Image.open(os.path.join(IMAGES, f"{slug}-p1.webp")).convert("RGB")
        for n, l in enumerate(rows):
            cx0, cx1 = max(0, l["x"] - 60), min(img.width, l["x"] + l["w"] + 60)
            cy0, cy1 = max(0, l["y"] - 8), min(img.height, l["y"] + l["h"] + 8)
            crop = img.crop((cx0, cy0, cx1, cy1))
            crop = crop.resize((int(crop.width * ZOOM), int(crop.height * ZOOM)), Image.LANCZOS)
            cell = Image.new("RGB", (CELL_W, CELL_H), "white")
            cell.paste(crop, (0, max(0, (CELL_H - crop.height) // 2)))
            d = ImageDraw.Draw(cell)
            bx0, bx1 = (l["x"] - cx0) * ZOOM, (l["x"] + l["w"] - cx0) * ZOOM
            by0 = max(1, (l["y"] - cy0) * ZOOM - 2)
            by1 = min(CELL_H - 2, (l["y"] + l["h"] - cy0) * ZOOM + 2)
            d.rectangle([bx0 - 2, by0, bx1 + 2, by1], outline=(220, 38, 38), width=2)
            d.rectangle([CELL_W - 190, 0, CELL_W, CELL_H], fill=(245, 245, 245))
            d.text((CELL_W - 180, 12), f"{slug}", fill=(0, 0, 0))
            d.text((CELL_W - 180, 34), f"#{n} y={l['y']} x={l['x']}", fill=(0, 0, 0))
            held = f" au lieu de {l['held']}" if l.get("held") else ""
            d.text((CELL_W - 180, 56), f"ouvert : {l['c']} {l['score']:+.2f}{held}",
                   fill=(185, 28, 28))
            cells.append(cell)

    PER_PAGE = 20
    for p in range(0, len(cells), PER_PAGE):
        batch = cells[p : p + PER_PAGE]
        page = Image.new("RGB", (CELL_W, CELL_H * len(batch)), "white")
        for i, c in enumerate(batch):
            page.paste(c, (0, i * CELL_H))
        page.save(os.path.join(OUT, f"_chords-{p // PER_PAGE + 1}.png"))

    total = sum(len(r) for r in proposals.values())
    print(f"✓ {total} amas → debug/_chords-N.png + _chords-proposals.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
