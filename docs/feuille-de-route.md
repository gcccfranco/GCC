# Feuille de route — GCC Louange → « GCC »

**Statut** : brainstorming du 14/09/2026 (conversation Timothée ↔ Christelle
le matin, puis entretien Timothée ↔ Claude en 8 tours le soir). Tout est
tranché ; **go donné le 14/09/2026 (soir)** pour les lots dans l'ordre : lots
1a, 1c, 2 et 3 codés (§ 1), **à valider en local par Timothée**, non commités.
Lot 1b en attente du fichier de Christelle ; lot 4 (look) = prochaine étape,
direction visuelle à choisir avec Timothée. **Nouvelle demande du 14/09/2026
(18:37)** : planning de la scène avant Noël (§ 3.K), lot **3 bis** placé avant
le look à cause de l'échéance ; sept paris acceptés le 14/09/2026, détails à l'entretien. La vision produit reste `intent/vision-site.md`
(décisions datées) ; ce document dit **quoi, quand, où**, et garde
l'historique.

**Mode de travail (Timothée, 14/09/2026)** : chaque lot démarre sur un « go »
explicite ; Timothée **teste en local** avant de laisser continuer ; la
réussite d'un lot = sa validation. Contraintes : le dimanche ne casse jamais,
coût nul (Vercel Hobby, un seul cron libre). La phrase « tu peux le coder » du 14/09/2026 avait été prise à tort pour un
feu vert (tranche S1 du lot 3, § 6) ; le go explicite est venu le soir même
(« commence à faire les modifications qu'il faut dans l'ordre qu'on a
décidé »), S1 est conservée.

**Cap (Timothée, 14/09/2026)** : « la nature de l'app va changer : ça va
regrouper tout ce qui est en lien avec notre église, tout sur l'app. » L'app
s'appelle **« GCC »**, organisée par sections (Louange, Planning,
Évènements…) ; le label contextuel de la navbar garde son rôle. **Toute
l'assemblée a un compte** (les équipes et pôles ont des rôles en plus) ;
**sans compte** on voit les chants et le calendrier de l'église, rien de
nominatif.

## Comment ce document évolue

- Une demande entre en partie 3 avec la date, les mots de la personne, ce que
  le code montre, et ce qui a été tranché.
- Chaque décision est aussi reportée dans `intent/vision-site.md`.
- Un lot passe de la partie 2 à la partie 1 quand il est livré, avec le commit.
- Ce qui est refusé reste en partie 5 (« Écarté »), avec la raison.

## 1. Fait (branche `ui/apple-design`)

| Quand | Quoi | Où | Commit |
| --- | --- | --- | --- |
| 13/09/2026 | Bugs gênants de l'audit : menu mobile, index A–Z, 中文, libellés de section | navbar, liste des chants, signalement | `b395745` |
| 13/09/2026 | Chantier 1 **Régie** : copie propre des paroles, sommaire latéral, lien de présentation (`spec-regie.md`) | vue partitions de la setlist, `/api/setlist/presentation` | `5397908` |
| 13/09/2026 | Chantier 2 **Mode louange** : nuancier, vue structure batteurs, choix du rôle, reprise des réglages, tonalité choisie, police Atkinson / Source Han Medium / Andika (`spec-mode-louange.md`) | `PerformanceMode.tsx`, `SongView.tsx`, `public/fonts/` | `5397908` |
| 14/09/2026 | Suite Playwright sur trois appareils (ordinateur, téléphone, tablette) | `playwright.config.ts`, `tests/` | `6c30235` |
| 14/09/2026 | Chantier 3 **Planning** : Interfranco / Intergroupe remplacent Groupes le dimanche (`spec-planning.md`) | `/planning` (accueil) | `6ab3aca` |
| 14/09/2026 | Chantier 4 **Setlist** : page unique, historique, tonalité recommandée (15 chants) (`spec-setlist.md`) | `SetlistForm.tsx`, `setlists/{id}/history`, `.cho` | commité le 15/09/2026 ; `firestore.rules` à publier dans la console |
| 14/09/2026 | **Lint réparé** : `.claude/**` et `graphify-out/**` ignorés, objet de règles limité aux `.{js,jsx,mjs,ts,tsx,mts,cts}` (`npm run lint` : 0 erreur, 50 avertissements préexistants en « warn ») | `eslint.config.mjs` | commité le 15/09/2026 |
| 15/09/2026 | Lot 6 **Évènements** : calendrier public, fiches, inscriptions avec invités et sans compte, fusion des annonces (migration par bouton), cloche, QR code, rappel de la veille (`spec-evenements.md`) | section `/evenements`, `api/evenements/*`, `notify-evenement`, `admin/migrer-annonces`, cron, `Navbar`, `access.ts` + `firestore.rules`, admin | commité le 15/09/2026 ; à valider ; `firestore.rules` à publier ; migration à lancer |
| 14–15/09/2026 | Lot 3 bis **Programmes de scène, onglet « Noël »** : rôle « événement », onglets par programme, entraînements du dimanche, ordre de passage, conflit, rappels (`spec-programme-scene.md`) | section `/evenements` (layout, `SceneClient`, `EvenementsTabs`), `SectionTabs`, `Navbar`, `access.ts` + `firestore.rules`, `api/scene/conflit`, `cron/reminders`, admin | commité le 15/09/2026 ; à valider ; `firestore.rules` à publier ; pôle à donner à Alice ; programme « Noël » à créer |
| 14/09/2026 | Lot 1a **Sainte cène** : index 11 lu, service dans Ce dimanche / onglet Culte / Mes services / rappels, visible si rempli (`spec-planning-petits-lots.md`) | `sheets.ts`, `names.ts`, `planning/page.tsx`, `planning/culte` | commité le 15/09/2026 ; à valider |
| 14/09/2026 | Lot 1c **Rappels regroupés** : une notification par personne et par échéance, services + rôles, FR / 中文 (langue dans `notifPrefs/{uid}.lang`), répétition Campus fondue, une entrée de cloche par destinataire | `reminderMessage.ts`, `cron/reminders`, `notifPrefs.ts`, `recipients.ts`, navbar | commité le 15/09/2026 ; à valider (cron en ligne) |
| 14/09/2026 | Lot 2 **Notification au président** : lien posé ou remplacé → push + cloche « Présentation prête » aux comptes au nom du président (sauf l'auteur), préférence « Setlist prête », anti-doublon par lien ; la régie voit « Président prévenu. » ou « aucun compte relié » (`spec-notif-president.md`) | `/api/setlist/presentation`, `presentationLink.ts`, `PresentationLink.tsx`, cloche | commité le 15/09/2026 ; à valider |
| 15/09/2026 | Lot 4 **Nouveau look** T0–T6 : direction A « Réglages », vignettes teintées, rouge du logo sur les boutons pleins, police du système, navigation par sections (barre du bas Louange · Planning · Évènements · Moi, page « Moi », menu compte), grand titre, index A–Z en lettre agrandie (`spec-look.md`, « Avancement ») | tout le site : `globals.css`, `tailwind.config.ts`, `layout.tsx`, `Navbar`, `MobileTabBar`, `SectionTabs`, `PageTitle`, `Group`, `Tile`, `/moi`, listes, pages secondaires | commité le 16/09/2026 (`de882b7`) ; à valider en local |
| 16/09/2026 | **Bug : le serveur local affichait l'ancien code.** Le service worker servait `/_next/static/*` en cache-first ; en production ces fichiers sont hashés, en développement non — la page arrivait à jour et le JavaScript venait du cache (barre du bas et look figés malgré les modifications). Corrigé : rien n'est mis en cache sur un serveur local, cache purgé à l'activation, `gcc-louange-v3` | `public/sw.js`, `tests/service-worker.spec.ts` (nouveau), `CLAUDE.md` | commité le 16/09/2026 (`de882b7`) |
| 16/09/2026 | Lot 4 **retour tactile** : Timothée trouve l'usage moins bon sur téléphone et tablette ; audit avant/après (la seule régression : les setlists injoignables, Mes services à deux taps) → barre du bas **Chants · Setlists · Planning · Évènements · Moi** (Q9 révisée dans `spec-look.md`), pilules de section à 40 px, commandes du chant à 36 px, catégorie et présidence sur la ligne de setlist ; **QR code retiré de l'onglet Évènements** (gardé sur la fiche d'un évènement pour l'organisateur) ; sélecteur de tonalité du chant réduit à la tonalité quand il est fermé sur tactile (six commandes ne tenaient plus à 390 px) | `MobileTabBar`, `SectionTabs`, `SongDetailClient`, `SetlistCard`, `CalendrierClient`, tests `look-navigation`, `look-louange` et `evenements` | commité le 16/09/2026 (`de882b7`) ; à valider en local |
| 16/09/2026 | Lot 5 **Export PDF** P1–P3 : fenêtre « Quel PDF ? » (dernier choix par appareil), nuancier gris dans tous les PDF, couleurs par section comme l'écran (cadre fin, accords noirs), compact de la setlist (bandeau + sections uniques, un chant par page, bandeau au-dessus des scans, transition en bas de page) (`spec-export-pdf.md`, « Avancement ») | `PdfChoiceSheet`, `pdfStylePref`, `lib/pdf/colors` et `compact`, `StructureStripPDF`, `SongPDF`, `SetlistFullPDF`, pages chant et setlist | commité le 16/09/2026 ; à valider en local |
| 14/09/2026 | Lot 3 **Coup d'œil** S1–S3 : bandeau abrégé + nuances, menu « Affichage » (ordre joué / sections uniques / structure seule, par appareil, batteur → structure), sommaire par occurrence, « Dernière phrase » dans l'éditeur (section du chant adapté, badge masqué, historique) (`spec-coup-d-oeil.md`) | `SongView.tsx`, `PartitionView.tsx`, `SetlistOutline.tsx`, `SetlistFormRows.tsx`, `LastPhraseSheet.tsx`, `lastPhrase.ts`, `uniqueSections.ts`, `partitionLayoutPref.ts` | commité le 15/09/2026 ; à valider, résultat à montrer à Christelle |

## 2. À construire, dans l'ordre validé le 14/09/2026

Chaque lot : spec courte soumise à Timothée, test écrit d'abord, captures
regardées sur les trois appareils (1 chant FR + 1 chant ZH quand un chant
s'affiche), un commit par lot, sur demande.

| # | Lot | Contenu tranché | Où | Taille |
| --- | --- | --- | --- | --- |
| 1 | **Planning, petits lots** (demandés pour T4) — **1a et 1c codés le 14/09/2026 ; 1b en attente du Sheet de Christelle** | (a) colonne **Sainte cène** : index 11 de `Franco_Louange`, service à part entière (Ce dimanche, onglet Culte, Mes services, rappels), visible seulement si remplie ; (b) **petit déj** : nouveau Google Sheet à part (fichier et colonnes à recevoir de Christelle), ligne dans Ce dimanche + Mes services + rappels, pas d'onglet ; (c) **rappels regroupés** : une seule notification par personne et par échéance (J-7, J-3, J-1) qui liste ses services avec le rôle, « Dimanche 20 septembre : Culte Franco (Piano) · Petit déj », FR et 中文 (langue à mémoriser côté serveur, voir § 7) ; ~~(d) liste admin des noms sans compte~~ : **existe déjà** (« Planning sans compte » dans l'administration), écarté | `sheets.ts`, `names.ts`, `planning/page.tsx`, `planning/culte`, `cron/reminders`, `notifPrefs` | 3 lots S |
| 2 | **Notification au président** — **codé le 14/09/2026** | Décidée le 14/09 (matin) : automatique quand le lien de présentation est posé ou remplacé ; retrait = rien ; sans compte relié = rien, la régie le voit | `/api/setlist/presentation`, `push/send` | S |
| 3 | **Structure « coup d'œil »** — **S1 à S3 codées le 14/09/2026 sur go** | **Bandeau** en tête de chaque chant de la vue partitions, **à la place de la ligne « ORDRE » actuelle** : structure abrégée (I, C1, C2…, Pr, R, P, Inst, F, Pm, Dp, « ×2 »), **nuance sous chaque étape**, notes et transitions ; **sections uniques** en dessous (chaque section une fois), réglage par appareil **activé par défaut** ; **batteurs** = bandeau seul, sans paroles ni accords ; **Dp** = étape « Dernière phrase » dans l'éditeur (section source + N dernières lignes, aperçu), **matérialisée comme une vraie section du chant adapté** (`contentOverride` + `sectionOrigins`, mécanisme du mode Adapter ; badge « Version modifiée » masqué quand seul un Dp a été ajouté — tranché le 14/09/2026) ; **menu d'affichage** de la vue partitions à trois positions « Ordre joué / Sections uniques / Structure seule », mémorisé par appareil, défaut « Sections uniques », « Structure seule » présélectionné si le rôle mémorisé du mode louange est Batteur ; **table d'abréviations** : I · C1 C2… · Pr · R · Po · P · Pm · F · Tag · Dp · ×2, sections « autre » = nom écrit ; **Pm** = pont musical (instrumental) ; abréviations françaises partout, même en 中文 ; **mode louange inchangé** (ordre joué, le Dp y apparaît comme une section). Règles des sections uniques et du bandeau : § 7. **Codé directement, résultat montré à Christelle par Timothée** | `PartitionView.tsx`, `SongView.tsx`, `JianpuStructureStrip.tsx`, `SetlistFormRows.tsx`, `formItems.ts`, `editSource.ts`, `ListView.tsx`, `SetlistOutline.tsx`, `sectionSteps.ts`, `history.ts` | M |
| 3 bis | **Planning de la scène avant Noël** (Christelle et Alice, 14/09/2026 à 18:37) — **position tranchée le 14/09/2026** : avant le look, parce que la scène se réserve dès novembre | Nouvel onglet **« Scène »** du planning, **rempli dans l'app** (pas de Google Sheet : « c'est plus simple directement sur GCCLouange ») — premier planning saisi dans l'app ; modèle visuel = onglet Campus, **deux volets** : (1) **Entraînements** : créneaux sur scène par jour (date, heure de début et de fin, groupe — entraînement franco, louange 25, chants EDD, spectacle… —, responsable, note), posés par tout membre connecté, modifiables par leur auteur et les admins, un créneau pris reste visible de tous avec son groupe ; (2) **Passage le jour J** : ordre de passage du jour de Noël (numéro, groupe, titre ou chant, durée, responsable), tenu par Alice (coordination) et les admins. Réservé aux connectés (nominatif). Sans rappel push dans un premier temps. Paris détaillés en § 3.K | nouvel onglet `src/app/planning/scene/` (déclaré dans `src/components/planning/PlanningTabs.tsx`), nouvelle collection Firestore + `firestore.rules` + `access.ts` (en double), `serviceColors.ts` (couleur d'onglet, fichier gelé : à valider) | M |
| 3 bis | **Programmes de scène, onglet « Noël »** — **codé dans la nuit du 14 au 15/09/2026**, refait en onglet unique le 15/09 (`spec-programme-scene.md`), 27 tests × 3 appareils, non commité, à valider ; vit dans la nouvelle **section « Évènements »** (tranché le 15/09/2026) | Un onglet par programme (nom, jour J 24/12/2026, réservations d'octobre au 20/12), affiché ou masqué par la coordination (rôle « événement » = Alice, + admins) ; volet **Entraînements** = dimanches (« Scène libre » si vide), créneaux 17:00–18:00 par défaut, Quoi / Qui en dur, refus des chevauchements + alerte des deux auteurs si un conflit passe ; volet **« Programme Noël »** = ordre de passage numéroté, à la main ; rappels fondus dans ceux du lot 1c ; après le 20/12 le programme seul | `planning/programme/[id]`, `planning/programmes`, `PlanningTabs`, `access.ts` + `firestore.rules`, `api/scene/conflit`, cron `reminders`, admin (pôle) | M |
| 3 ter | **Version perso d'un chant dans une setlist** (Timothée, 14/09/2026 soir) — **spec `spec-version-perso.md` tranchée le 14/09/2026 soir (position 3 ter, une retouche d'une section répétée touche toutes ses répétitions en V1, libellés), go donné le soir même, V1 + V2 + V3 codées le 15/09/2026 (18 tests × 3 appareils), à valider en local ; `firestore.rules` à publier** | Chaque musicien se fait **sa version** d'un chant de la setlist : sections choisies et ordonnées (C R P une fois chacune), accords et paroles retouchés, pour lui seul, **dans cette setlist seulement**, sans toucher la structure ni la version de la présidence (liste, bandeau, PDF, lien de présentation, copie des paroles inchangés) ; ses accords et paroles peuvent être **partagés sous son nom** (« Version de Christelle ») et choisis par les autres, chacun gardant son choix ; la structure perso ne se partage jamais ; le mode louange suit la version choisie et ma structure ; « Adapter » reste l'outil de la présidence. Trois tranches : V1 accords et paroles, V2 structure, V3 partage et sélecteur | sous-collection `setlists/{id}/versions/{uid}` + `firestore.rules` + `access.ts` (en double), `SetlistDetailClient.tsx`, `PartitionView.tsx`, `blocks.ts`, `PerformanceMode.tsx`, `SectionStructureEditor` réutilisé | M |
| 4 | **Nouveau look** (chantier 5) | Direction visuelle à rechoisir (sobre, moins fade, moins « document ») ; **nom « GCC »**, menu par sections ; toutes les pages, mis en ligne d'un bloc ; pages d'administration au nouveau style sans réorganisation — **planche du 15/09/2026** : trois directions (A Réglages, B Musique, C Crème relevée), fondations communes et sept décisions dans `spec-look.md`, planche https://claude.ai/artifact/3AXs4eYYCedEAYa8bgW8zL ; **tout tranché le 15/09/2026 au soir** (A Réglages, vignettes teintées, accent rouge du logo réservé aux boutons pleins, police système, onglets Louange · Planning · Évènements · Moi, page « Moi », grand titre replié, sombre noir pur, pilule d'outils du chant : détail `spec-look.md` § « Ce qui est construit », plan `tasks/plan.md`, six tranches T1–T6) ; **go donné le 15/09/2026 au soir, T0–T6 codées le jour même, à valider en local** (voir § 1) | tout le site ; `docs/audit-ui-apple-design.md` | L |
| 5 | **Export PDF** (chantier 6) — **spec `spec-export-pdf.md` écrite le 16/09/2026 après entretien (§ 3.N), go donné et codé le jour même (§ 1)** | Choix au téléchargement : **classique / couleurs par section / compact** (bandeau + sections uniques) ; pour un chant et pour la setlist. La « demande via GCC » de Christelle = couleurs par section | `SongPDF.tsx`, `SetlistFullPDF.tsx` | M |
| 6 | **Évènements** (nouveau module) — **spec écrite le 15/09/2026 (`spec-evenements.md`), 19 questions tranchées, **go donné le 15/09/2026, codé le jour même** (36 tests × 3, suite 663 verte), non commité, à valider** | Calendrier public (agenda par mois, rien de nominatif), fiche complète (titre, type sport / loisir / musique / église / info, pour toute l'église ou une section, dates, lieu, description, liens, images, places, contact), créée par la coordination ou par les détenteurs du droit d'annonces pour leur section ; **inscription avec compte + invités** (nombre), sans compte au choix de l'organisateur (nom + invités, via le serveur), « Complet » sans liste d'attente ; **évènements annuels** dupliqués à la main ; **QR code** (bibliothèque `qrcode`) ; push à la création + rappel la veille aux inscrits, préférence « Évènements » ; **annonces fusionnées** (type info épinglé, migration par bouton admin, badge transféré, entrée Annonces retirée) | section `/evenements` (public), `/evenements/[id]`, `/evenements/scene`, routes `api/evenements/*`, `notify-evenement`, cron, admin, `access.ts` + `firestore.rules` | L |
| 6 bis | **Look de l'onglet Évènements** (maquette de Timothée, 16/09/2026 : liste avec état d'inscription, fiche avec bannière et bouton plein, vue organisateur avec panneau des inscriptions, formulaire réordonné) — **spec écrite puis go le 16/09/2026** (`spec-evenements-look.md`, quatre recommandations retenues) ; **L1–L6 codées le 16/09/2026** (L6 : même carte blanche sur ordinateur, téléphone et tablette), non commité, à valider en local | `EvenementCard`, `EvenementClient`, `Inscriptions`, `EvenementForm` ; aucun champ nouveau | M |
| 7 | **Tâches par pôle** (nouveau module) — **spec `spec-taches.md` écrite le 16/09/2026 après entretien (§ 3.N), go donné le jour même** | Pôles : **DA, Média, Orga, Louange, Événement**. Tâche = pôle, responsable, échéance, état, lien (fond Canva…) ; **rappel d'échéance** via le cron quotidien ; **chaîne** : tâche marquée faite → le pôle suivant est notifié (DA → régie). Cadré par un entretien à part | nouveau module | L |
| 8 | **Nouveaux membres et 中文** (chantier 7) — **spec `spec-nouveaux-membres.md` écrite le 16/09/2026 après entretien (§ 3.N), go donné le jour même** | Accueil à la première connexion (nouveau style), guide plus visible, textes restés en français ; d'autant plus utile que l'assemblée entière arrive | onboarding, `/guide`, locales | M |

Toujours vrai : **capo conseillé en stand-by** ; **index A–Z balayable** : le
balayage est codé et commité depuis `b395745` (14/09/2026), revérifié le
15/09/2026 (Chromium, vrais événements tactiles) ; reste un petit lot de
finition proposé avant le look (lettre visible sous le doigt, barre du haut
fixe pendant le geste, marge de défilement), décision D7 de `spec-look.md` ;
idée « modifié depuis ta dernière visite ».

**Bug d'outillage — corrigé le 14/09/2026 (soir), sur le go du même soir,
exactement comme proposé ci-dessous ; `npm run lint` passe (0 erreur)** :
`npm run lint` échouait (« could not find plugin react-hooks »),
et la CI (`deploy.yml`, étape `npm run lint`) avec lui. Cause :
`eslint-config-next` 16 n'enregistre le plugin `react-hooks` que pour
`**/*.{js,jsx,mjs,ts,tsx,mts,cts}` — **pas `.cjs`** — alors que notre objet de
règles dans `eslint.config.mjs` (sans `files`) s'applique à tout fichier
linté. Depuis le 13/09/2026, les skills vendorisés apportent des `.cjs`
(`.claude/skills/brand/scripts/*.cjs`, `.claude/skills/design-system/scripts/*.cjs`) :
ESLint les linte, y applique `react-hooks/set-state-in-effect` sans plugin,
et s'arrête. Reproduit par `npx eslint --print-config
.claude/skills/design-system/scripts/generate-tokens.cjs`. **Correctif
proposé, deux lignes** : ajouter `.claude/**` (code tiers) et `graphify-out/**`
aux `ignores`, et donner à l'objet de règles `files:
["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"]` pour qu'il ne s'applique jamais là où
Next n'a pas enregistré ses plugins. Aucun effet sur le code de l'app.

Plus tard, déjà dit (14/09/2026) : **plannings remplis dans l'app** (Google
Sheets en attendant) ; **inscription au petit déj dans l'app** (Sheet en
attendant).

## 3. Demandes du 14/09/2026 — toutes tranchées

Conversation WhatsApp Timothée ↔ Christelle (responsable, guitariste).
Sondage de Christelle sur la structure « coup d'œil » : Jo et Eva
(pianistes) pour, Éloïse (guitariste) sans avis, Esther (pianiste) sans
réponse. Timothée (pianiste) suit la structure dans le mode louange.

### A. Structure « en 1 coup d'œil » → lot 3 (écran), lot 5 (PDF)

**Demande** : « avoir structure de la présidence (en abrégé ? R C1 C2… Dp) et
une ligne en dessous avec les nuances » ; « éviter de devoir slider les
partitions » ; « C Pr R P et Pm/Intro sur une seule page, ou 2 » ; « les
accords ça change pas entre un C1 et C2 ». Vue partitions **et** PDF.
Timothée : « je comptais changer ça aussi » ; batteurs : « surtout besoin de
la structure et des nuances ».

**Ce que le code montre** : vue liste = puces de structure aux noms complets ;
vue partitions = sections dépliées dans l'ordre joué, reprises imprimées en
entier, nuances sur chaque section, **une ligne « ORDRE »** (noms complets,
ordre joué) sous l'en-tête de chaque chant (`SongView.tsx`, c'est « la
structure en haut » de Christelle), et un bandeau pour les scans 简谱
(`JianpuStructureStrip`) ; mode louange = vue structure batteurs
(chantier 2) ; PDF = sections dépliées ; aucune abréviation.

**Tranché (14/09/2026, tours 4 à 6 et 8)** : bandeau + sections uniques,
réglage par appareil activé par défaut ; abréviations françaises partout ;
Dp = dernière phrase, étape dérivée définie par la présidence dans l'éditeur ;
Pm = pont musical ; batteurs = bandeau seul ; mode louange inchangé ; PDF
compact au téléchargement, avec le chantier 6.

### B. Colonne « Sainte cène » → lot 1a

**Demande** : « une colonne pour planifier une personne pour aider la
présidence lors de la sainte cène, tu peux mettre la modif pour que ça
affiche ? » — « c'est fait sur T4 ».

**Ce que la feuille montre** (CSV public, 14/09/2026) : en-tête « Sainte
cène » à l'**index 11** de `Franco_Louange`, après « Traducteur » ;
`fetchCulte` lit 0–10 ; à partir de l'index 12 les lignes T4 portent des notes
de travail → lire exactement 11. Libellé `planning.sainteCene` déjà présent
(pastille du premier dimanche du mois).

**Tranché** : service à part entière, libellé « Sainte cène », visible si
remplie, dans Mes services et les rappels.

### C. Nouvelle année du Google Sheet → réponse à Christelle, pas de code

**Demande** : « on duplique le Google Sheet et tu récupères le nouvel ID ? »
— proposition de Christelle : dupliquer **pour l'archive**, remettre à zéro
**le fichier actuel**.

**Ce que le code montre** : `SHEET_ID` fixe dans `sheets.ts` ; onglets lus par
leur **nom exact** (`Franco_Louange`, `Franco_Table_PtD`, `Paix_T1`,
`Paix _T2` — avec l'espace —, `Fidélité_Musicien`, `Bonté _T3`,
`Intergroupe`, `Interfranco`, `EDD`, `Campus_Louange`) ; dates JJ/MM sans
année, `inferYear` = année civile en cours (bascule tolérée de novembre à
février) ; rappels dédoublonnés par date complète.

**Réponse** : sa proposition marche **sans rien changer au code** : même
fichier, mêmes noms d'onglets (espaces compris), mêmes colonnes. Un nouveau
fichier par an obligerait à changer `SHEET_ID` et redéployer. `SHEET_ID`
reste en dur (rien de spéculatif). Les données de secours de `data.ts`
(2026) vieilliront : à régénérer un jour ou à retirer.

### D. Petit déjeuner sur un Google Sheet à part → lot 1b

**Demande** : « inscription directement sur un fichier Google Sheet, à part
du reste des plannings [beaucoup de gens y auront accès] ; faire apparaître
sur la page principale et envoyer des notifs de rappel comme d'hab ».
Christelle : « Sheets pour commencer ».

**Ce que la feuille et le code montrent** : le petit déj existe déjà dans
`Franco_Table_PtD` (vers la colonne R : « PETIT DÉJEUNER 2026 · DATE · NOM ·
DATE », ex. « 25/01 · Charlie & Isabelle »), **jamais lu**. `fetchSheet` lit
n'importe quel fichier public : second identifiant + parseur ; noms
multiples avec « & » via `splitNames`.

**Tranché** : accueil « Ce dimanche » + Mes services + rappels, pas d'onglet ;
fichier et colonnes à recevoir de Christelle. **Plus tard : inscription dans
l'app.**

### E. Rappels par service → lot 1c

**Demande** : Timothée : « des notifs spécifiques pour chaque service, qui
envoie un message différent » — Christelle : « oui !! ».

**Ce que le code montre** : cron quotidien (`/api/cron/reminders`, 08:00 UTC,
seul cron déclaré, Hobby = 2 max), **même texte** « Tu sers demain (…) » pour
tous les services, **Prépa. Table comprise** (contrairement à ce qui a été dit
à Christelle : elle est déjà rappelée si la personne a un compte au bon nom
de planning). Le cron connaît service et rôle (`servantsForDate`).

**Tranché** : **une seule notification** par personne et par échéance, qui
liste ses services avec le rôle (deux notifications le même jour seraient
intrusives) ; échéances inchangées J-7, J-3, J-1 ; titre « Rappel de
service » ; la liste des noms sans compte **existe déjà** dans
l'administration (« Planning sans compte »), rien à construire.

### F. Pôle événement → lot 6

**Demande** : nouveau pôle (sport, loisir, musique en semaine) ; T4 géré par
Steph sur un Google Sheet ; à terme organiser et planifier dans l'app, QR
code vers le calendrier, inscription ; « les participants doivent-ils tous
avoir un compte ? ».

**Ce que le code montre** : rien pour les évènements ; existent annonces,
plannings (Sheets), page `notifier`, rôles par catégorie.

**Tranché (tours 1 à 3)** : vrai module dans l'app (pas de lecture du Sheet
de Steph) ; rôle « événement » + admins ; fiche complète ; inscription avec
compte + invités, sans-compte au choix de l'organisateur ; calendrier public
sans compte ; QR vers le calendrier fourni par l'app.

### G. Évènements annuels de l'église → lot 6

**Tranché** : même calendrier, type « église », visibles sans compte, en
général sans inscription.

### H. Tâches internes par pôle → lot 7

**Demande** : tâches répétitives et réunions par pôle ; « selon la date
butoir, une notif ; quand DA a terminé le fond PPT, ça notifie la régie »
(« pas de transfert d'image, juste un lien texte ») ; « que tout le monde
soit autonome ».

**Tranché** : module à part après les évènements ; rappel d'échéance via le
cron + chaîne « fait → pôle suivant » ; pôles DA, Média, Orga, Louange,
Événement (les services du dimanche restent des services du planning).

### I. « Demande via GCC pour pouvoir télécharger… » → lot 5

**Tranché** : c'est l'export PDF avec les sections en couleur, pour un chant
ou une setlist — déjà prévu (chantier 6).

### J. Remarqué en route

- « Prépa. Table du Seigneur » = **les personnes qui mettent les tables pour
  le déjeuner à l'église** (Timothée, 14/09/2026). La feuille
  « Préparation table déjeuner » dit la même chose : libellé conservé.
- Noms d'onglets fragiles (`Paix _T2` avec espace) : à dire à Christelle
  avant la remise à zéro annuelle.

### K. Planning de la scène avant Noël (18:37) → lot 3 bis (proposé)

**Demande** (Christelle, 14/09/2026 à 18:37, « j'en ai discuté avec Alice
puisqu'elle gère les entrainements/ordre de passage pour noël ») : « avoir sur
GCCLouange la possibilité de planifier les entrainements sur scène avant
noël. Comme la scène est très prisée en cette période (entrainement franco,
entraîneur louange 25, chants EDD, spectacle..) c'est mieux si on a un
planning qui permet à tous de planifier et voir quand il y a des créneaux
dispo sur scène » ; « si tu peux t'inspirer de l'onglet campus avec 2
volets : entrainements et passage le jour J ça serait top » ; « ça pas obligé
de passer par un sheets, c'est plus simple directement sur GCCLouange je
pense ? ».

**Ce que le code montre** : l'onglet Campus (`src/app/planning/campus/page.tsx`)
lit l'onglet `Campus_Louange` du Google Sheet (`fetchCampus`) et l'affiche en
deux volets « Louange / Répétition », groupés par jour, en lecture seule. Tous
les plannings du site sont lus depuis Google Sheets ; rien n'est saisi dans
l'app. L'écriture depuis l'app existe pour les setlists, les profils et les
annonces (Firestore en REST, `firestore.rules` + `access.ts`) : c'est le
modèle à suivre. Aucune notion de lieu ni de ressource (« la scène »)
n'existe.

**Tranché par la demande elle-même** : dans l'app, pas de Sheet (c'est le
premier des « plannings remplis dans l'app » déjà annoncés le 14/09/2026) ;
deux volets ; modèle visuel = Campus ; visible et remplissable par tous les
membres connectés.

**Tranché par Timothée le 14/09/2026 : les sept paris ci-dessous acceptés
tels quels**, puis entretien « grill » pour le reste :

1. **Qui pose un créneau** : tout membre connecté, avec son nom et son
   groupe ; seuls l'auteur et les admins le modifient ou le retirent.
   Variante : seulement les responsables (rôles de service).
2. **Chevauchements** : un créneau qui en chevauche un autre est refusé à
   l'enregistrement (la scène est unique) ; le créneau pris s'affiche avec
   son groupe et son nom. Variante : simple avertissement.
3. **Ordre de passage** : tenu par Alice et les admins. Alice reçoit le rôle
   « événement » du lot 6, créé dès maintenant (un seul champ, cf. § 7
   constat 12 : ne pas inventer un « coordinateur » de plus), sans rien
   d'autre du lot 6. Variante : admins seulement, Alice passe par Timothée.
4. **Durée de vie** : un « programme » (titre « Noël 2026 », date du jour J,
   période de réservation) créé par un admin ; l'onglet Scène montre le
   programme en cours et se réutilise chaque année (Pâques, spectacle…).
   Variante : Noël 2026 seulement, en dur.
5. **Rappels** : aucun push dans un premier temps ; plus tard, le cron
   quotidien pourrait rappeler « ta répétition sur scène est demain ».
6. **Place dans l'ordre** : lot 3 bis, avant le look — la scène se réserve
   dès novembre 2026 et le look est de taille L sans direction choisie ; la
   page sera reprise au nouveau look avec les autres. Variante : après le
   look.
7. **Onglet** : « Scène » à côté de Campus dans le planning, avec sa couleur
   dans `serviceColors.ts` (fichier gelé : ajout à valider) ; « Mes
   services » et les rappels ne le listent pas.

**Entretien « grill », tour 1 (14/09/2026, réponses de Timothée)** :
- Créneau : début et fin libres au quart d'heure, sans durée maximale ;
  réservable n'importe quand dans la période du programme (pas de plages
  d'ouverture).
- Deux listes de choix pour un créneau ou un passage : **Quoi** (Séance
  louange, Chant, Danse, Sketch, Spectacle) et **Qui** (EDD 小班, EDD 中班,
  EDD 大班, EDD 高班, Gp Bonté, Gp Fidélité, Gp Paix, Gp Amour, Gp Joie,
  Franco, 敬拜团).
- Jour J : **pas d'horaire ni de durée**, seulement l'ordre — « l'ordre de
  la brochure, digitalisé, pour avoir le déroulement sous la main ».
  Glisser-déposer accepté mais peu utile. Titre du volet : **« Ordre de
  Passage jour J »**, boutons « Entraînements » / « Jour J ».
- Chevauchement : refus côté client accepté ; si deux créneaux passent
  quand même à la même seconde, **notifier les deux auteurs**.
- Créneaux passés masqués (lien pour les voir). Couleur indigo `#3f51a3`.
  Champ `poles` avec la valeur « événement ».
- **Rappels voulus** (révise le pari 5) : prévenir le créateur de
  l'entraînement, ou les profs de la classe EDD concernée, « même principe
  que les notifications envoyées à la personne qui sert cette semaine ».
- Vue du volet Entraînements : maquette jetable des deux dispositions
  publiée (liste par jour / grille de la semaine, trois largeurs), à
  trancher au tour 2.
- Non compris au tour 1, reposés au tour 2 : pouvoirs d'Alice (Q7),
  plusieurs programmes (Q10) ; sans réponse : limite par groupe (Q12).

**Tour 2 (14/09/2026) — recommandations toutes acceptées, plus une règle** :
- **Les entraînements n'ont lieu que le dimanche** (Timothée). Un créneau se
  pose sur un dimanche de la période du programme, pas sur une date libre.
- Vue du volet Entraînements : **liste par jour (A)** partout, maquette vue
  (grille B écartée, possible plus tard).
- Listes Quoi / Qui **en dur dans le code**. Créneau = dimanche, début, fin,
  quoi, **un ou plusieurs qui** (cases à cocher), note d'une ligne
  facultative, auteur affiché. Passage du jour J = quoi, qui, titre libre.
- Rôle « événement » (Alice) = coordination complète : crée et modifie le
  programme, tient l'ordre de passage, déplace ou retire n'importe quel
  créneau (élargit le pari 4).
- **Un seul programme à la fois** ; après le jour J il reste affiché
  « terminé » jusqu'au programme suivant.
- Chevauchement passé malgré le refus client : détection **immédiate**
  (relecture après enregistrement, route serveur qui notifie les deux
  auteurs, push + cloche) et créneau marqué en rouge pour tous.
- **Rappels** fondus dans les rappels regroupés du lot 1c (J-7, J-3, J-1) —
  un dimanche, la ligne d'entraînement rejoint celle des services du même
  jour ; destinataires = l'auteur + les membres ayant un rôle dans le « qui »
  (Franco = Culte Francophone ; 中班 大班 高班 ; Gp Paix, Fidélité, Bonté) ;
  EDD 小班, Gp Amour, Gp Joie, 敬拜团 n'existent pas dans l'app → auteur
  seul. Rien à la création du créneau.
- Aucune limite par groupe. **3 bis se code avant 3 ter** (échéance Noël).

**Tour 3 (14/09/2026)** :
- L'onglet s'appelle **« Noël »** (pas « Scène »). Lecture de Claude, à
  confirmer : l'onglet porte le nom court du programme en cours (« Noël »),
  et « Scène » quand il n'y a pas de programme — le programme reste
  réutilisable.
- **Le jour J ne se réserve pas** ; il n'est pas un dimanche : **24 décembre
  2026**. La liste des entraînements ne montre que les dimanches de la
  période.
- Horaire pré-rempli **à partir de 17 h** (17:00–18:00, modifiable au quart
  d'heure).
- Sans réponse : dimanches vides affichés « Scène libre » (recommandation
  prise, à confirmer dans le récapitulatif).

**Tour 4 (14/09/2026, après le récapitulatif)** :
- Période de réservation : **d'octobre 2026 au dimanche 20 décembre**
  (dernier dimanche avant le 24). Douze dimanches.
- Le second volet s'appelle **« Programme Noël »** (plus « Jour J »).
- **À partir du lundi 21 décembre**, le volet Entraînements disparaît et
  l'onglet affiche directement le programme de Noël.
- Dimanches vides affichés « Scène libre » : **confirmé**.
- Nom de l'onglet suivant le programme : pas compris, reformulé au tour 5.

**Tour 5 (14/09/2026)** : « Le programme pour Noël on peut l'ajouter et le
modifier à la main ? » (oui, coordination) ; « des onglets qui s'affichent
et qui se cachent et Alice peut les activer ou non, pour pas trop tout
encombrer ». Lecture retenue, **à confirmer** : un onglet par programme,
nommé comme lui, affiché ou masqué par la coordination ; sans programme
affiché, pas d'onglet ; onglet « Programmes » pour la coordination.
Remplace « un seul programme à la fois » et « reste affiché terminé jusqu'au
suivant ». Spec : `spec-programme-scene.md`. **Go donné le 14/09/2026 (soir)** ; codé dans
la nuit (voir § 1 et § 6).

### L. Version perso d'un chant dans la setlist (Timothée, soir) → lot 3 ter (proposé)

**Demande** (Timothée, 14/09/2026 soir, dans l'app) : « Est-ce que ce serait
possible dans la setlist, qu'on modifie à notre guise seulement pour
l'utilisateur qui a choisi de changer ce qui est affiché, par exemple C R P
avec les accords et les paroles, sans que ça modifie la structure que la
présidence a choisie ». Entretien en quatre tours : c'est **choisir quelles
sections voir et dans quel ordre, et aussi retoucher les accords et les
paroles pour soi seul, ou bien les partager** ; partager = **une version à
mon nom que les autres voient et peuvent choisir**, chacun gardant la sienne
(pas un remplacement de la version commune) ; portée = **cette setlist
seulement**.

**Ce que le code montre** : tous les réglages de la vue partitions sont par
appareil (`localStorage`) ; le seul moyen de changer accords, paroles ou
structure est de modifier la setlist pour tout le monde (mode Adapter,
éditeur) ; les données perso par compte existent déjà (annotations du mode
louange, Firestore) ; toutes les vues passent par `itemAst` +
`resolveStructureOverride`, donc substituer deux champs d'un item suffit.
Détail : `spec-version-perso.md`.

**Tranché par Timothée (14/09/2026, soir)** : lot **3 ter**, avant le look
(mêmes fichiers que le coup d'œil, page reprise au nouveau look avec les
autres) ; en V1, une retouche dans une section répétée **touche toutes ses
répétitions** (hypothèse simplificatrice de la spec, d'abord refusée puis
confirmée : « je me suis trompé, c'était bien comme tu avais fait ») ;
libellés « Ma version », « Version de Christelle », « Présidence »,
« Partager ma version », « Sections ». **Go donné le 14/09/2026 (tard) ;
les trois tranches sont codées le 15/09/2026, à valider en local**
(avancement dans la spec).

### M. Lot 6 Évènements — entretien du 15/09/2026 → `spec-evenements.md`

**Déclencheur** : après la section Évènements du lot 3 bis, Timothée : « je
pense que tu peux coder tout ce qui est en rapport avec les évènements » ;
confirmé comme le lot 6, à faire avant 3 ter et le look. Deux tours (13 + 6
questions), toutes les recommandations acceptées : agenda par mois ; tout
public sauf les noms ; deux onglets (Calendrier public, programme connecté) ;
inscription compte + invités (nombre), fermeture au début, Complet sans liste
d'attente ; sans compte = nom + invités via le serveur ; liste des inscrits
pour organisateur / coordination ; champ « pour » (église ou section) qui
reprend le rôle des annonces ; push à la création si coché, rappel la veille,
préférence « Évènements » ; fusion des annonces avec migration par bouton
admin ; annuels dupliqués à la main ; QR code par bibliothèque ; organisateur
= créateur + contact libre ; droit d'annonces existant = création pour sa
section ; dates de fin facultatives ; passés sur trois mois ; barre du bas
inchangée. **Go pas encore donné.**

### N. Lots 5, 7 et 8 — entretien du 16/09/2026 → trois specs

**Déclencheur** : Timothée, 16/09/2026 : « Fait le 5, 7 et 8 », puis « si
besoin pose-moi des questions avec le skill grill me pour que ce soit plus
précis sur les specs ». Aucune spec n'existait : lu comme le départ des
specs, pas comme un go de code (règle du go par lot, § « Mode de travail »). Deux tours (Q1–Q23
puis Q24–Q33), **toutes les recommandations acceptées**.

- **Lot 5** (`spec-export-pdf.md`) : fenêtre « Quel PDF ? » (chant : Classique ·
  Couleurs par section ; setlist en vue partitions : + Compact), dernier choix
  retenu par appareil ; nuancier gris aussi dans le classique (constat 20) ;
  couleurs par section = comme l'écran ; compact = « Sections uniques »
  imprimé, en couleurs, un chant par page, bandeau au-dessus des scans ; pas
  de PDF « structure seule ». **Écart relevé en écrivant la spec** : l'écran
  « couleurs par section » est un cadre fin sans fond, accords en noir — pas
  l'encadré teinté décrit en Q3 ; la spec suit l'écran, à confirmer.
- **Lot 7** (`spec-taches.md`) : pôles DA, Média, Orga, Événement cochés par
  un admin, Louange = avoir un rôle de service ; tâche = titre, pôle,
  responsable facultatif, échéance (jour), faite / à faire, lien, note,
  « prévenir » ; répétition semaine / deux semaines / mois, une fois ratée
  disparaît quand la suivante arrive ; tous les connectés voient, les membres
  du pôle agissent ; **cible « régie » (constat 12) = la régie du service
  choisi le dimanche qui suit l'échéance, d'après le planning** ; rappels J-3,
  J-1, lendemain, dans la notification du jour ; « Nouvelle tâche » au
  responsable ; réunions = évènements réservés au pôle, sans inscription,
  rappel la veille au pôle ; « Mes tâches » dans Moi, entrée « Tâches » sur
  ordinateur, pas de sixième onglet.
- **Lot 8** (`spec-nouveaux-membres.md`) : accueil de 5 écrans (bienvenue,
  onglets, rôle, notifications, guide), vu une fois par compte, tous les
  comptes ; guide mis à jour (Évènements, scène, version perso, coup d'œil,
  Moi ; Annonces retirées), liens « Comment ça marche ? », écrans vides qui
  disent quoi faire ; captures sur téléphone **après validation du look** ;
  tout traduit sauf l'administration ; planche de relecture pour un
  sinophone (nom à donner).
- **Organisation** : le look est commité avant (`de882b7`) pour garder un
  commit par lot ; ordre 5 → 7 → 8.
- **Remise des specs (16/09/2026)** : Q3 « identique à l'écran » confirmé
  (cadre fin, accords noirs) ; lot 7 : « une personne qui n'est pas connectée
  ou qui n'est pas dans un pôle ne voit pas les tâches des pôles », puis
  **chacun voit les tâches de ses pôles** (admins : tout), filtrage côté
  serveur ; lot 8 : messages push du serveur dans la langue du destinataire ;
  **Timothée relit lui-même le 中文**. **Go : « Go pour tous les lots 5, 7
  et 8 »** → codés à la suite, un commit par lot, testés par Timothée
  ensuite.

## 4. Carte des modules de l'app « GCC »

À valider par Timothée avant toute spec de module (les modules existants ne
sont pas re-spécifiés).

| Module | Responsabilité | Dépend de | État |
| --- | --- | --- | --- |
| `comptes-roles` | Comptes de toute l'assemblée ; rôles de service existants + rôles de pôle (DA, Média, Orga, Louange, Événement), attribués par un admin | — | existant, à élargir |
| `notifications` | Push, cloche, préférences, cron quotidien (rappels, échéances) | `comptes-roles` | existant, à étendre (rappels regroupés, échéances de tâches) |
| `louange` | Chants, setlists, mode louange, PDF, coup d'œil | `comptes-roles` | existant ; lots 2, 3, 5 |
| `planning` | Lecture des Google Sheets, Mes services, rappels ; **planning de la scène saisi dans l'app** (créneaux + ordre de passage, lot 3 bis) ; à terme les autres plannings et inscriptions (petit déj) | `comptes-roles`, `notifications` | existant ; lot 1 ; lot 3 bis proposé |
| `evenements` | Calendrier public, fiches, inscriptions et invités, QR code, évènements annuels ; **section créée au lot 3 bis** avec le programme de scène (onglet « Noël ») | `comptes-roles`, `notifications` | section existante (3 bis) ; lot 6 |
| `taches` | Tâches par pôle, échéances, chaîne entre pôles | `comptes-roles`, `notifications` | lot 7 |

Ordre : `comptes-roles` (élargir) → `evenements` → `taches`. Le look (lot 4)
porte le nom « GCC » et le menu par sections dont ces modules ont besoin.

## 5. Écarté (14/09/2026)

- Lire le Google Sheet de Steph pour T4 : travail jetable, on construit le
  module.
- Inscription anonyme systématique aux évènements : au choix de l'organisateur,
  par évènement.
- Deux notifications de rappel le même jour : intrusif ; une seule regroupée.
- Sections uniques en mode louange : non, le dimanche on suit l'ordre joué.
- Dp comme simple étiquette : non, les accords et les paroles doivent
  s'afficher.
- Changer le libellé « Prépa. Table du Seigneur » : non, il est juste.
- Rendre `SHEET_ID` configurable : pas maintenant (rien de spéculatif).
- Lot 1d « liste admin des noms sans compte » : existe déjà
  (`src/app/admin/page.tsx`, « Planning sans compte ») ; regrouper par
  service n'apporte rien.
- Maquettes du coup d'œil avant de coder : Timothée préfère tester le résultat
  en local et le montrer à Christelle.

## 6. Journal

- 14/09/2026 (matin) : conversation Timothée ↔ Christelle ; ce document est
  créé ; aucun feu vert.
- 14/09/2026 (soir) : Timothée confirme que l'app devient l'app de l'église
  entière (« Cap »). Entretien en 8 tours : comptes et visibilité, module
  évènements, tâches et plannings, coup d'œil (maquettes), détails du coup
  d'œil et Dp, PDF et planning, rappels et divers, pôles / mode louange /
  ordre. Tout est tranché ; l'ordre de la partie 2 est validé. Rien n'est
  codé : chaque lot attend son feu vert.
- 14/09/2026 (soir, suite) : Timothée craint des fonctionnalités redondantes
  ou en conflit → relecture adversariale par un relecteur à contexte vierge
  (§ 7), 20 constats ; deux affirmations corrigées (ligne ORDRE existante,
  liste admin existante). Go donné pour le coup d'œil (lot 3), après les
  arbitrages du § 7.
- 14/09/2026 (soir, fin) : arbitrages 1, 8, 13, 16 tranchés ; spec
  `spec-coup-d-oeil.md` écrite. **Erreur** : « tu peux le coder » pris pour un
  go → tranche S1 codée (abréviations, bandeau à la place de ORDRE, cas du
  scan, 12 tests verts sur trois appareils, captures regardées). Timothée :
  « je ne t'ai pas donné mon feu vert ». Arrêt immédiat ; il décide de garder
  ou de retirer S1.
- 14/09/2026 (soir, fin) : lint cassé diagnostiqué (les `.cjs` des skills
  vendorisés, voir § 2) ; correctif proposé, en attente de feu vert.
- 14/09/2026 (soir, go) : Timothée : « commence à faire les modifications
  qu'il faut dans l'ordre qu'on a décidé et oublie pas de corriger le lint
  aussi ». Faits dans l'ordre : lint réparé ; lot 1a (Sainte cène) ; lot 1c
  (rappels regroupés, langue mémorisée côté serveur) ; lot 2 (notification au
  président) ; lot 3 S2 et S3 (modes d'affichage, sommaire par occurrence,
  « Dernière phrase »). Chaque lot : test écrit d'abord, vu en échec, puis
  vert sur les trois appareils ; suite complète verte (420 tests) ; lint,
  validation des chants et tests du mode Adapter verts ; captures regardées.
  **Rien n'est commité** (commit sur demande) ; **tout est à valider en
  local**. Lot 1b non codé (fichier de Christelle à recevoir). Arrêt avant
  le lot 4 : la direction visuelle est à choisir avec Timothée.
  Écarts notés : nom du Dp « Dernière phrase – R » (abréviation, sans
  parenthèses ni numéro : contrainte du parseur) ; langue écrite aussi à la
  connexion, pas seulement au changement ; répétition Campus sans rôle dans
  le rappel.
- 14/09/2026 (message de Christelle de 18:37, transmis par Timothée après
  les lots codés du soir) : nouvelle demande, discutée avec Alice — planifier
  les entraînements sur scène avant Noël dans l'app, deux volets comme
  Campus (entraînements, passage le jour J), sans Google Sheet. Consignée en
  § 3.K, proposée en lot **3 bis** avant le look (échéance Noël). Rien n'est
  codé : position et paris à trancher par Timothée, puis go.
- 14/09/2026 (soir, tard) : demande de Timothée — **version perso d'un chant
  dans une setlist** (sections choisies et ordonnées, accords et paroles
  retouchés pour soi, partage sous son nom au choix, dans cette setlist
  seulement, sans toucher la version de la présidence). Entretien en quatre
  tours, intention confirmée (« go »), lu comme un go pour la spec :
  `spec-version-perso.md` écrite, consignée en § 3.L et proposée en lot
  **3 ter** avant le look. Puis tranché sur les trois points soumis :
  position 3 ter, retouche d'une section répétée = toutes ses répétitions
  en V1 (confirmé après un aller-retour), libellés. Go donné tard le soir.
- 15/09/2026 : lot **3 ter** codé en trois tranches sur ce go — V1 « Ma
  version » (accords et paroles par compte, mode louange), V2 « Sections »
  (structure perso, bandeau et liste sur la présidence), V3 partage et
  sélecteur « Présidence · Moi · Ruth K. » avec choix par compte. Test écrit
  d'abord et vu en échec à chaque tranche, 17 tests × 3 appareils verts,
  suites voisines vertes (117), lint et tsc propres, captures regardées.
  **Rien n'est commité ; à valider en local ; `firestore.rules` à publier.**
  Retour de Timothée après livraison : « Copier les paroles » seulement en
  suivant la setlist de la présidence → bouton masqué sur toute autre version
  (test ajouté, 18 tests × 3).
- 14–15/09/2026 (nuit, go) : lot 3 bis codé en quatre tranches, chaque
  tranche test-first (rouge puis vert sur les trois appareils) : rôle
  « événement » + programmes + onglets ; volet Entraînements ; ordre de
  passage avec glisser-déposer ; route de conflit + rappels fondus dans le
  cron. 25 tests × 3 appareils, suite complète verte (528), lint propre sur
  les fichiers du lot, chants valides, captures regardées. Tests lancés
  contre le serveur de travail (port 3000) parce que Next 16 refuse un
  second `next dev` dans le même dossier. **Non commité, à valider.**
  Écarts notés dans la spec (onglets après « Accueil », programme affiché
  d'emblée, aucun onglet sans programme).
- 15/09/2026 : test local de Timothée : « c'est pas bon », l'onglet par
  programme + page « Programmes » ne lui parle pas. Quatre questions →
  **onglet unique** « Scène », nommé comme le programme affiché, un seul à
  la fois, gestion en haut de la même page. Refait, 27 tests × 3 verts, un
  bug corrigé au passage (formulaire ouvert sans programme). Puis Timothée :
  « l'onglet qui se crée soit dans l'onglet évènement et non dans le
  planning » → **section « Évènements »** créée dans la barre principale
  (route `/evenements`, menu mobile, libellé « GCC Évènements »), l'onglet
  « Noël » y vit ; barre d'onglets extraite en composant partagé
  (`SectionTabs`). 27 tests × 3 verts, suite complète relancée.
- 15/09/2026 : Timothée : « tu peux coder tout ce qui est en rapport avec
  les évènements » → lu comme le lot 6, confirmé ; pas pris pour un go.
  Entretien en deux tours (19 questions, § 3.M), spec `spec-evenements.md`
  en quatre tranches (E1 calendrier et fiche, E2 création, E3 inscriptions,
  E4 fusion des annonces / cloche / QR / rappel). **Go donné le 15/09/2026** ;
  les quatre tranches codées le jour même, chacune rouge puis verte sur les
  trois appareils ; suite complète verte (663) ; captures regardées ;
  bibliothèque `qrcode` ajoutée ; page Annonces retirée (redirection). **Non
  commité, à valider en local.**
- 15/09/2026 (midi) : **commit de tout l'arbre** (« feat: planning, président, coup d'œil, setlist, scène (3 bis), version perso (3 ter) et évènements (6) ») sur `ui/apple-design`
  (lint, 1a, 1c, 2, 3, chantier setlist, 3 ter, 3 bis, 6) — un seul commit,
  les lots partageant trop de fichiers pour être séparés sans état cassé ;
  suite complète verte (663), lint sans erreur, 370 chants valides. Reste :
  validation locale, publication des règles, migration des annonces.

- 15/09/2026 : lot 4, planche de trois directions publiée et `spec-look.md`
  écrite (sept décisions D1–D7) ; **réponse de Timothée le soir** : A avec
  vignettes teintées, accent rouge du logo, index A–Z en lettre agrandie ;
  tour 2 de treize questions Q1–Q13 sur la même planche, **toutes tranchées le
  soir même** (propositions acceptées) ; spec consolidée, plan `tasks/plan.md`
  en six tranches ; **go donné le soir même, T0 puis T1–T6 codées dans la
  nuit** (tests verts sur trois appareils, non commité, à valider en local). Index A–Z :
  ligne « à caser tôt » corrigée (balayage déjà livré le 14/09), petit lot de
  finition proposé avant le look (D7).

- 16/09/2026 : commit du look et du travail non commité (`de882b7`, lot 4
  T0–T7, lot 6 bis, service worker) à la demande de Timothée (Q32), avant les
  lots 5, 7 et 8 ; `tsc` et lint propres, suite Playwright non relancée pour
  ce commit. Entretien des lots 5, 7 et 8 (§ 3.N), trois specs écrites ;
  réponses de Timothée à la remise, **go pour les trois lots**.

## 7. Relecture adversariale (14/09/2026)

Relecteur à contexte vierge (skill `doubt-driven-development`), chargé de
démolir les parties 2 à 5 contre un contrat (pas de doublon, respect du
modèle de données des setlists, zones gelées, Hobby, permissions en double,
dimanche intouchable, trois appareils, FR + 中文). Cross-modèle : Gemini et
Codex ne sont pas installés ; relecture mono-modèle, chaque constat relu
contre le code. Classement : **agir** (le plan change), **arbitrer**
(question à Timothée), **compromis** (accepté tel quel), **bruit**.

| # | Constat | Classe | Résolution | Lot |
| --- | --- | --- | --- | --- |
| 1 | Une étape « Dp » inventée hors du modèle (`dp:…`) n'est pas résolue par `resolveStructureOverride` (uid inconnu → étape ignorée) et **disparaîtrait à l'enregistrement automatique de l'éditeur** (`toFormItem` → `buildSetlistItems`). | agir + arbitrer | **Matérialiser le Dp comme une vraie section** du chant adapté (`contentOverride` + `sectionOrigins`, comme les copies du mode Adapter) : tous les consommateurs (éditeur, PDF, mode louange, copie, sommaire) la voient sans code. Revers : la copie ne suit pas une correction ultérieure du `.cho`. **Tranché** : section du chant adapté, badge « Version modifiée » masqué quand seul un Dp a été ajouté. | 3 |
| 2 | Dp « rendue partout » vs PDF gelé et mode louange inchangé ; entre les lots 3 et 5 le PDF ignorerait une étape à part. | agir | Réglé par 1 : une section réelle sort dans le PDF et le mode louange sans toucher à leur code ; « mode louange inchangé » = ordre joué, pas « sans Dp ». | 3 |
| 3 | La vue partitions a **déjà** une ligne « ORDRE » (`SongView.tsx`, noms complets) ; le bandeau ferait une 4ᵉ représentation (avec puces de la vue liste, sommaire, bandeau 简谱). | agir | Le bandeau **remplace** la ligne ORDRE ; une seule fonction d'abréviation partagée par bandeau, sommaire, vue liste, bandeau 简谱 et PDF compact. Documents corrigés. | 3 |
| 4 | La liste des noms sans compte **existe déjà** (`admin/page.tsx`, « Planning sans compte »). | agir | Lot 1d écarté. Documents corrigés. | 1 |
| 5 | Sections uniques vs mode Adapter (qui vise une **occurrence** tapée), sommaire (défilement indexé par rang) et réglages **par occurrence** (notes, transitions, modulations). | agir | Règles : (a) en mode édition (Adapter), ordre joué forcé ; (b) sommaire indexé par section, pas par rang ; (c) une section n'est réimprimée que si une occurrence change de tonalité (unique par section **et** tonalité) ; (d) notes, transitions et nuances d'occurrence vivent dans le bandeau, le corps ne porte que ce qui est commun. | 3 |
| 6 | Rappels « FR et 中文 » : le serveur ne connaît pas la langue (choisie dans le navigateur) ; la cloche écrit un texte par fournée. | agir | La langue est mémorisée dans `notifPrefs/{uid}` (écrite par le client au changement) ; une entrée de cloche par destinataire. | 1c |
| 7 | Notification au président : type de préférence, trace dans la cloche, anti-doublon, auto-notification et homonymes non définis. | agir | Préférence « Setlist prête » ; `notifLog` `presentation-{setlistId}-{empreinte du lien}` ; l'auteur du lien n'est pas notifié ; nouveau `BellKind` ; tous les comptes d'un même nom sont notifiés. | 2 |
| 8 | Deux vues batteur (mode louange : noms complets agrandis ; vue partitions : bandeau abrégé) et la vue partitions ignore le rôle mémorisé. | agir + arbitrer | Même modèle d'étapes (`resolveSectionOccurrences` + `isRepeatOf`) ; « abréviations partout » se limite aux structures **en ligne** (bandeau, sommaire, vue liste, PDF compact), la vue structure du mode louange garde ses noms complets. **Tranché** : menu d'affichage à trois positions (Ordre joué / Sections uniques / Structure seule), par appareil, présélectionné par le rôle mémorisé. | 3 |
| 9 | Pastille « Sainte Cène » calculée (premier dimanche) vs colonne du Sheet. | compromis | Deux informations différentes (le dimanche de cène ; la personne qui aide) : la pastille reste, le nom s'affiche dès que la case est remplie, quel que soit le dimanche. | 1a |
| 10 | `fetchSheet` ne lit qu'un onglet du fichier fixe ; cache keyé par nom d'onglet. | agir | `fetchSheet(fileId, tab)` avec cache `${fileId}/${tab}` ; second identifiant en constante ; la colonne R de `Franco_Table_PtD` est explicitement ignorée. | 1b |
| 11 | Le rappel « Répétition Campus » reste une 2ᵉ notification ; `servantsForDate` donne un rôle technique, pas « Piano ». | agir | Corps construit par `findMyServices` (libellés « Piano », « Guitare »…), répétition Campus fondue dans le même message ; services Campus toujours exclus des rappels (règle conservée). | 1c |
| 12 | Rôle « événement », pôle « Événement », pôle « Louange » vs `serviceRoles` / `annonces` / `notify` : plusieurs représentations d'un même droit ; cible « régie » de la chaîne DA → régie non définie. | arbitrer (plus tard) | Un seul champ `poles` fixé dans la carte des modules avant le lot 6 ; « Louange » dérivé de `serviceRoles` ; cible « régie » **tranchée le 16/09/2026** : la régie du dimanche d'après le planning (`spec-taches.md`). | 6–7 |
| 13 | Évènements « église » publics vs annonces (texte, section, épinglé) vs planning (dimanches spéciaux, réservé aux connectés) : trois canaux pour une même date. | arbitrer | **Tranché** : les annonces fusionnent dans le calendrier (page Annonces supprimée, annonce sans date = entrée épinglée) ; migration au lot 6. | 6 |
| 14 | Inscriptions sans compte et places max : écritures anonymes et comptage concurrent. | agir | Lot 6 : inscriptions via route serveur (Admin SDK), comptage transactionnel, `events` en lecture publique, protection contre l'abus. | 6 |
| 15 | Nouveaux envois automatiques (échéances, chaîne, évènements) sans type de préférence. | agir | `NOTIF_TYPES` gagne `evenements` et `taches`, filtrés comme les autres. | 6–7 |
| 16 | Table d'abréviations incomplète (post-refrain, final, tag, interlude, sections « autre » à nom libre, 中文) ; « Pm » vs nuance « instrumental » ; type « final » inexistant. | agir + arbitrer | **Tranché** : I · C1 C2… · Pr · R · Po (post-refrain) · P (pont) · Pm (interlude / instrumental) · F (final) · Tag · Dp · ×2 ; sections « autre » = nom écrit (ex. 间奏). La nuance « instrumental » reste une nuance (jouer sans voix), Pm est une section. | 3 |
| 17 | Le bandeau « nuance sous chaque étape + notes + transitions » ne tient pas sur une ligne à 390 px. | agir | Bandeau en grille qui passe à la ligne (étape = abréviation au-dessus de sa nuance) ; notes et transitions sur une ligne fine en dessous, pas en ligne ; **testé sur les trois appareils** avec un pire cas (fusion mélangée, 12 étapes). | 3 |
| 18 | Menu par sections vs barre du bas à 4 onglets figée et navigation sans compte (pas d'entrée vers le calendrier public). | arbitrer (lot 4) | Prérequis écrit du lot 4 : correspondance sections → onglets et navigation anonyme. | 4 |
| 19 | Règle `onboarding/{uid}` à rétablir (permissions en double) ; l'inscription est centrée sur le nom de planning alors que l'assemblée arrive au lot 6. | agir | Lot 8 : règle rétablie. Lot 6 : parcours d'inscription **sans** nom de planning déplacé en prérequis (`comptes-roles`). | 6, 8 |
| 20 | « Compact » n'a pas de sens pour un chant seul ; nuancier absent du PDF ; l'impression navigateur de la vue partitions est déjà un second export. | agir | Compact réservé au PDF de la setlist ; le lot 5 aligne les nuances du PDF sur le nuancier ; l'impression navigateur reste telle quelle. | 5 |

Bilan : 15 constats font changer le plan, 4 arbitrés par Timothée le soir
même (1, 8, 13, 16), 2 à arbitrer au moment de leur lot (12, 18), 1 compromis.
Aucun bruit : le relecteur avait raison partout où il a affirmé un fait.
