#!/usr/bin/env python3
"""Scan de sécurité des skills (.claude/skills) avec SkillSpector (NVIDIA).

`skillspector scan --baseline` refuse les scans récursifs : ce script lance le
scan récursif et le compare à `.claude/skillspector-reference.json` (empreintes
des alertes déjà vérifiées à la main). Seules les nouvelles alertes s'affichent.

    python3 scripts/scan-skills.py          # nouvelles alertes ; code 1 s'il y en a
    python3 scripts/scan-skills.py --maj    # accepter l'état actuel comme référence

Installation : uv tool install git+https://github.com/NVIDIA/skillspector.git
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
SKILLS = RACINE / ".claude" / "skills"
REFERENCE = RACINE / ".claude" / "skillspector-reference.json"


def scanner() -> dict:
    with tempfile.TemporaryDirectory() as tmp:
        rapport = Path(tmp) / "rapport.json"
        subprocess.run(
            ["skillspector", "scan", str(SKILLS), "--recursive", "--max-skills", "200",
             "--no-llm", "--format", "json", "--output", str(rapport)],
            stdout=subprocess.DEVNULL,
        )
        if not rapport.exists():
            sys.exit("Le scan n'a pas produit de rapport.")
        return json.loads(rapport.read_text())


def empreinte(i: dict) -> str:
    """Empreinte SkillSpector, ou à défaut règle + fichier + extrait (sans le n° de ligne, qui bouge)."""
    return i.get("match_fingerprint") or f"{i['id']}|{i['location']['file']}|{i['finding']}"


def main() -> None:
    skills = scanner()["skills"]
    actuel = {
        s["path"]: sorted({empreinte(i) for i in s["issues"]})
        for s in skills
    }
    if "--maj" in sys.argv:
        REFERENCE.write_text(json.dumps(actuel, indent=1, sort_keys=True) + "\n")
        print(f"Référence mise à jour : {sum(map(len, actuel.values()))} alertes, {len(actuel)} skills.")
        return

    connues = json.loads(REFERENCE.read_text()) if REFERENCE.exists() else {}
    nouvelles = 0
    for s in skills:
        deja = set(connues.get(s["path"], []))
        for i in s["issues"]:
            if empreinte(i) in deja:
                continue
            nouvelles += 1
            loc = i["location"]
            print(f"[{i['severity']}] {s['path']} — {i['id']} {i['pattern']} "
                  f"@ {loc['file']}:{loc['start_line']} :: {i['finding'][:100]!r}")
    print(f"{nouvelles} nouvelle(s) alerte(s) sur {len(skills)} skills.")
    sys.exit(1 if nouvelles else 0)


if __name__ == "__main__":
    main()
