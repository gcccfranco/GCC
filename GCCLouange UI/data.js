/* GCC Louange — sample data + music helpers
   Lyrics are ORIGINAL devotional texts authored for this mockup (not copyrighted songs),
   written to demonstrate the bilingual FR / 中文 + 简谱 chart format authentically. */
(function () {
  "use strict";

  /* ---------- Chord transposition ---------- */
  const SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const FLAT2SHARP = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#", Cb: "B", Fb: "E" };

  function transposeNote(n, semis) {
    let base = FLAT2SHARP[n] || n;
    let idx = SHARP.indexOf(base);
    if (idx < 0) return n;
    const ni = (((idx + semis) % 12) + 12) % 12;
    return SHARP[ni];
  }
  function transposeChord(ch, semis) {
    if (!ch || !semis) return ch;
    return ch.replace(/([A-G])(b|#)?/g, (m, l, acc) => transposeNote(l + (acc || ""), semis));
  }
  function transposeKey(key, semis) {
    if (!key || !semis) return key;
    return key.replace(/([A-G])(b|#)?/g, (m, l, acc) => transposeNote(l + (acc || ""), semis));
  }
  const ALL_KEYS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
  function semitonesBetween(from, to) {
    const norm = (k) => {
      const m = k.match(/^([A-G])(b|#)?/);
      const note = FLAT2SHARP[m[1] + (m[2] || "")] || m[1] + (m[2] || "");
      return SHARP.indexOf(note);
    };
    return (((norm(to) - norm(from)) % 12) + 12) % 12;
  }

  /* ---------- Parse helpers ---------- */
  // FR / latin line: "[D]Tu es [A]fidèle" -> [{chord, text}, ...]
  function fr(str) {
    const segs = [];
    const re = /\[([^\]]+)\]/g;
    let last = 0,
      m,
      pendingChord = null;
    while ((m = re.exec(str))) {
      const text = str.slice(last, m.index);
      if (text || pendingChord !== null) segs.push({ chord: pendingChord, text });
      pendingChord = m[1];
      last = re.lastIndex;
    }
    const tail = str.slice(last);
    if (tail || pendingChord !== null) segs.push({ chord: pendingChord, text: tail });
    return { type: "fr", segs };
  }

  const isCJK = (c) => {
    const cp = c.codePointAt(0) || 0;
    return (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf);
  };

  // ZH line: chars string with [chords], jianpu + pinyin space-separated per CJK char.
  // "你的[D]恩典[G]够我用", jianpu "3 3 5 6 5 3 2", pinyin "nǐ de ēn diǎn gòu wǒ yòng"
  function zh(str, jianpuStr, pinyinStr) {
    const jp = (jianpuStr || "").split(/\s+/).filter(Boolean);
    const py = (pinyinStr || "").split(/\s+/).filter(Boolean);
    const cells = [];
    let cjk = 0,
      pendingChord = null;
    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      if (c === "[") {
        const end = str.indexOf("]", i);
        pendingChord = str.slice(i + 1, end);
        i = end;
        continue;
      }
      const cell = { ch: c, chord: pendingChord };
      pendingChord = null;
      if (isCJK(c)) {
        cell.jianpu = jp[cjk] || "";
        cell.py = py[cjk] || "";
        cjk++;
      }
      cells.push(cell);
    }
    // a trailing chord (line-end transition) attaches to a blank cell
    if (pendingChord) cells.push({ ch: "", chord: pendingChord });
    return { type: "zh", cells };
  }
  const blank = () => ({ type: "blank" });

  /* ---------- Section helper ---------- */
  const S = (type, lines, opts = {}) => ({ type, lines, ...opts });

  /* =====================================================================
     SONGS  (original lyrics)
     ===================================================================== */
  const songs = [
    /* ---- 1. FR — Tu règnes (rich) ---- */
    {
      slug: "tu-regnes",
      title: "Tu règnes",
      artist: "GCC Louange",
      language: "fr",
      originalKey: "D",
      tempo: 72,
      themes: ["adoration", "royaume"],
      hasJianpu: false,
      youtubeUrl: "https://youtu.be/dummy11111",
      sections: [
        S("intro", [fr("[D]  [A]  [Bm]  [G]")]),
        S(
          "verse",
          [
            fr("[D]Avant les montagnes, [A]avant la mer,"),
            fr("[Bm]ta parole a fait [G]jaillir la lumière."),
            fr("[D]Souverain des âges, [A]Roi éternel,"),
            fr("[Bm]toute chose subsiste [G]en ton nom."),
          ],
          { num: 1 }
        ),
        S(
          "prechorus",
          [fr("[Em]Et nous levons [A]les yeux vers toi,"), fr("[Em]notre espérance [A]est en toi seul.")]
        ),
        S("chorus", [
          fr("[D]Tu règnes, [A]tu règnes,"),
          fr("[Bm]sur la terre et les [G]cieux ;"),
          fr("[D]Tu règnes, [A]tu règnes,"),
          fr("[Bm]à jamais, ô [G]Dieu."),
        ]),
        S(
          "verse",
          [
            fr("[D]Quand la nuit s'avance, [A]tu es ma paix,"),
            fr("[Bm]quand la peur me presse, [G]tu ne changes jamais."),
            fr("[D]Tu tiens dans ta main [A]chaque lendemain,"),
            fr("[Bm]rien n'échappe à ton [G]dessein."),
          ],
          { num: 2 }
        ),
        S(
          "bridge",
          [
            fr("[G]Rien ne séparera [D]ton peuple de [A]toi,"),
            fr("[G]ton amour demeure [D]plus fort que [A]tout ;"),
            fr("[G]nous chanterons encore [D]ta fidéli[A]té,"),
            fr("[Em]de génération en [A]génération."),
          ]
        ),
        S("tag", [fr("[Bm]À jamais, [G]à jamais, ô [A]Dieu.")]),
        S("outro", [fr("[D]  [A]  [Bm]  [G]  [D]")]),
      ],
    },

    /* ---- 2. FR — Fidèle à jamais ---- */
    {
      slug: "fidele-a-jamais",
      title: "Fidèle à jamais",
      artist: "GCC Louange",
      language: "fr",
      originalKey: "G",
      tempo: 68,
      themes: ["foi", "grace"],
      hasJianpu: false,
      youtubeUrl: "https://youtu.be/dummy22222",
      sections: [
        S("intro", [fr("[G]  [D]  [Em]  [C]")]),
        S(
          "verse",
          [
            fr("[G]Au matin tu me [D]relèves,"),
            fr("[Em]ta grâce est nouvelle [C]chaque jour ;"),
            fr("[G]dans la vallée tu [D]demeures,"),
            fr("[Em]tu m'entoures de ton [C]amour."),
          ],
          { num: 1 }
        ),
        S("chorus", [
          fr("[G]Fidèle, [D]fidèle à jamais,"),
          fr("[Em]ta bonté me [C]suivra ;"),
          fr("[G]fidèle, [D]fidèle à jamais,"),
          fr("[Em]jamais tu ne m'oublie[C]ras."),
        ]),
        S(
          "verse",
          [
            fr("[G]Quand tout vacille au[D]tour de moi,"),
            fr("[Em]tu restes mon ro[C]cher ;"),
            fr("[G]je mets ma confiance en [D]toi,"),
            fr("[Em]tu ne peux me dé[C]laisser."),
          ],
          { num: 2 }
        ),
        S("bridge", [
          fr("[C]Hier, aujourd'hui, [G]le même,"),
          fr("[Em]hier, aujourd'hui, [D]toujours ;"),
          fr("[C]ta promesse demeure, [G]Seigneur,"),
          fr("[Em]pour toujours, pour tou[D]jours."),
        ]),
        S("outro", [fr("[G]  [D]  [Em]  [C]  [G]")]),
      ],
    },

    /* ---- 3. FR — Près de toi ---- */
    {
      slug: "pres-de-toi",
      title: "Près de toi",
      artist: "GCC Louange",
      language: "fr",
      originalKey: "E",
      tempo: 64,
      themes: ["adoration", "saint-esprit"],
      hasJianpu: false,
      sections: [
        S("intro", [fr("[E]  [B]  [C#m]  [A]")]),
        S(
          "verse",
          [
            fr("[E]Dans le secret de ta [B]présence,"),
            fr("[C#m]mon âme trouve le [A]repos ;"),
            fr("[E]loin du bruit, loin de l'ur[B]gence,"),
            fr("[C#m]je viens déposer mes [A]fardeaux."),
          ],
          { num: 1 }
        ),
        S("prechorus", [fr("[A]Souffle sur moi, [B]Esprit de Dieu,"), fr("[A]remplis ce lieu, [B]remplis ce lieu.")]),
        S("chorus", [
          fr("[E]Près de toi, [B]je veux demeurer,"),
          fr("[C#m]près de toi, [A]rien ne me manquera ;"),
          fr("[E]près de toi, [B]je veux t'adorer,"),
          fr("[C#m]aussi longtemps que je [A]vivrai."),
        ]),
        S("tag", [fr("[C#m]Près de toi, [A]près de [B]toi.")]),
        S("outro", [fr("[E]  [B]  [C#m]  [A]  [E]")]),
      ],
    },

    /* ---- 4. FR — Saint est le Seigneur (short) ---- */
    {
      slug: "saint-est-le-seigneur",
      title: "Saint est le Seigneur",
      artist: "GCC Louange",
      language: "fr",
      originalKey: "A",
      tempo: 76,
      themes: ["saintete", "adoration"],
      hasJianpu: false,
      sections: [
        S(
          "verse",
          [
            fr("[A]Saint, saint, [E]saint est le Seigneur,"),
            fr("[F#m]toute la terre est [D]pleine de sa gloire ;"),
            fr("[A]Saint, saint, [E]saint est le Seigneur,"),
            fr("[F#m]devant son trône nous [D]tombons."),
          ]
        ),
        S("chorus", [
          fr("[D]Digne, [A]digne, [E]digne est l'Agneau,"),
          fr("[F#m]digne de recevoir [D]toute louange ;"),
          fr("[D]Digne, [A]digne, [E]digne est l'Agneau,"),
          fr("[F#m]à lui le règne pour [E]toujours."),
        ]),
        S("outro", [fr("[A]  [E]  [F#m]  [D]")]),
      ],
    },

    /* ---- 5. ZH — 你的恩典 (rich, jianpu) ---- */
    {
      slug: "ni-de-en-dian",
      title: "你的恩典",
      titlePinyin: "Nǐ de ēn diǎn",
      artist: "GCC 敬拜",
      language: "zh",
      originalKey: "D",
      tempo: 70,
      themes: ["grace", "adoration"],
      hasJianpu: false,
      youtubeUrl: "https://youtu.be/dummy33333",
      sections: [
        S("intro", [zh("[D]  [A]  [Bm]  [G]")]),
        S(
          "verse",
          [
            zh("[D]你的恩典[G]够我[A]用", "5 5 6 6 5 3 2", "nǐ de ēn diǎn gòu wǒ yòng"),
            zh("[Bm]在软弱中[G]显完[A]全", "1 2 3 3 2 3 5", "zài ruǎn ruò zhōng xiǎn wán quán"),
            zh("[D]每个清晨[G]都更[A]新", "5 5 6 6 5 3 2", "měi gè qīng chén dōu gēng xīn"),
            zh("[Bm]如同朝露[G]落心[A]田", "3 3 2 1 2 3 1", "rú tóng zhāo lù luò xīn tián"),
          ],
          { num: 1 }
        ),
        S(
          "prechorus",
          [
            zh("[Em]我举起手[A]来敬拜", "6 6 5 5 3 2 1", "wǒ jǔ qǐ shǒu lái jìng bài"),
            zh("[Em]因你的爱[A]永不改", "1 1 2 3 2 1 6", "yīn nǐ de ài yǒng bù gǎi"),
          ]
        ),
        S("chorus", [
          zh("[D]我要歌唱[A]你的爱", "5 5 1 1 6 5 3", "wǒ yào gē chàng nǐ de ài"),
          zh("[Bm]一生一世[G]不改变", "3 3 5 5 3 2 1", "yī shēng yī shì bù gǎi biàn"),
          zh("[D]你是我心[A]所渴慕", "5 5 1 1 6 5 3", "nǐ shì wǒ xīn suǒ kě mù"),
          zh("[Bm]直到永[G]永远[A]远", "2 2 1 2 3 5 1", "zhí dào yǒng yǒng yuǎn yuǎn"),
        ]),
        S(
          "verse",
          [
            zh("[D]你的话语[G]是亮[A]光", "5 5 6 6 5 3 2", "nǐ de huà yǔ shì liàng guāng"),
            zh("[Bm]照亮我前[G]面的[A]路", "1 2 3 3 2 3 5", "zhào liàng wǒ qián miàn de lù"),
            zh("[D]无论高山[G]或低[A]谷", "5 5 6 6 5 3 2", "wú lùn gāo shān huò dī gǔ"),
            zh("[Bm]你的同在[G]不离[A]开", "3 3 2 1 2 3 1", "nǐ de tóng zài bù lí kāi"),
          ],
          { num: 2 }
        ),
        S("bridge", [
          zh("[G]哦主你信[D]实何其[A]广大", "3 3 2 3 5 5 6 5", "ó zhǔ nǐ xìn shí hé qí guǎng dà"),
          zh("[G]诸天述说[D]你的荣[A]耀", "3 3 2 3 5 5 3 2", "zhū tiān shù shuō nǐ de róng yào"),
        ]),
        S("tag", [zh("[Bm]永永[G]远远，[A]我赞美你。", "2 2 1 1 3 5 1", "yǒng yǒng yuǎn yuǎn wǒ zàn měi nǐ")]),
        S("outro", [zh("[D]  [A]  [Bm]  [G]  [D]")]),
      ],
    },

    /* ---- 6. ZH — 我心赞美 (jianpu) ---- */
    {
      slug: "wo-xin-zan-mei",
      title: "我心赞美",
      titlePinyin: "Wǒ xīn zàn měi",
      artist: "GCC 敬拜",
      language: "zh",
      originalKey: "C",
      tempo: 78,
      themes: ["action-de-grace", "adoration"],
      hasJianpu: false,
      sections: [
        S("intro", [zh("[C]  [G]  [Am]  [F]")]),
        S(
          "verse",
          [
            zh("[C]清晨我心[F]向你[G]唱", "1 1 2 3 3 2 1", "qīng chén wǒ xīn xiàng nǐ chàng"),
            zh("[Am]因你慈爱[F]够久[G]长", "6 6 5 3 5 6 5", "yīn nǐ cí ài gòu jiǔ cháng"),
          ],
          { num: 1 }
        ),
        S("chorus", [
          zh("[C]我心赞美[G]主圣[Am]名", "5 5 3 5 1 1 6", "wǒ xīn zàn měi zhǔ shèng míng"),
          zh("[F]全地都当[C]来欢[G]呼", "4 4 3 2 1 2 3", "quán dì dōu dāng lái huān hū"),
          zh("[C]你的慈爱[G]永长[Am]存", "5 5 3 5 1 1 6", "nǐ de cí ài yǒng cháng cún"),
          zh("[F]从今直到[G]永[C]远", "4 4 3 2 3 2 1", "cóng jīn zhí dào yǒng yuǎn"),
        ]),
        S("bridge", [
          zh("[F]哈利路[G]亚，[Em]哈利路[Am]亚", "4 4 5 6 3 3 2 1", "hā lì lù yà hā lì lù yà"),
          zh("[F]我要称[G]谢，[C]直到永远", "4 4 5 5 3 2 1 1", "wǒ yào chēng xiè zhí dào yǒng yuǎn"),
        ]),
        S("outro", [zh("[C]  [G]  [Am]  [F]  [C]")]),
      ],
    },

    /* ---- 7. ZH — 走在恩典中 (jianpu) ---- */
    {
      slug: "zou-zai-en-dian-zhong",
      title: "走在恩典中",
      titlePinyin: "Zǒu zài ēn diǎn zhōng",
      artist: "GCC 敬拜",
      language: "zh",
      originalKey: "G",
      tempo: 66,
      themes: ["grace", "esperance"],
      hasJianpu: false,
      sections: [
        S(
          "verse",
          [
            zh("[G]一步一步[C]我跟[D]随", "5 5 6 5 3 2 1", "yī bù yī bù wǒ gēn suí"),
            zh("[Em]走在你的[C]恩典[D]中", "3 3 5 5 6 5 3", "zǒu zài nǐ de ēn diǎn zhōng"),
          ],
          { num: 1 }
        ),
        S("chorus", [
          zh("[G]你是道[D]路真[Em]理生命", "5 5 1 1 6 5 3 2", "nǐ shì dào lù zhēn lǐ shēng mìng"),
          zh("[C]我心紧紧[G]跟随[D]你", "4 4 3 2 1 2 3 1", "wǒ xīn jǐn jǐn gēn suí nǐ"),
        ]),
        S("outro", [zh("[G]  [D]  [Em]  [C]")]),
      ],
    },

    /* ---- 8. ZH — 唯有耶稣 (no jianpu, standard ZH w/ pinyin) ---- */
    {
      slug: "wei-you-ye-su",
      title: "唯有耶稣",
      titlePinyin: "Wéi yǒu yē sū",
      artist: "GCC 敬拜",
      language: "zh",
      originalKey: "F",
      tempo: 72,
      themes: ["salut", "croix"],
      hasJianpu: false,
      sections: [
        S("intro", [zh("[F]  [C]  [Dm]  [Bb]")]),
        S(
          "verse",
          [
            zh("[F]当我软弱[Bb]无能为[C]力", "", "dāng wǒ ruǎn ruò wú néng wéi lì"),
            zh("[Dm]唯有耶稣[Bb]扶持[C]我", "", "wéi yǒu yē sū fú chí wǒ"),
          ],
          { num: 1 }
        ),
        S("chorus", [
          zh("[F]唯有耶稣[C]是我[Dm]拯救", "", "wéi yǒu yē sū shì wǒ zhěng jiù"),
          zh("[Bb]十字架上[F]显明[C]爱", "", "shí zì jià shàng xiǎn míng ài"),
        ]),
        S("outro", [zh("[F]  [C]  [Dm]  [Bb]  [F]")]),
      ],
    },
  ];

  /* =====================================================================
     THEMES
     ===================================================================== */
  const themes = [
    { slug: "adoration", name_fr: "Adoration", name_zh: "敬拜" },
    { slug: "action-de-grace", name_fr: "Action de grâce", name_zh: "感恩" },
    { slug: "saintete", name_fr: "Sainteté", name_zh: "圣洁" },
    { slug: "grace", name_fr: "Grâce", name_zh: "恩典" },
    { slug: "salut", name_fr: "Salut", name_zh: "救恩" },
    { slug: "croix", name_fr: "Croix", name_zh: "十字架" },
    { slug: "resurrection", name_fr: "Résurrection", name_zh: "复活" },
    { slug: "saint-esprit", name_fr: "Saint-Esprit", name_zh: "圣灵" },
    { slug: "esperance", name_fr: "Espérance", name_zh: "盼望" },
    { slug: "foi", name_fr: "Foi", name_zh: "信心" },
    { slug: "engagement", name_fr: "Engagement", name_zh: "委身" },
    { slug: "repentance", name_fr: "Repentance", name_zh: "悔改" },
    { slug: "mission", name_fr: "Mission", name_zh: "宣教" },
    { slug: "famille-de-dieu", name_fr: "Famille de Dieu", name_zh: "神的家" },
    { slug: "royaume", name_fr: "Royaume", name_zh: "国度" },
    { slug: "noel", name_fr: "Noël", name_zh: "圣诞" },
    { slug: "paques", name_fr: "Pâques", name_zh: "复活节" },
    { slug: "pentecote", name_fr: "Pentecôte", name_zh: "五旬节" },
  ];

  /* =====================================================================
     SETLISTS
     ===================================================================== */
  const setlists = [
    {
      id: "2026-05-24-culte-francophone",
      title: "Culte du 24 mai",
      date: "2026-05-24",
      theme: "La fidélité de Dieu",
      leader: "Timothée",
      language: "mixed",
      category: "Culte Francophone",
      isDraft: false,
      notes: "Prévoir un temps de prière après le pont de « Tu règnes ».",
      items: [
        { songSlug: "tu-regnes", keyOverride: null, showChords: true, showPinyin: false, useJianpu: false, notes: "" },
        { songSlug: "fidele-a-jamais", keyOverride: "A", showChords: true, showPinyin: false, useJianpu: false, notes: "Monter en La" },
        { songSlug: "ni-de-en-dian", keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, notes: "Pinyin pour l'assemblée" },
        { songSlug: "saint-est-le-seigneur", keyOverride: null, showChords: true, showPinyin: false, useJianpu: false, notes: "Offrande" },
      ],
    },
    {
      id: "2026-05-31-intergroupe",
      title: "Intergroupe — Pentecôte",
      date: "2026-05-31",
      theme: "Esprit Saint",
      leader: "Mei",
      language: "mixed",
      category: "Intergroupe",
      isDraft: true,
      notes: "",
      items: [
        { songSlug: "pres-de-toi", keyOverride: null, showChords: true, showPinyin: false, useJianpu: false, notes: "" },
        { songSlug: "wo-xin-zan-mei", keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, notes: "Pinyin pour les musiciens" },
        { songSlug: "zou-zai-en-dian-zhong", keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, notes: "" },
      ],
    },
    {
      id: "2026-06-07-campus",
      title: "Campus — Soir de louange",
      date: "2026-06-07",
      theme: "Espérance",
      leader: "Jean",
      language: "fr",
      category: "Campus",
      isDraft: false,
      notes: "",
      items: [
        { songSlug: "tu-regnes", keyOverride: null, showChords: true, showPinyin: false, useJianpu: false, notes: "" },
        { songSlug: "pres-de-toi", keyOverride: "D", showChords: true, showPinyin: false, useJianpu: false, notes: "" },
        { songSlug: "saint-est-le-seigneur", keyOverride: null, showChords: true, showPinyin: false, useJianpu: false, notes: "" },
      ],
    },
  ];

  const CATEGORIES = [
    "Culte Francophone",
    "Intergroupe",
    "Interfranco",
    "Campus",
    "Groupe Paix",
    "Groupe Fidélité",
    "Groupe Bonté",
    "中班",
    "大班",
    "高班",
  ];

  // Réunions principales : création réservée aux présidents connectés
  const RESTRICTED_CATEGORIES = ["Culte Francophone", "Intergroupe", "Interfranco", "Campus"];
  const FREE_CATEGORIES = ["Groupe Paix", "Groupe Fidélité", "Groupe Bonté", "中班", "大班", "高班"];
  const isRestricted = (c) => RESTRICTED_CATEGORIES.includes(c);

  window.GCC = {
    songs,
    themes,
    setlists,
    CATEGORIES,
    RESTRICTED_CATEGORIES,
    FREE_CATEGORIES,
    isRestricted,
    ALL_KEYS,
    transposeChord,
    transposeKey,
    semitonesBetween,
    isCJK,
  };
})();
