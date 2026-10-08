# Spec — chants de Noël et de Pâques (lot 4 du chantier « équipes et groupes »)

Lot 4 du chantier « équipes et groupes » (`docs/chantier-equipes-groupes/README.md`) : sur la page d'une fête, l'ordre
de passage porte les chants (dans des setlists), les musiques et les danses de chaque passage, pour la régie et les
musiciens ; les setlists de fête se rangent sous deux catégories nouvelles, **Noël** et **Pâques**.

- **Origine** : premier retour des responsables après le document des nouveautés (« un endroit pour les chants,
  musiques et danses des fêtes, pour la régie et les musiciens »). Décisions 27 à 34 du grill du 08/10/2026, puis
  réponses de Timothée aux questions de cette spec (décisions 35, 37, 38, 39, 45 et 46, le soir du 08/10/2026).
- **Date** : 08/10/2026. **Statut : spec écrite, questions tranchées le 08/10/2026 (décisions 35 à 46), attend le go de
  Timothée.** Rien n'est codé.
- **Base de code** : `ui/apple-design` à `5878ce1`. Le code n'a pas changé depuis `439e552` (base de la cartographie) :
  seuls des documents ont bougé. Toutes les lignes citées ont été relues à `5878ce1` ; le code est encore le même à
  `ceeb9b2`, où les références ajoutées avec les réponses de Timothée ont été relues.
- **Sources** : `docs/chantier-equipes-groupes/decisions.md` (source de vérité, § « Lot 4 », décisions 27 à 34, et
  § « Réponses de Timothée aux questions des specs », décisions 35 à 46), `cartographie.md`
  (§ « Chants, musiques et danses de la scène », références revérifiées ici), `maquettes.md` et les planches
  `maquettes/v19-fete-*.png`.
- **Ordre du code** (décidé) : lots 1 et 3 en parallèle, avec eux le **partage d'une setlist**
  (`docs/spec-partage-setlist.md`, codé avant ce lot, décision 45), puis le lot 2, **puis ce lot 4**, qui lit :
  - le droit **`coordination`** du lot 1 (`docs/spec-equipes-sans-poles.md`, EQ24-EQ25 : `isCoordination` lit le booléen
    du profil) et l'appartenance aux équipes TEAM LOUANGE, TEAM EDD et TEAM RÉGIE (`dansEquipes` ; ids `louange`, `edd`,
    `regie` de `src/lib/equipes/table.ts`) ;
  - les **président, VP et rôles** des groupes du lot 2 (`docs/spec-organigrammes-groupes.md` : documents `groupes/{id}`,
    `groupeDe`, rôles reliés à une colonne du planning, case **« Saisir les chants des fêtes »** d'un rôle,
    `droits.saisirFetes`, OG13). Cette spec y renvoie sans en fixer le détail ;
  - le champ **`editeurs`** des setlists et la séparation de `canDeleteSetlist` et `canEditSetlist`, posés par le partage
    (§ « Setlist de fête » du modèle ci-dessous).
- **Vocabulaire** (correction de Timothée) : Noël et Pâques sont des **évènements** (les fêtes) ; la scène n'est que le
  **lieu** réservé. On dit « chants de Noël », « setlist de fête », jamais « chants de la scène ».
- **Règles communes** : tout se fait sur `ui/apple-design` ; tests Playwright écrits avant le code et vus rouges, trois
  appareils toujours, cinq projets pour l'agencement ; FR et 中文 pour tout libellé nouveau (中文 relu par Timothée) ; tout
  ce lot est derrière `BACK_OFFICE` (`src/lib/backOffice.ts:5`) ; droits en double (`src/lib/access.ts` et
  `firestore.rules`), règles publiées à la main par Timothée ; aucune session ne lit la vraie base (tout se simule,
  `tests/helpers/fakeSession.ts`) ; aucun nom réel de membre (noms fictifs des planches : Ruth K., Léa M., Mei Z.…).

## Décisions du lot (`decisions.md`, § « Lot 4 », reprises telles quelles)

| # | Décision |
|---|---|
| 27 | Sur la page d'une fête, l'**ordre de passage** est la source : piste **A**, chaque passage porte ses chants (tonalité), ses musiques et danses (lien, durée et départ facultatifs, note pour la régie). Filtre « Tous · Le mien » au-dessus. |
| 28 | **Une setlist par « Qui »** (chaque groupe, chaque classe) : « Noël 2026 · Gp Paix », titre du passage en sous-titre. Les sketches et les danses peuvent réunir plusieurs classes ou groupes (passage à plusieurs « Qui ») ; un passage sans chant n'a pas de setlist (signalé en bas de liste). |
| 29 | **« Saisir les chants »** ouvre directement l'**éditeur de setlist** (structure, tonalité, notes, comme pour un culte). **Pas de carte « Musiques et danses » dans l'éditeur** : musiques et danses restent sur la ligne de l'ordre de passage. L'ordre des passages ne se change que dans l'ordre de passage. |
| 30 | **Qui saisit** : passage d'un groupe → son président, son VP et ses musiciens ; passage d'une classe d'EDD → les louangeurs d'après le **planning EDD** (présidence, suppléant, piano, cajon : un suppléant peut passer en présidence) ; passage « Culte Francophone » → TEAM LOUANGE ; la coordination partout. |
| 31 | Un chant hors du répertoire passe d'abord par **« Proposer un nouveau chant »** ; le passage peut pointer vers la proposition en attente, puis bascule tout seul vers le chant une fois au répertoire. |
| 32 | **Setlists** : nouvelles catégories **Noël** et **Pâques** dans le filtre des catégories (piste **A**, sous « Fêtes ») ; visibles de **tout connecté** ; ouvertes aussi depuis la page de la fête ; **coupées en ligne** (derrière `BACK_OFFICE`) jusqu'à la mise en ligne des Évènements. |
| 33 | **Couleurs** : Noël rouge ou vert (à proposer), Pâques au choix (à proposer) ; validation de Timothée (`serviceColors.ts` gelé). |
| 34 | **Liste « Qui »** (fixe pour ce lot) : Gp Paix, Gp Fidélité, Gp Bonté, Gp Amour, Gp Joie ; **Culte Francophone** (l'ancien « Franco ») ; EDD 小班, 中班, 大班, 高班. Retirés : 敬拜团, Jeunes, Chorale. |

Dans la suite, « décision 27 » à « décision 34 » désignent ces décisions, « décision 35 » à « décision 45 » les réponses
de Timothée (§ « Réponses de Timothée » ci-dessous) ; une décision d'une autre spec est citée avec
son fichier (« Q16 de `spec-scene-paques-noel.md` », « D20 de `spec-retouches-v18.md` »). Une règle marquée
**choix** est déduite des décisions (lecture la plus simple) et n'est pas une décision de Timothée.

### Planches retenues (`docs/chantier-equipes-groupes/maquettes/`)

| Planche | Sert à |
|---|---|
| `v19-fete-a-ordinateur.png`, `v19-fete-a-ipad-paysage.png`, `v19-fete-a-telephone.png` | Page de la fête, piste **A** (décision 27) : les chants **dans** l'ordre de passage, « Tous · Le mien », « Saisir les chants » sur le mien, « Setlist » sur les autres, « Pas de chant », « proposition en attente » |
| `v19-fete-musique-telephone.png` | Feuille « Musique ou danse » : type, titre, lien, durée et départ facultatifs, note pour la régie |
| `v19-fete-proposer-telephone.png` | « Proposer « Douce nuit » » : la proposition, en attente dans le passage (décision 31) — **contenu** repris dans la bibliothèque de l'éditeur (CF20) |
| `v19-fete-setlists-a-ordinateur.png`, `v19-fete-setlists-a-telephone.png` | Setlists, piste **A** (décision 32) : Noël et Pâques sous « Fêtes » dans le filtre des catégories, la liste dans l'ordre de passage |
| `v19-fete-setlist-ipad-paysage.png`, `v19-fete-setlist-telephone.png` | La setlist d'un passage : chants, « Musiques et danses » pour la régie (en lecture), passages voisins, lien vers la page de la fête |

**Écartées** : `v19-fete-b-ordinateur.png` (section « Chants de Noël 2026 » à part, piste B), `v19-fete-setlists-b-*.png`
(onglets Services · Noël · Pâques, piste B).

**Écarts entre les planches, les décisions et cette spec** (à signaler à Timothée, rien à trancher ; le 3 est tranché par la décision 37) :

1. `v19-fete-saisie-ordinateur.png` et `v19-fete-saisie-telephone.png` dessinent un **formulaire de saisie propre** au
   passage, avec une carte « Musiques et danses ». La **décision 29 l'emporte** : « Saisir les chants » ouvre l'éditeur de
   setlist existant, **sans** carte « Musiques et danses » ; musiques et danses se tiennent sur la ligne du passage (page
   de la fête, feuille `v19-fete-musique-telephone`). Seul élément repris de ces planches : « Proposer « … » » quand la
   recherche ne trouve rien (CF20). Leurs lignes d'aide (« Tu saisis ce passage comme … ») ne sont pas reprises.
2. `v19-fete-musique-telephone.png` n'écrit pas « facultatif » sous **Lien** ; la **décision 27** le dit facultatif : il l'est.
3. `v19-fete-a-*` et `v19-fete-setlists-a-*` montrent pour le passage 6, un spectacle de deux classes (EDD 大班 et 高班),
   un chant et une setlist « Noël 2026 · EDD 大班 · 高班 ». **Écarté par la décision 37** : un passage à plusieurs « Qui »
   est une danse ou un sketch, sans chants ni setlist ; il n'a pas de « Saisir les chants », ses musiques et danses
   restent sur sa ligne, et il paraît dans « Sans chant » (CF10, CF13, CF16).
4. `v19-fete-a-telephone.png` résume « Mes réservations » et « Entraînements » en deux lignes et pose l'ordre de passage
   dessous ; le code d'aujourd'hui (P5 de `spec-scene-paques-noel.md`) garde les semaines sur la page et ouvre l'ordre en
   page (`?vue=ordre`). Ce lot ne touche pas aux réservations : l'ordre de passage reste en page sur téléphone (décision 45, Q11).
5. `v19-fete-setlists-a-telephone.png` dessine un menu maison (« Groupes », « EDD » regroupés, nombre de setlists par
   catégorie) ; D19 de `spec-retouches-v18.md` garde le **menu déroulant** natif : on y ajoute le groupe « Fêtes » (CF13).

## Réponses de Timothée (08/10/2026, soir)

Réponses aux questions de cette spec, écrites dans `decisions.md` (§ « Réponses de Timothée aux questions des specs »).
Elles l'emportent sur les recommandations ; les règles ci-dessous les suivent.

| # | Question de la spec | Réponse |
|---|---|---|
| 35 | Q2 — « Ses musiciens » (décision 30) : faut-il une case de droit « Saisit les chants des fêtes » sur un rôle de groupe ? | **Oui** : le lot 2 l'ajoute aux droits d'un rôle (« Saisir les chants des fêtes », `droits.saisirFetes`, OG13 de `spec-organigrammes-groupes.md`), avec Remplir, Publier et Notifier. Saisissent les chants d'un passage de groupe : son président, ses VP, ses musiciens **et** les titulaires des rôles qui ont la case ; Amour et Joie : président, VP et rôles cochés. → CF16 |
| 37 | Q1 — Une setlist par « Qui » ou par passage ? | **Par « Qui »** (décision 28) : « ce n'est pas des chants mais c'est les danses et les sketchs ». Un passage à plusieurs « Qui » est une danse ou un sketch : pas de chants, donc pas de setlist. → CF10, CF16, écart 3 |
| 38 | Q13 — Couleurs de Noël et de Pâques (question commune, Q9 du lot 2) | **D'accord** : une seule planche avec les huit candidates (Amour, Joie, Noël, Pâques) ; Joie et Noël ne prennent pas ensemble le jade et le vert sapin ; Timothée choisit sur la planche. → CF26 |
| 47 | Les couleurs choisies sur la planche | **Noël vert sapin `#17633f`, Pâques violet `#7c3aed`** (Amour fuchsia et Joie sarcelle : lot 2). → CF26, tranche CF-G |
| 39 | Q8 — Un seul champ avec le partage ? (Q1 et Q10 du partage) | **Voir et modifier** ; la liste des personnes ne change que par le propriétaire de la setlist et les admins. Avec « voir et modifier », les deux listes seraient toujours identiques : **un seul champ `editeurs`** (choix de cette spec et de celle du partage). → modèle, droits en double |
| 45 | Q3 — Qui saisit pour EDD 小班 ? | Recommandation acceptée : les membres de **TEAM EDD** (`dansEquipes` ∋ `edd`), en plus de la coordination. → CF16 |
| 45 | Q4 — Quels dimanches du planning EDD ? | Recommandation acceptée : tous les dimanches de la période EDD qui contient le jour J, de l'année du jour J. → CF16 |
| 45 | Q5 — La liste « Qui » vaut-elle aussi pour les réservations ? | Recommandation acceptée : **oui**, une seule liste. → CF3, CF4 |
| 45 | Q6 — « Franco » devient « Culte Francophone » : libellé ou données ? | Recommandation acceptée : **libellé seulement**. → CF5 |
| 45 | Q7 — La régie hors planning | Recommandation acceptée, (a) : **TEAM RÉGIE** (`dansEquipes` ∋ `regie`) pose le lien de présentation d'une setlist de fête, par une exception dans `/api/setlist/presentation` ; le rôle Régie de l'équipe d'une setlist partagée (V5 du partage) n'est pas retenu. → CF27 |
| 45 | Q9 — Jusqu'à quand saisir ? | Recommandation acceptée : **jusqu'au jour J compris**. → CF17, CF23 |
| 45 | Q10 — La présidence de séance d'un groupe saisit-elle ? | Recommandation acceptée : **non**. → CF16 |
| 45 | Q11 — Résumé « Mes réservations · Entraînements » sur téléphone ? | Recommandation acceptée : **pas dans ce lot**. → CF9, écart 4 |
| 45 | Q12 — Bascule d'une proposition | Recommandation acceptée : la directive **`{proposition: <id>}`** dans le `.cho`. → CF21 |
| 45 | Q14 — Setlists de fête dans « Prochaines setlists » de Chants ? | Recommandation acceptée : **non**. → CF25 |
| 46 | Q15 — Musiques et danses d'un passage à plusieurs Qui : qui les tient ? | **Lecture (a)** : les ayants droit de chacun de ses Qui, plus la coordination ; le passage est « le mien » pour eux. → CF16, CF23 |

## Ce que le code fait aujourd'hui (`5878ce1`)

| Sujet | Aujourd'hui | Où |
|---|---|---|
| Une ligne de l'ordre de passage | `Passage = { quoi, qui[], titre }`, **sans identifiant**, sans chant, lien ni note ; `Programme.passages` est un tableau du document, réécrit en entier. | `src/types/programme.ts:30-35`, `:47` |
| Listes Quoi et Qui | `QUOI` (Séance louange, Chant, Danse, Sketch, Spectacle) ; `QUI` = EDD 小班/中班/大班/高班, Gp Bonté/Fidélité/Paix/Amour/Joie, **Franco**, **敬拜团**, **Jeunes**, **Chorale**. | `src/types/programme.ts:5-17` |
| Familles de « Qui peut réserver » | groupes, edd, **jeunes**, louange (`Franco`, `敬拜团`), **chorale** ; `quiPermis` range les groupes par famille. | `src/lib/scene/saison.ts:261-277` |
| Qui → catégorie (rappels des entraînements) | `QUI_CATEGORY` : Franco → Culte Francophone, EDD 中/大/高班, Gp Paix/Fidélité/Bonté. Sans catégorie : EDD 小班, Gp Amour, Gp Joie, 敬拜团, Jeunes, Chorale. | `src/lib/scene/rappels.ts:12-20` |
| Écran de l'ordre de passage | `OrdrePassage` : formulaire (titre ≤ 80, Quoi, `QuiChecklist`), ligne (numéro, titre, pastilles), glisser-déposer ; les ids de tri sont `passage-${i}` (l'indice, pas un identifiant). | `src/app/evenements/scene/OrdrePassage.tsx:24-63`, `:65-93`, `:95-163` (`:105`) ; `src/app/evenements/scene/CreneauForm.tsx:38-58` |
| Qui écrit l'ordre de passage | Back-Office, jusqu'au jour J compris (Q16 de `spec-scene-paques-noel.md`) ; l'App le lit pour tous (`canEdit={false}`). Règles : lecture `signedIn()`, écriture `isCoordination()`. | `src/app/back-office/evenements/scene/FeteGestion.tsx:114`, `:435-440` ; `src/app/evenements/scene/FeteClient.tsx:228-238` (`:236`) ; `firestore.rules:165-167` |
| Ordre de passage protégé (D20 de `spec-retouches-v18.md`) | L'écriture porte la précondition `currentDocument.updateTime` ; refus → `ModifieEntreTemps` avec le prénom de `modifiePar`. | `src/lib/firebase/programmes.ts:19-25`, `:103-121`, `:176-187` ; `src/types/programme.ts:67-70` ; `tests/retouches-v18-ordre.spec.ts` |
| Entrée de l'ordre de passage (App) | « Ordre de passage du jour J » + « jeudi 24 décembre · 9 numéros » ; en grand à droite, en page sur téléphone (`?vue=ordre`). | `src/app/evenements/scene/FeteClient.tsx:198-217` |
| Édition d'une fête | `programmes/{fete}-{annee}` (`idEdition`), titre calculé « Noël 2026 » / « 圣诞节 2026 ». | `src/lib/scene/fetes.ts:51-53`, `:155-162` |
| Interrupteur | Toute la section Évènements (fête comprise) répond 404 sans `BACK_OFFICE`. | `src/app/evenements/layout.tsx:11` ; `tests/back-office-coupe.spec.ts:67` |
| Catégories de setlist | `RESTRICTED_CATEGORIES` = `SERVICE_LIEUX` (Culte Francophone, Intergroupe, Interfranco, Campus) ; `FREE_CATEGORIES` = Groupe Paix, Fidélité, Bonté, 中班, 大班, 高班 ; `ALL_CATEGORIES` = les deux. Ni Noël ni Pâques. | `src/lib/firebase/setlists.ts:7-19` ; `src/types/user.ts:18-23` |
| Document setlist | `FSSetlist` : title, leader, category, date, language, notes, moment, items, isDraft, isPrivate, ownerId, presentationUrl. Rien ne la relie à une fête. | `src/lib/firebase/setlists.ts:23-42` |
| Ligne de setlist | `SetlistItem` : `songSlug` obligatoire ; seul autre type : `transition` (texte libre). | `src/types/setList.ts:41-79` |
| Lecture des setlists | `getSetlists`, `getSetlistsFrom`, `getSetlistsDepuis`, `getSetlistsSince`, `getMySetlists`, `getSetlist` : tout passe par ce fichier. | `src/lib/firebase/setlists.ts:137`, `:163`, `:191`, `:217`, `:253`, `:286` |
| Voir une setlist | `canSeeSetlist` : propriétaire ; privée → non ; admin ; sinon la catégorie doit être dans `serviceRoles`. Règles : **lecture `signedIn()` pour toutes** (le filtre est côté client, choix assumé de `CLAUDE.md`). | `src/lib/access.ts:409-411`, `:440-449` ; `firestore.rules:303` |
| Modifier, supprimer | `canEditSetlist` : propriétaire ; privée → non ; admin ; musicien ou présidence de la catégorie. `canDeleteSetlist = canEditSetlist`. Règles : `canEditSetlistDoc`, `isEditorOf`, suppression = modification (vérifié par `tests/coherence.spec.ts`). | `src/lib/access.ts:402-407`, `:471-487` ; `firestore.rules:69-72`, `:305-322`, `:353-357` |
| Créer, dupliquer | Création : `ownerId` = soi (règles) ; catégories proposées = `creatableCategories`. Duplication : catégorie créable. | `firestore.rules:305-306` ; `src/lib/access.ts:414-438` ; `src/components/setlists/SetlistForm.tsx:510-522` |
| Liste Setlists | Visibles = catégories de `serviceRoles` (toutes pour un admin) ; filtre par catégorie dans un `<select>` à deux groupes (« Réunions principales », « Groupes »). | `src/app/setlists/page.tsx:96-100`, `:120-140`, `:376-394` |
| Éditeur | `SetlistForm` (puces catégorie, date, partagée/privée dans `EnTeteEditeur`) ; à la sortie ou à la publication, `notifySetlistReady` prévient l'équipe du planning si la setlist n'est pas privée. Accès : `canEditSetlist`. | `src/components/setlists/SetlistForm.tsx:109-113`, `:395-401`, `:494-500` ; `src/components/setlists/editeur/EnTeteEditeur.tsx:218-240` ; `src/app/setlists/[id]/edit/EditSetlistClient.tsx:70` |
| Page d'une setlist | `canSeeSetlist` puis `canEditSetlist` ; rendus Liste et Partitions (une transition y est une ligne à part). | `src/app/setlists/[id]/SetlistDetailClient.tsx:1286`, `:1296` ; `src/app/setlists/[id]/_components/ListView.tsx:110-114`, `:350-372` ; `src/app/setlists/[id]/_components/PartitionView.tsx:136-139` |
| Notification « setlist prête » | Destinataires : l'équipe du planning de la catégorie à la date ; auteur = propriétaire, admin ou exécutant de la catégorie. | `src/app/api/push/notify-setlist/route.ts:52`, `:86-101`, `:121-135` |
| Lien de présentation (régie) | Route Admin SDK : qui peut modifier la setlist, ou la régie **inscrite au planning ce jour-là** (`isOnDutyRegie` lit le planning par catégorie et date). | `src/app/api/setlist/presentation/route.ts:84-104` ; `src/lib/setlist/presentationLink.ts:22-39` ; `src/lib/access.ts:456-463` |
| « Proposer un chant » | **Existe** : bouton de Chants (`songs.list.proposer`, 推荐新诗歌), tiroir titre + lien YouTube (obligatoire) + lien PDF (facultatif) → `songProposals/{id}` (`status: "pending"`). Lecture admins seuls ; un admin la marque « Traité » ou « Refusé » dans Réception. Rien ne relie une proposition au chant ajouté ensuite. « Ajouter un chant » (partition déposée) reste mis de côté. | `src/components/songs/SongProposalDrawer.tsx:24-89` ; `src/lib/firebase/songProposals.ts:46-79` ; `src/types/songProposal.ts:1-18` ; `firestore.rules:272-283` ; `src/components/admin/Reception.tsx:33-38` ; `docs/spec-ajouter-un-chant.md` (statut : mise de côté) |
| Métadonnées d'un `.cho` | Le parseur lit les directives d'en-tête (ex. `recommended_key`) ; `loadSongs` les passe à l'index (`public/songs-index.json`, construit au build). | `src/lib/chordpro/parser.ts:357-358` ; `src/lib/content/loadSongs.ts:54` ; `scripts/build-index.ts:9-27` |
| Planning EDD | Une grille par classe **中班, 大班, 高班** seulement (pas de 小班) : présidence, suppléant, piano, cajon, guitare, cours ; par période de deux mois (`EDD_PERIODES`). Lecture serveur : `loadPlanningData` ; correspondance colonnes → rôles : `EDD_ROLE_MAP` (le suppléant n'y a **aucun** rôle). Le tableau `edd` est rangé **par période seulement**, toutes années mêlées (`periodeEdd`), en lignes `[date, présidence, suppléant, piano, cajon, guitare, cours]` ; le planning EDD **n'est pas publiable** par trimestre (`PUBLISHABLE_PLANNINGS` : culte et groupes) : `sansBrouillon` ne le touche pas. | `src/lib/planning/grilles.ts:212-226` ; `src/lib/planning/utils.ts:4-6` ; `src/lib/planning/names.ts:32-59`, `:235` ; `src/lib/planning/sheets.ts:280-295` ; `src/lib/planning/releases.ts:29-34` |
| Plannings des groupes | Paix et Bonté : `presidence`, `musiciens`, `orateur`, `theme`, `percussion` ; Fidélité : `presidence`, `orateur`, `theme`, `pianiste`, `guitariste`, `batterie`. | `src/lib/planning/grilles.ts:151-187` |
| Groupes d'une personne | `serviceRoles` (« Groupe Paix » → présidence, musicien) ; le lot 2 ajoute `groupes/{id}` (président, VP, rôles, titulaires) et `groupeDe`. | `src/types/user.ts:29` ; `src/components/auth/ProfileFields.tsx:119-127` ; `docs/spec-organigrammes-groupes.md` (modèle, OG2, OG12, OG19) |
| Coordination | Aujourd'hui `'evenement' in poles` ; après le lot 1, booléen `coordination` coché par un admin (EQ24). | `src/lib/access.ts:73-78` ; `firestore.rules:139-141` ; `docs/spec-equipes-sans-poles.md` (EQ24-EQ25) |
| Couleurs | `PLANNING_COLORS` et `CATEGORY_COLORS` gelés ; catégorie inconnue = gris `#64748b`. | `src/lib/serviceColors.ts:7-38` |

## Modèle de données

### Passage (`src/types/programme.ts`)

```ts
export interface Passage {
  /** Nouveau (CF1) : identifiant stable, 8 caractères [a-z0-9] tirés au hasard ; absent dans un passage d'avant ce lot. */
  id?: string;
  quoi: string;
  qui: string[];          // une ou plusieurs valeurs de QUI (décision 28) ; plusieurs = danse ou sketch, sans chants (décision 37)
  titre: string;
  /** Nouveau (décision 27) : musiques et danses du passage, pour la régie. Absent = aucune. */
  medias?: MediaPassage[];
}

export interface MediaPassage {
  id: string;             // tiré au hasard à l'ajout
  type: "musique" | "danse";
  titre: string;          // obligatoire, 80 caractères au plus
  lien: string;           // https, "" = sans (facultatif)
  duree: string;          // « m:ss », "" = sans (facultatif)
  depart: string;         // « m:ss », "" = sans (facultatif)
  note: string;           // pour la régie, 200 caractères au plus, "" = sans
}
```

Les **chants** d'un passage ne sont **pas** recopiés dans le programme : ils vivent dans la setlist du passage (décision 29)
et la page de la fête les lit là (CF6). Un seul endroit par donnée : rien à synchroniser. **Choix.** Seul un passage à un
seul Qui a des chants et une setlist (décision 37) ; un passage à plusieurs Qui n'a que ses `medias`.

### Setlist de fête (`src/lib/firebase/setlists.ts`, `FSSetlist`)

| Champ | Nouveau ? | Valeur pour une setlist de fête |
|---|---|---|
| `fete` | nouveau, facultatif | `{ programme: string; passage: string; qui: string }` : l'édition (`programmes/{id}`), l'id du passage, son **seul** « Qui » à la dernière saisie (décision 37 : une setlist par Qui, un passage à plusieurs Qui n'a pas de setlist). Absent = setlist ordinaire. Écrit par le serveur seul. |
| `editeurs` | posé par le partage (PS1 de `docs/spec-partage-setlist.md`), facultatif | uids des ayants droit du Qui du passage (décisions 30 et 35, CF16), **recopiés par le serveur seul** (CF17-CF18). Absent = `[]`. |
| `category` | existant | `"Noël"` ou `"Pâques"` |
| `date` | existant | le jour J de l'édition |
| `title` | existant | « Noël 2026 · Gp Paix » (CF10), en français : sert à la recherche, au PDF, aux notifications |
| `leader` | existant | nom de planning (sinon prénom et initiale) de qui a créé la setlist ; modifiable dans l'éditeur |
| `ownerId` | existant | `null` : une setlist de fête appartient au passage, à personne (**choix**) |
| `isPrivate`, `isDraft` | existants | `false` toujours |
| `items` ; `createdAt`, `language`, `notes` | existants | `items` : les chants ; une proposition en attente est un élément `type: "proposition"` (CF20). À la création par le serveur : `createdAt` = horodatage serveur (**obligatoire** : `getSetlists` trie sur `createdAt`, une setlist qui n'en a pas n'y paraît jamais), `language: "fr"` (recalculée au premier enregistrement de l'éditeur), `notes: ""` ; `moment` absent |

**Identifiant** : `setlists/{programme}-{passage}` (ex. `noel-2026-k3f9x2ab`), tiré de l'édition et du passage : la
création est idempotente, deux « Saisir » simultanés ne font pas deux setlists. **Choix.** Lien avec la décision 37 :
seul un passage à **un** Qui a une setlist, donc « une setlist par Qui » ; dans le cas rare d'un même Qui qui chante dans
deux passages, chacun a la sienne, de même titre, le titre du passage en sous-titre (CF10, **choix** : le plus simple et
fidèle au « titre du passage en sous-titre » de la décision 28).

**Un seul champ `editeurs` pour la fête et le partage** (décision 39, état commun avec `docs/spec-partage-setlist.md`) :
- `FSSetlist` gagne `editeurs?: string[]` (uids), **un seul champ pour les deux usages** ; le champ `partageAvec` que
  proposait la spec du partage disparaît : avec « voir et modifier » (décision 39), les deux listes seraient toujours
  identiques (**choix** des deux specs) ;
- setlist de fête (ce lot) : `editeurs` est écrit par le **serveur seul** (recopie des ayants droit des décisions 30 et 35,
  CF17-CF18) ;
- setlist ordinaire (partage) : `editeurs` = « l'équipe » choisie dans l'éditeur ; écrit à la création par son créateur,
  ensuite par le propriétaire ou un admin seulement (décision 39) ; les règles l'imposent ;
- un uid de `editeurs` **voit** la setlist (même privée) et la **modifie** (contenu, chants, notes…) ; il ne la supprime
  pas et ne change ni `editeurs`, ni le rôle des personnes de l'équipe (`rolesPartage`), ni `isPrivate`, ni `ownerId` (**choix** commun aux
  deux specs). `canDeleteSetlist` n'est donc plus égal à `canEditSetlist`, ni `allow delete` à la modification
  (§ « Droits en double ») ;
- `firestore.rules` change donc pour les setlists : à publier par Timothée, après la bascule du lot 1 ou dans la même
  séance (§ « À la mise en ligne »).

### Élément « proposition » (`src/types/setList.ts`, `SetlistItem`)

`type` gagne `"proposition"` : `{ type: "proposition", songSlug: "", proposition: { id, titre }, position, … }` ; les
autres champs gardent leurs valeurs par défaut. `id` = celui de `songProposals/{id}`.

### Catégories (`src/lib/firebase/setlists.ts`)

`FETE_CATEGORIES = ["Noël", "Pâques"] as const` (nouveau), **à côté** de `RESTRICTED_CATEGORIES` et `FREE_CATEGORIES`, et
**hors de `ALL_CATEGORIES`** : on ne crée jamais une setlist de fête depuis « Nouvelle setlist », et les écrans qui
parcourent `ALL_CATEGORIES` (statistiques, prochaines setlists, profil) ne changent pas. **Choix.**

### Liste « Qui » (`src/types/programme.ts`, décision 34)

`QUI = ["Gp Paix", "Gp Fidélité", "Gp Bonté", "Gp Amour", "Gp Joie", "Franco", "EDD 小班", "EDD 中班", "EDD 大班", "EDD 高班"]`,
dans l'ordre de la décision 34. La valeur **stockée** de Culte Francophone reste `"Franco"` ; elle **s'affiche** « Culte
Francophone » (`libelleQui`, nouveau). **Décision 45** (Q6, libellé seulement) : aucune donnée à réécrire, `reservable()`
des règles (comparaison de chaînes) et `QUI_CATEGORY` restent justes. La même liste vaut pour les passages et pour les
réservations (**décision 45**, Q5).

## Règles (CF)

### Modèle et ordre de passage

| # | Règle |
|---|---|
| CF1 | Un passage reçoit un `id` à sa création (`OrdrePassage`, Back-Office). Modifier un passage garde son `id` et ses `medias` ; glisser-déposer aussi. **Lecture tolérante** : un passage d'avant ce lot, sans `id`, s'affiche comme aujourd'hui ; la route `/api/fetes/droits` (CF16) donne un `id` à tous ceux qui n'en ont pas, en une transaction, la première fois qu'elle lit l'édition (**choix** : ni script ni lecture de la vraie base par une session). Cette écriture n'écrit ni `modifiePar` ni `updatedAt`, mais change le `updateTime` du document : une coordination qui avait l'ordre de passage ouvert se voit refuser son premier enregistrement (D20, « Modifié par … entre-temps : recharge ») ; une seule fois par édition. |
| CF2 | L'ordre, le Quoi, les Qui et le titre des passages ne changent que dans l'ordre de passage du Back-Office, par la coordination, jusqu'au jour J compris (décision 29, Q16 de `spec-scene-paques-noel.md`). Ni l'éditeur de setlist, ni les routes de ce lot ne déplacent un passage. |
| CF3 | Liste « Qui » (décision 34) : `QUI` ci-dessus, pour les passages **et** les créneaux de réservation (une seule liste, **décision 45**, Q5). `QuiChecklist` propose ces dix valeurs ; une valeur retirée encore présente dans un passage ou un créneau (敬拜团, Jeunes, Chorale) s'affiche telle quelle, cochée et grisée « retiré », pour que la coordination la décoche ; elle n'est plus proposée. `QUI_VISIBLES` (`CreneauForm.tsx:126`, neuf groupes avant « + N ») passe à dix : plus de « + N » (**choix**). |
| CF4 | Familles de « Qui peut réserver » (`FAMILLES`) : **groupes** (les cinq), **edd** (les quatre classes), **louange** (`Franco`, affiché « Culte Francophone ») ; les familles « Jeunes » et « Chorale » disparaissent. Un `quiAutorises` d'avant qui contient une valeur retirée reste lu tel quel (aucune réécriture). |
| CF5 | `libelleQui(q)` : `"Franco"` → « Culte Francophone » (中文 : 法语崇拜, la catégorie existante) ; les autres valeurs telles quelles. Toutes les pastilles « Qui » passent par elle : ordre de passage (`OrdrePassage.tsx:78`), cases de `QuiChecklist` et de la feuille « Réserver » (`CreneauForm.tsx:51`, `:182`), réservations (`Entrainements.tsx:125`, `:187`, `:193`, `:254` ; `LigneJour.tsx:48` ; `ToutesReservations.tsx:114` ; `CetteSemaine.tsx:67`), widget Scène (`WidgetScene.tsx:42`), calendrier (`src/lib/calendrier/entrees.ts:403`), message de conflit (`src/lib/scene/conflit.ts:15`), rappels du matin (`rappels.ts:32`), titres de setlist. `QUI_CATEGORY` (`src/lib/scene/rappels.ts:12-20`) ne change pas. |

### Page de la fête (App, `/evenements/scene/[fete]`, décision 27, piste A)

| # | Règle |
|---|---|
| CF6 | L'ordre de passage de la page de la fête (App) lit le programme **et** les setlists de l'édition (`getSetlistsDeFete(programme)`, nouveau dans `src/lib/firebase/setlists.ts` : une requête `runQuery` sur `fete.programme`, refiltrée côté client car la base de test ignore les `where`, `isDraft` écartés). Chaque passage montre : numéro, titre, pastille Quoi, pastilles Qui (`libelleQui`), puis **ses chants** (titre, pastille de tonalité : `keyOverride`, sinon `recommendedKey ?? originalKey` de l'index, comme la bibliothèque de l'éditeur ; une fusion « A / B » ; une proposition en attente avec la pastille orange « proposition en attente » ; « Pas de chant » en gris s'il n'y en a aucun, et toujours sur un passage à plusieurs Qui, qui n'a pas de chants, décision 37), puis **ses musiques et danses** (« ▷ Danse · Lumière dans la nuit, chorégraphie · 3:40 · départ à 0:12 », le titre en lien quand il y a un lien, ouvert dans un nouvel onglet ; dessous en italique « Régie : … »). |
| CF7 | À droite de chaque passage qui a une setlist non vide : « Setlist » (lien vers `/setlists/{id}`). Sur un passage **à moi** (CF16) : le passage est en avant (carte surélevée, filet à gauche, pastille « le mien »), et, sur un passage à **un seul** Qui, le bouton plein **« Saisir les chants »** remplace « Setlist » ; sous ses musiques, « + Musique ou danse », et un « ⋯ » par musique (Modifier, Retirer avec la confirmation du site). **Un passage à plusieurs Qui** (danse ou sketch, décision 37) n'a **jamais** « Saisir les chants », ni pour ses ayants droit ni pour la coordination : seulement « + Musique ou danse » et les « ⋯ ». **La coordination** peut saisir « partout » (décision 30) : sur un passage qu'elle n'a **pas** à elle, « Saisir les chants » (passage à un seul Qui ; bouton discret, à côté de « Setlist » s'il y en a une) et « + Musique ou danse » s'affichent aussi, sans carte en avant ni pastille « le mien » (**choix** : sans cela, un passage sans chant n'aurait aucune porte d'entrée pour elle). « Saisir les chants » suit `chants`, « + Musique ou danse » et les « ⋯ » suivent `musiques`, la carte en avant et la pastille suivent `mien`, tous trois rendus par `/api/fetes/droits` (CF16). |
| CF8 | **« Tous · Le mien »** (`Pilules`) au-dessus de l'ordre de passage (en grand, à droite du titre ; sur téléphone, sous « Ordre de passage du jour J · 9 passages »). « Le mien » ne garde que les passages à moi (CF16), numéros d'origine conservés. Le filtre n'apparaît que si la personne a au moins un passage à elle. État local, non écrit dans l'adresse. **Choix.** |
| CF9 | L'entrée de la colonne (« Ordre de passage du jour J ») dit « 9 passages et leurs chants » (planche). Le reste de la page (réservations, semaines, états de l'édition) ne change pas ; sur téléphone, l'ordre de passage s'ouvre toujours en page (`?vue=ordre`), sans le résumé « Mes réservations · Entraînements » de la planche (écart 4, **décision 45**, Q11). L'ordre de passage du Back-Office (`FeteGestion`) montre chants et musiques **en lecture** sous chaque passage, et sa version imprimée (après le jour J) les garde (**choix** : rien dans les décisions ; la coordination qui règle l'ordre voit ainsi ce qui y est). Seule l'entrée change de texte : « aucun numéro pour l'instant » (zéro passage) et la liste des années passées gardent « numéros » (`planning.fete.numeros`). |

### Setlists de fête (décisions 28, 32)

| # | Règle |
|---|---|
| CF10 | **Une setlist par « Qui »** (décisions 28 et 37) : seul un passage à **un seul** Qui a des chants, donc une setlist ; un passage à plusieurs Qui est une danse ou un sketch (« ce n'est pas des chants mais c'est les danses et les sketchs », décision 37) : pas de chants, pas de « Saisir les chants », pas de setlist ; ses musiques et danses restent sur sa ligne (CF22-CF23) et il paraît dans « Sans chant » (CF13). Titre : « {Fête} {année} · {Qui} » (« Noël 2026 · Gp Paix », « Noël 2026 · Culte Francophone ») ; le titre du passage en sous-titre. Cas rare d'un même Qui qui chante dans deux passages : une setlist par passage, de **même titre**, le titre du passage en sous-titre et son numéro pour les distinguer (**choix** : le plus simple et fidèle au « titre du passage en sous-titre » de la décision 28). Le titre **affiché** se calcule dans la langue de l'écran (« 圣诞节 2026 · Gp Paix », comme Q11 de `spec-scene-paques-noel.md`) ; le titre **stocké** est le français et suit le Qui du passage à chaque « Saisir » (CF17) ; si la coordination remplace ce Qui par un autre entre-temps, la page de la fête et Setlists, qui lisent le programme, montrent le Qui à jour. Si elle donne après coup **plusieurs** Qui à un passage qui avait une setlist : la setlist garde son titre stocké (`fete.qui`) et ses chants, toujours montrés sous le passage, mais plus personne ne la saisit (« Saisir les chants » disparaît, `/api/fetes/saisir` répond 409, CF17) ; la coordination la supprime ou rend au passage un seul Qui (**choix**). |
| CF11 | Une setlist de fête **naît au premier « Saisir les chants »** de son passage (CF17), vide. Une setlist sans élément ne compte pas : pas de lien « Setlist », pas de ligne dans Setlists, « Pas de chant » sur la page de la fête. Une setlist dont le passage a été retiré de l'ordre de passage n'apparaît plus ni dans Setlists › Noël ni sur la page de la fête ; elle reste lisible par son adresse, et la coordination peut la supprimer. **Choix.** |
| CF12 | **Visible de tout connecté** (décision 32) : `canSeeSetlist` rend vrai pour une setlist qui porte `fete`. Les règles lisent déjà toute setlist pour `signedIn()` (`firestore.rules:303`) : rien à changer pour la lecture. |
| CF13 | **Setlists** (décision 32, piste A) : le menu des catégories (`<select>`) gagne un groupe **« Fêtes »** avec **Noël** et **Pâques**, pour tout connecté (pas seulement pour qui sert dans une catégorie). Le filtre d'affichage des onglets À venir et Passées est celui du partage (PS10 de `docs/spec-partage-setlist.md`, codé avant ce lot, décision 45 ; il remplace le filtre d'aujourd'hui, `src/app/setlists/page.tsx:136-146`) : `canSeeSetlist`, qui laisse passer toute setlist qui porte `fete` (CF12). `getSetlistsPartagees` du partage (PS10, requête sur `editeurs`, le champ unique) ramène aussi les setlists de fête dont on est éditeur ; elles n'ont pas la marque « Dans l'équipe » du partage, leur pastille de catégorie suffit (**choix**). Filtre **« Mes services »** (coché par défaut, `:133`, `:140-145`) : une setlist de fête y passe quand on en est éditeur (`editeurs ∋ uid`), comme ses propres setlists et celles dont on est de l'équipe (PS10, même champ), et **toujours** quand le filtre de catégorie est Noël ou Pâques (sans cela, un membre qui ne saisit rien ne verrait rien sous « Fêtes › Noël », filtre coché) ; avec « Toutes », une setlist de fête dont on n'est pas éditeur n'y paraît pas (elle ne correspond à aucun service). **Choix.** La page lit en plus les programmes (`listProgrammes`, `src/lib/firebase/programmes.ts:136`) pour l'ordre, les titres de passage et « Sans chant ». Avec « Noël » choisi : en-tête « Noël 2026 · jeudi 24 décembre », les setlists **dans l'ordre de passage**, chaque ligne « Noël 2026 · Gp Paix » / « Lumière dans la nuit · Ruth K. » (titre du passage · leader) / « Noël · passage 3 · 2 chants » ; en bas, « Sans chant : 5 · Il est venu pour nous, 7 · Gloire au Roi » (les passages sans setlist non vide, décision 28, dont tout passage à plusieurs Qui, décision 37). Avec « Toutes » : les setlists de fête se rangent par date avec les autres. Une édition passée va dans « Archives », comme toute setlist. Une fête sans setlist : l'état vide habituel de la liste, et « Sans chant : … » pour tous ses passages. |
| CF14 | **Page d'une setlist de fête** (planches `v19-fete-setlist-*`) : au-dessus du titre, « ● Noël · jeudi 24 décembre · passage 3 » ; sous le titre, « Lumière dans la nuit · saisie par Ruth K. · Page de Noël 2026 » (lien vers la page de la fête) ; la liste des chants comme toute setlist ; une carte **« Musiques et danses — pour la régie »** **en lecture** (celles du passage, CF6 ; « Aucune pour ce passage. » sinon) ; une carte **« L'ordre de passage »** (« 3 sur 9 », le passage précédent, celui-ci, le suivant, chacun ouvrant sa setlist s'il en a une ; la page lit le programme, `getProgramme`, et les setlists de l'édition, `getSetlistsDeFete`) ; sur téléphone, « Dans l'ordre de passage » avec deux boutons « ‹ Passage 2 · EDD 小班 » et « Passage 4 · EDD 中班 › ». Mode louange, partitions, PDF, copie des paroles, déroulé et versions perso marchent comme pour toute setlist. **Choix** : la décision 29 retire la carte de l'**éditeur**, la planche retenue la montre en lecture sur la page de la setlist. |
| CF15 | Ce que la setlist de fête n'a pas : pas de « Prévenir l'équipe » ni d'envoi automatique de « setlist prête » (`SetlistForm` n'appelle **jamais** `notifySetlistReady`, donc `/api/push/notify-setlist`, pour une setlist de fête, ni à la sortie de l'éditeur ni à la publication (`SetlistForm.tsx:399`, `:499`), y compris avec la condition « non privée ou avec équipe » du partage, PS13 de `docs/spec-partage-setlist.md`, alors que son `editeurs` n'est pas vide ; la route refuse une setlist de fête : aucune équipe de planning à cette date, et ses `editeurs` ne sont pas une équipe à prévenir) ; pas de « Dupliquer » (`canDuplicateSetlist` faux) ; pas de passage en privée ; catégorie, date et titre non modifiables dans l'éditeur ; pas de ligne dans la cloche (`src/hooks/useNotifications.ts:101` : une setlist qui porte `fete` est sautée, sinon chaque modification en afficherait une aux admins). **Choix** : la décision 32 ne parle que de visibilité ; « aucune notification » est le sens de « Hors périmètre ». |

### Qui saisit (décisions 30, 35, 37 ; décision 45 pour Q3, Q4 et Q10)

| # | Règle |
|---|---|
| CF16 | **`ayantsDroitDuQui(q, contexte)`** et **`droitsDeSaisie(passage, contexte, uid)`** (nouveaux, purs, `src/lib/fetes/droits.ts`). `ayantsDroitDuQui` rend, pour **un** Qui, les comptes qui le saisissent et la raison de chacun (tableau ci-dessous, sans la coordination) ; `droitsDeSaisie` rend `{ chants, musiques, mien }` pour un compte : **`chants`** (« Saisir les chants ») = le passage a **un seul** Qui **et** (le compte en est ayant droit **ou** coordination) ; un passage à plusieurs Qui n'a jamais de chants, coordination comprise (**décision 37** : danse ou sketch, pas de setlist ; il n'y a donc plus d'union d'ayants droit pour des chants) ; **`musiques`** (« + Musique ou danse ») = le compte est ayant droit d'**au moins un** Qui du passage, ou coordination (pour un passage à plusieurs Qui : **décision 46**) ; **`mien`** = au moins une raison autre que la coordination sur un Qui du passage. Le groupe d'un Qui se lit par **`groupeDuQui(q)`** (nouveau, pur, `src/lib/fetes/qui.ts`, tranche CF-A) : « Gp Paix » → `paix`, « Gp Fidélité » → `fidelite`, « Gp Bonté » → `bonte`, « Gp Amour » → `amour`, « Gp Joie » → `joie` (ids de `groupes/{id}` du lot 2), sinon `null`. Ayants droit d'un Qui : |

| Qui | Peuvent saisir | Lu dans |
|---|---|---|
| Gp Paix, Gp Fidélité, Gp Bonté | le **président** et les **VP** du groupe (avec compte) ; ses **musiciens** : (a) les comptes dont `serviceRoles["Groupe …"]` contient `musicien` (rôles de service, valables pendant la transition, D17 du lot 2) ; (b) les titulaires avec compte d'un rôle du groupe **relié à une colonne de musicien** : Paix et Bonté → `musiciens`, `percussion` ; Fidélité → `pianiste`, `guitariste`, `batterie` ; **et** (c) les titulaires avec compte des rôles du groupe qui ont la case **« Saisir les chants des fêtes »** (`droits.saisirFetes` vrai, OG13 du lot 2 ; absent = faux) (**décision 35**). La **présidence de séance** (`serviceRoles` « presidence ») ne saisit pas à ce titre (**décision 45**, Q10). | `groupes/{id}` du lot 2 (président, VP, rôles, `droits.saisirFetes`, titulaires) ; `groupeDe` ; `users/*.serviceRoles`, `users/*.referentDe` |
| Gp Amour, Gp Joie | le **président**, les **VP** et les titulaires avec compte des rôles qui ont la case « Saisir les chants des fêtes » (**décision 35**) ; ni planning ni catégorie, donc pas de musiciens (a) ni (b). | `groupes/{id}` du lot 2 ; `groupeDe` |
| (les cinq groupes) | Un président, un VP ou un titulaire **ne compte que s'il appartient au groupe** : `groupeDe(profil) === groupeDuQui(q)`, la même fonction pure que le lot 2 (OG2 ; OG3 : une personne d'un autre groupe présente dans le document est ignorée, ni groupe ni droit). Pour le président et les VP, on peut aussi lire `referentDe ∋ comite-<groupe>`, recopié par le serveur (OG17, OG19 du lot 2). La case `saisirFetes` n'est **pas** recopiée sur le profil : le serveur la lit dans le rôle (lot 2, § « Pas de liste recopiée »). | — |
| EDD 中班, 大班, 高班 | les **louangeurs** de la classe d'après le planning EDD : les noms des colonnes **présidence, suppléant, piano, cajon** (colonnes 1 à 4 de chaque ligne de `edd[période].classes[classe]` ; pas guitare ni cours) sur **tous les dimanches** de la **période EDD qui contient le jour J** (Noël → Nov–Déc ; Pâques → Mars–Avr) **et de l'année du jour J** (**décision 45**, Q4 ; le tableau mêle les années : on filtre sur la date de chaque ligne), découpés par `splitNames` et rapprochés d'un compte par le nom de planning. Tout ce qui est écrit compte : le planning EDD n'a ni trimestre à publier ni brouillon. Un suppléant compte comme la présidence (décision 30). | `loadPlanningData` (`src/lib/planning/names.ts:32`), `normalizeName`, index des noms de planning (`loadPlanningNameIndex`, déjà utilisé par `src/app/api/setlist/presentation/route.ts:6`) |
| EDD 小班 | les membres de **TEAM EDD** : `dansEquipes` contient `edd` (référents compris) (**décision 45**, Q3) : 小班 n'a pas de planning EDD (`src/lib/planning/grilles.ts:212-213`). | `users/*.dansEquipes` |
| Culte Francophone (`Franco`) | les membres de **TEAM LOUANGE** : `dansEquipes` contient `louange` (référents compris). **Choix** : l'équipe de l'organigramme, pas le public « Louange élargi » du lot 1 (EQ4), qui compte tout choriste. | `users/*.dansEquipes` |
| tout passage | la **coordination** (`isCoordination` du lot 1 : admin ou `coordination`), pour les chants d'un passage à un seul Qui et pour les musiques de tout passage | profil |

La route **`POST /api/fetes/droits`** `{ programme }` (nouveau, Admin SDK, 404 sans `BACK_OFFICE`, jeton vérifié) pose les `id` manquants (CF1), calcule `droitsDeSaisie` pour l'appelant et répond `{ passages: [{ id, chants, musiques, mien }] }` dans l'ordre du programme. C'est la seule source des boutons « Saisir les chants », « + Musique ou danse » et du filtre « Le mien » ; aucune fonction cliente ne les recalcule. Elle lit le planning par `loadPlanningData` et les comptes par `loadPlanningNameIndex` (`src/lib/push/recipients.ts:24`), comme `/api/setlist/presentation`.

| # | Règle |
|---|---|
| CF17 | **« Saisir les chants »** (décision 29) : `POST /api/fetes/saisir` `{ programme, passage }` (nouveau, Admin SDK, 404 sans `BACK_OFFICE`). Le serveur vérifie le jeton, relit l'édition et le passage, refuse après le jour J (saisie **jusqu'au jour J compris**, **décision 45**, Q9, comme l'ordre de passage, Q16), calcule les ayants droit du **seul** Qui du passage (`ayantsDroitDuQui`, CF16, sans la coordination, qui passe par `isCoordination` dans les règles ; président, VP, musiciens et rôles cochés « Saisir les chants des fêtes » pour un groupe, décision 35), refuse (403) si l'appelant n'en est pas et n'est pas coordination, puis, dans une transaction, **crée** `setlists/{programme}-{passage}` s'il n'existe pas (CF10 et tableau du modèle : `createdAt` en horodatage serveur compris) ou **met à jour** `editeurs` (les uids des ayants droit), `title`, `date` (jour J) et `fete.qui`. Seuls la route et les boutons s'arrêtent après le jour J : les règles ne savent pas comparer la date du jour, un éditeur qui connaît l'adresse de la setlist peut encore la modifier. Passage introuvable, sans `id`, ou à **plusieurs Qui** (décision 37 : pas de chants) → 409 « Ce passage a changé : recharge » (le bouton n'est montré que sur un passage à un seul Qui : ce refus ne survient que si la coordination a changé le passage entre-temps). Réponse `{ setlistId }` ; le navigateur ouvre `/setlists/{id}/edit?depuis=fete`. |
| CF18 | `editeurs` est **recopié à chaque « Saisir »** de n'importe quel ayant droit : une personne nommée après coup (nouveau VP, titulaire d'un rôle qui reçoit la case « Saisir les chants des fêtes », louangeur ajouté au planning, nouveau membre de TEAM EDD) a le droit au premier « Saisir » de qui que ce soit, elle-même comprise ; une personne qui a perdu son rôle le garde jusqu'au prochain « Saisir ». **Choix** : les règles ne savent pas lire le planning EDD (cartographie) ; une liste d'uids recopiée par le serveur est le patron de `dansEquipes` (lot 16, R4). |
| CF19 | **L'éditeur d'une setlist de fête** (décision 29) : le même éditeur que pour un culte (liste, réglages du chant : tonalité, structure, notes par section, note du chant ; fusion ; transition ; bibliothèque). En-tête : « ‹ Noël 2026 » (retour à la page de la fête quand `depuis=fete`), titre calculé non modifiable, puces « Noël · jeudi 24 décembre · passage 3 · Lumière dans la nuit » non modifiables (pas de puce Catégorie, Date ni Partagée/Privée, ni la puce **« Équipe »** du partage, PS2 de `docs/spec-partage-setlist.md`, codé avant ce lot : `editeurs` d'une setlist de fête n'est écrit que par le serveur), « Leader » modifiable ; sous la liste, « Musiques et danses : sur la page de Noël 2026 » (lien), **sans** carte Musiques et danses. « Terminé » ramène à la page de la fête (`depuis=fete`) ou à la setlist. Enregistrement à chaque changement, comme en modification aujourd'hui. |
| CF20 | **Chant hors répertoire** (décision 31) : dans la bibliothèque de l'éditeur d'une setlist de fête, quand la recherche ne trouve aucun chant, une ligne **« Proposer « Douce nuit » »** (« Pas encore au répertoire. Le passage garde la proposition en attente ; elle devient le chant dès qu'il est au répertoire. ») ouvre le formulaire de « Proposer un chant » existant, titre prérempli (lien YouTube obligatoire, lien PDF facultatif, `SongProposalDrawer`). « Proposer et ajouter » crée `songProposals/{id}` (`status: "pending"`, plus `setlistId` pour que Réception dise « pour Noël 2026 · Gp Paix ») et ajoute à la setlist l'élément `{ type: "proposition", proposition: { id, titre } }` à l'endroit choisi. **Choix** : seulement dans une setlist de fête (hors périmètre ailleurs). |
| CF21 | **Bascule** (décision 31) : un `.cho` né d'une proposition porte la directive d'en-tête `{proposition: <id>}` ; le parseur la lit (`metadata.proposition`) et l'index la publie. À la lecture d'une setlist (page de la fête, page de la setlist, éditeur, liste), `resoudrePropositions(items, index)` (nouveau, pur) remplace tout élément `proposition` dont l'`id` figure dans l'index par un élément de chant ordinaire (`songSlug`, `keyOverride: null`, structure par défaut) ; l'éditeur l'écrit ainsi au prochain enregistrement. Un élément non résolu : ligne « Douce nuit — proposition en attente » dans la liste (`ListView.tsx:110`), la partition (`PartitionView.tsx:136`) et les PDF (`SetlistFullPDF.tsx:54`, `SetlistOverviewPDF.tsx:112`) ; ignoré (`estUnChant` faux : un élément qui n'est ni une transition ni une proposition) par le mode louange (`src/lib/performance/blocks.ts:129`), la copie des paroles (`copyLyrics.ts:52`), le sommaire des partitions (`Sommaire.tsx:54`), le PDF compact (`src/lib/pdf/compact.ts:51`) et l'historique des modifications (`src/lib/setlist/history.ts:157`) ; les statistiques (`chantsJoues.ts:85`) et le catalogue de Harmonie (`Catalogue.tsx:68`) l'ignorent déjà, son `songSlug` étant vide ; **compté** comme un chant dans « 2 chants » (`SetlistCard.tsx:42`, `ApercuSetlist.tsx:44`, `SetlistDetailClient.tsx:1312` gardent `type !== "transition"`). Le runbook `docs/chants/00-nouveau-chant.md` et le format `docs/chants/01-format-cho.md` disent d'écrire la directive ; Réception montre l'identifiant à recopier (directive retenue, **décision 45**, Q12 ; pas de choix du chant par un admin dans Réception). |

### Musiques et danses (décision 27, sur la ligne du passage)

| # | Règle |
|---|---|
| CF22 | Feuille **« Musique ou danse »** (planche `v19-fete-musique-telephone` ; menu contre la ligne dès 1 024 px, feuille en dessous, comme « Choisir ») : Type (Musique · Danse, `Pilules`), Titre (obligatoire), Lien « YouTube, Drive… · facultatif » (https seulement), Durée · facultatif et Départ à · facultatif (`m:ss`, ex. 3:40, 0:12), Note pour la régie · facultatif ; Annuler, Enregistrer. Au plus 10 par passage (**choix**). |
| CF23 | Écriture : `POST /api/fetes/musiques` `{ programme, passage, medias }` (nouveau, Admin SDK, 404 sans `BACK_OFFICE`) remplace la liste du **seul** passage désigné, après avoir vérifié l'appelant par `droitsDeSaisie` (`musiques`, CF16 ; calculé en direct : un passage sans chant, dont tout passage à plusieurs Qui, n'a pas de setlist, donc pas d'`editeurs`) et le jour J (jusqu'au jour J compris, **décision 45**, Q9). Les `medias` sont revalidés côté serveur (`validerMedias`, CF22). Transaction : relit le programme, remplace `medias` de ce passage, écrit `modifiePar` (prénom de l'appelant) et `updatedAt`. Une écriture de la coordination partie d'une version plus ancienne est alors refusée par la protection D20 (« Modifié par Ruth entre-temps : recharge ») : rien ne s'écrase. Passage introuvable → 409 « Ce passage a changé : recharge ». **Choix** : `programmes/{id}` reste écrit par la seule coordination dans les règles ; le tableau `passages` ne permet pas de borner une règle à une ligne. |

### Interrupteur (décision 32 : coupées en ligne jusqu'à la mise en ligne des Évènements)

| # | Règle |
|---|---|
| CF24 | Sans `BACK_OFFICE` : les lectures de `src/lib/firebase/setlists.ts` (`getSetlists`, `getSetlistsFrom`, `getSetlistsDepuis`, `getSetlistsSince`, `getMySetlists`, `getSetlistsDeFete`, et `getSetlistsPartagees` du partage, PS10 de `docs/spec-partage-setlist.md`, codé avant ce lot) **écartent toute setlist qui porte `fete`** (`getSetlistsDeFete` rend `[]`), et `getSetlist` la rend comme introuvable (`null`). Un seul endroit, donc liste, recherche, filtre, fiche, Mes services, prochaines setlists de Chants, calendrier, catalogue de Harmonie et statistiques ne la voient pas. Le groupe « Fêtes » du menu n'est pas affiché. `/api/fetes/*` répondent 404 ; `/api/setlist/presentation` et `/api/push/notify-setlist` répondent 404 pour une setlist de fête. La page de la fête est déjà en 404 (`src/app/evenements/layout.tsx:11`). Raison : local et en ligne partagent le même Firestore ; les setlists de fête saisies en local ne doivent pas paraître en ligne. |
| CF25 | Avec `BACK_OFFICE` : les setlists de fête comptent partout comme les autres (statistiques « les plus joués » et catalogue de Harmonie compris), sauf CF15 et sauf **« Prochaines setlists » de Chants** (`upcomingSetlists`, `src/lib/setlist/upcoming.ts:10` : neuf lignes d'un même jour y prendraient la place des prochains services ; **décision 45**, Q14). Le calendrier les montre seulement si la source « Setlists » est cochée (elle ne l'est pas d'office, `src/lib/calendrier/entrees.ts:48`). |

### Couleurs (décisions 33 et 38)

| # | Règle |
|---|---|
| CF26 | Couleurs (**décisions 33, 38 et 47**) : **Noël = vert sapin `#17633f`**, **Pâques = violet `#7c3aed`**, choisies par Timothée sur la planche commune des couleurs (https://claude.ai/artifact/JuwDNr4VJpVLnyHgEdgBAr). La tranche CF-G ajoute « Noël » et « Pâques » à `CATEGORY_COLORS` (`src/lib/serviceColors.ts`), ajout validé (décision 47) ; jusque-là elles sont grises (`#64748b`, repli de `categoryColor`, `src/lib/serviceColors.ts:36-38`) ; la pastille de la catégorie dans Setlists et la vignette de la date suivent. Mesures (planche) : blanc sur la couleur 7,3:1 et 5,7:1 ; date dans la vignette en clair 5,9:1 et 4,7:1, en sombre 5,5:1 et 5,6:1 ; écart avec la couleur déjà prise la plus proche ΔE 13,1 (EDD) et 14,9 (Paix). Le rouge houx, quasi identique à Fidélité (ΔE 4,0), et l'ambre sont écartés ; Joie a pris la sarcelle, pas le jade (décision 38 respectée). |

### Lien de présentation d'une setlist de fête (décision 45, Q7)

| # | Règle |
|---|---|
| CF27 | Pour une setlist de fête, la **régie** qui pose le lien de présentation sans pouvoir modifier la setlist = les membres de **TEAM RÉGIE** (`dansEquipes` ∋ `regie`, référents compris ; id `regie` de `src/lib/equipes/table.ts`) (**décision 45**, Q7, lecture (a)). `estRegieDeFete(profil, setlist)` (nouveau, pur, `src/lib/access.ts`) = `!!setlist.fete && dansEquipes ∋ "regie"`. **Une seule exception** dans `/api/setlist/presentation` (Admin SDK, **aucune règle**) : pour une setlist qui porte `fete`, le drapeau `regie` (`route.ts:93-96`) vaut `estRegieDeFete(profil, setlist)` au lieu de `isOnDutyRegie` (le planning n'est pas lu : aucun planning de catégorie Noël ou Pâques) ; `canSetPresentationLink` (`src/lib/access.ts:456-463`) ne change pas. Côté client, le même drapeau affiche le bouton sur la page de la setlist (`SetlistDetailClient.tsx:1320-1325`, qui lit aujourd'hui le rôle `regie` de la catégorie). Le message au leader (`notifyPresident`, `route.ts:31-59`) part comme pour toute setlist. Le **rôle Régie** de l'équipe d'une setlist partagée (V5 de `docs/spec-partage-setlist.md`) **n'est pas retenu** (décision 45). |

### Libellés nouveaux (FR · 中文, 中文 à relire par Timothée)

| FR | 中文 |
|---|---|
| Noël · Pâques · Fêtes | 圣诞节 · 复活节 · 节日 |
| Saisir les chants | 填写诗歌 |
| Tous · Le mien · le mien | 全部 · 我的 · 我的 |
| Setlist | 歌单 |
| Pas de chant | 没有诗歌 |
| proposition en attente | 推荐待审核 |
| {{n}} passages et leurs chants | {{n}} 个节目及其诗歌 |
| Musiques et danses · pour la régie | 音乐和舞蹈 · 供音控使用 |
| Musique · Danse · Titre · Lien · Durée · Départ à · facultatif | 音乐 · 舞蹈 · 标题 · 链接 · 时长 · 开始于 · 可选 |
| Note pour la régie · Régie : {{note}} | 给音控的备注 · 音控：{{note}} |
| + Musique ou danse · Aucune pour ce passage. | + 音乐或舞蹈 · 本节目没有。 |
| départ à {{temps}} | 从 {{temps}} 开始 |
| L'ordre de passage · {{i}} sur {{n}} · Passage {{i}} · Dans l'ordre de passage | 上场顺序 · 第 {{i}} / {{n}} 个 · 第 {{i}} 个节目 · 在上场顺序中 |
| Page de {{fete}} · saisie par {{nom}} | {{fete}}页面 · 由 {{nom}} 填写 |
| Sans chant : {{liste}} | 没有诗歌：{{liste}} |
| Proposer « {{titre}} » · Pas encore au répertoire… · Proposer et ajouter | 推荐《{{titre}}》 · 还不在诗歌库中…… · 推荐并加入 |
| Musiques et danses : sur la page de {{fete}} | 音乐和舞蹈：见{{fete}}页面 |
| Ce passage a changé : recharge. | 这个节目已更改，请刷新。 |
| Culte Francophone (pastille Qui) · retiré | 法语崇拜 · 已移除 |

## Tranches de code

| Tranche | Ce qui change | Fichiers touchés | Ordre / conflits |
|---|---|---|---|
| **CF-A — Modèle et logique pure** | `Passage.id`, `medias` ; `QUI` (décision 34), `libelleQui`, `FAMILLES` ; `FSSetlist.fete` (un seul Qui, décision 37 ; `editeurs` est déjà posé par le partage), `getSetlistsDeFete` ; `FETE_CATEGORIES` ; `SetlistItem` « proposition » ; `ayantsDroitDuQui` (dont `droits.saisirFetes`, décision 35, et TEAM EDD pour 小班, décision 45), `droitsDeSaisie` (`chants`, `musiques`, `mien`), `periodeEddDuJour` (`droits.ts`), `titreSetlistFete`, `groupeDuQui` (`qui.ts`), `validerMedias`, `nouvelIdPassage` (`passages.ts`), `resoudrePropositions`, `estUnChant` (`propositions.ts` ; les lecteurs de CF21 l'emploient, les comptes « n chants » gardent `type !== "transition"`) ; directive `{proposition}` dans le parseur et l'index. Aucun écran. | `src/types/programme.ts`, `src/lib/scene/saison.ts`, `src/lib/scene/rappels.ts` (commentaire et `libelleQui` à la ligne 32), `src/lib/scene/conflit.ts`, `src/lib/firebase/setlists.ts`, `src/types/setList.ts`, `src/lib/fetes/droits.ts` (nouveau), `src/lib/fetes/qui.ts` (nouveau), `src/lib/fetes/passages.ts` (nouveau), `src/lib/setlist/propositions.ts` (nouveau), `src/lib/chordpro/parser.ts`, `src/types/chordPro.ts`, `src/lib/content/loadSongs.ts`, `src/types/song.ts`, `tests/helpers/fakeSession.ts` | En premier, **après les lots 1, 2 et 3 et le partage** (décision 45 ; lit `coordination`, `dansEquipes`, `groupes/{id}` avec `droits.saisirFetes`, `groupeDe`, `editeurs`). |
| **CF-B — Droits et routes serveur** | `canSeeSetlist`, `canEditSetlist`, `canDeleteSetlist`, `canDuplicateSetlist` (branches fête, à côté des branches `editeurs` du partage) ; `estRegieDeFete` (CF27) ; règles des setlists ; `/api/fetes/droits`, `/api/fetes/saisir`, `/api/fetes/musiques` ; exception TEAM RÉGIE de `/api/setlist/presentation` (CF27) ; garde `BACK_OFFICE` de `presentation` et `notify-setlist`. | `src/lib/access.ts`, `firestore.rules`, `src/lib/fetes/serveur.ts` (nouveau), `src/app/api/fetes/droits/route.ts` (nouveau), `src/app/api/fetes/saisir/route.ts` (nouveau), `src/app/api/fetes/musiques/route.ts` (nouveau), `src/app/api/setlist/presentation/route.ts`, `src/app/api/push/notify-setlist/route.ts`, `CLAUDE.md` (les trois routes dans la liste des routes API : **20 routes après ce lot** ; 15 à `5878ce1`, puis 16 après le lot 3, 17 après le lot 2) | Après CF-A. `access.ts` et `firestore.rules` sortent des lots 1 et 2 et du partage (PS-A à PS-D, codé avant ce lot, décision 45 : champ `editeurs`, séparation de la suppression) : partir de leur état. |
| **CF-C — Page de la fête** | Chants, musiques et danses dans l'ordre de passage (App et Back-Office en lecture, impression), « Saisir les chants », « le mien », « Tous · Le mien », feuille « Musique ou danse » ; `QuiChecklist` (CF3) ; ids des passages à la création. | `src/app/evenements/scene/OrdrePassage.tsx`, `src/app/evenements/scene/FeteClient.tsx`, `src/app/evenements/scene/CreneauForm.tsx`, `src/app/evenements/scene/MediaForm.tsx` (nouveau), `src/app/back-office/evenements/scene/FeteGestion.tsx`, `src/lib/firebase/programmes.ts`, et les affichages de « Qui » de CF5 : `src/app/evenements/scene/Entrainements.tsx`, `LigneJour.tsx`, `src/app/back-office/evenements/scene/ToutesReservations.tsx`, `CetteSemaine.tsx`, `src/components/backOffice/widgets/WidgetScene.tsx`, `src/lib/calendrier/entrees.ts`, locales | Après CF-B. `OrdrePassage.tsx` porte la protection D20 (R8) : la garder. |
| **CF-D — Éditeur et page de la setlist** | Éditeur en mode fête (CF19), « Proposer » dans la bibliothèque (CF20), éléments « proposition » (CF21) ; page de la setlist : en-tête, cartes « Musiques et danses » et « L'ordre de passage » (CF14), bouton du lien de présentation pour TEAM RÉGIE (CF27) ; rendus Liste, Partitions, PDF, mode louange, copie. | `src/components/setlists/SetlistForm.tsx`, `src/components/setlists/editeur/EnTeteEditeur.tsx`, `src/components/setlists/editeur/Bibliotheque.tsx`, `src/components/setlists/editeur/ListeCourte.tsx`, `src/lib/setlist/formItems.ts`, `src/lib/setlist/buildSetlistItems.ts`, `src/components/songs/SongProposalDrawer.tsx`, `src/lib/firebase/songProposals.ts`, `src/types/songProposal.ts`, `src/app/setlists/[id]/edit/EditSetlistClient.tsx`, `src/app/setlists/[id]/SetlistDetailClient.tsx`, `src/app/setlists/[id]/_components/ListView.tsx`, `PartitionView.tsx`, `src/components/pdf/SetlistFullPDF.tsx`, `src/components/song/copyLyrics.ts`, `src/components/setlists/SetlistCard.tsx`, `src/components/setlists/ApercuSetlist.tsx`, `src/components/admin/Reception.tsx`, `src/components/messages/ReceptionVolets.tsx`, `src/components/setlists/editeur/useVolet.tsx`, `src/components/setlists/editeur/EditeurDeuxColonnes.tsx` (le type `FormListItem` gagne un cas), `src/app/setlists/[id]/_components/Sommaire.tsx`, `src/components/pdf/SetlistOverviewPDF.tsx`, `src/lib/pdf/compact.ts`, `src/lib/performance/blocks.ts`, `src/lib/setlist/history.ts`, locales | Après CF-B ; en parallèle de CF-C (aucun fichier commun hors locales). Après PS-A à PS-D (partage codé avant, décision 45 : `SetlistForm`, `EnTeteEditeur`, `useVolet`, `SetlistDetailClient` en sortent) ; partir de leur état. `SetlistForm` n'appelle jamais `notify-setlist` pour une setlist de fête, y compris avec la condition « non privée ou avec équipe » de PS13 (CF15). |
| **CF-E — Setlists et interrupteur** | Groupe « Fêtes » du filtre, liste dans l'ordre de passage, ligne « Sans chant », visibilité ; filtre `BACK_OFFICE` des lectures (CF24) ; « Prochaines setlists » et cloche (CF15, CF25). | `src/app/setlists/page.tsx`, `src/lib/firebase/setlists.ts`, `src/lib/setlist/upcoming.ts`, `src/hooks/useNotifications.ts`, locales | Après CF-B ; en parallèle de CF-C et CF-D. Après PS-A à PS-D (partage codé avant, décision 45 : `page.tsx` et `getSetlistsPartagees` en sortent) ; partir de leur état. |
| **CF-F — Documentation du répertoire** | Directive `{proposition: <id>}` dans le format et le runbook (décision 45, Q12). | `docs/chants/01-format-cho.md`, `docs/chants/00-nouveau-chant.md` | Avec CF-A. |
| **CF-G — Couleurs de Noël et de Pâques** | Décision 47 : « Noël » `#17633f` et « Pâques » `#7c3aed` dans `CATEGORY_COLORS` (CF26). Test : `categoryColor("Noël")` et `categoryColor("Pâques")` rendent ces valeurs ; les dix couleurs gelées ne changent pas. | `src/lib/serviceColors.ts` | Quand on veut ; si OG-G (lot 2) est déjà versée, partir de son état (même fichier). |

Un commit par tranche, message en français. Chaque tranche laisse la suite verte sur les trois appareils.

## Droits en double

État commun avec `docs/spec-partage-setlist.md` (codé avant ce lot, décision 45) : un seul champ `editeurs` (décision 39,
§ « Setlist de fête » du modèle) ; un uid de `editeurs` voit et modifie, ne supprime pas, ne change ni `editeurs`, ni le
rôle des personnes (`rolesPartage`), ni `isPrivate`, ni `ownerId`. Le partage pose les branches `editeurs` de
`canSeeSetlist` et `canEditSetlist`, et sépare la suppression : `canDeleteSetlist` garde la logique d'aujourd'hui,
`canEditSetlist` = `canDeleteSetlist` **ou** `editeurs ∋ uid` ; miroirs `canDeleteSetlistDoc` (nouveau, dans `allow
delete`) et `canEditSetlistDoc` = `canDeleteSetlistDoc` **ou** `request.auth.uid in editeurs`. Ce lot ajoute les branches
de la fête.

| Droit | `src/lib/access.ts` (client) | `firestore.rules` (serveur) | Route serveur |
|---|---|---|---|
| Voir une setlist de fête | `canSeeSetlist` (`:440-449`) : vrai si `setlist.fete` (CF12) ; la branche commune `editeurs ∋ uid` (partage) est avant le refus des privées | inchangé : `allow read: if signedIn()` (`:303`) | — |
| Modifier une setlist de fête (chants, tonalité, structure, notes, leader) | `canEditSetlist` (`:471-481`) = `canDeleteSetlist` (qui gagne la branche fête, ligne « Supprimer ») **ou** `editeurs ∋ uid` (partage, avant le refus des privées) : la coordination et les éditeurs recopiés modifient | `canEditSetlistDoc` = `canDeleteSetlistDoc` (qui gagne la branche fête) **ou** `request.auth.uid in setlist.get('editeurs', [])` (partage) ; `allow update` ajoute, pour une setlist de fête : `fete` **inchangé** (jamais posé ni retiré depuis un navigateur), `editeurs` et `rolesPartage` **inchangés** (écrits par le serveur seul, même pas par un admin ou la coordination depuis un navigateur : la garde « propriétaire ou admin » du partage ne suffit pas ici), `category` inchangée, `isPrivate` faux ; aucune setlist ordinaire ne passe en catégorie Noël ou Pâques. Pour une setlist ordinaire (partage, décision 39) : `editeurs`, `rolesPartage` et `isPrivate` ne changent que par le propriétaire ou un admin, `ownerId` jamais | `/api/fetes/saisir` recopie `editeurs` (CF17-CF18) |
| Historique d'une setlist de fête | suit `canEditSetlist` | `history` passe déjà par `canEditSetlistDoc` (`:327-336`) | — |
| Créer une setlist de fête | jamais côté client (`ALL_CATEGORIES` sans Noël ni Pâques) | `allow create` refuse `fete` et les catégories `Noël`, `Pâques` ; `editeurs` reste permis à la création d'une setlist **ordinaire** (son créateur choisit l'équipe, décision 39, partage) | `/api/fetes/saisir` (Admin SDK) |
| Supprimer une setlist de fête | `canDeleteSetlist` **n'est plus égal à `canEditSetlist`** (`:487` aujourd'hui ; séparé par le partage, sans la branche `editeurs`) ; ce lot y ajoute la branche `setlist.fete && isCoordination(user, profile)`. Pour une setlist de fête, cela revient à la coordination **seulement** (admin compris ; `ownerId` est `null` et personne ne sert dans la catégorie Noël) : un éditeur de fête ne supprime pas | `canDeleteSetlistDoc` (posé par le partage, dans `allow delete`) gagne la branche `setlist.get('fete', null) != null && isCoordination()` ; `allow delete` ne change pas. `tests/coherence.spec.ts` : la modification passe par `canEditSetlistDoc`, la suppression par `canDeleteSetlistDoc` (état laissé par le partage) | — |
| Dupliquer | `canDuplicateSetlist` : faux si `setlist.fete`, **avant** la branche admin (`access.ts:429-438`) | couvert par `allow create` | — |
| Saisir les chants (bouton, « le mien ») | rendu par la route (`chants`, `mien`) ; aucune fonction cliente ne le recalcule | — | `/api/fetes/droits` (`droitsDeSaisie`) |
| Musiques et danses d'un passage | bouton selon `/api/fetes/droits` (`musiques`) | inchangé : `programmes/{id}` écrit par `isCoordination()` (`:165-167`) | `/api/fetes/musiques` (Admin SDK) |
| Lien de présentation (CF27) | `canSetPresentationLink` (`:456-463`) inchangé ; pour une setlist de fête, le drapeau `regie` = `estRegieDeFete(profile, setlist)` (TEAM RÉGIE, **décision 45**, Q7), côté client pour le bouton (`SetlistDetailClient.tsx:1320-1325`) | — (Admin SDK, aucune règle) | `/api/setlist/presentation` : l'exception de CF27 (`route.ts:93-96`), plus CF24 |
| Proposer un chant | existant (tout connecté) | inchangé (`songProposals`, `:272-283` : champs en plus permis) | — |

`isCoordination` (client et règles) est celle du lot 1 (booléen `coordination`). **Timothée publie `firestore.rules`** dans
la console Firebase, **après la bascule du lot 1 ou dans la même séance** (`firestore.rules` est un seul fichier ; les
règles du partage, même bloc `setlists/{id}`, partent avant ou avec) : sans cela, un président, un musicien ou un
louangeur ne peut pas enregistrer la setlist que la route vient de créer pour lui (403 à l'enregistrement), et une
coordination non admin ne peut ni la modifier ni la supprimer.

## Migration des données

**Aucun script.** Rien à lire ni à écrire dans la vraie base par une session ou par Timothée :

- Passages sans `id` : réparés par `/api/fetes/droits` à la première lecture de l'édition (CF1).
- « Franco » : valeur stockée gardée, seul le libellé change (CF5).
- 敬拜团, Jeunes, Chorale dans des passages, créneaux ou `quiAutorises` existants : lus tels quels (CF3, CF4).
- Aucune setlist existante ne porte `fete` ; aucune catégorie existante ne change.
- Propositions déjà envoyées : rien ne les relie à une setlist ; elles se traitent comme aujourd'hui.

## Tests Playwright à écrire d'abord

Écrits avant le code, vus rouges, puis verts. Comptes, groupes, plannings, programmes et setlists **simulés**
(`tests/helpers/fakeSession.ts`, routes `/api/fetes/*` interceptées par `page.route`). Noms fictifs.

**`tests/chants-fetes.spec.ts`** (nouveau, trois appareils : ordinateur, telephone, tablette)

- *Pur* :
  - `ayantsDroitDuQui` et `droitsDeSaisie` : Gp Paix → président, VP, compte `musicien` de « Groupe Paix », titulaire du
    rôle relié à `musiciens`, titulaire d'un rôle **coché « Saisir les chants des fêtes »** (`droits.saisirFetes: true`,
    décision 35) ; pas un titulaire du rôle relié à `orateur` sans la case ; un rôle écrit sans le champ `saisirFetes` →
    pas de droit ; pas la **présidence de séance** (`serviceRoles` « presidence » de « Groupe Paix », décision 45, Q10) ;
    pas un membre de Bonté ; titulaire d'un autre groupe (présent dans le document de Paix, `groupeDe` = `bonte`), même
    d'un rôle coché → pas de droit. Gp Fidélité → titulaire relié à `guitariste`. Gp Joie → président, VP et titulaire
    d'un rôle coché seulement (décision 35). EDD 中班 → présidence, suppléant, piano, cajon de **tous les dimanches** de
    la période Nov–Déc 2026 pour Noël 2026 (décision 45, Q4), pas guitare, pas un nom d'octobre, pas un nom de Nov–Déc
    2025 ; Pâques 2027 (28 mars) → période Mars–Avr ; un suppléant (colonne 2, sans rôle dans `EDD_ROLE_MAP`) compte
    quand même. EDD 小班 → un membre de TEAM EDD (`dansEquipes` ∋ `edd`, décision 45, Q3), pas un membre d'une autre
    équipe. `Franco` → `dansEquipes` ∋ `louange`, pas un simple choriste. Coordination → `chants` et `musiques` sur tout
    passage à un seul Qui, mais `mien` faux. **Passage à deux Qui** (danse EDD 大班 + 高班, décision 37) → `chants` faux
    pour tous, coordination comprise ; `musiques` vrai pour un louangeur de 大班 comme de 高班 et pour la coordination
    (décision 46), `mien` vrai pour les louangeurs seulement.
  - `titreSetlistFete` : « Noël 2026 · Gp Paix », « Noël 2026 · EDD 大班 », « Noël 2026 · Culte Francophone » ; 中文
    « 圣诞节 2026 · Gp Paix ». Un seul Qui en entrée (décision 37).
  - `estRegieDeFete` (CF27) : vrai pour un membre de TEAM RÉGIE (`dansEquipes` ∋ `regie`) sur une setlist de fête ; faux
    pour lui sur une setlist ordinaire ; faux pour un compte `regie` de service hors TEAM RÉGIE sur une setlist de fête.
  - `groupeDuQui` : « Gp Paix » → `paix`, « Gp Fidélité » → `fidelite`, « Gp Bonté » → `bonte`, « Gp Amour » → `amour`,
    « Gp Joie » → `joie` ; `Franco`, « EDD 中班 » → `null`.
  - `QUI` dans l'ordre de la décision 34, sans 敬拜团, Jeunes, Chorale ; `libelleQui("Franco")` ; `FAMILLES` à trois.
  - `validerMedias` : titre vide refusé ; lien `http://` refusé ; « 3:40 » accepté, « 3.40 » refusé ; onze refusées.
  - `resoudrePropositions` : un élément dont l'id est dans l'index devient le chant ; un autre reste en attente.
  - `canSeeSetlist`, `canEditSetlist`, `canDeleteSetlist`, `canDuplicateSetlist` sur une setlist de fête (membre sans
    catégorie, éditeur : voit et modifie mais **ne supprime pas**, coordination non admin : modifie et supprime, admin).
    `canDeleteSetlist` ≠ `canEditSetlist` pour un éditeur.
  - Texte de `firestore.rules` : la branche `fete … isCoordination()` de `canDeleteSetlistDoc` (dont héritent
    `canEditSetlistDoc` et `allow delete`), `fete`, `editeurs` et `rolesPartage` inchangés dans `allow update` d'une
    setlist de fête, le refus de `fete` et des catégories Noël et Pâques à la création (même méthode que
    `tests/coherence.spec.ts`).
- *Page de la fête (App)* : Noël 2026, neuf passages simulés ; chaque passage montre ses chants avec leur tonalité, « Pas
  de chant », « proposition en attente », la danse avec durée, départ et note ; « Setlist » ouvre la bonne setlist. Le
  passage 6 (spectacle EDD 大班 + 高班, deux Qui) : « Pas de chant », ni « Saisir les chants » ni « Setlist », même pour
  un louangeur de 大班 ou pour la coordination (décision 37) ; ses musiques et danses sur sa ligne, et « + Musique ou
  danse » pour un louangeur de 大班 (décision 46).
- Musicienne du Gp Paix (droits simulés) : passage 3 marqué « le mien », « Saisir les chants » appelle
  `/api/fetes/saisir` avec `{ programme: "noel-2026", passage }` et ouvre l'éditeur ; « Le mien » ne garde que le
  passage 3 ; un membre sans passage ne voit ni le filtre ni « Saisir ». Titulaire d'un rôle de Joie coché « Saisir les
  chants des fêtes » : « Saisir les chants » sur le passage de Gp Joie (décision 35). Réponse simulée de
  `/api/fetes/droits` : `{ passages: [{ id, chants, musiques, mien }] }` ; une coordination (`chants` et `musiques` vrais,
  `mien` faux) voit « Saisir les chants » et « + Musique ou danse » sur un passage à un seul Qui sans chant, sans « le
  mien » ni carte en avant. Une réponse 409 de `/api/fetes/saisir` (passage devenu à deux Qui) affiche « Ce passage a
  changé : recharge. ».
- *Lien de présentation* (CF27) : un membre de TEAM RÉGIE, sans droit de modifier, voit le bouton du lien de
  présentation sur une setlist de fête, et l'envoi part vers `/api/setlist/presentation` (interceptée) ; un membre sans
  équipe ne le voit pas.
- « + Musique ou danse » : la feuille écrit par `/api/fetes/musiques` la liste du seul passage (corps vérifié) ; durée
  « 3.40 » refusée sous le champ ; Retirer passe par la confirmation du site.
- *Éditeur* : ouvert sur une setlist de fête, pas de puce Catégorie, Date ni Privée, aucune carte « Musiques et danses »,
  lien « Musiques et danses : sur la page de Noël 2026 » ; « Terminé » revient à la page de la fête ; aucune requête vers
  `/api/push/notify-setlist`.
- *Proposer* : recherche « Douce nuit » sans résultat → « Proposer « Douce nuit » » ; envoi : un `songProposals` créé
  (`status: "pending"`, `setlistId`), un élément « proposition » dans la setlist ; avec un index qui porte
  `proposition: <id>`, la ligne montre le chant et sa tonalité.
- *Setlists* : un membre sans aucune catégorie voit « Fêtes › Noël » et les setlists de Noël dans l'ordre de passage,
  « Sans chant : 5 · …, 6 · …, 7 · … » en bas (le passage 6 à deux Qui y est, décision 37) ; il ouvre une setlist mais n'a pas « Modifier » ; un éditeur l'a, sans « Supprimer » ; une setlist de fête ramenée par la requête sur `editeurs` n'a pas la marque « Dans l'équipe ». « Mes services » coché : avec « Toutes », seulement celles dont il est éditeur ; avec « Noël », toutes ; « Prochaines setlists » de Chants non plus ; aucune ligne dans la cloche ; une setlist sans `createdAt` n'est pas lue par `getSetlists` (garde-fou du test de création côté serveur).
- *Page d'une setlist de fête* : « Noël · jeudi 24 décembre · passage 3 », « Page de Noël 2026 », carte « Musiques et
  danses » en lecture, passages voisins ; mode louange s'ouvre.
- *Retiré* : un passage qui porte « Jeunes » s'affiche coché et grisé « retiré » dans `QuiChecklist`, sans être proposé à un nouveau passage ; la feuille « Réserver » propose les dix mêmes valeurs, sans « + 3 » (décision 45, Q5).
- *Protection D20* : une écriture de `/api/fetes/musiques` (simulée : `updateTime` changé) puis une écriture de l'ordre de
  passage par la coordination sur l'ancienne version → « Modifié par … entre-temps : recharge ».

**`tests/chants-fetes-agencement.spec.ts`** (nouveau, **cinq projets** : ajouter `/chants-fetes-agencement\.spec\.ts/` à
`SPECS_GRAND_ECRAN` de `playwright.config.ts`) : page de la fête (ordre de passage à droite en grand, « Tous · Le mien » à
droite du titre ; iPad couché à barre réduite ; téléphone : filtre sous le titre, « Saisir les chants » pleine largeur),
Setlists filtrées sur Noël (liste et aperçu en deux volets, cartes « Musiques et danses » et « L'ordre de passage »), page
d'une setlist de fête sur téléphone ; aucun défilement de page en largeur ; captures regardées à l'œil sur les cinq
tailles, en FR et en 中文.

**`tests/back-office-coupe.spec.ts`** (second serveur, à compléter) : `/api/fetes/droits`, `/api/fetes/saisir`,
`/api/fetes/musiques` en 404 (liste de la ligne 74) ; une setlist de fête simulée absente de `/setlists` et de la
recherche, sa page « introuvable » ; pas de groupe « Fêtes » dans le menu ; `/api/setlist/presentation` en 404 pour elle.

**Specs existantes à mettre à jour ou à garder vertes** (noms vérifiés dans `tests/`) :

- `tests/scene-saison.spec.ts` : tout ce qui nomme « Jeunes », « Chorale » ou `FAMILLES[3]` (l. 26-32, 155-198, 296-297, 365-386, 439-448, 487-492, 520-522, 532-602) → familles à trois, valeurs de la décision 34 ; les cinq clics sur « + 3 » (l. 566, 588, 712, 819, 857) disparaissent avec `QUI_VISIBLES` (CF3).
- `tests/programme-scene.spec.ts` : fixture `敬拜团` (l. 231) gardée comme donnée ancienne ; `quiCategory` (l. 298-302)
  inchangé ; pastille « Culte Francophone ».
- `tests/scene-paques-noel.spec.ts` : entrée « … passages et leurs chants » (l. 563 ; l. 617 et 1138 gardent « numéros » et « aucun numéro »), ordre de passage avec chants ; les pastilles « Franco » deviennent « Culte Francophone » (l. 429, 864, 1198 `getByLabel`, 1255, 1544). Même changement dans `tests/tableau-de-bord.spec.ts` (l. 374, widget Scène).
- `tests/retouches-v18-ordre.spec.ts` : reste vert (les passages portent un `id`).
- `tests/calendrier.spec.ts`, `tests/calendrier-deplacer.spec.ts` : créneaux « Jeunes » / « Chorale » gardés comme
  données anciennes ; vérifier qu'ils restent verts.
- `tests/setlist-bibliotheque.spec.ts`, `tests/setlist-editeur-piste2.spec.ts`, `tests/setlist-editor.spec.ts` : pas de
  « Proposer » hors setlist de fête ; éditeur ordinaire inchangé.
- `tests/agencement-v18-setlists.spec.ts`, `tests/pages-en-grand-setlists.spec.ts` : le menu des catégories gagne
  « Fêtes ».
- `tests/setlist-regie.spec.ts` : lien de présentation inchangé hors fête (TEAM RÉGIE ne donne rien sur une setlist
  ordinaire, CF27).
- `tests/chants-deux-volets.spec.ts` : « Prochaines setlists » (`upcomingSetlists`) ne montre aucune setlist de fête
  (décision 45, Q14).
- `tests/coherence.spec.ts` : suit l'état laissé par le partage (modification par `canEditSetlistDoc`, suppression par
  `canDeleteSetlistDoc`) ; reste vert avec la branche fête de `canDeleteSetlistDoc`.

## Hors périmètre

- Un champ « Qui » par chant dans une setlist ; des musiques ou danses **dans** la setlist ou dans l'éditeur (décision 29).
- Changer l'ordre des passages ailleurs que dans l'ordre de passage du Back-Office (décision 29).
- « Proposer » depuis une setlist ordinaire ; « Ajouter un chant » avec dépôt de partition (`docs/spec-ajouter-un-chant.md`,
  toujours mis de côté).
- Des chants, une setlist ou « Saisir les chants » pour un passage à plusieurs Qui (danse ou sketch, décision 37).
- Une notification à la saisie, à la proposition ou au changement d'une musique ; « setlist prête » pour une fête.
- Le rôle Régie dans l'équipe d'une setlist partagée (V5 de `docs/spec-partage-setlist.md`, non retenu, décision 45) ; la
  régie de service hors planning en dehors des fêtes (seule TEAM RÉGIE est reconnue, et pour une setlist de fête, CF27).
- La présidence de séance d'un groupe comme ayant droit (décision 45, Q10).
- Les setlists de fête dans « Prochaines setlists » de Chants (décision 45, Q14).
- Choisir le chant d'une proposition dans Réception (décision 45, Q12 : la directive suffit).
- Dupliquer les setlists d'une fête vers l'année suivante ; un livret imprimé de toutes les setlists de la fête.
- Le résumé des réservations sur téléphone dessiné par `v19-fete-a-telephone` (écart 4, décision 45, Q11) ; le menu
  maison des catégories (écart 5).
- Toute écriture dans le Google Sheet.

## À la mise en ligne

**À faire avant le code** : Timothée relit le 中文 du tableau des libellés. Les couleurs sont choisies (décision 47, CF26).

- **Préalable** : la bascule du lot 1 est faite (relevé, publication des règles, migration `--ecrire`, coordination
  cochée) ; sinon, la publication des règles de ce lot se fait dans la même séance (`firestore.rules` est un seul
  fichier).
- **Timothée publie `firestore.rules`** dans la console Firebase (bloc `setlists/{id}` : création, mise à jour,
  suppression, `canEditSetlistDoc`, champ `editeurs`), **après la bascule du lot 1 ou dans la même séance**. Les règles
  des lots 1 et 2 et celles du partage (même bloc, champ `editeurs`, suppression séparée) sont publiées avant ou en même
  temps (`isCoordination` lit `coordination`).
- Les présidents (ou un admin) cochent « Saisir les chants des fêtes » sur les rôles de leur groupe qui le doivent
  (décision 35, lot 2) ; TEAM EDD (pour 小班, décision 45) et TEAM RÉGIE (lien de présentation, CF27) sont remplies
  dans l'organigramme de l'église (`dansEquipes`), avant la première fête saisie.
- Aucun script à lancer, aucune variable Vercel. `BACK_OFFICE` reste absent en ligne : les setlists de fête et la page de
  la fête restent invisibles en ligne (`back-office-coupe` vert) jusqu'à la mise en ligne des Évènements.
- Pour la bascule des propositions : chaque `.cho` né d'une proposition porte `{proposition: <id>}` (runbook, CF21,
  décision 45).
- Le jour où les Évènements passent en ligne : retirer la garde de CF24 en même temps que l'interrupteur.

## Questions ouvertes

Aucune : toutes tranchées le 08/10/2026 (décisions 35 à 46 de `decisions.md`). Les quinze questions de cette spec et
leurs réponses sont dans § « Réponses de Timothée (08/10/2026, soir) », où elles gardent leurs numéros Q1 à Q15.

## Commandes

```bash
npx playwright install --with-deps chromium   # début de session cloud
npx tsc --noEmit
npm run lint
npm run validate                              # la directive {proposition} ne casse aucun .cho
npm test -- tests/chants-fetes.spec.ts
npm test -- tests/chants-fetes-agencement.spec.ts
npm test -- tests/scene-paques-noel.spec.ts tests/scene-saison.spec.ts tests/programme-scene.spec.ts tests/retouches-v18-ordre.spec.ts
npm test -- tests/setlist-bibliotheque.spec.ts tests/setlist-editeur-piste2.spec.ts tests/setlist-editor.spec.ts tests/setlist-regie.spec.ts tests/agencement-v18-setlists.spec.ts tests/pages-en-grand-setlists.spec.ts tests/coherence.spec.ts
npm test -- tests/back-office-coupe.spec.ts
```

## Avancement

- 08/10/2026 : spec écrite, attend le go.
- 08/10/2026 : relecture adversariale à froid (références de code, planches, décisions, sibling specs) ; corrigée en place.
- 08/10/2026 : relecture croisée des cinq specs, incohérences corrigées.
- 08/10/2026 (soir) : réponses de Timothée intégrées (décisions 35 à 45).
- 08/10/2026 (soir) : question 15 tranchée (décision 46, lecture (a)) ; plus aucune question ouverte.
- 08/10/2026 (soir) : couleurs de Noël et de Pâques choisies sur la planche (décision 47, CF26, CF-G).
