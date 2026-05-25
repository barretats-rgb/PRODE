# Prode Refugio - Mundial 2026

Prototipo frontend del prode de Refugio Tamarindo para el Mundial 2026.

## Estado actual

- App HTML + React/Babel desde CDN.
- Datos demo en `data.js`.
- Pantallas mobile para registro, predicciones, ranking, grupos, perfil y especiales.
- Panel admin visual para resultados, partidos, jugadores, anuncios y premios.
- Capa inicial de Firebase en `firebase-service.js`.

## Firebase

Para activar persistencia real:

1. Crear un proyecto en Firebase.
2. Activar Firestore.
3. Activar Authentication, empezando con Anonymous Authentication.
4. Registrar una Web App.
5. Pegar la configuracion en `firebase-config.js`.

Ver el modelo de datos sugerido en `FIREBASE_PLAN.md`.

## API-Football live scores

La app incluye una funcion serverless en `api/live-matches.js` para consultar API-Football sin exponer la API key en el navegador.

En Vercel, agrega una variable de entorno:

```bash
API_FOOTBALL_KEY=tu_api_key_de_api_football
```

La app consulta `/api/live-matches`, que por defecto usa `league=1`, `season=2026` y `status=1H-HT-2H-ET-P-BT-LIVE`. Intenta empatar esos fixtures con los partidos locales por selecciones, y actualiza marcador, minuto y estado. Si la variable no existe o la API no responde, la app sigue funcionando con datos locales/manuales.

Tambien existe `/api/world-cup-schedule`, que trae el calendario completo del Mundial (`league=1`, `season=2026`) para validar o poblar partidos.

## Ejecutar localmente

Como es una app estatica, se puede servir desde cualquier servidor local. Por ejemplo:

```bash
npx serve .
```

Luego abrir `Prode Refugio.html`.
