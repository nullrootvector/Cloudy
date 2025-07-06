const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database.js');

const COOLDOWN = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
const MIN_WORK_AMOUNT = 50;
const MAX_WORK_AMOUNT = 200;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Works to earn some currency.'),

    async execute(interaction, config) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        const now = Date.now();

        db.get('SELECT * FROM economy WHERE userId = ? AND guildId = ?', [userId, guildId], (err, row) => {
            if (err) {
                console.error('Error fetching work status:', err);
                return interaction.reply({ content: 'An error occurred while trying to work.', ephemeral: true });
            }

            if (row) {
                const diff = now - (row.lastWork || 0); // Use 0 if lastWork is null
                if (diff < COOLDOWN) {
                    const timeLeft = COOLDOWN - diff;
                    const hours = Math.floor(timeLeft / 3600000);
                    const minutes = Math.floor((timeLeft % 3600000) / 60000);
                    return interaction.reply({
                        content: `You are tired from working. You can work again in ${hours} hours and ${minutes} minutes.`,
                        ephemeral: true
                    });
                }

                const workAmount = Math.floor(Math.random() * (MAX_WORK_AMOUNT - MIN_WORK_AMOUNT + 1)) + MIN_WORK_AMOUNT;
                const newBalance = row.balance + workAmount;
                db.run('UPDATE economy SET balance = ?, lastWork = ? WHERE userId = ? AND guildId = ?', [newBalance, now, userId, guildId], (updateErr) => {
                    if (updateErr) {
                        console.error('Error updating work reward:', updateErr);
                        return interaction.reply({ content: 'An error occurred while trying to work.', ephemeral: true });
                    }
                    replyWithSuccess(interaction, config, workAmount);
                });

            } else {
                // First time working
                const workAmount = Math.floor(Math.random() * (MAX_WORK_AMOUNT - MIN_WORK_AMOUNT + 1)) + MIN_WORK_AMOUNT;
                db.run('INSERT INTO economy (userId, guildId, balance, lastWork) VALUES (?, ?, ?, ?)', [userId, guildId, workAmount, now], (insertErr) => {
                    if (insertErr) {
                        console.error('Error creating economy entry for work:', insertErr);
                        return interaction.reply({ content: 'An error occurred while trying to work.', ephemeral: true });
                    }
                    replyWithSuccess(interaction, config, workAmount);
                });
            }
        });
    },
};

function replyWithSuccess(interaction, config, amount) {
    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('Work Done!')
        .setDescription(`You worked hard and earned ${amount} ${config.economy.currencyName}!`)
        .setTimestamp();

    interaction.reply({ embeds: [embed] });
}