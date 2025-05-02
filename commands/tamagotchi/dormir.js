const { getAllUsers, saveAllUsers } = require('../../data/db');
const { actualizarEstadoPorTiempo } = require('../../utils/estadoHelper');

module.exports = {
    name: 'dormir',
    description: 'Envía a tu Pokémon a descansar y recuperar energía.',
    async execute(message, args) {
        const users = getAllUsers();
        const userId = message.author.id;

        if (!users[userId]) {
            return message.reply('¡Aún no tienes un Pokémon! Usa `!adoptar Pikachu` primero.');
        }

        users[userId] = actualizarEstadoPorTiempo(users[userId]);
        let poke = users[userId];

        if (poke.sueño <= 10) {
            return message.reply(`${poke.pokemon} ya está descansado 😌`);
        }

        poke.sueño = Math.max(0, poke.sueño - 40);
        poke.felicidad = Math.min(100, poke.felicidad + 10);
        poke.ultimaAccion = new Date().toISOString();

        saveAllUsers(users);

        message.reply(`😴 **${poke.pokemon}** ha dormido plácidamente. Se siente mejor 💕`);
    }
};
