// commands/tamagotchi/perfil.js
const fs = require('fs');
const path = require('path');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getAllUsers, saveAllUsers } = require('../../data/db');
const battles = require('../../data/battles.json');

module.exports = {
    name: 'perfil',
    description: 'Muestra el perfil de un entrenador: Pokémon, nivel, días jugados y batallas ganadas.',
    async execute(message, args) {
        // Determinar usuario objetivo: mención, ID o nombre de usuario/alias
        let targetUser = message.mentions.users.first();
        if (!targetUser && args[0]) {
            const id = args[0].replace(/\D/g, '');
            const memberById = message.guild.members.cache.get(id);
            if (memberById) {
                targetUser = memberById.user;
            } else {
                const memberByName = message.guild.members.cache.find(m =>
                    m.user.username.toLowerCase() === args[0].toLowerCase() ||
                    (m.nickname && m.nickname.toLowerCase() === args[0].toLowerCase())
                );
                if (memberByName) {
                    targetUser = memberByName.user;
                }
            }
            // Si se intentó especificar un usuario y no se encontró en el servidor
            if (!targetUser) {
                return message.reply(`❌ Usuario \`${args[0]}\` no encontrado en este servidor.`);
            }
        }
        // Si no se especificó ningún argumento, tomar al autor
        if (!targetUser) targetUser = message.author;

        const users = getAllUsers();
        const u = users[targetUser.id];
        if (!u) {
            return message.reply(
                `❌ ${targetUser.username} aún no tiene perfil. Que adopte un Pokémon con \`!adoptar <nombre>\`.`
            );
        }

        // Registrar firstPlayDate si no existe
        if (!u.firstPlayDate) {
            u.firstPlayDate = u.ultimaAccion || new Date().toISOString();
            saveAllUsers(users);
        }

        // Calcular días jugados
        const firstDate = new Date(u.firstPlayDate);
        const today = new Date();
        const msPerDay = 1000 * 60 * 60 * 24;
        const daysPlayed = Math.floor((today - firstDate) / msPerDay) + 1;

        // Contar batallas ganadas desde battles.json
        const usernameLower = targetUser.username.toLowerCase();
        const battlesWon = battles.filter(b => b.ganador.toLowerCase() === usernameLower).length;

        // Datos de Pokémon y nivel
        const pokemon = u.pokemon || '—';
        const nivel = u.nivel ?? '—';

        // Construir embed
        const embed = new EmbedBuilder()
            .setTitle(`${targetUser.username} — Perfil de Entrenador`)
            .setColor('#FFD700')
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Pokémon', value: `${pokemon} (Nv. ${nivel})`, inline: true },
                { name: 'Días jugados', value: `${daysPlayed}`, inline: true },
                { name: 'Batallas ganadas', value: `${battlesWon}`, inline: true }
            )
            .setTimestamp();

        // Adjuntar banner si existe
        const bannerPath = path.join(__dirname, '..', '..', 'assets', 'banner.png');
        if (fs.existsSync(bannerPath)) {
            const attachment = new AttachmentBuilder(bannerPath, { name: 'banner.png' });
            embed.setImage('attachment://banner.png');
            await message.channel.send({ embeds: [embed], files: [attachment] });
        } else {
            await message.channel.send({ embeds: [embed] });
        }
    }
};
