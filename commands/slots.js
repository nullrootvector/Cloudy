const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Play the slot machine!')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('The amount of currency to bet')
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction, config) {
        const bet = interaction.options.getInteger('bet');
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        db.get('SELECT balance FROM economy WHERE userId = ? AND guildId = ?', [userId, guildId], async (err, row) => {
            if (err) {
                console.error('Error fetching balance for slots:', err);
                return interaction.reply({ content: 'An error occurred while fetching your balance.', ephemeral: true });
            }

            const currentBalance = row ? row.balance : 0;

            if (currentBalance < bet) {
                return interaction.reply({ content: `You don't have enough ${config.economy.currencyName} for that bet. Your current balance is ${currentBalance}.`, ephemeral: true });
            }

            const symbols = ['🍒', '🍋', '🍊', '🍇', '🔔', '💎'];
            const result = [];
            for (let i = 0; i < 3; i++) {
                result.push(symbols[Math.floor(Math.random() * symbols.length)]);
            }

            const slotDisplay = `[ ${result.join(' | ')} ]`;
            let newBalance = currentBalance;
            let resultMessage;
            let color = '#FF0000'; // Red for loss

            if (result[0] === result[1] && result[1] === result[2]) {
                // Triple match
                newBalance += bet * 10;
                resultMessage = `🎉 ${slotDisplay} 🎉\nJackpot! You won ${bet * 10} ${config.economy.currencyName}!`;
                color = '#00FF00'; // Green for win
            } else if (result[0] === result[1] || result[1] === result[2] || result[0] === result[2]) {
                // Double match
                newBalance += bet * 2;
                resultMessage = `✨ ${slotDisplay} ✨\nDouble match! You won ${bet * 2} ${config.economy.currencyName}!`;
                color = '#FFFF00'; // Yellow for partial win
            } else {
                // No match
                newBalance -= bet;
                resultMessage = `💔 ${slotDisplay} 💔\nNo match. You lost ${bet} ${config.economy.currencyName}.`;
            }

            db.run('UPDATE economy SET balance = ? WHERE userId = ? AND guildId = ?', [newBalance, userId, guildId], (updateErr) => {
                if (updateErr) {
                    console.error('Error updating balance after slots:', updateErr);
                    return interaction.reply({ content: 'An error occurred while updating your balance.', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setColor(color)
                    .setTitle('Slot Machine')
                    .setDescription(resultMessage)
                    .addFields(
                        { name: 'Your Bet', value: `${bet} ${config.economy.currencyName}`, inline: true },
                        { name: 'New Balance', value: `${newBalance} ${config.economy.currencyName}`, inline: true }
                    )
                    .setTimestamp();

                interaction.reply({ embeds: [embed] });
            });
        });
    },
};