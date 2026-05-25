/* ============================================================
   SCREEN: Matches (predicciones)
   ============================================================ */

function Matches({ go }) {
  const [filter, setFilter] = useState("todos"); // todos | hoy | abiertos | mios
  const [preds, setPreds] = useState({ ...window.MY_PREDICTIONS });
  const [toast, setToast] = useState(null);

  const setPred = (id, val) => {
    setPreds(p => ({ ...p, [id]: val }));
    setToast("Guardado");
    window.ProdeDB?.savePrediction(id, val).catch((error) => {
      console.warn("[Prode Refugio] No se pudo guardar la prediccion.", error);
      setToast("Guardado local");
    });
    setTimeout(()=>setToast(null), 1400);
  };

  const all = window.MATCHES;
  const filtered = all.filter(m => {
    if (filter === "abiertos") return m.status === "abierto";
    if (filter === "hoy")      return m.date.startsWith("Jue 11") || m.status === "vivo";
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
        {Object.entries(groups).map(([date, ms]) => (
          <div key={date}>
            <div style={{
              display:"flex", alignItems:"center", gap:10,
              padding:"14px 0 6px",
            }}>
              <Eyebrow color="var(--neon-citrus)">{date}</Eyebrow>
              <div style={{flex:1, height:1, background:"var(--char-700)"}}/>
              <Eyebrow color="var(--char-500)">{ms.length} partidos</Eyebrow>
            </div>
            {ms.map(m => (
              <MatchRow key={m.id} match={m}
                prediction={preds[m.id]}
                onChange={(v)=>setPred(m.id, v)}
                locked={m.status !== "abierto"}/>
            ))}
          </div>
        ))}
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
                Campeón, goleador, sorpresa →
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
