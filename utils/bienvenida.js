// utils/bienvenida.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Cambia este ID por el canal donde quieras hacer la bienvenida
const AVATAR_CHANNEL_ID = '1364260093226651718';

module.exports = (client) => {
    client.on('guildMemberAdd', async (member) => {
        const canal = member.guild.channels.cache.get(AVATAR_CHANNEL_ID);
        if (!canal?.isTextBased()) return;

        const embed = new EmbedBuilder()
            .setTitle(`¡Bienvenido/a, ${member.user.username}! 🎉`)
            .setDescription(
                'Para enviarte las normas por correo y continuar, pulsa el botón **Registrar email** a continuación.'
            )
            .setColor(0x00AE86)
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('register_email')
                .setLabel('📧 Registrar email')
                .setStyle(ButtonStyle.Primary)
        );

        await canal.send({ embeds: [embed], components: [row] });
    });
};
