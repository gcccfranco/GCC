# Spec : Cours d'harmonie — des leçons que chacun valide à son rythme

Demande de Timothée du 01/10/2026 : « Ajouter dans la section harmonie des espèces de cours que
chacun valide à son rythme quand il a fini. » Contenu montré : son document Claude Docs
« Cours Complet de Théorie Musicale pour Musiciens de Louange » (29/09/2026, lu le 01/10/2026 à
la révision 70 : https://claude.ai/code/artifact/0cc33ba0-cb52-456b-8a4d-76aee559983d).

**État : spec écrite le 01/10/2026, questions tranchées le 02/10/2026** (« Décisions » en fin de
document). Rien n'est codé ; code lot par lot, après un go explicite.

## La demande

Le cours de Timothée devient, dans la section Harmonie, une suite de leçons à lire dans l'app.
Quand on a fini une leçon (le texte et ses exercices), on touche « J'ai fini » ; on peut
l'annuler. Chacun avance à son rythme, sans date. L'app retient ce que chacun a fini, sur tous
ses appareils, et lui montre où il en est. Rien de plus : ni note, ni classement, ni rappel.

## Ce qui existe (ce qui compte ici)

- **Harmonie est en ligne** depuis le 20/09/2026 (`spec-mise-en-ligne.md`, « ce qui part en
  ligne ») ; rien d'Harmonie n'est derrière `BACK_OFFICE`.
- **Pages** : `/harmonie` (parcours « Par où commencer », 10 fiches **sans suivi** ; filtres ;
  familles) et `/harmonie/[...fiche]`. **Entrées** : onglet Chants (`LienHarmonie.tsx`), Moi,
  menu du compte (`Navbar.tsx`), toutes conditionnées par `useAccesHarmonie().peut`.
- **Fiches** : 69 dans `docs/harmonie/*.md`, lues par `src/lib/harmonie/fiches.ts` (une coquille
  arrête le build), `scripts/build-harmonie.ts` → `public/harmonie-index.json` via
  `npm run build:index`. **Les 69 sont encore « à valider »** ; leur 中文 attend cette validation.
- **Rendu** : `TexteFiche.tsx` rend à la main gras, italique et accords entre accents graves,
  « plutôt que d'ajouter une bibliothèque de markdown ». Le cours a besoin de plus.
- **Accès** : `canUseHarmonie` (`access.ts`) = colonnes Piano / Guitare des plannings (via
  `planningName`) + admins ; filtrage côté navigateur ; aucune règle Firestore pour le catalogue.
- **Profil** : `serviceRoles` (chanteur, musicien, présidence, régie) par catégorie.
  `users/{uid}` n'est modifiable que par un admin une fois créé : la progression ne peut pas y
  vivre.
- **Décisions du 17/09/2026 qui s'appliquent** : préparation seulement, jamais en mode louange ;
  **aucun son** ; bilingue, 中文 après validation du français ; contenu dans le dépôt, validé par
  Timothée.

## Le contenu : le cours tel qu'il est

Un mode d'emploi, puis quatre parties et 26 chapitres numérotés (23 de cours, 3 annexes),
≈ 680 blocs. Aucun lien externe, aucun chapitre vide, aucun « à compléter ».

**Mode d'emploi** (5 sous-parties + « La règle d'or »). Public : « tous les musiciens de
l'église : claviers, guitares, basse, chanteurs et directeurs musicaux ». Quatre niveaux :
**1 Fondations** (débutant, chanteur, nouveau musicien) ch. 1–5 · **2 Accompagnateur** ch. 6, 7,
9, 10, 15, 16 · **3 Musicien d'équipe** ch. 8, 11, 17, 18, 19 · **4 Directeur musical**
ch. 12–14, 20–23. Un tableau de chapitres prioritaires par instrument (piano, pads, guitare
acoustique, guitare électrique, basse, chant, leader). Conventions : notes en Do Ré Mi, accords
en C Dm G7, degrés en **chiffres romains et Nashville**, exemples **en Do**. « Comment
travailler », étape 5 : « Coche ta progression dans le programme de l'annexe 25 ».

| Partie | Ch. | Titre | Sous-parties (dont « Exercices ») | Exercices | Niveau |
| --- | --- | --- | --- | --- | --- |
| 1 Les fondations | 1 | Le son, les notes et le clavier | 8 | 3 | 1 |
| | 2 | Le rythme et la mesure | 8 | 4 | 1 |
| | 3 | Lire la musique | 8 | 3 | 1 |
| | 4 | Les intervalles | 8 | 3 | 1 |
| | 5 | Les gammes et les tonalités (schéma : cercle des quintes, 5.3) | 9 | 3 | 1 |
| 2 L'harmonie | 6 | Tous les accords | 14 | 5 | 2 |
| | 7 | L'harmonie diatonique | 8 | 3 | 2 |
| | 8 | Renversements et voicings | 9 | 3 | 3 |
| | 9 | Les cadences | 4 | 3 | 2 |
| | 10 | Les progressions d'accords | 11 | 4 | 2 |
| | 11 | Conduite des voix et liaisons d'accords | 36 | 9 | 3 |
| | 12 | L'harmonie chromatique | 11 | 3 | 4 |
| | 13 | Les modes | 7 | 3 | 4 |
| | 14 | La modulation | 7 | 3 | 4 |
| 3 La pratique à l'église | 15 | Le Nashville Number System et la transposition | 8 | 3 | 2 |
| | 16 | Les patterns d'accompagnement | 6 | 3 | 2 |
| | 17 | Jouer en groupe | 9 | 3 | 3 |
| | 18 | La structure des chants et l'arrangement (schéma : arc d'intensité, 18.3) | 8 | 3 | 3 |
| | 19 | Les voix, les tessitures et le choix de la tonalité | 6 | 3 | 3 |
| | 20 | La réharmonisation | 6 | 3 | 4 |
| | 21 | Le gospel | 9 | 3 | 4 |
| | 22 | Improvisation et louange spontanée | 8 | 3 | 4 |
| | 23 | L'oreille musicale et la transcription | 7 | 3 | 4 |
| 4 Annexes | 24 | Les 12 tonalités | 3 | — | — |
| | 25 | Programme de progression : 24 semaines, 4 niveaux × 6 cases + « Validation » par niveau | — | — | — |
| | 26 | Glossaire (français · anglais · 中文), 86 termes | — | — | — |

Total : 23 chapitres, 215 sous-parties, **79 exercices**, 2 schémas. Les exercices se **jouent**,
se **chantent** ou s'**écrivent** (« Joue… », « Chanteurs : chante… », « Écris l'arc
dynamique… ») : l'app ne peut pas les corriger. Les « Validation » de l'annexe 25 sont aussi
des épreuves jouées (« tu joues trois chants du répertoire dans deux tonalités différentes… »).

### Comment il entre dans l'app (proposition)

- **Import unique** (C0) : export Markdown du document, découpé en un fichier par chapitre dans
  `docs/harmonie/cours/` (`00-mode-d-emploi.md`, `01-le-son-les-notes-et-le-clavier.md` …
  `26-annexe-glossaire.md`), **sans reformuler**. En tête : `| Id |`, `| Statut |`, `| Niveau |`,
  comme les fiches. Ensuite **le dépôt est la seule source** (Q6) ; le document devient une
  archive (Timothée l'indique en tête, Claude n'y écrit pas).
- **Build** : `npm run build:index` lit ces fichiers → `public/harmonie-cours/index.json`
  (id, numéro, titre, partie, niveau, sous-parties, nombre d'exercices) + un JSON de blocs par
  chapitre, chargé seulement à l'ouverture du chapitre. Fichier mal formé = build en échec.
- **Rendu** : petit lecteur maison dans la ligne de `TexteFiche` (titres, paragraphes, listes,
  tableaux, grilles en bloc de code, encadrés) ; **pas de bibliothèque Markdown**. Sur téléphone,
  un tableau large défile **dans son cadre**, jamais la page.
- **Schémas — recommandé : deux petits composants** (`CercleDesQuintes.tsx`, `ArcIntensite.tsx`)
  repris du code des schémas du document, qui est **déjà du JSX dessinant un SVG** ; couleurs du
  site (thème sombre compris), textes par les locales (中文 possible). Un SVG figé ne suit ni le
  thème ni la langue. Dans le Markdown, une ligne `[[schéma : cercle-des-quintes]]`.

## Proposition

| Point | Proposition |
| --- | --- |
| Leçon | Le **chapitre** : 23 leçons. Mode d'emploi et annexes se lisent sans coche (Q1). |
| Valider | Bouton **« J'ai fini »** sous les exercices, déclaratif (Q2). Il devient « Fini le 3 oct. · Annuler ». |
| Annuler | Un tap, par la personne seule, à tout moment ; pas d'historique. |
| Progression | Coche dans la liste ; « 7 / 23 » sur la ligne « Cours » de `/harmonie` ; « 3 / 6 » par niveau ; « Prochain chapitre » = premier non fini dans l'ordre conseillé ; niveau complet → son objectif (« Validation : tu joues… ») s'affiche (Q9). |
| Ordre | Libre ; liste rangée par niveau (ordre conseillé du mode d'emploi), numéros gardés (Q3). |
| Où | `/harmonie` : ligne « Cours » en tête, au-dessus de « Par où commencer » → `/harmonie/cours` (mode d'emploi, 4 niveaux, annexes) → `/harmonie/cours/<id>` (sommaire des sous-parties, texte, exercices, « J'ai fini »). |
| Qui | Q4. Jamais en mode louange ; aucun son. |
| Progrès des autres | Personne ne le voit (Q5). |
| 中文 | Libellés bilingues dès C1 ; texte en français + une ligne tant que le chapitre n'est pas traduit (Q7). |

| Libellé | Français | 中文 (proposé, relu par Timothée) |
| --- | --- | --- |
| Ligne de `/harmonie` | Cours · 7 / 23 chapitres | 课程 · 已完成 7 / 23 章 |
| Bouton | J'ai fini | 我学完了 |
| Après | Fini le 3 oct. · Annuler | 10月3日已完成 · 撤销 |
| Suite | Prochain chapitre | 下一章 |
| Niveaux | Fondations · Accompagnateur · Musicien d'équipe · Directeur musical | 基础 · 伴奏者 · 团队乐手 · 音乐总监 |
| Non traduit | Ce chapitre n'est pas encore traduit : texte en français. | 本章尚未翻译，暂以法文显示。 |

## Données

- **Firestore** `coursProgres/{uid}` : `{ fini: { <id du chapitre>: "<date ISO>" } }`, un document
  par personne. **REST** : GET (404 = rien de fini) ; « J'ai fini » = PATCH avec
  `updateMask.fieldPaths=fini.<id>` (crée le document au besoin) ; « Annuler » = même PATCH sans
  la valeur. **Jamais le document entier** : deux appareils ne s'écrasent pas (leçon de
  `saveProfile`, 19/09/2026). L'id est celui de l'en-tête du fichier, jamais renuméroté.
- **Règles, en double** : `firestore.rules` →
  `match /coursProgres/{uid} { allow read, write: if signedIn() && request.auth.uid == uid; }`
  (+ `|| isAdmin()` en lecture si Q5 = b) ; `access.ts` → `canSuivreCours(user, profile,
  services)` (Q4), et le client ne lit et n'écrit que son propre document. **À publier par
  Timothée** dans la console après C2.
- **Interrupteur** : non concerné si Q8 = a. **Appareil** : rien en `localStorage`.

## Tranches (test d'abord, trois appareils, interface FR + 中文)

**C0 — Import du texte** (documents, pas de code). Fichiers de `docs/harmonie/cours/`, schémas
remplacés par leur ligne, seule retouche : l'étape 5 du mode d'emploi (« Touche “J'ai fini” en
bas de chaque chapitre ») et les cases de l'annexe 25 en liste simple. *Fini quand* Timothée a
regardé la conversion (pas le fond).

**C1 — Lire le cours** (sans suivi). Build, lecteur, deux schémas, pages `/harmonie/cours` et
`/harmonie/cours/<id>`, ligne « Cours » dans `/harmonie`, accès selon Q4 (entrées Chants, Moi,
menu), libellés. *Où* : `build-harmonie.ts`, `src/app/harmonie/cours/`, `components/harmonie/cours/`,
`useHarmonie.ts`, `access.ts`, `/harmonie`, les trois entrées, locales.
`tests/harmonie-cours.spec.ts` :
- l'index compte 23 chapitres, 79 exercices, 2 schémas (contrôle de l'import contre le document) ;
- accès selon Q4 : pianiste, guitariste, admin voient « Cours » ; chanteur, batteur (si b) voient
  « Harmonie » avec les cours seuls ; régie et compte sans rôle, aucune entrée (sauf c) ;
- liste : mode d'emploi en tête, niveaux de 5 · 6 · 5 · 7 chapitres, trois annexes ;
- chapitre 6 : 14 sous-parties au sommaire, 5 exercices ; à 412 px la page ne déborde pas, le
  tableau défile dans son cadre ;
- les deux schémas s'affichent (titre accessible), lisibles en thème sombre ;
- interface 中文 : libellés chinois, texte français + la ligne « 本章尚未翻译 ».

**C2 — « J'ai fini » et progression.** `src/lib/firebase/coursProgres.ts`, bouton, annulation,
compteurs, « Prochain chapitre », objectif du niveau ; `firestore.rules` + `access.ts`.
`tests/harmonie-cours-progres.spec.ts` (Firestore simulé, `fakeFirestore`) :
- « J'ai fini » au chapitre 1 → un PATCH sur `coursProgres/<mon uid>`, ce seul champ ; coche et
  « 1 / 23 » ; après rechargement, toujours fini ;
- « Annuler » → champ retiré, « 0 / 23 » ;
- deux pages (deux appareils) finissent deux chapitres → chaque PATCH ne porte que son champ
  (`updateMask`), les deux coches restent après rechargement ;
- aucune requête vers le document d'un autre uid ;
- les 5 chapitres du niveau 1 finis → objectif du niveau affiché ; « Prochain chapitre » = ch. 6 ;
- libellés en FR et en 中文.

**C3 — 中文 du contenu** (si Q7 = a, après validation du français). `docs/harmonie/cours/zh/`,
même nom de fichier, à partir du glossaire de l'annexe 26 ; relu par Timothée.
`tests/harmonie-cours-zh.spec.ts` : chapitre traduit → 中文 ; non traduit → français + la ligne ;
interface FR → toujours le français.

**C4 — Progression vue par les admins** (seulement si Q5 = b). Tableau nom × niveau dans
`/harmonie/cours`, lecture admin dans les règles. `tests/harmonie-cours-admin.spec.ts` : l'admin
voit, un membre ne voit ni le tableau ni le document d'un autre.

## Hors périmètre

- Aucun son (inchangé) : les exercices renvoient à l'instrument et aux enregistrements ; le site
  ne joue rien. Pas de quiz, pas de rappel, pas de notification, pas d'éditeur dans l'app.
- « Par où commencer » reste sans suivi. Pas de sélecteur de tonalité dans le cours (l'annexe 24
  donne les 12 tonalités). Pas de mise en avant des chapitres de son instrument.
- Idées pour plus tard, sans code ici : « Pour aller plus loin » vers les fiches sous les
  chapitres 9, 10, 12, 14, 20 ; la « grille Nashville commune pour chaque chant » de l'annexe 25
  (le site calcule déjà les degrés, `lib/harmonie/degres.ts`).

## Hypothèses (à corriger d'un mot)

1. La progression suit le compte, pas l'appareil : téléphone et ordinateur montrent la même.
2. Les listes à cocher du texte (20.5, annexe 25) s'affichent sans case active.
3. Hors ligne : comme le catalogue, les cours demandent le réseau. Un chapitre renommé garde
   son id, donc sa coche.

## Questions à trancher

1. **Qu'est-ce qu'une leçon ?** (a) le chapitre : 23 leçons ; (b) la semaine de l'annexe 25 :
   24 étapes, qui coupent les chapitres 6, 11 et 12 en deux et regroupent 21–23 ; (c) la
   sous-partie : 215 ; (d) la partie : 3, dont une de 107 sous-parties.
   Recommandation : (a), chaque chapitre finit par ses exercices, c'est la place naturelle de
   « J'ai fini » ; le 11 (36 sous-parties, 9 exercices) reste un seul chapitre, avec son sommaire.
2. **Comment valider ?** (a) « J'ai fini », déclaratif ; (b) un quiz corrigé par l'app ; (c) un
   responsable valide après t'avoir entendu jouer (les « Validation » de l'annexe 25).
   Recommandation : (a), c'est la demande ; les 79 exercices se font à l'instrument, à la voix
   ou sur papier, l'app ne peut pas les corriger ; un quiz = des dizaines de questions à écrire.
3. **Ordre ?** (a) libre, ordre conseillé affiché + « Prochain chapitre » ; (b) chapitres
   débloqués un par un. Recommandation : (a), le cours dit « Chacun commence au niveau qui lui
   correspond » ; liste rangée par niveau, pas par partie.
4. **Pour qui ?** (a) comme le catalogue : pianistes, guitaristes (plannings), admins ; (b) toute
   l'équipe : en plus, tout profil chanteur, musicien ou présidence (basse, batterie, chant,
   leaders), le catalogue et les idées restant aux pianistes et guitaristes ; (c) tout compte
   connecté (toute l'église depuis le pivot). Recommandation : (b), le mode d'emploi s'adresse à
   « tous les musiciens de l'église » et le niveau 1 aux chanteurs ; ça rouvre en partie la
   décision du 17/09/2026 (« un chanteur ne voit ni le bouton ni l'onglet »).
5. **Qui voit ma progression ?** (a) moi seul ; (b) moi + les admins, dans un tableau ; (c) toute
   l'équipe. Recommandation : (a) en V1, à son rythme et sans regard ; (b) coûte une tranche (C4)
   et un mot dans les règles, utile si tu veux préparer l'atelier mensuel de l'annexe 25.
6. **Source du texte ?** (a) le dépôt après un import unique, chapitres **validés d'office**
   (c'est ton texte ; seule la conversion est à vérifier) ; (b) le dépôt, chapitres « à relire »
   comme les fiches ; (c) le document reste la source, réimport à la demande (chaque réimport
   écrase le chapitre, son 中文 est à refaire). Recommandation : (a), comme les fiches pour le
   circuit (diff, historique, build qui vérifie), sans 23 étiquettes « à relire ».
7. **中文 du contenu ?** (a) après validation du français, chapitre par chapitre (règle des
   fiches), donc tout de suite si Q6 = a ; (b) en même temps que l'import ; (c) jamais.
   Recommandation : (a), en tranche C3, appuyé sur le glossaire de l'annexe 26 ; libellés de
   l'app bilingues dès C1.
8. **En ligne ou back-office ?** (a) en ligne comme Harmonie, poussé après ta validation en
   local ; (b) derrière `BACK_OFFICE` jusqu'au 中文. Recommandation : (a), ce n'est pas un outil
   de responsables et l'interrupteur sert au back-office ; Harmonie est déjà en ligne en
   français d'abord.
9. **Ce que « J'ai fini » montre ?** (a) coche, compteurs par niveau et au total, « Prochain
   chapitre », objectif du niveau complet ; (b) + un badge de niveau ; (c) + une annonce à
   l'équipe. Recommandation : (a), rien de public, rien d'envoyé.
10. **Notation du cours ?** Le cours écrit les degrés en chiffres romains et Nashville, exemples
    en Do ; les fiches sont en D, degrés en chiffres (1 4 5 6m), décision du 17/09/2026. (a)
    garder le texte tel quel ; (b) le convertir à l'import. Recommandation : (a), le cours
    enseigne les deux notations (mode d'emploi, 7.7, ch. 15) ; convertir réécrirait 23 chapitres.

## Commandes

```bash
npm run build:index                       # chants, fiches et cours
npx tsc --noEmit && npm run lint
npm test -- tests/harmonie-cours.spec.ts tests/harmonie-cours-progres.spec.ts
```

## Décisions (Timothée, 02/10/2026)

| # | Question | Décision |
| --- | --- | --- |
| 1 | Leçon | Le **chapitre** : 23 leçons. |
| 2 | Valider | **« J'ai fini »**, déclaratif, annulable. |
| 3 | Ordre | **Libre**, ordre conseillé affiché et « Prochain chapitre ». |
| 4 | Pour qui | **Pianistes et guitaristes** (comme le catalogue, `canUseHarmonie`), admins compris. Pas de chanteurs : la décision du 17/09/2026 tient. |
| 5 | Progression vue par | **Moi + les admins** : la tranche **C4** (tableau nom × niveau, lecture admin dans les règles) fait partie du lot. |
| 6 | Source du texte | **Le dépôt**, import unique, chapitres **validés d'office** ; le document devient une archive. |
| 7 | 中文 | **Après le français**, chapitre par chapitre (C3), libellés bilingues dès C1. |
| 8 | En ligne | **En ligne** comme Harmonie, après validation en local. |
| 9 | « J'ai fini » montre | **Coche + compteurs** (par niveau, au total), prochain chapitre, objectif du niveau. |
| 10 | Notation | **Texte gardé tel quel** (chiffres romains et Nashville, exemples en Do). |

Conséquences : `firestore.rules` → `match /coursProgres/{uid}` lecture par soi **ou un admin**,
écriture par soi seul (à publier par Timothée) ; `access.ts` → l'accès aux cours est celui
d'Harmonie. Ordre des tranches : C0 import → C1 lecture → C2 « J'ai fini » → C4 vue admin →
C3 中文. **Attend le go.**

## Avancement (02/10/2026)

Go donné le 02/10/2026 (« Go pour les deux ») ; C0, C1, C2 et C4 codées le jour même, **non
commitées, à valider en local**. C3 (中文 du contenu) viendra plus tard, comme convenu.

- **C0** : `docs/harmonie/cours/` — 26 fichiers (mode d'emploi, 23 chapitres, annexes 24 et
  26), texte identique au document (révision 70), vérifié ligne à ligne ; 79 exercices, 215
  sous-parties, 2 schémas. **Annexe 25 (programme sur 24 semaines) retirée** à la demande de
  Timothée (« on le fera pas ») : aucun autre chapitre n'y renvoyait, l'étape 5 du mode d'emploi
  dit déjà « Touche « J'ai fini » ». Sans elle, un niveau fini affiche « Niveau terminé », sans
  objectif de « Validation ». La liste à cocher de 20.5 garde ses cases, dessinées sans se cocher.
- **C1** : `src/lib/harmonie/cours.ts` (lecture, un fichier mal formé arrête le build),
  `scripts/build-cours.ts` (dans `npm run build:index`) → `public/harmonie-cours/`, pages
  `/harmonie/cours` et `/harmonie/cours/<id>`, lecteur maison (`LecteurCours`), les deux schémas
  redessinés en composants (`schemas.tsx`, couleurs du site), ligne « Cours » en tête d'Harmonie.
- **C2** : `coursProgres/{uid}` écrit champ par champ (`updateMask`), « J'ai fini » / « Annuler »,
  coches, compteurs, prochain chapitre. **`firestore.rules` à publier par Timothée.**
- **C4** : tableau de l'équipe pour les admins (lecture admin dans les règles).
- Tests : `tests/harmonie-cours-lecture.spec.ts` (5), `tests/harmonie-cours.spec.ts` (13 × 3
  appareils). Le faux Firestore des tests applique désormais les masques imbriqués
  (« fini.<id> »), comme le vrai.

