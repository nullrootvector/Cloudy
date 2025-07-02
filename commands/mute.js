const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mutes a member in the server.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to mute')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Duration of the mute in minutes')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the mute')
                .setRequired(false)),

    async execute(interaction, config) {
        const memberToMute = interaction.options.getMember('target');
        const duration = interaction.options.getInteger('duration'); // in minutes
        const reason = interaction.options.getString('reason') || '没有提供理由 (No reason provided)';

        // Permission Check 1: User must have ModerateMembers permission
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({
                content: "🚫 抱歉，亲爱的，你没有禁言成员的权限。(Sorry, my dear, you don't have permission to mute members.)",
                ephemeral: true
            });
        }

        // Permission Check 2: Bot must have ModerateMembers permission
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({
                content: "😥 我没有足够的权限来禁言成员。(I don't have enough permissions to mute members.)",
                ephemeral: true
            });
        }

        // Check if the bot can mute the member (role hierarchy)
        if (!memberToMute.moderatable) {
            return interaction.reply({
                content: "我无法禁言此用户。他们可能有更高的角色，或者我没有足够的权限。(I cannot mute this user. They might have a higher role, or I don't have permission.)",
                ephemeral: true
            });
        }

        // Check if the command issuer is trying to mute themselves
        if (memberToMute.id === interaction.user.id) {
            return interaction.reply({
                content: "你不能禁言自己，我的朋友！(You can't mute yourself, my friend!)",
                ephemeral: true
            });
        }

        try {
            let muteDurationMs = null;
            if (duration) {
                muteDurationMs = duration * 60 * 1000; // Convert minutes to milliseconds
            }

            await memberToMute.timeout(muteDurationMs, reason);

            const muteEmbed = new EmbedBuilder()
                .setColor('#FFA500') // Orange for mute
                .setTitle('🔇 Member Muted')
                .setDescription(`${memberToMute.user.tag} has been muted.`)
                .addFields(
                    { name: 'Muted User (被禁言用户)', value: `${memberToMute.user.tag} (${memberToMute.id})`, inline: true },
                    { name: 'Moderator (管理员)', value: interaction.user.tag, inline: true },
                    { name: 'Reason (理由)', value: reason }
                )
                .setTimestamp()
                .setFooter({ text: `Server: ${interaction.guild.name}` });
            
            if (duration) {
                muteEmbed.addFields({ name: 'Duration (时长)', value: `${duration} minutes`, inline: true });
            }

            await interaction.reply({ embeds: [muteEmbed] });
            console.log(`${interaction.user.tag} muted ${memberToMute.user.tag} for: ${reason}, duration: ${duration || 'indefinite'} minutes.`);

            // Send log to moderation channel
            if (config.MOD_LOG_CHANNEL_ID) {
                const logChannel = interaction.guild.channels.cache.get(config.MOD_LOG_CHANNEL_ID);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#FFA500')
                        .setTitle('🔇 Member Muted (日志)')
                        .setDescription(`${memberToMute.user.tag} has been muted.`)
                        .addFields(
                            { name: 'Muted User (被禁言用户)', value: `${memberToMute.user.tag} (${memberToMute.id})`, inline: true },
                            { name: 'Moderator (管理员)', value: interaction.user.tag, inline: true },
                            { name: 'Reason (理由)', value: reason }
                        )
                        .setTimestamp()
                        .setFooter({ text: `User ID: ${memberToMute.id}` });
                    if (duration) {
                        logEmbed.addFields({ name: 'Duration (时长)', value: `${duration} minutes`, inline: true });
                    }
                    logChannel.send({ embeds: [logEmbed] }).catch(console.error);
                }
            }

            // Optionally, DM the muted user
            try {
                await memberToMute.send(`你已被禁言于服务器 **${interaction.guild.name}**。\n理由：${reason}${duration ? `\n时长：${duration}分钟` : ''}`);
            } catch (dmError) {
                console.warn(`Could not DM ${memberToMute.user.tag} about their mute: ${dmError}`);
            }

        } catch (error) {
            console.error(`Error muting member ${memberToMute.user.tag}:`, error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: "执行禁言操作时发生错误。(An error occurred while trying to mute the member.)", ephemeral: true });
            } else {
                await interaction.reply({ content: "执行禁言操作时发生错误。(An error occurred while trying to mute the member.)", ephemeral: true });
            }
        }
    },
};