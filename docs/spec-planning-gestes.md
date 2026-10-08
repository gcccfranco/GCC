# Spec : lot 3 du chantier « équipes et groupes » — gestes du planning et petit déj

Lot 3 du chantier « équipes et groupes » (`docs/chantier-equipes-groupes/`). **Origine** : premier retour des
responsables après le document des nouveautés : « dupliquer dans le planning comme dans Google Sheets » et « le
"ajouter une ligne" du petit déj, c'est quoi ? ». Décisions prises par Timothée le 08/10/2026 (décisions 21 à 26).

- **Date** : 08/10/2026.
- **Statut** : spec écrite, attend le go de Timothée. Rien n'est codé.
- **Base de code** : `ui/apple-design`, commit `5878ce1`. Le code n'a pas bougé depuis `439e552`, base de la
  cartographie. Toutes les références `fichier:ligne` ci-dessous ont été ouvertes sur cette base.
- **Sources** : `docs/chantier-equipes-groupes/decisions.md`, qui fait foi, `cartographie.md` (section « Dupliquer /
  copier-coller dans le planning ») et les maquettes `v19-pl-*` (`maquettes.md`).
- **Voisins** : `spec-planning-grille.md` (lot 17 : la grille, l'écriture d'une case, l'historique),
  `spec-planning-2027.md` (U2 : « Choisir », dimanches spéciaux, dates choisies), `spec-petit-dej.md` (U3 : la carte
  Petit déj), `spec-retouches-v18.md` (lot F : Fidélité), `spec-planning-petits-lots.md`, `spec-planning.md`.
- **Ordre du chantier** : ce lot est indépendant du lot 1. Les lots 1 et 3 se codent en parallèle, puis le lot 2,
  puis le lot 4. Tout se fait sur `ui/apple-design`.

Règles communes : tests Playwright écrits avant le code et vus rouges, sur les trois appareils, et sur les cinq
projets pour l'agencement. FR et 中文 pour tout libellé nouveau, le 中文 relu par Timothée. Tout ce lot reste
derrière `BACK_OFFICE` (`src/lib/backOffice.ts:5`) : les gestes de la grille sont au Back-Office, la carte
Petit déj est dans l'App, et les deux sont coupées en ligne. Aucune session ne lit la vraie base : tout se
simule (`tests/helpers/fakeSession.ts`).

## 1. Décisions du lot (reprises de `decisions.md`)

| # | Décision de Timothée (08/10/2026) |
|---|---|
| 21 | **Copier le dimanche précédent** : piste **A**. Un bouton apparaît au survol de la ligne, avec un aperçu en pointillé ; un menu ⋯ le remplace sur iPad et téléphone. Le geste copie **toutes les colonnes sauf Thème et Orateur**, et seulement dans les cases vides. Si des cases remplies seraient touchées, une fenêtre propose « Remplir les N cases vides » ou « Remplacer aussi ces N noms ». |
| 22 | **Remplir vers le bas** : mettre ce nom jusqu'à la fin du trimestre. Le geste part du menu de la case seulement, et ne remplit que les cases vides. |
| 23 | **Copier-coller au clavier** sur ordinateur : une case ou une plage (Maj+clic), collage depuis Google Sheets ou Excel. Piste **B** : l'aperçu est posé dans la grille, en pointillé, et en orange quand il remplace un nom. Une barre propose Coller · Cases vides seulement · Annuler. Un collage qui ne tombe que dans des cases vides s'écrit sans rien demander. |
| 24 | **« Annuler »** dans une bannière pour Coller, Copier et Remplir, jusqu'au geste suivant. |
| 25 | **Prévenir des changements** : dans un trimestre **déjà publié**, une **bannière** s'affiche au-dessus de la grille (piste **B**). Elle dit par exemple « 3 cases ont changé depuis la publication, le 15/11 et le 22/11 » et porte « Ne pas prévenir » et un bouton. Chaque case changée porte un point orange. Peuvent l'utiliser ceux qui publient ou notifient ce planning. Le geste prévient les personnes **ajoutées et retirées** des cases changées, cochées d'office, chacune avec sa ligne en FR ou en 中文. Une personne sans compte est marquée « à prévenir toi-même ». Après l'envoi ou « Ne pas prévenir », les points disparaissent ; le bouton revient au prochain changement. |
| 26 | **Petit déj** : « Ajouter une ligne » devient **« Inscrire quelqu'un »**, piste **B**. Un seul bouton en tête de la carte ouvre un petit formulaire : le dimanche, puis le nom. |

**Maquettes retenues** (dans `docs/chantier-equipes-groupes/maquettes/`). Quand une maquette et une décision ne
disent pas la même chose, la décision l'emporte.

| Geste | Retenues | Écartées (piste non retenue) |
|---|---|---|
| Copier (21) | `v19-pl-copier-a-ordinateur.png`, `v19-pl-copier-confirmer-ordinateur.png`, `v19-pl-ipad-paysage.png`, `v19-pl-copier-telephone.png` | `v19-pl-copier-b-ordinateur.png` (colonne de boutons toujours visibles) |
| Remplir (22) | `v19-pl-remplir-bas-ordinateur.png`, `v19-pl-remplir-telephone.png` | — |
| Clavier, coller (23, 24) | `v19-pl-clavier-selection-ordinateur.png`, `v19-pl-coller-b-ordinateur.png`, `v19-pl-apres-collage-ordinateur.png` | `v19-pl-coller-a-ordinateur.png` (fenêtre avant d'écraser) |
| Prévenir (25) | `v19-pl-prevenir-b-ordinateur.png`, `v19-pl-prevenir-feuille-ordinateur.png`, `v19-pl-prevenir-telephone.png`, `v19-pl-prevenir-feuille-telephone.png` | `v19-pl-prevenir-a-ordinateur.png` (bouton dans l'en-tête) |
| Petit déj (26) | `v19-pl-pdj-b-ordinateur.png`, `v19-pl-pdj-b-telephone.png` | `v19-pl-pdj-a-ordinateur.png`, `v19-pl-pdj-a-telephone.png` (un bouton par dimanche) |

## 2. Ce que le code fait aujourd'hui

**Où l'on remplit.** Une grille ne s'édite qu'au Back-Office : `peutModifier = gestion && canEditPlanning(...)`
(`src/app/planning/culte/page.tsx:55`, `src/app/planning/groupes/page.tsx:90`, `src/app/planning/table/page.tsx:55`).
Le contexte `GestionPlanning` vaut `true` sous `/back-office/planning/…` (`src/lib/planning/gestion.ts:8-10`). Les
pages de l'App sont reprises telles quelles par `src/app/back-office/planning/[cle]/PlanningDuBackOffice.tsx:15-28`.
L'interrupteur coupé, chaque page devient l'ancien tableau lu dans le Sheet
(`src/app/planning/culte/page.tsx:133`, `src/app/planning/groupes/page.tsx:172`, `src/app/planning/table/page.tsx:169`).

**La grille** (`src/components/planning/PlanningGrille.tsx`) :

- Deux états d'interaction seulement : `edition` (un champ texte ouvert) et `choix` (« Choisir » ouvert sur une
  case) (`:96-102`). Il n'y a ni sélection, ni focus clavier entre cases, ni `keydown`, `copy` ou `paste`.
- La valeur affichée d'une case vaut, dans l'ordre : la présidence imposée d'un dimanche Interfranco ou Intergroupe,
  puis la modification locale, puis la ligne reçue (`:113-118`). `ligneASemer` remet la valeur propre du groupe à la
  place de la présidence imposée (`:127-133`).
- La grille ne reçoit que les lignes du trimestre (`lignes`). « Mes dates » les filtre encore (`:138-142`). Le
  dimanche qui précède le premier dimanche du trimestre n'est donc pas dans la grille : il est dans `rows`, côté
  page (`culte/page.tsx:46`, `groupes/page.tsx:88`, `table/page.tsx:50`, `edd/page.tsx:51`, variable `toutes`,
  `campus/page.tsx:103-104` via `grilles.matin` et `grilles.soir`, `PageDatesChoisies.tsx:33`).
- Les colonnes affichées (`:144-151`) : une colonne facultative (Sainte cène, percussion, batterie de Fidélité) est
  masquée en lecture, montrée en modification. La colonne `petitDej` de la Table est affichée en lecture seule
  (`src/lib/planning/grilles.ts:203-210`, `ColonneGrille.lectureSeule`, `:21-34`).
- `enregistrer` (`:167-206`) affiche la valeur, puis appelle `ecrireCase`. Pour un dimanche de 2026 absent de
  l'app, il recopie la ligne affichée (`semer`, `:186-188`). Il appelle ensuite `noterChangement` (`:192-195`). Si
  le serveur refuse, la case revient à sa valeur et le message « droit retiré » ou « hors ligne » s'affiche.
- `laCase` (`:270-334`) : une présidence imposée affiche un cadenas et ne se modifie pas (`:275-287`). Une case de
  personne qui porte au plus un nom ouvre « Choisir » (`:290-317`). Les autres cases ouvrent un champ texte.
- Les vues : le tableau à partir de `sm` (`hidden sm:block`, `:391`) et une carte par dimanche sur téléphone
  (`sm:hidden`, `:473`). La date d'une ligne porte le bouton de retrait d'une date choisie (`:457`, `:507`).

**« Choisir »** (`src/components/planning/ChoisirNom.tsx`) : c'est un menu contre la case à partir de 1 024 px
(`:29`, `:58-82`) et une feuille en dessous (`:84-93`), donc aussi sur l'iPad debout. Il propose une recherche, les
noms, « Écrire un nom sans compte… » et « Vider la case » (`:200-215`). Les colonnes de texte libre sont Thème,
chants 1 à 4 et Répétition (`src/lib/planning/choisir.ts:50-58`) ; Orateur est une colonne de personne.

**Écrire.** `ecrireCase` envoie un PATCH REST avec `updateMask` sur `plannings/{key}/dimanches/{date}`
(`src/lib/firebase/planningGrille.ts:31-52`). La branche `semer` y met déjà plusieurs champs (`:38-43`) : une ligne
entière s'écrit donc en **un seul appel par dimanche**. `poserDate` crée une date choisie (`:60-70`). La règle
n'exige que `request.resource.data.date == date` (`firestore.rules:476-479`).

**L'historique.** `noterChangement` lit la dernière entrée, la fusionne si la même personne a écrit il y a moins de
15 minutes, puis la réécrit (`src/lib/firebase/planningHistorique.ts:19`, `:70-85`). Une case coûte donc trois
requêtes. N cases notées en parallèle lisent toutes la même dernière entrée et perdent des changements. La fusion
pure, `fusionnerChangements`, existe (`src/lib/planning/historique.ts:40-55`).

**Valeurs affichées mais pas écrites.**
- Présidence imposée : Interfranco et Intergroupe passent par `dimanchesSpeciaux` (`grilles.ts:340-345`), qui est
  donné à la grille des groupes (`groupes/page.tsx:163`). La valeur n'est jamais écrite dans le document du groupe.
- Fidélité : présidence, guitare et batterie peuvent venir de l'ancien planning des musiciens
  (`completerMusiciensFidelite`, `grilles.ts:297-314`). Une case présente dans le document de l'app, même vidée
  (`fetchCasesEcrites`, `src/lib/planning/grille.ts:96-99`), n'est jamais reprise.

**Publication.** Quatre plannings se publient par trimestre : Culte et les trois groupes
(`PUBLISHABLE_PLANNINGS`, `src/lib/planning/releases.ts:29-34`). Le droit de publier est
`canPublishPlanning` : admin, ou `notify` qui contient « tout le monde » ou la catégorie du planning (`:49-55`). La
route `/api/planning/release` revérifie ce droit (`src/app/api/planning/release/route.ts:54-64`). Elle écrit
`planningReleases/{key}_{année}.published` (`:67-78`) et ne notifie qu'à la première publication (`:84-107`). Le
document est lisible par tous et écrit par le serveur seul (`firestore.rules:456-459`). Le trimestre en cours et
les trimestres passés restent toujours visibles (`releases.ts:87-100`). « Publier le T… » et « Masquer le T… » ne
s'offrent que pour un trimestre à venir (`culte/page.tsx:94-103`, `groupes/page.tsx:134-143`). Une case modifiée dans
un trimestre publié se voit aussitôt, sans aucune notification.

**Envoyer une notification à des personnes.**
- `loadPlanningNameIndex` et `resolveNamesToUids` relient un nom de planning à des comptes
  (`src/lib/push/recipients.ts:24-53`).
- La langue d'un compte est connue **côté serveur** par `notifPrefs/{uid}.lang`, via `loadNotifLangs` (`:97-104`).
  Ce document est lisible par tout connecté (`firestore.rules:426-429`).
- `sendPushToUids` envoie un push (`src/lib/push/send.ts:103-112`) et `recordNotification` écrit l'entrée de la
  cloche (`src/lib/push/notifications.ts:29-42`).
- `notifLog` est réservé au serveur (`firestore.rules:410-412`).
- Les textes de push sont des fonctions pures FR et 中文 (`src/lib/push/messages.ts:28-35`). Un module serveur
  importe déjà `fr.json` (`src/lib/planning/modeles.ts:12`).

**Petit déj.** La carte n'est montée que dans l'App (`table/page.tsx:91`, `!gestion`). Le Back-Office ne montre que
la grille (`:93-102`). La carte n'existe que si l'interrupteur est ouvert (`:169`). « Ajouter une ligne » s'affiche
sur **chaque dimanche à venir** pour `canGererPetitDej`, c'est-à-dire les écrivains du planning Table et les admins
(`src/components/planning/PetitDejCarte.tsx:67`, `:250-264` ; `src/lib/access.ts:329-334`). Il écrit par
`ajouterLigne`, avec un `uid` vide (`src/lib/firebase/petitDej.ts:50-52`). La règle `petitDej/{id}` l'accepte pour
`peutEcrirePlanning('table')` (`firestore.rules:504-520`).

## 3. Règles

Les décisions s'appliquent telles quelles. Les règles ci-dessous en sont la lecture la plus simple. Celles qui
vont au-delà d'une décision sont marquées **(choix)**.

### Commun à tous les gestes (PG1 à PG9)

| # | Règle |
|---|---|
| PG1 | Les gestes de la grille (Copier, Remplir, Coller, Vider, Annuler) n'existent que dans une grille **en modification** : au Back-Office, pour `canEditPlanning`. Dans l'App, en lecture, ou sans le droit, aucun bouton, aucun ⋯ de dimanche, aucune sélection. « Prévenir des changements » (PG33 à PG47) n'existe aussi qu'au Back-Office, mais pour `peutPrevenir` (PG35), pas pour `canEditPlanning`. « Inscrire quelqu'un » est dans l'App (PG48). L'interrupteur coupé, rien de ce lot n'existe : les pages sont l'ancien tableau. |
| PG2 | **Cases jamais écrites par un geste** : une présidence imposée (Interfranco, Intergroupe) et une colonne `lectureSeule` (petit déj). Un geste les saute et le dit (« 1 case verrouillée laissée telle quelle »). **(choix)** Une présidence imposée **à la source** n'est jamais recopiée : la colonne est traitée comme vide à la source, et non comme la présidence propre du groupe ce jour-là. Le mot « Interfranco » n'entre ainsi jamais dans le document d'un groupe. |
| PG3 | **Une case est vide** quand sa **valeur affichée** est vide, après les modifications locales. Une case de Fidélité qui affiche un nom repris des musiciens n'est donc pas vide. **(choix)** On copie ce qu'on voit : une valeur reprise de Fidélité, visible à la source, est recopiée telle qu'affichée. Écrite dans la cible, elle devient une case du planning Fidélité, comme le fait déjà `semer`. |
| PG4 | **Une écriture par dimanche.** Un geste écrit chaque dimanche touché en **un seul PATCH**, avec tous ses champs. C'est la fonction `ecrireCases` (nouvelle, dans `planningGrille.ts`, sur le patron de `ecrireCase`). Elle garde `semer` pour un dimanche de 2026 absent de l'app : la ligne à semer (`ligneASemer`) plus les valeurs du geste. `ecrireCase` devient un appel à `ecrireCases` avec une seule colonne. Les dimanches s'écrivent l'un après l'autre, dans l'ordre des dates. Au premier refus (droit retiré, hors ligne), le geste s'arrête : les dimanches pas encore écrits reprennent leur valeur et le message habituel s'affiche (`planning.grille.droitRetire` ou `horsLigne`). Les dimanches déjà écrits restent couverts par « Annuler ». |
| PG5 | **Un seul passage d'historique par geste.** `noterChangements(key, auteur, changements[])` (nouveau, `planningHistorique.ts`) lit la dernière entrée **une fois**, y replie tous les changements avec `fusionnerChangements`, puis écrit **une fois**. `noterChangement` devient un appel à `noterChangements` avec un seul changement. Chaque case garde sa ligne nommée dans l'historique, comme une saisie à la main. |
| PG6 | **« Annuler »** (décision 24) : après Copier, Remplir ou Coller, une bannière s'affiche au-dessus de la grille, par exemple « Dimanche 24/1 : 8 cases copiées du 17/1. » ou « 12 cases collées, dont 3 noms remplacés. », avec « Annuler » et ✕. Annuler réécrit, dimanche par dimanche, les valeurs d'avant le geste, telles que la grille les avait (PG4), et les note en historique (PG5). L'historique replie alors les cases revenues à leur valeur de départ (`fusionnerChangements`). Comme toute écriture de case, Annuler ne regarde pas si quelqu'un d'autre a écrit la même case entre-temps : le dernier qui écrit gagne. |
| PG7 | **« Jusqu'au geste suivant »** : la bannière disparaît à toute nouvelle écriture dans la grille (une case par « Choisir » ou au clavier, un autre geste, Annuler lui-même), au ✕, quand on change de planning, d'année ou de trimestre affiché **(choix : les cases ne sont plus sous les yeux)**, ou quand on quitte la page. Un seul niveau : pas de pile d'annulations. |
| PG8 | Les cases écrites par le dernier geste gardent un fond teinté tant que la bannière est là (`v19-pl-apres-collage-ordinateur.png`). |
| PG9 | Aucune fenêtre du navigateur. La fenêtre de PG13 est une fenêtre du site, avec trois boutons. `useConfirmer` n'en a que deux (`src/components/layout/Confirmer.tsx:28-39`) : il faut une fenêtre propre au geste, sur le même `AlertDialog`. |

### Copier le dimanche précédent (décision 21 ; PG10 à PG17)

| # | Règle |
|---|---|
| PG10 | **La ligne précédente** se cherche dans **toutes les lignes du planning** (`rows`, toutes années), jamais dans le trimestre affiché ni dans « Mes dates ». La page passe ces lignes à la grille par une prop nouvelle, `lignesDuPlanning`. Pour un planning **hebdomadaire**, c'est le dimanche **J−7** exactement ; absent de `rows`, il est vide. **(choix)** Pour un planning **à dates choisies** (Interfranco, Intergroupe, Campus matin et soir), où « le dimanche d'avant » n'a pas de sens, c'est la **date posée qui précède**, même plusieurs semaines avant. Le libellé dit toujours la date : « Copier le 17/1 ». Le premier dimanche de T1 2027 copie donc le 27/12/2026. |
| PG11 | **Colonnes copiées** : toutes les colonnes affichées en modification, **sauf Thème et Orateur** et les cases de PG2. Les colonnes facultatives sont comprises : une colonne vide à la source ne copie rien. **(choix)** Pour le Campus, qui n'a ni Thème ni Orateur, les chants 1 à 4 et la Répétition (une date et une salle) sont des textes propres à chaque séance : voir la question 2. En attendant la réponse, la spec ne copie que les colonnes de personnes (`colonneDePersonnes`) sans Orateur. Cela revient exactement à la décision dans les dix autres grilles. |
| PG12 | **Sans fenêtre** quand toutes les cases à écrire sont vides dans la cible : le clic écrit (PG4), puis la bannière Annuler s'affiche (PG6). |
| PG13 | **Avec fenêtre** quand des cases de la cible portent déjà un **autre** nom que la source (`v19-pl-copier-confirmer-ordinateur.png`). Titre : « Copier le 24/1 sur le 31/1 ? ». La fenêtre montre le tableau Colonne · Aujourd'hui le 31/1 · Le 24/1 des seules cases qui changeraient de nom. Ses boutons : « Annuler » (rien n'est écrit), « Remplacer aussi ces N noms » et « Remplir les N cases vides », ce dernier étant l'action principale. S'il n'y a aucune case vide à remplir, ce bouton manque et le texte de la fenêtre est `confirmerCopieSansVide`. Une case qui porte déjà le même nom ne compte nulle part. |
| PG14 | **Ordinateur** (survol possible, `(hover: hover)`) : au survol d'une ligne, une pastille « Copier le 17/1 » apparaît dans la cellule de la date. Au survol de la pastille, l'aperçu se pose en pointillé dans les cases qui seront écrites, avec le nom en gras. Une infobulle dit « Copier le dimanche précédent. Les N cases vides reprennent le 17/1. Ne sont pas recopiés : Orateur, Thème. Un nom déjà posé reste. » **(choix)** L'infobulle ne nomme que les colonnes exclues que la grille a : le Culte n'a pas de Thème, l'EDD, la Table et le Campus n'ont ni l'un ni l'autre, et la phrase des colonnes exclues disparaît alors. Quand la cible n'a aucune case vide mais porte d'autres noms, la phrase du nombre de cases vides est remplacée par « Les N cases déjà remplies ne changent que si tu le demandes. » (`copierAideRemplacer`). La pastille est aussi atteignable au clavier (Tab), avec l'aperçu au focus. |
| PG15 | **iPad (debout et couché) et téléphone** (pas de survol) : un ⋯ par dimanche. Il est dans la cellule de la date sur le tableau, et dans l'en-tête de la carte sur téléphone, à côté de « Retirer » s'il existe. Son menu porte « Copier le dimanche précédent », avec l'aide « Du 17/1, dans les 8 cases vides. Ne sont pas recopiés : Orateur, Thème. » (mêmes règles de phrase que PG14). L'aperçu est posé tant que le menu est ouvert. **(choix)** Le menu est le ⋯ commun, `MenuActions`, déjà utilisé par le petit déj (`src/components/layout/MenuActions.tsx:47-102`). Il reçoit un `onOuvert(ouvert)` pour l'aperçu et, sur une action, un `desactive` pour PG16 (`ActionDuMenu` n'a ni l'un ni l'autre aujourd'hui, `:29-45`). Le téléphone garde donc ce menu, et non la feuille dessinée sur `v19-pl-copier-telephone.png` ni le titre « Dimanche 24 janvier » de la planche iPad : voir la question 7. |
| PG16 | **(choix)** **Le geste n'est offert que s'il fait quelque chose** : la source a au moins une valeur à copier vers une case de la cible qui ne la porte pas déjà. Sinon, pas de pastille sur ordinateur ; sur iPad et téléphone, l'entrée du ⋯ est grisée avec « Rien à copier depuis le 17/1 ». Le ⋯ reste, pour les autres entrées et pour garder une place fixe. |
| PG17 | **(choix)** Un dimanche passé se copie aussi : rien n'interdit aujourd'hui d'écrire un dimanche passé. |

### Remplir vers le bas (décision 22 ; PG18 à PG21)

| # | Règle |
|---|---|
| PG18 | « Remplir vers le bas » est une entrée de **« Choisir »** seulement (menu ou feuille). Elle se place sous les noms, avant « Écrire un nom sans compte… » (`v19-pl-remplir-bas-ordinateur.png`, `v19-pl-remplir-telephone.png`). Elle n'apparaît que si la case porte **un** nom : une valeur non vide, dans une case qui ouvre « Choisir » (`laCase`, `PlanningGrille.tsx:290`). Une colonne de texte libre ou une case à plusieurs noms (qui s'ouvrent en champ texte) n'a pas cette entrée. Quand le lot 2 aura refait « Choisir » (OG29 de `spec-organigrammes-groupes.md`), l'entrée se place après « Voir tout le groupe » (replié ou déplié) et avant « Écrire un nom sans compte… ». |
| PG19 | **Portée** : les cases **vides** de la **même colonne**, aux dimanches **après** la case, **jusqu'au dernier dimanche du trimestre** de la case. Ces dimanches sont pris parmi les lignes données à la grille (`lignes`, jamais filtrées par « Mes dates »). **(choix)** Dans une grille qui affiche une autre période que le trimestre (EDD : deux mois ; dates choisies : l'année), la fin est le premier atteint de la fin du trimestre ou de la fin de la période affichée. Les cases de PG2 sont sautées. |
| PG20 | L'aide de l'entrée dit ce qui va se passer, par exemple « Yann M. dans les 9 cases vides de la colonne, jusqu'au 28/3. Les noms déjà posés restent. ». Tant que « Choisir » est ouvert en menu (à partir de 1 024 px ; en feuille, elle cacherait la grille), l'aperçu est posé en pointillé dans ces cases. S'il n'y a aucune case vide, l'entrée est grisée : « Aucune case vide plus bas ce trimestre. ». |
| PG21 | Le choix écrit sans fenêtre : une écriture par dimanche (PG4), un passage d'historique (PG5), puis la bannière Annuler, par exemple « Yann M. mis dans 9 cases, jusqu'au 28/3. » (PG6). |

### Copier-coller au clavier (décision 23 ; PG22 à PG32)

| # | Règle |
|---|---|
| PG22 | **Ordinateur, et tablette avec clavier.** Il faut le tableau (à partir de `sm`), pas les cartes du téléphone. **(choix)** Tout ce qui suit (sélection, barre, flèches, ⌘C, ⌘V, ⌫, légende « Au clavier » sous la grille) n'existe que sous `(hover: hover) and (pointer: fine)` : un doigt sur une tablette sans clavier ne laisse ni sélection ni barre. `v19-pl-clavier-selection-ordinateur.png`. |
| PG23 | **Sélection** : une case choisie (ancre) et, avec Maj+clic, la plage rectangulaire jusqu'à une autre case. La plage se compte sur les lignes **affichées** (`affichees`) et les colonnes **affichées** (`colonnes`), jamais sur `definition.colonnes`. La date et les colonnes `lectureSeule` se sélectionnent mais ne s'écrivent pas (PG2). La plage est entourée d'un trait. Une barre sombre, posée sur la grille juste sous la plage comme sur la planche, dit « 8 cases · 4 dimanches × 2 colonnes » et porte ⌘C Copier · ⌘V Coller · ⌫ Vider · ✕. **(choix)** ⌘C, ⌘V et ⌫ y sont des rappels de touches, pas des boutons (un bouton « Coller » demanderait la permission de lire le presse-papiers, PG26) ; seul ✕ désélectionne. Une seule grille de la page a une sélection : au Campus, un clic dans l'autre grille la déplace. |
| PG24 | **(choix)** Un **clic** sur une case la choisit **et** ouvre « Choisir » ou le champ, comme aujourd'hui (`tests/planning-grille.spec.ts` reste vert). Maj+clic étend la plage sans rien ouvrir. Échap ferme d'abord le menu ou le champ, puis désélectionne : le gestionnaire du clavier ignore un Échap déjà traité (`defaultPrevented`). Les flèches déplacent la case choisie quand ni menu ni champ n'est ouvert. Entrée ouvre « Choisir » (ou le champ d'une colonne de texte libre) sur la case choisie. **Conséquence** : le menu « Choisir » ouvert recouvre la grille d'un voile (`ChoisirNom.tsx:70`), et un clic à côté le ferme sans atteindre la case. Pour une plage, on ferme donc d'abord le menu (Échap, ou un clic à côté), puis Maj+clic : voir la question 9. |
| PG25 | **⌘C** (Ctrl+C sous Windows et Linux) met la plage dans le presse-papiers en **texte tabulé** (une ligne par dimanche, une tabulation entre colonnes), lisible par Google Sheets et Excel. Le geste passe par l'évènement `copy` (`clipboardData.setData("text/plain", …)`) quand le focus n'est pas dans un champ. **(choix)** Une présidence imposée se copie vide : ce n'est pas un nom du groupe. |
| PG26 | **⌘V** (Ctrl+V) lit le texte par l'évènement `paste`. Il ne faut pas de permission de lecture du presse-papiers. Le texte se découpe comme le donnent Google Sheets et Excel : lignes séparées par `\n` ou `\r\n`, colonnes par `\t`, dernière ligne vide ignorée, cellules entre guillemets (`"…"`, guillemets doublés) qui peuvent contenir un saut de ligne, remplacé par « , ». C'est la fonction pure `lireCollage`. Le bloc se pose à partir du **coin haut-gauche** de la sélection, à sa propre taille. Ce qui dépasse les lignes ou les colonnes affichées est coupé et compté (« 2 cases hors de la grille ignorées »). |
| PG27 | **Ce qui s'écrit** : chaque cellule non vide du bloc va dans sa case, sauf les cases de PG2. **(choix)** Une cellule **vide** du bloc n'efface jamais une case : seul ⌫ vide. Une valeur égale à la case ne compte pas. Un nom sans compte (« Pasteur Lin ») s'écrit tel quel, comme un nom tapé à la main. Un texte posé dans une colonne de personne garde ses virgules : une case à plusieurs noms s'affiche alors en texte, comme aujourd'hui. |
| PG28 | **Collage qui ne tombe que dans des cases vides** : il s'écrit tout de suite, sans barre, puis la bannière Annuler s'affiche (décision 23). |
| PG29 | **Collage qui remplace au moins un nom** (piste B, `v19-pl-coller-b-ordinateur.png`) : rien n'est écrit. L'aperçu est posé dans la grille : en pointillé pour une case vide, en **orange** pour une case qui remplace un nom. Une barre orange au-dessus de la grille dit « Aperçu du collage : 12 cases. 3 remplacent un nom (en orange). Rien n'est écrit tant que tu n'as pas collé. ». Elle porte trois boutons : « Annuler » (rien n'est écrit), « Cases vides seulement » et « Coller ». « Cases vides seulement » est grisé quand le bloc ne tombe sur aucune case vide. Entrée colle, Échap annule. Pendant l'aperçu, la grille ne prend pas d'autre geste. |
| PG30 | Après le collage, la bannière Annuler dit par exemple « 12 cases collées depuis le presse-papiers, dont 3 noms remplacés. ». Elle nomme les **noms sans compte** posés : « « Pasteur Lin » : sans compte. », jusqu'à trois noms puis « et N autres ». Un nom est « sans compte » quand aucun `planningName` des comptes ne lui correspond (`normalizeName`, `src/lib/planning/names.ts:144`). Ces noms sont soulignés en pointillé tant que la bannière est là, comme sur la planche. |
| PG31 | **⌫** (ou Suppr) vide les cases de la plage, sauf celles de PG2. Le geste fait une écriture par dimanche et un passage d'historique. **(choix, question 1)** La même bannière Annuler s'affiche, par exemple « 8 cases vidées. ». La décision 24 ne cite pas ⌫, mais une plage vidée par erreur ne se rattraperait sinon qu'à la main. |
| PG32 | Coller d'un planning vers un autre passe par le presse-papiers : il suffit du droit de **remplir la grille d'arrivée** (la lecture est publique). Il n'y a aucune correspondance par en-têtes de colonnes : l'aperçu montre où chaque cellule tombe. |

### Prévenir des changements (décision 25 ; PG33 à PG47)

| # | Règle |
|---|---|
| PG33 | **Où** : les quatre plannings publiés par trimestre, Culte, Paix, Fidélité et Bonté (`PUBLISHABLE_PLANNINGS`). Les autres plannings (Table, EDD, Campus, Interfranco, Intergroupe) n'ont pas de publication, donc pas de « Prévenir ». |
| PG34 | **Trimestre déjà publié** (choix de lecture) : un trimestre qu'un **membre** voit, c'est-à-dire `triVisibilitiesAnnee(…, voitBrouillon = false)` visible : publié, en cours, ou passé de l'année. Il doit aussi lui rester au moins un dimanche **à partir du dimanche en cours**. Un brouillon n'a ni bannière ni points. |
| PG35 | **Qui** : ceux qui publient ou notifient ce planning, au Back-Office. Dans ce lot, c'est `canPublishPlanning` (admin, `notify` « tout le monde » ou la catégorie du planning) : la page le calcule déjà avec `gestion && …` (`culte/page.tsx:64`, `groupes/page.tsx:95`), et `notify` couvre à la fois « publier » et « notifier ». Les autres, même ceux qui remplissent la grille, ne voient ni bannière ni points. Le lot 2 étend le droit (président, VP, rôles qui publient ou notifient : OG23 de `spec-organigrammes-groupes.md`, qui ajoute `publieParRole` à `canPublishPlanning`, et `notifieParRole` à `peutPrevenir` seulement). Pour que ce lot-ci n'ait qu'un endroit à changer, la page et la route ne lisent pas ces deux droits : elles appellent une fonction `peutPrevenir(planning, isAdmin, notifyRights)` (nouvelle, dans `releases.ts`, qui vaut `canPublishPlanning` dans ce lot). Le lot 2 l'étend en `peutPrevenir(planning, isAdmin, notifyRights, publieParRole = [], notifieParRole = [])` (OG23 de `spec-organigrammes-groupes.md`) : c'est le seul point qu'il change, route `/api/planning/changements` comprise (elle relit alors aussi `publieParRole` et `notifieParRole` de l'appelant). **Sans droit d'écrire la grille** (décision 25 : « ceux qui publient ou notifient ce planning ») : qui a `peutPrevenir` sans `canEditPlanning` voit le planning au Back-Office (`planningsDuBackOffice` compte déjà `canPublishPlanning`, `src/lib/access.ts:563-572`), la grille en lecture (`peutModifier` faux, `culte/page.tsx:55`, `groupes/page.tsx:90`). La bannière, les points et la feuille « Prévenir des changements » s'y affichent quand même : la grille les reçoit de `peutPrevenir` seul, jamais de `peutModifier`. Les gestes de la grille, eux, restent absents (PG1). |
| PG36 | **L'état annoncé.** Pour savoir qu'une case a changé, on garde ce qui a été annoncé. C'est un champ nouveau du document qui porte déjà la publication : `planningReleases/{key}_{année}.annonces.{T}` = `{ cases: { "AAAA-MM-JJ|clé": "valeur" }, le, par, publieLe? }` (`le` : date de la dernière écriture de l'état ; `par` : uid de qui l'a déclenchée ; `publieLe` : date de la publication, posée seulement en PG37 a). Les cases vides n'y sont pas : absent veut dire vide. Le document est lisible par tous, comme le planning publié lui-même, et **écrit par le serveur seul** (Admin SDK), sous la règle existante `allow write: if false`. Aucune règle ne change. L'écriture d'un trimestre **remplace** sa carte entière (`set` avec `mergeFields: ["annonces.T4"]`) : un `set` avec `merge: true` simple fusionnerait les cartes et garderait les clés d'anciennes cases. La route `/api/planning/release`, qui écrit avec `merge: true` (`route.ts:77`), ne touche pas à `annonces`. |
| PG37 | **Qui écrit l'état annoncé** : la route `/api/planning/changements` (nouvelle), dans trois cas. (a) **Après une publication** : la page ne connaît pas les modifications locales de la grille (`modifs`) et ses lignes ne suivent pas les écritures de la séance. `BoutonPublication` dit donc seulement à la page, par `onChange` (existant : il rend la liste des trimestres publiés), que le trimestre vient d'y entrer ; la page le passe à la grille (`publications`, un compteur), et la grille envoie les cases du trimestre telles qu'elle les affiche, modifications locales comprises (`action: "reference"`, `apresPublication: true`). Le serveur remplace l'état et pose `publieLe`. Un échec de cet appel ne change rien à la publication et n'affiche rien : l'amorçage (b) reprend à la prochaine ouverture. (b) **Amorçage** : un publieur ouvre un trimestre en ligne qui n'a pas d'état annoncé (publié avant ce lot, ou en cours sans avoir été publié) ; la grille l'envoie avec `siAbsent: true`, et le serveur ne l'écrit que s'il manque (transaction). Le suivi commence alors à ce moment (question 5). (c) **Après « Prévenir » ou « Ne pas prévenir »** : le serveur met dans l'état annoncé la valeur actuelle des cases changées. La route `/api/planning/release` ne change pas. « Masquer » ne touche pas à l'état ; une nouvelle publication le remplace. |
| PG38 | **Une case a changé** quand sa valeur affichée diffère de l'état annoncé, pour un dimanche du trimestre à partir du dimanche en cours. Il faut aussi que la case soit **écrite dans l'app** : présente dans `fetchCasesEcrites(key)` ou modifiée pendant la séance. Une valeur venue du Sheet (2026), une présidence imposée ou une reprise de Fidélité n'est jamais « changée » : ce n'est pas l'app qui l'a écrite. Le calcul est une fonction pure, `changementsDepuis(etat, cases, ecrites, dimancheEnCours)`, dans `src/lib/planning/prevenir.ts` (nouveau). La même fonction pure `casesDuTrimestre(definition, lignes, dimanchesSpeciaux)` donne les cases envoyées en PG37. |
| PG39 | **La bannière** (piste B, `v19-pl-prevenir-b-ordinateur.png`) est au-dessus de la grille, sous la bannière Annuler s'il y en a une. Exemple : « **3 cases ont changé depuis la publication**, le 15/11 et le 22/11. Les personnes concernées ne sont pas encore prévenues. », avec « Ne pas prévenir » et « Prévenir des changements ». Chaque case changée porte un **point orange** et un fond ambre clair, dans le tableau comme sur les cartes du téléphone. **(choix)** Sur téléphone (`v19-pl-prevenir-telephone.png`), la bannière se met en pile : la phrase, puis le bouton pleine largeur, puis « Ne pas prévenir ». La décision dit « bannière » ; la planche du téléphone ne montre que le bouton et une ligne. Rien ne s'affiche sans changement. Les dates sont dites au plus trois à la fois (« le 15/11, le 22/11 et le 29/11 »), puis « … et N autres » ; en 中文 « 11月15日、11月22日 ». **(choix)** Le sous-titre de page « publié le 2 octobre » et le bouton « Masquer le T4 » de la planche ne sont pas repris (question 8). |
| PG40 | **« Ne pas prévenir »** demande confirmation dans le site (« Ne prévenir personne ? Les points disparaissent ; rien n'est envoyé. »), puis appelle la route (`action: "ignorer"`, les changements affichés). Les points disparaissent. |
| PG41 | **La feuille « Prévenir des changements »** est une fenêtre sur ordinateur et iPad, une feuille sur téléphone (`v19-pl-prevenir-feuille-*.png`). Son en-tête dit « Planning Paix · 4e trimestre 2026, publié le 2 octobre » ; sans `publieLe`, il n'y a pas de date. Elle a quatre parties. **Ce qui a changé** : par dimanche, « Présidence : ~~Ruth K.~~ → Anaïs P. », et « vide » pour une case vide. **Qui est prévenu** (« 4 sur 5 ») : chaque personne, avec une pastille **Ajout** ou **Retrait** et la case (« Présidence le 15/11 »), cochée d'office. **Le message** : titre et message. **Ce que reçoit Anaïs P.** : un aperçu. En bas : « Ne pas prévenir » (même confirmation que PG40), « Annuler » (ferme sans rien faire) et « Envoyer à N personnes » (grisé à 0). |
| PG42 | **Destinataires** : pour chaque case changée, les noms de l'état annoncé et de la valeur actuelle passent par `splitNames`. Un nom présent après et pas avant est **ajouté** ; un nom présent avant et pas après est **retiré**. Les changements de Thème (texte) ne touchent personne. Une personne touchée par plusieurs cases n'apparaît qu'**une fois**, avec toutes ses cases ; si elle est retirée d'une case et ajoutée à une autre (déplacée), elle porte les deux pastilles. C'est la fonction pure `personnesTouchees(changements, aUnCompte)` (dans `prevenir.ts`, `aUnCompte(nom)` étant fourni par les comptes côté page et par `loadPlanningNameIndex` côté serveur), la même des deux côtés. Une personne **sans compte** (aucun `planningName` ne lui correspond) est grisée, non cochable, avec « sans compte : à prévenir toi-même ». **(choix)** Les pastilles disent « Ajout » et « Retrait », et non « Ajoutée » ou « Retiré » comme sur la planche : le profil ne dit pas le genre. |
| PG43 | **La ligne de chacun**, dans sa langue (`notifPrefs/{uid}.lang`, lue par le serveur avec `loadNotifLangs` ; absente = français). Pour chaque dimanche touché, elle dit sa place **après** le changement, lue dans le document du dimanche (celui que PG45 relit), toutes colonnes confondues : « Dim. 15/11 : Présidence » (ou plusieurs colonnes), ou « Dim. 15/11 : tu n'es plus au planning » s'il n'y est plus ce jour-là, même quand une autre de ses cases a changé. En 中文 : « 11月15日主日：司会 » et « 11月15日主日：你已不在服事表上 ». Les noms de colonnes viennent de `planning.roles.*` dans les deux fichiers de langue, importés côté serveur comme `modeles.ts:12`. C'est la fonction pure `changementPlanningMessage` (nouvelle, `src/lib/push/messages.ts`). |
| PG44 | **Titre et message** sont pré-remplis : « Planning Paix : changement le 15/11 et le 22/11 » et « Le planning du groupe Paix a changé. Ouvre-le pour voir ta place. ». **(choix)** Le nom du planning est celui du groupe sans « Groupe » (« Paix ») ; pour le Culte, « Planning Culte Franco » et « Le planning du Culte Franco a changé… » : `PublishablePlanning.label` vaut « Groupe Paix » ou « Culte Franco » (`releases.ts:30-33`), le message ne répète pas « groupe » pour le Culte. **(choix, question 3)** Laissés tels quels, chacun les reçoit dans sa langue. Modifiés, ils partent tels quels à tous, comme dans Notifier. Dans tous les cas, la ligne de chacun reste dans sa langue. Le corps du push est la ligne, puis le message. L'aperçu « Ce que reçoit … » montre la première personne cochée, dans la langue de l'interface, avec « FR ou 中文 selon sa langue ». |
| PG45 | **Envoi** (`action: "envoyer"`) : le client envoie les changements affichés, les **noms** cochés, le titre et le message s'ils ont été modifiés. Le serveur fait cinq choses. 1) Il refuse sans l'interrupteur (404, `if (!BACK_OFFICE) return new Response(null, { status: 404 })`, comme `api/scene/conflit/route.ts:23`), sans connexion (401), sans `peutPrevenir` (403, `notify` lu dans `users/{uid}`, comme `release/route.ts:54-64`), et sur un planning, une année ou un trimestre inconnus (400). 2) Dans une **transaction** sur `planningReleases/{key}_{année}`, il vérifie chaque changement (fonction pure `verifierChangements(etat, dimanches, changements, dimancheEnCours)`). La date doit être dans le trimestre et à partir du dimanche en cours, à l'heure de Paris : le dimanche en cours est le premier dimanche égal ou postérieur à `jourDeParis()` (`src/lib/evenements/bascule.ts:19`), parce que `currentSundayStr` (`src/lib/planning/utils.ts:62`) lit l'heure de la machine, qui est UTC sur le serveur. « Avant » doit être égal à l'état annoncé. « Après » doit être égal au champ du document `plannings/{key}/dimanches/{date}`, lu par l'Admin SDK dans la même transaction. Si un seul changement ne correspond pas, la réponse est 409 et le client affiche « Le planning a changé entre-temps : recharge. ». Sinon, l'état annoncé prend les valeurs « après », et la transaction est validée avant tout envoi. « Ne pas prévenir » (`action: "ignorer"`) passe par ces deux premières étapes puis s'arrête : personne n'est prévenu. 3) Il recalcule les personnes touchées depuis les changements vérifiés (PG42). Il ne garde que les noms cochés qui en font partie, puis les relie aux comptes par `loadPlanningNameIndex` et `resolveNamesToUids`. 4) Il envoie à chaque compte **son** push (`sendPushToUids`, un appel par personne, `url: "/mes-services"`, `tag: planning-<key>-<année>-<T>-<horodatage>`). 5) Il écrit l'entrée de cloche de chacun (`recordNotification`, `kind: "manual"`, `recipients: [uid]`). La réponse est `{ prevenus, sansCompte }` et la page dit « Prévenu : 4 personnes. ». |
| PG46 | **Pas de `notifLog`** pour cet envoi : le double clic est arrêté par la transaction. Une fois l'état annoncé mis à jour, un second envoi des mêmes changements ne passe plus la vérification (409). C'est un envoi **manuel**, comme Notifier : il n'est pas filtré par les préférences de notification et ne compte pas dans « une notification par personne et par jour », règle des envois automatiques (question 4). |
| PG47 | Après l'envoi ou « Ne pas prévenir », la page relit l'état annoncé. Les points disparaissent, et la bannière revient au prochain changement (calcul de PG38). |

### Petit déj : « Inscrire quelqu'un » (décision 26 ; PG48 à PG53)

| # | Règle |
|---|---|
| PG48 | **Même public qu'aujourd'hui** : `canGererPetitDej` (écrivains du planning Table et admins), dans l'**App**, `/planning/table`, l'interrupteur ouvert. **(choix)** La décision renomme le geste ; elle ne l'ouvre pas à tous. Un membre garde « Je m'inscris ». |
| PG49 | Les boutons « Ajouter une ligne » des rangées disparaissent (`PetitDejCarte.tsx:250-264`). Un seul bouton plein, **« Inscrire quelqu'un »** (icône personne +), se place dans l'en-tête de la carte, à droite (`v19-pl-pdj-b-ordinateur.png`). Il est caché si le trimestre affiché n'a plus de dimanche à venir, ou si les inscriptions sont illisibles. **(choix)** Sur téléphone, le bouton prend la place de « n libres sur N » dans l'en-tête, comme sur `v19-pl-pdj-b-telephone.png`. |
| PG50 | **Le formulaire** s'ouvre dans la carte, sous l'en-tête. Il contient « Inscrire quelqu'un », un menu **Dimanche** (« dim. 15 nov. », 中文 « 11月15日 »), le champ **Nom** (« Nom de la personne ou de la famille », 80 caractères, noms des comptes suggérés comme aujourd'hui), l'aide « Un dimanche déjà pris : la ligne s'ajoute à côté. », puis « Annuler » et « Inscrire ». Entrée inscrit, Échap annule, et un nom vide est refusé. |
| PG51 | **Les dimanches proposés** : ceux du trimestre affiché, à partir du dimanche en cours, libres ou déjà pris. **(choix)** Le premier dimanche **libre** est choisi d'office, sinon le premier proposé. |
| PG52 | « Inscrire » écrit par `ajouterLigne(dimanche, nom, auteurUid)`, avec un `uid` vide, comme aujourd'hui : même règle et même effet. Le formulaire se ferme, la rangée du dimanche montre la ligne, et un refus s'affiche sous le formulaire. |
| PG53 | L'astuce de « Ton petit déj » (`PetitDejCarte.tsx:347`) gagne, **pour ceux qui ont le bouton seulement**, la phrase « Pour inscrire quelqu'un d'autre, même un dimanche déjà pris : « Inscrire quelqu'un ». » (`v19-pl-pdj-b-ordinateur.png`). |

### Libellés nouveaux (FR · 中文 à relire par Timothée)

| Clé | FR | 中文 |
|---|---|---|
| `planning.gestes.copierLe` | Copier le {{date}} | 复制 {{date}} |
| `planning.gestes.copierPrecedent` | Copier le dimanche précédent | 复制上一个主日 |
| `planning.gestes.copierAide` | Du {{date}}, dans les {{count}} cases vides. | 从 {{date}} 复制到 {{count}} 个空格。 |
| `planning.gestes.copierAideRemplacer` | Du {{date}}. Les {{count}} cases déjà remplies ne changent que si tu le demandes. | 从 {{date}} 复制。{{count}} 个已有名字的格子，除非你要求，否则不变。 |
| `planning.gestes.exclues` | Ne sont pas recopiés : {{colonnes}}. | 不复制：{{colonnes}}。 |
| `planning.gestes.rienACopier` | Rien à copier depuis le {{date}}. | {{date}} 没有可复制的内容。 |
| `planning.gestes.confirmerCopie` | Copier le {{source}} sur le {{cible}} ? | 把 {{source}} 复制到 {{cible}}？ |
| `planning.gestes.confirmerCopieTexte` | Les {{vides}} cases vides du {{cible}} seront remplies. {{remplies}} cases portent déjà un autre nom : elles ne changent que si tu le demandes. | {{cible}} 的 {{vides}} 个空格会被填写。另有 {{remplies}} 格已有别的名字：除非你要求，否则不变。 |
| `planning.gestes.confirmerCopieSansVide` | Le {{cible}} n'a aucune case vide à remplir. {{remplies}} cases portent déjà un autre nom : elles ne changent que si tu le demandes. | {{cible}} 没有空格可填。{{remplies}} 格已有别的名字：除非你要求，否则不变。 |
| `planning.gestes.aujourdhuiLe` · `planning.gestes.le` | Aujourd'hui le {{date}} · Le {{date}} | {{date}} 现在 · {{date}} |
| `planning.gestes.remplirVides` | Remplir les {{count}} cases vides | 填写 {{count}} 个空格 |
| `planning.gestes.remplacerAussi` | Remplacer aussi ces {{count}} noms | 同时替换这 {{count}} 个名字 |
| `planning.gestes.copie` | Dimanche {{cible}} : {{count}} cases copiées du {{source}}. | {{cible}} 主日：已从 {{source}} 复制 {{count}} 格。 |
| `planning.gestes.remplirBas` | Remplir vers le bas | 向下填充 |
| `planning.gestes.remplirAide` | {{nom}} dans les {{count}} cases vides de la colonne, jusqu'au {{fin}}. Les noms déjà posés restent. | 把 {{nom}} 填入此列下方 {{count}} 个空格，直到 {{fin}}。已有的名字保留。 |
| `planning.gestes.rienARemplir` | Aucune case vide plus bas ce trimestre. | 本季度下方没有空格。 |
| `planning.gestes.rempli` | {{nom}} mis dans {{count}} cases, jusqu'au {{fin}}. | 已把 {{nom}} 填入 {{count}} 格，直到 {{fin}}。 |
| `planning.gestes.selection` | {{count}} cases · {{dimanches}} dimanches × {{colonnes}} colonnes | {{count}} 格 · {{dimanches}} 个主日 × {{colonnes}} 列 |
| `planning.gestes.copier` · `coller` · `vider` | Copier · Coller · Vider | 复制 · 粘贴 · 清空 |
| `planning.gestes.apercu` | Aperçu du collage : {{count}} cases. {{remplace}} remplacent un nom (en orange). Rien n'est écrit tant que tu n'as pas collé. | 粘贴预览：{{count}} 格，其中 {{remplace}} 格会替换已有名字（橙色）。点“粘贴”之前不会写入。 |
| `planning.gestes.casesVidesSeulement` | Cases vides seulement | 只填空格 |
| `planning.gestes.colle` | {{count}} cases collées, dont {{remplace}} noms remplacés. | 已粘贴 {{count}} 格，其中替换了 {{remplace}} 个名字。 |
| `planning.gestes.sansCompte` | « {{noms}} » : sans compte. | “{{noms}}”：没有账号。 |
| `planning.gestes.horsGrille` · `verrouillees` | {{count}} cases hors de la grille ignorées. · {{count}} cases verrouillées laissées telles quelles. | 超出表格的 {{count}} 格已忽略。· {{count}} 个锁定的格子保持不变。 |
| `planning.gestes.videes` | {{count}} cases vidées. | 已清空 {{count}} 格。 |
| `planning.gestes.annuler` | Annuler | 撤销 |
| `planning.gestes.clavier` | Au clavier · Clic : une case · Maj + clic : jusqu'à cette case · flèches : se déplacer · Entrée : ouvrir « Choisir » · Échap : tout désélectionner | 键盘：点击选一格 · Shift + 点击：选到这一格 · 方向键：移动 · 回车：打开“选择” · Esc：取消选择 |
| `planning.prevenir.banniere` | {{count}} cases ont changé depuis la publication, {{dates}}. Les personnes concernées ne sont pas encore prévenues. | 发布后有 {{count}} 处改动（{{dates}}），相关同工尚未收到通知。 |
| `planning.prevenir.bouton` · `nePasPrevenir` | Prévenir des changements · Ne pas prévenir | 通知改动 · 不通知 |
| `planning.prevenir.confirmerIgnorer` | Ne prévenir personne ? Les points disparaissent ; rien n'est envoyé. | 不通知任何人？标记会消失，不会发送任何通知。 |
| `planning.prevenir.publieLe` | {{planning}} · {{trimestre}}, publié le {{date}} | {{planning}} · {{trimestre}}，{{date}} 发布 |
| `planning.prevenir.ceQuiAChange` · `quiEstPrevenu` · `leMessage` | Ce qui a changé · Qui est prévenu · Le message | 改动内容 · 通知对象 · 通知内容 |
| `planning.prevenir.vide` | vide | 空 |
| `planning.prevenir.surTotal` | {{count}} sur {{total}} | {{total}} 人中 {{count}} 人 |
| `planning.prevenir.nbDimanches` | {{count}} dimanches | {{count}} 个主日 |
| `planning.prevenir.titre` · `message` | Titre · Message | 标题 · 内容 |
| `planning.prevenir.ajout` · `retrait` | Ajout · Retrait | 新增 · 移出 |
| `planning.prevenir.aPrevenirToiMeme` | sans compte : à prévenir toi-même | 没有账号：请你亲自通知 |
| `planning.prevenir.ceQueRecoit` | Ce que reçoit {{nom}} | {{nom}} 收到的内容 |
| `planning.prevenir.envoyer` | Envoyer à {{count}} personnes | 发送给 {{count}} 人 |
| `planning.prevenir.prevenus` | Prévenu : {{count}} personnes. | 已通知 {{count}} 人。 |
| `planning.prevenir.conflit` | Le planning a changé entre-temps : recharge. | 服事表刚被修改，请重新加载。 |
| `planning.petitDej.inscrireQuelquun` | Inscrire quelqu'un | 替别人报名 |
| `planning.petitDej.dimanche` · `nomPersonne` | Dimanche · Nom de la personne ou de la famille | 主日 · 个人或家庭的名字 |
| `planning.petitDej.dejaPris` | Un dimanche déjà pris : la ligne s'ajoute à côté. | 已有人报名的主日：会另加一行。 |
| `planning.petitDej.inscrireBouton` | Inscrire | 报名 |
| `planning.petitDej.astuceAutres` | Pour inscrire quelqu'un d'autre, même un dimanche déjà pris : « Inscrire quelqu'un ». | 要替别人报名（即使该主日已有人报名）：点“替别人报名”。 |

Les pluriels suivent `_one` et `_other` en français, comme `planning.barre.casesVidesTrimestre` ; en 中文, `_other` seul,
comme `planning.petitDej.libresSur`. Chaque clé de phrase à nombre a donc sa forme au singulier (« 1 case a changé »,
« Envoyer à 1 personne »). La clé `planning.petitDej.ajouter`, qui sert aussi d'étiquette au champ de saisie
(`PetitDejCarte.tsx:252`), devient orpheline avec ce champ : elle est retirée des deux fichiers. Les légendes
sous les planches (« aperçu tant que le menu est ouvert », « case choisie »…) sont des notes de dessin, non reprises
dans les écrans, sauf « Au clavier » (PG22). Les lignes de push de PG43 sont dans `messages.ts`, en dur
dans les deux langues, sur le patron de `planningReleaseMessage`.

## 4. Tranches de code

| Tranche | Ce qui change | Fichiers touchés | Ordre / conflits |
|---|---|---|---|
| **PG-A** — fondations | Fonctions pures : `lignePrecedente`, `colonnesACopier`, `planCopie`, `planRemplir`, `lireCollage`, `planCollage`, `enTexteTabule`. `ecrireCases` (PG4, qui appelle Firestore : pas pure), `noterChangements` (PG5, idem). La grille reçoit `lignesDuPlanning` (PG10) et sait appliquer un « geste » (liste de cases → écritures par dimanche, un passage d'historique, état du dernier geste). Bannière Annuler (PG6 à PG8). | `src/lib/planning/gestes.ts` (nouveau) ; `src/lib/firebase/planningGrille.ts` ; `src/lib/firebase/planningHistorique.ts` ; `src/components/planning/PlanningGrille.tsx` ; `src/components/planning/BanniereGeste.tsx` (nouveau) ; les pages qui montent la grille (`src/app/planning/culte/page.tsx`, `groupes/page.tsx`, `table/page.tsx`, `edd/page.tsx`, `campus/page.tsx`, `src/components/planning/PageDatesChoisies.tsx`) ; `src/locales/fr.json`, `zh-CN.json` | En premier. PG-B, PG-C, PG-D et PG-E en dépendent. |
| **PG-B** — Copier le dimanche précédent | Pastille au survol avec aperçu, ⋯ par dimanche (tableau sans survol, cartes), fenêtre à trois boutons (PG10 à PG17). `MenuActions` gagne `onOuvert` et `desactive` (PG15). | `PlanningGrille.tsx` ; `src/components/planning/FenetreCopie.tsx` (nouveau) ; `src/components/layout/MenuActions.tsx` ; locales | Après PG-A. Même fichier que PG-C et PG-D : à coder l'une après l'autre (B, C, D). |
| **PG-C** — Remplir vers le bas | Entrée de « Choisir » avec aide et aperçu (PG18 à PG21). `ChoisirNom` gagne une prop facultative `remplir`. | `src/components/planning/ChoisirNom.tsx` ; `PlanningGrille.tsx` ; locales | Après PG-B. Le lot 2 touchera aussi `ChoisirNom` et `choisir.ts` (décision 17, titulaires en tête) : il passe après ce lot. |
| **PG-D** — clavier | Sélection, barre de sélection, `copy`, `paste`, ⌫, aperçu du collage et barre Coller (PG22 à PG32). Légende « Au clavier ». | `PlanningGrille.tsx` ; `src/components/planning/useSelectionGrille.ts` (nouveau) ; `BanniereGeste.tsx` ; locales | Après PG-C. |
| **PG-E** — Prévenir | Lecture de l'état annoncé (`lireAnnonce`, à côté de `getPublishedQuarters`). Fonctions pures de PG38, PG42 et PG45 (`changementsDepuis`, `casesDuTrimestre`, `personnesTouchees`, `verifierChangements`), et `peutPrevenir` (PG35). Bannière, points et feuille. Route serveur. `BoutonPublication` dit à la page qu'un trimestre vient d'être publié, la grille envoie l'état (PG37). Les comptes sont aussi chargés pour qui publie (`useGrilleApp` ne les charge que pour qui remplit, `src/lib/planning/useGrilleApp.ts:25-34`). | `src/lib/planning/prevenir.ts` (nouveau) ; `src/lib/planning/releases.ts` ; `src/app/api/planning/changements/route.ts` (nouveau) ; `src/lib/push/messages.ts` ; `src/components/planning/PrevenirChangements.tsx` (nouveau) ; `src/components/planning/BoutonPublication.tsx` ; `src/lib/planning/useGrilleApp.ts` ; `PlanningGrille.tsx` (points) ; `culte/page.tsx`, `groupes/page.tsx` ; locales | Après PG-A. Les nouveaux fichiers peuvent se faire pendant PG-B à PG-D ; les points dans `PlanningGrille.tsx` viennent après PG-D. |
| **PG-F** — petit déj | Bouton en tête et formulaire (PG48 à PG53). Les boutons par rangée sont retirés. | `src/components/planning/PetitDejCarte.tsx` ; locales | Indépendante : à tout moment, en parallèle. |
| **PG-Z** — passage complet | Toutes les specs de planning sur les trois appareils, l'agencement sur cinq, `back-office-coupe`. Captures regardées. `graphify update .`. Avancement ci-dessous, feuille de route. | specs, `playwright.config.ts` (`SPECS_GRAND_ECRAN`), `tests/helpers/fakeSession.ts` (route simulée par défaut, voir la section 7), `CLAUDE.md` (la liste des routes de la section « Architecture clé » gagne `/api/planning/changements` ; nombre de routes : 15 à `5878ce1`, soit 15 fichiers `route.ts` sous `src/app/api` (`CLAUDE.md` en annonce 18 à tort, le lot 1 corrige le nombre), 16 après ce lot), docs | En dernier. Fichiers communs avec le lot 1, codé en parallèle : `src/locales/fr.json`, `src/locales/zh-CN.json`, `tests/helpers/fakeSession.ts`, `tests/back-office-coupe.spec.ts` (liste des routes en 404), `tests/coherence.spec.ts`, `CLAUDE.md` (liste des routes), `tests/planning-grille.spec.ts` et `tests/planning-2027.spec.ts` (le lot 1 retire `poles` des profils simulés). Consigne : `git pull --rebase`, garder les deux ajouts. |

Un commit par tranche, message en français. Ce lot ne touche ni `src/lib/access.ts` ni `firestore.rules` : il n'y a
pas de conflit de droits avec le lot 1. Il partage avec lui, codé en parallèle, les fichiers suivants, quelle que soit la tranche qui les touche : `src/locales/fr.json`, `src/locales/zh-CN.json`, `tests/helpers/fakeSession.ts`, `tests/back-office-coupe.spec.ts` (liste des routes en 404), `tests/coherence.spec.ts`, `CLAUDE.md` (liste des routes), `tests/planning-grille.spec.ts` et `tests/planning-2027.spec.ts` (le lot 1 retire `poles` des profils simulés). Consigne : `git pull --rebase` avant chaque push, garder les deux ajouts. Avec le lot 2, il partage `releases.ts` (`canPublishPlanning`, `peutPrevenir`), `groupes/page.tsx` et `culte/page.tsx` : ce lot passe avant (le lot 2 part de leur état).

## 5. Droits en double

| Droit | `src/lib/access.ts` (client) | `firestore.rules` (serveur) | Route serveur |
|---|---|---|---|
| Copier, Remplir, Coller, Vider, Annuler : écrire des cases | `canEditPlanning` (`access.ts:315-322`), **inchangé** | `plannings/{key}/dimanches/{date}` : `peutEcrirePlanning(key)` et `date == date` (`:468-479`), **inchangé** (un PATCH à plusieurs champs passe déjà) | — |
| Historique d'un geste | `canEditPlanning`, inchangé | `plannings/{key}/history/{entryId}` (`:490-497`), inchangé | — |
| Voir la bannière et les points, envoyer, « Ne pas prévenir », écrire l'état annoncé | `peutPrevenir` (nouveau, `src/lib/planning/releases.ts`), qui vaut `canPublishPlanning` (`:49-55`, **inchangé**) dans ce lot ; le lot 2 l'étend (PG35). C'est déjà le miroir client du droit de publier ; il n'est pas dans `access.ts` | `planningReleases/{id}` : `read: if true ; write: if false` (`:456-459`), **inchangé** (le champ `annonces` s'écrit par l'Admin SDK) | `/api/planning/changements` (nouvelle) revérifie `peutPrevenir` avec `notify` lu dans `users/{uid}`, comme `/api/planning/release` (`route.ts:54-64`) |
| Lire la langue d'un destinataire | — | `notifPrefs/{uid}` : `read: if signedIn()` (`:426-429`), inchangé | La route lit par l'Admin SDK (`loadNotifLangs`) |
| « Inscrire quelqu'un » | `canGererPetitDej` (`access.ts:329-334`), **inchangé** | `petitDej/{id}`, création avec `uid == ''` pour `peutEcrirePlanning('table')` (`:504-511`), **inchangé** | — |

**Aucune règle à publier pour ce lot.** Si le code finit par en ajouter une, la modification se fait en double
(`access.ts` et `firestore.rules`) et **Timothée publie les règles lui-même** dans la console Firebase, avant la
validation en local.

## 6. Migration des données

**Aucune migration.**
- Les grilles gardent leur forme.
- `annonces` est un champ nouveau, posé par le serveur au fil de l'eau : à la publication (PG37 a), au premier
  passage d'un publieur sur un trimestre en ligne (PG37 b), et après un envoi ou « Ne pas prévenir » (PG37 c).
- Un trimestre publié avant ce lot n'a pas d'état annoncé : il en reçoit un à la première ouverture par un publieur.
  Les changements faits avant ce moment ne sont pas signalés (question 5).
- Les lignes du petit déj ne changent pas.
- Aucun script à lancer.

## 7. Tests Playwright à écrire d'abord

Tous sur base simulée (`signInAs`, `fakeFirestore`, `fsDoc`, horloge fixée), écrits avant le code et vus rouges.
Les fichiers ci-dessous tournent sur les **trois appareils** (`ordinateur`, `telephone`, `tablette`), sauf le
fichier d'agencement, sur **cinq projets**. Un test propre à un appareil le dit dans son titre (« ordinateur — … »)
et se saute ailleurs.

**Nouveaux fichiers**

- **`tests/planning-gestes.spec.ts`** (fonctions pures, sans navigateur, comme `tests/planning-2027.spec.ts:14-18`).
  - `lignePrecedente` : J−7 hebdomadaire, même d'une année sur l'autre (le 03/01/2027 copie le 27/12/2026) ; date
    posée précédente pour Interfranco et Campus ; absente, donc vide.
  - `colonnesACopier` : sans Thème ni Orateur, sans `lectureSeule`, facultatives comprises ; Campus sans chants ni
    Répétition (PG11).
  - `planCopie` : vides et remplacements comptés, même nom ignoré, présidence imposée sautée à la source et à la
    cible, valeur reprise de Fidélité recopiée.
  - `planRemplir` : jusqu'au dernier dimanche du trimestre, cases vides seulement, présidence imposée sautée, fin
    d'une période EDD.
  - `lireCollage` : texte de Google Sheets et d'Excel (tabulations, `\r\n`, dernière ligne vide, guillemets
    doublés, saut de ligne dans une cellule).
  - `planCollage` : colonnes affichées et non `definition.colonnes`, cellule vide qui n'efface pas, dépassement
    coupé et compté, cases verrouillées comptées.
  - `enTexteTabule` : présidence imposée copiée vide.
  - `casesDuTrimestre` et `changementsDepuis` : valeur du Sheet, présidence imposée et reprise de Fidélité jamais
    « changées » ; dimanche passé ignoré.
  - Personnes touchées : ajout, retrait, une personne sur deux cases comptée une fois, sans compte.
  - `changementPlanningMessage` en FR et en 中文, avec « tu n'es plus au planning ».
  - `verifierChangements` : un « avant » ou un « après » qui ne correspond pas donne un refus ; une date passée ou hors du trimestre aussi.
  - `peutPrevenir` : admin, `notify` « tout le monde », `notify` de la catégorie ; ni l'un ni l'autre, ni `plannings` seul.
- **`tests/planning-copier.spec.ts`** (Culte T1 2027 et Paix T4 2026 simulés).
  - « ordinateur — » : au survol du 24/1, la pastille « Copier le 17/1 » et l'aperçu en pointillé de 8 cases. Au
    clic : **un seul PATCH** sur `dimanches/2027-01-24` avec 8 champs, sans `orateur`. Une écriture d'historique. La
    bannière « 8 cases copiées du 17/1 ». « Annuler » remet les cases par un PATCH.
  - `ecrireCases` et `noterChangements` se testent ici, par le navigateur (ils appellent Firestore) : un PATCH par dimanche touché, `updateMask` de tous les champs, une lecture et une écriture d'historique pour N cases. Culte T4 2026, dimanche absent de l'app : le PATCH porte aussi la ligne semée (`semer`), sans la colonne petit déj.
  - La cible porte 3 autres noms : la fenêtre du site s'ouvre. « Remplir les 5 cases vides » écrit 5 champs,
    « Remplacer aussi ces 3 noms » en écrit 8, « Annuler » n'écrit rien.
  - Le premier dimanche du trimestre copie le dernier du trimestre précédent. « Mes dates » activé ne change pas la
    source.
  - Paix, un dimanche Interfranco à la source : la présidence n'est pas copiée. À la cible : elle n'est jamais
    écrite.
  - Interfranco : la date posée précédente.
  - « tablette — » et « telephone — » : le ⋯ du dimanche, l'entrée « Copier le dimanche précédent » avec son aide,
    l'aperçu menu ouvert.
  - Dans l'App, ou sans le droit : ni pastille ni ⋯. Droit retiré pendant le geste : le message, et les cases
    reprennent leur valeur.
- **`tests/planning-remplir.spec.ts`**
  - « Choisir » sur une case qui porte « Yann M. » : « Remplir vers le bas » avec « 9 cases vides … jusqu'au
    28/3 ». Le choix écrit les seules cases vides après la case, jusqu'à la fin du trimestre : un PATCH par
    dimanche, une écriture d'historique, la bannière, « Annuler ».
  - Une case vide, une colonne Thème ou une case à deux noms : pas d'entrée. Rien à remplir : l'entrée est grisée.
  - « telephone — » : l'entrée dans la feuille.
- **`tests/planning-clavier.spec.ts`** (ordinateur seulement, titres « ordinateur — », permissions
  `clipboard-read` et `clipboard-write` comme `tests/copy-lyrics.spec.ts:7`).
  - Un clic choisit et ouvre « Choisir » ; Échap ferme puis désélectionne. Clic, Échap (le menu se ferme, la case reste
    choisie), puis Maj+clic fait une plage ; la barre dit « 8 cases · 4 dimanches × 2 colonnes ».
  - ⌘C, puis Ctrl+C : le presse-papiers contient le texte tabulé attendu.
  - Un collage dans des cases vides s'écrit sans barre. Un collage sur 3 noms donne l'aperçu orange et la barre :
    « Cases vides seulement », « Coller » (Entrée), « Annuler » (Échap, rien d'écrit).
  - « Pasteur Lin » s'écrit tel quel et la bannière le dit sans compte. Une présidence imposée et la colonne petit
    déj sont refusées. ⌫ vide la plage, avec la bannière Annuler.
  - Sur `telephone` et `tablette`, ni légende ni barre.
- **`tests/planning-prevenir.spec.ts`** (Paix T4 2026 publié ; état annoncé simulé dans
  `planningReleases/paix_2026` ; route `/api/planning/changements` simulée par `page.route`, comme
  `/api/planning/release` dans `tests/planning-2027.spec.ts:183`).
  - Pour un publieur (`notify: ["Groupe Paix"]`) : trois cases changées donnent les points et la bannière « 3
    cases … le 15/11 et le 22/11 ». Pour un écrivain sans `notify` : rien. Un trimestre brouillon : rien. Une valeur
    venue du Sheet qui diffère : pas de point.
  - Un publieur **sans droit d'écrire** la grille (`notify: ["Groupe Paix"]`, `plannings: []`, non admin) : la grille du
    Back-Office est en lecture (ni pastille, ni ⋯ de dimanche, ni sélection), et la bannière, les points et la feuille
    « Prévenir des changements » sont là (PG35).
  - La feuille : les changements, les Ajout et Retrait cochés, « Pasteur Lin » grisé « à prévenir toi-même »,
    « Envoyer à 4 personnes ». Le corps envoyé à la route est le bon. Après la réponse, l'état est relu et les points
    disparaissent.
  - « Ne pas prévenir » : confirmation, puis `action: "ignorer"`.
  - Une réponse 409 affiche « Le planning a changé entre-temps : recharge. ».
  - Amorçage sans état annoncé : `action: "reference"`, `siAbsent: true`. « Publier le T1 » réussi : `action:
    "reference"`, `apresPublication: true`.
  - « telephone — » : la bannière en pile et la feuille. 中文 : libellés traduits.
- **`tests/planning-gestes-agencement.spec.ts`** (cinq projets ; le fichier est ajouté à `SPECS_GRAND_ECRAN`,
  `playwright.config.ts:16-62`).
  - Les vérifications communes de `tests/helpers/agencement.ts` sur le planning du Back-Office.
  - Les bannières (Annuler, barre Coller, Prévenir) ont la largeur de la grille, et la page ne défile pas de côté.
  - La pastille au survol sur `ordinateur` et `ordinateur-1440` ; le ⋯ de dimanche sur `tablette`,
    `tablette-paysage` et `telephone`. La fenêtre de copie et la feuille Prévenir tiennent dans la fenêtre.
  - Aucune fenêtre du navigateur (`page.on("dialog")` fait échouer). Captures regardées sur les cinq tailles.

**Specs existantes à mettre à jour** (changées parce que le geste change, pas affaiblies)

- `tests/planning-petit-dej.spec.ts`. Les assertions sur « Ajouter une ligne » (`:503`, `:530-542`) passent au
  bouton d'en-tête « Inscrire quelqu'un ».
  - Formulaire : le dimanche puis le nom. L'écriture `uid: ""` et `auteurUid` de l'écrivain.
  - Un dimanche déjà pris : la ligne s'ajoute à côté.
  - Le menu ne propose que des dimanches à venir du trimestre, le premier libre choisi d'office.
  - Un membre n'a pas le bouton. La phrase de l'astuce n'apparaît que pour l'écrivain. 中文 « 替别人报名 ».
  - Captures sur les trois appareils.
- `tests/back-office-coupe.spec.ts` (second serveur) : la liste des routes qui répondent 404 (`:74`) gagne
  `/api/planning/changements`, et `/planning/culte` n'a ni « Copier le dimanche précédent » ni ⋯ de dimanche.
- `tests/coherence.spec.ts:179-182` : la liste des fichiers serveur qui ne doivent pas contenir `ADMIN_EMAILS.includes(`
  gagne `src/app/api/planning/changements/route.ts` (la route utilise `isAdminEmail`, comme `release/route.ts:54`).
- `tests/planning-2027.spec.ts:183` et `tests/agencement-v18-confirmations.spec.ts:213` simulent
  `/api/planning/release`. Après une publication réussie, la grille appelle aussi `/api/planning/changements`
  (PG37 a), et tout publieur qui ouvre un trimestre en ligne sans état annoncé l'appelle pour l'amorçage (PG37 b),
  donc presque toutes les specs du Back-Office en admin. Pour ne pas toucher dix fichiers un à un, `signInAs`
  (`tests/helpers/fakeSession.ts`) simule d'office `POST **/api/planning/changements` avec `{ ok: true }` ; un test
  qui veut voir l'appel pose sa propre route (la dernière route posée gagne). Rien n'est retiré de leurs vérifications.
- **À garder verts** : `planning-grille`, `planning-groupes-grille`, `planning-2027`, `planning-table`,
  `planning-fidelite`, `planning-petit-dej`, `planning-campus`, `planning-edd`, `planning-sainte-cene`,
  `agencement-v18-planning`, `look-planning`, `look-planning-feuille`, `back-office-admin`, `back-office-coupe`.

**Vérifiable seulement en vrai** : la route `/api/planning/changements` (Admin SDK, push). Elle est relue, pas
exécutée, comme le cron. Ses parties pures sont testées dans `planning-gestes.spec.ts`. Aussi : ⌘C et ⌘V sous Safari
et Firefox, et un vrai collage depuis Google Sheets ou Excel. Les tests ne couvrent que Chromium, où `copy` et
`paste` doivent partir même sans texte sélectionné (à vérifier dès PG-D). Safari ne le fait peut-être pas : Timothée
l'essaie ; en cas d'échec, la barre de sélection porte une sélection de texte invisible pour déclencher `copy`.

## 8. Hors périmètre

- **Demander avant.** Les gestes suivants, non retenus :
  - copier un trimestre entier (piste C de la cartographie) ;
  - une poignée de recopie à faire glisser, comme dans Sheets ;
  - ⌘Z, ou plusieurs niveaux d'annulation ;
  - « Annuler » après une seule case choisie dans « Choisir » ;
  - la sélection au doigt sur tablette sans clavier ;
  - coller dans l'App (lecture) ;
  - une correspondance des colonnes par en-têtes au collage.
- **Demander avant**, aussi : « Prévenir » pour les plannings sans publication (Table, EDD, Campus, Interfranco,
  Intergroupe), et une notification automatique à chaque case changée. La décision 25 veut un bouton, dans un
  trimestre publié. Elle lève, pour ce bouton seulement, le « demander avant » de `spec-planning-grille.md` (« une
  notification à la personne qu'on vient d'inscrire dans une case »).
- **Demander avant**, pour le petit déj : « Inscrire quelqu'un » pour un simple membre ; inscrire un compte choisi à
  la place d'un texte ; un compteur « Complet » (hors périmètre de `spec-petit-dej.md`).
- **Jamais** : écrire dans le Google Sheet ; écrire une présidence imposée ou la colonne du petit déj ; une couleur
  nouvelle dans `src/lib/serviceColors.ts` (gelé : le point et l'aperçu orange reprennent les teintes ambre et orange
  déjà en usage) ; une fenêtre du navigateur.

## 9. À la mise en ligne

1. **Aucune règle à publier** (section 5). Rien à lancer. Ce lot ne change pas `firestore.rules` : sa mise en ligne
   ne publie donc pas les règles du lot 1 (si le code finissait par en ajouter une, `firestore.rules` étant un seul
   fichier, la publier publierait aussi celles du lot 1 déjà sur la branche : la bascule du lot 1 se ferait avant, ou
   dans la même séance).
2. Tout est derrière `BACK_OFFICE`. En ligne (interrupteur coupé), les pages restent l'ancien tableau et la route
   répond 404. Les gestes n'apparaîtront en ligne qu'avec le reste du back-office.
3. ⚠ Local et en ligne partagent le même Firestore **et envoient de vrais push**. Pendant la validation en local :
   - « Prévenir » envoie de vraies notifications à de vraies personnes. Timothée l'essaie sur une case où il est
     seul concerné, ou garde « Ne pas prévenir ».
   - Un collage ou une copie écrit vraiment dans le planning. « Annuler » sert à revenir en arrière.
   - L'état annoncé (`planningReleases/…annonces`) posé en local est le vrai.

## 10. Questions ouvertes

1. **« Annuler » aussi après ⌫ (vider une plage) ?** La décision 24 cite Coller, Copier et Remplir. *Recommandation :
   oui* (PG31). La bannière ne coûte rien de plus, et une plage vidée par erreur ne se rattrape sinon qu'à la main.
2. **Campus : « Copier le dimanche précédent » recopie-t-il les chants 1 à 4 et la Répétition ?** La décision dit
   « toutes les colonnes sauf Thème et Orateur ». Le Campus n'a ni l'un ni l'autre, et ses autres textes sont
   propres à chaque séance (date et salle de répétition). *Recommandation : non, seulement les personnes* (PG11).
3. **Titre et message de « Prévenir » : quelle langue ?** *Recommandation* (PG44) : pré-remplis et non touchés,
   chacun les reçoit dans sa langue ; modifiés, ils partent tels quels à tous, comme dans Notifier. La ligne
   personnelle reste toujours dans la langue de chacun.
4. **« Prévenir » est-il un envoi manuel**, qui n'est pas filtré par les préférences de notification et ne compte
   pas dans « une notification par personne et par jour » (règle des envois automatiques, `spec-planning-grille.md`,
   « Toujours ») ? *Recommandation : oui* (PG46). C'est un geste explicite d'un responsable, comme Notifier.
5. **Le suivi des changements commence-t-il à la première ouverture par un publieur**, pour un trimestre publié
   avant ce lot (PG37 b) ? Les changements antérieurs ne sont alors pas signalés. *Recommandation : oui.* Sinon, il
   faudrait lire l'historique, qui ne garde que des passages de 15 minutes et peut manquer une case.
6. **Quelle page ouvre la notification « Prévenir » ?** *Recommandation : `/mes-services`*, qui montre à chacun sa
   place (PG45), plutôt que la page du planning, car la page Groupes ne sait pas s'ouvrir sur Paix par son adresse.
7. **Sur téléphone et tablette, le ⋯ de dimanche ouvre-t-il le menu commun** (`MenuActions`, comme pour le petit
   déj), et non la feuille dessinée sur `v19-pl-copier-telephone.png` (ni le titre « Dimanche 24 janvier » de la
   planche iPad) ? *Recommandation : le menu commun*, un seul composant. Une feuille sur téléphone serait à faire
   pour tous les ⋯ du site, pas pour ce seul geste.
8. **Faut-il changer « Masquer le T4 » dessiné sur un trimestre en cours ?** La planche
   `v19-pl-prevenir-b-ordinateur.png` le dessine dans l'en-tête. Le code ne propose jamais de masquer le trimestre
   en cours, qui reste toujours visible (filet de sécurité, `releases.ts:87-100`). *Recommandation : ne rien
   changer* ; la planche dessine un cas que le site n'offre pas.
9. **Un clic sur une case doit-il ouvrir « Choisir » (comme aujourd'hui) ou seulement la choisir ?** La planche dit
   « Clic : une case » ; PG24 garde l'ouverture pour ne rien casser (`tests/planning-grille.spec.ts`). Mais le menu
   ouvert recouvre la grille : pour une plage, il faut d'abord le fermer (Échap), puis Maj+clic. *Recommandation :
   garder l'ouverture au clic dans ce lot* et regarder l'usage réel ; si la plage gêne, le clic ne fera que choisir, et
   Entrée ou un second clic sur la case choisie ouvrira « Choisir » (les tests de `planning-grille` suivraient).

## 11. Commandes

```bash
npx playwright install --with-deps chromium   # début de session cloud
npx tsc --noEmit
npm run lint
npm test -- tests/planning-gestes.spec.ts tests/planning-copier.spec.ts tests/planning-remplir.spec.ts
npm test -- tests/planning-clavier.spec.ts
npm test -- tests/planning-prevenir.spec.ts tests/planning-petit-dej.spec.ts
npm test -- tests/planning-gestes-agencement.spec.ts          # cinq projets
npm test -- tests/planning-grille.spec.ts tests/planning-groupes-grille.spec.ts tests/planning-2027.spec.ts tests/planning-table.spec.ts tests/planning-fidelite.spec.ts tests/agencement-v18-planning.spec.ts
npm test -- tests/back-office-coupe.spec.ts                   # second serveur, interrupteur coupé
graphify update .
```

## 12. Avancement

- 08/10/2026 : spec écrite, attend le go.
- 08/10/2026 : relecture adversariale à contexte vierge (références de code, planches et décisions revérifiées). Corrigés : lignes de code (EDD, tests), droit de « Prévenir » aligné sur le lot 2 (`peutPrevenir`), état annoncé envoyé par la grille et non par la page, tests (ceux de `ecrireCases` passés au navigateur, route simulée par défaut, `coherence.spec.ts`), phrase d'aide au singulier, clavier réservé au pointeur fin, question 9 (clic et plage).
- 08/10/2026 : relecture croisée des cinq specs, incohérences corrigées.
