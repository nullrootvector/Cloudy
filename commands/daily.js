const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claims your daily currency.'),

    async execute(interaction, config) {
        const economyPath = path.join(__dirname, '..', 'economy.json');
        let economy = {};
        try {
            const data = fs.readFileSync(economyPath, 'utf8');
            economy = JSON.parse(data);
        } catch (readError) {
            console.error('Error reading economy.json:', readError);
        }

        const user = economy[interaction.user.id];
        if (!user) {
            economy[interaction.user.id] = { balance: 0, lastDaily: 0 };
        }

        const lastDaily = economy[interaction.user.id].lastDaily;
        const now = Date.now();
        const diff = now - lastDaily;
        if (diff < 86400000) { // 24 hours
            return interaction.reply({
                content: `You have already claimed your daily reward. You can claim it again in ${Math.floor((86400000 - diff) / 3600000)} hours and ${Math.floor(((86400000 - diff) % 3600000) / 60000)} minutes.`,
                ephemeral: true
            });
        }

        economy[interaction.user.id].balance += config.economy.dailyAmount;
        economy[interaction.user.id].lastDaily = now;

        fs.writeFileSync(economyPath, JSON.stringify(economy, null, 2), 'utf8');

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Daily Reward')
            .setDescription(`You have claimed your daily reward of ${config.economy.dailyAmount} ${config.economy.currencyName}.`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};