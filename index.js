require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.commands = new Collection();
client.prefix = process.env.PREFIX;

// Handler de comandos
require('./handler/commandHandler')(client);

// Cuando el bot esté listo
client.once('ready', async () => {
  console.log(`✅ Conectado como ${client.user.tag}`);

  // ⏰ Revisión de cárcel al iniciar el bot
  const all = await db.all();
  for (const { id, value } of all) {
    if (!id.startsWith("jail_")) continue;

    const userId = id.split("_")[1];
    const guild = client.guilds.cache.get(value.guildId);
    if (!guild) continue;

    let member;
    try {
      member = await guild.members.fetch(userId);
    } catch (err) {
      console.warn(`No se pudo obtener al miembro ${userId}`);
      continue;
    }

    if (value.releaseAt) {
      const timeLeft = value.releaseAt - Date.now();

      if (timeLeft <= 0) {
        const unjail = require('./carcel/unjailUser');
        await unjail(member);
        try {
          await member.send({
            embeds: [{
              title: "🔓 Has sido liberado",
              description: "Tu tiempo en la cárcel ha terminado. Ya puedes participar nuevamente en el servidor.",
              color: 0x00FF00
            }]
          });
        } catch (e) {}
      } else {
        setTimeout(async () => {
          const unjail = require('./carcel/unjailUser');
          await unjail(member);
          try {
            await member.send({
              embeds: [{
                title: "🔓 Has sido liberado",
                description: "Tu tiempo en la cárcel ha terminado. Ya puedes participar nuevamente en el servidor.",
                color: 0x00FF00
              }]
            });
          } catch (e) {}
        }, timeLeft);
      }
    }
  }
});

// Comando por prefijo
client.on('messageCreate', message => {
  if (!message.content.startsWith(client.prefix) || message.author.bot) return;

  const args = message.content.slice(client.prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    command.execute(message, args);
  } catch (error) {
    console.error(error);
    message.reply('❌ Ocurrió un error al ejecutar el comando.');
  }
});

client.login(process.env.TOKEN);
