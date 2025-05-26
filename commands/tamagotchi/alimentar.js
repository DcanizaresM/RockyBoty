// commands/tamagotchi/alimentar.js
const { getUser, saveUser } = require('../../data/db');
const { actualizarEstadoPorTiempo } = require('../../utils/estadoHelper');

module.exports = {
    name: 'alimentar',
    description: 'Alimenta a uno de tus Pokémon para que no muera de hambre. Uso: !alimentar <nombre-pokemon>',
    async execute(message, args) {
        // 1) Validar argumento: nombre del Pokémon
        const nombre = args[0]?.toLowerCase();
        if (!nombre) {
            return message.reply('❌ Debes indicar el nombre de tu Pokémon: `!alimentar <nombre-pokemon>`');
        }

        // 2) Obtener usuario y equipo
        const userId = message.author.id;
        const user = await getUser(userId);
        if (!user?.team?.length) {
            return message.reply('❌ ¡Aún no tienes un equipo! Usa `!capturar` para añadir tu primer Pokémon.');
        }

        // 3) Buscar el Pokémon en el equipo
        const team = user.team;
        const idx = team.findIndex(p => p.pokemon.toLowerCase() === nombre);
        if (idx === -1) {
            return message.reply(`❌ No tienes a **${nombre.toUpperCase()}** en tu equipo.`);
        }

        // 4) Actualizar estado temporal (decay/ganancia)
        let poke = actualizarEstadoPorTiempo(team[idx]);

        // 5) Comprobar si tiene hambre suficiente (>10)
        // 5) Comprobar si tiene hambre suficiente (>0)
        if (poke.hambre <= 0) {
            return message.reply(`🍗 **${poke.pokemon.toUpperCase()}** no tiene hambre.`);
        }


        // 6) Alimentar: reducir hambre sin bajar de 10, aumentar felicidad
        poke.hambre = Math.max(0, poke.hambre - 100);
        poke.felicidad = Math.min(100, poke.felicidad + 10);
        poke.ultimaAccion = new Date().toISOString();

        // 7) Guardar cambios solo en ese Pokémon
        team[idx] = poke;
        await saveUser(userId, { team });

        // 8) Confirmar al usuario con valores actualizados
        return message.reply(
            `🍗 Le diste de comer a **${poke.pokemon.toUpperCase()}**.` +
            `\nHambre: ${poke.hambre}/100  Felicidad: ${poke.felicidad}/100`
        );
    }
};
