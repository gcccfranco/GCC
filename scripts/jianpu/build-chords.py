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
    MIN_SCORE, best_match, build_templates, face_bank, foreign_rows, jury_faces,
    keep, read, signature, song_face, song_semitones, vocabulary,
)
from overlay import FLAT, FLAT_KEYS, SHARP, note_index, transpose_label  # noqa: E402
from segment import INK_THRESHOLD  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(HERE, "..", "..", "public", "jianpu")
SONGS = os.path.join(HERE, "..", "..", "content", "songs")
GOLD = os.path.join(HERE, "gold")
INVENTAIRE = os.path.join(HERE, "inventaire.json")

# Sous cette part d'amas lus, le calque n'apporte rien : la page resterait
# presque entièrement dans sa tonalité d'origine, et le marquage ferait plus
# de bruit que de service.
MIN_COVERAGE = 0.60

#: Les clés d'une étiquette publiée. `fh` n'est présent que sur celles qui
#: portent leur propre corps, `sp` est mesuré à la fin de `build`, `alt` et
#: `opt` sur celles d'une rangée gravée dans une autre tonalité.
#:
#: **Une seule définition, et `freeze.py` la lit ici.** Elle était recopiée à
#: quatre endroits — trois dans ce fichier, un dans `freeze.py` — et
#: l'itération 54 a ajouté `alt`/`opt` à deux d'entre eux : la page gelait
#: en perdant sa seconde tonalité, en silence. C'est mot pour mot la leçon
#: de l'itération 52 sur la géométrie des gabarits.
LABEL_KEYS = ("x", "y", "w", "h", "c", "fh", "alt", "opt")

# Calque **provisoire** : on construit les étiquettes sans les deux refus qui
# empêchent de publier — le plancher de couverture et la garde de mode D.
#
# Ces deux refus sont justes pour *publier* et désastreux pour *travailler* :
# une page sous le plancher n'entre pas dans `chords.json`, et `propose-extra`,
# la planche d'audit et `dissent` lisent tous `chords.json`. Les 36 pages qui
# en ont le plus besoin n'avaient donc **aucun outil** — c'est encore une fois
# une mesure qui ne voit pas le travail qui reste (itérations 33, 37, 48).
PROVISOIRE = False


def cho_key(slug: str) -> str | None:
    text = open(os.path.join(SONGS, f"{slug}.cho"), encoding="utf8").read()
    m = re.search(r"\{key:\s*([^}]+)\}", text)
    return m.group(1).strip() if m else None


def stray_chords(slug: str, path: str, labels: list[dict]) -> list[dict]:
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

    Le repêchage automatique de ce que cette fonction trouve a été essayé à
    l'itération 10 et **rejeté** : le contrôle visuel a montré des chiffres
    de mélodie lus « G » à +0,49, un libellé « 1=D » lu « D » à +0,70, un
    « Bm » unanime à +0,73 posé sur un G/B. Ce qu'elle trouve passe par
    `propose-extra.py`, une lecture à l'œil, puis `extra_labels` dans
    `gold/` — jamais directement au calque.
    """
    covered = {(l["y"], l["x"]) for l in labels}
    ink = np.asarray(Image.open(path).convert("L")) < INK_THRESHOLD
    _ink, _w, feats, kinds = classify(path)
    page_h = max(f["bottom"] for f in feats) if feats else 0
    floor = load_params()["min_top_frac"] * page_h
    # Les gabarits suivent la fonte et la tonalité de **cette page** :
    # les mesurer sous la fonte d'une autre gravure ne mesure rien.
    face, semitones = song_face(slug), song_semitones(slug)
    templates = face_bank(vocabulary(slug), semitones, face)
    jury = [build_templates(vocabulary(slug), semitones, p, i)
            for p, i in jury_faces(face) if os.path.exists(p)]

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
                out.append(_box(f, x0, x1, chord))
    return out


def alt_key(printed_key: str, alt: int) -> str:
    """Tonalité d'**orthographe** d'une rangée gravée `alt` demi-tons plus
    haut que la page. Le décalage appliqué reste celui de la page : les deux
    jeux d'accords montent ensemble, et seule leur écriture diffère."""
    i = note_index(printed_key)
    if i < 0 or not alt:
        return printed_key
    j = (i + alt) % 12
    return FLAT[j] if FLAT[j] in FLAT_KEYS else SHARP[j]


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
            continue
        for ((x0, x1), _c, _s, _u), chord in zip(row, chords):
            if chord:
                labels.append(_box(f, x0, x1, chord))
    return labels, (f"{len(labels)} étiquettes (vérité terrain)" if labels else "aucune rangée alignée")


def _from_reading(slug: str, gold: dict):
    """Publie la lecture automatique, complétée des corrections, et
    seulement si elle est complète.

    Transcrire une partition entière à la main coûte cher ; relire les trois
    amas que le matcher rate coûte trois coups d'œil. `gold/<slug>.json`
    porte donc un dictionnaire `corrections`, indexé par la position exacte
    de l'amas (`"y,x"`), et **c'est lui qui tranche** : il est lu avant
    `keep()`, pas après.

    Il était lu après, et ne pouvait donc que combler les trous — jamais
    contredire une lecture retenue. C'était un raisonnement de provenance :
    ne pas mélanger ce qui a été vu avec ce qui a été deviné. Mais il
    laissait le seul mode d'erreur qui écrit un **faux accord** sur la page
    — le mode C, retenu et faux — sans aucun recours : sur 十字架的传达者,
    cinq `Gmaj7` et `Dmaj7` publiaient `F#m7` à +0,42 et unanimes, et écrire
    la correction n'y changeait rien (itération 46). Le seul contournement
    était `not_labels` + `extra_labels`, qui fait la même chose en trois
    champs et perd le lien avec la position lue.

    Une correction est le verdict de l'œil au zoom ; une lecture retenue est
    un score de gabarit. Quand les deux se contredisent, c'est l'œil qui a
    raison. Le renversement ne change rien au corpus du jour — aucune
    correction n'y contredisait de lecture retenue, personne n'en ayant
    jamais écrit d'inerte.

    `not_labels` en est le pendant, et il manquait : un amas qui **n'est pas
    une étiquette** et que le matcher retient quand même. Le seuil n'y peut
    rien — un arc de liaison sort `E7` à +0,41 et le mot « Fill » d'un titre
    anglais sort `Em` à +0,54, tous deux au-dessus de la barre. La voie de
    transcription complète marquait déjà ces amas d'un `null` dans
    `chord_rows` ; la voie de lecture n'avait pas son équivalent, si bien que
    la seule façon de retirer un parasite vu à l'œil était de dépublier la
    page. Les amas ainsi marqués ne comptent pas non plus comme manquants :
    ils ne sont pas des étiquettes, donc ils n'ont pas à peser sur la
    couverture.
    """
    fixes = gold.get("corrections", {})
    blanks = set(gold.get("not_labels", []))
    # `not_rows` est le même geste à l'échelle de la rangée : le classifieur
    # promeut parfois une rangée de **paroles** entière (celle du système
    # précédent, quand un système n'a pas d'accords — voir itération 23).
    # Elle ne publie rien, mais ses dix hanzi gonflent le dénominateur et
    # maintiennent la page sous le plancher : 大声敬拜 restait à 57 % pour
    # cette seule raison. La séparer par la géométrie a été mesuré et
    # rejeté — abaisser `lyric_min_clusters` à 10 coûte 43 étiquettes
    # publiées, dont 8 sur un chant certifié. C'est donc l'œil qui tranche,
    # une rangée à la fois, et l'on note ce qu'il a vu.
    dead_rows = {int(y) for y in gold.get("not_rows", [])}
    # `mask_rows` — une rangée gravée dans une autre tonalité — ne pèse pas
    # sur la couverture : « on n'a pas prétendu les lire ». C'était vrai
    # tant qu'elles étaient toutes typées `chords?`, donc absentes de
    # `read()`. 在这里 en a une typée `chords` : ses trois amas gonflaient le
    # dénominateur, et le matcher y publiait deux faux accords (C pour G,
    # F/A pour Em) que le masque effaçait ensuite sans que rien ne le dise.
    dead_rows |= {int(y) for y in gold.get("mask_rows", [])}
    rows = read(slug)
    total = sum(len(r) for _f, r in rows)
    if not total:
        return [], "aucune rangée d'accords"

    # Une rangée gravée dans une autre tonalité que la page — modulation ou
    # second jeu d'accords empilé — n'est pas seulement illisible : le
    # matcher, contraint au vocabulaire de la page, y **retient de faux
    # accords**. 有你同行 publiait `F#m A D` là où la page imprime `C#m A E`,
    # unanimes et au-dessus du seuil. On ne publie donc rien de ces
    # rangées-là ; elles comptent comme manquantes, ce qui fait tomber la
    # page en partiel, ou hors publication si elle en est pleine.
    foreign = foreign_rows(slug)
    # Une rangée étrangère **déjà lue à l'œil** (`alt_labels`) n'est plus
    # manquante : elle est publiée, simplement pas par le matcher. La
    # compter manquante était la garde qui tenait 有你同行 hors du calque à
    # 47 % alors que la page se lit à 65 % — et cette garde-là n'avait plus
    # d'objet une fois la rangée transcrite.
    lues = [(int(l["y"]), int(l["y"]) + int(l["h"]) - 1)
            for l in gold.get("alt_labels", [])]

    labels = []
    missing = 0
    for f, row in rows:
        if f["top"] in dead_rows:
            total -= len(row)
            continue
        if f["top"] in foreign:
            if any(a <= f["bottom"] and f["top"] <= b for a, b in lues):
                total -= len(row)
            else:
                missing += len(row)
            continue
        for (x0, x1), chord, score, unanimous in row:
            key = f"{f['top']},{x0}"
            if key in blanks:
                total -= 1
            elif key in fixes:
                labels.append(_box(f, x0, x1, fixes[key]))
            elif keep(score, unanimous):
                labels.append(_box(f, x0, x1, chord))
            else:
                missing += 1
    fixed = len(fixes)
    note = f"{len(labels)}/{total} étiquettes (lecture" + (f", {fixed} corrigée(s))" if fixed else ")")
    if blanks:
        note += f" · {len(blanks)} amas écarté(s) à l'œil"
    if dead_rows:
        note += f" · {len(dead_rows)} rangée(s) sans accord écartée(s)"
    if foreign:
        note += f" · {len(foreign)} rangée(s) en autre tonalité écartée(s)"
    if not PROVISOIRE and len(labels) < MIN_COVERAGE * total:
        return [], f"trop peu lu : {note}"
    return labels, note


def ink_band(page: np.ndarray, l: dict) -> tuple[int, int, int]:
    """Bande de lignes où l'encre de cette étiquette-là est dense, et sa
    hauteur. Sert deux fois : à mesurer le corps de la page, et à savoir sur
    quelles lignes chercher le voisin de droite."""
    y0, y1 = max(0, l["y"] - 10), min(page.shape[0], l["y"] + l["h"] + 10)
    x0, x1 = max(0, l["x"] - 2), min(page.shape[1], l["x"] + l["w"] + 2)
    prof = (page[y0:y1, x0:x1] < INK_THRESHOLD).sum(axis=1)
    if not prof.size or prof.max() == 0:
        return y0, y1, 0
    dense = prof >= 0.15 * prof.max()
    best = run = fin = 0
    for i, d in enumerate(dense):
        run = run + 1 if d else 0
        if run > best:
            best, fin = run, i
    return y0 + fin - best + 1, y0 + fin + 1, best


def right_space(page: np.ndarray, labels: list[dict], label_h: int) -> None:
    """Pose `sp` : la largeur que l'étiquette peut occuper avant de heurter
    l'encre gravée à sa droite, en pixels image, depuis le bord gauche du
    fond (`x - 3`).

    Un nom transposé est souvent plus long que le gravé — `F/A` devient
    `Gb/Bb` — et le fond opaque, ancré à gauche, s'élargit alors sur ce qui
    est imprimé à côté. Ce qu'il efface n'est pas toujours un accord : sur
    让爱走动 ce sont les **barres verticales** de la ligne d'intro
    « G | Fadd2 | C/E | Cm/Eb », que le rendu donnait `Ab| Gbadd2Db/FDbm/E`
    (itération 38). Regarder les seules étiquettes voisines ne les verrait
    pas ; on regarde donc l'encre.

    La recherche couvre exactement la bande que le fond opaque efface —
    `y - 6` à `y + h + descendante`, comme le client la pose. La restreindre
    aux lignes d'encre denses laissait passer ce qui est gravé un peu plus
    haut ou plus bas dans la même bande : une liaison, un point d'octave.
    """
    H, W = page.shape
    desc = int(round(0.22 * (label_h / 0.714)))
    for l in labels:
        fond = int(round(0.22 * ((l.get("fh") or label_h) / 0.714))) if l.get("fh") else desc
        y0, y1 = max(0, l["y"] - 6), min(H, l["y"] + l["h"] + fond)
        if y1 <= y0:
            y0, y1 = max(0, l["y"]), min(H, l["y"] + max(1, l["h"]))
        # +2 px : l'anticrénelage du glyphe déborde de la boîte détectée.
        start = min(W, l["x"] + l["w"] + 2)
        cols = (page[y0:y1, start:] < INK_THRESHOLD).any(axis=0)
        prochain = W if not cols.any() else start + int(cols.argmax())
        l["sp"] = max(l["w"] + 7, prochain - 2 - (l["x"] - 3))


# Le client peint le fond opaque à partir de `y - 6` : six pixels de marge
# pour le crénage et l'anticrénelage du gravé. Au-delà, ce qui dépasse reste
# visible.
MARGE_HAUTE = 6
# Une hampe d'altération est **fine** : deux ou trois colonnes sur une
# étiquette qui en fait trente. Un filigrane, un arc de liaison ou la rangée
# du dessus barbouillent large. Sur les 75 dépassements du corpus, les deux
# familles ne se touchent pas — 0,09 de largeur relative au pire pour les
# hampes, 0,27 au mieux pour le reste.
HAMPE_LARGEUR = 0.20


def haut_grave(page: np.ndarray, labels: list[dict], label_h: int) -> None:
    """Remonte le haut de la boîte jusqu'à l'**altération en exposant**.

    Certaines gravures écrivent le bémol au-dessus et à droite de la lettre,
    en petit : « B♭ », « B♭/C ». La hampe de ce bémol monte bien plus haut
    que la capitale, donc plus haut que la bande de rangée d'où sort la
    boîte. Le nom réécrit couvre les lettres et **laisse la hampe** : sur
    圣灵的江河, certifiée, un trait vertical de treize pixels survivait
    au-dessus de chaque « B/Db », et se lisait comme le bémol qu'il est —
    la page affichait donc `B♭/Db` là où le calque écrit `B/Db`
    (itération 44).

    Aucun contrôle ne le voyait : le balayage ne mesure l'encre couverte
    qu'à **droite** du gravé, la planche d'audit encadre l'étiquette sans
    rien dire de ce qui dépasse par le haut, et les compteurs ne comptent
    que des accords. C'est le contrôle « la boîte fait-elle la hauteur du
    gravé ? » laissé ouvert à l'itération 42.

    On ne remonte que sur une **hampe** — une trace fine et contiguë à
    l'encre de l'étiquette — et jamais plus haut qu'un corps de page : sinon
    on avalerait le filigrane de 到各山岭去传扬 ou l'arc de liaison de la
    rangée voisine. Le bas ne bouge pas : le texte est aligné dessus.
    """
    H, W = page.shape
    for l in labels:
        if not (l.get("c") or "").strip():
            continue                      # un masque n'a rien à recouvrir
        x0, x1 = max(0, l["x"]), min(W, l["x"] + l["w"])
        y0 = l["y"]
        haut = max(0, y0 - label_h)
        bande = (page[haut:y0, x0:x1] < INK_THRESHOLD)
        if not bande.size:
            continue
        # La trace doit tenir à l'encre de l'étiquette : sans cette amorce,
        # n'importe quel trait fin passant au-dessus — un arc de liaison qui
        # frôle la bande — remonterait la boîte sur toute sa longueur.
        if not (page[y0 : y0 + 3, x0:x1] < INK_THRESHOLD).any():
            continue
        j = y0 - haut
        while j > 0 and bande[j - 1].any():
            j -= 1
        depasse = (y0 - haut) - j
        if depasse <= MARGE_HAUTE:
            continue
        if bande[j:].sum(axis=1).max() > max(4, HAMPE_LARGEUR * l["w"]):
            continue                      # large : filigrane, arc, voisine
        monte = depasse - 4               # deux pixels de marge sous les six
        l["y"] -= monte
        l["h"] += monte


def text_height(page: np.ndarray, labels: list[dict]) -> int:
    """Hauteur du texte gravé, **mesurée sur les pixels** de la page.

    Une seule taille de texte pour tout le chant : la prendre par rangée
    donnait des accords de tailles différentes sur la même page.

    Ce qu'on ne peut pas prendre, c'est la hauteur des boîtes `h`. Elle vaut
    tantôt la grappe d'encre, tantôt la bande de rangée entière, et dans les
    deux cas elle absorbe ce qui touche l'accord — une liaison, un point
    d'octave. Sur 让爱走动 le *même* accord « G » est relevé entre 23 et
    39 px ; sur 主我献上生命给你 toutes les boîtes valent 31 alors que le
    texte en fait 24. La médiane de ces hauteurs écrivait donc la page
    jusqu'à 1,4× trop grand, et c'est ce qui faisait déborder les étiquettes
    sur leurs voisines (itération 38).

    On mesure à la place, dans chaque boîte, la plus longue bande de lignes
    dont l'encre atteint 15 % de la ligne la plus noire : les lettres
    passent, une liaison — fine et peu dense — non. Le 3ᵉ quartile de ces
    mesures est la hauteur de capitale de la page. Le résultat est stable :
    entre 8 % et 25 % de seuil, et entre la médiane et le 9ᵉ décile, il ne
    bouge pas d'un pixel sur les pages de contrôle.
    """
    caps = [ink_band(page, l)[2] for l in labels if l["c"].strip()]
    caps = [c for c in caps if c]
    heights = sorted(l["h"] for l in labels if l["c"])
    boite = heights[len(heights) // 2]
    if not caps:
        return boite
    caps.sort()
    mesure = int(round(caps[min(len(caps) - 1, int(0.75 * (len(caps) - 1) + 0.5))]))
    # La mesure ne peut pas dépasser la boîte : au-delà, elle a débordé sur
    # la rangée voisine. C'est le cas des gravures d'hymnaire, dont les
    # étiquettes sont si petites (14 px) que le découpage en rangées les
    # tronque — la bande dense trouvée là est celle des chiffres en dessous.
    return min(mesure, boite)


def un_seul_releve(labels: list[dict]) -> list[dict]:
    """Un amas d'encre, une étiquette : deux boîtes qui se recouvrent sont
    **deux relevés du même gravé**, pas deux accords.

    L'invariant vient de la page, pas d'un seuil : une gravure sépare ses
    étiquettes, et les boîtes sortent des amas de colonnes, donc deux
    étiquettes gravées ne se chevauchent jamais. Mesuré sur le corpus, le
    compte des paires qui se recouvrent est le même — 14 — que l'on demande
    un pixel commun ou cinq : il n'y a pas de cas limite à arbitrer.

    Le filtre ne portait que sur la boîte **exacte** (itération 38), et il
    laissait donc passer les deux formes que prend le double relevé :

    - la **même rangée relue** à quelques pixels près, sur 4 pages — le
      second se dessine sur le premier, donc l'œil ne voit rien, mais les
      deux fonds opaques faussent toute mesure de recouvrement ;
    - l'accord isolé **resté sous le composite** qui l'a remplacé
      (itération 34) : `Em7` sous `Em7 Dm G)` sur 握住幸福, `Am7` et
      `Am(maj7)` sous `Am7  Am(maj7)` sur 我安然居住. Là c'est le texte
      lui-même qui est écrit deux fois, l'un par-dessus l'autre.

    Le relevé qui couvre le plus d'encre gagne : le composite l'emporte sur
    l'accord isolé. À largeur égale, la boîte la plus **basse** — la plus
    haute a happé ce qui touchait l'étiquette, une liaison ou un point
    d'octave, et son fond opaque effacerait d'autant plus (itération 38).
    """
    perdants: set[int] = set()
    for i in range(len(labels)):
        for j in range(i + 1, len(labels)):
            a, b = labels[i], labels[j]
            if min(a["x"] + a["w"], b["x"] + b["w"]) <= max(a["x"], b["x"]):
                continue
            if min(a["y"] + a["h"], b["y"] + b["h"]) <= max(a["y"], b["y"]):
                continue
            perdants.add(j if (a["w"], -a["h"]) >= (b["w"], -b["h"]) else i)
    return [l for n, l in enumerate(labels) if n not in perdants]


def mode_d(slug: str, entry: dict) -> str:
    """Ce que les trois chasses du mode D trouvent encore sur cette page.

    Une rangée d'accords que le découpage n'isole pas ne publie rien, mais
    **ne coûte rien non plus au dénominateur** : elle n'entre dans aucun
    compteur, donc rien n'empêche la page de franchir le plancher de 60 %
    sans elle. La page paraît alors publiable et sort en deux tonalités —
    ses rangées vues transposées, la rangée manquée restée dans l'ancienne.
    C'est **pire que pas de calque du tout**, et c'est arrivé deux fois de
    suite : 十字架的传达者 à l'itération 46, 奔跑不放弃 à la 47, toutes deux
    poussées au-dessus du plancher par un progrès du matcher, toutes deux
    avec leurs rangées cachées à bord.

    Le progrès d'un outil sort des pages de sous le plancher, et le plancher
    ne sait rien de ce qu'elles cachent. Il fallait donc le lui apprendre :
    `worklist.py` le mesurait déjà, mais il n'était qu'un tableau de bord,
    lu après coup par un humain — deux fois trop tard.

    Les pages **gelées** en sont exemptes : leur calque a été relu à l'œil
    sur planche d'audit, ce qui est un contrôle plus fort que ces trois-là.
    """
    import worklist  # importé ici : il tire l'image de la page, on ne le paie
                     # que pour les pages qui iraient effectivement publier

    trouvailles = []
    for nom, chasse in (("cachée(s)", worklist.hidden_rows),
                        ("soudée(s)", worklist.welded_rows),
                        ("orpheline(s)", worklist.orphan_rows)):
        n = len(chasse(slug, entry))
        if n:
            trouvailles.append(f"{n} rangée(s) {nom}")
    return " · ".join(trouvailles)


def build(slug: str):
    path = os.path.join(IMAGES, f"{slug}-p1.webp")
    if not os.path.exists(path):
        return None, "image absente"

    gold_path = os.path.join(GOLD, f"{slug}.json")
    gold = json.load(open(gold_path, encoding="utf8")) if os.path.exists(gold_path) else {}
    # Page **retenue à l'étude** : elle passe les gardes mécaniques mais l'œil
    # a vu qu'elle ne doit pas encore paraître.
    #
    # Jusqu'ici il n'y avait pas de façon de dire cela. Les trois gardes —
    # le plancher de couverture, le mode D, la certification — décrivent ce
    # que la machine sait ; aucune ne décrit ce que l'œil a compris et que la
    # machine ne peut pas voir. 在这里 empile deux jeux d'accords par système
    # (positions de capo en ré au-dessus des accords réels en fa) et module
    # en 【升G调】 sur sa dernière rangée : le calque y lit assez pour passer
    # le plancher, et publierait une page à deux tonalités — ce que la boucle
    # tient depuis l'itération 15 pour pire que pas de calque du tout. Elle
    # n'était retenue que par accident, parce qu'une rangée cachée déclenchait
    # le mode D ; un réglage du matcher a suffi à lever l'accident
    # (itération 50).
    # `PROVISOIRE` : comme le plancher et le mode D, c'est une règle de
    # **publication**, pas de travail. Une page retenue à l'étude est
    # justement celle qu'il faut ouvrir, et `propose-extra` n'y avait aucun
    # accès — « ni calque ni lecture exploitable » (itération 54).
    if gold.get("en_chantier") and not PROVISOIRE:
        return None, f"retenue à l'étude : {gold['en_chantier']} — non publiée"

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
    # **Un calque certifié est gelé.** `verified` dit ce qu'un humain a
    # regardé sur la page transposée ; tant que les étiquettes sont
    # recalculées à chaque build, cette phrase décrit une cible mouvante —
    # n'importe quelle retouche de `match.py` change silencieusement une
    # page déjà certifiée, et personne ne le voit. `freeze.py` recopie donc
    # les étiquettes publiées dans `gold/<slug>.json` au moment de la
    # certification, et c'est cette liste-là, pure donnée, qui repart. Le
    # matcher redevient libre d'évoluer.
    if gold.get("frozen_labels"):
        # `fh` (le corps propre à une étiquette) doit survivre au gel : sans lui
        # une ligne d'intro gelée reprend le corps de la page et déborde.
        labels = [{k: l[k] for k in LABEL_KEYS if k in l} for l in gold["frozen_labels"]]
        note = f"{len(labels)} étiquettes (gelées à la certification)"
    else:
        if gold.get("chord_rows"):
            labels, note = _from_gold(slug, gold)
        else:
            labels, note = _from_reading(slug, gold)
        if not labels:
            return None, note

        # Étiquettes hors rangées, **lues à l'œil** (itération 10) :
        # proposées par `propose-extra.py`, vérifiées zoom par zoom, puis
        # recopiées dans `gold/<slug>.json` sous `extra_labels`. Le
        # repêchage sans yeux a été essayé et rejeté — voir `stray_chords`
        # et LOOP.md.
        extra = gold.get("extra_labels", [])
        if extra:
            # `fh` est facultatif : la hauteur d'étiquette **de cette
            # étiquette-là**, quand elle n'est pas celle de la page. Une
            # ligne d'intro (`【前奏 | G D/F# | … | D】`) est gravée nettement
            # plus petite que les accords des couplets ; réécrite au corps de
            # la page elle déborde sur les crédits. `labelH` reste le défaut,
            # donc les 3 500 étiquettes déjà publiées ne bougent pas.
            labels = labels + [{k: l[k] for k in LABEL_KEYS if k in l} for l in extra]
            note += f" · +{len(extra)} hors rangées (lues à l'œil)"

        reste = "" if PROVISOIRE else mode_d(slug, {"labels": labels})
        if reste:
            return None, f"{note} · {reste} — non publiée"

    # `mask_rows` — une rangée d'accords gravée dans une **autre tonalité**
    # que la page : les positions de capo que certaines gravures impriment
    # au-dessus des accords réels (主我献上生命给你 imprime E, A/E, B/E…
    # au-dessus de F, Bb/F, C/F…, sous un « 1=F »).
    #
    # `foreign_rows` ne les voit pas, et ce n'est pas un réglage à corriger :
    # le classifieur les laisse en `chords?` parce qu'elles sont suivies
    # d'une **rangée d'accords**, pas de chiffres. Elles n'entrent donc
    # jamais dans `read()`, et ce que `read()` ignore, `foreign_rows` ignore
    # aussi. Les laisser telles quelles est le pire cas possible : la page
    # transposée mêlerait deux tonalités, ce que l'itération 15 a nommé
    # mode D.
    #
    # On les **masque** — un cadre sans texte, posé comme les autres — et
    # elles ne pèsent pas sur la couverture : on n'a pas prétendu les lire.
    # C'est l'œil qui les désigne, une rangée à la fois, comme `not_rows`.
    # Une fois la page gelée, `frozen_labels` **est** le calque publié, masques
    # compris (freeze.py recopie tout `labels`). Les reposer ici les
    # dupliquerait — deux cadres identiques l'un sur l'autre, invisibles à
    # l'œil et faux dans les données.
    masked = {int(y) for y in gold.get("mask_rows", [])}
    if masked and not gold.get("frozen_labels"):
        _i, _w, feats, _k = classify(path)
        found = {f["top"]: f for f in feats if f["top"] in masked}
        for top in sorted(masked - set(found)):
            print(f"    ! {slug} : mask_rows y={top} ne correspond à aucune rangée", file=sys.stderr)
        # Une rangée masquée ne publie rien, y compris ce qu'une itération
        # précédente y avait posé à la main : sans ce filtre le masque
        # s'**empile** sur l'étiquette au lieu de l'annuler, et la rangée se
        # retrouve transposée à moitié — le mode D, à l'intérieur d'une seule
        # rangée. Quatre `extra_labels` étaient dans ce cas (itération 31).
        spans = [(f["top"], f["top"] + f["height"]) for f in found.values()]
        labels = [l for l in labels
                  if not any(a <= l["y"] <= b for a, b in spans)]
        # Une rangée que `alt_labels` couvre n'a pas besoin de masque : ses
        # propres étiquettes recouvrent la même encre, et poser les deux
        # empilerait un pavé blanc muet sur un accord lisible.
        # Par **recouvrement vertical**, jamais par égalité de haut : le
        # découpage coupe parfois une rangée au milieu de ses lettres — la
        # bande y=1441 de 在这里 ne fait que 11 px pour un « G » qui en fait
        # 22 —, et la boîte de l'étiquette part alors du haut de l'encre,
        # au-dessus du haut de la bande.
        spans_alt = [(int(l["y"]), int(l["y"]) + int(l["h"]) - 1)
                     for l in gold.get("alt_labels", [])]
        muettes = [f for f in found.values()
                   if not any(a <= f["top"] + f["height"] and f["top"] <= b
                              for a, b in spans_alt)]
        for f in muettes:
            labels += [_box(f, x0, x1, "") for x0, x1 in f["clusters"]]
        note += f" · {len(found)} rangée(s) en autre tonalité"
        if muettes:
            note += f", dont {len(muettes)} masquée(s)"

    # **Les rangées en autre tonalité, lues.** Un masque dit « il y a ici des
    # accords que je ne publie pas » ; il jette ce que la gravure porte.
    # `alt_labels` le garde : même géométrie qu'un masque, mais avec l'accord
    # et le nombre de demi-tons qui séparent sa tonalité de celle de la page.
    #
    # `opt` distingue les deux familles, et c'est le client qui en tire le
    # sélecteur de tonalité. Une rangée **empilée** — les positions de capo
    # qu'une gravure imprime au-dessus des accords réels — est une lecture
    # *alternative* de la même musique : la montrer sans le dire ferait une
    # page à deux tonalités, elle est donc masquée par défaut. Une
    # **modulation** est une suite, pas une alternative : elle s'affiche
    # toujours, dans sa propre orthographe.
    alt = gold.get("alt_labels", [])
    if alt and not gold.get("frozen_labels"):
        labels = labels + [{k: l[k] for k in LABEL_KEYS if k in l} for l in alt]
        note += f" · +{len(alt)} en autre tonalité (lues à l'œil)"

    # **Complet** veut dire : un humain a regardé la page transposée dans le
    # navigateur et n'y a vu aucun accord resté dans l'ancienne tonalité.
    # Rien d'automatique ne peut le remplacer — `stray_chords` hérite de la
    # faiblesse du matcher et ne signale pas un accord qu'il ne sait pas
    # lire. Les trois calques publiés par la seule machine se sont tous
    # révélés faux (LOOP.md, itérations 8 et 9).
    #
    # Un calque **incomplet** est publié quand même, mais marqué : le client
    # prévient alors que certains accords ne suivent pas la transposition et
    # met en évidence ceux qu'il a réécrits. Montrer où l'on est sûr vaut
    # mieux que ne rien montrer — et bien mieux que laisser croire que tout
    # est converti.
    complete = bool(gold.get("verified")) and gold.get("key_label") is not None

    # **La vérité terrain nomme les accords comme le `.cho`, le calque comme
    # la page.** Le matcher choisit dans le vocabulaire du `.cho` et rend
    # donc un nom du `.cho` ; `printedKey`, lui, est la tonalité **gravée**,
    # et c'est d'elle que le client part pour transposer. Sur les 2 pages
    # dont le 简谱 n'est pas dans la tonalité de son `.cho`, les deux
    # conventions se croisaient : 好喜欢与你在一起 publiait `F/Eb` là où la page
    # imprime `G/F`, et son calque entier sortait **deux demi-tons trop
    # bas** — 36 accords faux, que rien ne signalait puisque chaque
    # étiquette était, dans sa propre convention, juste.
    #
    # La conversion se fait ici, à la frontière : une seule convention dans
    # `gold/` (celle du `.cho`, la même que `extra_chords`), une seule dans
    # `chords.json` (celle de la page). Les étiquettes **gelées** en sont
    # exemptes : `freeze.py` recopie ce que le calque publiait, donc elles
    # sont déjà dans la tonalité gravée.
    shift = song_semitones(slug)
    if shift and not gold.get("frozen_labels"):
        labels = [
            {**l, "c": transpose_label(l["c"], shift, alt_key(printed_key, l.get("alt", 0)))
                  if l["c"] else l["c"]}
            for l in labels
        ]

    labels = un_seul_releve(labels)

    with Image.open(path) as im:
        w, h = im.size
        page = np.asarray(im.convert("L"))
    label_h = text_height(page, labels)
    right_space(page, labels, label_h)
    # En dernier : `text_height` plafonne sa mesure sur `h` et `right_space`
    # cherche le voisin dans la bande `y`…`y+h`. Remonter le haut avant l'un
    # ou l'autre changerait ce qu'ils mesurent.
    haut_grave(page, labels, label_h)

    entry = {
        "printedKey": printed_key,
        "w": w,
        "h": h,
        "labelH": label_h,
        "labels": labels,
    }
    if not complete:
        entry["complete"] = False
    if gold.get("key_label"):
        # `c`, le **texte gravé** du libellé de tonalité, quand il ne s'écrit
        # pas « 1=X » : la lettre seule (« D 4/4 »), l'ordre inverse
        # (« F=1 », hymnaire), ou un « 1=F » posé au-dessus d'accords en D
        # (positions de capo). Sans lui le client écrit « 1=<tonalité jouée> »,
        # ce qui est faux dès que la lettre gravée n'est pas celle des accords.
        # Comme les étiquettes, il est écrit dans la convention du `.cho` et
        # passe ici dans celle de la page.
        kl = dict(gold["key_label"])
        if shift and kl.get("c"):
            kl["c"] = transpose_label(kl["c"], shift, printed_key)
        # `sp` comme pour les étiquettes : le cadre est rendu au corps du
        # gravé depuis l'itération 41, et « 1=Ab » y est plus large que
        # « 1=F » — sans cette mesure il efface le chiffrage « 4/4 » qui le
        # suit (3 pages sur 87 au balayage).
        mesure = {**kl, "fh": kl["h"]}
        right_space(page, [mesure], label_h)
        kl["sp"] = mesure["sp"]
        entry["keyLabel"] = kl
    # Certaines gravures répètent la tonalité **dans le titre** :
    # « 永活盼望（李伟版）（D调） ». Cette mention-là décrit *cette page*, donc
    # elle suit la transposition, exactement comme « 1=X ». À ne pas
    # confondre avec « 原调Eb » (la tonalité de la *source*), qui décrit
    # l'œuvre et doit rester telle quelle — les deux cohabitent sur
    # 永活盼望, et c'est ce qui rendait la question épineuse.
    if gold.get("title_key"):
        entry["titleKey"] = gold["title_key"]
    return entry, f"{note} · 1={printed_key}" + ("" if complete else "  [PARTIEL]")


def main() -> int:
    inventaire = json.load(open(INVENTAIRE, encoding="utf8"))
    out = {}
    for item in inventaire:
        slug = item["slug"]
        entry, note = build(slug)
        if entry:
            out[slug] = entry
            print(f"  {slug:16} {note}")
        elif note.endswith("non publiée"):
            # Une page **retenue** se dit, sinon la garde du mode D ne fait
            # que déplacer le silence : la page disparaîtrait du calque sans
            # que rien n'apprenne pourquoi.
            print(f"  {slug:16} ⚠ {note}")

    dest = os.path.join(IMAGES, "chords.json")
    with open(dest, "w", encoding="utf8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=0, sort_keys=True)
    print(f"✓ {len(out)}/{len(inventaire)} chant(s) avec calque → public/jianpu/chords.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
