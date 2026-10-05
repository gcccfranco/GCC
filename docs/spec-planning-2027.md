# Spec : lot U2 — Planning 2027 dans le Back-Office, export au modèle du Sheet

Spec écrite le 04/10/2026. **Validée et go le 04/10/2026** (réponses de Timothée en fin de spec) ; en cours de code dans une copie à part (agent). Le correctif P1 est codé et commité en local sur `ui/apple-design` (`b483d9d`), **non poussé** : rien ne part sur `main` sans un ordre de Timothée.

Lot U2 du chantier U (`feuille-de-route.md` § 3.U). Voisins : U3 petit déj (`spec-petit-dej.md`), U4 barre
latérale (`spec-navigation-grand-ecran.md`), U6 Back-Office (`spec-back-office.md`).

## Mots de Timothée

> « on ouvre maintenant dans l'app » (18/09/2026) ; « pour le planning il faudrait pouvoir modifier tous les
> plannings sur le site et pouvoir les exporter en CSV ou en PDF » (19/09/2026, `spec-planning-grille.md`).

Décisions de la réunion de l'équipe, troisième tour du 03/10/2026 (`feuille-de-route.md` § 3.U) :

> « **Planning 2027 dans le Back-Office** : colonnes et horaires de 2026 repris, **dates posées toutes seules**
> (tous les dimanches de l'année). » — « **Export des plannings au modèle du Sheet** (celui de `SHEET_ID`,
> surtout les groupes) : **PDF et .xlsx**, **tous les plannings**, chacun au modèle de son onglet ; **logo de
> l'église** sous son nom, **pas de bas de page**. »

Mémoire du grill : « le planning se fait dans l'app, plus dans un nouveau Sheet ». Le 04/10/2026 : « Écrans
réunions, réservations de la scène et export avec logo : **validés** » ; tout part en ligne ensemble, à la fin.

## Ce que le code montre (04/10/2026)

- **Treize grilles existent** (`GRILLES`, `src/lib/planning/grilles.ts:185-188`), colonnes en dur, un document par
  jour : `plannings/{key}/dimanches/{AAAA-MM-JJ}`. L'année est dans la date ; les règles n'en parlent pas
  (`firestore.rules:392-406`) : **écrire en 2027 ne demande aucune règle neuve**.
- **Une ligne n'existe que si un document ou une ligne du Sheet existe** (`fetchGrille`, `grille.ts:37-82` ;
  `fusionnerLignes`, `grilles.ts:237-241`). La première case d'un dimanche absent crée le document et recopie
  toute la ligne affichée (`semer`, `PlanningGrille.tsx:164`, `planningGrille.ts:20-42`).
- **Aucune page ne connaît l'année** : la période vient de `new Date().getFullYear()` (`culte/page.tsx:60`, `:82` ;
  `groupes/page.tsx:96`, `:145` ; `table/page.tsx:47-48`), les pilules T1–T4 filtrent par mois : un T1 2027 se
  mêlerait au T1 2026.
- **La publication est rangée par année** (`planningReleases/{key}_{année}`, la route accepte `year` :
  `api/planning/release/route.ts:39-50`, `:67`), mais le panneau ne publie que l'année en cours
  (`PublishPlanningPanel.tsx:30`), `lignesPubliees` cache aux membres **toute année future, même publiée**
  (`grilles.ts:218`) et le brouillon ne se montre qu'aux publieurs (`groupes/page.tsx:91-96`), pas à qui remplit.
  La première publication envoie **une vraie notification** (`route.ts:80-105`), même lancée d'un poste local.
- **Les dates du Sheet n'ont pas d'année** : `inferYear` (`sheets.ts:48-55`) range en novembre-décembre les JJ/MM
  de janvier-février dans l'année suivante, puis, dès janvier, tout JJ/MM dans l'année en cours. Le Sheet gardera
  2026 : **dès le 01/11/2026, « Mes services » lit des services de 2027 fantômes** (le dimanche 04/01/2026 devient
  le lundi 04/01/2027 ; `mes-services/page.tsx:151`) ; le rappel du matin teste tout jour
  (`cron/reminders/route.ts:196-204`) : premiers rappels fantômes le 28/12/2026. En 2027, le Campus aussi : « 27/7 »
  perd l'année, `campusDate` la redevine (`names.ts:239-244`, `:278`, `:353`, `:423`). En ligne, le Sheet est seul
  lu (`sheets.ts:10`), et `main` porte le même code.
- **Un dimanche est Interfranco ou Intergroupe si sa ligne existe** dans la grille du service
  (`planning/page.tsx:114-123`) ; ces mots ne sont jamais pris pour des noms (`NON_NAMES`, `names.ts:57-61`).
- **Exports d'aujourd'hui** (lot 17) : CSV et PDF de la période affichée, dans le navigateur, pour qui voit la grille
  (`PlanningGrille.tsx:244-294`, `:357-375`) ; PDF A4 paysage, en-tête de couleur, « — » dans les cases vides, sans
  logo ; CSV aux libellés de l'app. Pas de bibliothèque .xlsx (`package.json:19-49`), ni Lora ni Carlito ; logo
  `public/logo.png`, 1 024 px, 1,16 Mo. Seul le Culte a un horaire en code ; ceux des groupes sont dans le Sheet.
- **Le Sheet** (« [2026 QG] Planning », copie locale du 03/10/2026, hors dépôt) : 24 onglets, dont 19 de planning
  lus par l'app ; `Paix_Prière` ne l'est pas. Mise en forme relevée sur `Paix_T1` et `Fidélité_T1` (tableau des
  modèles plus bas). **Colonnes que l'app ignore** : `PERCUSSION` au `Paix_T4` (10 dimanches sur 13 ;
  `fetchMulti(…, 4)`, `sheets.ts:186`) et `COURS` à l'EDD (87 cases sur 156 ; `sheets.ts:255`). Le relevé T0
  (05/10/2026, plus bas) les étend à tous les onglets : il en trouve deux de plus, au Groupe Bonté.

## Décisions de Timothée — à ne pas rouvrir

| Date | Décision |
| --- | --- |
| 18/09/2026 | Colonnes en dur, pas d'éditeur (T7) ; droit `plannings` par planning, coché par un admin (T3) ; noms sans compte acceptés (T5) ; écriture case par case, historique nommé (T6) — `spec-planning-grille.md` |
| 19/09/2026 | Tous les plannings se remplissent dans l'app ; export CSV et PDF |
| 20/09/2026 | Back-office coupé en ligne par l'interrupteur ; local et en ligne partagent Firestore (`spec-mise-en-ligne.md`) |
| 03/10/2026 | Planning 2027 dans le Back-Office : colonnes et horaires de 2026, tous les dimanches posés d'office |
| 03/10/2026 | Export PDF et .xlsx, tous les plannings, chacun au modèle de son onglet ; logo sous le nom de l'église ; pas de bas de page |
| 03/10/2026 | Petit déj : les inscriptions sont la seule source ; la case de la Table les affiche (U3) |
| 04/10/2026 | Écran « export avec logo » validé ; tout part en ligne ensemble à la fin du chantier, l'interrupteur retiré |

## Décisions proposées ici

| # | Proposition | Raison lue dans le code |
| --- | --- | --- |
| Q1 | **Rien à créer.** Un sélecteur d'année (2026 · 2027) ; l'année suivante s'ouvre seule aux responsables. Les dimanches de 2027 sont **calculés** (52, du 03/01 au 26/12) ; un document naît à la première case écrite. Pas de bouton, pas d'état « année créée ». | Colonnes et horaires sont en dur : rien à recopier. `ecrireCase` crée déjà le document. Poser d'avance 9 × 52 = 468 documents vides n'apporterait rien et rendrait chaque dimanche « déjà dans l'app ». |
| Q2 | **En 2027, la première case n'écrit qu'elle** (pas de `semer`). | Rien de 2027 à recopier du Sheet ; deux personnes qui ouvrent le même dimanche ne s'effacent pas (D1 du lot 17). |
| Q3 | **Dimanches posés d'office** pour les plannings hebdomadaires (Culte, Table, Paix, Fidélité, Fidélité musiciens, Bonté, trois classes d'EDD) ; **dates choisies** pour Interfranco et Intergroupe (« Ajouter un dimanche ») et pour le Campus (« Ajouter une séance », un jour quelconque). Un champ `dates` par définition. | « Ce dimanche » tient un dimanche pour Interfranco dès que sa ligne existe : 52 lignes feraient 52 Interfranco. Le Campus se tient en juillet, matin et soir. |
| Q4 | **Brouillon puis publication, par trimestre**, sur l'année de la ligne (`planningReleases/{key}_2027`). Le brouillon se montre à **qui remplit ou publie** ce planning, et aux admins. « Publier le T1 » sur la page (route existante, avec `year`) ; « Masquer le T1 » pour un trimestre futur publié. Un membre voit 2027 dans le sélecteur dès son premier trimestre publié (Culte, groupes) ou sa première case remplie (les autres plannings, sans publication, se lisent à mesure, comme le Sheet). | Corrige les trois manques relevés plus haut. Aucune règle ne change : `planningReleases` s'écrit par la route. |
| Q5 | **Groupes, un dimanche Interfranco ou Intergroupe** : la Présidence affiche le nom du service, **tiré de sa grille** (jamais recopié), non modifiable ; orateur et thème restent libres, comme dans le Sheet 2026. `loadPlanningData` applique la même règle : pas de président fantôme dans « Mes services » ni dans les rappels. Interfranco et Intergroupe ne prennent jamais le même dimanche. | La planche le montre ; `NON_NAMES` ignore déjà ces mots. Une seule source : déplacer la date dans sa grille déplace la marque. |
| Q6 | **Sainte cène** : rien de neuf (colonne en dur, badge du premier dimanche calculé) ; dans le modèle du Culte, la colonne est toujours là (les quatre blocs de 2026 la portent). **Petit déj** : la case s'affiche et s'exporte telle que U3 la remplit (`lectureSeule`, `spec-petit-dej.md` Q12) ; U2 n'y écrit pas. | — |
| Q7 | **Le Sheet garde 2026** : ses JJ/MM se lisent en 2026 (`ANNEE_DU_SHEET`, l'année du fichier), fin de la bascule de novembre ; une séance du Campus garde sa date complète au lieu de la relire dans « 27/7 ». La fusion du lot 17 ne change pas : en 2027, faute de lignes dans le Sheet, l'app est seule. | Les fantômes décrits plus haut. Une date complète de 2027 écrite un jour dans le Sheet (EDD, Campus) passerait par la fusion, l'app gagnant dimanche par dimanche : rien de plus à couper. |
| Q8 | **L'export se fait dans le navigateur**, chargé à la demande, comme le CSV et le PDF d'aujourd'hui : pas de route, pas de coût serveur. « Tous les plannings » lit les treize grilles (lecture publique, REST). | `PlanningGrille.tsx:244-294` ; Vercel Hobby. |
| Q9 | **Une page A4, une feuille .xlsx = un onglet du Sheet** : un trimestre (groupes, Culte, Table, Fidélité musiciens), une période de deux mois (EDD), l'année (Interfranco, Intergroupe, Campus). Trois portées : **ce que la page montre**, **toute l'année du planning**, **tous les plannings de l'année** (un PDF de toutes les pages ; un .xlsx d'une feuille par onglet, dans l'ordre et sous les noms du Sheet, sans les espaces parasites). Portrait jusqu'à 7 colonnes, paysage au-delà, sauf relevé contraire. | Les onglets de groupe vont par trimestre (`Paix_T1`…) et s'impriment sur une page (« Pour imprimer : A1:E26 »). Le .xlsx « tous les plannings » redonne le classeur de l'année. |
| Q10 | **Le texte des fichiers est celui du Sheet** (français ; nom de l'église en chinois pour Fidélité), quelle que soit la langue de l'interface ; cases vides vides ; ni date d'export, ni numéro de page. | « Au modèle de son onglet », « pas de bas de page ». |
| Q11 | **Polices** : dans le .xlsx, des noms (Lora, Calibri, Ma Shan Zheng), comme le Sheet ; dans le PDF, des fichiers libres (OFL) dans `public/fonts/` avec leur licence : Lora, **Carlito** pour Calibri (propriétaire, non embarquable ; mêmes mesures), Ma Shan Zheng, Source Han Sans (déjà là) pour toute case en chinois. Chargés au moment d'exporter ; le PDF n'embarque que les caractères utilisés. | Carlito sert déjà la planche. Des noms chinois figurent dans les plannings, les classes d'EDD s'écrivent en chinois. |
| Q12 | **Logo** : `public/logo.png`, réduit à la volée (300 px) avant d'entrer dans les fichiers ; aucun fichier de logo nouveau. | Le logo est gelé ; 1,16 Mo par page ou par feuille alourdirait « Tous les plannings ». |
| Q13 | **Qui exporte** : les responsables du planning affiché (écrivains, publieurs) et les admins ; « Tous les plannings » : les admins. Le fichier contient ce que la personne voit. Les membres n'exportent pas (planning de l'App en lecture, `spec-back-office.md` Q14). Visibilité d'un bouton, pas un droit sur des données : rien dans `firestore.rules`. | Module Planning de U6 : admin, `plannings` non vide ou droit de publier, chacun ses plannings. |
| Q14 | **Interrupteur** : tout U2 vit derrière `BACK_OFFICE`, dans les pages `/planning/*` déjà coupées en ligne (`BACK_OFFICE ? Page : AncienTableau`, ex. `culte/page.tsx:100`). En ligne rien ne change, sauf le correctif des dates s'il part seul (question 2). U6 range ces écrans sous `/back-office/planning/…`, U4 leur donne la barre latérale ; la grille reste en pleine largeur (U4, Q10). | U2 se code avant U4 et U6 : la coquille de la planche n'existe pas encore. |

## Objectif

1. Les responsables remplissent **2027 dans l'app**, planning par planning, sur des dimanches déjà posés ; chaque
   trimestre reste un brouillon jusqu'à sa publication.
2. Tout planning **s'exporte en PDF et en .xlsx** au modèle de son onglet du Sheet, logo compris, sans bas de page.
3. Le Sheet devient l'archive de 2026 ; **rien ne bouge en ligne** tant que l'interrupteur existe.

**Réussite** (local, horloge au 15/11/2026, Firestore et route de publication simulés) : Christelle, qui remplit Paix
sans droit de publier, choisit 2027 dans Groupes › Paix : bandeau « 2027 · brouillon », 13 dimanches vides au T1
(03/01 → 28/03). Elle pose un compte à la présidence du 10/01, un nom sans compte (« Invité A. ») à l'orateur du
17/01 ; un membre ne voit pas 2027. L'Interfranco ajoute le 17/01/2027 : la présidence de Paix ce jour-là affiche
« Interfranco », non modifiable. Un admin clique « Publier le T1 » : le membre voit le T1 2027 aussitôt. L'export du
trimestre donne un PDF A4 conforme à `export-paix-t1` (église, logo, « GROUPE PAIX », « Planning de Janvier à Mars
2027 », horaire, une ligne sur deux `#eaf2fb`, bordures noires, rien en bas) et un .xlsx qui s'ouvre dans Google Sheets
avec la même mise en forme ; « Tous les plannings 2027 » (admin) : une feuille par onglet, dans l'ordre du Sheet ;
Fidélité porte le nom chinois et une ligne vide entre les mois. Sur le serveur « comme en ligne », rien n'a changé ;
un « 04/01 » du Sheet lu en décembre 2026 reste le 04/01/2026.

## Modèle

Pas de collection nouvelle : 2027 vit dans `plannings/{key}/dimanches/{AAAA-MM-JJ}` (lot 17), la publication dans
`planningReleases/{key}_2027`.

```ts
// grilles.ts (pur) — ajouts ; sheets.ts : ANNEE_DU_SHEET = 2026 ; utils.ts : CampusSeance gagne `date`
export const PREMIERE_ANNEE_APP = 2027        // dès elle : dimanches calculés, pas de « semer »
export type DefinitionGrille = { /* …lot 17… */ dates: "dimanches" | "choisies"; i18nHoraire?: string }
export function dimanchesDe(annee: number): string[]   // AAAA-MM-JJ, 52 ou 53
export function lignesDeLAnnee(def: DefinitionGrille, annee: number, rows: string[][]): string[][]
export function marquerDimanchesSpeciaux(groupe: string[][], interfranco: string[][], intergroupe: string[][]): string[][]
// historique.ts (pur) — un dimanche posé ou retiré (Interfranco, Intergroupe, Campus)
export type ChangementDimanche = { kind: "dimanche"; date: string; retire: boolean }
// modeles.ts (pur) — un modèle par onglet du Sheet
export type ModeleOnglet = {
  onglet: string; decoupage: "trimestre" | "periodeEdd" | "annee"   // « Paix » → « Paix_T1 »…
  eglise: "fr" | "zh"            // « Grace Church Christian Chinese de Paris » | « 基督教会巴黎华人恩典堂 »
  titre: string; periode: "planningDe" | "programmeDu" | "bloc" | "annee" | "seances"; horaire?: string
  entetes: Record<string, string>   // clé de colonne → libellé du Sheet (« PRÉSIDENCE »)
  // Le tableau garde la mise en forme de SON onglet (relevé T0, colonne « Tableau » plus bas) :
  policeTableau: "Calibri" | "Lora" | "Georgia"; taille: 11 | 12; alignement: "centre" | "gauche"
  couleurs: { texteEntete: string; fondEntete?: string; bandeau?: string; mois?: string; date?: string; alterne?: string; bordure: string }
  mois: "aucun" | "ligneVide" | "ligneTitre" | "colonne"   // groupes · Fidélité · Culte et Table · Fidélité musiciens
  dateGras: boolean; formatDate: "jj/mm" | "jj/mm/aaaa"
}
export type PageExport = { feuille: string; modele: ModeleOnglet; periode: string; lignes: (string[] | "mois")[] }
export function pagesExport(portee: "affiche" | "annee" | "tout", annee: number /* , lignes vues */): PageExport[]
```

`lignesDeLAnnee` sert aussi au widget « Cases vides » de U6. Rendu : `src/components/pdf/PlanningModelePDF.tsx`
(une `Page` par `PageExport`) et `src/lib/planning/xlsx.ts` (une feuille par `PageExport`).

**Règle proposée** (question 10), en double avec `canRetirerDate` (`src/lib/access.ts`) :

```
match /dimanches/{date} {
  allow read: if true;
  allow create, update: if peutEcrirePlanning(key) && request.resource.data.date == date;
  // U2 : une date posée par erreur se retire, là seulement où les dates se choisissent.
  allow delete: if peutEcrirePlanning(key)
    && key in ['interfranco', 'intergroupe', 'campusMatin', 'campusSoir'];
}
```

### Les modèles, onglet par onglet

Relevé T0 du 05/10/2026, **à valider par Timothée** (méthode et détails dans « Relevé T0 » juste après). Une ligne
par grille, dans l'ordre des onglets du Sheet, qui sera celui des feuilles du .xlsx « Tous les plannings » : 19
feuilles (`Paix_Prière` et `Membres_Groupes` n'en font pas partie). Couleurs en hexadécimal, largeurs en px du Sheet.

| Grille | Onglet (rang) | Une page = | En-tête : titre · période · horaire | Colonnes du Sheet | Tableau (mise en forme relevée) | Page |
| --- | --- | --- | --- | --- | --- | --- |
| `culte` | `Franco_Louange` (1) | trimestre : bandeau « TRIMESTRE 1 », puis une ligne par mois ; 4 pages | l'onglet n'a pas de titre (A1 fusionnée, vide) : proposé « CULTE FRANCO » · « Janvier à Mars 2027 » · « Dimanche 10:30 » (code ; rien dans le Sheet) | DATE · Présidence · Choristes (2 colonnes, en-tête fusionné) · Pianiste · Guitariste · Cajon/Batterie · Sono + Live · PPT · Orateur · Traducteur · Sainte cène | Calibri 11 ; bandeau blanc gras sur `#24575B` ; en-têtes blanc gras sur `#2F6E73` ; mois (« Janvier », gras, à gauche) sur `#D7E7EA` ; date jj/mm grasse sur `#BFD9DC` ; cases centrées, pas de ligne alternée ; bordures fines `#9AA7B1` ; 100 · 141 · 117 + 110 · 119 · 118 · 117 · 108 · 100 · 197 · 106 · 131 | A4 paysage, ajusté à la largeur |
| `table` | `Franco_Table_PtD` (2) | trimestre (Q9) : un tableau, une ligne par mois ; 4 pages | « PRÉPARATION TABLE DÉJEUNER » · « DÉJEUNER PRÉPARATION T1 » (bandeau du bloc ; proposé suivi de l'année) · pas d'horaire | DATE · « Équipe : Mix » (4 cases fusionnées, un nom par case, que l'app joint) ; à côté, « PETIT DÉJEUNER 2026 » : DATE · NOM, deux paires (janvier-juin, juillet-décembre ; le second « NOM » est écrit « DATE ») → Q9 : DATE · Équipe · Petit déj | Calibri 11 (bandeau 12) ; bandeau blanc gras sur `#6AA84F` ; mois et en-têtes blanc gras sur `#93C47D` ; date jj/mm grasse sur `#D9EAD3` ; petit déj sur `#F5FFF2` ; bordures fines noires ; titres Impact 23 ; blocs de 5 colonnes de 100 px | A4 portrait |
| `intergroupe` | `Intergroupe` (3) | année ; 1 page | « INTERGROUPE » (Impact 22 sur `#8E7CC3`) · « Année 2027 » · pas d'horaire | DATE · Présidence · Choristes (3 colonnes, en-tête fusionné) · Pianiste · Guitariste · Cajon/Batterie · Sono + Live · PPT · Orateur · Traducteur | Calibri 11 ; « Année » blanc gras sur `#8E7CC3` ; en-têtes blanc gras sur `#B4A7D6` ; date jj/mm grasse sur `#D9D2E9` ; cases centrées, pas de ligne alternée ; bordures fines `#9AA7B1` ; 100 px partout | paysage (aucun réglage d'impression dans le Sheet) |
| `interfranco` | `Interfranco` (4) | année ; 1 page | « INTERFRANCO » (Impact 22 sur `#C27BA0`) · « Année 2027 » · pas d'horaire | comme Intergroupe, Choristes sur 2 colonnes | le gabarit d'Intergroupe en rose : bandeau `#C27BA0`, en-têtes `#D5A6BD`, date `#EAD1DC` | paysage |
| `eddZhongban`, `eddDaban`, `eddGaoban` | `EDD` (5) | période de deux mois, les trois classes l'une sous l'autre ; 6 pages (9, 8, 9, 9, 9, 8 dimanches en 2027) | « EDD — Planning par classe (bimensuel) — 2027 » (Impact 16) · « PÉRIODE 1 — JANVIER FÉVRIER » (puis « MARS AVRIL », « MAI JUIN », « JUILLET AOÛT », « SEPTEMBRE OCTOBRE », « NOVEMBRE DÉCEMBRE ») · pas d'horaire | DATE · PRESIDENCE (sans accent) · SUPPLÉANT · PIANO · CAJON · GUITARE · COURS, puis la classe (中班, 大班, 高班) dans une 8e colonne sans en-tête, fusionnée sur ses dimanches | Calibri 11 ; en-têtes blanc gras sur `#1F5B57`, bordures `#4F6B63` ; période en gras, à gauche, sans fond ; date jj/mm/aaaa, non grasse, sur `#CFE8DD` ; classe Calibri 14 gras sur `#A9D18E` ; pas de ligne alternée ; bordures fines noires et `#9AA7B1` ; 100 px partout | A4 portrait, ajusté à la page (8 colonnes : relevé contraire à la règle des 7) |
| `campusMatin`, `campusSoir` | `Campus_Louange` (6) | année ; 1 page, les séances dans l'ordre des dates, matin et soir mêlés (colonne MOMENT), pas « matin puis soir » | onglet de saisie : son titre (« CAMPUS_LOUANGE — Format de lecture automatique ») et sa consigne ne se recopient pas ; un ancien rendu lisible, caché (lignes 16-29), titrait « CAMPUS 2026 » · « 27 — 31 Juillet 2026 • (lieu) » : proposé « CAMPUS 2027 » · « JJ — JJ Mois 2027 » (première et dernière séance, sans lieu) · pas d'horaire | DATE_SEANCE · MOMENT · PRESIDENT · CHORISTE_1 · CHORISTE_2 · PIANO · GUITARE · BATTERIE · SONO · PPT · CHANT_1 · CHANT_2 · CHANT_3 · CHANT_4 · DATE_RÉPÉTITION (proposé : tirets bas changés en espaces) | Calibri 11 ; en-têtes blanc gras sur `#2D5A65`, la répétition sur `#6B4A8E` ; date jj/mm/aaaa grasse en `#2D5A65`, moment gras ; cases alignées à gauche ; une ligne sur deux `#F5F9FA` dès la première ; répétition sur `#EDE4F5`, texte `#6B4A8E` ; bordures fines noires ; 107 · 100 (× 10) · 127 · 222 · 127 · 193 | paysage |
| `paix` | `Paix_T1`, `Paix _T2`, `Paix _T3`, `Paix_T4` (7 à 10 ; feuilles `Paix_T2`, `Paix_T3`) | trimestre ; 4 pages | « GROUPE PAIX » · « Planning de Janvier à Mars 2027 » (« Avril à Juin », « Juillet à Septembre », « Octobre à Décembre ») · « Dimanche de 13:00 à 14:30 » (le Sheet : « 13h à 14h30 » ; Q8) | DATE · PRÉSIDENCE · MUSICIENS · ORATEUR · THÈME ; + PERCUSSION au T4 (10 cases sur 13) | Calibri 12 ; en-têtes gras `#1F3A5F`, sans fond ; date jj/mm grasse ; cases centrées ; une ligne sur deux `#EAF2FB` dès la première (T1 à T3 : quelques cases teintées en trop, restes de copier-coller ; T4 net) ; bordures fines noires ; 88 · 100-125 · 100-122 · 100-155 · 190-209 (· 125) | A4 portrait, ajusté à la page |
| `fidelite` | `Fidélité_T1` … `Fidélité_T4` (13 à 16) | trimestre ; 4 pages | église en chinois · « Groupe Fidélité » · « Programme du 1er Trimestre 2027 » (« 2e », « 3e », « 4e ») · « 13:00-14:00 » (le Sheet : « 13H00-14H00 » ; Q8) | Date · Présidence · Orateur · Thème · Pianiste | Lora 12, **ni en-têtes ni dates en gras**, sans couleur ; une ligne sur deux `#EAF2FB`, reprise au premier dimanche de chaque mois ; une ligne vide entre les mois (fusionnée sur les 5 colonnes, bordée, sans fond) ; bordures fines noires ; 100 · 120-144 · 100-190 · 196-199 · 149 ; l'encadré « Pour imprimer » (G10:I16) ne se recopie pas | A4 portrait, ajusté à la page |
| `fideliteMusiciens` | `Fidélité_Musicien` (17) | trimestre (bloc) ; 4 pages | l'onglet n'a ni église ni logo ; « Groupe Fidélité Planning Musiciens 2027 » (Georgia 16 gras) · « Groupe Fidélité Planning 2027 - T1 (Janvier - Mars) » (« T2 (Avril - Juin) », « T3 (Juillet - Septembre) », « T4 (Octobre - Décembre) ») · pas d'horaire | (mois, sans en-tête) · Date · Présidence · Piano · Guitare · Percussion | Georgia 12 ; bandeau du trimestre et en-têtes gras sur `#B4A7D6` ; mois en colonne A, au premier dimanche du mois, gras sur `#D9D2E9` ; date jj/mm non grasse ; pas de ligne alternée ; un dimanche spécial (Interfranco, Intergroupe, anniversaire de l'église, baptême) s'écrit sur toute la ligne, Présidence → Percussion fusionnées ; bordures fines noires ; 100 · 100 · 119 · 116 · 128 · 103 | A4 portrait |
| `bonte` | `Bonté_T1`, `Bonté _T2`, `Bonté _T3`, `Bonté_T4` (18 à 21 ; feuilles `Bonté_T2`, `Bonté_T3`) | trimestre ; 4 pages | « GROUPE BONTÉ », le reste comme Paix (même horaire) | comme Paix ; + PERCUSSION et MÉNAGES aux T3 et T4 (Percussion : 11 cases sur 13 à chacun ; Ménages : aucune) | comme Paix (`Bonté_T1` vide en 2026, dates seules) | comme Paix |

Commun à tous les onglets (question 11, relevé sur les groupes) : rangée 1 (47,25 pt, 63 px), le nom de l'église en
Lora 22 (Fidélité : en chinois, Ma Shan Zheng 36) ; rangée 2 vide, même hauteur ; rangée 3 (164,25 pt, 219 px), le
logo centré, environ 200 px de côté ; rangée 5, le titre (Lora 22) ; rangées 7 et 8, la période et l'horaire (Lora
16) ; deux rangées vides, puis le tableau ; tout centré sur la largeur du tableau, quadrillage masqué. Un onglet sans
horaire n'a pas de ligne d'horaire. Le tableau garde la mise en forme de **son** onglet (colonne « Tableau »), cases
vides vides, rien dessous : aucun onglet du Sheet n'a d'en-tête ni de pied de page d'impression.

### Relevé T0 (05/10/2026)

**Méthode.** Les 19 onglets lus comme l'app : CSV public `gviz` (`BASE_URL`, `sheets.ts:14` ; `fetchSheet`,
`sheets.ts:73`), en-têtes et colonnes comparés aux lecteurs `lire…Sheet`. Le rendu : l'export .xlsx public du même
classeur (polices, fonds, bordures, fusions, largeurs, hauteurs, images, réglages d'impression) et l'export PDF de
Google, onglet par onglet, regardé à l'œil. Ces fichiers restent hors dépôt : ils portent des noms. Aucun nom n'est
recopié dans cette spec. Le classeur a 26 onglets, dont 24 visibles.

**Colonnes et cases que l'app ne lit pas** (cases remplies en 2026) :

| Onglet | Colonne | Remplie | Pour P5 (question 4 : oui) |
| --- | --- | --- | --- |
| `Paix_T4` | PERCUSSION | 10 sur 13 | à ajouter (déjà prévu) |
| `Bonté _T3`, `Bonté_T4` | PERCUSSION | 11 sur 13 à chacun | **à ajouter aussi à Bonté** (trouvé par T0) |
| `Bonté _T3`, `Bonté_T4` | MÉNAGES | 0 sur 26 | proposé : ne pas l'ajouter (en-tête seul, jamais rempli) |
| `EDD` | COURS | 87 sur 156 | à ajouter (déjà prévu) |
| `Franco_Louange` | au-delà de « Sainte cène » : « 3 PRÉSIDENCES », « ABSENCES », « Notes » | notes de travail | rien (déjà écarté, `sheets.ts:98`) |
| `Franco_Table_PtD` | « Personnes disponibles » par groupe (colonnes N à Q, cachées) | notes de travail | rien |
| `Fidélité_T1` … `T4` | encadré « Pour imprimer » (G à I) | consigne | rien |
| `Campus_Louange` | NOTE_GLOBALE (ligne 3) | note libre | rien |

**Dimanches spéciaux dans le Sheet de 2026.** Les groupes écrivent « Interfranco » ou « Intergroupe » dans la
présidence (Paix, Bonté, Fidélité), parfois aussi dans l'orateur ou le thème ; Fidélité musiciens fusionne la ligne
sur le mot. Le Sheet ne s'accorde pas avec lui-même : l'onglet `Interfranco` porte trois dates (14/06, 09/08, 25/10)
et une ligne vide, quand Paix, Fidélité et Fidélité musiciens marquent aussi le 18/01 en Interfranco. P4 (une seule
source, la grille) règle ce cas. « Baptême » et « Séance de louange » s'écrivent aussi dans des colonnes de personnes
(présidence de Fidélité musiciens, orateur de Fidélité) et ne sont pas dans `NON_NAMES` (`names.ts:57`) : à savoir
pour P9, « Choisir » ne doit pas les proposer comme des noms.

**Écart avec une planche validée.** `export-fidelite-t1` met en gras les en-têtes et les dates ; le Sheet ne le fait
pas (Lora 12 maigre partout). `export-paix-t1` est conforme au Sheet. Proposé : suivre le Sheet (« au modèle de son
onglet »).

**Le logo dans le Sheet.** Une même image (PNG 314 × 320, le logo de l'église) sur les douze onglets de groupe, dans
la rangée 3 : environ 200 px de côté sur le rendu PDF, centrée sur le tableau. L'export .xlsx de Google la ramène à
environ 108 px et l'accroche au coin de sa cellule (C3, ou A3 pour Fidélité), sans la centrer : P8 calcule lui-même
le décalage qui la centre.

**Ce que le relevé propose aux tranches suivantes** (à valider avec le tableau) :

1. **Le tableau au modèle de son onglet, l'en-tête des groupes partout** (Q11). Le paragraphe « Commun » d'avant
   étendait aussi la date en gras, les bordures noires et la ligne sur deux `#eaf2fb` à tous les onglets ; le Sheet ne
   les a qu'aux groupes. Le relevé suit la décision du 03/10 (« chacun au modèle de son onglet ») : P6 porte, par
   onglet, police, taille, couleurs, lignes de mois et format de date (type `ModeleOnglet` complété plus haut).
2. **Une police libre de plus pour le PDF** (Q11) : Georgia (Fidélité musiciens) est propriétaire, comme Calibri ; son
   équivalent libre aux mêmes mesures est **Gelasio** (OFL, Google Fonts), dans `public/fonts/` avec sa licence.
   Impact (titres de Table, EDD, Intergroupe, Interfranco) et Arial (notes) ne servent pas : l'en-tête commun remplace
   ces titres, les notes ne s'exportent pas.
3. **Église en chinois** pour Fidélité et Fidélité musiciens (même groupe ; l'onglet des musiciens n'en a pas) ; en
   français pour tous les autres, EDD compris (ses textes sont en français).
4. **Horaires** : seuls le Culte (code), les groupes et Fidélité en ont un ; les autres onglets n'ont pas de ligne
   d'horaire, Fidélité musiciens compris.
5. **P5** : PERCUSSION aussi pour Bonté ; MÉNAGES écarté.

## Écrans

**Ordinateur** — planche `bo-planning-2027` (la grille en modification) : « Planning », sous-titre « Groupe Paix ·
<horaire> », sélecteur « 2026 · 2027 » ; à droite « Exporter (modèle du Sheet) » (bouton clair) et, pour qui publie,
« Publier le T1 » (bouton plein, encre) ; onglets, pastilles des groupes, pilules T1–T4 (cadenas sur un trimestre non
publié) ; bandeau « 2027 · brouillon. Visible des responsables du planning seulement, jusqu'à la publication de chaque
trimestre. Colonnes et horaire repris de 2026 ; les 52 dimanches de 2027 sont déjà posés. » ; grille en pleine
largeur, cases vides « Choisir » (question 5), « Interfranco » ou « Intergroupe » en toutes lettres à la présidence
de ces dimanches. Barre latérale, ordre des onglets et sous-onglets : U4 et U6. **Tablette paysage** : la même page,
barre réduite (U4), grille qui défile en largeur, dates figées. **Fichiers** : planches `export-paix-t1` et
`export-fidelite-t1` (A4 portrait), selon le tableau des modèles.

**Absents de la planche**, décrits d'après les voisins. *Tablette portrait et téléphone* : la grille du lot 17
(tableau en tablette, une carte par dimanche en téléphone) ; sélecteur d'année et pilules sur une ligne qui défile ;
« Publier le T1 » en pleine largeur sous le bandeau ; « Exporter » et « Choisir » s'ouvrent en feuille. *Menu
« Exporter »* : « T1 2027 · Groupe Paix » (ce que la page montre), « Toute l'année · Groupe Paix », « Tous les
plannings 2027 » (admins) ; deux boutons « PDF » et « .xlsx » ; fenêtre sur ordinateur, feuille ailleurs.
*Interfranco, Intergroupe, Campus en 2027* : « Aucun dimanche posé pour 2027 » et « Ajouter un dimanche » (Campus :
« Ajouter une séance », date et moment) ; un dimanche déjà pris par l'autre service n'est pas proposé ; « Retirer ce
dimanche » demande confirmation et dit que ses cases s'effacent (question 10).

Libellés nouveaux, FR et 中文 (Timothée relit le 中文) :

| Clé | FR | 中文 |
| --- | --- | --- |
| `planning.annee.brouillon` · `poses` | {{annee}} · brouillon. Visible des responsables du planning seulement, jusqu'à la publication de chaque trimestre. · Colonnes et horaire repris de {{avant}} ; les {{n}} dimanches de {{annee}} sont déjà posés. | {{annee}} · 草稿。各季度发布前，仅服事表负责人可见。 · 沿用 {{avant}} 年的栏目和时间；{{annee}} 年的 {{n}} 个主日已列出。 |
| `planning.annee.aucun` · `ajouter` · `ajouterSeance` · `retirer` | Aucun dimanche posé pour {{annee}}. · Ajouter un dimanche · Ajouter une séance · Retirer ce dimanche | {{annee}} 年尚未添加主日。 · 添加主日 · 添加聚会 · 移除此主日 |
| `planning.publier` · `masquer` | Publier le {{tri}} · Masquer le {{tri}} | 发布 {{tri}} · 隐藏 {{tri}} |
| `planning.export.bouton` · `annee` · `tout` | Exporter (modèle du Sheet) · Toute l'année · {{planning}} · Tous les plannings {{annee}} | 导出（表格样式） · 全年 · {{planning}} · {{annee}} 年全部服事表 |
| `planning.choisir.*` | Choisir · Chercher un nom · Écrire un nom sans compte… | 选择 · 搜索姓名 · 输入没有账号的名字… |

## Ce qui sera construit

Tranches courtes, chacune vérifiable seule, derrière `BACK_OFFICE` sauf P1 ; un commit par lot, sur demande.

- **T0 · Relevé des onglets** (aucun code de l'app) : lire chaque onglet de 2026 comme l'app le lit (CSV public) et
  son rendu (libellés, colonnes en plus, horaire, titre, période, polices, largeurs, logo) ; compléter le tableau des
  modèles, sans aucun nom. *Vérifiable* : Timothée valide le tableau.
- **P1 · Dates du Sheet** (Q7) : la branche JJ/MM de `parseDate` (`sheets.ts:68-69`) lit `ANNEE_DU_SHEET` ;
  `CampusSeance.date` remplace `campusDate`. Seule tranche qui peut partir seule sur `main` (question 2).
- **P2 · L'année** (Q1-Q3) : `dimanchesDe`, `lignesDeLAnnee`, champ `dates`, horaires (T0) dans les définitions ;
  sélecteur et période sur les sept pages ; pas de `semer` dès 2027 ; « Ajouter un dimanche / une séance »,
  « Retirer » (si question 10), entrée d'historique `dimanche`.
- **P3 · Brouillon et publication** (Q4) : `lignesPubliees` sur l'année de la ligne ; brouillon visible de qui
  remplit ; bandeau ; « Publier le T… », « Masquer le T… ». **P4 · Interfranco et Intergroupe dans les groupes**
  (Q5) : `marquerDimanchesSpeciaux` dans la page Groupes, `loadPlanningData` et l'export.
- **P5 · Colonnes de 2026 manquantes** (si question 4) : Percussion, Cours et ce que T0 trouvera, dans `grilles.ts`,
  les lecteurs du Sheet, les rôles de « Mes services » et des rappels.
- **P6 · Modèles** (pur) : `modeles.ts`, `pagesExport`. **P7 · PDF** : `PlanningModelePDF.tsx`, polices et licences,
  logo réduit ; menu « Exporter (modèle du Sheet) » à la place des deux boutons du lot 17 (si question 6).
  **P8 · .xlsx** : la bibliothèque (question 1), `xlsx.ts`, mêmes pages, même menu.
- **P9 · « Choisir »** (si question 5) : recherche ; d'abord les comptes qui ont le rôle de la colonne dans la
  catégorie du planning (`serviceRoles`), puis les autres ; « Écrire un nom sans compte… ». « Modifier » reste.

## Tests

Playwright, trois appareils, écrits avant le code ; Firestore et Sheet simulés, horloge figée, route de publication
simulée (jamais de vraie notification). Pas d'appareil de plus : la barre latérale arrive avec U4.

`tests/planning-2027.spec.ts` :
- pur : `dimanchesDe(2027)` = 52 dates du 03/01 au 26/12, 13 par trimestre ; `dimanchesDe(2028)` = 53, dès le 02/01 ;
- 2027 montre les 13 dimanches de son T1, aucun de 2026 ; une case de 2027 s'écrit seule (le document ne porte que
  sa colonne) et tient au rechargement ; un membre ne voit pas le T1 2027, l'écrivain de Paix sans `notify` le voit,
  marqué ; « Publier le T1 » → le membre le voit le 15/11/2026 ;
- Interfranco 2027 sans dimanche ; « Ajouter un dimanche » ; ce jour-là, Paix affiche « Interfranco », non
  modifiable ; « Ce dimanche » du 17/01/2027 montre Interfranco ; un président de Paix posé avant n'est ni dans
  « Mes services » ni dans `reminderServicesFor` ;
- le 10/12/2026, « 04/01 » du Sheet donne 2026-01-04 ; en juillet 2027, une séance du Campus de 2026 n'est pas à venir.

`tests/planning-export-modele.spec.ts` :
- pur : titres, périodes, libellés du Sheet, une ligne sur deux, ligne vide entre les mois de Fidélité ;
- .xlsx ouvert avec `unzip` : noms des feuilles, polices Lora et Calibri, fond `EAF2FB`, bordures, fusions, une
  image, ni en-tête ni pied de page ; « Tous les plannings » : une feuille par onglet, dans l'ordre du Sheet ;
- PDF : `%PDF`, « Toute l'année » de Paix = 4 pages, Lora et Carlito, une image, police chinoise pour une case chinoise ;
- « Exporter » pour l'écrivain, le publieur, l'admin, pas pour un membre ; « Tous les plannings » pour l'admin seul ;
  le brouillon d'un planning qu'on ne tient pas n'entre dans aucun fichier ;
- fichiers gardés dans `test-results/`, ouverts à l'œil (Aperçu, Google Sheets) ; captures sur les trois appareils.

Restent verts : `planning-grille`, `-groupes-grille`, `-table`, `-edd`, `-campus`, `-accueil`, `-sainte-cene`,
`-petit-dej`, `-import`, `rappels-regroupes`. `planning-export` change si la question 6 est acceptée ;
`back-office-coupe` gagne : ni sélecteur, ni 2027, ni export.

## Hors périmètre

- **Toujours** : trois appareils ; FR et 中文 pour les libellés ; les dix appelants de `loadPlanningData` gardent leur
  forme ; une notification par personne et par jour (la publication reste l'envoi d'aujourd'hui) ; `BACK_OFFICE`.
- **Demander avant** : un éditeur de colonnes ; un quatrième groupe (Amour, Joie : couleur gelée) ; `Paix_Prière`
  dans l'app ; la publication pour les plannings qui n'en ont pas ; un export pour l'assemblée ; supprimer le code
  mort d'autres lots (`PlanningTable.tsx`, `CULTE_FALLBACK`).
- **Jamais** : écrire dans le Google Sheet ; une couleur nouvelle dans `serviceColors.ts` ; toucher au logo (seulement
  réduit dans les fichiers) ; un bas de page ; publier un vrai trimestre depuis un poste local (la notification part
  pour de vrai, vers des membres qui ne verraient rien en ligne) ; restaurer depuis `HEAD`.

## Questions ouvertes — tranchées le 04/10/2026

Réponses de Timothée : **1 oui** (`write-excel-file`), **2 oui** pour le principe (P1 part seul, mais seulement quand il le demandera), **3 sans objet** (« ce sera en ligne avant le 1/12 » : pas de secours par le Sheet), **4 à 11 oui**. Puis « Go ».


1. **Bibliothèque .xlsx** : ajouter `write-excel-file` (MIT, environ 71 Ko minifié ; polices, fonds, bordures par
   côté, fusions, largeurs, hauteurs, images ; ni format A4 ni « tenir sur une page ») plutôt qu'ExcelJS (MIT,
   environ 930 Ko minifié, 256 Ko compressé ; tout cela plus la mise en page A4 ; dernière version 4.4.0) ? SheetJS
   gratuit est écarté (pas de mise en forme). **Recommandation : oui, `write-excel-file`** : treize fois plus léger,
   il couvre bordures, polices, fond une ligne sur deux et logo ; l'impression passe par le PDF.
2. **Correctif des dates seul sur `main` avant le 01/11/2026** (P1), en dérogation à « tout part ensemble » : sans
   lui, services fantômes en ligne dès novembre, rappels fantômes dès le 28/12. **Recommandation : oui.**
3. **Secours** : si le chantier n'est pas en ligne le 01/12/2026, le T1 2027 se prépare dans le Sheet en dates
   complètes (JJ/MM/AAAA, déjà lues) et passe par la fusion jusqu'à la mise en ligne ? **Recommandation : oui, en
   secours seulement** ; l'import du lot 17 peut ensuite le recopier dans l'app.
4. **Colonnes de 2026 que l'app ignore** : ajouter Percussion (Paix, T4 2026), Cours (EDD) et ce que T0 trouvera,
   comme rôles de « Mes services » ? La planche montre Paix sans Percussion. **Recommandation : oui**, sinon ces
   services disparaissent en 2027.
5. **Menu « Choisir »** de la planche à la place de la `datalist` du lot 17 (D12), dans U2 (P9) ? **Recommandation :
   oui** : il remplit plus vite 52 dimanches vides. U6 dira si le Back-Office s'ouvre directement en modification.
6. **Retirer « Exporter en CSV » et l'ancien PDF** du lot 17, remplacés par « Exporter (modèle du Sheet) » ?
   **Recommandation : oui** : le .xlsx se rouvre dans Google Sheets.
7. **Nom chinois de l'église** (Fidélité) en Ma Shan Zheng, comme le Sheet, plutôt qu'en Noto Serif SC, comme la
   planche ? **Recommandation : oui** (police libre de Google Fonts).
8. **Heures** « 13:00 à 14:30 » (règle du site, D11 du lot 17) plutôt que « 13h à 14h30 » (Sheet et planche), à
   l'écran et dans les fichiers ? **Recommandation : oui.**
9. **Table** : un tableau par trimestre (Date · Équipe · Petit déj) plutôt que la mise en page côte à côte de
   `Franco_Table_PtD` ? **Recommandation : oui.**
10. **Retirer une date posée par erreur** (Interfranco, Intergroupe, Campus) : suppression permise pour ces seules
    grilles (règle ci-dessus, à publier à la main) ? **Recommandation : oui**, sinon une date fausse reste un dimanche
    Interfranco.
11. **L'en-tête des groupes pour tous les onglets** (église, logo, titre, période, horaire), même ceux qui n'en ont pas
    dans le Sheet (Culte, Table, EDD, Campus, Interfranco, Intergroupe, Fidélité musiciens) ? **Recommandation :
    oui** : c'est ma lecture de « logo sous le nom de l'église » pour tous les plannings.

## Commandes

```bash
npm test -- tests/planning-2027.spec.ts tests/planning-export-modele.spec.ts   # PW_PORT=3000 si un next dev tourne
npm test -- tests/planning-grille.spec.ts tests/planning-export.spec.ts tests/back-office-coupe.spec.ts
npx tsc --noEmit && npm run lint
```

## Avancement

- 04/10/2026 : **P1 codé** (test d'abord, vu rouge puis vert : 12 tests × 3 appareils ; 420 tests du planning verts, serveur « comme en ligne » compris), commité en local `b483d9d`, **non poussé**.
- 04/10/2026 : code commencé par un agent sur la branche locale `lot/u2-planning-2027` (part de `ui/apple-design`, P1 compris), quatre commits locaux : `8fb7cae` année 2027 dans les groupes (dimanches posés d'office, case écrite seule), `a2892fd` brouillon par trimestre, bandeau, « Publier le T1 » (page Groupes), `afaf8e6` le Culte en 2027 (sélecteur, brouillon, publication, vue trimestrielle partagée), `65d3cbd` Table et EDD en 2027. Restent P4 (Interfranco, Intergroupe), P5, P6 à P9 (modèles, PDF, .xlsx, « Choisir ») et le relevé T0 à vérifier. Agents arrêtés par Timothée le 04/10 au soir ; rien fusionné dans `ui/apple-design`, rien poussé.
- 05/10/2026 : **T0 fait** (agent, branche `lot/u2-planning-2027`) : les 19 onglets relevés (CSV public comme l'app, export .xlsx et PDF du classeur pour le rendu), tableau des modèles complété sans aucun nom, « Commun » corrigé (63 px et 219 px, logo d'environ 200 px), type `ModeleOnglet` complété, section « Relevé T0 » ajoutée ; aucun code de l'app, aucun test (tranche de relevé). Commit local `docs(U2): T0 …`, non poussé. **À faire par Timothée** : valider le tableau et les cinq propositions du relevé (tableau au modèle de son onglet ; Gelasio pour Georgia ; église en chinois pour Fidélité musiciens ; pas d'horaire là où le Sheet n'en a pas ; Percussion pour Bonté, Ménages écarté), plus les titres proposés du Culte (« CULTE FRANCO ») et du Campus (« CAMPUS 2027 »). Restent P4 à P9.
