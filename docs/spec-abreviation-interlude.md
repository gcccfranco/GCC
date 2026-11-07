# Spec : pastilles « Int » (interlude) et « Inst » (instrumental)

Signalement d'un membre du 06/11/2026, tranché par Timothée le 07/11/2026 (« Int + Inst ») ; go le même jour
(« écris la spec et code-la directement »). Un lot : **AB-I**.

## Le signalement

> L'ajout d'un « Interlude » génère une pastille siglée « Pm ». Or « Pm » désigne conventionnellement un « Pont
> Musical » (le simple « P » étant déjà alloué au « Pont »), ce qui crée une équivoque fâcheuse pour la lecture.
> […] remplacer « Interlude » par « Tag » (pastille « T »), ou à défaut lui assigner une abréviation idoine
> (telle que « Int »). (06/11/2026)

## Ce que le code montre (07/11/2026)

- **Une seule table** : `src/lib/chordpro/abbreviations.ts`, `interlude: "Pm"` et `instrumental: "Pm"`. Tout passe
  par `abbreviateSection` : bandeaux du chant et de la vue partitions, mode louange, vue liste, sommaire, éditeur de
  setlist, historique, PDF compact. Aucune légende du site n'explique « Pm » : la pastille dit « Pm », le chant dit
  « Interlude ».
- **Choix d'origine** : « Pm = pont musical », tranché le 14/09/2026 avec le lot 3 « coup d'œil »
  (`feuille-de-route.md`, § 7, constat 16). La demande de départ de Christelle écrivait « Inst » à part.
- **Tag ≠ Interlude dans le corpus** : les 16 sections « Pm » sont des interludes et instrumentaux (11 n'ont que
  des accords ; les partitions écrivent « Interlude », 间奏) ; les 7 « Tag » sont de courtes reprises chantées
  (1 à 4 lignes), avec leur pastille « Tag » et leur couleur. Renommer Interlude en Tag les confondrait : écarté.
- **« Pm » est déjà enregistré à deux endroits** (relu par un relecteur, 07/11/2026) :
  1. le nom d'une « Dernière phrase » tirée d'un interlude, écrit dans le chant adapté (`contentOverride`) :
     « Dernière phrase – Pm » (`LastPhraseSheet.tsx:70`, `lastPhrase.ts:33`), relu par `dpOrigin`
     (`src/lib/setlist/dp.ts`, table `ORIGIN_OF_ABBR`) pour le nom long et la numérotation ;
  2. les libellés de l'historique des setlists (`setlists/{id}/history`, `from` / `to`), figés à l'écriture et
     relus par `SetlistHistory.tsx` pour retrouver la section (bulle au survol de la pastille).

## Décision (Timothée, 07/11/2026)

- **Interlude → « Int »**, **Instrumental → « Inst »**. Le nom affiché ne change pas (« Interlude »,
  « Instrumental », 间奏, 器乐). Les abréviations restent les mêmes en 中文, comme les autres.
- Tag garde « Tag » ; Pont garde « P ».

## Ce qui est construit (lot AB-I)

1. `abbreviations.ts` : `interlude: "Int"`, `instrumental: "Inst"` (commentaire mis à jour).
2. `dp.ts`, `ORIGIN_OF_ABBR` : `int: "interlude"`, `inst: "instrumental"` ; **`pm: "interlude"` reste** pour les
   « Dernière phrase – Pm » déjà enregistrées (aucune réécriture des chants adaptés).
3. `SetlistHistory.tsx` : une pastille d'une ancienne entrée (« Pm », « 2 Pm ») retrouve sa section interlude ou
   instrumentale, donc sa bulle. Elle **garde le texte « Pm »** : l'historique montre ce qui a été écrit à l'époque.
4. Tests : les attentes « Pm » deviennent « Int » ; `rappel-dp` lit « Int », « Inst » et l'ancien « Pm » ;
   `coup-d-oeil` vérifie « Inst » ; `setlist-history` vérifie qu'une ancienne pastille « Pm » garde sa bulle.
5. Docs : table de `spec-coup-d-oeil.md` et constat 16 de la feuille de route revus (barré + date, comme ailleurs).

## Hors lot

- `TYPE_OF_ABBREVIATION` (`SetlistHistory.tsx`) ignore « Pm » et « Tag » : sans effet visible, car
  `SECTION_PALETTE_KEY` n'a pas de couleur interlude, instrumental ni tag (pastille grise dans l'historique, comme
  avant). Non touché. Les pastilles du bandeau, elles, ont leurs couleurs `--sec-interlude` et `--sec-tag`.
- Fusion de deux retouches à moins de 15 min de part et d'autre de la mise en ligne : l'avant écrit « Pm », l'après
  « Int », l'interlude paraît retiré puis ajouté. Fenêtre d'un quart d'heure, une seule fois : accepté.
- Les specs anciennes qui citent « Pm » (`spec-jianpu-integration.md`, `chantier-jianpu/maquettes.md`,
  `spec-historique-avant-apres.md`) racontent leur lot ; elles ne sont pas réécrites.

## Vérification

- `npx tsc --noEmit`, `npm run lint`.
- Playwright sur les trois appareils : `coup-d-oeil`, `rappel-dp`, `setlist-history`, `setlist-version`,
  `louange-sections-uniques`, `setlist-editeur-piste2`, `rappel-ordre-joue`.
- À l'œil : bandeau d'Abba Père (« Int ») et d'Au nom de Jésus (« Int », « Inst ») sur les quatre dispositions ;
  un chant 中文 avec 间奏 (« Int »).

## État

Codé le 07/11/2026 sur `claude/cool-allen-pkzti6`. Pas en ligne : `main` attend l'ordre de Timothée.
