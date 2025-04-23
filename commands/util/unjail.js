const unjailUser = require('../../carcel/unjailUser');

module.exports = {
  name: 'unjail',
  description: 'Libera a un usuario de la cárcel',
  async execute(message, args) {
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
          description: "Debes mencionar a un usuario válido para liberar.",
          color: 0xFF8800
        }]
      });
    }

    const success = await unjailUser(member);
    if (!success) {
      return message.reply({
        embeds: [{
          title: "📛 No estaba encarcelado",
          description: "Este usuario no tiene datos guardados de encarcelamiento.",
          color: 0xFFA500
        }]
      });
    }

    const embed = {
      title: "✅ Usuario Liberado",
      description: `${member.user.tag} ha sido liberado y se le devolvieron sus roles.`,
      color: 0x00CCFF
    };

    message.channel.send({ embeds: [embed] });

    try {
      await member.send({
        embeds: [{
          title: "🔓 Has sido liberado",
          description: "Fuiste liberado manualmente por un moderador.",
          color: 0x00FF00
        }]
      });
    } catch (e) {}
  }
};
