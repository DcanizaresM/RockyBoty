// commands/tamagotchi/jugar.js
const { getAllUsers, saveAllUsers } = require('../../data/db');
const { actualizarEstadoPorTiempo } = require('../../utils/estadoHelper');
const evoluciones = require('../../utils/evoluciones');

const getBarraXP = (xp) => {
    const total = 20;
    const bloques = Math.floor((xp / 100) * total);
    const barra = '█'.repeat(bloques) + '░'.repeat(total - bloques);
    return `[${barra}] ${xp}/100 XP`;
};

module.exports = {
    name: 'jugar',
    description: 'Juega con tu Pokémon y súbelo directamente de nivel.',
    execute(message, args) {
        const users = getAllUsers();
        const userId = message.author.id;

        if (!users[userId]) {
            return message.reply('¡Primero adopta un Pokémon con `!adoptar Pikachu`!');
        }

        // Actualizamos el estado (hambre, energía, etc.) según el tiempo
        users[userId] = actualizarEstadoPorTiempo(users[userId]);
        const poke = users[userId];

        // Aumentamos felicidad aleatoriamente como antes
        const felicidadGanada = Math.floor(Math.random() * 8) + 3;
        poke.felicidad = Math.min(100, poke.felicidad + felicidadGanada);
        poke.ultimaAccion = new Date().toISOString();

        // Subimos directamente 1 nivel
        poke.nivel += 1;
        // Reiniciamos experiencia a cero (opcional)
        poke.experiencia = 0;

        let mensaje = `🎮 Has jugado con **${poke.pokemon}**.\n\n` +
            `✨ ¡Ha subido al nivel ${poke.nivel}! 🎉\n` +
            `+${felicidadGanada} felicidad 😄`;

        // Comprobamos evolución
        const datosEvo = evoluciones[poke.pokemon];
        if (datosEvo && poke.nivel >= datosEvo.nivel) {
            const anterior = poke.pokemon;
            poke.pokemon = datosEvo.evolucionaA;
            mensaje += `\n🧬 ¡${anterior} ha evolucionado a **${poke.pokemon}**! 🔥`;
        }


        // Guardamos cambios
        saveAllUsers(users);

        return message.reply(mensaje);
    }
};
