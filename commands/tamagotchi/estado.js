// commands/tamagotchi/estado.js
const { EmbedBuilder } = require('discord.js');
const { actualizarEstadoPorTiempo } = require('../../utils/estadoHelper');
const { intentarEvolucion } = require('../../utils/evolucionHelper');
const { getUser, saveUser } = require('../../data/db');
const fetch = require('node-fetch');

module.exports = {
    name: 'estado',
    description: 'Muestra el estado de un Pokémon de tu equipo. Uso: !estado <nombre-pokemon>',
    async execute(message, args) {
        const nombre = args[0]?.toLowerCase();
        if (!nombre) {
            return message.reply('❌ Debes indicar el nombre de tu Pokémon: `!estado <nombre-pokemon>`');
        }

        const userId = message.author.id;
        const user = await getUser(userId);
        if (!user?.team?.length) {
            return message.reply('❌ ¡Aún no tienes un equipo! Usa `!capturar` para añadir tu primer Pokémon.');
        }

        // 1) Buscar el Pokémon en el equipo
        const team = user.team;
        const idx = team.findIndex(p => p.pokemon.toLowerCase() === nombre);
        if (idx === -1) {
            return message.reply(`❌ No tienes a **${nombre.toUpperCase()}** en tu equipo.`);
        }

        // 2) Aplicar decay/ganancia temporal
        let poke = actualizarEstadoPorTiempo(team[idx]);

        // 3) Intentar evolución automática
        try {
            const evolucionó = await intentarEvolucion(poke);
            if (evolucionó) {
                await message.channel.send(
                    `🎉 ¡Tu ${poke.pokemon.toUpperCase()} ha evolucionado automáticamente! 🧬`
                );
            }
        } catch (err) {
            console.error('Error al intentar evolución en !estado:', err);
        }

        // 4) Guardar cambios (estado y posible evolución)
        team[idx] = poke;
        await saveUser(userId, { team });

        // 5) Obtener artwork oficial
        let imagen = null;
        try {
            const res = await fetch(
                `https://pokeapi.co/api/v2/pokemon/${poke.pokemon.toLowerCase()}`
            );
            if (res.ok) {
                const data = await res.json();
                imagen = data.sprites.other['official-artwork'].front_default;
            }
        } catch (err) {
            console.error(`Error al obtener imagen de ${poke.pokemon}:`, err);
        }

        // 6) Construir y enviar el embed de estado
        const embed = new EmbedBuilder()
            .setTitle(`Estado de ${poke.pokemon.toUpperCase()}`)
            .setDescription(
                `Nivel: ${poke.nivel}` +
                `\n🍖 Hambre: ${poke.hambre}/100` +
                `\n😄 Felicidad: ${poke.felicidad}/100` +
                `\n😴 Sueño: ${poke.sueno}/100` +
                `\n📈 XP: ${poke.experiencia}/100`
            )
            .setColor(0xffcb05)
            .setThumbnail(
                imagen || 'https://cdn-icons-png.flaticon.com/512/188/188987.png'
            )
            .setFooter({ text: `Entrenador: ${message.author.username}` });

        await message.channel.send({ embeds: [embed] });
    }
};