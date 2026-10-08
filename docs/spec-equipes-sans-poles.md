# Spec — les pôles disparaissent, les équipes les remplacent (lot 1 du chantier « équipes et groupes »)

Lot 1 du chantier « équipes et groupes » (`docs/chantier-equipes-groupes/`), demandé par Timothée le 08/10/2026 :

> « On supprime les pôles et on garde les TEAM. »

Le retour des responsables et la piste notée au lot G (`spec-retouches-v18.md`, D30) y mènent aussi : un choriste du
pôle Louange implicite ne trouvait plus les réunions de son pôle dans aucune liste.

- **Date** : 08/10/2026.
- **Statut** : **spec écrite, questions tranchées le 08/10/2026 (décisions 35 à 45), attend le go de Timothée.**
  Rien n'est codé.
- **Base de code** : `ui/apple-design` à `5878ce1`. Le code est identique à `439e5520`, base de la cartographie :
  seuls des documents ont changé depuis. Toutes les références `fichier:ligne` ci-dessous ont été rouvertes à `5878ce1`.
  Celles qu'ajoutent les réponses du 08/10 au soir ont été ouvertes à `ceeb9b2`, au code identique (`git diff 5878ce1
  ceeb9b2 -- src firestore.rules tests` est vide).
- **Sources** :
  - `docs/chantier-equipes-groupes/decisions.md` (décisions 1 à 8, source de vérité ; réponses aux questions de cette
    spec : décisions 40 à 43 et 45) ;
  - `docs/chantier-equipes-groupes/cartographie.md` (§ « Supprimer les pôles et garder les équipes ») ;
  - les maquettes v19 `v19-org-eglise-ordinateur.png` et `v19-org-personne-ordinateur.png`.
- **Ordre du chantier** : lots 1 et 3 en parallèle, avec le partage d'une setlist (`docs/spec-partage-setlist.md`,
  codé en parallèle des lots 1 et 3, avant le lot 4 : décision 45), puis 2, puis 4. Tout se fait sur `ui/apple-design`. Modèle pour
  le code de ce lot : Opus 5.5, effort très élevé (`decisions.md`, « Ordre, branche, modèles »).

Règles communes, comme pour les autres specs :

- tests Playwright écrits **avant** le code et vus rouges, sur les trois appareils ; cinq projets pour l'agencement ;
- FR et 中文 pour tout libellé nouveau (中文 relu par Timothée) ;
- toute fonctionnalité de back-office reste derrière `BACK_OFFICE` (`src/lib/backOffice.ts:5`), avec un test sur le
  second serveur (`tests/back-office-coupe.spec.ts`) ;
- droits en double, `src/lib/access.ts` **et** `firestore.rules` ; **Timothée publie les règles** dans la console
  Firebase ;
- aucune session ne lit la vraie base : tout se simule (`tests/helpers/fakeSession.ts`). Le relevé et la migration
  sont lancés par Timothée.

**Tout ce module est derrière `BACK_OFFICE`** : tâches, réunions, évènements d'équipe, coordination de la scène,
Équipes et Personnes du Back-Office. En ligne, l'interrupteur est coupé. Il l'est aussi sur `origin/main`, vérifié le
08/10/2026 : `rappelsTaches` est derrière l'interrupteur dans son cron, et le bloc « Pôles » de `/admin` aussi.
Rien ne change donc pour les membres en ligne. Seuls changent le Back-Office local et la base partagée.

## Décisions du lot (`decisions.md`, reprises telles quelles)

| # | Décision |
|---|---|
| 1 | Le **mécanisme** des pôles disparaît (DA, Média, Orga, Événement ; champ `poles` des profils, `equipes.pole`, chemin `poles/{pole}/taches`, `pour = "pole:…"`). Les équipes de l'organigramme reprennent leur rôle. |
| 2 | **Tâches** : les 13 TEAM peuvent toutes avoir des tâches (une liste vide ne s'affiche pas). |
| 3 | **Droits dans une équipe** : les référents (et les admins) créent les réunions et les tâches ; tous les membres voient les tâches de leur équipe, cochent celles qui leur sont assignées et proposent des sujets de réunion. |
| 4 | **Back-Office d'un simple membre d'équipe** : entrées **Réunions + Tâches**, pour son équipe seulement. |
| 5 | **Louange** reste un public à part : toute personne qui a un rôle de service (choriste, musicien, président de culte, régie) **plus** les membres de TEAM LOUANGE. Les référents de TEAM LOUANGE (et les admins) créent ses réunions et ses tâches. Ces personnes ont aussi Réunions + Tâches au Back-Office (limitées à Louange). |
| 6 | **Coordination** (régler la scène, créer pour toute l'église, modifier tout évènement) : un **droit coché par un admin** dans Personnes. Personne ne l'a au départ ; TEAM ACCUEIL J1 ne l'a plus. |
| 7 | **Données existantes** : migration automatique pôle → équipe : DA → TEAM DA, Média → TEAM MÉDIAS, Orga → TEAM ORGA, Événement → TEAM ÉVÉNEMENTIEL, Louange → Louange. **L'organigramme actuel du site est gardé tel quel.** Un script, lancé par Timothée lui-même (aucune session ne lit la vraie base), liste avant la migration les comptes qui avaient un pôle « coché hors organigramme ». |
| 8 | Les évènements de pôle (lot E des retouches v18) deviennent des évènements d'**équipe**, même règle (non-réunion = inscriptions, visibles des membres, notification à la publication). |

Vocabulaire (correction de Timothée) : Noël et Pâques sont des **évènements**. La scène n'est que le **lieu** réservé.
La coordination « règle la scène » : la saison, les réservations et l'ordre de passage de ces évènements.

### Maquettes

Aucune piste A/B ne concerne ce lot.

- `maquettes/v19-org-eglise-ordinateur.png` : Équipes › Organigramme, vue « Église ». Les 13 équipes sont celles
  d'aujourd'hui. Les pastilles **« Donne le pôle Orga / DA / Média / Événement » disparaissent avec ce lot** : la
  planche dessine l'état d'avant. Le sélecteur Église · Paix · Fidélité · Bonté · Amour · Joie et la bascule
  Équipes · Musiciens à droite sont du lot 2.
- `maquettes/v19-org-personne-ordinateur.png` : Équipes › Personnes, la fiche. Dans la carte **Droits**, la ligne
  **« Coordination · Non »** et la note « Admin et coordination : cochés par un admin ». Le reste de la fiche est du
  lot 2 : groupe, rôles du groupe, « Par ses rôles », « Notifications », « Services et équipes ». La carte « Pôles »
  d'aujourd'hui n'y figure plus.

**Écarts des planches, signalés, non construits ici** :

- « + Nouvelle équipe » (planche Église) : aucune décision ne l'ouvre. Les équipes restent fixes (D8 de
  `spec-organigramme.md`, et « Hors périmètre » de `spec-agencement-v18.md`).
- La note de la fiche fait croire qu'« Admin » se coche. Ce n'est pas le cas : être admin vient d'une liste d'adresses,
  `ADMIN_EMAILS` (`src/lib/access.ts:17-21`), recopiée dans les règles (`firestore.rules:50-56`). Seule
  « Coordination » devient une case.
- La barre latérale des deux planches n'a pas l'entrée Réunions, qui existe depuis l'agencement v18 (B15,
  `src/types/backOffice.ts:4`). Le code fait foi.

## Réponses de Timothée (08/10/2026, soir)

Écrites dans `decisions.md` (« Réponses de Timothée aux questions des specs », décisions 35 à 45). Elles sont désormais
des décisions et l'emportent sur les recommandations. Celles qui touchent ce lot :

| # | Question de la spec | Réponse |
|---|---|---|
| 40 | Q1 : « L'organigramme est gardé tel quel » retire aux membres de COMITÉ FRANCO, THÉOLOGIE, DÉCORATION et ACCUEIL J1 qui ne sont pas dans l'équipe cible les tâches et réunions de l'ancien pôle. | **Voulue** : le relevé les nomme, Timothée les ajoute à la main. Règle et relevé inchangés (§ Migration, listes 2 et 4). |
| 41 | Q2 : un simple membre coche-t-il une tâche « pour toute l'équipe » (sans responsable) ? | **Non** : il ne coche que celles qui lui sont assignées (décision 3) ; les référents et les admins cochent les autres. Repris en EQ8, EQ11, EQ12, EQ14, EQ15 et dans les règles des fois. |
| 42 | Q3 : un membre de groupe sans rôle (`serviceRoles: { "Groupe Paix": [] }`) fait-il partie du public Louange ? | **Oui** : la règle d'aujourd'hui (une clé de `serviceRoles` suffit) est confirmée (EQ4). |
| 43 | Q4 : qui crée un évènement d'équipe qui n'est pas une réunion ? | **Les référents** de l'équipe (et les admins) : « Nouvel évènement » et l'entrée Évènements du Back-Office leur sont ouverts, pour les publics de leurs équipes (EQ18, EQ21). |
| 45 | Les autres questions des cinq specs | **Recommandations acceptées.** Ce lot n'en avait pas d'autre. Pour lui : le partage d'une setlist se code en parallèle des lots 1 et 3, avant le lot 4, et change `firestore.rules` (champ `editeurs`, décision 39) : sa publication suit la bascule de ce lot ou se fait dans la même séance (§ « Ordre de la bascule »). |

## Ce que le code fait aujourd'hui

**Trois sources de pôles.**

1. `users/{uid}.poles` : `da`, `media`, `orga`, `evenement` (`src/types/user.ts:36-38`, `:66`). Ce champ est écrit
   par le serveur seul, depuis le champ `pole` des équipes :
   - la table des équipes (`src/lib/equipes/table.ts:23-35`) :
     - ORGA, COMITÉ FRANCO et THÉOLOGIE donnent `orga` ;
     - DA et DÉCORATION donnent `da` ;
     - MÉDIAS donne `media` ;
     - ÉVÉNEMENTIEL et ACCUEIL J1 donnent `evenement` ;
     - les autres équipes ne donnent rien ;
   - le calcul (`src/lib/equipes/organigramme.ts:14-44`) et l'écriture des profils
     (`src/lib/equipes/serveur.ts:37-57`) ;
   - la route `src/app/api/equipes/poles/route.ts:20-40`.
2. **Louange implicite** : tout profil qui a une clé dans `serviceRoles`. Côté client, `polesDe`
   (`src/lib/access.ts:46-55`) ; côté serveur, `isTachePole` (`firestore.rules:147-152`).
3. **Le pôle `evenement` vaut coordination** (`src/lib/access.ts:69-78`, `firestore.rules:139-141`). Tout membre
   de TEAM ÉVÉNEMENTIEL ou de TEAM ACCUEIL J1 l'a donc.

**Tâches.**

- Elles vivent dans `poles/{pole}/taches/{id}`, avec une sous-collection `fois/{date}` (`src/types/tache.ts:1-7`,
  `:19-25` ; `src/lib/firebase/taches.ts:65-186`).
- Règle : tout membre du pôle les lit, les crée, les modifie, les supprime et les coche
  (`firestore.rules:154-163`). C'est le miroir de `isPoleMember` (`src/lib/access.ts:57-67`).
- Côté serveur :
  - les routes `/api/taches/assigne` et `/api/taches/fait` vérifient l'appelant par `appelantDuPole` et trouvent
    qui prévenir par `membresDuPole` (`src/lib/taches/serveur.ts:16-47`) ;
  - le cron lit `collectionGroup("taches")` (`src/app/api/cron/reminders/route.ts:109-147`). Il vise le
    responsable, sinon le pôle (`:131`, `:138`) ;
  - le pôle est dans les clés `notifLog` : `rappel-tache-…-${pole}-…` (`:135-137`), `tache-fait-${pole}-…`
    (`src/app/api/taches/fait/route.ts:61`), `tache-assigne-${pole}-…` (`src/app/api/taches/assigne/route.ts:31`).

**Réunions et évènements de pôle.**

- Leur public est `pour = "pole:<id>"` (`src/types/evenement.ts:13`, `poleDuPour` en `src/lib/access.ts:139-143`).
  Tout membre du pôle les voit, en crée et est « de la réunion » :
  - côté client, `src/lib/access.ts:186-187`, `:215-216`, `:233`, `:275-276` ;
  - côté serveur, `firestore.rules:200`, `:222-223`.
- Destinataires des notifications et rappels : `membresDuPole` (`src/lib/evenements/serveur.ts:39-50`).
- Les réunions d'équipe existent déjà, pour `pour = "equipe:<id>"` :
  - un référent ou un admin les crée (`src/lib/access.ts:217-218`, `firestore.rules:224-226`) ;
  - les membres (`dansEquipes`) les voient (`src/lib/access.ts:188-189`).
- « Réunions précédentes » et la reprise des sujets regroupent par `pour` exact
  (`src/lib/firebase/evenements.ts:102-110`). Une règle le vérifie : `firestore.rules:266`,
  `reunion(reprisDans).pour == reunion(id).pour`.

**Back-Office.**

- `estResponsable` compte `poles` (`src/lib/access.ts:503-509`).
- `entreesBackOffice` (`src/lib/access.ts:527-547`) :
  - Tâches suit `polesDe`, Louange compris ;
  - Réunions suit les pôles et les équipes ;
  - un membre d'équipe non responsable n'a que Réunions (lot G, D29). `EspaceBackOffice.tsx:23-26` le ramène à
    Réunions depuis toute autre adresse ;
  - le Louange implicite n'ouvre rien (D30 de `spec-retouches-v18.md`).

**Organigramme et Personnes.**

- La pastille « Donne le pôle … » et le sélecteur « Pôle donné par cette équipe » :
  `src/app/equipes/EquipesClient.tsx:299-306`, `:416-428`.
- Le bloc « Pôles » et « Décocher » un pôle hors organigramme : `src/components/admin/Personnes.tsx:49-93`
  (`PolesDuMembre`), `:350-366` (le bloc dans le formulaire) ; `src/components/admin/PersonnesVolets.tsx:233-236`.
- Le droit « Équipes », booléen coché par un admin : `src/components/admin/Personnes.tsx:368-384`. C'est le modèle
  de la case « Coordination ».
- « Recalculer depuis l'organigramme » : `src/components/equipes/RecalculerOrganigramme.tsx:24-41`,
  `src/lib/equipes/serveur.ts:65-68`.

**Interrupteur.** Chaque partie du module a son 404 sans `BACK_OFFICE` :

| Partie | Où |
|---|---|
| routes des tâches | `src/app/api/taches/assigne/route.ts:18`, `fait/route.ts:22` |
| route des équipes | `src/app/api/equipes/poles/route.ts:22` |
| pages | `src/app/taches/layout.tsx:12`, `src/app/back-office/layout.tsx:8`, `src/app/equipes/page.tsx:11` |
| lignes du cron (tâches, évènements) | `src/app/api/cron/reminders/route.ts:242-246` |
| blocs de droits de Personnes | `src/components/admin/Personnes.tsx:351`. Le formulaire sert aussi à `/admin` en ligne (`src/app/admin/AncienneAdmin.tsx:94`). |

### Relevé de tous les usages des pôles (vérifié le 08/10/2026)

**68 fichiers de `src/`** nomment un identifiant de pôle (relancé à `5878ce1`) :

```
grep -rlE "\bpoles?\b|Poles?\b|POLE|TachePole|polesDe|isPoleMember|isTachePole|membresDuPole|appelantDuPole|poleDuPour|pole:|TACHE_POLES|polesAFaire|PolesDuMembre|tachesDuBackOffice|polesDesEquipes|recalculerPoles|majPoles|estPole" src
```

S'y ajoutent **16 fichiers** qui ne lisent les pôles qu'à travers `isCoordination`, `estResponsable`,
`entreesBackOffice` ou `sousPartiesEvenements` (dont `src/app/back-office/evenements/layout.tsx:32`, qui lit
`sousPartiesEvenements`, et `src/lib/navigation.ts:106`, en commentaire seulement : sans changement). `firestore.rules` mentionne les pôles sur **29 lignes**, dont **14 de code** : 93, 140, 147,
149, 150, 154, 155, 156, 158, 161, 200, 222, 223 et 227. La cartographie annonçait « environ 38 fichiers et 13 lignes ».

| Fichier : lignes | Usage aujourd'hui | Remplacé par | Tranche |
|---|---|---|---|
| **Modèle** | | | |
| `src/types/user.ts:32-38` | `POLES`, `Pole`, `POLE_LABELS` | supprimés | EQ-D |
| `src/types/user.ts:64-66` | `poles?: Pole[]` | `coordination?: boolean` (EQ24) | EQ-A |
| `src/types/user.ts:72-77` | commentaire (`recalculerPoles`) | `recalculerRattachement` | EQ-D |
| `src/types/tache.ts:1-7` | `TACHE_POLES`, `TachePole`, chemin `poles/{pole}/taches` | supprimés ; une tâche porte l'id de son équipe (`string`) | EQ-C |
| `src/types/tache.ts:19-21`, `:25` | `Prevenir = { pole }` ; `Tache.pole` | `{ equipe: string }` ; `Tache.equipe` | EQ-C |
| `src/types/equipe.ts:5`, `:22-25` | `Equipe.pole` | supprimé | EQ-D |
| `src/types/evenement.ts:5`, `:10-13` | `` `pole:${TachePole}` `` dans `EvenementPour` | retiré (reste `` `equipe:${string}` ``) | EQ-B |
| `src/types/backOffice.ts:10-14` | `Reglages.poles` (widget À faire) | `Reglages.equipes` | EQ-C |
| **Droits** | | | |
| `src/lib/access.ts:5` | import `TACHE_POLES`, `TachePole` | retiré | EQ-C |
| `src/lib/access.ts:46-55` | `polesDe` (pôles écrits + Louange implicite) | `equipesDe` (EQ3, EQ4) | EQ-B ajoute, EQ-C retire `polesDe` |
| `src/lib/access.ts:57-67` | `isPoleMember` | `estDeLEquipe` ; nouveaux `estReferentDe`, `peutCocher` (EQ8) | EQ-B ajoute, EQ-C retire `isPoleMember` |
| `src/lib/access.ts:69-78` | `isCoordination` = `'evenement' in poles` | `coordination === true` (EQ24) | EQ-A |
| `src/lib/access.ts:102-127`, `:248-256` | `canEditCreneau`, `canReserverPour`, `canEditEvenement` typés `{ poles }` | typés `{ coordination }`, logique inchangée | EQ-A |
| `src/lib/access.ts:131-137` | `ProfilEvenement.poles` | retiré, `coordination` ajouté | EQ-A, EQ-B |
| `src/lib/access.ts:139-155` | `poleDuPour`, `publicDeReunion` (pôle ou équipe) | `poleDuPour` supprimé ; `publicDeReunion` = équipe seule | EQ-B |
| `src/lib/access.ts:165-168` | `estDansEquipe` (`dansEquipes`) | `estDeLEquipe` (Louange élargi) | EQ-B |
| `src/lib/access.ts:177-192` | `canSeeEvenement`, branche pôle (`:186-187`) | branche retirée ; l'équipe par `estDeLEquipe` | EQ-B |
| `src/lib/access.ts:209-221` | `canCreateEvenement`, branche pôle (`:215-216`) | retirée (EQ21) | EQ-B |
| `src/lib/access.ts:226-239` | `creatableEvenementPours` : pôles de la personne | retirés (équipes dont on est référent, toutes pour un admin) | EQ-B |
| `src/lib/access.ts:263-279` | `estDeLaReunion`, branche pôle | retirée ; l'équipe par `estDeLEquipe` | EQ-B |
| `src/lib/access.ts:494-509` | `ProfilResponsable.poles`, `estResponsable` compte `poles` | `coordination` à la place de `poles` (EQ18) | EQ-B |
| `src/lib/access.ts:523-547` | `entreesBackOffice` : `polesDe` pour Tâches et Réunions | EQ17 | EQ-B |
| `src/lib/access.ts:597-607` | `tachesDuBackOffice` | `equipesDesTaches` (EQ9) | EQ-C |
| `firestore.rules:16-34`, `:119-127` | commentaires de tête (pôles, coordination « pôle événement ») | réécrits | EQ-F |
| `firestore.rules:88-98` | création de profil : `poles == []` (`:93`) | `coordination == false` ajouté ; `poles == []` retiré quand plus rien ne lit `poles` | EQ-A, EQ-D |
| `firestore.rules:139-141` | `isCoordination()` lit `poles` | lit `coordination` | EQ-A |
| `firestore.rules:143-163` | `isTachePole`, `match /poles/{pole}/taches/{id}` | `estDeLEquipe`, `estReferentDe`, `match /equipes/{equipe}/taches/{id}` | EQ-B, EQ-C |
| `firestore.rules:189-202` | `estDeLaReunion` : branche `pole:` | retirée, l'équipe par `estDeLEquipe` | EQ-B |
| `firestore.rules:212-229` | création d'un évènement : branche `pole:` | retirée ; la garde `(pole\|equipe):.*` reste | EQ-B |
| **Tâches : données et serveur** | | | |
| `src/lib/firebase/taches.ts:1-186` | chemins `poles/${pole}/…`, signatures `pole: TachePole` | `equipes/${equipe}/…`, `equipe: string` | EQ-C |
| `src/lib/taches/serveur.ts:6-47` | `estPole`, `appelantDuPole`, `lireTache`, `membresDuPole` | `estEquipe`, `appelantDeLEquipe`, `lireTache(equipe, id)`, `membresDeLEquipe` (EQ11) | EQ-C |
| `src/lib/taches/messages.ts:10-18`, `:26-35`, `:70-71` | dictionnaire `POLE` FR / 中文 ; « Pôle DA » | nom de l'équipe (EQ13) | EQ-C |
| `src/lib/taches/prevenir.ts:5-27` | `{ pole, tacheId }` ; `cible: "pole"` | `{ equipe, tacheId }` ; `cible: "equipe"` | EQ-C |
| `src/lib/taches/useTaches.ts:5-38` | liste de pôles | liste d'équipes | EQ-C |
| `src/lib/taches/echeances.ts:5`, `:141-160` | `tachesDupliquees` rend `{ pole }` | `{ equipe }` | EQ-C |
| `src/app/api/taches/assigne/route.ts:6`, `:19-37` | `pole`, `appelantDuPole`, clé `tache-assigne-${pole}` | EQ11 | EQ-C |
| `src/app/api/taches/fait/route.ts:9`, `:23-62` | `pole`, `membresDuPole`, clé `tache-fait-${pole}` | EQ11 | EQ-C |
| `src/app/api/cron/reminders/route.ts:16-17`, `:104-147` | `polesDe`, `TachePole`, `parent.parent.id` comme pôle, clés | EQ12 | EQ-C |
| **Tâches : écrans** | | | |
| `src/app/back-office/taches/layout.tsx:1-27`, `page.tsx:1-27` | onglets = `tachesDuBackOffice` ; « aucun pôle » | `equipesDesTaches`, EQ9 | EQ-C |
| `src/app/back-office/taches/[pole]/layout.tsx:34-110`, `[pole]/page.tsx`, `[pole]/nouvelle/page.tsx:15-41`, `[pole]/[id]/page.tsx:3-12` | dossier `[pole]`, `TACHE_POLES`, rail `taches.pole.*` | dossier renommé `[equipe]` ; rail des équipes (EQ9) ; « + Nouvelle tâche » selon EQ8 | EQ-C |
| `src/app/taches/[pole]/page.tsx:6-8`, `[pole]/[id]/page.tsx:3-11`, `src/app/taches/layout.tsx:10` | redirection et fiche par pôle | dossier `[equipe]`, même redirection | EQ-C |
| `src/components/taches/SectionTaches.tsx:22-38`, `:61-65`, `:74-138`, `:155` | `polesDe`, `TACHE_POLES`, `taches.aucunPole`, « Les tâches des pôles » | équipes, EQ9, libellés EQ30 | EQ-C |
| `src/components/taches/FicheTache.tsx:50-59`, `:99-123`, `:134-139`, `:192-216`, `:300` | `tache.pole`, « Pôle X » ; Modifier et Supprimer pour tout membre | `tache.equipe`, nom de l'équipe ; commandes selon EQ8 | EQ-C |
| `src/components/taches/TacheForm.tsx:12-25`, `:42-58`, `:85-107`, `:145-160`, `:247-256` | choix du pôle, responsables = `polesDe(m)`, « Prévenir Pôle X » | EQ10 | EQ-C |
| `src/components/taches/creerTache.ts:4-31`, `retour.ts:9-10`, `TacheLigne.tsx:28-46` | `pole` ; « Pôle X prévenu » ; prop `poleLabel` ; case toujours active | `equipe` ; EQ30 ; prop `equipeLabel` ; case inerte sans droit (EQ8) | EQ-C |
| `src/app/evenements/[id]/TachesEvenement.tsx:1-100` | « tâches de MES pôles », carte pour tout membre de pôle | EQ16 | EQ-C |
| `src/components/calendrier/Deplacer.tsx:42` | `deplacerTache(plan.tache.pole, …)` | `plan.tache.equipe` | EQ-C |
| `src/lib/calendrier/charger.ts:12`, `:25`, `:59`, `:69` | tâches des pôles de la personne | de ses équipes (EQ14) | EQ-C |
| `src/lib/calendrier/entrees.ts:16-17`, `:32`, `:163`, `:184-189`, `:201-209`, `:348-360`, `:413-433` | `isPoleMember`, `polesDe`, `poleLabel`, lien `/taches/${t.pole}` | EQ14 | EQ-B, EQ-C |
| `src/app/back-office/calendrier/CalendrierClient.tsx:31`, `:51`, `:227-250`, `:476-480` | création de tâche « parmi ses pôles » | parmi les équipes où l'on crée (EQ14) | EQ-C |
| `src/app/back-office/evenements/nouveau/NouveauClient.tsx:27`, `:38`, `:56-59`, `:114-120` | duplication : tâches de mes pôles | EQ16 | EQ-C |
| `src/lib/tableauDeBord/donnees.ts:5`, `:24`, `:143-148` ; `reglages.ts:13`, `:52-53` | `polesAFaire`, réglage « Pôles » | `equipesAFaire`, réglage « Équipes » (EQ15) | EQ-C |
| `src/lib/tableauDeBord/usePastilles.ts:8`, `:13`, `:36-38` | pastille Tâches lue sur les pôles | sur les équipes | EQ-C |
| `src/components/backOffice/widgets/WidgetAFaire.tsx:10`, `:19-24`, `:40-41` | lien `/back-office/taches/${pole}`, « Pôle X » | équipe | EQ-C |
| `src/components/backOffice/PagePlus.tsx:35` | « tâches de tes pôles / de tous les pôles » | « … de tes équipes / de toutes les équipes » | EQ-C |
| `src/components/layout/Navbar.tsx:13`, `:212-217` | lien Tâches : `admin \|\| polesDe` | `admin \|\| equipesDe` | EQ-C |
| `src/app/moi/page.tsx:29-31`, `:52-53`, `:116` ; `src/components/moi/Apercus.tsx:33`, `:139-160` | aperçu « Mes tâches » sur les pôles | sur les équipes | EQ-C |
| **Réunions et évènements** | | | |
| `src/lib/evenements/serveur.ts:6-8`, `:35-50`, `:74-75`, `:86` | `destinatairesEvenement` : pôle → `membresDuPole` ; message « réservé aux membres du pôle » | équipe → `membresDeLEquipe` (Louange élargi, ajoutée à `src/lib/taches/serveur.ts` dès EQ-B) ; « … de l'équipe » | EQ-B |
| `src/app/api/push/notify-evenement/route.ts:43` ; `src/app/api/evenements/desinscription/route.ts:29` | profil typé `{ poles }` (pour `isCoordination`) | `{ coordination }` | EQ-A |
| `src/app/evenements/EvenementCard.tsx:17`, `:30-45` ; `src/app/back-office/evenements/FicheGestion.tsx:25`, `:83` | pastille « Pôle DA » | nom de l'équipe (EQ23) | EQ-B |
| `src/components/reunions/EnTeteReunion.tsx:14`, `:26-29` | « Réunion de pôle · DA » | « Réunion d'équipe · DA » : branche équipe déjà là, avec `backOffice.reunionDEquipe` et le nom court `equipes.court.<id>` (`:30`) ; EQ23 | EQ-B |
| `src/components/evenements/EvenementForm.tsx:16`, `:196-199` | option « Pôle X » du public | retirée | EQ-B |
| `src/lib/firebase/evenements.ts:102-110` | `listReunionsDu(pour)`, exemple `pole:da` | code inchangé ; données migrées (§ Migration) | EQ-E |
| `src/app/back-office/evenements/ListeGestion.tsx:32-40` | commentaire (pôle, choix V18POLE) | réécrit avec `peutCreerDans` (EQ21, décision 43) | EQ-B |
| `src/hooks/useNotifications.ts:83-86` | commentaires (pôle) | réécrits ; logique inchangée | EQ-F |
| **Organigramme et Personnes** | | | |
| `src/lib/equipes/table.ts:5`, `:7-18`, `:22-36` | champ `pole` de `EquipeDef` | supprimé | EQ-D |
| `src/lib/equipes/organigramme.ts:7`, `:14-44` | `polesDesEquipes` ; `rattachementDe` rend `poles` | supprimé ; `{ dansEquipes, referentDe }` | EQ-D |
| `src/lib/equipes/serveur.ts:8`, `:20-28`, `:32-68` | `EquipeServeur.pole`, `recalculerPoles`, recalcul sans pôles | `recalculerRattachement` (EQ28) | EQ-D |
| `src/lib/firebase/equipes.ts:3`, `:5-8`, `:17`, `:42-78` | `saveEquipe({ pole, membres })`, `majPoles` | `saveEquipe({ membres })`, `majRattachement` | EQ-D |
| `src/app/api/equipes/poles/route.ts:1-40` | route `/api/equipes/poles` | `src/app/api/equipes/rattachement/route.ts` (nouveau), l'ancienne supprimée (EQ28) | EQ-D |
| `src/components/equipes/RecalculerOrganigramme.tsx:3-5`, `:29` | appel `/api/equipes/poles` | `/api/equipes/rattachement` | EQ-D |
| `src/app/equipes/EquipesClient.tsx:26`, `:33`, `:227`, `:257`, `:299-306`, `:362-428` | pastille « Donne le pôle », sélecteur du pôle, `majPoles` | retirés (EQ27) ; `majRattachement` | EQ-D |
| `src/app/back-office/equipes/page.tsx:25` | sous-titre « … : il donne les pôles de chacun » | EQ27 | EQ-D |
| `src/components/admin/Personnes.tsx:21-23`, `:49-93`, `:293-306`, `:323-326`, `:350-366`, `:568` | `PolesDuMembre`, « Coché hors organigramme », `onPoles` | retirés ; case « Coordination » (EQ26) | EQ-A, EQ-D |
| `src/components/admin/PersonnesVolets.tsx:20-21`, `:31`, `:139`, `:151`, `:180-186`, `:233-250` | carte « Pôles », `onPoles` | carte retirée ; ligne « Coordination » dans Droits (EQ26) | EQ-A, EQ-D |
| `src/lib/firebase/users.ts:15`, `:38`, `:62`, `:65-68` | `poles` lu et mis par défaut | `coordination` (lu `false` par défaut) | EQ-A, EQ-D |
| `src/app/(auth)/profil/page.tsx:94` | commentaire (droits non envoyés : `poles`) | `coordination` | EQ-F |
| **Lus à travers les fonctions** (code inchangé, comportement changé) | | | |
| `src/app/back-office/EspaceBackOffice.tsx:23-26` | non-responsable ramené à Réunions | **change** : ramené à sa première entrée hors Tâches, Réunions et Plus (EQ17) | EQ-B |
| `src/components/layout/BarreLaterale.tsx:91`, `:228` ; `MobileTabBar.tsx:31` ; `SelecteurEspace.tsx:52-55` ; `src/lib/tableauDeBord/barre.ts:17-20` ; `src/components/backOffice/widgets/WidgetEvenements.tsx:39` ; `src/app/evenements/[id]/EvenementClient.tsx:157-160`, `:295`, `:335` ; `src/app/evenements/SectionEvenements.tsx:33` ; `src/lib/tableauDeBord/donnees.ts:251` ; `src/app/back-office/evenements/layout.tsx:32` (`sousPartiesEvenements`) ; `src/lib/navigation.ts:106` (commentaire) | suivent `entreesBackOffice`, `estResponsable` ou `sousPartiesEvenements` | inchangés | — |
| `src/app/back-office/evenements/scene/FeteGestion.tsx:114` ; `scene/page.tsx:16` ; `src/app/evenements/scene/Entrainements.tsx:101` ; `FeteClient.tsx:219` ; `src/lib/tableauDeBord/disposition.ts:36` ; `src/components/backOffice/PagePlus.tsx:61`, `:132` ; `src/lib/firebase/programmes.ts:13-14` | suivent `isCoordination` | inchangés (la fonction change, EQ24) | — |
| **Commentaires seuls** | | | |
| `src/components/layout/EnTetePage.tsx:15` ; `src/lib/deuxVolets.ts:36`, `:43` | exemples `taches.poles`, `[pole]` | mis à jour | EQ-F |
| **Libellés** | | | |
| `src/locales/fr.json`, `src/locales/zh-CN.json` | clés listées en EQ30 | EQ30 | EQ-C, EQ-F |
| **Touchés par les décisions 41 et 43** (sans identifiant de pôle, ou au-delà de la ligne relevée) | | | |
| `src/lib/taches/echeances.ts:126-130` | `aFairePour(lignes, uid)` : à moi, ou sans responsable | `aFairePour(lignes, user, profile)` : à moi, ou sans responsable dans une équipe où je coche (EQ15, décision 41) | EQ-C |
| `src/components/taches/SectionTaches.tsx:84` ; `src/components/moi/Apercus.tsx:144` ; `src/lib/tableauDeBord/usePastilles.ts:41` ; `src/lib/calendrier/entrees.ts:430-431` | « À faire pour moi », aperçu de Moi, pastille Tâches, « Mes tâches » du Calendrier : sans responsable = à tout membre | suivent `aFairePour` (EQ14, EQ15) | EQ-C |
| `src/app/api/taches/fait/route.ts:27-28` | l'appelant n'a qu'à être du pôle | `peutCocher` sur la tâche lue par le serveur (EQ11) | EQ-C |
| `src/app/api/cron/reminders/route.ts:131`, `:138` | sans responsable : tout le pôle | les référents de l'équipe, `referentsDeLEquipe` (EQ12) | EQ-C |
| `src/app/back-office/evenements/ListeGestion.tsx:38-40` | `peutCreerDans(…, false)` : un public hors équipe | `creatableEvenementPours(…).length > 0` (EQ21, décision 43) | EQ-B |
| `src/app/back-office/calendrier/CalendrierClient.tsx:229-233` | `droits.evenement` : un public hors équipe | `pours.length > 0` (EQ21) | EQ-B |
| `src/lib/access.ts:540`, `:621` | entrée et sous-partie Évènements : admin, coordination, annonces | ajout de `\|\| nonVide(profile?.referentDe)` (EQ18, EQ21) | EQ-B |
| **Tests** | | | |
| `tests/helpers/fakeSession.ts:20`, `:29-31`, `:349` | `FakeProfile.poles`, écrit dans `users/{uid}` | `coordination?: boolean` | EQ-A |

## Règles

Les règles qui reprennent une décision la citent. Les autres sont des **règles de la spec**, marquées « choix » : la
lecture la plus simple des décisions, comme le demande `decisions.md`.

### A. Plus de pôles

| # | Règle |
|---|---|
| EQ1 | (décision 1) Le mécanisme des pôles disparaît : `POLES`, `Pole`, `POLE_LABELS`, `TACHE_POLES`, `TachePole`, `users.poles`, `equipes.pole`, `poles/{pole}/taches`, `pour = "pole:…"`, `Prevenir.pole`, `polesDe`, `isPoleMember`, `isTachePole`, `poleDuPour`, `membresDuPole`, `appelantDuPole`, `polesDesEquipes`, `PolesDuMembre`, `polesAFaire`, `tachesDuBackOffice`. **Critère vérifiable** : `grep -rniE "\bp[ôo]les?\b\|TachePole\|polesDe\|isPoleMember\|isTachePole" src firestore.rules` ne trouve plus que le module de migration (`src/lib/equipes/migration.ts`) et la garde `(pole\|equipe):.*` des règles (EQ21). Le script de migration est dans `scripts/`, hors de cette recherche. |
| EQ2 | Une équipe est désignée par son id, celui de la table `EQUIPES` (`src/lib/equipes/table.ts:22-36`) : `orga`, `comite-franco`, `da`, `medias`, `developpement`, `regie`, `traduction`, `theologie`, `evenementiel`, `decoration`, `accueil-j1`, `louange`, `edd`. **Choix** : les fonctions de droits et les règles ne bornent pas l'id à cette table (motif `[a-z0-9-]+`, comme `equipeDuPour`, `src/lib/access.ts:147-150`). Les comités du lot 2 (`comite-<groupe>`) s'y brancheront sans toucher aux droits. |

### B. Être d'une équipe ; le public Louange

| # | Règle |
|---|---|
| EQ3 | **Membre** d'une équipe : son id est dans `dansEquipes` du profil. **Référent** : son id est dans `referentDe`. Les deux sont recopiés par le serveur depuis l'organigramme, comme aujourd'hui. « En essai » ne change aucun droit (D7 de `spec-organigramme.md`). Pour les droits (`access.ts` et règles), un admin est membre et référent de toutes les équipes ; il n'est pas pour autant destinataire des notifications d'une équipe où il ne figure pas (`membresDeLEquipe` lit les profils, comme `membresDuPole` aujourd'hui). |
| EQ4 | (décision 5) **Louange** = le public `equipe:louange`, **élargi** : les membres de TEAM LOUANGE, plus toute personne qui a une clé dans `serviceRoles`. C'est la règle de `polesDe` et `isTachePole` d'aujourd'hui, sans changement : une clé de `serviceRoles` suffit, et un membre de groupe sans rôle (`{ "Groupe Paix": [] }`) fait partie du public Louange (**décision 42**). La fin de la transition des `serviceRoles` reste suivie par la question 8 de `docs/spec-organigrammes-groupes.md` : elle devra garder les membres des groupes dans ce public. Ses référents sont ceux de TEAM LOUANGE. **Choix** : un seul id, pas un public à part. Les tâches, réunions et évènements de Louange réutilisent tout le code des équipes ; une seule exception, dans `estDeLEquipe` (client, serveur, règles). **Choix** : dans Tâches, Réunions et les notifications, ce public s'affiche « Louange » (敬拜), et non « TEAM LOUANGE », parce qu'il est plus large que l'équipe. L'organigramme garde « TEAM LOUANGE ». |
| EQ5 | `equipesDe(profile)` : les équipes d'une personne, dans l'ordre de `EQUIPES`, avec `louange` ajouté dès qu'elle a un rôle de service. C'est la seule fonction qui calcule « mes équipes » côté client. Miroir serveur : `membresDeLEquipe` (EQ11) ; miroir des règles : `estDeLEquipe(equipe)`. |

### C. Tâches par équipe

| # | Règle |
|---|---|
| EQ6 | (décision 2) **Chemin** : `equipes/{equipe}/taches/{id}` et `equipes/{equipe}/taches/{id}/fois/{AAAA-MM-JJ}`. **Choix** : c'est la forme de `poles/{pole}/taches` avec un autre parent. La règle lit l'équipe dans le chemin, sans lecture de plus. Les requêtes de liste restent des `runQuery` sur un parent, sans index composite. Le cron garde `collectionGroup("taches")`. Le parent `equipes/{id}` est déjà le document de l'organigramme ; ses règles ne s'étendent pas à la sous-collection, qui a les siennes. Écartée : une collection `taches/{id}` avec un champ `equipe`. Il faudrait alors filtrer chaque requête sur ce champ, ce qui demande un index composite (`equipe` puis `echeance`), et la règle lirait le document au lieu du chemin. |
| EQ7 | **Document** : `equipe` (id) remplace `pole`. `prevenir` vaut `{ equipe }`, `{ regie: <service> }` ou `null`. Le reste ne change pas : titre, responsable, échéance, répétition (lots 7 et 13), lien, note, évènement lié (lot 14), auteur, dates. L'état d'une fois, À faire, En cours ou Terminé, ne change pas non plus (lot 13). |
| EQ8 | (décision 3) **Qui fait quoi** : **voir** les tâches de l'équipe, ses membres (EQ3, EQ4). **Créer, modifier, supprimer, déplacer** (Calendrier), lier ou délier à un évènement : les référents et les admins (**choix** : « créer » emporte ces gestes de gestion). **Changer l'état d'une fois** (« cocher ») : le responsable de la tâche, s'il est de l'équipe ; une tâche sans responsable (« toute l'équipe ») : les référents et les admins seulement (**décision 41**). Les référents et les admins cochent toute tâche de l'équipe. Un simple membre ne coche donc que les tâches dont il est le responsable. `peutCocher(user, profile, tache)` dans `access.ts` : `estReferentDe(tache.equipe)`, ou `estDeLEquipe(tache.equipe)` et `responsableUid === user.uid`. Sans le droit, la commande ne s'affiche pas : case de la ligne inerte (`TacheLigne`), pas de « Modifier » ni de « ⋯ › Supprimer » sur la fiche, pas de « Déplacer » au Calendrier (`peutDeplacer`, `src/lib/calendrier/entrees.ts:184-189`), pas de « + Nouvelle tâche ». **Conséquences** : un simple membre ne crée plus de tâche, ce qu'il pouvait faire dans son pôle ; il ne coche plus une tâche « toute l'équipe », qu'il voit toujours dans la liste de l'équipe, case inerte ; l'auteur non référent d'une tâche migrée ne peut plus la modifier. |
| EQ9 | (décision 2) **« Une liste vide ne s'affiche pas »**. **Choix** de lecture : une équipe sans tâche n'a pas d'onglet dans le rail de Back-Office › Tâches. Le rail se calcule sur les tâches déjà lues par `useTaches` (comme le compte d'aujourd'hui, `back-office/taches/[pole]/layout.tsx:48-53`) : un admin lit 13 listes, une requête par équipe, là où il en lisait 5. Exception : les équipes dont la personne est référente gardent leur onglet, pour y créer la première tâche. Un admin ne voit que les équipes qui ont des tâches, sans 13 onglets vides ; son « + Nouvelle tâche » propose les 13 équipes. **Ailleurs, rien à masquer** : le réglage du widget « À faire » (`groupesDeReglages`, module pur qui ne lit aucune tâche, `reglages.ts:51-53`) propose toutes les équipes de la personne (les 13 pour un admin) et le widget n'affiche rien pour une équipe vide ; « Plus » n'a pas de ligne par équipe, une seule phrase (`morceaux`, `PagePlus.tsx:35`). Sans aucun onglet : « Pas encore de tâche pour tes équipes. », avec « + Nouvelle tâche » si la personne peut créer quelque part. Les entrées elles-mêmes (Tâches au Back-Office, lien Tâches de la barre du haut, aperçu de Moi) gardent leur condition (EQ15, EQ17). `equipesDesTaches(user, profile)` rend ses équipes (toutes pour un admin) ; `equipesOuCreer(user, profile)` rend celles où elle crée (`referentDe` ; toutes pour un admin). |
| EQ10 | **Formulaire** (`TacheForm`) : « Équipe » parmi `equipesOuCreer`, en pilules en grand et en liste au doigt, comme aujourd'hui. Les responsables proposés sont les membres de l'équipe choisie (EQ5, Louange élargi). « Quand c'est fait, prévenir » propose les **autres** équipes, sous leur nom, puis les régies des services (inchangé). |
| EQ11 | **Routes** (`/api/taches/assigne`, `/api/taches/fait`, Admin SDK, 404 sans `BACK_OFFICE`) : corps `{ equipe, tacheId[, date] }`. `appelantDeLEquipe(req, equipe)` vérifie le jeton et `estDeLEquipe` sur le profil lu par le serveur. `/assigne` exige en plus `estReferentDe` (**choix** : seul qui crée ou modifie nomme un responsable). `/fait` exige en plus `peutCocher` (EQ8) sur la tâche lue par le serveur, sinon 403 « Tu ne peux pas cocher cette tâche » (**choix**, conséquence de la décision 41 : un simple membre n'annonce pas faite une tâche « toute l'équipe » cochée par un autre). `/fait` prévient, pour `{ equipe }`, les membres de l'équipe (`membresDeLEquipe(equipe, db)`, Louange élargi) sauf qui coche ; pour `{ regie }`, la régie du dimanche, comme aujourd'hui. Réponse `{ notified, linked, cible: "equipe" \| "regie" \| null }`. Clés `notifLog` : `tache-assigne-${equipe}-${id}`, `tache-fait-${equipe}-${id}-${date}`. |
| EQ12 | **Cron** (`rappelsTaches`, derrière `BACK_OFFICE` comme aujourd'hui) : ne prend que les tâches rangées sous `equipes/{e}/taches` (`doc.ref.parent.parent?.parent.id === "equipes"`). Une tâche restée sous `poles/` (migration pas lancée) n'est pas rappelée, et pas rappelée deux fois. Cibles : le responsable ; une tâche sans responsable, **les référents de l'équipe** (`referentsDeLEquipe(equipe, db)`, `src/lib/taches/serveur.ts` : profils dont `referentDe` contient l'équipe), et non plus tous ses membres (**choix**, conséquence de la décision 41 : le rappel va à qui peut cocher). Pour Louange, les référents de TEAM LOUANGE. Une équipe sans référent n'a personne à rappeler pour ses tâches « toute l'équipe » : le relevé les compte (§ Migration, liste 4) et un admin les voit dans Tâches. Clés : `rappel-tache-${quand}-${equipe}-${id}-${date}` et `rappel-tache-encours-${equipe}-${id}-${date}-${jour}`. |
| EQ13 | **Textes des notifications** (`src/lib/taches/messages.ts`) : le nom de l'équipe remplace « Pôle X ». Exemples : « Nouvelle tâche : Photos du culte » / « TEAM MÉDIAS · pour vendredi 16 octobre » ; « Tâche faite : … » / « Léa M. (TEAM MÉDIAS) l'a terminée. » ; ligne du matin « À faire : Photos du culte (TEAM MÉDIAS), vendredi 16 octobre ». En 中文 : 媒体组 · 截止 …, （媒体组）已完成. Louange : « Louange » / 敬拜 (EQ4). **Choix** : le serveur lit les noms dans `equipes.team.*` des deux fichiers de langue, une seule source. |
| EQ14 | **Calendrier** (`charger.ts`, `entrees.ts`, Back-Office › Calendrier). Il lit les tâches des équipes de la personne (toutes pour un admin) ; le détail d'une entrée porte le nom de l'équipe ; le lien est `/taches/<equipe>`. La pastille de source Tâches s'affiche avec une équipe (`sourcesPermises`, `:204-209`), Réunions aussi. « Mes tâches » (`moi`, `:430-431`) suit `aFairePour` (EQ15) : à moi, ou sans responsable dans une équipe dont je suis référent (décision 41). Dans `evenements()` (`entrees.ts:348-360`), `mesPoles` et `mesEquipes` (`dansEquipes`) deviennent un seul `equipesDe` (Louange élargi) : « à moi » pour une réunion, et visibilité. « Créer une tâche » s'ouvre parmi `equipesOuCreer`. |
| EQ15 | **Ailleurs** : widget « À faire » (réglage « Équipes », clé `equipes`) ; pastille Tâches de la barre ; « Plus » (« tâches de tes équipes », « … de toutes les équipes ») ; lien « Tâches » de la barre du haut sur ordinateur (`admin \|\| equipesDe` non vide) ; aperçu « Mes tâches » de Moi. Mêmes conditions qu'aujourd'hui : « un pôle » y devient « une équipe ». **« À moi »** (`aFairePour(lignes, user, profile)`, `src/lib/taches/echeances.ts:126-130`) : ce qui reste à faire et dont je suis le responsable, ou qui n'a pas de responsable dans une équipe dont je suis référent (toutes pour un admin) : exactement ce que `peutCocher` me laisse cocher (**décision 41**). Le suivent : « À faire pour moi » de Tâches (`SectionTaches.tsx:84`), l'aperçu de Moi (`Apercus.tsx:144`), la pastille Tâches (`usePastilles.ts:41`) et « Mes tâches » du Calendrier (EQ14). Pour un simple membre, une tâche sans responsable n'est plus « à lui » : elle reste visible dans la liste de l'équipe, sans compter dans sa pastille. Pour un référent, elle reste « à lui ». Le widget « À faire » ne change pas : il liste toutes les tâches à venir des équipes réglées, pas « les miennes » (`aFaireDuTableau`, `src/lib/tableauDeBord/donnees.ts:152-155`), et un simple membre n'a pas de tableau de bord (EQ17). |
| EQ16 | **Fiche d'un évènement** (carte « Tâches », `TachesEvenement`) : les tâches liées des équipes de la personne. La carte ne s'affiche que s'il y en a, ou si la personne peut créer (EQ9). « Nouvelle tâche » ne s'affiche que pour les référents et les admins. **Duplication** d'un évènement (`NouveauClient`) : on ne copie que les tâches des équipes où l'on crée (**choix**, suite de EQ8). |

### D. Back-Office

| # | Règle |
|---|---|
| EQ17 | (décisions 4 et 5) **Qui n'est pas responsable** (EQ18) mais a au moins une équipe (`equipesDe` non vide : membre d'une équipe, ou public Louange) a **Tâches + Réunions**, rien d'autre, limitées à ses équipes. Il voit le sélecteur App · Back-Office (`SelecteurEspace` suit `entreesBackOffice`). Sa barre du bas est Tâches · Réunions · Plus (`barreParDefaut`, sans changement). `EspaceBackOffice` le ramène à sa première entrée depuis toute adresse hors de `/back-office/taches`, `/back-office/reunions` et `/back-office/plus`. **Conséquences** : (a) tout choriste, musicien, présidence ou régie voit désormais le sélecteur ; c'est la réponse (a) laissée ouverte au lot G (« Question ouverte pour Timothée », § V18REUNIONS de `spec-retouches-v18.md`), et D30 est réglé ; (b) un simple membre d'une équipe qui donnait un pôle (ORGA, COMITÉ FRANCO, THÉOLOGIE, DA, DÉCORATION, MÉDIAS, ÉVÉNEMENTIEL, ACCUEIL J1) avait le Back-Office complet par ce pôle (tableau de bord, calendrier, Évènements si coordination) : il n'a plus que Tâches et Réunions (décision 4). Le relevé les liste (§ Migration, liste 2). |
| EQ18 | **Responsable** (`estResponsable`, Q1 de `spec-back-office.md`) : admin, ou `coordination`, `plannings`, `notify`, `annonces`, droit `equipes`, `referentDe`. **Choix** : la coordination compte, comme le pôle `evenement` comptait. Être membre d'une équipe ou du public Louange ne fait pas un responsable (Q1 garde son sens). Pour un responsable, `entreesBackOffice` donne Tâches si `equipesDe` n'est pas vide (toujours pour un admin), Réunions si `equipesDe` ou `referentDe` n'est pas vide, et **Évènements aussi si `referentDe` n'est pas vide** (**décision 43**, EQ21 ; `src/lib/access.ts:540`). Le reste ne change pas. Un référent reste responsable : Back-Office complet, Évènements compris. **Conséquence sur la barre du bas par défaut** (`barreParDefaut`, `src/lib/tableauDeBord/barre.ts:9`, `:18-21`) : elle prend Accueil · Calendrier · Tâches · Planning et complète dans l'ordre du menu (`ENTREES`, `src/types/backOffice.ts:4`, où Évènements précède Réunions). Un référent **sans** droit Planning, qui n'a pas enregistré sa barre, passe donc d'Accueil · Calendrier · Tâches · Réunions à **Accueil · Calendrier · Tâches · Évènements** ; Réunions va dans Plus. Avec le droit Planning, rien ne change ; une barre enregistrée est gardée (`barreAffichee`). Le raccourci « Nouvel évènement » du widget Raccourcis suit l'entrée Évènements (`raccourcisPermis`, `src/lib/tableauDeBord/donnees.ts:254`) : un référent l'a désormais. |

### E. Réunions et évènements d'équipe

| # | Règle |
|---|---|
| EQ19 | Le public `pole:<id>` disparaît : de `EvenementPour`, du choix « Pour » de « Nouvel évènement » et « Nouvelle réunion », de `creatableEvenementPours`, `canSeeEvenement`, `canCreateEvenement`, `estDeLaReunion`, `destinatairesEvenement`, et des règles. Il ne reste que `equipe:<id>`. Les évènements existants sont migrés (§ Migration). |
| EQ20 | (décision 8) Un évènement d'équipe garde la règle du lot E (E1 à E6 de `spec-retouches-v18.md`). `reunion: false` : inscriptions, période, liste des inscrits, rappel aux inscrits ; visible des membres de l'équipe, des admins et de la coordination (D22) ; notification à la publication aux seuls membres (`destinatairesEvenement`, Louange élargi). `reunion` absent ou `true` : réunion, sans inscriptions, au seul Back-Office › Réunions (lot G). |
| EQ21 | (décision 3) **Créer** une réunion ou un évènement d'équipe : les référents de l'équipe et les admins. C'est la branche `equipe:` d'aujourd'hui, inchangée (`src/lib/access.ts:217-218`, `firestore.rules:224-226`). Un simple membre n'en crée plus, ce qu'il pouvait faire pour un pôle (`firestore.rules:222-223`). **Évènement d'équipe qui n'est pas une réunion** : les référents de l'équipe et les admins le créent depuis l'écran (**décision 43**). Le choix V18POLE (`spec-retouches-v18.md`, § V18POLE, « Qui crée un évènement de pôle ») est levé ; on ouvre, comme sa note le dit : `peutCreerDans(…, false)` = `creatableEvenementPours(…).length > 0` (`src/app/back-office/evenements/ListeGestion.tsx:38-40`, en-tête de BO › Évènements, `layout.tsx:41`) ; `droits.evenement` = `pours.length > 0` (`src/app/back-office/calendrier/CalendrierClient.tsx:229-233` : bouton du Calendrier, panneau du jour et « + » du téléphone) ; `evenements` de `entreesBackOffice` + `\|\| nonVide(profile?.referentDe)` (`src/lib/access.ts:540`, EQ18). **Choix**, par cohérence d'affichage : `sousPartiesEvenements` aussi (`src/lib/access.ts:621`) ; un onglet seul ne s'affiche pas (`layout.tsx:42`). Après EQ19, `creatableEvenementPours` d'un référent sans autre droit ne rend que `equipe:<ses équipes>` : le formulaire « Nouvel évènement » (`NouveauClient.tsx:85`) ne propose que ces publics, et écrit `reunion: false`. L'App (Évènements, `src/app/evenements/SectionEvenements.tsx:33`) l'ouvrait déjà à tout responsable qui a un public : rien n'y change. **Règles : rien à changer** pour la décision 43 : la branche `equipe:` de `allow create` accepte déjà un référent, réunion ou non (`firestore.rules:224-226`), comme `canCreateEvenement` (`src/lib/access.ts:217-218`). Modifier ou supprimer l'évènement garde sa règle : l'organisateur et la coordination (`canEditEvenement`) ; BO › Évènements liste ceux que la personne peut modifier (`ListeGestion.tsx:69-70`). La garde `!pour.matches('(pole\|equipe):.*')` reste dans les règles, pour que plus personne ne crée de public `pole:`. |
| EQ22 | (décision 3) **Sujets et compte rendu** : toute personne de la réunion, c'est-à-dire les membres de l'équipe (Louange élargi), l'organisateur et les admins. Un choriste sans équipe propose donc des sujets aux réunions de Louange et les retrouve au Back-Office › Réunions. |
| EQ23 | **Libellés**, d'après les clés qui existent déjà. La pastille d'un évènement d'équipe porte le nom long de l'équipe (`equipes.team.<id>` : « TEAM DA », comme aujourd'hui, `EvenementCard.tsx:30-45`, `FicheGestion.tsx:83`). L'en-tête d'une réunion porte « Réunion d'équipe · DA » (`backOffice.reunionDEquipe` avec le nom court `equipes.court.<id>`, `EnTeteReunion.tsx:30`). **Choix** : les écrans de tâches (rail, pilules du formulaire, ligne, fiche, widget, aperçu de Moi) prennent aussi le nom court (« DA », « Médias »), comme les noms courts de pôle d'aujourd'hui (« DA », « Média ») ; les notifications prennent le nom long (EQ13). Pour `louange`, partout `equipes.public.louange` (« Louange », 敬拜, EQ4), et non « TEAM LOUANGE » ni 敬拜组. « Pôle X » et « Réunion de pôle · X » disparaissent. |

### F. Coordination

| # | Règle |
|---|---|
| EQ24 | (décision 6) **`users/{uid}.coordination: boolean`**, absent = non, coché par un admin dans Personnes. C'est le modèle du droit `equipes` (`src/components/admin/Personnes.tsx:368-384`). Écrit par `saveProfile` (masque `updateMask`) : la règle `allow update: if isAdmin()` des profils suffit, sans route serveur. Une personne ne se le donne pas à la création de son profil (`firestore.rules:88-98`). **Personne ne l'a au départ** : la migration ne pose ce champ pour personne. Aucune équipe ne la donne plus : ni TEAM ÉVÉNEMENTIEL, ni TEAM ACCUEIL J1. |
| EQ25 | Ce qu'ouvre la coordination ne change pas, seule sa source change (`isCoordination` et `isCoordination()`) : **la scène**, c'est-à-dire écrire tout programme, tout créneau, l'ordre de passage, réserver hors saison et pour tout « qui » (`src/lib/access.ts:102-127`, `firestore.rules:165-187`) ; **créer** pour toute l'église et toutes les sections (`:219`, `:237`, règles `:228`) ; **modifier, supprimer**, retirer un inscrit de tout évènement (`:248-256`, règles `:236`, `:241`, `desinscription/route.ts:35`, `notify-evenement/route.ts:44`) ; **voir** les évènements de section et les évènements d'équipe non-réunions (`:185`, `:190`). Elle fait de la personne une responsable (EQ18) et lui ouvre Évènements, avec Pâques et Noël (`sousPartiesEvenements`, `:613-624` ; `src/lib/tableauDeBord/disposition.ts:36`). Elle n'ouvre **aucune** tâche ni réunion d'équipe. |
| EQ26 | **Personnes** : dans le formulaire (`FormulairePersonne`), une case « Coordination » à côté de « Peut modifier l'organigramme », dans le bloc `BACK_OFFICE` (`src/components/admin/Personnes.tsx:351`) : `/admin` en ligne ne la montre pas. Dans la fiche (`PersonnesVolets`), carte Droits, une ligne « Coordination · Oui / Non » sous « Admin », comme sur la planche. La carte « Pôles » et « Coché hors organigramme · Décocher » disparaissent (`:49-93`, `:350-366` ; `PersonnesVolets.tsx:233-236`). |

### G. Organigramme

| # | Règle |
|---|---|
| EQ27 | (décision 7) **L'organigramme est gardé tel quel** : mêmes équipes, mêmes membres, mêmes référents. Disparaissent la pastille « Donne le pôle … » de chaque carte (planche Église), le sélecteur « Pôle donné par cette équipe » du panneau d'édition, et « : il donne les pôles de chacun » du sous-titre (`equipes.sousTitreGestion`). |
| EQ28 | **Rattachement** : `rattachementDe` rend `{ dansEquipes, referentDe }`. `recalculerPoles` devient `recalculerRattachement`, qui n'écrit que ces deux champs. **Choix** : la route `/api/equipes/poles` devient `/api/equipes/rattachement`, avec le même contrôle (`exigerDroitEquipes`, `{ tous: true }` aux admins seuls, 404 sans `BACK_OFFICE`) ; `majPoles` devient `majRattachement`. Un nom de route qui parle de pôles tromperait la prochaine session. « Recalculer depuis l'organigramme » garde son bouton ; son aide ne parle plus de pôles. |
| EQ29 | « Coché hors organigramme » n'a plus d'objet. Les comptes concernés sont listés une fois, avant la migration, par le relevé (décision 7, § Migration). |

### H. Libellés (FR et 中文, 中文 à relire par Timothée)

| # | Règle |
|---|---|
| EQ30 | **Retirées** : `taches.pole.*`, `taches.aucunPole`, `taches.prevenirPole`, `taches.polePrevenu`, `taches.champs.pole`, `taches.poles`, `evenements.pourPole`, `backOffice.reunionDePole`, `backOffice.tachesDesPoles`, `backOffice.plus.contenu.tesPoles` et `tousLesPoles`, `equipes.donnePole`, `equipes.poleEquipe`, `equipes.aucunPole`, `tableauDeBord.reglages.poles`. **Nouvelles ou réécrites** (proposition) : voir le tableau ci-dessous. Aussi réécrits sans « pôle » : `backOffice.plus.contenu.organigramme` (« organigramme » / 组织架构), `equipes.recalcul.aide`, `guide.sections.taches.*` et `guide.sections.evenements.body`, `.points`. Les messages d'erreur des routes restent en français seul, comme aujourd'hui : « Pas dans cette équipe », « Évènement réservé aux membres de l'équipe. ». |

Libellés nouveaux ou réécrits :

| Clé (proposition) | FR | 中文 |
|---|---|---|
| `taches.champs.equipe`, `taches.equipes` | Équipe, Équipes | 团队 |
| `taches.aucuneEquipe` | Tu ne fais partie d'aucune équipe : les tâches sont réservées aux membres des équipes. | 你不属于任何团队：任务只对团队成员开放。 |
| `taches.pasMembre` | Tu ne fais pas partie de cette équipe. | 你不属于这个团队。 |
| `taches.pourTous` | Toute l'équipe | 整个团队 |
| `taches.equipePrevenue` | Équipe prévenue : {{equipe}}. | 已通知：{{equipe}}。 |
| `taches.subtitle` | Tâches de l'équipe | 团队任务 |
| `taches.sousTitreBackOffice` | Les tâches de tes équipes : ce qui est en retard d'abord | 你所在团队的任务：逾期的排在前面 |
| `taches.aucuneTache` | Pas encore de tâche pour tes équipes. | 你的团队暂时还没有任务。 |
| `equipes.public.louange` | Louange | 敬拜 |
| `backOffice.tachesDesEquipes` | Les tâches des équipes | 各团队的任务 |
| `backOffice.gestion.sousTitreReunions` | Les réunions de tes équipes | 你所在团队的会议 |
| `backOffice.plus.contenu.tesEquipes`, `toutesLesEquipes` | tâches de tes équipes ; tâches de toutes les équipes | 你所在团队的任务；所有团队的任务 |
| `tableauDeBord.reglages.equipes` | Équipes | 团队 |
| `equipes.sousTitreGestion` | Organigramme GCC Franco {{annee}} | GCC 法语堂 {{annee}} 组织架构 |
| `equipes.recalcul.aide` | Repose, pour chaque membre d'une équipe, ses équipes et celles dont il est référent : c'est ce qui ouvre aux membres les réunions et les tâches de leur équipe, et aux référents leur création. | 为每个团队成员重新设定其所属团队和负责的团队：成员由此可以查看团队的会议和任务，负责人可以创建。 |
| `personnes.coordination`, `.coordinationAide` | Coordination ; « Régler la scène, créer pour toute l'église, modifier tout évènement » | 协调；管理舞台、为全教会创建、修改所有活动 |

La fiche et le formulaire de Personnes sont encore écrits en français en dur (Q16 de `spec-back-office.md`). La case et
la ligne « Coordination » passent par ces clés, dans les deux langues.

### I. Interrupteur

| # | Règle |
|---|---|
| EQ31 | Tout le lot reste derrière `BACK_OFFICE`. En ligne, sans l'interrupteur : `/api/taches/*` et `/api/equipes/rattachement` répondent 404 ; `/taches/*`, `/back-office/*` et `/equipes` aussi ; le cron ne lit ni tâches ni évènements ; `/admin` ne montre ni la case « Coordination » ni aucun bloc d'équipe. Test : `tests/back-office-coupe.spec.ts` (second serveur). |

**Réussite.**

1. Léa M., référente de TEAM MÉDIAS, crée « Photos du culte » pour Joël F., simple membre. Joël F. reçoit
   « Nouvelle tâche ».
2. Joël F. ouvre le Back-Office : deux entrées, Tâches et Réunions. Il coche sa tâche ; l'équipe choisie dans
   « Prévenir » l'apprend. La tâche « Ranger la régie » de TEAM MÉDIAS, sans responsable, est dans la liste de
   l'équipe, case inerte pour lui ; Léa M. la coche, et c'est elle, référente, qui en reçoit les rappels.
3. Hugo L. (TEAM DA) ne voit rien de TEAM MÉDIAS.
4. Un choriste sans équipe voit les tâches et les réunions de Louange, y propose un sujet, et ne crée rien.
5. Un membre de TEAM ÉVÉNEMENTIEL ne règle la scène que si un admin a coché « Coordination » pour lui.
6. Léa M., sans droit d'annonces, a l'entrée Évènements ; « Nouvel évènement » ne lui propose que TEAM MÉDIAS, et
   l'évènement publié (avec inscriptions) prévient les seuls membres de l'équipe. Joël F. n'a ni l'entrée ni le bouton.
7. Sur la planche Église, plus aucune pastille de pôle.

## Tranches de code

Un commit par tranche, message en français. Chaque tranche passe `npx tsc --noEmit` et ses tests ; le module n'est
complet qu'après EQ-C.

| Tranche | Ce qui change | Fichiers touchés | Ordre / conflits |
|---|---|---|---|
| **EQ-A — Coordination** | EQ24 à EQ26 : `coordination` sur le profil, `isCoordination` client et règles, garde de création, case et ligne de Personnes. Les profils des tests passent de `poles: ["evenement"]` à `coordination: true`. | `src/types/user.ts`, `src/lib/access.ts`, `src/lib/firebase/users.ts`, `firestore.rules`, `src/components/admin/Personnes.tsx`, `PersonnesVolets.tsx`, `notify-evenement/route.ts`, `desinscription/route.ts`, locales, `tests/helpers/fakeSession.ts` | La première. Indépendante du reste. Lot 3 (`spec-planning-gestes.md`) codé en parallèle ; fichiers communs aux lots 1 et 3, quelle que soit la tranche qui les touche : `src/locales/fr.json`, `src/locales/zh-CN.json`, `tests/helpers/fakeSession.ts`, `tests/back-office-coupe.spec.ts` (liste des routes en 404), `tests/coherence.spec.ts`, `CLAUDE.md` (liste des routes), `tests/planning-grille.spec.ts` et `tests/planning-2027.spec.ts` (profils simulés). Le partage d'une setlist (`docs/spec-partage-setlist.md`) est aussi codé en parallèle (décision 45) : il touche `src/lib/access.ts` (fonctions des setlists, `editeurs`), `firestore.rules` (`match /setlists`) et les locales, des fonctions et des blocs différents de ce lot. Consigne : `git pull --rebase`, garder les deux ajouts. |
| **EQ-B — Accès par équipe, réunions et évènements** | EQ2 à EQ5, EQ17 à EQ23 : `equipesDe`, `estDeLEquipe`, `estReferentDe` ; `entreesBackOffice` (Évènements aux référents, décision 43), `sousPartiesEvenements`, `estResponsable`, `EspaceBackOffice` ; « Nouvel évènement » ouvert aux référents (`peutCreerDans`, `droits.evenement`) ; retrait du public `pole:` ; `destinatairesEvenement` (Louange élargi) ; libellés des pastilles ; règles `estDeLEquipe`, `estDeLaReunion`, création des évènements. | `src/lib/access.ts`, `firestore.rules`, `src/types/evenement.ts`, `src/lib/evenements/serveur.ts`, `src/lib/taches/serveur.ts` (`membresDeLEquipe` seulement), `src/app/back-office/EspaceBackOffice.tsx`, `src/app/back-office/evenements/ListeGestion.tsx` (`peutCreerDans` et son commentaire), `src/app/back-office/calendrier/CalendrierClient.tsx` (`droits.evenement` seulement), `EvenementCard.tsx`, `FicheGestion.tsx`, `EnTeteReunion.tsx`, `EvenementForm.tsx`, `src/lib/calendrier/entrees.ts` (réunions), locales | Après EQ-A. `polesDe`, `isPoleMember` et `isTachePole` restent, pour le code des tâches, jusqu'à EQ-C. Les règles ne sont publiées qu'à la fin : les états intermédiaires ne touchent pas la base. |
| **EQ-C — Tâches par équipe** | EQ6 à EQ16 : chemin, types, client REST, serveur, routes (`/fait` vérifie `peutCocher`), cron (rappels « toute l'équipe » aux référents), messages, écrans App et Back-Office (dossiers `[pole]` renommés `[equipe]`), formulaire, fiche, calendrier, widget, pastilles, Plus, barre du haut, Moi, fiche d'évènement, duplication ; `peutCocher`, `aFairePour` (décision 41) ; règles `equipes/{equipe}/taches`. | tous les fichiers « Tâches » du relevé, `src/lib/taches/echeances.ts`, `src/lib/taches/serveur.ts` (`referentsDeLEquipe`), `src/types/tache.ts`, `src/types/backOffice.ts`, `firestore.rules`, locales | Après EQ-B. La plus grosse : une session. |
| **EQ-D — Organigramme sans pôles** | EQ1, EQ27 à EQ29 : `pole` retiré de la table, des documents `equipes`, de `rattachementDe` ; `recalculerRattachement` ; route renommée ; pastille et sélecteur retirés ; `POLES` et `Pole` supprimés ; `PolesDuMembre` retiré. | `src/lib/equipes/{table,organigramme,serveur}.ts`, `src/lib/firebase/equipes.ts`, `src/app/api/equipes/rattachement/route.ts` (nouveau), `src/app/api/equipes/poles/route.ts` (supprimé), `RecalculerOrganigramme.tsx`, `EquipesClient.tsx`, `src/app/back-office/equipes/page.tsx`, `Personnes.tsx`, `PersonnesVolets.tsx`, `src/types/{user,equipe}.ts`, `src/lib/firebase/users.ts`, `CLAUDE.md` (liste des routes) | Après EQ-C : les tâches ne lisent plus `Pole`. Le lot 2 part de cette tranche (Personnes, organigramme). Note pour lui : `rattachementDe` ne garde que les ids de `EQUIPES` (`organigramme.ts:38-42`). |
| **EQ-E — Migration** | § Migration : `src/lib/equipes/migration.ts` (nouveau, pur : correspondance, relevé, plan d'opérations) et `scripts/poles-vers-equipes.ts` (nouveau, Admin SDK, à blanc par défaut, `--ecrire`). | les deux fichiers nouveaux | Après EQ-C et EQ-D : le modèle final est connu. |
| **EQ-F — Nettoyage et passage complet** | Clés de langue devenues orphelines, guide, commentaires (`EnTetePage.tsx:15`, `deuxVolets.ts:36`, `:43`, `useNotifications.ts:83-86`, `profil/page.tsx:94`, tête de `firestore.rules`) ; critère EQ1 ; toutes les specs de test réécrites vertes ; `back-office-coupe` ; captures aux trois tailles, et aux cinq pour l'agencement ; `docs/feuille-de-route.md` et Avancement. | locales, commentaires, `tests/` | La dernière. Fichiers communs avec le lot 3, codé en parallèle : ceux listés en EQ-A (`src/locales/fr.json`, `src/locales/zh-CN.json`, `tests/helpers/fakeSession.ts`, `tests/back-office-coupe.spec.ts`, `tests/coherence.spec.ts`, `CLAUDE.md`, `tests/planning-grille.spec.ts`, `tests/planning-2027.spec.ts`), et avec le partage d'une setlist (`src/lib/access.ts`, `firestore.rules`, locales) ; `git pull --rebase`, garder les deux ajouts. |

## Droits en double

| Droit | `src/lib/access.ts` (fonction) | `firestore.rules` (match / fonction) | Route serveur (Admin SDK) |
|---|---|---|---|
| Être d'une équipe, Louange élargi | `equipesDe`, `estDeLEquipe` (nouvelles ; remplacent `polesDe`, `isPoleMember`, `estDansEquipe`) | `estDeLEquipe(equipe)` (nouvelle, remplace `isTachePole`) | `membresDeLEquipe`, `appelantDeLEquipe` (`src/lib/taches/serveur.ts`) |
| Être référent | `estReferentDe` (nouvelle) | `estReferentDe(equipe)` (nouvelle) | `/api/taches/assigne` |
| Voir les tâches d'une équipe | `estDeLEquipe`, `equipesDesTaches` | `match /equipes/{equipe}/taches/{id}` : `read` | — |
| Créer, modifier, supprimer, déplacer une tâche | `estReferentDe`, `equipesOuCreer` | `create` (auteur = soi, `equipe` = chemin), `update` (`equipe` inchangée), `delete` | — |
| Changer l'état d'une fois (décision 41) | `peutCocher` (nouvelle) : référent ou admin ; sinon membre **et** responsable = soi. Suivie par `aFairePour` (« à moi ») | `match …/fois/{date}` : `write` si référent, ou membre et responsable = soi (`get` de la tâche) ; une tâche sans responsable : référents et admins seulement | `/api/taches/fait` : `peutCocher` sur le profil et la tâche lus par le serveur |
| Être rappelé d'une tâche | — (`aFairePour` pour l'affichage) | — (Admin SDK) | cron : le responsable, sinon `referentsDeLEquipe` (EQ12) |
| Être d'une réunion (sujets, compte rendu) | `estDeLaReunion` | `estDeLaReunion(e)`, sous `evenements/{id}` et `…/sujets` | `destinatairesEvenement` (cron, `notify-evenement`) |
| Créer une réunion ou un évènement d'équipe (décisions 3 et 43) | `canCreateEvenement`, `creatableEvenementPours` (inchangées, hors retrait de `pole:`) ; affichage : `peutCreerDans`, `droits.evenement`, entrée et sous-partie Évènements (EQ21) | `evenements` : `create`, branche `equipe:` (inchangée : elle accepte déjà un référent, réunion ou non) | `/api/push/notify-evenement` |
| Voir un évènement d'équipe, s'y inscrire | `canSeeEvenement`, `canInscrireEvenement` | lecture ouverte aux connectés (filtrage client, choix assumé de `CLAUDE.md`) | `/api/evenements/inscription` (`inscrire`, `src/lib/evenements/serveur.ts:65-86`) |
| Coordination | `isCoordination` (`coordination === true`) | `isCoordination()` | `notify-evenement`, `desinscription` (par `canEditEvenement`) |
| Cocher « Coordination » | admin seul (Personnes) | `users/{uid}` : `update` admin (inchangée) ; `create` : `coordination` interdit | — |
| Entrées du Back-Office | `entreesBackOffice`, `estResponsable` | — : affichage seulement, chaque sous-partie garde sa règle | — |
| Rattachement (`dansEquipes`, `referentDe`) | `canEditerEquipes` (inchangée) | `isEquipier()` pour `equipes/{id}` (inchangée) ; `users` : `update` admin | `/api/equipes/rattachement` (renommée, `exigerDroitEquipes`) |

Règles proposées. La tête de fichier et les commentaires sont réécrits en EQ-F.

```
// Équipes (lot 1 du chantier « équipes et groupes », docs/spec-equipes-sans-poles.md) : est d'une
// équipe qui y figure (`dansEquipes`, recopié par le serveur) ; « louange » aussi à toute personne qui
// a un rôle de service (décision 5). Miroir : estDeLEquipe / estReferentDe (src/lib/access.ts).
function estDeLEquipe(equipe) {
  return isAdmin() || (hasProfile() && (
    equipe in profile().get('dansEquipes', [])
    || (equipe == 'louange' && profile().get('serviceRoles', {}).size() > 0)));
}
function estReferentDe(equipe) {
  return isAdmin() || (hasProfile() && equipe in profile().get('referentDe', []));
}
function isCoordination() {
  return isAdmin() || (hasProfile() && profile().get('coordination', false) == true);
}

match /equipes/{equipe} {
  allow read: if signedIn();
  allow create, update, delete: if signedIn() && isEquipier();

  match /taches/{id} {
    allow read: if signedIn() && estDeLEquipe(equipe);
    allow create: if signedIn() && estReferentDe(equipe)
      && request.resource.data.auteurUid == request.auth.uid
      && request.resource.data.equipe == equipe;
    allow update: if signedIn() && estReferentDe(equipe) && request.resource.data.equipe == equipe;
    allow delete: if signedIn() && estReferentDe(equipe);

    // Cocher (décision 41) : le responsable s'il est de l'équipe ; une tâche
    // sans responsable (« toute l'équipe »), les référents et les admins.
    match /fois/{date} {
      allow read: if signedIn() && estDeLEquipe(equipe);
      allow write: if signedIn() && (estReferentDe(equipe)
        || (estDeLEquipe(equipe)
            && get(/databases/$(database)/documents/equipes/$(equipe)/taches/$(id)).data.get('responsableUid', null)
               == request.auth.uid));
    }
  }
}

function estDeLaReunion(e) {
  return isAdmin() || e.organisateurUid == request.auth.uid
    || (e.pour.matches('equipe:[a-z0-9-]+') && estDeLEquipe(e.pour.split(':')[1]));
}

// evenements/{id}, create :
//   ((pour.matches('equipe:[a-z0-9-]+') && estReferentDe(pour.split(':')[1]))
//    || (!pour.matches('(pole|equipe):.*') && (isCoordination() || pour in profile().annonces)))
// users/{uid}, create : EQ-A ajoute `get('coordination', false) == false` ; EQ-D retire `poles == []`
//   (état final : `poles == []` remplacé par la ligne `coordination`).
// Supprimés : isTachePole, match /poles/{pole}/taches/{id}.
```

`get('responsableUid', null)` et non `.responsableUid` : une tâche sans le champ se lit comme « toute l'équipe », comme
le fait `fromFsTache` (`src/lib/firebase/taches.ts:21`), et la règle refuse alors proprement la coche d'un simple membre
au lieu d'échouer sur un champ absent ; un référent passe par la première branche, sans lecture. Les tâches écrites par
l'app portent le champ (`null` explicite), celles de la migration le gardent.

Le lot passe-t-il par une route serveur ?

- `coordination` : non, un admin l'écrit directement.
- Les rappels, « tâche faite » et « nouvelle tâche » : oui, par les routes et le cron (Admin SDK), qui revérifient
  l'appelant.
- `dansEquipes` et `referentDe` : oui, par `/api/equipes/rattachement`.
- Créer un évènement d'équipe depuis « Nouvel évènement » (décision 43) : non, écriture REST directe, comme
  aujourd'hui ; la notification passe par `/api/push/notify-evenement`, inchangée.

**Les règles ne sont pas testées par Playwright** : la base est simulée, il n'y a pas d'émulateur. La relecture du lot
confronte `access.ts` et `firestore.rules` fonction par fonction.

**Timothée publie `firestore.rules` lui-même** dans la console Firebase, au moment dit au § Migration.

## Migration des données

### Correspondance (décision 7)

| Pôle | Devient | Change d'id ? |
|---|---|---|
| `da` | équipe `da` (TEAM DA) | non |
| `media` | équipe `medias` (TEAM MÉDIAS) | **oui** |
| `orga` | équipe `orga` (TEAM ORGA) | non |
| `evenement` | équipe `evenementiel` (TEAM ÉVÉNEMENTIEL) | **oui** |
| `louange` | `louange` (public Louange élargi, EQ4) | non |

**L'organigramme actuel est gardé tel quel** : personne n'est ajouté ni retiré d'une équipe. La correspondance ne
s'applique qu'aux données rangées par pôle : tâches, évènements, réglages, clés. Elle ne s'applique pas aux personnes.

### Ce que cela retire à certains (décision 40 : perte voulue)

Timothée l'a confirmé : la perte est voulue. Le relevé nomme ces personnes, Timothée les ajoute à la main à
l'équipe cible dans l'organigramme (ou réassigne leurs tâches), avant ou après la migration. Personne n'est ajouté
automatiquement.

Des pôles étaient donnés par d'autres équipes que l'équipe cible (`src/lib/equipes/table.ts:24`, `:30`, `:32`, `:33`) :
c'est la table par défaut. Le pôle d'une équipe se règle à l'écran et se stocke dans `equipes/{id}.pole`
(`src/app/equipes/EquipesClient.tsx:257`, `:374-425`) : le relevé lit **les valeurs stockées**, pas la table, et peut
donc nommer d'autres équipes que celles-ci.

| Équipe | Donnait le pôle | Membres qui perdent, s'ils ne sont pas aussi dans l'équipe cible |
|---|---|---|
| COMITÉ FRANCO, THÉOLOGIE | Orga | tâches et réunions d'Orga, faute d'être dans TEAM ORGA |
| DÉCORATION | DA | tâches et réunions de DA, faute d'être dans TEAM DA |
| ACCUEIL J1 | Événement | tâches et réunions d'Événement, faute d'être dans TEAM ÉVÉNEMENTIEL, et la coordination |
| ÉVÉNEMENTIEL | Événement | la coordination, que personne n'a au départ (décision 6) |

Les membres de TEAM ÉVÉNEMENTIEL gardent les tâches et réunions de leur équipe. Les comptes qui avaient un pôle coché
« hors organigramme » (D10 du lot 16) perdent ce pôle. Les tâches « toute l'équipe » ne se cochent plus que par les
référents et les admins (décision 41), quel que soit le pôle d'origine.

### Le relevé, avant tout (décision 7)

Il est **lancé par Timothée** sur son ordinateur, **en lecture seule**. Aucune session ne lit la vraie base.

```
npx tsx --env-file=.env.local scripts/poles-vers-equipes.ts
```

`FIREBASE_SERVICE_ACCOUNT` (`src/lib/push/admin.ts:16`) doit être dans `.env.local`, ou exporté dans le terminal. Sans `--ecrire`, le script
n'écrit rien. Il imprime, dans le terminal seulement, jamais dans un fichier du dépôt (dépôt public, noms réels) :

1. **les comptes qui ont un pôle « coché hors organigramme »** : `poles` contient un pôle que leurs équipes ne
   donnent pas, la règle de `PolesDuMembre` (`src/components/admin/Personnes.tsx:52-53`). C'est la liste demandée par
   la décision 7 ;
2. **les comptes qui perdent un accès** (tableau ci-dessus) : ils avaient un pôle par une équipe autre que l'équipe
   cible, sans être dans celle-ci. Même liste, un second repère : ceux dont le Back-Office complet ne tenait qu'à un
   pôle (ni `plannings`, `notify`, `annonces`, droit Équipes ni `referentDe`) : ils n'auront plus que Tâches et
   Réunions (EQ17, b) ;
3. **les comptes qui avaient la coordination** par le pôle Événement, pour que Timothée coche « Coordination » à
   ceux qui doivent la garder ;
4. **les tâches dont le responsable ne sera pas membre de l'équipe cible** (décision 40). Elles restent assignées,
   mais leur responsable ne pourra plus ni les ouvrir ni les cocher. Et **les tâches sans responsable d'une équipe
   sans référent** : seul un admin pourra les cocher, et personne n'en sera rappelé (EQ12, décision 41) ;
5. **les chiffres** : tâches et fois par pôle ; tâches dont `prevenir` vise un pôle ; évènements `pole:*`
   (réunions, non-réunions, sujets) ; tableaux de bord dont le widget « À faire » a un réglage `poles` ; clés
   `notifLog` de tâches à recopier ; profils dont `dansEquipes` ou `referentDe` changeraient au recalcul ;
6. **le plan** : la liste des écritures que ferait `--ecrire`, comptées par étape.

### La migration elle-même

C'est le même script, avec `--ecrire`, **lancé par Timothée**. Il passe par l'Admin SDK (`src/lib/push/admin.ts`),
qui contourne les règles. Il imprime d'abord le relevé et le plan, puis écrit, étape par étape, dans cet ordre :

| Étape | Données | Ce qui est écrit | Idempotence (second passage = 0 opération) |
|---|---|---|---|
| 1 | `users/{uid}.dansEquipes`, `referentDe` | recalculés depuis l'organigramme pour **tous** les profils (`recalculerRattachement`), pas seulement pour les membres. C'est « Recalculer depuis l'organigramme » étendu aux profils d'avant R4. | un profil déjà juste n'est pas réécrit (`src/lib/equipes/serveur.ts:51-52`) |
| 2 | `poles/{p}/taches/{id}` et `…/fois/{date}` | recopiés sous `equipes/{EQ[p]}/taches/{id}`, **même id** de tâche et de fois. `pole` est retiré, `equipe` posé ; `prevenir.pole` devient `prevenir.equipe`. Le reste est recopié tel quel : auteur, dates, évènement lié, état et `debutLe` des fois. Puis la source est supprimée, les fois d'abord. | la source supprimée n'est plus relue ; une copie déjà faite est réécrite à l'identique |
| 3 | `evenements/{id}` dont `pour` vaut `pole:<p>` | `pour = "equipe:<EQ[p]>"`, réunions et non-réunions, **tout l'historique**. Ainsi « Réunions précédentes » (`listReunionsDu`, `src/lib/firebase/evenements.ts:102-110`) et la reprise des sujets (`firestore.rules:266`, même `pour` exigé) suivent. Les sujets ne bougent pas (ids et `reprisDans` inchangés). Les réunions `equipe:louange` qui existent déjà (TEAM LOUANGE) rejoignent celles de `pole:louange` : toutes sont au public Louange élargi (EQ4, décision 5). | plus aucun `pole:*` à lire |
| 4 | `backOffice/{uid}.tableauDeBord[].reglages.poles` | traduit en `reglages.equipes` (`media` → `medias`, `evenement` → `evenementiel`), `poles` retiré | plus de `poles` |
| 5 | `notifLog` : clés `rappel-tache-{J3,J1,retard,encours}-{media,evenement}-…`, `tache-fait-{media,evenement}-…`, `tache-assigne-{media,evenement}-…` | un document est `notifLog/{clé}-{uid}` (`src/lib/taches/serveur.ts:54`, `cron/reminders/route.ts:66`) : il est **recopié** sous un nom où `media` devient `medias` et `evenement` devient `evenementiel` ; les anciens restent | un `set` du même document |
| 6 | `equipes/{id}.pole` | champ supprimé | supprimer un champ absent ne fait rien |
| 7 | `users/{uid}.poles` | champ supprimé, **en dernier** : le relevé de chaque passage le lit | idem |

**Les clés `notifLog`** (étape 5). Pour Orga, DA et Louange, l'id ne change pas : les clés restent valables. Pour
Média et Événement, elles changeraient. Sans la recopie, un rappel J-3, J-1 ou « en retard » déjà parti le matin de la
bascule repartirait si le cron tournait encore ce jour-là (relance manuelle, nouvel essai). Une fois « faite » déjà
annoncée serait aussi annoncée de nouveau si on la recochait. Le risque est faible, car le cron en ligne ne lit pas les
tâches tant que le back-office est coupé (`src/app/api/cron/reminders/route.ts:245`). La recopie le supprime pour une
dizaine de lignes de script.

**Ce qui n'est pas migré** :

- `coordination` n'est posée pour personne (décision 6) ;
- personne n'est ajouté à une équipe (décision 7) ;
- les notifications déjà dans la cloche (`notifications/{id}`) gardent leur texte « Pôle DA » ;
- les liens de pôle déjà envoyés mènent à `/taches`, qui ne dépend pas du pôle depuis le lot U6 B3
  (`src/app/api/taches/assigne/route.ts:37`, `fait/route.ts:48`).

**Pourquoi un script et pas une route d'administration.** Le modèle proposé, `src/app/api/admin/migrer-annonces`,
n'existe plus : aucune route sous `src/app/api/admin/` à `5878ce1`, et `/api/equipes/importer` est retirée depuis
`144c36c`. Un script ne part pas en production, se lance à blanc, imprime un relevé lisible et n'a pas besoin de
l'interrupteur. C'est le patron de présentation de `scripts/releve-pianistes-fidelite.ts` (lot F : à blanc, relevé imprimé au terminal) ; ce script-là lit en REST et n'écrit rien, le nôtre passe par l'Admin SDK.

### Ordre de la bascule (une seule séance, par Timothée)

1. **Le code du lot est sur `ui/apple-design`**, toutes les tranches vertes. Le local de Timothée tourne encore
   l'ancien code.
2. **Relevé** : le script sans `--ecrire`. Timothée lit les listes. S'il veut que quelqu'un garde un accès, il
   l'ajoute dans l'organigramme, à la main, avant ou après (décision 40) ; il peut aussi nommer un référent dans une
   équipe sans référent qui a des tâches « toute l'équipe » (liste 4).
3. **Publier les règles du lot** dans la console Firebase. **Les règles d'abord** : elles ne lisent que ce que la
   migration ajoute ou déplace (`dansEquipes`, `referentDe`, `equipes/*/taches`, `evenements.pour`) et `coordination`, que
   Timothée coche au point 6. Dès la publication, plus personne n'a la coordination par un pôle. Une fois publiées,
   chaque étape de la migration est aussitôt lisible par le nouveau code. Un arrêt en cours de route (réseau) se
   rattrape en relançant le script, sans laisser de données déplacées mais illisibles. Dans l'autre ordre, les tâches
   recopiées resteraient illisibles jusqu'à la publication. En ligne, rien ne change : le module est coupé, ici comme
   sur `origin/main`. En local, l'ancien code perd ses tâches dès cette étape : ne pas s'en servir jusqu'au point 5.
4. **Migration** : le même script avec `--ecrire`. Puis de nouveau sans `--ecrire`, qui doit répondre
   « 0 opération ».
5. **Tirer le code** en local (`git pull --rebase` sur `ui/apple-design`, relancer `npm run dev`) et vérifier :
   Tâches, Réunions, un évènement d'équipe, Personnes.
6. **Cocher « Coordination »** dans Équipes › Personnes pour qui doit régler la scène. La liste 3 du relevé donne qui
   l'avait.

**`firestore.rules` est un seul fichier.** Toute publication ultérieure (lot 2, lot 3 s'il touche les règles, lot 4,
partage d'une setlist, qui change `match /setlists` pour le champ `editeurs` : décisions 39 et 45) publie aussi les
règles du lot 1. Cette bascule (relevé, règles, migration
`--ecrire`, coordination cochée) se fait donc avant la première de ces publications, ou dans la même séance.

## Tests Playwright à écrire d'abord

Tous sont vus rouges avant le code. Ils tournent sur trois appareils (`ordinateur`, `telephone`, `tablette`), sauf
mention. La base et les routes sont simulées (`tests/helpers/fakeSession.ts`, `page.route`). Les fonctions pures se
testent sans page, comme `planning-fidelite.spec.ts`. Les noms sont fictifs.

**Ordre** : chaque spec nouvelle s'écrit, rouge, au début de sa tranche : `equipes-coordination` pour EQ-A ;
`equipes-acces` et `equipes-reunions` pour EQ-B ; `equipes-taches` pour EQ-C ; `equipes-agencement` pour EQ-D ;
`equipes-migration` pour EQ-E.

**Nouveaux fichiers** :

| Fichier | Vérifie |
|---|---|
| `tests/equipes-acces.spec.ts` | Pur : `equipesDe` (membre de TEAM DA ; choriste sans équipe → `louange` ; membre de TEAM LOUANGE sans rôle de service → `louange` ; ordre de la table) ; `estDeLEquipe`, `estReferentDe`, `peutCocher` (responsable oui ; autre membre non ; tâche « toute l'équipe » : simple membre **non**, référent oui, admin oui ; responsable sorti de l'équipe non ; décision 41) ; `aFairePour` (une tâche sans responsable est « à moi » pour une référente, pas pour un simple membre) ; `isCoordination` (booléen ; `poles: ["evenement"]` ne donne plus rien) ; `estResponsable` (coordination oui ; membre seul non ; Louange seul non) ; `entreesBackOffice` (membre simple → Tâches + Réunions ; choriste sans équipe → Tâches + Réunions ; référent sans autre droit → tableau, calendrier, tâches, évènements, réunions, décision 43 ; coordination → plus Évènements) ; `sousPartiesEvenements` d'un référent → `["evenements"]` ; `barreParDefaut` d'un référent sans Planning → tableau, calendrier, tâches, évènements ; avec Planning → tableau, calendrier, tâches, planning ; `raccourcisPermis` d'un référent : « Nouvel évènement » compris ; plus de public `pole:` dans `creatableEvenementPours`. Écran : Joël F., simple membre de TEAM MÉDIAS, voit App · Back-Office. En grand, le menu n'a que Tâches et Réunions ; au doigt, la barre du bas est Tâches · Réunions · Plus. `/back-office` et `/back-office/calendrier` le ramènent à Tâches. Un choriste n'y voit que Louange. |
| `tests/equipes-taches.spec.ts` | Léa M., référente de TEAM MÉDIAS, crée une tâche pour Joël F. : `POST …/equipes/medias/taches` avec `equipe: "medias"`, puis `/api/taches/assigne` avec `{ equipe, tacheId }`. Joël F. la voit et la coche (fois écrite sous `equipes/medias/…`). Il n'a ni « + Nouvelle tâche », ni « Modifier », ni « Supprimer ». La case d'une tâche d'un autre responsable est inerte ; celle d'une tâche « toute l'équipe » aussi pour Joël F. (décision 41), et sa pastille Tâches ne la compte pas ; Léa M., référente, la coche (fois écrite) et la voit dans « À faire pour moi ». `/api/taches/fait` répond 403 à un simple membre sur une tâche « toute l'équipe » (base simulée). Hugo L. (TEAM DA) n'émet aucune lecture de `equipes/medias/taches`. Liste vide : rail des seules équipes qui ont une tâche, plus celles dont on est référent ; admin sans 13 onglets vides ; « Pas encore de tâche pour tes équipes. ». Un musicien sans équipe voit les tâches de Louange et pas les autres. « Prévenir » liste des équipes. `/api/taches/fait` répond `cible: "equipe"` et « Équipe prévenue : TEAM DA. ». Pur : cibles du cron (le responsable ; sans responsable, les référents de l'équipe et pas ses simples membres ; Louange : les référents de TEAM LOUANGE, pas un choriste ; une équipe sans référent : personne) ; clés `rappel-tache-J3-medias-…` ; une tâche restée sous `poles/` ignorée. Libellés FR et 中文 (« TEAM MÉDIAS · pour … », 媒体组 · 截止 …). Calendrier : la tâche, son lien `/taches/medias`. Widget « À faire » : réglage « Équipes ». Aperçu de Moi. Fiche d'évènement : carte masquée pour un membre sans tâche liée, « Nouvelle tâche » pour une référente. Duplication : seules les tâches des équipes où l'on crée. |
| `tests/equipes-reunions.spec.ts` | Réunion `equipe:louange` : un choriste sans équipe la trouve au Back-Office › Réunions et propose un sujet. Il n'a pas « + Nouvelle réunion », et `/back-office/reunions/nouvelle` lui dit « Réservé ». La référente de TEAM LOUANGE la crée. Un simple membre de TEAM DA ne crée pas de réunion. « Réunions précédentes » et la reprise des sujets sur `equipe:medias`, avec un historique au `pour` migré. Notification de publication d'un évènement d'équipe aux seuls membres (`destinatairesEvenement`, base simulée, Louange élargi). Pastille « TEAM DA » et « Louange », plus de « Pôle DA ». L'adresse d'une réunion de Louange mène le choriste au Back-Office (lot G, G2). **Décision 43** : Léa M., référente de TEAM MÉDIAS sans droit d'annonces, a l'entrée Évènements et « Nouvel évènement » en tête de BO › Évènements et au Calendrier (panneau du jour en grand, « + » sur téléphone) ; le formulaire ne propose que TEAM MÉDIAS ; `POST evenements` avec `pour: "equipe:medias"`, `reunion: false`, inscriptions ; l'évènement est dans sa liste. Joël F., simple membre, n'a ni l'entrée ni le bouton, et `/back-office/evenements/nouveau` le ramène à Tâches (EQ17). |
| `tests/equipes-coordination.spec.ts` | Un admin coche « Coordination » dans Personnes : `PATCH users/{uid}` avec `updateMask.fieldPaths=coordination` ; la fiche dit « Coordination · Oui », en FR et en 中文. Un non-admin qui a le droit Équipes ne voit pas la case. Un membre de TEAM ÉVÉNEMENTIEL ou d'ACCUEIL J1 sans la case n'a ni Pâques ni Noël au Back-Office, ni « Toute l'église » dans « Pour », ni « Modifier » sur l'évènement d'un autre. Avec la case, il a les trois. La carte « Pôles » et « Coché hors organigramme » n'existent plus. |
| `tests/equipes-migration.spec.ts` | Pur, sur une base simulée en mémoire : la correspondance des cinq pôles ; une tâche et ses fois recopiées (`equipe`, `prevenir` traduit, même id, `debutLe` gardé), la source supprimée ; les évènements `pole:*` passés en `equipe:*`, réunions et non-réunions, sujets inchangés ; les réglages du widget ; les clés `notifLog` de Média et Événement recopiées, celles d'Orga laissées ; `equipes.pole` et `users.poles` retirés ; `dansEquipes` recalculé pour un profil hors des équipes. Relevé : coché hors organigramme, pertes d'accès (un membre de COMITÉ FRANCO hors TEAM ORGA), coordination d'avant, responsable hors équipe, tâche sans responsable d'une équipe sans référent. À blanc : la base est inchangée. Second passage : 0 opération. |
| `tests/equipes-agencement.spec.ts` | **Cinq projets** : ajouté à `SPECS_GRAND_ECRAN` dans `playwright.config.ts` (`/equipes-agencement\.spec\.ts/`). Organigramme « Église » sans pastille « Donne le pôle », cartes sans débordement. Fiche de Personnes : ligne « Coordination » dans Droits, plus de carte Pôles. Back-Office d'un simple membre : deux entrées en grand, barre du bas au doigt. Back-Office d'une référente sans Planning : Évènements dans le menu en grand ; au doigt, la barre par défaut Accueil · Calendrier · Tâches · Évènements, Réunions dans Plus (décision 43). Rail des équipes de Tâches. `verifierEnTete` et `verifierSansDebordement` (`tests/helpers/agencement.ts:72`, `:112`). Captures regardées aux cinq tailles, FR et 中文. |

**Specs existantes à mettre à jour** : 42 fichiers (41 specs et `tests/helpers/fakeSession.ts`), relevés par
`grep -rliE "p[ôo]le|coordination|\"evenement\"\]" tests`. Chaque spec est réécrite dans la tranche qui change ce
qu'elle vérifie ; EQ-F referme celles qui restent. On compte **473 occurrences** de « pôle » ou « pole »
(`grep -roiE "p[ôo]le" tests`), et non « ~700 ».

À réécrire (le sujet même de la spec) :

| Fichier | Occurrences | Changement |
|---|---|---|
| `taches.spec.ts` | 68 | une tâche « toute l'équipe » : cochée par une référente, case inerte pour un simple membre (décision 41) |
| `taches-evenements.spec.ts` | 52 | |
| `reunions.spec.ts` | 41 | |
| `calendrier.spec.ts` | 33 | « téléphone : en Agenda, le « + » propose aujourd'hui » : le profil de pôles devient une référente, dont la feuille « Créer » propose aussi « Nouvel évènement » (décision 43) |
| `agencement-v18-taches.spec.ts` | 28 | |
| `evenements-pole.spec.ts` | 26 | **renommé `evenements-equipe.spec.ts`**, lot E en équipes ; le test « relecture : « Nouvel évènement » et l'entrée Évènements restent aux admins, à la coordination et aux droits d'annonces » est **retourné** : un référent les a, un simple membre a Tâches et Réunions (décision 43) |
| `tableau-de-bord.spec.ts` | 24 | |
| `equipes.spec.ts` | 21 | placer dans TEAM DA ouvre les tâches de TEAM DA, plus de `poles` écrit |
| `evenements.spec.ts` | 19 | |
| `pages-en-grand-taches.spec.ts` | 16 | |
| `calendrier-deplacer.spec.ts` | 14 | |
| `agencement-v18-confirmations.spec.ts` | 14 | |
| `back-office-admin.spec.ts` | 12 | |
| `agencement-v18-moi.spec.ts` | 10 | |
| `back-office-espace.spec.ts` | 8 | Réunions + Tâches pour un membre ; le référent (`REFERENT`, liste des entrées) gagne Tâches et Évènements (décision 43) |
| `barre-back-office.spec.ts` | 7 | |
| `reunions-back-office.spec.ts` | 7 | |
| `coherence.spec.ts` | 6 | `poles` jamais renvoyé ; `coordination` |
| `agencement-v18-t2a.spec.ts` | 5 | la référente (`REFERENTE`, entrées permises) gagne Tâches et Évènements, et sa barre par défaut (décision 43) |
| `agencement-v18-t2b.spec.ts` | 3 | |
| `agencement-v18-t5.spec.ts` | 5 | route `/api/equipes/rattachement` |
| `calendrier-widget.spec.ts` | 5 | |
| `nouveaux-membres.spec.ts` | 2 | |
| `agencement-v18-regles.spec.ts` | 4 | |
| `agencement-v18-fondations.spec.ts` | 4 | |
| `agencement-v18-calendrier.spec.ts` | 2 | |
| `retouches-v18-agenda.spec.ts` | 2 | |
| `halo-partout.spec.ts` | 2 | |
| `pages-en-grand-guide-equipes.spec.ts` | 2 | `def.pole` |

La coordination, qui passe de `poles: ["evenement"]` à `coordination: true`. Les profils simulés concernés se
retrouvent par `grep -rnE "poles[^;]*\"evenement\"" tests` : 22 fichiers, dont 14 sont déjà dans le tableau ci-dessus.
Les 8 autres, avec leur nombre de profils :

| Fichier | Profils `poles: ["evenement"]` |
|---|---|
| `scene-saison.spec.ts` | 3 (dont `POLE_EVENEMENT`, `:179`, et le test `who.poles?.includes("evenement")`, `:241`) |
| `retouches-v18-ordre.spec.ts` | 2 |
| `programme-scene.spec.ts` | 1 |
| `agencement-v18-t7.spec.ts` | 1 |
| `scene-paques-noel.spec.ts` | 1 |
| `retouches-v18-ra.spec.ts` | 1 |
| `pages-en-grand-evenements.spec.ts` | 1 |
| `evenements-2027.spec.ts` | 1 |

Un `poles: []` à retirer d'un profil simulé : `statistiques.spec.ts`, `planning-grille.spec.ts`,
`planning-2027.spec.ts`.

`back-office-coupe.spec.ts` (second serveur) :

- 404 pour `/api/equipes/rattachement`, `/taches/medias` et `/back-office/taches/medias` ;
- `/admin` sans case « Coordination » ;
- profil simulé sans `poles` (`:19`).

`tests/helpers/fakeSession.ts` : `FakeProfile.coordination` remplace `poles` (`:20`, `:349`).

## Hors périmètre

- **Lot 2** : sélecteur Église · Paix · Fidélité · Bonté · Amour · Joie, organigrammes des groupes, comités
  (`comite-<groupe>`), champ `groupe`, rôles, « Par ses rôles » et « Notifications » de la fiche Personnes.
- **« + Nouvelle équipe »** de la planche Église : les équipes restent fixes.
- Restreindre le droit Équipes à une équipe (« Demander avant », `spec-organigramme.md`).
- Donner à la coordination les tâches ou les réunions d'une équipe.
- Ouvrir « Nouvel évènement » ou l'entrée Évènements à un **simple membre** : la décision 43 ne l'ouvre qu'aux
  référents (et aux admins).
- Donner à un référent la modification d'un évènement d'équipe créé par un autre, ou la Scène (Pâques, Noël) :
  `canEditEvenement` et la coordination ne changent pas.
- Changer la règle du public Louange pour les membres de groupe sans rôle (décision 42) : la fin de la transition des
  `serviceRoles` est suivie par la question 8 de `docs/spec-organigrammes-groupes.md`.
- Rediriger les anciennes adresses `/back-office/taches/media` et `…/evenement` : aucune notification ne les porte.
- Réécrire les notifications déjà dans la cloche.
- « Une équipe » dans Notifier (D21).
- Calculer TEAM LOUANGE depuis `serviceRoles` : le public Louange est élargi, l'organigramme ne l'est pas.
- Toute écriture dans le Google Sheet.

## À la mise en ligne

Le back-office reste coupé en ligne : ce lot ne change rien pour les membres. Ce qui suit est pour Timothée, au moment
de la bascule (§ Migration, « Ordre de la bascule ») :

1. lancer le relevé, `npx tsx --env-file=.env.local scripts/poles-vers-equipes.ts`, et lire ses listes ; ajouter à
   la main à l'équipe cible qui doit garder un accès (décision 40), et nommer un référent là où des tâches « toute
   l'équipe » n'en ont pas (liste 4, décision 41) ;
2. **publier `firestore.rules`** dans la console Firebase (Timothée publie les règles) ;
3. lancer la migration avec `--ecrire`, puis de nouveau à blanc (0 opération) ;
4. tirer le code en local et vérifier ;
5. cocher « Coordination » dans Équipes › Personnes pour qui doit régler la scène ;
6. relire le 中文 des libellés d'EQ30.

**Avant toute autre publication des règles.** `firestore.rules` est un seul fichier : publier les règles du lot 2, du
lot 3 s'il les touche, du lot 4 ou du partage d'une setlist (champ `editeurs`, décisions 39 et 45 : le partage change
`match /setlists`) publie aussi celles du lot 1. Les points 1 à 5 ci-dessus (relevé, règles, migration `--ecrire`,
coordination cochée) doivent donc être faits avant, ou dans la même séance.

Les référents découvrent l'entrée Évènements et « Nouvel évènement » (décision 43) ; ceux qui n'ont ni Planning ni
barre enregistrée voient Évènements à la place de Réunions dans leur barre du bas (EQ18). Rien à faire : à dire aux
référents au moment de la bascule.

`CLAUDE.md`, liste des routes : `/api/equipes/{importer,poles}` devient `/api/equipes/rattachement`. Les routes
`/api/admin/*` qu'elle cite n'existent plus, et `/api/equipes/importer` non plus ; elle annonce 18 routes, il y en a 15
à `5878ce1` (15 fichiers `route.ts` sous `src/app/api`) : EQ-D corrige le nombre. Suite attendue : 15 après le lot 1
(la route des pôles est renommée, pas ajoutée), 16 après le lot 3 (`/api/planning/changements`), 17 après le lot 2
(`/api/equipes/groupes`), 20 après le lot 4. Le jour où le back-office passera en ligne, il n'y aura rien de plus à
faire pour ce lot.

## Questions ouvertes

Aucune : toutes tranchées le 08/10/2026 (décisions 35 à 45 de decisions.md). Les quatre questions de cette spec sont
dans § « Réponses de Timothée (08/10/2026, soir) » : Q1 → décision 40, Q2 → décision 41, Q3 → décision 42, Q4 →
décision 43.

## Commandes

```bash
npx playwright install --with-deps chromium   # début de session cloud
npx tsc --noEmit
npm run lint
npm test -- tests/equipes-acces.spec.ts tests/equipes-taches.spec.ts tests/equipes-reunions.spec.ts tests/equipes-coordination.spec.ts tests/equipes-migration.spec.ts
npm test -- tests/equipes-agencement.spec.ts   # cinq projets
npm test -- tests/taches.spec.ts tests/taches-evenements.spec.ts tests/reunions.spec.ts tests/evenements-equipe.spec.ts tests/calendrier.spec.ts tests/equipes.spec.ts tests/back-office-espace.spec.ts tests/agencement-v18-t2a.spec.ts
npm test -- tests/back-office-coupe.spec.ts   # second serveur, interrupteur coupé
grep -rniE "\bp[ôo]les?\b|TachePole|polesDe|isPoleMember|isTachePole" src firestore.rules   # critère EQ1
# Par Timothée seulement (vraie base) :
npx tsx --env-file=.env.local scripts/poles-vers-equipes.ts            # relevé et plan, lecture seule
npx tsx --env-file=.env.local scripts/poles-vers-equipes.ts --ecrire   # migration
```

## Avancement

- 08/10/2026 : spec écrite, attend le go.
- 08/10/2026 : relecture à contexte vierge. Références rouvertes à `5878ce1` et corrigées ; réglage du widget et « Plus »
  (EQ9), noms d'équipe par écran (EQ23), règle des fois (`get('responsableUid', null)`), liste des pertes d'accès (relevé,
  liste 2), question 4 ajoutée. Attend le go.
- 08/10/2026 : relecture croisée des cinq specs, incohérences corrigées.
- 08/10/2026 (soir) : réponses de Timothée intégrées (décisions 35 à 45).
