// utils/db.js
// Reemplaza el acceso a archivos JSON por Cloud Firestore

const admin = require('firebase-admin');
const db = require('../config/firebase');

const usuariosCol = db.collection('usuarios');
const batallasCol = db.collection('combates');

/**
 * Devuelve un array de todos los usuarios, incluyendo su id.
 * Cada objeto: { id, ...campos }
 */
async function getAllUsers() {
    const snapshot = await usuariosCol.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Reemplaza completamente la colección 'usuarios' con el array proporcionado.
 * Cada elemento del array debe incluir la propiedad 'id'.
 */
async function saveAllUsers(users) {
    const batch = db.batch();

    // Borrar documentos existentes
    const existing = await usuariosCol.get();
    existing.docs.forEach(doc => batch.delete(doc.ref));

    // Añadir nuevos usuarios
    users.forEach(user => {
        const { id, ...data } = user;
        const ref = usuariosCol.doc(id);
        batch.set(ref, data);
    });

    await batch.commit();
}

/**
 * Obtiene un usuario por su ID.
 * Devuelve { id, ...campos } o null si no existe.
 */
async function getUser(userId) {
    const doc = await usuariosCol.doc(userId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
}

/**
 * Crea o actualiza un usuario.
 * userData puede incluir cualquier campo (ej. username, starter, team, etc.).
 */
async function saveUser(userId, userData) {
    await usuariosCol.doc(userId).set(userData, { merge: true });
}

/**
 * Devuelve un array con todas las batallas, incluyendo su id.
 * Cada objeto: { id, ...campos }
 */
async function getAllBattles() {
    const snapshot = await batallasCol.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Añade todas las batallas proporcionadas a la colección, borrando previo contenido.
 * Utiliza add() para generar IDs automáticamente.
 */
async function saveAllBattles(battles) {
    const batch = db.batch();

    // Borrar documentos existentes
    const existing = await batallasCol.get();
    existing.docs.forEach(doc => batch.delete(doc.ref));

    // Añadir nuevas batallas con ID generado por Firestore
    battles.forEach(battle => {
        const { id, ...data } = battle;
        const ref = batallasCol.doc(); // ID automático
        batch.set(ref, data);
    });

    await batch.commit();
}

module.exports = {
    getAllUsers,
    saveAllUsers,
    getUser,
    saveUser,
    getAllBattles,
    saveAllBattles
};
