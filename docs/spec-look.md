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
sombre tranchés le soir ; go le 20/09/2026, V1 à V4 CODÉES le jour même (voir
« Avancement 5C1 »), à valider en local.**

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

### Avancement 5C1 (20/09/2026)

Go de Timothée le 20/09/2026. Test d'abord à chaque tranche, vu rouge puis vert
sur ordinateur, téléphone et tablette ; captures clair et sombre regardées sur les
trois appareils.

| Tranche | Fait | Tests |
| --- | --- | --- |
| V1 fondations | fond blanc, `--secondary` `#f2f2f4`, filet `#e4e4e5` ; **`--primary` devient l'encre** (s'inverse en sombre) : tous les boutons pleins d'un coup, sans toucher 31 fichiers ; **`--brand`** = rouge du logo, pour le seul label de la navbar ; `--raised` + `--shadow-raised` et l'utilitaire `.raised` (ombre en clair, liseré en sombre) ; `theme-color` et manifeste en blanc | `look-fondations.spec.ts` |
| V2 listes | `Group` sans boîte : lignes en filets alignées sur le titre, retour à l'appui en pastille débordante ; liste des chants et des setlists de même ; **`KeyPill`** (nouvelle primitive) à droite, bleu / rouge, sans chevron ; recherche en relief ; vignette de date lisible en sombre (`.svc-ink`) | `look-louange.spec.ts` |
| V3 chant et setlist | pilules de la barre d'outils en relief ; bandeau de structure à 32 px sous 640 px ; « Mode Louange » à la couleur du culte (`serviceButtonFill`, Intergroupe `#966d0d`), liseré en sombre ; liste de la setlist en abrégé, `KeyPill` avec « orig. X », plus de libellé 中文 | `look-louange.spec.ts`, `coup-d-oeil.spec.ts` |
| V4 planning et évènements | « Ce dimanche » : filet à la couleur du service (`.svc-line`), plus de carré ni de boîte ; « S'inscrire » en encre, à la couleur de la section sur l'évènement d'une section | `look-planning.spec.ts`, `evenements.spec.ts` |
| Barre du bas | flottante, en verre (`.material-bar`), onglet courant en pastille d'encre ; centrée et bornée à 560 px à partir de la tablette ; les cinq libellés tiennent à 320 px (`flex-auto`) | `look-navigation.spec.ts` |

Un constat qui corrige la spec : sur le vrai site, « Mode Louange » est la pilule
de la barre d'outils de la setlist (32 px, icône seule sur téléphone), pas un
grand bouton de 44 px — c'était la planche. Sa place est gelée : seule sa couleur
change. Et « Ce dimanche » n'avait que le carré, pas de filet : le filet de la vue
D validée par Christelle est donc ajouté, le carré retiré.

V5 (balayage des pages secondaires) : les blocs `bg-card` hors listes (formulaires,
administration) se fondent dans le blanc en clair et restent des panneaux en
sombre. À regarder page par page avec Timothée pendant sa validation.

### Le halo d'en-tête, oublié (constat du 20/09/2026, après la mise en ligne)

Statut : **tranché et go de Timothée le 20/09/2026 (« téléphone et tablette seule
je pense, je suis OK avec tout le reste ») ; voir « Tranché » plus bas.**

Timothée : « il y a un dégradé en haut qui n'est pas présent sur le site
actuellement alors qu'on a push le nouveau design ». Ce n'est ni le déploiement ni
le cache : le halo est sur les planches de 5C1 depuis le début (hérité de la
famille « Verre »), mais « Ce qu'est 5C1 » ci-dessus ne le décrit pas et aucune
tranche V1–V5 ne le porte. Il n'a jamais été codé (aucune trace dans `src/`).

Ce que montrent les planches (téléphone, 390 px) : une ellipse floue posée en
absolu dans l'en-tête, qui déborde du coin de l'écran et défile avec la page.

| Planche | Couleur | Place | Taille, flou |
| --- | --- | --- | --- |
| A · Chants | bleu des accords `#3f63cf` à 10 % | haut gauche (`left −60`, `top −80`) | 320 × 240, 40 px |
| B · Chant | orange du refrain `#e0560a` à 12 % | haut **droite** (`right −80`, `top −60`) | 300 × 220, 44 px |
| C · Setlist | couleur du culte à 14 % (Franco `#2d5a65`, Intergroupe `#a87b0f`, Paix `#6b4a8e`, EDD `#3b6d11`) | haut gauche (`left −40`, `top −60`) | 300 × 220, 44 px |
| D · Planning | `#2d5a65` à 10 % | haut gauche, comme A | 320 × 240, 40 px |
| E · Évènements, rangée Structure | pas de halo | | |
| Sombre (A, C) | mêmes valeurs, sur noir | | |

| Tranche | Contenu | Où |
| --- | --- | --- |
| V6 halo | le halo des quatre écrans ci-dessus : un utilitaire `.halo` (couleur par `--halo`), décoratif (`aria-hidden`, `pointer-events: none`, masqué à l'impression). La navbar est fixe en `material-chrome` (fond à 80 %) : le halo part du haut de la page et se voit à travers, comme sur la planche qui n'a pas de navbar | `globals.css`, `SongListClient`, `SongDetailClient`, `SetlistDetailClient`, `planning/page.tsx` |

Réussite, vérifiable sur les trois appareils, clair et sombre :

- présent sur Chants, un chant, une setlist, Planning ; absent ailleurs ;
- une setlist prend la couleur de **sa** catégorie (`categoryColor`), vue sur deux
  cultes différents ;
- aucun défilement horizontal : le halo du chant déborde à droite
  (`scrollWidth === clientWidth`) ;
- ne capte ni clic ni lecteur d'écran ; invisible en mode louange et à l'impression ;
- les couleurs gelées sont lues, jamais modifiées.

Tranché par Timothée le 20/09/2026 :

1. **Téléphone et tablette seulement**, pas de halo sur ordinateur (la planche ne
   le montrait que sur téléphone ; la recommandation était les trois appareils).
2. **Pages hors planche** (liste des setlists, Moi, Harmonie, Mes services,
   connexion) : rien, fidèle à la planche.
3. **Planning** : on garde la planche (`#2d5a65` à 10 %), même si la page couvre
   tous les cultes.

#### Avancement V6 (20/09/2026)

CODÉ le jour même, test d'abord (vu rouge puis vert sur les trois appareils),
captures regardées en clair et en sombre ; NON commité, à valider en local.

| Fait | Où | Tests |
| --- | --- | --- |
| utilitaire `.halo` + variantes `.halo-fiche`, `.halo-chant` (géométries des planches A/D, C, B) ; primitive `Halo` (`color`, `variant`) ; posé sur Chants (`--chord-color`), un chant (`--sec-chorus`), une setlist (`categoryColor`), Planning (`PLANNING_COLORS.culte`) | `globals.css`, `src/components/layout/Halo.tsx`, `songs/page.tsx`, `SongDetailClient`, `SetlistDetailClient`, `planning/layout.tsx` + `page.tsx` | `look-halo.spec.ts` (10 tests × 3 appareils : 26 verts, 4 propres à un appareil) |

Comment il tient : le conteneur plein écran de la page passe en `relative`, le
halo est son premier enfant (absolu, remonté de `--nav-h`, large de `100vw`,
`overflow: hidden` : le halo du chant déborde à droite sans élargir la page), et
le contenu qui suit est `relative` pour se peindre au-dessus. Pas de `z-index`
négatif (le fond `bg-background` de la page le cacherait) ni de contexte
d'empilement (il piégerait le mode louange sous la navbar). « Ordinateur » =
`(pointer: fine)`, une souris, **quelle que soit la largeur** : une tablette en
paysage garde le halo, une fenêtre d'ordinateur étroite ne l'a pas. La règle du
dépôt pour la barre d'onglets (`… and (min-width: 1024px)`) ne convenait pas ici :
`100vw` compte la barre de défilement classique d'un ordinateur, et sous 1024 px
le calque élargissait la page d'une quinzaine de pixels (trouvé à la relecture,
test « fenêtre étroite »).

Trois constats :

- **Couture sous la navbar** : le voile blanc à 80 % de la navbar atténue le halo là
  où il est le plus fort ; la navbar fait une bande plus claire à bord net (251
  contre 236 juste dessous), qui s'efface vers la droite. La planche n'avait pas de
  navbar. Seule vraie correction : une navbar transparente en haut de page, dont le
  voile n'apparaît qu'au défilement (grands titres d'iOS) — changement de la navbar,
  hors V6. **Tranché par Timothée le 20/09/2026 : « on laisse la barre telle quelle
  est ».** La couture reste, la navbar n'est pas touchée.
- **Sombre** : Chants prend le jeton sombre des accords (`#8fb0ff`), plus lisible
  sur noir que le bleu clair des planches sombres (qui réutilisaient la valeur du
  clair). Les couleurs de service n'ont pas de sombre : sur noir, le halo d'une
  setlist est presque invisible, comme sur la planche R-N-C.
- **Halo plus bas sur un chant et une setlist** (vu en ligne après la poussée du
  20/09/2026, `8c255ca`) : le calque commence à `y = 48` sur la page d'un chant au
  lieu de `0`. La marge haute du contenu (`mt-[48px]`, `marginTop: toolbarH` sur la
  fiche d'une setlist — déduit du même mécanisme, non mesuré) fusionne à travers le
  conteneur, qui descend d'autant, et le halo avec lui. Le test de position ne
  portait que sur `/songs`. Rendu = celui des captures montrées à Timothée ; remonté
  à `0`, le halo passerait presque entier sous les deux barres translucides (navbar
  + barre d'outils). **À trancher** : garder ce rendu et le rendre volontaire (test
  de position par page), ou coller à la planche (`display: flow-root` sur le
  conteneur annule la fusion).
- **Piège Tailwind** : une classe de `@layer utilities` n'est gardée que si son nom
  est écrit en toutes lettres dans le code ; `halo-${variant}` était purgé.

### Barres et halo : réouvert le 20/09/2026 au soir (V6 bis)

Statut : **go de Timothée le 20/09/2026 (« Go, il faudrait un halo pour les gens sur
tablette et sur ordi aussi. je suis OK avec ce que tu as décidé ») : option C, halo
agrandi sur ordinateur, décalage de 48 px corrigé. CODÉ le jour même, test d'abord,
NON commité, à valider en local. Voir « Avancement V6 bis » plus bas.**

Timothée, en voyant le Planning en ligne sur son téléphone : le dégradé aussi
« sur tablette et ordinateur » ; « la bande en haut avec le logo de l'église » et
« la barre pour les planning » ne devraient pas rester blanches mais prendre « la
même couleur de fond que le reste du site » ; « élargir le dégradé à la bande » ;
« tout ce qui y ressemble doit être modifié aussi ». Cela rouvre « on laisse la
barre telle quelle est » du même jour.

Tranché par questions (20/09/2026) :

- **Toutes les barres `.material-chrome`** changent ensemble, par le seul réglage
  de `globals.css` : navbar, onglets de section (Planning, Évènements), barre
  d'outils d'un chant et d'une setlist, barre de la liste des setlists, barre de
  l'éditeur de setlist.
- **Le mode louange garde ses deux barres** telles quelles (pas de dégradé derrière
  elles : les rendre plus fines n'apporterait rien et gênerait la lecture).

Le halo n'a pas à être agrandi sur téléphone : il part déjà du haut de l'écran,
c'est le blanc à 80 % des barres qui le masque. Alléger les barres l'« étend ».

Planche : https://claude.ai/artifact/HNDu1pSHipBnuG7MuDCqbR, page **« V6 · barres et
halo 20-09 »** (version 14, 20 planches ; générateur dans le scratchpad `barres/gen.py`).
Quatre colonnes, une seule variable, le fond des barres :

| | Fond des barres | Au repos | Quand du contenu défile dessous |
| --- | --- | --- | --- |
| Aujourd'hui | blanc 80 %, flou 20 px | barres blanches sur page teintée, couture nette | lisible |
| A « verre léger » | blanc 45 %, flou 20 px, saturation 1,6 | le halo traverse les barres, couture adoucie | taches de couleur un peu présentes |
| B « verre très léger » | blanc 18 %, flou 22 px, saturation 1,7 | halo presque intact dans les barres | taches nettement présentes sous le nom et les commandes |
| C « rien en haut » | transparent en haut de page ; voile d'aujourd'hui dès qu'on défile | aucune barre visible, le halo est continu | identique à aujourd'hui |

Rangées : Planning (navbar + onglets), Chants (navbar seule), un chant au repos,
un chant défilé (le cas le plus dur : titre gras sous la navbar, pastilles de
couleur sous la barre d'outils), ordinateur.

**Ordinateur** : la colonne de contenu est centrée. À la taille du téléphone le
halo reste coincé dans le coin, loin du titre ; agrandi en proportion de l'écran
(860 × 560, flou 90 px sur 1280 px de large) il retrouve la composition du
téléphone. Les deux sont sur la planche. Conséquence à prévoir : la règle
`@media (pointer: fine) { .halo { display: none } }` saute, donc le calque ne peut
plus faire `100vw` (barre de défilement classique) — à régler dans le lot.

À corriger dans le même lot, quel que soit le choix : le halo 48 px trop bas sur
un chant et une setlist (ci-dessus) ; avec une barre transparente son bord coupé
se verrait.

Recommandation : **C**. C'est la seule qui donne le halo plein en haut de page
sans rien coûter à la lisibilité quand on défile, et c'est le comportement des
grands titres d'iOS que l'équipe connaît. Elle demande un état « en haut de page »
par barre (la navbar l'a déjà : `atTop`), donc plus de code que A ou B, qui
tiennent en une ligne de CSS.

#### Avancement V6 bis (20/09/2026)

| Fait | Où | Tests |
| --- | --- | --- |
| **Barres, option C** : `html[data-at-top] .material-chrome:not(.material-steady)` efface fond, flou et filet ; fondu de 200 ms sur le fond ; `.material-steady` sur les deux barres du mode louange. L'attribut est posé avant le premier affichage par une ligne de script dans l'en-tête (sinon le voile blanc clignote à chaque chargement, le temps que React démarre), puis tenu à jour par la Navbar (`atTop`, seuil 4 px, qu'elle avait déjà) | `globals.css`, `layout.tsx`, `Navbar.tsx`, `PerformanceMode.tsx` | `look-barres.spec.ts` (8 tests × 3) |
| **Halo sur ordinateur**, agrandi à partir de 1024 px (860 × 560, −140 / −200, flou 90 px, calque de 560 px), à gauche comme à droite (chant) ; la règle `@media (pointer: fine)` part | `globals.css` | `look-halo.spec.ts` (10 tests × 3) |
| **Plus de `100vw`** : le calque fait `left: 0; right: 0` ; sur la page d'un chant, dont le conteneur change de largeur avec la taille du texte, le halo s'accroche à un conteneur à part, large comme la fenêtre | `globals.css`, `SongDetailClient` | `look-halo-defilement.spec.ts` (barre de défilement de 15 px rendue à Playwright ; contre-épreuve faite : avec `100vw` la page s'élargit de 15 px exactement) ; texte à 0,8 et 1,5 |
| **Décalage de 48 px corrigé** : `flow-root` sur le conteneur du halo (chant, setlist) ; la position `x = 0, y = 0, largeur = fenêtre` est maintenant vérifiée sur les quatre écrans, plus seulement sur Chants | `SongDetailClient`, `SetlistDetailClient` | `look-halo.spec.ts` |

Le décalage sur la fiche d'une setlist, seulement déduit jusque-là, a été mesuré : les
tests de position étaient rouges sur un chant **et** sur une setlist avant le correctif.

Piège de capture : à `deviceScaleFactor` 2 et plus, le Chromium sans tête de Playwright
n'applique pas le flou d'arrière-plan (le texte sous une barre voilée paraît net). Pour
juger un `backdrop-filter`, capturer à ×1 ou regarder sur un vrai appareil.

### V7 : halo fixe, barres sans filet, menu des plannings (21/09/2026)

Statut : **tranché par questions le 21/09/2026, ATTEND LE GO. Rien n'est codé.**

Timothée, captures de son iPhone (app installée, site en ligne) : « je ne veux pas
qu'il y ait les traits horizontaux qui apparaissent et que ça devienne blanc quand on
scroll vers le bas sur la page de planning » ; « élargir le dégradé aux endroits que je
t'ai entourés » (zone de l'heure, barres du Planning une fois défilé, zone blanche qui
apparaît quand on tire la page) ; « un dégradé sur les pages setlists et moi » ; la
rangée des plannings, « comment faire pour que ce soit mieux au lieu de scroller vers
la gauche ou la droite » ; puis : la pastille coupée de « Récemment consultés »,
« ça fait moche ».

Cela rouvre l'option C de V6 bis : le voile blanc à 80 % et le filet qui reviennent
d'un coup à 4 px de défilement sont exactement ce qu'il ne veut plus.

#### Constat dans le code

| Ce qu'il voit | Cause |
| --- | --- |
| Traits + bandes blanches au défilement | `html[data-at-top]` (`globals.css`) : hors du haut de page, chaque barre `.material-chrome` reprend voile 80 % + filet |
| Zone de l'heure blanche, cassure nette | `statusBarStyle: "default"` (`layout.tsx`) : iOS réserve la zone et la peint en blanc, la page commence dessous |
| Blanc au-dessus du halo quand on tire la page | rebond d'iOS : le halo est `absolute`, il descend avec la page et son bord coupé apparaît ; rien ne se peint au-dessus du haut d'une page, sauf un élément `fixed` |
| Pas de halo sur Setlists ni Moi | pas de `<Halo>` (seuls Chants, un chant, une setlist, l'accueil du Planning) |
| Rangée des plannings à faire glisser | 8 destinations, 3,5 visibles à 390 px |
| Pastille coupée | `overflow-x-auto` tranche au bord de la colonne (`SongListClient`) |

#### Tranché (21/09/2026)

1. **Le halo reste en haut de l'écran** (fixe) : barres teintées à tout moment, zone
   de rebond couverte. Contrepartie acceptée : la lueur reste derrière le haut du
   contenu, même au milieu d'une liste ou d'un chant.
2. **Plannings : un menu.** Sous 1024 px, une seule pastille teintée à la couleur du
   planning ouvert ; un toucher déroule les 8. À partir de 1024 px les 8 tiennent : la
   rangée d'aujourd'hui reste. (Écartés : pastilles sur plusieurs rangées, mesuré à 3
   rangées sur un iPhone dont une orpheline ; sommaire en tuiles sur l'accueil, qui
   pousse « Ce dimanche » sous le pli ; tri « mes plannings d'abord », qui glisse encore.)
3. **Couleurs** : Setlists = bleu des accords, comme Chants (même section) ; Moi =
   gris d'encre.
4. **« Récemment consultés »** : une ligne qui glisse toujours, bord fondu au lieu du
   bord tranché (préféré aux deux lignes que je recommandais).

À confirmer au go (annoncé comme hypothèse, pas contredit, pas confirmé non plus) :
(a) « ni filet ni blanc » vaut pour **toutes** les barres `.material-chrome`, sauf le
mode louange, comme en V6 bis ; (b) les sous-pages du Planning reçoivent un halo à la
couleur de leur service (Accueil et Groupes : le bleu-vert du Planning) — aujourd'hui
le halo disparaît dès qu'on ouvre « Culte Franco ».

#### Tranches (test d'abord, trois appareils, clair et sombre)

| | Quoi | Critères vérifiables |
| --- | --- | --- |
| **T1 halo fixe** | `.halo` passe en `position: fixed; top: 0`. `PageTransition` : fondu d'opacité seule — l'animation `enter` de tailwindcss-animate porte un `transform`, donc pendant 200 ms l'ancêtre redevient le repère des éléments fixes et le halo sauterait de 58 px. Le `flow-root` et le conteneur à part du chant (V6 bis) deviennent sans objet : à retirer s'ils le sont vraiment | après 600 px de défilement, sur Chants / un chant / une setlist / Planning : rectangle du halo = `x 0, y 0, largeur fenêtre` ; la page ne s'élargit pas (test de la barre de défilement gardé) ; masqué à l'impression |
| **T2 barres** | `.material-chrome:not(.material-steady)` : flou seul, plus de filet, bord bas fondu (masque ~16 px, le « bord de défilement » d'iOS 26 plutôt qu'un trait). Voile : 0 si la lisibilité tient, sinon le plus faible possible, à régler sur captures ×1. Si le voile est nul, `data-at-top` ne sert plus : le script de `layout.tsx`, la bascule de `Navbar.tsx` et la règle CSS partent. Mode louange intact. `prefers-reduced-transparency` : fond plein, inchangé | aucune barre hors mode louange n'a de `box-shadow`, au repos comme défilée ; fond d'alpha ≤ 0,3 une fois défilée ; `backdrop-filter` présent ; pire cas jugé à l'œil : un chant défilé (titre gras sous la navbar, pastilles de couleur sous la barre d'outils) |
| **T3 halos manquants** | Setlists (`var(--chord-color)`), Moi (encre, opacité réglée à l'œil pour se lire comme une lumière, pas comme une salissure), sous-pages du Planning si (b) est confirmé : un seul `<Halo>` dans `planning/layout.tsx`, couleur selon la route | `data-testid="halo"` présent et coloré sur chaque page ; position comme T1 |
| **T4 menu des plannings** | Sous 1024 px : bouton-pastille (point de couleur, nom, chevron) + le `DropdownMenu` shadcn déjà dans le projet (clavier, focus, collisions gérés) ; lignes ≥ 44 px, point de couleur, coche sur le courant, `aria-current="page"`, fermeture à la sélection. Même place et même effacement au défilement que la barre actuelle. À partir de 1024 px : `SectionTabs` tel quel. Évènements : inchangé. Libellé d'accessibilité en fr et 中文 | à 412 et 768 px : un bouton, 8 liens dans le menu, navigation effective, rien ne défile horizontalement ; à 1280 px : la rangée d'aujourd'hui ; `look-planning` et `look-navigation` (qui cliquent les pastilles) adaptés |
| **T5 récents** | masque en dégradé sur le conteneur qui glisse, du côté où il reste des pastilles : droite au départ, les deux au milieu, gauche à la fin (un petit écouteur de défilement sur l'élément, deux booléens) | à `scrollLeft = 0` pas de fondu à gauche ; après glissement, fondu à gauche ; en bout de course, plus de fondu à droite ; captures × 3 |
| **T6 zone de l'heure** (à part) | `statusBarStyle: "black-translucent"` ; `--sat: env(safe-area-inset-top)` ; `--nav-h = 58px + --sat` (tous les décalages le lisent déjà) ; navbar avec `padding-top: var(--sat)` ; ellipse du halo décalée de `--sat` pour garder sa composition par rapport à la navbar ; revue de chaque élément `fixed top-0` ou plein écran (le mode louange et l'accueil de première connexion lisent déjà la zone sûre) | Playwright : `--sat` simulé (comme `--sab` le 20/09), aucune commande sous la zone. **Le vrai critère est sur l'iPhone de Timothée** |

**T6 est incertaine** et ne part pas avec le reste. Les sources se contredisent : avec
`black-translucent`, iOS écrirait l'heure et la batterie **en blanc** (illisibles sur
notre fond clair) ou les adapterait au fond ; un article signale un changement de
WebKit en août 2026 sur cette zone. Playwright ne voit pas la barre d'état. Donc :
branche à part, lien d'aperçu Vercel, icône **réinstallée** sur l'écran d'accueil (iOS
lit ce réglage à l'installation). Heure lisible en clair et en sombre → on garde ;
sinon retour à `default`, et rien d'autre n'est à défaire.

Commits : un pour le lot T1–T5 ; T6 seule, sur sa branche.

#### Hors du lot

Le look des lignes du menu au-delà de 5C1 ; la rangée d'onglets d'Évènements ; les
autres rangées qui glissent (bandeau de structure…) ; tout halo sur d'autres pages que
celles nommées ci-dessus (Mes services, Harmonie, Guide, Admin).

#### Avancement V7 (21/09/2026)

Go de Timothée le 21/09/2026 (« A et B confirmé go ») : les deux hypothèses sont
retenues — toutes les barres `.material-chrome` sauf le mode louange, et un halo sur
les sous-pages du Planning à la couleur de leur service.

| Fait | Où | Tests |
| --- | --- | --- |
| **T1 halo fixe** : `.halo` passe en `position: fixed; top: 0` — il reste en haut de l'écran quand la page défile et quand iOS la laisse rebondir. Le fondu d'entrée des pages devient `.page-fade` (opacité seule) : le `animate-in` de tailwindcss-animate porte un `transform`, qui aurait fait de la page le repère des éléments fixes pendant 200 ms, le halo sautant de 58 px. Les `flow-root` et le conteneur à part de la page d'un chant (V6 bis) sont retirés : sans lui, le halo ne dépend plus des marges du contenu | `globals.css`, `PageTransition.tsx`, `Halo.tsx`, `SongDetailClient`, `SetlistDetailClient` | `look-halo.spec.ts` : position vérifiée **après 600 px de défilement** sur les quatre écrans, + « le fondu d'entrée ne porte que l'opacité » (contre-épreuve : `matrix(1, 0, 0, 1, 0, 0)` avant correctif) |
| **T2 barres** : `.material-chrome` n'a plus que le flou ; ni voile ni filet, en haut de page comme défilées. Le voile part dans `.material-steady`, que portent les deux barres du mode louange. Tout le dispositif `data-at-top` disparaît (script d'en-tête, bascule de la Navbar, règle CSS) : le matériau ne dépend plus de React, donc plus de voile blanc le temps qu'il démarre | `globals.css`, `layout.tsx`, `Navbar.tsx`, `setlists/page.tsx`, `SongDetailClient`, `SetlistDetailClient`, `SectionTabs`, `SetlistForm` | `look-barres.spec.ts` (9 × 3), y compris transparence réduite |
| **T3 halos manquants** : Setlists au bleu des accords (même section que Chants), Moi à l'encre et plus discret (`.halo-moi`, 8 %), Planning porté par la mise en page de la section et coloré par le planning ouvert (`PlanningHalo`, table `PLANNING_TABS` comme source unique) | `setlists/page.tsx`, `moi/page.tsx`, `planning/layout.tsx`, `PlanningHalo.tsx`, `PlanningTabs.tsx`, `globals.css` | `look-halo.spec.ts` : Setlists, Moi, Campus, EDD, et « un seul halo par page » |
| **T4 menu des plannings** : sous 1024 px, `SectionTabs` remplace la rangée par une pastille (point de couleur, nom du planning ouvert, chevron) qui déroule les huit dans le `DropdownMenu` du projet ; lignes de 44 px, point de couleur, coche et `aria-current` sur le courant. À partir de 1024 px, la rangée d'aujourd'hui. Évènements n'est pas touché (pas de `menuLabel`) | `SectionTabs.tsx`, `PlanningTabs.tsx`, `fr.json`, `zh-CN.json` | `look-planning-menu.spec.ts` (12), plus `look-planning` et `look-navigation` adaptés |
| **T5 récents** : la rangée s'estompe du côté où il reste des chants (`useFonduLateral` + `.fondu-lateral`, masque de 24 px) au lieu de trancher une pastille en deux | `useFonduLateral.ts`, `globals.css`, `SongListClient.tsx` | `look-recents.spec.ts` (3 × 3) |

Pièges rencontrés :

- **`-webkit-backdrop-filter` avant la propriété standard.** Dans l'autre ordre, le
  compilateur CSS de Next élimine les deux et le flou survit à
  `prefers-reduced-transparency` — le test de transparence réduite l'a montré.
- **Capturer et mesurer un menu pendant son ouverture ment** : `zoom-in-95 fade-in-0`
  donne 41,8 px au lieu de 44 et un panneau translucide (la première planche du menu
  était illisible pour cette seule raison). Attendre `document.getAnimations()`.
- Sur un écran à 2,625, une ligne de 44 px se mesure 43,99999 : arrondir.
- `look-planning.spec.ts` force 390 px sur les trois appareils (`test.use(phone)`) :
  son test d'onglets portait donc sur le menu, pas sur la rangée.

**T6 (zone de l'heure) n'est pas faite** : elle part seule, sur sa branche, après un
essai sur l'iPhone de Timothée (voir ci-dessus).

#### V7 bis : le bord des barres, et la zone de l'heure (21/09/2026)

Deux demandes de Timothée après la mise en ligne de V7.

**Le bord du flou (« fais-le »)** : les traits avaient disparu, mais le flou s'arrêtait
net sous la barre, ce qui redessinait une ligne. Le flou quitte la barre pour un calque
`::before` qui déborde de 16 px sous elle et s'y éteint en dégradé — le « bord de
défilement » d'iOS plutôt qu'un filet. Le masque doit porter sur ce calque seul : posé
sur la barre, il aurait effacé aussi le bas du logo et des boutons. `z-index: -1` le
garde sous le contenu de la barre, et il n'en sort pas : chaque barre a déjà son propre
plan (`z-10`, `z-40`, `z-50`). `.material-steady` (mode louange) garde flou et voile sur
la barre elle-même. ⚠ Le Chromium sans tête de Playwright ne rend pas ce calque
fidèlement : les tests vérifient les valeurs (flou, masque, débordement de 16 px), le
rendu se juge sur un vrai appareil.

**La zone de l'heure (T6), sur les deux systèmes.** Le même code sert iOS et Android,
sans condition d'appareil :

| | Ce que fait le système | Ce qu'on fait |
| --- | --- | --- |
| iPhone, app installée | `black-translucent` laisse la page monter sous l'heure, et déclare la place prise par `env(safe-area-inset-top)` | `--sat` entre dans `--nav-h` : la navbar grandit d'autant, son contenu descend, et tous les décalages de l'app suivent sans en rien savoir. Le halo décale son ellipse de `--sat` pour garder sa composition |
| Android, app installée | La page ne monte pas sous la barre d'état : le système la peint avec `theme-color` | Une seule balise `theme-color`, sans `media`, que chaque écran accorde à la teinte de son halo (fond + halo à son opacité, relus sur la page pour suivre le thème) |
| Navigateur, ordinateur | Pas de zone sûre | `--sat` vaut 0 : rien ne bouge |

⚠ **iOS lit `apple-mobile-web-app-status-bar-style` à l'installation de l'icône** :
pour voir le changement, retirer l'icône de l'écran d'accueil et la réinstaller.
⚠ À vérifier sur l'iPhone de Timothée : la couleur de l'heure et de la batterie. Les
sources se contredisent (blanc toujours, ou adapté au fond) et un article signale un
changement de WebKit en août 2026. Si l'heure devient illisible en clair, il suffit de
remettre `statusBarStyle: "default"` dans `layout.tsx` : rien d'autre n'est à défaire,
`--sat` retombe à 0 tout seul.

Tests : `look-zone-heure.spec.ts` (7 × 3), zone sûre simulée sur `--sat` comme
`look-navigation` le fait déjà avec `--sab`.

#### V7 ter : choisir un planning, tranché sur planche (21/09/2026)

Timothée : « Est-ce qu'une liste déroulante comme ça c'est la meilleure idée ? Propose-moi
toutes les possibilités. » Huit façons d'atteindre les huit plannings sur un téléphone,
sur la planche (page « V7 · choisir un planning 21-09 ») : 0 la rangée qui glisse
(l'existant), A le menu déroulant (ce qui venait d'être codé), B une feuille par le bas,
C une grille de tuiles, D la rangée plus un bouton « tous », E la rangée triée par mes
services, F deux niveaux par famille, G un sommaire sur l'accueil.

**Tranché : « C (sans les points de couleur) pour le téléphone, 0 ou A pour l'ordinateur
et la tablette. »** Donc :

- **Sous 768 px** : la pastille ouvre une feuille qui monte du bas (le `Drawer` du projet,
  celui du choix de PDF), huit tuiles teintées sur deux colonnes. **Pas de point de
  couleur** : le fond de la tuile porte déjà le service — une forme, une information.
- **À partir de 768 px** : la rangée d'onglets, comme aujourd'hui. Mesuré : les huit font
  **778 px**, et une tablette en portrait en offre exactement 778 — ça tient. Entre 768 et
  810 px elle déborde de peu : le fondu latéral des chants récents lui est appliqué, elle
  s'estompe au lieu de trancher un onglet. Le menu déroulant (A) disparaît donc
  entièrement : `look-planning-menu.spec.ts` est remplacé par `look-planning-feuille.spec.ts`.

**Contraste des tuiles.** À leur valeur pleine, deux couleurs de service ne se lisent pas
sur leur propre fond teinté : Prépa. Table 2,9 et Intergroupe 3,3, pour 4,5 exigés. Le
libellé reprend donc la couleur **assombrie à 75 %** en clair (pire cas 4,8), et éclaircie
à 55 % en sombre comme `.svc-ink` (pire cas 6,7) — nouvelle classe `.svc-tuile`, qui ne
touche pas `.svc-ink` ni `serviceColors.ts`, tous deux gelés. Le test ne vérifie pas une
valeur de couleur mais le **rapport de contraste mesuré**, sur les huit tuiles, dans les
deux thèmes.

⚠ Défaut préexistant relevé au passage, **non corrigé** (hors de ce lot) : les vignettes
`Tile` utilisent `.svc-ink` sur un fond teinté et souffrent du même écart pour ces deux
couleurs.

#### V7 quater : le flou n'apparaît qu'au défilement (21/09/2026)

Timothée, après la mise en ligne : « le flou en haut est trop présent alors que je suis
en haut de la page ». Le calque déborde de 16 px **sous** la barre pour y fondre son
bord : en haut de page, il n'avait donc rien à séparer et brouillait le haut du contenu
pour rien.

Le flou n'est plus posé que sur `html[data-defile]`, attribut que la Navbar met dès qu'on
quitte le haut (seuil de 4 px), avec un fondu de 200 ms. Le masque et le débordement, eux,
restent en place : ils ne se voient pas sans flou.

C'est l'inverse de `data-at-top` (V6 bis, retiré en V7) : **l'absence d'attribut vaut
« en haut de page »**. Sans JavaScript, ou avant que React ne démarre, il n'y a donc pas
de flou — ce qui est justement l'état d'une page qu'on vient d'ouvrir. Aucun script d'en-tête
n'est nécessaire, contrairement à V6 bis où il fallait devancer le voile blanc.

Le mode louange (`.material-steady`) garde son flou et son voile en permanence : ses barres
sont posées sur les paroles.

**Puis, le même jour : « ton flou est toujours trop bas, remonte-le un peu ».** Le calque
ne déborde plus du tout sous la barre : il s'éteint en dégradé sur les **16 derniers pixels
de la barre elle-même**. Mesuré sur le Planning : le calque finissait à 121 px, il finit à
105 px (le bas de la barre de section) et son flou plein s'arrête à 89 px — le flou remonte
donc de 16 px, et sa partie pleine de 32 px. Le bord reste fondu : aucun trait ne revient,
et plus rien ne brouille le haut du contenu.

#### V7 quinquies : plus de flou du tout (21/09/2026)

Timothée, après le troisième essai : « bon le problème est toujours là […] peut-être
qu'on peut juste tout simplement retirer le flou ? »

Vérifié avant de toucher : le CSS servi en ligne portait bien la dernière règle (le flou
sous `html[data-defile]` seulement, sans déborder de la barre). Ce n'était donc pas un
déploiement en retard — le flou le gênait quelle que soit sa forme. Trois essais en une
journée : plein, puis au défilement seul, puis sans dépasser la barre. La séparation entre
zone floue et zone nette se voit toujours, aussi douce soit-elle.

**Les barres ne portent donc plus rien** : ni voile, ni filet, ni flou. Le halo les
traverse, le contenu passe dessous tel qu'il est. Le calque `::before`, l'attribut
`data-defile` et la bascule de la Navbar disparaissent.

Le mode louange (`.material-steady`) garde voile et flou : ses deux barres sont posées sur
les paroles et doivent s'en détacher pour rester lisibles.

**Conséquence assumée** : une fois la page défilée, le texte de la liste passe derrière le
logo et les boutons de la barre, sans rien pour l'en séparer. Si cela gêne à l'usage, le
recours n'est plus le flou mais un fond plein sur les barres — ce que fait iOS lui-même
quand on désactive la transparence, et ce que `prefers-reduced-transparency` applique déjà
ici.
