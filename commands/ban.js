const { PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'ban',
    description: 'Bans a member from the server. Requires Ban Members permission.',
    aliases: ['b', '封禁'], // 封禁 (fēngjìn - ban/seal off)
    permissions: [PermissionsBitField.Flags.BanMembers], // User and Bot need this permission
    args: true, // This command requires arguments (the user to ban)
    usage: '@user [days_of_messages_to_delete] [reason]', // Example of how to use arguments

    /**
     * @param {import('discord.js').Message} message
     * @param {string[]} args
     * @param {import('discord.js').Client} client
     * @param {object} config
     */
    async execute(message, args, client, config) {
        if (!message.mentions.members || !message.mentions.members.first()) {
            return message.reply("你需要提及一个用户来封禁！(You need to mention a user to ban!) `用法: !ban @用户 [删除消息天数] [理由]`");
        }

        const memberToBan = message.mentions.members.first();
        
        // Parse days of messages to delete (optional)
        let daysToDelete = 0; // Default to 0 days
        let reasonStartIndex = 1; // Index where the reason starts in args

        if (args[1] && !isNaN(parseInt(args[1])) && parseInt(args[1]) >= 0 && parseInt(args[1]) <= 7) {
            daysToDelete = parseInt(args[1]);
            reasonStartIndex = 2; // Reason starts after the days argument
        }
        
        const reason = args.slice(reasonStartIndex).join(" ") || "没有提供理由 (No reason provided)";

        // Check if the bot can ban the member (role hierarchy)
        if (!memberToBan.bannable) {
            return message.reply("我无法封禁此用户。他们可能有更高的角色，或者我没有足够的权限。(I cannot ban this user. They might have a higher role, or I don't have permission.)");
        }

        // Check if the command issuer is trying to ban themselves
        if (memberToBan.id === message.author.id) {
            return message.reply("你不能封禁自己，我的朋友！(You can't ban yourself, my friend!)");
        }

        try {
            // Ban options: days for message deletion (0-7)
            const banOptions = { days: daysToDelete, reason: reason };
            await memberToBan.ban(banOptions);
            
            const banEmbed = new EmbedBuilder()
                .setColor('#ff0000') // Red for ban
                .setTitle('🚫 Member Banned')
                .setDescription(`${memberToBan.user.tag} has been banned from the server.`)
                .addFields(
                    { name: 'Banned User (被封禁用户)', value: `${memberToBan.user.tag} (${memberToBan.id})`, inline: true },
                    { name: 'Moderator (管理员)', value: message.author.tag, inline: true },
                    { name: 'Messages Deleted (消息删除天数)', value: `${daysToDelete} days`, inline: true},
                    { name: 'Reason (理由)', value: reason }
                )
                .setTimestamp()
                .setFooter({ text: `Server: ${message.guild.name}` });

            await message.channel.send({ embeds: [banEmbed] });
            console.log(`${message.author.tag} banned ${memberToBan.user.tag} for: ${reason}, deleting ${daysToDelete} days of messages.`);

            // Optionally, DM the banned user
            try {
                await memberToBan.send(`你已被封禁于服务器 **${message.guild.name}**。\n理由：${reason}\n删除消息天数：${daysToDelete}`);
            } catch (dmError) {
                console.warn(`Could not DM ${memberToBan.user.tag} about their ban: ${dmError}`);
            }

        } catch (error) {
            console.error(`Error banning member ${memberToBan.user.tag}:`, error);
            await message.reply("执行封禁操作时发生错误。(An error occurred while trying to ban the member.)").catch(console.error);
        }
    }
};
