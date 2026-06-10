/* ============================================================
   SCREEN: Especiales (campeón, goleador, etc.)
   ============================================================ */

function Specials({ go }) {
  const [sp, setSp] = useState(window.ProdeStore?.getSpecials?.() || {});
  const [official, setOfficial] = useState({});
  const [toast, setToast] = useState(null);
  // Cerradas desde el kickoff del primer partido (11 jun 18:00 CR).
  const locked = window.ProdeSpecials?.specialsLocked?.() ?? false;

  useEffect(() => {
    // Read-back: cuando llegan mis picks de Firestore, completan lo no editado acá.
    const onData = () => setSp((prev) => ({ ...(window.ProdeStore?.getSpecials?.() || {}), ...prev }));
    window.addEventListener("prode:data", onData);
    return () => window.removeEventListener("prode:data", onData);
  }, []);

  useEffect(() => {
    const unsub = window.ProdeDB?.subscribeSpecialResults?.((res) => setOfficial(res || {}));
    return () => unsub && unsub();
  }, []);

  // Cada pick se guarda solo (como en Predicciones): tocás → guarda → toast.
  // Se manda el delta { [key]: value } para que gane sobre el read-back previo.
  const pick = (key, value) => {
    if (locked) return;
    setSp((s) => ({ ...s, [key]: value }));
    setToast("Guardado");
    Promise.resolve(window.ProdeStore?.saveSpecials({ [key]: value }))
      .catch((e) => { console.warn("[Prode Refugio] No se pudo guardar el especial.", e); setToast("Guardado local"); });
    setTimeout(() => setToast(null), 1400);
  };

  const saveAndClose = async () => {
    if (!locked) await window.ProdeStore?.saveSpecials(sp); // guardado final defensivo
    go("matches");
  };

  // Resultado oficial de un especial (si ya se confirmó): respuesta + si acertaste.
  const resultFor = (key) => {
    const ans = official[key];
    if (!ans) return null;
    const norm = window.ProdeSpecials?.normalizeAnswer || ((x) => String(x || ""));
    return { official: ans, hit: norm(sp[key]) !== "" && norm(sp[key]) === norm(ans) };
  };

  const teamPick = (key) => {
    const opts = ["ARG","BRA","FRA","ESP","ENG","POR","GER","NED","MAR","URU","ITA","COL","CRO","BEL","JPN","USA","MEX","CRC"];
    return (
      <div style={{display:"flex", gap:8, overflowX:"auto", padding:"8px 16px 4px", marginLeft:-16, marginRight:-16, scrollbarWidth:"none"}}>
        {opts.map(c => {
          const on = sp[key] === c;
          return (
            <button key={c} disabled={locked} onClick={()=>pick(key, c)} style={{
              flexShrink:0, padding:8, borderRadius:14, cursor: locked ? "not-allowed" : "pointer",
              opacity: locked && !on ? 0.45 : 1,
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
        <SpecialRow icon="trophy" tone="citrus" label="Campeón del Mundial" sub="Levanta la copa" current={sp.campeon} result={resultFor("campeon")}>
          {teamPick("campeon")}
        </SpecialRow>

        <SpecialRow icon="medal" tone="char" label="Subcampeón" sub="Cae en la final" current={sp.subcampeon} result={resultFor("subcampeon")}>
          {teamPick("subcampeon")}
        </SpecialRow>

        <SpecialRow icon="target" tone="orange" label="Goleador del torneo" sub="Bota de oro" current={sp.goleador} result={resultFor("goleador")}>
          <ScorerPick disabled={locked} value={sp.goleador} onChange={v=>pick("goleador", v)}/>
        </SpecialRow>

        <SpecialRow icon="shield" tone="sage" label="Mejor arquero" sub="Guante de oro" current={sp.arquero} result={resultFor("arquero")}>
          <ScorerPick disabled={locked} value={sp.arquero} onChange={v=>pick("arquero", v)} options={[
            "Emiliano Martínez", "Thibaut Courtois", "Mike Maignan", "Unai Simón", "Alisson", "Yann Sommer"
          ]}/>
        </SpecialRow>

        <SpecialRow icon="sparkles" tone="citrus" label="Sorpresa del torneo" sub="Cuartos o más, inesperado" current={sp.sorpresa} result={resultFor("sorpresa")}>
          {teamPick("sorpresa")}
        </SpecialRow>

        <SpecialRow icon="frown" tone="coral" label="Equipo decepción" sub="Se va antes de tiempo" current={sp.decepcion} result={resultFor("decepcion")}>
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
        <Btn full variant={locked ? "dark" : "accent"} size="lg" icon={locked ? "lock" : "save"} onClick={saveAndClose}>
          {locked ? "Especiales cerradas" : "Guardar especiales"}
        </Btn>
        {!locked && (
          <div style={{textAlign:"center", marginTop:10, fontSize:11, color:"var(--char-400)", letterSpacing:"0.04em"}}>
            Cada elección se guarda sola. Podés cambiarla hasta el 11 de junio.
          </div>
        )}
      </div>

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
    </div>
  );
}

function SpecialRow({ icon, tone, label, sub, current, result, children }) {
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
      {result && (
        <div style={{
          marginTop:10, padding:"7px 10px", borderRadius:12,
          background: result.hit ? "rgba(232,242,106,0.10)" : "var(--char-900)",
          border:`1px solid ${result.hit ? "var(--neon-citrus)" : "var(--char-700)"}`,
          display:"flex", alignItems:"center", justifyContent:"space-between", gap:8,
        }}>
          <Eyebrow color={result.hit ? "var(--neon-citrus)" : "var(--char-300)"}>
            Oficial: {result.official}
          </Eyebrow>
          <div style={{
            fontFamily:"var(--font-title)", fontSize:13,
            color: result.hit ? "var(--neon-citrus)" : "var(--char-400)",
          }}>{result.hit ? "✓ +5" : "✗ SIN PUNTO"}</div>
        </div>
      )}
    </div>
  );
}

function ScorerPick({ value, onChange, options, disabled }) {
  const list = options || [
    "Kylian Mbappé", "Lionel Messi", "Lautaro Martínez", "Erling Haaland",
    "Vinícius Jr.", "Harry Kane", "Julián Álvarez", "Pedri",
  ];
  return (
    <div style={{display:"flex", gap:7, flexWrap:"wrap", padding:"4px 0 0"}}>
      {list.map(n => {
        const on = value === n;
        return (
          <button key={n} disabled={disabled} onClick={()=>{ if (!disabled) onChange(n); }} style={{
            padding:"7px 12px", borderRadius:999,
            border:`1px solid ${on ? "var(--neon-citrus)" : "var(--char-600)"}`,
            background: on ? "var(--neon-citrus)" : "transparent",
            color: on ? "var(--char-900)" : "var(--cream-100)",
            fontSize:11, fontWeight:600, cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled && !on ? 0.45 : 1,
            letterSpacing:"0.02em", fontFamily:"var(--font-body)",
          }}>{n}</button>
        );
      })}
    </div>
  );
}

window.Specials = Specials;
