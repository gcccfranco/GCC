# Tâches : règles et outillage « Nouveau chant » (docs/spec-guidelines-cho.md)

**Go donné le 26/09/2026 (les quatre lots en même temps).** Un commit par lot. Aucun `.cho` existant modifié.

## Lot A — Les règles (docs/chants/)
- [x] A1 `01-format-cho.md` : en-tête et directives (dont `{source:}`), tables canoniques sections / accords / thèmes (themes.json), pinyin (règles + exceptions), ponctuation zh, noms de fichiers, gabarit fr et zh
  - Acceptation : chaque table a une seule orthographe par entrée ; les 40 décisions Q1–Q40 qui touchent le format y sont, aucune ailleurs
- [x] A2 `02-placement-accords.md` : règle de la syllabe, `[X] `, tenue, fin de vers, syncope (option B), optionnels/alternatives, basse fidélité ; méthode de mesure par famille de source (fr rendu ChordPro, fr scan, zh Finale, zh scan) avec seuils ; format du rapport
  - Acceptation : chaque famille de source a sa méthode et ses seuils ; les cas des audits (mo[A]i, 崇[Gm]高, 命[C]！, Au nom de Jésus) y sont tranchés en exemples
- [x] A3 `03-calque-jianpu.md` : une page de bout en bout (inventaire, build-images, en-tête « 1=X » et «（X调）», build-chords, compter les systèmes, planche, gold, measure-keylabel, freeze, `PW_SLUGS`), verrou si plusieurs agents, cas 五线谱 = pas de calque, scan insuffisant = demander mieux ; pointeurs vers LOOP.md pour le pourquoi
  - Acceptation : un agent peut exécuter la page sans ouvrir LOOP.md ; aucune commande dupliquée avec une explication
- [x] A4 `00-nouveau-chant.md` : runbook — réception, `inspect.py`, choix de la voie, écriture, `lint`/`check`, calque (zh), validate/build/spec Playwright, copie de la source, rapport, go/commit ; critère de fin par étape
  - Acceptation : chaque étape se termine sur une condition vérifiable ; « jamais de choix silencieux » est une étape, pas un conseil
- [x] A5 Pointeurs : supprimer `CHORDPRO_GUIDELINES.md`, mettre `CLAUDE.md` à jour, réduire `.claude/skills/chord-placement/SKILL.md` à un pointeur, réduire `../Guidelines Chordpro/` à un README (copie zip des anciens fichiers dans le scratchpad avant suppression), `docs/spec-ajouter-un-chant.md` : références corrigées
  - Vérifier : `grep -rn "CHORDPRO_GUIDELINES\|Guidelines Chordpro" --include=*.md` ne rend que des pointeurs

## Point d'étape A : relecture de Timothée, commit A

## Lot B — L'outillage (scripts/cho/, tests/)
- [x] B1 `inspect.py <source>` : texte/image, fr/zh, famille (église FPDF, shir.fr, Finale zh, scan 简谱, Word), pages, résolution, inclinaison, hanzi lisibles ou non ; sortie JSON + voie recommandée
- [x] B2 `lint.py <slug>` : règles statiques (en-tête complet, `{source}` présent, thèmes dans themes.json, libellés canoniques, orthographe d'accords, `[ ]` hors intro, espaces dans les paroles zh, un pinyin par caractère, ponctuation pleine chasse, tonalité valide)
  - Vérifier : sur le corpus, `lint.py --all` rend un rapport sans planter (les écarts du corpus sont attendus, non corrigés)
- [x] B3 `pinyin.py "<ligne hanzi>"` : `pypinyin` mode phrase + table d'exceptions lue dans 01 ; `pip install --user pypinyin pyphen`
- [x] B4 `check.py <slug> [--source]` : trois voies (couche texte fr/zh par police ; scan zh via chords.json + bande paroles ; image fr via bandes + gouttière + mots guidés par le .cho + pyphen) ; sortie : par accord, mesure et classe ; comptes ; structure (sections vs reprises lues) ; paroles ; pinyin
  - Vérifier : rejoue les 12 chants audités → mêmes écarts, 0 faux positif sur les exacts
- [x] B5 `draft.py <source>` : brouillon `.cho` depuis un PDF à couche texte (fr église/shir.fr, zh Finale) : en-tête, sections, paroles, accords mesurés, pinyin ; `# à vérifier` sur tout accord en l'air
  - Vérifier : `draft.py` sur `Abba Père.pdf` et `荣耀的呼召.pdf` puis `check.py` → 0 décalé
- [x] B6 `tests/nouveau-chant.spec.ts` : `PW_CHANT=<slug>`, 3 appareils, libellés = ceux du .cho, chaque accord rendu, transposition +1 cohérente, captures ; 简谱 via `openSheet` si calque
  - Vérifier : vert sur `abba-pere` et `一粒麦子` ; `npx tsc --noEmit` ; `npm run lint`

## Point d'étape B : commit B

## Lot C — Contre-épreuve avec un agent froid (scratchpad, rien dans content/)
- [x] C1 Agent froid, seul `00-nouveau-chant.md` en main, produit `abba-pere` depuis `Abba Père.pdf` dans le scratchpad → comparé au `.cho` existant par `check.py`
- [x] C2 Idem pour `安静` depuis `安静 简谱.jpg` (calque compris, gold dans le scratchpad)
- [x] C3 Corrections des docs d'après ce que les deux agents ont mal compris ; critère : ≥ 98 % même syllabe, reste listé dans leur rapport

- [x] C4 Troisième contre-épreuve sur un chant non cité par les docs (`la-croix-seule-me-suffit` ↔ `La croix seule me suffit F.pdf`), demandée par Timothée le 26/09/2026
- [x] C5 « Final » sous `start_of_outro` s'affiche « Final » : test rouge puis vert dans `tests/section-labels.spec.ts`, parseur + fr.json + zh-CN.json (accepté par Timothée le 26/09/2026)

- [x] C6 Règle « au caractère près » (Timothée, 26/09/2026 au soir) : `check.py` classe les anciens équivalents « décalé », `draft.py` pose l'accord devant le caractère exact, 01/02 réécrits, rapport corpus annoté

## Point d'étape C : commit C, `graphify update .`

## Lot D — Rapport sur le corpus existant
- [x] D1 `docs/chants/audit-corpus-2026-09-26.md` : les 3 audits (12 chants, coordonnées), le doublon `Ta parole`, les 58 chants zh à thèmes invisibles, `{start_of_final}`, `Yahwe (A).pdf` à moitié transposé, les 4 PDF zh illisibles ; aucun `.cho` touché
- [x] D2 Page artefact du rapport (lecture sur téléphone), lien dans le rapport

## Point d'étape D : commit D, relecture de Timothée

## Lot E — Famille « gravure fr » (hymnaire, export Finale ; go de Timothée le 26/09/2026 au soir)
- [x] E1 Règles : solfège → lettres, tonalité déduite de l'armure + `{needs_review}`, couplets empilés (rangée n de chaque système) et phrase commune, syllabation gravée, gravure à plusieurs voix (01, 02, 00)
- [x] E2 Outillage : famille `gravure-fr` dans `inspect.py`, voie notes → syllabes gravées dans `check.py`, `draft.py` (agent, brief `scratchpad/brief-gravure-fr.md`) ; non-régression sur les 12 chants de référence
- [x] E3 Création réelle de « Que ma bouche chante ta louange » (source `19.11-L-085.-…-Partitura-Coro.pdf`, C) en suivant le runbook : draft, lint, check, validate, build:index, spec Playwright 3 appareils, rapport
- [x] E4 Commité le 26/09/2026 au soir (chant relu et corrigé par Timothée)
