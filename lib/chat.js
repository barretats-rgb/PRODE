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

  const api = { validMessage, MAX_LEN };
  global.ProdeChat = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
