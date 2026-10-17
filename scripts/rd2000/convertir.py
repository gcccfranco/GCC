"""Sons du RD-2000 (docs/spec-sons-rd2000.md, tranche S0) : classeur → public/rd2000.json.

Le classeur de Timothée reste la source ; ce script le convertit, à la main et
hors build, en un JSON commité (une ligne par son, moment, recette, fiche,
paramètre : un changement du classeur se relit dans le diff).

Usage (depuis la racine du dépôt) :
    python3 scripts/rd2000/convertir.py [classeur.xlsx] [sortie.json]
Par défaut : « ../RD2000 Catalogue Sons — corrigé.xlsx » → public/rd2000.json.

Bibliothèque standard seulement : le classeur écrit ses textes dans les
cellules (pas de table partagée), zipfile + xml.etree suffisent.
Si un contrôle échoue, rien n'est écrit et le script sort en erreur.
"""
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

RACINE = Path(__file__).resolve().parents[2]
CLASSEUR = RACINE.parent / "RD2000 Catalogue Sons — corrigé.xlsx"
SORTIE = RACINE / "public" / "rd2000.json"

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
ETOILES = {"★★★": 3, "★★": 2, "★": 1, "—": 0}
# Lignes de l'onglet 5 qui ne parlent que du tableur (Q3 de la spec) : gardées, marquées.
SECTIONS_TABLEUR = {"LES 5 ONGLETS", "MÉTHODE EN TROIS TEMPS"}

erreurs = []


def verifier(cond, message):
    if not cond:
        erreurs.append(message)


def texte(el):
    return "".join(t.text or "" for t in el.iter("{%s}t" % NS["m"]))


def lire(chemin):
    """Les cinq onglets, chacun en {numéro de ligne: {colonne: valeur}}."""
    z = zipfile.ZipFile(chemin)
    partages = []
    if "xl/sharedStrings.xml" in z.namelist():
        partages = [texte(si) for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS)]
    cibles = {r.get("Id"): r.get("Target") for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))}
    onglets = []
    for feuille in ET.fromstring(z.read("xl/workbook.xml")).find("m:sheets", NS):
        cible = cibles[feuille.get(REL)].lstrip("/")
        cible = cible if cible.startswith("xl/") else "xl/" + cible
        lignes = {}
        for row in ET.fromstring(z.read(cible)).find("m:sheetData", NS):
            cellules = {}
            for c in row.findall("m:c", NS):
                col = re.match(r"[A-Z]+", c.get("r")).group(0)
                v = c.find("m:v", NS)
                if c.get("t") == "inlineStr":
                    val = texte(c.find("m:is", NS)) if c.find("m:is", NS) is not None else ""
                elif c.get("t") == "s":
                    val = partages[int(v.text)] if v is not None else ""
                elif v is not None and v.text is not None:
                    val = int(v.text) if re.fullmatch(r"-?\d+", v.text) else float(v.text)
                else:
                    val = ""
                if val != "":
                    cellules[col] = val
            lignes[int(row.get("r"))] = cellules
        onglets.append(lignes)
    return onglets


def seule_a(cellules):
    return set(cellules) == {"A"}


def txt(v):
    return None if v is None else str(v).strip()


def convertir(chemin):
    f1, f2, f3, f4, f5 = lire(chemin)

    # 1 - Tous les sons
    sons = []
    for r, c in sorted(f1.items()):
        if r < 5:
            continue
        verifier(len(c) == 10, f"onglet 1, ligne {r} : {10 - len(c)} cellule(s) vide(s)")
        verifier(c.get("E") in ETOILES, f"onglet 1, ligne {r} : note inconnue {c.get('E')!r}")
        # « ★ » en tête du commentaire : le premier choix de sa famille (décision
        # de Timothée du 02/10/2026). L'app l'affiche en badge, pas en étoile qui
        # se confondrait avec la note.
        commentaire = txt(c.get("F"))
        premier = commentaire.startswith("★")
        sons.append({
            "n": txt(c.get("A")), "nom": txt(c.get("B")),
            "categorie": txt(c.get("C")), "sousCategorie": txt(c.get("D")),
            "louange": ETOILES.get(c.get("E"), -1),
            "commentaire": commentaire.lstrip("★ ") if premier else commentaire,
            "edition": txt(c.get("G")), "msb": c.get("H"), "lsb": c.get("I"), "pc": c.get("J"),
            **({"premier": True} if premier else {}),
        })
    par_n = {s["n"]: s for s in sons}
    verifier(len(par_n) == len(sons), "onglet 1 : N° en double")

    def cite(n, nom, ou):
        verifier(n in par_n and par_n[n]["nom"] == nom, f"{ou} : {n} {nom} absent de l'onglet 1")

    # 2 - Guide par moment
    moments, regle, groupe = [], None, None
    for r, c in sorted(f2.items()):
        if r < 5:
            continue
        if seule_a(c):
            if c["A"].startswith("Règle"):
                regle = c["A"]
            else:
                groupe = c["A"]
            continue
        son, layer = txt(c.get("C")), txt(c.get("E"))
        sans_layer = layer in (None, "—")
        m = {"groupe": groupe, "moment": txt(c.get("A")), "son": son, "sonNom": txt(c.get("B")),
             "layer": None if sans_layer else layer, "layerNom": None if sans_layer else txt(c.get("D")),
             "conseil": txt(c.get("F"))}
        cite(m["son"], m["sonNom"], f"onglet 2, « {m['moment']} »")
        if m["layer"]:
            cite(m["layer"], m["layerNom"], f"onglet 2, « {m['moment']} » (layer)")
        moments.append(m)
    verifier(regle is not None, "onglet 2 : règle générale introuvable")

    # 3 - Réglages par son : recettes R1–R7, puis une fiche par son ★★★
    blocs = {}
    for r, c in sorted(f3.items()):
        if r < 5 or seule_a(c):
            continue
        n = txt(c.get("A"))
        if n not in blocs:
            verifier(c.get("D") == "◆ INTENTION", f"onglet 3, {n} : la première ligne n'est pas « ◆ INTENTION »")
            blocs[n] = {"n": n, "nom": txt(c.get("B")), "intention": txt(c.get("E")), "pourquoi": txt(c.get("F")),
                        "reglages": []}
        else:
            reglage = {"ecran": txt(c.get("C")), "parametre": txt(c.get("D")), "valeur": txt(c.get("E"))}
            if c.get("F"):
                reglage["pourquoi"] = txt(c.get("F"))
            blocs[n]["reglages"].append(reglage)
    recettes, fiches = [], []
    for n, b in blocs.items():
        if re.fullmatch(r"R\d", n):
            # L'intention d'une recette cite ses sons d'exemple : « S01 Stage Grand · 0005 Comp ConcertGrd ».
            b["exemples"] = []
            for morceau in b["intention"].split(" · "):
                m = re.fullmatch(r"(S\d{2}|\d{4}) (.+)", morceau.strip())
                verifier(m is not None, f"onglet 3, {n} : exemple illisible « {morceau} »")
                if m:
                    cite(m.group(1), m.group(2), f"onglet 3, {n}")
                    b["exemples"].append(m.group(1))
            recettes.append({k: b[k] for k in ("n", "nom", "intention", "pourquoi", "exemples", "reglages")})
        else:
            verifier(n in par_n and par_n[n]["louange"] == 3 and par_n[n]["nom"] == b["nom"],
                     f"onglet 3, fiche {n} : son absent de l'onglet 1 ou pas ★★★")
            fiches.append({k: b[k] for k in ("n", "intention", "pourquoi", "reglages")})
    verifier({f["n"] for f in fiches} == {s["n"] for s in sons if s["louange"] == 3},
             "onglet 3 : les fiches ne couvrent pas exactement les sons ★★★")

    # 4 - Paramètres
    parametres, partie, groupe = [], None, None
    for r, c in sorted(f4.items()):
        if r < 5:
            continue
        if seule_a(c):
            if c["A"].startswith("▬"):
                partie, groupe = c["A"].lstrip("▬ ").strip(), None
            else:
                groupe = c["A"]
            continue
        verifier(c.get("E") in ("★", "★★", "★★★"), f"onglet 4, ligne {r} : priorité {c.get('E')!r}")
        parametres.append({"partie": partie, "groupe": groupe, "nom": txt(c.get("A")), "plage": txt(c.get("B")),
                           "effet": txt(c.get("C")), "conseil": txt(c.get("D")), "priorite": len(c.get("E", ""))})

    # 5 - Légende & méthode
    legende, section = [], None
    for r, c in sorted(f5.items()):
        if r < 5:
            continue
        if seule_a(c):
            section = c["A"]
            continue
        t = txt(c.get("B"))
        legende.append({"section": section, "element": txt(c.get("A")), "texte": t,
                        "tableur": section in SECTIONS_TABLEUR or "filtre la colonne" in (t or "").lower()})

    return {"source": Path(chemin).name, "sons": sons, "moments": moments, "regleMoments": regle,
            "recettes": recettes, "fiches": fiches, "parametres": parametres, "legende": legende}


def ecrire(data, chemin):
    """Une ligne par enregistrement, pour des diffs lisibles."""
    def ligne(o):
        return json.dumps(o, ensure_ascii=False, separators=(", ", ": "))
    morceaux = []
    for cle, v in data.items():
        if isinstance(v, list):
            morceaux.append(f' "{cle}": [\n' + ",\n".join("  " + ligne(o) for o in v) + "\n ]")
        else:
            morceaux.append(f' "{cle}": {ligne(v)}')
    contenu = "{\n" + ",\n".join(morceaux) + "\n}\n"
    assert json.loads(contenu) == data
    Path(chemin).write_text(contenu, encoding="utf-8")


def main():
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else CLASSEUR
    sortie = Path(sys.argv[2]) if len(sys.argv) > 2 else SORTIE
    data = convertir(source)
    if erreurs:
        print("\n".join(erreurs), file=sys.stderr)
        print(f"✗ {len(erreurs)} erreur(s) : {sortie} n'est pas écrit.", file=sys.stderr)
        sys.exit(1)
    ecrire(data, sortie)
    notes = [sum(1 for s in data["sons"] if s["louange"] == k) for k in (3, 2, 1, 0)]
    print(f"✓ {len(data['sons'])} sons (★★★ {notes[0]} · ★★ {notes[1]} · ★ {notes[2]} · — {notes[3]}), "
          f"{len(data['moments'])} moments, {len(data['recettes'])} recettes, {len(data['fiches'])} fiches, "
          f"{len(data['parametres'])} paramètres, {len(data['legende'])} lignes de légende → {sortie}")


if __name__ == "__main__":
    main()
