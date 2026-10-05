# Spec : lot U4 bis — toutes les pages en grand

Lot U4 bis du chantier « Back-Office, grands écrans, petit déj, setlist » (`feuille-de-route.md` § 3.U).
Il remplit, page par page, la place que U4 libère (`spec-navigation-grand-ecran.md` : barre latérale,
quatre dispositions, jeton `--largeur-lecture`) pour les pages qu'aucune autre spec ne couvre. Il
reprend les règles des deux volets de U5 (`spec-deux-volets.md`, Q1, Q15, Q16) ; la Réception suit U6
(`spec-back-office.md`, Messages).

Statut : **Spec écrite le 05/10/2026 d'après la planche (version 17) et les réponses de Timothée du
05/10/2026 ; planche validée le 05/10/2026 (« la planche me convient ») ; questions tranchées par la règle
du 04/10 (sans réponse = recommandation) ; rien n'est codé.** Se code après U4, dans la suite du go du
04/10. Part en ligne avec tout le chantier, à la fin (interrupteur retiré, fusion sur `main`).

## Mots de Timothée

> « il faudrait que toutes les pages du site ait une version ordinateur qui prend toute la taille de
> l'écran pareil pour l'ipad en paysage » (04/10/2026) ; « revois peut être les dispositions en mode
> portrait tablette et téléphone » (04/10/2026).

> « Accueil : A. Accueil téléphone : A. Je suis ok pour tout, sauf pour la page des équipes, aucun
> écran est aussi grand, il faudrait pouvoir slide vers la gauche et vers la droite pour en voir plus.
> il manque aussi les rendus sur téléphone pour pas mal de choses » (05/10/2026).

## Ce que le code montre (05/10/2026)

- **Chaque page est une colonne centrée**, quelle que soit la largeur : 672 px (`max-w-2xl`) pour
  l'accueil (`planning/page.tsx:133`), l'agenda des évènements et sa fiche
  (`evenements/CalendrierClient.tsx:65`, `evenements/[id]/EvenementClient.tsx:72`), Harmonie, son
  cours et ses sons (`harmonie/page.tsx:69`, `harmonie/[...fiche]/FicheClient.tsx:95`,
  `harmonie/cours/page.tsx:132`, `harmonie/cours/[id]/ChapitreClient.tsx:37`,
  `harmonie/rd2000/page.tsx:203`, `harmonie/rd2000/[n]/SonClient.tsx:71`), Mes services
  (`mes-services/page.tsx:200`), Mes tâches (`taches/page.tsx:49`, `taches/[pole]/page.tsx:35`), Moi
  (`moi/page.tsx:56`), le guide (`guide/page.tsx:81`) et l'Admin (`admin/page.tsx:427`) ; 896 px pour
  Setlists (`setlists/page.tsx:263`) ; 512 px pour le profil et l'inscription
  (`(auth)/profil/page.tsx:107`, `(auth)/signup/page.tsx:141`) ; une carte de 384 px pour la connexion
  (`(auth)/login/page.tsx:70`).
- **Liste et détail sont deux adresses** : `/setlists` et `/setlists/[id]`, `/evenements` et
  `/evenements/[id]`, `/harmonie` et `/harmonie/[...fiche]`, `/harmonie/cours` et
  `/harmonie/cours/[id]`, `/harmonie/rd2000` et `/harmonie/rd2000/[n]`. Mes services n'a pas de page
  de détail. Une tâche s'ouvre directement dans son formulaire (`taches/[pole]/page.tsx:117-121`,
  `TacheForm`). La Réception est un onglet de l'Admin.
- **Équipes** : `max-w-5xl` (`EquipesClient.tsx:53`) et une grille en colonnes CSS
  (`columns-1 md:columns-2 lg:columns-3`, `:62`) ; avec 13 équipes, dont Louange (28 personnes) et EDD
  (33), la page descend bien au-delà d'un écran.
- **Moi** porte Notifier et Admin (`moi/page.tsx:79-84`), que U6 range au Back-Office (B2). Le profil
  porte la carte des notifications (`(auth)/profil/page.tsx:157`, `PushToggle`).
- **Connexion** : titre « GCC Louange », sous-titre « Connexion présidents de séance »
  (`login.subtitle`, `fr.json:117` ; 敬拜带领人员登录 en chinois), d'avant l'ouverture à toute
  l'église.
- **Accueil** : « Ton prochain service » (un seul, `planning/page.tsx:139-160`), puis « Ce dimanche »
  en entier (Culte, Table, petit déj, Groupes ou Inter, EDD : chaque groupe et chaque classe avec tous
  leurs rôles, `:163-255`), puis le verset. L'équipe d'un dimanche se lit déjà par `servantsForDate`
  (`lib/planning/names.ts:383`), les services d'une personne par `findMyServices` (`:240`).

## Décisions de Timothée — à ne pas rouvrir

| Date | Décision |
|---|---|
| 04/10 | **Toutes les pages en pleine largeur** sur ordinateur et iPad paysage. Règle : une page qui a une liste passe en deux volets (la liste à gauche, l'élément choisi à droite) ; une page de lecture garde une colonne lisible (720 px) avec son sommaire ; une grille prend toute la largeur ; plus de colonne étroite au milieu de l'écran. Tablette portrait : un volet qui utilise la largeur (cartes sur deux colonnes). |
| 05/10 | **Accueil = piste A** sur les quatre dispositions (planches `accueil-a-*`). Téléphone : « Pour moi » en une carte (prochain service et sa setlist, « Ensuite » reste dans Mes services) pour que « Ce dimanche » entre dans le premier écran ; Groupes et EDD en une ligne par groupe, leur détail reste dans leur onglet. |
| 05/10 | **Les onze réponses** (recommandations acceptées) : aperçu à droite avant d'ouvrir une setlist ; « Nouvel évènement » en encre ; filtres d'Harmonie en rangées ; équipe du service dans Mes services ; fiche d'une tâche à lire, avec « Modifier » ; carte du compte dans Moi ; notifications dans Moi › Réglages, plus dans le profil ; captures du guide refaites une fois le code fait ; Louange et EDD en dernier dans Équipes ; « Connexion » au lieu de « Connexion présidents de séance » ; Réception en une liste avec filtres « Tout · Signalements · Propositions ». |
| 05/10 | **Équipes en bandeau** : l'écran garde sa hauteur, l'organigramme défile de gauche à droite. |
| 05/10 | **Téléphone dessiné pour toutes les pages** (planche version 17). |

## Décisions proposées ici

| # | Proposition | Pourquoi |
|---|---|---|
| Q1 | **Seuils** : les dispositions de U4 (Q1) ; deux volets avec au moins 900 px de largeur utile (U5 Q1) ; tablette portrait = un volet qui utilise la largeur ; téléphone = un volet. | Une seule règle pour tout le site ; c'est celle de Chants et de la setlist. |
| Q2 | **Deux volets = la liste dans un layout de route, le détail est la page d'aujourd'hui** (sans « Retour » en grand), comme Chants (U5 Q15, Q16). Les adresses ne changent pas : un lien vers une fiche ouvre la liste à gauche et la fiche à droite ; sur téléphone, liste puis page, comme aujourd'hui. | La liste reste montée d'un élément à l'autre (recherche, filtres, position) ; les liens partagés, les notifications et le bouton retour marchent sans rien réécrire. |
| Q3 | **Une liste sans élément choisi**, en grand, montre à droite le premier élément de la liste telle qu'elle est filtrée (la prochaine setlist, le prochain évènement, le prochain service, la première tâche à faire, le chapitre en cours, le premier signalement en attente) ; l'adresse ne change qu'au premier toucher. | La planche ne montre jamais un volet vide ; aucun écran d'attente à dessiner. |
| Q4 | **Setlists** : en grand, toucher une setlist ouvre son **aperçu** à droite (catégorie et date, présidence, « Présentation », thème, « Modifiée par… », chants avec structure, tonalité et « orig. », équipe du service), avec « Ouvrir » et « Mode louange » ; l'aperçu se lit dans l'adresse (`?apercu=<id>`, remplacée sans entrée d'historique) ; « Ouvrir » mène à `/setlists/[id]` (deux volets de U5). Tablette portrait : cartes sur deux colonnes qui listent leurs chants. Téléphone : inchangé, toucher ouvre la setlist. | Réponse 3 du 05/10. L'aperçu n'est pas la page de la setlist : une adresse de requête suffit, comme `?tab=`. |
| Q5 | **Évènements** : l'agenda dans le layout, la fiche à droite (inscription, inscrits, description, liens, Tâches, « Gérer dans le Back-Office » pour l'organisateur et les admins, U6 Q14) ; « Nouvel évènement » en encre. Tablette portrait : cartes sur deux colonnes. Téléphone : l'agenda garde les cartes à bannière d'aujourd'hui, puis la fiche (l'inscription remonte sous les infos, pour rester dans le premier écran). La section reste derrière l'interrupteur jusqu'à U9. | Réponses 2 du 05/10 et Q14 de U6 ; cartes à bannière = maquettes de Timothée du 16/09/2026 (lot 6 bis). |
| Q6 | **Harmonie** : le catalogue dans le layout (filtres en rangées qui défilent), la fiche à droite. **Cours** : le sommaire à gauche (le chapitre ouvert y déplie ses parties), la leçon à droite. **Sons du RD-2000** : la vue « Par moment » à gauche, la fiche du son à droite. Tablette portrait et téléphone : planches `harmonie-*-tablette` et `harmonie-*-telephone`. | Réponse 5 du 05/10 ; planches `harmonie-ordinateur`, `harmonie-cours-ordinateur`, `harmonie-rd2000-ordinateur`. |
| Q7 | **Mes services** : la liste à gauche, le service à droite (rôle, répétition, setlist liée, **équipe du service** lue par `servantsForDate`) ; nouvelle adresse `/mes-services/[date]` pour le téléphone et les liens ; tablette portrait : cartes sur deux colonnes. | Réponse 6 du 05/10 ; la page de détail n'existe pas aujourd'hui. |
| Q8 | **Mes tâches** = « À faire pour moi » (U6, B3 et question 3 : les pages des pôles passent au Back-Office ; une ligne « Les tâches des pôles · Back-Office » les remplace pour les responsables) : la liste à gauche, la **fiche à lire** à droite (échéance, responsable, répétition, évènement, « Quand c'est fait, prévenir », lien, note, état à trois positions) avec « Modifier », qui ouvre le formulaire d'aujourd'hui (`TacheForm`) ; téléphone : la fiche en page (`/taches/[pole]/[id]`), « Modifier » ouvre le même formulaire. | Réponse 7 du 05/10 ; aujourd'hui le toucher ouvre le formulaire directement. |
| Q9 | **Moi** : carte du compte (nom, e-mail, rôle, nom dans les plannings, services et rôles, « Mon profil ») ; ordinateur en trois colonnes (compte · listes · Réglages et Déconnexion), tablette portrait en deux, téléphone en une. **Réglages = Notifications · Langue · Thème** ; « Notifications » ouvre les réglages de `PushToggle` (feuille sur téléphone, panneau en grand). Notifier et Admin partent avec U6 (B2) : si U4 bis passe avant, ils restent jusque-là. | Réponses 8 et 9 du 05/10. |
| Q10 | **Profil** : deux colonnes en grand (identité et « Enregistrer mon profil » · services et rôles), une sur téléphone ; plus de carte des notifications. | Réponse 9 du 05/10 ; planches `profil-*`. |
| Q11 | **Guide** : sommaire collant à gauche (270 px), lecture à 720 px ; tablette portrait : sommaire sur deux colonnes en tête ; téléphone : planche `guide-telephone`. Les captures restent celles d'aujourd'hui ; on les refait une fois le code fait (tâche à part). | Réponse 10 du 05/10. |
| Q12 | **Équipes en bandeau** : la page tient dans la hauteur de l'écran ; les équipes se rangent en colonnes (290 px en grand, 300 px en tablette portrait et sur téléphone), les petites l'une sous l'autre tant qu'elles tiennent, dans l'ordre d'aujourd'hui ; Louange et EDD en colonnes larges, en dernier (au bout, les deux tiennent ensemble dans un écran d'ordinateur ; 340 px et trois petites colonnes sur téléphone). Seul le bandeau défile en largeur (`overflow-x: auto`, accroche aux colonnes sur écran tactile) ; la colonne suivante dépasse du bord, avec un fondu ; flèches ‹ › sur ordinateur (`pointer: fine`). **Index** : une pilule par équipe au-dessus du bandeau ; toucher une pilule amène sa colonne ; la pilule de la première colonne visible s'allume. Le rangement en colonnes est une fonction pure, testée, nourrie des hauteurs mesurées des cartes. | Demande du 05/10 ; réponse 11 (ordre gardé). Des colonnes CSS à hauteur fixe débordent sans élargir leur boîte : la suite du bandeau les recouvrirait ; une fonction pure se teste sans navigateur. |
| Q13 | **Connexion et inscription** : écran partagé dès la tablette paysage (la marque d'un côté, le formulaire de l'autre ; l'inscription montre ses trois étapes dans le panneau de marque) ; tablette portrait : la marque en haut ; téléphone : le formulaire d'aujourd'hui. Titre **« Connexion »** (登录), le panneau de marque dit « Réservé aux membres de l'église ». | Réponse 12 du 05/10 ; planches `connexion-*`, `inscription-*`. |
| Q14 | **Accueil A** : en grand, « Ce dimanche » à gauche (Culte en deux colonnes de rôles, Groupes et EDD côte à côte, Table et petit déj avec « Je m'inscris », évènements) et « Pour moi » à droite (prochain service et les deux suivants, setlist de ce service avec « Ouvrir » et « Mode louange ») ; tablette portrait : « Pour moi » en deux cartes côte à côte (trois services suivants), puis « Ce dimanche » ; téléphone : une carte « Pour moi », puis « Ce dimanche » ; sans service à venir, « Pour moi » disparaît ; les évènements restent derrière l'interrupteur jusqu'à U9. | Décision du 05/10 ; planches `accueil-a-*`. |
| Q15 | **Réception** (avec U6) : la liste à gauche avec les filtres « Tout · Signalements · Propositions », le message à droite (« Marquer traité », supprimer ; « Refuser » pour une proposition) ; tablette portrait : les deux cartes côte à côte ; téléphone : la liste filtrée puis le message. | Réponse 13 du 05/10 ; planches `bo-reception-*`. |
| Q16 | **Tests** sur les trois projets Playwright et, pour les deux volets et le bandeau, sur les deux projets de U4 (`tablette-paysage`, `ordinateur-1440`). | Règle des trois appareils ; U4 Q16. |

## Objectif

Sur ordinateur et iPad paysage, aucune page ne garde une colonne de 672 px au milieu d'un grand écran ;
sur tablette portrait, les pages utilisent la largeur ; sur téléphone, seules changent les pages que les
décisions du 05/10 touchent (accueil, Mes services, Mes tâches, Moi, profil, connexion, Équipes,
Réception). Rien ne disparaît : chaque page garde ses données, ses droits et ses libellés.

## Écrans

Planche « Pistes back-office et grands écrans » (artefact `1d4ZW7Y9NVHcsLB9YrrbrA`, version 17),
rangées R7 bis à R15 :

| Page | Ordinateur | iPad paysage | Tablette portrait | Téléphone |
|---|---|---|---|---|
| Accueil | `accueil-a-ordinateur` | `accueil-a-ipad-paysage` | `accueil-a-tablette` | `accueil-a-telephone` |
| Setlists | `setlists-ordinateur` | `setlists-ipad-paysage` | `setlists-tablette` | `setlists-telephone` |
| Évènements | `evenements-ordinateur` | `evenements-ipad-paysage` | `evenements-tablette` | `evenements-telephone`, `evenement-fiche-telephone` |
| Harmonie | `harmonie-ordinateur` | `harmonie-ipad-paysage` | `harmonie-tablette` | `harmonie-telephone`, `harmonie-fiche-telephone` |
| Cours | `harmonie-cours-ordinateur` | — | `harmonie-cours-tablette` | `harmonie-cours-telephone`, `harmonie-cours-lecon-telephone` |
| Sons du RD-2000 | `harmonie-rd2000-ordinateur` | — | `harmonie-rd2000-tablette` | `harmonie-rd2000-telephone`, `harmonie-rd2000-son-telephone` |
| Mes services | `mes-services-ordinateur` | `mes-services-ipad-paysage` | `mes-services-tablette` | `mes-services-telephone`, `mes-services-detail-telephone` |
| Mes tâches | `mes-taches-ordinateur` | `mes-taches-ipad-paysage` | `mes-taches-tablette` | `mes-taches-telephone`, `mes-taches-fiche-telephone` |
| Moi | `moi-ordinateur` | `moi-ipad-paysage` | `moi-tablette` | `moi-telephone`, `notifications-telephone` |
| Profil | `profil-ordinateur` | `profil-ipad-paysage` | `profil-tablette` | `profil-telephone` |
| Guide | `guide-ordinateur` | `guide-ipad-paysage` | `guide-tablette` | `guide-telephone` |
| Équipes | `equipes-ordinateur`, `equipes-ordinateur-fin` | `equipes-ipad-paysage` | `equipes-tablette` | `equipes-telephone`, `equipes-telephone-louange` |
| Connexion | `connexion-ordinateur` | `connexion-ipad-paysage` | `connexion-tablette` | `connexion-telephone` |
| Inscription | `inscription-ordinateur` | — | `inscription-tablette` | `inscription-telephone` |
| Réception (U6) | `bo-reception-ordinateur` | `bo-reception-ipad-paysage` | `bo-reception-tablette` | `bo-reception-telephone` |

Les personnes sont fictives ; chants, fiches, cours, sons et textes du guide sont les vrais. Une page sans
planche iPad paysage prend celle de l'ordinateur, barre réduite. Les planches de téléphone montrent la barre du
haut d'un membre (logo, « GCC Louange », cloche) ; un responsable y voit le sélecteur App · Back-Office à la place
du label (U6, question 5). Accords en noir : c'est la vue « couleurs par section », réglage par défaut (décision du
20/09/2026, `spec-look.md`, retour B). Rangée R15 : les écrans des autres specs sur téléphone (U1 `scene-reserver-*`,
U7 `bo-statistiques-telephone`, U2 `bo-planning-2027-telephone`) et Chants, un chant, le mode louange, inchangés.

## Ce qui sera construit — huit tranches

| Tranche | Contenu | Vérifié par |
|---|---|---|
| B0 — Fondations | Composant `DeuxVolets` (liste dans un layout, détail en page, règle Q1 et Q3), fonction pure `rangerEnColonnes(hauteurs, hauteurMax)` (Q12), pas d'écran changé. | Tests unitaires des deux fonctions ; suite verte. |
| B1 — Accueil A | Q14, quatre dispositions. | Planches `accueil-a-*`. |
| B2 — Setlists, Évènements | Q4, Q5. | Aperçu par l'adresse, « Ouvrir », fiche en volet, téléphone inchangé. |
| B3 — Harmonie | Q6 (catalogue, cours, sons). | Lien direct vers une fiche : liste à gauche ; filtres gardés d'une fiche à l'autre. |
| B4 — Mes services, Mes tâches | Q7, Q8 (adresses nouvelles, équipe du service, fiche de tâche). | Le formulaire ne s'ouvre plus qu'avec « Modifier ». |
| B5 — Moi, profil, connexion | Q9, Q10, Q13. | Notifications dans Réglages, plus dans le profil ; titre « Connexion ». |
| B6 — Guide, Équipes | Q11, Q12. | Bandeau : pas de défilement horizontal de la page, index qui amène Louange. |
| B7 — Réception | Q15, après U6. | Filtres, message en volet. |

## Tests (Playwright, écrits avant le code)

- Sur `ordinateur`, `ordinateur-1440` et `tablette-paysage` : chaque page de liste montre deux volets ;
  un lien direct vers un détail (`/harmonie/<fiche>`, `/evenements/<id>`, `/mes-services/<date>`)
  ouvre la liste à gauche et le détail à droite ; retour arrière rend l'élément précédent.
- Sur `telephone` et `tablette` : un seul volet ; la liste puis la page, comme aujourd'hui.
- Partout : `document.documentElement.scrollWidth ≤ innerWidth` (pas de défilement horizontal de la
  page), Équipes compris : seul son bandeau défile en largeur.
- Équipes : la page ne dépasse pas la hauteur de la fenêtre ; toucher « Louange » dans l'index amène la
  carte Louange dans le bandeau ; la pilule allumée suit le défilement ; flèches sur `ordinateur` seulement.
- `rangerEnColonnes` : ordre gardé, aucune colonne au-dessus de la hauteur donnée sauf une carte seule
  plus haute qu'elle, colonnes larges en dernier.
- Accueil : « Pour moi » présent avec un service à venir, absent sans ; Groupes et EDD en une ligne par
  groupe ; le premier écran du téléphone montre le début de « Ce dimanche ».
- Moi : « Notifications » dans Réglages ouvre les réglages ; le profil n'a plus de carte Notifications.
- Connexion : titre « Connexion » (fr) et 登录 (zh).
- Mes tâches : toucher une tâche ouvre sa fiche, « Modifier » ouvre le formulaire.
- Captures regardées à l'œil sur les trois appareils (et les deux projets de U4) pour chaque tranche.

## Hors périmètre

Chants et la page d'une setlist (U5), l'éditeur de setlist (U5 bis), les pages du Back-Office autres que
la Réception (U6 à U8), les grilles du planning (U2), le petit déj (U3), le contenu des évènements de 2027
(U9), les nouvelles captures du guide (après le code).

## Questions — tranchées le 05/10/2026 par la règle du 04/10 (recommandations)

Timothée a validé la planche sans répondre une à une : chaque question prend sa recommandation ; elles
restent révisables s'il en reparle.

1. **Verset de l'accueil** : la planche A ne le montre pas. Le garder en bas de page sur toutes les
   dispositions ? Reco : oui, en bas, comme aujourd'hui.
2. **Aperçu d'une setlist par l'adresse** (`?apercu=<id>`) : d'accord pour qu'il se partage comme une
   adresse ? Reco : oui.
3. **Fiche de tâche sur téléphone en page** (`/taches/[pole]/[id]`) plutôt qu'en feuille ? Reco : page,
   pour qu'une notification puisse y mener.
4. **Grand tableau d'une leçon sur téléphone** (6 colonnes, « Les cadences ») : en blocs empilés, une ligne du
   tableau par bloc (dessiné), ou qui défile dans son cadre (aujourd'hui) ? Reco : blocs empilés, chaque ligne se lit
   sans glisser.
5. **Catalogue d'Harmonie sur téléphone** : les filtres au-dessus de « Par où commencer » (dessiné, comme en grand),
   ou le parcours d'abord, qui disparaît au premier filtre (aujourd'hui) ? Reco : comme dessiné, un seul ordre partout.

## Commandes

```bash
npx tsc --noEmit
npm run lint
npm test -- tests/pages-en-grand-*.spec.ts
```

## Avancement

- 05/10/2026 : spec écrite ; planche version 17.

**B0 — faite le 05/10/2026** (branche `lot/u4bis-pages-en-grand`, après fusion de `lot/u4-navigation` et
`lot/u5-deux-volets` ; commit `feat(U4bis): B0 — fondations…`). Aucun écran ne change.
- `src/components/layout/DeuxVolets.tsx` : `<DeuxVolets racine liste premier largeurListe>{children}</DeuxVolets>`,
  à poser dans le layout de route d'une section (Q2). Bâti sur `useDeuxVolets` de U5 (Q1, pas de second hook). En
  grand : la liste à gauche (`data-volet="liste"`, 380 px par défaut, collante sous `--nav-h`, défile seule, filet à
  droite), à droite la page de l'adresse ou, sur l'adresse de la liste, `premier` (Q3 : le premier élément de la
  liste filtrée, ou son état vide) ; le tout borné par `--largeur-lecture` et centré. Un volet : la liste seule sur
  son adresse, la page seule ailleurs (la liste n'est pas montée), comme aujourd'hui. La page de l'adresse de la
  liste (`page.tsx`) n'est jamais montrée : elle rend `null`, la liste vit dans le layout. Les deux emplacements
  gardent leur place : passer d'un volet à deux ne remonte pas la page.
- `src/lib/deuxVolets.ts` : la règle sans React (`disposerVolets`, `estSurLaListe`, barre finale tolérée : le site
  sert `/x/`), et `SECTIONS_EN_DEUX_VOLETS` + `cleDeTransition`. `PageTransition` remontait toute la page à chaque
  adresse (`key={pathname}`) : la liste d'un layout aurait été rechargée à chaque élément. Une section inscrite dans
  `SECTIONS_EN_DEUX_VOLETS` n'est plus remontée qu'en la quittant, et `DeuxVolets` fait le fondu de ses volets (le
  détail se fond, la liste ne bouge pas). **La liste est vide avec B0** : chaque tranche y ajoute sa section avec son
  layout (`/evenements`, `/mes-services`…).
- `src/lib/equipes/rangerEnColonnes.ts` : `rangerEnColonnes(hauteurs, hauteurMax, { larges, ecart })` → colonnes
  `{ cartes, large }` (Q12) ; ordre gardé, une carte sous la précédente tant que la colonne (écarts compris) tient,
  une carte plus haute que la limite seule, les `larges` (Louange, EDD) une par colonne, en dernier.
- Tests : `tests/pages-en-grand-fondations.spec.ts` (13 tests, fonctions pures), vus rouges (module absent, puis
  bouchons : 8 échecs) puis verts sur les cinq projets (65). `playwright.config.ts` : `pages-en-grand-*.spec.ts` entre
  dans `SPECS_GRAND_ECRAN`. Le composant a été essayé sur une route jetable (non commitée) sur les cinq projets :
  deux volets sur ordinateur, ordinateur-1440 et tablette paysage (liste 380 px à côté de la barre), un volet sur
  téléphone et tablette ; liste restée montée d'un élément à l'autre (défilement gardé), retour arrière, aucun
  défilement horizontal ; captures regardées. `tsc` et ESLint propres ; `navigation-grand-ecran`, `look-navigation`
  verts.
- Relevé, sans rapport avec B0 : `songs-list-return.spec.ts` échoue sur `ordinateur` (2 tests « bouton Retour » : la
  flèche du Retour introuvable à 390 px avec un pointeur fin), déjà sans le changement de `PageTransition` ; vient
  des fusions U4/U5.
- **Fusion avec U5 T5** : U5 (non commité au 05/10) change aussi `PageTransition` pour garder `/songs` montée ; à
  l'intégration, garder `cleDeTransition` et inscrire `/songs` dans `SECTIONS_EN_DEUX_VOLETS` (ou garder les deux).
- Reste : B1 à B7.
- À faire par Timothée : rien pour B0 (aucune règle, aucun écran).

**B1 — Accueil A, faite le 05/10/2026** (branche `lot/u4bis-pages-en-grand`, commit `feat(U4bis): B1 — Accueil A…`).
- `src/app/planning/page.tsx` : mêmes lectures qu'avant (feuilles, fallbacks, Interfranco / Intergroupe), le rendu
  part dans deux composants. Disposition : en grand (`useDeuxVolets`, règle Q1) « Ce dimanche » à gauche (1,45 fr),
  « Pour moi » à droite (1 fr) ; dès 768 px sans deux volets (tablette portrait, ordinateur étroit barre dépliée)
  « Pour moi » en deux cartes côte à côte puis « Ce dimanche » ; téléphone : une carte puis « Ce dimanche ». Le verset
  reste en bas (question 1), le lien du guide aussi. Cartes en relief (`.raised`, 16 px) comme la planche.
- `src/components/accueil/PourMoi.tsx` : prochain service (vignette, date longue, service à sa couleur et rôles,
  « dans 3 jours »), « Ensuite » (2 en grand, 3 sur tablette, aucun sur téléphone : il reste dans Mes services), « Mes
  services › » ; la setlist de ce service (titre, présidence, chants numérotés, tonalité en rectangle 5C1), « Ouvrir »
  et « Mode Louange » (bouton plein à la couleur du service). Sans service à venir, le bloc disparaît.
- `src/components/accueil/CeDimanche.tsx` : Culte (ou Interfranco / Intergroupe) en deux colonnes de rôles, une sur
  téléphone, la personne en pastille d'encre ; Groupes et EDD côte à côte, une ligne par groupe (présidence et
  musiciens ; présidence pour une classe) ; Prépa. Table et petit déj ; prochains évènements (deux, derrière
  `BACK_OFFICE` jusqu'à U9).
- `src/lib/planning/accueil.ts` (pur) : `pourMoi`, `reunirServices`, `choisirSetlist` / `setlistDuService` (la règle de
  Mes services, sortie de sa page sans la changer), `joursAvant`, `porteLeNom`.
- `SetlistDetailClient.tsx` : `?louange=1` ouvre le mode louange dès la setlist lue (sans plein écran natif, qui
  demande un geste sur la page) et s'efface de l'adresse. Servira aussi à l'aperçu de B2 (Q4).
- `serviceButton.ts` : l'entrée `#c87941 → #a66436` de U3 (Q15), à l'identique, pour « Je m'inscris ».
- Libellés FR et 中文 sous `planning.accueil.*` (中文 à relire par Timothée : « 我的安排 » pour « Pour moi », « 之后 »,
  « 本次服事的歌单 », « 主领：», « 近期活动 », « 空闲 », « 我来报名 ») ; « Ce dimanche · 4 octobre » sans l'année, comme la planche.
- Tests : `tests/pages-en-grand-accueil.spec.ts` (13 tests, dont 4 purs) sur les cinq projets ; vus rouges (13 échecs
  sur ordinateur et téléphone avant le code), puis verts. `look-planning.spec.ts` suit les cartes (plus de filet) ;
  `planning-petit-dej.spec.ts` (lot 1b) : une case vide n'est plus « pas de ligne » mais « Libre » et « Je m'inscris »
  (Q14). Avec les specs voisines (planning-accueil, back-office-coupe, coherence, planning-*, look-*, nouveaux-membres) :
  vertes sur les cinq projets.
  Captures regardées aux cinq tailles et comparées aux planches `accueil-a-*`.
- Choix faute de réponse : pas d'heures (10:30, 13:00 de la planche : le planning ne les porte pas) ; « Paix »,
  « Fidélité », « Bonté » (libellés d'aujourd'hui) plutôt que « Groupe Paix » ; une setlist que la personne ne peut pas
  ouvrir (`canSeeSetlist`) n'est pas proposée ; sans setlist, la carte de la setlist n'est pas montrée ; évènements
  sans pastille « Inscrit » ; « Je m'inscris » mène à Planning › Table (l'inscription de U3), seulement interrupteur
  ouvert et pour un dimanche à venir ; interrupteur coupé, le petit déj ne paraît que rempli, comme avant.
- **Fusion avec U3 et U2** : leur `planning/page.tsx` change la lecture du prochain service (`servicesDuCompte`,
  `sansBrouillon`, `avecDimanchesSpeciaux`) et ajoute des rôles (percussion, cours) dans les blocs supprimés ici. À la
  fusion : garder leur calcul des services dans le `useMemo` de `mesServices` (en passant le résultat à `pourMoi`),
  ajouter la percussion aux lignes de groupe et le cours à l'EDD si on les veut sur l'accueil, et lire le petit déj par
  `lirePetitDej` / `estLibre` (« Libre » plus juste que la case vide du Sheet). Leurs clés `planning.petitDej.libre` /
  `inscrire` doublonnent `planning.accueil.libre` / `inscrire` : en garder une paire. Le test de U3 « Ce dimanche : sans
  inscription, pas de ligne Petit déj » contredit Q14 (planche : « Libre » et « Je m'inscris ») : le réécrire comme ici.
- Reste : B2 à B7.
- À faire par Timothée : relire le 中文 ci-dessus ; rien à publier (aucune règle).

**B3 — Harmonie, faite le 05/10/2026** (branche `lot/u4bis-pages-en-grand`, commit `feat(U4bis): B3 — Harmonie…`).
Reprise après la coupure du matin : l'agent coupé n'avait laissé que `tests/pages-en-grand-harmonie.spec.ts` (non
commité, aucun code) ; gardé, une attente corrigée (lire la fiche avant le toucher, pas après).
- **Trois layouts de route** posent `DeuxVolets` (Q2) : `src/app/harmonie/(catalogue)/layout.tsx` (le groupe
  `(catalogue)` tient le cours et les sons hors du layout du catalogue ; adresses inchangées), `harmonie/cours/layout.tsx`,
  `harmonie/rd2000/layout.tsx`. Chaque `page.tsx` de liste rend `null` ; `/harmonie/cours`, `/harmonie/rd2000`, `/harmonie`
  entrent dans `SECTIONS_EN_DEUX_VOLETS` (dans cet ordre : le premier préfixe gagne). L'accès est vérifié une fois, dans
  le layout : sans droit, une seule phrase, ni liste ni fiche.
- **Catalogue** (`components/harmonie/Catalogue.tsx`, contexte `catalogueContexte.ts`) : filtres et instrument vivent dans
  le layout, donc restent d'une fiche à l'autre ; en grand, la première fiche de la liste filtrée à droite (Q3) et sa
  ligne allumée (`GroupRow actif`, `aria-current="page"`) ; filtres au-dessus de « Par où commencer » partout
  (question 5), en rangées grises qui défilent (`Pilules` : gris de la planche au lieu du blanc) ; tablette debout :
  cours et sons en deux cartes, parcours en trois cartes, familles en cartes sur deux colonnes.
- **Fiche** (`components/harmonie/FicheHarmonie.tsx`) : en cartes (planches `harmonie-*`) ; en grand, sans « Retour »,
  Piano · Guitare dans l'en-tête, « Pourquoi » + « Quand l'éviter » à côté de l'instrument, répertoire sur deux colonnes
  (trois dès 1 440 px) ; six exemples avant « Voir plus » (huit avant), comme la planche.
- **Cours** (`components/harmonie/cours/` : `CoursHarmonie`, `SommaireCours`, `ChapitreHarmonie`) : coches partagées
  par un contexte (« J'ai fini » allume la ligne à gauche) ; en grand, sans leçon choisie, le chapitre en cours (le premier
  pas fini dans l'ordre conseillé) ; le chapitre ouvert s'allume et déplie ses parties (`nav` « Sommaire ») dans la liste,
  plus de second sommaire à droite ; tablette debout : bouton « Sommaire » qui ouvre la liste du cours par-dessus la leçon
  (Échap, fond, ✕, changement de chapitre la ferment) ; téléphone : le sommaire de la leçon en carte en tête, et un
  tableau de plus de trois colonnes en blocs empilés sous 640 px (question 4 ; « Toutes les cadences »), barre de
  progression du cours (planches téléphone et tablette).
- **Sons du RD-2000** (`components/harmonie/rd2000/` : `Rd2000Harmonie`, `SonRd2000`, `contexte.ts`) : vue, recherche et
  filtres dans le layout ; en grand, le premier son de la vue (« Par moment » : le premier moment ; « Tous les sons » : le
  premier de la liste filtrée) ; réglages sur deux colonnes en grand par `couperEnDeuxColonnes` (`lib/harmonie/rd2000.ts`,
  pure : moitié arrondie au-dessus à gauche, un écran plus long que la moitié s'y coupe et sa fin ouvre la seconde avec
  « (suite) », jamais un morceau d'un seul réglage) ; tablette debout : un moment par carte, deux par rangée.
- Partagés, ajouts sans effet ailleurs : `GroupRow` prend `actif` ; `PageTitle` prend `niveau` (le titre de la liste est un
  `h2` en deux volets, l'`h1` est celui de droite).
- Libellés : `harmonie.rd2000.suite` « {{ecran}} (suite) » / « {{ecran}}（续） » (中文 à relire).
- Tests : `tests/pages-en-grand-harmonie.spec.ts` (16 tests, dont 2 purs) sur les cinq projets ; vus rouges (30 échecs
  sur ordinateur, téléphone, tablette, tablette paysage avant le code), puis verts. Adaptés au nouvel écran :
  `harmonie-cours.spec.ts` (« Prochain chapitre » cherché sous la leçon, la liste en a un aussi en grand ; sur tablette, le
  sommaire s'ouvre par son bouton) et le test B0 de `pages-en-grand-fondations` (les sections ne sont plus vides).
  `harmonie-catalogue`, `harmonie-cours`, `rd2000`, `coherence`, `harmonie-*` voisines, `fusions-dp`, `back-office-coupe` :
  verts. Captures regardées aux cinq tailles et comparées aux planches `harmonie-*`.
- Choix faute de réponse : la leçon sur tablette garde « ‹ Cours » (la planche dit « ‹ Harmonie » ; le cours reste le
  parent) ; la partie lue n'est pas suivie au défilement dans la liste (la planche met 9.1 en gras) ; le parcours
  s'efface toujours au premier filtre ; en grand, la ligne de la première fiche s'allume avant le premier toucher.
- Reste : B2, B4 à B7.
- À faire par Timothée : relire le 中文 « {{ecran}}（续） » ; rien à publier (aucune règle).
