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
  const [playerCount, setPlayerCount] = useState(null);

  useEffect(() => {
    window.ProdeDB?.init();
    const unsub = window.ProdeDB?.onAuthChange?.((s) => setAuth(s));
    return () => unsub && unsub();
  }, []);

  // Conteo real de jugadores (sólo con sesión, porque players requiere estar logueado).
  useEffect(() => {
    if (!auth?.user) return;
    const unsub = window.ProdeDB?.subscribePlayerCount?.(setPlayerCount);
    return () => unsub && unsub();
  }, [auth?.user?.uid]);

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
  // Layout centrado propio: NO usar la grilla de 2 columnas del app-shell, que sin
  // sidebar dejaría el formulario apretado en la columna de 260px en desktop.
  if (auth?.user && auth.player && !auth.player.favoriteTeam) {
    return (
      <div style={{minHeight:"100vh", display:"flex", justifyContent:"center", alignItems:"flex-start", padding:"24px 16px", background:"var(--char-900)"}}>
        <div style={{width:"100%", maxWidth:520}}>
          <Register go={go}/>
        </div>
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
          <div style={{fontFamily:"var(--font-title)",fontSize:18,color:"var(--cream-100)",textTransform:"uppercase",marginTop:5}}>
            {playerCount == null ? "—" : playerCount} {playerCount === 1 ? "jugador" : "jugadores"}
          </div>
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
    setMatches(ms => ms.map(m => m.id === id ? { ...m, [side]: value } : m));
  };

  // Gestión de jugadores (mismo modelo que la vista compacta): ranking en vivo + expulsar.
  const [tab, setTab] = useState("resultados");
  const [players, setPlayers] = useState([]);
  const [confirmExpel, setConfirmExpel] = useState(null);
  const [expelling, setExpelling] = useState(null);

  useEffect(() => {
    const unsub = window.ProdeDB?.subscribeRanking?.((list) => setPlayers(list));
    return () => unsub && unsub();
  }, []);

  const myUid = window.ProdeDB?.getUser?.()?.uid;
  const doExpel = async (uid) => {
    setExpelling(uid);
    try {
      await window.ProdeDB?.expelPlayer?.(uid);
    } catch (e) {
      console.error("[Prode Refugio] expulsar jugador", e);
    } finally {
      setExpelling(null);
      setConfirmExpel(null);
    }
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
        {[
          {id:"resultados", label:"Resultados", icon:"check-check"},
          {id:"especiales", label:"Especiales", icon:"star"},
          {id:"jugadores",  label:"Jugadores",  icon:"users"},
        ].map(t => {
          const on = tab === t.id;
          return (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              display:"flex", alignItems:"center", gap:10,
              padding:"9px 12px", borderRadius:10, textAlign:"left", cursor:"pointer",
              background: on ? "var(--char-700)" : "transparent",
              border: on ? "1px solid var(--neon-citrus)" : "1px solid transparent",
              color: on ? "var(--cream-100)" : "var(--char-300)",
              fontSize:12, fontWeight:600, fontFamily:"var(--font-body)",
            }}>
              <i data-lucide={t.icon} style={{width:14,height:14}}></i>
              {t.label}
            </button>
          );
        })}
        <div style={{flex:1}}/>
        <div style={{
          padding:"10px 12px", borderRadius:10, background:"var(--char-900)",
          border:"1px solid var(--char-700)",
          display:"flex", alignItems:"center", gap:10,
        }}>
          <Avatar initials="R" size={28} tone="orange"/>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontSize:11, color:"var(--cream-100)", fontWeight:700}}>Staff Refugio</div>
            <div style={{fontSize:9, color:"var(--char-400)", letterSpacing:"0.04em"}}>Admin</div>
          </div>
        </div>
      </aside>

      <main style={{padding:"22px 28px", overflow:"auto"}}>
        {tab === "resultados" && (<>
        <div style={{marginBottom:18}}>
          <Eyebrow color="var(--neon-citrus)">Panel · Tamarindo</Eyebrow>
          <h1 style={{
            fontFamily:"var(--font-title)", fontSize:36, color:"var(--cream-100)",
            textTransform:"uppercase", letterSpacing:"0.02em", margin:"4px 0 0",
          }}>Carga manual de resultados</h1>
          <div style={{fontSize:12, color:"var(--char-400)", marginTop:8}}>
            Cargá el marcador y tocá el ✓ para confirmar: se reparten los puntos y se actualiza el ranking.
          </div>
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
          {matches.map((m,i) => {
            const saveRow = () => {
              const scoreA = Number(m.scoreA || 0);
              const scoreB = Number(m.scoreB || 0);
              setMatches(ms => ms.map(item => item.id === m.id ? {...item, scoreA, scoreB, status:"finalizado"} : item));
              const finalize = window.ProdeDB?.finalizeMatch
                ? window.ProdeDB.finalizeMatch(m.id, scoreA, scoreB)
                : window.ProdeStore?.saveMatchResult(m.id, {status:"finalizado", scoreA, scoreB});
              Promise.resolve(finalize).catch((error) => console.warn("[Prode Refugio] No se pudo confirmar el resultado.", error));
            };
            return (
            <div key={m.id} style={{
              padding:"12px 16px", borderBottom: i < matches.length - 1 ? "1px solid var(--char-700)" : 0,
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
                <input type="number" value={m.scoreA ?? ""} placeholder="X" onChange={e=>saveDesktopScore(m.id,"scoreA",Number(e.target.value || 0))} style={desktopScoreInput}/>
                <span style={{color:"var(--char-500)", fontFamily:"var(--font-title)"}}>–</span>
                <input type="number" value={m.scoreB ?? ""} placeholder="X" onChange={e=>saveDesktopScore(m.id,"scoreB",Number(e.target.value || 0))} style={desktopScoreInput}/>
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
        </>)}

        {tab === "jugadores" && (
          <div>
            <div style={{marginBottom:18}}>
              <Eyebrow color="var(--neon-citrus)">Panel · Tamarindo</Eyebrow>
              <h1 style={{
                fontFamily:"var(--font-title)", fontSize:36, color:"var(--cream-100)",
                textTransform:"uppercase", letterSpacing:"0.02em", margin:"4px 0 0",
              }}>Jugadores · {players.length}</h1>
              <div style={{fontSize:12, color:"var(--char-400)", marginTop:8}}>
                Expulsar borra al jugador y todas sus predicciones. No se puede deshacer.
              </div>
            </div>
            {players.length === 0 && (
              <div style={{padding:16, color:"var(--char-300)", fontSize:13,
                borderRadius:14, background:"var(--char-800)", border:"1px solid var(--char-700)"}}>
                Todavía no hay jugadores registrados.
              </div>
            )}
            <div style={{
              borderRadius:14, overflow:"hidden", background:"var(--char-800)",
              border:"1px solid var(--char-700)",
            }}>
              {(window.ProdeRanking?.rankingRowsFromPlayers?.(players, myUid) || []).map((r, i, arr) => (
                <div key={r.id} style={{
                  padding:"12px 16px", borderBottom: i < arr.length - 1 ? "1px solid var(--char-700)" : 0,
                  display:"flex", alignItems:"center", gap:14,
                }}>
                  <span style={{width:24, fontFamily:"var(--font-title)", fontSize:13, color:"var(--char-400)"}}>{r.rank}</span>
                  <Avatar initials={r.avatar} size={32} tone={r.you ? "citrus" : "olive"}/>
                  <div style={{flex:1, minWidth:0, display:"flex", alignItems:"center", gap:8}}>
                    <span style={{color:"var(--cream-100)", fontWeight:600, fontSize:13,
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{r.name}</span>
                    {r.nat ? <Flag code={r.nat} size={14}/> : null}
                  </div>
                  <span style={{fontSize:12, color:"var(--char-300)", fontFamily:"var(--font-mono)", minWidth:60, textAlign:"right"}}>{r.pts} pts</span>
                  <div style={{width:170, textAlign:"right"}}>
                    {r.you ? (
                      <Pill tone="ghost">Vos</Pill>
                    ) : confirmExpel === r.id ? (
                      <div style={{display:"inline-flex", gap:6}}>
                        <Btn size="sm" variant="primary" onClick={()=>doExpel(r.id)}>
                          {expelling === r.id ? "..." : "Sí, expulsar"}
                        </Btn>
                        <Btn size="sm" variant="ghost" onClick={()=>setConfirmExpel(null)}>No</Btn>
                      </div>
                    ) : (
                      <Btn size="sm" variant="ghost" onClick={()=>setConfirmExpel(r.id)}>Expulsar</Btn>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "especiales" && (
          <div style={{maxWidth:640}}>
            <div style={{marginBottom:18}}>
              <Eyebrow color="var(--neon-citrus)">Panel · Tamarindo</Eyebrow>
              <h1 style={{
                fontFamily:"var(--font-title)", fontSize:36, color:"var(--cream-100)",
                textTransform:"uppercase", letterSpacing:"0.02em", margin:"4px 0 0",
              }}>Especiales · respuestas oficiales</h1>
            </div>
            {window.AdminSpecials ? <AdminSpecials/> : null}
          </div>
        )}

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

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
