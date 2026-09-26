#!/usr/bin/env python3
"""Nature d'une partition source : texte ou image, fr ou zh, famille, voie.

Pourquoi : la méthode de mesure dépend entièrement de la source (rendu
ChordPro de l'église, shir.fr, export Finale, scan 简谱, feuille Word, capture
d'écran). Se tromper de voie, c'est mesurer du bruit. Ce script dit laquelle
prendre et signale ce qui rendra la mesure fragile : logo pris pour un scan,
hanzi illisibles, photo inclinée, étiquettes trop petites, plusieurs
tonalités dans le nom du fichier.

Usage (depuis GCCLouange/) :
    python3 scripts/cho/inspect.py "../Partitions/Abba Père.pdf"
    python3 scripts/cho/inspect.py "../Partitions/安静 简谱.jpg" --json

Familles : eglise-fpdf · shirfr · finale-zh · gravure-fr (hymnaire Finale ou
Sibelius : police de musique + paroles latines, accords en solfège) ·
scan-jianpu · word-scan · capture-mono · inconnue. Voies : texte · scan-zh ·
image-fr. `notes` (JSON) : ce que la voie devra faire de plus (accords en
solfège, tonalité non gravée).
"""
from __future__ import annotations

import argparse
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

IMAGE_EXT = (".jpg", ".jpeg", ".png", ".gif", ".webp", ".tif", ".tiff", ".bmp")


def key_tokens(name: str) -> list:
    base = os.path.splitext(os.path.basename(name))[0]
    return re.findall(r"(?<![A-Za-zÀ-ÿ])([A-G][#b]?m?)(?![A-Za-zÀ-ÿ])", base)


def load_image(path: str):
    """Image en niveaux de gris : le fichier lui-même, ou l'image embarquée d'un
    PDF scanné (la plus grande de la page 1)."""
    from PIL import Image
    if path.lower().endswith(".pdf"):
        import fitz
        doc = fitz.open(path)
        page = doc[0]
        best = None
        for info in page.get_images(full=True):
            if best is None or info[2] * info[3] > best[2] * best[3]:
                best = info
        if best is not None:
            raw = doc.extract_image(best[0])
            import io
            im = Image.open(io.BytesIO(raw["image"]))
        else:
            pix = page.get_pixmap(dpi=200, colorspace=fitz.csGRAY)
            im = Image.frombytes("L", [pix.width, pix.height], pix.samples)
        pages = len(doc)
    else:
        im = Image.open(path)
        pages = getattr(im, "n_frames", 1)
    if im.mode in ("P", "RGBA", "LA"):
        im = Image.alpha_composite(Image.new("RGBA", im.size, (255, 255, 255, 255)), im.convert("RGBA"))
    return im.convert("L"), pages


def skew_deg(im) -> float:
    """Inclinaison (°) : l'angle qui rend le profil des lignes le plus contrasté."""
    import numpy as np
    from PIL import Image
    small = im.copy()
    small.thumbnail((900, 900 * 4))
    best = (None, 0.0)
    for tenth in range(-40, 41, 5):
        a = tenth / 10
        rot = small.rotate(a, resample=Image.BILINEAR, expand=False, fillcolor=255)
        prof = (np.asarray(rot) < 128).sum(axis=1).astype(float)
        v = float(prof.var())
        if best[0] is None or v > best[0]:
            best = (v, a)
    return best[1]


def bands(arr, min_dark=3, min_gap=4):
    import numpy as np
    dark = (arr < 128).sum(axis=1)
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


def clusters(arr, y0, y1, min_gap):
    import numpy as np
    d = (arr[y0:y1 + 1, :] < 128).sum(axis=0)
    cols = np.where(d >= 1)[0]
    out = []
    if len(cols) == 0:
        return out
    s = p = cols[0]
    for c in cols[1:]:
        if c - p > min_gap:
            out.append((int(s), int(p)))
            s = c
        p = c
    out.append((int(s), int(p)))
    return out


def grid_score(arr, text_bands):
    """Capture d'écran monospace : les débuts de lettres de toutes les lignes
    tombent sur une même grille (x ≡ phase mod pas). Retourne (part des
    lettres sur la grille, pas en px) ; un scan Word reste sous 0,5."""
    import numpy as np
    xs = []
    for y0, y1 in text_bands:
        xs += [c[0] for c in clusters(arr, y0, y1, 1)]
    xs = np.array(xs, dtype=float)
    if len(xs) < 40:
        return 0.0, None
    best = (0.0, None)
    for p10 in range(120, 700, 2):
        p = p10 / 10
        hist, _ = np.histogram((xs % p) / p, bins=10, range=(0, 1))
        sc = (hist + np.roll(hist, 1)).max() / len(xs)
        if sc > best[0]:
            best = (float(sc), p)
    return best


def inventory_label_height(path: str):
    """Hauteur des étiquettes du calque si la source est déjà inventoriée
    (public/jianpu/index.json → chords.json[slug].labelH)."""
    try:
        idx = json.load(open(os.path.join(_cho.JIANPU, "index.json"), encoding="utf-8"))
        chords = json.load(open(os.path.join(_cho.JIANPU, "chords.json"), encoding="utf-8"))
    except (OSError, ValueError):
        return None
    base = os.path.basename(path)
    for slug, e in idx.items():
        if base in [s.strip() for s in e.get("source", "").split(",")] and slug in chords:
            return chords[slug].get("labelH")
    return None


def inspect_image(path: str, res: dict):
    import numpy as np
    im, pages = load_image(path)
    res["pages"] = pages
    res["largeur"], res["hauteur"], res["unite"] = im.size[0], im.size[1], "px"
    name_zh = _cho.has_hanzi(os.path.basename(path))
    res["langue"] = "zh" if name_zh else "fr"
    deg = skew_deg(im)
    res["inclinaison_deg"] = deg
    if abs(deg) > 3:
        res["avertissements"].append(f"inclinaison de {deg:+.1f}° : demander un meilleur scan (ou redresser avant le calque)")
    arr = np.asarray(im)
    bs = bands(arr)
    text_like = []
    for y0, y1 in bs:
        h = y1 - y0 + 1
        cl = [c for c in clusters(arr, y0, y1, 6) if c[1] - c[0] >= 3]
        if 8 <= h <= 60 and len(cl) >= 3:
            text_like.append((y0, y1, len(cl), sorted(c[1] - c[0] for c in cl)[len(cl) // 2]))
    if name_zh:
        res["famille"], res["voie"] = "scan-jianpu", "scan-zh"
        h = inventory_label_height(path)
        scale = min(1.0, 1600 / im.size[0])
        if h is None:
            # étiquettes = bandes courtes à amas peu nombreux (au-dessus des chiffres)
            heights = [y1 - y0 + 1 for y0, y1, n, med in text_like if n <= 14 and med <= 3 * (y1 - y0 + 1)]
            if heights:
                h = sorted(heights)[len(heights) // 2] * scale
        if h is not None:
            res["hauteur_etiquettes_px"] = int(round(h))
            if h < 15:
                res["avertissements"].append(f"étiquettes d'accords ≈ {h:.0f} px dans le repère du calque (< 15) : demander un meilleur scan")
    else:
        wide = sorted(text_like, key=lambda t: -t[2])[:10]
        score, pitch = grid_score(arr, [(t[0], t[1]) for t in wide])
        res["grille_monospace"] = dict(score=round(score, 2), pas_px=pitch)
        res["famille"] = "capture-mono" if score >= 0.7 else "word-scan"
        res["voie"] = "image-fr"
    return res


def inspect_pdf_text(path: str, res: dict):
    import fitz
    doc = fitz.open(path)
    prof = _cho.pdf_profile(doc)
    page = doc[0]
    res["pages"] = len(doc)
    res["largeur"], res["hauteur"], res["unite"] = round(page.rect.width, 1), round(page.rect.height, 1), "pt"
    if prof["kind"] == "pdf-image":
        return inspect_image(path, res)
    res["kind"] = "pdf-texte"
    res["famille"] = prof["famille"]
    res["langue"] = prof["langue"]
    res["hanzi_lisibles"] = prof["hanzi_lisibles"]
    res["voie"] = "texte"
    res["avertissements"] += prof["warnings"]
    if prof["famille"] == "gravure-fr":
        ex = _cho.extract_gravure_fr(doc)
        if ex["meta"].get("solfege"):
            res["notes"].append("accords en solfège")
        if not ex["meta"].get("key_graved"):
            res["notes"].append("tonalité non gravée : armure + accord final")
        res["avertissements"] += ex["warnings"]
    for info in page.get_images(full=True):
        for r in page.get_image_rects(info[0]):
            if r.width < 100 and r.height < 100:
                res["avertissements"].append(
                    f"image embarquée {info[2]}×{info[3]} px affichée en {r.width:.0f}×{r.height:.0f} pt : un logo, pas un scan")
            else:
                res["avertissements"].append(f"image embarquée {info[2]}×{info[3]} px sur une page à couche texte : vérifier que la couche texte porte bien la partition")
    if prof["famille"] == "inconnue":
        res["avertissements"].append("famille inconnue : la voie texte s'applique si les accords et paroles sont des polices distinctes ; vérifier check.py")
    return res


def inspect_source(path: str) -> dict:
    res = dict(source=_cho.rel(path), kind=None, pages=None, largeur=None, hauteur=None, unite=None,
               langue="?", famille="inconnue", hanzi_lisibles=None, inclinaison_deg=None,
               hauteur_etiquettes_px=None, voie=None, notes=[], avertissements=[])
    keys = key_tokens(path)
    if len(set(keys)) > 1:
        res["avertissements"].append(f"plusieurs tonalités possibles dans le nom : {', '.join(keys)} — Timothée dit laquelle")
    if path.lower().endswith(".pdf"):
        res["kind"] = "pdf-texte"
        inspect_pdf_text(path, res)
        if res["kind"] is None or res["voie"] in ("scan-zh", "image-fr"):
            res["kind"] = "pdf-image"
    elif path.lower().endswith(IMAGE_EXT):
        res["kind"] = "image"
        inspect_image(path, res)
    else:
        res["avertissements"].append("extension inconnue")
    return res


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("source", help="PDF ou image (chemin, ou nom de fichier dans ../Partitions/)")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args(argv)
    path = args.source
    if not os.path.exists(path):
        alt = os.path.join(_cho.PARTITIONS, path)
        if os.path.exists(alt):
            path = alt
        else:
            print(f"introuvable : {path}", file=sys.stderr)
            return 2
    res = inspect_source(path)
    if args.json:
        print(json.dumps(res, ensure_ascii=False, indent=1))
    else:
        print(f"== {res['source']}")
        print(f"   {res['kind']} · {res['pages']} page(s) · {res['largeur']}×{res['hauteur']} {res['unite']} · langue {res['langue']}")
        print(f"   famille {res['famille']} → voie {res['voie']}")
        extra = []
        if res["hanzi_lisibles"] is not None:
            extra.append("hanzi lisibles" if res["hanzi_lisibles"] else "hanzi ILLISIBLES")
        if res["inclinaison_deg"] is not None:
            extra.append(f"inclinaison {res['inclinaison_deg']:+.1f}°")
        if res["hauteur_etiquettes_px"] is not None:
            extra.append(f"étiquettes ≈ {res['hauteur_etiquettes_px']} px")
        if "grille_monospace" in res:
            extra.append(f"grille monospace {res['grille_monospace']['score']} (pas {res['grille_monospace']['pas_px']} px)")
        if extra:
            print("   " + " · ".join(extra))
        for n in res["notes"]:
            print(f"   · {n}")
        for w in res["avertissements"]:
            print(f"   ⚠ {w}")
    return 0 if res["voie"] else 2


if __name__ == "__main__":
    sys.exit(main())
