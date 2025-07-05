const { SlashCommandBuilder, ChannelType, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

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

        // Check if user already has an open ticket
        const ticketsPath = path.join(__dirname, '..', 'tickets.json');
        let tickets = [];
        try {
            const data = fs.readFileSync(ticketsPath, 'utf8');
            tickets = JSON.parse(data);
        } catch (readError) {
            console.error('Error reading tickets.json:', readError);
        }

        const userOpenTicket = tickets.find(ticket => ticket.userId === user.id && ticket.status === 'open');
        if (userOpenTicket) {
            return interaction.reply({
                content: `You already have an open ticket: <#${userOpenTicket.channelId}>.`,
                ephemeral: true
            });
        }

        try {
            // Create a new private channel
            const ticketChannel = await guild.channels.create({
                name: `ticket-${user.username}`,
                type: ChannelType.GuildText,
                parent: config.TICKET_CATEGORY_ID, // Make sure to add TICKET_CATEGORY_ID to your config.json
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel], // Deny everyone from viewing
                    },
                    {
                        id: user.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages], // Allow user to view and send messages
                    },
                    {
                        id: interaction.client.user.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages], // Allow bot to view and send messages
                    },
                    // Add roles for moderators/support staff here
                    // Example: { id: 'YOUR_MOD_ROLE_ID', allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                ],
            });

            const newTicket = {
                ticketId: ticketChannel.id,
                userId: user.id,
                userName: user.tag,
                topic: topic,
                status: 'open',
                openedAt: new Date().toISOString()
            };
            tickets.push(newTicket);
            fs.writeFileSync(ticketsPath, JSON.stringify(tickets, null, 2), 'utf8');

            const ticketEmbed = new EmbedBuilder()
                .setColor('#00FFFF')
                .setTitle('🎫 Support Ticket Opened')
                .setDescription(`你的支持工单已创建：${ticketChannel}。\n(Your support ticket has been created: ${ticketChannel}.)`)
                .addFields(
                    { name: 'User (用户)', value: user.tag, inline: true },
                    { name: 'Topic (主题)', value: topic, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [ticketEmbed], ephemeral: true });

            // Send initial message to the ticket channel
            const welcomeTicketEmbed = new EmbedBuilder()
                .setColor('#00FFFF')
                .setTitle('欢迎来到你的支持工单！(Welcome to your support ticket!)')
                .setDescription(`你好 ${user}，请在此描述你的问题。\n(Hello ${user}, please describe your issue here.)\n\n主题：${topic}`)
                .setTimestamp();
            await ticketChannel.send({ content: `${user}`, embeds: [welcomeTicketEmbed] });

            // Send log to moderation channel
            if (config.MOD_LOG_CHANNEL_ID) {
                const logChannel = guild.channels.cache.get(config.MOD_LOG_CHANNEL_ID);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#00FFFF')
                        .setTitle('🎫 Ticket Opened (日志)')
                        .setDescription(`新工单已创建：${ticketChannel}`)
                        .addFields(
                            { name: 'User (用户)', value: user.tag, inline: true },
                            { name: 'Topic (主题)', value: topic, inline: true }
                        )
                        .setTimestamp();
                    logChannel.send({ embeds: [logEmbed] }).catch(console.error);
                }
            }

        } catch (error) {
            console.error('Error creating ticket:', error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '创建工单时发生错误。(An error occurred while creating the ticket.)', ephemeral: true });
            } else {
                await interaction.reply({ content: '创建工单时发生错误。(An error occurred while creating the ticket.)', ephemeral: true });
            }
        }
    },
};