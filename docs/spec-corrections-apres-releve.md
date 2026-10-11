# Spec — corriger les problèmes relevés après le relevé du 27/09

Demande du 11/10/2026 (« Corrige tous les problèmes »), après le rapport final du relevé
(`docs/chants/releve-2026-09-27-corrections.md`). Décisions prises avec la demande :
**corrections sur `main`** (le site en ligne a déjà le bug de transposition), puis `main`
fusionné dans `ui/apple-design` ; **les insertions de sections** (intros, interludes ajoutés
avant la fin) **restent à Timothée** : elles décalent les identifiants de section des
setlists enregistrées.

## Objectif et critères de succès

| # | Problème | Correction | Vérifié par |
|---|---|---|---|
| S1 | Alternative `[X (Y)]` (01) : `Y` reste dans l'ancienne tonalité (`[D (Bm)]` +1 ton → « E (Bm) ») | `transposeAST.ts` (et la feuille d'édition) transpose l'accord entier avec `transposeLabel`, déjà juste pour le calque | `transpose-alternatives.spec.ts` : `[C (Am)]` +1 ton → « D (Bm) », `[A7 (A/C#)]` → « B7 (B/D#) » |
| S2 | Changer le type d'une section (`start_of_final` → `start_of_outro`, pré-refrain sous `start_of_verse`…) change son identifiant (`final-6` → `outro-6`) : les setlists enregistrées perdent la section | directive `{section_id: final-6}` sous l'en-tête : la section garde son ancien identifiant, son type (couleur, libellé) suit la directive | spec Playwright : une structure enregistrée `final-N` retrouve la section passée en outro |
| S3 | Libellé final : 01 écrit `结尾/Final`, le lint attend `尾声/Final`, et `结尾/Final` s'affiche « Outro » (le parseur lit 结尾 avant Final) ; « Final » n'a pas d'abréviation au coup d'œil | 01 écrit `尾声/Final`, comme le lint et le parseur ; `Final` s'abrège « F » comme une outro ; 主我献上生命给你 passe en `尾声/Final` | `coup-d-oeil.spec.ts` ; lint sans E08 sur ce chant |
| S4 | « Copier les paroles » : `[X] 字` (accord sur une note tenue, 02) met une espace dans les paroles chinoises copiées | l'espace de tenue n'est pas copiée dans une ligne chinoise | `setlist-regie.spec.ts` |
| S5 | Texte latin dans une ligne chinoise affiché lettre par lettre (tablette) ; lettre de tonalité absente du sélecteur (téléphone) ; accord posé après la dernière ponctuation qui déborde (téléphone) | corrections d'affichage, après reproduction | spec Playwright par défaut, trois appareils |
| C1 | Coquilles : 彼些 → 彼此 (我们爱让世界不一样), 耶酥 → 耶稣 (耶稣我的耶稣), 干早 → 干旱 (住在你里面, vu sur la partition) | `.cho` | lint, `PW_CHANT` |
| C2 | Lignes figées par des tests : 一生爱你 (A sur 贵, `[Bm] 一`), abba-pere (`Intro (x2)`) | lignes de la partition, tests ajustés (le filtre « 宝贵 » lit les paroles sans accords) | specs concernées |
| C3 | Sections écrites sous une directive d'un autre type : blocs « à appliquer par Timothée » qui ne font que changer le type en place, les 19 `{start_of_final}` (lint E07), et six sections que le parseur colorait d'un autre type (pré-refrain lu refrain, Tag ou Instrumental lu pont) | directive de 01 et `{section_id}` (S2) : les identifiants ne bougent pas ; le parseur ne lit plus le type dans le suffixe entre parenthèses (« Tag (To Chorus) » n'est pas un refrain) ; les insertions, retraits et déplacements restent listés pour Timothée | `section-id.spec.ts`, comparaison des identifiants avant/après sur tout le corpus, lint E07 |
| C4 | Accords écrits comme le calque mais pas à l'orthographe de 01 (lint W11) : `CMaj7` de 深不见底的爱, `DMaj7`, `Dsus`, `C#m7(b5)`, `F+/C#`… (12 chants) | orthographe de 01 dans le `.cho`, la vérité terrain (`scripts/jianpu/gold/`) et le calque publié | lint W11, banc 简谱 |
| C5 | Pinyin d'origine faux sur des caractères à plusieurs lectures (为了 `wèi liào`, 差派 `chà`, 舍命 `shè`…) | relecture du pinyin des chants chinois contre pypinyin (exceptions de 01, ton du dictionnaire), chaque écart tranché sur le sens | lint, `lignes-chinoises` |
| C6 | Calque de 得胜的宣告 : transposée, la note du pont « 至E调、 » perd son « 、 » sous le morceau suivant « Gb调) » (`jianpu-sheet.spec.ts`, rouge avant le relevé) | les deux morceaux réunis en une étiquette « 至Eb调、F调) », dans la vérité terrain et le calque publié | `jianpu-sheet.spec.ts`, planche `npm run jianpu:audit` relue |
| T1 | Rouges d'avant le relevé : `planning-edd.spec.ts:75`, `planning-table.spec.ts:77`, `equipes.spec.ts:345`, `songs-list-return.spec.ts:39` | causes trouvées, toutes dans l'environnement de test : Chromium sans locale (`LANG` vide du conteneur) enregistre un nom de fichier non ASCII sous « download » → `LANG=C.UTF-8` pour le navigateur dans `playwright.config.ts` ; export cliqué avant la lecture du Sheet → attendre la grille ; « 13 équipes » trouvé deux fois → le compte rendu exact ; attente d'un `h1` satisfaite par celui de la liste → attendre l'adresse et le bouton de retour du chant | specs concernées, deux passages, trois appareils |
| T2 | Rouges de la suite complète à trois navigateurs (11/10), les mêmes avant ces corrections : le test lit la base simulée avant l'écriture (planning campus, groupes) ; « Mise en page… » vérifiée absente avant même d'apparaître, puis la page attendue 5 s alors que les polices chinoises en prennent 4 à 7 sous charge (mode louange) ; barre du mode louange escamotée après 3 s avant le clic sur Réglages ; images du retour à la liste enregistrées 0,9 s seulement | attendre « Enregistré » ; `attendreMiseEnPage` et `ouvrirReglages` (`tests/helpers/louange.ts`) ; enregistrer jusqu'à ce que la liste revienne | specs concernées, deux passages, trois navigateurs en parallèle |

Hors de portée (dit dans le rapport) : les doutes à l'oreille (`{needs_review}`), la page 2
manquante de 赞美中信心不断升起 (absente de Partitions), la présentation du calque 简谱
transposé (planche de design en cours).

## Commandes

```bash
npx tsc --noEmit && npm run lint && npm run validate && npm run build:index
PW_CHANT=<slug> npx playwright test tests/nouveau-chant.spec.ts --workers=1
npx playwright test <spec> --workers=1          # trois appareils
npx playwright test --workers=1                 # suite complète, avant la fusion
```

## Limites

- Toujours : un test qui échoue avant chaque correction de code ; trois appareils ; un commit
  par lot, message en français ; `git pull --rebase` avant chaque push ; indexer par nom.
- Jamais : `--force`, rebase de `main`, commit de `next-env.d.ts`/`tsconfig.json` réécrits,
  noms réels dans les tests, lecture de la vraie base Firestore.
- `firestore.rules` n'est pas touché.
