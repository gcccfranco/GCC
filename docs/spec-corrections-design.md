# Spec — Corrections du design (lot CD)

**Date** : 03/11/2026 · **Origine** : audit du design (`docs/audit-design-2026-11-02.md`) et dix-sept planches de
corrections (`docs/planches/planche-corrections-*.html`, publiées en artefact).
**Décision de Timothée (03/11/2026)** : « comme recommandé pour tout ». Chaque constat retenu prend la proposition
marquée « recommandée » sur sa planche ; les quatre préférences du matin (surface C, contrôles B, titres C, halos B)
deviennent des décisions. **Go donné le même jour**, avec ces consignes : sur une **nouvelle branche**
(`claude/corrections-design`), commits et push **sur cette branche seulement**, rien sur `main`.

Le détail constat par constat est dans `docs/spec-corrections-design/<groupe>.md` (17 annexes, 204 entrées) : décision,
consigne de code avec `chemin:ligne`, critères, test. Cette page-ci fixe ce qui les relie : l'ordre, les arbitrages
entre annexes, les règles communes.

## 1. Tranches

Une tranche = un commit sur `claude/corrections-design`, après `/tranche` (executant → testeur → corrections →
relecteur) et, pour toute tranche qui change l'apparence, `critique-design` sur les captures des quatre dispositions
(plus 1 440 px pour une page de lecture). Tests sur les trois appareils ; les specs d'agencement sur les cinq projets.

| Tranche | Contenu (entrées « Tranche : T1 » des annexes, sauf mention) |
|---|---|
| **T1a** Navigation commune | `partout` (sélecteur d'espace, icône Musiciens, 我的服事), `back-office-1`, `dimanche-20`, `evenements-app-6` (retour à 44 px), `back-office-8` + `equipes-app-1` (fusionnés), règle 44 px (§ 3) |
| **T1b** Titres et halos | `partout-q1` (casse normale sur la page chant, capitales en mode louange), `partout-q2` (halos : seulement ceux qui portent une couleur de service ou de section ; le lavis du chant et de la liste des chants part), `tests/halo-partout.spec.ts` adapté |
| **T1c** Chants | `chants.md` (T1) |
| **T1d** Le dimanche | `dimanche.md` (T1), dont le mode louange |
| **T1e** Quotidien, Église, Musiciens | `quotidien.md`, `eglise.md`, `musiciens.md` (T1) |
| **T1f** Compte, services, App | `compte.md`, `services.md`, `equipes-app.md`, `evenements-app.md` (T1) |
| **T1g** Plannings et Harmonie | `plannings.md`, `harmonie.md` (T1) |
| **T1h** Back-office | `back-office.md`, `bo-equipes.md`, `bo-evenements.md`, `bo-messages-planning.md`, `bo-reunions-taches.md` (T1) |
| **T2a / T2b** Recette de surface C | `partout.md` § surface : jetons et trois écrans pilotes (accueil téléphone, setlists téléphone, À faire 1 280) regardés à l'œil, puis le reste (`.raised`, `shadow-soft`) |
| **T3a / T3b / T3c** Contrôles jeu B | `partout.md` § contrôles, puis les entrées T3 des annexes |
| **T4a / T4b** Typographie et largeurs | `partout.md` § échelle B, P12/P13, L1, puis les entrées T4 |
| **T5** Contenu chinois | captures du guide en 中文 (`eglise-5`, repli C), bandeau d'Harmonie (`harmonie-5`) |

Les tranches T1 se codent dans l'ordre ; T2 à T5 dans l'ordre aussi, chacune après la précédente (T5 en dernier pour
ne pas refaire les captures du guide).

## 2. Arbitrages entre annexes (relecture de cohérence du 03/11/2026)

Quand deux annexes touchent le même code, **ceci fait foi** :

1. **Sans compte** (`SansCompte.tsx`) : `bo-equipes-12` (liste de lecture) en T1 ; la feuille « Relier » de
   `bo-messages-planning-5` sort du lot (spec à part). Le lien de retour `toutesLesPersonnes` est repris dans T1.
2. **Interrupteur Piano | Guitare** : `musiciens-3` (garder celui de la liste, retirer celui de la fiche) ; `harmonie-9`
   abandonnée ; `musiciens-2` (T3) s'aligne sur `musiciens-3`.
3. **Segmenté « Équipes · Musiciens »** : rail (`OngletsRail`), comme `back-office-7` ; `bo-equipes-5` et
   `partout.md` sont corrigés en ce sens.
4. **Bouton `outline` en sombre** : `back-office-3` seul (fond `--pose` `#3a3a3c`), en T1 ; `bo-messages-planning-6` ne
   garde que l'« Annuler » de Notifier, traité par l'arbitrage 8 ; `button.tsx` n'est changé qu'une fois.
5. **Segment actif** : un seul jeton, `--pose` (`#3a3a3c` en sombre), pour `SelecteurEspace` et le curseur d'`Onglets` ;
   la valeur `#636366` de `quotidien-14` est abandonnée.
6. **Sélecteur d'espace** (`SelecteurEspace.tsx`) : une seule entrée fusionnée en T1a — ordinateur selon `chants-1` A
   (segments `flex-auto min-w-0`, 8 px, 12 px semi-gras), téléphone selon `back-office-1` C (icônes pour les espaces
   non choisis, libellé pour l'espace courant), icône Musiciens `Drum` (import ligne 13), ombre selon `back-office-3`.
7. **Colonne de droite du Back-office** (`ColonneDroite.tsx`) : `bo-messages-planning-4` ; `compte-9` supprimée.
8. **« Annuler » de Notifier** : `compte-12` (« Effacer », conditionnel) ; « Envoyer » désactivé suit la règle globale
   `disabled:bg-secondary` de `bo-reunions-taches-16`.
9. **Grille de planning** (`PlanningGrille.tsx`) : `plannings-1`, plus la pastille « Cette semaine » de
   `bo-messages-planning-1`.
10. **Avis « contenu en français »** : `harmonie-5` (composant unique, T5) ; `musiciens-10` et `partout-q3-harmonie`
    y renvoient.
11. **Setlists** (`dimanche-21`) : suit `partout.md` — « Tous les services », « Sélectionner » en texte souligné.
12. **Formulaires** : `partout.md` dit lesquels passent au `Menu` (T3) ; `TacheForm` en fait partie (`bo-reunions-taches-12`).
13. **`EvenementForm`** : `evenements-app-5` se livre après `bo-reunions-taches-13` (composant `Champ`), même tranche T1f/T1h
    dans cet ordre, ou fondu dans T1h.
14. **`ModifierClient.tsx`** : `bo-reunions-taches-9` pour les réunions, `evenements-app-8` pour les évènements, dans la
    même tranche.
15. **Panneau de marque de la connexion** : `partout-q2` (halos retirés, fond uni) ; `eglise-12` réduite au `py-8` → `py-6` ;
    `compte-14` (panneau caché sous `lg` à l'inscription) gardé.
16. **`RangeeAFaire.tsx`** : `compte-10` (la ligne « Relier » devient un lien) ; `back-office-9` ne garde que « Fait ».
17. **`BandeauEquipes.tsx`** : `back-office-5` ne livre que le dessin des flèches ; l'index suit `bo-equipes-5` (T3).
18. **Doublons à coder une fois** : `chants-7` = `dimanche-20` (icône) ; `evenements-app-4` = `bo-reunions-taches-7`
    (`textarea` aligné sur `input`, `py-2.5`) ; `eglise-5` = `partout-q3-guide` ; `back-office-9` (retour) =
    `evenements-app-6`.
19. **Dépendances vers T3** : `bo-reunions-taches-10`, `-20` et `bo-equipes-6` se livrent en T1 pour le clair, le sombre
    suit `--pose` (arbitrage 5) ; `chants-5` se scinde (`5a` T1 boutons, `5b` T3 menu « Thème ») ; `quotidien-10` garde un
    actif noir seulement si c'est de la navigation (règle § 3).
20. **`equipes-app-1`** : vérifier avant de coder que le libellé ajouté à `labelDeSection` ne touche pas une zone gelée
    (`docs/audit-ui-apple-design.md` § 2) ; sinon, s'en passer.

## 3. Règles communes

- **Cible de 44 px** : pseudo-élément `::after` (jamais `::before`), appliqué au toucher (`@media (pointer: coarse)`), sur
  le modèle existant de `TOUCHER_44` ; une seule définition, utilisée partout.
- **Actif noir** (`--primary`) = navigation (barre du bas, barre latérale, onglet de section) ; un choix dans un segmenté
  utilise le curseur `--pose`.
- **Zones gelées** intouchables (`docs/audit-ui-apple-design.md` § 2) : couleurs des services, des accords, du 简谱 et
  des sections, logo, intérieur du calque 简谱, export PDF.
- **Deux langues** : tout libellé nouveau a sa clé dans `src/locales/fr.json` et `zh-CN.json` ; toute traduction chinoise
  nouvelle est marquée à faire relire par un lecteur de 中文 dans le commit. `python3 scripts/build-fonts.py` après
  tout ajout de texte chinois.
- **Tests** : une spec existante qui lit l'ancien rendu s'adapte dans la même tranche (les annexes les nomment) ; aucun
  test n'est désactivé ni affaibli.
- **Interrupteur `BACK_OFFICE`** : rien ne change de ce côté.

## 4. Points restés ouverts dans les annexes

Chaque annexe liste en tête ses points « à confirmer au code » (largeurs Mac / Windows, valeur de `--shadow-flottant`,
mécanisme du plancher P13, clé `songs.list.filterThemeNom`…). La tranche concernée les tranche au moment de coder et le
dit dans son commit.

## État

**Méthode, accordée par Timothée le 03/11/2026 (« oui pour 1, 2, 3, 4 »)** : `/tranche` attend la fin de Playwright, ne
relance que les specs rouges, borne les specs voisines à quatre (lues par texte) ; les petites tranches se groupent (T1b
fait un seul passage avec la suivante quand c'est possible) ; T1c, T1e et T1g tournent dans des sessions parallèles.

### T1a · Navigation commune — fait
- Sélecteur d'espace : segments de la barre latérale resserrés (`flex-auto min-w-0`, `px-2`, 12 px, 30 px) ; au
  téléphone (< 640 px), icône seule de 36 px pour les espaces non courants ; Musiciens en `Drum` ; rail réduit : filet de
  1 px × 32 px sous les espaces, actif sans ombre (chants-1, chants-7, back-office-1, dimanche-20).
- « Moi » allumé sur `/equipes` et ses fiches, retour « ‹ Moi » sur l'index Équipes de l'App, marque « GCC Équipes » /
  « GCC 团队 » (clé `common.header.equipes` créée) (back-office-8 + equipes-app-1, arbitrage 20 : la liste des labels
  s'étend d'une entrée, comportement inchangé).
- Retour « ‹ … » : zone de 44 px au toucher (evenements-app-6 = volet retour de back-office-9).
- Règle des 44 px : une seule définition, `src/lib/toucher44.ts` (`TOUCHER_44`, `TOUCHER_RETOUR`, `TOUCHER_SEGMENT`), en
  `::after` sous `[@media(pointer:coarse)]` ; l'ancien `songs/[slug]/_components/toucher44.ts` (en `max-sm:` et
  `::before`) est supprimé, ses trois usages pointent sur le module partagé.
- zh-CN : `setlists.list.myServicesFilter` 我的服侍 → 我的服事 (partout-servir).
- **Tranché au code** : un écran Tailwind `coarse` brut fait disparaître toutes les variantes `max-*` (Tailwind 3.4) →
  variante arbitraire ; la pastille glissante de back-office-1 n'est pas faite (fondu `duration-150` gardé) ; au-dessus
  de 640 px la barre du haut ne change pas (`max-sm:gap-2`).
- **Écarts / reste** : `SetlistDetailClient.tsx` garde sa propre copie de l'ancienne recette 44 px (`max-sm:` +
  `::before`), à ramener sur `src/lib/toucher44.ts` (T3) ; d'autres occurrences de 服侍 restent dans `zh-CN.json` hors de
  la clé visée ; largeurs des segments mesurées sous Linux seulement (Segoe et SF à regarder).
- **Échecs connus, déjà rouges sur la base `da0b3ef`** : `tests/navigation-grand-ecran.spec.ts:52` (« un retour sur la
  page relance une seule requête de notifications », 0 au lieu de 1, cinq projets). Courses vues sous charge, vertes
  seules : `organigrammes-groupes.spec.ts:816`, `reunions.spec.ts:268`, `:274`. Lint : deux `require("node:fs")` des specs
  de captures de l'audit design passés en `import` (erreurs antérieures à la tranche).

### T1b · Titres et halos — fait
- Page chant : titre en casse normale, `tracking-[-0.02em]` ; mode louange et PDF gardent les capitales (partout-q1).
- Halos (partout-q2, décision B ; point à confirmer n° 1 tranché : chant et liste des chants partent) : retirés de
  `HaloParDefaut` (supprimé, avec `.halo-defaut` et `--halo-back-office`), Moi, Équipes, guide, questionnaire,
  organigramme, chant, liste des chants (`--halo-chants`), setlists ; `Halo.tsx` ne garde que `page` et `fiche`.
  Restent : Planning, fiche de setlist, scène des évènements (dans le code, le calendrier et les fiches d'évènements
  n'en avaient déjà pas). Une règle `:root:not(:has(.halo:not(.barre-halo))) .barre-halo { display: none }` empêche
  toute copie sous les barres d'une page sans halo.
- Connexion : panneau de marque uni, `--secondary / 0.5` posé sur `--background` (la teinte seule laissait
  transparaître deux blocs derrière le panneau `sticky`, vu à 1 440 px).
- Tests adaptés : `halo-partout`, `look-halo`, `look-halo-defilement`, `look-louange` (titre `none` sur la page,
  `uppercase` sur la scène, qui est un `h2`), `navigation-grand-ecran` (halo mesuré sur Planning), `look-barres`
  (premier affichage sans React : aucune copie de halo sous la navbar), `agencement-v18-fondations`, `helpers/agencement`.
  `look-louange` : la barre de la setlist se mesure à l'arrêt (course de sous-pixel sous charge, 31,999996 px).
- **Écarts** : en clair, le panneau de marque a presque le gris de la barre latérale (critique : finition) ; valeur
  de la spec gardée. Aucun test ne prouve que « Proposer un chant » redevient `#1c1c1e` (rien ne le teinte plus).

### Découpage parallèle (03/11/2026)
T1c, T1e et T1g tournent dans trois sessions parallèles. `musiciens.md` passe de T1e à T1g : elle partage `Catalogue`,
`EnTeteHarmonie`, `FicheHarmonie` et `SommaireCours` avec `harmonie.md`. T1e = `quotidien.md` + `eglise.md`.

### T1c · Chants — fait (`6b9cd5a`, session parallèle)
- chants-2, -3, -4, -5a, -8 (trois blocs en volets, tablette debout à 28 px), -9, -10, -11, -14 ; chants-5b et chants-6
  restent en T3. Clés nouvelles : `customize.panel.keyCourt`, `stats.aucuneSetlistPeriodeTitre`, `stats.voirDepuisDebut`
  (zh à faire relire).
- **Tranché au code** : « Nouveaux au répertoire » prend toute la ligne dès 520 px de contenu ; la racine de « Choisis un
  chant » perd son `pr` (marge comptée deux fois) ; en deux volets tactiles, 6 px de tolérance sur `scrollWidth` (zone
  `::after` de 44 px), aucune au téléphone. Critique prise : au téléphone « Statistiques » devient un lien texte comme
  « Proposer » ; 4 px entre les pastilles Accords et Pinyin actives ; « Ton » se coupe avant la lettre.
- **Écarts** : ♩ petit et suivi d'un vide sous Linux (police de repli), à regarder sur un vrai téléphone ; `EtatVide`
  `role=status` englobe le bouton (finition) ; les états vides `tousJoues`, `choisirDebut`, `aucunARedecouvrir` restent en
  carte ; `stats.aucuneSetlistPeriode` est du code mort (signalé, non supprimé).
- **Question pour Timothée** : « 调 D » ou l'usage « D调 » ?

### T1g · Musiciens, Harmonie, Plannings — fait (session parallèle)
- Commits : `eb77cd9` Musiciens (-3, -4, -5, -6, -7, -8, -11, -12) · `a5f9ef4` Harmonie (-1, -2, -3, -4, -6, -7, -8, -10,
  -12 ; -9 abandonnée, arbitrage 2 ; -5 en T5) · `267d2da` Plannings (-1 à -7, plus la pastille « Cette semaine »,
  arbitrage 9) · `4792c85` reprises de la critique. Nouvelle spec `tests/pages-en-grand-harmonie-corrections.spec.ts`.
- **Tranché au code** : `@container` écrit `[container-type:inline-size]` ; harmonie-2 en deux voiles collants couleur
  `--raised` (vaut pour toutes les pages `DeuxVolets`) ; colonnes courtes du cours comptées par le mot le plus long de
  la tête ; tableau 9.2 empilé au téléphone ; progrès du cours partagé par l'évènement `gcc:cours-progres` ; seuil de la
  pastille fixe à 960 px. harmonie-4 : police Noto Music (OFL, sous-ensemble de 5 signes), 16 chapitres réécrits en
  ♯ ♭ 𝄫 (accords intacts) — pas regardé sur Apple, Windows ni Android.
- **Écarts** : musiciens-5, le texte copié garde les espaces insécables (la recette de la spec contredit son critère) ;
  `OngletsRail` recentre l'actif sans rejouer au redimensionnement ; harmonie-10, la colonne de gauche reste vide sous
  « Pourquoi » sur certaines fiches (placement de la spec gardé). Finitions laissées : « Chants / Chants à venir »
  répété, barre de progrès vide à 0, deux surtitres de suite au bas de la fiche ; en T4, noms coupés à 84 px dans la
  grille.
- zh-CN à faire relire : 查看其余 N 个/首, 张卡片，钢琴与吉他, 在哪里听到, 叠加, 查看后面/前面的栏目, 已过 N 个主日, 诗歌待定.
- `tests/bilingue-b5.spec.ts` (« les services et rôles à cocher se lisent en 中文 ») : rouge depuis T1a, le premier
  « 乐手 » de la page étant le libellé du sélecteur d'espace, caché au téléphone ; le test vise désormais `main`
  (correction de l'orchestratrice). Courses sous charge, vertes seules : `organigrammes-groupes:818`, `a-faire:417`,
  `harmonie-regroupees:79`, `agencement-v18-planning:259`, `bilingue-b5:90`.

### T1f-a · Services et équipes de l'App — fait (orchestratrice)
- services-1, -2, -3, -6, -9 : `PastilleRole` (nouveau, `src/components/mesServices/PastilleRole.tsx` : contraste en
  sombre, rôles traduits en 中文 par `planning.roles.*`), `nomDuService` (`src/lib/planning/names.ts` : « Culte
  Francophone » / 法语崇拜 partout dans Mes services), pastille à côté de « dans N jours », titre du détail `xl` / `md:2xl`
  (22 px en deux volets) ; « Pour quel service ? » sans cadre pointillé, grille plafonnée à 720 px, deux entrées en une
  carte (spec ajoutée à `SPECS_GRAND_ECRAN`). Couleurs des services inchangées.
- equipes-app-2 à -6 : rond à cocher `h-11 w-11` réel (exigé par l'entrée, pas `TOUCHER_44`), filet plus contrasté ;
  fiche tâche sans rond ni état en gras, segment en tête ; nom d'équipe en `<p>` sous le h2 ; `text-wrap: balance` sur
  `.titre-page` ; la carte « Les tâches des équipes » s'empile à la tablette portrait.
- zh-CN modifiées, à faire relire : `setlists.entree.pourQuelServiceHint`, `setlists.entree.aucunService`.
- **Écarts** : fiche tâche en deux volets, la phrase d'état passe sous le segmenté (≈ 580 px pour 496), critère « sur une
  ligne » non tenu, rendu propre, gardé ; l'aperçu « Mes services » de `/moi` dit encore « Culte Franco » (hors annexe) ;
  le test zh d'equipes-app-5 vérifie `text-wrap: balance`, pas la coupe réelle (alternative admise par l'entrée).
- **Échec connu, antérieur au lot** : `tests/agencement-v18-moi.spec.ts:215` (« en 中文 : … l'aide sont traduits »), cinq
  projets : il cherche « 乐理课程 », renommé « 乐理 » au lot EM (`e50abce`).

### T1e · Quotidien et Église — fait (session parallèle)
- Commits : `0cae6ba` Quotidien (-1, -3, -4, -5, -7, -8, -10, -11, -12) · `89f532d` Église (-1, -4, -6, -7, -8, -9, -11,
  -12 réduite au `py-6`, -13, -15, -16, -17, -18). Critique prise : bouton « Agrandir » à cheval sur le coin du
  passe-partout ; un seul voile qui se fond ; zones de sécurité au téléphone.
- **Tranché au code** : la croix de `PushPrompt` garde son propre `::after` (`TOUCHER_44` la passerait en `relative`) ;
  « Inscriptions » prend la classe de « Tâches », `text-base` (15 px dans l'échelle du dépôt, pas 16) ; les PNG du guide
  (2 560 px) s'affichent à 1 280 px CSS dans la feuille ; la colonne collante de Moi tient dans 1 280 × 720.
  quotidien-5 retire `mx-auto` de `DeuxVolets` : touche toutes les pages en colonne seule (Tâches, Personnes,
  questionnaire, réception). `i18n-hydration` masque le badge de développement de Next sur `/login`.
- **Restent** : `/signup` sans retour « ‹ Chants » (réservé à la planche d'inscription) ; carte de gestion d'un évènement
  sans image sans vignette ; 32 px au lieu de 24 entre la pilule et « Comment ça marche ? » ; fermeture de la feuille du
  guide sans animation.
- zh-CN à faire relire : `emptyUpcoming`, `guide.tocReplie`, `agrandirCapture`, `captureDefilement`, `captureFermerAide`,
  `login.signupQuestion`, `signupAction`, puce d'eglise-15. Course vue : `evenements.spec.ts:316`.

### T1d · Le dimanche — fait (session parallèle)
- Commits : `d89dd5e` setlists et éditeur (dimanche-3, -4, -5, -6, -16, -17, -23, -25) · `8840127` mode louange
  (dimanche-1, -10, -11 B, -13, -14, -24) · `b7b6c5e` reprises de la critique.
- **Tranché au code** : zones de 44 px par `TOUCHER_44` (`::after`, règle § 3) au lieu du `::before` de l'annexe ;
  « Modifiable par… » derrière le ⓘ sur toutes les tailles ; droits, langue et historique sur une rangée en deux volets ;
  pastille « Ensuite » dans le flux, sous la colonne la plus courte (barre affichée et pastille couverte à 1 440 px :
  pastille flottante au-dessus de la barre ; sans place : page réduite à l'échelle). Corrigés en passant : panneau
  d'annotation centré entre les barres (la barre du bas couvrait « Annuler ») ; hauteur exacte de l'en-tête des deux
  volets ; `rowGap` des rangées chinoises recoupées ; note en deux volets avec ses retours à la ligne.
- **Écarts** : alignement tablette de dimanche-16 laissé à dimanche-9 (T4) ; premier chant au téléphone ≈ 43–47 % de
  la hauteur selon la note (cible 41 %) ; essais au doigt à faire (chevron de 36 px de la puce présidence, poignée).
- **À trancher par Timothée** : la bulle d'indice du rappel est coupée par la barre opaque (la cacher quand la barre est
  affichée casse `rappel-indice`) ; liseré de lettres sous la barre du haut ; FreeShow et PDF ont la même icône dans ⋯.
- Tests : `PW_CHANTS_ZH=all` vert (771) ; `PW_SLUGS=all` 2 778 / 2 880 sans échec avant la limite de temps. Courses
  vertes seules : `setlist-g:216`, `:227`, `setlist-editeur-piste2` Q13. zh à faire relire : 姓名, 、, 给团队的备注,
  第 {{n}} / {{total}} 页.

### T1h-X · Back-office, Équipes, Messages, Compte — fait (session parallèle)
- Commits : `1440e76` back-office (-4, -5, -9 « Fait », -10, -11, -12) · `1186fb7` bo-equipes (-1 à -4, -6 à -9, -11 à -16,
  plus le retour « Toutes les personnes ») · `dff1982` bo-messages-planning (-2, -3, -4, -7, -8, -10, -11) · `48ad28a`
  compte (-2, -3, -6, -10, -11, -12, -13, -15, -16, -17). Non faits par arbitrage : bmp-1 (T1g), bmp-5 « Relier » (sorti),
  bmp-6 → compte-12, bmp-9 → compte-10, compte-9 (supprimée).
- **Tranché au code** : sous-titre de Responsabilités « Qui gère quoi… » ; Comité Orga hors encart ; `LIGNE_ENTIERE`
  ajoutée à `src/lib/toucher44.ts` pour « Relier » ; flèches ‹ › de l'index avec `TOUCHER_44` ; la bande d'étape du
  questionnaire suit la barre du haut cachée. Service worker : cache `gcc-louange-v6` (page hors ligne avec logo, fr puis
  zh ; preuve sur build de production, réseau coupé) ; `CLAUDE.md` mis à jour.
- **Écarts** : « Nouvelle tâche » à 577 px du titre à 1 440 px (critère de 300 px intenable avec deux colonnes) ; Louange
  montre 43 % au départ à 1 440 px ; rangée « sans compte » masquée si `listGroupes` échoue ; la page hors ligne suit le
  thème système seulement ; fondu de 150 ms de l'aide de Notifier non fait.
- Corrigé en passant : `tests/helpers/agencement.ts` (colonne de 960 px calée sur le titre depuis quotidien-5) ;
  `BanniereGeste` laisse passer le pointeur. zh à relire : voir les messages de `1186fb7`, `dff1982`, `48ad28a`.
- **Échec à regarder** : `agencement-v18-moi.spec.ts:310` (ordinateur, tablette paysage), rouge aussi sans T1h-X.

### T1h-Y · Réunions, tâches, évènements — fait (session parallèle)
- Commits : `0df0c79` + `8789565` bo-reunions-taches (-1, -3 à -11, -13 à -20) · `23407ba` + `c4ea3bb` evenements-app (-1,
  -2, -5, -7 à -10) · `c7d7f3e` + `58c05cd` bo-evenements (-1, -2, -4, -6 à -11, -13, -14). Laissés à T3 : bo-reunions-taches-2,
  -12 ; à T4 : evenements-app-3, bo-evenements-5, -12.
- Posés : `button.tsx` (désactivé = `--secondary` / `--muted-foreground`, sans opacité), `ui/champ.tsx` (`Champ`),
  `Textarea` gris de 96 px (= evenements-app-4), `EnTetePage` à titre facultatif, `DeuxVolets` prop `listeNaturelle`,
  `PastilleEtat`, jetons `--cal-*` et `--etat-*`.
- **Tranché au code** : bo-reunions-taches-10 et -5 au Back-office seulement ; -9 l'emporte sur -6 (Modifier une réunion
  revient à sa fiche) ; arbitrage 14 : bo-evenements-6 ne touche que Nouveau ; pas d'ombre de bord ajoutée à `DeuxVolets`
  (le fondu existant en tient lieu) ; le volet flottant du calendrier (< 1 600 px) sert aussi en Agenda ; tableau des
  réservations dès 720 px de conteneur (pas 640 : le créneau se coupait) ; placeholder du compte rendu « Lien du doc ».
- **Questions laissées au défaut de l'annexe** : bo-evenements Q1 (deux mots), Q4 (côté membres non traduit), Q5 (seul
  nombre) ; « + Nouvelle réunion » encore présent sur `/reunions/nouvelle`.
- zh à relire : 会议名称, 团队, 创建会议, 本次会议暂无任务。, 修改会议, {{equipe}}的任务, 由 {{nom}} 于{{date}}创建, 文档链接, 保存,
  收起过去的周, 余 {{count}}, 敬拜赞美, 献唱, 舞蹈, 短剧, 表演, 开放中, groupes de `libelleQui`. Courses vues : `back-office-coupe:279`,
  `calendrier:862`, `:886`, `:1634`, `reunions:296`.

### Fin de T1 (04/11/2026)
Toutes les entrées T1 des 17 annexes sont codées. Restent à régler avant T2 : `agencement-v18-taches.spec.ts:95`, `:198`,
`:249` (page d'équipe en deux colonnes depuis back-office-10, T1h-X) ; `agencement-v18-moi.spec.ts:310` ; la cloche du
Back-office à 7 px du bord à 360 px en français (sélecteur de T1a, espace Back-office courant) ; puis la suite complète.
- Reprises faites : `agencement-v18-taches` mesure les deux colonnes de back-office-10 (rendu conforme) ;
  `agencement-v18-moi:310` suit quotidien-3 / -4 (aperçus de Moi en deux colonnes au-delà de 720 px de conteneur : une
  colonne de 592 px à 1 280 px, deux à 1 440) ; `agencement-v18-moi:215` lit « 乐理 » (libellé du lot EM) ; sélecteur
  d'espace : sous 375 px, l'espace courant n'est plus qu'une icône de 36 px lui aussi (cloche à ≥ 16 px du bord à 360 px,
  testé avec App, Musiciens et Back-office courants, fr et zh). 352 tests verts sur les cinq projets.

### T2a · Recette de surface, jetons et écrans pilotes — fait (orchestratrice)
- Jetons : `--fond-groupe` (#f2f2f7 / noir), `--radius-groupe` 16 px, `--secondary-fond` (#e5e5ea / #2c2c2e),
  `--shadow-flottant` = l'ombre de la barre d'onglets (`0 14px 40px rgba(28,28,30,.2), 0 2px 6px rgba(28,28,30,.08),
  inset 0 1px 0 rgba(255,255,255,.8)` ; sombre comme `--shadow-raised`), couleurs Tailwind `fond-groupe`,
  `secondary-fond`, rayon `groupe` ; `GROUPE = "rounded-groupe bg-card"` dans `ui/group.tsx`. `--shadow-soft` gardé
  jusqu'à T2b.
- **Mécanisme du fond** : prop `fond="groupe" | "blanc"` sur `EnTetePage` et `DeuxVolets` (gris par défaut), qui pose
  `data-fond-groupe` ; `:root:has([data-fond-groupe])` bascule `--fond-page`, lu par `body` et les barres. Pages de lecture
  en `fond="blanc"` : Harmonie, guide, questionnaire (non classé par la spec : laissé blanc, à confirmer). Chants décidé
  en CSS (gris sur la liste et en deux volets, blanc pour un chant seul, y compris de 1 024 à 1 147 px barre dépliée).
  Toute nouvelle page de lecture bâtie sur `EnTetePage` doit passer `fond="blanc"`.
- Pilotes : Accueil (verset sans aplat, cloche et menu en blanc), Setlists (contrôles hors de la carte à 1 280, piste
  `--secondary-fond`, liste en groupe), À faire (une seule recette, colonne de droite comprise), Chants (liste en groupe
  blanc à toutes les tailles, qui finit avant l'index A–Z ; recherche en aplat `--secondary` dans le groupe ; page du
  chant en groupe `--background` en deux volets). Sombre : contrôles inchangés par rapport à `9ecec9f`.
- **Laissé à T2b** : cartes `.raised` de l'accueil (Ce dimanche, Pour moi) et des setlists en tablette portrait ; menus,
  feuilles et toasts en `--shadow-flottant` ; liste des deux volets en sombre (a perdu son liseré : à rendre) ; meta
  `theme-color` (#fff au-dessus du gris).
- **Go de Timothée pour T2b (04/11/2026)** : « Tu peux go après », confirmé « go T2b direct », sans attendre de voir les
  captures des pilotes.
