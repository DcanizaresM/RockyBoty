// commands/tamagotchi/setstarter.js
const { getUser, saveUser } = require('../../data/db');
const fetch = require('node-fetch');

module.exports = {
    name: 'setstarter',
    description: '🛠️ Asigna un Pokémon inicial a tu equipo.',
    async execute(message, args) {


        const pokemon = args[0]?.toLowerCase();
        if (!pokemon) {
            return message.reply('❌ Usa: `!setstarter <nombrePokemon>`');
        }

        try {
            // 1) Fetch datos de PokeAPI
            const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemon}`);
            if (!res.ok) return message.reply('❌ Pokémon no encontrado.');
            const data = await res.json();

            // 2) Mapea stats y movimientos
            const statMap = {};
            data.stats.forEach(s => statMap[s.stat.name] = s.base_stat);
            const moves = data.moves.slice(0, 4).map(m => m.move.name);

            // 3) Crea objeto starter
            const starterData = {
                pokemon,
                speciesUrl: data.species.url,
                imagen: data.sprites.front_default,
                nivel: 1,
                experiencia: 0,
                felicidad: 70,
                hambre: 50,
                sueno: 50,
                fuerza: statMap.attack,
                defensa: statMap.defense,
                agilidad: statMap.speed,
                hp: statMap.hp,
                moves,
                type: SVGUnitTypes,
                ultimaAccion: new Date().toISOString()
            };

            // 4) Guarda en la base de datos
            const userId = message.author.id;
            await saveUser(userId, {
                starter: pokemon,
                team: [starterData],
                username: message.author.username
            });

            return message.reply(`✅ ¡${pokemon} añadido como Pokémon inicial!`);
        } catch (err) {
            console.error(err);
            return message.reply('❌ Ocurrió un error al asignar el starter.');
        }
    }
};
