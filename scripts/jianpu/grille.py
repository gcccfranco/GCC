#!/usr/bin/env python3
"""Confronte le calque publié à la **grille d'accords du `.cho`**.

Le mode C — une étiquette retenue et mal lue — est le seul défaut qui écrit
un faux accord sur la partition, et le seul qu'aucun compteur ne voit : le
matcher choisit dans le vocabulaire de la page, donc son verdict est un nom
plausible, au-dessus du seuil, unanime. `evaluate.py` le mesure contre
`gold/`, mais `gold/` est écrit *après* la lecture et par la même main ; la
planche d'audit le montre, mais il faut l'y voir, et sur 你的同在 l'œil en a
laissé passer deux sur trois (itération 56).

Le `.cho`, lui, est une source **indépendante** : il a été saisi à la main
depuis la même partition, avant et sans la boucle. Quand ses accords et ceux
de la page s'alignent, un désaccord isolé au milieu d'un long accord est un
mode C — et c'est ainsi que 你的同在 a rendu ses trois : deux « B7 » sur des
« E7 » gravés et un « A11 » sur un « A7 ».

**Ce que l'outil ne peut pas décider.** Une page et son `.cho` ne sont pas la
même chose : le `.cho` porte l'arrangement joué, la page une gravure qui peut
répéter, omettre ou nommer autrement (『B♭/C』 là où le `.cho` écrit `Bb`,
`[ ]` posé comme espaceur). Comparer les deux suites entières ne dit donc
rien — un accord de plus au début décale tout et produit trente écarts qui
n'en sont pas.

On aligne alors les deux suites (`difflib`) et l'on ne retient qu'une forme :
la **substitution isolée** — un accord contre un accord — encadrée des deux
côtés par au moins `ANCRE` accords identiques. Sur les 102 calques, cinq
sortent, et les cinq sont des `.cho` moins précis que la gravure. C'est un
signalement, jamais un verdict : chacun se regarde sur le scan.

Usage (depuis GCCLouange/) :
    python3 scripts/jianpu/grille.py            # tout le corpus publié
    python3 scripts/jianpu/grille.py <slug>…
    python3 scripts/jianpu/grille.py --ancre 2  # plus large, plus bruyant
"""

from __future__ import annotations

import difflib
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from match import song_semitones  # noqa: E402
from overlay import transpose_label  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "..")
SONGS = os.path.join(ROOT, "content", "songs")
IMAGES = os.path.join(ROOT, "public", "jianpu")

#: Nombre d'accords identiques exigés de chaque côté d'une substitution.
#: À 3, cinq signalements sur tout le corpus ; à 2, le bruit des arrangements
#: qui divergent d'une mesure reprend le dessus.
ANCRE = 3


def cho_chords(slug: str) -> list[str]:
    """Les accords du `.cho`, dans l'ordre du fichier.

    Les directives sont ignorées, et les crochets vides avec : certaines
    grilles posent `[ ]` comme espaceur de syllabe (给梦想一双翅膀 en a
    quatre), ce qui n'est pas un accord.
    """
    out: list[str] = []
    with open(os.path.join(SONGS, f"{slug}.cho"), encoding="utf8") as fh:
        for line in fh:
            s = line.strip()
            if not s or s.startswith("{"):
                continue
            out += [c for c in re.findall(r"\[([^\]]+)\]", s) if c.strip()]
    return out


def published(entry: dict) -> list[str]:
    """Les accords que le calque écrit, dans l'ordre de lecture.

    Les masques (boîte sans accord) et les lectures alternatives (`opt` — un
    second jeu d'accords empilé, que le sélecteur montre ou cache) ne font
    pas partie de la grille : les compter décalerait l'alignement.
    """
    return [l["c"] for l in entry["labels"]
            if (l.get("c") or "").strip() and not l.get("opt")]


def ecarts(slug: str, entry: dict, ancre: int) -> list[str]:
    if not os.path.exists(os.path.join(SONGS, f"{slug}.cho")):
        return []
    pub = published(entry)
    # Le calque nomme les accords dans la tonalité **gravée**, le `.cho` dans
    # la sienne : sur les 32 pages dont le 简谱 n'est pas dans la tonalité du
    # `.cho`, comparer sans transposer ne compare rien.
    ecart_ton = song_semitones(slug)
    att = [transpose_label(c, ecart_ton, entry["printedKey"]) if ecart_ton else c
           for c in cho_chords(slug)]
    if not pub or not att:
        return []
    ops = difflib.SequenceMatcher(None, pub, att, autojunk=False).get_opcodes()
    out = []
    for k, (tag, i1, i2, j1, j2) in enumerate(ops):
        if tag != "replace" or i2 - i1 != 1 or j2 - j1 != 1:
            continue
        avant = ops[k - 1] if k else None
        apres = ops[k + 1] if k + 1 < len(ops) else None
        if not avant or avant[0] != "equal" or avant[2] - avant[1] < ancre:
            continue
        if not apres or apres[0] != "equal" or apres[2] - apres[1] < ancre:
            continue
        gauche = " ".join(pub[max(0, i1 - 2):i1])
        droite = " ".join(pub[i2:i2 + 2])
        out.append(f"…{gauche} [{pub[i1]}] {droite}…   le .cho écrit « {att[j1]} »")
    return out


def main() -> int:
    ancre = ANCRE
    if "--ancre" in sys.argv:
        ancre = int(sys.argv[sys.argv.index("--ancre") + 1])
    voulus = {a for a in sys.argv[1:] if not a.startswith("--") and not a.isdigit()}
    chords = json.load(open(os.path.join(IMAGES, "chords.json"), encoding="utf8"))

    total = 0
    for slug, entry in sorted(chords.items()):
        if voulus and slug not in voulus:
            continue
        for ligne in ecarts(slug, entry, ancre):
            print(f"  {slug:22} {ligne}")
            total += 1
    print(f"\n{total} substitution(s) isolée(s) — à regarder sur le scan, "
          f"une par une (ancrage {ancre})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
