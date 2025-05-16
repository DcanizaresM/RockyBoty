// commands/tamagotchi/retar.js
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
const fs = require('fs');
const path = require('path');
const { calcularDano } = require('../../utils/battleHelper');

module.exports = {
  name: 'retar',
  description: 'Reta a una batalla Pokémon interactiva entre entrenadores.',
  async execute(message) {
    const p1 = message.author.id;
    const mention = message.mentions.users.first();
    if (!mention) {
      return message.reply('Debes mencionar a un usuario: `!retar @usuario`');
    }
    const p2 = mention.id;

    // Obtener cada usuario
    const user1 = await getUser(p1);
    const user2 = await getUser(p2);

    if (!Array.isArray(user1.team) || !user1.team.length ||
      !Array.isArray(user2.team) || !user2.team.length) {
      return message.reply('Ambos entrenadores deben tener un Pokémon (usa `!capturar`).');
    }

    // Desafío y aceptación
    const retoEmbed = new EmbedBuilder()
      .setTitle('🏁 Desafío Pokémon')
      .setDescription(`<@${p1}> te reta a una batalla. ¿Aceptas?`)
      .setColor(0xffa500);
    const retoMsg = await message.channel.send({
      embeds: [retoEmbed],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`aceptar_${p1}_${p2}`)
            .setLabel('Aceptar')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`rechazar_${p1}_${p2}`)
            .setLabel('Rechazar')
            .setStyle(ButtonStyle.Danger)
        )
      ]
    });

    try {
      const resp = await retoMsg.awaitMessageComponent({
        filter: i => i.user.id === p2 && ['aceptar', 'rechazar'].some(x => i.customId.startsWith(x)),
        time: 30000
      });
      await resp.deferUpdate();
      if (resp.customId.startsWith('rechazar')) {
        return message.channel.send(`❌ <@${p2}> rechazó el desafío.`);
      }
      await message.channel.send(`✅ <@${p2}> aceptó. ¡Empieza la batalla!`);
    } catch {
      return message.channel.send(`⌛ <@${p2}> no respondió. Desafío cancelado.`);
    }

    // Carga stats y sprites de ambos Pokémon
    const [dInit, dRival] = await Promise.all([
      fetch(`https://pokeapi.co/api/v2/pokemon/${user1.team[0].pokemon.toLowerCase()}`).then(r => r.json()),
      fetch(`https://pokeapi.co/api/v2/pokemon/${user2.team[0].pokemon.toLowerCase()}`).then(r => r.json())
    ]);
    const initStats = {}, rivalStats = {};
    dInit.stats.forEach(s => initStats[s.stat.name] = s.base_stat);
    dRival.stats.forEach(s => rivalStats[s.stat.name] = s.base_stat);

    // Obtener hasta 4 movimientos de cada uno con detalles
    const initMoves = await Promise.all(
      dInit.moves.slice(0, 4).map(m => fetch(m.move.url).then(r => r.json()))
    );
    const rivalMoves = await Promise.all(
      dRival.moves.slice(0, 4).map(m => fetch(m.move.url).then(r => r.json()))
    );

    // Estado HP
    const stats = {
      [p1]: { hp: initStats.hp, max: initStats.hp, fuerza: initStats.attack, defensa: initStats.defense },
      [p2]: { hp: rivalStats.hp, max: rivalStats.hp, fuerza: rivalStats.attack, defensa: rivalStats.defense }
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
    ctx.drawImage(await Canvas.loadImage(dInit.sprites.back_default), 50, h - 120 - 20, 120, 120);
    ctx.drawImage(await Canvas.loadImage(dRival.sprites.front_default), w - 120 - 50, h - 120 - 20, 120, 120);
    const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'battle.png' });

    // Construir botones a partir de initMoves / rivalMoves
    const typeStyles = {
      fire: ButtonStyle.Danger,
      water: ButtonStyle.Primary,
      grass: ButtonStyle.Success,
      electric: ButtonStyle.Primary,
      default: ButtonStyle.Secondary
    };
    const buildRows = id => {
      const arr = id === p1 ? initMoves : rivalMoves;
      const rows = [];
      for (let i = 0; i < arr.length; i += 3) {
        const row = new ActionRowBuilder();
        arr.slice(i, i + 3).forEach(mv => {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`mv_${id}_${mv.name.toLowerCase()}`)
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
    const name2 = message.client.users.cache.get(p2).username.toUpperCase();
    let battleEmbed = new EmbedBuilder()
      .setTitle(`⚔️ ${user1.team[0].pokemon.toUpperCase()} vs ${user2.team[0].pokemon.toUpperCase()}`)
      .setDescription(`TURNO DE ${name1}`)
      .setImage('attachment://battle.png')
      .addFields(
        { name: name1, value: `HP: ${stats[p1].hp}/${stats[p1].max}\n${makeHpBar(stats[p1].hp, stats[p1].max)}`, inline: true },
        { name: name2, value: `HP: ${stats[p2].hp}/${stats[p2].max}\n${makeHpBar(stats[p2].hp, stats[p2].max)}`, inline: true }
      )
      .setColor(0x00AE86);

    let battleMsg = await message.channel.send({
      embeds: [battleEmbed],
      files: [attachment],
      components: buildRows(p1)
    });

    /// Bucle principal de combate
    let winner = null;

    combatLoop: while (true) {
      for (const attacker of [p1, p2]) {
        const defender = attacker === p1 ? p2 : p1;
        const turnName = attacker === p1 ? name1 : name2;

        // Actualizar embed de turno
        battleEmbed.setDescription(`TURNO DE ${turnName}`);
        await battleMsg.edit({ embeds: [battleEmbed], components: buildRows(attacker) });

        let chosenMove;
        if (attacker === p1) {
          // Jugador elige ataque
          try {
            const inter = await battleMsg.awaitMessageComponent({
              filter: i => i.user.id === attacker && i.customId.startsWith(`mv_${attacker}_`),
              time: 30000
            });
            await inter.deferUpdate();
            chosenMove = initMoves.find(mv => `mv_${attacker}_${mv.name.toLowerCase()}` === inter.customId);
          } catch {
            // Si no responde, el jugador pierde
            winner = defender;
            break combatLoop;
          }
        } else {
          // Turno del rival
          chosenMove = rivalMoves[Math.floor(Math.random() * rivalMoves.length)];
        }

        // Determinar el tipo del defensor desde su team
        const defenderObj = defender === p1 ? user1 : user2;
        const defenderType = defenderObj.team[0].type[0];

        // Calcular daño con await
        const { damage } = await calcularDano(
          { hp: stats[attacker].hp, ataque: stats[attacker].fuerza, defensa: stats[attacker].defensa },
          { hp: stats[defender].hp, ataque: stats[defender].fuerza, defensa: stats[defender].defensa, type: defenderType },
          chosenMove
        );
        stats[defender].hp = Math.max(0, stats[defender].hp - damage);

        // Actualizar embed con HP y footer
        battleEmbed
          .setFields(
            { name: name1, value: `HP: ${stats[p1].hp}/${stats[p1].max}\n${makeHpBar(stats[p1].hp, stats[p1].max)}`, inline: true },
            { name: name2, value: `HP: ${stats[p2].hp}/${stats[p2].max}\n${makeHpBar(stats[p2].hp, stats[p2].max)}`, inline: true }
          )
          .setFooter({ text: `Última acción: ${chosenMove.name} causó ${damage}` });
        await battleMsg.edit({ embeds: [battleEmbed], components: [] });

        // **Comprobación de victoria inmediata**
        if (stats[defender].hp === 0) {
          winner = attacker;
          break combatLoop;
        }
      }
    }
    // Determinar ganador y perdedor
    const loser = winner === p1 ? p2 : p1;

    // Actualizar experiencia y felicidad
    user1.team[0].experiencia += winner === p1 ? 150 : 0;
    user2.team[0].experiencia += winner === p2 ? 150 : 0;
    user1.team[0].felicidad = Math.min(100, user1.team[0].felicidad + (winner === p1 ? 10 : -10));
    user2.team[0].felicidad = Math.max(0, user2.team[0].felicidad + (winner === p2 ? 10 : -10));

    // Subir de nivel si corresponde
    if (user1.team[0].experiencia >= 100) {
      user1.team[0].nivel++;
      user1.team[0].experiencia -= 100;
    }
    if (user2.team[0].experiencia >= 100) {
      user2.team[0].nivel++;
      user2.team[0].experiencia -= 100;
    }

    // Embed final de victoria
    battleEmbed
      .setTitle(`🏆 ¡${message.client.users.cache.get(winner).username.toUpperCase()} GANA!`)
      .setDescription(`**${user1.team[0].pokemon}** derrotó a **${user2.team[0].pokemon}**.`)
      .setFooter({ text: `EXP: ${winner === p1 ? user1.team[0].experiencia : user2.team[0].experiencia}/100` })
      .setColor(0xFFD700);
    await battleMsg.edit({ embeds: [battleEmbed], components: [] });

    // Guardar historial y usuarios
    const battles = await getAllBattles();
    battles.push({ ganador: winner, perdedor: loser, fecha: new Date().toISOString() });
    await saveAllBattles(battles);
    await saveUser(p1, { team: user1.team });
    await saveUser(p2, { team: user2.team });
  }
};
