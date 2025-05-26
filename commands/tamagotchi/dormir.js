// commands/tamagotchi/dormir.js
const { getUser, saveUser } = require('../../data/db');
const { actualizarEstadoPorTiempo } = require('../../utils/estadoHelper');

module.exports = {
    name: 'dormir',
    description: 'Envía a un Pokémon de tu equipo a descansar: !dormir <nombre-pokemon>',
    async execute(message, args) {
        const nombre = args[0]?.toLowerCase();
        if (!nombre) {
            return message.reply('❌ Debes indicar el nombre de tu Pokémon: `!dormir <nombre-pokemon>`');
        }

        const userId = message.author.id;
        const user = await getUser(userId);
        if (!user?.team?.length) {
            return message.reply('❌ ¡Aún no tienes un equipo! Usa `!capturar` para añadir tu primer Pokémon.');
        }

        // Buscar el Pokémon en el equipo
        const team = user.team;
        const idx = team.findIndex(p => p.pokemon.toLowerCase() === nombre);
        if (idx === -1) {
            return message.reply(`❌ No tienes a **${nombre.toUpperCase()}** en tu equipo.`);
        }

        // Actualizar estado por tiempo
        let poke = actualizarEstadoPorTiempo(team[idx]);

        // Verificar si ya está descansado
        if (poke.sueno <= 0) {
            return message.reply(`😌 **${poke.pokemon}** ya está descansado.`);
        }

        // Dormir: reducir sueño y aumentar felicidad
        poke.sueno = Math.max(0, poke.sueno - 100);
        poke.felicidad = Math.min(100, poke.felicidad + 10);
        poke.ultimaAccion = new Date().toISOString();

        // Guardar cambios en Firestore
        team[idx] = poke;
        await saveUser(userId, { team });

        // Responder
        return message.reply(
            `😴 **${poke.pokemon}** ha dormido plácidamente. Se siente mejor 💕\n` +
            `Sueño: ${poke.sueno}/100  Felicidad: ${poke.felicidad}/100`
        );
    }
};
