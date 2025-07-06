const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database.js');

const COOLDOWN = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
const MIN_CRIME_SUCCESS_AMOUNT = 200;
const MAX_CRIME_SUCCESS_AMOUNT = 1000;
const MIN_CRIME_FAIL_AMOUNT = 50;
const MAX_CRIME_FAIL_AMOUNT = 250;
const SUCCESS_CHANCE = 0.6; // 60% chance of success

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crime')
        .setDescription('Attempts a crime for a chance at big money, or a big fine.'),

    async execute(interaction, config) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        const now = Date.now();

        db.get('SELECT * FROM economy WHERE userId = ? AND guildId = ?', [userId, guildId], (err, row) => {
            if (err) {
                console.error('Error fetching crime status:', err);
                return interaction.reply({ content: 'An error occurred while trying to commit a crime.', ephemeral: true });
            }

            if (row) {
                const diff = now - (row.lastCrime || 0); // Use 0 if lastCrime is null
                if (diff < COOLDOWN) {
                    const timeLeft = COOLDOWN - diff;
                    const hours = Math.floor(timeLeft / 3600000);
                    const minutes = Math.floor((timeLeft % 3600000) / 60000);
                    return interaction.reply({
                        content: `You need to lay low for a while. You can commit another crime in ${hours} hours and ${minutes} minutes.`,
                        ephemeral: true
                    });
                }

                let newBalance;
                let embed;

                if (Math.random() < SUCCESS_CHANCE) {
                    // Success
                    const crimeAmount = Math.floor(Math.random() * (MAX_CRIME_SUCCESS_AMOUNT - MIN_CRIME_SUCCESS_AMOUNT + 1)) + MIN_CRIME_SUCCESS_AMOUNT;
                    newBalance = row.balance + crimeAmount;
                    embed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('Crime Successful!')
                        .setDescription(`You successfully pulled off a crime and earned ${crimeAmount} ${config.economy.currencyName}!`)
                        .setTimestamp();
                } else {
                    // Failure
                    const fineAmount = Math.floor(Math.random() * (MAX_CRIME_FAIL_AMOUNT - MIN_CRIME_FAIL_AMOUNT + 1)) + MIN_CRIME_FAIL_AMOUNT;
                    newBalance = Math.max(0, row.balance - fineAmount); // Ensure balance doesn't go below 0
                    embed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('Crime Failed!')
                        .setDescription(`You were caught and fined ${fineAmount} ${config.economy.currencyName}. Better luck next time!`)
                        .setTimestamp();
                }

                db.run('UPDATE economy SET balance = ?, lastCrime = ? WHERE userId = ? AND guildId = ?', [newBalance, now, userId, guildId], (updateErr) => {
                    if (updateErr) {
                        console.error('Error updating crime reward/fine:', updateErr);
                        return interaction.reply({ content: 'An error occurred while trying to commit a crime.', ephemeral: true });
                    }
                    interaction.reply({ embeds: [embed] });
                });

            } else {
                // First time committing a crime
                let initialBalance = 0;
                let embed;

                if (Math.random() < SUCCESS_CHANCE) {
                    const crimeAmount = Math.floor(Math.random() * (MAX_CRIME_SUCCESS_AMOUNT - MIN_CRIME_SUCCESS_AMOUNT + 1)) + MIN_CRIME_SUCCESS_AMOUNT;
                    initialBalance = crimeAmount;
                    embed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('Crime Successful!')
                        .setDescription(`You successfully pulled off a crime and earned ${crimeAmount} ${config.economy.currencyName}!`)
                        .setTimestamp();
                } else {
                    const fineAmount = Math.floor(Math.random() * (MAX_CRIME_FAIL_AMOUNT - MIN_CRIME_FAIL_AMOUNT + 1)) + MIN_CRIME_FAIL_AMOUNT;
                    initialBalance = -fineAmount; // Start with negative balance if fined on first attempt
                    embed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('Crime Failed!')
                        .setDescription(`You were caught and fined ${fineAmount} ${config.economy.currencyName}. Better luck next time!`)
                        .setTimestamp();
                }

                db.run('INSERT INTO economy (userId, guildId, balance, lastCrime) VALUES (?, ?, ?, ?)', [userId, guildId, initialBalance, now], (insertErr) => {
                    if (insertErr) {
                        console.error('Error creating economy entry for crime:', insertErr);
                        return interaction.reply({ content: 'An error occurred while trying to commit a crime.', ephemeral: true });
                    }
                    interaction.reply({ embeds: [embed] });
                });
            }
        });
    },
};