/* ============================================================
   PRODE REFUGIO — Componentes compartidos
   ============================================================ */

const { useState, useEffect, useRef } = React;

/* ---------- Flag ---------- */
function Flag({ code, size = 28, ring = false }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      backgroundImage: `url(${window.FLAG(code)})`,
      backgroundSize: "cover", backgroundPosition: "center",
      boxShadow: ring ? "0 0 0 2px var(--cream-100), 0 0 0 3px var(--char-700)" : "inset 0 0 0 1px rgba(245,238,217,0.18)",
      flexShrink: 0,
    }}/>
  );
}

/* ---------- Eyebrow ---------- */
function Eyebrow({ children, color = "var(--neon-citrus)", style }) {
  return <div style={{
    fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase",
    fontWeight: 600, color, fontFamily: "var(--font-body)", ...style,
  }}>{children}</div>;
}

/* ---------- Pill (status / phase chip) ---------- */
function Pill({ children, tone = "ghost", style }) {
  const tones = {
    ghost:  { bg:"transparent", color:"var(--char-200)", border:"1px solid rgba(245,238,217,0.18)" },
    live:   { bg:"var(--neon-coral)", color:"var(--char-900)", border:"0" },
    open:   { bg:"transparent", color:"var(--neon-citrus)", border:"1px solid var(--neon-citrus)" },
    closed: { bg:"transparent", color:"var(--char-400)", border:"1px solid var(--char-500)" },
    done:   { bg:"var(--char-700)", color:"var(--char-200)", border:"1px solid var(--char-600)" },
    orange: { bg:"var(--orange-500)", color:"var(--cream-50)", border:"0" },
  };
  const t = tones[tone] || tones.ghost;
  return <span style={{
    display:"inline-flex", alignItems:"center", gap:6,
    padding:"3px 9px", borderRadius:999,
    fontSize:9, letterSpacing:"0.2em", textTransform:"uppercase", fontWeight:700,
    fontFamily:"var(--font-body)",
    background:t.bg, color:t.color, border:t.border, ...style,
  }}>{children}</span>;
}

/* ---------- Button ---------- */
function Btn({ children, variant="primary", size="md", onClick, full, style, icon }) {
  const sizes = {
    sm: { padding:"9px 14px", fontSize:10 },
    md: { padding:"14px 22px", fontSize:11 },
    lg: { padding:"18px 28px", fontSize:12 },
  };
  const variants = {
    primary: { background:"var(--orange-500)", color:"var(--cream-50)", border:"0" },
    accent:  { background:"var(--neon-citrus)", color:"var(--char-900)", border:"0" },
    ghost:   { background:"transparent", color:"var(--cream-100)", border:"1.5px solid var(--cream-100)" },
    dark:    { background:"var(--char-900)", color:"var(--cream-100)", border:"1px solid var(--char-600)" },
  };
  return (
    <button onClick={onClick} style={{
      width: full ? "100%" : "auto",
      display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
      borderRadius:999, cursor:"pointer", fontFamily:"var(--font-body)",
      fontWeight:700, letterSpacing:"0.22em", textTransform:"uppercase",
      transition:"transform .18s cubic-bezier(.2,.7,.2,1), filter .18s",
      ...sizes[size], ...variants[variant], ...style,
    }}
    onMouseEnter={e=>e.currentTarget.style.transform="translateY(-1px)"}
    onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
      {icon && <i data-lucide={icon} style={{width:14,height:14,strokeWidth:2.25}}></i>}
      {children}
    </button>
  );
}

/* ---------- AppBar (top of mobile screen) ---------- */
function AppBar({ title, subtitle, back, onBack, right }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:12,
      padding:"14px 18px 6px",
      position:"sticky", top:0, zIndex:10,
      background:"linear-gradient(180deg, var(--char-900) 0%, var(--char-900) 70%, rgba(26,25,22,0) 100%)",
    }}>
      {back ? (
        <button onClick={onBack} style={{
          width:36, height:36, borderRadius:"50%", border:"1px solid var(--char-600)",
          background:"var(--char-800)", color:"var(--cream-100)", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <i data-lucide="chevron-left" style={{width:18,height:18}}></i>
        </button>
      ) : (
        <div style={{
          fontFamily:"var(--font-display)", fontSize:22, lineHeight:0.85,
          textTransform:"uppercase", color:"var(--orange-500)",
        }}>
          REFU<br/><span style={{paddingLeft:"0.55em", display:"inline-block", color:"var(--cream-100)"}}>GIO</span>
        </div>
      )}
      <div style={{flex:1, paddingLeft: back ? 0 : 8}}>
        {subtitle && <Eyebrow color="var(--neon-citrus)">{subtitle}</Eyebrow>}
        <div style={{
          fontFamily:"var(--font-title)", fontSize:back?20:18, textTransform:"uppercase",
          color:"var(--cream-100)", letterSpacing:"0.02em", lineHeight:1.05, marginTop:2,
        }}>{title}</div>
      </div>
      {right}
    </div>
  );
}

/* ---------- TabBar (bottom nav) ---------- */
function TabBar({ active, onChange }) {
  const items = [
    { id:"home",     icon:"home",      label:"Home" },
    { id:"matches",  icon:"goal",      label:"Prode" },
    { id:"ranking",  icon:"trophy",    label:"Ranking" },
    { id:"groups",   icon:"users",     label:"Grupos" },
    { id:"profile",  icon:"user",      label:"Yo" },
  ];
  return (
    <nav style={{
      position:"sticky", bottom:10, margin:"0 12px 10px",
      display:"flex", padding:5, borderRadius:999,
      background:"var(--char-900)",
      border:"1px solid var(--char-700)",
      boxShadow:"0 -10px 30px -10px rgba(0,0,0,.6)",
      zIndex:10,
    }}>
      {items.map(it => {
        const on = it.id === active;
        return (
          <button key={it.id} onClick={()=>onChange(it.id)} style={{
            flex:1, padding:"10px 0", border:0, cursor:"pointer",
            display:"flex", flexDirection:"column", alignItems:"center", gap:3,
            background: on ? "var(--orange-500)" : "transparent",
            color: on ? "var(--cream-50)" : "var(--char-200)",
            borderRadius:999, fontSize:8, letterSpacing:"0.2em",
            textTransform:"uppercase", fontWeight:700,
            transition:"all .2s cubic-bezier(.2,.7,.2,1)",
          }}>
            <i data-lucide={it.icon} style={{width:18,height:18,strokeWidth:on?2.25:1.75}}></i>
            <span>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ---------- Avatar (initials disc) ---------- */
function Avatar({ initials, size = 36, tone = "olive", ring = false, you = false, online = false }) {
  const tones = {
    olive:  { bg:"var(--olive-500)",  fg:"var(--cream-50)" },
    orange: { bg:"var(--orange-500)", fg:"var(--cream-50)" },
    sage:   { bg:"var(--sage-300)",   fg:"var(--char-900)" },
    tan:    { bg:"var(--tan-500)",    fg:"var(--cream-50)" },
    citrus: { bg:"var(--neon-citrus)",fg:"var(--char-900)" },
    char:   { bg:"var(--char-700)",   fg:"var(--cream-100)" },
  };
  const t = tones[tone] || tones.olive;
  const disc = (
    <div style={{
      width:size, height:size, borderRadius:"50%",
      background:t.bg, color:t.fg,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"var(--font-title)", fontWeight:700,
      fontSize: size*0.4, letterSpacing:"0.04em",
      boxShadow: you ? "0 0 0 2px var(--neon-citrus), 0 0 0 4px var(--char-900)"
                     : (ring ? "0 0 0 2px var(--cream-100), 0 0 0 3px var(--char-700)" : "none"),
      flexShrink:0,
    }}>{initials}</div>
  );
  if (!online) return disc;
  // Punto verde de "online" en la esquina inferior derecha.
  const dot = Math.max(8, Math.round(size * 0.3));
  return (
    <div style={{position:"relative", width:size, height:size, flexShrink:0}}>
      {disc}
      <span title="En línea" style={{
        position:"absolute", right:-1, bottom:-1,
        width:dot, height:dot, borderRadius:"50%",
        background:"#34d399", border:"2px solid var(--char-900)",
        boxShadow:"0 0 6px rgba(52,211,153,0.7)",
      }}/>
    </div>
  );
}

/* ---------- BadgeChip ---------- */
function BadgeChip({ kind, size = "sm" }) {
  const b = window.BADGES[kind];
  if (!b) return null;
  const small = size === "sm";
  return (
    <div style={{
      display:"inline-flex", alignItems:"center", gap: small?6:8,
      padding: small ? "3px 8px 3px 4px" : "5px 12px 5px 6px",
      background:"var(--char-700)", border:"1px solid var(--char-600)",
      borderRadius:999, color:"var(--cream-100)",
    }}>
      <span style={{
        width: small?16:22, height: small?16:22, borderRadius:"50%",
        background:b.color, color:"var(--char-900)",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontWeight:700, fontSize: small?10:13,
      }}>{b.emoji}</span>
      <span style={{
        fontSize: small?9:11, letterSpacing:"0.18em", textTransform:"uppercase",
        fontFamily:"var(--font-body)", fontWeight:700,
      }}>{b.label}</span>
    </div>
  );
}

/* ---------- Countdown ---------- */
function Countdown({ target = "2026-06-12T18:00:00", label = "Argentina vs Croacia" }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(()=>setNow(Date.now()), 1000); return ()=>clearInterval(t); }, []);
  const diff = Math.max(0, new Date(target).getTime() - now);
  const d = Math.floor(diff/86400000);
  const h = Math.floor((diff%86400000)/3600000);
  const m = Math.floor((diff%3600000)/60000);
  const s = Math.floor((diff%60000)/1000);
  const Cell = ({ v, l }) => (
    <div style={{flex:1, textAlign:"center"}}>
      <div style={{
        fontFamily:"var(--font-title)", fontSize:36, color:"var(--cream-100)",
        lineHeight:1, letterSpacing:"0.02em",
      }}>{String(v).padStart(2,"0")}</div>
      <div style={{
        fontSize:9, letterSpacing:"0.24em", color:"var(--char-400)",
        textTransform:"uppercase", fontWeight:600, marginTop:6,
      }}>{l}</div>
    </div>
  );
  return (
    <div>
      <div style={{display:"flex", gap:6}}>
        <Cell v={d} l="Días"/>
        <div style={{color:"var(--char-600)", fontFamily:"var(--font-title)", fontSize:32}}>:</div>
        <Cell v={h} l="Hs"/>
        <div style={{color:"var(--char-600)", fontFamily:"var(--font-title)", fontSize:32}}>:</div>
        <Cell v={m} l="Min"/>
        <div style={{color:"var(--char-600)", fontFamily:"var(--font-title)", fontSize:32}}>:</div>
        <Cell v={s} l="Seg"/>
      </div>
      <div style={{
        marginTop:10, fontSize:11, letterSpacing:"0.16em", textTransform:"uppercase",
        color:"var(--char-200)", fontWeight:600, textAlign:"center",
      }}>Próximo: <span style={{color:"var(--neon-citrus)"}}>{label}</span></div>
    </div>
  );
}

/* Círculo neutro con "?" para un equipo todavía "a definir" (eliminación). */
function TbdFlag({ size = 32 }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%", flexShrink:0,
      background:"var(--char-700)", border:"1px solid var(--char-600)",
      display:"flex", alignItems:"center", justifyContent:"center",
      color:"var(--char-400)", fontFamily:"var(--font-title)", fontSize:size*0.5,
    }}>?</div>
  );
}

/* ---------- MatchRow (compact) ---------- */
function MatchRow({ match, prediction, onChange, locked }) {
  const m = match;
  const live = m.status === "vivo";
  const done = m.status === "finalizado";
  const open = m.status === "abierto";
  // "A definir": algún equipo del cruce todavía no está confirmado (eliminación).
  const tbd = !window.ProdeScoring.teamsKnown(m);

  // For done matches, show real score; for vivo, show real running score; for open, show inputs.
  const showLiveScore = live || done;

  return (
    <div style={{
      background: live ? "linear-gradient(180deg, rgba(255,122,61,0.08), rgba(255,122,61,0) 60%), var(--char-800)" : "var(--char-800)",
      border: live ? "1px solid var(--neon-coral)" : "1px solid var(--char-700)",
      borderRadius: 22, padding: "14px 14px 12px", marginBottom: 12,
    }}>
      {/* top row: phase + status */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
        <Eyebrow color="var(--char-400)" style={{letterSpacing:"0.18em"}}>{m.phase}</Eyebrow>
        {live ? <Pill tone="live"><span style={{
          width:6, height:6, borderRadius:"50%", background:"var(--char-900)",
          animation:"pulse 1.2s infinite",
        }}/>EN VIVO · {m.minute}</Pill> :
         done ? <Pill tone="done">FT</Pill> :
         <Pill tone="open">Abierto</Pill>}
      </div>

      {/* match body */}
      <div style={{
        display:"grid",
        gridTemplateColumns:"1fr 88px 1fr",
        alignItems:"center", gap:6,
      }}>
        {/* TEAM A */}
        <div style={{display:"flex", alignItems:"center", gap:10, justifyContent:"flex-start"}}>
          {m.a ? <Flag code={m.a} size={32}/> : <TbdFlag size={32}/>}
          <div>
            <div style={{
              fontFamily:"var(--font-title)", fontSize: m.a ? 16 : 12, color:"var(--cream-100)",
              textTransform:"uppercase", letterSpacing:"0.02em", lineHeight:1.05,
            }}>{m.a ? window.TEAMS[m.a] : (m.aLabel || "A definir")}</div>
            {m.a && <div style={{fontSize:9, color:"var(--char-400)", letterSpacing:"0.18em", marginTop:3, fontWeight:600}}>{m.a}</div>}
          </div>
        </div>

        {/* SCORE */}
        <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap:6}}>
          {showLiveScore ? (
            <>
              <div style={{
                fontFamily:"var(--font-title)", fontSize:28,
                color: live ? "var(--neon-coral)" : "var(--cream-100)",
              }}>{m.scoreA}</div>
              <div style={{color:"var(--char-500)", fontSize:18}}>–</div>
              <div style={{
                fontFamily:"var(--font-title)", fontSize:28,
                color: live ? "var(--neon-coral)" : "var(--cream-100)",
              }}>{m.scoreB}</div>
            </>
          ) : tbd ? (
            <div style={{color:"var(--char-500)", fontSize:22, fontFamily:"var(--font-title)"}}>–</div>
          ) : (
            <>
              <NumStepper value={prediction?.a} onChange={(v)=>onChange?.({a:v, b:prediction?.b ?? 0})} disabled={locked}/>
              <div style={{color:"var(--char-500)", fontSize:14}}>–</div>
              <NumStepper value={prediction?.b} onChange={(v)=>onChange?.({a:prediction?.a ?? 0, b:v})} disabled={locked}/>
            </>
          )}
        </div>

        {/* TEAM B */}
        <div style={{display:"flex", alignItems:"center", gap:10, justifyContent:"flex-end"}}>
          <div style={{textAlign:"right"}}>
            <div style={{
              fontFamily:"var(--font-title)", fontSize: m.b ? 16 : 12, color:"var(--cream-100)",
              textTransform:"uppercase", letterSpacing:"0.02em", lineHeight:1.05,
            }}>{m.b ? window.TEAMS[m.b] : (m.bLabel || "A definir")}</div>
            {m.b && <div style={{fontSize:9, color:"var(--char-400)", letterSpacing:"0.18em", marginTop:3, fontWeight:600}}>{m.b}</div>}
          </div>
          {m.b ? <Flag code={m.b} size={32}/> : <TbdFlag size={32}/>}
        </div>
      </div>

      {open && tbd && (
        <div style={{
          marginTop:10, padding:"7px 10px", borderRadius:14,
          background:"var(--char-900)", border:"1px dashed var(--char-600)",
          fontSize:11, color:"var(--char-300)", textAlign:"center", letterSpacing:"0.04em",
        }}>
          Se habilita cuando se conozcan los equipos
        </div>
      )}
      {/* For open matches, show your prediction (mini) */}
      {open && prediction && (
        <div style={{
          marginTop:10, padding:"7px 10px", borderRadius:14,
          background:"var(--char-900)", border:"1px dashed var(--char-600)",
          display:"flex", alignItems:"center", justifyContent:"space-between",
        }}>
          <Eyebrow color="var(--neon-citrus)">Tu predicción</Eyebrow>
          <div style={{fontFamily:"var(--font-title)", fontSize:14, color:"var(--cream-100)"}}>
            {prediction.a} – {prediction.b}
          </div>
        </div>
      )}
      {done && prediction && (
        <div style={{
          marginTop:10, padding:"7px 10px", borderRadius:14,
          background: prediction.points >= 5 ? "rgba(232,242,106,0.12)" : prediction.points > 0 ? "rgba(255,122,61,0.10)" : "var(--char-900)",
          border:"1px solid " + (prediction.points >= 5 ? "var(--neon-citrus)" : prediction.points > 0 ? "var(--orange-500)" : "var(--char-700)"),
          display:"flex", alignItems:"center", justifyContent:"space-between",
        }}>
          <Eyebrow color={prediction.points >= 5 ? "var(--neon-citrus)" : "var(--char-200)"}>
            Predijiste {prediction.a}–{prediction.b}
          </Eyebrow>
          <div style={{
            fontFamily:"var(--font-title)", fontSize:14,
            color: prediction.points >= 5 ? "var(--neon-citrus)" : prediction.points > 0 ? "var(--orange-400)" : "var(--char-400)",
          }}>
            {prediction.points >= 5 ? "+5 EXACTO" : prediction.points > 0 ? `+${prediction.points} GANADOR` : "0 PUNTOS"}
          </div>
        </div>
      )}

      {/* footer: date/venue */}
      <div style={{
        marginTop:10, display:"flex", alignItems:"center", justifyContent:"space-between", gap:8,
        fontSize:10, color:"var(--char-400)", letterSpacing:"0.08em",
      }}>
        <span style={{display:"inline-flex",alignItems:"center",gap:5}}>
          <i data-lucide="calendar" style={{width:11,height:11}}></i>
          {m.date} · {m.time}
        </span>
        <span style={{display:"inline-flex",alignItems:"center",gap:5, opacity:0.8}}>
          <i data-lucide="map-pin" style={{width:11,height:11}}></i>
          {m.venue}
        </span>
      </div>
    </div>
  );
}

/* Selector "¿Quién avanzó?" para un partido de eliminación con marcador empatado
   (se define por penales). Se auto-oculta si no aplica. onPick recibe el código. */
function PenaltyPicker({ match, onPick, style }) {
  const m = match;
  const tie = m.round && m.a && m.b
    && Number.isFinite(Number(m.scoreA)) && Number.isFinite(Number(m.scoreB))
    && Number(m.scoreA) === Number(m.scoreB);
  if (!tie) return null;
  return (
    <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", ...(style||{}) }}>
      <span style={{ fontSize:10, color:"var(--char-400)", letterSpacing:"0.12em", fontWeight:700 }}>¿QUIÉN AVANZÓ?</span>
      {[m.a, m.b].map((code) => (
        <button key={code} onClick={() => onPick(code)} style={{
          padding:"4px 10px", borderRadius:999, cursor:"pointer",
          border:`1px solid ${m.advances === code ? "var(--neon-citrus)" : "var(--char-600)"}`,
          background: m.advances === code ? "var(--neon-citrus)" : "transparent",
          color: m.advances === code ? "var(--char-900)" : "var(--cream-100)",
          fontSize:11, fontWeight:700, fontFamily:"var(--font-body)",
          display:"inline-flex", alignItems:"center", gap:5,
        }}>
          <Flag code={code} size={14}/>{window.TEAMS[code]}
        </button>
      ))}
    </div>
  );
}

/* ---------- NumStepper ---------- */
function NumStepper({ value, onChange, disabled }) {
  return (
    <div style={{
      display:"flex", flexDirection:"column", alignItems:"center", gap:2,
    }}>
      <button disabled={disabled} onClick={()=>onChange?.(Math.min(9,(value||0)+1))} style={{
        width:24, height:18, border:0, borderRadius:6,
        background:"var(--char-700)", color:"var(--cream-100)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.3 : 1,
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>
        <i data-lucide="chevron-up" style={{width:13,height:13}}></i>
      </button>
      <div style={{
        width:34, height:34, borderRadius:10,
        background:"var(--char-900)",
        border: disabled ? "1px solid var(--char-700)" : "1.5px solid var(--neon-citrus)",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:"var(--font-title)", fontSize:18,
        color: disabled ? "var(--char-400)" : "var(--cream-100)",
      }}>{value ?? "X"}</div>
      <button disabled={disabled} onClick={()=>onChange?.(Math.max(0,(value||0)-1))} style={{
        width:24, height:18, border:0, borderRadius:6,
        background:"var(--char-700)", color:"var(--cream-100)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.3 : 1,
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>
        <i data-lucide="chevron-down" style={{width:13,height:13}}></i>
      </button>
    </div>
  );
}

/* ---------- PrizesBlock (premios del torneo + semanal) ---------- */
function PrizesBlock({ heading = true }) {
  const P = window.PRIZES;
  if (!P) return null;
  const toneColor = {
    citrus: "var(--neon-citrus)", orange: "var(--orange-400)", char: "var(--char-200)",
  };
  return (
    <div>
      {heading && (
        <>
          <Eyebrow color="var(--neon-citrus)" style={{paddingLeft:4}}>Lo que se gana</Eyebrow>
          <h3 style={{
            fontFamily:"var(--font-title)", fontSize:26, color:"var(--cream-100)",
            textTransform:"uppercase", letterSpacing:"0.02em", margin:"4px 0 14px", paddingLeft:4,
          }}>Premios de la casa</h3>
        </>
      )}

      {/* Podio del ranking */}
      <div style={{display:"flex", flexDirection:"column", gap:10}}>
        {P.podium.map(p => (
          <div key={p.rank} style={{
            display:"flex", alignItems:"center", gap:14,
            padding:"14px 16px", borderRadius:18,
            background:"var(--char-800)",
            border:`1px solid ${p.rank === 1 ? "var(--neon-citrus)" : "var(--char-700)"}`,
          }}>
            <div style={{
              width:46, height:46, borderRadius:"50%", flexShrink:0,
              background:"var(--char-900)", border:`1.5px solid ${toneColor[p.tone]}`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontFamily:"var(--font-title)", fontSize:18, color:toneColor[p.tone],
            }}>{p.rank}°</div>
            <div style={{flex:1, minWidth:0}}>
              <Eyebrow color={toneColor[p.tone]} style={{fontSize:9}}>{p.eyebrow}</Eyebrow>
              <div style={{
                fontFamily:"var(--font-body)", fontSize:13, color:"var(--cream-100)",
                fontWeight:600, marginTop:3, lineHeight:1.35,
              }}>{p.reward}</div>
            </div>
            <i data-lucide={p.icon} style={{width:20, height:20, color:toneColor[p.tone], flexShrink:0}}></i>
          </div>
        ))}
      </div>

      {/* Premio semanal rotativo */}
      <div style={{
        marginTop:10, padding:16, borderRadius:18,
        background:"linear-gradient(135deg, var(--orange-700), var(--char-800))",
        border:"1px solid var(--orange-500)",
        display:"flex", alignItems:"center", gap:14,
      }}>
        <div style={{
          width:46, height:46, borderRadius:"50%", flexShrink:0,
          background:"var(--char-900)", border:"1.5px solid var(--neon-citrus)",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <i data-lucide="utensils" style={{width:22, height:22, color:"var(--neon-citrus)"}}></i>
        </div>
        <div style={{flex:1, minWidth:0}}>
          <Eyebrow color="var(--neon-citrus)">{P.weekly.title} · rota cada semana</Eyebrow>
          <div style={{
            fontFamily:"var(--font-title)", fontSize:16, color:"var(--cream-100)",
            textTransform:"uppercase", letterSpacing:"0.02em", marginTop:3,
          }}>{P.weekly.reward}</div>
          <div style={{fontSize:11, color:"var(--char-200)", marginTop:4, lineHeight:1.4}}>
            {P.weekly.sub}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- InstallApp: instalar la PWA ----------
   Android/Chrome: botón real (evento beforeinstallprompt).
   iOS/Safari: Apple no permite instalación programática → instrucciones.
   Si ya está instalada (standalone) o el navegador no la ofrece, no se muestra. */
function InstallApp() {
  const [deferred, setDeferred] = useState(null);
  const [iosHelp, setIosHelp] = useState(false);

  const ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isStandalone = (typeof window !== "undefined") && (
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    window.navigator.standalone === true
  );

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (isStandalone) return null;          // ya está instalada
  if (!isIOS && !deferred) return null;   // Android no la ofreció todavía / desktop: no mostramos

  const onInstall = async () => {
    if (isIOS) { setIosHelp(true); return; }
    if (deferred) {
      deferred.prompt();
      try { await deferred.userChoice; } catch (e) { /* cancelado */ }
      setDeferred(null);
    }
  };

  return (
    <div style={{
      borderRadius:18, padding:"14px 16px",
      background:"var(--char-800)", border:"1px solid var(--neon-citrus)",
      display:"flex", alignItems:"center", gap:14,
    }}>
      <div style={{
        width:46, height:46, borderRadius:14, flexShrink:0,
        background:"var(--char-900)", border:"1px solid var(--char-700)",
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>
        <i data-lucide="download" style={{width:22, height:22, color:"var(--neon-citrus)"}}></i>
      </div>
      <div style={{flex:1, minWidth:0}}>
        <div style={{
          fontFamily:"var(--font-title)", fontSize:15, color:"var(--cream-100)",
          textTransform:"uppercase", letterSpacing:"0.02em",
        }}>Instalá la app</div>
        <div style={{fontSize:11, color:"var(--char-300)", marginTop:2}}>Tenela en tu inicio, como una app más.</div>
      </div>
      <Btn size="sm" variant="accent" onClick={onInstall}>Instalar</Btn>

      {iosHelp && (
        <div onClick={()=>setIosHelp(false)} style={{
          position:"fixed", inset:0, zIndex:120, background:"rgba(0,0,0,0.72)",
          display:"flex", alignItems:"flex-end", justifyContent:"center", padding:14,
        }}>
          <div onClick={(e)=>e.stopPropagation()} style={{
            width:"100%", maxWidth:420, borderRadius:22, padding:"20px 18px 22px",
            background:"var(--char-800)", border:"1px solid var(--char-700)",
          }}>
            <div style={{
              fontFamily:"var(--font-title)", fontSize:18, color:"var(--cream-100)",
              textTransform:"uppercase", letterSpacing:"0.02em",
            }}>Instalar en iPhone</div>
            <div style={{fontSize:13, color:"var(--char-200)", lineHeight:1.7, marginTop:10}}>
              Tiene que ser desde <b style={{color:"var(--neon-citrus)"}}>Safari</b>:<br/>
              1. Tocá el botón <b style={{color:"var(--neon-citrus)"}}>Compartir</b> (el cuadrado con la flecha ↑).<br/>
              2. Elegí <b style={{color:"var(--neon-citrus)"}}>"Agregar a inicio"</b>.<br/>
              3. Tocá <b style={{color:"var(--neon-citrus)"}}>Agregar</b>. ¡Listo!
            </div>
            <Btn full size="md" variant="accent" style={{marginTop:16}} onClick={()=>setIosHelp(false)}>Entendido</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Card (generic) ---------- */
function Card({ children, style, dark = true, glow = false, padding = 16 }) {
  return (
    <div style={{
      background: dark ? "var(--char-800)" : "var(--cream-100)",
      border: glow ? "1px solid var(--neon-citrus)" : "1px solid var(--char-700)",
      borderRadius:22, padding,
      boxShadow: glow ? "0 0 24px -8px rgba(232,242,106,0.4)" : "none",
      ...style,
    }}>{children}</div>
  );
}

Object.assign(window, {
  Flag, Eyebrow, Pill, Btn, AppBar, TabBar, Avatar, BadgeChip,
  Countdown, MatchRow, NumStepper, Card, PrizesBlock, InstallApp,
});
