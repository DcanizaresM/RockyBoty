// utils/battleHelper.js
const typeChart = require('../data/typeChart');

/**
 * Devuelve el modificador de tipo: 2, 0.5 o 1
 */
function getEffectiveness(moveType, defenderType) {
    const chart = typeChart[moveType] || {};
    if (chart.strongAgainst.includes(defenderType)) return 2;
    if (chart.weakAgainst.includes(defenderType)) return 0.5;
    return 1;
}

/**
 * Calcula el daño de un ataque:
 * - Usa attacker.ataque y defender.defensa
 * - Fórmula simplificada (basada en la oficial)
 * - Random factor 0.85–1.00
 * - Modificador de tipo
 */
function calcularDano(attacker, defender, move) {
    const power = move.power;
    const level = attacker.nivel ?? 5;
    const atk = attacker.ataque;   // ahora sí en español
    const def = defender.defensa;  // en español

    // Fórmula base
    const base = (((2 * level / 5 + 2) * power * (atk / def)) / 50) + 2;
    const randomFactor = 0.85 + Math.random() * 0.15;
    const typeMod = getEffectiveness(move.type, defender.type);

    return {
        damage: Math.floor(base * randomFactor * typeMod),
        effectiveness: typeMod
    };
}

module.exports = { calcularDano, getEffectiveness };
