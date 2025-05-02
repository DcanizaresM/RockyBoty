// test-opus-stream.js
const play = require('play-dl');

(async () => {
    const url = 'https://www.youtube.com/watch?v=VD18MLi7e5o';
    try {
        const { stream, type } = await play.stream(url, { quality: 2 });
        console.log('✅ play-dl ha obtenido stream, type:', type);
        stream.once('data', chunk => {
            console.log(`💥 Raw opus stream emitiendo datos (${chunk.length} bytes)`);
            stream.destroy();
        });
        // Timeout para abortar si nada llega
        setTimeout(() => {
            console.log('⚠️ No llegó ningún chunk raw tras 5s');
            stream.destroy();
        }, 5000);
    } catch (err) {
        console.error('❌ test-opus-stream fallo:', err);
    }
})();
