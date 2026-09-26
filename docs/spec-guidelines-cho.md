# Spec : règles et outillage « Nouveau chant » (.cho + calque 简谱)

Demande de Timothée du 26/09/2026 : relire tous les `.cho` contre leurs
partitions pour comprendre les conventions réelles, puis refaire les
guidelines pour qu'un agent produise un `.cho` **fiable à 100 %** (fr et zh)
et son calque 简谱 (zh) à partir d'une partition fournie. Grill de trois rounds,
**40 questions tranchées** le 26/09/2026. **Aucun `.cho` existant n'est modifié
par ce chantier.** Go de Timothée le 26/09/2026 (les quatre lots en même temps) ; **fait le jour même**, voir « Avancement ».

## Objectif

Quand Timothée fournit une partition (PDF ou image, fr ou zh), une session
Claude Code produit, sans choix silencieux : le `.cho`, sa copie de source
dans `Partitions/`, le calque 简谱 s'il y a un scan 简谱, un rapport de fin
(points mesurés, points « à relire », points laissés `{needs_review: …}`), des
captures Playwright sur trois appareils, et un commit sur go. Ce qui est
ambigu est tranché par Timothée, pas par l'agent.

« Fiable à 100 % » (Q2) = les huit garanties : (1) chaque accord sur la bonne
syllabe, **mesuré** ; (2) structure dépliée identique à la partition ;
(3) paroles au caractère près ; (4) pinyin : un groupe par caractère ;
(5) métadonnées complètes ; (6) `npm run validate` et `build:index` verts ;
(7) rendu vérifié par Playwright sur ordinateur, téléphone, tablette ;
(8) rapport listant tout ce qui n'a pas pu être tranché mécaniquement.

## Ce que l'inventaire et les audits ont établi (26/09/2026)

- 372 chants (189 zh, 184 fr) ; 795 PDF sources : fr 460 à couche texte + 28
  images, zh 237 images + 70 à couche texte (dont 4 aux hanzi illisibles).
- Trois jeux de règles se recouvraient et se contredisaient
  (`CHORDPRO_GUIDELINES.md`, `../Guidelines Chordpro/`, skill
  `chord-placement`) ; la Mission C du runbook (bloc texte `{start_of_jianpu}`)
  est obsolète ; `CHORDPRO_GUIDELINES.md` a perdu les glyphes 祢/祂.
- Fidélité des `.cho` existants sur 12 chants audités par coordonnées :
  fr à couche texte 95 % même syllabe (205 accords), zh scans 97,6 % (123),
  zh vectoriels 93,5 % (77) ; scan fr type Word : 36/40 sur un autre mot
  (source alignée par espaces, ±1 syllabe).
- Les PDF fr de l'église sont des **rendus ChordPro** (accord à 0 pt du
  caractère tapé) ; les PDF zh vectoriels sont des exports Finale (accord sur
  la tête de note à 0,2 pt, caractère centré sous la note à < 1 pt).
- `public/jianpu/chords.json` donne la boîte exacte de chaque étiquette
  d'accord des 185 scans zh : oracle mécanique pour le placement zh, il ne
  manque que la position des caractères de paroles.

## Décisions (26/09/2026, Q1–Q40)

### Source de vérité et arborescence
- **Un seul jeu, dans le repo** : `docs/chants/` — `00-nouveau-chant.md`
  (runbook, point d'entrée), `01-format-cho.md`, `02-placement-accords.md`,
  `03-calque-jianpu.md`, `audit-corpus-2026-09-26.md` ; scripts dans
  `scripts/cho/`. `CHORDPRO_GUIDELINES.md` supprimé, `CLAUDE.md` mis à jour ;
  skill `.claude/skills/chord-placement/SKILL.md` réduit à un pointeur ;
  dossier hors repo `../Guidelines Chordpro/` réduit à un README pointeur.
- `scripts/jianpu/LOOP.md` reste l'artefact de la boucle 简谱 (pourquoi +
  journal) ; le runbook liste la suite exacte des commandes pour **une** page
  sans les dupliquer.

### Contenu du .cho
- Fidèle à la partition fournie, sauf liste fermée d'adaptations : 祢/祂 →
  你/他, dépliage des reprises, découpage des lignes par sens. **Plus de
  simplification harmonique.** Accords entre parenthèses → `[(X)]`,
  « G或G/B » → `[G (G/B)]`, note « Edim 可用 C/E 代替 » → `[Edim (C/E)]` :
  toujours transcrits.
- `{key}` = tonalité de la partition fournie (Timothée dit laquelle s'il en
  donne plusieurs). `{recommended_key}` jamais à la création. Tempo, YouTube,
  artiste absents de la partition → laissés vides, Timothée complète.
  `{artist}` = nom sous lequel le chant est connu (赞美之泉, Hillsong…).
- `{themes}` : noms **français** de `content/themes.json` (liste fermée, le
  filtre ne reconnaît qu'eux), 1 à 3, même pour un chant zh ; rien d'ajouté à
  la liste sans go.
- `{source: <nom du fichier dans Partitions/>}` en en-tête (directive ignorée
  par le parseur).
- Sections : une orthographe par type (table dans `01-format-cho.md`) ;
  « (x2) » = suffixe du libellé ; retour D.S. à accords différents et refrain
  modulé = sections écrites en entier avec suffixe `(D.S.)`, `(A)`, posé une
  seule fois en fin de libellé (le site l'affiche tel quel dans les deux
  langues). Une section reste juste affichée seule. `{start_of_outro: Final}`
  s'affiche « Final » depuis le 26/09/2026 (mot écrit reconnu par le parseur).
- Accords : orthographe canonique d'un même symbole (`maj7`, `sus4`, `dim`,
  `m7b5`, `aug`, parenthèses internes retirées) ; altérations et basses
  **telles que gravées** ; `D2`/`Dadd2`/`Dadd9` non fusionnés.
- Placement : **au caractère près de la partition** (décision du 26/09/2026
  au soir, qui remplace « début de la syllabe » de Q9 : `mo[A]i`, `T'aim[A]er`,
  `pou[A]ssière` tels que gravés ; `pyphen` ne sert plus qu'aux images fr) ; accord joué avant l'attaque vocale = `[X] `
  avec espace, `[ ]` réservé aux intros sans paroles ; tenue = juste après la
  syllabe tenue, avant la ponctuation ; accord après la dernière syllabe
  finie = après la ponctuation ; **syncope liée = après la syllabe qui
  anticipe** (`崇[Gm]高`, option B).
- Chinois : pinyin sur la même ligne après 3 espaces, un groupe par
  caractère, généré par `pypinyin` puis relu, table d'exceptions dans
  `01-format-cho.md` ; aucun espace dans les paroles hors séparateur ;
  ponctuation pleine chasse, celle du scan.
- Noms : fr slug kebab sans accent, zh titre tel quel ; copie de la source
  `<Titre> (<Tonalité>).<ext>`, parenthèses ASCII ; l'existant n'est jamais
  renommé.

### Mesure et seuils
- Scan zh (repère `public/jianpu/<slug>-p1.webp`) : exact ≤ 20 px, à relire
  20–45, décalé > 45. PDF vectoriel (zh/fr) : accord sur la note ≤ 3,5 pt
  (0,5 pt en pratique, 3,5 pour ne pas mettre « à relire » trois placements
  justes), caractère sous la note ≤ 4 pt. PDF fr rendu ChordPro : seul critère = la
  syllabe. Image fr : 20/45 px ramenés à la largeur de l'image.
- Source basse fidélité (Word, scan aligné par espaces) : syllabe la plus
  proche + `{needs_review: …}` sur chaque label à cheval + en-tête du rapport
  « basse fidélité » ; audio demandé au-delà de 5 `{needs_review: …}`.
- Deux arrangements du même chant : la partition fournie fait foi, les
  différences avec les autres versions de `Partitions/` sont signalées.
- Photo inclinée > 3° ou étiquettes < 15 px → demander un meilleur scan.
- Partition 五线谱 d'un chant zh → `.cho` seul, pas de calque.

### Outillage et ordre
- `scripts/cho/check.py` d'abord (mesure chaque accord de la source contre le
  `.cho`, rapport exact / à relire / décalé / absent / nom différent) ;
  `lint.py` (règles statiques) ; `pinyin.py` ; `draft.py` ensuite.
- Chant zh avec scan : **calque 简谱 avant le contrôle du .cho** (chords.json
  devient la source des positions).
- `tests/nouveau-chant.spec.ts` paramétré `PW_CHANT=<slug>`, ignoré sinon :
  3 appareils, libellés de sections, accords rendus, transposition +1,
  captures (+ 简谱 via `openSheet` pour un chant zh).
- Livraison : branche courante, commit sur go ; David pousse sur
  `origin/main` : fusionner, pas rebaser.

## Structure des fichiers

```
docs/chants/00-nouveau-chant.md          runbook (entrée unique)
docs/chants/01-format-cho.md             format, métadonnées, tables canoniques
docs/chants/02-placement-accords.md      règles de placement, mesure, seuils, rapport
docs/chants/03-calque-jianpu.md          une page 简谱, de l'inventaire au gel
docs/chants/audit-corpus-2026-09-26.md   écarts du corpus existant (chantier séparé)
scripts/cho/inspect.py                   nature de la source (texte/image, fr/zh, famille)
scripts/cho/check.py                     accords mesurés vs .cho
scripts/cho/lint.py                      règles statiques d'un .cho
scripts/cho/pinyin.py                    ligne pinyin depuis les hanzi
scripts/cho/draft.py                     brouillon depuis un PDF à couche texte
tests/nouveau-chant.spec.ts              contrôle rendu 3 appareils
```

## Commandes

```bash
python3 scripts/cho/inspect.py "../Partitions/<source>"
python3 scripts/cho/draft.py "../Partitions/<source>" > content/songs/<slug>.cho
python3 scripts/cho/lint.py <slug>
python3 scripts/cho/check.py <slug>            # source lue dans {source:}
npm run validate && npm run build:index
PW_CHANT=<slug> npm test -- tests/nouveau-chant.spec.ts
```

## Limites (Always / Ask first / Never)

- **Toujours** : mesurer avant d'écrire un accord ; `{needs_review: …}` plutôt
  qu'une invention ; rapport de fin ; validate + build:index + spec Playwright.
- **Demander d'abord** : ajouter un thème à `themes.json` ; toucher un `.cho`
  existant ; choisir entre plusieurs tonalités fournies ; remplacer un scan.
- **Jamais** : modifier un `.cho` existant dans ce chantier ; renommer une
  source existante ; simplifier un accord ; deviner à l'œil un placement.

## Critères de succès

1. Un agent froid qui ne lit que `docs/chants/00-nouveau-chant.md` reproduit,
   depuis la partition, un `.cho` existant certifié (un fr à couche texte, un
   zh scanné) à ≥ 98 % d'accords sur la même syllabe, et **liste** les 2 %
   restants dans son rapport au lieu de trancher.
2. `check.py` rejoue les 12 chants audités et retrouve les mêmes écarts que
   les audits manuels (pas de faux positif sur les placements exacts).
3. Aucune contradiction entre `docs/chants/*`, `CLAUDE.md`, le skill et
   `LOOP.md` ; `CHORDPRO_GUIDELINES.md` et les 6 docs hors repo n'existent
   plus.
4. `npm run validate`, `npm run build:index`, `npx tsc --noEmit`,
   `npm run lint` verts ; `tests/nouveau-chant.spec.ts` vert sur 3 appareils
   pour un chant fr et un chant zh.

## Questions ouvertes

Aucune : les 40 questions du grill sont tranchées (détail dans la mémoire de
session `chantier-guidelines-cho`).

## Avancement (26/09/2026)

- Lot A : `docs/chants/00`–`03` écrits ; `CHORDPRO_GUIDELINES.md` supprimé,
  `CLAUDE.md`, skill, `spec-ajouter-un-chant.md`, feuille de route repointés ;
  dossier hors repo réduit à un README (ancien contenu en zip dans le
  scratchpad de la session).
- Lot B : `scripts/cho/` (`inspect`, `lint`, `pinyin`, `check`, `draft`,
  `_cho`) rejoués sur les 12 audits : mêmes écarts, zéro faux positif sur les
  placements exacts ; `draft.py` + `check.py` = 0 décalé sur 3 PDF ;
  `tests/nouveau-chant.spec.ts` vert 3 appareils sur `abba-pere` et `一粒麦子`.
- Lot C : deux agents froids, runbook seul en main : Abba Père 88/88 exact,
  安静 31/31 exact, mêmes syllabes que les `.cho` existants partout où
  ceux-ci sont justes ; 31 points de friction remontés, tous reportés dans
  00–02 (dont : `# à vérifier` remplacé par `{needs_review: …}`, une ligne
  `#` dans une section étant rendue comme une parole ; règle des consonnes
  doublées ; levée sans accord gravé ; nom de la source ; gabarits réels).
  Réserve : les deux chants sont cités par les docs (gabarits, cas
  tranchés) ; une contre-épreuve sur un chant non cité reste à faire.
- Lot D : `docs/chants/audit-corpus-2026-09-26.md` + page
  https://claude.ai/artifact/XxPedHAxLUC4qaysLQmWyH ; aucun `.cho` modifié.
- `{start_of_outro: Final}` s'affichait « Outro » : Timothée a accepté la
  modification, le parseur reconnaît le mot écrit « Final » (traduit « Final »
  / « 结尾 »), test dans `tests/section-labels.spec.ts` (rouge puis vert).
- Constats restants : « Noël » invisible dans le filtre (`slugifyTheme` ignore
  le ë) ; `start_of_tag` tombe en type « autre » ; `inspect.py` ne distingue
  pas une portée d'un 简谱 sur une image. Doublon `Ta parole` corrigé par
  Timothée le 26/09/2026 (`Ta-parole-écriture.cho`).
- 26/09/2026 au soir : troisième contre-épreuve sur un chant non cité
  (`la-croix-seule-me-suffit`, 60/60 exact) ; puis Timothée demande que les
  « équivalents » (même syllabe, autre caractère) soient **exactement comme la
  partition** : `check.py` les classe désormais « décalé » avec le caractère
  attendu, `draft.py` pose l'accord devant le caractère exact, 01/02 mis à jour.
- 26/09/2026 au soir, lot E : Timothée apporte une gravure chorale d'hymnaire
  (Éditions de l'Emmanuel, export Finale, accords en solfège, quatre couplets
  empilés, phrase commune en gras) : famille absente des règles et de
  l'outillage. Règles ajoutées (solfège, tonalité par armure, couplets
  empilés, syllabation gravée), famille `gravure-fr` ajoutée aux scripts,
  chant « Que ma bouche chante ta louange » créé par le runbook comme épreuve.
