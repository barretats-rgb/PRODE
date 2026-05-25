/* ============================================================
   SCREEN: Register
   ============================================================ */

function Register({ go }) {
  const savedPlayer = window.ProdeStore?.getPlayer?.() || {};
  const [step, setStep] = useState(0);
  const [name, setName] = useState(savedPlayer.name || "");
  const [phone, setPhone] = useState(savedPlayer.phone || "");
  const [team, setTeam] = useState(savedPlayer.favoriteTeam || "CRC");
  const [avatar, setAvatar] = useState(2);
  const [mode, setMode] = useState(savedPlayer.mode || "solo"); // solo | create | join
  const [groupName, setGroupName] = useState(savedPlayer.groupName || "La Mesa del Imperial");
  const [code, setCode] = useState(savedPlayer.groupCode || "");

  const avatars = ["orange","citrus","sage","tan","olive","char"];
  const favs = ["ARG","CRC","BRA","URU","MEX","COL","ESP","FRA","ENG","USA","GER","ITA"];
  const initials = name.split(" ").map(w=>w[0]).slice(0,2).join("") || "??";

  const finishRegistration = async () => {
    await window.ProdeStore?.savePlayer({
      name,
      phone,
      favoriteTeam: team,
      avatarTone: avatars[avatar],
      avatar: initials,
      mode,
      groupName: mode === "create" ? groupName : "",
      groupCode: mode === "join" ? code : "",
      points: 0,
      exact: 0,
      winner: 0,
    });
    go("matches");
  };

  return (
    <div style={{padding:"0 16px 28px"}}>
      <AppBar back onBack={()=>go("home")} title="Crear cuenta" subtitle={`Paso ${step+1} de 3`}/>

      {/* progress */}
      <div style={{display:"flex", gap:5, padding:"6px 0 18px"}}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            flex:1, height:4, borderRadius:999,
            background: i <= step ? "var(--neon-citrus)" : "var(--char-700)",
            transition:"background .2s",
          }}/>
        ))}
      </div>

      {step === 0 && (
        <div>
          <Eyebrow color="var(--neon-citrus)">Tu nombre y contacto</Eyebrow>
          <h2 style={{
            fontFamily:"var(--font-title)", fontSize:30, color:"var(--cream-100)",
            textTransform:"uppercase", letterSpacing:"0.02em", margin:"4px 0 18px",
            lineHeight:0.98,
          }}>Decinos quién<br/>levanta la copa.</h2>

          <Field label="Nombre o apodo">
            <input value={name} onChange={e=>setName(e.target.value)} style={inputStyle}/>
          </Field>
          <Field label="WhatsApp" sub="Para avisarte cuando tu equipo juega">
            <input value={phone} onChange={e=>setPhone(e.target.value)} style={inputStyle}/>
          </Field>

          <Eyebrow color="var(--neon-citrus)" style={{marginTop:18, marginBottom:8}}>Elegí tu avatar</Eyebrow>
          <div style={{display:"flex", gap:10}}>
            {avatars.map((tone, i) => (
              <button key={i} onClick={()=>setAvatar(i)} style={{
                border:0, padding:0, cursor:"pointer", background:"transparent",
              }}>
                <Avatar initials={initials} size={48} tone={tone} you={i===avatar}/>
              </button>
            ))}
          </div>

          <Btn full variant="accent" size="lg" style={{marginTop:26}} onClick={()=>setStep(1)} icon="arrow-right">
            Siguiente
          </Btn>
        </div>
      )}

      {step === 1 && (
        <div>
          <Eyebrow color="var(--neon-citrus)">Equipo favorito</Eyebrow>
          <h2 style={{
            fontFamily:"var(--font-title)", fontSize:30, color:"var(--cream-100)",
            textTransform:"uppercase", letterSpacing:"0.02em", margin:"4px 0 18px",
            lineHeight:0.98,
          }}>¿Por quién la vas<br/>a remar?</h2>

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10}}>
            {favs.map(code => {
              const on = team === code;
              return (
                <button key={code} onClick={()=>setTeam(code)} style={{
                  display:"flex", flexDirection:"column", alignItems:"center", gap:7,
                  padding:"14px 8px", borderRadius:18, cursor:"pointer",
                  background: on ? "var(--char-700)" : "var(--char-800)",
                  border: `1.5px solid ${on ? "var(--neon-citrus)" : "var(--char-700)"}`,
                  boxShadow: on ? "0 0 20px -8px rgba(232,242,106,0.4)" : "none",
                  transition:"all .15s",
                }}>
                  <Flag code={code} size={42}/>
                  <div style={{
                    fontFamily:"var(--font-body)", fontSize:9, color:"var(--cream-100)",
                    letterSpacing:"0.18em", textTransform:"uppercase", fontWeight:700,
                  }}>{code}</div>
                </button>
              );
            })}
          </div>

          <div style={{display:"flex", gap:10, marginTop:22}}>
            <Btn variant="ghost" size="lg" onClick={()=>setStep(0)} style={{flex:1}}>Atrás</Btn>
            <Btn variant="accent" size="lg" onClick={()=>setStep(2)} icon="arrow-right" style={{flex:2}}>Siguiente</Btn>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <Eyebrow color="var(--neon-citrus)">Solo o en grupo</Eyebrow>
          <h2 style={{
            fontFamily:"var(--font-title)", fontSize:30, color:"var(--cream-100)",
            textTransform:"uppercase", letterSpacing:"0.02em", margin:"4px 0 18px",
            lineHeight:0.98,
          }}>Demostrá que sabés<br/>más que tus amigos.</h2>

          <ModeRow id="solo" active={mode} onClick={setMode}
            icon="user" title="Jugar solo" sub="Vas directo al ranking general del Refugio"/>
          <ModeRow id="create" active={mode} onClick={setMode}
            icon="users-round" title="Crear grupo privado" sub="Ideal para tu mesa o el chat de amigos"/>
          <ModeRow id="join" active={mode} onClick={setMode}
            icon="link" title="Unirme con código" sub="Tu amigo ya armó el grupo"/>

          {mode === "create" && (
            <div style={{marginTop:14}}>
              <Field label="Nombre del grupo">
                <input value={groupName} onChange={e=>setGroupName(e.target.value)} style={inputStyle}/>
              </Field>
              <div style={{
                marginTop:8, padding:"10px 12px", borderRadius:14,
                background:"var(--char-900)", border:"1px dashed var(--char-600)",
                fontSize:11, color:"var(--char-200)", letterSpacing:"0.04em",
              }}>
                Te generamos un código tipo <span style={{color:"var(--neon-citrus)", fontFamily:"var(--font-mono)", letterSpacing:"0.1em"}}>IMP-784</span> para compartir.
              </div>
            </div>
          )}

          {mode === "join" && (
            <div style={{marginTop:14}}>
              <Field label="Código del grupo">
                <input value={code} placeholder="IMP-784" onChange={e=>setCode(e.target.value.toUpperCase())} style={{...inputStyle, fontFamily:"var(--font-mono)", letterSpacing:"0.18em"}}/>
              </Field>
            </div>
          )}

          <div style={{display:"flex", gap:10, marginTop:22}}>
            <Btn variant="ghost" size="lg" onClick={()=>setStep(1)} style={{flex:1}}>Atrás</Btn>
            <Btn variant="accent" size="lg" onClick={finishRegistration} icon="zap" style={{flex:2}}>
              Empezar
            </Btn>
          </div>

          <div style={{
            marginTop:18, padding:"12px 14px", borderRadius:14,
            background:"rgba(232,242,106,0.06)", border:"1px solid rgba(232,242,106,0.2)",
          }}>
            <Eyebrow color="var(--neon-citrus)">Bienvenido</Eyebrow>
            <div style={{
              fontFamily:"var(--font-title)", fontSize:15, color:"var(--cream-100)",
              textTransform:"uppercase", letterSpacing:"0.02em", marginTop:3,
            }}>Tu mesa, tu birra, tu prode.</div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModeRow({ id, active, onClick, icon, title, sub }) {
  const on = active === id;
  return (
    <button onClick={()=>onClick(id)} style={{
      display:"flex", alignItems:"center", gap:14, width:"100%",
      padding:"14px 14px", borderRadius:18, cursor:"pointer", textAlign:"left",
      background: on ? "var(--char-700)" : "var(--char-800)",
      border: `1.5px solid ${on ? "var(--neon-citrus)" : "var(--char-700)"}`,
      marginBottom:9, transition:"all .15s",
    }}>
      <div style={{
        width:42, height:42, borderRadius:"50%",
        background: on ? "var(--neon-citrus)" : "var(--char-900)",
        color: on ? "var(--char-900)" : "var(--cream-100)",
        display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
      }}>
        <i data-lucide={icon} style={{width:20,height:20,strokeWidth:1.75}}></i>
      </div>
      <div style={{flex:1}}>
        <div style={{
          fontFamily:"var(--font-title)", fontSize:15, color:"var(--cream-100)",
          textTransform:"uppercase", letterSpacing:"0.02em", lineHeight:1.1,
        }}>{title}</div>
        <div style={{fontSize:11, color:"var(--char-400)", marginTop:3}}>{sub}</div>
      </div>
      <div style={{
        width:20, height:20, borderRadius:"50%",
        border:`2px solid ${on ? "var(--neon-citrus)" : "var(--char-500)"}`,
        background: on ? "var(--neon-citrus)" : "transparent",
        display:"flex", alignItems:"center", justifyContent:"center",
        flexShrink:0,
      }}>
        {on && <div style={{width:8,height:8,borderRadius:"50%",background:"var(--char-900)"}}/>}
      </div>
    </button>
  );
}

function Field({ label, sub, children }) {
  return (
    <div style={{marginBottom:14}}>
      <Eyebrow color="var(--char-200)" style={{marginBottom:6}}>{label}</Eyebrow>
      {children}
      {sub && <div style={{fontSize:10, color:"var(--char-400)", marginTop:5, letterSpacing:"0.04em"}}>{sub}</div>}
    </div>
  );
}

const inputStyle = {
  width:"100%", padding:"14px 16px", borderRadius:14,
  background:"var(--char-900)", color:"var(--cream-100)",
  border:"1.5px solid var(--char-700)", outline:"none",
  fontFamily:"var(--font-body)", fontSize:15,
  boxSizing:"border-box",
};

window.Register = Register;
