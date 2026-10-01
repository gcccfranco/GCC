#!/usr/bin/env python3
"""Règles statiques d'un .cho, sans partition.

Pourquoi : check.py mesure le placement des accords contre la source ; tout
le reste (en-tête, thèmes, libellés canoniques, orthographe des accords,
espaceurs, espaces et ponctuation zh, pinyin, pronoms) se vérifie sur le
fichier seul, et doit l'être avant `npm run validate`, qui ne lit que le
strict nécessaire au site. Les tables viennent de docs/chants/01-format-cho.md
via _cho.py.

Usage (depuis GCCLouange/) :
    python3 scripts/cho/lint.py <slug>            # un chant
    python3 scripts/cho/lint.py --all             # tout le corpus + tableau code → nombre
    python3 scripts/cho/lint.py <slug> --json

Sortie : `content/songs/<slug>.cho:<ligne>: <code> <message>` ; E = bloquant,
W = avertissement. Code de retour 0 si aucun E.
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import re
import sys

def _load_cho():
    """Charge _cho.py par chemin après avoir retiré scripts/cho/ de sys.path :
    `inspect.py` y masquerait le module standard `inspect` (pymupdf, PIL)."""
    import importlib.util
    here = os.path.dirname(os.path.abspath(__file__))
    sys.path[:] = [p for p in sys.path if os.path.abspath(p or os.getcwd()) != here]
    spec = importlib.util.spec_from_file_location("_cho", os.path.join(here, "_cho.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_cho = _load_cho()

CANONICAL_DIRECTIVES = {d for d, _, _, _ in _cho.SECTIONS.values()} | {"start_of_tag"}


class Lint:
    def __init__(self, path):
        self.path = path
        self.out = []
        self.cho = _cho.read_cho(path)
        self.lang = self.cho["language"]

    def add(self, lineno, code, msg):
        self.out.append(dict(file=_cho.rel(self.path), line=lineno, code=code,
                             level=code[0], message=msg))

    # ---- en-tête
    def header(self):
        meta, ml = self.cho["meta"], self.cho["meta_lines"]
        if not meta.get("title"):
            self.add(ml.get("title", 1), "E01", "{title} absent ou vide")
        key = meta.get("key", "")
        if not _cho.KEY_RE.match(key):
            self.add(ml.get("key", 1), "E02", f"{{key}} absente ou invalide « {key} »")
        if meta.get("language") not in ("fr", "zh"):
            self.add(ml.get("language", 1), "E03", f"{{language}} absente ou invalide « {meta.get('language', '')} » (fr|zh)")
        if self.lang == "zh" and not meta.get("title_pinyin"):
            self.add(ml.get("title", 1), "E04", "{title_pinyin} absent (chant zh)")
        if not meta.get("source"):
            self.add(ml.get("title", 1), "W05", "{source} absent : check.py aura besoin de --source")
        if not (meta.get("themes") or "").strip():
            self.add(ml.get("themes", ml.get("title", 1)), "E24", "{themes} absent ou vide : 1 à 3 name_fr de content/themes.json")
        else:
            known = set(_cho.themes_fr())
            for t in [x.strip() for x in meta["themes"].split(",") if x.strip()]:
                if t not in known:
                    self.add(ml["themes"], "E06", f"thème « {t} » absent de content/themes.json (name_fr)")
        if "youtube" in meta and not (meta.get("youtube") or "").strip():
            self.add(ml.get("youtube", 1), "W25", "{youtube} vide : retirer la ligne (une valeur inconnue s'omet)")
        for key in ("jianpu", "start_of_jianpu"):
            for it in self.cho["items"]:
                if it["kind"] == "directive" and it["key"] == key:
                    self.add(it["lineno"], "W20", f"{{{key}}} obsolète (la 简谱 est une image + calque)")

    # ---- sections
    def section_label(self, it):
        """Libellé = base [N] côté fr, `zh [N]/fr [N]` côté zh, puis au plus UN
        suffixe entre parenthèses en fin de libellé (règle du parseur du site) :
        `Refrain (x2)`, `副歌/Refrain (D.S.)` ; jamais `副歌 (A调)/Refrain final (A)`."""
        d, label = it["directive"], it["label"]
        if d not in CANONICAL_DIRECTIVES:
            self.add(it["lineno"], "E07", f"directive {{{d}}} interdite (canoniques : "
                     + ", ".join(sorted(CANONICAL_DIRECTIVES)) + ")")
            return
        types = [t for t, (dd, _, _, _) in _cho.SECTIONS.items() if dd == d]
        m = re.match(r"^(.*?)(?: \(([^()]+)\))?$", label.strip())
        main = m.group(1) if m else label
        expected, ok = [], False
        for t in types:
            _, fr, zh, zhfr = _cho.SECTIONS[t]
            if self.lang == "zh" and zh:
                expected.append(f"{zh} N/{zhfr} N (suffixe)")
                parts = main.split("/")
                if len(parts) == 2:
                    a, b = self.part(parts[0], zh), self.part(parts[1], zhfr)
                    if a is not None and b is not None and a == b:
                        ok = True
            else:
                expected.append(f"{fr} N (suffixe)")
                if self.part(main, fr) is not None:
                    ok = True
        if not ok:
            self.add(it["lineno"], "E08", f"libellé « {label} » non canonique (attendu « "
                     + " » ou « ".join(expected) + " » : numéro seulement s'il y en a plusieurs, "
                     "un seul suffixe entre parenthèses, en fin de libellé)")

    @staticmethod
    def part(text, base):
        """Numéro ('' si aucun) si `text` = base [N], sinon None."""
        m = re.match(r"^" + re.escape(base) + r"(?: (\d+))?$", text.strip())
        return None if not m else (m.group(1) or "")

    # ---- accords et lignes
    def line(self, it):
        n, raw = it["lineno"], it["raw"]
        if raw != raw.rstrip():
            self.add(n, "W21", "espace en fin de ligne")
        section = it["section"]
        instrumental = _cho.section_is_instrumental(section)
        names = []
        for c in it["chords"]:
            if c["spacer"]:
                if it["kind"] == "sung":
                    self.add(n, "E13", "espaceur `[ ]` dans une ligne chantée : écrire `[X] syllabe` (crochet + espace)")
                elif not instrumental:
                    self.add(n, "E12", "espaceur `[ ]` hors d'une section sans paroles")
                continue
            r = _cho.normalize_chord(c["name"])
            names.append(r["canon"])
            if not r["valid"]:
                self.add(n, "E09", f"accord « {c['name']} » invalide : {r['reason']}")
            elif r["changed"]:
                self.add(n, "W11", f"accord « {c['name']} » → orthographe canonique « {r['canon']} »")
        if it["kind"] == "instr":
            body = it["lyric"].strip()
            if len(it["chords"]) > 1 and not it["chords"][0]["spacer"] and not re.match(r"^(\[[^\]]*\]  )*\[[^\]]*\]$", body):
                self.add(n, "W22", "ligne instrumentale : séparer les accords par deux espaces (`[G]  [Em]`)")
            return
        if self.lang == "zh":
            self.zh_line(it)

    def zh_line(self, it):
        n, lyric, text = it["lineno"], it["lyric"], it["text"]
        if re.search(r"[祢祂]", text):
            self.add(n, "E19", "pronom 祢/祂 : écrire 你/他")
        if _cho.HALFWIDTH_PUNCT.search(text):
            self.add(n, "E15", "ponctuation demi-chasse dans les paroles zh : écrire ，。！？；：")
        stripped = re.sub(r"\[[^\]]*\] ?", "", lyric).rstrip()
        if " " in stripped or "　" in stripped:
            self.add(n, "E14", "espace dans les paroles zh (seul le séparateur pinyin, 3 espaces, est permis ; `[X] ` pour un accord avant l'attaque)")
        hanzi = _cho.hanzi_only(text)
        if not hanzi:
            return
        if not it["pinyin"]:
            self.add(n, "E16", "pinyin absent (attendu sur la même ligne après 3 espaces)")
            return
        if it.get("pinyin_next"):
            self.add(it["pinyin_lineno"], "W18", "pinyin sur la ligne suivante : le format canonique est `hanzi   pinyin` sur la même ligne")
        elif it["pinyin_sep"] < 3:
            self.add(n, "W18", f"séparateur pinyin de {it['pinyin_sep']} espaces (3 attendus)")
        groups = it["pinyin"].split()
        if len(groups) != len(hanzi):
            self.add(n, "E17", f"pinyin : {len(groups)} groupes pour {len(hanzi)} hanzi")

    def run(self):
        self.header()
        # Une ligne `#` dans une section est rendue comme une parole par le
        # parseur du site (il n'ignore les `#` qu'en dehors des sections) :
        # le doute s'écrit en directive {needs_review: …}, ignorée partout.
        inside = False
        for it in self.cho["items"]:
            if it["kind"] == "header":
                inside = True
                self.section_label(it)
            elif it["kind"] == "end":
                inside = False
            elif it["kind"] == "comment" and inside:
                self.add(it["lineno"], "E23", "ligne `#` dans une section : le site l'affiche comme une parole ; écrire {needs_review: …}")
            elif it["kind"] in ("sung", "instr"):
                self.line(it)
        return self.out


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("slug", nargs="?", help="slug (content/songs/<slug>.cho) ou chemin d'un .cho")
    ap.add_argument("--all", action="store_true", help="tout le corpus, puis tableau code → nombre")
    ap.add_argument("--json", action="store_true", help="sortie JSON")
    ap.add_argument("-q", "--quiet", action="store_true", help="avec --all : seulement le tableau")
    args = ap.parse_args(argv)
    if not args.slug and not args.all:
        ap.error("donner un slug ou --all")
    paths = sorted(glob.glob(os.path.join(_cho.SONGS, "*.cho"))) if args.all else [_cho.song_path(args.slug)]
    results, counts, files = [], {}, 0
    for path in paths:
        if not os.path.exists(path):
            print(f"{_cho.rel(path)}: fichier introuvable", file=sys.stderr)
            return 2
        if os.path.basename(path).startswith("_"):
            continue
        files += 1
        out = Lint(path).run()
        results.extend(out)
        for r in out:
            counts[r["code"]] = counts.get(r["code"], 0) + 1
    errors = sum(1 for r in results if r["level"] == "E")
    if args.json:
        print(json.dumps(dict(files=files, results=results, counts=counts, errors=errors), ensure_ascii=False, indent=1))
    else:
        if not args.quiet:
            for r in results:
                print(f"{r['file']}:{r['line']}: {r['code']} {r['message']}")
        if args.all or not results:
            print(f"\n{files} fichier(s) · {len(results)} signalement(s) · {errors} E")
            for code in sorted(counts):
                print(f"  {code}  {counts[code]:5d}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
