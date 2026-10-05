# Spec : lot U4 — navigation sur grand écran (barre latérale)

Lot U4 du chantier « Back-Office, grands écrans, petit déj, setlist » (`feuille-de-route.md` § 3.U).
Il pose le cadre que remplissent U5 et U5 bis (`spec-deux-volets.md`, `spec-editeur-setlist.md` :
Chants et Setlist dans la place libérée) et U6 (`spec-back-office.md` : sélecteur App ↔ Back-Office,
menu à 8 entrées, barre du bas personnalisable).

Statut : **Spec écrite le 04/10/2026 ; rien n'est codé. Attend la validation de Timothée, puis son go.**
Part en ligne avec tout le chantier, à la fin (interrupteur retiré, fusion sur `main`).

## Mots de Timothée

> « Faire en sorte que la version sur ordi du site prenne toute la place qu'il y a sur l'écran du
> responsive, pour tablette aussi, il faut changer la disposition des pages » ; « Avant de coder
> quoi que ce soit j'ai besoin que tu me montres tous les design » (03/10/2026).

Consigné ensuite (§ 3.U, vision du 03/10/2026) : piste A, une seule barre latérale, réductible en
icônes sur ordinateur ; téléphone et tablette portrait, même modèle, la tablette en plus grand ; le
04/10, tablette en paysage, barre **toujours réduite**. Question posée par Timothée, tranchée ici :
la barre de la tablette en paysage peut-elle se déplier à la demande (par exemple un appui sur le
logo qui la déplie par-dessus la page et la referme après le choix), ou jamais ?

## Ce que le code montre (04/10/2026)

- **Deux barres aujourd'hui.** La Navbar, fixe en haut (`Navbar.tsx:137-143`, 58 px + `--sat`,
  bornée à 1 080 px) : logo et label (`:145-164`), sections dès 1 024 px **quel que soit
  l'appareil** (`:168-242` : Planning, Louange ▾ Chants / Setlists, Évènements et Tâches derrière
  `BACK_OFFICE`, Mes services), cloche (`:246-295`), langue (`:297-305`), thème (`:307-314`), menu
  « Compte » (`:316-371`) ou « Connexion » (`:372-381`). La barre du bas (`MobileTabBar.tsx:18-30`,
  `:59` coupe Évènements sans l'interrupteur), masquée seulement par `.hide-on-desktop` =
  `(pointer: fine) and (min-width: 1024px)` (`globals.css:143-149`), centrée à 560 px dès 640 px,
  posée à `--tabbar-bottom` (`globals.css:176`). Un iPad couché a donc **les deux**, voulu par
  `MobileTabBar.tsx:32-38`.
- La Navbar porte deux choses invisibles : la langue mémorisée pour les rappels (`saveNotifLang`,
  `:102-112`) et la cloche, dont le hook interroge Firestore en REST toutes les 10 min et au retour
  de focus (`useNotifications.ts:32`, `:158`). Le menu « Compte » ne lit les plannings (Harmonie)
  qu'à son ouverture (`Navbar.tsx:392-403`).
- Tout ce qui se pose sous la Navbar lit `--nav-h` (`globals.css:169`) : `main` (`layout.tsx:65`),
  onglets de section (`SectionTabs.tsx:54`), barres d'outils du chant et de la setlist
  (`SongDetailClient.tsx:295`, `SetlistDetailClient.tsx:945`), éditeur (`SetlistForm.tsx:545`),
  liste des setlists (`setlists/page.tsx:389`), pastille de rafraîchissement (`PullToRefresh.tsx:57`).
- Éléments fixes calés sur **toute la fenêtre**, qui passeraient sous une barre à gauche : les deux
  barres d'outils (`left-0 right-0`), la barre d'action de l'éditeur (`SetlistForm.tsx:911`,
  `inset-x-0`, plan 50 : elle couvrirait le pied de la barre), le sommaire de la setlist
  (`SetlistOutline.tsx:105-108`, gauche calculée sur 50 % de la fenêtre), le message de la setlist
  (`SetlistDetailClient.tsx:1437`), la pastille de rafraîchissement, le halo et sa copie dans les
  barres (`globals.css:63-71`, `:124`).
- Le mode louange est un calque `fixed inset-0 z-[9999]` rendu dans la page (`PerformanceMode.tsx:909`),
  lancé en plein écran natif (`SetlistDetailClient.tsx:1065`). Il couvre la Navbar parce qu'aucun
  ancêtre n'est repère ni pile : `.page-fade` n'anime que l'opacité pour cette raison
  (`globals.css:125-129`).
- Réglages « par appareil » : `localStorage`, une clé par réglage (`partitionLayoutPref.ts:8-23`) ;
  `<html>` porte déjà `suppressHydrationWarning` (`layout.tsx:50`), l'en-tête a déjà un script
  d'une ligne (`layout.tsx:59`). `vaul` ouvre une feuille par la gauche (`direction`,
  `node_modules/vaul/dist/index.d.ts:80`) ; l'enveloppe du projet met l'arrière-plan à l'échelle
  (`drawer.tsx:8-20`) ; `useStandaloneScrollLock.ts:12-15` verrouille la page en PWA iOS. Chaque
  page pose sa largeur (`max-w-2xl`, ex. `moi/page.tsx:56` ; `max-w-full`, ex. `planning/culte/page.tsx:64`).
- WebKit (bug 209292, Safari 14) : sur iPad avec trackpad, `pointer` reste `coarse` et `hover`
  `none` ; seuls `any-pointer` et `any-hover` changent. Safari sur iPad se dit Mac : l'agent
  utilisateur ne distingue rien. Playwright : `playwright.config.ts:30-34` (1 280 × 720, Pixel 7,
  iPad gen 7 810 × 1 080) ; il connaît « iPad (gen 7) landscape » (1 080 × 810, tactile).

## Décisions de Timothée — à ne pas rouvrir

| Date | Décision |
| --- | --- |
| 13/09/2026 | Chaque appareil a sa mise en page. Repères clés à leur place : barre du bas, « Mode louange », barre d'outils du chant. |
| 13/09/2026 | Label contextuel : forme dégelée, comportement (contextuel, coloré, animé) gelé. Libellés écrits plutôt qu'icônes muettes. |
| 16/09/2026 | Barre du bas : Chants · Setlists · Planning · Évènements · Moi ; visiteur Chants · Évènements ; Mes services sous Moi. |
| 20–27/09/2026 | Barre du bas à 21 px du bas sur iPhone ; réserve `--sat` gardée, jamais `black-translucent` ; barres sans voile, filet ni flou, fond opaque qui repeint page et halo (V8) ; le mode louange garde ses barres. |
| 03/10/2026 | Piste A : une seule barre latérale, réductible en icônes sur ordinateur. |
| 03/10/2026 | Téléphone et tablette portrait : même modèle, la tablette en plus grand (barre du bas centrée, un volet). |
| 03/10/2026 | Lecture plafonnée vers 1 440 px ; grilles (planning, calendrier, tableau de bord) pleine largeur. |
| 03/10/2026 | Back-Office (U6) : sélecteur App ↔ Back-Office pour les responsables, menu à 8 entrées, barre du bas du Back-Office personnalisable ; celle de l'App reste fixe. |
| 04/10/2026 | Tablette en paysage : barre latérale toujours réduite (remplace « iPad paysage = ordinateur »). L'écran `ipad-paysage` est écarté. |
| 04/10/2026 | Éditeur réduit d'office sous 1 440 px : à revoir dans `spec-editeur-setlist.md`. |
| 04/10/2026 | Tout part en ligne ensemble à la fin du chantier ; l'interrupteur `BACK_OFFICE` est alors retiré. |

## Décisions proposées ici

| # | Proposition | Raison lue dans le code |
| --- | --- | --- |
| Q1 | **Quatre dispositions décidées en CSS** : ordinateur = `(pointer: fine) and (min-width: 1024px)` ; tablette paysage = `(pointer: coarse) and (orientation: landscape) and (min-width: 1024px)` ; sinon tablette portrait (≥ 768 px) ou téléphone (< 768 px). Aucune condition remplie : le modèle du téléphone. | La règle « ordinateur » existe déjà (`globals.css:147`). La largeur seule confond un iPad couché (1 024 à 1 366 px) et un petit portable, l'agent utilisateur aussi. Avec un trackpad, WebKit garde `pointer: coarse` : un iPad à clavier reste une tablette et ne bascule pas quand on branche le clavier. `orientation` garde un iPad Pro 13 pouces debout (1 024 px) dans le modèle de la barre du bas. En CSS rien ne saute au chargement : le serveur rend les deux barres, le CSS en montre une. 768 px est déjà le seuil de V7 ter (`SectionTabs.tsx:58`). |
| Q2 | **Plus de barre du haut sur grand écran** : la Navbar est masquée par CSS en tablette paysage et sur ordinateur, mais reste montée ; `--nav-h` y vaut `--sat` ; la barre du bas et sa cale y sont masquées aussi. | La planche n'a pas de barre du haut (`Main`, `ordinateur-barre-reduite`, `ipad-paysage-reduit`). Rester montée garde la langue des rappels (`Navbar.tsx:102-112`). Les décalages lisent déjà `--nav-h`. |
| Q3 | **Mêmes entrées que la barre du bas**, tirées d'une seule liste : membre Chants · Setlists · Planning · Évènements · Moi ; visiteur Chants · Évènements ; Évènements coupé sans l'interrupteur tant qu'il existe. Responsable : les mêmes, plus la place du sélecteur (U6). | Planche `Main`. Une liste unique (aujourd'hui `MobileTabBar.tsx:18-30`) empêche les deux barres de diverger ; U6 y ajoute l'espace Back-Office. |
| Q4 | **Pied de barre** : membre = initiale, nom et nom de planning (comme le menu, `Navbar.tsx:332-334`), cloche, langue ; l'initiale ouvre le menu « Compte » d'aujourd'hui, inchangé, qui garde ce nom accessible. Visiteur = « Connexion », langue, thème. | Planche `Main`. Le menu existe (`coherence.spec.ts:78-84` le clique). Le visiteur n'a pas de page Moi : son bouton de thème (`Navbar.tsx:307-314`) doit rester joignable. Le thème d'un membre est dans Moi (`moi/page.tsx:97-106`). |
| Q5 | **Barre réduite** (68 px) : logo, entrées en icônes de 44 px (libellé lu par les lecteurs d'écran, en infobulle au survol), « Déplier la barre latérale », cloche et initiale en bas. Ni label, ni langue, ni sélecteur : on les retrouve en dépliant. | Planche `ordinateur-barre-reduite` : rien d'autre n'y figure. |
| Q6 | **Choix « réduite » retenu par appareil** (`localStorage`, clé `barre-laterale`), reflété sur `<html data-barre="reduite">` par une ligne de script dans l'en-tête, avant le premier affichage ; dépliée par défaut. | Comme les autres réglages d'appareil. C'est une affaire d'écran (portable et grand écran n'appellent pas le même choix), le visiteur en profite, rien n'est écrit dans Firestore. Sans le script, la page sauterait de 180 px à chaque chargement. |
| Q7 | **Une seule cloche** : le hook des notifications est appelé une fois, au-dessus des barres, et partagé. | Il interroge Firestore toutes les 10 min : deux barres montées doubleraient les lectures (offre gratuite). |
| Q8 | **`--barre-laterale`** (0, 68 ou 248 px ; 0 à l'impression) décale `main` et chaque élément fixe calé sur la fenêtre (liste ci-dessus) ; le halo part du bord de la barre. Ne bougent pas : le mode louange, les feuilles, les dialogues, l'accueil de première connexion, qui couvrent tout. | Sinon la barre d'action de l'éditeur recouvre le pied de la barre et le sommaire passe dessous. |
| Q9 | **Rien autour de `main` ne devient repère ni pile** : ni `transform`, ni `filter`, ni `contain`, ni `container-type`, ni `z-index`. Une page qui veut des requêtes de conteneur (U5) les pose sur un bloc sans élément fixe. | Le mode louange doit couvrir la barre comme il couvre la Navbar. `container-type` faisait de son élément le repère des descendants positionnés jusqu'à Chrome 129. |
| Q10 | **Largeurs** : jeton `--largeur-lecture: 1440px` ; une page de lecture borne son conteneur avec lui, centré dans la zone de contenu (fenêtre moins la barre) ; une grille ne pose rien. Pas de composant. U4 n'élargit aucune page : chaque lot déclare les siennes (U5 Chants et Setlist ; U2, U6 à U8 les grilles). | Les pages posent déjà leur largeur en classes ; un jeton suffit. |
| Q11 | **À l'œil** : la barre de la planche (248 / 68 px, fond `#f7f7f8`, filet `#ececee` à droite, entrée courante en pastille d'encre, label 17 px rouge). Sombre (absent de la planche) : fond `--card` `#1c1c1e`, filet `--border`, pastille inversée comme la barre du bas. Le haut de la barre réserve `--sat`. Plan 40 ; plan 50 quand elle est dépliée par-dessus. | Planche ; 5C1 en sombre (`globals.css:237-264`) ; défense du 21/09 (`globals.css:162-167`) : un iPad installé ce jour-là passe sous l'heure. |
| Q12 | **Pas d'animation de largeur** : la barre bascule d'un coup, les libellés arrivent en fondu court. Dépliée par-dessus, elle glisse depuis la gauche et repart par le même chemin ; mouvement réduit : fondu. | Animer la largeur recalcule toute la page à chaque image (partitions lourdes) : `transform` et opacité seulement. |
| Q13 | **Barre du haut de la tablette portrait inchangée** : 58 px (la planche en dessine 64). | `--nav-h` et `look-zone-sure.spec.ts:15-19` reposent sur 58 px. |
| Q14 | **Pour U6** : les entrées viennent d'une fonction par espace (« app » seul en U4) ; la barre latérale garde, sous le label, une place vide que U6 remplit du sélecteur pour les responsables ; la barre du bas prend la même liste, U6 y ajoute « Plus » et le choix des onglets. | Demandé pour U6 ; planches `Main`, `bo-tableau-de-bord`, `tablette-portrait-back-office`. |
| Q15 | **Réduite d'office** : une page peut demander la barre réduite tant qu'elle est affichée ; sur ordinateur, la barre se comporte alors comme en tablette paysage (réduite, dépliable par-dessus) ; le choix retenu ne change pas. | Décision du 04/10 pour l'éditeur, à revoir avec la piste 2. |
| Q16 | **Deux projets Playwright** : `tablette-paysage` (iPad gen 7 couché, 1 080 × 810, Chromium) et `ordinateur-1440` (1 440 × 900), limités par `testMatch` à la navigation et aux specs du dimanche. | Les trois projets actuels ne montrent ni la tablette couchée ni la lecture à 1 440 px ; toute la suite sur cinq projets coûterait deux tiers de temps en plus. |

## Objectif

1. Sur ordinateur et tablette en paysage, **une seule barre, à gauche**, remplace la barre du haut
   (et celle du bas sur la tablette) ; la page prend toute la largeur qui reste.
2. Ordinateur : barre **réductible en icônes**, l'appareil s'en souvient. Tablette en paysage :
   **toujours réduite** (dépliable par-dessus si la question 1 est acceptée).
3. Téléphone et tablette en portrait : **rien ne change**. Le dimanche (setlist, barre d'outils,
   mode louange) marche pareil sur les cinq projets.
4. U6 y met son sélecteur et ses entrées sans retoucher la barre. U4 n'élargit aucune page : c'est
   le travail de U5, U2 et U6 à U8.

**Réussite** : sur ordinateur à 1 440 px, un membre ouvre Chants. À gauche, la barre de la planche :
« GCC Louange », Chants en pastille d'encre, Setlists, Planning, Évènements, Moi ; en bas son
initiale, la cloche, FR. Ni barre en haut ni barre en bas, le halo part du bord de la barre, aucun
défilement horizontal. Sur Planning, le label devient « Planning » en fondu. Il réduit la barre :
68 px, icônes avec infobulle ; il recharge : toujours réduite, sans saut. Il ouvre une setlist : la
barre d'outils tient sur une ligne et commence au bord de la barre ; « Mode louange » couvre tout
l'écran, barre comprise ; il quitte et retrouve sa page. Sur un iPad en paysage : barre réduite, ni
barre du haut ni barre du bas ; « Déplier » l'ouvre par-dessus la page, il choisit Planning, la page
change et la barre se referme. Il tourne l'iPad : barre du haut et barre du bas, comme aujourd'hui.
Sans compte : Chants, Évènements, « Connexion », FR. En français et en 中文 ; à l'impression, ni
barre ni marge.

## Modèle

Rien de nouveau dans Firestore. Contrats :

```ts
/** Vocabulaire commun du chantier U ; choisie par le CSS, jamais par l'agent utilisateur. */
type Disposition = "telephone" | "tablette-portrait" | "tablette-paysage" | "ordinateur";
/** Espace montré par la barre. U4 ne remplit que "app" ; U6 ajoute "back-office". */
type Espace = "app" | "back-office";
/** Une entrée, la même pour la barre latérale et la barre du bas. */
type EntreeBarre = { href: string; cle: string /* libellé i18n */; Icone: LucideIcon; actifSur: string[] /* préfixes d'URL */ };

function entreesBarre(espace: Espace, ctx: { connecte: boolean; backOffice: boolean }): EntreeBarre[];
function labelDeSection(pathname: string): string;            // clé i18n ; Navbar.tsx:123-131 déplacé
function getBarreReduite(): boolean;                           // localStorage « barre-laterale »
function setBarreReduite(reduite: boolean): void;              // + attribut data-barre sur <html>
function useBarreReduiteDOffice(actif: boolean): void;         // Q15 : pose html[data-barre-forcee]
```

| Jeton CSS | Téléphone, tablette portrait | Tablette paysage | Ordinateur, dépliée | Ordinateur, réduite | Impression |
| --- | --- | --- | --- | --- | --- |
| `--barre-laterale` | 0 | 68 px | 248 px | 68 px | 0 |
| `--nav-h` | 58 px + `--sat` (inchangé) | `--sat` | `--sat` | `--sat` | — |

`--largeur-lecture` vaut 1 440 px partout ; `data-barre="reduite"` ne compte que sur ordinateur.
Libellés nouveaux (`fr.json`, `zh-CN.json`) : « Réduire la barre latérale » / 收起侧边栏, « Déplier
la barre latérale » / 展开侧边栏 (中文 à relire par Timothée).

## Écrans

**Ordinateur, barre dépliée** (`Main`). Colonne de 248 px. En haut : logo (lien vers l'accueil,
comme `Navbar.tsx:145`), « GCC » et le label en rouge, qui change en fondu ; à droite, « Réduire la
barre latérale ». Dessous, la place du sélecteur (vide en U4). Puis les entrées, icône et libellé,
l'entrée courante en pastille d'encre (`aria-current="page"`), dans une `nav` nommée « Navigation
principale », comme la barre du bas (une seule des deux est exposée à la fois). En bas, sous un
filet : initiale (menu « Compte »), nom, cloche et son compteur, langue ; les menus s'ouvrent à côté
de la barre. La page commence en haut de l'écran, à droite de la barre. La barre défile seule si la
fenêtre est trop basse. Tab parcourt logo, bouton, entrées, pied ; focus à l'encre.
*Visiteur (absent de la planche)* : Chants, Évènements ; en bas « Connexion » (bouton plein, encre),
langue, thème.

**Ordinateur, barre réduite** (`ordinateur-barre-reduite`). 68 px : logo, entrées en icônes de
44 × 44, « Déplier la barre latérale » sous les entrées, cloche et initiale en bas. *Visiteur* :
langue, thème et « Connexion » en icônes.

**Tablette en paysage** (`ipad-paysage-reduit`). La même barre réduite, toujours, sans « Réduire ».
« Déplier » pose la barre de `Main` **par-dessus** la page (qui ne bouge pas), sur un voile à 35 %
(vue absente de la planche) ; elle se referme au choix d'une entrée, sur un toucher du voile, par
Échap ou « Réduire », et ne retient rien ; lignes de 44 px au moins.

**Tablette en portrait** (`tablette-portrait-chant`, `tablette-portrait-back-office`). Rien ne
change : barre du haut (logo, label, cloche, langue ; « Connexion » sans compte) et barre du bas
centrée de 560 px. U6 y ajoute le sélecteur après le label et la barre du Back-Office (Accueil ·
Calendrier · Tâches · Planning · Plus).

**Téléphone** : rien ne change (la planche met le sélecteur de U6 à la place du label,
`bo-telephone-accueil` : à trancher dans `spec-back-office.md`, le label étant gelé). **Mode
louange** (`mode-louange-2-colonnes`) : plein écran, aucune barre.

## Ce qui sera construit — cinq tranches

L'ordre protège le dimanche : N1 ne change rien à l'écran ; téléphone et tablette portrait ne
changent jamais ; la tablette couchée (le pupitre) vient après l'ordinateur, une fois la barre
éprouvée. Test d'abord à chaque tranche ; avant la suivante, les specs du dimanche (setlist, barre
d'outils, mode louange) passent sur les cinq projets.

### N1 — Fondations, rien ne change à l'écran
Projets `tablette-paysage` et `ordinateur-1440`. Jetons `--barre-laterale` (0 partout) et
`--largeur-lecture`. `main` et les éléments fixes de Q8 lisent `--barre-laterale`. Une seule cloche
(Q7). `entreesBarre`, `labelDeSection` et le menu « Compte » sortis de `Navbar` et `MobileTabBar`,
rendus à l'identique. *Vérifiable* : suite complète verte sur les trois projets ; comparaisons au
pixel de `look-barres.spec.ts` inchangées.

### N2 — Ordinateur : la barre dépliée
`BarreLaterale` (`src/components/layout/`), montée dans `layout.tsx`, visible sur ordinateur ;
Navbar et barre du bas masquées par CSS ; `--nav-h` = `--sat`, `--barre-laterale` = 248 px.
Entrées, label, pied (membre et visiteur), place du sélecteur. Les libellés de la barre d'outils de
la setlist (aujourd'hui dès `lg`) n'arrivent que s'ils tiennent à côté de la barre : seuil mesuré
par le test « une seule ligne ». Le sommaire de la setlist se cale dans la zone de contenu et se
masque s'il n'y tient pas (U5 le remplace). *Vérifiable* : projets ordinateur et ordinateur-1440.

### N3 — Ordinateur : réduire, déplier, s'en souvenir
Boutons, `getBarreReduite` / `setBarreReduite`, script d'en-tête, infobulles. *Vérifiable* :
rechargement, premier affichage sans saut.

### N4 — Tablette en paysage
Barre réduite toujours ; Navbar et barre du bas masquées ; dépliée par-dessus (feuille `vaul` par la
gauche, sans mise à l'échelle, verrou PWA) si la question 1 est acceptée. *Vérifiable* : projet
tablette-paysage ; un iPad Pro 13 pouces debout et un téléphone couché gardent la barre du bas.

### N5 — Réduite d'office (seulement si `spec-editeur-setlist.md` la demande)
`useBarreReduiteDOffice`. *Vérifiable* : une page qui la demande ; en la quittant, le choix retenu
est intact.

## Tests (Playwright, écrits avant le code)

Nouveau : `tests/navigation-grand-ecran.spec.ts`, sur les cinq projets ; un test propre à une
disposition le dit dans son titre.

- **Précondition** : `(pointer: coarse)` vrai sur telephone, tablette, tablette-paysage, faux sur
  les deux projets ordinateur ; sinon les projets sont faux et on s'arrête.
- **Dispositions** : ordinateur à 1 024, 1 280, 1 440, 1 920 px → barre latérale seule ; tablette
  paysage → 68 px, sans « Réduire » ; tablette portrait et téléphone → barres du haut et du bas ;
  iPad Pro debout (1 024 × 1 366, tactile), téléphone couché (915 × 412) et fenêtre d'ordinateur de
  900 px → barres du haut et du bas, comme aujourd'hui.
- **Entrées et label** : membre, les cinq dans l'ordre, la courante en `aria-current` et pastille
  d'encre ; visiteur, Chants · Évènements et « Connexion » ; sans interrupteur, pas d'Évènements.
  « Louange » sur `/songs` et `/setlists`, « Planning » sur `/planning`, rouge du logo, en fondu.
- **Réduire / déplier** (ordinateur) : 248 → 68 px, la zone de contenu suit, noms accessibles et
  infobulles présents ; rechargé : réduite ; scripts de Next bloqués : zone déjà à 68 px.
- **Tablette paysage** : « Déplier » ouvre par-dessus (la page ne bouge pas d'un pixel) ;
  « Planning » navigue et referme ; Échap et un toucher du voile referment, le focus revient.
- **Rien ne passe sous la barre** : barres d'outils, barre d'action de l'éditeur, sommaire et
  message de la setlist à droite de la barre ; halo à `x = --barre-laterale` ;
  `scrollWidth = clientWidth` aux quatre largeurs, dépliée et réduite.
- **Dimanche** : « Mode louange » sur ordinateur et tablette paysage : le centre de la barre
  appartient au mode louange ; en quittant, la barre revient et la page est à sa place.
- **Impression** : ni barre ni marge. **Zone sûre** : `--sat` à 24 px, le logo reste dessous.
  **Une seule cloche** : les requêtes de notifications partent une fois. **Sombre et 中文** :
  couleurs de la barre, libellés et noms des boutons. Captures à l'œil, cinq projets, clair et sombre.

Tests existants touchés, adaptés dans la tranche qui les casse :

| Fichier | Ce qui change |
| --- | --- |
| `look-navigation.spec.ts:165-196` | navbar d'ordinateur (sections, « Louange », « Compte ») → barre latérale ; `:68-103` sautent aussi tablette-paysage |
| `back-office-coupe.spec.ts:44-52` | navigation « Sections » → « Navigation principale » de la barre, toujours sans Évènements ni Tâches |
| `coherence.spec.ts:78-84` | « Compte » cherché dans le pied de la barre (même nom) |
| `look-fondations.spec.ts:42-47` | label rouge cherché dans la barre visible, plus dans `header` |
| `look-zone-sure.spec.ts:15-47` | barre du haut mesurée là où elle existe ; même garde pour le haut de la barre latérale |
| `look-barres.spec.ts:205-212` | « la navbar repeint le halo avant React » : là où il y a une navbar |
| `look-halo.spec.ts:24`, `:46-58` ; `look-halo-defilement.spec.ts` | halo à `x = --barre-laterale`, largeur = fenêtre moins la barre ; géométrie « grand » pour les nouveaux projets |
| `songs-index.spec.ts:126-149` | barre du haut mesurée à 1 280 × 800 : absente sur ordinateur et tablette paysage |
| `setlist-suppression-groupee.spec.ts:294-295` | `header` absent sur grand écran |
| `look-louange.spec.ts:99` (« une seule ligne ») | iPad couché avec la barre de 68 px ; cas ordinateur de 1 024 à 1 440 px, dépliée et réduite |
| `performance-mode.spec.ts` | inchangé, lancé aussi sur les deux nouveaux projets |

## Hors périmètre

- **Toujours** : la disposition décidée par le CSS ; le mode louange par-dessus tout ; la réserve
  `--sat` ; aucun défilement horizontal ; FR et 中文 ; l'interrupteur `BACK_OFFICE` respecté tant
  qu'il existe ; trois appareils plus les deux projets.
- **Demander avant** : élargir une page ou une rangée d'onglets (lots U5, U2, U6 à U8) ; toucher à
  la barre du bas (place, 21 px, entrées) ; remettre Mes services ou Tâches dans la barre ; un
  raccourci clavier ; retenir le choix sur le compte ; toute dépendance npm (aucune n'est nécessaire).
- **Jamais** : `black-translucent` ou toute retouche de la zone de l'heure ; `transform`, `filter`,
  `contain`, `container-type` ou `z-index` sur `main` et ses ancêtres ; reconnaître l'appareil par
  l'agent utilisateur ; une barre visible en mode louange ; toucher `serviceColors.ts`, le logo, les
  couleurs des accords, des sections et du 简谱.

## Questions ouvertes

1. **Tablette en paysage : la barre se déplie-t-elle à la demande ?** Recommandé : **oui**, par le
   bouton « Déplier » que la planche montre déjà (`ipad-paysage-reduit`), par-dessus la page,
   refermée après le choix ; le logo reste un lien vers l'accueil, comme partout. Sans cela, la
   barre réduite n'offre jamais ni la langue, ni le nom, ni le sélecteur : un responsable sur iPad
   couché ne changerait pas d'espace depuis la barre, et les libellés écrits n'y paraîtraient jamais.
   Si c'est non : U6 loge un sélecteur compact dans la barre réduite, la langue passe par Moi.
2. **Pas de sélecteur dans la barre réduite** (la planche n'en montre pas) : on change d'espace en
   dépliant. Recommandé : oui, si 1 est oui.
3. **Le label contextuel n'est pas dans la barre réduite** (planche) ; il reste dans la barre dépliée
   et la barre du haut, avec son comportement gelé. Recommandé : oui ; l'entrée en pastille et le
   grand titre de la page disent où l'on est.
4. **Sur ordinateur comme sur tactile** : Mes services et Tâches quittent la barre (par Moi ; Tâches
   ira au Back-Office en U6), « Louange ▾ » devient Chants et Setlists, le bouton de thème d'un
   membre passe dans Moi. Recommandé : oui, c'est la planche (un clic de plus pour Mes services).
5. **Le choix « réduite » est retenu par appareil**, pas par compte. Recommandé : oui.
6. **Un iPad avec clavier et trackpad reste une tablette** (toujours réduite). Recommandé : oui.
7. **Deux projets Playwright de plus**, limités à la navigation et aux specs du dimanche, plutôt que
   toute la suite sur cinq projets. Recommandé : oui.
8. **« Réduite d'office »** seulement si `spec-editeur-setlist.md` la demande. Recommandé : oui
   (cette spec propose d'y renoncer, mesures à l'appui : N5 ne se ferait alors pas).

## Commandes

```bash
npm test -- tests/navigation-grand-ecran.spec.ts      # PW_PORT=3000 si un next dev tourne déjà
npm test -- tests/look-navigation.spec.ts tests/look-louange.spec.ts tests/performance-mode.spec.ts
npm test -- --project=tablette-paysage --project=ordinateur-1440
npm test -- tests/back-office-coupe.spec.ts           # le site sans l'interrupteur
npx tsc --noEmit
npm run lint
```

## Avancement

- 04/10/2026 : go (questions sans réponse = recommandations). Branche locale `lot/u4-navigation` : `016a633` N1
  (fondations, rien ne change à l'écran), `2cfeda4` N2 commencé (barre latérale sur ordinateur), **non testé**.
  Agents arrêtés par Timothée le 04/10 au soir ; rien fusionné dans `ui/apple-design`, rien poussé. U4 bis
  (`spec-pages-en-grand.md`) se code après U4.
- 05/10/2026 : **N2 faite** (commit « feat(U4): N2 — ordinateur : la barre latérale dépliée », sur
  `lot/u4-navigation`, local, non poussé ; il complète le wip `2cfeda4`). `BarreLaterale` montée dans `layout.tsx`, montrée
  par le CSS seul sur ordinateur (pointeur fin, ≥ 1 024 px) : logo et label en fondu, place vide du sélecteur,
  entrées de `entreesBarre` (pastille d'encre, `aria-current`), pied membre (initiale → menu « Compte », nom,
  cloche, langue) ou visiteur (« Connexion », langue, thème), menus ouverts à côté de la barre ; navbar masquée
  mais montée, `--nav-h` = `--sat`, `--barre-laterale` = 248 px (0 à l'impression). Libellés de la barre d'outils
  de la setlist : requête de conteneur sur la rangée (pas sur `main`), seuil mesuré à 880 px, soit dès 1 160 px de
  fenêtre barre dépliée. Sommaire de la setlist montré seulement s'il tient (1 280 px de contenu, 1 528 px de
  fenêtre) : `coup-d-oeil` et `setlist-regie` le testent à 1 600 px. Tests : `navigation-grand-ecran.spec.ts`
  (vus rouges avant le code, puis verts) et onze specs adaptées (tableau ci-dessus) ; vingt fichiers de test
  verts sur les cinq projets (ordinateur et ordinateur-1440 : 474 ; téléphone, tablette, tablette-paysage : 754) ;
  captures regardées aux cinq tailles, clair et sombre. La tablette en paysage garde ses deux barres jusqu'à N4.
  Reste : N3 (réduire, déplier,
  s'en souvenir, infobulles, libellés « Réduire / Déplier la barre latérale »), N4 (tablette en paysage). N5 ne se
  fait pas (U5 bis, question 2). Rien à publier pour Timothée (ni règles ni données).
