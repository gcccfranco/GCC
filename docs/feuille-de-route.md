# Feuille de route — GCC Louange → « GCC »

**Fichier court, point d'entrée** (Timothée, 10/11/2026 : consommer moins de jetons). L'historique complet jusqu'au
10/11/2026 (demandes détaillées A à AO, tableau « Fait », journal, écartés, relecture adversariale) est dans
`docs/archive/feuille-de-route-2026.md` : **ne jamais l'ouvrir en entier**, seulement par `grep -n` puis
`sed -n 'a,bp'` sur une section (`grep -n '^### AK\.'`, `grep -n '^## 6'`…).

**Tout renvoi « § 1, § 2, § 3.X, § 4, § 5, § 6, § 7 » à la feuille de route, dans une spec, vise désormais l'archive.**
Ses sections (`grep -n '^## ' docs/archive/feuille-de-route-2026.md`) : § 1 Fait · § 2 À construire, ordre des lots 1 à
18 · § 3 demandes A à AO · § 4 Carte des modules de l'app « GCC » · § 5 Écarté · § 6 Journal · § 7 Relecture adversariale.

**Mode de travail (Timothée, 14/09/2026)** : chaque lot démarre sur un « go » explicite ; Timothée teste en local avant
de laisser continuer ; la réussite d'un lot = sa validation. Le dimanche ne casse jamais ; coût nul (Vercel Hobby, un
seul cron). **Cap (14/09/2026)** : l'app s'appelle « GCC » et regroupe tout ce qui touche l'église, par sections ;
toute l'assemblée a un compte ; sans compte on voit les chants et le calendrier, rien de nominatif. Vision :
`intent/vision-site.md`.

## Comment ce document évolue (Timothée, 10/11/2026)

- Une demande nouvelle reçoit la lettre suivante (**AQ**) : **une ligne** dans l'index ci-dessous, le détail (mots de la
  personne, décisions, tranches, avancement) dans sa
  spec `docs/spec-<sujet>.md`, les décisions aussi dans `intent/vision-site.md`.
- Le journal vit dans le § Avancement de chaque spec ; ici, seul « État » est réécrit (daté), jamais allongé.
- Un lot livré : sa ligne d'index change de statut (date, commit). Refusé : statut « écarté », avec la raison dans la spec.

## État au 10/11/2026

Repris des dernières entrées du journal (archive, § 6) et de `CLAUDE.md`, sans revérification. **La dernière entrée
du journal est du 08/11/2026 : ce qui s'est passé depuis n'est pas écrit ici.**

- `main` = le site en ligne ; `ui/apple-design` y est fusionnée et le back-office est ouvert en ligne depuis la fin
  octobre 2026 (`CLAUDE.md`, 29/10/2026).
- **Lot CD** (corrections du design, `spec-corrections-design.md`, T1a à T5, puis retouches V1 à V6 le 07/11 au soir) :
  validé par Timothée et **en ligne le 07/11/2026**, retouches comprises. Reste : 中文 à faire relire (Harmonie, 复制链接).
- **AN** pastilles « Int » / « Inst » et **Tu es notre Dieu en A** : en ligne le 07/11/2026.
- **08/11/2026** : formulaire de réunion à part (`ReunionForm`) et retouches iPhone des champs date et heure (go « tout
  puis main ») ; **rendu iOS à vérifier sur l'iPhone** (Chromium seul en session cloud).
- **AO, mode louange façon forScore** (`spec-mode-louange-forscore-2.md`), au 12/11/2026 : vagues 1 et 2 codées
  (`claude/tender-johnson-99hadm`, fusionnée dans la branche de travail le 10/11) ; **CA codé le 11/11/2026** (couleur
  des accords par compte, réglage dans les trois menus) ; **FS-F en cours** (go du 11/11) ; vague 3 enchaînée après
  FS-F : **JP-C puis JP-D ; AN suspendu**, il attend « Ma partition » (ci-dessous). Avant toute mise en ligne :
  relecture complète de la vague 2, passe sur le guide, 中文 nouveaux à relire, prévenir l'équipe, essai sur iPad.
  Détail : « Avancement » de la spec ; archive, `grep -n '^### AO\.'`.
- **Branches réunies le 12/11/2026.** Depuis le 11/11, les chantiers d'AP poussaient sur `claude/corrections-design`
  et ceux d'AO (fusion de `main`, CA, FS-F, go de la vague 3) sur `claude/friendly-cerf-cy7hio`, chacun sans les
  commits de l'autre. Fusion faite, seul conflit : ce fichier. **Branche de travail : `claude/corrections-design`** ;
  une session neuve s'y lance (source et branche de sortie) ; FS-F finit sur `claude/friendly-cerf-cy7hio`, que la
  session suivante d'AO fusionne avant de commencer. La règle des trois chantiers compte AO et AP ensemble.
  **Annotations** : AN (AO) et « Ma partition » (AP, `spec-ma-partition.md`) avaient chacun un go sur les mêmes
  traits, avec deux rangements ; ordre retenu, celui du cadrage AP (`spec-pupitre-musicien.md` § Ordre recommandé,
  point 3) : MP d'abord, AN ensuite, réécrit sur le nouveau rangement (suspension d'AN à confirmer par Timothée).
- **Pilotage délégué depuis le 12/11/2026** (`CLAUDE.md`, § Sessions cloud) : session « Pilotage · AO et AP (2) »,
  lancée par « Incohérence entre sessions » (`session_01UMdfubTRUV3nKS69sehVcU`) ; son identifiant :
  `session_01UMdfub76N5NaHByomwCgTB` (depuis le 12/11 à 10 h UTC ; avant : `session_01UMdfuaG5Kou4ye2eij6aMr`, plafond atteint). File des chantiers de code, trois au plus : AO (FS-F, puis JP-C et JP-D) ; les deux exemples (T1 à T7) ;
  « Ma partition » (MP-1 à MP-5) ; ensuite le comptage d'usage (T3), Harmonie (H2 et suivants), AN réécrit après MP-5.
  **État au 12/11, 10 h 10 UTC** : limite portée à **quatre** chantiers de code, une session par tranche, tests
  ciblés (`CLAUDE.md`, § Économie de contexte) ; sessions lancées en Opus 5.5. En cours : FS-F (AO,
  `session_01UMdfubYiUCKu2qWDJ3Sp6S`, sur `claude/friendly-cerf-cy7hio`, tests avant push ; JP-C puis JP-D ensuite
  par « Repo update et relance ») ; Ma partition MP-3 à vérifier (`session_01UMdfuaeUi8Rj8DRw1ZtGP3`, lance MP-4 puis
  MP-5) ; exemples T2 (`session_01UMdfudEbsAbMKJ3gzmCuJo`, lance T3 à T7) ; Harmonie H2 (`session_01UMdfuc5BHmNuwdhdc1YadF`,
  go de Timothée, ne lance pas H3). **10 h 15** : H2 fini (`622f778`, étiquettes « (proposé) » à valider par Timothée) ;
  comptage T3 lancé à sa place (`session_01UMdfubRJjSZsD9FwQ3owSa`, clé `cmd.louange.couleurAccords` ajoutée). Pupitre :
  questions toutes tranchées, **go de Timothée (12/11)** ; PU-1 part à la première place libre (fin du comptage T3),
  PU-4 à PU-6 après FS-F. **10 h 32** : comptage T3 fini (`1b165ac` ; `cmd.chant.partagerVersion` plus comptée depuis
  MP-3, correction confiée à la session MP-3) ; **Harmonie H3 lancé** à sa place (`session_01UMdfubYvNx8M6JbF9S2vnk`, go de
  Timothée). File, dans l'ordre : pupitre PU-1 à PU-6, puis comptage T4 (tranches enchaînées, `CLAUDE.md` § Go). En attente : pupitre PU-1 à PU-6 (spec écrite, pas de go, questions 1, 2, 4 à 7
  ouvertes) ; H3 et suivants (un go par lot) ; AN après MP-5 (suspension non confirmée par Timothée) ; trois
  questions avant MP-6. À Timothée : publier `firestore.rules` (Ma partition MP-1 ; `usage/{mois}` du comptage).
  **Planche « direction du site » du 11/11 : écartée** par Timothée le 12/11 (« j'aime pas ») ; artefact supprimé,
  session archivée, rien n'en est entré dans le dépôt. Ne pas la reprendre ; la direction visuelle reste à rechoisir.
- **File des chantiers de code** (règle : `CLAUDE.md`, § Pilotage délégué, « Moins de réveils »). **Cinq** chantiers au
  plus (Timothée, 12/11 après-midi). La session qui finit un lot : `git pull --rebase`, `list_sessions` (limit 10), et s'il reste une place elle
  lance le premier chantier ci-dessous qui a son go, raye sa ligne (« lancé, identifiant, heure »), pousse, s'arrête.
  En cours le 12/11 à 10 h 40 UTC : AO (FS-F, puis JP-C, JP-D ; **JP-C commencée le 12/11 à 11 h 05 UTC**,
  `session_01UMdfucQGkCmqMascx4pK1c`, **finie le 12/11** ; JP-D finie le 12/11 (`46f90a8`) : vague 3 faite sauf AN, à lancer après MP-5 ; à sa fin, quatre chantiers en cours (PU-3, H4, exemples T4, MP-5), une place libre, rien dans la file n'a de go) ; Ma partition (MP-3 → MP-5) ; exemples d'usage
  (T2 → T7) ; Harmonie H3 fini (`f2a8557`), place passée au pupitre PU-1.
  1. ~~**Pupitre PU-1 → PU-6**~~ lancé (PU-1, `session_01UMdfuaZsemUJk7tUKJRQiY`, 12/11 10 h 50 UTC, à la fin de
     Harmonie H3 `f2a8557` ; attend MP-3 vérifiée, enchaîne PU-2 et PU-3) (`docs/spec-entree-musiciens.md`, go du 12/11). PU-1 = PDF de setlist seulement ; lire
     § Tranches (la tranche) et les lignes du 12/11 du § Avancement (questions tranchées). PU-1 à PU-3 s'enchaînent ;
     PU-4 à PU-6 touchent le mode louange : après FS-F, et jamais pendant qu'une autre session modifie
     `PerformanceMode.tsx` (JP-C, MP-5) ; sinon la chaîne attend et rend sa place au suivant de la file.
  1 bis. ~~**Pupitre PU-4 → PU-6**~~ lancé (PU-4, `session_01UMdfudH7v6CfVEhY4EiPjX`, 12/11 16 h 04 UTC, à la fin de MP-5 `ddbaa13`, dernière à toucher `PerformanceMode.tsx` ; JP-D finie avant) (go du 12/11 ; PU-1 à PU-3 faites, PU-3 `0963e7a2`) : **à lancer** dès que ni MP-5
     (`session_01UMdfuZ8LxzZ5DHx86qYUw7`) ni JP-D (`session_01UMdfubEaKHYh9fbxpXqErH`) ne modifient plus
     `PerformanceMode.tsx`. Celle des deux qui finit en dernier lance PU-4 (`docs/spec-entree-musiciens.md`, § Tranches,
     PU-4, et § Avancement ; consigne type ci-dessous ; pas de suite complète ; enchaîne PU-5 puis PU-6) et raye cette ligne.
  2. ~~**Comptage T4**~~ lancé puis **fini** (`0c2a152f`, lot comptage fini ; `session_01UMdfuaPmCAo5WCMLAs8RDy`, 12/11 10 h 57 UTC, sur demande de Timothée :
     PU-1 attend la vérification de MP-3 et ne code pas ; PU-1 garde sa place et ne code que s'il y a moins de quatre
     chantiers qui codent) (`docs/spec-comptage-usage.md`, § Découpage, T4 ; go couvert par la règle des tranches) : écran
     `/back-office/usage`, derrière `BACK_OFFICE`, spec ajoutée à `SPECS_GRAND_ECRAN`, suite complète en fin de lot.
  3. ~~**AN (AN-3a → AN-2 → AN-3b → AN-4 → AN-5)**~~ **lot AN fini le 13/11** (AN-5, § Avancement de la spec) ; lancé (AN-3a, `session_01UMdfudQoHbTaZg6CygGazy`, 12/11 19 h 16 UTC, à la fin de PU-6 `4d2908c`, lot pupitre fini) : **go de Timothée (12/11, 16 h 15 UTC)** ; à lancer par la session qui finit PU-6 (12/11, après MP-5 `ddbaa13` : `spec-mode-louange-forscore-2.md` § AN, tranches AN-3a, AN-2, AN-3b, AN-4, AN-5 ; se code après PU-6, jamais pendant qu'une autre session modifie `PerformanceMode.tsx` ; une session par tranche, consigne type ci-dessous ; AN-Q1 : pas d'animation hors l'anneau d'appui long). **Harmonie H4** : go de Timothée, lancé (`session_01UMdfuaiAxiKUENyB4RqBb4`, 12/11 14 h 08 UTC,
     cinquième chantier) ; **H4 fini** le 12/11 (`4ebf04be`, H4-2 colonne) : place libre, rien dans la file n'a de go
     disponible (AN attend PU-6). **Harmonie H5 et suivants** : voir la ligne 4.
  4. **Harmonie H5 → H6 → H7 → H9 → ~~H8~~** (H8 lancé le 13/11 à 02 h 25 UTC par la session de MP-6, `session_01UMdfuZtYXtfbn3z7eCK8uN` ; il fait TC-3 à sa fin, puis écrit au pilote) : **go de Timothée pour toute la file (12/11, 16 h 55 UTC : « tout ce qui est
     dans la file donne-leur le go mais ils se lancent chacun leur tour »)**. Un lot Harmonie à la fois ; la session qui
     finit un lot lance le suivant et le raye ici. ~~H5 lancé (`session_01UMdfucJo6tgJLNfc6qtSps`, 12/11)~~ **H5 fini** (12/11, H5-2 « Ici » ; § Avancement de la spec). **17 h 07 UTC, Timothée (« Oui pour les 2 »)** : H9
     (`session_01UMdfubgkvSMaCBBvrLbfxY`, contenu seulement) et H6 (`session_01UMdfuZq2SzB3kmofctkeHc`) lancés en
     parallèle de H5 ; cinq chantiers en cours. Ni H5, ni H6, ni H9 ne lance de lot à sa fin. **H6 fini** (12/11, H6-2 : fiche ; § Avancement). **H9 fini** (12/11, T3 : 91 fiches, famille Mineur ; `docs/spec-harmonie-accords.md` § Avancement). **H8 fini** (13/11, H8-1 et TC-3 ; § Avancement). Restaient : ~~**H7**~~ **H7 fini** (12/11, H7-2 : lignes d'harmonie ; § Avancement ; lancé par `session_01UMdfudB2Z8QUHK8vtfS2xW`, 12/11 19 h 40 UTC), puis
     H8. H8 (mode louange) en
     dernier, et seulement quand AN et le pupitre ont fini dans `PerformanceMode.tsx`. `docs/spec-harmonie-accords.md`,
     tableau « Lots ». MP-6 : voir la ligne 5.
  5. ~~**Ma partition MP-6** (reprise de l'existant)~~ **MP-6 finie le 13/11 : lot MP fini** (§ Avancement de la spec ; un mois après la mise en ligne, retirer la lecture des anciennes annotations, `useAnnotationsPage`, `loadAnnotation`, bloc `annotations` de `firestore.rules`) ; lancé par la session d'AN-5 (`session_01UMdfuat3nkFJiMZp3inPLc`, 13/11 01 h 13 UTC ; elle lance H8 à sa fin) : **go de Timothée (12/11, 17 h 10 UTC)**, questions closes
     (`docs/spec-ma-partition.md`, § Questions ouvertes, « Réponses de Timothée », et § Tranches, MP-6). À lancer par la
     session qui finit **AN-5**, jamais pendant qu'une autre session modifie `PerformanceMode.tsx` ou les annotations.
  6. **Tous les chants en mode louange, lot TC (TC-1 → TC-2 → TC-3)** : **TC-1 lancée le 12/11 à 20 h 49 UTC (`session_01UMdfuZmdnz7GpDir59knoe`), en
     parallèle d'AN sur décision de Timothée (« Oui pour les 3 ») ; TC-2 suit ; TC-3 attend H8.** **TC-1 finie** (12/11, § Avancement de la spec) ; TC-2 lancée (`session_01UMdfudVWocXk16NNnNUmDD`, 12/11 21 h 57 UTC). **TC-2 finie** (12/11, § Avancement de la spec) ; **TC-3 faite le 13/11 par la session de H8 : lot TC fini**, c'est la session qui finit H8 qui la fait (point 7). Texte d'origine : **go de Timothée (12/11, soir : « Go »)**,
     questions toutes tranchées (`docs/spec-louange-tous-les-chants.md`, § Questions tranchées et § Tranches ; un seul
     bouton Setlist à deux onglets). À lancer par la session qui finit **la dernière de MP-6 et H8**, jamais pendant
     qu'une autre session modifie `PerformanceMode.tsx` ; une session par tranche, consigne type ci-dessous ; TC-3
     (raccord H8) après H8.
  7. **Fin de tout (nuit du 12 au 13/11)** : la session qui finit **H8** (huitième génération, elle ne peut rien lancer)
     fait elle-même **TC-3** en fin de tranche (le test du raccord H8 sur un chant ajouté, `docs/spec-louange-tous-les-chants.md`
     § Tranches ; Timothée, 12/11 : les sessions ne passent par le pilote que pour la suite complète), puis écrit au
     pilote. Le pilote lance, quand plus aucun chantier ne code, la
     **suite complète en quatre parts** (`--shard=k/4`, quatre sessions, résultats dans `docs/feuille-de-route.md`,
     aucune correction sans passer par le pilote). Rien ne part sur `main` : la mise en ligne reste à Timothée.
  8. **Accords touchables partout, 简谱 et mode louange (AL-1 → AL-2)** : `docs/spec-accords-louange.md` (13/11),
     **go de Timothée le 14/11** (les cinq réponses recommandées, § Avancement de la spec). AL-1 après la session des pastilles du rail
     (`JianpuSheet.tsx`) ; AL-2 après MT-3 (`PerformanceMode.tsx`). **14/11, 01 h 48 UTC : lot MT fini (MT-4, `576a98f2`) ; AL-1 faite (`da5ee45b`) ; AL-2 lancée (`session_01UMdfuanYPz84NtFxewuxaC`) et RU-5 lancée (`session_01UMdfuan5NXmHjZDeTwsySC`) en cohabitation dans `PerformanceMode.tsx`, par la session MT-4.**
  **13/11, 3 h 45 UTC : tous les chantiers de code sont finis** (AN, MP-6, H8, TC, H7 ; tête `8b8b7ff3`). **Suite
  complète lancée en quatre parts** (Sonnet, aucune correction) : `session_01UMdfudPsUH2e4yP7D7LCDY` (1/4),
  `session_01UMdfuZSZqGrTzmaRBGT5cV` (2/4), `session_01UMdfuZPpNqJhDNUHVxSo4G` (3/4), `session_01UMdfudbYvxf6yGMX1wGMc8`
  (4/4) ; bilans dans `docs/tests/suite-2026-11-13-part-K.md`. Les corrections attendent le bilan et Timothée.
  **13/11, 13 h UTC : suite complète finie** : 22 735 tests, 20 285 passés, 2 255 sautés, 101 instables, **94 échecs
  (31 tests distincts, 16 specs)** ; liste par page dans `docs/tests/suite-2026-11-13-synthese.md`. Aucune correction
  lancée : elles attendent le go de Timothée. La mise en ligne reste sa décision.
  **13/11, go de Timothée** (« Go pour toutes les corrections, lancent les en parallèle quand c'est possible ») :
  cinq chantiers de correction, un par zone (numéros de la synthèse) : **C1** scène (5) ; **C2** setlists (1, 3, 7) ;
  **C3** chant, sections, usage (2, 4, 6, 8, 12) ; **C4** mode louange (9) ; **C5** équipes et planning (10, 11).
  Chacun écrit sa ligne dans `docs/tests/suite-2026-11-13-synthese.md` (§ Corrections). Rien sur `main`.
  **13/11, 14 h 45 UTC : les cinq chantiers sont finis**, 0 point à décider : les 31 tests sont réglés (5 défauts du
  site corrigés en 7 fichiers et 15 lignes, les autres étaient des tests en retard sur le site) ; `tsc` propre sur la
  tête `bc80a242`. Chaque chantier a rejoué ses specs ; pas de rejeu commun sur la tête réunie. Reste à Timothée : la
  mise en ligne sur `main`, `firestore.rules`, la « fumée Safari ».
  **13/11, 16 h UTC, deux demandes de Timothée** : (1) cadrage sans code en cours (`session_01UMdfuaTSCuBBDtqAEmCc8H`) :
  简谱 sur deux volets, idées d'harmonie sur la 简谱, 简谱 d'office pour les musiciens dans les setlists, vue
  partitions en zigzag ; spec `docs/spec-jianpu-deux-volets.md`, attend son go. (2) **Son de piano** du bouton
  « Écouter » des fiches d'harmonie : go de Timothée (« oui pour ça », en réponse à « go pour le vrai piano ») :
  notes d'un vrai piano enregistré, libres de droits, à la place de l'onde triangle de `src/lib/audio/synthese.ts`.
  **13/11, 16 h 45 UTC** : son de piano fait (`ab1064b0`, à écouter par Timothée). Parcours à l'œil :
  `docs/parcours-oeil-2026-11-13.md` (v1, 13 constats ; v2 en cours). **Go de Timothée (« go pour les deux »)** :
  (a) corriger les constats 1 (menus du mode louange qui dépassent), 4 (cadres vides du choriste) et 5 (barre de la
  page chant au téléphone) ; (b) planche « réglages et tonalité au même endroit sur les trois écrans » (constats 2
  et 3), sans code avant son choix. Attendent encore son go : JV-1, JV-2, JV-5 (`docs/spec-jianpu-deux-volets.md`).
  **(b) Planche des réglages faite (13/11)** : `docs/spec-reglages-unifies.md` (lot RU, cinq tranches), planche
  https://claude.ai/artifact/A8JBDX9ktoBN6ToTKe4Hbk, piste B recommandée (armure au titre, marge « Affichage ») ;
  **Go de Timothée (13/11, « Ok go »)** sur les recommandations (B, tonalité pour moi, rôle sur les trois écrans) :
  RU-1 lancée par la session de la planche (`session_01UMdfuaDLszqyKqkCKMoaBn`, 13/11 17 h 18 UTC ; cinq tranches enchaînées) ; RU-1 faite (72d58836), RU-2 lancée (`session_01UMdfuZTZcJa2nUzXqXzDwf`, 17 h 56 UTC).
  **Métronome : go de Timothée pour la piste A (13/11, 17 h 55 UTC, « go pour A »), lot MT lancé (MT-1, `session_01UMdfuagsb1qMDHdUwRsSdf`, 13/11 17 h 54 UTC ; MT-2 après RU-2)** : cadrage sans code d'un **vrai métronome
  dans le mode louange** (« un métronome avec du son et un métronome plus visuel qu'un simple trait qui bouge, il
  faudrait pouvoir choisir si c'est binaire ternaire, les temps fort et tout, en gros tout comme une vrai application
  de métronome ») : seconde planche, refaite d'après les applications de métronome à la demande de Timothée
  (`docs/recherche-metronomes.md`, `docs/planches/planche-metronome-2.html`, artefact privé
  https://claude.ai/artifact/G1e9txeUQrtE8XW5i5yC83 ; piste A « un, deux, trois, quatre » recommandée : une pastille
  chiffrée par temps sous la barre, panneau complet avec accents à quatre niveaux, binaire / ternaire, trois sons,
  « S'entraîner ») et `docs/spec-metronome.md` (lot MT, quatre tranches, cinq questions avec recommandation).
  Décisions de Timothée (13/11) : « chacun un métronome, pas de son pendant le culte, un son quand ils veulent
  s'entrainer » : un métronome par appareil ; son coupé par défaut, allumé à la demande pour répéter.
  **État au 13/11, 22 h UTC (pilote)** : faits et poussés aujourd'hui : son de piano (`ab1064b0`), constats 1, 4, 5 du
  parcours, manifeste `scope: "/"` (`d336fdb5`, à essayer par Timothée sur l'iPad en réinstallant l'icône), aperçu de
  page suivante retiré (`6c607fe9`), TC-4 (menu Setlist en deux onglets), lot JV entier (JV-1 à JV-5c).
  **Go de Timothée (« Go », en réponse à « go pour les finitions »)** : finitions du lot JV : 9 échecs à 1 440 px
  (`jianpu-integration` 264, 661, 682 ; six tests Crayon d'`harmonie-jianpu`), trois défauts d'apparence laissés par
  JV-5c, `critique-design` sur les onze captures (§ Avancement de `docs/spec-jianpu-deux-volets.md`).
  **Finitions JV faites le 13/11** : les 9 échecs venaient de JV-3 (tests à revoir, site juste ; Crayon de nouveau
  testé sur les grands écrans), pastille et marges du mode louange retouchées ; huit choix de design de `critique-design`
  « à décider par Timothée » (§ Avancement de la spec, entrée « Finitions »).
  **Mode louange, idées d'harmonie en fenêtre** (ordre de Timothée, choix 6) : fait le 13/11 (`87fb92c`).
  **État au 13/11, 23 h 30 UTC (pilote)** : RU-4 faite (`81348e32`) ; **RU-5 attend** que `PerformanceMode.tsx` soit
  libre (lot MT et six points finis), consigne de RU-4 avec RU-5 à la place, à lancer par le pilote ou par la session
  qui libère le fichier. Six points du rail (go de Timothée) : session `session_01UMdfucWej4KmZA3Be594iz`. MT-2
  (`4787e9fb`, mise en fenêtre en cours) et MT-3 tournent. Trois chantiers de code.
  **Cinq corrections, go de Timothée le 14/11 (« go pour les cinq »)**, une seule session, à lancer par le pilote quand
  AL-2 (`session_01UMdfucpCAyFznSRiMfDdUc`) est poussée : (1) panneau d'accord qui ne s'ouvre pas sur un chant ZH en deux
  volets (`accords-toucher-agencement`, téléphone et 1 440, 一切歌颂赞美 ; chercher la cause d'abord) ; (2) titres des
  idées d'harmonie en français en 中文 (`harmonie-index.json` ; libellés à faire relire par Timothée) ; (3) en louange,
  la fenêtre des idées recouvre la pastille touchée ; (4) fenêtre de l'armure non ancrée au téléphone ; (5) blanc de
  pagination au téléphone marge ouverte : regarder d'abord, corriger si simple, sinon capture au pilote. Tests : un tour
  sur les specs touchées, puis les seuls échecs. Lot RU fini (`858e662c`), lot MT fini (`576a98f2`).
  - 14/11, **cinq corrections faites, sauf la 5** (session `session_01UMdfubw1RKp8bmWMeEjAVV`) : (1) **fait**
    (`9f4668c`), **défaut du site** : `useReglagesAffichage` ne lisait les réglages de l'appareil qu'après
    l'authentification ; en attendant, le scan 简谱 par défaut remplaçait les paroles environ 0,5 s, puis les paroles
    revenaient, avec de nouveaux accords touchables. Un toucher dans cet intervalle n'ouvrait rien. Lecture au montage
    (ordre et rôle attendent le compte). Il reste un remontage de quelques accords quand les lignes se recoupent après le
    chargement des polices : inhérent à la mise en ligne mesurée, non traité. Tests : 143/144, le rouge (« Voir tout le
    dictionnaire », sous charge) est vert seul, 3,4 min.
    (2) **fait** (`9a94bd4`, `7721662`) : table `docs/harmonie/fiches-zh.json` fusionnée au build (`nomZh`, `avantApresZh`),
    affichée dans les idées du chant, la ligne « 这里 », les cartes et le formulaire d'idées. Le catalogue et les fiches
    `/harmonie` restent en français (avis 中文 inchangé). Police refaite : 碍 壮 颈 倍. **À relire par Timothée** : les
    91 titres et les 79 « avant → après » du fichier, par exemple « 用 2m7 代替 4 », « 阻碍终止 », « 终止四六和弦 »,
    « 1 的持续低音 », « 经过减和弦 », « 以 b7 收尾（混合利底亚终止）», « 直接转调 », « 远关系调：共同音 », « 铺底延长的 1 »,
    « 尾句重复：再唱最后一句 », « 桥段的半拍感 ». Vocabulaire : degrés → 级数, devient → 改为, tenu → 延长. Tests : 252
    passés, 0 échec, 8,8 min.
    (3) **fait** (`e962ba1`) : au téléphone, une pastille ou un nom touché dans la moitié basse ouvre la fenêtre, qui se
    pose au-dessus ; dans la moitié haute, la feuille s'ouvre dessous. La tablette avait déjà la fenêtre (mesuré, aucun
    recouvrement). (4) **fait** (`48dcf45`) : la fenêtre de 320 px ne peut pas tomber sous l'armure au téléphone ; une
    flèche la rattache, ce qui vaut aussi sur la page chant et la vue Partitions. Tests 3 et 4 (`harmonie-jianpu`,
    `louange-harmonie`, `armure`, `louange-reglages`) : 213/214, le rouge (JV-5c fr, page refaite sous charge) est vert
    seul, 7,4 min ; puis un tour de rejeu après relecture, 29/30, le rouge (fr clair, ordinateur) est vert seul.
    (5) **non corrigé** : marge ouverte au téléphone, la zone de lecture fait ≈ 330 px, et une section plus haute que la
    place restante passe à la page suivante (Intro seule puis un grand blanc, 15 pages). Il faudrait couper les sections
    entre deux pages quand la zone est basse, comme la demi-page : ce n'est pas une retouche. Capture :
    `docs/captures/2026-11-14-louange-marge-ouverte-blanc-telephone.png` (`1283745`). Captures `regard` (29) : en 中文,
    titres traduits partout, aucun caractère manquant. Hors périmètre : la fenêtre des idées couvre la pastille *voisine* ;
    à 1 440 px elle couvre « Setlist » et « Repères » ; la bulle d'astuce des accords passe sous la fenêtre de la page
    chant. **Non vérifié** : le mode sombre de la page chant en 中文, et l'armure à l'œil sur la page chant.
  **Deux demandes de Timothée du 13/11 au soir** (ses mots), à cadrer : (1) « on a du mal à différencier l'ancienne
  progression et la nouvelle progression d'accord dans les idées d'harmonie » : il choisit « ancienne grisée » (ancienne
  progression en gris discret, nouvelle en bleu, petits mots « avant » / « après » au-dessus) ; retouche, **go à
  recevoir** ; (2) « Quand il y a le jianpu qui est affiché il faut aussi pouvoir cliquer et obtenir les idées
  d'harmonie » : il demande ce qui est le plus optimal. Proposition de la session : toucher un **accord imprimé du scan**
  (déjà touchable hors Crayon, `JianpuSheet.tsx` `rendreBoite`) mène aux idées de **sa section** (section retrouvée par
  `sections.json`, `passageDeSection`) : sur la page chant et la vue Partitions par la ligne « Ici » du panneau
  d'accord ; en mode louange (accords inertes), directement la fenêtre des idées de la section, réglage allumé. Petite
  spec à écrire, puis go.
  **Attendent Timothée** : publier `firestore.rules` (crayon et Apple Pencil absents sans cela : `crayonPret` faux
  après le 403 de `partitions/`, diagnostic de `session_01UMdfuZTdptjjrzmrPMcQPN`) ; « go pour le crayon grisé »
  (retouche de `useMesPartitions`) ; choix sur `docs/spec-reglages-unifies.md` (piste B recommandée) et sur
  `docs/spec-metronome.md` (piste A recommandée) ; les 17 autres constats de `docs/parcours-oeil-2026-11-13.md`, à
  lui présenter en liste après la planche des réglages ; écoute du piano ; mise en ligne ; « fumée Safari ».
  **Chaîne limitée à huit générations** (12/11, 19 h 50 UTC : AN-3a n'a pas pu lancer AN-2, « lineage depth 8 ») : une
  session dont `create_session` est refusé écrit au pilote la tranche à lancer et s'arrête ; le pilote (génération 2)
  la relance. AN-2 relancée ainsi (`session_01UMdfubupEWP4vQTjopBte9`) ; sa chaîne tient jusqu'à H8.
  Consigne de lancement (`create_session`) : `source_url` https://github.com/gcccfranco/GCC, `source_revision` et
  `outcome_branch` `claude/corrections-design`, modèle `claude-opus-5-5` ; une tranche, la section de spec à lire,
  agents nommés (`executant`, `testeur`, `relecteur` ; `regard` puis `critique-design` sur captures signalées si
  l'apparence change), tests de la tranche sur trois appareils, `npm ci` avant les tests, « lance toi-même la tranche
  suivante puis arrête-toi ; en fin de lot, sers la file », questions tranchées selon la spec, pilote
  (identifiant ci-dessus) seulement pour un choix difficile à défaire.
- **Demande de Timothée (12/11/2026, soir), à cadrer** : dans le mode louange, accès direct à **tous les chants** (comme
  aux setlists), et les **idées d'harmonie de chaque chant** intégrées dedans. La seconde moitié recoupe Harmonie H8
  (point en marge et bande, go donné). Change l'organisation d'un écran : planche, puis spec, puis go ; pas avant la
  fin d'AN, MP-6 et H8 (même fichier `PerformanceMode.tsx`). Go de Timothée le 12/11 au soir : file, ligne 6.
  Planche faite le 12/11/2026 (`docs/planches/planche-louange-tous-les-chants.html`, artefact privé
  https://claude.ai/artifact/TJjUgVoEPRcPPa8FEgpTQU) : A onglet « Tous les chants » dans le menu Setlist, le chant
  joué s'insère dans la suite ; B le titre de la barre devient un champ de recherche ; **C recommandée**, le chant
  ouvert hors setlist se pose par-dessus elle, avec un bandeau « ‹ Revenir à …, page N · Jouer ensuite ». Trois
  questions à Timothée (« Jouer ensuite » local, bandeau visible barre masquée, Échap à trois temps). Spec après ses réponses.
  **Choix de Timothée (12/11/2026, soir)** : piste **A** (« Cette setlist | Tous les chants » dans le menu Setlist),
  plus un **bouton à part « Tous les chants »** dans la barre du haut, à côté de Setlist, qui ouvre directement la
  liste ; et en tête de la liste un interrupteur **« Avec 简谱 / Sans »** qui ouvre les chants dans la version choisie
  (le bouton 简谱 des Options d'affichage reste pour changer en cours de route). Les questions propres à C tombent ;
  pour A, la spec proposera l'insertion locale à l'appareil (effacée à la fermeture) et un « Retirer ». Prochaine
  étape : la spec, puis le go ; codage après AN, MP-6 et H8 (`PerformanceMode.tsx`).
  **Spec écrite** (12/11/2026) : `docs/spec-louange-tous-les-chants.md`, lot TC en trois tranches (TC-1 liste, bouton
  et insertion ; TC-2 marques, retrait, retour, hors ligne ; TC-3 raccord H8) ; attend le go de Timothée.
- **Lot JV, 简谱 en deux volets** (demandes de Timothée du 13/11 : 简谱 sur deux volets, idées d'harmonie sur le
  scan, 简谱 d'office pour les musiciens dans les setlists ; plus, par le pilote, la lecture des deux colonnes d'un chant
  en paroles) : `docs/spec-jianpu-deux-volets.md`, planche `docs/planches/planche-jianpu-deux-volets.html` (artefact
  privé https://claude.ai/artifact/FJmdbWyBhbKPUwkQcUPUqA, piste B recommandée), tranches JV-1 à JV-5 ; JV-1 (简谱
  d'office) se code seule. Menu Setlist du mode louange en deux onglets : `docs/spec-louange-tous-les-chants.md` §
  « Reprise du 13/11 », planche https://claude.ai/artifact/DMDRVF8pAy4L4qKBXrDcEe, tranche TC-4. **Go de Timothée
  (13/11, « go pour les pistes des 2 artefacts »)** : JV-3 puis JV-4 (piste B) et TC-4 (piste A), lancés ; JV-4 après
  TC-4. Q3 tranchée par Timothée (13/11 : lecture en colonnes, JV-2, après JV-3). Q1 et Q2 tranchées par Timothée (13/11 : « oui ») : go de Timothée pour JV-1 et JV-2 (13/11, « oui ») : JV-1 lancée, JV-2 après JV-3 ; idées d'harmonie
  (toutes les propositions d'une section au toucher, reprise du 13/11) : Timothée choisit le volet Harmonie ouvert au toucher du nom de la section (13/11) ; **go pour JV-5a à JV-5c** :
  JV-2 lance JV-5a, JV-4 lance JV-5b puis JV-5c (spec, § Avancement). Aucune règle Firestore touchée.
  **Lot JV fini le 13/11** (JV-5c : étiquettes de section sur le scan 简谱, dans un rail à gauche, qui ouvrent le volet
  Harmonie ; plus la retouche de Timothée « toute la largeur en paysage » pour le mode louange en 2 colonnes). Specs du
  lot repassées, cinq projets : 0 échec propre au lot (3 rouges antérieurs de `jianpu-integration` à 1 440). Rien de la
  file n'a de go en attente : aucun chantier lancé à la suite. Rien sur `main`.
- **Lot FS** export FreeShow (`spec-export-freeshow.md`) : codé le 01/11/2026 sur `claude/export-freeshow`, **pas en
  ligne** ; exemple à essayer dans FreeShow (`docs/freeshow/011126.project`), seuils de découpe à régler ensuite.

## Ce qui reste ouvert

Mentions encore ouvertes à la dernière écriture de chaque section ; plusieurs datent d'avant la fusion de fin octobre
et **n'ont pas été reconfirmées** : vérifier dans le § Avancement de la spec avant d'agir. Les points « à la main »
(règles, scripts, 中文) sont **à faire confirmer par Timothée** : certains sont peut-être déjà faits.

- **Bug signalé par Timothée (12/11, nuit) : espace vide en haut de la page chant.** **Corrigé sur la branche** (go de Timothée « Corrige directement », 12/11), pas encore sur `main`.
  Reproduit sous Chromium (iPhone 13 et Pixel 7, défilement de 8 px par pas) : 72 px plus bas, 90 px CSS de blanc au-dessus du
  titre (≈ 270 px de l'iPhone), comme sur la capture. Présent sur `main` (沙漠中的骆驼) **et** sur `claude/corrections-design`,
  en 简谱 comme en Paroles, sur un chant FR aussi (`abba-pere`) : rien de propre à Safari ni au scan.
  Cause : la page réserve 158 px pour les deux barres fixes (`main` `pt-[var(--nav-h)]`, `src/app/layout.tsx:82`, + `mt-[48px]` et
  `py-6` de la partition, `SongDetailClient.tsx:676`), mais navbar et barre du chant se cachent dès 40 px de défilement
  (`HIDE_THRESHOLD`, `src/hooks/useScrollDirection.ts:3` ; seul `currentY < 10` les garde) : entre 40 et 158 px, la bande
  réservée est vide. Correction (un fichier, 4 lignes) : dans `useScrollDirection`, remplacer le seuil
  `10` par le bas de `.barre-chant` (`offsetTop + offsetHeight`, insensible au `transform`) quand elle existe, sinon 10 ; les trois
  appelants (Navbar, MobileTabBar, page chant) restent d'accord. Test : `tests/chant-defilement-haut.spec.ts` (FR + ZH, trois appareils, sauté
  en deux volets) : après 72 px doux, la barre est encore là ; en bas de page, cachée. Revers : une page qui défile de moins
  de ~160 px garde ses barres (rien à cacher). Tests : nouvelle spec + `barre-chant` + `barre-rappelee`, verts, ~3 min.

**À Timothée (à la main)**
- `firestore.rules` à publier, signalé pour : V19PARTAGE, V19EQUIPES + V19GROUPES (même séance, après la migration),
  V19FETES, Y (FR-A), Z (SC1 à SC3), AC (lot AO : règles « ancien ∪ nouveau »), AE (corrections de l'audit), AG (RS),
  AK (règle `{chemin=**}/fois/{date}`, après le rattrapage : ordre de LF5 dans l'archive, § 3.AK).
- Scripts à lancer, à blanc puis `--ecrire` : `scripts/acces-vers-organigramme.ts` (AC), script de reprise de AG.
- Avant fusion, listé le 26/10/2026 (AE) : révoquer le secret (L0), vérifier les comptes admin, `VERCEL_DEEP_CLONE=true`,
  puis l'essai BO5 par 2 ou 3 responsables.
- 中文 à relire : V19PARTAGE, V19PLANNING, V19EQUIPES, V19GROUPES, V19FETES, sous-équipes EDD, TB2, lot CD.
- À essayer ou valider en local : ⌘C / ⌘V sous Safari et Firefox et `tests/planning-clavier.spec.ts` sur le Mac
  (V19PLANNING) ; mode louange forScore ; X, Y, Z, AB (DA-1 à DA-3), AC, AD (TB2) ; 简谱 lot 3 : mesure iOS, suite
  complète.

**À trancher**
- **AB, Q14** : emplacement de la page `/accords` (ni bouton sur Chants ni entrée au menu en attendant) ; la refonte des
  accès du site est un chantier à part, non lancé.
- **AD** : `spec-coulisses.md` (CO1 à CO9, trois questions ouvertes) est **en pause**, aucun go.
- **简谱 lot 3** : trois défauts du calque gelé, antérieurs au lot ; questions ouvertes dans l'« Avancement » de
  `spec-jianpu-integration.md`.
- **AH** : quatre références bibliques gravées douteuses à vérifier (spec, « Avancement »).
- **AE** : questions de `audit-2026-10-24.md` (lots L0 à L9), suivies dans `spec-corrections-audit.md`.
- **Agents de `/audit-code`** : ils n'ont pas d'`agentType`, donc partent de 73 796 jetons au lieu de 16 000 à 17 000
  (mesuré le 11/11/2026) ; les déclarer par `tools:` épargnerait environ 3,4 M de jetons par audit (estimation,
  `orchestration.md` § 7). À faire avant le prochain audit, sur go.

**À construire**
- **U** : évènements sur le site en janvier 2027 (dernier lot de l'ordre du chantier U ; le Sheet « Calendrier des
  événements » fait foi jusqu'en décembre 2026).
- Lot 8, **A5** (captures du guide) : prévu « après validation du look ».
- Idée notée le 14/09/2026, sans spec : « modifié depuis ta dernière visite ».

## Index des demandes : lettre → spec → statut

Specs dans `docs/` ; « archive § 3.X » = `grep -n '^### X\.' docs/archive/feuille-de-route-2026.md`.

| Lettre | Sujet | Spec, lot | Statut |
| --- | --- | --- | --- |
| A | Structure « coup d'œil » | `spec-coup-d-oeil.md` (lot 3), `spec-export-pdf.md` (lot 5) | fait 09/2026 |
| B, D, E | Sainte cène, petit déj (Sheet), rappels regroupés | `spec-planning-petits-lots.md` (1a, 1b, 1c) | fait 09/2026 |
| C | Nouvelle année du Google Sheet | aucune (réponse à Christelle) | sans code |
| F, G, M | Évènements, évènements annuels | `spec-evenements.md` (lot 6), `spec-evenements-look.md` (6 bis) | fait 09/2026 |
| H | Tâches par pôle | `spec-taches.md` (lot 7) | fait 09/2026 ; pôles remplacés par les équipes (W) |
| I | PDF couleurs par section | `spec-export-pdf.md` (lot 5) | fait 09/2026 |
| J | Remarqué en route (index A–Z, lint) | — | fait ; capo conseillé écarté |
| K | Planning de la scène avant Noël | `spec-programme-scene.md` (3 bis) | fait 09/2026 ; suite : V |
| L | Version perso d'un chant | `spec-version-perso.md` (3 ter) | fait 09/2026 |
| N | Lots 5, 7, 8 | `spec-export-pdf.md`, `spec-taches.md`, `spec-nouveaux-membres.md` | fait 09/2026 ; A5 restant |
| O | Avant / après dans l'historique | `spec-historique-avant-apres.md` | fait 09/2026 |
| P | Harmonie | `spec-harmonie.md` (lot 9) | fait 09/2026 |
| Q | Lots 10 à 17 (Christelle, 17–18/09) | `spec-suppression-groupee.md`, `spec-inscription-externe.md`, `spec-programme-bascule.md`, `spec-taches-annuelles.md`, `spec-taches-evenements.md`, `spec-petit-dej.md` (15 → U3), `spec-organigramme.md`, `spec-planning-grille.md` | fait 09/2026 |
| R | Audit, lot cohérence, look, mise en ligne | `spec-look.md`, `spec-mise-en-ligne.md` (lot 18) | en ligne 20/09/2026 |
| S | Retours iPhone du 27/09 | `spec-look.md` (V8) | point 1 fait 27/09 ; suite : archive § 3.S |
| T | Fusions et Dp, cours d'Harmonie, sons | `spec-fusions-dp.md`, `spec-cours-harmonie.md`, `spec-sons-rd2000.md` | codé 01–02/10 ; archive § 3.T |
| U | Back-Office, grands écrans, petit déj | tableau U1 à U8 de l'archive § 3.U (`spec-back-office.md`, `spec-navigation-grand-ecran.md`, `spec-petit-dej.md`, `spec-calendrier.md`, `spec-statistiques.md`…) | codé 05–06/10 ; évènements 2027 à venir |
| V | Agencement v18, scène Pâques · Noël | `spec-agencement-v18.md`, `spec-retouches-v18.md`, `spec-scene-paques-noel.md` | codé 06–08/10 |
| W | Équipes et groupes (v19) | `chantier-equipes-groupes/` ; `spec-equipes-sans-poles.md`, `spec-organigrammes-groupes.md`, `spec-planning-gestes.md`, `spec-chants-fetes.md`, `spec-partage-setlist.md` | codé 12–18/10 ; règles et 中文 ci-dessus |
| X | Barre de la page d'un chant | `spec-barre-chant.md` (T1 à T3) | codé 18/10, à valider |
| Y | Fermer les réservations d'une fête | `spec-fermer-reservations.md` (FR-A) | codé 18/10, à valider |
| Z | Setlist au créateur, corbeille, absences | `spec-createur-corbeille-absences.md` (SC1 à SC3) | codé 18/10, à valider |
| AA | Accès bêta au Back-Office | `spec-acces-beta.md` | abandonné 19/10/2026 |
| AB | Idées regroupées, dictionnaire d'accords | `spec-idees-regroupees.md`, `spec-dictionnaire-accords.md` (DA-1 à DA-4) | DA-4 en ligne 02/11 ; Q14 ouverte |
| AC | Accès par l'organigramme | `spec-acces-organigramme.md` (AO-A à AO-F) | codé 22–23/10 ; droits revus par AG |
| AD | Rôle du Back-Office | `spec-tableau-de-bord-v2.md` (TB2), `spec-coulisses.md` | TB2 codé 24/10 ; coulisses en pause |
| AE | Audit « à rude épreuve », orchestration | `audit-2026-10-24.md`, `orchestration.md`, `spec-corrections-audit.md`, `spec-back-office-piste-a.md` (BO-A à BO-H) | piste A codée 25–26/10 |
| AF | Visite de première connexion par rôle | `spec-visite-par-role.md` | rangé dans « Écarté » (archive § 5) |
| AG | Responsabilités (droits simplifiés) | `spec-responsabilites.md` (RS-A à RS-C) | go 29/10 ; règles et script à passer |
| AH | 简谱 en-tête, statistiques pour tous | `spec-jianpu-entete-statistiques.md` (JE, ST) | fait 30–31/10 |
| AI | Statistiques par personne et groupe | `spec-stats-personnes-groupes.md` (SP) | fait 31/10 |
| AJ | Rappel de structure du mode louange | `spec-rappel-structure-louange.md` | en ligne 31/10 |
| AK | Lectures Firestore | `spec-lectures-firestore.md` (LF1 à LF5) | codé 31/10 ; ordre de LF5 : archive |
| AL | Vidéo de bienvenue | `spec-video-bienvenue.md` (VB, VB-E) | en ligne 02/11 |
| AM | Espace Musiciens, scène des fêtes | `spec-espace-musiciens.md` (EM, SF) | en ligne 02/11 |
| AN | Pastilles « Int » et « Inst » | `spec-abreviation-interlude.md` (AB-I) | en ligne 07/11 |
| AO | Mode louange façon forScore, apparence comprise | `spec-mode-louange-forscore-2.md` | vagues 1 et 2 et CA (11/11) codés, pas en ligne ; FS-F en cours (go du 11/11) ; vague 3 : JP-C et JP-D faites (12/11) ; AN fini le 13/11 (AN-3a à AN-5) ; reste une relecture complète avant mise en ligne |
| AP | Le site devient le pupitre : « Ma partition » qui suit le chant, entrée des musiciens, écrans pratiques, Harmonie qui s'entend, accords en chiffres | `spec-pupitre-musicien.md` | cadrage du 11/11/2026 ; rapport d'usage rendu (`audit-usage-2026-11-11.md` : 149 constats, six lots proposés, révision incomplète) ; « go » de Timothée sur les cinq recommandations : lot 1 (retouches) : go, T1 à T3 codées sur la branche ; deux exemples : piste A et onze décisions (« Ok » de Timothée), spec à écrire (`spec-exemples-usage.md`) ; planches publiées, réponses attendues : « Ma partition », Harmonie et Accords ; comptage d'usage : go pour T1 ; planche du pupitre à lancer après « Ma partition » |
| CL | Corrections du mode louange du 14/11 : page du scan 简谱 entière (deux volets et demi-lignes retirés), un trait = un tracé, « Chiffres » en louange et sur le calque, accord touché selon « Idées d'harmonie » | `spec-corrections-louange.md` (CL-1 à CL-4) | go de Timothée le 14/11/2026 ; CL-1 et CL-2 lancées, CL-3 et CL-4 ensuite |

**Chantiers sans lettre** (journal, archive § 6) : 简谱 par défaut puis piste A partout (`spec-jianpu-integration.md`,
lot 1 en ligne, lot 3 codé 12–18/10) ; relevé des écarts et corrections (`spec-corrections-apres-releve.md`, 08–11/10) ;
mode louange forScore (`spec-mode-louange-forscore.md`, mode unique depuis le 27/10) ; sous-équipes de l'EDD
(`spec-edd-sous-equipes.md`, 27/10) ; export FreeShow (`spec-export-freeshow.md`, FS) ; audit du design
(`audit-design-2026-11-02.md`) et lot CD (`spec-corrections-design.md`) ; équipe design et `/planche` (`orchestration.md` § 4).

**Écarté** (raisons : archive § 5) : liste admin des noms sans compte (existe déjà), capo conseillé (17/09/2026), QR code
du site et autocomplétion d'adresse (18/09/2026), AA, AF.
