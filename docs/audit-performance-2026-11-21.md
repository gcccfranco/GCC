# Audit de performance — 21/11/2026

Demande de Timothée (21/11, nuit) : « le site lag énormément, ça met du temps à activer le mode crayon, lancer le mode
louange. C'est un peu toutes les actions » ; « trouve moi les raisons » (son mini-PC a 8 cœurs et 32 Go) ; « pas
seulement les mêmes actions mais toutes les actions possibles sur le site, pour voir comment on peut optimiser tout ça ».

Ce document : les mesures, les causes, puis les corrections proposées, classées. **Aucun code du site n'est changé
ici** ; chaque correction se code sur un go de Timothée.

## 1. Premières mesures (session d'origine, 21/11)

Méthode : Playwright, Chromium sans écran, conteneur de 4 cœurs ; setlist simulée de quatre chants (deux FR, deux ZH),
page `/setlists/{id}` ; temps entre le clic et l'écran prêt, et part de « tâches longues » (le navigateur ne répond
pas). Même script en `next dev` et sur une version construite (`next build` + `next start`). Script gardé dans
`scripts/perf/mesure-actions.spec.ts.txt` (à copier dans `tests/` pour le lancer ; `MESURE_BASE`, `MESURE_LARGEUR`).

| Action | construit, 1 280 px | construit, 1 512 px | dev, 1 280 px | dev, 1 512 px |
|---|---|---|---|---|
| Activer le Crayon | 0,13 s | 0,65 s | 0,1 à 0,5 s | 0,1 à 1,1 s |
| Quitter le Crayon (« Terminé ») | 0,15 s | **2,0 s** | 0,1 à 0,2 s | 0,1 à 2,4 s |
| Lancer le mode louange | 0,6 s | **2,6 à 3,0 s** | 1,4 à 1,5 s | 3,3 s |
| Page suivante (mode louange) | 0,15 s | 0,15 s | 0,33 s | 0,5 s |
| Quitter le mode louange | 0,08 s | 0,08 s | 0,1 s | 0,1 s |

Ce que ça dit :
- **La largeur de l'écran est la première cause.** Sur la version construite, la même action coûte 4 à 13 fois plus
  à 1 512 px qu'à 1 280 px, et presque tout ce temps est du calcul dans le navigateur (tâches longues). C'est le
  navigateur de l'appareil qui travaille : la puissance du mini-PC qui sert le site n'y change rien.
- **Le mode développement ajoute sa part** (≈ ×2,4 au lancement du mode louange à 1 280 px), mais n'explique pas
  l'écart de largeur.
- Piste déjà ouverte : R6 (`docs/spec-retouches-2026-11-21.md`), la mesure des lignes d'accords (`ChordLine`). À
  vérifier : pourquoi 1 512 px et pas 1 280 px (seuil de disposition), et si « Terminé » du Crayon a la même cause.

## 2. Toutes les actions (session d'audit, 21/11, nuit)

**Base mesurée** : commit `d383521` (avant R6), version construite (`NEXT_DIST_DIR=.next-prod next build`, puis
`next start -p 3300`), Chromium du conteneur (4 cœurs), session simulée (`tests/helpers/fakeSession.ts`, noms
fictifs). R6 a été poussée pendant l'audit (`fdce7d1`) : l'avant/après des actions qu'elle touche est au § 2.4.

**Méthode** (scripts dans `scripts/perf/`) : chaque action part du geste réel (premier `pointerdown` ou `keydown`)
et finit quand le DOM et le processeur se taisent (dernière mutation du DOM ou dernière tâche longue, suivie de
500 ms de calme). Entre parenthèses : la part en **tâches longues** (le navigateur ne répond plus) ; c'est le
« lag » ressenti. Une ouverture de page part de la navigation. Firestore : requêtes comptées dans la base simulée.
Une valeur de quelques dizaines de ms est sous le seuil de perception ; au-dessus de 0,3 s le geste « traîne ».

État : 1 280 et 1 512 px mesurés ; 810 et 390 px (processeur ×4) en cours.

### 2.1 Ce qui est lent (version construite, avant R6)

| Action | 1 280 px | 1 512 px | Firestore |
|---|---|---|---|
| Setlist : ouvrir la page (`/setlists/{id}`, 4 chants) | 1,39 s (0,45) | **4,88 s (3,90)** | 44 |
| Setlist : ouvrir « Affichage » | 0,34 s | **1,47 s (1,32)** | 0 |
| Setlist : fermer « Affichage » | 0,36 s | **4,86 s (4,74)** | 0 |
| Setlist : activer le Crayon | 0,10 s | **1,72 s (1,72)** | 0 |
| Setlist : quitter le Crayon (« Terminé ») | 0,09 s | **3,18 s (3,18)** | 0 |
| Mode louange : lancer | 0,88 à 1,12 s (0,65 à 0,92) | **4,5 à 5,0 s (4,3 à 4,8)** | 3 |
| Mode louange : Affichage › « Tout le chant » | 0,57 s (0,39) | **4,32 s (4,10)** | 3 |
| Mode louange : ouvrir le menu Setlist / Affichage | 0,41 s | 0,16 à 0,18 s | 2 |
| Mode louange : disposition « Partition » | 0,46 s (0,39) | 0,29 s | 2 |
| Mode louange : changer de chant (menu Setlist) | 0,23 s | 0,25 s | 1 |
| Ouvrir une page quelconque (chargement complet) | 0,4 à 1,5 s | 0,5 à 1,2 s | **25 à 107** |
| Chants : toucher un chant dans la liste | 0,59 s | 0,84 s | 19 |
| Navigation : onglet Setlists | 0,50 s | 0,65 s | 32 |
| Langue : passer en chinois | 0,49 s | 0,75 s | 17 |
| Chants : recherche (5 lettres tapées) | 0,40 s | 0,38 s | 0 |

### 2.2 Ce qui est rapide (sous 0,15 s à 1 280 et 1 512 px)

Page d'un chant, FR (`abba-pere`, `jireh`) comme ZH (`为我而来`) : Tonalité, transposition, chacun des réglages
d'« Affichage » (Lettres/Chiffres, Tout le chant/Une fois chacune/Plan, dispositions, couleurs, Pinyin, 简谱/Paroles),
Crayon, accord touché : tous entre 0 et 0,12 s, **sans écart de largeur**. Liste des chants : filtres, index
alphabétique, effacer. Setlist : sommaire, réglages d'Affichage un à un (0,02 à 0,14 s), accord touché. Mode louange :
page suivante (0,02 s ; 0,2 s quand elle change de chant), menus Repères et Outils, annotation (0,1 s), quitter
(0,1 s). Thème (0,06 à 0,35 s). Onglets Planning, Évènements, Moi, Chants (0,07 à 0,26 s).

Constat central : **la lenteur n'est pas « toutes les actions »**. Elle se concentre sur la page setlist et le mode
louange, à partir d'une certaine largeur d'écran, et sur le chargement de chaque page (requêtes à la base, § 3.2).
Les gestes qui recomposent toutes les lignes d'accords d'une setlist (ouvrir, fermer Affichage, Crayon, lancer le
mode louange, changer l'ordre des sections) coûtent 4 à 30 fois plus à 1 512 px qu'à 1 280 px.

