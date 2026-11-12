# Entrée des musiciens : le pupitre (demande AP, chantier 2)

**Statut : planche acceptée par Timothée (12/11/2026, « ok pour tout ») ; spec écrite (§ Ce qui se construit, § Tranches PU-1 à PU-6,
§ Questions ouvertes). Aucun code : un go par tranche, pas avant la fin de FS-F** (CLAUDE.md, « Go », « Coder »).
Planche : `docs/planches/planche-pupitre-musicien.html` (artefact privé : https://claude.ai/artifact/N8qza1nQJVjzPtdFf9ek7H). Cadrage d'ensemble : `docs/spec-pupitre-musicien.md`
(§ Chantiers proposés, ligne 2).

## Demande (Timothée, 11/11/2026, point 4 de sa liste)

« Les musiciens passent par le mode louange : onglet Setlists à revoir, les trois affichages à revoir, export PDF
retiré pour eux. »

Cadrage du chantier 2 : l'entrée des musiciens, **une seule commande pour rôle + affichage + disposition**, point
d'entrée des idées d'harmonie en répétition et des accords en chiffres ; planche sur l'état AO.
Réponses de Timothée qui s'y rattachent : les musiciens adorent forScore, on gagne si la partition s'ouvre aussi vite ;
export PDF retiré aux musiciens « je pense que oui », **à confirmer ici** (qui le garde ?). L'export PDF lui-même
reste gelé.

Déjà décidé, sur quoi la planche construit : piste A « Pupitre » de la vue Partitions (`spec-exemples-usage.md`,
tranches T1 à T5 en cours) ; mode louange sans aucune animation ; « Ma partition » (menu « Je lis » en tête de chaque
chant, `spec-ma-partition.md`) ; chiffres et idées d'harmonie en mode louange (`spec-harmonie-accords.md`, décisions
3 et 4, lots H5 et H6 qui attendent cette planche pour la place de la bascule).

## Ce que le code montre (tête de branche du 11/11/2026, `33b1cd4`)

1. **Onglet Setlists** (`src/app/setlists/page.tsx`) : trois onglets « À venir · Archives · Mes setlists », recherche,
   filtre « Mes services », menu des catégories, puis la liste ; rien n'y distingue un musicien d'un autre compte.
   En grand, l'aperçu à droite a déjà un bouton « Mode louange » (`src/components/setlists/ApercuSetlist.tsx:103`).
2. **Portes directes** : l'accueil (« Ton prochain service », `src/components/accueil/PourMoi.tsx:89`) et le détail
   d'un service (`src/components/mesServices/DetailService.tsx:150`) ouvrent `?louange=1`, un toucher.
3. **Page d'une setlist** (`src/app/setlists/[id]/SetlistDetailClient.tsx:1628`) : Présentation · Adapter ·
   Ma version · Modifier (ou « Dupliquer pour mes notes ») · PDF · ⋯ · Mode Louange ; au téléphone « Affichage »,
   « Accords », « Louange », ⋯ (`:1875`-`:1935`). Deux vues, Liste et Partitions.
4. **Export PDF** : bouton rond (`:1655`) et entrée du menu ⋯ (`:1925`), **sans aucune condition de droit** : tout
   compte qui voit la setlist l'exporte. Même chose sur la page d'un chant (`src/app/songs/[slug]/_components/ActionsChant.tsx:45`).
   `src/lib/access.ts` n'a aucune fonction sur le PDF.
5. **Droits voisins** (`src/lib/access.ts`) : `canEditSetlist` (:731) = créateur, admins, équipe de la setlist
   (`editeurs`) ; rôles de service `chanteur · musicien · presidence · regie` (`src/types/user.ts:1`) ; il n'existe
   pas de rôle « responsable de louange » : la présidence et l'équipe de la setlist en tiennent lieu.
6. **Mode louange, barre** (`src/components/performance/BarreHaut.tsx`) : Setlist · Repères · Je joue · (titre) ·
   Tempo · Annoter · Outils · Options d'affichage · Quitter ; au téléphone Outils passe dans Options.
7. **« Je joue »** (`PerformanceMode.tsx:1977`) réunit déjà le **rôle** (Pianiste, Guitariste, Présidence, Choriste,
   Batteur, Aucun ; badge « d'après le planning ») et l'**ordre des sections** (Ordre joué · Sections uniques ·
   Structure seule, `src/lib/partitionLayoutPref.ts`), plus « Masquer les paroles ». Il s'ouvre seul à la première
   entrée (« Choisis ce que tu joues, ton compte s'en souviendra »).
8. **La disposition** est ailleurs : menu « Options d'affichage » (`PerformanceMode.tsx:2147`, `ChoixDisposition`),
   cinq choix (Classique, Couleurs par section, Marge, Scène, Partition, `src/lib/dispositionPref.ts:15`), retenue par
   appareil ; le rôle est retenu par compte (`src/lib/performance/roleCompte.ts`), l'affichage par appareil.
   Trois réglages, trois mémoires, deux menus.
9. **Rôle → réglages** : `ROLE_PRESETS` (`PerformanceMode.tsx:352`) ne règle que accords et paroles ; il ne choisit
   ni l'affichage (sauf Batteur → Structure seule, `partitionLayoutPref.ts:4`) ni la disposition.
10. **Idées d'harmonie** : seulement sur la page de setlist (`IdeesDuChant`, `SetlistDetailClient.tsx:2026`) ;
    aucune bascule Lettres / Chiffres nulle part (lots H5, H6 non codés).

Chrome forScore du mode louange (lot FS d'AO) : codé, finitions en cours dans une autre session ; les captures
montrent la branche telle qu'elle est le 11/11 au soir.

## Captures de l'existant (compte simulé « Alix D. », pianiste ; `test-results/pupitre/`, non commitées)

Téléphone : onglet Setlists, page de setlist, mode louange (« Je joue » ouvert d'office). Tablette debout : les
mêmes, plus Options d'affichage. Tablette couchée : onglet Setlists, setlist. Ordinateur : setlist en deux volets.

## Pistes, recommandation, questions

Trois pistes (planche `docs/planches/planche-pupitre-musicien.html`) :

- **A. Le pupitre (recommandée)** : pour un musicien, l'onglet Setlists s'ouvre sur son prochain service, déjà « posé
  sur le pupitre » (les chants en rangées, un toucher ouvre le mode louange sur ce chant) ; « Plus tard », « Archives »
  et « Mes setlists » repliés dessous. Dans le mode louange, « Je joue » devient une pastille qui résume rôle, ordre et
  disposition (« Piano · Tout le chant · Classique ») et ouvre une seule feuille.
- **B. Le programme du culte** : mes services dans l'ordre du calendrier, comme un programme imprimé ; la commande unique
  est une phrase à trous (« Je joue piano, tout le chant, en classique »), chaque mot se touche.
- **C. La setlist au sol** : grosses rangées lisibles à un mètre ; deux affichages au lieu de trois ; barre basse à trois
  segments sous le pouce.

Questions posées à Timothée (propositions de la planche, corrigées par la critique) : qui garde l'export PDF ; le PDF
sur la page d'un chant ; ce qui le remplace pour un musicien (hors-ligne d'office) ; l'onglet du musicien ; les trois
affichages renommés ; où vit la commande unique ; le rôle règle les trois ; la feuille « Je joue » à la première
entrée ; place de 字母/数字 et des idées d'harmonie ; couleur par défaut des icônes du mode louange.

Fait vérifié pour la spec : l'export PDF est produit dans le navigateur (`SetlistDetailClient.tsx:780`-`830`, import
dynamique de `@/components/pdf/*`), sans route API : le retirer aux musiciens masque le bouton, sans protection serveur.

## Décisions de Timothée (12/11/2026, « ok pour tout »)

Piste **A « Le pupitre »** et les quatorze propositions de la planche (version republiée le 12/11). Ce n'est pas un go
de code : la spec vient d'abord, puis « go pour la tranche N ? ».

1. **PDF d'une setlist** : réservé à qui peut la modifier (`canEditSetlist` : créateur, équipe, admins) et à la
   présidence du service ; un musicien qui crée la setlist de son groupe le garde. Masquage seulement (PDF produit dans
   le navigateur, aucune route API).
2. **PDF d'un chant** : admins et membres de l'équipe d'au moins une setlist à venir ; le bouton disparaît sinon.
3. **À la place du PDF** : rien à toucher ; les setlists de ses services gardées hors-ligne d'office, « Prêt hors-ligne »
   (已可离线使用) dans le bloc du pupitre.
4. **Onglet Setlists** : bloc « Mon prochain service » en tête pour toute personne inscrite au planning (« Jouer »
   dedans, chants en rangées au téléphone, en vignettes dès la tablette) ; l'onglet actuel dessous, entier ; « + »
   toujours visible pour qui peut créer ; aucun bloc sans service planifié.
5. **Trois affichages renommés** : « Tout le chant » (完整顺序), « Chaque section une fois » (每段一次), « Plan du
   chant » (只看结构).
6. **Disposition déplacée** d'« Options d'affichage » vers « Je joue » (révise la décision 10 d'AO) ; Options garde
   « Sur la page », « Couleur des accords », texte, thème, métronome, couleur des icônes.
7. **Le rôle règle aussi l'ordre et la disposition** (Batteur : Plan du chant ; Pianiste, Guitariste : Tout le chant et
   Classique ; Présidence, Choriste : paroles seules) ; un choix manuel gagne jusqu'au prochain changement de rôle.
   Mémoire : rôle et ordre par compte, disposition par type d'appareil.
8. **Première entrée** : si le planning donne le rôle, une ligne « Réglé pour piano d'après le planning. Changer »
   (sans animation) au lieu du popover ouvert (révise FS-C et RP) ; le popover ne s'ouvre seul que si le planning ne
   dit rien.
9. **Lettres | Chiffres** (字母 | 数字) dans « Outils », sur la ligne de la tonalité (place de la bascule du lot H5).
10. **Rond « Idées »** dans « Sur la page », après « Paroles », éteint par défaut (point d'entrée du lot H6).
11. **« ‹ Toutes mes setlists »** en tête du menu Setlist : services à venir, les miens d'abord ; ouvre la setlist sur
    son premier chant, sans animation ; hors-ligne, seulement les setlists gardées sur l'appareil.
12. **« Jouer »** en encre sur l'onglet ; couleur du service seulement sur l'écran d'un culte (règle 5C1).
13. **Vignette 简谱 en sombre** : scan inversé et atténué, à regarder sur appareil avant la tranche.
14. **Libellés chinois** nouveaux à faire relire par un locuteur.

Également acquis (non questionnés, dits sur la planche) : « Couleur des accords » reste dans Options ; sur ordinateur,
le bloc du pupitre occupe le volet de droite (l'aperçu actuel). Non dessinés, à traiter dans la spec : Outils au
téléphone, tablette couchée hors piste A, compte sans service, « Toutes mes setlists » hors-ligne.

## Ce qui se construit

Préfixe des tranches : **PU** (pupitre). Faits revérifiés sur la tête de branche du 12/11/2026 (`3a70d06`, après MP-3) ;
les numéros de ligne du § « Ce que le code montre » ont glissé, ceux d'ici font foi.

### Export PDF réservé (décisions 1 et 2)

- Aujourd'hui, **deux** entrées sur la page de setlist, sans condition : le bouton de la barre
  (`SetlistDetailClient.tsx:1808-1816`) et l'entrée du menu ⋯ (`:2051-2056`) ; la « barre compacte » citée plus haut n'a
  pas de PDF à elle. Page d'un chant : `ActionsChant.tsx:46-56`, rendu deux fois (`SongDetailClient.tsx:565` rangée,
  `:571` téléphone). MP-3 (Crayon) n'a déplacé aucune de ces lignes. Le PDF du planning (`ExportModele.tsx`) n'est pas
  concerné.
- Deux fonctions dans `src/lib/access.ts` : `canExporterPdfSetlist(user, profile, setlist, presidence)` =
  `canEditSetlist(...) || presidence` ; `canExporterPdfChant(user, profile, equipeAVenir)` = admin `|| equipeAVenir`.
  **Pas de miroir dans `firestore.rules`** : le PDF se fait dans le navigateur à partir de données que le compte lit
  déjà ; c'est un masquage, pas une permission (exception assumée à la règle « permissions en double », à écrire en
  commentaire au-dessus des deux fonctions).
- **Présidence du service** : aucune fonction ne donne le rôle brut (`roleDuPlanning`, `src/lib/planning/rolePlanning.ts:34-61`,
  rend une vue). Ajouter `presideLeService(entrees, setlist)` dans ce même fichier, avec le **même filtre** que
  `roleDuPlanning` (catégorie, `setlistDate ?? date`, moment au Campus) et `entry.role === "Présidence"`. Source : les
  services déjà chargés par la page (`servicesDuCompte`, `SetlistDetailClient.tsx:174-181`, si `BACK_OFFICE` et
  `planningName`). Planning absent ou en panne : `presidence = false` (seuls les droits de modification comptent).
- **Équipe d'une setlist à venir** (page d'un chant) : `getSetlistsPartagees(uid)` (`src/lib/firebase/setlists.ts:354`,
  `editeurs` contient l'uid) **et** `getMySetlists(uid)` (`:381`, créateur), filtrées sur `date >= aujourd'hui`. Lu une
  fois par visite, gardé en mémoire de module comme `prochainesLues` (`src/app/songs/ChoisisUnChant.tsx:45`). Pendant la
  lecture, le bouton n'est pas rendu (pas d'apparition après coup pour qui n'y a pas droit ; pour qui y a droit, il
  arrive à la fin de la lecture, sans animation).

### Bloc « Mon prochain service » de l'onglet Setlists (décisions 3, 4, 12, 13)

- **Qui le voit** : un compte dont `pourMoi` (`src/lib/planning/accueil.ts:28-40`, pure, déjà utilisée par l'accueil)
  rend au moins un service à venir **relié à une setlist** (`setlistDuService`, `accueil.ts:69-76`). Données : le planning
  que l'onglet charge déjà (`loadPlanningData`, `src/app/setlists/page.tsx:88`) et les setlists qu'il lit déjà
  (`getSetlists` + `getSetlistsPartagees`, `:114`). Aucun service, ou service sans setlist encore : **pas de bloc**,
  l'onglet est celui d'aujourd'hui.
- **Contenu** (planche, piste A) : date et culte, « tu joues piano d'après le planning » (rôle de `roleDuPlanning`,
  rien si ambigu), « Prêt hors-ligne » (已可离线使用, PU-3), bouton **« Jouer »** à l'encre (la couleur du service
  reste réservée à l'écran d'un culte, règle 5C1), puis les chants : **rangées sans vignette au téléphone**,
  **vignettes dès la tablette** (première page du chant ; pour un chant à scan 简谱, le scan, **inversé et atténué en
  sombre**). Un toucher sur un chant ouvre le mode louange **sur ce chant** ; « Jouer » l'ouvre sur le premier.
- **Dessous**, l'onglet actuel entier (À venir · Archives · Mes setlists, recherche, filtres) ; le « + » reste visible
  pour qui peut créer (`canCreateSetlist`, `page.tsx:108`, `:494`), inchangé.
- **Ordinateur** (et tablette couchée, deux volets) : le bloc prend le volet de droite **tant qu'aucune setlist n'est
  choisie** (aujourd'hui `displayed[0]`, `page.tsx:226-232`) ; choisir une setlist de la liste remet l'aperçu
  (`ApercuSetlist.tsx`) ; « Mon prochain service », en tête de la liste, y ramène. Tablette couchée **hors piste A** (non
  dessinée) : même règle que l'ordinateur, la barre latérale réduite.
- **Ouvrir sur un chant** : `useEntreeLouange.ts:15-19` ne lit que `louange=1`. Ajouter `chant=<index>` (entier, borné ;
  ignoré s'il est faux), lu avant le `replaceState` qui efface les paramètres ; le mode louange s'ouvre sur la première
  page de ce chant, sans animation.

### Gardé hors-ligne d'office (décision 3)

- Aujourd'hui, une setlist n'est gardée que si on l'a ouverte en ligne : copie IndexedDB écrite à chaque lecture
  (`ecrireCopie`, `SetlistDetailClient.tsx:539-543`, `src/lib/setlist/copieHorsLigne.ts`, gardée 14 jours) et demande
  « precache » au service worker (page, liste, chants, scans 简谱, `:545-572`). Aucune liste des copies n'est lisible.
- Nouveau module `src/lib/setlist/gardeServices.ts` : pour chaque setlist des services à venir du bloc (jusqu'à
  14 jours, la durée de garde), lire la setlist et ses chants, écrire la copie, envoyer le même « precache » (la demande
  actuelle est sortie dans une fonction partagée, sans changer ce qu'elle demande). Sans réseau, rien n'est tenté.
  **Aucun changement de stratégie de `public/sw.js`** : le cache reste `gcc-louange-v6`.
- `listerCopies(uid)` dans `copieHorsLigne.ts` (énumère les copies valides du compte) : sert à « Prêt hors-ligne » et au
  menu « Toutes mes setlists » hors-ligne (PU-6).
- « Prêt hors-ligne » s'affiche quand la copie **et** le precache du prochain service sont faits ; avant, rien (pas
  d'indicateur de chargement).

### « Je joue » : rôle, ordre, disposition (décisions 5, 6, 7, 8)

- **Renommage** des trois affichages, partout où ils s'affichent (menu Affichage de la page de setlist
  `MenusSetlist.tsx:95`, « Je joue » `PerformanceMode.tsx:2056`, guide `fr.json:1071` et son pendant chinois) :
  `setlists.detail.layout.played` « Tout le chant » (完整顺序), `unique` « Chaque section une fois » (每段一次),
  `structure` « Plan du chant » (只看结构). Les identifiants `played | unique | structure` ne changent pas. Quinze specs
  citent les anciens libellés (liste : `git grep -ln "Ordre joué\|Sections uniques\|Structure seule" tests`).
- **Disposition dans « Je joue »**, sous l'ordre : `ChoixDisposition` quitte « Options d'affichage »
  (`PerformanceMode.tsx:2150-2153`) ; Options garde « Sur la page », « Couleur des accords », texte, thème, métronome,
  couleur des icônes. Au téléphone, « Je joue » est une feuille du bas : ses trois rubriques défilent dans la feuille ;
  Outils reste en tête d'Options (inchangé). La page de setlist et la page d'un chant gardent leur menu de disposition.
- **Le rôle règle les trois** (`ROLE_PRESETS`, `PerformanceMode.tsx:354`, gagne `ordre` et `disposition`) :
  Pianiste, Guitariste → Tout le chant, Classique ; Batteur → Plan du chant (la feuille de route, disposition sans
  objet) ; Présidence, Choriste → paroles seules, Tout le chant, Classique (Q3). Choisir un ordre ou une disposition à
  la main **ne retire plus le rôle** : le choix tient jusqu'au prochain changement de rôle, qui réapplique les trois (Q2).
- **Mémoire** : rôle par compte (`roleCompte.ts`, inchangé) ; **ordre par compte** : `partitionLayoutPref.ts` passe à
  `partition-layout-<uid>` connecté (`partition-layout` sinon), reprise une seule fois de la clé d'appareil par le
  premier compte, avec la marque `perf-role-migre` comme le rôle ; **disposition par appareil** (`dispositionPref.ts`,
  inchangé : « la tablette sur le pupitre n'est pas le téléphone »).
- **Première entrée** (révise FS-C et RP) : planning qui donne un rôle et aucun rôle retenu → le rôle s'applique et une
  ligne « Réglé pour piano d'après le planning. Changer » (按排班已设为钢琴。更改) s'affiche à la place de la pastille RP,
  sans animation, jusqu'au premier tour de page ; « Changer » ouvre « Je joue ». Le popover ne s'ouvre seul que si le
  planning ne dit rien (ou est ambigu). La pastille RP (rôle retenu ≠ rôle du planning) ne change pas.

### « ‹ Toutes mes setlists » (décision 11)

En tête du menu Setlist (`ContenuSetlist`, `src/components/performance/ContenusMenus.tsx:116`) : une ligne qui déplie la
liste des setlists à venir, celles de mes services d'abord (`clesDeMesServices`, `src/lib/setlist/liste.ts:10`), puis
les autres lisibles par date. Un toucher ouvre `/setlists/<id>?louange=1` sur son premier chant, sans animation.
Hors-ligne : seulement `listerCopies(uid)` ; les autres ne sont pas listées (pas grisées). La liste est passée par la
page de setlist en propriété du mode louange (lue une fois à l'ouverture du menu, pas à l'ouverture du mode).

### Ce qui se construit ailleurs

- **Lettres | Chiffres** (décision 9, ligne de la tonalité dans Outils) et **rond « Idées »** (décision 10, après
  « Paroles », éteint par défaut) : places fixées ici, **codées par les lots Harmonie** H7 (bascule) et H8 (mode
  louange) de `spec-harmonie-accords.md` (la renumérotation du 12/11 a remplacé « H5 et H6 » cités plus haut). Aucun
  bouton sans fonction n'est posé avant eux.
- La ligne « Partition » sous « Je joue » et le Crayon du mode louange : MP-5 (`spec-ma-partition.md`).
- L'export PDF lui-même : gelé.

## Tranches

Règles communes : Playwright sur **trois appareils** ; les specs d'agencement ajoutées à `SPECS_GRAND_ECRAN` (cinq
projets) ; captures **regardées** aux quatre dispositions (+ 1 440 px pour une page de lecture), FR et 中文, clair et
sombre ; un chant FR et un chant ZH ; noms fictifs inventés ; Sheet du planning simulé (`page.route` sur l'origine
Google, `serviceWorkers: "block"`) ; `npx tsc --noEmit`, `npm run lint`, `npm run validate`. Tout libellé chinois
nouveau : `python3 scripts/build-fonts.py`, et sa relecture par un locuteur avant la mise en ligne (décision 14).
Aucune animation ajoutée. Une session neuve par tranche (`CLAUDE.md`, § Sessions cloud).

**Ordre et dépendances** : PU-1, PU-2 et PU-3 ne touchent pas le mode louange et **ne dépendent pas de FS-F** (PU-1
attend la vérification de MP-3, qui reprend les mêmes fichiers) ; le go, lui, vient après FS-F. PU-4, PU-5 et PU-6 touchent
`PerformanceMode.tsx` : **après FS-F poussé et fusionné**, une à la fois, jamais en même temps qu'une autre session
dans ce fichier (JP-C, JP-D, MP-5 ; Q7).

### PU-1 — PDF réservé (S)
- **But** : décisions 1 et 2.
- **Fichiers** : `src/lib/access.ts`, `src/lib/planning/rolePlanning.ts` (`presideLeService`),
  `src/app/setlists/[id]/SetlistDetailClient.tsx` (barre et menu ⋯), `src/app/songs/[slug]/_components/ActionsChant.tsx`
  et `SongDetailClient.tsx` (lecture de l'équipe à venir) ; nouvelle spec `tests/pdf-droits.spec.ts`.
- **Doit à / attend** : RP (services déjà chargés sur la page) ; MP-3 vérifiée (Crayon dans les mêmes barres).
- **Critères** : musicien hors équipe : aucun PDF sur la setlist (barre, menu ⋯) ni sur un chant ; membre de l'équipe
  (`editeurs`) et créateur : PDF sur la setlist ; présidence du service d'après le Sheet simulé : PDF sur cette setlist,
  pas sur une autre ; même compte, Sheet en panne : pas de PDF ; admin : partout ; membre de l'équipe d'une setlist à
  venir : PDF sur un chant, et plus aucun quand sa seule setlist est passée ; sans compte : pas de PDF sur un chant ;
  le PDF exporté par un ayant droit est le même qu'avant (le test existant de l'export reste vert).
- **Dispositions** : page de setlist et page d'un chant, téléphone et ordinateur (le menu ⋯ au téléphone).
- **Ne touche pas** : le contenu du PDF, `firestore.rules`, le PDF du planning.

### PU-2 — Bloc « Mon prochain service » (M)
- **But** : décisions 4, 12, 13 ; ouverture du mode louange sur un chant.
- **Fichiers** : `src/app/setlists/page.tsx`, nouveau `src/components/setlists/Pupitre.tsx`, `src/lib/planning/accueil.ts`
  (réemploi, rien de nouveau sauf besoin), `src/app/setlists/[id]/_hooks/useEntreeLouange.ts` (+ son lecteur dans
  `SetlistDetailClient.tsx`), `src/locales/fr.json`, `zh-CN.json` ; spec `tests/pupitre-onglet.spec.ts` (dans
  `SPECS_GRAND_ECRAN`).
- **Doit à / attend** : rien d'un lot en cours (le mode louange n'est que la cible du lien).
- **Critères** : compte inscrit avec une setlist liée : le bloc est en tête, les six chants d'un culte de six visibles au
  premier écran à 390 px, le premier service de la liste visible dessous ; « Jouer » ouvre le mode louange sur le chant 1,
  un toucher sur le chant 4 l'ouvre sur la première page du chant 4 ; `chant=99` ou `chant=x` ouvre sur le chant 1 ;
  compte sans service, ou service sans setlist : aucun bloc, l'onglet identique à aujourd'hui ; le « + » visible pour
  un musicien qui peut créer ; rangées sans vignette au téléphone, vignettes dès la tablette ; à l'ordinateur, le bloc
  dans le volet de droite tant qu'aucune setlist n'est choisie, l'aperçu après un choix ; « Jouer » à l'encre (couleur
  calculée = celle du texte) ; en sombre, la vignette d'un scan 简谱 est inversée.
- **Dispositions** : les quatre et 1 440 px, clair et sombre (la vignette sombre en capture pour Timothée, Q6).
- **Ne touche pas** : `ApercuSetlist.tsx` au-delà de la bascule bloc / aperçu, l'accueil, le mode louange, « Prêt
  hors-ligne » (PU-3).

### PU-3 — Gardé hors-ligne d'office (S à M)
- **But** : décision 3.
- **Fichiers** : `src/lib/setlist/copieHorsLigne.ts` (`listerCopies`), nouveau `src/lib/setlist/gardeServices.ts`,
  `SetlistDetailClient.tsx` (demande « precache » sortie en fonction partagée), `Pupitre.tsx` ; spec à côté de
  `tests/setlist-hors-ligne.spec.ts`.
- **Doit à / attend** : PU-2.
- **Critères** : à l'ouverture de l'onglet en ligne, la copie du prochain service est écrite sans avoir ouvert la
  setlist ; « Prêt hors-ligne » paraît ensuite, pas avant ; puis `context.setOffline(true)` : la setlist s'ouvre depuis le
  bloc et le mode louange tourne ses pages ; un service à plus de 14 jours n'est pas gardé ; `listerCopies` ne rend que
  les copies du compte (deux comptes fictifs) ; hors ligne au départ, rien n'est tenté et aucune erreur n'est affichée.
  Le service worker réel se mesure avec `scripts/rude-epreuve` (à noter dans l'Avancement, pas dans la CI).
- **Dispositions** : téléphone et tablette debout (le libellé dans le bloc).
- **Ne touche pas** : les stratégies de `public/sw.js` ni sa version de cache.

### PU-4 — Trois affichages renommés, disposition dans « Je joue » (M)
- **But** : décisions 5 et 6.
- **Fichiers** : `src/locales/fr.json`, `zh-CN.json` (libellés et guide), `src/components/performance/PerformanceMode.tsx`
  (bloc « Je joue », Options) ; les quinze specs qui citent les anciens libellés, `tests/helpers/louange.ts` s'il les
  cite.
- **Doit à / attend** : FS-C (popover « Je joue ») ; **FS-F** (le rond « Paroles » et le départ de « Masquer les
  paroles » touchent les mêmes lignes) ; CA (« Couleur des accords » reste dans Options).
- **Critères** : « Je joue » montre rôles, ordre (trois libellés nouveaux), disposition (les cinq, à miniatures), dans cet
  ordre ; Options n'a plus de disposition et garde le reste ; le menu Affichage de la page de setlist porte les mêmes
  trois libellés ; au téléphone la feuille « Je joue » défile jusqu'à la dernière disposition et chaque choix se touche
  (44 px) ; aucun popover ne tourne la page (touchers à 15, 50, 85 %) ; toutes les specs du mode louange vertes.
- **Dispositions** : les quatre et 1 440 px ; « Je joue » ouvert au téléphone et à la tablette debout, FR et 中文.
- **Ne touche pas** : ce que fait chaque affichage, les identifiants, la mémoire (PU-5).

### PU-5 — Le rôle règle les trois ; première entrée (M)
- **But** : décisions 7 et 8.
- **Fichiers** : `PerformanceMode.tsx` (`ROLE_PRESETS`, `applyRolePreset`, accueil du rôle, pastille RP),
  `src/lib/partitionLayoutPref.ts` (par compte), `src/lib/performance/roleCompte.ts` (marque de migration partagée,
  si besoin), `SetlistDetailClient.tsx` (passe l'uid à la préférence d'ordre), locales ; specs `louange-je-joue`,
  `louange-role-planning`, `coup-d-oeil`.
- **Doit à / attend** : PU-4 ; RP.
- **Critères** : choisir Pianiste pose Tout le chant et Classique ; Batteur, Plan du chant ; Présidence, paroles seules,
  Tout le chant, Classique ; choisir ensuite « Chaque section une fois » garde Pianiste coché, et le choix tient après
  rechargement ; rechoisir un rôle réapplique les trois ; deux comptes fictifs sur un appareil gardent chacun leur ordre ;
  la disposition reste celle de l'appareil ; Sheet simulé « Piano », aucun rôle retenu : pas de popover, la ligne
  « Réglé pour piano d'après le planning. Changer », le rôle appliqué, la ligne partie au premier tour de page ;
  « Changer » ouvre « Je joue » ; planning muet : le popover s'ouvre seul comme aujourd'hui ; rôle retenu ≠ planning :
  la pastille RP comme aujourd'hui.
- **Dispositions** : téléphone, tablette debout et ordinateur (la ligne de première entrée), FR et 中文.
- **Ne touche pas** : la mémoire du rôle (`roleCompte.ts`), celle de la disposition, les règles de la pastille RP.

### PU-6 — « ‹ Toutes mes setlists » (S à M)
- **But** : décision 11.
- **Fichiers** : `src/components/performance/ContenusMenus.tsx` (`ContenuSetlist`), `PerformanceMode.tsx` (propriété),
  `SetlistDetailClient.tsx` (lecture de la liste), locales ; spec `tests/louange-toutes-setlists.spec.ts`.
- **Doit à / attend** : FS-B (menu Setlist), PU-3 (`listerCopies`) ; FS-F fusionné.
- **Critères** : la ligne est en tête du menu Setlist ; dépliée, mes services d'abord puis les autres setlists à venir ;
  un toucher ouvre l'autre setlist en mode louange sur son premier chant ; hors ligne, seules les setlists gardées sont
  listées ; un toucher dans le menu ne tourne jamais la page ; Échap ferme le menu puis le mode.
- **Dispositions** : téléphone (feuille), tablette debout, ordinateur (popover).
- **Ne touche pas** : l'onglet Setlists, les autres menus.

## Questions ouvertes (proposition à chacune)

1. **PDF d'un chant sans compte** : la décision 2 le retire à qui n'est ni admin ni de l'équipe. Je propose de le
   retirer aussi aux visiteurs sans compte (lecture littérale de la décision ; le PDF reste à ceux qui préparent).
2. **Choix manuel et rôle** : la décision 7 dit « un choix manuel gagne jusqu'au prochain changement de rôle ». Je
   propose : l'ordre et la disposition ne retirent plus le rôle ; les ronds « Accords » et « Paroles » le retirent
   encore (FS-F), car ils changent ce que le rôle veut dire (accords et paroles).
3. **Présidence et Choriste** : la planche ne leur donne que « paroles seules ». Je propose Tout le chant et Classique
   pour eux aussi (la lecture la plus simple d'un chant entier).
4. **Équipe d'une setlist à venir** (PDF d'un chant) : je propose créateur **ou** membre de `editeurs` (même groupe que
   `canEditSetlist`, sans les admins, déjà couverts).
5. **Hors-ligne d'office** : je propose les services des 14 prochains jours (durée de garde des copies), déclenché à
   l'ouverture de l'onglet Setlists seulement (pas de l'accueil), une fois par jour et par setlist.
6. **Vignette 简谱 en sombre** (décision 13 : « à regarder sur appareil avant la tranche ») : la session cloud n'a pas
   d'appareil. Je propose que PU-2 la code, que ses captures sombres (tablette, ordinateur) partent au pilote pour
   Timothée, et que l'essai sur iPad se fasse avant la mise en ligne ; si elle ne convient pas, elle tombe sans toucher
   au reste du bloc (rangées sans vignette).
7. **Ordre avec AO et MP** : je propose PU-4, PU-5, PU-6 après FS-F, **avant JP-C** si sa place se libère avant, sinon
   entre JP-C et JP-D ; jamais en même temps qu'une session dans `PerformanceMode.tsx` ; MP-5 vient ensuite et range sa
   ligne « Partition » sous la disposition. PU-1 à PU-3 partent les premières, dès le go et une place de code libre (règle des
   trois chantiers).

## Avancement

- 11/11/2026 (nuit) : code relu, huit captures prises, `/planche` lancé (sujet `pupitre-musicien`).
- 11/11/2026 (nuit) : `/planche` rendu (trois pistes, A recommandée) ; critique « à retoucher » (accent pétrole = couleur
  du culte, chrome bleu = choix par appareil, vignettes illisibles au téléphone, tablette couchée absente) ; une reprise lancée.
- 12/11/2026 : reprise faite (13 corrections : « Jouer » suit la règle 5C1, couleur des icônes du mode louange = choix
  existant, culte à six chants partout, rangées sans vignette au téléphone, pastille longue et sa troncature, mesures
  qui départagent, cadre 中文, tablette couchée de A en clair et en sombre). Relue sur les quatre dispositions, publiée
  en artefact privé, questions posées. Mesures : six chants sur six au premier écran à 390 px pour A et B, C à −4 px ;
  touchers pour changer l'ordre A 3, B 4, C 2 ; réglages lisibles sans rien ouvrir A 1/3, B 0/3, C 3/3.
  **En attente des réponses de Timothée** ; ensuite la spec, puis le go.
- 12/11/2026 : deux remarques de Timothée. (1) « Des fois des musiciens doivent créer des setlists » : vérifié, un
  musicien crée dans ses lieux (`access.ts:641`, `:666`) ; plus d'onglet « musicien » opposé à « responsable », le
  pupitre se montre en tête pour qui sert, le + reste visible. (2) « Base-toi sur le mode louange forScore » : la
  pastille qui remplaçait « Je joue » et la question sur la couleur des icônes sont retirées ; la commande unique devient
  le popover « Je joue » de FS-C enrichi de la disposition ; Lettres | Chiffres dans Outils ; rond « Idées » dans
  « Sur la page » ; « Toutes mes setlists » en tête du menu Setlist. Reprise de la planche lancée (un maquettiste).
- 12/11/2026 : planche reprise et republiée (même artefact). Pupitre en tête de l'onglet pour qui sert, + toujours
  visible, cadres de création d'une setlist ; barre FS commune, « Je joue » = rôles + ordre + disposition ; Lettres |
  Chiffres dans Outils ; rond « Idées » après « Paroles » (FS-F) ; « Couleur des accords » (CA) dans Options ;
  « Crayon » ; « ‹ Toutes mes setlists » dans le menu Setlist ; pistes B et C réduites à l'onglet. Mesures : seul l'onglet
  diffère (A 6/6 chants et un service de la liste visibles à 390 px, B 6/6, C 5/6). Quatorze questions posées.
  **En attente des réponses de Timothée.**
- 12/11/2026 : Timothée répond « ok pour tout » : piste A et les quatorze propositions (§ Décisions). Prochaine
  étape : la spec (tranches), puis un go par tranche.
- 12/11/2026 : spec écrite (session lancée par le pilote) : § Ce qui se construit, six tranches PU-1 à PU-6 (PU-1 à PU-3
  hors mode louange, sans dépendance à FS-F ; PU-4 à PU-6 après FS-F), sept questions ouvertes avec proposition.
  Faits revérifiés sur `3a70d06` (un `chercheur`) : deux entrées PDF sur la page de setlist, pas trois ; aucune liste des
  copies hors-ligne ; `?louange=1` sans chant de départ ; lots Harmonie renumérotés (bascule H7, mode louange H8).
  En attente : lecture du pilote, réponses aux questions, puis « go pour PU-N ».
- 12/11/2026 : réponses de Timothée au pilote sur les questions ouvertes. **Question 3 tranchée, contre la
  proposition** : « La présidence et les choristes ils ont pas besoin de séparer en tout le chant et classique ils
  font ce qu'ils veulent » : le rôle Présidence ou Choriste n'impose ni ordre ni disposition, la personne garde ce
  qu'elle a choisi (PU-5 à écrire ainsi). **Question 2 : pas comprise** telle qu'elle est écrite ; le pilote la lui
  réexplique, elle reste ouverte. Questions 1, 4, 5, 6, 7 : sans réponse. Aucun go de code donné.
