const { EmbedBuilder } = require('discord.js'); // We need EmbedBuilder for fancy messages!

module.exports = {
    name: 'serverinfo',
    description: 'Displays detailed information about the current server.',
    aliases: ['si', 'guildinfo', '服务器信息'], // 服务器信息 (fúwùqì xìnxī - server information)
    // guildOnly: true, // This command only makes sense in a server context

    /**
     * @param {import('discord.js').Message} message
     * @param {string[]} args
     * @param {import('discord.js').Client} client
     * @param {object} config
     */
    async execute(message, args, client, config) {
        // Ensure the command is used in a server
        if (!message.guild) {
            return message.reply("亲爱的，这个命令只能在服务器里用哦！(My dear, this command can only be used in a server!)");
        }

        const guild = message.guild;

        // Fetch owner details - this can be an async operation
        let ownerTag = 'N/A';
        try {
            const owner = await guild.fetchOwner();
            ownerTag = owner.user.tag;
        } catch (error) {
            console.warn(`Could not fetch owner for guild ${guild.id}: ${error}`);
            ownerTag = `ID: ${guild.ownerId} (Could not fetch tag)`;
        }
        
        // For verification level, Discord provides numbers. Let's make them human-readable.
        const verificationLevels = {
            0: 'None (无 - Wú)',
            1: 'Low (低 - Dī) - Must have a verified email',
            2: 'Medium (中 - Zhōng) - Must be registered on Discord for >5 mins',
            3: 'High (高 - Gāo) - (╯°□°）╯︵ ┻━┻ - Must be a member of the server for >10 mins',
            4: 'Highest (最高 - Zuìgāo) - ┻━┻ ﾐヽ(ಠ益ಠ)ノ彡┻━┻ - Must have a verified phone'
        };
        const verificationLevelString = verificationLevels[guild.verificationLevel] || 'Unknown';

        // For premium tier (boost level)
        const premiumTiers = {
            0: 'None (Tier 0)',
            1: 'Tier 1',
            2: 'Tier 2',
            3: 'Tier 3'
        };
        const premiumTierString = premiumTiers[guild.premiumTier] || 'Unknown Tier';

        const serverEmbed = new EmbedBuilder()
            .setColor(guild.members.me?.displayHexColor || '#0099ff') // Use bot's role color or default
            .setTitle(`✨ Server Information: ${guild.name} ✨`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 })) // Dynamic for animated icons, size for quality
            .addFields(
                { name: '👑 Server Owner (服主 - Fúzhǔ)', value: ownerTag, inline: true },
                { name: '🆔 Server ID (服务器ID)', value: guild.id, inline: true },
                { name: '📅 Created On (创建日期)', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true }, // Using Discord's timestamp formatting
                
                { name: '👥 Members (成员)', value: `Total: ${guild.memberCount}`, inline: true },
                // More detailed member counts require fetching all members or specific intents, keeping it simple for now.
                // { name: 'Humans', value: `${guild.members.cache.filter(member => !member.user.bot).size}`, inline: true },
                // { name: 'Bots', value: `${guild.members.cache.filter(member => member.user.bot).size}`, inline: true },

                { name: '📜 Roles (角色数量)', value: `${guild.roles.cache.size}`, inline: true },
                { name: '💬 Channels (频道数量)', value: `${guild.channels.cache.size}`, inline: true }, // This includes all channel types

                { name: '🛡️ Verification Level (验证级别)', value: verificationLevelString, inline: true },
                { name: '🚀 Boost Tier (加速等级)', value: premiumTierString, inline: true },
                { name: '💎 Boost Count (加速数量)', value: `${guild.premiumSubscriptionCount || 0}`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Requested by ${message.author.tag} | Information from ${guild.name}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

        try {
            await message.channel.send({ embeds: [serverEmbed] });
        } catch (error) {
            console.error(`Error sending server info embed for ${guild.name}:`, error);
            await message.reply("Oh dear, I had a little hiccup trying to fetch that server info for you!").catch(console.error);
        }
    }
};