/** Nuance d'une section : étiquettes prédéfinies (voir lib/setlist/nuances.ts)
 *  + texte libre optionnel en complément. */
export type SectionNuance = {
  tags: string[];
  note?: string;
};

export type FusionSong = {
  songSlug: string;
  keyOverride: string | null;
  structureOverride: string[] | null;
  sectionNotes: Record<string, string>;
  sectionNuances?: Record<string, SectionNuance>;
  /** Modulation (升调) par section : uid de section → tonalité cible. */
  sectionKeys?: Record<string, string>;
  /** Version adaptée de ce chant dans la fusion : ses sections « Dernière
   *  phrase » (docs/spec-fusions-dp.md) ; absent = le chant d'origine. */
  contentOverride?: string | null;
};

export type FusionMixedSection = {
  songSlug: string;
  sectionId: string;
  note?: string;
  transition?: string;
  nuance?: SectionNuance;
  /** Modulation (升调) : tonalité cible de cette occurrence de section. */
  keyChange?: string;
};

/** Retouches d'accords sur une partition 简谱 scannée (lot 9, docs/spec-harmonie.md). */
export type JianpuChords = {
  /** Index de l'étiquette dans `chords.json` → nouveau texte ; « » = effacé. */
  changed?: Record<number, string>;
  /** Accords ajoutés, en coordonnées du scan. */
  added?: { page: number; x: number; y: number; c: string }[];
};

export type SetlistItem = {
  type?: "fusion" | "transition" | "proposition";
  songSlug: string;
  position: number;
  keyOverride: string | null;
  showChords: boolean;
  showPinyin: boolean;
  useJianpu: boolean;
  /** Affiche la partition 简谱 (image du scan d'origine) au lieu des paroles.
   *  N'a d'effet que si le chant a une partition dans public/jianpu/.
   *  `structureOverride` continue de décrire la structure pour la liste de la
   *  setlist, mais ne modifie pas la partition : l'image est affichée entière. */
  jianpuSheet?: boolean;
  structureOverride: string[] | null;
  sectionNotes: Record<string, string>;
  sectionTransitions?: Record<string, string>;
  sectionNuances?: Record<string, SectionNuance>;
  /** Modulation (升调) par section : uid de section → tonalité cible.
   *  La section s'affiche transposée dans cette tonalité au lieu de la
   *  tonalité de l'item (keyOverride ou tonalité d'origine). */
  sectionKeys?: Record<string, string>;
  /** Source ChordPro modifié pour cette setlist (accords/paroles adaptés) —
   *  remplace le contenu du chant original ; null/absent = original. */
  contentOverride?: string | null;
  /** Sections matérialisées par le mode Adapter (copie d'une section répétée
   *  pour n'en modifier qu'une occurrence) : id de la copie → id de la section
   *  d'origine. Permet à « Rétablir l'original » de re-pointer la structure
   *  vers les sections du chant au lieu de les perdre. */
  sectionOrigins?: Record<string, string>;
  /** Accords retouchés sur le scan 简谱 par la présidence (mode Adapter, lot 9) :
   *  index d'étiquette de `public/jianpu/chords.json` → texte en tonalité
   *  d'origine (« » = effacé), plus les accords ajoutés en coordonnées du scan.
   *  `public/jianpu/chords.json` (calques certifiés) n'est jamais écrit. */
  jianpuChords?: JianpuChords;
  notes: string;
  fusionSongs?: FusionSong[];
  mixedStructure?: FusionMixedSection[] | null;
  transitionText?: string;
  /** Chant hors répertoire d'une setlist de fête (`type: "proposition"`, `songSlug: ""`) : `id` de
   *  `songProposals/{id}` ; devient le chant dès qu'un `.cho` porte `{proposition: <id>}`
   *  (docs/spec-chants-fetes.md, CF21). */
  proposition?: { id: string; titre: string };
};

export interface FSSetlist {
  id: string;
  title: string;
  leader: string;
  category: string;
  date: string;
  language: "fr" | "zh" | "mixed";
  notes: string;
  /** Séance Campus liée — distingue matin/soir d'un même jour pour le matching
   *  setlist↔service. Absent pour les setlists hors planning / autres catégories. */
  moment?: "matin" | "soir";
  createdAt: Date | null;
  updatedAt?: Date | null;
  items: SetlistItem[];
  isDraft?: boolean;
  isPrivate?: boolean;
  ownerId?: string | null;
  /** Lien de la présentation (PPT) de la régie — écrit par /api/setlist/presentation. */
  presentationUrl?: string;
  /** L'équipe de la setlist (docs/spec-partage-setlist.md) : uids qui la voient et la modifient,
   *  choisis par le propriétaire ou un admin. Absent = personne. */
  editeurs?: string[];
  /** Rôle de chaque personne de `editeurs`, pour l'affichage (absent = musicien). */
  rolesPartage?: Record<string, "musicien" | "chanteur">;
  /** Setlist d'un passage de fête (docs/spec-chants-fetes.md) : l'édition (`programmes/{id}`), le
   *  passage et son seul « Qui » à la dernière saisie. Écrit par le serveur seul ; absent = setlist
   *  ordinaire. */
  fete?: { programme: string; passage: string; qui: string };
  /** Corbeille (SC2, docs/spec-createur-corbeille-absences.md) : date-heure ISO de la mise à la corbeille
   *  et uid de qui l'a faite. Absents = setlist en place ; présents = elle n'apparaît que dans la corbeille
   *  et le cron la purge après 30 jours. */
  supprimeeLe?: string;
  supprimeePar?: string;
}
