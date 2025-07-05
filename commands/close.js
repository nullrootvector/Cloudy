const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const db = require('../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('close')
        .setDescription('Closes the current support ticket.')
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for closing the ticket')
                .setRequired(false)),

    async execute(interaction, config) {
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const guild = interaction.guild;
        const channel = interaction.channel;
        const user = interaction.user;
        const guildId = guild.id;
        const channelId = channel.id;

        db.get('SELECT * FROM tickets WHERE channelId = ? AND guildId = ? AND status = \'open\'', [channelId, guildId], async (err, row) => {
            if (err) {
                console.error('Error fetching ticket:', err);
                return interaction.reply({ content: 'An error occurred while closing the ticket.', ephemeral: true });
            }

            if (!row) {
                return interaction.reply({
                    content: 'This is not an open ticket channel.',
                    ephemeral: true
                });
            }

            const isModerator = interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels);
            const isTicketCreator = row.userId === user.id;

            if (!isModerator && !isTicketCreator) {
                return interaction.reply({
                    content: 'You do not have permission to close this ticket.',
                    ephemeral: true
                });
            }

            try {
                db.run('UPDATE tickets SET status = \'closed\' WHERE channelId = ?', [channelId], (err) => {
                    if (err) {
                        console.error('Error closing ticket in db:', err);
                        return interaction.reply({ content: 'An error occurred while closing the ticket.', ephemeral: true });
                    }
                });

                const closeEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('Ticket Closed')
                    .setDescription('This ticket has been closed.')
                    .addFields(
                        { name: 'Closed By', value: user.tag, inline: true },
                        { name: 'Reason', value: reason, inline: true }
                    )
                    .setTimestamp();

                await channel.send({ embeds: [closeEmbed] });

                if (config.MOD_LOG_CHANNEL_ID) {
                    const logChannel = guild.channels.cache.get(config.MOD_LOG_CHANNEL_ID);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('Ticket Closed (Log)')
                            .setDescription(`Ticket ${channel.name} has been closed.`)
                            .addFields(
                                { name: 'Ticket ID', value: row.id.toString(), inline: true },
                                { name: 'Closed By', value: user.tag, inline: true },
                                { name: 'Reason', value: reason }
                            )
                            .setTimestamp();
                        logChannel.send({ embeds: [logEmbed] }).catch(console.error);
                    }
                }

                setTimeout(async () => {
                    await channel.delete('Ticket closed').catch(console.error);
                }, 5000);

                await interaction.reply({ content: 'Ticket closed, channel will be deleted in 5 seconds.', ephemeral: true });

            } catch (error) {
                console.error('Error closing ticket:', error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'An error occurred while closing the ticket.', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'An error occurred while closing the ticket.', ephemeral: true });
                }
            }
        });
    },
};