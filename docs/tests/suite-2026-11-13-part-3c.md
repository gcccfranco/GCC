# Suite complète — morceau 12/16 (trente-deuxièmes 23 et 24), 13/11/2026

Commit testé : `40c4008` (tête de `claude/corrections-design`). Conteneur 16 Go, `free -g` avant chaque lancement : 13 Go libres (23), 10 Go libres (24).

## Commandes
- `npm test -- --shard=23/32 --workers=2 --trace off` : 10 min 22 s
- `npm test -- --shard=24/32 --workers=2 --trace off` : 14 min 26 s
- Rejeu unique des 6 fichiers en échec, `--workers=2 --trace off`, **tous appareils** (le rejeu lance les fichiers entiers, pas seulement les tests en échec) : 21 min ; un premier essai avait été coupé par mon propre délai de 580 s, relancé en entier.

## Totaux (23 + 24)
| | 23/32 | 24/32 | Somme |
|---|---|---|---|
| Total | 710 | 710 | 1 420 |
| Passés | 621 | 682 | 1 303 |
| Sautés | 83 | 22 | 105 |
| Instables | 0 | 0 | 0 |
| En échec | 6 | 6 | **12** |

Serveur tombé : **non** (0 `ERR_CONNECTION_REFUSED`).

Les 12 échecs, tous sur `[tablette]` dans les parts, ont **échoué de nouveau au rejeu** : aucun n'est instable. Le rejeu des fichiers entiers montre en plus les mêmes tests en échec sur d'autres appareils (64 échecs au total, 580 passés, 14 sautés ; liste ci-dessous) : les échecs ne tiennent donc pas à la tablette.

## Vrais échecs (part → test, appareil, erreur, `fichier:ligne`)
| Spec | Titre | Appareils en échec au rejeu | Première ligne de l'erreur | `fichier:ligne` |
|---|---|---|---|---|
| retouches-usage-t6 | « Où l'entendre » : un titre retrouvé dans l'index est un lien vers le chant | ordinateur, téléphone, tablette | `toHaveAttribute` : href reçu `/songs/hosanna/?passage=%22verse-2-1%22`, attendu `/songs/hosanna/?$` | `tests/retouches-usage-t6.spec.ts:212` |
| scene-saison | membres : la feuille ne propose que les groupes permis ; rien ne s'écrit | ordinateur, téléphone, tablette | `toHaveLength(0)` sur les POST de la base simulée | `tests/scene-saison.spec.ts:634` |
| scene-saison | membres : créneau commencé pendant que la feuille est ouverte, refusé | ordinateur, téléphone, tablette | `toHaveLength(0)` sur les POST de la base simulée | `tests/scene-saison.spec.ts:861` |
| section-labels | FR : « Interlude » sous une directive intro (Abba Père) | ordinateur, téléphone, tablette | `expect.poll` : libellés de sections différents de `["INTRO (X2)", "COUPLET 1", "REFRAIN", "INTERLUDE", "COUPLET 2", "PONT"]` (délai 5 s) | `tests/section-labels.spec.ts:13` |
| section-labels | ZH : « 间奏/Interlude » sous une directive intro | ordinateur, téléphone, tablette | idem, attendu `["INTRO", "COUPLET 1", …, "INTERLUDE"]` | `tests/section-labels.spec.ts:21` |
| section-labels | FR : « Final » sous une directive outro | ordinateur, téléphone, tablette | idem, attendu `["COUPLET 1", "REFRAIN", "COUPLET 2", "PONT", "FINAL"]` | `tests/section-labels.spec.ts:33` |
| setlist-history | rétablir l'original d'un chant adapté (vue partitions) | ordinateur, téléphone, tablette | `click` : bouton « Modifiée par … » introuvable (délai 30 s) | `tests/setlist-history.spec.ts:211` |
| setlist-history | vue partitions : adapter une ligne puis rétablir | ordinateur, téléphone, tablette | `toBeVisible` du bouton « Modifiée par … » | `tests/setlist-history.spec.ts:224` |
| setlist-history | H1 — mode Adapter, copie d'une section répétée | ordinateur, téléphone, tablette | `click` : bouton « Modifiée par … » introuvable (délai 30 s) | `tests/setlist-history.spec.ts:517` |
| setlist-regie | « Copier les paroles » est une puce de 32 px | ordinateur, téléphone, tablette, tablette-paysage, ordinateur-1440 | `expect(m.h).toBe(32)` | `tests/setlist-regie.spec.ts:59` |
| setlist-regie | bouton « Copier les paroles » : ordre joué, reprises, ligne vide | les cinq appareils | `toBeVisible` du bouton « Copié » | `tests/setlist-regie.spec.ts:76` |
| statistiques | S3 : les plus joués › rien n'est écrit dans la base | les cinq appareils | `toEqual([])` sur les écritures hors `notifPrefs/` | `tests/statistiques.spec.ts:438` |

## À noter (hors parts 23 et 24, vu seulement au rejeu)
`tests/setlist-history.spec.ts` échoue aussi sur **ordinateur** pour 28 autres tests (lignes 85 à 567 ; 26 sur `locator.click` en délai de 30 s, 1 sur `toBeVisible`) : même symptôme que les trois échecs ci-dessus, probablement la même cause (bouton « Modifiée par … » absent de la feuille d'historique). Ces tests n'étaient pas dans ces deux trente-deuxièmes ; à confirmer par leur propre part.

Rien n'a été corrigé ni modifié (code, tests) ; seul ce fichier est ajouté.
