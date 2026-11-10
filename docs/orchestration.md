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

## 5. Un lot, de bout en bout

1. **Timothée demande.** La session principale (Opus) fait la planche si l'écran change, puis la spec avec ses
   tranches. Rien ne se code avant le go (CLAUDE.md, « Go »).
2. **Go.** La session principale lance une session orchestratrice (`create_session`) ; sa consigne tient en une page :
   la spec, son § « Avancement », ce qui reste. **Retouche** (trois fichiers au plus, pas de spec, aucune décision
   nouvelle, toujours sur go) : pas de session orchestratrice ni de `/tranche`, la session courante lance un
   `executant` puis un `testeur` (go efficience de Timothée, 10/11/2026, règle proposée ; précise la règle du
   18/10/2026).
3. **Chaque tranche** : `/tranche` avec la consigne exacte et les specs de test. **Au retour** (go efficience de
   Timothée, 10/11/2026, règle proposée) :
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

Coût (go efficience de Timothée, 10/11/2026 : sa demande était générale, ces quatre règles sont proposées par la
session et restent à confirmer par lui) :

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
