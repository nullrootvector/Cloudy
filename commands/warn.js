const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const db = require('../database.js');

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
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Permission Check: User must have ModerateMembers permission
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({
                content: "🚫 You do not have permission to warn members.",
                ephemeral: true
            });
        }

        // Check if the bot can warn the member (role hierarchy)
        if (!memberToWarn.moderatable) {
            return interaction.reply({
                content: "I cannot warn this user. They may have a higher role than me or I do not have the permission to.",
                ephemeral: true
            });
        }

        // Check if the command issuer is trying to warn themselves
        if (memberToWarn.id === interaction.user.id) {
            return interaction.reply({
                content: "You cannot warn yourself.",
                ephemeral: true
            });
        }

        try {
            const stmt = db.prepare('INSERT INTO warnings (userId, guildId, reason, moderatorId, timestamp) VALUES (?, ?, ?, ?, ?)');
            stmt.run(memberToWarn.id, interaction.guild.id, reason, interaction.user.id, Date.now());
            stmt.finalize();

            const warnEmbed = new EmbedBuilder()
                .setColor('#FFD700') // Gold for warning
                .setTitle('⚠️ Member Warned')
                .setDescription(`${memberToWarn.user.tag} has been warned.`)
                .addFields(
                    { name: 'Warned User', value: `${memberToWarn.user.tag} (${memberToWarn.id})`, inline: true },
                    { name: 'Moderator', value: interaction.user.tag, inline: true },
                    { name: 'Reason', value: reason }
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
                        .setTitle('⚠️ Member Warned (Log)')
                        .setDescription(`${memberToWarn.user.tag} has been warned.`)
                        .addFields(
                            { name: 'Warned User', value: `${memberToWarn.user.tag} (${memberToWarn.id})`, inline: true },
                            { name: 'Moderator', value: interaction.user.tag, inline: true },
                            { name: 'Reason', value: reason }
                        )
                        .setTimestamp()
                        .setFooter({ text: `User ID: ${memberToWarn.id}` });
                    logChannel.send({ embeds: [logEmbed] }).catch(console.error);
                }
            }

            // Optionally, DM the warned user
            try {
                await memberToWarn.send(`You have been warned in **${interaction.guild.name}** for the following reason: ${reason}`);
            } catch (dmError) {
                console.warn(`Could not DM ${memberToWarn.user.tag} about their warning: ${dmError}`);
            }

        } catch (error) {
            console.error(`Error warning member ${memberToWarn.user.tag}:`, error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: "An error occurred while trying to warn the member.", ephemeral: true });
            } else {
                await interaction.reply({ content: "An error occurred while trying to warn the member.", ephemeral: true });
            }
        }
    },
}