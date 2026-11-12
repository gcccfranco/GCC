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
  3. **AN (AN-3a → AN-2 → AN-3b → AN-4 → AN-5)** : **go de Timothée (12/11, 16 h 15 UTC)** ; à lancer par la session qui finit PU-6 (12/11, après MP-5 `ddbaa13` : `spec-mode-louange-forscore-2.md` § AN, tranches AN-3a, AN-2, AN-3b, AN-4, AN-5 ; se code après PU-6, jamais pendant qu'une autre session modifie `PerformanceMode.tsx` ; une session par tranche, consigne type ci-dessous ; AN-Q1 : pas d'animation hors l'anneau d'appui long). **Harmonie H4** : go de Timothée, lancé (`session_01UMdfuaiAxiKUENyB4RqBb4`, 12/11 14 h 08 UTC,
     cinquième chantier) ; **H4 fini** le 12/11 (`4ebf04be`, H4-2 colonne) : place libre, rien dans la file n'a de go
     disponible (AN attend PU-6). **Harmonie H5 et suivants** : voir la ligne 4.
  4. **Harmonie H5 → H6 → H7 → H9 → H8** : **go de Timothée pour toute la file (12/11, 16 h 55 UTC : « tout ce qui est
     dans la file donne-leur le go mais ils se lancent chacun leur tour »)**. Un lot Harmonie à la fois ; la session qui
     finit un lot lance le suivant et le raye ici. H5 lancé (`session_01UMdfucJo6tgJLNfc6qtSps`, 12/11). **17 h 07 UTC, Timothée (« Oui pour les 2 »)** : H9
     (`session_01UMdfubgkvSMaCBBvrLbfxY`, contenu seulement) et H6 (`session_01UMdfuZq2SzB3kmofctkeHc`) lancés en
     parallèle de H5 ; cinq chantiers en cours. Ni H5, ni H6, ni H9 ne lance de lot à sa fin. **H6 fini** (12/11, H6-2 : fiche ; § Avancement). **H9 fini** (12/11, T3 : 91 fiches, famille Mineur ; `docs/spec-harmonie-accords.md` § Avancement). Restent : **H7** (touche
     l'affichage des partitions : à lancer par la session qui finit les exemples d'usage T7, s'il y a une place), puis
     H8. H8 (mode louange) en
     dernier, et seulement quand AN et le pupitre ont fini dans `PerformanceMode.tsx`. `docs/spec-harmonie-accords.md`,
     tableau « Lots ». MP-6 : voir la ligne 5.
  5. **Ma partition MP-6** (reprise de l'existant) : **go de Timothée (12/11, 17 h 10 UTC)**, questions closes
     (`docs/spec-ma-partition.md`, § Questions ouvertes, « Réponses de Timothée », et § Tranches, MP-6). À lancer par la
     session qui finit **AN-5**, jamais pendant qu'une autre session modifie `PerformanceMode.tsx` ou les annotations.
  Consigne de lancement (`create_session`) : `source_url` https://github.com/gcccfranco/GCC, `source_revision` et
  `outcome_branch` `claude/corrections-design`, modèle `claude-opus-5-5` ; une tranche, la section de spec à lire,
  agents nommés (`executant`, `testeur`, `relecteur` ; `regard` puis `critique-design` sur captures signalées si
  l'apparence change), tests de la tranche sur trois appareils, `npm ci` avant les tests, « lance toi-même la tranche
  suivante puis arrête-toi ; en fin de lot, sers la file », questions tranchées selon la spec, pilote
  (identifiant ci-dessus) seulement pour un choix difficile à défaire.
- **Lot FS** export FreeShow (`spec-export-freeshow.md`) : codé le 01/11/2026 sur `claude/export-freeshow`, **pas en
  ligne** ; exemple à essayer dans FreeShow (`docs/freeshow/011126.project`), seuils de découpe à régler ensuite.

## Ce qui reste ouvert

Mentions encore ouvertes à la dernière écriture de chaque section ; plusieurs datent d'avant la fusion de fin octobre
et **n'ont pas été reconfirmées** : vérifier dans le § Avancement de la spec avant d'agir. Les points « à la main »
(règles, scripts, 中文) sont **à faire confirmer par Timothée** : certains sont peut-être déjà faits.

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
| AO | Mode louange façon forScore, apparence comprise | `spec-mode-louange-forscore-2.md` | vagues 1 et 2 et CA (11/11) codés, pas en ligne ; FS-F en cours (go du 11/11) ; vague 3 : JP-C et JP-D faites (12/11) ; reste **AN, après MP-5 de « Ma partition »** (AP, décision du 12/11), puis une relecture complète avant mise en ligne |
| AP | Le site devient le pupitre : « Ma partition » qui suit le chant, entrée des musiciens, écrans pratiques, Harmonie qui s'entend, accords en chiffres | `spec-pupitre-musicien.md` | cadrage du 11/11/2026 ; rapport d'usage rendu (`audit-usage-2026-11-11.md` : 149 constats, six lots proposés, révision incomplète) ; « go » de Timothée sur les cinq recommandations : lot 1 (retouches) : go, T1 à T3 codées sur la branche ; deux exemples : piste A et onze décisions (« Ok » de Timothée), spec à écrire (`spec-exemples-usage.md`) ; planches publiées, réponses attendues : « Ma partition », Harmonie et Accords ; comptage d'usage : go pour T1 ; planche du pupitre à lancer après « Ma partition » |

**Chantiers sans lettre** (journal, archive § 6) : 简谱 par défaut puis piste A partout (`spec-jianpu-integration.md`,
lot 1 en ligne, lot 3 codé 12–18/10) ; relevé des écarts et corrections (`spec-corrections-apres-releve.md`, 08–11/10) ;
mode louange forScore (`spec-mode-louange-forscore.md`, mode unique depuis le 27/10) ; sous-équipes de l'EDD
(`spec-edd-sous-equipes.md`, 27/10) ; export FreeShow (`spec-export-freeshow.md`, FS) ; audit du design
(`audit-design-2026-11-02.md`) et lot CD (`spec-corrections-design.md`) ; équipe design et `/planche` (`orchestration.md` § 4).

**Écarté** (raisons : archive § 5) : liste admin des noms sans compte (existe déjà), capo conseillé (17/09/2026), QR code
du site et autocomplétion d'adresse (18/09/2026), AA, AF.
