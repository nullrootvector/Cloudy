const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Displays the shop.'),

    async execute(interaction, config) {
        const shopPath = path.join(__dirname, '..', 'shop.json');
        let shop = [];
        try {
            const data = fs.readFileSync(shopPath, 'utf8');
            shop = JSON.parse(data);
        } catch (readError) {
            console.error('Error reading shop.json:', readError);
        }

        if (shop.length === 0) {
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

        shop.forEach(item => {
            shopEmbed.addFields({ name: item.name, value: `Price: ${item.price} ${config.economy.currencyName}`, inline: true });
            selectMenu.addOptions({
                label: item.name,
                description: `Cost: ${item.price} ${config.economy.currencyName}`,
                value: item.name,
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

        const collector = response.createMessageComponentCollector({ time: 60000 }); // 60 seconds to respond

        collector.on('collect', async i => {
            if (i.customId === 'shop_select') {
                const selectedItemName = i.values[0];
                const selectedItem = shop.find(item => item.name === selectedItemName);

                if (!selectedItem) {
                    return i.update({ content: 'That item is no longer available.', components: [] });
                }

                const economyPath = path.join(__dirname, '..', 'economy.json');
                let economy = {};
                try {
                    const data = fs.readFileSync(economyPath, 'utf8');
                    economy = JSON.parse(data);
                } catch (readError) {
                    console.error('Error reading economy.json:', readError);
                }

                const userBalance = economy[i.user.id]?.balance || 0;

                if (userBalance < selectedItem.price) {
                    return i.update({
                        content: `You do not have enough ${config.economy.currencyName} to buy ${selectedItem.name}. You need ${selectedItem.price}, but you only have ${userBalance}.`,
                        components: []
                    });
                }

                // Deduct price and assign role
                economy[i.user.id].balance -= selectedItem.price;
                fs.writeFileSync(economyPath, JSON.stringify(economy, null, 2), 'utf8');

                

                const purchaseEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('Purchase Successful!')
                    .setDescription(`You have purchased **${selectedItem.name}** for ${selectedItem.price} ${config.economy.currencyName}. Your new balance is ${economy[i.user.id].balance} ${config.economy.currencyName}.`);

                await i.update({ embeds: [purchaseEmbed], components: [] });
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                interaction.editReply({ content: 'You did not select an item in time.', components: [] }).catch(console.error);
            }
        });
    },
};