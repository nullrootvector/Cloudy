const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    // Define the command's data for Discord's API
    data: new SlashCommandBuilder()
        .setName('close') // The name of the slash command
        .setDescription('Closes the current support ticket.') // The description of the command
        .addStringOption(option =>
            option.setName('reason') // Define a string option for the reason of closing
                .setDescription('Reason for closing the ticket') // Description for the option
                .setRequired(false)), // This option is optional

    // The execute function contains the command's logic
    async execute(interaction, config) {
        // Get the reason for closing the ticket, defaulting if not provided
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const guild = interaction.guild; // Get the guild (server) where the command was used
        const channel = interaction.channel; // Get the channel where the command was used
        const user = interaction.user; // Get the user who ran the command

        // Construct the absolute path to the tickets.json file
        const ticketsPath = path.join(__dirname, '..', 'tickets.json');
        let tickets = []; // Initialize an empty array to hold ticket data

        // Read the existing tickets.json file
        try {
            const data = fs.readFileSync(ticketsPath, 'utf8'); // Read file synchronously
            tickets = JSON.parse(data); // Parse the JSON data into an array
        } catch (readError) {
            // Log an error if the file cannot be read
            console.error('Error reading tickets.json:', readError);
            return interaction.reply({
                content: 'Could not read ticket data.', // Error message for the user
                ephemeral: true
            });
        }

        // Find the ticket associated with the current channel that is still open
        const ticket = tickets.find(t => t.channelId === channel.id && t.status === 'open');

        // If no open ticket is found for this channel, inform the user
        if (!ticket) {
            return interaction.reply({
                content: 'This is not an open ticket channel.',
                ephemeral: true
            });
        }

        // Permission Check: Determine if the user is a moderator or the ticket creator
        const isModerator = interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels); // Check for ManageChannels permission
        const isTicketCreator = ticket.userId === user.id; // Check if the user is the one who created the ticket

        // If the user is neither a moderator nor the ticket creator, deny permission
        if (!isModerator && !isTicketCreator) {
            return interaction.reply({
                content: 'You do not have permission to close this ticket.',
                ephemeral: true
            });
        }

        try {
            // Update the ticket status to 'closed' and record closing details
            ticket.status = 'closed';
            ticket.closedAt = new Date().toISOString(); // Record the closing timestamp
            ticket.closedBy = user.tag; // Record who closed the ticket
            // Write the updated ticket data back to the tickets.json file
            fs.writeFileSync(ticketsPath, JSON.stringify(tickets, null, 2), 'utf8');

            // Create an embed message to announce the ticket closure in the channel
            const closeEmbed = new EmbedBuilder()
                .setColor('#FF0000') // Red color for closure
                .setTitle('Ticket Closed') // Title of the embed
                .setDescription(`此工单已关闭.\n(This ticket has been closed.)`) // Description of the action
                .addFields(
                    { name: 'Closed By (关闭者)', value: user.tag, inline: true }, // Field for who closed it
                    { name: 'Reason (理由)', value: reason, inline: true } // Field for the reason
                )
                .setTimestamp(); // Add a timestamp

            // Send the closure announcement embed to the ticket channel
            await channel.send({ embeds: [closeEmbed] });

            // Send a log message to the moderation channel if configured
            if (config.MOD_LOG_CHANNEL_ID) {
                // Fetch the moderation log channel using its ID from the config
                const logChannel = guild.channels.cache.get(config.MOD_LOG_CHANNEL_ID);
                if (logChannel) {
                    // Create an embed for the moderation log
                    const logEmbed = new EmbedBuilder()
                        .setColor('#FF0000') // Red color
                        .setTitle('Ticket Closed (日志)') // Title of the log embed
                        .setDescription(`工单 ${channel.name} 已关闭。`) // Description of the action
                        .addFields(
                            { name: 'Ticket ID (工单ID)', value: ticket.ticketId, inline: true }, // Field for ticket ID
                            { name: 'Closed By (关闭者)', value: user.tag, inline: true }, // Field for who closed it
                            { name: 'Reason (理由)', value: reason } // Field for the reason
                        )
                        .setTimestamp(); // Add a timestamp
                    // Send the log embed to the moderation channel
                    logChannel.send({ embeds: [logEmbed] }).catch(console.error); // Catch any errors during sending
                }
            }

            // Delete the ticket channel after a short delay
            setTimeout(async () => {
                await channel.delete('Ticket closed').catch(console.error); // Delete the channel, catching any errors
            }, 5000); // Delete after 5 seconds

            // Reply to the interaction confirming the closure and impending deletion
            await interaction.reply({ content: '工单已关闭，频道将在5秒后删除。(Ticket closed, channel will be deleted in 5 seconds.)', ephemeral: true });

        } catch (error) {
            // Catch any errors that occur during the ticket closing process
            console.error('Error closing ticket:', error);
            // Reply to the interaction with an error message
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '关闭工单时发生错误。(An error occurred while closing the ticket.)', ephemeral: true });
            } else {
                await interaction.reply({ content: '关闭工单时发生错误。(An error occurred while closing the ticket.)', ephemeral: true });
            }
        }
    },
};