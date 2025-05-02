// commands/tamagotchi/retar.js
const {
    getAllUsers,
    saveAllUsers,
    getAllBattles,
    saveAllBattles
} = require('../../data/db');
const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    StringSelectMenuBuilder,
    ButtonStyle
} = require('discord.js');
const moves = require('../../data/moves');
const { calcularDano } = require('../../utils/battleHelper');
const { learnNextMove } = require('../../utils/moveHelper');
const Canvas = require('canvas');
const { AttachmentBuilder } = require('discord.js');

module.exports = {
    name: 'retar',
    description: 'Reta a una batalla Pokémon interactiva entre entrenadores.',
    async execute(message) {
        const users = getAllUsers();
        const battles = getAllBattles();
        const retadorId = message.author.id;
        const usuarioReto = message.mentions.users.first();
        if (!usuarioReto) return message.reply('Debes mencionar a un usuario: `!retar @usuario`');
        const rivalId = usuarioReto.id;

        // Verificar adopción
        const eRet = users[retadorId], eRiv = users[rivalId];
        if (!eRet?.pokemon || !eRiv?.pokemon) {
            return message.reply('Ambos entrenadores deben adoptar un Pokémon primero.');
        }

        // Desafío: aceptar o rechazar
        const desafio = new EmbedBuilder()
            .setTitle('🏁 Desafío Pokémon')
            .setDescription(`<@${retadorId}> te ha retado a una batalla. ¿Aceptas?`)
            .setColor(0xffa500);
        const desafioButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`aceptar_${retadorId}_${rivalId}`)
                .setLabel('Aceptar')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`rechazar_${retadorId}_${rivalId}`)
                .setLabel('Rechazar')
                .setStyle(ButtonStyle.Danger)
        );
        const desafioMsg = await message.channel.send({ embeds: [desafio], components: [desafioButtons] });

        try {
            const response = await desafioMsg.awaitMessageComponent({
                filter: i => ['aceptar', 'rechazar'].some(p => i.customId.startsWith(p)) && i.user.id === rivalId,
                time: 30000
            });
            await response.deferUpdate();
            if (response.customId.startsWith('rechazar')) {
                return message.channel.send(`❌ <@${rivalId}> rechazó el desafío.`);
            }
            await message.channel.send(`✅ <@${rivalId}> aceptó. ¡Batalla iniciada!`);
        } catch {
            return message.channel.send(`⌛ <@${rivalId}> no respondió. Desafío cancelado.`);
        }

        // Helper de HP bar
        function createHpBar(current, max) {
            const cur = Math.max(0, Math.min(current, max));
            const pct = cur / max;
            const emoji = pct > 0.5 ? '🟩' : pct > 0.3 ? '🟨' : '🟥';
            const total = 10;
            const filled = Math.round(pct * total);
            const empty = total - filled;
            return emoji.repeat(filled) + '⬜'.repeat(empty);
        }

        // Estadísticas iniciales
        const stats = {
            [retadorId]: { hp: eRet.hp, maxHp: eRet.hp, ataque: eRet.fuerza, defensa: eRet.defensa, nivel: eRet.nivel },
            [rivalId]: { hp: eRiv.hp, maxHp: eRiv.hp, ataque: eRiv.fuerza, defensa: eRiv.defensa, nivel: eRiv.nivel }
        };

        // Combinar sprites con Canvas
        const w = 500, h = 250;
        const canvas = Canvas.createCanvas(w, h);
        const ctx = canvas.getContext('2d');
        const img1 = await Canvas.loadImage(eRet.imagen);
        const img2 = await Canvas.loadImage(eRiv.imagen);
        ctx.drawImage(img1, 0, 0, w / 2, h);
        ctx.drawImage(img2, w / 2, 0, w / 2, h);
        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'battle.png' });

        // Estilos de botón por tipo
        const typeStyles = {
            fire: ButtonStyle.Danger,
            fighting: ButtonStyle.Danger,
            grass: ButtonStyle.Success,
            bug: ButtonStyle.Success,
            electric: ButtonStyle.Primary,
            water: ButtonStyle.Primary,
            flying: ButtonStyle.Primary,
            poison: ButtonStyle.Secondary,
            psychic: ButtonStyle.Secondary,
            rock: ButtonStyle.Secondary,
            ground: ButtonStyle.Secondary,
            dragon: ButtonStyle.Secondary,
            ice: ButtonStyle.Primary,
            ghost: ButtonStyle.Secondary,
            default: ButtonStyle.Secondary
        };

        // Embed inicial de batalla
        const retName = message.client.users.cache.get(retadorId).username.toUpperCase();
        const rivName = message.client.users.cache.get(rivalId).username.toUpperCase();
        const battleEmbed = new EmbedBuilder()
            .setTitle(`⚔️ BATALLA: ${eRet.pokemon.toUpperCase()} vs ${eRiv.pokemon.toUpperCase()}`)
            .setDescription(`TURNO DE ${retName}`)
            .setImage('attachment://battle.png')
            .addFields(
                {
                    name: retName,
                    value: `HP: ${stats[retadorId].hp}/${stats[retadorId].maxHp}\n${createHpBar(stats[retadorId].hp, stats[retadorId].maxHp)}`, inline: true
                },
                {
                    name: rivName,
                    value: `HP: ${stats[rivalId].hp}/${stats[rivalId].maxHp}\n${createHpBar(stats[rivalId].hp, stats[rivalId].maxHp)}`, inline: true
                }
            )
            .setColor(0x00AE86)
            .setFooter({ text: `NIVEL ${stats[retadorId].nivel} vs NIVEL ${stats[rivalId].nivel}` });
        const battleMsg = await message.channel.send({ embeds: [battleEmbed], files: [attachment] });

        // Función para pedir movimiento y editar embed
        const askMove = async userId => {
            battleEmbed.setDescription(`TURNO DE ${message.client.users.cache.get(userId).username.toUpperCase()}`);
            const rows = [];
            const keys = users[userId].moves;
            for (let i = 0; i < keys.length; i += 5) {
                const row = new ActionRowBuilder();
                keys.slice(i, i + 5).forEach(key => {
                    const mv = moves[key];
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`move_${userId}_${key}`)
                            .setLabel(`${mv.name}-${mv.type}(${mv.power})`)
                            .setStyle(typeStyles[mv.type] || typeStyles.default)
                    );
                });
                rows.push(row);
            }
            await battleMsg.edit({ embeds: [battleEmbed], components: rows });
            try {
                const inter = await battleMsg.awaitMessageComponent({
                    filter: i => i.user.id === userId && i.customId.startsWith(`move_${userId}_`),
                    time: 30000
                });
                await inter.deferUpdate();
                return moves[inter.customId.split('_').slice(2).join('_')];
            } catch {
                return null;
            }
        };

        // Bucle de batalla
        let winner;
        while (!winner) {
            for (const attackerId of [retadorId, rivalId]) {
                const defenderId = attackerId === retadorId ? rivalId : retadorId;
                const move = await askMove(attackerId);
                if (!move) { winner = defenderId; break; }

                const { damage, effectiveness } = calcularDano(stats[attackerId], stats[defenderId], move);
                stats[defenderId].hp -= damage;
                const hpLeft = Math.max(stats[defenderId].hp, 0);
                const effTxt = effectiveness === 2
                    ? '🔥 SÚPER EFECTIVO!' : (effectiveness === 0.5 ? '🌊 NO MUY EFECTIVO…' : '');

                // Actualizar HP bars y footer
                battleEmbed.setFields(
                    {
                        name: retName,
                        value: `HP: ${stats[retadorId].hp}/${stats[retadorId].maxHp}\n${createHpBar(stats[retadorId].hp, stats[retadorId].maxHp)}`, inline: true
                    },
                    {
                        name: rivName,
                        value: `HP: ${stats[rivalId].hp}/${stats[rivalId].maxHp}\n${createHpBar(stats[rivalId].hp, stats[rivalId].maxHp)}`, inline: true
                    }
                );
                battleEmbed.setFooter({ text: `Última acción: ${users[attackerId].pokemon} usó ${move.name}. Daño causado: ${damage}` });
                await battleMsg.edit({ embeds: [battleEmbed], components: [] });

                if (hpLeft <= 0) { winner = attackerId; break; }
            }
        }

        // Procesar subida de nivel con máximo 4 movimientos
        const loser = winner === retadorId ? rivalId : retadorId;
        const winUser = users[winner], loseUser = users[loser];
        winUser.felicidad = Math.min(100, winUser.felicidad + 10);
        loseUser.felicidad = Math.max(0, loseUser.felicidad - 10);
        winUser.experiencia += 150;
        let lvlMsg = '';
        if (winUser.experiencia >= 100) {
            winUser.nivel += 1;
            winUser.experiencia -= 100;
            // Determinar nuevo movimiento
            const sorted = Object.entries(moves)
                .sort(([, a], [, b]) => a.power - b.power)
                .map(([key]) => key);
            const nextIdx = winUser.moves.length;
            if (nextIdx < sorted.length) {
                const newMove = sorted[nextIdx];
                if (winUser.moves.length < 4) {
                    winUser.moves.push(newMove);
                    lvlMsg = `\n**¡${winUser.pokemon.toUpperCase()} SUBE A NIVEL ${winUser.nivel} Y APRENDE ${moves[newMove].name}!**`;
                } else {
                    // Pedir cuál olvidar para aprender newMove
                    const opts = winUser.moves.map(key => ({ label: moves[key].name, value: key }));
                    const menu = new StringSelectMenuBuilder()
                        .setCustomId(`forget_${winner}`)
                        .setPlaceholder('Elige movimiento a olvidar')
                        .addOptions(opts);
                    const row = new ActionRowBuilder().addComponents(menu);
                    const prompt = await message.channel.send({
                        embeds: [new EmbedBuilder()
                            .setTitle('🧠 ¡Aprendizaje de movimiento!')
                            .setDescription(
                                `**${winUser.pokemon}** sube a nivel ${winUser.nivel} y puede aprender **${moves[newMove].name}**.` +
                                `\nPero ya conoce 4 movimientos. Elige cuál olvidar para aprenderlo.`
                            )
                            .setColor(0xffa500)
                        ],
                        components: [row]
                    });
                    try {
                        const inter = await prompt.awaitMessageComponent({
                            filter: i => i.customId === `forget_${winner}` && i.user.id === winner,
                            time: 30000
                        });
                        await inter.deferUpdate();
                        const toForget = inter.values[0];
                        winUser.moves = winUser.moves.map(m => m === toForget ? newMove : m);
                        await prompt.edit({ content: `🔄 **${moves[toForget].name}** olvidado. **${moves[newMove].name}** aprendido.`, embeds: [], components: [] });
                        lvlMsg = `\n**¡${winUser.pokemon.toUpperCase()} SUBE A NIVEL ${winUser.nivel}!**`;
                    } catch {
                        await prompt.edit({ content: '⌛ No se seleccionó. No aprendió movimiento.', embeds: [], components: [] });
                        lvlMsg = `\n**¡${winUser.pokemon.toUpperCase()} SUBE A NIVEL ${winUser.nivel}!**`;
                    }
                }
            }
        }

        // Guardar historial y usuarios
        battles.push({ ganador: winner, perdedor: loser, fecha: new Date().toISOString() });
        saveAllBattles(battles);
        saveAllUsers(users);

        // Embed final
        battleEmbed
            .setTitle(`🏆 ¡${message.client.users.cache.get(winner).username.toUpperCase()} GANA!`)
            .setDescription(`**${winUser.pokemon}** derrotó a **${loseUser.pokemon}**.${lvlMsg}`)
            .setFooter({ text: `EXPERIENCIA: ${winUser.experiencia}/100` });
        await battleMsg.edit({ embeds: [battleEmbed], components: [] });
    }
};
