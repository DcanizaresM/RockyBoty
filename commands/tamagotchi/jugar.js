// commands/tamagotchi/jugar.js
const { getUser, saveUser } = require('../../data/db');
const { actualizarEstadoPorTiempo } = require('../../utils/estadoHelper');
const { intentarEvolucion } = require('../../utils/evolucionHelper');

module.exports = {
    name: 'jugar',
    description: 'Juega con un Pokémon de tu equipo y súbelo de nivel. Uso: !jugar <nombre-pokemon>',
    async execute(message, args) {
        // 1) Validar argumento
        const nombre = args[0]?.toLowerCase();
        if (!nombre) {
            return message.reply('❌ Debes indicar el nombre de tu Pokémon: `!jugar <nombre-pokemon>`');
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

        // 4) Aplicar cambio de estado por tiempo y aumentar felicidad
        let poke = actualizarEstadoPorTiempo(team[idx]);
        const felicidadGanada = Math.floor(Math.random() * 8) + 3;
        poke.felicidad = Math.min(100, poke.felicidad + felicidadGanada);
        poke.ultimaAccion = new Date().toISOString();

        // 5) Subir de nivel directamente
        poke.nivel += 1;
        poke.experiencia = 0;

        // 6) Intentar evolución automática
        let mensajeEvo = '';
        // DEBUG: antes de llamada a helper
        console.log(`🔍 [jugar] llamando a intentarEvolucion para ${poke.pokemon} (nivel ${poke.nivel})`);
        try {
            const evoluciono = await intentarEvolucion(poke);
            console.log(`🔍 [jugar] intentarEvolucion retornó ${evoluciono}`);
            if (evoluciono) {
                mensajeEvo = `
🧬 ¡Tu Pokémon ha evolucionado a **${poke.pokemon.toUpperCase()}**!`;
            }
        } catch (err) {
            console.error('Error al intentar evolución en !jugar:', err);
        }

        // 7) Guardar cambios en Firestore
        team[idx] = poke;
        await saveUser(userId, { team }); (userId, { team });

        // 8) Responder al usuario
        const mensaje =
            `🎮 Has jugado con **${poke.pokemon.toUpperCase()}**.` +
            `\n✨ ¡Ha subido al nivel ${poke.nivel}! 🎉` +
            `\n+${felicidadGanada} felicidad 😄` +
            mensajeEvo;

        return message.reply(mensaje);
    }
};
