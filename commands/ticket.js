const { SlashCommandBuilder, ChannelType, PermissionsBitField, EmbedBuilder } = require('discord.js');
const db = require('../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Opens a new support ticket.')
        .addStringOption(option =>
            option.setName('topic')
                .setDescription('The topic of your support ticket')
                .setRequired(true)),

    async execute(interaction, config) {
        const topic = interaction.options.getString('topic');
        const guild = interaction.guild;
        const user = interaction.user;
        const guildId = guild.id;
        const userId = user.id;

        db.get('SELECT * FROM tickets WHERE userId = ? AND guildId = ? AND status = \'open\'', [userId, guildId], async (err, row) => {
            if (err) {
                console.error('Error checking for open tickets:', err);
                return interaction.reply({ content: 'An error occurred while checking for open tickets.', ephemeral: true });
            }

            if (row) {
                return interaction.reply({
                    content: `You already have an open ticket: <#${row.channelId}>.`,
                    ephemeral: true
                });
            }

            try {
                const ticketChannel = await guild.channels.create({
                    name: `ticket-${user.username}`,
                    type: ChannelType.GuildText,
                    parent: config.TICKET_CATEGORY_ID,
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            deny: [PermissionsBitField.Flags.ViewChannel],
                        },
                        {
                            id: user.id,
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                        },
                        {
                            id: interaction.client.user.id,
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                        },
                    ],
                });

                const timestamp = Date.now();
                db.run('INSERT INTO tickets (guildId, userId, channelId, status, timestamp) VALUES (?, ?, ?, ?, ?)', [guildId, userId, ticketChannel.id, 'open', timestamp], (err) => {
                    if (err) {
                        console.error('Error creating ticket entry:', err);
                        return interaction.reply({ content: 'An error occurred while creating the ticket.', ephemeral: true });
                    }
                });

                const ticketEmbed = new EmbedBuilder()
                    .setColor('#00FFFF')
                    .setTitle('🎫 Support Ticket Opened')
                    .setDescription(`Your support ticket has been created: ${ticketChannel}.`)
                    .addFields(
                        { name: 'User', value: user.tag, inline: true },
                        { name: 'Topic', value: topic, inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [ticketEmbed], ephemeral: true });

                const welcomeTicketEmbed = new EmbedBuilder()
                    .setColor('#00FFFF')
                    .setTitle('Welcome to your support ticket!')
                    .setDescription(`Hello ${user}, please describe your issue here.\n\nTopic: ${topic}`)
                    .setTimestamp();
                await ticketChannel.send({ content: `${user}`, embeds: [welcomeTicketEmbed] });

                if (config.MOD_LOG_CHANNEL_ID) {
                    const logChannel = guild.channels.cache.get(config.MOD_LOG_CHANNEL_ID);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setColor('#00FFFF')
                            .setTitle('🎫 Ticket Opened (Log)')
                            .setDescription(`A new ticket has been created: ${ticketChannel}`)
                            .addFields(
                                { name: 'User', value: user.tag, inline: true },
                                { name: 'Topic', value: topic, inline: true }
                            )
                            .setTimestamp();
                        logChannel.send({ embeds: [logEmbed] }).catch(console.error);
                    }
                }

            } catch (error) {
                console.error('Error creating ticket:', error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'An error occurred while creating the ticket.', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'An error occurred while creating the ticket.', ephemeral: true });
                }
            }
        });
    },
};