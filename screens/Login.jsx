/* ============================================================
   SCREEN: Login (ingreso con Google)
   ============================================================ */

function Login() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const entrar = async () => {
    setBusy(true);
    setError("");
    try {
      await window.ProdeDB.signInWithGoogle();
      // El gate de App reacciona vía onAuthChange; no hace falta navegar acá.
    } catch (e) {
      console.error("[Prode Refugio] login", e);
      setError("No se pudo iniciar sesión. Probá de nuevo.");
    } finally {
      // Reset por si el popup se cierra o el callback de sesión tarda. Si la app ya
      // navegó (gate), este setState sobre componente desmontado es no-op en React 18.
      setBusy(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      justifyContent: "center", alignItems: "center", gap: 22, padding: "32px 22px",
      background: "linear-gradient(180deg, rgba(26,25,22,0.2) 0%, var(--char-900) 100%), url('assets/photo-bar-night.jpg')",
      backgroundSize: "cover", backgroundPosition: "center",
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
          fontFamily: "var(--font-title)", fontSize: 22, color: "var(--cream-100)",
          textTransform: "uppercase", letterSpacing: "0.02em", marginTop: 8, lineHeight: 1.1,
        }}>Entrá para armar tu prode</div>
      </div>
      <Btn variant="accent" size="lg" onClick={entrar} icon="log-in">
        {busy ? "Entrando..." : "Entrar con Google"}
      </Btn>
      {error && <div style={{ color: "var(--neon-coral)", fontSize: 12 }}>{error}</div>}
    </div>
  );
}

window.Login = Login;
