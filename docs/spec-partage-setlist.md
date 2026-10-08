# Spec — partager une setlist hors planning avec des personnes choisies (PS)

Demande nouvelle de Timothée, faite le 08/10/2026 en commandant les specs du chantier « équipes et groupes ». Elle
n'est **pas** dans `docs/chantier-equipes-groupes/decisions.md` : aucun grill n'a eu lieu. Cette spec est donc **à
trancher** : elle cite la demande, dit ce que le code fait aujourd'hui, propose la lecture la plus simple (recommandée)
et ses variantes ; tout ce qui n'est pas tranché est en « Questions ouvertes », avec une recommandation.

Statut : **spec écrite le 08/10/2026, attend le go de Timothée** (et ses réponses aux questions ouvertes). Rien n'est
codé. Base de code : `ui/apple-design` à `5878ce1` (le code n'a pas changé depuis `439e5520`, base de la cartographie).
Sources : la demande ci-dessous, `docs/chantier-equipes-groupes/decisions.md` (vocabulaire, ordre des lots, règles
communes), `docs/chantier-equipes-groupes/cartographie.md` (§ « Chants, musiques et danses », lignes « Droits sur les
setlists » et « Outils déjà faits pour la régie »), le code relu ligne à ligne. Préfixe des règles et tranches : **PS**.

## La demande

> « J'aimerai que tu fasses ça aussi le Partage à certaines personnes (musiciens, chanteurs choriste) lors de la
> création d'une setlist hors planning. » (Timothée, 08/10/2026)

**Décisions du lot** : aucune (pas de grill). Les règles ci-dessous sont des **choix de la spec** (lecture la plus
simple), à confirmer.

**Maquettes** : aucune. Pas de planche pour cette demande dans `docs/chantier-equipes-groupes/maquettes/`. **Une
planche est à faire si Timothée le veut** (voir question 8) ; sans elle, la place proposée (PS2) suit les gestes de
l'éditeur existant (puces de l'en-tête, volet de droite en grand, feuille sur téléphone).

**Vocabulaire** : dans le code et l'éditeur, « Partagée » veut déjà dire **non privée** (puce Visibilité,
`setlists.editeur.partagee`, `src/locales/fr.json:341`, 中文 « 共享 »), et « Partager » est le bouton qui copie le lien
(`setlists.detail.share`). Pour ne pas créer un troisième sens, l'écran parle de **l'équipe de la setlist** ; le code
parle de **partage** (`partageAvec`). Cette spec emploie les deux : « partager une setlist avec quelqu'un » = « le
mettre dans l'équipe de la setlist ». Cette « équipe de la setlist » n'est ni une équipe (TEAM) de l'organigramme
(lots 1 et 2), ni « L'équipe de ce service » que le planning donne : c'est une liste de comptes choisis dans l'éditeur.
À l'écran, le mot FR « Équipe » est gardé (**choix** : il prolonge la carte existante « L'équipe de ce service »,
`setlists.apercu.equipe`, `src/locales/fr.json:335`). En 中文, **团队** sert déjà aux TEAM (`equipes.title` « 团队 »,
`src/locales/zh-CN.json:2576` ; le lot 1 propose `taches.champs.equipe` « 团队 », clé qui n'existe pas encore dans le
code) et à la colonne « Équipe » du planning Table (`planning.roles.equipe` « 团队 », `:1111`) : l'équipe d'une setlist prend donc le mot de la carte existante,
**服事团队** (`setlists.apercu.equipe` « 本次服事团队 », `src/locales/zh-CN.json:335`). Le double sens du mot FR
(TEAM des lots 1 et 2, équipe d'une setlist) est la question 8.

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

## Lecture la plus simple (recommandée) et variantes

**Recommandée** : dans l'éditeur (création et modification), une puce **« Équipe »** ouvre « L'équipe de cette
setlist » : l'auteur y ajoute des **comptes**, proposés d'abord parmi les musiciens et choristes de la catégorie de la
setlist, chacun marqué **Musicien** ou **Choriste**. Ces personnes :
- **voient** la setlist, même privée et même hors de leurs catégories (pas de droit de **modifier** de plus : elles ont
  déjà leur version perso) ;
- la trouvent dans **Setlists** (À venir, Passées, filtre « Mes services » compris) et dans Chants › Prochaines
  setlists (et, si elle n'est pas privée, au calendrier : il filtre déjà par `canSeeSetlist`) ;
- reçoivent **« Setlist prête »** (préférence existante), chacune une fois ;
- apparaissent comme **l'équipe de la setlist** dans l'aperçu.

Conséquence clé : **aucune règle Firestore ne change** (la lecture est déjà ouverte aux connectés, l'écriture des
nouveaux champs suit le droit de modifier existant). Rien à publier.

| Variante | Ce qui change | Coût | Question |
|---|---|---|---|
| V1 — l'équipe **modifie** aussi | Une seule liste à l'écran : les personnes choisies entrent dans `partageAvec` **et** dans `editeurs` (le champ du lot 4) ; `canEditSetlist` et `canEditSetlistDoc` les acceptent ; seuls le propriétaire et les admins changent la liste (Q10 passe à sa variante), et les règles l'imposent : `partageAvec` et `editeurs` ne changent que par le propriétaire ou un admin | Règles à publier par Timothée (`firestore.rules` est un seul fichier : la publication emporte les règles des lots déjà sur la branche, donc la bascule du lot 1 est faite avant ou dans la même séance) ; une setlist privée modifiable par d'autres | Q1 |
| V2 — la section seulement **hors planning** | La puce n'apparaît que si aucune séance du planning n'a la catégorie et la date de la setlist | Une règle qui dépend d'un planning qui change (un trimestre rempli plus tard rend la setlist « liée ») | Q2 |
| V3 — dans **Mes services** aussi | Une setlist dont on est de l'équipe devient un service de la personne (date, titre, rôle) | Nouvelle sorte de service dans `servicesDuCompte`, adresses `/mes-services/[date]` | Q3 |
| V4 — des **personnes sans compte** | Un nom libre dans l'équipe (affiché seulement) | Personne à prévenir, rien à ouvrir | Q4 |
| V5 — rôle **Régie** | Un troisième rôle ; la régie choisie pose le lien de présentation (route serveur) | Petit : la route ajoute « régie de l'équipe » à `isOnDutyRegie` | Q5 |

## Règles

Toutes sont des **choix de la spec** (lecture recommandée), à confirmer au go.

| # | Règle |
|---|---|
| PS1 | **Champs** (`FSSetlist`, `src/lib/firebase/setlists.ts`) : `partageAvec?: string[]` (uids des personnes de l'équipe) et `rolesPartage?: Record<string, "musicien" \| "chanteur">` (le rôle de chacune, pour l'affichage). Absents = aucune personne. Une clé de `rolesPartage` absente de `partageAvec` est ignorée ; un uid de `partageAvec` sans rôle s'affiche en Musicien. **Choix** : une liste d'uids simple se cherche par `ARRAY_CONTAINS` (index simple, automatique) et a la forme du champ `editeurs` du lot 4 (`docs/spec-chants-fetes.md`, § « Setlist de fête » du modèle de données, champ `editeurs`) ; le rôle à part ne sert qu'à l'écran. |
| PS2 | **Place dans l'éditeur** : une puce **« Équipe »** (icône de personnes, « Équipe · 3 » quand il y en a) après la puce Visibilité de `EnTeteEditeur`, en création comme en modification, pour **toute** setlist sauf une setlist de fête (lot 4, qui n'a pas ces puces). Elle ouvre la vue « L'équipe de cette setlist » du volet : colonne de droite en grand (ordinateur, tablette paysage), feuille sur téléphone et tablette portrait, comme les réglages d'un chant. Câblage : `useVolet` (créé par `EditeurDeuxColonnes` et `EditeurFeuilles`) gagne la vue `{ nom: "equipe" }` et l'état de l'équipe ; `ChampsEnTete` gagne `equipe` (le compte et la liste) et `ouvrirEquipe`, comme `ouvrirBibliotheque` ouvre la bibliothèque ; à la fermeture de la feuille, le focus revient à la puce (`EditeurFeuilles.tsx`, `onCloseAutoFocus`). |
| PS3 | **La vue « L'équipe de cette setlist »** : la phrase « Les personnes choisies voient la setlist, même privée, et sont prévenues quand elle est prête. » ; la liste des personnes (nom, rôle Musicien · Choriste en deux pilules, « Retirer ») ; « Ajouter quelqu'un » ouvre **une seule recherche** : d'abord « Musiciens et choristes de {catégorie} » (comptes dont `serviceRoles[catégorie]` contient `musicien` ou `chanteur` ; sans catégorie choisie, ce groupe est absent), puis « Voir tous les comptes » (tous les profils, par nom). Une personne déjà dans l'équipe porte « Dans l'équipe ». Le propriétaire n'est pas proposé. Les profils viennent de `listProfiles()` (`src/lib/firebase/users.ts:85-104`, lecture permise à tout connecté, `firestore.rules:82-84`), lu à l'ouverture de la vue (le commentaire de la fonction dit « réservé à la page admin », mais d'autres écrans la lisent déjà, `src/components/taches/creerTache.ts:7`) : tout créateur de setlist lit alors les profils ; la confidentialité reste celle assumée dans `CLAUDE.md`. |
| PS4 | **Rôle par défaut** à l'ajout : `musicien` si la personne l'a dans la catégorie, sinon `chanteur` si elle l'a dans la catégorie, sinon `musicien` si elle l'a ailleurs, sinon `chanteur`. Changeable d'un toucher. |
| PS5 | **Nom affiché** : le nom de planning, sinon prénom et initiale du nom (règle d'`historyAuthor`, `src/lib/firebase/setlistHistory.ts:70-78`, reprise en fonction pure). Un uid sans profil n'est pas affiché. |
| PS6 | **Enregistrement** : les deux champs font partie du `payload` de `SetlistForm` (`:253-265`) : brouillon, « Publier » et enregistrement automatique les emportent ; la modification les relit (`EditSetlistClient.tsx:36-46`). **Qui choisit l'équipe** : qui peut modifier la setlist (`canEditSetlist`), aucun droit nouveau. Avec V1 : le propriétaire et les admins seulement (Q10, variante), imposé par les règles. |
| PS7 | **Voir** : `canSeeSetlist` rend vrai quand `partageAvec` contient l'uid, **avant** le refus des privées. Une setlist **privée** avec une équipe est donc vue de son propriétaire et de son équipe seulement (« privée à ces personnes ») ; elle reste **modifiable par son propriétaire seul** (`canEditSetlist` inchangé). Un brouillon n'est vu de personne d'autre (les listes et `getSetlistsPartagees` écartent `isDraft` ; la page par son adresse ne le fait pas, comme aujourd'hui). « Privée à ces personnes » vaut pour le site : le filtre est côté client, comme pour toute setlist privée (choix assumé de `CLAUDE.md`, « Confidentialité » : un compte connecté peut techniquement la lire en REST, rien à re-signaler). |
| PS8 | **Modifier** : inchangé (variante V1 en Q1). Une personne de l'équipe a sa **version perso** (`canHaveSetlistVersion = canSeeSetlist`), qui suit d'elle-même. |
| PS9 | **Retirer** une personne : elle ne voit plus la setlist au prochain chargement ; aucune notification. |
| PS10 | **Setlists (liste)** : la page lit en plus `getSetlistsPartagees(uid)` (nouveau : `ARRAY_CONTAINS` sur `partageAvec`, brouillons écartés, **et refiltrée côté client par `estDansLePartage`** : la requête n'est pas crue sur parole, et la fausse base des tests ignore les `where`) et fusionne par id ; le filtre d'affichage des onglets À venir et Passées devient `canSeeSetlist` (une seule règle, comme l'aperçu `:155-160`). Le filtre « Mes services » laisse passer une setlist dont on est de l'équipe, comme ses propres setlists. Une setlist de l'équipe hors de ses catégories porte la marque « Dans l'équipe » ; une privée garde son cadenas. L'onglet « mine » reste ses propres privées. |
| PS11 | **Chants › Prochaines setlists** : rien à coder, `upcomingSetlists` passe par `canSeeSetlist` et sa lecture n'écarte pas les privées. **Calendrier, accueil, Mes services, « Repartir d'une setlist passée »** : ils filtrent aussi par `canSeeSetlist` mais lisent sans les privées : une setlist **non privée** partagée y paraît d'elle-même ; une **privée** partagée n'y paraît pas (hors périmètre). |
| PS12 | **Carte de l'équipe** (aperçu en grand, `ApercuSetlist`) : sans équipe au planning, la carte devient « L'équipe de cette setlist · choisie dans la setlist », lignes Musiciens puis Choristes (clés `planning.roles.musiciens` et `planning.roles.choristes`, `src/locales/fr.json:1092-1108`). Avec une équipe au planning, la carte du planning reste (« L'équipe de ce service », sous-titre « d'après le planning et la setlist ») et les personnes choisies s'ajoutent à sa ligne Musiciens ou Choristes **quand elle existe** (Musiciens : Groupe Paix, Groupe Bonté, Campus ; Choristes : Culte Francophone, Interfranco, Intergroupe, Campus, `equipeDuService.ts:29-75`), sinon une ligne Musiciens ou Choristes est **ajoutée en bas de la carte** (les cultes n'ont que Piano, Guitare, Batterie…, Fidélité et les classes de l'EDD n'ont ni l'une ni l'autre) ; sans doublon de nom (`normalizeName`). **Noms** : ceux de `nomCourt` (PS5), lus dans `listProfiles()` seulement quand la setlist choisie a une équipe. **Pastille** : `monNom` vaut `planningName`, sinon `nomCourt` du compte (`monNom={profile?.planningName ?? ""}`, `src/app/setlists/page.tsx:495`, laisserait sans pastille quelqu'un qui n'a pas de nom de planning). |
| PS13 | **« Setlist prête »** : destinataires = l'équipe du planning (comme aujourd'hui) **plus** les personnes de `partageAvec` (préférence « Setlist prête », sans nouveau type). Une setlist **privée** avec une équipe prévient **sa seule équipe** (jamais l'équipe du planning) ; sans équipe, rien, comme aujourd'hui. Le serveur lit `partageAvec` dans le document, jamais dans la requête. Chaque personne de l'équipe est prévenue **une fois** en automatique : `notifLog/setlist-{id}` garde `partagePrevenus` (écrit en `FieldValue.arrayUnion` dans le `logRef.set` du `route.ts:162-167`) ; une personne ajoutée après le premier envoi l'est au prochain enregistrement qui sort de l'éditeur (ou à « Publier »). « Prévenir l'équipe » (manuel, 24 h) envoie à tous. L'éditeur appelle la route quand la setlist n'est pas privée **ou** a une équipe (`SetlistForm.tsx:398`, `:499`). **Ce que la route change** (`notify-setlist/route.ts`) : le refus des privées (`:69-73`, aujourd'hui sans exception, en auto comme en manuel) ne vaut plus qu'**en l'absence d'équipe** ; une privée ne calcule pas l'équipe du planning (`:121-135`) ; la garde « déjà envoyé » de l'auto (`:108-112`) ne retient plus que l'équipe du planning : une personne de `partageAvec` absente de `partagePrevenus` est prévenue même si le planning l'a déjà été, et sans personne nouvelle la réponse reste `already-sent` ; les uids du planning et de l'équipe sont réunis sans doublon avant `filterUidsByNotifPref`. L'autorisation (`:86-101`) ne change pas pour une publique ; pour une **privée avec équipe** elle se resserre : seul son propriétaire (ou un admin) peut déclencher l'envoi, un exécutant de la catégorie ne le peut pas (aujourd'hui le refus des privées vient avant l'autorisation et couvre tout le monde). |
| PS14 | **Page de la setlist** : la ligne des droits dit, pour une privée avec équipe, « Privée — visible par son créateur et son équipe, modifiable par son créateur seul » (`SetlistDetailClient.tsx:1363-1368`) ; « Partager » sur une privée avec équipe copie le lien et dit « Setlist privée — seule son équipe pourra l'ouvrir » au lieu de refuser (`:813-816`). Sans équipe, les textes d'aujourd'hui restent. Dans l'éditeur, une privée avec équipe dit « Privée : visible par toi et ton équipe » (`EnTeteEditeur.tsx:240-244`). |
| PS15 | **Dupliquer** ne recopie pas l'équipe (la copie est privée et personnelle, comme le lien de présentation). |
| PS16 | **Libellés FR et 中文** (中文 relu par Timothée) — tableau ci-dessous. |
| PS17 | **En ligne** : les setlists sont en ligne, hors `BACK_OFFICE` (`src/lib/backOffice.ts:5`). Ce lot **n'est pas** une fonctionnalité de back-office : il ne passe pas derrière l'interrupteur et part en ligne par une fusion de `ui/apple-design` sur `main`, **sur ordre explicite de Timothée**. Cette fusion emporte aussi le code des autres lots déjà sur la branche : elle se fait quand ces lots sont prêts à partir (règles du lot 1 publiées et migration faite), ou bien Timothée décide d'un report ciblé du seul partage sur `main` (question 11). Le test sur le second serveur vérifie qu'il y est bien (et que rien d'autre ne change). |

**Libellés proposés**

| Clé (proposée) | FR | 中文 (à relire) |
|---|---|---|
| `setlists.equipe.puce` | Équipe | 服事团队 |
| `setlists.equipe.titre` | L'équipe de cette setlist | 本歌单服事团队 |
| `setlists.equipe.aide` | Les personnes choisies voient la setlist, même privée, et sont prévenues quand elle est prête. | 选中的人可以查看此歌单（即使是私人歌单），歌单就绪时会收到通知。 |
| `setlists.equipe.ajouter` | Ajouter quelqu'un | 添加成员 |
| `setlists.equipe.recherche` | Chercher un nom… | 搜索姓名… |
| `setlists.equipe.duService` (`{{categorie}}` = le nom traduit, `t("categories." + cat)`) | Musiciens et choristes de {{categorie}} | {{categorie}}的乐手与和声 |
| `setlists.equipe.tous` | Voir tous les comptes | 查看所有账号 |
| `setlists.equipe.dejaLa` | Dans l'équipe | 已在服事团队中 |
| `setlists.equipe.retirer` | Retirer {{nom}} | 移除{{nom}} |
| `setlists.equipe.choisie` (sous-titre de la carte) | choisie dans la setlist | 在歌单中选定 |
| `setlists.equipe.planningEtChoisie` (sous-titre de la carte du planning, quand des personnes s'y ajoutent) | d'après le planning et la setlist | 根据排班表与歌单 |
| `setlists.equipe.priveeAvecEquipe` | Privée : visible par toi et ton équipe | 私人：仅你和你的服事团队可见 |
| `setlists.detail.editableByOwnerEquipe` | Privée — visible par son créateur et son équipe, modifiable par son créateur seul | 私人——创建者及其服事团队可见，仅创建者可编辑 |
| `setlists.detail.sharePrivateEquipe` | Setlist privée — seule son équipe pourra l'ouvrir | 私人歌单——只有其服事团队可以打开 |
| Rôles | reprendre `performance.roles.choriste` (Choriste / 和声) et `equipes.role.musicien` (Musicien / 乐手) | existants |

## Tranches de code

| Tranche | Ce qui change | Fichiers touchés | Ordre / conflits |
|---|---|---|---|
| **PS-A — Modèle et logique pure** | PS1, PS4, PS5, PS7 ; `getSetlistsPartagees(uid)` ; fonctions pures : `estDansLePartage(setlist, uid)` (nom choisi pour ne pas croiser `estDeLEquipe` du lot 1, qui dit l'appartenance à une TEAM), `candidatsDeLEquipe(profils, categorie, ownerId)`, `roleParDefaut(profil, categorie)`, `nomCourt(profil)`, `equipeDeLaSetlist(lignesDuPlanning, setlist, profils)`, `aPrevenir(setlist, prevenus, auto)` | `src/lib/firebase/setlists.ts`, `src/lib/access.ts` (`canSeeSetlist`), `src/lib/setlist/partage.ts` (nouveau), `firestore.rules` (commentaire d'en-tête seulement, facultatif) | En premier. `access.ts` est aussi touché par le lot 1 (fonctions des pôles) : fonctions différentes, simple fusion. |
| **PS-B — L'éditeur** | PS2, PS3, PS6, PS14 (éditeur), PS16 | `src/components/setlists/SetlistForm.tsx`, `src/app/setlists/[id]/edit/EditSetlistClient.tsx`, `src/components/setlists/editeur/EnTeteEditeur.tsx`, `src/components/setlists/editeur/useVolet.tsx` (vue `equipe`), `src/components/setlists/editeur/VoletEquipe.tsx` (nouveau), `src/components/setlists/editeur/EditeurDeuxColonnes.tsx`, `src/components/setlists/editeur/EditeurFeuilles.tsx` (`useVolet`, `ouvrirEquipe`, focus de retour), `src/locales/fr.json`, `src/locales/zh-CN.json` | Après PS-A. Le lot 4 touche les mêmes fichiers (`SetlistForm`, `EnTeteEditeur`, CF19) : **PS avant le lot 4**. |
| **PS-C — Où la trouver** | PS10, PS12, PS14 (page), PS15 | `src/app/setlists/page.tsx`, `src/components/setlists/SetlistCard.tsx` (marque), `src/components/setlists/ApercuSetlist.tsx`, `src/components/setlists/CarteEquipe.tsx` (titre et sous-titre en paramètre), `src/app/setlists/[id]/SetlistDetailClient.tsx`, locales | Après PS-A ; parallèle à PS-B (fichiers distincts, locales à fusionner). |
| **PS-D — « Setlist prête »** | PS13 | `src/app/api/push/notify-setlist/route.ts`, `src/components/setlists/SetlistForm.tsx` (condition d'appel) | Après PS-B (même fichier `SetlistForm`). Le lot 4 touche la même route (CF24 : 404 pour une setlist de fête) : PS d'abord. |

**Place dans l'ordre des lots** : `docs/chantier-equipes-groupes/decisions.md` ne connaît que les lots 1 à 4 ; la place
du partage n'est donc pas décidée (question 11). Le partage ne dépend d'aucun des lots 1 à 4 (il lit `serviceRoles`, pas `groupe` ni
les rôles d'organigramme). Recommandation : le coder **en parallèle des lots 1 et 3**, en tout cas **avant le lot 4**,
qui reprend les mêmes fichiers (`SetlistForm`, `EnTeteEditeur`, `EditSetlistClient`, `SetlistDetailClient`, `SetlistCard`,
`ApercuSetlist`, `setlists/page.tsx`, `setlists.ts`, `access.ts`, `firestore.rules`, la route `notify-setlist`, tranches CF-B,
CF-D et CF-E de `docs/spec-chants-fetes.md`) et, si Q6 est retenue, le même champ. Tout se fait sur `ui/apple-design`, un
commit par tranche, message en français.

## Droits en double

| Droit | `src/lib/access.ts` (client) | `firestore.rules` (serveur) | Route serveur |
|---|---|---|---|
| Voir une setlist dont on est de l'équipe (même privée) | `canSeeSetlist` (`:440-449`) : branche `partageAvec ∋ uid` avant le refus des privées | **inchangé** : `allow read: if signedIn()` (`:303`) ; filtrage client, choix assumé | — |
| Choisir l'équipe (écrire `partageAvec`, `rolesPartage`) | `canEditSetlist` (`:471-481`), **inchangé** (V1 : propriétaire ou admin, voir la ligne « Modifier la setlist ») | **inchangé** : `allow create` (`:305-306`), `allow update` par `canEditSetlistDoc` (`:312-320`, `:353-357`) (V1 : voir la ligne « Modifier la setlist ») | — |
| Version perso d'une personne de l'équipe | `canHaveSetlistVersion` (`:469`) suit `canSeeSetlist` | **inchangé** : `versions/{uid}` (`:342-348`) | — |
| Modifier la setlist | **inchangé** (V1 : `canEditSetlist` accepte `editeurs ∋ uid` ; l'éditeur n'offre la liste unique, qui remplit `partageAvec` et `editeurs`, qu'au propriétaire et aux admins) | **inchangé** (V1 : `canEditSetlistDoc` gagne `request.auth.uid in setlist.get('editeurs', [])` ; `allow update` : `partageAvec` et `editeurs` ne changent que par le propriétaire ou un admin. Même condition que le tableau « Droits en double » de `docs/spec-chants-fetes.md`, ligne « Modifier une setlist de fête » : `editeurs` est écrit par le serveur seul pour une fête, par le propriétaire ou un admin pour une setlist ordinaire en V1 ; sans V1, le lot 4 fait refuser à `allow create` un `editeurs` non vide (même tableau, ligne « Créer une setlist de fête ») et V1 lèverait ce refus pour une setlist ordinaire) | — |
| « Setlist prête » à l'équipe | « Prévenir l'équipe » = `canEdit` (`SetlistDetailClient.tsx:1313`), inchangé | — | `/api/push/notify-setlist` (Admin SDK) : autorisation inchangée pour une publique, resserrée au propriétaire et aux admins pour une privée avec équipe (`:86-101`, PS13) ; destinataires lus dans le document |
| Lien de présentation | inchangé (V5 : la régie de l'équipe) | — | `/api/setlist/presentation` inchangée (V5 : `regie` vrai aussi pour `rolesPartage[uid] == "regie"`) |

**Timothée publie les règles** : dans la lecture recommandée, **`firestore.rules` ne change pas** : rien à publier. Le
double est tenu parce que la lecture serveur est déjà ouverte à tout connecté et que l'écriture des nouveaux champs suit
`canEditSetlistDoc`. Seule la ligne de commentaire d'en-tête (`firestore.rules:7-15`) gagne une phrase sur l'équipe
(aucun effet, publication facultative). **Si Timothée retient V1**, `firestore.rules` change et il le publie lui-même
dans la console Firebase avant la mise en ligne. `firestore.rules` est **un seul fichier** : le publier publie aussi les
règles des lots déjà sur la branche ; la bascule du lot 1 (`docs/spec-equipes-sans-poles.md`, § « Ordre de la
bascule ») doit donc être faite avant, ou dans la même séance.

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
| (pur) voir | `canSeeSetlist` : Joël voit une setlist du Culte dont il est de l'équipe ; privée avec équipe : Léa et Joël oui, le musicien du Culte hors équipe non ; retiré, Joël ne la voit plus ; `canEditSetlist` reste faux pour Hugo et Joël |
| (pur) candidats et rôle | `candidatsDeLEquipe` : musiciens et choristes de la catégorie d'abord, puis tous par nom, le propriétaire exclu ; `roleParDefaut` dans les quatre cas de PS4 ; `nomCourt` |
| (pur) carte | `equipeDeLaSetlist` : sans planning, Musiciens puis Choristes ; avec planning, ajout aux lignes sans doublon ; uid sans profil ignoré ; rôle absent = Musicien |
| (pur) qui prévenir | `aPrevenir` : publique = planning + équipe ; privée avec équipe = équipe seule ; privée sans équipe = personne ; auto : déjà prévenus exclus, ajout tardif prévenu |
| (pur, texte) règles | `match /setlists/{id}` garde `allow read: if signedIn();` (l'hypothèse de PS7) et `canEditSetlistDoc` dans update et delete |
| (éditeur) création « Autre setlist » | puce « Équipe » ; en grand, la vue dans la colonne de droite ; sur `telephone` et `tablette`, en feuille ; « Musiciens et choristes de Culte Francophone » d'abord ; Joël par « Voir tous les comptes » ; rôle par défaut puis changé ; le brouillon puis « Publier » écrivent `partageAvec` et `rolesPartage` ; « Retirer » |
| (éditeur) modification | ajouter Hugo s'enregistre ~2 s après, sans bouton ; « Équipe · 2 » |
| (éditeur, téléphone) agencement | `verifierSansDebordement` et `interdireDialoguesNatifs` (`tests/helpers/agencement.ts:112`, `:152`) avec la feuille ouverte |
| (liste) Joël | voit la setlist du Culte partagée dans À venir, « Mes services » coché, avec « Dans l'équipe » ; une privée partagée avec lui, avec son cadenas ; la requête `ARRAY_CONTAINS partageAvec` est partie ; le musicien hors équipe ne voit pas la privée, et son adresse lui dit « pas d'accès » |
| (aperçu) carte | en grand (`ordinateur`, `tablette-paysage`, `ordinateur-1440`) : « L'équipe de cette setlist · choisie dans la setlist », Joël en pastille quand c'est lui, avec ou sans nom de planning ; setlist liée à un culte du planning : la carte du planning (sous-titre « d'après le planning et la setlist »), Hugo ajouté aux Choristes ; liée à un groupe sans ligne Choristes : une ligne Choristes ajoutée en bas |
| (page) privée avec équipe | ligne des droits PS14 ; « Partager » copie le lien avec le message PS14 |
| (notification) | route interceptée : « Publier » d'une privée avec équipe l'appelle ; privée sans équipe ne l'appelle pas (comme aujourd'hui) |
| (中文) | la vue de l'équipe et la carte en 中文 |

**Specs existantes** :
- `tests/back-office-coupe.spec.ts` (second serveur, interrupteur coupé) : nouveau bloc « le partage d'une setlist est
  en ligne » : la puce « Équipe » est là dans l'éditeur, une personne de l'équipe voit la setlist ; le reste du fichier
  reste vert.
- À garder vertes sans changement attendu : `tests/setlist-editor.spec.ts` (créer, publier, et prévenir en quittant
  l'éditeur une setlist non privée, `:136`), `tests/setlist-editeur-piste2.spec.ts` (puce Visibilité, `:297-317`), `tests/setlist-pour-quel-service.spec.ts`,
  `tests/pages-en-grand-setlists.spec.ts` et `tests/pages-en-grand-mes-services.spec.ts` (carte du planning
  inchangée sans équipe), `tests/agencement-v18-setlists.spec.ts`, `tests/navigation-grand-ecran.spec.ts` (le message
  « Setlist privée — visible uniquement par toi », `:346`, reste pour une privée sans équipe), `tests/coherence.spec.ts`
  (`:125-132`), `tests/setlist-version.spec.ts`, `tests/chants-deux-volets.spec.ts`.
- La route `notify-setlist` elle-même (Admin SDK, push) n'est pas testée par Playwright, comme aujourd'hui
  (`docs/spec-notif-president.md`) : sa logique passe par la fonction pure `aPrevenir`.

## Hors périmètre

- Modifier pour l'équipe (V1), Mes services (V3), personnes sans compte (V4), rôle Régie (V5), sauf réponse contraire
  de Timothée.
- La présidence : elle reste le champ `leader` (un nom), hors de l'équipe.
- La cloche (`useNotifications.ts:101-116`, filtre par catégorie) : la personne de l'équipe est prévenue par le push.
- Une setlist **privée** partagée dans le calendrier, l'accueil, Mes services et « Repartir d'une setlist passée » : leurs lectures
  écartent les privées (PS11).
- L'accueil (« Ce dimanche », « Pour moi ») et les rappels du matin, qui ne lisent que le planning.
- Une phrase d'historique pour un changement d'équipe (`spec-setlist.md`, phrases) : à ajouter si Timothée le demande.
- La carte de l'équipe sur la page d'une setlist au téléphone (elle n'y est pas aujourd'hui non plus).
- Les clés `setlists.form.seance*` mortes (`fr.json:271-274`) : signalées, pas retirées.
- Les setlists de fête (lot 4) : elles n'ont pas la puce Équipe ; leurs éditeurs sont recopiés par le serveur.

## À la mise en ligne

- **Règles** : rien à publier dans la lecture recommandée ; avec V1, Timothée publie `firestore.rules` dans la console
  Firebase avant la fusion sur `main`. Le fichier est unique : cette publication emporte les règles des lots déjà sur
  la branche, la bascule du lot 1 est donc faite avant, ou dans la même séance.
- **Aucun script** à lancer.
- Le lot part en ligne par une fusion de `ui/apple-design` sur `main`, **sur ordre explicite de Timothée** : la puce
  Équipe paraît alors pour tous ceux qui créent des setlists. Cette fusion emporte aussi le code des autres lots déjà
  sur la branche : elle se fait quand ces lots sont prêts à partir (règles du lot 1 publiées et migration faite), ou
  bien Timothée décide d'un report ciblé du seul partage sur `main` (question 11). Local et en ligne partagent le même Firestore : une
  équipe choisie en local est vraie en ligne (un push « Setlist prête » réel ne part que depuis Vercel).

## Questions ouvertes

1. **Voir seulement, ou aussi modifier ?** *Recommandation* : **voir seulement** (PS8). Les musiciens et choristes ont
   déjà leur version perso pour leurs accords et leur structure ; aucun changement de règles, rien à publier, une
   privée reste modifiable par son seul créateur. Si Timothée veut qu'ils modifient : V1, avec le champ `editeurs` du
   lot 4 (Q6) et des règles à publier ; l'écran garde une seule liste, que seuls le propriétaire et les admins changent
   (Q10 passe à sa variante), et les règles l'imposent (`partageAvec` et `editeurs` ne changent que par eux).
2. **La puce Équipe aussi sur une setlist liée au planning ?** *Recommandation* : **oui, partout** (PS2) : « hors
   planning » n'est écrit nulle part sur la setlist (il se calcule, et change quand le planning se remplit) ; ajouter
   un invité à un culte prévu sert aussi. La carte fusionne alors planning et équipe (PS12). Variante V2 si Timothée
   ne la veut que hors planning.
3. **Dans Mes services ?** *Recommandation* : **pas dans ce lot** (PS10) : la setlist est dans Setlists, filtre « Mes
   services » compris, et dans Chants › Prochaines setlists. Mes services reste le reflet du planning ; à rouvrir si
   les musiciens la cherchent là.
4. **Personnes sans compte ?** *Recommandation* : **non** : elles ne peuvent ni ouvrir la setlist ni être prévenues ;
   un nom se met dans les notes.
5. **Un rôle Régie dans l'équipe ?** *Recommandation* : **pas sans demande** (la demande cite musiciens et choristes).
   Si oui, petit coût : la régie choisie pose le lien de présentation par la route existante, aucune règle. La
   question est **commune** avec la question 7 de `docs/spec-chants-fetes.md` (« régie d'une setlist hors planning ») :
   une seule exception à `isOnDutyRegie` dans `/api/setlist/presentation`, tranchée là-bas pour les deux lots ; cette
   spec garde ici sa variante V5 (la régie choisie dans l'équipe, `rolesPartage[uid] == "regie"`).
6. **Un seul champ avec le lot 4 ?** `docs/spec-chants-fetes.md` (§ « Setlist de fête » du modèle de données, champ
   `editeurs`, le paragraphe « Pourquoi `editeurs` au premier niveau » qui le suit, et sa question 8, qui renvoie ici)
   propose `editeurs` (uids qui **modifient**, recopiés par le serveur pour une fête) et suggère le même champ pour le
   partage. La question est posée ici. *Recommandation* : **deux champs de même forme** : `partageAvec` (qui **voit**,
   choisi dans l'éditeur, ce lot) et `editeurs` (qui **modifie** : le serveur seul pour une fête ; pour une setlist
   ordinaire, le propriétaire ou un admin en V1, refusé à la création sinon). Un seul champ ferait modifier tous ceux qui
   voient, ou voir seulement ceux qui modifient. Si Timothée retient V1, l'écran n'a qu'une liste, qui remplit les deux
   champs, que seuls le propriétaire et les admins changent, et les règles l'imposent. Les deux specs nomment ces champs
   ainsi avant le code.
7. **Prévenir à chaque ajout ?** *Recommandation* : **une fois par personne** (PS13) : chacune reçoit « Setlist prête »
   quand la setlist est publiée avec au moins 4 chants, ou au prochain enregistrement si elle est ajoutée après ;
   préférence « Setlist prête » existante, même message. Variante : un message à part (« Léa M. t'a ajouté à l'équipe
   de … »), avec un texte FR et 中文 de plus.
8. **Planche ?** *Recommandation* : une petite planche (puce Équipe dans l'en-tête, la vue dans la colonne de droite,
   la feuille au téléphone, la carte de l'aperçu) **si Timothée veut voir avant de coder** ; sinon PS2-PS3 suivent les
   gestes existants de l'éditeur et les captures des trois appareils sont regardées après le code. La planche montre
   aussi le **double sens** du mot « Équipe » : les TEAM des lots 1 et 2 (organigramme, tâches, réunions) et l'équipe
   d'une setlist (cette spec). Le libellé recommandé reste « Équipe » (**choix** : il prolonge la carte « L'équipe de ce
   service ») ; variante à montrer à côté : une puce **« Avec qui »** (vue « Avec qui pour cette setlist »), qui ne
   croise pas les TEAM. En 中文, 服事团队 dans les deux cas (voir « Vocabulaire »).
9. **Marque « Dans l'équipe » dans la liste** ? *Recommandation* : **oui**, seulement sur une setlist hors des
   catégories de la personne : sans elle, un musicien de Paix ne comprend pas pourquoi une setlist du Culte paraît
   chez lui.
10. **Qui choisit l'équipe ?** *Recommandation* : **qui peut modifier la setlist** (PS6) : le créateur, les musiciens et la
    présidence de la catégorie, les admins ; aucun droit nouveau. Conséquence : un musicien peut ajouter ou retirer une
    personne mise par le créateur. Variante : le créateur et les admins seulement (`ownerId` ou admin dans l'éditeur ;
    sans V1, les règles ne l'imposent pas, le filtre serait côté client). **Avec V1, c'est la variante qui vaut**, et
    les règles l'imposent : `partageAvec` et `editeurs` ne changent que par le propriétaire ou un admin (Q1, Q6).
11. **Ordre et modèle du partage.** `docs/chantier-equipes-groupes/decisions.md` ne connaît que les lots 1 à 4 : ni la
    place du partage dans l'ordre du code, ni le modèle qui le code ne sont décidés. *Recommandation* : en parallèle des
    lots 1 et 3, avant le lot 4 (mêmes fichiers, voir « Place dans l'ordre des lots ») ; **Opus 5.5**, effort élevé. Sa
    mise en ligne suit PS17 : fusion de `ui/apple-design` sur `main` quand les lots déjà sur la branche sont prêts à
    partir, ou report ciblé du seul partage sur `main` si Timothée le décide.

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
