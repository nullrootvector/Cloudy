const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Buys an item from the shop.')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('The item to buy')
                .setRequired(true)),

    async execute(interaction, config) {
        const economyPath = path.join(__dirname, '..', 'economy.json');
        let economy = {};
        try {
            const data = fs.readFileSync(economyPath, 'utf8');
            economy = JSON.parse(data);
        } catch (readError) {
            console.error('Error reading economy.json:', readError);
        }

        const shopPath = path.join(__dirname, '..', 'shop.json');
        let shop = [];
        try {
            const data = fs.readFileSync(shopPath, 'utf8');
            shop = JSON.parse(data);
        } catch (readError) {
            console.error('Error reading shop.json:', readError);
        }

        const item = shop.find(i => i.name.toLowerCase() === interaction.options.getString('item').toLowerCase());
        if (!item) {
            return interaction.reply({
                content: 'That item does not exist.',
                ephemeral: true
            });
        }

        const user = economy[interaction.user.id];
        if (!user || user.balance < item.price) {
            return interaction.reply({
                content: `You do not have enough ${config.economy.currencyName} to buy this item.`,
                ephemeral: true
            });
        }

        economy[interaction.user.id].balance -= item.price;
        fs.writeFileSync(economyPath, JSON.stringify(economy, null, 2), 'utf8');

        const role = await interaction.guild.roles.fetch(item.roleId);
        if (role) {
            await interaction.member.roles.add(role);
        }

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Purchase Successful')
            .setDescription(`You have purchased ${item.name} for ${item.price} ${config.economy.currencyName}.`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};