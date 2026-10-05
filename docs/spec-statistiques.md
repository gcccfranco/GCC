# Spec : lot U7 — statistiques des chants (admins)

Spec écrite le 04/10/2026, validée avec le go du 04/10/2026 (redit le 05/10/2026) : les questions ouvertes
prennent leur recommandation. Lot codé (S1 à S5) et relu le 05/10/2026, voir « Avancement ».

Lot U7 du chantier U (`feuille-de-route.md` § 3.U), après U6 (`docs/spec-back-office.md`), avant U8
(`docs/spec-calendrier.md`) ; dispositions : U4 (`docs/spec-navigation-grand-ecran.md`). Écran de la
planche validée (version 10, https://claude.ai/artifact/1d4ZW7Y9NVHcsLB9YrrbrA) : **`bo-statistiques`**.

## Mots de Timothée

> « Dans le Back-office, ajouter un onglet pour voir quels chants apparaissent le plus dans les setlists,
> avec le nombre de fois, le pourcentage etc… » (03/10/2026)

## Ce que le code montre (04/10/2026)

- **Une setlist** (`FSSetlist`, `src/lib/firebase/setlists.ts:23-42`) : `category` (le service), `date`
  (`AAAA-MM-JJ`, `SetlistForm.tsx:95`), `leader` (la présidence : **un texte**, pris dans le planning ou
  saisi, `SetlistForm.tsx:197-214`), `items`, `isPrivate`, `isDraft` (brouillon écrit jusqu'à « Publier »,
  l. 264, 482 ; abandonné, il reste). Un élément (`src/types/setList.ts:41-79`) est un chant (`songSlug`,
  `keyOverride`), une fusion (`fusionSongs`, chacun son `keyOverride`, l. 10-21) ou une transition ; les
  deux dernières ont `songSlug: ""` (`src/lib/setlist/buildSetlistItems.ts:54, 69`).
- **Lecture** : `getSetlists()` (`setlists.ts:137-155`) lit **toute** la collection (`runQuery` sans
  limite) et écarte privées et brouillons (l. 154) ; l'onglet Setlists, Mes services et Harmonie
  l'appellent à chaque visite. Sur une erreur HTTP, elle rend `[]` (l. 149). Règles : `read: if
  signedIn()` sur toutes les setlists (`firestore.rules:232-233`), choix assumé du CLAUDE.md ; un admin
  voit toute setlist non privée (`canSeeSetlist`, `src/lib/access.ts:276`).
- **Passée** : « Archives » prend `date < aujourd'hui` (`src/app/setlists/page.tsx:49, 128`). **Volume** :
  92 setlists hors brouillons du 24/05 au 20/09/2026 (`docs/tonalites-recommandees.md:10-11`), ~5 par
  semaine : une centaine aujourd'hui, ~280 de plus par an. **L'historique commence le 24/05/2026.**
- **Tonalité** : un chant ajouté prend `keyOverride: recommendedKey ?? null` (`SetlistForm.tsx:391`) ; la
  liste affiche `keyOverride ?? originalKey` (`ListView.tsx:206, 250`). Des originales en `C#`, `G#`
  côtoient les noms en bémols du sélecteur (`src/lib/transpose.ts:268-270`) ; `noteToIndex` (l. 18-25).
- **Deux comptes existent, chacun ses règles.** `scripts/recommended-keys.ts` n'écarte que les brouillons
  (l. 46 : privées et setlists à venir comprises ; son « 92 … au 20/09 » date du 14/09), compte les chants
  de fusion, ignore les transitions (l. 49-53) et compte deux fois un chant repris. Harmonie
  (`src/app/harmonie/[...fiche]/FicheClient.tsx:53-58`) ne compte que `it.songSlug` (pas les chants de
  fusion) et affiche « N fois en setlist » aux pianistes et guitaristes (l. 230-233 ; lot 9,
  `spec-harmonie.md:119-120`).
- **Index** : `public/songs-index.json`, 378 chants (186 `fr`, 192 `zh`), slug = nom du fichier
  (`src/lib/content/loadSongs.ts:48`), trié A→Z, pinyin pour le chinois (`scripts/build-index.ts:26-36`).
  Pas d'anciens slugs : un `.cho` renommé est un nouveau chant ; la setlist montre alors le slug
  (`ListView.tsx:261`).
- **Filtres existants** : `ALL_CATEGORIES`, 10 catégories (`setlists.ts:8-19`), en « cultes / groupes »
  dans l'onglet Setlists (`setlists/page.tsx:340-359`) ; `normalizeName` plie accents, casse et
  ponctuation (`src/lib/planning/names.ts:62-79`).
- **Droits** : `ADMIN_EMAILS`, `isAdminUser` (`access.ts:12-16, 27-29`), miroir `isAdmin()`
  (`firestore.rules:43-49`) ; filtre client sans règle déjà assumé : `canUseHarmonie` (`access.ts:194-202`) ;
  `/admin` refuse le non-admin : « Page réservée aux administrateurs. » (`src/app/admin/page.tsx:255-266`).
- **Interrupteur** : `BACK_OFFICE` (`src/lib/backOffice.ts:5`), `notFound()` côté serveur
  (`src/app/equipes/page.tsx:11`), adresses en 404 listées dans `tests/back-office-coupe.spec.ts:56`.
- **Planche** : widget « Chants les plus joués » au tableau de bord (cinq premiers, réglage Période) ;
  entrée « Statistiques · admins » dans « Plus » et dans la barre personnalisable. **Son « 92 » vient du
  calcul des tonalités** (privées et setlists à venir comprises) : la page en comptera moins.

## Décisions de Timothée — à ne pas rouvrir

| # | Date | Décision |
| --- | --- | --- |
| T1 | 03/10/2026 | **Admins seulement.** |
| T2 | 03/10/2026 | Setlists **publiées passées** : ni brouillons, ni privées. |
| T3 | 03/10/2026 | Un chant compté **une fois par setlist** ; chants de fusion comptés ; transitions ignorées. |
| T4 | 03/10/2026 | Colonnes : rang, chant, nombre, %, dernière fois, tonalité la plus jouée, tendance. |
| T5 | 03/10/2026 | Filtres : période, service, langue, présidence. Listes « Jamais joués » et « À redécouvrir ». |
| T6 | 03/10/2026 (soir) | Menu du Back-Office à 8 entrées, dont « Statistiques » ; planche validée. |
| T7 | 04/10/2026 | Pas de « joué le … » dans l'éditeur de setlist : les données de jeu restent aux admins. |
| T8 | 04/10/2026 | Tout part en ligne à la fin du chantier : l'interrupteur `BACK_OFFICE` est retiré, la branche fusionnée sur `main`. |

## Décisions proposées ici

| # | Proposition | Raison lue dans le code |
| --- | --- | --- |
| Q1 | **Calcul dans le navigateur** : `getSetlists()` tel quel, `/songs-index.json`, une fonction pure. Pas de route serveur. | Les setlists sont déjà lisibles de tout connecté et l'onglet Setlists les lit toutes à chaque visite : ouvrir la page coûte **une visite de l'onglet Setlists** (une lecture par document, ~100 à 150 aujourd'hui ; quota gratuit 50 000 par jour). Une route `firebase-admin` lirait autant, ne cacherait rien (les setlists restent lisibles) et ferait une route de plus à garder et à tester. Au-delà de ~1 000 setlists : lire à partir d'une date (`where date >=`) ou un instantané du cron, à rouvrir alors. |
| Q2 | **Droit** : `canVoirStatistiques(user) = isAdminUser(user)` dans `access.ts`, **sans règle Firestore**. Non-admin : entrée absente partout (menu, « Plus », barre personnalisable, catalogue des widgets) ; adresse tapée : « Page réservée aux administrateurs. ». Sans compte : la connexion (`RequireAuth`). | Rien de nouveau n'est écrit ni lu : rien à protéger côté serveur (précédent `canUseHarmonie`). Message repris de `/admin`. |
| Q3 | **Publiée** = `!isDraft && !isPrivate`, le filtre de `getSetlists`. **Passée** = `date` (ses dix premiers caractères) `< aujourd'hui`, la règle de « Archives » : la setlist d'un dimanche compte dès le lundi. Sans date valide : pas comptée. | Exactement ce que l'admin voit déjà dans l'onglet Setlists. |
| Q4 | **Chants d'une setlist** : les éléments dans l'ordre ; transition ignorée ; fusion = chacun de ses `fusionSongs` ; **chaque slug une fois**, même s'il revient seul et dans une fusion ; sa tonalité est celle de sa **première** apparition. | T3 ; la marche de `recommended-keys.ts:49-53`, sans le double compte. |
| Q5 | **Tonalité jouée** = `keyOverride`, sinon l'originale de l'index ; modulations (`sectionKeys`) ignorées. Deux orthographes d'une même hauteur (`C#`, `Db`) se regroupent sous la plus fréquente (`noteToIndex` ; un nom inconnu comme `Am` reste à part). Ex aequo : toutes, séparées par « / », la plus récente d'abord (la planche montre « Db / C »). | `null` = l'originale (`SetlistForm.tsx:391`) — celle d'**aujourd'hui** : un `.cho` changé de tonalité déplace ses anciennes setlists, limite acceptée. |
| Q6 | **%** = setlists où figure le chant / setlists comptées (après période, service, présidence), arrondi à l'unité ; « < 1 % » plutôt que « 0 % ». | La planche le confirme : 12 / 92 → « 13 % », 11 / 92 → « 12 % ». |
| Q7 | **Période** : 3, 6, 12 mois (de la même date N mois plus tôt jusqu'à hier), « Depuis le début », « Dates libres » (du … au …, bornes comprises, toujours avant aujourd'hui). **Par défaut : 12 mois**, comme la planche. | Aujourd'hui, « 12 mois » = tout l'historique. |
| Q8 | **Service** = la catégorie, un seul choix, les 10 de `ALL_CATEGORIES` présentées comme dans l'onglet Setlists, plus toute catégorie inconnue trouvée dans les données. **Présidence** = le texte `leader`, regroupé par `normalizeName`, sous sa graphie la plus fréquente, A→Z. **Langue** = celle du **chant** (« FR et 中文 », « FR », « 中文 ») : elle retire des lignes, pas des setlists ; le % ne bouge pas. | `leader` n'est pas un compte. Les étiquettes FR / 中文 de la planche sont sur les chants. |
| Q9 | **Rang et tri** : « # » = rang au nombre de setlists, ex aequo départagés par la dernière fois (la plus récente d'abord) puis le titre ; il suit le chant quand on trie. En-têtes cliquables : Chant, Setlists (par défaut), Dernière fois, Tendance (`aria-sort`). Toutes les lignes, sans pagination. | La planche numérote 1 à 12 même à égalité et ne montre pas de tri. |
| Q10 | **Tendance** = setlists de la seconde moitié − setlists de la première, coupées à la date du milieu entre la première et la dernière setlist comptée. « +3 » en vert, « −1 » en rouge (couleurs déjà employées par le site), « = » ; « — » s'il y a moins de deux dates. | Comparer à la période d'avant laisserait la colonne vide : l'historique commence le 24/05/2026 (question 1). |
| Q11 | **Jamais joués** = les chants de l'index absents des setlists comptées (mêmes filtres), dans l'ordre A→Z de l'index, avec leur dernière fois toutes dates confondues (mêmes service et présidence) ou « jamais ». **À redécouvrir** = au moins **3** setlists **avant** la période, **aucune pendant**, triés par ce nombre. « Depuis le début » n'a pas d'avant : la liste le dit. | Les pastilles de période gardent le même sens dans les trois vues. |
| Q12 | **Chant supprimé ou renommé** (slug absent de l'index) : une ligne au nom du slug, mention « absent du recueil », sans lien ni langue ; écartée par un filtre de langue ; jamais dans « Jamais joués ». | Comme la liste d'une setlist (`ListView.tsx:261`) ; on ne cache pas des passages réels. |
| Q13 | **Lien** : le titre ouvre `/songs/{slug}`. Vue, période, tri et filtres vivent dans l'URL : le retour retrouve l'écran. | Patron de l'onglet Setlists (`src/hooks/useSetlistsNavState.ts:10-16`). |
| Q14 | **Français seul** ; **export** hors périmètre ; page derrière `BACK_OFFICE` (`notFound()`), garde retirée avec l'interrupteur en fin de chantier (T8). | L'administration est exclue du 中文 (`spec-nouveaux-membres.md:34-39`). |

## Objectif

Un admin voit, dans le Back-Office, quels chants reviennent le plus dans les setlists (nombre, part,
dernière fois, tonalité la plus jouée, tendance), filtre par période, service, langue et présidence, et
voit les chants jamais joués et ceux à redécouvrir. Personne d'autre ne voit ces chiffres ; rien n'est
écrit dans la base.

**Réussite** : horloge au 04/10/2026, setlists simulées (publiées passées, dont une avec un même chant
seul et en fusion, une avec une transition, trois d'avant juillet ; un brouillon, une privée, une du
11/10). Un admin ouvre Back-Office › Statistiques : « Setlists comptées » = les publiées passées ; le
chant repris compte **1** ; chaque % = n / setlists comptées ; la tonalité suit `keyOverride` ou
l'originale ; « Groupe Paix » réduit les setlists comptées, « 中文 » retire les lignes FR sans changer
les % ; trier par « Dernière fois » laisse les rangs ; un titre ouvre la page du chant et le retour
retrouve les filtres ; « À redécouvrir » sur 3 mois montre le chant joué trois fois avant juillet ; un
responsable non admin ne voit l'entrée nulle part et l'adresse lui répond « Page réservée aux
administrateurs. » ; interrupteur coupé, 404. Sur les trois appareils.

## Modèle

**Aucune donnée nouvelle, aucune écriture, aucune règle Firestore.** Entrées : `getSetlists()` (déjà
réduite aux publiées), `/songs-index.json`, la date du jour, passée en argument (testable sans horloge).
Calcul pur dans `src/lib/stats/chantsJoues.ts` :

```ts
export type Periode = { mois: 3 | 6 | 12 } | "debut" | { du: string; au: string }; // AAAA-MM-JJ, bornes comprises
export type FiltresStats = { periode: Periode; service: string | null; langue: "fr" | "zh" | null; presidence: string | null }; // null = tout (Q8)
export type LigneChant = {
  slug: string; titre: string; langue: "fr" | "zh" | null;  // null = absent du recueil
  rang: number; setlists: number; part: number;              // part de 0 à 1
  derniereFois: string; tonalites: string[]; tendance: number | null; // plusieurs tonalités = ex aequo ; null = « — »
};
export type StatsChants = {
  comptees: { nombre: number; du: string | null; au: string | null };
  plusJoues: LigneChant[];
  jamaisJoues: { slug: string; titre: string; langue: "fr" | "zh"; artiste: string; derniereFois: string | null }[];
  aRedecouvrir: { slug: string; titre: string; langue: "fr" | "zh" | null; avant: number; derniereFois: string; tonalites: string[] }[];
};
export function chantsDeLaSetlist(s: Pick<FSSetlist, "items">): { slug: string; tonalite: string | null }[];
export function statsChants(setlists: FSSetlist[], index: SongIndexEntry[], f: FiltresStats, aujourdhui: string): StatsChants;
```

- **Partagé avec `scripts/recommended-keys.ts`** : la marche dans les éléments (transitions ignorées,
  fusions dépliées) et la règle « `keyOverride`, sinon l'originale », écrites une fois dans
  `chantsDeLaSetlist`. Le script n'est **pas** touché dans U7 (question 5).
- **Widget « Chants les plus joués »** (catalogue de U6) : `statsChants` avec sa période, cinq premières
  lignes (question 4).

## Écrans

Planche : **`bo-statistiques`** (ordinateur). Téléphone, tablette et vues « Jamais joués » et « À
redécouvrir » en sont **déduits**, sans nouvelle proposition visuelle. Look 5C1. Étiquettes FR (bleu) et
中文 (rouge) gardées : la tonalité est ici un texte, l'étiquette seule dit la langue. Barres en CSS,
décoratives (`aria-hidden`), nombres en texte : aucune bibliothèque de graphiques.

**Ordinateur** (barre latérale dépliée ou réduite) et **tablette paysage** (barre réduite) : la planche à
l'identique. Titre « Chants les plus joués », sous-titre « Visible par les admins seulement », sélecteur
« Les plus joués · Jamais joués · À redécouvrir » à droite ; filtres « 3 mois », « 6 mois », « 12 mois »,
« Depuis le début », « Dates libres » (ouvre « du … au … », champs date natifs), un trait, « Tous les
services ▾ », « FR et 中文 ▾ », « Toutes les présidences ▾ » (des `<select>` en pastilles) ; cartes
« Setlists comptées » (« publiées, du 24/05 au 20/09 ») et « Les 10 premiers » (« 12 · 13 % ») ; tableau
pleine largeur : « # », « Chant » + étiquette, « Setlists », « % des setlists », « Dernière fois »
(« 20/09 », l'année si ce n'est pas l'année en cours), « Tonalité la plus jouée », « Tendance ». La note
« Aperçu : … » de la planche n'existe pas sur la page.

**Tablette portrait** (barres du haut et du bas : U6) : même contenu en une colonne — sélecteur sous le
titre, filtres sur deux lignes, cartes l'une sous l'autre, tableau complet (en-têtes sur deux lignes).

**Téléphone** : sélecteur pleine largeur ; filtres repliés à la ligne ; « Setlists comptées » sur une
ligne ; « Les 10 premiers » en barres plus courtes ; le tableau devient une liste (ligne 1 : rang, titre,
étiquette ; ligne 2 : « 12 setlists · 13 % · 20/09 · Ab · +3 ») avec un menu « Trier par ».

**Autres vues** : filtres et « Setlists comptées » gardés, « Les 10 premiers » effacé. « Jamais joués » :
« N chants sur 378 », colonnes Chant, Artiste, Dernière fois (date ou « jamais »). « À redécouvrir » :
#, Chant, Avant la période, Dernière fois, Tonalité la plus jouée.

**États** : « Calcul… » ; aucune setlist lue → « Impossible de lire les setlists. » + « Réessayer » (la
base en compte plus de cent : zéro veut dire un échec) ; période vide → « Aucune setlist publiée sur
cette période. » ; « À redécouvrir » vide faute d'historique → « L'historique commence le 24/05/2026 :
choisis une période plus courte. »

**Entrée** : « Statistiques », 8e entrée du menu (icône `ChartColumn` de lucide, déjà installé), « Plus »
(`bo-telephone-plus`), barre personnalisable (`bo-telephone-barre-perso`) ; admins seulement (menus : U6).

## Ce qui sera construit — cinq tranches

- **S1 — Le calcul** : `src/lib/stats/chantsJoues.ts`, tout le tableau Q3–Q12. Vérifiable seul :
  `tests/statistiques-calcul.spec.ts`.
- **S2 — Le droit et l'adresse** : `canVoirStatistiques` (`src/lib/access.ts`) ; la page (route proposée
  `/back-office/statistiques`) : `notFound()` interrupteur coupé, `RequireAuth`, message au non-admin ;
  l'entrée du menu pour les admins.
- **S3 — « Les plus joués »** : `StatistiquesClient.tsx` — lecture, filtres, URL, deux cartes, tableau
  trié, liens, états ; trois dispositions.
- **S4 — « Jamais joués » et « À redécouvrir »** : les deux vues et leurs messages.
- **S5 — Le widget** (si la question 4 dit oui) : nombre de setlists, cinq premiers, réglage Période
  (3 / 6 / 12 mois / Depuis le début) ; admins seulement.

## Tests (Playwright, trois appareils, écrits avant le code)

`tests/statistiques-calcul.spec.ts`, fonctions pures importées de `src/lib/stats/` :
- comptées : publiée passée oui ; brouillon, privée, setlist du jour, à venir, sans date : non ;
- un chant seul et en fusion dans la même setlist : 1 ; chants de fusion comptés ; transitions non ;
- tonalité : `keyOverride` sinon l'originale, première apparition, `C#` et `Db` regroupés, ex aequo
  « Db / C » la plus récente d'abord ; % arrondi et « < 1 % » ; dernière fois ; rang ; tendance ;
- filtres : bornes des périodes, service, présidence par `normalizeName`, langue sans effet sur le
  dénominateur ; jamais joués ; à redécouvrir (rien depuis le début) ; slug absent de l'index.

`tests/statistiques.spec.ts`, setlists simulées (`signInAs`, `fakeFirestore`), horloge fixée
(`page.clock.setFixedTime`) :
- un admin voit l'entrée, la page et les nombres du jeu d'essai ; chaque filtre change ce qu'il doit, et
  rien d'autre ; trier par « Dernière fois » ou « Tendance » laisse les rangs ;
- un titre ouvre `/songs/{slug}`, le retour retrouve vue et filtres ; « Jamais joués », « À
  redécouvrir », messages vide et échec (lecture refusée simulée) ;
- un responsable non admin (droit de planning) : aucune entrée, l'adresse affiche « Page réservée aux
  administrateurs. » ; sans compte : la connexion ; captures regardées sur les trois appareils.

`tests/back-office-coupe.spec.ts` : l'adresse répond 404, interrupteur coupé.

## Hors périmètre

- **Toujours** : admins seulement ; publiées passées ; une fois par setlist ; lecture REST seule, aucune
  écriture ; trois appareils ; données simulées dans les tests.
- **Demander avant** : un export (CSV, PDF) ; une route serveur ou un instantané du cron ; aligner
  `scripts/recommended-keys.ts` ou le compteur d'Harmonie sur ce calcul ; tout chiffre de jeu hors du
  Back-Office ; d'autres statistiques (présidences, tonalités, thèmes) ; une dépendance npm.
- **Jamais** : « joué le … » dans l'éditeur ou la recherche des chants (T7) ; durcir les règles des
  setlists sans nouvelle demande (choix assumé du CLAUDE.md) ; lire la base de production pour tester ;
  toucher aux couleurs gelées.

## Questions ouvertes

1. **Tendance par moitiés de la période ?** Comparer à la période d'avant laisserait la colonne vide
   jusqu'au 24/11/2026 sur 3 mois, jusqu'au 24/05/2028 sur 12 mois (le défaut). *Recommandation : oui.*
2. **« À redécouvrir » = au moins 3 setlists avant la période, aucune pendant ?** Vide sur 12 mois jusqu'à fin
   mai 2027 au moins, utile dès maintenant sur 3 mois. *Recommandation : oui.*
3. **Le filtre de langue porte sur les chants** (le % garde toutes les setlists), et non sur la langue
   de la setlist (`fr`, `zh`, `mixed`) ? *Recommandation : oui.*
4. **Le widget « Chants les plus joués » se construit dans U7** (S5), réservé aux admins, U6 lui gardant
   sa place au catalogue ? *Recommandation : oui, il a besoin du calcul de U7.*
5. **`scripts/recommended-keys.ts` reste tel quel ?** Il compte aussi privées et setlists à venir, et deux
   fois un chant repris : la tonalité la plus jouée de la page pourra différer un peu de la liste du
   14/09. *Recommandation : oui ; l'aligner sur `chantsDeLaSetlist` le jour où on le relance.*
6. **Harmonie garde « N fois en setlist »** pour les pianistes et guitaristes (lot 9), bien que les
   données de jeu restent aux admins (T7) ? Son compte oublie les chants de fusion et inclut les setlists
   à venir. *Recommandation : oui, tel quel ; T7 vise l'éditeur.*
7. **Route `/back-office/statistiques` ?** *Recommandation : oui, si U6 retient le préfixe `/back-office`.*

## Commandes

```bash
npm test -- tests/statistiques-calcul.spec.ts tests/statistiques.spec.ts   # PW_PORT=3000 si un next dev tourne déjà
npm test -- tests/back-office-coupe.spec.ts                                  # second serveur, interrupteur coupé
npx tsc --noEmit
npm run lint
```

## Avancement

Questions ouvertes 1 à 7 : la recommandation de chacune est retenue (go du 04/10/2026, redit le 05/10/2026).

### 05/10/2026 — S1, le calcul : faite (commit « feat(U7): S1 — le calcul des statistiques des chants », branche `lot/u7-statistiques`)

- `src/lib/stats/chantsJoues.ts`, pur (aucune lecture, aucune écriture) : `chantsDeLaSetlist`, `statsChants`
  (types de « Modèle » à l'identique), plus `bornesDeLaPeriode` (Q7), `choixDesFiltres` (listes des pastilles
  Service et Présidence, Q8), `libellePart` (« 13 % », « < 1 % », Q6) et `libelleTendance` (« +3 », « −1 »,
  « = », « — », Q10). Le module n'importe `setlists.ts` qu'en type : il se charge sans Firebase.
- `tests/statistiques-calcul.spec.ts` : 26 tests × 3 appareils, écrits avant le code et vus rouges (26 sur 26),
  puis verts (78) ; contre-épreuve faite (trois règles cassées exprès → quatre tests rouges).
- Choix pris faute de réponse dans la spec (à confirmer par Timothée, sinon ils restent) :
  1. **Graphie d'une tonalité** : à égalité de fréquence entre `C#` et `Db`, la plus récente.
  2. **Tendance** : une setlist datée pile du milieu ouvre la seconde moitié.
  3. **« N mois »** depuis un jour qui n'existe pas N mois plus tôt : le dernier jour du mois (31/12 − 3 mois
     = 30/09).
  4. **Filtre de langue** : les rangs se renumérotent parmi les lignes gardées (« 中文 » : le 1er chant chinois
     est n° 1 ; « Les 10 premiers » = les dix premiers chants chinois). Le % ne bouge pas (Q8).
  5. **Listes des filtres** : présidences et services inconnus lus dans toutes les setlists publiées passées,
     sans tenir compte de la période ni de l'autre filtre (les pastilles ne bougent pas quand on filtre). Les
     dix catégories connues sont passées par l'appelant (`ALL_CATEGORIES`), puis les inconnues, A→Z.
  6. **« Jamais joués »** suit aussi le filtre de langue (« mêmes filtres », Q11).
  7. **« À redécouvrir »** : à égalité de nombre, la dernière fois la plus récente d'abord, puis le titre ; la
     tonalité la plus jouée y est celle des setlists d'avant la période.
  8. **« Setlists comptées »** : `du` / `au` sont les dates de la première et de la dernière setlist comptée
     (« du 24/05 au 20/09 »), pas les bornes de la période. Dates libres : la fin est ramenée à hier.
  9. **Titre** départageant les ex aequo : ordre alphabétique français (le latin avant le chinois).
  10. Un `keyOverride` vide (`""`) vaut l'originale, comme dans `scripts/recommended-keys.ts`.
- Reste : S2 (droit et adresse), S3 (« Les plus joués »), S4 (« Jamais joués », « À redécouvrir »), S5 (widget).
  « Dernière fois » écrit « 20/09 » (l'année hors année en cours) : à faire dans S3, à l'affichage.
- À faire par Timothée : rien pour S1 (aucune règle Firestore, aucune donnée).

### 05/10/2026 — S2, le droit et l'adresse : faite (commit « feat(U7): S2 — … », branche `lot/u7-statistiques`, après fusion de `lot/u6-back-office`)

- `canVoirStatistiques(user)` = `isAdminUser(user)` dans `src/lib/access.ts`, sans règle Firestore (Q2) ;
  `entreesBackOffice` s'en sert pour l'entrée « statistiques », retirée de `ENTREES_A_VENIR` (U6, Q17) : un admin
  a 7 entrées (8 avec U8), « Statistiques » en dernier. Le widget « Chants les plus joués » reste dans
  `WIDGETS_A_VENIR` jusqu'à S5.
- Page `src/app/back-office/statistiques/page.tsx` (question 7) : titre « Chants les plus joués », sous-titre
  « Visible par les admins seulement », pleine largeur comme le tableau de bord ; responsable non admin :
  « Page réservée aux administrateurs. » (icône et message de `/admin`), en français seul (Q14).
- `tests/statistiques.spec.ts` (nouveau, ajouté à `SPECS_GRAND_ECRAN`) : 6 tests × 5 projets (ordinateur,
  téléphone, tablette, tablette-paysage, ordinateur-1440), écrits avant le code et vus rouges, puis verts ;
  captures regardées (barre latérale : « Statistiques » courante, icône `ChartColumn`). `tests/back-office-espace.spec.ts`
  passe d'un admin à 6 entrées à 7 ; `tests/back-office-coupe.spec.ts` : `/back-office/statistiques` répond 404.
- Choix pris faute de réponse dans la spec :
  1. **Sans compte**, ou membre sans droit de responsable : la garde de l'espace (U6, `back-office/layout.tsx`)
     répond avant la page — « Réservé aux responsables. » + « Se connecter », qui ramène à
     `/back-office/statistiques`. Pas de `RequireAuth` en plus : il ne serait jamais atteint.
  2. Interrupteur coupé : le `notFound()` du gabarit `/back-office` suffit, la page n'en ajoute pas.
  3. La page attend la fin de la lecture du compte (`useAuth`) avant de refuser, pour ne pas montrer le refus
     un instant à un admin.
- Reste : S3 (« Les plus joués » : `StatistiquesClient.tsx` sous le titre, sélecteur des vues dans `action`
  de `PageTitle`), S4, S5. Sur téléphone et tablette en portrait, l'entrée vit dans la liste du tableau de bord
  en attendant « Plus » et la barre personnalisable de U6 (B6), qui liront `entreesBackOffice`.
- À faire par Timothée : rien pour S2 (aucune règle Firestore, aucune donnée).

### 05/10/2026 — S3, « Les plus joués » : faite (commit « feat(U7): S3 — … », branche `lot/u7-statistiques`)

- `src/app/back-office/statistiques/StatistiquesClient.tsx`, sous le titre de la page : lecture (`getSetlists()` et
  `/songs-index.json` en parallèle, aucune écriture), filtres (période en pastilles, « Dates libres » qui ouvre
  « Du … Au … » en champs date natifs, puis Service, Langue, Présidence en `<select>` pastilles), cartes
  « Setlists comptées » et « Les 10 premiers » (barres CSS `aria-hidden`, nombres en texte), tableau aux en-têtes
  cliquables (`aria-sort`) sur tablette et ordinateur, liste + menu « Trier par » sur téléphone ; titre = lien vers
  `/songs/{slug}`, chant absent du recueil : son slug, « absent du recueil », sans lien ni étiquette. États :
  « Calcul… », « Impossible de lire les setlists. » + « Réessayer », « Aucune setlist publiée sur cette période. ».
- L'adresse porte l'écran (Q13) : `periode` (3, 6, debut, libre ; 12 par défaut, absent), `du`, `au`, `service`,
  `langue`, `presidence`, `tri` (chant, derniere, tendance ; setlists par défaut), `sens` (s'il n'est pas celui
  par défaut de la colonne). Tenue à jour par `history.replaceState` : le retour depuis un chant retrouve tout.
- `tests/statistiques.spec.ts` : 15 tests S3 (horloge au 04/10/2026, recueil et setlists simulés — six publiées
  passées, un brouillon, une privée, une du jour, une à venir), écrits avant le code et vus rouges (15 sur 15),
  puis verts sur les cinq projets ; avec S2, `statistiques-calcul`, `back-office-espace` et `back-office-coupe` :
  294 verts. Captures regardées aux cinq tailles et comparées à `bo-statistiques` et `bo-statistiques-telephone`.
- Choix pris faute de réponse dans la spec :
  1. **Sens du tri** : Chant A→Z, Setlists, Dernière fois et Tendance du plus grand au plus petit ; un second clic
     sur l'en-tête renverse tout l'ordre. Les ex aequo gardent l'ordre des rangs ; sans tendance (« — ») en dernier.
     Sur téléphone, le menu « Trier par » prend le sens par défaut de la colonne.
  2. **« Dates libres »** s'ouvre sur la première setlist comptée de la vue courante et hier ; un champ vidé ne
     borne plus ce côté.
  3. **Service** : le menu reprend les groupes de l'onglet Setlists (« Réunions principales », « Groupes »), noms
     en français ; une catégorie inconnue trouvée dans les données va dans « Autres ».
  4. **Langue sans chant** (setlists comptées, mais aucun chant de cette langue) : « Aucun chant dans cette langue
     sur cette période. », la carte « Setlists comptées » restant affichée.
  5. **Recueil illisible** : « Impossible de lire le recueil. » + « Réessayer », au lieu de lignes au nom des slugs.
  6. Période vide : filtres et message seuls, sans les cartes.
  7. Le sélecteur de vues (« Les plus joués · Jamais joués · À redécouvrir ») n'est pas encore affiché : il vient
     avec S4, avec ses deux vues et le paramètre d'adresse `vue`.
- Reste : S4 (« Jamais joués », « À redécouvrir », le sélecteur de vues dans `action` de `PageTitle`), S5 (widget).
- À faire par Timothée : rien pour S3 (aucune règle Firestore, aucune donnée) ; valider l'écran en local.

### 05/10/2026 — S4, « Jamais joués » et « À redécouvrir » : faite (commit « feat(U7): S4 — … », branche `lot/u7-statistiques`)

- `StatistiquesClient.tsx` porte maintenant le titre (repris de `page.tsx`) et le sélecteur « Les plus joués · Jamais
  joués · À redécouvrir » (boutons `aria-pressed` dans un groupe « Vue », au style du sélecteur App · Back-Office) :
  à droite du titre à partir de 1024 px, dessous en dessous, pleine largeur sur téléphone. La vue vit dans l'adresse
  (`vue=jamais-joues`, `vue=a-redecouvrir` ; absente = « Les plus joués ») avec les filtres : le retour depuis un chant
  la retrouve. Filtres et carte « Setlists comptées » gardés dans les trois vues, « Les 10 premiers » effacé.
- **Jamais joués** : « N chants sur M », puis Chant (lien + étiquette), Artiste, Dernière fois (« 28/06 » ou « jamais ») ;
  tableau sur tablette et ordinateur, liste sur téléphone (titre ; « artiste · dernière fois »).
- **À redécouvrir** : #, Chant, Avant la période, Dernière fois, Tonalité la plus jouée ; liste sur téléphone
  (« 3 avant la période · 28/06 · G »). Messages : « L'historique commence le JJ/MM/AAAA : choisis une période plus
  courte. » (aucune setlist avant la période, ou « Depuis le début ») ; « Aucun chant à redécouvrir sur cette période. ».
- `SEUIL_A_REDECOUVRIR` exporté de `src/lib/stats/chantsJoues.ts` (aucun calcul changé).
- `tests/statistiques.spec.ts` : 7 tests S4 (sélecteur, jamais joués, à redécouvrir sur 3 mois, sans historique,
  période vide, retour depuis un chant, captures), écrits avant le code et vus rouges (7 sur 7), puis verts sur les
  cinq projets (139 verts, 1 sauté : en-têtes sur téléphone) ; `back-office-coupe` vert ; lint et `tsc` propres.
  Captures regardées aux cinq tailles.
- Choix pris faute de réponse dans la spec :
  1. **« N chants sur M »** : M = les chants du recueil de la langue choisie (378 sans filtre de langue).
  2. **Début de l'historique** : la première setlist publiée passée, tous services et présidences (en ligne :
     24/05/2026), lue dans les données plutôt qu'écrite en dur. Sans setlist avant le début de la période, la vue
     montre ce message, même avec un service ou une présidence choisis.
  3. **Une phrase sous « À redécouvrir »** rappelle la règle : « Joués au moins 3 fois avant le 04/07, aucune fois
     depuis ».
  4. **Période vide** : « Aucune setlist publiée sur cette période. » dans les trois vues (sans liste de jamais joués).
  5. **Jamais joués vide** : « Tous les chants ont été joués sur cette période. ».
  6. Ni tri ni rang dans « Jamais joués » (ordre du recueil, Q11) ; « À redécouvrir » numérote dans son ordre (Q11).
- Reste : S5 (le widget « Chants les plus joués » du tableau de bord).
- À faire par Timothée : rien pour S4 (aucune règle Firestore, aucune donnée) ; valider les deux vues en local.

### 05/10/2026 — S5, le widget « Chants les plus joués » : faite (commit « feat(U7): S5 — … », branche `lot/u7-statistiques`, après fusion de `lot/u6b-tableau-de-bord`)

- `src/components/backOffice/widgets/WidgetChants.tsx` (widget 7 de la table de U6, taille M) : `statsChants` sur la
  période réglée, sans autre filtre ; en tête « 7 setlists », lien vers `/back-office/statistiques` sur la même période
  (`?periode=3`, `6`, `debut` ; rien pour 12 mois) ; puis les cinq premiers comme la planche (`W_CHANTS`) : titre (lien
  vers le chant, slug sans lien s'il est absent du recueil), barre CSS `aria-hidden`, nombre de setlists en texte.
  États : chargement, « Lecture impossible pour l'instant. » (aucune setlist lue ou recueil illisible), « Aucune setlist
  publiée sur cette période. ».
- Réglage « Période » (`src/lib/tableauDeBord/reglages.ts`) : 3 mois, 6 mois, 12 mois (défaut), Depuis le début ; clé
  `periode` (`3m`, `6m`, `12m`, `tout`) déjà prévue par U6 dans `Reglages`. `src/lib/access.ts` : « chants » sort de
  `WIDGETS_A_VENIR` et suit `canVoirStatistiques` (admins seuls) ; le défaut d'un admin le place après « Prochains
  évènements ». Libellés FR et 中文 (`tableauDeBord.chants.*`, `tableauDeBord.reglages.periode|mois|depuisLeDebut`).
- `tests/statistiques.spec.ts` : 10 tests S5 (droit et défaut, réglage, cinq premiers et barres, « 3 mois » écrit et
  lien suivi, « Depuis le début » jusqu'à la page, période vide, lecture impossible, responsable non admin, 中文,
  captures), écrits avant le code et vus rouges (9 sur 10 ; le responsable non admin passait déjà), puis verts sur les
  cinq projets. `tests/tableau-de-bord.spec.ts` et `tests/back-office-espace.spec.ts` (U6) : un admin a maintenant
  « chants » dans ses widgets permis et dans son défaut. Avec `statistiques-calcul`, `tableau-de-bord`,
  `back-office-espace` et `back-office-coupe` : 765 verts, 13 sautés, 1 rouge déjà connu et étranger à U7 (« l'ancien
  tableau des groupes n'a pas de colonne de plus » sur ordinateur, venu de U2, noté dans `spec-back-office.md`).
  Captures regardées aux cinq tailles, conformes à `W_CHANTS` de la planche.
- Choix pris faute de réponse dans la spec :
  1. **Le widget est traduit** (FR et 中文) comme tout le tableau de bord, bien que la page Statistiques soit en
     français seul (Q14) ; titres des chants tels quels.
  2. **« N setlists » est un lien** vers la page Statistiques sur la même période (la planche l'écrit en gris, sans
     dire où il mène) ; masqué quand rien n'est compté.
  3. Chaque ligne montre le **nombre** seul, comme la planche (pas le %).
  4. « Aujourd'hui » = celui de la page (date UTC du navigateur), pour que le widget et la page donnent le même nombre.
- Reste : rien pour U7. La garde `BACK_OFFICE` partira avec l'interrupteur en fin de chantier (T8).
- À faire par Timothée : rien pour S5 (aucune règle Firestore : le réglage s'écrit dans `backOffice/{uid}`, règle de
  U6) ; relire le 中文 (« {{count}} 份歌单 », « 时段 », « {{count}} 个月 », « 全部记录 », « 该时段没有已发布的歌单。 ») ;
  valider le widget en local.

### 05/10/2026 — fusion des versions finales de U6 et U6b : faite (« Merge branch 'lot/u6-back-office' … » puis « fix(U7): fusion — … », branche `lot/u7-statistiques`)

- `lot/u6-back-office` fusionnée (B2, B3, B6 et la relecture de U6) ; `lot/u6b-tableau-de-bord` y était déjà
  (« Already up to date »). Deux conflits, tous deux dans des tests, résolus en gardant les deux intentions :
  `back-office-coupe` (les nouvelles adresses de U6 **et** `/back-office/statistiques`, toutes en 404) ;
  `back-office-espace` (sur grand écran, le menu d'un admin finit par « Statistiques » ; sur téléphone et tablette
  en portrait, c'est la barre du bas de B6 : Accueil · Tâches · Planning · Évènements · Plus). `tsc` et lint propres.
- Ce que la fusion change pour U7 : la liste « Tes modules » de B1 sous le tableau de bord n'existe plus. Sur
  téléphone et tablette en portrait, Statistiques s'ouvre par « Plus » (sa carte à part, la dernière, planche
  `bo-telephone-plus`) ou en la cochant dans « Ta barre du bas » (indice « admins »).
- Correctifs de la fusion :
  1. **« Plus »** (`PagePlus.tsx`) : la carte Statistiques dit « Chants les plus joués · admins », comme la planche
     (B6 écrivait « Chants les plus joués » seul, la croyant absente de la planche).
  2. **`barre-back-office`** (B6, écrit quand Statistiques était « à venir ») : un admin a 7 entrées — 3 cartes dans
     « Plus » (Équipes, Messages, Statistiques), 7 cases dans la feuille, « en position … sur 7 » au clavier.
  3. **`tableau-de-bord`**, test de la relecture U6 « une seule lecture des setlists » : il ouvre un tableau de bord
     à ces deux widgets seuls. Le widget « Chants les plus joués » (S5) lit à part toutes les setlists passées (Q1,
     `getSetlists()`), ce qui faisait deux lectures dans le défaut d'un admin ; l'intention (« Ce dimanche » et
     « Setlists à préparer » partagent une lecture bornée) est gardée.
  4. **`statistiques.spec.ts`** (S2) : sur petit écran, le chemin passe par « Plus », la page marque « Plus » comme
     courant ; un responsable non admin n'a de Statistiques ni dans la barre ni dans « Plus ».
- Tests : `statistiques`, `statistiques-calcul`, `barre-back-office`, `tableau-de-bord`, `back-office-espace`,
  `back-office-admin`, `back-office-coupe` sur les cinq projets : 1 118 verts, 49 sautés (propres à un appareil),
  0 rouge. Passage rouge d'abord, avant les correctifs : 17 rouges, tous expliqués par les points 2 à 4 ; le point 1
  vu rouge seul, puis vert. Captures regardées : « Plus » et la feuille sur téléphone (conformes à
  `bo-telephone-plus` et `bo-telephone-barre-perso`), la page et le widget aux cinq tailles.
- Reste : rien pour U7. La garde `BACK_OFFICE` partira avec l'interrupteur en fin de chantier (T8).
- À faire par Timothée : rien de nouveau pour U7 (aucune règle Firestore) ; valider en local, sur téléphone,
  « Plus » › Statistiques. À savoir : le tableau de bord par défaut d'un admin lit toutes les setlists pour ce
  widget (une visite de l'onglet Setlists, Q1) en plus de la lecture bornée de U6.

### 05/10/2026 — relecture du lot : faite (commit « fix(U7): relecture — … », branche `lot/u7-statistiques`)

- Deux relectures, neuf constats, tous mineurs (aucun bloquant, aucun important). Corrigés :
  1. **Téléphone** : « 1 setlist » au singulier (la liste écrivait « 1 setlists ») ; « 4 setlists » inchangé.
  2. **« À redécouvrir », dates libres finies avant hier** : la phrase dit « Joués au moins 3 fois avant le 01/07,
     aucune fois du 01/07 au 31/08 » au lieu de « … aucune fois depuis », qui était faux pour un chant rejoué après
     la fin choisie. Le calcul ne change pas (Q11 : aucune setlist **pendant** la période). Jusqu'à hier : « depuis ».
  3. **« À redécouvrir », dates libres, « Du » vidé** (deux constats, un seul défaut) : « Choisis une date de début
     (« Du ») pour voir les chants à redécouvrir. » au lieu de « L'historique commence le … », qui accusait
     l'historique alors que c'est la borne qui manque. Un « Du » vidé ne borne toujours plus ce côté dans les deux
     autres vues (choix 2 de S3).
  4. **Service ou présidence de l'adresse absents des menus** (lien tapé ou retouché) : ignorés à la lecture ; le
     menu montre « Tous les services » ou « Toutes les présidences », l'adresse les perd, les chiffres suivent.
     Comparaison exacte avec les choix du menu (les liens viennent de la page elle-même).
  5. **La règle Q3 écrite une fois** : `veille` et `debutDeLHistorique` (la première setlist publiée passée) sont
     exportées de `src/lib/stats/chantsJoues.ts` ; `StatistiquesClient.tsx` ne refait plus ce calcul (sa copie
     oubliait brouillons et privées, sans effet tant que `getSetlists` les écarte). Les choix des menus sont
     calculés une fois, à la lecture.
  6. **Messages et menu sans test**, maintenant testés (comportement inchangé) : « Aucun chant dans cette langue sur
     cette période. », « Impossible de lire le recueil. » + « Réessayer », une catégorie inconnue dans le groupe
     « Autres » du menu Service, qui filtre (Q8).
- Constats écartés, avec la raison :
  - « Tous les chants ont été joués sur cette période. » et « Aucun chant à redécouvrir sur cette période. » étaient
    déjà testés (S4, « Jamais joués » et « À redécouvrir sur 3 mois ») : seuls les deux autres messages manquaient.
  - **Le widget relit toutes les setlists**, sans cache, puis la page Statistiques aussi : coût accepté par Q1 (une
    visite de l'onglet Setlists, ~150 lectures sur un quota de 50 000 par jour), laissé tel quel et écrit dans le
    test « une seule lecture des setlists » de `tests/tableau-de-bord.spec.ts`. S'il gêne un jour : un cache de
    module à durée de vie, partagé entre le widget et la page.
- Tests : 7 nouveaux dans `tests/statistiques.spec.ts` (bloc « relecture ») et 2 dans `tests/statistiques-calcul.spec.ts`,
  écrits avant le code ; les 5 changements de comportement et les 2 fonctions exportées vus rouges (16 échecs sur
  ordinateur, téléphone, tablette), puis verts ; les 3 tests de couverture (point 6) verts d'emblée, comme attendu.
  `statistiques`, `statistiques-calcul` et `back-office-coupe` sur les cinq projets : 488 verts, 7 sautés (propres à un appareil), 0 rouge. Captures regardées (téléphone :
  « 1 setlist » ; ordinateur : « À redécouvrir » sur 3 mois, « … aucune fois depuis » inchangé). `tsc` et lint
  propres (aucun avertissement dans les fichiers de U7).
- Reste : rien. **Lot U7 fini et relu.** La garde `BACK_OFFICE` partira avec l'interrupteur en fin de chantier (T8).
- À faire par Timothée : aucune règle Firestore à publier pour U7 ; valider en local (« Plus » › Statistiques sur
  téléphone ; « À redécouvrir » en dates libres) ; relire la phrase nouvelle « Choisis une date de début (« Du ») pour
  voir les chants à redécouvrir. » et le 中文 du widget (déjà listé en S5).
