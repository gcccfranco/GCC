# Banc de mesure de l'audit de performance (21/11/2026)

Fichiers en `.txt` pour ne pas entrer dans la suite de tests. Pour s'en servir : copier les `.ts` dans
`tests/perf-tmp/` (sans `.txt`, ne pas commiter), construire (`NEXT_PUBLIC_BACK_OFFICE=1 NEXT_DIST_DIR=.next-prod npx
next build`), servir (`NEXT_DIST_DIR=.next-prod npx next start -p 3300`), puis :

```bash
MESURE_LARGEUR=1512 npx playwright test -c tests/perf-tmp/playwright.config.ts tests/perf-tmp/b-setlist.spec.ts
```

Variables : `MESURE_LARGEUR` (390 ralentit le processeur ×4), `MESURE_BASE` (défaut `http://localhost:3300`),
`MESURE_MODE` (étiquette), `MESURE_SORTIE` (fichier JSONL ; le chemin par défaut d'`outil.ts` est celui de la session
d'audit, à changer). `table.py` met le JSONL en tableau ; `e-profil` écrit des `.cpuprofile` (servir alors `next dev`
sur 3400) que `agrege.cjs` (temps propre) et `inclus.cjs` (temps inclusif, fichiers du site) ramènent à `fichier:ligne`.
La config pointe Chromium vers `/opt/pw-browsers/chromium` (conteneur cloud) : à adapter ailleurs.
