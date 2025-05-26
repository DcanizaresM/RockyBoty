// commands/tamagotchi/topbatallas.js
const { EmbedBuilder } = require('discord.js');
const { getAllBattles } = require('../../data/db');

module.exports = {
    name: 'topbatallas',
    description: 'Muestra el ranking de entrenadores con más batallas ganadas.',
    async execute(message, args) {
        // 1) Obtener todas las batallas (asegurar que esperamos la promesa)
        let battles = await getAllBattles();

        // Si viene de Firestore, convertir QuerySnapshot a array de datos
        if (battles.docs && Array.isArray(battles.docs)) {
            battles = battles.docs.map(doc => doc.data());
        }

        // 2) Contar las victorias por usuario
        const victorias = {};
        for (const battle of battles) {
            const ganador = battle.ganador;
            victorias[ganador] = (victorias[ganador] || 0) + 1;
        }

        // 3) Ordenar por número de victorias y tomar top 10
        const top10 = Object.entries(victorias)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);

        // 4) Construir embed con mención de usuario
        const description = top10
            .map(([userId, wins], index) => `#${index + 1} • <@${userId}> — **${wins}** victorias`)
            .join('\n') || 'No hay batallas registradas aún.';

        const embed = new EmbedBuilder()
            .setTitle('🏆 Top 10 de Batallas Ganadas')
            .setColor(0x30c6f0)
            .setDescription(description)
            .setFooter({ text: '¡A seguir batallando!' });

        // 5) Enviar embed
        await message.channel.send({ embeds: [embed] });
    }
};
