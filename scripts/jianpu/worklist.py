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

Trois chasses, parce qu'il y a trois façons pour une rangée de disparaître :

- **cachée** — le découpage l'a bien isolée, le classifieur l'a rangée
  ailleurs. `hidden_rows` apparie la bande entière ;
- **soudée** — le découpage ne l'a **jamais isolée** : ses étiquettes
  partagent la bande avec les chiffres ou les paroles. Aucun amas ne
  s'apparie alors, puisque chacun porte les deux. `welded_rows` y promène
  une fenêtre de la hauteur d'une rangée d'accords (itération 39) ;
- **orpheline** — pas de bande du tout : un accord seul dans son système
  (13 px sur 24, sur 和散那) ne fait pas assez d'encre pour que le découpage
  lui en fasse une, et tombe dans le vide entre deux autres. `orphan_rows`
  regarde les vides eux-mêmes (itération 44).

Une quatrième existe et **aucune de ces chasses ne la voit** : la rangée
*détectée mais muette*, typée `chords` mais dont aucun amas ne passe
`keep()` (itération 50, dernière rangée de 若有人在基督里). Elle est hors de
portée par construction — toutes les chasses ici reposent sur « la bande
s'apparie-t-elle au vocabulaire ? », et une rangée muette est précisément
celle où l'appariement échoue. Seule la planche d'audit la voit.

Trois colonnes en sortent, et seule la dernière décide :

- **couverture** — ce que le calque publie sur ce qu'il a détecté ;
- **cachées / soudées** — rangées d'accords hors des rangées détectées ;
- **verdict** — `prêt` seulement si rien n'est caché ni soudé et qu'il
  reste peu à relire. Tout le reste est du travail, pas une certification.

Usage (depuis GCCLouange/) :
    python3 scripts/jianpu/worklist.py
    python3 scripts/jianpu/worklist.py --certifiées   # le même test sur les
                                                      # pages déjà certifiées

⚠ **Fichier reconstruit à l'itération 51.** La version des itérations 39 à 48
a été détruite par un `git checkout` sur un fichier jamais commité, et aucune
copie n'a survécu (dépôt, stash, blobs pendants, iCloud, Time Machine,
historique de l'éditeur, instantanés APFS). La reconstruction s'appuie sur :

- la structure exacte du fichier perdu (noms, ordre et bornes de lignes),
  retrouvée dans le cache AST de graphify, qui ne garde pas le code ;
- la description détaillée de chaque chasse dans `LOOP.md` (itérations 39,
  42, 44, 45, 48) ;
- le texte intégral de `hidden_rows` et `_overlaps`, relu en séance.

Les seuils marqués « ⚠ remesuré » ci-dessous ont été **redérivés sur le
corpus**, pas recopiés : leur valeur d'origine est perdue. Ils sont validés
par l'invariant que les itérations 45 à 50 ont laissé — zéro rangée cachée,
soudée ou orpheline sur les 97 pages certifiées.
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
    MIN_SCORE, best_match, confirm_candidates, crop_labels, face_bank, signature,
    song_face, song_semitones, vocabulary, width_factor,
)
from segment import INK_THRESHOLD, column_clusters  # noqa: E402

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
# Le plancher était à trois amas, et il taisait la **rangée d'alternatives** :
# une gravure qui double ses accords entre parenthèses n'en pose souvent que
# deux par système, et 如果你想知道 a été certifiée — puis publiée à deux
# tonalités une journée durant — avec une telle rangée (itération 45).
#
# Descendre à deux sans rien d'autre sort huit rangées de plus sur le corpus,
# **toutes fausses, toutes à 1/2** (bruit, fragments, arcs). Exiger que les
# **deux** amas s'apparient les écarte toutes et garde la vraie : c'est la
# règle du tout ou rien, et elle vaut aussi pour `welded_rows`.
HIDDEN_MIN = 2
#: En deçà de tant d'amas, on exige l'unanimité au lieu de `HIDDEN_SHARE`.
HIDDEN_COURT = 3
# Part maximale du nombre d'amas d'une rangée de chiffres (médiane de la page).
HIDDEN_MAX_CLUSTERS = 0.55
# ⚠ remesuré (itération 51) : hauteur minimale d'une bande candidate. Sert à
# écarter les filets et les rangées de barres de croches, qui font deux ou
# trois pixels. Mesuré sur les 562 rangées d'accords **publiantes** des 97
# pages certifiées : la plus basse en fait 10, le premier centile 18. On se
# pose donc à 10, la plus basse rangée d'accords réelle du corpus.
HIDDEN_MIN_HEIGHT = 10

# `welded_rows` — la fenêtre se promène de tant de pixels. Quatre : assez fin
# pour tomber sur la rangée, assez large pour que le balayage d'une bande de
# cent pixels reste une vingtaine de positions (itération 39).
WELD_STEP = 4
#: Une bande n'est fouillée que si elle est **plus haute** qu'une rangée
#: d'accords de cette page, d'au moins ce facteur : c'est ce qui distingue
#: une bande soudée (accords + chiffres + parfois paroles) d'une rangée
#: ordinaire mal typée, dont `hidden_rows` s'occupe déjà.
WELD_MIN_RATIO = 1.5

# `orphan_rows` — un vide entre deux bandes n'est fouillé que s'il tient une
# rangée d'accords. Les amas qu'on y garde doivent avoir la taille d'une
# étiquette : les vides d'une page sont pleins de barres de mesure, de
# crédits et de filigrane (itération 44).
ORPHAN_MIN_GAP = 1.0

# Un amas plus petit que ça n'est pas une étiquette, c'est un morceau
# d'étiquette ou une barre de mesure — 2 px de large sur 10 de haut, et il y
# en a une par mesure. `suspects()` les comptait toutes : **38 % de la file
# « à relire » n'étaient pas des accords** (319 amas → 199 sur les 91
# calques, itération 48). La plus petite étiquette réelle jamais certifiée
# fait 9 × 13 sur 3 174 ; le plancher se pose dessous.
SUSPECT_MIN_W = 5
SUSPECT_MIN_H = 11


class _Bench:
    """L'attirail que les trois chasses partagent : l'encre de la page, ses
    rangées, le banc de gabarits et la chasse estimée sur cette gravure.

    Il existe parce que les trois chasses tournent l'une après l'autre sur
    la même page, et que tout cela coûte une lecture d'image et une
    construction de banc — payées trois fois sans lui.
    """

    def __init__(self, slug: str):
        self.slug = slug
        path = os.path.join(IMAGES, f"{slug}-p1.webp")
        self.ink = np.asarray(Image.open(path).convert("L")) < INK_THRESHOLD
        _i, _w, self.feats, self.kinds = classify(path)
        self.bank = face_bank(vocabulary(slug), song_semitones(slug), song_face(slug))

        # La chasse s'estime sur les rangées déjà reconnues, pas sur la page
        # entière : y mêler des chiffres fausserait la médiane.
        refs = [s for f, k in zip(self.feats, self.kinds) if k == "chords"
                for x0, x1 in f["clusters"] if (s := self.sig_of(f["top"], f["bottom"], x0, x1)) is not None]
        self.kf = width_factor(refs, self.bank) if refs else 1.0

        # Étalon du nombre d'amas d'une rangée de chiffres, sur cette page.
        counts = [len(f["clusters"]) for f, k in zip(self.feats, self.kinds) if k == "numbers"]
        self.ceiling = HIDDEN_MAX_CLUSTERS * float(np.median(counts)) if counts else None

        # Hauteur d'une rangée d'accords **de cette page** : ce que
        # `welded_rows` promène et ce à quoi `orphan_rows` compare un vide.
        hs = [f["bottom"] - f["top"] + 1
              for f, k in zip(self.feats, self.kinds) if k == "chords"]
        self.row_h = int(np.median(hs)) if hs else 24

    def sig_of(self, top: int, bottom: int, x0: int, x1: int):
        sub = self.ink[top:bottom + 1, x0:x1 + 1]
        ys, xs = np.where(sub.any(1))[0], np.where(sub.any(0))[0]
        if not len(ys) or not len(xs):
            return None
        return signature(sub[ys[0]:ys[-1] + 1, xs[0]:xs[-1] + 1])

    def share(self, top: int, bottom: int, clusters, known=()) -> tuple[int, int]:
        """Amas de cette fenêtre qui s'apparient au vocabulaire, sur le total.

        **La part se compte sur ce qui n'est pas déjà publié** : le calque
        n'est pas un dénominateur. Sans ce filtre, 到各山岭去传扬 sortait à
        2/5 — deux accords convertis depuis l'itération 11 et trois chiffres
        — et passait le seuil (itération 39).
        """
        hits = tot = 0
        for x0, x1 in clusters:
            if known and _overlaps((x0, top, x1, bottom), known):
                continue
            s = self.sig_of(top, bottom, x0, x1)
            if s is None:
                continue
            tot += 1
            hits += best_match(s, self.bank, self.kf)[0] >= MIN_SCORE
        return hits, tot


def _vetoed(slug: str) -> set[int]:
    """Les rangées que l'œil a déjà tranchées : `not_rows` (« ce ne sont pas
    des accords ») et `mask_rows` (« ce sont des accords, mais dans une autre
    tonalité, et on les masque »).

    Sans ce veto, une page réparée reste signalée pour toujours : l'œil a
    répondu, et la chasse repose la question à chaque tour. C'est le défaut
    de l'itération 33, où la file ne voyait pas le travail déjà fait.
    """
    path = os.path.join(GOLD, f"{slug}.json")
    if not os.path.exists(path):
        return set()
    gold = json.load(open(path, encoding="utf8"))
    return {int(y) for y in gold.get("not_rows", [])} | {int(y) for y in gold.get("mask_rows", [])}


def hidden_rows(slug: str, entry: dict | None = None) -> list[tuple[int, str, int, int]]:
    b = _Bench(slug)
    veto = _vetoed(slug)
    ink, feats, kinds, ceiling = b.ink, b.feats, b.kinds, b.ceiling
    confirmed = confirm_candidates(slug, ink, feats, kinds)

    # Une rangée que le calque couvre déjà n'est plus cachée : c'est ce que
    # font les `extra_labels` posées à la main sur une rangée que le
    # classifieur range ailleurs. Le test porte sur le matcher, et le
    # matcher ne les voit pas — sans ce filtre, une page réparée reste
    # marquée « rangée cachée » pour toujours.
    known = (entry["labels"] + ([entry["keyLabel"]] if entry.get("keyLabel") else [])) if entry else []

    out = []
    for f, k in zip(feats, kinds):
        # `chords?` est une rangée que le classifieur a proposée et que le
        # matcher tranche (itération 22). Tant qu'il la **confirme**, elle
        # est dans le circuit et n'est pas cachée. Quand il l'**écarte**,
        # elle tombe de partout : `crop_labels` ne la rend pas, et ce test
        # la sautait aussi — elle n'entrait alors dans aucun dénominateur.
        # C'est ce trou qui laissait 认识你真好 afficher « 27/27, 100 %,
        # PRÊT » avec trois rangées d'accords entières jamais converties
        # (itération 37).
        if k == "chords" or (k == "chords?" and confirmed.get(f["top"])):
            continue
        if f["top"] in veto:
            continue
        if ceiling is not None and len(f["clusters"]) > ceiling:
            continue
        if f["bottom"] - f["top"] + 1 < HIDDEN_MIN_HEIGHT:
            continue
        if known:
            covered = sum(1 for x0, x1 in f["clusters"]
                          if _overlaps((x0, f["top"], x1, f["bottom"]), known))
            if covered >= 0.5 * len(f["clusters"]):
                continue
        hits, tot = b.share(f["top"], f["bottom"], f["clusters"])
        if tot < HIDDEN_MIN:
            continue
        seuil = 1.0 if tot < HIDDEN_COURT else HIDDEN_SHARE
        if hits / tot >= seuil:
            out.append((f["top"], k, hits, tot))
    return out


def _overlaps(box, labels) -> bool:
    x0, y0, x1, y1 = box
    for l in labels:
        if x0 <= l["x"] + l["w"] - 1 and l["x"] <= x1 and y0 <= l["y"] + l["h"] - 1 and l["y"] <= y1:
            return True
    return False


def orphan_rows(slug: str, entry: dict | None = None) -> list[tuple[int, int, int]]:
    """Les accords tombés **entre** deux bandes du classifieur.

    `hidden_rows` examine une bande mal typée, `welded_rows` fouille une
    bande trop haute ; **les deux supposent qu'une bande existe**. Le premier
    système de 和散那 ne porte qu'un accord, un « F » de 13 px sur 24 : trop
    peu d'encre pour que le découpage lui fasse une bande, et il tombe dans
    un vide de 90 px entre l'en-tête et les chiffres. La page affichait
    « 35/35, 100 % » sans lui, et l'audit navigateur seul l'a montré
    (itération 44).

    On regarde donc les vides eux-mêmes : tout intervalle plus haut qu'une
    rangée d'accords, découpé en amas, filtré sur la taille d'une étiquette,
    puis passé au matcher. Sur les 92 calques d'alors, 94 amas passaient la
    géométrie et **aucun** ne s'appariait — les vides d'une page sont pleins
    de barres de mesure, de crédits et de filigrane. Le « F » de 和散那, lui,
    sortait à +0,28.
    """
    b = _Bench(slug)
    veto = _vetoed(slug)
    known = (entry["labels"] + ([entry["keyLabel"]] if entry.get("keyLabel") else [])) if entry else []

    bornes = sorted((f["top"], f["bottom"]) for f in b.feats)
    out = []
    for (_t0, bas), (haut, _t1) in zip(bornes, bornes[1:]):
        top, bottom = bas + 1, haut - 1
        if bottom - top + 1 < ORPHAN_MIN_GAP * b.row_h:
            continue
        if top in veto:
            continue
        if not b.ink[top:bottom + 1].any():
            continue
        clusters = [(x0, x1) for x0, x1 in column_clusters(b.ink, top, bottom)
                    if x1 - x0 + 1 >= SUSPECT_MIN_W]
        if not clusters:
            continue
        hits, tot = b.share(top, bottom, clusters, known)
        if tot < HIDDEN_MIN:
            continue
        seuil = 1.0 if tot < HIDDEN_COURT else HIDDEN_SHARE
        if hits / tot >= seuil:
            out.append((top, hits, tot))
    return out


def welded_rows(slug: str, entry: dict | None = None) -> list[tuple[int, int, int]]:
    """Les rangées d'accords **soudées** à la bande voisine.

    `hidden_rows` teste une bande entière, et dans une bande soudée chaque
    amas porte à la fois la lettre et le chiffre : plus rien ne s'apparie.
    Le trou était nommé depuis l'itération 37 et se trouvait à l'œil, page
    après page.

    **On ne cherche donc pas la coupure, on cherche les accords.** Une
    fenêtre de la hauteur d'une rangée d'accords *de cette page* est promenée
    dans la bande, de quatre en quatre pixels ; à chaque position on découpe
    les amas et on les apparie. C'est le geste de `measure-keylabel`
    (itération 35), qui s'ancre sur le glyphe `=` au lieu d'attendre que le
    découpage lui donne la bonne bande.

    Le signal est franc, et c'est ce qui rend le test utilisable : sur
    我安然居住 la bonne fenêtre sort à **5/7 appariés**, quand les bandes de
    paroles de la même page plafonnent à 0 et les autres bandes de chiffres
    à 11 %.
    """
    b = _Bench(slug)
    veto = _vetoed(slug)
    confirmed = confirm_candidates(slug, b.ink, b.feats, b.kinds)
    known = (entry["labels"] + ([entry["keyLabel"]] if entry.get("keyLabel") else [])) if entry else []

    out = []
    for f, k in zip(b.feats, b.kinds):
        # Une bande déjà typée `chords` est isolée : elle n'est pas soudée.
        if k == "chords" or (k == "chords?" and confirmed.get(f["top"])):
            continue
        if f["top"] in veto:
            continue
        hauteur = f["bottom"] - f["top"] + 1
        if hauteur < WELD_MIN_RATIO * b.row_h:
            continue
        meilleur = None
        for top in range(f["top"], f["bottom"] - b.row_h + 2, WELD_STEP):
            bottom = top + b.row_h - 1
            if not b.ink[top:bottom + 1].any():
                continue
            clusters = [(x0, x1) for x0, x1 in column_clusters(b.ink, top, bottom)
                        if x1 - x0 + 1 >= SUSPECT_MIN_W]
            if not clusters:
                continue
            # `welded_rows` **partage les gardes de `hidden_rows`**
            # (itération 45), et celle-ci est décisive : une rangée de
            # chiffres de cette page compte une trentaine d'amas, une rangée
            # d'accords cinq. Sans elle la fenêtre s'arrête sur les rangées
            # de 简谱 — les « 0 » de 我们高举耶稣的名 s'apparient 16/16, un
            # zéro ayant le dessin d'un C ou d'un D.
            if b.ceiling is not None and len(clusters) > b.ceiling:
                continue
            hits, tot = b.share(top, bottom, clusters, known)
            if tot < HIDDEN_MIN:
                continue
            seuil = 1.0 if tot < HIDDEN_COURT else HIDDEN_SHARE
            if hits / tot >= seuil and (meilleur is None or hits > meilleur[1]):
                meilleur = (top, hits, tot)
        if meilleur:
            out.append(meilleur)
    return out


def suspects(slug: str, entry: dict, gold: dict | None = None) -> list[dict]:
    """Les amas d'encre des rangées d'accords que le calque **ne couvre pas**.

    C'est la file « à relire » : ce qui reste d'accord possible sur une page
    dont le calque publie déjà. `audit-page` les encadre en rouge.

    Le plancher de taille n'est pas cosmétique. Une barre de mesure fait 2 px
    de large sur 10 de haut, et il y en a une par mesure : `suspects()` les
    comptait toutes, et **38 % de la file n'étaient pas des accords** — 319
    amas contre 199 réels sur les 91 calques (itération 48). La file « PRÊT »
    est alors passée de 0 à 5 pages sans qu'aucun travail ait été fait, pour
    la seconde fois de la boucle.
    """
    gold = gold if gold is not None else {}
    known = entry["labels"] + ([entry["keyLabel"]] if entry.get("keyLabel") else [])
    skip = {int(y) for y in gold.get("not_rows", [])} | {int(y) for y in gold.get("mask_rows", [])}
    blanks = set(gold.get("not_labels", []))

    out = []
    for f, cells in crop_labels(slug):
        if f["top"] in skip:
            continue
        for (x0, x1), bitmap in cells:
            if f"{f['top']},{x0}" in blanks:
                continue
            if _overlaps((x0, f["top"], x1, f["bottom"]), known):
                continue
            h, w = bitmap.shape
            if w < SUSPECT_MIN_W or h < SUSPECT_MIN_H:
                continue
            out.append({"x": x0, "y": f["top"], "w": x1 - x0 + 1,
                        "h": f["bottom"] - f["top"] + 1})
    return out


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
    réellement — lecture, `corrections`, `extra_labels` et masques compris —
    et on ne compte que les amas assez gros pour être une étiquette.
    """
    published = [l for l in entry["labels"] if l.get("c")]
    return len(published), len(suspects(slug, entry, gold))


def main() -> int:
    certifiees = "--certifiées" in sys.argv or "--certifiees" in sys.argv
    chords = json.load(open(os.path.join(IMAGES, "chords.json"), encoding="utf8"))
    rows = []
    for slug in sorted(chords):
        gold_path = os.path.join(GOLD, f"{slug}.json")
        gold = json.load(open(gold_path, encoding="utf8")) if os.path.exists(gold_path) else {}
        if bool(gold.get("verified")) != certifiees:
            continue
        entry = chords[slug]
        kept, missing = remaining(slug, entry, gold)
        total = kept + missing
        hidden = hidden_rows(slug, entry)
        welded = welded_rows(slug, entry)
        orphans = orphan_rows(slug, entry)
        perdues = [(nom, r) for nom, rs in (("cachée", hidden), ("soudée", welded),
                                            ("orpheline", orphans)) for r in rs]

        # Sur une page **certifiée**, le calque est gelé et relu à l'œil : le
        # seul verdict qui reste utile est « une rangée manque encore ».
        # C'est la passe de l'itération 39, et c'est là qu'une rangée manquée
        # fait le plus de dégâts, puisque plus personne ne regarde.
        if certifiees:
            if perdues:
                for nom, r in perdues:
                    print(f"  {slug:24} {nom} y={r[0]} {r[-2]}/{r[-1]}", flush=True)
                rows.append(slug)
            continue

        has_kl = gold.get("key_label") is not None
        # Un cadre mesuré puis **écarté** (le do gravé diffère de printedKey,
        # cf. 十架的爱) porte sa note sans porter de cadre. Sans ce cas, le
        # classement le redemanderait à chaque tour : c'est le défaut de
        # l'itération 33, où la file ne voyait pas le travail déjà fait.
        kl_note = gold.get("key_label_verified")
        if perdues:
            verdict = " · ".join(f"{n} y={r[0]}" for n, r in perdues)
        elif missing > 8:
            verdict = f"{missing} à relire"
        elif has_kl:
            verdict = "PRÊT"
        elif kl_note:
            verdict = "PRÊT (cadre 1=X écarté, voir gold)"
        else:
            verdict = "PRÊT (cadre 1=X à mesurer)"
        rows.append((bool(perdues), missing, slug, kept, total, verdict))
        print(f"  {slug:20} {kept:3}/{total:<3} {kept/max(total,1):4.0%}  "
              f"{verdict}", flush=True)

    if certifiees:
        print(f"\n{len(rows)} page(s) certifiée(s) avec une rangée perdue")
        return 0
    ready = [r for r in rows if r[5].startswith("PRÊT")]
    print(f"\n{len(ready)} prêt(s) à certifier · {sum(1 for r in rows if r[0])} "
          f"avec rangée cachée, soudée ou orpheline · {len(rows)} non certifiés au total")
    return 0


if __name__ == "__main__":
    sys.exit(main())
