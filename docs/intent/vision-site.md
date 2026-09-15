# Vision du site GCC Louange

**Statut** : **confirmé par Timothée le 13/09/2026** (entretien en 9 tours),
**élargi le 14/09/2026** (entretien en 8 tours : l'app devient l'app de
l'église, reformulation d'ensemble soumise à Timothée). Le document reste
vivant : toute nouvelle décision ou tout changement d'avis y est reporté.

Ce document dit ce que le site doit être et ce que la refonte doit
accomplir, avec les mots de Timothée. Il sert de référence avant tout travail de
design ou de code. Le cahier des charges d'origine
(`../cahier-des-charges-site-louange.md`) est périmé : il décrit un site public
sans comptes, alors que le produit est devenu un outil interne d'équipe.

## Comment ce document évolue

- Chaque réponse est notée dans la section concernée, avec sa date.
- Si Timothée change d'avis, la nouvelle réponse remplace l'ancienne, et
  l'ancienne passe dans « Historique des changements d'avis » avec la date et la
  raison si elle est connue.
- Les questions encore sans réponse restent dans « Questions ouvertes ».
- Les demandes de l'équipe pas encore tranchées, l'ordre des lots et
  l'historique de ce qui est fait sont tenus dans `../feuille-de-route.md`.

## Ce qu'est le site aujourd'hui (faits)

- Outil interne de l'équipe de louange de GCC, en français et en chinois,
  installable sur téléphone (PWA), hébergé sur Vercel.
- Pages : planning des services, mes services, chants (370, FR et 中文, dont
  des partitions 简谱), setlists et mode louange, annonces, notifications,
  questionnaire, guide, profil, administration.
- Comptes et rôles (Firebase) ; les visiteurs non connectés voient les chants.

## Déjà décidé

| Date | Décision |
| --- | --- |
| 13/09/2026 | L'organisation de l'interface est dégelée (où vivent les actions, menus, filtres). |
| 13/09/2026 | Des fonctionnalités peuvent être ajoutées ou retirées, mais chaque ajout ou retrait est validé par Timothée **avant** d'être fait. |
| 13/09/2026 | Timothée valide seul la mise en ligne. Pas d'échéance. |
| 13/09/2026 | Conflit entre publics ou appareils : chaque appareil (téléphone, tablette, ordinateur) a sa propre mise en page, pour éviter d'avoir à choisir. |
| 13/09/2026 | Tout ce qu'on fait aujourd'hui reste possible, même si ça change de place. Les repères clés gardent leur place : barre du bas, bouton « Mode louange », barre d'outils du chant. |
| 13/09/2026 | Mise en ligne mixte : les bugs gênants partent tout de suite, le nouveau look part d'un bloc. Rien ne part en ligne sans la validation de Timothée. |
| 13/09/2026 | La forme du label contextuel de la navbar est dégelée ; son comportement (contextuel, coloré, animé) reste gelé. |
| 13/09/2026 | Le chrome de la page chant et du mode louange est dégelé (barres d'outils, réglages, sommaire, outils d'annotation). |
| 13/09/2026 | La typographie des chants et des accords est dégelée **partout** : page chant, vue partitions de la setlist, mode louange. Les annotations déjà dessinées en mode louange ne s'afficheront plus au bon endroit ; c'est accepté, et on prévient l'équipe avant. |
| 13/09/2026 | Restent gelés : couleurs de services, logo, couleurs des accords, du 简谱 et des sections, calques 简谱 certifiés, export PDF actuel (un export « couleurs par section » est ajouté à côté, voir « Fonctionnalités voulues »). |
| 13/09/2026 | La direction visuelle « Sobre sur crème » est rouverte. Critères : rester sobre, ne plus faire fade ni « document », garder peut-être les surfaces sans bordure. Référence : les apps d'Apple (Réglages, Musique, Calendrier). |
| 13/09/2026 | L'assistant de setlist en 3 étapes est remplacé par **une seule page** : infos en haut, chants en dessous, enregistrement automatique, plus de bouton « Suivant ». |
| 13/09/2026 | Les pages d'administration (admin, notifier, questionnaire) passent au nouveau style, **sans réorganisation**. |
| 13/09/2026 | Pour les nouveaux membres : l'app s'explique toute seule (libellés écrits plutôt qu'icônes muettes, écrans vides qui disent quoi faire), le guide est plus facile à trouver, **et l'accueil à la première connexion revient**. |
| 13/09/2026 | Réalisation du chantier Régie (détail dans `docs/spec-regie.md`) : **déroulé = sommaire latéral** dans la vue partitions, sur ordinateur ; bouton « Copier les paroles » **seulement dans la vue partitions de la setlist**, qui copie **l'ordre joué, reprises comprises**, une ligne vide entre les sections ; lien de présentation : **tout lien https** (pas seulement Canva). |
| 13/09/2026 | Réalisation du chantier Mode louange (détail dans `docs/spec-mode-louange.md`) : la tonalité reprise est celle **choisie sur la page du chant**, retenue **pour ce chant dans cette setlist, sur cet appareil**, avec un repère « A · setlist : G » et un retour possible ; **une seule taille du texte** pour la page du chant et le mode louange (les annotations dessinées à une autre taille ne s'affichent plus) ; vue structure : **« ×2 » seulement si les deux passages ont les mêmes nuances** ; la **police change dans ce chantier**, choisie sur captures. |
| 14/09/2026 | Pinyin agrandi à 0,7 × **validé, avec un espace garanti** entre deux syllabes voisines (sur captures, les syllabes longues se touchaient). |
| 14/09/2026 | Réalisation du chantier Planning (détail dans `docs/spec-planning.md`) : un dimanche est Interfranco ou Intergroupe si **sa date figure dans la feuille** du service ; la section Groupes est remplacée par ce service avec **tous ses rôles**, comme le Culte Franco ; **seul l'accueil du planning change** (« Mes services » les comptait déjà). |
| 14/09/2026 | Réalisation du chantier Setlist (détail dans `docs/spec-setlist.md`) : enregistrement **automatique partout**, un seul bouton **« Publier »** à la création ; historique **regroupé par passage** (même personne, moins de 15 min d'écart), **une phrase par sorte de réglage** d'un chant, montré par **une ligne sous le titre** de la setlist qui ouvre une feuille ; tonalité recommandée : **les 32 chants soumis avec une proposition**, Timothée tranche. **Capo conseillé mis en attente** : Timothée demande des informations à l'équipe. |
| 14/09/2026 | **L'app change de nature** : « ça va regrouper tout ce qui est en lien avec notre église, tout sur l'app », pas seulement la louange (pôle événement, évènements annuels, tâches des pôles, assemblée). Les conséquences (nom, menu, comptes de l'assemblée, rôles par pôle, plannings dans l'app ou sur Google Sheets) restent à trancher : voir « Questions ouvertes » et `../feuille-de-route.md` § 3.F à H. |
| 14/09/2026 | **Nom et menu** : l'app s'appelle « GCC », organisée par sections (Louange, Planning, Évènements…) ; le label contextuel de la navbar garde son rôle. Le nom et le menu se font avec le nouveau look. **15/09/2026 : la section « Évènements » existe dès le lot 3 bis** (programme de scène), dans la barre actuelle. |
| 14/09/2026 | **Comptes** : toute l'assemblée a un compte simple ; les équipes et pôles ont le même compte avec des rôles en plus (louange, régie, DA, Média, Orga, Événement). **Sans compte** : les chants et le calendrier des évènements de l'église en lecture, rien de nominatif. |
| 14/09/2026 | **Pôles** : DA, Média, Orga, Louange, Événement. Les services du dimanche (EDD, Prépa. Table, petit déj, accueil) restent des services du planning. |
| 14/09/2026 | **Plannings** : à terme remplis dans l'app (petit déj compris, avec inscription dans l'app) ; les Google Sheets restent en lecture en attendant. |
| 14/09/2026 | **Ordre des chantiers révisé** : planning (petits lots) → notification au président → structure « coup d'œil » → nouveau look → export PDF → évènements → tâches par pôle → nouveaux membres et 中文. Détail dans `../feuille-de-route.md` § 2. |
| 14/09/2026 | **Mode de travail** : chaque lot démarre sur un « go » explicite de Timothée, qui **teste en local** avant de laisser continuer ; la réussite d'un lot = sa validation. Exception donnée le soir même : la structure « coup d'œil » est **codée directement, sans maquettes**, et Timothée montre le résultat à Christelle. |
| 14/09/2026 | **Coup d'œil, après relecture** : le bandeau remplace la ligne « ORDRE » ; le **Dp** est une vraie section du chant adapté (mécanisme du mode Adapter), badge « Version modifiée » masqué quand seul un Dp a été ajouté ; **menu d'affichage** à trois positions (Ordre joué / Sections uniques / Structure seule), par appareil, « Structure seule » présélectionné pour un rôle Batteur mémorisé ; **abréviations** I · C1 C2… · Pr · R · Po · P · Pm · F · Tag · Dp · ×2, sections « autre » au nom écrit ; sections uniques : ordre joué forcé en mode Adapter, réimpression seulement si la tonalité change, notes et transitions d'occurrence dans le bandeau. |
| 14/09/2026 | **Les annonces fusionnent dans le calendrier** (lot Évènements) : la page Annonces disparaît, une annonce sans date devient une entrée épinglée du calendrier ; les annonces existantes et leur push par section sont migrés. |
| 14/09/2026 | « Prépa. Table du Seigneur » désigne les personnes qui mettent les tables pour le déjeuner à l'église : libellé conservé. |
| 14/09/2026 | **Nuancier en neutre** (test local du coup d'œil) : gris clair, gris, noir du doux au fort, indications en contour ; plus de violet, qui se confondait avec le pont — la couleur reste aux sections. Dans le bandeau, la nuance est un texte discret sous l'abréviation, jamais une pastille. |
| 14/09/2026 | **Go donné** (soir) pour les lots dans l'ordre décidé, lint compris. Réalisés le soir même, **à valider en local** : lint ; **Sainte cène** (colonne du Sheet = service à part entière, visible si remplie) ; **rappels regroupés** (une notification par personne et par échéance, services et rôles, FR / 中文 selon la langue de l'interface mémorisée côté serveur) ; **notification au président** quand le lien de présentation est posé ou remplacé (préférence « Setlist prête », jamais deux fois du même lien, la régie voit si personne n'a été prévenu) ; **coup d'œil** complet (menu Affichage à trois positions par appareil, sommaire par occurrence, « Dernière phrase » = section du chant adapté nommée « Dernière phrase – R », badge masqué, phrase d'historique dédiée). Détail : `../spec-planning-petits-lots.md`, `../spec-notif-president.md`, `../spec-coup-d-oeil.md`. Petit déj en attente du Sheet de Christelle. |
| 14/09/2026 | **Version perso d'un chant dans une setlist** (demande de Timothée, soir, entretien en quatre tours) : chaque musicien peut se faire **sa version** d'un chant (sections choisies et ordonnées, accords et paroles retouchés), **pour lui seul, dans cette setlist seulement**, sans toucher la structure ni la version de la présidence ; ses accords et paroles peuvent être **partagés sous son nom** et choisis par les autres, chacun gardant son choix ; la structure perso ne se partage jamais. Spec : `../spec-version-perso.md`. **Tranché le soir même** : lot **3 ter**, avant le look ; en V1, une retouche dans une section répétée **touche toutes ses répétitions** (confirmé après un aller-retour) ; libellés « Ma version », « Version de Christelle », « Présidence », « Partager ma version », « Sections ». **Go donné le soir même ; codé le 15/09/2026 en trois tranches (`../spec-version-perso.md`, « Avancement »), à valider en local.** |

## Intention

| | Réponse |
| --- | --- |
| Objectif de la refonte | « Une app que l'équipe a envie d'ouvrir le dimanche et pendant la semaine, sur son téléphone, sa tablette ou son ordinateur, sans perdre ce qu'elle sait déjà faire. » (13/09/2026) |
| Utilisateurs prioritaires | Musiciens et choristes (téléphone), responsables qui préparent setlists et planning (ordinateur), membres qui consultent leurs services. Deux rôles ont des besoins propres : les **batteurs** et la **régie** (ceux qui font le PPT). Les admins ne sont pas prioritaires. (13/09/2026) **Depuis le 14/09/2026, l'assemblée entière devient utilisatrice** (compte pour chacun, évènements, calendrier) ; l'équipe de louange garde ses outils intacts le dimanche. |
| Nouveaux utilisateurs attendus | Plus de sinophones (interface en 中文 aussi soignée que le français), de nouveaux membres pas forcément à l'aise avec la technique, de nouveaux responsables qui prépareront des setlists. (13/09/2026) |
| Pourquoi maintenant | Trois raisons à la fois : le site ne donne pas envie et ne fait pas « pro » ; l'équipe a du mal à s'en servir ; de nouveaux utilisateurs vont arriver. (13/09/2026) |
| Raisons d'ouvrir l'app en semaine | Toutes : voir ce qui me concerne (prochain service, chants à répéter), répéter les chants de la setlist, suivre la vie de l'équipe (annonces), préparer setlists et planning. (13/09/2026) |
| Ce qui dira que c'est réussi | Les quatre signes à la fois : un nouveau membre s'en sert sans explication ; moins de questions et de signalements ; les gens l'ouvrent aussi en semaine ; des retours spontanés (« c'est beau », « c'est pratique »). (13/09/2026) **Pour chaque lot (14/09/2026) : la réussite, c'est la validation de Timothée après test en local.** |
| Contrainte principale | Le dimanche ne doit jamais casser (mode louange, planning et setlists fiables pendant le culte), et le coût reste nul (offres gratuites de Vercel et Firebase). (13/09/2026) |
| Hors périmètre | « Pour le moment on ne modifie rien, peut-être plus tard » : pas d'app native iPhone ou Android ; pas de changement des couleurs de services, du logo ou des couleurs des partitions ; pas de retouche des partitions 简谱 ; pas de refonte des rôles et permissions ; pas de changement dans la façon de remplir le planning (Google Sheet). (13/09/2026) **Rouvert le 14/09/2026** pour les rôles et permissions et la façon de remplir les plannings : l'app devient l'app de l'église (voir « Déjà décidé »). |

## Ordre des chantiers

Les bugs gênants passent en premier, avec la validation de Timothée : ceux de
l'audit (menu coupé à 320 px, menu mobile transparent et non interruptible,
recherche des chants coupée par l'index A–Z), la copie des paroles qui arrive
d'un bloc, et l'index A–Z à balayer du doigt (placement proposé, à corriger si
besoin). Ensuite (13/09/2026) :

1. **Régie** : copie propre des paroles, lien Canva, déroulé.
2. **Mode louange** : vue batteurs, choix du rôle, reprise des réglages, police, nuancier de couleurs.
3. **Planning** : Interfranco et Intergroupe.
4. **Setlist** : page unique, historique des modifications, tonalité recommandée et capo.
5. **Nouveau look d'ensemble** : direction visuelle, puis toutes les pages (mis en ligne d'un bloc).
6. **Export PDF** en couleurs par section.
7. **Nouveaux membres et 中文** : accueil à la première connexion, guide, textes restés en français.

**Révisé le 14/09/2026** (les chantiers 1 à 4 sont livrés) :

1. **Planning, petits lots** : colonne Sainte cène, petit déj, rappels regroupés, liste des noms sans compte.
2. **Notification au président** (lien de présentation).
3. **Structure « coup d'œil »** : bandeau abrégé + nuances, sections uniques, Dp, batteurs — maquettes à Christelle avant de coder.
   - 3 bis (tranché le 14/09/2026, demande de 18:37) : **Programmes de scène, onglet « Noël »**, avant 3 ter et avant le look (échéance Noël) ; spec `../spec-programme-scene.md`.
   - **Lot 6 Évènements avancé** (Timothée, 15/09/2026) : se code juste après 3 bis, avant 3 ter et le look ; spec `../spec-evenements.md`, go pas encore donné.
   - 3 ter (demande de Timothée du 14/09/2026 soir, **position tranchée le soir même**) : **Version perso d'un chant dans une setlist**, avant le look (`../spec-version-perso.md`).
4. **Nouveau look** : direction visuelle, nom « GCC », menu par sections, toutes les pages.
5. **Export PDF** : classique / couleurs par section / compact.
6. **Évènements** (nouveau module).
7. **Tâches par pôle** (nouveau module).
8. **Nouveaux membres et 中文**.

## Difficultés remontées par l'équipe

| Qui | Difficulté | Ce que le code montre (vérifié le 13/09/2026) |
| --- | --- | --- |
| Responsables | Préparer ou modifier une setlist : l'assistant en 3 étapes est long ou déroutant, et c'est pénible sur téléphone ou tablette. | Audit : deux boutons principaux et deux flèches « retour » dès l'étape 1. |
| Tous | Se repérer dans les menus. | Audit : menu mobile de 725 px qui répète la barre du bas, icônes de navbar difficiles à deviner. |
| Musiciens | La police des chants et des accords : trop petite ou pas lisible de loin, accords en police « machine à écrire » peu lisibles. Partout : page chant, vue partitions, mode louange. | Paroles en Inter, accords en police à chasse fixe. |
| Batteurs | Le mode louange : il leur manque la structure en grand (où on en est), les nuances par section, et ils ne trouvent pas le préréglage « Batteur ». | Le préréglage existe (masque paroles et accords). Les paroles sont rendues invisibles mais **gardent leur place** : la page reste surtout vide. Les nuances sont déjà affichées en mode louange. Le choix du rôle est dans les réglages. |
| Régie (PPT) | Copie-colle les paroles du site vers PowerPoint ou Canva. Depuis la **vue partitions de la setlist**, sur ordinateur Windows ou macOS, le texte collé arrive **d'un bloc, sans retours à la ligne ni séparation entre les phrases**. Les noms de section sont copiés avec, et le pinyin des chants chinois ne l'est pas. | Un traitement de la copie existe (`copyLyrics.ts`) et devrait produire une ligne par ligne de chant : le problème vient donc d'un cas qu'il ne couvre pas (**bug à reproduire**). Le pinyin est volontairement exclu de la copie (`data-copy-ignore`) ; les noms de section ne le sont pas. |
| Régie (PPT) | Voir d'un coup d'œil l'ordre des chants et de leurs sections, et retrouver vite un chant ou une section. Elle s'en sert **avant le culte, sur ordinateur**, pour préparer ses diapos. | La vue liste montre l'ordre et les sections, mais pas à côté des paroles. Réponse retenue : un sommaire latéral dans la vue partitions (13/09/2026). |
| Tous | En passant en mode louange, les réglages faits avant ne sont pas repris : réglages de la page setlist (accords, pinyin, couleurs par section, 简谱), tonalité ou capo choisis juste avant, taille du texte. | La page setlist ne transmet au mode louange que « accords affichés ». |
| Sinophones | L'interface en 中文 est moins soignée que le français : textes restés en français, traductions maladroites, mise en page pensée pour le français. | Audit : fenêtre de signalement entièrement en français, libellés du menu mobile en dur (« Language / 语言 »). Les traductions maladroites ne peuvent être jugées que par un sinophone. |
| Planning | Un dimanche où il y a Interfranco ou Intergroupe, l'accueil du planning montre quand même la section « Groupes » (Paix, Fidélité, Bonté). | Les données Interfranco et Intergroupe sont déjà chargées par la page d'accueil du planning, mais pas affichées dans « Ce dimanche ». |
| Guitaristes et pianistes (Christelle, Jo, Eva ; sondage du 14/09/2026) | Suivre la structure de la présidence sans faire défiler la partition : la voir « en 1 coup d'œil », abrégée (R, C1, C2…), avec les nuances sous chaque passage, et chaque section une seule fois sur une page ou deux. Vue partitions et PDF. Les batteurs ont le même besoin (structure et nuances). | Vue partitions : sections dépliées dans l'ordre joué, reprises imprimées en entier ; ligne « ORDRE » aux noms complets sous chaque chant (c'est « la structure en haut ») ; bandeau seulement pour les scans 简谱 ; aucune abréviation. Détail : `../feuille-de-route.md` § 3.A. |
| Planning (Christelle) | Une colonne « Sainte cène » (aide à la présidence) ajoutée au Google Sheet doit s'afficher. | Colonne présente (index 11 de `Franco_Louange`), pas lue par `fetchCulte`. § 3.B. |
| Planning (Christelle) | Le petit déjeuner passe sur un fichier Google Sheet à part ; l'afficher sur l'accueil avec des rappels. | Jamais lu par le site aujourd'hui. § 3.D. |
| Tous (Christelle, Timothée) | Des rappels différents selon le service (Prépa. Table, petit déj, culte…). | Un seul texte « Tu sers demain » pour tous les services, Prépa. Table comprise. § 3.E. |
| Pôle événement (Christelle) | Organiser et planifier les évènements de semaine dans l'app, avec inscription et QR code ; évènements annuels de l'église ; tâches par pôle avec dates limites et notifications en chaîne. | Rien n'existe. § 3.F à H. |
| Alice et Christelle (Noël) | Réserver la scène pour les entraînements avant Noël : « la scène est très prisée en cette période » (entraînement franco, louange 25, chants EDD, spectacle) ; voir les créneaux libres et l'ordre de passage du jour J, dans l'app plutôt que sur un Google Sheet. | Rien n'existe ; l'onglet Campus (deux volets, lecture d'un Sheet) sert de modèle. `../feuille-de-route.md` § 3.K. |

## Usages par appareil

| Appareil | Qui, pour quoi |
| --- | --- |
| Téléphone | Musiciens et choristes (planning, chants, mode louange) ; responsables selon les cas. |
| Tablette | Musiciens, posée sur le pupitre en mode louange ; responsables selon les cas. |
| Ordinateur | Responsables qui préparent ; régie (déroulé et copie des paroles vers PowerPoint, avant le culte). |

## Fonctionnalités voulues

Chaque ligne a été choisie par Timothée pendant l'entretien. Les détails de
réalisation restent à lui soumettre avant de construire.

| Date | Fonctionnalité | Détail choisi | Ce que le code montre |
| --- | --- | --- | --- |
| 13/09/2026 | **Historique des modifications** des setlists | Voir ce qui a changé la dernière fois, les quelques dernières fois, ou toutes les fois. Sur les **setlists**, visible par **tout le monde**. Chaque modification dit **qui, quand et quoi** en phrases (« Ruth K. a ajouté Abba Père », « Tonalité de Ma passion : G → A »). **Consultation seulement**, pas de retour à une version précédente. | Les setlists n'ont qu'une date de dernière modification (`updatedAt`, utilisée par les notifications). Aucun historique de ce qui a changé ni de qui l'a changé. |
| 13/09/2026 | **Copie propre des paroles** | Une ligne de chant par ligne collée, sans les noms de section. Pour le chinois : une ligne de caractères, puis sa ligne de pinyin en dessous. Deux façons de copier : la sélection à la souris, et un bouton « Copier les paroles » par chant. | Voir la difficulté « Régie (PPT) ». |
| 13/09/2026 | **Vue « structure » pour les batteurs** | En mode louange, les sections en gros (Intro, Couplet, Refrain ×2…) avec leurs nuances, sans l'espace vide des paroles. | Voir la difficulté « Batteurs ». |
| 13/09/2026 | **Choix du rôle à la première ouverture du mode louange** | La question est posée la première fois, puis retenue sur l'appareil. | Aujourd'hui le choix est dans les réglages du mode louange. |
| 13/09/2026 | **Reprise des réglages en mode louange** | Reprendre les réglages de la page setlist, la tonalité ou le capo choisis juste avant, et la taille du texte. | Les annotations dépendent de la mise en page (accords, taille du texte…) : des réglages repris différemment peuvent changer les annotations affichées. |
| 13/09/2026 | **Accueil à la première connexion** (remise en place) | Revient en plus du guide. **Refait dans le nouveau style**, une fois le nouveau look prêt, avec les captures du guide mises à jour. | Supprimé le 18/07/2026 : commits `26d5621` (suppression), `c44c871` (retrait du layout), `24a847d` (règle `onboarding/{uid}` retirée de `firestore.rules`). |
| 13/09/2026 | **Planning : Interfranco et Intergroupe le dimanche** | « Lorsque c'est un dimanche où il y a Interfranco ou Intergroupe, il faudrait remplacer la section Groupes par Intergroupe ou Interfranco et mettre le planning qui y est associé. » Ces dimanches-là, **toute** la section Groupes est remplacée ; le Culte Franco a lieu normalement ; Interfranco et Intergroupe ne tombent jamais le même dimanche. | Voir la difficulté « Planning ». |
| 13/09/2026 | **Export PDF avec la vue « couleurs par section »** | Un **choix au moment de télécharger** : « classique » ou « couleurs par section ». Pour **les deux PDF** : un chant et la setlist complète. | Le PDF actuel utilise une seule couleur d'accent par langue, sans couleurs de section. |
| 13/09/2026 | **Lien Canva dans la setlist** | « La possibilité que la régie ajoute le lien du Canva pour la présentation PPT de la setlist dans la setlist. » Peuvent l'ajouter : **les personnes inscrites à la régie dans le planning ce jour-là (Sono et PPT)**, et aussi **ceux qui peuvent déjà modifier la setlist** et **les admins** (si la régie du jour n'a pas de compte relié ou est remplacée). **Visible par tout membre connecté** qui voit la setlist. | Une setlist n'a aucun champ de lien, seulement des notes libres. Un rôle « régie » existe dans les profils (lecture seule sur les cultes). Dans le planning, la régie regroupe les colonnes **Sono et PPT** (Campus : colonne régie). Le serveur sait déjà retrouver qui sert à une date et relier les noms du planning aux comptes (notification « setlist prête ») : la vérification peut se faire côté serveur, les règles Firestore ne pouvant pas lire le planning. |

| 13/09/2026 | **Nuancier de couleurs** pour les nuances | « La fonctionnalité nuances c'est top : possibilité de faire un nuancier de couleur ? Pour que ce soit plus visuel en mode louange et qu'on voie en un coup d'œil mf ou f ou crescendo. » **Une seule couleur en intensité, en 3 niveaux** : doux (pp, p), moyen (mp, mf), fort (f, ff) ; crescendo et decrescendo avec une flèche qui monte ou descend ; **badges plus grands et plus gras en mode louange**. Les indications (a cappella, break, voix seule…) ont un style neutre avec une icône. | 14 nuances : 8 dynamiques (pp, p, mp, mf, f, ff, cresc., decresc.) et 6 indications (a cappella, instrumental, voix seule, tous, spontané, break). Toutes ont aujourd'hui **la même couleur violette** (`#7C3AED`), proche du violet du pont et du Groupe Paix. |
| 13/09/2026 | **Tonalité recommandée** | « En plus de la gamme originale, mettre la gamme recommandée qui correspondrait à la gamme la plus chantée à Grace Church (ex. : Je reviens au cœur, gamme originale Eb mais on ne la chante qu'en D). Cela permettrait d'avoir un bon affichage du capo pour la GA. » **Calculée une fois** à partir des setlists passées : Timothée reçoit la liste (chant, tonalité la plus jouée, nombre de fois), valide ou corrige, puis la tonalité est **figée dans le chant** et se change ensuite à la main. Le calcul peut être relancé de temps en temps. **La recommandée s'affiche par défaut**, l'originale indiquée à côté ; **un chant ajouté à une nouvelle setlist démarre dans la tonalité recommandée**. **Le capo conseillé est montré aux guitaristes** sur la page du chant et dans la setlist, pas seulement en mode louange (ex. : chanté en Eb, capo 1 avec les formes de D). | Chaque chant n'a qu'une tonalité d'origine (`{key: Eb}` dans le fichier). Les setlists enregistrent la tonalité jouée pour chaque chant (`keyOverride`) : **la tonalité la plus chantée peut se calculer à partir des setlists passées**. La page chant démarre toujours dans la tonalité d'origine. Le capo n'existe qu'en mode louange, avec le préréglage Guitariste, retenu par chant sur l'appareil. |

| 14/09/2026 | **Notification au président quand le lien de la présentation est posé** | « Est-ce qu'il faudrait que quand on met le lien vers Canva on puisse envoyer une notif au président ? Soit automatique quand on met le lien, soit il faut que le mec qui fait PPT appuie sur un truc. » Choix : **automatique** dès que le lien est enregistré ou remplacé (un retrait n'envoie rien) ; **destinataire : le président de la setlist** (champ « Présidence », relié à son compte par le nom du planning) ; sans compte relié, rien ne part et la régie le voit. **Construite après le chantier 4**, en petit lot à part (complément du chantier Régie). | Le lien passe déjà par le serveur (`/api/setlist/presentation`), qui sait relier les noms du planning aux comptes (`resolveNamesToUids`, notification « setlist prête »). |
| 13/09/2026 | **Index A–Z qu'on balaye du doigt** (liste des chants) | « La bande verticale avec les lettres pour naviguer dans la liste des chants fonctionne mal, il faudrait qu'on puisse glisser notre doigt dessus et que ça bouge, pas seulement appuyer. » La liste suit le doigt en continu, comme l'index de Contacts sur iPhone. | Audit B4 : boutons de 32 × 24 px, un tap par lettre, pas de balayage ; la position est restaurée avec un saut visible au retour sur la liste. |
| 14/09/2026 | **Structure « en 1 coup d'œil »** (vue partitions de la setlist, puis PDF) | Demande de Christelle, partagée par Jo, Eva et les batteurs. **Bandeau** en tête de chaque chant : structure abrégée (I, C1, C2…, Pr, R, P, Inst, F, Pm, Dp, « ×2 »), **nuance sous chaque étape**, notes et transitions ; **sections uniques** en dessous (chaque section une seule fois), réglage par appareil **activé par défaut** ; **batteurs** : bandeau seul, sans paroles ni accords ; abréviations françaises partout, même en 中文 ; **mode louange inchangé** (ordre joué) ; PDF « compact » au téléchargement, avec le chantier PDF. Maquettes montrées à Christelle avant de coder. | Vue partitions : sections dépliées dans l'ordre joué, reprises en entier ; **une ligne « ORDRE »** (noms complets) sous l'en-tête de chaque chant (`SongView.tsx`), que le bandeau remplace ; bandeau des scans 简谱 (`JianpuStructureStrip`, réutilisable) ; aucune abréviation (`formatSectionName`). Règles après relecture : `../feuille-de-route.md` § 7. |
| 14/09/2026 | **Dp = « Dernière phrase »** (étape de structure) | Définie par la présidence dans l'éditeur de setlist : bouton « + Dernière phrase », choix de la section source et du nombre de lignes (aperçu). Rendue comme une vraie section « Dernière phrase (Refrain) », **accords et paroles compris**, partout (bandeau, sections uniques, mode louange, PDF, copie des paroles) ; suit la version adaptée du chant. **Pm** = pont musical (instrumental). | L'éditeur de structure ajoute des étapes par section (`SectionStructureEditor`) ; `resolveStructureOverride` résout les étapes vers les sections : une étape dérivée s'y ajoute sans toucher aux rendus. |
| 14/09/2026 | **Colonne « Sainte cène »** dans le planning du culte | Service à part entière : Ce dimanche, onglet Culte Franco, Mes services, rappels ; visible seulement quand la case est remplie. | En-tête présent à l'index 11 de `Franco_Louange` ; `fetchCulte` lit 0–10 ; notes de travail à partir de l'index 12 sur les lignes T4. |
| 14/09/2026 | **Petit déjeuner** sur un Google Sheet à part | Ligne dans Ce dimanche, Mes services, rappels ; pas d'onglet. Fichier et colonnes à recevoir de Christelle. Plus tard : inscription dans l'app. | Le petit déj existe dans `Franco_Table_PtD` (colonne R) sans être lu ; `fetchSheet` lit tout fichier public. |
| 14/09/2026 | **Rappels regroupés** | Une seule notification par personne et par échéance (J-7, J-3, J-1), qui liste ses services du jour avec le rôle : « Dimanche 20 septembre : Culte Franco (Piano) · Petit déj ». Deux notifications le même jour seraient intrusives. | Le cron envoie le même « Tu sers demain » à tous les services, Prépa. Table comprise ; il connaît déjà service et rôle (`servantsForDate`). |
| 14/09/2026 | ~~**Liste des noms du planning sans compte**~~ | **Existe déjà** : l'administration affiche « Planning sans compte (N) » (relecture du 14/09/2026). Rien à construire. | `src/app/admin/page.tsx` (`unlinkedNames`). |
| 14/09/2026 | **Évènements** (nouveau module) | Fiche complète : titre, date et heure, lieu, description, type (sport, loisir, musique, église), places max, lien externe, inscription ouverte, sans-compte autorisés, organisateur. **Rôle « événement »** attribué par un admin, + admins. **Inscription avec compte + invités** (« +2 ») ; les sans-compte s'inscrivent (nom libre) seulement si l'organisateur l'autorise. **Évènements annuels** de l'église dans le même calendrier, type « église ». **Calendrier public** sans compte. **QR code** vers le calendrier, fourni par l'app. Pas de lecture du Sheet de Steph (T4). | Rien n'existe ; annonces, plannings et rôles par catégorie servent de modèle. |
| 14/09/2026 | **Tâches par pôle** (nouveau module, après les évènements) | Tâche = pôle, responsable, échéance, état, lien (fond Canva…). Rappel d'échéance via le cron quotidien ; **chaîne** : tâche marquée faite → le pôle suivant est notifié (DA → régie). Cadré par un entretien à part. | Rien n'existe ; un seul cron Hobby reste libre, les échéances se greffent sur le cron quotidien. |
| 14/09/2026 | **Programmes de scène, onglet « Noël »** (demande de Christelle et Alice, 18:37) | Un onglet du planning par programme (nom « Noël », jour J 24/12/2026, réservations d'octobre au dimanche 20/12), **affiché ou masqué par Alice** (rôle « événement ») ou un admin. **Entraînements** : liste par dimanche comme Campus, « Scène libre » si vide, créneaux 17:00–18:00 par défaut, Quoi (Séance louange, Chant, Danse, Sketch, Spectacle) et Qui (classes EDD, groupes, Franco, 敬拜团), posés par tout membre connecté, chevauchement refusé et les deux auteurs alertés s'il passe quand même. **« Programme Noël »** : ordre de passage numéroté sans horaire, saisi à la main par la coordination. Après le 20/12, le programme seul. Rappels fondus dans ceux des services. Spec `../spec-programme-scene.md`. | Rien n'existe ; Campus lit `Campus_Louange` en deux volets, en lecture seule ; l'écriture Firestore des setlists et annonces est le modèle ; `firebase-admin` et le cron des rappels servent au conflit et aux rappels. |
| 14/09/2026 | **Version perso d'un chant dans une setlist** (demande de Timothée, soir) | « Modifier à notre guise, seulement pour l'utilisateur qui a choisi de changer ce qui est affiché, par exemple C R P avec les accords et les paroles, sans que ça modifie la structure que la présidence a choisie. » Choisi : **sections choisies et ordonnées** + **accords et paroles retouchés**, pour soi, **dans cette setlist seulement** ; **partage au choix** = une version à mon nom que les autres voient et peuvent choisir, chacun gardant la sienne ; la structure perso ne se partage pas ; mode louange suit ; liste, bandeau, PDF et lien de présentation restent sur la présidence. Détail : `../spec-version-perso.md`. | Tous les réglages de la vue partitions sont par appareil ; changer accords, paroles ou structure passe par la setlist commune (mode Adapter, éditeur). Les annotations du mode louange sont déjà des données perso par compte (Firestore) ; toutes les vues passent par `itemAst` + `resolveStructureOverride`. |

## Idées à trancher plus tard

| Date | Idée | Statut |
| --- | --- | --- |
| 13/09/2026 | Repère « modifié depuis ta dernière visite » sur une setlist | « Peut-être à ajouter. » |

## Questions ouvertes

- Le fichier Google Sheet du petit déjeuner (identifiant, onglet, colonnes) :
  à recevoir de Christelle.
- Dp : nombre de lignes maximum (hypothèse : 1 à 3).
- Rôles de pôle : attribués par un admin (hypothèse, comme les rôles de
  service aujourd'hui).
- Direction visuelle du nouveau look : à choisir au chantier 4 (déjà ouvert).
- La reformulation d'ensemble du 14/09/2026 (soir) attend le « oui » de
  Timothée (corrigée : la réussite = sa validation de chaque lot).
- Arbitrages restants de la relecture (`../feuille-de-route.md` § 7) : cible
  « régie » de la chaîne DA → régie (lot 7) ; onglets de la barre du bas et
  navigation sans compte (lot 4).
- Programmes de scène (`../spec-programme-scene.md`) : codé, à valider en
  local par Timothée ; choix faits en codant listés dans la spec.
- Évènements (`../spec-evenements.md`) : codé le 15/09/2026, à valider en
  local ; choix faits en codant listés dans la spec.

Les détails de réalisation de chaque lot restent soumis à Timothée au moment
de le commencer.

## Journal de l'entretien

### Tour 1 (13/09/2026)

- **Pourquoi maintenant** : (a) ne donne pas envie, pas « pro » ; (b) l'équipe a du mal à s'en servir ; (c) de nouveaux utilisateurs vont arriver.
- **Pour qui d'abord** : (a) musiciens et choristes sur téléphone ; (b) responsables qui préparent sur ordinateur ; (c) membres qui consultent leurs services. Pas les admins.
- **Fonctionnalités** : on peut refaire l'apparence et l'organisation, retirer et ajouter. « Quand il faut ajouter ou retirer des choses, il faut que je valide avant. »
- **Qui valide** : Timothée seul.
- **Échéance** : aucune, c'est prêt quand c'est prêt.
- **Reformulation de Timothée** : « Je veux une app que l'équipe a envie d'ouvrir le dimanche et pendant la semaine sur son téléphone, tablette ou ordinateur sans perdre ce qu'elle sait déjà faire. »

### Tour 2 (13/09/2026)

- **Difficultés** : (c) préparer ou modifier une setlist ; (d) se repérer dans les menus. En plus, avec les mots de Timothée : « la police des chants et des accords, le mode louange pour les batteurs, pour la régie se repérer dans la structure des chants des setlists. Pour la régie (ceux qui font le PPT) que les notations de section ne soient pas tout le temps visibles, pour le PPT c'est très handicapant. Que quand on se met en mode louange ça ne prend pas en compte les changements précédents. »
- **Nouveaux utilisateurs** : (a) plus de sinophones ; (c) nouveaux membres peu à l'aise avec la technique ; (d) nouveaux responsables.
- **En semaine** : (a) ce qui me concerne ; (b) répéter ; (c) vie de l'équipe ; (d) préparer.
- **Qui passe en premier** : (c) chaque appareil a sa mise en page.
- **Sans perdre ce qu'elle sait faire** : (a) tout reste possible ; (b) les repères clés gardent leur place.
- **Réussite** : (a), (b), (c) et (d).
- **Mise en ligne** : (c) bugs tout de suite, look d'un bloc. « Il faut que je valide pour qu'on le mette en live. »

### Tour 3 (13/09/2026)

- **Police** : (a) trop petite ou pas lisible de loin ; (b) accords en police « machine à écrire » peu lisibles.
- **Batteurs** : (a) structure en grand ; (c) nuances par section ; (d) ne trouvent pas le préréglage.
- **Régie** : « Elle copie-colle les paroles depuis le site vers PowerPoint, pour les chants chinois il faut que les pinyin soient copier-collables. »
- **Se repérer dans la structure** : (a) le déroulé d'un coup d'œil ; (c) retrouver vite un chant ou une section.
- **Réglages à reprendre en mode louange** : (a) ceux de la page setlist ; (b) tonalité ou capo ; (c) taille du texte.
- **Tablette** : (a) musiciens sur le pupitre ; (c) responsables. « Pour les responsables ils font sur téléphone et tablette, ça dépend. »
- **Idée ajoutée par Timothée** : « Faudrait ajouter un système d'historique, qui nous permet de voir ce qui a été changé la dernière fois ou les quelques dernières fois ou toutes les fois où ça a été modifié. Ça c'est une fonctionnalité qu'il faudrait ajouter sur le site. »

### Tour 4 (13/09/2026)

- **Historique** : (a) sur les setlists, pour tout le monde.
- **Police** : partout, page chant, vue partitions et mode louange ; (y) on change la police même en mode louange, en acceptant que les annotations existantes se décalent.
- **Format du chinois copié** : (a) une ligne de caractères, puis sa ligne de pinyin.
- **Façon de copier** : (a) sélection propre ; (b) bouton par chant. « Aujourd'hui quand on copie-colle les paroles, le texte est en ligne, il n'y a pas de séparation, retours à la ligne et tout entre les phrases. »
- **Vue batteurs** : (a) vue « structure ».
- **Choix du rôle** : (a) demandé à la première ouverture, retenu sur l'appareil.
- **Setlist** : (e) l'assistant est long ou déroutant ; (f) pénible sur téléphone ou tablette.
- **Déroulé pour la régie** : (a) avant le culte, sur ordinateur.

### Tour 5 (13/09/2026)

- **Détail de l'historique** : (b) qui, quand et quoi, en phrases.
- **Revenir en arrière** : (a) non, consultation seulement. « “Modifié depuis ta dernière visite” peut-être à ajouter. »
- **Copie d'un bloc** : « vue partitions de la setlist, sur un ordinateur Windows ou macOS, collé dans PowerPoint/Canva ».
- **Assistant de setlist** : (a) une seule page.
- **Interface en 中文** : (a) textes restés en français ; (b) traductions maladroites ; (c) mise en page pensée pour le français.
- **Nouveaux membres** : (c) l'app s'explique toute seule et le guide est plus visible, « et remettre en place l'accueil à la première connexion ».
- **Pages d'administration** : (b) nouveau style, sans réorganisation.
- **Références** : (a) les apps d'Apple.
- **Ajouts de Timothée** : « Lorsque c'est un dimanche où il y a Interfranco ou Intergroupe, il faudrait remplacer la section Groupes par Intergroupe ou Interfranco et mettre le planning qui y est associé. Et aussi l'export des PDF mais avec la vue “couleur par section”. La possibilité que la régie ajoute le lien du Canva pour la présentation PPT de la setlist dans la setlist. »

### Tour 6 (13/09/2026)

- **Interfranco / Intergroupe** : toute la section Groupes est remplacée ; le Culte Franco a lieu normalement ; jamais les deux le même dimanche.
- **Export PDF** : (a) choix au moment de télécharger.
- **Lien Canva** : (b) « la personne qui est inscrite à la régie ».
- **Accueil à la première connexion** : (b) refait dans le nouveau style, après le nouveau look.
- **Contrainte principale** : (a) le dimanche ne casse jamais ; (b) coût nul.
- **Hors périmètre** : (a) à (e). « Pour le moment on ne modifie rien, peut-être plus tard. »
- **Ordre** : 2, 3, 5, 4, 1, 7, 6 (voir « Ordre des chantiers »).
- **Correction** : au tour 5, il avait été écrit qu'aucun rôle « régie » n'existait dans les permissions. C'était faux : ce rôle existe dans les profils (lecture seule sur les cultes).

### Tour 7 (13/09/2026)

- **Sono** : (b) le Sono compte comme régie, comme le PPT.
- **Qui voit le lien Canva** : (a) tout membre connecté.
- **Qui d'autre peut l'ajouter** : (b) ceux qui peuvent modifier la setlist ; (c) les admins.
- **PDF en couleurs par section** : (c) un chant et la setlist complète.
- **Ajouts de Timothée** : « La fonctionnalité nuances c'est top : possibilité de faire un nuancier de couleur ? Pour que ce soit plus visuel en mode louange et qu'on voie en un coup d'œil MZ ou F ou Crescendo. Gamme tonalité : possibilité d'avoir, en plus de la gamme originale, la gamme recommandée qui correspondrait à la gamme la plus chantée à Grace Church (ex. : Je reviens au cœur, gamme originale Eb mais on ne chante qu'en D). Cela permettrait d'avoir un bon affichage du capo pour la GA. »

### Tour 8 (13/09/2026)

- **Nuancier** : (c) une couleur en intensité sur 3 niveaux, flèches pour crescendo et decrescendo, badges plus grands en mode louange ; indications neutres avec icône.
- **Qui fixe la tonalité recommandée** : « BC je pense » (calcul à partir des setlists, et validation ou correction par Timothée). Point à préciser.
- **Tonalité par défaut** : (a) la recommandée, originale à côté ; oui, une nouvelle setlist démarre dans la recommandée.
- **Capo** : « Le capo c'est pour les guitaristes » ; (b) aussi sur la page du chant et dans la setlist.
- **Ordre** : nuancier avec le mode louange (2), tonalité recommandée avec la setlist (4).

### Tour 9 (13/09/2026)

- **Tonalité recommandée** : (b) calculée une fois, validée, puis figée dans le chant.
- **Reformulation d'ensemble** : « Oui. » Statut passé à « confirmé ».
- **Ajout de Timothée** : « La bande verticale avec les lettres pour naviguer dans la liste des chants fonctionne mal, il faudrait qu'on puisse glisser notre doigt dessus et que ça bouge, pas seulement appuyer. »

### Réalisation du chantier Régie (13/09/2026)

- **Déroulé** : sommaire latéral dans la vue partitions, sur ordinateur.
- **Bouton de copie** : ordre joué, reprises comprises, ligne vide entre les sections.
- **Emplacement du bouton** : vue partitions de la setlist seulement.
- **Liens acceptés** : tout lien https (Canva, Google Slides, PowerPoint en ligne…).

### Réalisation du chantier Mode louange (13/09/2026)

- **Tonalité reprise** : celle choisie sur la page du chant (le capo viendra avec le chantier 4).
- **Portée** : retenue pour ce chant dans cette setlist, sur cet appareil, avec un repère et un retour à la tonalité de la setlist.
- **Taille du texte** : une seule taille partout, page du chant et mode louange.
- **Reprises en vue structure** : « ×2 » si les deux passages ont les mêmes nuances, sinon une ligne chacun.
- **Police** : changée maintenant, sur captures, pas avec le nouveau look.
- **Police choisie** : **Atkinson Hyperlegible Next** (paroles et accords, FR ; le 中文 garde Source Han ; PDF inchangé), préférée à Source Sans 3 et à Inter partout.
- **Deux polices pour le français et le chinois** (demande de Timothée) : caractères chinois en **Source Han Sans Medium** (au lieu de Light), pinyin en **Andika** (tous les tons vérifiés), choisis sur captures.
- **Taille par défaut** des paroles et accords, vue sur captures : **+20 % sur grand écran (tablette, ordinateur), +10 % sur téléphone** ; pinyin agrandi de 0,6 à 0,7 × la taille de base (capture à valider).

### Réalisation du chantier Setlist (14/09/2026)

- **Enregistrement** : automatique partout ; à la création, brouillon automatique et un bouton « Publier ».
- **Historique, regroupement** : une entrée par passage (même personne, moins de 15 min d'écart).
- **Historique, détail** : une phrase par sorte de réglage d'un chant ; ajouts, retraits, ordre, tonalité et infos en détail.
- **Historique, emplacement** : ligne sous le titre de la setlist, qui ouvre une feuille (dernière, 5 dernières, toutes).
- **Tonalité recommandée** : la liste des 32 chants, avec une proposition pour chacun (`docs/tonalites-recommandees.md`).
- **Capo** : « On ne met pas de capo conseillé pour le moment » ; stand-by, Timothée demande des informations supplémentaires.

### Demandes de l'équipe, conversation avec Christelle (14/09/2026)

Positions exprimées par Timothée dans la conversation, **à confirmer** avant
d'être considérées comme décidées :

- Structure « coup d'œil » : « je comptais changer ça aussi, j'aime pas
  comment c'est présenté » ; « pour les batteurs je vais leur faire un truc
  spécial » ; « quand je commence à avoir des rendus en local je te
  montrerai ».
- Rappels : « faudrait faire des notifs spécifiques pour chaque service, qui
  envoie un message différent ».
- Petit déjeuner : Google Sheet « pour commencer » (choix de Christelle),
  plutôt qu'un formulaire sur le site.
- Pôle événement : « j'avais pensé à faire tous les plannings directement via
  l'app GCC » ; « si c'est pour des personnes de l'église c'est mieux qu'ils
  soient inscrits ».
- Brainstorming du soir, Timothée : « Et oui la nature de l'app va changer,
  ça va regrouper tout ce qui est en lien avec notre église, tout sur
  l'app. » Consigné dans « Déjà décidé » et dans l'historique des changements
  d'avis.
- Sondage de Christelle : Jo et Eva (pianistes) veulent aussi la structure
  « coup d'œil » ; Éloïse (guitariste) sans avis ; Esther (pianiste) sans
  réponse.

### Entretien du 14/09/2026 (soir), 8 tours

Chaque tour : quatre questions, le pari de Claude en première option.

- **Tour 1 (pivot)** : comptes pour toute l'assemblée ; sans compte, chants et
  calendrier ; inscription aux évènements avec compte + invités, **et** « donner
  la possibilité à la personne qui s'occupe des inscriptions de choisir si les
  personnes sans compte peuvent s'inscrire ou non » ; nom « GCC » par sections.
- **Tour 2 (évènements)** : vrai module dans l'app ; rôle « événement » +
  admins ; fiche complète ; annuels dans le même calendrier, type « église ».
- **Tour 3 (pôles)** : tâches par pôle, module à part après les évènements ;
  rappel d'échéance + chaîne ; plannings à terme dans l'app, Sheets en
  attendant ; QR code vers le calendrier fourni par l'app.
- **Tour 4 (coup d'œil, maquettes)** : bandeau + sections uniques, préféré à
  « bandeau seul » et à « ordre joué, reprises repliées ».
- **Tour 5 (détails)** : réglage par appareil activé par défaut ; abréviations
  françaises partout ; « Dp c'est dernière phrase, à définir par la présidence
  (la personne qui crée la setlist) ; Pm = pont musical » — question de
  Timothée : comment afficher accords et paroles du Dp ? ; batteurs = coup
  d'œil sans paroles ni accords.
- **Tour 6** : Dp comme étape « Dernière phrase » dérivée d'une section
  (accords compris, partout) : oui ; PDF compact avec le chantier PDF ; Sainte
  cène = service à part entière ; petit déj = accueil + Mes services + rappels.
- **Tour 7** : rappels : « plusieurs notifications le même jour, est-ce que ça
  fait pas un peu trop intrusif ? » → une seule regroupée ; liste admin des
  noms sans compte ; « Prépa. Table du Seigneur c'est les personnes qui
  doivent mettre les tables pour le déjeuner à l'église » ; la « demande via
  GCC » = export PDF avec les sections en couleur. Ajout : « plus tard
  l'inscription pour le petit déj se fera sur l'app directement aussi ».
- **Tour 8** : une seule notification qui liste tout, avec les rôles, J-7 /
  J-3 / J-1 ; pôles DA, Média, Orga, Louange, Événement ; mode louange garde
  l'ordre joué ; ordre des chantiers : planning → président → coup d'œil →
  look → PDF → évènements → tâches → 中文.
- **Suite** : « la réussite c'est quand moi j'aurai tout validé » ; crainte de
  fonctionnalités redondantes ou en conflit → relecture adversariale par un
  relecteur à contexte vierge, 20 constats consignés dans
  `../feuille-de-route.md` § 7 ; deux affirmations de ce document corrigées
  (ligne « ORDRE » existante ; liste admin existante). Règles de travail :
  go par lot, test en local ; coup d'œil codé directement et montré à
  Christelle par Timothée.

### Demande de Christelle du 14/09/2026 (18:37) : la scène avant Noël

- Transmise par Timothée après les lots codés du soir. Christelle, après
  discussion avec Alice (qui gère les entraînements et l'ordre de passage
  de Noël) : planifier les entraînements sur scène dans l'app, deux volets
  comme Campus (entraînements, passage le jour J), sans Google Sheet.
  Consignée dans « Fonctionnalités voulues » et `../feuille-de-route.md`
  § 3.K (lot 3 bis proposé, avant le look). Rien n'est tranché ni codé :
  Timothée choisit la position et répond aux paris, puis donne le go.
- Suite le même soir : sept paris acceptés, puis entretien « grill » en cinq
  tours (maquette jetable des deux vues regardée par Timothée). Tranché :
  onglet « Noël » activable par Alice, entraînements **le dimanche seulement**
  d'octobre au 20 décembre, jour J le 24 décembre sans réservation, créneaux
  17:00–18:00 par défaut, listes Quoi / Qui, « Programme Noël » à la main,
  rappels fondus dans ceux des services, alerte des deux auteurs en cas de
  chevauchement. Spec `../spec-programme-scene.md`. **Go donné puis lot codé
  dans la nuit du 14 au 15/09/2026**, à valider en local ; règles Firestore
  à publier, pôle Événement à donner à Alice.
- 15/09/2026, test local : « c'est pas bon » → onglet unique nommé comme le
  programme affiché, gestion en haut de la même page ; puis « l'onglet qui se
  crée soit dans l'onglet évènement et non dans le planning » → la **section
  « Évènements »** de l'app GCC est créée dès maintenant (barre principale,
  menu mobile, `/evenements`) avec ce seul onglet ; le lot 6 la remplira.

### Demande de Timothée du 14/09/2026 (soir) : version perso d'un chant dans la setlist

- « Est-ce que ce serait possible dans la setlist, qu'on modifie à notre
  guise seulement pour l'utilisateur qui a choisi de changer ce qui est
  affiché, par exemple C R P avec les accords et les paroles, sans que ça
  modifie la structure que la présidence a choisie. » Puis : « Pose-moi des
  questions pour être sûr d'avoir compris ce que je veux. »
- **Tour 1** : structure seulement, ou aussi accords et paroles ? → « choisir
  quelles sections voir et dans quel ordre, et aussi retoucher les accords et
  les paroles pour soi seul ou bien les partager avec les autres ».
- **Tour 2** : partager = remplacer la version commune (Adapter), ou une
  version à mon nom que les autres voient et choisissent ? → « la deuxième ».
- **Tour 3** : pour ce chant partout, ou dans cette setlist seulement ? →
  « seulement dans cette setlist ».
- **Tour 4** : restitution (résultat, partage, portée, pour qui, réussite,
  hypothèses par compte / mode louange / PDF, hors périmètre) → « go », lu
  comme un go pour la spec. Consignée dans « Déjà décidé », « Fonctionnalités
  voulues », `../feuille-de-route.md` § 3.L (lot 3 ter proposé) et
  `../spec-version-perso.md`. Rien n'est codé.
- **Tour 5** (trois points soumis) : position → « 3 ter, avant le look » ;
  hypothèse 3 → « retoucher une ligne d'une section répétée **ne change
  pas** toutes ses répétitions dans ma version » (donc copie d'occurrence
  dès V1, comme Adapter) ; libellés → acceptés. Go pour le code pas encore
  donné.
- **Tour 6** : « Je me suis trompé pour l'hypothèse 3, c'était bien comment
  tu avais fait tout à l'heure » → hypothèse 3 d'origine confirmée : en V1,
  une retouche touche toutes les répétitions de la section ; la copie
  d'occurrence est remise à plus tard si c'est gênant.
- **Go** (« Je vois pas la fonctionnalité sur le site en local » puis « go »)
  → V1, V2 et V3 codées le 15/09/2026, test d'abord, trois appareils, un
  chant FR et un chant ZH ; rien de commité ; à valider en local.
- **Après livraison** : « La copie des paroles doit être possible seulement
  si on suit la setlist de la présidence » → bouton « Copier les paroles »
  masqué sur ma version, ma structure ou la version d'un autre.

### Lot 6 Évènements, entretien du 15/09/2026

- Après la section Évènements du lot 3 bis, Timothée demande de coder « tout
  ce qui est en rapport avec les évènements » ; lu comme le lot 6, confirmé.
  Deux tours, 19 questions, toutes les recommandations acceptées (détail :
  `../feuille-de-route.md` § 3.M, spec `../spec-evenements.md`). Points
  saillants : calendrier public sans noms, inscription avec invités, sans
  compte au choix de l'organisateur, fusion des annonces avec migration, QR
  code, rappel la veille, droit d'annonces conservé comme droit de création
  par section. **Go donné puis codé le 15/09/2026** (quatre tranches, 36
  tests × 3 appareils), à valider en local ; règles à publier, migration des
  annonces à lancer depuis l'administration.

## Historique des changements d'avis

| Date | Avant | Après |
| --- | --- | --- |
| 18/07/2026 → 13/09/2026 | Accueil à la première connexion supprimé, remplacé par le guide. | L'accueil revient, en plus du guide. |
| 13/09/2026 | Export PDF entièrement gelé. | Export PDF actuel gelé, mais un export « couleurs par section » est voulu. |
| 13/09/2026 | Refonte sans ajouter ni retirer de fonctionnalité. | Ajouts et retraits possibles, validés par Timothée avant d'être faits. |
| 13/09/2026 | Typographie des chants dégelée sur la page chant seulement ; gelée en mode louange pour ne pas décaler les annotations. | Dégelée partout, mode louange compris. Le décalage des annotations existantes est accepté, l'équipe sera prévenue. |
| 13/09/2026 → 14/09/2026 | Outil interne de l'équipe de louange ; hors périmètre : refonte des rôles et permissions, façon de remplir le planning. | L'app devient l'app de l'église entière (évènements, pôles, assemblée) ; rôles, comptes et plannings sont à repenser pour les nouveaux usages — détails non tranchés. |
| 14/09/2026 | Annonces : page à part, poussées par section. | Fusionnées dans le calendrier des évènements (lot 6) ; une annonce sans date = entrée épinglée. |
| 15/09/2026 | Lot 6 après le look et le PDF. | Lot 6 juste après 3 bis, avant 3 ter et le look (Timothée). |
| 14/09/2026 (soir) | Version perso d'un chant : une retouche dans une section répétée ne touche que cette occurrence (copie, comme Adapter). | Retour à l'hypothèse de la spec : en V1, la retouche touche toutes les répétitions ; copie d'occurrence plus tard si gênant. |
