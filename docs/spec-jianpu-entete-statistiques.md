# Spec : page chant 简谱 sans en-tête gravé (lot JE) · statistiques pour tous (lot ST)

Spec écrite le 30/10/2026 après la planche
https://claude.ai/artifact/SkYcXaBfGRG3EdHLyCXFvs (`docs/planches/planche-jianpu-statistiques.html`).
Timothée a validé la piste A et toutes les recommandations des questions Q1 à Q6 le 30/10/2026.
**Pas encore de go** : le code est prévu le 31/10/2026 à 12 h 02, sur un go donné à ce moment-là.
Branche : `main` directement (consigne de Timothée du 30/10/2026, « ne crée pas de nouvelles branches »).

## Mots de Timothée (30/10/2026)

> « J'aimerais qu'on change la disposition des jianpu […] le fait que le titre soit coupé ça fait un peu
> bizarre, il faudrait revoir la disposition de la page des chants avec un jianpu. »
>
> « Je voudrais aussi que les statistiques soient vues par tout le monde, et qu'elles soient plus détaillées,
> et aussi en fonction des groupes/setlists. Par exemple la dernière fois que ça a été joué dans le groupe
> Fidélité. Le nombre de fois au total etc. Et il faut que ça s'affiche sur la page du chant mais aussi lors
> de la création de setlist. Et bien sûr les statistiques sont visibles seulement par ceux qui ont un compte. »

## Décisions (30/10/2026), à ne pas rouvrir

| # | Décision |
| --- | --- |
| D1 | « Titre coupé » = les sous-titres et crédits gravés qui restent sous la coupe actuelle sans le grand titre au-dessus (« Coming Home », « 赞美之泉《2021圣诞敬拜特辑》 », crédits tranchés). |
| D2 | **Piste A** : la coupe descend sous **tout** l'en-tête gravé, jusqu'au-dessus de la première ligne de musique ; l'en-tête du site reprend ce qui manquerait. En tablette paysage et ordinateur, vue 简谱 : **deux colonnes** (A2). |
| D3 | Repris de l'en-tête gravé : la **mesure** (4/4), le **sous-titre** et la **référence biblique** quand ils existent. Les crédits d'édition (équipe de transcription, album, traducteur) ne sont pas repris. |
| D4 | Setlists comptées : **publiées et passées** (ni brouillon, ni privée, ni corbeille). La **prochaine prévue** (publiée, à venir) se montre à part. |
| D5 | Statistiques **visibles de tout membre connecté** (revient sur T1 et T7 de `spec-statistiques.md`). La page complète s'ouvre à tous **depuis Chants** ; le filtre **présidence** reste aux admins. Sans compte : rien. |
| D6 | Éditeur de setlist : repère « joué récemment » = **3 semaines** dans le même service, avant ou après la date de la setlist. Un repère, jamais un blocage. |
| D7 | « Groupe » = le **service** de la setlist (`category`) : les 10 catégories de `ALL_CATEGORIES` (lieux de culte, Groupe Paix, Fidélité, Bonté, 中班, 大班, 高班). |

## Ce que le code montre (30/10/2026)

- **Recadrage** : `public/jianpu/cadrage.json` (`{ slug: [top page 1, …] }`), écrit par
  `scripts/jianpu/cadrage.py` (règle : dernière rangée blanche au-dessus de `min(keyLabel.y, 1re étiquette.y)`),
  certifié à l'œil (L3-T1, 12/10/2026, 189 chants / 190 pages). Lu par `JianpuSheet.tsx:622` (fenêtre
  `translateY(-top)`), par le mode Louange (`fit`) et par le PDF de setlist (`jianpuPngDataUrl`,
  L3-T6). Exemple : 回家 `top = 223`, « 1=D » à `y = 267`, première étiquette d'accord à `y = 407`.
- **Calque** (`public/jianpu/chords.json`) : `keyLabel` (le « 1=X » gravé, recouvert par la tonalité jouée),
  `titleKey` (la tonalité écrite dans le titre), `labels` (les accords). Coordonnées en pixels image : elles
  remontent avec la page, **aucune ne change**. Avec la nouvelle coupe, `keyLabel` et `titleKey` tombent
  dans la partie cachée : la tonalité jouée n'est plus lue que dans l'en-tête du site.
- **Directives** : le parseur (`src/lib/chordpro/parser.ts:347-400`) ne connaît ni `time`, ni `subtitle`, ni
  de référence biblique ; l'index (`public/songs-index.json`) non plus.
- **Statistiques** : calcul pur `src/lib/stats/chantsJoues.ts` (`chantsDeLaSetlist`, `statsChants`), page
  `src/app/back-office/statistiques/` (sous la garde « responsables » du layout Back-Office), droit
  `canVoirStatistiques = isAdminUser` (`src/lib/access.ts:791`), bouton `BoutonStatistiques.tsx` (admins,
  derrière `BACK_OFFICE`), carte « Les plus chantés » de Chants (`ChoisisUnChant.tsx:135`, connectés).
- **Setlists** : `getSetlists()` lit toute la collection (publiées, hors corbeille, hors fêtes si
  l'interrupteur est coupé). Les règles autorisent déjà `read: if signedIn()` : **aucune règle Firestore à
  changer, rien à publier dans la console.**
- **Éditeur** : `Bibliotheque.tsx` reçoit `songs`, `pris`, `ajoutes` (depuis `useVolet.tsx:146`) ; il ne
  connaît ni le service, ni la date, ni l'id de la setlist.

---

## Lot JE — page chant 简谱 sans en-tête gravé

### JE1 · Trois directives nouvelles

Noms ChordPro standard quand ils existent :

```
{subtitle: Coming Home}
{time: 4/4}
{bible: 路15:11-32}
```

- Parseur, type `Song`, `SongIndexEntry` (`subtitle?`, `time?`, `bible?`), `scripts/build-index.ts`.
- `npm run validate` : `time` doit suivre `^\d{1,2}/\d{1,2}$` ; les trois sont facultatives ; texte chinois
  de `subtitle` / `bible` soumis à la vérification des polices (relancer `python3 scripts/build-fonts.py`).
- `docs/chants/01-format-cho.md` : les trois directives, sous `{tempo}`. `00-nouveau-chant.md` : les
  relever sur l'en-tête du scan avant de le couper.
- Valables aussi pour un chant français (mesure), sans obligation.

### JE2 · Nouvelle coupe, recertifiée à l'œil

- `cadrage.py propose --sous-entete` : `top` = la **dernière rangée entièrement blanche au-dessus de la
  première bande d'encre de musique**, c'est-à-dire au-dessus de `min(labels.y)` (première ligne d'accords)
  **en ignorant `keyLabel` et `titleKey`**. Repli : `min(labels.y) − 0,6 × labelH`.
  Garde-fou : si la première ligne d'accords est à plus de 1,5 système sous le « 1=X » (première ligne de
  musique sans accord), la proposition le signale et la page se règle à la main.
- **Certification à l'œil des 190 pages**, par lots, avec la planche `npm run jianpu:audit <slug> -- --cadrage`
  (protocole `scripts/jianpu/LOOP.md`). Refus : une note, un point d'octave, une liaison ou une étiquette
  d'accord tranchés ; un reste de crédit visible. Pages 2 et suivantes : 0, inchangé.
- **Pendant la même passe**, relever sur la partie coupée la mesure, le sous-titre et la référence biblique,
  et les écrire dans le `.cho` (JE1). Ce qui est illisible ou absent ne s'écrit pas.
- `chords.json` et `index.json` ne changent pas (empreinte vérifiée par test, comme en L3-T1).
- Mode Louange et PDF de setlist suivent tout seuls (ils lisent `cadrage.json`) : à regarder sur un chant.

### JE3 · En-tête du site

Téléphone, tablette portrait (et Paroles partout) : l'en-tête actuel, plus :

- sous le pinyin : le **sous-titre** (même style que le pinyin) ;
- sous l'auteur : la **référence biblique** (petit, couleur atténuée) ;
- sous la pastille de tonalité, la ligne du tempo devient **« 1=D · 4/4 · ♩ = 66 »** en vue 简谱
  (« 1=X » = la tonalité **jouée**, celle de la pastille ; c'est elle qui remplace le « 1=X » gravé coupé),
  **« 4/4 · ♩ = 66 »** en vue Paroles. Un élément absent disparaît avec son séparateur.

### JE4 · Deux colonnes (A2) — tablette paysage et ordinateur, vue 简谱 seulement

- Dès la disposition « tablette paysage » (barre latérale réduite) : grille `colonne d'en-tête | partition`.
  Colonne d'en-tête ~260 px, **collante** (`sticky`) sous la barre du chant : titre, pinyin, sous-titre,
  auteur, référence, pastille, « 1=D · 4/4 · ♩ », pastilles de sections, ligne de statistiques (ST4),
  bascule 简谱 / Paroles.
- La partition prend le reste, lecture plafonnée à 1 440 px comme aujourd'hui.
- Vue Paroles : agencement actuel, inchangé. Téléphone et tablette portrait : une colonne (JE3).
- La barre de la page d'un chant (`spec-barre-chant.md`) et le panneau Personnaliser ne bougent pas.

---

## Lot ST — statistiques pour tous les membres connectés

### ST1 · Droits

- `canVoirStatistiques(user) = user !== null` (connecté). Nouveau `canFiltrerPresidence(user) = isAdminUser(user)`.
- Commentaire de `access.ts` mis à jour (T1 et T7 remplacés par D5, 30/10/2026). Aucune règle Firestore :
  le dire dans le compte rendu (rien à publier).
- `spec-statistiques.md` : une ligne en tête, « T1 et T7 remplacés le 30/10/2026, voir
  `spec-jianpu-entete-statistiques.md` ».

### ST2 · Calcul

Dans `src/lib/stats/chantsJoues.ts`, une fonction pure de plus, testable sans horloge :

```ts
export type StatsDuChant = {
  total: number;                                       // setlists publiées passées (dans la période)
  derniere: { jour: string; service: string } | null;
  tonalites: string[];                                 // la plus jouée (règle Q5 existante)
  parService: { service: string; fois: number; derniere: string }[]; // fois décroissant, puis la plus récente
  jamaisDans: string[];                                // services avec ≥ 1 setlist comptée, où le chant n'est jamais
  prochaine: { jour: string; service: string; setlistId: string } | null; // publiée, date ≥ aujourd'hui, la plus proche
};
export function statsDuChant(setlists, index, slug, periode: Periode, aujourdhui: string, sauf?: string /* id de setlist à ignorer */): StatsDuChant;
```

- Même marche que l'existant (`chantsDeLaSetlist` : fusions dépliées, transitions ignorées, un chant une fois
  par setlist). Publiée passée = règle Q3 existante.
- Période : « 3 mois », « 12 mois », « Depuis le début » (**par défaut**).
- **Lecture partagée** : `setlistsPourStats()` garde la promesse de `getSetlists()` en mémoire **5 minutes**
  (une lecture de la collection par visite, pas une par chant ouvert). Erreur ou hors ligne : pas de
  statistiques, aucun message d'erreur.

### ST3 · Page Statistiques ouverte à tous

- Nouvelle adresse **`/songs/statistiques`** (segment statique, prioritaire sur `[slug]`), hors du layout
  Back-Office, **sans** l'interrupteur `BACK_OFFICE`. Sans compte : `RequireAuth` (connexion).
  `/back-office/statistiques` **redirige** vers elle ; l'entrée du menu Back-Office y mène.
- Contenu : `StatistiquesClient` tel quel (trois vues, filtres période, service, langue) ; le filtre
  **présidence** n'apparaît que si `canFiltrerPresidence`. Sous-titre « Visible par les admins seulement »
  remplacé par « Setlists publiées, depuis le {date} ».
- Entrées : `BoutonStatistiques` dans l'en-tête de Chants pour tout connecté (plus de condition
  `BACK_OFFICE`) ; la carte « Les plus chantés » gagne un lien « Tout voir ».
- **中文** : la page s'ouvre aux membres, elle est donc traduite (`zh-CN.json`), comme le reste de Chants
  (fin de Q14 de `spec-statistiques.md`).
- Widget « Chants les plus joués » du tableau de bord : suit `canVoirStatistiques` (déjà le cas).

### ST4 · Sur la page du chant

- Connecté seulement. Une ligne sous l'en-tête (téléphone, tablette portrait) ou dans la colonne
  d'en-tête (JE4) : **« Joué 14 fois · dernière fois 26/10, Fidélité › »** ; jamais joué : **« Jamais joué à
  GCC »** ; une setlist prévue s'ajoute : **« · prévu le 02/11, Paix »**. Date : `JJ/MM`, l'année si ce
  n'est pas l'année en cours. Service : « Groupe » retiré (« Fidélité »).
- La ligne n'apparaît qu'une fois chargée (pas de squelette, pas de saut : elle se glisse en fondu ; sous
  `prefers-reduced-motion`, sans animation).
- La toucher ouvre le **détail** : feuille (téléphone, tablette portrait), panneau ancré (≥ tablette
  paysage). Contenu : trois chiffres (setlists, dernière fois, tonalité la plus jouée), pastilles de
  période, tableau « Service · Fois · Dernière » (barre décorative `aria-hidden`), puis « Jamais : Groupe
  Bonté, 高班 », la prochaine prévue, la note « Setlists publiées et passées, depuis le {date} » et le lien
  « Toutes les statistiques » (ST3).
- Pas dans le mode Louange, pas dans le PDF.
- Chants FR et ZH, libellés FR et 中文.

### ST5 · Dans l'éditeur de setlist (Bibliothèque)

- `Bibliotheque` reçoit `contexte: { service: string | null; date: string | null; setlistId: string | null }`
  (depuis `useVolet`) ; la setlist en cours d'édition est **exclue** des comptes (`sauf`).
- Sous chaque chant : **« Fidélité : 26/10 · 14 fois au total »** ; jamais dans ce service :
  **pastille verte « Jamais à Fidélité »** ; jamais nulle part : « Jamais joué à GCC ».
- **Pastille orange** (D6) quand une autre setlist publiée **du même service** contient le chant à moins de
  21 jours de la date de la setlist, avant ou après : « Fidélité : il y a 7 j » ou « Fidélité : prévu le
  09/11 ». Rien n'est bloqué.
- Nouveau tri **« Moins joués ici »** à côté des filtres : jamais dans ce service d'abord (A→Z / pinyin),
  puis la dernière fois la plus ancienne d'abord.
- Service ou date pas encore choisis : seulement le total, sans pastille ; le tri « Moins joués ici » est
  grisé avec l'aide « Choisis d'abord le service ».
- Ordinateur (deux colonnes) : mêmes informations, colonnes « {Service} » et « Total ».

---

## Tranches et ordre

| Tranche | Contenu | Vérification |
| --- | --- | --- |
| **JE-A** | JE1 (directives, parseur, index, validate, doc) | `npx tsc --noEmit`, `npm run validate`, `npm run lint` |
| **JE-B** | JE2 (script `--sous-entete`, certification des 190 pages par lots de ~20, relevé mesure / sous-titre / référence) | planches d'audit **regardées** ; `PW_SLUGS=all npm test` vert |
| **JE-C** | JE3 + JE4 (en-tête, deux colonnes) | captures aux **quatre dispositions + 1 440 px**, 1 chant FR + 1 ZH (回家, 爱的约定, 爱的彰显) ; spec d'agencement ajoutée à `SPECS_GRAND_ECRAN` |
| **ST-A** | ST1 + ST2 (droits, calcul, lecture partagée) | tests unitaires du calcul (horloge fixe, setlists simulées, noms fictifs) |
| **ST-B** | ST3 (page ouverte, redirection, entrées, 中文) | Playwright 3 appareils : membre non admin voit la page sans « présidence » ; admin la voit avec ; sans compte → connexion |
| **ST-C** | ST4 (page chant) | Playwright 3 appareils : ligne, feuille / panneau, « Jamais joué », prochaine prévue ; sans compte : rien |
| **ST-D** | ST5 (éditeur) | Playwright 3 appareils : pastille orange (7 j avant, 9 j après), verte, tri, setlist sans service |

Ordre : JE-A → JE-B (long : la certification) en parallèle de ST-A → ST-B → ST-C → ST-D ; JE-C après JE-B et
ST-C (la colonne d'en-tête porte la ligne de statistiques). Un commit par tranche, message en français.

**Réussite** : sur 回家, 爱的约定 et 爱的彰显, la partition commence à la première ligne d'accords, sans
sous-titre ni crédit gravé ; l'en-tête dit « 1=D · 4/4 · ♩ = 66 » et « Coming Home » ; transposé en E,
« 1=E » ; en ordinateur, l'en-tête reste à gauche pendant qu'on fait défiler la partition. Un membre
connecté sans rôle voit sur 回家 « Joué N fois · dernière fois …, Fidélité », le détail par service, la
page Statistiques sans filtre présidence ; en préparant une setlist Groupe Fidélité, un chant joué à
Fidélité 7 jours avant porte la pastille orange. Sans compte : aucune statistique nulle part.

## Hors périmètre

Export des statistiques ; statistiques par personne ; modulations (`sectionKeys`) dans la tonalité jouée ;
un nouveau calque ; durcir les règles Firestore.
