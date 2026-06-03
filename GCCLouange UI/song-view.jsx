/* GCC Louange — song rendering (reading view + shared chart renderer) */
(function () {
  "use strict";
  const { useState, useRef, useEffect } = React;
  const { transposeChord, transposeKey, semitonesBetween, ALL_KEYS, isCJK } = window.GCC;
  const { t, secName, secBadge } = window.GCCi18n;

  /* ---- chord with subscript quality (Em -> E + small m, Csus4, Gm7, D/F#) ---- */
  function ChordText({ chord, semis }) {
    const txt = transposeChord(chord, semis);
    const m = txt.match(/^([A-G][#b]?)(.*)$/);
    if (!m) return txt;
    const root = m[1];
    let rest = m[2];
    let qual = rest, bass = "";
    const si = rest.indexOf("/");
    if (si >= 0) { qual = rest.slice(0, si); bass = rest.slice(si); }
    return (
      <>
        <span className="ch-root">{root}</span>
        {qual ? <span className="ch-q">{qual}</span> : null}
        {bass ? <span className="ch-bass">{bass}</span> : null}
      </>
    );
  }

  /* ---- one latin / FR line (chord over lyric) ---- */
  function Line({ line, semis, showChords }) {
    if (line.type === "blank") return <div className="line-empty" />;
    const segs = line.segs;
    const hasChord = showChords && segs.some((s) => s.chord);
    return (
      <div className={"line" + (hasChord ? "" : " no-chords")}>
        {segs.map((s, i) => {
          const blank = !s.text || !s.text.trim();
          const style = blank && s.chord ? { minWidth: `calc(${s.chord.length + 1}ch * var(--rscale))` } : null;
          return (
            <span className="lyseg" key={i} style={style}>
              <span className="chord">
                {showChords && s.chord ? <ChordText chord={s.chord} semis={semis} /> : "\u00A0"}
              </span>
              <span className="lyric">{s.text || (s.chord ? "\u00A0" : "")}</span>
            </span>
          );
        })}
      </div>
    );
  }

  /* ---- one ZH line (column layout: chord / jianpu / char / pinyin) ---- */
  function ZhLine({ line, semis, showChords, showPinyin, useJianpu }) {
    if (line.type === "blank") return <div className="line-empty" />;
    const cells = line.cells;
    const hasChord = showChords && cells.some((c) => c.chord);
    return (
      <div className={"zh-line" + (hasChord ? "" : " no-chords")}>
        {cells.map((c, i) => {
          const cjk = isCJK(c.ch);
          // chord-only cells (intro/outro): give width for the chord text
          const style = {};
          if (!cjk && c.chord) style.minWidth = `calc(${c.chord.length + 1}ch * var(--rscale))`;
          return (
            <div className={"zh-cell" + (cjk ? " is-cjk" : "")} key={i} style={style}>
              <span className="cell-chord">
                {showChords && c.chord ? <ChordText chord={c.chord} semis={semis} /> : "\u00A0"}
              </span>
              <span className="cell-ch">{c.ch || "\u00A0"}</span>
              {showPinyin && <span className="cell-py">{c.py || "\u00A0"}</span>}
            </div>
          );
        })}
      </div>
    );
  }

  /* ---- a section block with identity label ---- */
  function Section({ song, sec, note, lang, semis, showChords, showPinyin, useJianpu, idAttr }) {
    const accent = `var(--sec-${sec.type})`;
    const tint = `var(--sec-${sec.type}-tint)`;
    const isZh = song.language === "zh";
    const jp = isZh && song.hasJianpu && useJianpu;
    const feature = sec.type === "chorus" || sec.type === "prechorus";
    const noteText = note || sec.note;
    return (
      <div
        className={"section" + (feature ? " is-feature" : "")}
        id={idAttr}
        style={{ breakInside: "avoid", "--sec-cc": accent, "--sec-tint": tint }}
      >
        <div className="section-label">
          <span className="sec-dash" aria-hidden="true" />
          <span className="sec-name">
            {secName(lang, sec.type)}
            {sec.num ? <span className="sec-num"> {sec.num}</span> : null}
            {noteText ? <span className="sec-note"> — {noteText}</span> : null}
          </span>
        </div>
        <div className="sec-content">
          {sec.lines.map((line, i) =>
            isZh ? (
              <ZhLine
                key={i}
                line={line}
                semis={semis}
                showChords={showChords}
                showPinyin={showPinyin}
                useJianpu={jp}
              />
            ) : (
              <Line key={i} line={line} semis={semis} showChords={showChords} />
            )
          )}
        </div>
      </div>
    );
  }

  /* ---- the full chart body (used by reader + PDF) ---- */
  function SongSections({ song, lang, semis, showChords, showPinyin, useJianpu, secStyle, idPrefix, structure }) {
    // structure: optional [{ idx, note, uid }] — reordered / duplicated / trimmed section instances.
    // Disabled in jianpu mode (full song shown in original order).
    const useStruct = structure && structure.length && !(song.language === "zh" && song.hasJianpu && useJianpu);
    const list = useStruct
      ? structure.map((it, i) => ({ sec: song.sections[it.idx], note: it.note, key: it.uid || i }))
      : song.sections.map((sec, i) => ({ sec, note: "", key: i }));
    return (
      <div className={"song-body-sections style-" + (secStyle || "editorial")}>
        {list.map((row, i) =>
          row.sec ? (
            <Section
              key={row.key}
              song={song}
              sec={row.sec}
              note={row.note}
              lang={lang}
              semis={semis}
              showChords={showChords}
              showPinyin={showPinyin}
              useJianpu={useJianpu}
              idAttr={idPrefix ? `${idPrefix}-sec-${i}` : undefined}
            />
          ) : null
        )}
      </div>
    );
  }

  /* ---- reading-scale levels ---- */
  const SCALES = [
    { k: "S", v: 0.9 },
    { k: "M", v: 1 },
    { k: "L", v: 1.18 },
    { k: "XL", v: 1.42 },
  ];

  function ytId(url) {
    if (!url) return null;
    const m = url.match(/(?:youtu\.be\/|[?&]v=)([A-Za-z0-9_-]{6,})/);
    return m ? m[1] : null;
  }

  /* ================= Reading screen ================= */
  function ReadingView({ song, lang, secStyle, onBack, onOpenPDF, defaultScale, defaultShowChords, defaultJianpu }) {
    const isZh = song.language === "zh";
    const defaultStructure = (s) => s.sections.map((sec, i) => ({ uid: `${sec.type}-${i}`, idx: i, note: "" }));
    const [cz, setCz] = useState(() => ({
      semitones: 0,
      currentKey: song.originalKey,
      showChords: defaultShowChords !== false,
      showPinyin: isZh,
      theme: secStyle || "editorial",
      structure: defaultStructure(song),
    }));
    const [scaleIdx, setScaleIdx] = useState(defaultScale != null ? defaultScale : 1);
    const [showVideo, setShowVideo] = useState(false);
    const [showPanel, setShowPanel] = useState(false);
    const update = (patch) => setCz((c) => ({ ...c, ...patch }));

    useEffect(() => {
      setCz({
        semitones: 0,
        currentKey: song.originalKey,
        showChords: defaultShowChords !== false,
        showPinyin: song.language === "zh",
        theme: secStyle || "editorial",
        structure: defaultStructure(song),
      });
    }, [song.slug]);

    useEffect(() => { update({ showChords: defaultShowChords !== false }); }, [defaultShowChords]);
    useEffect(() => { update({ theme: secStyle || "editorial" }); }, [secStyle]);
    useEffect(() => { if (defaultScale != null) setScaleIdx(defaultScale); }, [defaultScale]);

    const semis = cz.semitones;
    const curKey = cz.currentKey;
    const showChords = cz.showChords;
    const showPinyin = cz.showPinyin;
    const yt = ytId(song.youtubeUrl);
    const scale = SCALES[scaleIdx].v;

    const shiftBy = (d) => update({ semitones: cz.semitones + d, currentKey: transposeKey(song.originalKey, cz.semitones + d) });
    const setKey = (key) => update({ currentKey: key, semitones: semitonesBetween(song.originalKey, key) });

    const scrollTo = (i) => {
      const el = document.getElementById(`r-sec-${i}`);
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 118, behavior: "smooth" });
    };

    return (
      <div>
        {/* control bar */}
        <div className="control-bar">
          <div className="shell shell-wide">
            <div className="control-inner">
              <button className="back-link" onClick={onBack}>
                ← <span>{t(lang, "back")}</span>
              </button>

              <div className="transpose">
                <button onClick={() => shiftBy(-1)} aria-label="−½ ton">−</button>
                <span className="keysel">
                  <select value={curKey} onChange={(e) => setKey(e.target.value)} aria-label={t(lang, "cz.key")}>
                    {ALL_KEYS.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                  <svg className="car" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><path d="M6 9l6 6 6-6"/></svg>
                  <small>{semis === 0 ? t(lang, "key.original").toUpperCase() : (semis > 0 ? "+" : "") + semis}</small>
                </span>
                <button onClick={() => shiftBy(1)} aria-label="+½ ton">+</button>
              </div>

              <div className="ctl-group">
                <button className={"ctl-btn" + (showChords ? " on" : "")} onClick={() => update({ showChords: !showChords })}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="M9 18V5l12-2v13"/></svg>
                  <span className="lbl">{t(lang, "chords")}</span>
                </button>
                {isZh && (
                  <button className={"ctl-btn" + (showPinyin ? " on" : "")} onClick={() => update({ showPinyin: !showPinyin })}>
                    <span style={{ fontWeight: 700 }}>{t(lang, "pinyin")}</span>
                  </button>
                )}
                {yt && (
                  <button className={"ctl-btn" + (showVideo ? " on" : "")} onClick={() => setShowVideo((v) => !v)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none"/></svg>
                    <span className="lbl">{t(lang, "video")}</span>
                  </button>
                )}
                <button className="ctl-btn" onClick={() => setShowPanel(true)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                  <span className="lbl">{t(lang, "customize")}</span>
                </button>
                <button className="ctl-btn" onClick={() => onOpenPDF(song)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"/></svg>
                  <span className="lbl">{t(lang, "pdf")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* video */}
        {yt && showVideo && (
          <div className="shell">
            <div className="yt-wrap">
              <div className="yt-frame">
                <iframe src={`https://www.youtube.com/embed/${yt}`} title={song.title} allowFullScreen></iframe>
              </div>
            </div>
          </div>
        )}

        {/* body */}
        <div className="shell shell-wide" style={{ "--rscale": scale }}>
          <div className="reader">
            <div className="reader-main">
              <header className="song-head">
                <div className="head-row">
                  <div className="head-titles">
                    <h1>{song.title}</h1>
                    {song.titlePinyin && <p className="py-title">{song.titlePinyin}</p>}
                    <p className="composer">{song.artist}</p>
                  </div>
                  <div className="head-aside">
                    <span className="key-pill">{curKey}</span>
                    {song.tempo && (
                      <span className="tempo"><span className="qn">&#9833;</span> = {song.tempo}</span>
                    )}
                  </div>
                </div>
                <div className="ordre">
                  <span className="ordre-k">{t(lang, "order")}</span>
                  <span className="ordre-seq">
                    {cz.structure.map((it, i) => {
                      const s = song.sections[it.idx];
                      if (!s) return null;
                      return (
                        <React.Fragment key={it.uid}>
                          {i > 0 ? <span className="ordre-sep">·</span> : null}
                          <button className="ordre-item" onClick={() => scrollTo(i)}>
                            {secName(lang, s.type)}{s.num ? " " + s.num : ""}
                          </button>
                        </React.Fragment>
                      );
                    })}
                  </span>
                </div>
              </header>

              <SongSections
                song={song}
                lang={lang}
                semis={semis}
                showChords={showChords}
                showPinyin={isZh && showPinyin}
                useJianpu={false}
                secStyle={cz.theme}
                structure={cz.structure}
                idPrefix="r"
              />
            </div>
          </div>
        </div>

        {showPanel && (
          <CustomizePanel
            song={song}
            lang={lang}
            isZh={isZh}
            state={cz}
            onChange={setCz}
            onClose={() => setShowPanel(false)}
          />
        )}
      </div>
    );
  }

  /* ================= Customize panel (personnalisation) ================= */
  function BugReportButton({ song, lang }) {
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState("idle");
    function submit(e) {
      e.preventDefault();
      setStatus("loading");
      setTimeout(() => setStatus("done"), 500); // démo : pas de backend
    }
    if (status === "done") {
      return <p className="report-done"><span>✓</span> {t(lang, "report.done")}</p>;
    }
    return (
      <>
        <button className="report-btn" onClick={() => setOpen(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          {t(lang, "report.button")}
        </button>
        {open && (
          <div className="report-modal" onClick={() => setOpen(false)}>
            <div className="report-box" onClick={(e) => e.stopPropagation()}>
              <div className="report-head">
                <h3><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg> {t(lang, "report.title")}</h3>
                <button className="cz-x" onClick={() => setOpen(false)} aria-label="close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
              </div>
              <form onSubmit={submit} className="report-form">
                <label className="fld">
                  <span>{t(lang, "report.summary")}</span>
                  <input name="title" defaultValue={t(lang, "report.defaultTitle", { song })} required />
                </label>
                <label className="fld">
                  <span>{t(lang, "report.details")} <i className="muted">{t(lang, "report.opt")}</i></span>
                  <textarea name="description" rows={3} placeholder={t(lang, "report.detailsPlaceholder")} />
                </label>
                <label className="fld">
                  <span>{t(lang, "report.email")} <i className="muted">{t(lang, "report.opt")}</i></span>
                  <input name="userEmail" type="email" placeholder={t(lang, "report.emailPlaceholder")} />
                </label>
                <div className="report-actions">
                  <button type="button" className="link-btn" onClick={() => setOpen(false)}>{t(lang, "report.cancel")}</button>
                  <button type="submit" className="btn-primary" disabled={status === "loading"}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                    {status === "loading" ? t(lang, "report.sending") : t(lang, "report.send")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    );
  }

  function CustomizePanel({ song, lang, isZh, state, onChange, onClose }) {
    const [dragIdx, setDragIdx] = useState(null);
    const [counter, setCounter] = useState(1000);
    const upd = (patch) => onChange({ ...state, ...patch });

    const jianpuLock = isZh && song.hasJianpu && state.useJianpu;

    function addSection(idx) {
      const sec = song.sections[idx];
      const uid = `${sec.type}-${counter}`;
      setCounter((c) => c + 1);
      upd({ structure: [...state.structure, { uid, idx, note: "" }] });
    }
    function removeAt(i) { upd({ structure: state.structure.filter((_, k) => k !== i) }); }
    function noteAt(i, note) {
      const next = state.structure.slice();
      next[i] = { ...next[i], note };
      upd({ structure: next });
    }
    function move(from, to) {
      if (to < 0 || to >= state.structure.length) return;
      const next = state.structure.slice();
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      upd({ structure: next });
    }
    function reset() {
      onChange({
        semitones: 0,
        currentKey: song.originalKey,
        showChords: true,
        showPinyin: isZh,
        useJianpu: false,
        theme: "editorial",
        structure: song.sections.map((s, i) => ({ uid: `${s.type}-${i}`, idx: i, note: "" })),
      });
    }

    return (
      <div className="cz-overlay" onClick={onClose}>
        <div className="cz-panel" onClick={(e) => e.stopPropagation()}>
          <div className="cz-head">
            <h2>{t(lang, "cz.title")}</h2>
            <button className="cz-x" onClick={onClose} aria-label="close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div className="cz-body">
            {/* Structure */}
            <section className="cz-sec">
              <h3>{t(lang, "cz.structure")}</h3>
              <>
                  <div className="cz-add">
                    {song.sections.map((s, i) => (
                      <button key={i} onClick={() => addSection(i)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 5v14M5 12h14"/></svg>
                        {secName(lang, s.type)}{s.num ? " " + s.num : ""}
                      </button>
                    ))}
                  </div>
                  <div className="cz-struct">
                    {state.structure.map((it, i) => {
                      const s = song.sections[it.idx];
                      if (!s) return null;
                      return (
                        <div
                          className="cz-row"
                          key={it.uid}
                          draggable
                          onDragStart={() => setDragIdx(i)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => { if (dragIdx != null) move(dragIdx, i); setDragIdx(null); }}
                          style={{ opacity: dragIdx === i ? 0.4 : 1 }}
                        >
                          <span className="cz-grip" aria-hidden="true">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/></svg>
                          </span>
                          <div className="cz-row-body">
                            <div className="cz-row-name">{secName(lang, s.type)}{s.num ? " " + s.num : ""}</div>
                            <input
                              type="text"
                              placeholder={t(lang, "sf.songNote")}
                              value={it.note}
                              onChange={(e) => noteAt(i, e.target.value)}
                            />
                          </div>
                          <button className="cz-del" onClick={() => removeAt(i)} aria-label="remove">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                          </button>
                        </div>
                      );
                    })}
                    {state.structure.length === 0 && <p className="cz-empty">{t(lang, "cz.emptySections")}</p>}
                  </div>
                </>
            </section>

            <section className="cz-sec cz-report">
              <BugReportButton song={song.title} lang={lang} />
            </section>
          </div>

          <div className="cz-foot">
            <button className="cz-reset" onClick={reset}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 109-9 9 9 0 00-6.7 3M3 4v4h4"/></svg>
              {t(lang, "reset")}
            </button>
            <button className="cz-close" onClick={onClose}>{t(lang, "close")}</button>
          </div>
        </div>
      </div>
    );
  }

  Object.assign(window, { Line, ZhLine, Section, SongSections, ReadingView, CustomizePanel, SCALES, ChordText });
})();
