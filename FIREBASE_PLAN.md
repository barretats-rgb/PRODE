# Firebase para Prode Refugio

Este proyecto ya esta preparado para conectarse a Firebase sin perder el prototipo actual.

## Que guardar

- `players`: perfil del jugador, telefono, equipo favorito, avatar, puntos.
- `matches`: calendario, estado, goles, sede y hora.
- `predictions`: una prediccion por jugador y partido.
- `specialPredictions`: campeon, subcampeon, goleador, arquero, sorpresa, decepcion.
- `groups`: grupos privados con codigo de invitacion.
- `groupMembers`: relacion entre jugadores y grupos.
- `announcements`: anuncios que publica Refugio.

## Estructura recomendada

```txt
players/{playerId}
matches/{matchId}
predictions/{playerId_matchId}
specialPredictions/{playerId}
groups/{groupId}
groupMembers/{groupId_playerId}
announcements/{announcementId}
```

## Indices utiles

- `players`: `points desc`
- `predictions`: `playerId asc`, `matchId asc`
- `groupMembers`: `groupId asc`, `points desc`
- `matches`: `kickoffAt asc`

## Pasos para activar

1. Crear proyecto en Firebase.
2. Activar Firestore.
3. Activar Authentication. Para empezar, Anonymous Authentication alcanza.
4. Registrar una Web App en Firebase.
5. Pegar la configuracion en `firebase-config.js`.
6. Publicar reglas de Firestore.

## Reglas iniciales para desarrollo

Estas reglas sirven para probar rapido. Antes de lanzar el juego real conviene cerrarlas por rol/admin.

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    match /players/{playerId} {
      allow read: if true;
      allow create, update: if signedIn() && request.auth.uid == playerId;
    }

    match /predictions/{predictionId} {
      allow read: if signedIn();
      allow create, update: if signedIn()
        && request.resource.data.playerId == request.auth.uid;
    }

    match /specialPredictions/{playerId} {
      allow read: if signedIn();
      allow create, update: if signedIn() && request.auth.uid == playerId;
    }

    match /matches/{matchId} {
      allow read: if true;
      allow write: if false;
    }

    match /groups/{groupId} {
      allow read: if signedIn();
      allow write: if signedIn();
    }

    match /groupMembers/{memberId} {
      allow read, write: if signedIn();
    }

    match /announcements/{announcementId} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

## Nota

El prototipo sigue funcionando sin credenciales reales. En ese modo guarda en `localStorage` y usa los datos demo de `data.js`.
