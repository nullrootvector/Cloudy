const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tempban')
        .setDescription('Temporarily bans a member from the server.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to tempban')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Duration of the ban in minutes')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the tempban')
                .setRequired(false)),

    async execute(interaction, config) {
        const memberToBan = interaction.options.getMember('target');
        const duration = interaction.options.getInteger('duration'); // in minutes
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Permission Check 1: User must have BanMembers permission
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({
                content: "🚫 抱歉，亲爱的，你没有临时封禁成员的权限。(Sorry, my dear, you don't have permission to tempban members.)",
                ephemeral: true
            });
        }

        // Permission Check 2: Bot must have BanMembers permission
        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({
                content: "😥 我没有足够的权限来临时封禁成员。(I don't have enough permissions to tempban members.)",
                ephemeral: true
            });
        }

        // Check if the bot can ban the member (role hierarchy)
        if (!memberToBan.bannable) {
            return interaction.reply({
                content: "我无法临时封禁此用户。他们可能有更高的角色，或者我没有足够的权限。(I cannot tempban this user. They might have a higher role, or I don't have permission.)",
                ephemeral: true
            });
        }

        // Check if the command issuer is trying to ban themselves
        if (memberToBan.id === interaction.user.id) {
            return interaction.reply({
                content: "你不能临时封禁自己，我的朋友！(You can't tempban yourself, my friend!)",
                ephemeral: true
            });
        }

        try {
            const unbanTime = Date.now() + duration * 60 * 1000; // Calculate unban time in milliseconds

            // Ban the member
            await memberToBan.ban({ reason: `Temporary ban: ${reason}` });

            // Store tempban information
            const tempBansPath = path.join(__dirname, '..', 'tempbans.json');
            let tempBans = [];
            try {
                const data = fs.readFileSync(tempBansPath, 'utf8');
                tempBans = JSON.parse(data);
            } catch (readError) {
                console.error('Error reading tempbans.json:', readError);
            }

            tempBans.push({
                userId: memberToBan.id,
                guildId: interaction.guild.id,
                unbanTime: unbanTime,
                reason: reason,
                moderatorId: interaction.user.id,
                moderatorTag: interaction.user.tag
            });
            fs.writeFileSync(tempBansPath, JSON.stringify(tempBans, null, 2), 'utf8');

            const tempBanEmbed = new EmbedBuilder()
                .setColor('#FF4500') // OrangeRed for tempban
                .setTitle('⏳ Member Temporarily Banned')
                .setDescription(`${memberToBan.user.tag} has been temporarily banned from the server.`)
                .addFields(
                    { name: 'Banned User (被临时封禁用户)', value: `${memberToBan.user.tag} (${memberToBan.id})`, inline: true },
                    { name: 'Moderator (管理员)', value: interaction.user.tag, inline: true },
                    { name: 'Duration (时长)', value: `${duration} minutes`, inline: true },
                    { name: 'Reason (理由)', value: reason }
                )
                .setTimestamp()
                .setFooter({ text: `Server: ${interaction.guild.name}` });

            await interaction.reply({ embeds: [tempBanEmbed] });
            console.log(`${interaction.user.tag} tempbanned ${memberToBan.user.tag} for ${duration} minutes for: ${reason}.`);

            // Send log to moderation channel
            if (config.MOD_LOG_CHANNEL_ID) {
                const logChannel = interaction.guild.channels.cache.get(config.MOD_LOG_CHANNEL_ID);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#FF4500')
                        .setTitle('⏳ Member Temporarily Banned (日志)')
                        .setDescription(`${memberToBan.user.tag} has been temporarily banned.`)
                        .addFields(
                            { name: 'Banned User (被临时封禁用户)', value: `${memberToBan.user.tag} (${memberToBan.id})`, inline: true },
                            { name: 'Moderator (管理员)', value: interaction.user.tag, inline: true },
                            { name: 'Duration (时长)', value: `${duration} minutes`, inline: true },
                            { name: 'Reason (理由)', value: reason }
                        )
                        .setTimestamp()
                        .setFooter({ text: `User ID: ${memberToBan.id}` });
                    logChannel.send({ embeds: [logEmbed] }).catch(console.error);
                }
            }

            // Optionally, DM the banned user
            try {
                await memberToBan.send(`你已被临时封禁于服务器 **${interaction.guild.name}**，时长 ${duration} 分钟。\n理由：${reason}`);
            } catch (dmError) {
                console.warn(`Could not DM ${memberToBan.user.tag} about their tempban: ${dmError}`);
            }

        } catch (error) {
            console.error(`Error tempbanning member ${memberToBan.user.tag}:`, error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: "执行临时封禁操作时发生错误。(An error occurred while trying to tempban the member.)", ephemeral: true });
            } else {
                await interaction.reply({ content: "执行临时封禁操作时发生错误。(An error occurred while trying to tempban the member.)", ephemeral: true });
            }
        }
    },
};