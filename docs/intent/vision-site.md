# Vision du site GCC Louange

**Statut** : **confirmé par Timothée le 13/09/2026** (entretien en 9 tours). Le
document reste vivant : toute nouvelle décision ou tout changement d'avis y est
reporté.

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

## Intention

| | Réponse |
| --- | --- |
| Objectif de la refonte | « Une app que l'équipe a envie d'ouvrir le dimanche et pendant la semaine, sur son téléphone, sa tablette ou son ordinateur, sans perdre ce qu'elle sait déjà faire. » (13/09/2026) |
| Utilisateurs prioritaires | Musiciens et choristes (téléphone), responsables qui préparent setlists et planning (ordinateur), membres qui consultent leurs services. Deux rôles ont des besoins propres : les **batteurs** et la **régie** (ceux qui font le PPT). Les admins ne sont pas prioritaires. (13/09/2026) |
| Nouveaux utilisateurs attendus | Plus de sinophones (interface en 中文 aussi soignée que le français), de nouveaux membres pas forcément à l'aise avec la technique, de nouveaux responsables qui prépareront des setlists. (13/09/2026) |
| Pourquoi maintenant | Trois raisons à la fois : le site ne donne pas envie et ne fait pas « pro » ; l'équipe a du mal à s'en servir ; de nouveaux utilisateurs vont arriver. (13/09/2026) |
| Raisons d'ouvrir l'app en semaine | Toutes : voir ce qui me concerne (prochain service, chants à répéter), répéter les chants de la setlist, suivre la vie de l'équipe (annonces), préparer setlists et planning. (13/09/2026) |
| Ce qui dira que c'est réussi | Les quatre signes à la fois : un nouveau membre s'en sert sans explication ; moins de questions et de signalements ; les gens l'ouvrent aussi en semaine ; des retours spontanés (« c'est beau », « c'est pratique »). (13/09/2026) |
| Contrainte principale | Le dimanche ne doit jamais casser (mode louange, planning et setlists fiables pendant le culte), et le coût reste nul (offres gratuites de Vercel et Firebase). (13/09/2026) |
| Hors périmètre | « Pour le moment on ne modifie rien, peut-être plus tard » : pas d'app native iPhone ou Android ; pas de changement des couleurs de services, du logo ou des couleurs des partitions ; pas de retouche des partitions 简谱 ; pas de refonte des rôles et permissions ; pas de changement dans la façon de remplir le planning (Google Sheet). (13/09/2026) |

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

| 13/09/2026 | **Index A–Z qu'on balaye du doigt** (liste des chants) | « La bande verticale avec les lettres pour naviguer dans la liste des chants fonctionne mal, il faudrait qu'on puisse glisser notre doigt dessus et que ça bouge, pas seulement appuyer. » La liste suit le doigt en continu, comme l'index de Contacts sur iPhone. | Audit B4 : boutons de 32 × 24 px, un tap par lettre, pas de balayage ; la position est restaurée avec un saut visible au retour sur la liste. |

## Idées à trancher plus tard

| Date | Idée | Statut |
| --- | --- | --- |
| 13/09/2026 | Repère « modifié depuis ta dernière visite » sur une setlist | « Peut-être à ajouter. » |

## Questions ouvertes

_Aucune pour l'instant. Les détails de réalisation de chaque chantier seront soumis à Timothée au moment de le commencer._

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

## Historique des changements d'avis

| Date | Avant | Après |
| --- | --- | --- |
| 18/07/2026 → 13/09/2026 | Accueil à la première connexion supprimé, remplacé par le guide. | L'accueil revient, en plus du guide. |
| 13/09/2026 | Export PDF entièrement gelé. | Export PDF actuel gelé, mais un export « couleurs par section » est voulu. |
| 13/09/2026 | Refonte sans ajouter ni retirer de fonctionnalité. | Ajouts et retraits possibles, validés par Timothée avant d'être faits. |
| 13/09/2026 | Typographie des chants dégelée sur la page chant seulement ; gelée en mode louange pour ne pas décaler les annotations. | Dégelée partout, mode louange compris. Le décalage des annotations existantes est accepté, l'équipe sera prévenue. |
