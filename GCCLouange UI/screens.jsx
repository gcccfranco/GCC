/* GCC Louange — Library, Setlist, PDF screens */
(function () {
  "use strict";
  const { useState, useMemo, useRef } = React;
  const { transposeKey, semitonesBetween } = window.GCC;
  const { t, secName, secBadge } = window.GCCi18n;
  const { SongSections } = window;

  const themeName = (themes, slug, lang) => {
    const th = themes.find((x) => x.slug === slug);
    return th ? (lang === "zh" ? th.name_zh : th.name_fr) : slug;
  };
  const langRail = (l) => (l === "zh" ? "var(--jianpu)" : "#3f63cf");

  /* ===================== LIBRARY ===================== */
  function Library({ songs, themes, lang, onOpen }) {
    const [q, setQ] = useState("");
    const [langF, setLangF] = useState("all");
    const [themeF, setThemeF] = useState("");

    const usedThemes = useMemo(() => {
      const s = new Set(songs.flatMap((x) => x.themes));
      return themes.filter((th) => s.has(th.slug));
    }, [songs, themes]);

    const filtered = useMemo(() => {
      let r = songs.slice();
      if (q.trim()) {
        const k = q.trim().toLowerCase();
        r = r.filter(
          (s) =>
            s.title.toLowerCase().includes(k) ||
            (s.titlePinyin || "").toLowerCase().includes(k) ||
            s.artist.toLowerCase().includes(k)
        );
      } else {
        r.sort((a, b) => (a.titlePinyin || a.title).localeCompare(b.titlePinyin || b.title, "fr"));
      }
      if (langF !== "all") r = r.filter((s) => s.language === langF);
      if (themeF) r = r.filter((s) => s.themes.includes(themeF));
      return r;
    }, [songs, q, langF, themeF]);

    const hasFilter = q.trim() || langF !== "all" || themeF;

    return (
      <div className="shell page">
        <header className="page-head">
          <h1 className="page-title">{t(lang, "songs.title")}</h1>
          <p className="page-sub">{t(lang, "songs.sub")}</p>
        </header>

        <div className="search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t(lang, "search.placeholder")} type="search" />
          {q && (
            <button className="clear-x" onClick={() => setQ("")} aria-label="clear">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        <div className="filters">
          <div className="seg">
            {["all", "fr", "zh"].map((l) => (
              <button key={l} className={langF === l ? "on" : ""} onClick={() => setLangF(l)}>
                {l === "all" ? t(lang, "filter.all") : l === "fr" ? "FR" : "中文"}
              </button>
            ))}
          </div>
          <select className="chip-select" value={themeF} onChange={(e) => setThemeF(e.target.value)}>
            <option value="">{t(lang, "filter.themes")}</option>
            {usedThemes.map((th) => (
              <option key={th.slug} value={th.slug}>
                {lang === "zh" ? th.name_zh : th.name_fr}
              </option>
            ))}
          </select>
          {hasFilter && (
            <button className="link-btn" onClick={() => { setQ(""); setLangF("all"); setThemeF(""); }}>
              {t(lang, "reset")}
            </button>
          )}
        </div>

        <p className="count">
          {filtered.length === songs.length
            ? t(lang, "count", { n: songs.length })
            : t(lang, "countFiltered", { n: filtered.length, t: songs.length })}
        </p>

        {filtered.length === 0 ? (
          <p className="empty">{t(lang, "noResults")}</p>
        ) : (
          <ul className="song-list">
            {filtered.map((s) => (
              <li key={s.slug}>
                <a className="song-card" onClick={() => onOpen(s.slug)} role="button" tabIndex={0}>
                  <span className="song-rail" style={{ background: langRail(s.language) }} />
                  <span className="song-body">
                    <span className="song-main">
                      <span className="song-title">{s.title}</span>
                      {s.titlePinyin && <span className="song-py">{s.titlePinyin}</span>}
                      <span className="song-artist">{s.artist}</span>
                      {s.themes.length > 0 && (
                        <span className="song-themes">
                          {s.themes.slice(0, 3).map((tk) => (
                            <span className="tag-pill" key={tk}>{themeName(themes, tk, lang)}</span>
                          ))}
                        </span>
                      )}
                    </span>
                    <span className="song-meta">
                      <span className="key-pill">{s.originalKey}</span>
                      <span className={"lang-pill " + (s.language === "zh" ? "lang-zh" : "lang-fr")}>
                        {s.language === "zh" ? "中文" : "FR"}
                      </span>
                      {s.youtubeUrl && (
                        <span className="badge-yt" title="YouTube">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
                        </span>
                      )}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  /* ===================== SETLIST LIST ===================== */
  function fmtDate(iso, lang) {
    try {
      return new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "fr-FR", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      }).format(new Date(iso + "T12:00:00"));
    } catch (e) { return iso; }
  }

  function SetlistList({ setlists, categories, lang, user, onOpen, onNew, onLogin, onLogout }) {
    const [cat, setCat] = useState("Toutes");
    const filtered = cat === "Toutes" ? setlists : setlists.filter((s) => s.category === cat);
    const usedCats = useMemo(() => categories.filter((c) => setlists.some((s) => s.category === c)), [setlists, categories]);
    return (
      <div className="shell page">
        <header className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
          <div>
            <h1 className="page-title">{t(lang, "setlists.title")}</h1>
            <p className="page-sub">{t(lang, "setlists.sub")}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {user ? (
              <button className="link-btn" onClick={onLogout} title={user.email} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                {t(lang, "nav.logout")}
              </button>
            ) : (
              <button className="link-btn" onClick={onLogin} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
                {t(lang, "nav.login")}
              </button>
            )}
            <button className="icon-btn primary" onClick={onNew}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 5v14M5 12h14"/></svg>
              {t(lang, "setlists.new")}
            </button>
          </div>
        </header>

        <div className="filters">
          <button className={"seg-flat " + (cat === "Toutes" ? "" : "")} style={chipStyle(cat === "Toutes")} onClick={() => setCat("Toutes")}>
            {t(lang, "setlists.all")}
          </button>
          {usedCats.map((c) => (
            <button key={c} style={chipStyle(cat === c)} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>

        <div className="setlist-list">
          {filtered.map((s) => (
            <a key={s.id} className="setlist-card" onClick={() => onOpen(s.id)} role="button" tabIndex={0}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: "-0.2px" }}>{s.title}</h2>
                    {s.isDraft && <span className="draft-pill">{t(lang, "setlists.draft")}</span>}
                  </div>
                  <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "4px 0 0", textTransform: "capitalize" }}>{fmtDate(s.date, lang)}</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 6, padding: "2px 8px", height: "fit-content", whiteSpace: "nowrap" }}>
                  {s.language === "mixed" ? "FR / 中文" : s.language === "zh" ? "中文" : "FR"}
                </span>
              </div>
              <div style={{ marginTop: 11, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontSize: 12.5, color: "var(--muted)" }}>
                <span className="cat-pill">{s.category}</span>
                <span>{t(lang, "setlists.songs", { n: s.items.length })}</span>
                {s.leader && <span>· {s.leader}</span>}
                {s.theme && <span>· {s.theme}</span>}
              </div>
            </a>
          ))}
        </div>
      </div>
    );
  }
  function chipStyle(on) {
    return {
      border: "none", padding: "6px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
      background: on ? "var(--brand)" : "var(--surface-2)",
      color: on ? "var(--on-brand)" : "var(--muted)",
    };
  }

  /* ===================== SETLIST DETAIL ===================== */
  function SetlistDetail({ setlist, songsBySlug, themes, lang, user, onBack, onOpenSong, onOpenPDF, onEdit, onDelete }) {
    const [tab, setTab] = useState("list");
    const [showChords, setShowChords] = useState(true);
    const [confirmDel, setConfirmDel] = useState(false);
    const items = setlist.items;
    const canDelete = !window.GCC.isRestricted(setlist.category) || !!user;

    const structNames = (it, song) => {
      const list = it.structureOverride
        ? it.structureOverride.map((x) => song.sections[x.idx]).filter(Boolean)
        : song.sections;
      return list.map((s) => secName(lang, s.type) + (s.num ? " " + s.num : "")).join(" · ");
    };

    return (
      <div className="shell shell-wide page">
        <div className="sd-bar">
          <button className="back-link" onClick={onBack}>← {t(lang, "back")}</button>
          <div className="tabs sd-tabs">
            <button className={tab === "list" ? "on" : ""} onClick={() => setTab("list")}>{t(lang, "tab.list")}</button>
            <button className={tab === "charts" ? "on" : ""} onClick={() => setTab("charts")}>{t(lang, "tab.charts")}</button>
          </div>
          <div className="sd-actions">
            {tab === "charts" && (
              <button className={"ctl-btn" + (showChords ? " on" : "")} onClick={() => setShowChords((v) => !v)} title={t(lang, "chords")}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="M9 18V5l12-2v13"/></svg>
              </button>
            )}
            <button className="ctl-btn" onClick={onEdit}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
              <span className="lbl">{t(lang, "sd.edit")}</span>
            </button>
            <button className="ctl-btn" onClick={() => window.print()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"/></svg>
              <span className="lbl">{t(lang, "pdf")}</span>
            </button>
            {canDelete && !confirmDel && (
              <button className="ctl-btn danger" onClick={() => setConfirmDel(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                <span className="lbl">{t(lang, "sd.delete")}</span>
              </button>
            )}
            {confirmDel && (
              <span className="sd-confirm">
                <span>{t(lang, "sd.deleteConfirm")}</span>
                <button className="link-btn danger" onClick={() => onDelete(setlist.id)}>{t(lang, "sd.deleteYes")}</button>
                <button className="link-btn" onClick={() => setConfirmDel(false)}>{t(lang, "sd.deleteCancel")}</button>
              </span>
            )}
          </div>
        </div>

        <header style={{ margin: "18px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 className="page-title">{setlist.title}</h1>
            {setlist.isDraft && <span className="draft-pill">{t(lang, "setlists.draft")}</span>}
          </div>
          <p className="page-sub" style={{ textTransform: "capitalize" }}>{fmtDate(setlist.date, lang)}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, fontSize: 13, color: "var(--muted)", alignItems: "center" }}>
            <span className="cat-pill">{setlist.category}</span>
            {setlist.leader && <span>{t(lang, "setlists.leader")} · <strong style={{ color: "var(--fg-soft)" }}>{setlist.leader}</strong></span>}
            {setlist.theme && <span>· {setlist.theme}</span>}
          </div>
          {setlist.notes && (
            <p style={{ marginTop: 12, fontSize: 13.5, color: "var(--fg-soft)", background: "var(--surface-2)", padding: "10px 13px", borderRadius: 10, borderLeft: "3px solid var(--brand)" }}>
              {setlist.notes}
            </p>
          )}
        </header>

        {tab === "list" ? (
          <div className="setlist-list">
            {items.map((it, i) => {
              const song = songsBySlug[it.songSlug];
              if (!song) return null;
              const key = it.keyOverride || song.originalKey;
              const transposed = it.keyOverride && it.keyOverride !== song.originalKey;
              return (
                <div className="set-item" key={it.songSlug + i}>
                  <span className="set-num">{i + 1}</span>
                  <a style={{ flex: 1, minWidth: 0, textDecoration: "none", color: "inherit", cursor: "pointer" }} onClick={() => onOpenSong(song.slug)}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {song.title}
                      {song.titlePinyin && <span style={{ fontWeight: 500, fontSize: 12.5, color: "var(--muted)", marginLeft: 8 }}>{song.titlePinyin}</span>}
                    </div>
                    {song.artist && <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{song.artist}</div>}
                    <div style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 3 }}>{structNames(it, song)}</div>
                    {it.notes && <div style={{ fontSize: 12.5, color: "var(--muted)", fontStyle: "italic", marginTop: 2 }}>{it.notes}</div>}
                  </a>
                  <span className="set-flags">
                    <span className={"flag key-pill" + (transposed ? " on" : "")} style={{ fontFamily: "var(--font-mono)" }}>{key}</span>
                    {it.showPinyin && <span className="flag">拼音</span>}
                    {it.showChords && <span className="flag">{t(lang, "chords")}</span>}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            {items.map((it, i) => {
              const song = songsBySlug[it.songSlug];
              if (!song) return null;
              const key = it.keyOverride || song.originalKey;
              const semis = semitonesBetween(song.originalKey, key);
              return (
                <div key={it.songSlug + i} style={{ marginBottom: 30, paddingBottom: 24, borderBottom: "1px solid var(--border-soft)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: "-0.4px" }}>
                      <span style={{ color: "var(--brand)", fontFamily: "var(--font-mono)", fontSize: 15, marginRight: 8 }}>{i + 1}.</span>
                      {song.title}
                      {song.titlePinyin && <span style={{ fontWeight: 500, fontSize: 14, color: "var(--muted)", marginLeft: 10 }}>{song.titlePinyin}</span>}
                    </h2>
                    <span className="key-badge">{key}</span>
                  </div>
                  {it.notes && <p style={{ fontSize: 12.5, color: "var(--muted)", fontStyle: "italic", margin: "0 0 8px" }}>{it.notes}</p>}
                  <SongSections
                    song={song}
                    lang={lang}
                    semis={semis}
                    showChords={showChords && it.showChords}
                    showPinyin={song.language === "zh" && it.showPinyin}
                    useJianpu={false}
                    secStyle="editorial"
                    structure={it.structureOverride ? it.structureOverride.map((x, k) => ({ idx: x.idx, note: x.note || "", uid: "so-" + k })) : undefined}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ===================== PDF / PRINT SHEET ===================== */
  function PDFView({ song, lang, onBack }) {
    const isZh = song.language === "zh";
    const [semis, setSemis] = useState(0);
    const [showChords, setShowChords] = useState(true);
    const [showPinyin, setShowPinyin] = useState(isZh);
    const [twoCol, setTwoCol] = useState(false);
    const [secStyle, setSecStyle] = useState("editorial");
    const curKey = transposeKey(song.originalKey, semis);

    const SECS = ["intro", "verse", "prechorus", "chorus", "bridge", "outro", "tag"];

    return (
      <div className="pdf-stage">
        <div className="shell shell-wide">
          <div className="pdf-toolbar no-print">
            <button className="back-link" onClick={onBack}>← {t(lang, "back")}</button>
            <div className="transpose" style={{ marginLeft: 6 }}>
              <button onClick={() => setSemis((s) => s - 1)}>−</button>
              <span className="keyval">{curKey}</span>
              <button onClick={() => setSemis((s) => s + 1)}>+</button>
            </div>
            <button className={"ctl-btn" + (showChords ? " on" : "")} onClick={() => setShowChords((v) => !v)}>{t(lang, "chords")}</button>
            {isZh && <button className={"ctl-btn" + (showPinyin ? " on" : "")} onClick={() => setShowPinyin((v) => !v)}>{t(lang, "pinyin")}</button>}
            <button className="icon-btn primary" style={{ marginLeft: "auto" }} onClick={() => window.print()}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"/></svg>
              Imprimer / PDF
            </button>
          </div>

          {/* legend */}
          <div className="legend no-print" style={{ marginBottom: 16 }}>
            {SECS.map((s) => (
              <span className="legend-item" key={s}>
                <span className="legend-sw" style={{ background: `var(--sec-${s})` }} />
                {secName(lang, s)}
              </span>
            ))}
          </div>

          {/* A4 sheet */}
          <div className={"sheet " + (twoCol ? "pdf-cols-2" : "")}>
            <div className="sheet-head">
              <h1>{song.title}</h1>
              {song.titlePinyin && <p className="py">{song.titlePinyin}</p>}
              <div className="sheet-metarow">
                <span>{song.artist}</span>
                <span className="dot" />
                <span className="k-chip">{curKey}</span>
                {song.tempo && (
                  <>
                    <span className="dot" />
                    <span>♩ = {song.tempo}</span>
                  </>
                )}
              </div>
            </div>
            <div className="sheet-body" style={{ "--rscale": 0.96 }}>
              <SongSections
                song={song}
                lang={lang}
                semis={semis}
                showChords={showChords}
                showPinyin={isZh && showPinyin}
                useJianpu={false}
                secStyle={secStyle}
              />
            </div>
            <div className="sheet-foot">
              <span>GCC Louange</span>
              <span>{song.title} · {curKey}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  Object.assign(window, { Library, SetlistList, SetlistDetail, PDFView });
})();
