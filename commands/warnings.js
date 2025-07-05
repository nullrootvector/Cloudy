const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database.js');

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

        db.all('SELECT reason, moderatorId, timestamp FROM warnings WHERE userId = ? AND guildId = ? ORDER BY timestamp DESC', [user.id, interaction.guild.id], async (err, rows) => {
            if (err) {
                console.error('Error fetching warnings from database:', err);
                return interaction.reply({
                    content: 'An error occurred while trying to fetch warnings.',
                    ephemeral: true
                });
            }

            if (rows.length === 0) {
                return interaction.reply({
                    content: `${user.tag} has no warnings.`,
                    ephemeral: true
                });
            }

            const warningsEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle(`⚠️ Warnings for ${user.tag}`)
                .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
                .setDescription(`Total warnings: ${rows.length}`)
                .setTimestamp()
                .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });

            for (const [index, row] of rows.entries()) {
                let moderatorTag = 'Unknown Moderator';
                try {
                    const moderator = await interaction.guild.members.fetch(row.moderatorId);
                    moderatorTag = moderator.user.tag;
                } catch (fetchError) {
                    console.warn(`Could not fetch moderator ${row.moderatorId}:`, fetchError);
                }

                warningsEmbed.addFields(
                    { name: `Warning ${index + 1}`, value: `**Reason:** ${row.reason}\n**Moderator:** ${moderatorTag}\n**Date:** <t:${Math.floor(row.timestamp / 1000)}:F>` }
                );
            }

            await interaction.reply({ embeds: [warningsEmbed], ephemeral: false });
        });
    },
};