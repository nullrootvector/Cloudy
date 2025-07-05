const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database.js');

const COOLDOWN = 86400000; // 24 hours in milliseconds

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claims your daily currency.'),

    async execute(interaction, config) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        const now = Date.now();

        db.get('SELECT * FROM economy WHERE userId = ? AND guildId = ?', [userId, guildId], (err, row) => {
            if (err) {
                console.error('Error fetching daily status:', err);
                return interaction.reply({ content: 'An error occurred while claiming your daily reward.', ephemeral: true });
            }

            if (row) {
                const diff = now - row.lastDaily;
                if (diff < COOLDOWN) {
                    const timeLeft = COOLDOWN - diff;
                    const hours = Math.floor(timeLeft / 3600000);
                    const minutes = Math.floor((timeLeft % 3600000) / 60000);
                    return interaction.reply({
                        content: `You have already claimed your daily reward. You can claim it again in ${hours} hours and ${minutes} minutes.`,
                        ephemeral: true
                    });
                }

                const newBalance = row.balance + config.economy.dailyAmount;
                db.run('UPDATE economy SET balance = ?, lastDaily = ? WHERE userId = ? AND guildId = ?', [newBalance, now, userId, guildId], (updateErr) => {
                    if (updateErr) {
                        console.error('Error updating daily reward:', updateErr);
                        return interaction.reply({ content: 'An error occurred while claiming your daily reward.', ephemeral: true });
                    }
                    replyWithSuccess(interaction, config);
                });

            } else {
                // First time claim
                const dailyAmount = config.economy.dailyAmount;
                db.run('INSERT INTO economy (userId, guildId, balance, lastDaily) VALUES (?, ?, ?, ?)', [userId, guildId, dailyAmount, now], (insertErr) => {
                    if (insertErr) {
                        console.error('Error creating daily entry:', insertErr);
                        return interaction.reply({ content: 'An error occurred while claiming your daily reward.', ephemeral: true });
                    }
                    replyWithSuccess(interaction, config);
                });
            }
        });
    },
};

function replyWithSuccess(interaction, config) {
    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('Daily Reward')
        .setDescription(`You have claimed your daily reward of ${config.economy.dailyAmount} ${config.economy.currencyName}.`)
        .setTimestamp();

    interaction.reply({ embeds: [embed] });
}