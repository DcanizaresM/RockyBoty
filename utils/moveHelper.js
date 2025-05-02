// utils/moveHelper.js
const moves = require('../data/moves');

/**
 * Devuelve la lista de claves de movimientos
 * ordenada de menor a mayor potencia.
 */
function getMovesSortedByPower() {
    return Object.entries(moves)
        .sort(([, a], [, b]) => a.power - b.power)
        .map(([key]) => key);
}

/**
 * Inicializa los movimientos de un Pokémon en nivel 1:
 * selecciona aleatoriamente `count` ataques del catálogo.
 */
function initMovesByLevel(count = 1) {
    const allKeys = Object.keys(moves);
    const seleccion = [];
    const pool = [...allKeys];
    while (seleccion.length < count && pool.length) {
        const idx = Math.floor(Math.random() * pool.length);
        seleccion.push(pool.splice(idx, 1)[0]);
    }
    return seleccion;
}

/**
 * Para un array de movimientos ya aprendidos,
 * añade el siguiente en la lista ordenada si existe.
 */
function learnNextMove(currentMoves) {
    const sorted = getMovesSortedByPower();
    const nextIndex = currentMoves.length;
    if (nextIndex < sorted.length) {
        return [...currentMoves, sorted[nextIndex]];
    }
    return currentMoves; // ya aprendió todos
}

module.exports = { initMovesByLevel, learnNextMove };
