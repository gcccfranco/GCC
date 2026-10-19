# Spec : accès bêta au Back-Office

Demande de Timothée, 19/10/2026 :

> « J'aimerais donner accès à toutes les fonctionnalités du back office à seulement certaines personnes. »

> « Et si dans l'organigramme tu ajoutes un truc style bêta et j'ajoute les personnes dedans comme ça ils ont accès
> au back office en entier. »

Choix entre A (Bêta ouvre la porte, chacun garde ses droits) et B (Bêta donne tout, comme un admin) : **B**.

Statut : **spec écrite le 19/10/2026, questions à trancher, attend le go.**

## Objectif

En ligne, le Back-Office reste coupé pour tout le monde (`NEXT_PUBLIC_BACK_OFFICE` absent sur Vercel, lot 18), sauf
pour les membres d'une équipe **Bêta**. Un membre de Bêta a **les pouvoirs d'un admin** : il voit et fait tout ce que
voient et font aujourd'hui les trois comptes de `ADMIN_EMAILS`, App et Back-Office. On entre dans Bêta et on en sort
depuis l'organigramme, sans toucher au code.

## Ce que le code montre (19/10/2026)

- **Admins** : liste écrite deux fois, `ADMIN_EMAILS` (`src/lib/access.ts:19`) et `isAdmin()` (`firestore.rules:56`).
  `isAdminUser(user)` ne regarde que l'adresse (69 appels) ; côté serveur, `isAdminEmail` dans `lib/*/serveur.ts` et
  quelques routes.
- **Équipes** : documents `equipes/{id}` (`membres`), tenus par `isEquipier()` (admin ou `equipes: true`). L'appartenance
  est recopiée sur le profil (`users/{uid}.dansEquipes`) par `/api/equipes/rattachement` (Admin SDK). Un profil ne
  peut pas se donner `dansEquipes` à sa création (`firestore.rules:99-110`), et seul un admin modifie un profil.
- **Précédent** : les comités `comite-<groupe>` sont des équipes « à part », hors de la liste `EQUIPES`, recopiées par
  le serveur seul.
- **Interrupteur** : constante figée au build (`src/lib/backOffice.ts`), lue dans environ 70 fichiers : navigation,
  trois layouts serveur qui font `notFound()` (`back-office`, `evenements`, `taches`, sans savoir qui est connecté :
  l'auth est côté navigateur), routes API (premier test, avant la vérification du jeton), rappel du matin.
- **Ce qui est en ligne** : `main` n'a **pas** le Back-Office (785 fichiers d'écart avec `ui/apple-design`).

## Ce qui est construit

### L'équipe Bêta

- Une équipe `beta`, « Bêta », hors de la liste des équipes de l'église (comme les comités). Ses membres sont
  recopiés dans `dansEquipes` par la route de rattachement habituelle.
- **Admins fondateurs** : les trois adresses de `ADMIN_EMAILS` restent admins en dur. Sans eux, personne ne pourrait
  ouvrir l'organigramme en ligne pour remplir Bêta.
- **Être admin** = adresse fondatrice **ou** `beta` dans `dansEquipes` du profil. Côté client, une fonction qui prend
  l'utilisateur et le profil remplace `isAdminUser(user)` partout où elle décide d'un droit ; côté serveur, les
  vérifications admin lisent le profil (Admin SDK) ; dans `firestore.rules`, `isAdmin()` gagne le même « ou ».
- **Pas d'escalade** : seuls les admins fondateurs (Q3) écrivent l'équipe `beta` et la mention `beta` d'un profil.
  Trois verrous : la règle de `equipes/beta`, la route de rattachement, et la règle `update` de `users/{uid}` (un
  membre de Bêta, admin par ailleurs, ne peut pas ajouter ni retirer `beta` sur un profil). Un `equipes: true`
  ordinaire ne peut donc pas s'y mettre.
- Sortir de Bêta retire les pouvoirs au prochain chargement du profil.

### L'interrupteur par personne

- « Back-Office ouvert pour cette personne » = interrupteur ouvert **ou** admin (fondateur ou Bêta).
- **Navigation** (barre du bas, barre latérale, sélecteur App · Back-Office, « Moi », onglet Évènements, planning en
  grille) : lit cette valeur au lieu de la constante.
- **Pages** : les trois layouts qui font `notFound()` laissent la garde à la page, côté navigateur, qui affiche la page
  404 du site à qui n'y a pas droit.
- **Routes API** : le test de l'interrupteur passe après la vérification du jeton : interrupteur ouvert ou appelant
  admin ; sinon 404, comme aujourd'hui.
- **Rappel du matin** : inchangé (réduit aux services tant que l'interrupteur est coupé, même pour Bêta).

### Dans l'organigramme

Une carte « Bêta » à part, sous l'organigramme de l'église (Back-Office › Équipes › Organigramme), avec « Ajouter »
et « Retirer » pour les admins fondateurs, en lecture pour les autres admins. Pas de planche : une carte du même
modèle que celles des équipes.

## Prérequis à la mise en ligne

Bêta ne sert qu'en ligne. Il faut, dans l'ordre et chacun sur ordre explicite de Timothée :

1. la séance de bascule V19EQUIPES (relevé, migration `--ecrire`, **publication de `firestore.rules`**, qui portera
   aussi les règles de ce lot) ;
2. la **fusion de `ui/apple-design` dans `main`** : tout le nouveau site part en ligne pour tout le monde (look,
   setlists au créateur, corbeille, barre du chant…), Back-Office coupé sauf pour Bêta.

## Questions à trancher

| # | Question | Recommandation |
| --- | --- | --- |
| Q1 | Bêta apparaît-elle dans App › Équipes (la vue que tout membre lit) ? | **Non**, au Back-Office seulement. |
| Q2 | Les envois destinés aux admins (s'il y en a) partent-ils aussi aux membres de Bêta ? | **Non**, ils restent aux fondateurs. |
| Q3 | Qui met quelqu'un dans Bêta ? | **Les trois admins fondateurs seuls** (un membre de Bêta ne recrute pas). |
| Q4 | Faut-il un garde-fou visible (bandeau « Bêta » en haut du Back-Office) pour qu'un testeur sache qu'il voit des fonctions pas encore ouvertes ? | **Oui**, une pastille « Bêta » à côté du sélecteur App · Back-Office. |

## Tranches

- **BT-A — droits** : équipe `beta`, « admin » = fondateur ou Bêta (client, serveur, `firestore.rules`), trois
  verrous contre l'escalade.
- **BT-B — interrupteur par personne** : navigation, pages, routes API.
- **BT-C — carte Bêta et tests** : carte dans l'organigramme, pastille (Q4), 中文.

## Tests

Trois appareils (cinq pour l'agencement), comptes fictifs (`tests/helpers/fakeSession.ts`) :

- serveur coupé (`back-office-coupe.spec.ts`) : un membre ordinaire ne voit rien de plus qu'aujourd'hui ; un membre de
  Bêta voit le sélecteur, entre au Back-Office, voit toutes les entrées d'un admin, et les routes lui répondent ;
- un `equipes: true` qui n'est pas fondateur ne peut ni ajouter quelqu'un à Bêta ni s'y ajouter (UI et route) ;
- serveur ouvert : rien ne change pour personne.

Les règles Firestore n'ont pas de test automatique : relecture du diff de `firestore.rules`, puis publication à la main
par Timothée.

## Boundaries

- Ne change pas le contenu du Back-Office ni les droits des non-admins.
- Ne publie ni les règles ni la branche : les prérequis restent sur ordre explicite.
