// commands/tamagotchi/perfil.js
const fs = require('fs');
const path = require('path');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getAllUsers, saveAllUsers } = require('../../data/db');
const battles = require('../../data/battles.json');

module.exports = {
    name: 'perfil',
    description: 'Muestra el perfil de un entrenador con su avatar, Pokémon, nivel, días jugados y batallas ganadas.',
    async execute(message, args) {
        // Determinar usuario objetivo
        let targetUser = message.mentions.users.first();
        if (!targetUser && args[0]) {
            const id = args[0].replace(/\D/g, '');
            const memberById = message.guild.members.cache.get(id);
            if (memberById) targetUser = memberById.user;
            else {
                const memberByName = message.guild.members.cache.find(m =>
                    m.user.username.toLowerCase() === args[0].toLowerCase() ||
                    (m.nickname && m.nickname.toLowerCase() === args[0].toLowerCase())
                );
                if (memberByName) targetUser = memberByName.user;
            }
            if (!targetUser) return message.reply(`❌ Usuario \`${args[0]}\` no encontrado.`);
        }
        if (!targetUser) targetUser = message.author;

        const users = getAllUsers();
        const u = users[targetUser.id];
        if (!u) {
            return message.reply(
                `❌ ${targetUser.username} no tiene perfil. Usa \`!adoptar <nombre>\` primero.`
            );
        }

        // Registrar fecha de primer juego
        if (!u.firstPlayDate) {
            u.firstPlayDate = u.ultimaAccion || new Date().toISOString();
            saveAllUsers(users);
        }

        // Cálculo de días jugados
        const firstDate = new Date(u.firstPlayDate);
        const msPerDay = 1000 * 60 * 60 * 24;
        const daysPlayed = Math.floor((Date.now() - firstDate) / msPerDay) + 1;

        // Batallas ganadas
        const userLower = targetUser.username.toLowerCase();
        const battlesWon = battles.filter(b => b.ganador.toLowerCase() === userLower).length;

        // Datos básicos
        const pokemon = u.pokemon || '—';
        const nivel = u.nivel ?? '—';
        const avatarId = u.avatar; // 'charmander', 'bulbasaur', 'squirtel'

        // Preparar embed
        const embed = new EmbedBuilder()
            .setAuthor({
                name: `${targetUser.username}`,
                iconURL: targetUser.displayAvatarURL({ dynamic: true })
            })
            .setTitle('🏆 Perfil de Entrenador')
            .setColor('#FFD700')
            .addFields(
                { name: '🟦 Pokémon', value: `${pokemon} (Nv. ${nivel})`, inline: true },
                { name: '📅 Días jugados', value: `${daysPlayed}`, inline: true },
                { name: '⚔️ Batallas ganadas', value: `${battlesWon}`, inline: true }
            )
            .setFooter({ text: `Solicitado por ${message.author.username}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        const files = [];

        // Miniatura: avatar elegido
        if (avatarId) {
            const avatarPath = path.join(process.cwd(), 'assets', `${avatarId}.jpg`);
            if (fs.existsSync(avatarPath)) {
                const attachAvatar = new AttachmentBuilder(avatarPath, { name: 'avatar.jpg' });
                embed.setThumbnail('attachment://avatar.jpg');
                files.push(attachAvatar);
            }
        }

        // Imagen de banner (fondo del embed)
        const bannerPath = path.join(process.cwd(), 'assets', 'banner.png');
        if (fs.existsSync(bannerPath)) {
            const attachBanner = new AttachmentBuilder(bannerPath, { name: 'banner.png' });
            embed.setImage('attachment://banner.png');
            files.push(attachBanner);
        }

        // Enviar embed con attachments
        if (files.length > 0) {
            await message.channel.send({ embeds: [embed], files });
        } else {
            await message.channel.send({ embeds: [embed] });
        }
    }
};
