# Annexe de spec · corrections du design · groupe Chants

Source : planche `docs/planches/planche-corrections-chants.html` ; décisions : recommandations (Timothée, 03/11/2026)

Dix constats retenus (chants-15, écarté et gelé : coupe du scan 简谱, n'est pas repris). Un constat qui n'est qu'un exemple d'un chantier va dans la tranche du chantier. Les numéros de ligne ont été vérifiés dans le code le 03/11/2026 ; ils bougeront dès la première tranche, rechercher par le texte cité.

| id | tranche | effort |
|---|---|---|
| chants-2 | T1 | petit |
| chants-3 | T1 | petit |
| chants-4 | T1 | petit |
| chants-5 | T1 | petit (le menu « Thème » nommé : voir T3) |
| chants-8 | T1 | petit, plus une vérification 简谱 |
| chants-11 | T1 | petit |
| chants-9 | T1 | petit |
| chants-10 | T1 | petit |
| chants-14 | T1 | petit |
| chants-6 | T3 | petit à moyen |

Ordre dans T1 : chants-2 avant chants-8 (chants-8 B annule le `px-4` posé par chants-2). T2 et T4 : aucun constat de ce groupe en propre ; T5 : aucun.

Rappels valables pour toutes les entrées :
- Libellés en français ET en chinois (`src/locales/fr.json`, `src/locales/zh-CN.json`), insérés en texte, jamais par `json.dump`.
- Les couleurs d'accords, de 简谱 et de sections sont citées comme repères, jamais modifiées (zones gelées).
- Les commandes de 36 à 40 px existantes (barre du chant, pastilles et menus de Statistiques, boutons d'en-tête de la tablette) restent hors lot ; seules les commandes créées ou redimensionnées ici passent à 44 px.
- Aucun nom réel de membre dans les tests : noms fictifs.

---

### chants-2 · Barre d'outils du chant collée aux bords sur téléphone
- Tranche : T1
- Décision : A, aligner les deux rangées sur la gouttière de 16 px (B, une seule rangée avec le reste dans ⋯, se rediscute avec le chantier des barres d'outils ; garde donc les deux rangées de la décision Q5 de `docs/spec-barre-chant.md`).
- À faire :
  - `src/app/songs/[slug]/SongDetailClient.tsx:347` (rangée `rangee-chant`) : `px-1.5` devient `px-4`.
  - `src/app/songs/[slug]/SongDetailClient.tsx:434` (rangée `actions-tel`) : `px-1.5` devient `px-4`. Elle garde `overflow-x-auto` : la marge reste sur le contenu, les boutons passent sous le bord de l'écran au lieu d'être tranchés à 16 px.
  - Aucune clé de langue.
  - Attention : `src/app/globals.css:665` pose déjà `.rangee-chant { padding-inline: 1rem; }` dans un bloc propre à un écran large ; vérifier que le `px-4` n'est pas redondant ni contradictoire avec lui, et que chants-8 B (voir plus bas) l'annule bien dans les volets.
- Critères : sur téléphone (412 et 390 px), le retour, le titre, la pastille de ton, le début de la 2e rangée et la fin de la capsule sont à 16 px des bords ; un seul bord gauche du haut de l'écran jusqu'au titre. La rangée perd 20 px de largeur (380 px restent à 412) ; la capsule de ton garde environ 220 px en français et 185 px en chinois avec 拼. Rien de changé sur tablette portrait, tablette paysage, ordinateur et 1 440 px (là, le bord est réglé par chants-8). Clair, sombre, français, chinois.
- Test : adapter `tests/barre-chant.spec.ts` (déjà dans `SPECS_GRAND_ECRAN`) : ajouter, sur le projet téléphone, la mesure `boundingBox().x === 16` du bouton retour et du début de la 2e rangée.
- Points de vigilance de la planche : le correctif n'est valable dans les volets que si chants-8 B annule ce `px-4` .

### chants-3 · L'état actif des boutons Accords et Pinyin est presque invisible
- Tranche : T1
- Décision : A, encre pleine (`bg-foreground text-background`), avec `aria-pressed`. C (témoin lumineux) seulement si deux pastilles noires pèsent trop sur un vrai téléphone, auquel cas le point d'Accords prend `--fr-accent` (zone gelée citée en repère) : à arbitrer alors.
- À faire :
  - `src/app/songs/[slug]/SongDetailClient.tsx:396-402` (bouton Accords) et `:410-416` (bouton Pinyin) : l'état actif `bg-card text-foreground shadow-sm` devient `bg-foreground text-background`, sans ombre ; l'éteint garde `text-muted-foreground hover:text-foreground`, sans fond.
  - Ajouter `aria-pressed={customize.showChords}` et `aria-pressed={customize.showPinyin}` (absents aujourd'hui).
  - Transition : `transition-all duration-150` devient `transition-colors` sur `background-color` 150 ms ease-out ; avec `prefers-reduced-motion`, changement immédiat (vérifier la règle globale existante avant d'en ajouter une).
  - Libellés inchangés : `songs.detail.chords` (Accords / 和弦), `songs.detail.pinyin` (Pinyin / 拼音). Aucune clé.
- Critères : actif = fond `#1c1c1e` et icône blanche en clair, fond `#f2f2f7` et icône `#1c1c1e` en sombre (aujourd'hui l'écart est nul en sombre : `--card` et `--raised` valent tous deux `#1c1c1e`) ; éteint lisible sans fond. Vu sur téléphone (chant chinois : ♫ et 拼 actifs par défaut ; chant chinois Pinyin éteint et Accords actif) et tablette (« Accords » actif avec son libellé), clair et sombre. Contraste texte actif/fond au moins 4,5:1 dans les deux thèmes.
- Test : adapter `tests/barre-chant.spec.ts` : `aria-pressed` « true » puis « false » après un clic sur chaque bouton ; couleur de fond calculée différente entre actif et éteint en clair et en sombre.
- Points de vigilance de la planche : sur un chant chinois deux pastilles noires côte à côte sont les éléments les plus forts de la barre (elle s'escamote au défilement) ; regarder sur un vrai téléphone.

### chants-4 · La lettre du ton est nue, à côté de « A− A+ »
- Tranche : T1
- Décision : A, un mot devant la lettre (« Ton A » en interface française, « 调 E » en interface chinoise ; le mot suit la langue de l'interface, pas celle du chant).
- À faire :
  - `src/app/songs/[slug]/_components/PiluleTonalite.tsx:36-39` (`data-testid="tonalite-courante"`) : faire précéder la lettre du mot `t("customize.panel.keyCourt")` en 13 px semi-gras `text-muted-foreground`, la lettre passant en 15 px gras `text-foreground`. Le suffixe `(orig.)`/`(reco.)` reste réservé à l'ordinateur (`hidden lg:inline`, comme aujourd'hui).
  - Nouvelle clé `customize.panel.keyCourt` dans `src/locales/fr.json` (près de `customize.panel.key`, l. 613) : « Ton » ; dans `src/locales/zh-CN.json` (près de la clé `key`, l. 608) : « 调 ».
  - Le `<select>` natif garde son `aria-label` (`customize.panel.key`) : le texte visible reste `aria-hidden`, un lecteur d'écran lit le contexte.
  - Ne pas modifier le badge `A` du titre (`SongView.tsx`).
- Critères : téléphone, chant français « Ton A ⌄ » ; chant chinois en interface chinoise « 调 E ⌄ » ; l'ordinateur garde le suffixe « (orig.) / (原调) » ; la pilule tient avec la gouttière de 16 px de chants-2 (environ 26 px de plus) et avec 拼 (le ton y est un peu plus étroit). Clair et sombre, quatre dispositions.
- Test : adapter `tests/key-selector.spec.ts` et `tests/chants-deux-volets.spec.ts`, qui lisent `tonalite-courante` (`toHaveText(/^G/)`, `/^F/`) : ces expressions commencent par la lettre et cassent avec le mot. Les rendre indépendantes du mot (`/G/`) ou viser un sous-élément ; ajouter une vérification du mot en fr et en zh.
- Points de vigilance de la planche : aucun de plus que « le ton reste un peu plus étroit avec 拼 ». Cas non capturé : chant dont le ton recommandé diffère de l'original, suffixes côte à côte.

### chants-5 · Statistiques n'est qu'un rond de 36 px sans libellé sur téléphone
- Tranche : T1 (la partie « menu Thème nommé » est l'exemple d'un chantier : elle se livre avec T3, voir ci-dessous)
- Décision : B, deux liens texte libellés, mêmes mots aux quatre dispositions (« Statistiques » / « 统计 » et « Proposer un chant » / « 推荐新诗歌 »).
- À faire :
  - `src/components/songs/BoutonStatistiques.tsx:17` : la variante `icone` (`size-9 rounded-full px-0`, icône seule) disparaît ; sur téléphone le bouton affiche l'icône `ChartColumn` et le libellé `backOffice.entrees.statistiques` (fr « Statistiques », zh « 统计 », déjà présents), 14 px semi-gras, 44 px de haut. Le `aria-label` devient inutile.
  - `src/components/songs/SongProposalDrawer.tsx:122-130` (variante téléphone, lien `Music4`) : libellé `t("proposition.titre")` (« Proposer un nouveau chant ») remplacé par `t("songs.list.proposer")` (« Proposer un chant » / « 推荐新诗歌 », clé existante) ; 44 px de haut. Le titre du tiroir (`proposition.titre`, l. 138) ne change pas.
  - `src/app/songs/SongListClient.tsx:327-340` (ligne du compteur) : « 383 chants » à gauche, puis les deux boutons ; sur la largeur disponible, quand la ligne ne suffit pas, le compteur passe seul sur sa ligne au-dessus des deux boutons. Mesures de la planche : la ligne offre 352 px à 412 px (compteur 68 + boutons 270, il reste 2 px), 330 px à 390 px (ne tient plus), 300 px à 360 px. Le repli doit se déclencher sur la largeur réelle (`flex-wrap` ou requête de conteneur), pas seulement quand un filtre est posé (« 12 résultats sur 383 » est plus long que « 383 chants »).
  - Menu des thèmes (`SongListClient.tsx:274-292`) : le complément de la planche (« Thème ⌄ » / « 主题 ⌄ » quand aucun thème n'est choisi, pour que le menu tienne sur la ligne des langues dans les deux langues) applique la règle de chants-6 B : à faire dans T3, avec la clé `songs.list.filterThemeNom` = « Thème » / « 主题 » (aucune clé de `songs.list` ne porte ce mot seul ; `filterTheme` vaut « Tous les thèmes » / « 所有主题 », `filterThemeLabel` « Filtrer par thème »).
  - Dès 768 px rien ne change : le bouton « Proposer un chant » et « Statistiques » restent dans l'en-tête (`ChantsVolets`, `md:hidden` du `span` l. 336).
- Critères : téléphone 412, 390 et 360 px, français et chinois, avec et sans filtre posé : les deux boutons mesurent 44 px de haut, aucun ne se coupe, aucun débordement horizontal ; le compteur repasse seul sur sa ligne quand la ligne ne suffit pas. En chinois « 推荐新诗歌 » est inchangé. Tablette et ordinateur : inchangés.
- Test : adapter `tests/agencement-v18-chants.spec.ts:160-176`, qui attend aujourd'hui « Proposer un nouveau chant » dans la liste sur téléphone : le libellé devient « Proposer un chant » ; ajouter la mesure de hauteur (44 px) et l'absence de débordement à 412, 390 et 360 px avec et sans filtre. La spec doit tourner sur les quatre dispositions (vérifier qu'elle figure dans `SPECS_GRAND_ECRAN`, `playwright.config.ts`).
- Points de vigilance de la planche : à 412 px la ligne ne tient qu'à 2 px près et à 390 px elle ne tient plus ; non dessiné, la ligne avec un filtre posé et 360 px sont à vérifier en vrai ; les maquettes sont dessinées avec Inter Tight (largeurs proches, à quelques pour cent) alors que le site utilise la police du système. Option C (actions remontées dans l'en-tête) non retenue : elle rouvrait la décision v18 A5/R7.

### chants-8 · Bords incohérents entre le volet du chant, l'en-tête et la liste
- Tranche : T1
- Décision : B sur ordinateur (volet du chant sans marge intérieure) et R2 sur tablette (les actions d'en-tête prennent la gouttière du rail A–Z).
- À faire :
  - `src/app/globals.css`, trois blocs « volets » identiques : tablette paysage tactile (l. 691-701), ordinateur à barre réduite (l. 704-714), ordinateur à barre dépliée (l. 717-727) : dans chacun, `main.song-zoom` et `.rangee-chant` passent en `px-0` (annuler aussi le `px-4` posé par chants-2, voir cette entrée) et `.chants-chant` prend `padding-right: var(--marge-page)`. Écrire la règle dans les trois blocs, sans en oublier un. La variante A (marge droite seule, `calc(var(--marge-page) - 1rem)`) est écartée.
  - Tablette portrait, liste sur une colonne : les actions d'en-tête (« Statistiques », « Proposer un chant ») reculent de 28 px pour finir où finissent la recherche et la liste (786 px devient 758 px sur la capture de 810 px). La gouttière de 28 px est le `pr-7` de `src/app/songs/SongListClient.tsx:252` ; aligner l'en-tête (`src/app/songs/ChantsVolets.tsx`, bloc `chants-entete`) sur la même gouttière.
  - Aucune clé de langue.
- Critères : ordinateur 1 440 px, barre dépliée : « Choisis un chant » et le titre du chant commencent tous deux à 712 px (aujourd'hui 712 et 728), le chant finit à 1 400 comme « Proposer un chant » (aujourd'hui la pastille « A » finit à 1 424) ; ouvrir un chant ne déplace plus le contenu. Mêmes mesures à vérifier à l'œil sur la tablette paysage et l'ordinateur à barre réduite (marge de 28 px au lieu de 40), non dessinés. Tablette portrait : en-tête, recherche et liste finissent au même x (758 px sur 810). La colonne du chant gagne jusqu'à 32 px, donc la 简谱 s'élargit d'autant : la regarder sur un chant certifié (`npm run jianpu:audit <slug>`), calque des accords inclus.
- Test : adapter `tests/chants-deux-volets.spec.ts` (déjà dans `SPECS_GRAND_ECRAN`) : comparer le `x` gauche et le `x` droit des éléments de l'en-tête, du volet « Choisis un chant » et du chant ; ajouter un cas tablette portrait (`tests/agencement-v18-chants.spec.ts`). Contrôle visuel du 简谱 sur un chant certifié.
- Points de vigilance de la planche : B n'est dessinée que sur ordinateur à barre dépliée ; la tablette paysage et la barre réduite reçoivent le même correctif sans avoir été regardées ; R1 (rail dans la marge) écartée, conflit avec le geste de bord de l'iPad.

### chants-11 · Ligne de l'auteur trop lourde dans l'en-tête d'un chant chinois
- Tranche : T1
- Décision : A, l'auteur devient une ligne de crédit (repli si rien ne convient : ne rien changer). B (sous-titre et auteur sur une ligne) et C (graisse Regular de Source Han) ne sont pas retenues.
- À faire (cause : la classe `zh_lyric_font` s'applique à toute la ligne dès que le chant est chinois, d'où le latin du nom en Source Han Sans Medium 500), dans `src/components/song/SongView.tsx` :
  - Ligne de l'auteur (l. 814-816) : pile de polices Atkinson Hyperlegible Next Regular d'abord (`chord_font.style.fontFamily`), puis Source Han Sans CN Medium (`zh_lyric_font.style.fontFamily`) : Atkinson n'a aucun caractère chinois, le navigateur ne prend Source Han que pour les caractères chinois (le latin repasse en 400). Écrire la pile avec les `style.fontFamily` des deux `localFont`, plutôt qu'avec la classe seule.
  - Taille 13 px devient 12 px (`text-[12px]`), hauteur de ligne 16 px (`leading-4`), couleur `text-muted-foreground` pleine (jamais `/80`, sous 4,5:1 en clair), `mt-1` devient `mt-2` (8 px au-dessus : deux groupes, le nom du chant puis le crédit).
  - Ligne de la référence biblique (l. 818-820, `data-testid="reference-biblique"`) : même pile de polices ; sa taille 12 px, son `mt-0.5` et son `/80` ne bougent pas ici.
  - Chants français : l'auteur passe aussi à 12 px avec 8 px au-dessus (une seule règle pour tous les chants).
  - Titre (l. 795) et pinyin (l. 806-808) ne changent pas, ni le sous-titre (l. 810, `data-testid="sous-titre"`, même style que le pinyin : spec JE3, `docs/spec-jianpu-entete-statistiques.md`). Aucune clé de langue, aucun fichier de police de plus.
- Critères : l'auteur d'un chant chinois n'est plus plus lourd que le pinyin et le sous-titre ; le nom latin est en graisse 400. Hauteur du bloc : environ 4 px de plus (1 px de corps gagné, 4 px d'écart ajoutés), identique aux quatre dispositions (même composant). Cas à regarder : chant chinois avec sous-titre, sans sous-titre avec référence biblique (le cas le plus courant), nom d'auteur long qui passe à la ligne ; chant français. Téléphone 390 px, tablette 820 px, ordinateur 1 280 et 1 440 px, clair et sombre. Contraste 5,22:1 en clair et 7,33:1 en sombre sur fond de page ; 4,71:1 sur le halo orangé `#fdf1ea`.
- Test : adapter `tests/entete-chant-jianpu.spec.ts` (sous-titre, auteur, référence biblique) : lire `getComputedStyle` de la ligne de l'auteur (taille 12 px, `font-weight` du premier glyphe latin à 400, marge haute 8 px) sur un chant chinois et un chant français, aux quatre dispositions.
- Points de vigilance de la planche : les caractères chinois du nom (林雨婷) restent en Source Han Medium et à 12 px se fondent ; la capture en tablette paysage ne montre pas le titre (probablement un défilement) : à vérifier à part, ce n'est pas ce constat. Hors lot, noté : `text-muted-foreground/80` de la référence biblique à 12 px donne 3,48:1 en clair (4,92:1 en sombre), à ouvrir comme constat séparé.

### chants-9 · « Choisis un chant » : carte de setlist étroite, pastilles de ton loin des titres
- Tranche : T1
- Décision : la correction recommandée du tableau (l'alternative, « Prochaines setlists » et « Nouveaux au répertoire » côte à côte sur `minmax(240px, 1fr) minmax(320px, 1.4fr)`, n'est pas retenue).
- À faire dans `src/app/songs/ChoisisUnChant.tsx` :
  - Ligne 154 : la grille des setlists `[grid-template-columns:repeat(auto-fill,minmax(216px,1fr))]` devient `repeat(auto-fill,minmax(216px,300px))` : une carte seule fait 300 px au plus.
  - « Nouveaux au répertoire » (le `CarteChants` de la ligne 183-190) : ses chants passent en deux colonnes `grid grid-cols-2 gap-x-7` dès 560 px de volet, comme « Les plus chantés » juste dessous (l. 194). La largeur à mesurer est celle du volet (conteneur), pas de la fenêtre : requête de conteneur dans `globals.css` (comme `@container` de `.rangee-chant`, l. 647-651) ou équivalent.
  - Aucune clé de langue.
- Critères : volet de 560 px et de 620 px (ordinateur 1 440 px, barre dépliée et réduite ; tablette paysage) : une carte de setlist seule ne dépasse pas 300 px ; la pastille de ton n'est plus loin du titre ; « Nouveaux au répertoire » en deux colonnes dès 560 px, une colonne en dessous. Clair et sombre, français et chinois (titres chinois dans la liste).
- Test : adapter `tests/chants-deux-volets.spec.ts` : mesurer la largeur de la carte de setlist (≤ 300 px) et le nombre de colonnes de « Nouveaux au répertoire » à deux largeurs de volet.
- Points de vigilance de la planche : l'« après » est un dessin aux jetons du site, pas un rendu du code.

### chants-10 · Ligne de tempo trop petite et trou entre ♩ et « = 92 »
- Tranche : T1
- Décision : la correction recommandée du tableau (le ♩ à la taille du texte, espaces fines ; l'alternative « chiffres tabulaires et ligne alignée sous la pastille, sans changer la taille » n'est pas retenue).
- À faire dans `src/components/song/SongView.tsx` :
  - Lignes 783-788 (le `<span>` du tempo) : le ♩ passe de `text-[15px] leading-none` (l. 785) à la taille du texte (`1em`), sans `gap-0.5` ni espace ordinaire : écrire « ♩ = 92 » avec des espaces fines insécables (U+202F) autour du signe égal.
  - Ligne 835 (`data-testid="ligne-tempo"`) : `text-[11px]` devient 12 px sur téléphone et 13 px dès 768 px (`text-[12px] md:text-[13px]`), couleur `text-foreground/70` au lieu de `text-muted-foreground` (valeur donnée par la planche ; vérifier le contraste en clair et en sombre avant de figer).
  - Aucune clé de langue.
- Critères : « 1=E · 4/4 · ♩ = 92 » sans trou visible entre ♩ et le signe égal ; 12 px au téléphone, 13 px à partir de la tablette portrait ; reste aligné sous la pastille de ton ; la ligne ne déborde pas (`whitespace-nowrap`). Clair et sombre, chant français et chinois.
- Test : adapter `tests/entete-chant-jianpu.spec.ts` : lire `ligne-tempo` (taille calculée 12 px puis 13 px, texte « ♩ = 92 » avec U+202F) sur téléphone et sur les autres dispositions.
- Points de vigilance de la planche : le trou est confirmé à l'œil ; la variante « 11 px » dessinée (`♩= 92`) est une piste abandonnée.

### chants-14 · Statistiques : état vide fondu dans le fond et sans action
- Tranche : T1
- Décision : la correction recommandée du tableau (remplacer la carte par le composant `EtatVide` ; l'alternative « garder la carte en relief et y ajouter seulement le bouton » n'est pas retenue). Cette entrée unifie les états vides de la page.
- À faire :
  - `src/app/songs/statistiques/StatistiquesClient.tsx:304-307` : la carte `<p role="status" className="raised rounded-2xl ...">` est remplacée par `<EtatVide role="status" titre={t("stats.aucuneSetlistPeriodeTitre")} action={...} />` (`src/components/layout/EtatVide.tsx`, cadre pointillé).
  - Action : bouton contour, 44 px de haut, libellé `stats.voirDepuisDebut`, qui choisit la période « Depuis le début » (`choisirPeriode("debut")`, l. 217) ; aucune action quand la période est déjà « debut ».
  - Clés à créer dans `src/locales/fr.json` et `src/locales/zh-CN.json` (bloc `stats`, près de `aucuneSetlistPeriode`, l. 4090 fr / l. 4045 zh) :
    - `stats.aucuneSetlistPeriodeTitre` : « Aucune setlist publiée sur cette période » (sans point final) / « 这段时间内没有已发布的歌单 » (sans « 。 »).
    - `stats.voirDepuisDebut` : « Voir depuis le début » / « 改为从头开始 ».
  - La clé `stats.aucuneSetlistPeriode` (avec son point final) est conservée : voir si elle sert ailleurs (`grep`) avant toute suppression, sinon la signaler comme code mort sans la supprimer.
  - Les autres états vides de la page (`aucunChantLangue`, `aucuneSetlist`) : passer à `EtatVide` seulement s'ils ont la même forme ; sinon les laisser et le noter.
- Critères : période vide avec une période autre que « Depuis le début » : cadre pointillé, titre, bouton « Voir depuis le début » qui bascule la période et recharge ; période « Depuis le début » vide : titre seul, pas de bouton. Téléphone, tablette, ordinateur, 1 440 px ; clair, sombre ; français, chinois (« 改为从头开始 »).
- Test : adapter `tests/statistiques.spec.ts` (période « Dates libres », l. 295) : cas période vide avec bouton, clic, période « Depuis le début » ; cas sans bouton.
- Points de vigilance de la planche : seul l'état vide a été capturé, les statistiques avec données ne sont pas auditées ; ce passage de la carte en relief au cadre pointillé va dans le sens de la recette de surface de T2 (ombre réservée à ce qui flotte).

### chants-6 · Statistiques : période coupée au bord et filtre seul sur sa ligne
- Tranche : T3 (la règle « un filtre non posé porte son nom, posé il passe à l'encre » est celle du chantier des contrôles de choix ; le fondu latéral de A en est l'amorce)
- Décision : B, A plus des menus nommés par leur critère.
- À faire :
  - `src/components/layout/Onglets.tsx:170-178` (composant `Pilules`) : brancher `useFonduLateral` (`src/hooks/useFonduLateral.ts`) sur la rangée `data-onglets="pilules"` et lui ajouter la classe `fondu-lateral` (`src/app/globals.css:30`, 24 px de fondu du côté qui reste à voir), comme `SectionTabs.tsx:39` et `:147`. `Pilules` est partagé : toutes les rangées de pastilles du site (planning compris) gagnent l'indice de défilement, à contrôler sur chacune.
  - `src/app/songs/statistiques/StatistiquesClient.tsx:368-408` (`Filtres`) : les trois menus passent sur une 2e ligne (le `<div className="min-w-0 max-w-full">` des périodes prend toute la ligne) ; le séparateur vertical (`<span className="mx-1 hidden h-6 w-px bg-border sm:block">`, l. 384) disparaît.
  - Menus (`Choix`, l. 430-443) : quand rien n'est choisi, le menu affiche le nom de son critère : `stats.service` (« Service » / « 聚会 »), `stats.langue` (« Langue » / « 语言 »), `stats.presidence` (« Présidence » / « 主领 »), clés existantes (`fr.json` l. 4069, 4074, 4076 ; `zh-CN.json` l. 4024, 4029, 4031). La première option du menu garde « Tous les services », etc. Un menu où une valeur est choisie affiche cette valeur sur fond encre (`bg-foreground text-background`), comme une pastille active. Largeur du menu : plus celle de l'option la plus longue du `<select>` ; le libellé est dessiné et le `<select>` natif reste transparent par-dessus, comme `PiluleTonalite.tsx:34-55`.
  - Menu des thèmes de la liste des chants (`src/app/songs/SongListClient.tsx:274-292`, complément de chants-5) : même règle, avec la clé nouvelle `songs.list.filterThemeNom` = « Thème » / « 主题 » (voir chants-5). Les trois champs de dates « Du / Au » de « Dates libres » ne changent pas.
- Critères : au repos, une seule ligne de pastilles (période) et une seule ligne de trois menus, mesurée à environ 320 px pour 380 px disponibles sur téléphone, à toutes les dispositions : plus d'orphelin « Toutes les présidences » ; « 自选日期 » n'est plus coupé et un fondu de 24 px annonce « Dates libres » ; une valeur choisie passe à l'encre ; plus de `<select>` natif visible (les menus sont des pastilles). Téléphone 412 et 390 px, tablette portrait 820 px, tablette paysage, ordinateur et 1 440 px ; clair, sombre ; français, chinois. Une valeur longue (nom de service) peut refaire passer la ligne en deux : acceptable.
- Test : adapter `tests/retouches-v18-pilules-stats.spec.ts` (pastilles et menus de Statistiques) et `tests/statistiques.spec.ts` ; mesurer le nombre de lignes de filtres, la présence du fondu, le texte du menu avant/après choix (clair, puis encre) ; test du fondu sur une autre rangée de `Pilules` (planning). La spec doit figurer dans `SPECS_GRAND_ECRAN` (`playwright.config.ts`).
- Points de vigilance de la planche : au repos à 412 px « Depuis le début » finit à 6 px du bord, le fondu de 24 px n'en efface que la fin et rien n'annonce « Dates libres » (en chinois « 自选日期 » reste coupé) : l'indice n'apparaît qu'en défilant, à vérifier en vrai ; une fois « Culte Franco » choisi, le menu à l'encre ne dit plus qu'il s'agit du service (acceptable, à regarder). Pistes A (sans menus nommés) et C (période en menu, quatre menus) non retenues. Cette règle est à étendre au chantier 3 de l'audit.
