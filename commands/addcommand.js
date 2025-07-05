const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    // Define the command's data for Discord's API
    data: new SlashCommandBuilder()
        .setName('addcommand') // The name of the slash command
        .setDescription('Adds a new custom command.') // The description of the command
        .addStringOption(option =>
            option.setName('name') // Define a string option for the command name
                .setDescription('The name of the custom command (e.g., hello)') // Description for the option
                .setRequired(true)) // Make this option mandatory
        .addStringOption(option =>
            option.setName('response') // Define a string option for the command's response
                .setDescription('The bot\'s response to the custom command') // Description for the option
                .setRequired(true)), // Make this option mandatory

    // The execute function contains the command's logic
    async execute(interaction, config) {
        // Permission Check: User must have ManageGuild permission to use this command
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({
                content: "🚫 Sorry, you don't have permission to manage the server to add custom commands.",
                ephemeral: true // Only visible to the user who ran the command
            });
        }

        // Get the command name and response provided by the user
        const commandName = interaction.options.getString('name').toLowerCase(); // Convert to lowercase for consistency
        const commandResponse = interaction.options.getString('response');

        // Construct the absolute path to the customcommands.json file
        const customCommandsPath = path.join(__dirname, '..', 'customcommands.json');
        let customCommands = []; // Initialize an empty array to hold custom commands

        // Read the existing customcommands.json file
        try {
            const data = fs.readFileSync(customCommandsPath, 'utf8'); // Read file synchronously
            customCommands = JSON.parse(data); // Parse the JSON data into an array
        } catch (readError) {
            // Log an error if the file cannot be read (e.g., it doesn't exist or is malformed)
            console.error('Error reading customcommands.json:', readError);
            // If the file doesn't exist, it will be created when a new command is added
        }

        // Check if a command with the same name already exists
        if (customCommands.some(cmd => cmd.name === commandName)) {
            return interaction.reply({
                content: `名为 \`${commandName}\` 的自定义命令已存在。(A custom command named \`${commandName}\` already exists.)`,
                ephemeral: true
            });
        }

        // Add the new custom command to the array
        customCommands.push({
            name: commandName,
            response: commandResponse,
            addedBy: interaction.user.tag, // Store who added the command
            addedAt: new Date().toISOString() // Store when the command was added
        });

        // Write the updated array back to the customcommands.json file
        fs.writeFileSync(customCommandsPath, JSON.stringify(customCommands, null, 2), 'utf8');

        // Create an embed message to confirm the addition to the user
        const embed = new EmbedBuilder()
            .setColor('#00FF00') // Green color for success
            .setTitle('✅ Custom Command Added')
            .setDescription(`已成功添加自定义命令 \`${commandName}\`。(Custom command \`${commandName}\` successfully added.)`)
            .addFields(
                { name: 'Command Name (命令名称)', value: commandName, inline: true }, // Field for the command name
                { name: 'Response (响应)', value: commandResponse } // Field for the command's response
            )
            .setTimestamp(); // Add a timestamp to the embed

        // Reply to the interaction with the confirmation embed
        await interaction.reply({ embeds: [embed] });

        // Send a log message to the moderation channel if configured
        if (config.MOD_LOG_CHANNEL_ID) {
            // Fetch the moderation log channel using its ID from the config
            const logChannel = interaction.guild.channels.cache.get(config.MOD_LOG_CHANNEL_ID);
            if (logChannel) {
                // Create an embed for the moderation log
                const logEmbed = new EmbedBuilder()
                    .setColor('#00FF00') // Green color
                    .setTitle('➕ Custom Command Added (日志)')
                    .setDescription(`自定义命令 \`${commandName}\` 已添加。`) // Description of the action
                    .addFields(
                        { name: 'Command Name (命令名称)', value: commandName, inline: true },
                        { name: 'Response (响应)', value: commandResponse },
                        { name: 'Added By (添加者)', value: interaction.user.tag }
                    )
                    .setTimestamp(); // Add a timestamp
                // Send the log embed to the moderation channel
                logChannel.send({ embeds: [logEmbed] }).catch(console.error); // Catch any errors during sending
            }
        }
    }
}