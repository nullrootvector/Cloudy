const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    // Define the command's data for Discord's API
    data: new SlashCommandBuilder()
        .setName('giveaway') // The name of the slash command
        .setDescription('Starts a new giveaway.') // The description of the command
        .addStringOption(option =>
            option.setName('duration') // Option for the giveaway duration
                .setDescription('Duration of the giveaway (e.g., 1h, 30m, 1d)') // Description for the option
                .setRequired(true)) // Make this option mandatory
        .addIntegerOption(option =>
            option.setName('winners') // Option for the number of winners
                .setDescription('Number of winners') // Description for the option
                .setRequired(true)) // Make this option mandatory
        .addStringOption(option =>
            option.setName('prize') // Option for the giveaway prize
                .setDescription('The prize for the giveaway') // Description for the option
                .setRequired(true)) // Make this option mandatory
        .addChannelOption(option =>
            option.setName('channel') // Option for the channel to start the giveaway in
                .setDescription('The channel to start the giveaway in (defaults to current channel)') // Description for the option
                .setRequired(false)), // This option is optional

    // The execute function contains the command's logic
    async execute(interaction, config) {
        // Permission Check: User must have ManageGuild permission to use this command
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({
                content: "🚫 Sorry, you don't have permission to manage the server to start a giveaway.",
                ephemeral: true // Only visible to the user who ran the command
            });
        }

        // Get the options provided by the user
        const durationString = interaction.options.getString('duration');
        const winnerCount = interaction.options.getInteger('winners');
        const prize = interaction.options.getString('prize');
        // Determine the giveaway channel: either the one specified or the current channel
        const giveawayChannel = interaction.options.getChannel('channel') || interaction.channel;

        // Parse the duration string (e.g., "1h", "30m", "1d") into milliseconds
        let durationMs = 0;
        const timeRegex = /(\d+)([smhd])/g; // Regex to match numbers followed by s, m, h, or d
        let match;
        while ((match = timeRegex.exec(durationString)) !== null) {
            const value = parseInt(match[1]); // The numeric value
            const unit = match[2]; // The unit (s, m, h, d)
            switch (unit) {
                case 's': durationMs += value * 1000; break; // Seconds to milliseconds
                case 'm': durationMs += value * 60 * 1000; break; // Minutes to milliseconds
                case 'h': durationMs += value * 60 * 60 * 1000; break; // Hours to milliseconds
                case 'd': durationMs += value * 24 * 60 * 60 * 1000; break; // Days to milliseconds
            }
        }

        // If no valid duration was parsed, inform the user
        if (durationMs === 0) {
            return interaction.reply({
                content: '请提供有效的抽奖时长 (例如：1h, 30m, 1d)。(Please provide a valid giveaway duration (e.g., 1h, 30m, 1d).)',
                ephemeral: true
            });
        }

        // Calculate the end time of the giveaway
        const endTime = Date.now() + durationMs;

        // Create an embed message for the giveaway announcement
        const giveawayEmbed = new EmbedBuilder()
            .setColor('#FFD700') // Gold color
            .setTitle(`🎉 GIVEAWAY! 🎉`) // Title of the embed
            .setDescription(`**${prize}**\n\n点击 🎉 表情符号参与！\n(React with 🎉 to enter!)\n\n结束时间：<t:${Math.floor(endTime / 1000)}:R> (相对时间)\n(Ends: <t:${Math.floor(endTime / 1000)}:R> (relative time))\n\n赢家数量：${winnerCount}`) // Description with prize, entry instructions, end time, and winner count
            .setTimestamp(endTime) // Set the timestamp to the giveaway end time
            .setFooter({ text: `由 ${interaction.user.tag} 发起 (Started by ${interaction.user.tag})` }); // Footer showing who started it

        try {
            // Send the giveaway embed to the specified channel
            const message = await giveawayChannel.send({ embeds: [giveawayEmbed] });
            // React to the message with the 🎉 emoji to allow users to enter
            await message.react('🎉');

            // Create a new giveaway object to save its details
            const newGiveaway = {
                messageId: message.id, // ID of the giveaway message
                channelId: giveawayChannel.id, // ID of the channel where the giveaway is
                guildId: interaction.guild.id, // ID of the guild where the giveaway is
                endTime: endTime, // Timestamp when the giveaway ends
                winnerCount: winnerCount, // Number of winners
                prize: prize, // The prize of the giveaway
                hostId: interaction.user.id, // ID of the user who started the giveaway
                status: 'active' // Current status of the giveaway
            };

            // Construct the absolute path to the giveaways.json file
            const giveawaysPath = path.join(__dirname, '..', 'giveaways.json');
            let giveaways = []; // Initialize an empty array to hold giveaway data

            // Read the existing giveaways.json file
            try {
                const data = fs.readFileSync(giveawaysPath, 'utf8'); // Read file synchronously
                giveaways = JSON.parse(data); // Parse the JSON data into an array
            } catch (readError) {
                // Log an error if the file cannot be read
                console.error('Error reading giveaways.json:', readError);
                // If the file doesn't exist, it will be created when a new giveaway is added
            }
            // Add the new giveaway to the array
            giveaways.push(newGiveaway);
            // Write the updated array back to the giveaways.json file
            fs.writeFileSync(giveawaysPath, JSON.stringify(giveaways, null, 2), 'utf8');

            // Reply to the interaction, confirming the giveaway has started
            await interaction.reply({
                content: `抽奖已在 ${giveawayChannel} 中开始！(Giveaway started in ${giveawayChannel}!)`,
                ephemeral: true
            });

        } catch (error) {
            // Catch any errors that occur during the giveaway starting process
            console.error('Error starting giveaway:', error);
            // Reply to the interaction with an error message
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '开始抽奖时发生错误。(An error occurred while starting the giveaway.)', ephemeral: true });
            } else {
                await interaction.reply({ content: '开始抽奖时发生错误。(An error occurred while starting the giveaway.)', ephemeral: true });
            }
        }
    },
};