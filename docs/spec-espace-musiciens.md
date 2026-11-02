# Spec : espace Musiciens, et la scène des fêtes en un clic

Demande de Timothée du 02/11/2026. Planche faite le jour même :
https://claude.ai/artifact/AEgKxRMpiRkGYrzkHaaL3T. Q1 à Q6 tranchées le 02/11/2026. Deux lots :
**EM** (espace Musiciens) et **SF** (scène des fêtes).

**État : spec écrite le 02/11/2026, attend le go** (« go pour EM », « go pour SF »).

## Mots de Timothée

> « Il y a des fonctionnalités que j'ai codées mais que je ne vois pas apparaître, par exemple le dictionnaire
> d'accords : à part cliquer sur les accords pour avoir accès au dictionnaire, c'est pas très pratique. Peut-être
> pour les musiciens créer un onglet comme le back office mais pour les musiciens. Et aussi pour les évènements
> comme Pâques et Noël on peut pas gérer directement dans le back office. Il faut cliquer dans évènement puis Pâques
> ou Noël et après on peut gérer, c'est pas très efficace et pas très pratique. » (02/11/2026)
>
> « Remplace le mot cours par théorie musicale. » (02/11/2026)

## Ce que le code montre (02/11/2026)

- **`/accords`** (`src/app/accords/page.tsx`) : ouvert à tous, sans compte (Q7 de `spec-dictionnaire-accords.md`),
  **sans aucune entrée de navigation** (Q14 restée ouverte) ; on n'y arrive que par « Voir tout le dictionnaire »
  du panneau d'un accord (`src/components/accords/PanneauAccord.tsx:256`).
- **Harmonie** (`/harmonie`, `/harmonie/cours`, `/harmonie/rd2000`) : dans le menu du compte
  (`src/components/layout/MenuCompte.tsx:85`, `:124-127`) et un aperçu dans *Moi* (`src/components/moi/Apercus.tsx`).
  Accès par `canUseHarmonie` (`src/lib/access.ts:594-604`) : interrupteur ouvert, sous-équipe « musiciens » de
  l'organigramme **et** piano ou guitare dans `joue` (`src/lib/acces/organigramme.ts:84-87`) ; interrupteur coupé,
  colonnes Piano et Guitare du planning ; admins toujours. Rail d'onglets Fiches · Cours · RD-2000 dans
  `src/components/harmonie/EnTeteHarmonie.tsx:32-34`.
- **Il n'existe pas de fonction « est musicien ».** Sources : `joue` (`piano, guitare, basse, batterie, cajon,
  autre`, `src/types/equipe.ts:18`) et `sousEquipes` du profil (`src/types/user.ts:72-80`) ; rôles d'instrument du
  planning lus par `findMyServices` (`src/lib/planning/names.ts:309`, tables aux lignes 171-192 : Piano, Guitare,
  Batterie, Cajon/Batterie, Cajon, Percussion, Musicien).
- **Sélecteur d'espace** (`src/components/layout/SelecteurEspace.tsx`) : deux espaces, `app` et `back-office`
  (`src/lib/navigation.ts:14`, `espaceDe` à la ligne 93), affiché aux seuls responsables.
- **Scène des fêtes** : À faire → Calendrier → « Scène des fêtes » (`src/app/back-office/calendrier/CalendrierClient.tsx:412-420`,
  coordination seule), puis l'onglet Pâques ou Noël. `/back-office/evenements/scene` redirige déjà vers la fête la
  plus proche (`src/app/evenements/scene/VersLaFete.tsx:25-37`). Décisions en place : BO8 (la scène sous le
  Calendrier, `docs/spec-back-office-piste-a.md:20`), BO2 (barre du bas à cinq onglets fixes : À faire, Calendrier,
  Planning, Équipes, App, `piste-a.md:14`).

## Décisions (tranchées le 02/11/2026)

| # | Question | Décision |
|---|---|---|
| Q1 | Qui compte comme musicien ? | **Qui joue d'un instrument, d'après le planning ou l'organigramme**, plus les admins. Organigramme : `joue` non vide ou sous-équipe « musiciens ». Planning : un rôle d'instrument (Piano, Guitare, Batterie, Cajon/Batterie, Cajon, Percussion, Musicien ; le planning n'a pas de colonne Basse, un bassiste est donc reconnu par l'organigramme seul). Les deux sources comptent, interrupteur ouvert ou coupé (interrupteur coupé, `joue` et `sousEquipes` peuvent être vides : le planning fait alors foi). Le chant (choriste, présidence) ne compte pas. |
| Q2 | Ouvrir Harmonie et la théorie musicale aux bassistes et batteurs ? | **Non.** Les accès d'Harmonie restent ceux de `canUseHarmonie`, inchangés. Un batteur voit Accords seul dans l'espace. |
| Q3 | Comment un non-musicien arrive-t-il au dictionnaire ? | **Comme aujourd'hui, et seulement ainsi** : en touchant un accord dans un chant, puis « Voir tout le dictionnaire » du panneau. Aucune entrée de navigation pour lui ; l'entrée (l'espace) est aux musiciens. La page `/accords` n'est pas verrouillée : Q7 de `spec-dictionnaire-accords.md` tient (ouverte, sans compte). Q14 de `spec-dictionnaire-accords.md` se ferme ici. |
| Q4 | Harmonie dans le menu du compte ? | **Retirée** ; l'aperçu Harmonie de *Moi* reste. |
| Q5 | Scène sur téléphone ? | **Une carte épinglée en tête d'À faire** ; la barre du bas garde ses cinq onglets (BO2). |
| Q6 | Le lien « Scène des fêtes » du Calendrier ? | **Gardé** (BO8). |
| — | Le mot « Cours » | Devient **« Théorie musicale »** (中文 : 乐理) ; dans la barre du bas, **« Théorie »** (中文 : 乐理), faute de place. Partout où il désigne ces cours : `harmonie.cours.titre`, `.retour`, `.ligne`, l'aperçu de *Moi* (« Cours de théorie »), le guide (« Idées d'harmonie et cours »). Le « Cours » de l'EDD (autre sens) ne change pas. |

Choix de Claude, pris pour rester simple (à contredire au besoin) :
- Les adresses ne changent pas (`/accords`, `/harmonie`, `/harmonie/cours`, `/harmonie/rd2000`) : l'espace les
  regroupe, il ne les déplace pas.
- Dans l'espace Musiciens, le rail Fiches · Cours · RD-2000 d'`EnTeteHarmonie` disparaît : la barre de l'espace le
  remplace.
- La barre latérale du Back-Office n'affiche pas le nom de la fête à côté de « Scène » (la planche montrait
  « Noël ») : il faudrait lire Firestore dans la barre à chaque page. La redirection vers la fête la plus proche suffit.
- La carte d'À faire dit « Scène des fêtes », sans le nom de la fête, pour la même raison.

## Lot EM — espace Musiciens

**EM-1 · Qui est musicien.** `estMusicien(user, profile, services)` dans `src/lib/access.ts` (admin, organigramme
ou planning, Q1), appelée par un crochet qui lit le planning comme `useAccesHarmonie` (même chargement, pas de
seconde lecture). Elle ne sert qu'à afficher l'espace : aucune page n'est fermée par elle, aucune règle Firestore.

**EM-2 · L'espace.**
- `Espace` gagne `"musiciens"` (`src/lib/navigation.ts`) ; `espaceDe` (pur, sans droits) y range `/accords` et
  `/harmonie*`. **Repli** : là où l'espace commande l'affichage (barres, sélecteur), un non-musicien sur ces adresses
  est ramené à `"app"` (arrivée par le panneau d'un accord, Q3). Page par défaut : `/accords`.
- Entrées : **Accords** (tout musicien), **Harmonie** et **Théorie musicale** (`acces.peut`), **RD-2000**
  (`acces.piano`), puis **App** dans la barre du bas.
- Sélecteur : visible pour un responsable **ou** un musicien. Segments selon les droits : App · Musiciens,
  App · Back-Office, ou App · Musiciens · Back-Office. En barre réduite : deux ou trois icônes rondes.
- Barre latérale (« GCC Musiciens ») et barre du bas comme le Back-Office (planche, quatre dispositions).
- Le rail d'`EnTeteHarmonie` n'est plus rendu dans l'espace.
- Points du code à reprendre (relecture du 02/11/2026) : `PAR_DEFAUT` et `cibles` (`Record<Espace, …>`,
  `SelecteurEspace.tsx:22`, `:92`) ; `entreesBarre` (`navigation.ts:104-110`, tout ce qui n'est pas Back-Office
  tombe sur la barre App) ; `MobileTabBar.tsx:33` et `:56` ; `BarreLaterale.tsx:90` et `:232` ; les gardes
  « responsable seul » du sélecteur (`Navbar.tsx:153`, `if (!responsable) return null` et `retenir` dans
  `SelecteurEspace`) ; la forme retenue pendant l'attente (`useFormeAffichee`, `marqueConnecte.ts`) gagne
  « musicien », sinon le sélecteur apparaît en retard ; le crochet attend le planning comme `useAccesHarmonie`
  (`chargement`) ; `labelDeSection` (`navigation.ts:135-142`) donne « Musiciens » pour ces adresses.

**EM-3 · Accès et libellés.**
- `/accords` et le panneau d'un accord, lien « Voir tout le dictionnaire » compris : **inchangés** (Q3). Ouverte
  depuis le panneau par un non-musicien, la page s'affiche dans l'espace App, sans barre Musiciens.
- Menu du compte : l'entrée Harmonie disparaît (Q4).
- Libellés : `harmonie.cours.titre` et `.retour` → « Théorie musicale » / 乐理 ; nouvelle clé pour la barre du bas,
  « Théorie » / 乐理 ; noms de l'espace et des entrées en FR et 中文. Guide (`/guide`) mis à jour.

## Lot SF — scène des fêtes

- **SF-1 · Entrée « Scène » de la barre latérale du Back-Office**, entre Calendrier et Planning, pour la
  coordination seule (`isCoordination`), vers `/back-office/evenements/scene` (redirection existante vers la fête la
  plus proche, onglets Pâques · Noël). `ENTREES` (`src/types/backOffice.ts`) gagne `scene` ; `ongletsBackOffice` ne la
  met pas dans la barre du bas (BO2 : sa liste est fixe). Icône `Drama`, comme la scène dans le Calendrier
  (`src/components/calendrier/apparence.ts:14`) et À faire. À toucher : `scene` en troisième place d'`ENTREES` (l'ordre
  de la barre en vient), `ENTREES_BACK_OFFICE` (`navigation.ts`), `visible` d'`entreesBackOffice` (`access.ts`,
  `scene: isCoordination(…)`), clé `backOffice.entrees.scene` FR et 中文. `firestore.rules` ne valide pas cette liste.
- **SF-2 · Carte « Scène des fêtes » en tête d'À faire**, pour la coordination, **là où la barre latérale n'existe
  pas** (téléphone et tablette en portrait, classe `.hide-on-desktop` existante, `globals.css:156` et `:524`) : couleur de la scène (`PLANNING_COLORS.scene`), « Réservations et ordre
  de passage · Pâques, Noël », un toucher vers la scène.
- Le lien « Scène des fêtes » du Calendrier reste (Q6).

## Vérification

- Playwright, trois appareils, plus les quatre dispositions pour l'agencement (`SPECS_GRAND_ECRAN`) : un pianiste
  (organigramme), un batteur (planning seul), un membre sans instrument, un responsable musicien, la coordination,
  un visiteur.
- Le musicien voit l'espace et ses entrées selon son instrument ; le non-musicien ne voit pas l'espace, et arrive
  toujours au dictionnaire par le panneau d'un accord et son lien, visiteur sans compte compris.
- La coordination ouvre Noël en un clic (barre latérale) ou un toucher (carte d'À faire) ; les autres responsables
  ne voient ni l'entrée ni la carte ; interrupteur coupé, rien de SF n'apparaît.
- Un chant FR et un chant ZH pour le panneau d'un accord ; libellés en 中文.
- Specs existantes à mettre à jour : `tests/coherence.spec.ts:92` (Harmonie au menu du compte, Q4) ;
  `tests/agencement-v18-harmonie.spec.ts`, `tests/pages-en-grand-harmonie.spec.ts`, `tests/harmonie-cours.spec.ts`
  (rail et libellé « Cours ») ; `tests/back-office-espace.spec.ts`, `tests/barre-back-office.spec.ts`,
  `tests/agencement-v18-t2a.spec.ts` (entrées du Back-Office).
- **Aucune règle Firestore à publier.**
