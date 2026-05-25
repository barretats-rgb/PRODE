/* useState/useEffect/useRef come from components.jsx (global const) */

const SCREENS = {
  home:     { label:"Home",         comp:"Landing",  tab:"home"    },
  register: { label:"Registro",     comp:"Register", tab:null      },
  matches:  { label:"Predicciones", comp:"Matches",  tab:"matches" },
  ranking:  { label:"Ranking",      comp:"Ranking",  tab:"ranking" },
  specials: { label:"Especiales",   comp:"Specials", tab:"matches" },
  profile:  { label:"Perfil",       comp:"Profile",  tab:"profile" },
  groups:   { label:"Grupos",       comp:"Groups",   tab:"groups"  },
  admin:    { label:"Admin",        comp:"Admin",    tab:"admin"   },
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "citrus",
  "showAdmin": true,
  "phrase": "El Mundial se juega en la cancha, se gana en Refugio."
}/*EDITMODE-END*/;

const NAV_ITEMS = [
  { screen:"home",    label:"Home",    icon:"home" },
  { screen:"matches", label:"Prode",   icon:"goal" },
  { screen:"ranking", label:"Ranking", icon:"trophy" },
  { screen:"groups",  label:"Grupos",  icon:"users" },
  { screen:"profile", label:"Yo",      icon:"user" },
  { screen:"admin",   label:"Admin",   icon:"settings", admin:true },
];

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth > 860);
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth > 860);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return isDesktop;
}

function AppNav({ screen, go, isAdmin }) {
  const items = NAV_ITEMS.filter(item => !item.admin || isAdmin);
  return (
    <nav className="app-nav">
      {items.map(item => (
        <button
          key={item.screen}
          className={(screen === item.screen ? "on " : "") + (item.admin ? "admin" : "")}
          onClick={() => go(item.screen)}>
          <i data-lucide={item.icon}></i>
          {item.label}
        </button>
      ))}
    </nav>
  );
}

function MobileBottomNav({ screen, go, isAdmin }) {
  const items = NAV_ITEMS.filter(item => !item.admin || isAdmin);
  return (
    <nav className="mobile-bottom-nav">
      {items.map(item => (
        <button key={item.screen} className={screen === item.screen ? "on" : ""} onClick={() => go(item.screen)}>
          <i data-lucide={item.icon}></i>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function App() {
  const [screen, setScreen] = useState("home");
  const [tweaks] = (window.useTweaks || ((d)=>[d, ()=>{}]))(TWEAK_DEFAULTS);
  const isDesktop = useIsDesktop();
  // Estado de sesión: undefined = cargando, null = sin sesión, objeto = sesión activa.
  const [auth, setAuth] = useState(undefined);

  useEffect(() => {
    window.ProdeDB?.init();
    const unsub = window.ProdeDB?.onAuthChange?.((s) => setAuth(s));
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  }, [screen, tweaks, isDesktop, auth]);

  useEffect(() => {
    const map = { citrus: "#E8F26A", coral: "#FF7A3D", sage: "#B6BF93" };
    document.documentElement.style.setProperty("--neon-citrus", map[tweaks.accent] || map.citrus);
  }, [tweaks.accent]);

  const go = (next) => setScreen(next);

  // GATE 1: cargando, mientras se resuelve la sesión (evita parpadear el home antes del Login).
  // onAuthChange emite el estado actual al suscribir, así que esto dura ~1 frame.
  if (auth === undefined && window.ProdeDB) {
    return <div style={{minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--char-400)"}}>Cargando...</div>;
  }

  // GATE 2: sin sesión → Login (sólo si Firebase está configurado; sin config, modo local sigue).
  if (window.ProdeDB?.isReady?.() && (!auth || !auth.user)) {
    return <Login/>;
  }

  // GATE 3: con sesión pero sin equipo favorito → completar perfil.
  if (auth?.user && auth.player && !auth.player.favoriteTeam) {
    return (
      <div className="app-shell">
        <main className="app-main">
          <div className="app-content">
            <Register go={go}/>
          </div>
        </main>
      </div>
    );
  }

  const isAdmin = !!auth?.isAdmin;
  const Cur = screen === "admin" && isDesktop ? DesktopAdmin : window[SCREENS[screen]?.comp];
  const wide = screen === "admin" && isDesktop;

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-brand">
          <div className="app-logo">REFU<br/><span>GIO</span></div>
          <div className="app-brand-meta">Prode Mundial '26<br/>Tamarindo</div>
        </div>
        <AppNav screen={screen} go={go} isAdmin={isAdmin}/>
        <div className="app-side-card">
          <Eyebrow color="var(--neon-citrus)">Estado</Eyebrow>
          <div style={{fontFamily:"var(--font-title)",fontSize:18,color:"var(--cream-100)",textTransform:"uppercase",marginTop:5}}>247 jugadores</div>
          <div style={{fontSize:11,color:"var(--char-400)",marginTop:4}}>Modo manual: resultados cargados desde Admin.</div>
        </div>
      </aside>

      <main className="app-main">
        <div className={"app-content " + (wide ? "wide" : "")}>
          {Cur ? <Cur go={go} tweaks={tweaks}/> : <div style={{padding:24}}>Cargando...</div>}
        </div>
      </main>

      <MobileBottomNav screen={screen} go={go} isAdmin={isAdmin}/>
    </div>
  );
}

function DesktopAdmin() {
  const [matches, setMatches] = useState(window.ProdeStore?.getMatches?.() || window.MATCHES);

  useEffect(() => {
    const onData = () => setMatches(window.ProdeStore?.getMatches?.() || window.MATCHES);
    window.addEventListener("prode:data", onData);
    return () => window.removeEventListener("prode:data", onData);
  }, []);

  const saveDesktopScore = (id, side, value) => {
    setMatches(ms => {
      const current = ms.find(m => m.id === id) || {};
      const updated = {...current, [side]: value, status:"finalizado"};
      window.ProdeStore?.saveMatchResult(id, {
        status: "finalizado",
        scoreA: side === "scoreA" ? value : Number(current.scoreA || 0),
        scoreB: side === "scoreB" ? value : Number(current.scoreB || 0),
      }).catch((error) => console.warn("[Prode Refugio] No se pudo guardar el resultado.", error));
      return ms.map(m => m.id === id ? updated : m);
    });
  };

  // Desktop admin keeps the same data model as mobile, but gives the staff a wider table for faster edits.
  return (
    <div style={{
      display:"grid", gridTemplateColumns:"220px 1fr",
      height:"100%", color:"var(--cream-100)",
    }}>
      {/* sidebar */}
      <aside style={{
        background:"var(--char-800)", borderRight:"1px solid var(--char-700)",
        padding:"22px 16px", display:"flex", flexDirection:"column", gap:8,
      }}>
        <div style={{
          fontFamily:"var(--font-display)", fontSize:26, lineHeight:0.85,
          textTransform:"uppercase", color:"var(--orange-500)", marginBottom:14,
        }}>
          REFU<br/><span style={{paddingLeft:"0.55em", display:"inline-block", color:"var(--cream-100)"}}>GIO</span>
        </div>
        <div style={{
          fontSize:9, letterSpacing:"0.22em", textTransform:"uppercase",
          color:"var(--char-400)", fontWeight:700, padding:"4px 8px",
        }}>Panel</div>
        {["Dashboard","Partidos","Resultados","Jugadores","Anuncios","Premios","Reportes"].map((it,i) => (
          <button key={it} style={{
            display:"flex", alignItems:"center", gap:10,
            padding:"9px 12px", borderRadius:10, cursor:"pointer", textAlign:"left",
            background: i===1 ? "var(--char-700)" : "transparent",
            border: i===1 ? "1px solid var(--neon-citrus)" : "1px solid transparent",
            color:"var(--cream-100)",
            fontSize:12, fontWeight:600, fontFamily:"var(--font-body)",
          }}>
            <i data-lucide={["layout-dashboard","goal","check-check","users","megaphone","gift","bar-chart-3"][i]} style={{width:14,height:14}}></i>
            {it}
          </button>
        ))}
        <div style={{flex:1}}/>
        <div style={{
          padding:"10px 12px", borderRadius:10, background:"var(--char-900)",
          border:"1px solid var(--char-700)",
          display:"flex", alignItems:"center", gap:10,
        }}>
          <Avatar initials="R" size={28} tone="orange"/>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontSize:11, color:"var(--cream-100)", fontWeight:700}}>Refugio Staff</div>
            <div style={{fontSize:9, color:"var(--char-400)", letterSpacing:"0.04em"}}>admin@refugio.cr</div>
          </div>
        </div>
      </aside>

      <main style={{padding:"22px 28px", overflow:"auto"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:18}}>
          <div>
            <Eyebrow color="var(--neon-citrus)">Hoy · 11 Jun 2026</Eyebrow>
            <h1 style={{
              fontFamily:"var(--font-title)", fontSize:36, color:"var(--cream-100)",
              textTransform:"uppercase", letterSpacing:"0.02em", margin:"4px 0 0",
            }}>Carga manual de resultados</h1>
          </div>
          <div style={{display:"flex", gap:8}}>
            <Btn variant="ghost" size="md" icon="download">Exportar</Btn>
            <Btn variant="accent" size="md" icon="plus">Nuevo partido</Btn>
          </div>
        </div>

        {/* KPI row */}
        <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12, marginBottom:20}}>
          <DKPI v="247"  l="Jugadores activos"  delta="+18 hoy"   tone="citrus"/>
          <DKPI v="1,432" l="Predicciones J1"    delta="+312 hoy"  tone="orange"/>
          <DKPI v="Manual"  l="Resultados"  delta="ranking activo" tone="sage"/>
          <DKPI v="$840" l="Premios entregados"  delta="3 esta sem" tone="tan"/>
        </div>

        {/* table */}
        <div style={{
          borderRadius:14, overflow:"hidden", background:"var(--char-800)",
          border:"1px solid var(--char-700)",
        }}>
          <div style={{
            padding:"12px 16px", borderBottom:"1px solid var(--char-700)",
            display:"grid", gridTemplateColumns:"70px 1.35fr 120px 120px 1fr 90px 80px", gap:12,
            fontSize:9, letterSpacing:"0.22em", textTransform:"uppercase", color:"var(--char-400)", fontWeight:700,
          }}>
            <span>FECHA</span><span>Partido</span><span>Resultado</span><span>Estado</span><span>Sede</span>
            <span>Hora</span><span></span>
          </div>
          {matches.slice(0, 9).map((m,i) => {
            const saveRow = () => {
              const scoreA = Number(m.scoreA || 0);
              const scoreB = Number(m.scoreB || 0);
              setMatches(ms => ms.map(item => item.id === m.id ? {...item, scoreA, scoreB, status:"finalizado"} : item));
              window.ProdeStore?.saveMatchResult(m.id, {status:"finalizado", scoreA, scoreB})
                .catch((error) => console.warn("[Prode Refugio] No se pudo guardar el resultado.", error));
            };
            return (
            <div key={m.id} style={{
              padding:"12px 16px", borderBottom: i<8 ? "1px solid var(--char-700)" : 0,
              display:"grid", gridTemplateColumns:"70px 1.35fr 120px 120px 1fr 90px 80px", gap:12,
              alignItems:"center", fontSize:12,
            }}>
              <div style={{
                fontFamily:"var(--font-title)", fontSize:11, color:"var(--char-200)",
              }}>{m.date.slice(4)}</div>
              <div style={{display:"flex", alignItems:"center", gap:8, minWidth:0}}>
                <Flag code={m.a} size={20}/>
                <span style={{color:"var(--cream-100)", fontWeight:600}}>{window.TEAMS[m.a]}</span>
                <span style={{color:"var(--char-500)", margin:"0 2px"}}>vs</span>
                <span style={{color:"var(--cream-100)", fontWeight:600}}>{window.TEAMS[m.b]}</span>
                <Flag code={m.b} size={20}/>
              </div>
              <div style={{display:"flex", alignItems:"center", gap:6}}>
                <input type="number" value={m.scoreA || 0} onChange={e=>saveDesktopScore(m.id,"scoreA",Number(e.target.value || 0))} style={desktopScoreInput}/>
                <span style={{color:"var(--char-500)", fontFamily:"var(--font-title)"}}>?</span>
                <input type="number" value={m.scoreB || 0} onChange={e=>saveDesktopScore(m.id,"scoreB",Number(e.target.value || 0))} style={desktopScoreInput}/>
              </div>
              <div>
                {m.status === "vivo" ? <Pill tone="live">VIVO - {m.minute}</Pill> :
                 m.status === "finalizado" ? <Pill tone="done">FT</Pill> :
                 <Pill tone="open">Manual</Pill>}
              </div>
              <div style={{color:"var(--char-200)", fontSize:11}}>{m.venue}</div>
              <div style={{color:"var(--char-200)", fontFamily:"var(--font-mono)"}}>{m.time}</div>
              <div style={{textAlign:"right"}}>
                <button onClick={saveRow} style={{
                  width:34, height:34, borderRadius:8, border:"1px solid var(--neon-citrus)",
                  background:"var(--char-900)", color:"var(--neon-citrus)", cursor:"pointer",
                  display:"inline-flex", alignItems:"center", justifyContent:"center",
                }}>
                  <i data-lucide="check" style={{width:14,height:14}}></i>
                </button>
              </div>
            </div>
          )})}
        </div>

        {/* announcement composer */}
        <div style={{
          marginTop:20, padding:16, borderRadius:14,
          background:"var(--char-800)", border:"1px solid var(--char-700)",
          display:"grid", gridTemplateColumns:"1fr 280px", gap:16,
        }}>
          <div>
            <Eyebrow color="var(--neon-citrus)">Nuevo anuncio</Eyebrow>
            <textarea placeholder="Hoy Argentina vs Croacia en pantalla gigante..." style={{
              marginTop:8, width:"100%", padding:12, borderRadius:10,
              background:"var(--char-900)", color:"var(--cream-100)",
              border:"1px solid var(--char-700)", outline:"none", resize:"none",
              fontFamily:"var(--font-body)", fontSize:13, minHeight:80, boxSizing:"border-box",
            }}/>
            <div style={{display:"flex", gap:6, marginTop:10, alignItems:"center"}}>
              <Pill tone="open">AHORA</Pill>
              <Pill tone="ghost">PROMO</Pill>
              <Pill tone="ghost">FECHA</Pill>
              <div style={{flex:1}}/>
              <Btn variant="accent" size="sm" icon="send">Publicar</Btn>
            </div>
          </div>
          <div>
            <Eyebrow color="var(--char-200)">Activos · 3</Eyebrow>
            <div style={{marginTop:8, display:"flex", flexDirection:"column", gap:6}}>
              {window.ANNOUNCEMENTS.map(a => (
                <div key={a.id} style={{
                  padding:"8px 10px", borderRadius:10,
                  background:"var(--char-900)", border:"1px solid var(--char-700)",
                  fontSize:11, display:"flex", alignItems:"center", gap:8,
                }}>
                  <i data-lucide={a.icon} style={{width:12,height:12,color:"var(--neon-citrus)"}}></i>
                  <span style={{color:"var(--cream-100)", flex:1, fontWeight:600}}>{a.title}</span>
                  <span style={{fontSize:9, color:"var(--char-400)", letterSpacing:"0.1em"}}>{a.tag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const desktopScoreInput = {
  width:42, height:34, borderRadius:8,
  background:"var(--char-900)", color:"var(--cream-100)",
  border:"1px solid var(--char-600)", outline:"none",
  fontFamily:"var(--font-title)", fontSize:16, textAlign:"center",
};

function DKPI({ v, l, delta, tone }) {
  const colors = {
    citrus:"var(--neon-citrus)", orange:"var(--orange-400)",
    sage:"var(--sage-300)", tan:"var(--tan-300)",
  };
  return (
    <div style={{
      padding:"14px 16px", borderRadius:14,
      background:"var(--char-800)", border:"1px solid var(--char-700)",
    }}>
      <Eyebrow color="var(--char-200)" style={{fontSize:9}}>{l}</Eyebrow>
      <div style={{
        fontFamily:"var(--font-title)", fontSize:32, color:colors[tone], lineHeight:1, marginTop:6,
      }}>{v}</div>
      <div style={{fontSize:10, color:"var(--char-400)", marginTop:5, letterSpacing:"0.06em"}}>↑ {delta}</div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
