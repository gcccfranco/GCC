# Spec : lot 3 bis — Programmes de scène (onglet « Noël »)

Lot 3 bis de `feuille-de-route.md` § 2, demandé par Christelle et Alice le
14/09/2026 (18:37), tranché avec Timothée le même soir en cinq tours
(§ 3.K). **Go de Timothée le 14/09/2026 (soir)**, modèle d'onglets confirmé par le go ; **codé dans la nuit du 14 au 15/09/2026**, en quatre tranches test-first, 25 tests × 3 appareils verts, suite complète verte (528), captures regardées. **Commité le 15/09/2026, à valider en local par Timothée.** Se code avant le lot 3 ter et avant le look.

## Objectif

Réserver la scène pour les entraînements avant Noël **dans l'app** (pas de
Google Sheet), voir d'un coup quels dimanches sont libres, et avoir sous la
main le **programme de Noël** (l'ordre de passage de la brochure). Un onglet
du planning par programme, **affiché ou masqué par Alice** pour ne pas
encombrer la barre d'onglets.

## Décisions (14/09/2026)

- **Programme** : nom court (« Noël »), jour J (24/12/2026), début des
  réservations (octobre 2026), **affiché / masqué**. Créé, modifié, affiché,
  masqué et supprimé par la **coordination** = rôle « événement » (Alice) +
  admins. Plusieurs programmes peuvent exister ; en pratique un seul est
  affiché à la fois. *(Modèle « un onglet par programme, activé par Alice »
  confirmé par le go.)*
- **Section « Évènements »** (Timothée, 15/09/2026 : « l'onglet qui se crée
  soit dans l'onglet évènement et non dans le planning ») : nouvelle entrée
  de la barre principale et du menu mobile, route `/evenements`, libellé
  contextuel « GCC Évènements ». Le lot 6 y ajoutera le calendrier et les
  évènements. Sur téléphone, la barre du bas n'a pas d'entrée Évènements :
  la section se trouve dans le menu ☰ (le menu est refait au lot 4).
- **Onglet unique** (revu le 15/09/2026 avec Timothée, 4 questions) :
  un seul onglet de la section Évènements, nommé comme le programme affiché
  (« Noël »), couleur indigo `#3f51a3`, pour tout membre connecté. **Un seul programme affiché à la fois** : en afficher un masque
  les autres. Sans programme affiché, l'onglet disparaît pour les membres ;
  la coordination le voit toujours, nommé « Scène », pour créer ou réafficher
  un programme. **Tout se gère dans le même onglet** : en haut, « Modifier le
  programme », « Masquer », « Nouveau programme » ; en bas, la liste
  « Programmes masqués » (Afficher, Modifier, Supprimer). Plus de page
  « Programmes » à part. *(Première version : un onglet par programme + page
  de gestion — jugée « pas bon » par Timothée le 15/09/2026.)*
- **Volet Entraînements** : liste par dimanche, comme Campus, sur les trois
  appareils. Dimanches du **premier dimanche ≥ début** au **dernier dimanche
  avant le jour J** (Noël 2026 : 4 octobre → 20 décembre, douze dimanches).
  Dimanche sans créneau = « Scène libre ». Dimanches passés masqués, lien
  « Voir les dimanches passés ». Le jour J ne se réserve pas.
- **Créneau** : dimanche (choisi parmi ceux à venir), début et fin au quart
  d'heure (pré-remplis **17:00–18:00**), **Quoi** (un : Séance louange, Chant,
  Danse, Sketch, Spectacle), **Qui** (un ou plusieurs : EDD 小班, EDD 中班,
  EDD 大班, EDD 高班, Gp Bonté, Gp Fidélité, Gp Paix, Gp Amour, Gp Joie,
  Franco, 敬拜团), note d'une ligne facultative ; auteur affiché. Listes en
  dur dans le code. Tout membre connecté pose un créneau ; le modifient ou
  le retirent : **son auteur, la coordination**. Aucune limite par groupe.
- **Chevauchement** : refusé à l'enregistrement, côté client (relecture du
  dimanche juste avant). S'il passe quand même : détection immédiate après
  l'écriture, les **deux auteurs** sont prévenus (push + cloche) par une
  route serveur, et le créneau est **marqué en rouge** pour tous.
- **Volet « Programme Noël »** (nom = « Programme » + nom du programme) :
  liste numérotée **sans horaire ni durée** : quoi, qui, titre libre. Édition
  à la main par la coordination (ajouter, modifier, retirer, glisser-déposer
  comme les setlists). Lecture pour tous les connectés.
- **Après le dernier dimanche réservable** (lundi 21 décembre), le volet
  Entraînements disparaît et l'onglet montre directement le programme.
  L'onglet reste tant qu'Alice ne le masque pas.
- **Rappels** : fondus dans les rappels regroupés du lot 1c (J-7, J-3, J-1),
  sur la même notification que les services du dimanche : « Dimanche 13
  décembre : Culte Franco (Piano) · Entraînement sur scène 17:00–18:00 (Chant
  · EDD 中班) ». Destinataires : l'auteur + les membres ayant un rôle de
  service dans la catégorie du « Qui » (Franco → Culte Francophone ; 中班,
  大班, 高班 ; Gp Paix, Fidélité, Bonté → groupes) ; 小班, Amour, Joie, 敬拜团
  n'existent pas dans l'app → auteur seul. Rien à la création.
- **Rôle « événement »** : nouveau champ `poles` du profil (`["evenement"]`),
  coché par un admin dans l'administration. Seul pôle pour l'instant, le
  lot 6 ajoutera les autres (§ 7 constat 12).
- Réservé aux connectés ; rien sans compte. « Mes services » ne liste pas
  les créneaux.

## Ce que le code montre

- Onglet Campus (`src/app/planning/campus/page.tsx`) : deux volets, cartes
  par jour, lecture seule d'un Sheet — modèle visuel.
- `PlanningTabs.tsx` : liste d'onglets statique → à compléter par les
  programmes affichés (lecture Firestore REST, connectés seulement).
- Écriture Firestore depuis l'app : setlists, annonces (`src/lib/firebase/`),
  permissions en double `access.ts` + `firestore.rules`.
- `firebase-admin` côté serveur (`src/lib/push/admin.ts`, route du lien de
  présentation) : modèle pour la route de conflit.
- Cron des rappels regroupés (lot 1c) : `src/lib/push/reminderMessage.ts`,
  `uidsForCategory` dans `recipients.ts` → les entraînements s'y greffent.
- `serviceColors.ts` gelé : ajout d'une entrée `scene` sans toucher aux neuf
  valeurs.

## Ce qui est construit (état au 15/09/2026)

### Données (Firestore)

- `programmes/{id}` : `nom`, `jourJ`, `debut` (ISO), `visible`, `passages:
  [{ quoi, qui: string[], titre }]`, `createdBy`, `updatedAt`.
- `programmes/{id}/creneaux/{cid}` : `dimanche`, `debut`, `fin` (« HH:MM »),
  `quoi`, `qui: string[]`, `note`, `auteurUid`, `auteurNom`, `createdAt`,
  `updatedAt`.
- `users/{uid}.poles: ["evenement"]` (`POLES`, `src/types/user.ts`), coché
  par un admin dans l'administration (bloc « Pôles de coordination »).
- `firestore.rules` : `isCoordination()` ; `programmes` écriture coordination ;
  `creneaux` création à son nom, modification et suppression auteur +
  coordination ; un membre ne peut pas se donner de `poles` à l'inscription.
  Miroir client : `isCoordination`, `canEditCreneau` (`src/lib/access.ts`).
  **À publier dans la console Firebase.**

### Code

- Pur : `src/lib/scene/dimanches.ts` (dimanches réservables, clôture,
  chevauchement), `src/lib/scene/rappels.ts` (« qui » → catégorie, ligne de
  rappel), `src/lib/scene/conflit.ts` (message et clé de conflit).
- REST : `src/lib/firebase/programmes.ts` (programmes et créneaux ; événement
  `programmes-changed` pour la barre d'onglets).
- Section : `src/app/evenements/layout.tsx` (RequireAuth + onglets),
  `src/components/evenements/EvenementsTabs.tsx` (onglet unique nommé comme
  le programme affiché, « Scène » pour la coordination sans programme) ;
  `src/components/layout/SectionTabs.tsx` = barre d'onglets extraite de
  `PlanningTabs.tsx`, partagée par les deux sections ; `Navbar.tsx` : entrée
  « Évènements » (bureau + menu mobile) et libellé contextuel.
- Page `src/app/evenements/` : `SceneClient.tsx` (en-tête, gestion du
  programme par la coordination, volets, clôture, programmes masqués),
  `ProgrammeForm.tsx`, `Entrainements.tsx` (dimanches, droits, refus et
  marquage des chevauchements), `CreneauForm.tsx` (formulaire + cases « Qui »
  partagées), `OrdrePassage.tsx` (liste numérotée, ajout / modification /
  retrait / glisser-déposer).
- Serveur : `src/app/api/scene/conflit/route.ts` (relit les deux créneaux,
  vérifie, push + cloche aux deux auteurs, une fois par paire via `notifLog`) ;
  cron `src/app/api/cron/reminders/route.ts` (créneaux des programmes affichés
  aux dates J-7 / J-3 / J-1, auteur + membres des catégories du « qui »,
  fondus dans le message regroupé) ; `reminderMessage.ts` (libellé 中文
  « 舞台排练 », `formatReminderDate` exporté).
- Cloche : sorte `scene` (`push/notifications.ts`, `firebase/notifications.ts`,
  `useNotifications.ts`, `Navbar.tsx`, locales `notifications.scene`).
- Couleur `PLANNING_COLORS.scene = #3f51a3` (les neuf valeurs gelées
  inchangées). Textes FR et 中文 : `planning.tabs.programmes`,
  `planning.programmes.*`, `planning.programme.*`.

### Choix faits en codant (à valider)

- Un programme créé est **affiché** d'emblée (les autres se masquent) ;
  Alice le masque si besoin.
- Sans aucun programme, la coordination voit directement le formulaire de
  création dans l'onglet « Scène ».
- Section « Évènements » créée dès maintenant (tranché le 15/09/2026),
  avec ce seul onglet ; « Évènements » placé après « Annonces » dans la barre.
- Le titre du volet reste « Ordre de Passage jour J » ; le bouton du volet
  dit « Programme {nom} ».
- Les cases « Qui » sont de vraies cases à cocher visibles (accessibilité).
- La barre d'onglets fait une lecture Firestore de plus par visite du
  planning (la collection des programmes, minuscule).

### Vérifiable seulement en ligne

Route de conflit (firebase-admin, push réel), cron des rappels, règles
Firestore publiées. **Mise en service** : publier `firestore.rules`, donner
le pôle Événement à Alice dans l'administration, créer le programme « Noël »
(jour J 24/12/2026, début des réservations 01/10/2026).

## Tests (Playwright, trois appareils, écrits avant le code) — `tests/programme-scene.spec.ts`, 27 tests

- Onglet absent sans programme affiché ; présent avec le nom du programme.
- Liste des dimanches : bornes (4 octobre → 20 décembre), « Scène libre »,
  passés masqués, jour J absent.
- Réserver : pré-remplissage 17:00–18:00, quoi / qui / note, auteur affiché ;
  refus d'un chevauchement ; modification et retrait par l'auteur, refus pour
  un autre membre, autorisés pour la coordination.
- Programme : liste numérotée, édition et glisser-déposer réservés à la
  coordination ; volets masqués après le 20 décembre (horloge simulée).
- Rappel : message regroupé d'un dimanche avec service + entraînement (test
  unitaire de `reminderMessage`).
- Conflit : route de conflit appelée quand deux créneaux se chevauchent après
  écriture (réseau simulé).

## Hors périmètre (tranché)

Grille de la semaine ; plages d'ouverture ; limite par groupe ; notification
à la création ; durée ou heure des passages ; lecture d'un Google Sheet ;
réservation le jour J ; accès sans compte.
