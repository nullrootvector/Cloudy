const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

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
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('The role to give when the item is purchased')
                .setRequired(true)),

    async execute(interaction, config) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({
                content: 'You do not have permission to use this command.',
                ephemeral: true
            });
        }

        const shopPath = path.join(__dirname, '..', 'shop.json');
        let shop = [];
        try {
            const data = fs.readFileSync(shopPath, 'utf8');
            shop = JSON.parse(data);
        } catch (readError) {
            console.error('Error reading shop.json:', readError);
        }

        const name = interaction.options.getString('name');
        const price = interaction.options.getInteger('price');
        const role = interaction.options.getRole('role');

        shop.push({ name, price, roleId: role.id });
        fs.writeFileSync(shopPath, JSON.stringify(shop, null, 2), 'utf8');

        await interaction.reply({
            content: `Added ${name} to the shop for ${price} ${config.economy.currencyName}.`,
            ephemeral: true
        });
    },
};