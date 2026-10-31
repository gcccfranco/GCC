# Spec — Lot LF : lectures Firestore sous le quota gratuit

> Demande de Timothée, 31/10/2026 : « ça fait plusieurs fois qu'on atteint la limite, optimise firebase »,
> puis « écris la spec et code », « fais aussi le 3 et 4 », puis « fais aussi la requête unique pour les tâches,
> go pour coder ». Go pour le lot LF entier (LF1 à LF5).

## Constat (30–31/10/2026)

Console Firebase, 24 h : **62 000 lectures** (quota gratuit : 50 000 par jour), 359 écritures, pics à
12 000 lectures par heure (vendredi soir, samedi 16 h : la préparation du dimanche). Firestore facture **un
document lu par document renvoyé**, et **une lecture minimum par requête**, même vide.

Origines trouvées dans le code (ordre de coût estimé) :

1. **`getSetlists()`** (`src/lib/firebase/setlists.ts`, `lireSetlists`) relit **toute** la collection
   `setlists` (≈ 150 à 200 documents, privées, brouillons, corbeille et fêtes compris, filtrés ensuite dans le
   navigateur). Gardée 30 s en mémoire (5 min via `setlistsPourStats`), donc relue à chaque rechargement,
   nouvel onglet, ouverture de l'app depuis une notification. Appelants : la page d'un chant
   (`StatistiquesDuChant` → `setlistsPourStats`), l'onglet Setlists, la bibliothèque de l'éditeur, les
   statistiques, le catalogue Harmonie, « Mes services », le calendrier, `MesPresidences`.
2. **`listProfiles()`** (`src/lib/firebase/users.ts`) relit tous les profils à chaque appel, sans garde :
   aperçu d'une setlist avec équipe (`ApercuSetlist`), volet Équipe de l'éditeur, sommaire des cours, pages
   admin, etc.
3. **Pastilles du back-office** (`src/lib/tableauDeBord/lecture.ts`, `lireAFaire`, gardée 1 min) : profils,
   toutes les absences, plannings, tâches (une requête par tâche pour ses « fois ») relus chaque minute tant
   qu'un responsable navigue dans le back-office.
4. **Cloche** (`src/hooks/useNotifications.ts`) : déjà incrémentale, mais `focus` et `visibilitychange`
   déclenchent chacun 3 requêtes (même vides : 3 lectures) à chaque retour sur l'app.

Les routes serveur (cron, push) lisent peu et ne sont pas visées.

## Objectif mesurable

- Ouvrir un chant ou l'onglet Setlists quand la copie locale existe : **≤ 2 requêtes** sur `setlists` (la
  delta), au lieu de ≈ 200 documents.
- Ouvrir dix aperçus de setlist d'affilée : **une** lecture de la collection `users` au plus (10 min).
- Retour sur l'app (focus + visibilité) : **une** passe de la cloche, au plus une par minute.
- Rien de visible ne change pour l'utilisateur (mêmes listes, mêmes chiffres), hors délai de fraîcheur décrit
  ci-dessous.

## LF1 — Setlists : copie sur l'appareil + delta

### Champ `majLe`

Toute écriture d'une setlist pose **`majLe`** (horodatage ISO, `timestampValue`) : création, modification,
corbeille (mise et restauration), duplication, et côté serveur `src/lib/fetes/serveur.ts` (saisie de fête) et
`src/app/api/setlist/presentation/route.ts`. Chercher **tous** les écrivains : `grep -rn "setlists/" src` et
les `PATCH`/`commit` de `src/lib/firebase/setlists.ts`. `majLe` sert **seulement** à la synchronisation :
`updatedAt` garde son sens actuel (il nourrit « setlist modifiée » dans la cloche, et la corbeille comme la
présentation ne le touchent volontairement pas).

Règles Firestore : rien à changer (aucune règle `hasOnly` sur les champs d'une setlist). Si l'executant
constate le contraire, il s'arrête et le signale (publication manuelle par Timothée).

### Lecture

`getSetlists()` garde sa signature et son résultat (setlists publiques, ni brouillon, ni fête, ni corbeille,
triées par `createdAt` décroissant). Dessous :

1. **Copie locale** en IndexedDB, liée au compte (`uid`), comme `src/lib/setlist/copieHorsLigne.ts` : les
   documents qui passent le filtre, par id, plus `lueLe` (le `readTime` renvoyé par Firestore à la dernière
   synchronisation) et `completeLe` (dernière lecture complète). Effacée à la déconnexion et au changement de
   compte (même mécanisme que la copie hors ligne).
2. **Pas de copie, ou `completeLe` de plus de 24 h** : lecture complète (la requête actuelle), puis la copie
   est remplacée. C'est ce qui rattrape les suppressions définitives faites ailleurs.
3. **Sinon** : requête delta `where majLe > (lueLe − 10 min)` (marge pour les horloges des appareils), un seul
   champ, pas d'index composite. Chaque document renvoyé remplace le sien dans la copie, ou l'en retire s'il
   ne passe plus le filtre (privée, brouillon, corbeille, fête).
4. La delta part **au plus une fois par minute** par onglet (garde en mémoire, comme aujourd'hui) ; entre
   deux, la copie en mémoire répond.
5. Les écritures de ce module (`viderCacheSetlists`) appliquent l'effet localement quand c'est simple
   (suppression définitive : retirer l'id) et forcent la delta suivante (pas de garde d'une minute).
6. IndexedDB indisponible ou en échec : on retombe sur la lecture complète actuelle (aucune erreur montrée).

`setlistsPourStats` n'a plus de raison d'avoir sa propre garde de 5 min : la retirer si `getSetlists()`
couvre le besoin, sinon la laisser (choix de l'executant, à dire dans le compte rendu).

Fraîcheur acceptée : une setlist **supprimée définitivement** sur un autre appareil peut rester jusqu'à 24 h
dans les listes et statistiques d'un appareil ; l'ouvrir mène à l'écran « introuvable » existant. Une
modification ou une mise à la corbeille se voit dans la minute.

## LF2 — Profils : une lecture partagée

`listProfiles()` gardée **10 min** en mémoire, par compte, promesse partagée (même forme que la garde de
`getSetlists()`), copie rendue à chaque appelant. Vidée par toute écriture de profil de `users.ts`
(`saveProfile`, `changerResponsabilites`, et les autres écrivains de `users/*` côté client : `groupes.ts`,
`equipes.ts`…). Un échec n'est pas gardé. Pas de copie sur l'appareil (données personnelles). `lireProfils` de
`lecture.ts` s'appuie dessus au lieu de sa propre garde.

## LF3 — Pastilles et « À faire » du back-office

- `TTL_PARTAGE_MS` et la garde de `lireAFaire` passent de **1 min à 10 min**.
- Toute écriture qui change ce que montre « À faire » vide ces gardes : modules `taches.ts`, `absences.ts`,
  `planningGrille.ts`, `evenements.ts`, `programmes.ts` (une fonction `viderGardesTableau()` exportée par
  `lecture.ts`, appelée après chaque écriture, réussie ou non, comme `viderCacheSetlists`).
- La page « À faire » garde un geste de rafraîchissement si elle en a un ; sinon rien à ajouter.
- La requête par tâche (`listFois`) devient une requête par équipe : voir LF5.

## LF4 — Cloche

`refresh()` de `useNotifications` ne repart pas si la précédente passe a eu lieu il y a **moins de 60 s**
(sauf la première, et sauf changement de compte). `focus` et `visibilitychange` arrivant ensemble ne font
donc qu'une passe. Le polling de 10 min ne change pas.

## LF5 — Tâches : une requête par équipe pour les « fois »

Aujourd'hui `listTaches(equipe)` fait 1 requête pour les tâches + **1 par tâche** pour ses « fois »
(`equipes/{e}/taches/{t}/fois/{date}`). Cible : **2 requêtes par équipe**, quel que soit le nombre de tâches.

- **Champ `equipe`** sur chaque document « fois », posé par tous ses écrivains : `taches.ts` (`cyclerEtat`,
  `choisirEtat`, `deplacerTache`, etc.) et la route `src/app/api/taches/fait/route.ts` (Admin SDK) ; les
  chercher tous (`grep -rn "fois" src`).
- **Requête** : `runQuery` sur le parent `equipes/{e}`, `from: [{ collectionId: "fois", allDescendants: true }]`,
  `where equipe == e` ; les fois se rangent par tâche d'après leur chemin (`…/taches/{t}/fois/{date}`).
  `listFois(tache)` reste pour les appelants qui n'en veulent qu'une.
- **Règle** (`firestore.rules`, à côté de `{chemin=**}/absences`), même droit que la lecture actuelle :
  ```
  match /{chemin=**}/fois/{date} {
    allow read: if signedIn() && estDeLEquipe(resource.data.equipe);
  }
  ```
  Le filtre `where equipe == e` de la requête est ce qui permet à Firestore de la prouver. **À publier à la
  main par Timothée.** Pas de miroir à ajouter dans `access.ts` (même droit que `estDeLEquipe`).
- **Repli** : si la requête unique est refusée (règle pas encore publiée), `listTaches` retombe sur l'ancienne
  lecture tâche par tâche, sans erreur montrée.
- **Rattrapage des fois existants** : `scripts/rattrapage-fois-equipe.ts` (`npx tsx`), lancé **une fois** par
  Timothée en local (il lit les identifiants Admin de `.env.local`, comme les routes serveur) : parcourt
  `collectionGroup("fois")`, pose `equipe` (tiré du chemin) là où il manque, affiche le nombre de documents
  touchés ; relançable sans effet. Option `--essai` qui compte sans écrire.
- **Ordre de mise en ligne** (à écrire dans le compte rendu et la feuille de route) : 1. Timothée publie la
  règle ; 2. il lance le rattrapage ; 3. seulement ensuite la fusion dans `main`. Sans le rattrapage, les fois
  anciens seraient invisibles à la requête unique.

## Tests (Playwright, trois appareils)

Une spec `tests/lectures-firestore.spec.ts`, Firestore simulé (`tests/helpers/fakeSession.ts`), qui **compte
les requêtes** `:runQuery` vers `firestore.googleapis.com` par collection :

- LF1 : première visite d'un chant → lecture complète ; rechargement → une delta et aucune lecture complète ;
  une setlist modifiée dans le faux Firestore (avec `majLe`) apparaît après la delta ; une setlist mise à la
  corbeille disparaît ; copie de plus de 24 h → lecture complète ; déconnexion → copie effacée.
- LF2 : deux aperçus de setlist avec équipe → une seule requête `users`.
- LF3 : deux pages du back-office à moins de 10 min → une seule passe de `lireAFaire` ; après une écriture de
  tâche, la passe suivante relit.
- LF4 : `focus` + `visibilitychange` → une seule passe de la cloche.
- LF5 : une équipe de trois tâches → 2 requêtes (tâches + fois), mêmes lignes « À faire » qu'avant ; requête
  unique refusée (403 simulé) → repli tâche par tâche, mêmes lignes ; une fois cochée porte le champ `equipe`.

Puis les suites existantes qui touchent ces écrans (setlists, statistiques, back-office, notifications,
copie hors ligne), `npx tsc --noEmit`, `npm run lint`. Vérifier sur 1 chant FR et 1 chant ZH que les
statistiques du chant restent identiques.

## Après la mise en ligne

Comparer la courbe « Utilisation » de la console sur 24 h, et regarder l'onglet « Insights sur les requêtes »
pour confirmer la requête restante la plus lue.
