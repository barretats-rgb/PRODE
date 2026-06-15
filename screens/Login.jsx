/* ============================================================
   SCREEN: Login (ingreso con Google o usuario/contraseña)
   ============================================================ */

function Login() {
  const [mode, setMode] = useState("home"); // home | login | signup
  const [usuario, setUsuario] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const entrarGoogle = async () => {
    setBusy(true); setError("");
    try {
      await window.ProdeDB.signInWithGoogle();
    } catch (e) {
      console.error("[Prode Refugio] login google", e);
      setError("No se pudo iniciar sesión con Google. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const entrarUsuario = async () => {
    setError("");
    const v = window.ProdeAuthUsername?.validateLogin?.(usuario, pass);
    if (v && !v.ok) { setError(v.error); return; }
    setBusy(true);
    try {
      await window.ProdeDB.signInWithUsername(usuario, pass);
      // El gate de App reacciona vía onAuthChange.
    } catch (e) {
      setError(e.message || "No se pudo entrar.");
    } finally {
      setBusy(false);
    }
  };

  const crearUsuario = async () => {
    setError("");
    const v = window.ProdeAuthUsername?.validateSignup?.(usuario, pass, pass2);
    if (v && !v.ok) { setError(v.error); return; }
    setBusy(true);
    try {
      await window.ProdeDB.signUpWithUsername(usuario, pass);
      // Cuenta creada: el gate de App lleva al asistente de perfil (teléfono).
    } catch (e) {
      setError(e.message || "No se pudo crear la cuenta.");
    } finally {
      setBusy(false);
    }
  };

  const goHome = () => { setMode("home"); setError(""); setPass(""); setPass2(""); };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      justifyContent: "center", alignItems: "center", gap: 20, padding: "32px 22px",
      background: "linear-gradient(180deg, rgba(26,25,22,0.2) 0%, var(--char-900) 100%), url('assets/messi.jpg')",
      backgroundSize: "cover", backgroundPosition: "center top",
    }}>
      <div style={{
        fontFamily: "var(--font-display)", fontSize: 44, lineHeight: 0.85,
        textTransform: "uppercase", color: "var(--orange-500)", textAlign: "center",
      }}>
        REFU<br/><span style={{ paddingLeft: "0.55em", display: "inline-block", color: "var(--cream-100)" }}>GIO</span>
      </div>
      <div style={{ textAlign: "center", maxWidth: 320 }}>
        <Eyebrow color="var(--neon-citrus)">Prode Mundial '26 · Tamarindo</Eyebrow>
        <div style={{
          fontFamily: "var(--font-title)", fontSize: 20, color: "var(--cream-100)",
          textTransform: "uppercase", letterSpacing: "0.02em", marginTop: 8, lineHeight: 1.1,
        }}>{mode === "signup" ? "Creá tu usuario" : "Entrá para armar tu prode"}</div>
      </div>

      {/* card */}
      <div style={{
        width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 12,
        background: "rgba(26,25,22,0.66)", border: "1px solid var(--char-700)",
        borderRadius: 20, padding: 18,
      }}>
        {mode === "home" && (
          <>
            <Btn full variant="accent" size="lg" onClick={entrarGoogle} icon="log-in">
              {busy ? "Entrando..." : "Entrar con Google"}
            </Btn>
            <div style={{textAlign:"center", fontSize:10, color:"var(--char-500)", letterSpacing:"0.2em"}}>O</div>
            <Btn full variant="ghost" size="lg" onClick={()=>{ setMode("login"); setError(""); }} icon="user">
              Entrar con usuario y contraseña
            </Btn>
          </>
        )}

        {(mode === "login" || mode === "signup") && (
          <>
            <input value={usuario} onChange={(e)=>setUsuario(e.target.value)}
              placeholder="Usuario" autoCapitalize="none" autoCorrect="off"
              style={loginInput}/>
            <input value={pass} onChange={(e)=>setPass(e.target.value)} type="password"
              placeholder="Contraseña"
              onKeyDown={(e)=>{ if (e.key === "Enter" && mode === "login") entrarUsuario(); }}
              style={loginInput}/>
            {mode === "signup" && (
              <input value={pass2} onChange={(e)=>setPass2(e.target.value)} type="password"
                placeholder="Confirmar contraseña"
                onKeyDown={(e)=>{ if (e.key === "Enter") crearUsuario(); }}
                style={loginInput}/>
            )}

            {mode === "login" ? (
              <>
                <Btn full variant="accent" size="lg" onClick={entrarUsuario} icon="log-in">
                  {busy ? "Entrando..." : "Entrar"}
                </Btn>
                <button onClick={()=>{ setMode("signup"); setError(""); }} style={loginLink}>Crear usuario nuevo</button>
              </>
            ) : (
              <>
                <Btn full variant="accent" size="lg" onClick={crearUsuario} icon="zap">
                  {busy ? "Creando..." : "Crear cuenta"}
                </Btn>
                <button onClick={()=>{ setMode("login"); setError(""); }} style={loginLink}>Ya tengo usuario</button>
              </>
            )}
            <button onClick={goHome} style={{...loginLink, color:"var(--char-400)"}}>Volver</button>
          </>
        )}

        {error && <div style={{ color: "var(--neon-coral)", fontSize: 12, textAlign:"center" }}>{error}</div>}
      </div>
    </div>
  );
}

const loginInput = {
  width:"100%", height:46, borderRadius:12, padding:"0 14px",
  background:"var(--char-900)", color:"var(--cream-100)",
  border:"1px solid var(--char-600)", outline:"none",
  fontFamily:"var(--font-body)", fontSize:15, boxSizing:"border-box",
};
const loginLink = {
  border:0, background:"transparent", color:"var(--neon-citrus)", cursor:"pointer",
  fontSize:12, fontWeight:700, letterSpacing:"0.04em", padding:"4px 0", fontFamily:"var(--font-body)",
};

window.Login = Login;
