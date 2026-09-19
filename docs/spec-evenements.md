# Spec : lot 6 — Évènements (calendrier, inscriptions, fusion des annonces)

Lot 6 de `feuille-de-route.md` § 2 (§ 3.F et G), tranché avec Timothée le
15/09/2026 en **deux tours, 19 questions**, toutes les recommandations
acceptées. **Go de Timothée le 15/09/2026, codé le même jour** en quatre tranches test-first (36 tests × 3 appareils, suite complète verte : 663). **Commité le 15/09/2026, à valider en local.** Se code **avant** la version perso d'un
chant (3 ter) et avant le look (4). Prolonge la section « Évènements » créée
au lot 3 bis (`spec-programme-scene.md`).

## Objectif

Le calendrier des évènements de l'église, dans la section Évènements :
consultable **sans compte**, fiches créées par la coordination et les
responsables de section, **inscription avec compte et invités**, ou sans
compte quand l'organisateur l'autorise, **QR code** vers le calendrier et
vers chaque fiche, évènements annuels de l'église, et **les annonces
fusionnées** dedans (la page Annonces disparaît).

## Décisions (15/09/2026)

- **Calendrier** : agenda des évènements à venir, groupés par mois ; les
  entrées « info » épinglées en haut ; lien « Évènements passés » (trois
  derniers mois). Pas de grille mensuelle.
- **Public** : tout le calendrier se lit sans compte, **jamais les noms des
  inscrits**. Un évènement « pour » une section (Culte Franco, un groupe)
  n'est visible que par ses membres connectés et ne figure pas dans le
  calendrier public.
- **Section Évènements** : deux onglets, « Calendrier » (public, `/evenements`)
  et le programme de scène (« Noël », connectés seulement, `/evenements/scene`).
  Sans compte : calendrier + bouton « Connexion » pour s'inscrire. Barre du bas
  du téléphone inchangée ; « Évènements » par le menu ☰ jusqu'au lot 4.
- **Fiche** : titre, type (sport, loisir, musique, église, info), pour (toute
  l'église ou une section), date et heure de début, heure de fin et date de fin
  facultatives (camp, retraite), lieu, description (liens cliquables), liens,
  images (compressées comme les annonces), places max (facultatif),
  inscription ouverte, sans-compte autorisés, contact libre facultatif,
  « prévenir les membres » (à la création, coché d'office sauf type église),
  épinglé + date d'expiration (type info). Organisateur = créateur (nom du
  profil).
- **Qui crée** : coordination (pôle Événement + admins) pour tout ; les
  membres ayant le droit d'annonces d'une section (`profile.annonces`) créent
  pour **leur section**. Modifient, dupliquent ou suppriment : organisateur,
  coordination, admins. **Dupliquer** remplace toute répétition automatique
  (évènements annuels saisis chaque année).
- **Inscription avec compte** : « Je participe » + nombre d'invités (0 à 5,
  nombre seulement) ; désinscription tant que l'évènement n'a pas commencé ;
  fermeture automatique au début, fermeture manuelle par l'organisateur ;
  places comptées inscrits + invités, « Complet » sans liste d'attente.
- **Inscription sans compte** (si autorisée) : nom + nombre d'invités, rien
  d'autre, enregistrée par le serveur ; retirée par l'organisateur (pas
  d'identité pour se désinscrire soi-même).
- **Liste des inscrits** : organisateur, coordination, admins. Les membres
  voient le nombre et « Complet ».
- **Notifications** : push à la création aux membres concernés (toute
  l'église ou la section) si « prévenir » est coché ; rappel **la veille aux
  inscrits** via le cron quotidien ; nouveau type de préférence
  « Évènements » (désactivable) ; sorte de cloche « evenement ».
- **Fusion des annonces** : une annonce = entrée de type « info », sans date,
  épinglée, avec section, images, liens, expiration ; migration des annonces
  existantes par un **bouton de l'administration** ; badge non-lu de la barre
  transféré sur Évènements ; entrée « Annonces » retirée du menu, `/annonces`
  redirige vers `/evenements`.
- **Retiré du calendrier le 16/09/2026** (demande de Timothée) : le QR ne reste que sur la fiche, pour l'organisateur ; les mentions « QR pour les créateurs » plus bas décrivent l'état du 15/09.
- **QR code** : généré dans l'app (bibliothèque `qrcode`, dépendance acceptée),
  un pour le calendrier public et un par fiche, affiché en grand.

## Ce que le code montre

- Section Évènements (lot 3 bis) : `src/app/evenements/` sous `RequireAuth`,
  onglet unique du programme de scène, `EvenementsTabs`, `SectionTabs`.
- Annonces : `src/types/annonce.ts` (section, titre, texte, liens, images,
  épingle, expiration, auteur), `src/app/annonces/page.tsx`,
  `src/components/annonces/AnnonceForm.tsx` (images compressées, liens),
  `src/lib/firebase/annonces.ts` (REST + `getAnnoncesSince` pour la cloche),
  push `/api/push/notify-annonce` (membres de la section, anti-doublon
  `notifLog`), droits `profile.annonces` et `canPublishAnnonce`.
- Push et cloche : `sendPushToUids`, `recordNotification` (sortes),
  `filterUidsByNotifPref` (`NOTIF_TYPES` : reminders, setlists, annonces),
  `useNotifications` (annonces + setlists + notifications, « vu » par
  appareil), cron quotidien `/api/cron/reminders`.
- Rôles : `poles: ["evenement"]`, `isCoordination` (lot 3 bis).
- Aucune bibliothèque de QR code ni de dates ; chaque section décide seule de
  `RequireAuth` dans son layout.

## Ce qui sera construit

### Données (Firestore)

- `evenements/{id}` : `titre`, `type`, `pour` (« eglise » ou une section),
  `date` (ISO, vide pour une info), `heure`, `heureFin`, `dateFin`, `lieu`,
  `description`, `liens[]`, `images[]`, `placesMax` (nombre ou null),
  `inscriptionOuverte`, `sansCompte`, `contact`, `organisateurUid`,
  `organisateurNom`, `epingle`, `expiresAt`, **`inscrits`** (compteur
  inscrits + invités, **tenu par le serveur seulement**), `createdAt`,
  `updatedAt`.
- `evenements/{id}/inscriptions/{iid}` : `uid` (ou null), `nom`, `invites`,
  `createdAt` ; `iid` = uid pour un compte, aléatoire sans compte.
- Règles : lecture d'un évènement « pour = eglise » par tout le monde, des
  autres par les connectés ; création par la coordination ou par un membre
  dont `annonces` contient la section visée ; modification et suppression par
  l'organisateur et la coordination ; `inscrits` et les inscriptions ne
  s'écrivent **jamais** depuis le client (`allow write: if false`) ; lecture
  des inscriptions : organisateur et coordination. Miroir dans `access.ts`
  (`canCreateEvenement`, `canEditEvenement`, `canSeeInscriptions`).
  **À publier dans la console.**

### Serveur

- `POST /api/evenements/inscription` : avec jeton (compte + invités) ou sans
  (nom + invités, si `sansCompte`) ; vérifie ouverture, début non passé,
  places ; écrit l'inscription et le compteur dans une transaction.
- `POST /api/evenements/desinscription` : soi-même (jeton) ou une inscription
  donnée (organisateur, coordination).
- `POST /api/push/notify-evenement` : à la création si « prévenir »,
  destinataires selon `pour`, préférence « evenements », anti-doublon.
- `POST /api/admin/migrer-annonces` (admin) : copie chaque annonce en
  évènement « info » (section, épingle, expiration, images, liens, auteur),
  une seule fois.
- Cron `reminders` : la veille, push aux inscrits (« Demain : Foot à 19:00,
  Parc… »), préférence « evenements », `notifLog`.

### Pages et composants

- `src/app/evenements/layout.tsx` sans `RequireAuth` (calendrier public) ;
  `page.tsx` = agenda ; `[id]/page.tsx` = fiche (détails, places, « Je
  participe » / désinscription / formulaire sans compte, liste des inscrits
  pour l'organisateur, QR, Modifier, Dupliquer, Supprimer) ; `nouveau/` et
  `[id]/modifier/` = formulaire (reprend images et liens d'`AnnonceForm`) ;
  `scene/page.tsx` = programme de scène avec son propre `RequireAuth`.
- `EvenementsTabs` : « Calendrier » + onglet du programme (connectés).
- Navbar : « Annonces » retirée après migration (route redirigée) ; badge
  non-lu sur Évènements ; `useNotifications` lit `evenements` à la place des
  annonces ; `NOTIF_TYPES` + « evenements » ; préférences dans la cloche.
- Administration : bouton « Migrer les annonces vers le calendrier ».
- `qrcode` : composant `QrCode` (data-URL), utilisé sur le calendrier et la
  fiche.
- Textes FR et 中文.

### Tranches (chacune test-first, rouge puis vert sur trois appareils)

| # | Tranche | Contenu | Vérification |
| --- | --- | --- | --- |
| E1 | Calendrier et fiche en lecture | types, module REST, règles, layout public, onglets « Calendrier » / programme, agenda par mois, infos épinglées, passés, fiche ; programme déplacé en `/evenements/scene` | sans compte : évènements « eglise » seulement, rien de nominatif ; membre : ses sections en plus ; tests du lot 3 bis toujours verts |
| E2 | Créer, modifier, dupliquer, supprimer | formulaire, droits (coordination, droit d'annonces → sa section), push à la création (`notify-evenement`, préférence) | écritures attendues, droits refusés/accordés, push appelé avec les bons destinataires (route simulée) |
| E3 | Inscriptions | route serveur (compte + invités, désinscription, sans compte), compteur, « Complet », fermeture automatique, liste pour l'organisateur | flux simulés, compteur, places, refus quand fermé ou complet, sans compte refusé si non autorisé ; route sans jeton = 401 sauf sans-compte autorisé |
| E4 | Fusion des annonces, cloche, QR, rappel | type info, bouton de migration + route, badge et cloche sur Évènements, retrait de l'entrée Annonces + redirection, rappel J-1 (message pur testé), `qrcode` | page Annonces redirigée, entrée absente du menu, infos épinglées visibles, QR affiché, message de rappel |

Après chaque tranche : `npx tsc --noEmit`, `npm run lint`, tests du lot sur
les trois appareils. À la fin : suite complète, chants valides, captures
regardées sur les trois tailles (calendrier, fiche, formulaire, sans compte).

## Ce qui est construit (état au 15/09/2026)

- **Modèle** : `src/types/evenement.ts` ; `src/lib/evenements/agenda.ts`
  (groupes par mois, passés, expirés, places, `refusInscription`, heure de
  Paris), `rappel.ts` (message de la veille), `inscription.ts` (client),
  `notify.ts` (client), `serveur.ts` (jeton facultatif, erreurs HTTP) ;
  `src/lib/firebase/evenements.ts` (REST : liste publique filtrée
  « pour = eglise » ou complète, fiche, ma place, inscriptions, `getEvenementsSince`
  pour la cloche, création / modification sans `inscrits` / suppression).
- **Droits** : `canSeeEvenement`, `canCreateEvenement`,
  `creatableEvenementPours`, `canEditEvenement` (`access.ts`) ; `firestore.rules`
  : lecture publique si « eglise », création à son nom avec compteur à zéro
  (coordination ou droit d'annonces de la section), modification sans toucher
  au compteur, inscriptions lisibles par soi-même (id = uid), l'organisateur
  et la coordination, jamais écrites par le client. **À publier.**
- **Section** : `src/app/evenements/layout.tsx` sans `RequireAuth` ;
  `EvenementsTabs` = « Calendrier » (tous) + programme de scène (connectés,
  `/evenements/scene`) ; `Navbar` : « Évènements » visible sans compte,
  « Annonces » retirée ; `/annonces` redirige.
- **Pages** : `CalendrierClient` (infos épinglées « À la une », agenda par
  mois, passés sur trois mois, « Nouvel évènement », QR pour les créateurs),
  `EvenementCard`, `[id]/EvenementClient` (fiche, Modifier / Dupliquer /
  Supprimer / QR pour l'organisateur), `[id]/Inscriptions` (Je participe +
  invités, ma place, désinscription, formulaire sans compte, liste des
  inscrits, retrait, ouverture / fermeture), `nouveau/` (création et
  duplication `?from=`), `[id]/modifier/` ; `components/evenements/EvenementForm`
  (images compressées et liens repris des annonces), `QrCode` (bibliothèque
  `qrcode`, ajoutée avec ses types).
- **Serveur** : `/api/evenements/inscription` et `/desinscription`
  (transactions, compteur), `/api/push/notify-evenement` (push à la création,
  préférence « evenements », `notifLog`), `/api/admin/migrer-annonces`
  (idempotent : id `annonce-{id}`), cron `reminders` (rappel de la veille aux
  inscrits, `rappel-evenement-{id}-{uid}`).
- **Cloche** : `useNotifications` lit les évènements (plus les annonces) ;
  sorte « evenement » ; `NOTIF_TYPES` + « evenements » (préférence dans
  `PushToggle`).
- **Retirés** (rendus orphelins par la fusion) : la page Annonces (remplacée
  par une redirection), `AnnonceForm`, `lib/firebase/annonces.ts`,
  `/api/push/notify-annonce`, `canPublishAnnonce`. Le champ `profile.annonces`
  reste : c'est le droit de création par section (libellé admin renommé).
- **Administration** : onglet Inscriptions → bloc « Annonces → Évènements »
  avec le bouton de migration.
- Tests : `tests/evenements.spec.ts` (36 tests × 3 appareils) ;
  `fakeFirestore` (simulation sans connexion) extrait de `fakeSession.ts`.

### Choix faits en codant (à valider)

- Les infos épinglées s'affichent dans une zone « À la une » au-dessus de
  l'agenda ; une info non épinglée y figure aussi, après les épinglées.
- « Prévenir les membres » est coché d'office sauf pour le type église ; le
  push exclut l'auteur.
- Le QR code se génère dans le navigateur avec l'adresse de la page ouverte
  (en ligne : le domaine du site).
- Sans compte, la place n'est pas mémorisée : recharger la page repropose le
  formulaire.
- Le bouton QR du calendrier n'apparaît qu'aux personnes qui peuvent créer.
- Les tests ont tourné contre le serveur de travail (`PW_PORT=3000`).

### Vérifiable seulement en ligne

Routes d'inscription (firebase-admin, transactions), push à la création,
migration, rappel de la veille, règles publiées. **Mise en service** :
publier `firestore.rules`, lancer la migration des annonces depuis
l'administration (onglet Inscriptions), vérifier les droits « Peut créer des
évènements et des infos pour » des responsables de section. Note locale : la
route d'annonce supprimée reste citée dans `.next/types/validator.ts` jusqu'au
prochain `next build` ; la CI part d'un dossier propre.

## Critères de réussite

- Sans compte, `/evenements` montre les évènements « toute l'église », sans
  aucun nom ; l'inscription sans compte n'existe que si l'organisateur l'a
  autorisée.
- Un membre voit en plus les évènements de ses sections, s'inscrit avec des
  invités, se désinscrit, voit « Complet » quand les places sont prises.
- Un organisateur crée, modifie, duplique, supprime, ferme les inscriptions,
  voit la liste des inscrits et retire une inscription, affiche le QR.
- Les annonces migrées apparaissent épinglées ; la page Annonces n'existe
  plus ; le badge et la cloche suivent les évènements.
- Rappel de la veille aux inscrits et push à la création : vérifiables en
  ligne seulement (firebase-admin, cron).

## Hors périmètre (tranché)

Grille mensuelle ; liste d'attente ; noms ou coordonnées des invités et des
sans-compte ; répétition automatique ; lecture du Sheet de Steph ; paiement ;
export de calendrier (.ics) ; tâches par pôle (lot 7).

## Frontières

- Toujours : test avant code, trois appareils, FR et 中文, permissions en
  double (`access.ts` + `firestore.rules`), rien d'écrit en production
  pendant les tests, un commit par lot sur demande.
- Demander : la dépendance `qrcode` (accordée), la suppression de la page
  Annonces (accordée), la publication des règles (Timothée, en ligne).
- Jamais : compteur d'inscrits écrit par le client ; données personnelles des
  sans-compte ; envoi push réel depuis les tests.

## Hypothèses à confirmer par le go

- Les images restent des data-URL dans le document, comme les annonces (même
  limite Firestore d'un mégaoctet par fiche).
- Un visiteur sans compte lit le calendrier par une requête filtrée
  « pour = eglise » ; un connecté lit tout et filtre selon son profil.
- « Complet » se calcule avec le compteur serveur ; une inscription est
  refusée si inscrits + invités dépasseraient les places.
- Le programme de scène passe de `/evenements` à `/evenements/scene` (les
  tests du lot 3 bis suivent).
