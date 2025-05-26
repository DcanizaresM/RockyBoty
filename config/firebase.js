// config/firebase.js
const admin = require('firebase-admin');

if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    throw new Error('❌ Falta la variable FIREBASE_SERVICE_ACCOUNT_BASE64');
}

const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // databaseURL: process.env.FIREBASE_DATABASE_URL, // descomenta si usas RealtimeDB
});

const db = admin.firestore();
module.exports = db;
