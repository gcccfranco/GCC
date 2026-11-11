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

- Une demande nouvelle reçoit la lettre suivante (**AP**) : **une ligne** dans l'index ci-dessous, le détail (mots de la
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
- **AO, mode louange façon forScore** (`spec-mode-louange-forscore-2.md`, branche `claude/tender-johnson-99hadm`, pas
  fusionnée ici) : vagues 1 et 2 codées ; **CA codé le 11/11/2026** sur `claude/friendly-cerf-cy7hio` (couleur des
  accords par compte, réglage dans les trois menus). **Pour reprendre** : lire « Avancement » de la spec, puis FS-F (go
  du 11/11/2026, à lancer dans une session neuve), la vague 3 (JP-C, JP-D, AN) sur nouveau go ; avant toute
  mise en ligne, relecture complète de la vague 2, passe sur le guide, 中文 nouveaux à relire, prévenir l'équipe, essai
  sur iPad. Détail : archive, `grep -n '^### AO\.'`.
  **À la fusion de cette branche** (Timothée, 10/11/2026) : conflit attendu sur `docs/feuille-de-route.md` et une ligne de
  `CLAUDE.md` ; ce fichier court gagne (sa section AO est déjà dans l'archive, à compléter de ce qui a été écrit
  depuis), et la ligne « PWA » modifiée là-bas se reporte dans `docs/reference-technique.md`.
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
| AO | Mode louange façon forScore, apparence comprise | `spec-mode-louange-forscore-2.md` | vagues 1 et 2 codées sur `claude/tender-johnson-99hadm`, CA codé le 11/11 sur `claude/friendly-cerf-cy7hio`, pas en ligne ; restent FS-F (go du 11/11), vague 3, relecture complète |

**Chantiers sans lettre** (journal, archive § 6) : 简谱 par défaut puis piste A partout (`spec-jianpu-integration.md`,
lot 1 en ligne, lot 3 codé 12–18/10) ; relevé des écarts et corrections (`spec-corrections-apres-releve.md`, 08–11/10) ;
mode louange forScore (`spec-mode-louange-forscore.md`, mode unique depuis le 27/10) ; sous-équipes de l'EDD
(`spec-edd-sous-equipes.md`, 27/10) ; export FreeShow (`spec-export-freeshow.md`, FS) ; audit du design
(`audit-design-2026-11-02.md`) et lot CD (`spec-corrections-design.md`) ; équipe design et `/planche` (`orchestration.md` § 4).

**Écarté** (raisons : archive § 5) : liste admin des noms sans compte (existe déjà), capo conseillé (17/09/2026), QR code
du site et autocomplétion d'adresse (18/09/2026), AA, AF.
