const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Displays your current level and XP, or another user\'s.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to check the rank of (defaults to yourself)')
                .setRequired(false)),

    async execute(interaction) {
        const user = interaction.options.getUser('target') || interaction.user;
        const userId = user.id;
        const guildId = interaction.guild.id;

        db.get('SELECT * FROM levels WHERE userId = ? AND guildId = ?', [userId, guildId], (err, row) => {
            if (err) {
                console.error('Error fetching rank:', err);
                return interaction.reply({ content: 'An error occurred while fetching the rank.', ephemeral: true });
            }

            let level = 0;
            let xp = 0;
            if (row) {
                level = row.level;
                xp = row.xp;
            } else {
                // If user doesn't exist, create an entry for them
                db.run('INSERT INTO levels (userId, guildId, xp, level) VALUES (?, ?, ?, ?)', [userId, guildId, 0, 0], (err) => {
                    if (err) {
                        console.error('Error creating level entry:', err);
                        return interaction.reply({ content: 'An error occurred while creating your rank.', ephemeral: true });
                    }
                });
            }

            const xpNeededForNextLevel = 5 * (level ** 2) + 50 * level + 100;

            const rankEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`🏆 ${user.tag}\'s Rank`)
                .setDescription(`**Level:** ${level}\n**XP:** ${xp}/${xpNeededForNextLevel}`)
                .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
                .setTimestamp()
                .setFooter({ text: `Requested by ${interaction.user.tag}` });

            interaction.reply({ embeds: [rankEmbed], ephemeral: false });
        });
    },
};