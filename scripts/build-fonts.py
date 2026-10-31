#!/usr/bin/env python3
# Sous-ensembles woff2 des polices chinoises : `python3 scripts/build-fonts.py` (fontTools + brotli).
# Source Han Sans (8,4 Mo) et KaiTi (11,8 Mo) sont trop lourdes pour le navigateur ; Vercel n'a pas
# fontTools, donc les sous-ensembles sont commités. À relancer quand un chant ajoute un caractère
# (npm run validate échoue sinon). Les polices d'origine restent : elles sont les sources, et le PDF lit KaiTi.ttf.
import re
import subprocess
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
FONTS = RACINE / "public" / "fonts"
CHO = sorted((RACINE / "content" / "songs").glob("*.cho"))
LOCALES = [RACINE / "src" / "locales" / "zh-CN.json", RACINE / "src" / "locales" / "fr.json"]
PLAGES = [(0x20, 0x7E), (0xA0, 0xFF), (0x2000, 0x206F), (0x3000, 0x303F), (0xFF00, 0xFFEF)]
TITRE = re.compile(r"^\s*\{\s*(?:title|subtitle)\s*:\s*(.*?)\s*\}\s*$", re.M)


def latin() -> set[str]:
    return {chr(c) for a, b in PLAGES for c in range(a, b + 1)}


def sous_ensemble(source: Path, sortie: Path, caracteres: set[str]) -> None:
    texte = "".join(sorted(caracteres - {"\n", "\r", "\t"}))
    subprocess.run(
        [
            "pyftsubset", str(source), f"--text={texte}", "--layout-features=*",
            "--flavor=woff2", f"--output-file={sortie}",
        ],
        check=True,
    )
    print(f"{sortie.name} : {sortie.stat().st_size // 1024} Ko ({len(texte)} caractères)")


def main() -> None:
    corps = set()
    titres = set()
    for f in CHO:
        t = f.read_text(encoding="utf-8")
        corps |= set(t)
        for m in TITRE.finditer(t):
            titres |= set(m.group(1))
    for f in LOCALES:
        corps |= set(f.read_text(encoding="utf-8"))
    sous_ensemble(FONTS / "SourceHanSansCN-Medium.otf", FONTS / "SourceHanSansCN-Medium-sub.woff2", corps | latin())
    sous_ensemble(FONTS / "KaiTi.ttf", FONTS / "KaiTi-titres.woff2", titres | latin() | {c.upper() for c in titres} | {c.lower() for c in titres})


if __name__ == "__main__":
    sys.exit(main())
