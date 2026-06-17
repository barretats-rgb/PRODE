/* ============================================================
   PRODE REFUGIO — Chat (lógica pura).
   Validación/saneo del texto de un mensaje. Dual navegador/Node.
   ============================================================ */
(function (global) {
  const MAX_LEN = 500;

  // Devuelve { ok:false } si el texto no sirve (vacío, sólo espacios, no-string);
  // { ok:true, text } con el texto saneado (trim + recorte a MAX_LEN) si sirve.
  function validMessage(text) {
    if (typeof text !== "string") return { ok: false };
    const t = text.trim();
    if (t.length === 0) return { ok: false };
    return { ok: true, text: t.slice(0, MAX_LEN) };
  }

  // Normaliza createdAt (Timestamp de Firestore con .toMillis, número en ms, o ISO) a ms.
  // Devuelve 0 si no se puede parsear.
  function msOf(createdAt) {
    if (!createdAt) return 0;
    if (typeof createdAt.toMillis === "function") return createdAt.toMillis();
    if (typeof createdAt === "number") return createdAt;
    const t = Date.parse(createdAt);
    return Number.isFinite(t) ? t : 0;
  }

  // Cantidad de mensajes sin leer: posteriores a lastReadMs y de otros (no propios).
  function countUnread(messages, lastReadMs, myUid) {
    const ref = Number.isFinite(lastReadMs) ? lastReadMs : 0;
    let n = 0;
    for (const m of (messages || [])) {
      if (m && m.uid !== myUid && msOf(m.createdAt) > ref) n++;
    }
    return n;
  }

  // Texto del globito: "" si 0 o menos, "9+" si más de 9, si no el número.
  function formatBadge(n) {
    if (!(n > 0)) return "";
    return n > 9 ? "9+" : String(n);
  }

  const api = { validMessage, MAX_LEN, msOf, countUnread, formatBadge };
  global.ProdeChat = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
