// commands/tamagotchi/liberar.js
const { EmbedBuilder } = require('discord.js');
const { getUser, saveUser } = require('../../data/db');

module.exports = {
    name: 'liberar',
    description: 'Libera a un Pokémon de tu equipo, excepto al inicial.',
    async execute(message, args) {
        const userId = message.author.id;
        const nombre = args[0]?.toLowerCase();
        if (!nombre) {
            return message.reply('❌ Debes indicar el nombre del Pokémon: `!liberar <nombre>`');
        }

        // 1) Leer usuario
        const user = await getUser(userId);
        if (!user?.team?.length) {
            return message.reply('❌ ¡No tienes Pokémon para liberar!');
        }

        const team = [...user.team];

        // 2) Impedir liberar al inicial
        const inicial = team[0].pokemon.toLowerCase();
        if (nombre === inicial) {
            return message.reply(`❌ No puedes liberar a tu inicial **${inicial.toUpperCase()}**.`);
        }

        // 3) Buscar índice del Pokémon a liberar
        const idx = team.findIndex(p => p.pokemon.toLowerCase() === nombre);
        if (idx === -1) {
            return message.reply(`❌ No tienes a **${nombre.toUpperCase()}** en tu equipo.`);
        }

        // 4) Eliminar y guardar
        const [liberado] = team.splice(idx, 1);
        await saveUser(userId, { team });

        // 5) Responder con embed de confirmación
        const embed = new EmbedBuilder()
            .setTitle(`🕊️ Has liberado a ${liberado.pokemon.toUpperCase()}`)
            .setDescription(
                `Tu equipo ahora tiene ${team.length} Pokémon:\n` +
                team.map(p => `• ${p.pokemon.toUpperCase()}`).join('\n')
            )
            .setColor(0x30c6f0)
            .setFooter({ text: `Entrenador: ${message.author.username}` });

        return message.channel.send({ embeds: [embed] });
    }
};
