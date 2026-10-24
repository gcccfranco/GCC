# Spec : lot TB2 — le tableau de bord, version 3 de la planche

**Statut** : spec réécrite le 23/10/2026 (soir) sur la version 3 de la planche, validée par Timothée (« Vas y go on
fait ça ») ; **le code attend un go donné après cette spec**. Planche : https://claude.ai/artifact/34HGM6n5LSXC14MkSWiuTK.
Feuille de route § 3.AD. Le chantier des fiches (`spec-coulisses.md`) est **en pause** ; le Culte Franco n'est pas un
évènement mais un planning parmi d'autres (`intent/vision-site.md`, correction du 23/10/2026).

## Mots de Timothée

> « J'aime pas l'apparence du Dashboard […] j'ai l'impression que les données qu'on mets servent à rien. »
> « Tout ce que je veux modifier c'est juste le Dashboard […] sans toucher à trop de choses. » — « Piste A et choix B. »
> « Le culte franco le prend pas comme un événement […] c'est là pour travailler sur les événements mais aussi tous
> les plannings, les réunions et tout. »

## Objectif

Le tableau de bord ressemble au Back-Office : **Plannings, Évènements, Tâches, Réunions**, chaque widget ne montrant
que **ce qui demande une action**, plus un petit **« Ce dimanche »** en coup d'œil. On change le contenu des widgets et
la disposition par défaut ; le système de widgets (personnaliser, glisser, Monter / Descendre, S M L, réglages,
retirer, barre du bas) **ne change pas**. Ensuite, 2 ou 3 responsables l'essaient avant toute autre refonte.

## Décisions

| # | Décision |
| --- | --- |
| T1 | **On garde le système de widgets** (`TableauDeBord.tsx`, `OutilsWidget.tsx`, `src/lib/tableauDeBord/disposition.ts`). |
| T2 | **Aucune donnée nouvelle**, aucune collection, **aucune règle Firestore**. |
| T3 | **Ce dimanche** (`dimanche`, S) : une ligne par service ou planning du dimanche qui nous concerne (réglage « services » gardé) : « prêt » ou « n choses manquent » (lesquelles, en court), lien « Voir ». Plus la liste des noms. |
| T4 | **Cases vides → Plannings** (`planning`, L) : dans les plannings qu'on remplit (règle actuelle `planningsCasesVides`) : les cases vides du prochain dimanche, chacune avec **qui relancer** et « Copier le rappel » ; les **absences en conflit** (une personne planifiée qui s'est déclarée absente) avec « Remplacer » ; une ligne « n cases vides d'ici le {date} » pour les 4 dimanches suivants. |
| T5 | **Prochains évènements → Évènements** (`evenements`, M) : d'abord ceux qu'on organise ou que porte une de ses équipes, puis les autres ; inscriptions en pastille, « ferme bientôt », créneaux de scène vides ; **les réunions en sortent**. |
| T6 | **À faire → Tâches** (`afaire`, M) : les siennes d'abord, puis celles de ses équipes ; en retard en premier. |
| T7 | **Nouveau widget Réunions** (`reunions`, S) : ses réunions à venir (celles dont on est, `estDeLaReunion`) avec leur nombre de sujets ; une réunion passée sans lien de compte rendu. Permis comme l'entrée Réunions. |
| T8 | **Comptes** (`comptes`, S, admins) : deux nombres (« noms sans compte », « nouveaux cette semaine ») et « Voir ». |
| T9 | **Disposition par défaut**, filtrée par les droits comme aujourd'hui : Ce dimanche (S), Plannings (L), Évènements (M), Tâches (M), Réunions (S), Comptes (S). Setlists à préparer, Petit déj, Scène, Calendrier, Chants les plus joués, Raccourcis **sortent du défaut** et restent dans « Ajouter un widget », inchangés. |
| T10 | **Dispositions déjà enregistrées** : remplacées une fois par le nouveau défaut (`versionTableau: 2` dans `backOffice/{uid}` ; absente = défaut). `barreDuBas` n'est pas touché. |

## Règles (pures, `src/lib/tableauDeBord/donnees.ts`)

- **Prochain dimanche** : aujourd'hui compris jusqu'à midi.
- **Ce qui manque, par service** : postes non optionnels vides de la grille ; pour un culte, aussi la setlist publiée
  (`!isPrivate && !isDraft`) et la présentation (`presentationUrl`) ; pour la table, le petit déj. Une lecture en
  échec n'est jamais « prêt » : « Lecture impossible ».
- **Qui relancer** pour une case vide : poste de Louange → référent de la sous-équipe (Présidence, Musiciens,
  Choristes : `referentSous`), sinon référent Louange ; autre colonne → référent de l'équipe qui la remplit ; sans
  référent → pas de bouton.
- **Absence en conflit** : un nom de la ligne dont le profil (`planningName`) a une absence couvrant la date ; le
  widget Plannings n'est vu que de qui remplit un planning, donc de qui voit déjà les absences de tous
  (`canVoirAbsencesDeTous`) ; le motif n'apparaît jamais.
- **Rappel copié** (français) : « Salut {prénom}, pour le {service} de dimanche {date}, il manque encore quelqu'un
  {au poste}. Tu peux t'en occuper d'ici samedi ? Merci ! {lien du planning} ». `navigator.clipboard.writeText` dans
  le geste, repli sur sélection du texte ; « Copié ».

## Ce qui sera construit

| Tranche | Contenu | Vérifié par |
| --- | --- | --- |
| TB2-a | Règles pures (ce qui manque, qui relancer, absences en conflit, texte du rappel, tri des évènements et des tâches). | Tests rouges sur fonctions vides puis verts. |
| TB2-b | Widgets Ce dimanche, Plannings (« Copier le rappel », « Remplacer »), Évènements, Tâches, Comptes. | Écrans sur jeu d'essai, 4 dispositions + 1 440 px ; presse-papier. |
| TB2-c | Widget Réunions ; nouveau défaut ; `versionTableau` ; libellés FR et 中文. | Défauts de chaque rôle ; disposition ancienne remplacée une fois ; 中文. |

## Tests

`tests/tableau-de-bord.spec.ts` mis à jour (déjà dans `SPECS_GRAND_ECRAN`) : trois appareils, cinq projets ; Firestore
et Sheet simulés ; noms fictifs inventés ; captures regardées.

## Hors périmètre

Fiches, modèles, nombre par trimestre, jour J, communication, menu, rappel du matin, liste « À régler » unifiée (à
revoir après l'essai par 2 ou 3 responsables). `access.ts` ne change que dans `widgetsPermis` (widget Réunions).

## Avancement

- 23/10/2026 : planche version 3 et spec. Go de Timothée le même jour pour le lot entier.
- TB2-a (183aa66) : règles pures dans `donnees.ts` (section « Lot TB2 »), 16 tests rouges sur fonctions vides puis verts.
- TB2-b (ed69077) : widgets Ce dimanche, Plannings, Évènements, Tâches, Comptes ; lectures partagées des évènements et
  des profils (`lecture.ts`) ; FR et 中文.
- TB2-c : widget Réunions, défaut T9, `versionTableau: 2` (écrit à chaque geste, `barreDuBas` hors du masque) ; les
  specs qui supposaient l'ancien défaut ouvrent une disposition enregistrée en version 2.
- Tests : `tableau-de-bord.spec.ts` vert sur les cinq projets ; specs voisines adaptées et vertes. Échecs déjà
  présents avant le lot, sans lien : `barre-back-office` (4, téléphone et tablette, vérifié sur l'arbre d'avant),
  `back-office-espace:244`, `equipes-acces:130/184`.
- Captures : `test-results/tableau-de-bord-captures/` (`*-admin.png` = nouveau défaut, `*-v2.png`, `*-personnaliser.png`),
  regardées sur les quatre dispositions et à 1 440 px.

### TB2-corrections (24/10/2026, go de Timothée le même jour)
1. **`widgetsPermis`** : le widget Évènements ne dépend plus que de l'entrée Évènements (il l'était aussi avec Réunions,
   reste d'avant TB2). Son « Tout voir » mène toujours à `/back-office/evenements`. Un membre d'équipe responsable sans
   Évènements a le widget Réunions seul (test pur dans `back-office-espace`, test d'écran repris dans `agencement-v18-t2a`).
2. **Évènements, T5 « inscriptions en pastille »** : chaque ligne de l'app porte une pastille neutre (`4 / 10`, `3 inscrits`,
   « inscriptions fermées », « formulaire externe »), orange si « ferme bientôt », pour les siens comme pour les autres ; le
   sous-titre gris ne reste que pour « ferme bientôt » et les créneaux de scène vides. Les lignes du Sheet n'ont pas de
   pastille (pas d'inscriptions). Clés `places` et `sansLimite` retirées (FR, 中文).
3. **Barre latérale pâle sur `ordinateur-v2.png`** : pas un défaut du site. La capture pleine page agrandit la fenêtre
   (la page v2 dépasse 720 px, pas celle de `ordinateur-admin.png`) et relance le fondu des libellés (`barre-fondu`,
   150 ms) : opacité mesurée 0,84 juste après la capture ; la capture de la seule fenêtre est normale. Les trois captures
   du fichier prennent `animations: "disabled"`.
4. **`barre-back-office`, 4 tests** : comportement voulu par le lot AO. Les cases à la main (`plannings`, `equipes`,
   `notify`, `coordination`) n'ouvrent plus rien au Back-Office et `fakeSession` ne les traduit pas (son en-tête le dit).
   Profils rattachés à l'organigramme, attentes gardées : repli → `remplit("paix")` ; carte Messages/Équipes → référente
   des Choristes + membre de TEAM DA + rôle Notifier du Groupe Paix (sept entrées, trois dans « Plus ») ; pastille de
   Tâches → Alice + `remplitParRole: ["paix"]`. Seul changement d'attente : depuis AO, une référente tient son équipe et la
   notifie, donc Alice a sept entrées et « Plus » montre Réunions, Équipes et Messages (test renommé, trois cartes vérifiées).
5. **`equipes-acces`, comités** : voulu. OG17 et l'avancement d'OG-B de `spec-organigrammes-groupes.md` (le lot des
   organigrammes de groupe, pas V19FETES) : un admin voit les équipes puis les cinq comités. Attentes mises à jour
   (`equipesDesTaches`, `equipesOuCreer`, `creatableEvenementPours`).
6. **Deux tests instables** : `back-office-espace` « le sélecteur rouvre la dernière page… » n'était pas instable mais
   rouge à chaque passe sur téléphone et tablette : depuis AO, la barre du bas d'Alice (référente EDD) n'a plus
   Évènements ; le test lui enregistre une barre qui l'a. `barre-back-office` « une page hors de la barre marque
   « Plus » » (et `back-office-espace` « une entrée du menu mène à sa page », même mécanisme, vu rouge cache froid) : la
   page Tâches redirige vers l'équipe par `router.replace`, et l'URL ne change qu'à la réponse de la route `[equipe]`,
   que `next dev` compile à la première demande. Trace : requête RSC encore en attente 5 s après son départ. Rien à
   corriger dans le site (compilé au build en ligne) ; l'attente de ces deux URL passe à 20 s, commentée.
7. **`CLAUDE.md`** : 20 routes API, sans `/api/admin/*` (dossier disparu).
8. **Passage complet** (24/10/2026, après les commits) : `tableau-de-bord`, `back-office-espace`, `barre-back-office`,
   `equipes-acces`, `agencement-v18-t2a`, `calendrier-widget` — 953 verts, 0 rouge, 60 ignorés (appareil non concerné) ;
   `tsc` sans erreur.

### Écarts — acceptés par Timothée le 23/10/2026 (« Ok pour les huit choix »)
1. **Qui relancer** : aucune table colonne → équipe n'existait ; reprise de l'organigramme (`colonnesParEquipe`) :
   cultes — Sono, Sono Live, PPT → référent Régie ; présidence, suppléant → Présidence ; choristes → Choristes ;
   instruments → Musiciens ; le reste (orateur, traduction…) → référent Louange ; EDD → référent EDD ; Table →
   référent Orga ; plannings des groupes (remplis par un rôle de groupe) → pas de bouton.
2. **Ce dimanche** : la ligne « Table » (petit déj) ne s'affiche que pour qui remplit la Table ou l'admin ; la
   setlist et la présentation ne comptent que pour les plannings du culte (pas les groupes) ; sans setlist, on dit
   « setlist » seul (pas aussi « présentation »).
3. **Plannings** : absences en conflit sur le prochain dimanche et les suivants ; une personne sur deux postes donne
   deux lignes. Le réglage « Sur » (2 / 4 / 8) est gardé et devient le nombre de dimanches suivants (défaut 4). La
   ligne « d'ici le … » reste affichée en vert quand tout est rempli.
4. **Évènements** : « ferme bientôt » = fin des inscriptions dans les 7 jours ; « créneaux de scène vides » = créneaux
   sans personne des programmes affichés, un dimanche entre le début et la fin de l'évènement (aucun lien programme ↔
   évènement n'existe). Les entrées du Sheet restent avec « les autres ».
5. **Tâches** : « les siennes » = celles dont on est responsable (`responsableUid`) ; les tâches « pour toute
   l'équipe » vont avec celles des équipes.
6. **Réunions** : la mention « compte rendu de la dernière : pas de lien » ne s'attache qu'à une réunion à venir du
   même public (pas de ligne seule s'il n'y en a pas) ; le nombre = sujets non traités.
7. **Comptes** : le réglage « Liste » n'a plus de sens et disparaît.
8. **Disposition par défaut** : la même pour tous (admin compris), filtrée par les droits ; en grand écran les colonnes
   du lot v18 placent Plannings (L) dans la colonne large, à gauche de Ce dimanche.

### Libellés 中文 à relire
排班表 · 活动 · 任务 · 会议 (noms, repris du menu) ; 一览 ; 已就绪 ; 歌单 · 演示文稿 · 早餐 ; 你负责的 ; 需提醒：{prénom}（{rôle}负责人） · 没有可提醒的负责人 ; 复制提醒 ·
已复制 · 请复制下面的文字。 ; 已请假 · 排在 {poste} ; 替换 ; 截至{date}的空缺 · 截至{date}无空缺 ; 报名即将截止 ;
{n} 个舞台时段空缺 ; 舞台 ; {n} 人报名 ; 你的 · 自 {date} 起逾期 · 截止 {date} ; 无账号的名字 · 本周新账号 ; 查看 ; {n} 个议题 ; 上次会议：未附纪要链接 ;
暂无即将举行的会议。 Le texte du rappel copié reste en français.
