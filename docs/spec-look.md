# Spec : lot 4, nouveau look (chantier 5)

**Statut au 15/09/2026 (nuit) : go donné le soir pour T0 et tout le lot 4 ;
T0 à T6 codées le 15/09/2026, tests verts sur trois appareils, non commitées,
à valider en local par Timothée** (voir « Avancement » en bas).
Planche interactive : https://claude.ai/artifact/3AXs4eYYCedEAYa8bgW8zL
(trois directions, quatre écrans téléphone et un écran ordinateur chacune,
clair et sombre, accent des actions au choix). Cette spec sera complétée à
partir des réponses de Timothée, puis attendra son go.

## Objectif

Une app que l'équipe a envie d'ouvrir, sobre mais ni fade ni « document »,
qui porte le nom **« GCC »** et un **menu par sections** (Louange, Planning,
Évènements…), toutes les pages d'un bloc, pages d'administration au nouveau
style sans réorganisation (`intent/vision-site.md`, « Déjà décidé »).

## Ce qui ne bouge pas

Logo dans sa pastille, couleurs de `serviceColors.ts`, couleurs des accords,
du 简谱 et des sections, calques 简谱, export PDF ; comportement du label
contextuel de la navbar (contextuel, coloré, animé) ; police des chants
choisie le 13/09/2026 ; place de la barre du bas, du bouton « Mode louange »
et de la barre d'outils du chant.

## Commun aux trois directions (indépendant du style)

- **Menu par sections** (prérequis § 7.18 de la feuille de route) :
  - connecté, téléphone et tablette : barre du bas **Louange · Planning ·
    Évènements · Moi** ; Louange = chants, setlists en second onglet de
    section (révisé le 16/09/2026 : **Chants · Setlists · Planning ·
    Évènements · Moi**, voir Q9) ; Moi = Mes services, cloche, profil, guide,
    questionnaire, Notifier, Admin (selon le rôle), déconnexion ;
  - connecté, ordinateur : navbar avec les sections et Mes services, cloche,
    **menu compte** (avatar) pour le reste : 14 cibles → 7 (audit G1) ;
  - sans compte : Chants, Évènements (calendrier public), Connexion.
- **Échelle de texte** hors chants, six crans : 11 · 13 · 15 · 17 · 22 · 30,
  interlettrage lié à la taille (audit F1, E2).
- **Trois rayons** : 8 (petits contrôles), 12 (cartes, champs), 20 (pilules),
  concentriques (audit F2).
- **Deux matériaux** (chrome fin ~80 % + flou fort ; panneau épais quasi
  opaque), bord de défilement au lieu du filet permanent (audit D1, D2).
- **Deux voiles** : tâche modale ~35 %, média plein écran ~85 % (audit D3).
- Retour à l'appui sur tout bouton ; mouvement réduit respecté ;
  `theme-color` égal au fond, par schéma (audit B1, C4, D5).

## Les trois directions

| | A « Réglages » | B « Musique » | C « Crème relevée » |
| --- | --- | --- | --- |
| Référence | Réglages d'iPhone | Musique d'Apple | Direction actuelle corrigée |
| Fond clair / sombre | gris chaud #f2f2ef / noir | blanc #fcfcfb / #0b0b0c | crème #f4f2ed / #0c0e13 |
| Surfaces | listes groupées blanches, sans bordure | pas de carte, filets fins | cartes à ombre douce (inchangées) |
| Police d'interface | celle du système (SF, Roboto, Segoe) | Manrope | Inter (inchangée) |
| Repère de couleur | icônes carrées teintées (services, FR / 中文) | vignettes carrées (tonalité, date) | rails de couleur affinés |
| Titre de page | grand titre | grand titre | aucun (comme aujourd'hui) |
| Risque / effort | moyen | moyen, plus de caractère | faible |

**Proposé** : A. Voir les pour / contre sur la planche.

## Accent des actions

L'orange sert aujourd'hui aux boutons principaux, au label et au refrain ;
chaque autre teinte est prise par une couleur gelée. Options : **encre**
(proposé : boutons noirs en clair, blancs en sombre, l'orange reste au label
et au refrain), orange actuel, rouge du logo (se confond avec le 简谱 et les
erreurs).

## Tour 1, tranché le 15/09/2026 au soir

- **D1** : direction **A « Réglages »**, avec les **vignettes teintées** de la
  direction B (fond teinté à ~13 % de la couleur, chiffre ou lettre dans la
  couleur : date pour les setlists et Mes services, tonalité pour les chants).
- **D2** : accent des actions = **rouge du logo** (#cf2a20 en clair, #ff6b61
  en sombre, texte blanc / brun foncé).
- **D7** : index A–Z = **lettre agrandie** (la lettre grossit dans la colonne et
  s'affiche dans un petit encart), barre du haut fixe pendant le geste, marge
  recalée. Petit lot à part, avant le look, sur go.
- D3 à D6 sont reprises dans les questions du tour 2.

## Tour 2 : treize questions, toutes tranchées le 15/09/2026 au soir (colonne « Proposé » = retenu)

| # | Question | Variantes | Proposé |
| --- | --- | --- | --- |
| Q1 | Vignette des chants | a tonalité sur teinte FR bleue / 中文 rouge · b tonalité sur gris, langue en étiquette · c pas de vignette, rail de langue | a |
| Q2 | Repère des services dans « Ce dimanche » | a vignette initiales · b carré de couleur devant le nom · c nom dans sa couleur | b |
| Q3 | Où va le rouge | a boutons pleins seulement (onglet actif, liens, interrupteurs en encre) · b partout où iOS met sa teinte | a |
| Q4 | Couleur du label de la navbar | a orange actuel · b rouge du logo | b |
| Q5 | Fond des pages | a gris chaud, groupes blancs · b blanc, groupes gris | a |
| Q6 | Mode sombre | a noir pur, groupes anthracite · b bleu-noir actuel | a |
| Q7 | Grand titre de page | a oui, replié au défilement · b non | a |
| Q8 | Police d'interface | a système · b Manrope | a |
| Q9 | Barre du bas connecté | a Louange · Planning · Évènements · Moi · b onglets actuels · c comme a avec « Mes services » | a, **révisé le 16/09/2026** : Chants · Setlists · Planning · Évènements · Moi (le sous-onglet des setlists n'avait pas été codé, les setlists étaient injoignables sur tactile ; cinq libellés tiennent à 320 px) |
| Q10 | Sans compte | a barre du bas Chants · Évènements, Connexion dans la navbar · b navbar seule | a |
| Q11 | Onglets de section du planning | a pilules colorées · b pilules neutres, actif coloré · c souligné | b |
| Q12 | Densité de la liste des chants | a titre, artiste, thèmes · b titre, artiste · c une ligne | b |
| Q13 | Barre d'outils du chant (place gelée) | a boutons séparés · b pilule groupée | b |

## Ce qui est construit (décisions consolidées)

### Tokens (`globals.css`, `tailwind.config.ts`, `layout.tsx`, `manifest.ts`)
- **Fond** clair `#f2f2ef`, groupes `#ffffff` ; sombre `#000000`, groupes `#1c1c1e`.
  Texte `#1c1c1e` / `#f2f2f7`, secondaire `#6c6c72` / `#98989f`, filet
  `rgba(60,60,67,.14)` / `rgba(84,84,88,.65)`.
- **Accent des actions** = rouge du logo `#cf2a20` (texte blanc) / `#ff6b61`
  (texte `#1c0a08`) : **boutons pleins seulement**. Onglet actif, liens,
  interrupteurs, sélections, focus : **encre**. Actions destructives : variante
  destructive inchangée.
- **Label contextuel de la navbar** : même rouge (comportement gelé, couleur
  choisie). L'orange ne reste qu'au refrain (`--sec-chorus`, gelé).
- **Police d'interface** : celle du système (`-apple-system, system-ui, "Segoe UI",
  Roboto, "PingFang SC", "Noto Sans CJK SC"`) ; `next/font` Inter retiré.
  Police des chants inchangée.
- **Échelle de texte** hors chants : 11 · 13 · 15 · 17 · 22 · 30 (tokens
  taille + interligne + interlettrage), plus de `text-[Npx]` hors chants.
- **Rayons** : 8 (petits contrôles), 12 (groupes, champs), 20 (pilules).
- **Matériaux** : `chrome` (fond 80 %, flou fort, saturation) pour navbar,
  barre du bas, barres d'outils ; `panneau` (quasi opaque) pour menus et
  feuilles. Bord de défilement à la place du filet permanent.
- **Voiles** : 35 % (tâche modale), 85 % (média plein écran).
- `theme-color` par schéma = fond ; `manifest` `theme_color` et
  `background_color` alignés.
- Mouvement réduit global ; retour à l'appui sur la primitive `Button`.

### Navigation (`Navbar.tsx`, `MobileTabBar.tsx`, nouvelle page `/moi`, `PageTitle`)
- Nom **« GCC »** + label contextuel.
- **Connecté, tactile** : barre du bas **Chants · Setlists · Planning ·
  Évènements · Moi** (Moi → `/moi`). Jusqu'au 16/09/2026 : Louange · Planning ·
  Évènements · Moi, avec les setlists prévues en onglet de section — jamais
  codé, donc setlists injoignables sur tactile ; corrigé par un onglet direct.
- **Sans compte** : barre du bas **Chants · Évènements**, bouton **Connexion**
  dans la navbar.
- **Ordinateur** : navbar Planning · Louange (Chants, Setlists) · Évènements ·
  Mes services, cloche, **menu compte** (profil, guide, questionnaire,
  signalement, Notifier, Admin selon le rôle, déconnexion).
- **Page « Moi »** (`/moi`) : groupes Mes services, notifications, profil,
  guide, questionnaire, Notifier et Admin selon le rôle, déconnexion.
- **Grand titre** replié au défilement sur Chants, Setlists, Planning,
  Évènements, Mes services, Moi.

### Listes et vignettes (`SongListClient`, `SetlistCard`, `mes-services`, planning)
- **Groupes** (fond groupe, rayon 12, filets internes en retrait) remplacent
  les cartes par élément ; rails de couleur supprimés.
- **Vignette teintée** (fond couleur à ~13 %, texte couleur) : chants =
  tonalité, teinte FR (`--fr-accent`) ou 中文 (`--zh-accent`) ; setlists et Mes
  services = jour + mois dans la couleur de catégorie / service.
- **Ce dimanche** : carré de couleur devant le nom du service.
- **Chants** : titre, artiste (pinyin · artiste en 中文), chevron ; thèmes
  seulement dans le filtre.
- **Onglets de section** (planning, évènements) : pilules neutres, l'onglet
  actif prend la teinte et le texte de sa couleur de service.

### Page du chant, setlists, mode louange
- Barre d'outils du chant : **pilule groupée**, même place, mêmes commandes.
- Sections de la partition : enveloppe en groupe ; couleurs, teintes, police et
  contenu inchangés. Bandeau « coup d'œil » et menus repris aux tokens.
- Setlist : liste, détail, éditeur (page unique) et vue partitions au nouveau
  style, sans réorganisation. Mode louange : chrome (réglages, barres,
  feuilles) aux tokens ; rendu des paroles inchangé.

### Pages secondaires
Login, inscription, profil, guide, questionnaire, Notifier, Admin,
évènements (calendrier, fiche, scène), 404 : tokens et groupes, **sans
réorganisation**. Captures du guide à refaire après la mise en ligne (lot 8).

## Décisions du tour 1 (pour mémoire)

| # | Question | Proposé |
| --- | --- | --- |
| D1 | Direction : A, B, C ou mélange | A |
| D2 | Accent : encre, orange, rouge du logo | encre |
| D3 | Police d'interface : système, Manrope, Inter | celle de la direction |
| D4 | Onglets : option 1 (Louange · Planning · Évènements · Moi) ou option 2 (onglets actuels, Évènements dans le menu) | option 1 + menu compte |
| D5 | Sans compte : Chants · Évènements · Connexion | oui |
| D6 | Grand titre de page | oui |
| D7 | Index A–Z avant le look : bulle, lettre agrandie, rien | bulle, barre du haut fixe, marge recalée |

## Index A–Z (hors lot 4, petit lot proposé avant)

- **État** : le balayage est codé et commité (`b395745`, 14/09/2026, matin),
  couvert par `tests/songs-index.spec.ts` (vrais événements tactiles).
  Revérifié le 15/09/2026 sur le serveur de travail, format téléphone : en
  douze pas de A vers O la liste passe par B, D, E, F, G, I, J, K, M, N, O.
  À confirmer sur l'iPhone de Timothée.
- **Reste** (un seul fichier, `src/app/songs/SongListClient.tsx`) : la lettre
  sous le doigt n'est pas visible ; la barre du haut se cache et revient à
  chaque changement de sens pendant le geste (`useScrollDirection`) ; le
  premier chant de la lettre arrive au ras du haut (`scroll-mt-[120px]` calé
  sur une navbar qui, elle, s'est cachée).
- **Test d'abord** : la bulle (ou l'encart) affiche la lettre courante tant que
  le doigt est posé, disparaît au relâcher ; la navbar garde sa position
  pendant le geste ; le premier chant de la lettre est visible sous la barre.

## Boundaries

- Toujours : Playwright sur trois appareils, 1 chant FR + 1 chant ZH, clair et
  sombre, captures regardées ; tokens dans `globals.css` + classes Tailwind ;
  un commit par lot, sur demande.
- Demander d'abord : tout ajout ou retrait de fonctionnalité ; toute couleur
  gelée ; la couleur du label contextuel.
- Jamais : toucher au contenu des chants, aux calques 简谱, à l'export PDF
  actuel, au mode louange au-delà de son chrome.

## Avancement (15/09/2026)

Go de Timothée le 15/09/2026 au soir (« go pour T0 et tout le lot 4 »). Tout
est codé le jour même, test d'abord à chaque tranche, sur ordinateur,
téléphone et tablette, clair et sombre, 1 chant FR + 1 chant ZH, captures
regardées. Rien n'est commité (commit sur demande).

| Tranche | Fait | Tests |
| --- | --- | --- |
| T0 index A–Z | lettre agrandie + encart pendant le geste, barres immobiles (`data-nav-lock` lu par `useScrollDirection`), marge `scroll-mt` calée sur la navbar | `songs-index.spec.ts` (+2 tests) |
| T1 fondations | tokens A clair / sombre, rouge du logo en `--primary`, police du système (Inter retiré), échelle 11 · 13 · 15 · 17 · 22 · 30, matériaux `material-chrome` / `material-panel`, voiles 35 %, mouvement réduit global, `theme-color` par schéma, manifest, `Button` en pilule avec retour à l'appui | `look-fondations.spec.ts` |
| T2 navigation | navbar par sections + menu compte (ordinateur), barre du bas Louange · Planning · Évènements · Moi (membre) et Chants · Évènements (visiteur), page `/moi`, `PageTitle`, primitives `Group` / `GroupRow` ; menu burger supprimé (`navbar-mobile.spec.ts` retiré, son contrôle 320 px repris) | `look-navigation.spec.ts` |
| T3 louange | liste des chants en lignes groupées avec vignette de tonalité (`Tile`), thèmes dans le filtre seulement ; barre d'outils du chant en pilules groupées, même place ; setlists en lignes avec vignette de date ; détail de setlist, éditeur, mode louange : barres en matériau chrome, sélections en encre | `look-louange.spec.ts` |
| T4 planning | onglets de section en pilules neutres (actif teinté), accueil du planning avec grand titre, prochain service en vignette, carrés de couleur ; Mes services en lignes groupées avec vignette de date ; cartes d'évènements avec vignette | `look-planning.spec.ts` |
| T5 secondaires | login, inscription, profil, guide, questionnaire, Notifier, Admin, 404, erreur, PushPrompt, ReportDialog : liens en encre, boutons pleins en pilule, groupes sans bordure, libellés en bas de casse, plancher 11 px ; `sw.js` en `gcc-louange-v2` | `look-secondaires.spec.ts` |
| T6 cohérence | balayage : `text-primary` → encre (24), tailles < 11 px hors partitions (35), rayons arbitraires → 8 / 12 (13), champs sans bordure sur fond gris (11 + primitive `Input`) ; suite complète relancée | tous |
| T7 tactile (16/09/2026) | retour de Timothée « moins bien sur téléphone et tablette » : audit avant/après (captures, mesures, taps) → barre du bas **Chants · Setlists · Planning · Évènements · Moi** (les setlists étaient injoignables), pilules de section à 40 px, commandes de la barre d'outils du chant à 36 px sur tactile (32 sur ordinateur), ligne de setlist avec catégorie et présidence insécable, sélecteur de tonalité fermé réduit à la tonalité sur tactile (suffixe « (orig.) » / « (reco.) » dans la liste, et fermé sur ordinateur) | `look-navigation.spec.ts` (setlists à un tap, pilule ≥ 40 px), `look-louange.spec.ts` (commandes ≥ 36 px, catégorie et présidence, tonalité lisible à six commandes) |

Restes connus, hors lot : les captures du guide montrent l'ancien look (à
refaire au lot 8) ; `tsc` signale un fichier généré périmé dans `.next/types`
(route `notify-annonce` supprimée au lot 6), sans effet en CI ; le grand titre
défile avec la page (pas de repli animé, choix de simplicité).

## 20/09/2026 : direction 5C1 « Encre · Relief » et retours de Christelle

Statut : **direction choisie par Timothée le 20/09/2026 ; retours de Christelle
reçus le même jour ; boutons, tonalité transposée, taille des pastilles et mode
sombre tranchés le soir ; rien n'est codé, la spec attend le go.**

Timothée : « Pour la DA du site on va aller sur la 5C1 de cet artefact. »
Planche : https://claude.ai/artifact/HNDu1pSHipBnuG7MuDCqbR — page « Pistes de
style » pour 5C1 tel que proposé, page **« 5C1 · retours 20-09 »** pour ce qui
suit (17 planches, version 12, générateur dans le scratchpad `planche-retours/`).

Christelle, sur l'ensemble : « pcq y'a vraiment des trucs bien actuellement »,
« comme on s'est tous habitué à certains trucs, vaut mieux pas trop changer et
perdre les gens ». Et la règle qu'elle pose pour tout le site : une forme ne
sert qu'à une information (« faut que qu'une soit occupée pour 2 infos »).

### Ce qu'est 5C1

Fond blanc, encre `#1c1c1e`, gris `#6c6c72`, filets `rgba(60,60,67,.14)`,
police du système, rayons 10 / 18 / 26. La couleur seulement où elle informe
(tonalité, services, sections). **Ce qui se touche porte une ombre**
(`0 4px 14px rgba(28,28,30,.10), 0 1px 2px rgba(28,28,30,.06)`) : recherche,
pilule d'outils, boutons, barre du bas en verre flottante. Les listes restent des
filets, sans cartes. Par rapport au lot 4 (direction A « Réglages ») : le fond
gris et les groupes en cartes partent, la navigation et la structure des pages
ne bougent pas.

### Les retours, vue par vue

| Vue | Retour de Christelle | Ce que le code montre | Ce qui est retenu |
| --- | --- | --- | --- |
| A, liste des chants | « OK pour l'ensemble, très épuré et minimaliste. On garde les pastilles rectangulaires + bord arrondi comme actuellement sur GCC pour les gammes et placer à droite ; on met en couleur bleu ou rouge selon le chant CH ou FR » | `main` : pastille `rounded-[7px]` neutre à droite + badge FR / 中文 dessous, pas de chevron. Branche : vignette `Tile` teintée à gauche | Pastille rectangulaire à coins arrondis, **à droite**, bleue (FR) ou rouge (中文). Le jeton rond de 5C1 et la vignette du lot 4 partent. Pas de chevron, comme aujourd'hui. Le badge FR / 中文 ne revient pas : la couleur le dit |
| B, page du chant | « Ajouter structure pastille validée ensemble » | Le bandeau « coup d'œil » est déjà en pastilles rondes teintées (`SongView.tsx`, `h-11 min-w-11 rounded-full`) | **Rondes : le bandeau actuel**, rien à recoder (tranché par Timothée le 20/09). Tonalité en rectangle, structure en rond : une forme, une info |
| B | « Accord à afficher en noir quand c'est en vue par section » | Déjà le cas : `chartStyle` = « couleur par type de section, cadre gris fin, accords neutres ». La planche 5C1 se trompait | Rien à coder ; la planche est corrigée |
| C (et B) | « Bouton mode louange trop présent (rouge + taille) », « trop imposant (changer de couleur ?) » ; « ça me fait penser à : bouton urgence » ; idée : « le bouton change de couleur selon la setlist : si c'est franco c'est couleur franco » | Plein rouge du logo, 48 px, halo rouge. **Sur la page d'un chant il n'y a pas de mode louange** : `PerformanceMode` n'est importé que par `SetlistDetailClient`, sur `main` comme sur la branche ; la planche du 19/09 l'avait inventé (Timothée : « depuis quand il y a un mode louange pour un chant qui vient de la liste des chants ») | **Tranché par Timothée le 20/09 au soir** : 44 px, sans halo, **à la couleur du culte de la setlist** (`categoryColor`). Rien sur la page d'un chant |
| C, setlist | « OK pour le haut. Liste des chants garder la présentation actuelle du site, la structure pas en couleur, on garde comme le site actuel mais en abréviation (C R..) » | `ListView.tsx` sur `main` : numéro dans un rond gris, titre, pinyin, artiste, structure en texte gris aux noms complets séparés par « · », modulation `↗A` en vert, transition colorée reliée à sa note, tonalité à droite | Cette présentation, avec les abréviations du lot 3 (I · C1 · Pr · R · P…). La modulation et la transition gardent leur couleur : elles relient la note à sa section, c'est le site actuel. Tonalité à droite, même pastille que la vue A |
| D, planning | « OK, juste enlever le petit carré puisqu'il y a déjà la ligne en couleur » | Carré de couleur devant le nom du service, en plus du filet de gauche | Le carré part |

Tous les accords, sections et couleurs de service restent gelés
(`serviceColors.ts`, `globals.css`).

### Les boutons pleins (tranché le 20/09/2026 au soir)

Timothée : « garder les boutons en noir (encre) par contre le bouton mode louange
qu'il y a dans les setlists les mettre de la même couleur du culte qui le concerne
(franco, inter groupe, le groupe etc…) et ça pour tous les boutons colorés qu'il y
a ». Portée confirmée le même soir :

- **Par défaut, un bouton plein est en encre** (`#1c1c1e`, libellé blanc ; en
  sombre, l'inverse : bouton clair, libellé encre — c'était l'option proposée le
  15/09/2026, « Accent des actions »). Le
  rouge du logo sur les boutons pleins (décision du 15/09/2026) est abandonné :
  « bouton urgence ».
- **Quand l'écran appartient à un culte ou à une section, le bouton plein prend sa
  couleur** : « Mode louange » d'une setlist (`categoryColor(category)`),
  « S'inscrire » sur l'évènement d'une section. Sans culte (évènement de toute
  l'église, nouvelle setlist, connexion) : encre.
- **Contraste** : libellé blanc à 4,5 au moins sur toutes les couleurs de
  `serviceColors.ts` (5,3 à 7,6), sauf Intergroupe `#a87b0f` (3,8). Tranché :
  **le fond du bouton Intergroupe est `#966d0d`** (la même teinte à 89 %, 4,7) ;
  l'ocre reste l'ocre partout ailleurs, `serviceColors.ts` n'est pas touché. Une
  catégorie inconnue retombe sur le gris `#64748b` (4,8).

Planches : C · Culte Franco, C · Intergroupe, C · Groupe Paix, C · EDD 中班,
E · Toute l'église (encre), E · Une section (couleur).

### Les quatre écarts, tranchés le 20/09/2026 (nuit)

| Écart | Décision | Par |
| --- | --- | --- |
| Où reste le rouge du logo ? | « G reco. » de la pilule d'outils passe **en encre**. Le rouge ne reste que sur le logo (et le label contextuel de la navbar, inchangé) | Timothée |
| Tonalité transposée dans une setlist | L'information reste, **en texte** : « orig. A » en gris (11 px) sous la pastille, seulement quand la tonalité jouée diffère de l'originale. La couleur de la pastille dit la langue, le texte dit d'où l'on vient ; il prend la place laissée par le badge 中文. Plus parlant que l'ancienne teinte, qui disait « différent » sans dire de quoi | délégué à Claude (« choisis à ma place ») |
| Pastilles de structure | **Rondes.** Un rond et un carré de 44 px occupent la même case : la forme ne fait rien tenir de plus, c'est la taille. **32 px sous 640 px de large, 44 px au-delà** (la taille en place). Le bandeau n'est pas cliquable (`SongView.tsx` : des `<span>`), donc pas de plancher tactile. À 32 px, neuf étapes tiennent sur une rangée à 390 px, douze sur deux ; à 44 px, douze sur une rangée dès la tablette (810 px) | Timothée (« c'est mieux en rond ou sinon on peut changer de forme ») → Claude |
| Mode sombre | **Oui.** Voir ci-dessous | Timothée |

Relevé à l'appui : 370 chants, médiane 4 sections, 90 % en ont 6 au plus, maximum
10 ; une structure jouée en compte couramment 8 à 12 avec les reprises. Appareils
des tests : 412 px (Pixel 7), 810 px (iPad), 1280 px.

### 5C1 en sombre

Les tokens sombres qui existent déjà dans `globals.css` sont repris tels quels :
fond noir pur `#000000` (Q6 du 15/09), encre `#f2f2f7`, gris `#98989f`, filet
`rgba(84,84,88,.65)`, accords `#8fb0ff` (neutres = encre en vue par section),
sections `--sec-*` et leurs teintes, langues `--fr-accent` `#a8bff5` et
`--zh-accent` `#f2b8b5`.

Ce que 5C1 ajoute :

- **L'élévation par la surface, pas par l'ombre.** Sur du noir une ombre ne se voit
  pas : ce qui se touche (recherche, pilule d'outils, boutons, barre du bas) passe
  sur `#1c1c1e` avec un liseré `rgba(255,255,255,.10)`.
- **Bouton plein : l'encre s'inverse**, bouton `#f2f2f7`, libellé `#1c1c1e` ;
  onglet actif de la barre du bas de même. Bouton d'un culte : sa vraie couleur,
  libellé blanc, liseré `rgba(255,255,255,.14)`.
- **Les couleurs de service en texte.** `serviceColors.ts` n'a pas de variante
  sombre, et sur du noir ces couleurs sont illisibles en texte (`#2d5a65` : 2,8
  pour 4,5 exigé) — c'est déjà un défaut du sombre du lot 4 (vignette de date,
  libellé de catégorie). **Elles sont éclaircies à l'affichage**
  (`color-mix(in srgb, <couleur> 55%, white)`) pour le texte et les filets ; les
  fonds (boutons, teintes) gardent la vraie couleur. Le fichier gelé n'est pas
  touché.

Planches : page « 5C1 · retours 20-09 », rangées « Structure » (téléphone,
tablette, ordinateur) et « Mode sombre » (A, B, C, D, E), version 12.

### Reste à confirmer au go

- **« Évènements »** est le libellé le plus long de la barre du bas : à l'étroit
  dans la pastille active à 390 px, à vérifier à 320 px (sans objet tant que la
  section est coupée en ligne : quatre onglets).

### Tranches (après le go, test d'abord, trois appareils, clair et sombre)

| Tranche | Contenu | Où |
| --- | --- | --- |
| V1 fondations | tokens 5C1 (fond blanc, filets, ombre des commandes) ; sombre : surface `#1c1c1e` + liseré à la place de l'ombre, couleurs de service éclaircies en texte | `globals.css`, `tailwind.config.ts` |
| V2 listes | groupes en cartes → filets ; pastille de tonalité à droite, bleu / rouge, « orig. X » dessous dans une setlist | `Group`, `Tile`, `SongListClient`, `SetlistCard` |
| V3 chant et setlist | « G reco. » en encre ; bandeau à 32 px sous 640 px ; « Mode louange » à la couleur du culte, 44 px ; liste « comme aujourd'hui » en abrégé | `SetlistDetailClient`, `ListView`, `button.tsx` (variante pleine encre / couleur) |
| V4 planning et évènements | carré retiré ; boutons pleins en encre, couleur de la section sur l'évènement d'une section | `planning/page.tsx`, pages du planning, `EvenementClient` |
| V5 balayage | pages secondaires, captures des trois appareils, suite complète | specs `look-*` |
