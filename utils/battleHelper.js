// utils/battleHelper.js
const fetch = require('node-fetch');

// Caché para no volver a pedir el mismo tipo varias veces
const typeCache = new Map();

/**
 * Obtiene de la PokéAPI los damage_relations de un tipo y lo almacena en caché.
 * @param {string} typeName El nombre del tipo, p.ej. "fire".
 * @returns {Promise<{strongAgainst:string[], weakAgainst:string[]}>}
 */
async function getTypeData(typeName) {
    if (typeCache.has(typeName)) {
        return typeCache.get(typeName);
    }
    const res = await fetch(`https://pokeapi.co/api/v2/type/${typeName}`);
    if (!res.ok) {
        throw new Error(`No se pudo obtener datos de tipo "${typeName}" (status ${res.status})`);
    }
    const data = await res.json();
    const dr = data.damage_relations;
    const strongAgainst = dr.double_damage_to.map(t => t.name);
    const weakAgainst = dr.half_damage_to.map(t => t.name);
    const entry = { strongAgainst, weakAgainst };
    typeCache.set(typeName, entry);
    return entry;
}

/**
 * Calcula el modificador de tipo (2, 0.5 o 1) usando la PokéAPI.
 * Normaliza moveType y defenderType si vienen como objetos con .name.
 *
 * @param {string|{name:string}} moveType - El tipo del movimiento.
 * @param {string|{name:string}} defenderType - El tipo del defensor.
 * @returns {Promise<number>}
 */
async function getEffectiveness(moveType, defenderType) {
    const moveName = typeof moveType === 'string' ? moveType
        : moveType && moveType.name ? moveType.name
            : null;
    const defName = typeof defenderType === 'string' ? defenderType
        : defenderType && defenderType.name ? defenderType.name
            : null;

    if (!moveName) return 1;
    const { strongAgainst, weakAgainst } = await getTypeData(moveName);

    if (defName && strongAgainst.includes(defName)) return 2;
    if (defName && weakAgainst.includes(defName)) return 0.5;
    return 1;
}

/**
 * Calcula el daño de un ataque de forma asíncrona:
 * - power del movimiento
 * - usa attacker.ataque / defender.defensa
 * - factor random [0.85,1]
 * - modificador de tipo
 *
 * @param {{hp:number, ataque:number, defensa:number, nivel?:number}} attacker
 * @param {{hp:number, ataque:number, defensa:number, tipo?:string|{name:string}}} defender
 * @param {{power:number, type:string|{name:string}}} move
 * @returns {Promise<{damage:number, effectiveness:number}>}
 */
async function calcularDano(attacker, defender, move) {
    const power = move.power;
    const level = attacker.nivel ?? 5;
    const atk = attacker.ataque;
    const def = defender.defensa;

    // Fórmula base simplificada
    const base = (((2 * level / 5 + 2) * power * (atk / def)) / 50) + 2;
    const randomFactor = 0.85 + Math.random() * 0.15;
    const typeMod = await getEffectiveness(move.type, defender.tipo ?? defender.type);

    const damage = Math.floor(base * randomFactor * typeMod);
    return { damage, effectiveness: typeMod };
}

module.exports = {
    getEffectiveness,
    calcularDano
};
