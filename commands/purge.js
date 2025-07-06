const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Deletes a specified number of messages (1-99) from the current channel.')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages to delete (1-99)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(99)),

    async execute(interaction) {
        // Permission Check 1: User must have ManageMessages permission
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({
                content: "🚫 Sorry, you don't have permission to manage messages.",
                ephemeral: true
            });
        }

        // Permission Check 2: Bot must have ManageMessages permission
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({
                content: "😥 I don't have enough permissions to delete messages.",
                ephemeral: true
            });
        }

        const amountToDelete = interaction.options.getInteger('amount');

        try {
            // Fetch messages. We fetch `amountToDelete` messages.
            // `bulkDelete` will automatically filter out messages older than 14 days.
            const fetchedMessages = await interaction.channel.messages.fetch({ limit: amountToDelete });

            if (fetchedMessages.size === 0) {
                return interaction.reply({
                    content: 'No messages found to delete.',
                    ephemeral: true
                });
            }

            // Perform the bulk delete.
            const deletedMessages = await interaction.channel.bulkDelete(fetchedMessages, true);

            if (deletedMessages.size === 0) {
                const replyMsg = await interaction.reply({
                    content: 'All eligible messages were older than 14 days and could not be bulk deleted, or no messages were deletable.',
                    ephemeral: true
                });
                return;
            }

            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00) // Green color
                .setTitle('✅ Messages Purged Successfully')
                .setDescription(`Successfully deleted **${deletedMessages.size}** messages.`)
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

        } catch (error) {
            console.error(`执行清除命令时出错 (Error executing purge command for ${interaction.user.tag}):`, error);
            
            let errorMessage = '执行此命令时发生错误，我的小宝贝。(An error occurred while trying to execute this command, my little treasure.)';
            if (error.code === 50034) { // DiscordAPIError: You can only bulk delete messages that are under 14 days old.
                errorMessage = '哦豁，有些消息太旧了 (超过14天)，无法批量删除。(Oh dear, some messages were too old (older than 14 days) to be bulk deleted.)';
            } else if (error.message.includes('Invalid Form Body') && error.message.includes('limit: Value must be between 1 and 100')) {
                errorMessage = '内部限制问题，请尝试删除1到99条消息。(Internal limit issue, please try deleting between 1 and 99 messages.)';
            }

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    },
};