// Notes de mise à jour du site — édition MANUELLE.
//
// Pour ajouter une note : ajoute un objet en TÊTE du tableau CHANGELOG (le plus
// récent en premier). Chaque changement a une catégorie et un texte bilingue.
//   - "added"    : nouvelle fonctionnalité              (fr « Ajouté » / zh « 新增 »)
//   - "fixed"    : correction de bug                    (fr « Corrigé » / zh « 修复 »)
//   - "improved" : amélioration d'une chose existante   (fr « Amélioré » / zh « 改进 »)
// `date` au format AAAA-MM-JJ. `version` est optionnel (libre).

export type ChangeCategory = "added" | "fixed" | "improved";

export type ChangelogChange = {
  category: ChangeCategory;
  fr: string;
  zh: string;
};

export type ChangelogEntry = {
  date: string; // AAAA-MM-JJ
  version?: string;
  changes: ChangelogChange[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-07-13",
    changes: [
      {
        category: "fixed",
        fr: "La structure d'un chant n'affiche plus d'identifiant technique (ex. « chorus 5-3 ») dans la liste d'une setlist, mais le nom lisible de la section.",
        zh: "歌单曲目列表中不再显示技术标识（如「chorus 5-3」），改为显示可读的段落名称。",
      },
      {
        category: "fixed",
        fr: "Les transitions ne sont plus comptées comme des chants dans le nombre affiché sur les setlists.",
        zh: "过渡不再被计入歌单显示的诗歌数量。",
      },
      {
        category: "fixed",
        fr: "Le planning n'affiche plus par erreur une date de l'année suivante (ex. « janvier 2027 ») pour les dates sans année.",
        zh: "排班表不再把无年份的日期错误地显示为下一年（如「2027 年 1 月」）。",
      },
      {
        category: "added",
        fr: "Les transitions internes d'un chant apparaissent maintenant en gris dans la structure de la setlist.",
        zh: "诗歌内部的过渡现在会以灰色显示在歌单结构中。",
      },
      {
        category: "added",
        fr: "En vue partitions d'une setlist, un bouton permet d'afficher ou de masquer les pinyins (préférence mémorisée).",
        zh: "在歌单的歌谱视图中，可通过按钮显示或隐藏拼音（设置会被记住）。",
      },
      {
        category: "added",
        fr: "Cette page « Nouveautés », pour suivre les ajouts et corrections du site.",
        zh: "新增此「更新动态」页面，用于查看本站的新增与修复。",
      },
      {
        category: "improved",
        fr: "L'icône « Adapter le chant » (paroles et accords) est désormais distincte de celle pour modifier la setlist, pour éviter la confusion.",
        zh: "「调整诗歌」（歌词与和弦）的图标现在与编辑歌单的图标区分开，避免混淆。",
      },
      {
        category: "improved",
        fr: "Meilleur espacement entre les accords et les pinyins pour éviter qu'ils se chevauchent.",
        zh: "改进了和弦与拼音之间的间距，避免相互重叠。",
      },
    ],
  },
];
