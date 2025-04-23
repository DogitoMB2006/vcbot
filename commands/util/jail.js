const ms = require('ms');
const jailUser = require('../../carcel/jailUser');

module.exports = {
  name: 'jail',
  description: 'Envia a un usuario a la cárcel',
  async execute(message, args) {
    // Verifica permisos
    if (!message.member.permissions.has("KickMembers")) {
      return message.reply({
        embeds: [{
          title: "⛔ Acceso Denegado",
          description: "Necesitas el permiso `Kick Members` para usar este comando.",
          color: 0xFF0000
        }]
      });
    }

    const member = message.mentions.members.first();
    if (!member) {
      return message.reply({
        embeds: [{
          title: "❌ Error",
          description: "Debes mencionar a un usuario válido para encarcelar.",
          color: 0xFF8800
        }]
      });
    }

    const timeArg = args[1];
    const reason = args.slice(2).join(' ') || "No se especificó razón";
    const jailRoleId = '1364411422465069087';

    const releaseAt = await jailUser(member, jailRoleId, timeArg, reason);

    const embed = {
      title: "🚨 Usuario Encarcelado",
      description: `${member.user.tag} fue encarcelado.\n**Razón:** ${reason}\n**Tiempo:** ${timeArg ?? 'Indefinido'}`,
      color: 0xFF8800
    };

    message.channel.send({ embeds: [embed] });

    if (releaseAt) {
      const timeLeft = releaseAt - Date.now();
      setTimeout(async () => {
        const unjail = require('../../carcel/unjailUser');
        const success = await unjail(member);
        if (success) {
          message.channel.send(`⏰ ${member.user.tag} ha sido liberado automáticamente.`);
          try {
            await member.send({
              embeds: [{
                title: "🔓 Has sido liberado",
                description: "⏰ Tu tiempo en la cárcel ha terminado. Ya puedes participar nuevamente en el servidor.",
                color: 0x00FF00
              }]
            });
          } catch (e) {}
        }
      }, timeLeft);
    }
  }
};
