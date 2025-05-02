const fs = require('fs');
const path = require('path');

const usersPath = path.join(__dirname, 'users.json');
const battlesPath = path.join(__dirname, 'battles.json');

// Funciones de usuarios
function getAllUsers() {
    return JSON.parse(fs.readFileSync(usersPath, 'utf8'));
}

function saveAllUsers(users) {
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
}

function getUser(userId) {
    const users = getAllUsers();
    return users[userId] || null;
}

function saveUser(userId, userData) {
    const users = getAllUsers();
    users[userId] = userData;
    saveAllUsers(users);
}

// Funciones de batallas
function getAllBattles() {
    try {
        return JSON.parse(fs.readFileSync(battlesPath, 'utf8'));
    } catch (err) {
        return []; // Si no existe, retornamos un array vacío
    }
}

function saveAllBattles(battles) {
    fs.writeFileSync(battlesPath, JSON.stringify(battles, null, 2));
}

module.exports = {
    // Funciones de usuarios
    getAllUsers,
    saveAllUsers,
    getUser,
    saveUser,
    // Funciones de batallas
    getAllBattles,
    saveAllBattles
};
