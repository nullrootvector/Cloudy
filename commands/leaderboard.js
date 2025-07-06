const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Displays the top 10 users by balance.'),

    async execute(interaction) {
        const guildId = interaction.guild.id;

        db.all('SELECT userId, balance FROM economy WHERE guildId = ? ORDER BY balance DESC LIMIT 10', [guildId], async (err, rows) => {
            if (err) {
                console.error('Error fetching leaderboard:', err);
                return interaction.reply({ content: 'An error occurred while fetching the leaderboard.', ephemeral: true });
            }

            if (rows.length === 0) {
                return interaction.reply({
                    content: 'The leaderboard is empty. Send messages or join voice channels to earn currency!',
                    ephemeral: true
                });
            }

            const leaderboardDescription = await Promise.all(rows.map(async (row, index) => {
                try {
                    const user = await interaction.client.users.fetch(row.userId);
                    return `${index + 1}. ${user.tag} - ${row.balance}`;
                } catch (error) {
                    console.error(`Error fetching user for leaderboard: ${row.userId}`, error);
                    return `${index + 1}. Unknown User - ${row.balance}`;
                }
            }));

            const leaderboardEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('👑 Top 10 Leaderboard')
                .setDescription(leaderboardDescription.join('\n'))
                .setTimestamp()
                .setFooter({ text: `Requested by ${interaction.user.tag}` });

            await interaction.reply({ embeds: [leaderboardEmbed], ephemeral: false });
        });
    },
};