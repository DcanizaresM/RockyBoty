// index.js
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const {
    Client,
    GatewayIntentBits,
    Collection,
    EmbedBuilder,
    AttachmentBuilder,
    ButtonStyle
} = require('discord.js');
const admin = require('firebase-admin');
// Inicializa Firebase (config/firebase.js ejecuta admin.initializeApp())
require('./config/firebase');
const { getUser, saveUser, getAllUsers, saveAllUsers, getAllBattles, saveAllBattles } = require('./data/db');
const moves = require('./data/moves');
require('dotenv').config();

// ID de canal Pokémon
const POKEMON_CHANNEL_ID = '1359486378353885326';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Carga de comandos
client.commands = new Collection();
const cmdPath = path.join(__dirname, 'commands', 'tamagotchi');
for (const file of fs.readdirSync(cmdPath).filter(f => f.endsWith('.js'))) {
    const cmd = require(path.join(cmdPath, file));
    client.commands.set(cmd.name, cmd);
}

// Evento de bienvenida (solo muestra embed + selector)
require('./utils/bienvenida')(client);

client.once('ready', () => {
    console.log(`🤖 Bot listo como ${client.user.tag}`);
});

client.on('messageCreate', async message => {
    if (!message.content.startsWith('!') || message.author.bot) return;
    const args = message.content.slice(1).trim().split(/ +/);
    const name = args.shift().toLowerCase();

    const pokemonCommands = [
        'capturar', 'listarPokemons', 'jugar', 'estado',
        'retar', 'topbatallas', 'liberar', 'dormir',
        'alimentar', 'perfil', 'me'
    ];
    if (pokemonCommands.includes(name) && message.channel.id !== POKEMON_CHANNEL_ID) {
        return message.reply(`⚠️ Este comando solo funciona en <#${POKEMON_CHANNEL_ID}>.`);
    }

    const command = client.commands.get(name);
    if (!command) return;
    try {
        // Log del comando ejecutado
        console.log(`Ejecutando comando: ${name} por ${message.author.id}`);
        await command.execute(message, args);
    } catch (err) {
        console.error(`💥 Error en comando ${name}:`, err);
        message.reply('¡Ups! Algo salió mal al ejecutar ese comando.');
    }
});

// Manejo de interacción (selector de inicial)
client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu() || interaction.customId !== 'avatar_select') return;

    const userId = interaction.user.id;
    const elegido = interaction.values[0];

    // Debug: valores de interacción
    console.log(`Selector inicial por ${userId}: ${elegido}`);

    try {
        const existing = await getUser(userId);
        if (existing?.starter) {
            return interaction.reply({ content: '🚫 Ya elegiste tu inicial anteriormente.', ephemeral: true });
        }

        // Obtener datos de la API del Pokémon inicial
        const dPokemon = await fetch(`https://pokeapi.co/api/v2/pokemon/${elegido.toLowerCase()}`).then(res => res.json());
        const statMap = {};
        dPokemon.stats.forEach(s => statMap[s.stat.name] = s.base_stat);
        const allMoves = dPokemon.moves.map(m => m.move.name).filter(key => moves[key]).slice(0, 4);

        const starterData = {
            pokemon: elegido,
            type: dPokemon.types.map(t => t.type.name),
            imagen: dPokemon.sprites.front_default,
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

        try { await interaction.message.delete(); } catch { }

        const embed = new EmbedBuilder()
            .setTitle(`¡Enhorabuena, ${interaction.user.username}!`)
            .setDescription(`Has elegido a **${elegido.charAt(0).toUpperCase() + elegido.slice(1)}** como tu inicial.`)
            .setColor('#00AE86')
            .setThumbnail(starterData.imagen);

        await interaction.channel.send({ embeds: [embed] });
    } catch (err) {
        console.error('Error al guardar starter:', err);
        interaction.reply({ content: '❌ Error al guardar tu elección. Intenta más tarde.', ephemeral: true });
    }
});

client.login(process.env.TOKEN);