const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('Displays your inventory.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user whose inventory to view (defaults to yourself)')
                .setRequired(false)),

    async execute(interaction) {
        const user = interaction.options.getUser('target') || interaction.user;
        const userId = user.id;
        const guildId = interaction.guild.id;

        db.all('SELECT si.name, si.description, ui.quantity FROM user_inventory ui JOIN shop_items si ON ui.itemId = si.id WHERE ui.userId = ? AND ui.guildId = ?', [userId, guildId], async (err, rows) => {
            if (err) {
                console.error('Error fetching inventory:', err);
                return interaction.reply({ content: 'An error occurred while fetching the inventory.', ephemeral: true });
            }

            if (rows.length === 0) {
                return interaction.reply({
                    content: `${user.tag} has an empty inventory.`, ephemeral: true
                });
            }

            const inventoryEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`${user.tag}'s Inventory`)
                .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
                .setTimestamp()
                .setFooter({ text: `Requested by ${interaction.user.tag}` });

            rows.forEach(item => {
                inventoryEmbed.addFields(
                    { name: `${item.name} (x${item.quantity})`, value: item.description || 'No description.' }
                );
            });

            await interaction.reply({ embeds: [inventoryEmbed], ephemeral: false });
        });
    },
};