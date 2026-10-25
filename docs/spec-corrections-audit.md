# Spec — corriger ce que l'audit du 24/10/2026 a trouvé

**Origine** : [audit-2026-10-24.md](audit-2026-10-24.md) (constats D, M, W, G, B, H et le résumé sécurité du § 3).
**Go** : Timothée, 24/10/2026 — « Tranche par toi même » (les cinq questions de l'audit) et « corrige tout ce qui est
à corriger, les problèmes de design, de cohérences et tout ». Les décisions ci-dessous sont donc **prises par Claude
sur délégation**, et datées ; Timothée peut en rouvrir une à tout moment.
**Organisation** ([orchestration.md](orchestration.md)) : la session d'origine garde cette spec et le suivi ; deux
sessions orchestratrices codent, une par **flux**, sur `ui/apple-design`, chacune tranche par tranche avec `/tranche`.

---

## 1. Décisions (24/10/2026)

| # | Question | Décision | Pourquoi |
| --- | --- | --- | --- |
| C1 | « Inscriptions fermées » tenu aussi côté serveur ? | **Oui.** La règle de création d'un profil (non admin) lit `config/app.registrationOpen`. L'écran d'inscription dit déjà « fermé » ; un compte Auth créé quand même reste sans profil, donc sans accès. | Sans ça, « fermé » n'est qu'une affiche. |
| C2 | Copie hors ligne des setlists, privées comprises ? | **Oui, bornée** : la dernière lecture de chaque setlist **ouverte** sur l'appareil, privées comprises (la personne y avait accès), gardée **14 jours**, **effacée à la déconnexion** ; bandeau « Copie hors ligne du … » quand elle sert. | Le dimanche prime ; la déconnexion protège l'appareil partagé. |
| C3 | « A# → Bb » en Do : aligner aussi les calques 简谱 gelés ? | **Oui pour l'orthographe, non pour la géométrie.** Le ♭VII devient bémol partout où un accord est épelé (page, setlist, mode Louange, PDF, accords convertis sur un scan), et `scripts/jianpu/overlay.py` suit la même règle. Positions et cadrages des calques certifiés : **intouchés** ; la suite `PW_SLUGS=all` doit rester verte. | L'orthographe n'est pas le calque ; deux écritures du même accord seraient pires. |
| C4 | Couleurs de service en sombre ? | **Oui, une variante éclaircie en sombre seulement**, calculée depuis chaque couleur (mélange vers le blanc jusqu'à 4,5:1 sur le fond de carte sombre). `serviceColors.ts` et le clair : **inchangés**. | Lisibilité, sans toucher l'identité. |
| C5 | Zoom pincé hors de la page chant ? | **Oui.** Zoom permis partout, sauf la page d'un chant et la page d'une setlist (mode Louange, A− / A+) qui gardent leur réglage actuel. | WCAG 1.4.4 ; le décrochage de la barre sur iOS ne touche que les pages de lecture. |
| C6 | Droits admin et `email_verified` (sécurité S2) | **Pas d'exigence `email_verified` maintenant** (elle retirerait leurs droits aux admins dont l'adresse n'est pas vérifiée). À la place : le profil ne peut porter que l'adresse du jeton (S3), le serveur reconnaît un admin par l'adresse du **jeton**, et **Timothée vérifie** dans la console Firebase que les trois adresses admin ont un compte. | Ferme la voie réelle sans bloquer personne. |
| C7 | Référent de sous-équipe → référent de Louange (S4) | **Garde serveur** : `/api/equipes/rattachement` ne recopie un `referent` / `referentSous` nouveau que si l'appelant peut changer les référents (`peutChangerReferents`) ; sinon il garde ceux du profil. | Plus petit que de faire passer tout l'organigramme par le serveur. |
| C8 | Barre du bas à un seul onglet | **Masquée** quand il n'y a qu'une destination (visiteur) ; et une marge basse sous tout contenu quand elle est là. | 110 px pour rien, et elle mord les formulaires. |
| C9 | Bulle d'aide des accords | **En bas de l'écran** (au-dessus de la barre), plus ancrée sur le premier accord ; même texte, tutoyé. | Elle cachait le premier couplet. |
| C10 | Mot coupé par un accord | Un **tiret de liaison** (« re – culé ») dans l'espace laissé au milieu d'un mot ; rien entre deux mots. | Se lit comme dans les recueils. |
| C11 | Couleurs des étiquettes de sections (3,67 à 4,17:1) | **Gardées** (zone gelée, texte gras, proche du seuil). Seules les valeurs de repli périmées de `var(--…, …)` sont remises à jour, sans effet visible. | Pas de raison suffisante de rouvrir une couleur gelée. |
| C12 | Avertissements `react-hooks/set-state-in-effect` (61) | **Laissés** : ce sont des avertissements, les réécrire changerait des comportements testés. Les variables inutilisées et les dépendances manifestement oubliées sont corrigées. | Pas de défaut constaté. |
| C13 | Code mort | **Retiré** : `src/lib/jianpu/parseJianpu.ts` s'il n'est importé nulle part (le vérifier au moment), `isEditorOf` des règles, le `Chip` en double du planning campus. | « Corrige tout ». |
| C14 | Tutoiement | **Tu partout** en français (le site tutoie déjà 170 chaînes sur 174). | Cohérence. |
| C15 | Nom et adresse réels dans `tests/coherence.spec.ts` | Remplacés par `ADMIN_EMAIL` (lu dans `ADMIN_EMAILS`, jamais recopié) et un nom fictif. | Règle du CLAUDE.md, dépôt public. |

**Restent à Timothée** (le code ne peut pas les faire) : révoquer le secret du § 2 de l'audit ; **publier
`firestore.rules`** dans la console Firebase après le flux A ; vérifier les trois comptes admin (C6) ; poser
`VERCEL_DEEP_CLONE=true` sur Vercel pour « Nouveaux au répertoire » (H5) ; valider en local avant toute mise en ligne.

## 2. Règles communes aux deux flux

- **Une tranche = un `/tranche`** (executant Sonnet → testeur Haiku → corrections → conseil Opus si ça résiste →
  relecteur Sonnet), puis la session relit le diff, regarde les captures, commite (un commit par tranche, message en
  français) et pousse **sur `ui/apple-design` seulement** (`git pull --rebase` juste avant ; jamais `main`, jamais
  `--force`). Indexer par nom ; jamais `next-env.d.ts`, `tsconfig.json` réécrits, `test-results/`, `.next*/`, `public/*-index.json`
  réécrits par un build local.
- **Tests** : trois appareils toujours, cinq projets pour une spec d'agencement (`SPECS_GRAND_ECRAN`) ; au moins un
  chant FR et un chant ZH ; un test périmé par la correction se met à jour, il ne s'affaiblit pas et ne se désactive
  pas. Le banc `scripts/rude-epreuve/` (README) mesure ce que la suite ne voit pas (poids, hors ligne réel, axe).
- **Deux langues** à chaque libellé (`src/locales/fr.json` et `zh-CN.json`, insertion en texte) ; **permissions en
  double** (`src/lib/access.ts` et `firestore.rules`) ; toute nouveauté de back-office derrière `BACK_OFFICE` ;
  noms fictifs ; zones gelées intouchées sauf décisions C3, C4, C11.
- **Propriété des fichiers** pour éviter les conflits entre flux : chaque flux ne touche que ses fichiers (§ 3 et
  § 4). Un besoin hors de ses fichiers se note dans la feuille de route au lieu d'être codé. Les deux flux touchent
  `src/locales/*.json` : insertion locale seulement, `git pull --rebase` avant chaque push.
- Fin de flux : suite complète verte, banc `rude-epreuve` relancé sur ce qui le concerne, avancement noté au § 5.

## 3. Flux A — « fond » (sécurité, dimanche, planning, musique, poids)

Fichiers : `firestore.rules`, `src/app/api/**`, `src/lib/**` (sauf ce que liste le flux B), `public/sw.js`,
`src/app/songs/[slug]/**`, `src/app/setlists/[id]/**`, `src/components/song/**`, `src/components/performance/**`,
`public/` (images, polices), `scripts/build-index.ts`, `scripts/validate-songs.ts`, `scripts/jianpu/overlay.py`,
`tests/coherence.spec.ts`, `package.json` (A9 seulement).

| Tranche | Contenu (renvois à l'audit) | Critères |
| --- | --- | --- |
| A0 | Retirer du suivi le fichier secret du § 2 (`git rm --cached`) et l'ajouter au `.gitignore` (`*.pickle`). | fichier absent de `git ls-files`, toujours présent sur disque |
| A1 | Sécurité serveur S1, S3, S5, S6 (règles + serveur, décisions C1, C6) ; `isEditorOf` retiré (C13). | tests `acces-regles`, `coherence`, `chants-fetes-serveur` verts ; un test par règle durcie |
| A2 | S4 (C7), S7 (bornes serveur), S8 (réservation de clé par `create()`), D7 (`/api/planning/release` ne renotifie pas). | tests de routes ; double appel → un seul envoi |
| A3 | Hors ligne D1 (C2), D2 (page « pas encore ouverte sur cet appareil », préchargement des chants d'une setlist ouverte), D3 (course de 3 s, repli sur 5xx), D4 (bandeau « chant non chargé — Réessayer »). | banc `horsligne` : chant jamais ouvert → message clair ; setlist rechargée sans réseau → copie + bandeau ; `tests/service-worker.spec.ts` étendu |
| A4 | Planning D5 (`fetchSheet` : délai 8 s, `res.ok`, copie gardée, cron qui compte les échecs), D6 (CSV multiligne, automate de `lireCSV`), rappel d'entraînement de scène partagé entre deux homonymes, badge Sainte cène par année. | tests unitaires CSV et cron |
| A5 | Musique M1 (tonalités mineures : fondamentale + « m », sélecteur), M2 (♭VII, décision C3), M3 (thèmes par décomposition Unicode + régénération de l'index + contrôle dans `validate`), M5 (`safeParseParam` vérifie le type), M6 (`validate` : `{key}` absent, tonalité mineure). | `a-l-agneau` transposé ±1 à ±6 ; aucun « A# » en Do sur le corpus ; filtre Noël = 19 ; `PW_SLUGS=all` vert |
| A6 | Page d'un chant : C9 (bulle d'aide en bas), C10 (tiret de liaison), zone de toucher des accords agrandie sans changer le dessin (G6) ; G15 (setlist sur téléphone : libellés courts sous les icônes, droits repliés). | captures 5 dispositions FR / ZH, clair / sombre |
| A7 | Poids W1 (polices chinoises en sous-ensemble woff2 au build, KaiTi réduit aux titres ; PDF inchangé), W2 (logo, `icon.png`, `apple-icon.png` en 256 px), W3 (Liberation `preload: false`, Atkinson préchargée seulement avec un chant), W4 (`getSetlists` bornée), W5 (un seul chargement de `songs-index.json`). | banc `crawl` (octets) et `horsligne › réseau lent` : chant ZH < 3 Mo, titre d'un chant FR < 10 s sur le réseau simulé |
| A8 | Les P3 restants du rapport d'audit du code qui sont dans ses fichiers (liste dans la consigne de la session), H3 (code mort, C13), H4 / C15. | `tsc`, lint, suite ciblée |
| A9 | Next 16.2.6 → 16.4.x, Firebase et firebase-admin à jour (H1), `npm audit` relu. | suite complète verte, build de production |

## 4. Flux B — « surface » (design, cohérence, bilingue, docs)

Fichiers : `src/components/**` (sauf `song/`, `performance/`), `src/app/**` (sauf `api/`, `songs/[slug]/`,
`setlists/[id]/`), `src/app/globals.css`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/lib/utils/formatDate.ts`,
`src/lib/setlist/bibliotheque.ts` (recherche de l'éditeur), un nouvel utilitaire de couleur sombre (C4) à côté de
`src/lib/serviceColors.ts`, qui reste **inchangé** ; `src/locales/*.json`, `public/guide/`, `docs/ARCHITECTURE.md`,
`CLAUDE.md` (H2 seulement).

| Tranche | Contenu | Critères |
| --- | --- | --- |
| B1 | Mécanique : G1 / C14 (4 chaînes au « tu »), G2 (`capitalize` → majuscule initiale seulement, hors `setlists/[id]`), G4 (texte d'aide court de la recherche), `select-name` (noms accessibles des listes Thèmes, Catégorie), aria-label de la pastille « 4 / 10 » du widget Évènements, H2 (docs : CLAUDE.md `/api/report` et couleurs, ARCHITECTURE.md, commentaire de `layout.tsx`, feuille de route : deux « AB », en-tête d'état). | axe : plus de `select-name` ; textes FR et ZH relus |
| B2 | Sombre : G3 (rouge `--destructive` lisible : ≥ 4,5:1 en texte sur la carte sombre, ≥ 3:1 pour le texte blanc d'un bouton), C4 (variante sombre des couleurs de service), contrastes de 7.4 (gris des listes, légendes du guide, ambre du profil, rouge clair, jours hors du mois, valeurs grisées du profil), illustrations du guide en sombre, C11 (valeurs de repli). | axe `color-contrast` : plus d'échec hors zones gelées, en clair et en sombre |
| B3 | Navigation et formulaires : C8 (barre à un onglet masquée, marge basse sous les formulaires : inscription, nouvel évènement), C5 (zoom, viewport par route), G9 (signalement et « Personnaliser » en dialogue Radix : Échap, focus, rôle), G12 (« Nouvelle réunion » a son formulaire), G14 (tuiles de Moi en lignes), G16 (sous-titres qui passent à la ligne ; l'artiste avant le pinyin dans la liste), `scrollable-region-focusable` (grille du planning, organigramme : `tabIndex` + nom), organigramme sur téléphone (une colonne, plus de cartes coupées). | captures 5 dispositions ; inscription : « Suivant » et « J'ai déjà un compte » visibles sans défiler |
| B4 | Le lot « système » (audit § 7.3) : composants partagés `EtatVide`, `Impasse` (404, page réservée, questionnaire visiteur : G13), `Bandeau`, `ChampRecherche`, `Retour` (dans l'en-tête de page), `BoutonCreer` (libellé sur grand écran) ; règle de largeur (lecture plafonnée, tableaux pleine largeur) appliquée à l'accueil du Planning, Mes services, Campus, Prépa. Table, Messages ; le titre du Planning n'est plus dit deux fois. Remplacement page par page, une page par commit si besoin. | `regard` puis la session sur les captures avant / après ; aucune régression des specs d'agencement |
| B5 | Bilingue : B1 (erreurs de notification, « Aucune donnée » sur téléphone), B2 (back-office : Notifier, Statistiques, Questionnaire, Planning sans compte, Personnes, Réception, Inscriptions), B3 (dates selon la langue), B4 (rôles et services du profil traduits comme dans Moi). Recherche M4 (pinyin collé et sans tons, `ignoreLocation`). | parcours en 中文 : plus de français hors contenu des chants |
| B6 | Le guide (G11) : captures refaites par un script Playwright (profils fictifs, base simulée) aux bonnes tailles, texte relu (« Chants » au lieu de « Louange », nombre de chants lu dans l'index). Les P3 restants de l'audit du code qui sont dans ses fichiers. | relecture à l'œil de chaque chapitre |

## 4 bis. Hors des deux flux : l'organisation du back-office

Timothée, 24/10/2026 : « avec le back-office qu'on a actuellement, comment veux-tu le modifier ? » La proposition
(regroupement des entrées, un « À faire » à la place des widgets, plus de volets vides) passe par une **planche** avant
tout code (CLAUDE.md, « Design »). En attendant, le flux B **ne retouche pas la mise en page** des pages
`src/app/back-office/**` et `src/components/backOffice/**` (tableau de bord, volets liste / détail, largeurs de
Messages, Tâches, Évènements) ; il y corrige seulement les défauts qui survivront à toute réorganisation : textes en
dur et traductions (B5), contrastes (B2), noms accessibles (B1), formulaire de réunion (G12), organigramme sur
téléphone (B3).

Planche publiée le 24/10/2026 : https://claude.ai/artifact/TJ3c31CvYE9bMb9fWXZbTL — piste A (un écran « À faire » qui
remplace les widgets, 5 entrées : À faire, Calendrier, Planning, Équipes, Messages ; **recommandée**), piste B (pas
d'écran d'accueil, pastilles sur les entrées), piste C (plus de back-office, les outils dans l'app) ; chacune aux
trois tailles ; cinq questions à trancher. Timothée, le même jour : « est-ce qu'un dashboard est utile ? » — réponse :
pas sous forme de widgets ; seuls servent le rassemblement des échéances et « qui sert ce dimanche ».
**Go le 24/10/2026** (« Piste A, tranche les questions toi-même et code-la ») : décisions BO1 à BO12 et tranches
BO-A à BO-F dans **`spec-back-office-piste-a.md`**, confiées au flux B après B6. Pour ce lot, la réserve ci-dessus est
levée ; le flux B prend aussi `src/types/backOffice.ts`, `src/lib/tableauDeBord/**` et, dans `src/lib/access.ts`, les
fonctions de menu du back-office (`entreesBackOffice`, `widgetsPermis`) : le flux A n'y touche pas.

## 5. Avancement

| Tranche | État | Commit |
| --- | --- | --- |
| — | spec écrite le 24/10/2026, flux A et B lancés le même jour | — |
| A0 | fait : fichier local retiré du suivi, `*.pickle` ignoré | `8b24557` |
| A1 | fait : création d'un profil liée à l'ouverture des inscriptions (document ou champ absent = ouvert, comme l'écran d'inscription) et à l'adresse du compte ; admins du serveur résolus par Firebase Auth ; coordination des fêtes calculée par `isCoordination` ; modification d'un évènement : organisateur fixe, public inchangé ou créable ; `isEditorOf` retirée. **`firestore.rules` à publier par Timothée.** Signalé : l'écran d'inscription (flux B) affiche l'erreur générique si la création du profil est refusée (cas d'une fermeture pendant la saisie) ; `adminUids` sans test (pas d'Auth simulée) | voir A1 |
| A2 | fait : recopie des référents (rattachement et groupes) gardée par `peutChangerReferents` (comités tirés des groupes inchangés, chemin admin « tous » sans filtre) ; bornes serveur lues par des fonctions testées (`src/lib/push/bornes.ts`) ; réservation `create()` de notifLog avant l'envoi (`src/lib/push/reserver.ts`) pour notify-audience, notify-evenement, presentation, scene/conflit, tâches ; notify-setlist garde son état `setlist-<id>` (renvoi après 24 h) sous un verrou court à jeton ; planning/release : une notification à la première publication d'un trimestre, `year` borné 2026–2100. Le cron passe aussi par la réservation depuis A2 bis ; un trimestre publié avant A2 puis masqué notifiera une dernière fois à sa republication | voir A2 |
| A3 | fait : copie hors ligne d'une setlist (IndexedDB, 14 jours, écrite seulement après le contrôle d'accès, servie sur erreur réseau ou 5xx en lecture seule avec bandeau, effacée à la déconnexion) ; `public/hors-ligne.html` pour une page jamais ouverte ; préchargement des chants d'une setlist ouverte ; course de 3 s et repli sur 5xx ; cache `gcc-louange-v5` plafonné ; serveur local élargi aux IP privées ; mode Louange : bandeau « N chants non chargés — Réessayer / Continuer quand même ». Banc réel (build de production, 127.0.0.2) : chant jamais ouvert et planning → page hors ligne sans erreur ; setlist rechargée sans Firestore → copie + bandeau, chant de la setlist ouvert hors ligne. À reporter par le flux B : ligne PWA du CLAUDE.md (v5, page hors ligne, course de 3 s, plafonds, préchargement) | voir A3 |
| A4 | fait : CSV du planning lu par l'automate commun (`src/lib/csv.ts`, cellule multiligne → une espace) ; `fetchSheet` : 8 s, statut et page HTML vérifiés, la copie en mémoire n'est jamais écrasée par un échec ; cron : lectures ratées journalisées et rendues (`lecturesRatees`), 500 seulement si toutes ont échoué ; rappels : plus de liste partagée modifiée ; badge Sainte cène décidé par la date (1 au 7) | voir A4 |
| A2 bis | fait (reprise d'A2 demandée par la session principale) : tests de texte mis à la forme d'A1 / A2, prénom fictif ; la recopie ne porte que les lignes modifiées ; retrait d'un référent d'équipe gardé ; planning : notification à la première publication réussie (un réessai après un envoi raté notifie), texte de confirmation rendu vrai et renvoi à « Prévenir des changements », la référence d'un trimestre déjà publié reste à la republication ; notify-setlist : « envoi en cours » (busy / 409, fr + zh), `maxDuration` ; réservation : jeton relu sur ALREADY_EXISTS, `allSettled`, clé gardée une fois l'envoi parti ; cron : toutes les clés réservées à la lecture ; report : chemin interne seulement ; décisions des routes sorties dans `src/lib` et testées. Restent rouges, déjà avant A1 : `reunions.spec.ts:214/223` (horloge) ; instable : `organigrammes-groupes:808/823`. Laissé : `taches/assigne` réserve hors du try (rendu assuré par `reserverPourUids`) | voir A2 bis |
| B1 | fait : tutoiement (dernières chaînes), `first-letter:uppercase` au lieu de `capitalize` (hors `setlists/[id]`), « Chant ou artiste… » + nom accessible du champ, filtres Thème / Catégorie nommés (et labels reliés au Notifier et à la publication du planning), pastille « 4 inscrits sur 10 », docs H2 (CLAUDE.md sans Resend, couleurs réelles, `build:index` ; ARCHITECTURE.md 20 routes ; commentaire de `layout.tsx` ; seconde « AB » → « AF », état au 24/10). Laissés : le diagramme généré `docs/diagrammes/43-dependances-api.mmd` (à régénérer, B6) ; libellés « Audience » / « Planning » en dur (B5). Rouge déjà sur `8b24557`, hors flux B : `setlist-g.spec.ts:211` (« Partitions » rouvre là où on était, téléphone et tablette) | `d5985cd` |
| B2 | fait : `--destructive` #dc2828 / sombre #f26969 (encre foncée sur bouton plein) ; C4 par `src/lib/couleurSombre.ts` + classe `texte-service` (sombre seulement ; sélecteur et grille du planning, calendrier, Moi, profil, évènements, scène, équipes, Réception, Personnes) ; légendes du guide, jours hors mois, ambre, textes d'aide pleins ; C11 dans ChordPad / EditLineSheet. Banc : color-contrast 28 → 16 (clair), 10 → 2 (sombre). Restent, hors flux B : étiquettes grises `text-muted-foreground/60` de `setlists/[id]/_components/ListView.tsx` (2,87, aussi dans le volet de `/setlists` sur ordinateur) et repli `#b91c1c` / `#2563eb` de `PerformanceMode.tsx:134` (flux A) ; en zone gelée, sans décision : onglets du planning en blanc sur Intergroupe (3,81) et Table (3,35) | `218af4d` |
| A5 | fait : tonalités mineures transposées (fondamentale + « m », orthographe du relatif majeur, sélecteur des 12 mineures ; un `keyOverride` majeur sur un chant mineur se lit comme son relatif mineur, page, setlist, mode Louange, PDF) ; à 0 demi-ton la tonalité écrite reste, une enharmonique choisie ré-épelle les accords ; ♭VII en bémol (C3), miroir dans `overlay.py` sans géométrie : vers Do, 96 « A# » → 1 (`F#/A#`, tierce de F#, gardée) ; thèmes par NFD : 19 chants Noël, « Groupe fidélité » → `noel_fidelite` ; paramètres d'URL typés ; `validate` : `{key}` absent et thème inconnu = erreur. `PW_SLUGS=all` : ordinateur et téléphone 960 / 960 verts, tablette 75 verts (passage coupé par le délai), aucun échec. Signalé au flux B : la fiche d'harmonie d'un chant en Am se lit maintenant en Do (`IdeesSheet.tsx`, `semitonesTo('D','Am')` = −2) ; l'éditeur de setlist range un `keyOverride` majeur à côté de son relatif mineur (`Reglages.tsx`) | voir A5 |
| A3 bis (1-9) | fait (reprise d'A3 demandée par la session principale) : une setlist ouverte par un lien est gardée (la page envoie son adresse, `/setlists/` et ses scans 简谱 au service worker ; page de setlist relue à chaque ouverture) ; adresse sans barre finale retrouvée hors ligne, `start_url` `/planning/`, barre finale aux url des notifications ; copie liée au compte, effacée au changement de compte, balayée à 14 jours ; « Ma version » gardée dans la copie ; annotations : rien n'est écrit sur une lecture impossible, « Annoter » masqué sur la copie ; copie affichée au bout de 3 s sur un réseau qui traîne, lecture bornée à 10 s ; cache en LRU. Banc réel (build de production, 127.0.0.2, trois appareils) : liste → setlist touchée → réseau coupé → rechargée : copie et bandeau, scan du chant chinois affiché | voir A3 bis |
| B3 | fait : barre du bas absente quand une seule destination (visiteur en ligne) ; zoom permis hors pages de lecture (`ViewportLecture`, sans toucher aux dossiers du flux A) ; « Signaler » et « Personnaliser » en Dialog Radix (`ui/dialog.tsx`) ; Moi en lignes ; artiste avant pinyin ; régions défilantes nommées ; organigramme en une colonne sous 640 px. G12 (réunion) laissé au lot BO-C (piste A). `agencement-v18-t2b.spec.ts:146` passe seul (course sous charge). Laissés : matrice des Musiciens (`EquipesClient.tsx:611/672`), défilante sans nom (B6) | `f0fef93` |
| A3 bis (10-16) | fait : retour du réseau sur une copie (online, visibilitychange, « Réessayer » ; bandeau « · lecture seule ») ; profil relu au retour du réseau ; bandeau « N chants non chargés » au-dessus de la barre du bas (en bas à droite du volet de lecture en deux volets), ×, Échap, focus, essai en cours, « Continuer » absent si rien n'est chargé ; vue Partitions : chant non chargé avec son titre et « Réessayer » ; bandeau de copie dans l'en-tête collant en deux volets ; precache renvoyé sur `controllerchange` ; commentaire de `sw.js`. Captures aux cinq dispositions, FR / 中文, clair / sombre, triées par `regard` puis regardées | voir A3 bis (10-16) |
| A2 ter | fait (reprise d'A2 bis et A4 demandée par la session principale) : recopie des référents limitée à l'équipe éditée (`equipe` envoyé par l'écran ; groupes : comités seulement ; retrait gardé seulement si le compte est encore dans l'équipe) ; release, notify-evenement, taches/assigne : clé rendue seulement si rien n'est parti ; référence de « Prévenir des changements » envoyée seulement après une publication notifiée (et remplacée alors) ; « déjà annoncé » remis à zéro au changement de trimestre, variante sans renvoi en ligne, textes du panneau sous `t()` ; cron : onglets ratés relus une fois, sinon `ok: false` et notification aux admins ; réservations en deux temps (`envoyeLe`, reprise après 5 min) ; jeton relu et rendu conditionnel ; `pageUrl` garde chemin et paramètres, lien affiché seulement s'il est interne ; équipes : « Réessayer » si la recopie échoue, précondition de version ; planning en navigateur : une copie resservie passe en « périmé » ; onglet renommé : repères d'en-tête relus sur le vrai Sheet le 24/10/2026 (EDD « suppléant », Campus_Louange « moment », Paix et Bonté « musiciens ») et premier onglet du classeur (calendrier des réunions) jamais accepté comme planning. 1205 verts sur dix specs. Laissé : la notification aux admins d'un cron en échec part à chaque passage (pas dédoublonnée) ; le jour du déploiement, une réservation d'avant A2 ter sans `envoyeLe` peut être reprise par un second passage | voir A2 ter |
| B4a | fait : composants partagés `EtatVide` (cadre pointillé, posé sur Mes services, Setlists, nouvelle setlist, grille et tableau du planning, Campus, éditeur, Réception, Questionnaire, Personnes), `Impasse` (404 lisible en sombre, Harmonie réservée, questionnaire visiteur, service introuvable, tâche introuvable, page réservée aux admins) et `Bandeau` (info / alerte, × de 44 px : planning périmé, gestes et collage, corbeille, année à venir) ; 🙂 retiré ; viewport réécrit à chaque navigation (test côté client ajouté). B2 bis (`adf783a`) : couleurs de service sombres calculées sur leur pastille teintée. Rouges hors flux B : `coherence.spec.ts:105` (`start_url` `/planning/` depuis A3 bis), `reunions.spec.ts:214/223` (déjà rouges) | voir B4a |
| A6 | fait : page chant, marge de la barre du bas posée seulement si la barre est rendue (`body:has(...)`) ; C9 bulle d'aide en bas, centrée sur la colonne de lecture, au-dessus de la barre (qu'elle guette si elle arrive après) ; C10 tiret de liaison mesuré (lettres latines seulement, hors copie, jamais rogné) ; G6 accords touchables 40 × 32 px au moins sans changer le dessin, boutons de la page chant et de la barre de la setlist à 44 px de zone sur téléphone ; G15 libellés courts sous les icônes sous 1024 px (« Louange » / « 敬拜 »), droits repliés derrière « i » sur téléphone ; G2 `first-letter:uppercase` ; ListView sans `/60`. Tests : `page-chant-a6`, `captures-a6` (cinq projets, G6 : chaque accord touché au centre est le sien), C9 dans `accords-toucher`. `reunions.spec.ts` : heures données à Paris (+02:00, rouges en UTC) et cron à quatre envois depuis A2 ter. Captures aux cinq dispositions, FR / 中文, clair / sombre, triées par `regard`. Laissé : la bulle recouvre des lignes du milieu de l'écran (inhérent à C9) ; signalé au flux B : ligne de contexte de la setlist (service · date) peu lisible en sombre sur ordinateur | voir A6 |

### Passage de relais (24/10/2026, session du flux A) — ce qu'une session neuve doit savoir pour A6 à A9

Commun :
- Lancer le banc : `npm run build:index` puis `NEXT_PUBLIC_BACK_OFFICE=0 NEXT_DIST_DIR=.next-prod-off npx next build`, `next start -p 3300 -H 0.0.0.0` ; le banc vise `127.0.0.2:3300`. Le build réécrit `public/*.json`, `next-env.d.ts`, `tsconfig.json` : `git checkout --` avant de commiter. **`public/songs-index.json` ne se commite pas tel que `build:index` le régénère** dans ce clone (historique court : `ajouteLe` passe à null sur 377 chants) ; la version commitée a été corrigée à la main en A5 (thèmes).
- Arrêter un serveur par son numéro de processus, jamais par `pkill -f motif` (le motif se trouve dans la commande elle-même) ; un `next dev` orphelin sur 3100 / 3101 fait échouer une suite en `ERR_ABORTED`.
- Rouges connus, d'avant le flux : `tests/reunions.spec.ts:214/223` (horloge) ; instables : `organigrammes-groupes:808/823`, `jianpu-par-defaut.spec.ts:222`.
- Le banc `horsligne` a un parcours « liste → setlist touchée → réseau coupé → rechargée » (A3 bis), vert sur les trois appareils.

A6 (page d'un chant et de la setlist) :
- G2 : la dernière `capitalize` du code est dans `src/app/setlists/[id]/SetlistDetailClient.tsx` (date « Dimanche 25 Octobre 2026 », vers la l. 1990) : `first-letter:uppercase`, comme B1.
- Contraste relevé par B2 dans un fichier du flux A : `text-muted-foreground/60` de `src/app/setlists/[id]/_components/ListView.tsx` (2,87:1).
- `SetlistDetailClient.tsx` porte maintenant deux bandeaux (copie hors ligne, chants non chargés) : les garder dans les captures.

A7 (poids) : rien de plus que la spec ; mesurer avec le banc `crawl` et `horsligne › réseau lent`.

A8 (P3 restants) :
- `tests/jianpu-integration.spec.ts:22` est rouge (empreinte de `public/jianpu/chords.json`), probablement depuis `a8798b0` (nouveaux chants arrivés de `main`) : si le diff de `chords.json` n'ajoute que des calques de nouveaux chants, mettre l'empreinte à jour en le disant ; si un calque certifié a changé, ne rien toucher et le noter pour Timothée (zone gelée).
- S9 (inscription aux évènements sans compte, back-office seulement) : la consigne d'origine de la session principale le décrit ; limite par adresse comme `/api/report` et plafond par évènement.
- Replis `#b91c1c` / `#2563eb` de `src/components/performance/PerformanceMode.tsx` vers la l. 134 (C11, relevé par B2).
- C13 / H3 : `src/lib/jianpu/parseJianpu.ts` (vérifier qu'il n'est importé nulle part), `console.log` en commentaire de ChordLine ; le `Chip` en double du planning campus est dans un fichier du flux B (le lui signaler, ne pas le toucher). C15 : nom et adresse réels de `tests/coherence.spec.ts`.
- Les autres « P3 · flux A » de `docs/audit-2026-10-24-code.md` non couverts par A1 à A5 (entre autres : erreurs d'activation des notifications et messages de l'inscription aux évènements affichés bruts en 中文, `getSetlists` sans borne si A7 ne l'a pas fait, mode Louange qui écrit la classe `dark` hors next-themes).

A9 : Next 16.2.6 → 16.4.x, Firebase et firebase-admin à jour, `npm audit` relu, suite complète et build de production.

Ajouts après A6 (25/10/2026, seconde session du flux A) :
- A6 fait (`a0160b4`). Restent A7, A8, A9.
- A8 : en plus de la liste ci-dessus, `tests/coherence.spec.ts:105` attend `start_url` `/planning` ; mettre `/planning/` (voulu depuis A3 bis), avec C15 qui touche ce fichier ; le dire dans le commit. `reunions.spec.ts:214/223` sont réparés (heures à Paris).
- S9 : écrire seulement « limite et plafond des inscriptions sans compte » dans le commit.
- Le clone peut démarrer en tête détachée, avec une branche locale `ui/apple-design` en retard : `git checkout -B ui/apple-design` sur le bon commit avant de pousser.
- `/tranche` sur A6 : ≈ 2 h 45 et 1,4 M de jetons ; le `testeur` relance alors des specs voisines lourdes (reunions, organigrammes) : borner la liste.

Signalé au flux B (fichiers à lui) : la fiche d'harmonie d'un chant en Am se lit maintenant en Do (`IdeesSheet.tsx`) ; l'éditeur de setlist range une tonalité majeure à côté de son relatif mineur (`Reglages.tsx`) ; la ligne PWA du `CLAUDE.md` (cache v5, page hors ligne, course de 3 s, préchargement, LRU).
