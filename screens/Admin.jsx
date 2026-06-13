/* ============================================================
   SCREEN: Admin (panel Refugio) — vista compacta dentro del phone,
   con un toggle para "ver completa" que abre overlay desktop.
   ============================================================ */

function Admin({ go }) {
  const [tab, setTab] = useState("resultados");
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

  const [players, setPlayers] = useState([]);
  const [priv, setPriv] = useState({}); // { uid: { phone, email } } — sólo admin
  const [confirmExpel, setConfirmExpel] = useState(null); // uid con confirmación pendiente
  const [expelling, setExpelling] = useState(null);

  useEffect(() => {
    const unsub = window.ProdeDB?.subscribeRanking?.((list) => setPlayers(list));
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    const unsub = window.ProdeDB?.subscribePlayersPrivate?.((map) => setPriv(map || {}));
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
          {id:"resultados", label:"Resultados", icon:"check-check"},
          {id:"especiales", label:"Especiales", icon:"star"},
          {id:"partidos",   label:"Partidos", icon:"goal"},
          {id:"jugadores",  label:"Jugadores", icon:"users"},
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
            padding:"10px 13px", borderRadius:14, marginBottom:12,
            background:"var(--char-800)", border:"1px solid var(--orange-500)",
            display:"flex", alignItems:"flex-start", gap:10,
          }}>
            <i data-lucide="alert-triangle" style={{width:15, height:15, color:"var(--orange-400)", flexShrink:0, marginTop:1}}></i>
            <div style={{fontSize:11, color:"var(--char-200)", lineHeight:1.5}}>
              En eliminación cargá el marcador <span style={{color:"var(--cream-100)", fontWeight:700}}>al final del alargue</span>,
              nunca el ganador de los penales. Si se definió por penales, va el <span style={{color:"var(--neon-citrus)", fontWeight:700}}>empate</span>.
            </div>
          </div>
          <div style={{
            borderRadius:18, overflow:"hidden",
            background:"var(--char-800)", border:"1px solid var(--char-700)",
          }}>
            {matches.map((m, i) => (
              <div key={m.id} style={{
                padding:"12px 13px",
                borderBottom: i < matches.length - 1 ? "1px solid var(--char-700)" : 0,
                display:"flex", alignItems:"center", gap:10,
              }}>
                <Flag code={m.a} size={22}/>
                <input
                  type="number"
                  value={m.scoreA ?? ""}
                  placeholder="X"
                  onChange={e => editScore(m.id, "scoreA", e.target.value)}
                  style={scoreInputStyle}
                />
                <span style={{color:"var(--char-500)", fontSize:16, fontFamily:"var(--font-title)"}}>–</span>
                <input
                  type="number"
                  value={m.scoreB ?? ""}
                  placeholder="X"
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

      {tab === "especiales" && (
        <div style={{padding:"22px 16px 0"}}>
          <Eyebrow color="var(--neon-citrus)">Respuestas oficiales</Eyebrow>
          <h3 style={{
            fontFamily:"var(--font-title)", fontSize:20, color:"var(--cream-100)",
            textTransform:"uppercase", letterSpacing:"0.02em", margin:"4px 0 12px",
          }}>Especiales</h3>
          <AdminSpecials/>
        </div>
      )}

      {tab === "jugadores" && (
        <div style={{padding:"22px 16px 0"}}>
          <Eyebrow color="var(--neon-citrus)">Jugadores · {players.length}</Eyebrow>
          <h3 style={{
            fontFamily:"var(--font-title)", fontSize:20, color:"var(--cream-100)",
            textTransform:"uppercase", letterSpacing:"0.02em", margin:"4px 0 12px",
          }}>Administrar</h3>
          {players.length === 0 && (
            <div style={{padding:14, color:"var(--char-300)", fontSize:12,
              borderRadius:14, background:"var(--char-800)", border:"1px solid var(--char-700)"}}>
              Todavía no hay jugadores registrados.
            </div>
          )}
          <div style={{display:"flex", flexDirection:"column", gap:8}}>
            {(window.ProdeRanking?.rankingRowsFromPlayers?.(players, myUid) || []).map((r) => (
              <div key={r.id} style={{
                display:"flex", alignItems:"center", gap:11,
                padding:"10px 13px", borderRadius:16,
                background:"var(--char-800)", border:"1px solid var(--char-700)",
              }}>
                <Avatar initials={r.avatar} size={30} tone={r.you ? "citrus" : "olive"}/>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontFamily:"var(--font-body)", fontSize:13, color:"var(--cream-100)", fontWeight:600,
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{r.name}</div>
                  <div style={{display:"flex", alignItems:"center", gap:6, marginTop:2}}>
                    {r.nat ? <Flag code={r.nat} size={11}/> : null}
                    <span style={{fontSize:10, color:"var(--char-400)", letterSpacing:"0.04em"}}>{r.pts} pts</span>
                  </div>
                  {priv[r.id]?.phone ? (
                    <a href={`https://wa.me/${String(priv[r.id].phone).replace(/[^\d]/g, "")}`}
                       target="_blank" rel="noreferrer"
                       style={{fontSize:11, color:"var(--neon-citrus)", textDecoration:"none", marginTop:3, display:"inline-block"}}>
                      {priv[r.id].phone}
                    </a>
                  ) : null}
                </div>
                {r.you ? (
                  <Pill tone="ghost">Vos</Pill>
                ) : confirmExpel === r.id ? (
                  <div style={{display:"flex", gap:6}}>
                    <Btn size="sm" variant="primary" onClick={()=>doExpel(r.id)}>
                      {expelling === r.id ? "..." : "Sí, expulsar"}
                    </Btn>
                    <Btn size="sm" variant="ghost" onClick={()=>setConfirmExpel(null)}>No</Btn>
                  </div>
                ) : (
                  <Btn size="sm" variant="ghost" onClick={()=>setConfirmExpel(r.id)}>Expulsar</Btn>
                )}
              </div>
            ))}
          </div>
          <div style={{marginTop:12, fontSize:10, color:"var(--char-500)", letterSpacing:"0.04em", lineHeight:1.5}}>
            Expulsar borra al jugador y todas sus predicciones. No se puede deshacer.
          </div>
        </div>
      )}

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

/* ---------- AdminSpecials: respuestas oficiales de los especiales ----------
   Compartido entre el Admin mobile y el DesktopAdmin (app.jsx). Confirmar
   reparte +5 a cada acertante (idempotente; corregir y re-confirmar recalcula). */
const SPECIAL_TEAM_OPTS = window.SPECIAL_TEAMS || ["ARG","BRA","FRA","ESP","ENG","POR","GER","NED","MAR","URU","COL","CRO","BEL","JPN","USA","MEX"];
const SPECIAL_DEFS = [
  { key:"campeon",    label:"Campeón del Mundial", type:"team" },
  { key:"subcampeon", label:"Subcampeón",          type:"team" },
  { key:"goleador",   label:"Goleador del torneo", type:"name", options: window.SPECIAL_SCORERS },
  { key:"arquero",    label:"Mejor arquero",       type:"name", options: window.SPECIAL_KEEPERS },
  { key:"continente", label:"Continente del ganador", type:"choice", options: window.SPECIAL_CONTINENTS },
  { key:"fairplay",   label:"Equipo Fair Play",    type:"team" },
];

function AdminSpecials() {
  const [official, setOfficial] = useState({});
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    const unsub = window.ProdeDB?.subscribeSpecialResults?.((res) => setOfficial(res || {}));
    return () => unsub && unsub();
  }, []);

  const setDraft = (key, value) => setDrafts((d) => ({ ...d, [key]: value }));

  const confirm = async (key) => {
    const value = String(drafts[key] || "").trim();
    if (!value) return;
    setSaving(key);
    try {
      await window.ProdeDB?.confirmSpecialResult?.(key, value);
      setDrafts((d) => { const n = { ...d }; delete n[key]; return n; });
    } catch (e) {
      console.error("[Prode Refugio] confirmar especial", e);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div>
      <div style={{
        padding:"10px 13px", borderRadius:14, marginBottom:12,
        background:"var(--char-800)", border:"1px solid var(--char-700)",
        fontSize:11, color:"var(--char-300)", lineHeight:1.5,
      }}>
        Confirmar reparte <span style={{color:"var(--neon-citrus)", fontWeight:700}}>+5</span> a
        cada jugador que acertó. Corregir y re-confirmar recalcula sin duplicar.
      </div>
      {SPECIAL_DEFS.map((def) => {
        const current = official[def.key];
        const draft = drafts[def.key] || "";
        const busy = saving === def.key;
        return (
          <div key={def.key} style={{
            borderRadius:18, padding:"14px 14px 12px", marginBottom:10,
            background:"var(--char-800)",
            border:`1px solid ${current ? "var(--neon-citrus)" : "var(--char-700)"}`,
          }}>
            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginBottom:8}}>
              <div style={{
                fontFamily:"var(--font-title)", fontSize:14, color:"var(--cream-100)",
                textTransform:"uppercase", letterSpacing:"0.02em",
              }}>{def.label}</div>
              {current
                ? <Pill tone="done">OFICIAL: {current}</Pill>
                : <Pill tone="open">Sin confirmar</Pill>}
            </div>
            {def.type === "team" ? (
              <div style={{display:"flex", gap:6, flexWrap:"wrap", padding:"2px 0 6px"}}>
                {SPECIAL_TEAM_OPTS.map((c) => {
                  const on = draft === c;
                  return (
                    <button key={c} onClick={()=>setDraft(def.key, c)} style={{
                      flexShrink:0, padding:6, borderRadius:12, cursor:"pointer",
                      background: on ? "var(--char-700)" : "var(--char-900)",
                      border:`1.5px solid ${on ? "var(--neon-citrus)" : "var(--char-700)"}`,
                      display:"flex", flexDirection:"column", alignItems:"center", gap:4, minWidth:50,
                    }}>
                      <Flag code={c} size={24}/>
                      <span style={{fontSize:8, color:"var(--cream-100)", letterSpacing:"0.14em", fontWeight:700}}>{c}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div>
                <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:8}}>
                  {(def.options || []).map((opt) => {
                    const name = typeof opt === "string" ? opt : opt.name;
                    const team = typeof opt === "string" ? null : opt.team;
                    const on = draft === name;
                    return (
                      <button key={name} onClick={()=>setDraft(def.key, name)} style={{
                        display:"inline-flex", alignItems:"center", gap:6,
                        padding:"5px 11px 5px 6px", borderRadius:999, cursor:"pointer",
                        border:`1px solid ${on ? "var(--neon-citrus)" : "var(--char-600)"}`,
                        background: on ? "var(--neon-citrus)" : "transparent",
                        color: on ? "var(--char-900)" : "var(--cream-100)",
                        fontSize:10, fontWeight:600, fontFamily:"var(--font-body)",
                      }}>
                        {team && <Flag code={team} size={16}/>}
                        {name}
                      </button>
                    );
                  })}
                </div>
                {def.type === "name" && (
                  <input
                    value={draft}
                    placeholder="U otro nombre..."
                    onChange={(e)=>setDraft(def.key, e.target.value)}
                    style={{
                      width:"100%", height:34, borderRadius:10, padding:"0 12px",
                      background:"var(--char-900)", color:"var(--cream-100)",
                      border:"1px solid var(--char-600)", outline:"none",
                      fontFamily:"var(--font-body)", fontSize:12, boxSizing:"border-box",
                    }}/>
                )}
              </div>
            )}
            <div style={{marginTop:8, display:"flex", justifyContent:"flex-end"}}>
              <Btn size="sm" variant="accent" onClick={()=>confirm(def.key)}>
                {busy ? "Repartiendo..." : current ? "Corregir y re-confirmar" : "Confirmar"}
              </Btn>
            </div>
          </div>
        );
      })}
    </div>
  );
}
window.AdminSpecials = AdminSpecials;

window.Admin = Admin;
