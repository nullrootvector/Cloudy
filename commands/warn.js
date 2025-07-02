const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Issues a warning to a member.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to warn')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the warning')
                .setRequired(false)),

    async execute(interaction, config) {
        const memberToWarn = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') || '没有提供理由 (No reason provided)';

        // Permission Check: User must have ModerateMembers permission
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({
                content: "🚫 抱歉，亲爱的，你没有警告成员的权限。(Sorry, my dear, you don't have permission to warn members.)",
                ephemeral: true
            });
        }

        // Check if the bot can warn the member (role hierarchy)
        if (!memberToWarn.moderatable) {
            return interaction.reply({
                content: "我无法警告此用户。他们可能有更高的角色，或者我没有足够的权限。(I cannot warn this user. They might have a higher role, or I don't have permission.)",
                ephemeral: true
            });
        }

        // Check if the command issuer is trying to warn themselves
        if (memberToWarn.id === interaction.user.id) {
            return interaction.reply({
                content: "你不能警告自己，我的朋友！(You can't warn yourself, my friend!)",
                ephemeral: true
            });
        }

        try {
            const warningsPath = path.join(__dirname, '..', 'warnings.json');
            let warnings = [];
            try {
                const data = fs.readFileSync(warningsPath, 'utf8');
                warnings = JSON.parse(data);
            } catch (readError) {
                console.error('Error reading warnings.json:', readError);
            }

            const newWarning = {
                userId: memberToWarn.id,
                userName: memberToWarn.user.tag,
                moderatorId: interaction.user.id,
                moderatorName: interaction.user.tag,
                reason: reason,
                timestamp: new Date().toISOString()
            };
            warnings.push(newWarning);

            fs.writeFileSync(warningsPath, JSON.stringify(warnings, null, 2), 'utf8');

            const warnEmbed = new EmbedBuilder()
                .setColor('#FFD700') // Gold for warning
                .setTitle('⚠️ Member Warned')
                .setDescription(`${memberToWarn.user.tag} has been warned.`)
                .addFields(
                    { name: 'Warned User (被警告用户)', value: `${memberToWarn.user.tag} (${memberToWarn.id})`, inline: true },
                    { name: 'Moderator (管理员)', value: interaction.user.tag, inline: true },
                    { name: 'Reason (理由)', value: reason }
                )
                .setTimestamp()
                .setFooter({ text: `Server: ${interaction.guild.name}` });

            await interaction.reply({ embeds: [warnEmbed] });
            console.log(`${interaction.user.tag} warned ${memberToWarn.user.tag} for: ${reason}.`);

            // Send log to moderation channel
            if (config.MOD_LOG_CHANNEL_ID) {
                const logChannel = interaction.guild.channels.cache.get(config.MOD_LOG_CHANNEL_ID);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#FFD700')
                        .setTitle('⚠️ Member Warned (日志)')
                        .setDescription(`${memberToWarn.user.tag} has been warned.`)
                        .addFields(
                            { name: 'Warned User (被警告用户)', value: `${memberToWarn.user.tag} (${memberToWarn.id})`, inline: true },
                            { name: 'Moderator (管理员)', value: interaction.user.tag, inline: true },
                            { name: 'Reason (理由)', value: reason }
                        )
                        .setTimestamp()
                        .setFooter({ text: `User ID: ${memberToWarn.id}` });
                    logChannel.send({ embeds: [logEmbed] }).catch(console.error);
                }
            }

            // Optionally, DM the warned user
            try {
                await memberToWarn.send(`你已被警告于服务器 **${interaction.guild.name}**。\n理由：${reason}`);
            } catch (dmError) {
                console.warn(`Could not DM ${memberToWarn.user.tag} about their warning: ${dmError}`);
            }

        } catch (error) {
            console.error(`Error warning member ${memberToWarn.user.tag}:`, error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: "执行警告操作时发生错误。(An error occurred while trying to warn the member.)", ephemeral: true });
            } else {
                await interaction.reply({ content: "执行警告操作时发生错误。(An error occurred while trying to warn the member.)", ephemeral: true });
            }
        }
    },
}