# Spec — Visite de première connexion selon le rôle

> Demande de Timothée du 22/10/2026 : « J'avais commencé à faire un petit guide/tuto pour la première connexion au
> site. Je voudrais remettre ça et surtout en fonction du rôle de chacun dans l'organigramme, expliquer certaines
> fonctionnalités et non et tout. »

Planche (canvas, 22/10/2026, décisions appliquées) : https://claude.ai/artifact/LCyntv9xNiqDHymUsBA14T —
parcours cliquable sur téléphone, carte de référent sur tablette, carte de présidence sur ordinateur, « Revoir la
visite » dans Moi, catalogue des cartes.

## Objectif

L'accueil du lot 8 (`src/components/onboarding/Accueil.tsx`, `docs/spec-nouveaux-membres.md` A1) ne connaît que
trois cas (présidence, musicien ou choriste, autre), ne se voit qu'une fois et ne se rouvre pas. La **visite** le
remplace : mêmes fenêtre, gestes et style, mais le milieu du parcours se compose de **cartes** tirées du profil — rôle
de service, équipes de l'organigramme, droits — qui disent ce que la personne peut faire, et à qui s'adresser pour le
reste. Elle est **remontrée une fois à tous** quand le back-office passe en ligne, et se **revoit** depuis Moi et le
Guide.

## Décisions (22/10/2026)

| # | Décision |
| --- | --- |
| VR1 | Forme : **cartes par rôle** dans la fenêtre actuelle (pas de bulles sur la page, pas de page à part). |
| VR2 | Sources : `serviceRoles` **et** l'organigramme (`dansEquipes`, `referentDe`) **et** les droits (coordination, groupe, plannings, notifier, évènements). |
| VR3 | Parcours : Bienvenue · Où trouver quoi · **au plus trois cartes** (service, équipe, responsabilités) · Notifications (si à proposer) · C'est parti. **7 écrans au plus** (lève le plafond de 5 du lot 8, Q17), 4 sans rôle ni équipe. |
| VR4 | Plusieurs rôles de service : **une carte, la plus haute** (présidence > musicien > choriste > régie) ; les autres nommés sur la pastille (« aussi choriste »). |
| VR5 | Plusieurs équipes : **une carte** « Tes équipes » qui les nomme ; référent d'au moins une → la version référent, qui nomme laquelle. Le public Louange élargi (toute personne avec un rôle de service) **ne donne pas** de carte équipe : la carte service en tient lieu. TEAM LOUANGE (`dansEquipes` ∋ `louange`) en donne une. |
| VR6 | Chaque carte : « **Tu peux** » (trois gestes au plus, en gras ce qu'on cherche dans l'app) et, quand quelqu'un est à nommer, **une ligne « X : c'est le rôle de … »** (pas de « Pas pour toi »). |
| VR7 | **Aucune carte pour les admins.** |
| VR8 | Remontrée à tous **derrière l'interrupteur du back-office** : la version 2 de la visite ne s'impose aux comptes qui ont vu l'accueil du lot 8 que si `BACK_OFFICE` est vrai. Elle part en ligne avec lui. |
| VR9 | **Revoir la visite** : une carte dans Moi (avec Guide, Ton avis, Signaler) et un encart en haut du Guide. Revoir n'écrit rien. |
| VR10 | « **Voir dans le guide** » sous une carte seulement là où une section existe (table ci-dessous). |
| VR11 | Harmonie sur la carte musicien seule. Planning et notifier : deux lignes de la carte responsabilités. |
| VR12 | Textes FR + 中文 (proposé ci-dessous, **relu par Timothée** comme au lot 8). |

## Ce qui est construit

### Composition — `src/lib/onboarding/visite.ts` (nouveau, pur, sans React)

```ts
type Carte =
  | { kind: "service"; role: ServiceRole; lieux: string[]; aussi: ServiceRole[] }
  | { kind: "equipe"; equipes: string[]; referentDe: string[] }
  | { kind: "responsabilites"; lignes: Ligne[] }   // 1 à 4 lignes
  | { kind: "membre" };
type Ligne =
  | { kind: "coordination" }
  | { kind: "groupe"; groupe: string }
  | { kind: "planning"; plannings: string[] }
  | { kind: "messages"; audiences: string[] }
  | { kind: "evenements"; sections: string[] };

export function cartesDeLaVisite(user, profile, backOffice: boolean): Carte[]
```

- **Service** : rôles = union des `serviceRoles` ; le plus haut selon l'ordre de VR4 ; `lieux` = les catégories où
  il figure (libellés `categories.*`) ; `aussi` = les autres rôles, sans doublon.
- **Équipe** (si `backOffice`) : `dansEquipes` + `referentDe`, sans doublon, dans l'ordre de `ORDRE_EQUIPES` ; noms par
  `cleNomEquipe(id, true)`. Comités de groupe compris (ce sont des équipes).
- **Responsabilités** (si `backOffice`, et jamais pour un admin — `isAdminUser`) : dans cet ordre, quatre lignes au
  plus — `isCoordination` ; groupe tenu (`tientUnGroupe`, le groupe de `referentDe`) ; plannings
  (`profile.plannings` ∪ `remplitParRole`) ; messages (`audiencesNotifiables(profile, true)`) ; évènements
  (`profile.annonces`).
- **Membre** : aucune des trois autres → cette seule carte.
- Admin : la carte service s'il a des rôles, la carte équipe s'il est dans une équipe ; jamais de responsabilités.

### Écrans — `Accueil.tsx` réécrit

1. **Bienvenue** — inchangé pour un compte neuf ; pour un compte qui avait vu le lot 8 : pastille « La visite a
   changé », titre « Bonjour {prénom} », texte de la planche.
2. **Où trouver quoi** — les onglets (Évènements toujours filtré par `BACK_OFFICE`) + une ligne **Back-Office** si
   `entreesBackOffice(user, profile)` n'est pas vide.
3. **Cartes** — gabarit de la planche : pastille (rôle · lieu · « aussi … », ou équipe · « membre »/« référent »),
   titre, « Tu peux » et ses gestes (icône en pastille 32 px), filet, ligne « X : c'est … », lien « Voir dans le guide »
   (ferme la visite, sans la marquer vue si c'est un revoir).
4. **Notifications** — inchangé (même logique `notifs`).
5. **C'est parti** — texte : « … Cette visite se revoit à tout moment : Moi › Revoir la visite. »

Fenêtre, points, « Passer », Retour/Suivant, glissé, ← → et Échap : inchangés.

### Vu, version, revoir — `src/lib/firebase/onboarding.ts`

- `onboarding/{uid}` gagne `version: 2` (écrit par `setAccueilVu`). **Aucun changement de règle** : l'intéressé y écrit
  déjà tout son document (`firestore.rules`, `match /onboarding/{uid}`).
- `getAccueilVu` rend la version lue (absent → `0`, erreur → « vu », comme aujourd'hui). La visite s'ouvre si
  `version === 0`, ou si `BACK_OFFICE && version < 2`. La clé de session (`accueil-vu-{uid}`) porte la version.
- **Revoir** : `ouvrirVisite()` exporté par `Accueil.tsx` (évènement `window` « gcc:visite ») ; l'accueil monté dans le
  layout l'écoute et s'ouvre en mode revoir : écran Bienvenue sans la pastille, Notifications sauté si rien à
  proposer, **aucune écriture** en fermant.
- Entrées : `CarteAide` « Revoir la visite » dans `src/app/moi/page.tsx` (icône `RotateCcw`), encart en tête de
  `src/app/guide/page.tsx` (« Pour toi, en N cartes » + bouton).

### Guide visé par chaque carte (ancres existantes de `/guide`)

| Carte | Ancre |
| --- | --- |
| Présidence | `#compose` |
| Musicien, choriste | `#performance` |
| Régie | `#setlists` |
| Équipe, référent | `#taches` (back-office ouvert) |
| Responsabilités | `#roles` |
| Membre | `#planning` |

## Textes (FR · 中文 proposé, à relire)

Clés sous `accueil.*` (les existantes gardées tant qu'elles servent ; `accueil.presidence|musicien|autre` retirées).

| Clé | FR | 中文 |
| --- | --- | --- |
| `accueil.change` | La visite a changé | 导览已更新 |
| `accueil.bonjour` | Bonjour {{prenom}} | {{prenom}}，你好 |
| `accueil.bienvenue.retour` | L'app de l'église : chants, setlists, planning et évènements. En quelques cartes, ce que tu peux y faire, selon ta place dans l'église. | 教会的应用：诗歌、歌单、服事表和活动。用几张卡片，告诉你按你在教会的位置可以做什么。 |
| `accueil.ou.backOffice` | Le travail de ton équipe : tâches et réunions. On y passe par le sélecteur App ↔ Back-Office. | 你团队的工作：任务和会议。通过「应用 ↔ 后台」切换进入。 |
| `accueil.tuPeux` | Tu peux | 你可以 |
| `accueil.aussi` | aussi {{roles}} | 也是{{roles}} |
| `accueil.voirGuide` | Voir dans le guide | 在指南中查看 |
| `accueil.fin.texte` | Le guide explique chaque écran en détail. Cette visite se revoit à tout moment : Moi › Revoir la visite. | 指南详细介绍每个页面。随时可以重看本导览：我的 › 重看导览。 |
| `accueil.revoir` | Revoir la visite | 重看导览 |
| `accueil.revoirSous` | Ce que ta place dans l'église te permet de faire | 你在教会的位置可以做什么 |
| `accueil.pourToi` | Pour toi, en {{n}} cartes | 为你准备的 {{n}} 张卡片 |

**Cartes** (`accueil.carte.<id>.titre`, `.peut.1–3`, `.role`) :

| Carte | FR | 中文 |
| --- | --- | --- |
| presidence.titre | Tu présides le culte | 你负责主领聚会 |
| presidence.peut | Créer la **setlist** de ton culte : les chants et leur ordre. · Choisir la **tonalité** de chaque chant ; la tonalité recommandée est déjà mise. · **Prévenir** l'équipe quand elle est prête ; la régie y dépose la présentation. | 为你的聚会创建**歌单**：诗歌和顺序。· 为每首诗歌选择**调**；推荐调已预先设好。· 准备好后**通知**团队；音控会在上面放演示文稿。 |
| presidence.role | Les setlists des autres cultes : c'est leur créateur ; tu les lis et peux les dupliquer. | 其他聚会的歌单：由创建者负责；你可以查看和复制。 |
| musicien.titre | Tu joues le dimanche | 你主日司琴/伴奏 |
| musicien.peut | Ouvrir la setlist de ton service et la jouer en **Mode Louange**. · Transposer, mettre un capo, garder **ta version** d'un chant avec tes notes. · Progresser avec **Harmonie** : le catalogue d'accords et les cours. | 打开你服事的歌单，用**敬拜模式**演奏。· 转调、夹变调夹，保存带笔记的**我的版本**。· 用**和声**进步：和弦目录和课程。 |
| musicien.role | Modifier la setlist : c'est la personne qui l'a créée. | 修改歌单：由创建者负责。 |
| chanteur.titre | Tu chantes le dimanche | 你主日献唱 |
| chanteur.peut | Ouvrir la setlist de ton service et suivre les paroles en grand en **Mode Louange**. · Lire les chants chinois en caractères, en **pinyin** ou en **简谱**. · Garder **ta version** d'un chant avec tes notes. | 打开你服事的歌单，在**敬拜模式**中看大字歌词。· 用汉字、**拼音**或**简谱**看中文诗歌。· 保存带笔记的**我的版本**。 |
| chanteur.role | Modifier la setlist : c'est la personne qui l'a créée. | 修改歌单：由创建者负责。 |
| regie.titre | Tu es à la régie | 你负责音控 |
| regie.peut | Lire la **setlist** de chaque culte où tu sers, dès qu'elle est prête. · Y déposer le lien de la **présentation** : la présidence est prévenue. · Voir dans le **planning** les dimanches où tu es à la régie. | 歌单一准备好就能查看你服事聚会的**歌单**。· 在上面放**演示文稿**链接：主领会收到通知。· 在**服事表**中查看你负责音控的主日。 |
| regie.role | Choisir les chants : c'est la présidence du culte. | 选诗歌：由聚会主领负责。 |
| equipe.titre | Ton équipe : {{equipe}} / Tes équipes : {{equipes}} | 你的团队：{{equipe}} / 你的团队：{{equipes}} |
| equipe.peut | Voir les **tâches** de l'équipe et cocher celles dont tu es responsable. · Ajouter un **sujet** à la prochaine réunion, puis lire son compte rendu. · Retrouver qui fait quoi dans l'**organigramme**. | 查看团队的**任务**，勾选你负责的任务。· 为下次会议添加**议题**，之后阅读会议纪要。· 在**组织架构**中查看谁负责什么。 |
| equipe.role | Créer les tâches et les réunions : c'est le rôle des référents de {{equipe}}. | 创建任务和会议：由{{equipe}}的负责人负责。 |
| referent.titre | Tu mènes {{equipe}} | 你带领{{equipe}} |
| referent.peut | Créer les **tâches** de l'équipe, les confier à quelqu'un et les cocher. · Organiser une **réunion** : ordre des sujets, compte rendu. · Créer un **évènement** pour ton équipe, avec inscriptions. | 创建团队**任务**，分配给成员并勾选完成。· 组织**会议**：议题顺序、会议纪要。· 为团队创建**活动**，可报名。 |
| referent.role | Changer qui est dans l'équipe : c'est l'administration, dans l'organigramme. | 调整团队成员：由管理员在组织架构中负责。 |
| resp.titre | Tes responsabilités | 你的职责 |
| resp.coordination | **Coordination** : régler la scène, créer pour toute l'église, modifier tout évènement. | **统筹**：安排舞台，为全教会创建、修改任何活动。 |
| resp.groupe | **{{groupe}}** : son organigramme, son planning, ses notifications. | **{{groupe}}**：组织架构、服事表和通知。 |
| resp.planning | **Planning {{plannings}}** : remplir les cases, voir les absences, publier. | **{{plannings}}服事表**：填写、查看请假、发布。 |
| resp.messages | **Messages** : prévenir {{audiences}} par notification. | **消息**：通过通知提醒{{audiences}}。 |
| resp.evenements | **Évènements de {{sections}}** : les créer et les gérer. | **{{sections}}的活动**：创建和管理。 |
| membre.titre | La vie de l'église | 教会生活 |
| membre.peut | Voir dans le **planning** qui sert chaque dimanche. · T'inscrire aux **évènements** et aux temps forts de l'église. · Chercher un **chant** et le lire dans ta tonalité. | 在**服事表**中查看每个主日谁服事。· 报名教会的**活动**。· 搜索**诗歌**，用你的调查看。 |
| membre.role | Servir le dimanche : parles-en à la présidence de ton culte. | 想在主日服事：请联系你聚会的主领。 |

Le geste « évènements » de la carte membre suit l'interrupteur : back-office coupé (section Évènements absente), il
devient « Lire les **setlists** de chaque culte. » · « 查看每个聚会的**歌单**。»

Écart avec la planche : depuis SC1 (18/10/2026) une setlist se modifie par son **créateur** ; les lignes « c'est la
présidence » de la planche deviennent « c'est la personne qui l'a créée » (musicien, choriste, présidence).

## Tests — `tests/visite-par-role.spec.ts` (écrits d'abord, vus rouges ; trois appareils + `SPECS_GRAND_ECRAN`)

Profils fictifs inventés pour ce test, jamais de vrais noms.

1. `cartesDeLaVisite` (pur) : présidence + choriste → une carte service « presidence », `aussi: ["chanteur"]` ;
   musicien seul sans équipe → [service] ; membre de deux équipes, référent d'une → carte équipe référent ; rôle de
   service seul → pas de carte équipe (Louange élargi) ; `dansEquipes ∋ louange` → carte équipe ; coordination +
   planning + notifier → une carte, trois lignes dans l'ordre ; cinq droits → quatre lignes ; admin → pas de
   responsabilités ; rien → [membre] ; `backOffice = false` → ni équipe ni responsabilités.
2. Compte neuf musicien + équipe Médias : la visite montre « Tu joues le dimanche » puis « Ton équipe : Médias »,
   « Commencer » écrit `onboarding/{uid}` avec `version: 2`.
3. Compte qui a vu le lot 8 (`{ vu: true }` sans version) : la visite s'ouvre avec « La visite a changé » ; second
   serveur (back-office coupé) : elle ne s'ouvre pas.
4. Compte sans rôle : quatre écrans au plus, carte « La vie de l'église ».
5. Moi › « Revoir la visite » rouvre la visite ; la fermer n'écrit rien dans `onboarding/{uid}`. Même chose depuis
   l'encart du Guide.
6. « Voir dans le guide » mène à la bonne ancre.
7. Agencement : fenêtre centrée sur tablette paysage et ordinateur 1 440, plein écran sur téléphone, rien ne déborde.

**Helper** : `tests/helpers/fakeSession.ts` écrit par défaut `onboarding/{uid}` **avec `version: 2`** (sinon la
visite masquerait toutes les pages testées) ; `accueil: true` garde le compte neuf ; nouvelle option pour simuler un
« vu du lot 8 ». `tests/nouveaux-membres.spec.ts` (A1) mis à jour aux nouveaux écrans.

## Tranches

- **VR-A** — `visite.ts` + tests purs (1).
- **VR-B** — `Accueil.tsx` réécrit, `onboarding.ts` (version), locales FR/中文, fakeSession ; tests 2–4, 6–7 ;
  `nouveaux-membres.spec.ts` à jour.
- **VR-C** — Revoir : Moi, Guide, `ouvrirVisite` ; test 5. Regard à l'œil sur les quatre dispositions + 1 440.

Un commit par tranche, message en français.

## Hors périmètre

- Visite par bulles sur les vrais boutons ; captures dans les cartes.
- Nouvelles sections du guide (Réunions, Équipes) : les cartes équipe visent `#taches` en attendant.
- Toute modification de `firestore.rules` (aucune n'est nécessaire).

## À la mise en ligne

La visite v2 se remontre à tous le jour où `NEXT_PUBLIC_BACK_OFFICE=1` est posé sur Vercel — pas à la seule fusion
dans `main` si la variable reste absente. Avant : les nouveaux comptes voient la visite sans cartes d'équipe ni de
responsabilités.

## Avancement

- 22/10/2026 — planche, décisions VR1–VR12 sur recommandations, spec écrite.
- 22/10/2026 — go de Timothée pour VR-A, VR-B, VR-C ; codé par une session orchestratrice.
  - **VR-A** : `src/lib/onboarding/visite.ts` (`cartesDeLaVisite`) ; `ongletDeLaGrille` exporté de `access.ts`.
  - **VR-B** : `Accueil.tsx` réécrit (modes première, retour, revoir), `onboarding/{uid}.version = 2`, textes FR et
    中文, `fakeSession` (version 2 par défaut, option `accueilLot8`), `nouveaux-membres.spec.ts` à jour.
  - **VR-C** : `ouvrirVisite()` (« gcc:visite »), carte « Revoir la visite » dans Moi (après Guide), encart du Guide
    (« Pour toi, en N carte(s) », pluriel par `count`).
  - **Écart retenu par Timothée** : back-office ouvert, le rôle de service vient de l'organigramme (sous-équipes de
    Louange, `lieuxLouange`, `lieuxRegie`) et les responsabilités des droits du lot AO (`colonnesRemplies`,
    `audiencesNotifiables(…, true)`, `sectionsCreables`) — `serviceRoles`, `plannings`, `annonces` n'y sont plus lus
    (A4). Back-office coupé : `serviceRoles`, comme l'ancien accueil.
  - Choix d'exécution : clés ajoutées `accueil.role.*`, `accueil.membre`, `accueil.referent`, `accueil.toutLEglise`,
    `accueil.carte.equipe.titres`, `accueil.carte.membre.peutSetlists`, `accueil.pourToi_one` ; carte responsabilités
    sans pastille ni ligne « c'est … » ; Bienvenue « retour » garde le logo, la pastille dessous.
  - Tests : `tests/visite-par-role.spec.ts` (composition pure, parcours, lot 8, revoir, ancre, agencement ; cinq
    projets), `nouveaux-membres`, `back-office-coupe` (visite non remontrée serveur coupé) — verts sur les trois
    appareils et les deux grands formats. Captures regardées sur les quatre dispositions + 1 440 px.
  - **Reste à valider par Timothée** : textes 中文 ; cartes référent et responsabilités à l'œil ; sous-ligne de
    « Revoir la visite » tronquée sur ordinateur dans Moi (grille existante, comme Guide, Ton avis, Signaler).
