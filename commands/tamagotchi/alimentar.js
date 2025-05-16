// commands/tamagotchi/alimentar.js
const { getUser, saveUser } = require('../../data/db');
const { actualizarEstadoPorTiempo } = require('../../utils/estadoHelper');

module.exports = {
    name: 'alimentar',
    description: 'Alimenta a tu Pokémon para que no se muera de hambre.',
    async execute(message, args) {
        const userId = message.author.id;
        // Leer usuario de Firestore
        const user = await getUser(userId);
        if (!user || !Array.isArray(user.team) || user.team.length === 0) {
            return message.reply('❌ ¡Aún no tienes un Pokémon! Usa `!capturar` primero.');
        }

        // Actualizar estado por tiempo y obtener el primer pokémon
        let poke = actualizarEstadoPorTiempo(user.team[0]);

        // Comprobar si ya está lleno
        if (poke.hambre <= 10) {
            return message.reply(`🍗 **${poke.pokemon}** ya está lleno.`);
        }

        // Alimentar: reducir hambre, aumentar felicidad, actualizar timestamp
        poke.hambre = Math.max(0, poke.hambre - 30);
        poke.felicidad = Math.min(100, poke.felicidad + 10);
        poke.ultimaAccion = new Date().toISOString();

        // Guardar solo el pokémon actualizado en el team
        const newTeam = [...user.team];
        newTeam[0] = poke;
        await saveUser(userId, { team: newTeam });

        // Confirmación al usuario
        return message.reply(
            `🍗 Le diste de comer a **${poke.pokemon}**. Ahora está más feliz 😄`
        );
    }
};
