// commands/tamagotchi/listPokemons.js
const { EmbedBuilder } = require('discord.js');
const pokemons = require('../../data/pokemons');

module.exports = {
    name: 'listarpokemons',
    description: 'Muestra la lista de Pokémon para adoptar.',
    async execute(message, args) {
        // 1) Obtenemos los nombres en el orden del objeto (que coincide con el Nº de Pokédex Gen1)
        const names = Object.keys(pokemons);

        // 2) Creamos un embed por Pokémon, asignando el sprite según su índice+1
        const embeds = names.map((name, i) => {
            const id = i + 1;  // Nº de Pokédex
            const imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

            return new EmbedBuilder()
                .setTitle(name)
                .setDescription(pokemons[name].descripcion)
                .setThumbnail(imageUrl)
                .setFooter({ text: `#${id.toString().padStart(3, '0')}` });
        });

        // 3) Chunk de 10 embeds por mensaje (Discord permite máximo 10 embeds/mesaje)
        const chunkSize = 10;
        for (let i = 0; i < embeds.length; i += chunkSize) {
            const chunk = embeds.slice(i, i + chunkSize);
            await message.channel.send({ embeds: chunk });
        }
    },
};
