const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const db = require('../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addbadword')
        .setDescription('Adds a word to the bad word filter.')
        .addStringOption(option =>
            option.setName('word')
                .setDescription('The word to add to the filter')
                .setRequired(true)),

    async execute(interaction, config) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({
                content: "🚫 Sorry, you don't have permission to manage the server to add forbidden words.",
                ephemeral: true
            });
        }

        const wordToAdd = interaction.options.getString('word').toLowerCase();

        db.get('SELECT * FROM badwords WHERE guildId = ? AND word = ?', [interaction.guild.id, wordToAdd], async (err, row) => {
            if (err) {
                console.error('Error checking for bad word:', err);
                return interaction.reply({ content: 'An error occurred while checking the bad word list.', ephemeral: true });
            }

            if (row) {
                return interaction.reply({
                    content: `\`${wordToAdd}\` is already in the forbidden word list.`,
                    ephemeral: true
                });
            }

            db.run('INSERT INTO badwords (guildId, word) VALUES (?, ?)', [interaction.guild.id, wordToAdd], async (err) => {
                if (err) {
                    console.error('Error adding bad word:', err);
                    return interaction.reply({ content: 'An error occurred while adding the bad word.', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('✅ Bad Word Added')
                    .setDescription(`Successfully added \`${wordToAdd}\` to the forbidden word list.`)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });

                if (config.MOD_LOG_CHANNEL_ID) {
                    const logChannel = interaction.guild.channels.cache.get(config.MOD_LOG_CHANNEL_ID);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setColor('#00FF00')
                            .setTitle('➕ Bad Word Added (Log)')
                            .setDescription(`The forbidden word \`${wordToAdd}\` has been added.`)
                            .addFields(
                                { name: 'Word', value: wordToAdd, inline: true },
                                { name: 'Added By', value: interaction.user.tag }
                            )
                            .setTimestamp();
                        logChannel.send({ embeds: [logEmbed] }).catch(console.error);
                    }
                }
            });
        });
    },
};