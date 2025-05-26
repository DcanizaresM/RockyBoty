// utils/mailer.js
const sgMail = require('@sendgrid/mail');
require('dotenv').config();

// Inicializa con tu clave
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Envía un email con plantilla dinámica de SendGrid.
 * Atrapará errores y los dejará registrados sin romper el bot.
 */
async function sendWelcomeEmail(to, templateId, dynamicData = {}) {
    try {
        const msg = {
            to,
            from: 'david_cz7@hotmail.com',    // <-- ¡Misma dirección verificada en SendGrid!
            templateId,
            dynamicTemplateData: dynamicData
        };
        await sgMail.send(msg);
        console.log(`✅ SendGrid: correo enviado a ${to}`);
    } catch (error) {
        console.error('❌ SendGrid Error:', error.response?.body || error);
        // No relanzamos, para que el bot siga vivo
    }
}

module.exports = { sendWelcomeEmail };