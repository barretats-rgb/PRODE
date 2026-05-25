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

## Ejecutar localmente

Como es una app estatica, se puede servir desde cualquier servidor local. Por ejemplo:

```bash
npx serve .
```

Luego abrir `Prode Refugio.html`.
