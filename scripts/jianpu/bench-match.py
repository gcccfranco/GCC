#!/usr/bin/env python3
"""Banc du matcher, mesuré sur la vérité terrain que la boucle a déjà écrite.

Deux jeux étiquetés dormaient dans `gold/`, écrits pour tout autre chose :

- **`corrections`** — 236 amas sur 29 chants, relus un par un au zoom. Ils
  ont été écrits pour *contourner* le matcher, donc ils sont difficiles par
  construction : chacun est un cas où il avait échoué.
- **`frozen_labels`** — 3002 étiquettes sur les 76 pages certifiées, chacune
  vue sur une planche d'audit navigateur. C'est le corpus entier, cas
  faciles compris, et il dit ce que la page grave **à la position exacte**
  où le découpage voit un amas.

Ni l'un ni l'autre ne servait à mesurer la lecture. Or c'est le seul moyen
de faire d'un réglage du matcher autre chose qu'un pari : jusqu'ici on
changeait un gabarit et on regardait une planche, ce qui dit si *cette*
page va mieux et rien de la centaine d'autres.

Trois colonnes, parce qu'un réglage peut progresser sur l'une en régressant
sur les autres :

- **durs** — les `corrections` lues juste, seuil ou pas.
- **publiables** — les mêmes, mais qui passent aussi `keep()` : la
  correction deviendrait inutile.
- **gelés** — les `frozen_labels` retrouvés à l'identique. Ce que le
  matcher lirait tout seul de ce que l'œil a déjà validé.

La comparaison à la référence (`--geler`) ajoute la seule chose que les
compteurs ne voient pas : **quels** amas ont bougé. Sur les 76 pages
certifiées le calque ne bouge pas — `frozen_labels` *est* ce qui est
publié — donc la dérive ne peut toucher que les pages non certifiées, où
l'œil repasse de toute façon avant la certification.

    python3 scripts/jianpu/bench-match.py           # mesure
    python3 scripts/jianpu/bench-match.py --tous    # + les amas qui ont bougé
    python3 scripts/jianpu/bench-match.py --geler   # fige la référence
"""
from __future__ import annotations

import glob
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from match import CHORD_RE, keep, note_index, read, song_semitones  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
GOLD = os.path.join(HERE, "gold")
REF = os.path.join(HERE, "debug", "bench-match.json")


def pitch(label: str, shift: int = 0):
    """L'accord réduit à ses hauteurs, ou `None` s'il n'en est pas un.

    Deux raisons de ne pas comparer les chaînes.

    **L'enharmonie** : le vocabulaire d'un `.cho` écrit `Eb`, un décalage
    calculé sort `D#`, et c'est le même accord. Comparer les noms ferait de
    chaque page à bémols un échec.

    **Les étiquettes composites** : depuis l'itération 34 une étiquette peut
    porter une ligne entière — « Gsus4 G D/F# Em7 », « 先F后F#dim ». Aucune
    lecture d'un amas unique ne peut l'égaler, et les compter comme des
    fautes du matcher lui reproche un travail qui n'est pas le sien. Elles
    ne s'analysent pas, donc elles sortent du dénominateur.
    """
    m = CHORD_RE.match((label or "").strip())
    if not m:
        return None
    root, suffix, bass = m.groups()
    try:
        i = (note_index(root) + shift) % 12
        j = (note_index(bass) + shift) % 12 if bass else None
    except ValueError:
        return None
    return i, suffix, j


def bare(label: str) -> str:
    """L'accord, sans la typographie qui l'entoure.

    Une `correction` est recopiée **telle que gravée**, parenthèses
    comprises : sur 如果你想知道 la vérité dit « (D/F#) » là où le matcher
    retient « D/F# ». C'est le même accord, lu juste ; le compter comme un
    échec ferait crédit au matcher d'un progrès qu'il n'a pas à faire.
    """
    return (label or "").strip().lstrip("(").rstrip(")").strip()


def reading(slug: str) -> dict:
    out = {}
    for f, row in read(slug):
        for (x0, _x1), chord, score, unanimous in row:
            out[f"{f['top']},{x0}"] = [chord, round(score, 4), bool(unanimous)]
    return out


def truths(gold: dict, slug: str) -> tuple[dict, dict]:
    """Les deux jeux étiquetés, indexés comme la lecture (`"haut,x"`).

    **Les deux ne sont pas dans la même convention**, et c'est le piège de
    l'itération 34 reparu dans l'outil qui devait le mesurer (itération 47).
    `corrections` nomme les accords comme le `.cho`, comme la lecture ;
    `frozen_labels` les nomme comme la **page**, parce que `freeze.py`
    recopie ce que le calque publiait et que le calque part de `printedKey`.
    Sur les 32 pages gravées hors de la tonalité de leur `.cho`, comparer
    la lecture aux étiquettes gelées sans rien faire, c'est compter chaque
    accord juste comme une faute : 40 des 63 « lectures retenues et
    fausses » du premier relevé n'étaient que ce décalage.

    On ramène donc la vérité gelée dans la convention du `.cho`, plutôt que
    l'inverse : la lecture est ce qu'on mesure, on n'y touche pas.
    """
    hard = {}
    for k, v in (gold.get("corrections") or {}).items():
        p = pitch(bare(v))
        if p:
            hard[k] = p
    shift = song_semitones(slug)
    frozen = {}
    for l in gold.get("frozen_labels") or []:
        p = pitch(bare(l.get("c")), -shift)
        if p:
            frozen[f"{l['y']},{l['x']}"] = p
    return hard, frozen


def score(got: dict, hard: dict, frozen: dict) -> tuple[int, int, int, int, int, int]:
    lu = pub = seen = gel = gel_seen = 0
    for key, truth in hard.items():
        if key not in got:
            continue
        seen += 1
        chord, sc, unan = got[key]
        if pitch(chord) == truth:
            lu += 1
            pub += keep(sc, unan)
    for key, truth in frozen.items():
        if key not in got:
            continue
        gel_seen += 1
        gel += pitch(got[key][0]) == truth
    return lu, pub, seen, gel, gel_seen, 0


def main() -> None:
    args = set(sys.argv[1:])
    slugs = sorted(
        os.path.splitext(os.path.basename(p))[0] for p in glob.glob(os.path.join(GOLD, "*.json"))
    )
    ref = json.load(open(REF)) if os.path.exists(REF) and "--geler" not in args else {}

    snap: dict[str, dict] = {}
    now = [0] * 5
    was = [0] * 5
    drift = []
    for slug in slugs:
        gold = json.load(open(os.path.join(GOLD, f"{slug}.json")))
        hard, frozen = truths(gold, slug)
        if not (hard or frozen or args & {"--tous", "--geler"}):
            continue
        try:
            got = reading(slug)
        except Exception as exc:  # page sans image, gravure hors corpus
            print(f"  {slug:24s} — illisible ({exc})")
            continue
        snap[slug] = got
        lu, pub, seen, gel, gel_seen, _ = score(got, hard, frozen)
        for i, v in enumerate((lu, pub, seen, gel, gel_seen)):
            now[i] += v
        old = ref.get(slug)
        if old:
            for i, v in enumerate(score(old, hard, frozen)[:5]):
                was[i] += v
            for key, cell in got.items():
                b = old.get(key)
                if b and (b[0] != cell[0] or keep(b[1], b[2]) != keep(cell[1], cell[2])):
                    drift.append((slug, key, b, cell, hard.get(key) or frozen.get(key)))
        if hard or frozen:
            print(f"  {slug:24s} {lu:3d}/{seen:<3d} durs  {pub:3d} publiables  {gel:3d}/{gel_seen:<3d} gelés")

    def line(tag, c):
        return f"{tag} {c[0]}/{c[2]} durs lus · {c[1]} publiables · {c[3]}/{c[4]} gelés relus"

    print()
    if ref:
        print(line("référence :", was))
    print(line("maintenant :", now))

    if "--tous" in args and ref:
        print(f"\n{len(drift)} amas dont la lecture a bougé")
        for slug, key, b, c, truth in drift:
            if truth is None:
                continue
            verdict = "  "
            if pitch(b[0]) == truth and pitch(c[0]) != truth:
                verdict = "✗ perdu   "
            elif pitch(b[0]) != truth and pitch(c[0]) == truth:
                verdict = "✓ gagné   "
            else:
                continue
            print(f"  {verdict}{slug} {key}: {b[0]} ({b[1]:+.2f}) → {c[0]} ({c[1]:+.2f})")

    if "--geler" in args:
        os.makedirs(os.path.dirname(REF), exist_ok=True)
        json.dump(snap, open(REF, "w"), ensure_ascii=False)
        print(f"référence écrite : {REF} ({sum(len(v) for v in snap.values())} amas)")


if __name__ == "__main__":
    main()
