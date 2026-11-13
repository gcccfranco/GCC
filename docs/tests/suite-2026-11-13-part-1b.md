# Suite complète — morceau 3/16 (2026-11-13)

- Commit testé : af3d7d3 (`claude/corrections-design`)
- Commande : `npm test -- --shard=3/16 --workers=2 --trace off`
- Mémoire libre au départ : 15 Go (`free -g`)
- Durée : 40,5 min
- Serveur tombé : non (0 `ERR_CONNECTION_REFUSED`)

| Total | Passés | Sautés | Instables | En échec |
|---|---|---|---|---|
| 1 421 | 1 298 | 121 | 1 | 1 |

Rejeu unique des deux échecs : les deux specs entières, sur les trois appareils (114 tests passés, 3 échecs).

## Instable (passe au rejeu)
- `tests/menu-primitive.spec.ts:42` — « Menu (jeu B) › panneau : rayon 12, lignes de 36 px… (T4) », [ordinateur] : `expect(...).toBe(36)`, reçu 35 (`tests/menu-primitive.spec.ts:54`).

## Vrai échec
- `tests/programme-scene.spec.ts:177` — « réserver : un chevauchement est refusé à la relecture, rien n'est écrit », [ordinateur] : `expect(received).toHaveLength(0)`, reçu 1 (`{"method":"POST","path":":commit/fake-1"}`), `tests/programme-scene.spec.ts:187`.
  - Échoue aussi au rejeu sur [telephone] et [tablette] (hors du morceau 3/16).
