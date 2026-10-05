# Spec : lot U5 — Chants et Setlist en deux volets, mode louange en 2 colonnes, setlist G

Spec écrite le 04/10/2026, validée avec le go du chantier U (04/10/2026, redit le 05/10/2026) ; les questions
ouvertes prennent leur recommandation. Ce qui est codé : « Avancement », en fin de document.

Lot U5 du chantier U (`feuille-de-route.md` § 3.U, « Suite »). Il vient après U4 (`spec-navigation-grand-ecran.md` :
dispositions, barre latérale, `--barre-laterale`, `--largeur-lecture`) et avant U5 bis (`spec-editeur-setlist.md` :
l'éditeur, que ce lot ne touche pas ; la page « Modifier » reste). Tout est côté App : rien derrière `BACK_OFFICE`.

## Mots de Timothée

> « Faire en sorte que la version sur ordi du site prenne toute la place qu'il y a sur l'écran du responsive, pour
> tablette aussi, il faut changer la disposition des pages » ; « Avant de coder quoi que ce soit j'ai besoin que tu
> me montres tous les design » (03/10/2026). « et pour les setlists, retire setlist B, C et F, propose moi autre
> choses à la place » (04/10/2026), puis le choix de G. Sur la vue partitions : « par défaut mets ordre joué » (20/09/2026).

Christelle : « comme on s'est tous habitué à certains trucs, vaut mieux pas trop changer et perdre les gens » (20/09/2026).

## Ce que le code montre (04/10/2026)

**Setlist** (`src/app/setlists/[id]/`)
- `SetlistDetailClient.tsx` : la vue est un état en mémoire, Liste par défaut (`:150`), rien dans l'adresse ; les
  partitions ne se chargent qu'au passage en Partitions ou au mode louange (`:315-318`, `:1067-1071`). Barre fixe sur
  une ligne (`:945-1210`) : Retour, bascule (boutons « Liste » et « Partitions »), en Partitions seulement Adapter, Ma
  version, Accords, Pinyin ; Mode louange ; menu ⋯ (Affichage à trois positions, couleurs par section, 简谱, Modifier,
  Prévenir l'équipe, Dupliquer, Partager, PDF, Supprimer). En-tête en colonne de 42rem (`:1212-1264`) : titre, date,
  historique, langue, catégorie, présidence, « Vous pouvez modifier », présentation, notes. PDF : la vue liste
  télécharge le PDF liste sans fenêtre, la vue partitions ouvre « Quel PDF ? » (`:1188` ; `PdfChoiceSheet.tsx:40`).
- `ListView.tsx:254-343` : numéro, titre et pinyin, « 谱 简谱 », artiste, structure abrégée (transitions,
  modulations), notes, tonalité et « orig. ». Seul le titre mène à la page du chant, réglages de la setlist en JSON
  (`songHref`, `:51-79`, `:259-262`) : c'est là qu'on choisit sa tonalité perso (`SongDetailClient.tsx:201-224`).
- `PartitionView.tsx` : `data-outline-item` par chant (`:500`) ; « Copier les paroles » seulement en suivant la
  présidence (`:380`, `:416`) ; Idées d'harmonie, sélecteur de version ; aucun lien vers la page du chant.
- `SetlistOutline.tsx` (« Déroulé ») : fixe à gauche de la colonne dès 1 280 px (`:105`), noms complets repliés
  (« Refrain ×2 », `:49-58`), surlignage par une ligne de lecture, saut par `window.scrollTo` (`:26-29`, `:64-99`) ;
  il suit ma structure (`stageItems`, `SetlistDetailClient.tsx:925-926`).

**Mode louange** (`src/components/performance/PerformanceMode.tsx`)
- Calque plein écran par-dessus la setlist (`:909`), ouvert au premier chant (`SetlistDetailClient.tsx:1495-1506`),
  mis en page à `largeur ÷ taille du texte` (`:609-612`).
- Une colonne ; chaque chant ouvre une page ; remplissage glouton, jamais de section coupée, page réduite si un bloc
  dépasse (`:206-222`, `:642-655`). Scan 简谱 : une page d'écran à pleine hauteur (`:226-253`). Vue structure : un
  chant par page, 1 ou 2 colonnes équilibrées (`:260-305`) ; le rendu en colonnes existe (`:1063-1068`).
- Annotations : clé = sections de la page + signature ; `s1`, `kN`, `p…` n'y entrent que s'ils servent, pour garder
  les clés existantes (`:764-770`, `blocks.ts:331-349`).
- Touchers en tiers, aucun balayage (`:838-859`). Chrome : en haut titre, tonalité, progression ; en bas Sommaire,
  Réglages, Annoter, ←, →, Quitter (`:1158-1261`), effacé après 3 s (`:717-723`). Réglages par appareil (`perf-*`).

**Chants** (`src/app/songs/`)
- `/songs` est statique, liste lue dans les fichiers (`page.tsx:8-26`) ; une page statique par chant
  (`[slug]/page.tsx:5-7`). `SongListClient.tsx` écrit ses filtres dans l'adresse **courante** (`:71-84`), restaure
  le défilement de la fenêtre (`:57-68`) ; index A–Z collant (`:359-411`) ; « Récemment consultés » (`:292-313`).
- `SongDetailClient.tsx` : paramètres d'URL en JSON (`:47-56`) ; barre fixe sur toute la largeur (`:295`), Retour
  (`:303-309`) ; menu ⋯ : vidéo, Spotify, Apple Music, couleurs par section, Personnaliser, PDF, Idées d'harmonie,
  Signaler (`:454-515`). Pas de « + Setlist ».

**Partout**
- `PageTransition.tsx:8` remonte toute la page à chaque adresse (`key={pathname}`) : une liste posée dans un layout
  serait rechargée à chaque chant. `manifest.ts:15` fige l'app installée en portrait (relevé pour Android par
  `audit-ui-apple-design.md`) ; U4 n'en parle pas.
- `canSeeSetlist` : auteur ; privée = auteur seul ; admins ; rôle dans la catégorie (`access.ts:269-278`). L'onglet
  Setlists y ajoute « Mes services », coché par défaut (`setlists/page.tsx:110-129`). `getSetlists` lit toute la
  collection (`setlists.ts:137-155`) ; `date` est un texte `AAAA-MM-JJ`.
- Tests : trois projets (`playwright.config.ts:30-34`) ; douze specs visent le bouton « Partitions » par son nom ; le
  faux Firestore ignore les `where` d'un `runQuery` (`tests/helpers/fakeSession.ts:168-188`).

## Décisions de Timothée — à ne pas rouvrir

| Date | Décision |
| --- | --- |
| 13/09/2026 | Tout ce qu'on fait aujourd'hui reste possible, même si ça change de place ; repères gardés : barre du bas, « Mode louange », barre d'outils du chant. Chaque appareil a sa mise en page. |
| 13/09/2026 | « Copier les paroles » dans la vue partitions, ordre joué, reprises comprises (`spec-regie.md`). Une annotation dessinée à une autre mise en page ne s'affiche plus : revers accepté, l'équipe prévenue (`spec-mode-louange.md`). |
| 15/09/2026 | « Copier les paroles » seulement quand le chant suit la présidence (`spec-version-perso.md`). |
| 16/09/2026 | La vue liste garde son PDF liste, sans fenêtre (`spec-export-pdf.md`, Q1). |
| 20/09/2026 | Vue partitions en « Ordre joué » par défaut ; pas de mode louange sur un chant seul ; barre de la setlist sur une ligne (≥ 390 px tout tient ; < 390 px Adapter et Ma version dans ⋯). |
| 03/10/2026 | Chants en grand : liste et recherche à gauche, partition et toute la personnalisation à droite ; avant de choisir, « Choisis un chant » et, pour un connecté, les chants de ses prochaines setlists. |
| 03/10/2026 | Setlist en grand : sommaire à gauche (surlignage du chant lu, saut au clic), toutes les partitions à la suite à droite (copier-coller) ; la page « Modifier » reste. |
| 03/10/2026 | Mode louange : 2 colonnes automatiques en grand, plus un interrupteur ; un chant en 简谱 reste tel quel, sans coupe en deux pages. |
| 03/10/2026 | Setlists montrées dans Chants : la règle de l'onglet Setlists (`canSeeSetlist`). Lecture plafonnée vers 1 440 px. |
| 04/10/2026 | Setlist sur téléphone et tablette portrait : G, Liste et Partitions reliées, avec toutes les fonctions des deux vues ; A à F, H, I, J écartées. Tablette paysage : barre latérale toujours réduite. Tout part en ligne ensemble à la fin du chantier. |

## Décisions proposées ici

| # | Proposition | Raison lue dans le code |
| --- | --- | --- |
| Q1 | **Deux volets** dans les dispositions « tablette paysage » et « ordinateur » de U4, **avec au moins 900 px de largeur utile** (fenêtre moins `--barre-laterale`) : toujours en tablette paysage et sur ordinateur barre réduite ; barre dépliée, dès 1 148 px de fenêtre. Sinon un volet (aujourd'hui ; G pour la setlist). Le CSS décide (requêtes de U4 et `html[data-barre]`) ; le code relit les mêmes chaînes par `matchMedia` quand il doit savoir. | Volet de gauche de 380 px (planche) et partition d'au moins 520 px (une ligne de 60 signes à la taille des partitions) : à 1 024 px barre dépliée, il resterait 396 px. Même famille de règle que l'éditeur (U5 bis : feuilles sous 806 px utiles). U4 signale que le sommaire actuel n'a plus la place barre dépliée. |
| Q2 | **Deux colonnes en mode louange** dans les mêmes dispositions (plein écran : la barre latérale ne compte pas), si `largeur ÷ taille du texte ≥ 960 px`, soit 440 px par colonne au moins. Sinon une colonne. | `PerformanceMode.tsx:609-612` met en page à `largeur ÷ taille du texte` : à 120 % sur un iPad de 1 080 px, deux colonnes passeraient sous 440 px et chaque ligne se replierait. |
| Q3 | **Interrupteur « 2 colonnes »** dans la barre du haut du mode louange, à côté du compteur (planche), montré seulement quand deux colonnes sont possibles et hors vue structure ; **retenu par appareil** (`perf-two-columns` : `"1"`, `"0"`, absent = automatique). | Tous les réglages du mode louange sont par appareil ; un iPad au pupitre et un ordinateur n'ont pas le même besoin. |
| Q4 | **Répartition** : sections entières, jamais coupées ; chaque chant ouvre une page ; un chant qui tient sur une colonne reste en une colonne pleine largeur, comme aujourd'hui ; sinon colonne de gauche puis de droite, et la dernière page du chant s'équilibre (la plus haute colonne la plus courte, comme sur la planche) ; plus long : pages suivantes ; une section plus haute qu'une colonne réduit la page ; l'en-tête du chant passe en pleine largeur au-dessus des colonnes ; scan 简谱 et vue structure inchangés ; mesure absente : une colonne. | Règles d'aujourd'hui (`PerformanceMode.tsx:642-655`, `:226-253`) ; équilibrage de la vue structure (`:292-304`). Le chrome s'efface après 3 s : sans l'en-tête, titre, capo et repère « setlist : G » disparaîtraient. |
| Q5 | **Annotations** : marqueur `x2` dans la clé des seules pages posées en deux colonnes ; une page en une colonne garde sa clé. | Clé = sections de la page + signature (`PerformanceMode.tsx:764-770`) : sans marqueur, une page aux mêmes sections partagerait des traits posés ailleurs ; même principe que `s1` et `kN`. |
| Q6 | **Sommaire en grand**, nommé « Sommaire » (planche, mots de Timothée ; aujourd'hui « Déroulé ») : par chant, numéro, titre, tonalité en pastille avec « orig. E » (la planche écrit « D au lieu de E » : on garde la pastille de la liste, une info, une forme), une pastille abrégée par étape jouée (sans « ×2 », comme la liste), notes, « Partition 简谱 » ; toucher un chant ou une pastille y amène ; le chant lu en encre, sa pastille marquée ; « Copier toutes les paroles » en pied (question 6). | Reprend la lecture et le saut de `SetlistOutline.tsx` (`data-outline-item`, `data-section-uids`) et les champs de `ListView.tsx`. |
| Q7 | **En-tête en grand** (planche) : à droite du titre, Présentation · Adapter · Ma version · Modifier · PDF · ⋯ · Mode louange, libellés compris ; la rangée passe sous le titre quand elle n'y tient pas. Dans ⋯ : Accords, Affichage (trois positions, Pinyin, couleurs par section, 简谱), Prévenir l'équipe, Dupliquer, Partager, Supprimer. L'en-tête colle en haut et s'escamote au défilement, le sommaire monte avec lui. Plus de bascule ni de Retour : l'entrée « Setlists » de la barre latérale rouvre la liste filtrée (`lastListPath`). | Chaque appareil sa mise en page (13/09) ; la barre suit déjà `useScrollDirection` et le sommaire `barsVisible` ; sept boutons libellés (≈ 690 px) tiennent dans 900 px. |
| Q8 | **PDF en grand** : « Quel PDF ? » gagne « Liste » (le PDF liste). Sur G, rien ne change. | Sans vue liste, `SetlistOverviewPDF` (`SetlistDetailClient.tsx:325-335`) serait perdu. |
| Q9 | **G, adresse** : `?vue=partitions&chant=N` (N = position, celle de `data-outline-item` ; valeurs simples comme `?tab=` de l'onglet Setlists). Liste → Partitions crée une entrée d'historique ; Partitions → Liste revient en arrière ; `chant` suit le chant lu sans nouvelle entrée. En grand, la page écrit la même adresse en lisant : une tablette qu'on tourne garde sa place. Les liens vers la page du chant gardent leurs paramètres JSON (`songHref`, `?key=%22F%22`). | La vue est en mémoire (`SetlistDetailClient.tsx:150`) : aujourd'hui le retour quitte la setlist. |
| Q10 | **G, « Liste » ramène à la ligne du chant lu** (celle qu'on a touchée si on n'a pas défilé), marquée comme le chant lu du sommaire ; « Partitions » rouvre là où on était, ou au chant touché. | Même ligne de lecture que le sommaire (`SetlistOutline.tsx:64-88`). |
| Q11 | **G, même barre des deux côtés** (planche) ; depuis la Liste, Adapter et Ma version ouvrent les partitions au chant en cours dans ce mode, Accords et Affichage changent le réglage. La bascule passe sous l'en-tête, pleine largeur sur téléphone, noms « Liste » et « Partitions » gardés ; elle colle sous la barre et s'escamote avec elle. | Ces boutons n'existent qu'en Partitions (`view === "partitions"`) : une barre qui change pendant un glissement serait instable. Les douze specs visent « Partitions » par son nom. |
| Q12 | **Lien vers la page du chant** (tonalité perso, vidéo, PDF du chant, signalement) : le titre de chaque chant dans les partitions, partout, fusions comprises. | Seul le titre de la vue liste y mène (`ListView.tsx:259-262`) ; en grand la liste disparaît, sur G la ligne ouvre les partitions. |
| Q13 | **Glissement G** : au doigt seulement ; ignoré s'il part à moins de 24 px d'un bord (retour du système), pendant une sélection de texte ou dans un élément qui défile en largeur ; engagé après 10 px si l'écart horizontal dépasse 1,5 fois le vertical, sinon le défilement gagne ; la vue suit le doigt ; validé si la position projetée dépasse un tiers de l'écran, sinon retour en ressort ; la nouvelle vue arrive du côté du geste ; mouvement réduit : fondu. Pas de conflit avec l'index A–Z (absent de la setlist) ni avec le mode louange (calque par-dessus, touchers en tiers). | Aucune gestion de geste dans la page ; `PerformanceMode.tsx:838-859`, `:909`. |
| Q14 | **Partitions préchargées** : en grand dès l'ouverture ; sur G juste après l'affichage de la liste. | Le mode louange les charge de toute façon (`SetlistDetailClient.tsx:1067-1071`) ; le service worker les garde. |
| Q15 | **Chants en grand** : la liste vit dans un layout de route (`src/app/songs/layout.tsx`) et reste montée d'un chant à l'autre (recherche, filtres, position) ; elle lit `/songs-index.json` au lieu d'alourdir les 378 pages ; le fondu de page se règle par section (avec U4) ; les filtres ne s'écrivent dans l'adresse que sur `/songs`. Les deux volets sont bornés par `--largeur-lecture` et centrés dans la zone de contenu. | `PageTransition.tsx:8` remonterait tout ; `SongListClient.tsx:81` écrirait `?q=` sur `/songs/[slug]` et effacerait `?key=`. U4 laisse à chaque lot ses largeurs. |
| Q16 | **Volet de droite de Chants** = la page du chant d'aujourd'hui, sans Retour, sa barre en haut du volet (collante, plus fixe), libellés selon la largeur du volet (requêtes de conteneur posées sur la barre, bloc sans élément fixe, règle U4 Q9). Dès la tablette portrait, « Idées d'harmonie » et « PDF » sortent du menu ⋯ (planche). « Récemment consultés » reste en tête de la liste. Téléphone : rien ne change. | `SongDetailClient.tsx:295`, `:303-309`, `:454-515`. La planche ne dessine pas les récents : les retirer serait un retrait. |
| Q17 | **« Choisis un chant »** : connecté, les **3 prochaines setlists** (date ≥ aujourd'hui) que `canSeeSetlist` laisse voir, brouillons exclus, par date puis ordre des catégories ; un chant ouvre la page du chant dans les réglages de la setlist (`songHref`), le titre de la carte ouvre la setlist. Lecture bornée : `date ≥ aujourd'hui`, tri par date, 30 au plus. Sans compte, sans setlist ou hors ligne : « Choisis un chant » seul, sous-titre « dans la liste. ». | `getSetlists` lit toute la collection : coût nul oblige. La planche montre trois cartes. |

## Objectif

1. En tablette paysage et sur ordinateur, Chants et Setlist prennent la place en deux volets.
2. Le mode louange y passe en deux colonnes, sans couper une section ni un scan 简谱.
3. Sur téléphone et tablette portrait, la setlist relie Liste et Partitions (G), sans perdre une fonction ; le reste
   y est inchangé.

**Réussite.** Sur un iPad en paysage, un pianiste connecté ouvre Chants : la liste à gauche, « Choisis un chant » à
droite avec les chants de ses trois prochaines setlists. Il touche « Abba Père » dans la carte du culte : le chant
s'ouvre à droite dans la tonalité de la setlist, la liste n'a pas bougé et surligne la ligne ; le retour ramène
« Choisis un chant ». Dans la setlist : sommaire à gauche, partitions à droite ; toucher « 一生爱你 » l'amène en haut
et le marque ; « Copier toutes les paroles » colle les chants dans l'ordre. « Mode louange » s'ouvre en deux
colonnes, aucune section coupée, le scan de 一生爱你 sur sa page entière ; « 2 colonnes » coupé, la page repasse en
une colonne et le reste à la réouverture. Sur son téléphone, la setlist s'ouvre sur la Liste ; la ligne 3 ouvre les
partitions au chant 3 ; il glisse vers la droite : la Liste revient, ligne 3 marquée ; le retour du navigateur fait
de même ; toutes les commandes d'aujourd'hui sont là. Chants et le mode louange du téléphone n'ont pas changé.

## Modèle

Aucune écriture nouvelle, aucun droit nouveau : `access.ts` et `firestore.rules` ne changent pas (lecture déjà
ouverte aux connectés, filtre `canSeeSetlist` côté client comme l'onglet Setlists).

- **Préférence** : `perf-two-columns`, par appareil, sous `try/catch` comme les autres.
- **Adresses** : `/setlists/[id]` (Liste) ; `/setlists/[id]?vue=partitions&chant=3` (Partitions au chant 3 ; en
  grand, `vue` ne change rien). `/songs` (en grand, avec « Choisis un chant ») ; `/songs/[slug]?key=%22F%22&…` inchangé.
- **Lecture** (grand écran, connecté, `/songs`) : `runQuery` REST sur `setlists`, `date ≥ aujourd'hui`, tri par
  `date`, `limit: 30` (index simple, pas d'index composite). **Annotations** : seules les pages en deux colonnes
  changent de clé (`x2`).

```ts
// src/lib/performance/columns.ts — pur
export function twoColumnsPossible(grandEcran: boolean, width: number, fontScale: number): boolean; // ≥ 960 px
export function paginateColumns(args: {
  flow: number[]; header: number | null;           // blocs d'un chant hors scan, ordre joué ; son en-tête
  heightsFull: number[]; heightsColumn: number[];  // hauteurs mesurées pleine largeur / largeur d'une colonne
  pageHeight: number;
}): PerfPage[]; // type existant ; tient sur une colonne → pages d'aujourd'hui ; aucun bloc coupé ; dernière page équilibrée
// src/lib/setlist/upcoming.ts — pur ; refiltre la date (la requête n'est pas crue sur parole)
export function upcomingSetlists(all: FSSetlist[], user: AuthUser, profile: UserProfile | null,
  today: string, max?: number /* 3 */): FSSetlist[];
// src/components/song/copyLyrics.ts — playedSections + lyricsText, deux lignes vides entre deux chants
export function setlistLyricsText(items: SetlistItem[], contents: Record<string, SongContent>): string;
// src/hooks/useDeuxVolets.ts (règle de Q1) ; src/hooks/useSwipeViews.ts (seuils de Q13)
```

## Écrans

**Téléphone** (`setlist-g-telephone`, `setlist-g-telephone-partitions`). Chants et mode louange inchangés.
- Côté Liste : barre Retour · Affichage · Adapter · Accords · Ma version · Mode louange · ⋯ (question 3 ; sous
  390 px, Adapter et Ma version dans ⋯) ; en-tête : titre et « FR / 中文 », « Dimanche 4 octobre · Présidence : … ·
  Présentation », notes en italique, plus ce que garde la question 4 ; bascule « Liste | Partitions » ; une ligne par
  chant : numéro, titre, pinyin, « 谱 简谱 », artiste, structure abrégée, notes, tonalité et « orig. », chevron. Toute
  la ligne ouvre les partitions à ce chant, une fusion aussi ; une transition se déplie comme aujourd'hui.
- Côté Partitions : même barre, même en-tête ; la page commence au chant touché, sous la barre ; chaque chant garde
  numéro, « Copier les paroles », notes, badges, « Idées d'harmonie », sélecteur de version, bandeau, scan 简谱 ; son
  titre mène à la page du chant. Les phrases grises de la planche (« Toucher un chant ouvre… », « Ouvert depuis la
  Liste… ») décrivent le comportement : ce ne sont pas des textes de l'app.

**Tablette portrait** (`setlist-g-tablette`, `tablette-portrait-chant`). Setlist : G comme le téléphone, bascule à
sa largeur (≈ 360 px), barre en icônes. Chants : un volet ; « Idées d'harmonie » et « PDF » en boutons ; Retour
gardé (absent de la planche : le retirer serait un retrait). Mode louange : une colonne.

**Tablette paysage** (`ipad-paysage-reduit`, `mode-louange-2-colonnes`). Setlist en deux volets, barre réduite
(U4). Chants en deux volets : aucun écran retenu (`ipad-paysage` est écarté), on reprend `Main` avec la barre
réduite. Mode louange en deux colonnes, « 2 colonnes » dans la barre du haut, le reste selon la question 1.

**Ordinateur** (`chants-accueil`, `Main`, `setlist-deux-volets`, `ordinateur-barre-reduite`)
- Chants, avant de choisir : à gauche (380 à 400 px, 320 au moins) « Chants », recherche, Tous · FR · 中文, thèmes,
  « 378 chants », « Proposer un chant », récents, lignes, index A–Z. À droite « Choisis un chant », « dans la liste,
  ou parmi ceux des prochains dimanches. », « Prochaines setlists », « Les mêmes que dans l'onglet Setlists : celles
  des services et des groupes où tu as un rôle. » ; par setlist une carte : catégorie en couleur, titre, « Dim. 4 oct.
  · présidence », chants numérotés et leur tonalité. Un chant choisi : sa ligne en encre, à droite la barre (tonalité,
  A− A+, Accords, ⋯, Idées d'harmonie, PDF) puis le chant ; arrivé par une adresse, la ligne vient dans la vue.
- Setlist : en-tête pleine largeur (« ● Culte Franco · dimanche 4 octobre », titre, « Présidence : … · Thème : … »,
  boutons de Q7) ; sommaire (Q6) ; partitions à la suite ; Adapter et Ma version dans le volet de droite. Barre
  dépliée sous 1 148 px de fenêtre : un volet (Q1). Au-delà de 1 440 px utiles, les volets restent centrés.

**Absents de la planche**, décrits d'après leurs voisins : Chants en tablette paysage ; « Choisis un chant » sans
compte ou sans setlist ; setlist en grand en Adapter ou Ma version ; carte avec une fusion (« A / B ») ; mode louange
en deux colonnes sur ordinateur.

## Ce qui sera construit — sept tranches

Test d'abord, vu rouge puis vert, captures regardées. Les nouveaux morceaux vont dans des fichiers à part plutôt
que d'allonger `SetlistDetailClient.tsx` (1 510 lignes).

- **T0 — Tests, rien ne change.** `tests/helpers/setlist.ts` : `ouvrirPartitions` (touche « Partitions » si la
  bascule est là, sinon attend les partitions) et `ouvrirListe`, repris par les douze specs ; les specs du lot
  rejoignent le `testMatch` des projets `tablette-paysage` et `ordinateur-1440` de U4. Suite verte.
- **T1 — Mode louange en deux colonnes.** `columns.ts`, seconde mesure à la largeur d'une colonne,
  `perf-two-columns`, bouton « 2 colonnes » (`aria-pressed`), en-tête pleine largeur, marqueur `x2`. Vérifiable
  seul : téléphone et tablette portrait donnent exactement les pages d'aujourd'hui.
- **T2 — Setlist G, sans le geste.** Bascule sous l'en-tête, lignes-liens, ouverture au chant, retour à la ligne,
  historique et `chant`, barre identique des deux côtés, titre-lien, préchargement.
- **T3 — Le glissement.** `useSwipeViews` (Pointer Events, seuils de Q13, ressort écrit à la main). G marche sans
  lui : il peut partir plus tard sans rien casser.
- **T4 — Setlist en deux volets** (après U4). `useDeuxVolets`, en-tête collant, sommaire à la place de
  `SetlistOutline`, partitions toujours là, « Liste » dans « Quel PDF ? », « Copier toutes les paroles », entrée
  « Setlists » qui rouvre `lastListPath`.
- **T5 — Chants en deux volets** (après U4). `songs/layout.tsx`, liste depuis l'index, fondu par section, filtres
  hors de l'adresse du chant, page du chant dans le volet, « Choisis un chant » et la lecture bornée.
- **T6 — Finitions.** Captures sur les cinq projets (FR et ZH, clair et sombre), tests existants ajustés, suite
  complète verte, `graphify update .`.

**Le dimanche.** T1 d'abord : le plus isolé, et le test « une colonne identique » protège téléphone et tablette
portrait. Puis G sans geste (les boutons gardent leurs noms, les specs existantes veillent), puis le geste seul ; T4
et T5 après U4. Rien ne part en ligne avant la fin du chantier ; rien de nouveau n'est écrit dans le Firestore
partagé, sauf des annotations `x2` si quelqu'un annote en deux colonnes.

## Tests (Playwright, écrits avant le code)

Les trois projets plus `tablette-paysage` (1 080 × 810) et `ordinateur-1440` (1 440 × 900) de U4 pour les quatre
specs du lot ; un chant FR (`abba-pere`) et un chant ZH (`一生爱你`, sur son scan) dans chacune ; un test propre à
une disposition le dit dans son titre.

- **`tests/mode-louange-colonnes.spec.ts`** — pur : `paginateColumns` (tient sur une colonne → pages d'aujourd'hui ;
  aucun bloc coupé ; gauche puis droite ; dernière page équilibrée ; chant long ; bloc trop haut réduit) ;
  `twoColumnsPossible` (1 080 px à 100 % oui, à 120 % non ; hors grand écran non). Écran : deux colonnes d'office en
  tablette paysage et sur ordinateur ; coupé → une colonne, retenu à la réouverture ; téléphone et tablette portrait :
  pas d'interrupteur, même nombre de pages qu'avant ; scan 简谱 entier ; vue structure inchangée ; un trait posé en
  une colonne ne se charge pas en deux colonnes et revient en une.
- **`tests/setlist-g.spec.ts`** (téléphone, tablette portrait) — bascule « Liste » / « Partitions » ; la ligne 2
  ouvre les partitions, chant 2 sous la barre, `?vue=partitions&chant=2` ; « Liste » ramène la ligne 2, marquée ;
  après défilement jusqu'au chant 1, « Liste » ramène la ligne 1 ; le retour du navigateur revient à la Liste puis
  quitte la page ; rechargement → même chant ; même barre des deux côtés ; Adapter depuis la Liste ouvre les
  partitions en adaptation ; toutes les informations et commandes présentes ; le titre mène à la page du chant avec
  `?key=%22…%22&setlist=…`. Geste (pointeur `touch` simulé) : gauche → Partitions, droite → Liste ; geste surtout
  vertical → défilement ; départ au bord → rien ; mouvement réduit → pas de glissement.
- **`tests/setlist-deux-volets.spec.ts`** (ordinateur, tablette paysage, 1 440) — pas de bascule ; « Sommaire »
  complet (numéros, titres, tonalités et « orig. », pastilles, notes, « Partition 简谱 ») ; un chant touché vient
  sous l'en-tête, `aria-current` ; une pastille amène à sa section ; le surlignage suit le défilement ; « Copier
  toutes les paroles » : FR puis ZH (caractères puis pinyin), deux lignes vides entre chants, absent si un chant suit
  « Ma version » ; « Quel PDF ? » propose « Liste » ; Modifier, Présentation, Adapter, Ma version marchent ;
  ordinateur à 1 024 px barre dépliée → un volet.
- **`tests/chants-deux-volets.spec.ts`** (ordinateur, tablette paysage) — liste et « Choisis un chant » ; connecté
  avec un rôle (horloge simulée) : trois cartes au plus, dans l'ordre, ni brouillon, ni passée, ni privée d'un autre,
  sa propre privée oui ; admin : toutes catégories ; sans compte : pas de carte ; un chant de carte s'ouvre dans la
  tonalité de la setlist ; un chant de la liste s'ouvre à droite, la liste garde position et recherche ; retour →
  chant précédent ; `/songs/[slug]?key=%22F%22` → chant en F, ligne dans la vue ; les filtres n'effacent pas `?key=`.

**Existants touchés.** Par `ouvrirPartitions` (T0) : `coup-d-oeil`, `setlist-regie`, `fusions-dp`, `setlist-version`,
`export-pdf`, `performance-mode`, `look-louange`, `setlist-history`, `harmonie-setlist`, `harmonie-jianpu`,
`harmonie-ma-version`, `jianpu-tonalite-cho`. À réécrire : `setlist-regie` (« Déroulé » → « Sommaire », « Refrain
×2 » → pastilles ; « sur tablette, pas de sommaire latéral » à 1 024 × 768 devient la tablette paysage, avec
sommaire : le test passe en portrait) ; `coup-d-oeil`, `setlist-version` (sommaire par pastilles) ; `look-louange`
(« une seule ligne » sans bascule et avec Affichage, les tailles iPad couché passent à l'en-tête du grand écran ;
« la liste : structure en abrégé… » lue dans le sommaire en grand) ; `export-pdf` (PDF liste sans fenêtre sur G, par
« Liste » en grand) ; `performance-mode` (tonalité perso par le titre dans les partitions ; deux colonnes sur les
projets grand écran) ; si la question 3 est acceptée, les tests qui touchent « Pinyin » ou l'Affichage dans ⋯. À
repasser : `songs-list-return`, `songs-index`, `look-recents`, `look-halo`, `look-halo-defilement`, `look-barres`,
`recommended-key`, `key-selector`, `copy-lyrics`, `back-office-coupe`.

## Hors périmètre

- **Toujours** : les trois appareils plus les deux projets de U4 ; un chant FR et un chant ZH ; captures regardées ;
  toutes les fonctions d'aujourd'hui ; mode louange identique en une colonne ; FR et 中文 — « Sommaire » 目录, « Copier
  toutes les paroles » 复制全部歌词, « 2 colonnes » 双栏, « Choisis un chant » 选择一首诗歌, « Prochaines setlists »
  接下来的歌单, « Liste » 曲目列表 (中文 à relire par Timothée).
- **Demander avant** : le chrome du mode louange de la planche (question 1) ; « + Setlist » (question 5) ; les
  prochaines setlists sur téléphone ; ouvrir le mode louange au chant lu ; un balayage dans le mode louange ; toute
  dépendance npm ; retirer une information de l'en-tête ; l'éditeur (U5 bis) ; la barre latérale (U4).
- **Jamais** : couper une section entre deux colonnes ou deux pages ; couper ou partager un scan 简谱 ; un mode
  louange sur un chant seul ; écrire dans le Firestore de production depuis les tests ; `container-type`,
  `transform` ou `z-index` sur `main` et ses ancêtres (U4) ; toucher aux couleurs gelées, au logo, aux calques 简谱.

## Questions ouvertes

1. **Chrome du mode louange.** La planche dessine une autre barre (Quitter en haut à gauche, « Réglages » en texte,
   Précédent et Suivant en bas, ni Sommaire ni Annoter). On garde celle d'aujourd'hui et on n'ajoute que
   « 2 colonnes » ? Recommandé : **oui** (outil du dimanche ; la planche ne dit pas où iraient Sommaire et Annoter).
2. **Annotations.** Celles d'une page en une colonne ne s'affichent pas sur une page en deux colonnes, et
   inversement ; l'interrupteur les retrouve ; l'équipe est prévenue avant la mise en ligne. D'accord ? Recommandé :
   **oui** (même revers que la taille du texte, 13/09/2026).
3. **Barre G.** La planche montre un bouton « Affichage » et pas de bouton Pinyin. Bouton « Affichage » (Ordre joué
   / Sections uniques / Structure seule, Pinyin, couleurs par section, 简谱), Pinyin y entre ? Recommandé : **oui**
   (un appui de moins pour les batteurs, de la marge sous 390 px).
4. **En-tête de la setlist.** La planche ne dessine ni « Modifiée par … », ni la catégorie, ni « Vous pouvez
   modifier ». On les garde sous le titre ? Recommandé : **oui** (l'historique est décidé depuis le 14/09/2026).
5. **« + Setlist »** sur la page du chant (`Main`, `tablette-portrait-chant`) : aucune décision ne le décrit et il
   n'existe pas. Hors de ce lot ? Recommandé : **oui**, à trancher avec U5 bis.
6. **« Copier toutes les paroles »** : en grand seulement, chants dans l'ordre, sans titres, deux lignes vides entre
   deux chants, proposé seulement si tous les chants suivent la présidence. D'accord ? Recommandé : **oui**.
7. **Manifeste.** `orientation: "portrait"` bloque l'app Android installée en portrait : ni deux volets ni deux
   colonnes sur une tablette Android. On le retire ? Recommandé : **oui**.
8. **Geste sans dépendance** : Pointer Events et un petit ressort écrit à la main, sans bibliothèque npm. D'accord ?
   Recommandé : **oui**.
9. **Cartes « Prochaines setlists »** : `canSeeSetlist` seul, sans le filtre « Mes services » de l'onglet Setlists.
   D'accord ? Recommandé : **oui** (c'est la décision ; le sous-titre de la planche parle des « services et des
   groupes où tu as un rôle »).

## Commandes

```bash
npm test -- tests/mode-louange-colonnes.spec.ts tests/setlist-g.spec.ts tests/setlist-deux-volets.spec.ts tests/chants-deux-volets.spec.ts
npm test                    # suite complète (PW_PORT=3000 si un next dev tourne déjà)
npx tsc --noEmit
npm run lint
graphify update .
```

## Avancement

**T0 — faite le 05/10/2026** (branche `lot/u5-deux-volets`, commit `502345e`, `test(U5): T0 — ouvrirPartitions / ouvrirListe…`). Rien ne change à l'écran :
aucun fichier de `src/` touché.
- `tests/helpers/setlist.ts` : `ouvrirPartitions(page)` attend la setlist (la bascule ou un `[data-outline-item]`),
  touche « Partitions » si la bascule est visible, puis attend le premier chant en partition ; `ouvrirListe(page)`
  touche « Liste » si la bascule est là et attend que les partitions disparaissent, sinon (deux volets) ne fait rien.
- Les douze specs d'« Existants touchés » passent par ces deux fonctions au lieu de viser le bouton par son nom
  (`harmonie-setlist` : sa fonction locale `ouvrirPartitions` devient `openPartitions`, comme dans les autres specs).
- Vérifié : ces douze specs sur ordinateur, téléphone et tablette, avant et après : mêmes résultats (586 verts,
  5 sautés sur 591). `tsc` et ESLint propres. Pas de phase rouge propre à T0 (les specs changent de chemin, pas
  d'attente) : la preuve est l'égalité avant / après. Le cas « deux volets », que l'app ne produit pas encore, a été
  essayé hors dépôt sur des pages factices : bascule masquée par le CSS (non touchée, `getByRole` l'ignore), bascule
  absente, partitions lentes à venir.
- **Pas encore fait, à reprendre par les tranches suivantes** : faire entrer les specs du lot dans le `testMatch` des
  projets `tablette-paysage` et `ordinateur-1440`. Ces projets arrivent avec U4 (`SPECS_GRAND_ECRAN` de
  `playwright.config.ts`, branche `lot/u4-navigation`, pas encore fusionnée ici) et les quatre specs du lot naissent
  avec T1 à T5 : chaque tranche ajoute la sienne à `SPECS_GRAND_ECRAN` une fois U4 fusionnée. `ouvrirListe` attend
  aujourd'hui que les partitions quittent la page : T2 (G, Liste et Partitions reliées) l'ajustera si les deux vues
  restent montées côte à côte.
- Revérifié à la reprise (05/10/2026, après la coupure) : les douze specs sur ordinateur, téléphone et tablette,
  586 verts, 5 sautés ; `tsc` et ESLint propres ; plus aucune spec ne vise « Partitions » ou « Liste » par son nom.
- Reste : T1 à T6.
- À faire par Timothée : rien pour T0 (aucune règle, aucun écran).

**T1 — faite le 05/10/2026** (branche `lot/u5-deux-volets`, commit `feat(U5): T1 — mode louange en deux colonnes…`,
juste après `6c6bb63`). Le mode louange passe en deux colonnes sur ordinateur et sur tablette couchée ;
téléphone et tablette debout gardent leurs pages au bloc près.
- `src/lib/performance/columns.ts` (nouveau, pur) : `PerfPage` (sorti du composant, plus `twoColumns`),
  `paginateBlocks` (déplacé tel quel), `pagesUneColonne` (le calcul d'aujourd'hui, sorti du composant),
  `twoColumnsPossible` (grand écran et `largeur ÷ taille du texte ≥ 960`), `paginateColumns` (Q4) et `GRAND_ECRAN`,
  les deux requêtes de U4 (ordinateur, tablette paysage) relues par `matchMedia`.
- `PerformanceMode.tsx` : disposition et largeur relues au redimensionnement ; seconde copie de mesure à la largeur
  d'une colonne (gouttière de 2rem), montée seulement en deux colonnes, sans en-têtes ni scans ; pagination chant
  par chant ; en-tête du chant en pleine largeur au-dessus des colonnes de sa première page ; `x2` dans la clé des
  seules pages en deux colonnes ; bouton « 2 colonnes » / 双栏 (`aria-pressed`, icône colonnes) à droite du
  compteur, seulement quand deux colonnes sont possibles et hors vue structure ; `perf-two-columns` (`"1"`, `"0"`,
  absent = automatique). Chrome d'aujourd'hui gardé (question 1).
- Choix pris : sur la dernière page d'un chant, à hauteur égale, la colonne de gauche prend le bloc de plus ; un
  chant d'un seul bloc reste en une colonne (deux colonnes ne l'aideraient pas) ; quand la mise en page change
  (« 2 colonnes », rotation, taille du texte), on reste sur la page qui contient le premier bloc de la page lue
  (avant : même numéro de page, qui envoyait ailleurs en passant de deux à une colonne).
- Tests : `tests/mode-louange-colonnes.spec.ts` — sept tests purs (`paginateColumns`, `twoColumnsPossible`) ; à
  l'écran, deux colonnes d'office (FR `abba-pere`, ZH `一生爱你` joué deux fois : en entier il tient sur une page et
  reste en une colonne), coupé → une colonne retenue à la réouverture, scan 简谱 de `一生爱你` entier sur sa page,
  vue structure identique, trait posé en une colonne absent en deux colonnes puis revenu ; téléphone et tablette
  debout sans interrupteur, une colonne à chaque page, même nombre de pages quel que soit le réglage. Vus rouges
  (25 échecs) puis verts sur ordinateur, téléphone et tablette (35 verts ; 25 sautés = tests d'une autre
  disposition). La tablette couchée est jouée par l'iPad du projet `tablette` tourné en 1 080 × 810 (describe
  « tablette couchée »), en attendant le projet `tablette-paysage` de U4.
- Relevé avant / après (sonde jetable, non commitée) des pages de quatre chants (FR, ZH, scan, structure courte),
  rôles pianiste et batteur : identiques au bloc près sur téléphone, tablette debout, et ordinateur avec
  « 2 colonnes » coupé.
- Specs existantes du mode louange repassées sur les trois projets : `performance-mode`, `look-louange`,
  `jianpu-tonalite-cho`, `fusions-dp`, `setlist-version`, `harmonie-ma-version`, `look-barres`, `look-halo`,
  `songs-list-return` : 436 verts, 5 sautés, aucune à réécrire. `tsc` propre ; ESLint : aucun avertissement nouveau.
- Captures regardées (ordinateur 1 280 × 720, tablette couchée) : colonnes conformes à `mode-louange-2-colonnes`,
  scan entier ; comme aujourd'hui, la barre du haut couvre l'en-tête du chant jusqu'à ce qu'elle s'efface.
- **Reste après T1** : une fois U4 fusionnée, ajouter `mode-louange-colonnes.spec.ts` à `SPECS_GRAND_ECRAN`
  (`tablette-paysage`, `ordinateur-1440`) ; le describe « tablette couchée » peut alors partir. Puis T2 à T6.
- À faire par Timothée : aucune règle à publier. Relire 双栏. Prévenir l'équipe avant la mise en ligne
  (question 2) : un trait posé sur une page en une colonne ne s'affiche pas sur la même page en deux colonnes, et
  inversement ; « 2 colonnes » coupé les retrouve.

**T2 — faite le 05/10/2026** (branche `lot/u5-deux-volets`, commit `feat(U5): T2 — setlist G…`, juste après `ec367ee`).
Sur téléphone et tablette debout, la setlist relie Liste et Partitions, sans le geste (T3). Jusqu'à T4, l'ordinateur
et la tablette couchée ont aussi G (un volet) ; le « Déroulé » y reste, sa ligne de lecture passe sous la bascule.
- **Barre identique des deux côtés** (Q3, Q11), dans l'ordre de la planche : Retour · Affichage · Adapter · Accords ·
  Ma version · Mode louange · ⋯ (icônes de la planche : réglages, crayon, note, personne). « Affichage » ouvre
  Ordre joué / Sections uniques / Structure seule, Pinyin (si un chant 中文), Couleurs par section, Partition 简谱 ; le
  bouton Pinyin et ces réglages quittent la barre et le menu ⋯. Adapter, Accords, Ma version portent `aria-pressed`.
  Sous 390 px, Adapter et Ma version restent dans ⋯ (des deux côtés). Depuis la Liste, Adapter et Ma version ouvrent
  les partitions au chant lu dans ce mode ; Accords et Affichage changent le réglage sans quitter la liste.
- **Bascule** « Liste | Partitions » sous l'en-tête (`data-testid="bascule-vues"`, `aria-pressed`), pleine largeur sur
  téléphone, 360 px sur tablette ; elle colle sous la barre (fond `FondDeBarre`, fondu de 12 px) et s'escamote avec
  elle. L'en-tête perd son filet du bas (la bascule le sépare de la liste). Tout l'en-tête d'aujourd'hui reste (question 4).
- **Lignes-liens** (`ListView.tsx`) : une ligne par chant, séparées d'un filet, chevron à droite ; toute la ligne est
  un lien `?vue=partitions&chant=N` (`data-ligne`), fusion comprise ; la ligne du chant lu porte `aria-current` et
  un fond. Les liens vers la page du chant quittent la liste (titres et chants de fusion).
- **Titre-lien** (Q12) : dans les partitions, le titre de chaque chant mène à sa page dans les réglages de la setlist
  (`songHref`, sorti dans `src/lib/setlist/songHref.ts`, slug encodé) : `SongView` prend `titleHref` ; chants d'une
  fusion (les deux formes) ; un chant sur son scan 简谱 reçoit son titre en lien à côté des badges (le scan porte
  déjà le titre en image).
- **Adresse et historique** (Q9, Q10) : Liste → Partitions pousse `?vue=partitions&chant=N` (marque `vueG` dans
  `history.state`) ; « Liste » revient en arrière, ou remplace l'adresse si on est arrivé directement ;
  `chant` suit le chant lu (ligne de lecture = bas de la bascule) par `replaceState`, jamais hors de la page de la
  setlist. Le chant touché vient 12 px sous la bascule, barres gardées à l'écran (`data-nav-lock`) et tenu en place
  2 s ou jusqu'au premier geste (scans et polices qui arrivent après ; ancrage du navigateur suspendu). « Partitions »
  rouvre au même chant et au même décalage ; « Liste » ramène la ligne du chant lu (en haut de page si elle y tient).
  `history.scrollRestoration` est manuel tant que la page est ouverte. Rechargement : même vue, même chant.
- **Préchargement** (Q14) : les partitions se chargent juste après le premier affichage de la liste ; la bascule ne
  recharge plus rien (le mode louange recharge toujours ce qui manque).
- Choix pris : la ligne marquée et le chant amené se repèrent par la position (`item.position`, celle de
  `data-outline-item`) ; un chant donné sans retour connu ouvre les partitions en haut de page ; le titre d'un scan
  est un lien texte ajouté (un scan n'a pas de titre texte à rendre cliquable).
- Tests : `tests/setlist-g.spec.ts` (20 tests, téléphone et tablette ; sautés sur ordinateur, deux volets en T4) —
  bascule, lignes, fusion, transition, retour à la ligne, défilement, rouvrir, retour du navigateur, ouverture directe,
  rechargement, barre identique, Adapter / Ma version / Accords / Affichage depuis la Liste, informations, côté
  Partitions, titre-lien, préchargement. Vus rouges avant le code, puis verts. Existants réécrits : `coup-d-oeil`
  et `setlist-version` (Affichage), `performance-mode` (Pinyin dans Affichage ; tonalité perso par le titre dans les
  partitions), `fusions-dp` (quatre tests passent par le titre dans les partitions), `look-louange` (barre : Affichage
  au lieu de Pinyin, 7 commandes, 5 sous 390 px). Les 26 specs qui ouvrent une setlist, sur ordinateur, téléphone
  et tablette : 987 verts, 59 sautés, un rouge trouvé et corrigé (en partant vers la page d'un chant, le suivi du
  chant lu récrivait l'adresse du chant et effaçait ses réglages : il ne touche plus l'adresse hors de la setlist) ;
  repasse finale de `setlist-g`, `fusions-dp`, `setlist-regie`, `performance-mode`, `coup-d-oeil`,
  `setlist-version` : 310 verts. `tsc` propre ; ESLint : aucun avertissement nouveau. Captures regardées (téléphone,
  tablette, ordinateur ; clair et sombre) : conformes à `setlist-g-telephone`, `-partitions` et `-tablette`.
- **Reste après T2** : T3 (le glissement) ; T4 (deux volets : la bascule et G disparaissent en grand, `setlist-g` y
  reste sauté) ; T5, T6. Une fois U4 fusionnée, ajouter `setlist-g.spec.ts` aux projets si utile (tablette paysage :
  rien à jouer, c'est T4).
- À faire par Timothée : aucune règle à publier (rien de nouveau dans `access.ts` ni `firestore.rules`). Regarder G
  sur son téléphone : la ligne qui ouvre les partitions, « Liste » qui revient à la ligne, le retour du navigateur.

**T3 — faite le 05/10/2026** (branche `lot/u5-deux-volets`, commit `feat(U5): T3 — le glissement…`, juste après
`f38b69b`). Sur G, un doigt fait glisser la Liste et les Partitions l'une vers l'autre ; sans lui, G marche comme en T2.
- `src/hooks/useSwipeViews.ts` (nouveau) : Pointer Events, au doigt seulement (`pointerType === "touch"`), écoutés sur
  la colonne de la setlist (`touch-action: pan-y pinch-zoom` posé par le crochet : le navigateur garde le défilement
  vertical). Seuils de Q13 dans trois fonctions pures exportées : `lireIntention` (engagé après 10 px si l'écart
  horizontal dépasse 1,5 fois le vertical, sinon le défilement gagne), `projection` (élan projeté, décélération
  0,998) et `issueDuGeste` (validé si la position projetée dépasse un tiers de l'écran, du côté où la vue a été
  emmenée). Ignoré à moins de 24 px d'un bord, pendant une sélection de texte, dans un élément qui défile en largeur.
  La vue suit le doigt (élastique du côté où il n'y a rien : vers la droite sur la Liste, vers la gauche sur les
  Partitions) ; au lâcher, ressort critique écrit à la main (réponse 0,35 s, vitesse du doigt reprise) : la vue part
  du côté du geste et la nouvelle arrive du bord opposé, ou elle revient à sa place. Un doigt reposé pendant le
  ressort reprend la vue où elle est. Mouvement réduit : la vue ne bouge pas, la nouvelle apparaît en fondu (200 ms).
  Le toucher qui finit un glissement n'ouvre pas la ligne ou le lien de départ.
- `SetlistDetailClient.tsx` : la vue affichée est enveloppée (`data-vue`, l'élément qui suit le doigt) ; le geste
  passe par le même chemin que la bascule (`versPartitions()` / `versListe()` : historique, chant lu, retour à la
  ligne) ; coupé pendant le mode louange et sur une setlist vide. Pendant le geste seulement, la colonne prend
  `overflow-x: clip` (la vue sortie n'élargit pas la page).
- Choix pris : seule la vue affichée est montée, comme en T2 (la vue voisine n'apparaît pas à côté pendant le geste ;
  elle arrive après le lâcher) ; Liste → Partitions par le geste rouvre comme le bouton « Partitions » (là où on
  était, sinon en haut) ; sur tablette debout, la vue glisse dans sa colonne (coupée aux bords de la colonne de
  42rem, pas de l'écran) ; un geste vif revenu vers son départ au lâcher ne valide pas, même loin.
- Tests : `tests/setlist-g.spec.ts`, 12 nouveaux (téléphone et tablette ; sautés sur ordinateur comme le reste de G) —
  deux purs (seuils) ; à l'écran, un vrai doigt Chromium (événements tactiles par CDP, `touch-action` et défilement
  compris) : gauche → Partitions (la vue suit le doigt, puis se pose), droite → Liste (ligne du chant lu marquée,
  entrée d'historique refermée), geste court et lent → ressort sans ouvrir la ligne touchée, vers la droite sur la
  Liste → élastique puis retour, geste surtout vertical → défilement, départ au bord → rien, sélection de texte →
  rien, élément qui défile en largeur → rien, mouvement réduit → pas de glissement mais la vue change, souris → rien.
  Vus rouges (12 échecs, crochet absent) puis verts. Contre-épreuve : gardes du bord, de la sélection, du sens et du
  pointeur retirées → quatre rouges (vertical, bord, sélection, souris) ; le cas « défile en largeur » reste vert sans
  sa garde (Chromium donne le geste à l'élément qui défile et annule le pointeur) : la garde reste pour les autres
  navigateurs. Les 21 specs qui ouvrent une setlist (dont `copy-lyrics`), sur ordinateur, téléphone et tablette : 898 verts, 65 sautés, aucun rouge ; `setlist-g` repassé seul après la dernière retouche : 64 verts, 32 sautés (ordinateur). `tsc` propre ; ESLint : aucun avertissement nouveau.
- Captures regardées (téléphone, tablette debout ; doigt posé à mi-course, arrivée, vue posée) : la liste suit le
  doigt sous la bascule, les partitions arrivent par la droite, la Liste revient ligne 1 marquée.
- **Reste après T3** : T4 (deux volets : la bascule et le geste n'existent plus en grand, `actif` du crochet à couper
  quand les deux volets sont là), T5, T6.
- À faire par Timothée : aucune règle à publier. Essayer le geste sur son téléphone et sur l'iPad debout (Safari) :
  glisser la liste vers la gauche, les partitions vers la droite, un geste vertical qui défile, le bord gauche qui
  reste au retour du système.

**T4 — faite le 05/10/2026** (branche `lot/u5-deux-volets`, commits `feat(U5): T4 — setlist en deux volets…` et
`test(U5): T4 — specs existantes…`, après la fusion de `lot/u4-navigation`, `2af01de`). Sur ordinateur et tablette
couchée, la setlist passe en deux volets ; téléphone et tablette debout gardent G.
- `src/hooks/useDeuxVolets.ts` (nouveau) : règle de Q1 relue par `matchMedia` (requêtes de U4) et la préférence de la
  barre (`suivreBarreReduite`) : tablette couchée toujours, ordinateur barre réduite toujours, barre dépliée dès
  1 148 px. Passer de deux volets à un volet (fenêtre rétrécie, tablette tournée) rend à G la vue de l'adresse.
- **En-tête** (Q7, `data-en-tete`) : pleine largeur, bornée par `--largeur-lecture` et centrée au-delà ; « ● catégorie ·
  date », titre, « Présidence : … · notes » ; à droite Présentation (si un lien) · Adapter · Ma version · Modifier ·
  PDF · ⋯ · Mode louange, libellés compris, la rangée passe sous le titre faute de place (le titre garde 18rem). ⋯ :
  Accords, Affichage (sous-menu : trois positions, Pinyin, couleurs par section, 简谱), Prévenir l'équipe, Dupliquer,
  Partager, Supprimer. Il colle en haut et s'escamote au défilement (`useScrollDirection`) ; c'est une barre
  `.material-chrome` comme les autres (fond V8, halo recalé par `--barre-left`). Ni bascule, ni Retour, ni geste.
- **Sommaire** (Q6, `_components/Sommaire.tsx`, remplace `SetlistOutline.tsx`, supprimé avec son CSS) : volet de
  380 px, colle sous l'en-tête et monte avec lui ; par chant numéro, titre, tonalité et « orig. » (`KeyPill`), une
  pastille par étape jouée (ma structure comprise, `stageItems`), notes, « Partition 简谱 ». Le chant lu en encre, sa
  pastille marquée (`aria-current`) ; toucher un chant ou une pastille l'amène 12 px sous l'en-tête (même mécanique
  que G : `allerA` → cible, tenue 2 s). Le chant lu suit le défilement et l'adresse aussi (`?vue=partitions&chant=N`,
  sans entrée d'historique) : rechargé ou tourné, on reste au même chant.
- **« Copier toutes les paroles »** (question 6) en pied du sommaire : `setlistLyricsText` (copyLyrics.ts), chants dans
  l'ordre, transitions exclues, deux lignes vides entre deux chants ; absent si un chant suit « Ma version » (ou une
  autre version, ou ma structure).
- **PDF** (Q8) : « Quel PDF ? » gagne « Liste » (`onListe` de `PdfChoiceSheet`), qui télécharge le PDF liste.
- **Setlists** (Q7) : sur une setlist, l'entrée « Setlists » de la barre latérale rouvre la liste telle qu'on l'a
  quittée (`listeSetlistsRetenue`, clé `setlistsListPath` écrite par `useSetlistsNavState`).
- **Adapter / Ma version** : dans le volet de droite, le sommaire reste. Ce que garde la question 4 (historique,
  langue, « Vous pouvez modifier », ajouter/changer le lien de la présentation) est en tête du volet de droite, sous
  l'en-tête, même pour une setlist vide.
- Corrigés en passant : le PDF liste d'une setlist dont un chant a des notes échouait (« Could not resolve font for
  Inter, italic ») : face italique enregistrée (`SetlistOverviewPDF.tsx`, Inter droit faute d'italique). Le suivi du
  chant lu récrivait l'adresse sans l'état de Next, qui abandonnait alors une navigation en cours (un titre touché
  pendant le défilement n'ouvrait pas la page du chant) : l'état est gardé (`replaceState(history.state, …)`).
  Sur G, « Partitions » rouvrait parfois au bon endroit mais avec `chant=1` dans l'adresse (1 fois sur 10 à 20 en
  test) : le suivi lisait un défilement de passage. Il attend désormais que la cible soit atteinte (`enRoute`), ne lit
  rien quand les partitions sont déjà retirées, et le chant amené réaffirme chant lu et adresse pendant qu'il est tenu.
- Choix pris : pas de pastille de tonalité pour une fusion dans le sommaire (deux tonalités possibles ; titre « A / B »
  et ses pastilles) ; l'historique, la langue et « Vous pouvez modifier » en tête du volet de droite plutôt que dans
  l'en-tête collant (il reste compact, comme la planche) ; la date écrite en entier (`formatDate`, année comprise).
- Tests : `tests/setlist-deux-volets.spec.ts` (16 tests ; ordinateur, `tablette-paysage`, `ordinateur-1440`, ajouté à
  `SPECS_GRAND_ECRAN` ; sautés sur téléphone et tablette debout) — vus rouges (16 échecs) puis verts (46 verts). FR
  `abba-pere` transposé et ZH `一生爱你` sur son scan, transition et fusion. Specs existantes réécrites (nouvelles
  fonctions `ouvrirAffichage`, `basculerAccords`, `fermerMenus`, `enDeuxVolets` dans `tests/helpers/setlist.ts`) :
  `coup-d-oeil` (Affichage ; pastilles au lieu de « Refrain ×2 »), `setlist-regie` (Sommaire et pastilles ; « pas de
  sommaire » joué en tablette debout), `setlist-version` (pastilles), `export-pdf` (« Liste » en deux volets),
  `fusions-dp` (Dp lu dans le sommaire), `performance-mode` (Affichage, Accords, badges cherchés dans le mode louange),
  `look-louange` (iPad couché et ordinateur ≥ 1 148 px : l'en-tête sur une ligne), `look-barres`,
  `navigation-grand-ecran` (barre du haut et sommaire des deux volets).
- Captures regardées (ordinateur 1 280, 1 440, tablette couchée ; Ma version) : conformes à `setlist-deux-volets` et
  `ipad-paysage-reduit`.
- **Reste après T4** : T5 (Chants en deux volets), T6 (finitions : captures FR/ZH clair et sombre sur les cinq projets,
  suite complète, `graphify update .`). `look-louange` « la liste : structure en abrégé » n'a pas eu à changer : en
  grand, elle lit déjà le sommaire (ses entrées sont des éléments de liste, pastille « C1 », tonalité et « orig. »).
- À faire par Timothée : aucune règle à publier (`access.ts` et `firestore.rules` inchangés). Relire 目录, 复制全部歌词,
  曲目列表 (« Liste » de « Quel PDF ? ») et son aide. Regarder la setlist sur l'ordinateur (barre dépliée et réduite)
  et sur l'iPad couché : sommaire, pastilles, « Copier toutes les paroles », « Liste » dans « Quel PDF ? », l'entrée
  « Setlists » qui rouvre la liste filtrée.

**T5 — faite le 05/10/2026** (branche `lot/u5-deux-volets`, commit `feat(U5): T5 — Chants en deux volets…`, après
`6524e64`). Sur ordinateur et tablette couchée, Chants passe en deux volets ; téléphone et tablette debout gardent un
volet (seuls Idées d'harmonie et PDF sortent du menu ⋯ sur la tablette debout).
- **Layout** (`src/app/songs/layout.tsx`, `ChantsVolets.tsx`) : la liste vit dans le layout. La disposition est
  décidée par le CSS (`.chants-volets`, fin de `globals.css`, mêmes conditions que `useDeuxVolets`), pour que la page
  arrive du serveur déjà à sa place. Un volet : la liste sur `/songs`, la page du chant ailleurs, comme avant (la liste
  n'est montée que sur `/songs` et se remonte au retour). Deux volets : liste à gauche (`clamp(320px, 37 %, 400px)`,
  elle défile seule dans son volet, collée en haut), à droite « Choisis un chant » ou le chant ; bornés par
  `--largeur-lecture`, centrés.
- **Liste depuis l'index** (`src/hooks/useSongsIndex.ts`) : `/songs-index.json`, gardé en mémoire une fois lu (la liste
  remontée s'affiche d'un coup, sa position se rend avant la première image). `/songs` ne charge plus les 378 chants
  côté serveur ; seuls les thèmes passent par le layout. La restauration du défilement attend la liste.
- **Fondu par section** (`PageTransition.tsx`) : Chants n'est plus remonté à chaque chant ; le volet de droite a son
  fondu à chaque adresse, la liste à chaque montage.
- **Filtres** : écrits dans l'adresse (et `lastListPath`) sur `/songs` seulement ; sous `/songs/[slug]` ils n'effacent
  plus `?key=`. En deux volets, la position de la liste n'est ni enregistrée ni restaurée (la fenêtre est celle du chant).
- **Chant ouvert** : sa ligne en encre (`aria-current="page"`, tonalité en blanc, planche `Main`) ; elle vient dans la
  vue de son volet (arrivé par une adresse, retour du navigateur).
- **Page du chant dans le volet** (`SongDetailClient.tsx`, Q16) : la barre colle en haut du volet (plus fixe sur toute la
  largeur ; `--zoom-chant` pour garder sa largeur au zoom ; `--barre-left` mesuré pour la copie du halo), sans Retour.
  Libellés selon la largeur de la rangée (requête de conteneur `.rangee-chant` : libellés dès 620 px, comme le
  téléphone les cachait sous 640 px de fenêtre ; « Idées d'harmonie » dès 760 px). Dès 768 px de large et 500 px de
  haut (tablette debout, ordinateur, pas un téléphone couché), Idées d'harmonie (si l'accès) et PDF en boutons à droite
  de la barre, retirés du menu ⋯.
- **« Choisis un chant »** (`ChoisisUnChant.tsx`, Q17, planche `chants-accueil`) : connecté, les trois prochaines
  setlists — `getSetlistsFrom` (setlists.ts : `date ≥ aujourd'hui`, tri par date, 30 au plus, index simple) puis
  `upcomingSetlists` (`src/lib/setlist/upcoming.ts`, pur : date refiltrée, brouillons exclus, `canSeeSetlist`, par date
  puis ordre des catégories). Carte : catégorie en couleur, titre (lien vers la setlist), « Dim. 4 oct. · présidence »,
  chants numérotés (transitions exclues) avec leur tonalité (`keyOverride`, sinon l'originale), une fusion en
  « A / B » (chaque titre dans ses réglages de la fusion, sans pastille) ; un chant ouvre sa page par `songHref`. Sans
  compte, sans setlist ou hors ligne : « Choisis un chant », « dans la liste. ». Rien n'est lu en un volet.
- Choix pris : halo de « Choisis un chant » en `--sec-verse` (la teinte verte de la planche) ; le nom de catégorie est celui des traductions
  (« Culte Francophone », la planche écrit « Culte Franco ») ; « Récemment consultés » reste en tête de la liste ;
  pas de « + Setlist » (question 5) ; un téléphone couché garde Idées et PDF dans ⋯ (« rien ne change »).
- Tests : `tests/chants-deux-volets.spec.ts` (14 tests ; ajouté à `SPECS_GRAND_ECRAN`) — en grand : sans compte, cartes
  d'un musicien (ordre, brouillon, passée, privée d'un autre, sa privée), admin, lecture bornée, chant de carte dans la
  tonalité de la setlist puis retour, titre de carte, liste qui garde position et recherche (FR puis ZH) et retour au
  chant précédent, arrivée par une adresse (`?key=` gardé par les filtres), barre collante sans Retour avec Idées et
  PDF, scan 简谱 de `一生爱你` dans le volet, 1 024 px barre dépliée → un volet ; en un volet : pas de « Choisis un
  chant » ni de lecture des setlists, tablette debout (boutons, Retour), téléphone (tout dans ⋯). Vus rouges (13
  échecs) puis verts sur les cinq projets.
- Reprise après la coupure (05/10/2026) : le travail laissé non commité par l'agent coupé a été relu et gardé.
  Corrigé à la reprise : sur `/songs` en deux volets, aucun halo avant l'hydratation (celui de la liste caché par le
  CSS, celui de « Choisis un chant » posé par React). Désormais un seul halo pour `/songs`, posé par `ChantsVolets`
  (variante `chants` de `Halo`) : le CSS en fait le bleu des accords à gauche en un volet, le vert des couplets à
  droite en deux volets (`--halo-chants`, `.halo-chants`) ; juste dès le premier affichage, sans React. Les
  enveloppes de la liste et de « Choisis un chant » perdent leur fond (celui du `body` suffit) pour ne pas le couvrir.
  Specs existantes ajustées au volet de gauche : `key-selector` et `recommended-key` (le sélecteur de tonalité lu
  dans la barre du chant, la liste a son choix de thème), `harmonie-idees` (bouton dès la tablette debout ;
  « nouveau » lu dans la feuille), `look-barres` (zone comparée depuis le bord gauche des barres), `look-halo`
  (`/songs` en deux volets : vert des couplets à 12 %, à droite), `navigation-grand-ecran` (en deux volets, la
  liste se décale des 180 px entiers en réduisant la barre), `export-pdf` (PDF du chant par le bouton de la barre
  dès la tablette debout), `performance-mode` et `nouveau-chant` (sélecteur de tonalité lu dans la barre du chant).
  Revérifié : `chants-deux-volets` 36 verts, 34 sautés (tests d'une autre disposition) ; `tsc` propre ;
  ESLint sans erreur (avertissements déjà présents sur `SongListClient` et `SongDetailClient`) ; specs voisines
  repassées (`songs-list-return` réécrite pour lire l'opacité de la liste, `songs-index`, `look-recents`,
  `look-halo`, `look-halo-defilement`, `look-barres`, `recommended-key`, `key-selector`, `copy-lyrics`,
  `navigation-grand-ecran`, `look-navigation`, `look-zone-sure`, `look-fondations`, `i18n-hydration`,
  `harmonie-idees`, `harmonie-catalogue`, `service-worker`, `section-labels`, `back-office-coupe`,
  `accords-voisins-zh`, `pinyin-espace` : 511 tests, puis les 36 rouges dus au volet de gauche corrigés et
  repassés) ; specs des setlists et du mode louange (`export-pdf`, `lignes-accords`, `lignes-chinoises`,
  `fusions-dp`, `harmonie-ma-version`, `setlist-history`, `setlist-version`, `coup-d-oeil`, `look-louange`,
  `performance-mode`, `nouveaux-membres`, `rappels-regroupes`, `setlist-deux-volets`, `setlist-g`,
  `setlist-regie`, `harmonie-setlist`, `harmonie-jianpu`, `jianpu-tonalite-cho`, `mode-louange-colonnes` :
  1 020 verts ; 8 rouges dus à T5 corrigés, 2 dus à la charge — `look-louange` 667 × 375 à 31,999 px,
  `setlist-g` « rouvre » — verts une fois repassés) ; `nouveau-chant` avec `abba-pere` et `一生爱你` vert.
  Captures regardées (ordinateur 1 280 et 1 440, tablette couchée, tablette
  debout) : conformes à `chants-accueil` et `Main` (sans « + Setlist », question 5).
- **Reste après T5** : T6 (finitions : captures FR/ZH clair et sombre sur les cinq projets, suite complète,
  `graphify update .`).
- À faire par Timothée : aucune règle à publier (`access.ts` et `firestore.rules` inchangés ; la lecture bornée
  `date ≥ aujourd'hui`, tri par `date` n'a besoin que de l'index simple, créé d'office). Relire 选择一首诗歌,
  接下来的歌单 et les deux sous-titres. Regarder Chants sur l'ordinateur (barre dépliée et réduite) et sur l'iPad
  couché : la liste qui reste en place d'un chant à l'autre, les cartes « Prochaines setlists », un chant de carte
  qui s'ouvre dans la tonalité de la setlist.

**T6 — faite le 05/10/2026** (branche `lot/u5-deux-volets`, commit `feat(U5): T6 — finitions…`, après `3812992`).
Rien ne change à l'écran, sauf l'app Android installée, qui tourne désormais avec la tablette.
- **Manifeste** (question 7) : `orientation: "portrait"` retiré de `src/app/manifest.ts` ; `coherence.spec.ts` vérifie
  qu'aucune orientation n'est imposée (vu rouge, puis vert).
- **Parcours du dimanche** (`tests/deux-volets-finitions.spec.ts`, nouveau, ajouté à `SPECS_GRAND_ECRAN`) : sur les cinq
  projets, interface en français puis en 中文, clair puis sombre (4 tests par projet, 20 en tout) — Chants (« Choisis
  un chant » et sa carte en grand, absent en un volet), `abba-pere`, `一生爱你`, la setlist (Liste et bascule sur G,
  Sommaire en deux volets), ses partitions au chant ZH sur son scan (toucher sa ligne ou son entrée du sommaire), le
  mode louange (« 2 colonnes » pressé en grand, absent ailleurs). À chaque écran : rien ne déborde en largeur, la
  langue de la page, le fond clair ou sombre ; les libellés du lot lus dans la langue (目录, 曲目列表, 选择一首诗歌,
  敬拜模式, 双栏). Avec `PW_CAPTURES`, une capture par écran : 120 regardées par échantillon aux cinq tailles, FR et
  中文, clair et sombre, comparées à `chants-accueil`, `setlist-deux-volets`, `setlist-g-telephone(-partitions)`,
  `setlist-g-tablette`, `tablette-portrait-chant`, `mode-louange-2-colonnes` : conformes. Écarts connus, hors lot :
  accords en encre et non en bleu dans les partitions quand les couleurs par section sont actives (choix du
  15/09/2026, `SongView.tsx`, couleurs gelées) ; chrome du mode louange d'aujourd'hui (question 1) ; « orig. » non
  traduit, comme avant.
- **Tests existants ajustés** : `mode-louange-colonnes.spec.ts` entre dans `SPECS_GRAND_ECRAN` et perd son describe
  « tablette couchée » (l'iPad tourné de T1), remplacé par le vrai projet `tablette-paysage`. `setlist-g.spec.ts`,
  « « Partitions » rouvre là où on était » : échouait 2 fois sur 5 sur téléphone (adresse `chant=1`). Diagnostic
  (journal posé puis retiré) : le `scrollBy` du test n'est pas un geste, il ne lâchait pas le chant amené ; un scan
  arrivé pendant la tenue de 2 s ramenait le chant 2 sous la barre, et le « −20 » qui suit faisait lire, à juste
  titre, le chant 1. L'app avait raison ; le test pose maintenant un doigt (`touchstart`) avant de défiler, comme un
  vrai défilement : 59 verts sur 60 répétitions (un échec isolé sur tablette sous charge, non reproduit en 25).
- Vérifié : `deux-volets-finitions`, `mode-louange-colonnes`, `coherence`, `setlist-deux-volets`, `chants-deux-volets`,
  `setlist-g` sur les cinq projets : 250 verts, 118 sautés (tests d'une autre disposition), 1 rouge (le test ci-dessus,
  corrigé). `tsc` propre ; ESLint propre sur les fichiers touchés.
- **Pas fait ici** : la suite complète (elle tourne à l'intégration du chantier, consigne des copies de travail) ;
  `graphify update .` (le graphe vit dans le dossier de Timothée, `graphify-out/` est ignoré par git : à lancer après
  la fusion).
- **Reste** : rien pour U5, hors suite complète et graphe à l'intégration.
- À faire par Timothée : aucune règle à publier (`access.ts` et `firestore.rules` inchangés sur tout le lot). Relire le
  中文 du lot (双栏, 目录, 复制全部歌词, 曲目列表, 选择一首诗歌, 接下来的歌单 et les sous-titres). Sur une tablette
  Android, réinstaller l'app (ou attendre la mise à jour du manifeste) pour qu'elle tourne en paysage. Prévenir
  l'équipe avant la mise en ligne (question 2 : un trait posé en une colonne ne s'affiche pas en deux colonnes).
