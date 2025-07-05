const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    // Define the command's data for Discord's API
    data: new SlashCommandBuilder()
        .setName('addbadword') // The name of the slash command
        .setDescription('Adds a word to the bad word filter.') // The description of the command
        .addStringOption(option =>
            option.setName('word') // Define a string option named 'word'
                .setDescription('The word to add to the filter') // Description for the option
                .setRequired(true)), // Make this option mandatory

    // The execute function contains the command's logic
    async execute(interaction, config) {
        // Permission Check: User must have ManageGuild permission to use this command
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({
                content: "🚫 Sorry, you don't have permission to manage the server to add forbidden words.",
                ephemeral: true // Only visible to the user who ran the command
            });
        }

        // Get the word provided by the user and convert it to lowercase for case-insensitive comparison
        const wordToAdd = interaction.options.getString('word').toLowerCase();

        // Construct the absolute path to the badwords.json file
        // '..' goes up one directory from the current commands/ directory
        const badwordsPath = path.join(__dirname, '..', 'badwords.json');
        let badwords = []; // Initialize an empty array to hold the bad words

        // Read the existing badwords.json file
        try {
            const data = fs.readFileSync(badwordsPath, 'utf8'); // Read file synchronously
            badwords = JSON.parse(data); // Parse the JSON data into an array
        } catch (readError) {
            // Log an error if the file cannot be read (e.g., it doesn't exist or is malformed)
            console.error('Error reading badwords.json:', readError);
            // If the file doesn't exist, it will be created when a new word is added
        }

        // Check if the word already exists in the bad words list
        if (badwords.includes(wordToAdd)) {
            return interaction.reply({
                content: `\`${wordToAdd}\` 已经在违禁词列表中了。( \`${wordToAdd}\` is already in the forbidden word list.)`,
                ephemeral: true
            });
        }

        // Add the new word to the bad words array
        badwords.push(wordToAdd);
        // Write the updated array back to the badwords.json file
        // JSON.stringify(badwords, null, 2) formats the JSON with 2-space indentation for readability
        fs.writeFileSync(badwordsPath, JSON.stringify(badwords, null, 2), 'utf8');

        // Create an embed message to confirm the addition to the user
        const embed = new EmbedBuilder()
            .setColor('#00FF00') // Green color for success
            .setTitle('✅ Bad Word Added')
            .setDescription(`已成功添加 \`${wordToAdd}\` 到违禁词列表。(Successfully added \`${wordToAdd}\` to the forbidden word list.)`)
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
                    .setTitle('➕ Bad Word Added (日志)')
                    .setDescription(`违禁词 \`${wordToAdd}\` 已添加。`) // Description of the action
                    .addFields(
                        { name: 'Word (词语)', value: wordToAdd, inline: true }, // Field for the added word
                        { name: 'Added By (添加者)', value: interaction.user.tag } // Field for who added it
                    )
                    .setTimestamp(); // Add a timestamp
                // Send the log embed to the moderation channel
                logChannel.send({ embeds: [logEmbed] }).catch(console.error); // Catch any errors during sending
            }
        }
    },
};