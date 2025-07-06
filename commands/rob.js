const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database.js');

const COOLDOWN = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
const ROB_SUCCESS_CHANCE = 0.4; // 40% chance of success
const ROB_PERCENTAGE = 0.10; // Steal 10% of target's balance on success
const FINE_PERCENTAGE = 0.05; // Pay 5% of robber's balance on failure
const MIN_ROB_AMOUNT = 100; // Minimum amount to be stolen
const MAX_ROB_AMOUNT = 1000; // Maximum amount to be stolen

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rob')
        .setDescription('Attempts to rob another user.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user you want to rob')
                .setRequired(true)),

    async execute(interaction, config) {
        const robberId = interaction.user.id;
        const targetUser = interaction.options.getUser('target');
        const targetId = targetUser.id;
        const guildId = interaction.guild.id;
        const now = Date.now();

        if (robberId === targetId) {
            return interaction.reply({ content: 'You cannot rob yourself, silly!', ephemeral: true });
        }
        if (targetUser.bot) {
            return interaction.reply({ content: 'You cannot rob a bot!', ephemeral: true });
        }

        db.get('SELECT * FROM economy WHERE userId = ? AND guildId = ?', [robberId, guildId], (err, robberRow) => {
            if (err) {
                console.error('Error fetching robber status:', err);
                return interaction.reply({ content: 'An error occurred while trying to rob.', ephemeral: true });
            }

            if (robberRow) {
                const diff = now - (robberRow.lastRob || 0); // Use 0 if lastRob is null
                if (diff < COOLDOWN) {
                    const timeLeft = COOLDOWN - diff;
                    const hours = Math.floor(timeLeft / 3600000);
                    const minutes = Math.floor((timeLeft % 3600000) / 60000);
                    return interaction.reply({
                        content: `You need to wait before your next robbery attempt. You can rob again in ${hours} hours and ${minutes} minutes.`,
                        ephemeral: true
                    });
                }
            }

            db.get('SELECT * FROM economy WHERE userId = ? AND guildId = ?', [targetId, guildId], (err, targetRow) => {
                if (err) {
                    console.error('Error fetching target status:', err);
                    return interaction.reply({ content: 'An error occurred while trying to rob.', ephemeral: true });
                }

                if (!targetRow || targetRow.balance < MIN_ROB_AMOUNT) {
                    return interaction.reply({ content: `${targetUser.username} doesn't have enough money to rob (needs at least ${MIN_ROB_AMOUNT} ${config.economy.currencyName}).`, ephemeral: true });
                }

                let robberNewBalance;
                let targetNewBalance;
                let embed;

                if (Math.random() < ROB_SUCCESS_CHANCE) {
                    // Success
                    const stolenAmount = Math.min(MAX_ROB_AMOUNT, Math.floor(targetRow.balance * ROB_PERCENTAGE));
                    robberNewBalance = (robberRow ? robberRow.balance : 0) + stolenAmount;
                    targetNewBalance = targetRow.balance - stolenAmount;

                    embed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('Robbery Successful!')
                        .setDescription(`You successfully robbed ${targetUser.username} and got ${stolenAmount} ${config.economy.currencyName}!`)
                        .setTimestamp();

                    // Update target's balance
                    db.run('UPDATE economy SET balance = ? WHERE userId = ? AND guildId = ?', [targetNewBalance, targetId, guildId], (updateErr) => {
                        if (updateErr) console.error('Error updating target balance after rob:', updateErr);
                    });

                } else {
                    // Failure
                    const fineAmount = Math.floor((robberRow ? robberRow.balance : 0) * FINE_PERCENTAGE);
                    robberNewBalance = Math.max(0, (robberRow ? robberRow.balance : 0) - fineAmount);

                    embed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('Robbery Failed!')
                        .setDescription(`You failed to rob ${targetUser.username} and were fined ${fineAmount} ${config.economy.currencyName}.`)
                        .setTimestamp();
                }

                // Update robber's balance and lastRob timestamp
                if (robberRow) {
                    db.run('UPDATE economy SET balance = ?, lastRob = ? WHERE userId = ? AND guildId = ?', [robberNewBalance, now, robberId, guildId], (updateErr) => {
                        if (updateErr) console.error('Error updating robber balance after rob:', updateErr);
                        interaction.reply({ embeds: [embed] });
                    });
                } else {
                    db.run('INSERT INTO economy (userId, guildId, balance, lastRob) VALUES (?, ?, ?, ?)', [robberId, guildId, robberNewBalance, now], (insertErr) => {
                        if (insertErr) console.error('Error inserting robber economy after rob:', insertErr);
                        interaction.reply({ embeds: [embed] });
                    });
                }
            });
        });
    },
};