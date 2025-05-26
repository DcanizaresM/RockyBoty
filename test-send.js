// test-send.js
require('dotenv').config();
const { sendWelcomeEmail } = require('./utils/mailer');

(async () => {
    try {
        await sendWelcomeEmail(
            'rockazlol@gmail.com',                // tu Gmail verificado
            process.env.SG_WELCOME_TEMPLATE_ID,
            {
                username: 'Rockaz',
                rules: '- Sé respetuoso\n- No hagas spam\n- Diviértete',
                commandsList: '`!capturar`, `!team`, `!retar`'
            }
        );
        console.log('✅ Correo de prueba enviado a Gmail');
    } catch (err) {
        console.error('❌ Error enviando correo de prueba a Gmail:', err);
    }
})();
