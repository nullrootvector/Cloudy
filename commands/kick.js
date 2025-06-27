const { PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'kick',
    description: 'Kicks a member from the server. Requires Kick Members permission.',
    aliases: ['k', '踢'], // 踢 (tī - kick)
    permissions: [PermissionsBitField.Flags.KickMembers], // User and Bot need this permission
    args: true, // This command requires arguments (the user to kick)
    usage: '@user [reason]', // Example of how to use arguments

    /**
     * @param {import('discord.js').Message} message
     * @param {string[]} args
     * @param {import('discord.js').Client} client
     * @param {object} config
     */
    async execute(message, args, client, config) {
        if (!message.mentions.members || !message.mentions.members.first()) {
            return message.reply("你需要提及一个用户来踢出！(You need to mention a user to kick!) `用法: !kick @用户 [理由]`");
        }

        const memberToKick = message.mentions.members.first();
        const reason = args.slice(1).join(" ") || "没有提供理由 (No reason provided)";

        // Check if the bot can kick the member (role hierarchy)
        if (!memberToKick.kickable) {
            return message.reply("我无法踢出此用户。他们可能有更高的角色，或者我没有足够的权限。(I cannot kick this user. They might have a higher role, or I don't have permission.)");
        }
        
        // Check if the command issuer is trying to kick themselves
        if (memberToKick.id === message.author.id) {
            return message.reply("你不能踢自己啦，小傻瓜！(You can't kick yourself, silly!)");
        }

        try {
            await memberToKick.kick(reason);
            
            const kickEmbed = new EmbedBuilder()
                .setColor('#ffcc00') // Yellowish for kick
                .setTitle('👢 Member Kicked')
                .setDescription(`${memberToKick.user.tag} has been kicked from the server.`)
                .addFields(
                    { name: 'Kicked User (被踢用户)', value: `${memberToKick.user.tag} (${memberToKick.id})`, inline: true },
                    { name: 'Moderator (管理员)', value: message.author.tag, inline: true },
                    { name: 'Reason (理由)', value: reason }
                )
                .setTimestamp()
                .setFooter({ text: `Server: ${message.guild.name}` });

            await message.channel.send({ embeds: [kickEmbed] });
            console.log(`${message.author.tag} kicked ${memberToKick.user.tag} for: ${reason}`);

            // Optionally, DM the kicked user
            try {
                await memberToKick.send(`你已被踢出服务器 **${message.guild.name}**。\n理由：${reason}`);
            } catch (dmError) {
                console.warn(`Could not DM ${memberToKick.user.tag} about their kick: ${dmError}`);
            }

        } catch (error) {
            console.error(`Error kicking member ${memberToKick.user.tag}:`, error);
            await message.reply("执行踢出操作时发生错误。(An error occurred while trying to kick the member.)").catch(console.error);
        }
    }
};