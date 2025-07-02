const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Displays the shop.'),

    async execute(interaction, config) {
        const shopPath = path.join(__dirname, '..', 'shop.json');
        let shop = [];
        try {
            const data = fs.readFileSync(shopPath, 'utf8');
            shop = JSON.parse(data);
        } catch (readError) {
            console.error('Error reading shop.json:', readError);
        }

        if (shop.length === 0) {
            return interaction.reply({
                content: 'The shop is empty.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Shop');

        for (const item of shop) {
            embed.addFields({ name: item.name, value: `${item.price} ${config.economy.currencyName}` });
        }

        await interaction.reply({ embeds: [embed] });
    },
};