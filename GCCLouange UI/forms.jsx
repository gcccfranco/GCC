/* GCC Louange — Login + Setlist creation screens */
(function () {
  "use strict";
  const { useState, useMemo } = React;
  const { t } = window.GCCi18n;
  const { ALL_KEYS, RESTRICTED_CATEGORIES, FREE_CATEGORIES, isRestricted } = window.GCC;

  /* ===================== LOGIN ===================== */
  function LoginView({ lang, from, onLogin, onCancel }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    function submit(e) {
      e.preventDefault();
      setError("");
      if (!email.trim() || !password.trim()) { setError(t(lang, "login.error")); return; }
      setLoading(true);
      // Démo : pas de backend — toute combinaison valide est acceptée.
      setTimeout(() => {
        setLoading(false);
        onLogin({ email: email.trim() }, from);
      }, 450);
    }

    return (
      <div className="login-stage">
        <div className="login-box">
          <div className="login-head">
            <span className="login-mark"><img src="public/logo.png" alt="GCC" /></span>
            <h1>{t(lang, "login.title")}</h1>
            <p>{t(lang, "login.subtitle")}</p>
          </div>
          <form onSubmit={submit} className="login-form">
            <label className="fld">
              <span>{t(lang, "login.email")}</span>
              <input type="email" value={email} autoComplete="email" placeholder="email@example.com"
                onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="fld">
              <span>{t(lang, "login.password")}</span>
              <input type="password" value={password} autoComplete="current-password" placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)} />
            </label>
            {error && <p className="form-err">{error}</p>}
            <button type="submit" className="btn-primary full" disabled={loading}>
              {loading ? t(lang, "login.submitLoading") : t(lang, "login.submit")}
            </button>
            <p className="login-demo">{t(lang, "login.demo")}</p>
          </form>
          <button className="link-btn center" onClick={onCancel}>{t(lang, "login.back")}</button>
        </div>
      </div>
    );
  }

  /* ===================== CREATE SETLIST ===================== */
  function nextUid() { nextUid._n = (nextUid._n || 0) + 1; return "u" + nextUid._n; }
  const defaultSecs = (song) =>
    (song.sections || []).map((s, i) => ({ uid: nextUid(), idx: i, note: "" }));

  function SectionStructureEditor({ song, lang, items, onChange }) {
    const { secName } = window.GCCi18n;
    const [dragIdx, setDragIdx] = useState(null);
    function add(idx) { onChange([...items, { uid: nextUid(), idx, note: "" }]); }
    function removeAt(i) { onChange(items.filter((_, k) => k !== i)); }
    function noteAt(i, note) { const n = items.slice(); n[i] = { ...n[i], note }; onChange(n); }
    function move(from, to) {
      if (to < 0 || to >= items.length) return;
      const n = items.slice(); const [it] = n.splice(from, 1); n.splice(to, 0, it); onChange(n);
    }
    return (
      <div className="struct-edit">
        <p className="struct-lbl">{t(lang, "sf.structure")}</p>
        <div className="cz-add">
          {song.sections.map((s, i) => (
            <button type="button" key={i} onClick={() => add(i)}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 5v14M5 12h14"/></svg>
              {secName(lang, s.type)}{s.num ? " " + s.num : ""}
            </button>
          ))}
        </div>
        <div className="cz-struct">
          {items.map((it, i) => {
            const s = song.sections[it.idx];
            if (!s) return null;
            return (
              <div className="cz-row" key={it.uid} draggable
                onDragStart={() => setDragIdx(i)} onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragIdx != null) move(dragIdx, i); setDragIdx(null); }}
                style={{ opacity: dragIdx === i ? 0.4 : 1 }}>
                <span className="cz-grip" aria-hidden="true">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/></svg>
                </span>
                <div className="cz-row-body">
                  <div className="cz-row-name">{secName(lang, s.type)}{s.num ? " " + s.num : ""}</div>
                  <input type="text" placeholder={t(lang, "sf.songNote")} value={it.note}
                    onChange={(e) => noteAt(i, e.target.value)} />
                </div>
                <button type="button" className="cz-del" onClick={() => removeAt(i)} aria-label="remove">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                </button>
              </div>
            );
          })}
          {items.length === 0 && <p className="cz-empty">{t(lang, "sf.emptySections")}</p>}
        </div>
      </div>
    );
  }

  function SongRow({ item, song, lang, onRemove, onKey, onNote, onStruct }) {
    const { secName } = window.GCCi18n;
    const [open, setOpen] = useState(false);
    const total = (song.sections || []).length;
    const modified = item.sectionItems.length !== total ||
      item.sectionItems.some((si, i) => si.idx !== i);
    return (
      <div className="sf-song">
        <div className="sf-song-main">
          <span className="cz-grip drag-handle" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/></svg>
          </span>
          <div className="sf-song-info">
            <div className="sf-song-title">
              {song.title}
              {song.titlePinyin && <span className="sf-song-py">{song.titlePinyin}</span>}
              {song.language === "zh" && <span className="lang-pill lang-zh">中文</span>}
            </div>
            {song.artist && <p className="sf-song-artist">{song.artist}</p>}
            <input className="sf-note" type="text" placeholder={t(lang, "sf.songNote")} value={item.notes}
              onChange={(e) => onNote(e.target.value)} />
          </div>
          <div className="sf-song-aside">
            <select className="sf-key" value={item.keyOverride || ""} onChange={(e) => onKey(e.target.value || null)}>
              <option value="">{t(lang, "sf.originalKey", { key: song.originalKey })}</option>
              {ALL_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            {total > 1 && (
              <button type="button" className={"sf-struct-toggle" + (modified ? " mod" : "")} onClick={() => setOpen((v) => !v)}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={{ transform: open ? "rotate(180deg)" : "none" }}><path d="M6 9l6 6 6-6"/></svg>
                {t(lang, "sf.structure")}{modified ? ` ${item.sectionItems.length}/${total}` : ""}
              </button>
            )}
          </div>
          <button type="button" className="cz-del" onClick={onRemove} aria-label="remove">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
          </button>
        </div>
        {open && total > 1 && (
          <SectionStructureEditor song={song} lang={lang} items={item.sectionItems} onChange={onStruct} />
        )}
      </div>
    );
  }

  function CreateSetlistView({ songs, lang, user, initial, onCreate, onBack, onNeedLogin }) {
    const songBySlug = useMemo(() => Object.fromEntries(songs.map((s) => [s.slug, s])), [songs]);
    const editMode = !!initial;
    const [title, setTitle] = useState(initial ? initial.title : "");
    const [leader, setLeader] = useState(initial ? initial.leader : "");
    const [category, setCategory] = useState(initial ? initial.category : "");
    const [notes, setNotes] = useState(initial ? initial.notes || "" : "");
    const [items, setItems] = useState(() =>
      initial
        ? (initial.items || []).map((it) => {
            const song = songBySlug[it.songSlug];
            const sectionItems = it.structureOverride
              ? it.structureOverride.map((x) => ({ uid: nextUid(), idx: x.idx, note: x.note || "" }))
              : defaultSecs(song || { sections: [] });
            return { uid: nextUid(), slug: it.songSlug, keyOverride: it.keyOverride || null, notes: it.notes || "", sectionItems };
          })
        : []
    );
    const [query, setQuery] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [dragIdx, setDragIdx] = useState(null);
    const addedSlugs = useMemo(() => new Set(items.map((i) => i.slug)), [items]);
    const results = useMemo(() => {
      const avail = songs.filter((s) => !addedSlugs.has(s.slug));
      const k = query.trim().toLowerCase();
      const r = k
        ? avail.filter((s) => s.title.toLowerCase().includes(k) || (s.titlePinyin || "").toLowerCase().includes(k) || s.artist.toLowerCase().includes(k))
        : avail;
      return r.slice(0, 6);
    }, [songs, addedSlugs, query]);
    const availCount = songs.length - addedSlugs.size;

    function addSong(song) {
      setItems((prev) => [...prev, { uid: nextUid(), slug: song.slug, keyOverride: null, notes: "", sectionItems: defaultSecs(song) }]);
      setQuery("");
    }
    function patch(uid, p) { setItems((prev) => prev.map((i) => (i.uid === uid ? { ...i, ...p } : i))); }
    function move(from, to) {
      if (to < 0 || to >= items.length) return;
      const n = items.slice(); const [it] = n.splice(from, 1); n.splice(to, 0, it); setItems(n);
    }

    const needsAuth = category && isRestricted(category) && !user;

    function doCreate(isDraft) {
      setError("");
      if (!title.trim()) { setError(t(lang, "sf.titleRequired")); return; }
      if (!leader.trim()) { setError(t(lang, "sf.leaderRequired")); return; }
      if (!category) { setError(t(lang, "sf.categoryRequired")); return; }
      if (isRestricted(category) && !user) { onNeedLogin(); return; }
      setBusy(true);
      const langs = new Set(items.map((i) => songBySlug[i.slug].language));
      const language = langs.size === 0 ? "fr" : langs.size === 1 ? [...langs][0] : "mixed";
      const setlist = {
        id: editMode ? initial.id : "new-" + Date.now(),
        title: title.trim(),
        leader: leader.trim(),
        category,
        date: editMode ? initial.date : new Date().toISOString().split("T")[0],
        language,
        isDraft: editMode ? (isDraft != null ? !!isDraft : !!initial.isDraft) : !!isDraft,
        notes: notes.trim(),
        items: items.map((it) => {
          const song = songBySlug[it.slug];
          const allIdx = (song.sections || []).map((_, i) => i);
          const curIdx = it.sectionItems.map((s) => s.idx);
          const override = JSON.stringify(curIdx) === JSON.stringify(allIdx) ? null : it.sectionItems.map((s) => ({ idx: s.idx, note: s.note }));
          return {
            songSlug: it.slug,
            keyOverride: it.keyOverride,
            showChords: true,
            showPinyin: song.language === "zh",
            useJianpu: false,
            structureOverride: override,
            notes: it.notes,
          };
        }),
      };
      setTimeout(() => onCreate(setlist), 350);
    }

    return (
      <div className="shell page sf-page">
        <div className="sf-bar">
          <button className="back-link" onClick={onBack}>← {t(lang, "back")}</button>
          <h1>{editMode ? t(lang, "sf.titleEdit") : t(lang, "sf.titleNew")}</h1>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); doCreate(false); }} className="sf-form">
          {/* Infos */}
          <section className="sf-sec">
            <h2 className="sf-sec-title">{t(lang, "sf.info")}</h2>
            <label className="fld">
              <span>{t(lang, "sf.titleLabel")} <i className="req">*</i></span>
              <input type="text" value={title} placeholder={t(lang, "sf.titlePlaceholder")} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="fld">
              <span>{t(lang, "sf.leaderLabel")} <i className="req">*</i></span>
              <input type="text" value={leader} placeholder={t(lang, "sf.leaderPlaceholder")} onChange={(e) => setLeader(e.target.value)} />
            </label>
            <label className="fld">
              <span>{t(lang, "sf.categoryLabel")} <i className="req">*</i></span>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">{t(lang, "sf.categoryPlaceholder")}</option>
                <optgroup label={t(lang, "sf.categoryRestricted")}>
                  {RESTRICTED_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </optgroup>
                <optgroup label={t(lang, "sf.categoryFree")}>
                  {FREE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </optgroup>
              </select>
            </label>
            {needsAuth && (
              <div className="sf-auth-warn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>
                <span>{t(lang, "sf.restrictedWarning")} <button type="button" className="link-inline" onClick={onNeedLogin}>{t(lang, "nav.login")}</button></span>
              </div>
            )}
            <label className="fld">
              <span>{t(lang, "sf.notesLabel")}</span>
              <textarea rows={2} value={notes} placeholder={t(lang, "sf.notesPlaceholder")} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </section>

          {/* Chants */}
          <section className="sf-sec">
            <h2 className="sf-sec-title">{t(lang, "sf.songs")}</h2>
            <div className="search sf-search">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
              <input type="search" value={query} placeholder={t(lang, "sf.searchSongs")} onChange={(e) => setQuery(e.target.value)} />
              {query && <button type="button" className="clear-x" onClick={() => setQuery("")} aria-label="clear"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>}
            </div>
            {results.length > 0 && (
              <div className="sf-results">
                {results.map((s) => (
                  <button type="button" key={s.slug} className="sf-result" onClick={() => addSong(s)}>
                    <span className="sf-result-title">{s.title}</span>
                    {s.language === "zh" && <span className="lang-pill lang-zh">中文</span>}
                    <span className="key-pill mono">{s.originalKey}</span>
                    <span className="sf-result-add">{t(lang, "add")}</span>
                  </button>
                ))}
              </div>
            )}
            {availCount === 0 && songs.length > 0 && <p className="cz-empty">{t(lang, "sf.allAdded")}</p>}

            {items.length > 0 ? (
              <div className="sf-songlist">
                {items.map((it, i) => (
                  <div key={it.uid} draggable
                    onDragStart={() => setDragIdx(i)} onDragOver={(e) => e.preventDefault()}
                    onDrop={() => { if (dragIdx != null) move(dragIdx, i); setDragIdx(null); }}
                    style={{ opacity: dragIdx === i ? 0.4 : 1 }}>
                    <SongRow
                      item={it} song={songBySlug[it.slug]} lang={lang}
                      onRemove={() => setItems((prev) => prev.filter((x) => x.uid !== it.uid))}
                      onKey={(k) => patch(it.uid, { keyOverride: k })}
                      onNote={(n) => patch(it.uid, { notes: n })}
                      onStruct={(si) => patch(it.uid, { sectionItems: si })}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="sf-empty">{t(lang, "sf.emptySongs")}</p>
            )}
          </section>

          {error && <p className="form-err">{error}</p>}

          <div className="sf-actions">
            {category && isRestricted(category) && (
              <button type="button" className="btn-ghost" disabled={busy} onClick={() => doCreate(true)}>
                {busy ? t(lang, "sf.draftSaving") : t(lang, "sf.draft")}
              </button>
            )}
            <button type="submit" className="btn-primary grow" disabled={busy}>
              {busy ? t(lang, editMode ? "sf.saving" : "sf.creating") : t(lang, editMode ? "sf.save" : "sf.create")}
            </button>
          </div>
        </form>
      </div>
    );
  }

  Object.assign(window, { LoginView, CreateSetlistView });
})();
