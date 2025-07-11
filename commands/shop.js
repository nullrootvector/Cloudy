const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const db = require('../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Displays the shop.'),

    async execute(interaction, config) {
        const guildId = interaction.guild.id;

        db.all('SELECT * FROM shop_items WHERE guildId = ?', [guildId], async (err, items) => {
            if (err) {
                console.error('Error fetching shop items:', err);
                return interaction.reply({ content: 'An error occurred while fetching the shop.', ephemeral: true });
            }

            if (items.length === 0) {
                return interaction.reply({
                    content: 'The shop is empty.',
                    ephemeral: true
                });
            }

            const shopEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('Cloudy Shop')
                .setDescription('Select an item to purchase:');

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('shop_select')
                .setPlaceholder('Nothing selected');

            items.forEach(item => {
                shopEmbed.addFields({ name: item.name, value: `Price: ${item.price} ${config.economy.currencyName}`, inline: true });
                selectMenu.addOptions({
                    label: item.name,
                    description: `Cost: ${item.price} ${config.economy.currencyName}`,
                    value: item.id.toString(),
                });
            });

            const actionRow = new ActionRowBuilder()
                .addComponents(selectMenu);

            const response = await interaction.reply({
                embeds: [shopEmbed],
                components: [actionRow],
                ephemeral: true,
                fetchReply: true
            });

            const collector = response.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.customId === 'shop_select') {
                    const selectedItemId = parseInt(i.values[0]);
                    const selectedItem = items.find(item => item.id === selectedItemId);

                    if (!selectedItem) {
                        return i.update({ content: 'That item is no longer available.', components: [] });
                    }

                    const userId = i.user.id;
                    db.get('SELECT balance FROM economy WHERE userId = ? AND guildId = ?', [userId, guildId], (err, row) => {
                        if (err) {
                            console.error('Error fetching balance for purchase:', err);
                            return i.update({ content: 'An error occurred while processing your purchase.', components: [] });
                        }

                        const userBalance = row?.balance || 0;

                        if (userBalance < selectedItem.price) {
                            return i.update({
                                content: `You do not have enough ${config.economy.currencyName} to buy ${selectedItem.name}. You need ${selectedItem.price}, but you only have ${userBalance}.`,
                                components: []
                            });
                        }

                        const newBalance = userBalance - selectedItem.price;
                        db.run('UPDATE economy SET balance = ? WHERE userId = ? AND guildId = ?', [newBalance, userId, guildId], (updateErr) => {
                            if (updateErr) {
                                console.error('Error updating balance after purchase:', updateErr);
                                return i.update({ content: 'An error occurred while processing your purchase.', components: [] });
                            }

                            db.get('SELECT quantity FROM user_inventory WHERE userId = ? AND guildId = ? AND itemId = ?', [userId, guildId, selectedItemId], (invErr, invRow) => {
                                if (invErr) {
                                    console.error('Error checking inventory:', invErr);
                                    return i.update({ content: 'An error occurred while adding the item to your inventory.', components: [] });
                                }

                                if (invRow) {
                                    // Item exists, update quantity
                                    db.run('UPDATE user_inventory SET quantity = ? WHERE userId = ? AND guildId = ? AND itemId = ?', [invRow.quantity + 1, userId, guildId, selectedItemId], (updateInvErr) => {
                                        if (updateInvErr) {
                                            console.error('Error updating inventory:', updateInvErr);
                                            return i.update({ content: 'An error occurred while updating your inventory.', components: [] });
                                        }
                                        sendPurchaseSuccess(i, selectedItem, newBalance, config);
                                    });
                                } else {
                                    // Item does not exist, insert new entry
                                    db.run('INSERT INTO user_inventory (userId, guildId, itemId, quantity) VALUES (?, ?, ?, ?)', [userId, guildId, selectedItemId, 1], (insertInvErr) => {
                                        if (insertInvErr) {
                                            console.error('Error inserting into inventory:', insertInvErr);
                                            return i.update({ content: 'An error occurred while adding the item to your inventory.', components: [] });
                                        }
                                        sendPurchaseSuccess(i, selectedItem, newBalance, config);
                                    });
                                }
                            });
                        });
                    });
                }
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: 'You did not select an item in time.', components: [] }).catch(console.error);
                }
            });
        });
    },
};

function sendPurchaseSuccess(interaction, item, newBalance, config) {
    const purchaseEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('Purchase Successful!')
        .setDescription(`You have purchased **${item.name}** for ${item.price} ${config.economy.currencyName}. It has been added to your inventory. Your new balance is ${newBalance} ${config.economy.currencyName}.`);

    interaction.update({ embeds: [purchaseEmbed], components: [] });
}
