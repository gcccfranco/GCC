# Travail en cours, mis en pause (11/10/2026)

Timothée a mis le chantier en pause le 11/10/2026. Une tranche inachevée est gardée ici en patch : elle n'est pas
appliquée, le code de la branche n'en dépend pas.

- `V19EQUIPES-EQ-C.patch` : lot 1, tranche EQ-C (tâches par équipe), à mi-chemin : tests de la tranche écrits
  (`tests/equipes-taches.spec.ts`), code en cours, specs voisines pas encore remises au vert. Fait sur `3dae7d9e`
  (après EQ-B) ; s'applique aussi sur `0e6a837a`.

À la reprise : `git apply docs/chantier-equipes-groupes/en-cours/V19EQUIPES-EQ-C.patch` (ajouter `--3way` si la branche a
bougé), finir la tranche, puis retirer ce dossier dans le commit de la tranche.

État du chantier à la pause :
- lot 1 : EQ-A (`06d0fad4`) et EQ-B (`3dae7d9e`) faites ; EQ-C en patch ici ; EQ-D, EQ-E, EQ-F à faire, puis relecture
  et passage complet ;
- partage d'une setlist : PS-A faite (`0e6a837a`, session cloud) ; la suite à faire ;
- lot 3 : commencé dans une session cloud (voir ses commits `V19PLANNING`, s'il y en a) ;
- lots 2 puis 4 : à faire après le lot 1.
