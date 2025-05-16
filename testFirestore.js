// testFirestore.js
const admin = require('firebase-admin');      // <-- Añade esto
const db = require('./config/firebase');

async function test() {
    // Referencia a un doc de prueba
    const ref = db.collection('pruebas').doc('ping');

    // Escritura con timestamp de servidor
    await ref.set({
        mensaje: 'pong',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // Lectura del mismo documento
    const snap = await ref.get();
    console.log('Contenido de pruebas/ping:', snap.data());
}

test()
    .then(() => {
        console.log('✅ Test completado con éxito');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error en testFirestore:', err);
        process.exit(1);
    });
