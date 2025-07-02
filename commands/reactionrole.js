const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

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
        // Permission Check: User must have ManageRoles permission
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return interaction.reply({
                content: "🚫 抱歉，亲爱的，你没有管理角色的权限。(Sorry, my dear, you don't have permission to manage roles.)",
                ephemeral: true
            });
        }

        const messageId = interaction.options.getString('message_id');
        const role = interaction.options.getRole('role');
        const emoji = interaction.options.getString('emoji');

        try {
            const channel = interaction.channel;
            const message = await channel.messages.fetch(messageId);

            if (!message) {
                return interaction.reply({
                    content: '找不到指定ID的消息。(Could not find a message with that ID.)',
                    ephemeral: true
                });
            }

            // Add the reaction to the message
            await message.react(emoji);

            // Store the reaction role configuration
            const reactionRolesPath = path.join(__dirname, '..', 'reactionroles.json');
            let reactionRoles = [];
            try {
                const data = fs.readFileSync(reactionRolesPath, 'utf8');
                reactionRoles = JSON.parse(data);
            } catch (readError) {
                console.error('Error reading reactionroles.json:', readError);
            }

            reactionRoles.push({
                guildId: interaction.guild.id,
                channelId: channel.id,
                messageId: messageId,
                roleId: role.id,
                emoji: emoji
            });

            fs.writeFileSync(reactionRolesPath, JSON.stringify(reactionRoles, null, 2), 'utf8');

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Reaction Role Setup')
                .setDescription(`已成功为消息 [${messageId}] 设置反应角色。\n(Reaction role successfully set up for message [${messageId}].)`)
                .addFields(
                    { name: 'Message ID (消息ID)', value: messageId, inline: true },
                    { name: 'Role (角色)', value: role.name, inline: true },
                    { name: 'Emoji (表情符号)', value: emoji, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error setting up reaction role:', error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '设置反应角色时发生错误。(An error occurred while setting up the reaction role.)', ephemeral: true });
            } else {
                await interaction.reply({ content: '设置反应角色时发生错误。(An error occurred while setting up the reaction role.)', ephemeral: true });
            }
        }
    },
};