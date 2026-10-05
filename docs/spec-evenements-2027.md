# Spec : lot U9 — évènements sur le site à partir de janvier 2027

Spec écrite le 04/10/2026 ; rien n'est codé. Attend la validation de Timothée, puis son go.

Dernier lot du chantier U (`feuille-de-route.md` § 3.U), après U8 (`spec-calendrier.md`) dont il
reprend le lecteur du Sheet. **Partage** : U8 lit le Sheet (août → décembre 2026) pour le calendrier
du Back-Office et le widget « Prochains évènements » ; U9 fixe la bascule, montre ces entrées à
l'assemblée jusqu'au 31 décembre, empêche les doublons, prépare l'annonce et range le lecteur après
janvier. U6 (`spec-back-office.md`) garde l'agenda `/evenements` dans l'App et range la gestion sous
`/back-office/evenements` (création : `…/nouveau`).

## Mots de Timothée

> « … mais aussi à l'assemblée d'avoir une application sur laquelle elle peut suivre ce qu'il se
> passe à l'église, leur service, la louange, les évènements qu'il va y avoir, s'inscrire à des
> évènements et tout. Le tout sur une seule application pour pas qu'on s'éparpille trop. »
> (20/09/2026)

Réunion de l'équipe, transmise le 03/10/2026 : on reste sur le Sheet « [2026-2027] Calendrier des
événements » jusqu'en décembre 2026, l'app le lit et se met à jour quand il change (« scans de la
page ») ; **à partir de janvier 2027, les évènements se font sur le site**, sans import.

## Ce que le code montre (04/10/2026)

- **La section Évènements est codée et coupée en ligne** (lots 6, 6 bis, 11, période d'inscription) :
  `src/app/evenements/layout.tsx` l. 10, routes en 404 (`src/app/api/push/notify-evenement/route.ts`
  l. 22), lignes d'évènements du rappel du matin coupées (`src/app/api/cron/reminders/route.ts`
  l. 185, 295). La page du guide la cache aussi (`src/app/guide/page.tsx` l. 55-56).
- **L'agenda public ne lit que l'app** (`src/app/evenements/CalendrierClient.tsx` l. 32, 57-62) ;
  sans compte, la requête ne prend que `pour = "eglise"` (`src/lib/firebase/evenements.ts` l. 92-94).
  Chaque carte mène à une fiche (`src/app/evenements/EvenementCard.tsx` l. 154-163) et dit « Pour
  plus d'infos : <contact> », même sans compte (l. 103-111).
- **Le formulaire ne contrôle que les dates** (présence, ordre :
  `src/components/evenements/EvenementForm.tsx` l. 113-114) : rien n'empêche de créer dans l'app un
  évènement de 2026 déjà écrit dans le Sheet.
- **Inscriptions de l'app** : compte et invités, sans compte si l'organisateur le permet, ou
  formulaire externe (`lienExterne` : l'app n'inscrit plus personne, `src/lib/evenements/agenda.ts`
  l. 91) ; jamais de téléphone.
- **Le Sheet**, lu le 04/10/2026 (détail dans `spec-calendrier.md`) : onglets d'août 2026 à
  septembre 2027 ; **ceux de 2027 sont vides**. Ses blocs « INSCRIPTIONS » demandent un nom et un
  téléphone facultatif ; ils n'existent que pour les entrées qui ont un responsable (trois sur sept).
- **Local et en ligne partagent le même Firestore** (`spec-mise-en-ligne.md`) : les évènements créés
  pendant les essais en local sont déjà dans la base de production.
- **Le lecteur de U8** ne connaît que les onglets d'août à décembre 2026 (`ONGLETS_SHEET`).
- **« Notifier »** envoie déjà un message à tout le monde (`src/app/notifier/page.tsx` l. 95-98).

## Décisions de Timothée — à ne pas rouvrir

| Date | Décision |
| --- | --- |
| 15/09/2026 | Agenda public lisible sans compte, jamais les noms des inscrits ; pas de grille mensuelle côté assemblée (lot 6). |
| 20/09/2026 | Toute la section Évènements compte comme back-office : coupée en ligne par l'interrupteur (`spec-mise-en-ligne.md`, D1). |
| 03/10/2026 | Le Sheet fait foi jusqu'en décembre 2026 ; à partir de janvier 2027, les évènements se font sur le site, sans import. |
| 04/10/2026 | L'app relit le Sheet à chaque ouverture jusqu'en décembre 2026. |
| 04/10/2026 | Tout part en ligne ensemble à la fin du chantier : interrupteur retiré, fusion sur `main`. Date non fixée. |

## Décisions proposées ici

| # | Proposition | Raison lue dans le code |
| --- | --- | --- |
| Q1 | **La bascule se lit sur la date de l'évènement** : une constante `BASCULE_EVENEMENTS = "2027-01-01"`. Daté avant : le Sheet ; daté à partir de : le site, quel que soit le jour de la création. Un évènement du 10/01/2027 se crée sur le site dès la mise en ligne, et ses inscriptions peuvent s'ouvrir en décembre. | « Sans import » : si l'on attendait le 1er janvier pour créer les évènements de janvier, ceux annoncés en décembre seraient à ressaisir. |
| Q2 | **Jusqu'au 31/12, l'agenda public montre aussi les entrées du Sheet**, mêlées par mois aux évènements de l'app : carte compacte (vignette de date, titre, « 20:00 · Eglise », mention « Tableau des évènements »), sans fiche. Connecté : « Pour plus d'infos : <responsable> » et le lien « S'inscrire sur le tableau » (l'onglet du mois). Sans compte : ni nom, ni lien. | Sinon l'agenda est presque vide au lancement. Un seul lecteur (U8). Le lien mène à une feuille qui porte des noms et des téléphones : rien de nominatif sans compte. |
| Q3 | **Pas de doublon en 2026** : le formulaire (`/back-office/evenements/nouveau`, U6) refuse un évènement « Toute l'église » daté avant la bascule, avec le lien du Sheet : « Jusqu'au 31/12/2026, les évènements de toute l'église s'écrivent dans le Sheet des évènements. » Sections et réunions (pôles, équipes) restent libres. | `EvenementForm.tsx` l. 113-114 ne contrôle que les dates ; réunions et évènements de section ne vivent que dans l'app (lots 6, 7). |
| Q4 | **Évènements de 2027 déjà dans le Sheet** : aucun aujourd'hui. On demande dès maintenant de n'y rien saisir pour 2027 ; à la mise en ligne, la coordination relit les onglets de 2027 et chaque responsable recrée les siens sur le site. Aucun code. | Décision « sans import » ; onglets de 2027 vides au 04/10/2026. |
| Q5 | **Inscriptions** : une entrée de 2026 garde les blocs du Sheet (l'app ne lit jamais ni noms ni téléphones) ; un évènement de 2027 s'inscrit dans l'app (lots 6, 11). Rien ne passe de l'un à l'autre. | Les blocs du Sheet portent des téléphones ; l'app n'en demande jamais. |
| Q6 | **Après la bascule** : un mois affiché à partir de janvier 2027 ne lit plus le Sheet (aucune requête) ; la pastille « Évènements (Sheet) » du calendrier devient « Évènements » le 01/01/2027. En février 2027, sur go, un ménage retire le lecteur, `ONGLETS_SHEET`, le refus de Q3 et leurs tests ; les entrées de 2026 sortent alors du calendrier, le Sheet reste l'archive. | Le lecteur ne coûte rien tant qu'on ne remonte pas en 2026, mais du code mort se paie. |
| Q7 | **Annonce aux responsables** : (a) Timothée l'envoie par « Notifier » le jour de la mise en ligne (rien à coder) ; (b) une ligne en tête de `/back-office/calendrier` et de `/back-office/evenements`, en FR et 中文 comme le Back-Office (U6 Q16), jusqu'au 31/01/2027 — avant la bascule « Les évènements de 2026 restent dans le Sheet ; ceux de 2027 se créent ici. », après « Les évènements se créent ici ; le Sheet n'est plus lu. » ; (c) le guide dit où créer un évènement (FR + 中文). | « Notifier » existe ; le guide a déjà sa section Évènements, cachée tant que l'interrupteur est coupé. |
| Q8 | **Données de test** : avant la mise en ligne, Timothée liste dans la console les évènements créés en local et supprime ceux d'essai (un agent ne lit pas la base de production). | Firestore partagé. |

## Objectif

L'assemblée et les responsables trouvent les évènements au même endroit : ceux de 2026 lus dans le
Sheet tant qu'il fait foi, ceux de 2027 créés et ouverts aux inscriptions sur le site — sans import,
sans doublon, et sans que le Sheet soit lu un jour de trop.

## Réussite

Horloge au 15/12/2026, Sheet et Firestore simulés. Un visiteur sans compte ouvre « Évènements » : les
entrées de décembre du Sheet (sans responsable ni lien) et un évènement de l'app du 10/01/2027 ;
connecté, il voit aussi le responsable et « S'inscrire sur le tableau ». La coordination crée un
évènement « Toute l'église » le 20/12/2026 : refusé, avec le lien du Sheet ; le 10/01/2027 : créé,
et l'inscription s'ouvre dans l'app. Une sortie de section le 20/12/2026 passe. Horloge au
02/01/2027 : l'agenda et le calendrier de janvier n'appellent pas le Sheet, la pastille dit
« Évènements », la ligne d'annonce a changé ; revenir en décembre montre encore les entrées du
Sheet. Aucun téléphone du Sheet n'apparaît nulle part.

## Modèle

- `src/lib/evenements/bascule.ts` : `BASCULE_EVENEMENTS = "2027-01-01"` et
  `avantBascule(date: string): boolean`, seule source de la date — lecteur (U8), agenda public,
  formulaire, pastille et ligne d'annonce la lisent.
- `agendaPublic(app: Evenement[], sheet: EntreeSheet[], connecte: boolean)` (pur) : garde les
  entrées du Sheet datées avant la bascule, les range avec les évènements de l'app selon les règles
  de l'agenda (à venir par mois, passés derrière le lien, tri `byDate`), retire le responsable et le
  lien sans compte.
- Le widget « Prochains évènements » (U6) reçoit les entrées du Sheet par U8 : après la bascule il
  n'en a plus, sans code, le lecteur ne connaissant que 2026.
- Aucune collection, aucun champ, aucune règle : `firestore.rules` et `access.ts` ne bougent pas.
- Horloge : le jour se lit comme ailleurs (`todayIso`), donc l'horloge simulée des tests fait
  basculer.

## Écrans

La planche ne dessine pas l'agenda de l'assemblée : il garde le look du lot 6 bis
(`spec-evenements-look.md`), sur les trois appareils.

- **Agenda public** (`/evenements`, App) : par mois, les cartes de l'app inchangées et, avant la
  bascule, les entrées du Sheet en ligne compacte (comme un évènement passé aujourd'hui : vignette de
  date, titre, « heure · lieu ») avec la mention « Tableau des évènements » / « 活动表 » ; connecté,
  dessous « Pour plus d'infos : <responsable> » et « S'inscrire sur le tableau » / « 在活动表上报名 »
  (nouvel onglet). Pas de fiche, pas de compteur.
- **Formulaire** (création et modification) : sous la date, le refus de Q3 en une phrase et le lien
  « Ouvrir le Sheet des évènements », seulement pour « Toute l'église » avant la bascule.
- **Back-Office** : la ligne d'annonce de Q7 en tête du calendrier et de la gestion des évènements
  (FR et 中文 ; pages de U6 et U8).
- **Calendrier** (U8) : la pastille perd « (Sheet) » le 01/01/2027.

## Ce qui sera construit

Chaque tranche : tests d'abord, rouges puis verts sur les trois appareils, `npx tsc --noEmit`,
`npm run lint`.

| # | Tranche | Vérification |
| --- | --- | --- |
| B1 | Bascule : `bascule.ts`, refus du formulaire, pastille du calendrier | refus le 20/12/2026, création le 10/01/2027, sections libres, libellé selon l'horloge |
| B2 | Agenda public : `agendaPublic`, carte compacte du Sheet, FR + 中文 | entrées de 2026 visibles, sans nom ni lien sans compte, aucune requête pour 2027 |
| B3 | Annonce : ligne du Back-Office, paragraphe du guide | texte avant et après la bascule, disparu après le 31/01/2027 |
| B4 | Ménage, en février 2027, sur un go à part : lecteur, `ONGLETS_SHEET`, refus de Q3, tests | suite verte sans eux, plus aucune adresse du Sheet des évènements dans le code |

## Tests

`tests/evenements-2027.spec.ts`, Playwright, trois appareils, écrits avant le code ; Sheet simulé
(`page.route(/docs\.google\.com\/spreadsheets/, …)`, fixture de U8), Firestore simulé, horloge
simulée (`page.clock`).

- 15/12/2026, sans compte : entrées de décembre du Sheet dans l'agenda, sans responsable ni lien ;
  connecté : responsable et lien vers l'onglet du mois ; le téléphone de la fixture n'apparaît
  jamais.
- Formulaire : « Toute l'église » le 20/12/2026 refusé avec le lien ; le 10/01/2027 accepté ; une
  section ou une réunion le 20/12/2026 acceptée.
- 02/01/2027 : agenda et calendrier de janvier sans requête au Sheet (compteur de `page.route`) ;
  pastille « Évènements » ; décembre affiche encore le Sheet.
- `avantBascule` et `agendaPublic` (purs) : bornes du 31/12/2026 et du 01/01/2027, tri par mois.
- Les tests des lots 6, 6 bis et 11 (`tests/evenements.spec.ts`) restent verts.

## Hors périmètre

- **Toujours** : la date de l'évènement décide (Q1) ; FR + 中文 pour ce que voit l'assemblée ; rien
  de nominatif sans compte ; heures « 12:00 » ; trois appareils.
- **Demander avant** : importer quoi que ce soit du Sheet ; une fiche pour une entrée du Sheet ;
  avancer ou reculer la bascule ; garder le lecteur après février 2027.
- **Jamais** : écrire dans le Sheet ; lire ses blocs « Inscriptions » ; recopier ses inscrits dans
  l'app ; une notification de plus pour annoncer la bascule (« Notifier » suffit).

## Questions ouvertes

1. La bascule se lit sur la **date de l'évènement** (un évènement de janvier se crée sur le site dès
   décembre), et non sur le jour de la création ? Recommandation : oui.
2. Entre la mise en ligne et le 31/12/2026, l'agenda de l'assemblée montre les entrées du Sheet ?
   Recommandation : oui (sinon il serait presque vide au lancement).
3. Si la mise en ligne tombe après le 01/01/2027, la bascule reste au 01/01/2027, et les évènements de
   janvier saisis entre-temps dans le Sheet sont recréés à la main ? Recommandation : oui ; mieux
   encore, mettre en ligne avant décembre, sinon la lecture du Sheet n'aura servi qu'en local.
4. Ménage en février 2027 : les entrées de 2026 quittent le calendrier, le Sheet reste l'archive ?
   Recommandation : oui.
5. Sans compte, une entrée du Sheet ne montre pas son responsable, alors que les cartes de l'app
   montrent leur contact (`EvenementCard.tsx` l. 103-111) ; on ne touche pas aux cartes de l'app ?
   Recommandation : oui.

## Commandes

```bash
npm test -- tests/evenements-2027.spec.ts tests/evenements.spec.ts
npm test -- tests/back-office-coupe.spec.ts   # tant que l'interrupteur existe
npx tsc --noEmit && npm run lint               # PW_PORT=3000 si un next dev tourne déjà
```

## Avancement

Validée par le go du 04/10/2026 (redit le 05/10/2026) ; les questions ouvertes prennent leur
recommandation.

**05/10/2026 — B1 (bascule) faite**, branche `lot/u9-evenements-2027` (fusionnée avec
`lot/u8-calendrier` et `lot/u6-back-office` d'abord) :
- `src/lib/evenements/bascule.ts` : `BASCULE_EVENEMENTS = "2027-01-01"`, `avantBascule(date)`,
  `dernierJourDuSheet()` (« 31/12/2026 » dans les phrases).
- Formulaire (`EvenementForm.tsx`) : « Toute l'église » daté avant la bascule → sous la date, « Jusqu'au
  31/12/2026, les évènements de toute l'église s'écrivent dans le Sheet des évènements. » et « Ouvrir le
  Sheet des évènements » (onglet du mois, nouvel onglet) ; « Créer » / « Enregistrer » n'écrit rien.
  Sections, réunions et infos libres. **Modification** : seul le passage dans le Sheet est refusé
  (date reculée avant 2027, ou public passé à « Toute l'église ») ; un évènement déjà dans l'app se
  corrige toujours (choix pris : sinon tout évènement d'essai de 2026 deviendrait intouchable).
- Calendrier (`CalendrierClient.tsx`) : pastille « Évènements (Sheet) » jusqu'au 31/12/2026, « Évènements »
  à partir du 01/01/2027 (horloge) ; un mois affiché à partir de janvier 2027 (ou l'agenda à partir
  d'aujourd'hui, après la bascule) ne lit plus le Sheet, même pour les derniers jours de décembre en tête
  de grille ; revenir en décembre le relit. `lienSheetEvenements(mois)` ajouté à `sheet.ts`.
- Tests : `tests/evenements-2027.spec.ts` (pur, formulaire, pastille et requêtes, capture du refus) ;
  quatre tests existants qui créaient « Toute l'église » en 2026 (`evenements.spec.ts`,
  `back-office-admin.spec.ts`) créent maintenant en janvier 2027.

**05/10/2026 — B2 (agenda public) faite**, même branche :
- `agendaPublic(app, sheet, connecte, today, lang)` dans `src/lib/evenements/agenda.ts` (pur ; `today` et
  `lang` ajoutés à la signature de la spec pour les passés et les noms de mois) : garde les entrées du
  Sheet datées avant la bascule, les mêle aux évènements de l'app par mois (tri `byDate`), passés des
  trois derniers mois derrière le lien ; sans compte, ni responsable ni lien.
- Agenda (`src/app/evenements/CalendrierClient.tsx`) : jusqu'au 31/12/2026, lit le Sheet de
  `daysAgo(today, 92)` à la bascule ; à partir du 01/01/2027, aucune requête.
- Carte compacte `EntreeSheetCarte` (`EvenementCard.tsx`) : vignette de date, titre, « heure · lieu »
  (le texte de la case quand l'heure ne se lit pas, ex. « après le culte »), mention « Tableau des
  évènements » / « 活动表 » ; connecté, dessous « Pour plus d'infos : <responsable> » (s'il y en a un)
  et « S'inscrire sur le tableau » / « 在活动表上报名 » (onglet du mois, nouvel onglet). Ni fiche ni compteur.
- Choix pris : une entrée **passée** du Sheet n'a ni responsable ni lien, même connecté (on ne
  s'inscrit plus, et les cartes passées de l'app n'ont pas non plus « Pour plus d'infos ») ; connecté,
  « S'inscrire sur le tableau » paraît sur **toute** entrée à venir, même sans responsable (lecture
  littérale de Q2) ; un Sheet injoignable n'affiche rien de plus (pas de bandeau côté assemblée).
- Tests : `tests/evenements-2027.spec.ts` (B2 pur, agenda sans compte / connecté / 中文, 02/01/2027 sans
  requête, captures). `tests/helpers/fakeSession.ts` : `fakeFirestore` sert par défaut un Sheet des
  évènements vide (au niveau du contexte : la `page.route` d'un test l'emporte), pour que plus aucun test
  ne lise le vrai Sheet.

**05/10/2026 — B3 (annonce) faite**, même branche (fusionnée d'abord avec la fin de `lot/u6-back-office`,
barre du bas comprise : défaut Accueil · Calendrier · Tâches · Planning · Plus) :
- `annonceBascule(today)` et `FIN_ANNONCE_BASCULE = "2027-01-31"` dans `bascule.ts` : « avant » jusqu'au
  31/12/2026, « apres » du 01/01 au 31/01/2027, rien ensuite.
- `AnnonceBascule` (`src/components/evenements/AnnonceBascule.tsx`) : une ligne discrète (icône « i », fond
  gris clair, `role="note"`, nom « Annonce » / « 公告 ») sous le titre du calendrier
  (`/back-office/calendrier`) et en tête de la liste « Évènements » de la gestion
  (`/back-office/evenements`). Avant : « Les évènements de 2026 restent dans le Sheet ; ceux de 2027 se
  créent ici. » ; après : « Les évènements se créent ici ; le Sheet n'est plus lu. »
- Guide (`/guide`, section Évènements) : un point de plus, « **Où créer un évènement** : ceux de toute
  l'église datés jusqu'au 31/12/2026 s'écrivent dans le Sheet des évènements ; à partir de 2027, ils se
  créent dans le Back-Office › Évènements › « Nouvel évènement », comme les sorties de section et les
  réunions de pôle. » (la date vient de `dernierJourDuSheet()`). La section reste cachée tant que
  l'interrupteur du back-office est coupé, comme avant.
- Choix pris : la ligne n'est **pas** sur « Réunions » ni « Scène » (les réunions ne passent jamais par le
  Sheet) ; elle ne porte pas de lien vers le Sheet (le formulaire l'a déjà, B1) ; le paragraphe du guide
  ne change pas avec l'horloge (il dit les deux règles ; B4 le retirera avec le reste).
- Tests : `tests/evenements-2027.spec.ts`, partie B3 (pur, calendrier et gestion le 15/12/2026, le
  02/01/2027, le 31/01/2027 et le 01/02/2027, réunions sans la ligne, 中文, guide FR et 中文, captures),
  vus rouges puis verts sur ordinateur, téléphone et tablette.

Reste : B4 (ménage de février 2027, sur un go à part).

À la mise en ligne, côté évènements : (1) supprimer les évènements d'essai du Firestore partagé
(Timothée, console ; Q8) ; (2) relire les onglets de 2027 du Sheet et prévenir chaque responsable
concerné (Q4) ; (3) envoyer l'annonce par « Notifier » (Q7 a). U9 ne touche pas à `firestore.rules`.
Timothée relit le 中文 : « {{jour}} 之前，全教会的活动请写在活动表（Sheet）中。 », « 打开活动表 », pastille
« 活动 » / « 活动（Sheet）», et pour B2 « 活动表 », « 在活动表上报名 ». Pour B3 : « 2026 年的活动仍记在活动表（Sheet）中；2027 年的活动请在这里创建。 »,
« 活动请在这里创建；系统不再读取活动表（Sheet）。 », « 公告 », et le point du guide « **在哪里创建活动**：日期在
{{jour}} 之前（含）的全教会活动写在活动表（Sheet）中；从 2027 年起，请在 **后台 › 活动 ›「新建活动」**中创建，
小组外出和部门会议也一样。 »
