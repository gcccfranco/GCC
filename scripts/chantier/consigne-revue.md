Tu es le relecteur du lot {{ETIQUETTE}} du chantier « équipes et groupes » du site GCC Louange, qui vient d'être codé
tranche par tranche par un modèle plus petit. Tu es lancé par l'orchestrateur (scripts/chantier/orchestrateur.sh).
{{NOTE}}

Sources : docs/chantier-equipes-groupes/decisions.md (décisions 1 à 47) et {{SPEC}}. Le lot = les commits dont le titre
commence par « {{ETIQUETTE}} » (`git log --oneline --grep '^{{ETIQUETTE}} '`) ; d'autres sessions poussent aussi sur la
branche : ne relis pas leurs commits. Commence par `git show --stat` de chacun, puis lis ce qui porte le risque d'abord :
src/lib/access.ts, firestore.rules, les routes serveur sous src/app/api, les scripts de migration, puis les écrans.

Commence par `git status` : l'arbre peut contenir le travail NON COMMITÉ d'une revue précédente coupée ; repars-en.

=== 1. Relire ===
Deux axes. Conformité : chaque règle de la spec et chaque décision du lot est-elle faite comme écrite ? droits en double
access.ts / firestore.rules cohérents ? tests demandés présents ? FR et 中文 ? BACK_OFFICE ? « Avancement » dit-il vrai ?
Bugs et sécurité : règles trop larges ou trop strictes, routes qui ne revérifient pas l'appelant, données d'un autre
écrasées, courses, migration non idempotente, cas limites (champ absent, équipe vide), régressions, fuite de BACK_OFFICE en
ligne. Un constat = une preuve (fichier:ligne, chemin réel jusqu'à l'erreur, règle en cause) ; pas de constat de style.

=== 2. Corriger ===
Chaque constat bloquant ou important : corrigé avec un test vu rouge puis vert. Les mineurs : corrigés s'ils sont
évidents et petits, sinon notés.

=== 3. Passage complet ===
Une seule fois, sur les trois appareils (cinq pour l'agencement) : toutes les specs Playwright que {{SPEC}} crée, met à
jour ou dit de garder vertes, plus tests/back-office-coupe.spec.ts ; tsc et lint. Un échec relancé une fois puis réel est
à réparer ; dis s'il existait avant le lot. Échecs déjà connus avant le chantier : reunions.spec.ts « borne du début »,
programme-scene « membre : ni gestion… », louange-sections-uniques et setlist-editeur-piste2 « clavier Q13 »,
chants-deux-volets sur tablette couchée, setlist-g « Partitions rouvre ».

Règles du dépôt : CLAUDE.md fait foi (aucune lecture de la vraie base Firestore, noms fictifs, droits en double,
simplicité, `git checkout -- next-env.d.ts tsconfig.json` si un serveur de test les a réécrits). Pas de sous-agents.

=== Fin ===
Ajoute à « Avancement » de {{SPEC}} une entrée « Relecture et passage complet » datée du {{DATE}} : constats corrigés,
laissés et pourquoi, résultats des suites, ce que Timothée doit faire. UN commit, fichiers indexés PAR NOM, titre
exactement `{{ETIQUETTE}} REVUE : relecture et passage complet`. NE POUSSE PAS : l'orchestrateur vérifie et pousse.

Ta réponse finale, 12 lignes au plus : FAIT ou PAS FAIT ; le hash ; constats (corrigés / laissés) ; suites lancées et
résultat ; ce que Timothée doit faire.
