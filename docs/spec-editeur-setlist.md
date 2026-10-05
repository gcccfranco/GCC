# Spec : lot U5 bis — éditeur de setlist (« Pour quel service ? » et piste 2)

Spec écrite le 04/10/2026 ; rien n'est codé. Attend la validation de Timothée, puis son go.

Lot U5 bis de `feuille-de-route.md` § 3.U, après U4 (`docs/spec-navigation-grand-ecran.md`) et U5
(`docs/spec-deux-volets.md`). Planche : https://claude.ai/artifact/1d4ZW7Y9NVHcsLB9YrrbrA, version 11 ; les écrans de la
fusion et de la piste 1, retirés en v11, sont cités d'après la version 10.

## Mots de Timothée

- « il faudrait aussi revoir l'onglet de création des setlists propose moi des idées. » (04/10/2026)
- « Faire en sorte que la version sur ordi du site prenne toute la place qu'il y a sur l'écran du responsive, pour
  tablette aussi, il faut changer la disposition des pages » (03/10/2026)
- « fait une fusion de la piste 1 et 2 pour voir » ; « "Fusionner" » (4e tour). Le 5e tour retient la piste 2.

## Ce que le code montre (04/10/2026)

- **Un seul éditeur**, création et modification : `SetlistForm` (`src/components/setlists/SetlistForm.tsx:84`),
  ouvert par `/setlists/new` (`src/app/setlists/new/CreateSetlistClient.tsx:52`) et `/setlists/{id}/edit`
  (`src/app/setlists/[id]/edit/EditSetlistClient.tsx:36-46`, `:81`). Une colonne `max-w-2xl` (`:570`) : la carte
  « Informations » d'abord (`:573-736`), les chants dessous (`:738-903`), barre du bas « Publier » ou « Terminé » (`:911-938`).
- **Enregistrement** : en création, brouillon invisible (`isDraft`) dès qu'il y a un titre et une catégorie (`:254-281`),
  **supprimé quand on quitte la page** sans publier (`:136-145`) ; en modification, envoi ~2 s après chaque changement (`:325-329`)
  et historique (`:311-315`). Champs obligatoires : titre, date, présidence, catégorie (`:223-229`).
- **Planning** : présidences de la catégorie lues par `loadPlanningData()` et `setlistSeances()` (`:150-171`) ; choisir une
  présidence pose la date de sa prochaine séance (`:199-214`) ; titre automatique « Catégorie JJ/MM [Soir] » (`:189-195`).
  `setlistSeances` (`src/lib/planning/names.ts:331-361`) donne catégorie, date, moment (Campus), présidence (1er nom de la
  case). La grille de l'app ne s'y mêle qu'avec l'interrupteur (`src/lib/planning/sheets.ts:10`), retiré en fin de chantier.
- **Services, setlists, droits** : « Mes services » apparie setlist et service par date et catégorie, Campus par moment puis
  présidence (`src/app/mes-services/page.tsx:107-133`) ; `getSetlists()` lit toutes les setlists, sans privées ni brouillons
  (`src/lib/firebase/setlists.ts:137-155`) ; catégories proposées = `creatableCategories`, toutes pour un admin
  (`SetlistForm.tsx:510-520`, `src/lib/access.ts:243-247`). Aucune règle Firestore ne dépend de l'éditeur (`firestore.rules:232-252`).
- **Recherche des chants** : Fuse sur titre, pinyin, artiste ; **les chants pris en sont retirés** ; 20 résultats au plus
  (`SetlistForm.tsx:355-382`) ; déplier un résultat montre les noms des sections (`:813-850`). Ajout **en fin de liste**, dans
  la tonalité recommandée (`:387-394`).
- **Réglages d'un chant**, dépliés dans sa ligne : tonalité en `<select>` « Tonalité de … » (`SetlistFormRows.tsx:832-845`),
  partition 简谱 (`:846-860`), note du chant (`:822-828`), « Structure » (`:861-875`) qui ouvre `SectionStructureEditor`
  (`:324-451` : « + section », « + Dernière phrase », pastilles à glisser) et, par section, Note · Nuance · Transition · 升调
  (`:201-311`). Une transition se déplie dans la liste (`:1206-1269`), ajoutée en fin (`SetlistForm.tsx:396-398`).
- **Fusion** : mode « Sélectionner » (`SetlistForm.tsx:751-781`) puis `mergeSongs` (`:443-455`) : chants seuls cochés, ordre
  de la liste, à la place du premier ; fusions et transitions exclues (`:521`). `FusionRow` (`SetlistFormRows.tsx:1059-1202`) :
  « Mélanger », « Voir les chants », « Défusionner » ; par chant, tonalité, structure, Dp et Note · Nuance · 升调, **sans
  transition** (`:903-953`). Un chant fusionné perd note, transitions de section et choix 简谱 (`buildSetlistItems.ts:25-47`).
- **Défaut trouvé** : `FormItem` ne porte pas `jianpuChords` (`src/lib/setlist/formItems.ts:19-34`), `buildSetlistItems` ne
  l'écrit pas et `updateSetlist` réécrit `items` en entier (`setlists.ts:268-292`) : un changement fait dans l'éditeur **efface
  les accords retouchés sur un scan 简谱** par le mode Adapter (`src/types/setList.ts:74`, `SetlistDetailClient.tsx:600-607`).
- **Duplication** : `duplicateSetlist` crée une copie **privée**, mêmes date, présidence et catégorie (`setlists.ts:321-341`),
  ouverte dans « Modifier » (`src/app/setlists/[id]/SetlistDetailClient.tsx:412-425`), droit `canDuplicateSetlist`
  (`access.ts:260-267`). Le lien de présentation est sur la page de la setlist (`:1250`), pas dans l'éditeur.
- **Index des chants** (`public/songs-index.json`) : 378 chants, 186 FR, 192 中文 ; thème pour 186 FR sur 186, 61 中文 sur 192 ;
  tempo pour 191 中文 sur 192, 39 FR sur 186 (groupés vers 60–80 et 120+) ; **pas de paroles** (`src/lib/api/songs.ts:12-21`).
  Déjà là : filtres de la page Chants (`SongListClient.tsx:101-146`), feuilles `Drawer` (vaul, `src/components/ui/drawer.tsx:4`),
  `@dnd-kit` sans capteur clavier (`src/lib/dnd/sensors.ts:4-12`), tonalités `keyOptions` (`src/lib/transpose.ts:268-294`).

## Décisions de Timothée — à ne pas rouvrir

| Date | Décision |
| --- | --- |
| 13/09/2026 | Ajouts et retraits de fonctionnalités validés par Timothée avant d'être faits. |
| 14/09/2026 | Page unique, enregistrement automatique ; un seul bouton « Publier » en création, « Terminé » en modification (`spec-setlist.md`). |
| 14/09/2026 | Un chant ajouté démarre dans sa tonalité recommandée (`tonalites-recommandees.md`). |
| 17/09/2026 | Historique avec avant / après des structures, de la liste des chants et des notes (`spec-historique-avant-apres.md`). |
| 20/09/2026 | Boutons pleins en encre ; couleur du culte quand l'écran lui appartient (`spec-look.md`). |
| 01/10/2026 | Dernière phrase sur chaque chant d'une fusion (`spec-fusions-dp.md`). |
| 03/10/2026 | La création de setlist reste dans l'App (assemblée), pas dans le Back-Office. |
| 04/10/2026 | Entrée **« Pour quel service ? »** : les prochains services sans setlist d'après le planning, préremplis ; « Autre setlist » ; « Repartir d'une setlist passée » = la duplication existante. |
| 04/10/2026 | **Piste 2** : la setlist à gauche (liste courte), les réglages du chant à droite (tonalité, structure, notes de section, fusion…), la bibliothèque qui s'ouvre à droite ; feuilles sur téléphone et tablette. Pistes 1, 3 et leur fusion écartées. |
| 04/10/2026 | Les chants passent avant le formulaire. Pas de « joué le … » : les données de jeu restent aux admins. |
| 04/10/2026 | **« Fusionner »** remplace le mode « Sélectionner » et ouvre le choix des chants à fusionner (pas d'office le suivant). |
| 04/10/2026 | Filtres langue, thème, tempo ; chants pris gardés dans la recherche, marqués « Dans la setlist » ; aperçu des premières lignes ; « + » entre deux chants sur ordinateur. |
| 04/10/2026 | Tablette paysage : barre latérale toujours réduite. Tout part en ligne à la fin du chantier (retrait de `BACK_OFFICE`). |

## Décisions proposées ici

| # | Proposition | Raison lue dans le code |
| --- | --- | --- |
| Q1 | **« Fusionner » commence dans les réglages du chant, là seulement** (planche : à côté de « Retirer »). Il ouvre le choix : les autres chants seuls de la setlist, le chant de départ coché d'office ; « Fusionner (n) » place la fusion à l'endroit du premier coché, dans l'ordre de la setlist. | Reprend `mergeSongs` (`SetlistForm.tsx:443-455`) et `selectableItems` (`:521`) : une fusion ne s'agrandit pas (« Défusionner », puis refusionner). La liste reste courte : ni cases ni mode à part. |
| Q2 | **Plus de barre latérale réduite d'office dans l'éditeur** : la tranche N5 de U4 n'est pas à construire. La setlist prend la largeur de l'éditeur moins 672 px, bornée entre 400 et 520 px ; les réglages, le reste. | C'est le partage des deux écrans de la planche (520 + 672 à 1 440 px, 440 + 672 sur l'iPad paysage) ; à 1 280 px barre dépliée, 400 + 632 = 1 032 px, tout tient (mesures ci-dessous). La réduction d'office servait aux trois colonnes de la fusion (340 + 440 + réglages). |
| Q3 | **« Pour quel service ? »** : séances de `setlistSeances` d'aujourd'hui à J+27 (4 semaines), dans les catégories où la personne peut créer, sans setlist partagée publiée de même catégorie et date (Campus : même moment, sinon même présidence) ; triées par date puis dans l'ordre du planning. « Préparer » remplit catégorie, date, moment, présidence et titre automatique. | Même source que les présidences d'aujourd'hui (`SetlistForm.tsx:150-171`), même appariement que « Mes services » (`mes-services/page.tsx:107-133`), `getSetlists()` (`setlists.ts:137-155`). Pas de filtre de trimestre publié : le formulaire montre déjà toutes les présidences de la catégorie. |
| Q4 | En création, **le brouillon part au premier changement** (un chant, un champ), plus au préremplissage. | Il part dès titre + catégorie (`:254-281`) : ouvrir « Préparer » puis fermer l'onglet laisserait un brouillon orphelin, le nettoyage ne jouant qu'en quittant la page dans l'app (`:136-145`). |
| Q5 | **Le formulaire devient l'en-tête de la colonne setlist** : titre modifiable (crayon), puces Catégorie · Date (+ Matin / Soir au Campus) · Présidence (liste du planning ou « Autre ») · Visibilité, ligne « Notes pour l'équipe ». Règles inchangées. Le lien de présentation reste sur la page de la setlist. | Les règles de `SetlistForm.tsx:181-229` restent ; seule la carte `:573-736` se resserre. Lecture de « les chants passent avant » : on arrive prérempli, la liste est le corps de la page. |
| Q6 | **Tablette paysage = deux colonnes** comme l'ordinateur (barre réduite) ; feuilles sur téléphone et tablette portrait. Sous 806 px de largeur d'éditeur (400 + 406), il passe en feuilles : c'est le cas d'un ordinateur de 1 024 à 1 053 px, barre dépliée. | Dispositions de U4 (Q1) : une tablette paysage a au moins 1 024 px, soit 956 px d'éditeur ; la planche v11 la dessine en deux colonnes. La tablette portrait suit le modèle du téléphone. |
| Q7 | **« Modifier »** (`/setlists/{id}/edit`) = le même éditeur : pas d'entrée « Pour quel service ? », « Terminé » au lieu de « Publier », premier élément choisi à l'ouverture. | Un seul composant à deux modes (`SetlistForm`, `mode`) ; U5 garde la page « Modifier ». |
| Q8 | **Bibliothèque** : sur grand écran, elle prend la place des réglages (« Terminé », Échap ou un élément touché dans la liste les rendent), ouverte d'office sur une setlist vide ; « Ajouter des chants » ajoute à la fin, le « + » entre deux éléments à cet endroit, les ajouts suivants à la suite. Un chant pris porte « Dans la setlist » (« Ajouté » s'il vient d'être ajouté), sans « + ». Pas de glisser depuis la bibliothèque. | Ajout en fin aujourd'hui (`:387-394`) ; jamais deux fois le même chant (`:368-371`), versions perso et historique se rangent par chant. Glisser pour ajouter était la piste 1. |
| Q9 | **Transition** : la toucher ouvre ses réglages (texte, « Retirer ») dans le volet ou la feuille, comme un chant. | Elle se déplie aujourd'hui dans la liste (`SetlistFormRows.tsx:1206-1269`) : la liste doit rester courte. |
| Q10 | **« Voir la partition »** (réglages, aperçu) ouvre la page du chant **dans un nouvel onglet**, dans la tonalité choisie. | Quitter la page de création supprime le brouillon (`SetlistForm.tsx:136-145`). |
| Q11 | **Filtres** : langue (Tous · FR · 中文), thème (`content/themes.json`, comme la page Chants), tempo en trois tranches (Lent < 90, Modéré 90–119, Rapide ≥ 120 ; un chant sans tempo disparaît quand un tempo est choisi). Recherche titre, pinyin, artiste, sans limite de 20. | `SongListClient.tsx:101-146` ; tempos de l'index groupés vers 60–80 et 120+ ; limite actuelle `SetlistForm.tsx:379`. |
| Q12 | **Aperçu** : toucher un titre déplie la structure et les deux premières lignes chantées, accords dans la tonalité où le chant serait ajouté, sans pinyin ni 简谱 ; chargé à la demande. | L'index n'a pas les paroles : `/api/song/[slug]` (`src/lib/api/songs.ts:12-21`), mis en cache par le service worker. |
| Q13 | **Réordonner au clavier** les chants et les pastilles. | Doigt et souris seulement (`sensors.ts:4-12`) ; le capteur clavier est dans `@dnd-kit/core`, déjà installé. |
| Q14 | **« Repartir d'une setlist passée »** : liste des setlists passées que la personne voit et peut dupliquer, la plus récente d'abord, recherche, bouton « Reprendre » ; la copie est celle d'aujourd'hui, ouverte dans « Modifier ». | `duplicateSetlist` (`setlists.ts:321-341`), `canDuplicateSetlist`, enchaînement de `SetlistDetailClient.tsx:412-425`. |

**Mesures (Q2, Q6)**, sur la planche : barre 248 px dépliée, 68 px réduite (comme U4) ; tonalités 12 × 40 + 11 × 5 = 535 px,
plus 2 × 36 de marge = 607 px ; ligne de setlist ≈ 380 px (au-delà de 8 pastilles, elles passent à la ligne) ; ligne
« Par section » la plus longue ≈ 546 px (au-delà, les étiquettes passent dessous, comme sur téléphone).

| Fenêtre | Barre latérale | Pour l'éditeur | Setlist | Réglages | 12 tonalités sur une ligne |
| --- | --- | --- | --- | --- | --- |
| 1 440 | dépliée | 1 192 | 520 | 672 | oui (la planche) |
| 1 280 | dépliée | 1 032 | 400 | 632 | oui |
| 1 280 | dépliée, setlist à 520 comme la planche | 1 032 | 520 | 512 | non (deux lignes) |
| 1 280 | réduite | 1 212 | 520 | 692 | oui |
| 1 180 (iPad paysage de la planche v11) | réduite | 1 112 | 440 | 672 | oui (la planche) |
| 1 080 × 810 (projet `tablette-paysage` de U4) | réduite | 1 012 | 400 | 612 | oui |
| 1 024 (plus petite tablette paysage) | réduite | 956 | 400 | 556 | non (deux lignes) |
| 1 024 (ordinateur) | dépliée | 776 | — | — | feuilles (moins de 806) |

## Objectif

Préparer une setlist part du planning : on choisit le service, le reste est déjà rempli, on passe aux chants. La setlist
reste une liste courte, chaque élément a ses réglages dans un volet (à droite sur grand écran, en feuille sur téléphone et
tablette portrait), la bibliothèque s'ouvre au même endroit ; on choisit les chants à fusionner. Rien ne se perd.

**Réussite** : jeudi 08/10/2026, une musicienne du Culte Franco ouvre « Nouvelle setlist ». « Pour quel service ? »
propose le Culte Franco des 18/10, 25/10 et 01/11 (le 11/10 a sa setlist), présidence lue au planning. « Préparer » (18/10)
ouvre l'éditeur prérempli ; rien n'est écrit tant qu'elle ne touche à rien. Sur ordinateur (1 280 px, barre dépliée), la
bibliothèque est ouverte à droite : elle filtre 中文, déplie l'aperçu de 一生爱你 (deux lignes, accords), l'ajoute, revient à
« Tous », cherche « Abba » et ajoute Abba Père. Elle touche Abba Père dans la liste : ses réglages remplacent la
bibliothèque, les 12 tonalités sur une ligne ; elle passe de A à B et retire le pont. « Fusionner » : elle coche 一生爱你, la
fusion remplace les deux chants. « Publier » : la setlist s'ouvre, l'historique dit « A créé la setlist », « Pour quel
service ? » ne propose plus le 18/10. Même parcours sur téléphone et tablette portrait (feuilles) et tablette paysage.

## Modèle

Aucun champ nouveau : l'éditeur écrit toujours par `buildSetlistItems`, donc historique, avant / après, versions perso
et rendus ne bougent pas. Aucune règle Firestore à publier, aucune dépendance npm nouvelle.

```ts
// src/lib/setlist/prochainsServices.ts
export function prochainsServicesSansSetlist(
  seances: SetlistSeance[],                                             // setlistSeances(loadPlanningData())
  setlists: Pick<FSSetlist, "category" | "date" | "moment" | "leader">[], // getSetlists() : partagées, publiées
  categories: string[],                                                 // creatableCategories(profile)
  aujourdhui: string,                                                   // AAAA-MM-JJ, heure locale
  jours?: number,                                                       // 28
): SetlistSeance[];

// src/lib/setlist/bibliotheque.ts
export type Tempo = "lent" | "modere" | "rapide";
export interface FiltresBibliotheque { recherche: string; langue: "tous" | "fr" | "zh"; theme: string | null; tempo: Tempo | null }
export function trancheDeTempo(bpm: number | null): Tempo | null;
export function chantsDeLaBibliotheque(songs: SongIndexEntry[], f: FiltresBibliotheque): SongIndexEntry[];

// src/lib/setlist/formItems.ts (ajouts)
export function insererA(items: FormListItem[], index: number, nouveau: FormListItem): FormListItem[];
export function fusionner(items: FormListItem[], uids: string[]): FormListItem[]; // = mergeSongs d'aujourd'hui
```

| URL | Écran |
| --- | --- |
| `/setlists/new` | « Pour quel service ? » |
| `/setlists/new?cat=Culte%20Francophone&date=2026-10-18` (+ `&moment=soir`) | éditeur prérempli ; présidence relue au planning ; paramètre invalide ou catégorie non permise = ignoré |
| `/setlists/new?autre=1` | éditeur vide (« Autre setlist ») |
| `/setlists/new?depuis=passee` | setlists passées → duplication → `/setlists/{id}/edit` |
| `/setlists/{id}/edit` | inchangée : même éditeur, mode modification |

## Écrans

**« Pour quel service ? »**
- Téléphone : `creer-pour-quel-service`, tel quel : cartes (catégorie et sa couleur gelée, « Dimanche 18 octobre », « · Soir »
  au Campus, « Présidence : … » ou « à définir », « Préparer » en encre), puis « Autre setlist » et « Repartir d'une setlist passée ».
- Tablette et ordinateur (*absent de la planche*) : même contenu, cartes en grille (2 colonnes en tablette portrait, 3 au-delà).
- Vide : « Aucun service à venir sans setlist dans tes catégories. » ; planning illisible : « Le planning n'a pas pu être
  lu. » Les deux autres entrées restent : la création ne dépend jamais du planning.
- Setlists passées (Q14, *absent*) : lignes de la liste des setlists (`SetlistCard`), « Reprendre » par ligne.

**Éditeur, ordinateur** (`creer-piste2-ordinateur`)
- Colonne gauche : « Setlists › Nouvelle setlist » (« Modifier la setlist » en modification), titre et crayon, puces,
  « Notes pour l'équipe », la liste, « Ajouter des chants » (encre) et « + Transition » ; en bas le repère (« Brouillon
  enregistré », « Enregistré ») et « Publier » à la couleur du culte (question 9), ou « Terminé » en modification.
- Ligne : poignée, numéro, titre (pinyin, étiquette 简谱), artiste, pastilles de structure, note du chant en italique,
  `KeyPill` avec « orig. X », chevron ; la ligne choisie est en encre (`aria-current`) ; transition en pointillé ambre ;
  fusion = une ligne « A / B ».
- « + » entre deux éléments (et avant le premier) : au survol ou au focus, une ligne bleue « ⊕ Insérer ici », visible tant
  que la bibliothèque est ouverte. *Repris de `creer-fusion-ordinateur` (v10), car le « + » entre deux chants est retenu.*
- Volet de droite, selon l'élément choisi :
  - **chant** : « Réglages du chant », « n · Titre », artiste et sections, « Voir la partition » ; Tonalité (boutons de
    `keyOptions`, la planche écrit C#, le code Db ; « orig. » et « reco. » dessous ; l'origine écrit `keyOverride: null`) ;
    **Partition 简谱 / Paroles** pour un chant à scan (*absent de la planche, existe aujourd'hui*) ; Structure (pastilles à
    glisser ; toucher une pastille la sélectionne, ✕ la retire ; « + section », « + Dernière phrase ») ; Par section : Note ·
    Nuance · Transition · 升调, l'éditeur d'aujourd'hui s'ouvre sous la ligne ; Note du chant ; « Fusionner », « Retirer ».
    **La mention « avec le suivant : … », encore sur les écrans piste 2 de la v11, est retirée** (5e tour) : le bouton seul.
  - **transition** (*absent*) : « Transition », le texte, « Retirer ».
  - **fusion** (*absent*) : par chant, Tonalité, Structure (Dp compris), Par section (Note · Nuance · 升调) ; « Mélanger » et
    le mélange ; « Défusionner », « Retirer ».
  - **choix des chants à fusionner** (*absent*) : « Fusionner Abba Père avec… », le chant de départ coché en tête, les autres
    chants seuls avec une case (numéro, titre, tonalité), la ligne de la question 7, « Annuler » et « Fusionner (n) » (encre,
    inactif tant qu'aucun autre chant n'est coché). « Fusionner » n'apparaît que s'il reste un autre chant seul.
  - **bibliothèque** (*repris de `creer-fusion-ordinateur` et `creer-piste1-ordinateur`, v10*) : « Ajouter des chants », « Terminé » ;
    recherche ; pilules Tous · FR · 中文 · Thèmes ▾ · Tempo ▾ ; compteur ; ligne titre, artiste, `KeyPill` (« reco. »), « + »
    (encre) ou « ✓ Dans la setlist » / « ✓ Ajouté » ; toucher le titre déplie l'aperçu (pastilles, deux lignes, « Voir la
    partition »). « Glisse un chant dans la setlist, ou touche + » devient « Touche + pour ajouter, le titre pour un aperçu ».
- Les deux colonnes défilent chacune ; le bas de la colonne gauche reste visible (à 720 px de haut, le volet défile).

**Tablette paysage** (`creer-piste2-ipad-paysage`, v11) : comme l'ordinateur, barre réduite, sans « + » entre deux chants
(réservé à la disposition ordinateur de U4).

**Téléphone**
- Liste : *`creer-fusion-telephone` (v10), repris : sa liste est celle de la piste 2* : « ‹ Nouvelle setlist », titre,
  puces, notes, liste, « Toucher un chant ouvre ses réglages ; la poignée change l'ordre. », « + Transition » sous la liste
  (*absent de la planche*) ; barre du bas : repère, « Ajouter des chants », « Publier ».
- Réglages : `creer-piste2-telephone`, feuille presque pleine hauteur, « OK ». Le choix des chants à fusionner remplace le
  contenu de la même feuille (« ‹ Retour ») ; la Dernière phrase s'ouvre par-dessus (feuille imbriquée).
- Bibliothèque : *`creer-fusion-telephone-ajouter` (v10), repris* : feuille, « N chants dans la setlist », « Terminé ».

**Tablette portrait** : `creer-piste2-tablette` ; la liste en grand, réglages et bibliothèque en feuilles comme sur téléphone.

**Partout** : feuille = dialogue titré (poignée, glisser vers le bas, voile, Échap), focus dedans puis rendu à la ligne ;
mouvement réduit = fondu ; tonalités = groupe radio « Tonalité de <titre> » ; « Insérer ici, après <titre> » ; FR et 中文.

## Ce qui sera construit

Après U4 et U5, dont l'éditeur reprend la disposition. À chaque tranche, « Nouvelle setlist → service → chants → Publier »
marche sur les trois appareils : T1 ne touche aucun écran, T2 garde l'éditeur actuel, T3 change les grands écrans, T4 les
petits, T5 la seule bibliothèque.

1. **T1 — Logique pure.** `prochainsServices.ts`, `bibliotheque.ts`, `insererA` et `fusionner` (extrait de `mergeSongs`) ;
   `jianpuChords` reconduit par `buildFormItems` et `buildSetlistItems` si la question 6 dit oui. Vérification : tests purs ;
   la suite de l'éditeur reste verte sans retouche.
2. **T2 — « Pour quel service ? ».** Page d'entrée (`src/app/setlists/new/`), éditeur actuel prérempli par l'URL, « Autre
   setlist », setlists passées et duplication, brouillon au premier changement (Q4), FR et 中文. Vérification : la création
   passe par l'entrée sur les trois appareils ; les tests qui ouvraient `/setlists/new` passent par `?autre=1`.
3. **T3 — Piste 2, ordinateur et tablette paysage.** En-tête compact, liste courte, volet (chant, transition, fusion, choix à
   fusionner, bibliothèque avec recherche, « Dans la setlist », « Ajouté ») ; sous-éditeurs d'aujourd'hui remis au dessin.
   Petits écrans : page actuelle. Vérification : mise en page, tests existants sur ordinateur.
4. **T4 — Piste 2, téléphone et tablette portrait.** Feuilles `Drawer` (réglages, choix à fusionner, bibliothèque), barre du
   bas ; l'ancienne page, « Sélectionner » et leurs textes devenus inutiles disparaissent. Vérification : suite complète.
5. **T5 — Bibliothèque complète.** Filtres langue, thème, tempo ; aperçu chargé à la demande ; « + » entre deux éléments sur
   ordinateur. Vérification : tests de la bibliothèque, trois appareils.

## Tests

Playwright, écrits avant chaque tranche et vus rouges ; session et Firestore simulés (`tests/helpers/fakeSession.ts`),
planning en CSV simulé, horloge fixée (comme `planning-campus.spec.ts`) ; Abba Père (FR), 一生爱你 (ZH), un chant ZH à scan.
Trois appareils, **plus les projets `tablette-paysage` et `ordinateur-1440` de U4** (Q16) pour `setlist-editeur-piste2.spec.ts`,
ajouté à leur `testMatch` (à défaut, `test.use` aux mêmes tailles). Captures regardées à l'œil, comparées à la planche.

- `tests/setlist-pour-quel-service.spec.ts` : (pur) 4 semaines, aujourd'hui compris ; seules les catégories données ; un
  service avec setlist partagée publiée disparaît, pas avec un brouillon ou une privée ; Campus matin / soir ; tri. (page)
  cartes au 08/10 ; « Préparer » remplit catégorie, date, présidence, titre ; aucune écriture avant le premier changement,
  brouillon après le premier chant ; « Autre setlist » ; setlists passées → copie privée → « Modifier » ; planning vide ; 中文.
- `tests/setlist-editeur-piste2.spec.ts` : à 1 280 barre dépliée, deux colonnes, volet ≥ 610 px, 12 tonalités sur une ligne ;
  tablette paysage, deux colonnes, barre réduite ; téléphone et tablette portrait, feuille au toucher, « OK » ferme et rend
  le focus ; réglages FR (tonalité, structure, note de section, Dp) et ZH (interrupteur 简谱) écrits comme aujourd'hui ;
  transition ; « Retirer » ; « Voir la partition » dans un nouvel onglet ; `jianpuChords` gardés (question 6).
- `tests/setlist-fusionner.spec.ts` : choix ouvert depuis les réglages, chant de départ coché ; ni transition ni fusion
  proposées ; deux chants non voisins → la fusion prend la place du premier, ordre gardé ; « Annuler » ne change rien ;
  réglages de la fusion (tonalité par chant, Dp, « Mélanger », « Défusionner ») ; plus aucun « Sélectionner ».
- `tests/setlist-bibliotheque.spec.ts` : recherche titre, pinyin, artiste ; « Dans la setlist » sans « + » ; « Ajouté » ;
  tonalité recommandée à l'ajout ; FR / 中文, thème, tempo (chant sans tempo absent) ; aperçu deux lignes avec accords (FR),
  sans pinyin (ZH) ; sur ordinateur, « + » entre deux chants insère à cet endroit, deux ajouts gardent leur ordre ; compteur.

Tests existants touchés, sélecteurs seulement (leurs vérifications des écritures et de l'historique restent mot pour mot :
le modèle ne bouge pas) : `setlist-editor.spec.ts` (6), `setlist-history.spec.ts` (16 qui ouvrent l'éditeur : `openEditor`,
« Structure », `sectionRow`, `<select>` de tonalité, champs de note, lignes du mélange), `coup-d-oeil.spec.ts` (1, l. 276),
`fusions-dp.spec.ts` (2, l. 212 et 229), `recommended-key.spec.ts` (1, l. 67).

## Hors périmètre

- **Toujours** : page unique, enregistrement automatique, « Publier » / « Terminé » ; tonalité recommandée à l'ajout ; écriture
  par `buildSetlistItems` ; toutes les fonctions d'aujourd'hui (Dp, partition 简谱, mélange, transitions, nuances, 升调,
  présidence « Autre », Campus matin / soir, visibilité) ; FR + 中文 ; un chant FR + un chant ZH ; 3 appareils + tablette paysage.
- **Demander avant** : un champ nouveau dans Firestore ; changer la duplication (copie privée à l'ancienne date) ; garder ou
  confirmer un brouillon abandonné ; glisser depuis la bibliothèque ; ajouter deux fois un chant ; « joué le … » ou toute
  donnée de jeu ; le lien de présentation dans l'éditeur ; une dépendance npm ; compléter thèmes et tempos du corpus.
- **Jamais** : écrire dans le Firestore de production ; toucher aux couleurs gelées (`serviceColors.ts`, accords, sections,
  简谱) ; mettre l'éditeur derrière `BACK_OFFICE` ; des retouches positionnelles du contenu (`contentOverride` reste
  reconduit tel quel) ; remettre des étapes.

## Questions ouvertes

1. Titre automatique : garder la règle du code, « Culte Francophone 18/10 » (`SetlistForm.tsx:189-195`), plutôt que
   « Culte du 18 octobre » dessiné sur la planche ? **Recommandation : oui**, garder (titres déjà écrits ainsi, traduits par la catégorie).
2. Admins : seulement les services des catégories de leur profil, le reste par « Autre setlist » ? **Oui** (sinon Culte, groupes, EDD…).
3. Horizon de « Pour quel service ? » : 4 semaines, aujourd'hui compris ? **Oui.**
4. Barre latérale : abandonner la réduction d'office sous 1 440 px dans l'éditeur (Q2, mesures) ? **Oui** ; N5 de U4 tombe.
5. Tablette paysage en deux colonnes, feuilles pour le téléphone et la tablette portrait (Q6, ma lecture des « feuilles ») ? **Oui.**
6. Défaut trouvé : tout enregistrement de l'éditeur efface les accords retouchés sur un scan 简谱 (`jianpuChords`). Les
   reconduire dès T1, comme `contentOverride` ? **Oui.**
7. Fusionner : une fusion n'a ni note du chant, ni transitions de section, ni choix 简谱 ; ils se perdent sans rien dire.
   L'écrire d'une ligne dans le choix des chants, sans changer le modèle ? **Oui.**
8. Filtres : 147 chants FR sur 186 n'ont pas de tempo, 131 chants 中文 sur 192 pas de thème. Les garder tels quels et
   compléter le corpus à part ? **Oui.**
9. « Publier » à la couleur du culte dès que la catégorie est connue (planche), alors que `spec-look.md` (l. 281-284) range
   « nouvelle setlist » parmi les écrans en encre ? **Oui** : avec « Pour quel service ? », l'écran appartient au culte.
10. « + Setlist » sur la page du chant (planche `Main`, `tablette-portrait-chant`), renvoyé ici par `spec-deux-volets.md`
    (question 5) : aucune décision ne le décrit, c'est une fonction nouvelle. Hors de ce lot ? **Oui**, à spécifier à part.

## Commandes

```bash
npm test -- tests/setlist-pour-quel-service.spec.ts tests/setlist-editeur-piste2.spec.ts tests/setlist-fusionner.spec.ts tests/setlist-bibliotheque.spec.ts
npm test -- tests/setlist-editor.spec.ts tests/setlist-history.spec.ts tests/coup-d-oeil.spec.ts tests/fusions-dp.spec.ts tests/recommended-key.spec.ts
npx tsc --noEmit
npm run lint
npm test   # suite complète avant de rendre la main ; PW_PORT=3000 si un next dev tourne déjà
```

## Avancement

Spec validée, go de code du 04/10/2026 (redit le 05/10/2026) ; les questions ouvertes prennent leur recommandation.
Branche `lot/u5bis-editeur-setlist`, rien de poussé.

**05/10/2026 — T1 faite** (logique pure ; aucun écran ne change).

- Correctif `jianpuChords` (question 6), commit `5b4c070` : `FormItem` porte `jianpuChords`, relus par `buildFormItems`
  et réécrits par `buildSetlistItems` (`src/lib/setlist/formItems.ts`, `buildSetlistItems.ts`), comme `contentOverride`.
  « Modifier » une setlist n'efface plus les accords retouchés sur un scan 简谱. Vu rouge (`Received: undefined`), puis vert.
- Logique pure, commit suivant : `src/lib/setlist/prochainsServices.ts` (`prochainsServicesSansSetlist`),
  `src/lib/setlist/bibliotheque.ts` (`trancheDeTempo`, `chantsDeLaBibliotheque`), `insererA` et `fusionner` dans
  `formItems.ts` ; `mergeSongs` de `SetlistForm.tsx` appelle désormais `fusionner` (même comportement).
- Tests (écrits avant, vus rouges sur des bouchons, puis verts ; ordinateur, téléphone, tablette — 32 × 3) :
  `tests/setlist-pour-quel-service.spec.ts`, `tests/setlist-bibliotheque.spec.ts`, `tests/setlist-fusionner.spec.ts`
  (parties pures) et `tests/setlist-editeur-piste2.spec.ts` (`jianpuChords` : deux tests purs + « Modifier » de bout en
  bout dans l'éditeur actuel). Les tranches suivantes ajoutent leurs tests d'écran dans ces mêmes fichiers.
- Suite de l'éditeur sans retouche : `setlist-editor`, `setlist-history`, `coup-d-oeil`, `fusions-dp`,
  `recommended-key`, `harmonie-jianpu` — 246 verts sur les trois appareils. `tsc` propre, lint sans erreur (2 avertissements
  anciens de `SetlistForm.tsx`, l. 125 et 179, hors du changement).

Choix faits faute de réponse écrite :
- `prochainsServicesSansSetlist` accepte aussi `isDraft` / `isPrivate` (facultatifs) et ignore brouillons et privées : le
  test pur « pas avec un brouillon ou une privée » le demande ; `getSetlists()` les retire déjà.
- Campus : une setlist **avec** moment ne prend que son moment ; **sans** moment, elle prend la séance de même présidence
  (`normalizeName`, présidence non vide). « Mes services » retombe aussi sur la présidence quand le moment ne colle pas :
  ici non, sinon le soir d'une même présidence masquerait le matin.
- Bibliothèque sans recherche : l'ordre de l'index reçu (comme l'éditeur actuel) ; avec recherche, la pertinence de Fuse
  (mêmes clés, seuil 0,4).
- Thème = `themes.includes(slug)`, comme la page Chants. **Remarqué, non corrigé** : sur les 61 chants 中文 qui ont un thème,
  56 ne l'écrivent jamais par son slug — 43 avec le nom chinois d'un thème de `content/themes.json` (« 敬拜 » pour
  « adoration »), 13 avec des mots qui n'y sont pas (« 赞美 », « 歌唱 ») ; ni la page Chants ni la bibliothèque ne les
  trouvent par thème.
  Question du corpus (question 8 : à compléter à part).
- `fusionner` ignore les uids de transitions et de fusions ; moins de deux chants seuls : la liste est rendue telle quelle
  (même tableau). Un chant fusionné perd toujours note, transitions de section, choix 简谱 et retouches du scan
  (`FusionSong` n'a pas ces champs) : la ligne de la question 7 viendra avec l'écran du choix (T3).

**05/10/2026 — T2 faite** (« Pour quel service ? » ; l'éditeur reste celui d'aujourd'hui), commit
« feat(U5bis): T2 — « Pour quel service ? » … » sur la même branche.

- `/setlists/new` choisit son écran d'après l'URL (`src/app/setlists/new/CreateSetlistClient.tsx`) : sans paramètre,
  `PourQuelService.tsx` (cartes : catégorie dans sa couleur, « Dimanche 18 octobre », « · Soir » au Campus,
  « Présidence : … » ou « à définir », « Préparer » en encre ; une colonne sur téléphone, deux en tablette portrait, trois
  au-delà ; vide et planning illisible dits, « Autre setlist » et « Repartir d'une setlist passée » toujours là) ;
  `?cat=…&date=…(&moment=…)`, l'éditeur prérempli ; `?autre=1`, l'éditeur vide ; `?depuis=passee`, `SetlistsPassees.tsx`
  (lignes `SetlistCard`, recherche, « Reprendre » = `duplicateSetlist`, puis « Modifier »).
- `lienPreparer` et `lirePreremplissage` dans `src/lib/setlist/prochainsServices.ts` : chaque paramètre invalide est
  ignoré seul (catégorie non permise, date qui n'existe pas, moment hors Campus).
- `SetlistForm` : prop `prefill` (catégorie, date, moment, titre automatique par la règle du code, question 1) ; la
  présidence est relue au planning, dans la graphie de la liste. **Brouillon au premier changement (Q4)** : rien n'est
  écrit tant que l'état est celui du préremplissage (présidence comprise) ; ensuite, comme avant. Le menu Matin / Soir
  du Campus porte enfin un nom (« Moment »).
- FR et 中文 : bloc `setlists.entree` des deux fichiers de langue (Timothée relit le 中文).
- Tests (écrits avant, vus rouges — 9 sur 9 sur l'éditeur d'avant —, puis verts ; ordinateur, téléphone, tablette) :
  `tests/setlist-pour-quel-service.spec.ts`, 2 tests purs (`lienPreparer`, `lirePreremplissage`, écrits après le code)
  et 9 tests de page (entrée depuis « Nouvelle », « Préparer » sans écriture puis brouillon au premier chant et « Publier »
  qui retire le service, URL et catégorie non permise, Campus, « Autre setlist », setlists passées → copie privée →
  « Modifier », planning vide, 中文, une / deux / trois colonnes) ; captures regardées aux trois tailles. Les tests qui
  ouvraient `/setlists/new` passent par `?autre=1` (`setlist-editor` ×2, `setlist-history` ×1, `recommended-key` ×1).
- Vérifié : `pour-quel-service`, `setlist-editor`, `setlist-history`, `recommended-key`, `coup-d-oeil`, `fusions-dp`,
  `setlist-editeur-piste2`, `setlist-fusionner`, `setlist-bibliotheque`, `harmonie-jianpu` — 375 verts sur les trois
  appareils ; `back-office-coupe` vert ; `tsc` propre, lint sans erreur ni avertissement nouveau.

Choix faits faute de réponse écrite :
- Admins : « Pour quel service ? » ne propose que les catégories de leur profil (question 2) ; l'URL, elle, accepte
  toutes les catégories pour eux, comme le menu de l'éditeur.
- Un paramètre `cat` ou `date` présent ouvre l'éditeur, même invalide (il est alors vide de ce champ) ; sans paramètre
  utile, l'entrée. Titre automatique seulement si catégorie et date sont valides.
- Aujourd'hui = date locale du navigateur (`todayIso`, `src/lib/scene/dimanches.ts`), comme la spec le demande.
- « Repartir d'une setlist passée » : partagées **et** privées de la personne (`getMySetlists`), passées (avant
  aujourd'hui), visibles (`canSeeSetlist`) et duplicables (`canDuplicateSetlist`) ; recherche titre, présidence, date
  (comme la liste des setlists) ; « Reprendre » en gris (une ligne par setlist : l'encre partout alourdirait).
- Cartes en relief (`raised`, la règle 5C1 « ce qui se touche porte une ombre ») ; catégorie en toutes lettres
  (« Culte Francophone », comme `SetlistCard`), la planche écrit « Culte Franco ».
- Un planning qui ne se lit pas : `loadPlanningData` ne lève presque jamais (chaque feuille retombe sur vide) ; le
  message « Le planning n'a pas pu être lu. » couvre aussi un échec de lecture des setlists. Non testé (on ne sait pas
  le provoquer sans toucher au code du planning).
- Le « ← » de l'éditeur ramène toujours à la liste des setlists (T3 refait cet en-tête).

Reste : T3 (piste 2 grands écrans), T4 (feuilles téléphone et tablette portrait), T5 (bibliothèque complète).
Timothée : aucune règle Firestore à publier pour T1 ni T2 ; relire les libellés 中文 de `setlists.entree`. Le correctif
`jianpuChords` (commit à lui seul) peut partir sur `main` sur son ordre, avant le reste du lot.
