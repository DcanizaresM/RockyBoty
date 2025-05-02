// data/typeChart.js
// Tabla de efectividad de tipos (un solo tipo por Pokémon)
// strongAgainst: ×2  |  weakAgainst: ×0.5

module.exports = {
    fire: {
        strongAgainst: ['grass', 'bug'],
        weakAgainst: ['water', 'rock', 'ground']
    },
    water: {
        strongAgainst: ['fire'],
        weakAgainst: ['grass', 'electric']
    },
    electric: {
        strongAgainst: ['water'],
        weakAgainst: ['ground']
    },
    psychic: {
        strongAgainst: ['fighting', 'poison'],
        weakAgainst: []
    },
    rock: {
        strongAgainst: ['water', 'ice'],
        weakAgainst: ['flying', 'poison', 'bug', 'psychic']
    },
    poison: {
        strongAgainst: ['bug', 'grass'],
        weakAgainst: ['ground', 'rock', 'ghost']
    },
    fighting: {
        strongAgainst: ['water', 'normal', 'ice'],
        weakAgainst: ['flying', 'bug', 'poison']
    },
    dragon: {
        strongAgainst: ['dragon'],
        weakAgainst: ['dragon']
    },
    flying: {
        strongAgainst: ['fighting', 'bug', 'grass'],
        weakAgainst: ['rock', 'electric']
    },
    ice: {
        strongAgainst: ['flying', 'ground', 'grass', 'dragon'],
        weakAgainst: ['water']
    },
    ghost: {
        strongAgainst: ['ghost'],
        weakAgainst: ['ghost']
    },
    normal: {
        strongAgainst: [],
        weakAgainst: ['rock']
    },
    grass: {
        strongAgainst: ['water', 'rock', 'ground'],
        weakAgainst: ['fire', 'flying', 'poison', 'bug', 'grass']
    },
    bug: {
        strongAgainst: ['poison', 'grass', 'psychic'],
        weakAgainst: ['fire', 'fighting', 'flying']
    }
};
