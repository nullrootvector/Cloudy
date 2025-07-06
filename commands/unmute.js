const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Unmutes a member in the server.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The member to unmute')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the unmute')
                .setRequired(false)),

    async execute(interaction, config) {
        const memberToUnmute = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({
                content: "🚫 Sorry, you don't have permission to unmute members.",
                ephemeral: true
            });
        }

        if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({
                content: "😥 I don't have enough permissions to unmute members.",
                ephemeral: true
            });
        }

        if (memberToUnmute.isCommunicationDisabled()) {
            return interaction.reply({
                content: "This user is not muted.",
                ephemeral: true
            });
        }

        try {
            await memberToUnmute.timeout(null, reason);

            const unmuteEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🔊 Member Unmuted')
                .setDescription(`${memberToUnmute.user.tag} has been unmuted.`)
                .addFields([
                    { name: 'Unmuted User', value: `${memberToUnmute.user.tag} (${memberToUnmute.id})`, inline: true },
                    { name: 'Moderator', value: interaction.user.tag, inline: true },
                    { name: 'Reason', value: reason }
                ])
                .setTimestamp()
                .setFooter({ text: `Server: ${interaction.guild.name}` });

            await interaction.reply({ embeds: [unmuteEmbed] });
            console.log(`${interaction.user.tag} unmuted ${memberToUnmute.user.tag} for: ${reason}.`);

            // Send log to moderation channel
            if (config.MOD_LOG_CHANNEL_ID) {
                const logChannel = interaction.guild.channels.cache.get(config.MOD_LOG_CHANNEL_ID);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('🔊 Member Unmuted (Log)')
                        .setDescription(`${memberToUnmute.user.tag} has been unmuted.`)
                        .addFields([
                            { name: 'Unmuted User', value: `${memberToUnmute.user.tag} (${memberToUnmute.id})`, inline: true },
                            { name: 'Moderator', value: interaction.user.tag, inline: true },
                            { name: 'Reason', value: reason }
                        ])
                        .setTimestamp()
                        .setFooter({ text: `User ID: ${memberToUnmute.id}` });
                    logChannel.send({ embeds: [logEmbed] }).catch(console.error);
                }
            }

            // Optionally, DM the unmuted user
            try {
                await memberToUnmute.send(`You have been unmuted in **${interaction.guild.name}**.\nReason: ${reason}`);
            } catch (dmError) {
                console.warn(`Could not DM ${memberToUnmute.user.tag} about their unmute: ${dmError}`);
            }

        } catch (error) {
            console.error(`Error unmuting member ${memberToUnmute.user.tag}:`, error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: "An error occurred while trying to unmute the member.", ephemeral: true });
            } else {
                await interaction.reply({ content: "An error occurred while trying to unmute the member.", ephemeral: true });
            }
        }
    },
};