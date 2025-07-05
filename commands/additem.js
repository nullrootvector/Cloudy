const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    // Define the command's data for Discord's API
    data: new SlashCommandBuilder()
        .setName('additem') // The name of the slash command
        .setDescription('Adds an item to the shop.') // The description of the command
        .addStringOption(option =>
            option.setName('name') // Define a string option for the item's name
                .setDescription('The name of the item') // Description for the option
                .setRequired(true)) // Make this option mandatory
        .addIntegerOption(option =>
            option.setName('price') // Define an integer option for the item's price
                .setDescription('The price of the item') // Description for the option
                .setRequired(true)), // Make this option mandatory

    // The execute function contains the command's logic
    async execute(interaction, config) {
        // Permission Check: User must have ManageGuild permission to use this command
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({
                content: 'You do not have permission to use this command.', // Error message for insufficient permissions
                ephemeral: true // Only visible to the user who ran the command
            });
        }

        // Construct the absolute path to the shop.json file
        const shopPath = path.join(__dirname, '..', 'shop.json');
        let shop = []; // Initialize an empty array to hold shop items

        // Read the existing shop.json file
        try {
            const data = fs.readFileSync(shopPath, 'utf8'); // Read file synchronously
            shop = JSON.parse(data); // Parse the JSON data into an array
        } catch (readError) {
            // Log an error if the file cannot be read (e.g., it doesn't exist or is malformed)
            console.error('Error reading shop.json:', readError);
            // If the file doesn't exist, it will be created when a new item is added
        }

        // Get the item name, price, and role provided by the user
        const name = interaction.options.getString('name');
        const price = interaction.options.getInteger('price');

        // Add the new item to the shop array
        shop.push({ name, price });
        // Write the updated array back to the shop.json file
        fs.writeFileSync(shopPath, JSON.stringify(shop, null, 2), 'utf8');

        // Reply to the interaction with a confirmation message
        await interaction.reply({
            content: `Added ${name} to the shop for ${price} ${config.economy.currencyName}.`, // Confirmation message
            ephemeral: true
        });
    },
};