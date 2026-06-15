/* ============================================================
   SCREEN: Matches (predicciones)
   ============================================================ */

function Matches({ go }) {
  const [filter, setFilter] = useState("todos"); // todos | hoy | abiertos | mios
  const [showPast, setShowPast] = useState(false); // días ya jugados colapsados (vista Todos)
  const [preds, setPreds] = useState(window.ProdeStore?.getPredictions?.() || { ...window.MY_PREDICTIONS });
  const [toast, setToast] = useState(null);
  const [version, setVersion] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onData = () => {
      setPreds(window.ProdeStore?.getPredictions?.() || { ...window.MY_PREDICTIONS });
      setNow(Date.now()); // refresca el cierre por horario ante cualquier cambio de datos
      setVersion(v => v + 1);
    };
    window.addEventListener("prode:data", onData);
    return () => window.removeEventListener("prode:data", onData);
  }, []);

  const setPred = async (id, val) => {
    const match = (window.ProdeStore?.getMatches?.() || window.MATCHES).find(m => m.id === id);
    if (match && window.ProdeScoring?.isLocked?.(match, Date.now())) return; // cerrado: no se edita
    setPreds(p => ({ ...p, [id]: val }));
    setToast("Guardado");
    window.ProdeStore?.savePrediction(id, val).catch((error) => {
      console.warn("[Prode Refugio] No se pudo guardar la prediccion.", error);
      setToast("Guardado local");
    });
    setTimeout(()=>setToast(null), 1400);
  };

  const all = window.ProdeStore?.getMatches?.() || window.MATCHES;
  // Día calendario de Costa Rica (UTC−6) para el filtro "Hoy".
  const crDayKey = (ms) => {
    const d = new Date(ms - 6 * 60 * 60 * 1000);
    return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
  };
  const todayKey = crDayKey(now);
  const filtered = all.filter(m => {
    if (filter === "abiertos") return m.status === "abierto";
    if (filter === "hoy")      return m.status === "vivo" || (m.kickoffAt && crDayKey(Date.parse(m.kickoffAt)) === todayKey);
    if (filter === "mios")     return preds[m.id];
    return true;
  });

  // group by date
  const groups = {};
  filtered.forEach(m => {
    groups[m.date] = groups[m.date] || [];
    groups[m.date].push(m);
  });

  // stats
  const total = all.filter(m => m.status === "abierto").length;
  const done  = Object.keys(preds).filter(id => all.find(m => m.id === id && m.status === "abierto")).length;

  // Medianoche de HOY en Costa Rica (UTC−6): los partidos de días anteriores
  // se agrupan colapsados. Sólo se separan en la vista "Todos".
  const crNow = new Date(now - 6 * 60 * 60 * 1000);
  const todayStartMs = Date.UTC(crNow.getUTCFullYear(), crNow.getUTCMonth(), crNow.getUTCDate()) + 6 * 60 * 60 * 1000;
  const isPastDay = (ms) => ms[0]?.kickoffAt && Date.parse(ms[0].kickoffAt) < todayStartMs;
  const isTodayDay = (ms) => {
    const k = ms[0]?.kickoffAt ? Date.parse(ms[0].kickoffAt) : 0;
    return k >= todayStartMs && k < todayStartMs + 24 * 60 * 60 * 1000;
  };

  const entries = Object.entries(groups); // [date, ms][] en orden cronológico
  const collapsePast = filter === "todos";
  const pastEntries = collapsePast ? entries.filter(([, ms]) => isPastDay(ms)) : [];
  const currentEntries = collapsePast ? entries.filter(([, ms]) => !isPastDay(ms)) : entries;
  const pastCount = pastEntries.reduce((n, [, ms]) => n + ms.length, 0);

  const renderGroup = (date, ms) => (
    <div key={date}>
      <div style={{display:"flex", alignItems:"center", gap:10, padding:"14px 0 6px"}}>
        <Eyebrow color="var(--neon-citrus)">{date}</Eyebrow>
        {isTodayDay(ms) && (
          <span style={{
            fontSize:8, fontWeight:700, letterSpacing:"0.2em", color:"var(--char-900)",
            background:"var(--neon-citrus)", borderRadius:999, padding:"2px 7px",
          }}>HOY</span>
        )}
        <div style={{flex:1, height:1, background:"var(--char-700)"}}/>
        <Eyebrow color="var(--char-500)">{ms.length} partidos</Eyebrow>
      </div>
      {ms.map(m => (
        <MatchRow key={m.id} match={m}
          prediction={preds[m.id]}
          onChange={(v)=>setPred(m.id, v)}
          locked={window.ProdeScoring?.isLocked?.(m, now) ?? (m.status !== "abierto")}/>
      ))}
    </div>
  );

  return (
    <div style={{paddingBottom: 16}}>
      <AppBar title="Predicciones" subtitle={`Mundial 2026 · Fase de grupos`}
        right={
          <div style={{textAlign:"right"}}>
            <div style={{
              fontFamily:"var(--font-title)", fontSize:18, color:"var(--neon-citrus)", lineHeight:1,
            }}>{done}<span style={{color:"var(--char-500)", fontSize:13}}>/{total}</span></div>
            <Eyebrow color="var(--char-400)" style={{fontSize:8}}>Cargadas</Eyebrow>
          </div>
        }/>

      {/* progress bar */}
      <div style={{padding:"0 16px 4px"}}>
        <div style={{
          height:5, borderRadius:999, background:"var(--char-700)", overflow:"hidden",
        }}>
          <div style={{
            width:`${total ? (done/total)*100 : 0}%`, height:"100%",
            background:"linear-gradient(90deg, var(--orange-500), var(--neon-citrus))",
            transition:"width .3s",
          }}/>
        </div>
        <div style={{
          marginTop:7, fontSize:11, color:"var(--char-200)", letterSpacing:"0.06em",
          fontStyle:"italic",
        }}>"Poné el resultado antes de que ruede la pelota."</div>
      </div>

      {/* filters */}
      <div style={{
        padding:"14px 16px 6px",
        display:"flex", gap:7, overflowX:"auto", scrollbarWidth:"none",
      }}>
        {[
          {id:"todos",   label:"Todos"},
          {id:"hoy",     label:"Hoy"},
          {id:"abiertos",label:"Abiertos"},
          {id:"mios",    label:"Mis predicciones"},
        ].map(f => {
          const on = filter === f.id;
          return (
            <button key={f.id} onClick={()=>setFilter(f.id)} style={{
              padding:"7px 14px", borderRadius:999, flexShrink:0,
              border:`1px solid ${on ? "var(--neon-citrus)" : "var(--char-600)"}`,
              background: on ? "var(--neon-citrus)" : "transparent",
              color: on ? "var(--char-900)" : "var(--cream-100)",
              fontFamily:"var(--font-body)", fontWeight:700,
              fontSize:10, letterSpacing:"0.18em", textTransform:"uppercase",
              cursor:"pointer",
            }}>{f.label}</button>
          );
        })}
      </div>

      {/* match groups */}
      <div style={{padding:"12px 16px 0"}}>
        {filtered.length === 0 && (
          <div style={{padding:"28px 16px", textAlign:"center", fontSize:13, color:"var(--char-300)", lineHeight:1.5}}>
            {filter === "hoy" ? "No hay partidos hoy. Mirá el filtro \"Todos\" para los próximos."
              : filter === "mios" ? "Todavía no cargaste predicciones."
              : "No hay partidos para este filtro."}
          </div>
        )}
        {/* días ya jugados: colapsados, se despliegan al tocar (sólo en Todos) */}
        {collapsePast && pastEntries.length > 0 && (
          <div style={{marginBottom: showPast ? 4 : 0}}>
            <button onClick={()=>setShowPast(v=>!v)} style={{
              width:"100%", display:"flex", alignItems:"center", gap:8,
              padding:"11px 12px", borderRadius:12, cursor:"pointer",
              background:"var(--char-800)", border:"1px solid var(--char-700)",
              color:"var(--char-200)", textAlign:"left",
            }}>
              <span style={{fontSize:12, color:"var(--char-400)"}}>{showPast ? "▾" : "▸"}</span>
              <span style={{
                flex:1, fontSize:11, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase",
              }}>Partidos jugados</span>
              <span style={{fontSize:11, color:"var(--char-400)", fontWeight:700}}>{pastCount}</span>
            </button>
            {showPast && pastEntries.map(([date, ms]) => renderGroup(date, ms))}
          </div>
        )}

        {/* hoy + próximos */}
        {currentEntries.map(([date, ms]) => renderGroup(date, ms))}
      </div>

      {/* especiales banner */}
      <div style={{padding:"6px 16px 0"}}>
        <button onClick={()=>go("specials")} style={{
          width:"100%", textAlign:"left", border:0, padding:0, cursor:"pointer",
          background:"transparent",
        }}>
          <div style={{
            borderRadius:22, padding:"18px",
            background:"linear-gradient(135deg, var(--orange-700), var(--char-800))",
            border:"1px solid var(--orange-500)",
            display:"flex", alignItems:"center", gap:14,
          }}>
            <div style={{
              width:54, height:54, borderRadius:"50%",
              background:"var(--char-900)",
              display:"flex", alignItems:"center", justifyContent:"center",
              border:"1.5px solid var(--neon-citrus)",
            }}>
              <i data-lucide="star" style={{width:24,height:24,color:"var(--neon-citrus)",strokeWidth:2}}></i>
            </div>
            <div style={{flex:1}}>
              <Eyebrow color="var(--neon-citrus)">Bonus · 5 pts c/u</Eyebrow>
              <div style={{
                fontFamily:"var(--font-title)", fontSize:18, color:"var(--cream-100)",
                textTransform:"uppercase", letterSpacing:"0.02em", marginTop:3,
              }}>Predicciones especiales</div>
              <div style={{fontSize:11, color:"var(--char-200)", marginTop:4}}>
                Campeón, goleador, fair play →
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* toast */}
      {toast && (
        <div style={{
          position:"fixed", bottom:80, left:"50%", transform:"translateX(-50%)",
          background:"var(--neon-citrus)", color:"var(--char-900)",
          padding:"10px 18px", borderRadius:999,
          fontFamily:"var(--font-body)", fontWeight:700,
          fontSize:11, letterSpacing:"0.22em", textTransform:"uppercase",
          boxShadow:"0 12px 30px -8px rgba(0,0,0,0.5)",
          zIndex:50, display:"flex", alignItems:"center", gap:8,
        }}>
          <i data-lucide="check" style={{width:13,height:13,strokeWidth:3}}></i>
          {toast}
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
      `}</style>
    </div>
  );
}

window.Matches = Matches;
