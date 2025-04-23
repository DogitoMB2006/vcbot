const { QuickDB } = require('quick.db');
const db = new QuickDB();
const boosterRoleId = '1339945751731503185';

module.exports = async (member) => {
  const data = await db.get(`jail_${member.id}`);
  if (!data) return false;

  try {
    const rolesToRestore = [...data.roles];

    // Si tenía el rol de Booster durante el castigo, aseguramos que se mantenga
    if (member.roles.cache.has(boosterRoleId) && !rolesToRestore.includes(boosterRoleId)) {
      rolesToRestore.push(boosterRoleId);
    }

    await member.roles.set(rolesToRestore);

    await member.send({
      embeds: [{
        title: "🔓 Has sido liberado",
        description: `Recuperaste tus roles en el servidor **${member.guild.name}**.`,
        color: 0x00FF00
      }]
    });

    await db.delete(`jail_${member.id}`);
    return true;
  } catch (err) {
    console.error("Error al liberar:", err.message);
    return false;
  }
};
