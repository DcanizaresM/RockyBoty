// config/firebase.js
const admin = require('firebase-admin');

// Verifica que la credencial llegó como Base64
if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    throw new Error('❌ Falta la variable FIREBASE_SERVICE_ACCOUNT_BASE64');
}

// Decodifica y parsea el JSON
const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // Si usas Realtime DB o Storage, descomenta y añade tu URL:
    // databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = admin.firestore();
module.exports = db;
