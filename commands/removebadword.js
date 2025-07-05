const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const db = require('../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removebadword')
        .setDescription('Removes a word from the bad word filter.')
        .addStringOption(option =>
            option.setName('word')
                .setDescription('The word to remove from the filter')
                .setRequired(true)),

    async execute(interaction, config) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({
                content: "🚫 Sorry, you don't have permission to manage the server to remove forbidden words.",
                ephemeral: true
            });
        }

        const wordToRemove = interaction.options.getString('word').toLowerCase();

        db.get('SELECT * FROM badwords WHERE guildId = ? AND word = ?', [interaction.guild.id, wordToRemove], async (err, row) => {
            if (err) {
                console.error('Error checking for bad word:', err);
                return interaction.reply({ content: 'An error occurred while checking the bad word list.', ephemeral: true });
            }

            if (!row) {
                return interaction.reply({
                    content: `\`${wordToRemove}\` is not in the forbidden word list.`,
                    ephemeral: true
                });
            }

            db.run('DELETE FROM badwords WHERE guildId = ? AND word = ?', [interaction.guild.id, wordToRemove], async (err) => {
                if (err) {
                    console.error('Error removing bad word:', err);
                    return interaction.reply({ content: 'An error occurred while removing the bad word.', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Bad Word Removed')
                    .setDescription(`Successfully removed \`${wordToRemove}\` from the forbidden word list.`)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });

                if (config.MOD_LOG_CHANNEL_ID) {
                    const logChannel = interaction.guild.channels.cache.get(config.MOD_LOG_CHANNEL_ID);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('❌ Bad Word Removed (Log)')
                            .setDescription(`The forbidden word \`${wordToRemove}\` has been removed.`)
                            .addFields(
                                { name: 'Word', value: wordToRemove, inline: true },
                                { name: 'Removed By', value: interaction.user.tag }
                            )
                            .setTimestamp();
                        logChannel.send({ embeds: [logEmbed] }).catch(console.error);
                    }
                }
            });
        });
    },
};