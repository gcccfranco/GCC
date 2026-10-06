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

**B2 — Setlists et Évènements, faite le 05/10/2026** (branche `lot/u4bis-pages-en-grand`, après la fusion de
`lot/u6-back-office` ; commit `feat(U4bis): B2 — Setlists et Évènements…`).
- **Fusion de U6** (commit de fusion) : l'accueil A garde la lecture des services de U2/U3 (`servicesDuCompte`,
  `sansBrouillon`, `avecDimanchesSpeciaux`) dans « Pour moi » ; la percussion (U2, P5) rejoint les musiciens de la
  ligne d'un groupe, le cours de l'EDD reste dans son onglet ; « Libre » et « Je m'inscris » seulement si les
  inscriptions ont été lues (illisibles : pas de ligne, U3 T8). Les tests U3 de « Ton prochain service » lisent
  « Pour moi » ; le test « sans inscription, pas de ligne » dit maintenant « Libre » (Q14). Barre latérale : espace
  Back-Office (U6) et liste retenue des setlists (U5) gardés tous deux.
- **Setlists (Q4)** : `setlists/page.tsx` en trois dispositions (`hooks/useDisposition.ts`, sorti de l'accueil B1).
  En grand, `DeuxVolets` (racine `/setlists`) : la liste à gauche (400 px), à droite l'aperçu
  (`components/setlists/ApercuSetlist.tsx`) de `?apercu=<id>` ou, sans aperçu, de la première setlist de la liste
  filtrée (Q3) ; toucher une ligne remplace l'adresse (`useSetlistsNavState`, sans entrée d'historique), la ligne
  s'allume. L'aperçu : catégorie et date, présidence, « Présentation », thème (les notes), « Modifiée par… »
  (`SetlistHistory`), les chants (`ListView` de U5, qui prend `lienBase` : toucher un chant ouvre la setlist à ce chant),
  « Ouvrir » et « Mode Louange » (`?louange=1` de B1), et « L'équipe de ce service » lue dans le planning déjà chargé
  par la liste (`lib/setlist/equipeDuService.ts`, pur : Culte, Inter, groupes, Fidélité avec ses musiciens, Campus par
  moment, classes de l'EDD), la personne en pastille d'encre ; chants et équipe côte à côte quand le volet a 680 px
  (requête de conteneur). Tablette portrait : cartes sur deux colonnes qui listent leurs chants
  (`SetlistCarteChants`) ; « Nouvelle » à côté du titre et « Mes services » en tête de la rangée des filtres (grand et
  tablette). Téléphone : inchangé.
- **Évènements (Q5)** : l'agenda vit dans le layout (`evenements/SectionEvenements.tsx` → `CalendrierClient`, qui prend
  la fiche en enfant ; `evenements/page.tsx` rend `null`) ; `/evenements` entre dans `SECTIONS_EN_DEUX_VOLETS`. Le
  programme de scène garde sa page et ses onglets. En grand : titre, onglets en pilules (`EvenementsTabs enLigne`),
  « Nouvel évènement » en encre (rond « + » : le libellé ne tient pas dans 380 px), lignes compactes
  (`EvenementCard` prend `actif` et un badge « Inscrit » / « Complet » / « Bientôt ») ; à droite la fiche de l'adresse
  ou, sur `/evenements`, celle du prochain évènement (sinon la première info). La fiche de l'App
  (`EvenementClient`, qui prend `id`) en grand : titre (h1) et « Gérer dans le Back-Office » en tête, bannière,
  description, liens et gestion des inscriptions de l'organisateur à gauche, infos et inscription (`fiche-carte`),
  réunion et tâches à droite ; `EnteteEvenement` se découpe en `Banniere`, `TitreEvenement`, `InfosEvenement`. Un
  volet : cartes à bannière (deux colonnes dès 768 px), fiche d'une carte où l'inscription remonte sous les infos.
  La fiche du Back-Office ne change pas. Interrupteur coupé : la section reste en 404 (layout inchangé sur ce point).
- Tests : `tests/pages-en-grand-setlists.spec.ts` (9, dont 3 purs) et `tests/pages-en-grand-evenements.spec.ts` (7),
  vus rouges (21 échecs sur ordinateur, téléphone, tablette) puis verts sur les cinq projets. Adaptés au nouvel
  écran : `evenements.spec.ts` (en grand, les tests des grandes cartes de l'agenda et de la carte blanche L6 passent en
  un volet ; les fiches lisent `fiche-carte`, l'agenda montrant aussi lieux, états et « Connexion » ; titre de
  l'agenda en h2 quand une fiche est à droite, qui porte le h1), `reunions.spec.ts` (la ligne de l'agenda),
  `setlist-suppression-groupee.spec.ts` (en grand, la ligne mène à `?apercu=` ; vignettes alignées mesurées depuis le
  bord de leur ligne, les cartes de la tablette étant sur deux colonnes). Avec les specs voisines (accueil,
  fondations, setlist-deux-volets, setlist-g, look-navigation, navigation-grand-ecran, coherence, back-office-coupe,
  back-office-admin, programme-scene, taches, taches-evenements, nouveaux-membres, planning-petit-dej) : vertes sur
  leurs projets. Captures regardées aux cinq tailles et comparées aux planches `setlists-*` et `evenements-*`.
- Choix faute de réponse : la structure des chants reste en texte (« I · C1 · R », vue Liste de U5) et non en pastilles ;
  l'équipe ne paraît que pour les catégories que le planning porte (pas de carte vide) ; l'organisateur garde sa
  carte de gestion (panneau, lien d'inscription) — en grand dans la colonne de gauche, plus large ; sur téléphone, la
  barre « ‹ Évènements · Gérer dans le Back-Office » de la planche n'est pas refaite (carte de gestion d'aujourd'hui).
- Reste : B4 à B7.
- À faire par Timothée : relire le 中文 « 歌单预览 », « 本歌单的调性 », « 本次服事团队 », « 根据排班表 » ; rien à publier (aucune
  règle).

**B4 — Mes services et Mes tâches, faite le 05/10/2026** (branche `lot/u4bis-pages-en-grand`, commit `feat(U4bis): B4 —
Mes services et Mes tâches…`). Reprise après l'arrêt du run de 23 h 30 : l'agent arrêté avait laissé le code et les deux
fichiers de test, non commités et jamais lancés ; tout gardé (conforme à Q7 et Q8), vu rouge puis vert, deux erreurs
ESLint corrigées, trois retouches après les captures (dates « Dim. 4 oct. », état sur une ligne, captures sans fondu).
- **Mes services (Q7)** : la liste vit dans le layout (`app/mes-services/layout.tsx` →
  `components/mesServices/SectionMesServices.tsx`, qui lit plannings, petits déj de U3, setlists et index des chants une
  fois, et les donne par contexte) ; `page.tsx` rend `null` ; nouvelle adresse `/mes-services/[date]`, avec
  `?service=` quand la personne sert deux fois ce jour-là (`lib/planning/mesServices.ts`, pur : `grouperServices` sorti de
  l'ancienne page, `adresseDuService`, `serviceDeLAdresse`, `repetitionsDe`). En grand, `DeuxVolets` (400 px) : la liste
  (`ListeMesServices`, ligne du service ouvert en encre) et à droite le service (`DetailService`) ou, sur `/mes-services`,
  le premier de l'onglet (À venir : le prochain ; Passés : le dernier). Le service : vignette, service à sa couleur, date
  longue (h1), « dans N jours », rôles ; la répétition (Campus) en carte ; la setlist liée (règle de l'accueil,
  `setlistDuService`, seulement si `canSeeSetlist`), avec « Ouvrir » et « Mode Louange » ; « L'équipe de ce service »
  par `equipeDuService` de B2 (même lecture que `servantsForDate`, rangée par rôle), la personne en pastille d'encre. En
  grand la setlist et l'équipe côte à côte (requête de conteneur, `.service-colonnes`) ; un volet : « ‹ Mes services »,
  l'équipe puis la setlist (boutons en tête). Tablette portrait : une carte par service, deux colonnes. Téléphone : les
  lignes d'un mois dans une carte, avec chevron ; le lien « Setlist » de la ligne mène toujours à la setlist.
  `components/setlists/CarteEquipe.tsx` : la carte de l'équipe, sortie de l'aperçu de B2 (`ApercuSetlist` l'utilise).
- **Mes tâches (Q8)** : « À faire pour moi » vit dans le layout (`app/taches/layout.tsx` → `components/taches/SectionTaches.tsx`,
  toujours derrière `BACK_OFFICE` et `RequireAuth`) ; `page.tsx` rend `null` ; nouvelle adresse `/taches/[pole]/[id]`
  (`?date=` pour une fois d'une tâche répétée). `/mes-services` et `/taches` entrent dans `SECTIONS_EN_DEUX_VOLETS`.
  Toucher une tâche ouvre sa **fiche à lire** (`components/taches/FicheTache.tsx`), plus le formulaire : pôle, titre, état
  à trois positions (À faire · En cours · Terminée, `choisirEtat` dans `lib/firebase/taches.ts` : « À faire » supprime la
  fois, les deux autres l'écrivent en gardant la date de début ; « Terminée » prévient comme le cercle), échéance,
  responsable (« Tout le pôle »), répétition, évènement (lien vers sa fiche), « Quand c'est fait, prévenir », lien, note.
  « Modifier » ouvre `TacheForm` (enregistrer, supprimer, nouveau responsable prévenu, comme le Back-Office). Le cercle de
  la ligne garde son cycle. En grand, la liste à gauche (ligne ouverte en encre, `TacheLigne` prend `actif`), la fiche à
  droite, sur `/taches` la première à faire ; un volet : la fiche en page avec « ‹ Tâches » (question 3). Tablette
  portrait : « À faire pour moi » et « Les tâches des pôles » côte à côte. Une tâche d'un pôle dont on n'est pas : « Tu ne
  fais pas partie de ce pôle. » ; une tâche effacée : « Cette tâche n'existe plus. ».
- Libellés : `mesServices.introuvable`, `taches.introuvable`, `taches.fiche.modifier`, `taches.etat.*` (中文 à relire :
  « 这一天没有你的服事。 », « 该任务已不存在。 », « 编辑 », « 状态 », « 待办 », « 进行中 », « 已完成 »).
- Tests : `tests/pages-en-grand-mes-services.spec.ts` (11, dont 4 purs) et `tests/pages-en-grand-taches.spec.ts` (7),
  vus rouges sans le code (25 échecs sur ordinateur, téléphone, tablette : adresses absentes, formulaire au toucher), puis
  verts sur les cinq projets (63 passés, 27 sautés : tests propres à une disposition). Avec les specs voisines (fondations,
  setlists, accueil, taches, taches-evenements, back-office-coupe, back-office-admin, look-*, nouveaux-membres,
  planning-2027, planning-annee-sheet, planning-sainte-cene, planning-petit-dej, reunions, setlist-suppression-groupee) :
  vertes sur leurs projets, après deux retouches. Adaptés au nouvel écran : en grand, le service ouvert à droite redit son
  nom et ses rôles, donc `back-office-coupe`, `planning-2027` et `planning-sainte-cene` comptent les lignes (lien
  « Groupe Paix, … ») ou prennent le premier texte ; `look-halo` attendait un h1 sur `/mes-services` sans aucun service :
  le titre de la liste reste un h1 tant que rien n'est ouvert à droite (Mes services et Mes tâches). Captures regardées aux
  cinq tailles et comparées aux planches `mes-services-*` et `mes-taches-*`.
- Relevé, sans rapport avec B4 : trois tests de l'accueil dans `planning-2027.spec.ts` (« Ce dimanche du 17/01/2027…
  Prochain service », « P5 · Ce dimanche montre la Percussion… », « Prochain service : le brouillon 2027… ») échouent sur
  les trois appareils : ils cherchent le lien « Ton prochain service » et le libellé « Percussion » de l'ancien accueil,
  que B1 a remplacés (« Pour moi », percussion dans la ligne des musiciens). À réécrire avec l'accueil A (B1, ou à
  l'intégration).
- Choix faute de réponse : sur `/mes-services`, à droite le premier service de l'onglet ouvert (« Passés » : le dernier
  passé) ; l'adresse d'un service seul à sa date n'a que la date ; Mes tâches ne montre pas la liste des pôles de la
  planche (Q8 et U6 B3 : « Les tâches des pôles · Back-Office » la remplace) ; les notifications de tâche mènent encore à
  `/taches` (l'adresse de la fiche existe, les messages n'ont pas été changés : hors de la tranche) ; avec une seule des
  deux cartes (pas de setlist liée), l'équipe garde la largeur d'une colonne.
- Reste : B5 à B7 (suites parallèles `u4bis-b5`, `u4bis-b67`).
- À faire par Timothée : relire le 中文 ci-dessus ; rien à publier (aucune règle : la fiche lit et écrit les mêmes
  documents que la ligne).

**B5 — Moi, profil, connexion, faite le 05/10/2026 (suite parallèle B5)** (branche `lot/u4bis-b5`, partie de
`lot/u4bis-pages-en-grand` après B3 et B2 ; commit `feat(U4bis): B5 — Moi, profil, connexion…` ; à fusionner dans
`lot/u4bis-pages-en-grand`).
- **Moi (Q9)** : `moi/page.tsx` range ses blocs par `useDisposition` — en grand, trois colonnes (compte · listes et
  liens · Réglages, Notifier/Admin s'ils sont là, Déconnexion) ; tablette portrait, deux (compte et Réglages · listes,
  liens, Notifier/Admin, Déconnexion) ; téléphone, une (compte, listes, liens, Notifier/Admin, Réglages, Déconnexion).
  Chaque bloc en carte `.raised` ; page bornée par `--largeur-lecture`. `components/moi/CarteCompte.tsx` : initiale, nom,
  e-mail, pastille « Admin » (admins seulement), nom dans les plannings, services et rôles en pastilles à la couleur du
  service (ordre du formulaire du profil), « Mon profil ». La ligne « Mon profil » des listes reste (planche).
- **Réglages = Notifications · Langue · Thème** : `components/moi/ReglagesNotifications.tsx` — la ligne dit « Activées » /
  « Désactivées » (abonnement de cet appareil, relu à la fermeture) et ouvre `PushToggle` inchangé : feuille posée en bas
  sur téléphone (vaul), panneau de 420 px à droite dès la tablette portrait. Ligne montrée quand le profil existe, comme
  la carte l'était dans le profil.
- **Profil (Q10)** : `(auth)/profil/page.tsx` — titre de page à gauche (`PageTitle`), deux colonnes dès 768 px
  (identité et nom dans les plannings, « Enregistrer mon profil » dessous · services et rôles), une sur téléphone,
  « Enregistrer » en bas ; plus de `PushToggle`. `ProfileFields.ServiceGrid` : les cartes des services sur deux colonnes
  quand sa carte a 540 px (requête de conteneur `.grille-services`, globals.css) — profil en grand et inscription ;
  l'administration (Personnes) en profite pareil.
- **Connexion et inscription (Q13)** : `components/auth/EcranMarque.tsx` — écran partagé dès 1 024 px (`lg`, tablette
  paysage et ordinateur) : panneau de marque à gauche (logo, « GCC Louange », « Réservé aux membres de l'église », halos
  pâles rouge et bleu `.panneau-marque`), le formulaire à droite ; ailleurs la marque en haut. Connexion : titre
  **« Connexion »** (`login.heading`, 登录), plus de carte. Inscription : les trois étapes dans le panneau (en colonne en
  grand, sur une ligne ailleurs ; une étape faite se touche pour revenir), sous le titre la barre de progression seule.
  `login.subtitle` (« Connexion présidents de séance ») supprimée des deux locales.
- Libellés : `login.heading`, `login.reserve` (« 仅限教会成员 »), `moi.compte` (« 我的账号 »), `moi.admin` (« 管理员 »),
  `moi.notifications`, `moi.activees` (« 已开启 »), `moi.desactivees` (« 已关闭 ») ; le guide (§ Notifications) dit
  « Moi › Réglages » au lieu du profil (« 在**我 › 设置**中，点「通知」启用它们。»).
- Tests : `tests/pages-en-grand-moi.spec.ts` (10) sur les cinq projets, vus rouges (20 échecs sur ordinateur et
  téléphone avant le code) puis verts. Adaptés : `back-office-coupe` (PD4 : la bascule « Petit déj » se cherche dans
  Moi › Réglages › Notifications), `planning-petit-dej` (les deux tests de la bascule « Petit déj », vus rouges après le
  retrait de `PushToggle` du profil, passent par Moi › Réglages › Notifications), `taches`, `look-navigation`,
  `back-office-admin` (« Mon profil » est deux fois sur Moi : `.first()`). Captures regardées aux cinq tailles et comparées aux planches `moi-*`, `notifications-telephone`,
  `profil-*`, `connexion-*`, `inscription-*`.
- Choix faute de réponse : la connexion et l'inscription gardent la barre de l'app (barre latérale, barre du haut et du
  bas sur téléphone), que les planches ne dessinent pas — l'écran partagé occupe la zone de contenu ; sur téléphone, la
  marque est en bandeau au-dessus du formulaire comme la planche `connexion-telephone` (la spec disait « le formulaire
  d'aujourd'hui » : mêmes champs et liens) ; le panneau des notifications vaut aussi pour la tablette portrait ; pas de
  pastille de rôle pour un membre (seulement « Admin ») ; les pastilles des services gardent les libellés français du
  formulaire (comme `ProfileFields`).
- Reprise du 05/10/2026 (le premier passage avait été coupé avant le commit) : travail relu et gardé tel quel, tests
  relancés — `pages-en-grand-moi` 50/50 sur les cinq projets ; specs voisines (`back-office-coupe`, `back-office-admin`,
  `back-office-espace`, `taches`, `look-*`, `coherence`, `i18n-hydration`, `planning-petit-dej`, `notif-president`)
  1 031 verts, les 7 échecs = les deux tests du petit déj ci-dessus (corrigés, verts) et un test de la Sainte cène
  (`back-office-coupe`, nom en double avec le pied de la barre latérale, sans rapport ; vert à la relance).
- Relevé, sans rapport avec B5 : `write-excel-file` manquait dans `node_modules` de la copie (déclaré dans
  `package.json`, pages du planning au Back-Office en erreur de compilation, ce qui figeait l'hydratation des autres
  pages en dev) ; ESLint : un avertissement ancien (`set-state-in-effect`) dans `profil/page.tsx`.
- Reste (suite B5) : rien.
- À faire par Timothée : relire le 中文 ci-dessus ; rien à publier (aucune règle, aucun droit changé).

**B6 — Guide et Équipes, faite le 05/10/2026 (suite parallèle B6/B7)** (branche `lot/u4bis-b67`, partie de
`lot/u4bis-pages-en-grand` après B2 ; commit `feat(U4bis): B6 — Guide et Équipes…`). Deux reprises : la première
n'a rien trouvé de l'agent coupé et a tout codé sans commiter ; la seconde (06/10/2026) a relu ce travail, l'a
gardé tel quel, l'a revu vert (48 verts, 12 sautés hors appareil), contre-épreuve refaite (pages d'avant : 15 rouges sur
`ordinateur` et `telephone`) et l'a commité.
- **Équipes (Q12)** : `components/equipes/BandeauEquipes.tsx`. Dans l'App, la page tient dans la hauteur de l'écran
  (`.equipes-ecran` dans `globals.css` : sous la navbar, au-dessus de la cale de la barre du bas ; jusqu'en bas sur
  ordinateur et iPad paysage) ; le titre porte les onglets Équipes · Musiciens à droite ; dessous, l'**index** (une
  pilule par équipe, noms courts `equipes.court.*`) puis le **bandeau**, seul à défiler en largeur. Les cartes sont
  mesurées (`ResizeObserver`) et rangées par `rangerEnColonnes` (B0) : 290 px en grand, 300 px sur tablette et
  téléphone ; Louange et EDD en colonnes larges, en dernier (moitié de l'écran chacune en grand : au bout, les deux
  tiennent ensemble ; 560 px sur tablette ; 340 px sur téléphone), leurs sous-groupes sur trois colonnes sous le
  référent. Une carte plus haute que le bandeau défile dans sa colonne. Fondu à droite (rien au bout), flèches ‹ › avec
  un pointeur fin seulement, accroche aux colonnes sur écran tactile. Toucher une pilule amène sa colonne ; la pilule
  de la première colonne visible s'allume (la pilule touchée reste allumée si sa colonne est la première visible, ou
  au bout du bandeau), et la rangée de l'index la garde à l'écran. Halo de Moi. Onglet Musiciens et Back-Office
  (Équipes › Organigramme, édition) : inchangés, colonnes d'aujourd'hui.
- **Guide (Q11)** : `guide/page.tsx` en trois dispositions (`useDisposition`). En grand : sommaire collant à gauche
  (270 px), lecture à 720 px au plus, titre au-dessus de la lecture ; la partie lue s'allume dans le sommaire (au
  défilement, au toucher, la dernière au bas de la page). Tablette portrait : sommaire en carte sur deux colonnes, en
  tête, partie lue allumée ; lecture sur la largeur. Téléphone : sommaire en carte, une ligne de 44 px par partie,
  filets. Cartes en relief (`.raised`, 16 px), titres de partie à 18 px, texte à 15 px, halo de Moi. Captures du guide
  inchangées (à refaire après le code, tâche à part).
- Libellés FR et 中文 : `equipes.court.*` (中文 = les noms d'équipe d'aujourd'hui, déjà courts), `equipes.index`
  « Index des équipes » / « 团队索引 », `equipes.precedentes` / `suivantes` « Équipes précédentes / suivantes » /
  « 上一组团队 » / « 下一组团队 ».
- Tests : `tests/pages-en-grand-guide-equipes.spec.ts` (12 tests, dont 1 sur les données ; organigramme fictif aux
  effectifs d'aujourd'hui, Louange 28, EDD 33) sur les cinq projets ; vus rouges (bandeau, index, flèches, sommaire
  absents) puis verts. Voisines vertes : `equipes`, `look-secondaires`, `nouveaux-membres`, `back-office-coupe`,
  `coherence` ; revues le 06/10 avec `back-office-admin`, `back-office-espace`, `barre-back-office` (688 verts). Captures regardées aux cinq tailles et comparées aux planches `equipes-*` et `guide-*`.
- Choix faute de réponse : le bandeau n'est que dans l'App (au Back-Office, une carte s'ouvre en formulaire : pas de
  hauteur fixe) ; la pilule allumée est la première équipe de la première colonne visible, sauf la pilule touchée
  (Décoration partage sa colonne avec Événementiel) ; barre de défilement du bandeau masquée (flèches, glisser) ; halo
  de Moi (encre) sur les deux pages, celles-ci étant sous l'onglet Moi, au lieu du bleu clair de la planche ; sommaire
  sans partie allumée sur téléphone (la planche n'en montre pas).
- Reste : B7 (Réception), sur la même branche.
- À faire par Timothée : relire le 中文 « 团队索引 », « 上一组团队 », « 下一组团队 » ; rien à publier (aucune règle).

**B7 — Réception, faite le 06/10/2026 (suite parallèle B6/B7)** (branche `lot/u4bis-b67`, après B6 et la fusion
de `lot/u6-back-office` ; commit `feat(U4bis): B7 — Réception…`). Reprise : l'agent coupé n'avait rien laissé
pour B7 (copie propre, B6 commitée).
- **Fusion de U6** (commit de fusion) : un seul conflit, l'import de `BarreLaterale.tsx` (`entreeBackOffice` de U6 et
  `listeSetlistsRetenue` de U5 gardés tous deux).
- **Réception (Q15)** : `components/messages/ReceptionVolets.tsx`, rendu par `back-office/messages/page.tsx`. En grand
  (`useDisposition`, règle U5 Q1) : la liste à gauche (420 px, 340 px sur iPad paysage), les filtres « Tout ·
  Signalements · Propositions » (`Pilules` d'Harmonie), « Signalements » puis « Propositions de chants » avec
  « N en attente », chaque ligne avec titre, auteur et date, étiquette Chant / Site (ou Traité / Refusé) ; la ligne
  choisie en encre ; « Voir les traités (N) » sous chaque groupe. À droite le message : étiquette, titre (h2), auteur
  et date, la description et les liens (le chant, la page ; YouTube et partition pour une proposition) dans une
  carte, puis « Marquer traité » (« Rouvrir » pour un signalement traité), « Refuser » pour une proposition en
  attente, la corbeille. Sans choix, le premier message en attente de la liste filtrée (Q3), sinon « Aucun message
  en attente. ». Tablette portrait : les deux cartes côte à côte, avec leur phrase d'aide, un message se déplie dans
  sa carte. Téléphone : les filtres, une carte, un message qui se déplie. `messages/layout.tsx` : sur la Réception
  en grand, l'en-tête sur toute la largeur au-dessus des deux volets, qui descendent jusqu'en bas ; tablette portrait
  sur la largeur ; Notifier et Questionnaire gardent leur colonne.
- **Données** : `useReception` sort de `components/admin/Reception.tsx` (mêmes lectures et écritures) ; l'ancien bloc
  `Reception` le garde et ne change pas : interrupteur coupé, `/admin` (`AncienneAdmin`) reste l'écran d'avant.
- Libellés FR et 中文 sous `backOffice.reception.*` (中文 à relire : 全部, 问题反馈, 诗歌推荐, « {{n}} 条待处理 », 查看已处理,
  隐藏已处理, 标为已处理, 重新打开, 拒绝, 已处理, 已拒绝, 诗歌, 网站, « {{nom}} 推荐 », 页面, PDF 乐谱, 删除此问题反馈,
  删除此推荐, 暂无问题反馈, 暂无诗歌推荐, 暂无待处理消息, 消息, 筛选消息, les deux phrases d'aide, l'erreur).
- Tests : `tests/pages-en-grand-reception.spec.ts` (10 tests) sur les cinq projets ; vus rouges (12 échecs sur
  ordinateur, téléphone, tablette avant le code), puis verts (29 verts, le reste sauté hors appareil).
  `tests/helpers/fakeSession.ts` : une `Date` devient un `timestampValue` (la page lit `createdAt` en date ; une
  chaîne la faisait tomber). Voisines sur les trois appareils : `back-office-admin`, `back-office-coupe`,
  `back-office-espace`, `barre-back-office` (438 verts ; un test de la feuille « Ta barre du bas » tombé une fois
  sur tablette pendant une suite chargée, vert relancé seul). Captures regardées aux cinq tailles et comparées aux planches `bo-reception-*`.
- Choix faute de réponse : le message choisi vit dans la page, pas dans l'adresse (rien ne mène à un message précis) ;
  après « Marquer traité » ou « Refuser », le message reste à droite (« Rouvrir », étiquette) au lieu de passer au
  suivant ; supprimer passe au premier en attente ; pas de filtres sur la tablette portrait (les deux cartes sont
  déjà côte à côte, comme la planche) ; pas de halo dans le volet du message ; filtres à la taille de ceux d'Harmonie
  (40 px), un peu plus grands que la planche ; une proposition refusée peut encore être marquée traitée (comme
  l'ancien bloc).
- Reste : rien pour B6/B7 ; la suite parallèle est finie, à fusionner dans `lot/u4bis-pages-en-grand`.
- À faire par Timothée : relire le 中文 ci-dessus ; rien à publier (aucune règle : `reports` et `songProposals`
  gardent les leurs).

**Fusion finale, faite le 06/10/2026** (branche `lot/u4bis-pages-en-grand` ; commits de fusion `d64121f` (U5),
`02cb11c` (U6), `e63b339` (B5), `3d9564f` (B6/B7) ; correctifs `fix(U4bis): fusion — …`). Toutes les tranches B0 à B7
sont dans la branche, avec les versions finales relues de U4, U5 et U6.
- **Fusions** : `lot/u4-navigation` déjà dedans. `lot/u5-deux-volets` (relecture, T5, T6) : `playwright.config.ts`
  (les deux listes de `SPECS_GRAND_ECRAN` réunies), `globals.css` (styles d'U4 bis puis ceux de Chants), `PageTransition`
  (`cleDeTransition` gardé, `/songs` inscrit dans `SECTIONS_EN_DEUX_VOLETS` : même clé que l'expression d'U5).
  `lot/u6-back-office` (relecture) : import de `BarreLaterale` (`entreeBackOffice` et `listeSetlistsRetenue`),
  `getSetlistsFrom` (Chants, U5) et `getSetlistsDepuis` (tableau de bord, U6) gardées toutes deux. `lot/u4bis-b5` et
  `lot/u4bis-b67` : `globals.css` et cette section, à la suite.
- **Corrigé après la fusion** : `equipes.court` en double (B6 et relecture d'U6, la seconde gagnait) : un seul bloc,
  « Comité Franco » comme la planche ; Moi en 中文 : la carte du compte (B5) montrait « Culte Franco · Musicien »,
  le service passe par `categories.*` et les rôles par `equipes.role.*` (en français, rien ne change).
  Tests : `planning-2027` (les trois tests de l'ancien accueil lisent « Pour moi », la percussion dans la ligne de son
  groupe, le Cours reste dans l'onglet EDD) ; `evenements` (« aucun QR sur le calendrier » regarde l'agenda : en grand,
  la fiche à droite garde son QR) ; `setlist-deux-volets` (la liste retenue : attendre son écriture, course) ;
  `helpers/rendus` (seule la racine React de la page compte : les outils de `next dev` en ont une, refaite quand un autre
  test fait compiler une page) ; `pages-en-grand-reception` (« Voir les traités » du groupe Signalements).
- **Vérifié** : `tsc` propre, ESLint sans erreur (51 avertissements anciens). `pages-en-grand-*` : 405 verts (135 sautés,
  propres à une disposition) sur les cinq projets. Voisines touchées par les fusions (23 fichiers : back-office-*,
  barre-back-office, chants-deux-volets, deux-volets-finitions, coherence, equipes, evenements, look-barres, look-halo,
  look-navigation, mode-louange-colonnes, navigation-grand-ecran, planning-2027, planning-petit-dej, reunions,
  setlist-deux-volets, setlist-g, setlist-suppression-groupee, songs-list-return, tableau-de-bord, taches) : 2 346 verts,
  10 échecs, corrigés ci-dessus ou instables ci-dessous. Second lot (18 fichiers : export-pdf, harmonie-idees,
  key-selector, recommended-key, performance-mode, look-louange, setlist-regie, coup-d-oeil, planning-accueil,
  look-secondaires, nouveaux-membres, taches-evenements, harmonie-catalogue, harmonie-cours, rd2000, look-planning,
  i18n-hydration, look-halo-defilement) : 765 verts, 7 échecs (6 = Moi en 中文, corrigé). Captures regardées aux cinq
  tailles (Moi, profil, connexion, Équipes, Guide, Chants).
- **Instables, non touchés** (verts relancés seuls) : `reunions` « elle réordonne au clavier » sur téléphone (une fois sur
  deux, connu depuis U6 B3, déjà sur la fiche d'avant) ; `recommended-key` « le bouton de retour ramène à la
  recommandée » sous charge (12 sur 12 seul) ; `barre-back-office` « Plus » sur téléphone pendant la compilation de la
  page (« Compiling » à l'écran).
- Reste : rien pour U4 bis ; le lot attend l'intégration.
- À faire par Timothée : valider en local ; relire le 中文 des tranches B1 à B7 (listé à chacune) ; rien de neuf à publier
  pour U4 bis, mais `firestore.rules` arrive resserrée par la relecture d'U6 (réunions, « repris dans ») : la publier
  avec U6.

**Relecture, faite le 06/10/2026** (branche `lot/u4bis-pages-en-grand`, commit `fix(U4bis): relecture — …`). Deux
relectures, quinze constats. **Le lot est fini et relu.**
- **Corrigés**, chacun avec un test vu rouge avant le correctif puis vert :
  - Accueil : il ne lit plus toute la collection des setlists à chaque visite. Il lit seulement les setlists datées du
    prochain service ou après (`getSetlistsFrom`, 30 au plus ; brouillons et privées écartés, puis `canSeeSetlist`).
    Sans service à venir, il n'en lit aucune. L'effet suit l'uid et la date du prochain service, et non plus l'objet `user`
    (`pages-en-grand-accueil` : « lecture bornée », « aucune setlist lue »).
  - Mes services : deux services de même nom le même jour (répétitions du Campus pour la séance du matin et pour celle
    du soir) ont maintenant chacun leur adresse (`?moment=…&seance=<date de la setlist>`, avec `service=` s'il y a
    un autre service ce jour-là). `serviceDeLAdresse` les relit, dans la liste comme sur la page du service. Test pur
    aller-retour.
  - Setlists : `?apercu=` ne se rabat plus que sur une setlist que `canSeeSetlist` laisse voir (un lien partagé vers
    un autre onglet marche encore). Sinon, c'est la première setlist de la liste qui s'affiche.
  - Setlists, en grand : la position du volet de la liste (qui défile seul) est gardée
    (`setlistsScrollPosVolet`, écoute en capture). Elle revient au retour d'une setlist ouverte par « Ouvrir ».
  - Harmonie : les setlists qui classent les exemples sont lues une seule fois pour toute la section, par le layout
    (`comptesDesChants` du contexte du catalogue, à la première fiche ouverte). Avant, chaque fiche, y compris la
    première montrée d'office, les relisait.
  - Mes tâches : le lien de la fiche n'est cliquable que s'il commence par `http(s)://`. Sinon il s'affiche en texte
    (`javascript:`, `data:`).
  - Évènements, téléphone et tablette portrait : la barre « ‹ Évènements · Gérer dans le Back-Office » de la planche
    `evenement-fiche-telephone` est en tête de la fiche. Le bouton quitte la carte de gestion de l'organisateur, qui
    garde le titre, les badges, le panneau des inscriptions et le lien d'inscription.
  - Simplification : `reunirServices` (accueil) dérive de `grouperServices` (Mes services), avec la même clé
    `cleDuService`. `PourMoi` importe `cleDuService` au lieu de la recopier.
  - Tests : l'identité de l'admin passe par un seul helper, `ADMIN_EMAIL` dans `tests/helpers/fakeSession.ts`, lu dans
    `ADMIN_EMAILS` de `src/lib/access.ts`. Les tests du lot n'écrivent ni ne vérifient plus l'adresse réelle : l'e-mail de
    la carte du compte se vérifie sur un membre fictif. Un équipier au prénom réel est remplacé par « Sacha L. ». Ajouts :
    retours arrière pour le cours et pour les sons du RD-2000 ; absence de défilement horizontal pour Setlists sur
    tablette et téléphone.
- **Constat faux, laissé** : `login.subtitle` n'existe plus depuis B5. La clé de `fr.json:586` est `signup.subtitle`
  (« GCC Louange — réservé aux membres de l'église »), que la page d'inscription lit encore (`signup/page.tsx:149`).
- **Laissés, à trancher par Timothée** (écarts aux planches, déjà déclarés dans les tranches) :
  - La connexion et l'inscription gardent le chrome de l'app (barre latérale, barres du haut et du bas). Sur téléphone,
    un bandeau de marque est posé au-dessus du formulaire. La « pastille sombre sans libellé » du pied de la barre
    latérale est le bouton « Connexion » quand la barre est réduite : icône seule, avec son nom accessible (règle de U4).
  - Dans l'aperçu d'une setlist, la structure des chants reste en texte (« I · C1 · R ») et pas en pastilles.
  - Dans Moi, la ligne « Mes tâches » n'affiche pas de nombre : il faudrait lire les tâches sur Moi.
  - Cours : la partie lue n'est pas suivie dans le sommaire. Sur tablette, le lien reste « ‹ Cours ».
- **Laissés, hors de ce correctif** :
  - Les lignes de chants de `PourMoi`, `CarteSetlist` et `SetlistCarteChants` ne sont pas réunies dans un composant
    commun (leurs rendus diffèrent).
  - `TacheForm` accepte encore un lien d'un autre schéma : seule la fiche le filtre.
  - Dix-huit anciens tests hors du lot écrivent encore l'adresse réelle de l'admin (à passer à `ADMIN_EMAIL`).
  - Mes services lit toujours toutes les setlists, comme l'ancienne page (`SectionMesServices`).
  - Un aperçu choisi reste à droite après un changement de filtre tant qu'il est visible.
- **Vérifié** : `tsc` propre, ESLint sans erreur (51 avertissements anciens). `pages-en-grand-*` et `back-office-coupe` :
  623 verts, 149 sautés (tests propres à une disposition) sur les cinq projets. Un seul échec, sur téléphone : une
  attente `networkidle` jamais atteinte sous charge, remplacée par une attente fixe, puis vert sur les cinq projets.
  Specs voisines (16 fichiers : back-office-admin, coherence, evenements, harmonie-catalogue, harmonie-cours,
  harmonie-idees, look-planning, planning-2027, planning-accueil, planning-petit-dej, rd2000, reunions,
  setlist-deux-volets, setlist-suppression-groupee, taches-evenements, taches) : 1 420 verts, 54 sautés. Captures de
  la barre de la fiche regardées sur téléphone et tablette, comparées à `evenement-fiche-telephone`.
- Reste : rien pour U4 bis ; le lot attend l'intégration.
- À faire par Timothée :
  - valider en local ;
  - trancher les quatre écarts ci-dessus ;
  - relire le 中文 des tranches B1 à B7 (aucun libellé nouveau dans la relecture).
  - Rien à publier pour U4 bis : aucune règle ni aucun droit n'a changé.
