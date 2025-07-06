const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dice')
        .setDescription('Rolls a dice and you can bet on the outcome.')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('The amount of currency to bet')
                .setRequired(true)
                .setMinValue(1))
        .addIntegerOption(option =>
            option.setName('guess')
                .setDescription('Your guess (1-6)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(6)),

    async execute(interaction, config) {
        const bet = interaction.options.getInteger('bet');
        const guess = interaction.options.getInteger('guess');
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        db.get('SELECT balance FROM economy WHERE userId = ? AND guildId = ?', [userId, guildId], async (err, row) => {
            if (err) {
                console.error('Error fetching balance for dice roll:', err);
                return interaction.reply({ content: 'An error occurred while fetching your balance.', ephemeral: true });
            }

            const currentBalance = row ? row.balance : 0;

            if (currentBalance < bet) {
                return interaction.reply({ content: `You don't have enough ${config.economy.currencyName} for that bet. Your current balance is ${currentBalance}.`, ephemeral: true });
            }

            const outcome = Math.floor(Math.random() * 6) + 1; // Random number between 1 and 6
            let newBalance = currentBalance;
            let resultMessage;

            if (guess === outcome) {
                newBalance += bet * 5; // Win 5 times the bet
                resultMessage = `It's ${outcome}! You won ${bet * 5} ${config.economy.currencyName}!`;
            } else {
                newBalance -= bet;
                resultMessage = `It's ${outcome}! You lost ${bet} ${config.economy.currencyName}.`;
            }

            db.run('UPDATE economy SET balance = ? WHERE userId = ? AND guildId = ?', [newBalance, userId, guildId], (updateErr) => {
                if (updateErr) {
                    console.error('Error updating balance after dice roll:', updateErr);
                    return interaction.reply({ content: 'An error occurred while updating your balance.', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setColor(guess === outcome ? '#00FF00' : '#FF0000')
                    .setTitle('Dice Roll Result')
                    .setDescription(resultMessage)
                    .addFields(
                        { name: 'Your Guess', value: guess.toString(), inline: true },
                        { name: 'Outcome', value: outcome.toString(), inline: true },
                        { name: 'New Balance', value: `${newBalance} ${config.economy.currencyName}` }
                    )
                    .setTimestamp();

                interaction.reply({ embeds: [embed] });
            });
        });
    },
};