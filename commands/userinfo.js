const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Displays information about a user.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to get information about (defaults to yourself)')
                .setRequired(false)),
    async execute(interaction) {
        const user = interaction.options.getUser('target') || interaction.user;
        const member = interaction.guild.members.cache.get(user.id);

        if (!member) {
            return interaction.reply({ content: 'Could not find information for that user.', ephemeral: true });
        }

        const userInfoEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`User Information: ${user.tag}`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '🆔 User ID (用户ID)', value: user.id, inline: true },
                { name: '🤖 Bot (机器人)', value: user.bot ? 'Yes (是)' : 'No (否)', inline: true },
                { name: '📅 Account Created (账号创建日期)', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: false },
                { name: '📥 Joined Server (加入服务器日期)', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: false },
                { name: '🏷️ Roles (角色)', value: member.roles.cache.filter(role => role.id !== interaction.guild.id).map(role => role.name).join(', ') || 'None (无)', inline: false }
            )
            .setTimestamp()
            .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });

        await interaction.reply({ embeds: [userInfoEmbed], ephemeral: false });
    },
};