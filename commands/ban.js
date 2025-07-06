const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    // Define the command's data for Discord's API
    data: new SlashCommandBuilder()
        .setName('ban') // The name of the slash command
        .setDescription('Bans a member from the server. Requires Ban Members permission.') // The description of the command
        .addUserOption(option =>
            option.setName('target') // Define a user option for the member to ban
                .setDescription('The member to ban') // Description for the option
                .setRequired(true)) // Make this option mandatory
        .addIntegerOption(option =>
            option.setName('days') // Define an integer option for days of messages to delete
                .setDescription('Number of days of messages to delete (0-7)') // Description for the option
                .setRequired(false) // This option is optional
                .setMinValue(0) // Minimum value for days
                .setMaxValue(7)) // Maximum value for days
        .addStringOption(option =>
            option.setName('reason') // Define a string option for the ban reason
                .setDescription('Reason for the ban') // Description for the option
                .setRequired(false)), // This option is optional

    // The execute function contains the command's logic
    async execute(interaction, config) {
        // Get the target member, days to delete messages, and reason from the interaction options
        const memberToBan = interaction.options.getMember('target');
        const daysToDelete = interaction.options.getInteger('days') || 0; // Default to 0 days if not specified
        const reason = interaction.options.getString('reason') || "No reason provided"; // Default reason if not specified

        // Permission Check: Check if the command issuer has the 'BanMembers' permission
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({ content: "🚫 You don't have permission to use this command.", ephemeral: true });
        }

        // Permission Check: Check if the bot itself has the 'BanMembers' permission
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({ content: "😥 I don't have enough permissions to perform this action.", ephemeral: true });
        }

        // Hierarchy Check: Check if the bot can ban the target member (based on role hierarchy)
        if (!memberToBan.bannable) {
            return interaction.reply({ content: "I cannot ban this user. They might have a higher role, or I don't have sufficient permissions.", ephemeral: true });
        }

        // Self-Ban Check: Prevent a user from banning themselves
        if (memberToBan.id === interaction.user.id) {
            return interaction.reply({ content: "You can't ban yourself!", ephemeral: true });
        }

        try {
            // Prepare ban options: days for message deletion (0-7) and the reason
            const banOptions = { days: daysToDelete, reason: reason };
            // Execute the ban operation
            await memberToBan.ban(banOptions);
            
            // Create an embed message to confirm the ban to the user
            const banEmbed = new EmbedBuilder()
                .setColor('#ff0000') // Red color for ban
                .setTitle('🚫 Member Banned') // Title of the embed
                .setDescription(`${memberToBan.user.tag} has been banned from the server.`) // Description of the action
                .addFields(
                    { name: 'Banned User', value: `${memberToBan.user.tag} (${memberToBan.id})`, inline: true }, // Field for the banned user
                    { name: 'Moderator', value: interaction.user.tag, inline: true }, // Field for the moderator who issued the ban
                    { name: 'Messages Deleted', value: `${daysToDelete} days`, inline: true}, // Field for message deletion days
                    { name: 'Reason', value: reason } // Field for the ban reason
                )
                .setTimestamp() // Add a timestamp to the embed
                .setFooter({ text: `Server: ${interaction.guild.name}` }); // Footer with server name

            // Reply to the interaction with the ban embed
            await interaction.reply({ embeds: [banEmbed] });
            // Log the ban to the console
            console.log(`${interaction.user.tag} banned ${memberToBan.user.tag} for: ${reason}, deleting ${daysToDelete} days of messages.`);

            // Send a log message to the moderation channel if configured
            if (config.MOD_LOG_CHANNEL_ID) {
                // Fetch the moderation log channel using its ID from the config
                const logChannel = interaction.guild.channels.cache.get(config.MOD_LOG_CHANNEL_ID);
                if (logChannel) {
                    // Create an embed for the moderation log
                    const logEmbed = new EmbedBuilder()
                        .setColor('#ff0000') // Red color
                        .setTitle('🚫 Member Banned (日志)') // Title of the log embed
                        .setDescription(`${memberToBan.user.tag} has been banned.`) // Description of the action
                        .addFields(
                            { name: 'Banned User (被封禁用户)', value: `${memberToBan.user.tag} (${memberToBan.id})`, inline: true },
                            { name: 'Moderator (管理员)', value: interaction.user.tag, inline: true },
                            { name: 'Messages Deleted (消息删除天数)', value: `${daysToDelete} days`, inline: true },
                            { name: 'Reason (理由)', value: reason }
                        )
                        .setTimestamp() // Add a timestamp
                        .setFooter({ text: `User ID: ${memberToBan.id}` }); // Footer with user ID
                    // Send the log embed to the moderation channel
                    logChannel.send({ embeds: [logEmbed] }).catch(console.error); // Catch any errors during sending
                }
            }

            // Optionally, try to DM the banned user about their ban
            try {
                await memberToBan.send(`你已被封禁于服务器 **${interaction.guild.name}**。\n理由：${reason}\n删除消息天数：${daysToDelete}`);
            } catch (dmError) {
                // Log a warning if the DM could not be sent (e.g., user has DMs disabled)
                console.warn(`Could not DM ${memberToBan.user.tag} about their ban: ${dmError}`);
            }

        } catch (error) {
            // Catch any errors that occur during the ban process
            console.error(`Error banning member ${memberToBan.user.tag}:`, error);
            // Reply to the interaction with an error message
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: "执行封禁操作时发生错误。(An error occurred while trying to ban the member.)", ephemeral: true });
            } else {
                await interaction.reply({ content: "执行封禁操作时发生错误。(An error occurred while trying to ban the member.)", ephemeral: true });
            }
        }
    }
};