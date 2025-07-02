const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('Displays a user\'s warnings.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to check warnings for (defaults to yourself)')
                .setRequired(false)),

    async execute(interaction) {
        const user = interaction.options.getUser('target') || interaction.user;
        const warningsPath = path.join(__dirname, '..', 'warnings.json');
        let warnings = [];

        try {
            const data = fs.readFileSync(warningsPath, 'utf8');
            warnings = JSON.parse(data);
        } catch (readError) {
            console.error('Error reading warnings.json:', readError);
            return interaction.reply({
                content: '无法读取警告数据。(Could not read warning data.)',
                ephemeral: true
            });
        }

        const userWarnings = warnings.filter(warn => warn.userId === user.id);

        if (userWarnings.length === 0) {
            return interaction.reply({
                content: `${user.tag} 没有警告。(No warnings for ${user.tag}.)`,
                ephemeral: true
            });
        }

        const warningsEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`⚠️ Warnings for ${user.tag}`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
            .setDescription(`Total warnings: ${userWarnings.length}\n\n`)
            .setTimestamp()
            .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });

        userWarnings.forEach((warn, index) => {
            warningsEmbed.addFields(
                { name: `Warning ${index + 1}`, value: `**Reason (理由):** ${warn.reason}\n**Moderator (管理员):** ${warn.moderatorName}\n**Date (日期):** <t:${Math.floor(new Date(warn.timestamp).getTime() / 1000)}:F>` }
            );
        });

        await interaction.reply({ embeds: [warningsEmbed], ephemeral: false });
    },
};