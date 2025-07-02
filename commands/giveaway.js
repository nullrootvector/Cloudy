const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

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
        // Permission Check: User must have ManageGuild permission
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({
                content: "🚫 抱歉，亲爱的，你没有管理服务器的权限来开始抽奖。(Sorry, my dear, you don't have permission to manage the server to start a giveaway.)",
                ephemeral: true
            });
        }

        const durationString = interaction.options.getString('duration');
        const winnerCount = interaction.options.getInteger('winners');
        const prize = interaction.options.getString('prize');
        const giveawayChannel = interaction.options.getChannel('channel') || interaction.channel;

        // Parse duration
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
                content: '请提供有效的抽奖时长 (例如：1h, 30m, 1d)。(Please provide a valid giveaway duration (e.g., 1h, 30m, 1d).)',
                ephemeral: true
            });
        }

        const endTime = Date.now() + durationMs;

        const giveawayEmbed = new EmbedBuilder()
            .setColor('#FFD700') // Gold
            .setTitle(`🎉 GIVEAWAY! 🎉`)
            .setDescription(`**${prize}**\n\n点击 🎉 表情符号参与！\n(React with 🎉 to enter!)\n\n结束时间：<t:${Math.floor(endTime / 1000)}:R> (相对时间)\n(Ends: <t:${Math.floor(endTime / 1000)}:R> (relative time))\n\n赢家数量：${winnerCount}`)
            .setTimestamp(endTime)
            .setFooter({ text: `由 ${interaction.user.tag} 发起 (Started by ${interaction.user.tag})` });

        try {
            const message = await giveawayChannel.send({ embeds: [giveawayEmbed] });
            await message.react('🎉');

            const newGiveaway = {
                messageId: message.id,
                channelId: giveawayChannel.id,
                guildId: interaction.guild.id,
                endTime: endTime,
                winnerCount: winnerCount,
                prize: prize,
                hostId: interaction.user.id,
                status: 'active'
            };

            const giveawaysPath = path.join(__dirname, '..', 'giveaways.json');
            let giveaways = [];
            try {
                const data = fs.readFileSync(giveawaysPath, 'utf8');
                giveaways = JSON.parse(data);
            } catch (readError) {
                console.error('Error reading giveaways.json:', readError);
            }
            giveaways.push(newGiveaway);
            fs.writeFileSync(giveawaysPath, JSON.stringify(giveaways, null, 2), 'utf8');

            await interaction.reply({
                content: `抽奖已在 ${giveawayChannel} 中开始！(Giveaway started in ${giveawayChannel}!)`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Error starting giveaway:', error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '开始抽奖时发生错误。(An error occurred while starting the giveaway.)', ephemeral: true });
            } else {
                await interaction.reply({ content: '开始抽奖时发生错误。(An error occurred while starting the giveaway.)', ephemeral: true });
            }
        }
    },
};