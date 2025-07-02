const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Checks your current balance.'),

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
            return interaction.reply({
                content: `You don\'t have an account yet. Send some messages to get started!`,
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle(`${interaction.user.username}\'s Balance`)
            .setDescription(`You have ${user.balance} ${config.economy.currencyName}.`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
}