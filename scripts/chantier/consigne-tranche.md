Tu codes UNE tranche du chantier « équipes et groupes » du site GCC Louange, lancé par l'orchestrateur
(scripts/chantier/orchestrateur.sh). Go de Timothée donné le 08/10/2026 au soir.

=== Ta tranche : {{TRANCHE}} ({{ETIQUETTE}}), spec {{SPEC}} ===
{{NOTE}}

Sources de vérité : docs/chantier-equipes-groupes/decisions.md (décisions 1 à 47), puis {{SPEC}}. Lis la spec EN ENTIER
avant de coder (décisions, règles, tranches, droits en double, tests, hors périmètre, « Avancement »). Les autres lots ont
leur spec dans docs/ (spec-equipes-sans-poles, spec-partage-setlist, spec-planning-gestes, spec-organigrammes-groupes,
spec-chants-fetes) : ne code QUE ta tranche, mais respecte ce qu'elles disent des fichiers communs.

Commence par `git status` et `git log --oneline -15` : l'arbre peut contenir le travail NON COMMITÉ d'une tentative
précédente de cette tranche (coupée par une limite de temps ou de dépense). S'il y en a, vérifie-le et REPARS DE LÀ : ne le
jette pas sans raison, ne refais pas ce qui est fait et juste.

=== L'advisor (Opus) ===
Tu as un advisor plus fort que toi. Consulte-le DEUX fois, pas plus : (1) quand tu as lu la spec et le code concerné, avec
ton plan de la tranche (fichiers, ordre, tests) ; (2) avant de committer, avec ce que tu as fait et le résultat des tests.
Une troisième fois seulement si tu es bloqué après deux essais sur la même erreur.

=== Règles (CLAUDE.md fait foi ; les points qui mordent) ===
- Tests Playwright écrits AVANT le code et VUS ROUGES, puis code, puis verts. Trois appareils toujours (projets ordinateur,
  telephone, tablette) ; cinq pour l'agencement (fichier ajouté à SPECS_GRAND_ECRAN dans playwright.config.ts).
  Lancer : `npm test -- tests/<fichier>.spec.ts` ; un seul Playwright à la fois.
- ÉCONOMIE (demande de Timothée : vitesse et tokens) : les tests DE LA TRANCHE sur les appareils dus ; les specs voisines
  que la spec cite, sur le seul projet ordinateur (`--project=ordinateur`). Le passage complet sur trois appareils se fait
  une fois par lot, dans la tranche qui le dit (EQ-F, PG-Z) ou à la revue. Skills : n'invoque que
  `test-driven-development` et `incremental-implementation` (plus `frontend-ui-engineering` pour une tranche d'écran),
  pas le reste de la liste de .claude/CLAUDE.md. Pas de sous-agents. Lis le code par morceaux utiles (graphify, grep,
  Read avec offset), pas des fichiers entiers sans raison.
- Les captures d'agencement se REGARDENT (Read sur les PNG) aux trois tailles.
- Aucune lecture ni écriture de la vraie base Firestore : tout se simule (tests/helpers/fakeSession.ts). Un script qui
  touche la vraie base s'écrit et se teste sur une base simulée, il n'est jamais lancé : c'est Timothée qui le lance.
- Droits en double : src/lib/access.ts ET firestore.rules ; dire dans « Avancement » ce que Timothée doit publier.
- FR et 中文 pour tout libellé nouveau. Toute fonctionnalité de back-office derrière BACK_OFFICE (src/lib/backOffice.ts),
  avec tests/back-office-coupe.spec.ts quand une route ou une page est concernée.
- Aucun nom réel de membre dans le code, les tests, les specs ou les commits : noms fictifs (Léa M., Joël F., Hugo L.…).
- Simplicité : le minimum de code qui fait la règle ; ne touche pas au code voisin ; code mort repéré : le signaler.
- Là où la spec et les décisions ne tranchent pas : la lecture la plus simple, écrite comme « choix faute de réponse »
  dans « Avancement ». Ne t'arrête que devant une action irréversible ou un vrai blocage.
- Échecs déjà présents avant le chantier, à ne pas compter comme régressions (mais un test que ta tranche réécrit doit
  finir vert) : reunions.spec.ts « borne du début » (horloge UTC), programme-scene « membre : ni gestion… » (heure),
  louange-sections-uniques et setlist-editeur-piste2 « clavier Q13 », chants-deux-volets sur tablette couchée,
  setlist-g « Partitions rouvre » (instable).

=== Fin de la tranche ===
1. `npx tsc --noEmit` et `npm run lint` sans erreur ; `git checkout -- next-env.d.ts tsconfig.json` si un serveur de test
   les a réécrits ; jamais test-results/ ni .next*/.
2. Ajoute à « Avancement » de {{SPEC}} une entrée datée du {{DATE}} dans le style des entrées existantes : ce qui est codé,
   choix faits faute de réponse, tests vus rouges puis verts avec leurs comptes, ce qui reste, ce que Timothée doit faire
   (règles à publier, 中文 à relire, scripts à lancer).
3. UN commit, fichiers indexés PAR NOM (jamais `git add -A` ni `git add .`), titre exactement
   `{{ETIQUETTE}} {{TRANCHE}} : <ce que fait la tranche, en français>`. NE POUSSE PAS : l'orchestrateur vérifie et pousse.
4. Si tu ne peux pas finir : ne committe pas sous ce titre ; laisse le travail dans l'arbre et dis pourquoi.

Ta réponse finale, 12 lignes au plus, rien d'autre : FAIT ou PAS FAIT ; le hash du commit ; tests rouges puis verts
(fichiers et comptes) ; choix faute de réponse ; ce que Timothée doit faire ; ce qui reste.
