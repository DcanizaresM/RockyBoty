const { getAllUsers, saveAllUsers } = require('../../data/db');
const { actualizarEstadoPorTiempo } = require('../../utils/estadoHelper');

module.exports = {
    name: 'alimentar',
    description: 'Alimenta a tu Pokémon para que no se muera de hambre.',
    async execute(message, args) {
        const users = getAllUsers();
        const userId = message.author.id;

        if (!users[userId]) {
            return message.reply('¡Aún no tienes un Pokémon! Usa `!adoptar Pikachu` primero.');
        }

        users[userId] = actualizarEstadoPorTiempo(users[userId]);
        let poke = users[userId];

        if (poke.hambre <= 10) {
            return message.reply(`${poke.pokemon} ya está lleno 🍗`);
        }

        poke.hambre = Math.max(0, poke.hambre - 30);
        poke.felicidad = Math.min(100, poke.felicidad + 10);
        poke.ultimaAccion = new Date().toISOString();

        saveAllUsers(users);

        message.reply(`🍗 Le diste de comer a **${poke.pokemon}**. Ahora está más feliz 😄`);
    }
};
