/* ============================================================
   SCREEN: Especiales (campeón, goleador, etc.)
   ============================================================ */

function Specials({ go }) {
  const [sp, setSp] = useState(window.ProdeStore?.getSpecials?.() || {...window.MY_SPECIALS});

  const saveAndClose = async () => {
    await window.ProdeStore?.saveSpecials(sp);
    go("matches");
  };

  const teamPick = (key) => {
    const opts = ["ARG","BRA","FRA","ESP","ENG","POR","GER","NED","MAR","URU","ITA","COL","CRO","BEL","JPN","USA","MEX","CRC"];
    return (
      <div style={{display:"flex", gap:8, overflowX:"auto", padding:"8px 16px 4px", marginLeft:-16, marginRight:-16, scrollbarWidth:"none"}}>
        {opts.map(c => {
          const on = sp[key] === c;
          return (
            <button key={c} onClick={()=>setSp(s=>({...s, [key]:c}))} style={{
              flexShrink:0, padding:8, borderRadius:14, cursor:"pointer",
              background: on ? "var(--char-700)" : "var(--char-900)",
              border:`1.5px solid ${on ? "var(--neon-citrus)" : "var(--char-700)"}`,
              display:"flex", flexDirection:"column", alignItems:"center", gap:5, minWidth:60,
            }}>
              <Flag code={c} size={32}/>
              <span style={{
                fontSize:8, color:"var(--cream-100)", letterSpacing:"0.16em", fontWeight:700,
              }}>{c}</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{paddingBottom: 24}}>
      <AppBar back onBack={()=>go("matches")} title="Predicciones especiales" subtitle="Bonus · 5 puntos cada una"/>

      <div style={{padding:"6px 16px 0"}}>
        <div style={{
          padding:"14px 16px", borderRadius:18,
          background:"linear-gradient(135deg, var(--orange-700), var(--char-800))",
          border:"1px solid var(--orange-500)",
        }}>
          <Eyebrow color="var(--neon-citrus)">Cierran el 11 de junio · 18:00</Eyebrow>
          <div style={{
            fontFamily:"var(--font-title)", fontSize:18, color:"var(--cream-100)",
            textTransform:"uppercase", letterSpacing:"0.02em", marginTop:6,
            textWrap:"balance",
          }}>Una vez que arranca,<br/>no se cambia más.</div>
        </div>
      </div>

      <div style={{padding:"18px 16px 0"}}>
        <SpecialRow icon="trophy" tone="citrus" label="Campeón del Mundial" sub="Levanta la copa" current={sp.campeon}>
          {teamPick("campeon")}
        </SpecialRow>

        <SpecialRow icon="medal" tone="char" label="Subcampeón" sub="Cae en la final" current={sp.subcampeon}>
          {teamPick("subcampeon")}
        </SpecialRow>

        <SpecialRow icon="target" tone="orange" label="Goleador del torneo" sub="Bota de oro" current={sp.goleador}>
          <ScorerPick value={sp.goleador} onChange={v=>setSp(s=>({...s, goleador:v}))}/>
        </SpecialRow>

        <SpecialRow icon="shield" tone="sage" label="Mejor arquero" sub="Guante de oro" current={sp.arquero}>
          <ScorerPick value={sp.arquero} onChange={v=>setSp(s=>({...s, arquero:v}))} options={[
            "Emiliano Martínez", "Thibaut Courtois", "Mike Maignan", "Unai Simón", "Alisson", "Yann Sommer"
          ]}/>
        </SpecialRow>

        <SpecialRow icon="sparkles" tone="citrus" label="Sorpresa del torneo" sub="Cuartos o más, inesperado" current={sp.sorpresa}>
          {teamPick("sorpresa")}
        </SpecialRow>

        <SpecialRow icon="frown" tone="coral" label="Equipo decepción" sub="Se va antes de tiempo" current={sp.decepcion}>
          {teamPick("decepcion")}
        </SpecialRow>
      </div>

      <div style={{padding:"22px 16px 0"}}>
        <div style={{
          padding:"14px 16px", borderRadius:14,
          background:"var(--char-800)", border:"1px solid var(--char-700)",
        }}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
            <Eyebrow color="var(--char-200)">Si acertás todas</Eyebrow>
            <div style={{
              fontFamily:"var(--font-title)", fontSize:24, color:"var(--neon-citrus)",
            }}>+30 PTS</div>
          </div>
          <div style={{fontSize:11, color:"var(--char-400)", marginTop:4, letterSpacing:"0.04em"}}>
            Mismo bonus si acertás 5/6. Cada una vale 5 puntos.
          </div>
        </div>
      </div>

      <div style={{padding:"18px 16px 0"}}>
        <Btn full variant="accent" size="lg" icon="lock" onClick={saveAndClose}>
          Bloquear especiales
        </Btn>
      </div>
    </div>
  );
}

function SpecialRow({ icon, tone, label, sub, current, children }) {
  const colors = {
    citrus:"var(--neon-citrus)", orange:"var(--orange-400)",
    sage:"var(--sage-300)", coral:"var(--neon-coral)", char:"var(--char-200)",
  };
  return (
    <div style={{
      borderRadius:22, padding:"16px 16px 12px",
      background:"var(--char-800)", border:"1px solid var(--char-700)",
      marginBottom:12,
    }}>
      <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:8}}>
        <div style={{
          width:38, height:38, borderRadius:"50%",
          background:"var(--char-900)", border:`1.5px solid ${colors[tone]}`,
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <i data-lucide={icon} style={{width:18, height:18, color:colors[tone]}}></i>
        </div>
        <div style={{flex:1, minWidth:0}}>
          <Eyebrow color={colors[tone]}>{sub}</Eyebrow>
          <div style={{
            fontFamily:"var(--font-title)", fontSize:15, color:"var(--cream-100)",
            textTransform:"uppercase", letterSpacing:"0.02em", marginTop:2,
          }}>{label}</div>
        </div>
        <div style={{
          padding:"5px 10px", borderRadius:999, background:"var(--char-900)",
          fontFamily:"var(--font-mono)", fontSize:10, color:"var(--cream-100)",
          letterSpacing:"0.1em", whiteSpace:"nowrap",
          maxWidth:120, overflow:"hidden", textOverflow:"ellipsis",
        }}>{current || "—"}</div>
      </div>
      {children}
    </div>
  );
}

function ScorerPick({ value, onChange, options }) {
  const list = options || [
    "Kylian Mbappé", "Lionel Messi", "Lautaro Martínez", "Erling Haaland",
    "Vinícius Jr.", "Harry Kane", "Julián Álvarez", "Pedri",
  ];
  return (
    <div style={{display:"flex", gap:7, flexWrap:"wrap", padding:"4px 0 0"}}>
      {list.map(n => {
        const on = value === n;
        return (
          <button key={n} onClick={()=>onChange(n)} style={{
            padding:"7px 12px", borderRadius:999,
            border:`1px solid ${on ? "var(--neon-citrus)" : "var(--char-600)"}`,
            background: on ? "var(--neon-citrus)" : "transparent",
            color: on ? "var(--char-900)" : "var(--cream-100)",
            fontSize:11, fontWeight:600, cursor:"pointer", letterSpacing:"0.02em",
            fontFamily:"var(--font-body)",
          }}>{n}</button>
        );
      })}
    </div>
  );
}

window.Specials = Specials;
