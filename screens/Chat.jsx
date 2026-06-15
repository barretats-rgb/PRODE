/* ============================================================
   SCREEN: Chat global de la barra
   Se suscribe SÓLO mientras está montada (al entrar a la pestaña)
   y se desuscribe al salir → lecturas de Firestore acotadas.
   ============================================================ */

function Chat({ go }) {
  const [messages, setMessages] = useState(null); // null = cargando
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const lastSentRef = useRef(0);

  const myUid = window.ProdeDB?.getUser?.()?.uid;
  const isAdmin = !!window.ProdeDB?.isAdmin?.();

  useEffect(() => {
    const unsub = window.ProdeDB?.subscribeMessages?.((list) => setMessages(list));
    return () => unsub && unsub();
  }, []);

  // Auto-scroll al último mensaje cuando llegan nuevos.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async () => {
    const v = window.ProdeChat?.validMessage?.(text);
    if (!v || !v.ok || sending) return;
    if (Date.now() - lastSentRef.current < 1000) return; // freno anti-spam (1s)
    setSending(true);
    try {
      const r = await window.ProdeDB?.sendMessage?.(text);
      if (r && r.ok) { setText(""); lastSentRef.current = Date.now(); }
    } catch (e) {
      console.warn("[Prode Refugio] enviar mensaje", e);
    } finally {
      setSending(false);
    }
  };

  const onKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  const del = async (id) => {
    try { await window.ProdeDB?.deleteMessage?.(id); }
    catch (e) { console.error("[Prode Refugio] borrar mensaje", e); }
  };

  const hora = (createdAt) => {
    const ms = createdAt?.toMillis ? createdAt.toMillis() : (createdAt ? Date.parse(createdAt) : 0);
    if (!ms) return "";
    const d = new Date(ms);
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  };

  const loading = messages === null;
  const list = messages || [];

  return (
    <div style={{display:"flex", flexDirection:"column", height:"100%", minHeight:"100vh"}}>
      <AppBar title="Chat" subtitle="La barra del Refugio"/>

      {/* lista de mensajes */}
      <div ref={listRef} style={{flex:1, overflowY:"auto", padding:"8px 14px 12px"}}>
        {loading && (
          <div style={{padding:"30px 16px", textAlign:"center", fontSize:13, color:"var(--char-300)"}}>
            Cargando chat...
          </div>
        )}
        {!loading && list.length === 0 && (
          <div style={{padding:"40px 16px", textAlign:"center", fontSize:13, color:"var(--char-300)", lineHeight:1.5}}>
            Todavía no hay mensajes. <span style={{color:"var(--neon-citrus)"}}>Rompé el hielo.</span>
          </div>
        )}
        {list.map((m) => {
          const mine = m.uid === myUid;
          return (
            <div key={m.id} style={{
              display:"flex", gap:10, marginBottom:12,
              flexDirection: mine ? "row-reverse" : "row",
            }}>
              <Avatar initials={window.ProdeRanking?.initials?.(m.name) || "JR"} size={30} tone={m.avatarTone || "olive"}/>
              <div style={{maxWidth:"72%"}}>
                <div style={{
                  display:"flex", alignItems:"baseline", gap:8, marginBottom:3,
                  justifyContent: mine ? "flex-end" : "flex-start",
                }}>
                  <span style={{fontSize:11, fontWeight:700, color: mine ? "var(--neon-citrus)" : "var(--cream-100)"}}>
                    {mine ? "Vos" : m.name}
                  </span>
                  <span style={{fontSize:9, color:"var(--char-500)"}}>{hora(m.createdAt)}</span>
                  {isAdmin && (
                    <button onClick={()=>del(m.id)} title="Borrar" style={{
                      border:0, background:"transparent", color:"var(--char-500)", cursor:"pointer", padding:0,
                      display:"inline-flex",
                    }}>
                      <i data-lucide="trash-2" style={{width:12, height:12}}></i>
                    </button>
                  )}
                </div>
                <div style={{
                  padding:"9px 12px", borderRadius:14,
                  background: mine ? "rgba(232,242,106,0.12)" : "var(--char-800)",
                  border:`1px solid ${mine ? "var(--neon-citrus)" : "var(--char-700)"}`,
                  color:"var(--cream-100)", fontSize:13, lineHeight:1.4,
                  wordBreak:"break-word", whiteSpace:"pre-wrap",
                }}>{m.text}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* input */}
      <div style={{
        position:"sticky", bottom:0, display:"flex", gap:8, padding:"10px 14px",
        background:"var(--char-900)", borderTop:"1px solid var(--char-700)",
      }}>
        <input
          value={text}
          onChange={(e)=>setText(e.target.value)}
          onKeyDown={onKey}
          placeholder="Escribí algo..."
          maxLength={window.ProdeChat?.MAX_LEN || 500}
          style={{
            flex:1, height:42, borderRadius:999, padding:"0 16px",
            background:"var(--char-800)", color:"var(--cream-100)",
            border:"1px solid var(--char-600)", outline:"none",
            fontFamily:"var(--font-body)", fontSize:14, boxSizing:"border-box",
          }}/>
        <Btn size="md" variant="accent" icon="send" onClick={send}>
          {sending ? "..." : ""}
        </Btn>
      </div>
    </div>
  );
}

window.Chat = Chat;
