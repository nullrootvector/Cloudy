const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Flips a coin and you can bet on the outcome.')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('The amount of currency to bet')
                .setRequired(true)
                .setMinValue(1))
        .addStringOption(option =>
            option.setName('choice')
                .setDescription('Your choice: heads or tails')
                .setRequired(true)
                .addChoices(
                    { name: 'Heads', value: 'heads' },
                    { name: 'Tails', value: 'tails' }
                )),

    async execute(interaction, config) {
        const bet = interaction.options.getInteger('bet');
        const choice = interaction.options.getString('choice');
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        db.get('SELECT balance FROM economy WHERE userId = ? AND guildId = ?', [userId, guildId], async (err, row) => {
            if (err) {
                console.error('Error fetching balance for coinflip:', err);
                return interaction.reply({ content: 'An error occurred while fetching your balance.', ephemeral: true });
            }

            const currentBalance = row ? row.balance : 0;

            if (currentBalance < bet) {
                return interaction.reply({ content: `You don't have enough ${config.economy.currencyName} for that bet. Your current balance is ${currentBalance}.`, ephemeral: true });
            }

            const outcome = Math.random() < 0.5 ? 'heads' : 'tails';
            let newBalance = currentBalance;
            let resultMessage;

            if (choice === outcome) {
                newBalance += bet;
                resultMessage = `It's ${outcome}! You won ${bet} ${config.economy.currencyName}!`;
            } else {
                newBalance -= bet;
                resultMessage = `It's ${outcome}! You lost ${bet} ${config.economy.currencyName}.`;
            }

            db.run('UPDATE economy SET balance = ? WHERE userId = ? AND guildId = ?', [newBalance, userId, guildId], (updateErr) => {
                if (updateErr) {
                    console.error('Error updating balance after coinflip:', updateErr);
                    return interaction.reply({ content: 'An error occurred while updating your balance.', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setColor(choice === outcome ? '#00FF00' : '#FF0000')
                    .setTitle('Coinflip Result')
                    .setDescription(resultMessage)
                    .addFields(
                        { name: 'Your Choice', value: choice, inline: true },
                        { name: 'Outcome', value: outcome, inline: true },
                        { name: 'New Balance', value: `${newBalance} ${config.economy.currencyName}` }
                    )
                    .setTimestamp();

                interaction.reply({ embeds: [embed] });
            });
        });
    },
};