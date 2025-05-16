// utils/estadoHelper.js

/**
 * Actualiza hambre, sueno y felicidad según el tiempo transcurrido.
 * Renombramos 'sueño' a 'sueno' para evitar problemas con la tilde.
 */
const actualizarEstadoPorTiempo = (poke) => {
    // Asegurarnos de que los campos existan y sean numéricos
    poke.hambre = Number(poke.hambre) || 0;
    poke.sueno = Number(poke.sueno) || 0;
    poke.felicidad = Number(poke.felicidad) || 0;

    const ahora = new Date();
    const ultima = new Date(poke.ultimaAccion);
    const minutos = Math.floor((ahora - ultima) / (1000 * 60));

    if (minutos <= 0) return poke;

    // Por cada X minutos, modificamos los stats
    const hambreAumenta = Math.floor(minutos / 10) * 5;
    const suenoAumenta = Math.floor(minutos / 15) * 5;
    const felicidadBaja = Math.floor(minutos / 20) * 5;

    poke.hambre = Math.min(100, poke.hambre + hambreAumenta);
    poke.sueno = Math.min(100, poke.sueno + suenoAumenta);
    poke.felicidad = Math.max(0, poke.felicidad - felicidadBaja);

    poke.ultimaAccion = ahora.toISOString();
    return poke;
};

module.exports = { actualizarEstadoPorTiempo };
