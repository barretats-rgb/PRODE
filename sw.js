/* ============================================================
   PRODE REFUGIO — Service worker mínimo.
   Su único objetivo es habilitar la instalación de la PWA en
   Android/Chrome (el navegador exige un SW con handler de fetch).
   NO cachea archivos a propósito: así nunca sirve una versión vieja
   mientras se itera / despliega.
   ============================================================ */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => { /* passthrough: el navegador hace el fetch normal */ });
