const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    // Define the command's data for Discord's API
    data: new SlashCommandBuilder()
        .setName('balance') // The name of the slash command
        .setDescription('Checks your current balance.'), // The description of the command

    // The execute function contains the command's logic
    async execute(interaction, config) {
        // Construct the absolute path to the economy.json file
        const economyPath = path.join(__dirname, '..', 'economy.json');
        let economy = {}; // Initialize an empty object to hold economy data

        // Read the existing economy.json file
        try {
            const data = fs.readFileSync(economyPath, 'utf8'); // Read file synchronously
            economy = JSON.parse(data); // Parse the JSON data into an object
        } catch (readError) {
            // Log an error if the file cannot be read (e.g., it doesn't exist or is malformed)
            console.error('Error reading economy.json:', readError);
            // If the file doesn't exist, it will be created when a user gains currency
        }

        // Get the user's economy data based on their Discord ID
        const user = economy[interaction.user.id];

        // If the user has no economy data, inform them to start earning
        if (!user) {
            return interaction.reply({
                content: `You don\'t have an account yet. Send some messages to get started!`, // Message for new users
                ephemeral: true // Only visible to the user who ran the command
            });
        }

        // Create an embed message to display the user's balance
        const embed = new EmbedBuilder()
            .setColor('#00FF00') // Green color
            .setTitle(`${interaction.user.username}\'s Balance`) // Title showing the user's name
            .setDescription(`You have ${user.balance} ${config.economy.currencyName}.`) // Description showing the balance and currency name
            .setTimestamp(); // Add a timestamp to the embed

        // Reply to the interaction with the balance embed
        await interaction.reply({ embeds: [embed] });
    },
}