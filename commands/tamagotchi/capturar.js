// commands/tamagotchi/capturar.js
const { getUser, saveUser, getAllBattles, saveAllBattles } = require('../../data/db');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder
} = require('discord.js');
const fetch = require('node-fetch');
const Canvas = require('canvas');
const path = require('path');
const fs = require('fs');
const { calcularDano } = require('../../utils/battleHelper');
const pokemons = require('../../data/pokemons');

module.exports = {
  name: 'capturar',
  description: 'Reta y captura un Pokémon salvaje tras un combate interactivo con sprites y fondo estáticos.',
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

    // Fetch stats de inicial y salvaje
    const [dInit, dWild] = await Promise.all([
      fetch(`https://pokeapi.co/api/v2/pokemon/${team[0].pokemon.toLowerCase()}`).then(r => r.json()),
      fetch(`https://pokeapi.co/api/v2/pokemon/${wildSpecies}`).then(r => r.json())
    ]);
    const initStats = {};
    const wildStats = {};
    dInit.stats.forEach(s => initStats[s.stat.name] = s.base_stat);
    dWild.stats.forEach(s => wildStats[s.stat.name] = s.base_stat);

    // Extraer tipos directamente de la API
    const initTypes = dInit.types.map(t => t.type.name);
    const wildTypes = dWild.types.map(t => t.type.name);

    // Obtener hasta 4 movimientos
    const initMoves = await Promise.all(
      dInit.moves.slice(0, 4).map(m => fetch(m.move.url).then(r => r.json()))
    );
    const wildMoves = await Promise.all(
      dWild.moves.slice(0, 4).map(m => fetch(m.move.url).then(r => r.json()))
    );

    // Estado HP inicial
    const p1 = userId;
    const p2 = 'wild';
    const stats = {
      [p1]: { hp: initStats.hp, max: initStats.hp, fuerza: initStats.attack, defensa: initStats.defense },
      [p2]: { hp: wildStats.hp, max: wildStats.hp, fuerza: wildStats.attack, defensa: wildStats.defense }
    };
    const makeHpBar = (cur, max) => {
      const pct = cur / max;
      const fill = Math.round(pct * 10);
      const emoji = pct > 0.5 ? '🟩' : pct > 0.3 ? '🟨' : '🟥';
      return emoji.repeat(fill) + '⬜'.repeat(10 - fill);
    };

    // Canvas sprites y fondo
    const w = 500, h = 250;
    const canvas = Canvas.createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    const bgDir = path.join(process.cwd(), 'assets', 'bg');
    const bgFiles = fs.existsSync(bgDir)
      ? fs.readdirSync(bgDir).filter(f => f.match(/\.(png|jpe?g)$/i))
      : [];
    if (bgFiles.length) {
      const bgImage = await Canvas.loadImage(path.join(bgDir, bgFiles[Math.floor(Math.random() * bgFiles.length)]));
      ctx.drawImage(bgImage, 0, 0, w, h);
    }
    const initSprite = await Canvas.loadImage(dInit.sprites.back_default);
    const wildSprite = await Canvas.loadImage(dWild.sprites.front_default);
    ctx.drawImage(initSprite, 50, h - 140, 120, 120);
    ctx.drawImage(wildSprite, w - 170, h - 140, 120, 120);

    const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'battle.png' });

    // Construir botones de movimientos
    const typeStyles = {
      fire: ButtonStyle.Danger,
      water: ButtonStyle.Primary,
      grass: ButtonStyle.Success,
      electric: ButtonStyle.Primary,
      default: ButtonStyle.Secondary
    };
    const buildRows = id => {
      const arr = id === p1 ? initMoves : wildMoves;
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

    // Embed inicial
    const name1 = message.client.users.cache.get(p1).username.toUpperCase();
    const battleEmbed = new EmbedBuilder()
      .setTitle(`⚔️ ${team[0].pokemon.toUpperCase()} vs ${wildName.toUpperCase()}`)
      .setDescription(`TURNO DE ${name1}`)
      .setImage('attachment://battle.png')
      .addFields(
        {
          name: name1, value: `HP: ${stats[p1].hp}/${stats[p1].max}
${makeHpBar(stats[p1].hp, stats[p1].max)}`, inline: true
        },
        {
          name: wildName, value: `HP: ${stats[p2].hp}/${stats[p2].max}
${makeHpBar(stats[p2].hp, stats[p2].max)}`, inline: true
        }
      )
      .setColor(0x00AE86);

    let battleMsg = await message.channel.send({ embeds: [battleEmbed], files: [attachment], components: buildRows(p1) });

    // Bucle de combate
    let winner = null;
    combatLoop: while (true) {
      for (const attacker of [p1, p2]) {
        const defender = attacker === p1 ? p2 : p1;
        const turnName = attacker === p1 ? name1 : wildName.toUpperCase();

        battleEmbed.setDescription(`TURNO DE ${turnName}`);
        await battleMsg.edit({ embeds: [battleEmbed], components: buildRows(attacker) });

        let chosenMove;
        if (attacker === p1) {
          try {
            const inter = await battleMsg.awaitMessageComponent({
              filter: i => i.user.id === attacker && i.customId.startsWith(`mv_${attacker}_`),
              time: 30000
            });
            await inter.deferUpdate();
            chosenMove = initMoves.find(mv => `mv_${attacker}_${mv.name.toLowerCase()}` === inter.customId);
          } catch {
            winner = defender;
            break combatLoop;
          }
        } else {
          chosenMove = wildMoves[Math.floor(Math.random() * wildMoves.length)];
        }

        // Calcular daño
        const defenderType = attacker === p1 ? wildTypes[0] : initTypes[0];
        const { damage } = await calcularDano(
          { hp: stats[attacker].hp, ataque: stats[attacker].fuerza, defensa: stats[attacker].defensa },
          { hp: stats[defender].hp, ataque: stats[defender].fuerza, defensa: stats[defender].defensa, type: defenderType },
          chosenMove
        );
        stats[defender].hp = Math.max(0, stats[defender].hp - damage);

        // Actualizar embed con HP y footer de acción
        battleEmbed
          .setFields(
            {
              name: name1, value: `HP: ${stats[p1].hp}/${stats[p1].max}
${makeHpBar(stats[p1].hp, stats[p1].max)}`, inline: true
            },
            {
              name: wildName, value: `HP: ${stats[p2].hp}/${stats[p2].max}
${makeHpBar(stats[p2].hp, stats[p2].max)}`, inline: true
            }
          )
          .setFooter({ text: `Última acción: ${chosenMove.name} causó ${damage} de daño` });
        await battleMsg.edit({ embeds: [battleEmbed] });

        if (stats[defender].hp === 0) {
          winner = attacker;
          break combatLoop;
        }
      }
    }

    // Post combate: captura o escape
    if (winner === p1) {
      battleEmbed
        .setTitle(`${wildName.toUpperCase()} debilitado!`)
        .setDescription('Pulsa **¡Atrápalo!** para capturarlo.')
        .setColor('#00AE86');
      const captureBtn = new ButtonBuilder()
        .setCustomId(`atrapalo_${userId}_${wildSpecies}`)
        .setLabel('¡Atrápalo!')
        .setStyle(ButtonStyle.Success);
      await battleMsg.edit({ embeds: [battleEmbed], components: [new ActionRowBuilder().addComponents(captureBtn)] });

      try {
        const inter = await battleMsg.awaitMessageComponent({
          filter: i => i.user.id === userId && i.customId === `atrapalo_${userId}_${wildSpecies}`,
          time: 30000
        });
        await inter.deferUpdate();

        const statMap = {};
        dWild.stats.forEach(s => statMap[s.stat.name] = s.base_stat);
        const pokeData = {
          pokemon: wildSpecies,
          type: wildTypes,
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
          moves: wildMoves.map(mv => mv.name),
          ultimaAccion: new Date().toISOString()
        };
        await saveUser(userId, { team: [...team, pokeData] });

        battleEmbed
          .setTitle(`🎉 ¡Has capturado a ${wildName}!`)
          .setDescription('Se ha añadido a tu equipo.')
          .setThumbnail(pokeData.imagen);
        await battleMsg.edit({ embeds: [battleEmbed], components: [] });
      } catch {
        battleEmbed
          .setTitle('💨 Fallaste en atrapar y escapó')
          .setColor('#FF0000');
        await battleMsg.edit({ embeds: [battleEmbed], components: [] });
      }
    } else {
      battleEmbed
        .setTitle('💨 Tu Pokémon fue derrotado y el salvaje se escapó')
        .setColor('#FF0000');
      await battleMsg.edit({ embeds: [battleEmbed], components: [] });
    }

    // Guardar batalla en historial
    const battles = await getAllBattles();
    battles.push({
      ganador: winner === p1 ? userId : 'wild',
      perdedor: winner === p1 ? 'wild' : userId,
      fecha: new Date().toISOString()
    });
    await saveAllBattles(battles);
  }
};
