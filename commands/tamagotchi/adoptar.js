// commands/tamagotchi/adoptar.js
const { EmbedBuilder } = require('discord.js');
const { getAllUsers, saveAllUsers } = require('../../data/db');
const { initMovesByLevel } = require('../../utils/moveHelper');

module.exports = {
    name: 'adoptar',
    description: 'Adopta a tu nuevo compañero Pokémon.',
    async execute(message, args) {
        const users = getAllUsers();
        const userId = message.author.id;

        if (users[userId]) {
            return message.reply(`¡Ya tienes un Pokémon, ${users[userId].pokemon}! Usa \`!estado\` para verlo.`);
        }

        const speciesArg = args[0]?.toLowerCase();
        if (!speciesArg) {
            return message.reply('Debes escribir el nombre del Pokémon. Ejemplo: `!adoptar pikachu`');
        }

        // Consultar PokéAPI
        let data;
        try {
            const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${speciesArg}`);
            if (!res.ok) throw new Error();
            data = await res.json();
        } catch {
            return message.reply('Pokémon no encontrado en la PokéAPI. Revisa el nombre.');
        }

        const type = data.types[0].type.name;
        const image = data.sprites.other['official-artwork'].front_default;
        const strength = Math.floor(Math.random() * 100) + 1;
        const defense = Math.floor(Math.random() * 100) + 1;
        const agility = Math.floor(Math.random() * 100) + 1;
        const hp = Math.floor((strength + defense + agility) / 3);

        // Movimiento inicial: uno aleatorio de todo el catálogo
        const moves = initMovesByLevel(1);

        users[userId] = {
            pokemon: speciesArg,
            type,
            imagen: image,
            nivel: 1,
            experiencia: 0,
            felicidad: 70,
            hambre: 50,
            sueño: 50,
            fuerza: strength,
            defensa: defense,
            agilidad: agility,
            hp,
            moves,               // SOLO 1 ataque (aleatorio)
            ultimaAccion: new Date().toISOString()
        };
        saveAllUsers(users);

        const embed = new EmbedBuilder()
            .setTitle(`¡Has adoptado a ${speciesArg.charAt(0).toUpperCase() + speciesArg.slice(1)}! 🎉`)
            .setDescription('Cuídalo bien o se pondrá triste 🥺')
            .setColor(0x30c6f0)
            .setThumbnail(image)
            .addFields(
                { name: 'Tipo', value: type, inline: true },
                { name: 'HP', value: `${hp}`, inline: true },
                { name: 'Fuerza', value: `${strength}`, inline: true },
                { name: 'Defensa', value: `${defense}`, inline: true },
                { name: 'Agilidad', value: `${agility}`, inline: true },
                {
                    name: 'Movimiento inicial',
                    value: moves.map(key => key).join(', '),
                    inline: false
                }
            )
            .setFooter({ text: `Entrenador: ${message.author.username}` });

        await message.channel.send({ embeds: [embed] });
    }
};
