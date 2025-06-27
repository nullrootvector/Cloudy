const { PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'purge',
    description: 'Deletes a specified number of messages (1-99) from the current channel. Messages older than 14 days cannot be bulk deleted.',
    aliases: ['clear', 'delete', 'cls', 'p'],
    usage: '[number_of_messages_to_delete (1-99) / "all"]', // Optional: for a help command

    async execute(message, args, client, config) {
        // Permission Check 1: User must have ManageMessages permission
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply({
                content: "🚫 抱歉，亲爱的，你没有管理消息的权限。(Sorry, my dear, you don't have permission to manage messages.)",
                ephemeral: true // Only visible to the user who typed the command
            }).catch(console.error);
        }

        // Permission Check 2: Bot must have ManageMessages permission
        if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply({
                content: "😥 我没有足够的权限来删除消息。(I don't have enough permissions to delete messages.)",
                ephemeral: true
            }).catch(console.error);
        }

        const amountArg = args[0];
        let amountToDelete;

        if (!amountArg) {
            return message.reply({
                content: `亲爱的，请告诉我需要删除多少条消息。用法: \`${config.PREFIX || '!'}purge [数量]\` (e.g., \`${config.PREFIX || '!'}purge 10\`) \n或者使用 \`${config.PREFIX || '!'}purge all\` 来尝试删除最近的99条消息。`,
                ephemeral: true
            }).catch(console.error);
        }

        if (amountArg.toLowerCase() === 'all') {
            amountToDelete = 99; // Discord API limit for bulk delete is 100, but we fetch one less to be safe and account for the command message itself if not careful.
                                 // We'll fetch 100 and delete up to 100.
        } else {
            amountToDelete = parseInt(amountArg);
        }


        if (isNaN(amountToDelete) || amountToDelete <= 0 || amountToDelete > 99) {
            // If 'all' was not used and the number is invalid
            if (amountArg.toLowerCase() !== 'all') {
                 return message.reply({
                    content: '亲爱的，请输入一个介于 1 和 99 之间的有效数字。(My dear, please provide a valid number between 1 and 99.)',
                    ephemeral: true
                }).catch(console.error);
            }
            // If 'all' was used, amountToDelete is already 99.
        }

        // We add 1 to amountToDelete if it's not 'all' to account for the command message itself,
        // though bulkDelete often handles this. It's safer to fetch slightly more.
        // However, bulkDelete fetches messages *before* the current one.
        // So, we can just use amountToDelete.
        // Discord's bulkDelete can delete messages up to 100 at a time.
        // It cannot delete messages older than 14 days.

        try {
            // Fetch messages. We fetch `amountToDelete` messages.
            // `bulkDelete` will automatically filter out messages older than 14 days.
            const fetchedMessages = await message.channel.messages.fetch({ limit: amountToDelete });

            if (fetchedMessages.size === 0) {
                return message.channel.send('没有找到可以删除的消息。(No messages found to delete.)')
                    .then(msg => setTimeout(() => msg.delete().catch(console.error), 5000))
                    .catch(console.error);
            }

            // Perform the bulk delete.
            // The `true` argument filters out messages older than 2 weeks.
            const deletedMessages = await message.channel.bulkDelete(fetchedMessages, true);

            if (deletedMessages.size === 0) {
                 // This can happen if all fetched messages were older than 14 days
                const replyMsg = await message.channel.send('所有符合条件的消息都超过14天了，无法批量删除。或者没有消息可以删除。(All eligible messages were older than 14 days and could not be bulk deleted, or no messages were deletable.)');
                setTimeout(() => replyMsg.delete().catch(console.error), 7000); // Delete this notification after 7 seconds
                return;
            }

            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00) // Green color
                .setTitle('✅ 消息清除成功 (Messages Purged Successfully)')
                .setDescription(`成功删除了 **${deletedMessages.size}** 条消息。\n(Successfully deleted **${deletedMessages.size}** messages.)`)
                .setFooter({ text: `由 ${message.author.tag} 请求 (Requested by ${message.author.tag})` })
                .setTimestamp();

            // Send a confirmation message and delete it after a few seconds.
            const replyMsg = await message.channel.send({ embeds: [successEmbed] });
            setTimeout(() => replyMsg.delete().catch(console.error), 7000); // Delete this notification after 7 seconds

            // The command message itself is usually deleted by this process if it's among the fetched.
            // If you want to ensure the command message is *always* deleted, you can add:
            // await message.delete().catch(console.error);
            // However, this might lead to an error if bulkDelete already got it.
            // It's generally fine to let bulkDelete handle it.

        } catch (error) {
            console.error(`执行清除命令时出错 (Error executing purge command for ${message.author.tag}):`, error);
            
            let errorMessage = '执行此命令时发生错误，我的小宝贝。(An error occurred while trying to execute this command, my little treasure.)';
            if (error.code === 50034) { // DiscordAPIError: You can only bulk delete messages that are under 14 days old.
                errorMessage = '哦豁，有些消息太旧了 (超过14天)，无法批量删除。(Oh dear, some messages were too old (older than 14 days) to be bulk deleted.)';
            } else if (error.message.includes('Invalid Form Body') && error.message.includes('limit: Value must be between 1 and 100')) {
                errorMessage = '内部限制问题，请尝试删除1到99条消息。(Internal limit issue, please try deleting between 1 and 99 messages.)';
            }


            message.reply({ content: errorMessage, ephemeral: true }).catch(console.error);
        }
    },
};