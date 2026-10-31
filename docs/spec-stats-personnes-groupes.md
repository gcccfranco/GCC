# Spec : statistiques par personne (présidences) et par groupe (lot SP)

Spec écrite le 31/10/2026 après la planche
https://claude.ai/artifact/LKps7YqsFPqSjDmpj21p1b (`docs/planches/planche-stats-personnes-groupes.html`).
Timothée a validé toutes les recommandations (Q1 à Q5) le 31/10/2026 (« ok go »).
**Pas encore de go pour le code** : un go explicite après cette spec (« go pour le lot SP »).
Suite du lot ST (`spec-jianpu-entete-statistiques.md`) ; ses décisions D4, D5, D7 valent ici.

## Mots de Timothée (31/10/2026)

> « Il faudrait aussi ajouter des stats par personnes que la personne concernée peut voir, et que les admins
> peuvent voir. Et aussi des stats par groupes. »
>
> « J'aimerais que ce ne soit pas dans une nouvelle page du site. La stat pour les groupes peut-être que c'est
> mieux que ce soit juste les admins qui voient. »

## Décisions (31/10/2026), à ne pas rouvrir

| # | Décision |
| --- | --- |
| P1 | Les stats d'une personne = **ses présidences** (le champ `leader` des setlists). Ni planning, ni setlists créées. |
| P2 | Les stats d'une personne ne sont visibles que de **la personne et des admins**. Filtre côté site, comme `canSeeSetlist` : la base reste lisible par un membre connecté (choix assumé du CLAUDE.md). |
| P3 | **Aucune nouvelle page.** Personne : une carte dans **Moi** ; vue admin : le filtre **Présidence** de la page Statistiques (`/songs/statistiques`). Groupe : un résumé dans la page Statistiques quand un **service** est choisi. |
| P4 | Groupe : les **chants** (chiffres de la rangée) pour **tout connecté** ; les **présidences** du groupe pour les **admins** seulement. |
| P5 (Q1) | « Mes présidences » = **carte résumée**, détail en **feuille** (téléphone, tablette portrait) ou **panneau ancré** (≥ tablette paysage), comme les statistiques d'un chant (ST4). |
| P6 (Q2) | Une présidence est à moi si `normalizeName(leader)` = `normalizeName(planningName)`, sinon = `normalizeName(prénom + " " + nom)`. La carte dit sous quel nom les présidences sont comptées. |
| P7 (Q3) | Admins, groupe choisi : « N membres n'ont pas présidé sur la période », membres = profils dont `serviceRoles[service]` est non vide. Sans groupe choisi : pas de liste des « jamais ». |
| P8 (Q4) | Chants jamais choisis : **le nombre** seul, avec un lien vers la vue « Jamais joués » (filtrée sur la présidence pour un admin ; sans filtre pour la personne, le filtre présidence restant aux admins). |
| P9 (Q5) | Résumé de groupe : **une rangée en tête** de la page Statistiques (piste A), pas d'onglet « Groupes ». |

## Ce que le code montre (31/10/2026)

- `leader` : texte libre de chaque setlist ; `choixDesFiltres` (`src/lib/stats/chantsJoues.ts`) regroupe déjà
  les graphies par `normalizeName` (`src/lib/planning/names.ts`) et garde la plus fréquente.
- Filtre présidence de la page Statistiques : `canFiltrerPresidence` (admins, lot ST), état `presidence` dans
  l'adresse (`?presidence=…`), `StatistiquesClient.tsx`.
- Profil (`src/types/user.ts`) : `firstName`, `lastName`, `planningName`, `serviceRoles` (rôles par
  catégorie de setlist). `listProfiles()` (`src/lib/firebase/users.ts`) lit tous les profils.
- Moi : `src/app/moi/page.tsx` (section « Mes services », `SectionMesServices`).
- Lecture partagée des setlists : `setlistsPourStats()` (5 min). Statistiques d'un chant (feuille / panneau) :
  `src/components/songs/StatistiquesDuChant.tsx`, à suivre pour le détail.
- **Aucune règle Firestore à changer** : setlists et profils sont déjà lisibles par un connecté.

---

## SP1 · Calcul (pur, `src/lib/stats/chantsJoues.ts`)

```ts
export type StatsPresidence = {
  total: number;                                          // setlists comptées (D4) dans la période
  derniere: { jour: string; service: string } | null;
  parService: { service: string; fois: number; derniere: string }[]; // fois ↓, puis la plus récente
  chants: { slug: string; fois: number }[];                // les plus choisis : fois ↓, puis dernière ↓, puis titre
  jamaisChoisis: number;                                   // chants du recueil absents de ses setlists comptées
  prochaine: { jour: string; service: string; setlistId: string } | null; // publiée, ≥ aujourd'hui
};
export function statsPresidence(setlists, index, nom: string, periode: Periode, aujourdhui: string): StatsPresidence;

export type LignePresidence = { nom: string; fois: number; derniere: string; services: string[] };
export function presidences(setlists, periode: Periode, aujourdhui: string, service: string | null): LignePresidence[];

export type StatsGroupe = {
  setlists: number; parMois: number;          // setlists / mois entre la première et la dernière comptées (1 décimale)
  chantsDifferents: number; partZh: number;   // part des passages de chants 中文, 0 à 1
  tonalites: string[];                        // la plus jouée (règle Q5)
};
export function statsGroupe(setlists, index, service: string, periode: Periode, aujourdhui: string): StatsGroupe;

export function nomDePresidence(profil: Pick<UserProfile, "planningName" | "firstName" | "lastName">): string; // P6
```

- Même marche que l'existant : publiées passées (Q3), fusions dépliées, transitions ignorées, un chant une fois
  par setlist ; la présidence se compare par `normalizeName`. `nom` est affiché sous la graphie la plus
  fréquente (comme `choixDesFiltres`).
- `parMois` : `setlists / max(1, mois entre première et dernière setlist comptées)` ; une seule setlist → 1,0.

## SP2 · « Mes présidences » dans Moi

- Carte sous « Mes services », **seulement** si l'utilisateur est connecté, a au moins **une** présidence
  comptée (depuis le début) ou une **prochaine** ; sinon rien (pas d'état vide).
- Carte : titre « Mes présidences » + « visible par toi et les admins » ; trois chiffres (présidences, dernière,
  groupes) ; une ligne « Surtout à Fidélité (7) · prochaine le 09/11 › » (service court, `serviceCourt`). La
  toucher ouvre le détail.
- Détail (feuille / panneau, comme ST4) : pastilles de période (3 mois · 12 mois · Depuis le début, défaut
  Depuis le début) ; tableau « Groupe · Fois · Dernière » (barre décorative) ; « Mes chants les plus choisis »
  (5 au plus, lien vers chaque chant) ; « Jamais choisis : N chants » avec lien vers
  `/songs/statistiques?vue=jamais-joues` ; la prochaine ; note « Présidences comptées sous le nom « … » ;
  setlists publiées et passées ».
- 中文 traduit. Rien dans le mode Louange ni le PDF.

## SP3 · Une personne, vue par un admin (page Statistiques)

- Présidence choisie (`?presidence=…`) : un bloc « Présidences de {nom} » au-dessus des vues, mêmes trois
  chiffres et « Fidélité 7 · Paix 2 » ; il suit la période et le service choisis. Le reste de la page
  (chants filtrés) est inchangé.
- Aucune présidence choisie : une carte « Présidences » (admins) au-dessus des vues : tableau « Qui · Fois ·
  Dernière · Groupes », trié fois ↓ puis dernière ↓ ; toucher une ligne choisit cette présidence (filtre).
  Dix lignes, puis « Tout afficher ».
- Non-admin : aucun de ces blocs (ni le paramètre d'adresse, déjà ignoré depuis ST3).

## SP4 · Un groupe (page Statistiques, service choisi)

- Tout connecté : une rangée en tête, sous les filtres : **setlists**, **par mois**, **chants différents** ;
  dessous « FR 58 % · 中文 42 % · tonalité la plus jouée : G ». Elle suit la période et la langue.
- Admins, en plus : la carte « Présidences à {service} » (SP3, filtrée sur le service) et, en bas,
  « {N} membres du groupe n'ont pas présidé sur la période ›» (P7) qui déplie les noms (prénom nom).
  Lecture des profils (`listProfiles`) seulement dans ce cas (admin + service choisi), une fois par visite.
- Service « Tous » : pas de rangée.

## SP5 · Libellés, droits, tests

- Droits : `canVoirStatsPersonne(user, uidCible) = uid === uidCible || isAdminUser(user)` dans `access.ts`
  (P2, client seulement ; aucune règle Firestore) ; `canFiltrerPresidence` pour SP3/SP4 admins.
- FR et 中文 (`fr.json`, `zh-CN.json`).
- Données simulées (`tests/helpers/fakeSession.ts`), **noms fictifs inventés**.

## Tranches et ordre

| Tranche | Contenu | Vérification |
| --- | --- | --- |
| **SP-A** | SP1 + droit `canVoirStatsPersonne` | tests unitaires (horloge fixe) : graphies regroupées, nom par planningName puis prénom nom, parService, chants, jamaisChoisis, prochaine, presidences triées, statsGroupe (parMois, partZh) |
| **SP-B** | SP2 (Moi) | Playwright 3 appareils + `SPECS_GRAND_ECRAN` (feuille / panneau) : carte et détail ; rien sans présidence ; 中文 ; captures 4 dispositions + 1 440 px |
| **SP-C** | SP3 + SP4 (page Statistiques) | Playwright 3 appareils : membre voit la rangée du groupe sans présidences ; admin voit « Présidences », choisit une ligne, voit « N membres n'ont pas présidé » ; captures 4 dispositions + 1 440 px |

Un commit par tranche, message en français. Aucune règle Firestore : le dire dans le compte rendu.

**Réussite** : Luc (fictif) ouvre Moi et lit « Mes présidences : 9 · 19/10 · 2 groupes, surtout à Fidélité »,
le détail par groupe et ses chants les plus choisis ; un autre membre ne voit rien de Luc nulle part ; un admin
choisit « Groupe Fidélité » dans Statistiques, voit la rangée du groupe, qui préside, et qui n'a pas présidé.

## Hors périmètre

Services au planning par personne ; setlists créées ; comparaison des groupes côte à côte ; export ; durcir les
règles Firestore pour les profils.
