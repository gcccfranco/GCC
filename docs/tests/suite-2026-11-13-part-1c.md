# Suite complète — morceau 4/16 (trente-deuxièmes 7 et 8)

- Commit testé : `125c92aa88d66a2e4203b2dcaaa7653ef311e6ba` (tête de `claude/corrections-design`)
- Mémoire avant chaque lancement : 15 Go au total, 13 Go libres, aucun `next` ni `chrome` actif.
- Serveur de test tombé : **non** (0 `ERR_CONNECTION_REFUSED`), `--workers=2` suffisait.

## Commandes
1. `npm test -- --shard=7/32 --workers=2 --trace off` : 711 tests, 632 passés, 73 sautés, 6 en échec, 9,6 min.
2. `npm test -- --shard=8/32 --workers=2 --trace off` : 711 tests, 635 passés, 48 sautés, 28 en échec, 16,8 min.
3. Rejeu unique des 6 fichiers en échec (`retouches-usage-t6`, `scene-saison`, `section-labels`, `setlist-history`, `setlist-regie`, `statistiques`), `--workers=2 --trace off`, cinq projets : 658 tests, 580 passés, 14 sautés, 64 en échec, 20,8 min.

## Total du morceau 4/16
1 422 tests : 1 267 passés, 121 sautés, **0 instable**, **34 en échec** (tous encore en échec au rejeu sur `ordinateur`).
Le rejeu a aussi échoué sur les autres appareils (64 échecs au total) : voir la colonne « Appareils ».

## Échecs (un par test ; première ligne d'erreur)
| Spec:ligne du test | Appareils au rejeu | Erreur |
|---|---|---|
| retouches-usage-t6.spec.ts:202 « un titre retrouvé dans l'index est un lien vers le chant… » | ordinateur, téléphone, tablette | `toHaveAttribute` : attendu `/songs/hosanna/?$`, reçu `/songs/hosanna/?passage="verse-2-1"` (ligne 210 environ) |
| scene-saison.spec.ts:623 « membres : la feuille ne propose que les groupes permis… » | ordinateur, téléphone, tablette | `toHaveLength(0)`, reçu 1 écriture `POST :commit/fake-1` (ligne ~633) |
| scene-saison.spec.ts:852 « un créneau qui commence pendant que la feuille est ouverte est refusé… » | ordinateur, téléphone, tablette | `toHaveLength(0)`, reçu 1 écriture `POST :commit/fake-1` (ligne ~860) |
| section-labels.spec.ts:11 « FR : Interlude… (Abba Père) » | ordinateur, téléphone, tablette | `toEqual` : libellés attendus ≠ reçus (6 lignes), `Timeout 5000ms` du prédicat |
| section-labels.spec.ts:19 « ZH : 间奏/Interlude… » | idem | `toEqual` : libellés attendus ≠ reçus (7 lignes) |
| section-labels.spec.ts:31 « FR : Final… (Christ est la lumière) » | idem | `toEqual` : libellés attendus ≠ reçus (5 lignes) |
| setlist-history.spec.ts:85, 99, 112, 125, 137, 155, 172, 237, 259, 272, 285, 309, 340, 360, 379, 392, 422, 433, 445, 480, 551, 567 (22 tests) | ordinateur seul | `locator.click` timeout 30 s sur le bouton `/Modifiée par Ruth K\./` : `setlist-history.spec.ts:81` |
| setlist-history.spec.ts:200, 495 | ordinateur, téléphone, tablette | `locator.click` timeout 30 s (:211 pour le 200, :517 pour le 495) |
| setlist-history.spec.ts:215 « vue partitions : adapter une ligne puis rétablir… » | ordinateur, téléphone, tablette | `toBeVisible` : bouton `/Modifiée par Ruth K\./` introuvable (:224) |
| setlist-regie.spec.ts:57 « Copier les paroles est une puce de 32 px… (dimanche-17) » | cinq appareils | `expect(m.h).toBe(32)`, reçu 44 : `setlist-regie.spec.ts:12` |
| setlist-regie.spec.ts:62 « bouton Copier les paroles : ordre joué… » | cinq appareils | `toBeVisible` : bouton « Copié » introuvable (~ligne 74) |
| statistiques.spec.ts:433 « les plus joués › rien n'est écrit dans la base » | cinq appareils | `toEqual([])`, reçu 7 écritures hors `notifPrefs/` : `statistiques.spec.ts:438` |

Remarques : les numéros « environ » viennent de l'extrait d'erreur ; le détail complet est dans les sorties du scratchpad de la session (non versionnées). Au premier passage les échecs ne portaient que sur `ordinateur` (le trente-deuxième ne tombait que sur ce projet pour ces tests) ; le rejeu complet des fichiers les a retrouvés sur d'autres appareils.

## Tests de frontière (demande du pilote, 13/11)
Fichiers entiers, `--workers=2 --trace off`, un seul projet chacun :
- `npm test -- tests/pupitre-partitions.spec.ts --project=ordinateur` : 43 tests, 15 passés, 28 sautés, 0 en échec (35 s).
- `npm test -- tests/acces-migration.spec.ts --project=tablette` : 19 tests, 19 passés, 0 sauté, 0 en échec (5 s).

Total : 62 tests, 34 passés, 28 sautés, 0 en échec.
