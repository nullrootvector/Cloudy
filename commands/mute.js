const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    // Define the command's data for Discord's API
    data: new SlashCommandBuilder()
        .setName('mute') // The name of the slash command
        .setDescription('Mutes a member in the server.') // The description of the command
        .addUserOption(option =>
            option.setName('target') // Define a user option for the member to mute
                .setDescription('The member to mute') // Description for the option
                .setRequired(true)) // Make this option mandatory
        .addIntegerOption(option =>
            option.setName('duration') // Define an integer option for the mute duration
                .setDescription('Duration of the mute in minutes') // Description for the option
                .setRequired(false)) // This option is optional
        .addStringOption(option =>
            option.setName('reason') // Define a string option for the mute reason
                .setDescription('Reason for the mute') // Description for the option
                .setRequired(false)), // This option is optional

    // The execute function contains the command's logic
    async execute(interaction, config) {
        // Get the target member, duration, and reason from the interaction options
        const memberToMute = interaction.options.getMember('target');
        const duration = interaction.options.getInteger('duration'); // Duration in minutes
        const reason = interaction.options.getString('reason') || 'No reason provided'; // Default reason if not specified

        // Permission Check 1: Check if the command issuer has the 'ModerateMembers' permission
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({
                content: "🚫 抱歉，亲爱的，你没有禁言成员的权限。(Sorry, my dear, you don't have permission to mute members.)",
                ephemeral: true
            });
        }

        // Permission Check 2: Check if the bot itself has the 'ModerateMembers' permission
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({
                content: "😥 我没有足够的权限来禁言成员。(I don't have enough permissions to mute members.)",
                ephemeral: true
            });
        }

        // Hierarchy Check: Check if the bot can mute the target member (based on role hierarchy)
        if (!memberToMute.moderatable) {
            return interaction.reply({
                content: "我无法禁言此用户。他们可能有更高的角色，或者我没有足够的权限。(I cannot mute this user. They might have a higher role, or I don't have permission.)",
                ephemeral: true
            });
        }

        // Self-Mute Check: Prevent a user from muting themselves
        if (memberToMute.id === interaction.user.id) {
            return interaction.reply({
                content: "你不能禁言自己，我的朋友！(You can't mute yourself, my friend!)",
                ephemeral: true
            });
        }

        try {
            let muteDurationMs = null; // Initialize mute duration in milliseconds
            if (duration) {
                muteDurationMs = duration * 60 * 1000; // Convert minutes to milliseconds
            }

            // Apply the timeout (mute) to the member
            await memberToMute.timeout(muteDurationMs, reason);

            // Create an embed message to confirm the mute to the user
            const muteEmbed = new EmbedBuilder()
                .setColor('#FFA500') // Orange color for mute
                .setTitle('🔇 Member Muted') // Title of the embed
                .setDescription(`${memberToMute.user.tag} has been muted.`) // Description of the action
                .addFields(
                    { name: 'Muted User (被禁言用户)', value: `${memberToMute.user.tag} (${memberToMute.id})`, inline: true }, // Field for the muted user
                    { name: 'Moderator (管理员)', value: interaction.user.tag, inline: true }, // Field for the moderator who issued the mute
                    { name: 'Reason (理由)', value: reason } // Field for the mute reason
                )
                .setTimestamp() // Add a timestamp to the embed
                .setFooter({ text: `Server: ${interaction.guild.name}` }); // Footer with server name
            
            // Add duration field to the embed if a duration was specified
            if (duration) {
                muteEmbed.addFields({ name: 'Duration (时长)', value: `${duration} minutes`, inline: true });
            }

            // Reply to the interaction with the mute embed
            await interaction.reply({ embeds: [muteEmbed] });
            // Log the mute to the console
            console.log(`${interaction.user.tag} muted ${memberToMute.user.tag} for: ${reason}, duration: ${duration || 'indefinite'} minutes.`);

            // Send a log message to the moderation channel if configured
            if (config.MOD_LOG_CHANNEL_ID) {
                // Fetch the moderation log channel using its ID from the config
                const logChannel = interaction.guild.channels.cache.get(config.MOD_LOG_CHANNEL_ID);
                if (logChannel) {
                    // Create an embed for the moderation log
                    const logEmbed = new EmbedBuilder()
                        .setColor('#FFA500') // Orange color
                        .setTitle('🔇 Member Muted (日志)') // Title of the log embed
                        .setDescription(`${memberToMute.user.tag} has been muted.`) // Description of the action
                        .addFields(
                            { name: 'Muted User (被禁言用户)', value: `${memberToMute.user.tag} (${memberToMute.id})`, inline: true },
                            { name: 'Moderator (管理员)', value: interaction.user.tag, inline: true },
                            { name: 'Reason (理由)', value: reason }
                        )
                        .setTimestamp() // Add a timestamp
                        .setFooter({ text: `User ID: ${memberToMute.id}` }); // Footer with user ID
                    // Add duration field to the log embed if a duration was specified
                    if (duration) {
                        logEmbed.addFields({ name: 'Duration (时长)', value: `${duration} minutes`, inline: true });
                    }
                    // Send the log embed to the moderation channel
                    logChannel.send({ embeds: [logEmbed] }).catch(console.error); // Catch any errors during sending
                }
            }

            // Optionally, try to DM the muted user about their mute
            try {
                await memberToMute.send(`你已被禁言于服务器 **${interaction.guild.name}**.\n理由：${reason}${duration ? `\n时长：${duration}分钟` : ''}`);
            } catch (dmError) {
                // Log a warning if the DM could not be sent (e.g., user has DMs disabled)
                console.warn(`Could not DM ${memberToMute.user.tag} about their mute: ${dmError}`);
            }

        } catch (error) {
            // Catch any errors that occur during the mute process
            console.error(`Error muting member ${memberToMute.user.tag}:`, error);
            // Reply to the interaction with an error message
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: "执行禁言操作时发生错误。(An error occurred while trying to mute the member.)", ephemeral: true });
            } else {
                await interaction.reply({ content: "执行禁言操作时发生错误。(An error occurred while trying to mute the member.)", ephemeral: true });
            }
        }
    },
};