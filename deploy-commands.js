// /deploy-commands.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
require('dotenv').config();

const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

const commands = [
    new SlashCommandBuilder().setName('estado').setDescription('Ver el estado de tu Pokémon'),
    new SlashCommandBuilder().setName('adoptar').setDescription('Adoptar un Pokémon').addStringOption(option =>
        option.setName('pokemon').setDescription('Nombre del Pokémon a adoptar').setRequired(true)),
    new SlashCommandBuilder().setName('retar').setDescription('Retar a otro usuario a una batalla').addUserOption(option =>
        option.setName('usuario').setDescription('Usuario al que deseas retar').setRequired(true)),
    new SlashCommandBuilder().setName('listarpokemons').setDescription('Muestra la lista de Pokémon disponibles para adoptar')  // Nuevo comando
]
    .map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log('Iniciando la actualización de comandos slash...');
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
        console.log('Comandos slash registrados con éxito.');
    } catch (error) {
        console.error('Error al registrar los comandos Slash:', error);
    }
})();
