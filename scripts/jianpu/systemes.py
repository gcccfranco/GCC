#!/usr/bin/env python3
"""Lignes (systèmes) et barres de mesure des scans 简谱 : le découpage du mode louange.

Lot AO, tranche JP-A1 (docs/spec-mode-louange-forscore-2.md, § « JP — 简谱 dans le mode louange »).
Le mode louange affichera bientôt une *tranche* de la page (jamais un chiffre rapetissé) et, au téléphone, coupera
chaque ligne en deux sur une barre de mesure. Il lui faut donc, pour chaque page d'un scan, les LIGNES de musique et
les x de leurs barres (pixels du WebP, comme `chords.json` et `cadrage.json`).

**Une ligne** = un système 简谱 complet : le repère gravé éventuel au-dessus (【Chorus】, crochets de volta 1./2.,
« 先低后高 »), la rangée d'accords, la rangée de chiffres (points d'octave, liaisons, triolets) et **toutes** les
rangées de paroles qui la suivent (1 à 4 couplets), jusqu'au blanc qui précède le système suivant. L'en-tête gravé de
la première page (titre, album, versets, crédits, « 1=E 4/4 », ♩=65) et le pied (ligne de crédit, numéro de page, logo)
ne sont PAS des lignes.

**La règle** :
1. *encre* = gris < INK_THRESHOLD (segment.py : le filigrane gris clair disparaît) ; une fermeture verticale de 2 px
   recolle un trait que le tramage a interrompu. Un trait de plus de 15 % de la hauteur de la page est un cadre
   (bordure du scan) : il sort de l'encre.
2. *barres de mesure* = traits **verticaux fins** (≤ 12 px de large, colonnes adjacentes fusionnées) dont la hauteur
   dépasse celle d'un chiffre ou d'un trait de caractère (`HAUT_BARRE`, 48 px à 1 600 px de large, proportionnelle à la
   largeur du scan) : le chiffre « 1 » reste en dessous (une barre fait ~2× un chiffre). Les traits dont les hauteurs se
   recouvrent forment une *rangée* ; une rangée n'est celle d'un système que si elle porte au moins 2 barres éloignées de
   60 px ou plus (un titre, un « ⊕ » seul n'y suffisent pas), qu'elle est sous la ligne « 1=X » de la page 1 et qu'elle
   n'est pas bien plus courte que les autres (les gros caractères de paroles, `RANG_RELATIF`). Deux traits à moins de
   20 px (double barre, « |: », « :‖ », barre finale épaisse) = UNE barre, x = centre du groupe. (`unbarred()` de
   segment.py n'est pas réutilisée : elle efface les traits fins du profil, ici on veut au contraire les trouver, et une
   barre finale épaisse lui survivrait.)
3. *chaque rangée de barres est la rangée de chiffres d'un système* (ancre). Entre deux ancres, les bandes d'encre se
   partagent entre le système du dessus (paroles) et celui du dessous (repère + accords) en coupant au **plus grand
   blanc** de l'intervalle, avec deux garde-fous : la coupe reste au-dessus de toute étiquette de `chords.json` du système
   du dessous (page sans calque : une étiquette supposée à 50 px au-dessus des barres), et elle vient **après la première
   rangée de paroles** (bande de 30 px ou plus, large d'au moins 15 % de la page, à moins de 44 px sous les barres) : le
   blanc entre les chiffres et leurs paroles est parfois le plus grand (爱赢了). Système sans paroles : tous les blancs
   sont candidats.
   Au-dessus de la 1re ancre (page 1) : le plus bas des blancs francs (≥ 20 px) sous « 1=X » et au-dessus de la 1re
   étiquette (♩=65 et crédits restent dans l'en-tête). Sous la dernière ancre : jusqu'à la dernière encre, avant le logo
   du pied (un bloc de 60 px ou plus, collé au bas de la page, dans le dernier cinquième de la largeur) quand il y en a
   un ; la ligne de crédit tient dans la hauteur du logo et ne se sépare pas des paroles par un blanc.
4. y0 = haut de la première encre du système (étendu à la boîte des étiquettes d'accord), y1 = bas de la dernière.

**Limites connues** (à regarder de près sur la planche, corriger à la main) : un repère ou une annotation collés aux paroles
sans blanc entre eux (rangées qui se touchent, 爱的彰显) ; les chants à 2 rangées d'accords (la seconde sous les paroles) ;
les hymnaires en gros caractères gras (十字架, 你们要赞美耶和华 : les traits des caractères passent pour des barres) ; un bloc de
texte sous le dernier système (Rap, notes) absorbé dans la dernière ligne ; un repère placé à côté d'une rangée de paroles
presque vide (【Bridge】 de 为我而来, p. 2) ; ♩=67 collé aux accords (你的同在).

**La proposition n'est pas la donnée.** Une entrée n'entre dans `public/jianpu/systemes.json` que certifiée à l'œil
sur la planche (`npm run jianpu:audit -- --systemes <slug…>`, scripts/jianpu/LOOP.md). Un scan absent de
`systemes.json` n'est pas certifié : il garde l'affichage d'aujourd'hui. `chords.json`, `index.json`, `cadrage.json`
et `marges.json` ne changent jamais.

**Format** (proposition et fichier certifié identiques, par chant) :
    {"source": index[slug].source,
     "pages": [{"file": …, "w": …, "h": …, "lignes": [{"y0": int, "y1": int, "barres": [int, …]}, …]}, …]}
`public/jianpu/systemes.json` = {"version": 1, "chants": {slug: entrée, …}} ; `version` = version du FORMAT. Une entrée
est valide si, contre index.json, `source` est la même et, pour chaque page, `file`, `w`, `h` aussi : le site ignore
une entrée qui ne correspond plus.

**Contrôles de `propose`** (une ligne par page : slug, page, nombre de lignes, barres par ligne, puis ⚠) :
étiquette de chords.json (c non vide) hors de toute ligne · deux lignes qui se recouvrent ou espacées de moins de 4 px ·
ligne à moins de 2 barres · hauteur de ligne hors de [0,5 ; 1,8] × la médiane de la page · page sans aucune ligne.

**Correction à la main** : éditer `scripts/jianpu/debug/systemes-propose.json` (la proposition du slug : y0/y1/barres),
regarder la planche avec `--propose`, puis `certifier` (qui revérifie tout).

Usage (depuis la racine du dépôt) :
    python3 scripts/jianpu/systemes.py propose [slug…]     # tableau + debug/systemes-propose.json
    python3 scripts/jianpu/systemes.py certifier slug…     # copie la proposition dans public/jianpu/systemes.json
    python3 scripts/jianpu/systemes.py retirer slug…       # enlève un chant du fichier certifié
    python3 scripts/jianpu/systemes.py etat                # certifiés / restants
"""

from __future__ import annotations

import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from segment import load  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
IMAGES = os.path.join(HERE, "..", "..", "public", "jianpu")
DEBUG = os.path.join(HERE, "debug")
SYSTEMES = os.path.join(IMAGES, "systemes.json")
PROPOSE = os.path.join(DEBUG, "systemes-propose.json")

VERSION = 1
LARGEUR_REF = 1600
HAUT_BARRE = 48  # px à 1 600 px de large : au-dessus d'un chiffre (≤ 38) et d'un trait de caractère (≤ 40), au-dessous d'une barre (≥ 52)
HAUT_MAX = 0.15  # une barre ne dépasse pas cette part de la page : un trait plus haut est un cadre
RANG_RELATIF = 0.6  # une rangée de barres a au moins cette part de la hauteur de rangée du 85e centile de la page
LARGEUR_MAX = 12  # un trait plus large n'est pas une barre
FUSION_X = 20  # double barre, reprise, barre finale : une seule barre
ECART_BARRES = 60  # deux barres au moins, éloignées de cette distance, pour une rangée de système
MIN_BLANC = 4  # blanc minimal entre deux lignes (⚠ en dessous)
DECALAGE_ETIQUETTE = 50  # px à 1 600 : haut des étiquettes d'accord au-dessus du haut des barres (médiane de 1 313 lignes)
HAUT_PAROLES = 30  # px à 1 600 px de large : une bande plus haute est une rangée de paroles (médiane mesurée 40, 5 % < 32), pas un point d'octave ni un repère 【Chorus】
DISTANCE_PAROLES = 44  # px à 1 600 : la 1re rangée de paroles commence au plus à cette distance sous les barres (99 % des 1 084 lignes mesurées)
ETENDUE_PAROLES = 0.15  # une rangée de paroles s'étend au moins sur cette part de la largeur du scan
ENTETE_BLANC = 20  # px à 1 600 : un blanc franc sépare l'en-tête de la 1re ligne
HAUT_LOGO = 60  # px à 1 600 : hauteur minimale du logo du pied
LOGO_X = 0.8  # le logo est dans le dernier cinquième de la largeur


def charger(nom: str) -> dict:
    with open(os.path.join(IMAGES, nom), encoding="utf-8") as f:
        return json.load(f)


def traits_verticaux(encre: np.ndarray, haut: int) -> list[dict]:
    """Traits verticaux d'au moins `haut` px, colonnes adjacentes fusionnées."""
    h, w = encre.shape
    fermee = encre | (np.roll(encre, 1, axis=0) & np.roll(encre, -1, axis=0))
    fermee |= np.roll(fermee, 1, axis=0) & np.roll(fermee, -2, axis=0)
    traits: list[dict] = []
    for x in range(w):
        col = np.concatenate([[0], fermee[:, x].astype(np.int8), [0]])
        d = np.diff(col)
        for a, b in zip(np.where(d == 1)[0], np.where(d == -1)[0]):
            if b - a < haut:
                continue
            for t in traits:
                if x - t["x1"] <= 1 and abs(a - t["y0"]) < 8 and abs(b - t["y1"]) < 8:
                    t["x1"] = x
                    t["y0"], t["y1"] = min(t["y0"], int(a)), max(t["y1"], int(b))
                    break
            else:
                traits.append({"x0": x, "x1": x, "y0": int(a), "y1": int(b)})
    return [t for t in traits if t["x1"] - t["x0"] + 1 <= LARGEUR_MAX]


def rangees(traits: list[dict]) -> list[dict]:
    """Traits dont les hauteurs se recouvrent → rangées ; barres = traits fusionnés à FUSION_X."""
    out: list[dict] = []
    for t in sorted(traits, key=lambda t: t["y0"] + t["y1"]):
        for r in out:
            lo, hi = max(t["y0"], r["y0"]), min(t["y1"], r["y1"])
            if hi - lo >= 0.5 * min(t["y1"] - t["y0"], r["y1"] - r["y0"]):
                r["traits"].append(t)
                r["y0"] = int(np.median([u["y0"] for u in r["traits"]]))
                r["y1"] = int(np.median([u["y1"] for u in r["traits"]]))
                break
        else:
            out.append({"y0": t["y0"], "y1": t["y1"], "traits": [t]})
    for r in out:
        groupes: list[list[dict]] = []
        for t in sorted(r["traits"], key=lambda t: t["x0"]):
            if groupes and t["x0"] - groupes[-1][-1]["x1"] <= FUSION_X:
                groupes[-1].append(t)
            else:
                groupes.append([t])
        r["barres"] = [round((g[0]["x0"] + g[-1]["x1"]) / 2) for g in groupes]
        r["haut"] = min(t["y0"] for t in r["traits"])
        r["bas"] = max(t["y1"] for t in r["traits"])
    out = [r for r in out if len(r["barres"]) >= 2 and r["barres"][-1] - r["barres"][0] >= ECART_BARRES]
    if out:
        # Les traits d'un gros caractère de paroles (口, 丨) passent le seuil absolu : ils sont bien plus courts que les barres.
        ref = float(np.percentile([r["bas"] - r["haut"] for r in out], 85))
        out = [r for r in out if r["bas"] - r["haut"] >= RANG_RELATIF * ref]
    return sorted(out, key=lambda r: r["y0"])


def blancs(encre: np.ndarray, a: int, b: int, bornes: bool = True) -> list[tuple[int, int, int]]:
    """Blancs (début, fin incluse, longueur) entre deux rangées d'encre dans [a, b).

    `bornes` : a − 1 et b comptent comme de l'encre (les rangées de barres qui bornent l'intervalle) ; sinon le blanc
    final jusqu'au bord de la page n'est pas un blanc.
    """
    profil = encre.sum(axis=1)
    ys = [y for y in range(max(0, a), min(b, len(profil))) if profil[y] > 0]
    if bornes:
        ys = [a - 1] + ys + [b]
    return [(p + 1, q - 1, q - p - 1) for p, q in zip(ys, ys[1:]) if q - p > 1]


def encre_dans(encre: np.ndarray, a: int, b: int) -> tuple[int, int] | None:
    profil = encre.sum(axis=1)
    ys = [y for y in range(max(0, a), min(b, len(profil))) if profil[y] > 0]
    return (ys[0], ys[-1]) if ys else None


def bandes(encre: np.ndarray, a: int, b: int) -> list[tuple[int, int]]:
    """Bandes d'encre (haut, bas inclus) de [a, b)."""
    profil = encre.sum(axis=1)
    out: list[list[int]] = []
    for y in range(max(0, a), min(b, len(profil))):
        if profil[y] > 0:
            if out and y - out[-1][1] == 1:
                out[-1][1] = y
            else:
                out.append([y, y])
    return [(p, q) for p, q in out]


def meilleur_blanc(encre, a, b, etiquettes=(), bornes=True, paroles=True):
    """Le plus grand blanc de [a, b) qui sépare le système du dessus de celui du dessous.

    Deux garde-fous : le blanc reste au-dessus de toute étiquette `etiquettes` (y de celles du système du dessous), et il
    vient **après la première rangée de paroles** — celle-ci est la première bande d'encre d'au moins HAUT_PAROLES px
    qui n'est pas une étiquette, et qui commence à moins de DISTANCE_PAROLES sous les barres (un repère 【Chorus】 sous
    un système sans paroles est plus bas). Sans cela, le blanc entre les chiffres (leurs points, leurs traits) et les paroles,
    parfois le plus grand de l'intervalle (爱赢了), serait pris pour la coupe et les paroles passeraient au système
    du dessous. Pas de rangée de paroles (système sans paroles) : tous les blancs sont candidats.
    """
    gaps = blancs(encre, a, b, bornes)
    if not gaps:
        return None
    plafond = min(etiquettes) - 1 if len(etiquettes) else None
    depart = a
    if paroles:
        hmin = max(20, round(HAUT_PAROLES * encre.shape[1] / LARGEUR_REF))
        for p, q in bandes(encre, a, b):
            cols = np.where(encre[p : q + 1].any(axis=0))[0]
            if q - p + 1 >= hmin and not any(p < y + 20 and y < q for y in etiquettes):
                if cols[-1] - cols[0] < ETENDUE_PAROLES * encre.shape[1]:
                    continue  # étroit : un repère (【Verse】), pas une rangée de paroles
                if p - a <= DISTANCE_PAROLES * encre.shape[1] / LARGEUR_REF:
                    depart = q + 1
                break
    cand = [g for g in gaps if g[0] >= depart and (plafond is None or g[0] <= plafond)]
    if not cand:
        cand = [g for g in gaps if plafond is None or g[0] <= plafond] or gaps
    return max(cand, key=lambda g: (g[2], g[0]))


def proposer_page(fichier: str, calque: dict | None, premiere: bool) -> list[dict]:
    _, encre = load(os.path.join(IMAGES, fichier))
    h, w = encre.shape
    haut = max(32, round(HAUT_BARRE * w / LARGEUR_REF))
    traits = traits_verticaux(encre, haut)
    # Un trait de plus de HAUT_MAX × la page est un cadre (bordure du scan), pas une barre : il sort aussi de l'encre, sans quoi
    # il comble tous les blancs entre les rangées.
    for t in traits:
        if t["y1"] - t["y0"] > HAUT_MAX * h:
            encre[:, max(0, t["x0"] - 1) : t["x1"] + 2] = False
    ancres = rangees([t for t in traits if t["y1"] - t["y0"] <= HAUT_MAX * h])
    etiquettes = [l for l in (calque["labels"] if calque else []) if l["c"]]
    # En-tête : sous « 1=X » (et ses voisins) à la page 1 ; les rangées de barres au-dessus sont des lettres.
    plancher = 0
    if premiere and calque and calque.get("keyLabel"):
        plancher = int(calque["keyLabel"]["y"] + calque["keyLabel"]["h"])
    ancres = [r for r in ancres if r["y0"] >= plancher]
    if not ancres:
        return []

    def labels_entre(a: int, b: int) -> list[int]:
        if calque is None:  # page sans calque : étiquette supposée à la hauteur médiane mesurée sur tous les calques
            return [b - round(DECALAGE_ETIQUETTE * w / LARGEUR_REF)]
        return [l["y"] for l in etiquettes if a <= l["y"] < b]

    # Coupes : en haut, entre chaque paire, en bas.
    coupes: list[tuple[int, int]] = []  # (y1 du système i, y0 du système i+1)
    for r, s in zip(ancres, ancres[1:]):
        mes = labels_entre(r["bas"], s["haut"])
        g = meilleur_blanc(encre, r["bas"], s["haut"], mes)
        if g is None:
            coupes.append((r["bas"], s["haut"]))
            continue
        coupes.append((g[0] - 1, g[1] + 1))

    # Haut de la page.
    premiere_etiq = min((l["y"] for l in etiquettes if l["y"] < ancres[0]["haut"]), default=None)
    debut = plancher
    # Le plus bas des blancs francs (≥ ENTETE_BLANC) : ♩=65 et les crédits restent dans l'en-tête, le repère collé aux accords
    # (【Intro】) dans la ligne ; sans blanc franc, le plus grand.
    g = None
    if premiere:
        plafond_h = [] if premiere_etiq is None else [premiere_etiq]
        gs = [x for x in blancs(encre, debut, ancres[0]["haut"]) if not plafond_h or x[0] <= plafond_h[0] - 1]
        francs = [x for x in gs if x[2] >= ENTETE_BLANC * w / LARGEUR_REF]
        g = max(francs, key=lambda x: x[0]) if francs else (max(gs, key=lambda x: (x[2], x[0])) if gs else None)
    if g is not None:
        y0_premier = g[1] + 1
    else:
        e = encre_dans(encre, debut, ancres[0]["haut"] + 1)
        y0_premier = e[0] if e else ancres[0]["haut"]
    # Bas de la page : le pied gravé (ligne de crédit + logo) se reconnaît à son logo, un bloc d'au moins HAUT_LOGO px dans le
    # quart droit, collé au bas de la page ; la ligne de crédit tient dans sa hauteur. Sans logo, pas de pied.
    droite = encre[:, int(LOGO_X * w):]
    logo = [p for p, q in bandes(droite, ancres[-1]["bas"], h) if q - p + 1 >= HAUT_LOGO * w / LARGEUR_REF and q >= h - 60]
    fin = logo[-1] if logo else h
    e = encre_dans(encre, ancres[-1]["bas"], fin)
    y1_dernier = e[1] if e else ancres[-1]["bas"]

    lignes = []
    for i, r in enumerate(ancres):
        y0 = y0_premier if i == 0 else coupes[i - 1][1]
        y1 = y1_dernier if i == len(ancres) - 1 else coupes[i][0]
        # rogner au premier / dernier pixel d'encre
        e = encre_dans(encre, y0, y1 + 1)
        if e:
            y0, y1 = e
        # la boîte d'une étiquette de chords.json déborde de quelques px l'encre qu'elle entoure : la ligne la contient
        haut_i = ancres[i - 1]["bas"] if i else 0
        for l in etiquettes:
            if haut_i <= l["y"] < r["haut"] and l["y"] + l["h"] > y0 - 12 and l["y"] < y0:
                y0 = max(l["y"], lignes[-1]["y1"] + 1 if lignes else 0)
        lignes.append({"y0": int(y0), "y1": int(y1), "barres": [int(x) for x in r["barres"]]})
    return lignes


def controles(page: dict, calque: dict | None, lignes: list[dict]) -> list[str]:
    avert = []
    if not lignes:
        return ["page sans aucune ligne"]
    if calque:
        hors = [l for l in calque["labels"] if l["c"] and not any(g["y0"] <= l["y"] and l["y"] + l["h"] <= g["y1"] + 1 for g in lignes)]
        if hors:
            avert.append(f"{len(hors)} étiquette(s) hors ligne (ex. {hors[0]['c']} y={hors[0]['y']})")
    for a, b in zip(lignes, lignes[1:]):
        if b["y0"] - a["y1"] < MIN_BLANC:
            avert.append(f"lignes serrées ou qui se recouvrent ({a['y1']} / {b['y0']})")
    for i, g in enumerate(lignes, 1):
        if len(g["barres"]) < 2:
            avert.append(f"L{i} : moins de 2 barres")
    med = float(np.median([g["y1"] - g["y0"] for g in lignes]))
    for i, g in enumerate(lignes, 1):
        r = (g["y1"] - g["y0"]) / med
        if not 0.5 <= r <= 1.8:
            avert.append(f"L{i} : hauteur {g['y1'] - g['y0']} px = {r:.2f} × la médiane")
    return avert


def proposer(slugs: list[str]) -> dict:
    index, calques = charger("index.json"), charger("chords.json")
    slugs = slugs or sorted(index)
    out: dict = {}
    for slug in slugs:
        if slug not in index:
            sys.exit(f"{slug} : absent de index.json")
        pages = []
        for n, p in enumerate(index[slug]["pages"]):
            # Les étiquettes du calque ne portent que sur la page 1.
            calque = calques.get(slug) if n == 0 else None
            lignes = proposer_page(p["file"], calque, n == 0)
            pages.append({"file": p["file"], "w": p["w"], "h": p["h"], "lignes": lignes})
            av = controles(p, calque, lignes)
            barres = ",".join(str(len(g["barres"])) for g in lignes)
            print(f"{slug}\tp.{n + 1}\t{len(lignes)} lignes\tbarres {barres}" + ("".join(f"\t⚠ {a}" for a in av)))
        out[slug] = {"source": index[slug]["source"], "pages": pages}
    os.makedirs(DEBUG, exist_ok=True)
    deja = {}
    if os.path.exists(PROPOSE):
        with open(PROPOSE, encoding="utf-8") as f:
            deja = json.load(f)
    deja.update(out)
    ecrire(PROPOSE, deja, None)
    return out


def ecrire(chemin: str, chants: dict, version: int | None) -> None:
    """Écriture stable : clés triées, une ligne par chant, UTF-8 sans échappement."""
    lignes = ",\n".join(f"{json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False, sort_keys=True)}" for k, v in sorted(chants.items()))
    with open(chemin, "w", encoding="utf-8") as f:
        if version is None:
            f.write("{\n" + lignes + "\n}\n")
        else:
            f.write('{"version": ' + str(version) + ', "chants": {\n' + lignes + "\n}}\n")


def verifier(slug: str, entree: dict, index: dict) -> list[str]:
    """Revérifie une entrée contre index.json et sa géométrie ; renvoie les erreurs."""
    if slug not in index:
        return [f"{slug} absent de index.json"]
    ref = index[slug]
    err = []
    if entree.get("source") != ref["source"]:
        err.append(f"source {entree.get('source')!r} ≠ {ref['source']!r}")
    pages = entree.get("pages", [])
    if len(pages) != len(ref["pages"]):
        return err + [f"{len(pages)} page(s) au lieu de {len(ref['pages'])}"]
    for n, (p, r) in enumerate(zip(pages, ref["pages"]), 1):
        for k in ("file", "w", "h"):
            if p.get(k) != r[k]:
                err.append(f"p.{n} : {k} {p.get(k)!r} ≠ {r[k]!r}")
        if err:
            continue
        dernier = None
        for i, g in enumerate(p.get("lignes", []), 1):
            manque = [k for k in ("y0", "y1", "barres") if k not in g]
            if manque:
                err.append(f"p.{n} L{i} : clé(s) manquante(s) {', '.join(manque)}")
                continue
            if not 0 <= g["y0"] < g["y1"] <= r["h"]:
                err.append(f"p.{n} L{i} : y0={g['y0']} y1={g['y1']} hors de [0, {r['h']}]")
            if dernier is not None and g["y0"] <= dernier:
                err.append(f"p.{n} L{i} : recouvre la ligne précédente")
            dernier = g["y1"]
            b = g["barres"]
            if any(not 0 <= x <= r["w"] for x in b) or any(x >= y for x, y in zip(b, b[1:])):
                err.append(f"p.{n} L{i} : barres hors de [0, {r['w']}] ou non croissantes")
    return err


def lire_certifie() -> dict:
    if not os.path.exists(SYSTEMES):
        return {}
    with open(SYSTEMES, encoding="utf-8") as f:
        return json.load(f)["chants"]


def certifier(slugs: list[str]) -> None:
    index = charger("index.json")
    if not slugs:
        sys.exit("certifier : au moins un slug")
    propose = {}
    if os.path.exists(PROPOSE):
        with open(PROPOSE, encoding="utf-8") as f:
            propose = json.load(f)
    certifies = lire_certifie()
    for slug in slugs:
        if slug not in propose:
            proposer([slug])
            with open(PROPOSE, encoding="utf-8") as f:
                propose = json.load(f)
        err = verifier(slug, propose[slug], index)
        if err:
            sys.exit(f"{slug} refusé : " + " ; ".join(err))
        certifies[slug] = propose[slug]
        print(f"{slug} certifié : " + " / ".join(str(len(p["lignes"])) + " lignes" for p in propose[slug]["pages"]))
    ecrire(SYSTEMES, certifies, VERSION)


def retirer(slugs: list[str]) -> None:
    if not os.path.exists(SYSTEMES):
        print("aucun fichier certifié : rien à retirer")
        return
    certifies = lire_certifie()
    retires = 0
    for slug in slugs:
        if certifies.pop(slug, None) is None:
            print(f"{slug} : pas certifié")
        else:
            print(f"{slug} retiré")
            retires += 1
    if retires:
        ecrire(SYSTEMES, certifies, VERSION)


def etat() -> None:
    index = charger("index.json")
    certifies = lire_certifie()
    restants = [s for s in sorted(index) if s not in certifies]
    print(f"{len(certifies)} chant(s) certifié(s), {len(restants)} restant(s)")
    for s in restants:
        print(s)


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in {"propose", "certifier", "retirer", "etat"}:
        sys.exit(__doc__)
    commande, args = sys.argv[1], sys.argv[2:]
    if commande == "propose":
        proposer(args)
    elif commande == "certifier":
        certifier(args)
    elif commande == "retirer":
        retirer(args)
    else:
        etat()
