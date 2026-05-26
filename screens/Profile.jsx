/* ============================================================
   SCREEN: Profile
   ============================================================ */

function Profile({ go }) {
  const [version, setVersion] = useState(0);
  const [rank, setRank] = useState(null);

  useEffect(() => {
    const onData = () => setVersion(v => v + 1);
    window.addEventListener("prode:data", onData);
    return () => window.removeEventListener("prode:data", onData);
  }, []);

  // Puesto real: posición del jugador en el ranking general en vivo.
  useEffect(() => {
    const myUid = window.ProdeDB?.getUser?.()?.uid;
    const unsub = window.ProdeDB?.subscribeRanking?.((list) => {
      const rows = window.ProdeRanking?.rankingRowsFromPlayers?.(list, myUid) || [];
      const me = rows.find(r => r.you);
      setRank(me ? me.rank : null);
    });
    return () => unsub && unsub();
  }, []);

  const profile = window.ProdeStore?.getProfile?.() || {};
  const player = profile.player || {};
  const stats = profile.stats || { points: 0, exact: 0, winner: 0 };
  const history = profile.history || [];
  const country = window.TEAMS?.[player.favoriteTeam] || "Costa Rica";

  return (
    <div style={{paddingBottom:20}}>
      <div style={{
        position:"relative", padding:"20px 18px 24px",
        background:"linear-gradient(180deg, var(--char-700), var(--char-800))",
        borderBottom:"1px solid var(--char-700)",
      }}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <Eyebrow color="var(--neon-citrus)">Tu prode - Refugio</Eyebrow>
          <button onClick={()=>go("register")} style={{
            width:32, height:32, borderRadius:"50%", border:"1px solid var(--char-600)",
            background:"var(--char-900)", color:"var(--char-200)", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <i data-lucide="settings" style={{width:15,height:15}}></i>
          </button>
        </div>

        <div style={{display:"flex", alignItems:"center", gap:14, marginTop:16}}>
          <Avatar initials={player.avatar || window.ProdeRanking?.initials?.(player.name) || "TJ"} size={72} tone={player.avatarTone || "citrus"} you/>
          <div style={{flex:1, minWidth:0}}>
            <div style={{
              fontFamily:"var(--font-title)", fontSize:22, color:"var(--cream-100)",
              textTransform:"uppercase", letterSpacing:"0.02em", lineHeight:1,
            }}>{player.name || "Tu jugador"}</div>
            <div style={{display:"flex", alignItems:"center", gap:6, marginTop:6}}>
              <Flag code={player.favoriteTeam || "CRC"} size={16}/>
              <span style={{fontSize:11, color:"var(--char-200)", letterSpacing:"0.06em"}}>{country} - Refugio</span>
            </div>
            <div style={{display:"flex", gap:5, marginTop:8, flexWrap:"wrap"}}>
              <BadgeChip kind={stats.exact >= 3 ? "casi" : "cafe"}/>
              {stats.points >= 10 && <BadgeChip kind="profeta"/>}
            </div>
          </div>
        </div>

        <div style={{
          marginTop:18,
          display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8,
        }}>
          <Stat n={rank ? `${rank}°` : "-"} l="Posición" tone="orange"/>
          <Stat n={String(stats.points)} l="Puntos" tone="citrus"/>
          <Stat n={String(stats.exact)} l="Exactos" tone="cream"/>
        </div>
      </div>

      <div style={{padding:"16px 16px 0"}}>
        <div style={{
          padding:"12px 14px", borderRadius:14,
          background:"var(--char-800)", border:"1px solid var(--char-700)",
        }}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <Eyebrow color="var(--char-200)">Predicciones puntuadas</Eyebrow>
            <div style={{
              fontFamily:"var(--font-title)", fontSize:13, color:"var(--neon-citrus)",
            }}>{stats.played || 0} partidos</div>
          </div>
          <div style={{
            marginTop:8, height:5, borderRadius:999, background:"var(--char-700)", overflow:"hidden",
          }}>
            <div style={{
              width:`${Math.min(100, (stats.played || 0) * 20)}%`, height:"100%",
              background:"linear-gradient(90deg, var(--orange-500), var(--neon-citrus))",
            }}/>
          </div>
        </div>
      </div>

      <div style={{padding:"22px 16px 0"}}>
        <Eyebrow color="var(--neon-citrus)" style={{paddingLeft:4}}>Medallas</Eyebrow>
        <h3 style={{
          fontFamily:"var(--font-title)", fontSize:22, color:"var(--cream-100)",
          textTransform:"uppercase", letterSpacing:"0.02em", margin:"4px 0 14px",
          paddingLeft:4,
        }}>Lo que desbloqueaste</h3>

        <div style={{display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:8}}>
          {Object.keys(window.BADGES).map((k,i) => {
            const got = (k === "cafe") || (k === "casi" && stats.exact >= 3) || (k === "profeta" && stats.points >= 10);
            return (
              <div key={k} style={{
                aspectRatio:"1", borderRadius:18,
                background: got ? "var(--char-800)" : "var(--char-900)",
                border:`1px solid ${got ? "var(--char-600)" : "var(--char-700)"}`,
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                opacity: got ? 1 : 0.45,
                position:"relative", overflow:"hidden",
              }}>
                <div style={{
                  width:34, height:34, borderRadius:"50%",
                  background: got ? window.BADGES[k].color : "var(--char-700)",
                  color: got ? "var(--char-900)" : "var(--char-500)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:18, fontWeight:700,
                }}>{window.BADGES[k].emoji}</div>
                <div style={{
                  fontSize:8, color:"var(--cream-100)", letterSpacing:"0.1em", textTransform:"uppercase",
                  marginTop:6, padding:"0 2px", textAlign:"center", lineHeight:1.1, fontWeight:700,
                }}>{window.BADGES[k].label.split(" ").slice(0,2).join(" ")}</div>
                {!got && <i data-lucide="lock" style={{width:11,height:11,color:"var(--char-500)",position:"absolute",top:6,right:6}}></i>}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{padding:"22px 16px 0"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:10, paddingLeft:4}}>
          <div>
            <Eyebrow color="var(--neon-citrus)">Historial</Eyebrow>
            <h3 style={{
              fontFamily:"var(--font-title)", fontSize:22, color:"var(--cream-100)",
              textTransform:"uppercase", letterSpacing:"0.02em", margin:"4px 0 0",
            }}>Tus ultimas jugadas</h3>
          </div>
        </div>
        <div style={{
          borderRadius:18, overflow:"hidden",
          background:"var(--char-800)", border:"1px solid var(--char-700)",
        }}>
          {history.length === 0 && (
            <div style={{padding:14, color:"var(--char-300)", fontSize:12}}>
              Todavia no tenes partidos finalizados con prediccion.
            </div>
          )}
          {history.map((h, i) => (
            <div key={i} style={{
              display:"grid", gridTemplateColumns:"1fr 50px 50px 56px",
              gap:6, padding:"11px 13px", alignItems:"center",
              borderBottom: i < history.length-1 ? "1px solid var(--char-700)" : 0,
            }}>
              <div style={{fontFamily:"var(--font-body)", fontSize:12, color:"var(--cream-100)", fontWeight:600}}>{h.match}</div>
              <div style={{fontFamily:"var(--font-mono)", fontSize:12, color:"var(--char-200)", textAlign:"center"}}>{h.pred}</div>
              <div style={{fontFamily:"var(--font-mono)", fontSize:12, color:"var(--cream-100)", textAlign:"center"}}>{h.real}</div>
              <div style={{
                textAlign:"right", fontFamily:"var(--font-title)", fontSize:13,
                color: h.pts >= 5 ? "var(--neon-citrus)" : h.pts > 0 ? "var(--orange-400)" : "var(--char-500)",
              }}>{h.pts > 0 ? `+${h.pts}` : "0"}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{padding:"22px 16px 0", display:"flex", gap:8}}>
        <Btn variant="ghost" size="md" icon="edit-3" style={{flex:1}} onClick={()=>go("register")}>Editar</Btn>
        <Btn variant="ghost" size="md" icon="log-out" style={{flex:1}} onClick={async ()=>{
          window.ProdeStore?.clearPlayer?.();
          // Cierra la sesión de Firebase; el gate de App enruta de vuelta al Login.
          await window.ProdeDB?.signOutUser?.();
          go("register");
        }}>Salir</Btn>
      </div>
    </div>
  );
}

function Stat({ n, l, tone }) {
  const colors = {
    orange:"var(--orange-400)", citrus:"var(--neon-citrus)", cream:"var(--cream-100)",
  };
  return (
    <div style={{
      padding:"12px 8px", borderRadius:14,
      background:"var(--char-900)", border:"1px solid var(--char-700)",
      textAlign:"center",
    }}>
      <div style={{
        fontFamily:"var(--font-title)", fontSize:24, color:colors[tone], lineHeight:1,
      }}>{n}</div>
      <Eyebrow color="var(--char-400)" style={{marginTop:6, fontSize:8}}>{l}</Eyebrow>
    </div>
  );
}

window.Profile = Profile;
