const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const db = require('../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Starts a new giveaway.')
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('Duration of the giveaway (e.g., 1h, 30m, 1d)')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('winners')
                .setDescription('Number of winners')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('prize')
                .setDescription('The prize for the giveaway')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to start the giveaway in (defaults to current channel)')
                .setRequired(false)),

    async execute(interaction, config) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({
                content: "🚫 Sorry, you don't have permission to manage the server to start a giveaway.",
                ephemeral: true
            });
        }

        const durationString = interaction.options.getString('duration');
        const winnerCount = interaction.options.getInteger('winners');
        const prize = interaction.options.getString('prize');
        const giveawayChannel = interaction.options.getChannel('channel') || interaction.channel;

        let durationMs = 0;
        const timeRegex = /(\d+)([smhd])/g;
        let match;
        while ((match = timeRegex.exec(durationString)) !== null) {
            const value = parseInt(match[1]);
            const unit = match[2];
            switch (unit) {
                case 's': durationMs += value * 1000; break;
                case 'm': durationMs += value * 60 * 1000; break;
                case 'h': durationMs += value * 60 * 60 * 1000; break;
                case 'd': durationMs += value * 24 * 60 * 60 * 1000; break;
            }
        }

        if (durationMs === 0) {
            return interaction.reply({
                content: 'Please provide a valid giveaway duration (e.g., 1h, 30m, 1d).',
                ephemeral: true
            });
        }

        const endTime = Date.now() + durationMs;

        const giveawayEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`🎉 GIVEAWAY! 🎉`)
            .setDescription(`**${prize}**\n\nReact with 🎉 to enter!\n\nEnds: <t:${Math.floor(endTime / 1000)}:R>\n\nWinners: ${winnerCount}`)
            .setTimestamp(endTime)
            .setFooter({ text: `Started by ${interaction.user.tag}` });

        try {
            const message = await giveawayChannel.send({ embeds: [giveawayEmbed] });
            await message.react('🎉');

            db.run('INSERT INTO giveaways (messageId, channelId, guildId, endTime, prize, winnerCount, hostId, ended) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
                [message.id, giveawayChannel.id, interaction.guild.id, endTime, prize, winnerCount, interaction.user.id, 0], 
                (err) => {
                if (err) {
                    console.error('Error storing giveaway:', err);
                    return interaction.reply({ content: 'An error occurred while starting the giveaway.', ephemeral: true });
                }
            });

            await interaction.reply({
                content: `Giveaway started in ${giveawayChannel}!`, 
                ephemeral: true
            });

        } catch (error) {
            console.error('Error starting giveaway:', error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'An error occurred while starting the giveaway.', ephemeral: true });
            } else {
                await interaction.reply({ content: 'An error occurred while starting the giveaway.', ephemeral: true });
            }
        }
    },
};