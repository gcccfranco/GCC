# Spec : agencement grand écran et cohérence (planche v18)

Suite du chantier U (`feuille-de-route.md` § 3.U), après U4 (`spec-navigation-grand-ecran.md`) et U4 bis
(`spec-pages-en-grand.md`), qui restent vrais sauf ce qui est dit ici. Elle met **une seule règle d'agencement**
sur toutes les pages de l'App et du Back-Office, puis l'applique page par page d'après la planche v18
(rangées R16 Back-Office et R16B App). La scène (rangée R17 : Calendrier · Pâques · Noël) a sa propre spec,
`spec-scene-paques-noel.md` ; celle-ci n'en prend que l'en-tête de la section Évènements.

Statut : **spec écrite le 06/10/2026, attend le go.** Planche v18 validée en entier par Timothée le 06/10/2026
au soir ; chaque question de la planche prend sa recommandation. Rien n'est codé. Part en ligne avec le chantier U,
à la fusion sur `main` : les pages de l'App changent alors pour tout le monde ; ce qui est sous `/back-office` ou
déjà derrière `BACK_OFFICE` ne paraît en ligne qu'avec l'interrupteur (R17).

**Base** : `ui/apple-design` à `6b425b6`, **après** le versement de `fix/integration-retours` (`ea8999b` : blanc
quand la barre se réduit, halo partout, « Modulation », pastille insécable, Musiciens, importations retirées,
« Recalculer depuis l'organigramme » dans Organigramme, Inscriptions dans Personnes). Les lignes citées sont
celles de `6b425b6` ; quand la branche de corrections les change, c'est dit.

## Mots de Timothée

> « y'a des problèmes de cohérence partout sur la version en local » ; pages « super mal agencées »
> (06/10/2026, en testant le chantier U sur `localhost:3150`).

> « Je suis ok pour tout » (06/10/2026 au soir, sur la planche v18 et ses questions).

> « il faudrait que les réunions aient leurs onglets à eux, c'est-à-dire qu'il faut mettre l'onglet Réunion dans
> la barre latérale » (06/10/2026, plus tard le soir).

## Ce que le code montre (06/10/2026)

Audit du 06/10 (`scratchpad/audit-agencement/RAPPORT.md`), vérifié dans le code :

- **Six largeurs.** 672 px centrés : BO Tâches (`back-office/taches/layout.tsx:21`), Notifier et Questionnaire
  (`back-office/messages/layout.tsx:40`), fiche d'évènement du BO (`evenements/[id]/EvenementClient.tsx:290`),
  Questionnaire de l'App (`questionnaire/page.tsx:246,271`), formulaires du BO
  (`evenements/nouveau/NouveauClient.tsx:73`, `[id]/modifier/ModifierClient.tsx:40`). 672 px **à gauche** :
  listes BO Évènements et Réunions (`back-office/evenements/ListeGestion.tsx:49`), agenda du calendrier
  (`back-office/calendrier/CalendrierClient.tsx:363`). 1024 px centrés : Équipes du BO
  (`back-office/equipes/layout.tsx:26`) ; 1024 px à gauche : réunion du BO (`EvenementClient.tsx:144`). 512 px :
  carte du petit déj (`components/planning/PetitDejCarte.tsx:245`, `planning/table/page.tsx:104`, `lg:max-w-lg`).
  896 px : Setlists hors deux volets (`setlists/page.tsx:517`). Pleine zone sans borne : tableau de bord
  (`back-office/page.tsx:21`), planning du BO (`back-office/planning/layout.tsx:29`), statistiques
  (`statistiques/page.tsx:29`). La borne de 1 080 px du Planning de l'App (`planning/layout.tsx:13`) est retirée
  par la branche de corrections ; celle de la scène (`evenements/SectionEvenements.tsx:15`) reste, et
  `spec-scene-paques-noel.md` (P4) la retire.
- **Deux en-têtes différents.** `PageTitle` (`components/layout/PageTitle.tsx:5-27`, titre 24 px, action à droite,
  pas d'onglets) dans l'App ; `EnTeteEntree` (`components/backOffice/EnTeteEntree.tsx:18-45`, titre 24 px **et rail
  sur la même ligne**, `flex-wrap`) dans le BO. En deux volets, le titre de la page est **dans la liste**, en h2
  (`PageTitle niveau`, `:9-22`), et le h1 est celui de la fiche (U4 bis Q2). Le titre « Messages » saute de
  170 px entre Réception (en-tête pleine largeur, `messages/layout.tsx:31-37`) et les deux autres onglets
  (colonne de 672 px, `:40`). Le Calendrier titre au nom du mois (`CalendrierClient.tsx:285-289`), les
  Statistiques « Chants les plus joués » (`StatistiquesClient.tsx:175`), le Guide a son titre à part, avec icône,
  calé sur la colonne de lecture (`guide/page.tsx:170-182`), le Questionnaire un h1 de 18 px
  (`questionnaire/page.tsx:275`), les pages du Planning un h2 de 16 px (`planning/culte/page.tsx:80`,
  `groupes/page.tsx:121`, `table/page.tsx:64`).
- **Cinq styles d'onglets.** Rail gris à pastille blanche (`EnTeteEntree.tsx:26-41`,
  `CalendrierClient.tsx:301-316`, `StatistiquesClient.tsx:266-282`, `components/planning/AnneeSelecteur.tsx:17`) ;
  pilules teintées collantes sous la barre du haut (`components/layout/SectionTabs.tsx:56-126`, Planning et
  Évènements) ; pilules noires (`components/evenements/EvenementsTabs.tsx:45-56`,
  `back-office/planning/[cle]/PlanningDuBackOffice.tsx`) ; grands boutons pleins de couleur (Paix · Fidélité ·
  Bonté, `planning/groupes/page.tsx:144-174`) ; pilules pleines T1 à T4 (`components/planning/FilterButtons.tsx:16-40`).
  Les onglets du Planning et de la scène sont **au-dessus** du titre (`planning/layout.tsx:12`), ceux des
  Statistiques tout à droite (`StatistiquesClient.tsx:173-178`).
- **Cinq boutons « créer ».** Rond « + » sans libellé en grand et pilule à libellé sur téléphone, c'est-à-dire
  l'inverse de la règle (`evenements/CalendrierClient.tsx:103-108`) ; grand bouton calé à gauche
  (`ListeGestion.tsx:52-58`) ; petit bouton à droite du nom du pôle (`taches/[pole]/page.tsx:121-124`) ; rond
  sans libellé (`CalendrierClient.tsx:291-299` du BO) ; « Nouvelle » en pilule dans la rangée des filtres sur
  téléphone (`setlists/page.tsx:404`).
- **Deux formes de retour.** « ← Évènements » en petit lien (`EvenementClient.tsx:129-133`) ; « ‹ Évènements »
  avec chevron (`:256-260`) ; « Fermer » en haut à droite dans la saison de la scène.
- **Seize confirmations natives** (`window.confirm`) : `EvenementClient.tsx:109`, `[id]/Inscriptions.tsx:258`,
  `NouveauClient.tsx:87`, `components/taches/TacheForm.tsx:104`, `components/planning/PlanningGrille.tsx:217`,
  `PetitDejCarte.tsx:118`, `BoutonPublication.tsx:27`, `components/reunions/CompteRenduCarte.tsx:59`,
  `SujetsAborder.tsx:165`, `components/backOffice/TableauDeBord.tsx:81` ; quatre dans la scène
  (`scene/SceneClient.tsx:148`, `Apercu.tsx:73`, `Entrainements.tsx:111`, `OrdrePassage.tsx:116`) ; deux dans les
  importations, retirées par `fix/equipes-imports`.
- **Les réunions sont une sous-partie d'Évènements** au BO : `sousPartiesEvenements` (`lib/access.ts:584-596`) rend
  « Évènements · Réunions · Scène », aux adresses `/back-office/evenements{,/reunions,/scene}`
  (`back-office/evenements/layout.tsx:14-15`) ; l'entrée Évènements s'ouvre à qui a un pôle ou est référent, pour ses
  réunions (`access.ts:513`) ; le menu a **huit** entrées (`types/backOffice.ts:4`, `lib/navigation.ts:48-57`), que
  relisent la barre du bas du téléphone et sa feuille (`lib/tableauDeBord/barre.ts:13,38`,
  `FeuilleBarreDuBas.tsx:107-111`), la page « Plus » (`PagePlus.tsx:23-27,35`), le widget « Prochains évènements »
  et le raccourci « Nouvel évènement » (`access.ts:558`, `lib/tableauDeBord/donnees.ts:254`). Une réunion se crée par
  `/back-office/evenements/nouveau?reunion=1` (`ListeGestion.tsx:54`), s'ouvre et se modifie sous
  `/back-office/evenements/[id]` (`EvenementClient.tsx:106`, `components/reunions/EnTeteReunion.tsx:43,46`).
- **Le BO n'a pas de halo** : `EspaceBackOffice.tsx` n'en pose aucun. `fix/agencement-barre-halo` ajoute
  `HaloParDefaut` (encre à 8 %) sur toute page qui n'en a pas.
- **Volets vides** : Chants sans setlist à venir ne montre que « Choisis un chant » (`songs/ChoisisUnChant.tsx:84`) ;
  l'agenda du calendrier n'a pas de volet du jour (`CalendrierClient.tsx:214,421` : `sansPanneau` en agenda).
- **La fiche d'évènement de l'App** garde deux colonnes dans un volet de 632 px (`globals.css:575`,
  `.fiche-colonnes`, colonne de droite de 250 px au moins) ; sans image, un cadre gris avec une icône
  (`evenements/EvenementCard.tsx:52-62`).
- **Les tâches du BO** s'ouvrent en feuille à poignée, même sur ordinateur (`TacheForm.tsx:57`) ; la fiche à lire
  de l'App existe déjà (`components/taches/FicheTache.tsx`, U4 bis B4).
- **L'organigramme du BO** garde les colonnes CSS (`equipes/EquipesClient.tsx:56-58,118-121`) parce qu'une carte
  s'y ouvre en formulaire ; Personnes déplie sa fiche dans la ligne (`components/admin/Personnes.tsx:271`).
- **Données déjà là** : derniers envois de Notifier = collection `notifications` (`lib/push/notifications.ts:33`,
  lecture `getNotifsSince`, `lib/firebase/notifications.ts:37`, règle `read: if signedIn()`) ; progression du cours
  (`lib/firebase/coursProgres.ts:21`) ; chants joués (`lib/stats/chantsJoues.ts:138`, `statsChants`, pur) ; cases
  vides d'un planning (`lib/planning/casesVides.ts:20`) ; historique d'une tâche (`auteurUid`, `createdAt`,
  `Fois.parNom`, `Fois.debutLe`, `types/tache.ts:40-60` ; l'auteur n'a que son uid, son nom se lit par
  `getProfile`, `lib/firebase/users.ts:49`) ; **chants récemment ouverts** : `recentSongs` en `localStorage` (huit
  slugs, écrits par `songs/[slug]/SongDetailClient.tsx:160-170`, relus sur l'évènement `recentSongs` par
  `SongListClient.tsx:44-56`, rangée « Récemment consultés »). **Pas de date d'ajout d'un chant** dans l'index
  (`types/song.ts:3-20`).

## Décisions de Timothée — à ne pas rouvrir

| Date | Décision |
|---|---|
| 04/10 | Toutes les pages en pleine largeur sur ordinateur et iPad paysage ; une liste = deux volets ; une lecture = 720 px avec sommaire ; une grille = toute la largeur ; plus de colonne étroite au milieu (U4 bis). |
| 06/10 | **Planche v18 validée en entier** (« Je suis ok pour tout »), donc : |
| 06/10 | **Règles communes** : le contenu prend toute la zone ; un seul en-tête, au-dessus des deux volets ; **rail gris = onglets de section, pilules = sous-onglets et filtres** ; une seule action principale « + Nouveau… », pilule noire à libellé, **rond « + » seulement sur téléphone** ; un seul retour « ‹ Section » ; cartes en relief partout ; halo sur toutes les pages ; aucun volet vide ; supprimer et retirer dans le menu « ⋯ », avec une confirmation **dans le site**. |
| 06/10 | **Pistes A partout** : Évènements BO = la fiche à côté de la liste ; Agenda = une colonne de jours et le volet du jour ; Planning BO = les services en pilules visibles ; grilles du Planning = titre « Planning », service en sous-titre ; Prépa. Table = petit déj et Table côte à côte ; Chants sans chant choisi = blocs utiles (prochaines setlists, récents, nouveautés, plus chantés) ; Moi = des aperçus utiles. |
| 06/10 | **Ajustements « oui »** : Tâches et Réunions en deux volets ; Équipes en bandeau avec « Recalculer » et les inscriptions en tête de Personnes ; Notifier avec l'aperçu de la notification ; Statistiques sous le titre « Statistiques » ; Profil avec « Enregistrer » en haut ; Harmonie en onglets. |
| 06/10 | Scène : Calendrier · Pâques · Noël à plat, réglage au Back-Office (`spec-scene-paques-noel.md`). |
| 06/10 (plus tard le soir) | **Réunions devient une entrée à part de la barre latérale du Back-Office** : « il faudrait que les réunions aient leurs onglets à eux, c'est-à-dire qu'il faut mettre l'onglet Réunion dans la barre latérale ». Menu à **neuf** entrées : Tableau de bord, Calendrier, Planning, Tâches, Évènements, **Réunions**, Équipes, Messages, Statistiques ; adresse propre, l'ancienne redirige ; la page garde la disposition validée (deux volets, la prochaine réunion ouverte d'office) ; Évènements du Back-Office n'a plus que **Évènements · Pâques · Noël**. Côté App, les réunions des pôles restent dans l'agenda des Évènements. |
| 03/10 | Design : propositions avant le code, code sur un go. |

## Décisions prises ici

Chaque ligne tranche ce que la planche laisse ouvert ou ce que deux planches dessinent autrement ; la raison est
lue dans le code ou dans les planches. Révisables si Timothée en reparle.

### Règles communes

| # | Décision | Raison |
|---|---|---|
| R1 | **Un composant d'en-tête, `EnTetePage`**, pour les deux espaces : « ‹ Section » au besoin, titre (h1), sous-titre d'une ligne, outils et action principale à droite du titre, onglets dessous (rail), puis une rangée libre (`apres` : filtres, période, interrupteur). Remplace `PageTitle` et `EnTeteEntree`, supprimés à la fin (tranche Z). | Deux composants pour la même chose sont la cause directe des titres qui sautent (`PageTitle.tsx`, `EnTeteEntree.tsx`). La planche dessine les deux espaces avec la même fonction (`entete`, `agencement_bo.py:63` ; `tete`, `agencement_app.py:70`). |
| R2 | **Mesures** : titre 30 px (ligne 36 px) dès 768 px, 24 px sur téléphone ; sous-titre 14 px ; 20 px entre l'en-tête et le contenu. **Marge de la zone** `--marge-page` : 16 px téléphone, 24 px tablette portrait, 40 px barre dépliée, 28 px barre réduite et iPad paysage. Rien n'est centré dans une borne : la place gagnée en réduisant la barre va au contenu. | Mesures de la planche App (`agencement_app.py:37-39`, règles l. 176 : « titre 30 px à 40 px du bord, 28 px barre réduite ») ; le BO dessine 36 px, à 4 px près la même chose : une seule valeur. Téléphone : les planches v17 gardent 24 px. |
| R3 | **Le titre de la page est toujours le h1** et reste au-dessus des deux volets ; le titre d'une fiche dans le volet de droite est un h2 de 24 px. La liste n'a plus de titre. | Planche : « titre au-dessus des deux volets », « fiche de droite titrée en 24 px » (`agencement_app.py:123`). Revient sur U4 bis Q2 (le h1 était celui de la fiche) : les tests qui l'attendent sont réécrits par chaque tranche. |
| R4 | **Rail gris = choisir une vue** : les sous-parties d'une entrée de la barre (Évènements · Pâques · Noël, Organigramme · Personnes, Réception · Notifier · Questionnaire, Mois · Agenda, Les plus joués · …, Plannings · Sans compte, Calendrier · Pâques · Noël, Fiches · Cours · Sons du RD-2000) et les vues d'une page (À venir · Passés, À venir · Archives, T1 à T4, Paix · Fidélité · Bonté, Piano · Guitare, Tous · FR · 中文). **Pilules = sous-onglets, filtres, choix dans une rangée** : les sous-onglets sous un rail (**Équipes · Musiciens**, Fidélité › Groupe · Musiciens), les filtres (catégories, sensations, périodes, audiences, sources du calendrier, Personnes), et **les plannings**, l'actif à la couleur de son service. | Le texte validé dit « rail = onglets de section, pilules = sous-onglets et filtres » ; le panneau `v18-bo-regles-communes`, « référence des trois parties » (« une exception se discute, elle ne s'invente pas »), en donne les exemples : Organigramme · Personnes en rail, **Équipes · Musiciens en pilules**, les plannings d'un culte en pilules à sa couleur (`agencement_bo.py:164-166`). La planche scène met Calendrier · Pâques · Noël dans le rail (`scene_paques_noel.py:34-41`). La planche App, seule, met ses onglets de section en pilules et ses vues dans le rail (`agencement_app.py:58-67`) : on garde ses vues en rail (T1–T4, À venir, groupes), et l'on s'en écarte sur deux points, Harmonie et Évènements en rail au lieu de pilules (voir « Questions ouvertes »). |
| R5 | **Deux composants d'onglets** : `OngletsRail` (liens ou boutons, `role="tablist"` pour des boutons, `aria-current="page"` pour des liens, `data-onglets="rail"`) et `Pilules` (sortie de `components/harmonie/Pilules.tsx`, une `couleur` par option, `data-onglets="pilules"`). Le rail défile en largeur sur téléphone. `FilterButtons`, `SectionTabs` (en grand) et les boutons de groupes disparaissent à mesure. | Cinq styles aujourd'hui pour deux usages. |
| R6 | **Plus rien de collant au-dessus du titre.** Exception : sur téléphone et tablette portrait, la rangée des huit plannings garde sa barre collante et sa feuille en tuiles (`SectionTabs menuLabel`, V7), posée **sous** le titre ; en grand, elle est dans l'en-tête. | V7 a été tranché sur planche par Timothée ; une grille longue sur téléphone se quitterait sans elle. |
| R7 | **`BoutonNouveau`** : dès 768 px, pilule noire « + Nouvelle tâche » dans l'en-tête, une par page ; sur téléphone, rond noir de 52 px en bas à droite, au-dessus de la barre d'onglets (`--tabbar-bottom`), `aria-label` = le libellé. Chants garde « Proposer un chant » en bas de liste sur téléphone (le rond masquerait l'index A–Z, `SongListClient.tsx:245-248`) ; Profil garde « Enregistrer » en bas sur téléphone (ce n'est pas une création). | Règle validée ; c'est l'inverse d'aujourd'hui dans les Évènements (`CalendrierClient.tsx:103-108`). |
| R8 | **`Retour`** « ‹ Section » au-dessus du titre, à gauche, 14 px gras gris ; c'est le seul retour. Plus de « ← », plus de « Fermer ». | Planche, panneau « Un seul retour ». |
| R9 | **`MenuActions`** (« ⋯ », `components/ui/dropdown-menu`) : Supprimer, Retirer, Dupliquer… ; une action destructive passe par **`useConfirmer()`**, une petite fenêtre du site (`components/ui/alert-dialog`), posée une fois à la racine (`ConfirmerProvider`), qui rend une promesse : `if (!(await confirmer({ titre, texte, action, destructif: true }))) return;`. **Toutes** les confirmations natives passent par elle (publication, copie des tâches comprises), sauf les quatre de la scène, que `spec-scene-paques-noel.md` réécrit avec ce même `useConfirmer` et ce même `MenuActions`. | « Jamais la fenêtre grise du navigateur » (planche). Une promesse se substitue à `window.confirm` ligne pour ligne : la migration ne change aucune logique. |
| R10 | **Deux volets** : la liste est une **carte en relief** (rayon 16 px) à gauche, collante sous la barre du haut, qui défile seule, à `--marge-page` des bords ; la fiche prend le reste, sans fond. Largeur de la liste : 360 à 420 px selon la page (inchangée par page). `DeuxVolets` perd sa borne `--largeur-lecture` (déjà fait par `fix/agencement-barre-halo`) et son filet. Chants (`.chants-volets`, `globals.css:608-631`) suit la même forme. | Planche App (« liste en carte ») et panneau BO « Cartes en relief, partout : plus de liste nue posée sur le fond ». La planche BO dessine une liste à plat avec un filet, contre sa propre règle : la règle gagne. |
| R11 | **Aucun volet vide** : en grand, une liste ouvre d'office sa première ligne (règle U4 bis Q3, étendue au BO) ; sans aucune ligne, le volet montre un résumé utile de la section (dessiné page par page ci-dessous). | Règle validée. |
| R12 | **Halo** : celui de la page quand elle en a un ; sinon `HaloParDefaut` (branche de corrections), **bleu gris `--halo-back-office` (#e4e7f6, valeur sombre définie aussi) sur `/back-office/*`**, l'encre ailleurs. Un écran qui appartient à un culte (planning d'un service) prend la couleur du service ; les onglets Pâques et Noël, dans l'App comme au BO, gardent celui de la scène (`PLANNING_COLORS.scene`, planche R17). | Planche BO (`HALO = "#e4e7f6"`, `agencement_bo.py:22`) et panneau « Halo sur toutes les pages ». |
| R13 | **Formulaires** : actions en bas de la carte, à droite, « Annuler » puis le bouton plein. | Panneau « Formulaires » ; aujourd'hui deux ordres (tâche, scène). |
| R14 | **Lecture** : sommaire de 260 px collant à gauche, colonne de 720 px, calés sur le titre (pas centrés) ; le titre part du bord du sommaire. Guide et Questionnaire. | `lecture()`, `agencement_app.py:648-651` ; le titre du guide est aujourd'hui à x = 606 contre 288 pour le sommaire. |
| R15 | **Barre réduite** : même disposition, les colonnes s'élargissent ; le tableau de bord passe de deux colonnes à trois ; la fiche d'évènement de l'App repasse en deux colonnes quand son volet dépasse 760 px. Les seuils se lisent par requête de conteneur, pas par `data-barre`. | Planches `*-reduite` ; une requête de conteneur vaut aussi pour l'iPad paysage sans code de plus. |
| R16 | **Droits** : aucun changement. Aucune collection nouvelle, aucune écriture nouvelle ; ni `access.ts` ni `firestore.rules`. Firestore reste en REST. | Toutes les données des aperçus existent déjà (voir « Ce que le code montre »). |
| R17 | **Interrupteur** : tout ce qui est sous `/back-office` reste en 404 en ligne. Les pages de l'App changent pour tous ; ce qui y était déjà derrière `BACK_OFFICE` le reste (Mes tâches, Équipes, section Évènements, aperçus Tâches et Équipes de Moi). | Lot 18 ; `docs/spec-mise-en-ligne.md`. |
| R18 | **Langues** : chaque libellé nouveau en FR et 中文 (中文 relu par Timothée), sauf les Statistiques, en français seul (U7 Q14, `statistiques/page.tsx:6`). | Règle du dépôt. |

### Back-Office, page par page

| # | Page | Décision | Raison |
|---|---|---|---|
| B1 | **Tâches** | En-tête « Tâches », sous-titre « Les tâches des pôles : ce qui est en retard d'abord », « + Nouvelle tâche », rail des pôles de la personne (`tachesDuBackOffice`) avec le compte. Deux volets : la liste du pôle (En retard en rouge · Cette semaine · Plus tard, « Terminées (n) » repliées) ; à droite la **fiche à lire** (`FicheTache`), avec « Modifier » et « ⋯ » (Supprimer), une carte d'état (À faire · En cours · Terminée), une carte d'infos, « Note » et « Historique » (« Créée par … » : nom lu par `getProfile(auteurUid)`, une lecture, profils lisibles par tout connecté ; « Commencée par … » : `Fois.parNom`) côte à côte. Nouvelles adresses `/back-office/taches/[pole]/[id]` (`?date=` pour une fois) et `/back-office/taches/[pole]/nouvelle`. | Planche `v18-bo-taches` ; la fiche existe pour l'App (U4 bis B4) ; l'historique se lit dans `Tache` et `Fois`. |
| B2 | **Nouvelle tâche dans le volet** | En grand, « + Nouvelle tâche » et « Modifier » ouvrent le formulaire **dans le volet de droite** (carte, 720 px au plus, pôle en pilules, échéance et responsable côte à côte, répétition en rail, « Annuler · Créer la tâche ») ; `TacheForm` gagne `enLigne` ; sur téléphone et tablette portrait, la feuille d'aujourd'hui. | Planche `v18-bo-tache-nouvelle` : « plus de feuille à poignée sur ordinateur ». Le calendrier et l'App gardent la feuille. |
| B3 | **Évènements (A)** | En-tête « Évènements », sous-titre « Ce que voit l'assemblée, et sa gestion », « + Nouvel évènement », rail des sous-parties **Évènements · Pâques · Noël** (`sousPartiesEvenements`, sans les réunions, B15). La liste (info épinglée, mois, « Évènements passés (n) ») vit dans le layout (`ListeGestion` y monte) ; à droite la **fiche de gestion** : vignette, badges, titre h2, « Voir comme un membre » (lien vers `/evenements/[id]`), « Modifier », « ⋯ » (Dupliquer, Supprimer) ; bandeau d'infos (date, heure, lieu, public, contact) ; « Inscrits » (jauge, liste, Exporter, Ajouter) à gauche, « Tâches » et « Période d'inscription » à droite. « Nouvel évènement » et « Modifier » s'ouvrent aussi dans le volet. **L'en-tête est celui de toute la section**, onglets Pâques et Noël compris (même titre, même sous-titre : le rail ne saute pas d'un onglet à l'autre) ; sur Pâques et Noël, pas d'action principale (planche R17). Sous `/back-office/evenements/scene/*`, le layout ne monte pas la liste des évènements : la scène pose ses propres deux volets (colonne de la fête, vue), avec le même `DeuxVolets` (`spec-scene-paques-noel.md`, Q18). | Piste A ; `ListeGestion.tsx:49` est la colonne de 672 px calée à gauche ; `EvenementClient.tsx:290` la fiche du téléphone. |
| B4 | **Réunions** (entrée à part, B15) | En-tête « Réunions », sous-titre « Les réunions de tes pôles et de tes équipes », « + Nouvelle réunion », pas de rail ; la disposition validée de la planche : deux volets, « À venir » puis « Passées », la prochaine ouverte d'office ; fiche : badge du pôle, titre, date et lieu, « Dupliquer pour la prochaine », « Modifier », « ⋯ » ; « Sujets à aborder » (large) à gauche, « Compte rendu », « Réunions précédentes », « Tâches » à droite. Adresses `/back-office/reunions`, `/back-office/reunions/[id]`, `/back-office/reunions/nouvelle`, `/back-office/reunions/[id]/modifier`, qui montent les composants d'aujourd'hui (`ListeGestion reunions`, branche réunion d'`EvenementClient`, `NouveauClient` en mode réunion, `ModifierClient`). | Décision du 06/10 au soir ; planche `v18-bo-reunions` pour la page (son en-tête « Évènements » et son rail tombent avec la décision). Le sous-titre est écrit ici, d'après la règle de `sousPartiesEvenements` (« ses pôles, Louange compris, et ses équipes »). |
| B5 | **Calendrier, agenda (A)** | En-tête « Calendrier », « + Nouvel évènement », rail Mois · Agenda ; rangée dessous : « ‹ Octobre 2026 › », « Aujourd'hui », filet, sources en pilules, « Seulement moi ». **Agenda** : semaines, une ligne par jour (jour de la semaine et numéro, le jour choisi en encre), une ligne par entrée (trait de couleur, heure, titre, détail, étiquette du type), sur toute la largeur ; **volet du jour à droite** (300 px) en agenda comme en Mois : titre du jour, « Ajouter ce jour-là » avec son menu (évènement, tâche, réunion : les deux boutons d'aujourd'hui, `BoutonsCreation`, en un), une carte par entrée. Toucher un jour de l'agenda le choisit. | Piste A ; `CalendrierClient.tsx:214,363,461`. |
| B6 | **Planning (A)** | En-tête « Planning », sous-titre « <planning> · <jour heure> · <n> cases vides ce trimestre » (`casesVides`), outil « Exporter » (contour, sorti de la grille, `PlanningGrille.tsx:408`), rail Plannings · Sans compte (admins). Le « ⋯ » de la planche (« Importer, sans compte », `agencement_bo.py:521-523`) n'est pas construit : les importations sont retirées par `fix/equipes-imports` et « Sans compte » est déjà dans le rail. Rangée dessous : **les plannings de la personne en pilules**, l'actif à la couleur du service ; à droite, la période et « Mes dates ». Grille pleine largeur. Deux rangées de commandes au lieu de cinq. | Piste A ; `PlanningDuBackOffice.tsx` (pilules noires) puis la page de l'App en gestion (h2, année, bandeau, T1–T4). |
| B7 | Planning | **Période d'une grille, une pour les deux espaces** : l'année (`AnneeSelecteur`, en rail) et T1–T4 en rail, dans la rangée de la grille. | Les pages du Planning sont les mêmes dans l'App et le BO (`PlanningDuBackOffice.tsx`, `PAGES`) ; la planche BO dessine « ‹ T4 2026 › », la planche App un rail : un seul composant plutôt que deux. |
| B8 | **Équipes › Organigramme** | En-tête « Équipes », sous-titre « Organigramme GCC Franco <année> : il donne les pôles de chacun », outil « Recalculer depuis l'organigramme » (contour, admins, venu de `fix/equipes-imports`) ; pas de « + Nouvelle équipe » (dessiné, mais les treize équipes sont fixes, `EQUIPES` : on n'invente pas leur création) ; rail Organigramme · Personnes ; dessous, Équipes · Musiciens en rail. **Le bandeau de l'App** (`BandeauEquipes`), avec un crayon par carte pour qui a le droit ; **la carte s'édite dans un panneau** (420 px à droite en grand, feuille sur téléphone) au lieu de s'ouvrir sur place, pour garder des cartes de hauteur fixe. « Recalculer » quitte le bas de la page (`back-office/equipes/page.tsx`, branche de corrections) pour l'en-tête ; son résultat (`equipes.recalcul.fait`) s'affiche sous l'en-tête. La ligne « Pôles calculés le … · n personnes ont changé de pôle » de la planche n'est pas construite (voir Hors périmètre). | Planche `v18-bo-equipes-organigramme` ; `EquipesClient.tsx:56-58` explique pourquoi le BO gardait les colonnes : l'édition dans la carte. |
| B9 | **Équipes › Personnes** | En-tête « Équipes », sous-titre « n inscrits · n musiciens · n présidences », rail ; dans la rangée `apres`, la carte des inscriptions (interrupteur, « n en attente », « Voir les n »), version courte de `InscriptionsComptes`. Deux volets : recherche, filtres en pilules (ceux d'aujourd'hui : Tous, les lieux de service, EDD, les groupes, Ne sert pas, `Personnes.tsx:69`) et le tri Récents · A–Z d'aujourd'hui (`Personnes.tsx:94,242-252`), lignes (avatar, nom, services en étiquettes) ; à droite la personne : en-tête (avatar, nom, e-mail, « Modifier »), « Services et rôles », « Pôles » (lus de l'organigramme), « Droits » (admin, plannings, nom au planning), « Ses prochains services » (`findMyServices`). « Modifier » montre le formulaire d'aujourd'hui (`Personnes.tsx`, édition sur place) dans le volet. La personne choisie se lit dans l'adresse (`?uid=`, remplacée sans entrée d'historique, comme `?apercu=` des Setlists). | Planche `v18-bo-equipes-personnes` ; aucune donnée nouvelle. |
| B10 | **Messages › Réception** | Même en-tête que les deux autres onglets (le titre ne bouge plus) : « Messages », sous-titre « Ce que les membres signalent et proposent », rail. Volets d'aujourd'hui (`ReceptionVolets`) ; « Supprimer » passe dans « ⋯ » ; sous le message, « Le chant signalé » (titre, tonalité, nombre de sections, lus dans l'index ; « Ouvrir la partition ») et « Du même membre » (ses autres signalements et propositions, lus dans la liste déjà chargée). | Planche `v18-bo-messages-reception`. « Joué n fois » et « Setlist citée » ne sont pas construits (voir Hors périmètre). |
| B11 | **Messages › Notifier** | Formulaire en carte à gauche (audience en pilules, titre, message, « Ouvre au clic », pied « Annuler · Envoyer à n personnes ») ; à droite **l'aperçu de la notification** (rendu d'une notification de téléphone avec le logo, le titre et le message tapés) puis « Derniers envois » (cinq dernières notifications `kind: "manual"` de `notifications`, celles qu'écrit Notifier, `api/push/notify-audience/route.ts:93-120` : titre, « Tout le monde » si `everyone` ou « n personnes », date ; `getNotifsSince(0, 50)` ne filtre pas le type, le tri se fait après la lecture). | Ajustement validé ; données existantes, lecture permise à tout connecté. |
| B12 | **Messages › Questionnaire** | Deux volets : à gauche le nombre de réponses et le sommaire des parties (`SURVEY_SECTIONS`, avec la moyenne quand la partie a des notes) ; à droite la partie choisie (la première d'office) : titre h2, « n questions · moyenne x sur 5 », une carte par question (barres pour une note, réponses libres en liste) ; « Voir la page du questionnaire » en pied de liste. Partie choisie en état local, pas d'adresse. | Planche `v18-bo-messages-questionnaire` ; `SurveyResults.tsx:235-238` a déjà les parties, dépliables. |
| B13 | **Statistiques** | Titre **« Statistiques »**, sous-titre « Visible par les admins seulement · n setlists comptées, du … au … », rail Les plus joués · Jamais joués · À redécouvrir **sous le titre**, rangée des filtres dessous (périodes en pilules, listes de service et de présidence). **Jamais joués** : deux cartes, « En français · n » sur deux colonnes et « En chinois · n » sur une, 40 et 20 chants puis « Tout afficher ». Français seul. | Planches `v18-bo-statistiques*` ; `StatistiquesClient.tsx:175` ; la page de 15 342 px. |
| B14 | **Tableau de bord** | En-tête « Tableau de bord », sous-titre (jour, prénom), « Personnaliser » en contour (pas de « + Nouveau »). En grand et hors personnalisation, **les widgets en colonnes** : une colonne large (1,55 fr) et une étroite barre dépliée ; une large (1,6 fr) et deux étroites barre réduite et dès 1 440 px de zone. La colonne large prend les widgets de taille « Grand » (`l`) ou, s'il n'y en a pas, le premier ; les autres vont, dans l'ordre, dans la colonne étroite la moins haute (hauteurs mesurées) ; fonction pure `repartirWidgets`. En personnalisation, sur tablette et téléphone : la grille d'aujourd'hui (`GRILLE_WIDGETS`, `widgets/Cadre.tsx:22`), que le glisser-déposer demande. | Planches `v18-bo-tableau-de-bord*` ; une grille en rangées laisse 1 300 px de blanc sous un widget court. |
| B15 | **L'entrée Réunions** | `ENTREES` passe à neuf, `reunions` juste après `evenements` (`types/backOffice.ts:4`) ; `ENTREES_BACK_OFFICE.reunions` = `/back-office/reunions`, `backOffice.entrees.reunions` (« Réunions », « 会议 », mêmes mots que `backOffice.parties.reunions`), icône `Users` (celle des réunions au calendrier, `components/calendrier/apparence.ts:13`). **Droits d'affichage** (`entreesBackOffice`) : Évènements = admin, coordination ou droit d'annonces ; Réunions = admin, un pôle (Louange compris), référent ou membre d'une équipe — exactement les deux règles de `sousPartiesEvenements` aujourd'hui, qui ne rend plus que `evenements` et `scene`. Le widget « Prochains évènements » reste permis avec l'une ou l'autre entrée (comme aujourd'hui, où une seule entrée couvrait les deux) ; le raccourci « Nouvel évènement » suit Évènements seul. **Barre du bas** : rien à écrire (`barreAffichee` et la feuille lisent `ENTREES`, `barre.ts:13,38`) ; une barre enregistrée avec « Évènements » par qui n'a plus que Réunions perd cet onglet et se complète dans l'ordre du menu (Réunions y entre) ; défaut inchangé. **Plus** : Réunions dans la première carte, après Évènements, contenu « sujets, comptes rendus » / « 议题、会议记录 » ; l'indice « + scène » de la feuille reste sur Évènements. **Redirections** (`router.replace`) : `/back-office/evenements/reunions` → `/back-office/reunions` ; `/back-office/evenements/[id]` d'une réunion (`estReunion`) → `/back-office/reunions/[id]` ; `/back-office/evenements/nouveau?reunion=1` → `/back-office/reunions/nouvelle` ; la redirection « qui n'a que des réunions » d'Évènements (`back-office/evenements/page.tsx:13-18`) disparaît (il n'a plus l'entrée). Liens à reprendre : `EvenementClient.tsx:106`, `EnTeteReunion.tsx:43,46`, `ListeGestion.tsx:54`, `NouveauClient.tsx:32` et `ModifierClient.tsx:17` (retour vers la bonne liste). **Ni `firestore.rules` ni les droits des données** : seul l'affichage du menu change (les évènements et les réunions gardent leurs règles). | Décision du 06/10 au soir ; une entrée sans sous-parties à elle n'a pas de rail. |

### App, page par page

| # | Page | Décision | Raison |
|---|---|---|---|
| A1 | **Planning, accueil** | En-tête « Planning », sous-titre « Qui sert quand, dans tous les plannings de l'église », la rangée des plannings en pilules **sous le titre** ; le reste de l'accueil A (U4 bis B1) ne change pas ; barre réduite : Groupes, EDD et Table sur une rangée (la Table sur deux étages). | Planches `v18-app-planning-accueil*` ; `planning/layout.tsx:12` met les onglets au-dessus. |
| A2 | **Grilles (A)** | Le titre reste « Planning » ; sous l'en-tête, la rangée de la grille : pastille et nom du service en h2 de 22 px, « Dimanche 10:30 · 4e trimestre 2026 », puis la période (B7), puis à droite les filtres (« Timothée C. ✕ », « Mes dates ») ; la grille en carte, en-tête gris, la couleur du service sur les dates seulement. | Piste A. |
| A3 | **Groupes au rail** | Paix · Fidélité · Bonté en rail (pastille de couleur devant chaque nom) dans la rangée de la grille ; Fidélité : Groupe · Musiciens en pilules juste après (un sous-onglet, R4). | Planche `v18-app-planning-groupes` (« plus de grands onglets de couleur ») ; Fidélité n'y est pas ouvert : son sous-onglet suit le panneau de référence. |
| A4 | **Prépa. Table (A)** | Rangée de la grille ; dessous, deux colonnes : à gauche la carte **Petit déj** du trimestre (une ligne par dimanche : « Libre » + « Je m'inscris », le nom, ou le sien en encre avec « ⋯ »), à droite « Prépa. Table du Seigneur » (les dimanches de sainte cène) et « Ton petit déj ». Plus de `max-w-lg`. | Piste A ; `PetitDejCarte.tsx:245`, `table/page.tsx:104`. |
| A5 | **Chants (A)** | En-tête « Chants », sous-titre « n chants, en français et en chinois », action « Proposer un chant » (ouvre `SongProposalDrawer`). Volet de droite sans chant choisi : « Choisis un chant » (h2), puis les prochaines setlists (aujourd'hui) **ou** la carte « Pas de setlist à venir pour toi » avec « Voir les setlists » ; puis « Récemment ouverts » (sur cet appareil) et « Nouveaux au répertoire » côte à côte ; puis « Les plus chantés à GCC » (ces trois derniers mois, deux colonnes, rang et nombre de setlists). Une carte sans donnée ne paraît pas. | Piste A ; `ChoisisUnChant.tsx:84`. |
| A6 | Chants | **Récemment ouverts** = les cinq premiers de `recentSongs`, la liste que la page d'un chant écrit déjà (`SongDetailClient.tsx:160-170`) et que la rangée « Récemment consultés » de la liste lit (`SongListClient.tsx:44-56`) : même clé, même évènement `recentSongs`, lecture sous `try/catch` ; vide ou illisible → la carte ne paraît pas. Aucune écriture nouvelle. | Une commodité de l'appareil (« sur cet appareil », planche), déjà tenue : une seconde clé ferait deux listes de récents qui divergent. |
| A7 | Chants | **Nouveaux au répertoire** = `ajouteLe` (AAAA-MM-JJ) ajouté à l'index par `build:index`, lu en **une** passe `git log --diff-filter=A --name-only --format=%cs -- content/songs` ; les six plus récents. Sans historique git (clone superficiel), `ajouteLe` est `null` et la carte ne paraît pas. | L'index n'a pas de date (`types/song.ts`) ; git l'a. Vercel clone sans tout l'historique : voir « À la mise en ligne ». |
| A8 | Chants | **Les plus chantés** = `statsChants` (pur) sur les setlists des 92 derniers jours, lues une fois et gardées une minute comme les prochaines (`ChoisisUnChant.tsx:30`, `GARDEE_MS`). | Même calcul que les Statistiques ; les setlists se lisent par tout connecté (`firestore.rules:302-303`). |
| A9 | **Setlists** | En-tête sur toute la largeur (titre, « Les chants prévus pour chaque service », « + Nouvelle setlist ») ; liste en carte (rail À venir · Archives · Mes setlists, recherche, lignes, « Comment ça marche ? ») ; aperçu à droite (U4 bis Q4) inchangé. | Planche `v18-app-setlists` ; titre aujourd'hui dans la liste (`setlists/page.tsx:318`). |
| A10 | **Évènements** | En-tête « Évènements », sous-titre « Les rendez-vous de l'église et les inscriptions », « + Nouvel évènement » (pilule à libellé en grand, rond sur téléphone), rail sous le titre (les onglets de `EvenementsTabs` ; leur liste vient de `spec-scene-paques-noel.md`). Sur les onglets Pâques et Noël, le même en-tête sans action principale (planche R17), pour que le rail ne bouge pas ; la liste de ces onglets vient de `spec-scene-paques-noel.md` (P4). Fiche dans le volet : **une colonne sous 760 px de volet, deux au-delà** (la requête de conteneur de `.fiche-grand` passe de 540 à 760 px, `globals.css:573-576`) ; un évènement **sans image** commence par son titre (plus de cadre gris) ; « Gérer dans le Back-Office » en contour à côté du titre. | Planches `v18-app-evenements*` ; `globals.css:575`, `EvenementCard.tsx:52-62`. |
| A11 | **Mes services** | Même en-tête (« Mes services », « Les dates où <nom> apparaît dans les plannings · n à venir ») ; liste en carte (rail À venir · Passés) ; fiche inchangée. | Planche `v18-app-mes-services`. |
| A12 | **Moi (A)** | En-tête « Moi », sous-titre « <nom> · Admin » (Admin pour un admin). En grand : à gauche (340 px) la carte du compte, Réglages, Déconnexion ; à droite une grille de deux colonnes d'aperçus : **Mes services** (les trois prochains, « n à venir »), **Mes tâches** (trois à faire, `BACK_OFFICE` et pôles), **Harmonie** (cours : n / N chapitres, barre, « Prochain chapitre : … » ; liens vers les fiches et les sons ; si l'accès Harmonie), **Mes équipes** (`BACK_OFFICE`) ; dessous trois cartes d'aide (Guide, Ton avis, Signaler un problème). Notifier et Admin restent tant que l'interrupteur est coupé. Tablette : compte et Réglages, puis les aperçus en deux colonnes ; téléphone : une colonne. Les lignes de liens d'aujourd'hui (Mes services, Équipes, Harmonie, Tâches, Mon profil) deviennent les « Tout voir » des aperçus et le bouton « Mon profil » du compte : rien ne disparaît. | Piste A ; `moi/page.tsx:37-62`. |
| A13 | **Profil** | « ‹ Moi », titre « Mon profil », sous-titre l'e-mail, **« Enregistrer » en haut à droite** (pilule noire) en grand et tablette ; à gauche identité puis la carte **Notifications** (`PushToggle` tel quel, avec « Recevoir ») ; à droite services et rôles. Téléphone : « Enregistrer » en bas. La ligne « Notifications » de Moi › Réglages reste. | Planche `v18-app-profil`, plus récente que U4 bis Q10 (qui sortait la carte du profil) ; même composant aux deux endroits, donc un seul réglage. |
| A14 | **Guide** | « ‹ Moi », titre et sous-titre dans l'en-tête commun, calés sur le bord du sommaire ; lecture R14 ; plus d'icône devant le titre. | Planche `v18-app-guide`. |
| A15 | **Questionnaire** | « ‹ Moi », titre « Ton avis sur le site » ; lecture R14 : à gauche les étapes en sommaire (l'étape en cours en encre ; « Les questions qui ne te concernent pas sont sautées ») ; à droite les questions de l'étape à 720 px, réponses en pilules, pied « Précédent · Suivant ». Même parcours et mêmes réponses qu'aujourd'hui. | Planche `v18-app-questionnaire`. |
| A16 | **Harmonie en onglets** | Un layout `app/harmonie/layout.tsx` pose l'en-tête « Harmonie », « Des idées pour réharmoniser, au piano et à la guitare. », rail **Fiches · Cours · Sons du RD-2000** (adresses `/harmonie`, `/harmonie/cours`, `/harmonie/rd2000`), au-dessus des trois layouts de U4 bis ; les titres de liste disparaissent (`Catalogue.tsx:149`, `SommaireCours.tsx:193`, `Rd2000Harmonie.tsx:281`) ; les cartes Cours et Sons du catalogue restent sur téléphone seulement. | Ajustement validé ; planche `v18-app-harmonie`. |

## Objectif

Sur ordinateur (barre dépliée ou réduite) et iPad paysage, chaque page de l'App et du Back-Office a le même
en-tête au même endroit, prend toute la zone de contenu et n'a ni colonne étroite ni volet vide. Sur tablette
portrait et téléphone, les pages gardent leurs dispositions de U4 bis avec les mêmes en-têtes, onglets et boutons.
Rien ne disparaît : chaque page garde ses données, ses droits et ses actions.

**Réussite** : à 1 440 px, barre dépliée, on passe de BO Tâches à BO Évènements, à Messages › Notifier, à
Équipes › Personnes, puis à l'App, Setlists, Planning et Moi : le h1 a le même x (barre + 40 px) et la même
taille (30 px) partout ; on réduit la barre : le h1 passe à barre + 28 px partout et le contenu s'élargit, sans
bande vide ; chaque liste montre une fiche ; aucune fenêtre grise ne s'ouvre en supprimant une tâche ; sur
téléphone, BO Tâches montre un rond « + » en bas à droite et aucune pilule « Nouvelle tâche ».

## Écrans

Planche v18 (artefact `1d4ZW7Y9NVHcsLB9YrrbrA`, version `1791309867-0997`), sources
`scripts/planche/agencement_bo.py`, `agencement_app.py` ; rendus `scripts/planche/root/project/v18-*.dc.html`,
aperçus `scripts/planche/apercu/v18-*.png`. Tous à 1 440 × 900, barre dépliée sauf `*-reduite`.

| Groupe | Planches |
|---|---|
| Règles | `v18-bo-regles-communes`, `v18-app-regles` |
| BO | `v18-bo-taches`, `v18-bo-tache-nouvelle`, `v18-bo-evenements-a`, `v18-bo-reunions`, `v18-bo-calendrier-agenda-a`, `v18-bo-planning-a`, `v18-bo-planning-a-reduite`, `v18-bo-equipes-organigramme`, `v18-bo-equipes-personnes`, `v18-bo-messages-reception`, `v18-bo-messages-notifier`, `v18-bo-messages-questionnaire`, `v18-bo-statistiques`, `v18-bo-statistiques-jamais`, `v18-bo-tableau-de-bord`, `v18-bo-tableau-de-bord-reduite` |
| App | `v18-app-planning-accueil`, `v18-app-planning-accueil-reduite`, `v18-app-planning-grille-a`, `v18-app-planning-groupes`, `v18-app-planning-table-a`, `v18-app-chants-a`, `v18-app-setlists`, `v18-app-evenements`, `v18-app-evenements-reduite`, `v18-app-mes-services`, `v18-app-moi-a`, `v18-app-profil`, `v18-app-guide`, `v18-app-questionnaire`, `v18-app-harmonie` |
| Écartées (pistes B) | `v18-bo-evenement-fiche-b`, `v18-bo-calendrier-agenda-b`, `v18-bo-planning-b`, `v18-app-planning-grille-b`, `v18-app-planning-table-b`, `v18-app-chants-b`, `v18-app-moi-b` |

`v18-bo-reunions` vaut pour la page Réunions, sous l'en-tête « Réunions » sans rail (B4, B15) : son en-tête
« Évènements » et son rail datent d'avant la décision du 06/10 au soir. Téléphone et tablette portrait : les
planches v17 restent la référence, avec R1 à R9. iPad paysage : la planche
de l'ordinateur barre réduite. Personnes fictives sur les planches.

## Ce qui sera construit

Deux tranches de fondation, **l'une après l'autre**, puis des tranches de pages **qui se codent en parallèle**,
puis une tranche de fin. Chaque tranche : tests écrits avant le code et vus rouges, code, suite de ses specs verte
sur les cinq projets, captures regardées aux cinq tailles, un commit (sur demande).

### Fondations (séquentielles)

**F1 — Composants et règles communes** (aucun écran ne change, sauf le halo du BO).
`components/layout/EnTetePage.tsx` (R1, R2, R3, R8 : `Retour` dedans), `components/layout/Onglets.tsx`
(`OngletsRail`, `Pilules` ; R4, R5), `components/layout/BoutonNouveau.tsx` (R7),
`components/layout/MenuActions.tsx` et `components/layout/Confirmer.tsx` (`ConfirmerProvider`, `useConfirmer` ; R9),
posé dans `app/layout.tsx` ; `DeuxVolets.tsx` en liste-carte (R10) ; `HaloParDefaut.tsx` bleu gris sous
`/back-office` (R12) ; `globals.css` : `--marge-page`, `--halo-back-office` (clair et sombre), `.titre-page` ;
`playwright.config.ts` : `agencement-v18-*.spec.ts` dans `SPECS_GRAND_ECRAN` ; `tests/helpers/agencement.ts`
(vérifications communes, voir Tests) ; `tests/agencement-v18-fondations.spec.ts` (sur une route jetable de test
non commitée, comme B0 de U4 bis).
*Conflits* : touche `DeuxVolets.tsx`, `globals.css`, `app/layout.tsx`, `playwright.config.ts`, que les tranches de
pages ne touchent plus ensuite (sauf les deux blocs CSS dits en T7 et T8 ; la scène ajoute sa ligne à
`SPECS_GRAND_ECRAN`, P1 de `spec-scene-paques-noel.md`).

**F2 — Confirmations dans le site** (R9). Les dix `window.confirm` hors scène et hors importations passent par
`useConfirmer` : `EvenementClient.tsx:109`, `Inscriptions.tsx:258`, `NouveauClient.tsx:87`, `TacheForm.tsx:104`,
`PlanningGrille.tsx:217`, `PetitDejCarte.tsx:118`, `BoutonPublication.tsx:27`, `CompteRenduCarte.tsx:59`,
`SujetsAborder.tsx:165`, `TableauDeBord.tsx:81`. Mécanique, sans changement d'écran ni de logique.
*Pourquoi avant les pages* : elle touche des fichiers de quatre groupes de pages ; faite d'abord, plus aucune
tranche n'y revient pour cela.

### Pages (parallèles après F1 et F2)

Chaque tranche remplace, dans ses pages, `PageTitle` / `EnTeteEntree` par `EnTetePage`, ses onglets par
`OngletsRail` / `Pilules`, ses boutons par `BoutonNouveau` / `MenuActions`. Fichiers partagés par plusieurs
tranches, à fusionner à la main sans difficulté : `src/lib/deuxVolets.ts` (une ligne ajoutée à
`SECTIONS_EN_DEUX_VOLETS`, par T1, T2b, et P4 de la scène) et `src/locales/fr.json` / `zh-CN.json` (chaque tranche n'ajoute de clés
que dans l'objet de sa section).

| Tranche | Contenu | Fichiers | Conflits possibles |
|---|---|---|---|
| **T1 — BO Tâches** | B1, B2 : layout en deux volets, fiche, historique, adresses `[id]` et `nouvelle`, formulaire en ligne. | `app/back-office/taches/{layout,page}.tsx`, `[pole]/page.tsx`, `[pole]/[id]/page.tsx` et `[pole]/nouvelle/page.tsx` (nouveaux), `components/taches/{TacheForm,FicheTache}.tsx`, `lib/deuxVolets.ts` | `TacheForm` sert aussi au calendrier (T3) et à l'App : la feuille reste le défaut (`enLigne` facultatif). Même voie que T3 conseillée. |
| **T2a — L'entrée Réunions** | B15 : neuf entrées, droits d'affichage, adresses `/back-office/reunions/*` qui montent les composants d'aujourd'hui (disposition inchangée), redirections, Plus, barre du bas, libellés FR et 中文. Aucune mise en page nouvelle : se vérifie seule. | `types/backOffice.ts`, `lib/navigation.ts`, `lib/access.ts` (`entreesBackOffice`, `widgetsPermis`, `sousPartiesEvenements`), `lib/tableauDeBord/donnees.ts` (raccourci), `components/backOffice/{PagePlus,FeuilleBarreDuBas}.tsx`, `app/back-office/reunions/**` (nouveau), `app/back-office/evenements/{page,reunions/page,nouveau/NouveauClient,[id]/page,[id]/modifier/ModifierClient}.tsx`, `ListeGestion.tsx` (un lien), `EvenementClient.tsx:106`, `components/reunions/EnTeteReunion.tsx`, `src/locales/*.json` | Fichiers de T2b : **même voie, T2a puis T2b**. `access.ts` : aucune autre tranche de cette spec ; P7 de la scène lit `sousPartiesEvenements` telle que T2a la laisse. |
| **T2b — BO Évènements et Réunions en deux volets** | B3, B4 : liste dans le layout de chaque entrée, fiche de gestion et fiche de réunion dans le volet, nouveau et modifier dans le volet. | `app/back-office/evenements/{layout,page,ListeGestion}.tsx`, `app/back-office/reunions/{layout,page}.tsx`, `[id]/page.tsx`, `nouveau/*`, `[id]/modifier/*`, `app/evenements/[id]/EvenementClient.tsx` (**branches `backOffice` seulement**), `components/reunions/EnTeteReunion.tsx`, `lib/deuxVolets.ts` | `EvenementClient.tsx` avec T7 (App Évènements) : **même voie, T2b puis T7**. `back-office/evenements/layout.tsx` avec la scène : `sousPartiesEvenements` rend toujours `"scene"` et **P7** de `spec-scene-paques-noel.md` en tire les deux onglets Pâques et Noël dans ce layout ; **T2 (a et b) avant P7** (T2 pose l'en-tête et la liste, P7 n'ajoute que ses deux adresses et sa page). |
| **T3 — BO Calendrier** | B5 : en-tête, agenda pleine largeur, volet du jour en agenda, « Ajouter ce jour-là ». | `app/back-office/calendrier/CalendrierClient.tsx`, `components/calendrier/PanneauJour.tsx`, la liste de l'agenda | `TacheForm` (lu seulement). |
| **T4 — Planning, BO et App** | B6, B7, A1 à A4. Deux étapes dans la même voie : T4a en-tête et rangée de grille communes (BO, grilles, Groupes) ; T4b accueil et Prépa. Table. | `app/back-office/planning/{layout,page}.tsx`, `[cle]/PlanningDuBackOffice.tsx`, `app/planning/layout.tsx`, `page.tsx`, `{culte,table,groupes,edd,campus,intergroupe,interfranco}/page.tsx`, `components/planning/{PlanningTabs,FilterButtons,AnneeSelecteur,PetitDejCarte,PlanningGrille}.tsx`, `BarreDeGrille.tsx` (nouveau), `components/layout/SectionTabs.tsx` | Aucun avec les autres voies ; `PlanningGrille.tsx` a été touché par F2 (déjà versé). |
| **T5 — BO Équipes et Messages** | B8, B9, B10, B11, B12. | `app/back-office/equipes/*`, `app/equipes/EquipesClient.tsx` (branche `gestion`), `components/equipes/BandeauEquipes.tsx` (crayon), `components/admin/{Personnes,InscriptionsComptes}.tsx`, `app/back-office/messages/*`, `components/messages/{Notifier,ReceptionVolets}.tsx`, `components/admin/SurveyResults.tsx`, `ApercuNotification.tsx` (nouveau) | `EquipesClient.tsx` sert l'App Équipes (bandeau, déjà conforme) : ne toucher qu'à la branche `gestion` et au panneau d'édition. |
| **T6 — BO Statistiques et Tableau de bord** | B13, B14 (avec la variante barre réduite). | `app/back-office/statistiques/*`, `app/back-office/page.tsx`, `components/backOffice/TableauDeBord.tsx`, `widgets/Cadre.tsx`, `lib/tableauDeBord/colonnes.ts` (nouveau, `repartirWidgets`) | `TableauDeBord.tsx` touché par F2 (déjà versé). |
| **T7 — App Évènements** | A10. **Rend vert** `pages-en-grand-evenements.spec.ts:79` (« inscription à droite de la bannière », `ordinateur` et `tablette-paysage`), rouge depuis F1 (liste-carte de `DeuxVolets`) : le réécrire avec la règle A10 (une colonne sous 760 px de volet, deux au-delà) et retirer la marge intérieure de la fiche en deux volets (R10). | `app/evenements/{CalendrierClient,SectionEvenements,EvenementCard}.tsx`, `EvenementClient.tsx` (**branches App seulement**), `components/evenements/EvenementsTabs.tsx`, `globals.css` (bloc `.fiche-grand` seulement) | Après T2b (même fichier). **T7 pose l'en-tête de toute la section** (`EnTetePage` + `OngletsRail` dans `SectionEvenements`, pour l'agenda **et** pour la branche `/evenements/scene`) ; la scène (P4 de `spec-scene-paques-noel.md`) ne change que la liste d'`EvenementsTabs` et ce qui est sous l'en-tête : **T7 avant P4**. |
| **T8 — App Chants** | A5 à A8. | `app/songs/{ChantsVolets,ChoisisUnChant,SongListClient}.tsx`, `scripts/build-index.ts`, `types/song.ts`, `globals.css` (bloc `.chants-volets` seulement) | `build-index.ts` et l'index : aucune autre tranche. |
| **T9 — App Setlists et Mes services** | A9, A11. **Rend vert** `pages-en-grand-mes-services.spec.ts:120` (« setlist et équipe côte à côte », `ordinateur` et `tablette-paysage`), rouge depuis F1 : retirer la marge intérieure de `DetailService` en deux volets (`px-6 xl:px-9`, R10), ce qui rend la place à `.service-detail`. | `app/setlists/page.tsx`, `app/mes-services/layout.tsx`, `components/mesServices/ListeMesServices.tsx` | Aucun. |
| **T10 — App Moi, Profil, Guide, Questionnaire** | A12 à A15. | `app/moi/page.tsx`, `components/moi/*` (aperçus nouveaux), `app/(auth)/profil/page.tsx`, `app/guide/page.tsx`, `app/questionnaire/page.tsx` | Lit `lib/planning/accueil.ts`, `useTaches`, `coursProgres` sans les changer. |
| **T11 — App Harmonie** | A16. | `app/harmonie/layout.tsx` (nouveau), `components/harmonie/{Catalogue,cours/SommaireCours,rd2000/Rd2000Harmonie}.tsx` | Aucun. |

**Voies conseillées** (au plus sept agents ; trois ou quatre à la fois, à cause de la limite de dépense vue le
04/10) : ① T1 puis T3 ; ② T2a, T2b puis T7 ; ③ T4 ; ④ T5 ; ⑤ T6 ; ⑥ T8 puis T9 ; ⑦ T10 puis T11.
**Avec la scène** (`spec-scene-paques-noel.md`) : ses tranches pures P1 à P3 se codent à tout moment ; ses tranches
d'écran demandent F1 et F2 (en-tête, rail, pilules, « ⋯ », `useConfirmer`, `DeuxVolets`), puis **P4 après T7** et
**P7 après T2a et T2b** (mêmes fichiers : `SectionEvenements.tsx`, `EvenementsTabs.tsx`, `back-office/evenements/layout.tsx`).
**Ordre d'intégration** : F1 et F2, puis T7 et T9, avant toute fusion sur `main` ; **jamais F1 seule en ligne**. La
liste-carte de `DeuxVolets` (R10) change tout de suite les pages qui l'utilisent déjà (Setlists, Évènements, Mes
services, Harmonie, Réception, Tâches de l'App) et laisse quatre tests rouges jusqu'à T7 et T9 (lignes du tableau).
Chaque tranche de pages retire la marge intérieure de ses fiches en deux volets : `DeuxVolets` pose déjà la marge,
la fiche n'en pose plus.

### Fin (séquentielle)

**Z — Nettoyage et passage complet.** Supprimer `EnTeteEntree.tsx`, `PageTitle.tsx` et `FilterButtons.tsx` s'ils
n'ont plus d'appel, les styles orphelins, le relais `components/harmonie/Pilules.tsx` ; retirer la page d'essai
`app/essai-agencement/` (commitée par F1, voir Avancement) après avoir porté ce que teste
`agencement-v18-fondations.spec.ts` sur des pages réelles ; `tests/agencement-v18-regles.spec.ts` passe toutes les pages des deux
espaces (liste ci-dessous) ; captures aux cinq tailles, comparées aux planches v18.

## Tests (Playwright, écrits avant le code)

Fichiers `tests/agencement-v18-<tranche>.spec.ts`, sur les cinq projets (`ordinateur`, `telephone`, `tablette`,
`tablette-paysage`, `ordinateur-1440`) ; un test propre à un appareil le dit dans son titre.

**Vérifications communes** (`tests/helpers/agencement.ts`, F1), appelées par chaque tranche sur ses pages :
- un seul `header[data-entete-page]`, un seul h1 dedans ; taille du h1 30 px dès 768 px, 24 px sur téléphone ;
- en grand : bord gauche du h1 = largeur de la barre + 40 px (barre dépliée) ou + 28 px (réduite, iPad paysage),
  à 1 px près ; le premier bloc de contenu commence au même x ;
- `document.documentElement.scrollWidth ≤ innerWidth` ;
- un halo visible (`[data-testid=halo]` ou `[data-testid=halo-defaut]`) ; sous `/back-office`, la variable
  `--halo` vaut le bleu gris quand la page n'a pas le sien ;
- aucun bloc de contenu plus étroit que la zone moins deux marges, sauf une lecture (720 px) ;
- `page.on("dialog")` fait échouer le test : aucune fenêtre native ;
- onglets : `[data-onglets="rail"]` pour une section ou une vue, `[data-onglets="pilules"]` pour un sous-onglet,
  un filtre ou un planning.

**F1** : `EnTetePage` rend retour, titre, sous-titre, action, rail et rangée dans cet ordre ; `BoutonNouveau` est
une pilule à libellé dès 768 px et un rond `aria-label` sur `telephone`, au-dessus de la barre d'onglets ;
`useConfirmer` rend `false` sur « Annuler » et Échap, `true` sur l'action ; `MenuActions` s'ouvre au clavier ;
`DeuxVolets` : liste en carte, aucune bande vide barre réduite (avec `agencement-barre-reduite.spec.ts` de la
branche de corrections) ; halo bleu gris sur `/back-office`.

**F2** : les dix confirmations, une par test : supprimer un évènement, retirer un inscrit, supprimer une tâche,
retirer une date de la grille, retirer un petit déj, publier un trimestre, retirer un compte rendu, retirer un sujet,
revenir à la disposition par défaut : une fenêtre du site, « Annuler » ne fait rien, l'action fait ce qu'elle
faisait ; dupliquer un évènement qui a des tâches liées : la fenêtre du site demande s'il faut copier les tâches,
« Annuler » crée l'évènement sans elles (comme aujourd'hui, `NouveauClient.tsx:87`).

**T1** : en grand, `/back-office/taches/<pôle>` montre la liste et la première tâche à faire ; toucher une tâche
change l'adresse et la fiche ; « + Nouvelle tâche » ouvre le formulaire dans le volet (pas de `[role=dialog]`) ;
créer une tâche l'ajoute et ouvre sa fiche ; « ⋯ › Supprimer » confirme puis retire ; un lien direct vers
`/back-office/taches/<pôle>/<id>` ouvre liste et fiche ; sur `telephone`, la liste, puis la fiche en page avec
« ‹ Tâches », le formulaire en feuille.

**T2a** : la barre latérale d'un admin a neuf entrées, Réunions juste après Évènements (`back-office-espace.spec.ts`
: 8 → 9) ; un membre du pôle DA sans droit d'annonces a Réunions et pas Évènements, un droit d'annonces seul
l'inverse, la coordination les deux ; Réunions est actif sur `/back-office/reunions/*` ; les trois anciennes
adresses redirigent (liste, fiche d'une réunion, `nouveau?reunion=1`) ; la feuille « Ta barre du bas » propose
neuf cases (`barre-back-office.spec.ts` : 8 → 9) et Réunions peut y être cochée ; une barre enregistrée avec
Évènements, relue pour un membre qui n'a que Réunions, se complète sans erreur ; « Plus » montre Réunions après
Évènements ; le rail d'Évènements n'a plus « Réunions » ; libellés en 中文 ; `back-office-coupe.spec.ts` :
`/back-office/reunions` répond 404 sans l'interrupteur.

**T2b** : en grand, `/back-office/evenements` montre la liste et le prochain évènement en fiche de gestion ;
« Voir comme un membre » mène à `/evenements/<id>` ; `/back-office/reunions` montre la liste et la prochaine
réunion ouverte d'office ; un lien direct vers une réunion ouvre liste et fiche sous l'entrée Réunions ; « Nouvel évènement » s'ouvre dans le volet ; plus de bouton calé à gauche ; l'onglet de la scène
n'a pas la liste des évènements, et le h1 « Évènements » garde son x et son y d'un onglet à l'autre.

**T3** : en agenda, le volet du jour est là, avec « Ajouter ce jour-là » et son menu ; toucher un jour le choisit ;
l'agenda occupe toute la largeur moins le volet ; le titre est « Calendrier » et le mois est dans la rangée.

**T4** : BO : deux rangées de commandes au-dessus de la grille (rail, puis plannings + période + Mes dates) ;
l'actif des plannings a la couleur du service ; « Exporter » dans l'en-tête ; App : le h1 est « Planning » sur
chaque planning, le service est un h2 ; Groupes : Paix · Fidélité · Bonté en rail ; Prépa. Table : petit déj et
Table côte à côte en grand, l'un sous l'autre sur `telephone` ; barre réduite : accueil sur une rangée Groupes,
EDD, Table ; `telephone` et `tablette` : la feuille des plannings (V7) marche toujours.

**T5** : Organigramme en bandeau au BO (pas de défilement de page en largeur), crayon → panneau d'édition,
enregistrer met à jour la carte ; Personnes : `?uid=` ouvre la personne, la carte des inscriptions est en tête ;
Messages : le h1 a le même x sur les trois onglets ; Notifier : l'aperçu reprend le titre et le message tapés ;
« Derniers envois » liste au plus cinq envois ; Questionnaire : la première partie ouverte d'office.

**T6** : le h1 est « Statistiques » sur les trois vues ; le rail est sous le titre ; « Jamais joués » ne dépasse pas
deux écrans avant « Tout afficher » ; tableau de bord : deux colonnes barre dépliée, trois barre réduite sur
`ordinateur-1440` ; « Personnaliser » rend la grille ; `repartirWidgets` (pur) : ordre gardé dans chaque colonne,
la colonne large prend les `l` ou le premier, chaque suivant va dans la moins haute.

**T7** : fiche sur une colonne quand le volet fait moins de 760 px (`ordinateur`, barre dépliée), deux au-delà
(`ordinateur-1440` barre réduite) ; évènement sans image : pas de `[data-testid=banniere]` ; « + Nouvel évènement »
à libellé en grand, rond sur `telephone`.

**T8** : sans setlist à venir, le volet montre « Pas de setlist à venir pour toi » et au moins une autre carte ;
« Récemment ouverts » liste le dernier chant ouvert, dans le même ordre que la rangée « Récemment consultés »
(une seule clé `recentSongs`) ; `localStorage` bloqué : la page s'affiche sans la carte ;
« Nouveaux au répertoire » ordonné par `ajouteLe` (index de test) ; « Les plus chantés » compté sur 92 jours
(fonction pure testée) ; `npm run build:index` sans historique git : `ajouteLe` nul, pas d'erreur.

**T9** : Setlists et Mes services : le h1 est au-dessus des deux volets, la liste est une carte ;
« + Nouvelle setlist » à libellé en grand, rond sur `telephone`.

**T10** : Moi : les aperçus présents selon les droits (Tâches et Équipes seulement interrupteur ouvert, sur le
second serveur sans eux) ; Profil : « Enregistrer » dans l'en-tête dès 768 px, en bas sur `telephone`, la carte
Notifications présente ; Guide et Questionnaire : titre au x du sommaire, colonne de 720 px, « ‹ Moi ».

**T11** : le rail Fiches · Cours · Sons du RD-2000 sur les trois adresses ; l'onglet suit l'adresse ; un lien direct
vers une fiche, une leçon, un son garde ses deux volets.

**Z** : `tests/agencement-v18-regles.spec.ts` appelle les vérifications communes sur `/planning`,
`/planning/culte`, `/songs`, `/setlists`, `/evenements`, `/mes-services`, `/moi`, `/profil`, `/guide`,
`/questionnaire`, `/harmonie`, `/back-office`, `/back-office/taches`, `/back-office/evenements`,
`/back-office/reunions`, `/back-office/calendrier`, `/back-office/planning`,
`/back-office/equipes`, `/back-office/equipes/personnes`, `/back-office/messages`,
`/back-office/messages/notifier`, `/back-office/messages/questionnaire`, `/back-office/statistiques`, et, une
fois la scène codée, `/evenements/scene/noel` et `/back-office/evenements/scene/noel` (dont les tests appellent
aussi ces vérifications, `spec-scene-paques-noel.md`), barre dépliée puis réduite ; `back-office-coupe.spec.ts` (second serveur) : toujours 404.

**À réécrire en chemin** (chaque tranche les siens) : les tests qui attendent le titre de liste en h2 et la fiche
en h1 (`pages-en-grand-*.spec.ts`, `look-halo.spec.ts`), les clics sur `SectionTabs` ou `FilterButtons`
(`planning-*.spec.ts`, `look-navigation.spec.ts`), les `page.on("dialog")` qui acceptent une fenêtre native.

## Hors périmètre

- La scène : onglets Pâques · Noël, réservations, saison au BO, ses quatre confirmations
  (`spec-scene-paques-noel.md`). Ici, seulement l'en-tête de la section Évènements.
- Les pistes B de la planche (liste ci-dessus).
- Réception : « Joué n fois en 12 mois » (une lecture d'un an de setlists à chaque ouverture) et « Setlist citée »
  (un signalement ne garde pas de setlist, `types/report.ts`). Les planches les montrent ; à rouvrir si Timothée y
  tient.
- Équipes › Organigramme : la ligne « Pôles calculés le … · n personnes ont changé de pôle » (aucune date de
  calcul n'est gardée, et « Recalculer » ne touche pas aux pôles, `RecalculerOrganigramme.tsx`, branche de
  corrections).
- Création d'équipe (les équipes sont fixes) ; catégories de notification nouvelles (le profil reprend
  `PushToggle` tel quel).
- Les chants, la page d'une setlist, le mode louange, l'éditeur de setlist (conformes selon l'audit).
- Les captures du guide et du prototype Figma (à refaire après le code, `scripts/figma/`).

## À la mise en ligne

- Rien à publier dans Firestore (R16).
- **Vercel : `VERCEL_DEEP_CLONE=true`** dans les variables du projet, sinon le clone superficiel prive
  `build:index` de l'historique et « Nouveaux au répertoire » ne paraît pas (A7). À poser par Timothée.
- Les pages de l'App changent pour tous à la fusion sur `main` ; le BO reste coupé tant que l'interrupteur l'est.

## Questions ouvertes

Aucune qui bloque : la planche v18 est validée en entier. Un écart à montrer à Timothée au moment du go, sans
attendre sa réponse pour coder (R4 s'applique) :

1. **Rail ou pilules, là où les planches se contredisent.** Le texte validé (« rail = onglets de section,
   pilules = sous-onglets et filtres ») et le panneau de référence `v18-bo-regles-communes` sont suivis : sections
   et vues en rail, sous-onglets (Équipes · Musiciens, Groupe · Musiciens), filtres et plannings en pilules. Cela
   met en **rail** les onglets d'Harmonie et d'Évènements, que la seule planche App dessine en pilules (la planche
   scène, validée elle aussi, met Calendrier · Pâques · Noël dans le rail).

## Commandes

```bash
npx tsc --noEmit
npm run lint
npm run build:index
npm test -- tests/agencement-v18-*.spec.ts
npm test -- tests/back-office-coupe.spec.ts
```

## Avancement

- 06/10/2026 : spec écrite d'après la planche v18 (validée le 06/10/2026 au soir) et l'audit d'agencement ;
  attend le go. Préalable : `fix/integration-retours` versé sur `ui/apple-design`.
- 06/10/2026, plus tard : relecture croisée avec `spec-scene-paques-noel.md` (en-tête de la section Évènements
  à T7 et T2b, composants communs partagés, ordre des voies) ; décision de Timothée « Réunions dans la barre
  latérale » intégrée (B4, B15, tranche T2a). Attend toujours le go.

### V18F — Fondations (F1)

- 06/10/2026 : **F1 faite** (branche `lot/v18-fondations`, commit `feat(V18F): F1 — composants et règles communes`).
  Aucun écran ne change, sauf le halo bleu gris du Back-Office et `DeuxVolets` (liste en carte, à la marge) :
  les pages qui l'utilisent déjà (Setlists, Mes services, Harmonie, Tâches de l'App, Réception…) prennent la
  carte et la marge tout de suite, leur en-tête vient avec leur tranche.
- **Fichiers** : `components/layout/EnTetePage.tsx` (`EnTetePage`, `Retour`), `Onglets.tsx` (`OngletsRail`,
  `Pilules`), `BoutonNouveau.tsx`, `MenuActions.tsx`, `Confirmer.tsx` (`ConfirmerProvider` posé dans
  `app/layout.tsx`, `useConfirmer`) ; `DeuxVolets.tsx` en liste-carte (`raised rounded-2xl`, collante 20 px sous
  la barre, `gap-[var(--ecart-volets)]`, `px-[var(--marge-page)]`) ; `HaloParDefaut.tsx` (bleu gris sous
  `/back-office`) ; `globals.css` : `--marge-page`, `--ecart-volets`, `--halo-back-office` (clair `#e4e7f6`, sombre
  `#262b45`), `.titre-page` ; `components/harmonie/Pilules.tsx` n'est plus qu'un relais vers `Onglets.tsx` (la
  tranche Z le retire) ; `app/back-office/EspaceBackOffice.tsx` enveloppe le contenu dans un `relative` (sans lui,
  le halo fixe, à 80 % d'opacité, voilait le titre et les premières cartes du tableau de bord).
- **Tests** : `tests/agencement-v18-fondations.spec.ts` (15 tests × 5 projets, vus rouges sur le CSS, `DeuxVolets` et
  `HaloParDefaut` d'avant, puis verts) sur la page d'essai `/essai-agencement` (404 en production, servie par `next dev` seulement) ;
  `tests/helpers/agencement.ts` ; `agencement-v18-*.spec.ts` dans `SPECS_GRAND_ECRAN`.
- **Écart à la spec** : la page d'essai est **commitée** (la spec la disait « non commitée ») : le test F1 en
  dépend et doit rester vert dans la suite complète de l'intégration ; elle répond 404 en production.
- **Suites voisines** (06/10/2026, cinq projets) : `pages-en-grand-*`, `agencement-barre-reduite`, `look-halo*`,
  `back-office-espace`, `deux-volets-finitions`, `setlist-deux-volets`, `chants-deux-volets`, `harmonie-catalogue`,
  `back-office-coupe` : 1 065 verts, **4 rouges attendus**, causés par la liste-carte (vérifié : verts avec le
  `DeuxVolets` d'avant). Le volet de droite perd la marge et l'écart, et les fiches gardent leur propre marge
  intérieure (`px-6 xl:px-9`), donc leurs requêtes de conteneur repassent sur une colonne à 1 280 px et sur iPad
  paysage :
  - `pages-en-grand-evenements.spec.ts:79` (« inscription à droite de la bannière », `ordinateur`,
    `tablette-paysage`) → **T7** : A10 met justement la fiche sur une colonne sous 760 px de volet ; le test se
    réécrit avec la règle.
  - `pages-en-grand-mes-services.spec.ts:120` (« setlist et équipe côte à côte », `ordinateur`, `tablette-paysage`)
    → **T9** : retirer la marge intérieure de `DetailService` en deux volets (`px-6 xl:px-9`, R10 : la fiche ne
    pose plus de marge), ce qui rend la place à `.service-detail`.
  Chaque tranche de pages retire de même la marge intérieure de ses fiches en deux volets.
- **Reste** : rien pour F1. F2 (les dix `window.confirm`) est la tranche suivante.
- **Timothée** : rien à publier (aucune règle, aucune donnée).

**Exemples d'usage, pour les tranches de pages** (les commentaires en tête de chaque composant en disent plus) :

```tsx
// En-tête d'une page de liste du Back-Office, avec rail de sous-parties en liens.
<EnTetePage
  titre={t("backOffice.entrees.taches")}
  sousTitre={t("taches.sousTitre")}
  action={<BoutonNouveau label={t("taches.nouvelle")} href={`/back-office/taches/${pole}/nouvelle`} />}
  onglets={<OngletsRail etiquette={t("taches.poles")} onglets={poles.map((p) => ({ id: p.cle, label: p.nom, href: `/back-office/taches/${p.cle}`, compte: p.n }))} />}
/>
<DeuxVolets racine="/back-office/taches" liste={<ListeDuPole />} premier={<FicheTache … />}>{children}</DeuxVolets>

// Une fiche ouverte en pleine page (téléphone) : le seul retour.
<EnTetePage retour={{ href: "/moi", label: t("nav.moi") }} titre={t("profil.titre")} sousTitre={email}
            outils={<MenuActions actions={[{ label: t("common.supprimer"), destructif: true, onSelect: supprimer,
                      confirmer: { titre: t("…"), action: t("common.supprimer") } }]} />} />

// Vues dans la page (boutons) et filtres (pilules), dans l'en-tête.
<EnTetePage titre="Statistiques"
  onglets={<OngletsRail etiquette="Vue" onglets={[{ id: "joues", label: "Les plus joués" }, { id: "jamais", label: "Jamais joués" }]} actif={vue} choisir={setVue} />}
  apres={<Pilules etiquette="Période" options={periodes} valeur={periode} choisir={setPeriode} obligatoire />} />

// Une confirmation dans le site, ligne pour ligne à la place de window.confirm.
const confirmer = useConfirmer();
if (!(await confirmer({ titre: t("…"), texte: t("…"), action: t("common.supprimer"), destructif: true }))) return;

// Tests d'une tranche : les vérifications communes.
interdireDialoguesNatifs(page);
await ouvrirAvecBarre(page, "reduite");      // facultatif
await signInAs(page, ADMIN, DOCS, "/back-office/taches/da");
await verifierAgencement(page, {              // en-tête, x et taille du h1, débordement, halo, et :
  contenu: page.locator("[data-deux-volets]"),  // à donner : le bloc prend toute la zone (une lecture : `lecture: true`)
  onglets: { rail: 1, pilules: 0 },          // à donner : les onglets passent par OngletsRail et Pilules
});
```

Mesures : le h1 (`.titre-page`) fait 24 px sur téléphone et 30 px dès 768 px ; `EnTetePage` porte `--marge-page`
et les 20 px sous l'en-tête : la page pose ensuite son contenu à `px-[var(--marge-page)]` (pleine zone) ou dans
`DeuxVolets`, qui pose déjà la marge. Sur téléphone, `BoutonNouveau` sort de l'en-tête en rond fixe au-dessus de
la barre d'onglets : une page sans barre du bas (rare) le verra plus haut que nécessaire.

### V18F — Fondations (F2)

- 06/10/2026 : **F2 faite** (branche `lot/v18-fondations`, commit `feat(V18F): F2 — les dix confirmations dans le site`).
  Plus aucun `window.confirm` hors de la scène (`grep window.confirm src` ne trouve plus que les quatre de
  `app/evenements/scene/`, que réécrit `spec-scene-paques-noel.md`). Les dix appels deviennent
  `await confirmer({ titre, texte?, action, destructif? })` sur place, logique inchangée : `EvenementClient`,
  `Inscriptions` (`PanneauInscriptions`), `NouveauClient` (copie des tâches : « Annuler » crée l'évènement sans
  elles), `TacheForm` (`Champs`), `PlanningGrille`, `PetitDejCarte`, `BoutonPublication`, `CompteRenduCarte`,
  `SujetsAborder`, `TableauDeBord`.
- **Libellés** (FR et 中文, à relire) : les quatre messages à deux phrases sont coupés en question (titre) et
  phrase d'explication (`…Texte`) : `evenements.confirmDelete`, `planning.annee.confirmerRetrait`,
  `planning.publierConfirm`, `tableauDeBord.perso.confirmParDefaut`. Nouveaux boutons : `common.buttons.remove`
  (« Retirer » / 移除), `evenements.copierTachesOui` (« Copier les tâches » / 复制任务),
  `tableauDeBord.perso.remettre` (« Remettre par défaut » / 恢复默认). Publier garde son libellé (« Publier le T1 »),
  sans rouge ; les retraits et suppressions (et la disposition par défaut, qui efface les réglages) sont en rouge.
- **Tests** : `tests/agencement-v18-confirmations.spec.ts` (10 tests × 5 projets, vus rouges : chacun tombait
  sur la fenêtre grise, puis verts) ; `tests/helpers/agencement.ts` gagne `fenetreDuSite` et
  `repondreDansLeSite`. Les tests existants qui acceptaient la fenêtre grise répondent maintenant dans le site
  (`back-office-admin`, `evenements`, `planning-2027`, `planning-petit-dej`, `reunions`, `tableau-de-bord`,
  `taches-evenements`) : verts sur leurs projets. Captures regardées aux cinq tailles (fenêtre centrée, boutons
  empilés sur téléphone, au-dessus de la feuille du formulaire de tâche).
- **Reste** : rien pour F2. Les tranches de pages (T1 à T11) peuvent partir.
- **Timothée** : rien à publier (aucune règle, aucune donnée) ; relire les six libellés 中文 ci-dessus.

### V18F — Relecture (F1 et F2)

- 07/10/2026 : **lot fini et relu** (deux relectures, onze constats ; commit `fix(V18F): relecture — …` sur
  `lot/v18-fondations`). **Comportements corrigés**, chacun avec un test vu rouge puis vert :
  - `ConfirmerProvider` : la fenêtre se ferme et répond `false` quand la page change sous elle (Précédent,
    Suivant) ; avant, elle restait par-dessus la page suivante et « Supprimer » agissait pour la page quittée.
    Une demande faite par une page au montage n'est pas annulée (on garde le chemin de la demande).
  - `OngletsRail` en boutons : le motif ARIA des onglets à activation manuelle (un seul arrêt de tabulation,
    ← → en boucle, Début, Fin ; Entrée ou Espace choisit). Rôles inchangés (`tablist`, `tab`, `aria-selected`) :
    les tests des tranches qui cliquent un onglet restent bons.
  - La page d'essai `/essai-agencement` répond aussi 404 interrupteur coupé (second serveur, « comme en ligne ») ;
    `back-office-coupe.spec.ts` le vérifie.
- **Tests ajoutés** : halo du Back-Office en sombre (`#262b45`, vu rouge en cassant exprès la valeur, puis remise) ;
  `verifierAgencement(page, { contenu, lecture, onglets })` : pleine largeur du bloc de contenu et compte des
  rails et des pilules (`verifierOnglets`), facultatifs pour ne pas casser les appels déjà écrits, **à donner par
  chaque tranche** (exemple ci-dessus), avec un test qui prouve que la vérification de pleine largeur mord ;
  captures F1 dans le dépôt, `PW_CAPTURES=<dossier>` (essai, barre réduite, fenêtre, menu, halo du BO clair et
  sombre), regardées aux cinq tailles.
- Documentation seulement : commentaire de `Confirmer` (un clic à côté ne ferme pas une `AlertDialog`) ;
  `MenuActions` (`onSelect` gère ses erreurs, clé par position : deux libellés peuvent se répéter) ;
  `OngletsRail` (liens qui ne diffèrent que par la query : `actif` obligatoire, testé ; chaque lien a son `href`).
- **Les quatre tests rouges** laissés par la liste-carte de `DeuxVolets` restent voulus (R10) : leur correction
  est écrite dans les lignes **T7** et **T9** du tableau des tranches, avec l'**ordre d'intégration** (F1 et F2,
  puis T7 et T9, jamais F1 seule en ligne). La page d'essai reste commitée ; **Z** la retire (paragraphe Z).
- **Suites** (07/10/2026) : `agencement-v18-fondations` (cinq projets), `agencement-v18-confirmations` (cinq
  projets) et `back-office-coupe` (second serveur) verts ; `tsc --noEmit` et `npm run lint` sans erreur.
- **Reste** : rien pour les fondations.
- **Timothée** : rien à publier (aucune règle, aucune donnée) ; relire les six libellés 中文 de F2 ; ne pas mettre
  en ligne `lot/v18-fondations` avant T7 et T9.

### V18T2 — L'entrée Réunions (T2a)

- 06/10/2026 : **T2a faite** (branche `lot/v18-t2`, commit `feat(V18T2): T2a — l'entrée Réunions`), après la
  fusion de `lot/v18-fondations` (F1, F2). Aucune mise en page nouvelle : les adresses `/back-office/reunions/*`
  montent les composants d'aujourd'hui (T2b les mettra en deux volets).
- **Menu à neuf entrées** : `ENTREES` gagne `reunions` après `evenements` (`types/backOffice.ts`) ;
  `ENTREES_BACK_OFFICE.reunions` (`/back-office/reunions`, icône `Users`, `lib/navigation.ts`) ; libellés
  `backOffice.entrees.reunions` (« Réunions » / 会议) et `backOffice.plus.contenu.reunions` (« sujets, comptes
  rendus » / 议题、会议记录). **Droits d'affichage** (`entreesBackOffice`) : Évènements = admin, coordination ou
  droit d'annonces ; Réunions = admin, un pôle (Louange compris), membre ou référent d'une équipe
  (`ProfilResponsable` lit `dansEquipes`). `sousPartiesEvenements` ne rend plus que `evenements` et `scene`.
  Widget « Prochains évènements » permis avec l'une ou l'autre entrée ; raccourci « Nouvel évènement » inchangé
  (il suivait déjà Évènements seul). « Plus » : Réunions après Évènements ; barre du bas et sa feuille : rien à
  écrire (elles lisent `ENTREES`).
- **Adresses** : `app/back-office/reunions/{layout,page}.tsx` (titre « Réunions » sans rail, `EnTeteEntree` que
  T2b remplacera), `[id]/page.tsx`, `[id]/modifier/page.tsx`, `nouvelle/page.tsx` (`NouveauClient reunion`).
  Nouvelle aide `baseBackOffice(pour)` (`lib/navigation.ts`) : `/back-office/reunions` pour une réunion,
  `/back-office/evenements` sinon ; elle sert aux liens de `ListeGestion`, `ReunionsPrecedentes`, au retour et à
  la suppression d'`EvenementClient`, à « Gérer dans le Back-Office » de l'App, à la création (`NouveauClient`)
  et à `ModifierClient`, ainsi qu'aux lignes du widget « Prochains évènements » (une réunion y mène sous Réunions
  sans passer par la redirection). `EnTeteReunion` mène à `/back-office/reunions/<id>/modifier` et
  `/back-office/reunions/nouvelle?from=<id>`.
- **Redirections** (`router.replace`) : `/back-office/evenements/reunions` → `/back-office/reunions` ; une
  réunion ouverte sous `/back-office/evenements/<id>` → `/back-office/reunions/<id>` (et, au-delà de la spec,
  l'inverse pour un évènement ouvert sous Réunions, et de même pour `…/modifier`, pour que l'entrée active
  soit toujours la bonne) ; `/back-office/evenements/nouveau?reunion=1` → `/back-office/reunions/nouvelle`
  (`from` et `date` gardés). La redirection « qui n'a que des réunions » d'Évènements est retirée.
- **Tests** : `tests/agencement-v18-t2a.spec.ts` (23 tests, vus rouges puis verts sur les cinq projets :
  101 verts, 14 sautés car propres au grand écran ou au téléphone et à la tablette portrait).
  Réécrits avec la règle : `back-office-espace` (8 → 9 entrées, DA et référent ont Réunions),
  `barre-back-office` (feuille à 9 cases, « Plus » à 5 cartes, poignées « sur 9 », la coordination a Réunions dans
  « Plus »), `back-office-admin` (B3 : rail Évènements ·
  Scène, réunions sous `/back-office/reunions`), `halo-partout`, `evenements-2027` (adresse de la liste des
  réunions) ; `back-office-coupe` : `/back-office/reunions{,/foot,/nouvelle,/foot/modifier}` en 404.
- **Vérifié le 07/10/2026** (reprise après la coupure du 06/10) : `tsc` vert, lint sans erreur ; voisins
  (`back-office-espace`, `barre-back-office`, `back-office-admin`, `halo-partout`, `evenements-2027`, `reunions`,
  `tableau-de-bord`, `calendrier-widget`, `agencement-v18-confirmations`, `taches-evenements`) : 1 385 verts ;
  `back-office-coupe` : 184 verts.
- **Reste** : rien pour T2a. T2b (deux volets d'Évènements et de Réunions, `EnTetePage`) suit dans la même voie.
- **Timothée** : rien à publier (ni `firestore.rules` ni données : seul l'affichage du menu change) ; relire les
  deux libellés 中文 (会议, 议题、会议记录). Un membre d'un pôle sans droit d'annonces ne voit plus l'entrée
  Évènements (il n'y gérait rien) : c'est la règle B15.

### V18T2 — Évènements et Réunions en deux volets (T2b)

- 06–07/10/2026 : **T2b faite** (branche `lot/v18-t2`, commit `feat(V18T2): T2b — Évènements et Réunions en deux volets`),
  après T2a. B3 (piste A) et B4 : l'en-tête commun au-dessus de deux volets, la liste dans le layout de chaque entrée,
  la fiche dans le volet de droite (la prochaine d'office en grand, R11), « Nouvel évènement », « Nouvelle réunion »
  et « Modifier » dans le volet ; en un volet, la liste sous l'en-tête puis la fiche en page avec « ‹ Évènements » /
  « ‹ Réunions » pour seul retour (R8).
- **Fichiers** : `back-office/evenements/ListeGestion.tsx` (`VoletsGestion` : en-tête, `DeuxVolets`, la liste relue à
  chaque `EVENEMENTS_CHANGED`, la fiche ouverte d'office ; `peutCreerDans`) ; `back-office/evenements/layout.tsx`
  (en-tête de toute la section, rail Évènements · Scène, pas d'action ni de liste sur la scène) ;
  `back-office/reunions/layout.tsx` (en-tête sans rail, « + Nouvelle réunion ») ; les deux `page.tsx` ne rendent plus
  rien (la liste est dans le layout) ; `back-office/evenements/FicheGestion.tsx` (nouveau : vignette si image, badges,
  titre h2, « Voir comme un membre », « Modifier », « ⋯ » Dupliquer · Supprimer ; bandeau date, heure, lieu, public,
  contact, puis la description ; « Inscrits » : jauge, liste, Retirer, Exporter ; « Tâches » ; « Période d'inscription » :
  état, raison, réglage, QR code) ; `gestion.module.css` (nouveau : deux colonnes par requête de conteneur dès 640 px
  de volet, R15 — module CSS plutôt que `globals.css`, réservé à T7 et T8) ; `EvenementClient.tsx` (**branches
  Back-Office seulement** : la réunion en deux colonnes — sujets à gauche ; compte rendu, réunions précédentes et
  tâches à droite —, l'évènement délègue à `FicheGestion`) ; `EnTeteReunion.tsx` (h2 dans le volet, « Dupliquer pour la
  prochaine », « Modifier », « ⋯ › Supprimer » ; `EnTetePage` en un volet) ; `NouveauClient`, `ModifierClient` (720 px
  dans le volet, page avec en-tête en un volet) ; `EvenementForm` (`titreCache`, son h2 en `sr-only` quand l'en-tête de
  la page porte déjà « Nouvel évènement ») ; `Inscriptions.tsx` (`ListeInscrits` exportée) ; `lib/deuxVolets.ts`
  (`/back-office/evenements`, `/back-office/reunions`) ; cartes des réunions et des tâches d'un évènement en relief
  (`raised` au lieu de `bg-card` : `SujetsAborder`, `CompteRenduCarte`, `ReunionsPrecedentes`, `TachesEvenement`, R10).
- **Libellés** (FR et 中文, à relire) : `backOffice.passees` (« Passées » / 已结束), `backOffice.gestion.*` :
  sous-titres (会众看到的活动，以及它们的管理 ; 你所在事工组和团队的会议), « Voir comme un membre » (以成员身份查看),
  « Contact : … » (联系人：…), « Exporter » (导出), « sur n places » (共 n 个名额), « n inscrits » (n 人报名),
  « Période d'inscription » (报名时间), colonnes du CSV (姓名, 报名日期).
- **Choix faute de réponse dans la spec** : « Ajouter » (un inscrit, dessiné dans la carte Inscrits) **n'est pas
  construit** : ce serait une écriture nouvelle, contraire à R16 ; « Exporter » l'est, en CSV (`;`, UTF-8 avec BOM)
  de la liste déjà lue, sans dépendance. La liste des réunions montre « Passées » dépliées (planche) ; celle des
  évènements garde « Évènements passés (n) » repliés. Le détail « 4 sujets » des lignes de réunion n'est pas
  construit (une lecture par réunion). La fiche de gestion n'a plus la carte « membre » avec « S'inscrire » : c'est
  « Voir comme un membre ». Sans rien à venir, le volet de droite dit « Aucun évènement à gérer. » / « Aucune réunion. »
  dans une carte ; les réunions ouvrent d'office la prochaine, sinon la dernière tenue.
- **Tests** : `tests/agencement-v18-t2b.spec.ts` (23 tests, vus rouges puis verts sur les cinq projets). Réécrits avec
  la règle : `agencement-v18-t2a` (titre de la fiche en h2 dans le volet, « ‹ Réunions » en un volet, Supprimer dans
  « ⋯ »), `back-office-admin` (B3), `evenements` (Dupliquer et Supprimer dans « ⋯ », L3 et la carte de l'organisateur
  devenus la fiche de gestion), `agencement-v18-confirmations`, `taches-evenements`. Relance du 07/10/2026 (reprise
  après coupure) : `agencement-v18-t2b` 85 verts (25 passés : tests propres à un appareil) ; voisins (`t2a`,
  `confirmations`, `back-office-admin`, `evenements`, `taches-evenements`, `pages-en-grand-evenements`,
  `back-office-espace`, `reunions`, `evenements-2027`) 1 249 verts, 2 rouges attendus (ci-dessous) ;
  `back-office-coupe` vert ; `tsc` et `lint` sans erreur. La capture jetable (`agencement-v18-capture-t2b`) n'est pas
  commitée.
- **Reste** : rien pour T2b. `pages-en-grand-evenements.spec.ts:79` reste rouge (attendu, F1 → T7). P7 de la scène
  ajoute ses onglets Pâques · Noël dans `back-office/evenements/layout.tsx` (l'en-tête et la branche « scène » sont prêts).
- **Timothée** : rien à publier (ni règle ni donnée) ; relire les libellés 中文 ci-dessus.

### V18T2 — Fusion de la relecture des fondations

- 07/10/2026 : `lot/v18-fondations` relu (`fix(V18F): relecture — …`) fusionné dans `lot/v18-t2` (commit de fusion,
  puis `fix(V18T2): fusion — …`). Deux conflits, les deux intentions gardées : `back-office-coupe.spec.ts` (les
  adresses de Réunions de T2a **et** `/essai-agencement` en 404 interrupteur coupé) ; cette section « Avancement »
  (la relecture des fondations, puis T2a et T2b).
- **Correctif** : les cinq appels de `verifierAgencement` de `agencement-v18-t2b.spec.ts` donnent maintenant
  `contenu` (les deux volets, la liste seule ou la fiche en page ; sur la scène, le bloc sous l'en-tête) et `onglets`
  (Évènements et la scène : un rail, aucune pilule ; Réunions et les fiches en un volet : ni rail ni pilule), comme la
  relecture le demande à chaque tranche de pages. Aucun code du site à changer : la fenêtre qui se ferme quand la page
  change, le rail au clavier et la page d'essai coupée ne touchent pas Évènements ni Réunions.
- **Suites** (07/10/2026, après la fusion) : `agencement-v18-t2b`, `t2a`, `confirmations`, `back-office-admin`,
  `evenements`, `reunions`, `taches-evenements` sur les cinq projets et `agencement-v18-fondations` sur « ordinateur » :
  992 verts, 52 sautés (tests propres à un appareil), aucun rouge ; `back-office-coupe` (second serveur) : 187 verts,
  2 sautés ; `tsc --noEmit` et `npm run lint` sans erreur.
- **Reste** : rien pour le lot V18T2 (T2a, T2b, fusion). Après lui : T7 (App Évènements, même fichier
  `EvenementClient.tsx`) et P7 de la scène (onglets Pâques · Noël dans `back-office/evenements/layout.tsx`).
- **Timothée** : rien à publier (ni règle ni donnée).

### V18T2 — Relecture (T2a, T2b)

- 07/10/2026 : deux relectures du lot ; corrections dans `fix(V18T2): relecture — …`. **Le lot V18T2 est fini et
  relu.**
- **Corrigé** (chaque correction a son test, vu rouge puis vert) :
  - **Guide** (FR et 中文, à relire) : « Où créer un évènement » finit par « Les réunions de pôle se créent dans
    **Back-Office › Réunions › « Nouvelle réunion »** » (部门会议请在 后台 › 会议 ›「新建会议」中创建) ; dans Tâches,
    « Les réunions de pôle se créent dans **Back-Office › Réunions** » (部门会议请在 后台 › 会议中创建). Ils disaient
    Évènements, une entrée qu'un pôle sans droit d'annonces n'a plus (B15).
  - **« Exporter »** (CSV des inscrits) : un nom qui commence par `=`, `+`, `-`, `@`, une tabulation ou un retour
    chariot prend une apostrophe (le nom d'un inscrit sans compte est libre : Excel ou Sheets l'évalueraient,
    injection CSV) ; « Inscrit le » est la date de Paris (`nowIsoParis`), plus celle d'UTC (une inscription à
    00:30 tombait la veille).
  - **Widget « Prochains évènements »** : « Tout voir » mène à `/back-office/reunions` pour qui a Réunions sans
    Évènements (le widget reste permis avec l'une ou l'autre entrée, B15) ; aux Évènements sinon.
  - **Liste d'Évènements et de Réunions** (`useGestion`) : seule la dernière relecture demandée s'affiche (une
    réponse plus ancienne arrivée après n'écrase plus la liste) ; un échec réseau (hors ligne) garde la liste déjà
    là au lieu de la vider.
  - **Fiche ouverte d'office** (en grand, sur la liste) : `key={premier.id}` ; quand la prochaine change
    (suppression, date modifiée), la fiche repart de zéro (« Chargement… ») au lieu de garder l'ancienne, avec ses
    boutons, sous le nouvel `id`, et une lecture tardive de l'ancienne ne l'écrase plus.
- **Tests** : `agencement-v18-t2b` (« T2b, relecture » : l'export, la relecture hors ligne, la relecture périmée,
  la fiche d'office supprimée), `agencement-v18-t2a` (« T2a, relecture » : « Tout voir » du widget, le guide en FR
  et 中文), `evenements-2027` (le texte du guide, B3). Suites du 07/10/2026 après
  les corrections, sur les cinq projets : `agencement-v18-t2a`, `t2b`, `evenements-2027`, `tableau-de-bord`,
  `back-office-admin`, `evenements`, `reunions`, `taches-evenements`, `agencement-v18-confirmations` : 1 501 verts,
  54 sautés (tests propres à un appareil), aucun rouge ; `back-office-coupe` (second serveur) : 187 verts, 2 sautés ;
  `tsc --noEmit` et `npm run lint` sans erreur.
- **Laissés, à trancher par Timothée** :
  - **« Ajouter » un inscrit** (carte Inscrits, B3) : toujours pas construit. Les inscriptions ne s'écrivent que
    par le serveur (`firestore.rules` : `allow write: if false` sous `inscriptions`), et `/api/evenements/inscription`
    n'inscrit que soi-même, ou un nom sans compte sur un évènement qui l'accepte : inscrire quelqu'un à sa place est
    une écriture nouvelle, contraire à R16. À trancher : s'en passer (à écrire alors dans « Hors périmètre ») ou
    l'ouvrir dans un lot à part.
  - **« Nouvel évènement » propose encore les publics de réunion** (pôle, équipe) à qui en a
    (`NouveauClient.tsx:83`, comportement d'avant v18) : la fiche créée s'ouvre alors sous Réunions. Les filtrer
    (`!estReunion(p)`) toucherait la création, y compris par le raccourci du tableau de bord et le calendrier : pas
    fait sans son accord.
- **Notés, non corrigés** (hors du lot) : une réponse HTTP en erreur (5xx, 403) se lit encore comme une liste vide,
  car `runQuery` de `lib/firebase/evenements.ts` rend `[]` sur `!res.ok` (partagé par toute l'app) ; seule une
  coupure réseau garde maintenant la liste. Après une suppression, la fiche supprimée reste à l'écran le temps de
  relire la liste (une lecture), puis laisse place à la suivante.
- **Timothée** : rien à publier (ni règle ni donnée) ; relire le 中文 des deux lignes du guide ; trancher les deux
  points ci-dessus.

### V18T13 — Back-Office › Tâches (T1)

- 06/10/2026 : **T1 faite** (branche `lot/v18-t13`, commit `feat(V18T13): T1 — BO Tâches en deux volets…`), B1 et B2.
  En-tête « Tâches » (`EnTetePage`, sous-titre, `BoutonNouveau`, rail des pôles avec le compte des tâches encore à
  faire) au-dessus de `DeuxVolets` ; liste du pôle en carte (En retard en rouge · Cette semaine · Plus tard,
  « Terminées (n) » repliées) ; à droite la fiche à lire (`FicheTache`, la même que l'App, en mode Back-Office) :
  badge du pôle, titre h2, « Modifier », « ⋯ › Supprimer » (`MenuActions` + `useConfirmer`), carte d'état, carte
  d'infos (« en retard » sur l'échéance), « Note » et « Historique » côte à côte (« Commencée / Faite par … » de
  `Fois`, « Créée par … » lu par `getProfile(auteurUid)`). Adresses `/back-office/taches/[pole]/[id]` (`?date=`) et
  `/back-office/taches/[pole]/nouvelle` ; `/back-office/taches` ajouté à `SECTIONS_EN_DEUX_VOLETS`.
  En grand, « + Nouvelle tâche » et « Modifier » ouvrent `TacheForm enLigne` dans le volet (carte de 720 px au plus,
  pôle en pilules, échéance et responsable côte à côte, répétition en rail, « Annuler · Créer la tâche ») ; créer
  ouvre la fiche. Sur un volet : la liste, la fiche en page avec « ‹ Tâches », le rond « + » et la feuille.
- **Fichiers** : `app/back-office/taches/{layout,page}.tsx`, `[pole]/{layout,page}.tsx`, `[pole]/[id]/page.tsx`,
  `[pole]/nouvelle/page.tsx`, `components/taches/{FicheTache,TacheForm,SectionTaches}.tsx`,
  `components/taches/creerTache.ts` (création + prévenir le responsable, partagée par la feuille et le volet),
  `lib/taches/useTaches.ts` (`loading` suit les pôles lus : pas d'« introuvable » quand les pôles changent),
  `lib/deuxVolets.ts`, libellés `taches.*` FR et 中文.
- **Tests** : `tests/agencement-v18-taches.spec.ts` (15 tests, cinq projets : 43 verts, 27 passés exprès selon
  l'appareil ; vus rouges, 17 sur 17 sur `ordinateur` et `telephone`, sans le code). Réécrits pour la nouvelle
  disposition : `taches.spec.ts` (« Faites » → « Terminées (n) » repliées, rail au lieu du h2 du pôle, formulaire
  dans le volet en grand), `taches-evenements.spec.ts`, `back-office-admin.spec.ts` (B3 : le rail reste avec un
  seul pôle), `back-office-espace.spec.ts`, `nouveaux-membres.spec.ts`, `agencement-v18-confirmations.spec.ts`
  (la confirmation de la feuille se teste dans l'App, `/taches/da/t1` : au BO, Supprimer est dans « ⋯ »).
  Captures regardées aux cinq tailles, conformes à `v18-bo-taches` et `v18-bo-tache-nouvelle`.
- **Choix faute de réponse** : le rail des pôles reste avec un seul pôle (il porte le nom et le compte, le h2 du
  pôle n'existe plus) ; libellés courts de la répétition dans le rail (Une fois · Semaine · 2 semaines · Mois ·
  Année) pour tenir dans le volet de l'iPad paysage ; un lien direct vers `nouvelle` sur un volet ouvre la feuille
  sur une page vide (Annuler revient à la liste).
- **Reste** : rien pour T1. T3 (Calendrier) peut partir ; `TacheForm` y reste en feuille (`enLigne` facultatif).
- **Timothée** : rien à publier (aucune règle, aucune donnée) ; relire le 中文 de `taches.sousTitreBackOffice`,
  `taches.poles`, `taches.terminees`, `taches.creer`, `taches.rythmeCourt.*`, `taches.fiche.{enRetard,historique,
  creeePar,unMembre}`.

### V18T13 — Back-Office › Calendrier (T3)

- 06/10/2026 : **T3 faite** (branche `lot/v18-t13`, commit `feat(V18T13): T3 — BO Calendrier…`), B5 piste A.
  En-tête commun « Calendrier » (`EnTetePage`), « + Nouvel évènement » (`BoutonNouveau`, vers
  `/back-office/evenements/nouveau`), rail Mois · Agenda (`OngletsRail`, boutons) ; dans la rangée `apres` :
  « ‹ Octobre 2026 › » (le mois n'est plus le h1), « Aujourd'hui », filet, sources en pilules (`data-onglets="pilules"`),
  « Seulement moi ». **Agenda dès 768 px** (`AgendaSemaines`, `components/calendrier/Agenda.tsx`) : « Semaine du
  28 septembre », une ligne par jour (jour de la semaine et numéro, le jour choisi en encre), une ligne par entrée
  (trait de couleur, heure et fin, titre, détail sans l'heure, étiquette du type), sur toute la largeur moins le
  volet ; toucher un jour ou une ligne choisit le jour. **Volet du jour à droite (300 px) en agenda comme en Mois**
  (ordinateur, tablette couchée) : titre du jour, « Ajouter ce jour-là » et son menu (`AjouterCeJour` : évènement,
  tâche, réunion), une carte par entrée. Tablette debout : le jour touché (grille ou agenda) s'ouvre en feuille.
  L'agenda suit désormais le mois de la rangée (d'aujourd'hui pour le mois en cours, du 1er sinon) ; « Afficher
  novembre » reste et ‹ › le remet à zéro.
- **Fichiers** : `app/back-office/calendrier/CalendrierClient.tsx`, `components/calendrier/{Agenda,PanneauJour}.tsx`,
  `components/calendrier/apparence.ts`, `lib/calendrier/grille.ts` (`jourEtMois`, `jourDeLaSemaine`, `lundiDe`), libellés
  `calendrier.{ajouterCeJour,nouvelleReunion,semaineDu}` FR et 中文.
- **Tests** : `tests/agencement-v18-calendrier.spec.ts` (11 tests, cinq projets, vus rouges sans le code sur
  `ordinateur`, `telephone` et `tablette` : 21 échecs, puis verts). Réécrits pour la nouvelle disposition : `calendrier.spec.ts` (mois lu dans la rangée,
  `data-testid="mois-affiche"` ; rail en onglets `tab`/`aria-selected` ; agenda en grand : heure dans sa colonne,
  volet du jour présent, une ligne choisit son jour, la carte du Sheet dans le volet ; créations par le menu du
  volet ; un membre de pôle sans section a « Nouvelle réunion » et non plus « Nouvel évènement »),
  `calendrier-deplacer.spec.ts` (le chip glissé est d'abord centré à l'écran : l'en-tête descend la grille sous
  720 px), `calendrier-widget.spec.ts`, `evenements-2027.spec.ts`. Captures regardées aux cinq tailles, conformes
  à `v18-bo-calendrier-agenda-a`. Reprise du 07/10/2026 (le travail n'était pas commité) : les cinq fichiers sur
  les cinq projets, 935 verts, 80 sautés (tests propres à un appareil), 5 lenteurs sur `ordinateur-1440` en fin de
  passe, vertes à la relance ; `halo-partout.spec.ts` et `back-office-coupe.spec.ts` verts ; `tsc` et ESLint propres.
- **Choix faute de réponse** : « Ajouter ce jour-là » est un seul bouton qui ouvre le menu (la planche dessine un
  bouton et une flèche à côté, sans dire ce que fait le bouton seul) ; la réunion se crée par l'adresse
  d'aujourd'hui `/back-office/evenements/nouveau?reunion=1&date=…` (T2a, sur une autre voie, la redirige vers
  `/back-office/reunions/nouvelle` : **à l'intégration, vérifier que la redirection garde `date`**) ; « Nouvel
  évènement » (en-tête et menu) seulement pour qui a un public hors réunions, la réunion à part ; sur téléphone,
  l'action principale est le rond « Créer » (sa feuille propose évènement, tâche, réunion du jour choisi) et
  l'agenda garde ses cartes de la planche `bo-telephone-calendrier` ; les filtres passent à la ligne à droite de
  la période ; pas de surlignage de la ligne d'entrée choisie (le jour en encre suffit).
- **Reste** : rien pour T3.
- **Timothée** : rien à publier (aucune règle, aucune donnée) ; relire le 中文 de `calendrier.ajouterCeJour`
  (在这天添加), `calendrier.nouvelleReunion` (新建{{date}}的会议), `calendrier.semaineDu` ({{date}}那一周).

### V18T13 — Fusion des fondations relues

- 07/10/2026 : **`lot/v18-fondations` fusionné** dans `lot/v18-t13` (commit de fusion ; seul conflit, cette section
  Avancement : les deux textes gardés). `tsc --noEmit` et `npm run lint` sans erreur.
- **Ce que la relecture demandait aux tranches** : `verifierAgencement` reçoit maintenant `contenu` et `onglets`.
  Tâches : les volets (ou la liste seule) sur toute la zone, un rail (les pôles), aucune pilule ; la fiche en page
  sur un volet : toute la zone, ni rail ni pilule. Calendrier : le bloc sous l'en-tête sur toute la zone, un rail
  (Mois · Agenda), une rangée de pilules.
- **Corrigé** (`fix(V18T13): fusion — …`) : sur téléphone, « Tout · Seulement moi » n'était pas une rangée de
  pilules (boutons faits main, sans `data-onglets`) ; c'est maintenant `Pilules` (R5), retoucher « Seulement moi »
  revient à « Tout » comme avant ; « Sources » prend la taille des pilules qu'il suit (40 px). La feuille des
  sources porte `data-onglets="pilules"` comme la rangée des sources en grand. Vu rouge (téléphone : 0 pilule) puis
  vert ; un test du téléphone le garde (`agencement-v18-calendrier`, « Tout · Seulement moi » en pilules) ;
  captures regardées (téléphone, tablette debout).
- **Suites** (07/10/2026) : les specs du lot sur les cinq projets et leurs voisins sur `ordinateur`
  (`agencement-v18-{calendrier,taches,confirmations,fondations}`, `back-office-admin`, `back-office-espace`,
  `calendrier`, `calendrier-deplacer`, `calendrier-widget`, `evenements-2027`, `nouveaux-membres`,
  `taches-evenements`, `taches`) : 1 626 verts, 141 passés exprès (propres à un appareil), aucun échec ; les specs
  du calendrier sur `telephone` : 104 verts ; `back-office-coupe` (second serveur) et `halo-partout` : 62 verts.
- **Reste** : rien pour le lot V18T13.
- **Timothée** : rien à publier (aucune règle, aucune donnée) ; relire le 中文 de `calendrier.filtreAria`
  (显示的条目, nom du groupe « Tout · Seulement moi », lu par les lecteurs d'écran).

### V18T13 — Relecture (Tâches et Calendrier)

- 07/10/2026 : **lot fini et relu** (deux relectures ; commit `fix(V18T13): relecture — …` sur `lot/v18-t13`).
- **Corrigé** :
  - *Important* — « ⋯ › Supprimer » d'une tâche (BO) : un refus de la base (hors ligne, droit perdu) se dit
    dans la fiche (« L'enregistrement a échoué. Réessaie. », `role="status"`), la fiche reste, plus de promesse
    rejetée non rattrapée ; on ne quitte la fiche qu'une fois la tâche supprimée et la liste relue. Dans l'App,
    l'erreur remonte toujours au formulaire (`onDelete`).
  - Pendant la lecture (profil puis tâches) : ni « Aucune tâche » dans les deux volets, ni « Tu ne fais pas partie de
    ce pôle », ni compte à zéro dans le rail (le compte n'apparaît qu'une fois les tâches lues).
  - Une écriture ne relit que son pôle : `useTaches().reload(pôle)` (une requête « fois » par tâche, les autres
    pôles ne sont plus relus) — changer d'état, cocher, modifier, créer, supprimer.
  - « Modifier » : le responsable de la tâche reste affiché pendant la lecture des membres (et s'il a quitté le
    pôle) ; les profils se lisent à la première ouverture du formulaire, plus à chaque ouverture (`useMembres`).
  - Calendrier sur téléphone, en Agenda : « Créer » propose aujourd'hui, même après ‹ › (spec-calendrier, C5 ;
    le jour du 1er du mois venait de `allerA`). Le calendrier crée ses tâches par `creerTache` et lit les membres
    par `useMembres` (`components/taches/creerTache.ts`), plus de copie locale.
- **Tests** (`agencement-v18-{taches,calendrier}.spec.ts`) : 4 nouveaux tests de comportement (lecture lente
  simulée, relecture d'un seul pôle, responsable pendant la lecture des membres, suppression refusée) et
  « Créer » en Agenda sur téléphone, vus rouges (21 échecs sur les cinq projets), puis verts. Ajoutés aussi :
  `verifierAgencement` sur `/back-office/taches/<pôle>/nouvelle` (un rail de plus, la répétition, et le pôle en
  pilules : B2) avec « Annuler · Créer la tâche » en bas à droite (R13), et la barre réduite (marge de 28 px,
  toute la zone) sur la liste et la fiche des tâches, l'agenda et le Mois. Suites : les specs du lot avec
  `taches`, `taches-evenements`, `pages-en-grand-taches`, `calendrier`, `agencement-v18-confirmations` sur les
  cinq projets (704 verts, 98 passés exprès) ; `calendrier-deplacer`, `calendrier-widget`, `back-office-admin`,
  `nouveaux-membres`, `back-office-espace` sur ordinateur et téléphone (307 verts) ; `back-office-coupe`
  (second serveur) : 59 verts. `tsc --noEmit` et ESLint sans erreur.
- **Laissé, avec la raison** :
  - Les sources du calendrier en grand restent des bascules faites main (`data-onglets="pilules"`) : `Pilules`
    ne fait que le choix unique, les sources se cumulent. À reprendre si `Pilules` gagne un mode multiple.
  - « Nouvelle réunion » du volet du jour garde `/back-office/evenements/nouveau?reunion=1&date=…` : la
    redirection de T2a (`NouveauClient`, `lot/v18-t2`) garde tous les paramètres sauf `reunion`, donc `date`.
    **À l'intégration** : un test du lien après la fusion de T2a (« Nouvelle réunion le … » ouvre
    `/back-office/reunions/nouvelle?date=…` avec la date), ou pointer le lien directement vers cette adresse.
  - Écarts à la planche `v18-bo-calendrier-agenda-a`, conformes au texte de B5 : « Ajouter ce jour-là » est un
    seul bouton avec chevron (la planche : un bouton et une flèche ronde) ; la ligne d'entrée choisie n'est pas
    surlignée ; sur ordinateur et iPad debout, les filtres de sources passent sur deux ou trois rangées (la planche :
    une seule).
- **Reste** : rien pour le lot V18T13.
- **Timothée** : rien à publier (aucune règle, aucune donnée, aucun libellé nouveau). À regarder : l'agenda sur
  iPad debout (filtres sur trois rangées) et « Ajouter ce jour-là » en un seul bouton, et dire si ça te va.

### V18T5 — Back-Office : Équipes et Messages (T5)

- 06/10/2026 : **T5 faite** (branche `lot/v18-t5`, commit `feat(V18T5): T5 — Équipes et Messages`). B8 à B12.
- **Équipes › Organigramme** (B8) : `back-office/equipes/layout.tsx` retiré ; chaque page pose `EnTetePage`
  (« Équipes », sous-titre `equipes.sousTitreGestion`, rail `RailEquipes.tsx`, caché quand il n'y a qu'Organigramme).
  « Recalculer depuis l'organigramme » devient `useRecalculOrganigramme()` (`RecalculerOrganigramme.tsx`) : le
  bouton en contour dans les outils (admins ; libellé caché sur téléphone, son aide en infobulle), le résultat sous
  les pilules. `EquipesClient gestion` : le bandeau de l'App (`BandeauEquipes margePage`, à `--marge-page`),
  Équipes · Musiciens en `Pilules`, un crayon par carte (`Modifier TEAM DA`) qui ouvre `PanneauEquipe` (vaul :
  420 px à droite en grand, feuille sinon) ; l'édition ne vit plus dans la carte. La branche App ne change pas.
- **Équipes › Personnes** (B9) : `components/admin/PersonnesVolets.tsx` ; `Personnes.tsx` exporte ses morceaux
  (`useDonneesPersonnes`, `useFiltresPersonnes`, `FiltresPersonnes` en `Pilules`, `LignePersonne`,
  `FormulairePersonne`, `ListePersonnes`) et l'ancienne administration les assemble comme avant.
  `InscriptionsComptes court` : interrupteur, état, « n nouveaux comptes », « Voir les n ». `?uid=` (remplacé sans
  historique) choisit la personne ; un volet : elle se déplie sur place.
- **Messages** (B10 à B12) : `messages/layout.tsx` pose un seul `EnTetePage` pour les trois onglets.
  `ReceptionVolets` dans `DeuxVolets` ; « Supprimer » dans `MenuActions` (confirmation dans le site) ; « Le chant
  signalé » (index des chants) et « Du même membre ». `Notifier backOffice` : carte du formulaire, audience en
  deux rangées de pilules (Tout le monde, Cultes, Groupes, EDD, puis l'audience), pied « Annuler · Envoyer à n
  personnes » ; `ApercuNotification.tsx` (aperçu, `DerniersEnvois`). `SurveyResults backOffice` : deux volets
  (sommaire avec moyennes, « Par personne », lien vers la page) ; un volet : l'accordéon, la première partie ouverte.
- **Décisions prises faute de réponse** : « n en attente » de la planche = comptes créés ces sept jours (aucune
  validation de compte n'existe) ; « Voir les n » trie par récents et ouvre le plus récent. Les blocs
  d'administration restent en français seul (Q16 de U6) : Personnes, Notifier, Questionnaire ; libellés nouveaux
  en FR et 中文 pour Équipes et Réception (`equipes.sousTitreGestion`, `vue`, `modifierEquipe`, `compte.*`,
  `backOffice.reception.{sousTitreSection, chantSignale, ouvrirPartition, tonalite, sections, memeMembre,
  proposition, enAttenteCourt, traiteCourt, refuseCourt}`). Les audiences de Notifier restent celles de l'API
  (pas d'« Une équipe » ni d'« Un pôle », que la planche dessine). Pas de « ⋯ » sur la fiche d'une personne
  (aucune action à y mettre).
- **Tests** : `tests/agencement-v18-t5.spec.ts` (17 tests × 5 projets, 85 verts ; les six de Messages vus rouges sur le code
  d'avant, les autres écrits avant le code d'Équipes) ; réécrits : `back-office-admin` (rail, audience en pilules,
  carte des inscriptions), `equipes` (panneau d'édition, aide en infobulle), `pages-en-grand-reception`
  (« ⋯ › Supprimer »), `evenements` (carte des inscriptions). Captures regardées aux cinq tailles.
- **Reste** : rien pour T5. Hors périmètre (spec) : « Joué n fois », « Setlist citée », « Pôles calculés le … ».
- **Timothée** : rien à publier (ni règle ni donnée) ; relire les libellés 中文 ci-dessus.
- 07/10/2026 : **fusion de `lot/v18-fondations`** (relecture V18F comprise) dans `lot/v18-t5` : un seul conflit, dans
  ce fichier (les deux sections d'avancement gardées). Correctif `fix(V18T5): fusion — …` : les appels de
  `verifierAgencement` de `agencement-v18-t5.spec.ts` donnent `contenu` (le bandeau sur Organigramme ; le bloc sous
  l'en-tête sur Personnes, Réception, Notifier, Questionnaire) et `onglets` (un rail partout ; une rangée de
  pilules sur Organigramme, Personnes, Réception et Notifier, aucune sur Questionnaire). Sur tablette portrait,
  Réception n'a pas de filtres (les deux cartes côte à côte, choix de U4 bis gardé) : zéro pilule attendue là.
  Aucun code du site changé par la fusion.
- **Suites après la fusion** : `agencement-v18-t5`, `back-office-admin`, `equipes`, `pages-en-grand-reception`
  (cinq projets) et le test « annonces retirées » d'`evenements` : 404 verts, 31 sautés (propres à un appareil) ;
  `back-office-coupe` (second serveur) vert ; `tsc --noEmit` et `npm run lint` sans erreur.
- **Reste** : rien pour T5. **Timothée** : rien à publier ; relire les libellés 中文 ci-dessus.
- 07/10/2026 : **relecture de T5** (deux relectures, quinze constats), commit `fix(V18T5): relecture — …`.
  **Lot fini et relu.** Corrigé, chaque fois avec un test vu rouge puis vert :
  - **Personnes en deux volets** : « Modifier » fixe la personne dans l'adresse (`?uid=`). Sans elle, la
    personne choisie était la première de la liste filtrée : chercher ou trier remontait le formulaire, et ses
    droits, sur une autre personne. Les lignes sont courtes (`LignePersonne compact` : avatar, nom, services,
    sans e-mail ni date) et les filtres se replient sur plusieurs lignes dans la colonne de 400 px.
  - **Derniers envois** (Notifier) : `getEnvoisManuels` ne demande à Firestore que les envois manuels
    (`kind == "manual"`, une égalité sans tri, donc sans index composite), triés dans le navigateur. Avant,
    on lisait les 50 dernières notifications et on gardait les manuelles : cinquante rappels cachaient un
    envoi plus ancien, et chaque ouverture coûtait 50 lectures. Une lecture refusée affiche « Impossible de
    lire les derniers envois » au lieu de « aucune ».
  - **Confirmations dans le site** : supprimer une réponse au questionnaire (« Par personne »), et
    « Recalculer depuis l'organigramme », dont la fenêtre porte l'aide (sur téléphone, le bouton n'est
    qu'une icône et l'infobulle n'existe pas au toucher).
  - **En-têtes** : le sous-titre d'Organigramme porte l'année en cours (`{{annee}}`, FR et 中文). Le rail
    d'Équipes n'est posé que pour un admin, sans bloc vide pour les autres. Le sous-titre de Messages n'est
    posé que si Réception l'est (un compte qui peut seulement notifier n'a pas de sous-titre).
  - **Accessibilité** : le panneau d'édition d'une équipe est décrit par son sous-titre (`DrawerDescription`),
    sans l'avertissement de Radix. L'interrupteur des inscriptions a un nom fixe, « Inscriptions ouvertes » :
    il annonce lui-même son état.
  - **Libellés et imports** : le pied de Notifier dit « Envoyer à n personnes » aussi pour « Tout le monde ».
    `ReceptionVolets` importe `Pilules` de `layout/Onglets` (le relais `harmonie/Pilules` peut partir à Z).
  - **Captures** : le Questionnaire est aussi capturé avec trois réponses et « Impression générale » ouverte
    (moyenne, barres), aux cinq tailles. Vu en les comparant à la planche : la moyenne d'une question
    s'écrivait « 4.0 » à côté du « 3,9 » de la partie ; elle s'écrit « 4,0 » (aussi dans l'ancienne
    administration, qui partage la carte).
  - **Suites** : `agencement-v18-t5`, `back-office-admin`, `equipes`, `pages-en-grand-reception`, `evenements`
    (cinq tailles), `halo-partout`, `barre-back-office`, `tableau-de-bord` (ordinateur) : 743 verts, 61 sautés
    (propres à un appareil) ; `back-office-coupe` (second serveur) : 59 verts ; `tsc --noEmit` et
    `npm run lint` sans erreur (51 avertissements, les mêmes qu'avant).
  - **Laissé** : le badge des inscriptions dit « n nouveaux comptes » et « Voir les n » (ou « Voir le
    compte ») ; la planche dit « n comptes à valider », la spec « n en attente ». Aucune validation de compte
    n'existe : ce sont les comptes créés ces sept jours. Le libellé reste tel quel, à confirmer par Timothée.
- **Reste** : rien pour T5.
- **Timothée** : rien à publier (ni règle Firestore ni index : la requête des derniers envois n'en demande
  pas). Relire les libellés 中文 : `equipes.recalcul.question` (按组织架构重新计算？), `equipes.recalcul.action`
  (重新计算), `equipes.sousTitreGestion` (avec l'année). Choisir le libellé du badge des inscriptions :
  « n nouveaux comptes » (actuel) ou « n en attente » (spec).
