# scripts/cho — outillage « Nouveau chant »

Règles dans `docs/chants/` (01 format, 02 placement, 03 calque) ; runbook `docs/chants/00-nouveau-chant.md`.
Python 3.9, PyMuPDF · Pillow · numpy · `pypinyin` · `pyphen` · `zhconv` (installés en `--user`).
Tous les scripts : `--help`, chemins relatifs au dépôt, `--json` pour la machine, code 0 = rien à corriger.

| Script | Rôle |
|---|---|
| `inspect.py <source>` | Nature d'une partition : texte/image, fr/zh, famille (église FPDF, shir.fr, Finale zh, gravure fr, scan 简谱, feuille Word, capture monospace), voie recommandée, avertissements (logo, hanzi illisibles, inclinaison, étiquettes petites, plusieurs tonalités dans le nom), notes (accords en solfège, tonalité non gravée). |
| `lint.py <slug> \| --all` | Règles statiques d'un `.cho` (en-tête, thèmes, libellés canoniques, orthographe des accords, espaceurs, espaces et ponctuation zh, pinyin, pronoms). `--all` = tout le corpus + tableau code → nombre. |
| `pinyin.py "<ligne>" \| --file <.cho>` | Pinyin d'une ligne (un groupe par hanzi, exceptions de `docs/chants/01-format-cho.md`) ; `--file` réécrit le `.cho` sur stdout. |
| `check.py <slug> [--source <fichier>]` | Mesure chaque accord de la source et le compare au `.cho` : exact · à relire · décalé · absent du .cho · absent de la source · nom différent ; puis structure, paroles, pinyin. Trois voies : texte (PDF fr/zh à couche texte), scan-zh (calque `chords.json` + `public/jianpu/<slug>-p1.webp`), image-fr. |
| `draft.py <source> [--lang] [--key] [--slug]` | Brouillon `.cho` sur stdout depuis un PDF à couche texte (accords au début de la syllabe mesurée, sections canoniques, pinyin, `{needs_review: …}` sur tout accord en l'air). |
| `_cho.py` | Socle commun : tables canoniques, lecture d'un `.cho`, normalisation des accords, syllabation fr, pinyin, couche texte des PDF. |

`inspect.py` porte le nom du module standard `inspect` : chaque script retire `scripts/cho/` de `sys.path` et charge `_cho.py` par chemin (`_load_cho`). Ne pas faire `import _cho` avec ce dossier en tête de `sys.path`.

## Vérifier

```bash
python3 scripts/cho/lint.py --all -q                              # 371 fichiers, tableau code → nombre
python3 scripts/cho/pinyin.py "主，我愿意！让自己像种子"
python3 scripts/cho/inspect.py "Abba Père.pdf"                     # nom dans ../Partitions/ accepté
python3 scripts/cho/check.py abba-pere --source "Abba Père.pdf"    # tant que le .cho n'a pas {source:}
python3 scripts/cho/check.py 一粒麦子                               # zh scanné : calque + webp
python3 scripts/cho/draft.py "Abba Père.pdf" > /tmp/abba.cho && python3 scripts/cho/check.py /tmp/abba.cho --source "Abba Père.pdf"
```

Chants de référence (audits du 26/09/2026) : fr texte `abba-pere` `oceans` `yahwe` `tu-es-bon` ; zh Finale `只要有你在我左右` `荣耀的呼召` ; zh scan `一粒麦子` `我们的神` `安静` ; fr image `au-nom-de-jesus`. `check.py` doit y retrouver les écarts des rapports, sans faux positif sur les placements exacts.
