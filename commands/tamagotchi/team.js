// commands/tamagotchi/team.js
const { EmbedBuilder } = require('discord.js');
const { getUser } = require('../../data/db');

module.exports = {
    name: 'team',
    description: 'Muestra tu equipo Pokémon con embeds coloridos y sprites.',
    async execute(message) {
        const userId = message.author.id;
        const user = await getUser(userId);
        const team = Array.isArray(user?.team) ? user.team : [];

        if (!team.length) {
            return message.reply('❌ Aún no tienes Pokémon en tu equipo. Usa `!capturar` para atrapar uno.');
        }

        // Mapeo de colores por tipo
        const typeColors = {
            fire: 0xF08030,
            water: 0x6890F0,
            grass: 0x78C850,
            electric: 0xF8D030,
            default: 0x00AE86
        };

        // Embed resumen con toque de color neutro
        const summaryEmbed = new EmbedBuilder()
            .setAuthor({ name: `Equipo de ${message.author.username}` })
            .setDescription(`Tienes **${team.length}** Pokémon en tu equipo`)
            .setColor(typeColors.default)

        const embeds = [summaryEmbed];

        // Embeds individuales por cada Pokémon
        team.forEach((poke, idx) => {
            const name = poke.pokemon.charAt(0).toUpperCase() + poke.pokemon.slice(1);
            const level = poke.nivel ?? '—';
            const primaryType = Array.isArray(poke.type) && poke.type[0] ? poke.type[0] : 'default';
            const color = typeColors[primaryType] || typeColors.default;
            const types = Array.isArray(poke.type)
                ? poke.type.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' / ')
                : '—';
            const moves = Array.isArray(poke.moves)
                ? poke.moves.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', ')
                : '—';

            const embed = new EmbedBuilder()
                .setAuthor({ name: `${idx + 1}. ${name}`, iconURL: poke.imagen || null })
                .setColor(color)
                .setThumbnail(poke.imagen || null)
                .addFields(
                    { name: 'Nivel', value: String(level), inline: true },
                    { name: 'Tipo', value: types, inline: true },
                    { name: 'Movimientos', value: moves, inline: false }
                )

            embeds.push(embed);
        });

        // Enviamos todos los embeds
        await message.channel.send({ embeds });
    }
};
