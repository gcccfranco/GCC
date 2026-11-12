// Registre des clés de comptage d'usage (docs/spec-comptage-usage.md). Fichier pur : aucun import
// (importable depuis un test Node). Une clé `ecran.<route>` par page de src/app/**/page.tsx : la route
// garde ses segments dynamiques tels quels (`[slug]`, `[...fiche]`), les groupes `(x)` sont retirés,
// l'accueil est `ecran.accueil`. Un test (tests/usage.spec.ts) refuse une page sans clé.
export const CLES_USAGE: Record<string, string> = {
  _actif: "Site ouvert (jours-appareils actifs)",
  "cmd.general.pwa": "Site installé (PWA) au lancement",
  "cmd.chants.recherche": "Chants : recherche aboutie (un résultat ouvert)",
  "cmd.chants.basculeZh": "Chants : bascule 中文 de la liste",
  "cmd.chants.statsDuChant": "Chants : statistiques d'un chant",
  "cmd.chants.proposer": "Chants : proposer un chant (envoi)",
  "cmd.chant.transposer": "Chant : transposer (± ou tonalité choisie)",
  "cmd.chant.toniqueOrigine": "Chant : revenir à la tonalité d'origine",
  "cmd.chant.capo": "Chant : capo",
  "cmd.chant.disposition": "Chant : choix de disposition",
  "cmd.chant.jianpu": "Chant : partition 简谱 (scan affiché)",
  "cmd.chant.copierParoles": "Chant : copier les paroles",
  "cmd.chant.pdf": "Chant : export PDF (par mise en page choisie)",
  "cmd.chant.accord": "Chant : toucher un accord (panneau d'accord)",
  "cmd.chant.maVersion": "Chant : ma version, enregistrer",
  "cmd.chant.retablir": "Chant : ma version, rétablir l'original",
  "cmd.chant.adapter": "Chant : adapter",
  "cmd.chant.transitions": "Chant : ligne instrumentale, transitions",
  "cmd.chant.annoter": "Chant : annoter (trait enregistré)",
  "cmd.chant.jeJoue": "Chant : « Je joue » (rôle choisi)",
  "cmd.louange.ouvrir": "Mode louange : ouvrir",
  "cmd.louange.pleinEcran": "Mode louange : plein écran",
  "cmd.louange.affichage.unique": "Mode louange : affichage « section unique »",
  "cmd.louange.affichage.played": "Mode louange : affichage « ordre joué »",
  "cmd.louange.affichage.structure": "Mode louange : affichage « structure seule »",
  "cmd.louange.chantSuivant": "Mode louange : chant suivant / précédent",
  "cmd.louange.metronome": "Mode louange : métronome visuel",
  "cmd.louange.tempo": "Mode louange : tempo ± / effacer",
  "cmd.louange.cercle": "Mode louange : cercle chromatique",
  "cmd.louange.feuilleDeRoute": "Mode louange : feuille de route",
  "cmd.louange.reperes": "Mode louange : repères, curseur de page",
  "cmd.louange.demiPage": "Mode louange : demi-page",
  "cmd.louange.themeScene": "Mode louange : thème de scène",
  "cmd.setlist.creer": "Setlists : créer une setlist",
  "cmd.setlist.ajouterChant": "Setlists : éditeur, ajouter un chant (bibliothèque)",
  "cmd.setlist.modifierLigne": "Setlists : éditeur, modifier une ligne",
  "cmd.setlist.vue.liste": "Setlists : vue Liste",
  "cmd.setlist.vue.partitions": "Setlists : vue Partitions",
  "cmd.setlist.sommaire": "Setlists : sommaire",
  "cmd.setlist.idees": "Setlists : idées du chant",
  "cmd.setlist.historique": "Setlists : historique / versions",
  "cmd.setlist.partager": "Setlists : partager",
  "cmd.setlist.presentation": "Setlists : présentation (FreeShow)",
  "cmd.setlist.notifier": "Setlists : notifier l'équipe",
  "cmd.setlist.corbeille.mettre": "Setlists : corbeille, mettre",
  "cmd.setlist.corbeille.restaurer": "Setlists : corbeille, restaurer",
  "cmd.setlist.corbeille.supprimer": "Setlists : corbeille, supprimer pour de bon",
  // T3 : planning, harmonie, compte, évènements, messages, général.
  "cmd.accueil.pourMoi": "Accueil : ouvrir un élément de « Pour moi »",
  "cmd.planning.choisirNom": "Planning : choisir un nom dans une case",
  "cmd.planning.prevenir": "Planning : prévenir d'un changement (envoi)",
  "cmd.planning.petitDej": "Planning : petit-déj, s'inscrire",
  "cmd.planning.annee": "Planning : changer d'année",
  "cmd.planning.grille.copie": "Planning : grille, copier le dimanche précédent",
  "cmd.planning.grille.historique": "Planning : grille, historique",
  "cmd.planning.grille.ajouterDate": "Planning : grille, ajouter une date",
  "cmd.planning.export": "Planning : exporter le modèle",
  "cmd.planning.publier": "Planning : publier",
  "cmd.harmonie.filtre": "Harmonie : filtrer le catalogue",
  "cmd.harmonie.suggestion": "Harmonie : suggestion écartée ou remise",
  "cmd.harmonie.idee.ajouter": "Harmonie : idée, ajouter",
  "cmd.harmonie.idee.modifier": "Harmonie : idée, modifier",
  "cmd.harmonie.idee.supprimer": "Harmonie : idée, supprimer",
  "cmd.harmonie.chapitre": "Harmonie : cours, cocher un chapitre",
  "cmd.compte.absence.ajouter": "Compte : absence, ajouter",
  "cmd.compte.absence.supprimer": "Compte : absence, supprimer",
  "cmd.compte.notifPrefs": "Compte : réglage de notification",
  "cmd.compte.push": "Compte : activer les notifications push",
  "cmd.compte.onboarding": "Compte : revoir la visite guidée",
  "cmd.evenement.creer": "Évènements : créer",
  "cmd.evenement.modifier": "Évènements : modifier",
  "cmd.evenement.inscrire": "Évènements : s'inscrire",
  "cmd.evenement.compteRendu": "Évènements : compte rendu, ajouter",
  "cmd.cloche.ouvrir": "Notifications : ouvrir la cloche",
  "cmd.notifier.envoyer": "Notifier : envoyer",
  "cmd.questionnaire.envoyer": "Questionnaire : envoyer",
  "cmd.chant.signaler": "Chant : signaler un problème (envoi)",
  "cmd.general.langue": "Général : langue FR / 中文",
  "cmd.general.theme": "Général : thème clair / sombre",
  "cmd.general.rafraichir": "Général : tirer pour rafraîchir",
  "cmd.louange.couleurAccords": "Couleur des accords (réglage)",
  "ecran.accueil": "Accueil",
  "ecran.accords": "Dictionnaire d'accords",
  "ecran.admin": "Administration",
  "ecran.annonces": "Annonces",
  "ecran.back-office": "Back-Office (accueil)",
  "ecran.back-office/calendrier": "Back-Office : calendrier",
  "ecran.back-office/equipes": "Back-Office : équipes",
  "ecran.back-office/equipes/[id]": "Back-Office : une équipe",
  "ecran.back-office/equipes/personnes": "Back-Office : personnes",
  "ecran.back-office/equipes/personnes/sans-compte": "Back-Office : personnes sans compte",
  "ecran.back-office/equipes/responsabilites": "Back-Office : responsabilités",
  "ecran.back-office/evenements": "Back-Office : évènements",
  "ecran.back-office/evenements/[id]": "Back-Office : fiche d'évènement",
  "ecran.back-office/evenements/[id]/modifier": "Back-Office : modifier un évènement",
  "ecran.back-office/evenements/nouveau": "Back-Office : nouvel évènement",
  "ecran.back-office/evenements/reunions": "Back-Office : réunions (évènements)",
  "ecran.back-office/evenements/scene": "Back-Office : scène",
  "ecran.back-office/evenements/scene/[fete]": "Back-Office : scène d'une fête",
  "ecran.back-office/messages": "Back-Office : messages",
  "ecran.back-office/messages/notifier": "Back-Office : notifier",
  "ecran.back-office/messages/questionnaire": "Back-Office : questionnaire",
  "ecran.back-office/planning": "Back-Office : planning",
  "ecran.back-office/planning/[cle]": "Back-Office : une grille de planning",
  "ecran.back-office/planning/sans-compte": "Back-Office : planning sans compte",
  "ecran.back-office/plus": "Back-Office : Plus",
  "ecran.back-office/reunions": "Back-Office : réunions",
  "ecran.back-office/reunions/[id]": "Back-Office : une réunion",
  "ecran.back-office/reunions/[id]/modifier": "Back-Office : modifier une réunion",
  "ecran.back-office/reunions/nouvelle": "Back-Office : nouvelle réunion",
  "ecran.back-office/taches": "Back-Office : tâches",
  "ecran.back-office/taches/[equipe]": "Back-Office : tâches d'une équipe",
  "ecran.back-office/taches/[equipe]/[id]": "Back-Office : une tâche",
  "ecran.back-office/taches/[equipe]/nouvelle": "Back-Office : nouvelle tâche",
  "ecran.equipes": "Équipes",
  "ecran.equipes/[id]": "Fiche d'une équipe",
  "ecran.evenements": "Évènements",
  "ecran.evenements/[id]": "Fiche d'un évènement",
  "ecran.evenements/[id]/modifier": "Modifier un évènement",
  "ecran.evenements/nouveau": "Nouvel évènement",
  "ecran.evenements/scene": "Scène (évènements)",
  "ecran.evenements/scene/[fete]": "Scène d'une fête",
  "ecran.guide": "Guide",
  "ecran.harmonie": "Harmonie (catalogue)",
  "ecran.harmonie/[...fiche]": "Fiche d'harmonie",
  "ecran.harmonie/cours": "Cours d'harmonie",
  "ecran.harmonie/cours/[id]": "Un cours d'harmonie",
  "ecran.harmonie/rd2000": "Harmonie RD2000",
  "ecran.harmonie/rd2000/[n]": "Fiche RD2000",
  "ecran.login": "Connexion",
  "ecran.mes-services": "Mes services",
  "ecran.mes-services/[date]": "Un service",
  "ecran.moi": "Moi",
  "ecran.notifier": "Notifier",
  "ecran.planning": "Planning (accueil)",
  "ecran.planning/campus": "Planning Campus",
  "ecran.planning/culte": "Planning du culte",
  "ecran.planning/edd": "Planning EDD",
  "ecran.planning/groupes": "Planning des groupes",
  "ecran.planning/interfranco": "Planning interfranco",
  "ecran.planning/intergroupe": "Planning intergroupe",
  "ecran.planning/table": "Planning de la Table",
  "ecran.profil": "Profil",
  "ecran.questionnaire": "Questionnaire",
  "ecran.setlists": "Setlists",
  "ecran.setlists/[id]": "Une setlist",
  "ecran.setlists/[id]/edit": "Éditer une setlist",
  "ecran.setlists/new": "Nouvelle setlist",
  "ecran.signup": "Inscription",
  "ecran.songs": "Chants (liste)",
  "ecran.songs/[slug]": "Page d'un chant",
  "ecran.songs/statistiques": "Statistiques des chants",
  "ecran.taches": "Tâches",
  "ecran.taches/[equipe]": "Tâches d'une équipe",
  "ecran.taches/[equipe]/[id]": "Une tâche",
};

export type CleUsage = keyof typeof CLES_USAGE;

const DYN = /^\[(\.\.\.)?[^\]]+\]$/;

type Motif = { cle: string; re: RegExp; score: number };

/** Motifs d'écrans, les plus précis (le plus de segments fixes, catch-all en dernier) d'abord. */
const MOTIFS: Motif[] = Object.keys(CLES_USAGE)
  .filter((c) => c.startsWith("ecran.") && c !== "ecran.accueil")
  .map((cle) => {
    const segs = cle.slice("ecran.".length).split("/");
    let score = 0;
    const re = segs
      .map((s) => {
        if (!DYN.test(s)) { score += 10; return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
        if (s.startsWith("[...")) return "(?:[^/]+)(?:/[^/]+)*";
        score += 1;
        return "[^/]+";
      })
      .join("/");
    return { cle, re: new RegExp(`^${re}$`), score };
  })
  .sort((a, b) => b.score - a.score);

/** Clé `ecran.…` d'un chemin réel, sans jamais garder de slug ni d'identifiant ; inconnu → null. */
export function normaliserRoute(pathname: string | null | undefined): string | null {
  if (!pathname) return null;
  const p = pathname.replace(/^\/+|\/+$/g, "");
  if (p === "") return "ecran.accueil";
  return MOTIFS.find((m) => m.re.test(p))?.cle ?? null;
}
