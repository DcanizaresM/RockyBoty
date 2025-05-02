const actualizarEstadoPorTiempo = (poke) => {
    const ahora = new Date();
    const ultima = new Date(poke.ultimaAccion);
    const minutosPasados = Math.floor((ahora - ultima) / (1000 * 60));

    if (minutosPasados <= 0) return poke;

    // Por cada X minutos, modificamos los stats
    const hambreAumenta = Math.floor(minutosPasados / 10) * 5;
    const sueñoAumenta = Math.floor(minutosPasados / 15) * 5;
    const felicidadBaja = Math.floor(minutosPasados / 20) * 5;

    poke.hambre = Math.min(100, poke.hambre + hambreAumenta);
    poke.sueño = Math.min(100, poke.sueño + sueñoAumenta);
    poke.felicidad = Math.max(0, poke.felicidad - felicidadBaja);

    poke.ultimaAccion = ahora.toISOString();

    return poke;
};

module.exports = { actualizarEstadoPorTiempo };
