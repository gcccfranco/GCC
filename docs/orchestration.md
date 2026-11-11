# Orchestration — qui fait quoi, sur quel modèle

Complète les règles « Sessions cloud » du `CLAUDE.md`. **Règles en vigueur seulement** : origine (Timothée,
24/10/2026), sources Anthropic, mesures et bilans datés sont dans
[archive/orchestration-historique.md](archive/orchestration-historique.md) (à la demande, par `grep`).

## 1. Principe

Un modèle fort décide, découpe et juge ; des modèles moins chers exécutent, chacun dans son contexte, et ne rendent
qu'un résumé. Opus n'est rappelé en conseiller que quand ça résiste (étape « Conseil » de `/tranche`).

## 2. Prix (par million de jetons, 24/10/2026)

| Modèle | Entrée | Sortie | Lecture du cache |
| --- | --- | --- | --- |
| Opus 5.5 | 4 $ | 20 $ | 0,20 $ |
| Sonnet 5.5 | 2 $ | 10 $ | 0,10 $ |
| Haiku 5.5, contexte ≤ 100 000 jetons | 0,10 $ | 0,50 $ | 0,01 $ |
| Haiku 5.5, contexte > 100 000 jetons | 0,50 $ | 2,50 $ | 0,05 $ |

Chaque requête relit tout le contexte de sa session : c'est le premier poste de dépense. Haiku coûte 40 fois moins
qu'Opus sous 100 000 jetons de contexte, cinq fois plus cher au-delà.

## 3. Qui fait quoi

| Travail | Qui | Modèle |
| --- | --- | --- |
| Décider : spec, planche, arbitrage, sévérité, découpe en tranches | conversation principale | Opus |
| Lire le verdict du relecteur, ouvrir les passages et captures signalés, regarder les 简谱, commiter | conversation principale | Opus |
| Chercher dans le code, les docs, les `.cho`, git | `chercheur` | Haiku |
| Lancer une suite (Playwright, tsc, lint, validate, check.py) et rendre les échecs | `testeur` | Haiku |
| Appliquer une modification décidée et décrite | `executant` | Sonnet |
| Correction mécanique déjà rédigée (une ligne de doc, un libellé, un `git rm`) | `executant` avec `model: haiku` | Haiku |
| Contre-vérifier un constat ou un diff (lecture seule, verdict prouvé par `chemin:ligne`) | `relecteur` | Sonnet |
| Ouvrir toutes les captures et signaler ce qui se voit ; ne décide rien du design | `regard` | Sonnet |
| Trouver la cause quand deux tours de correction échouent | étape « Conseil » de `/tranche` | Opus |

## 4. Ce qui est installé

**Équipe design** (`.claude/agents/`, 02/11/2026) : `directeur-artistique` (Opus, lecture seule : trois pistes vraiment différentes,
la recommandée, les questions ; il propose, la conversation principale et Timothée décident), `maquettiste` (Sonnet :
planche HTML dans `docs/planches/`, captures dans `test-results/planches/<sujet>/`, n'écrit nulle part ailleurs),
`critique-design` (Opus, lecture seule : critique d'une planche dans `/planche`, ou d'une tranche qui change
l'apparence, lancé à la main après `/tranche`). Les zones gelées (`docs/audit-ui-apple-design.md` § 2) bornent les
trois. Le « crème + terracotta » est signalé par la critique sans être un rejet : Timothée tranche la direction.
**Économies (Timothée, 03/11/2026)** : le maquettiste ne dessine que les constats « premier coup d'œil » et « à
regarder de près », ne prend que trois captures (390 px clair, 1 440 px clair, 390 px sombre) et corrige dans la même
passe ; une retouche ne se relance que pour un défaut visible.

**Workflows** (`.claude/workflows/`, chargés au démarrage d'une session ou par `/reload-skills`) :

- **`/tranche`** — `executant` code et se vérifie par `npx tsc --noEmit` → `testeur` lance tsc, lint, les specs
  nommées et les voisines → `executant` corrige (deux tours au plus) → si ça résiste, Opus diagnostique et `executant`
  applique → `relecteur` relit le diff. Ne commite pas.
  `args : { spec, tranche, consigne, tests: [...], base, echecsConnus?, preuve? }` ; `preuve` (essai réel sur build de
  production) est obligatoire pour le service worker, le hors ligne, les notifications et les droits.
- **`/verifier-constats`** — un `relecteur` par constat, ou par lot de cinq au plus pour les constats qui citent le
  même fichier ; un constat déjà corrigé sur `origin` sort en `deja_corrige`. À passer sur tout constat avant qu'il
  entre dans un rapport, une spec ou la feuille de route. `args : { base, constats: [...], branche? (défaut main) }`.
- **`/planche`** — `directeur-artistique` → `maquettiste` → `critique-design` (qui relève aussi débordements et textes
  coupés ; `regard` n'y passe plus) → une reprise si « à reprendre ».
  Ne commite pas, ne publie pas. `args : { sujet, demande, ecrans, captures?: [...], contraintes? }`.
- **`/audit-code`** — audit en 11 dimensions (chercheurs Opus pour la sécurité et les permissions, Sonnet et Haiku
  ailleurs) : environ 60 agents et 5 millions de jetons, **sur demande de Timothée seulement**.
  `args : { commit, build? }`.
- Proposé, sur go : un workflow `/rude-epreuve` (détail dans l'archive, § 4).

**Skills** (`.claude/skills/`, 58 ; aiguillage du 10/11/2026, règle courte dans `.claude/CLAUDE.md`). Un skill coûte
trois fois : la **liste** (nom et description de chaque skill visible, relue par chaque session et chaque agent ; la
doc de Claude Code lui donne environ 1 % du contexte, et au-delà les descriptions les moins utilisées tombent), le
**chargement** (le corps, à chaque emploi) et le **déclenchement à tort**. D'où : 22 visibles (6 500 caractères ; 26
et 8 800 le matin du 10/11/2026), 36 dormants (`disable-model-invocation: true`) ouverts par chemin ou lancés par
`/nom`, et un seul porteur par skill. Un dormant ne se précharge pas dans un agent. Poids en milliers de caractères.

| Moment | Skill (poids) | Porteur |
| --- | --- | --- |
| Cadrer | `spec-driven-development` (13), `grilling` (2) ; à la main : `/grill-me`, `/grill-with-docs`, `/to-spec`, `/to-tickets`, `/to-questionnaire`, `/wayfinder` | session principale ; Timothée |
| Implémenter | `ponytail` (3,5) préchargé ; `incremental-implementation` (10), `frontend-ui-engineering` (11) | `executant` ; session qui code elle-même |
| Bug | `debugging-and-error-recovery` (11), puis un seul dormant selon la cause : `click-path-audit` (8), `e2e-testing` (8), `react-patterns` (11), `nextjs-turbopack` (3), `typescript-patterns` (24) | étape « Conseil » de `/tranche` ; session qui débogue |
| Libellés fr et 中文 | `i18n-sync` (7) | session principale, quand elle écrit les libellés dans la spec |
| Tests | `test-driven-development` (17), `tdd` (4) | sur besoin |
| Relire | axe « allégé » de `ponytail-review`, porté par la consigne ; `ponytail-review` (5), en mots simples et en français pour Timothée ; `code-review-and-quality` (21) avant `main` | `relecteur` ; session principale |
| Livrer | `git-workflow-and-versioning` (14), `resolving-merge-conflicts` (1) | session principale |
| Auditer | `ponytail-audit` (5), un agent, avant tout `/audit-code` ; `ponytail-debt` (2) pour les `shortcut:` ; `security-and-hardening` (18), `performance-optimization` (17), `react-performance` (18) | session principale, par section |
| Coût, passage de main | `context-budget` (6) ; `/handoff` au plafond de 200 000 jetons | session principale ; Timothée |
| Direction de design | `frontend-design` (9) + `apple-design` (23) préchargés ; `taste-skill` (87) par passages | `directeur-artistique` |
| Planche | `web-design-engineer` (35) + `frontend-design` préchargés ; `dimensional-drawing` (9) pour une planche cotée, après validation ; `dimensional-drawing-motion` (6) sur demande | `maquettiste` |
| Critique | `.claude/references/critique-gcc.md` ; sources, pour un point précis : `impeccable` (10), `avoid-ai-design` (14), `web-design-guidelines` (1), `unslop` (31) | `critique-design` |
| Démonstration du site | `stageshow` (19, allégé : le kit se prend dans un clone temporaire) | session principale, sur demande |
| Hors site | `astryx` (2) : idées pour une planche, jamais dans le code du site | sur demande de Timothée |
| Code, architecture | `graphify` (33 ; les commandes sont dans le `CLAUDE.md`), `codebase-design` (6), `domain-modeling` (3), `/improve-codebase-architecture` | `chercheur` ; sur besoin |
| Divers | `research` (1), `prototype` (3), `writing-for-agents` (11, avant de toucher un `CLAUDE.md`, un agent ou un skill) ; à la main : `/ask-matt`, `/teach`, `/triage`, `/wait-what`, `/setup-matt-pocock-skills`, `/ponytail-help`, `/ponytail-gain` | sur besoin ; Timothée |

`karpathy-guidelines` (dormant) est déjà le § « Comportement » du `CLAUDE.md` racine. Origine des 19 skills du
10/11/2026 au soir : `multica-ai/andrej-karpathy-skills`, `dietrichgebert/ponytail` (6), `affaan-m/ECC` (8 sur 314),
`benjitaylor/skills` (`stageshow`), `enesozturk/dimensional-drawing` (2), `meta/astryx`. `impeccable` reste la 4.8.0
allégée (seule la description, plus courte, vient de la 4.8.2 : dix références adaptées à la main seraient écrasées). `security-and-hardening`
et `performance-optimization` sont repris d'`addyosmani/agent-skills` dans leur version allégée (les exemples de code y
sont passés dans `references/`, lus à la demande) ; les copies précédentes étaient d'anciennes versions exactes du repo. Décidé le 11/11/2026 (Timothée a laissé
la session trancher) : `performance-optimization` devient dormant ; `security-and-hardening` reste visible (filet quand une
session touche aux comptes, aux droits ou à une route d'API) ainsi qu'`impeccable` (outil de design lancé par son nom).

## 5. Un lot, de bout en bout

1. **Timothée demande.** La session principale (Opus) fait la planche si l'écran change, puis la spec avec ses
   tranches. Rien ne se code avant le go (CLAUDE.md, « Go »).
2. **Go.** La session principale lance une session orchestratrice (`create_session`) ; sa consigne tient en une page :
   la spec, son § « Avancement », ce qui reste. **Retouche** (trois fichiers au plus, pas de spec, aucune décision
   nouvelle, toujours sur go) : pas de session orchestratrice ni de `/tranche`, la session courante lance un
   `executant` puis un `testeur` (validée par Timothée le 10/11/2026 ; précise la règle du
   18/10/2026).
3. **Chaque tranche** : `/tranche` avec la consigne exacte et les specs de test. **Au retour** (validée par Timothée le 10/11/2026) :
   la session lit le verdict du `relecteur` et `git diff --stat`, et n'ouvre du diff que les passages signalés. Pour
   une tranche qui change l'apparence, `regard` ouvre toutes les captures ; la session ouvre celles qu'il signale et
   au moins une par disposition (téléphone, tablette portrait, tablette paysage, ordinateur, plus 1 440 px pour une
   page de lecture : CLAUDE.md, « Quatre dispositions »). Puis elle commite (un commit par tranche, message en français), écrit sa
   ligne d'Avancement (§ 6) et lance la suivante.
   **Relire les captures, c'est juger l'agencement** (Timothée, 05/11/2026) : sur les captures qu'elle ouvre, la
   session ne se contente pas de constater l'absence de coupure ou de débordement ; elle juge les marges intérieures
   des groupes, les alignements entre voisins, les vides, les coins et les groupes invisibles (gris sur gris, blanc
   sur blanc). `tests/agencement-groupes.spec.ts` mesure ces cinq points sur une quinzaine de pages (cinq projets) et
   doit rester vert : une exception s'y écrit nommément, avec sa raison, dans `EXEMPTIONS`.
4. **Fin du lot** : `testeur` passe la suite complète, découpée en trois (`--shard=1/3`…) dans trois sessions de test
   en parallèle ; la session principale fait une seule relecture de fin, à trois angles sur Sonnet (sans
   contre-vérification Opus, pas de panel après chaque tranche), qui s'appuie sur les journaux de tests au lieu de
   relancer les suites ; la feuille de route et la spec notent l'avancement ; on annonce à Timothée ce qui est à
   valider en local.

## 6. Règles de conduite

Coût (règles issues de l'audit des sessions, validées par Timothée le 10/11/2026, à ajuster après deux ou trois lots) :

- **Plafond de 200 000 jetons pour toute session**, principale comme orchestratrice. Avant de l'atteindre, elle écrit
  l'état dans le § « Avancement » de la spec (fait, reste, décisions prises) et passe la main à une session neuve qui
  repart de ce paragraphe. Une orchestratrice se renouvelle de toute façon toutes les deux ou trois
  tranches.
- **Aucune ligne de suivi vers la session d'origine** : chaque message la réveille et lui fait relire tout son
  contexte. L'orchestratrice écrit **une ligne datée par tranche dans le § « Avancement » de la spec** et pousse
  (`git pull --rebase` avant). Elle n'envoie un message que pour une question bloquante ou à la fin du lot.
- **Pas d'attente de plus de 5 minutes en avant-plan** pour un agent Sonnet ou Opus (son cache expire, tout son
  contexte se réécrit) : l'`executant` ne lance ni Playwright ni `next dev`, il se vérifie par `npx tsc --noEmit` (ou
  `npm run validate` pour des `.cho`) ; les suites longues sont pour le `testeur` (Haiku). Ailleurs, une commande longue
  se lance en arrière-plan et se relit par `tail`.
- **De la spec, un ouvrier ne lit que la section de sa tranche** (`grep -n '^#'` puis la plage), jamais le fichier
  entier ; la consigne fait foi.

Qualité et tests :

- **La qualité se garde dans `/tranche`, pas après** : le `relecteur` a la liste des cas manqués le 24/10/2026, et
  aucun constat n'entre dans un rapport sans contre-vérification (`/verifier-constats`).
- **Specs voisines bornées à quatre, lues par texte seulement** (Timothée, 03/11/2026) : seules les specs qui lisent
  un fichier du diff par texte (`readFileSync`) accompagnent une tranche. Le testeur arrête les `next dev` orphelins
  avant de lancer, attend la fin de Playwright avant de rendre son bilan, ne relance aux tours suivants que les specs
  rouges et ignore les échecs déjà rouges sur la base (`echecsConnus`). Les petites tranches voisines se groupent en un
  seul passage de tests.
- **Une seule suite Playwright à la fois** sur les ports 3100 / 3101. Un banc sur build de production tourne à part
  (3300 / 3301), trois workers au plus.
- **Les ouvriers ne commitent pas**, ne touchent ni à l'index ni à l'historique, n'affaiblissent aucun test.
- **Haiku sous 100 000 jetons de contexte** : sortie dans un fichier, lecture par `grep` et `tail`.

Parallélisme :

- **Trois agents au plus à la fois hors workflow** (neuf d'un coup ont épuisé la limite du mois, le 04/10/2026). Un
  workflow est borné par le processeur : deux agents à la fois dans un conteneur à quatre cœurs
  (`CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS`).
- **Tranches indépendantes en parallèle** (25/10/2026) : une session par tranche, chacune avec ses fichiers, sur la
  même branche ; les traductions vont chacune dans leur espace de clés ; dans l'Avancement, chaque session n'ajoute
  que sa propre ligne (en cas de conflit au `git pull --rebase`, garder les deux).
- **Un workflow se teste à vide d'abord** (sans `args`, il s'arrête avant le premier agent) ; une liste se passe en
  `args` réel, jamais un texte à remplacer.

## 7. Contexte de départ des agents

Ce qu'un agent pèse avant d'avoir rien fait : jetons d'entrée de sa première requête, lus dans sa transcription (même
question pour les huit, aucun outil lancé, session cloud). Mesuré le 10/11/2026 par
`python3 scripts/mesure-contexte-agents.py` ; méthode et décomposition : archive, § 9.

| Agent | Modèle | Avant | Après (mesuré le 11/11/2026) |
| --- | --- | --- | --- |
| `chercheur` | Haiku | 67 160 | 14 914 |
| `testeur` | Haiku | 67 407 | 15 161 |
| `relecteur` | Sonnet | 68 112 | 16 151 |
| `regard` | Sonnet | 67 393 | 12 528 |
| `critique-design` | Opus | 67 801 | 15 555 |
| `executant` | Sonnet | 67 966 | 16 930, `ponytail` préchargé compris |
| `maquettiste` | Sonnet | 84 266 | 32 163 |
| `directeur-artistique` | Opus | 78 751 | 26 505 |

Soit 62 à 81 % de moins (≈ 52 000 jetons par agent), 2 000 à 2 700 jetons au-dessus de l'estimation : aucun outil MCP,
aucune liste de skills ni d'outils différés ; restent les outils de la liste plus `SubagentHandback` (ajouté par le
harnais), les deux `CLAUDE.md` et la consigne. La mesure « après » compte les changements du même soir (liste des
skills plus courte, `ponytail` rendu à l'`executant`, `CLAUDE.md` allongés).

Avant, les définitions d'outils faisaient les deux tiers de ce contexte (les 48 outils MCP de la session à eux seuls ≈ 59 %), la
liste des 60 skills ≈ 15 %, les deux `CLAUDE.md` ≈ 10 %. `disallowedTools` ne retire que les outils qu'il nomme : tout
le reste est hérité, y compris par les agents « en lecture seule ».

**Appliqué le 10/11/2026** (go de Timothée) : chaque agent est déclaré par une liste `tools:`, à la place de
`disallowedTools`.

| Agents | `tools:` |
| --- | --- |
| `chercheur`, `testeur`, `relecteur`, `critique-design`, `directeur-artistique` | `Bash, Read, Grep, Glob` |
| `regard` | `Read, Glob` |
| `executant`, `maquettiste` | `Bash, Read, Edit, Write, Grep, Glob` |

Ils y perdent `Skill`, la recherche web, les connecteurs (GitHub, Notion, Drive, Todoist, Figma) et les outils de
session cloud ; aucune consigne d'agent ne les demande. Le champ `skills:` de l'équipe design et de l'`executant` (`ponytail`, § 4) reste ; les skills dormants de l'aiguillage se lisent par chemin, avec `Read`.

**Vérifié le 11/11/2026, dans une session neuve** : `/tranche`, `/planche` et `/verifier-constats` s'arrêtent à vide
sur « args attendus » ; `/tranche` et `/planche` passent par une petite passe réelle (sortie par `schema` rendue par
tous, `StructuredOutput` y remplace `SubagentHandback`). Le préchargement par `skills:` tient sans l'outil `Skill`
(`executant`, `maquettiste`, `directeur-artistique`). Reste : les agents de `/audit-code` (sans `agentType`), non mesurés.

**Vérifié le 11/11/2026 (consignes finales)**, dans une session neuve qui a chargé `tranche.js` et les trois agents
dans leur version finale. Rien n'a été corrigé.
- Garde-fou : `fd0d1c7` est ancêtre de `HEAD`. Passe.
- Les quatre workflows (`tranche`, `planche`, `verifier-constats`, `audit-code`) lancés sans `args` s'arrêtent sur
  « args attendus », avec 0 agent lancé chacun. Passe.
- `executant` : la consigne contient « un appelant, un test ou une fixture hors de ta liste que ton changement
  casse… » et le skill `ponytail` est dans son contexte (titre « # Ponytail »). Passe.
- `relecteur` : la consigne contient « liste quand même chaque `shortcut:` ajouté par le diff… ». Passe.
- `maquettiste` : point 7 sur la planche cotée, « le skill gagne sur les étapes 2 à 4 ». Passe.
- Étape « Conseil » de `/tranche` : `grep` trouve `.claude/skills/<nom>/SKILL.md` et « Aucune correction ne désactive »
  (`tranche.js:102`) ; le passage à vide prouve que le fichier se charge. Passe.
- Liste des skills de la session : `performance-optimization` absent ; `ponytail`, `security-and-hardening` et
  `impeccable` présents ; 22 skills du projet comptés. Passe.
- Agent de `/audit-code` (workflow d'un seul agent, sans `agentType`, question « 2+2 », aucun outil lancé), mesuré par
  `scripts/mesure-contexte-agents.py` : **73 796 jetons d'entrée**, 62 outils dont 46 MCP (215 000 caractères de
  définitions), 24 800 caractères de liste de skills, 13 000 d'outils différés, 19 300 de `CLAUDE.md`, consigne
  2 900. Un agent déclaré par `tools:` pèse 16 000 à 17 000 jetons (`executant` 16 826, `relecteur` 16 044 dans la
  même session) : environ 57 000 de moins par agent, soit ≈ 3,4 M de jetons d'entrée sur les ~60 agents d'un audit
  (davantage avec les tours suivants ; en partie lus depuis le cache, donc moins cher que le tarif plein). Estimation, non
  mesurée sur un audit réel ; `audit-code.js` non modifié.

**Règle** : tout nouvel agent se déclare par une liste `tools:`, jamais par `disallowedTools`.
