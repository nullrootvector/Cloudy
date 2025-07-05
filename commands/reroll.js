const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reroll')
        .setDescription('Rerolls a winner for a giveaway.')
        .addStringOption(option =>
            option.setName('message_id')
                .setDescription('The message ID of the giveaway to reroll')
                .setRequired(true)),

    async execute(interaction, config) {
        // Permission Check: User must have ManageGuild permission
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({
                content: "🚫 Sorry, you don't have permission to manage the server to reroll a winner.",
                ephemeral: true
            });
        }

        const messageId = interaction.options.getString('message_id');

        const giveawaysPath = path.join(__dirname, '..', 'giveaways.json');
        let giveaways = [];
        try {
            const data = fs.readFileSync(giveawaysPath, 'utf8');
            giveaways = JSON.parse(data);
        } catch (readError) {
            console.error('Error reading giveaways.json:', readError);
            return interaction.reply({
                content: '无法读取抽奖数据。(Could not read giveaway data.)',
                ephemeral: true
            });
        }

        const giveaway = giveaways.find(g => g.messageId === messageId);

        if (!giveaway) {
            return interaction.reply({
                content: '找不到指定ID的抽奖。(Could not find a giveaway with that message ID.)',
                ephemeral: true
            });
        }

        if (giveaway.status !== 'ended') {
            return interaction.reply({
                content: '此抽奖尚未结束，无法重新抽取赢家。(This giveaway has not ended yet, cannot reroll a winner.)',
                ephemeral: true
            });
        }

        try {
            const channel = interaction.guild.channels.cache.get(giveaway.channelId);
            if (!channel) {
                return interaction.reply({ content: '找不到抽奖频道。(Could not find giveaway channel.)', ephemeral: true });
            }
            const message = await channel.messages.fetch(giveaway.messageId);
            if (!message) {
                return interaction.reply({ content: '找不到抽奖消息。(Could not find giveaway message.)', ephemeral: true });
            }

            const reaction = message.reactions.cache.get('🎉');
            if (!reaction) {
                return interaction.reply({ content: '抽奖消息上没有找到 🎉 反应。(No 🎉 reaction found on the giveaway message.)', ephemeral: true });
            }

            const users = await reaction.users.fetch();
            const participants = users.filter(user => !user.bot).map(user => user);

            if (participants.length === 0) {
                return interaction.reply({ content: '没有参与者，无法重新抽取赢家。(No participants, cannot reroll a winner.)', ephemeral: true });
            }

            const newWinners = [];
            for (let i = 0; i < giveaway.winnerCount; i++) {
                if (participants.length === 0) break;
                const randomIndex = Math.floor(Math.random() * participants.length);
                newWinners.push(participants.splice(randomIndex, 1)[0]);
            }

            const winnerMentions = newWinners.map(winner => `<@${winner.id}>`).join(', ');

            const rerollEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🎉 GIVEAWAY REROLL! 🎉')
                .setDescription(`恭喜 ${winnerMentions}！你赢得了 **${giveaway.prize}**！\n(Congratulations ${winnerMentions}! You won the **${giveaway.prize}**!)\n\n[前往抽奖消息](<${message.url}>)`)
                .setTimestamp();

            await channel.send({ embeds: [rerollEmbed] });
            await interaction.reply({ content: '已成功重新抽取赢家。(Successfully rerolled winner.)', ephemeral: true });

        } catch (error) {
            console.error('Error rerolling giveaway:', error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '重新抽取赢家时发生错误。(An error occurred while rerolling the winner.)', ephemeral: true });
            } else {
                await interaction.reply({ content: '重新抽取赢家时发生错误。(An error occurred while rerolling the winner.)', ephemeral: true });
            }
        }
    },
};