const { EmbedBuilder } = require('discord.js');
const { getAllUsers, saveAllUsers } = require('../../data/db');

module.exports = {
    name: 'liberar',
    description: 'Libera a tu Pokémon actual.',
    async execute(message, args) {
        const users = getAllUsers();
        const userId = message.author.id;

        // Verificar si el usuario tiene un Pokémon
        if (!users[userId]) {
            return message.reply('¡No tienes ningún Pokémon para liberar! Usa `!adoptar [Pokémon]` para adoptar uno.');
        }

        const poke = users[userId];

        // Eliminar el Pokémon del usuario
        delete users[userId];
        saveAllUsers(users);

        // Confirmar la liberación del Pokémon
        message.reply(`¡Has liberado a ${poke.pokemon}! Ahora puedes adoptar un nuevo Pokémon. 🕊️`);

        // Ofrecer la posibilidad de adoptar un nuevo Pokémon
        const embed = new EmbedBuilder()
            .setTitle(`¡Has liberado a ${poke.pokemon}! 🎉`)
            .setDescription('Ahora puedes adoptar un nuevo Pokémon usando el comando `!adoptar [Pokémon]`.')
            .setColor(0x30c6f0)
            .setFooter({ text: `Entrenador: ${message.author.username}` });

        message.channel.send({ embeds: [embed] });
    }
};
