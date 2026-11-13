# Annexe de spec · corrections du design · groupe Évènements et scène (App)

Source : planche `docs/planches/planche-corrections-evenements-app.html` ; décisions : recommandations (Timothée, 03/11/2026)

Dix constats retenus (evenements-app-11 écarté à la contre-vérification : le « Sheets…… » de `zh-CN.json` contient déjà le point de suspension chinois, rien à corriger). Aucun constat gelé. Les numéros de ligne ont été vérifiés dans le code le 03/11/2026 ; ils bougeront dès la première tranche, rechercher par le texte cité.

| id | tranche | effort |
|---|---|---|
| evenements-app-1 | T1 | petit |
| evenements-app-2 | T1 | moyen |
| evenements-app-4 | T1 | petit |
| evenements-app-5 | T1 | petit |
| evenements-app-6 | T1 | petit |
| evenements-app-7 | T1 | petit |
| evenements-app-8 | T1 | petit |
| evenements-app-9 | T1 | petit |
| evenements-app-10 | T1 | petit |
| evenements-app-3 | T4 | petit |

Nombre d'entrées : T1 = 9, T2 = 0, T3 = 0, T4 = 1, T5 = 0.

Pourquoi evenements-app-3 est en T4 : le correctif (colonne unique plafonnée à 720 px) est un exemple de la règle de largeur L1 du chantier 4 ; il y va avec les autres pages de gestion. Les neuf autres sont des finitions propres à un composant ou à une page, indépendantes des chantiers 2 à 5.

Ordre dans T1 : evenements-app-4 (primitive `Textarea`) avant le reste si l'on veut regarder les quatre emplois d'un coup ; evenements-app-8 et evenements-app-10 touchent les mêmes pages (Modifier, Nouveau) et se testent dans la même spec. Sinon les entrées sont indépendantes.

Liens avec les autres tranches (aucun constat de ce groupe n'est en T2, T3 ou T5) :
- T2 (fond de groupe gris `#f2f2f7`, groupes blancs sans ombre) : le champ Description aligné sur `bg-secondary` (evenements-app-4) se pose sur une carte ; à regarder après T2 sur le fond gris, voir la vigilance de l'entrée.
- T3 (rail segmenté) : `ChoixInscriptions` (segmenté « Automatique / Ouvertes / Fermées ») sera repris par T3 ; evenements-app-5 n'y touche pas.
- T4 : le texte « 13 px » de evenements-app-7 et evenements-app-9 reste à 13 px (cran de l'échelle B, au-dessus du plancher de 12 px).

Rappels valables pour toutes les entrées :
- Libellés en français ET en chinois (`src/locales/fr.json`, `src/locales/zh-CN.json`), insérés en texte au bon endroit, jamais par `json.dump`.
- Zone gelée intacte : `#3f51a3` (couleur de la scène, `PLANNING_COLORS.scene`) garde sa valeur ; seule sa variante sombre, déjà calculée par `couleurSombre()` (`#9fa8d1`, via `styleTexteService` et la classe `.texte-service`, `src/lib/couleurSombre.ts:63`), est appliquée là où elle manque.
- Aucun nom réel de membre dans les tests : noms fictifs inventés pour chaque test (« Alix D. » est un nom de dessin de la planche).
- Tests sur les trois appareils au moins ; les pages à deux volets (Modifier, Nouveau, scène) se regardent sur les quatre dispositions plus 1 440 px. Les specs d'agencement s'ajoutent à `SPECS_GRAND_ECRAN` (`playwright.config.ts:16`) si elles n'y sont pas.
- Interrupteur du back-office : tout ce qui est sous `/back-office/*` reste derrière `BACK_OFFICE` ; rien ici ne crée de page.

---

### evenements-app-1 · Aucune entrée de navigation active sur Nouvel évènement et Modifier
- Tranche : T1
- Décision : A, Calendrier actif sur toute la branche Évènements, la scène garde sa pastille.
- À faire :
  - `src/lib/navigation.ts:55` (entrée `calendrier` de `ENTREES_BACK_OFFICE`) : `actifSur: ["/back-office/calendrier"]` devient `actifSur: ["/back-office/calendrier", "/back-office/evenements", "/back-office/reunions"], saufSur: ["/back-office/evenements/scene"]`. Le champ `saufSur` existe déjà dans `EntreeBarre` (`navigation.ts:27-28`) et est évalué avant `actifSur` (`:185-186`).
  - Réunions : la planche l'ajoute en question à décider (Q1 du directeur artistique, proposition « oui ») ; vérifié, `src/app/back-office/reunions/layout.tsx:26` a le même retour `« ‹ Calendrier »` vers `/back-office/calendrier`, et `/back-office/reunions` n'est dans aucun `actifSur` aujourd'hui. Les réunions allument donc Calendrier aussi (même règle).
  - La scène : `scene` (`navigation.ts:56`) garde `actifSur: ["/back-office/evenements/scene"]`, donc sa pastille ; le `saufSur` empêche Calendrier de s'allumer en même temps.
  - Ne pas ajouter d'entrée « Évènements » (piste C écartée par le directeur artistique : défait la décision des cinq entrées BO1) ni d'état « parent » en contour (piste B).
  - Aucune clé de langue.
- Critères : sur `/back-office/evenements/nouveau`, `/back-office/evenements/<id>/modifier`, `/back-office/evenements/<id>` et `/back-office/reunions/…`, « Calendrier » / 日历 est la seule entrée allumée : pastille noire dans la barre latérale (ordinateur, tablette paysage réduite), pastille dans la barre du bas (téléphone, tablette portrait). Sur `/back-office/evenements/scene`, seule « Scène » est allumée. Sur `/back-office/calendrier`, inchangé. Clair, sombre, français, 中文.
- Test : adapter `tests/back-office-admin.spec.ts` (déjà dans `SPECS_GRAND_ECRAN`, `playwright.config.ts:89`) ou `tests/navigation-grand-ecran.spec.ts` : sur les quatre adresses ci-dessus, `aria-current="page"` (ou la classe de pastille utilisée par les autres assertions de la spec) est sur Calendrier et nulle part ailleurs ; sur la scène, sur Scène seulement. Vérifier aussi que `tests/back-office-coupe.spec.ts` (interrupteur coupé) reste vert.
- Points de vigilance de la planche : la hauteur de la barre du téléphone dans la capture est un artefact de la pleine page (pas un défaut) ; lire la barre du bas à sa vraie place, la planche ne l'a pas vue.

### evenements-app-2 · Fiche Noël en deux volets : bas de carte coupé, « Ordre de passage du jour J » tranché
- Tranche : T1
- Décision : A, « Ordre de passage du jour J » en pied fixe de la carte, plus un signe de défilement (ombre de bord) dans `DeuxVolets`, pour toutes les listes en deux volets (Q3 de la planche, proposition « oui »).
- À faire :
  - `src/app/evenements/scene/FeteClient.tsx:285` : la ligne `{deuxVolets && entreeOrdre && <div className="border-t border-border pt-3">{entreeOrdre}</div>}` sort de la colonne scrollable (`:277-286`, `<div className="space-y-5 p-5">`). Le bouton `entreeOrdre` (`:205-220`) devient le pied de la carte : `sticky bottom-0`, fond `bg-card`, filet haut d'1 px `border-t border-border`, hauteur 64 px (le bouton fait déjà `py-3`, icône 36 px). Ne plus mettre `p-5` sur le pied : même marge latérale que la colonne (`px-5`).
  - `src/components/layout/DeuxVolets.tsx:109` (carte de la liste : `sticky top-[calc(var(--nav-h)+20px)] max-h-[calc(100dvh-…)] … overflow-y-auto overscroll-contain raised rounded-2xl`) : ajouter l'ombre de bord de 16 px par l'astuce CSS des fonds `local` / `scroll` (`background-attachment`), en haut et en bas : `rgba(0,0,0,.08)` en clair, `rgba(0,0,0,.5)` en sombre (deux variables dans `globals.css`, ou une classe utilitaire `.defilement-bords`). Elle ne s'affiche que lorsque la liste déborde et n'est pas arrivée au bout ; sans JavaScript. Le fond doit rester `--card` sous l'astuce (les dégradés de bord se superposent au fond de la carte).
  - Le pied fixe est propre à la fiche fête : le passer à `DeuxVolets` par la prop `liste` n'est pas nécessaire, `FeteClient` rend un fragment `<> <div scrollable/> <pied/> </>` dans `liste` ; vérifier que `sticky bottom-0` s'ancre bien sur le conteneur à défilement de `DeuxVolets` (c'est lui qui défile, pas la page). Si la hauteur de la carte est calculée sur le seul contenu, passer la carte en `flex flex-col` pour que le pied reste dans le cadre.
  - Une colonne (téléphone, tablette portrait) : inchangé, l'entrée reste la carte `raised rounded-2xl p-1` sous la colonne (`FeteClient.tsx:312`).
  - Aucune clé de langue (`planning.fete.ordreEntree` existe).
- Critères : ordinateur 1 280 × 720 et 1 440 × 900, clair et sombre : le lien « Ordre de passage du jour J » / 当天上场顺序 est toujours entièrement visible au bas de la carte, jamais tranché ; l'ombre de bord apparaît quand la liste déborde (haut quand on a défilé, bas tant qu'on n'est pas au bout) et disparaît au bout. À 1 280 × 720 on voit une semaine de moins (cinq au lieu de six), c'est le coût assumé de la planche. Tablette paysage : même comportement. Téléphone et tablette portrait : inchangés. Regarder en passant Harmonie, Mes services et les pages de gestion (même `DeuxVolets`) : l'ombre ne doit pas gêner une liste qui ne déborde pas.
- Test : adapter `tests/scene-des-fetes.spec.ts` (dans `SPECS_GRAND_ECRAN`) : viewport 1 280 × 720, fête Noël avec les semaines et les semaines passées dépliées, le bouton « Ordre de passage du jour J » a `boundingBox().y + height <=` bas de la carte de liste et reste dans la fenêtre ; `getComputedStyle` de la carte porte le fond d'ombre. Ajouter un test sur `DeuxVolets` (une autre page en deux volets, p. ex. Mes services) : pas de bande d'ombre quand la liste ne déborde pas.
- Points de vigilance de la planche : `DeuxVolets` est partagé (Harmonie, Mes services, gestion) : le défaut guette toute liste plus haute que la fenêtre, d'où l'ombre générale ; la piste B (carte non bornée, `collante={false}`) et la piste C (ordre en tête, défait Q16) sont écartées. Le mouvement (défilement) n'est pas vu dans les captures statiques : le regarder à l'œil.

### evenements-app-4 · Le champ Description n'a pas la recette des autres champs
- Tranche : T1
- Décision : A, aligner la primitive `ui/textarea.tsx` sur `ui/input.tsx` (corrige les quatre emplois d'un coup).
- À faire :
  - `src/components/ui/textarea.tsx` : la chaîne de classes `flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-base ring-offset-background …` devient celle de `src/components/ui/input.tsx` (`border border-transparent bg-secondary`, même anneau de focus, même `rounded-lg`), avec `min-h-[96px]` (au lieu de 80) et `resize-y` gardé sans poignée plus foncée que le fond. Lire `input.tsx:10-12` et reprendre mot pour mot son bloc de classes (hauteur exceptée) pour que les deux restent jumeaux.
  - Les quatre emplois (pas de changement de code, à regarder à l'œil) : `src/components/evenements/EvenementForm.tsx:240`, `src/components/planning/PrevenirChangements.tsx:318` (porte `className="mt-1 text-[16px] sm:text-sm"`), `src/components/setlists/EditLineSheet.tsx:418`, `src/app/questionnaire/page.tsx:128`.
  - Piste C (`field-sizing: content`) non retenue.
  - Aucune clé de langue.
- Critères : Nouvel évènement et Modifier, téléphone, tablette portrait, ordinateur, clair et sombre : le champ Description est gris (`--secondary`) sans bord, comme Responsable et Nom, y compris en sombre (plus de bloc noir `#000` dans la carte `#1c1c1e`). Sur les trois autres emplois : le champ reste visible (voir la vigilance). Focus : même anneau que `Input`.
- Test : adapter `tests/pages-en-grand-evenements.spec.ts` : sur `/back-office/evenements/nouveau`, `getComputedStyle` de `#ev-description` a la même `backgroundColor` et la même `borderTopColor` que `#ev-titre`, en clair et en sombre. Captures à l'œil des trois autres emplois (consigne de ligne de setlist, questionnaire, « Prévenir les changements ») avant de livrer.
- Points de vigilance de la planche : un textarea gris posé sur un fond lui-même `--secondary` disparaîtrait (non vu : aucune capture du groupe ne montre les trois autres emplois) ; si l'un d'eux est dans ce cas, lui passer `bg-background` en `className` ou le poser sur `--card` plutôt que de défaire la primitive. Après T2 (groupes blancs sur fond gris `#f2f2f7`), le regarder de nouveau.

### evenements-app-5 · Le libellé « Inscriptions » n'a pas le style des autres libellés
- Tranche : T1
- Décision : A, remettre le libellé dans la recette `LABEL`.
- À faire :
  - `src/components/evenements/EvenementForm.tsx:278` : `<p className="text-sm">{t("evenements.form.inscriptions")}</p>` devient `<p className={LABEL}>…</p>` (`LABEL = "text-sm text-muted-foreground"`, défini ligne 105).
  - `:268` : le bloc `<div className="space-y-3 px-4 py-3.5">` passe à `space-y-4` (16 px entre le groupe « Lien d'inscription externe » et le groupe « Inscriptions »). Le sous-bloc `space-y-2` de la ligne 277 (libellé + segmenté) reste.
  - La planche demande `id` sur le `<p>` et `aria-labelledby` sur le segmenté : `ChoixInscriptions` (`src/components/evenements/ChoixInscriptions.tsx:13-22`) n'a qu'une prop `label` posée en `aria-label` (même texte que le `<p>`), donc le groupe est déjà nommé. Ne pas modifier le composant (T3 le reprend avec le rail segmenté) ; garder `label={t("evenements.form.inscriptions")}`.
  - Aucune clé de langue.
- Critères : Nouvel évènement et Modifier, téléphone, tablette, ordinateur, clair et sombre, français et 中文 (« 报名 ») : « Inscriptions » est en gris moyen comme « Ouverture des inscriptions », 16 px sous la note du lien externe (mesure de la planche : environ 15 px avant, 17 à 19 px entre les autres groupes). Mode « Ouvertes » / « Fermées » : la note d'aide (`modeAide`) reste sous le segmenté.
- Test : adapter `tests/pages-en-grand-evenements.spec.ts` ou `tests/evenements-2027.spec.ts` (ouvre `/back-office/evenements/nouveau`) : la couleur calculée du libellé « Inscriptions » égale celle du libellé « Ouverture des inscriptions » ; `getByRole("radiogroup", { name: "Inscriptions" })` existe toujours.
- Points de vigilance de la planche : mesure honnête, l'écart d'air actuel est faible (15 px) ; le vrai défaut est la couleur et le regroupement. Le rapport entre le lien externe et le mode reste implicite (piste C, quatrième mode « Lien », renvoyée à un lot à part si les coordinateurs confondent lien et mode, à décider avec T3).

### evenements-app-6 · Retour « ‹ Évènements » : cible tactile d'environ 20 px
- Tranche : T1
- Décision : A, zone élargie invisible (pseudo-élément), corrigée sur tout le site d'un coup.
- À faire :
  - `src/components/layout/EnTetePage.tsx:27` (composant `Retour`) : ajouter `relative` à la classe du `<Link>` (`-ml-1 mb-1.5 inline-flex items-center gap-0.5 rounded-md text-[14px] leading-5 font-semibold text-muted-foreground transition-colors hover:text-foreground`) et un pseudo-élément `after:absolute after:-inset-x-2 after:-inset-y-3 after:content-['']` : zone de 44 px de haut (20 + 12 + 12), largeur du texte plus 16 px. L'aspect et la mise en page ne changent pas. C'est la recette de zone tactile élargie déjà employée ailleurs (p. ex. `src/components/planning/PlanningGrille.tsx:730`, `after:absolute after:-inset-2 after:content-['']`) ; la planche l'attribue au sélecteur d'espace, dont le code n'a pas été retrouvé par recherche.
  - Les 12 px du haut empiètent sur le titre juste au-dessus (le `h1` n'est pas cliquable) et au téléphone sur la barre du haut (le retour est à 48 px sous elle) : vérifier que `after:-inset-y-3` ne passe pas sous la barre (z-index).
  - Aucune clé de langue.
- Critères : sur toutes les pages à retour (une vingtaine), au téléphone et en tablette portrait, la cible tactile (`boundingBox()` du lien, pseudo-élément compris, mesuré avec `elementFromPoint`) fait au moins 44 px de haut ; rien ne bouge visuellement (mêmes positions de titre qu'avant). Clair, sombre, français, 中文. Au clavier, l'anneau de focus suit le texte (le pseudo-élément ne le déforme pas).
- Test : adapter `tests/look-navigation.spec.ts` (ou la spec qui teste l'en-tête de page `data-entete-page`) : sur `/back-office/evenements/nouveau`, `document.elementFromPoint` à 20 px au-dessus et à 20 px sous le texte du retour renvoie le lien ; hauteur du `h1` et position `y` du titre inchangées avant/après.
- Points de vigilance de la planche : c'est le composant `Retour` (« le seul retour du site », R8) : le correctif touche toutes les pages ; piste B (hauteur réelle `min-h-11`, l'en-tête grandit de 24 px) et piste C (retour iOS dans la barre du haut, gros) écartées.

### evenements-app-7 · Cartes de semaines : carrés sans légende, places dites aux seuls lecteurs d'écran
- Tranche : T1
- Décision : A, le détail court visible sous la date et la couleur sombre corrigée.
- À faire :
  - `src/app/evenements/scene/Entrainements.tsx:304` : le `<span>` du détail est `sr-only` hors deux volets. Il devient visible aussi sur la bande horizontale (téléphone, tablette portrait) : sous la date, une ligne `block text-[13px] text-muted-foreground` (sur la carte active : `opacity-75` comme en deux volets) avec le texte court. En deux volets (`deuxVolets`), le texte long `places(...)` (`:233`, « 5 places libres », `:291`) est inchangé.
  - Texte court : créer `planning.semaines.libresCourt` (clé nouvelle, `src/locales/fr.json` dans `planning.semaines`, après `passees` ligne 1571 ; `src/locales/zh-CN.json` après `passees` ligne 1539) : fr `"libresCourt_one": "{{count}} libre"`, `"libresCourt_other": "{{count}} libres"` ; zh-CN `"libresCourt_one": "余 {{count}}"`, `"libresCourt_other": "余 {{count}}"` (même suffixe pluriel que `placesLibres_*`). Pour l'état complet, réutiliser `planning.semaines.complet` (existe : fr « complet », zh « 已满 », `fr.json:1579`, `zh-CN.json:1547`). La ligne 291 compose donc le détail long (deux volets) ou le court (bande) : `places(libres, cases, court)`.
  - `Cases` (`Entrainements.tsx:448-457`) : remplacer la couleur brute `COLOR` (ligne 43, `PLANNING_COLORS.scene` = `#3f51a3`, zone gelée : valeur inchangée) par la variante sombre : poser sur le conteneur `className="texte-service"` et `style={styleTexteService(COLOR)}` (import `@/lib/couleurSombre`, comme `FeteClient.tsx:39`), et utiliser `currentColor` pour les bordures et le fond des carrés pris. Le test `actif ? "currentColor" : COLOR` à la ligne 450 disparaît (la carte active garde le texte `text-background` via `currentColor`, à vérifier : la classe `texte-service` ne doit pas s'appliquer sur la carte active, sinon la couleur forcée casse l'inversion encre/fond). Le mélange des carrés libres passe de 45 % à 60 % (`color-mix(in srgb, currentColor 60%, transparent)`).
  - La planche écrit que `COLOR` est « ligne 451 » : c'est la fonction `Cases` (`:448`) qui l'utilise, la constante est ligne 43.
  - Les attributs `data-case="pris"|"libre"` (utilisés par les tests) restent.
- Critères : téléphone 390 px et tablette portrait 820 px, clair et sombre, 中文 : chaque carte de semaine (124 px de large) montre sa date, « 4 libres » ou « complet » (« 余 4 » ou « 已满 » en 中文, qui tient dans 124 px, à confirmer sur le rendu réel y compris en 1 440 px zh-clair non vu dans l'audit), puis les carrés. La bande prend environ 18 px de plus en hauteur. En sombre, un carré pris se lit à 3:1 au moins sur `#1c1c1e` (planche : 7,3:1 pour `#9fa8d1`, contre 2,4:1 aujourd'hui) et un carré libre à 3:1 au moins avec le mélange à 60 %. Ordinateur (liste de gauche) : seuls les carrés changent de couleur en sombre.
- Test : adapter `tests/scene-paques-noel.spec.ts` (contient « Semaines passées ») et `tests/programme-scene.spec.ts` : à 390 px, chaque carte de la bande a un texte visible `/libres?|complet/` (`toBeVisible`, plus `sr-only`) ; en `zh-CN`, `/余 \d|已满/` ; en thème sombre, `getComputedStyle` de la couleur d'un `[data-case="pris"]` donne `rgb(159, 168, 209)` (soit `#9fa8d1`). Ajouter la spec à `SPECS_GRAND_ECRAN` si elle n'y est pas (elle y est : `playwright.config.ts:105`).
- Points de vigilance de la planche : la largeur de la carte ne change pas (124 px) ; le libellé chinois tient (non vérifié en zh-clair 1 440 px) ; légende (B) et chiffre « 1/5 » (C) écartés ; ne rien changer à `#3f51a3`.

### evenements-app-8 · « Modifier » en double sur la page Modifier
- Tranche : T1
- Décision : A, cacher le `<h2>` du formulaire en une colonne (`titreCache={!deuxVolets}`), comme la création.
- À faire :
  - `src/app/back-office/evenements/[id]/modifier/ModifierClient.tsx:64` : sur `<EvenementForm initial={initial} pours={pours} creation={false} …>`, ajouter `titreCache={!deuxVolets}` (la variable `deuxVolets` existe, `:27`), exactement comme `src/app/back-office/evenements/nouveau/NouveauClient.tsx:107`. Le `<h2 id="evenement-form-title">` reste dans le DOM en `sr-only` (`EvenementForm.tsx:173`, et il nomme le formulaire par `aria-labelledby`, `:172`).
  - Le sous-titre gris de l'en-tête (`ModifierClient.tsx:48`, `sousTitre={evenement ? t("evenements.modifier") : undefined}`) reste : c'est lui qui garde le mot « Modifier » à l'écran en une colonne.
  - Aucune clé de langue.
- Critères : téléphone et tablette portrait, français et 中文 : nom de l'évènement (titre), « Modifier » / 修改 une seule fois (sous-titre gris), puis directement la carte du formulaire, remontée d'environ 48 px. Ordinateur, tablette paysage, 1 440 px (deux volets) : inchangés, le `<h2>` « Modifier » du volet de droite reste visible. Lecteurs d'écran : le formulaire reste nommé « Modifier ».
- Test : adapter `tests/pages-en-grand-evenements.spec.ts` : sur `/back-office/evenements/<id>/modifier`, en une colonne `getByText("Modifier", { exact: true })` visible = un seul élément (le `<h2>` est `sr-only`) ; en deux volets, le `<h2>` « Modifier » est visible.
- Points de vigilance de la planche : le doublon n'existe qu'en une colonne ; piste B (sous-titre = date et heure, perd le mot « Modifier ») et piste C (titre « Modifier l'évènement ») écartées.

### evenements-app-9 · Deux recettes de lien côte à côte sur la scène
- Tranche : T1
- Décision : A, « Semaines passées (5) » devient un vrai bouton qui déplie, avec chevron qui tourne.
- À faire :
  - `src/app/evenements/scene/Entrainements.tsx:276-278` : le bouton `<button type="button" aria-expanded={voirPassees} onClick=…>` (classes `px-1 text-[13px] font-semibold text-foreground underline underline-offset-4 decoration-foreground/30 hover:decoration-foreground`) perd le soulignement et prend la recette du dépliage : `inline-flex min-h-11 items-center gap-1 px-1 text-[13px] font-semibold text-muted-foreground hover:text-foreground`, avec un `ChevronDown` de 14 px (`h-3.5 w-3.5`, `aria-hidden`) à droite, qui tourne de 180 degrés quand `voirPassees` (`transition-transform duration-200`, `motion-reduce:transition-none`, `rotate-180` ouvert). Zone de 44 px de haut.
  - Libellé fermé : `planning.semaines.passees` (existant, « Semaines passées ({{n}}) » / « 过去的周（{{n}}） »). Libellé ouvert : nouvelle clé `planning.semaines.masquerPassees` (fr.json dans `planning.semaines`, après `passees` ligne 1571 ; zh-CN.json après `passees` ligne 1539) : fr « Masquer les semaines passées », zh-CN « 收起过去的周 ». Le bouton affiche `voirPassees ? masquerPassees : passees`.
  - Le bouton « Gérer dans le Back-Office » (variante contour) ne change pas : les deux commandes ne se ressemblent plus parce qu'elles ne font pas la même chose.
  - La condition `passees.length > 0` (`:275`) et la logique `showPast` / `voirPassees` (`:115`) ne bougent pas. Quand une semaine passée est choisie, `voirPassees` est vrai et le bouton dit « Masquer… » : comportement existant, à regarder.
- Critères : téléphone 390 px et ordinateur (liste de gauche), clair, sombre, français et 中文 : fermé « Semaines passées (5) ⌄ » / « 过去的周（5）⌄ », ouvert « Masquer les semaines passées ⌃ » / « 收起过去的周 ⌃ » ; pas de soulignement ; chevron qui tourne en 200 ms (sans rotation sous `prefers-reduced-motion`) ; zone tactile de 44 px de haut ; `aria-expanded` correct.
- Test : adapter `tests/scene-paques-noel.spec.ts` (ou `tests/programme-scene.spec.ts`, qui contiennent « Semaines passées ») : le bouton a `aria-expanded="false"` puis `"true"` après clic et change de libellé ; `getComputedStyle` : `textDecorationLine` vaut `none` ; hauteur du bouton >= 44 ; en `zh-CN`, 收起过去的周 après clic. Tout test qui cherchait le texte « Semaines passées » après ouverture est à adapter au nouveau libellé.
- Points de vigilance de la planche : le défaut de fond de la planche, c'est que le soulignement promet une navigation alors que le bouton déplie sur place ; le mouvement du chevron n'est pas vu en capture statique, le regarder à l'œil ; pistes B (même pastille) et C (carte fantôme dans la bande) écartées. Une clé de plus à traduire (texte chinois à valider : « 收起过去的周 », déjà validé par « comme recommandé »).

### evenements-app-10 · « + Nouvel évènement » reste actif sur la page de création
- Tranche : T1
- Décision : A, le masquer sur `/back-office/evenements/nouveau`.
- À faire :
  - `src/app/back-office/evenements/layout.tsx:48` : `action={!scene && peutCreerDans(user, profile, false) && <BoutonNouveau … />}` devient `action={!scene && !surNouveau && peutCreerDans(user, profile, false) && <BoutonNouveau … />}`, avec `const surNouveau = chemin === \`${BASE}/nouveau\`` près de la ligne 37 (`chemin`, `BASE` et `SCENE` existent déjà dans le fichier, lignes 27-28 et 32). Ne pas masquer sur `/modifier` (hors constat).
  - `BoutonNouveau` (`src/components/layout/BoutonNouveau.tsx`) rend, au téléphone, un rond « + » fixe de 52 px (`fixed … max-md`, ligne 19) et, dès `md`, un bouton dans l'en-tête : l'`action` à `false` supprime les deux, donc la question de la planche sur le rond fixe est réglée par la même ligne. Le vérifier au téléphone et en tablette portrait (non capturé dans la planche).
  - Réunions (hors planche, laissé de côté) : `src/app/back-office/reunions/layout.tsx:29` pose `BoutonNouveau` sur toutes les pages dont `/back-office/reunions/nouvelle` ; même défaut probable, à confirmer avec Timothée avant de l'étendre.
  - Aucune clé de langue.
- Critères : ordinateur 1 280 px et 1 440 px, tablette paysage (deux volets), clair, sombre, français et 中文 : sur la page de création, le haut à droite de l'en-tête est vide ; l'action principale est « Créer l'évènement » au bas du formulaire. Sur la liste et la fiche : le bouton est là. Téléphone et tablette portrait : aucun rond « + » fixe sur `/nouveau` (regarder sur toute la hauteur de la page).
- Test : adapter `tests/pages-en-grand-evenements.spec.ts` (ligne 103-105 : « responsable : « Nouvel évènement » en encre… ») : sur `/back-office/evenements/nouveau`, `header[data-entete-page]` n'a pas de lien « Nouvel évènement » et, au téléphone, `getByRole("link", { name: "Nouvel évènement" })` est absent de la page ; sur la liste, présent.
- Points de vigilance de la planche : le bouton apparaît et disparaît d'une page à l'autre (contre accepté) ; piste B (état « choisi » inerte) et piste C (« Annuler », deux « Annuler » à l'écran) écartées.

### evenements-app-3 · Scène des fêtes dans une fenêtre de 1 024 à 1 147 px : créneaux étirés
- Tranche : T4
- Décision : A, une seule colonne plafonnée à 720 px (règle de largeur L1 du chantier 4), après avoir refait la capture.
- À faire :
  - Avant tout : refaire la capture de la tablette paysage. Les captures de l'audit (barre dépliée, une seule colonne) contredisent le comportement d'un iPad couché (`TABLETTE_PAYSAGE` donne deux volets et la barre réduite, `src/hooks/useDeuxVolets.ts`, `src/lib/deuxVolets.ts`) : fenêtre seule, ou projet `tablette-paysage` (`devices["iPad (gen 7) landscape"]`, `playwright.config.ts:159`) avec `matchMedia('(pointer: coarse)')` vérifié dans le test. Le rendu étiré existe pour de vrai, mais dans une fenêtre d'ordinateur de 1 024 à 1 147 px (sous `ORDINATEUR_LARGE`, 1 148 px, qui refuse les deux volets) avec la barre dépliée : c'est ce cas que la correction traite.
  - `src/app/evenements/scene/FeteClient.tsx`, branche une colonne (après `if (vueOrdre)`, `:300`, le `return` final, `<div className="space-y-5 px-[var(--marge-page)]">`) : ajouter `max-w-[720px]` sur le contenu sous l'en-tête, aligné à gauche (pas de `mx-auto`), à partir de 640 px utiles. « Réserver » passe de ~728 px à ~690 px de l'heure. La bande de semaines garde son défilement horizontal. Si T4 a déjà fixé la classe de la règle L1 (variable ou utilitaire), l'utiliser à la place de `max-w-[720px]`.
  - Le même plafond vaut pour la vue ordre de passage en une colonne (`:300-306`, `<div className="space-y-3 px-[var(--marge-page)]">`) : y poser le même plafond pour garder les deux vues alignées.
  - Aucune clé de langue.
- Critères : fenêtre d'ordinateur de 1 080 px (zone de contenu 832 px) et tablette portrait 820 px : la colonne mesure au plus 720 px, alignée à gauche, la ligne « 14:00 Libre … Réserver » ne dépasse pas 720 px ; téléphone (390 px) inchangé ; ordinateur en deux volets (1 280 px, 1 440 px) et tablette paysage (barre réduite, deux volets) inchangés. Clair, sombre, français, 中文.
- Test : adapter `tests/scene-des-fetes.spec.ts` (dans `SPECS_GRAND_ECRAN`) : viewport 1 080 × 800, ouvrir une fête avec créneaux, `boundingBox().width <= 720` du conteneur de la colonne ; et, sur le projet `tablette-paysage`, `matchMedia("(pointer: coarse)").matches` est vrai et la page est en deux volets (`data-volet="liste"` présent).
- Points de vigilance de la planche : capture à refaire avant de dessiner (hypothèse : la pleine page ou l'émulation tactile de Chromium ne tient pas `pointer: coarse` ou `orientation: landscape`) ; toutes les captures tablette-paysage de ce groupe sont à reprendre ; un vide à droite sur une fenêtre de 1 100 px, comme sur les autres pages de gestion du chantier 4 ; pistes B (créneaux en grille de deux) et C (abaisser le seuil des deux volets, serre le volet de droite à ~490 px) écartées.
