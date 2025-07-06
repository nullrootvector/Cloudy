const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('Transfers currency to another user.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to pay')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of currency to transfer')
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction, config) {
        const targetUser = interaction.options.getUser('target');
        const amount = interaction.options.getInteger('amount');
        const senderId = interaction.user.id;
        const receiverId = targetUser.id;
        const guildId = interaction.guild.id;

        if (senderId === receiverId) {
            return interaction.reply({ content: 'You cannot pay yourself!', ephemeral: true });
        }

        db.get('SELECT balance FROM economy WHERE userId = ? AND guildId = ?', [senderId, guildId], async (err, senderRow) => {
            if (err) {
                console.error('Error fetching sender balance:', err);
                return interaction.reply({ content: 'An error occurred while processing your transfer.', ephemeral: true });
            }

            const senderBalance = senderRow ? senderRow.balance : 0;

            if (senderBalance < amount) {
                return interaction.reply({ content: `You don't have enough ${config.economy.currencyName} to transfer. Your current balance is ${senderBalance}.`, ephemeral: true });
            }

            // Deduct from sender
            const newSenderBalance = senderBalance - amount;
            db.run('UPDATE economy SET balance = ? WHERE userId = ? AND guildId = ?', [newSenderBalance, senderId, guildId], (updateErr) => {
                if (updateErr) {
                    console.error('Error updating sender balance:', updateErr);
                    return interaction.reply({ content: 'An error occurred while processing your transfer.', ephemeral: true });
                }

                // Add to receiver
                db.get('SELECT balance FROM economy WHERE userId = ? AND guildId = ?', [receiverId, guildId], (err, receiverRow) => {
                    if (err) {
                        console.error('Error fetching receiver balance:', err);
                        return interaction.reply({ content: 'An error occurred while processing your transfer.', ephemeral: true });
                    }

                    const receiverBalance = receiverRow ? receiverRow.balance : 0;
                    const newReceiverBalance = receiverBalance + amount;

                    if (receiverRow) {
                        db.run('UPDATE economy SET balance = ? WHERE userId = ? AND guildId = ?', [newReceiverBalance, receiverId, guildId], (updateErr) => {
                            if (updateErr) {
                                console.error('Error updating receiver balance:', updateErr);
                                return interaction.reply({ content: 'An error occurred while processing your transfer.', ephemeral: true });
                            }
                            sendSuccessEmbed(interaction, targetUser, amount, newSenderBalance, config);
                        });
                    } else {
                        db.run('INSERT INTO economy (userId, guildId, balance) VALUES (?, ?, ?)', [receiverId, guildId, newReceiverBalance], (insertErr) => {
                            if (insertErr) {
                                console.error('Error inserting receiver balance:', insertErr);
                                return interaction.reply({ content: 'An error occurred while processing your transfer.', ephemeral: true });
                            }
                            sendSuccessEmbed(interaction, targetUser, amount, newSenderBalance, config);
                        });
                    }
                });
            });
        });
    },
};

function sendSuccessEmbed(interaction, targetUser, amount, newSenderBalance, config) {
    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('Currency Transfer Successful!')
        .setDescription(`You have successfully transferred ${amount} ${config.economy.currencyName} to ${targetUser.tag}.`)
        .addFields(
            { name: 'Your New Balance', value: `${newSenderBalance} ${config.economy.currencyName}` }
        )
        .setTimestamp();

    interaction.reply({ embeds: [embed] });
}