// utils/bienvenida.js
const fs = require('fs');
const path = require('path');
const {
    EmbedBuilder,
    AttachmentBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require('discord.js');
const Canvas = require('canvas');

const AVATAR_CHANNEL_ID = '1364260093226651718';
const avatarOptions = [
    { id: 'charmander', file: 'charmander.jpg', label: 'Charmander' },
    { id: 'bulbasaur', file: 'bulbasaur.jpg', label: 'Bulbasaur' },
    { id: 'squirtle', file: 'squirtel.jpg', label: 'Squirtle' }
];

/**
 * Envía un embed de bienvenida y un selector para elegir inicial.
 * No persiste la elección aquí; ese paso se maneja en interactionCreate.
 */

module.exports = (client) => {
    client.on('guildMemberAdd', async member => {
        const canal = member.guild.channels.cache.get(AVATAR_CHANNEL_ID);
        if (!canal?.isTextBased()) return;

        // Embed de bienvenida
        const embed = new EmbedBuilder()
            .setTitle(`¡Bienvenido/a, ${member.user.username}! 🎉`)
            .setDescription(
                `¡Hola joven entrenador/a! Soy el Profesor Oak, y hoy comienza tu gran aventura en el mundo Pokémon.\n` +
                `Frente a ti se encuentran tres criaturas extraordinarias: Charmander, Bulbasaur y Squirtle.\n` +
                `Cada uno tiene sus propias habilidades. Ahora, ¿cuál de estos tres iniciales elegirás para acompañarte desde el primer paso de tu viaje?`
            )
            .setColor('#00AE86')
            .setTimestamp()
            .setImage('attachment://oak.png');

        // Canvas con los tres pokémon
        const width = 900, height = 300;
        const canvas = Canvas.createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);

        const drawPromises = avatarOptions.map((opt, i) => {
            const imgPath = path.join(process.cwd(), 'assets', opt.file);
            const x = i * (width / avatarOptions.length);
            if (fs.existsSync(imgPath)) {
                return Canvas.loadImage(imgPath).then(img => {
                    ctx.drawImage(img, x, 0, width / avatarOptions.length, height);
                });
            } else {
                ctx.fillStyle = '#444';
                ctx.fillRect(x, 0, width / avatarOptions.length, height);
                ctx.fillStyle = '#FFF';
                ctx.font = 'bold 30px Sans';
                ctx.fillText(opt.label, x + 20, height / 2 + 10);
                return Promise.resolve();
            }
        });

        await Promise.all(drawPromises);

        const buffer = canvas.toBuffer();
        const files = [new AttachmentBuilder(buffer, { name: 'avatares.png' })];
        const oakPath = path.join(process.cwd(), 'assets', 'oak.png');
        if (fs.existsSync(oakPath)) {
            files.push(new AttachmentBuilder(oakPath, { name: 'oak.png' }));
        }

        // Selector de iniciales
        const select = new StringSelectMenuBuilder()
            .setCustomId('avatar_select')
            .setPlaceholder('Selecciona tu inicial')
            .addOptions(
                avatarOptions.map(opt => ({
                    label: opt.label,
                    value: opt.id,
                    description: `Elegir a ${opt.label}`
                }))
            );
        const row = new ActionRowBuilder().addComponents(select);

        await canal.send({ embeds: [embed], files, components: [row] });
    });
};
