const { EmbedBuilder } = require('discord.js');
const { actualizarEstadoPorTiempo } = require('../../utils/estadoHelper');
const { getAllUsers, saveAllUsers } = require('../../data/db');
const evoluciones = require('../../utils/evoluciones');

module.exports = {
    name: 'estado',
    description: 'Muestra el estado de tu Pokémon.',
    async execute(message, args) {
        console.log('✅ ¡Comando !estado ejecutado!');

        const users = getAllUsers();
        const userId = message.author.id;

        if (!users[userId]) {
            return message.reply('¡Aún no has adoptado un Pokémon! Usa `!adoptar Pikachu` para empezar.');
        }

        users[userId] = actualizarEstadoPorTiempo(users[userId]);
        const poke = users[userId];

        // Solo sumar experiencia si se ha ganado en una batalla
        // Por ejemplo, si el Pokémon ha ganado 100 XP por una batalla reciente:
        // Asegúrate de que la experiencia solo se añade cuando corresponda (en batallas, por ejemplo)
        // No sumar experiencia automáticamente al ejecutar !estado

        // Verificamos si el Pokémon ha alcanzado el nivel de evolución
        if (evoluciones[poke.pokemon] && poke.nivel >= evoluciones[poke.pokemon].nivel) {
            const pokemonAnterior = poke.pokemon;
            poke.pokemon = evoluciones[poke.pokemon].evolucionaA;
            message.channel.send(`🎉 ¡${pokemonAnterior} ha evolucionado a **${poke.pokemon}**! 🧬`);
        }

        // Guardamos los datos actualizados del usuario
        saveAllUsers(users);

        // Obtener imagen desde PokéAPI
        const nombre = poke.pokemon.toLowerCase();
        let imagen = null;

        try {
            const res = await globalThis.fetch(`https://pokeapi.co/api/v2/pokemon/${nombre}`);
            const data = await res.json();
            imagen = data.sprites.other['official-artwork'].front_default;
        } catch (error) {
            console.error(`❌ Error al buscar imagen de ${nombre}:`, error);
        }

        // Crear y enviar el embed con el estado actualizado
        const embed = new EmbedBuilder()
            .setTitle(`Estado de ${poke.pokemon}`)
            .setDescription(`Nivel: ${poke.nivel}\n🍖 Hambre: ${poke.hambre}/100\n😄 Felicidad: ${poke.felicidad}/100\n😴 Sueño: ${poke.sueño}/100\n📈 XP: ${poke.experiencia}/100`)
            .setColor(0xffcb05)
            .setThumbnail(imagen || 'https://cdn-icons-png.flaticon.com/512/188/188987.png')
            .setFooter({ text: `Entrenador: ${message.author.username}` });

        message.channel.send({ embeds: [embed] });
    }
};
