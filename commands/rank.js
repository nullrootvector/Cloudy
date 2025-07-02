const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

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

        const userData = levels[user.id] || { xp: 0, level: 0 };
        const currentLevel = userData.level;
        const currentXp = userData.xp;
        const xpNeededForNextLevel = 5 * (currentLevel ** 2) + 50 * currentLevel + 100;

        const rankEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`🏆 ${user.tag}'s Rank`)
            .setDescription(`**Level (等级):** ${currentLevel}\n**XP (经验):** ${currentXp}/${xpNeededForNextLevel}`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
            .setTimestamp()
            .setFooter({ text: `Requested by ${interaction.user.tag}` });

        await interaction.reply({ embeds: [rankEmbed], ephemeral: false });
    },
}