# Spec : mise en ligne de la branche, back-office coupé (lot 18)

Demande de Timothée, 20/09/2026 :

> « Tu peux fusionner tout ce qui n'est pas en rapport avec le back-office et la
> DA du site, demande moi quelles fonctionnalités font partie du backoffice en me
> listant toutes les fonctionnalités qu'il y a la branche qui ne sont pas sur le
> main. »

> « je veux faire une super app qui permet aux responsables de faire tout leur
> back office dessus (planning, tâches, création d'évènements et bien plus encore
> dessus), mais aussi à l'assemblée d'avoir une application sur laquelle elle peut
> suivre ce qu'il se passe à l'église, leur service, la louange, les évènements
> qu'il va y avoir, s'inscrire à des évènements et tout. Le tout sur une seule
> application pour pas qu'on s'éparpille trop. »

Puis, le même jour, sur mon résumé « le planning en grille part en lecture seule,
le calendrier des évènements et l'inscription partent aussi » :

> « Je le compte comme back office aussi. »

Statut : **cinq décisions de Timothée prises le 20/09/2026 ; go le 20/09/2026 ;
interrupteur et retrait des annonces CODÉS le jour même (voir « Avancement »), à
valider en local ; rien n'est fusionné dans `main`, qui attend un go explicite.**

## Décisions du 20/09/2026

| # | Question | Décision |
| --- | --- | --- |
| D1 | Qu'est-ce qui est « back-office » ? | Tâches par pôle (lots 7, 13, 14) · organigramme / Équipes (lot 16) · **tout le planning en grille, lecture comprise**, avec l'écriture, l'import et l'export CSV / PDF (lot 17) · nouveaux blocs de l'administration · **toute la section Évènements** : calendrier, fiches, inscriptions, création et gestion, période d'inscription, lien externe (lots 6, 6 bis, 11) · programmes de scène (lots 3 bis, 12) |
| D2 | Comment le tenir hors ligne ? | **Un interrupteur** : tout le code est fusionné, une variable d'environnement coupe le back-office en ligne ; il reste actif en local |
| D3 | Et le look ? | **5C1 d'abord, une seule mise en ligne** : l'église ne vit qu'un changement d'apparence (`spec-look.md`, § 20/09/2026) |
| D4 | Les annonces | « Retire la section annonce je pense que c'est mieux, jusqu'à présent on l'a jamais utilisée » |
| D5 | Grille du planning en lecture, calendrier et inscription | Back-office aussi (voir D1) : en ligne, le planning garde le tableau que les gens connaissent |

**Ce qui part en ligne** : correctifs de l'audit, régie, mode louange, setlist en
page unique, historique avant / après, coup d'œil, version perso, notification au
président, suppression groupée, export PDF, harmonie, Interfranco / Intergroupe,
sainte cène, petit déj, rappels regroupés, accueil de première connexion, guide,
中文, lot cohérence, service worker — dans le look 5C1.

## Ce que le code montre (20/09/2026)

- **On ne peut pas trier par commit.** La branche a 47 commits d'avance sur
  `main`. Les commits sont des lots mélangés : `ceb3a7b` porte planning,
  président, coup d'œil, setlist, scène, version perso et évènements ; `b358afb`
  porte harmonie, historique, période d'inscription, petit déj et retours
  évènements.
- **Le look n'est pas détachable.** Sur les 66 fichiers `src/` du commit du look
  (`de882b7`), 34 ont été retouchés par les lots suivants.
- **Les pages du back-office** : `/taches`, `/taches/[pole]`, `/equipes`,
  `/evenements`, `/evenements/[id]`, `/evenements/[id]/modifier`,
  `/evenements/nouveau`, `/evenements/scene`.
- **Ses routes serveur** : `/api/taches/assigne`, `/api/taches/fait`,
  `/api/equipes/importer`, `/api/equipes/poles`, `/api/admin/importer-planning`,
  `/api/admin/migrer-annonces`, `/api/scene/conflit`,
  `/api/evenements/inscription`, `/api/evenements/desinscription`,
  `/api/push/notify-evenement`.
- **Ses entrées** se trouvent dans `Navbar.tsx` (dont la cloche),
  `MobileTabBar.tsx` (onglet Évènements, barre du visiteur « Chants ·
  Évènements »), `moi/page.tsx`, `evenements/layout.tsx`, `EvenementsTabs.tsx`,
  `admin/page.tsx`, l'accueil de première connexion (`Accueil.tsx` l. 24 cite la
  section Évènements) et le guide.
- **Le planning.** Sur `main`, les pages du planning affichent `PlanningTable` ;
  sur la branche, `PlanningGrille`. **`PlanningTable.tsx` existe encore** sur la
  branche (signalé comme code mort le 19/09, jamais supprimé) : le site en ligne
  peut garder exactement le tableau d'aujourd'hui.
- **Le rappel du matin** (`api/cron/reminders`) fond dans la même notification les
  services, les tâches, les relances, les réunions de pôle, les créneaux de scène,
  le rappel de la veille d'un évènement et la ligne « Inscriptions ouvertes ».
- **Les annonces** : sur `main`, une page, un formulaire et une route de push. Sur
  la branche, `/annonces` redirige vers `/evenements`, le formulaire et la route
  ont disparu, il reste le bouton admin « migrer les annonces » (jamais lancé) et
  `types/annonce.ts`.
- **Local et en ligne partagent le même Firestore.** Or chaque lecture de
  planning fusionne l'app par-dessus le Sheet, dimanche par dimanche
  (`sheets.ts` : `fetchCulte` = `fusionnerLignes(fetchGrille("culte"),
  lireCulteSheet())`, et de même pour les dix autres grilles). **Un dimanche
  écrit dans l'app, même depuis un poste local, masquerait le Google Sheet en
  ligne.**
- **Les règles Firestore publiées le 19/09/2026** couvrent déjà tâches, équipes,
  plannings et évènements : plus larges que ce que le site en ligne utilisera,
  sans danger. La règle des setlists privées du lot cohérence reste à republier.

## Ce qui est construit

### L'interrupteur

Une constante, un seul module (`src/lib/backOffice.ts`) :

```ts
/** Back-office (tâches, équipes, planning en grille, évènements, scène) : coupé
 *  en ligne tant que la variable n'est pas posée sur Vercel. */
export const BACK_OFFICE = process.env.NEXT_PUBLIC_BACK_OFFICE === "1"
```

`.env.local` la pose à `1` ; Vercel ne la pose pas. L'ouvrir un jour = une
variable et un redéploiement. **Un seul interrupteur**, pas un par module (rien
de spéculatif).

Coupé, l'interrupteur fait cinq choses :

1. **Les entrées disparaissent** : Tâches, Équipes, l'onglet Évènements et la
   cloche des évènements, les blocs d'administration de D1. La barre du bas
   passe à **quatre onglets : Chants · Setlists · Planning · Moi** ; celle du
   visiteur sans compte se réduit à Chants.
2. **Les pages et les routes serveur de D1 répondent 404** (`notFound()`) :
   masquer une entrée ne suffit pas, une adresse tapée à la main doit tomber dans
   le vide. `/annonces` aussi.
3. **Le planning reste celui de `main`** : les pages affichent `PlanningTable`,
   lisent le Google Sheet seul, et **`fetchGrille` n'est jamais appelé**. Ce qui
   s'ajoute en ligne côté planning : Interfranco / Intergroupe, sainte cène, petit
   déj, « Ce dimanche », Mes services.
4. **Le rappel du matin ne parle que des services** : ni tâches, ni relances, ni
   réunions de pôle, ni scène, ni évènements.
5. **L'accueil de première connexion et le guide ne citent pas** les sections
   coupées.

### Les annonces (D4)

La section Annonces n'existe plus (c'est déjà le cas sur la branche), **la
migration n'est pas lancée**, et son bouton admin, sa route
`/api/admin/migrer-annonces` et `types/annonce.ts` partent. Le droit `annonces`
des profils n'est pas renommé : il est devenu le droit de créer un évènement pour
sa section (tranché le 15/09/2026), et il dort avec le back-office.

### Le plan de fusion

1. Fusionner `origin/main` dans `ui/apple-design` (un commit de David, 22 liens
   YouTube dans des `.cho`) : **fusionner, pas rebaser** ; régénérer l'index.
2. Coder 5C1 et les retours (`spec-look.md`), validation de Timothée en local.
3. Coder l'interrupteur et le retrait des annonces, test d'abord.
4. Suite Playwright complète sur les trois appareils, interrupteur **ouvert**
   (l'existant), puis la nouvelle spec interrupteur **coupé**.
5. `npm run build`, `npx tsc --noEmit`, `npm run validate`, `npm run lint`.
6. Republier `firestore.rules` (setlists privées).
7. Fusionner `ui/apple-design` dans `main`, pousser : Vercel déploie. **Sur go
   explicite de Timothée seulement** : c'est la première mise en ligne depuis le
   13/09/2026.
8. Vérifier en ligne, sur téléphone : un chant FR, un chant ZH, une setlist, le
   mode louange, le planning de dimanche, une adresse du back-office (404).
   Retour arrière = « Promote » du déploiement précédent dans Vercel.

## Tests

`tests/back-office-coupe.spec.ts`, sur ordinateur, téléphone et tablette, contre
un second serveur lancé sans la variable (un `webServer` de plus dans
`playwright.config.ts`, autre port) :

- aucune entrée de D1 dans la navbar, la barre du bas (quatre onglets), « Moi »,
  l'administration, l'accueil de première connexion, y compris connecté en admin ;
- chaque page et chaque route de D1 répond 404 ;
- les pages du planning affichent l'ancien tableau, et ses lignes viennent du
  Sheet même si `plannings/*` contient ce dimanche ;
- le message du rappel ne contient ni tâche, ni scène, ni évènement (test unitaire
  de `reminderMessage`, pas de cron réel).

La suite existante tourne interrupteur ouvert et ne change pas.

## Boundaries

- Toujours : un commit par lot ; test d'abord ; trois appareils ; 1 chant FR +
  1 chant ZH avant de valider.
- Demander d'abord : pousser sur `main` ; poser ou retirer une variable sur
  Vercel ; supprimer une donnée Firestore ; tout ce qui toucherait `access.ts`
  et `firestore.rules` (en double).
- Jamais : restaurer un fichier depuis `HEAD` ; rebaser sur les commits de
  David ; supprimer le code du back-office (il est coupé, pas retiré).

## Questions ouvertes (à trancher au go)

1. **La scène se réserve dès l'automne** (`spec-programme-scene.md` : réservations
   d'octobre au 20/12/2026). Coupée en ligne, Alice ne peut rien ouvrir. Il faut une
   date d'ouverture de l'interrupteur, ou accepter que Noël 2026 se planifie
   ailleurs.
2. **Remettre `PlanningTable` sur sept pages** (culte, table, EDD, campus, groupes,
   Interfranco, Intergroupe) veut dire deux rendus par page tant que l'interrupteur
   existe. C'est le prix de D5 ; l'autre voie serait la grille en lecture seule, que
   tu as écartée.
3. **Des dimanches sont-ils déjà écrits dans `plannings/*`** (import ou essais du
   19/09/2026) ? Coupés, ils sont ignorés en ligne ; à savoir avant d'ouvrir.
4. **L'accueil de première connexion** présente l'app par ses sections : coupé, il
   aura un écran de moins. À relire une fois codé.

## Avancement (20/09/2026)

Go de Timothée le 20/09/2026. `origin/main` fusionné dans la branche (`eecf519`,
22 liens YouTube de David, 370 chants valides, index régénérés). Codé le jour
même, test d'abord, sur ordinateur, téléphone et tablette.

| Point | Fait | Où |
| --- | --- | --- |
| L'interrupteur | `BACK_OFFICE = process.env.NEXT_PUBLIC_BACK_OFFICE === "1"` ; `.env.local` le pose à `1` (fichier local, non suivi) | `src/lib/backOffice.ts` |
| Entrées | barre du bas à quatre onglets (Chants seul pour un visiteur), navbar sans Évènements ni Tâches, menu compte et « Moi » sans Équipes ni Mes tâches | `MobileTabBar`, `Navbar`, `moi/page.tsx` |
| La cloche | **reste** : elle porte aussi les setlists et « Présentation prête ». Coupée, elle ne lit plus les évènements | `useNotifications.ts` |
| Pages en 404 | au niveau serveur : `evenements/layout.tsx` (toute la section, fiches et scène), `equipes/page.tsx`, `annonces/page.tsx`, et un nouveau `taches/layout.tsx` (les pages des tâches sont des composants client) | — |
| Routes en 404 | une garde en tête des neuf gestionnaires | `api/taches/*`, `api/equipes/*`, `api/admin/importer-planning`, `api/scene/conflit`, `api/evenements/*`, `api/push/notify-evenement` |
| Planning | `sheets.ts` : les douze appels à `fetchGrille` passent par `grilleDeLApp`, qui ne lit rien quand c'est coupé. Les sept pages servent `AncienTableau.tsx` | `src/lib/planning/sheets.ts`, `src/app/planning/*/` |
| Rappel du matin | coupé : ni scène, ni tâches, ni « Inscriptions ouvertes », ni veille d'évènement | `api/cron/reminders/route.ts` |
| Accueil et guide | l'accueil ne présente pas Évènements ; le guide ne décrit ni Évènements, ni Scène, ni Tâches | `Accueil.tsx`, `guide/page.tsx` |
| Administration | coupés : pôles, droit sur l'organigramme, droit de remplir les plannings, droit de créer des évènements, import des plannings, import de l'organigramme | `admin/page.tsx` |
| Annonces (D4) | bloc « Annonces → Évènements », fonction et route `migrer-annonces` retirés | `admin/page.tsx`, `api/admin/migrer-annonces/` |

**Écarts avec la spec, assumés :**

- **Le tableau vient de la branche, pas de `main`.** Sur `main` ces pages sont dans
  l'ancien habillage (textes de 9 px), contraire au nouveau look. La branche les a
  eues en tableau *dans le nouveau look* juste avant le lot 17, avec la sainte cène
  et le petit déj : c'est cette version (`de882b7` pour culte, table, campus ;
  `e8e2ed0` pour EDD, groupes, Interfranco, Intergroupe) qui est reprise, dans un
  `AncienTableau.tsx` à côté de chaque page. Une page = `BACK_OFFICE ? Grille :
  AncienTableau`, sans mélanger les deux rendus.
- **`src/types/annonce.ts` reste** : `ANNONCE_SECTIONS` est encore importé par
  l'administration et trois écrans d'évènements.
- **Deux tests existants changés** parce que la fonctionnalité disparaît (D4) :
  `evenements.spec.ts` (la migration → « l'administration ne propose plus de
  migration ») et `coherence.spec.ts` (la route retirée d'une liste de fichiers).
- **Le rappel du matin n'a pas de test** : sa route parle à `firebase-admin` et le
  dépôt ne teste aucune route de cron. Les quatre gardes ont été relues, pas
  exécutées.

**Tests** : `tests/back-office-coupe.spec.ts`, 66 tests sur les trois appareils,
contre un second serveur (`PW_PORT + 1`, `NEXT_PUBLIC_BACK_OFFICE=0`). Next 16
verrouille `.next/dev` : ce second `next dev` a son dossier de build
(`NEXT_DIST_DIR=.next-coupe`, une ligne dans `next.config.ts`, ignoré par git,
ESLint et `tsconfig`). Le premier serveur force l'interrupteur à `1` : la suite
existante ne dépend pas du `.env.local` de la machine. Build de production
interrupteur coupé : compilé et typé.

**Remarqué sans y toucher** : l'ancien tableau « Table » réaffecte une variable
pendant le rendu (avertissement ESLint d'origine) ; dans une fusion de chants, la
tonalité de la liste reste l'ancienne pastille neutre.

