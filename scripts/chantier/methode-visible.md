# Méthode des sessions visibles (chantier « équipes et groupes »)

Choix de Timothée du 12/10/2026 : le chantier se code dans des sessions cloud qu'il suit dans l'app (une par lot ou
par chaîne de lots), et **Opus vérifie automatiquement ce que Sonnet a fait, à chaque tranche**. Cette méthode remplace
l'orchestrateur sans écran (`orchestrateur.sh`), gardé pour mémoire.

## La boucle, pour chaque tranche, sans qu'on le demande

La session (Sonnet) coordonne ; elle garde son propre contexte léger.

1. **Coder** : un sous-agent (outil Agent, `model: "sonnet"`) code la tranche de bout en bout selon
   `scripts/chantier/consigne-tranche.md` (remplacer `{{…}}` ; ignorer sa section « advisor »). Il committe sous le
   titre `ÉTIQUETTE TRANCHE : …` mais **ne pousse pas**.
2. **Relire (Opus, automatique)** : un sous-agent (outil Agent, `model: "opus"`), à contexte neuf, relit le commit de la
   tranche (`git show`) et ce qu'il touche. Il ne modifie rien. Deux axes :
   - conformité : chaque règle de la spec et chaque décision du lot faite comme écrite ; droits en double
     `src/lib/access.ts` / `firestore.rules` cohérents ; tests demandés présents et vus rouges avant le code ; FR et
     中文 ; BACK_OFFICE ; l'entrée « Avancement » dit vrai ;
   - bugs et sécurité : règles trop larges ou trop strictes, routes qui ne revérifient pas l'appelant, données d'un
     autre écrasées, cas limites (champ absent, équipe vide), régressions, fuite du back-office en ligne.
   Un constat = une preuve (fichier:ligne, chemin réel jusqu'à l'erreur, règle en cause) et une gravité (bloquant,
   important, mineur) ; pas de constat de style.
3. **Corriger** : le sous-agent codeur (repris avec SendMessage s'il est disponible, sinon un nouveau sous-agent Sonnet
   avec les constats) vérifie chaque constat, corrige les vrais bloquants et importants avec un test vu rouge puis vert,
   les mineurs s'ils sont évidents, relance les tests touchés, tsc et lint. Il ajoute à l'entrée « Avancement » de la
   tranche : « Relu par Opus : N constats, M corrigés ; laissés : … et pourquoi », et amende son commit local
   (pas encore poussé).
4. **Pousser** : la session vérifie `git log -1`, `npx tsc --noEmit`, puis `git pull --rebase origin ui/apple-design`
   et `git push origin ui/apple-design`.
5. **Dire** : une ligne pour Timothée dans la session : tranche, commit, constats d'Opus (trouvés / corrigés), ce qu'il
   doit faire.

## À la fin de chaque lot

Même boucle en plus large, titre `ÉTIQUETTE REVUE : relecture et passage complet` : un sous-agent Opus relit tous les
commits du lot (`git log --grep '^ÉTIQUETTE '`), en commençant par `access.ts`, `firestore.rules`, les routes serveur et
les migrations ; un sous-agent Sonnet corrige, puis fait le passage complet sur trois appareils (cinq pour
l'agencement) de toutes les specs Playwright du lot, plus `tests/back-office-coupe.spec.ts`.

## Rappels

- Branche `ui/apple-design` seule ; jamais `main`, jamais `push --force`. D'autres sessions poussent aussi : `git pull
  --rebase` juste avant chaque push ; en conflit, garder les deux ajouts.
- Aucune lecture de la vraie base Firestore ; scripts de migration écrits et testés sur base simulée, lancés par
  Timothée seul ; `firestore.rules` publiées à la main par Timothée.
- Économie : tests de la tranche sur trois appareils, specs voisines sur le seul projet ordinateur ; skills limités à
  `test-driven-development` et `incremental-implementation` (plus `frontend-ui-engineering` pour un écran).
- Limite du forfait atteinte : s'arrêter proprement, dire où on en est ; on reprend après la remise à zéro.
