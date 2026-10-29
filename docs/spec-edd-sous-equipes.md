# Spec — Sous-équipes de l'EDD

Demande de Timothée du 27/10/2026. Back-office seulement (`BACK_OFFICE`) : les équipes sont coupées en ligne.

## Constat

- Les cinq sous-colonnes de l'EDD (Professeurs louange · Professeurs cours · Pianistes · Guitaristes · Cajon,
  `docs/spec-acces-organigramme.md` l. 38) ne sont qu'un texte libre, `MembreEquipe.groupe`, recopié par l'import du
  Sheet. Cet import est retiré depuis le 06/10/2026 (`src/lib/equipes/organigramme.ts`, en-tête).
- Un membre ajouté depuis l'app arrive avec `groupe: ""` (`src/app/equipes/EquipesClient.tsx`, l. 601 et 609), et
  aucun écran ne permet de le ranger. La carte EDD regroupe par ce texte (`CarteEquipe`, l. 298-311).
- Louange a de vraies sous-équipes (`SOUS_EQUIPES`, `MembreEquipe.sousEquipes`, pastilles de `MembreOrganigramme`,
  colonnes de `colonnesLouange` / `CorpsLouange`).

## Décisions (27/10/2026)

| # | Décision |
|---|---|
| E1 | Une liste fixe de cinq sous-équipes EDD : `professeurs-louange`, `professeurs-cours`, `pianistes`, `guitaristes`, `cajon`, dans cet ordre. |
| E2 | Plusieurs sous-équipes par personne, comme Louange : la personne figure sous chacune des siennes. |
| E3 | **Pas de référent par sous-équipe** (piste B) : le seul référent reste le référent EDD (`referent`), qui range tout le monde. |
| E4 | **Aucun droit** : les sous-équipes EDD sont de l'affichage. Rien n'est recopié sur le profil (`rattachementDe` inchangé), `src/lib/access.ts` et `firestore.rules` inchangés. |

## Ce qui change

1. **Modèle** (`src/types/equipe.ts`) : `SOUS_EQUIPES_EDD` (as const) et `SousEquipeEdd` ; champ optionnel
   `MembreEquipe.sousEquipesEdd?: SousEquipeEdd[]`. Un champ distinct de `sousEquipes` : celui de Louange ouvre des
   droits (recopie sur le profil), celui-ci non.
2. **Anciens membres** : sans `sousEquipesEdd`, on lit l'ancien `groupe` (accents, casse, pluriel pliés : « Pianistes »
   → `pianistes`, « Cajon » → `cajon`…). Un texte qui ne correspond à rien → aucune sous-équipe. La forme nouvelle
   s'écrit à la prochaine modification de l'équipe ; pas de script de migration. Fonction pure à côté de
   `sousEquipesDe` (`src/lib/equipes/`), testée.
3. **Modifier une ligne de l'EDD** : un groupe « Sous-équipes » de pastilles à bascule, même forme que celui de
   Louange dans `MembreOrganigramme` (sans case « référent de la sous-équipe »). Réservé à qui peut déjà modifier
   l'EDD (`peutModifierEquipe`).
4. **Affichage** : la carte EDD (bandeau, page de l'équipe, back-office) range les membres par sous-équipe, dans
   l'ordre E1, le référent EDD d'abord ; une personne sans sous-équipe va sous un intertitre « Sans sous-équipe » en
   dernier (ou sans intertitre si personne n'en a).
5. **Libellés** FR et 中文 (`src/locales/fr.json`, `zh-CN.json`) : Professeurs louange 敬拜老师 · Professeurs cours
   课程老师 · Pianistes 钢琴手 · Guitaristes 吉他手 · Cajon 箱鼓 (中文 à faire valider par Timothée).
6. **Firestore** : rien à changer. `match /equipes/{id}` (`firestore.rules`, l. 212) ne restreint pas les clés d'un
   membre ; aucune publication des règles.

## Hors champ

Référents de sous-équipe, droits, planning EDD, setlists des trois classes (inchangés, C4).

## Tests

Playwright, trois appareils, noms fictifs inventés (session simulée, `tests/helpers/fakeSession.ts`) :
- un ancien membre avec `groupe: "Pianistes"` apparaît sous Pianistes ;
- le référent EDD coche Professeurs cours et Cajon pour une personne : elle apparaît sous les deux, l'écriture porte
  `sousEquipesEdd` ;
- un membre de l'EDD non référent ne voit pas les pastilles ;
- Louange inchangée (specs existantes de l'organigramme vertes).
Regard à l'œil sur les quatre dispositions (carte large de l'EDD dans le bandeau).
