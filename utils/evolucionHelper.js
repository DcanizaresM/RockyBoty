// utils/evolucionHelper.js
const fetch = require('node-fetch');

// Base de la PokéAPI (puede configurarse desde .env)
const POKEAPI_BASE = process.env.POKEAPI_BASE || 'https://pokeapi.co/api/v2';

/**
 * Asegura que la URL sea absoluta; si es un path, la ancla a POKEAPI_BASE.
 */
function makeAbsolute(url) {
    if (!url) throw new Error('URL no definida para makeAbsolute');
    if (/^https?:\/\//i.test(url)) return url;
    return url.startsWith('/')
        ? `${POKEAPI_BASE}${url}`
        : `${POKEAPI_BASE}/${url}`;
}

/**
 * Intenta evolucionar un Pokémon según su nivel, felicidad u otros triggers de la cadena de evolución.
 * Devuelve true si evolucionó, false si no.
 */
async function intentarEvolucion(poke) {
    // 1) Determinar speciesUrl (fallback si no existe)
    const rawSpecies = poke.speciesUrl
        ? poke.speciesUrl
        : `/pokemon-species/${poke.pokemon.toLowerCase()}`;

    // 2) Descarga la especie para obtener la URL de la cadena
    const speciesRes = await fetch(makeAbsolute(rawSpecies));
    if (!speciesRes.ok) throw new Error(`Error fetching species: ${speciesRes.status}`);
    const { evolution_chain: { url: evoChainUrl } } = await speciesRes.json();

    // 3) Descarga la cadena de evolución
    const chainRes = await fetch(makeAbsolute(evoChainUrl));
    if (!chainRes.ok) throw new Error(`Error fetching evo chain: ${chainRes.status}`);
    const chainData = await chainRes.json();
    let node = chainData.chain;

    // 4) Recorre hasta encontrar tu especie actual
    while (node.species.name !== poke.pokemon && node.evolves_to.length) {
        node = node.evolves_to[0];
    }

    // 5) Si hay siguiente evolución, selecciona la rama correcta
    if (!node.evolves_to.length) return false;
    // Buscar la rama con min_level o fallback a la primera
    let branch = node.evolves_to.find(e =>
        e.evolution_details.some(d => typeof d.min_level === 'number')
    ) || node.evolves_to[0];
    const detailsArray = branch.evolution_details;
    // Elegimos primero la que tenga min_level, si no, la primera
    const evoDetails = detailsArray.find(d => typeof d.min_level === 'number')
        || detailsArray[0];

    // ——— DEBUG: vemos qué nos llega de la API ———
    console.log(`▶️ evoDetails para ${poke.pokemon.toUpperCase()}:`, evoDetails);
    const { trigger: { name: trigger }, min_level: minLvl, min_happiness: minHappy } = evoDetails;

    const nextName = branch.species.name;

    // 6) Decidir si evoluciona:
    const cumpleNivel = minLvl && poke.nivel >= minLvl;
    const cumpleFelicidad = minHappy && poke.felicidad >= minHappy;
    const byLevelUp = trigger === 'level-up' && cumpleNivel;
    const byHappiness = trigger === 'happiness' && cumpleFelicidad;
    // (puedes añadir más triggers: use-item, trade, etc.)

    if (byLevelUp || byHappiness) {
        // 7) Efectúa la evolución
        poke.pokemon = nextName;
        poke.speciesUrl = branch.species.url;

        // 8) Recarga stats y sprite del nuevo Pokémon
        const dataRes = await fetch(makeAbsolute(`/pokemon/${nextName}`));
        if (!dataRes.ok) throw new Error(`Error fetching pokemon data: ${dataRes.status}`);
        const data = await dataRes.json();

        const stat = name => data.stats.find(s => s.stat.name === name).base_stat;
        poke.fuerza = stat('attack');
        poke.defensa = stat('defense');
        poke.agilidad = stat('speed');
        poke.hp = stat('hp');
        poke.imagen = data.sprites.front_default;

        console.log(`✅ Evolucionó ${poke.pokemon} por ${trigger} (lvl:${minLvl} happy:${minHappy})`);
        return true;
    }

    return false;
}

module.exports = { intentarEvolucion };
