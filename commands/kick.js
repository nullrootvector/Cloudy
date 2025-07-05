const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    // Define the command's data for Discord's API
    data: new SlashCommandBuilder()
        .setName('kick') // The name of the slash command
        .setDescription('Kicks a member from the server. Requires Kick Members permission.') // The description of the command
        .addUserOption(option =>
            option.setName('target') // Define a user option for the member to kick
                .setDescription('The member to kick') // Description for the option
                .setRequired(true)) // Make this option mandatory
        .addStringOption(option =>
            option.setName('reason') // Define a string option for the kick reason
                .setDescription('Reason for the kick') // Description for the option
                .setRequired(false)), // This option is optional

    // The execute function contains the command's logic
    async execute(interaction, config) {
        // Get the target member and reason from the interaction options
        const memberToKick = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') || "No reason provided"; // Default reason if not specified

        // Permission Check: Check if the command issuer has the 'KickMembers' permission
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return interaction.reply({ content: "🚫 你没有权限使用此命令，亲爱的。(You don't have permission to use this command, dear.)", ephemeral: true });
        }

        // Permission Check: Check if the bot itself has the 'KickMembers' permission
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return interaction.reply({ content: "😥 我没有足够的权限来执行此操作。(I don't have enough permissions to perform this action.)", ephemeral: true });
        }

        // Hierarchy Check: Check if the bot can kick the target member (based on role hierarchy)
        if (!memberToKick.kickable) {
            return interaction.reply({ content: "我无法踢出此用户。他们可能有更高的角色，或者我没有足够的权限。(I cannot kick this user. They might have a higher role, or I don't have permission.)", ephemeral: true });
        }
        
        // Self-Kick Check: Prevent a user from kicking themselves
        if (memberToKick.id === interaction.user.id) {
            return interaction.reply({ content: "你不能踢自己啦，小傻瓜！(You can't kick yourself, silly!)", ephemeral: true });
        }

        try {
            // Execute the kick operation
            await memberToKick.kick(reason);
            
            // Create an embed message to confirm the kick to the user
            const kickEmbed = new EmbedBuilder()
                .setColor('#ffcc00') // Yellowish color for kick
                .setTitle('👢 Member Kicked') // Title of the embed
                .setDescription(`${memberToKick.user.tag} has been kicked from the server.`) // Description of the action
                .addFields(
                    { name: 'Kicked User (被踢用户)', value: `${memberToKick.user.tag} (${memberToKick.id})`, inline: true }, // Field for the kicked user
                    { name: 'Moderator (管理员)', value: interaction.user.tag, inline: true }, // Field for the moderator who issued the kick
                    { name: 'Reason (理由)', value: reason } // Field for the kick reason
                )
                .setTimestamp() // Add a timestamp to the embed
                .setFooter({ text: `Server: ${interaction.guild.name}` }); // Footer with server name

            // Reply to the interaction with the kick embed
            await interaction.reply({ embeds: [kickEmbed] });
            // Log the kick to the console
            console.log(`${interaction.user.tag} kicked ${memberToKick.user.tag} for: ${reason}`);

            // Send a log message to the moderation channel if configured
            if (config.MOD_LOG_CHANNEL_ID) {
                // Fetch the moderation log channel using its ID from the config
                const logChannel = interaction.guild.channels.cache.get(config.MOD_LOG_CHANNEL_ID);
                if (logChannel) {
                    // Create an embed for the moderation log
                    const logEmbed = new EmbedBuilder()
                        .setColor('#ffcc00') // Yellowish color
                        .setTitle('👢 Member Kicked (日志)') // Title of the log embed
                        .setDescription(`${memberToKick.user.tag} has been kicked.`) // Description of the action
                        .addFields(
                            { name: 'Kicked User (被踢用户)', value: `${memberToKick.user.tag} (${memberToKick.id})`, inline: true },
                            { name: 'Moderator (管理员)', value: interaction.user.tag, inline: true },
                            { name: 'Reason (理由)', value: reason }
                        )
                        .setTimestamp() // Add a timestamp
                        .setFooter({ text: `User ID: ${memberToKick.id}` }); // Footer with user ID
                    // Send the log embed to the moderation channel
                    logChannel.send({ embeds: [logEmbed] }).catch(console.error); // Catch any errors during sending
                }
            }

            // Optionally, try to DM the kicked user about their kick
            try {
                await memberToKick.send(`你已被踢出服务器 **${interaction.guild.name}**.\n理由：${reason}`);
            } catch (dmError) {
                // Log a warning if the DM could not be sent (e.g., user has DMs disabled)
                console.warn(`Could not DM ${memberToKick.user.tag} about their kick: ${dmError}`);
            }

        } catch (error) {
            // Catch any errors that occur during the kick process
            console.error(`Error kicking member ${memberToKick.user.tag}:`, error);
            // Reply to the interaction with an error message
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: "执行踢出操作时发生错误。(An error occurred while trying to kick the member.)", ephemeral: true });
            } else {
                await interaction.reply({ content: "执行踢出操作时发生错误。(An error occurred while trying to kick the member.)", ephemeral: true });
            }
        }
    }
};