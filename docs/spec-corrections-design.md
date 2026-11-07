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
- Suite complète sur `9ecec9f` (trois tiers en sessions parallèles) : 27 régressions du lot, réglées après T3a. Rendus
  voulus, tests adaptés : « Lun. 26/7 » (plannings-5), « Culte Francophone » (services-2), « Ce dimanche » en `dt`/`dd`
  (dff1982), sous-titre 13 px (compte-2), h1 dans le volet de la fiche, « Voir comme un membre » premier du menu « ⋯ »,
  « Partager » sur la rangée des étiquettes (eglise-8), 和平团契 / 喜乐团契 en 中文, plus de pastille ambre (bo-equipes-12),
  « À qui » exact, groupe blanc sans ombre (T2), segments du sélecteur sans zone au pointeur fin (§ 3). Défauts corrigés :
  défilement horizontal de la page chant (marge du scan 简谱 coupée par `overflow-x: clip` sur la colonne) ; panneau de
  marque en couleur opaque `color-mix` (plus de dégradé) ; icône de 36 px du sélecteur au téléphone portée à 44 px de
  zone (8 px vers l'extérieur aux bouts, 4 px au milieu) ; menu « Choisir un nom » du planning borné à la place restante
  de l'écran et défilant (il sortait de l'écran sous une case à mi-hauteur). Seize autres rouges sont des courses (verts seuls).

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

### T2b · Recette de surface, le reste des pages — fait (orchestratrice)
- `.shadow-soft` et `--shadow-soft` supprimés (20 fichiers) ; les 70 fichiers en `raised` triés. Classes posées dans
  `@layer components` (globals.css), pour que les utilitaires `hover:` et `dark:` gagnent la cascade : `.carte-groupe`
  (groupe : `--card`, rayon 16, sans ombre ; en sombre le liseré de l'ancien `.raised`, donc sombre inchangé),
  `.sur-gris` (contrôle blanc sans ombre sur le gris), `.flottant`, `.bloc-info` (bloc non touchable : `--secondary` sans
  ombre en clair, rendu `.raised` en sombre) ; `GROUPE = "carte-groupe"`.
- Ombre gardée : barre d'outils du chant et ses pilules, barre latérale, bouton rond flottant, curseur blanc du rail ;
  mode louange inchangé. Ombre flottante sans bordure : menus (`dropdown-menu`, popovers de nom et de titulaire,
  popover des accords), dialogues et feuilles (`alert-dialog`, `drawer`, panneaux), toasts, sommaire et annotation du
  mode louange. Groupes : ≈ 65 fichiers. Rail et pilules posés sur le gris : piste `--secondary-fond`, libellés à 70 %.
- Pages grises : accueil, planning, setlists et création, liste des chants, statistiques, Mes services, Moi, profil,
  admin, annonces, notifier, évènements, tâches, équipes, Back-office. Blanches : setlist en lecture, chant seul, accords,
  Harmonie, guide, questionnaire, connexion, mode louange.
- Reprises de la relecture et de la critique : bandeau des rappels et état vide en groupe blanc sur le gris (`surGris`),
  en `bloc-info` ailleurs (plus de pointillés) ; grille du mois du calendrier en groupe ; cartes du planning sans bordure
  et liseré ensemble en sombre ; rayons des menus et du tiroir à 12 px ; « Comment ça marche ? » hors du groupe des
  setlists partout ; entrées du catalogue d'Harmonie avec un retour au survol ; bloc des questions du questionnaire sans
  surface.
- Tests : `look-*` (8 specs) 406 verts ; `look-fondations`, `look-secondaires`, `look-planning`, `calendrier` 557 verts,
  tous projets. Nouvelle vérification transverse : sur six pages grises, aucune bordure avec ombre, aucun groupe blanc
  ombré.
- **À trancher** : meta `theme-color` gardée à #fff (barre d'état blanche au-dessus du gris sur les pages de liste) ;
  boutons à contour (`inset 0 0 0 1px`) gardés sur les pages grises (commandes) ; `AccordsProvider`, `Switch`, etc. hors
  liste gardent `shadow-lg/xl` là où rien ne flotte.

### T3a · Contrôles, primitives — fait (orchestratrice)
- `--pose` (blanc en clair, `240 1.7% 23.1%` = rgb(58, 58, 60) en sombre ; couleur Tailwind `pose`) : curseur du rail,
  segment actif de `SelecteurEspace` (ombre `shadow-sm`, liseré intérieur en sombre), bouton `outline` (`button.tsx`).
- `OngletsRail` : 36 / 40 px, onglets 30 / 34 px, curseur `--pose` + `--shadow-raised`, 13 px semi-gras, largeur au
  contenu (prop `pleineLargeur`), zone de 44 px (`TOUCHER_RANGEE`) ; la prop `cible44` disparaît (comportement par défaut).
  Le rail est un conteneur défilant transparent qui porte la zone de 44 px, la piste dedans.
- `Pilules` : 28 / 32 px (texte 13 / 14 px), inactive `--secondary`, active `--primary` ou la couleur du service ; à la
  ligne au pointeur fin, défilement avec fondu au toucher. **Constaté au navigateur** : dans un recouvrement, le toucher va
  à la pilule la plus tardive du DOM ; la zone (`TOUCHER_PILULE`) s'arrête donc à mi-écart (3 px de chaque côté).
- `Menu` (`src/components/ui/menu.tsx`) : `value`, `defaultValue`, `options` (avec groupes), `onChange`, `label`,
  `surGris` ; déclencheur en pilule, en encre quand un filtre est posé ; panneau `material-panel`, rayon 12, lignes 36 / 44
  px, coche à gauche. Premier usage : le filtre de thème de la liste des chants. `ChampSelect`
  (`src/components/ui/champ-select.tsx`, 44 px, rayon 12, chevron 16 px) : pas encore utilisé (T3c).
- Restent pour T3b/T3c : `MenuActions.tsx:70` et `EquipesClient.tsx:358` en `bg-pose` (back-office-3) ; prop
  `pleineLargeur` à poser sur les rails de Mes services et Setlists ; recouvrement vertical de 6 px entre deux lignes de
  pilules au toucher (mineur).

### T3b · Contrôles B : Statistiques, Chants, Setlists, Harmonie — fait (session parallèle)
- Commits `7ba6544`, `6a93bb6`, `9a7d3bb`, `9167617`, `3bbda9e`. Plus aucun `<select>` visible hors formulaire sur les
  quatre écrans. Statistiques en trois rangées, tri du téléphone en `Menu` ; Chants « Thème » ; Setlists : `Menu` « Tous
  les services », « Mes services » en pilule `aria-pressed` ; Harmonie : Tonalité, Capo, Moment, Niveau en `Menu`.
  `Menu` reçoit `nom` et `prefixe` ; `Pilules` ramène l'active en vue au montage.
- **Tranché au code** : musiciens-2 fait foi pour Harmonie (Moment et Niveau en `Menu`, pas en pilules) ; doublon
  Théorie / RD-2000 retiré au téléphone (la barre du bas les porte) ; parcours replié en deux volets ; le tri de
  Statistiques ne passe jamais à l'encre.
- **À trancher** : au téléphone, « Mes services » seul sur sa rangée à côté de « Tous les services » (libellé) ;
  curseur du rail peu contrasté en sombre. zh à faire relire : 主题, 所有聚会, 全部段落, 全部难度, 按顺序的 {{count}} 张卡片.

### T3c · Contrôles B : Équipes et formulaires — fait (session parallèle)
- Commits `b6cdf4b`, `45e1148`. Équipes en `OngletsRail` (point de couleur), index en `Menu` « Aller à une équipe »,
  filtres de Personnes en `Menu` ; `ChampSelect` dans les dix formulaires ; Bibliothèque et version de `PartitionView`
  en `Menu` ; agenda en deux rangées ; `TOUCHER_44` de `SetlistDetailClient` ramené sur `toucher44.ts`. `Menu` gagne
  `texteDeclencheur` et le groupe sans titre (filet).
- **Tranché au code** : le `Menu` d'index reste sur sa propre rangée ; `PiluleTonalite` et les puces d'`EnTeteEditeur`
  gardent leur select transparent.
- **À trancher** : au téléphone du Back-office, trois rails empilés plus le `Menu` avant la première carte (piste : la
  vue à droite du `Menu`). zh à faire relire : 跳到团队, 所有团契.
- **Défaut relevé, à reprendre** : `shadow-[var(--shadow-…)]` est lu par Tailwind comme une couleur d'ombre (aucune
  ombre) ; corrigé dans `dropdown-menu.tsx` (`[box-shadow:var(--shadow-flottant)]`), restent ~15 occurrences (T2b).

### Reprise · la page du chant en deux volets (05/11/2026, signalée par Timothée)
- Cause : T2a avait posé le chant dans un groupe blanc arrondi sur le gris, sans rendre la marge retirée par chants-8 B
  (« à confirmer » dans partout.md, jamais regardé). Contenu collé aux bords, barre collée au bord de l'écran, bande vide.
- Fait : le panneau du chant est un groupe de lecture frère de la liste (même haut, rayon 16, 16 px en haut, 24 px de
  côté, 24 px en bas) ; la barre est dans le panneau ; collée, elle dessine le haut du panneau aligné sur la carte de
  la liste et repeint au gris la bande au-dessus (`data-collee`) ; escamotée, elle emporte son ombre ; en sombre, le
  panneau prend le liseré de la liste. La page s'ouvre en haut : seule la liste défile jusqu'au chant ouvert (le
  `scrollIntoView` faisait défiler la fenêtre, défaut antérieur au lot), ligne gardée au-dessus du bas visible.
- Tablette portrait : « Proposer un chant » finit au même x que la recherche (régression de T2a). Tests :
  `chants-deux-volets` (panneau, barre collée, ouverture d'un chant du bas de liste), `barre-chant`, `agencement-v18-chants`.
- **Leçon** : un regard sur des captures juge la mise en page (marges, alignements, vides, coins), pas seulement
  l'absence de coupure. Suite : même défaut cherché sur toutes les pages, et un test mesuré des marges intérieures.

### Reprise R1 · trous de la recette de surface C sur tout le site (05/11/2026)
- Revue de tout le site (77 pages, cinq dispositions, clair, sombre, 中文) sur les signes du défaut de la page chant :
  43 constats, 32 confirmés par un relecteur (11 réfutés), dont 18 venus du lot. Captures avant/après comparées.
- Causes communes réglées : un aplat `--secondary` posé sur le gris est invisible (états vides de Planning, Réception,
  À faire, aperçu de Notifier, bandeau « Toi ») → groupe blanc (`surGris`, `carte-groupe`) ; groupe blanc sur page
  blanche (Nouvelle setlist, fiche de tâche) → la page passe au gris ; fondus et feuilles peints en blanc ou en noir fixe
  (bandeau des Équipes, feuille en sombre) → `--fond-page` / `--raised`. Grille du planning en groupe sans bordure ;
  groupes d'Harmonie espacés ; tableaux des cours à 12 px du cadre ; « Réserver » et « … » de la Scène à 16 px ;
  formulaire d'évènement aligné sur la liste ; « Modifier » de la fiche de tâche en `sur-gris`.
- Ombres : `shadow-[var(--shadow-…)]` était lu par Tailwind comme une couleur (aucune ombre, 14 endroits) →
  `[box-shadow:var(--shadow-…)]`. Le curseur du rail prend l'ombre courte du segment actif (`shadow-sm`), pas
  `--shadow-raised` : rognée par le rail qui défile et trop lourde.
- Tests rougis par T2 / T3a adaptés à la recette C (statistiques:390, agencement-v18-setlists:146 et :239,
  pages-en-grand-harmonie-corrections:84, equipes-page:284, agencement-v18-t5:486).
- **Non fait, à trancher** : en mode louange, la barre du haut recouvre l'en-tête du chant quand les barres s'affichent ;
  la corriger touche la coupe des pages (lignes passées sous la barre du bas) : remis à l'état d'avant, question pour
  Timothée. Teinte de « Cette semaine » dans la grille (couleur de service, gelée) gardée. Bouton d'agrandissement du
  guide gardé à cheval sur le coin (le rentrer cachait le texte des captures).
- Restent pour R2 (antérieurs au lot ou rouges sur la base) : constats n° 1, 3/19, 8, 9/20, 10, 11, 13, 15, 21, 28, 32 ;
  agencement-v18-planning:776, look-barres:208 et :237, look-planning-feuille:94, look-navigation:113.

### Reprise R2 · défauts d'agencement antérieurs au lot et garde-fou (05/11/2026)
- Constats n° 1 (Déconnexion de Moi en rangée pleine largeur), 3/19 (gouttières de l'accueil), 9/20 (`min-h-screen`
  dans `<main>` en plus de la cale : 150 px de gris à faire défiler), 10, 11 (marges des barres du mode louange à 24 px
  dès 768 px, pagination non touchée), 13 (pages de détail d'Harmonie à `--marge-page`), 15, 21, 28, 32 ; bouton
  d'agrandissement du guide dans la ligne de légende ; « Par où commencer » en `blanc-sur-gris` ; sélecteur d'espaces et
  pastille « Toute l'église » lisibles sur le gris ; colonnes extrêmes de la grille du planning à 12 px.
- n° 8 (liste des chants plus haute que l'écran à l'ouverture) **non fait** : la corriger laissait 80 px de vide une
  fois collée ; à reprendre en liant la hauteur au défilement, ou à laisser.
- Tests rouges sur la base réglés (tous « voulus », adaptés sans baisser de seuil) : agencement-v18-planning:776,
  look-barres:208 et :237, look-planning-feuille:94, look-navigation:113.
- **Garde-fou** `tests/agencement-groupes.spec.ts` (dans `SPECS_GRAND_ECRAN`) : une quinzaine de pages, cinq projets,
  mesure (a) aplat gris sur gris, (b) groupe de la couleur de la page, (c) texte à moins de 12 px du bord d'un groupe,
  (d) groupes voisins au même haut, (e) page courte qui défile. Aucune exemption. Règle écrite dans
  `docs/orchestration.md` § 5.

### T4a · Échelle B et plancher P12/P13 — fait (07/11/2026)
- Découpage tranché au code : T4a = `partout-echelle`, `partout-plancher` et les entrées T4 de taille de texte
  (`eglise-19`, `musiciens-9`, `dimanche-15`) ; T4b = `partout-largeurs` et les entrées T4 de largeur
  (bo-evenements-5 et -12, dimanche-7, -8, -9, evenements-app-3, services-4 et -8).
- `xs` à 12 / 16 (+0,005em) ; codemod de ≈ 730 tailles arbitraires dans 127 fichiers selon les correspondances de
  l'annexe. Exceptions gardées : champs à 16 px au téléphone, mode louange, 简谱, PDF, lignes de paroles
  (`EditLineSheet`), pastilles de ton (`PiluleTonalite`, `SongView`), noms d'accord en grand (`PanneauAccord`
  `TAILLE_NOM`, 32/26/40), `lg:text-[40px]` de l'écran de marque (aucun cran au-delà de 34 px).
- **P13** (point à confirmer au code) : `@layer utilities` + `@media (min-width: 1024px)` sur
  `.text-xs:where(.text-muted-foreground, [class*="text-muted-foreground/"])` → 13 / 18. `:where()` garde la
  spécificité d'une classe : la règle sort après `.text-xs` et avant les variantes responsives, une variante plus grande
  (`lg:text-base`) l'emporte. Le gris hérité d'un parent n'est pas couvert : aucun cas sur les pages mesurées.
- `dimanche-15` : seuil du menu « ⋯ » à **431 px** au lieu de 412 : avec les libellés à 12 px et 8 px de marge, les
  sept commandes ne tiennent plus sur un téléphone de 430 px (« Mode Louange » et « ⋯ » à la ligne). Tous les
  téléphones en portrait rangent donc « Adapter » et « Ma version » dans le menu. Aucune clé de langue.
- Hors entrée : Évènements en grand, `pb-16` retiré (doublait le `pb-6` de `DeuxVolets`) : la page courte défilait de
  25 px à 1 440 × 900 une fois le texte grandi (garde-fou `agencement-groupes`, mesure e).
- Tests : nouveaux P12/P13 et débordement des vignettes et badges (`look-fondations`) ; seuils 11 → 12
  (`look-fondations`, `look-secondaires`) ; valeurs de l'ancienne échelle passées au nouveau cran (agencement-v18-chants,
  -fondations, -harmonie, -setlists, -t2a, -t7, -taches, `helpers/agencement.ts`, retouches-v18-pilules-stats,
  look-louange). Rouge sur la base, laissé à T4b : `pages-en-grand-mes-services:223` (cherche `.raised`, absent de
  Mes services depuis T2).

### T4a · retouches de la critique de design — fait (07/11/2026, `29ce362`)
- Un cran (`text-xs`…) pose son interligne : les éléments convertis qui héritaient d'un `leading-*` le reprennent
  (vignettes de date, « ×N » des sections). Gris hérité à 12 px en grand (P13) corrigé (vue liste d'une setlist,
  questionnaire, Personnes, campus) ; interlignes en px de l'ancienne taille retirés des titres à 22 px ; en-tête
  d'Accords comme `EnTetePage` ; astuce du guide sur `bg-background` ; « C = Do » insécables dans l'aide d'Accords.
- Tranché ensuite (« Reprendre ici », 5) : titre de la page d'un chant 22 / 30 px ; titres d'Harmonie et titre de
  setlist en 中文 gardés.

### T4b · Largeurs L1 — fait (07/11/2026, `2457eda`)
- Liste seule : colonne de 720 px (`--colonne-liste`), alignée à gauche, en-tête à la même largeur
  (`body:has([data-colonne-seule])`) : Mes services, Setlists, Tâches, Réception, Personnes, questionnaire. Pilote Mes
  services (groupes sur le gris, bandeau en groupe blanc, état vide 720 × 96). Entrées bo-evenements-5 et -12,
  dimanche-7, -8, -9, evenements-app-3, services-4 et -8. Clé `evenements.copierLien` (复制链接 à faire relire).
- Écarts : barre d'outils de la setlist en tablette portrait posée sur la marge (dimanche-9, pour un seul bord) ;
  blocs de l'accueil du Planning et cartes d'équipes non convertis (grille déjà pleine largeur ; bandeau à défilement
  imposé par ses specs) ; paragraphes à 65 caractères non posés (aucune page nommée).
- La fiche de gestion d'un évènement ne passe en deux colonnes qu'au-delà de 1 024 px de volet (annexe), or le volet
  fait ≈ 690 px même à 1 440 px : elle reste en une colonne partout (gardé, voir « Reprendre ici », 5).
- Passe Playwright divisée en trois sessions (`--shard`, 28 specs, ≈ 3 950 tests).

### T5 · Contenu chinois — fait (07/11/2026, `09ff29f`, `75f3aa6`, corrections jusqu'à `7bece9a`)
- Guide (eglise-5, partout-q3-guide) : `GUIDE_LANGUE=zh-CN` dans `tests/guide-captures.spec.ts`, 13 captures chinoises
  (`public/guide/zh/`, 3,5 Mo) et le jeu français refait après T2 à T4 ; `GuideFigure` lit la capture et les
  annotations `zh` en 中文, repli sur le français. annonces.png et notifier.png ne sont référencés nulle part (laissés).
  Pas de jeu sombre (filtre CSS d'eglise-6).
- Harmonie (harmonie-5, avec musiciens-10 et partout-q3-harmonie) : `AvisLangue`, un avis par page en 中文 (fiche avec
  la relecture dans le même bloc, chapitre, liste et détail RD-2000, recette) ; `lang="fr"` sur le contenu ; tables de
  12 familles, 7 groupes et 22 moments (à faire relire, les moins sûres : 渐升, 和弦排法, 铺底音色, 灵魂乐色彩, 福音音乐).
- Titre de la page d'un chant 22 / 30 px (question de T4 tranchée).
- Passe en trois sessions (24 specs, 1 122 tests) : 969 verts ; rouges réglés (crédit d'auteur à 13 px en grand par
  P13 ; « Adapter » / « Ma version » par le menu « ⋯ » au téléphone, helper `basculerMode` ; avis de langue : retour
  au français prouvé). Rouge antérieur au lot de T4, à régler en fin de lot : `rd2000.spec.ts:41` au téléphone (la
  carte « Sons du RD-2000 » n'est plus dans le catalogue depuis T1g).

### Fin de lot — fait (07/11/2026, jusqu'à `f8708d5`)
- Suite complète (18 403 tests) en six sessions parallèles (`--shard=1/6` … ; deux serveurs de test tombés en route,
  leurs tests relancés). Rouges réglés : mode louange sorti de l'échelle B là où le codemod l'avait touché
  (`StructureStrip compacte`, `NuanceBadge` dans `SongView.tsx`) ; « Adapter » / « Ma version » sous 431 px dans
  treize specs (helpers `basculerMode`, `verifierMode`) ; sélecteur d'espace au téléphone (zone du segment du milieu
  qui mordait sur ses voisins) ; tests qui lisaient un rendu d'avant le lot (`<select>` des Fêtes devenu Menu,
  état vide sans pointillés, carte RD-2000 du catalogue, compte des commandes de la barre).
- Relecture finale (règles transversales, `git diff da0b3ef HEAD`) : bonne. Remarque : `JianpuSheet.tsx:588`, ombre du
  bouton de bascule retirée en T2b (hors du calque).
- **Rouges restants, antérieurs à T4 et T5** (vérifiés rouges sur `61d6f5b`), à régler dans un lot à part :
  `navigation-grand-ecran:52` (la cloche ne relit pas au retour sur la page : `ECART_MIN_MS` de 60 s dans
  `useNotifications.ts` contre un retour 1,5 s après le chargement dans le test ; antérieur au lot) ;
  `barre-rappelee:8` (ordinateur : la barre du chant rappelée reste à 36 px du haut, page du chant en deux volets) ;
  `look-barres:239` (ordinateur : le fond des barres d'un chant ne repeint pas exactement la page).

### Retouches de la validation V1 à V6 (Timothée, 07/11/2026, go « 1 à 6 avec l'option A »)
Vu en local sur un écran large : ≈ 1 700 px de contenu à côté de la barre latérale, au-delà des 1 280 / 1 440 px où
le lot a été réglé. Chaque test d'agencement ajouté mesure aussi à **1 700 px** de contenu (fenêtre de 1 940 px).
- **V1 · Index A–Z des Chants** (`src/app/songs/SongListClient.tsx`). Centré sur toute la carte, il démarre à hauteur
  de la recherche et des filtres. À faire : au repos, son haut est au niveau de la première ligne de la liste (titre
  « Récemment consultés » ou compte des chants), jamais au-dessus ; une fois la page ou la carte défilée, il reste
  centré dans `--cadre-index` comme aujourd'hui. Critère : au repos, haut de l'index ≥ haut de la première ligne de la
  liste − 4 px, sur les quatre dispositions ; tests existants de l'index inchangés.
- **V2 · « à choisir » → « — »** (`src/components/backOffice/aFaire/ColonneDroite.tsx`). Une case vide du planning
  du dimanche s'écrit « — » en gris (`text-muted-foreground`, graisse normale), lien souligné au survol, `title` et
  `aria-label` composés des clés existantes (« à choisir — Ouvrir le planning », aucune clé nouvelle). Le lien ouvre
  **la bonne case** : `/back-office/planning/<onglet>?case=<grille>|<date>|<cle>` (onglet par `ongletDeLaGrille`,
  date au format de `data-case` de `PlanningGrille`) ; repli sur `/back-office/planning` si l'onglet n'est pas dans
  `planningsDuBackOffice`. Sur la page du planning : la case `[data-grille] [data-case="date|cle"]` (au téléphone,
  la carte `[data-date-carte]`) défile au centre et porte un anneau (`--ring`, 2 px) pendant ≈ 2,5 s, sans animation
  si `prefers-reduced-motion` ; le focus va sur son bouton (`preventScroll`). `ServiceDuDimanche`
  (`src/lib/tableauDeBord/donnees.ts`) porte la clé de grille et la date de la ligne.
- **V3 · Setlists sans setlist choisie** (`src/app/setlists/page.tsx`). Fin de la colonne seule de 720 px sur cette
  page : en grand, l'aperçu de la première setlist de la liste filtrée est montré d'emblée (`choisie` le calcule déjà,
  Q3), sa ligne marquée active ; la colonne seule ne reste que pour une liste vide. Les autres listes montrent déjà
  leur premier élément (Tâches, Réception, Personnes, Mes services) : inchangées.
- **V4 · Fiche de Mes services** (`DetailService.tsx`, `.service-colonnes` de `globals.css`). Fin de la grille
  `auto-fill minmax(280px, 1fr)` (T4b) qui laissait la carte d'équipe seule dans une case de ≈ 300 px : comme
  l'aperçu d'une setlist, setlist et équipe côte à côte (`minmax(0, 1.6fr) minmax(0, 1fr)`) dès 680 px de volet,
  l'une sous l'autre sinon. Sans setlist, la place de la setlist porte une carte simple « pas encore de setlist »
  (clé existante si elle existe, sinon nouvelle clé fr / zh-CN), sans bouton.
- **V5 · Partitions d'une setlist, option A** (`SetlistDetailClient.tsx`, `PartitionView.tsx`, `SongView.tsx`). En
  deux volets, la colonne de lecture va jusqu'à **860 px** (au lieu de 672) et se centre dans l'espace à droite du
  sommaire ; `max-w-2xl` de `SongView` et de la fusion lisent une variable (`--colonne-partition`, 42rem par défaut),
  posée à 860 px dans ce volet seulement (page du chant, téléphone et tablette inchangés). La rangée d'en-tête finit
  où finit la colonne : `max-w` = `calc(50% + 648px)` (380 de sommaire + 28 + 860 centrés dans le reste ; égal à
  100 % sous 1 296 px), au lieu de 1 108 px. Critère : à 1 440 et à 1 700 px de contenu, bord droit de « Mode
  Louange » = bord droit de la colonne (± 2 px) ; écarts gauche et droit de la colonne dans son volet égaux (± 2 px).
- **V6 · 简谱 centrée**. Cause mesurée : 46 scans sur 191 ont une marge blanche droite bien plus large que la gauche
  (恩典之路 : 10 px à gauche, 179 px à droite sur 1 600). À faire : `scripts/jianpu/marges.py` écrit
  `public/jianpu/marges.json` (`slug → [[gauche, droite], …]` par page, encre = pixel < 128, lignes sous le recadrage
  de `cadrage.json`, colonnes d'au moins 3 pixels d'encre) ; `JianpuSheet` le lit comme le recadrage (repli : rien ne
  bouge) et, **hors mode `fit`** (mode louange inchangé), décale la page de (droite − gauche) / 2 px image par des
  `marginInline` inégales. Seule la position de la page change : aucune coordonnée du calque (zone gelée) ne bouge,
  image et calque se déplacent ensemble. Critère : pour 恩典之路, écart entre l'encre et les bords de la colonne égal
  à gauche et à droite (± 4 px) ; un scan déjà équilibré ne bouge pas de plus de 2 px.
- **État — fait** (07/11/2026, `b04dca6`, corrections `32d0cb6`, `b744653`, `40bd5ad`) : trois executants en parallèle,
  puis tests ciblés en quatre sessions (23 specs, 2 659 tests). Corrigé ensuite : V1, l'index au repos se raccourcit
  pour finir où finit l'index centré (`--liste-haut`) et se fige en px pendant un geste (il glissait sous le doigt) ;
  son décalage retranche la gouttière réelle (au téléphone il mordait de 16 px sur la carte) ; V3, « Ouvrir » de
  l'aperçu en recette « outline » (aplat `--secondary` sur le gris, agencement-groupes) ; test V2 qui suit l'élément
  porteur de l'anneau (au téléphone en édition, la case de la carte). 56 scans ont |droite − gauche| > 30 (critère
  sous le recadrage). Vu à l'œil à 1 280 × 720, 1 440 × 900, 1 940 × 1 300 et au téléphone.

### Les trois rouges antérieurs — réglés (07/11/2026, go de Timothée « corrige ça » et « revois juste le test pour la cloche »)
Après enquête, aucun n'était un défaut du site ; aucun fichier de `src/` ne change.
- `navigation-grand-ecran:52` (cloche) : le test simulait un retour sur la page 1,5 s après le chargement, sous l'écart
  minimal de 60 s voulu par le lot LF (`ECART_MIN_MS`). L'horloge de la page avance d'une minute (`page.clock`) avant le
  retour ; le test vérifie toujours qu'une seule cloche interroge Firestore.
- `barre-rappelee:8` (barre rappelée à 36 px) : en deux volets, la barre se pose dans le panneau, 16 px sous son haut
  aligné sur la carte de la liste, comme la barre collée au défilement ; c'est la reprise du 05/11, qui corrigeait
  « barre collée au bord de l'écran ». Le test, du 18/10, attendait 0 : il attend maintenant le haut de la carte + 16 en
  deux volets, 0 en un volet. Démarrage rendu robuste (hydratation, page qui défile vraiment) ; reste une course rare à
  l'ouverture sous charge (la barre revient juste après le premier défilement, 1 passe complète sur 3, jamais vue avec
  un journal des défilements) : le test redéfile depuis le haut, trois essais au plus. **À surveiller** : si un
  utilisateur voit la page d'un chant s'ouvrir défilée sur un appareil lent, chercher un défilement tardif de
  l'ouverture (`SongListClient`, ligne du chant ouvert, `scrollIntoView` quand la liste n'est pas encore bornée).
- `look-barres:239` (fond des barres) : en retirant l'en-tête « Chants », le test posait le haut du panneau pile au
  seuil où la barre se dit collée ; un demi-pixel en décidait, et collée, sa bande `::before` faussait la référence.
  Sur le vrai site l'en-tête est là et la barre n'est jamais collée en haut de page (écart nul mesuré) : le test la
  remet dans cet état. Contre-vérifié par deux relecteurs (aucune réfutation). Trois specs : 119 / 119, deux fois à froid.

## Reprendre ici (pour une nouvelle session, 05/11/2026)
Lire seulement : `CLAUDE.md`, ce fichier (§ 2 arbitrages, § 3 règles, et cette section), puis l'annexe de la tranche
en cours. Ne pas relire les sections « État » plus haut sauf besoin précis. Agents quelques-uns à la fois ; pas
d'audit de tout le site ; `--workers=2` pour Playwright (le serveur de test meurt faute de mémoire au-delà).
1. **T4a** et **T4b** faits (07/11/2026, sections ci-dessus).
2. **T5** fait (07/11/2026, section ci-dessus).
3. **Fin de lot** faite (07/11/2026, section ci-dessus), puis **retouches V1 à V6** de sa validation (section
   ci-dessus). Validé par Timothée en local ; **en ligne le 07/11/2026** sur son ordre (`main` fusionné dans la branche,
   `fb3744f`, puis `main` avancé à `afcf898` ; build de production, 1 477 tests des zones touchées, fusion
   contre-vérifiée). Les trois rouges antérieurs réglés ensuite (section ci-dessus) : des tests, pas le site.
4. **Questions ouvertes pour Timothée** (à poser en une fois) : 调 D ou D调 ; mode louange (barre du haut sur le titre
   quand les barres s'affichent ; bulle d'indice ; liseré ; FreeShow/PDF même icône) ; questionnaire laissé blanc ;
   `theme-color` #fff ; bo-evenements Q1/Q4/Q5 ; « + Nouvelle réunion » sur /reunions/nouvelle ; « Mes services » seul
   sur sa rangée (Setlists, téléphone) ; trois rails empilés au téléphone du Back-office ; curseur du rail peu
   contrasté en sombre ; n° 8 ci-dessus ; traductions 中文 à faire relire (listées dans les sections T1 à T3c, et
   复制链接 de T4b).
5. **Questions de T4 tranchées par la conversation principale** (Timothée, 07/11/2026 : « tranche par toi-même ») :
   titre de la page d'un chant 22 px au téléphone, 30 px dès 768 px (`text-xl md:text-2xl`) ; titres d'Harmonie
   gardés (fiche en volet 22, chapitre 30 : deux niveaux) ; fiche de gestion d'un évènement en une colonne ≤ 720 px
   gardée (baisser le seuil ramènerait le déséquilibre de la tablette portrait) ; menu « ⋯ » de la setlist sous 431 px
   gardé ; blocs du Planning, cartes d'équipes en `auto-fill` et paragraphes à 65 caractères écartés ; 复制链接 gardé
   (terme d'interface courant) ; titre de setlist en 中文 sur deux lignes au téléphone gardé (titre saisi).

