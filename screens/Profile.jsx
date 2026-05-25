/* ============================================================
   SCREEN: Profile
   ============================================================ */

function Profile({ go }) {
  const you = window.RANKING.find(r => r.you);
  const history = [
    { match:"ARG vs COL", pred:"2–1", real:"2–1", pts:5, status:"exacto" },
    { match:"ENG vs BEL", pred:"2–0", real:"1–1", pts:0, status:"miss"   },
    { match:"BRA vs ESP", pred:"1–2", real:"1–2", pts:5, status:"exacto" },
    { match:"FRA vs MAR", pred:"3–1", real:"2–0", pts:3, status:"win"    },
    { match:"URU vs POR", pred:"1–1", real:"0–2", pts:0, status:"miss"   },
    { match:"CRC vs MEX", pred:"1–1", real:"2–1", pts:0, status:"miss"   },
    { match:"GER vs JPN", pred:"2–1", real:"2–1", pts:5, status:"exacto" },
  ];

  return (
    <div style={{paddingBottom:20}}>
      {/* hero stripe */}
      <div style={{
        position:"relative", padding:"20px 18px 24px",
        background:"linear-gradient(180deg, var(--char-700), var(--char-800))",
        borderBottom:"1px solid var(--char-700)",
      }}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <Eyebrow color="var(--neon-citrus)">Tu prode · Refugio</Eyebrow>
          <button onClick={()=>{}} style={{
            width:32, height:32, borderRadius:"50%", border:"1px solid var(--char-600)",
            background:"var(--char-900)", color:"var(--char-200)", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <i data-lucide="settings" style={{width:15,height:15}}></i>
          </button>
        </div>

        <div style={{display:"flex", alignItems:"center", gap:14, marginTop:16}}>
          <Avatar initials="TB" size={72} tone="citrus" you/>
          <div style={{flex:1, minWidth:0}}>
            <div style={{
              fontFamily:"var(--font-title)", fontSize:22, color:"var(--cream-100)",
              textTransform:"uppercase", letterSpacing:"0.02em", lineHeight:1,
            }}>Tomás Belaún</div>
            <div style={{display:"flex", alignItems:"center", gap:6, marginTop:6}}>
              <Flag code="ARG" size={16}/>
              <span style={{fontSize:11, color:"var(--char-200)", letterSpacing:"0.06em"}}>Argentina · Mar del Plata</span>
            </div>
            <div style={{display:"flex", gap:5, marginTop:8, flexWrap:"wrap"}}>
              <BadgeChip kind="cafe"/>
              <BadgeChip kind="casi"/>
            </div>
          </div>
        </div>

        {/* stat trio */}
        <div style={{
          marginTop:18,
          display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8,
        }}>
          <Stat n="5°"  l="Posición" tone="orange"/>
          <Stat n="122" l="Puntos" tone="citrus"/>
          <Stat n="6"   l="Exactos" tone="cream"/>
        </div>
      </div>

      {/* progress to next rank */}
      <div style={{padding:"16px 16px 0"}}>
        <div style={{
          padding:"12px 14px", borderRadius:14,
          background:"var(--char-800)", border:"1px solid var(--char-700)",
        }}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <Eyebrow color="var(--char-200)">Para alcanzar a Lalo Méndez (4°)</Eyebrow>
            <div style={{
              fontFamily:"var(--font-title)", fontSize:13, color:"var(--neon-citrus)",
            }}>+6 pts</div>
          </div>
          <div style={{
            marginTop:8, height:5, borderRadius:999, background:"var(--char-700)", overflow:"hidden",
          }}>
            <div style={{
              width:"95%", height:"100%",
              background:"linear-gradient(90deg, var(--orange-500), var(--neon-citrus))",
            }}/>
          </div>
        </div>
      </div>

      {/* medallas */}
      <div style={{padding:"22px 16px 0"}}>
        <Eyebrow color="var(--neon-citrus)" style={{paddingLeft:4}}>Medallas</Eyebrow>
        <h3 style={{
          fontFamily:"var(--font-title)", fontSize:22, color:"var(--cream-100)",
          textTransform:"uppercase", letterSpacing:"0.02em", margin:"4px 0 14px",
          paddingLeft:4,
        }}>Lo que desbloqueaste</h3>

        <div style={{display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:8}}>
          {Object.keys(window.BADGES).map((k,i) => {
            const got = i < 2;
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
                {!got && (
                  <i data-lucide="lock" style={{
                    width:11,height:11,color:"var(--char-500)",position:"absolute",top:6,right:6,
                  }}></i>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* historial */}
      <div style={{padding:"22px 16px 0"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:10, paddingLeft:4}}>
          <div>
            <Eyebrow color="var(--neon-citrus)">Historial</Eyebrow>
            <h3 style={{
              fontFamily:"var(--font-title)", fontSize:22, color:"var(--cream-100)",
              textTransform:"uppercase", letterSpacing:"0.02em", margin:"4px 0 0",
            }}>Tus últimas jugadas</h3>
          </div>
          <button style={{
            background:"transparent", border:0, color:"var(--char-200)",
            fontSize:10, letterSpacing:"0.18em", textTransform:"uppercase", fontWeight:700,
            cursor:"pointer", padding:0,
          }}>Ver todas →</button>
        </div>
        <div style={{
          borderRadius:18, overflow:"hidden",
          background:"var(--char-800)", border:"1px solid var(--char-700)",
        }}>
          {history.map((h, i) => (
            <div key={i} style={{
              display:"grid", gridTemplateColumns:"1fr 50px 50px 56px",
              gap:6, padding:"11px 13px", alignItems:"center",
              borderBottom: i < history.length-1 ? "1px solid var(--char-700)" : 0,
            }}>
              <div style={{
                fontFamily:"var(--font-body)", fontSize:12, color:"var(--cream-100)", fontWeight:600,
              }}>{h.match}</div>
              <div style={{
                fontFamily:"var(--font-mono)", fontSize:12, color:"var(--char-200)",
                textAlign:"center", letterSpacing:"0.04em",
              }}>{h.pred}</div>
              <div style={{
                fontFamily:"var(--font-mono)", fontSize:12, color:"var(--cream-100)",
                textAlign:"center", letterSpacing:"0.04em",
              }}>{h.real}</div>
              <div style={{
                textAlign:"right", fontFamily:"var(--font-title)", fontSize:13,
                color: h.pts >= 5 ? "var(--neon-citrus)" : h.pts > 0 ? "var(--orange-400)" : "var(--char-500)",
              }}>{h.pts > 0 ? `+${h.pts}` : "0"}</div>
            </div>
          ))}
        </div>
      </div>

      {/* share + signout */}
      <div style={{padding:"22px 16px 0", display:"flex", gap:8}}>
        <Btn variant="ghost" size="md" icon="share-2" style={{flex:1}}>Compartir</Btn>
        <Btn variant="ghost" size="md" icon="log-out" style={{flex:1}}>Salir</Btn>
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
