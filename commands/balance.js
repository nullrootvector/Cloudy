const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Checks your current balance.'),

    async execute(interaction, config) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        db.get('SELECT balance FROM economy WHERE userId = ? AND guildId = ?', [userId, guildId], (err, row) => {
            if (err) {
                console.error('Error fetching balance:', err);
                return interaction.reply({ content: 'An error occurred while fetching your balance.', ephemeral: true });
            }

            let balance = 0;
            if (row) {
                balance = row.balance;
            } else {
                // If user doesn't exist, create an entry for them
                db.run('INSERT INTO economy (userId, guildId, balance) VALUES (?, ?, ?)', [userId, guildId, 0], (err) => {
                    if (err) {
                        console.error('Error creating economy entry:', err);
                        return interaction.reply({ content: 'An error occurred while creating your account.', ephemeral: true });
                    }
                });
            }

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle(`${interaction.user.username}\'s Balance`)
                .setDescription(`You have ${balance} ${config.economy.currencyName}.`)
                .setTimestamp();

            interaction.reply({ embeds: [embed] });
        });
    },
};