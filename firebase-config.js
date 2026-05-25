/* ============================================================
   Firebase config

   1. Create a Firebase project.
   2. Enable Authentication (Anonymous or Phone) and Firestore.
   3. Replace the placeholder values below with your web app config.
   ============================================================ */

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyBJvyhQ7qpAIC5MyZcZIQzDgmj3YYvOCeo",
  authDomain: "prode-ee447.firebaseapp.com",
  projectId: "prode-ee447",
  storageBucket: "prode-ee447.firebasestorage.app",
  messagingSenderId: "337362377841",
  appId: "1:337362377841:web:42d3130acfbcb21365cfd0",
};

// Emails con acceso al panel Admin. La barrera real está en las reglas de Firestore (Plan 2B);
// esto es para mostrar/ocultar el panel en la UI.
window.PRODE_ADMINS = ["barretats@gmail.com"];
