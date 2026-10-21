# Spec : idées d'harmonie regroupées — une carte par changement, pas par section

Demande de Timothée du 21/10/2026 ; cadrée le jour même par un entretien (skill *grilling*), Q1 à Q3, Q8 et Q13
tranchées sur les recommandations. Lot **IR** (un seul lot, sans nouvel écran : pas de planche). Suite de
`spec-harmonie.md` (lot 9) ; le dictionnaire d'accords est l'autre moitié de la demande (`spec-dictionnaire-accords.md`).

**État : spec écrite le 21/10/2026, Q-IR1 à trancher, code sur go.**

## Mots de Timothée

> « J'aimerais que tu modifies un peu le fonctionnement des idées d'harmonie qu'il y a sur le site, parce que quand on
> clique dessus pour un chant il y a beaucoup de choses qui se répètent, parce que des fois les progressions d'accords
> entre les couplets peuvent être les mêmes. » (21/10/2026)

## Ce que le code montre (21/10/2026)

- `src/lib/harmonie/suggestions.ts:82` `suggestionsPour` : **une suggestion par règle et par section ChordPro**
  (`parSection`, indexé par `sectionUid`, l. 102-117) ; identifiant `<fiche>__<uid>` (l. 108), aussi clé des refus.
- Le parseur (`src/lib/chordpro/parser.ts:316-325`) donne un `uid` par **occurrence** de section : deux couplets aux
  mêmes accords = deux sections = deux cartes identiques.
- `cinqPremieres` (l. 132) dédoublonne déjà par fiche les cinq premières : **les doublons arrivent après « Voir plus »**.
- Exemples mesurés : *Au nom de Jésus* (D, 42 suggestions), la fiche C6 sort **7 fois** (Couplet 1, Interlude,
  Couplet 2, Instrumental, Refrain 1, Refrain 2, Pont) ; *永活盼望* (D, 58 suggestions), C4 dans 主歌 1, 2, 3 et 4.
- `src/components/harmonie/IdeesSheet.tsx` : la carte montre le nom de la section, « · N endroits », l'aperçu
  `avant → après` (`apercuDuChangement`, calculé sur `endroits[0]`) et les degrés ; « Montrer » ne va qu'à
  `endroits[0]` (l. 79-80 et le bouton) ; « Essayer dans Ma version » (setlist, `SetlistDetailClient.tsx:2035`)
  n'applique le changement qu'à `endroits[0]`.

## Décisions (tranchées le 21/10/2026)

| # | Décision |
| --- | --- |
| Q1 | **Une carte = une fiche × un même changement d'accords.** Toutes les sections où la fiche donne le **même aperçu** `avant → après` (mêmes étiquettes, dans la tonalité jouée) fusionnent en une carte. Un aperçu différent (`G → Em7` aux couplets, `A → F#m7` au refrain) reste une autre carte. Les idées sans changement d'accords (tag, intro absente : `regle.genre`) ne bougent pas. |
| Q2 | **Les endroits s'écrivent sous le titre**, dans l'ordre du chant : « Couplets 1 et 2 · Refrain » (noms des sections tels qu'affichés ; deux sections de même type et numéro consécutifs se contractent, « Couplets 1 et 2 », « Couplets 1 à 3 » ; sinon liste séparée par « · »). Le compteur « · N endroits » disparaît quand la carte couvre plusieurs sections ; il reste pour une section seule à plusieurs endroits. |
| Q3 | **« Montrer » passe d'un endroit au suivant** : le libellé devient « Montrer 1/3 », puis 2/3… ; après le dernier, retour au premier. Une carte à un seul endroit garde « Montrer ». Chaque appui ferme la feuille et surligne l'endroit comme aujourd'hui ; à la réouverture de la feuille, le compteur de la carte reprend où il en était (état local, perdu au rechargement : pas d'enregistrement). |
| Q8 | **« Ne marche pas sur ce chant » écarte la carte entière** : un refus est écrit **par section** couverte, avec l'identifiant actuel `<fiche>__<uid>` — aucun changement de format, les refus déjà enregistrés restent valides. Un refus ancien sur une seule section retire cette section de sa carte, pas les autres. « Remettre » sur une carte écartée remet toutes ses sections (la liste « écartées » montre une ligne par carte, pas par section). |
| Q13 | **Toucher un accord proposé** (`Em7` dans `G → Em7`) ouvrira son doigté : **pas dans ce lot**, il arrive avec le dictionnaire (`spec-dictionnaire-accords.md`, DA-3). |
| — | Inchangé : 5 cartes puis « Voir plus », choisies par sûreté puis niveau, affichées dans l'ordre du chant (le dédoublonnage par fiche de `cinqPremieres` reste) ; la carte se place à son **premier** endroit. |

## À trancher avant le go

**Q-IR1 — « Essayer dans Ma version » sur une carte regroupée.** Aujourd'hui l'essai ne touche que le premier endroit.
- **A.** L'essai applique le changement à **tous les endroits** de la carte (« faire ce changement dans les couplets »).
- **B.** Comme aujourd'hui : le premier endroit seulement.

➡️ **A** : la carte dit maintenant « Couplets 1 et 2 » ; n'en changer qu'un surprendrait. Ma version garde
l'historique et se défait comme avant. Pour un chant affiché en scan 简谱, le message « à reporter à la main »
liste toutes les sections.

## Tranches

**IR-A** (seule tranche) :
1. `suggestions.ts` : après le regroupement par section, **fusionner** les suggestions d'une même fiche dont
   `apercuDuChangement` (dans la tonalité jouée) a le même `avant` et le même `apres`. La suggestion fusionnée porte
   `sections: { uid, nom, rang }[]`, `endroits` (tous, dans l'ordre) et `ids` (les `<fiche>__<uid>` couverts) ; son
   `id` d'affichage = le premier. Le filtre des refus s'applique **par section avant la fusion**.
   `apercuDuChangement` a besoin de la tonalité : la fusion se fait dans une fonction pure à part
   (`regrouper(suggestions, tonalite)`) appelée par `IdeesSheet`, testable seule.
2. `IdeesSheet.tsx` : ligne des sections (Q2), « Montrer i/n » (Q3), « Ne marche pas » écrit un refus par `ids`
   (Q8), liste « écartées » regroupée par carte.
3. `SetlistDetailClient.tsx` (`onEssayer`) : selon Q-IR1.
4. Libellés FR et 中文 (`harmonie.*`) : « Montrer {{i}}/{{n}} », contraction « {{type}} {{a}} et {{b}} »,
   « {{type}} {{a}} à {{b}} » ; en 中文, « 主歌 1、2 », « 主歌 1–3 ».
5. `docs/spec-harmonie.md` : renvoi vers cette spec sous « Suggestions par chant ».

## Vérification

- Test unitaire Playwright (`tests/harmonie-suggestions.spec.ts`, à compléter) : sur *Au nom de Jésus* en D, C6 donne
  **une** carte par aperçu distinct (au lieu de 7) ; sur *永活盼望*, C4 regroupe 主歌 1 à 4 si l'aperçu est le même ;
  un refus ancien `<fiche>__<uid>` d'une seule section retire bien cette section seule.
- Playwright, trois appareils : « Montrer 1/2 » puis « 2/2 » surligne deux sections différentes ; « Ne marche pas »
  retire la carte et écrit autant de refus que de sections (lire `db.writes` après un signe à l'écran).
- Un chant FR + un chant ZH, à l'œil, aux quatre dispositions (feuille « Idées d'harmonie »).

## Avancement

*(rempli au codage)*
