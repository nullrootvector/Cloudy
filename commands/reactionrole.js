const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const db = require('../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reactionrole')
        .setDescription('Sets up a message for reaction roles.')
        .addStringOption(option =>
            option.setName('message_id')
                .setDescription('The ID of the message to use for reaction roles')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('The role to assign')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('emoji')
                .setDescription('The emoji to react with (e.g., 👍, :emoji_name:)')
                .setRequired(true)),

    async execute(interaction, config) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return interaction.reply({
                content: "🚫 Sorry, you don't have permission to manage roles.",
                ephemeral: true
            });
        }

        const messageId = interaction.options.getString('message_id');
        const role = interaction.options.getRole('role');
        const emoji = interaction.options.getString('emoji');
        const guildId = interaction.guild.id;

        try {
            const channel = interaction.channel;
            const message = await channel.messages.fetch(messageId);

            if (!message) {
                return interaction.reply({
                    content: 'Could not find a message with that ID.',
                    ephemeral: true
                });
            }

            await message.react(emoji);

            db.run('INSERT INTO reaction_roles (guildId, messageId, emoji, roleId) VALUES (?, ?, ?, ?)', [guildId, messageId, emoji, role.id], (err) => {
                if (err) {
                    console.error('Error storing reaction role:', err);
                    return interaction.reply({ content: 'An error occurred while setting up the reaction role.', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('✅ Reaction Role Setup')
                    .setDescription(`Reaction role successfully set up for message [${messageId}].`)
                    .addFields(
                        { name: 'Message ID', value: messageId, inline: true },
                        { name: 'Role', value: role.name, inline: true },
                        { name: 'Emoji', value: emoji, inline: true }
                    )
                    .setTimestamp();

                interaction.reply({ embeds: [embed] });
            });

        } catch (error) {
            console.error('Error setting up reaction role:', error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'An error occurred while setting up the reaction role.', ephemeral: true });
            } else {
                await interaction.reply({ content: 'An error occurred while setting up the reaction role.', ephemeral: true });
            }
        }
    },
};