# Plan de réalisation : lot 4, nouveau look « GCC »

Spec : `docs/spec-look.md` (tout tranché le 15/09/2026 au soir ; **go non
donné**). Planche : https://claude.ai/artifact/3AXs4eYYCedEAYa8bgW8zL.
Tâches : `tasks/todo.md`. Le plan précédent (version perso, lot 3 ter) est
terminé et commité (ceb3a7b) ; ce fichier le remplace.

## Décisions d'architecture

- **Tokens d'abord, composants ensuite** : tout passe par `globals.css`
  (couleurs, échelle de texte, rayons, matériaux, voiles) et
  `tailwind.config.ts` ; aucune couleur en dur dans les composants hors zones
  gelées (`serviceColors.ts`, `--sec-*`, `--chord-color`, `--jianpu-color`).
- **Trois primitives nouvelles**, petites : `Group` / `GroupRow` (liste
  groupée), `Tile` (vignette teintée : couleur, grand, petit), `PageTitle`
  (grand titre replié au défilement, réutilise `useScrollDirection`).
- **Navigation** : `MobileTabBar` gagne un état visiteur ; `Navbar` perd ses
  liens secondaires au profit d'un menu compte (Radix `DropdownMenu` déjà
  présent) ; nouvelle page `/moi` (hub, groupes de liens, rien de nouveau
  fonctionnellement).
- **Zones gelées intouchées** : contenu des partitions (`SongView` rendu,
  `ChordLine`, `JianpuSheet`), PDF, mode louange hors chrome, `serviceColors`.
- **Mise en ligne d'un bloc** : tout reste sur `ui/apple-design` ; chaque
  tranche est validée en local par Timothée avant la suivante ; un commit par
  tranche, sur demande.

## Ordre des tranches

T0 (hors lot, avant) index A–Z → T1 fondations → T2 navigation → T3 louange →
T4 planning, Mes services, évènements → T5 pages secondaires et PWA → T6 passe
de cohérence et mise en ligne. Chaque tranche : test Playwright écrit d'abord
(trois appareils, 1 chant FR + 1 chant ZH quand un chant s'affiche, clair et
sombre), vu en échec puis vert ; `npx tsc --noEmit` ; `npm run lint` ;
captures regardées ; tests existants adaptés (libellés d'onglets, titres).

## Risques

| Risque | Impact | Parade |
| --- | --- | --- |
| Tests existants cassés par les nouveaux libellés (onglets, « GCC Louange », liens navbar) | Moyen | Adapter les tests dans la tranche qui change le libellé, jamais en bloc à la fin |
| Grand titre + navbar qui se cache au défilement : sauts ou double titre | Moyen | Prototype dans T2 sur les trois appareils avant de généraliser ; repli = titre fixe |
| Police système : rendu différent sur Android / Windows (Roboto, Segoe) | Faible | Captures Chromium ; l'échelle de texte est en `rem`, pas calée sur SF |
| Rouge accent proche du rouge 中文 et du destructif | Faible | Rouge réservé aux boutons pleins (Q3 a) ; vérifier la page d'un chant ZH en T3 |
| Mode louange : chrome aux tokens sans toucher au rendu | Moyen | Test existant du mode louange + capture avant/après ; aucune modification de `layoutSig` |
| Cache PWA : anciennes pages servies après mise en ligne | Faible | HTML network-first déjà en place ; bump de version du cache `sw.js` en T6 |
| Captures du guide périmées | Faible | Signalé ; refaites au lot 8 |

## Points d'étape (validation locale de Timothée)

Après T1 (l'app entière change de fond, de police et de boutons), après T2
(navigation), après T3 (louange, le cœur du dimanche), après T5, puis mise en
ligne après T6.
