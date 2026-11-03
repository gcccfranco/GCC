# Annexe de spec · corrections du design · groupe Dimanche

Source : planche `docs/planches/planche-corrections-dimanche.html` ; décisions : recommandations (Timothée, 03/11/2026)

Vingt constats retenus (dimanche-12, -18, -19 et -22 sont écartés à la revue ; dimanche-2 n'existe pas dans la planche : 24 constats, de 1 à 25). Un constat qui n'est qu'un exemple d'un chantier va dans la tranche du chantier : dimanche-7, -8, -9 (règle de largeur L1) et dimanche-15 (plancher de 12 px) vont en T4, dimanche-21 (menu natif) en T3. Les numéros de ligne ont été vérifiés dans le code le 03/11/2026 ; ils bougeront dès la première tranche, rechercher par le texte cité.

| id | tranche | effort |
|---|---|---|
| dimanche-1 | T1 | petit |
| dimanche-4 | T1 | petit |
| dimanche-10 | T1 | petit |
| dimanche-13 | T1 | moyen (rendu commun à la page chant) |
| dimanche-11 | T1 | moyen (pagination en colonnes) |
| dimanche-3 | T1 | petit |
| dimanche-5 | T1 | moyen |
| dimanche-6 | T1 | petit à moyen |
| dimanche-16 | T1 | petit |
| dimanche-17 | T1 | petit |
| dimanche-20 | T1 | très petit |
| dimanche-23 | T1 | petit |
| dimanche-14 | T1 | petit |
| dimanche-24 | T1 | petit |
| dimanche-25 | T1 | très petit |
| dimanche-21 | T3 | petit (avec le chantier « quatre contrôles ») |
| dimanche-7 | T4 | moyen |
| dimanche-8 | T4 | petit |
| dimanche-9 | T4 | petit |
| dimanche-15 | T4 | petit |

Entrées par tranche : T1 = 15, T2 = 0, T3 = 1, T4 = 4, T5 = 0.

Ordre dans T1 : dimanche-1 et -10 touchent le même fond de barre (faire -1 d'abord) ; dimanche-16 avant dimanche-17 (« Ajouter le lien » sort du constat -17 quand -16 A est faite) ; dimanche-4 avant dimanche-6 (même fichier, `EnTeteEditeur.tsx`, et même champ `leaderPlaceholder`).

Rappels valables pour toutes les entrées :
- Libellés en français ET en chinois (`src/locales/fr.json`, `src/locales/zh-CN.json`), insérés en texte, jamais par `json.dump`.
- Les couleurs `--sec-*`, `--chord-color`, `--jianpu-color`, les couleurs de service et le logo ne bougent pas ; le chrome et la typographie du mode louange sont dégelés (13/09/2026).
- Mode louange : titres de chants gardés en capitales (`uppercase` de l'en-tête de scène inchangé).
- Chemins corrigés par rapport à la planche : le mode louange vit dans `src/components/performance/` (la planche écrit `src/components/song/PerformanceMode.tsx`, qui n'existe pas) ; la bande d'aperçu est dans `src/components/performance/PageTexte.tsx`.
- Les nouvelles clés se placent à côté des clés voisines du même objet (`setlists.*`, `performance.*`) ; vérifier à l'insertion qu'aucune clé du même nom n'existe déjà.
- Aucun nom réel de membre dans les tests : noms fictifs. Les textes d'invite actuels (`leaderPlaceholder`) citent un prénom réel du projet : à remplacer (voir dimanche-6).
- Trois appareils toujours, quatre dispositions plus 1 440 px pour les pages de lecture : toute spec qui teste un agencement est dans `SPECS_GRAND_ECRAN` (`playwright.config.ts`) ; `look-louange`, `mode-louange-forscore`, `mode-louange-colonnes`, `setlist-g`, `setlist-regie`, `setlist-deux-volets` y sont déjà.
- `node_modules` n'était pas installé lors de la rédaction : l'existence des icônes `Drum` et `UserRound` dans lucide-react (`^1.18.0`, la planche dit 1.21) est à vérifier au premier `npm install`.

---

### dimanche-1 · Mode louange : le titre du chant transparaît sous la barre du haut
- Tranche : T1
- Décision : A, barre opaque (la planche recommande A ; B et C écartées).
- À faire :
  - `src/app/globals.css:21-25` (`.material-steady`) : `background-color: hsl(var(--background) / 0.8)` devient `hsl(var(--background))` ; supprimer `-webkit-backdrop-filter` et `backdrop-filter` (flou 20 px). Le filet `shadow-[0_1px_0_hsl(var(--border))]` posé par `src/components/performance/BarreHaut.tsx:41` et `shadow-[0_-1px_0_hsl(var(--border))]` par `src/components/performance/BarreBas.tsx:42` ne changent pas. Même fond pour la barre du bas.
  - Réécrire le commentaire `src/app/globals.css:19-20` (« `.material-steady` garde voile et flou… ») : la raison du revirement est la règle V8 (le contenu ne passe plus sous les barres), appliquée au mode louange.
  - Le texte des barres ne change pas ; la pagination ne bouge pas. Aucune clé de langue.
- Critères : barre du haut affichée (première ouverture ou toucher de l'écran), plus aucun « HOSANNA », « Hillsong » ni pastille « 1 » lisible dessous, pages 1 et 2 et suivantes (rangée de rappel de structure comprise). Mesure : fond calculé de `.material-steady` d'alpha 1 et `backdrop-filter: none`, sur les cinq dispositions (téléphone, tablette portrait, tablette paysage, ordinateur, 1 440 px), clair et sombre, français et chinois.
- Test : adapter `tests/look-louange.spec.ts` (déjà dans `SPECS_GRAND_ECRAN`) : lire `getComputedStyle` de la barre du haut et du bas, alpha du fond égal à 1, pas de `backdrop-filter`. Regarder les captures à l'œil.
- Points de vigilance de la planche : A renverse un choix écrit dans le commentaire de `globals.css` (les barres du mode louange devaient « se détacher des paroles ») ; à valider en connaissance de ce commentaire, c'est fait par la décision « comme recommandé ». Quand la barre est affichée, ce qu'elle couvre est caché net au lieu d'être voilé.

### dimanche-4 · Éditeur : « Notes pour l'équipe » coupé au milieu d'un mot
- Tranche : T1
- Décision : A, libellé au-dessus du champ, comme « Note du chant », sans deux-points.
- À faire :
  - `src/components/setlists/editeur/EnTeteEditeur.tsx:343-352` (le `<label className="flex h-11 …">` avec le `<span>` du libellé et l'`<input type="text">` des notes ; la planche cite 344-352) : remplacer par un libellé de 13 px `text-muted-foreground`, à 6 px au-dessus du champ, sans deux-points, puis une zone de texte (`<textarea>`) pleine largeur : `rounded-xl border-border bg-background`, `px-3.5 py-2.5`, 15 px, `leading-snug`, `min-h-11` pour une ligne, trois lignes au plus puis défilement dans le champ, `[field-sizing:content]` ; repli deux lignes (`rows={2}`) si `field-sizing` manque (Safari iPad non vérifié). Aucun JavaScript. Le texte d'invite `setlists.form.notesPlaceholder` ne change pas.
  - `src/app/setlists/[id]/SetlistDetailClient.tsx:1945` : `<p className="mt-3 text-sm text-muted-foreground italic">` gagne `whitespace-pre-line`, sinon les retours à la ligne de la zone de texte sont perdus à la lecture (point que la planche d'origine ne traitait pas).
  - Libellé : retirer le deux-points de la clé existante `setlists.editeur.notes` (`src/locales/fr.json:424` « Notes pour l'équipe : » devient « Notes pour l'équipe » ; `src/locales/zh-CN.json:423` « 给团队的备注： » devient « 给团队的备注 »), après avoir vérifié par grep qu'aucun autre écran n'utilise cette clé ; sinon créer `setlists.editeur.notesLibelle` avec les deux libellés sans deux-points.
  - Cause confirmée : le libellé prend environ 130 px dans un volet de 352 px utiles et le champ n'a qu'une ligne.
- Critères : note de deux phrases (« Intro douce, enchaîner sans pause. Refrain en canon au dernier passage, finir sur le D tenu. ») lisible en entier, sur 1 à 3 lignes, à : téléphone, tablette portrait (pleine largeur), tablette paysage, ordinateur 1 280 et 1 440 (volet de 400 px, 352 px utiles, qui ne s'élargit pas) ; plus de coupure au milieu d'un mot. Environ 20 px de hauteur en plus. Français, chinois (« 给团队的备注 », invite « 主题、背景等… »), clair et sombre (filet `#373739`). Lecture : la note garde ses retours à la ligne.
- Test : `tests/setlist-editeur-piste2.spec.ts` (ou `tests/setlist-editor.spec.ts` selon où l'éditeur est déjà testé) : saisir la note de deux phrases avec un retour à la ligne, vérifier `scrollHeight <= clientHeight` ou trois lignes au plus, puis la page de lecture (`tests/setlist-g.spec.ts`) : le texte affiché contient le retour à la ligne (`white-space: pre-line`).
- Points de vigilance de la planche : `field-sizing` sur Safari pour iPad non vérifié (d'où le repli `rows={2}`).

### dimanche-10 · Mode louange en tablette portrait : trait orphelin au-dessus de la glissière
- Tranche : T1
- Décision : A, pas d'aperçu tant que la barre est affichée.
- À faire :
  - `src/components/performance/PerformanceMode.tsx:1031-1033` : `apercuPossible` / `apercu` ne change pas pour la pagination (le budget `APERCU_H`, l. 256, 609 et 1035, reste réservé, rien ne bouge) ; seul le rendu est masqué quand `showChrome` est vrai.
  - `src/components/performance/PageTexte.tsx:79-93` (le `<div data-apercu-suivant …>` avec le trait `h-0.5 bg-primary/70`, la bande et le dégradé) : opacité 0 quand `showChrome` est vrai (nouvelle prop ou attribut `data-chrome`), transition `opacity` seule : retour en 150 ms quand la barre s'escamote, sortie en 100 ms quand elle réapparaît, courbe `ease-out`, aucune transition avec mouvement réduit (`motion-reduce:transition-none`). La bande reste `aria-hidden` et `pointer-events-none`.
  - La règle vaut pour toutes les dispositions ; elle ne change rien visuellement ailleurs qu'en tablette portrait (la bande n'y est pas recouverte). La pastille « Ensuite : Abba Père · A » de la tablette paysage reste en place. Aucune clé de langue.
- Critères : tablette portrait, barre affichée : plus de trait de 2 px ni de bande au-dessus de la barre du bas ; barre escamotée (l'état normal en service) : l'aperçu se voit en entier, pagination inchangée. Téléphone, tablette paysage, ordinateur : aucun changement. À 1 440 px non relu par la planche : à regarder. Clair/sombre, français/chinois.
- Test : `tests/mode-louange-forscore.spec.ts` (lot L6, dans `SPECS_GRAND_ECRAN`) : barre affichée, `[data-apercu-suivant]` d'opacité 0 ; barre escamotée, opacité 1 et position inchangée.
- Points de vigilance de la planche : pas d'aperçu pendant qu'on règle quelque chose. Le vide d'environ 180 px sous « Couplet 2 » est la pagination par blocs (le Pont ne tenait pas), pas un défaut : ne pas y toucher.

### dimanche-13 · Mode louange sur téléphone : lignes coupées avec un trou et un mot orphelin
- Tranche : T1
- Décision : A, couper seulement entre deux accords.
- À faire :
  - `src/components/song/ChordLine.tsx:113-199` (ligne `flex flex-wrap items-end`, l. 119 ; segments construits l. 7-70, regroupement en mots l. 68) : chaque segment (un accord et ses paroles jusqu'à l'accord suivant) ne se coupe plus à l'intérieur ; la ligne passe à la ligne avant un accord (« D Je vois le Roi de gloire qui » puis « Bm revient sur les nuées. »). La coupure à l'intérieur d'un segment ne subsiste que s'il est plus large que l'écran. Chaque rangée commence par un accord : plus de rangée d'accords vide, un mot court peut rester seul avec son accord au-dessus (« Seigneur. » garde « Bm »).
  - Lignes chinoises : même règle pour la rangée de caractères et de pinyin (`ZhLine` dans `src/components/song/SongView.tsx`, rendu partagé aussi avec `src/components/pdf/song/lignes.tsx` pour le PDF : ne pas y toucher sans nécessité) : une rangée ne se coupe qu'avant un accord.
  - Aucune clé de langue. Le rendu est commun à la page chant, qui en profite aussi : repasser les tests 简谱 et lignes chinoises.
- Critères : téléphone (412 et 390 px), mode louange, « Couplet 1 » et « Refrain » du chant témoin : aucune rangée d'accords vide, aucune ligne qui commence par un mot sans accord quand la ligne source en avait un en cours de phrase ; les 188 chants (`PW_CHANTS_ZH=all`) sans régression de ligne chinoise coupée. Pas de changement visible quand la ligne tient. Contrôle sur la page chant (téléphone) et dans le mode louange sur les quatre autres dispositions : aucun débordement. Français et chinois, clair et sombre.
- Test : `tests/lignes-accords.spec.ts` et `tests/lignes-chinoises.spec.ts` (+ `tests/latin-ligne-chinoise.spec.ts`), à compléter d'un cas « toute rangée de la ligne commence par un accord » sur le téléphone ; relancer `PW_SLUGS=all npm test` (partitions 简谱) et `PW_CHANTS_ZH=all npm test -- tests/lignes-chinoises.spec.ts --project=telephone --workers=2`.
- Points de vigilance de la planche : touche au rendu commun des lignes ; il faut repasser les tests 简谱 et des lignes chinoises. Un mot court peut rester seul sur sa ligne (accepté).

### dimanche-11 · Mode louange en tablette paysage : « Ensuite : Abba Père · A » recouvre le bas du Pont
- Tranche : T1
- Décision : B, la pastille entre dans le flux, sous la colonne la plus courte ; A (réserver la hauteur sur la dernière page) en repli.
- À faire :
  - `src/lib/performance/columns.ts:93-` (`paginateColumns`, remplissage glouton l. 115-129) : sur la dernière page d'un chant qui est suivi d'un autre, compter la pastille comme un bloc de 56 px (environ 64 px avec la marge) posé à la fin de la colonne qui a de la place (ici la gauche, sous le Refrain, environ 120 px libres). En une colonne, elle se pose sous le dernier bloc. Si aucune colonne n'a la place, retomber sur A : retirer environ 64 px du budget de la page.
  - `src/components/performance/PerformanceMode.tsx:1254-1274` (la pastille `data-suivant`, positionnée en `absolute`, centrée, `bottom: barres.bas + 8` ou `0.625rem + var(--sab)`) : rendue dans le flux de la page (dans `PageTexte`, sous la colonne retenue, via `isLastPageOfSong` / `nextEntry` déjà passés l. 1193-1194) au lieu d'être posée en absolu ; conserver `data-suivant`, `onClick={() => goToPage(nextSongPage, pages.length)}`, l'arrêt des pointeurs et `min-h-11`.
  - Libellés inchangés : `performance.next` (« Ensuite : » / « 接下来： ») + titre + tonalité. La position change : de la pastille centrée à un bord de colonne.
- Critères : tablette paysage, dernière page du chant témoin : la pastille ne recouvre plus aucun bloc (le coin bas gauche du Pont n'est plus caché), aucune page de plus à tourner. Tablette portrait, téléphone, ordinateur, 1 440 px : la pastille est dans le flux sous le dernier bloc, ou en repli A, sans chevauchement. Français et chinois, clair et sombre.
- Test : `tests/mode-louange-colonnes.spec.ts` (dans `SPECS_GRAND_ECRAN`) : sur la dernière page, `boundingBox()` de `[data-suivant]` sans intersection avec aucun bloc ; le nombre de pages du chant ne change pas ; refaire aussi `tests/mode-louange-forscore.spec.ts`.
- Points de vigilance de la planche : la pastille se pose sous le Refrain, en bas de la colonne de gauche, alors que le Pont, dernier bloc du chant, est dans la colonne de droite et se lit après : le musicien voit « Ensuite : Abba Père » avant d'avoir lu la fin du chant. A reste le repli si cet ordre gêne (à l'essai, pas à la spec).

### dimanche-3 · Éditeur en sombre : tonalité choisie en lettre blanche sur bleu clair
- Tranche : T1
- Décision : A, la lettre suit le thème.
- À faire :
  - `src/components/setlists/editeur/Reglages.tsx:104` : `on ? "text-white" : …` devient `on ? "text-white dark:text-primary-foreground" : …` (en sombre `hsl(var(--primary-foreground))`, soit `#1c1c1e`, environ 9:1 sur `#a8bff5` ; en chinois environ 10:1 sur `--zh-accent` `#f2b8b5`). Le fond `style={on ? { background: couleur } : undefined}` (l. 70 et 105) ne change pas. En clair, rien ne change (blanc sur `#3f63cf`, 5,4:1).
  - Aucune clé de langue.
- Critères : tonalité choisie lisible (contraste d'au moins 4,5:1) en sombre pour un chant français et un chant chinois ; clair inchangé. Éditeur à 1 280 et 1 440 px, tablette, téléphone.
- Test : `tests/setlist-editeur-piste2.spec.ts` : en thème sombre, couleur calculée de la lettre de la pastille choisie égale à `--primary-foreground` ; en clair, blanc.
- Points de vigilance de la planche : la variante C (pastille teintée comme dans la liste) reste l'idée d'unification pour le chantier « quatre contrôles » (T3), pas ici.

### dimanche-5 · Éditeur en 中文 : noms de section restés en français
- Tranche : T1
- Décision : A, traduire à l'affichage, sans toucher à ce qui est stocké.
- À faire :
  - Afficher le nom de section à partir du type et du numéro, comme la page de lecture et le mode louange, avec `formatSectionName` (`src/lib/chordpro/parser.ts:184-249`, clés `songs.sections.*`) ou son équivalent sur ce que contient `item.song.sections` (id, nom ; lire sa forme avant de coder). Un nom personnalisé qui ne correspond à aucun type (comparer au nom par défaut en français) garde son nom. Le nom stocké (`nouvelleEtape(s.id, s.name)`, `item.name`) ne change pas : il fait les ids des structures, notes et annotations.
  - `src/components/setlists/editeur/Reglages.tsx:279-283` (boutons « + Intro / + Couplet 1… », `{s.name}`) et `:379-380` (colonne `data-nom-section`, `{item.name}`) ; aussi `title={item.name}` (l. 163, 380) et les libellés d'accessibilité `setlists.editeur.etape` / `retirerEtape` (l. 161, 180).
  - Le sous-titre « Hillsong · Intro, Couplet 1… » n'est pas dans `Reglages.tsx` comme la planche le laisse entendre : il est construit dans `src/components/setlists/editeur/Volets.tsx:77-78` (`noms`, `sousTitre`). Y appliquer la traduction, avec la virgule d'énumération 「、」 en chinois (« Hillsong · 前奏、主歌 1、副歌、主歌 2、桥段 ») et « , » en français.
  - Résultat en 中文 : boutons « + 前奏 », « + 主歌 1 », « + 副歌 », « + 主歌 2 », « + 桥段 » ; tableau 前奏 / 主歌 1 / 副歌 / 主歌 2 / 桥段. Les pastilles « I C1 R C2 P » restent en lettres latines (`abbreviations.ts`). Aucune clé nouvelle : les clés `songs.sections.*` existent. Si le séparateur 「、」 manque, créer `setlists.editeur.separateurSections` (fr « , », zh-CN « 、 »).
- Critères : éditeur en chinois, volet « Réglages du chant » : aucun nom de section en français sauf nom personnalisé ; en français, rien ne change. Ordinateur 1 280 et 1 440, tablette paysage, tablette portrait, téléphone ; clair et sombre.
- Test : `tests/setlist-editeur-piste2.spec.ts` (ou `tests/setlist-editor.spec.ts`) avec la langue `zh-CN` : le texte du sous-titre et des boutons « + … » contient « 前奏 » et pas « Intro ».
- Points de vigilance de la planche : distinguer un nom personnalisé d'un nom par défaut (comparer au nom par défaut en français).

### dimanche-6 · Éditeur : puces en rangées irrégulières, et un champ de présidence qui a l'air désactivé
- Tranche : T1
- Décision : B, une seule puce Présidence, puis le reste en flux (Service, Date, Présidence, puis le groupe insécable Partagée + Équipe).
- À faire :
  - `src/components/setlists/editeur/EnTeteEditeur.tsx:217-296` (conteneur `flex flex-wrap gap-2` l. 217 ; menu de présidence `<select>` l. 270-282 ; champ `<input>` « Autre » l. 288-296 ; la planche cite 270-295) : quand « Autre » est choisi (`c.leaderOther`), fusionner le menu et le champ en une puce `🎤 [Gaspard T.] ⌄` : le nom se tape dans la puce (l'`<input>`), le chevron est un `<select>` transparent de 36 px posé dessus qui rouvre la liste des présidences du service. Sans « Autre », la puce est le menu seul (« Présidence »).
  - Fond blanc forcé comme les puces voisines (`bg-background`) ; la cause du gris du champ (243 contre 255) n'est pas établie : lire le style calculé de l'`<input>` et du `<label>` des notes avant de corriger. Au focus `ring-2 ring-ring/40` ; libellé accessible `setlists.form.leaderLabel` (fr « Présidence » / zh « 主席 », l. 331/330) ; texte d'invite « Nom » / « 姓名 ».
  - Texte d'invite : remplacer `setlists.form.leaderPlaceholder` (`src/locales/fr.json:333` « ex. Timothée », `src/locales/zh-CN.json:332` « 例如：提摩太 », qui citent un prénom réel) par « Nom » / « 姓名 ». Même clé utilisée aussi l. 210 (setlist de fête) : le nouveau texte s'y applique.
  - Flux : ordre Service, Date, Présidence, puis un groupe `inline-flex gap-2 whitespace-nowrap` « Partagée + Équipe » (visibilité l. 301-312, puce `data-puce-equipe` l. 314-326), pour qu'« Équipe » ne soit jamais seule. Largeurs mesurées : Service environ 185, Date 180, Présidence 150, Partagée 130, Équipe 95, écart 8. Le groupe « Service · Date » ne tient pas à 352 px (373 px) : on le laisse se couper.
  - Libellés : « Nom » / « 姓名 » (remplacement de `leaderPlaceholder`).
- Critères : volet de 352 px utiles (ordinateur 1 280, tablette paysage, ordinateur 1 440 : le volet ne s'élargit pas) : trois rangées, Service / Date + Présidence / Partagée + Équipe, « Équipe » jamais seule, service non coupé. Téléphone (environ 372 px) : Service + Date / Présidence / Partagée + Équipe. Tablette portrait : une rangée de cinq (772 px). Plus aucun champ à l'air désactivé : fond blanc mesuré (255) sur colonne grise comme blanche. Chinois (« 法语崇拜 11月8日周日 提摩太 共享 服事团队 ») et sombre.
- Test : `tests/setlist-editeur-piste2.spec.ts` : choisir « Autre », taper un nom fictif dans la puce, vérifier `db.writes` après un signe à l'écran ; mesurer le nombre de rangées (y distincts des puces) aux cinq dispositions et le fond calculé de la puce ; essai au doigt de la partie chevron à faire à la main (36 px) avant de coder.
- Points de vigilance de la planche : une puce à la fois champ et menu est une forme nouvelle sur l'écran ; l'essai au doigt de la partie chevron (36 px) est à faire avant de coder.

### dimanche-16 · Page d'une setlist : les chants commencent vers le milieu de l'écran
- Tranche : T1
- Décision : A, les actions de préparation passent dans le menu « ⋯ » ; le bouton « Présentation ↗ » reste visible. Choix produit validé (« comme recommandé pour tout »), qui s'écarte de FS1 (`docs/spec-export-freeshow.md`).
- À faire :
  - Ajouter en tête du menu « ⋯ » (`src/app/setlists/[id]/_components/MenusSetlist.tsx:131-` `ActionsPartagees`, qui contient déjà Prévenir l'équipe, Dupliquer, Partager) deux entrées : « Ajouter le lien de la présentation » / « Changer le lien » (icône `Link`, selon `setlist.presentationUrl`) et « Exporter pour FreeShow » (icône `Download`), avec leurs droits actuels (`peutChangerPresentation`, `src/app/setlists/[id]/SetlistDetailClient.tsx:1375`, et `peutExporterFreeShow(user, profile, setlist)`).
  - Retirer les rangées en tête de page : `SetlistDetailClient.tsx:1715-1724` (en-tête des deux volets : `<PresentationLink … sansLien />` et `<ExportFreeShow …>`) et `:1935-1943` (mise en page à une colonne). Seul le bouton « Présentation ↗ » (`src/app/setlists/[id]/_components/PresentationLink.tsx:131-141`, `h-8 … text-[12.5px]`) reste visible à côté de « Tu peux modifier » (voir la règle commune ci-dessous).
  - `PresentationLink.tsx` : l'édition du lien (formulaire `editing`, l. 99-121) ne peut plus être déclenchée par un bouton dans la page ; l'ouvrir depuis l'entrée du menu (état remonté dans `SetlistDetailClient` ou ouverture par `ref`/prop `ouvert`). `ExportFreeShow.tsx` : exposer la fonction `exporter` (l. 24-34) et l'état `pret` à l'entrée de menu (désactivée avec l'infobulle `exportFreeShowWait` tant que les chants ne sont pas chargés).
  - Espaces resserrés (même tranche, valent pour les trois dispositions) : de ≈ 57 px à 28 px entre la barre d'outils et le titre, de ≈ 42 px à 16 px entre la note et « Liste / Partitions ». Alignements : en tablette, la barre d'outils et le contenu partent du même bord (24 px) au lieu de 16 et 56 px ; à l'ordinateur, « Tu peux modifier », « FR / 中文 » et « Présentation » tiennent sur une seule rangée (la phrase « Modifiable par… » passe dans l'icône ⓘ, comme au téléphone). Alignement de la tablette portrait à coordonner avec dimanche-9.
  - Libellés : réutiliser `setlists.detail.presentationAdd` / `presentationChange` / `exportFreeShow` (`src/locales/fr.json:273-274`, `zh-CN.json:273-274, 282` : « 添加幻灯片链接 » / « 更改链接 » / « 导出到 FreeShow »). Aucune clé nouvelle.
- Critères : « Hosanna » (premier chant) remonte d'environ 126 px au téléphone (de ≈ 497 à ≈ 371 px CSS, soit 41 % de l'écran au lieu de 54 % : 80 px par le déplacement des actions, 46 px par les espaces resserrés) ; tablette portrait sous la moitié de l'écran (46 % avant) ; tablette paysage (53 % avant, ≈ 100 px de rangées en moins) ; ordinateur et 1 440 px : la colonne des partitions commence directement par le chant 1. Le bouton « Présentation ↗ » / « 幻灯片 ↗ » reste visible quand un lien existe. Menu « ⋯ » : les deux entrées en tête. Français, chinois, clair, sombre.
- Test : `tests/setlist-regie.spec.ts` (dans `SPECS_GRAND_ECRAN`, lot Régie) : l'entrée « Ajouter / Changer le lien » ouvre le formulaire, l'entrée d'export télécharge un fichier `.project` ; adapter aussi `tests/export-freeshow.spec.ts` si elle vise le bouton en page ; `tests/setlist-g.spec.ts` : `boundingBox().y` du premier chant à moins de 45 % de la hauteur de l'écran au téléphone.
- Points de vigilance de la planche : choix produit qui s'écarte de FS1 : la régie doit savoir que c'est dans « ⋯ » ; mettre à jour `docs/spec-export-freeshow.md` (emplacement) et le guide si l'emplacement y est décrit. « Ajouter le lien » sort du constat dimanche-17.

### dimanche-17 · Page d'une setlist : des actions sans forme de bouton, sous 44 px et sous 12 px
- Tranche : T1
- Décision : A, des puces d'action à contour.
- À faire :
  - `src/app/setlists/[id]/_components/PartitionView.tsx:46` (« Copier les paroles », `h-6 … text-[11px]`) et `:490-525` (rangée du chant : « Rétablir l'original » l. 489-500, « Idées d'harmonie » l. 501-510, « Sections » l. 511-520, case « Partager » l. 521-531 ; tous en `text-[11px]` souligné) : chaque action devient une puce `h-8 rounded-full border border-border bg-background px-3` en 12,5 px semi-gras, icône de 14 px : « Copier les paroles » / « 复制歌词 » (`Copy`), « Idées d'harmonie » / « 和声灵感 » (`Sparkles`, l'icône de l'entrée Harmonie), « Rétablir l'original » (`RotateCcw`), « Sections » (`ListOrdered`) ; la case « Partager » devient une puce à bascule (`aria-pressed`). Aucun libellé sous 12 px. Le sélecteur de version (`<select>` l. 533-536, `h-6 … text-[11px]`) relève du chantier T3.
  - Zone de toucher, tablette comprise : `[@media(pointer:coarse)]` ajoute un `::before` de 44 px de haut, centré sur la puce et aussi large qu'elle (au minimum 44 × 44) ; `TOUCHER_44` (`SetlistDetailClient.tsx:95-97`, `max-sm:` seulement) ne suffit pas.
  - En sombre : filet `#373739`, texte `--foreground`. La rangée passe à la ligne au téléphone (4 puces ≈ 2 rangées de 32 px) ; une rangée en tablette et à l'ordinateur.
  - « Ajouter le lien » : traité par dimanche-16 A (menu « ⋯ ») ; si dimanche-16 était refusée, même puce avec l'icône `Link`.
  - Libellés : clés existantes `setlists.detail.copyLyrics`, `harmonie.idees`, `setlists.contentEdit.revert`, `setlists.myVersion.sections`, `setlists.myVersion.share` ; aucune clé nouvelle (« 恢复原版 », « 段落 », « 分享我的版本 » côté chinois existent déjà).
- Critères : toutes les puces ont une hauteur de 32 px, un texte d'au moins 12 px et une zone de toucher d'au moins 44 × 44 px sous `pointer: coarse` (téléphone, tablette portrait, tablette paysage) ; vue « Partitions », en lecture et en « Ma version » ; ordinateur et 1 440 px : une rangée en tête de chant. Français, chinois, clair, sombre.
- Test : `tests/setlist-version.spec.ts` et `tests/setlist-g.spec.ts` (vue Partitions) ; `tests/copy-lyrics.spec.ts` pour la puce de copie ; `tests/harmonie-setlist.spec.ts` pour « Idées d'harmonie » : taille de police calculée >= 12 px et, avec `hasTouch`, `::before` de 44 px (ou `boundingBox` de la zone cliquable >= 44) sur les trois appareils.
- Points de vigilance de la planche : plus de présence au-dessus de chaque partition (accepté).

### dimanche-20 · Rail de la tablette paysage : deux entrées semblent actives, deux notes de musique se côtoient
- Tranche : T1
- Décision : A, filet + icône `Drum` pour Musiciens.
- À faire :
  - `src/components/layout/SelecteurEspace.tsx:124` : `musiciens: Music` devient `musiciens: Drum` (import l. 13 : retirer `Music` s'il n'est plus utilisé dans ce fichier). `Guitar` est écartée : c'est déjà « Accords » (`src/lib/navigation.ts:102`) ; `KeyboardMusic` est RD-2000 (l. 111). `Headphones` reste la variante possible à trancher à l'œil (question 3 de la planche : la recommandation est `Drum`).
  - Même fichier, rail réduit (l. 123-153) : un filet de 1 px `--border`, de 32 px de large, sépare les espaces des pages ; l'espace actif garde `bg-background` mais sans `shadow-sm` (l. 133) pour qu'une seule marque « courant » reste dans le rail. Le conteneur `barre-si-reduite` (l. 144-149) et la zone de toucher de 44 px (`after:-inset-1`) ne changent pas.
  - Infobulles inchangées (« Musiciens » / « 乐手 »). Aucune clé de langue.
- Critères : tablette paysage et ordinateur barre repliée : un seul état actif lisible, deux icônes de musique plus identiques, filet visible entre le groupe des espaces et celui des pages ; dans l'espace Musiciens, une seule guitare (« Accords »). Téléphone, tablette portrait, ordinateur barre ouverte : espaces écrits en toutes lettres, rien ne change. Clair et sombre, français et chinois.
- Test : `tests/agencement-barre-reduite.spec.ts` (ou `tests/navigation-grand-ecran.spec.ts`, dans `SPECS_GRAND_ECRAN`) : dans `[data-testid="selecteur-icones"]`, le lien Musiciens ne contient plus la même icône que « Chants » (comparer le `<svg>` ou son `class` `lucide-drum`) ; `tests/espace-musiciens.spec.ts` : une seule icône guitare dans le rail de l'espace Musiciens.
- Points de vigilance de la planche : à 24 px le tambour se lit comme une forme à deux baguettes, moins parlant qu'une note ; icône à confirmer au rendu (existence de `Drum` dans la version installée de lucide-react à vérifier).

### dimanche-23 · Poignées de réordonnancement minuscules et pâles
- Tranche : T1
- Décision : A, zone invisible de 44 px et icône plus visible.
- À faire :
  - `src/components/setlists/editeur/ListeCourte.tsx:28-43` (`Poignee`) : `GripVertical` passe de `h-4 w-4` à `h-5 w-5` (20 px) ; couleur `text-muted-foreground` sans transparence (remplace `text-muted-foreground/60`, l. 37 ; `#6c6c72` 5,3:1 sur blanc, `#98989f` en sombre, environ 7:1) ; la ligne choisie garde `text-background/60` (points clairs, 6,9:1). Le bouton garde 24 × 28 de dessin (`h-7 w-6`).
  - `[@media(pointer:coarse)]` ajoute un `::before` de 44 × 44 centré sur le bouton (pas `TOUCHER_44`, qui ne vaut que pour le téléphone) ; `z-10` (déjà posé) garde la priorité sur la ligne, qui est elle-même un bouton ; au toucher, le fond de la zone devient `bg-secondary` dès le contact. La zone déborde de 10 px de chaque côté et ne touche pas la pastille du numéro (≈ 16 px plus loin). Aucun déplacement de la mise en page.
  - Les autres `GripVertical` du dépôt (`SetlistFormRows.tsx:277, 504`, `SujetsAborder.tsx:57`, `CustomizePanel.tsx:78`, `OrdrePassage.tsx`) sont hors de ce constat.
  - Aucune clé de langue.
- Critères : poignée de 20 px, contraste d'au moins 4,5:1 (clair et sombre) sur la ligne non choisie ; zone de toucher d'au moins 44 × 44 sous `pointer: coarse` sur téléphone, tablette portrait et tablette paysage ; aucune ligne ne change de hauteur. Éditeur à 1 280 et 1 440 px (volet de 400 px) et tablette portrait pleine largeur.
- Test : `tests/setlist-editeur-piste2.spec.ts` : couleur calculée de l'icône (non transparente), taille de l'icône 20 px, `::before` de 44 px sous `hasTouch`. Essai au doigt à faire à la main : si la poignée est encore ratée, passer à B (bouton `h-11 w-8 -ml-2`, ligne inchangée).
- Points de vigilance de la planche : la zone reste invisible, on la découvre par les points ; repli B si l'essai au doigt échoue.

### dimanche-14 · Mode louange, bloc Pont : deux rangées d'accords collées
- Tranche : T1
- Décision : correction recommandée, écart normal (environ 0,5 em) après une rangée d'accords sans paroles.
- À faire :
  - `src/components/song/ChordLine.tsx:125` (`lineHeight: segments.every(s => !s.lyric?.trim()) ? "0" : undefined`) : la rangée d'accords sans paroles tient à `line-height: 0`, d'où le collage à la ligne suivante. Une rangée d'accords sans paroles, suivie d'une ligne avec paroles, reçoit l'écart normal entre deux lignes (environ 0,5 em) ; la rangée d'intro (« Bm D Em7 F#m7 ») garde la marge qu'elle a. Vérifier que le changement ne décale pas les lignes d'intro des autres sections.
  - Alternative écartée : l'écrire comme une rangée d'intro dans les fichiers `.cho`.
  - Aucune clé de langue. Rendu commun avec la page chant : vérifier là aussi.
- Critères : chant témoin (Pont : « Bm7 D Em7 F#m7 » puis « G Prends mon cœur A et rends-le pur, »), tablette paysage, mode louange : environ 0,5 em entre la rangée sans paroles et la ligne suivante ; les chants sans cette configuration ne bougent pas (pages identiques). Quatre dispositions, 1 440 px, clair et sombre.
- Test : `tests/mode-louange-colonnes.spec.ts` (ou `tests/lignes-accords.spec.ts`) : écart mesuré entre la rangée d'accords seule et la ligne suivante >= 0,4 em ; nombre de pages inchangé sur les chants témoins.
- Points de vigilance de la planche : aucun ; effet de bord possible sur la pagination (une rangée plus haute) : relancer les tests de pagination.

### dimanche-24 · Mode louange : glissière sans étiquette, « ‹ » désactivé invisible
- Tranche : T1
- Décision : correction recommandée : étiquette sous la glissière et « ‹ » désactivé à bordure conservée.
- À faire :
  - `src/components/performance/BarreBas.tsx:53-59` (`<CurseurPage … texteValeur={t("performance.pageSliderValue", …)}>`) et `src/components/performance/CurseurPage.tsx:31-` : sous la glissière, en 12 px `text-muted-foreground`, le titre du chant courant à gauche et « page 3 / 6 » / « 第 3 / 6 页 » à droite (nouvelle prop pour le titre du chant courant : `reperes` donne déjà `{ page, titre }`, prendre le dernier repère dont `page <= courante`).
  - `src/components/performance/BarreBas.tsx:90` et `:98` : `disabled:opacity-30` devient une opacité de 40 % (`disabled:opacity-40`) en gardant la bordure visible (`border-border`).
  - Libellés : nouvelle clé `performance.pageEtiquette` : fr « page {{n}} / {{total}} », zh-CN « 第 {{n}} / {{total}} 页 » (à côté de `performance.pageSliderValue`, `fr.json:712`, `zh-CN.json:708`, qui reste l'`aria-valuetext`).
  - Alternative écartée : afficher les titres des chants sous les repères dès 1 024 px.
- Critères : barre du bas affichée, toutes dispositions : sous la glissière « Hosanna » à gauche et « page 3 / 6 » (« 第 3 / 6 页 ») à droite en 12 px ; titre tronqué en ellipse sans pousser la page ; le « ‹ » désactivé reste lisible comme bouton. La hauteur de la barre peut croître de la hauteur d'une ligne de 12 px : vérifier que `barres.bas` reste mesuré et que la pagination ne bouge pas (la barre s'escamote sans changer de taille). Français et chinois, clair et sombre.
- Test : `tests/mode-louange-forscore.spec.ts` (curseur, lot L7) : le texte `page n / total` est présent, taille >= 12 px, titre du chant courant égal à celui de la page courante après un saut de page ; la pagination (nombre de pages) ne change pas.
- Points de vigilance de la planche : aucun.

### dimanche-25 · Cadenas absent sur téléphone (onglet « Mes setlists »)
- Tranche : T1
- Décision : correction recommandée, retirer `hidden sm:block`.
- À faire :
  - `src/app/setlists/page.tsx:434` : `<Lock className="hidden sm:block h-3.5 w-3.5" aria-hidden />` devient `<Lock className="h-3.5 w-3.5" aria-hidden />` (le cadenas de 14 px tient dans l'onglet à 360 px). Alternative écartée : le retirer partout.
  - Aucune clé de langue.
- Critères : onglet « Mes setlists » / « 我的歌单 » (selon la clé existante `setlists.list.mySetlists`) avec cadenas visible dès 360 px, sans retour à la ligne ni troncature du libellé, compteur compris ; autres dispositions inchangées. Clair et sombre.
- Test : `tests/agencement-v18-setlists.spec.ts` (ou `tests/pages-en-grand-setlists.spec.ts`) : à 360 px, le `svg` du cadenas de l'onglet est visible et l'onglet ne déborde pas.
- Points de vigilance de la planche : aucun.

### dimanche-21 · « Sélectionner » et « Toutes » presque invisibles en clair
- Tranche : T3
- Décision : le menu natif devient le menu déroulant maison (pastille `w-auto border border-border bg-background`) et « Sélectionner / 选择 » une pastille à contour (la recommandation de la planche, au lieu de la correction minimale ajoutant seulement `border border-border bg-background w-auto`).
- À faire :
  - `src/app/setlists/page.tsx:460-468` (bouton « Sélectionner », `bg-secondary`, `h-9 px-4 rounded-full`) : pastille à contour (`border border-border bg-background`), largeur du contenu.
  - `src/app/setlists/page.tsx:469-` (le `<select>` de catégorie « Toutes », `bg-secondary border-transparent`, groupes `optgroup`) : remplacé par le menu déroulant unique de la tranche T3 (jeu B : un seul menu déroulant, plus de `<select>` natif visible), en pastille `w-auto border-border bg-background`, mêmes groupes (réunions principales, groupes, fêtes derrière `BACK_OFFICE`) et mêmes valeurs (`categoryFilter`, `"Toutes"`).
  - Libellés inchangés : `setlists.list.select` (« Sélectionner » / « 选择 »), `setlists.list.allCategories` (« Toutes » / « 全部类型 »), `setlists.list.filterCategoryLabel`. Aucune clé nouvelle.
  - Ce constat relève du chantier « quatre contrôles » (T3) : le composant de menu est celui que T3 livre ; ne pas en créer un second ici.
- Critères : en clair, « Sélectionner » et « Toutes » sont lisibles comme des commandes (contour visible, contraste du filet suffisant), à largeur du contenu (plus d'étirement `flex-1`) ; plus de `<select>` natif visible dans la barre de filtres ; aux cinq dispositions ; français et chinois (« 选择 », « 全部类型 »), clair et sombre.
- Test : `tests/pages-en-grand-setlists.spec.ts` et `tests/agencement-v18-setlists.spec.ts` : plus de `select` visible dans la barre de filtres de `/setlists`, pastilles à bordure non transparente, filtrage par catégorie toujours opérationnel (`tests/setlist-suppression-groupee.spec.ts` pour « Sélectionner »).
- Points de vigilance de la planche : dépend du composant de menu de T3.

### dimanche-7 · À 1 440 px, l'en-tête ne s'aligne pas sur la colonne
- Tranche : T4
- Décision : A, l'en-tête entre dans le conteneur de la colonne (règle de largeur L1).
- À faire :
  - Liste des setlists, colonne seule : `src/components/layout/DeuxVolets.tsx:96` pose déjà `mx-auto w-full max-w-[calc(960px+2*var(--marge-page))] px-[var(--marge-page)]` sur la colonne seule (`colonneSeule`, l. 58). Le titre et le bouton prennent la même largeur : l'en-tête `EnTetePage` (`src/components/layout/EnTetePage.tsx:35`, rendu `src/app/setlists/page.tsx:365-371`, sorti au-dessus de `DeuxVolets` l. 612) reçoit le même `max-w` et `mx-auto` quand la colonne est seule : « Setlists » passe à x ≈ 364 et « Nouvelle setlist » finit à x ≈ 1324. Il faut que le conteneur de page connaisse l'état `seule` de `DeuxVolets` (par exemple en passant `colonneSeule={!apercu}` à `EnTetePage`, déjà calculé l. 618 pour `DeuxVolets`).
  - Page d'une setlist : l'en-tête (`src/app/setlists/[id]/SetlistDetailClient.tsx:1587`, `px-7 pb-4 pt-5`, ligne de boutons « Adapter / Ma version / Modifier / Mode Louange ») prend la largeur de « Sommaire + lecture » : « Mode Louange » finit à x ≈ 1328 (au lieu de 1412).
  - À aligner sur la règle L1 telle que T4 la fixe ; aucune clé de langue.
- Critères : à 1 440 px, liste : « Setlists » et la carte au même bord gauche, « Nouvelle setlist » et la carte au même bord droit (x ≈ 364 et 1324) ; page d'une setlist : un seul bord droit pour « Mode Louange » et la colonne de lecture. À 1 280 px, rien ne change (déjà aligné). Tablette paysage, tablette portrait, téléphone : inchangés. Clair, sombre, français, chinois.
- Test : `tests/pages-en-grand-setlists.spec.ts` et `tests/agencement-v18-setlists.spec.ts` (déjà en grand écran) : à 1 440 px, `boundingBox()` du titre et du bouton principal égal à celui de la colonne, à 1 px près.
- Points de vigilance de la planche : le conteneur de page doit connaître l'état `seule` de `DeuxVolets`. B (élargir la colonne, lignes de 1 100 px) est écartée : contraire à la règle du 25/10/2026.

### dimanche-8 · Setlists en tablette portrait : carte à demi-largeur, collée à gauche
- Tranche : T4
- Décision : B, une colonne, cartes en pleine largeur, aperçu des chants gardé.
- À faire :
  - `src/app/setlists/page.tsx:560-561` (`disposition === "tablette"` : `<ul className="grid grid-cols-2 items-start gap-4">`) : une seule colonne (`grid-cols-1`, ou `<ul className="space-y-4">`) ; les cartes `SetlistCarteChants` (l. 562-) s'empilent de x 40 à 1 580, la même largeur que la recherche et les filtres ; l'aperçu (titre et ton de chaque chant) est gardé. Plus de demi-carte.
  - La largeur maximale est celle que fixera la règle L1 de T4 (sans arbitrage, la planche dessine la pleine largeur) ; ne pas inventer un plafond propre à cette page.
  - Aucune clé de langue.
- Critères : tablette portrait, une, trois setlists : chaque carte occupe toute la largeur de la recherche et des filtres (aucune carte seule à demi-largeur), pastille de ton visible ; la page est plus longue au-delà de quatre setlists à venir (rare). Téléphone, tablette paysage, ordinateur, 1 440 px : inchangés. Clair, sombre, français, chinois.
- Test : `tests/agencement-v18-setlists.spec.ts` ou `tests/pages-en-grand-setlists.spec.ts` (projet tablette) : `boundingBox().width` de la carte >= largeur de la zone de recherche - 2 px, avec 1 puis 3 setlists fictives.
- Points de vigilance de la planche : B donne des cartes d'environ 770 px CSS, avec la pastille de ton à environ 700 px du titre, alors que dimanche-7 B est écartée pour des lignes de 1 100 px. Il manque un seuil de largeur commun : le plafond de 960 px de la règle du 25/10 serait celui à retenir, avec au besoin des cartes plafonnées et centrées. À trancher avec L1 dans cette même tranche.

### dimanche-9 · Page setlist en tablette portrait : barre d'outils de bord à bord, contenu resserré
- Tranche : T4
- Décision : B, le contenu s'élargit jusqu'à la barre, note plafonnée à 680 px.
- À faire :
  - `src/app/setlists/[id]/SetlistDetailClient.tsx:1902` (`<div ref={zoneRef} className="relative max-w-2xl mx-auto px-4 py-8 …">`) : en tablette portrait, le contenu passe à `max-w-none px-[var(--marge-page)]` ; il va de x ≈ 40 à 1 580 comme la liste des setlists et l'éditeur sur la même tablette. Les autres dispositions gardent `max-w-2xl`. La barre d'outils (`:1740-1742`, `max-w-[1080px] mx-auto px-4`) ne change pas.
  - La note de l'équipe (`:1945`, `<p className="mt-3 text-sm text-muted-foreground italic">{setlist.notes}</p>`) est plafonnée à 680 px (`max-w-[680px]`) ; le plafond ne vaut que pour la note, pas pour les lignes de chants. Ajout de `whitespace-pre-line` fait par dimanche-4.
  - Alignement du bord de la barre d'outils et du contenu en tablette (24 px) : voir dimanche-16, à coordonner.
  - Aucune clé de langue.
- Critères : tablette portrait : barre d'outils, titre et liste partent du même bord (x ≈ 40) et finissent au même bord (x ≈ 1 580) ; les partitions gagnent environ 100 px ; la note ne dépasse pas 680 px. Autres dispositions inchangées. Clair, sombre, français, chinois. Les trois écrans du dimanche (liste des setlists, setlist, éditeur) ont la même largeur en tablette portrait.
- Test : `tests/setlist-g.spec.ts` / `tests/setlist-deux-volets.spec.ts` (projet tablette) : `boundingBox()` de `[data-testid="barre-outils"]` et de la zone de contenu alignés à 2 px de chaque côté ; largeur de la note <= 680 px.
- Points de vigilance de la planche : B porte le contenu à environ 770 px CSS (x ≈ 40 à 1 580 sur 1 620), comme dimanche-8 B. Même seuil commun à fixer avec dimanche-7 (plafond de 960 px) ; le plafond de 680 px ne vaut ici que pour la note.

### dimanche-15 · Page setlist sur téléphone : libellés serrés dans les pastilles de la barre
- Tranche : T4
- Décision : correction recommandée : marge de 8 px dans les pastilles, libellés courts, « Ma version » dans le menu « … » sous 412 px.
- À faire :
  - `src/app/setlists/[id]/SetlistDetailClient.tsx:99` (`PILULE_EMPILEE` : `max-lg:px-1` devient `max-lg:px-2`) et `:100` (`LIBELLE_COURT` : `text-[10px]` devient 11 px selon la planche, mais le plancher de T4 est de 12 px : appliquer le plancher de T4, c'est-à-dire 12 px, si le libellé « Adapter » / « Accords » tient dans `max-w-[64px]` ; sinon élargir ce `max-w` plutôt que descendre sous 12 px).
  - « Ma version » passe dans le menu « … » sous 412 px (bouton `max-[389px]:hidden` actuel, l. 1787 et 1824, remplacé par une entrée de menu : un seul seuil, 412 px) ; sa fonction `toggleMaVersion` est réutilisée.
  - Libellés existants (`setlists.myVersion.toggle`, `setlists.contentEdit.toggle`) ; aucune clé nouvelle sauf si l'entrée de menu demande un libellé distinct (alors fr « Ma version », zh-CN « 我的版本 », clé à côté de `setlists.myVersion.toggle`).
  - Alternative écartée : icônes seules pour Adapter et Ma version.
- Critères : téléphone (412 et 390 px) : marge de 8 px dans les pastilles, libellés d'au moins 12 px (cible de T4 ; 11 px selon la planche, à valider avec le plancher), aucune troncature en français comme en chinois (« 显示 编辑 和弦 我的版本 敬拜 ») ; « Ma version » accessible dans « … ». Tablette portrait et plus : inchangés (`.libelle-outil` visible à partir de 1 024 px). Clair et sombre.
- Test : `tests/setlist-g.spec.ts` (téléphone) : `font-size` calculée des libellés >= 12 px, pas de `text-overflow` actif sur les libellés, l'entrée « Ma version » du menu « … » bascule bien la vue (`tests/setlist-version.spec.ts`).
- Points de vigilance de la planche : la planche dessine 11 px alors que T4 pose un plancher de 12 px ; c'est le plancher qui prime (voir le texte ci-dessus).
