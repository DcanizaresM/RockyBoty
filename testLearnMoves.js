// testLearnMoves.js
const fetch = require('node-fetch');

async function checkLearnMoves(pokemon, level) {
    const data = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemon}`)
        .then(r => r.json());
    const learnable = data.moves.flatMap(m =>
        m.version_group_details
            .filter(d =>
                d.move_learn_method.name === 'level-up' &&
                d.level_learned_at === level
            )
            .map(d => `${m.move.name} (${d.version_group.name})`)
    );
    console.log(`Movimientos level-up para ${pokemon} en nivel ${level}:`, learnable);
}

// Cambia 'charmander' y 16 por lo que quieras probar:
checkLearnMoves('charmander', 16);
