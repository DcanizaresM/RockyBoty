// test-ffmpeg.js
const play = require('play-dl');
const prism = require('prism-media');
const ffmpegPath = require('ffmpeg-static');

(async () => {
    console.log('🔍 Usando FFmpeg en:', ffmpegPath);
    const url = 'https://www.youtube.com/watch?v=VD18MLi7e5o';

    try {
        // 1) Obtenemos el stream y su tipo
        const { stream, type } = await play.stream(url, { quality: 2 });
        console.log('✅ play-dl ha obtenido stream, type:', type);

        // 2) Elegimos args de FFmpeg según el tipo
        let args;
        if (type === 'opus') {
            // Raw Opus: indicamos input format
            args = [
                '-re',
                '-f', 'opus',
                '-ar', '48000',
                '-ac', '2',
                '-i', 'pipe:0',
                '-analyzeduration', '0',
                '-loglevel', 'error',
                '-vn',
                '-acodec', 'libopus',
                '-f', 'opus',
                '-ar', '48000',
                '-ac', '2',
                'pipe:1'
            ];
        } else {
            // Container (webm/mp4/etc.)
            args = [
                '-re',
                '-i', 'pipe:0',
                '-analyzeduration', '0',
                '-loglevel', 'error',
                '-vn',
                '-acodec', 'libopus',
                '-f', 'opus',
                '-ar', '48000',
                '-ac', '2',
                'pipe:1'
            ];
        }
        console.log('🔄 FFmpeg args:', args.join(' '));

        // 3) Arrancamos FFmpeg
        const ffmpeg = new prism.FFmpeg({ ffmpegPath, args });
        ffmpeg.once('data', () => console.log('💥 FFmpeg está emitiendo datos Opus'));
        ffmpeg.on('error', e => console.error('❌ FFmpeg error:', e));

        // 4) Pipeamos el stream a FFmpeg
        stream.pipe(ffmpeg);

        // 5) Tras 5s, destruimos para terminar la prueba
        setTimeout(() => {
            ffmpeg.destroy();
            stream.destroy();
            console.log('🛑 Fin de la prueba FFmpeg');
        }, 5000);

    } catch (err) {
        console.error('❌ test-ffmpeg fallo:', err);
    }
})();
