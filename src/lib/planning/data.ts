import type { EddDataStructure, CampusSeance } from "./utils"

export const CULTE_FALLBACK: string[][] = [
  ['2026-01-04','Viviane','Oriane','Olivier','Eva','Éloïse','Yiyi','Lorenzo','Anyi','Daniel SHAN',''],
  ['2026-01-11','Jonathan','Daniela','Alice','Eva','Éloïse','Yiyi','Denis','Karémy','Belka',''],
  ['2026-01-18','Paul','Christelle Z.','Inès','Timothée','Christelle C.','Stéphane','Anyi','Lorenzo','Hewei',''],
  ['2026-01-25','Wendy','Daniela','David C.','Timothée','Christelle C.','Stéphane','Karémy','Karémy','Delphine ZHOU',''],
  ['2026-02-01','Jonathan','Daniela','Alice','Esther','Éloïse','Chloé','Lorenzo','Anyi','Pasteur ZHOU','Eva'],
  ['2026-02-08','Viviane','Oriane','Olivier','Esther','Éloïse','Chloé','Denis','Karémy','Belka',''],
  ['2026-02-15','Jonathan','Ketty','David C.','Eva','Christelle C.','Yiyi','Karémy','Anyi','Delphine ZHOU',''],
  ['2026-02-22','Paul','Christelle Z.','Viviane','Eva','Christelle C.','Yiyi','Lorenzo','Denis','Pasteur ZHOU','Karémy'],
  ['2026-03-01','Viviane','Oriane','Olivier','Timothée','Éloïse','Stéphane','Karémy','Anyi','Keai CHEN','Eva'],
  ['2026-03-08','Jonathan','Daniela','David C.','Timothée','Éloïse','Stéphane','Denis','Lorenzo','Belka',''],
  ['2026-03-15','Paul','Christelle Z.','Inès','Esther','Christelle C.','Chloé','Anyi','Karémy','Chunwei HUANG','Eva'],
  ['2026-03-22','Viviane','Ketty','Daniela','Esther','Christelle C.','Chloé','Lorenzo','Denis','Andreas BODE',''],
  ['2026-03-29','Jonathan','Alice','Olivier','Eva','Éloïse','Yiyi','Karémy','Anyi','Daniel SHAN',''],
  ['2026-04-05','Paul','Christelle Z.','David C.','Timothée','Christelle C.','Stéphane','Anyi','Denis','Pasteur ZHOU','Eva'],
  ['2026-04-12','Viviane','Oriane','Olivier','Timothée','Christelle C.','Stéphane','Karémy','Lorenzo','John Ong',''],
  ['2026-04-19','Jonathan','Daniela','Alice','Esther','Éloïse','Chloé','Denis','Anyi','Shi De Qing',''],
  ['2026-04-26','Paul','Christelle Z.','Inès','Esther','Éloïse','Chloé','Lorenzo','Karémy','Andreas BODE',''],
  ['2026-05-03','Viviane','Ketty','Daniela','Eva','Christelle C.','Yiyi','Anyi','Denis','Daniel SHAN',''],
  ['2026-05-10','Paul','Christelle Z.','David C.','Eva','Christelle C.','Yiyi','Karémy','Lorenzo','Belka',''],
  ['2026-05-17','Jonathan','Daniela','Olivier','Timothée','Éloïse','Stéphane','Denis','Anyi','JF Tipaka',''],
  ['2026-05-24','Viviane','Oriane','Olivier','Timothée','Éloïse','Stéphane','Lorenzo','Karémy','Chunwei HUANG','Eva'],
  ['2026-05-31','Paul','Christelle Z.','Inès','Esther','Christelle C.','Chloé','Anyi','Denis','Daniel SHAN',''],
  ['2026-06-07','Jonathan','Daniela','Alice','Esther','Christelle C.','Chloé','Denis','Lorenzo','Keai CHEN','Karémy'],
  ['2026-06-14','Viviane','Oriane','Olivier','Eva','Éloïse','Yiyi','Karémy','Anyi','Hewei',''],
  ['2026-06-21','Paul','Christelle Z.','David C.','Eva','Éloïse','Yiyi','Lorenzo','Denis','Delphine ZHOU',''],
  ['2026-06-28','Jonathan','Daniela','Olivier','Timothée','Christelle C.','Stéphane','Anyi','Karémy','Andreas BODE',''],
]

export const FIDELITE_FALLBACK: string[][] = [
  ['2026-01-04','David Chen','Sylvie Shan','En Christ','Timothée'],
  ['2026-01-11','Viviane Liu','Daniel Shan','N. Testament','Timothée'],
  ['2026-01-18','Grp Louange','Pasteur Zhou','Offrande','Grp Louange'],
  ['2026-01-25','Olivier Sun','Daniel Shan','Communion Fraternelle','Daniela'],
  ['2026-02-01','Paul Wu','Activités','Activités','Timothée'],
  ['2026-02-08','Ketty Shan','Chuanwei Huang','Sermon','Daniela'],
  ['2026-02-15','Daniel Yu','Daniel Shan','Communion Fraternelle','Yawin'],
  ['2026-02-22','Chloé Wu','Daniel Shan','Communion Fraternelle','Timothée'],
  ['2026-03-01','Karémy Xu','Sylvie Shan','En Christ','Timothée'],
  ['2026-03-08','Christelle Zhang','Sylvie Shan','En Christ','Yawin'],
  ['2026-03-15','Grp Louange','Pasteur Zhou','Intergroupe','Grp Louange'],
  ['2026-03-22','Paul Wu','Louange','Louange','Daniela'],
  ['2026-03-29','Daniela Weng','Delphine Zhou','Sermon','Yawin'],
]

export const FIDELITE_MUSIC_FALLBACK: string[][] = [
  ['2026-01-04','David.C','Timothée','David S.','Chloé'],
  ['2026-01-11','Viviane','Timothée','David S.','Maëlice'],
  ['2026-01-18','Interfranco','','',''],
  ['2026-01-25','Olivier','Daniela','David S.','Maëlice'],
  ['2026-02-01','Anniversaire Grace Church','','',''],
  ['2026-02-08','Ketty','Daniela','David S.','Chloé'],
  ['2026-02-15','Daniel','Yawin','David S.','Chloé'],
  ['2026-02-22','Chloé','Timothée','David S.','Maëlice'],
  ['2026-03-01','Karemy','Timothée','David S.','Chloé'],
  ['2026-03-08','Christelle','Yawin','David S.','Maëlice'],
  ['2026-03-15','Intergroupe','','',''],
  ['2026-03-22','Paul','Timothée','David S.','Chloé'],
  ['2026-03-29','Daniela','Yawin','David S.','Maëlice'],
]

export const PAIX_FALLBACK: string[][] = [
  ['2026-04-05','','Delphine','Paraboles',''],
  ['2026-04-12','Gr Louange','Professeur Wang','Intergroupe',''],
  ['2026-04-19','','Aisu','Nouveau Testament',''],
  ['2026-04-26','','Aisu','Nouveau Testament',''],
  ['2026-05-03','','Daniel Shan','',''],
  ['2026-05-10','','Aisu','Nouveau Testament',''],
  ['2026-05-17','','Cecile','Etude biblique',''],
  ['2026-05-24','','Christelle','Séance libre',''],
  ['2026-05-31','','Delphine','Formation Spirituel',''],
  ['2026-06-07','','Delphine','Etude biblique',''],
  ['2026-06-14','','Louange','Inter franco',''],
  ['2026-06-21','','Delphine','Formation Spirituel',''],
  ['2026-06-28','','Delphine','Etude biblique',''],
]

export const BONTE_FALLBACK: string[][] = [
  ['2026-04-05','','','Paques',''],
  ['2026-04-12','Equipe louange','Professeur Wang','Intergroupe',''],
  ['2026-04-19','Caire','Stephane','Relation',''],
  ['2026-04-26','Aurélien','Stephane','Partage biblique',''],
  ['2026-05-03','Océane','HeWei','Evangile de Jean',''],
  ['2026-05-10','Léo','HeWei','Nouevlle Vie',''],
  ['2026-05-17','Lorenzo','Lorenzo','Séance libre',''],
  ['2026-05-24','Lydia','Cichang','',''],
  ['2026-05-31','Mina','Stephane','Partage biblique',''],
  ['2026-06-07','Daniel','Stephane','Evangile de Luc',''],
  ['2026-06-14','Equipe louange','Louange','Interfranco',''],
  ['2026-06-21','Mathys','HeWei','Nouvelle Vie',''],
  ['2026-06-28','Henoc','HeWei','Partage biblique',''],
]

export const DEJEUNER_FALLBACK: string[][] = [
  ['2026-01-04','Daniel F.,Lucas,David S.,Maëlice'],
  ['2026-01-11','Mathys,Viviane,Patrick,Olivier'],
  ['2026-01-18','Lydia,Enzo,Patrick,Michel C.'],
  ['2026-01-25','Jimmy,Aurélien,David S.,Michel C.'],
  ['2026-02-01','Léo,Aurélia,Ketty,Paul'],
  ['2026-02-08','Hélène,Mina,Chloé Ji,David C.'],
  ['2026-02-15','Valérie,Daniel F.,Inès,Chloé Wu'],
  ['2026-02-22','Michaël,Océane Z.,Aline,David C.'],
  ['2026-03-01','Esther,Lorenzo,Maëlice,Daniel Y.'],
  ['2026-03-08','Claire,Jérémie,Michel (J),Daniel Y.'],
  ['2026-03-15','Hénoc,Lauriane,Yawin,Timothée'],
  ['2026-03-22','Eloïse,Eva,Oriane,Maxime'],
  ['2026-03-29','Mathys,Valentine,Michel (J),Maxime'],
]

export const EDD_FALLBACK: EddDataStructure = {
  P1_JanFev: { label: "Période 1 — JANVIER FÉVRIER", classes: { "中班": [], "大班": [], "高班": [] } },
  P2_MarAvr: {
    label: "Période 2 — MARS AVRIL",
    classes: {
      "中班": [
        ['2026-03-01','Daniel','Olivier','Esther','Chloé',''],
        ['2026-03-08','Daniel','Olivier','Esther','Chloé',''],
        ['2026-03-15','Olivier','Daniel','Esther','Chloé',''],
        ['2026-03-22','Daniel','Olivier','Esther','Chloé',''],
        ['2026-03-29','Daniel','Olivier','Esther','Chloé',''],
        ['2026-04-05','Daniel','Olivier','Weila','Chloé',''],
        ['2026-04-12','Olivier','Daniel','Weila','Chloé',''],
        ['2026-04-19','Daniel','Olivier','Weila','Chloé',''],
        ['2026-04-26','Daniel','Olivier','Weila','Chloé',''],
      ],
      "大班": [
        ['2026-03-01','Nathalie','','Eva','Lauriane','Éloïse'],
        ['2026-03-08','Nathalie','','Eva','Lauriane','Éloïse'],
        ['2026-03-15','Nathalie','','Eva','Lauriane','Éloïse'],
        ['2026-03-22','Nathalie','','Eva','Lauriane','Éloïse'],
        ['2026-03-29','Nathalie','','Eva','Lauriane','Éloïse'],
        ['2026-04-05','Nathalie','Océane','Eva','Lauriane','Éloïse'],
        ['2026-04-12','Nathalie','Océane','Eva','Lauriane','Éloïse'],
        ['2026-04-19','Nathalie','Océane','Eva','Lauriane','Éloïse'],
        ['2026-04-26','Nathalie','Océane','Eva','Lauriane','Éloïse'],
      ],
      "高班": [
        ['2026-03-01','Viviane','','Jonathan','Maëlice','David S.'],
        ['2026-03-08','Viviane','','Jonathan','Maëlice','David S.'],
        ['2026-03-15','Viviane','','Jonathan','Maëlice','David S.'],
        ['2026-03-22','Viviane','','Jonathan','Maëlice','David S.'],
        ['2026-03-29','Viviane','','Jonathan','Maëlice','David S.'],
        ['2026-04-05','Viviane','','Jonathan','Maëlice','David S.'],
        ['2026-04-12','Viviane','','Jonathan','Maëlice','David S.'],
        ['2026-04-19','Viviane','','Jonathan','Maëlice','David S.'],
        ['2026-04-26','Viviane','','Jonathan','Maëlice','David S.'],
      ],
    }
  },
  P3_MaiJun: { label: "Période 3 — MAI JUIN", classes: { "中班": [], "大班": [], "高班": [] } },
  P4_JulAou: { label: "Période 4 — JUILLET AOÛT", classes: { "中班": [], "大班": [], "高班": [] } },
  P5_SepOct: { label: "Période 5 — SEPTEMBRE OCTOBRE", classes: { "中班": [], "大班": [], "高班": [] } },
  P6_NovDec: { label: "Période 6 — NOVEMBRE DÉCEMBRE", classes: { "中班": [], "大班": [], "高班": [] } },
}

export const CAMP_LOUANGE_FALLBACK: CampusSeance[] = [
  {d:'27/7 Soir',pres:'徐欢乐',ch:'Viviane, Paul',mu:'Piano: Jo, Guitare: Telle, Batterie: Steph',rg:'Sono: Denis, PPT: Lorenzo',ent:'',chants:['','','','']},
  {d:'28/7 Matin',pres:'翁云丹',ch:'Daniela, Jonathan',mu:'Piano: Eva, Guitare: Éloïse, Batterie: Yiyi',rg:'Sono: Denis, PPT: Lorenzo',ent:'',chants:['','','','']},
  {d:'28/7 Soir',pres:'周小秋',ch:'Oriane, Paul',mu:'Piano: Timo, Guitare: Éloïse, Batterie: Steph',rg:'Sono: Denis, PPT: Lorenzo',ent:'',chants:['','','','']},
  {d:'29/7 Matin',pres:'徐欢乐',ch:'Viviane, Jonathan',mu:'Piano: Esther, Guitare: Telle, Batterie: Steph',rg:'Sono: Denis, PPT: Lorenzo',ent:'',chants:['','','','']},
  {d:'29/7 Soir',pres:'Jonathan',ch:'翁云丹, Daniela',mu:'Piano: Eva, Guitare: Éloïse, Batterie: Lauriane',rg:'Sono: Denis, PPT: Lorenzo',ent:'',chants:['','','','']},
  {d:'30/7 Matin',pres:'周小秋',ch:'Oriane, Paul',mu:'Piano: Timo, Guitare: Éloïse, Batterie: Steph',rg:'Sono: Denis, PPT: Lorenzo',ent:'',chants:['','','','']},
  {d:'30/7 Soir',pres:'翁云丹',ch:'Daniela, Jonathan',mu:'Piano: Eva, Guitare: Éloïse, Batterie: Yiyi',rg:'Sono: Denis, PPT: Lorenzo',ent:'',chants:['','','','']},
  {d:'31/7 Matin',pres:'Paul',ch:'徐欢乐, Viviane',mu:'Piano: Jo, Guitare: Telle, Batterie: Hewei',rg:'Sono: Denis, PPT: Lorenzo',ent:'',chants:['','','','']},
]

export const CAMP_ENT_FALLBACK: CampusSeance[] = CAMP_LOUANGE_FALLBACK.map((s, i) => ({
  ...s,
  ent: ['2026-07-24','2026-07-24','2026-07-24','2026-07-17','2026-07-17','2026-07-10','2026-07-10','2026-07-03'][i] || ''
}))
