// index.js
const fs = require('fs');
const path = require('path');
const {
    Client,
    GatewayIntentBits,
    Collection,
    EmbedBuilder,
    AttachmentBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require('discord.js');
const Canvas = require('canvas');
const { getAllUsers, saveAllUsers } = require('./data/db');
require('dotenv').config();

// ID de canal Pokémon
const POKEMON_CHANNEL_ID = '1359486378353885326';

// Opciones de avatar
const avatarOptions = [
    { id: 'Entrenador', file: 'entrenador.jpg', label: 'Entrenador' },
    { id: 'Filósofo', file: 'filosofo.jpg', label: 'Filósofo' },
    { id: 'NiNi', file: 'estudio.jpg', label: 'Ni Ni' }
];

// Creamos cliente
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// —— Carga dinámica de comandos ——
client.commands = new Collection();

// Comandos Pokémon
const pokePath = path.join(__dirname, 'commands', 'tamagotchi');
for (const file of fs.readdirSync(pokePath).filter(f => f.endsWith('.js'))) {
    const cmd = require(path.join(pokePath, file));
    client.commands.set(cmd.name, cmd);
}

// —— Eventos ——
client.once('ready', () => {
    console.log(`🤖 Bot listo como ${client.user.tag}`);
});

client.on('messageCreate', async message => {
    if (!message.content.startsWith('!') || message.author.bot) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const name = args.shift().toLowerCase();

    // Definición de comandos Pokémon
    const pokemonCommands = [
        'adoptar', 'listarpokemons', 'jugar', 'estado',
        'retar', 'topbatallas', 'liberar', 'dormir',
        'alimentar', 'perfil'
    ];

    // Restricción de canal para comandos Pokémon
    if (pokemonCommands.includes(name) && message.channel.id !== POKEMON_CHANNEL_ID) {
        return message.reply(
            `⚠️ Este comando solo funciona en <#${POKEMON_CHANNEL_ID}>.`
        );
    }

    // Ejecución de comando
    const command = client.commands.get(name);
    if (!command) return;

    try {
        await command.execute(message, args);
    } catch (err) {
        console.error(`💥 Error en comando ${name}:`, err.stack || err);
        message.reply('¡Ups! Algo salió mal al ejecutar ese comando.');
    }
});

// —— Bienvenida ——
client.on('guildMemberAdd', async member => {
    const canal = member.guild.channels.cache.get('1364260093226651718');
    if (!canal?.isTextBased()) return;

    const embed = new EmbedBuilder()
        .setTitle(`¡Bienvenido/a, ${member.user.username}! 🎉`)
        .setDescription(
            `• Usa \`!adoptar <nombre>\` para adoptar tu primer Pokémon.
` +
            `• \`!listarpokemons\` para ver la lista completa.

` +
            `Elige tu avatar de entrenador:`
        )
        .setColor('#00AE86')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

    const width = 900, height = 300;
    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    for (let i = 0; i < avatarOptions.length; i++) {
        const opt = avatarOptions[i];
        const imgPath = path.join(__dirname, 'assets', opt.file);
        try {
            const img = await Canvas.loadImage(imgPath);
            const x = i * (width / avatarOptions.length);
            ctx.drawImage(img, x, 0, width / avatarOptions.length, height);
        } catch {
            const x = i * (width / avatarOptions.length);
            ctx.fillStyle = '#444';
            ctx.fillRect(x, 0, width / avatarOptions.length, height);
            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 30px Sans';
            ctx.fillText(opt.label, x + 20, height / 2);
        }
    }

    const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'avatares.png' });
    const select = new StringSelectMenuBuilder()
        .setCustomId('avatar_select')
        .setPlaceholder('Selecciona tu avatar')
        .addOptions(avatarOptions.map(opt => ({
            label: opt.label,
            value: opt.id,
            description: `Avatar ${opt.label}`
        })));
    const row = new ActionRowBuilder().addComponents(select);

    await canal.send({ embeds: [embed], files: [attachment], components: [row] });
});

// —— Selección de avatar ——
client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu() || interaction.customId !== 'avatar_select') return;
    const elegido = interaction.values[0];
    const users = getAllUsers();
    users[interaction.user.id] ||= {};
    users[interaction.user.id].avatar = elegido;
    saveAllUsers(users);
    await interaction.update({ content: `✅ Avatar elegido: **${elegido}**.`, embeds: [], components: [] });
});

// Login del bot
client.login(process.env.TOKEN);
