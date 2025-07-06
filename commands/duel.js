const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('duel')
        .setDescription('Challenges another user to a currency duel.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user you want to duel.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of currency to duel for.')
                .setRequired(true)),

    async execute(interaction, config) {
        const challengerId = interaction.user.id;
        const targetUser = interaction.options.getUser('target');
        const targetId = targetUser.id;
        const amount = interaction.options.getInteger('amount');
        const guildId = interaction.guild.id;

        if (challengerId === targetId) {
            return interaction.reply({ content: 'You cannot duel yourself!', ephemeral: true });
        }
        if (targetUser.bot) {
            return interaction.reply({ content: 'You cannot duel a bot!', ephemeral: true });
        }
        if (amount <= 0) {
            return interaction.reply({ content: 'You must duel for a positive amount of currency.', ephemeral: true });
        }

        // Fetch balances for both users
        db.get('SELECT balance FROM economy WHERE userId = ? AND guildId = ?', [challengerId, guildId], (err, challengerRow) => {
            if (err) {
                console.error('Error fetching challenger balance:', err);
                return interaction.reply({ content: 'An error occurred while setting up the duel.', ephemeral: true });
            }
            const challengerBalance = challengerRow ? challengerRow.balance : 0;

            db.get('SELECT balance FROM economy WHERE userId = ? AND guildId = ?', [targetId, guildId], async (err, targetRow) => {
                if (err) {
                    console.error('Error fetching target balance:', err);
                    return interaction.reply({ content: 'An error occurred while setting up the duel.', ephemeral: true });
                }
                const targetBalance = targetRow ? targetRow.balance : 0;

                if (challengerBalance < amount) {
                    return interaction.reply({ content: `You don't have ${amount} ${config.economy.currencyName} to duel with. Your current balance is ${challengerBalance}.`, ephemeral: true });
                }
                if (targetBalance < amount) {
                    return interaction.reply({ content: `${targetUser.username} doesn't have ${amount} ${config.economy.currencyName} to duel with.`, ephemeral: true });
                }

                const duelEmbed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('⚔️ Duel Challenge! ⚔️')
                    .setDescription(`${interaction.user.username} has challenged ${targetUser.username} to a duel for ${amount} ${config.economy.currencyName}!
${targetUser.username}, do you accept?`)
                    .setTimestamp();

                const reply = await interaction.reply({
                    embeds: [duelEmbed],
                    components: [], // No components for now, will add buttons later if needed
                    fetchReply: true
                });

                // For simplicity, we'll auto-accept for now or add a simple timeout.
                // In a real scenario, you'd add buttons for accept/decline.
                setTimeout(() => {
                    // Simulate duel outcome
                    const winnerId = Math.random() < 0.5 ? challengerId : targetId;
                    const loserId = winnerId === challengerId ? targetId : challengerId;

                    const winnerUser = winnerId === challengerId ? interaction.user : targetUser;
                    const loserUser = loserId === challengerId ? interaction.user : targetUser;

                    const totalPot = amount * 2;

                    db.serialize(() => {
                        db.run('BEGIN TRANSACTION;');

                        // Update winner's balance
                        db.run('UPDATE economy SET balance = balance + ? WHERE userId = ? AND guildId = ?', [totalPot, winnerId, guildId], (err) => {
                            if (err) {
                                console.error('Error updating winner balance:', err);
                                db.run('ROLLBACK;');
                                return reply.edit({ content: 'An error occurred during the duel transaction.', embeds: [], components: [] });
                            }

                            // Update loser's balance
                            db.run('UPDATE economy SET balance = balance - ? WHERE userId = ? AND guildId = ?', [amount, loserId, guildId], (err) => {
                                if (err) {
                                    console.error('Error updating loser balance:', err);
                                    db.run('ROLLBACK;');
                                    return reply.edit({ content: 'An error occurred during the duel transaction.', embeds: [], components: [] });
                                }

                                db.run('COMMIT;', (commitErr) => {
                                    if (commitErr) {
                                        console.error('Error committing duel transaction:', commitErr);
                                        return reply.edit({ content: 'An error occurred during the duel transaction.', embeds: [], components: [] });
                                    }

                                    const resultEmbed = new EmbedBuilder()
                                        .setColor('#00FF00')
                                        .setTitle('⚔️ Duel Result! ⚔️')
                                        .setDescription(`${winnerUser.username} won the duel against ${loserUser.username} and took ${totalPot} ${config.economy.currencyName}!
${loserUser.username} lost ${amount} ${config.economy.currencyName}.`)
                                        .setTimestamp();

                                    reply.edit({ embeds: [resultEmbed], components: [] });
                                });
                            });
                        });
                    });
                }, 5000); // Auto-accept after 5 seconds for demonstration
            });
        });
    },
};