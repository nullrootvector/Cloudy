const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removeitem')
        .setDescription('Removes an item from the shop.')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The name of the item to remove')
                .setRequired(true)),

    async execute(interaction, config) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({
                content: 'You do not have permission to use this command.',
                ephemeral: true
            });
        }

        const name = interaction.options.getString('name');
        const guildId = interaction.guild.id;

        db.run('DELETE FROM shop_items WHERE guildId = ? AND name = ?', [guildId, name], function(err) {
            if (err) {
                console.error('Error removing item from shop:', err);
                return interaction.reply({ content: 'An error occurred while removing the item from the shop.', ephemeral: true });
            }

            if (this.changes === 0) {
                return interaction.reply({
                    content: 'That item does not exist in the shop.',
                    ephemeral: true
                });
            }

            interaction.reply({
                content: `Removed ${name} from the shop.`,
                ephemeral: true
            });
        });
    },
};