# Spec — partager une setlist hors planning avec des personnes choisies (PS)

Demande nouvelle de Timothée, faite le 08/10/2026 en commandant les specs du chantier « équipes et groupes ». Aucun
grill n'a eu lieu pour elle : la spec a proposé une lecture et des variantes, et Timothée a tranché ses questions le
08/10/2026 au soir (`docs/chantier-equipes-groupes/decisions.md`, décisions **39** et **45**, voir « Réponses de
Timothée »). La lecture retenue est désormais la **variante V1** : l'équipe **voit et modifie** la setlist.

Statut : **spec écrite, questions tranchées le 08/10/2026 (décisions 35 à 45), attend le go de Timothée**. Rien n'est
codé. Base de code : `ui/apple-design` à `5878ce1` (le code n'a pas changé depuis `439e5520`, base de la cartographie).
Sources : la demande ci-dessous, `docs/chantier-equipes-groupes/decisions.md` (vocabulaire, ordre des lots, règles
communes, décisions 39 et 45), `docs/chantier-equipes-groupes/cartographie.md` (§ « Chants, musiques et danses », lignes « Droits sur les
setlists » et « Outils déjà faits pour la régie »), le code relu ligne à ligne. Préfixe des règles et tranches : **PS**.

## La demande

> « J'aimerai que tu fasses ça aussi le Partage à certaines personnes (musiciens, chanteurs choriste) lors de la
> création d'une setlist hors planning. » (Timothée, 08/10/2026)

**Décisions du lot** : aucune décision de grill ; les réponses de Timothée du 08/10/2026 au soir (décisions 39 et 45,
section « Réponses de Timothée ») tranchent toutes les questions de la spec. Une règle qui suit l'une d'elles la cite ;
les autres restent des **choix de la spec**, acceptés avec le reste (décision 45).

**Maquettes** : aucune. Pas de planche pour cette demande dans `docs/chantier-equipes-groupes/maquettes/`, et **pas de
planche avant le code** (décision 45, question 8) : la place retenue (PS2) suit les gestes de l'éditeur existant
(puces de l'en-tête, volet de droite en grand, feuille sur téléphone) ; une planche ne se fait que si Timothée la
demande. Les captures des trois appareils sont regardées après le code.

**Vocabulaire** : dans le code et l'éditeur, « Partagée » veut déjà dire **non privée** (puce Visibilité,
`setlists.editeur.partagee`, `src/locales/fr.json:341`, 中文 « 共享 »), et « Partager » est le bouton qui copie le lien
(`setlists.detail.share`). Pour ne pas créer un troisième sens, l'écran parle de **l'équipe de la setlist** ; le code
parle de **partage** (fichier `partage.ts`, `rolesPartage`) et d'**éditeurs** (le champ `editeurs`, PS1). Cette spec
emploie les trois : « partager une setlist avec quelqu'un » = « le mettre dans l'équipe de la setlist » = « mettre son
uid dans `editeurs` ». Cette « équipe de la setlist » n'est ni une équipe (TEAM) de l'organigramme
(lots 1 et 2), ni « L'équipe de ce service » que le planning donne : c'est une liste de comptes choisis dans l'éditeur.
À l'écran, le mot FR « Équipe » est gardé (**décision 45**, question 8 : il prolonge la carte existante « L'équipe de
ce service », `setlists.apercu.equipe`, `src/locales/fr.json:335` ; la variante « Avec qui » est écartée). En 中文, **团队** sert déjà aux TEAM (`equipes.title` « 团队 »,
`src/locales/zh-CN.json:2576` ; le lot 1 propose `taches.champs.equipe` « 团队 », clé qui n'existe pas encore dans le
code) et à la colonne « Équipe » du planning Table (`planning.roles.equipe` « 团队 », `:1111`) : l'équipe d'une setlist prend donc le mot de la carte existante,
**服事团队** (`setlists.apercu.equipe` « 本次服事团队 », `src/locales/zh-CN.json:335`). Le double sens du mot FR
(TEAM des lots 1 et 2, équipe d'une setlist) est accepté (décision 45, question 8).

## Réponses de Timothée (08/10/2026, soir)

Source : `docs/chantier-equipes-groupes/decisions.md`, « Réponses de Timothée aux questions des specs », décisions **39**
et **45**. Elles l'emportent sur les recommandations de la première version de cette spec.

| # | Question de la spec | Réponse |
|---|---|---|
| 39 | Q1 — Voir seulement, ou aussi modifier ? | **Voir et modifier** (variante V1 retenue) : `canSeeSetlist` et `canEditSetlist` acceptent `editeurs ∋ uid` (PS7, PS8). |
| 39 | Q10 — Qui choisit l'équipe ? | **Le propriétaire de la setlist et les admins** seulement (PS6), imposé par les règles (`allow update`, « Droits en double »). |
| 45 | Q2 — La puce Équipe aussi sur une setlist liée au planning ? | **Oui, partout** (PS2) ; V2 écartée. |
| 45 | Q3 — Dans Mes services ? | **Non** (PS11) ; V3 écartée. |
| 45 | Q4 — Personnes sans compte ? | **Non** : comptes seulement, un nom se met dans les notes (PS3) ; V4 écartée. |
| 45 | Q5 — Un rôle Régie dans l'équipe ? | **Non** (PS3) ; V5 écartée. Pour les setlists de fête, le lot 4 ne retient que TEAM RÉGIE (`docs/spec-chants-fetes.md`, question 7). |
| 39, 45 | Q6 — Un seul champ avec le lot 4 ? | Tranchée par la décision 39 : **un seul champ, `editeurs`** (PS1). Avec « voir et modifier », un champ `partageAvec` serait toujours identique à `editeurs` ; il disparaît (choix de la spec, dit aussi dans `docs/spec-chants-fetes.md`). |
| 45 | Q7 — Prévenir à chaque ajout ? | **Une fois par personne**, par « Setlist prête » (PS13) ; pas de message à part. |
| 45 | Q8 — Planche ? Libellé ? | Libellé **« Équipe »** gardé (**服事团队** en 中文), « Avec qui » écarté ; **planche seulement si Timothée la demande** (« Maquettes », « À la mise en ligne »). |
| 45 | Q9 — Marque « Dans l'équipe » dans la liste ? | **Oui**, sur une setlist hors des catégories de la personne (PS10). |
| 45 | Q11 — Ordre et modèle du partage | **En parallèle des lots 1 et 3, avant le lot 4** ; **Opus 5.5, effort élevé** (« Place dans l'ordre des lots ») ; mise en ligne selon PS17. |

## Ce que le code fait aujourd'hui

### Créer une setlist « hors planning »

| Sujet | Fait | Où |
|---|---|---|
| Entrée | `/setlists/new` ouvre « Pour quel service ? » (les prochains services du planning sans setlist, « Préparer »). Toujours dessous : **« Autre setlist »** (`?autre=1`, l'éditeur vide : c'est la setlist hors planning d'aujourd'hui) et « Repartir d'une setlist passée ». | `src/app/setlists/new/CreateSetlistClient.tsx:70-81` ; `src/app/setlists/new/PourQuelService.tsx:55-58` ; `src/locales/fr.json:417-418` |
| « Séance hors planning (saisie manuelle) » | La clé `setlists.form.seanceManual` existe encore, avec `seanceLabel`, `seancePlaceholder`, `seanceRequired`, mais **aucun fichier de `src/` ne les lit** : vestige du formulaire en trois étapes (`spec-setlist.md`). Code mort signalé, pas retiré. | `src/locales/fr.json:271-274` (et `zh-CN.json:271-274`) |
| Rien ne marque une setlist « hors planning » | `FSSetlist` n'a aucun champ de rattachement au planning ; seul le commentaire de `moment` dit « Absent pour les setlists hors planning ». Le lien au planning est **calculé** : même catégorie et même date (Campus : même moment, sinon même présidence). | `src/lib/firebase/setlists.ts:23-42` (`:31-33`) ; `src/lib/planning/accueil.ts:69-77` (`setlistDuService`) |
| Champs de l'éditeur | Titre, date, présidence, catégorie, notes, `isPrivate`, `moment`, items ; `ownerId` = le créateur, gardé en modification. Présidence prise dans les séances de la catégorie, ou « Autre (saisie manuelle) » ; choisir une présidence pose la date de sa prochaine séance si la date n'est pas fixée. | `src/components/setlists/SetlistForm.tsx:104-116`, `:160-165`, `:219-235`, `:253-265` (`ownerId` `:264`) ; `src/locales/fr.json:276` |
| Brouillon et publication | En création, brouillon invisible (`isDraft: true`) au premier changement, ~2 s après ; « Publier » le passe à `false`. En modification, chaque changement part ~2 s après. | `SetlistForm.tsx:284-317`, `:356-385`, `:471-506` |
| Catégories proposées | `creatableCategories` (rôle ≥ « create » dans la catégorie), toutes pour un admin. | `SetlistForm.tsx:512-522` ; `src/lib/access.ts:414-418` |
| En-tête de l'éditeur | Puces Catégorie · Date · Moment (Campus) · Présidence · **Visibilité** (« Partagée » / « Privée ») ; une privée affiche « Setlist privée (visible uniquement par toi) ». | `src/components/setlists/editeur/EnTeteEditeur.tsx:134-229` (Visibilité `:218-228`), `:240-244` ; `src/locales/fr.json:323` |
| Volet de l'éditeur | Trois vues : réglages, bibliothèque, choix des chants à fusionner ; colonne de droite en grand, feuille sur téléphone et tablette portrait. | `src/components/setlists/editeur/useVolet.tsx:37` |

### Qui voit et qui modifie une setlist

| Droit | Client | Serveur |
|---|---|---|
| **Voir** | `canSeeSetlist` : propriétaire → oui ; **privée → non** ; admin → oui ; sinon la catégorie doit être dans `visibleCategories` (= les clés de `serviceRoles`, tout rôle, régie comprise). `src/lib/access.ts:440-449`, `:409-411` | **Aucun filtre** : `allow read: if signedIn()` sur toutes les setlists (`firestore.rules:303`), commentaire `:7-15`. Le filtrage est côté client, **choix assumé** (`CLAUDE.md`, « Confidentialité ») : rien à re-signaler. |
| **Modifier** | `canEditSetlist` : propriétaire ; privée → non ; admin ; sinon niveau « edit » dans la catégorie (musicien ou présidence). Un choriste est « create » : il crée, ne modifie pas celle des autres. `access.ts:471-481`, `:402-406` | `canEditSetlistDoc` (`firestore.rules:353-357`) avec `isEditorOf` (`:69-72`) ; `allow update` `:312-320` (propriétaire figé, catégorie déplacée seulement vers une où l'on sert) ; `allow delete` `:322` |
| Supprimer | `canDeleteSetlist = canEditSetlist` (`access.ts:487`) | `:322` |
| Version perso | `canHaveSetlistVersion = canSeeSetlist` (`access.ts:469`) | `versions/{uid}` écrit par son propriétaire, sans autre condition (`firestore.rules:342-348`) |
| Historique | écrit par qui modifie | `firestore.rules:327-336` (`canEditSetlistDoc`) |
| Dupliquer | `canDuplicateSetlist` : qui peut créer dans la catégorie (`access.ts:431-438`) ; la copie est **privée** et ne reprend pas le lien de présentation (`src/lib/firebase/setlists.ts:377-395`) | `allow create` `:305-306` |
| Lien de présentation | `canSetPresentationLink` = qui modifie, ou la régie de service si la setlist n'est pas privée (`access.ts:456-463`) | `/api/setlist/presentation` (Admin SDK) : `isOnDutyRegie` lit le planning (`src/app/api/setlist/presentation/route.ts:92-97` ; `src/lib/setlist/presentationLink.ts:22-39`) |

Une setlist **privée n'est vue que de son propriétaire** (`access.ts:445-446`) et ne paraît dans aucune liste des
autres : `getSetlists` retire privées et brouillons (`src/lib/firebase/setlists.ts:137-155`), `getMySetlists` ne rend
que les privées de l'appelant (`:253-284`), `getSetlistsSince` (cloche) retire les privées (`:250`).

### Où une setlist se trouve, et ce que le planning lui apporte

| Endroit | Aujourd'hui | Où |
|---|---|---|
| Liste Setlists (À venir, Passées) | `getSetlists()` ; filtre **écrit à part** de `canSeeSetlist` : catégorie dans `myCategories` ou propriétaire. Filtre « Mes services » (coché par défaut) : seulement les dates où l'on sert au planning, ou ses propres setlists. Onglet « mine » : ses privées. Cadenas sur une privée. | `src/app/setlists/page.tsx:105-118`, `:131-150` (filtre `:136-146`) ; `src/hooks/useSetlistsNavState.ts:6` ; `src/components/setlists/SetlistCard.tsx:53-55` |
| Chants › Prochaines setlists | `getSetlistsFrom(today, 30)` (rien de filtré à la lecture, privées comprises) puis `canSeeSetlist` | `src/lib/setlist/upcoming.ts:10-23` ; `src/app/songs/ChoisisUnChant.tsx:43`, `:110` |
| Mes services, accueil | Les **services viennent du planning** (`servicesDuCompte`) ; la setlist d'un service est cherchée par catégorie et date parmi `getSetlists()`, filtrée par `canSeeSetlist`. Une setlist hors planning n'y paraît jamais. | `src/components/mesServices/SectionMesServices.tsx:87-117` ; `src/lib/petitdej/services.ts:30` ; `src/app/planning/page.tsx:112-122` |
| Cloche | Setlists créées ou modifiées, filtrées par **catégorie** du profil (pas par `canSeeSetlist`), privées exclues | `src/hooks/useNotifications.ts:101-116` |
| Calendrier, « Repartir d'une setlist passée » | Eux aussi filtrent par `canSeeSetlist`, sur des lectures qui écartent les privées (`getSetlists`). | `src/lib/calendrier/entrees.ts:262`, `:471` ; `src/lib/calendrier/charger.ts:73` ; `src/app/setlists/new/SetlistsPassees.tsx:31-32`, `:48` |
| **L'équipe** | Carte « L'équipe de ce service · d'après le planning » : rôles et noms lus dans la ligne du planning (catégorie, date, moment). Hors planning : **vide, la carte n'est pas rendue**. Montrée dans l'aperçu en grand de Setlists et dans un service de Mes services, pas sur la page d'une setlist. | `src/lib/setlist/equipeDuService.ts:23-89` ; `src/components/setlists/CarteEquipe.tsx:29-47` ; `src/components/setlists/ApercuSetlist.tsx:45`, `:107` ; `src/components/mesServices/DetailService.tsx:72-78` ; `src/locales/fr.json:335-336` |
| **« Setlist prête »** (push) | Route `/api/push/notify-setlist`, appelée à « Publier » et en quittant l'éditeur (jamais pour une privée), et par « Prévenir l'équipe ». Destinataires = **choristes, musiciens et régie inscrits au planning** ce jour-là dans la catégorie (`servantsForDate`), noms appariés aux comptes, préférence « Setlist prête » (`setlists`). Auto : une seule fois, dès qu'au moins un destinataire est touché ; manuel : une fois par 24 h. Une privée : rien. **Hors planning : personne.** | `src/app/api/push/notify-setlist/route.ts:13-25`, `:69-73`, `:103-119`, `:121-141`, `:162-167` ; `SetlistForm.tsx:389-403`, `:499` ; `src/app/setlists/[id]/SetlistDetailClient.tsx:1313` ; `src/lib/push/messages.ts:10-22` ; `src/types/user.ts:95`, `:113` |
| « Présentation prête » (push au président) | Quand la régie pose le lien de présentation, les comptes dont le nom de planning est celui de la présidence sont prévenus (`docs/spec-notif-president.md`). Ce n'est **pas** « Setlist prête ». | `src/lib/setlist/presentationLink.ts` ; `docs/spec-notif-president.md` |
| Régie de service | Reconnue seulement par le planning du jour (`isOnDutyRegie`) ; hors planning, aucune régie ne peut poser le lien sans droit de modifier. | `presentationLink.ts:22-39` |
| « Pour quel service ? » | Ne propose que des séances du planning ; une setlist privée ne retire pas son service. | `src/lib/setlist/prochainsServices.ts:29-42` |

**D'où vient la demande, sans doute** : hors planning, personne n'est « l'équipe » de la setlist. Elle n'apparaît que
dans les catégories où l'on sert (un musicien d'un autre groupe ne la voit pas), une privée n'est vue de personne,
« Setlist prête » ne part vers personne et la carte de l'équipe est vide.

### Comptes et rôles

`listProfiles()` lit tous les profils (lecture permise à tout connecté, `firestore.rules:82-84`) avec `planningName`,
prénom, nom et `serviceRoles` (`src/lib/firebase/users.ts:85-104`). Rôles de service : `chanteur` (libellé
« Choriste »), `musicien`, `presidence`, `regie` (`src/types/user.ts:1-2`, `:8-13`). Le champ `groupe` du profil
n'existe pas encore (lot 2, décision 14) ; ce lot n'en a pas besoin.

## Lecture retenue (V1) et variantes écartées

**Retenue** (décision 39 ; décision 45 pour le reste) : dans l'éditeur (création et modification), une puce
**« Équipe »** ouvre « L'équipe de cette setlist » : le propriétaire (ou un admin) y ajoute des **comptes**, proposés
d'abord parmi les musiciens et choristes de la catégorie de la setlist, chacun marqué **Musicien** ou **Choriste**. Ces
personnes :
- **voient et modifient** la setlist (chants, ordre, tonalités, structure, notes, titre, date, présidence), même
  privée et même hors de leurs catégories (décision 39) ; elles ne la **suppriment** pas et ne changent ni l'équipe, ni
  le rôle de chacun, ni la visibilité (privée ou non), ni le propriétaire (**choix de la spec**, PS8) ;
- la trouvent dans **Setlists** (À venir, Passées, filtre « Mes services » compris) et dans Chants › Prochaines
  setlists (et, si elle n'est pas privée, au calendrier : il filtre déjà par `canSeeSetlist`) ; **pas** dans Mes
  services (décision 45, question 3) ;
- reçoivent **« Setlist prête »** (préférence existante), chacune une fois (décision 45, question 7) ;
- apparaissent comme **l'équipe de la setlist** dans l'aperçu.

Seuls **le propriétaire et les admins** changent la liste des personnes (décision 39, question 10) ; les règles
l'imposent. Conséquence : **`firestore.rules` change** pour les setlists (PS8, « Droits en double ») et **Timothée publie
les règles**, après la bascule du lot 1 ou dans la même séance.

| Variante | Ce qui aurait changé | Sort |
|---|---|---|
| V1 — l'équipe **modifie** aussi | Une seule liste à l'écran, un seul champ `editeurs` (PS1) ; `canEditSetlist` et `canEditSetlistDoc` l'acceptent ; seuls le propriétaire et les admins la changent | **Retenue** (décision 39) : c'est la lecture de cette spec |
| V2 — la section seulement **hors planning** | La puce n'apparaît que si aucune séance du planning n'a la catégorie et la date de la setlist | **Écartée** : la puce est partout (décision 45, question 2) |
| V3 — dans **Mes services** aussi | Une setlist dont on est de l'équipe devient un service de la personne | **Écartée** (décision 45, question 3) |
| V4 — des **personnes sans compte** | Un nom libre dans l'équipe (affiché seulement) | **Écartée** (décision 45, question 4) : un nom se met dans les notes |
| V5 — rôle **Régie** | Un troisième rôle ; la régie choisie pose le lien de présentation | **Écartée** (décision 45, question 5) ; le lot 4 ne retient que TEAM RÉGIE pour les setlists de fête (`docs/spec-chants-fetes.md`, question 7) |

## Règles

Chaque règle cite la décision qu'elle suit (39 ou 45, voir « Réponses de Timothée ») ; une règle sans décision est un
**choix de la spec**, accepté avec le reste (décision 45).

| # | Règle |
|---|---|
| PS1 | **Champs** (`FSSetlist`, `src/lib/firebase/setlists.ts`) : `editeurs?: string[]` (uids des personnes de l'équipe, qui **voient et modifient**, décision 39) et `rolesPartage?: Record<string, "musicien" \| "chanteur">` (le rôle de chacune, pour l'affichage). Absents = aucune personne. Une clé de `rolesPartage` absente de `editeurs` est ignorée ; un uid de `editeurs` sans rôle s'affiche en Musicien. **Un seul champ** pour les deux usages, le même que celui du lot 4 (`docs/spec-chants-fetes.md`, § « Setlist de fête » du modèle de données, champ `editeurs`) : pour une setlist **de fête**, `editeurs` est écrit **par le serveur seul** (recopie des ayants droit, décisions 30 et 35) ; pour une setlist **ordinaire**, `editeurs` est « l'équipe » choisie dans l'éditeur, écrit à la création par son créateur, ensuite par le propriétaire ou un admin seulement (décision 39), et les règles l'imposent (PS8). **Choix de la spec** : le champ `partageAvec` (qui voit) que proposait la première version de cette spec **disparaît** : avec « voir et modifier » (décision 39), il serait toujours identique à `editeurs` ; un champ suffit (ancienne question 6). Une liste d'uids simple se cherche par `ARRAY_CONTAINS` (index simple, automatique) ; le rôle à part ne sert qu'à l'écran. |
| PS2 | **Place dans l'éditeur** : une puce **« Équipe »** (icône de personnes, « Équipe · 3 » quand il y en a) après la puce Visibilité de `EnTeteEditeur`, en création comme en modification, pour **toute** setlist, liée au planning ou non (décision 45, question 2), sauf une setlist de fête (lot 4, qui n'a pas ces puces). Elle est **active** pour qui peut changer l'équipe (`canSetSetlistTeam`, PS6 : le propriétaire, ou un admin sur une setlist qu'il peut modifier) ; pour les autres personnes qui ouvrent l'éditeur (l'équipe elle-même, un musicien ou la présidence de la catégorie), la vue s'ouvre **en lecture** (liste sans « Ajouter », sans « Retirer », rôles non changeables) avec la phrase `setlists.equipe.lectureSeule` ; sans personne dans l'équipe, la puce ne leur est pas montrée. La puce **Visibilité** est, de même, en lecture pour qui n'a que le droit de l'équipe (`canDeleteSetlist` faux, PS8). Elle ouvre la vue « L'équipe de cette setlist » du volet : colonne de droite en grand (ordinateur, tablette paysage), feuille sur téléphone et tablette portrait, comme les réglages d'un chant. Câblage : `useVolet` (créé par `EditeurDeuxColonnes` et `EditeurFeuilles`) gagne la vue `{ nom: "equipe" }` et l'état de l'équipe ; `ChampsEnTete` gagne `equipe` (le compte et la liste) et `ouvrirEquipe`, comme `ouvrirBibliotheque` ouvre la bibliothèque ; à la fermeture de la feuille, le focus revient à la puce (`EditeurFeuilles.tsx`, `onCloseAutoFocus`). |
| PS3 | **La vue « L'équipe de cette setlist »** : la phrase « Les personnes choisies voient et modifient la setlist, même privée, et sont prévenues quand elle est prête. » ; la liste des personnes (nom, rôle Musicien · Choriste en deux pilules, « Retirer ») ; « Ajouter quelqu'un » ouvre **une seule recherche** : d'abord « Musiciens et choristes de {catégorie} » (comptes dont `serviceRoles[catégorie]` contient `musicien` ou `chanteur` ; sans catégorie choisie, ce groupe est absent), puis « Voir tous les comptes » (tous les profils, par nom). **Comptes seulement**, aucun nom libre (décision 45, question 4). Pas de rôle Régie (décision 45, question 5). Une personne déjà dans l'équipe porte « Dans l'équipe ». Le propriétaire n'est pas proposé. Les profils viennent de `listProfiles()` (`src/lib/firebase/users.ts:85-104`, lecture permise à tout connecté, `firestore.rules:82-84`), lu à l'ouverture de la vue (le commentaire de la fonction dit « réservé à la page admin », mais d'autres écrans la lisent déjà, `src/components/taches/creerTache.ts:7`) : tout créateur de setlist lit alors les profils ; la confidentialité reste celle assumée dans `CLAUDE.md`. |
| PS4 | **Rôle par défaut** à l'ajout : `musicien` si la personne l'a dans la catégorie, sinon `chanteur` si elle l'a dans la catégorie, sinon `musicien` si elle l'a ailleurs, sinon `chanteur`. Changeable d'un toucher. |
| PS5 | **Nom affiché** : le nom de planning, sinon prénom et initiale du nom (règle d'`historyAuthor`, `src/lib/firebase/setlistHistory.ts:70-78`, reprise en fonction pure). Un uid sans profil n'est pas affiché. |
| PS6 | **Enregistrement et qui choisit l'équipe** : **le propriétaire et les admins seulement** (décision 39, question 10) : nouvelle fonction `canSetSetlistTeam(user, profile, setlist)` = `canEditSetlist` **et** (propriétaire **ou** admin) ; en création, le créateur (futur propriétaire). Un admin ne la change donc que sur une setlist qu'il peut modifier : pas sur la privée d'un autre, comme aujourd'hui. Les deux champs ne font partie du `payload` de `SetlistForm` (`:253-265`) **que pour qui peut changer l'équipe** : brouillon, « Publier » et enregistrement automatique les emportent alors ; pour les autres, ils sont **hors du payload**, donc hors du masque du `PATCH` de `updateSetlist` (`src/lib/firebase/setlists.ts:322-346`, `updateMask.fieldPaths` = les clés envoyées) et jamais réécrits (sans cela, un musicien de la catégorie qui enregistre ajouterait `editeurs: []` à une setlist qui ne l'a pas, et les règles refuseraient). Un champ vide n'est écrit que s'il existait déjà (retirer la dernière personne écrit `[]`). La modification les relit (`EditSetlistClient.tsx:36-46`). |
| PS7 | **Voir** (décision 39) : `canSeeSetlist` rend vrai quand `editeurs` contient l'uid, **avant** le refus des privées. Une setlist **privée** avec une équipe est donc vue de son propriétaire et de son équipe seulement (« privée à ces personnes »). Un brouillon n'est vu de personne d'autre (les listes et `getSetlistsPartagees` écartent `isDraft` ; la page par son adresse ne le fait pas, comme aujourd'hui). « Privée à ces personnes » vaut pour le site : le filtre est côté client, comme pour toute setlist privée (choix assumé de `CLAUDE.md`, « Confidentialité » : un compte connecté peut techniquement la lire en REST, rien à re-signaler). |
| PS8 | **Modifier** (décision 39) : `canEditSetlist` rend vrai quand `editeurs` contient l'uid, **avant** le refus des privées ; une setlist **privée** avec une équipe est donc modifiable par son propriétaire et son équipe. **Choix de la spec** : une personne de l'équipe **ne supprime pas** la setlist et ne change ni `editeurs`, ni `rolesPartage`, ni `isPrivate`, ni `ownerId`. `canDeleteSetlist` n'est donc **plus égal** à `canEditSetlist` (`src/lib/access.ts:487`) : il garde la logique d'aujourd'hui (propriétaire ; privée → non ; admin ; niveau « edit » dans la catégorie), et `canEditSetlist` = `canDeleteSetlist` **ou** `editeurs ∋ uid`. Miroirs : `canDeleteSetlistDoc` et `canEditSetlistDoc` dans `firestore.rules` (« Droits en double »). Ce que l'équipe gagne avec le droit de modifier, sans rien de plus à coder : l'éditeur (`EditSetlistClient.tsx:70`), « Prévenir l'équipe » (`canNotifyTeam = canEdit`, `SetlistDetailClient.tsx:1313`, PS13), le lien de présentation (`canSetPresentationLink` suit `canEditSetlist`, `src/lib/access.ts:456-463` ; la route le relit dans le document, `src/app/api/setlist/presentation/route.ts:92-97`), l'**historique** : une modification faite par une personne de l'équipe s'écrit **sous son nom** (`historyAuthor`, `src/lib/firebase/setlistHistory.ts:70-78` ; règle `history` par `canEditSetlistDoc`, `firestore.rules:327-336`). Une personne de l'équipe garde aussi sa **version perso** (`canHaveSetlistVersion = canSeeSetlist`). « Dupliquer » ne change pas (`canDuplicateSetlist` : qui peut créer dans la catégorie). |
| PS9 | **Retirer** une personne : elle ne voit plus la setlist au prochain chargement ; aucune notification. |
| PS10 | **Setlists (liste)** : la page lit en plus `getSetlistsPartagees(uid)` (nouveau : `ARRAY_CONTAINS` sur `editeurs`, brouillons écartés, **et refiltrée côté client par `estDansLePartage`** : la requête n'est pas crue sur parole, et la fausse base des tests ignore les `where`) et fusionne par id ; le filtre d'affichage des onglets À venir et Passées devient `canSeeSetlist` (une seule règle, comme l'aperçu `:155-160`). Le filtre « Mes services » laisse passer une setlist dont on est de l'équipe, comme ses propres setlists. Une setlist de l'équipe hors de ses catégories porte la marque **« Dans l'équipe »** (décision 45, question 9) ; une privée garde son cadenas. L'onglet « mine » reste ses propres privées. Le bouton de suppression (groupée ou non) suit `canDeleteSetlist` (`src/app/setlists/page.tsx:172`) : il n'apparaît pas pour l'équipe. Après le lot 4, `getSetlistsPartagees` rend aussi les setlists de fête dont on est éditeur ; leur affichage et leurs marques sont ceux du lot 4 (`docs/spec-chants-fetes.md`, CF13, CF24). |
| PS11 | **Chants › Prochaines setlists** : rien à coder, `upcomingSetlists` passe par `canSeeSetlist` et sa lecture n'écarte pas les privées. **Calendrier, accueil, Mes services, « Repartir d'une setlist passée »** : ils filtrent aussi par `canSeeSetlist` mais lisent sans les privées : une setlist **non privée** partagée y paraît d'elle-même ; une **privée** partagée n'y paraît pas (hors périmètre). Mes services reste le reflet du planning : une setlist dont on est de l'équipe n'y devient pas un service (décision 45, question 3). |
| PS12 | **Carte de l'équipe** (aperçu en grand, `ApercuSetlist`) : sans équipe au planning, la carte devient « L'équipe de cette setlist · choisie dans la setlist », lignes Musiciens puis Choristes (clés `planning.roles.musiciens` et `planning.roles.choristes`, `src/locales/fr.json:1092-1108`). Avec une équipe au planning, la carte du planning reste (« L'équipe de ce service », sous-titre « d'après le planning et la setlist ») et les personnes choisies s'ajoutent à sa ligne Musiciens ou Choristes **quand elle existe** (Musiciens : Groupe Paix, Groupe Bonté, Campus ; Choristes : Culte Francophone, Interfranco, Intergroupe, Campus, `equipeDuService.ts:29-75`), sinon une ligne Musiciens ou Choristes est **ajoutée en bas de la carte** (les cultes n'ont que Piano, Guitare, Batterie…, Fidélité et les classes de l'EDD n'ont ni l'une ni l'autre) ; sans doublon de nom (`normalizeName`). **Noms** : ceux de `nomCourt` (PS5), lus dans `listProfiles()` seulement quand la setlist choisie a une équipe. **Pastille** : `monNom` vaut `planningName`, sinon `nomCourt` du compte (`monNom={profile?.planningName ?? ""}`, `src/app/setlists/page.tsx:495`, laisserait sans pastille quelqu'un qui n'a pas de nom de planning). |
| PS13 | **« Setlist prête »** : destinataires = l'équipe du planning (comme aujourd'hui) **plus** les personnes de `editeurs` (préférence « Setlist prête », sans nouveau type ni message à part). Une setlist **privée** avec une équipe prévient **sa seule équipe** (jamais l'équipe du planning) ; sans équipe, rien, comme aujourd'hui. Le serveur lit `editeurs` dans le document, jamais dans la requête. Chaque personne de l'équipe est prévenue **une fois** en automatique (décision 45, question 7) : `notifLog/setlist-{id}` garde `partagePrevenus` (écrit en `FieldValue.arrayUnion` dans le `logRef.set` du `route.ts:162-167`) ; une personne ajoutée après le premier envoi l'est au prochain enregistrement qui sort de l'éditeur (ou à « Publier »). **« Prévenir l'équipe »** (manuel, 24 h) envoie à tous ; il se déclenche par **qui peut modifier la setlist, comme aujourd'hui, l'équipe comprise** (`canNotifyTeam = canEdit`, `SetlistDetailClient.tsx:1313`, inchangé : `canEditSetlist` accepte l'équipe, PS8). L'éditeur appelle la route quand la setlist n'est pas privée **ou** a une équipe (`SetlistForm.tsx:398`, `:499`). **Ce que la route change** (`notify-setlist/route.ts`) : le refus des privées (`:69-73`, aujourd'hui sans exception, en auto comme en manuel) ne vaut plus qu'**en l'absence d'équipe** ; une privée ne calcule pas l'équipe du planning (`:121-135`) ; la garde « déjà envoyé » de l'auto (`:108-112`) ne retient plus que l'équipe du planning : une personne de `editeurs` absente de `partagePrevenus` est prévenue même si le planning l'a déjà été, et sans personne nouvelle la réponse reste `already-sent` ; les uids du planning et de l'équipe sont réunis sans doublon avant `filterUidsByNotifPref`. **Autorisation** (`:86-101`) : aujourd'hui propriétaire, admin ou exécutant de la catégorie ; elle accepte en plus **une personne de `editeurs`**. Pour une **privée avec équipe**, seuls ceux qui peuvent la modifier déclenchent l'envoi : son propriétaire et son équipe (`canEditSetlist`, lu dans le document comme le fait déjà `/api/setlist/presentation`) ; un exécutant de la catégorie hors équipe ne le peut pas (aujourd'hui le refus des privées vient avant l'autorisation et couvre tout le monde). En une ligne : autorisé = `canEditSetlist(document)` **ou** (non privée **et** (admin **ou** exécutant de la catégorie)). |
| PS14 | **Textes des droits** : sur la page de la setlist, la ligne des droits dit, pour une **privée avec équipe**, « Privée — visible et modifiable par son créateur et son équipe » (`SetlistDetailClient.tsx:1363-1368`) ; pour une **non privée avec équipe**, « Modifiable par : créateur, son équipe, musiciens et présidence de {{category}}, et admins ». « Partager » sur une privée avec équipe copie le lien et dit « Setlist privée — seule son équipe pourra l'ouvrir » au lieu de refuser (`:813-816`). Sans équipe, les textes d'aujourd'hui restent. Dans l'éditeur, une privée avec équipe dit « Privée : visible et modifiable par son créateur et son équipe » (`EnTeteEditeur.tsx:240-244` ; formulé sans « toi », car une personne de l'équipe ouvre aussi l'éditeur). Le bouton « Supprimer » de la page suit `canDeleteSetlist` (`SetlistDetailClient.tsx:1298`) : absent pour l'équipe. |
| PS15 | **Dupliquer** ne recopie pas l'équipe (la copie est privée et personnelle, comme le lien de présentation). |
| PS16 | **Libellés FR et 中文** (中文 relu par Timothée) — tableau ci-dessous. |
| PS17 | **En ligne** : les setlists sont en ligne, hors `BACK_OFFICE` (`src/lib/backOffice.ts:5`). Ce lot **n'est pas** une fonctionnalité de back-office : il ne passe pas derrière l'interrupteur et part en ligne par une fusion de `ui/apple-design` sur `main`, **sur ordre explicite de Timothée**, **après** la publication des règles de ce lot (PS8 : sans elles, une modification faite par l'équipe serait refusée en ligne). Cette fusion emporte aussi le code des autres lots déjà sur la branche : elle se fait quand ces lots sont prêts à partir (règles du lot 1 publiées et migration faite), ou bien Timothée décide d'un report ciblé du seul partage sur `main` (décision 45, question 11 ; ordre de Timothée donné au moment même). Le test sur le second serveur vérifie qu'il y est bien (et que rien d'autre ne change). |

**Libellés proposés**

| Clé (proposée) | FR | 中文 (à relire) |
|---|---|---|
| `setlists.equipe.puce` | Équipe | 服事团队 |
| `setlists.equipe.titre` | L'équipe de cette setlist | 本歌单服事团队 |
| `setlists.equipe.aide` | Les personnes choisies voient et modifient la setlist, même privée, et sont prévenues quand elle est prête. | 选中的人可以查看和编辑此歌单（即使是私人歌单），歌单就绪时会收到通知。 |
| `setlists.equipe.lectureSeule` (vue en lecture, PS2) | Seuls son créateur et les admins changent l'équipe. | 只有创建者和管理员可以更改服事团队。 |
| `setlists.equipe.ajouter` | Ajouter quelqu'un | 添加成员 |
| `setlists.equipe.recherche` | Chercher un nom… | 搜索姓名… |
| `setlists.equipe.duService` (`{{categorie}}` = le nom traduit, `t("categories." + cat)`) | Musiciens et choristes de {{categorie}} | {{categorie}}的乐手与和声 |
| `setlists.equipe.tous` | Voir tous les comptes | 查看所有账号 |
| `setlists.equipe.dejaLa` | Dans l'équipe | 已在服事团队中 |
| `setlists.equipe.retirer` | Retirer {{nom}} | 移除{{nom}} |
| `setlists.equipe.choisie` (sous-titre de la carte) | choisie dans la setlist | 在歌单中选定 |
| `setlists.equipe.planningEtChoisie` (sous-titre de la carte du planning, quand des personnes s'y ajoutent) | d'après le planning et la setlist | 根据排班表与歌单 |
| `setlists.equipe.priveeAvecEquipe` | Privée : visible et modifiable par son créateur et son équipe | 私人：仅创建者及其服事团队可查看和编辑 |
| `setlists.detail.editableByOwnerEquipe` | Privée — visible et modifiable par son créateur et son équipe | 私人——仅创建者及其服事团队可见和编辑 |
| `setlists.detail.editableByEquipe` (`{{category}}` comme `editableBy`) | Modifiable par : créateur, son équipe, musiciens et présidence de {{category}}, et admins | 可编辑者：创建者、其服事团队、{{category}}的乐手／主领和管理员 |
| `setlists.detail.sharePrivateEquipe` | Setlist privée — seule son équipe pourra l'ouvrir | 私人歌单——只有其服事团队可以打开 |
| Rôles | reprendre `performance.roles.choriste` (Choriste / 和声) et `equipes.role.musicien` (Musicien / 乐手) | existants |

## Tranches de code

| Tranche | Ce qui change | Fichiers touchés | Ordre / conflits |
|---|---|---|---|
| **PS-A — Modèle, droits et règles** | PS1, PS4, PS5, PS7, PS8, droits de PS6 ; `getSetlistsPartagees(uid)` ; `canSeeSetlist`, `canEditSetlist`, `canDeleteSetlist` (séparé), `canSetSetlistTeam` (nouveau) ; fonctions pures : `estDansLePartage(setlist, uid)` (lit `editeurs` ; nom choisi pour ne pas croiser `estDeLEquipe` du lot 1, qui dit l'appartenance à une TEAM), `candidatsDeLEquipe(profils, categorie, ownerId)`, `roleParDefaut(profil, categorie)`, `nomCourt(profil)`, `equipeDeLaSetlist(lignesDuPlanning, setlist, profils)`, `aPrevenir(setlist, prevenus, auto)` ; `firestore.rules` : `canDeleteSetlistDoc`, `canEditSetlistDoc`, `allow update`, `allow delete`, commentaire d'en-tête (« Droits en double ») | `src/lib/firebase/setlists.ts`, `src/lib/access.ts`, `src/lib/setlist/partage.ts` (nouveau), `firestore.rules`, `tests/coherence.spec.ts` (test I1, voir les tests) | En premier. `access.ts` et `firestore.rules` sont aussi touchés par le lot 1 (fonctions et règles des pôles) : fonctions différentes, partir de leur état ; simple fusion. |
| **PS-B — L'éditeur** | PS2, PS3, PS6 (payload), PS14 (éditeur), PS16 | `src/components/setlists/SetlistForm.tsx`, `src/app/setlists/[id]/edit/EditSetlistClient.tsx`, `src/components/setlists/editeur/EnTeteEditeur.tsx` (puce Équipe, puce Visibilité en lecture), `src/components/setlists/editeur/useVolet.tsx` (vue `equipe`), `src/components/setlists/editeur/VoletEquipe.tsx` (nouveau), `src/components/setlists/editeur/EditeurDeuxColonnes.tsx`, `src/components/setlists/editeur/EditeurFeuilles.tsx` (`useVolet`, `ouvrirEquipe`, focus de retour), `src/locales/fr.json`, `src/locales/zh-CN.json` | Après PS-A. Le lot 4 touche les mêmes fichiers (`SetlistForm`, `EnTeteEditeur`, CF19) : **PS avant le lot 4**. |
| **PS-C — Où la trouver** | PS10, PS12, PS14 (page), PS15 | `src/app/setlists/page.tsx`, `src/components/setlists/SetlistCard.tsx` (marque), `src/components/setlists/ApercuSetlist.tsx`, `src/components/setlists/CarteEquipe.tsx` (titre et sous-titre en paramètre), `src/app/setlists/[id]/SetlistDetailClient.tsx`, locales | Après PS-A ; parallèle à PS-B (fichiers distincts, locales à fusionner). |
| **PS-D — « Setlist prête »** | PS13 | `src/app/api/push/notify-setlist/route.ts` (destinataires, garde des privées, autorisation), `src/components/setlists/SetlistForm.tsx` (condition d'appel) | Après PS-B (même fichier `SetlistForm`). Le lot 4 touche la même route (CF24 : 404 pour une setlist de fête) : PS d'abord. |

**Place dans l'ordre des lots** (décision 45, question 11) : le partage se code **en parallèle des lots 1 et 3**, en
tout cas **avant le lot 4**, avec **Opus 5.5, effort élevé**. Il ne dépend d'aucun des lots 1 à 4 (il lit
`serviceRoles`, pas `groupe` ni les rôles d'organigramme), mais le lot 4 reprend les mêmes fichiers (`SetlistForm`,
`EnTeteEditeur`, `EditSetlistClient`, `SetlistDetailClient`, `SetlistCard`, `ApercuSetlist`, `setlists/page.tsx`,
`setlists.ts`, `access.ts`, `firestore.rules`, la route `notify-setlist`, tranches CF-B, CF-D et CF-E de
`docs/spec-chants-fetes.md`) **et le même champ `editeurs`** (PS1) : le lot 4 part de l'état laissé par PS-A à PS-D et
n'ajoute à `canEditSetlistDoc` que ce qui est propre aux fêtes (la coordination, `fete` et `editeurs` écrits par le
serveur seul). Tout se fait sur `ui/apple-design`, un commit par tranche, message en français.

## Droits en double

| Droit | `src/lib/access.ts` (client) | `firestore.rules` (serveur) | Route serveur |
|---|---|---|---|
| Voir une setlist dont on est de l'équipe (même privée) | `canSeeSetlist` (`:440-449`) : branche `editeurs ∋ uid` avant le refus des privées | **inchangé** : `allow read: if signedIn()` (`:303`) ; filtrage client, choix assumé | — |
| Modifier la setlist (décision 39) | `canEditSetlist` (`:471-481`) = `canDeleteSetlist` **ou** `editeurs ∋ uid` (branche avant le refus des privées) | `canEditSetlistDoc` (`:353-357`) = `canDeleteSetlistDoc(setlist) \|\| request.auth.uid in setlist.get('editeurs', [])` ; `allow update` (`:312-320`) garde ses conditions (propriétaire figé, catégorie) | — |
| Supprimer la setlist (l'équipe ne supprime pas, PS8) | `canDeleteSetlist` (`:487`) n'est **plus** `= canEditSetlist` : il garde la logique d'aujourd'hui (propriétaire ; privée → non ; admin ; niveau « edit ») ; son commentaire le dit | nouvelle fonction `canDeleteSetlistDoc(setlist)` = le corps d'aujourd'hui de `canEditSetlistDoc` ; `allow delete` (`:322`) passe par elle | — |
| Choisir l'équipe : écrire `editeurs`, `rolesPartage` (décision 39) | `canSetSetlistTeam` (nouveau, PS6) = `canEditSetlist` **et** (propriétaire **ou** admin) ; l'éditeur ne met ces champs dans le payload que pour elle | `allow update` ajoute : `resource.data.get('ownerId', '') == request.auth.uid \|\| isAdmin() \|\| !request.resource.data.diff(resource.data).affectedKeys().hasAny(['editeurs', 'rolesPartage'])` ; `allow create` (`:305-306`) **inchangé** : le créateur, qui se déclare propriétaire, peut y écrire `editeurs` (le lot 4 ne refuse `editeurs` à la création que pour une setlist de fête, `docs/spec-chants-fetes.md`, « Droits en double », ligne « Créer une setlist de fête ») | — |
| Changer la visibilité (`isPrivate`) : pas l'équipe (PS8) | puce Visibilité en lecture quand `canDeleteSetlist` est faux (PS2) | `allow update` ajoute : `canDeleteSetlistDoc(resource.data) \|\| !request.resource.data.diff(resource.data).affectedKeys().hasAny(['isPrivate'])` | — |
| `ownerId` | inchangé (l'éditeur le garde) | **inchangé** : `ownerId` figé pour tous (`:313`) | — |
| Historique | écrit par qui modifie, sous son nom (`historyAuthor`) | **inchangé** dans le texte : `history` passe par `canEditSetlistDoc` (`:327-336`), qui accepte désormais l'équipe | — |
| Version perso d'une personne de l'équipe | `canHaveSetlistVersion` (`:469`) suit `canSeeSetlist` | **inchangé** : `versions/{uid}` (`:342-348`) | — |
| « Setlist prête » à l'équipe | « Prévenir l'équipe » = `canEdit` (`SetlistDetailClient.tsx:1313`), inchangé dans le texte (l'équipe comprise) | — | `/api/push/notify-setlist` (Admin SDK) : autorisé = `canEditSetlist(document)` ou (non privée et (admin ou exécutant de la catégorie)) (`:86-101`, PS13) ; destinataires lus dans le document |
| Lien de présentation | `canSetPresentationLink` suit `canEditSetlist` : l'équipe le pose | — | `/api/setlist/presentation` inchangée : elle relit le document et appelle `canEditSetlist` (`route.ts:92-97`) ; pas de régie d'équipe (décision 45, question 5) |

Le commentaire d'en-tête de `firestore.rules` (`:7-15`, « modification/suppression réservées au créateur… ») gagne la
phrase : « L'équipe d'une setlist (`editeurs`, choisie par son propriétaire ou un admin) la voit et la modifie, même
privée ; elle ne la supprime pas et ne change ni `editeurs`, ni `rolesPartage`, ni `isPrivate`. » Le commentaire
au-dessus de `canEditSetlistDoc` (« une setlist privée ne se modifie que par son propriétaire ») dit « par son
propriétaire et son équipe ».

**Timothée publie les règles** : `firestore.rules` change (`canDeleteSetlistDoc`, `canEditSetlistDoc`, `allow update`,
`allow delete`) ; il le publie lui-même dans la console Firebase, **avant** la fusion sur `main` (PS17). Le fichier est
**unique** : le publier publie aussi les règles des lots déjà sur la branche ; la bascule du lot 1
(`docs/spec-equipes-sans-poles.md`, § « Ordre de la bascule ») est donc faite **avant, ou dans la même séance**. Tant
que les règles ne sont pas publiées, une modification faite par une personne de l'équipe est refusée par le vrai
Firestore, en local comme en ligne (les tests, simulés, n'en dépendent pas).

## Migration des données

**Aucune.** Les deux champs sont facultatifs ; absents, la setlist se comporte comme aujourd'hui. Aucun script, aucune
lecture de la vraie base. `notifLog/setlist-{id}` gagne `partagePrevenus` à son premier envoi (absent = personne).

## Tests Playwright à écrire d'abord (vus rouges)

Session et Firestore simulés (`tests/helpers/fakeSession.ts`) : aucune lecture ni écriture de la vraie base. Personnes
fictives : **Léa M.** (choriste du Culte Francophone, propriétaire), **Joël F.** (musicien du Groupe Paix seulement),
**Hugo L.** (choriste du Groupe Bonté seulement), plus un musicien du Culte Francophone hors équipe. Joël et Hugo ont un nom de
planning (sans lui, le filtre « Mes services » ne s'applique pas, `src/app/setlists/page.tsx:133`) ; une variante de Joël n'en a pas (pastille PS12). La fausse base
ignore les filtres `where` d'une requête (`tests/helpers/fakeSession.ts:166-177`, la réponse à `:runQuery` : `:212-233`) : la requête
`ARRAY_CONTAINS` est vérifiée par son corps (intercepté), et la visibilité par le filtre client, qui est la vraie règle.

**`tests/setlist-partage.spec.ts`** (nouveau), ajouté à `SPECS_GRAND_ECRAN` (`playwright.config.ts:16`) : cinq projets
(`ordinateur`, `telephone`, `tablette`, `tablette-paysage`, `ordinateur-1440`), l'éditeur et l'aperçu changeant
d'agencement ; un test propre à un appareil le dit dans son titre.

| Test | Vérifie |
|---|---|
| (pur) voir | `canSeeSetlist` : Joël voit une setlist du Culte dont il est de l'équipe ; privée avec équipe : Léa et Joël oui, le musicien du Culte hors équipe non ; retiré, Joël ne la voit plus |
| (pur) modifier, supprimer, choisir l'équipe | `canEditSetlist` : vrai pour Joël (de l'équipe) sur une publique **et** sur une privée ; faux pour Hugo hors équipe et pour le musicien du Culte hors équipe sur la privée ; `canDeleteSetlist` : faux pour Joël sur l'une et l'autre, vrai pour Léa, inchangé pour le musicien du Culte sur la publique (vrai) ; `canSetSetlistTeam` : vrai pour Léa et pour un admin sur la publique, faux pour Joël, faux pour le musicien du Culte (qui modifie la publique), faux pour un admin sur la privée de Léa ; `canSetPresentationLink` vrai pour Joël |
| (pur) candidats et rôle | `candidatsDeLEquipe` : musiciens et choristes de la catégorie d'abord, puis tous par nom, le propriétaire exclu ; `roleParDefaut` dans les quatre cas de PS4 ; `nomCourt` |
| (pur) carte | `equipeDeLaSetlist` : sans planning, Musiciens puis Choristes ; avec planning, ajout aux lignes sans doublon ; uid sans profil ignoré ; rôle absent = Musicien |
| (pur) qui prévenir | `aPrevenir` : publique = planning + équipe ; privée avec équipe = équipe seule ; privée sans équipe = personne ; auto : déjà prévenus exclus, ajout tardif prévenu |
| (pur, texte) règles | `match /setlists/{id}` garde `allow read: if signedIn();` (l'hypothèse de PS7) ; `allow update` passe par `canEditSetlistDoc(resource.data)` et porte les gardes `affectedKeys().hasAny(['editeurs', 'rolesPartage'])` (propriétaire ou admin) et `hasAny(['isPrivate'])` (`canDeleteSetlistDoc`) ; `allow delete` passe par `canDeleteSetlistDoc(resource.data)` ; `canEditSetlistDoc` contient `canDeleteSetlistDoc(setlist)` et `request.auth.uid in setlist.get('editeurs', [])` ; `canDeleteSetlistDoc` garde le refus des privées (`!setlist.get('isPrivate', false)`) |
| (éditeur) création « Autre setlist » | puce « Équipe » ; en grand, la vue dans la colonne de droite ; sur `telephone` et `tablette`, en feuille ; « Musiciens et choristes de Culte Francophone » d'abord ; Joël par « Voir tous les comptes » ; rôle par défaut puis changé ; le brouillon puis « Publier » écrivent `editeurs` et `rolesPartage` ; « Retirer » ; aucun champ « nom sans compte », aucun rôle Régie |
| (éditeur) modification | ajouter Hugo s'enregistre ~2 s après, sans bouton ; « Équipe · 2 » |
| (éditeur) une personne de l'équipe modifie une privée | Joël ouvre l'éditeur de la privée de Léa dont il est de l'équipe : il change la tonalité d'un chant, l'écriture part (~2 s) et son corps (`writes` de la fausse base) **ne contient ni `editeurs`, ni `rolesPartage`** ; la puce Équipe ouvre la vue **en lecture** (« Seuls son créateur et les admins changent l'équipe. », ni « Ajouter » ni « Retirer ») ; la puce Visibilité est en lecture ; l'éditeur dit « Privée : visible et modifiable par son créateur et son équipe » |
| (éditeur) un musicien de la catégorie, hors équipe | sur une setlist publique du Culte **sans** équipe, il enregistre une modification : l'écriture ne contient pas `editeurs` (PS6) ; la puce Équipe ne lui est pas montrée ; sur la **privée** de Léa, l'éditeur lui répond « pas d'accès » (`noEditAccess`) |
| (page) l'équipe ne supprime pas | Joël, sur la page de la privée : « Vous pouvez modifier », pas de « Supprimer » ; dans la liste, pas de suppression groupée pour elle ; Léa a les deux |
| (historique) | la modification de Joël s'écrit dans `history` avec `authorUid` = Joël et son nom de planning |
| (éditeur, téléphone) agencement | `verifierSansDebordement` et `interdireDialoguesNatifs` (`tests/helpers/agencement.ts:112`, `:152`) avec la feuille ouverte |
| (liste) Joël | voit la setlist du Culte partagée dans À venir, « Mes services » coché, avec « Dans l'équipe » ; une privée partagée avec lui, avec son cadenas ; la requête `ARRAY_CONTAINS editeurs` est partie ; le musicien hors équipe ne voit pas la privée, et son adresse lui dit « pas d'accès » ; Mes services de Joël ne montre pas la setlist hors planning (décision 45, question 3) |
| (aperçu) carte | en grand (`ordinateur`, `tablette-paysage`, `ordinateur-1440`) : « L'équipe de cette setlist · choisie dans la setlist », Joël en pastille quand c'est lui, avec ou sans nom de planning ; setlist liée à un culte du planning : la carte du planning (sous-titre « d'après le planning et la setlist »), Hugo ajouté aux Choristes ; liée à un groupe sans ligne Choristes : une ligne Choristes ajoutée en bas |
| (page) privée avec équipe | ligne des droits PS14 (« visible et modifiable par son créateur et son équipe ») ; publique avec équipe : « Modifiable par : créateur, son équipe, … » ; « Partager » copie le lien avec le message PS14 |
| (notification) | route interceptée : « Publier » d'une privée avec équipe l'appelle ; privée sans équipe ne l'appelle pas (comme aujourd'hui) ; « Prévenir l'équipe » est offert à Joël (de l'équipe) sur la page de la privée, pas au musicien hors équipe |
| (中文) | la vue de l'équipe et la carte en 中文 |

**Specs existantes** :
- `tests/back-office-coupe.spec.ts` (second serveur, interrupteur coupé) : nouveau bloc « le partage d'une setlist est
  en ligne » : la puce « Équipe » est là dans l'éditeur, une personne de l'équipe voit la setlist ; le reste du fichier
  reste vert.
- À garder vertes sans changement attendu : `tests/setlist-editor.spec.ts` (créer, publier, et prévenir en quittant
  l'éditeur une setlist non privée, `:136`), `tests/setlist-editeur-piste2.spec.ts` (puce Visibilité, `:297-317`, active pour
  le propriétaire), `tests/setlist-pour-quel-service.spec.ts`,
  `tests/pages-en-grand-setlists.spec.ts` et `tests/pages-en-grand-mes-services.spec.ts` (carte du planning
  inchangée sans équipe), `tests/agencement-v18-setlists.spec.ts`, `tests/navigation-grand-ecran.spec.ts` (le message
  « Setlist privée — visible uniquement par toi », `:346`, reste pour une privée sans équipe),
  `tests/setlist-version.spec.ts`, `tests/chants-deux-volets.spec.ts`.
- **À changer** : `tests/coherence.spec.ts`, test I1 (`:125-132`, « la modification et la suppression d'une setlist
  passent par canEditSetlistDoc ») : il exige `canEditSetlistDoc(resource.data)` dans `allow delete`, qui passe
  désormais par `canDeleteSetlistDoc(resource.data)`. Il devient « la modification passe par `canEditSetlistDoc`, la
  suppression par `canDeleteSetlistDoc` » et vérifie en plus que `canDeleteSetlistDoc` garde le refus des privées (le
  but de I1 : une privée ne se supprime pas en REST par un autre que son propriétaire). Vu rouge d'abord, comme les
  autres.
- La route `notify-setlist` elle-même (Admin SDK, push) n'est pas testée par Playwright, comme aujourd'hui
  (`docs/spec-notif-president.md`) : sa logique passe par la fonction pure `aPrevenir`.

## Hors périmètre

- Mes services (V3), personnes sans compte (V4), rôle Régie (V5) : écartés (décision 45, questions 3 à 5). La
  puce seulement hors planning (V2) : écartée (décision 45, question 2).
- Pour l'équipe : supprimer la setlist, changer l'équipe, les rôles, la visibilité ou le propriétaire (PS8, choix de
  la spec).
- Un message à part « … t'a ajouté à l'équipe de … » : une personne ajoutée reçoit « Setlist prête », une fois
  (décision 45, question 7).
- La présidence : elle reste le champ `leader` (un nom), hors de l'équipe.
- La cloche (`useNotifications.ts:101-116`, filtre par catégorie) : la personne de l'équipe est prévenue par le push.
- Une setlist **privée** partagée dans le calendrier, l'accueil, Mes services et « Repartir d'une setlist passée » : leurs lectures
  écartent les privées (PS11).
- L'accueil (« Ce dimanche », « Pour moi ») et les rappels du matin, qui ne lisent que le planning.
- Une phrase d'historique pour un **changement de la liste** de l'équipe (`spec-setlist.md`, phrases) : à ajouter si
  Timothée le demande. (Une **modification faite par** une personne de l'équipe, elle, s'écrit dans l'historique sous
  son nom : PS8.)
- La carte de l'équipe sur la page d'une setlist au téléphone (elle n'y est pas aujourd'hui non plus).
- Les clés `setlists.form.seance*` mortes (`fr.json:271-274`) : signalées, pas retirées.
- Les setlists de fête (lot 4) : elles n'ont pas la puce Équipe ; leurs `editeurs` sont recopiés par le serveur.

## À la mise en ligne

- **Règles** : `firestore.rules` change (PS8, « Droits en double ») : **Timothée le publie lui-même** dans la console
  Firebase, **avant** la fusion sur `main`. Le fichier est unique : cette publication emporte les règles des lots déjà
  sur la branche, la bascule du lot 1 est donc faite avant, ou dans la même séance. Tant qu'elles ne sont pas publiées,
  une modification faite par une personne de l'équipe est refusée par le vrai Firestore, en local comme en ligne.
- **Aucun script** à lancer, aucune migration.
- Le lot part en ligne par une fusion de `ui/apple-design` sur `main`, **sur ordre explicite de Timothée** donné au
  moment même : la puce Équipe paraît alors pour tous ceux qui créent des setlists. Cette fusion emporte aussi le code
  des autres lots déjà sur la branche : elle se fait quand ces lots sont prêts à partir (règles du lot 1 publiées et
  migration faite), ou bien Timothée décide d'un report ciblé du seul partage sur `main` (décision 45, question 11).
  Local et en ligne partagent le même Firestore : une équipe choisie en local est vraie en ligne (un push « Setlist
  prête » réel ne part que depuis Vercel).
- **Planche** : aucune avant le code (décision 45, question 8) ; Timothée regarde les captures des trois appareils
  après le code, et demande une planche s'il le veut.

## Questions ouvertes

Aucune : toutes tranchées le 08/10/2026 (décisions 35 à 45 de decisions.md).

**À faire avant le code** : le go de Timothée.

## Commandes

```bash
npx tsc --noEmit
npm run lint
npm test -- tests/setlist-partage.spec.ts
npm test -- tests/back-office-coupe.spec.ts
npm test -- tests/setlist-editor.spec.ts tests/setlist-editeur-piste2.spec.ts tests/setlist-pour-quel-service.spec.ts tests/pages-en-grand-setlists.spec.ts tests/pages-en-grand-mes-services.spec.ts tests/coherence.spec.ts
```

## Avancement

- 08/10/2026 : spec écrite, attend le go.
- 08/10/2026 : relecture croisée des cinq specs, incohérences corrigées.
- 08/10/2026 (soir) : réponses de Timothée intégrées (décisions 35 à 45).
