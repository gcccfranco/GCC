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

## 2. Toutes les actions (à remplir par la session d'audit)
