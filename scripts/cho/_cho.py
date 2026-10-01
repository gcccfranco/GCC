#!/usr/bin/env python3
"""Socle commun des scripts « Nouveau chant » (scripts/cho/).

Pourquoi un socle : lint, check, draft et pinyin lisent le même .cho et la
même partition ; les tables canoniques (sections, orthographe des accords,
thèmes) doivent être écrites une seule fois pour que les quatre scripts ne
se contredisent jamais. Les décisions viennent de docs/spec-guidelines-cho.md
(grill du 26/09/2026) ; ce module ne fait que les appliquer.

Contenu :
- chemins du dépôt et de ../Partitions ;
- tables canoniques : sections, regex d'accord, normalisation d'orthographe ;
- lecture d'un .cho en lignes (en-tête, sections, lignes chantées avec
  accords indexés, pinyin, lignes instrumentales) ;
- syllabation française (pyphen fr_FR) ;
- pinyin (pypinyin + exceptions de docs/chants/01-format-cho.md) ;
- couche texte d'un PDF : caractères par ligne avec police/taille/couleur,
  famille du PDF, extraction fr (église FPDF, shir.fr) et zh (Finale).
"""
from __future__ import annotations

import json
import os
import re
import unicodedata
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SONGS = os.path.join(ROOT, "content", "songs")
THEMES = os.path.join(ROOT, "content", "themes.json")
JIANPU = os.path.join(ROOT, "public", "jianpu")
PARTITIONS = os.path.normpath(os.path.join(ROOT, "..", "Partitions"))
DOC_FORMAT = os.path.join(ROOT, "docs", "chants", "01-format-cho.md")
DOC_PINYIN_FALLBACK = os.path.join(ROOT, "docs", "chants", "pinyin-exceptions.md")


def rel(path: str) -> str:
    """Chemin relatif au dépôt quand c'est possible (sortie lisible)."""
    try:
        r = os.path.relpath(path, ROOT)
        return r if not r.startswith("..") else path
    except ValueError:
        return path


# --------------------------------------------------------------------------- tables
# type → (directive, libellé fr, partie zh, partie fr du libellé zh)
SECTIONS = {
    "intro": ("start_of_intro", "Intro", "前奏", "Intro"),
    "couplet": ("start_of_verse", "Couplet", "主歌", "Couplet"),
    "pre-refrain": ("start_of_prechorus", "Pré-Refrain", "预备副歌", "Pré-Refrain"),
    "refrain": ("start_of_chorus", "Refrain", "副歌", "Refrain"),
    "post-refrain": ("start_of_postchorus", "Post-Refrain", "后副歌", "Post-Refrain"),
    "pont": ("start_of_bridge", "Pont", "桥段", "Pont"),
    "interlude": ("start_of_intro", "Interlude", "间奏", "Interlude"),
    "final": ("start_of_outro", "Final", "尾声", "Final"),
    "tag": ("start_of_tag", "Tag", None, "Tag"),
}
# Sections sans paroles par nature : l'espaceur `[ ]` y est toléré.
INSTRUMENTAL_TYPES = {"intro", "interlude"}

# Un accord tel que le brief le définit ; on affine seulement en comptant le corpus.
CHORD_RE = re.compile(
    r"^[A-G][#b]?(m|maj7|maj9|m7|m9|m11|7|9|11|13|sus2|sus4|7sus4|9sus4|dim|dim7|aug|"
    r"m7b5|add2|add4|add9|madd9|2|4|5|6|m6|7b9|7#5|7#11|b9)*(/[A-G][#b]?)?$"
)
KEY_RE = re.compile(r"^[A-G][#b]?m?$")

# Orthographes non canoniques d'un même symbole, appliquées au suffixe (jamais à la
# hauteur). Ordre significatif : les parenthèses avant le reste.
SPELLINGS = [
    (re.compile(r"7\((b5|#5|b9|#9|#11)\)"), r"7\1"),
    (re.compile(r"\(b9\)"), "7b9"),
    (re.compile(r"\(#5\)"), "aug"),
    (re.compile(r"\((b5|#9|#11)\)"), r"\1"),
    (re.compile(r"(Maj7|MAJ7|M7|7M(?!9)|Δ7|△7|Δ|△)"), "maj7"),
    (re.compile(r"(Maj9|MAJ9|M9|7M9)"), "maj9"),
    (re.compile(r"°7"), "dim7"),
    (re.compile(r"°"), "dim"),
    (re.compile(r"^o(?=7|$|/)"), "dim"),
    (re.compile(r"ø7?"), "m7b5"),
    (re.compile(r"\+"), "aug"),
    (re.compile(r"sus(?![24\d])"), "sus4"),
]

HANZI_RE = re.compile(r"[㐀-䶿一-鿿]")
FULLWIDTH = "，。！？；：、（）「」『』…—"
HALFWIDTH_PUNCT = re.compile(r"[,.!?;:]")

# Noms en solfège des gravures françaises (01-format-cho.md « Accords ») :
# la hauteur change de nom, le suffixe reste (Lam → Am, Sib → Bb, Sol7 → G7).
SOLFEGE = {"Do": "C", "Ré": "D", "Re": "D", "Mi": "E", "Fa": "F", "Sol": "G", "La": "A", "Si": "B"}
SOLFEGE_RE = re.compile(r"^(Sol|Do|Ré|Re|Mi|Fa|La|Si)(.*)$")


def solfege_to_letter(name: str) -> str:
    """Nom en lettres d'un accord gravé en solfège : `Lam` → `Am`, `Sib` → `Bb`,
    `Sol7/Si` → `G7/B`, `(Do)` → `(C)`. Un nom déjà valide en lettres revient
    tel quel (`Fadd9` commence par « Fa » mais n'est pas du solfège)."""
    def one(tok):
        m = SOLFEGE_RE.match(tok)
        if not m or CHORD_RE.match(tok):
            return tok
        return SOLFEGE[m.group(1)] + m.group(2)
    return "".join(one(p) for p in re.split(r"([/\s()]+)", name))


def is_solfege(name: str) -> bool:
    """Vrai si `name` n'est pas un accord en lettres mais le devient une fois
    le solfège traduit (`Lam`, `Fa#`, `Mi7`) ; faux pour `Am`, `De`, `Sois`."""
    r = normalize_chord(name)
    return not r["valid"] and r["reason"].startswith("nom en solfège")


def _invalid_chord(name: str, canon: str, reason: str) -> dict:
    """Échec de normalisation ; si le nom est du solfège, le dire (E09 parlant)."""
    conv = solfege_to_letter(name)
    if conv != name:
        r = normalize_chord(conv)
        if r["valid"]:
            return dict(canon=name, valid=False, changed=False, reason=f"nom en solfège : écrire « {r['canon']} »")
    return dict(canon=canon, valid=False, changed=False, reason=reason)


def has_hanzi(s: str) -> bool:
    return bool(HANZI_RE.search(s))


def hanzi_only(s: str) -> str:
    return "".join(HANZI_RE.findall(s))


def split_root(name: str):
    """(hauteur, suffixe) : `F#m7/A` → ('F#', 'm7/A')."""
    m = re.match(r"^([A-G][#b]?)(.*)$", name)
    return (m.group(1), m.group(2)) if m else (None, name)


def normalize_chord(raw: str) -> dict:
    """Orthographe canonique d'un accord du .cho.

    Formes acceptées : `X`, `(X)` (optionnel), `X (Y)` (alternative).
    Retourne {canon, valid, changed, reason}. `changed` = l'orthographe a été
    normalisée (avertissement) ; `valid` faux = rien à faire automatiquement
    (erreur). On ne change jamais la hauteur : si la normalisation la modifiait
    (`A(b9)` → `Ab9`), l'accord est déclaré invalide plutôt que corrigé.
    """
    name = raw.strip()
    if not name:
        return dict(canon="", valid=True, changed=False, reason="espaceur")
    if has_hanzi(name):
        return dict(canon=name, valid=False, changed=False, reason="contient des hanzi")
    if re.search(r"(?i)refrain|couplet|pont|chorus|verse|bridge|intro|coda|tag", name):
        return dict(canon=name, valid=False, changed=False, reason="libellé de section entre crochets")
    m = re.match(r"^\(([^()]+)\)$", name)
    if m:
        inner = normalize_chord(m.group(1))
        return dict(inner, canon=f"({inner['canon']})", reason="optionnel " + inner["reason"] if inner["reason"] else "")
    m = re.match(r"^([^\s()]+)\s+\(([^()]+)\)$", name)
    if m:
        a, b = normalize_chord(m.group(1)), normalize_chord(m.group(2))
        return dict(canon=f"{a['canon']} ({b['canon']})", valid=a["valid"] and b["valid"],
                    changed=a["changed"] or b["changed"], reason=(a["reason"] or b["reason"]))
    root, suffix = split_root(name)
    if root is None:
        return _invalid_chord(name, name, "pas de hauteur reconnue")
    canon = suffix
    for rx, rep in SPELLINGS:
        canon = rx.sub(rep, canon)
    canon = root + canon
    root2, _ = split_root(canon)
    if root2 != root or (len(root) == 1 and canon[1:2] in "#b" and suffix[:1] not in "#b"):
        return dict(canon=name, valid=False, changed=False,
                    reason=f"normalisation ambiguë ({name} → {canon} changerait la hauteur)")
    if not CHORD_RE.match(canon):
        return _invalid_chord(name, canon, "hors de l'orthographe autorisée")
    return dict(canon=canon, valid=True, changed=(canon != name), reason="")


def themes_fr() -> list:
    return [t["name_fr"] for t in json.load(open(THEMES, encoding="utf-8"))["themes"]]


# --------------------------------------------------------------------------- lecture .cho
DIRECTIVE_RE = re.compile(r"^\{(\w+)(?::\s*(.*?))?\s*\}$")
CHORD_TOKEN_RE = re.compile(r"\[([^\]]*)\]")


def split_pinyin(raw: str, language: str):
    """Sépare paroles / pinyin comme le site (src/lib/chordpro/parser.ts) :
    première suite de 2 espaces et plus dont la droite n'a ni hanzi ni crochet.
    Retourne (paroles, pinyin ou None, largeur du séparateur)."""
    if language != "zh":
        return raw, None, 0
    for m in re.finditer(r"\s{2,}", raw):
        tail = raw[m.end():]
        if tail and not has_hanzi(tail) and "[" not in tail:
            return raw[: m.start()], (tail.strip() or None), len(m.group())
    return raw, None, 0


def parse_lyric(lyric: str):
    """Texte sans accords + accords : name, idx (index du caractère suivant dans
    le texte), spacer (`[ ]`), col (position dans la ligne brute)."""
    text, chords, pos = "", [], 0
    for m in CHORD_TOKEN_RE.finditer(lyric):
        text += lyric[pos: m.start()]
        name = m.group(1)
        chords.append(dict(name=name, idx=len(text), spacer=(name.strip() == ""), col=m.start()))
        pos = m.end()
    text += lyric[pos:]
    return text, chords


def read_cho(path: str) -> dict:
    """Le .cho en lignes typées, avec numéros de ligne.

    items : blank, comment, directive, header (début de section), end,
    sung (ligne chantée : text, chords, pinyin, section), instr (accords seuls).
    Le pinyin sur la ligne suivante est rattaché à la ligne chantée qui précède,
    comme le fait le parseur du site.
    """
    meta, meta_lines, items = {}, {}, []
    section = None
    in_jianpu = False
    src = open(path, encoding="utf-8").read()
    for n, line in enumerate(src.split("\n"), 1):
        stripped = line.strip()
        if in_jianpu:
            if stripped == "{end_of_jianpu}":
                in_jianpu = False
            continue
        if not stripped:
            items.append(dict(kind="blank", lineno=n, raw=line))
            continue
        if stripped.startswith("#"):
            items.append(dict(kind="comment", lineno=n, raw=line))
            continue
        m = DIRECTIVE_RE.match(stripped) if stripped.startswith("{") and stripped.endswith("}") else None
        if m:
            key, val = m.group(1), (m.group(2) or "").strip()
            if key == "start_of_jianpu":
                in_jianpu = True
                items.append(dict(kind="directive", lineno=n, key=key, value=val, raw=line))
                continue
            if key.startswith("start_of_"):
                section = dict(type=key[9:], directive=key, label=val, lineno=n, sung=0, instr=0)
                items.append(dict(kind="header", lineno=n, directive=key, type=key[9:], label=val,
                                  raw=line, section=section))
                continue
            if key.startswith("end_of_"):
                items.append(dict(kind="end", lineno=n, raw=line))
                section = None
                continue
            if key not in meta:
                meta[key] = val
                meta_lines[key] = n
            items.append(dict(kind="directive", lineno=n, key=key, value=val, raw=line))
            continue
        language = meta.get("language", "fr")
        lyric, pinyin, sep = split_pinyin(line, language)
        text, chords = parse_lyric(lyric)
        only_chords = text.strip() == "" and bool(chords)
        if language == "zh" and section and not has_hanzi(stripped) and "[" not in stripped:
            prev = next((it for it in reversed(items) if it["kind"] in ("sung", "instr", "header")), None)
            if prev and prev["kind"] == "sung" and has_hanzi(prev["text"]) and prev["pinyin"] is None:
                prev["pinyin"] = stripped
                prev["pinyin_lineno"] = n
                prev["pinyin_next"] = True
                continue
        item = dict(kind="instr" if only_chords else "sung", lineno=n, raw=line, lyric=lyric,
                    text=text, chords=chords, pinyin=pinyin, pinyin_sep=sep, pinyin_next=False,
                    pinyin_lineno=n, section=section)
        items.append(item)
        if section:
            section["instr" if only_chords else "sung"] += 1
    return dict(path=path, meta=meta, meta_lines=meta_lines, items=items,
                language=meta.get("language", "fr"))


def sung_lines(cho: dict) -> list:
    return [it for it in cho["items"] if it["kind"] == "sung"]


def instr_lines(cho: dict) -> list:
    return [it for it in cho["items"] if it["kind"] == "instr"]


def headers(cho: dict) -> list:
    return [it for it in cho["items"] if it["kind"] == "header"]


def section_is_instrumental(section) -> bool:
    """Intro, interlude, instrumental : sections sans paroles par nature, ou qui
    n'en contiennent aucune."""
    if section is None:
        return False
    if section["type"] in INSTRUMENTAL_TYPES:
        return True
    if re.search(r"(?i)intro|interlude|instru|solo|前奏|间奏", section["label"]):
        return True
    return section["sung"] == 0


def song_path(slug: str) -> str:
    if slug.endswith(".cho") or os.sep in slug:
        return slug
    return os.path.join(SONGS, slug + ".cho")


def slug_of(path: str) -> str:
    return os.path.splitext(os.path.basename(path))[0]


# --------------------------------------------------------------------------- normalisation zh
def to_simplified(s: str) -> str:
    """繁 → 简 (zhconv) puis pronoms canoniques : 祢 → 你, 祂 → 他."""
    try:
        from zhconv import convert
        s = convert(s, "zh-cn")
    except ImportError:
        pass
    # 著 reste 著 pour zhconv (著作) ; dans un chant c'est la particule 着 (向着, 看着)
    return s.replace("祢", "你").replace("祂", "他").replace("著", "着")


HALF_TO_FULL = {",": "，", ".": "。", "!": "！", "?": "？", ";": "；", ":": "："}


def fullwidth_punct(s: str) -> str:
    return "".join(HALF_TO_FULL.get(c, c) for c in s)


# --------------------------------------------------------------------------- syllabation fr
_PYPHEN = None


def _dic():
    global _PYPHEN
    if _PYPHEN is None:
        import pyphen
        _PYPHEN = pyphen.Pyphen(lang="fr_FR", left=1, right=1)
    return _PYPHEN


APOSTROPHES = "'’"
VOWELS = "aeiouyàâäéèêëîïôöùûüœæ"
ONSETS = {"bl", "br", "cl", "cr", "dr", "fl", "fr", "gl", "gr", "pl", "pr", "tr", "vr",
          "ch", "gn", "ph", "th", "qu", "gu", "sh"}


def syllable_bounds(word: str) -> list:
    """Bornes [début, fin) des syllabes chantées d'un mot.

    Une syllabe par groupe de voyelles (le e muet final compte : il se chante),
    la coupure dans le groupe de consonnes est celle de pyphen quand il en
    donne une, sinon : consonne seule, attaque (bl, tr, ch, qu…) ou double
    consonne → avant, autre groupe → après la première consonne. pyphen seul
    ne suffit pas : il ne coupe pas « briller », « abîme », « amour ».
    L'apostrophe n'est pas une frontière (« l'a-bîme »), le tiret en est une ;
    la ponctuation reste collée à la syllabe voisine.
    """
    if not word:
        return [(0, 0)]
    bounds = []
    for m in re.finditer(r"[^\-]+-?", word):
        piece, off = m.group(), m.start()
        letters = [i for i, c in enumerate(piece) if c.isalpha()]
        core = "".join(piece[i] for i in letters).lower()
        groups = [(g.start(), g.end()) for g in re.finditer(f"[{VOWELS}]+", core)]
        if len(groups) < 2:
            bounds.append((off, off + len(piece)))
            continue
        pyph = set(_dic().positions(core)) if len(core) > 1 else set()
        cuts = []
        for (s0, e0), (s1, e1) in zip(groups, groups[1:]):
            inside = [p for p in pyph if e0 <= p <= s1]
            if inside:
                cuts.append(min(inside))
                continue
            cluster = core[e0:s1]
            if len(cluster) <= 1 or cluster in ONSETS or (len(cluster) == 2 and cluster[0] == cluster[1]):
                cuts.append(e0)
            else:
                cuts.append(e0 + 1)
        starts = [0] + cuts
        for k, s in enumerate(starts):
            i0 = 0 if k == 0 else letters[s]
            i1 = len(piece) if k + 1 == len(starts) else letters[starts[k + 1]]
            bounds.append((off + i0, off + i1))
    fixed = []
    for k, (s, e) in enumerate(bounds):
        s2 = fixed[-1][1] if fixed else 0
        fixed.append((s2, e if k + 1 < len(bounds) else len(word)))
    return fixed


def syllable_index(word: str, pos: int) -> int:
    """Indice de la syllabe de `word` qui contient la position `pos`."""
    b = syllable_bounds(word)
    for k, (s, e) in enumerate(b):
        if s <= pos < e:
            return k
    return len(b) - 1 if pos >= len(word) else 0


def syllables(word: str) -> list:
    return [word[s:e] for s, e in syllable_bounds(word)]


# --------------------------------------------------------------------------- pinyin
def pinyin_exceptions() -> dict:
    """Tableau « | mot | pinyin | » de la section « Exceptions pinyin » de
    docs/chants/01-format-cho.md ; à défaut pinyin-exceptions.md ; à défaut vide."""
    for path in (DOC_FORMAT, DOC_PINYIN_FALLBACK):
        if not os.path.exists(path):
            continue
        text = open(path, encoding="utf-8").read()
        if path == DOC_FORMAT:
            m = re.search(r"^#+.*Exceptions pinyin.*$", text, re.M)
            if not m:
                continue
            text = text[m.end():]
            nxt = re.search(r"^#+ ", text, re.M)
            text = text[: nxt.start()] if nxt else text
        table = {}
        for row in re.finditer(r"^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|", text, re.M):
            mot, py = row.group(1), row.group(2)
            if has_hanzi(mot) and not re.match(r"^-+$", py):
                table[mot] = py
        return table
    return {}


def pinyin_groups(text: str, exceptions: dict | None = None) -> list:
    """Un groupe pinyin (tons en diacritiques) par hanzi de `text` ; le reste est ignoré."""
    from pypinyin import Style, lazy_pinyin

    exc = pinyin_exceptions() if exceptions is None else exceptions
    words = sorted(exc, key=len, reverse=True)
    out = []
    for run in re.findall(r"[\u3400-\u4dbf\u4e00-\u9fff]+", to_simplified(text)):
        pos = 0
        while pos < len(run):
            hit = next((w for w in words if run.startswith(w, pos)), None)
            if hit:
                groups = exc[hit].split()
                out.extend(groups if len(groups) == len(hit) else lazy_pinyin(hit, style=Style.TONE))
                pos += len(hit)
                continue
            nxt = min([run.find(w, pos) for w in words if run.find(w, pos) > pos] or [len(run)])
            out.extend(lazy_pinyin(run[pos:nxt], style=Style.TONE))
            pos = nxt
    return out


def pinyin_line(text: str, exceptions: dict | None = None) -> str:
    return " ".join(pinyin_groups(text, exceptions))


# --------------------------------------------------------------------------- couche texte PDF
def page_lines(page) -> list:
    """Les caractères d'une page groupés par ligne (y0 arrondi au demi-point),
    chacun avec police, taille, couleur. Base de tout ce qui lit un PDF texte."""
    lines = {}
    for block in page.get_text("rawdict")["blocks"]:
        if block["type"] != 0:
            continue
        for line in block["lines"]:
            for span in line["spans"]:
                for ch in span["chars"]:
                    y = round(ch["bbox"][1] * 2) / 2
                    lines.setdefault(y, []).append(dict(
                        x0=ch["bbox"][0], x1=ch["bbox"][2], y0=ch["bbox"][1], y1=ch["bbox"][3],
                        c=ch["c"], font=span["font"], size=round(span["size"], 1),
                        color=span.get("color", 0)))
    return [dict(y=y, chars=sorted(lines[y], key=lambda d: d["x0"])) for y in sorted(lines)]


def tokens(chars: list, gap: float = 1.5) -> list:
    """Mots d'une ligne : coupure sur les blancs et sur les trous horizontaux
    (FPDF pose 'F'@76.5 puis 'D'@197.5 sans espace entre les deux)."""
    toks, cur = [], []
    for ch in chars:
        if ch["c"].isspace():
            if cur:
                toks.append(cur)
                cur = []
            continue
        if cur and ch["x0"] - cur[-1]["x1"] > gap:
            toks.append(cur)
            cur = []
        cur.append(ch)
    if cur:
        toks.append(cur)
    return [dict(x0=t[0]["x0"], x1=t[-1]["x1"], y0=t[0]["y0"], text="".join(c["c"] for c in t),
                 font=t[0]["font"], size=t[0]["size"], color=t[0]["color"]) for t in toks]


FPDF_FOOTER = "Église Protestante Chinoise de Paris"
FPDF_CHORD_COLOR = 0x073967
FPDF_HEADER_COLORS = {0x38761D: "couplet", 0xA61C00: "refrain", 0xA46208: "pont"}
SHIR_CHORD_FONT_HINTS = ("ExtraBold", "XBdCn", "BlBlack")
NOTEHEADS = {"œ", "˙", "w"}
RESTS = {"Œ", "‰", "∑", "≈"}
ZH_SECTION_WORDS = {"intro": "intro", "verse": "couplet", "chorus": "refrain", "bridge": "pont",
                    "pre-chorus": "pre-refrain", "prechorus": "pre-refrain", "interlude": "interlude",
                    "ending": "final", "outro": "final", "coda": "final", "tag": "tag"}


def pdf_profile(doc) -> dict:
    """Famille, langue, lisibilité des hanzi, avertissements — d'après les polices,
    le texte et les métadonnées du PDF."""
    text, fonts, nchars = "", Counter(), 0
    for page in doc:
        text += page.get_text("text")
        for line in page_lines(page):
            for ch in line["chars"]:
                fonts[ch["font"]] += 1
                nchars += 1
    meta = doc.metadata or {}
    creator = (meta.get("creator") or "") + " " + (meta.get("producer") or "") + " " + (meta.get("author") or "")
    warnings = []
    if nchars == 0:
        return dict(kind="pdf-image", famille=None, langue=None, hanzi_lisibles=None, fonts=fonts, warnings=warnings)
    famille = "inconnue"
    music = music_font(fonts)
    cjk_font = any(h in f for f in fonts for h in CJK_FONT_HINTS)
    latin_words = len(re.findall(r"[A-Za-zÀ-ÿ]{3,}", text))
    if FPDF_FOOTER in text or ("FPDF" in creator and any("Helvetica" in f for f in fonts)):
        famille = "eglise-fpdf"
    elif "shir.fr" in text or "shir.fr" in creator or "ChordPro" in creator:
        famille = "shirfr"
    elif music and not has_hanzi(text) and not cjk_font and latin_words >= 20:
        # gravure (Finale, Sibelius…) à paroles latines ; finale-zh reste aux hanzi,
        # lisibles ou non (police CJK présente)
        famille = "gravure-fr"
    elif "Maestro" in fonts:
        famille = "finale-zh"
    langue = "zh" if has_hanzi(text) else ("fr" if re.search(r"[A-Za-zÀ-ÿ]{3,}", text) else "?")
    hanzi_ok = None
    if famille == "finale-zh":
        hanzi_ok = has_hanzi(text)
        if not hanzi_ok:
            warnings.append("hanzi illisibles dans la couche texte (police sans table Unicode) : seuls les x des accords sont exploitables")
            langue = "zh"
    return dict(kind="pdf-texte", famille=famille, langue=langue, hanzi_lisibles=hanzi_ok, fonts=fonts, warnings=warnings)


# ---- fr : église FPDF et shir.fr (rendus ChordPro : l'accord est à l'x exact d'un caractère)
def _is_chord_tok(tok) -> bool:
    return tok["color"] == FPDF_CHORD_COLOR or any(h in tok["font"] for h in SHIR_CHORD_FONT_HINTS)


HEADER_WORD_RE = re.compile(r"^(Pont|Final|Refrain|Couplet|Intro|Interlude|Coda|Pré-?refrain|Pre-?chorus|Tag)\b", re.I)
REPEAT_RE = re.compile(r"^\(?[×x]\s*\d+\)?$")


def _lyric_font(pages_lines) -> tuple:
    """(police, taille) dominante des paroles : la plus fréquente parmi les
    caractères noirs de 14 à 18 pt qui ne sont pas des accords."""
    c = Counter()
    for lines in pages_lines:
        for line in lines:
            for ch in line["chars"]:
                if 14 <= ch["size"] <= 18 and ch["color"] == 0 and not _is_chord_tok(ch) and not ch["c"].isspace():
                    c[(ch["font"], ch["size"])] += 1
    return c.most_common(1)[0][0] if c else (None, None)


def _classify_fr(line, lyric_font):
    toks = tokens(line["chars"])
    if not toks:
        t0 = line["chars"][0] if line["chars"] else None
        return ("blank_lyric" if t0 and (t0["font"], t0["size"]) == lyric_font else "blank"), toks
    text = "".join(c["c"] for c in line["chars"]).rstrip()
    t0 = toks[0]
    if all(_is_chord_tok(t) and t["size"] <= 12.5 for t in toks) and t0["color"] == FPDF_CHORD_COLOR:
        return "suffix", toks
    if all(_is_chord_tok(t) for t in toks) and all(
            normalize_chord(t["text"])["valid"] or REPEAT_RE.match(t["text"]) for t in toks):
        return "chord", toks
    if t0["color"] in FPDF_HEADER_COLORS and "Bold" in t0["font"]:
        return "header", toks
    if HEADER_WORD_RE.match(text.strip()) and t0["size"] <= 12.5:
        return "header", toks
    if REPEAT_RE.match(text.strip()):
        return "repeat", toks
    if (t0["font"], t0["size"]) == lyric_font and t0["color"] == 0:
        return "lyric", toks
    return "other", toks


def _merge_suffixes(chords, suffixes, warnings):
    """FPDF : 'F'@76.5 + '#m'@86.3 (12 pt, 4,3 pt plus bas) → 'F#m'@76.5."""
    for s in suffixes:
        best = min(chords, key=lambda t: abs(t["x1"] - s["x0"]))
        if abs(best["x1"] - s["x0"]) < 1.5:
            best["text"] += s["text"]
            best["x1"] = s["x1"]
        else:
            warnings.append(f"suffixe d'accord orphelin « {s['text']} » x={s['x0']:.1f}")
    return chords


def _refrain_bars(page) -> list:
    """shir.fr : le refrain est marqué par une barre verticale vectorielle."""
    out = []
    for d in page.get_drawings():
        r = d["rect"]
        if r.width <= 3 and r.height >= 40 and r.x0 < 40:
            out.append((r.y0, r.y1))
    return out


def extract_fr(doc) -> dict:
    """Le PDF fr en éléments ordonnés : header, sung (texte + accords avec x et
    index du caractère porteur), instr (accords seuls), repeat ; plus les
    métadonnées lisibles (titre, artiste, tonalité, tempo) et les barres de
    refrain shir.fr. Logique validée sur 7 PDF (audit-fr, 26/09/2026)."""
    pages_lines = [page_lines(p) for p in doc]
    lyric_font = _lyric_font(pages_lines)
    items, warnings, meta = [], [], {}
    bars = []
    for pno, page in enumerate(doc):
        lines = pages_lines[pno]
        for y0, y1 in _refrain_bars(page):
            bars.append((pno + 1, y0, y1))
        cls = [_classify_fr(l, lyric_font) for l in lines]
        if pno == 0:
            _meta_fr(lines, meta)
        i = 0
        while i < len(lines):
            kind, toks = cls[i]
            y = lines[i]["y"]
            if kind in ("header", "repeat"):
                items.append(dict(kind=kind, page=pno + 1, y=y,
                                  text="".join(c["c"] for c in lines[i]["chars"]).strip()))
                i += 1
                continue
            if kind == "blank_lyric":
                items.append(dict(kind="blank", page=pno + 1, y=y, text=""))
                i += 1
                continue
            if kind == "chord":
                chords = [dict(t) for t in toks]
                j = i + 1
                if j < len(lines) and cls[j][0] == "suffix" and 3 < lines[j]["y"] - y < 6:
                    chords = _merge_suffixes(chords, cls[j][1], warnings)
                    j += 1
                repeat = [c for c in chords if REPEAT_RE.match(c["text"])]
                chords = [c for c in chords if not REPEAT_RE.match(c["text"])]
                if j < len(lines) and cls[j][0] == "lyric" and lines[j]["y"] - y < 16:
                    items.append(_sung_fr(pno + 1, y, chords, lines[j]))
                    i = j + 1
                else:
                    items.append(dict(kind="instr", page=pno + 1, y=y,
                                      chords=[dict(name=c["text"], x=round(c["x0"], 1)) for c in chords],
                                      text=" ".join(c["text"] for c in chords)))
                    i = j
                if repeat:
                    items.append(dict(kind="repeat", page=pno + 1, y=y, text=repeat[0]["text"]))
                continue
            if kind == "lyric":
                items.append(_sung_fr(pno + 1, None, [], lines[i]))
            i += 1
    for it in items:
        if it["kind"] == "sung":
            it["in_bar"] = any(p == it["page"] and y0 - 4 <= it["y_lyric"] <= y1 + 4 for p, y0, y1 in bars)
    return dict(items=items, warnings=warnings, meta=meta, bars=bars)


def _meta_fr(lines, meta):
    big = max(lines, key=lambda l: max((c["size"] for c in l["chars"]), default=0), default=None)
    if big and max(c["size"] for c in big["chars"]) >= 18:
        meta["title"] = "".join(c["c"] for c in big["chars"]).strip()
    for line in lines:
        text = "".join(c["c"] for c in line["chars"]).strip()
        t0 = line["chars"][0]
        if not text:
            continue
        if "Oblique" in t0["font"] and t0["size"] == 12 and "artist" not in meta:
            meta["artist"] = text
        if t0["size"] >= 17 and t0["x0"] > 480 and KEY_RE.match(text):
            meta["key"] = text
        m = re.search(r"Tonalit[ée]\s*:\s*([A-G][#b]?m?)", text)
        if m:
            meta["key"] = m.group(1)
        m = re.search(r"(?:♩|q)\s*=\s*(\d{2,3})|(\d{2,3})\s*bpm", text, re.I)
        if m:
            meta["tempo"] = m.group(1) or m.group(2)
        if line["y"] < 60 and t0["size"] in (14.0,) and "artist" not in meta and "title" in meta and text != meta["title"]:
            meta["artist"] = text


def _sung_fr(page, ychord, chords, lyric_line):
    """Ligne chantée du PDF : chaque accord reçoit l'index du caractère le plus
    proche par x0 (les espaces comptent : un accord posé sur un espace ou après
    le dernier caractère est « en l'air »)."""
    chars = lyric_line["chars"]
    while chars and chars[-1]["c"].isspace():
        chars = chars[:-1]
    text = "".join(c["c"] for c in chars)
    res = dict(kind="sung", page=page, y_chord=ychord, y_lyric=lyric_line["y"], text=text, chords=[])
    for c in chords:
        x = c["x0"]
        if chars and x >= chars[-1]["x1"] - 0.5:
            idx, dist, target = len(text), round(x - chars[-1]["x1"], 1), ""
        else:
            idx = min(range(len(chars)), key=lambda k: abs(chars[k]["x0"] - x))
            dist = round(chars[idx]["x0"] - x, 1)
            target = chars[idx]["c"]
        res["chords"].append(dict(name=c["text"], x=round(x, 1), idx=idx, dist=dist, target=target,
                                  air=(target == "" or target.isspace())))
    return res


# ---- zh : exports Finale (赞美之泉) — accord → tête de note → caractère
def extract_zh(doc) -> dict:
    """Systèmes d'un PDF Finale : rangée d'accords (ArialMT + altérations Maestro
    refusionnées par adjacence x), têtes de notes (Maestro), rangée de paroles
    (police CJK, un bbox par caractère), libellés de sections (Geneva).
    Chaque accord reçoit sa note (|Δx| ≤ 0,5 pt) et le caractère centré sous
    elle (|écart| ≤ 4 pt), sinon il est « en l'air » entre deux caractères.
    Logique validée sur 只要有你在我左右 et 荣耀的呼召 (audit mixte, 26/09/2026)."""
    spans, meta, warnings = [], {}, []
    for pno, page in enumerate(doc):
        for b in page.get_text("rawdict")["blocks"]:
            if b["type"] != 0:
                continue
            for l in b["lines"]:
                for s in l["spans"]:
                    spans.append(dict(p=pno + 1, font=s["font"], size=round(s["size"], 1),
                                      x0=s["bbox"][0], y0=s["bbox"][1], x1=s["bbox"][2], y1=s["bbox"][3],
                                      text="".join(c["c"] for c in s["chars"]),
                                      chars=[(c["bbox"][0], c["bbox"][2], c["c"]) for c in s["chars"]]))
    # police des paroles : celle qui porte le plus de hanzi entre 10,5 et 13 pt
    cnt = Counter()
    for s in spans:
        if 10.5 <= s["size"] <= 13:
            cnt[s["font"]] += sum(1 for c in s["text"] if has_hanzi(c))
    lyric_font = cnt.most_common(1)[0][0] if cnt and cnt.most_common(1)[0][1] else None
    if lyric_font is None:
        warnings.append("aucune police de paroles avec des hanzi lisibles")
    chord_spans = [s for s in spans if s["font"] == "ArialMT"]
    acc = [s for s in spans if s["font"] == "Maestro" and s["text"].strip() in ("#", "b") and s["size"] < 15]
    for a in acc:
        near = [c for c in chord_spans if abs(c["x1"] - a["x0"]) < 2.5 and 0 < c["y0"] - a["y0"] < 20]
        if near:
            a["y0"] = near[0]["y0"]
    rows = []
    for t in sorted(chord_spans + acc, key=lambda r: r["y0"]):
        for cr in rows:
            if abs(cr["y"] - t["y0"]) < 4:
                cr["toks"].append(t)
                break
        else:
            rows.append(dict(y=t["y0"], toks=[t]))
    chord_rows = []
    for cr in rows:
        merged = []
        for t in sorted(cr["toks"], key=lambda r: r["x0"]):
            txt = t["text"].replace(" ", "")
            if not txt:
                continue
            if merged and t["x0"] - merged[-1]["x1"] < 2.5:
                merged[-1]["text"] += txt
                merged[-1]["x1"] = t["x1"]
            else:
                merged.append(dict(text=txt, x0=t["x0"], x1=t["x1"], y0=t["y0"], size=t["size"], p=t["p"]))
        chord_rows.append(dict(y=round(min(t["y0"] for t in cr["toks"]), 1), p=cr["toks"][0]["p"],
                               chords=[m for m in merged if normalize_chord(m["text"])["valid"] or "/" in m["text"]]))
    chord_rows = [r for r in chord_rows if r["chords"]]
    chord_rows.sort(key=lambda r: (r["p"], r["y"]))
    lchars = []
    for s in spans:
        if lyric_font and s["font"] == lyric_font and 10.5 <= s["size"] <= 13:
            for x0, x1, c in s["chars"]:
                if not c.isspace():
                    lchars.append(dict(x0=x0, x1=x1, xc=round((x0 + x1) / 2, 1), c=c, y0=s["y0"], p=s["p"]))
    lyric_rows = []
    for ch in sorted(lchars, key=lambda c: (c["p"], c["y0"])):
        for lr in lyric_rows:
            if lr["p"] == ch["p"] and abs(lr["y"] - ch["y0"]) < 3:
                lr["chars"].append(ch)
                break
        else:
            lyric_rows.append(dict(y=ch["y0"], p=ch["p"], chars=[ch]))
    for lr in lyric_rows:
        lr["chars"].sort(key=lambda c: c["x0"])
        lr["text"] = "".join(c["c"] for c in lr["chars"])
    notes = [dict(x0=x0, x1=x1, g=c, y0=s["y0"], p=s["p"], rest=c in RESTS)
             for s in spans if s["font"] == "Maestro" for x0, x1, c in s["chars"] if c in NOTEHEADS or c in RESTS]
    labels = [dict(p=s["p"], x=s["x0"], y=s["y0"], text=s["text"].strip(), kind=ZH_SECTION_WORDS[s["text"].strip().lower()])
              for s in spans if s["text"].strip().lower() in ZH_SECTION_WORDS and s["size"] < 12]
    for lab in labels:
        near = [i for i, cr in enumerate(chord_rows) if cr["p"] == lab["p"] and abs(cr["y"] - lab["y"]) < 30]
        lab["row"] = min(near, key=lambda i: abs(chord_rows[i]["y"] - lab["y"])) if near else -1
    labels.sort(key=lambda l: (l["p"], l["row"], l["x"]))
    voltas = [dict(p=s["p"], x=s["x0"], y=s["y0"], n=s["text"].strip())
              for s in spans if s["font"].startswith("TimesNewRoman") and re.match(r"^[12]\.?$", s["text"].strip())]
    hints = [s["text"].strip() for s in spans if re.search(r"(?i)to chorus|d\.s\.|d\.c\.|fine|al coda", s["text"])]
    systems = []
    for i, cr in enumerate(chord_rows):
        below = [lr for lr in lyric_rows if lr["p"] == cr["p"] and lr["y"] > cr["y"]]
        lr = min(below, key=lambda l: l["y"]) if below else None
        ynext = chord_rows[i + 1]["y"] if i + 1 < len(chord_rows) and chord_rows[i + 1]["p"] == cr["p"] else 9999
        if lr and (lr["y"] - cr["y"] > 120 or lr["y"] > ynext + 30):
            lr = None
        sys_notes = sorted([n for n in notes if n["p"] == cr["p"] and cr["y"] - 5 < n["y0"] < (lr["y"] if lr else ynext)],
                           key=lambda n: n["x0"])
        system = dict(p=cr["p"], chord_y=cr["y"], lyric_y=lr["y"] if lr else None,
                      lyric=lr, text=lr["text"] if lr else "", chords=[],
                      instrumental=any(l["row"] == i and l["kind"] in ("intro", "interlude") for l in labels))
        for ch in cr["chords"]:
            m = dict(name=ch["text"], x=round(ch["x0"], 1), on_note=False, on_char=None, uncertain=False)
            if sys_notes:
                n = min(sys_notes, key=lambda n: abs(n["x0"] - ch["x0"]))
                d = n["x0"] - ch["x0"]
                m["note"], m["note_x"], m["d_note"], m["rest"] = n["g"], round(n["x0"], 1), round(d, 1), n["rest"]
                m["on_note"] = abs(d) <= 3.5 and not n["rest"]
            if lr and lr["chars"]:
                if m["on_note"]:
                    c = min(lr["chars"], key=lambda c: abs(c["xc"] - (m["note_x"] + 3.0)))
                    gap = c["xc"] - (m["note_x"] + 3.0)
                    if abs(gap) < 4.0 and has_hanzi(c["c"]):
                        m["on_char"] = lr["chars"].index(c)
                        m["gap"] = round(gap, 1)
                    elif abs(gap) < 8.0 and has_hanzi(c["c"]):
                        m["on_char"] = lr["chars"].index(c)
                        m["gap"] = round(gap, 1)
                        m["uncertain"] = True
                prev = [k for k, c in enumerate(lr["chars"]) if c["x0"] < ch["x0"] and has_hanzi(c["c"])]
                nxt = [k for k, c in enumerate(lr["chars"]) if c["x0"] >= ch["x0"] and has_hanzi(c["c"])]
                m["prev_char"] = prev[-1] if prev else None
                m["next_char"] = nxt[0] if nxt else None
            system["chords"].append(m)
        systems.append(system)
    for s in spans:
        if s["size"] >= 18 and has_hanzi(s["text"]) and "title" not in meta:
            meta["title"] = s["text"].strip()
        m = re.search(r"(?:♩|q)\s*=\s*(\d{2,3})", s["text"])
        if m:
            meta["tempo"] = m.group(1)
        m = re.match(r"^\s*(?:詞、曲|词、曲|詞曲|词曲|曲)\s*[:：]\s*(.+)$", s["text"])
        if m and "artist" not in meta:
            meta["artist"] = m.group(1).strip()
    return dict(systems=systems, labels=labels, voltas=voltas, hints=hints, meta=meta,
                warnings=warnings, hanzi_ok=lyric_font is not None)


# ---- gravure fr : hymnaires exportés de Finale ou Sibelius (Éditions de l'Emmanuel…)
# accord (solfège) → tête de note → syllabe gravée, dans chaque rangée de couplet
MUSIC_FONTS = ("Petrucci", "Maestro", "Opus", "Bravura", "Sonata", "MusGlyphs", "Emmentaler")
NOT_MUSIC_RE = re.compile(r"Text|Chords")  # OpusTextStd, OpusChordsStd : du texte, pas des notes
CJK_FONT_HINTS = ("LiHei", "LiSong", "PingFang", "Hiragino", "STHeiti", "STSong", "STKai", "STFang", "STXihei",
                  "SimSun", "SimHei", "MingLiU", "KaiTi", "FangSong", "YaHei", "DengXian", "Songti", "Heiti",
                  "AdobeSong", "AdobeHeiti", "AdobeKaiti", "AdobeFangsong", "CJK", "SourceHan", "NotoSansSC",
                  "NotoSerifSC", "NotoSansTC", "NotoSerifTC", "WenQuanYi", "LiGothic", "DFKai")
GRAVURE_LABEL_RE = re.compile(r"^(COUPLETS?|REFRAIN|PONT|FINAL|CODA|INTRO|INTERLUDE)\b", re.I)
GRAVURE_LABEL_KIND = {"couplet": "couplet", "couplets": "couplet", "refrain": "refrain", "pont": "pont",
                      "final": "final", "coda": "final", "intro": "intro", "interlude": "interlude"}
# seuils (pt) de 02-placement-accords.md : accord → tête ; tête → syllabe exact / à relire
GRAVURE_NOTE_PT, GRAVURE_SYL_PT, GRAVURE_SYL_RELIRE_PT = 5.0, 6.0, 12.0
MAJOR_SHARPS = ["C", "G", "D", "A", "E", "B", "F#", "C#"]
MAJOR_FLATS = ["C", "F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"]
RELATIVE_MINOR = {"C": "Am", "G": "Em", "D": "Bm", "A": "F#m", "E": "C#m", "B": "G#m", "F#": "D#m", "C#": "A#m",
                  "F": "Dm", "Bb": "Gm", "Eb": "Cm", "Ab": "Fm", "Db": "Bbm", "Gb": "Ebm", "Cb": "Abm"}


def music_font(fonts):
    """Police de musique la plus fréquente (têtes de notes), hors variantes texte."""
    for f, _ in Counter(fonts).most_common():
        if any(m in f for m in MUSIC_FONTS) and not NOT_MUSIC_RE.search(f):
            return f
    return None


def key_from_signature(sharps: int, flats: int, final):
    """Tonalité déduite de l'armure et de l'accord final (01-format-cho.md) : la
    majeure de l'armure si l'accord final en est la tonique, sa relative
    mineure si c'est la sienne, sinon None (à trancher à la main)."""
    if (sharps and flats) or sharps > 7 or flats > 7 or not final:
        return None
    major = MAJOR_SHARPS[sharps] if sharps else MAJOR_FLATS[flats]
    root, suffix = split_root(final)
    if root is None:
        return None
    tonic = root + ("m" if re.match(r"m(?!aj)", suffix) else "")
    if tonic == major:
        return major
    if tonic == RELATIVE_MINOR[major]:
        return tonic
    return None


def gravure_chord(text: str):
    """Nom en lettres si `text` est un accord gravé (solfège ou lettres), sinon None."""
    t = text.strip()
    if not t:
        return None
    r = normalize_chord(solfege_to_letter(t))
    return r["canon"] if r["valid"] else None


def _gravure_tokens(span) -> list:
    """Morceaux d'un span de texte : coupure sur les blancs, le caractère de
    contrôle \\x01 et les tirets (un tiret devient un jeton « - » à part), avec
    la position de chaque morceau (`chan-te ta lou -` → chan · - · te · ta · lou · -)."""
    toks, cur = [], []

    def flush():
        if cur:
            toks.append(dict(text="".join(c["c"] for c in cur), x0=cur[0]["x0"], x1=cur[-1]["x1"], chars=list(cur)))
            del cur[:]
    for ch in span["chars"]:
        if ch["c"].isspace() or ch["c"] == "\x01":
            flush()
        elif ch["c"] == "-":
            flush()
            toks.append(dict(text="-", x0=ch["x0"], x1=ch["x1"], chars=[ch]))
        else:
            cur.append(ch)
    flush()
    return toks


def _gravure_pieces(spans, lyric_size) -> list:
    """Morceaux de texte à la taille des paroles : texte NFKC (ﬁ → fi), apostrophe
    droite, étendue des lettres seules (sans ponctuation) pour mesurer le centre."""
    out = []
    for s in spans:
        if abs(s["size"] - lyric_size) > 1.0:
            continue
        for t in _gravure_tokens(s):
            letters = [c for c in t["chars"] if c["c"].isalnum()]
            out.append(dict(p=s["p"], y0=s["y0"], bold=s["bold"], x0=t["x0"], x1=t["x1"], cont=False,
                            text=unicodedata.normalize("NFKC", t["text"]).replace("’", "'"),
                            lx0=letters[0]["x0"] if letters else None, lx1=letters[-1]["x1"] if letters else None))
    return out


def _gravure_rows(pieces) -> list:
    """Rangées d'un système : morceaux groupés par y (± 1,5 pt) puis triés par x ;
    dédoublonnés (le faux gras de Finale grave « Sois » deux fois au même x) ;
    tirets absorbés (`Sei-`, `é -`, `-` seul : la syllabe continue le mot) ;
    numéro `1.` en tête retiré (rangée de couplet)."""
    rows = []
    for pc in sorted(pieces, key=lambda q: (q["y0"], q["x0"])):
        for r in rows:
            if abs(r["y"] - pc["y0"]) <= 1.5:
                r["raw"].append(pc)
                break
        else:
            rows.append(dict(y=pc["y0"], raw=[pc]))
    for r in rows:
        items, num = [], None
        for pc in sorted(r["raw"], key=lambda q: q["x0"]):
            if pc["text"] == "-":
                if items:
                    items[-1]["cont"] = True
                continue
            if items and items[-1]["text"] == pc["text"] and abs(items[-1]["x0"] - pc["x0"]) < 1.0:
                continue
            if not items and num is None and re.match(r"^\d+\.$", pc["text"]):
                num = int(pc["text"][:-1])
                continue
            items.append(pc)
        r["num"], r["pieces"] = num, items
        r["bold"] = bool(items) and all(pc["bold"] for pc in items)
    return rows


def _gravure_row_text(pieces) -> str:
    """Texte d'une rangée, mots entiers (tirets de syllabation retirés) ; chaque
    morceau reçoit idx (début dans le texte), start/end (ses lettres seules)."""
    text = ""
    for k, pc in enumerate(pieces):
        if k and not pieces[k - 1]["cont"]:
            text += " "
        pc["idx"] = len(text)
        letters = [i for i, c in enumerate(pc["text"]) if c.isalnum()]
        pc["start"] = pc["idx"] + letters[0] if letters else None
        pc["end"] = pc["idx"] + letters[-1] + 1 if letters else None
        text += pc["text"]
    return text


def _gravure_syllable(chord, pieces) -> dict:
    """La syllabe gravée sous la note de l'accord dans une rangée : la plus proche
    par x0 ou par centre des lettres (Finale centre les syllabes larges et cale
    à gauche la première d'une rangée numérotée). ≤ 6 pt : exact ; 6–12 pt : à
    relire ; au-delà : aucune syllabe sous la note (tenue) → après la précédente."""
    syl = [q for q in pieces if q.get("start") is not None]
    if not syl or chord.get("note_x") is None:
        return dict(idx=None)
    nx, ncx = chord["note_x"], chord["note_cx"]

    def dist(q):
        return min(abs(q["lx0"] - nx), abs((q["lx0"] + q["lx1"]) / 2 - ncx))
    q = min(syl, key=dist)
    d = round(dist(q), 1)
    out = dict(syl=q["text"], d_syl=d, held=False, uncertain=False, why="")
    if d <= GRAVURE_SYL_PT:
        out.update(idx=q["start"], end=q["end"])
    elif d <= GRAVURE_SYL_RELIRE_PT:
        out.update(idx=q["start"], end=q["end"], uncertain=True, why=f"syllabe « {q['text']} » à {d:.1f} pt de la note")
    else:
        prev = [q2 for q2 in syl if q2["lx0"] < nx]
        if prev:
            q2 = prev[-1]
            out.update(idx=q2["end"], end=q2["end"], syl=q2["text"], held=True, uncertain=True,
                       why=f"aucune syllabe sous la note (« {q2['text']} » tenue) ; la plus proche « {q['text']} » est à {d:.1f} pt")
        else:
            out.update(idx=q["start"], end=q["end"], uncertain=True,
                       why=f"aucune syllabe sous la note ; la plus proche « {q['text']} » est à {d:.1f} pt")
    if chord.get("between"):
        out["uncertain"] = True
        out["why"] = f"label entre deux notes (la plus proche à {chord['d_note']:.1f} pt)" + (" ; " + out["why"] if out["why"] else "")
    return out


def extract_gravure_fr(doc) -> dict:
    """Systèmes d'une gravure fr : accords (Helvetica au-dessus de la portée, en
    solfège ou en lettres), têtes de notes de la portée du chant (police de
    musique, un x par caractère), rangées de paroles numérotées `1.` `2.` …
    (couplets empilés) ou rangée unique, phrase commune gravée en gras une fois
    par système et rattachée à chaque rangée, libellés COUPLETS / REFRAIN.
    Chaque accord reçoit sa tête (≤ 5 pt par le bord gauche ou par le centre,
    sinon « entre deux notes ») et, dans chaque rangée, la syllabe sous cette
    tête (`_gravure_syllable`). Métadonnées :
    titre (plus grand corps), tempo, auteur des crédits, armure + accord final.
    Logique mesurée sur « Que ma bouche chante ta louange » (Emmanuel, 26/09/2026)."""
    spans = []
    for pno, page in enumerate(doc):
        for b in page.get_text("rawdict")["blocks"]:
            if b["type"] != 0:
                continue
            for l in b["lines"]:
                for s in l["spans"]:
                    spans.append(dict(p=pno + 1, font=s["font"], size=round(s["size"], 1),
                                      bold=("Bold" in s["font"] or bool(s["flags"] & 16)),
                                      x0=s["bbox"][0], y0=s["bbox"][1], x1=s["bbox"][2], y1=s["bbox"][3],
                                      text="".join(c["c"] for c in s["chars"]),
                                      chars=[dict(c=c["c"], x0=c["bbox"][0], x1=c["bbox"][2]) for c in s["chars"]]))
    warnings, meta = [], {}
    fonts = Counter(s["font"] for s in spans for c in s["chars"] if not c["c"].isspace())
    music = music_font(fonts)
    if music is None:
        warnings.append("aucune police de musique (Petrucci, Maestro, Opus…) : pas de têtes de notes à mesurer")
    mspans = [s for s in spans if s["font"] == music]
    notes = [dict(p=s["p"], x=c["x0"], cx=(c["x0"] + c["x1"]) / 2, y0=s["y0"], g=c["c"])
             for s in mspans for c in s["chars"] if c["c"] in NOTEHEADS]
    clefs = [dict(p=s["p"], x=s["x0"], x1=s["x1"], y0=s["y0"], g=s["text"].strip())
             for s in mspans if s["text"].strip() in ("&", "?")]
    accidentals = [dict(p=s["p"], x=c["x0"], y0=s["y0"], g=c["c"]) for s in mspans for c in s["chars"] if c["c"] in "#b"]
    timesig = [dict(p=s["p"], x=s["x0"], y0=s["y0"]) for s in mspans if s["text"].strip() in ("c", "C") or s["text"].strip().isdigit()]
    tspans = [s for s in spans if s["font"] != music]
    sizes = Counter(s["size"] for s in tspans for c in s["chars"] if not c["c"].isspace())
    lyric_size = sizes.most_common(1)[0][0] if sizes else 0
    pieces = _gravure_pieces(tspans, lyric_size)
    labels = []
    for s in tspans:
        m = GRAVURE_LABEL_RE.match(s["text"].strip())
        if m and s["bold"] and s["size"] < lyric_size - 0.3:
            labels.append(dict(p=s["p"], x=s["x0"], y0=s["y0"], text=s["text"].strip(), kind=GRAVURE_LABEL_KIND[m.group(1).lower()]))
    systems = []
    for pno, page in enumerate(doc):
        p = pno + 1
        trebles = sorted([c for c in clefs if c["p"] == p and c["g"] == "&"], key=lambda c: c["y0"])
        basses = sorted([c for c in clefs if c["p"] == p and c["g"] == "?"], key=lambda c: c["y0"])
        for i, cl in enumerate(trebles):
            y_top = cl["y0"] - 30
            y_bot = trebles[i + 1]["y0"] - 30 if i + 1 < len(trebles) else page.rect.height
            bass = next((b for b in basses if cl["y0"] < b["y0"] < y_bot), None)
            pcs = [q for q in pieces if q["p"] == p and y_top <= q["y0"] < y_bot]
            chords = []
            for q in pcs:
                if q["y0"] < cl["y0"] + 8 and not q["bold"]:
                    name = gravure_chord(q["text"])
                    if name:
                        cx = (q["lx0"] + q["lx1"]) / 2 if q["lx0"] is not None else (q["x0"] + q["x1"]) / 2
                        chords.append(dict(name=name, raw=q["text"], x=round(q["x0"], 1), cx=cx, y0=q["y0"]))
            chords.sort(key=lambda c: c["x"])
            lyr = [q for q in pcs if q["y0"] >= cl["y0"] + 20 and (bass is None or q["y0"] < bass["y0"] + 15)]
            rows = _gravure_rows(lyr)
            numbered = sorted([r for r in rows if r["num"] is not None], key=lambda r: r["num"])
            if numbered:
                main, common = numbered, [q for r in rows if r["num"] is None and r["bold"] for q in r["pieces"]]
                for r in rows:
                    if r["num"] is None and not r["bold"] and r["pieces"]:
                        warnings.append(f"p{p} système {len(systems) + 1} : rangée sans numéro ignorée « "
                                        + " ".join(q["text"] for q in r["pieces"]) + " »")
            else:
                main, common = sorted([r for r in rows if r["pieces"]], key=lambda r: r["y"]), []
            for k, r in enumerate(main):
                r["n"] = k + 1
                own = sorted(r["pieces"], key=lambda q: q["x0"])
                extra = sorted(common, key=lambda q: q["x0"])
                if extra and own and extra[0]["x0"] < own[-1]["x0"]:
                    warnings.append(f"p{p} système {len(systems) + 1} rangée {k + 1} : la phrase commune chevauche la rangée en x")
                r["pieces"] = [dict(q) for q in sorted(own + extra, key=lambda q: q["x0"])]
                r["text"] = _gravure_row_text(r["pieces"])
            n_bot = (main[0]["y"] - 3) if main else (bass["y0"] - 30 if bass else y_bot)
            tn = sorted([n for n in notes if n["p"] == p and y_top <= n["y0"] < n_bot], key=lambda n: n["x"])
            if not tn:
                warnings.append(f"p{p} système {len(systems) + 1} : aucune tête de note sur la portée du chant")
            for c in chords:
                if tn:
                    # Finale centre le label sur la tête (« Lam » : bord gauche à 6,5 pt,
                    # centre à 1 pt) : la plus petite des deux distances fait foi
                    def d_of(n, c=c):
                        return min(abs(n["x"] - c["x"]), abs(n["cx"] - c["cx"]))
                    n = min(tn, key=d_of)
                    c["note_x"], c["note_cx"], c["d_note"] = round(n["x"], 1), n["cx"], round(d_of(n), 1)
                    c["between"] = c["d_note"] > GRAVURE_NOTE_PT
                else:
                    c["note_x"], c["note_cx"], c["d_note"], c["between"] = None, None, None, True
                c["rows"] = {r["n"]: _gravure_syllable(c, r["pieces"]) for r in main}
            systems.append(dict(p=p, i=len(systems) + 1, clef=cl, chords=chords, rows=main, notes=tn, label=""))
    if not systems:
        warnings.append("aucune clé de sol dans la police de musique : aucun système")
    # sections : un libellé (COUPLETS, REFRAIN…) ouvre un bloc de systèmes
    events = sorted([(l["p"], l["y0"], "label", l) for l in labels] + [(s["p"], s["clef"]["y0"], "system", s) for s in systems],
                    key=lambda e: (e[0], e[1]))
    blocks, cur = [], None
    for p, y, what, obj in events:
        if what == "label":
            cur = dict(kind=obj["kind"], text=obj["text"], systems=[])
            blocks.append(cur)
        else:
            if cur is None:
                cur = dict(kind="couplet", text="", systems=[])
                blocks.append(cur)
            cur["systems"].append(obj)
            obj["label"] = cur["text"]
    blocks = [b for b in blocks if b["systems"]]
    counts, seen, structure = Counter(), Counter(), []
    for b in blocks:
        b["nrows"] = max((len(s["rows"]) for s in b["systems"]), default=0)
        counts[b["kind"]] += b["nrows"]
    for b in blocks:
        b["labels"] = []
        for n in range(1, b["nrows"] + 1):
            seen[b["kind"]] += 1
            fr = SECTIONS[b["kind"]][1]
            label = f"{fr} {seen[b['kind']]}" if counts[b["kind"]] > 1 else fr
            b["labels"].append(label)
            structure.append(dict(kind=b["kind"], label=label))
    # métadonnées
    page_text = "\n".join(page.get_text("text") for page in doc)
    big = [s for s in spans if s["p"] == 1 and s["font"] != music and s["text"].strip()]
    if big:
        mx = max(s["size"] for s in big)
        title = max([s for s in big if s["size"] == mx], key=lambda s: len(s["text"].strip()))
        meta["title"] = title["text"].strip().replace("’", "'")
    m = re.search(r"[q♩]\s*=\s*(\d{2,3})", page_text)
    if m:
        meta["tempo"] = m.group(1)
    m = re.search(r"(?:Paroles et musique|Paroles & musique|Musique|Auteur)\s*:\s*([^(\n]+)", page_text)
    if m:
        meta["artist"] = m.group(1).strip().replace("’", "'")
    meta["solfege"] = any(c["raw"] != c["name"] and SOLFEGE_RE.match(c["raw"]) for s in systems for c in s["chords"])
    meta["key_graved"] = bool(re.search(r"\b1\s*=\s*[A-G]|Tonalit[ée]\s*:", page_text))
    sharps = flats = 0
    if systems:
        first = systems[0]
        cl = first["clef"]
        stop = min([t["x"] for t in timesig if t["p"] == first["p"] and abs(t["y0"] - cl["y0"]) < 25]
                   + [n["x"] for n in first["notes"][:1]] + [cl["x1"] + 60])
        arm = [a for a in accidentals if a["p"] == first["p"] and abs(a["y0"] - cl["y0"]) < 25 and cl["x1"] - 2 <= a["x"] < stop]
        sharps, flats = sum(1 for a in arm if a["g"] == "#"), sum(1 for a in arm if a["g"] == "b")
    last = next((s for s in reversed(systems) if s["chords"]), None)
    meta["armure"] = dict(dieses=sharps, bemols=flats)
    meta["final"] = last["chords"][-1]["name"] if last else None
    meta["final_raw"] = last["chords"][-1]["raw"] if last else None
    meta["key"] = key_from_signature(sharps, flats, meta["final"]) if not meta["key_graved"] else None
    return dict(systems=systems, blocks=blocks, structure=structure, labels=labels, meta=meta,
                warnings=warnings, lyric_size=lyric_size, music=music)


def gravure_lines(ex) -> list:
    """Lignes chantées dans l'ordre du .cho (01-format-cho.md, couplets empilés) :
    couplet n = rangée n de chaque système du bloc, bout à bout, une ligne par
    système, phrase commune comprise ; refrain = ses systèmes. Chaque accord
    porte l'index (idx, end_idx) de la syllabe gravée sous sa note."""
    out = []
    for b in ex["blocks"]:
        for n in range(1, b["nrows"] + 1):
            for s in b["systems"]:
                row = next((r for r in s["rows"] if r["n"] == n), None)
                if row is None:
                    ex["warnings"].append(f"p{s['p']} système {s['i']} : pas de rangée {n}")
                    continue
                chords = []
                for c in s["chords"]:
                    m = c["rows"].get(n) or {}
                    if m.get("idx") is None:
                        ex["warnings"].append(f"p{s['p']} système {s['i']} : accord {c['raw']} x={c['x']:.1f} sans syllabe (pas de tête de note)")
                        continue
                    chords.append(dict(name=c["name"], raw=c["raw"], x=c["x"], note_x=c["note_x"], d_note=c["d_note"],
                                       idx=m["idx"], end_idx=m["end"], syl=m["syl"], d_syl=m["d_syl"],
                                       uncertain=m["uncertain"], held=m["held"], why=m["why"]))
                out.append(dict(kind=b["kind"], label=b["labels"][n - 1], n=n, page=s["p"], system=s["i"],
                                y=row["y"], text=row["text"], chords=chords))
    return out
