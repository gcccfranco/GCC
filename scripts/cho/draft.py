#!/usr/bin/env python3
"""Brouillon .cho depuis une partition à couche texte (voie texte seulement).

Pourquoi : pour un PDF de l'église (FPDF), de shir.fr ou un export Finale
(赞美之泉), la position de chaque accord se lit dans la couche texte — la
même lecture que check.py. Autant écrire le brouillon à partir de cette
mesure plutôt qu'à l'œil : chaque accord sort devant le caractère exact
mesuré (fr : le caractère sous le label ; zh : devant le hanzi), les
sections aux libellés canoniques, le pinyin généré, et tout accord « en
l'air » (sans note ni caractère sous le label) signalé par un commentaire
`{needs_review: …}` au-dessus de la ligne (une ligne `#` dans une section
serait rendue comme une parole par le site). Ce n'est qu'un brouillon : l'en-tête
se complète, le rapport de check.py se lit.

Usage (depuis GCCLouange/) :
    python3 scripts/cho/draft.py "../Partitions/Abba Père.pdf" > /tmp/abba.cho
    python3 scripts/cho/draft.py "../Partitions/荣耀的呼召.pdf" --lang zh --key F --slug 荣耀的呼召

Une image ou un scan → message et code 2 (pas de voie texte).
"""
from __future__ import annotations

import argparse
import os
import re
import sys


def _load(name):
    import importlib.util
    here = os.path.dirname(os.path.abspath(__file__))
    sys.path[:] = [p for p in sys.path if os.path.abspath(p or os.getcwd()) != here]
    spec = importlib.util.spec_from_file_location("_" + name, os.path.join(here, name + ".py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_cho = _load("_cho")
_ins = _load("inspect")

SMALL_WORDS = {"de", "la", "le", "les", "du", "des", "et", "à", "en", "un", "une", "pour", "sur", "au", "aux", "ou", "ni", "se", "sa", "son", "ses", "ma", "mon", "mes", "ta", "ton", "tes", "que", "qui", "ce", "cette", "d'", "l'", "n'", "qu'"}


def title_case(t: str) -> str:
    """« ABBA PÈRE » → « Abba Père » (les FPDF gravent le titre en capitales)."""
    if t != t.upper():
        return t
    words = t.lower().split()
    out = []
    for k, w in enumerate(words):
        out.append(w if (k and w in SMALL_WORDS) else w[:1].upper() + w[1:])
    return " ".join(out)


def slugify(title: str) -> str:
    import unicodedata
    s = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode()
    s = re.sub(r"[^A-Za-z0-9]+", "-", s).strip("-").lower()
    return s


def review(note):
    """Doute écrit : directive ignorée par le parseur du site, jamais rendue.
    Un `}` dans le texte fermerait la directive trop tôt."""
    return "{needs_review: " + str(note).replace("}", ")") + "}"


def header(meta, lang, key, source):
    lines = [f"{{title: {meta.get('title', '')}}}"]
    if lang == "zh":
        lines.append(f"{{title_pinyin: {meta.get('title_pinyin', '')}}}")
    if meta.get("artist"):
        lines.append(f"{{artist: {meta['artist']}}}")
    lines.append(f"{{key: {key or meta.get('key', '')}}}")
    if meta.get("tempo"):
        lines.append(f"{{tempo: {meta['tempo']}}}")
    lines.append(f"{{language: {lang}}}")
    lines.append("{themes: }")
    lines.append("{needs_review: choisir 1 à 3 thèmes de content/themes.json (name_fr)}")
    lines.append(f"{{source: {os.path.basename(source)}}}")
    if not (key or meta.get("key")):
        lines.append("{needs_review: tonalité non lue dans la partition (--key)}")
    return lines


def section_lines(kind, number, lang, suffix=""):
    """Directive et libellé canoniques (docs/chants/01-format-cho.md)."""
    directive, fr, zh, zhfr = _cho.SECTIONS[kind]
    n = f" {number}" if number else ""
    if lang == "zh" and zh:
        label = f"{zh}{n}/{zhfr}{n}"
    else:
        label = f"{fr}{n}"
    if suffix:
        label += f" ({suffix})"
    end = directive.replace("start_of_", "end_of_")
    return f"{{{directive}: {label}}}", f"{{{end}}}"


# --------------------------------------------------------------------------- fr
def place_fr(text, chords):
    """Ligne ChordPro : chaque accord devant le caractère exact de la partition ;
    sur un espace ou après le texte : tel quel (`vie[C] Te`, `,[E]`)."""
    text = text.rstrip()
    body = text.lstrip()
    lead = len(text) - len(body)
    # blancs de plusieurs espaces (espaceur du transcripteur) : ramenés à un, signalés
    notes = []
    for m in re.finditer(r"  +", body):
        after = body[m.end():].split()
        notes.append(f"blanc de {len(m.group())} espaces avant « {after[0] if after else ''} » dans la source (ramené à un)")
    squeeze = {}
    out_body, k = "", 0
    for i, ch in enumerate(body):
        if ch == " " and out_body.endswith(" "):
            squeeze[i] = len(out_body) - 1
            continue
        squeeze[i] = len(out_body)
        out_body += ch
    squeeze[len(body)] = len(out_body)
    body = out_body
    words = [(m.start(), m.end()) for m in re.finditer(r"\S+", body)]
    inserts = []
    for c in sorted(chords, key=lambda c: c["idx"]):
        idx = squeeze.get(max(0, c["idx"] - lead), len(body)) if c["idx"] - lead >= 0 else -1
        if idx >= len(body):
            inserts.append((len(body), c["name"], ""))
            continue
        if idx < 0 or body[idx].isspace():
            # `[X] mot` : accord avant l'attaque (forme canonique, rien à vérifier en tête
            # de ligne) ; au milieu d'un vers, on le dit
            inserts.append((max(0, idx), c["name"], " " if idx <= 0 else ""))
            if idx > 0:
                notes.append(f"{c['name']} x={c['x']:.1f} sur un espace entre « {body[:idx].split()[-1] if body[:idx].split() else ''} » et « {body[idx:].split()[0] if body[idx:].split() else ''} »")
            continue
        w = next(((a, b) for a, b in words if a <= idx < b), None)
        if w is None:
            inserts.append((idx, c["name"], ""))
            continue
        # Position de la partition, au caractère près (décision du 26/09/2026 :
        # pas de remontée au début de la syllabe).
        inserts.append((idx, c["name"], ""))
    out, pos = "", 0
    for at, name, after in sorted(inserts, key=lambda t: t[0]):
        out += body[pos:at] + f"[{name}]" + after
        pos = at
    out += body[pos:]
    out = re.sub(r"\]  +", "] ", out)
    return out, notes


def draft_fr(ex, meta, key, source):
    items = ex["items"]
    out = header(dict(meta, title=title_case(meta.get("title", ""))), "fr", key, source)
    out.append("")
    counts = {}
    section = None
    seen_sung = False

    def open_section(kind, suffix=""):
        nonlocal section
        if section:
            out.append(section[1])
            out.append("")
        counts[kind] = counts.get(kind, 0) + 1
        number = ""
        if kind in ("couplet",) or (kind in ("refrain", "pont", "pre-refrain") and counts[kind] > 1):
            number = str(counts[kind])
        section = section_lines(kind, number, "fr", suffix)
        out.append(section[0])

    pending_repeat = ""
    for k, it in enumerate(items):
        if it["kind"] == "header":
            w = it["text"].split()
            kind = {"couplet": "couplet", "refrain": "refrain", "pont": "pont", "intro": "intro", "interlude": "interlude",
                    "final": "final", "coda": "final", "pré-refrain": "pre-refrain", "pre-chorus": "pre-refrain", "tag": "tag"}.get(w[0].lower().strip(":"), "couplet")
            m = re.search(r"\((x\s*\d+)\)", it["text"])
            open_section(kind, m.group(1).replace(" ", "") if m else "")
        elif it["kind"] == "repeat":
            if section:
                lab = out[-1] if out[-1].startswith("{start_of_") else None
                # (x2) sous la dernière ligne d'une section : suffixe du libellé
                for q in range(len(out) - 1, -1, -1):
                    if out[q].startswith("{start_of_") and "(" not in out[q]:
                        out[q] = out[q][:-1] + f" ({it['text'].strip('()').replace(' ', '').replace('×', 'x')})}}"
                        break
        elif it["kind"] == "blank":
            # ligne vide gravée entre deux moitiés d'une section : conservée
            nxt = next((x for x in items[k + 1:] if x["kind"] != "blank"), None)
            if section and out and out[-1] and not out[-1].startswith("{") and nxt and nxt["kind"] == "sung":
                out.append("")
        elif it["kind"] == "instr":
            open_section("intro" if not seen_sung else "interlude")
            out.append("  ".join(f"[{c['name']}]" for c in it["chords"]))
        elif it["kind"] == "sung":
            if section is None or (ex.get("bars") and it.get("in_bar") and "chorus" not in section[0]) \
                    or (ex.get("bars") and not it.get("in_bar") and section and "chorus" in section[0]):
                open_section("refrain" if it.get("in_bar") else "couplet")
            seen_sung = True
            line, notes = place_fr(it["text"], it["chords"])
            for n in notes:
                out.append(review(n))
            out.append(line)
    if section:
        out.append(section[1])
    return out


# --------------------------------------------------------------------------- zh
def draft_zh(ex, meta, key, source):
    title = _cho.to_simplified(meta.get("title", ""))
    py = _cho.pinyin_line(title)
    meta = dict(meta, title=title, title_pinyin=py[:1].upper() + py[1:])
    out = header(meta, "zh", key, source)
    out.append("")
    labels = ex["labels"]
    systems = ex["systems"]
    section = None
    counts = {}

    def open_section(kind):
        nonlocal section
        if section:
            out.append(section[1])
            out.append("")
        counts[kind] = counts.get(kind, 0) + 1
        number = str(counts[kind]) if counts[kind] > 1 else ""
        section = section_lines(kind, number, "zh")
        out.append(section[0])

    # un système = une ligne chantée ; les libellés (Intro/Verse/Chorus/Bridge)
    # ouvrent une section à leur x dans le système. La levée qui termine un
    # système (hanzi après la dernière ponctuation) passe au début de la ligne
    # suivante avec ses accords : « 将自 | 己献上… » → « 将自己献上… ».
    pieces = []
    for i, s in enumerate(systems):
        labs = sorted([l for l in labels if l["row"] == i], key=lambda l: l["x"])
        chars = s["lyric"]["chars"] if s["lyric"] else []
        hz = [(k, c) for k, c in enumerate(chars)]
        cuts = [l["x"] - 5 for l in labs]
        start_x = -1e9
        for q, cx in enumerate(cuts + [1e9]):
            pchars = [(k, c) for k, c in hz if start_x <= c["x0"] < cx]
            pchords = [m for m in s["chords"] if start_x <= m["x"] < cx]
            pieces.append(dict(chars=chars, pchars=pchars, pchords=pchords, lab=labs[q - 1] if q else None, sys=i))
            start_x = cx
    # report des levées (vers la prochaine pièce qui a des paroles)
    for q in range(len(pieces)):
        p = pieces[q]
        if not p["pchars"]:
            continue
        nxt = next((x for x in pieces[q + 1:] if x["pchars"]), None)
        if nxt is None:
            # levée finale (« To Chorus ») : retour non déplié, signalé
            last_punct = max((j for j, (k, c) in enumerate(p["pchars"]) if not _cho.has_hanzi(c["c"])), default=-1)
            tail = p["pchars"][last_punct + 1:]
            if tail and last_punct >= 0 and len(tail) <= 4:
                p["pchars"] = p["pchars"][: last_punct + 1]
                p["final_note"] = "levée « " + "".join(_cho.to_simplified(c["c"]) for _, c in tail) + " » en fin de partition (" + (", ".join(ex.get("hints", [])) or "retour") + ") : reprise non dépliée"
            continue
        # une levée passe dans la pièce qui porte le libellé suivant, s'il y en a un
        lab_between = next((x for x in pieces[q + 1:] if x is nxt or x["lab"]), None)
        if lab_between is not None and lab_between is not nxt and lab_between["lab"]:
            nxt = lab_between if lab_between["pchars"] else nxt
            nxt["lab"] = nxt["lab"] or lab_between["lab"]
            if lab_between is not nxt:
                lab_between["lab"] = None
        last_punct = max((j for j, (k, c) in enumerate(p["pchars"]) if not _cho.has_hanzi(c["c"])), default=-1)
        tail = p["pchars"][last_punct + 1:]
        if not tail or last_punct < 0 and not nxt["lab"]:
            continue
        if len(tail) > 4 or (last_punct < 0 and not nxt["lab"]):
            continue
        x_tail = tail[0][1]["x0"]
        moving = [m for m in p["pchords"] if m["x"] >= x_tail - 30 and (m.get("on_char") is None or m["on_char"] >= tail[0][0])]
        # un accord tenu sur la syllabe d'avant reste (2/3 de l'intervalle), sauf si
        # la levée ouvre une nouvelle section
        keep = []
        for m in moving:
            if m.get("on_char") is None and not nxt["lab"]:
                kp = m.get("prev_char")
                xp = p["chars"][kp]["x0"] if kp is not None else None
                if xp is not None and (m["x"] - xp) / max(1.0, x_tail - xp) <= 2 / 3:
                    keep.append(m)
        moving = [m for m in moving if m not in keep]
        p["pchars"] = p["pchars"][: last_punct + 1]
        p["pchords"] = [m for m in p["pchords"] if m not in moving]
        nxt["lead"] = dict(chars=p["chars"], pchars=tail, pchords=moving)
    for q, p in enumerate(pieces):
        lab = p["lab"]
        if lab:
            open_section(lab["kind"])
        pchars, pchords, lead = p["pchars"], p["pchords"], p.get("lead")
        if not pchars and not pchords and not lead:
            continue
        if section is None:
            open_section("intro" if not pchars else "couplet")
        if not pchars and not lead:
            out.append("  ".join(f"[{m['name']}]" for m in pchords))
            continue
        intro_run = [m for m in pchords if m.get("on_char") is None and m.get("prev_char") is None]
        if intro_run and "intro" in section[0] and len(intro_run) >= 2:
            out.append("  ".join(f"[{m['name']}]" for m in intro_run))
            pchords = [m for m in pchords if m not in intro_run]
        if not pchars and not pchords and lead and q == len(pieces) - 1:
            pass
        line, notes = place_zh(p["chars"], pchars, pchords, lead)
        if not line:
            continue
        for n in notes:
            out.append(review(n))
        out.append(line)
        if p.get("final_note"):
            out.append(review(p["final_note"]))
    last = pieces[-1] if pieces else None
    # levée finale sans ligne suivante (« To Chorus ») : signalée, pas écrite
    if last and last.get("lead") is None:
        pass
    if section:
        out.append(section[1])
    return out


def place_zh(chars, pchars, pchords, lead=None):
    """Ligne zh : accord devant son hanzi ; en l'air → après le hanzi précédent
    (avant la ponctuation) dans les 2/3 de l'intervalle, sinon `[X] ` devant le
    suivant. `lead` = levée reportée du système précédent (ses hanzi et accords
    ouvrent la ligne)."""
    segs = ([(lead["chars"], lead["pchars"], lead["pchords"])] if lead else []) + [(chars, pchars, pchords)]
    text, inserts, notes = "", [], []
    for sc, spc, spch in segs:
        base = len(text)
        idxs = [k for k, _ in spc]
        seg_text = _cho.fullwidth_punct("".join(_cho.to_simplified(c["c"]) for _, c in spc))
        for m in spch:
            if m.get("on_char") is not None and m["on_char"] in idxs:
                inserts.append((base + idxs.index(m["on_char"]), m["name"], ""))
                continue
            kp, kn = m.get("prev_char"), m.get("next_char")
            xp = sc[kp]["x0"] if kp is not None else None
            xn = sc[kn]["x0"] if kn is not None else None
            a = seg_text[idxs.index(kp)] if kp in idxs else "—"
            b = seg_text[idxs.index(kn)] if kn in idxs else (text[-1:] if kp is None and text else "—")
            notes.append(f"{m['name']} x={m['x']:.1f} entre « {a} » et « {b} »")
            if kp in idxs and xn is not None and (m["x"] - xp) / max(1.0, xn - xp) <= 2 / 3:
                inserts.append((base + idxs.index(kp) + 1, m["name"], ""))
            elif kn in idxs:
                inserts.append((base + idxs.index(kn), m["name"], " " if base + idxs.index(kn) > 0 or True else ""))
            elif kp in idxs:
                inserts.append((base + idxs.index(kp) + 1, m["name"], ""))
            else:
                inserts.append((base, m["name"], " "))
        text += seg_text
    if not text:
        return "", notes
    out, pos = "", 0
    for at, name, after in sorted(inserts, key=lambda t: t[0]):
        at = min(at, len(text))
        out += text[pos:at] + f"[{name}]" + after
        pos = at
    out += text[pos:]
    out = out.replace("祢", "你").replace("祂", "他")
    py = _cho.pinyin_line(text)
    return f"{out}   {py}", notes


# --------------------------------------------------------------------------- main
def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("source", help="PDF à couche texte (chemin ou nom dans ../Partitions/)")
    ap.add_argument("--lang", choices=("fr", "zh"))
    ap.add_argument("--key", help="tonalité si la partition ne la grave pas lisiblement")
    ap.add_argument("--slug", help="nom du fichier (sans .cho) — sinon dérivé du titre")
    args = ap.parse_args(argv)
    path = args.source
    if not os.path.exists(path):
        alt = os.path.join(_cho.PARTITIONS, path)
        if not os.path.exists(alt):
            print(f"introuvable : {path}", file=sys.stderr)
            return 2
        path = alt
    info = _ins.inspect_source(path)
    if info["voie"] != "texte":
        print(f"{_cho.rel(path)} : voie {info['voie']} ({info['famille']}) — draft.py ne traite que la voie texte "
              f"(PDF église, shir.fr, Finale). Écrire le .cho à la main et le mesurer avec check.py.", file=sys.stderr)
        return 2
    import fitz
    doc = fitz.open(path)
    lang = args.lang or info["langue"]
    if lang == "zh":
        ex = _cho.extract_zh(doc)
        if not ex.get("hanzi_ok"):
            print("hanzi illisibles dans la couche texte : pas de brouillon possible", file=sys.stderr)
            return 2
        out = draft_zh(ex, ex["meta"], args.key, path)
    else:
        ex = _cho.extract_fr(doc)
        out = draft_fr(ex, ex["meta"], args.key, path)
    for w in ex.get("warnings", []):
        print(f"⚠ {w}", file=sys.stderr)
    slug = args.slug or (slugify(title_case(ex["meta"].get("title", ""))) if lang == "fr" else _cho.to_simplified(ex["meta"].get("title", "")))
    print(f"# brouillon draft.py — fichier proposé : content/songs/{slug}.cho — relire chaque {{needs_review}}, puis check.py")
    print("\n".join(out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
