/* ============================================================
   SCREEN: Admin (panel Refugio) — vista compacta dentro del phone,
   con un toggle para "ver completa" que abre overlay desktop.
   ============================================================ */

function Admin({ go }) {
  const [tab, setTab] = useState("partidos");
  const [matches, setMatches] = useState(window.ProdeStore?.getMatches?.() || window.MATCHES);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    const onData = () => {
      setMatches(window.ProdeStore?.getMatches?.() || window.MATCHES);
    };
    window.addEventListener("prode:data", onData);
    return () => window.removeEventListener("prode:data", onData);
  }, []);

  // Edita el marcador en memoria (no finaliza ni reparte puntos todavía).
  const editScore = (id, side, val) => {
    setMatches(ms => ms.map(m => m.id === id ? { ...m, [side]: Number(val) || 0 } : m));
  };

  // Confirma el resultado final del partido: escribe + reparte puntos (idempotente).
  const confirmResult = async (m) => {
    setSaving(m.id);
    try {
      const a = Number(m.scoreA) || 0, b = Number(m.scoreB) || 0;
      if (window.ProdeDB?.finalizeMatch) {
        await window.ProdeDB.finalizeMatch(m.id, a, b);
      } else {
        await window.ProdeStore?.saveMatchResult(m.id, { status: "finalizado", scoreA: a, scoreB: b });
      }
    } catch (e) {
      console.error("[Prode Refugio] confirmar resultado", e);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div style={{paddingBottom:20}}>
      <AppBar back onBack={()=>go("home")} title="Panel Refugio" subtitle="Admin · Tamarindo"
        right={
          <Pill tone="open">ADMIN</Pill>
        }/>

      {/* tabs */}
      <div style={{
        padding:"4px 16px 4px", display:"flex", gap:5, overflowX:"auto", scrollbarWidth:"none",
      }}>
        {[
          {id:"partidos",  label:"Partidos", icon:"goal"},
          {id:"resultados",label:"Resultados", icon:"check-check"},
          {id:"jugadores", label:"Jugadores", icon:"users"},
          {id:"anuncios",  label:"Anuncios", icon:"megaphone"},
          {id:"premios",   label:"Premios", icon:"gift"},
        ].map(t => {
          const on = tab === t.id;
          return (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              flexShrink:0, padding:"8px 12px", borderRadius:999,
              background: on ? "var(--orange-500)" : "transparent",
              color: on ? "var(--cream-50)" : "var(--cream-100)",
              border:`1px solid ${on ? "var(--orange-500)" : "var(--char-600)"}`,
              fontSize:10, letterSpacing:"0.18em", textTransform:"uppercase", fontWeight:700,
              fontFamily:"var(--font-body)", cursor:"pointer",
              display:"inline-flex", alignItems:"center", gap:6,
            }}>
              <i data-lucide={t.icon} style={{width:11,height:11}}></i>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* KPI strip */}
        <div style={{padding:"14px 16px 0"}}>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8}}>
          <KPI v="247" l="Jugadores" delta="+18 hoy" tone="citrus"/>
          <KPI v="1.4K" l="Predicciones" delta="+312 hoy" tone="orange"/>
          <KPI v="98%" l="Cargadas J1" delta="2 falta" tone="sage"/>
        </div>
      </div>

      <div style={{padding:"14px 16px 0"}}>
        <div style={{
          padding:"12px 14px", borderRadius:14,
          background:"var(--char-800)", border:"1px solid var(--char-700)",
          display:"flex", alignItems:"center", gap:10,
        }}>
          <i data-lucide="pencil-line" style={{width:18,height:18,color:"var(--neon-citrus)"}}></i>
          <div style={{flex:1}}>
            <div style={{fontSize:12, color:"var(--cream-100)", fontWeight:700}}>Resultados manuales</div>
            <div style={{fontSize:10, color:"var(--char-400)", marginTop:3}}>
              Carga marcadores desde la pestana Resultados y el ranking se recalcula solo.
            </div>
          </div>
          <Pill tone="open">MANUAL</Pill>
        </div>
      </div>

      {/* CONTENT */}
      {tab === "partidos" && (
        <div style={{padding:"22px 16px 0"}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:10}}>
            <Eyebrow color="var(--neon-citrus)">Calendario · Mundial '26</Eyebrow>
            <Btn variant="primary" size="sm" icon="plus">Nuevo</Btn>
          </div>
          <div style={{
            borderRadius:18, overflow:"hidden",
            background:"var(--char-800)", border:"1px solid var(--char-700)",
          }}>
            {matches.slice(0, 8).map((m, i) => (
              <div key={m.id} style={{
                padding:"12px 13px",
                borderBottom: i<7 ? "1px solid var(--char-700)" : 0,
                display:"flex", alignItems:"center", gap:10,
              }}>
                <Flag code={m.a} size={22}/>
                <div style={{
                  fontFamily:"var(--font-body)", fontSize:11, color:"var(--cream-100)",
                  fontWeight:700,
                }}>{m.a}–{m.b}</div>
                <Flag code={m.b} size={22}/>
                <div style={{flex:1, fontSize:10, color:"var(--char-400)", letterSpacing:"0.06em"}}>
                  {m.date} · {m.time}
                </div>
                {m.status === "vivo" ? <Pill tone="live">VIVO</Pill> :
                 m.status === "finalizado" ? <Pill tone="done">FT</Pill> :
                 <Pill tone="open">OPEN</Pill>}
                <button style={{
                  width:28, height:28, borderRadius:8, border:"1px solid var(--char-600)",
                  background:"var(--char-900)", color:"var(--char-200)", cursor:"pointer",
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                  <i data-lucide="pencil" style={{width:12,height:12}}></i>
                </button>
              </div>
            ))}
          </div>

          <div style={{
            marginTop:14, padding:"12px 14px", borderRadius:14,
            background:"var(--char-800)", border:"1px solid var(--char-700)",
            display:"flex", alignItems:"center", gap:12,
          }}>
            <i data-lucide="clock" style={{width:18,height:18,color:"var(--neon-citrus)"}}></i>
            <div style={{flex:1}}>
              <div style={{
                fontFamily:"var(--font-body)", fontSize:12, color:"var(--cream-100)", fontWeight:700,
              }}>Modo manual</div>
              <div style={{fontSize:10, color:"var(--char-400)", marginTop:3}}>
                Los resultados se cargan desde Admin.
              </div>
            </div>
            <ToggleSwitch on/>
          </div>
        </div>
      )}

      {tab === "resultados" && (
        <div style={{padding:"22px 16px 0"}}>
          <Eyebrow color="var(--neon-citrus)">Cargar / editar resultado</Eyebrow>
          <h3 style={{
            fontFamily:"var(--font-title)", fontSize:20, color:"var(--cream-100)",
            textTransform:"uppercase", letterSpacing:"0.02em", margin:"4px 0 14px",
          }}>Carga manual</h3>
          <div style={{
            borderRadius:18, overflow:"hidden",
            background:"var(--char-800)", border:"1px solid var(--char-700)",
          }}>
            {matches.slice(0, 12).map((m, i) => (
              <div key={m.id} style={{
                padding:"12px 13px",
                borderBottom: i < 11 ? "1px solid var(--char-700)" : 0,
                display:"flex", alignItems:"center", gap:10,
              }}>
                <Flag code={m.a} size={22}/>
                <input
                  type="number"
                  value={m.scoreA || 0}
                  onChange={e => editScore(m.id, "scoreA", e.target.value)}
                  style={scoreInputStyle}
                />
                <span style={{color:"var(--char-500)", fontSize:16, fontFamily:"var(--font-title)"}}>–</span>
                <input
                  type="number"
                  value={m.scoreB || 0}
                  onChange={e => editScore(m.id, "scoreB", e.target.value)}
                  style={scoreInputStyle}
                />
                <Flag code={m.b} size={22}/>
                <Btn
                  size="sm"
                  variant="accent"
                  onClick={() => confirmResult(m)}
                >
                  {saving === m.id ? "Guardando..." : (m.status === "finalizado" ? "Recalcular" : "Confirmar")}
                </Btn>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "jugadores" && (
        <div style={{padding:"22px 16px 0"}}>
          <div style={{
            display:"flex", gap:8, marginBottom:12,
          }}>
            <div style={{flex:1, position:"relative"}}>
              <input placeholder="Buscar jugador..." style={{
                width:"100%", padding:"11px 14px 11px 36px", borderRadius:14,
                background:"var(--char-900)", color:"var(--cream-100)",
                border:"1px solid var(--char-700)", outline:"none",
                fontFamily:"var(--font-body)", fontSize:13, boxSizing:"border-box",
              }}/>
              <i data-lucide="search" style={{
                position:"absolute", left:12, top:12, width:14,height:14,color:"var(--char-400)",
              }}></i>
            </div>
            <Btn variant="ghost" size="md" icon="download">Export</Btn>
          </div>
          <div style={{
            borderRadius:18, overflow:"hidden",
            background:"var(--char-800)", border:"1px solid var(--char-700)",
          }}>
            {window.RANKING.slice(0,8).map((r, i) => (
              <div key={r.rank} style={{
                padding:"10px 13px",
                borderBottom: i<7 ? "1px solid var(--char-700)" : 0,
                display:"flex", alignItems:"center", gap:10,
              }}>
                <Avatar initials={r.avatar} size={28} tone={r.you?"citrus":"olive"}/>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontFamily:"var(--font-body)", fontSize:12, color:"var(--cream-100)", fontWeight:600}}>{r.name}</div>
                  <div style={{fontSize:9, color:"var(--char-400)", letterSpacing:"0.04em", marginTop:2}}>
                    {r.nat} · {r.pts} pts · {r.exact} exactos
                  </div>
                </div>
                <Pill tone="ghost">+506 ··· {String(8000+r.rank*73).slice(-4)}</Pill>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "anuncios" && (
        <div style={{padding:"22px 16px 0"}}>
          <Eyebrow color="var(--neon-citrus)">Publicar anuncio</Eyebrow>
          <div style={{
            marginTop:8, padding:14, borderRadius:18,
            background:"var(--char-800)", border:"1px solid var(--char-700)",
          }}>
            <textarea placeholder="Hoy Argentina vs Brasil en pantalla gigante..." rows={3} style={{
              width:"100%", padding:"12px", borderRadius:12,
              background:"var(--char-900)", color:"var(--cream-100)",
              border:"1px solid var(--char-700)", outline:"none", resize:"none",
              fontFamily:"var(--font-body)", fontSize:13, boxSizing:"border-box",
            }}/>
            <div style={{display:"flex", gap:6, marginTop:10, alignItems:"center"}}>
              <Pill tone="open">AHORA</Pill>
              <Pill tone="ghost">PROMO</Pill>
              <Pill tone="ghost">FECHA</Pill>
              <div style={{flex:1}}/>
              <Btn variant="accent" size="sm" icon="send">Publicar</Btn>
            </div>
          </div>

          <Eyebrow color="var(--char-200)" style={{marginTop:16}}>Publicados</Eyebrow>
          {window.ANNOUNCEMENTS.map(a => (
            <div key={a.id} style={{
              marginTop:8, padding:"12px 14px", borderRadius:16,
              background:"var(--char-800)", border:"1px solid var(--char-700)",
              display:"flex", gap:12, alignItems:"flex-start",
            }}>
              <div style={{
                width:38, height:38, borderRadius:"50%",
                background:"var(--char-900)",
                border:`1.5px solid ${a.color==="neon"?"var(--neon-coral)":a.color==="orange"?"var(--orange-500)":"var(--sage-300)"}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                flexShrink:0,
              }}>
                <i data-lucide={a.icon} style={{width:16,height:16,color:a.color==="neon"?"var(--neon-coral)":a.color==="orange"?"var(--orange-400)":"var(--sage-300)"}}></i>
              </div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:8}}>
                  <div style={{
                    fontFamily:"var(--font-title)", fontSize:14, color:"var(--cream-100)",
                    textTransform:"uppercase", letterSpacing:"0.02em",
                  }}>{a.title}</div>
                  <Pill tone={a.color==="neon"?"live":"ghost"}>{a.tag}</Pill>
                </div>
                <div style={{fontSize:11, color:"var(--char-200)", marginTop:4, lineHeight:1.45}}>{a.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "premios" && (
        <div style={{padding:"22px 16px 0"}}>
          <Eyebrow color="var(--neon-citrus)">Premios activos</Eyebrow>
          <h3 style={{
            fontFamily:"var(--font-title)", fontSize:20, color:"var(--cream-100)",
            textTransform:"uppercase", letterSpacing:"0.02em", margin:"4px 0 12px",
          }}>5 en juego</h3>

          {[
            {n:"Una noche en Refugio Lodge", w:"1° final", c:"citrus"},
            {n:"Cena para dos", w:"2° final", c:"orange"},
            {n:"Open bar", w:"3° final", c:"sage"},
            {n:"Pizza + birra", w:"Mejor de la fecha", c:"tan"},
            {n:"Café Buena Nota", w:"Bonus por exacto", c:"cream"},
          ].map((p,i) => (
            <div key={i} style={{
              marginBottom:8, padding:"12px 14px", borderRadius:16,
              background:"var(--char-800)", border:"1px solid var(--char-700)",
              display:"flex", alignItems:"center", gap:12,
            }}>
              <i data-lucide="gift" style={{width:18,height:18,color:"var(--neon-citrus)"}}></i>
              <div style={{flex:1}}>
                <div style={{
                  fontFamily:"var(--font-title)", fontSize:14, color:"var(--cream-100)",
                  textTransform:"uppercase", letterSpacing:"0.02em",
                }}>{p.n}</div>
                <div style={{fontSize:10, color:"var(--char-400)", marginTop:3, letterSpacing:"0.04em"}}>{p.w}</div>
              </div>
              <ToggleSwitch on/>
            </div>
          ))}

          <Btn full variant="ghost" size="md" icon="plus" style={{marginTop:8}}>
            Crear premio
          </Btn>
        </div>
      )}
    </div>
  );
}

function KPI({ v, l, delta, tone }) {
  const colors = { citrus:"var(--neon-citrus)", orange:"var(--orange-400)", sage:"var(--sage-300)" };
  return (
    <div style={{
      padding:"12px 10px", borderRadius:14,
      background:"var(--char-800)", border:"1px solid var(--char-700)",
    }}>
      <div style={{
        fontFamily:"var(--font-title)", fontSize:22, color:colors[tone], lineHeight:1,
      }}>{v}</div>
      <Eyebrow color="var(--char-200)" style={{marginTop:6, fontSize:8}}>{l}</Eyebrow>
      <div style={{fontSize:9, color:"var(--char-400)", marginTop:3, letterSpacing:"0.04em"}}>↑ {delta}</div>
    </div>
  );
}

const scoreInputStyle = {
  width:42, height:34, borderRadius:8,
  background:"var(--char-900)", color:"var(--cream-100)",
  border:"1px solid var(--char-600)", outline:"none",
  fontFamily:"var(--font-title)", fontSize:15, textAlign:"center",
};

function ToggleSwitch({ on:initOn }) {
  const [on, setOn] = useState(initOn ?? false);
  return (
    <button onClick={()=>setOn(!on)} style={{
      width:38, height:22, borderRadius:999, cursor:"pointer",
      background: on ? "var(--neon-citrus)" : "var(--char-700)",
      border:"1px solid " + (on ? "var(--neon-citrus)" : "var(--char-600)"),
      position:"relative", flexShrink:0, padding:0,
    }}>
      <div style={{
        width:16, height:16, borderRadius:"50%",
        background: on ? "var(--char-900)" : "var(--cream-100)",
        position:"absolute", top:2, left: on ? 19 : 2,
        transition:"left .15s",
      }}/>
    </button>
  );
}

window.Admin = Admin;
