// commands/tamagotchi/capturar.js
const { getUser, saveUser, getAllBattles, saveAllBattles } = require('../../data/db');
const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const fetch = require('node-fetch');
const Canvas = require('canvas');
const { AttachmentBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const pokemons = require('../../data/pokemons');
const { calcularDano } = require('../../utils/battleHelper');

module.exports = {
    name: 'capturar',
    description: 'Reta y captura un Pokémon salvaje tras un combate interactivo.',
    async execute(message) {
        const userId = message.author.id;
        const user = await getUser(userId);
        const team = user?.team || [];

        if (!team.length) {
            return message.reply('❌ Aún no tienes un Pokémon inicial. Elige uno primero con la bienvenida.');
        }
        if (team.length >= 6) {
            return message.reply('❌ Tu equipo ya tiene 6 Pokémon. Libera uno antes de capturar más.');
        }

        // Elegir Pokémon salvaje
        const speciesKeys = Object.keys(pokemons);
        const wildSpecies = speciesKeys[Math.floor(Math.random() * speciesKeys.length)];
        const wildName = wildSpecies.charAt(0).toUpperCase() + wildSpecies.slice(1);

        // Traer datos de la API para inicial y salvaje
        const [dInit, dWild] = await Promise.all([
            fetch(`https://pokeapi.co/api/v2/pokemon/${team[0].pokemon.toLowerCase()}`).then(r => r.json()),
            fetch(`https://pokeapi.co/api/v2/pokemon/${wildSpecies}`).then(r => r.json())
        ]);

        // Mapear stats
        const initStats = {}, wildStats = {};
        dInit.stats.forEach(s => initStats[s.stat.name] = s.base_stat);
        dWild.stats.forEach(s => wildStats[s.stat.name] = s.base_stat);

        // Obtener hasta 4 movimientos del inicial con detalles completos
        const initMoveEntries = dInit.moves.slice(0, 4);
        const initMoves = await Promise.all(
            initMoveEntries.map(m => fetch(m.move.url).then(r => r.json()))
        );

        // Movimientos del salvaje para el combate
        const wildMoveEntries = dWild.moves.slice(0, 4);
        const wildMoves = await Promise.all(
            wildMoveEntries.map(m => fetch(m.move.url).then(r => r.json()))
        );

        // Configurar HP inicial
        const p1 = userId, p2 = 'wild';
        const stats = {
            [p1]: { hp: initStats.hp, max: initStats.hp, fuerza: initStats.attack, defensa: initStats.defense },
            [p2]: { hp: wildStats.hp, max: wildStats.hp, fuerza: wildStats.attack, defensa: wildStats.defense }
        };

        const makeHpBar = (cur, max) => {
            const pct = cur / max, fill = Math.round(pct * 10);
            const emoji = pct > 0.5 ? '🟩' : pct > 0.3 ? '🟨' : '🟥';
            return emoji.repeat(fill) + '⬜'.repeat(10 - fill);
        };

        // Crear canvas de batalla
        const w = 500, h = 250;
        const canvas = Canvas.createCanvas(w, h);
        const ctx = canvas.getContext('2d');
        try {
            const bgDir = path.join(process.cwd(), 'assets', 'bg');
            const bgFiles = fs.readdirSync(bgDir).filter(f => f.match(/\.(png|jpe?g)$/i));
            if (bgFiles.length) {
                const img = await Canvas.loadImage(path.join(bgDir, bgFiles[Math.floor(Math.random() * bgFiles.length)]));
                ctx.drawImage(img, 0, 0, w, h);
            }
        } catch { }
        const sw = 120, sh = 120;
        ctx.drawImage(await Canvas.loadImage(dInit.sprites.back_default), 50, h - sh - 20, sw, sh);
        ctx.drawImage(await Canvas.loadImage(dWild.sprites.front_default), w - sw - 50, h - sh - 20, sw, sh);
        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'battle.png' });

        // Construir botones de movimientos
        const typeStyles = {
            fire: ButtonStyle.Danger,
            water: ButtonStyle.Primary,
            grass: ButtonStyle.Success,
            electric: ButtonStyle.Primary,
            default: ButtonStyle.Secondary
        };
        const buildRows = movesArray => {
            const rows = [];
            for (let i = 0; i < movesArray.length; i += 3) {
                const row = new ActionRowBuilder();
                movesArray.slice(i, i + 3).forEach(mv => {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`mv_${mv.name.toLowerCase()}`)
                            .setLabel(`${mv.name} (${mv.power})`)
                            .setStyle(typeStyles[mv.type.name] || typeStyles.default)
                    );
                });
                rows.push(row);
            }
            return rows;
        };

        // Embed inicial de batalla
        const name1 = message.client.users.cache.get(p1).username.toUpperCase();
        let battleEmbed = new EmbedBuilder()
            .setTitle(`⚔️ ${team[0].pokemon.toUpperCase()} vs ${wildName.toUpperCase()}`)
            .setDescription(`TURNO DE ${name1}`)
            .setImage('attachment://battle.png')
            .addFields(
                { name: name1, value: `HP: ${stats[p1].hp}/${stats[p1].max}\n${makeHpBar(stats[p1].hp, stats[p1].max)}`, inline: true },
                { name: wildName, value: `HP: ${stats[p2].hp}/${stats[p2].max}\n${makeHpBar(stats[p2].hp, stats[p2].max)}`, inline: true }
            )
            .setColor(0x00AE86);

        // Enviar batalla con botones
        let battleMsg = await message.channel.send({
            embeds: [battleEmbed],
            files: [attachment],
            components: buildRows(initMoves)
        });

        // Bucle de combate
        let winner = null;
        while (!winner) {
            // Turno jugador
            battleEmbed.setDescription(`TURNO DE ${name1}`);
            await battleMsg.edit({ embeds: [battleEmbed], components: buildRows(initMoves) });
            let chosen;
            try {
                const inter = await battleMsg.awaitMessageComponent({
                    filter: i => i.user.id === p1 && i.customId.startsWith('mv_'),
                    time: 30000
                });
                await inter.deferUpdate();
                chosen = initMoves.find(mv => `mv_${mv.name.toLowerCase()}` === inter.customId);
            } catch {
                winner = p2;
                break;
            }
            const { damage } = await calcularDano(
                { hp: stats[attacker].hp, ataque: stats[attacker].fuerza, defensa: stats[attacker].defensa },
                // Nota: si en tu código guardas tipo en `team[x].type` o en `team[x].tipo`, pásalo aquí:
                { hp: stats[defender].hp, ataque: stats[defender].fuerza, defensa: stats[defender].defensa, type: defenderType },
                chosenMove
            );

            stats[p2].hp = Math.max(0, stats[p2].hp - damage);

            // Turno salvaje
            if (stats[p2].hp > 0) {
                const wildChoice = wildMoves[Math.floor(Math.random() * wildMoves.length)];
                const { damage: dmg2 } = calcularDano(
                    { hp: stats[p2].hp, ataque: stats[p2].fuerza, defensa: stats[p2].defensa },
                    { hp: stats[p1].hp, ataque: stats[p1].fuerza, defensa: stats[p1].defensa }, wildChoice
                );
                stats[p1].hp = Math.max(0, stats[p1].hp - dmg2);
            }

            // Actualizar embed con HP y footer
            battleEmbed
                .setFields(
                    { name: name1, value: `HP: ${stats[p1].hp}/${stats[p1].max}\n${makeHpBar(stats[p1].hp, stats[p1].max)}`, inline: true },
                    { name: wildName, value: `HP: ${stats[p2].hp}/${stats[p2].max}\n${makeHpBar(stats[p2].hp, stats[p2].max)}`, inline: true }
                )
                .setFooter({ text: `Última acción: ${chosen.name} causó ${damage}` });
            await battleMsg.edit({ embeds: [battleEmbed] });

            if (stats[p1].hp === 0 || stats[p2].hp === 0) {
                winner = stats[p1].hp > 0 ? p1 : p2;
                break;
            }
        }
        // winner === p1 si tu Pokémon gana; en caso contrario, wild escapa.
        if (winner === p1) {
            // 1) Preparar datos del Pokémon salvaje capturado
            const statMap = {};
            dWild.stats.forEach(s => statMap[s.stat.name] = s.base_stat);
            const pokeData = {
                pokemon: wildSpecies,
                type: dWild.types.map(t => t.type.name),
                imagen: dWild.sprites.front_default,
                nivel: 1,
                experiencia: 0,
                felicidad: 70,
                hambre: 50,
                sueno: 50,
                fuerza: statMap.attack,
                defensa: statMap.defense,
                agilidad: statMap.speed,
                hp: statMap.hp,
                moves: wildMoves,
                ultimaAccion: new Date().toISOString()
            };

            // 2) Guardar en Firestore: ampliamos el team del usuario
            const newTeam = [...team, pokeData];
            await saveUser(userId, { team: newTeam });

            // 3) Editar el embed para indicar captura
            battleEmbed
                .setTitle(`🎉 ¡Has capturado a ${wildName}!`)
                .setDescription('Se ha añadido a tu equipo.')
                .setColor('#00AE86')
                .setThumbnail(pokeData.imagen);

            // (Opcional) Mostrar nuevamente los botones de movimientos del Pokémon capturado
            await battleMsg.edit({
                embeds: [battleEmbed],
                components: buildRows(p1)
            });

        } else {
            // Tu Pokémon ha sido derrotado y el salvaje escapa
            battleEmbed
                .setTitle('💨 Tu Pokémon fue derrotado y el salvaje se escapó')
                .setColor('#FF0000');

            // Quitamos botones
            await battleMsg.edit({
                embeds: [battleEmbed],
                components: []
            });
        }

        // 4) Guardar la batalla en el historial de Firestore
        const battles = await getAllBattles();
        battles.push({
            ganador: winner === p1 ? userId : 'wild',
            perdedor: winner === p1 ? 'wild' : userId,
            fecha: new Date().toISOString()
        });
        await saveAllBattles(battles);

    }
};
