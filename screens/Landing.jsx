/* ============================================================
   SCREEN: Landing / Home
   ============================================================ */

function Landing({ go }) {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const onData = () => setVersion(v => v + 1);
    window.addEventListener("prode:data", onData);
    return () => window.removeEventListener("prode:data", onData);
  }, []);
  const matches = window.ProdeStore?.getMatches?.() || window.MATCHES;
  const live = matches.find(m => m.status === "vivo");
  // Próximo partido real para la cuenta regresiva: el más cercano que todavía no empezó.
  const now = Date.now();
  const upcoming = matches
    .filter(m => m.kickoffAt && m.status !== "finalizado")
    .sort((a, b) => Date.parse(a.kickoffAt) - Date.parse(b.kickoffAt));
  const next = upcoming.find(m => Date.parse(m.kickoffAt) > now) || upcoming[0] || matches[0];

  return (
    <div style={{paddingBottom: 24}}>
      {/* HERO */}
      <div style={{
        position:"relative", margin:"0", padding:"24px 18px 28px",
        background:"linear-gradient(180deg, rgba(26,25,22,0) 0%, var(--char-900) 100%), url('assets/photo-bar-night.jpg')",
        backgroundSize:"cover", backgroundPosition:"center",
        overflow:"hidden",
      }}>
        {/* grain */}
        <div style={{
          position:"absolute", inset:0,
          background:"radial-gradient(rgba(245,238,217,0.04) 1px, transparent 1px)",
          backgroundSize:"3px 3px", pointerEvents:"none",
        }}/>

        {/* top brand row */}
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", position:"relative"}}>
          <div style={{
            fontFamily:"var(--font-display)", fontSize:26, lineHeight:0.85,
            textTransform:"uppercase", color:"var(--orange-500)",
          }}>
            REFU<br/><span style={{paddingLeft:"0.55em", display:"inline-block", color:"var(--cream-100)"}}>GIO</span>
          </div>
          <div style={{display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4}}>
            <Eyebrow color="var(--neon-citrus)">Edición</Eyebrow>
            <div style={{
              fontFamily:"var(--font-title)", fontSize:14, color:"var(--cream-100)",
              letterSpacing:"0.04em",
            }}>MUNDIAL '26</div>
          </div>
        </div>

        {/* huge headline */}
        <div style={{position:"relative", marginTop:46}}>
          <Eyebrow color="var(--neon-citrus)">Prode · Tamarindo · 11 jun → 19 jul</Eyebrow>
          <h1 style={{
            margin:"8px 0 0",
            fontFamily:"var(--font-display)", fontSize:64, lineHeight:0.82,
            color:"var(--cream-100)", letterSpacing:"-0.01em",
            textTransform:"uppercase", textWrap:"balance",
          }}>
            Viví el<br/>
            <span style={{color:"var(--orange-400)"}}>Mundial</span><br/>
            en Refugio.
          </h1>
          <p style={{
            margin:"14px 0 0", maxWidth:300,
            color:"var(--char-200)", fontSize:14, lineHeight:1.5,
          }}>
            Armá tu prode, competí con la barra y ganá tragos, cenas
            y una noche en Refugio Lodge durante todo el Mundial.
          </p>

          <div style={{display:"flex", gap:8, marginTop:22, flexWrap:"wrap"}}>
            <Btn variant="accent" size="lg" onClick={()=>go("register")} icon="zap">Crear mi prode</Btn>
            <Btn variant="ghost" size="lg" onClick={()=>go("ranking")} icon="trophy">Ranking</Btn>
          </div>
        </div>

        {/* xxx mark */}
        <div style={{
          position:"absolute", right:14, bottom:14,
          fontFamily:"var(--font-display)", fontSize:34, color:"var(--orange-500)",
          opacity:0.55, transform:"rotate(-8deg)", letterSpacing:"-0.03em",
        }}>xxx</div>
      </div>

      {/* LIVE NOW */}
      {live && (
        <div style={{padding:"18px 16px 0"}}>
          <button onClick={()=>go("matches")} style={{
            width:"100%", padding:0, border:0, background:"none", textAlign:"left", cursor:"pointer",
          }}>
            <div style={{
              borderRadius:22, padding:14, position:"relative", overflow:"hidden",
              background:"linear-gradient(135deg, var(--char-800) 0%, var(--char-900) 100%)",
              border:"1px solid var(--neon-coral)",
              boxShadow:"0 0 30px -10px rgba(255,122,61,0.45)",
            }}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
                <Pill tone="live">
                  <span style={{
                    width:6, height:6, borderRadius:"50%", background:"var(--char-900)",
                  }}/>EN PANTALLA GIGANTE
                </Pill>
                <Eyebrow color="var(--char-400)">{live.minute}</Eyebrow>
              </div>
              <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
                <div style={{display:"flex", alignItems:"center", gap:9}}>
                  <Flag code={live.a} size={36}/>
                  <div style={{
                    fontFamily:"var(--font-title)", fontSize:17, color:"var(--cream-100)",
                    textTransform:"uppercase", letterSpacing:"0.02em",
                  }}>{window.TEAMS[live.a]}</div>
                </div>
                <div style={{
                  display:"flex", alignItems:"center", gap:8,
                }}>
                  <span style={{fontFamily:"var(--font-title)", fontSize:32, color:"var(--neon-coral)"}}>{live.scoreA}</span>
                  <span style={{color:"var(--char-500)", fontSize:18}}>–</span>
                  <span style={{fontFamily:"var(--font-title)", fontSize:32, color:"var(--neon-coral)"}}>{live.scoreB}</span>
                </div>
                <div style={{display:"flex", alignItems:"center", gap:9}}>
                  <div style={{
                    fontFamily:"var(--font-title)", fontSize:17, color:"var(--cream-100)",
                    textTransform:"uppercase", letterSpacing:"0.02em",
                  }}>{window.TEAMS[live.b]}</div>
                  <Flag code={live.b} size={36}/>
                </div>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* COUNTDOWN to next big match */}
      <div style={{padding:"18px 16px 0"}}>
        <Card padding={18}>
          <Eyebrow color="var(--neon-citrus)">Cuenta regresiva</Eyebrow>
          <div style={{
            fontFamily:"var(--font-title)", fontSize:20, color:"var(--cream-100)",
            textTransform:"uppercase", letterSpacing:"0.02em", margin:"4px 0 14px",
          }}>Poné el resultado<br/>antes de que ruede la pelota.</div>
          <Countdown target={next.kickoffAt} label={`${window.TEAMS[next.a]} vs ${window.TEAMS[next.b]} · ${next.date} ${next.time}hs`}/>
          <Btn full variant="primary" size="md" style={{marginTop:14}} onClick={()=>go("matches")} icon="arrow-right">
            Cargar predicciones
          </Btn>
        </Card>
      </div>

      {/* HOW IT WORKS — puntos */}
      <div style={{padding:"22px 16px 0"}}>
        <Eyebrow color="var(--neon-citrus)" style={{paddingLeft:4}}>Cómo se juega</Eyebrow>
        <h3 style={{
          fontFamily:"var(--font-title)", fontSize:26, color:"var(--cream-100)",
          textTransform:"uppercase", letterSpacing:"0.02em", margin:"4px 0 14px",
          paddingLeft:4,
        }}>El reglamento</h3>

        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
          <PointCard pts="5" label="Resultado exacto" sub="2–1 es 2–1" tone="citrus"/>
          <PointCard pts="3" label="Ganador correcto" sub="O empate" tone="orange"/>
          <PointCard pts="+1" label="Diferencia de gol" sub="Punto extra" tone="sage"/>
          <PointCard pts="★" label="Especiales" sub="Campeón, goleador..." tone="cream"/>
        </div>
      </div>

      {/* PREMIOS */}
      <div style={{padding:"22px 16px 0"}}>
        <Eyebrow color="var(--neon-citrus)" style={{paddingLeft:4}}>Lo que se gana</Eyebrow>
        <h3 style={{
          fontFamily:"var(--font-title)", fontSize:26, color:"var(--cream-100)",
          textTransform:"uppercase", letterSpacing:"0.02em", margin:"4px 0 14px",
          paddingLeft:4,
        }}>Premios de la casa</h3>

        <div style={{display:"flex", flexDirection:"column", gap:10}}>
          <PrizeRow rank="1°" prize="Una noche en Refugio Lodge" sub="Habitación oceanview · 2 personas" tone="citrus"/>
          <PrizeRow rank="2°" prize="Cena para dos en Refugio" sub="Menú completo + vino"  tone="orange"/>
          <PrizeRow rank="3°" prize="Open bar 1 noche" sub="Tragos de autor toda la noche" tone="sage"/>
          <PrizeRow rank="Sem" prize="Mejor de la fecha" sub="Pizza + birra todos los lunes" tone="tan"/>
          <PrizeRow rank="Exa" prize="Bonus por exacto" sub="Café + croissant Buena Nota" tone="cream"/>
        </div>
      </div>

      {/* Frase con foto */}
      <div style={{padding:"24px 16px 0"}}>
        <div style={{
          borderRadius:28, overflow:"hidden", position:"relative",
          aspectRatio:"16/11",
          background:"linear-gradient(180deg, rgba(26,25,22,0.1) 30%, rgba(26,25,22,0.85) 100%), url('assets/photo-tamarindo.jpg')",
          backgroundSize:"cover", backgroundPosition:"center",
        }}>
          <div style={{
            position:"absolute", inset:"auto 18px 16px",
          }}>
            <Eyebrow color="var(--neon-citrus)">Refrán de la casa</Eyebrow>
            <div style={{
              fontFamily:"var(--font-title)", fontSize:22, color:"var(--cream-100)",
              textTransform:"uppercase", letterSpacing:"0.02em", lineHeight:1.05, marginTop:4,
              textWrap:"balance",
            }}>El Mundial se juega<br/>en la cancha,<br/><span style={{color:"var(--orange-400)"}}>se gana en Refugio.</span></div>
          </div>
        </div>
      </div>

      {/* CTA final */}
      <div style={{padding:"20px 16px 0"}}>
        <Btn full variant="accent" size="lg" onClick={()=>go("register")} icon="zap">
          Arrancá tu prode
        </Btn>
        <div style={{
          textAlign:"center", marginTop:10, fontSize:11, color:"var(--char-400)",
          letterSpacing:"0.06em",
        }}>Ya somos <span style={{color:"var(--neon-citrus)"}}>247 jugadores</span> · Tamarindo</div>
      </div>
    </div>
  );
}

function PointCard({ pts, label, sub, tone }) {
  const colors = {
    citrus:"var(--neon-citrus)", orange:"var(--orange-400)",
    sage:"var(--sage-300)", cream:"var(--cream-100)",
  };
  return (
    <div style={{
      background:"var(--char-800)", border:"1px solid var(--char-700)",
      borderRadius:18, padding:14, position:"relative", overflow:"hidden",
    }}>
      <div style={{
        fontFamily:"var(--font-title)", fontSize:42, color:colors[tone],
        lineHeight:1, letterSpacing:"-0.02em",
      }}>{pts}</div>
      <div style={{
        fontFamily:"var(--font-body)", fontSize:11, color:"var(--cream-100)",
        textTransform:"uppercase", letterSpacing:"0.16em", fontWeight:700,
        marginTop:8,
      }}>{label}</div>
      <div style={{fontSize:10, color:"var(--char-400)", marginTop:3}}>{sub}</div>
    </div>
  );
}

function PrizeRow({ rank, prize, sub, tone }) {
  const colors = {
    citrus:"var(--neon-citrus)", orange:"var(--orange-400)",
    sage:"var(--sage-300)", tan:"var(--tan-300)", cream:"var(--cream-100)",
  };
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:14,
      padding:"12px 14px", borderRadius:18,
      background:"var(--char-800)", border:"1px solid var(--char-700)",
    }}>
      <div style={{
        width:48, height:48, borderRadius:"50%",
        background:"var(--char-900)", border:`1.5px solid ${colors[tone]}`,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:"var(--font-title)", fontSize:14, color:colors[tone],
        letterSpacing:"0.02em",
        flexShrink:0,
      }}>{rank}</div>
      <div style={{flex:1}}>
        <div style={{
          fontFamily:"var(--font-title)", fontSize:15, color:"var(--cream-100)",
          textTransform:"uppercase", letterSpacing:"0.02em", lineHeight:1.1,
        }}>{prize}</div>
        <div style={{fontSize:11, color:"var(--char-400)", marginTop:3, letterSpacing:"0.04em"}}>{sub}</div>
      </div>
    </div>
  );
}

window.Landing = Landing;
