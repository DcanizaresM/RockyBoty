// commands/tamagotchi/retar.js
const { intentarEvolucion } = require('../../utils/evolucionHelper');

const { getUser, saveUser, getAllBattles, saveAllBattles } = require('../../data/db');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  ButtonStyle,
  AttachmentBuilder
} = require('discord.js');
const fetch = require('node-fetch');
const Canvas = require('canvas');
const fs = require('fs');
const path = require('path');
const { calcularDano } = require('../../utils/battleHelper');

module.exports = {
  name: 'retar',
  description: 'Reta a una batalla Pokémon interactiva entre entrenadores con sprites estáticos y lógica de experiencia.',
  async execute(message) {
    const p1 = message.author.id;
    const mention = message.mentions.users.first();
    if (!mention) {
      return message.reply('❌ Debes mencionar a un usuario: `!retar @usuario`');
    }
    const p2 = mention.id;

    // 1) Validar equipos
    const user1 = await getUser(p1);
    const user2 = await getUser(p2);
    if (!user1.team?.length || !user2.team?.length) {
      return message.reply('❌ Ambos entrenadores deben tener un Pokémon inicial (usa `!capturar`).');
    }

    // 2) Desafío y aceptación
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
        filter: i =>
          i.user.id === p2 && ['aceptar', 'rechazar'].some(x => i.customId.startsWith(x)),
        time: 30000
      });
      await resp.deferUpdate();

      if (resp.customId.startsWith('rechazar')) {
        // Al rechazar, quitamos botones y actualizamos el embed
        retoEmbed
          .setDescription(`<@${p2}> rechazó el desafío.`)
          .setColor(0xff0000);
        await retoMsg.edit({ embeds: [retoEmbed], components: [] });
        return;
      }

      // Aceptado: quitamos botones y actualizamos el embed
      retoEmbed
        .setDescription(`<@${p2}> aceptó el desafío. ¡A combatir!`)
        .setColor(0x00ae86);
      await retoMsg.edit({ embeds: [retoEmbed], components: [] });

      // Informar inicio de la batalla
      await message.channel.send(`✅ <@${p2}> aceptó. ¡Empieza la batalla!`);
    } catch {
      // Tiempo expirado: cancelamos desafío
      await retoMsg.edit({ components: [] });
      return message.channel.send(`⌛ <@${p2}> no respondió. Desafío cancelado.`);
    }

    // 3) Fetch datos y estadísticas
    const [dInit, dRival] = await Promise.all([
      fetch(`https://pokeapi.co/api/v2/pokemon/${user1.team[0].pokemon.toLowerCase()}`)
        .then(r => r.json()),
      fetch(`https://pokeapi.co/api/v2/pokemon/${user2.team[0].pokemon.toLowerCase()}`)
        .then(r => r.json())
    ]);
    const initStats = {}, rivalStats = {};
    dInit.stats.forEach(s => (initStats[s.stat.name] = s.base_stat));
    dRival.stats.forEach(s => (rivalStats[s.stat.name] = s.base_stat));

    // Extraer tipos directamente de la API
    const initTypes = dInit.types.map(t => t.type.name);
    const rivalTypes = dRival.types.map(t => t.type.name);

    // Movimientos detallados
    const initMoves = await Promise.all(
      dInit.moves.slice(0, 4).map(m => fetch(m.move.url).then(r => r.json()))
    );
    const rivalMoves = await Promise.all(
      dRival.moves.slice(0, 4).map(m => fetch(m.move.url).then(r => r.json()))
    );

    // 4) Canvas estático (fondo+sprites)
    const w = 500, h = 250;
    const canvas = Canvas.createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    try {
      const bgDir = path.join(process.cwd(), 'assets', 'bg');
      const files = fs.existsSync(bgDir)
        ? fs.readdirSync(bgDir).filter(f => f.match(/\.(png|jpe?g)$/i))
        : [];
      if (files.length) {
        const img = await Canvas.loadImage(
          path.join(bgDir, files[Math.floor(Math.random() * files.length)])
        );
        ctx.drawImage(img, 0, 0, w, h);
      }
      const backImg = await Canvas.loadImage(dInit.sprites.back_default);
      const frontImg = await Canvas.loadImage(dRival.sprites.front_default);
      ctx.drawImage(backImg, 50, h - 140, 120, 120);
      ctx.drawImage(frontImg, w - 170, h - 140, 120, 120);
    } catch (e) {
      console.error('⚠️ Error generando canvas en retar.js:', e);
    }
    const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'battle.png' });

    // 5) Embed inicial de batalla
    const name1 = message.client.users.cache.get(p1).username.toUpperCase();
    const name2 = message.client.users.cache.get(p2).username.toUpperCase();
    const stats = {
      [p1]: { hp: initStats.hp, max: initStats.hp, fuerza: initStats.attack, defensa: initStats.defense },
      [p2]: { hp: rivalStats.hp, max: rivalStats.hp, fuerza: rivalStats.attack, defensa: rivalStats.defense }
    };
    const makeHpBar = (cur, max) => {
      const pct = cur / max, fill = Math.round(pct * 10);
      const e = pct > 0.5 ? '🟩' : pct > 0.3 ? '🟨' : '🟥';
      return e.repeat(fill) + '⬜'.repeat(10 - fill);
    };
    let battleEmbed = new EmbedBuilder()
      .setTitle(`⚔️ ${user1.team[0].pokemon.toUpperCase()} vs ${user2.team[0].pokemon.toUpperCase()}`)
      .setDescription(`TURNO DE ${name1}`)
      .setImage('attachment://battle.png')
      .addFields(
        { name: name1, value: `HP: ${stats[p1].hp}/${stats[p1].max}\n${makeHpBar(stats[p1].hp, stats[p1].max)}`, inline: true },
        { name: name2, value: `HP: ${stats[p2].hp}/${stats[p2].max}\n${makeHpBar(stats[p2].hp, stats[p2].max)}`, inline: true }
      )
      .setColor(0x00ae86);

    let battleMsg = await message.channel.send({ embeds: [battleEmbed], files: [attachment], components: [] });
    // 6) Bucle interactivo para ambos
    const typeStyles = { fire: ButtonStyle.Danger, water: ButtonStyle.Primary, grass: ButtonStyle.Success, electric: ButtonStyle.Primary, default: ButtonStyle.Secondary };
    const buildRows = id => {
      const arr = id === p1 ? initMoves : rivalMoves;
      const rows = [];
      for (let i = 0; i < arr.length; i += 3) {
        const row = new ActionRowBuilder();
        arr.slice(i, i + 3).forEach(mv => {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`mv_${id}_${mv.name.toLowerCase()}`)
              .setLabel(`${mv.name} (${mv.power || '—'})`)
              .setStyle(typeStyles[mv.type.name] || typeStyles.default)
          );
        });
        rows.push(row);
      }
      return rows;
    };

    let winner = null;
    combatLoop: while (!winner) {
      for (const attacker of [p1, p2]) {
        const defender = attacker === p1 ? p2 : p1;
        const turnName = attacker === p1 ? name1 : name2;

        // mostrar botones
        await battleMsg.edit({
          embeds: [battleEmbed.setDescription(`TURNO DE ${turnName}`)],
          components: buildRows(attacker)
        });

        let chosenMove;
        try {
          const inter = await battleMsg.awaitMessageComponent({
            filter: i => i.user.id === attacker && i.customId.startsWith(`mv_${attacker}_`),
            time: 30000
          });
          await inter.deferUpdate();
          chosenMove = (attacker === p1 ? initMoves : rivalMoves).find(
            mv => `mv_${attacker}_${mv.name.toLowerCase()}` === inter.customId
          );
        } catch {
          winner = defender;
          break combatLoop;
        }

        // daño usando tipos obtenidos de la API
        const defenderType = attacker === p1 ? rivalTypes[0] : initTypes[0];
        const { damage } = await calcularDano(
          { hp: stats[attacker].hp, ataque: stats[attacker].fuerza, defensa: stats[attacker].defensa },
          { hp: stats[defender].hp, ataque: stats[defender].fuerza, defensa: stats[defender].defensa, type: defenderType },
          chosenMove
        );
        stats[defender].hp = Math.max(0, stats[defender].hp - damage);

        // actualizar embed
        battleEmbed
          .setFields(
            { name: name1, value: `HP: ${stats[p1].hp}/${stats[p1].max}\n${makeHpBar(stats[p1].hp, stats[p1].max)}`, inline: true },
            { name: name2, value: `HP: ${stats[p2].hp}/${stats[p2].max}\n${makeHpBar(stats[p2].hp, stats[p2].max)}`, inline: true }
          )
          .setFooter({ text: `Última acción: ${chosenMove.name} causó ${damage} de daño` });
        await battleMsg.edit({ embeds: [battleEmbed], components: [] });

        if (stats[defender].hp === 0) {
          winner = attacker;
          break combatLoop;
        }
      }
    }

    // 7) Post-batalla: experiencia, nivel y guardado
    const loser = winner === p1 ? p2 : p1;
    const winUser = winner === p1 ? user1 : user2;
    const loseUser = loser === p1 ? user1 : user2;

    // experiencia y felicidad
    winUser.team[0].experiencia += 150;
    winUser.team[0].felicidad = Math.min(100, winUser.team[0].felicidad + 10);
    loseUser.team[0].felicidad = Math.max(0, loseUser.team[0].felicidad - 10);

    // level-up
    let lvlMsg;
    if (winUser.team[0].experiencia >= 100) {
      winUser.team[0].nivel++;
      winUser.team[0].experiencia -= 100;
      const newLevel = winUser.team[0].nivel;
      lvlMsg = `**${winUser.team[0].pokemon.toUpperCase()} sube al nivel ${newLevel}!**`;

      // movimientos nuevos
      const species = winUser.team[0].pokemon.toLowerCase();
      const pokeData = await fetch(`https://pokeapi.co/api/v2/pokemon/${species}`)
        .then(r => r.json());
      const learnable = pokeData.moves.flatMap(m =>
        m.version_group_details
          .filter(d =>
            d.move_learn_method.name === 'level-up' &&
            d.level_learned_at === newLevel
          )
          .map(() => m.move.name)
      );

      for (const mvName of learnable) {
        if (winUser.team[0].moves.length < 4) {
          winUser.team[0].moves.push(mvName);
          lvlMsg += `\n★ Aprende **${mvName}**`;
        } else {
          const current = winUser.team[0].moves;
          const options = current.map(m => ({ label: m, value: m }));
          const menu = new StringSelectMenuBuilder()
            .setCustomId(`forget_${winner}_${mvName}`)
            .setPlaceholder(`Olvida un movimiento para aprender ${mvName}`)
            .addOptions(options);
          const prompt = await message.channel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle('🧠 Aprendizaje de movimiento')
                .setDescription(
                  `Tu ${winUser.team[0].pokemon} puede aprender **${mvName}**, pero ya tiene 4 movimientos. ¿Cuál quieres olvidar?`
                )
                .setColor(0xffa500)
            ],
            components: [new ActionRowBuilder().addComponents(menu)]
          });
          try {
            const inter = await prompt.awaitMessageComponent({
              filter: i => i.user.id === winner && i.customId.startsWith(`forget_${winner}_`),
              time: 30000
            });
            await inter.deferUpdate();
            const toForget = inter.values[0];
            const idx = current.indexOf(toForget);
            winUser.team[0].moves[idx] = mvName;
            lvlMsg += `\n★ Olvida **${toForget}**, aprende **${mvName}**`;
          } catch {
            lvlMsg += `\n(Se omitió aprender ${mvName} por tiempo)`;
          } finally {
            await prompt.edit({ components: [], embeds: [] });
          }
        }
      }
    } else {
      lvlMsg = `**${winUser.team[0].pokemon.toUpperCase()} no sube de nivel aún.**`;
    }

    // Embed final con sprite y nivel
    const spriteUrl = winUser.team[0].imagen;
    battleEmbed
      .setTitle(`🏆 ¡${message.client.users.cache.get(winner).username.toUpperCase()} GANA!`)
      .setDescription(lvlMsg)
      .setThumbnail(spriteUrl)
      .setColor(0xffd700);
    await battleMsg.edit({ embeds: [battleEmbed], components: [] });

    // guardar historial y usuarios
    const battles = await getAllBattles();
    battles.push({ ganador: winner, perdedor: loser, fecha: new Date().toISOString() });
    await saveAllBattles(battles);
    await saveUser(p1, { team: user1.team });
    await saveUser(p2, { team: user2.team });
  }
};
