// commands/tamagotchi/debug.js

module.exports = {
    name: 'me',
    description: 'Muestra tus datos de usuario desde Firestore',
    async execute(message) {
        const { getUser } = require('../../data/db');
        try {
            const data = await getUser(message.author.id);
            if (!data) {
                return message.reply('❌ No tienes datos guardados en la base de datos.');
            }
            // Formatear JSON para mostrarlo en el chat
            const json = JSON.stringify(data, null, 2);
            return message.reply(`📋 Tus datos en Firestore:\`\`\`json ${json}
\`\`\``);
        } catch (err) {
            console.error('Error en comando me:', err);
            return message.reply('❌ Ha ocurrido un error al recuperar tus datos.');
        }
    }
};
