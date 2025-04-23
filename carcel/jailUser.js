const { QuickDB } = require('quick.db');
const db = new QuickDB();

const boosterRoleId = '1339945751731503185';

const { joinVoiceChannel, createAudioPlayer, createAudioResource, entersState, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const path = require('path');
const fs = require('fs');
const ms = require('ms');

module.exports = async (member, jailRoleId, time = null, reason = 'Ninguna razón especificada') => {
  const releaseAt = time ? Date.now() + ms(time) : null;

  const roles = member.roles.cache
    .filter(role =>
      role.id !== member.guild.id &&
      role.id !== jailRoleId &&
      role.id !== boosterRoleId
    )
    .map(r => r.id);

  await db.set(`jail_${member.id}`, {
    roles,
    guildId: member.guild.id,
    releaseAt,
    reason
  });

  const finalRoles = [jailRoleId];
  if (member.roles.cache.has(boosterRoleId)) finalRoles.push(boosterRoleId);

  try {
    // Aplicamos los roles de cárcel primero para garantizar que se apliquen
    await member.roles.set(finalRoles);

    // Si el usuario está en un canal de voz, reproducimos el audio antes de desconectar
    if (member.voice.channel) {
      try {
        // Verificamos primero si el archivo existe para evitar errores posteriores
        const filePath = path.join(__dirname, '..', 'public', 'jail.mp3');
        
        if (!fs.existsSync(filePath)) {
          console.error("❌ jail.mp3 no existe en /public");
          // Desconectamos al usuario directamente si no hay archivo
          await member.voice.disconnect("No se encontró el archivo de audio").catch(e => 
            console.warn("⚠️ No se pudo desconectar al usuario:", e.message)
          );
        } else {
          // Creamos la conexión
          const connection = joinVoiceChannel({
            channelId: member.voice.channel.id,
            guildId: member.guild.id,
            adapterCreator: member.guild.voiceAdapterCreator,
            selfDeaf: false
          });

          // Esperamos a que la conexión esté lista
          try {
            await entersState(connection, VoiceConnectionStatus.Ready, 10000); // Aumentamos el timeout a 10 segundos
            
            // Manejamos desconexiones inesperadas
            connection.on('stateChange', (oldState, newState) => {
              const oldNetworking = Reflect.get(oldState, 'networking');
              const newNetworking = Reflect.get(newState, 'networking');
              
              const networkStateChange = oldNetworking?.state !== newNetworking?.state;
              if (networkStateChange && newNetworking.state === 'DISCONNECTED') {
                console.warn('La conexión se desconectó inesperadamente');
                connection.destroy();
              }
            });

            // Creamos el reproductor y el recurso
            const player = createAudioPlayer();
            const resource = createAudioResource(filePath);
            
            // Suscribimos y reproducimos
            connection.subscribe(player);
            player.play(resource);

            // Esperamos a que termine el audio y luego desconectamos
            player.on('stateChange', async (oldState, newState) => {
              if (
                oldState.status !== AudioPlayerStatus.Idle && 
                newState.status === AudioPlayerStatus.Idle
              ) {
                console.log("✅ Audio terminado, desconectando al usuario");
                // Pequeño retraso para asegurar que el audio se reprodujo completamente
                setTimeout(async () => {
                  try {
                    if (member.voice?.channel) {
                      await member.voice.disconnect("Castigado con jail.mp3");
                    }
                  } catch (e) {
                    console.warn("⚠️ No se pudo desconectar al usuario:", e.message);
                  } finally {
                    connection.destroy();
                  }
                }, 500);
              }
            });
            
            // Manejo de errores en el reproductor
            player.on('error', error => {
              console.error(`❌ Error en el reproductor: ${error.message}`);
              try {
                member.voice.disconnect("Error en la reproducción de audio");
              } catch (e) {} finally {
                connection.destroy();
              }
            });
            
          } catch (connErr) {
            console.error("❌ Error al establecer la conexión:", connErr.message);
            connection.destroy();
            // Si falla la conexión, intentamos desconectar al usuario
            try {
              if (member.voice?.channel) {
                await member.voice.disconnect("No se pudo establecer la conexión de audio");
              }
            } catch (e) {
              console.warn("⚠️ No se pudo desconectar al usuario:", e.message);
            }
          }
        }
      } catch (vcErr) {
        console.error("❌ Error al conectar al VC o reproducir audio:", vcErr.message);
        try {
          if (member.voice?.channel) {
            await member.voice.disconnect("Error general de audio");
          }
        } catch (e) {
          console.warn("⚠️ No se pudo desconectar al usuario:", e.message);
        }
      }
    }

    // Enviar mensaje privado al usuario
    try {
      await member.send({
        embeds: [{
          title: "🚔 Has sido encarcelado",
          description: `Fuiste enviado a la cárcel en **${member.guild.name}**.\n**Razón:** ${reason}\n**Duración:** ${time ?? 'Indefinida'}`,
          color: 0xFF0000
        }]
      });
    } catch (dmErr) {
      console.warn("⚠️ No se pudo enviar DM al usuario:", dmErr.message);
    }

  } catch (err) {
    console.error("❌ Error general al aplicar cárcel:", err.message);
  }

  return releaseAt;
};