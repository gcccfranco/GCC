/* GCC Louange — app shell, navigation, tweaks */
(function () {
  "use strict";
  const { useState, useEffect, useMemo, useCallback } = React;
  const { t } = window.GCCi18n;
  const { Library, SetlistList, SetlistDetail, PDFView, ReadingView, LoginView, CreateSetlistView } = window;
  const { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakColor, TweakToggle } = window;

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/ {
    "language": "fr",
    "dark": false,
    "accent": "#e0560a",
    "density": "comfortable",
    "readingScale": "M",
    "chordsDefault": true,
  } /*EDITMODE-END*/;

  const DENSITY = {
    compact: { gap: "14px", pad: "10px" },
    comfortable: { gap: "22px", pad: "14px" },
    spacious: { gap: "32px", pad: "18px" },
  };
  const SCALE_IDX = { S: 0, M: 1, L: 2, XL: 3 };

  function brandPress(hex) {
    // darken ~12%
    const m = hex.replace("#", "");
    const n = parseInt(m, 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.round(r * 0.86); g = Math.round(g * 0.86); b = Math.round(b * 0.86);
    return `rgb(${r},${g},${b})`;
  }
  function brandTint(hex, dark) {
    const m = hex.replace("#", "");
    const n = parseInt(m, 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return dark ? `rgba(${r},${g},${b},0.16)` : `rgba(${r},${g},${b},0.10)`;
  }

  function Navbar({ lang, dark, route, user, onNav, onToggleLang, onToggleDark, onLogin, onLogout }) {
    const title = lang === "zh" ? "GCC 敬拜" : "GCC Louange";
    return (
      <header className="nav">
        <div className="shell shell-wide nav-inner">
          <a className="brand" onClick={() => onNav({ name: "library" })} role="button" tabIndex={0}>
            <span className="brand-mark"><img src="public/logo.png" alt="GCC" /></span>
            <span className="brand-name">{lang === "zh" ? "GCC " : "GCC "}<span className="lo">{lang === "zh" ? "敬拜" : "Louange"}</span></span>
          </a>
          <nav className="nav-links">
            <button className={"nav-link" + (route === "library" || route === "reading" || route === "pdf" ? " active" : "")} onClick={() => onNav({ name: "library" })}>
              {t(lang, "nav.songs")}
            </button>
            <button className={"nav-link" + (route === "setlists" || route === "setlist" || route === "setlistNew" || route === "setlistEdit" ? " active" : "")} onClick={() => onNav({ name: "setlists" })}>
              {t(lang, "nav.setlists")}
            </button>
          </nav>
          <div className="nav-actions">
            <button className="icon-btn" onClick={onToggleLang} aria-label="language">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18"/></svg>
              {lang === "zh" ? "中文" : "FR"}
            </button>
            <button className="icon-btn" onClick={onToggleDark} aria-label="theme">
              {dark ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>
              )}
            </button>
            {user ? (
              <button className="icon-btn" onClick={onLogout} aria-label="logout" title={user.email}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                <span className="auth-lbl">{t(lang, "nav.logout")}</span>
              </button>
            ) : (
              <button className="icon-btn" onClick={onLogin} aria-label="login">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
                <span className="auth-lbl">{t(lang, "nav.login")}</span>
              </button>
            )}
          </div>
        </div>
      </header>
    );
  }

  function App() {
    const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
    const [stack, setStack] = useState([{ name: "library" }]);
    const view = stack[stack.length - 1];

    const G = window.GCC;
    const songsBySlug = useMemo(() => Object.fromEntries(G.songs.map((s) => [s.slug, s])), []);

    // auth (démo, persistée localement) + setlists créées en session
    const [user, setUser] = useState(() => {
      try { return JSON.parse(localStorage.getItem("gcc_user") || "null"); } catch (e) { return null; }
    });
    const [setlists, setSetlists] = useState(() => G.setlists.slice());

    const signIn = useCallback((u) => {
      setUser(u);
      try { localStorage.setItem("gcc_user", JSON.stringify(u)); } catch (e) {}
    }, []);
    const signOut = useCallback(() => {
      setUser(null);
      try { localStorage.removeItem("gcc_user"); } catch (e) {}
    }, []);

    const lang = tw.language;
    const dark = tw.dark;

    // apply theme + tokens
    useEffect(() => {
      document.documentElement.classList.toggle("dark", !!dark);
    }, [dark]);

    const rootStyle = {
      "--brand": tw.accent,
      "--brand-press": brandPress(tw.accent),
      "--brand-tint": brandTint(tw.accent, dark),
      "--row-gap": (DENSITY[tw.density] || DENSITY.comfortable).gap,
      "--block-pad": (DENSITY[tw.density] || DENSITY.comfortable).pad,
    };

    const nav = useCallback((v) => {
      setStack((s) => {
        // reset to base routes for top-level nav
        if (v.name === "library" || v.name === "setlists") return [v];
        return [...s, v];
      });
      window.scrollTo({ top: 0 });
    }, []);
    const push = useCallback((v) => { setStack((s) => [...s, v]); window.scrollTo({ top: 0 }); }, []);
    const back = useCallback(() => { setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)); window.scrollTo({ top: 0 }); }, []);

    let screen = null;
    if (view.name === "library") {
      screen = <Library songs={G.songs} themes={G.themes} lang={lang} onOpen={(slug) => push({ name: "reading", slug })} />;
    } else if (view.name === "reading") {
      screen = (
        <ReadingView
          song={songsBySlug[view.slug]}
          lang={lang}
          defaultScale={SCALE_IDX[tw.readingScale]}
          defaultShowChords={tw.chordsDefault}
          onBack={back}
          onOpenPDF={(song) => push({ name: "pdf", slug: song.slug })}
        />
      );
    } else if (view.name === "pdf") {
      screen = <PDFView song={songsBySlug[view.slug]} lang={lang} onBack={back} />;
    } else if (view.name === "setlists") {
      screen = (
        <SetlistList
          setlists={setlists}
          categories={G.CATEGORIES}
          lang={lang}
          user={user}
          onLogin={() => push({ name: "login", from: { name: "setlists" } })}
          onLogout={signOut}
          onOpen={(id) => push({ name: "setlist", id })}
          onNew={() => push({ name: "setlistNew" })}
        />
      );
    } else if (view.name === "setlistNew") {
      screen = (
        <CreateSetlistView
          songs={G.songs}
          lang={lang}
          user={user}
          onBack={back}
          onNeedLogin={() => push({ name: "login", from: { name: "setlistNew" } })}
          onCreate={(setlist) => {
            setSetlists((prev) => [setlist, ...prev]);
            setStack((s) => [...s.slice(0, -1), { name: "setlist", id: setlist.id }]);
            window.scrollTo({ top: 0 });
          }}
        />
      );
    } else if (view.name === "setlistEdit") {
      const initial = setlists.find((s) => s.id === view.id);
      screen = (
        <CreateSetlistView
          songs={G.songs}
          lang={lang}
          user={user}
          initial={initial}
          onBack={back}
          onNeedLogin={() => push({ name: "login", from: { name: "setlistEdit", id: view.id } })}
          onCreate={(setlist) => {
            setSetlists((prev) => prev.map((s) => (s.id === setlist.id ? setlist : s)));
            setStack((s) => [...s.slice(0, -1), { name: "setlist", id: setlist.id }]);
            window.scrollTo({ top: 0 });
          }}
        />
      );
    } else if (view.name === "login") {
      screen = (
        <LoginView
          lang={lang}
          from={view.from}
          onCancel={back}
          onLogin={(u, from) => {
            signIn(u);
            setStack((s) => [...s.slice(0, -1), from || { name: "setlists" }]);
            window.scrollTo({ top: 0 });
          }}
        />
      );
    } else if (view.name === "setlist") {
      const sl = setlists.find((s) => s.id === view.id);
      screen = (
        <SetlistDetail
          setlist={sl}
          songsBySlug={songsBySlug}
          themes={G.themes}
          lang={lang}
          user={user}
          onBack={back}
          onEdit={() => push({ name: "setlistEdit", id: sl.id })}
          onDelete={(id) => {
            setSetlists((prev) => prev.filter((s) => s.id !== id));
            setStack((s) => [{ name: "setlists" }]);
            window.scrollTo({ top: 0 });
          }}
          onOpenSong={(slug) => push({ name: "reading", slug })}
          onOpenPDF={(song) => push({ name: "pdf", slug: song.slug })}
        />
      );
    }

    return (
      <div className="app" style={rootStyle}>
        <Navbar
          lang={lang}
          dark={dark}
          route={view.name}
          user={user}
          onNav={nav}
          onToggleLang={() => setTweak("language", lang === "fr" ? "zh" : "fr")}
          onToggleDark={() => setTweak("dark", !dark)}
          onLogin={() => push({ name: "login", from: { name: "setlists" } })}
          onLogout={signOut}
        />
        {screen}

        <TweaksPanel title="Tweaks">
          <TweakSection label={lang === "zh" ? "外观" : "Apparence"} />
          <TweakColor label={lang === "zh" ? "主色" : "Accent"} value={tw.accent}
            options={["#e0560a", "#c2410c", "#4f46e5", "#0d9488", "#be123c", "#0f172a"]}
            onChange={(v) => setTweak("accent", v)} />
          <TweakToggle label={lang === "zh" ? "深色模式" : "Mode sombre"} value={tw.dark} onChange={(v) => setTweak("dark", v)} />
          <TweakRadio label={lang === "zh" ? "语言" : "Langue"} value={tw.language}
            options={["fr", "zh"]} onChange={(v) => setTweak("language", v)} />

          <TweakSection label={lang === "zh" ? "歌谱段落" : "Sections"} />
          <TweakRadio label={lang === "zh" ? "密度" : "Densité"} value={tw.density}
            options={["compact", "comfortable", "spacious"]} onChange={(v) => setTweak("density", v)} />

          <TweakSection label={lang === "zh" ? "阅读" : "Lecture"} />
          <TweakRadio label={lang === "zh" ? "字号" : "Taille"} value={tw.readingScale}
            options={["S", "M", "L", "XL"]} onChange={(v) => setTweak("readingScale", v)} />
          <TweakToggle label={lang === "zh" ? "默认显示和弦" : "Accords par défaut"} value={tw.chordsDefault} onChange={(v) => setTweak("chordsDefault", v)} />
        </TweaksPanel>
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
})();
