const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    // Define the command's data for Discord's API
    data: new SlashCommandBuilder()
        .setName('daily') // The name of the slash command
        .setDescription('Claims your daily currency.'), // The description of the command

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
            // If the file doesn't exist, it will be created when a user claims their daily reward
        }

        // Get the user's economy data based on their Discord ID
        const user = economy[interaction.user.id];
        // If the user has no economy data, initialize it with a balance of 0 and lastDaily of 0
        if (!user) {
            economy[interaction.user.id] = { balance: 0, lastDaily: 0 };
        }

        // Get the timestamp of the user's last daily claim
        const lastDaily = economy[interaction.user.id].lastDaily;
        const now = Date.now(); // Get the current timestamp
        const diff = now - lastDaily; // Calculate the time difference since the last claim

        // Check if 24 hours (86,400,000 milliseconds) have passed since the last daily claim
        if (diff < 86400000) { 
            // If not enough time has passed, inform the user when they can claim again
            return interaction.reply({
                content: `You have already claimed your daily reward. You can claim it again in ${Math.floor((86400000 - diff) / 3600000)} hours and ${Math.floor(((86400000 - diff) % 3600000) / 60000)} minutes.`, // Time remaining message
                ephemeral: true
            });
        }

        // Add the daily amount (from config) to the user's balance
        economy[interaction.user.id].balance += config.economy.dailyAmount;
        // Update the lastDaily timestamp to the current time
        economy[interaction.user.id].lastDaily = now;

        // Write the updated economy data back to the economy.json file
        fs.writeFileSync(economyPath, JSON.stringify(economy, null, 2), 'utf8');

        // Create an embed message to confirm the daily reward claim
        const embed = new EmbedBuilder()
            .setColor('#00FF00') // Green color for success
            .setTitle('Daily Reward') // Title of the embed
            .setDescription(`You have claimed your daily reward of ${config.economy.dailyAmount} ${config.economy.currencyName}.`) // Description of the reward
            .setTimestamp(); // Add a timestamp to the embed

        // Reply to the interaction with the daily reward embed
        await interaction.reply({ embeds: [embed] });
    },
};