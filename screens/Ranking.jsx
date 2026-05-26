/* ============================================================
   SCREEN: Ranking general
   ============================================================ */

function Ranking({ go }) {
  const [highlight, setHighlight] = useState(null);
  const [players, setPlayers] = useState(null);

  useEffect(() => {
    // Ranking general en vivo desde Firestore (players orderBy points).
    const unsub = window.ProdeDB?.subscribeRanking?.((list) => setPlayers(list));
    return () => unsub && unsub();
  }, []);

  const myUid = window.ProdeDB?.getUser?.()?.uid;
  const loading = players === null;            // null = aún no llegó el primer snapshot
  const rows = (players && window.ProdeRanking)
    ? window.ProdeRanking.rankingRowsFromPlayers(players, myUid)
    : [];                                       // sin datos reales: vacío (nada de demo)
  const you = rows.find(r => r.you);
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div style={{paddingBottom: 20}}>
      <AppBar title="Ranking" subtitle="Mundial 2026 · Refugio Tamarindo"/>

      {/* total real de jugadores */}
      <div style={{padding:"8px 16px 0"}}>
        <div style={{
          padding:"10px 14px", borderRadius:14,
          background:"var(--char-800)", border:"1px solid var(--char-700)",
          display:"flex", alignItems:"center", justifyContent:"space-between",
        }}>
          <div style={{
            fontFamily:"var(--font-title)", fontSize:15, color:"var(--neon-citrus)",
            textTransform:"uppercase", letterSpacing:"0.02em",
          }}>General</div>
          <div style={{fontSize:11, color:"var(--char-300)", letterSpacing:"0.12em", fontWeight:700}}>
            {rows.length} {rows.length === 1 ? "JUGADOR" : "JUGADORES"}
          </div>
        </div>
      </div>

      {/* estado cargando / vacío */}
      {(loading || rows.length === 0) && (
        <div style={{padding:"30px 22px", textAlign:"center"}}>
          <div style={{fontSize:13, color:"var(--char-300)", lineHeight:1.5, maxWidth:320, margin:"0 auto"}}>
            {loading
              ? "Cargando ranking..."
              : "Todavía no hay nadie en el ranking. Cargá tus predicciones y, cuando se confirme un resultado, vas a aparecer acá."}
          </div>
        </div>
      )}

      {/* podium */}
      {rows.length > 0 && (
        <div style={{padding:"22px 16px 0"}}>
          <div style={{
            display:"grid", gridTemplateColumns:"1fr 1.15fr 1fr",
            alignItems:"end", gap:8,
          }}>
            <PodiumCol player={podium[1]} pos={2} h={108} tone="char"/>
            <PodiumCol player={podium[0]} pos={1} h={132} tone="citrus"/>
            <PodiumCol player={podium[2]} pos={3} h={92}  tone="orange"/>
          </div>
        </div>
      )}

      {/* phrase */}
      {rows.length > 0 && (
        <div style={{padding:"18px 16px 0"}}>
          <div style={{
            padding:"10px 14px", borderRadius:14,
            background:"rgba(232,242,106,0.08)", border:"1px solid rgba(232,242,106,0.18)",
            display:"flex", alignItems:"center", gap:10,
          }}>
            <i data-lucide="flame" style={{width:16,height:16,color:"var(--neon-coral)"}}></i>
            <div style={{flex:1, fontSize:12, color:"var(--cream-100)", letterSpacing:"0.04em"}}>
              <span style={{color:"var(--neon-citrus)", fontWeight:700}}>Ranking caliente,</span> cerveza fría.
            </div>
          </div>
        </div>
      )}

      {/* you sticky */}
      {you && (
        <div style={{padding:"14px 16px 4px"}}>
          <div style={{
            display:"flex", alignItems:"center", gap:12,
            padding:"12px 14px", borderRadius:18,
            background:"linear-gradient(90deg, rgba(232,242,106,0.10), rgba(232,242,106,0))",
            border:"1px solid var(--neon-citrus)",
          }}>
            <div style={{
              width:38, height:38, borderRadius:"50%",
              background:"var(--char-900)", border:"1.5px solid var(--neon-citrus)",
              color:"var(--neon-citrus)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontFamily:"var(--font-title)", fontSize:16,
            }}>{you.rank}°</div>
            <Avatar initials={you.avatar} size={36} tone="citrus"/>
            <div style={{flex:1}}>
              <div style={{fontSize:9, letterSpacing:"0.2em", color:"var(--neon-citrus)", fontWeight:700}}>SOS VOS</div>
              <div style={{
                fontFamily:"var(--font-title)", fontSize:14, color:"var(--cream-100)",
                textTransform:"uppercase", letterSpacing:"0.02em", lineHeight:1.1, marginTop:2,
              }}>{you.name}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"var(--font-title)", fontSize:22, color:"var(--neon-citrus)", lineHeight:1}}>{you.pts}</div>
              <div style={{fontSize:9, color:"var(--char-400)", letterSpacing:"0.18em", marginTop:2}}>PUNTOS</div>
            </div>
          </div>
        </div>
      )}

      {/* table */}
      {rows.length > 0 && (
        <div style={{padding:"10px 16px 0"}}>
          <div style={{
            display:"grid", gridTemplateColumns:"30px 1fr 50px 50px 40px",
            gap:6, padding:"6px 8px 8px",
            borderBottom:"1px solid var(--char-700)",
          }}>
            <Eyebrow color="var(--char-500)" style={{fontSize:8}}>#</Eyebrow>
            <Eyebrow color="var(--char-500)" style={{fontSize:8}}>Jugador</Eyebrow>
            <Eyebrow color="var(--char-500)" style={{fontSize:8, textAlign:"center"}}>Exa</Eyebrow>
            <Eyebrow color="var(--char-500)" style={{fontSize:8, textAlign:"center"}}>Win</Eyebrow>
            <Eyebrow color="var(--char-500)" style={{fontSize:8, textAlign:"right"}}>Pts</Eyebrow>
          </div>
          {rest.map((r) => (
            <RankRow key={r.rank} r={r} expanded={highlight===r.rank} onClick={()=>setHighlight(highlight===r.rank?null:r.rank)}/>
          ))}
        </div>
      )}

      {/* badges legend */}
      <div style={{padding:"22px 16px 0"}}>
        <Eyebrow color="var(--neon-citrus)" style={{paddingLeft:4}}>Medallas en juego</Eyebrow>
        <h3 style={{
          fontFamily:"var(--font-title)", fontSize:24, color:"var(--cream-100)",
          textTransform:"uppercase", letterSpacing:"0.02em", margin:"4px 0 12px",
          paddingLeft:4,
        }}>Badges del Mundial</h3>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
          {Object.keys(window.BADGES).map(k => (
            <div key={k} style={{
              padding:"10px 12px", borderRadius:14,
              background:"var(--char-800)", border:"1px solid var(--char-700)",
            }}>
              <div style={{
                width:30, height:30, borderRadius:"50%",
                background:window.BADGES[k].color, color:"var(--char-900)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontWeight:700, fontSize:16, marginBottom:8,
              }}>{window.BADGES[k].emoji}</div>
              <div style={{
                fontFamily:"var(--font-title)", fontSize:12, color:"var(--cream-100)",
                textTransform:"uppercase", letterSpacing:"0.02em",
              }}>{window.BADGES[k].label}</div>
              <div style={{fontSize:9, color:"var(--char-400)", marginTop:3, letterSpacing:"0.04em"}}>{window.BADGES[k].sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{padding:"20px 16px 0"}}>
        <Btn full variant="ghost" size="md" icon="share-2" onClick={()=>{}}>Compartir mi posición</Btn>
      </div>
    </div>
  );
}

function PodiumCol({ player, pos, h, tone }) {
  if (!player) return null;
  const colors = {
    citrus:"var(--neon-citrus)", orange:"var(--orange-400)", char:"var(--char-200)",
  };
  return (
    <div style={{textAlign:"center"}}>
      <Avatar initials={player.avatar} size={pos===1?56:46} tone={tone==="citrus"?"citrus":tone==="orange"?"orange":"char"} ring/>
      <div style={{
        fontFamily:"var(--font-title)", fontSize:11, color:"var(--cream-100)",
        textTransform:"uppercase", letterSpacing:"0.02em", marginTop:7, lineHeight:1.1,
        whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
        textWrap:"balance",
      }}>{player.name.split("(")[0]}</div>
      <div style={{fontSize:9, color:"var(--char-400)", letterSpacing:"0.1em", marginTop:2}}>{player.nat}</div>
      <div style={{
        marginTop:8, height:h, borderRadius:"18px 18px 0 0",
        background:`linear-gradient(180deg, ${colors[tone]} 0%, var(--char-700) 100%)`,
        position:"relative", overflow:"hidden",
      }}>
        <div style={{
          position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
          flexDirection:"column",
        }}>
          <div style={{
            fontFamily:"var(--font-display)", fontSize:pos===1?42:32,
            color:"var(--char-900)",
            lineHeight:1, textTransform:"uppercase",
          }}>{pos}°</div>
          <div style={{
            fontFamily:"var(--font-title)", fontSize:13, color:"var(--char-900)",
            marginTop:4, letterSpacing:"0.02em",
          }}>{player.pts} pts</div>
        </div>
      </div>
    </div>
  );
}

function RankRow({ r, expanded, onClick }) {
  return (
    <div onClick={onClick} style={{
      borderBottom:"1px solid var(--char-700)", cursor:"pointer",
      background: r.you ? "rgba(232,242,106,0.06)" : "transparent",
    }}>
      <div style={{
        display:"grid", gridTemplateColumns:"30px 1fr 50px 50px 40px",
        gap:6, padding:"11px 8px", alignItems:"center",
      }}>
        <div style={{
          fontFamily:"var(--font-title)", fontSize:14, color:"var(--char-200)",
          letterSpacing:"0.02em",
        }}>{r.rank}°</div>
        <div style={{display:"flex", alignItems:"center", gap:9, minWidth:0}}>
          <Avatar initials={r.avatar} size={28} tone={r.you?"citrus":(r.rank%3===0?"orange":r.rank%2===0?"sage":"olive")}/>
          <div style={{minWidth:0, flex:1}}>
            <div style={{
              fontFamily:"var(--font-body)", fontSize:12, color:"var(--cream-100)",
              fontWeight:600,
              whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
            }}>{r.name}</div>
            <div style={{display:"flex", alignItems:"center", gap:5, marginTop:2}}>
              <Flag code={r.nat} size={11}/>
              <span style={{fontSize:9, color:"var(--char-400)", letterSpacing:"0.1em"}}>{r.nat}</span>
              {r.streak >= 3 && <span style={{
                fontSize:9, color:"var(--neon-coral)", fontWeight:700, letterSpacing:"0.04em",
                display:"inline-flex", alignItems:"center", gap:2,
              }}><i data-lucide="flame" style={{width:9,height:9}}></i>{r.streak}</span>}
            </div>
          </div>
        </div>
        <div style={{
          fontFamily:"var(--font-title)", fontSize:13, color:"var(--neon-citrus)", textAlign:"center",
        }}>{r.exact}</div>
        <div style={{
          fontFamily:"var(--font-body)", fontSize:12, color:"var(--char-200)", textAlign:"center",
          fontWeight:600,
        }}>{r.winner}</div>
        <div style={{textAlign:"right"}}>
          <div style={{
            fontFamily:"var(--font-title)", fontSize:14,
            color: r.you ? "var(--neon-citrus)" : "var(--cream-100)",
            lineHeight:1,
          }}>{r.pts}</div>
          {r.trend !== "flat" && (
            <i data-lucide={r.trend==="up"?"arrow-up":"arrow-down"} style={{
              width:10, height:10, marginTop:2,
              color: r.trend==="up" ? "var(--neon-citrus)" : "var(--neon-coral)",
            }}></i>
          )}
        </div>
      </div>
      {expanded && (
        <div style={{
          padding:"4px 12px 12px", borderTop:"1px dashed var(--char-700)",
          display:"flex", alignItems:"center", gap:8, flexWrap:"wrap",
        }}>
          <BadgeChip kind={r.badge}/>
          <div style={{
            fontSize:10, color:"var(--char-400)", marginLeft:"auto", letterSpacing:"0.04em",
          }}>Racha: <span style={{color:"var(--cream-100)"}}>{r.streak} aciertos</span></div>
        </div>
      )}
    </div>
  );
}

window.Ranking = Ranking;
