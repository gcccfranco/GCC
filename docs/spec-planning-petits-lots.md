# Spec : lot 1 — Planning, petits lots (Sainte cène, petit déj, rappels regroupés)

Lot 1 de `feuille-de-route.md` § 2. **Go de Timothée le 14/09/2026 (soir)** :
« commence à faire les modifications qu'il faut dans l'ordre qu'on a décidé ».
Lots 1a et 1c codés le même soir ; **1b codé le 17/09/2026**, sans le nouveau
fichier de Christelle (go de Timothée : « le lot 1b sans le sheet »).
Décisions : `feuille-de-route.md` § 3.B, D, E et § 7 (constats 6, 9, 10, 11).

## Objectif

- **1a — Sainte cène** : la colonne « Sainte cène » du Google Sheet
  `Franco_Louange` (index 11, après « Traducteur ») est un service à part
  entière : Ce dimanche, onglet Culte, Mes services, rappels. Visible seulement
  quand la case est remplie.
- **1b — Petit déj** : ligne dans Ce dimanche, Mes services, rappels ; pas
  d'onglet. La demande parlait d'un **nouveau Google Sheet à part** ; Timothée
  a tranché le 17/09/2026 : **« le lot 1b sans le sheet »** — on lit le bloc
  **« PETIT DÉJEUNER »** déjà présent dans l'onglet `Franco_Table_PtD`, sans
  attendre le fichier de Christelle.
- **1c — Rappels regroupés** : à J-7, J-3 et J-1, **une seule notification par
  personne**, qui liste ses services du jour avec le rôle, en français ou en
  中文 selon la langue de l'interface.

## Ce que le code montrait (14/09/2026)

- `fetchCulte` lisait les index 0–10 ; les lignes T4 portent des notes de
  travail dès l'index 12 (lire exactement 11).
- Le cron `/api/cron/reminders` envoyait le même texte « Tu sers demain (…) »
  à tous, plus une seconde notification « Répétition Campus » ; une entrée de
  cloche par fournée ; le serveur ne connaissait pas la langue (choisie dans
  le navigateur).

## Ce qui est construit

### 1a — Sainte cène
- `sheets.ts` : `fetchCulte` lit l'index 11 (jamais au-delà).
- `names.ts` : rôle affiché « Sainte cène » (`CULTE_ROLES`, donc Mes services,
  liste des noms) ; cible des rappels (`CULTE_NOTIFY_MAP`, sans rôle setlist :
  pas d'accès aux setlists par cette colonne).
- `planning/page.tsx` : ligne « Sainte cène » dans le Culte Franco de Ce
  dimanche, seulement si la case est remplie. La pastille « Sainte Cène » du
  premier dimanche du mois (onglet Culte) reste : c'est une autre information
  (constat 9).
- `planning/culte/page.tsx` : colonne « Sainte cène » ajoutée au tableau
  seulement si une case du trimestre affiché est remplie (avant le T4 2026 la
  feuille ne l'avait pas).
- Libellé `planning.roles.sainteCene` : « Sainte cène » / « 圣餐 ».

### 1b — Petit déj (17/09/2026)

- `sheets.ts` : `parsePetitDej(rows)` (pur) lit les **deux paires DATE / NOM**
  du bloc « PETIT DÉJEUNER » — index 17 et 18 pour janvier → juin, 19 et 20
  pour juillet → décembre — et `fetchPetitDej()` les prend dans l'onglet
  `Franco_Table_PtD`, **le même que la Prépa. Table** : le cache mémoire évite
  un second téléchargement. Les cases portent plusieurs personnes avec un
  « & » (« Charlie & Isabelle ») : elles ressortent séparées par des virgules,
  la seule ponctuation que `splitNames` découpe. Une case vide ne donne pas de
  ligne.
- `names.ts` : `petitDej` dans `PlanningData` (**sans données de secours** :
  il n'apparaît que s'il est lu, comme Intergroupe et Interfranco) ;
  service « Petit déj » dans `findMyServices` et présence simple dans
  `servantsForDate`, donc **cible des rappels** au même titre que la Prépa.
  Table.
- `reminderMessage.ts` : « 早餐 » en 中文 ; le rôle « Équipe » reste muet dans
  le rappel, comme pour la Prépa. Table.
- `planning/page.tsx` : bloc « Petit déj » dans Ce dimanche, **juste après la
  Prépa. Table et seulement si la case est remplie**.
- `serviceColors.ts` : « Petit déj » prend **l'orange de la Prépa. Table**
  (même famille) — aucune couleur nouvelle, la palette reste gelée.
- Libellé `planning.tabs.petitDej` : « Petit déj » / « 早餐 ».

### 1c — Rappels regroupés
- `src/lib/push/reminderMessage.ts` (pur) : `reminderServicesFor(planning,
  nom, date)` = services du jour d'une personne, rôles réunis, séances Campus
  exclues (règle conservée), répétition Campus incluse avec heure et lieu ;
  `reminderBody(date, échéance, services, langue)` et `reminderTitle(langue)`.
  - FR : « Dimanche 20 septembre (dans 3 jours) : Culte Franco (Piano, Sainte
    cène) · Prépa. Table » ; titre « Rappel de service ».
  - 中文 : « 9月20日星期日（3天后）：法语崇拜（钢琴、圣餐） · 圣餐预备 » ;
    titre « 服务提醒 ». Mêmes mots que les locales (planning.tabs, roles,
    groupes) ; les services et rôles inconnus restent en français.
  - Prépa. Table sans rôle (« Équipe » n'en est pas un) ; répétition Campus
    sans rôle (tout le monde vient : « Campus (répét.) à 17:00, Grande Salle »).
- **Langue mémorisée côté serveur** : `notifPrefs/{uid}.lang` (« fr » /
  « zh-CN »), écrite par la navbar **à la connexion et à chaque changement de
  langue** (une écriture par valeur et par compte, `saveNotifLang`). Absente =
  français. Les préférences par type sont désormais écrites avec un
  `updateMask` pour ne pas effacer la langue. Aucune règle Firestore à changer
  (chacun écrit son propre document).
- Cron : par échéance, noms de service (hors Campus) + noms en répétition →
  comptes → un message par compte (`loadNotifLangs` pour la langue), **une
  entrée de cloche par destinataire** (le corps est personnel). Clé
  `notifLog` inchangée `rappel-{J7|J3|J1}-{date}-{uid}` ; plus de clé `repet-`.

## Hypothèses

1. Langue écrite à la connexion *et* au changement (la décision disait « au
   changement ») : sinon un membre en 中文 depuis longtemps ne serait jamais
   connu du serveur. Coût : une écriture par chargement complet de page.
2. Pas de « Sainte cène » dans la pastille calculée ni dans les rôles de
   setlist : présence sans rôle exécutant, comme l'orateur.
3. La répétition Campus se fond dans le message du jour ; quelqu'un qui n'a
   que la répétition ce jour-là reçoit un message avec elle seule.

## Tests (Playwright, trois appareils)

- `tests/planning-sainte-cene.spec.ts` : Ce dimanche avec / sans case remplie
  (les notes de travail de l'index 12 ne s'affichent jamais), onglet Culte
  (colonne conditionnelle), Mes services (rôle), 中文 (« 圣餐 »).
- `tests/rappels-regroupes.spec.ts` : fonctions pures (services du jour,
  corps FR et 中文, répétition, séance Campus exclue) ; navbar → écriture de
  `notifPrefs/{uid}.lang` à la connexion puis au changement de langue.
- Le cron lui-même (Admin SDK) n'est pas testé par Playwright : sa boucle ne
  fait qu'assembler les fonctions pures testées.

## Commandes

```bash
npx tsc --noEmit
npm run lint
npm test -- tests/planning-sainte-cene.spec.ts tests/rappels-regroupes.spec.ts
```

## Limites

- Toujours : trois appareils ; aucune écriture en production.
- Demander avant : toucher aux échéances (J-7, J-3, J-1), à l'heure du cron,
  aux libellés de service.
- Jamais : un second cron (Vercel Hobby : `vercel-hobby-2-crons`).

## Critères de réussite

- Le 20/09/2026, Ce dimanche montre « Sainte cène : Ruth K. » ; le 13/09,
  rien ; Mes services de Ruth K. porte « Sainte cène ».
- Ruth K. (piano + Sainte cène + Prépa. Table le 20/09) reçoit **un** rappel :
  « Dimanche 20 septembre (dans 3 jours) : Culte Franco (Piano, Sainte cène) ·
  Prépa. Table », en 中文 si son interface l'est.

## Avancement

| Lot | État |
| --- | --- |
| 1a | Codé le 14/09/2026 ; 5 tests × 3 appareils verts ; captures regardées. **À valider en local par Timothée.** |
| 1b | Codé le 17/09/2026 **sans attendre le fichier de Christelle** (go de Timothée), lu dans le bloc « PETIT DÉJEUNER » de `Franco_Table_PtD` ; 7 tests × 3 appareils verts (`tests/planning-petit-dej.spec.ts`) ; captures regardées. **À valider en local.** Le jour où le fichier à part arrive, seul `parsePetitDej` change. |
| 1c | Codé le 14/09/2026 ; 4 tests × 3 appareils verts. **À valider en local** (le cron ne se vérifie qu'en ligne, à 08:00 UTC). |
