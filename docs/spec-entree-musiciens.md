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
- 12/11/2026 : **question 2, décision déléguée (pilote, 12/11)** : Timothée laisse le choix au pilote (« Tu peux donner
  ta réponse au nouveau pilote »). Retenue : **la proposition**. Changer l'ordre ou la disposition ne retire plus le
  rôle ; les ronds « Accords » et « Paroles » le retirent encore (FS-F). Motif : l'ordre et la disposition ne changent
  pas ce que le rôle montre (accords, paroles), et cela s'accorde avec la question 3 (Présidence et Choriste : le rôle
  n'impose ni ordre ni disposition). Questions 1, 4, 5, 6, 7 : toujours ouvertes ; aucun go de code.
- 12/11/2026 : **réponses de Timothée au pilote** (« 1. Non », « 3. Les chanteurs et présidences choisissent ce qu'ils
  veulent, pas besoin de leur imposer », « pour le reste fais ce qui est bon »).
  **Question 1 : non, contre la proposition** : le PDF d'un chant **reste** aux visiteurs sans compte ; PU-1 ne le
  retire qu'aux comptes connectés qui ne sont ni admins ni de l'équipe d'une setlist à venir (décision 2).
  `canExporterPdfChant` rend donc vrai sans compte. **Question 3 : confirmée** (ligne précédente) : PU-5 n'impose ni
  ordre ni disposition à Présidence et Choriste. **Questions 4, 5, 6, 7 : décisions déléguées (pilote, 12/11)**, les
  propositions sont retenues telles quelles : (4) équipe = créateur ou membre de `editeurs` ; (5) services des 14
  prochains jours, à l'ouverture de l'onglet Setlists, une fois par jour et par setlist ; (6) PU-2 code la vignette
  简谱, ses captures sombres vont au pilote pour Timothée, essai sur iPad avant la mise en ligne, elle tombe seule si
  elle ne convient pas ; (7) PU-1 à PU-3 d'abord, PU-4 à PU-6 après FS-F, jamais en même temps qu'une session dans
  `PerformanceMode.tsx`. Motif : aucune ne sort de ce que Timothée a déjà décidé, toutes se défont sans perte.
  **Plus aucune question ouverte. Aucun go de code donné** : attend « go pour le pupitre » (ou par tranche).
- 12/11/2026 : **Timothée revient sur la décision 2** (« Ah si, tout le monde [doit] avoir accès aux PDF ») : le PDF
  d'un chant reste ouvert à tous, avec ou sans compte ; `canExporterPdfChant` et la lecture « équipe d'une setlist à
  venir » (question 4) **ne se construisent pas**. Reste à confirmer par Timothée : le PDF d'une **setlist**
  (décision 1, réservé à qui peut la modifier et à la présidence) est-il ouvert à tous lui aussi ? Si oui, PU-1 tombe
  en entier. PU-1 ne part pas avant cette réponse.
- 12/11/2026 : **Timothée confirme** (« C'est juste les PDF des setlists qu'il faut enlever aux musiciens ») : la
  décision 1 tient (PDF d'une setlist réservé à qui peut la modifier et à la présidence du service) ; le PDF d'un
  chant reste à tous. **PU-1 = PDF de setlist seulement** : `canExporterPdfSetlist` et `presideLeService`, rien sur la
  page d'un chant. Plus aucune question ouverte ; attend le go de code.
- 12/11/2026 : **go de Timothée** (« Go mais regarde quand même l'ordre et où ça en est pour les autres sessions ») :
  le lot pupitre peut se coder, une session par tranche. Ordre (pilote) : les quatre places sont prises (FS-F,
  MP-3, exemples T2, comptage T3) ; PU-1 part à la première place libre (attendue : la fin du comptage T3, T4 n'ayant
  pas de go), puis PU-2, PU-3 ; PU-4 à PU-6 seulement après FS-F et jamais en même temps qu'une session dans
  `PerformanceMode.tsx` (JP-C, MP-5).
- 12/11/2026 : **PU-1 faite** (PDF réservé ; session lancée depuis la file, partie à 11 h 58 quand le comptage T4 a
  libéré sa place, MP-3 vérifiée). `canExporterPdfSetlist` et `canExporterPdfChant` (`src/lib/access.ts`, masquage
  sans miroir dans `firestore.rules`, commentaire au-dessus) ; `presideLeService` (`rolePlanning.ts`, filtre de
  `roleDuPlanning`) ; page de setlist : bouton de la barre et entrée du ⋯ seulement pour `peutPdf` ; page d'un chant :
  équipe d'une setlist à venir lue une fois (`getSetlistsPartagees`, `getMySetlists`, `getSetlistsFrom`), pas de bouton
  tant que l'auth se résout (relecture : sinon flash), un « non » n'est pas gardé (relu à la visite suivante). Sans
  compte, le PDF d'un chant reste (question 1). **Écart à la spec, noté `shortcut:`** : `getMySetlists` ne rend que
  les privées, d'où `getSetlistsFrom(today, 30)` pour le créateur d'une setlist publique (vue seulement parmi les 30
  prochaines). Fixtures de `export-pdf` et `pdf-ma-version` : le compte connecté ajouté à `editeurs` (assertions
  inchangées). Nouvelle `tests/pdf-droits.spec.ts` (Sheet simulé, chants abba-pere et 谢谢你, noms inventés) : un compte
  hors équipe doit servir ce jour-là pour ouvrir la setlist (F1), d'où les lignes du Sheet ; Sheet en panne = page
  refusée, aucun PDF. **Tests** : 6 specs × 3 appareils, 285 passés et 3 échecs de `pdf-droits` (attente
  `networkidle`) en 8,4 min ; second tour sur `pdf-droits` seule, 54/54 en 1,5 min. Un premier tour du testeur (1,1 h,
  290 échecs `page.goto /login` interrompu) est à mettre sur deux `next dev` orphelins d'un lancement coupé, pas sur la
  tranche. `tsc` et lint propres. `npm run validate` échoue hors tranche : 姐 妹 跃 (`zh-CN.json`) absents de la police,
  `python3 scripts/build-fonts.py` à relancer par la session qui les a ajoutés. Pas de `regard` : rien de nouveau à
  l'écran, des boutons existants masqués. Suite : PU-2 lancée.
- 12/11/2026 : **PU-2 faite** (bloc « Mon prochain service »). `Pupitre.tsx` en tête de l'onglet Setlists pour qui sert
  à un service relié à une setlist (`pourMoi` + `setlistDuService` + `roleDuPlanning`, rien de nouveau dans
  `accueil.ts`) : rangées au téléphone, vignettes dès la tablette (trois colonnes), volet de droite en deux volets tant
  qu'aucune setlist n'est choisie, rangée « Mon prochain service » en tête de la liste pour y revenir ; « Jouer » à
  l'encre. `?louange=1&chant=n` (lu avant le `replaceState`, borné, propositions exclues, fusions comptées comme une
  ligne) ouvre le mode louange sur la première page du chant : prop `chantInitial` (position de l'item) dans
  `PerformanceMode.tsx`, un seul effet, rien d'autre de touché. Prop `milieu` ajoutée à `EnTetePage` (entre le titre
  et les onglets). **Décisions déléguées (session, 12/11)** : (a) vignette d'un chant sans scan = la suite de ses
  sections en texte, pas un rendu de sa première page (aucun `.cho` chargé sur l'onglet ; se remplace sans toucher au
  reste) ; (b) la ligne « Tu joues … d'après le planning » pour les instruments seulement (pas « tu joues
  présidence ») ; (c) le « + » reste plein à côté de « Jouer » (critique-design proposait un contour : la spec veut le
  « + » inchangé) ; (d) le nom du service = la catégorie traduite, comme la liste. Q6 : vignette 简谱 sombre codée
  (inversée, atténuée), captures sombres tablette, ordinateur et tablette couchée envoyées à Timothée ; essai sur iPad
  avant la mise en ligne. `pages-en-grand-setlists.spec.ts` : trois tests reçoivent un compte qui ne sert pas (le
  pupitre y apparaissait, comportement voulu). Tests : `pupitre-onglet` (nouvelle, cinq projets) et voisines
  (`agencement-v18-setlists`, `pages-en-grand-setlists`, `setlist-deux-volets`, `louange-role-planning`,
  `pupitre-partitions`) : premier tour 399 passés, 8 échecs (comportement voulu, corrigé) en 12 min ; tours après
  corrections sur les specs en échec : 3 min, puis `pupitre-onglet` 77/77 (8 ignorés) en 2,6 min. `tsc`, lint,
  `npm run validate` propres (polices reconstruites, 姐 妹 跃 compris). `regard` sur 20 captures, `critique-design` sur
  quatre : retouches faites (grille, structure en texte, titres sur deux lignes, filet sous les vignettes). Les agents
  nommés n'étant pas chargés dans la session, ils ont tourné comme agents génériques avec leur fiche
  (`.claude/agents/*.md`) et leur modèle. Suite : PU-3 lancée.
- 12/11/2026 : **PU-3 faite** (gardé hors-ligne d'office). `gardeServices.ts` (nouveau) : `urlsAGarder` et
  `demanderPrecache` (la demande « precache » de `SetlistDetailClient.tsx` sortie telle quelle, mêmes adresses),
  `precacheFait` (chaque adresse dans Cache Storage, faux sans service worker qui contrôle la page), `garderServices`
  (setlists visibles des services du compte des 14 prochains jours : copie + precache, une fois par jour et par setlist,
  marque `gcc-garde-services:<uid>` effacée avec les copies ; rien hors ligne ; la marque n'est posée que si un service
  worker contrôle la page et que le manifeste 简谱 est lu). `listerCopies(uid)` dans `copieHorsLigne.ts`. Onglet
  Setlists : garde à l'ouverture, puis « Prêt hors-ligne » (已可离线使用, icône nuage coché) dans le bloc quand la copie
  **et** le cache du prochain service sont là, revérifié toutes les 3 s pendant 2 min ; rien avant. `public/sw.js`
  inchangé (`gcc-louange-v6`). **Écart de test** : sans vrai service worker en `next dev`, la spec remplace le contrôleur
  par un témoin (messages notés, `caches.match` piloté) et coupe Firestore au lieu de `context.setOffline` (les pages
  du serveur de dev ne sont pas en cache) ; le service worker réel reste à mesurer avec `scripts/rude-epreuve` (non fait
  ici). **Point préexistant noté** : le service worker plafonne un message à 200 adresses (`MAX_PRECACHE`) ; une setlist
  à très nombreux scans n'atteindrait jamais « Prêt ». Relecture : quatre corrections (intervalle après démontage,
  marque sans service worker, manifeste vide, « prêt » lié à l'id de la setlist). `regard` sur 16 captures (quatre
  dispositions, FR et 中文, clair et sombre), `critique-design` sur deux : icône à 14 px, trait 2, écart 1,5.
  Nouvelle `tests/pupitre-hors-ligne.spec.ts` (`SPECS_GRAND_ECRAN`, chants abba-pere et 一切都更新, noms inventés).
  **Tests** : `pupitre-hors-ligne`, `pupitre-onglet`, `setlist-hors-ligne` : 187 passés, 4 échecs (focus rendu à
  « Je joue » qui gardait la flèche, en grand écran) en 5,6 min ; après corrections, `pupitre-hors-ligne` et
  `pupitre-onglet` 107 passés (8 ignorés) en 3,3 min. `tsc`, lint (aucun avertissement nouveau), `npm run validate`
  propres. **PU-4 attend** : FS-F est fusionnée (`fef10377`) mais MP-5 (Crayon du mode louange) travaille encore dans
  `PerformanceMode.tsx` ; PU-4 part quand MP-5 a fini (pilote prévenu).
- 12/11/2026 : **PU-4 faite** (trois affichages renommés, disposition dans « Je joue »). Libellés fr et zh-CN
  (`setlists.detail.layout` : Tout le chant 完整顺序, Chaque section une fois 每段一次, Plan du chant 只看结构 ; guides
  `fr.json:1083`, `zh-CN.json:965`, `:1078`) ; identifiants inchangés. `PerformanceMode.tsx` : `ChoixDisposition` quitte
  Options et passe dans « Je joue », sous l'ordre, au-dessus de « Partition » (MP-5), qui reste la dernière ; Options garde
  le reste. Les segments de l'ordre passent à la ligne (« Chaque section une fois » chevauchait « Plan du chant » à la
  tablette) : `min-h-11`, `leading-tight`, `text-balance`. Douze specs suivent les nouveaux libellés ; celles qui
  cherchaient la disposition dans Options la cherchent dans « Je joue » (radiogroup `perf-disposition`, pas l'index
  global, qui tomberait sur l'ordre). Deux tests ajoutés à `louange-je-joue` (ordre des rubriques, aucun libellé qui
  déborde, 44 px et défilement au téléphone, un choix ne tourne pas la page, Options sans disposition ; 中文).
  **Décision déléguée (session PU-4, 12/11)** : pas de `regard` ni de `critique-design` : on déplace un composant
  existant, sans nouveau dessin ; captures regardées à la main sur les quatre dispositions et à 1 440 px, FR et 中文 (popover
  à la tablette couchée : il défile, `ZoneDefilante`). **Tests** : 12 specs sur 3 ou 5 projets, 1 572 passés, 3 échecs,
  175 ignorés en 71 min (`--workers=2`). Les 3 échecs, `louange-sections-uniques:769` (trait de la page 2, téléphone)
  et `setlist-g:260` (défilement rendu à 10 px près, téléphone et tablette), **échouent aussi sans PU-4** (vérifié par
  `git stash`) : ce ne sont pas des régressions, à reprendre hors lot. Après la retouche des segments : `louange-je-joue`
  ciblée, 20/20 en 1,3 min. `tsc` propre, lint sans erreur. **Leçon de durée** : 10 des 12 specs n'avaient qu'un
  sélecteur changé ; PU-5 et PU-6 ne lancent que les tests touchés (`--grep`), plus les specs entières qui changent
  vraiment. Suite : PU-5 lancée.
- 12/11/2026 : **PU-5 faite** (le rôle règle les trois ; première entrée). `ROLE_PRESETS` gagne `ordre` et
  `disposition` : Pianiste, Guitariste → Tout le chant, Classique ; Batteur → Plan du chant (disposition intacte) ;
  Présidence, Choriste → rien d'imposé (Q3), sauf retour à Tout le chant depuis Plan du chant (il cache les paroles
  que ces rôles montrent). Changer l'ordre ou la disposition ne retire plus le rôle ; les ronds Accords et Paroles le
  retirent encore (Q2) ; `roleOverridden` ne regarde plus l'ordre ; un Batteur retenu dans un autre ordre rouvre
  accords et paroles affichés. « Annuler » de la pastille RP rétablit aussi la disposition. Ordre par compte :
  `partition-layout-<uid>`, la clé d'appareil relue tant que la marque `perf-role-migre` est nulle ou celle du compte
  (`roleCompte.ts` et `dispositionPref.ts` inchangés). Première entrée : ligne « Réglé pour piano d'après le planning.
  Changer » (按排班已设为钢琴。更改) à la place de la pastille, sans animation, partie au premier tour de page,
  « Changer » ouvre « Je joue » ; largeur ajustée au texte (420 px au plus, une ligne dès la tablette).
  **Décision déléguée (session PU-5, 12/11)** : un « Aucun » déjà choisi est une réponse : le planning ne l'écrase pas
  (la ligne ne vient que si la question du rôle n'a jamais reçu de réponse). Pas de `regard` ni de `critique-design` :
  la ligne reprend la surface de la pastille RP ; captures regardées à la main sur les cinq projets, FR et 中文
  (`test-results/rp2/premiere-entree-*`). Nouvelle `tests/louange-role-regle.spec.ts` (noms inventés) ; quatre tests
  de première entrée et deux de captures dans `louange-role-planning` ; assertions de clé et de rôle suivies dans
  `coup-d-oeil` et `louange-sections-uniques`. **Tests** : `louange-role-regle`, `louange-role-planning`,
  `louange-je-joue` entières, voisines par `--grep` : 297 passés, 3 échecs (e-mail fictif à « ë » refusé par le
  formulaire, corrigé) en 19 min ; tours après correction : 3/3 puis 25/25 en 2 min. `tsc` propre, lint sans erreur,
  `npm run validate` propre. Suite : PU-6 lancée.
