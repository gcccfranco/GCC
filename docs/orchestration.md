# Orchestration — qui fait quoi, sur quel modèle

**Date** : 24/10/2026 · **Origine** : demande de Timothée (« mettre en place des orchestrateurs comme le
recommande Anthropic, pour déléguer à des modèles moins coûteux »), avec l'audit du même jour
([audit-2026-10-24.md](audit-2026-10-24.md)), qui a servi de premier essai grandeur nature.

Ce document complète les règles « Sessions cloud » du `CLAUDE.md` (session orchestratrice, agents en
parallèle, déléguer) : il dit **quel modèle fait quoi**, **comment un lot passe d'un modèle à l'autre**, et
ce qui est installé dans `.claude/` pour le faire.

---

## 1. Ce que recommande Anthropic (sources lues le 24/10/2026)

1. **Orchestrateur et ouvriers.** Un modèle fort découpe, délègue et juge ; des modèles moins chers
   exécutent, chacun dans son propre contexte, et ne rendent qu'un résumé. La fiche système d'Opus 4.5
   mesure un orchestrateur Opus avec des sous-agents Haiku **12,2 % au-dessus** d'Opus seul, et Opus
   meilleur orchestrateur que Sonnet. La doc des sous-agents de Claude Code le dit en une phrase :
   *« Control costs by routing tasks to faster, lower-cost models like Haiku »*.
2. **Le conseiller (« advisor »), à l'inverse.** Sonnet ou Haiku mène la tâche et consulte Opus seulement
   quand il bute. Anthropic annonce Sonnet + Opus à +2,7 points sur SWE-bench Multilingual pour un coût par
   tâche **11,9 % plus bas** que Sonnet seul. L'outil `advisor` n'existe que dans l'API ; dans Claude Code on
   l'imite : c'est l'étape « Conseil » du workflow `tranche` (§ 4).
3. **Un sous-agent quand une tâche annexe inonderait le contexte** (recherche, journaux de tests, gros
   fichiers) ; rester dans la conversation principale pour les allers-retours fréquents ou une modification
   rapide et ciblée. Restreindre les outils de chaque agent (`tools`, `disallowedTools`).
4. **Les workflows** mettent la boucle dans un script (le script décide ce qui tourne ensuite, pas le
   modèle) : c'est là qu'on met la **contre-vérification adversariale** des constats avant qu'ils ne soient
   rendus.
5. **`opusplan`** (`/model opusplan`) : Opus en mode plan, Sonnet pour exécuter. Utile en session locale
   interactive, quand on ne passe pas par une session orchestratrice.

Sources : [sous-agents](https://code.claude.com/docs/en/sub-agents),
[workflows](https://code.claude.com/docs/en/workflows),
[modèles et effort](https://code.claude.com/docs/en/model-config),
[stratégie advisor](https://claude.com/resources/articles/the-advisor-strategy),
[orchestrator-workers](https://platform.claude.com/cookbook/patterns-agents-orchestrator-workers),
[prix](https://platform.claude.com/docs/en/about-claude/pricing).

## 2. Les prix qui dictent la répartition

Par million de jetons, entrée / sortie (page des prix, 24/10/2026) :

| Modèle | Entrée | Sortie | Lecture du cache |
| --- | --- | --- | --- |
| Opus 5.5 | 4 $ | 20 $ | 0,20 $ |
| Sonnet 5.5 | 2 $ | 10 $ | 0,10 $ |
| Haiku 5.5, contexte ≤ 100 000 jetons | 0,10 $ | 0,50 $ | 0,01 $ |
| Haiku 5.5, contexte > 100 000 jetons | 0,50 $ | 2,50 $ | 0,05 $ |

Deux conséquences :

- **Haiku coûte 40 fois moins qu'Opus tant que son contexte reste sous 100 000 jetons**, cinq fois plus
  au-delà. D'où la consigne déjà écrite dans `chercheur` et `testeur` : sortie de commande dans un fichier,
  lecture par `grep` et `tail`, jamais un journal entier dans le contexte.
- **Sonnet coûte moitié moins qu'Opus** : c'est le bon ouvrier pour tout ce qui demande de comprendre du
  code (appliquer une décision, contre-vérifier, regarder des captures), pas pour décider.

## 3. Qui fait quoi

| Travail | Qui | Modèle | Pourquoi |
| --- | --- | --- | --- |
| Décider : spec, planche, arbitrage, sévérité, découpe en tranches | conversation principale | Opus | jugement, contexte du projet |
| Relire le diff final, regarder les captures et les 简谱, commiter | conversation principale | Opus | CLAUDE.md : « la conversation principale garde le jugement » |
| Chercher dans le code, les docs, les `.cho`, git | `chercheur` | Haiku | lecture seule, contexte court |
| Lancer une suite (Playwright, tsc, lint, validate, check.py) et rendre les échecs | `testeur` | Haiku | mécanique |
| Appliquer une modification décidée et décrite | `executant` | Sonnet | exactitude sur plusieurs fichiers |
| Correction purement mécanique déjà rédigée (une ligne de doc, un libellé, un `git rm`) | `executant` avec `model: haiku` | Haiku | rien à comprendre |
| **Contre-vérifier un constat ou un diff** (nouveau) | `relecteur` | Sonnet | adversarial, lecture seule |
| **Trier des captures** avant le regard d'Opus (nouveau) | `regard` | Sonnet | vision, première passe |
| Trouver la cause quand deux tours de correction échouent | étape « Conseil » de `/tranche` | Opus | le conseiller, rappelé seulement quand ça résiste |
| Chercheurs d'un audit sur la sécurité et les permissions | `/audit-code` | Opus | là où une erreur coûte cher |
| Chercheurs des autres dimensions d'audit | `/audit-code` | Sonnet, Haiku (docs) | lecture large |

## 4. Ce qui est installé

### Agents (`.claude/agents/`)

- `chercheur` (Haiku), `testeur` (Haiku), `executant` (Sonnet) : inchangés.
- **`relecteur`** (Sonnet, lecture seule) : relit un diff au regard de sa spec et des règles du CLAUDE.md
  (deux langues, `access.ts` ↔ `firestore.rules`, interrupteur `BACK_OFFICE`, noms fictifs, zones gelées),
  ou cherche à réfuter un constat. Verdict prouvé par `chemin:ligne`, « incertain » plutôt que « confirmé »
  dans le doute.
- **`regard`** (Sonnet, lecture seule) : ouvre des captures PNG et signale ce qui se voit (débordement,
  texte coupé, contraste, cible minuscule, incohérence entre dispositions, langues, thèmes). Ne décide rien
  du design ; la conversation principale regarde les captures signalées.

### Workflows (`.claude/workflows/`, chargés au démarrage d'une session, ou par `/reload-skills`)

- **`/tranche`** — une tranche décidée d'un lot : `executant` code → `testeur` lance tsc, lint et les specs
  nommées → `executant` corrige (deux tours au plus) → si ça résiste, Opus diagnostique et `executant`
  applique → `relecteur` relit le diff. Ne commite pas : la conversation principale relit, regarde les
  captures, commite, puis lance la tranche suivante.
  `args : { spec, tranche, consigne, tests: [...], base }`.
- **`/verifier-constats`** — un `relecteur` par constat, sur la tête de branche (un constat déjà corrigé sur
  `origin` sort en `deja_corrige`). À passer sur tout constat avant qu'il entre dans un rapport, une spec ou la
  feuille de route. `args : { base, constats: [...] }`.
- **`/audit-code`** — l'audit en 11 dimensions du 24/10/2026, réutilisable : environ 60 agents et 5 millions
  de jetons, **sur demande de Timothée seulement**. `args : { commit, build? }`.
- **Proposé, sur go** : versionner le banc d'essai de l'audit (parcours des pages sur les cinq dispositions avec
  axe-core, balayage des chants, fuzzing, hors ligne réel sur `127.0.0.2`, réseau lent, « singe », liens morts) dans
  `tests/rude-epreuve/` avec sa propre configuration (builds de production sur 3300 / 3301), et un workflow
  `/rude-epreuve` : `testeur` (Haiku) lance le banc, un agent Sonnet résume les mesures, `regard` trie les captures,
  `relecteur` contre-vérifie, Opus juge. Aujourd'hui le banc vit hors dépôt (remis à Timothée en archive).

## 5. Un lot, de bout en bout

1. **Timothée demande.** La session principale (Opus) fait la planche si l'écran change, puis la spec avec ses
   tranches. Rien ne se code avant le go (CLAUDE.md, « Go »).
2. **Go.** La session principale lance une session orchestratrice (`create_session`, CLAUDE.md « Coder =
   une session orchestratrice ») avec la spec, les décisions et la liste des tranches.
3. **Chaque tranche** : `/tranche` avec la consigne exacte et les specs de test. Au retour : la session lit le
   verdict du `relecteur`, relit le diff, regarde les captures sur les trois appareils (cinq pour une page
   d'agencement), commite (un commit par tranche, message en français), puis lance la suivante.
4. **Fin du lot** : `testeur` passe la suite complète ; `relecteur` relit le diff du lot entier ; la feuille de
   route et la spec notent l'avancement ; on annonce à Timothée ce qui est à valider en local.

## 6. Règles de conduite

- **Concurrence.** Trois agents au plus à la fois hors workflow (le 04/10/2026, neuf d'un coup ont épuisé la
  limite du mois). Un workflow est borné par le processeur : deux agents à la fois dans un conteneur à quatre
  cœurs ; `CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS` le règle.
- **Une seule suite Playwright à la fois** sur les ports 3100 / 3101 (le `testeur` vérifie avant de lancer).
  Un banc sur build de production tourne à part (3300 / 3301) et à trois workers au plus.
- **Les ouvriers ne commitent pas**, ne touchent ni à l'index ni à l'historique ; ils ne désactivent ni
  n'affaiblissent aucun test.
- **Haiku sous 100 000 jetons de contexte** : sortie dans un fichier, lecture par morceaux.
- **Aucun constat sans contre-vérification** : le 24/10/2026, sur 76 constats, la contre-vérification en a
  écarté 2 et en a rétrogradé 22 d'un cran de sévérité (aucun relevé) ; elle vérifie aussi, sur `origin`, ceux
  qu'une autre session a corrigés entre-temps.
- **Le cache se partage** dans une rafale : même modèle, même type d'agent, même schéma de sortie → les agents
  qui suivent lisent le préfixe du premier.
- **Un workflow se teste à vide d'abord** (sans `args`, il s'arrête avant le premier agent) ; une liste se
  passe en `args` réel, jamais un texte à remplacer (erreur commise et rattrapée le 24/10/2026).

## 7. Bilan du premier essai (audit du 24/10/2026)

| Étape | Agents | Modèles | Résultat |
| --- | --- | --- | --- |
| Audit du code, 11 dimensions | 11 chercheurs + 47 contre-vérifications | Opus (sécurité, permissions), Sonnet, Haiku (docs) ; contre-vérification Sonnet | 76 constats, 72 confirmés, 2 incertains, 2 réfutés ; ≈ 5 M de jetons, 26 min |
| Revue design des captures | 17 lots + 2 transverses | Sonnet | 450 captures, 270 constats bruts dont 39 évidents ; ≈ 2,8 M de jetons, 19 min ; Opus a ensuite regardé à l'œil une quinzaine de constats ; quelques-uns étaient des comportements normaux (barre flottante qui passe sur le contenu pendant le défilement, texte indicatif « •••••••• » pris pour un mot de passe saisi) |
| Suite complète du dépôt | 1 | Haiku (`testeur`) | interrompue à 1 570 tests sur 13 199 (conteneur partagé avec le banc) ; à refaire en fin de lot |
| Banc d'essai (513 pages, 382 chants, fuzzing, hors ligne réel, réseau lent, « singe » sur 516 boutons) | aucun agent : scripts Playwright écrits par Opus | — | aucune erreur JS sur 513 pages ; les mesures du rapport |
| Synthèse, vérification à l'œil des constats graves, rapport | conversation principale | Opus | ce document et le rapport |

La part d'Opus s'est limitée à la découpe, aux deux chercheurs « à risque » (sécurité, permissions) et au
jugement final ; tout le reste est passé par Sonnet et Haiku. Sur les 74 constats gardés, les chercheurs ont
estimé que 23 se corrigent sur Haiku, 25 sur Sonnet, 11 demandent Opus et 15 une décision de Timothée.

## 8. Ce que la journée du 24/10/2026 a coûté, et ce qui change

Coût de la journée, d'après les sessions : session principale ≈ 206 $, flux A ≈ 40 $, flux B ≈ 23 $. La limite de
dépense a été atteinte à 18 h 53 UTC et a arrêté le flux B. Deux causes :

- **La lecture du contexte.** Chaque appel d'outil relit tout le contexte de la session. Dans une session à 350 000 ou
  420 000 jetons, la lecture en cache fait la plus grosse part de la facture : 455 M de jetons lus pour la session
  principale, 129 M pour le flux A.
- **Les relectures en panel.** Cinq angles et cinq contre-vérifications, tous sur Opus, après chaque tranche, avec
  builds et suites relancés dans un conteneur à quatre cœurs : de 2 à 3 h et de 2 à 4 M de jetons par relecture. Elles
  ont trouvé de vrais défauts (dont une setlist ouverte par un lien jamais gardée hors ligne), que le `relecteur` de
  `/tranche` n'avait pas vus.

Règles à partir du 24/10/2026, 20 h :

- **Une session orchestratrice neuve toutes les deux ou trois tranches.** Sa consigne tient en une page : la spec, le §
  « Avancement », ce qui reste. La spec et l'Avancement portent l'état, pas le fil de la session.
- **La qualité se garde dans `/tranche`, pas après.** Le `relecteur` a la liste des cas manqués le 24/10. Le `testeur`
  relance les specs voisines (celles qui citent un fichier modifié). L'argument `preuve` impose un essai réel sur build
  de production pour le service worker, le hors ligne, les notifications et les droits.
- **La session principale ne relit plus en panel.** Elle lit le verdict de `/tranche` et le diff. Elle fait, une fois
  par lot, une relecture de fin à trois angles sur Sonnet (sans contre-vérification Opus), qui s'appuie sur les
  journaux de tests du flux au lieu de relancer les mêmes suites.
- **Moins de réveils.** Une ligne par tranche du flux vers la session principale, et un point d'étape toutes les 3 h.
- **En parallèle quand les tranches sont indépendantes** (25/10/2026) : une session par tranche, chacune avec ses
  fichiers, sur la même branche. Les traductions vont chacune dans leur propre espace de clés, et l'Avancement de la
  spec est tenu par la session principale, ce qui évite les conflits de `git pull --rebase` sur les mêmes lignes.
- **Specs voisines bornées à huit** dans `/tranche` (A6 : 2 h 45, dont une bonne part en specs voisines lourdes). La
  suite complète, en fin de lot, se découpe en trois (`--shard=1/3`…), dans trois sessions de test légères en
  parallèle.
