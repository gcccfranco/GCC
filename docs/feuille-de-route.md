# Feuille de route — GCC Louange → « GCC »

**Statut** : brainstorming du 14/09/2026 (conversation Timothée ↔ Christelle
le matin, puis entretien Timothée ↔ Claude en 8 tours le soir). Tout est
tranché ; **go donné le 14/09/2026 (soir)** pour les lots dans l'ordre : lots
1a, 1c, 2 et 3 codés (§ 1), **à valider en local par Timothée**, non commités.
Lot 1b codé le 17/09/2026 sans ce fichier ; lot 4 (look) = prochaine étape,
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

**État au 19/09/2026** : tout ce qui précède est commité sur `ui/apple-design`
(le lot 4 aussi, `de882b7`) ; `main` y est fusionné (`98a74fb`) ; la branche a plus
de 40 commits d’avance et **n’est pas poussée : rien n’est en ligne**. Look :
Timothée retient la piste « Verre · Encre » (5C de la planche du 19/09) et
demande des dérivés avec plus de relief (5C1, 5C2, 5C3 publiés, choix attendu).
Règles Firestore : publiées le 19/09/2026 (tout jusqu’au lot 17) ; la règle des
setlists privées du lot cohérence reste à republier.

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
| 14/09/2026 | Chantier 4 **Setlist** : page unique, historique, tonalité recommandée (15 chants) (`spec-setlist.md`) | `SetlistForm.tsx`, `setlists/{id}/history`, `.cho` | commité le 15/09/2026 ; `firestore.rules` publiées (17/09/2026) |
| 14/09/2026 | **Lint réparé** : `.claude/**` et `graphify-out/**` ignorés, objet de règles limité aux `.{js,jsx,mjs,ts,tsx,mts,cts}` (`npm run lint` : 0 erreur, 50 avertissements préexistants en « warn ») | `eslint.config.mjs` | commité le 15/09/2026 |
| 15/09/2026 | Lot 6 **Évènements** : calendrier public, fiches, inscriptions avec invités et sans compte, fusion des annonces (migration par bouton), cloche, QR code, rappel de la veille (`spec-evenements.md`) | section `/evenements`, `api/evenements/*`, `notify-evenement`, `admin/migrer-annonces`, cron, `Navbar`, `access.ts` + `firestore.rules`, admin | commité le 15/09/2026 ; à valider ; `firestore.rules` publiées (17/09/2026) ; migration à lancer |
| 14–15/09/2026 | Lot 3 bis **Programmes de scène, onglet « Noël »** : rôle « événement », onglets par programme, entraînements du dimanche, ordre de passage, conflit, rappels (`spec-programme-scene.md`) | section `/evenements` (layout, `SceneClient`, `EvenementsTabs`), `SectionTabs`, `Navbar`, `access.ts` + `firestore.rules`, `api/scene/conflit`, `cron/reminders`, admin | commité le 15/09/2026 ; à valider ; `firestore.rules` publiées (17/09/2026) ; pôle à donner à Alice ; programme « Noël » à créer |
| 14/09/2026 | Lot 1a **Sainte cène** : index 11 lu, service dans Ce dimanche / onglet Culte / Mes services / rappels, visible si rempli (`spec-planning-petits-lots.md`) | `sheets.ts`, `names.ts`, `planning/page.tsx`, `planning/culte` | commité le 15/09/2026 ; à valider |
| 14/09/2026 | Lot 1c **Rappels regroupés** : une notification par personne et par échéance, services + rôles, FR / 中文 (langue dans `notifPrefs/{uid}.lang`), répétition Campus fondue, une entrée de cloche par destinataire | `reminderMessage.ts`, `cron/reminders`, `notifPrefs.ts`, `recipients.ts`, navbar | commité le 15/09/2026 ; à valider (cron en ligne) |
| 14/09/2026 | Lot 2 **Notification au président** : lien posé ou remplacé → push + cloche « Présentation prête » aux comptes au nom du président (sauf l'auteur), préférence « Setlist prête », anti-doublon par lien ; la régie voit « Président prévenu. » ou « aucun compte relié » (`spec-notif-president.md`) | `/api/setlist/presentation`, `presentationLink.ts`, `PresentationLink.tsx`, cloche | commité le 15/09/2026 ; à valider |
| 15/09/2026 | Lot 4 **Nouveau look** T0–T6 : direction A « Réglages », vignettes teintées, rouge du logo sur les boutons pleins, police du système, navigation par sections (barre du bas Louange · Planning · Évènements · Moi, page « Moi », menu compte), grand titre, index A–Z en lettre agrandie (`spec-look.md`, « Avancement ») | tout le site : `globals.css`, `tailwind.config.ts`, `layout.tsx`, `Navbar`, `MobileTabBar`, `SectionTabs`, `PageTitle`, `Group`, `Tile`, `/moi`, listes, pages secondaires | commité le 16/09/2026 (`de882b7`) ; à valider en local |
| 16/09/2026 | **Bug : le serveur local affichait l'ancien code.** Le service worker servait `/_next/static/*` en cache-first ; en production ces fichiers sont hashés, en développement non — la page arrivait à jour et le JavaScript venait du cache (barre du bas et look figés malgré les modifications). Corrigé : rien n'est mis en cache sur un serveur local, cache purgé à l'activation, `gcc-louange-v3` | `public/sw.js`, `tests/service-worker.spec.ts` (nouveau), `CLAUDE.md` | commité le 16/09/2026 (`de882b7`) |
| 16/09/2026 | Lot 4 **retour tactile** : Timothée trouve l'usage moins bon sur téléphone et tablette ; audit avant/après (la seule régression : les setlists injoignables, Mes services à deux taps) → barre du bas **Chants · Setlists · Planning · Évènements · Moi** (Q9 révisée dans `spec-look.md`), pilules de section à 40 px, commandes du chant à 36 px, catégorie et présidence sur la ligne de setlist ; **QR code retiré de l'onglet Évènements** (gardé sur la fiche d'un évènement pour l'organisateur) ; sélecteur de tonalité du chant réduit à la tonalité quand il est fermé sur tactile (six commandes ne tenaient plus à 390 px) | `MobileTabBar`, `SectionTabs`, `SongDetailClient`, `SetlistCard`, `CalendrierClient`, tests `look-navigation`, `look-louange` et `evenements` | commité le 16/09/2026 (`de882b7`) ; à valider en local |
| 17/09/2026 | Lot 8 **Nouveaux membres et 中文** A1–A4 : accueil de première connexion (5 écrans, une fois par compte), guide à jour et liens « Comment ça marche ? », écrans vides qui disent quoi faire, textes restés en français traduits, messages du serveur dans la langue du destinataire, planche de relecture du chinois publiée ; A5 (captures) après validation du look (`spec-nouveaux-membres.md`, « Avancement ») | `onboarding`, `guide`, `GuideLien`, `ReportDialog`, `PushPrompt`, `SongProposalDrawer`, `JianpuSheet`, routes `setlist/presentation` et `notify-evenement`, `firestore.rules`, locales | commité le 17/09/2026 ; à valider en local ; règle `onboarding/{uid}` publiée (17/09/2026) ; planche à relire |
| 16/09/2026 | Lot 7 **Tâches par pôle** T1–T4 : pôles DA / Média / Orga (Louange = rôle de service), page Tâches et page d'un pôle (en retard, cette semaine, plus tard, faites), tâches répétées, coche qui prévient un pôle ou la régie du dimanche, « Nouvelle tâche » au responsable, rappels dans la notification du jour, réunions de pôle dans le calendrier ; chacun ne voit que ses pôles (`spec-taches.md`, « Avancement ») | `/taches`, `lib/taches`, `api/taches/*`, `cron/reminders`, `access.ts` + `firestore.rules`, Moi, navbar, admin, `EvenementForm` | commité le 16/09/2026 ; à valider en local ; `firestore.rules` publiées (17/09/2026) ; pôles à cocher |
| 16/09/2026 | Lot 5 **Export PDF** P1–P3 : fenêtre « Quel PDF ? » (dernier choix par appareil), nuancier gris dans tous les PDF, couleurs par section comme l'écran (cadre fin, accords noirs), compact de la setlist (bandeau + sections uniques, un chant par page, bandeau au-dessus des scans, transition en bas de page) (`spec-export-pdf.md`, « Avancement ») | `PdfChoiceSheet`, `pdfStylePref`, `lib/pdf/colors` et `compact`, `StructureStripPDF`, `SongPDF`, `SetlistFullPDF`, pages chant et setlist | commité le 16/09/2026 ; à valider en local |
| 17/09/2026 | Lot **1b Petit déj** : lu dans le bloc « PETIT DÉJEUNER » de l'onglet existant `Franco_Table_PtD` (deux paires DATE / NOM, noms « A & B » séparés), ligne dans Ce dimanche **si la case est remplie**, service dans Mes services, fondu dans le rappel groupé, FR / 中文 (`spec-planning-petits-lots.md`) | `sheets.ts`, `names.ts`, `planning/page.tsx`, `reminderMessage.ts`, `serviceColors.ts`, locales | commité le 18/09/2026 (`b358afb`) ; 7 tests × 3 appareils ; à valider en local |
| 17/09/2026 | **Décisions** : capo conseillé **retiré** (§ 5), heure **« 12:00 »** partout (aucun « 12h00 » dans le code), **finition de l'index A–Z** revérifiée — elle était déjà livrée avec la tranche T0 du lot 4, la feuille de route disait le contraire | docs, `tests/songs-index.spec.ts` (18 verts) | fait |
| 17–18/09/2026 | Lot 9 **Harmonie en entier** — fondations (degrés, motifs, 40 règles), H1 catalogue, MV « seulement ce passage », 简谱 retouche d'accord, H2 idées par chant (chant + setlist), H3 idées de l'équipe, H4 transitions ; relu par un relecteur à contexte vierge, **12 défauts prouvés et corrigés** (`spec-harmonie.md`, « Avancement ») | `lib/harmonie/*`, `components/harmonie/*`, `/harmonie`, `scripts/build-harmonie.ts`, `firebase/harmonie.ts`, `lib/jianpu/retouches.ts`, `access.ts` + `firestore.rules`, page du chant, vue partitions, locales | commité le 18/09/2026 (`b358afb`) ; **suite complète 1331 verts** ; **`firestore.rules` à publier** ; fiches à valider famille par famille |
| 14/09/2026 | Lot 3 **Coup d'œil** S1–S3 : bandeau abrégé + nuances, menu « Affichage » (ordre joué / sections uniques / structure seule, par appareil, batteur → structure), sommaire par occurrence, « Dernière phrase » dans l'éditeur (section du chant adapté, badge masqué, historique) (`spec-coup-d-oeil.md`) | `SongView.tsx`, `PartitionView.tsx`, `SetlistOutline.tsx`, `SetlistFormRows.tsx`, `LastPhraseSheet.tsx`, `lastPhrase.ts`, `uniqueSections.ts`, `partitionLayoutPref.ts` | commité le 15/09/2026 ; à valider, résultat à montrer à Christelle |
| 18/09/2026 | Lot 11 **Inscription externe** : champ « Lien d'inscription externe » sur un évènement, le grand bouton ouvre le formulaire, `"externe"` testé en premier dans `refusInscription` (une règle pour la page et le serveur), QR inchangé vers la fiche GCC, formulaire qui refuse le lien si des gens sont déjà inscrits, et la notification « Inscriptions ouvertes » qui ne part plus pour un formulaire externe (`spec-inscription-externe.md`) | `types/evenement.ts`, `agenda.ts`, `rappel.ts`, `EvenementForm`, `Inscriptions`, `EvenementCard`, locales | codé en arbre isolé, commit `980a828`, fusionné le 18/09/2026 ; 10 tests × 3, suite évènements 79 × 3 ; **rien à publier** ; à valider en local |
| 18/09/2026 | Lot 12 **Noël / Pâques** : après le jour J, message pendant 7 jours puis archivage ; bascule automatique vers le programme suivant ; `visible` devient un épinglage ; un programme créé ne vole plus l'onglet ; le cron suit la même règle pure (`spec-programme-bascule.md`) | `lib/scene/dimanches.ts`, `SceneClient`, `EvenementsTabs`, `cron/reminders`, locales | codé en arbre isolé, commit `760c7b4`, fusionné le 18/09/2026 ; 43 tests × 3 ; **rien à publier** ; à valider en local |
| 18/09/2026 | Lot 13 **Tâches** : rythme « Chaque année », trois états À faire → En cours → Terminé sur le même cercle, relance en une ligne du rappel du matin après l'échéance (jamais une notification de plus) (`spec-taches-annuelles.md`) | `types/tache.ts`, `lib/taches/*`, `firebase/taches.ts`, `api/taches/fait`, `cron/reminders`, `TacheLigne`, `TacheForm`, locales | codé en arbre isolé, commit `f3017ce`, fusionné le 18/09/2026 ; 39 tests × 3 ; **rien à publier** ; à valider en local |
| 16–17/09/2026 | Lot 6 bis **Look de l’onglet Évènements** L1–L6 et retours du 17/09 (carte de gestion, « Fermées », noms des inscrits visibles des connectés) (`spec-evenements-look.md`) | `EvenementCard`, `EvenementClient`, `Inscriptions`, `EvenementForm`, `access.ts` + `firestore.rules` | `de882b7`, `b358afb` |
| 17/09/2026 | **Période d’inscription** P1–P4 : Automatique / Ouvertes / Fermées, ouverture et fin datées, raison affichée, ligne « Inscriptions ouvertes » du jour (`spec-inscriptions-periode.md`) | `types/evenement.ts`, `ChoixInscriptions`, `agenda.ts`, cron | `b358afb` |
| 17/09/2026 | **Avant / après dans l’historique des setlists** H1–H4 (`spec-historique-avant-apres.md`) | `lib/setlist/history.ts`, `SetlistHistory` | `b358afb` |
| 18/09/2026 | Lot 10 **Suppression groupée des setlists** S1–S3 (`spec-suppression-groupee.md`) | `setlists/page.tsx`, `firebase/setlists.ts` | `b2f180f` |
| 18/09/2026 | Lot 16 **Organigramme, source des pôles** O1–O5 (`spec-organigramme.md`) | `/equipes`, `api/equipes/*`, `lib/equipes/*`, admin, `access.ts` + `firestore.rules` | `4356b82` |
| 18/09/2026 | Lot 17 **Planning en grille** G1–G3 : lecture, droits cochés par un admin, écriture case par case, historique nommé ; **affichage trimestre par trimestre** (demande de Timothée du 18/09 au soir, contre « grille continue ») (`spec-planning-grille.md`) | `PlanningGrille`, `lib/planning/grille*.ts`, `planningGrille.ts`, admin, `access.ts` + `firestore.rules` | `3941418`, `ef3f014` |
| 19/09/2026 | **Fusion de `main`** (简谱 63–64, 50 planches en images, liens YouTube et correctifs de chants de David) ; index régénérés | `content/songs`, `public/jianpu`, `scripts/jianpu` | `98a74fb` |
| 19/09/2026 | **Audit complet** (spec vs code, cohérence du code, lien tâches ↔ évènements) : rapport https://claude.ai/artifact/77TtncfpDhky5eCv5NchbA ; planche de look https://claude.ai/artifact/HNDu1pSHipBnuG7MuDCqbR | — | — |
| 19/09/2026 | **Lot cohérence** : cinq bugs (profil qui effaçait `poles` / `equipes` / `plannings` d’un admin, réunions de pôle absentes de la cloche, Équipes et Harmonie injoignables, deux manifestes PWA, préférence « Annonces » morte) et les petites incohérences (setlist privée modifiable en REST, quatre `normalize`, deux pushs en français seul, casse des e-mails admin, `fontkit`) | `users.ts`, `useNotifications`, `Navbar`, `/moi`, `manifest.ts`, `types/user.ts`, `firestore.rules`, `push/messages.ts`, `tests/coherence.spec.ts` | `e2d4c54` ; **`firestore.rules` à republier** (setlists) |
| 19/09/2026 | Lot 17 **G4, G5, G6** : export CSV et PDF de toute grille, import initial par bouton admin, fin du repli 2026 du Culte, **les onze grilles remplies dans l’app** (Table + petit déj, EDD par classe, Campus matin / soir, Intergroupe, Interfranco, trois groupes, musiciens de Fidélité) (`spec-planning-grille.md`, « 19/09/2026 ») | `lib/planning/{grilles,sheets,csv,import,useGrilleApp}.ts`, `PlanningGrille`, `PlanningPDF`, pages du planning, `api/admin/importer-planning`, admin | à valider en local ; aucune règle à publier |

## 2. À construire, dans l'ordre validé le 14/09/2026

Chaque lot : spec courte soumise à Timothée, test écrit d'abord, captures
regardées sur les trois appareils (1 chant FR + 1 chant ZH quand un chant
s'affiche), un commit par lot, sur demande.

| # | Lot | Contenu tranché | Où | Taille |
| --- | --- | --- | --- | --- |
| 1 | **Planning, petits lots** (demandés pour T4) — **1a et 1c codés le 14/09/2026 ; 1b codé le 17/09/2026 sans attendre le Sheet de Christelle (go)** | (a) colonne **Sainte cène** : index 11 de `Franco_Louange`, service à part entière (Ce dimanche, onglet Culte, Mes services, rappels), visible seulement si remplie ; (b) **petit déj** : lu dans le bloc « PETIT DÉJEUNER » de l'onglet existant `Franco_Table_PtD` (17/09/2026 : « le lot 1b sans le sheet »), ligne dans Ce dimanche + Mes services + rappels, pas d'onglet ; le fichier à part de Christelle ne changera que le parseur ; (c) **rappels regroupés** : une seule notification par personne et par échéance (J-7, J-3, J-1) qui liste ses services avec le rôle, « Dimanche 20 septembre : Culte Franco (Piano) · Petit déj », FR et 中文 (langue à mémoriser côté serveur, voir § 7) ; ~~(d) liste admin des noms sans compte~~ : **existe déjà** (« Planning sans compte » dans l'administration), écarté | `sheets.ts`, `names.ts`, `planning/page.tsx`, `planning/culte`, `cron/reminders`, `notifPrefs` | 3 lots S |
| 2 | **Notification au président** — **codé le 14/09/2026** | Décidée le 14/09 (matin) : automatique quand le lien de présentation est posé ou remplacé ; retrait = rien ; sans compte relié = rien, la régie le voit | `/api/setlist/presentation`, `push/send` | S |
| 3 | **Structure « coup d'œil »** — **S1 à S3 codées le 14/09/2026 sur go** | **Bandeau** en tête de chaque chant de la vue partitions, **à la place de la ligne « ORDRE » actuelle** : structure abrégée (I, C1, C2…, Pr, R, P, Inst, F, Pm, Dp, « ×2 »), **nuance sous chaque étape**, notes et transitions ; **sections uniques** en dessous (chaque section une fois), réglage par appareil **activé par défaut** ; **batteurs** = bandeau seul, sans paroles ni accords ; **Dp** = étape « Dernière phrase » dans l'éditeur (section source + N dernières lignes, aperçu), **matérialisée comme une vraie section du chant adapté** (`contentOverride` + `sectionOrigins`, mécanisme du mode Adapter ; badge « Version modifiée » masqué quand seul un Dp a été ajouté — tranché le 14/09/2026) ; **menu d'affichage** de la vue partitions à trois positions « Ordre joué / Sections uniques / Structure seule », mémorisé par appareil, défaut « Sections uniques », « Structure seule » présélectionné si le rôle mémorisé du mode louange est Batteur ; **table d'abréviations** : I · C1 C2… · Pr · R · Po · P · Pm · F · Tag · Dp · ×2, sections « autre » = nom écrit ; **Pm** = pont musical (instrumental) ; abréviations françaises partout, même en 中文 ; **mode louange inchangé** (ordre joué, le Dp y apparaît comme une section). Règles des sections uniques et du bandeau : § 7. **Codé directement, résultat montré à Christelle par Timothée** | `PartitionView.tsx`, `SongView.tsx`, `JianpuStructureStrip.tsx`, `SetlistFormRows.tsx`, `formItems.ts`, `editSource.ts`, `ListView.tsx`, `SetlistOutline.tsx`, `sectionSteps.ts`, `history.ts` | M |
| 3 bis | **Planning de la scène avant Noël** (Christelle et Alice, 14/09/2026 à 18:37) — **position tranchée le 14/09/2026** : avant le look, parce que la scène se réserve dès novembre | Nouvel onglet **« Scène »** du planning, **rempli dans l'app** (pas de Google Sheet : « c'est plus simple directement sur GCCLouange ») — premier planning saisi dans l'app ; modèle visuel = onglet Campus, **deux volets** : (1) **Entraînements** : créneaux sur scène par jour (date, heure de début et de fin, groupe — entraînement franco, louange 25, chants EDD, spectacle… —, responsable, note), posés par tout membre connecté, modifiables par leur auteur et les admins, un créneau pris reste visible de tous avec son groupe ; (2) **Passage le jour J** : ordre de passage du jour de Noël (numéro, groupe, titre ou chant, durée, responsable), tenu par Alice (coordination) et les admins. Réservé aux connectés (nominatif). Sans rappel push dans un premier temps. Paris détaillés en § 3.K | nouvel onglet `src/app/planning/scene/` (déclaré dans `src/components/planning/PlanningTabs.tsx`), nouvelle collection Firestore + `firestore.rules` + `access.ts` (en double), `serviceColors.ts` (couleur d'onglet, fichier gelé : à valider) | M |
| 3 bis | **Programmes de scène, onglet « Noël »** — **codé dans la nuit du 14 au 15/09/2026**, refait en onglet unique le 15/09 (`spec-programme-scene.md`), 27 tests × 3 appareils, non commité, à valider ; vit dans la nouvelle **section « Évènements »** (tranché le 15/09/2026) | Un onglet par programme (nom, jour J 24/12/2026, réservations d'octobre au 20/12), affiché ou masqué par la coordination (rôle « événement » = Alice, + admins) ; volet **Entraînements** = dimanches (« Scène libre » si vide), créneaux 17:00–18:00 par défaut, Quoi / Qui en dur, refus des chevauchements + alerte des deux auteurs si un conflit passe ; volet **« Programme Noël »** = ordre de passage numéroté, à la main ; rappels fondus dans ceux du lot 1c ; après le 20/12 le programme seul | `planning/programme/[id]`, `planning/programmes`, `PlanningTabs`, `access.ts` + `firestore.rules`, `api/scene/conflit`, cron `reminders`, admin (pôle) | M |
| 3 ter | **Version perso d'un chant dans une setlist** (Timothée, 14/09/2026 soir) — **spec `spec-version-perso.md` tranchée le 14/09/2026 soir (position 3 ter, une retouche d'une section répétée touche toutes ses répétitions en V1, libellés), go donné le soir même, V1 + V2 + V3 codées le 15/09/2026 (18 tests × 3 appareils), à valider en local ; `firestore.rules` à publier** | Chaque musicien se fait **sa version** d'un chant de la setlist : sections choisies et ordonnées (C R P une fois chacune), accords et paroles retouchés, pour lui seul, **dans cette setlist seulement**, sans toucher la structure ni la version de la présidence (liste, bandeau, PDF, lien de présentation, copie des paroles inchangés) ; ses accords et paroles peuvent être **partagés sous son nom** (« Version de Christelle ») et choisis par les autres, chacun gardant son choix ; la structure perso ne se partage jamais ; le mode louange suit la version choisie et ma structure ; « Adapter » reste l'outil de la présidence. Trois tranches : V1 accords et paroles, V2 structure, V3 partage et sélecteur | sous-collection `setlists/{id}/versions/{uid}` + `firestore.rules` + `access.ts` (en double), `SetlistDetailClient.tsx`, `PartitionView.tsx`, `blocks.ts`, `PerformanceMode.tsx`, `SectionStructureEditor` réutilisé | M |
| 4 | **Nouveau look** (chantier 5) | Direction visuelle à rechoisir (sobre, moins fade, moins « document ») ; **nom « GCC »**, menu par sections ; toutes les pages, mis en ligne d'un bloc ; pages d'administration au nouveau style sans réorganisation — **planche du 15/09/2026** : trois directions (A Réglages, B Musique, C Crème relevée), fondations communes et sept décisions dans `spec-look.md`, planche https://claude.ai/artifact/3AXs4eYYCedEAYa8bgW8zL ; **tout tranché le 15/09/2026 au soir** (A Réglages, vignettes teintées, accent rouge du logo réservé aux boutons pleins, police système, onglets Louange · Planning · Évènements · Moi, page « Moi », grand titre replié, sombre noir pur, pilule d'outils du chant : détail `spec-look.md` § « Ce qui est construit », plan `tasks/plan.md`, six tranches T1–T6) ; **go donné le 15/09/2026 au soir, T0–T6 codées le jour même, à valider en local** (voir § 1) | tout le site ; `docs/audit-ui-apple-design.md` | L |
| 5 | **Export PDF** (chantier 6) — **spec `spec-export-pdf.md` écrite le 16/09/2026 après entretien (§ 3.N), go donné et codé le jour même (§ 1)** | Choix au téléchargement : **classique / couleurs par section / compact** (bandeau + sections uniques) ; pour un chant et pour la setlist. La « demande via GCC » de Christelle = couleurs par section | `SongPDF.tsx`, `SetlistFullPDF.tsx` | M |
| 6 | **Évènements** (nouveau module) — **spec écrite le 15/09/2026 (`spec-evenements.md`), 19 questions tranchées, **go donné le 15/09/2026, codé le jour même** (36 tests × 3, suite 663 verte), non commité, à valider** | Calendrier public (agenda par mois, rien de nominatif), fiche complète (titre, type sport / loisir / musique / église / info, pour toute l'église ou une section, dates, lieu, description, liens, images, places, contact), créée par la coordination ou par les détenteurs du droit d'annonces pour leur section ; **inscription avec compte + invités** (nombre), sans compte au choix de l'organisateur (nom + invités, via le serveur), « Complet » sans liste d'attente ; **évènements annuels** dupliqués à la main ; **QR code** (bibliothèque `qrcode`) ; push à la création + rappel la veille aux inscrits, préférence « Évènements » ; **annonces fusionnées** (type info épinglé, migration par bouton admin, badge transféré, entrée Annonces retirée) | section `/evenements` (public), `/evenements/[id]`, `/evenements/scene`, routes `api/evenements/*`, `notify-evenement`, cron, admin, `access.ts` + `firestore.rules` | L |
| 6 bis | **Look de l'onglet Évènements** (maquette de Timothée, 16/09/2026 : liste avec état d'inscription, fiche avec bannière et bouton plein, vue organisateur avec panneau des inscriptions, formulaire réordonné) — **spec écrite puis go le 16/09/2026** (`spec-evenements-look.md`, quatre recommandations retenues) ; **L1–L6 codées le 16/09/2026** (L6 : même carte blanche sur ordinateur, téléphone et tablette), non commité, à valider en local | `EvenementCard`, `EvenementClient`, `Inscriptions`, `EvenementForm` ; aucun champ nouveau | M |
| 7 | **Tâches par pôle** (nouveau module) — **spec `spec-taches.md` écrite le 16/09/2026 après entretien (§ 3.N), go donné et codé le jour même (§ 1)** | Pôles : **DA, Média, Orga, Louange, Événement**. Tâche = pôle, responsable, échéance, état, lien (fond Canva…) ; **rappel d'échéance** via le cron quotidien ; **chaîne** : tâche marquée faite → le pôle suivant est notifié (DA → régie). Cadré par un entretien à part | nouveau module | L |
| 8 | **Nouveaux membres et 中文** (chantier 7) — **spec `spec-nouveaux-membres.md` écrite le 16/09/2026 après entretien (§ 3.N), go donné le jour même ; A1–A4 codées le 17/09/2026 (§ 1), A5 après validation du look** | Accueil à la première connexion (nouveau style), guide plus visible, textes restés en français ; d'autant plus utile que l'assemblée entière arrive | onboarding, `/guide`, locales | M |
| 9 | **Harmonie : aides à la réharmonisation** (Timothée, 17/09/2026) — **go pour le lot entier le 17/09/2026 au soir ; H0 (69 fiches) écrit, H1 · MV · 简谱 · H2 · H3 · H4 codés le jour même** (`spec-harmonie.md`, « Avancement ») | Pour les **pianistes et guitaristes** (planning) et les admins : catalogue **« Harmonie »** (12 familles, 60 fiches et plus, 12 sensations × 7 moments × niveau, piano / guitare, capo, diagrammes, « Par où commencer », tous les exemples du répertoire) ; **« Idées d'harmonie »** sur un chant (règles automatiques « À vérifier en jouant », 5 puis « Voir plus », « Essayer dans Ma version », « Appliquer à la setlist » pour une modulation, « Ne marche pas sur ce chant ») ; **Ma version : « Seulement ce passage »** ; **retoucher un accord sur un scan 简谱** (Ma version et Adapter) ; idées de l'équipe ; transitions entre chants. Jamais en mode louange, aucun son. Sept lots : H0 fiches → H1 catalogue → MV → 简谱 → H2 suggestions → H3 idées → H4 transitions | `src/app/harmonie/`, `src/lib/harmonie/`, `src/components/harmonie/`, `content/harmonie/`, `docs/harmonie/`, `setlistVersions.ts`, `JianpuSheet.tsx`, `SongView.tsx`, `PartitionView.tsx`, `access.ts` + `firestore.rules` | L |
| 10 | **Suppression groupée des setlists** (Christelle, 18/09/2026) — tranché le 18/09/2026, **codé le 18/09/2026** (`spec-suppression-groupee.md`, `b2f180f`) | Bouton « Sélectionner » en tête de la liste des setlists ; cases à cocher sur les seules setlists qu'on a le droit de supprimer (les siennes, tout pour un admin) ; « Supprimer (3) » avec confirmation qui **nomme** les setlists. Aujourd'hui on ne supprime que depuis la fiche (`SetlistDetailClient`, menu ⋯) | `setlists/page.tsx`, `SetlistCard.tsx`, `firebase/setlists.ts` | S |
| 11 | **Inscription externe (Google Forms)** (Christelle, 18/09/2026) — tranché le 18/09/2026 | Champ « Lien d'inscription externe » sur un évènement : rempli, le grand bouton de la fiche devient « S'inscrire » et ouvre le formulaire (l'app ne compte ni places ni inscrits) ; le **QR continue de pointer vers la fiche GCC**, pas vers le Forms (l'affiche fait entrer dans l'app). Le champ `liens` existe déjà mais n'est pas un bouton d'inscription | `types/evenement.ts`, `EvenementForm`, `EvenementClient`, `agenda.ts` | S |
| 12 | **Noël / Pâques : archivage et bascule automatiques** (Timothée, 18/09/2026) — tranché le 18/09/2026 | Après le jour J, l'onglet affiche **7 jours** « Noël, c'est passé » sans programme ni réservations, puis **s'archive** ; s'il existe un autre programme dont les réservations sont ouvertes, l'onglet **bascule dessus** et prend son nom. Alice garde Afficher/Masquer. **Un seul programme à la fois conservé** parce que `overlaps()` ne compare que les créneaux du programme courant : deux onglets simultanés laisseraient deux groupes réserver la scène à la même heure sans alerte | `SceneClient.tsx`, `lib/scene/dimanches.ts` | S |
| 13 | **Tâches : rythme annuel, « en cours », relances** (Christelle, 18/09/2026) — tranché le 18/09/2026 | Rythme **« an »** ajouté à semaine / 2 semaines / mois (pas de bouton « dupliquer » : la tâche se regénère) ; trois états par échéance **À faire → En cours → Terminé** ; une tâche en cours reste dans la notification groupée du matin (« En cours depuis 3 jours ») **sans notification supplémentaire**, et **seulement après l'échéance dépassée** (règle du lot 1c). Aujourd'hui : fait / pas fait, rappels J-3, J-1 et **le lendemain** de l'échéance (rien le jour même, `messages.ts` l. 40-46), au responsable ou à tout le pôle | `types/tache.ts`, `lib/taches/*`, `cron/reminders` | M |
| 14 | **Tâches ↔ évènements** (Christelle, 18/09/2026) — tranché le 18/09/2026 ; **go de Timothée le 19/09/2026 sur les lectures (a) et (e) de l’audit** : champ `evenement` facultatif sur la tâche + bloc « Tâches » sur la fiche, et glissement des échéances à la duplication (pas de champ « J-14 », pas de modèle, pas de back office) ; en cours | Lien **à sens unique** : une tâche peut pointer un évènement, avec une échéance **relative au jour J** (« J-14 ») ; bloc « Tâches » sur la fiche, visible des seuls membres d'un pôle, avec « Nouvelle tâche » pré-remplie ; dupliquer un évènement annuel propose de **dupliquer ses tâches**, échéances recalculées. Pas de « back office » séparé : la page *Tâches* est déjà réservée aux pôles | `types/tache.ts`, `EvenementClient`, `/taches` | M |
| 15 | **Petit déj dans l'app** (Christelle + Timothée, 18/09/2026 : « si c'est pas google sheets* » → « Le faire sur le site ») — tranché le 18/09/2026 | **Compte obligatoire** (« faut les forcer un peu à s'inscrire »). **Pas de compteur de places** : un dimanche est « Libre » ou porte une équipe ; s'inscrire ajoute une ligne pré-remplie à son nom, **réécrivable** (« Famille Chung ») ; chacun retire **sa** ligne, un admin n'importe laquelle. Notif du **mercredi** fondue dans le rappel du matin, seulement si le dimanche est libre, préférence « Petit déj » activée par défaut avec « Ne plus recevoir » dans le corps. Fusionné dans l'onglet **Table** (pas de 9ᵉ onglet). L'app fait foi, le Sheet reste lu en repli | `planning/table`, nouvelle collection Firestore, `reminderMessage.ts`, `notifPrefs` | M |
| 16 | **Organigramme, source des pôles** (Timothée, 18/09/2026 : « et aussi avoir un organigramme et tout ? ») — tranché le 18/09/2026 | Les 13 teams de l'onglet **ORGANIGRAMME** du Sheet (Orga, Comité Franco, DA, Médias, Développement, Régie, Traduction, Théologie, Événementiel, Décoration, Accueil J1, Louange, EDD), tenues **dans l'app** avec référent, membres et mention « en essai » ; placer quelqu'un dans une team **lui donne le pôle** (fin du cochage à la main). La matrice **TEAM MUSICIENS** n'est **pas** ressaisie : elle est **calculée** depuis `serviceRoles` (même information, 28 noms × 8 groupes), cases cliquables vers les fiches. Entrée « Équipes » dans *Moi*, pas un onglet de Planning | `/moi`, nouvelle page Équipes, `types/user.ts`, `access.ts` + `firestore.rules` | L |
| 17 | **[G1–G3 codés le 18/09/2026 ; G4, G5, G6 codés le 19/09/2026 : tous les plannings se remplissent dans l'app et s'exportent en CSV ou en PDF ; affichage trimestre par trimestre depuis le 18/09 au soir]** **Planning en grille dans l'app** (Timothée, 18/09/2026 : « on ouvre maintenant ») — tranché le 18/09/2026 ; **planche cliquable publiée et VALIDÉE le 18/09/2026** (« Le planning comme ça c'est OK ») : https://claude.ai/artifact/BFqAet6GiSsY5z3FyX4LLn — la forme est arrêtée, spec `spec-planning-grille.md` | Trois tranches : **(1) grille en lecture** (`Franco_Louange` affiché comme le Sheet, Christelle écrit toujours dans Google, risque nul) ; **(2) écriture sur le seul Culte Franco** (import initial par bouton admin, rattachement des noms par `planningName`, liste des non-rattachés ; export **CSV** ; le Sheet devient l'archive) ; **(3) les groupes et le reste**, seulement après trois dimanches sans incident. **Apparence** : grille complète sur ordinateur et tablette, **une carte par dimanche sur téléphone** (option B, 11 colonnes ne tiennent pas dans 390 px). **Droits** : nouveau champ `plannings: string[]` sur le profil, **coché par un admin planning par planning** (« il faudrait que l'admin puisse choisir qui est autorisé à modifier les plannings et lesquels »), sur le modèle de `annonces` et `notify` ; les autres **lisent seulement** — qui n'est pas dispo envoie un message, comme aujourd'hui (seul le petit déj permet de se retirer soi-même). **Trimestre conservé** (groupe + période + jour) en **bandeau** au-dessus d'une grille continue, sans couper en quatre. Saisie libre acceptée pour les noms sans compte (« Pasteur ZHOU »). Enregistrement **case par case**, historique nommé, **pas de fenêtre de conflit** | `planning/*`, nouvelle collection Firestore, `sheets.ts`, `types/user.ts`, `access.ts` + `firestore.rules`, admin | XL |

Toujours vrai : **index A–Z balayable** : le balayage est codé et commité
depuis `b395745` (14/09/2026), revérifié le 15/09/2026 (Chromium, vrais
événements tactiles) ; sa **finition** (lettre visible sous le doigt, barre du
haut fixe pendant le geste, marge de défilement — décision D7 de
`spec-look.md`) a été codée dans la tranche T0 du lot 4 et commitée avec lui
(`de882b7`) : **rien ne reste**, revérifié le 17/09/2026 (18 tests verts sur
les trois appareils, `tests/songs-index.spec.ts`). Le **capo conseillé** est
**retiré** (§ 5, 17/09/2026). Idée « modifié depuis ta dernière visite ».

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

### D. Petit déjeuner sur un Google Sheet à part → lot 1b (codé le 17/09/2026)

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

**Repris le 17/09/2026** — Timothée : « le lot 1b sans le sheet ». On ne
l'attend plus : le bloc « PETIT DÉJEUNER » de `Franco_Table_PtD` est lu tel
qu'il est (deux paires DATE / NOM, noms écrits « A & B »). Le fichier à part,
s'il arrive, ne changera que `parsePetitDej`.

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

### O. Avant / après dans l'historique des setlists (Timothée, 17/09/2026) → `spec-historique-avant-apres.md`

**Mots de Timothée** : « Pour le système d'historique des modifications c'est
possible de mettre en évidence ce qui a été rajouté et enlevé par rapport à la
structure précédente ? avoir un avant après ».

**Ce que le code montre** : une entrée d'historique ne garde que des phrases
(« Structure de … modifiée »), aucun état d'avant ni d'après ; les entrées déjà
écrites ne pourront pas en avoir.

**Tranché le 17/09/2026** : avant / après pour **la structure de chaque chant
et la liste des chants** (« Les deux ») ; en plus, **les notes seulement**
(« juste les structures, plus les notes »). Nuances, transitions, 升调, accords
et paroles adaptés gardent leur phrase seule. Q1–Q4 de la spec (quelles
notes, chant déplacé, ce qui est ouvert d'office, marques) : **« ok pour les
recommandations, go »** (17/09/2026). **H1–H3 codées le jour même** (captures
regardées), non commitées, à valider en local. Le soir : abréviations en double
(deux « Intro ») jugées « pas très grave » ; contre-épreuve des tests, test du
mode Adapter, suites relancées ; **go pour les fusions** (H4 : l'ordre mélangé
traité comme un chant, notes avec avant / après, nuances et transitions en
phrase seule), codé le soir même. 25 tests × 3 appareils.

### P. Harmonie : aides à la réharmonisation (Timothée, 17/09/2026) → `spec-harmonie.md`

**Mots de Timothée** : « Pour les musiciens (pianiste et guitariste) j'aimerais
mettre à leur disposition des aides pour qu'ils fassent des réharmonisations,
pour pouvoir ajouter du nouveau dans les chants. Soit une liste exhaustive de
tout ce qu'ils peuvent faire en progressions d'accords avec la sensation
associée (épique, tension…), soit, en fonction du chant, des recommandations
pour améliorer / réharmoniser / ajouter un petit plus. »

**Ce que le code montre** : 371 chants, tous avec accords et tonalité ; le
site sait situer un accord en degré (transposition) ; « Ma version » existe
mais une retouche touche toutes les répétitions ; aucune IA, aucun diagramme,
aucun son ; l'instrument n'est connu que par les plannings ; le site ne
connaît pas la mélodie ; sur un scan 简谱, chaque accord imprimé est repéré mais
n'est relié à aucun accord du `.cho`, et le 升调 ne s'y voit pas.

**Tranché le 17/09/2026** (entretien en sept tours) : former **et** inspirer
un dimanche ; préparation et répétition, **jamais en mode louange** ; **aucun
son** ; bilingue. **Les deux** : catalogue d'abord (12 familles, dont voicings,
rythme harmonique et boucles pour la prière libre ; notes tenues, épurer et
jouer à deux écartés), **le plus complet possible (60 fiches et plus)**, fiches
séparées par instrument sur une base commune, diagrammes, capo, « Par où
commencer », tous les exemples du répertoire ; puis suggestions par chant par
**règles automatiques** + **idées de l'équipe**. Accès : **pianistes et
guitaristes** (plannings) + admins. Fiches écrites par Claude, **validées par
Timothée famille par famille**, catalogue ouvert au fur et à mesure.
Modulation : « Appliquer à la setlist » (升调 existant). **Ma version apprend
« Seulement ce passage »** (« avant même que l'équipe le demande »). **Scans
简谱 : toucher un accord pour le changer, l'effacer ou en ajouter un**, dans Ma
version et Adapter. Sept lots, H0 → H1 → MV → 简谱 → H2 → H3 → H4. Les
trois questions ouvertes de la spec sont tranchées le jour même, propositions
acceptées : dans une version partagée, le dernier passage reste le dernier et
les autres se repèrent par leur rang ; chants les plus chantés comptés dans le
navigateur ; degrés en chiffres (1 4 5 6m b7).

### Q. Conversation Christelle du 17→18/09/2026 → lots 10 à 17

**Mots de Christelle** (WhatsApp, nuit du 17 au 18/09/2026, transmise en
captures par Timothée le 18/09) :

- **Cours de théologie** : « on pourra aussi s'inscrire via l'onglet évènement
  mais c'est ce que je trouvais que c'était mieux de pouvoir mettre un lien
  cliquable vers google forms ou sheets » ; « y'a un QR code que tu peux mettre
  sur les affiches ».
- **Lieu** : « possibilité que pour le lieu, si on met une adresse ça sort une
  liste déroulante d'adresse jsp s'il faut une api google maps ou quoi ? »
- **Petit déj** : « si c'est pas google sheets* » → Timothée : « Le faire sur le
  site » ; « du coup tout le monde doit se créer un compte alors ? » → « faut
  les forcer un peu à s'inscrire » → « ouais » ; « le petit déj, pas tout le
  monde est chaud pour faire ».
- **Tâches** : « les tâches c'est tjrs les mêmes à dupliquer et à remettre à la
  bonne date butoir de l'an prochain » ; « ça envoie notif au pôle concerné pour
  rappel de réaliser la tâche » ; « dès qu'il a fait il peut cliquer que c'est en
  cours ou terminé » ; « tant que c'est en cours, y'a des notifs ».
- **Tâches et évènements** : « faudrait voir si c'est mieux ou pas de relier »
  → Timothée : « je pense que c'est mieux » ; « les events annuels apparaissent
  aussi dans le calendrier event mais ils auront pas tous des inscriptions
  (genre 1e mai inscription, noel pas besoin, paques non plus) » ; « selon le
  profil si on est “interne” bah on peut ajouter des taches fin voir la vue back
  office/outil ».
- **Setlists** : « dans les setlist privés possibilité d'ajouter une
  fonctionnalité de supprimer sans forcément aller dans la setlist ? genre d'ici
  j'ai un bouton de suppression groupée ».
- **Lancement** : QR code affiché par les présidents de groupe, présentation aux
  groupes, « quand t'aurais la version 2.0 ? » ; « si y'a des choses à ajouter
  c'est ce mois qu'il faut le faire ».

**Mots de Timothée** (18/09/2026) : « Dit moi ce qu'il reste à faire […] il faut
faire en sorte que tout ce qui a été décidé puisse être fait sur le site » ;
« je vais lui montrer en local sur mon mac d'abord » ; « on ouvre maintenant
dans l'app » (plannings) ; « est ce que tu peux faire en sorte que le planning
qu'on fait sur le site ait la même apparence que le google sheet qu'on a
aujourd'hui. Et aussi avoir un organigramme et tout ? » ; « il faudrait que
l'admin puisse choisir qui est autorisé à modifier les plannings et lesquels » ;
« il faut que t'utilises tous les skills qui sont à ta disposition ».

**Ce que le code montre (18/09/2026)** :

- Le champ `liens` d'un évènement affiche déjà des liens cliquables, mais aucun
  n'est un **bouton d'inscription** ; le QR (`QrCodeLink`) pointe vers la fiche.
- Les rappels de tâche existent (J-3, J-1 et **le lendemain** de l'échéance —
  rien ne part le jour même, `lib/taches/messages.ts` l. 40-46 ; la ligne « jour J »
  de ce document était fausse, corrigée le 18/09/2026) et vont **au responsable, ou
  à tout le pôle** quand la tâche n'en a pas (`cron/reminders`, l. 113) : « notif
  au pôle concerné » est déjà fait. Manquent le rythme **annuel** (`Rythme` =
  semaine / 2semaines / mois) et l'état **en cours** (`Fois` = faite, ou rien).
- Aucun lien entre une tâche et un évènement.
- Une setlist ne se supprime que depuis sa fiche (`SetlistDetailClient`, menu ⋯).
- Le petit déj est **lu** dans `Franco_Table_PtD` (lot 1b), jamais écrit.
- `reservationsClosed` fait **déjà** disparaître les entraînements après le
  dernier dimanche avant le jour J ; rien ne se passe **après** le jour J,
  l'onglet reste jusqu'à ce qu'Alice le masque. `overlaps()` ne compare que les
  créneaux **du programme courant**.
- Le profil porte déjà des droits attribués par un admin, `annonces: string[]` et
  `notify: string[]` : le modèle exact demandé pour les plannings.
- `serviceRoles: Record<string, ServiceRole[]>` est **la matrice TEAM MUSICIENS**
  du Sheet, colonne pour colonne (28 noms × 8 groupes).
- L'onglet **ORGANIGRAMME** (`gid=496690710`) n'est **pas lu** : `sheets.ts` ne
  connaît que les 8 onglets de planning. `Franco_Louange` = 11 colonnes ×
  ~52 dimanches, coupé par trimestre ; les onglets de groupe portent l'horaire
  dans leur en-tête (« GROUPE PAIX · Janvier à Mars 2026 · Dimanche de 13h à
  14h30 ») et des noms fragiles (`Paix _T2`, `Bonté _T3`).

**Tranché (entretien « grill » en cinq tours, 18/09/2026, Q1–Q30)** : voir les
lots 10 à 17 de la partie 2. Les points qui ne se lisent pas dans un lot :

| # | Décision |
| --- | --- |
| Q1 | La V2.0 est **montrée en local sur le Mac de Timothée** d'abord, pas déployée dans l'urgence. `main` est à **25 commits** derrière `ui/apple-design` et la branche n'est pas poussée : rien de tout cela n'est en ligne. |
| Q2 | **QR code du site écarté** : « je vais créer un QRCode moi-même ». |
| Q5 | **Autocomplétion d'adresse abandonnée** (« on abandonne ça ») : ni API Google Maps, ni suggestion des lieux déjà saisis. Le lieu reste un champ libre. |
| Q7 | Relance d'une tâche « en cours » : **pas de notification supplémentaire** (règle du lot 1c), seulement une ligne dans le rappel du matin, après l'échéance. Proposition acceptée contre la lettre de la demande (« tant que c'est en cours, y'a des notifs »). |
| Q26 | Le Planning **reste à 8 onglets** : petit déj fondu dans « Table », organigramme sorti dans *Moi* sous « Équipes ». |
| Q28 | **Pas de fenêtre de conflit** sur la grille (« si on fait tout dans l'app on a pas besoin de ça ») : enregistrement case par case, l'historique nommé suffit à retrouver une modification écrasée. D'autant que seuls les autorisés écrivent. |
| Q29 | **Ordre** : 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17, du plus court au plus long, un commit par lot. Décidé par Claude sur « fait ce que tu penses est le mieux ». |
| Q30 | **Planche cliquable** de la grille (ordinateur / téléphone) **avant** la spec du lot 17, pas avant les lots courts. |

### R. Demandes de Timothée du 19/09/2026 → audit, lot cohérence, lot 17 G4–G6, lot 14, look

**Mots de Timothée** : « J'aimerais savoir si toutes les fonctionnalités que je t'ai
demandées sont bien faites. J'ai l'impression qu'il y a des choses qui manquent, comme
l'exportation en CSV […] Fais un audit du code. Dis-moi les incohérences […] je voulais
lier les évènements et les tâches ensemble […] J'ai vu qu'il y avait des features qui ne
fonctionnent pas » ; puis « Normalement les règles sont publiées maintenant. Corrige » ;
« pour le planning il faudrait pouvoir modifier tous les plannings sur le site et pouvoir
les exporter en CSV ou en PDF » ; « en étant Admin, je ne pouvais pas enregistrer les
modifications que j'avais faites » ; « Corriger tous les problèmes du site » ; « pour les
idées d'harmonie il faudrait pouvoir avoir des fiches sur le site » ; « il faut que le
site bug le moins possible même quand il y a du monde de connecté » ; sur le look : « on
va partir sur 5. Verre […] mais je trouve qu'il y a trop de blocs / pastilles », puis « Je
pense partir sur 5C mais ça manque un peu de relief ».

**Ce que le code montrait** : 1 626 tests verts, mais G4 / G5 / G6 du lot 17, le lot 14
et le lot 15 sans code ; cinq bugs réels (dont `saveProfile` qui remplaçait le document
entier) ; l'enregistrement de la grille refusé tant que les règles `plannings/*` n'étaient
pas publiées, avec un message qui parlait de « droit retiré » ; le catalogue Harmonie
joignable seulement depuis l'onglet Chants ; neuf affirmations des docs contredites.

**Tranché et fait le 19/09/2026** : lot cohérence (`e2d4c54`) ; lot 17 G4, G5, G6 ;
Harmonie dans Moi et dans le menu du compte ; docs remises d'aplomb. **Lot 14** : go sur
les lectures (a) et (e) du rapport (champ `evenement` sur la tâche + bloc « Tâches » sur
la fiche ; glissement des échéances à la duplication), les lectures (b), (c), (d) restent
écartées. **Look** : piste « Verre · Encre » (5C) retenue, dérivés 5C1 / 5C2 / 5C3 publiés,
choix attendu avant toute spec. **Restent à trancher** : lot 15 (petit déj, spec prête),
tonalités mineures, les six écarts assumés du rapport, la mise en ligne (push, fusion
dans `main`), et la tenue en charge (quotas Firestore, lecture du Sheet).

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

### Écarté le 17/09/2026

- **Capo conseillé** (page du chant, setlist, mode louange) : **retiré**, plus
  en stand-by — « on retire l'idée du capo conseillé ». Le capo reste ce qu'il
  est aujourd'hui : choisi à la main en mode louange, retenu par chant sur
  l'appareil (`perf-capos`), et repris par les fiches guitare de l'harmonie
  (lot 9). Rien à coder, rien à défaire.
- **Heures écrites « 12h00 »** (la maquette des évènements du 16/09) : non, le
  site écrit **« 12:00 » partout**, planning compris ; la maquette ne l'emporte
  pas sur la cohérence du site. Aucun « 12h00 » dans le code (vérifié le
  17/09/2026), donc rien à changer.

### Écarté le 18/09/2026

- **QR code du site fourni par l'app** (page « Inviter » pour le lancement) :
  « pas besoin de ça, je vais créer un QRCode moi-même ».
- **Autocomplétion d'adresse sur le lieu d'un évènement** : « on abandonne ça ».
  Ni API Google Maps (payante, clé exposée, quota — contre la règle du coût nul),
  ni suggestion des lieux déjà saisis. Le lieu reste un champ libre.
- **Se retirer soi-même d'une case du planning** : non — « il faut envoyer un
  message si on est pas dispo ». Seul le **petit déj** permet de se retirer, parce
  qu'on s'y inscrit soi-même.
- **Deux onglets de programme de scène en même temps** (Noël et Pâques) : non,
  `overlaps()` ne compare que les créneaux du programme courant, deux programmes
  affichés laisseraient réserver la scène deux fois au même moment sans alerte.
  Remplacé par la bascule automatique (lot 12).
- **Fenêtre de conflit sur une case du planning** : non — « si on fait tout dans
  l'app on a pas besoin de ça ». Enregistrement case par case et historique nommé.
- **Notification de relance tant qu'une tâche est « en cours »** : non, une ligne
  dans le rappel groupé du matin après l'échéance (règle du lot 1c, une seule
  notification par personne et par jour).

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

- 17/09/2026 : Timothée : **les règles Firestore sont publiées** (tâches,
  réunions de pôle, accueil compris). Demandes du jour : voir échouer les tests
  écrits après le code (Tâches, guide), corriger les accords d'un chant chinois
  qui passent à la ligne sur téléphone, faire les captures du guide (A5).
  Fait le jour même : tests vus en échec sur le code d'avant chaque lot (sauf
  les tests négatifs, refusés par le contrôle des permissions), test du 中文
  renforcé parce qu'il passait sur l'ancien code, accords chinois corrigés
  (`spec-nouveaux-membres.md`, « Avancement »). Puis retour sur l'onglet
  Évènements : carte de gestion de la maquette pour l'organisateur, état
  « Fermées » cohérent, formulaire (`spec-evenements-look.md` § 6). A5 attend
  la validation de ce look. Puis : noms des inscrits visibles de tout membre
  connecté (`access.ts` + `firestore.rules`, **règles à republier**) ; liste des
  évènements en grandes cartes comme la maquette (`spec-evenements-look.md` § 6).
  Nouvelle demande : période d'inscription (ouverture, fin, forçage, rappel du
  jour) : spec `spec-inscriptions-periode.md`, go le 17/09/2026, P1 à P4 codées
  (non commité, à valider en local).
  Nouvelle demande : avant / après dans l'historique des setlists (§ 3.O),
  structures et liste des chants, plus les notes : spec
  `spec-historique-avant-apres.md` écrite ; recommandations acceptées et go ;
  codé le jour même (H1 structures, H2 liste des chants, H3 notes), **non
  commité, à valider en local**.

- 17/09/2026 (suite) : demande de Timothée, aides à la réharmonisation pour
  pianistes et guitaristes (§ 3.P). Entretien en sept tours (skill
  *grilling*), tout tranché ; spec `spec-harmonie.md` écrite, lot 9 ajouté au
  § 2, **à relire** ; code après la validation des lots en cours.

- 17/09/2026 (soir, go) : Timothée : « Fait le lot 9 en entier, le lot 1b sans
  le sheet, fait la finition index A–Z, on retire l'idée du capo conseillé. Le
  format de l'heure en 12:00 ». Plan dans `tasks/plan-lot9.md` (celui du lot 4
  n'est pas touché). Traité dans l'ordre : **décisions** (capo retiré, heure
  « 12:00 » tranchée, index A–Z revérifié — sa finition D7 était déjà livrée
  avec la tranche T0 du lot 4, 18 tests verts sur trois appareils, la feuille
  de route disait le contraire) ; **lot 1b** lu dans le bloc « PETIT DÉJEUNER »
  de l'onglet existant `Franco_Table_PtD`, sans attendre le fichier de
  Christelle ; puis le **lot 9** tranche par tranche, dans la nuit du 17 au
  18/09/2026. Trois tranches ont été confiées à des agents en parallèle (Ma
  version « seulement ce passage », retouche d'accord sur scan 简谱, relecture
  du code d'harmonie) : Timothée l'avait proposé (« si t'as besoin de créer des
  agents […] fais-le »). Chaque tranche garde son test écrit d'abord, vu en
  échec, et ses captures regardées sur les trois appareils.

- 18/09/2026 (incident, réparé) : en ajoutant les libellés de l'harmonie, les
  deux fichiers de langue ont été **repris depuis `git HEAD`** — donc sans les
  libellés du 17/09, non commités (avant / après de l'historique, période
  d'inscription, retours du soir) : **30 clés effacées**, 36 tests rouges sur
  `setlist-history`, et des écrans qui affichaient `setlists.history.before`
  au lieu de « Avant ». Reconstruites **depuis ce que les tests exigent mot
  pour mot** ; vérifié ensuite qu'aucune clé de HEAD ne manque, qu'il n'y a
  aucun écart entre `fr.json` et `zh-CN.json`, et que tous les préfixes
  dynamiques résolvent. `setlist-history` 75/75 et `evenements` 69/69 verts.
  **À regarder en relecture locale** : un libellé qu'aucun test ne vérifie
  pourrait manquer encore — il s'afficherait comme `une.clé.en.points`.

- 18/09/2026 : Timothée transmet la conversation WhatsApp de la nuit avec
  Christelle (15 captures) et demande l'état des lieux plus l'intégration de
  tout ce qui y est décidé. État des lieux établi : `main` est à **25 commits**
  derrière `ui/apple-design`, la branche n'est pas poussée, **rien n'est en
  ligne** ; sept chantiers non commités dans l'arbre. Entretien « grill » en
  **cinq tours** (Q1–Q30, § 3.Q), tout tranché ; deux propositions écartées par
  Timothée (QR code du site, autocomplétion d'adresse), une recommandation
  maintenue contre la lettre de la demande (relances d'une tâche en cours), une
  simplification demandée par Timothée et acceptée (pas de fenêtre de conflit).
  Huit lots ajoutés en partie 2 (10 à 17). Sur « fait ce que tu penses est le
  mieux » : ordre du plus court au plus long, planche cliquable seulement avant
  le lot 17, et **commit de l'arbre** pour protéger les sept chantiers.
  Trouvé et corrigé au passage, résidu de l'incident du 18/09 : trois libellés
  d'harmonie (`endroits`, `ecartees`, `repertoireCompte`) écrits en 中文 sans le
  suffixe `_other` alors que les neuf autres pluriels du fichier l'ont — en
  chinois ils retombaient sur le français. Contrôles : `tsc` propre (la seule
  erreur vient de `.next/types`, artefact de développement qui cite une route
  supprimée), lint 0 erreur (54 avertissements préexistants), 370 chants
  valides, harmonie 74 tests verts sur trois appareils (un échec sur téléphone
  non reproductible seul : flottant sous charge).

- 19/09/2026 : `main` fusionné (`98a74fb`), suite complète verte (1 626). **Audit** en
  trois volets confiés à des agents (spec vs code, cohérence, lien tâches ↔ évènements),
  rapport et planche de look publiés. Sur le go de Timothée : **lot cohérence**
  (`e2d4c54`, tests rouges puis verts, suite complète verte : 1 656), puis **lot 17 G4,
  G5, G6** (export CSV et PDF, import initial, fin du repli 2026, onze grilles remplies
  dans l'app ; trois agents lancés pour Table / EDD / Campus ont été coupés par la limite
  de dépense avant d'écrire une ligne : tranches faites à la main), puis **lot 14** confié
  à un agent en arbre isolé. Docs corrigées (cette feuille, `CLAUDE.md`, trois specs,
  la vision). Look : 5 → 5A/5B/5C → 5C1/5C2/5C3 sur la planche, choix attendu.

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
