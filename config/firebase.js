// config/firebase.js
const admin = require('firebase-admin');

// Carga tu JSON de service account (opción A):
const serviceAccount = require('./secrets/serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// Obtén la instancia de Firestore
const db = admin.firestore();

module.exports = db;
