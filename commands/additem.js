const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('additem')
        .setDescription('Adds an item to the shop.')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The name of the item')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('price')
                .setDescription('The price of the item')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('The description of the item')
                .setRequired(false)),

    async execute(interaction, config) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({
                content: 'You do not have permission to use this command.',
                ephemeral: true
            });
        }

        const name = interaction.options.getString('name');
        const price = interaction.options.getInteger('price');
        const description = interaction.options.getString('description') || null;
        const guildId = interaction.guild.id;

        db.run('INSERT INTO shop_items (guildId, name, price, description) VALUES (?, ?, ?, ?)', [guildId, name, price, description], (err) => {
            if (err) {
                console.error('Error adding item to shop:', err);
                return interaction.reply({ content: 'An error occurred while adding the item to the shop.', ephemeral: true });
            }

            interaction.reply({
                content: `Added ${name} to the shop for ${price} ${config.economy.currencyName}.`,
                ephemeral: true
            });
        });
    },
};