# Spec — un organigramme par groupe (lot 2 du chantier « équipes et groupes »)

Lot 2 du chantier « équipes et groupes » (`docs/chantier-equipes-groupes/README.md`) : un organigramme pour chacun
des cinq groupes (Paix, Fidélité, Bonté, Amour, Joie), avec son président, ses VP, son comité, ses rôles et leurs
titulaires, et le lien de ces rôles avec le planning, les droits et les notifications du groupe.

- **Origine** : Timothée, 08/10/2026 : « ajouter des organigrammes à ce qui existe déjà : les groupes, les comités de
  chaque groupe, les rôles qu'il y a dans les groupes et qui est dans quel rôle ». Décisions 9 à 20 du grill du même jour.
- **Date** : 08/10/2026. **Statut : spec écrite, questions tranchées le 08/10/2026 (décisions 35 à 45), attend le go
  de Timothée.** Rien n'est codé.
- **Base de code** : `ui/apple-design` à `5878ce1`. Le code n'a pas changé depuis `439e552` (base de la cartographie) :
  seuls des documents ont bougé. Les lignes citées ont été relues à `5878ce1`.
- **Sources** : `docs/chantier-equipes-groupes/decisions.md` (source de vérité, décisions 9 à 20 pour ce lot, et les
  réponses de Timothée du 08/10/2026 au soir, décisions 35, 36, 38, 42, 44 et 45, qui l'emportent sur les recommandations),
  `cartographie.md` (relevé du code, références revérifiées ici), `maquettes.md` et les planches `maquettes/v19-org-*.png`.
- **Ordre du code** (décidé) : lots 1 et 3 en parallèle (le partage d'une setlist aussi, décision 45), **puis ce lot 2**, puis le lot 4 (qui lit les rôles posés ici).
  Ce lot part donc du code laissé par le lot 1 (`docs/spec-equipes-sans-poles.md` : les pôles disparaissent, les
  équipes reçoivent tâches, réunions et entrées du Back-Office, droit `coordination`) et par le lot 3 (gestes du
  planning : copier, remplir vers le bas, coller, prévenir). Il parle du « mécanisme des équipes du lot 1 » pour les
  réunions et les tâches du comité, sans en fixer le détail.
- **Règles communes** : tout se fait sur `ui/apple-design` ; tests Playwright écrits avant le code et vus rouges, trois
  appareils toujours, cinq projets pour l'agencement ; FR et 中文 pour tout libellé nouveau (中文 relu par Timothée) ;
  tout est derrière `BACK_OFFICE` (`src/lib/backOffice.ts:5`) ; droits en double (`src/lib/access.ts` et
  `firestore.rules`), règles publiées à la main par Timothée ; aucune session ne lit la vraie base (tout se simule,
  `tests/helpers/fakeSession.ts`) ; aucun nom réel de membre (noms fictifs des planches : Léa M., Joël F., Hugo L.…).

## Décisions du lot (`decisions.md`, décisions 9 à 20, reprises telles quelles)

| # | Décision |
|---|---|
| 9 | Groupes avec organigramme : **Paix, Fidélité, Bonté, Amour, Joie** (Amour et Joie n'ont pas de planning). |
| 10 | Back-Office › Équipes › Organigramme : sélecteur **Église · Paix · Fidélité · Bonté · Amour · Joie** ; « Église » = l'organigramme actuel (la bascule Équipes · Musiciens passe à droite). Mise en page **A** : en tête (président, VP), le comité, puis les rôles **en cartes** ; un clic ouvre la fiche du rôle. |
| 11 | **Président** et **vice-président** : rôles fixes des cinq groupes, **nommés par les admins** ; **jusqu'à 2 VP** par groupe (réglable par un admin). |
| 12 | **Les autres rôles** sont créés par le président, le VP ou un admin : nom français, nom 中文 facultatif, **nombre de places** (vide = sans limite, affiché « 2 sur 3 »), case **« au comité »**, colonne du planning reliée (Paix, Fidélité, Bonté seulement ; **une colonne = un seul rôle**), droits à cocher. |
| 13 | **Comité** = président + VP + rôles cochés « au comité » ; c'est une équipe (ses propres réunions et tâches), ses référents sont le président et le VP. |
| 14 | **Titulaires** : une personne sans compte (nom libre) peut tenir un rôle ; une personne peut avoir **plusieurs rôles** ; **une personne n'appartient qu'à un seul groupe** (une personne d'un autre groupe est grisée : un admin peut la changer de groupe). Ajouter comme titulaire quelqu'un sans groupe le fait entrer dans le groupe. « Ajouter un titulaire » : **une seule recherche** (comptes, puis « Ajouter … sans compte » en bas). |
| 15 | **Droits** : président et VP tiennent l'organigramme de leur groupe, remplissent et publient le planning du groupe, envoient ses notifications ; pour les autres rôles, le président coche ces droits un par un ; **« Publier » inclut « Remplir »**. |
| 16 | **Qui voit quoi** : président ou VP sans le droit Équipes → tous les organigrammes en lecture, le sien modifiable, pas l'onglet Personnes. Dans l'App, page Équipes : **tous les groupes visibles en lecture**. |
| 17 | **Lien avec le planning** : un rôle relié à une colonne fait passer ses titulaires en tête de « Choisir » (libres ou déjà placés), les autres membres du groupe repliés sous « Voir tout le groupe », puis le nom sans compte. Les titulaires d'un rôle reçoivent les notifications du groupe. Les rôles de service existants restent valables pendant la transition. |
| 18 | Un titulaire sans compte apparaît aussi dans Planning › Sans compte (pour qu'un admin le relie plus tard). |
| 19 | Un seul organigramme par groupe, mis à jour (pas d'historique par année). |
| 20 | **Couleurs** d'Amour et de Joie : une couleur chacun (à proposer sur planche ; `serviceColors.ts` est gelé, changement validé par Timothée). |

Dans la suite, « D9 » à « D20 » désignent ces décisions ; une décision d'une autre spec est citée avec son fichier
(« D8 de `spec-organigramme.md` »), celles du lot 1 et les réponses de Timothée par leur numéro (« décision 7 »,
« décision 36 »).

### Planches retenues (`docs/chantier-equipes-groupes/maquettes/`)

| Planche | Sert à |
|---|---|
| `v19-org-eglise-ordinateur.png` | Le sélecteur en tête, la bascule Équipes · Musiciens à droite (D10) |
| `v19-org-groupe-a-ordinateur.png`, `v19-org-groupe-a-ipad.png`, `v19-org-groupe-telephone.png` | Mise en page **A** (D10) : en tête, comité, rôles en cartes ; iPad couché en trois colonnes ; téléphone en page entière, rond « + » |
| `v19-org-role-ordinateur.png` | Formulaire « Modifier le rôle » (noms, places, au comité, colonne, droits) |
| `v19-org-role-nouveau-telephone.png` | « Nouveau rôle » d'un groupe sans planning (Joie) |
| `v19-org-titulaire-a-telephone.png` | « Ajouter un titulaire » : **une seule recherche** (D14, piste A) |
| `v19-org-membre-ordinateur.png`, `v19-org-membre-telephone.png` | App › Équipes en lecture, « Toi » en tête |
| `v19-org-personne-ordinateur.png`, `v19-org-personne-telephone.png` | Équipes › Personnes : groupe, rôles, droits, « Changer de groupe » |
| `v19-org-choisir-ordinateur.png`, `v19-org-choisir-telephone.png` | « Choisir » au planning du Groupe Paix (D17) |

**Écartées** : `v19-org-groupe-b-ordinateur.png` et `v19-org-groupe-b-ipad.png` (piste B, D10), `v19-org-titulaire-b-telephone.png`
(deux onglets, D14). La **fiche d'un rôle** n'est dessinée que sur les planches B : son contenu (titulaires, planning,
droits du rôle) sert ici à la fiche qu'ouvre un clic sur une carte de la piste A. **Écarts aux planches imposés par les
décisions** : le bouton « + Nouvelle équipe » et les pastilles « Donne le pôle … » de la planche Église ne sont pas
construits (les 13 équipes sont fixes, D8 de `spec-organigramme.md` ; les pôles disparaissent au lot 1) ; dans « Choisir »,
les autres membres du groupe sont **tous** repliés sous « Voir tout le groupe » (D17), alors que la planche en
montre deux et écrit « Voir les 18 autres ». **Écarts de la spec (choix)** : la ligne « Libre · a servi le 18/10 » de la
planche devient « Libre » (aucune décision ne demande la date du dernier service) ; la carte Responsable louange de la
planche A montre « Remplit le planning » et « Publie » ensemble : Publier incluant Remplir (D15), « Publie » s'affiche
seule, comme sur la planche téléphone (Communication).

### Mots du lot

- **Président** (主席) et **vice-président** (副主席) : les deux rôles fixes d'un groupe (D11). À ne pas confondre avec la
  **présidence de séance** (主领), colonne `presidence` du planning, qu'un rôle ordinaire peut tenir (planche A).
- **Rôle** : un poste créé dans l'organigramme d'un groupe (Musiciens, Trésorerie, Accueil…). **Titulaire** : qui le tient,
  avec ou sans compte. **Comité** : l'équipe formée du président, des VP et des titulaires des rôles « au comité ».
- **Colonne reliée** : la colonne du planning du groupe dont « Choisir » propose d'abord les titulaires du rôle.

## Réponses de Timothée (08/10/2026, soir)

Décisions 35 à 45 de `decisions.md` qui touchent ce lot. Ce sont des décisions : elles l'emportent sur les
recommandations de la première version de cette spec, et les règles qui les suivent les citent. « Q1 » à « Q11 » sont
les numéros des questions ouvertes de cette première version (la liste « Questions ouvertes » est vide).

| # | Question de la spec | Réponse |
|---|---|---|
| 35 | (question 2 de `docs/spec-chants-fetes.md`) Une case de droit « Saisit les chants des fêtes » sur un rôle de groupe ? | **Oui** : ce lot l'ajoute aux droits d'un rôle, avec Remplir, Publier et Notifier, pour les cinq groupes. Saisissent les chants d'un passage de groupe : son président, ses VP, ses musiciens **et** les titulaires des rôles qui ont la case. → OG13, OG19 |
| 36 | Q11 — Le plafond de deux VP est-il réglable ? | **Un plafond réglable par un admin** (2 par défaut). → OG6 à OG8 |
| 38 | Q9 — Couleurs d'Amour, de Joie, de Noël et de Pâques | **D'accord** : une seule planche avec les huit candidates ; Joie et Noël ne prennent pas ensemble le jade et le vert sapin ; Timothée choisit sur la planche. → OG36, tranche OG-G |
| 42 | (question 3 de `docs/spec-equipes-sans-poles.md`, suivie ici par la Q8) Un membre de groupe sans rôle fait-il partie du public Louange ? | **Oui.** → OG38 : dès ce lot, tout membre d'un groupe, champ `groupe` compris (Amour, Joie), est du public Louange ; la Q8 garde la contrainte pour la fin de la transition |
| 44 | Q1 — Le droit Équipes donne-t-il aussi les organigrammes des groupes ? | **Non.** → OG26 |
| 45 | Q2 — Deux personnes enregistrent le même groupe en même temps | Recommandation acceptée : précondition sur l'`updateTime` lu, « Modifié par … entre-temps : recharge ». → OG37 |
| 45 | Q3 — Relier un titulaire sans compte | Recommandation acceptée : « Relier à un compte » dans le « ⋯ » du titulaire (admins), qui remplace le nom par le compte dans tous les rôles du groupe d'un coup. → OG16 |
| 45 | Q4 — Comptes hors du groupe dans « Choisir » | Recommandation acceptée : par la recherche seulement, après le groupe. → OG29 |
| 45 | Q5 — Les membres du groupe sans rôle reçoivent-ils les notifications du groupe ? | Recommandation acceptée : oui, tout le groupe. → OG28 |
| 45 | Q6 — Écrire `groupe` une fois pour tous par un script ? | Recommandation acceptée : non, il se déduit de `serviceRoles`. → OG2, « Migration des données » |
| 45 | Q7 — Amour et Joie à l'inscription | Recommandation acceptée : pas dans ce lot ; un admin les place, ou un président les fait entrer comme titulaires. → hors périmètre |
| 45 | Q8 — Fin de la transition (clés de groupe de `serviceRoles`) | Recommandation acceptée : une spec à part, une fois les cinq organigrammes remplis, qui tranche ensemble « Choisir », destinataires, setlists, public Louange et musiciens des fêtes ; d'ici là rien ne change. Contrainte de la décision 42 pour cette spec : quand les clés de `serviceRoles` cesseront de compter, le public Louange devra compter les membres des groupes (champ `groupe`). → hors périmètre |
| 45 | Q10 — 中文 de Bonté | Recommandation acceptée : 恩慈 (celui des catégories) pour les libellés nouveaux ; le 良善 de `planning.groupes.bonte` ne change pas dans ce lot. → « Libellés nouveaux », hors périmètre |

## Ce que le code fait aujourd'hui (`5878ce1`)

| Sujet | Aujourd'hui | Où |
|---|---|---|
| Les 13 équipes | Table en dur `EQUIPES` (id, nom, sous-titre, pôle) ; aucune équipe ne se crée depuis l'app (D8 de `spec-organigramme.md`). Aucun groupe, aucun comité de groupe ; « Prés. Paix », « VP Paix » ne sont que des mentions libres sur des membres de TEAM ORGA. | `src/lib/equipes/table.ts:20-36` |
| Membre d'équipe | `MembreEquipe` = `nom`, `uid` (`""` = sans compte), `mention`, `referent`, `essai`, `groupe` (sous-colonne de LOUANGE et EDD). | `src/types/equipe.ts:7-20` |
| Document d'équipe | `equipes/{id}` réécrit en bloc en REST (`saveEquipe`), puis `majPoles` demande la recopie des profils. | `src/lib/firebase/equipes.ts:42-78` |
| Droit de tenir l'organigramme | Booléen `equipes` du profil : `canEditerEquipes` (client), `isEquipier()` (règles, `equipes/{id}` en écriture), `exigerDroitEquipes` (serveur). | `src/lib/access.ts:88-100` ; `firestore.rules:128-135` ; `src/lib/equipes/serveur.ts:13-18` |
| Recopie sur le profil | `rattachementDe` calcule `poles`, `dansEquipes`, `referentDe` **en ne gardant que les ids de `EQUIPES`** (l. 38-42) : un autre id serait effacé à la recopie suivante. `recalculerPoles` n'écrit qu'un profil changé ; `POST /api/equipes/poles` revérifie le droit (404 back-office coupé, l. 22). Le lot 1 renomme `recalculerPoles` en `recalculerRattachement`, la route en `/api/equipes/rattachement` et `majPoles` en `majRattachement` (EQ28 de `spec-equipes-sans-poles.md`) : la suite emploie ces noms d'après le lot 1. | `src/lib/equipes/organigramme.ts:28-44` ; `src/lib/equipes/serveur.ts:32-68` ; `src/app/api/equipes/poles/route.ts:20-40` |
| Réunions d'équipe | Public `equipe:<id>` (motif `[a-z0-9-]+`) ; créées par un référent (`referentDe`) ou un admin ; vues et alimentées par les membres (`dansEquipes`) ; destinataires = profils dont `dansEquipes` contient l'id. | `src/lib/access.ts:145-150, 209-221, 268-279` ; `firestore.rules:198-202, 219-229` ; `src/lib/evenements/serveur.ts:39-50` |
| Publics de réunion proposés | `creatableEvenementPours` énumère `EQUIPES` (l. 234). | `src/lib/access.ts:226-239` |
| Libellés d'une équipe | Clés `equipes.team.<id>` (nom long : la carte, la fiche et le formulaire d'un évènement) et `equipes.court.<id>` (nom court : l'en-tête d'une réunion, l'aperçu de Moi, le bandeau), FR et 中文. | `src/app/evenements/EvenementCard.tsx:41` ; `src/app/back-office/evenements/FicheGestion.tsx:84` ; `src/components/evenements/EvenementForm.tsx:199` ; `src/components/reunions/EnTeteReunion.tsx:30` (court) |
| Groupe d'une personne | Pas de champ `groupe` : faire partie de Paix, Fidélité ou Bonté, c'est avoir la clé « Groupe … » dans `serviceRoles` (`GROUPES`, trois groupes). L'inscription propose ces trois groupes (présidence, musicien). | `src/types/user.ts:29-30, 40-81` ; `src/components/auth/ProfileFields.tsx:119-127` |
| Création d'un profil | L'intéressé crée le sien sans droits : `annonces`, `notify`, `poles`, `equipes`, `plannings`, `dansEquipes`, `referentDe` vides ; ensuite admins seuls. | `firestore.rules:88-101` |
| Plannings des groupes | Paix et Bonté : `presidence`, `musiciens`, `orateur`, `theme`, `percussion` (facultative). Fidélité : `presidence`, `orateur`, `theme`, `pianiste`, `guitariste`, `batterie` (facultative). | `src/lib/planning/grilles.ts:151-187` |
| Remplir un planning | `canEditPlanning` : admin ou `plannings` ∋ clé ; miroir `peutEcrirePlanning`. Cinq lectures directes de `plannings`, hors de cette fonction. | `src/lib/access.ts:309-322` ; `firestore.rules:468-485` ; lectures directes : `src/lib/access.ts:507, 535, 570`, `src/lib/tableauDeBord/donnees.ts:109`, `src/lib/tableauDeBord/disposition.ts:37` |
| Publier un trimestre | `canPublishPlanning(planning, isAdmin, notifyRights)` : admin, ou `notify` ∋ « tout le monde » ou ∋ « Groupe … » (D10 de `spec-planning-grille.md` : deux droits) ; la route relit `notify` et envoie à `uidsForCategory` (clé de `serviceRoles`). | `src/lib/planning/releases.ts:29-34, 47-55` ; `src/app/api/planning/release/route.ts:53-64, 84-88` |
| Notifier un groupe | Audiences `NOTIFY_GROUPS` (les trois groupes) ; `notify-audience` relit `notify`, envoie à `uidsForCategory`, contrôle les « personnes précises » par `uidsForCategories`. | `src/lib/push/audiences.ts:12-25` ; `src/app/api/push/notify-audience/route.ts:71-113` ; `src/lib/push/recipients.ts:55-81` |
| `notify` lu côté client | Composer (audiences permises, liste des destinataires par `serviceRoles`), panneau « Publier un planning » (ancienne page `/notifier` seulement, alimenté par la même liste `notify`), Messages, Moi, publication dans la page du planning, tableau de bord, entrées du Back-Office. | `src/components/messages/Notifier.tsx:43` (liste), `:56-59` (`canPublishAny`), `:80, :104` (destinataires), `:503` (panneau) ; `src/components/planning/PublishPlanningPanel.tsx:34` ; `src/app/back-office/messages/layout.tsx:18` ; `src/app/back-office/messages/page.tsx:16` ; `src/app/moi/page.tsx:50` ; `src/app/planning/groupes/page.tsx:95` ; `src/lib/tableauDeBord/donnees.ts:110` ; `src/lib/access.ts:536, 543, 569` |
| « Choisir » | D'abord les comptes qui ont le rôle de setlist de la colonne dans la catégorie (`serviceRoles`, l. 88), puis les autres comptes et les noms déjà écrits ; Thème en texte libre ; menu contre la case dès 1 024 px, feuille en dessous ; comptes lus par `listProfiles`. | `src/lib/planning/choisir.ts:25-58, 68-107` ; `src/components/planning/ChoisirNom.tsx:29-36, 96-200` ; `src/lib/planning/useGrilleApp.ts:25-34` ; `src/components/planning/PlanningGrille.tsx:372-380` |
| Back-Office › Équipes | Page réservée à `canEditerEquipes` (l. 18) ; rail Organigramme · Personnes pour les admins (l. 27) ; Équipes · Musiciens en pilules sous l'en-tête, bandeau des 13 équipes, panneau d'édition. Personnes : admins seuls. | `src/app/back-office/equipes/page.tsx:14-31` ; `src/app/equipes/EquipesClient.tsx:67, 89-100, 113-158` ; `src/app/back-office/equipes/personnes/page.tsx:12-14` |
| Entrées du Back-Office | `estResponsable` (admin, `poles`, `plannings`, `notify`, `annonces`, `equipes`, `referentDe`) ; entrée Équipes = `canEditerEquipes`. | `src/lib/access.ts:503-509, 527-547` |
| App › Équipes | `/equipes`, tout connecté, 404 back-office coupé. | `src/app/equipes/page.tsx:9-17` ; `src/app/equipes/EquipesClient.tsx:160-189` |
| Personnes | Filtres par clé de `serviceRoles` (`FILTERS`) ; fiche : Services et rôles, Pôles, Droits (Admin, Écrit dans, Nom au planning), prochains services. Écrans d'administration en français seulement. | `src/components/admin/Personnes.tsx:95, 133-165, 295-384` ; `src/components/admin/PersonnesVolets.tsx:179-279` |
| Planning › Sans compte | Les noms des plannings liés à aucun `planningName` ; admins seuls. | `src/components/admin/SansCompte.tsx:11-67` ; `src/app/back-office/planning/sans-compte/page.tsx:9-13` |
| Couleurs | `PLANNING_COLORS` et `CATEGORY_COLORS` gelés ; ni Amour ni Joie ; une catégorie inconnue est grise (`#64748b`). | `src/lib/serviceColors.ts:7-38` |
| Interrupteur | `/back-office/*` et `/equipes` en 404 sans `BACK_OFFICE` ; la route des équipes aussi. | `src/lib/backOffice.ts:5` ; `src/app/back-office/layout.tsx:8` ; `src/app/equipes/page.tsx:11` ; `src/app/api/equipes/poles/route.ts:22` |

## Modèle de données

### `groupes/{id}` (nouvelle collection, cinq documents au plus)

Un document par groupe, réécrit en bloc comme `equipes/{id}` (D19 : un seul organigramme, sans année). `id` ∈ `paix`,
`fidelite`, `bonte`, `amour`, `joie`. Le document naît quand un admin nomme le premier président ou VP (OG8).

| Champ | Type | Sens |
|---|---|---|
| `president` | `Titulaire \| null` | Nommé par un admin (D11) |
| `vp` | `Titulaire[]` | De 0 à `maxVp`, nommés par un admin (D11) |
| `maxVp` | `number` | Plafond des VP (décision 36) : entier de 1 à 9 ; **absent = 2** (`MAX_VP_DEFAUT`, `src/lib/groupes/table.ts`) ; écrit par un admin seul, dans la feuille « Nommer » (OG6) |
| `roles` | `RoleGroupe[]` | Les autres rôles, dans l'ordre de création |
| `updatedAt`, `parUid`, `parNom` | | Qui a touché en dernier (comme `equipes/{id}`) |

`Titulaire` = `Pick<MembreEquipe, "nom" | "uid">` (`src/types/equipe.ts:9-20`) : on garde le sens de `MembreEquipe`
(`uid` vide = sans compte, nom jamais traduit) sans ses champs propres à l'église (`mention`, `referent`, `essai`, et
`groupe`, qui y désigne une sous-colonne et prêterait à confusion avec le groupe d'une personne). *Choix de la spec.*

`RoleGroupe` :

| Champ | Type | Sens |
|---|---|---|
| `id` | `string` | Identifiant stable tiré au hasard à la création (la colonne reliée et « Choisir » s'y rattachent) |
| `nom` | `string` | Nom français, obligatoire (80 caractères au plus) |
| `nomZh` | `string` | Nom 中文 facultatif, `""` sinon |
| `places` | `number \| null` | `null` = sans limite |
| `comite` | `boolean` | « au comité » |
| `colonne` | `string \| null` | Clé d'une colonne de personnes du planning du groupe ; toujours `null` pour Amour et Joie |
| `droits` | `{ remplir: boolean; publier: boolean; notifier: boolean; saisirFetes: boolean }` | Cochés par qui tient l'organigramme (OG13). `saisirFetes` (décision 35) : « Saisir les chants des fêtes » ; **absent = faux** (lecture tolérante d'un rôle écrit sans la case) |
| `titulaires` | `Titulaire[]` | Avec ou sans compte |

Types dans `src/types/groupe.ts` (nouveau) ; lecture et écriture REST dans `src/lib/firebase/groupes.ts` (nouveau, sur le
modèle de `src/lib/firebase/equipes.ts`).

### Table des groupes — `src/lib/groupes/table.ts` (nouveau, sans dépendance, comme `src/lib/equipes/table.ts`)

| `id` | Catégorie (audience, `serviceRoles`) | Clé de planning | Comité |
|---|---|---|---|
| `paix` | Groupe Paix | `paix` | `comite-paix` |
| `fidelite` | Groupe Fidélité | `fidelite` | `comite-fidelite` |
| `bonte` | Groupe Bonté | `bonte` | `comite-bonte` |
| `amour` | Groupe Amour (nouvelle) | — | `comite-amour` |
| `joie` | Groupe Joie (nouvelle) | — | `comite-joie` |

`GROUPES` de `src/types/user.ts:29` **ne change pas** : il porte les catégories de setlist et l'inscription, qu'Amour et
Joie n'ont pas. La table exporte aussi `MAX_VP_DEFAUT = 2` (plafond des VP quand `maxVp` est absent, décision 36).

### Profil `users/{uid}` : champs nouveaux, écrits par le serveur seul

| Champ | Type | Sens |
|---|---|---|
| `groupe` | `string` | Id d'un groupe, ou `""` = sans groupe (choisi par un admin). **Absent** = déduit (OG2). |
| `remplitParRole` | `string[]` | Clés de planning que la personne remplit par un rôle (président, VP, « Remplir » ou « Publier ») |
| `publieParRole` | `string[]` | Clés de planning qu'elle publie par un rôle (président, VP, « Publier ») |
| `notifieParRole` | `string[]` | Audiences qu'elle notifie par un rôle (président, VP, « Notifier ») |
| `dansEquipes`, `referentDe` | existants | Reçoivent en plus `comite-<groupe>` (OG17, OG19) |

Ces listes sont **à part** de `plannings` et `notify`, cochés par un admin : la recopie ne peut pas savoir si un admin avait
aussi coché le même droit, elle ne touche donc jamais à ces deux champs. Les règles lisent le profil, pas les cinq
organigrammes (patron D9 de `spec-organigramme.md`, repris pour `dansEquipes` au lot U6, R4). `fromFsProfile`
(`src/lib/firebase/users.ts:24-47`) et `FakeProfile` (`tests/helpers/fakeSession.ts:13-36`) les lisent.

**Pas de liste recopiée pour « Saisir les chants des fêtes »** (décision 35) : aucune règle Firestore et aucun écran
client ne la lit. Le lot 4 calcule les ayants droit d'un passage **sur le serveur**, en lisant `groupes/{id}` par l'Admin
SDK (CF16 de `docs/spec-chants-fetes.md`, routes `/api/fetes/droits` et `/api/fetes/saisir`), puis recopie lui-même les
uids dans `editeurs` de la setlist de fête (CF17) ; il lit donc la case directement dans le rôle : les titulaires avec
compte d'un rôle dont `droits.saisirFetes` est vrai, et qui sont du groupe (`groupeDe`, OG2-OG3). Une recopie sur le
profil serait une seconde source à tenir à jour, sans lecteur.

### Le comité dans les mécanismes d'équipe, sans toucher à D8

- `EQUIPES` garde ses 13 équipes. Les cinq ids `comite-<groupe>` viennent de la table des groupes (`COMITES`, exporté par
  `src/lib/groupes/table.ts`, que `src/lib/access.ts` peut lire comme il lit `EQUIPES`) : ils ne
  se créent pas plus qu'une équipe, n'ont **pas** de document `equipes/comite-*`, et leurs membres ne se tiennent jamais à
  la main : ils se **calculent** depuis `groupes/{id}`.
- Tout ce que le lot 1 fait pour une équipe passe par `dansEquipes`, `referentDe` et `equipe:<id>` : réunions, tâches,
  entrées Réunions + Tâches du Back-Office, destinataires. Le comité y entre donc sans code propre, à deux conditions :
  (1) la recopie garde les ids de comité (aujourd'hui `rattachementDe` les effacerait, `src/lib/equipes/organigramme.ts:38-42`) ;
  (2) là où le code **énumère** les équipes (ordre de la recopie, `creatableEvenementPours`, `src/lib/access.ts:234`, et
  ce que le lot 1 ajoute d'équivalent : `equipesDe` (EQ5), `equipesDesTaches` et `equipesOuCreer` (EQ9) de
  `spec-equipes-sans-poles.md`), la liste devient `[...EQUIPES.map(id), ...COMITES]`. L'ordre de `COMITES` suit celui du
  tableau des groupes ci-dessus.
- Libellés : clés `equipes.team.comite-<groupe>` et `equipes.court.comite-<groupe>` ; tous les écrans qui affichent
  `equipes.team.${id}` les montrent sans changement.
- Une personne est « du comité » par la liste des cinq ids, **jamais par le préfixe** `comite-` : `comite-franco` est une
  équipe de l'église.
- **Les membres d'un comité ne viennent que de `groupes/{id}`.** Les règles de `equipes/{id}` ne bornent pas l'id
  (`firestore.rules:132-135` : un compte qui a le droit Équipes peut y écrire un document `equipes/comite-paix`). La
  recopie **ignore** donc tout document `equipes/comite-<groupe>` pour les cinq ids de `COMITES` ; sans cela, un droit
  Équipes donnerait `referentDe: comite-paix`, donc `tientGroupe`, à n'importe quel compte.

## Règles (OG)

### Appartenance à un groupe

| # | Règle |
|---|---|
| OG1 | Les cinq groupes sont fixes (D9) : table ci-dessus. Aucun groupe ne se crée ni ne se retire depuis l'app ; `groupes/{id}` n'accepte que ces cinq ids (règles). |
| OG2 | Une personne a au plus un groupe (D14). Une seule fonction pure, `groupeDe(profil)`, le lit partout (client et serveur) : la valeur de `groupe` si le champ existe (`""` = sans groupe) ; sinon, **déduit de `serviceRoles`** quand le profil y a exactement une clé de groupe ; sinon sans groupe. **Décision 45** (Q6 : déduire plutôt qu'écrire par un script) : rien à écrire pour les comptes d'aujourd'hui (D17, transition) et un membre de Bonté inscrit comme tel est grisé dans Paix dès le premier jour (D14). |
| OG3 | Entrer dans un groupe (D14) : un admin le choisit (« Changer de groupe », OG5) ; ou une personne **sans groupe** devient titulaire, président ou VP d'un rôle du groupe : le serveur écrit alors `groupe`. Une personne d'un autre groupe n'est jamais placée : grisée dans la recherche ; si elle arrive quand même dans le document (écriture directe, deux ajouts croisés), le serveur l'ignore (ni groupe ni droit), la route la renvoie dans `ignores` et la carte la montre grisée « Dans le Groupe Bonté ». |
| OG4 | *Choix* : quitter tous ses rôles ne fait pas sortir du groupe. Seul un admin change quelqu'un de groupe ou le met « Sans groupe ». |
| OG5 | « Changer de groupe » (admins, planche personne) : la route serveur retire la personne de la présidence, des VP et de tous les rôles de l'ancien groupe, écrit `groupe` (un id ou `""`), puis recopie son profil, en une seule écriture groupée. Sa clé de `serviceRoles` n'est pas touchée (D17). La phrase de la planche le dit avant : « Changer de groupe retire ses rôles du Groupe Paix ». |

### Président et vice-présidents

| # | Règle |
|---|---|
| OG6 | Président (主席) et vice-président (副主席) : deux rôles fixes de chaque groupe, toujours affichés en tête, même vides (« À nommer »). Un président et des VP. **Plafond des VP réglable par un admin (décision 36)** : champ `maxVp` du document du groupe, 2 quand il est absent (`MAX_VP_DEFAUT`). L'admin le change dans la feuille « Nommer » : « Vice-présidents · au plus 2 » avec « − » et « + » ; « − » ne descend ni sous 1 ni sous le nombre de VP déjà nommés, « + » s'arrête à 9 (*choix de la spec* : bornes de l'affichage en tête). La feuille offre autant de places de VP que le plafond ; quand elles sont prises, elle n'offre plus d'en ajouter. Les règles refusent un document dont `vp` dépasse le plafond (OG8). |
| OG7 | Seuls les admins les nomment ou les retirent (D11), par « Nommer » dans la carte En tête, avec la même recherche que les titulaires (OG14). Un président ou un VP peut être sans compte (D14) : il s'affiche, n'a aucun droit et n'est pas référent du comité. |
| OG8 | La première écriture d'un groupe, faite par un admin (« Nommer » ou « Nouveau rôle »), crée son document (`create` réservé aux admins) ; un président n'existe qu'une fois ce document écrit. Président et VP ne peuvent changer ni `president`, ni `vp`, ni `maxVp`, même par une écriture directe (règles : pour un non-admin, ces trois champs inchangés) ; seul un admin écrit `maxVp` (décision 36). Toute écriture, d'un admin compris, garde `vp` dans le plafond (`vp.size() <= maxVp`, 2 si absent) et `maxVp` entier de 1 à 9. |
| OG9 | Président et VP (D15) : tiennent l'organigramme de leur groupe (rôles, titulaires, droits des rôles), remplissent et publient le planning du groupe (Paix, Fidélité, Bonté), notifient le groupe, et sont référents du comité (D13). |

### Rôles

| # | Règle |
|---|---|
| OG10 | Créés, modifiés et supprimés par le président, un VP ou un admin (D12). Champs : nom français (obligatoire), nom 中文 facultatif, places, « au comité », colonne reliée, droits. *Choix* : les rôles « au comité » d'abord, puis les autres, chacun dans l'ordre de création (planches A et B). Supprimer un rôle demande confirmation dans le site (`useConfirmer`) et libère sa colonne. |
| OG11 | Places (D12) : « − » et « + », champ vide = sans limite. Affichage « 2 sur 3 places » (points pleins et creux, orange tant qu'il reste une place), « 1 sur 1 place », « 3 titulaires · sans limite », « 0 sur 1 place · Personne » en orange. « − » ne descend pas sous le nombre de titulaires ; un rôle plein n'offre plus « Ajouter un titulaire ». |
| OG12 | Colonne reliée (D12), Paix, Fidélité et Bonté seulement : « Aucune » ou une colonne de personnes du planning du groupe (`colonneDePersonnes`, `src/lib/planning/choisir.ts:56-58`, jamais Thème) : Paix et Bonté → Présidence, Musiciens, Orateur, Percussion ; Fidélité → Présidence, Orateur, Pianiste, Guitariste, Batterie. **Une colonne = un seul rôle** : une colonne reliée à un autre rôle porte un cadenas et ne se choisit pas (« Cadenas : colonne déjà reliée à un autre rôle. Thème n'est pas une personne : pas de lien. »). Si deux rôles portaient la même colonne (écriture directe), « Choisir » prend le premier. |
| OG13 | Droits d'un rôle (D15, décision 35) : « Remplir le planning du groupe », « Publier le planning » (cocher Publier coche Remplir, qui reste coché et grisé : **Publier inclut Remplir**), « Notifier le groupe », « Saisir les chants des fêtes » (`saisirFetes`, **décision 35**, indépendante des trois autres). Amour et Joie : « Notifier le groupe » et « Saisir les chants des fêtes » (ils n'ont pas de planning mais ont des passages aux fêtes), et la phrase « Le Groupe Joie n'a pas de planning : pas de colonne à relier, ni de droit sur le planning. » La case ne donne rien dans ce lot : le lot 4 la lit dans `groupes/{id}` (CF16 de `docs/spec-chants-fetes.md` ; modèle, « Pas de liste recopiée »). *Lecture de D15 (« le président coche ») avec D12 (« créés par le président, le VP ou un admin ») : qui tient l'organigramme du groupe coche les droits.* |

### Titulaires

| # | Règle |
|---|---|
| OG14 | « Ajouter un titulaire » (D14, piste A) : **une seule recherche** (prénom, nom, nom de planning, sans accents ni casse). « Comptes » d'abord, chacun avec sa ligne : « Groupe Paix » ; « Sans groupe · entrera dans le Groupe Paix » ; grisé et inactif, « Dans le Groupe Bonté : un admin peut le changer de groupe » ; grisé, « Déjà titulaire » pour ce rôle. Puis « Sans compte » : « Ajouter « Ma… » sans compte » (« Écris le nom complet : il n'aura pas de notification »). |
| OG15 | Une personne peut tenir plusieurs rôles (D14) ; la fiche du rôle le dit (« aussi Responsable louange · au comité »). *Choix* : un titulaire sans compte du même nom (`normalizeName`) dans deux rôles du groupe est une seule personne (compte des personnes, Sans compte, « Choisir »). |
| OG16 | Le « ⋯ » d'un titulaire : « Retirer » ; pour un titulaire sans compte, et pour les admins seulement, **« Relier à un compte »** (**décision 45**, Q3 ; D18 : « pour qu'un admin le relie plus tard »). Il ouvre la recherche d'OG14, comptes seulement (ni « sans compte », ni personne d'un autre groupe : grisée, OG3), et remplace ce nom (`normalizeName`, OG15) par le compte choisi **dans tous les rôles du groupe, présidence et VP compris, en une seule écriture** de `groupes/{id}` (OG37), puis appelle la route (OG21) avec ce compte ; un compte sans groupe y entre (OG3). Un rôle où le compte est déjà titulaire garde une seule ligne. *Choix de la spec* : les noms écrits dans les cases de la grille ne changent pas (le planning garde ses noms ; Planning › Sans compte, D18, sert à les relier). Un titulaire avec compte sans nom de planning porte « sans nom de planning : absent de « Choisir » » (règle existante, `src/lib/planning/choisir.ts:64-65, 85`). |

### Comité

| # | Règle |
|---|---|
| OG17 | Comité (D13) = président + VP + titulaires des rôles « au comité ». C'est l'équipe `comite-<groupe>` : ses membres avec compte ont l'id dans `dansEquipes`, le président et les VP aussi dans `referentDe`. Ses réunions (`equipe:comite-paix`), ses tâches et les entrées Réunions + Tâches de ses membres sont celles du **mécanisme des équipes du lot 1**, sans rien de propre. Le comité n'est pas une carte du bandeau Église. |
| OG18 | La carte « Le comité » (« 6 personnes · une équipe », « Le président, les VP et les rôles cochés « au comité ». Référents : le président et les VP. ») porte « Réunions et tâches du comité », lien vers `/back-office/taches/comite-<groupe>` (rail des équipes du lot 1, EQ9 ; les réunions du comité sont celles de Back-Office › Réunions, public « Comité Paix »), montré à ses membres et aux admins (les autres n'y ont pas accès). |

### Droits et recopie

| # | Règle |
|---|---|
| OG19 | Ce que le serveur recopie sur le profil d'une personne de **son** groupe (`groupeDe` après OG3) — Amour et Joie n'ont pas de clé de planning, donc jamais `remplitParRole` ni `publieParRole` : |

| La personne tient… | `remplitParRole` | `publieParRole` | `notifieParRole` | `dansEquipes` | `referentDe` |
|---|---|---|---|---|---|
| la présidence ou une vice-présidence | clé du planning | clé du planning | catégorie du groupe | `comite-<g>` | `comite-<g>` |
| un rôle « Remplir » | clé du planning | — | — | — | — |
| un rôle « Publier » | clé du planning | clé du planning | — | — | — |
| un rôle « Notifier » | — | — | catégorie du groupe | — | — |
| un rôle « au comité » | — | — | — | `comite-<g>` | — |
| un rôle « Saisir les chants des fêtes » | — | — | — | — | — |

La dernière ligne est là pour le dire : la case `saisirFetes` (décision 35) n'est **pas** recopiée sur le profil ; le lot 4
la lit dans `groupes/{id}` sur le serveur (modèle, « Pas de liste recopiée »).

| # | Règle |
|---|---|
| OG20 | Une seule fonction de recopie pour l'église et les groupes : celle que le lot 1 laisse dans `src/lib/equipes/serveur.ts` (`recalculerRattachement`, ex-`recalculerPoles`, l. 37-57 aujourd'hui, et `rattachementDe`) lit aussi `groupes/*` ; `dansEquipes` et `referentDe` = équipes de l'église puis comité, dans l'ordre de `[...EQUIPES, ...COMITES]`. Elle pose en plus `groupe` (OG3) et les trois listes `*ParRole` (OG19). Les deux routes l'appellent (`/api/equipes/rattachement` du lot 1 et `/api/equipes/groupes`) : aucune n'efface les ids ni les champs de l'autre. « Recalculer depuis l'organigramme » (`recalculerDepuisOrganigramme`, l. 65-68 aujourd'hui ; admins) recalcule les membres des équipes **et** les comptes cités dans `groupes/*`. Un profil inchangé n'est pas réécrit (comparaison champ par champ : `groupe` est une chaîne, les autres des listes). |
| OG21 | Route **`POST /api/equipes/groupes`** (nouveau, Admin SDK, 404 back-office coupé) : `{ groupe, uids }` — l'appelant doit tenir ce groupe (`exigerTenirGroupe`, nouveau : admin, ou `referentDe` ∋ `comite-<groupe>` relu en base) ; `uids` = tous les comptes cités dans le document avant et après l'écriture (quelques dizaines au plus) ; le serveur relit les documents et recopie (OG19), pose `groupe` (OG3) et renvoie `{ maj, ignores }`. `{ changerGroupe: { uid, groupe } }` : admins seuls (OG5). Le navigateur n'écrit jamais un profil (`allow update: if isAdmin()` ne bouge pas) ; l'appelant choisit les comptes à recalculer, jamais les droits. |
| OG22 | Remplir (D15) : `canEditPlanning` lit `plannings` **ou** `remplitParRole` ; miroir `peutEcrirePlanning`. Les cinq lectures directes de `plannings` (`access.ts:507, 535, 570`, `tableauDeBord/donnees.ts:109`, `tableauDeBord/disposition.ts:37`) comptent aussi `remplitParRole`. D10 de `spec-planning-grille.md` (remplir ≠ publier) reste vrai pour les droits cochés par un admin ; pour un rôle, Publier inclut Remplir. |
| OG23 | Publier (D15) : `canPublishPlanning(planning, isAdmin, notifyRights, publieParRole = [])` (`src/lib/planning/releases.ts:49-55`, module pur) ajoute `|| publieParRole.includes(planning.key)`. *Choix* : une seule fonction, comme l'attend le lot 3 (PG35 de `spec-planning-gestes.md`), plutôt qu'un doublon dans `access.ts`. Appelants à mettre à jour : `groupes/page.tsx:95`, `culte/page.tsx:64`, `tableauDeBord/donnees.ts:110`, `access.ts:536, 569`. Le panneau « Publier un planning » (`Notifier.tsx:56-59, 479-503`, `PublishPlanningPanel.tsx:34`) n'existe que sur l'ancienne page `/notifier`, en ligne (au Back-Office la publication se fait depuis la page du planning, `Notifier.tsx:33-35`) : il garde la seule liste `notify`, sans rôle (OG27), et ne change pas. `publieParRole` et `audiencesNotifiables` restent deux listes distinctes : « Notifier » ne donne pas « Publier ». Du lot 3 : `peutPrevenir` (même module, ci-dessous), qu'appellent la page du planning et la route `/api/planning/changements` (PG35 de `spec-planning-gestes.md`) ; `BoutonPublication` n'appelle pas `canPublishPlanning` (il appelle la route, qui revérifie). La route `/api/planning/release` relit `publieParRole` de l'appelant. « Prévenir des changements » (décision 25 : « ceux qui publient ou notifient ce planning ») : la fonction du lot 3, étendue, `peutPrevenir(planning, isAdmin, notifyRights, publieParRole = [], notifieParRole = [])` = `canPublishPlanning(planning, isAdmin, notifyRights, publieParRole) || notifieParRole.includes(planning.notifyAudience)` (`notifyAudience` : « Groupe Paix » pour Paix, `releases.ts:31`). Un rôle « Notifier » seul prévient donc des changements sans pouvoir publier. La page lui passe les deux listes du profil ; la route `/api/planning/changements` relit `publieParRole` **et** `notifieParRole` de l'appelant dans `users/{uid}`. |
| OG24 | Notifier (D15) : `audiencesNotifiables(profil, backOffice = BACK_OFFICE)` (nouveau, `access.ts`) = `notify` ∪ `notifieParRole` ; lu par le composer (`Notifier.tsx:43`), Messages (`layout.tsx:18`, `page.tsx:16`), Moi (`moi/page.tsx:50`), `entreesBackOffice` (`messages`) et `estResponsable`. Côté client, la liste des destinataires d'une audience de groupe (`Notifier.tsx:80, 104`, aujourd'hui `audience in p.serviceRoles`) lit la même fonction pure que le serveur (`estDuGroupe` : clé de `serviceRoles` ou `groupeDe`, OG28). `/api/push/notify-audience` accepte une audience de groupe si elle est dans `notify` ou `notifieParRole` (relu de l'appelant) ; en « personnes précises », les personnes permises comprennent les membres de ces groupes (OG28). |
| OG25 | Audiences nouvelles « Groupe Amour » et « Groupe Joie » dans `NOTIFY_GROUPS` (`src/lib/push/audiences.ts:13-17`, rangée « Groupes » ; seulement si `BACK_OFFICE`, OG27) ; `NOTIFY_CATEGORIES` et `isValidAudience` (l. 20-25) suivent ; elles se cochent aussi dans Personnes (`Personnes.tsx:456` lit `NOTIFY_GROUPS`) ; libellés `categories.*` FR et 中文 (clés « Groupe Amour » et « Groupe Joie », comme « Groupe Paix », `fr.json:549`) ; couleur OG36. |
| OG26 | Qui voit quoi (D16) : tout connecté voit les six organigrammes en lecture (App › Équipes). Back-Office › Équipes s'ouvre à `canEditerEquipes` **ou** au président et aux VP d'un groupe (`tientUnGroupe`) : ils voient tous les organigrammes, le leur modifiable, sans le rail Personnes (admins). **Décision 44** : le droit Équipes garde l'organigramme de l'église (comme aujourd'hui) et ne donne pas ceux des groupes ; un président qui a aussi le droit Équipes tient l'église et son groupe. `estResponsable` compte aussi les trois listes « par rôle » (`referentDe` compte déjà). `planningsDuBackOffice` et l'entrée Planning comptent `remplitParRole`, `publieParRole` (via `canPublishPlanning`, OG23) et les plannings que l'on peut prévenir (`peutPrevenir`, OG23 : un rôle « Notifier » seul compte donc) : pour qui ne fait que prévenir, la grille s'y affiche en lecture, avec la bannière « Prévenir des changements » du lot 3. La décision 25 dit « ceux qui publient ou notifient » : ce n'est pas une question. |
| OG27 | Interrupteur : pages (`/back-office/*`, `/equipes`) et route en 404 sans `BACK_OFFICE` ; **les droits et destinataires venus des rôles ne comptent que si `BACK_OFFICE`**. Raison : local et en ligne partagent le même Firestore ; les organigrammes remplis en local ne doivent rien changer en ligne. Les fonctions que l'ancien site partage (`audiencesNotifiables`, `uidsDuGroupe`, `estDuGroupe`, la liste des audiences de `NOTIFY_GROUPS`) prennent l'interrupteur en paramètre, `backOffice = BACK_OFFICE` (patron de `entreesBarre`, `src/lib/navigation.ts:104-115`) : un test pur, lancé hors du serveur de test, ne voit pas la variable `NEXT_PUBLIC_BACK_OFFICE` et doit pouvoir la poser lui-même. Les deux routes qui touchent aussi l'ancien site (`/api/planning/release`, `/api/push/notify-audience`) n'écoutent `publieParRole` et `notifieParRole` que si `BACK_OFFICE`. Les fonctions du seul Back-Office (`canEditPlanning`, `estResponsable`, `entreesBackOffice`, `planningsDuBackOffice`) sont déjà derrière `gestion`, `BACK_OFFICE` ou la mise en page en 404. Les règles ne lisent pas l'interrupteur : un titulaire « Remplir » pourrait écrire sa grille en REST depuis le site en ligne, droit qu'il a de toute façon. |

### Notifications et planning (D17, D18)

| # | Règle |
|---|---|
| OG28 | Destinataires des notifications du groupe (publication d'un trimestre, Notifier « Groupe … ») : `uidsDuGroupe(categorie, db)` (nouveau, `src/lib/push/recipients.ts`, qui applique la fonction pure `estDuGroupe(profil, categorie, backOffice)` aux profils lus) = comptes dont `serviceRoles` a la clé (comme aujourd'hui, D17) ∪ comptes dont `groupeDe` est ce groupe. Les titulaires avec compte sont du groupe (OG3), donc ils reçoivent (D17). **Décision 45** (Q5) : tout le groupe, membres sans rôle compris, et non les seuls titulaires (planche du rôle Joie : « Envoyer une notification à tout le Groupe Joie » ; un groupe sans planning n'a pas d'autre public). Les évènements de section (`src/lib/evenements/serveur.ts:49`, `uidsForCategory`) et les rappels de la scène (`src/app/api/cron/reminders/route.ts:285`, `uidsForCategories`) ne changent pas. |
| OG29 | « Choisir », planning d'un groupe, colonne reliée à un rôle (D17) : ① « Titulaires du rôle Musiciens » : tous ses titulaires (compte avec nom de planning, ou nom sans compte), libres ou déjà placés, chacun avec « Libre » ou « Déjà le 4 et le 11/10 » (les dimanches de la période affichée où ce nom est déjà dans cette colonne) ; ② « Voir tout le groupe (n) », replié : les autres membres (comptes du groupe, titulaires sans compte des autres rôles), chacun avec ses rôles ou « Aucun rôle » ; ③ « Écrire un nom sans compte… » ; « Vider la case » comme aujourd'hui. L'entrée « Remplir vers le bas » du lot 3 (PG18 à PG20 de `spec-planning-gestes.md`) reste sous les noms : après « Voir tout le groupe » (replié ou déplié) et avant « Écrire un nom sans compte… ». Son aperçu et son aide ne changent pas. Une recherche filtre tout et trouve aussi, après le groupe, les comptes d'ailleurs et les noms déjà écrits dans la grille (**décision 45**, Q4 : un orateur invité, un musicien d'ailleurs, par la recherche seulement, jamais dans les listes). |
| OG30 | Colonne non reliée, groupe sans organigramme, autres plannings : « Choisir » ne change pas (`serviceRoles` d'abord, D17 : les rôles de service restent valables). Rien ne change non plus pour Mes services, les rappels du matin et les droits sur les setlists (ils lisent le planning et `serviceRoles`). |
| OG31 | *Choix d'après la planche Choisir* : au Back-Office, l'en-tête d'une colonne reliée porte l'icône de lien (libellé lu « Reliée au rôle Musiciens »). |
| OG32 | Planning › Sans compte (D18, admins) : un bloc « Titulaires sans compte (n) » : nom · groupe · rôles, chaque ligne menant à l'organigramme du groupe ; un nom aussi écrit dans un planning n'est compté qu'une fois. |

### Divers

| # | Règle |
|---|---|
| OG33 | Un seul organigramme par groupe, sans année (D19) : sous-titre sans année, rien d'archivé ; `updatedAt` et `parNom` gardent le dernier passage. |
| OG34 | Nombre de personnes d'un groupe (sous-titre « Groupe Paix · 24 personnes ») : comptes dont `groupeDe` est ce groupe + titulaires sans compte distincts. |
| OG35 | Écrans d'administration (Personnes, Sans compte) : les libellés **nouveaux** passent par `fr.json` et `zh-CN.json` comme le reste du lot, bien que ces écrans soient aujourd'hui en français seul. |
| OG36 | Couleurs d'Amour et de Joie (D20, **décision 38**) : **grises** (`#64748b`, repli de `categoryColor`) comme sur les planches, jusqu'à ce que Timothée choisisse sur la planche (tranche OG-G) ; alors seulement `CATEGORY_COLORS` (`src/lib/serviceColors.ts:22-33`) reçoit « Groupe Amour » et « Groupe Joie » ; `serviceColors.ts` reste gelé jusque-là. **Une seule planche** montre les **huit candidates** côte à côte, avec les couleurs gelées voisines : Amour, Joie (ce lot), Noël et Pâques (lot 4, CF26 de `spec-chants-fetes.md`). Blanc sur la couleur ≥ 4,5:1, calculé : **Amour** framboise `#c2306e` (5,3:1) ou `#b8336a` (5,7:1), proches d'Interfranco `#9d3c63` ; **Joie** jade `#1f7a63` (5,2:1) ou ocre `#9a6a00` (4,7:1, proche d'Intergroupe `#a87b0f`) ; **Noël** vert sapin `#17633f` ou rouge houx `#b4232a` (proche de Fidélité `#a03030`) ; **Pâques** violet `#7c3aed` ou ambre `#b45309` (proche de Bonté `#8b4a2e`). **Joie et Noël ne prennent pas ensemble le jade et le vert sapin** (décision 38). Timothée choisit une couleur pour chacun des quatre. |
| OG37 | Deux personnes enregistrent le même groupe en même temps (**décision 45**, Q2) : toute écriture de `groupes/{id}` depuis le navigateur porte la précondition `currentDocument.updateTime` = l'`updateTime` lu (patron de l'ordre de passage, D20 des retouches v18 : `patch` de `src/lib/firebase/programmes.ts:103-121`, `version` lue l. 54). Si le document a changé depuis (HTTP 400 `FAILED_PRECONDITION`), rien n'est écrit, la route n'est pas appelée, et l'écran dit « Modifié par {{prenom}} entre-temps : recharge » (`parNom` relu ; « Modifié entre-temps : recharge » sans nom), libellés existants ; le formulaire reste ouvert. La création du document (première écriture d'un admin, OG8) passe par `POST …/groupes?documentId=<id>` : s'il existe déjà (409, un autre admin l'a créé entre-temps), rien n'est écrit et le même message s'affiche (patron de `creerEdition` avec `protege`, `src/lib/firebase/programmes.ts:146-175`). Cela ferme aussi un trou de la recopie : la route recalcule les comptes que l'appelant lui désigne d'après le document qu'il a lu (OG21) ; sans précondition, un compte retiré par l'autre éditeur garderait ses droits. |
| OG38 | Public Louange (**décision 42** : un membre de groupe sans rôle en fait partie, lu ici dans sa forme la plus simple) : dès ce lot, la branche Louange de `estDeLEquipe` (les trois miroirs du lot 1 : `src/lib/access.ts`, le serveur, `firestore.rules`, EQ4 de `docs/spec-equipes-sans-poles.md`) compte aussi un champ `groupe` non vide, en plus des clés de `serviceRoles`. Les membres d'Amour et de Joie (sans clé) et une personne placée dans un groupe sans clé en font donc partie. `groupe` est écrit par le serveur seul (OG20) et lisible par les règles. |

## Écrans

### Back-Office › Équipes › Organigramme (`/back-office/equipes`, `?groupe=<id>`)

- **Accès** : `canEditerEquipes` ou président / VP d'un groupe (OG26) ; les autres gardent `ReserveAuxAdmins`.
- **En-tête commun** (`EnTetePage`) : « Équipes » ; sous-titre de l'église inchangé ; d'un groupe : « Groupe Paix ·
  24 personnes · organigramme tenu par son président, ses VP et les admins » ; action « + Nouveau rôle »
  (`BoutonNouveau`, rond « + » sur téléphone) pour qui tient ce groupe ; rail Organigramme · Personnes : admins.
- **Sous l'en-tête** : à gauche le sélecteur en pilules (`Pilules`, `obligatoire`, la pilule active à la `couleur` du
  groupe comme dans les plannings, Église à l'encre) Église · Paix · Fidélité · Bonté · Amour · Joie ; à droite, sur Église
  seulement, Équipes · Musiciens (D10). Le point de couleur que les planches posent devant chaque nom, y compris sur les
  pilules inactives, n'existe pas dans `Pilules` (`src/components/layout/Onglets.tsx:145-205`, seule la pilule active se
  colore) : *choix de la spec*, une option facultative `pastille` y est ajoutée (tranche OG-C). Sur téléphone, le sélecteur
  défile seul comme toute `Pilules`, Équipes · Musiciens dessous. Le choix s'écrit dans `?groupe=` (sans entrée
  d'historique ; la page se lit sous `Suspense`, comme `personnes/page.tsx`).
- **Ouverture** : `?groupe=` s'il est donné ; sinon le groupe du président ou VP qui n'a pas le droit Équipes ; sinon Église.
- **Église** : l'écran d'aujourd'hui (bandeau, panneau d'édition), tel que le lot 1 le laisse ; modifiable avec
  `canEditerEquipes` seulement.
- **Un groupe, mise en page A** :
  - en grand (dès 1 024 px), deux cartes côte à côte : **En tête** (cadenas « nommés par un admin », « Nommer » pour les
    admins ; Président 主席, Vice-présidents 副主席, initiales et nom) et **Le comité** (OG18, liste sur deux colonnes :
    nom, rôle) ; en dessous, l'une sous l'autre ; sur téléphone, En tête en lignes avec un cadenas, le comité en une carte
    (noms à la suite, chevron) ;
  - « Rôles · 10 » et la légende (« relié au planning », « sans compte ») ; les cartes en colonnes : 1 sur téléphone,
    3 sur iPad couché, 4 à 1 440 px (planches) ; **2 sur tablette debout et 3 à 1 280 px : choix de la spec** (pas de
    planche) ;
  - sur téléphone, la planche n'a pas « Rôles · 10 » : sous « Le comité · 6 » (six personnes), la carte du comité est
    suivie des cartes des rôles « au comité », puis vient « Autres rôles · 7 » (les sept autres rôles) ;
  - une carte : nom et 中文, places (OG11), « au comité », titulaires (initiales ; rond pointillé et « sans compte » pour
    un sans compte), « Ajouter un titulaire » s'il reste une place et qu'on tient le groupe, puis les pastilles « Colonne
    Musiciens », « Remplit le planning », « Publie » (seule quand Publier est coché), « Notifie le groupe », « Saisit les
    chants des fêtes » (décision 35, les cinq groupes) ; crayon →
    formulaire ; un clic ailleurs sur la carte → fiche du rôle (D10) ;
  - groupe sans rôle : « Aucun rôle pour l'instant » et, pour qui tient le groupe, « Nouveau rôle ».
- **Fiche du rôle** : panneau de 420 px à droite dès 1 024 px, feuille en dessous (comme le panneau d'une équipe,
  agencement v18 B8). Contenu (planches B) : nom, 中文, places, pastille de colonne ; **Titulaires** (« Ajouter un
  titulaire », « ⋯ » par ligne, OG15-OG16) ; **Planning** si une colonne est reliée : « Dans la colonne Musiciens,
  « Choisir » propose d'abord Joël F. et Hugo L. », les trois prochains dimanches de cette colonne (lus par la lecture
  existante des plannings), « Ouvrir le planning » ; **Droits du rôle** (Remplir · Publier · Notifier · Saisir les chants
  des fêtes : Oui / Non ; Amour et Joie : Notifier · Saisir les chants des fêtes) et « Les titulaires reçoivent les
  notifications du Groupe Paix. » ; « Modifier » et « ⋯ › Supprimer le rôle ».
- **Formulaire du rôle** (« Nouveau rôle » / « Modifier le rôle ») : sous-titre « Groupe Paix · président, VP ou admin » ;
  Nom du rôle ; Nom en chinois · facultatif ; Nombre de places · vide = sans limite (− / + , « 2 titulaires ») ; Au comité
  (« Ses titulaires entrent au comité. ») ; Colonne du planning reliée (OG12) ; Droits (OG13 : quatre cases pour Paix,
  Fidélité et Bonté, dont « Saisir les chants des fêtes » avec l'aide « Ses titulaires saisissent les chants du passage
  du groupe à Noël et à Pâques. » ; deux pour Amour et Joie, Notifier et Saisir les chants des fêtes) ; Annuler ·
  Enregistrer (« Créer le rôle » pour un nouveau, inactif tant que le nom est vide). Feuille pleine hauteur sur
  téléphone. Les planches de l'organigramme précèdent la décision 35 et n'ont pas cette case : *choix de la spec*, elle
  suit la présentation des autres (même ligne, même interrupteur), en dernier.
- **Nommer** (admins) : feuille En tête : Président (une place) ; Vice-présidents, autant de places que le plafond
  (OG6, décision 36), avec en tête de la rangée « Vice-présidents · au plus {{n}} » et « − » / « + » ; chaque place ouvre
  la recherche d'OG14 ; « Retirer ». Ni le plafond ni « − » / « + » ne s'affichent à un président ou un VP (ils
  n'ouvrent pas « Nommer »).
- **Ajouter un titulaire** : OG14 ; même présentation que « Choisir » (menu contre le bouton dès 1 024 px, feuille en
  dessous), sous-titre « Musiciens · 2 sur 3 places ».
- **Relier à un compte** (admins, « ⋯ » d'un titulaire sans compte, OG16) : la recherche d'OG14, comptes seulement ;
  sous-titre « Relier « Ma… » à un compte · dans tous ses rôles du Groupe Paix ».
- **Après chaque enregistrement** : écriture REST de `groupes/{id}` avec la précondition d'OG37 (refusée : « Modifié par
  … entre-temps : recharge », rien d'écrit), puis `POST /api/equipes/groupes` ; une erreur de la route se dit sous
  l'en-tête (« Les droits n'ont pas été recopiés : réessaie »), l'organigramme reste écrit.

### Équipes › Personnes (admins)

- Sous-titre « 214 inscrits · 5 groupes · 12 sans groupe » ; ligne d'une personne : « Groupe Paix · Responsable louange,
  Musiciens ». Filtres : les filtres « Groupe Paix / Fidélité / Bonté » suivent `groupeDe` ; s'y ajoutent Groupe Amour,
  Groupe Joie et « Sans groupe » (*choix* : les filtres des cultes, EDD et « Ne sert pas » restent).
- Fiche : carte **Groupe** (pastille, « un seul groupe par personne », « Changer de groupe », la phrase d'OG5) ; carte
  **Rôles dans le Groupe Paix** (lien « Organigramme » ; chaque rôle, son 中文, « au comité », « Colonne Musiciens ») ;
  carte **Droits** : s'ajoutent « Par ses rôles » (« Remplit et publie le planning », lu dans les listes recopiées),
  « Notifications » (« Celles du Groupe Paix ») et la note « Coordination : cochée par un admin. Admin : liste des adresses,
  ne se coche pas. Le reste vient de ses rôles. » (la coordination est la case du lot 1 ; Admin vient de `ADMIN_EMAILS`,
  `src/lib/access.ts:17-21`) ; « Services et équipes · pendant la transition » reprend
  `serviceRoles` et les équipes. Les lignes existantes restent (*choix* : changements chirurgicaux).
- « Changer de groupe » : feuille avec les cinq groupes et « Sans groupe », confirmation dans le site, route `changerGroupe`.
- Téléphone : page entière (planche).

### App › Équipes (`/equipes`, `?groupe=<id>`, tout connecté)

- Sous-titre « Organigrammes de l'église et des groupes » ; même sélecteur ; Église = l'écran d'aujourd'hui (bandeau,
  Musiciens).
- Ouverture sur le groupe de la personne (« Toi » en tête), sinon Église. Sur son groupe, un bandeau : « Toi dans le
  Groupe Paix : Musiciens. Tu reçois les notifications du groupe ; tes dates sont dans « Mes services ». » (lien Mes
  services) ; sur téléphone « Toi : Musiciens. Tes dates sont dans « Mes services ». » ; sans rôle : « Toi dans le Groupe
  Paix. Tu reçois les notifications du groupe. »
- Mise en page A en lecture : ni crayon, ni « Nommer », ni « Ajouter un titulaire » ; une place libre s'affiche « Place
  libre » (rond pointillé) ; son propre nom en pastille sombre ; un clic sur une carte ouvre la fiche en lecture.

### Planning (Back-Office)

« Choisir » d'OG29 (menu contre la case dès 1 024 px, feuille en dessous, comme aujourd'hui) ; icône de lien d'OG31.

## Tranches de code

Préalable : les lots 1 et 3 sont versés sur `ui/apple-design`. Chaque tranche : tests écrits avant et vus rouges, code,
ses specs vertes, captures regardées, un commit (sur demande, message en français).

| Tranche | Ce qui change | Fichiers touchés | Ordre / conflits |
|---|---|---|---|
| **OG-A — Modèle et logique pure** | Types (`maxVp`, `droits.saisirFetes` lu faux s'il manque), table des groupes (`COMITES`, `MAX_VP_DEFAUT`), `groupeDe` et `estDuGroupe`, recopie pure (OG19, sans `saisirFetes`), comité, colonnes reliables, places de VP (OG6), « Relier à un compte » pur (OG16 : remplacement dans tous les rôles), `propositions` de « Choisir » (OG29-OG30). Aucun écran. | `src/types/groupe.ts` (nouveau), `src/lib/groupes/table.ts` (nouveau), `src/lib/groupes/organigramme.ts` (nouveau), `src/types/user.ts`, `src/lib/firebase/users.ts`, `src/lib/planning/choisir.ts`, `tests/helpers/fakeSession.ts` | En premier. `choisir.ts` : partir de l'état du lot 3. |
| **OG-B — Droits, recopie, route, notifications** | OG19-OG28 : règles (`maxVp` écrit par un admin seul, plafond des VP, OG8), miroirs, recopie partagée, route, publication, « Prévenir des changements » (`peutPrevenir` étendu, OG23), Notifier, destinataires, audiences ; écriture avec précondition (OG37) ; public Louange par le champ `groupe` (OG38, branche Louange de `estDeLEquipe` dans ses trois miroirs). | `firestore.rules`, `src/lib/access.ts`, `src/lib/equipes/organigramme.ts`, `src/lib/equipes/serveur.ts`, `src/lib/groupes/serveur.ts` (nouveau), `src/app/api/equipes/groupes/route.ts` (nouveau), `src/lib/firebase/groupes.ts` (nouveau : lecture avec l'`updateTime`, création `?documentId=`, écriture avec précondition, appel de la route), `src/lib/planning/releases.ts` (`canPublishPlanning`, `peutPrevenir`), `src/app/api/planning/release/route.ts`, `src/app/api/planning/changements/route.ts` (du lot 3 : relit `publieParRole` et `notifieParRole`), `src/app/api/push/notify-audience/route.ts`, `src/lib/push/recipients.ts`, `src/lib/push/audiences.ts`, `src/components/messages/Notifier.tsx`, `src/app/back-office/messages/layout.tsx`, `src/app/back-office/messages/page.tsx`, `src/app/moi/page.tsx`, `src/app/planning/groupes/page.tsx`, `src/app/planning/culte/page.tsx`, `src/lib/tableauDeBord/donnees.ts`, `src/lib/tableauDeBord/disposition.ts`, `CLAUDE.md` (liste des routes : +1 route (`/api/equipes/groupes`) : 16 attendues avant ce lot (après les lots 1 et 3), 17 après) | Après OG-A. `access.ts`, règles et `serveur.ts` sortent du lot 1 ; `releases.ts`, `groupes/page.tsx`, `culte/page.tsx` et la route `/api/planning/changements` (PG-E) sortent du lot 3 ; `access.ts`, `firestore.rules` et les locales sortent aussi du partage d'une setlist (PS-A à PS-D de `docs/spec-partage-setlist.md`, codé avant ce lot, décision 45) : partir de leur état. |
| **OG-C — Back-Office › Équipes › Organigramme** | Sélecteur (option `pastille` de `Pilules`), bascule à droite, mise en page A, fiche, formulaire (case « Saisir les chants des fêtes », décision 35), pastille « Saisit les chants des fêtes », Nommer (plafond des VP, décision 36), Ajouter un titulaire, « Relier à un compte » (décision 45), message « Modifié par … entre-temps » (OG37), libellés. | `src/app/back-office/equipes/page.tsx`, `src/app/equipes/EquipesClient.tsx`, `src/components/layout/Onglets.tsx` (`Pilules`), `src/components/groupes/*` (nouveaux : organigramme, carte, fiche, formulaire, recherche de titulaire, Nommer), `src/locales/{fr,zh-CN}.json` | Après OG-B. Même voie qu'OG-E (`EquipesClient.tsx`). |
| **OG-D — Personnes et Sans compte** | Filtres, fiche (Groupe, Rôles, Droits), « Changer de groupe », bloc des titulaires sans compte. | `src/components/admin/Personnes.tsx`, `src/components/admin/PersonnesVolets.tsx`, `src/components/admin/SansCompte.tsx`, locales (lit `groupes/*` par `src/lib/firebase/groupes.ts`, posé en OG-B) | Après OG-B, en parallèle d'OG-C (locales : chacune ses clés). |
| **OG-E — App › Équipes** | Sélecteur, « Toi », lecture. | `src/app/equipes/EquipesClient.tsx` (branche App), `src/components/groupes/*` (lecture) | Après OG-C. |
| **OG-F — « Choisir » relié aux rôles** | Sections, « Voir tout le groupe », indications, icône de colonne. | `src/components/planning/ChoisirNom.tsx`, `src/components/planning/PlanningGrille.tsx`, `src/lib/planning/useGrilleApp.ts` (lit `groupes/{id}`, `groupeDe` des comptes), locales | Après OG-B, en parallèle d'OG-C et OG-D ; ces fichiers sortent du lot 3. |
| **OG-G — Couleurs d'Amour et de Joie** | **À faire avant le code de cette tranche** (décision 38) : une seule planche avec les huit candidates d'Amour, de Joie, de Noël et de Pâques (OG36 ; CF26 de `spec-chants-fetes.md`), sans jade pour Joie avec vert sapin pour Noël ; Timothée choisit dessus. Puis deux entrées de `CATEGORY_COLORS`. La planche sert aussi la tranche CF-G du lot 4. | planche dans `docs/chantier-equipes-groupes/maquettes/`, `src/lib/serviceColors.ts` après le choix | Quand on veut ; `serviceColors.ts` gelé jusqu'au choix de Timothée. |

## Droits en double

Timothée publie `firestore.rules` lui-même dans la console Firebase.

| Droit | `src/lib/access.ts` (client) | `firestore.rules` (serveur) | Route serveur (Admin SDK) |
|---|---|---|---|
| Lire les organigrammes des groupes | `canVoirEquipes` (inchangé : connecté) | `match /groupes/{g}` : `read: if signedIn()` | — |
| Tenir l'organigramme d'un groupe (rôles, titulaires, droits des rôles) | `canTenirGroupe(user, profil, g)` (nouveau) : admin ou `referentDe` ∋ `comite-g` ; `tientUnGroupe` pour l'entrée Équipes | `tientGroupe(g)` (nouveau) ; `update` si `tientGroupe(g)` | `exigerTenirGroupe` dans `POST /api/equipes/groupes` |
| Nommer président et VP | `isAdminUser` | `create` : admin ; `update` d'un non-admin : `president` et `vp` inchangés ; toute écriture : `vp` dans le plafond | — |
| Régler le plafond des VP (`maxVp`, décision 36) | `isAdminUser` (feuille « Nommer ») ; `placesVp(groupe)` (nouveau, pur, `src/lib/groupes/organigramme.ts`) = `maxVp ?? MAX_VP_DEFAUT` | `update` d'un non-admin : `maxVp` inchangé ; toute écriture : `maxVp` absent ou entier de 1 à 9, et `vp.size()` au plus le plafond | — |
| Relier un titulaire sans compte à un compte (décision 45) | `isAdminUser` (entrée du « ⋯ ») | `update` admin de `groupes/{g}` (rien de plus) | recopie par `/api/equipes/groupes` (OG21) |
| Cocher « Saisir les chants des fêtes » sur un rôle (décision 35) | `canTenirGroupe` (comme les autres droits du rôle, OG13) | `update` si `tientGroupe(g)` (champ du document, rien de plus) | — ; **lue** par le lot 4 sur le serveur (CF16 de `spec-chants-fetes.md`, `/api/fetes/droits`, `/api/fetes/saisir`) ; aucune recopie sur le profil |
| Changer quelqu'un de groupe | `isAdminUser` | `users/{uid}` : `update` admin (inchangé) | `changerGroupe` : admins |
| Champs recopiés (`groupe`, `*ParRole`, comité dans `dansEquipes` / `referentDe`) | — | création du profil : ces champs vides ou absents ; ensuite admin seul | recopie partagée (OG20), `/api/equipes/groupes` |
| Remplir le planning du groupe | `canEditPlanning` (+ `remplitParRole`) | `peutEcrirePlanning(key)` (+ `remplitParRole`) | — (écriture REST directe) |
| Publier un trimestre | `canPublishPlanning` (`releases.ts`, 4e paramètre `publieParRole`, OG23) | `planningReleases` : `write: if false` (inchangé) | `/api/planning/release` (+ `publieParRole`) |
| Prévenir des changements (lot 3) | `peutPrevenir` (`releases.ts`, du lot 3, étendu : `publieParRole` et `notifieParRole`, OG23) | `planningReleases` : `write: if false` (inchangé) | `/api/planning/changements` du lot 3 (+ `publieParRole` **et** `notifieParRole`, relus) |
| Notifier le groupe | `audiencesNotifiables` (nouveau) | — (envois par le serveur) | `/api/push/notify-audience` (+ `notifieParRole`) |
| Réunions, tâches et évènements du comité | `canCreateEvenement`, `estDeLaReunion`, `canSeeEvenement` inchangés ; `creatableEvenementPours` (+ comités) : le président et les VP, référents du comité, créent ses réunions et ses évènements hors réunion (décision 43, EQ18 et EQ21 du lot 1) ; tâches : fonctions du lot 1 | `evenements` (motif `equipe:[a-z0-9-]+`, `referentDe`, `dansEquipes`) inchangé ; tâches : règles du lot 1 | `/api/push/notify-evenement` (`destinatairesEvenement`, inchangé) |
| Public Louange par le champ `groupe` (décision 42, OG38) | `estDeLEquipe` du lot 1 : branche Louange + `groupe` non vide | `estDeLEquipe(equipe)` du lot 1 : branche Louange + `profile().get('groupe', '') != ''` | la même fonction côté serveur (lot 1), rappels et notifications du public Louange |

Bloc à ajouter (texte à recopier en tranche OG-B, commentaires compris) :

```
// Organigrammes des groupes (lot 2, docs/spec-organigrammes-groupes.md). Lus par tout connecté (décision 16) ;
// tenus par les admins et par le président et les VP du groupe : leur `referentDe` porte « comite-<g> »,
// recopié par le serveur seul (patron D9 de docs/spec-organigramme.md, lot 16). Président, VP et plafond des VP
// (maxVp, 2 si absent) : admins seuls (décisions 11 et 36). Miroir client : canTenirGroupe, placesVp ;
// serveur : exigerTenirGroupe.
function tientGroupe(g) {
  return isAdmin() || (hasProfile() && ('comite-' + g) in profile().get('referentDe', []));
}

// Plafond des VP du document écrit : maxVp absent (= 2) ou entier de 1 à 9, et pas plus de VP que lui.
function vpDansLePlafond() {
  let max = request.resource.data.get('maxVp', 2);
  return max is int && max >= 1 && max <= 9
    && request.resource.data.get('vp', []).size() <= max;
}

match /groupes/{g} {
  allow read: if signedIn();
  allow create: if isAdmin() && g in ['paix', 'fidelite', 'bonte', 'amour', 'joie'] && vpDansLePlafond();
  allow update: if signedIn() && tientGroupe(g) && vpDansLePlafond()
    && (isAdmin()
        || (request.resource.data.get('president', null) == resource.data.get('president', null)
            && request.resource.data.get('vp', []) == resource.data.get('vp', [])
            && request.resource.data.get('maxVp', null) == resource.data.get('maxVp', null)));
  allow delete: if false;
}
```

La précondition d'OG37 (`currentDocument.updateTime`) est une option de l'écriture REST, pas une règle : rien à
ajouter ici pour elle.

`peutEcrirePlanning(key)` (`firestore.rules:468-470`) devient `isAdmin() || (hasProfile() && (key in
profile().get('plannings', []) || key in profile().get('remplitParRole', [])))` ; l'en-tête du fichier (l. 37-39)
et le commentaire de la fonction (l. 461-467) le disent. Création d'un profil (`firestore.rules:88-98`) : en plus,
`request.resource.data.get('groupe', null) == null` et `remplitParRole`, `publieParRole`, `notifieParRole` vides.
Un test compare les ids de la règle à la table des groupes (patron du test de `canRetirerDate`).

## Migration des données

**Aucune migration écrite, aucun script.**

- `maxVp` et `droits.saisirFetes` n'ont rien à rattraper : absents, ils valent 2 et faux (modèle).
- `groupe` n'est écrit pour personne : il se **déduit** de `serviceRoles` tant que le champ est absent (OG2, décision 45,
  Q6). Un compte
  qui sert dans deux groupes est « Sans groupe » jusqu'à ce qu'un admin tranche dans Personnes (filtre « Sans groupe »).
- Les documents `groupes/*` naissent au premier « Nommer » d'un admin (OG8). Les présidents et VP se nomment à la main ;
  les mentions « Prés. Paix », « VP Paix » de TEAM ORGA restent telles quelles (décision 7 : l'organigramme actuel est
  gardé tel quel).
- Les listes `*ParRole` et les ids de comité naissent à chaque enregistrement (OG21) ; « Recalculer depuis
  l'organigramme » les repose au besoin.
- Les droits `plannings` et `notify` cochés par un admin ne bougent pas ; les clés de groupe de `serviceRoles` non plus
  (D17).
- Attention : en local, tout s'écrit dans **la vraie base** (Firestore partagé avec le site en ligne). En ligne, rien ne
  le lit tant que `BACK_OFFICE` est absent (OG27).

## Tests Playwright à écrire d'abord

Rien n'est codé avant que ces tests aient été vus rouges. Trois appareils toujours (`ordinateur`, `telephone`,
`tablette`) ; cinq projets pour l'agencement (`tablette-paysage`, `ordinateur-1440` en plus). Un test propre à un
appareil le dit dans son titre. Base simulée (`signInAs`, `fakeFirestore`), route interceptée (`page.route`), fonctions
serveur passées à une base simulée (patron `fausseBase` de `tests/reunions.spec.ts:842-856`, qui ne simule aujourd'hui que
`equipes` et `users` : elle gagne `groupes`). Les fonctions qui lisent `BACK_OFFICE` reçoivent l'interrupteur en paramètre
(OG27) : les tests purs ne dépendent pas de l'environnement du serveur de test. Noms fictifs.

**`tests/organigrammes-groupes.spec.ts`** (nouveau, trois appareils)

- *Pur* : un document `equipes/comite-paix` écrit à la main n'ajoute ni membre ni référent au comité ; `groupeDe` (champ, `""`, déduit d'une seule clé, deux clés → sans groupe, Amour par le champ) ; recopie d'OG19
  (président, VP, Remplir, Publier, Notifier, au comité, Joie sans planning, titulaire d'un autre groupe ignoré) ; recopie
  en base simulée (un profil inchangé n'est pas réécrit ; sans groupe → `groupe` posé ; autre groupe → `ignores` ; les
  équipes de l'église gardées, comité après elles ; retirer un titulaire retire ses droits ; `changerGroupe` le retire des
  rôles de l'ancien groupe) ; `exigerTenirGroupe` (admin, président, VP : oui ; droit Équipes seul, membre : 403 ;
  `changerGroupe` : admins) ; miroirs (`canEditPlanning`, `canPublishPlanning` avec `publieParRole` : un rôle « Notifier » seul ne publie pas ;
  `peutPrevenir` (OG23) : un rôle « Notifier » seul de Paix (`notifieParRole: ["Groupe Paix"]`, ni `notify` ni
  `publieParRole`) prévient pour Paix et non pour Bonté ni le Culte, un rôle « Publier » prévient aussi, un rôle
  « Remplir » seul non ; `audiencesNotifiables`, `canTenirGroupe`,
  `entreesBackOffice` d'un président sans droit Équipes → Équipes et Planning **en plus** de ce que le lot 1 donne à un
  référent (Tâches, Réunions, Évènements, décision 43), `estResponsable`,
  `creatableEvenementPours` → `equipe:comite-paix` pour le président et non pour un simple membre du comité,
  `planningsDuBackOffice` ; `entreesBackOffice` et `planningsDuBackOffice` d'un rôle « Notifier » seul de Paix → Planning,
  avec Paix (OG26) ; droit Équipes seul → l'organigramme de l'église, aucun groupe modifiable (décision 44)) ; règles
  (ids de `groupes/{g}` = table, `remplitParRole` dans `peutEcrirePlanning`, champs refusés à la création ; plafond des
  VP, décision 36 : un président qui change `maxVp` est refusé, un admin le passe à 3 et nomme un troisième VP, un
  quatrième VP est refusé, `maxVp` à 0 ou 10 refusé, un admin ne descend pas `maxVp` sous le nombre de VP) ;
  `placesVp` (absent → 2, `maxVp: 3` → 3) ; plafond lu pour Paix et Joie ;
  « Saisir les chants des fêtes » (décision 35) : un rôle sans le champ se lit `saisirFetes: false` ; la case n'ajoute
  rien aux listes recopiées (`remplitParRole`, `publieParRole`, `notifieParRole`, `dansEquipes`, `referentDe` identiques
  avec ou sans) ; « Relier à un compte » pur (décision 45) : le nom sans compte est remplacé par le compte dans tous les
  rôles du groupe, présidence et VP compris, une seule ligne là où le compte était déjà titulaire, un autre nom sans
  compte intact ; précondition (décision 45, OG37, base simulée) : deux écritures lues sur la même version, la seconde
  n'écrit rien et n'appelle pas la route ; `uidsDuGroupe` (clé ∪ groupe ; interrupteur coupé → clé seule) ; publication et Notifier
  acceptés par un rôle, refusés sans ; « Choisir » pur (OG29 : ordre, « Libre » / « Déjà le … », groupe replié, hors
  groupe par la recherche seulement, « Remplir vers le bas » après « Voir tout le groupe » et avant « Écrire un nom sans
  compte… » sur une case Musiciens qui porte un titulaire, titulaire sans compte proposé, compte sans nom de planning absent ; OG30 : colonne
  non reliée inchangée) ; public Louange (OG38, décision 42) : un membre de Joie par le seul champ `groupe` en fait partie
  (`estDeLEquipe` et la règle), un compte sans clé ni groupe non.
- *Navigateur* :
  - admin : Église garde bandeau et Équipes · Musiciens ; Paix montre En tête, comité, rôles ; « Nommer » écrit
    `groupes/paix` et appelle la route avec les comptes ; « Nommer » : deux places de VP par défaut, « + » passe à
    « au plus 3 » et offre une troisième place, écrite `maxVp: 3` ; deux VP nommés, « − » ne descend pas sous 2 ;
  - président sans droit Équipes : entrée Équipes ; Paix modifiable (« Nouveau rôle », crayons), pas de « Nommer » ni
    de réglage du plafond ; Bonté et Église en lecture ; ni rail ni accès à Personnes ;
  - « Nouveau rôle » Paix (Thème absent, cadenas d'une colonne prise, Publier coche Remplir, quatre cases dont « Saisir
    les chants des fêtes » ; écriture `droits.saisirFetes: true` puis route ; la carte porte « Saisit les chants des
    fêtes ») ; Joie (phrase sans planning, Notifier et Saisir les chants des fêtes seulement ; la case s'écrit pour
    Joie aussi) ;
  - `groupes/paix` modifié dans la base simulée après la lecture (`fakeFirestore` refuse un PATCH d'une autre version,
    `tests/helpers/fakeSession.ts:175-176`) : « Enregistrer » affiche « Modifié par … entre-temps : recharge », rien
    n'est écrit, la route n'est pas appelée, le formulaire reste ouvert (OG37) ;
  - « Relier à un compte » : présent dans le « ⋯ » d'un titulaire sans compte pour un admin, absent pour un président ;
    choisir un compte écrit `groupes/paix` (le nom remplacé dans ses deux rôles) et appelle la route avec ce compte ;
  - « Ajouter un titulaire » : une recherche, « entrera dans le Groupe Paix », autre groupe grisé et inactif, « sans
    compte » en bas ; rôle plein sans « Ajouter » ;
  - simple membre : `/back-office/equipes` refusé ; App › Équipes : six pilules, son groupe ouvert, « Toi », son nom
    marqué, aucun crayon ;
  - Personnes (admin) : Groupe, Rôles, Droits par ses rôles ; « Changer de groupe » appelle la route ; filtres Amour,
    Joie, Sans groupe ;
  - planning Paix au Back-Office (président) : la grille s'écrit ; « Choisir » de Musiciens : titulaires en tête,
    « Voir tout le groupe » replié puis déplié, « Écrire un nom sans compte… » en bas ; sur une case Musiciens qui porte
    un titulaire, « Remplir vers le bas » entre « Voir tout le groupe » (replié, puis déplié) et « Écrire un nom sans
    compte… », avec l'aide du lot 3 inchangée ; menu contre la case (ordinateur), feuille (téléphone) ; icône de la
    colonne reliée ;
  - planning Paix au Back-Office, titulaire « Notifier » seul : entrée Planning, grille en lecture, bannière
    « Prévenir des changements » sur un trimestre publié qui a changé, pas de « Publier le T… » ;
  - Planning › Sans compte : le titulaire sans compte ; Notifier : un titulaire « Notifier » de Joie voit « Groupe Joie », la liste de ses destinataires compte les membres du groupe ; un titulaire « Publier » de Paix publie un trimestre depuis la page du planning (« Publier le T… »), un titulaire « Notifier » seul ne le peut pas ;
  - comité : « Nouvelle réunion » propose « Comité Paix » au président ; un membre du comité a Réunions ;
  - 中文 : libellés nouveaux traduits (Bonté : 恩慈 dans les libellés nouveaux, décision 45), dont la case et la
    pastille « Saisir les chants des fêtes » et le plafond des VP ; noms de personnes identiques.

**`tests/organigrammes-groupes-agencement.spec.ts`** (nouveau, cinq projets ; ajouter
`/organigrammes-groupes-agencement\.spec\.ts/` à `SPECS_GRAND_ECRAN` dans `playwright.config.ts`, l. 16) : `verifierAgencement`
(`tests/helpers/agencement.ts`) sur le Back-Office d'un groupe, l'App, la fiche ouverte, la fiche de Personnes ; colonnes
de rôles (1, 2, 3, 3, 4 selon le projet) ; En tête et comité côte à côte dès 1 024 px ; sélecteur sur une rangée, aucun
défilement de page en largeur ; Équipes · Musiciens à droite sur Église en grand ; panneau de 420 px en grand, feuille
sinon ; formulaire du rôle à quatre cases de droits et feuille « Nommer » à trois places de VP (`maxVp: 3`) sans
débordement ; captures regardées aux cinq tailles, FR et 中文.

**À mettre à jour** (noms vérifiés dans `tests/`) : `back-office-coupe.spec.ts` (`/api/equipes/groupes` en 404 dans la
liste des routes, l. 74 ; ancien tableau de Paix sans « Publier » pour un profil `publieParRole` ; Notifier sans Amour ni
Joie) ; `equipes.spec.ts` (en-tête de l'Organigramme : sélecteur, bascule à droite) ; `agencement-v18-t5.spec.ts` (T5
Organigramme) ; `back-office-espace.spec.ts` et `reunions-back-office.spec.ts` (entrées d'un président, d'un membre du
comité) ; `back-office-admin.spec.ts` (page Équipes) ; `reunions.spec.ts` (`rattachementDe` et la recopie, l. 834-885) ;
`planning-2027.spec.ts` et `planning-groupes-grille.spec.ts` (« Choisir » inchangé sans organigramme) ;
`pages-en-grand-guide-equipes.spec.ts` (App › Équipes en grand).

## Libellés nouveaux (FR · 中文 proposé, à relire par Timothée)

Les libellés déjà en place se réutilisent (« Écrire un nom sans compte… », « Modifié par {{prenom}} entre-temps : recharge »,
`categories.*`, `planning.programme.modifieEntreTemps` et `modifieEntreTempsSansNom` pour OG37). Les écrans
d'administration (Personnes, Sans compte) reçoivent aussi leurs libellés nouveaux dans `fr.json` et `zh-CN.json` (OG35).
Bonté s'écrit 恩慈 dans les libellés nouveaux, comme dans `categories` (« 恩慈团契 ») (**décision 45**, Q10) ; le
良善 de `planning.groupes.bonte` ne change pas dans ce lot.

| FR | 中文 |
|---|---|
| Église | 教会 |
| Groupe Amour · Groupe Joie | 仁爱团契 · 喜乐团契 |
| En tête · nommés par un admin · Nommer · À nommer | 带领 · 由管理员任命 · 任命 · 待任命 |
| Président · Vice-président(s) | 主席 · 副主席 |
| Le comité · {{n}} personnes · une équipe | 委员会 · {{n}} 人 · 一个团队 |
| Le président, les VP et les rôles cochés « au comité ». Référents : le président et les VP. | 主席、副主席及勾选"委员会"的岗位。负责人：主席和副主席。 |
| Réunions et tâches du comité | 委员会的会议和任务 |
| COMITÉ PAIX (… FIDÉLITÉ, BONTÉ, AMOUR, JOIE) · Comité Paix | 和平团契委员会 · 和平委员会（其余类推） |
| Rôles · {{n}} · relié au planning · sans compte | 岗位 · {{n}} · 已关联排班表 · 无账号 |
| {{n}} sur {{total}} places · {{n}} titulaires · sans limite · Personne · Place libre | {{n}}/{{total}} 个名额 · {{n}} 人 · 不限名额 · 无人 · 空缺 |
| au comité · Colonne {{colonne}} · Remplit le planning · Publie · Notifie le groupe | 委员会成员 · {{colonne}}栏 · 填写排班表 · 发布 · 通知团契 |
| Nouveau rôle · Modifier le rôle · Créer le rôle · Supprimer le rôle | 新岗位 · 修改岗位 · 创建岗位 · 删除岗位 |
| Nom du rôle · Nom en chinois · facultatif · Nombre de places · vide = sans limite · Sans limite | 岗位名称 · 中文名称 · 选填 · 名额 · 留空 = 不限 · 不限 |
| Au comité · Ses titulaires entrent au comité. | 委员会 · 担任者进入委员会。 |
| Colonne du planning reliée · « Choisir » y proposera d'abord les titulaires · Aucune | 关联的排班栏 · "选择"会优先列出担任者 · 无 |
| Remplir le planning du groupe · Publier le planning · Notifier le groupe | 填写团契排班表 · 发布排班表 · 通知团契 |
| Saisir les chants des fêtes · Saisit les chants des fêtes | 填写节日诗歌 · 填写节日诗歌 |
| Ses titulaires saisissent les chants du passage du groupe à Noël et à Pâques. | 担任者填写本团契在圣诞节和复活节节目中的诗歌。 |
| Vice-présidents · au plus {{n}} | 副主席 · 最多 {{n}} 位 |
| Relier à un compte · Relier « {{nom}} » à un compte · dans tous ses rôles du {{groupe}} | 关联账号 · 将"{{nom}}"关联到账号 · 涵盖其在{{groupe}}的所有岗位 |
| Le {{groupe}} n'a pas de planning : pas de colonne à relier, ni de droit sur le planning. | {{groupe}}没有排班表：无可关联的栏目，也无排班权限。 |
| Ajouter un titulaire · Comptes · Sans groupe · entrera dans le {{groupe}} · Déjà titulaire | 添加担任者 · 账号 · 无团契 · 将加入{{groupe}} · 已担任 |
| Dans le {{groupe}} : un admin peut le changer de groupe | 属于{{groupe}}：管理员可为其更换团契 |
| Ajouter « {{nom}} » sans compte · Écris le nom complet : il n'aura pas de notification | 添加无账号的"{{nom}}" · 请写全名：此人不会收到通知 |
| Titulaires · Droits du rôle · Ouvrir le planning · Les titulaires reçoivent les notifications du {{groupe}}. | 担任者 · 岗位权限 · 打开排班表 · 担任者会收到{{groupe}}的通知。 |
| Toi dans le {{groupe}} : {{roles}}. Tu reçois les notifications du groupe ; tes dates sont dans « Mes services ». | 你在{{groupe}}：{{roles}}。你会收到团契的通知；你的日期在"我的服事"中。 |
| Organigrammes de l'église et des groupes | 教会及各团契的组织架构 |
| Groupe · un seul groupe par personne · Changer de groupe · Rôles dans le {{groupe}} · Par ses rôles | 团契 · 每人只属于一个团契 · 更换团契 · 在{{groupe}}的岗位 · 来自岗位 |
| Titulaires du rôle {{role}} · Voir tout le groupe · Libre · Déjà le {{dates}} · Aucun rôle | {{role}}的担任者 · 查看全部团契成员 · 有空 · 已排 {{dates}} · 无岗位 |
| Titulaires sans compte | 无账号的担任者 |
| Aucun rôle pour l'instant · Autres rôles | 暂无岗位 · 其他岗位 |
| Cadenas : colonne déjà reliée à un autre rôle. Thème n'est pas une personne : pas de lien. | 带锁的栏目已关联其他岗位。主题不是人员：不能关联。 |
| Reliée au rôle {{role}} · Dans la colonne {{colonne}}, « Choisir » propose d'abord {{noms}}. | 已关联岗位{{role}} · 在{{colonne}}栏，"选择"会优先列出{{noms}}。 |
| Les droits n'ont pas été recopiés : réessaie | 权限未能同步，请重试 |
| Retirer | 移除 |
| Groupe {{nom}} · {{n}} personnes · organigramme tenu par son président, ses VP et les admins | {{groupe}} · {{n}} 人 · 组织架构由其主席、副主席和管理员维护 |
| {{n}} inscrits · 5 groupes · {{s}} sans groupe · Sans groupe | {{n}} 位注册成员 · 5 个团契 · {{s}} 人无团契 · 无团契 |
| Changer de groupe retire ses rôles du {{groupe}} (admin seulement). | 更换团契会移除其在{{groupe}}的岗位（仅限管理员）。 |
| Remplit et publie le planning · Celles du {{groupe}} · Notifications | 填写并发布排班表 · {{groupe}}的通知 · 通知 |
| Coordination : cochée par un admin. Admin : liste des adresses, ne se coche pas. Le reste vient de ses rôles. · Services et équipes · pendant la transition | 协调：由管理员勾选。管理员：由邮箱名单决定，不能勾选。其余来自岗位。 · 服事和团队 · 过渡期 |
| Toi : {{roles}}. Tes dates sont dans « Mes services ». · Toi dans le {{groupe}}. Tu reçois les notifications du groupe. | 你：{{roles}}。你的日期在"我的服事"中。 · 你在{{groupe}}。你会收到团契的通知。 |

## Hors périmètre

- Un historique des organigrammes par année (D19) ; une page publique de personne ; un arbre dessiné.
- Créer une équipe de l'église (« + Nouvelle équipe » de la planche Église, D8) ; les pôles (lot 1).
- La fin de la transition (**décision 45**, Q8 : une spec à part, une fois les cinq organigrammes remplis) :
  retirer les clés de groupe de `serviceRoles` de « Choisir », des destinataires, de l'inscription, des droits sur les
  setlists et des musiciens des fêtes (CF16 de `docs/spec-chants-fetes.md`) ; d'ici là elles restent valables (D17).
  **Contrainte pour cette spec (décision 42)** : un membre de groupe sans rôle fait partie du public Louange ; quand les
  clés de `serviceRoles` cesseront de compter, le public Louange élargi (EQ4 de `docs/spec-equipes-sans-poles.md`)
  devra compter les membres des groupes (champ `groupe`, `groupeDe`).
- Les chants de Noël et de Pâques eux-mêmes (lot 4) : ce lot ne pose que la case « Saisir les chants des fêtes » d'un
  rôle (décision 35, OG13), que le lot 4 lit.
- Donner aux rôles des droits sur les setlists ordinaires (`isEditorOf`, champ `editeurs` du partage) ; « Prévenir des
  changements » lui-même (lot 3 : seul son droit d'accès suit OG23).
- Aligner le 中文 de Bonté hors des libellés nouveaux (`planning.groupes.bonte` : 良善) : seulement si Timothée le
  demande (décision 45, Q10).
- Voir les évènements de section « Groupe … » par le seul champ `groupe` (visibilité inchangée, OG28).
- Amour et Joie à l'inscription (**décision 45**, Q7 : un admin les place dans Personnes, ou un président les
  fait entrer comme titulaires) ; l'aperçu « Mes équipes » de Moi (le comité n'y figure pas).
- La marque « sans compte » dans les cases de la grille (planche Choisir) ; l'indication « déjà titulaire sans compte
  (Orateurs) » de la piste B.
- Restreindre le droit Équipes à une équipe ; toute écriture dans le Google Sheet.

## À la mise en ligne

**À faire avant le code** : Timothée relit le 中文 du tableau des libellés (case « Saisir les chants des fêtes » et
plafond des VP compris) avant la tranche OG-C ; la planche des huit couleurs (OG36, décision 38) est faite et Timothée y
choisit avant le code de la tranche OG-G (et de CF-G du lot 4).

- **Préalable** : la bascule du lot 1 est faite (relevé, publication des règles, migration `--ecrire`, coordination
  cochée) ; sinon, la publication des règles de ce lot se fait dans la même séance, à l'étape de publication du lot 1
  (`firestore.rules` est un seul fichier : la publication emporte aussi les règles du partage d'une setlist s'il est déjà
  versé).
- **Timothée publie `firestore.rules`** dans la console Firebase : bloc `groupes/{g}`, `tientGroupe` et
  `vpDansLePlafond` (`maxVp` écrit par un admin seul, décision 36), `peutEcrirePlanning` élargi, champs refusés à la
  création d'un profil. Sans cela, rien ne s'enregistre et un président ne remplit pas sa grille. La case « Saisir les
  chants des fêtes » ne demande aucune règle de plus ici (elle est lue par le serveur du lot 4).
- Aucune variable Vercel ; `BACK_OFFICE` reste absent en ligne : rien ne change pour le site en ligne
  (`back-office-coupe` vert).
- Aucun script à lancer (décision 45, Q6 : `groupe` se déduit).
- Ensuite, en local : un admin nomme présidents et VP des cinq groupes et règle au besoin le plafond des VP ; les
  présidents (ou un admin) créent les rôles et cochent « Saisir les chants des fêtes » sur ceux qui le doivent, avant
  la première fête saisie au lot 4 (écrit dans la vraie base, OG27).

## Questions ouvertes

Aucune : toutes tranchées le 08/10/2026 (décisions 35 à 45 de `decisions.md`, voir « Réponses de Timothée
(08/10/2026, soir) »). La question née de la décision 42 (membres d'Amour et de Joie dans le public Louange) suit la
lecture la plus simple de cette décision : OG38.

## Commandes

```bash
npx playwright install --with-deps chromium   # début de session cloud
npx tsc --noEmit
npm run lint
npm test -- tests/organigrammes-groupes.spec.ts
npm test -- tests/organigrammes-groupes-agencement.spec.ts
npm test -- tests/equipes.spec.ts tests/agencement-v18-t5.spec.ts tests/reunions.spec.ts tests/reunions-back-office.spec.ts tests/back-office-espace.spec.ts tests/back-office-admin.spec.ts
npm test -- tests/planning-groupes-grille.spec.ts tests/planning-2027.spec.ts tests/pages-en-grand-guide-equipes.spec.ts
npm test -- tests/back-office-coupe.spec.ts
```

## Avancement

- 08/10/2026 : spec écrite, attend le go.
- 08/10/2026 : relecture adversariale à contexte vierge (références de code et planches revérifiées, cohérence avec les lots 1, 3 et 4). Corrigés : `canPublishPlanning` étendu comme l'attend le lot 3 ; comité fermé aux documents `equipes/comite-*` ; interrupteur passé en paramètre ; lectures directes de `plannings` ; libellés manquants ; question 11 (plafond des VP).
- 08/10/2026 : relecture croisée des cinq specs, incohérences corrigées.
- 08/10/2026 (soir) : réponses de Timothée intégrées (décisions 35 à 45).
