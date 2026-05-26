# Plan 2E — Deploy a Vercel (Prode Refugio)

**Objetivo:** Poner la app online en una URL pública. Casi todo son pasos del dueño en sus cuentas (Vercel + Firebase); el repo ya queda listo con `vercel.json`.

## Qué dejé en el repo
- **`vercel.json`** — le dice a Vercel: `api/**/*.js` son **funciones Node** (`@vercel/node`) y todo lo demás se sirve **estático** (`@vercel/static`). Esto evita el problema típico de que, al haber `package.json`, Vercel deploye sólo la función y saltee el HTML.
- No hay build: la app es estática (HTML + React/Babel por CDN). El `package.json` es sólo para `npm test` (no afecta el deploy).

## Prerrequisitos (de planes anteriores, ya hechos)
- Código en GitHub: `barretats-rgb/PRODE`, rama `main`.
- Firebase: Google sign-in habilitado + reglas (`firestore.rules`) publicadas.

## Pasos del deploy (los hacés vos)

### 1. Importar el proyecto en Vercel
- Entrá a [vercel.com](https://vercel.com) y logueate con GitHub.
- **Add New… → Project → Import** el repo `barretats-rgb/PRODE`.
- Framework Preset: dejá **Other** (el `vercel.json` ya manda). No pongas Build Command ni Output Directory.
- **Deploy**. Te queda una URL tipo `https://prode-xxxx.vercel.app`.

### 2. ⚠️ Autorizar el dominio en Firebase (CRÍTICO)
Sin esto, el login con Google **falla en producción** (`auth/unauthorized-domain`).
- Firebase Console → proyecto **prode-ee447** → **Authentication → Settings → Authorized domains → Add domain**.
- Agregá el dominio de Vercel **sin `https://`**, p. ej. `prode-xxxx.vercel.app`. (Si después le ponés dominio propio, agregá ese también.)

### 3. (Opcional) API-Football para marcadores en vivo
Sólo si querés que la API traiga marcadores en vivo (el prode funciona sin esto: el admin carga resultados a mano).
- Vercel → tu proyecto → **Settings → Environment Variables → Add**:
  - Name: `API_FOOTBALL_KEY` · Value: tu key de API-Football · Environments: Production (y Preview si querés).
- **Redeploy** (Deployments → … → Redeploy) para que tome la variable.

### 4. Verificar en producción
- Abrí la URL de Vercel.
- Entrá con Google (si falla con `unauthorized-domain`, revisá el paso 2).
- Cargá una predicción; como admin (`barretats@gmail.com`) confirmá un resultado y mirá el ranking.
- Probá las funciones: `https://<tu-url>/api/world-cup-schedule` debe devolver JSON (con `configured:false` si no pusiste la key — eso está OK).

## Notas
- **Cada push a `main`** dispara un deploy automático en Vercel (CI/CD por defecto). Los PRs/ramas generan Preview URLs.
- La config de Firebase en `firebase-config.js` es pública (es normal para apps web Firebase); la seguridad la dan las reglas de Firestore.
- Si el static no se sirviera (verías la función pero no el HTML), confirmá que `vercel.json` está en la raíz y que el Build Command quedó vacío.

## Pendientes post-deploy (futuros)
- Cierre por horario **server-side** (reglas) — necesita sembrar el fixture con `kickoffAt` en Firestore.
- Plan 3 (grupos privados), especiales puntuados, eliminatorias.
