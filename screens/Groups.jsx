/* ============================================================
   SCREEN: Groups (privados)
   ============================================================ */

function Groups({ go }) {
  const [selected, setSelected] = useState("g1");
  const groups = window.GROUPS;
  const g = groups.find(x => x.id === selected) || groups[0];

  const internalRanking = window.RANKING.slice(0, 8).map((r,i) => ({...r, rank:i+1}));

  return (
    <div style={{paddingBottom:20}}>
      <AppBar title="Grupos privados" subtitle={`Estás en ${groups.length} grupos`}
        right={
          <button onClick={()=>{}} style={{
            background:"var(--neon-citrus)", color:"var(--char-900)", border:0,
            borderRadius:999, padding:"7px 10px",
            display:"inline-flex", alignItems:"center", gap:5, cursor:"pointer",
            fontSize:10, letterSpacing:"0.16em", textTransform:"uppercase", fontWeight:700,
          }}>
            <i data-lucide="plus" style={{width:12,height:12,strokeWidth:3}}></i>Nuevo
          </button>
        }/>

      {/* group tabs */}
      <div style={{
        padding:"4px 16px 4px", display:"flex", gap:7, overflowX:"auto", scrollbarWidth:"none",
      }}>
        {groups.map(gr => {
          const on = gr.id === selected;
          return (
            <button key={gr.id} onClick={()=>setSelected(gr.id)} style={{
              flexShrink:0, padding:"10px 14px", borderRadius:14, cursor:"pointer", textAlign:"left",
              background: on ? "var(--char-700)" : "var(--char-800)",
              border:`1.5px solid ${on ? "var(--neon-citrus)" : "var(--char-700)"}`,
              minWidth:160,
            }}>
              <div style={{display:"flex", alignItems:"center", gap:6, marginBottom:4}}>
                <i data-lucide="users-round" style={{width:13,height:13,color: on?"var(--neon-citrus)":"var(--char-400)"}}></i>
                <span style={{fontSize:9, color:"var(--char-400)", letterSpacing:"0.18em", fontWeight:700}}>{gr.members} JUGS</span>
              </div>
              <div style={{
                fontFamily:"var(--font-title)", fontSize:13, color:"var(--cream-100)",
                textTransform:"uppercase", letterSpacing:"0.02em", lineHeight:1.1,
                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
              }}>{gr.name}</div>
            </button>
          );
        })}
      </div>

      {/* group hero */}
      <div style={{padding:"14px 16px 0"}}>
        <div style={{
          borderRadius:22, padding:"18px",
          background:"linear-gradient(135deg, var(--char-800), var(--char-900))",
          border:"1px solid var(--char-700)",
          position:"relative", overflow:"hidden",
        }}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
            <div>
              <Eyebrow color="var(--neon-citrus)">Grupo privado</Eyebrow>
              <div style={{
                fontFamily:"var(--font-title)", fontSize:22, color:"var(--cream-100)",
                textTransform:"uppercase", letterSpacing:"0.02em", marginTop:4,
                lineHeight:1.05,
              }}>{g.name}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <Eyebrow color="var(--char-400)" style={{fontSize:8}}>POSICIÓN</Eyebrow>
              <div style={{
                fontFamily:"var(--font-display)", fontSize:42, color:"var(--orange-400)",
                lineHeight:0.85, marginTop:4,
              }}>{g.position}°</div>
            </div>
          </div>

          <div style={{
            marginTop:14, padding:"10px 12px", borderRadius:12,
            background:"var(--char-900)", border:"1px dashed var(--char-600)",
            display:"flex", alignItems:"center", justifyContent:"space-between",
          }}>
            <div>
              <Eyebrow color="var(--char-400)" style={{fontSize:8}}>Código</Eyebrow>
              <div style={{
                fontFamily:"var(--font-mono)", fontSize:14, color:"var(--neon-citrus)",
                letterSpacing:"0.18em", marginTop:3,
              }}>{g.code}</div>
            </div>
            <button style={{
              display:"inline-flex", alignItems:"center", gap:6,
              padding:"8px 12px", borderRadius:999, border:"1px solid var(--char-600)",
              background:"transparent", color:"var(--cream-100)", cursor:"pointer",
              fontSize:10, letterSpacing:"0.18em", textTransform:"uppercase", fontWeight:700,
            }}>
              <i data-lucide="copy" style={{width:12,height:12}}></i>Copiar
            </button>
          </div>

          <div style={{display:"flex", gap:7, marginTop:12}}>
            <Btn variant="primary" size="sm" icon="share-2" style={{flex:1}}>Compartir</Btn>
            <Btn variant="ghost" size="sm" icon="message-circle" style={{flex:1}}>Chat</Btn>
          </div>
        </div>
      </div>

      {/* members ranking */}
      <div style={{padding:"22px 16px 0"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:10, paddingLeft:4}}>
          <div>
            <Eyebrow color="var(--neon-citrus)">Ranking interno</Eyebrow>
            <h3 style={{
              fontFamily:"var(--font-title)", fontSize:22, color:"var(--cream-100)",
              textTransform:"uppercase", letterSpacing:"0.02em", margin:"4px 0 0",
            }}>Los del grupo</h3>
          </div>
        </div>
        <div style={{
          borderRadius:18, overflow:"hidden",
          background:"var(--char-800)", border:"1px solid var(--char-700)",
        }}>
          {internalRanking.map((r,i) => (
            <div key={r.rank} style={{
              display:"grid", gridTemplateColumns:"24px 1fr 40px",
              gap:10, padding:"10px 13px", alignItems:"center",
              borderBottom: i < internalRanking.length-1 ? "1px solid var(--char-700)" : 0,
              background: r.you ? "rgba(232,242,106,0.05)" : "transparent",
            }}>
              <div style={{
                fontFamily:"var(--font-title)", fontSize:12,
                color: r.rank<=3?"var(--neon-citrus)":"var(--char-400)",
              }}>{r.rank}°</div>
              <div style={{display:"flex", alignItems:"center", gap:9, minWidth:0}}>
                <Avatar initials={r.avatar} size={26} tone={r.you?"citrus":"olive"}/>
                <div style={{minWidth:0}}>
                  <div style={{
                    fontFamily:"var(--font-body)", fontSize:12, fontWeight:600,
                    color: r.you ? "var(--neon-citrus)" : "var(--cream-100)",
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                  }}>{r.name}{r.you && " ★"}</div>
                  <div style={{fontSize:9, color:"var(--char-400)", letterSpacing:"0.04em", marginTop:1}}>
                    {r.exact} exactos · {r.winner} ganadores
                  </div>
                </div>
              </div>
              <div style={{
                textAlign:"right", fontFamily:"var(--font-title)", fontSize:14,
                color: r.you ? "var(--neon-citrus)" : "var(--cream-100)",
              }}>{r.pts}</div>
            </div>
          ))}
        </div>
      </div>

      {/* chat preview */}
      <div style={{padding:"22px 16px 0"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:10, paddingLeft:4}}>
          <div>
            <Eyebrow color="var(--neon-citrus)">Chat de la mesa</Eyebrow>
            <h3 style={{
              fontFamily:"var(--font-title)", fontSize:22, color:"var(--cream-100)",
              textTransform:"uppercase", letterSpacing:"0.02em", margin:"4px 0 0",
            }}>Charla</h3>
          </div>
          <Pill tone="ghost">3 nuevos</Pill>
        </div>
        <div style={{
          borderRadius:18, padding:"4px",
          background:"var(--char-800)", border:"1px solid var(--char-700)",
        }}>
          <ChatMsg name="Joaco" tone="orange" time="hace 12m"
            text="le metí 3-1 a Argentina, miren bien para llorar"/>
          <ChatMsg name="Sofi" tone="sage" time="hace 8m"
            text="el profeta volvió. yo voy con 2-1 cómodo."/>
          <ChatMsg name="Vos" tone="citrus" time="hace 2m" mine
            text="¿alguien va al refugio a verlo?"/>
        </div>
      </div>
    </div>
  );
}

function ChatMsg({ name, tone, time, text, mine }) {
  return (
    <div style={{
      display:"flex", gap:10, padding:"10px 10px",
      flexDirection: mine ? "row-reverse" : "row",
    }}>
      <Avatar initials={name[0]+name[1]} size={28} tone={tone}/>
      <div style={{
        maxWidth:"78%",
        background: mine ? "rgba(232,242,106,0.10)" : "var(--char-900)",
        border:`1px solid ${mine ? "rgba(232,242,106,0.18)" : "var(--char-700)"}`,
        borderRadius: mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
        padding:"8px 12px",
      }}>
        <div style={{display:"flex", justifyContent:"space-between", gap:10, alignItems:"baseline"}}>
          <div style={{
            fontFamily:"var(--font-body)", fontSize:11, fontWeight:700,
            color: mine ? "var(--neon-citrus)" : "var(--cream-100)",
            letterSpacing:"0.04em",
          }}>{name}</div>
          <div style={{fontSize:9, color:"var(--char-500)"}}>{time}</div>
        </div>
        <div style={{fontSize:13, color:"var(--cream-100)", marginTop:3, lineHeight:1.4}}>{text}</div>
      </div>
    </div>
  );
}

window.Groups = Groups;
