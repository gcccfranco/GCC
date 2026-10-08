# Chantier « équipes et groupes » — décisions du 08/10/2026

Source de vérité pour écrire les specs puis coder ce chantier. Décisions prises par Timothée pendant un
entretien en cinq rondes (« grill ») le 08/10/2026, après une cartographie du code (`cartographie.md`) et une
planche de design (`maquettes.md`, images dans `maquettes/`). Une ambiguïté se tranche par la lecture la plus simple
de ces décisions ; une vraie question nouvelle se pose à Timothée avant de coder.

## Origine

- Premier retour des responsables après le document des nouveautés (« tout me semble OK ») : dupliquer dans le
  planning comme dans Google Sheets ; « le "ajouter une ligne" du petit déj, c'est quoi ? » ; un endroit pour les
  chants, musiques et danses des fêtes, pour la régie et les musiciens.
- Timothée : « ajouter des organigrammes à ce qui existe déjà : les groupes, les comités de chaque groupe, les rôles
  qu'il y a dans les groupes et qui est dans quel rôle. On supprime les pôles et on garde les TEAM. »

## Vocabulaire (correction de Timothée)

**Noël et Pâques sont des ÉVÈNEMENTS (les fêtes) ; la scène n'est que le LIEU qu'on réserve** (entraînements, jour J).
On ne parle jamais de « chants de la scène » : ce sont les **chants de Noël** et les **chants de Pâques**, rangés dans les
setlists, catégories **Noël** et **Pâques**.

## Lot 1 — Les pôles disparaissent, les équipes (TEAM) les remplacent

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

## Lot 2 — Un organigramme par groupe

| # | Décision |
|---|---|
| 9 | Groupes avec organigramme : **Paix, Fidélité, Bonté, Amour, Joie** (Amour et Joie n'ont pas de planning). |
| 10 | Back-Office › Équipes › Organigramme : sélecteur **Église · Paix · Fidélité · Bonté · Amour · Joie** ; « Église » = l'organigramme actuel (la bascule Équipes · Musiciens passe à droite). Mise en page **A** : en tête (président, VP), le comité, puis les rôles **en cartes** ; un clic ouvre la fiche du rôle. |
| 11 | **Président** et **vice-président** : rôles fixes des cinq groupes, **nommés par les admins** ; **jusqu'à 2 VP** par groupe (réglable par un admin). |
| 12 | **Les autres rôles** sont créés par le président, le VP ou un admin : nom français, nom 中文 facultatif, **nombre de places** (vide = sans limite, affiché « 2 sur 3 »), case **« au comité »**, colonne du planning reliée (Paix, Fidélité, Bonté seulement ; **une colonne = un seul rôle**), droits à cocher. |
| 13 | **Comité** = président + VP + rôles cochés « au comité » ; c'est une équipe (ses propres réunions et tâches), ses référents sont le président et le VP. |
| 14 | **Titulaires** : une personne sans compte (nom libre) peut tenir un rôle ; une personne peut avoir **plusieurs rôles** ; **une personne n'appartient qu'à un seul groupe** (une personne d'un autre groupe est grisée : un admin peut la changer de groupe). Ajouter comme titulaire quelqu'un sans groupe le fait entrer dans le groupe. « Ajouter un titulaire » : **une seule recherche** (comptes, puis « Ajouter … sans compte » en bas). |
| 15 | **Droits** : président et VP tiennent l'organigramme de leur groupe, remplissent et publient le planning du groupe, envoient ses notifications ; pour les autres rôles, le président coche ces droits un par un ; **« Publier » inclut « Remplir »**. |
| 16 | **Qui voit quoi** : président ou VP sans le droit Équipes → tous les organigrammes en lecture, le sien modifiable, pas l'onglet Personnes. Dans l'App, page Équipes : **tous les groupes visibles en lecture**. |
| 17 | **Lien avec le planning** : un rôle relié à une colonne fait passer ses titulaires en tête de « Choisir » (libres ou déjà placés), les autres membres du groupe repliés sous « Voir tout le groupe », puis le nom sans compte. Les titulaires d'un rôle reçoivent les notifications du groupe. Les rôles de service existants restent valables pendant la transition. |
| 18 | Un titulaire sans compte apparaît aussi dans Planning › Sans compte (pour qu'un admin le relie plus tard). |
| 19 | Un seul organigramme par groupe, mis à jour (pas d'historique par année). |
| 20 | **Couleurs** d'Amour et de Joie : une couleur chacun (à proposer sur planche ; `serviceColors.ts` est gelé, changement validé par Timothée). |

## Lot 3 — Planning et petit déj

| # | Décision |
|---|---|
| 21 | **Copier le dimanche précédent** : piste **A** (bouton au survol de la ligne, aperçu en pointillé ; menu ⋯ sur iPad et téléphone). Toutes les colonnes **sauf Thème et Orateur**. Seulement les cases vides ; si des cases remplies seraient touchées, fenêtre « Remplir les N cases vides » / « Remplacer aussi ces N noms ». |
| 22 | **Remplir vers le bas** (mettre ce nom jusqu'à la fin du trimestre), depuis le menu de la case seulement ; cases vides seulement. |
| 23 | **Copier-coller au clavier** sur ordinateur : case ou plage (Maj+clic), collage depuis Google Sheets ou Excel. Piste **B** : aperçu posé dans la grille (pointillé, orange quand il remplace un nom) et barre Coller · Cases vides seulement · Annuler. Un collage qui ne tombe que dans des cases vides s'écrit sans rien demander. |
| 24 | **« Annuler »** dans une bannière pour Coller, Copier et Remplir (jusqu'au geste suivant). |
| 25 | **Prévenir des changements** : dans un trimestre **déjà publié**, une **bannière** au-dessus de la grille (piste **B** : « 3 cases ont changé depuis la publication, le 15/11 et le 22/11 », « Ne pas prévenir », bouton) ; chaque case changée porte un point orange. Peuvent l'utiliser ceux qui publient ou notifient ce planning. Préviennent les personnes **ajoutées et retirées** des cases changées (cochées d'office), chacune avec sa ligne en FR ou en 中文 ; une personne sans compte est « à prévenir toi-même ». Après l'envoi ou « Ne pas prévenir », les points disparaissent ; le bouton revient au prochain changement. |
| 26 | **Petit déj** : « Ajouter une ligne » devient **« Inscrire quelqu'un »**, piste **B** : un seul bouton en tête de la carte, qui ouvre un petit formulaire (le dimanche, puis le nom). |

## Lot 4 — Chants de Noël et de Pâques

| # | Décision |
|---|---|
| 27 | Sur la page d'une fête, l'**ordre de passage** est la source : piste **A**, chaque passage porte ses chants (tonalité), ses musiques et danses (lien, durée et départ facultatifs, note pour la régie). Filtre « Tous · Le mien » au-dessus. |
| 28 | **Une setlist par « Qui »** (chaque groupe, chaque classe) : « Noël 2026 · Gp Paix », titre du passage en sous-titre. Les sketches et les danses peuvent réunir plusieurs classes ou groupes (passage à plusieurs « Qui ») ; un passage sans chant n'a pas de setlist (signalé en bas de liste). |
| 29 | **« Saisir les chants »** ouvre directement l'**éditeur de setlist** (structure, tonalité, notes, comme pour un culte). **Pas de carte « Musiques et danses » dans l'éditeur** : musiques et danses restent sur la ligne de l'ordre de passage. L'ordre des passages ne se change que dans l'ordre de passage. |
| 30 | **Qui saisit** : passage d'un groupe → son président, son VP et ses musiciens ; passage d'une classe d'EDD → les louangeurs d'après le **planning EDD** (présidence, suppléant, piano, cajon : un suppléant peut passer en présidence) ; passage « Culte Francophone » → TEAM LOUANGE ; la coordination partout. |
| 31 | Un chant hors du répertoire passe d'abord par **« Proposer un nouveau chant »** ; le passage peut pointer vers la proposition en attente, puis bascule tout seul vers le chant une fois au répertoire. |
| 32 | **Setlists** : nouvelles catégories **Noël** et **Pâques** dans le filtre des catégories (piste **A**, sous « Fêtes ») ; visibles de **tout connecté** ; ouvertes aussi depuis la page de la fête ; **coupées en ligne** (derrière `BACK_OFFICE`) jusqu'à la mise en ligne des Évènements. |
| 33 | **Couleurs** : Noël rouge ou vert (à proposer), Pâques au choix (à proposer) ; validation de Timothée (`serviceColors.ts` gelé). |
| 34 | **Liste « Qui »** (fixe pour ce lot) : Gp Paix, Gp Fidélité, Gp Bonté, Gp Amour, Gp Joie ; **Culte Francophone** (l'ancien « Franco ») ; EDD 小班, 中班, 大班, 高班. Retirés : 敬拜团, Jeunes, Chorale. |

## Ordre, branche, modèles

- **Planches avant le code** (faites : `maquettes/`), puis **une spec par lot** dans `docs/`, puis **le go de Timothée**.
- Ordre du code : lots **1 et 3 en parallèle** (indépendants), puis **2**, puis **4** (qui dépend des rôles du lot 2).
- **Tout se fait directement sur `ui/apple-design`** : aucune autre branche, pas de fusion. `git pull --rebase` avant
  chaque push ; jamais de push sur `main` (voir `CLAUDE.md`, « Sessions cloud »).
- Le travail se fait dans les **sessions cloud** (claude.ai/code, environnement « Timothée ») pour ne pas charger le Mac.
- Modèles : **Opus 5.5** (effort très élevé) pour le code des lots 1 et 2 et les corrections ; **Opus 5.5** (élevé)
  pour le code des lots 3 et 4 et la relecture bugs et sécurité ; **Sonnet 5.5** (élevé) pour la relecture de
  conformité à la spec ; **Sonnet 5.5** (moyen ou faible) pour lancer les suites et les tâches simples. **Pas de Haiku.**
- Droits en double : `src/lib/access.ts` **et** `firestore.rules` ; Timothée publie les règles lui-même.

## Réponses de Timothée aux questions des specs (08/10/2026, soir)

Après les cinq specs (`docs/spec-equipes-sans-poles.md`, `spec-organigrammes-groupes.md`, `spec-planning-gestes.md`,
`spec-chants-fetes.md`, `spec-partage-setlist.md`). Elles complètent les décisions 1 à 34 et l'emportent sur les
recommandations des specs.

| # | Question (spec) | Réponse |
|---|---|---|
| 35 | Une case de droit « Saisit les chants des fêtes » sur un rôle de groupe ? (lot 4, Q2) | **Oui** : le lot 2 l'ajoute aux droits d'un rôle, avec Remplir, Publier et Notifier. Saisissent les chants d'un passage de groupe : son président, ses VP, ses musiciens **et** les titulaires des rôles qui ont la case. |
| 36 | Plafond de VP (lot 2, Q11 ; décision 11) | **Un plafond réglable par un admin** (2 par défaut). |
| 37 | Une setlist par « Qui » ou par passage ? (lot 4, Q1) | **Par « Qui »** (décision 28) : « ce n'est pas des chants mais c'est les danses et les sketchs ». Un passage à plusieurs « Qui » est une danse ou un sketch : pas de chants, donc pas de setlist. |
| 38 | Couleurs d'Amour, de Joie, de Noël et de Pâques (lot 2, Q9) | **D'accord** : une seule planche avec les huit candidates ; Joie et Noël ne prennent pas ensemble le jade et le vert sapin ; Timothée choisit sur la planche. |
| 39 | Partage d'une setlist : voir seulement, ou aussi modifier ? (partage, Q1) | **Voir et modifier.** La liste des personnes ne change que par le propriétaire de la setlist et les admins (partage, Q10). |
| 40 | Perte des tâches de l'ancien pôle pour les membres de Comité Franco, Théologie, Décoration et Accueil J1 qui ne sont pas dans l'équipe cible (lot 1, Q1) | **Voulue** : le relevé les nomme, Timothée les ajoute à la main. |
| 41 | Un simple membre coche-t-il une tâche « pour toute l'équipe » ? (lot 1, Q2) | **Non** : il ne coche que celles qui lui sont assignées (décision 3) ; les référents et les admins cochent les autres. |
| 42 | Un membre de groupe sans rôle fait-il partie du public Louange ? (lot 1, Q3) | **Oui.** |
| 43 | Qui crée un évènement d'équipe qui n'est pas une réunion ? (lot 1, Q4) | **Les référents** de l'équipe (et les admins). |
| 44 | Le droit Équipes donne-t-il les organigrammes des groupes ? (lot 2, Q1) | **Non.** |
| 45 | Toutes les autres questions des cinq specs | **Recommandations acceptées** (« pour le reste je suis d'accord »), dont : le partage se code en parallèle des lots 1 et 3, avant le lot 4 (Opus 5.5, effort élevé). |
