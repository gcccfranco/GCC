# Banc « à rude épreuve »

Banc d'essai de l'audit du 24/10/2026 ([docs/audit-2026-10-24.md](../../docs/audit-2026-10-24.md)) : il met le site
sous contrainte, sur des **builds de production**, et écrit ses mesures dans `out/` (JSON lignes + captures).
Hors de `tests/` : `npm test` ne le lance pas. Firestore, Sheets et Auth sont simulés (`tests/helpers/fakeSession.ts`),
profils fictifs ; rien de réel n'est lu ni écrit.

| Spec | Ce qu'il mesure | Sortie |
| --- | --- | --- |
| `crawl` | 50 pages × 5 dispositions × clair / sombre / 中文 : débordements, textes coupés, cibles tactiles < 40 px, axe-core (WCAG 2.1 AA), octets par type, LCP, CLS, erreurs | `out/crawl.jsonl`, `out/shots/` |
| `chants` | les 382 chants (téléphone, tablette couchée) : erreurs, débordement, +1, +12, sélecteur de tonalité, scans | `out/chants.jsonl` |
| `fuzz` | URL et routes tordues, saisies de recherche hostiles, gestes à toute vitesse, mémoire sur 40 navigations, API sans droits | `out/fuzz-*.jsonl`, `out/gestes.jsonl`, `out/memoire.jsonl`, `out/api.jsonl` |
| `horsligne` | hors ligne **réel** (service worker actif sur `127.0.0.2`, que `sw.js` ne prend pas pour un serveur local) ; réseau d'église simulé (400 ms, 400 kb/s, processeur ×4) | `out/horsligne.jsonl`, `out/lent.jsonl` |
| `singe` | chaque bouton visible de 12 pages, touché un à un | `out/singe.jsonl` |
| `liens` | chaque lien interne affiché, demandé au serveur | `out/liens.jsonl` |

## Lancer

```bash
npm run build:index
NEXT_PUBLIC_BACK_OFFICE=0 NEXT_DIST_DIR=.next-prod-off npx next build   # le site en ligne
NEXT_PUBLIC_BACK_OFFICE=1 NEXT_DIST_DIR=.next-prod-on  npx next build   # le back-office
NEXT_DIST_DIR=.next-prod-off npx next start -p 3300 &
NEXT_DIST_DIR=.next-prod-on  npx next start -p 3301 &
npx playwright test -c scripts/rude-epreuve/rude-epreuve.config.ts                 # tout (≈ 1 h 30 à 3 workers)
npx playwright test -c scripts/rude-epreuve/rude-epreuve.config.ts horsligne       # un seul fichier
```

`STRESS_WORKERS=2` règle le parallélisme (3 au plus : au-delà la machine sature et les mesures de temps ne valent
plus rien). Ne pas lancer en même temps qu'une suite `npm test` sur les mêmes processeurs si l'on veut des temps
fiables. Remettre ensuite `public/*.json` et `next-env.d.ts` (`git checkout --`) : le build les réécrit.

Les mesures se lisent par script (une ligne JSON par page) : voir le § 11 du rapport pour ce qu'elles ont donné.
