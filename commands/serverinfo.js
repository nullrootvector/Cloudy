const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Displays detailed information about the current server.'),

    async execute(interaction) {
        // Ensure the command is used in a server
        if (!interaction.guild) {
            return interaction.reply({ content: "This command can only be used in a server!", ephemeral: true });
        }

        const guild = interaction.guild;

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

                { name: '📜 Roles (角色数量)', value: `${guild.roles.cache.size}`, inline: true },
                { name: '💬 Channels (频道数量)', value: `${guild.channels.cache.size}`, inline: true }, // This includes all channel types

                { name: '🛡️ Verification Level (验证级别)', value: verificationLevelString, inline: true },
                { name: '🚀 Boost Tier (加速等级)', value: premiumTierString, inline: true },
                { name: '💎 Boost Count (加速数量)', value: `${guild.premiumSubscriptionCount || 0}`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Requested by ${interaction.user.tag} | Information from ${guild.name}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });

        try {
            await interaction.reply({ embeds: [serverEmbed] });
        } catch (error) {
            console.error(`Error sending server info embed for ${guild.name}:`, error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: "Oh dear, I had a little hiccup trying to fetch that server info for you!", ephemeral: true });
            } else {
                await interaction.reply({ content: "Oh dear, I had a little hiccup trying to fetch that server info for you!", ephemeral: true });
            }
        }
    }
};