/* ============================================================
   SCREEN: Groups (privados) — próximamente
   Los grupos privados reales (crear / unirse por código / ranking
   interno) llegan en un plan aparte. Hasta entonces no mostramos
   data inventada: sólo un estado honesto.
   ============================================================ */

function Groups({ go }) {
  return (
    <div style={{paddingBottom:20}}>
      <AppBar title="Grupos privados" subtitle="Mundial 2026 · Refugio"/>
      <div style={{padding:"32px 20px"}}>
        <div style={{
          borderRadius:22, padding:"28px 22px", textAlign:"center",
          background:"linear-gradient(135deg, var(--char-800), var(--char-900))",
          border:"1px solid var(--char-700)",
        }}>
          <div style={{
            width:64, height:64, borderRadius:"50%", margin:"0 auto 16px",
            background:"var(--char-900)", border:"1.5px solid var(--neon-citrus)",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <i data-lucide="users-round" style={{width:28,height:28,color:"var(--neon-citrus)"}}></i>
          </div>
          <Eyebrow color="var(--neon-citrus)">Próximamente</Eyebrow>
          <div style={{
            fontFamily:"var(--font-title)", fontSize:22, color:"var(--cream-100)",
            textTransform:"uppercase", letterSpacing:"0.02em", margin:"8px 0 10px", lineHeight:1.1,
          }}>Grupos privados</div>
          <div style={{fontSize:13, color:"var(--char-200)", lineHeight:1.5, maxWidth:300, margin:"0 auto"}}>
            Pronto vas a poder armar tu mesa: crear un grupo, invitar con un código
            y competir en un ranking aparte con tu banda.
          </div>
          <div style={{marginTop:18}}>
            <Btn variant="accent" size="md" icon="trophy" onClick={()=>go("ranking")}>Ver el ranking general</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

window.Groups = Groups;
