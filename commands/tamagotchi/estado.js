// commands/tamagotchi/estado.js
const { EmbedBuilder } = require('discord.js');
const { actualizarEstadoPorTiempo } = require('../../utils/estadoHelper');
const { getUser, saveUser } = require('../../data/db');
const evoluciones = require('../../utils/evoluciones');

module.exports = {
    name: 'estado',
    description: 'Muestra el estado de tu Pokémon principal.',
    async execute(message, args) {


        // 1) Comprobar si el comando se ejecuta en el canal correcto
        const ALLOWED_CHANNEL = '1359486378353885326';
        if (message.channel.id !== ALLOWED_CHANNEL) {
            return message.reply(`⚠️ Este comando sólo funciona en <#${ALLOWED_CHANNEL}>.`);
        }






        const userId = message.author.id;

        // 1) Leemos el usuario de Firestore
        const user = await getUser(userId);
        if (!user || !Array.isArray(user.team) || user.team.length === 0) {
            return message.reply('¡Aún no has capturado un Pokémon! Usa `!capturar` primero.');
        }

        // 2) Trabajamos con el primer Pokémon en el equipo
        let poke = user.team[0];

        // 3) Aplicar decay/ganancia por tiempo
        poke = actualizarEstadoPorTiempo(poke);

        // 4) Comprobar evolución
        const evo = evoluciones[poke.pokemon];
        if (evo && poke.nivel >= evo.nivel) {
            const anterior = poke.pokemon;
            poke.pokemon = evo.evolucionaA;
            // Informamos de la evolución
            await message.channel.send(
                `🎉 ¡${anterior} ha evolucionado a **${poke.pokemon}**! 🧬`
            );
        }

        // 5) Guardar solo el Pokémon actualizado en Firestore
        const newTeam = [...user.team];
        newTeam[0] = poke;
        await saveUser(userId, { team: newTeam });

        // 6) Obtener artwork desde la PokéAPI
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

        // 7) Construir y enviar el embed
        const embed = new EmbedBuilder()
            .setTitle(`Estado de ${poke.pokemon}`)
            .setDescription(
                `Nivel: ${poke.nivel}` +
                `\n🍖 Hambre: ${poke.hambre}/100` +
                `\n😄 Felicidad: ${poke.felicidad}/100` +
                `\n😴 Sueño: ${poke.sueno}/100` +
                `\n📈 XP: ${poke.experiencia}/100`
            )
            .setColor(0xffcb05)
            .setThumbnail(
                imagen ||
                'https://cdn-icons-png.flaticon.com/512/188/188987.png'
            )
            .setFooter({ text: `Entrenador: ${message.author.username}` });

        await message.channel.send({ embeds: [embed] });
    }
};
