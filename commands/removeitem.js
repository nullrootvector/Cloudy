const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removeitem')
        .setDescription('Removes an item from the shop.')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The name of the item to remove')
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
        const newShop = shop.filter(item => item.name.toLowerCase() !== name.toLowerCase());

        if (newShop.length === shop.length) {
            return interaction.reply({
                content: 'That item does not exist in the shop.',
                ephemeral: true
            });
        }

        fs.writeFileSync(shopPath, JSON.stringify(newShop, null, 2), 'utf8');

        await interaction.reply({
            content: `Removed ${name} from the shop.`,
            ephemeral: true
        });
    },
};