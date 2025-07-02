const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Displays the top 10 users by level.'),

    async execute(interaction) {
        const levelsPath = path.join(__dirname, '..', 'levels.json');
        let levels = {};

        try {
            const data = fs.readFileSync(levelsPath, 'utf8');
            levels = JSON.parse(data);
        } catch (readError) {
            console.error('Error reading levels.json:', readError);
            return interaction.reply({
                content: '无法读取等级数据。(Could not read level data.)',
                ephemeral: true
            });
        }

        const sortedUsers = Object.keys(levels)
            .map(id => ({
                userId: id,
                ...levels[id]
            }))
            .sort((a, b) => {
                if (b.level === a.level) {
                    return b.xp - a.xp; // Sort by XP if levels are the same
                }
                return b.level - a.level; // Sort by level
            })
            .slice(0, 10); // Get top 10 users

        if (sortedUsers.length === 0) {
            return interaction.reply({
                content: '排行榜为空。快去发送消息来获得经验吧！(Leaderboard is empty. Go send messages to gain XP!)',
                ephemeral: true
            });
        }

        const leaderboardDescription = await Promise.all(sortedUsers.map(async (userData, index) => {
            try {
                const user = await interaction.client.users.fetch(userData.userId);
                return `${index + 1}. ${user.tag} - Level ${userData.level} (XP: ${userData.xp})`;
            } catch (error) {
                console.error(`Error fetching user for leaderboard: ${userData.userId}`, error);
                return `${index + 1}. Unknown User - Level ${userData.level} (XP: ${userData.xp})`;
            }
        }));

        const leaderboardEmbed = new EmbedBuilder()
            .setColor('#FFD700') // Gold
            .setTitle('👑 Top 10 Leaderboard (排行榜)')
            .setDescription(leaderboardDescription.join('\n'))
            .setTimestamp()
            .setFooter({ text: `Requested by ${interaction.user.tag}` });

        await interaction.reply({ embeds: [leaderboardEmbed], ephemeral: false });
    },
};