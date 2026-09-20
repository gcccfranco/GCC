# Tâches : lot 4, nouveau look « GCC » (docs/spec-look.md)

**Go donné le 15/09/2026 (T0 et tout le lot 4).** T0 à T6 faits le 15/09/2026 (T6.2 relecture et T6.4 mise en ligne restent) ; à valider en local par Timothée.

## T0 — Index A–Z, finitions (hors lot, avant le look)
- [x] T0.1 Test `tests/songs-index.spec.ts` : lettre courante visible dans un encart pendant le geste, disparaît au relâcher ; navbar immobile pendant le geste ; premier chant de la lettre visible sous la barre ; vu en échec
- [x] T0.2 `SongListClient.tsx` : encart de lettre, gel de `useScrollDirection` pendant le balayage, marge recalée
- [x] T0.3 Vert 3 appareils ; tsc ; lint ; captures regardées

## Point d'étape T0 : validation locale de Timothée

## T1 — Fondations
- [x] T1.1 Test : `theme-color` par schéma ; bouton primaire rouge avec retour à l'appui ; aucun texte < 11 px hors chants sur `/songs` et `/planning` ; vu en échec
- [x] T1.2 `globals.css` + `tailwind.config.ts` : tokens A (clair / sombre), accent rouge, échelle de texte, rayons, matériaux `chrome` / `panneau`, voiles, reduced-motion global
- [x] T1.3 `layout.tsx` (police système, `themeColor` par schéma), `manifest.ts`
- [x] T1.4 Primitives : `Button` (pilule, retour à l'appui), voiles `drawer` / `alert-dialog` / `ReportDialog` / `CustomizePanel` à 35 % ; `Group` / `GroupRow` créés en T2 (premier usage), `Tile` en T3
- [x] T1.5 Vert 3 appareils clair / sombre ; tsc ; lint ; captures

## Point d'étape T1

## T2 — Navigation
- [x] T2.1 Test : connecté = onglets Louange · Planning · Évènements · Moi ; visiteur = Chants · Évènements + Connexion ; menu compte (ordinateur) ; `/moi` liste ses groupes selon le rôle ; grand titre présent puis replié ; vu en échec
- [x] T2.2 `Navbar.tsx` : « GCC » + label rouge, sections, cloche, menu compte ; menu mobile réduit
- [x] T2.3 `MobileTabBar.tsx` : quatre onglets, état visiteur
- [x] T2.4 Page `/moi` ; `PageTitle` posé sur Chants, Setlists, Planning, Évènements, Mes services, Moi
- [x] T2.5 Tests existants adaptés (`navbar-mobile.spec.ts` retiré : le menu burger n'existe plus, son contrôle 320 px vit dans `look-navigation.spec.ts`) ; vert 3 appareils ; tsc ; lint ; captures ; suite complète : 681 verts, échecs restants = mesures A–Z corrigées en T3

## Point d'étape T2

## T3 — Louange
- [x] T3.1 Test : ligne de chant = vignette tonalité teintée par langue, titre, artiste, sans thèmes ; filtre thèmes actif ; barre d'outils du chant en pilule, même place ; setlists en vignettes date ; 1 FR + 1 ZH ; vu en échec
- [x] T3.2 `SongListClient.tsx` (groupes, vignettes, densité), `SongDetailClient` / `SongView` chrome (pilule, sections en groupe), `CustomizePanel`
- [x] T3.3 `setlists/page.tsx`, `SetlistCard`, `SetlistDetailClient` chrome, `SetlistForm` / `SetlistFormRows`, `PartitionView` / `SetlistOutline` chrome
- [x] T3.4 `PerformanceMode` chrome : barres haut / bas en matériau chrome, sélections en encre ; rendu et `layoutSig` intacts. Sélections `bg-primary/10 text-primary` passées en encre dans 10 fichiers (décision Q3 a)
- [x] T3.5 Vert 3 appareils clair / sombre ; tsc ; lint ; captures FR + ZH

## Point d'étape T3

## T4 — Planning, Mes services, Évènements
- [x] T4.1 Test : onglets de section neutres, actif teinté de sa couleur ; Ce dimanche avec carré de couleur ; Mes services en vignettes date ; vu en échec
- [x] T4.2 `SectionTabs`, `PlanningTabs`, `EvenementsTabs`, `planning/page.tsx`, pages de planning, `PlanningTable`, `FilterButtons`, `StaleBanner`
- [x] T4.3 `mes-services/page.tsx`, `evenements/*` (calendrier, fiche, formulaire, scène)
- [x] T4.4 Vert 3 appareils (144 tests planning / évènements) ; tsc ; lint ; captures regardées

## T5 — Pages secondaires et PWA
- [x] T5.1 Test : login, inscription, profil, guide, questionnaire, notifier, admin, 404 rendent sans erreur console, boutons primaires rouges, mêmes champs qu'avant ; vu en échec
- [x] T5.2 `(auth)/*`, `profil`, `guide`, `questionnaire`, `notifier`, `admin`, `not-found`, `error`, `PushPrompt`, `ReportDialog`
- [x] T5.3 `sw.js` : cache `gcc-louange-v2` ; vert 3 appareils (24 tests) ; tsc ; lint ; captures

## Point d'étape T5

## T6 — Cohérence et mise en ligne
- [x] T6.1 Passe visuelle : pages clés × 3 appareils × clair / sombre, FR + ZH ; rayons, matériaux, voiles, échelle de texte vérifiés ; grep `text-[` hors chants = 0
- [x] T6.2 Relecture inline (cinq axes, simplification) : pas de code mort, diff net de `console.log` / TODO, primitives utilisées dans 8 fichiers ; suite complète relancée après le balayage
- [x] T6.3 Docs : `spec-look.md` (« Avancement »), feuille de route § 1, vision, `CLAUDE.md` (couleurs spec), captures du guide signalées pour le lot 8
- [ ] T6.4 Mise en ligne d'un bloc sur validation de Timothée

## T7 — Retour tactile (16/09/2026, go de Timothée)
- [x] T7.1 Audit avant/après ceb3a7b sur Pixel 7, iPad portrait et paysage : seule régression = navigation (setlists injoignables, Mes services à 2 taps) ; pages sinon égales ou mieux
- [x] T7.2 Test : barre du bas Chants · Setlists · Planning · Évènements · Moi, setlists à un tap depuis le planning (téléphone et tablette) ; vu en échec → `MobileTabBar.tsx`
- [x] T7.3 Test : pilule de section ≥ 40 px sur les trois appareils ; vu en échec → `SectionTabs.tsx`
- [x] T7.4 Test : chaque commande de la barre d'outils du chant ≥ 36 px sur téléphone et tablette, FR + ZH ; vu en échec → `SongDetailClient.tsx`
- [x] T7.5 Test : ligne de setlist avec catégorie, présidence jamais tronquée ; vu en échec → `SetlistCard.tsx`
- [x] T7.6 Suite complète 3 appareils (749 verts, 7 sautés par construction) ; tsc (seule l'erreur connue de `.next/types`) ; lint 0 erreur ; captures regardées 4 formats × clair / sombre ; docs (`spec-look.md` Q9 et T7, feuille de route)
- [x] T7.7 Test : tonalité lisible dans le sélecteur fermé sur un chant 中文 à six commandes (390 px), liste avec « (orig.) », changement de tonalité ; vu en échec → `SongDetailClient.tsx` (libellé visible + `select` natif transparent, suffixe sur ordinateur seulement)
- [ ] T7.8 Commit sur demande de Timothée, après validation en local

## T8 — Onglet Évènements sans QR code (16/09/2026, demande de Timothée)
- [x] T8.1 Test : aucun bouton « QR code » sur le calendrier, même pour la coordination ; vu en échec → `CalendrierClient.tsx` (le QR de la fiche d'un évènement reste)

## T9 — Lot 6 bis : onglet Évènements au look de la maquette (16/09/2026, go de Timothée)
- [x] T9.1 L1 test : carte avec « Inscrit » / « S'inscrire » / « Complet », sans badge, « S'inscrire » ouvre la fiche ; vu en échec → `EvenementCard.tsx`, `CalendrierClient.tsx`
- [x] T9.2 L2 test : bannière, horaire début – fin, « Pour plus d'infos », bouton plein ≥ 44 px, invités derrière, compteur ; vu en échec → `EvenementClient.tsx`, `Inscriptions.tsx` ; tests E1/E3 adaptés (« Je participe » → « S'inscrire » + « Confirmer »)
- [x] T9.3 L3 test : panneau des inscriptions (état, compteur), QR visible avec le lien, inscrits repliés ; vu en échec → `Inscriptions.tsx`, `QrCode.tsx`
- [x] T9.4 L4 test : ordre des champs, responsable pré-rempli, bannière, « Plus d'options » ; vu en échec → `EvenementForm.tsx`, `NouveauClient.tsx` ; tests E2 adaptés (libellés)
- [x] T9.5 L5 captures 4 formats regardées (conformes) ; suite complète verte ; docs
- [x] T9.6 L6 test : carte blanche de la fiche, zone d'attente de bannière, formulaire d'un seul bloc, compteur unique ; vu en échec → `EvenementClient.tsx`, `Inscriptions.tsx`, `EvenementForm.tsx` ; captures ordinateur + téléphone + tablette identiques
- [ ] T9.7 Commit sur demande de Timothée, après validation en local

## T10 — Bug : le serveur local affichait l'ancien code (16/09/2026)
- [x] T10.1 Diagnostic : le service worker sert `/_next/static/*` en cache-first ; hashé en production, pas en développement → JavaScript périmé dans le navigateur
- [x] T10.2 Test `tests/service-worker.spec.ts` : aucun fichier de Next en cache sur un serveur local ; vu en échec (28 fichiers) → `public/sw.js` (garde `LOCAL`, purge à l'activation, cache `v3`)
- [ ] T10.3 Timothée : rechargement forcé (Cmd+Maj+R) pour récupérer le nouveau service worker

