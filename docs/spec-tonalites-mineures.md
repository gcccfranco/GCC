# Spec — Tonalités mineures dans le transpositeur (EN ATTENTE)

> Statut : **mise de côté, non implémentée** (décision du 10 septembre 2026).
> Priorité donnée à l'achèvement des calques 简谱. Ce document fige le
> diagnostic et le choix pour reprendre sans re-réfléchir.

## Le défaut

Deux chants du corpus sont déclarés en tonalité mineure — `a-l-agneau` et
`recois-ma-vie`, tous deux `{key: Am}`. Ils sont **intransposables** :

- `noteToIndex("Am")` rend `-1` (la table ne connaît que les noms de notes) ;
- donc `semitonesTo("Am", <n'importe quoi>)` rend `0` : choisir une autre
  tonalité dans le sélecteur ne fait **rien** ;
- donc `getTransposedKey("Am", n)` rend `"Am"` quel que soit `n`.

Les boutons − / + transposent bien les accords (ils passent `semitones`
directement), mais l'étiquette de tonalité reste figée sur « Am » : l'écran
annonce une tonalité qui n'est pas celle qu'il affiche.

Depuis le 09/09/2026, `keyOptions` ajoute au moins « Am » à la liste du
sélecteur, qui s'affichait auparavant **vide** sur ces deux chants. Le nom est
donc juste ; la transposition, non.

## Décision : apprendre les mineures au transpositeur

| Question | Décision | Alternative écartée |
|---|---|---|
| Réparer où ? | **Dans le code** — le transpositeur apprend les noms mineurs | Réécrire les deux `.cho` en do majeur (leur relatif) |
| Portée | **Entière** : mode conservé de bout en bout | Demi-mesure : `noteToIndex` enlève le `m` final |
| Liste du sélecteur | **Une table par mode**, même règle d'orthographe | Une seule liste majeure pour tout |

### Pourquoi pas réécrire les `.cho` en do majeur

**`recois-ma-vie` est vraiment en la mineur.** Ses accords sont
`Am Dm Dm7 E7 E/G# F C G A Bb7`. Un **E7 qui résout sur Am** est la dominante
de la mineure harmonique — le sol dièse du E7 n'appartient pas à do majeur.
L'étiqueter « C » serait faux, et visible pour quiconque lit la grille.

(`a-l-agneau` est réellement ambigu — refrain en Am `Am F G`, couplet en C,
refrain qui finit sur C. Là, l'un ou l'autre se défendrait. Mais on ne répare
pas un chant sur deux.)

**Le dépôt déclare déjà les mineures légitimes.** `scripts/validate-songs.ts`
valide les tonalités contre `/^[A-G][#b]?m?$/` — le `m?` est explicite. Ce ne
sont pas les données qui sont hors norme, c'est le transpositeur qui ne tient
pas le contrat affiché. Prendre l'autre option obligerait à **retirer** ce
`m?`, donc à interdire ce qu'on autorise : un mouvement plus lourd qu'il n'y
paraît.

**La moitié Python sait déjà le faire.** `scripts/jianpu/overlay.py` porte
`FLAT_KEYS = {F, Bb, Eb, Ab, Db, Gb, Dm, Gm, Cm, Fm, Bbm}` — les mineures y
sont. `src/lib/transpose.ts` a `{F, Bb, Eb, Ab, Db, Gb, Cb, Fb}` — elles n'y
sont pas. **Les deux miroirs ont divergé**, et c'est un défaut en soi, à
corriger quelle que soit la suite : `alt_key` et `altSpellingKey` sont censés
répondre à l'identique.

### Le piège : la demi-mesure est pire que rien

Enlever le `m` final dans `noteToIndex` et s'arrêter là ferait afficher
« **B** » pour un chant en Am transposé de +2, au lieu de « Bm » — et
`transposeChord` recevrait un nom **majeur** comme tonalité cible.
Aujourd'hui rien ne bouge et rien ne ment ; à moitié fait, ça mentirait.

## Les douze mineures, et pourquoi ce ne sont pas les mêmes noms

La règle du **moindre nombre d'altérations** — celle qui a donné les douze
majeures du sélecteur le 09/09/2026 — donne aussi les mineures, et explique
l'asymétrie entre les deux listes :

| Hauteur | Majeure | Mineure |
|---|---|---|
| do♯ / ré♭ | **Db** (5♭) contre C# (7♯) | **C#m** (4♯) contre Dbm (8♭) |
| ré♯ / mi♭ | **Eb** (3♭) contre D# (9♯) | **Ebm** (6♭) — égalité avec D#m, l'usage tranche |
| fa♯ / sol♭ | **F#** — égalité avec Gb, l'usage tranche | **F#m** (3♯) contre Gbm (9♭) |
| sol♯ / la♭ | **Ab** (4♭) contre G# (8♯) | **G#m** (5♯) contre Abm (7♭) |
| la♯ / si♭ | **Bb** (2♭) contre A# (10♯) | **Bbm** (5♭) contre A#m (7♯) |

D'où : `Am Bbm Bm Cm C#m Dm Ebm Em Fm F#m Gm G#m`.

C'est pour cette raison que `C#m`, `F#m`, `G#m` sont partout alors que `Db`,
`Gb`, `Ab` le sont aussi : **même règle, pas une exception**. L'implémentation
est donc une table par mode, et non un cas particulier greffé.

## Ce qu'il faudra toucher

- `src/lib/transpose.ts` : lecture d'un nom mineur ; `getTransposedKey`
  **conserve le mode** ; `FLAT_KEYS` gagne les mineures (alignement sur
  `overlay.py`) ; `ALL_KEYS` / `keyOptions` deviennent dépendants du mode.
- `src/app/songs/[slug]/SongDetailClient.tsx` : le sélecteur du chant.
- `src/components/setlists/SetlistFormRows.tsx` : les trois sélecteurs de
  `keyOverride` — une setlist qui force la tonalité d'un chant mineur doit
  proposer des noms mineurs.
- `scripts/jianpu/overlay.py` et `build-chords.py` : vérifier que le miroir
  reste exact (ils sont en avance, pas en retard).
- `tests/key-selector.spec.ts` : les deux chants en Am transposent vraiment,
  et le parcours de douze demi-tons rend les douze **mineures**.

## Garde-fou intermédiaire (non posé)

Aujourd'hui `validate-songs.ts` **accepte** `{key: Em}` et l'appli ne sait pas
le transposer : le contrat et le code se contredisent en silence, et le
prochain chant en mineur cassera pareil sans un mot. Une ligne dans le
validateur pour refuser une tonalité que le transpositeur ne sait pas lire
rendrait la panne bruyante en attendant la vraie correction.

**Non posé délibérément** : il ferait échouer `npm run validate` — donc la CI —
sur les deux chants existants tant que le transpositeur n'est pas réparé. À
poser en même temps que la correction, ou avec les deux chants exemptés.
