const { getAllBattles } = require('../../data/db');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'topbatallas',
    description: 'Muestra el ranking de entrenadores con más batallas ganadas.',
    async execute(message, args) {
        const battles = getAllBattles();

        // Contar las victorias por usuario
        const victorias = {};
        battles.forEach(battle => {
            if (!victorias[battle.ganador]) {
                victorias[battle.ganador] = 0;
            }
            victorias[battle.ganador] += 1;
        });

        // Ordenar por número de victorias (de mayor a menor)
        const top10 = Object.entries(victorias)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        const embed = new EmbedBuilder()
            .setTitle('Top 10 de Batallas Ganadas')
            .setColor(0x30c6f0)
            .setDescription(top10.map((entry, index) => `#${index + 1} - **${entry[0]}**: ${entry[1]} victorias`).join('\n'))
            .setFooter({ text: `¡A seguir batallando!` });

        message.channel.send({ embeds: [embed] });
    }
};
