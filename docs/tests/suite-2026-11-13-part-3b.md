# Suite complète, morceau 11/16 (= 21/32 + 22/32) — 13/11/2026

- Commit testé : 40c4008 (tête de `claude/corrections-design`)
- Commandes : `npm test -- --shard=21/32 --workers=2 --trace off`, puis `--shard=22/32` (un serveur neuf chacun) ; rejeu : `npm test -- <8 fichiers> --workers=2 --trace off`
- Mémoire au départ : 13 Go libres. Aucune connexion refusée (0 `ERR_CONNECTION_REFUSED`). Aucun nom réel de membre.

| Morceau | Total | Passés | Sautés | Instables | En échec | Durée |
|---|---|---|---|---|---|---|
| 21/32 | 710 | 629 | 81 | 0 | 0 | 17,2 min |
| 22/32 | 710 | 583 | 125 | 0 | 2 | 11,9 min |
| **11/16** | **1 420** | **1 212** | **206** | **0** | **2** | ≈ 29 min |

(Tests exécutés surtout sur le projet tablette dans ces tranches.)

## Échecs de 22/32 (tous deux projet tablette) — confirmés au rejeu (échec aussi sur d'autres appareils)
1. `tests/programme-scene.spec.ts:177` — « réserver : un chevauchement est refusé à la relecture, rien n'est écrit » — `expect(received).toHaveLength(expected)` — `tests/programme-scene.spec.ts:187`. Au rejeu : échoue aussi sur ordinateur, téléphone, tablette.
2. `tests/rappel-dp.spec.ts:243` — « chant chinois avec un Dp : « Dp » aux couleurs du 副歌 (ZH) » — `expect(received).toBe(expected)` — `tests/rappel-dp.spec.ts:256`. Au rejeu : échoue sur tablette.

Le blocage massif de l'ancien 11/16 (délais de 30 s, zone « mode louange ») n'a pas reparu : 0 échec dans `louange-*`, `ma-partition-*`.

## Rejeu des 8 échecs de 9/16 et 10/16 : **7 restent, 1 instable**
Rejeu de 8 fichiers entiers (855 tests, 20,3 min) : 734 passés, 97 sautés, 24 en échec.

| Échec de 9-10/16 (tablette) | Verdict | Ligne |
|---|---|---|
| `agencement-groupes:248` (clair) « (c) texte à moins de 12 px du bord d'un groupe » | reste (aussi ordinateur, tablette-paysage, ordinateur-1440) | `agencement-groupes.spec.ts:256` |
| `agencement-groupes:248` (sombre) idem | reste (mêmes appareils) | `agencement-groupes.spec.ts:256` |
| `agencement-v18-planning:264` « ligne basse » | reste (aussi tablette-paysage) | `agencement-v18-planning.spec.ts:275` |
| `equipes-agencement:83` « « Orga » entier » | reste (aussi téléphone, tablette-paysage) | `equipes-agencement.spec.ts:97` |
| `harmonie-jianpu:110` délai 30 s (`locator.click`) | reste (aussi ordinateur, téléphone) | `harmonie-jianpu.spec.ts:125` |
| `look-louange:320` (ZH) « Lettres » | reste | `look-louange.spec.ts:333` |
| `look-louange:320` (FR) | **instable** (passe au rejeu) | — |
| `louange-bandeau-lecture:47` `toBeVisible` | reste (aussi ordinateur, téléphone) | `louange-bandeau-lecture.spec.ts:129` |

Autres échecs apparus au rejeu (hors liste de départ, par extension aux autres appareils) : ceux notés ci-dessus ; aucun nouveau fichier.
