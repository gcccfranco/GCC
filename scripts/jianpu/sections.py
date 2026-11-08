#!/usr/bin/env python3
"""Sections des chants à scan 简谱 : la ligne du scan où commence chaque section du .cho.

Lot AO, tranche JP-A2 (docs/spec-mode-louange-forscore-2.md, § « JP — 简谱 dans le mode louange »).
Le mode louange saute d'une section à l'autre : pour chaque section de `content/songs/<slug>.cho`, il lui faut la
page et la LIGNE du scan (système de `public/jianpu/systemes.json`) où elle commence.

**Sections du .cho** : chaque directive `{start_of_<type>[: libellé]}` hors `{start_of_jianpu}` ; id = `<type>-<n>`, n =
rang (depuis 1) de la directive parmi toutes les `start_of_` du fichier hors jianpu (src/lib/chordpro/parser.ts : même
compteur, `start_of_grid` compris) ; label = la valeur après « : » (vide sinon). Une ligne `{section_id: X}` à
l'intérieur de la section remplace l'id par X (comme le parseur ; le compteur n avance quand même).

**La règle** (proposition) :
1. Les lignes viennent de `systemes.json` si le chant y est certifié, sinon de `debug/systemes-propose.json` (que `propose`
   fabrique avec systemes.py s'il manque). Les étiquettes d'accord de `chords.json` (c non vide, page 1 seulement) sont
   rattachées à la ligne dont [y0, y1] contient leur centre ; ordre de lecture = ligne, puis x.
2. La suite des accords du .cho (dans l'ordre, section par section) est alignée sur celle des étiquettes avec
   difflib.SequenceMatcher. Les accords sont comparés **relativement à la tonalité** (degré de la fondamentale + reste du
   nom : le .cho et le scan peuvent être écrits dans deux tonalités) ; une basse « /G# » et la casse comptent.
3. Une section prend la ligne de son **premier accord apparié** (un appariement isolé, sans voisin apparié dans la même
   section, ne compte pas). Si des accords précèdent cet appariement dans la section, le premier accord de la section est
   supposé les précéder dans le scan (position = appariée − rang), sans remonter avant la fin de la section précédente.
4. Une section que le .cho **répète** (même type et même suite d'accords qu'une section plus haut) alors que le scan ne la
   grave pas (moins des trois quarts de ses accords appariés : une gravure séparée s'apparie presque entièrement) va à la ligne de la section qu'elle répète (reprise ; les couplets
   suivants d'un même système de paroles suivent la même règle : mêmes accords, mêmes lignes).
5. ANACROUSE : si le premier accord de la section tombe dans la dernière mesure de sa ligne (x au-delà de la dernière
   barre intérieure ; la dernière barre d'une ligne, au bord droit de la page à 4 % de la largeur près, est celle du bord) et qu'une
   ligne suit (même page, sinon la 1re ligne de la page suivante), la section va à la ligne suivante avec `anacrouse: true`.
6. Sans calque (page 2 de 为我而来), sans accord, ou sans appariement : `page` et `ligne` = null avec un ⚠ « à placer à la
   main » (apparier par les paroles est hors de portée). Une section absente du scan est aussi null.

**La proposition n'est pas la donnée.** `public/jianpu/sections.json` n'est écrit que par `certifier`, après certification
à l'œil sur la planche (`npm run jianpu:audit -- --systemes <slug…>`, scripts/jianpu/LOOP.md). Une correction à la main
= éditer `scripts/jianpu/debug/sections-propose.json`, regarder la planche, certifier.

**Format** (proposition et fichier certifié identiques, par chant) : page et ligne comptées DEPUIS 1 (L1 de la planche).
    {"source": index[slug].source,
     "sections": [{"id": "chorus-3", "label": "副歌/Refrain", "page": int|null, "ligne": int|null, "anacrouse": bool}, …]}
dans l'ordre du .cho. `public/jianpu/sections.json` = {"version": 1, "chants": {slug: entrée, …}}.

**Contrôles de `propose`** (une ligne par chant : slug, puis `id→p.L` par section, puis les ⚠) : section null · section
sans accord · lignes non croissantes dans l'ordre du .cho (hors reprises).
**Contrôles de `certifier`** (refus) : chant sans lignes CERTIFIÉES dans systemes.json · source ≠ index.json · ids ou
libellés ≠ ceux du .cho · page/ligne inexistantes (ou un seul des deux null). Avertissement seulement : lignes non
croissantes.

Usage (depuis la racine du dépôt) :
    python3 scripts/jianpu/sections.py propose [slug…]     # tableau + debug/sections-propose.json
    python3 scripts/jianpu/sections.py certifier slug…     # copie la proposition dans public/jianpu/sections.json
    python3 scripts/jianpu/sections.py retirer slug…       # enlève un chant du fichier certifié
    python3 scripts/jianpu/sections.py etat                # certifiés / restants
"""

from __future__ import annotations

import difflib
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import systemes as sy  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
SONGS = os.path.join(HERE, "..", "..", "content", "songs")
SECTIONS = os.path.join(sy.IMAGES, "sections.json")
PROPOSE = os.path.join(sy.DEBUG, "sections-propose.json")
SYSTEMES_PROPOSE = sy.PROPOSE

VERSION = 1
TOLERANCE = 0.008  # part de la largeur : un accord est « après » une barre s'il commence à moins de ce retrait avant elle
BORD_DROIT = 0.04  # la barre du bord droit est la dernière de la ligne, à cette part de la largeur près du bord des autres lignes
PREFIXE = 6  # nombre d'accords d'ouverture comparés entre deux sections du même type
PROPRE = 0.85  # une section identique à une autre, placée avec moins que cette ressemblance, est signalée
REPRISE_GRAVEE = 0.75  # rappel minimal pour qu'une section répétée à l'identique soit tenue pour gravée à part
FAIBLE = 0.4  # en dessous de cette ressemblance (Dice), l'appariement d'une section est signalé

NOTES = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def semitons(nom: str) -> int | None:
    m = re.match(r"^([A-G])([#b♯♭]*)", nom.strip())
    if not m:
        return None
    n = NOTES[m.group(1)]
    for c in m.group(2):
        n += 1 if c in "#♯" else -1
    return n % 12


def relatif(accord: str, tonique: int | None) -> str:
    """Accord relatif à la tonalité : « 7:m7/4 » ; brut si la fondamentale n'est pas lisible."""
    a = accord.strip()
    haut, _, basse = a.partition("/")
    m = re.match(r"^([A-G][#b♯♭]*)(.*)$", haut)
    if tonique is None or not m:
        return a
    r = (semitons(m.group(1)) - tonique) % 12
    b = ""
    if basse:
        sb = semitons(basse)
        b = "/" + (str((sb - tonique) % 12) if sb is not None else basse)
    return f"{r}:{m.group(2)}{b}"


def lire_cho(slug: str) -> tuple[list[dict], str | None]:
    """Sections du .cho (id, label, type, accords bruts) et sa tonalité {key}."""
    chemin = os.path.join(SONGS, slug + ".cho")
    if not os.path.exists(chemin):
        sys.exit(f"{slug} : pas de content/songs/{slug}.cho")
    sections: list[dict] = []
    cle = None
    courante = None
    jianpu = False
    with open(chemin, encoding="utf-8") as f:
        for brut in f.read().split("\n"):
            t = brut.strip()
            if jianpu:
                jianpu = t != "{end_of_jianpu}"
                continue
            if t == "{start_of_jianpu}":
                jianpu = True
                continue
            if t.startswith("{") and t.endswith("}"):
                m = re.match(r"^\{(\w+)(?::\s*(.*?))?\s*\}$", t)
                if not m:
                    continue
                k, v = m.group(1), m.group(2) or ""
                if k == "key":
                    cle = v
                elif k.startswith("start_of_"):
                    typ = k[len("start_of_"):]
                    courante = {"id": f"{typ}-{len(sections) + 1}", "label": v, "type": typ, "accords": []}
                    sections.append(courante)
                elif k == "section_id":
                    # Même règle que le parseur : l'id gardé remplace `<type>-<n>` (le compteur, lui, avance).
                    if courante is not None and v.strip():
                        courante["id"] = v.strip()
                elif k.startswith("end_of_"):
                    courante = None
                continue
            if courante is not None:
                courante["accords"] += re.findall(r"\[([^\]]+)\]", brut)
    return sections, cle


def etiquettes(calque: dict | None, lignes: list[dict]) -> list[dict]:
    """Étiquettes d'accord de la page 1 dans l'ordre de lecture, chacune avec sa ligne (indice depuis 0) ou None."""
    if not calque:
        return []
    out = []
    for e in calque.get("labels", []):
        if not e.get("c"):
            continue
        cy = e["y"] + e["h"] / 2
        ligne = next((i for i, g in enumerate(lignes) if g["y0"] <= cy <= g["y1"]), None)
        out.append({"c": e["c"], "x": e["x"], "ligne": ligne, "y": e["y"]})
    # Lecture : ligne, puis x. Un label hors de toute ligne (⚠ de systemes.py) se range par sa hauteur.
    out.sort(key=lambda e: (e["ligne"] if e["ligne"] is not None else 10**6, e["x"] if e["ligne"] is not None else e["y"]))
    return out


def derniere_barre(g: dict, page: dict) -> int:
    """x de la dernière barre intérieure de la ligne : la barre du bord droit (celle des autres lignes de la page, à 4 %
    de la largeur près) n'en est pas une ; une ligne dont la barre du bord n'a pas été trouvée garde toutes ses barres."""
    bord = max((l["barres"][-1] for l in page["lignes"] if l["barres"]), default=0)
    barres = list(g["barres"])
    if barres and barres[-1] >= bord - BORD_DROIT * page["w"]:
        barres.pop()
    # Le texte d'un accord posé juste après la barre commence parfois quelques pixels avant elle.
    return (max(barres) - TOLERANCE * page["w"]) if barres else 0


def lignes_du_chant(slug: str, certifies: dict, proposes: dict) -> tuple[dict | None, bool]:
    if slug in certifies:
        return certifies[slug], True
    return proposes.get(slug), False


def lcs_prefixes(a: list[str], b: list[str]) -> list[int]:
    """lcs[k] = longueur de la plus longue sous-suite commune de a et de b[:k] (k = 0…len(b))."""
    ligne = [0] * (len(a) + 1)
    out = [0]
    for y in b:
        prec = 0
        for i, x in enumerate(a, 1):
            tmp = ligne[i]
            ligne[i] = prec + 1 if x == y else max(ligne[i], ligne[i - 1])
            prec = tmp
        out.append(ligne[len(a)])
    return out


def proposer_chant(slug: str, index: dict, calques: dict, lignes_entree: dict) -> tuple[dict, list[str]]:
    sections, cle = lire_cho(slug)
    pages = lignes_entree["pages"]
    ton_cho = semitons(cle) if cle else None
    calque = calques.get(slug)
    ton_scan = semitons(calque["printedKey"]) if calque and calque.get("printedKey") else None
    if ton_scan is None:
        ton_scan = ton_cho
    tous = etiquettes(calque, pages[0]["lignes"]) if pages else []
    labels = [e for e in tous if e["ligne"] is not None]
    m = len(pages[0]["lignes"]) if pages else 0
    par_ligne = [[k for k, e in enumerate(labels) if e["ligne"] == li] for li in range(m)]
    debut_ligne = [(par_ligne[li][0] if par_ligne[li] else None) for li in range(m)]
    # Premier label de la ligne li ou des suivantes, jusqu'à la fin de la page.
    def borne(li: int) -> int:
        return next((debut_ligne[j] for j in range(li, m) if debut_ligne[j] is not None), len(labels))

    toks_cho = [[relatif(c, ton_cho) for c in s_["accords"]] for s_ in sections]
    toks_scan = [relatif(e["c"], ton_scan) for e in labels]
    S = len(sections)

    # score[p][t][u] : ressemblance (Dice) de la section p, commençant ligne t, avec les labels des lignes t…u-1 (u > t) ou de la ligne t (u = t).
    def fenetre(t: int, u: int) -> tuple[int, int]:
        return borne(t), borne(u if u > t else t + 1)

    score: dict = {}
    rappel: dict = {}  # rappel[p, t, u] : part des accords de la section p retrouvée dans la fenêtre (t, u)
    for p in range(S):
        a = toks_cho[p]
        if not a:
            continue
        for t in range(m):
            d0 = borne(t)
            pref = lcs_prefixes(a, toks_scan[d0:])
            for u in range(t, m + 1):
                f0, f1 = fenetre(t, u)
                n = f1 - f0
                # Les étiquettes qui suivent le dernier accord apparié (interlude, reprise non gravée) ne comptent pas.
                n_eff = next((k for k in range(f1 - d0 + 1) if pref[k] == pref[f1 - d0]), n)
                score[p, t, u] = 2 * pref[f1 - d0] / (len(a) + n_eff) if n else 0.0
                rappel[p, t, u] = pref[f1 - d0] / len(a)

    # Sections qui peuvent ne pas être gravées : reprise d'une section plus haut (mêmes accords, ou mêmes premiers accords).
    reprise: dict[int, tuple[int, bool]] = {}
    for i in range(S):
        a = toks_cho[i]
        for j in range(i):
            if sections[j]["type"] != sections[i]["type"] or not a:
                continue
            k = min(PREFIXE, len(a), len(toks_cho[j]))
            if toks_cho[j] == a:
                reprise[i] = (j, True)
                break
            if k >= 3 and toks_cho[j][:k] == a[:k] and i not in reprise:
                reprise[i] = (j, False)
    SKIP_EXACT, SKIP_PREFIXE, SKIP_NULL, PARTAGE = 0.8, 0.55, 0.1, 0.2  # PARTAGE : retrait quand deux sections commencent sur la même ligne

    def valide(p: int, t: int, u: int) -> bool:
        # Une section que le .cho répète à l'identique n'est gravée à part que si presque tous ses accords s'y retrouvent
        # (sinon c'est un interlude aux accords voisins, et la section est une reprise).
        return not (p in reprise and reprise[p][1]) or rappel[p, t, u] >= REPRISE_GRAVEE

    def saut(i: int) -> float:
        return (SKIP_EXACT if reprise[i][1] else SKIP_PREFIXE) if i in reprise else SKIP_NULL if toks_cho[i] else 0.0

    # Programmation dynamique : états (q, u) = section q placée ligne u ; les sections sautées entre deux placées sont reprises ou null.
    meilleur: dict = {}
    for q in range(S):
        if not toks_cho[q]:
            continue
        for u in range(m):
            base = sum(saut(i) for i in range(q))
            best = (base, None)
            for p in range(q):
                for t in range(u + 1):
                    if (p, t) in meilleur and valide(p, t, u):
                        v = meilleur[p, t][0] + rappel[p, t, u] + 0.01 * score[p, t, u] - (PARTAGE if u == t else 0.0) + sum(saut(i) for i in range(p + 1, q))
                        if v > best[0] + 1e-9:
                            best = (v, (p, t))
            meilleur[q, u] = (best[0], best[1], q)
    fin, etat = -1.0, None
    base_vide = sum(saut(i) for i in range(S))
    fin, etat = base_vide, None
    for (q, u), (v, _, _) in meilleur.items():
        if not valide(q, u, m):
            continue
        total = v + rappel[q, u, m] + 0.01 * score[q, u, m] + sum(saut(i) for i in range(q + 1, S))
        if total > fin + 1e-9:
            fin, etat = total, (q, u)
    placees: dict[int, int] = {}
    ordre = []
    while etat is not None:
        placees[etat[0]] = etat[1]
        ordre.append(etat)
        etat = meilleur[etat][1]
    ordre.reverse()
    fin_fenetre = {q: (ordre[k + 1][1] if k + 1 < len(ordre) else m) for k, (q, _) in enumerate(ordre)}

    avertissements: list[str] = []
    sortie = []
    for i, s_ in enumerate(sections):
        entree = {"id": s_["id"], "label": s_["label"], "page": None, "ligne": None, "anacrouse": False}
        sortie.append(entree)
        if not s_["accords"]:
            avertissements.append(f"{s_['id']} sans accord, à placer à la main")
            continue
        if i not in placees:
            if i in reprise:
                j, exacte = reprise[i]
                modele = sortie[j]
                entree.update(page=modele["page"], ligne=modele["ligne"], anacrouse=modele["anacrouse"])
                if modele["ligne"] is None:
                    avertissements.append(f"{s_['id']} reprend {sections[j]['id']}, lui-même à placer à la main")
                elif not exacte:
                    avertissements.append(f"{s_['id']} commence comme {sections[j]['id']} : mis sur sa ligne, gravure séparée possible")
            else:
                avertissements.append(f"{s_['id']} non gravée ou accords non appariés, à placer à la main")
            continue
        t = placees[i]
        u = fin_fenetre[i]
        dice = score[i, t, u]
        if i in reprise and dice < PROPRE and not (i in reprise and reprise[i][1] is False):
            avertissements.append(f"{s_['id']} a les accords de {sections[reprise[i][0]]['id']} mais est placée p.1 L{t + 1} ({dice:.0%}) : gravée à part ou reprise ?")
        if dice < FAIBLE:
            avertissements.append(f"{s_['id']} p.1 L{t + 1} : appariement faible ({dice:.0%}), à vérifier")
        # Premier accord de la section : le premier label de la ligne t s'il porte l'accord, sinon le premier qui le porte (suivi du 2e accord de la section, sinon le premier du même nom, sinon le premier de la ligne), ou,
        # en anacrouse, le dernier label de la ligne t-1 quand la suite de la section continue sur la ligne t.
        a0 = toks_cho[i][0]
        a1 = toks_cho[i][1] if len(toks_cho[i]) > 1 else None
        L = par_ligne[t]
        est = L[0] if L and toks_scan[L[0]] == a0 else next((k for k in L if toks_scan[k] == a0 and (a1 is None or k + 1 >= len(toks_scan) or toks_scan[k + 1] == a1)), None)
        if est is None:
            est = next((k for k in L if toks_scan[k] == a0), L[0] if L else None)
        g = pages[0]["lignes"][t]
        li, page, ana = t, 0, False
        debut_identique = bool(L) and toks_scan[L[0]] == a0 and a1 is not None and len(L) > 1 and toks_scan[L[1]] == a1
        if t > 0 and par_ligne[t - 1] and not debut_identique:
            # Anacrouse déjà gravée au bout de la ligne t-1 : les labels de sa dernière mesure (ou les derniers d'entre eux)
            # sont les premiers accords de la section, et la suite de la section reprend en tête de la ligne t.
            gp = pages[0]["lignes"][t - 1]
            fin_mesure = [k for k in par_ligne[t - 1] if labels[k]["x"] > derniere_barre(gp, pages[0])]
            for c in range(len(fin_mesure)):
                fin_c = fin_mesure[c:]
                n_c = len(fin_c)
                reste = toks_cho[i][n_c] if len(toks_cho[i]) > n_c else None
                if toks_cho[i][:n_c] == [toks_scan[k] for k in fin_c] and (reste is None or not L or toks_scan[L[0]] == reste):
                    ana = True
                    break
        if not ana and est is not None and labels[est]["x"] > derniere_barre(g, pages[0]) and g["barres"]:
            if t + 1 < m:
                li, ana = t + 1, True
            elif len(pages) > 1 and pages[1]["lignes"]:
                li, page, ana = 0, 1, True
        entree.update(page=page + 1, ligne=li + 1, anacrouse=ana)
    return {"source": index[slug]["source"], "sections": sortie}, avertissements


def lire_json(chemin: str) -> dict:
    if not os.path.exists(chemin):
        return {}
    with open(chemin, encoding="utf-8") as f:
        return json.load(f)


def proposer(slugs: list[str]) -> dict:
    index, calques = sy.charger("index.json"), sy.charger("chords.json")
    slugs = slugs or sorted(index)
    for s in slugs:
        if s not in index:
            sys.exit(f"{s} : absent de index.json")
    certifies = sy.lire_certifie()
    proposes = lire_json(SYSTEMES_PROPOSE)
    manque = [s for s in slugs if s not in certifies and s not in proposes]
    if manque:
        sy.proposer(manque)
        proposes = lire_json(SYSTEMES_PROPOSE)
    out: dict = {}
    for slug in slugs:
        entree_lignes, certifie = lignes_du_chant(slug, certifies, proposes)
        sections, av = proposer_chant(slug, index, calques, entree_lignes)
        out[slug] = sections
        trajet = " ".join(
            f"{e['id']}→" + (f"p.{e['page']}L{e['ligne']}" + ("↑" if e["anacrouse"] else "") if e["ligne"] else "null") for e in sections["sections"]
        )
        print(f"{slug}\t{'lignes certifiées' if certifie else 'lignes proposées'}\t{trajet}" + "".join(f"\t⚠ {a}" for a in av))
    os.makedirs(sy.DEBUG, exist_ok=True)
    deja = lire_json(PROPOSE)
    deja.update(out)
    sy.ecrire(PROPOSE, deja, None)
    return out


def verifier(slug: str, entree: dict, index: dict, certifies_lignes: dict) -> tuple[list[str], list[str]]:
    """Erreurs (refus) et avertissements d'une entrée."""
    if slug not in index:
        return [f"{slug} absent de index.json"], []
    err, av = [], []
    if entree.get("source") != index[slug]["source"]:
        err.append(f"source {entree.get('source')!r} ≠ {index[slug]['source']!r}")
    if slug not in certifies_lignes:
        return err + ["lignes non certifiées dans systemes.json (python3 scripts/jianpu/systemes.py certifier)"], av
    pages = certifies_lignes[slug]["pages"]
    cho, _ = lire_cho(slug)
    liste = entree.get("sections", [])
    attendu = [(s["id"], s["label"]) for s in cho]
    obtenu = [(e.get("id"), e.get("label")) for e in liste]
    if attendu != obtenu:
        err.append(f"sections ≠ celles du .cho ({len(obtenu)} au lieu de {len(attendu)} ou id/libellé différents)")
        return err, av
    for e in liste:
        p, li = e.get("page"), e.get("ligne")
        if (p is None) != (li is None):
            err.append(f"{e['id']} : page et ligne vont ensemble (null ou non)")
        elif p is not None:
            if not isinstance(p, int) or not isinstance(li, int) or not 1 <= p <= len(pages) or not 1 <= li <= len(pages[p - 1]["lignes"]):
                err.append(f"{e['id']} : p.{p} L{li} n'existe pas")
        if not isinstance(e.get("anacrouse"), bool):
            err.append(f"{e['id']} : anacrouse doit être vrai ou faux")
    if not err:
        # Croissance hors répétitions (mêmes type et accords qu'une section plus haute).
        dernier = None
        for i, e in enumerate(liste):
            if e["page"] is None:
                continue
            repete = bool(cho[i]["accords"]) and any(cho[j]["type"] == cho[i]["type"] and cho[j]["accords"] == cho[i]["accords"] for j in range(i))
            k = (e["page"], e["ligne"])
            if dernier is not None and k < dernier and not repete:
                av.append(f"{e['id']} p.{e['page']} L{e['ligne']} avant la section précédente")
            if not repete:
                dernier = max(dernier, k) if dernier else k
    return err, av


def lire_certifie() -> dict:
    return lire_json(SECTIONS).get("chants", {})


def certifier(slugs: list[str]) -> None:
    if not slugs:
        sys.exit("certifier : au moins un slug")
    index = sy.charger("index.json")
    propose = lire_json(PROPOSE)
    certifies = lire_certifie()
    lignes = sy.lire_certifie()
    for slug in slugs:
        if slug not in propose:
            proposer([slug])
            propose = lire_json(PROPOSE)
        err, av = verifier(slug, propose[slug], index, lignes)
        if err:
            sys.exit(f"{slug} refusé : " + " ; ".join(err))
        for a in av:
            print(f"{slug} ⚠ {a}")
        certifies[slug] = propose[slug]
        nulles = sum(1 for e in propose[slug]["sections"] if e["ligne"] is None)
        print(f"{slug} certifié : {len(propose[slug]['sections'])} sections" + (f", dont {nulles} non gravée(s)" if nulles else ""))
    sy.ecrire(SECTIONS, certifies, VERSION)


def retirer(slugs: list[str]) -> None:
    certifies = lire_certifie()
    retires = 0
    for slug in slugs:
        if certifies.pop(slug, None) is None:
            print(f"{slug} : pas certifié")
        else:
            print(f"{slug} retiré")
            retires += 1
    if retires:
        sy.ecrire(SECTIONS, certifies, VERSION)


def etat() -> None:
    index = sy.charger("index.json")
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
