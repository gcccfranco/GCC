# Spec : lot 8 — Nouveaux membres et 中文

Lot 8 de `feuille-de-route.md` § 2 (chantier 7), voulu le 13/09/2026
(`intent/vision-site.md` : « l'app s'explique toute seule », guide plus facile
à trouver, **l'accueil à la première connexion revient**, interface en 中文
aussi soignée que le français) ; plus utile depuis que toute l'assemblée
arrive (14/09/2026). Entretien du 16/09/2026 (Q16 à Q23), recommandations
toutes acceptées. **Go donné le 16/09/2026** (« Go pour tous les lots 5, 7
et 8 »).

## Objectif

1. Un **accueil court** à la première ouverture après connexion.
2. Un **guide à jour et facile à trouver**.
3. **Plus aucun texte en français** sur les écrans d'un membre quand
   l'interface est en 中文, et des traductions **relues par un sinophone**.

Réussite : un compte neuf voit l'accueil une fois, sur n'importe quel
appareil ; le guide couvre toutes les sections actuelles ; en 中文, les écrans
membres (hors administration) ne montrent aucun texte français ; la planche de
relecture est prête à envoyer.

## Ce que le code montre (16/09/2026)

- Ancien accueil supprimé le 18/07/2026 : carrousel de **17 écrans**
  (`OnboardingTour.tsx`, `steps.ts`), drapeau `onboarding/{uid}` ; commits
  `26d5621`, `c44c871` (retrait du layout), `24a847d` (règle retirée).
- Guide `/guide` : sections songs, customize, performance, setlists, compose,
  planning, **annonces** (supprimées au lot 6), notifications, report, roles,
  account ; **rien** sur Évènements, programme de scène, version perso, coup
  d'œil, page Moi. 15 captures **ordinateur** (2560×1600) annotées
  (`figures.ts`, `GuideFigure.tsx`). Entrées : ligne « Guide » dans Moi et
  menu compte sur ordinateur.
- 中文 : 1 116 clés dans chaque fichier de langue, à parité. Textes en dur
  relevés : fenêtre de signalement (`ReportDialog`), invitation et réglage des
  notifications (`PushPrompt`, `PushToggle`), proposition de chant
  (`SongProposalDrawer`), retouche de ligne (`EditLineSheet`), page Notifier,
  sélecteur de tonalité des scans (`JianpuSheet`), et l'administration
  (exclue). Messages push du serveur en français seulement : notification au
  président (lot 2), évènements, conflits de scène ; les rappels suivent déjà
  la langue (`notifPrefs/{uid}.lang`).
- Écrans vides : setlists (« Aucune setlist pour l'instant. »), mes services
  (« Aucun service à venir »)… disent ce qui manque, pas quoi faire.
- `PushPrompt` invite déjà à activer les notifications.

## Décisions (entretien du 16/09/2026)

| # | Décision |
| --- | --- |
| Q16 | Coder l'accueil, le guide (texte) et les traductions maintenant ; **captures après la validation du look** par Timothée. |
| Q17 | Accueil de **5 écrans au plus**, nouveau style : bienvenue dans « GCC » ; les cinq onglets sur un écran ; un écran selon le rôle ; activer les notifications ; fin avec le lien vers le guide. « Passer » partout. |
| Q18 | **Tous les comptes** le voient une fois, à la prochaine ouverture. |
| Q19 | « Vu » mémorisé **par compte** (`onboarding/{uid}`, règle à remettre et à publier). |
| Q20 | Guide mis à jour (Évènements, programme de scène, version perso, coup d'œil, Moi ; Annonces retirées) ; écrans vides qui disent quoi faire ; lien « Comment ça marche ? » en bas de Chants, Setlists, Planning, Évènements vers la bonne section du guide. |
| Q21 | Captures du guide prises **sur téléphone**, données fictives. |
| Q22 | Tout traduire **sauf l'administration**. |
| Q23 | Planche de relecture FR / 中文 par écran ; **relue par Timothée** (16/09/2026). |

## Ce qui sera construit — cinq tranches

### A1 — Accueil à la première connexion

- `src/components/onboarding/Accueil.tsx` : plein écran sur téléphone,
  fenêtre centrée sur tablette et ordinateur ; points de progression ;
  « Passer » en haut ; glisser ou « Suivant ».
  1. **Bienvenue dans GCC** — l'app de l'église : chants, setlists, planning,
     évènements.
  2. **Les cinq onglets** — Chants · Setlists · Planning · Évènements · Moi,
     une ligne chacun, avec l'icône de la barre du bas.
  3. **Selon le rôle** : présidence → « Préparer une setlist » ; musicien ou
     choriste → « Répéter avec la setlist et le mode louange » ; sans rôle →
     « Le planning et les évènements de l'église ». Plusieurs rôles : la
     présidence d'abord.
  4. **Notifications** — bouton « Activer » (même logique que `PushPrompt`) ;
     masqué si déjà activées ou non prises en charge.
  5. **C'est parti** — lien « Ouvrir le guide », bouton « Commencer ».
- Monté dans le layout pour un compte connecté sans `onboarding/{uid}` ;
  jamais sans compte ; « Passer » ou « Commencer » écrit `onboarding/{uid}`
  `{ vu: true, le }`. Pendant l'accueil, `PushPrompt` ne s'affiche pas.
- Règle `onboarding/{uid}` remise (lecture et écriture par son propriétaire),
  commentaire miroir dans `access.ts`.
- FR et 中文.

### A2 — Guide à jour et plus visible

- `/guide` : section Annonces remplacée par **Évènements** (calendrier,
  inscription, réunions de pôle si le lot 7 est livré) ; nouvelles sections
  **Programme de scène**, **Vue partitions et coup d'œil**, **Ma version**,
  **Moi et réglages** ; textes FR et 中文.
- Lien discret « Comment ça marche ? » en bas des pages Chants, Setlists,
  Planning, Évènements → `/guide#<section>`.
- Écrans vides qui disent quoi faire (setlists, mes services, évènements, vue
  partitions sans chant) : une phrase + l'action quand la personne a le droit
  de la faire (« Créer une setlist »).

### A3 — Textes restés en français

- Inventaire complet des textes en dur des écrans membres (liste ci-dessus,
  complétée par une recherche systématique) → clés dans `fr.json` et
  `zh-CN.json`, traduction chinoise proposée par Claude.
- Messages push du serveur (président, évènements, scène) : **dans la langue
  mémorisée** de chaque destinataire, comme les rappels. **Confirmé par Timothée le
  16/09/2026** (le lot 2 les avait laissés en français).
- Mise en page en 中文 : captures des écrans principaux en 中文 sur les trois
  appareils, débordements et coupures corrigés.
- Administration : non traduite (Q22).

### A4 — Planche de relecture

- Page de relecture (artifact privé, relue par Timothée) : tous les
  textes, **classés par écran**, colonnes Français · 中文 · correction ; les
  textes ajoutés en A1–A3 marqués « nouveau ».
- Les corrections reçues sont reportées dans `zh-CN.json` (tranche courte,
  quand elles arrivent).

### A5 — Captures du guide (après validation du look)

- Captures **téléphone** (390×844, deux fois la résolution) de chaque section
  du guide, prises par Playwright avec une session factice et des données
  fictives (aucun vrai nom) ; annotations `figures.ts` recalées ;
  `GuideFigure` adapté au format portrait.
- Capture de l'accueil (écran 2) réutilisée dans le guide.

## Hypothèses

1. L'accueil n'est pas rejouable depuis les réglages ; le guide le remplace.
2. « Tous les comptes une fois » (Q18) : les comptes existants le voient au
   premier lancement après la mise en ligne, ce qui suppose la règle
   `onboarding/{uid}` publiée **avant** la mise en ligne ; sinon l'écriture
   échoue et l'accueil revient à chaque ouverture — le code le masque alors
   pour la session.
3. Les traductions de Claude sont un premier jet ; seule la relecture A4 de
   Timothée les valide.
4. A2 décrit les tâches par pôle seulement si le lot 7 est livré avant.

## Tests (Playwright, `tests/nouveaux-membres.spec.ts`, trois appareils)

Écrits d'abord, vus en échec, puis verts.

- Accueil : visible pour un compte sans `onboarding/{uid}`, invisible sans
  compte et pour un compte qui l'a vu ; « Passer » et « Commencer » écrivent
  le drapeau ; écran 3 selon le rôle (présidence, musicien, aucun) ; écran 4
  masqué si notifications déjà actives ; en 中文.
- Guide : chaque section attendue existe ; le lien « Comment ça marche ? » de
  chaque page mène à son ancre.
- 中文 : sur chaque écran membre de l'inventaire, interface en 中文 → aucun
  mot français connu du fichier FR ne s'affiche (test de parité des clés
  étendu) ; aucune clé `zh-CN` identique au français hors exceptions listées
  (adresse e-mail, « Français »).
- Captures A5 regardées à l'œil.

## Limites

- Toujours : FR + 中文 ; trois appareils ; parité stricte des clés ; règle
  `onboarding/{uid}` en double (règles + commentaire `access.ts`).
- Demander avant : traduire l'administration ; rendre l'accueil rejouable ;
  toute nouvelle dépendance.
- Jamais : de vrais noms dans les captures ; valider une traduction sans
  la relecture de Timothée.

## Après le code (à faire par Timothée)

- Publier `firestore.rules` (règle `onboarding/{uid}`) **avant** la mise en
  ligne.
- Relire la planche A4 et me renvoyer les corrections.

## Commandes

```bash
npm test -- tests/nouveaux-membres.spec.ts   # PW_PORT=3000 si un next dev tourne déjà
npx tsc --noEmit
npm run lint
```

## Avancement

**A1 à A4 codées le 17/09/2026** (go du 16/09/2026) ; **A5 (captures)
attend la validation du look**. `tests/nouveaux-membres.spec.ts`, 16 tests
× 3 appareils. Captures regardées : accueil (5 écrans) et écrans en 中文
(accueil, Moi, Tâches, formulaire, chant) sur téléphone, tablette et
ordinateur.

| Tranche | Construit |
| --- | --- |
| A1 | `src/components/onboarding/Accueil.tsx` (monté dans `layout.tsx`), `src/lib/firebase/onboarding.ts` (`onboarding/{uid}` : `vu`, `le`), règle remise dans `firestore.rules`, libellés FR / 中文. Les faux comptes des tests ont l'accueil « déjà vu » par défaut (`accueil: true` pour un compte neuf). |
| A2 | Guide : Annonces retirées ; Évènements, Programme de scène, Vue partitions et coup d'œil, Ma version d'un chant, Tâches des pôles, Moi et réglages ajoutés ; point PDF des setlists corrigé. `GuideLien` « Comment ça marche ? » en bas de Chants, Setlists, Planning, Évènements (connectés). Écrans vides : setlists à venir sans droit de création, évènements pour qui peut en créer. |
| A3 | Traduits : fenêtre de signalement, invitation et réglage des notifications (6 clés `push.*` manquaient), proposition de chant, avertissements et sélecteur des partitions 简谱, libellés d'accessibilité (navigation, thème, index A–Z), service dans le formulaire de tâche. Serveur : notification au président et nouvel évènement dans la langue de chaque destinataire (rappels, conflits de scène et tâches l'étaient déjà). Test : en 中文, aucun texte français des fichiers de langue sur Moi, Tâches, Setlists, Évènements (contre-épreuve en français : le test échoue bien). |
| A4 | Planche de relecture publiée : https://claude.ai/artifact/Hc57MjKz92W2KayepZYoth — 1 251 textes classés par écran, 180 marqués « nouveau » (écrits ou changés depuis `de882b7`), corrections enregistrées dans la base de la page (`corrections/…`), relues ensuite par Claude. |

Écarts et précisions :

- **Hypothèse 2 révisée** : si la lecture de `onboarding/{uid}` échoue pour
  une autre raison qu'un document absent (règle pas encore publiée, réseau),
  l'accueil **ne s'affiche pas** ; il n'apparaît donc qu'une fois la règle
  publiée. Si l'écriture échoue, il ne revient pas de la session.
- `PushPrompt` n'est monté que dans Mes services : pas de conflit avec
  l'accueil, rien à masquer.
- **Page Notifier et publication du planning non traduites** : la vision
  (13/09/2026) les range parmi les pages d'administration (« admin,
  notifier, questionnaire »), exclues par Q22.
- Le bouton de langue de la barre garde son libellé dans la langue cible
  (« Changer en français » / « 切换为中文 »), volontairement.
- Relevé le 17/09/2026 puis **corrigé le même jour** (demande de Timothée) : sur
  téléphone, un accord de fin de ligne chinoise descendait seul sous les
  paroles, une virgule ouvrait la rangée suivante et les accords d'une ligne
  coupée collaient aux pinyin du dessus. Mesuré sur les 188 chants chinois
  (téléphone) : 78 accords orphelins, 189 virgules en tête de rangée, écart
  pinyin → accords de −7 px dans une ligne coupée contre −2 px entre deux
  lignes. `ZhLine` (`SongView.tsx`) colle au caractère qui précède ce qui n'a
  pas de caractère à soi (accord seul, espace) et la ponctuation, et donne aux
  rangées l'écart d'une ligne : 0, 0 et −2 px partout. Test
  `tests/lignes-chinoises.spec.ts` (9 tests × 3), vu rouge puis vert, captures
  regardées sur les trois appareils. Mesure des 188 chants rejouable :
  `PW_CHANTS_ZH=all npm test -- tests/lignes-chinoises.spec.ts --project=telephone`
  (deux workers au plus : au-delà, `next dev` sature et des tests pendent).
- Tests écrits après le contenu, **vus en échec le 17/09/2026** sur le code
  d'avant le lot 8 (copie de travail séparée, tests d'aujourd'hui) : guide,
  liens « Comment ça marche ? », accueil et messages du serveur échouent sur
  les trois appareils. Les tests négatifs (« sans compte », « déjà vu »)
  passent forcément sans le code ; les casser exprès pour les voir échouer a
  été refusé par le contrôle des permissions : non contre-éprouvés.
- **Le test « en 中文, aucun texte français » passait aussi sur le code d'avant
  le lot 8** : il ne voyait aucune des traductions (fenêtres fermées, libellés
  d'accessibilité). Renforcé : il lit aussi `aria-label`, `placeholder`,
  `title` et les options des listes, passe par Chants ; trois tests ouvrent le
  signalement, la proposition de chant et le formulaire de tâche, un quatrième
  la partition 简谱 transposée. Vus rouges sur l'ancien code (« Navigation
  principale », « Mode sombre », « Culte Francophone », « Accords : »), verts
  aujourd'hui. Limite : le test ne connaît que les textes de `fr.json` ; un
  texte français écrit en dur ailleurs lui échappe.
- `public/guide/annonces.png` n'est plus utilisée ; elle sera remplacée avec
  les captures de A5.
- Suite complète relancée le 17/09/2026 : 939 réussis, 8 ignorés (prévus),
  1 échec intermittent sur tablette (`copy-lyrics`, « chant FR ») : le test
  copiait avant l'hydratation de la page, donc avant que le copieur de
  paroles s'abonne. Le test attend désormais l'hydratation (60 sur 60 en
  répétition) ; l'app n'a pas changé.
