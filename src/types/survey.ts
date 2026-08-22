// Questionnaire de satisfaction du site (page /questionnaire, dépouillement dans
// /admin). Seule la structure vit ici : les libellés sont dans les fichiers de
// langue sous `survey.s.<section>` et `survey.q.<id>` (label, opt.<option>,
// placeholder, low/high), pour que la page de saisie et la vue admin restent
// génériques et bilingues.
//
// Le questionnaire est long : il est découpé en sections regroupées en quelques
// étapes (`SURVEY_STEPS`) et les sections/questions hors sujet sont masquées via
// `dependsOn` — quelqu'un qui ne crée jamais de setlist ne voit pas les questions
// de création.

export type SurveyQuestionType = "rating" | "choice" | "multi" | "text";

/** Affiché seulement si la réponse à `question` vaut (ou contient) l'une de `anyOf`. */
export interface SurveyCondition {
  question: string;
  anyOf: string[];
}

export interface SurveySection {
  id: string;
  dependsOn?: SurveyCondition;
}

/** Une étape du formulaire = plusieurs sections, pour limiter le nombre de clics. */
export interface SurveyStep {
  id: string;
  sections: string[];
}

export interface SurveyQuestion {
  id: string;
  section: string;
  type: SurveyQuestionType;
  /** choice / multi : identifiants d'options (libellés via survey.q.<id>.opt.<option>) */
  options?: string[];
  required?: boolean;
  dependsOn?: SurveyCondition;
}

/** Échelle des questions « rating » (1 → RATING_MAX). */
export const RATING_MAX = 5;

export const SURVEY_SECTIONS: SurveySection[] = [
  { id: "usage" },
  { id: "general" },
  { id: "songs", dependsOn: { question: "used", anyOf: ["songs"] } },
  { id: "setlists", dependsOn: { question: "used", anyOf: ["setlists"] } },
  { id: "performance", dependsOn: { question: "used", anyOf: ["performance"] } },
  { id: "planning", dependsOn: { question: "used", anyOf: ["planning", "mesServices"] } },
  { id: "annonces", dependsOn: { question: "used", anyOf: ["annonces", "notifications"] } },
  { id: "misc" },
  { id: "improve" },
];

/** Regroupement des sections en étapes (titres : `survey.steps.<id>`). */
export const SURVEY_STEPS: SurveyStep[] = [
  { id: "you", sections: ["usage", "general"] },
  { id: "features", sections: ["songs", "setlists", "performance"] },
  { id: "infos", sections: ["planning", "annonces", "misc"] },
  { id: "improve", sections: ["improve"] },
];

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  // ── Toi et ton usage ──
  {
    id: "frequency",
    section: "usage",
    type: "choice",
    options: ["daily", "weekly", "sometimes", "rarely", "first"],
    required: true,
  },
  {
    id: "device",
    section: "usage",
    type: "multi",
    options: ["phone", "tablet", "computer", "paper"],
    required: true,
  },
  {
    id: "context",
    section: "usage",
    type: "multi",
    options: ["prepare", "rehearsal", "service", "learn", "planning"],
  },
  {
    id: "used",
    section: "usage",
    type: "multi",
    options: [
      "songs",
      "setlists",
      "performance",
      "planning",
      "mesServices",
      "annonces",
      "notifications",
      "guide",
    ],
    required: true,
  },
  {
    id: "language",
    section: "usage",
    type: "choice",
    options: ["fr", "zh", "both"],
    required: true,
  },

  // ── Impression générale ──
  { id: "overall", section: "general", type: "rating", required: true },
  { id: "ease", section: "general", type: "rating", required: true },
  { id: "speed", section: "general", type: "rating" },
  { id: "readability", section: "general", type: "rating" },
  {
    id: "reliability",
    section: "general",
    type: "choice",
    options: ["never", "rare", "often", "always"],
  },
  {
    id: "mobile",
    section: "general",
    type: "choice",
    options: ["great", "ok", "problems", "notUsed"],
    required: true,
  },
  {
    id: "beforeAfter",
    section: "general",
    type: "choice",
    options: ["better", "same", "worse", "dontKnow"],
  },
  {
    id: "recommend",
    section: "general",
    type: "choice",
    options: ["yes", "maybe", "no"],
    required: true,
  },

  // ── Les chants ──
  { id: "songsSearch", section: "songs", type: "rating" },
  { id: "songsDisplay", section: "songs", type: "rating" },
  {
    id: "songsFeatures",
    section: "songs",
    type: "multi",
    options: [
      "transpose",
      "capo",
      "hideChords",
      "pinyin",
      "jianpu",
      "pdf",
      "video",
      "customize",
    ],
  },
  {
    id: "jianpu",
    section: "songs",
    type: "choice",
    options: ["essential", "useful", "notUsed", "dontKnow"],
  },
  {
    id: "songsErrors",
    section: "songs",
    type: "choice",
    options: ["never", "sometimes", "often"],
  },
  {
    id: "songsErrorsDetail",
    section: "songs",
    type: "text",
    dependsOn: { question: "songsErrors", anyOf: ["sometimes", "often"] },
  },
  { id: "songsMissing", section: "songs", type: "text" },

  // ── Les setlists ──
  {
    id: "setlistsRole",
    section: "setlists",
    type: "choice",
    options: ["read", "create", "both"],
  },
  { id: "setlistsFind", section: "setlists", type: "rating" },
  {
    id: "setlistsCreate",
    section: "setlists",
    type: "rating",
    dependsOn: { question: "setlistsRole", anyOf: ["create", "both"] },
  },
  {
    id: "setlistsFeatures",
    section: "setlists",
    type: "multi",
    options: ["adapt", "duplicate", "pdf", "share", "draft", "notify", "private"],
  },
  { id: "setlistsIssues", section: "setlists", type: "text" },

  // ── Mode Louange ──
  {
    id: "performanceWhen",
    section: "performance",
    type: "multi",
    options: ["rehearsal", "service", "personal"],
  },
  { id: "performanceRating", section: "performance", type: "rating" },
  {
    id: "performanceFeatures",
    section: "performance",
    type: "multi",
    options: [
      "annotations",
      "capo",
      "textSize",
      "dark",
      "hideLyrics",
      "roles",
      "pinyin",
      "chartStyle",
    ],
  },
  { id: "performanceIssues", section: "performance", type: "text" },

  // ── Planning & Mes services ──
  { id: "planningRating", section: "planning", type: "rating" },
  {
    id: "planningTrust",
    section: "planning",
    type: "choice",
    options: ["always", "mostly", "outdated", "dontKnow"],
  },
  { id: "mesServicesRating", section: "planning", type: "rating" },
  { id: "planningIssues", section: "planning", type: "text" },

  // ── Annonces & notifications ──
  { id: "annoncesRating", section: "annonces", type: "rating" },
  {
    id: "notifVolume",
    section: "annonces",
    type: "choice",
    options: ["tooMany", "right", "tooFew", "none"],
  },
  {
    id: "notifTypes",
    section: "annonces",
    type: "multi",
    options: ["setlist", "annonce", "reminder", "manual"],
  },
  { id: "notifIssues", section: "annonces", type: "text" },

  // ── Prise en main ──
  {
    id: "onboarding",
    section: "misc",
    type: "choice",
    options: ["easy", "ok", "hard"],
    required: true,
  },
  {
    id: "accountEase",
    section: "misc",
    type: "choice",
    options: ["easy", "ok", "hard"],
  },
  {
    id: "guideUseful",
    section: "misc",
    type: "choice",
    options: ["yes", "partly", "notRead", "notFound"],
  },
  {
    id: "help",
    section: "misc",
    type: "choice",
    options: ["ask", "guide", "report", "giveUp"],
  },
  {
    id: "translationQuality",
    section: "misc",
    type: "rating",
    dependsOn: { question: "language", anyOf: ["zh", "both"] },
  },

  // ── Ce qu'il faut améliorer ──
  { id: "liked", section: "improve", type: "text" },
  { id: "problems", section: "improve", type: "text" },
  {
    id: "wanted",
    section: "improve",
    type: "multi",
    options: [
      "jianpu",
      "audio",
      "metronome",
      "tuner",
      "history",
      "notes",
      "translations",
      "moreSongs",
      "offline",
      "print",
    ],
  },
  { id: "priority", section: "improve", type: "text", required: true },
  { id: "ideas", section: "improve", type: "text" },
];

/** number pour `rating`, string pour `choice`/`text`, string[] pour `multi`. */
export type SurveyAnswer = number | string | string[];

export type SurveyAnswers = Record<string, SurveyAnswer>;

/** Une condition est remplie si la réponse vaut (choice) ou contient (multi) une valeur attendue. */
export function conditionMet(cond: SurveyCondition | undefined, answers: SurveyAnswers): boolean {
  if (!cond) return true;
  const value = answers[cond.question];
  if (Array.isArray(value)) return cond.anyOf.some((v) => value.includes(v));
  return typeof value === "string" && cond.anyOf.includes(value);
}

/** Questions réellement posées à quelqu'un, compte tenu de ses réponses. */
export function visibleQuestions(section: string, answers: SurveyAnswers): SurveyQuestion[] {
  return SURVEY_QUESTIONS.filter(
    (q) => q.section === section && conditionMet(q.dependsOn, answers)
  );
}

/** Sections à parcourir, compte tenu des réponses (les hors-sujet sautent). */
export function visibleSections(answers: SurveyAnswers): SurveySection[] {
  return SURVEY_SECTIONS.filter(
    (s) => conditionMet(s.dependsOn, answers) && visibleQuestions(s.id, answers).length > 0
  );
}

/** Étapes à parcourir, avec pour chacune ses sections encore pertinentes. */
export function visibleSteps(
  answers: SurveyAnswers
): { id: string; sections: SurveySection[] }[] {
  const visible = visibleSections(answers);
  return SURVEY_STEPS.map((step) => ({
    id: step.id,
    sections: visible.filter((s) => step.sections.includes(s.id)),
  })).filter((step) => step.sections.length > 0);
}

export interface SurveyResponse {
  /** uid de l'auteur — sert aussi d'id de document : une réponse par personne, modifiable */
  uid: string;
  /** Nom + prénom (affiché aux admins), email en repli */
  authorName: string;
  authorEmail: string;
  answers: SurveyAnswers;
  /** false tant que la personne n'est pas allée au bout (enregistrement automatique à chaque étape) */
  submitted: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}
