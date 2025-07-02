const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('close')
        .setDescription('Closes the current support ticket.')
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for closing the ticket')
                .setRequired(false)),

    async execute(interaction, config) {
        const reason = interaction.options.getString('reason') || '没有提供理由 (No reason provided)';
        const guild = interaction.guild;
        const channel = interaction.channel;
        const user = interaction.user;

        // Check if the channel is a ticket channel
        const ticketsPath = path.join(__dirname, '..', 'tickets.json');
        let tickets = [];
        try {
            const data = fs.readFileSync(ticketsPath, 'utf8');
            tickets = JSON.parse(data);
        } catch (readError) {
            console.error('Error reading tickets.json:', readError);
            return interaction.reply({
                content: '无法读取工单数据。(Could not read ticket data.)',
                ephemeral: true
            });
        }

        const ticket = tickets.find(t => t.channelId === channel.id && t.status === 'open');

        if (!ticket) {
            return interaction.reply({
                content: '这不是一个开放的工单频道。(This is not an open ticket channel.)',
                ephemeral: true
            });
        }

        // Check permissions: Only the ticket creator or a moderator can close the ticket
        const isModerator = interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels);
        const isTicketCreator = ticket.userId === user.id;

        if (!isModerator && !isTicketCreator) {
            return interaction.reply({
                content: '你没有权限关闭此工单。(You do not have permission to close this ticket.)',
                ephemeral: true
            });
        }

        try {
            // Update ticket status
            ticket.status = 'closed';
            ticket.closedAt = new Date().toISOString();
            ticket.closedBy = user.tag;
            fs.writeFileSync(ticketsPath, JSON.stringify(tickets, null, 2), 'utf8');

            const closeEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Ticket Closed')
                .setDescription(`此工单已关闭。\n(This ticket has been closed.)`)
                .addFields(
                    { name: 'Closed By (关闭者)', value: user.tag, inline: true },
                    { name: 'Reason (理由)', value: reason, inline: true }
                )
                .setTimestamp();

            await channel.send({ embeds: [closeEmbed] });

            // Send log to moderation channel
            if (config.MOD_LOG_CHANNEL_ID) {
                const logChannel = guild.channels.cache.get(config.MOD_LOG_CHANNEL_ID);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('Ticket Closed (日志)')
                        .setDescription(`工单 ${channel.name} 已关闭。`)
                        .addFields(
                            { name: 'Ticket ID (工单ID)', value: ticket.ticketId, inline: true },
                            { name: 'Closed By (关闭者)', value: user.tag, inline: true },
                            { name: 'Reason (理由)', value: reason }
                        )
                        .setTimestamp();
                    logChannel.send({ embeds: [logEmbed] }).catch(console.error);
                }
            }

            // Delete the channel after a delay
            setTimeout(async () => {
                await channel.delete('Ticket closed').catch(console.error);
            }, 5000); // Delete after 5 seconds

            await interaction.reply({ content: '工单已关闭，频道将在5秒后删除。(Ticket closed, channel will be deleted in 5 seconds.)', ephemeral: true });

        } catch (error) {
            console.error('Error closing ticket:', error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '关闭工单时发生错误。(An error occurred while closing the ticket.)', ephemeral: true });
            } else {
                await interaction.reply({ content: '关闭工单时发生错误。(An error occurred while closing the ticket.)', ephemeral: true });
            }
        }
    },
};