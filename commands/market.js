const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('market')
        .setDescription('Manages the player marketplace.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Lists an item for sale on the marketplace.')
                .addStringOption(option =>
                    option.setName('item_name')
                        .setDescription('The name of the item you want to sell.')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('price')
                        .setDescription('The price for each item.')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('quantity')
                        .setDescription('The quantity of the item to sell (defaults to 1).')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('browse')
                .setDescription('Browses items currently for sale on the marketplace.'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('buy')
                .setDescription('Buys an item from the marketplace.')
                .addIntegerOption(option =>
                    option.setName('listing_id')
                        .setDescription('The ID of the listing to buy.')
                        .setRequired(true))),

    async execute(interaction, config) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        if (subcommand === 'list') {
            const itemName = interaction.options.getString('item_name');
            const quantity = interaction.options.getInteger('quantity') || 1;
            const price = interaction.options.getInteger('price');

            if (price <= 0) {
                return interaction.reply({ content: 'Price must be a positive number.', ephemeral: true });
            }
            if (quantity <= 0) {
                return interaction.reply({ content: 'Quantity must be a positive number.', ephemeral: true });
            }

            // Find the item in shop_items to get its ID
            db.get('SELECT id FROM shop_items WHERE name LIKE ? AND guildId = ?', [itemName, guildId], (err, itemRow) => {
                if (err) {
                    console.error('Error finding item in shop_items:', err);
                    return interaction.reply({ content: 'An error occurred while trying to list your item.', ephemeral: true });
                }

                if (!itemRow) {
                    return interaction.reply({ content: `Item '${itemName}' not found in the shop. Make sure you type the name correctly.`, ephemeral: true });
                }

                const itemId = itemRow.id;

                // Check user's inventory for the item and quantity
                db.get('SELECT quantity FROM user_inventory WHERE userId = ? AND guildId = ? AND itemId = ?', [userId, guildId, itemId], (err, inventoryRow) => {
                    if (err) {
                        console.error('Error checking user inventory:', err);
                        return interaction.reply({ content: 'An error occurred while checking your inventory.', ephemeral: true });
                    }

                    if (!inventoryRow || inventoryRow.quantity < quantity) {
                        return interaction.reply({ content: `You don't have ${quantity} of '${itemName}' in your inventory.`, ephemeral: true });
                    }

                    // Update user inventory (decrease quantity or remove item)
                    const newInventoryQuantity = inventoryRow.quantity - quantity;
                    if (newInventoryQuantity > 0) {
                        db.run('UPDATE user_inventory SET quantity = ? WHERE userId = ? AND guildId = ? AND itemId = ?', [newInventoryQuantity, userId, guildId, itemId], (updateErr) => {
                            if (updateErr) {
                                console.error('Error updating user inventory:', updateErr);
                                return interaction.reply({ content: 'An error occurred while updating your inventory.', ephemeral: true });
                            }
                            // Insert into marketplace_listings
                            insertMarketListing(interaction, userId, guildId, itemId, quantity, price, itemName, config);
                        });
                    } else {
                        db.run('DELETE FROM user_inventory WHERE userId = ? AND guildId = ? AND itemId = ?', [userId, guildId, itemId], (deleteErr) => {
                            if (deleteErr) {
                                console.error('Error deleting item from user inventory:', deleteErr);
                                return interaction.reply({ content: 'An error occurred while updating your inventory.', ephemeral: true });
                            }
                            // Insert into marketplace_listings
                            insertMarketListing(interaction, userId, guildId, itemId, quantity, price, itemName, config);
                        });
                    }
                });
            });
        } else if (subcommand === 'browse') {
            db.all('SELECT ml.id, ml.quantity, ml.price, si.name, ml.sellerId FROM marketplace_listings ml JOIN shop_items si ON ml.itemId = si.id WHERE ml.guildId = ?', [guildId], async (err, listings) => {
                if (err) {
                    console.error('Error fetching marketplace listings:', err);
                    return interaction.reply({ content: 'An error occurred while browsing the marketplace.', ephemeral: true });
                }

                if (listings.length === 0) {
                    return interaction.reply({ content: 'The marketplace is currently empty.', ephemeral: true });
                }

                const browseEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('Player Marketplace')
                    .setDescription('Items currently for sale:')
                    .setTimestamp();

                for (const listing of listings) {
                    let sellerUsername = 'Unknown';
                    try {
                        const seller = await interaction.client.users.fetch(listing.sellerId);
                        sellerUsername = seller.username;
                    } catch (e) {
                        console.error(`Could not fetch seller for listing ${listing.id}:`, e);
                    }
                    browseEmbed.addFields({
                        name: `ID: ${listing.id} | ${listing.name} (x${listing.quantity})`,
                        value: `Price: ${listing.price} ${config.economy.currencyName} each | Seller: ${sellerUsername}`,
                        inline: false
                    });
                };

                await interaction.reply({ embeds: [browseEmbed], ephemeral: false });
            });
        } else if (subcommand === 'buy') {
            const listingId = interaction.options.getInteger('listing_id');

            db.get('SELECT ml.id, ml.sellerId, ml.itemId, ml.quantity, ml.price, si.name FROM marketplace_listings ml JOIN shop_items si ON ml.itemId = si.id WHERE ml.id = ? AND ml.guildId = ?', [listingId, guildId], (err, listing) => {
                if (err) {
                    console.error('Error fetching listing for purchase:', err);
                    return interaction.reply({ content: 'An error occurred while trying to buy the item.', ephemeral: true });
                }

                if (!listing) {
                    return interaction.reply({ content: 'Listing not found or already sold.', ephemeral: true });
                }

                if (listing.sellerId === userId) {
                    return interaction.reply({ content: 'You cannot buy your own listing!', ephemeral: true });
                }

                const totalPrice = listing.price * listing.quantity;

                // Check buyer's balance
                db.get('SELECT balance FROM economy WHERE userId = ? AND guildId = ?', [userId, guildId], (err, buyerEconomy) => {
                    if (err) {
                        console.error('Error fetching buyer economy:', err);
                        return interaction.reply({ content: 'An error occurred while checking your balance.', ephemeral: true });
                    }

                    const buyerBalance = buyerEconomy?.balance || 0;

                    if (buyerBalance < totalPrice) {
                        return interaction.reply({ content: `You do not have enough ${config.economy.currencyName} to buy this listing. You need ${totalPrice}, but you only have ${buyerBalance}.`, ephemeral: true });
                    }

                    // Process transaction
                    db.serialize(() => {
                        db.run('BEGIN TRANSACTION;');

                        // Deduct from buyer
                        db.run('UPDATE economy SET balance = ? WHERE userId = ? AND guildId = ?', [buyerBalance - totalPrice, userId, guildId], (updateErr) => {
                            if (updateErr) {
                                console.error('Error updating buyer balance:', updateErr);
                                db.run('ROLLBACK;');
                                return interaction.reply({ content: 'An error occurred during the transaction.', ephemeral: true });
                            }

                            // Add to seller
                            db.get('SELECT balance FROM economy WHERE userId = ? AND guildId = ?', [listing.sellerId, guildId], (err, sellerEconomy) => {
                                const sellerBalance = sellerEconomy?.balance || 0;
                                db.run('UPDATE economy SET balance = ? WHERE userId = ? AND guildId = ?', [sellerBalance + totalPrice, listing.sellerId, guildId], (updateErr) => {
                                    if (updateErr) {
                                        console.error('Error updating seller balance:', updateErr);
                                        db.run('ROLLBACK;');
                                        return interaction.reply({ content: 'An error occurred during the transaction.', ephemeral: true });
                                    }

                                    // Add item to buyer's inventory
                                    db.get('SELECT quantity FROM user_inventory WHERE userId = ? AND guildId = ? AND itemId = ?', [userId, guildId, listing.itemId], (err, buyerInventory) => {
                                        if (buyerInventory) {
                                            db.run('UPDATE user_inventory SET quantity = ? WHERE userId = ? AND guildId = ? AND itemId = ?', [buyerInventory.quantity + listing.quantity, userId, guildId, listing.itemId], (updateErr) => {
                                                if (updateErr) {
                                                    console.error('Error updating buyer inventory:', updateErr);
                                                    db.run('ROLLBACK;');
                                                    return interaction.reply({ content: 'An error occurred during the transaction.', ephemeral: true });
                                                }
                                                // Delete listing
                                                deleteMarketListing(interaction, listingId, listing.name, listing.quantity, totalPrice, config);
                                            });
                                        } else {
                                            db.run('INSERT INTO user_inventory (userId, guildId, itemId, quantity) VALUES (?, ?, ?, ?)', [userId, guildId, listing.itemId, listing.quantity], (insertErr) => {
                                                if (insertErr) {
                                                    console.error('Error inserting into buyer inventory:', insertErr);
                                                    db.run('ROLLBACK;');
                                                    return interaction.reply({ content: 'An error occurred during the transaction.', ephemeral: true });
                                                }
                                                // Delete listing
                                                deleteMarketListing(interaction, listingId, listing.name, listing.quantity, totalPrice, config);
                                            });
                                        }
                                    });
                                });
                            });
                        });
                    });
                });
            });
        }
    },
};

function insertMarketListing(interaction, userId, guildId, itemId, quantity, price, itemName, config) {
    db.run('INSERT INTO marketplace_listings (sellerId, guildId, itemId, quantity, price, timestamp) VALUES (?, ?, ?, ?, ?, ?)', [userId, guildId, itemId, quantity, price, Date.now()], (insertErr) => {
        if (insertErr) {
            console.error('Error inserting into marketplace_listings:', insertErr);
            return interaction.reply({ content: 'An error occurred while listing your item.', ephemeral: true });
        }
        interaction.reply({ content: `Successfully listed ${quantity}x **${itemName}** for ${price} ${config.economy.currencyName} each on the marketplace!`, ephemeral: true });
    });
}

function deleteMarketListing(interaction, listingId, itemName, quantity, totalPrice, config) {
    db.run('DELETE FROM marketplace_listings WHERE id = ?', [listingId], (deleteErr) => {
        if (deleteErr) {
            console.error('Error deleting marketplace listing:', deleteErr);
            db.run('ROLLBACK;');
            return interaction.reply({ content: 'An error occurred during the transaction.', ephemeral: true });
        }
        db.run('COMMIT;', (commitErr) => {
            if (commitErr) {
                console.error('Error committing transaction:', commitErr);
                return interaction.reply({ content: 'An error occurred during the transaction.', ephemeral: true });
            }
            interaction.reply({ content: `You successfully bought ${quantity}x **${itemName}** for ${totalPrice} ${config.economy.currencyName}!`, ephemeral: true });
        });
    });
}