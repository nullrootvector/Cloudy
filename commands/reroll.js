const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const db = require('../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reroll')
        .setDescription('Rerolls a winner for a giveaway.')
        .addStringOption(option =>
            option.setName('message_id')
                .setDescription('The message ID of the giveaway to reroll')
                .setRequired(true)),

    async execute(interaction, config) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({
                content: "🚫 Sorry, you don't have permission to manage the server to reroll a winner.",
                ephemeral: true
            });
        }

        const messageId = interaction.options.getString('message_id');

        db.get('SELECT * FROM giveaways WHERE messageId = ?', [messageId], async (err, giveaway) => {
            if (err) {
                console.error('Error fetching giveaway:', err);
                return interaction.reply({
                    content: 'An error occurred while fetching giveaway data.',
                    ephemeral: true
                });
            }

            if (!giveaway) {
                return interaction.reply({
                    content: 'Could not find a giveaway with that message ID.',
                    ephemeral: true
                });
            }

            if (giveaway.ended === 0) { // 0 means false in SQLite for BOOLEAN
                return interaction.reply({
                    content: 'This giveaway has not ended yet, cannot reroll a winner.',
                    ephemeral: true
                });
            }

            try {
                const channel = interaction.guild.channels.cache.get(giveaway.channelId);
                if (!channel) {
                    return interaction.reply({ content: 'Could not find giveaway channel.', ephemeral: true });
                }
                const message = await channel.messages.fetch(giveaway.messageId);
                if (!message) {
                    return interaction.reply({ content: 'Could not find giveaway message.', ephemeral: true });
                }

                const reaction = message.reactions.cache.get('🎉');
                if (!reaction) {
                    return interaction.reply({ content: 'No 🎉 reaction found on the giveaway message.', ephemeral: true });
                }

                const users = await reaction.users.fetch();
                const participants = users.filter(user => !user.bot).map(user => user);

                if (participants.length === 0) {
                    return interaction.reply({ content: 'No participants, cannot reroll a winner.', ephemeral: true });
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
                    .setDescription(`Congratulations ${winnerMentions}! You won the **${giveaway.prize}**!\n\n[Go to giveaway message](<${message.url}>)`)
                    .setTimestamp();

                await channel.send({ embeds: [rerollEmbed] });
                await interaction.reply({ content: 'Successfully rerolled winner.', ephemeral: true });

            } catch (error) {
                console.error('Error rerolling giveaway:', error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'An error occurred while rerolling the winner.', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'An error occurred while rerolling the winner.', ephemeral: true });
                }
            }
        });
    },
};