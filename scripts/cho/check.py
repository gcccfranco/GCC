#!/usr/bin/env python3
"""Mesure chaque accord de la partition source et le compare au .cho.

Pourquoi : un .cho « fiable à 100 % » (docs/spec-guidelines-cho.md) est un
.cho dont chaque accord a été mesuré sur la partition, jamais posé à l'œil.
Ce script fait la mesure et rend un rapport par accord : exact, à relire,
décalé, absent du .cho, absent de la source, nom différent ; puis structure,
paroles, pinyin. Trois voies, une par famille de source
(docs/chants/02-placement-accords.md) :

- texte   : PDF à couche texte fr (église FPDF, shir.fr — rendus ChordPro,
            l'accord est à l'x exact d'un caractère : ce caractère fait
            foi, au caractère près) ou zh Finale (accord → tête de note → caractère) ;
- scan-zh : scan 简谱 — étiquettes du calque `public/jianpu/chords.json`
            contre les caractères de la bande paroles de
            `public/jianpu/<slug>-p1.webp` (seuils 20 / 45 px) ;
- image-fr: image d'un chant français (Word, capture) — bandes, gouttière,
            mots guidés par le .cho, syllabe par pyphen (seuils 20 / 45 px
            ramenés à 1786 px de large).

Usage (depuis GCCLouange/) :
    python3 scripts/cho/check.py abba-pere                      # source = {source:} du .cho
    python3 scripts/cho/check.py abba-pere --source "Abba Père.pdf"
    python3 scripts/cho/check.py 一粒麦子 --json

Code de retour : 0 si aucun accord décalé / absent / de nom différent ;
1 sinon ; 2 si la source est inexploitable (pas de calque, image illisible…).
La logique vient des audits du 26/09/2026 (12 chants), unifiée.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from difflib import SequenceMatcher


def _load(name):
    """Charge un module de scripts/cho/ par chemin, le dossier retiré de
    sys.path (inspect.py y masquerait le module standard)."""
    import importlib.util
    here = os.path.dirname(os.path.abspath(__file__))
    sys.path[:] = [p for p in sys.path if os.path.abspath(p or os.getcwd()) != here]
    spec = importlib.util.spec_from_file_location("_" + name, os.path.join(here, name + ".py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_cho = _load("_cho")
_ins = _load("inspect")

EXACT, RELIRE, DECALE, ABS_CHO, ABS_SRC, NOM = ("exact", "à relire", "décalé", "absent du .cho",
                                                "absent de la source", "nom différent")
CLASSES = [EXACT, RELIRE, DECALE, ABS_CHO, ABS_SRC, NOM]
FAILING = {DECALE, ABS_CHO, ABS_SRC, NOM}


def fnum(x, nd=1):
    return f"{x:.{nd}f}".replace(".", ",")


def canon(name):
    return _cho.normalize_chord(name)["canon"].strip("()")


# =========================================================================== flux de texte
def norm_fr_map(text):
    """Texte normalisé (minuscules, apostrophe droite, espaces réduits) et
    table index brut → index normalisé (len(text)+1 entrées)."""
    out, m = [], []
    for ch in text:
        c = ch.lower().replace("’", "'").replace(" ", " ")
        if c.isspace():
            if out and out[-1] != " ":
                m.append(len(out))
                out.append(" ")
            else:
                m.append(max(len(out) - 1, 0))
        else:
            m.append(len(out))
            out.append(c)
    while out and out[-1] == " ":
        out.pop()
    m.append(len(out))
    m = [min(x, len(out)) for x in m]
    return "".join(out), m


def norm_zh_map(text):
    """Hanzi seuls (simplifiés, 你/他) et table index brut → nombre de hanzi avant."""
    simp = _cho.to_simplified(text)
    if len(simp) != len(text):  # zhconv garde la longueur ; par prudence
        simp = text.replace("祢", "你").replace("祂", "他")
    out, m = [], []
    for ch in simp:
        m.append(len(out))
        if _cho.HANZI_RE.match(ch):
            out.append(ch)
    m.append(len(out))
    return "".join(out), m


class Stream:
    """Concaténation des lignes chantées d'un côté (source ou .cho) en une
    chaîne normalisée, avec pour chaque ligne ses bornes et pour chaque accord
    sa position : entier = sur l'unité, x,5 = entre deux unités (en l'air)."""

    def __init__(self, lang):
        self.lang = lang
        self.text = ""
        self.lines = []
        self.chords = []

    def add_line(self, line):
        if self.lang == "fr":
            n, m = norm_fr_map(line["text"])
            if self.lines:
                self.text += " "
            start = len(self.text)
            self.text += n
        else:
            n, m = norm_zh_map(line["text"])
            start = len(self.text)
            self.text += n
        line["u0"], line["u1"], line["map"], line["norm"] = start, start + len(n), m, n
        self.lines.append(line)
        for c in line["chords"]:
            if c.get("spacer"):
                continue
            c["line"] = line
            c["canon"] = canon(c["name"])
            self._place(line, c)
            self.chords.append(c)

    def _place(self, line, c):
        text, idx, m, u0, u1 = line["text"], c["idx"], line["map"], line["u0"], line["u1"]
        if self.lang == "fr":
            body = len(text.rstrip())
            if idx >= body or u1 == u0:
                c["pos"], c["air"], c["end"] = u1 - 0.5, True, True
            else:
                c["pos"] = u0 + m[idx]
                c["air"], c["end"] = text[idx].isspace(), False
            return
        # zh : sur le hanzi qui suit, sinon en l'air entre deux hanzi ;
        # `[X][ ]h` et `[X] h` disent « avant la voix » : en l'air aussi
        nxt = text[idx:idx + 1]
        spacer_after = any(o.get("spacer") and o["idx"] == idx and o["col"] > c["col"] for o in line["chords"])
        if nxt and _cho.HANZI_RE.match(nxt) and not spacer_after:
            c["pos"], c["air"], c["on"] = u0 + m[idx], False, u0 + m[idx]
            c["prev"], c["next"] = (u0 + m[idx] - 1 if m[idx] > 0 else None), u0 + m[idx]
            c["end"] = False
            return
        k = m[idx]
        c["air"], c["on"] = True, None
        c["prev"] = u0 + k - 1 if k > 0 else None
        c["next"] = u0 + k if u0 + k < u1 else None
        c["pos"] = (c["prev"] + 0.5) if c["prev"] is not None else (u0 - 0.5)
        c["end"] = c["next"] is None

    def words(self):
        return [(m.start(), m.end()) for m in re.finditer(r"\S+", self.text)]


def word_at(words, pos):
    for wi, (a, b) in enumerate(words):
        if a <= pos < b:
            return wi
    return None


# =========================================================================== alignement
def align(S, C, lines, minrep):
    """Chaque ligne du .cho est cherchée dans la source : fenêtre de sa longueur
    autour de chaque occurrence de sa plus longue sous-chaîne commune, la
    meilleure (ratio, puis proximité du curseur) gagne. Une reprise dépliée
    dans le .cho retrouve ainsi le passage gravé une seule fois, et une ligne
    recoupée (Yahwé) ou fusionnée (refrain de Tu es bon) sa fenêtre exacte.
    Retourne s2c, c2s (index unité ↔ unité, -1 sinon) et les lignes reprises."""
    s2c, c2s = [-1] * len(S), [-1] * len(C)
    repeats, cursor = [], 0
    for L in lines:
        t = C[L["u0"]:L["u1"]]
        core = t.strip()
        if not core:
            continue
        sm = SequenceMatcher(None, S, core, autojunk=False)
        a, b, size = sm.find_longest_match(0, len(S), 0, len(core))
        starts = {cursor}
        if size >= min(minrep, len(core)):
            key = core[b:b + size]
            k = S.find(key)
            while k >= 0:
                starts.add(k - b)
                k = S.find(key, k + 1)
        best = None
        for st in starts:
            r0 = max(0, st)
            for slack in (0, 1, 2, -1):
                r1 = min(len(S), st + len(core) + slack)
                if r1 <= r0:
                    continue
                ratio = round(SequenceMatcher(None, S[r0:r1], core, autojunk=False).ratio(), 3)
                cand = (ratio + (0.04 if r0 >= cursor - 1 else 0.0), -abs(r0 - cursor), r0, r1)
                if best is None or cand > best:
                    best = cand
        if best is None or best[0] < 0.55:
            continue
        _, _, r0, r1 = best
        off = L["u0"] + (len(t) - len(t.lstrip()))
        sm2 = SequenceMatcher(None, S[r0:r1], core, autojunk=False)
        last = r0
        for tag, i1, i2, j1, j2 in sm2.get_opcodes():
            if tag in ("equal", "replace"):
                for k in range(min(i2 - i1, j2 - j1)):
                    c2s[off + j1 + k] = r0 + i1 + k
                    if s2c[r0 + i1 + k] == -1:
                        s2c[r0 + i1 + k] = off + j1 + k
                    last = r0 + i1 + k
        if r0 < cursor - 1:
            repeats.append(L.get("lineno"))
            # reprise dont la fin diffère (volta 2, « To Chorus ») : le plus long
            # suffixe retrouvé après le curseur y est remappé
            for n in range(len(core) - 1, minrep - 1, -1):
                k = S.find(core[-n:], max(0, cursor - 1))
                if k >= 0:
                    for q in range(n):
                        c2s[off + len(core) - n + q] = k + q
                        if s2c[k + q] == -1:
                            s2c[k + q] = off + len(core) - n + q
                    cursor = k + n
                    break
        else:
            cursor = last + 1
    return s2c, c2s, repeats


def mapped(c2s, line, j):
    """Position source d'une unité .cho ; extrapolée depuis la voisine la plus
    proche de la même ligne quand l'unité n'a pas de correspondance."""
    j = int(j)
    if line["u0"] <= j < line["u1"] and c2s[j] != -1:
        return c2s[j]
    for d in range(1, line["u1"] - line["u0"] + 1):
        for jj in (j - d, j + d):
            if line["u0"] <= jj < line["u1"] and c2s[jj] != -1:
                return c2s[jj] + (j - jj)
    return None


def cho_pos(c2s, c):
    """Position d'un accord du .cho dans les coordonnées de la source."""
    line = c["line"]
    if isinstance(c["pos"], float):  # entre deux unités
        base = int(c["pos"])
        m = mapped(c2s, line, base) if base >= line["u0"] else mapped(c2s, line, line["u0"])
        if m is None:
            return None
        return m + 0.5 if base >= line["u0"] else m - 0.5
    return mapped(c2s, line, c["pos"])


def nw(src, cho, pos_of):
    """Needleman-Wunsch de l'audit fr : même nom et même place +3, même nom +1,
    autre nom même place +1, sinon −3 ; trou −1."""
    n, m = len(src), len(cho)
    cp = [pos_of(c) for c in cho]

    def score(i, j):
        same = cp[j] is not None and abs(src[i]["pos"] - cp[j]) <= 1
        if src[i]["canon"] == cho[j]["canon"]:
            return 3 if same else 1
        return 1 if same else -3

    S = [[0.0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        S[i][0] = -i
    for j in range(1, m + 1):
        S[0][j] = -j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            S[i][j] = max(S[i - 1][j - 1] + score(i - 1, j - 1), S[i - 1][j] - 1, S[i][j - 1] - 1)
    out, i, j = [], n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0 and S[i][j] == S[i - 1][j - 1] + score(i - 1, j - 1):
            out.append(("pair", i - 1, j - 1))
            i -= 1
            j -= 1
        elif i > 0 and S[i][j] == S[i - 1][j] - 1:
            out.append(("src", i - 1, None))
            i -= 1
        else:
            out.append(("cho", None, j - 1))
            j -= 1
    return out[::-1], cp


# =========================================================================== juges
def ctx_fr(S, pos, width=8):
    p = int(pos)
    if isinstance(pos, float):
        return S[max(0, p - width):p + 1] + "‹›" + S[p + 1:p + 1 + width]
    return S[max(0, p - width):p] + "‹" + S[p:p + 1] + "›" + S[p + 1:p + 1 + width]


def judge_fr(S, words, sc, p, m):
    """Classe un accord fr apparié (rendu ChordPro : église, shir.fr).
    Décision de Timothée du 26/09/2026 (soir) : la position de la partition
    fait foi **au caractère près** — un accord sur la même syllabe mais un
    autre caractère est décalé, pas équivalent. p = position source,
    m = position .cho ramenée à la source ; une position flottante ou sur une
    espace = accord « en l'air » (sur l'espace avant un mot, après une
    ponctuation)."""
    if m is None:
        return DECALE, "ligne du .cho sans correspondance dans la source"
    if p == m:
        return EXACT, ""
    p_sp = isinstance(p, float) or p >= len(S) or S[int(p)] == " "
    m_sp = isinstance(m, float) or m >= len(S) or S[int(m)] == " "
    if p_sp and m_sp:
        return (EXACT, "") if abs(p - m) <= 1 else (DECALE, "deux positions en l'air différentes")
    if p_sp:
        nxt = next((wi for wi, (a, b) in enumerate(words) if a > p), None)
        mot = S[words[nxt][0]:words[nxt][1]] if nxt is not None else "la fin de ligne"
        return DECALE, f"la partition pose l'accord sur l'espace avant « {mot} » : écrire `[X] {mot}` (crochet + espace), .cho sur « {S[int(m)]} »"
    if m_sp:
        return DECALE, f"la partition pose l'accord devant « {S[int(p)]} » ({ctx_fr(S, int(p), 6)}), le .cho le met en l'air"
    wp, wm = word_at(words, int(p)), word_at(words, int(m))
    if wp is not None and wp == wm:
        w = S[words[wp][0]:words[wp][1]]
        return DECALE, f"même mot « {w} » : la partition pose l'accord devant « {S[int(p)]} », le .cho devant « {S[int(m)]} » (la position de la partition fait foi au caractère près)"
    src = S[words[wp][0]:words[wp][1]] if wp is not None else S[int(p)]
    dst = S[words[wm][0]:words[wm][1]] if wm is not None else S[int(m)]
    return DECALE, f"source sur « {src} », .cho sur « {dst} »"


def judge_zh(S, sc, cc, c2s):
    """Classe un accord zh apparié (voie texte) : accord sur la note d'un
    caractère, ou en l'air entre deux caractères."""
    on = sc.get("on")
    prev = mapped(c2s, cc["line"], cc["prev"]) if cc.get("prev") is not None else None
    nxt = mapped(c2s, cc["line"], cc["next"]) if cc.get("next") is not None else None
    con = mapped(c2s, cc["line"], cc["on"]) if cc.get("on") is not None else None
    name = lambda k: S[k] if k is not None and 0 <= k < len(S) else "—"
    if on is not None:
        if con is not None:
            if con == on:
                return (RELIRE if sc.get("uncertain") else EXACT), (f"note à {fnum(sc['d_note'])} pt" if sc.get("uncertain") else "")
            return DECALE, f"source sur « {name(on)} », .cho sur « {name(con)} »"
        if nxt == on:
            return RELIRE, f"source sur l'attaque de « {name(on)} », .cho avant la voix (`[X] {name(on)}`)"
        if prev == on:
            return RELIRE, f"source sur l'attaque de « {name(on)} », .cho après la syllabe (`{name(on)}[X]`)"
        return DECALE, f"source sur « {name(on)} », .cho en l'air entre « {name(prev)} » et « {name(nxt)} »"
    kp, kn = sc.get("prev"), sc.get("next")
    where = f"en l'air entre « {name(kp)} » et « {name(kn)} »"
    if con is None:
        if (kp is not None and prev == kp) or (kn is not None and nxt == kn) or (kp is None and kn is None):
            return EXACT, "source " + where
        return DECALE, f"source {where}, .cho entre « {name(prev)} » et « {name(nxt)} »"
    if con == kn:
        return RELIRE, f"source {where} (pas de note sous l'accord), .cho collé sur « {name(kn)} »"
    if con == kp:
        return DECALE, f"source {where} : l'accord change pendant « {name(kp)} » tenu, .cho sur son attaque"
    return DECALE, f"source {where}, .cho sur « {name(con)} »"


# =========================================================================== suggestions
def rebuild_line(line, chord, new_raw_idx, space_after=False):
    """La ligne .cho avec `chord` déplacé à new_raw_idx (index dans le texte sans accords)."""
    text = line["text"]
    others = [c for c in line["chords"] if c is not chord]
    ins = sorted([(c["idx"], f"[{c['name']}]") for c in others] + [(new_raw_idx, f"[{chord['name']}]" + (" " if space_after else ""))],
                 key=lambda t: t[0])
    out, pos = "", 0
    for idx, tok in ins:
        idx = min(idx, len(text))
        out += text[pos:idx] + tok
        pos = idx
    return (out + text[pos:]).rstrip()


def window(raw, name, width=14):
    k = raw.find(f"[{name}]")
    if k < 0:
        return raw
    a, b = max(0, k - width), min(len(raw), k + len(name) + 2 + width)
    return ("…" if a else "") + raw[a:b] + ("…" if b < len(raw) else "")


def suggest_fr(S, words, s2c, sc, line, chord):
    """Où poser l'accord dans la ligne .cho pour suivre la source : au début de
    la syllabe du caractère porteur, ou sur l'espace/la fin s'il est en l'air."""
    p = sc["pos"]
    rev = {}
    for i, mi in enumerate(line["map"]):
        rev.setdefault(mi, i)
    if isinstance(p, float) or p >= len(S):
        j = s2c[min(int(p), len(S) - 1)] if S else -1
        raw_idx = len(line["text"].rstrip()) if j < 0 or j >= line["u1"] - 1 else rev.get(j - line["u0"] + 1, len(line["text"].rstrip()))
        return window(rebuild_line(line, chord, raw_idx), chord["name"])
    j = s2c[int(p)]
    if j < 0 or not (line["u0"] <= j < line["u1"]):
        return ""
    local = j - line["u0"]
    if S[int(p)] == " ":
        return window(rebuild_line(line, chord, rev.get(local, local)), chord["name"])
    wi = word_at(words, int(p))
    a, b = words[wi]
    w = S[a:b]
    syl = _cho.syllable_index(w, int(p) - a)
    start_local = local - (int(p) - a) + _cho.syllable_bounds(w)[syl][0]
    return window(rebuild_line(line, chord, rev.get(start_local, start_local)), chord["name"])


def suggest_zh(S, s2c, sc, line, chord):
    rev = {}
    for i, mi in enumerate(line["map"]):
        rev.setdefault(mi, i)

    def raw_before_hanzi(k):
        j = s2c[k] if 0 <= k < len(S) else -1
        if j < 0 or not (line["u0"] <= j < line["u1"]):
            return None
        return rev.get(j - line["u0"])

    if sc.get("on") is not None:
        r = raw_before_hanzi(sc["on"])
        return window(rebuild_line(line, chord, r), chord["name"]) if r is not None else ""
    kp, kn = sc.get("prev"), sc.get("next")
    if kp is not None:
        r = raw_before_hanzi(kp)
        if r is not None:
            return window(rebuild_line(line, chord, r + 1), chord["name"])
    if kn is not None:
        r = raw_before_hanzi(kn)
        if r is not None:
            return window(rebuild_line(line, chord, r, space_after=True), chord["name"])
    return ""


# =========================================================================== voie texte
def source_lines_fr(ex):
    lines, instr, structure = [], [], []
    for it in ex["items"]:
        if it["kind"] == "sung":
            chords = [dict(name=c["name"], idx=c["idx"], x=c["x"], dist=c["dist"]) for c in it["chords"]]
            lines.append(dict(text=it["text"], chords=chords, page=it["page"], y=it["y_lyric"], in_bar=it.get("in_bar")))
        elif it["kind"] == "instr":
            instr.append(dict(names=[c["name"] for c in it["chords"]], xs=[c["x"] for c in it["chords"]], page=it["page"], y=it["y"]))
    return lines, instr


def source_lines_zh(ex):
    """Chaque système devient une ligne (hanzi seuls) ; les accords en l'air
    avant le premier hanzi du système forment une suite instrumentale."""
    lines, instr = [], []
    for s in ex["systems"]:
        row = s["lyric"]
        chars = row["chars"] if row else []
        hidx = []
        n = 0
        for c in chars:
            hidx.append(n)
            if _cho.HANZI_RE.match(c["c"]):
                n += 1
        text = "".join(c["c"] for c in chars if _cho.HANZI_RE.match(c["c"]))
        chords, run = [], []
        for m in s["chords"]:
            d = dict(name=m["name"], x=m["x"], note=m.get("note"), note_x=m.get("note_x"),
                     d_note=m.get("d_note"), uncertain=m.get("uncertain", False))
            if m.get("on_char") is not None:
                d["on_k"] = hidx[m["on_char"]]
            else:
                d["on_k"] = None
                d["prev_k"] = hidx[m["prev_char"]] if m.get("prev_char") is not None else None
                d["next_k"] = hidx[m["next_char"]] if m.get("next_char") is not None else None
            if not text or (s.get("instrumental") and d["on_k"] is None and d.get("prev_k") is None and not chords):
                run.append(d)
            else:
                chords.append(d)
        if run:
            instr.append(dict(names=[c["name"] for c in run], xs=[c["x"] for c in run], page=s["p"], y=s["chord_y"]))
        if text:
            lines.append(dict(text=text, chords=chords, page=s["p"], y=s["lyric_y"], raw=row["text"]))
    return lines, instr


def check_text(cho, doc, famille, lang, warnings):
    if lang == "zh":
        ex = _cho.extract_zh(doc)
        src_lines, src_instr = source_lines_zh(ex)
        if not ex.get("hanzi_ok"):
            warnings.append("hanzi illisibles dans la couche texte : accords non comparés aux paroles")
    else:
        ex = _cho.extract_fr(doc)
        src_lines, src_instr = source_lines_fr(ex)
    warnings.extend(ex.get("warnings", []))
    S = Stream(lang)
    for L in src_lines:
        if lang == "zh":
            for c in L["chords"]:
                # positions zh du côté source : sur le hanzi k, ou entre prev/next
                c["idx"] = 0
        S.add_line(L)
        if lang == "zh":
            for c in L["chords"]:
                u0 = L["u0"]
                if c["on_k"] is not None:
                    c["on"], c["pos"], c["air"] = u0 + c["on_k"], u0 + c["on_k"], False
                    c["prev"], c["next"] = (u0 + c["on_k"] - 1 if c["on_k"] > 0 else None), u0 + c["on_k"]
                else:
                    c["on"], c["air"] = None, True
                    c["prev"] = u0 + c["prev_k"] if c["prev_k"] is not None else None
                    c["next"] = u0 + c["next_k"] if c["next_k"] is not None else None
                    c["pos"] = (c["prev"] + 0.5) if c["prev"] is not None else (u0 - 0.5)
    C = Stream(lang)
    for it in _cho.sung_lines(cho):
        C.add_line(dict(text=it["text"], chords=it["chords"], lineno=it["lineno"], raw=it["lyric"], item=it))
    s2c, c2s, repeats = align(S.text, C.text, C.lines, 12 if lang == "fr" else 4)
    words = S.words() if lang == "fr" else []
    results = []
    # ---- lignes instrumentales
    cho_instr = _cho.instr_lines(cho)
    for k in range(max(len(src_instr), len(cho_instr))):
        s = src_instr[k] if k < len(src_instr) else None
        c = cho_instr[k] if k < len(cho_instr) else None
        sn = [canon(n) for n in s["names"]] if s else []
        cn = [canon(x["name"]) for x in c["chords"] if not x["spacer"]] if c else []
        sm = SequenceMatcher(None, sn, cn, autojunk=False)
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            if tag == "equal":
                for q in range(i2 - i1):
                    results.append(dict(line=c["lineno"], chord=c["chords"][j1 + q]["name"] if c else "", cls=EXACT, detail="ligne instrumentale", instr=True))
            else:
                for q in range(i1, i2):
                    if tag == "replace" and q - i1 < j2 - j1:
                        results.append(dict(line=c["lineno"], chord=cn[j1 + q - i1], cls=NOM, detail=f"source : {s['names'][q]} x={fnum(s['xs'][q])} (ligne instrumentale)", suggest=""))
                    else:
                        results.append(dict(line=c["lineno"] if c else None, chord=s["names"][q], cls=ABS_CHO, detail=f"ligne instrumentale de la source p{s['page']} y={fnum(s['y'])} x={fnum(s['xs'][q])}", suggest=""))
                for q in range(j1 + (i2 - i1 if tag == "replace" else 0), j2):
                    results.append(dict(line=c["lineno"], chord=cn[q], cls=ABS_SRC, detail="aucune ligne instrumentale correspondante dans la source", suggest=""))
    # ---- régions des lignes .cho
    for L in C.lines:
        mp = [c2s[j] for j in range(L["u0"], L["u1"]) if c2s[j] != -1]
        L["rmin"], L["rmax"] = (min(mp), max(mp)) if mp else (None, None)
    for sc in S.chords:
        sc["homes"] = []
    matched = sorted([L for L in C.lines if L["rmin"] is not None], key=lambda L: L["rmin"])
    for sc in S.chords:
        p = sc["pos"]
        homes = [L for L in matched if L["rmin"] - 0.5 <= p <= L["rmax"] + 0.5]
        if not homes:
            A = next((L for L in reversed(matched) if L["rmax"] < p), None)
            B = next((L for L in matched if L["rmin"] > p), None)
            if A and any(c["canon"] == sc["canon"] and (isinstance(c["pos"], float) or c["pos"] >= A["u1"] - 1) for c in A["chords"] if not c.get("spacer")):
                homes = [A]
            elif B and any(c["canon"] == sc["canon"] and c["pos"] <= B["u0"] + 0.5 for c in B["chords"] if not c.get("spacer")):
                homes = [B]
            elif B:
                homes = [B]
            elif A:
                homes = [A]
        sc["homes"] = homes
        for L in homes:
            L.setdefault("src", []).append(sc)
    paired_src = set()
    for L in C.lines:
        cc = [c for c in L["chords"] if not c.get("spacer")]
        src = sorted(L.get("src", []), key=lambda c: c["pos"])
        ops, cp = nw(src, cc, lambda c: cho_pos(c2s, c))
        for tag, i, j in ops:
            if tag == "pair":
                sc, c = src[i], cc[j]
                paired_src.add(id(sc))
                if sc["canon"] != c["canon"]:
                    r = dict(line=L["lineno"], chord=c["name"], cls=NOM,
                             detail=f"source : {sc['name']} x={fnum(sc['x'])} sur « {ctx_fr(S.text, sc['pos'], 6) if lang == 'fr' else ctx_zh(S.text, sc)} »",
                             suggest=window(rebuild_line(L, c, c["idx"]).replace(f"[{c['name']}]", f"[{sc['name']}]"), sc["name"]))
                    results.append(r)
                    continue
                if lang == "fr":
                    cls, why = judge_fr(S.text, words, sc, sc["pos"], cp[j])
                    detail = f"source : x={fnum(sc['x'])} sur « {ctx_fr(S.text, sc['pos'], 6)} »" + (f" — {why}" if why and cls != EXACT else "")
                    sug = suggest_fr(S.text, words, s2c, sc, L, c) if cls != EXACT else ""
                else:
                    cls, why = judge_zh(S.text, sc, c, c2s)
                    detail = f"source : x={fnum(sc['x'])} {ctx_zh(S.text, sc)}" + (f" — {why}" if why and cls != EXACT else "")
                    sug = suggest_zh(S.text, s2c, sc, L, c) if cls != EXACT else ""
                results.append(dict(line=L["lineno"], chord=c["name"], cls=cls, detail=detail, suggest=sug))
            elif tag == "cho":
                c = cc[j]
                results.append(dict(line=L["lineno"], chord=c["name"], cls=ABS_SRC,
                                    detail=f"aucun accord {c['canon']} dans la source vers « {ctx_fr(C.text, c['pos'], 6) if lang == 'fr' else ctx_cho_zh(C.text, c)} »", suggest=""))
    for sc in S.chords:
        if id(sc) not in paired_src:
            home = sc["homes"][0]["lineno"] if sc["homes"] else None
            results.append(dict(line=home, chord=sc["name"], cls=ABS_CHO,
                                detail=f"source : x={fnum(sc['x'])} sur « {ctx_fr(S.text, sc['pos'], 6) if lang == 'fr' else ctx_zh(S.text, sc)} »" + (" (optionnel)" if sc["name"].startswith("(") else ""),
                                suggest=""))
    measured = len(S.chords) + sum(len(s["names"]) for s in src_instr)
    structure = structure_text(ex, cho, lang, famille)
    paroles = compare_lyrics(S, C, c2s, lang)
    return dict(results=results, measured=measured, structure=structure, paroles=paroles,
                pinyin=pinyin_report(cho) if lang == "zh" else None)


def ctx_zh(S, sc):
    if sc.get("on") is not None:
        k = sc["on"]
        return f"sur « {S[max(0, k - 2):k]}‹{S[k]}›{S[k + 1:k + 3]} »" + (f" (note {sc.get('note')}@{fnum(sc['note_x'])})" if sc.get("note_x") is not None else "")
    kp, kn = sc.get("prev"), sc.get("next")
    a = S[kp] if kp is not None else "—"
    b = S[kn] if kn is not None else "—"
    return f"en l'air entre « {a} » et « {b} »"


def ctx_cho_zh(Ct, c):
    if c.get("on") is not None:
        k = c["on"]
        return f"{Ct[max(0, k - 2):k]}‹{Ct[k]}›{Ct[k + 1:k + 3]}"
    kp, kn = c.get("prev"), c.get("next")
    return f"{Ct[kp] if kp is not None else '—'}‹›{Ct[kn] if kn is not None else '—'}"


# ---- structure, paroles, pinyin
def cho_structure(cho):
    out = []
    for h in _cho.headers(cho):
        label = h["label"]
        kind = h["type"]
        low = label.lower()
        if re.search(r"interlude|instru|solo|间奏|器乐", low):
            kind = "interlude"
        elif kind == "verse" and re.search(r"pr[ée]-?refrain|pre-?chorus|预备|前副歌|导歌", low):
            kind = "prechorus"
        elif kind == "verse" and re.search(r"fin\b|final|结尾|尾声|coda|ending", low):
            kind = "outro"
        elif kind == "verse" and re.search(r"\btag\b", low):
            kind = "tag"
        out.append(dict(kind=kind, label=label))
    return out


KIND_FR = {"intro": "Intro", "verse": "Couplet", "chorus": "Refrain", "bridge": "Pont", "prechorus": "Pré-Refrain",
           "postchorus": "Post-Refrain", "outro": "Final", "interlude": "Interlude", "tag": "Tag"}
WORD_KIND = {"couplet": "verse", "refrain": "chorus", "pont": "bridge", "intro": "intro", "interlude": "interlude",
             "final": "outro", "coda": "outro", "pré-refrain": "prechorus", "prérefrain": "prechorus", "tag": "tag",
             "pre-refrain": "prechorus", "pre-chorus": "prechorus", "chorus": "chorus", "verse": "verse", "bridge": "bridge"}


def structure_text(ex, cho, lang, famille):
    src = []
    if lang == "fr":
        items = ex["items"]
        seen_sung = False
        in_bar = None
        for it in items:
            if it["kind"] == "header":
                w = it["text"].split()[0].lower().strip(":")
                k = WORD_KIND.get(w, "other")
                src.append(dict(kind=k, label=it["text"]))
            elif it["kind"] == "instr":
                src.append(dict(kind="intro" if not seen_sung else "interlude", label="Intro" if not seen_sung else "Interlude"))
            elif it["kind"] == "repeat":
                if src:
                    src[-1]["label"] += f" {it['text']}"
            elif it["kind"] == "sung":
                seen_sung = True
                if famille == "shirfr":
                    if it.get("in_bar") and in_bar is not True:
                        src.append(dict(kind="chorus", label="Refrain"))
                    elif not it.get("in_bar") and in_bar is not False and not (src and src[-1]["kind"] in ("verse", "bridge", "outro", "prechorus") and src[-1].get("explicit")):
                        src.append(dict(kind="verse", label="Couplet"))
                    in_bar = it.get("in_bar")
        if famille == "shirfr":
            # les en-têtes explicites (Pont, Final) ne doivent pas être doublés d'un Couplet
            cleaned = []
            for s in src:
                if cleaned and s["kind"] == "verse" and cleaned[-1]["kind"] in ("bridge", "outro", "prechorus") and s["label"] == "Couplet":
                    continue
                cleaned.append(s)
            src = cleaned
    else:
        for lab in ex["labels"]:
            k = {"intro": "intro", "couplet": "verse", "refrain": "chorus", "pont": "bridge", "pre-refrain": "prechorus",
                 "interlude": "interlude", "final": "outro", "tag": "tag"}[lab["kind"]]
            src.append(dict(kind=k, label=lab["text"]))
        for h in ex.get("hints", []):
            src.append(dict(kind="hint", label=h))
    chos = cho_structure(cho)
    a = [s["kind"] for s in src if s["kind"] != "hint"]
    b = [s["kind"] for s in chos]
    return dict(source=[s["label"] for s in src], cho=[s["label"] for s in chos], same=(a == b),
                source_kinds=a, cho_kinds=b)


def compare_lyrics(S, C, c2s, lang):
    total, same, diffs = 0, 0, []
    for L in C.lines:
        total += 1
        if L["rmin"] is None:
            diffs.append(dict(line=L["lineno"], cho=L["norm"], source=None))
            continue
        if L["rmax"] - L["rmin"] + 1 <= L["u1"] - L["u0"] + 3:
            seg = S.text[L["rmin"]:L["rmax"] + 1]
        else:  # mapping par morceaux (reprise + volta) : les unités mappées, dans l'ordre
            seg = "".join(S.text[c2s[j]] for j in range(L["u0"], L["u1"]) if c2s[j] != -1)
        # Tirets de coupe du transcripteur (« sa - lut ») : retirés avant la comparaison.
        a, b = L["norm"].strip(), seg.replace(" - ", "").strip()
        if a == b:
            same += 1
        else:
            diffs.append(dict(line=L["lineno"], cho=a, source=b))
    return dict(total=total, same=same, diffs=diffs)


def pinyin_report(cho):
    exc = _cho.pinyin_exceptions()
    lines, bad_count, diffs = 0, [], []
    for it in _cho.sung_lines(cho):
        hz = _cho.hanzi_only(it["text"])
        if not hz:
            continue
        lines += 1
        if not it["pinyin"]:
            bad_count.append((it["lineno"], "absent"))
            continue
        ref = it["pinyin"].split()
        if len(ref) != len(hz):
            bad_count.append((it["lineno"], f"{len(ref)} groupes / {len(hz)} hanzi"))
            continue
        gen = _cho.pinyin_groups(it["text"], exc)
        for k, (a, b) in enumerate(zip(gen, ref)):
            if a != b:
                diffs.append((it["lineno"], hz[k], b, a))
    return dict(lines=lines, bad_count=bad_count, diffs=diffs)


# =========================================================================== voie scan-zh
def bands_of(arr, x0, x1, min_dark=3, min_gap=4):
    import numpy as np
    dark = (arr[:, x0:x1] < 128).sum(axis=1)
    rows = np.where(dark >= min_dark)[0]
    out = []
    if len(rows) == 0:
        return out
    s = p = rows[0]
    for r in rows[1:]:
        if r - p > min_gap:
            out.append((int(s), int(p)))
            s = r
        p = r
    out.append((int(s), int(p)))
    return out


def clusters_x(arr, y0, y1, x0, x1, min_gap, thick_min=1):
    import numpy as np
    d = (arr[y0:y1 + 1, x0:x1] < 128).sum(axis=0)
    cols = np.where(d >= thick_min)[0]
    out = []
    if len(cols) == 0:
        return out
    s = p = cols[0]
    for c in cols[1:]:
        if c - p > min_gap:
            out.append([x0 + int(s), x0 + int(p)])
            s = c
        p = c
    out.append([x0 + int(s), x0 + int(p)])
    return out


def hanzi_clusters(arr, y0, y1, x0, x1):
    """Amas de la bande paroles → un par caractère : ponctuation fusionnée avec
    le caractère précédent, amas > 1,6 × largeur médiane scindés, bruit < 4 px
    retiré (match_zh.py, audit zh)."""
    import statistics
    cl = [c for c in clusters_x(arr, y0, y1, x0, x1, 6) if c[1] - c[0] >= 4]
    merged = []
    for a, b in cl:
        if merged and b - a < 16 and a - merged[-1][1] < 22:
            merged[-1][1] = b
        else:
            merged.append([a, b])
    if not merged:
        return []
    med = statistics.median(b - a for a, b in merged)
    merged = [c for c in merged if c[1] - c[0] >= 0.45 * med]  # ponctuation isolée, bruit
    out = []
    for a, b in merged:
        n = max(1, round((b - a) / med)) if med and (b - a) > 1.6 * med else 1
        step = (b - a) / n
        for k in range(n):
            out.append([int(a + k * step), int(a + (k + 1) * step)])
    return out


def lyric_like(arr, band, x0, x1, boxes):
    """Amas d'une bande si elle ressemble à une rangée de paroles : des hanzi
    carrés (largeur médiane 26–46 px ≈ hauteur, ≥ 60 % des largeurs à ± 30 %),
    au moins 4 amas bruts, aucun trait horizontal (amas brut > 4 × médiane :
    crochet de volta), et hors des boîtes d'étiquettes (rangées d'annotation)."""
    y0, y1 = band
    h = y1 - y0 + 1
    if not 22 <= h <= 50:
        return None
    if any(bx["y"] < y1 and bx["y"] + bx["h"] > y0 for bx in boxes):
        return None
    raw = [c for c in clusters_x(arr, y0, y1, x0, x1, 6) if c[1] - c[0] >= 4]
    if len(raw) < 4:
        return None
    cl = hanzi_clusters(arr, y0, y1, x0, x1)
    ws = sorted(b - a for a, b in cl)
    if len(ws) < 4:
        return None
    med = ws[len(ws) // 2]
    if not 26 <= med <= 46 or max(b - a for a, b in raw) > 4 * med:
        return None
    if sum(1 for w in ws if 0.7 * med <= w <= 1.3 * med) < 0.6 * len(ws):
        return None
    if (arr[y0:y1 + 1, x0:x1] < 128).mean() < 0.03:
        return None
    # des hanzi encrent presque toutes les lignes ; chiffres + soulignés laissent des vides
    rows_dark = (arr[y0:y1 + 1, x0:x1] < 128).sum(axis=1)
    if (rows_dark >= 3).mean() < 0.9:
        return None
    # chaque hanzi occupe presque toute la hauteur ; un chiffre + son souligné, non
    import numpy as np
    ext = []
    for a, b in cl:
        r = np.where((arr[y0:y1 + 1, a:b + 1] < 128).any(axis=1))[0]
        ext.append((r[-1] - r[0] + 1) / h if len(r) else 0)
    ext.sort()
    if ext[len(ext) // 4] < 0.85:
        return None
    return cl


def lyric_rows_in(arr, band, x0, x1, boxes):
    """Rangées de paroles d'une bande : elle-même si elle a la forme voulue,
    sinon (bande fusionnée avec un crochet, un pied de page…) balayage par une
    fenêtre de 36 px, maxima locaux du nombre d'amas."""
    y0, y1 = band
    if y1 - y0 + 1 <= 50:
        cl = lyric_like(arr, band, x0, x1, boxes)
        if cl:
            return [dict(y=band, xs=[a for a, _ in cl], n=len(cl))]
        if y1 - y0 + 1 < 40:
            return []
    found = []
    y = y0
    while y + 35 <= y1 + 1:
        cl = lyric_like(arr, (y, y + 35), x0, x1, boxes)
        if cl:
            dark = float((arr[y:y + 36, x0:x1] < 128).sum())
            if found and y - found[-1]["y"][0] < 30:
                if dark > found[-1]["dark"]:
                    found[-1] = dict(y=(y, y + 35), xs=[a for a, _ in cl], n=len(cl), dark=dark)
            else:
                found.append(dict(y=(y, y + 35), xs=[a for a, _ in cl], n=len(cl), dark=dark))
        y += 3
    return found


def scan_rows(arr, labels, label_h, boxes):
    """Rangées d'accords (étiquettes groupées par y) et, sous chacune, les
    rangées de paroles (1 ou 2 voix) avec leurs amas de caractères."""
    W = arr.shape[1]
    x0, x1 = 20, W - 20
    rows = []
    for l in sorted(labels, key=lambda l: (l["y"] + l["h"] / 2, l["x"])):
        yc = l["y"] + l["h"] / 2
        for r in rows:
            if abs(r["yc"] - yc) <= max(label_h, 12):
                r["labels"].append(l)
                r["yc"] = (r["yc"] * (len(r["labels"]) - 1) + yc) / len(r["labels"])
                break
        else:
            rows.append(dict(yc=yc, labels=[l]))
    rows.sort(key=lambda r: r["yc"])
    for r in rows:
        r["labels"].sort(key=lambda l: l["x"])
        r["top"] = min(l["y"] for l in r["labels"])
        r["bot"] = max(l["y"] + l["h"] for l in r["labels"])
    allb = bands_of(arr, x0, x1)
    for i, r in enumerate(rows):
        nxt = rows[i + 1]["top"] if i + 1 < len(rows) else arr.shape[0]
        lyr = []
        below = [b for b in allb if b[0] > r["bot"] - 2 and b[0] < nxt]
        # la première bande sous les accords est la ligne de chiffres (haute, collée) :
        # on ne cherche des paroles qu'en dessous de ses 40 premiers pixels (cas où
        # chiffres et paroles ne font qu'une bande)
        if below and below[0][0] - r["bot"] <= 30 and below[0][1] - below[0][0] + 1 >= 45:
            b0 = below[0]
            below = ([(b0[0] + 40, b0[1])] if b0[1] - b0[0] + 1 >= 85 else []) + below[1:]
        for b in below:
            lyr += lyric_rows_in(arr, b, x0, x1, boxes)
        if len(lyr) > 1:
            # une seconde rangée est sous les mêmes notes : ses amas s'alignent sur la première
            first = lyr[0]["xs"]
            aligned = [ly for ly in lyr[1:] if sum(1 for x in ly["xs"] if any(abs(x - f) <= 12 for f in first)) >= 0.5 * len(ly["xs"])]
            lyr = [lyr[0]] + aligned[:1]
        r["lyrics"] = lyr[:2]
    return rows


def check_scan(cho, slug, warnings):
    import numpy as np
    from PIL import Image
    cpath = os.path.join(_cho.JIANPU, "chords.json")
    allc = json.load(open(cpath, encoding="utf-8")) if os.path.exists(cpath) else {}
    if slug not in allc:
        return None, "faire le calque d'abord (docs/chants/03-calque-jianpu.md) : aucune entrée dans public/jianpu/chords.json"
    entry = allc[slug]
    img = os.path.join(_cho.JIANPU, f"{slug}-p1.webp")
    if not os.path.exists(img):
        return None, f"image {_cho.rel(img)} absente : lancer build-images.py"
    idx = json.load(open(os.path.join(_cho.JIANPU, "index.json"), encoding="utf-8")).get(slug, {})
    if len(idx.get("pages", [])) > 1:
        warnings.append("plusieurs pages : seule la page 1 est mesurée")
    arr = np.asarray(Image.open(img).convert("L"))
    label_h = entry.get("labelH", 20)
    labels, skipped = [], []
    boxes = [l for l in entry["labels"] if l.get("c")]
    # une annotation entre crochets peut s'étaler sur plusieurs étiquettes : « [ F#m » … « A/C# ] »
    in_span, span_y = False, None
    for i, l in enumerate(sorted(entry["labels"], key=lambda l: (round((l["y"] + l["h"] / 2) / max(label_h, 12)), l["x"]))):
        c = l.get("c", "")
        opens, closes = "[" in c, "]" in c
        yc = l["y"] + l["h"] / 2
        if in_span and (span_y is None or abs(yc - span_y) > label_h):
            in_span = False
        alt = re.match(r"^(\S+)或(\S+)$", c)
        skip = not c or opens or closes or in_span or (_cho.has_hanzi(c) and not alt) or c.startswith("1=") or l.get("alt") or l.get("opt")
        if opens and not closes:
            in_span, span_y = True, yc
        if closes:
            in_span = False
        if skip:
            skipped.append((i, c))
            continue
        if alt:
            a1, a2 = canon(alt.group(1)), canon(alt.group(2))
            labels.append(dict(l, i=i, canon=f"{a1} ({a2})", names={a1, a2, f"{a1} ({a2})"}, optional=False))
        else:
            labels.append(dict(l, i=i, canon=canon(c), names={canon(c)}, optional=c.startswith("(")))
    rows = scan_rows(arr, labels, label_h, boxes)
    # ---- flux des rangées de paroles dans l'ordre chanté (2 voix)
    sysrows = []
    for s, r in enumerate(rows):
        for v, ly in enumerate(r["lyrics"], 1):
            sysrows.append(dict(s=s, v=v, xs=ly["xs"], y=ly["y"], row=r))
    nvoices = {s: len(r["lyrics"]) for s, r in enumerate(rows)}

    def row_of(s, v):
        return next((sr for sr in sysrows if sr["s"] == s and sr["v"] == v), None)

    def next_row(s, v):
        """Rangée qui suit (s, v) dans le chant : même voix tant que le bloc à deux
        rangées dure, puis retour à la voix 1."""
        t = s + 1
        while t < len(rows):
            if nvoices.get(t, 0) == 0:
                t += 1
                continue
            return row_of(t, v if nvoices[t] >= v else 1)
        return None

    def prev_row(s, v):
        t = s - 1
        while t >= 0:
            if nvoices.get(t, 0) == 0:
                t -= 1
                continue
            return row_of(t, v if nvoices[t] >= v else 1)
        return None

    def walk(start, count, voice_pref):
        """Depuis (rangée, index), les `count` positions suivantes ; au premier
        système à deux rangées, prend la voix `voice_pref`."""
        out, (r, k) = [], start
        while r is not None and len(out) < count:
            if k >= len(r["xs"]):
                nr = next_row(r["s"], r["v"])
                if nr is not None and nvoices[nr["s"]] == 2 and nvoices[r["s"]] == 1:
                    nr = row_of(nr["s"], voice_pref)
                r, k = nr, 0
                continue
            out.append((r, k))
            k += 1
        return out, (r, k)

    def back(pos, n):
        r, k = pos
        while n > 0 and r is not None:
            if k >= n:
                return (r, k - n)
            n -= k
            pr = prev_row(r["s"], r["v"])
            if pr is None:
                return (r, 0)
            r, k = pr, len(pr["xs"])
        return (r, k)

    # ---- .cho
    sung = [it for it in _cho.sung_lines(cho) if _cho.has_hanzi(it["text"])]
    for it in sung:
        n, m = norm_zh_map(it["text"])
        it["hz"], it["map"] = n, m
        it["cc"] = []
        for c in it["chords"]:
            if c["spacer"]:
                continue
            nxt = it["text"][c["idx"]:c["idx"] + 1]
            spacer_after = any(o["spacer"] and o["idx"] == c["idx"] and o["col"] > c["col"] for o in it["chords"])
            on = bool(nxt) and bool(_cho.HANZI_RE.match(nxt)) and not spacer_after
            k = m[c["idx"]]
            it["cc"].append(dict(name=c["name"], canon=canon(c["name"]), k=k if k < len(n) else None, on=on,
                                 prev=k - 1 if k > 0 else None, chord=c, end=(k >= len(n))))
    results = []
    used = set()
    cursor = (sysrows[0], 0) if sysrows else (None, 0)
    for it in sung:
        # candidats de départ : curseur et départs impliqués par les ancres (même nom)
        votes = {}
        for cc in it["cc"]:
            if cc["k"] is None:
                continue
            for r in rows:
                for l in r["labels"]:
                    if cc["canon"] not in l["names"]:
                        continue
                    for ly in r["lyrics"]:
                        sr = row_of(rows.index(r), r["lyrics"].index(ly) + 1)
                        kk = min(range(len(sr["xs"])), key=lambda q: abs(sr["xs"][q] - l["x"]))
                        st = back((sr, kk), cc["k"])
                        key = (st[0]["s"], st[0]["v"], st[1])
                        votes[key] = votes.get(key, 0) + 1
        cands = [cursor] if cursor[0] is not None else []
        for key, n in sorted(votes.items(), key=lambda kv: -kv[1]):
            if n >= 2 or not cands:
                sr = row_of(key[0], key[1])
                if sr and (sr, key[2]) not in cands:
                    cands.append((sr, key[2]))
        best = None
        for st in cands[:6]:
            for vp in (1, 2):
                path, end = walk(st, len(it["hz"]), vp)
                if len(path) < len(it["hz"]) * 0.7:
                    continue
                # score gradué : étiquette du même nom dans le système prédit, à ≤ 20 / 45 / 100 px
                score = 1 if st == cursor else 0
                for cc in it["cc"]:
                    if cc["k"] is None or cc["k"] >= len(path):
                        continue
                    sr, k = path[cc["k"]]
                    ds = [abs(l["x"] - sr["xs"][k]) for l in sr["row"]["labels"] if cc["canon"] in l["names"]]
                    if ds:
                        d = min(ds)
                        score += 3 if d <= 20 else (2 if d <= 45 else (1 if d <= 100 else 0))
                if best is None or score > best[0] or (score == best[0] and st == cursor and best[1] != cursor):
                    best = (score, st, vp, path, end)
        if best is None:
            for cc in it["cc"]:
                results.append(dict(line=it["lineno"], chord=cc["name"], cls=ABS_SRC, detail="ligne sans rangée de paroles trouvée", suggest=""))
            continue
        _, st, vp, path, end = best
        cursor = end
        for cc in it["cc"]:
            k = cc["k"] if cc["k"] is not None else len(path) - 1
            if k >= len(path):
                results.append(dict(line=it["lineno"], chord=cc["name"], cls=ABS_SRC, detail="au-delà des amas de la rangée", suggest=""))
                continue
            sr, kk = path[k]
            xs = sr["xs"]
            xc = xs[kk]
            cands_l = [l for l in sr["row"]["labels"] if cc["canon"] in l["names"]]
            elsewhere = [l for r in rows for l in r["labels"] if cc["canon"] in l["names"]]
            hz = it["hz"][k] if k < len(it["hz"]) else "—"
            if not cands_l:
                other = min(elsewhere, key=lambda l: abs(l["y"] - sr["y"][0])) if elsewhere else None
                where = f"étiquette {cc['canon']} la plus proche : x={other['x']} y={other['y']} (système {rows.index(next(r for r in rows if other in r['labels'])) + 1})" if other else "aucune étiquette de ce nom"
                results.append(dict(line=it["lineno"], chord=cc["name"], cls=DECALE if other else ABS_SRC,
                                    detail=f".cho sur « {hz} » (système {sr['s'] + 1}, x={xc}) ; {where}", suggest=""))
                continue
            l = min(cands_l, key=lambda l: abs(l["x"] - xc))
            used.add(id(l))
            d = l["x"] - xc
            xprev = xs[kk - 1] if kk > 0 else xc - 200
            xnext = xs[kk + 1] if kk + 1 < len(xs) else xc + 200
            if cc["end"]:  # après le dernier hanzi de la ligne
                dd = 0 if d >= -20 else d + 20
            elif cc["on"]:
                dd = d
            else:
                # formes en l'air (`[X] h`, `[X][ ]h`, `h[X]，`, `路[X] [Y]亚`) : l'accord sonne
                # entre le hanzi précédent et h — l'étiquette doit être dans cet intervalle
                dd = 0 if xprev - 20 <= l["x"] <= xc + 20 else (d if l["x"] > xc else l["x"] - xprev)
            volta = ""
            if abs(dd) > 45 and cc is it["cc"][-1]:
                # dernière syllabe d'une volta : l'étiquette est sur un amas plus loin dans la rangée
                kb = min(range(len(xs)), key=lambda q: abs(xs[q] - l["x"]))
                if kb > kk and abs(l["x"] - xs[kb]) <= 20:
                    dd, volta = l["x"] - xs[kb], " (volta : amas #%d de la rangée)" % (kb + 1)
            cls = EXACT if abs(dd) <= 20 else (RELIRE if abs(dd) <= 45 else DECALE)
            if cls == EXACT and cc["canon"] != l["canon"]:
                cls = NOM
            detail = f"étiquette {l['c']} x={l['x']} (système {sr['s'] + 1}{', rangée ' + str(sr['v']) if nvoices[sr['s']] == 2 else ''}) ↔ « {hz} » x={xc} : d={d:+d} px{volta}"
            sug = f"[{l['c']}]{hz}" if cls == NOM else ""
            if cls not in (EXACT, NOM):
                # syllabe la plus proche de l'étiquette dans la rangée
                kb = min(range(len(xs)), key=lambda q: abs(xs[q] - l["x"]))
                delta = kb - kk
                hz2 = it["hz"][k + delta] if 0 <= k + delta < len(it["hz"]) else "?"
                if l["x"] - xs[kb] > 20 and k + delta < len(it["hz"]):
                    sug = f"{hz2}[{cc['name']}] (tenue/syncope : après « {hz2} »)"
                else:
                    sug = f"[{cc['name']}]{hz2}"
                detail += f" ; amas le plus proche de l'étiquette : « {hz2} » x={xs[kb]} (d={l['x'] - xs[kb]:+d})"
            results.append(dict(line=it["lineno"], chord=cc["name"], cls=cls, detail=detail, suggest=sug))
    # ---- rangées instrumentales (sans paroles) ↔ lignes instrumentales du .cho
    instr_rows = [r for r in rows if not r["lyrics"]]
    cho_instr = _cho.instr_lines(cho)
    for k in range(max(len(instr_rows), len(cho_instr))):
        r = instr_rows[k] if k < len(instr_rows) else None
        c = cho_instr[k] if k < len(cho_instr) else None
        sn = [l["canon"] for l in r["labels"]] if r else []
        cn = [canon(x["name"]) for x in c["chords"] if not x["spacer"]] if c else []
        sm = SequenceMatcher(None, sn, cn, autojunk=False)
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            if tag == "equal":
                for q in range(i2 - i1):
                    used.add(id(r["labels"][i1 + q]))
                    results.append(dict(line=c["lineno"], chord=cn[j1 + q], cls=EXACT, detail="rangée instrumentale", instr=True))
            else:
                for q in range(i1, i2):
                    used.add(id(r["labels"][q]))
                    if tag == "replace" and q - i1 < j2 - j1:
                        results.append(dict(line=c["lineno"], chord=cn[j1 + q - i1], cls=NOM, detail=f"étiquette {r['labels'][q]['c']} x={r['labels'][q]['x']} (rangée instrumentale)", suggest=""))
                    else:
                        results.append(dict(line=c["lineno"] if c else None, chord=r["labels"][q]["c"], cls=ABS_CHO, detail=f"rangée instrumentale y={r['labels'][q]['y']} x={r['labels'][q]['x']}", suggest=""))
                for q in range(j1 + (i2 - i1 if tag == "replace" else 0), j2):
                    results.append(dict(line=c["lineno"], chord=cn[q], cls=ABS_SRC, detail="aucune rangée instrumentale correspondante", suggest=""))
    for r in rows:
        for l in r["labels"]:
            if id(l) not in used:
                results.append(dict(line=None, chord=l["c"], cls=ABS_CHO,
                                    detail=f"étiquette x={l['x']} y={l['y']} (système {rows.index(r) + 1})" + (" (optionnel)" if l["optional"] else ""), suggest=""))
    total_hz = sum(len(it["hz"]) for it in sung)
    total_cl = sum(len(sr["xs"]) for sr in sysrows)
    structure = dict(source=[f"système {i + 1} : {len(r['labels'])} accords, {len(r['lyrics'])} rangée(s) de paroles" for i, r in enumerate(rows)],
                     cho=[h["label"] for h in _cho.headers(cho)], same=None)
    paroles = dict(total=len(sung), same=None, diffs=[], note=f"{total_hz} hanzi dans le .cho, {total_cl} amas de caractères dans {len(sysrows)} rangée(s) de paroles")
    warnings.extend(f"étiquette ignorée #{i} « {c} » (annotation, alternative, ou vide)" for i, c in skipped if c)
    return dict(results=results, measured=len(labels), structure=structure, paroles=paroles, pinyin=pinyin_report(cho)), None


# =========================================================================== voie image-fr
def _words(text):
    """Mots d'une ligne : les jetons faits de ponctuation seule (« : », « — ») ne
    comptent pas, l'image les colle au mot voisin."""
    return [w for w in text.split() if re.search(r"[A-Za-zÀ-ÿ0-9]", w)]


def _combos(lists):
    if not lists:
        yield ()
        return
    for x in lists[0]:
        for rest in _combos(lists[1:]):
            yield (x,) + rest


def check_image_fr(cho, path, warnings):
    import numpy as np
    im, _ = _ins.load_image(path)
    arr = np.asarray(im)
    H, W = arr.shape
    scale = W / 1786.0
    t_exact, t_relire = 20 * scale, 45 * scale
    # gouttière : colonne centrale presque vide sur ≥ 30 px
    dark_cols = (arr < 128).sum(axis=0)
    gut = None
    run = 0
    for x in range(int(W * 0.3), int(W * 0.7)):
        if dark_cols[x] <= 2:
            run += 1
            if run >= 30 * scale:
                gut = x - run // 2
        else:
            run = 0
    columns = [(0, W)] if gut is None else [(0, gut), (gut, W)]
    # bandes par colonne, dans l'ordre de lecture ; pour chaque bande, le nombre
    # de mots atteignable (min_gap 3..16) ; une bande courte (≤ 8 amas) collée à
    # la suivante PEUT lui servir de bande d'accords : la DP en décide
    bands = []
    for cx0, cx1 in columns:
        col = [b for b in bands_of(arr, cx0, cx1, min_dark=3, min_gap=3) if b[1] - b[0] >= 6]
        for k, b in enumerate(col):
            y0, y1 = b
            counts = {}
            for g in range(3, 17):
                cl = [c for c in clusters_x(arr, y0, y1, cx0, cx1, g) if c[1] - c[0] >= 2]
                counts.setdefault(len(cl), (g, cl))
            n6 = len([c for c in clusters_x(arr, y0, y1, cx0, cx1, 6) if c[1] - c[0] >= 3])
            bands.append(dict(y=b, col=(cx0, cx1), counts=counts, n6=n6, h=y1 - y0 + 1, k=k, ncol=len(col)))

    def can_chord(p, c):
        return (p["col"] == c["col"] and c["y"][0] - p["y"][1] <= 0.9 * max(p["h"], c["h"])
                and p["h"] <= c["h"] + 2 and p["n6"] <= 8)

    def can_follow(p, c):
        return p["col"] == c["col"] and 0 <= c["y"][0] - p["y"][1] <= 2.5 * p["h"]

    sung = [it for it in cho["items"] if it["kind"] in ("sung", "instr")]
    nb = len(bands)
    best = {(0, 0): (0, None)}
    for i in range(len(sung) + 1):
        for j in range(nb + 1):
            if (i, j) not in best:
                continue
            sc, _ = best[(i, j)]

            def push(key, val, back):
                if key not in best or best[key][0] < val:
                    best[key] = (val, back)
            if j < nb:
                push((i, j + 1), sc - 1, ((i, j), "skipimg"))
            if i >= len(sung):
                continue
            push((i + 1, j), sc - 3, ((i, j), "skipcho"))
            it = sung[i]
            if it["kind"] == "instr":
                if j < nb:
                    nch = len([c for c in it["chords"] if not c["spacer"]])
                    push((i + 1, j + 1), sc + (2 if nch in bands[j]["counts"] else -2), ((i, j), ("pair", 0, 1)))
                continue
            nwords = len(_words(it["text"]))
            has_ch = bool([c for c in it["chords"] if not c["spacer"]])
            for with_chord in ((1,) if has_ch else (0,)):
                lj = j + with_chord
                if with_chord and not (j + 1 < nb and can_chord(bands[j], bands[j + 1])):
                    continue
                for span, second_chord in ((1, 0), (2, 0), (2, 1)):
                    if second_chord and not with_chord:
                        continue
                    last = lj + span + second_chord
                    if last > nb:
                        continue
                    seg = [bands[lj]] + ([bands[lj + 1 + second_chord]] if span == 2 else [])
                    if span == 2 and not can_follow(seg[0], seg[1]):
                        continue
                    if second_chord and not can_chord(bands[lj + 1], bands[lj + 2]):
                        continue
                    achievable = any(sum(ws) == nwords for ws in _combos([list(b["counts"]) for b in seg]))
                    gain = (3 if achievable else -2) + (1 if with_chord else 0)
                    push((i + 1, last), sc + gain, ((i, j), ("pair", with_chord, span, second_chord)))
    end = max(((i, j) for (i, j) in best if i == len(sung)), key=lambda k: best[k][0])
    pairs, key = [], end
    while best[key][1] is not None:
        prev, kind = best[key][1]
        if isinstance(kind, tuple):
            pairs.append((prev[0], prev[1], kind[1], kind[2], kind[3] if len(kind) > 3 else 0))
        key = prev
    pairs.reverse()
    results = []
    measured = 0
    paired_cho = set()
    for i, j, with_chord, span, second_chord in pairs:
        it = sung[i]
        chord_band = bands[j] if with_chord else None
        lj = j + with_chord
        seg = [bands[lj]] + ([bands[lj + 1 + second_chord]] if span == 2 else [])
        chord_band2 = bands[lj + 1] if second_chord else None
        paired_cho.add(i)
        if it["kind"] == "instr":
            n = len([c for c in it["chords"] if not c["spacer"]])
            ok = n in seg[0]["counts"]
            measured += len(seg[0]["counts"].get(n, (0, []))[1]) if ok else seg[0]["n6"]
            for c in it["chords"]:
                if not c["spacer"]:
                    results.append(dict(line=it["lineno"], chord=c["name"], cls=EXACT if ok else RELIRE,
                                        detail="ligne instrumentale (noms non lus sur l'image)" if ok else f"ligne instrumentale : {seg[0]['n6']} amas sur l'image pour {n} accords", suggest="", instr=True))
            continue
        words = _words(it["text"])
        cc = [c for c in it["chords"] if not c["spacer"]]
        # répartition des mots sur 1 ou 2 bandes
        split = None
        for ws in _combos([list(b["counts"]) for b in seg]):
            if sum(ws) == len(words):
                split = ws
                break
        if split is None:
            for c in cc:
                results.append(dict(line=it["lineno"], chord=c["name"], cls=RELIRE, detail=f"mots non séparables sur l'image (aucun seuil ne donne {len(words)} mots)", suggest=""))
            continue
        wcl = []
        for b, n in zip(seg, split):
            wcl += [(x0, x1, b) for x0, x1 in b["counts"][n][1]]
        if not chord_band:
            for c in cc:
                results.append(dict(line=it["lineno"], chord=c["name"], cls=ABS_SRC, detail="aucune bande d'accords au-dessus de cette ligne", suggest=""))
            continue
        ch = [c for c in clusters_x(arr, chord_band["y"][0], chord_band["y"][1], *chord_band["col"], max(6, int(6 * scale))) if c[1] - c[0] >= 3]
        if chord_band2:
            ch += [c for c in clusters_x(arr, chord_band2["y"][0], chord_band2["y"][1], *chord_band2["col"], max(6, int(6 * scale))) if c[1] - c[0] >= 3]
        measured += len(ch)
        wstarts = []
        pos = 0
        for w in words:
            k = it["text"].find(w, pos)
            wstarts.append(k)
            pos = k + len(w)

        def cho_x(c):
            idx = c["idx"]
            wi = max([q for q, s0 in enumerate(wstarts) if s0 <= idx] or [0])
            w = words[wi]
            off = min(max(idx - wstarts[wi], 0), len(w))
            a, b, _ = wcl[wi]
            return a + (b - a) * off / max(1, len(w)), wi, off

        for q, c in enumerate(cc):
            if q >= len(ch):
                results.append(dict(line=it["lineno"], chord=c["name"], cls=ABS_SRC, detail="moins de labels sur l'image que d'accords dans le .cho", suggest=""))
                continue
            xs = ch[q][0]
            x_est, wi, off = cho_x(c)
            band_of_label = seg[1] if (chord_band2 and q >= len(ch) - len([c for c in clusters_x(arr, chord_band2["y"][0], chord_band2["y"][1], *chord_band2["col"], max(6, int(6 * scale))) if c[1] - c[0] >= 3])) else seg[0]
            in_band = [w for w, t in enumerate(wcl) if t[2] is band_of_label]
            wj = next((w for w in in_band if wcl[w][0] - 3 <= xs <= wcl[w][1] + 3), None)
            if wj is None:
                wj = min(in_band, key=lambda w: abs(wcl[w][0] - xs))
            w_img = words[wj] if wj < len(words) else "?"
            a, b, _ = wcl[wj]
            rel = (xs - a) / max(1, b - a)
            ci = min(len(w_img) - 1, max(0, int(rel * len(w_img))))
            syl_img = _cho.syllable_index(w_img, ci) if w_img != "?" else 0
            syl_cho = _cho.syllable_index(words[wi], off)
            d = xs - x_est
            if wj == wi and syl_img == syl_cho:
                cls = EXACT
            elif abs(d) <= t_exact:
                cls = EXACT
            elif abs(d) <= t_relire:
                cls = RELIRE
            else:
                cls = DECALE
            est = w_img[:ci] + "‹" + w_img[ci:ci + 1] + "›" + w_img[ci + 1:] if w_img != "?" else "?"
            sylls = _cho.syllables(w_img) if w_img != "?" else ["?"]
            sb = _cho.syllable_bounds(w_img)[syl_img][0] if w_img != "?" else 0
            sug = "" if cls == EXACT else (w_img[:sb] + f"[{c['name']}]" + w_img[sb:] if w_img != "?" else "")
            results.append(dict(line=it["lineno"], chord=c["name"], cls=cls,
                                detail=f"label x={xs} sur « {est} » (syllabe « {sylls[syl_img]} ») ; .cho sur « {words[wi]} » syllabe « {_cho.syllables(words[wi])[syl_cho]} » x≈{int(x_est)} : d={d:+.0f} px (seuils {t_exact:.0f}/{t_relire:.0f})",
                                suggest=sug))
        for q in range(len(cc), len(ch)):
            results.append(dict(line=it["lineno"], chord="?", cls=ABS_CHO, detail=f"label x={ch[q][0]} sans accord dans le .cho (nom illisible sur l'image)", suggest=""))
    for i, it in enumerate(sung):
        if i not in paired_cho:
            for c in it["chords"]:
                if not c["spacer"]:
                    results.append(dict(line=it["lineno"], chord=c["name"], cls=ABS_SRC, detail="ligne du .cho sans bande appariée sur l'image", suggest=""))
    structure = dict(source=[f"{len(columns)} colonne(s), {nb} bandes, {len(pairs)} appariées"],
                     cho=[h["label"] for h in _cho.headers(cho)], same=None)
    paroles = dict(total=len(sung), same=None, diffs=[], note=f"{len(pairs)} lignes appariées par nombre de mots sur {len(sung)}")
    warnings.append("source basse fidélité (image) : noms d'accords non lus, appariés dans l'ordre du .cho ; position ± 1 syllabe")
    return dict(results=results, measured=measured, structure=structure, paroles=paroles, pinyin=None)


# =========================================================================== rapport
def resolve_source(cho, opt):
    cands = []
    if opt:
        cands += [opt, os.path.join(_cho.PARTITIONS, opt)]
    src = cho["meta"].get("source")
    if src:
        cands += [os.path.join(_cho.PARTITIONS, src), src]
    for c in cands:
        if c and os.path.exists(c):
            return c
    return None


def run(slug, source_opt, warnings):
    path = _cho.song_path(slug)
    if not os.path.exists(path):
        return None, f"{_cho.rel(path)} introuvable", 2
    cho = _cho.read_cho(path)
    slug = _cho.slug_of(path)
    lang = cho["language"]
    src = resolve_source(cho, source_opt)
    voie = famille = None
    if src is None:
        if lang == "zh" and os.path.exists(os.path.join(_cho.JIANPU, f"{slug}-p1.webp")):
            voie, famille = "scan-zh", "scan-jianpu"
            src = os.path.join(_cho.JIANPU, f"{slug}-p1.webp")
            warnings.append("aucune source dans {source:} ni --source : mesure sur le calque et l'image public/jianpu/")
        else:
            return None, "aucune source : ajouter {source: <fichier de ../Partitions/>} au .cho ou passer --source", 2
    else:
        info = _ins.inspect_source(src)
        voie, famille = info["voie"], info["famille"]
        warnings.extend(info["avertissements"])
        if info["langue"] in ("fr", "zh") and info["langue"] != lang:
            warnings.append(f"la source semble en {info['langue']}, le .cho est en {lang}")
    if voie == "texte":
        import fitz
        doc = fitz.open(src)
        rep = check_text(cho, doc, famille, lang, warnings)
    elif voie == "scan-zh":
        rep, err = check_scan(cho, slug, warnings)
        if rep is None:
            return None, err, 2
    elif voie == "image-fr":
        rep = check_image_fr(cho, src, warnings)
    else:
        return None, f"voie inconnue pour {src}", 2
    rep.update(slug=slug, source=os.path.basename(src), voie=voie, famille=famille, warnings=warnings)
    counts = {k: 0 for k in CLASSES}
    for r in rep["results"]:
        counts[r["cls"]] += 1
    rep["counts"] = counts
    rep["code"] = 1 if any(counts[k] for k in FAILING) else 0
    return rep, None, rep["code"]


def print_report(rep):
    c = rep["counts"]
    print(f"== {rep['slug']} — source: {rep['source']} (voie: {rep['voie']}, famille: {rep['famille']})")
    print(f"accords: {rep['measured']} mesurés — exact {c[EXACT]} · à relire {c[RELIRE]} · décalé {c[DECALE]} · "
          f"absent du .cho {c[ABS_CHO]} · absent de la source {c[ABS_SRC]} · nom différent {c[NOM]}")
    order = {DECALE: 0, NOM: 1, ABS_CHO: 2, ABS_SRC: 3, RELIRE: 4}
    rows = [r for r in rep["results"] if r["cls"] != EXACT]
    rows.sort(key=lambda r: (r["line"] if r["line"] is not None else 10 ** 6, order.get(r["cls"], 9)))
    for r in rows:
        ln = f"l.{r['line']}" if r["line"] is not None else "—"
        sug = f"  → {r['suggest']}" if r.get("suggest") else ""
        print(f"{ln:<6} [{r['chord']}]  {r['cls']:<20} {r['detail']}{sug}")
    st = rep["structure"]
    if st.get("same") is None:
        print(f"structure: source {' · '.join(st['source'])} — .cho {' · '.join(st['cho'])}")
    elif st["same"]:
        print(f"structure: source {' · '.join(st['source'])} — .cho identique")
    else:
        print(f"structure: source {' · '.join(st['source'])} — .cho {' · '.join(st['cho'])}")
    pa = rep["paroles"]
    if pa.get("same") is None:
        print(f"paroles: {pa.get('note', '')}")
    elif pa["same"] == pa["total"]:
        print(f"paroles: {pa['total']} lignes identiques")
    else:
        print(f"paroles: {pa['same']}/{pa['total']} lignes identiques")
        for d in pa["diffs"]:
            print(f"   l.{d['line']} « {d['cho']} » ≠ source « {d['source']} »")
    py = rep.get("pinyin")
    if not py:
        print("pinyin: —")
    else:
        msg = f"pinyin: {py['lines']} lignes"
        msg += " · comptes justes" if not py["bad_count"] else " · comptes faux : " + ", ".join(f"l.{l} ({w})" for l, w in py["bad_count"])
        msg += f" · {len(py['diffs'])} groupe(s) ≠ pypinyin" + ("" if not py["diffs"] else " (" + ", ".join(f"l.{l} {h} « {b} » ≠ « {a} »" for l, h, b, a in py["diffs"][:8]) + ")")
        print(msg)
    for w in rep.get("warnings", []):
        print(f"⚠ {w}")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("slug", help="slug (content/songs/<slug>.cho) ou chemin d'un .cho")
    ap.add_argument("--source", help="partition (chemin, ou nom dans ../Partitions/) si le .cho n'a pas {source:}")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args(argv)
    warnings = []
    rep, err, code = run(args.slug, args.source, warnings)
    if rep is None:
        if args.json:
            print(json.dumps(dict(slug=args.slug, error=err, warnings=warnings, code=2), ensure_ascii=False))
        else:
            print(f"== {args.slug} — source inexploitable : {err}")
            for w in warnings:
                print(f"⚠ {w}")
        return 2
    if args.json:
        print(json.dumps(rep, ensure_ascii=False, indent=1, default=str))
    else:
        print_report(rep)
    return code


if __name__ == "__main__":
    sys.exit(main())
