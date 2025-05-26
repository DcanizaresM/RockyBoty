// commands/tamagotchi/bienvenida_email.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bienvenida_email')
        .setDescription('Inicia el flujo de bienvenida solicitando tu email.'),
    async execute(interaction) {
        // Creamos el modal
        const modal = new ModalBuilder()
            .setCustomId('email_modal')
            .setTitle('Registro de email de bienvenida');

        const emailInput = new TextInputBuilder()
            .setCustomId('email_input')
            .setLabel('Tu email')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('usuario@ejemplo.com')
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(emailInput)
        );

        // Mostramos el modal
        await interaction.showModal(modal);
    }
};
