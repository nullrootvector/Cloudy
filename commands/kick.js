const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kicks a member from the server. Requires Kick Members permission.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to kick')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the kick')
                .setRequired(false)),

    async execute(interaction, config) {
        const memberToKick = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') || "没有提供理由 (No reason provided)";

        // Check if the command issuer has permission
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return interaction.reply({ content: "🚫 你没有权限使用此命令，亲爱的。(You don't have permission to use this command, dear.)", ephemeral: true });
        }

        // Check if the bot has the necessary permissions
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return interaction.reply({ content: "😥 我没有足够的权限来执行此操作。(I don't have enough permissions to perform this action.)", ephemeral: true });
        }

        // Check if the bot can kick the member (role hierarchy)
        if (!memberToKick.kickable) {
            return interaction.reply({ content: "我无法踢出此用户。他们可能有更高的角色，或者我没有足够的权限。(I cannot kick this user. They might have a higher role, or I don't have permission.)", ephemeral: true });
        }
        
        // Check if the command issuer is trying to kick themselves
        if (memberToKick.id === interaction.user.id) {
            return interaction.reply({ content: "你不能踢自己啦，小傻瓜！(You can't kick yourself, silly!)", ephemeral: true });
        }

        try {
            await memberToKick.kick(reason);
            
            const kickEmbed = new EmbedBuilder()
                .setColor('#ffcc00') // Yellowish for kick
                .setTitle('👢 Member Kicked')
                .setDescription(`${memberToKick.user.tag} has been kicked from the server.`)
                .addFields(
                    { name: 'Kicked User (被踢用户)', value: `${memberToKick.user.tag} (${memberToKick.id})`, inline: true },
                    { name: 'Moderator (管理员)', value: interaction.user.tag, inline: true },
                    { name: 'Reason (理由)', value: reason }
                )
                .setTimestamp()
                .setFooter({ text: `Server: ${interaction.guild.name}` });

            await interaction.reply({ embeds: [kickEmbed] });
            console.log(`${interaction.user.tag} kicked ${memberToKick.user.tag} for: ${reason}`);

            // Send log to moderation channel
            if (config.MOD_LOG_CHANNEL_ID) {
                const logChannel = interaction.guild.channels.cache.get(config.MOD_LOG_CHANNEL_ID);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#ffcc00')
                        .setTitle('👢 Member Kicked (日志)')
                        .setDescription(`${memberToKick.user.tag} has been kicked.`)
                        .addFields(
                            { name: 'Kicked User (被踢用户)', value: `${memberToKick.user.tag} (${memberToKick.id})`, inline: true },
                            { name: 'Moderator (管理员)', value: interaction.user.tag, inline: true },
                            { name: 'Reason (理由)', value: reason }
                        )
                        .setTimestamp()
                        .setFooter({ text: `User ID: ${memberToKick.id}` });
                    logChannel.send({ embeds: [logEmbed] }).catch(console.error);
                }
            }

            // Optionally, DM the kicked user
            try {
                await memberToKick.send(`你已被踢出服务器 **${interaction.guild.name}**.\n理由：${reason}`);
            } catch (dmError) {
                console.warn(`Could not DM ${memberToKick.user.tag} about their kick: ${dmError}`);
            }

        } catch (error) {
            console.error(`Error kicking member ${memberToKick.user.tag}:`, error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: "执行踢出操作时发生错误。(An error occurred while trying to kick the member.)", ephemeral: true });
            } else {
                await interaction.reply({ content: "执行踢出操作时发生错误。(An error occurred while trying to kick the member.)", ephemeral: true });
            }
        }
    }
};