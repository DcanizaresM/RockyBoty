// commands/tamagotchi/comandos.js
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'comandos',
    description: 'Lista todos los comandos disponibles en un embed.',
    async execute(message, args) {
        const commands = message.client.commands;
        const embed = new EmbedBuilder()
            .setTitle('📜 Lista de comandos disponibles')
            .setDescription('Aquí tienes todos los comandos que puedes usar:')
            .setColor('Blue');

        for (const command of commands.values()) {
            embed.addFields({
                name: `!${command.name}`,
                value: command.description || 'Sin descripción',
            });
        }

        await message.channel.send({ embeds: [embed] });
    },
};
