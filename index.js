// index.js
require('dotenv').config();

const commandChannels = {
    capturar: '1359486378353885326',
    alimentar: '1374031695275233310',
    dormir: '1374031695275233310',
    jugar: '1374031695275233310',
    estado: '1374031695275233310',
    perfil: '1374031695275233310',
    retar: '1366719801241763870',
    topbatallas: '1374680960003477534',
    team: '1374031755211833374',
    liberar: '1374031755211833374',
};

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const Canvas = require('canvas');

const { sendWelcomeEmail } = require('./utils/mailer');
const {
    getUser,
    saveUser,
    getAllUsers,
    saveAllUsers,
    getAllBattles,
    saveAllBattles
} = require('./data/db');

const {
    Client,
    GatewayIntentBits,
    Collection,
    EmbedBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require('discord.js');

const admin = require('firebase-admin');
require('./config/firebase'); // inicializa Firebase

const moves = require('./data/moves');

// IDs de canales
const POKEMON_CHANNEL_ID = '1359486378353885326';
const AVATAR_CHANNEL_ID = '1364260093226651718';

// Opciones de iniciales (reutilizadas en varias partes)
const avatarOptions = [
    { id: 'charmander', file: 'charmander.jpg', label: 'Charmander' },
    { id: 'bulbasaur', file: 'bulbasaur.jpg', label: 'Bulbasaur' },
    { id: 'squirtle', file: 'squirtle.jpg', label: 'Squirtle' }
];

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ——— Carga de comandos dinámicos ———
client.commands = new Collection();
const cmdPath = path.join(__dirname, 'commands', 'tamagotchi');
for (const file of fs.readdirSync(cmdPath).filter(f => f.endsWith('.js'))) {
    const cmd = require(path.join(cmdPath, file));
    client.commands.set(cmd.name || cmd.data?.name, cmd);
}

// ——— Welcome banner with Register Email button ———
require('./utils/bienvenida')(client);

client.once('ready', () => {
    console.log(`🤖 Bot listo como ${client.user.tag}`);
});

// ——— Opción extra: enviar email automático tras guildMemberAdd si ya estaba registrado ———
client.on('guildMemberAdd', async (member) => {
    try {
        const user = await getUser(member.id);
        if (user?.email) {
            await sendWelcomeEmail(
                user.email,
                process.env.SG_WELCOME_TEMPLATE_ID,
                {
                    username: member.user.username,
                    rules: '- Sé respetuoso\n- No hagas spam\n- Sigue las reglas en #normas',
                    commandsList: '`!capturar`, `!team`, `!retar`'
                }
            );
            console.log(`📧 Correo de bienvenida enviado a ${member.user.tag}`);
        }
    } catch (err) {
        console.error('❌ Error enviando email de bienvenida:', err);
    }
});

// ——— Manejo de comandos con prefijo “!” ———
client.on('messageCreate', async (message) => {
    if (!message.content.startsWith('!') || message.author.bot) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const name = args.shift().toLowerCase();


    // ➡️ Comprueba si el comando está mapeado a un canal y si no coincide, corta la ejecución
    if (commandChannels[name] && message.channel.id !== commandChannels[name]) {
        return message.reply(
            `⚠️ El comando \`${name}\` solo funciona en <#${commandChannels[name]}>.`
        );
    }


    const command = client.commands.get(name);
    if (!command) return;

    try {
        console.log(`Ejecutando comando: ${name} por ${message.author.id}`);
        await command.execute(message, args);
    } catch (err) {
        console.error(`💥 Error en comando ${name}:`, err);
        message.reply('¡Ups! Algo salió mal al ejecutar ese comando.');
    }
});

// ——— Interacciones (buttons, modals, select menus) ———
client.on('interactionCreate', async (interaction) => {
    // 1) Botón “Registrar email” → abrir modal
    if (interaction.isButton() && interaction.customId === 'register_email') {
        const modal = new ModalBuilder()
            .setCustomId('email_modal')
            .setTitle('Registro de email de bienvenida');

        const emailInput = new TextInputBuilder()
            .setCustomId('email_input')
            .setLabel('Tu email')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('usuario@ejemplo.com')
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(emailInput));
        return interaction.showModal(modal);
    }

    // 2) Usuario envía el modal con el email
    if (interaction.isModalSubmit() && interaction.customId === 'email_modal') {
        const email = interaction.fields.getTextInputValue('email_input');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return interaction.reply({ content: '❌ Email inválido.', ephemeral: true });
        }

        // Guardar email en Firestore
        const userId = interaction.user.id;
        const existing = await getUser(userId) || {};
        await saveUser(userId, { ...existing, email });

        // Enviar email inmediatamente
        try {
            await sendWelcomeEmail(
                email,
                process.env.SG_WELCOME_TEMPLATE_ID,
                {
                    username: interaction.user.username,
                    rules: '- Sé respetuoso\n- No hagas spam\n- Sigue las reglas en #normas',
                    commandsList: '`!capturar`, `!team`, `!retar`'
                }
            );
            console.log(`📧 Correo de bienvenida enviado a ${email}`);
        } catch (err) {
            console.error('❌ Falló el envío tras registro de email:', err);
        }

        // Confirmación en Discord
        await interaction.reply({ content: '✅ Email registrado. Ahora elige tu inicial:', ephemeral: true });

        // —— Ahora reproducimos tu bienvenida.js: canvas con sprites + oak + selector ——
        // 2.1) Canvas para avatares
        const width = 900, height = 300;
        const canvas = Canvas.createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, width, height);

        await Promise.all(avatarOptions.map((opt, i) => {
            const x = i * (width / avatarOptions.length);
            const imgPath = path.join(process.cwd(), 'assets', opt.file);
            if (fs.existsSync(imgPath)) {
                return Canvas.loadImage(imgPath).then(img => ctx.drawImage(img, x, 0, width / 3, height));
            } else {
                ctx.fillStyle = '#444'; ctx.fillRect(x, 0, width / 3, height);
                ctx.fillStyle = '#FFF'; ctx.font = 'bold 30px Sans';
                ctx.fillText(opt.label, x + 20, height / 2 + 10);
                return Promise.resolve();
            }
        }));

        const buffer = canvas.toBuffer();
        const files = [new AttachmentBuilder(buffer, { name: 'avatares.png' })];

        // 2.2) Oak
        const oakPath = path.join(process.cwd(), 'assets', 'oak.png');
        if (fs.existsSync(oakPath)) {
            files.push(new AttachmentBuilder(oakPath, { name: 'oak.png' }));
        }

        // 2.3) Embed Oak
        const welcomeEmbed = new EmbedBuilder()
            .setTitle(`¡Bienvenido/a, ${interaction.user.username}! 🎉`)
            .setDescription(
                `¡Hola joven entrenador/a! Soy el Profesor Oak, y hoy comienza tu gran aventura en el mundo Pokémon.\n` +
                `Frente a ti se encuentran tres criaturas extraordinarias: Charmander, Bulbasaur y Squirtle.\n` +
                `Cada uno tiene sus propias habilidades. ¿Cuál eliges para acompañarte?`
            )
            .setColor(0x00AE86)
            .setTimestamp()
            .setImage('attachment://oak.png');

        // 2.4) Selector inicial
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
        const menuRow = new ActionRowBuilder().addComponents(select);

        const canal = interaction.guild.channels.cache.get(AVATAR_CHANNEL_ID);
        if (canal?.isTextBased()) {
            await canal.send({ embeds: [welcomeEmbed], files, components: [menuRow] });
        }
        return;
    }

    // 3) Procesar elección de iniciales
    if (interaction.isStringSelectMenu() && interaction.customId === 'avatar_select') {
        const userId = interaction.user.id;
        const elegido = interaction.values[0];
        console.log(`Selector inicial por ${userId}: ${elegido}`);

        try {
            const existing = await getUser(userId);
            if (existing?.starter) {
                return interaction.reply({ content: '🚫 Ya elegiste tu inicial anteriormente.', ephemeral: true });
            }

            const d = await fetch(`https://pokeapi.co/api/v2/pokemon/${elegido}`).then(r => r.json());
            const statMap = {};
            d.stats.forEach(s => statMap[s.stat.name] = s.base_stat);
            const allMoves = d.moves.map(m => m.move.name).slice(0, 4);

            const starterData = {
                pokemon: elegido,
                type: d.types.map(t => t.type.name),
                imagen: d.sprites.front_default,
                nivel: 1,
                experiencia: 0,
                felicidad: 70,
                hambre: 50,
                sueno: 50,
                fuerza: statMap.attack,
                defensa: statMap.defense,
                agilidad: statMap.speed,
                hp: statMap.hp,
                moves: allMoves,
                ultimaAccion: new Date().toISOString()
            };

            await saveUser(userId, {
                starter: elegido,
                team: [starterData],
                username: interaction.user.username,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Elimina el selector
            try { await interaction.message.delete(); } catch { }

            const confirmEmbed = new EmbedBuilder()
                .setTitle(`¡Enhorabuena, ${interaction.user.username}!`)
                .setDescription(`Has elegido a **${elegido.charAt(0).toUpperCase() + elegido.slice(1)}** como tu inicial.`)
                .setColor(0x00AE86)
                .setThumbnail(starterData.imagen)
                .setDescription('PORFAVOR DIRIGETE AL CANAL DE COMANDOS PARA CONSULTAR TODOS LOS COMNADOS DISPONIBLES Y EMPIEZA A DISFRUTAR DE NUESTRO BOT.');

            const chan = interaction.guild.channels.cache.get(AVATAR_CHANNEL_ID);
            if (chan?.isTextBased()) {
                await chan.send({ embeds: [confirmEmbed] });
            }
        } catch (err) {
            console.error('Error al guardar starter:', err);
            interaction.reply({ content: '❌ Error al guardar tu elección. Intenta más tarde.', ephemeral: true });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
