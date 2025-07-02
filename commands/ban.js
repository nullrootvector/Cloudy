const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bans a member from the server. Requires Ban Members permission.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to ban')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('days')
                .setDescription('Number of days of messages to delete (0-7)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(7))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the ban')
                .setRequired(false)),

    async execute(interaction, config) {
        const memberToBan = interaction.options.getMember('target');
        const daysToDelete = interaction.options.getInteger('days') || 0;
        const reason = interaction.options.getString('reason') || "没有提供理由 (No reason provided)";

        // Check if the command issuer has permission
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({ content: "🚫 你没有权限使用此命令，亲爱的。(You don't have permission to use this command, dear.)", ephemeral: true });
        }

        // Check if the bot has the necessary permissions
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({ content: "😥 我没有足够的权限来执行此操作。(I don't have enough permissions to perform this action.)", ephemeral: true });
        }

        // Check if the bot can ban the member (role hierarchy)
        if (!memberToBan.bannable) {
            return interaction.reply({ content: "我无法封禁此用户。他们可能有更高的角色，或者我没有足够的权限。(I cannot ban this user. They might have a higher role, or I don't have permission.)", ephemeral: true });
        }

        // Check if the command issuer is trying to ban themselves
        if (memberToBan.id === interaction.user.id) {
            return interaction.reply({ content: "你不能封禁自己，我的朋友！(You can't ban yourself, my friend!)", ephemeral: true });
        }

        try {
            // Ban options: days for message deletion (0-7)
            const banOptions = { days: daysToDelete, reason: reason };
            await memberToBan.ban(banOptions);
            
            const banEmbed = new EmbedBuilder()
                .setColor('#ff0000') // Red for ban
                .setTitle('🚫 Member Banned')
                .setDescription(`${memberToBan.user.tag} has been banned from the server.`)
                .addFields(
                    { name: 'Banned User (被封禁用户)', value: `${memberToBan.user.tag} (${memberToBan.id})`, inline: true },
                    { name: 'Moderator (管理员)', value: interaction.user.tag, inline: true },
                    { name: 'Messages Deleted (消息删除天数)', value: `${daysToDelete} days`, inline: true},
                    { name: 'Reason (理由)', value: reason }
                )
                .setTimestamp()
                .setFooter({ text: `Server: ${interaction.guild.name}` });

            await interaction.reply({ embeds: [banEmbed] });
            console.log(`${interaction.user.tag} banned ${memberToBan.user.tag} for: ${reason}, deleting ${daysToDelete} days of messages.`);

            // Send log to moderation channel
            if (config.MOD_LOG_CHANNEL_ID) {
                const logChannel = interaction.guild.channels.cache.get(config.MOD_LOG_CHANNEL_ID);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('🚫 Member Banned (日志)')
                        .setDescription(`${memberToBan.user.tag} has been banned.`)
                        .addFields(
                            { name: 'Banned User (被封禁用户)', value: `${memberToBan.user.tag} (${memberToBan.id})`, inline: true },
                            { name: 'Moderator (管理员)', value: interaction.user.tag, inline: true },
                            { name: 'Messages Deleted (消息删除天数)', value: `${daysToDelete} days`, inline: true },
                            { name: 'Reason (理由)', value: reason }
                        )
                        .setTimestamp()
                        .setFooter({ text: `User ID: ${memberToBan.id}` });
                    logChannel.send({ embeds: [logEmbed] }).catch(console.error);
                }
            }

            // Optionally, DM the banned user
            try {
                await memberToBan.send(`你已被封禁于服务器 **${interaction.guild.name}**。\n理由：${reason}\n删除消息天数：${daysToDelete}`);
            } catch (dmError) {
                console.warn(`Could not DM ${memberToBan.user.tag} about their ban: ${dmError}`);
            }

        } catch (error) {
            console.error(`Error banning member ${memberToBan.user.tag}:`, error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: "执行封禁操作时发生错误。(An error occurred while trying to ban the member.)", ephemeral: true });
            } else {
                await interaction.reply({ content: "执行封禁操作时发生错误。(An error occurred while trying to ban the member.)", ephemeral: true });
            }
        }
    }
};
