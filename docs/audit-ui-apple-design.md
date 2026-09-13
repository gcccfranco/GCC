# Audit UI — GCC Louange au crible d'apple-design

**Date** : 13/09/2026 · **Branche** : `ui/apple-design` · **Référentiel** : skill
[apple-design](../.claude/skills/apple-design/SKILL.md) (Emil Kowalski, d'après
les WWDC *Designing Fluid Interfaces*, *UI Typography*, *Principles of Great Design*).

Audit seulement : aucune ligne de code modifiée. Chaque constat cite le
principe du skill (§), la preuve (fichier:ligne, mesure ou capture) et une
piste. Les pistes ne sont pas des décisions.

---

## 1. Méthode et limites

| Source | Ce qui a été vu |
| --- | --- |
| **Navigation Playwright, visiteur** (Chromium, `next dev` :3100) | `/songs`, un chant FR (`abba-pere`), un chant ZH (`爱的约定`), `/login`, `/signup`, une 404. Formats : iPhone 13 clair et sombre, desktop 1280, iPad Pro 11 paysage. Interactions : menu burger (ouverture, fermeture, re-tap pendant la fermeture), défilement haut/bas, index A–Z, menu « Plus d'actions », validation du login, navigation en `prefers-reduced-motion: reduce`. |
| **Navigation Playwright, membre** (compte invité, **lecture seule** : aucune création, modification ni envoi) | `/planning` et changement d'onglet, `/mes-services`, `/setlists`, détail d'une setlist, `/annonces`, `/profil`, `/guide`, `/setlists/new` (sans rien saisir, pas d'autosauvegarde). Formats : iPhone 13 clair et sombre, iPhone 13 mini (375 px), iPhone SE 1re gén. (320 px), desktop 1280. Sondes : remontage du DOM à la navigation, menu Louange au clavier, largeur de la navbar. |
| **Code** | Fondations (`globals.css`, `tailwind.config.ts`, `layout.tsx`), navigation (`Navbar`, `MobileTabBar`, `PageTransition`, `PullToRefresh`, `useScrollDirection`), primitives `ui/`, modales, relevés transverses (grep) sur `src/`. Captures anonymisées de `/guide` pour les vues desktop membre. |

**Limites assumées**
- `:active` n'est pas mesurable en émulation tactile (la carte chant, qui a bien
  `active:scale`, sortait « pas d'état pressé ») : les constats sur le retour à
  l'appui viennent du **code**, pas d'une mesure.
- Un premier comptage « `transition: all` » était faux (valeur par défaut du
  navigateur, durée 0 s) : écarté. Un premier test de remontage cliquait avant
  la fin de la compilation `next dev` : refait en attendant l'URL (voir B2).
- Le tirer-pour-actualiser n'a rien affiché sous touches CDP : non concluant,
  le constat B3 vient du code.
- Pas d'écran d'édition ouvert (feuille « Adapter », AlertDialog de
  suppression) : compte invité en lecture seule.
- Le rendu des matériaux translucides a été observé dans **Chromium** ; Safari iOS
  peut différer, à revérifier sur appareil.
- **Mode louange (PerformanceMode) non audité** : intouchable.

## 2. Périmètre gelé (rappel)

Rien dans ce rapport ne propose de toucher : l'affichage des chants et
partitions (typo, bleu accords, rouge jianpu, encadrés FR/ZH, `--sec-*`), les
couleurs de `serviceColors.ts`, le label contextuel animé de la navbar, le logo,
le mode louange. Les défauts vus **dans** ces zones sont listés à part (§ 9),
comme constats sans recommandation par défaut.

⚠️ Plusieurs pistes des §§ 8 touchent la **structure** (où vivent les actions),
pas seulement le style. La refonte 2026 est cadrée « UI pure » : ces pistes
sont marquées **[UX — à décider]**.

## 3. Synthèse

**Ce qui est déjà très « Apple »** (à préserver)
- Feuilles basses sur **vaul** : suivi 1:1, projection d'élan, élastique aux
  bords. §§ 2, 5, 6 et 9 couverts nativement.
- Barres (navbar, onglets, barre chant) **masquées au défilement** : la page
  chant défilée est 100 % lecture.
- `hoverOnlyWhenSupported` : pas de survol collant sur tactile.
- Cartes de chants et boutons d'icônes de la navbar : `active:scale` à l'appui.
- Menus Radix ancrés à leur déclencheur (`transform-origin`, § 7).
- Assistant de setlist : glissement **directionnel** avant/arrière avec repli en
  fondu sous reduced-motion ([globals.css:170-186](../src/app/globals.css#L170-L186)).
  C'est exactement le § 7 et le § 14. **C'est le modèle à généraliser.**
- Stabilité : CLS mesuré ≈ 0 sur toutes les pages (max 0,023, `/songs` desktop).
- Sombre entièrement tokenisé ; orange réservé aux actions ; focus à l'encre.

**Les 7 priorités**
1. **P1** À 320 px de large (iPhone en « Zoom de l'affichage »), le burger sort
   de l'écran : profil, guide, annonces et déconnexion deviennent inaccessibles (A4).
2. **P1** Menu mobile illisible : la page transparaît à travers le panneau (A1).
3. **P1** Menu mobile non interruptible : un re-tap pendant la fermeture est perdu (A2).
4. **P1** Barre de recherche des chants coupée par l'index A–Z sur téléphone (A3).
5. **P2** Aucun retour à l'appui sur la primitive `Button` : sur tactile, la
   plupart des boutons ne réagissent pas au doigt (B1).
6. **P2** `PageTransition` : fondu depuis 0 et remontage de toute la page à
   chaque navigation, donc l'indicateur glissant du planning ne glisse jamais (B2).
7. **P2** Pas de système de mouvement ni de matériau : 5 recettes de verre,
   5 niveaux de voile, reduced-motion traité à un seul endroit (C, D).

Sévérité : **P1** défaut visible ou geste cassé · **P2** sensation dégradée,
incohérence · **P3** finition.

---

## 4. Réponse et manipulation directe (§ 1, § 2, § 10)

**B1 · P2 · Retour à l'appui absent sur la plupart des boutons**
- La primitive [button.tsx:8](../src/components/ui/button.tsx#L8) n'a qu'un
  `hover:`. Or `hoverOnlyWhenSupported` désactive le survol sur tactile, donc
  **tout `<Button>` est muet sous le doigt** : barre chant `−`/`+`/`A−`/`A+`,
  formulaires, etc.
- 23 des 36 fichiers qui ont un `onClick` n'ont aucun `active:` (grep), dont
  l'admin, les annonces, le notifier, `SetlistForm` et `SetlistDetailClient`.
- Le **burger**, bouton principal sur mobile, n'a pas d'`active:`
  ([Navbar.tsx:439](../src/components/layout/Navbar.tsx#L439)), alors que ses
  trois voisins ont `active:scale-[.96]`. Même chose pour le segmenté
  Tous / FR / 中文 de `/songs`.
- *Piste* : un état pressé unique dans la primitive (et une classe partagée
  pour les boutons d'icône), réglé une fois : échelle ~0,97 ou fond, 100 ms.

**B2 · P2 · `PageTransition` ajoute de la latence et casse la continuité**
- [PageTransition.tsx:8](../src/components/layout/PageTransition.tsx#L8) :
  `key={pathname}` et `fade-in` 200 ms. Chaque tap de navigation repart d'une
  **opacité 0**, donc le contenu arrive plus tard qu'il n'est prêt (§ 1).
- La clé remonte **tout** le sous-arbre, layouts compris. *Mesuré* :
  `/planning` → `/planning/culte` → `/planning/edd`, et `/songs` → un chant.
  À chaque fois, le div de transition, la barre d'onglets et l'indicateur sont
  des **nœuds DOM neufs**, et l'animation `enter` rejoue. L'indicateur glissant
  de `PlanningTabs` (`transition-all`,
  [PlanningTabs.tsx:73](../src/components/planning/PlanningTabs.tsx#L73)) renaît
  donc à sa nouvelle place et **ne glisse jamais** : sa transition est du code
  qui ne sert pas (§ 7, continuité spatiale). Le défilement horizontal des
  onglets, lui, est bien conservé.
- *Piste* : supprimer ce fondu global, ou le limiter au changement de section
  sans partir de 0 et sans clé sur les layouts.

**B3 · P3 · Tirer-pour-actualiser sans retour continu**
- [PullToRefresh.tsx:22-40](../src/components/layout/PullToRefresh.tsx#L22-L40) :
  rien ne bouge avant 70 px, puis une pastille binaire « relâcher ». Pas de
  progression pendant le geste (§ 1), pas d'indice de direction (§ 8), puis
  rechargement complet de la page.
- *Piste* : pastille qui suit le doigt avec une résistance progressive (§ 9) et
  un indicateur qui se remplit jusqu'au seuil.

**B4 · P3 · Index A–Z : tap seulement**
- [SongListClient.tsx:339-351](../src/app/songs/SongListClient.tsx#L339-L351) :
  boutons de 32 × 24 px, un tap par lettre. L'index iOS se **balaye** : on glisse
  le doigt et la liste suit en continu (§ 2, § 10).
- Retour sur la liste : la position est restaurée par un `setTimeout` de 80 ms
  ([SongListClient.tsx:50](../src/app/songs/SongListClient.tsx#L50)), d'où un
  saut visible après l'affichage.

**B5 · P3 · Cibles sous 44 px dans les barres**
- Mesuré sur iPhone : boutons navbar 34 × 34 (langue, thème, connexion, burger),
  segmenté 31 px de haut, sélecteur de thèmes 32 px, liens du login 17–20 px.

## 5. Interruptibilité et cohérence spatiale (§ 3, § 7)

**A2 · P1 · Menu mobile non interruptible** *(mesuré)*
- Fermeture = `setTimeout` de 160 ms
  ([Navbar.tsx:57-64](../src/components/layout/Navbar.tsx#L57-L64)). Pendant ce
  délai `isOpen` reste vrai, donc un re-tap relance… une fermeture
  ([Navbar.tsx:437](../src/components/layout/Navbar.tsx#L437)). Test : tap
  fermer, re-tap 80 ms après, **le menu reste fermé**. C'est le « ne jamais
  bloquer l'entrée pendant une transition » du § 3.
- La fermeture sur changement de route se déclenche **après** la navigation :
  le menu glisse au-dessus de la nouvelle page.

**C1 · P2 · Quatre familles de modales, quatre comportements**

| Surface | Techno | Entrée / sortie | Échap / focus | Voile |
| --- | --- | --- | --- | --- |
| `EditLineSheet`, `SongProposalDrawer` | vaul | glisse, geste, élan ✓ | ✓ | 80 % |
| `AlertDialog` (setlist) | Radix | zoom et glissement en diagonale depuis `left-1/2 top-48%` | ✓ | 80 % |
| `ReportDialog` | maison | **aucune** (apparaît et disparaît sec) | ✗ | 40 % |
| `CustomizePanel` (ouvert depuis la page chant) | maison | **aucune** | ✗, X sans `aria-label` | 30 % |
| Menu mobile | maison | glisse du haut | ✗ | 20 % |

- [alert-dialog.tsx:39](../src/components/ui/alert-dialog.tsx#L39) : trajectoire
  héritée du vieux shadcn, qui ne part de rien de visible (§ 7). Sur téléphone,
  pleine largeur et **coins carrés** (`sm:rounded-lg` seulement).
- [ReportDialog.tsx:59](../src/components/report/ReportDialog.tsx#L59) et
  [CustomizePanel.tsx:168](../src/components/customPanel/CustomizePanel.tsx#L168) :
  pas d'animation, pas d'Échap, pas de piège de focus. En plus, `ReportDialog` a
  ses libellés **en dur en français** (« Signaler un problème », « Fermer »),
  donc pas de 中文.
- *Piste* : deux gabarits seulement. Une **feuille** (vaul) pour les tâches sur
  mobile, un **dialogue** (Radix) centré, qui entre et sort par le même chemin.

**C2 · P2 · Menu « Louange » desktop fait main à côté d'un menu Radix**
- [Navbar.tsx:169-213](../src/components/layout/Navbar.tsx#L169-L213) : clic
  extérieur géré à la main, pas de flèches clavier, et **Échap ne ferme pas**
  (*mesuré* : `aria-expanded` reste à `true`), style
  `rounded-xl bg-card`. Le menu Notifications voisin est un Radix
  `rounded-md bg-popover` ([dropdown-menu.tsx:68](../src/components/ui/dropdown-menu.tsx#L68)).
  Deux menus côte à côte qui ne se ressemblent pas et ne se comportent pas pareil
  (§ 16 Familiarité).

**C3 · P3 · Barres masquées au défilement : pas d'hystérésis au retour**
- [useScrollDirection.ts:22-25](../src/hooks/useScrollDirection.ts#L22-L25) :
  masquage après 40 px, mais **réaffichage au moindre pixel vers le haut**. En
  bas de page, le rebond élastique d'iOS fait donc réapparaître navbar et barre
  d'onglets. *Piste* : ~10 px d'hystérésis au retour (§ 10).
- Ces barres bougent en `transition-transform duration-300` (courbe par défaut),
  sans lien avec la vitesse du défilement. Acceptable. Le niveau Apple serait de
  les replier au rythme du doigt.

## 6. Matériaux et profondeur (§ 12)

**A1 · P1 · Panneau du menu mobile : la page se lit à travers** *(capture)*
- [Navbar.tsx:449](../src/components/layout/Navbar.tsx#L449) :
  `bg-background/95 backdrop-blur-md` **à l'intérieur** du `<header>`, qui a déjà
  son propre `backdrop-filter`
  ([Navbar.tsx:127](../src/components/layout/Navbar.tsx#L127)). Un
  `backdrop-filter` imbriqué ne floute pas la page : on lit « Tous / FR / 中文 »,
  « 370 chants », « Abba Père » **sous** « Language / 语言 » et « Connexion ».
  C'est le « ne jamais empiler deux surfaces translucides » du § 12. Connecté
  sur `/planning`, c'est pire : « Culte Franco », « PRÉSIDENCE », « Bienvenue »
  se superposent aux entrées du menu.
- **Le menu membre est plus haut que l'écran** *(mesuré)* : le panneau finit à
  725 px pour une hauteur utile de 664 (iPhone 13) ou 629 (13 mini).
  « Déconnexion » commence à 666, sous le pli. Le panneau n'a ni `max-height`
  ni défilement propre (`overflow: visible`). Si l'on fait défiler la page
  derrière, la navbar se masque, le menu **remonte avec elle sans son
  en-tête**, la page défile dessous, et « Déconnexion » reste coupé sur un
  13 mini.
- Le panneau démarre à `top-14` (56 px) alors que `--nav-h` vaut 58 px : il
  mord de 2 px sur la navbar (mesuré : panneau à 56, navbar jusqu'à 58).

**D1 · P2 · Cinq recettes de « verre »**

| Surface | Fond | Flou |
| --- | --- | --- |
| Navbar | 82 % | 14 px, saturate 1,2 |
| Barre d'onglets, onglets planning, menu mobile | 95 % | `md` |
| Barre chant, barre formulaire setlist, barre détail setlist | 95 % | `blur` |
| Index A–Z | 70 % | `sm` |

- À 95 % le flou est **invisible** : la barre paraît opaque, mais le GPU paie
  quand même le filtre. La barre du bas (95 %) ne ressemble pas à celle du
  haut (82 %).
- *Piste* : deux tokens, **chrome fin** pour les barres (fond ~80 %, flou fort,
  saturation) et **panneau épais** pour les menus et feuilles (quasi opaque). Le
  § 12 le dit : les grandes surfaces doivent paraître plus épaisses.

**D2 · P2 · Filets durs sous les barres flottantes**
- `border-b` navbar, `border-t` barre d'onglets, `border-b` onglets planning et
  barre chant. Le § 12 recommande un **bord de défilement** (léger dégradé ou
  flou) qui n'apparaît que quand du contenu passe dessous. En haut de page, le
  filet est inutile.

**D3 · P2 · Voiles incohérents**
- 20 % (menu), 30 % (personnaliser), 40 % (signalement), **80 %** (feuilles
  vaul, AlertDialog), 85 % (visionneuse d'annonces,
  [annonces/page.tsx:363](../src/app/annonces/page.tsx#L363)). Un voile de 80 %
  sous une petite feuille assombrit plus que la tâche ne le demande. *Piste* :
  deux niveaux, **tâche modale** (~35–40 %) et **média plein écran** (~85 %).

**D4 · P3 · Effet « recul » de vaul activé mais sans effet**
- [drawer.tsx:9](../src/components/ui/drawer.tsx#L9) :
  `shouldScaleBackground = true` par défaut, mais aucun élément
  `[vaul-drawer-wrapper]` dans l'app, donc la page ne recule jamais (§ 12
  « repousser le parent »). Réglage mort, à signaler seulement : soit on ajoute
  le wrapper (en vérifiant iOS et le mode louange), soit on assume.
- Poignée de 100 × 8 px ([drawer.tsx:58](../src/components/ui/drawer.tsx#L58)),
  massive à côté de celle d'iOS (~36 × 5).

**D5 · P3 · Couleur système orange, écran de démarrage blanc**
- `themeColor: "#EA580C"` ([layout.tsx:28](../src/app/layout.tsx#L28)) et
  `theme_color` / `background_color: "#ffffff"`
  ([manifest.ts:10-11](../src/app/manifest.ts#L10-L11)). Sur Android et en PWA
  desktop, une barre système **orange** coiffe une navbar crème, y compris en
  sombre. L'écran de lancement est blanc puis passe au crème ou au quasi-noir :
  saut de luminosité (§ 14). *Piste* : `theme-color` par schéma, égal à
  `--background`.
- `orientation: "portrait"` ([manifest.ts:12](../src/app/manifest.ts#L12))
  verrouille la PWA Android en portrait, alors que la mise en page tablette en
  2 colonnes existe (§ 16 Flexibilité).

## 7. Accessibilité, mouvement réduit, typographie (§ 14, § 15)

**C4 · P2 · `prefers-reduced-motion` traité à un seul endroit** *(mesuré)*
- Seul l'assistant de setlist a un repli. En émulation `reduce`, la navigation
  joue encore l'animation `enter` de 200 ms, et le menu mobile encore son
  glissement. Le fondu de page est toléré par le § 14 ; les **glissements et
  zooms** (menu, AlertDialog, menus déroulants, barres masquées) devraient
  passer en fondu court.
- `prefers-reduced-transparency` et `prefers-contrast` : **aucune** prise en
  compte, pour huit surfaces translucides.

**E1 · P3 · Libellés et accessibilité**
- Burger : `aria-label="Toggle menu"` en anglais, sans `aria-expanded`
  ([Navbar.tsx:438](../src/components/layout/Navbar.tsx#L438)).
- Menu mobile : « Language / 语言 », « Theme / 主题 » en dur
  ([Navbar.tsx:537](../src/components/layout/Navbar.tsx#L537),
  [Navbar.tsx:548](../src/components/layout/Navbar.tsx#L548)) ; bouton thème
  sans libellé.
- Login : validation par **bulles natives du navigateur**, dans la langue du
  téléphone et non de l'app, et seulement à l'envoi. Le § 16 veut une validation
  en ligne.

**E2 · P3 · Tailles de texte**
- Zoom pincé désactivé ([layout.tsx:34-35](../src/app/layout.tsx#L34-L35)),
  **choix assumé**, pas re-proposé. Il rend d'autant plus important un plancher
  lisible : 60 × `text-[10px]`, 52 × `text-[11px]`, 5 × `text-[9px]`,
  1 × `text-[8px]` dans `src/`. Mesuré : 70 nœuds de texte à 11 px sur `/songs`
  (étiquettes, index) ; libellés de la barre d'onglets à 10 px.

**F1 · P2 · Pas d'échelle typographique**
- **16 tailles arbitraires** en px (8, 9, 10, 11, 12, 12,5, 13, 13,5, 14, 15,
  15,5, 16, 17, 19, 22, 26) en plus de l'échelle Tailwind.
- **Interlettrage au cas par cas** : `-0.4px`, `-0.3px`, `-0.2px`, `1.4px`,
  `0.1em`, `0.08em`. La marque (17 px) est resserrée ; le h1 « Créer un
  compte » (20 px) ne l'est pas ; 19 petits libellés en majuscules sont en
  `tracking-widest`. Le § 15 veut un interlettrage **qui dépend de la taille**
  (négatif en grand, légèrement positif en petit), jamais une valeur au hasard.
- *Piste* : 5–6 crans de texte (taille, interligne, interlettrage et graisse
  ensemble) en tokens, pour l'UI hors chants.

**F2 · P3 · Rayons**
- 13 valeurs : `rounded-lg` ×121, `-full` ×77, `-xl` ×64, `rounded` ×45,
  `-md` ×23, `[9px]` ×18, `[8px]` ×15, `-sm` ×9, `[7px]`, `[10px]`… *Piste* :
  3–4 rayons, concentriques quand ils s'emboîtent (barre de 9 px dans une carte
  de 12 px).

**Note (code mort, signalé seulement)** : `tailwind.config.ts` déclare
`chord #2563EB`, `section #EA580C`, `jianpu #B91C1C`, mais l'app utilise les
variables CSS (`--chord-color #3f63cf`, etc.). Une seule classe y fait
référence. La section « Couleurs spec » du `CLAUDE.md` décrit ces anciennes
valeurs.

## 8. Fondations : simplicité, repérage, familiarité (§ 16)

**A4 · P1 · Navbar mobile trop large sous 375 px** *(mesuré + capture)*
- À **320 px** (iPhone SE 1re gén., ou SE 2/3 et mini en « Zoom de
  l'affichage » iOS), visiteur comme membre, le burger est à x = 333–371 :
  **hors écran**. Le bouton thème est coupé en deux. Sur mobile, tout ce qui
  n'est que dans le menu devient inaccessible : profil, guide, annonces,
  questionnaire, signalement, déconnexion. Pas de défilement horizontal pour le
  rattraper (la page reste à 320).
- À **375 px** (iPhone 13 mini, SE 2/3), ça tient, mais la marge droite tombe à
  4 px (visiteur) ou 8 px (membre) contre 16 à gauche.
- Cause : [Navbar.tsx:141](../src/components/layout/Navbar.tsx#L141), marque en
  `min-w-[111px] whitespace-nowrap`, suivie de 3 à 4 boutons fixes de 34 à
  54 px, sans rien qui puisse rétrécir ou passer dans le menu (§ 16
  Flexibilité : s'adapter à la taille de texte et d'écran de chacun).

**A3 · P1 · Recherche des chants coupée par l'index A–Z** *(mesuré + capture)*
- iPhone : le champ va jusqu'à x = 374, l'index commence à x = 352, donc 22 px
  du champ passent **sous** l'index et son bord droit disparaît. La liste, elle,
  réserve la place (cartes jusqu'à 346).
- Desktop et iPad : le champ est plus large que les cartes (960 contre 932 à
  1280 px), bords droits désalignés. L'index est collé au **bord de l'écran**,
  à des centaines de pixels de la liste qu'il pilote (§ 16 Proximité).

**G1 · P2 · [UX — à décider] Navbar desktop membre saturée**
- Capture `guide/planning.png` : 6 liens texte, puis 6 à 7 boutons d'icône
  (notifications, langue, thème, signaler ⚠, guide 📖, questionnaire, profil),
  puis « Déconnexion » en toutes lettres, soit **14 cibles**. Trois icônes ne
  se devinent pas (triangle = signaler, livre = guide, bulle-cœur =
  questionnaire). La déconnexion, action rare, est aussi visible que Planning.
- *Piste* : un menu compte (avatar) pour profil, guide, questionnaire,
  signalement et déconnexion. Le § 16 « Simplicité » : chemin courant d'abord,
  le reste un niveau plus bas.

**G2 · P2 · Doublons et CTA concurrents**
- Mobile : langue et thème sont **dans la navbar et dans le menu**. Connecté,
  le menu répète aussi les 4 destinations de la barre d'onglets du bas
  (Planning, Mes services, Chants, Setlists) : il fait 725 px de haut, alors
  que ce qui lui est propre (Annonces, guide, avis, signalement, profil,
  déconnexion) tiendrait sur un écran (lien avec A1).
- Visiteur sur `/login` : le bouton orange « Connexion » de la navbar reste
  affiché **au-dessus du bouton orange « Se connecter »** du formulaire. Deux
  primaires pour la même action.
- `/login` : titre de carte « GCC Louange » (répète la marque) et sous-titre
  « Connexion présidents de séance », alors que `/signup` dit « réservé aux
  membres de l'église ». Libellé incohérent (§ 16 libellés directs).

**G5 · P2 · Un badge d'état habillé en bouton principal**
- Détail d'une setlist, iPhone : « Vous pouvez modifier » est une pastille
  **orange pleine** (`Badge variant="default"`,
  [SetlistDetailClient.tsx:921](../src/app/setlists/[id]/SetlistDetailClient.tsx#L921)),
  exactement l'apparence des boutons d'action (« Mode louange » ▶ juste
  au-dessus, « + Nouvelle »). Ce n'est pas un bouton : un tap ne fait rien.
  Contredit le § 16 (« ce qui se ressemble doit se comporter pareil ») et la
  règle maison « orange = actions principales ».
- Même page : l'état sélectionné du segmenté Liste / Partitions et des chips
  voisines est en **teinte orange** (`bg-primary/10 text-primary`,
  [SetlistDetailClient.tsx:700](../src/app/setlists/[id]/SetlistDetailClient.tsx#L700),
  L710, L730, L747, L762), alors que la direction « Sobre » met les états
  sélectionnés à l'encre (le segmenté de `/setlists` et `/mes-services` est
  bien noir). À confirmer : oubli ou exception voulue ?

**G6 · P3 · Finitions vues en navigation membre**
- `/setlists` iPhone : l'onglet « 🔒 Mes setlists » passe sur **deux lignes**
  dans le segmenté, qui devient plus haut que ses voisins.
- `/planning` iPhone : des noms se coupent au milieu (« Ketty S., Olivier » /
  « S. »). *[UX — à décider]* La carte « Bienvenue — GCC Planning des
  services » occupe le premier demi-écran de la page la plus consultée, et
  « Ce dimanche » n'arrive qu'à mi-hauteur.
- `/mes-services` vide (compte sans nom de planning) : seule action, un lien
  souligné « Mon profil » perdu au milieu d'un écran blanc.

**G3 · P2 · [UX — à décider] Éditeur de setlist : deux primaires, deux retours**
- Capture `guide/composeSongs.png` et `/setlists/new` sur iPhone :
  « Créer la setlist » (orange, en haut à droite) **et** « Suivant → »
  (orange, en bas) en même temps, dès l'étape 1. « ← » en tête
  (quitter l'éditeur) **et** « ← Retour » en bas (étape précédente) : deux
  flèches, deux sens. La barre de tête est pleine largeur alors que le contenu
  est centré, les alignements ne se répondent pas.

**G4 · P3 · [UX — à décider] Liste des setlists : quatre étages de filtres**
- Capture `guide/setlists.png` : onglets À venir / Archives / Mes setlists,
  recherche, puce « Mes services », sélecteur « Toutes » + « Nouvelle ». Quatre
  couches avant la première carte.

## 9. Constats en zone gelée (page chant) — sans recommandation par défaut

- **Barre d'outils du chant ZH** (iPhone) : le sélecteur de tonalité est
  **tronqué en « C (or »** (69 px de large, bouton 拼 en plus). En FR il tient
  (107 px).
- La barre va jusqu'au bord droit (`px-1`) : le bouton « … » touche presque
  l'écran. Boutons de 36 px, sans état pressé (primitive `Button`, voir B1).
- Rien d'autre à signaler côté mouvement : la barre et la navbar se replient
  proprement au défilement, et le menu « Plus d'actions » est un Radix ancré.

---

## 10. Plan de chantier suggéré

Chaque lot se vérifie avec Playwright (mêmes pages et formats que cet audit),
en regardant les captures, sur 1 chant FR et 1 chant ZH, en clair et en sombre.

| Lot | Contenu | Constats | Nature |
| --- | --- | --- | --- |
| 1 | Bugs visibles : navbar à 320 px, panneau du menu opaque, défilant et aligné sur `--nav-h`, menu interruptible, recherche et index A–Z | A1–A4 | UI |
| 2 | Retour à l'appui centralisé (primitive `Button`, boutons d'icône, segmentés) | B1, B5 | UI |
| 3 | Système de mouvement : tokens durée/courbe, reduced-motion global, `PageTransition` sans clé ni fondu depuis 0, hystérésis des barres | B2, C3, C4 | UI |
| 4 | Matériaux et voiles : 2 tokens de verre, 2 niveaux de voile, bords de défilement, `theme-color` par schéma | D1–D3, D5 | UI |
| 5 | Modales unifiées : `ReportDialog` et `CustomizePanel` vers Radix/vaul, AlertDialog repris, menu Louange vers Radix, i18n des libellés en dur | C1, C2, E1 | UI (+ i18n) |
| 6 | Tokens typo et rayons (hors chants) | F1, F2, E2 | UI |
| 6 bis | Badge d'état et sélections en encre, finitions membre | G5, G6 | UI |
| 7 | Menu compte, menu mobile sans doublons, CTA uniques, filtres setlists, carte d'accueil planning | G1–G4, G6 | **UX, à décider** |

Hors lots, à trancher : l'effet de recul vaul (D4) et la troncature de la
barre chant en ZH (§ 9, zone gelée).
