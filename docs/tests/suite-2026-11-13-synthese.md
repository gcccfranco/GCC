# Suite complète du 13/11/2026 — synthèse (pilote)

Huit bilans (`suite-2026-11-13-part-*.md`), tous sur serveur sain. Rien n'a été corrigé.

| Total | Passés | Sautés | Instables (passent au rejeu) | En échec |
|---|---|---|---|---|
| 22 735 | 20 285 | 2 255 | 101 | 94 |

Les 5 tests de frontière (`pupitre-partitions` ordinateur, `acces-migration` tablette) ont tourné : 0 échec.
Les 94 échecs sont **31 tests distincts dans 16 specs**, comptés une fois par appareil. Aucune correction sans go.

## Échecs par page (cause probable entre parenthèses : hypothèse, pas un diagnostic)
1. **Historique d'une setlist** — `setlist-history.spec.ts` (25 tests sur ordinateur, dont :200, :215, :495 aussi sur
   téléphone et tablette) et `harmonie-jianpu.spec.ts:110` (trois appareils) : bouton « Modifiée par … » introuvable.
   (Une seule cause : ce bouton a changé ou a disparu.)
2. **Libellés de sections** — `section-labels.spec.ts:11, :19, :31` (trois appareils) : liste de sections différente.
3. **Régie, « Copier les paroles »** — `setlist-regie.spec.ts:57` (puce de 44 px au lieu de 32) et `:62` (bouton
   « Copié » introuvable), cinq appareils.
4. **Statistiques** — `statistiques.spec.ts:433` (cinq appareils) : 7 écritures dans la base là où aucune n'est
   attendue. (Sans doute le comptage d'usage T4.)
5. **Programme de scène** — `programme-scene.spec.ts:177`, `scene-saison.spec.ts:623, :852` (trois appareils) : une
   écriture part alors que la réservation devait être refusée. **À regarder en premier : possible vrai défaut.**
6. **« Où l'entendre »** — `retouches-usage-t6.spec.ts:202` (trois appareils) : le lien porte `?passage=…`.
   (Le test date d'avant les passages.)
7. **Setlists, groupes** — `agencement-groupes.spec.ts:248` clair et sombre (tablette, tablette paysage, ordinateur,
   1 440 px) : texte à moins de 12 px du bord d'un groupe.
8. **Chants, deux volets** — `chants-deux-volets.spec.ts:495` (ordinateur, tablette paysage, 1 440 px) : les
   prochaines setlists sont lues deux fois au lieu d'une.
9. **Mode louange** — `louange-bandeau-lecture.spec.ts:47` (trois appareils, bouton « Quitter » invisible) ;
   `look-louange.spec.ts:320` ZH (tablette, commande « Lettres » sous 36 px) ; `louange-sections-uniques.spec.ts:769`
   (téléphone, trait non relu sur la page 2).
10. **Équipes** — `equipes-agencement.spec.ts:83` (téléphone, tablette, tablette paysage) : « Orga » coupé.
11. **Planning du back-office** — `agencement-v18-planning.spec.ts:264` (tablette, tablette paysage) : ligne de 83 px
    au lieu de 70 au plus.
12. **Isolés** — `chants-fetes-setlist.spec.ts:184` (ordinateur) ; `rappel-dp.spec.ts:243` (tablette, couleur du Dp
    en chinois) ; `page-chant-a6.spec.ts:110` (téléphone, libellé « Louange » masqué).

## Instables (101, dont 88 sur téléphone dans le morceau 10/32)
Listés dans chaque bilan ; à revoir seulement s'ils reviennent.

## Méthode mesurée (à reprendre telle quelle)
Trente-deux morceaux (`--shard=k/32 --workers=2 --trace off`), un serveur neuf par commande, une commande à la fois par
conteneur ; un quart ou un seizième d'une traite fait tomber `next dev` par manque de mémoire (16 Go). Plus de 20
`ERR_CONNECTION_REFUSED` : arrêter, ne rien rejouer, relancer le morceau. Rejeu unique des fichiers en échec. La
session ne rend pas la main tant que les tests tournent. Compter ≈ 20 min par trente-deuxième, plus le rejeu.

## Corrections (go de Timothée, 13/11/2026)
Une ligne par chantier : échec, qui avait tort (site ou test), correction, commit, specs rejouées et durée.
