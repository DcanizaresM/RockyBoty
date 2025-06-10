// commands/tamagotchi/setemail.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const { getUser, saveUser } = require('../../data/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setemail')
        .setDescription('Registra tu GMAIL para recibir notificaciones')
        .addStringOption(opt =>
            opt.setName('email')
                .setDescription('Tu dirección de correo')
                .setRequired(true)
        ),
    async execute(interaction) {
        const email = interaction.options.getString('email');
        const userId = interaction.user.id;

        // Valida formato básico
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return interaction.reply({ content: '❌ Email inválido.', ephemeral: true });
        }

        // Guarda en Firestore: añade o actualiza el campo email
        const user = await getUser(userId) || {};
        await saveUser(userId, {
            ...user,
            email
        });

        return interaction.reply({ content: '✅ Tu email ha quedado registrado.', ephemeral: true });
    }
};
