/* ============================================================
   PRODE REFUGIO — Lista blanca de administradores (lógica pura).
   Cargable en el navegador (window.ProdeAdmins) y en Node (require).
   ============================================================ */
(function (global) {
  // ¿Este email pertenece a la lista blanca de admins? Compara en minúsculas y sin espacios.
  function isAdminEmail(email, admins) {
    if (!email || !Array.isArray(admins)) return false;
    const e = String(email).trim().toLowerCase();
    return admins.some((a) => String(a).trim().toLowerCase() === e);
  }

  const api = { isAdminEmail };
  global.ProdeAdmins = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
