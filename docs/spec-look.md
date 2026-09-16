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
